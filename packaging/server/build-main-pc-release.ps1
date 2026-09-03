[CmdletBinding()]
param(
    [string]$ReleaseName = "AI-BOS-MainPC-Deploy-20260829-FINAL.zip"
)

$ErrorActionPreference = "Stop"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$distRoot = Join-Path $repoRoot "dist"
$backendDist = Join-Path $repoRoot "backend\dist"
$stageRoot = Join-Path $distRoot ".main-pc-release-stage-$PID"
$zipPath = Join-Path $distRoot $ReleaseName

if ($ReleaseName -eq "AI-BOS-MainPC-Deploy-LATEST.zip") {
    throw "This release flow does not overwrite the LATEST archive. Use a versioned or FINAL filename."
}
if (-not (Test-Path -LiteralPath $backendDist -PathType Container)) {
    throw "backend\dist is missing. Build the backend first."
}

$environmentFiles = Get-ChildItem -LiteralPath $backendDist -Recurse -Force -File | Where-Object {
    $_.Name -eq ".env" -or $_.Name -like ".env.*"
}
if ($environmentFiles) {
    throw "backend\dist contains environment files and cannot be packaged."
}

$adminInstaller = Get-ChildItem -LiteralPath (Join-Path $distRoot "admin-installer") -File -Filter "AI-BOS-Admin-Setup-*.exe" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
$employeeInstaller = Get-ChildItem -LiteralPath (Join-Path $distRoot "employee-installer") -File -Filter "AI-BOS-Employee-Setup-*.exe" |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if (-not $adminInstaller) { throw "Admin installer not found under dist\admin-installer." }
if (-not $employeeInstaller) { throw "Employee installer not found under dist\employee-installer." }

$setupScript = Join-Path $PSScriptRoot "setup-main-pc-from-zip.ps1"
$readme = Join-Path $PSScriptRoot "README_INSTRUCTIONS.txt"
if (-not (Test-Path -LiteralPath $setupScript -PathType Leaf)) { throw "Setup script is missing." }
if (-not (Test-Path -LiteralPath $readme -PathType Leaf)) { throw "Release README is missing." }

if (Test-Path -LiteralPath $stageRoot) {
    Remove-Item -LiteralPath $stageRoot -Recurse -Force
}

try {
    New-Item -ItemType Directory -Path $stageRoot -Force | Out-Null
    Copy-Item -LiteralPath $backendDist -Destination (Join-Path $stageRoot "backend-dist") -Recurse
    Copy-Item -LiteralPath $adminInstaller.FullName -Destination $stageRoot
    Copy-Item -LiteralPath $employeeInstaller.FullName -Destination $stageRoot
    Copy-Item -LiteralPath $setupScript -Destination $stageRoot
    Copy-Item -LiteralPath $readme -Destination $stageRoot

    if (Test-Path -LiteralPath $zipPath -PathType Leaf) {
        Write-Host "Replacing requested FINAL archive: $zipPath" -ForegroundColor Yellow
        Remove-Item -LiteralPath $zipPath -Force
    }

    Compress-Archive -Path (Join-Path $stageRoot "*") -DestinationPath $zipPath -CompressionLevel Optimal
} finally {
    if (Test-Path -LiteralPath $stageRoot) {
        Remove-Item -LiteralPath $stageRoot -Recurse -Force
    }
}

$hash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToUpperInvariant()
$info = Get-Item -LiteralPath $zipPath
Write-Host "Release ZIP: $($info.FullName)" -ForegroundColor Green
Write-Host "Timestamp:   $($info.LastWriteTime.ToString('yyyy-MM-dd HH:mm:ss zzz'))"
Write-Host "Size:        $($info.Length) bytes"
Write-Host "SHA256:      $hash"
