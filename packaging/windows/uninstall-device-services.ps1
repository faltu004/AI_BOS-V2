param(
    [Parameter(Mandatory = $true)]
    [string]$InstallRoot
)

$ErrorActionPreference = "Stop"

$logRoot = Join-Path $env:ProgramData "AI BOS\InstallLogs"
$logPath = Join-Path $logRoot "employee-device-services-uninstall.log"

function Write-InstallLog {
    param([string]$Message)
    New-Item -ItemType Directory -Force -Path $logRoot | Out-Null
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"
    Add-Content -LiteralPath $logPath -Value "[$timestamp] $Message"
}

function Invoke-ServiceCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$WrapperPath,
        [Parameter(Mandatory = $true)]
        [string]$Action,
        [Parameter(Mandatory = $true)]
        [string]$Description,
        [switch]$AllowMissing
    )

    if (-not (Test-Path -LiteralPath $WrapperPath -PathType Leaf)) {
        if ($AllowMissing) {
            Write-InstallLog "$Description skipped, wrapper missing: $WrapperPath"
            return
        }
        throw "$Description failed because wrapper is missing: $WrapperPath"
    }

    Write-InstallLog "${Description}: $WrapperPath $Action"
    $process = Start-Process -FilePath $WrapperPath -ArgumentList @($Action) -Wait -NoNewWindow -PassThru
    Write-InstallLog "$Description exit code: $($process.ExitCode)"

    if ($process.ExitCode -ne 0 -and -not $AllowMissing) {
        throw "$Description failed with exit code $($process.ExitCode). See $logPath."
    }
}

try {
    Write-InstallLog "AI BOS Employee device service uninstall started. InstallRoot=$InstallRoot"

    Unregister-ScheduledTask -TaskName "AI BOS Session Helper" -Confirm:$false -ErrorAction SilentlyContinue

    $serviceRoot = Join-Path $InstallRoot "service"
    $agentWrapper = Join-Path $serviceRoot "AIBOSDeviceAgent.exe"
    $updaterWrapper = Join-Path $serviceRoot "AIBOSDeviceUpdater.exe"

    Invoke-ServiceCommand -WrapperPath $agentWrapper -Action "stop" -Description "Stop AIBOSDeviceAgent" -AllowMissing
    Invoke-ServiceCommand -WrapperPath $agentWrapper -Action "uninstall" -Description "Uninstall AIBOSDeviceAgent" -AllowMissing
    Invoke-ServiceCommand -WrapperPath $updaterWrapper -Action "stop" -Description "Stop AIBOSDeviceUpdater" -AllowMissing
    Invoke-ServiceCommand -WrapperPath $updaterWrapper -Action "uninstall" -Description "Uninstall AIBOSDeviceUpdater" -AllowMissing

    Write-InstallLog "AI BOS Employee device service uninstall completed."
    exit 0
} catch {
    Write-InstallLog "FAILED: $($_.Exception.Message)"
    Write-Error $_.Exception.Message
    exit 1
}
