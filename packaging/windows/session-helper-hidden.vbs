Option Explicit

Const RetryDelayMilliseconds = 15000

Dim args, installRoot, nodeExe, helperScript, workingDir
Dim shell, command, exitCode, launchError

Set args = WScript.Arguments

If args.Count < 1 Then
    WScript.Quit 1
End If

installRoot = args(0)

nodeExe = installRoot & "\runtime\node.exe"
helperScript = installRoot & "\agent\dist\session-helper.js"
workingDir = installRoot & "\agent"

Set shell = CreateObject("WScript.Shell")

command = Chr(34) & nodeExe & Chr(34) & _
          " --use-system-ca " & Chr(34) & helperScript & Chr(34)

' Keep this wscript process as the hidden supervisor. A transient logon-time
' failure (files briefly unavailable, backend startup ordering, or a helper
' crash) must not leave the scheduled task Ready with no helper process.
Do
    exitCode = 1
    launchError = 0

    On Error Resume Next
    Err.Clear

    shell.CurrentDirectory = workingDir

    If Err.Number = 0 Then
        ' 0 = completely hidden
        ' True = wait until Session Helper exits
        exitCode = shell.Run(command, 0, True)
    End If

    launchError = Err.Number
    Err.Clear
    On Error GoTo 0

    ' Exit cleanly only when the helper did. Nonzero exits and launch errors
    ' are retried for the lifetime of the interactive logon task.
    If launchError = 0 And exitCode = 0 Then
        WScript.Quit 0
    End If

    WScript.Sleep RetryDelayMilliseconds
Loop
