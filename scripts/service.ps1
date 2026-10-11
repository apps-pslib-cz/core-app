# Správa služby CoreApp
# Šablona - appka postavená na core-app přejmenuje $serviceName/$port.
# Použití: .\service.ps1 [-Action start|stop|restart|status|logs]

param(
    [ValidateSet("start","stop","restart","status","logs")]
    [string]$Action = "status",
    [switch]$Follow
)

$serviceName = "CoreApp"
$port = 3100

$appPath  = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$winswExe = Join-Path $appPath "tools\$serviceName.exe"
$logPath  = Join-Path $appPath "logs"

switch ($Action) {
    "start" {
        & $winswExe start
        Start-Sleep -Seconds 2
        Get-Service $serviceName | Select-Object Name, Status
    }
    "stop" {
        & $winswExe stop
        Get-Service $serviceName | Select-Object Name, Status
    }
    "restart" {
        & $winswExe stop
        Start-Sleep -Seconds 3
        & $winswExe start
        Start-Sleep -Seconds 2
        Get-Service $serviceName | Select-Object Name, Status
    }
    "status" {
        $svc = Get-Service $serviceName -ErrorAction SilentlyContinue
        if ($svc) {
            Write-Host "Sluzba: $($svc.DisplayName)" -ForegroundColor Cyan
            Write-Host "Status: $($svc.Status)" -ForegroundColor $(if ($svc.Status -eq "Running") { "Green" } else { "Red" })
        } else {
            Write-Host "Sluzba $serviceName neexistuje. Spust install-service.ps1." -ForegroundColor Yellow
        }
        Write-Host ""
        Write-Host "Port $port`:"
        netstat -ano | findstr ":$port"
    }
    "logs" {
        $logFile = Get-ChildItem "$logPath\$serviceName.out.log" -ErrorAction SilentlyContinue
        if (-not $logFile) {
            Write-Host "Log soubor nenalezen: $logPath\$serviceName.out.log" -ForegroundColor Yellow
            exit
        }
        if ($Follow) {
            Get-Content $logFile.FullName -Wait -Tail 30
        } else {
            Get-Content $logFile.FullName -Tail 50
        }
    }
}
