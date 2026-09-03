<#
.SYNOPSIS
  One-command deploy from this dev machine to the Main PC (D:\AI-BOS-Server), over
  PowerShell Remoting on the LAN. Mirrors the exact manual sequence that was already
  proven to work by hand: build, stage, stop task, backup, swap, start task,
  health-check retry loop, automatic rollback on failure.

.PARAMETER Target
  Which component to deploy: backend, admin, employee, or all.

.PARAMETER MainPcHost
  Hostname or IP of the Main PC. Defaults to ADMIN-WORKNAI.

.PARAMETER Credential
  Local admin credential for the Main PC. Prompted for if not supplied.

.EXAMPLE
  .\deploy-to-main-pc.ps1 -Target backend
  .\deploy-to-main-pc.ps1 -Target all -MainPcHost ADMIN-WORKNAI

.NOTES
  One-time setup required before first use. Summary:
    On the Main PC (elevated PowerShell):   Enable-PSRemoting -Force
    On THIS machine (elevated PowerShell):  Set-Item WSMan:\localhost\Client\TrustedHosts -Value "ADMIN-WORKNAI" -Force
  (TrustedHosts is only needed because these machines are on a workgroup, not a domain.)
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("backend", "admin", "employee", "all")]
    [string]$Target,

    [string]$MainPcHost = "ADMIN-WORKNAI",

    [pscredential]$Credential,

    [string]$HealthUrl = "https://ADMIN-WORKNAI:5443/health",

    [string]$BackendTaskName = "AI BOS Backend Server",

    [string]$MainPcServerRoot = "D:\AI-BOS-Server",

    [string]$MainPcDeployRoot = "D:\AI-BOS-Deploy"
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "=== $Message ===" -ForegroundColor Cyan
}

function Get-DeploySession {
    if (-not $Credential) {
        $Credential = Get-Credential -Message "Main PC admin credentials ($MainPcHost)"
    }
    return New-PSSession -ComputerName $MainPcHost -Credential $Credential
}

function Deploy-Backend {
    param($Session)

    Write-Step "Building backend"
    Push-Location (Join-Path $repoRoot "backend")
    try {
        npm run build
        if ($LASTEXITCODE -ne 0) { throw "backend build failed (exit $LASTEXITCODE)" }
    } finally {
        Pop-Location
    }

    $stamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $remoteStage = "$MainPcServerRoot\backend\dist_incoming_$stamp"
    $remoteProd = "$MainPcServerRoot\backend"
    $remoteBackup = "$MainPcServerRoot\backend\dist_rollback_$stamp"

    Write-Step "Copying backend/dist to Main PC (staged, not live yet)"
    Copy-Item -Path (Join-Path $repoRoot "backend\dist") -Destination $remoteStage -ToSession $Session -Recurse -Force

    Write-Step "Swapping in the new build with health-checked rollback"
    $result = Invoke-Command -Session $Session -ScriptBlock {
        param($TaskName, $ProdDir, $StageDir, $BackupDir, $Url)

        Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2

        Rename-Item "$ProdDir\dist" $BackupDir
        Rename-Item $StageDir "$ProdDir\dist"

        Start-ScheduledTask -TaskName $TaskName

        $healthy = $false
        for ($i = 1; $i -le 10; $i++) {
            Start-Sleep -Seconds 3
            try {
                $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
                if ($r.StatusCode -eq 200) { $healthy = $true; break }
            } catch {}
        }

        if ($healthy) {
            Remove-Item $BackupDir -Recurse -Force
            return @{ Success = $true }
        }

        # Roll back
        Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Remove-Item "$ProdDir\dist" -Recurse -Force
        Rename-Item $BackupDir "$ProdDir\dist"
        Start-ScheduledTask -TaskName $TaskName
        return @{ Success = $false }
    } -ArgumentList $BackendTaskName, $remoteProd, $remoteStage, $remoteBackup, $HealthUrl

    if ($result.Success) {
        Write-Host "Backend deployed and healthy." -ForegroundColor Green
    } else {
        Write-Host "Backend deploy FAILED health check - rolled back automatically to the previous build." -ForegroundColor Red
    }
}

function Deploy-DesktopApp {
    param($Session, [ValidateSet("admin", "employee")][string]$App)

    $prepareScript = if ($App -eq "admin") { "package:admin:prepare" } else { "package:employee:prepare" }
    $localInstallerDir = if ($App -eq "admin") { "admin-installer" } else { "employee-installer" }

    Write-Step "Building and packaging the $App installer"
    Push-Location $repoRoot
    try {
        npm run $prepareScript
        if ($LASTEXITCODE -ne 0) { throw "$App packaging failed (exit $LASTEXITCODE)" }
    } finally {
        Pop-Location
    }

    $installerExe = Get-ChildItem -Path (Join-Path $repoRoot "dist\$localInstallerDir") -Filter "*.exe" |
        Where-Object { $_.Name -notmatch "win-unpacked" } |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $installerExe) {
        throw "Could not find a built $App installer under dist\$localInstallerDir"
    }

    Write-Step "Copying $($installerExe.Name) to Main PC ($MainPcDeployRoot)"
    Invoke-Command -Session $Session -ScriptBlock {
        param($Dir)
        if (-not (Test-Path $Dir)) { New-Item -ItemType Directory -Path $Dir -Force | Out-Null }
    } -ArgumentList $MainPcDeployRoot

    Copy-Item -Path $installerExe.FullName -Destination "$MainPcDeployRoot\$($installerExe.Name)" -ToSession $Session -Force

    Write-Host "Copied. Installer is at $MainPcDeployRoot\$($installerExe.Name) on $MainPcHost." -ForegroundColor Green
    Write-Host "Run it there (or on the target workstation) to install - this script does not auto-install desktop apps." -ForegroundColor Yellow

    if ($App -eq "employee") {
        Write-Step "Publishing the auto-update feed (already-installed Employee apps pick this up automatically)"
        $feedDir = "$MainPcServerRoot\backend\employee-update-feed"
        $localFeedDir = Join-Path $repoRoot "dist\$localInstallerDir"

        Invoke-Command -Session $Session -ScriptBlock {
            param($Dir)
            if (-not (Test-Path $Dir)) { New-Item -ItemType Directory -Path $Dir -Force | Out-Null }
        } -ArgumentList $feedDir

        foreach ($name in @("latest.yml", $installerExe.Name, "$($installerExe.Name).blockmap")) {
            $localPath = Join-Path $localFeedDir $name
            if (Test-Path $localPath) {
                Copy-Item -Path $localPath -Destination "$feedDir\$name" -ToSession $Session -Force
            }
        }

        Write-Host "Feed published at $feedDir on $MainPcHost - installed Employee apps will pick it up within 4 hours (or on next launch)." -ForegroundColor Green
    }
}

$session = Get-DeploySession
try {
    switch ($Target) {
        "backend" { Deploy-Backend -Session $session }
        "admin" { Deploy-DesktopApp -Session $session -App "admin" }
        "employee" { Deploy-DesktopApp -Session $session -App "employee" }
        "all" {
            Deploy-Backend -Session $session
            Deploy-DesktopApp -Session $session -App "admin"
            Deploy-DesktopApp -Session $session -App "employee"
        }
    }
} finally {
    Remove-PSSession $session
}
