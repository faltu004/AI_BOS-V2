function Convert-AiBosTaskTextForComparison {
    param([AllowNull()][string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return ""
    }

    return $Value.Trim().Trim('"').Replace("/", "\").ToLowerInvariant()
}

function Test-AiBosPackagedSessionHelperAction {
    param(
        [Parameter(Mandatory = $true)]
        $Action,
        [Parameter(Mandatory = $true)]
        [string]$InstallRoot
    )

    $expectedNode = Convert-AiBosTaskTextForComparison -Value (
        Join-Path $InstallRoot "runtime\node.exe"
    )
    $expectedHelper = Join-Path $InstallRoot "agent\dist\session-helper.js"
    $expectedArguments = Convert-AiBosTaskTextForComparison -Value (
        '--use-system-ca "{0}"' -f $expectedHelper
    )
    $expectedWorkingDirectory = Convert-AiBosTaskTextForComparison -Value (
        Join-Path $InstallRoot "agent"
    )

    $actualNode = Convert-AiBosTaskTextForComparison -Value $Action.Execute
    $actualArguments = Convert-AiBosTaskTextForComparison -Value $Action.Arguments
    $actualWorkingDirectory = Convert-AiBosTaskTextForComparison -Value $Action.WorkingDirectory

    return (
        $actualNode -eq $expectedNode -and
        $actualArguments -eq $expectedArguments -and
        $actualWorkingDirectory -eq $expectedWorkingDirectory
    )
}

function Get-AiBosLegacySessionHelperDisposition {
    param(
        [Parameter(Mandatory = $true)]
        $Task,
        [Parameter(Mandatory = $true)]
        [string]$InstallRoot
    )

    $actions = @($Task.Actions)

    foreach ($action in $actions) {
        if (Test-AiBosPackagedSessionHelperAction -Action $action -InstallRoot $InstallRoot) {
            return [pscustomobject]@{
                Remove = $false
                Reason = "packaged_production_action"
            }
        }
    }

    $ownedLegacyRoot = "c:\ai-bos\deviceagent"
    $unpackagedHelperPath = "\device-agent\dist\session-helper.js"
    $packagedHelperPath = "\resources\device-agent\agent\dist\session-helper.js"

    foreach ($action in $actions) {
        $execute = Convert-AiBosTaskTextForComparison -Value $action.Execute
        $arguments = Convert-AiBosTaskTextForComparison -Value $action.Arguments
        $workingDirectory = Convert-AiBosTaskTextForComparison -Value $action.WorkingDirectory
        $actionText = @($execute, $arguments, $workingDirectory)

        foreach ($value in $actionText) {
            if ($value.Contains($ownedLegacyRoot)) {
                return [pscustomobject]@{
                    Remove = $true
                    Reason = "owned_legacy_install_root"
                }
            }
        }

        if (
            $arguments.Contains($unpackagedHelperPath) -and
            -not $arguments.Contains($packagedHelperPath)
        ) {
            return [pscustomobject]@{
                Remove = $true
                Reason = "unpackaged_device_agent_helper"
            }
        }

        $usesGlobalNode = $execute.EndsWith("\nodejs\node.exe")
        $targetsSessionHelper = $arguments.Contains("session-helper.js")

        if ($usesGlobalNode -and $targetsSessionHelper) {
            return [pscustomobject]@{
                Remove = $true
                Reason = "global_node_session_helper"
            }
        }
    }

    return [pscustomobject]@{
        Remove = $false
        Reason = "unrecognized_action_preserved"
    }
}

function Remove-AiBosStaleUserSessionHelperTask {
    param(
        [Parameter(Mandatory = $true)]
        [string]$InstallRoot,
        [Parameter(Mandatory = $true)]
        [scriptblock]$WriteLog
    )

    $legacyTaskName = "AI BOS User Session Helper"
    $legacyTasks = @(
        Get-ScheduledTask `
            -TaskName $legacyTaskName `
            -ErrorAction SilentlyContinue
    )

    if ($legacyTasks.Count -eq 0) {
        & $WriteLog "Legacy Session Helper task was not present."
        return [pscustomobject]@{
            Status = "NotPresent"
            TaskName = $legacyTaskName
            TaskPath = $null
            Reason = "task_absent"
        }
    }

    $results = @()

    foreach ($legacyTask in $legacyTasks) {
        $disposition = Get-AiBosLegacySessionHelperDisposition `
            -Task $legacyTask `
            -InstallRoot $InstallRoot

        if (-not $disposition.Remove) {
            & $WriteLog (
                "Legacy Session Helper task preserved. " +
                "TaskName=$legacyTaskName TaskPath=$($legacyTask.TaskPath) " +
                "Reason=$($disposition.Reason)"
            )
            $results += [pscustomobject]@{
                Status = "Preserved"
                TaskName = $legacyTaskName
                TaskPath = $legacyTask.TaskPath
                Reason = $disposition.Reason
            }
            continue
        }

        Unregister-ScheduledTask `
            -TaskName $legacyTaskName `
            -TaskPath $legacyTask.TaskPath `
            -Confirm:$false `
            -ErrorAction Stop

        & $WriteLog (
            "Removed stale Session Helper task. " +
            "TaskName=$legacyTaskName TaskPath=$($legacyTask.TaskPath) " +
            "Reason=$($disposition.Reason)"
        )
        $results += [pscustomobject]@{
            Status = "Removed"
            TaskName = $legacyTaskName
            TaskPath = $legacyTask.TaskPath
            Reason = $disposition.Reason
        }
    }

    return $results
}
