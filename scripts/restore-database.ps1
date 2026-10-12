# Obnoví PostgreSQL databázi appky ze zálohy vytvořené
# scripts/backup-database.ps1 (pg_dump custom format, -Fc).
#
# DESTRUKTIVNÍ: --clean --if-exists smaže existující objekty v cílové
# databázi před jejich obnovením ze zálohy - data v databázi, která
# nejsou v záloze, zmizí. Skript proto bez -Force vyžaduje, aby uživatel
# vypsal přesný název cílové databáze jako potvrzení.
#
# Použití:
#   .\scripts\restore-database.ps1 -BackupFile backups\core-app_core_20261012_120000.dump
#   .\scripts\restore-database.ps1 -BackupFile ... -EnvFile .env.production
#   .\scripts\restore-database.ps1 -BackupFile ... -Force   # bez interaktivního potvrzení (CI/skripty)
#
# Vyžaduje pg_restore na PATH (součást PostgreSQL instalace, viz
# docs/deployment.md).

param(
    [Parameter(Mandatory = $true)]
    [string]$BackupFile,
    [string]$EnvFile = ".env",
    [switch]$Force
)

$appPath = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$envPath = Join-Path $appPath $EnvFile

if (-not (Test-Path $BackupFile)) {
    Write-Host "ERROR: Soubor se zalohou '$BackupFile' nenalezen." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $envPath)) {
    Write-Host "ERROR: Soubor $envPath nenalezen." -ForegroundColor Red
    exit 1
}

if (-not (Get-Command pg_restore -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: pg_restore nenalezen na PATH. Nainstalujte PostgreSQL klienta (viz docs/deployment.md)." -ForegroundColor Red
    exit 1
}

$envLine = Get-Content $envPath | Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } | Select-Object -Last 1
if (-not $envLine) {
    Write-Host "ERROR: DATABASE_URL nenalezeno v $envPath." -ForegroundColor Red
    exit 1
}
$databaseUrl = ($envLine -replace '^\s*DATABASE_URL\s*=\s*', '').Trim('"', "'")

# Stejný důvod rozparsování jako v backup-database.ps1 - "?schema=..."
# není platný libpq connection parametr.
if ($databaseUrl -notmatch '^postgresql://([^:@]+):([^@]*)@([^:/]+):(\d+)/([^?]+)') {
    Write-Host "ERROR: DATABASE_URL nemá očekávaný tvar postgresql://user:pass@host:port/dbname" -ForegroundColor Red
    exit 1
}
$dbUser = $Matches[1]
$dbPassword = $Matches[2]
$dbHost = $Matches[3]
$dbPort = $Matches[4]
$dbName = $Matches[5]

Write-Host "`n=== Obnoveni databaze ze zalohy ===" -ForegroundColor Cyan
Write-Host "Zaloha:  $BackupFile" -ForegroundColor Gray
Write-Host "Cil:     databaze '$dbName' na $dbHost`:$dbPort (uzivatel $dbUser)" -ForegroundColor Gray
Write-Host "`nVAROVANI: Tahle operace SMAZE existujici objekty v cilove databazi" -ForegroundColor Yellow
Write-Host "a nahradi je obsahem zalohy. Data pridana po vytvoreni zalohy zmizi." -ForegroundColor Yellow

if (-not $Force) {
    Write-Host "`nPro potvrzeni napiste presny nazev cilove databaze ('$dbName'):" -ForegroundColor Yellow
    $confirmation = Read-Host "Nazev databaze"
    if ($confirmation -ne $dbName) {
        Write-Host "`nPotvrzeni nesouhlasi s '$dbName' - obnoveni zruseno, nic se nezmenilo." -ForegroundColor Red
        exit 1
    }
}

Write-Host "`nObnovuji..." -ForegroundColor Gray

$env:PGPASSWORD = $dbPassword
try {
    & pg_restore -h $dbHost -p $dbPort -U $dbUser -d $dbName --clean --if-exists --no-owner -v $BackupFile
    $exitCode = $LASTEXITCODE
} finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

if ($exitCode -ne 0) {
    Write-Host "`nVAROVANI: pg_restore skoncil s exit code $exitCode." -ForegroundColor Yellow
    Write-Host "pg_restore casto hlasi nekriticke chyby u objektu, ktere jiz neexistovaly" -ForegroundColor Gray
    Write-Host "(--if-exists je pro tyhle pripady) - zkontrolujte vystup vyse, jestli jde" -ForegroundColor Gray
    Write-Host "o skutecnou chybu nebo jen o tohle ocekavane hlaseni." -ForegroundColor Gray
    exit 1
}

Write-Host "`nObnoveni dokonceno." -ForegroundColor Green
Write-Host "Nezapomente spustit 'npx prisma generate' a zkontrolovat, ze schema" -ForegroundColor Gray
Write-Host "databaze odpovida aktualnim migracim ('npx prisma migrate status')." -ForegroundColor Gray
