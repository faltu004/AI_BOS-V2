param(
    [Parameter(Mandatory = $true)]
    [string]$InstallRoot
)

$ErrorActionPreference = "Stop"

$nodeExe = Join-Path $InstallRoot "runtime\node.exe"
$helperScript = Join-Path $InstallRoot "agent\dist\session-helper.js"
$workingDirectory = Join-Path $InstallRoot "agent"

if (-not (Test-Path -LiteralPath $nodeExe -PathType Leaf)) {
    throw "Bundled Node runtime not found: $nodeExe"
}

if (-not (Test-Path -LiteralPath $helperScript -PathType Leaf)) {
    throw "Session Helper script not found: $helperScript"
}

$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $nodeExe
$psi.Arguments = "--use-system-ca `"$helperScript`""
$psi.WorkingDirectory = $workingDirectory

$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true
$psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden

$process = New-Object System.Diagnostics.Process
$process.StartInfo = $psi

[void]$process.Start()

# Keep Scheduled Task alive while Session Helper is running.
$process.WaitForExit()

exit $process.ExitCode
