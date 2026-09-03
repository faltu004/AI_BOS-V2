$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Assert-True {
    param(
        [bool]$Condition,
        [string]$Message
    )

    if (-not $Condition) {
        throw $Message
    }
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$setupScript = Join-Path $repoRoot "packaging\server\setup-main-pc-from-zip.ps1"
$tokens = $null
$parseErrors = $null
$ast = [Management.Automation.Language.Parser]::ParseFile(
    $setupScript,
    [ref]$tokens,
    [ref]$parseErrors
)

Assert-True -Condition ($parseErrors.Count -eq 0) -Message "Setup script has PowerShell parse errors."

function Import-SetupFunction {
    param([string]$Name)

    $matches = @($ast.FindAll({
        param($node)
        $node -is [Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq $Name
    }, $true))
    Assert-True -Condition ($matches.Count -eq 1) -Message "Expected one $Name function in setup script."
    $bodyText = $matches[0].Body.Extent.Text
    $body = [scriptblock]::Create($bodyText.Substring(1, $bodyText.Length - 2))
    Set-Item -Path "Function:\script:$Name" -Value $body
}

@(
    "Resolve-HealthUri",
    "Wait-HealthEndpoint",
    "Get-BackendTaskState",
    "Test-BackendPortListening",
    "Wait-BackendStopped",
    "Wait-BackendStarted",
    "Stop-BackendTask",
    "Start-BackendTask",
    "Restore-PreviousBackend"
) | ForEach-Object { Import-SetupFunction -Name $_ }

$BackendTaskName = "AI BOS Backend Server"
$BackendPort = 5000
$BackendStopTimeoutSeconds = 10
$BackendStartTimeoutSeconds = 10
$BackendStatePollMilliseconds = 500
$HealthAttempts = 5
$HealthRetrySeconds = 1

$directUri = Resolve-HealthUri -Value "http://127.0.0.1:5000/health" -Name "DirectBackendHealthUrl" -RequiredScheme "http"
$tlsUri = Resolve-HealthUri -Value "https://ADMIN-WORKNAI:5443/health" -Name "HealthUrl" -RequiredScheme "https"
Assert-True -Condition ($directUri.AbsoluteUri -eq "http://127.0.0.1:5000/health") -Message "Direct health URI changed."
Assert-True -Condition ($tlsUri.AbsoluteUri -eq "https://admin-worknai:5443/health") -Message "TLS health URI is malformed."

$invalidUriRejected = $false
try {
    Resolve-HealthUri -Value "[https://ADMIN-WORKNAI:5443/health](https://ADMIN-WORKNAI:5443/health)" -Name "HealthUrl" -RequiredScheme "https" | Out-Null
} catch {
    $invalidUriRejected = $true
}
Assert-True -Condition $invalidUriRejected -Message "Markdown-wrapped HealthUrl was not rejected."

$script:phase = "stop"
$script:pollCount = 0
$script:stopCalled = $false
$script:startCalled = $false

function Stop-ScheduledTask {
    param([string]$TaskName, [object]$ErrorAction)
    $script:stopCalled = $true
}

function Start-ScheduledTask {
    param([string]$TaskName)
    $script:startCalled = $true
}

function Get-ScheduledTask {
    param([string]$TaskName, [object]$ErrorAction)

    if ($script:phase -eq "stop") {
        $state = if ($script:pollCount -ge 6) { "Ready" } else { "Running" }
    } else {
        $state = if ($script:pollCount -ge 4) { "Running" } else { "Ready" }
    }
    return [pscustomobject]@{ State = $state }
}

function Get-NetTCPConnection {
    param([int]$LocalPort, [string]$State, [object]$ErrorAction)

    if ($script:phase -eq "stop" -and $script:pollCount -lt 6) {
        return [pscustomobject]@{ LocalPort = $LocalPort; State = "Listen" }
    }
    return $null
}

function Start-Sleep {
    param([int]$Seconds, [int]$Milliseconds)
    $script:pollCount++
}

Stop-BackendTask
Assert-True -Condition $script:stopCalled -Message "Scheduled task stop was not requested."
Assert-True -Condition ($script:pollCount -ge 6) -Message "Stop did not wait beyond the old fixed two-second window."

$script:phase = "start"
$script:pollCount = 0
Start-BackendTask
Assert-True -Condition $script:startCalled -Message "Scheduled task start was not requested."
Assert-True -Condition ($script:pollCount -ge 4) -Message "Delayed scheduled-task startup was not polled."

$script:directAttempts = 0
$script:tlsAttempts = 0
function Invoke-WebRequest {
    param([string]$Uri, [switch]$UseBasicParsing, [int]$TimeoutSec)

    if ($Uri -eq "http://127.0.0.1:5000/health") {
        $script:directAttempts++
        if ($script:directAttempts -lt 3) { throw "direct backend not ready" }
    } elseif ($Uri -eq "https://admin-worknai:5443/health") {
        $script:tlsAttempts++
        if ($script:tlsAttempts -lt 2) { throw "TLS gateway not ready" }
    } else {
        throw "Unexpected health URI: $Uri"
    }

    return [pscustomobject]@{ StatusCode = 200 }
}

Assert-True -Condition (Wait-HealthEndpoint -Uri $directUri -Name "Direct backend") -Message "Direct backend did not become healthy."
Assert-True -Condition ($script:directAttempts -eq 3) -Message "Direct backend health was not retried."
Assert-True -Condition (Wait-HealthEndpoint -Uri $tlsUri -Name "TLS gateway") -Message "TLS Gateway did not become healthy."
Assert-True -Condition ($script:tlsAttempts -eq 2) -Message "TLS Gateway health was not retried."

$script:rollbackCalls = @()
$rollbackComplete = $false
$backendSwapped = $true
$hadPreviousDist = $true
$targetDist = "C:\test\backend\dist"
$failedDist = "C:\test\backend\failed-dist"
$backupDist = "C:\test\backend\backup-dist"
$DirectBackendHealthUri = $directUri

function Write-Step { param([string]$Message) }
function Write-Host { param([Parameter(ValueFromRemainingArguments = $true)]$Arguments) }
function Test-Path {
    param([string]$LiteralPath, [object]$PathType)
    return $true
}
function Move-Item {
    param([string]$LiteralPath, [string]$Destination)
    $script:rollbackCalls += "move:$LiteralPath->$Destination"
}
function Stop-BackendTask { $script:rollbackCalls += "stop" }
function Start-BackendTask { $script:rollbackCalls += "start" }
function Wait-HealthEndpoint {
    param([Uri]$Uri, [string]$Name)
    $script:rollbackCalls += "health:$($Uri.AbsoluteUri)"
    return $true
}

Restore-PreviousBackend
Assert-True -Condition ($script:rollbackCalls[0] -eq "stop") -Message "Rollback did not reliably stop first."
Assert-True -Condition ($script:rollbackCalls -contains "start") -Message "Rollback did not restart the restored backend."
Assert-True -Condition ($script:rollbackCalls[-1] -eq "health:http://127.0.0.1:5000/health") -Message "Rollback did not verify restored direct backend health."

Write-Output "PASS: backend deployment stop/start/health/rollback polling"
