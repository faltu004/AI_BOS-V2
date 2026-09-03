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

function Resolve-InteractiveUser {
    $interactiveUser = ""

    try {
        $computerSystem = Get-CimInstance `
            -ClassName Win32_ComputerSystem `
            -ErrorAction Stop
        $interactiveUser = [string]$computerSystem.UserName
    } catch {
        Write-InstallLog "Active console-user lookup failed: $($_.Exception.Message)"
    }

    if ([string]::IsNullOrWhiteSpace($interactiveUser)) {
        $interactiveUser = [Security.Principal.WindowsIdentity]::GetCurrent().Name
    }

    if ([string]::IsNullOrWhiteSpace($interactiveUser)) {
        throw "No interactive Windows user is available for Session Helper registration."
    }

    $interactiveUser = $interactiveUser.Trim()
    $interactiveUserSid = Convert-IdentityToSid -Identity $interactiveUser
    $serviceSids = @(
        "S-1-5-18", # LocalSystem
        "S-1-5-19", # LocalService
        "S-1-5-20"  # NetworkService
    )

    if ($serviceSids -contains $interactiveUserSid) {
        throw "Session Helper cannot be registered for a Windows service identity ($interactiveUserSid)."
    }

    return [pscustomobject]@{
        Name = $interactiveUser
        Sid = $interactiveUserSid
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
    $interactiveIdentity = Resolve-InteractiveUser
    $interactiveUser = $interactiveIdentity.Name

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
        -RestartCount 999 `
        -RestartInterval (New-TimeSpan -Minutes 1) `
        -MultipleInstances IgnoreNew `
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

    if ($registeredTrigger.Delay -ne "PT30S") {
        throw "Session Helper task logon delay is $($registeredTrigger.Delay), expected PT30S."
    }

    $registeredUserSid = Convert-IdentityToSid -Identity $registeredPrincipal.UserId
    $expectedUserSid = $interactiveIdentity.Sid

    if ($registeredUserSid -ne $expectedUserSid) {
        throw "Session Helper task UserId resolves to SID $registeredUserSid, expected $expectedUserSid."
    }

    if ($registeredPrincipal.LogonType -ne "Interactive") {
        throw "Session Helper task LogonType is $($registeredPrincipal.LogonType), expected Interactive."
    }

    if ($registeredPrincipal.RunLevel -ne "Limited") {
        throw "Session Helper task RunLevel is $($registeredPrincipal.RunLevel), expected Limited."
    }

    $registeredSettings = $registeredTask.Settings

    if ($registeredSettings.StartWhenAvailable -ne $true) {
        throw "Session Helper task StartWhenAvailable is not enabled."
    }

    if ([int]$registeredSettings.RestartCount -ne 999) {
        throw "Session Helper task RestartCount is $($registeredSettings.RestartCount), expected 999."
    }

    if ([string]$registeredSettings.RestartInterval -ne "PT1M") {
        throw "Session Helper task RestartInterval is $($registeredSettings.RestartInterval), expected PT1M."
    }

    if ([string]$registeredSettings.MultipleInstances -ne "IgnoreNew") {
        throw "Session Helper task MultipleInstances is $($registeredSettings.MultipleInstances), expected IgnoreNew."
    }

    if ([string]$registeredSettings.ExecutionTimeLimit -ne "PT0S") {
        throw "Session Helper task ExecutionTimeLimit is $($registeredSettings.ExecutionTimeLimit), expected PT0S."
    }

    Start-ScheduledTask `
        -TaskName $taskName `
        -ErrorAction Stop

    Write-InstallLog "AI BOS Session Helper task registered and started successfully. TaskName=$taskName UserId=$interactiveUser UserSid=$expectedUserSid LogonType=Interactive RunLevel=Limited Trigger=AtLogOn Delay=PT30S StartWhenAvailable=True RestartCount=999 RestartInterval=PT1M MultipleInstances=IgnoreNew ExecutionTimeLimit=PT0S"
    exit 0
} catch {
    Write-InstallLog "FAILED: $($_.Exception.Message)"
    Write-Error $_.Exception.Message
    exit 1
}


