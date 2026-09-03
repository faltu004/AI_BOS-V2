<#
.SYNOPSIS
  Builds a Device Agent update release package (the zip format device-agent's own
  auto-updater expects) and prints everything needed to publish it. Does NOT touch
  the Main PC or any remote machine - purely local, produces a file plus instructions.

.DESCRIPTION
  Every installed Device Agent already polls the backend every 15 minutes for a
  newer version (see device-agent/src/agent-update-checker.ts) and self-updates
  automatically when the backend's AGENT_UPDATE_* env vars point at one. This
  script does the "build the release" half of that - it does not publish anything
  by itself. You still have to:
    1. Copy the produced zip to the Main PC (e.g. D:\AI-BOS-Server\update-repository\)
    2. Set the printed AGENT_UPDATE_* values in D:\AI-BOS-Server\.env
    3. Restart the backend service

.PARAMETER Mandatory
  Marks the release as mandatory (agents will not skip it). Defaults to $false.

.EXAMPLE
  # 1. Bump the version first:
  #    edit device-agent\package.json -> "version": "1.0.1"
  # 2. Then:
  .\publish-device-agent-update.ps1
#>

[CmdletBinding()]
param(
    [switch]$Mandatory
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$deviceAgentRoot = Join-Path $repoRoot "device-agent"

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "=== $Message ===" -ForegroundColor Cyan
}

$packageJsonPath = Join-Path $deviceAgentRoot "package.json"
$packageJson = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
$version = $packageJson.version

Write-Step "Building release for device-agent version $version"
Write-Host "(Make sure you already bumped device-agent\package.json's version before running this - the backend rejects a release that is not strictly newer than what agents currently have.)" -ForegroundColor Yellow

Write-Step "Building device-agent"
Push-Location $deviceAgentRoot
try {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw "device-agent build failed (exit $LASTEXITCODE)" }
} finally {
    Pop-Location
}

$stageRoot = Join-Path $repoRoot "dist\device-agent-update-stage"
if (Test-Path $stageRoot) { Remove-Item $stageRoot -Recurse -Force }
New-Item -ItemType Directory -Path $stageRoot -Force | Out-Null

Write-Step "Staging files into the agent/runtime/service layout the updater expects"

New-Item -ItemType Directory -Path (Join-Path $stageRoot "agent") -Force | Out-Null
Copy-Item -Path (Join-Path $deviceAgentRoot "dist") -Destination (Join-Path $stageRoot "agent\dist") -Recurse -Force
Copy-Item -Path $packageJsonPath -Destination (Join-Path $stageRoot "agent\package.json") -Force

$packageLockPath = Join-Path $deviceAgentRoot "package-lock.json"
if (Test-Path $packageLockPath) {
    Copy-Item -Path $packageLockPath -Destination (Join-Path $stageRoot "agent\package-lock.json") -Force
}

Write-Host "Copying node_modules (this is the slow part)..."
robocopy "$deviceAgentRoot\node_modules" "$stageRoot\agent\node_modules" /E /NFL /NDL /NJH /NJS /XF "*.env" "*.env.*" "*token*" "*secret*" /XD "test" "tests" | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed copying node_modules (exit $LASTEXITCODE)" }

New-Item -ItemType Directory -Path (Join-Path $stageRoot "runtime") -Force | Out-Null
Copy-Item -Path (Join-Path $repoRoot "packaging\runtime\node.exe") -Destination (Join-Path $stageRoot "runtime\node.exe") -Force

New-Item -ItemType Directory -Path (Join-Path $stageRoot "service") -Force | Out-Null
foreach ($name in @("AIBOSDeviceAgent.exe", "AIBOSDeviceAgent.xml", "AIBOSDeviceUpdater.exe", "AIBOSDeviceUpdater.xml")) {
    Copy-Item -Path (Join-Path $deviceAgentRoot "service\$name") -Destination (Join-Path $stageRoot "service\$name") -Force
}

Write-Step "Zipping release package"
$packageId = "aibos-agent-windows-x64-$version"
$zipPath = Join-Path $repoRoot "dist\$packageId.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

Compress-Archive -Path "$stageRoot\agent", "$stageRoot\runtime", "$stageRoot\service" -DestinationPath $zipPath -CompressionLevel Optimal

Remove-Item $stageRoot -Recurse -Force

Write-Step "Release package ready"
$fileInfo = Get-Item $zipPath
$sha256 = (Get-FileHash $zipPath -Algorithm SHA256).Hash.ToUpperInvariant()
$publishedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")

Write-Host ""
Write-Host "Package: $zipPath" -ForegroundColor Green
Write-Host "Size:    $($fileInfo.Length) bytes"
Write-Host "SHA256:  $sha256"
Write-Host ""
Write-Host "This does NOT publish anything yet. To actually roll it out, on the Main PC:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Copy $($fileInfo.Name) to D:\AI-BOS-Server\update-repository\"
Write-Host ""
Write-Host "2. In D:\AI-BOS-Server\.env, set:"
Write-Host "   AGENT_UPDATE_VERSION=$version"
Write-Host "   AGENT_UPDATE_SHA256=$sha256"
Write-Host "   AGENT_UPDATE_SIZE_BYTES=$($fileInfo.Length)"
Write-Host "   AGENT_UPDATE_PUBLISHED_AT=$publishedAt"
Write-Host "   AGENT_UPDATE_MANDATORY=$($Mandatory.IsPresent.ToString().ToLower())"
Write-Host "   AGENT_UPDATE_PACKAGE_FILE=D:\AI-BOS-Server\update-repository\$($fileInfo.Name)"
Write-Host ""
Write-Host "3. Restart the backend service ('AI BOS Backend Server')."
Write-Host ""
Write-Host "Every installed Device Agent will pick this up automatically within 15 minutes." -ForegroundColor Green
