# Zálohuje PostgreSQL databázi appky do souboru (custom format pg_dump,
# -Fc) - vhodné jak pro lokální dev DB, tak pro produkční cron/Task
# Scheduler. Čte DATABASE_URL z .env souboru (ne z prostředí procesu),
# aby šlo zálohovat i jiné prostředí než to, se kterým právě běží dev
# server.
#
# Použití:
#   .\scripts\backup-database.ps1                           # zálohuje podle .env
#   .\scripts\backup-database.ps1 -EnvFile .env.production  # zálohuje produkční DB
#   .\scripts\backup-database.ps1 -OutDir D:\Backups\core-app
#
# Vyžaduje pg_dump na PATH (součást PostgreSQL instalace, viz
# docs/deployment.md).

param(
    [string]$EnvFile = ".env",
    [string]$OutDir = "backups"
)

$appPath = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$envPath = Join-Path $appPath $EnvFile

if (-not (Test-Path $envPath)) {
    Write-Host "ERROR: Soubor $envPath nenalezen." -ForegroundColor Red
    exit 1
}

if (-not (Get-Command pg_dump -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: pg_dump nenalezen na PATH. Nainstalujte PostgreSQL klienta (viz docs/deployment.md)." -ForegroundColor Red
    exit 1
}

# Načti DATABASE_URL z .env - jen tenhle jeden klíč, ne celý soubor do
# prostředí procesu (ostatní proměnné appka nepotřebuje a nechceme je
# zanést do shellu, který skript spustil).
$envLine = Get-Content $envPath | Where-Object { $_ -match '^\s*DATABASE_URL\s*=' } | Select-Object -Last 1
if (-not $envLine) {
    Write-Host "ERROR: DATABASE_URL nenalezeno v $envPath." -ForegroundColor Red
    exit 1
}
$databaseUrl = ($envLine -replace '^\s*DATABASE_URL\s*=\s*', '').Trim('"', "'")

# Prisma připojovací URL má navíc "?schema=public" - to je Prisma search
# path hint, ne platný libpq connection parametr, a pg_dump by na něj
# spadl ("invalid connection option "schema""). Rozparsujeme URL na
# jednotlivé kusy a předáme je jako samostatné pg_dump přepínače místo
# celé URI - obejde to zároveň i speciální znaky v heslu, které by jinak
# mohly rozbít URL parsing.
if ($databaseUrl -notmatch '^postgresql://([^:@]+):([^@]*)@([^:/]+):(\d+)/([^?]+)') {
    Write-Host "ERROR: DATABASE_URL nemá očekávaný tvar postgresql://user:pass@host:port/dbname" -ForegroundColor Red
    exit 1
}
$dbUser = $Matches[1]
$dbPassword = $Matches[2]
$dbHost = $Matches[3]
$dbPort = $Matches[4]
$dbName = $Matches[5]

if (-not (Test-Path $OutDir)) {
    New-Item -ItemType Directory -Path $OutDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$outFile = Join-Path $OutDir "core-app_${dbName}_${timestamp}.dump"

Write-Host "`n=== Zaloha databaze '$dbName' na $dbHost`:$dbPort ===" -ForegroundColor Cyan
Write-Host "Vystup: $outFile" -ForegroundColor Gray

$env:PGPASSWORD = $dbPassword
try {
    & pg_dump -h $dbHost -p $dbPort -U $dbUser -d $dbName -Fc -f $outFile
    $exitCode = $LASTEXITCODE
} finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

if ($exitCode -ne 0) {
    Write-Host "`nCHYBA: pg_dump selhal (exit code $exitCode)." -ForegroundColor Red
    exit 1
}

$size = (Get-Item $outFile).Length
Write-Host "`nZaloha hotova: $outFile ($([Math]::Round($size / 1MB, 2)) MB)" -ForegroundColor Green
Write-Host "Obnoveni: .\scripts\restore-database.ps1 -BackupFile `"$outFile`"" -ForegroundColor Gray
