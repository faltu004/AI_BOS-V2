Option Explicit

Dim args, installRoot, nodeExe, helperScript, workingDir
Dim shell, command, exitCode

Set args = WScript.Arguments

If args.Count < 1 Then
    WScript.Quit 1
End If

installRoot = args(0)

nodeExe = installRoot & "\runtime\node.exe"
helperScript = installRoot & "\agent\dist\session-helper.js"
workingDir = installRoot & "\agent"

Set shell = CreateObject("WScript.Shell")
shell.CurrentDirectory = workingDir

command = Chr(34) & nodeExe & Chr(34) & _
          " --use-system-ca " & Chr(34) & helperScript & Chr(34)

' 0 = completely hidden
' True = wait until Session Helper exits
exitCode = shell.Run(command, 0, True)

WScript.Quit exitCode
