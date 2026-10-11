# Update workflow pro CoreApp
# Šablona - appka postavená na core-app přejmenuje $serviceName.
# Zastaví službu, stáhne změny, přebuilduje, spustí.
# Run as Administrator

param(
    [switch]$SkipMigrations,
    [switch]$SkipDeps
)

$serviceName = "CoreApp"

$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERROR: Spust jako Administrator" -ForegroundColor Red
    exit 1
}

$appPath = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

Set-Location $appPath

Write-Host "`n=== Update $serviceName ===" -ForegroundColor Cyan

# 1. Stop
Write-Host "`n[1/6] Zastavuji sluzbu..." -ForegroundColor Gray
.\scripts\service.ps1 -Action stop 2>$null
Start-Sleep -Seconds 2

# 2. Git pull
Write-Host "[2/6] Stahuji zmeny (git pull)..." -ForegroundColor Gray
# Pokud jsou lokalni zmeny jen v generovanych Prisma souborech,
# bezpecne je zahodime, aby neblokovaly aktualizaci.
$generatedPrismaPath = "src/generated/prisma"
$generatedChanges = git status --porcelain -- $generatedPrismaPath
if ($generatedChanges) {
    Write-Host "Nalezeny lokalni zmeny v $generatedPrismaPath, zahazuji je..." -ForegroundColor DarkYellow
    git restore --staged --worktree -- $generatedPrismaPath
    git clean -fd -- $generatedPrismaPath
}

git pull origin
if ($LASTEXITCODE -ne 0) {
    Write-Host "CHYBA: git pull selhal. Spoustim sluzbu zpet." -ForegroundColor Red
    .\scripts\service.ps1 -Action start
    exit 1
}

# 3. Deps
if (-not $SkipDeps) {
    Write-Host "[3/6] Instaluji zavislosti (npm install)..." -ForegroundColor Gray
    npm install
} else {
    Write-Host "[3/6] Preskakuji npm install (-SkipDeps)" -ForegroundColor Gray
}

# 4. Prisma
if (-not $SkipMigrations) {
    Write-Host "[4/6] Prisma generate + migrate..." -ForegroundColor Gray
    npx prisma generate
    npx prisma migrate deploy
} else {
    Write-Host "[4/6] Preskakuji migrace (-SkipMigrations)" -ForegroundColor Gray
}

# 5. Build
Write-Host "[5/6] npm run build..." -ForegroundColor Gray
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "CHYBA: Build selhal. Spoustim sluzbu zpet." -ForegroundColor Red
    .\scripts\service.ps1 -Action start
    exit 1
}

# 6. Start
Write-Host "[6/6] Restartuju sluzbu..." -ForegroundColor Gray
.\scripts\service.ps1 -Action restart
Start-Sleep -Seconds 3

$svc = Get-Service $serviceName -ErrorAction SilentlyContinue
if ($svc -and $svc.Status -eq "Running") {
    Write-Host "`nUpdate dokoncen. Sluzba bezi." -ForegroundColor Green
} else {
    Write-Host "`nVAROVANI: Sluzba se nespustila. Zkontroluj logy:" -ForegroundColor Yellow
    Write-Host "  .\scripts\service.ps1 -Action logs" -ForegroundColor Gray
}
