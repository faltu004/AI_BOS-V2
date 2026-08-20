param(
    [Parameter(Mandatory = $true)]
    [string]$InstallRoot
)

$ErrorActionPreference = "Stop"

$logRoot = Join-Path $env:ProgramData "AI BOS\InstallLogs"
$logPath = Join-Path $logRoot "employee-session-helper-install.log"

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

function Convert-TaskTextForComparison {
    param([AllowNull()][string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return ""
    }

    return $Value.Trim().Trim('"').Replace("/", "\").ToLowerInvariant()
}

function Test-LegacySessionHelperOwnership {
    param(
        [Parameter(Mandatory = $true)]
        $Task
    )

    $legacyRoot = "c:\ai-bos\deviceagent"
    foreach ($action in @($Task.Actions)) {
        $taskText = @(
            $action.Execute,
            $action.Arguments,
            $action.WorkingDirectory
        ) | ForEach-Object {
            Convert-TaskTextForComparison -Value $_
        }

        foreach ($value in $taskText) {
            if ($value.Contains($legacyRoot)) {
                return $true
            }
        }
    }

    return $false
}

function Remove-OwnedLegacySessionHelperTask {
    $legacyTaskName = "AI BOS User Session Helper"
    $legacyTask = Get-ScheduledTask -TaskName $legacyTaskName -ErrorAction SilentlyContinue

    if ($null -eq $legacyTask) {
        Write-InstallLog "Legacy Session Helper task was not present."
        return
    }

    if (-not (Test-LegacySessionHelperOwnership -Task $legacyTask)) {
        Write-InstallLog "Legacy Session Helper task exists but does not target C:\AI-BOS\DeviceAgent; leaving it unchanged."
        return
    }

    Unregister-ScheduledTask -TaskName $legacyTaskName -TaskPath $legacyTask.TaskPath -Confirm:$false
    Write-InstallLog "Removed owned legacy Session Helper task: $legacyTaskName."
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
    $agentWorkingDirectory = Join-Path $InstallRoot "agent"
    $usersSid = "S-1-5-32-545"

    Write-InstallLog "AI BOS Session Helper task install started. InstallRoot=$InstallRoot"

    Assert-File -Path $helperScript -Label "Session Helper entry point"
    Assert-File -Path $nodeExe -Label "Bundled Node runtime"
    if (-not (Test-Path -LiteralPath $agentWorkingDirectory -PathType Container)) {
        throw "Device Agent working directory was not found at $agentWorkingDirectory."
    }

    Remove-OwnedLegacySessionHelperTask

    $action = New-ScheduledTaskAction `
        -Execute $nodeExe `
        -Argument "--use-system-ca `"$helperScript`"" `
        -WorkingDirectory $agentWorkingDirectory

    $trigger = New-ScheduledTaskTrigger -AtLogOn

    $principalConfig = New-ScheduledTaskPrincipal `
        -GroupId $usersSid `
        -RunLevel Limited

    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
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

    if ($registeredAction.Execute -ne $nodeExe) {
        throw "Session Helper task executable mismatch."
    }

    if ($registeredAction.Arguments -ne "--use-system-ca `"$helperScript`"") {
        throw "Session Helper task arguments mismatch."
    }

    if ($registeredAction.WorkingDirectory -ne $agentWorkingDirectory) {
        throw "Session Helper task working directory mismatch."
    }

    if ($registeredTrigger.Enabled -ne $true) {
        throw "Session Helper task trigger is not enabled."
    }

    $registeredGroupSid = Convert-IdentityToSid -Identity $registeredPrincipal.GroupId
    if ($registeredGroupSid -ne $usersSid) {
        throw "Session Helper task principal GroupId is $($registeredPrincipal.GroupId), expected $usersSid."
    }

    if ($registeredPrincipal.RunLevel -ne "Limited") {
        throw "Session Helper task RunLevel is $($registeredPrincipal.RunLevel), expected Limited."
    }

    Write-InstallLog "AI BOS Session Helper task registered successfully. TaskName=$taskName GroupId=$usersSid RunLevel=Limited"
    exit 0
} catch {
    Write-InstallLog "FAILED: $($_.Exception.Message)"
    Write-Error $_.Exception.Message
    exit 1
}
