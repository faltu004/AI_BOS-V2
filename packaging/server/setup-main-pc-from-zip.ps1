# AI BOS V2 Main PC release setup. Run from an extracted release ZIP in elevated Windows PowerShell.

[CmdletBinding()]
param(
    [string]$PackageRoot = $PSScriptRoot,
    [string]$BackendRoot = "D:\AI-BOS-Server\backend",
    [string]$BackendTaskName = "AI BOS Backend Server",
    [string]$HealthUrl = "https://ADMIN-WORKNAI:5443/health",
    [string]$DirectBackendHealthUrl = "http://127.0.0.1:5000/health",
    [ValidateRange(1, 60)]
    [int]$HealthAttempts = 20,
    [ValidateRange(1, 30)]
    [int]$HealthRetrySeconds = 3,
    [ValidateRange(1, 300)]
    [int]$BackendStopTimeoutSeconds = 30,
    [ValidateRange(1, 300)]
    [int]$BackendStartTimeoutSeconds = 30,
    [ValidateRange(100, 5000)]
    [int]$BackendStatePollMilliseconds = 500
)

$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "=== $Message ===" -ForegroundColor Cyan
}

function Assert-Administrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw "Run this setup script from an elevated PowerShell window."
    }
}

function Resolve-HealthUri {
    param(
        [string]$Value,
        [string]$Name,
        [string]$RequiredScheme
    )

    $uri = $null
    if (-not [Uri]::TryCreate($Value, [UriKind]::Absolute, [ref]$uri) -or
        $uri.Scheme -ne $RequiredScheme -or
        [string]::IsNullOrWhiteSpace($uri.Host) -or
        -not [string]::IsNullOrWhiteSpace($uri.UserInfo) -or
        -not [string]::IsNullOrWhiteSpace($uri.Query) -or
        -not [string]::IsNullOrWhiteSpace($uri.Fragment)) {
        throw "$Name must be a plain absolute $RequiredScheme URI without credentials, query text, or a fragment: $Value"
    }

    return $uri
}

function Wait-HealthEndpoint {
    param(
        [Uri]$Uri,
        [string]$Name
    )

    for ($attempt = 1; $attempt -le $HealthAttempts; $attempt++) {
        try {
            $response = Invoke-WebRequest -Uri $Uri.AbsoluteUri -UseBasicParsing -TimeoutSec 8
            if ($response.StatusCode -eq 200) {
                return $true
            }
        } catch {
            Write-Host "$Name health check $attempt/$HealthAttempts not ready." -ForegroundColor DarkYellow
        }

        if ($attempt -lt $HealthAttempts) {
            Start-Sleep -Seconds $HealthRetrySeconds
        }
    }

    return $false
}

function Get-BackendTaskState {
    $task = Get-ScheduledTask -TaskName $BackendTaskName -ErrorAction SilentlyContinue
    if (-not $task) {
        return "NotFound"
    }

    return $task.State.ToString()
}

function Test-BackendPortListening {
    return [bool](Get-NetTCPConnection -LocalPort $BackendPort -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1)
}

function Wait-BackendStopped {
    $deadline = [DateTime]::UtcNow.AddSeconds($BackendStopTimeoutSeconds)
    do {
        $taskState = Get-BackendTaskState
        $portListening = Test-BackendPortListening
        if ($taskState -ne "Running" -and -not $portListening) {
            return $true
        }

        if ([DateTime]::UtcNow -ge $deadline) {
            return $false
        }

        Start-Sleep -Milliseconds $BackendStatePollMilliseconds
    } while ($true)
}

function Wait-BackendStarted {
    $deadline = [DateTime]::UtcNow.AddSeconds($BackendStartTimeoutSeconds)
    do {
        $taskState = Get-BackendTaskState
        $portListening = Test-BackendPortListening
        if ($taskState -eq "Running" -or $portListening) {
            return $true
        }

        if ([DateTime]::UtcNow -ge $deadline) {
            return $false
        }

        Start-Sleep -Milliseconds $BackendStatePollMilliseconds
    } while ($true)
}

function Stop-BackendTask {
    Stop-ScheduledTask -TaskName $BackendTaskName -ErrorAction SilentlyContinue
    if (-not (Wait-BackendStopped)) {
        $taskState = Get-BackendTaskState
        $portListening = Test-BackendPortListening
        throw "BACKEND_STOP_FAILED: Scheduled task state is '$taskState'; port $BackendPort listening is '$portListening' after $BackendStopTimeoutSeconds seconds."
    }
}

function Start-BackendTask {
    try {
        Start-ScheduledTask -TaskName $BackendTaskName
    } catch {
        throw "BACKEND_START_FAILED: Could not start scheduled task '$BackendTaskName': $($_.Exception.Message)"
    }

    if (-not (Wait-BackendStarted)) {
        $taskState = Get-BackendTaskState
        $portListening = Test-BackendPortListening
        throw "BACKEND_START_FAILED: Scheduled task state is '$taskState'; port $BackendPort listening is '$portListening' after $BackendStartTimeoutSeconds seconds."
    }
}

Assert-Administrator

$DirectBackendHealthUri = Resolve-HealthUri -Value $DirectBackendHealthUrl -Name "DirectBackendHealthUrl" -RequiredScheme "http"
$TlsHealthUri = Resolve-HealthUri -Value $HealthUrl -Name "HealthUrl" -RequiredScheme "https"
$BackendPort = $DirectBackendHealthUri.Port

$resolvedPackageRoot = (Resolve-Path -LiteralPath $PackageRoot).Path
$sourceBackendDist = Join-Path $resolvedPackageRoot "backend-dist"
$setupScriptPath = Join-Path $resolvedPackageRoot "setup-main-pc-from-zip.ps1"
$readmePath = Join-Path $resolvedPackageRoot "README_INSTRUCTIONS.txt"

if (-not (Test-Path -LiteralPath $sourceBackendDist -PathType Container)) {
    throw "Release package is missing backend-dist."
}
if (-not (Test-Path -LiteralPath $setupScriptPath -PathType Leaf)) {
    throw "Release package is incomplete: setup-main-pc-from-zip.ps1 is missing."
}
if (-not (Test-Path -LiteralPath $readmePath -PathType Leaf)) {
    throw "Release package is incomplete: README_INSTRUCTIONS.txt is missing."
}

$embeddedEnvironmentFiles = Get-ChildItem -LiteralPath $sourceBackendDist -Recurse -Force -File | Where-Object {
    $_.Name -eq ".env" -or $_.Name -like ".env.*"
}
if ($embeddedEnvironmentFiles) {
    throw "Release backend-dist contains an environment file. Refusing to continue."
}

$adminInstaller = Get-ChildItem -LiteralPath $resolvedPackageRoot -File -Filter "AI-BOS-Admin-Setup-*.exe" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
if (-not $adminInstaller) {
    throw "Release package is missing the AI BOS Admin installer."
}

if (-not (Test-Path -LiteralPath $BackendRoot -PathType Container)) {
    throw "Backend root does not exist: $BackendRoot"
}

$targetDist = Join-Path $BackendRoot "dist"
if (-not (Test-Path -LiteralPath $targetDist -PathType Container)) {
    throw "Current backend dist is missing; a rollback-safe update cannot continue: $targetDist"
}
$productionEnv = Join-Path $BackendRoot ".env"
$productionEnvHash = if (Test-Path -LiteralPath $productionEnv -PathType Leaf) {
    (Get-FileHash -LiteralPath $productionEnv -Algorithm SHA256).Hash
} else {
    $null
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupRoot = Join-Path $BackendRoot "release-backups\$stamp"
$backupDist = Join-Path $backupRoot "dist"
$failedDist = Join-Path $backupRoot "failed-dist"
$incomingDist = Join-Path $BackendRoot ".dist-incoming-$stamp"
$hadPreviousDist = Test-Path -LiteralPath $targetDist -PathType Container
$backendSwapped = $false
$rollbackComplete = $false

function Restore-PreviousBackend {
    if ($rollbackComplete -or -not $backendSwapped) {
        return
    }

    Write-Step "Rolling back backend"
    Stop-BackendTask

    if (Test-Path -LiteralPath $targetDist -PathType Container) {
        Move-Item -LiteralPath $targetDist -Destination $failedDist
    }

    if ($hadPreviousDist -and (Test-Path -LiteralPath $backupDist -PathType Container)) {
        Move-Item -LiteralPath $backupDist -Destination $targetDist
    }

    Start-BackendTask
    if (-not (Wait-HealthEndpoint -Uri $DirectBackendHealthUri -Name "Restored backend")) {
        throw "BACKEND_HEALTH_FAILED: Restored backend did not become healthy at $($DirectBackendHealthUri.AbsoluteUri)."
    }

    $rollbackComplete = $true
    Write-Host "Previous backend restored and healthy. Failed release retained at $failedDist" -ForegroundColor Yellow
}

try {
    Write-Step "Staging backend release"
    New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
    Copy-Item -LiteralPath $sourceBackendDist -Destination $incomingDist -Recurse

    if (Test-Path -LiteralPath (Join-Path $incomingDist ".env") -PathType Leaf) {
        throw "Staged backend unexpectedly contains .env."
    }

    Write-Step "Activating backend with rollback protection"
    Stop-BackendTask

    if ($hadPreviousDist) {
        Move-Item -LiteralPath $targetDist -Destination $backupDist
    }
    Move-Item -LiteralPath $incomingDist -Destination $targetDist
    $backendSwapped = $true

    Start-BackendTask
    if (-not (Wait-HealthEndpoint -Uri $DirectBackendHealthUri -Name "Direct backend")) {
        throw "BACKEND_HEALTH_FAILED: Backend did not become healthy at $($DirectBackendHealthUri.AbsoluteUri)."
    }
    if (-not (Wait-HealthEndpoint -Uri $TlsHealthUri -Name "TLS gateway")) {
        throw "TLS_GATEWAY_HEALTH_FAILED: TLS Gateway did not become healthy at $($TlsHealthUri.AbsoluteUri)."
    }

    if ($productionEnvHash) {
        $currentEnvironmentHash = (Get-FileHash -LiteralPath $productionEnv -Algorithm SHA256).Hash
        if ($currentEnvironmentHash -ne $productionEnvHash) {
            throw "Production .env changed during setup."
        }
    } elseif (Test-Path -LiteralPath $productionEnv -PathType Leaf) {
        throw "Production .env was created during setup."
    }

    Write-Step "Updating AI BOS Admin"
    $installerProcess = Start-Process -FilePath $adminInstaller.FullName -ArgumentList "/S" -Wait -PassThru -WindowStyle Hidden
    if ($installerProcess.ExitCode -ne 0) {
        throw "Admin installer failed with exit code $($installerProcess.ExitCode)."
    }

    Write-Step "Release setup complete"
    Write-Host "Direct backend is healthy: $($DirectBackendHealthUri.AbsoluteUri)" -ForegroundColor Green
    Write-Host "TLS Gateway is healthy: $($TlsHealthUri.AbsoluteUri)" -ForegroundColor Green
    Write-Host "Rollback backup retained at: $backupRoot" -ForegroundColor Green
    Write-Host "Production .env was not copied or overwritten." -ForegroundColor Green
} catch {
    $failure = $_
    try {
        Restore-PreviousBackend
    } catch {
        Write-Error "Automatic rollback also failed: $($_.Exception.Message)"
    }
    throw $failure
} finally {
    if (Test-Path -LiteralPath $incomingDist -PathType Container) {
        Remove-Item -LiteralPath $incomingDist -Recurse -Force
    }
}
