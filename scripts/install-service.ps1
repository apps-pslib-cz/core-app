# Installs CoreApp as a Windows Service using WinSW
# Šablona - appka postavená na core-app přejmenuje "CoreApp" na vlastní
# jméno služby (musí se shodovat s tools/<Name>.xml <id>).
# Run as Administrator

param(
    [switch]$Uninstall
)

$serviceName = "CoreApp"

$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERROR: Tento skript musi byt spusten jako Administrator" -ForegroundColor Red
    exit 1
}

$appPath    = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$toolsPath  = Join-Path $appPath "tools"
$logPath    = Join-Path $appPath "logs"
$winswExe   = Join-Path $toolsPath "$serviceName.exe"
$winswXml   = Join-Path $toolsPath "$serviceName.xml"
$winswVersion = "3.0.0-alpha.11"

if ($Uninstall) {
    Write-Host "`nOdinstalovani sluzby $serviceName..." -ForegroundColor Yellow
    if (Test-Path $winswExe) {
        & $winswExe stop   2>$null
        & $winswExe uninstall
        Write-Host "Sluzba odinstalována." -ForegroundColor Green
    } else {
        Write-Host "WinSW exe nenalezeno, zkousim sc.exe..." -ForegroundColor Gray
        sc.exe stop $serviceName 2>$null
        sc.exe delete $serviceName 2>$null
    }
    exit
}

Write-Host "`n=== Instalace sluzby $serviceName ===" -ForegroundColor Cyan

# Vytvor slozky
@($toolsPath, $logPath) | ForEach-Object {
    if (-not (Test-Path $_)) {
        New-Item -ItemType Directory -Path $_ -Force | Out-Null
        Write-Host "  Vytvorena slozka: $_" -ForegroundColor Gray
    }
}

# Oprav ACL — Node proces potrebuje zapis do .next a logs
Write-Host "`n  Nastavuji ACL pro aplikacni slozku..." -ForegroundColor Gray
icacls $appPath /grant "BUILTIN\Users:(OI)(CI)M" /T | Out-Null
Write-Host "  ACL nastaveny." -ForegroundColor Green

# Stahni WinSW pokud chybi
if (-not (Test-Path $winswExe)) {
    Write-Host "`n  Stahuji WinSW $winswVersion..." -ForegroundColor Gray
    $winswUrl = "https://github.com/winsw/winsw/releases/download/v$winswVersion/WinSW-x64.exe"
    Invoke-WebRequest -Uri $winswUrl -OutFile $winswExe -UseBasicParsing
    Write-Host "  WinSW stazeno." -ForegroundColor Green
}

# Zastav a odinstaluj starou sluzbu
$existingService = Get-Service $serviceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host "`n  Zastavuji existujici sluzbu..." -ForegroundColor Gray
    & $winswExe stop 2>$null
    & $winswExe uninstall 2>$null
    Start-Sleep -Seconds 2
}

# Nainstaluj sluzbu
Write-Host "`n  Instaluji sluzbu..." -ForegroundColor Gray
& $winswExe install $winswXml
if ($LASTEXITCODE -ne 0) {
    Write-Host "CHYBA: Instalace sluzby selhala!" -ForegroundColor Red
    exit 1
}

# Spust sluzbu
Write-Host "  Spoustim sluzbu..." -ForegroundColor Gray
& $winswExe start $winswXml
Start-Sleep -Seconds 3

# Ověření
$svc = Get-Service $serviceName -ErrorAction SilentlyContinue
if ($svc -and $svc.Status -eq "Running") {
    Write-Host "`n  Sluzba $serviceName bezi." -ForegroundColor Green
    Write-Host "  Logy: $logPath\$serviceName.out.log" -ForegroundColor Gray
} else {
    Write-Host "`n  VAROVANI: Sluzba se nespustila. Zkontroluj logy:" -ForegroundColor Yellow
    Write-Host "  Get-Content '$logPath\$serviceName.out.log' -Tail 30" -ForegroundColor Gray
}
