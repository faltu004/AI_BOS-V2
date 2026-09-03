$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$cleanupScript = Join-Path $repoRoot "packaging\windows\session-helper-task-cleanup.ps1"
$installerScript = Join-Path $repoRoot "packaging\windows\session-helper-task.ps1"
$builderConfigPath = Join-Path $repoRoot "packaging\employee\electron-builder.json"

. $cleanupScript

$installRoot = "C:\Program Files\AI BOS Employee\resources\device-agent"
$script:scheduledTasks = @()
$script:getTaskNames = New-Object System.Collections.Generic.List[string]
$script:unregisterCalls = New-Object System.Collections.Generic.List[object]
$script:installLogs = New-Object System.Collections.Generic.List[string]

function Assert-True {
    param(
        [Parameter(Mandatory = $true)]
        [bool]$Condition,
        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    if (-not $Condition) {
        throw $Message
    }
}

function Assert-Equal {
    param(
        [AllowNull()]
        $Actual,
        [AllowNull()]
        $Expected,
        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    if ($Actual -ne $Expected) {
        throw "$Message Actual=[$Actual] Expected=[$Expected]"
    }
}

function Reset-TaskState {
    param([object[]]$Tasks = @())

    $script:scheduledTasks = @($Tasks)
    $script:getTaskNames.Clear()
    $script:unregisterCalls.Clear()
    $script:installLogs.Clear()
}

function New-TestTask {
    param(
        [string]$TaskName = "AI BOS User Session Helper",
        [string]$TaskPath = "\",
        [Parameter(Mandatory = $true)]
        [string]$Execute,
        [Parameter(Mandatory = $true)]
        [string]$Arguments,
        [string]$WorkingDirectory = ""
    )

    return [pscustomobject]@{
        TaskName = $TaskName
        TaskPath = $TaskPath
        Actions = @(
            [pscustomobject]@{
                Execute = $Execute
                Arguments = $Arguments
                WorkingDirectory = $WorkingDirectory
            }
        )
    }
}

function Get-ScheduledTask {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string]$TaskName
    )

    $script:getTaskNames.Add($TaskName)
    return @(
        $script:scheduledTasks | Where-Object {
            $_.TaskName -eq $TaskName
        }
    )
}

function Unregister-ScheduledTask {
    [CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = "High")]
    param(
        [Parameter(Mandatory = $true)]
        [string]$TaskName,
        [Parameter(Mandatory = $true)]
        [string]$TaskPath
    )

    $script:unregisterCalls.Add(
        [pscustomobject]@{
            TaskName = $TaskName
            TaskPath = $TaskPath
        }
    )
    $script:scheduledTasks = @(
        $script:scheduledTasks | Where-Object {
            -not (
                $_.TaskName -eq $TaskName -and
                $_.TaskPath -eq $TaskPath
            )
        }
    )
}

$writeTestLog = {
    param([string]$Message)
    $script:installLogs.Add($Message)
}

# Known stale task: global Node plus an unpackaged development-repository helper path.
$staleTask = New-TestTask `
    -TaskPath "\Legacy AI BOS\" `
    -Execute "C:\Program Files\nodejs\node.exe" `
    -Arguments '"C:\WorknAi Project\AI BOS V2\device-agent\dist\session-helper.js"' `
    -WorkingDirectory "C:\WorknAi Project\AI BOS V2\device-agent"

Reset-TaskState -Tasks @($staleTask)
$staleResult = @(
    Remove-AiBosStaleUserSessionHelperTask `
        -InstallRoot $installRoot `
        -WriteLog $writeTestLog
)

Assert-Equal -Actual $staleResult.Count -Expected 1 -Message "Stale cleanup result count mismatch."
Assert-Equal -Actual $staleResult[0].Status -Expected "Removed" -Message "Stale task was not removed."
Assert-Equal -Actual $staleResult[0].Reason -Expected "unpackaged_device_agent_helper" -Message "Stale task reason mismatch."
Assert-Equal -Actual $script:unregisterCalls.Count -Expected 1 -Message "Stale task unregister count mismatch."
Assert-Equal -Actual $script:unregisterCalls[0].TaskName -Expected "AI BOS User Session Helper" -Message "Cleanup used the wrong task name."
Assert-Equal -Actual $script:unregisterCalls[0].TaskPath -Expected "\Legacy AI BOS\" -Message "Cleanup used the wrong task path."
Assert-Equal -Actual $script:getTaskNames.Count -Expected 1 -Message "Cleanup task lookup count mismatch."
Assert-Equal -Actual $script:getTaskNames[0] -Expected "AI BOS User Session Helper" -Message "Cleanup lookup was not exact-name scoped."
Write-Output "stale dev helper detected and removed PASS"

# A packaged helper action is preserved even if encountered under the obsolete name.
$validPackagedTask = New-TestTask `
    -Execute (Join-Path $installRoot "runtime\node.exe") `
    -Arguments ('--use-system-ca "{0}"' -f (Join-Path $installRoot "agent\dist\session-helper.js")) `
    -WorkingDirectory (Join-Path $installRoot "agent")
$officialProductionTask = New-TestTask `
    -TaskName "AI BOS Session Helper" `
    -Execute (Join-Path $installRoot "runtime\node.exe") `
    -Arguments ('--use-system-ca "{0}"' -f (Join-Path $installRoot "agent\dist\session-helper.js")) `
    -WorkingDirectory (Join-Path $installRoot "agent")

Reset-TaskState -Tasks @($validPackagedTask, $officialProductionTask)
$validResult = @(
    Remove-AiBosStaleUserSessionHelperTask `
        -InstallRoot $installRoot `
        -WriteLog $writeTestLog
)

Assert-Equal -Actual $validResult.Count -Expected 1 -Message "Valid task result count mismatch."
Assert-Equal -Actual $validResult[0].Status -Expected "Preserved" -Message "Valid packaged task was not preserved."
Assert-Equal -Actual $validResult[0].Reason -Expected "packaged_production_action" -Message "Valid packaged task reason mismatch."
Assert-Equal -Actual $script:unregisterCalls.Count -Expected 0 -Message "Valid packaged task was unregistered."
Assert-True -Condition ([bool]($script:scheduledTasks | Where-Object { $_.TaskName -eq "AI BOS Session Helper" })) -Message "Official production helper was changed."
Write-Output "valid production helper preserved PASS"

# No task is a successful no-op.
Reset-TaskState
$absentResult = @(
    Remove-AiBosStaleUserSessionHelperTask `
        -InstallRoot $installRoot `
        -WriteLog $writeTestLog
)

Assert-Equal -Actual $absentResult.Count -Expected 1 -Message "Absent result count mismatch."
Assert-Equal -Actual $absentResult[0].Status -Expected "NotPresent" -Message "Absent task was not a no-op."
Assert-Equal -Actual $script:unregisterCalls.Count -Expected 0 -Message "Absent task triggered unregister."
Write-Output "task absent no failure PASS"

# Repeated cleanup removes once, then becomes a successful no-op.
Reset-TaskState -Tasks @($staleTask)
$firstResult = @(
    Remove-AiBosStaleUserSessionHelperTask `
        -InstallRoot $installRoot `
        -WriteLog $writeTestLog
)
$secondResult = @(
    Remove-AiBosStaleUserSessionHelperTask `
        -InstallRoot $installRoot `
        -WriteLog $writeTestLog
)

Assert-Equal -Actual $firstResult[0].Status -Expected "Removed" -Message "First cleanup did not remove stale task."
Assert-Equal -Actual $secondResult[0].Status -Expected "NotPresent" -Message "Repeated cleanup was not an absent no-op."
Assert-Equal -Actual $script:unregisterCalls.Count -Expected 1 -Message "Repeated cleanup unregistered more than once."
Write-Output "repeated cleanup idempotent PASS"

# Quoted and slash-normalized Windows paths with spaces classify correctly.
$spacedStaleTask = New-TestTask `
    -Execute '"C:/Program Files/nodejs/node.exe"' `
    -Arguments '--use-system-ca "D:/Developer Work/AI BOS V2/device-agent/dist/session-helper.js"' `
    -WorkingDirectory 'D:/Developer Work/AI BOS V2/device-agent'

Reset-TaskState -Tasks @($spacedStaleTask)
$spacedResult = @(
    Remove-AiBosStaleUserSessionHelperTask `
        -InstallRoot $installRoot `
        -WriteLog $writeTestLog
)

Assert-Equal -Actual $spacedResult[0].Status -Expected "Removed" -Message "Spaced stale path was not removed."
Assert-Equal -Actual $spacedResult[0].Reason -Expected "unpackaged_device_agent_helper" -Message "Spaced stale path reason mismatch."
Write-Output "spaced Windows paths handled PASS"

# Packaging wiring and protected production-task characteristics remain present.
$installerSource = Get-Content -LiteralPath $installerScript -Raw
$hiddenLauncherSource = Get-Content -LiteralPath (Join-Path $repoRoot "packaging\windows\session-helper-hidden.vbs") -Raw
$builderConfig = Get-Content -LiteralPath $builderConfigPath -Raw | ConvertFrom-Json
$parseTokens = $null
$parseErrors = $null
[void][System.Management.Automation.Language.Parser]::ParseFile(
    $installerScript,
    [ref]$parseTokens,
    [ref]$parseErrors
)
$cleanupResource = @(
    $builderConfig.extraResources | Where-Object {
        $_.from -eq "packaging/windows/session-helper-task-cleanup.ps1" -and
        $_.to -eq "device-agent/install/session-helper-task-cleanup.ps1"
    }
)

Assert-Equal -Actual $parseErrors.Count -Expected 0 -Message "Session Helper task installer contains PowerShell parse errors."
Assert-True -Condition $installerSource.Contains('Remove-AiBosStaleUserSessionHelperTask') -Message "Installer does not invoke stale-task cleanup."
Assert-True -Condition $installerSource.Contains('-RunLevel Limited') -Message "Limited RunLevel was changed or removed."
Assert-True -Condition $installerSource.Contains('-LogonType Interactive') -Message "Interactive LogonType was changed or removed."
Assert-True -Condition $installerSource.Contains('-AtLogOn') -Message "AtLogOn trigger was changed or removed."
Assert-True -Condition $installerSource.Contains('-StartWhenAvailable') -Message "StartWhenAvailable was changed or removed."
Assert-True -Condition $installerSource.Contains('-RestartCount 999') -Message "Durable task restart count was changed or removed."
Assert-True -Condition $installerSource.Contains('-RestartInterval (New-TimeSpan -Minutes 1)') -Message "Task restart interval was changed or removed."
Assert-True -Condition $installerSource.Contains('-MultipleInstances IgnoreNew') -Message "IgnoreNew multiple-instance policy was changed or removed."
Assert-True -Condition $installerSource.Contains('-ExecutionTimeLimit ([TimeSpan]::Zero)') -Message "Unlimited task execution time was changed or removed."
Assert-True -Condition $installerSource.Contains('Register-ScheduledTask') -Message "Task registration was removed."
Assert-True -Condition $installerSource.Contains('-Force') -Message "Upgrade task repair was changed or removed."
Assert-True -Condition $installerSource.Contains('Start-ScheduledTask') -Message "Post-repair task startup was changed or removed."
Assert-True -Condition $installerSource.Contains('Resolve-InteractiveUser') -Message "Interactive-user resolution was changed or removed."
Assert-True -Condition $installerSource.Contains('"S-1-5-18"') -Message "LocalSystem rejection guard was changed or removed."
Assert-True -Condition $hiddenLauncherSource.Contains('--use-system-ca') -Message "--use-system-ca was changed or removed."
Assert-True -Condition $hiddenLauncherSource.Contains('shell.Run(command, 0, True)') -Message "Hidden waited helper launch was changed or removed."
Assert-True -Condition $hiddenLauncherSource.Contains('WScript.Sleep RetryDelayMilliseconds') -Message "Hidden launcher retry supervision was changed or removed."
Assert-True -Condition $hiddenLauncherSource.Contains('If launchError = 0 And exitCode = 0 Then') -Message "Hidden launcher clean-exit handling was changed or removed."
Assert-True -Condition (-not $hiddenLauncherSource.Contains('cmd.exe')) -Message "Hidden launcher must not introduce cmd.exe."
Assert-True -Condition (-not $hiddenLauncherSource.Contains('powershell.exe')) -Message "Hidden launcher must not introduce powershell.exe."
Assert-True -Condition $installerSource.Contains('$taskName = "AI BOS Session Helper"') -Message "Production task name was changed."
Assert-Equal -Actual $cleanupResource.Count -Expected 1 -Message "Cleanup helper is not packaged exactly once."
Write-Output "installer packaging and production task invariants PASS"
