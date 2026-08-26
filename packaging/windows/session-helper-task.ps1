param(
    [Parameter(Mandatory = $true)]
    [string]$InstallRoot
)

$ErrorActionPreference = "Stop"

$logRoot = Join-Path $env:ProgramData "AI BOS\InstallLogs"
$logPath = Join-Path $logRoot "employee-session-helper-install.log"
$cleanupScript = Join-Path $PSScriptRoot "session-helper-task-cleanup.ps1"

if (-not (Test-Path -LiteralPath $cleanupScript -PathType Leaf)) {
    throw "Session Helper task cleanup helper was not found at $cleanupScript."
}

. $cleanupScript

function Write-InstallLog {
    param([string]$Message)
    New-Item -ItemType Directory -Force -Path $logRoot | Out-Null
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"
    Add-Content -LiteralPath $logPath -Value "[$timestamp] $Message"
}

function Assert-File {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $true)]
        [string]$Label
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "$Label was not found at $Path."
    }
}

function Convert-IdentityToSid {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Identity
    )

    try {
        return ([Security.Principal.SecurityIdentifier]::new($Identity)).Value
    } catch {
        return ([Security.Principal.NTAccount]::new($Identity)).Translate(
            [Security.Principal.SecurityIdentifier]
        ).Value
    }
}

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$principal = [Security.Principal.WindowsPrincipal]::new($identity)
$isAdmin = $principal.IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator
)

if (-not $isAdmin) {
    throw "AI BOS installer tasks require Windows administrator elevation."
}

try {
    $taskName = "AI BOS Session Helper"
    $helperScript = Join-Path $InstallRoot "agent\dist\session-helper.js"
    $nodeExe = Join-Path $InstallRoot "runtime\node.exe"
    $hiddenLauncher = Join-Path $InstallRoot "install\session-helper-hidden.vbs"
    $wscriptExe = Join-Path $env:WINDIR "System32\wscript.exe"
    $launcherWorkingDirectory = Join-Path $InstallRoot "install"
    $agentWorkingDirectory = Join-Path $InstallRoot "agent"
    $usersSid = "S-1-5-32-545"

    Write-InstallLog "AI BOS Session Helper task install started. InstallRoot=$InstallRoot"

    Assert-File -Path $helperScript -Label "Session Helper entry point"
    Assert-File -Path $nodeExe -Label "Bundled Node runtime"
    Assert-File -Path $hiddenLauncher -Label "Session Helper hidden launcher"
    if (-not (Test-Path -LiteralPath $agentWorkingDirectory -PathType Container)) {
        throw "Device Agent working directory was not found at $agentWorkingDirectory."
    }

    Remove-AiBosStaleUserSessionHelperTask `
        -InstallRoot $InstallRoot `
        -WriteLog ${function:Write-InstallLog} | Out-Null

    $actionArguments = "`"$hiddenLauncher`" `"$InstallRoot`""

    $action = New-ScheduledTaskAction `
        -Execute $wscriptExe `
        -Argument $actionArguments `
        -WorkingDirectory $launcherWorkingDirectory
    $interactiveUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

    $trigger = New-ScheduledTaskTrigger `
        -AtLogOn `
        -User $interactiveUser
    $trigger.Delay = "PT30S"

    $principalConfig = New-ScheduledTaskPrincipal `
        -UserId $interactiveUser `
        -LogonType Interactive `
        -RunLevel Limited

    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -RestartCount 3 `
        -RestartInterval (New-TimeSpan -Minutes 1) `
        -ExecutionTimeLimit ([TimeSpan]::Zero)

    $task = New-ScheduledTask `
        -Action $action `
        -Trigger $trigger `
        -Principal $principalConfig `
        -Settings $settings

    Register-ScheduledTask `
        -TaskName $taskName `
        -InputObject $task `
        -Force | Out-Null

    $registeredTask = Get-ScheduledTask -TaskName $taskName -ErrorAction Stop
    $registeredAction = $registeredTask.Actions | Select-Object -First 1
    $registeredTrigger = $registeredTask.Triggers | Select-Object -First 1
    $registeredPrincipal = $registeredTask.Principal

    if ($registeredAction.Execute -ne $wscriptExe) {
        throw "Session Helper task executable mismatch."
    }

    if ($registeredAction.Arguments -ne $actionArguments) {
        throw "Session Helper task arguments mismatch."
    }

    if ($registeredAction.WorkingDirectory -ne $launcherWorkingDirectory) {
        throw "Session Helper task working directory mismatch."
    }

    if ($registeredTrigger.Enabled -ne $true) {
        throw "Session Helper task trigger is not enabled."
    }

    $registeredUserSid = Convert-IdentityToSid -Identity $registeredPrincipal.UserId
    $expectedUserSid = Convert-IdentityToSid -Identity $interactiveUser

    if ($registeredUserSid -ne $expectedUserSid) {
        throw "Session Helper task UserId resolves to SID $registeredUserSid, expected $expectedUserSid."
    }

    if ($registeredPrincipal.LogonType -ne "Interactive") {
        throw "Session Helper task LogonType is $($registeredPrincipal.LogonType), expected Interactive."
    }

    if ($registeredPrincipal.RunLevel -ne "Limited") {
        throw "Session Helper task RunLevel is $($registeredPrincipal.RunLevel), expected Limited."
    }

    Write-InstallLog "AI BOS Session Helper task registered successfully. TaskName=$taskName UserId=$interactiveUser LogonType=Interactive RunLevel=Limited"
    exit 0
} catch {
    Write-InstallLog "FAILED: $($_.Exception.Message)"
    Write-Error $_.Exception.Message
    exit 1
}


