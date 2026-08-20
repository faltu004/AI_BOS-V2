param(
    [Parameter(Mandatory = $true)]
    [string]$PackagePath,
    [string]$AgentDataRoot = (Join-Path $env:ProgramData "AI BOS\DeviceAgent"),
    [string]$LogRoot = (Join-Path $env:ProgramData "AI BOS\InstallLogs"),
    [switch]$NoRestartService,
    [switch]$AllowNonAdminForTest
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$logPath = Join-Path $LogRoot "employee-device-enrollment-provisioning.log"
$bootstrapPath = Join-Path $AgentDataRoot ".bootstrap-enrollment.env"

function Write-ProvisioningLog {
    param([string]$Message)
    New-Item -ItemType Directory -Force -Path $logRoot | Out-Null
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"
    Add-Content -LiteralPath $logPath -Value "[$timestamp] $Message"
}

function Assert-Admin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    if (
        -not $AllowNonAdminForTest -and
        -not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    ) {
        throw "AI BOS enrollment provisioning requires elevated PowerShell."
    }
}

function Invoke-IcaclsChecked {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,
        [Parameter(Mandatory = $true)]
        [string]$Description
    )

    $icacls = Join-Path $env:SystemRoot "System32\icacls.exe"
    Write-ProvisioningLog "${Description}: $icacls $($Arguments -join ' ')"
    $output = & $icacls @Arguments 2>&1
    $exitCode = $LASTEXITCODE

    foreach ($line in $output) {
        if ($null -ne $line -and "$line".Trim().Length -gt 0) {
            Write-ProvisioningLog "${Description} output: $line"
        }
    }

    Write-ProvisioningLog "$Description exit code: $exitCode"
    if ($exitCode -ne 0) {
        throw "$Description failed with exit code $exitCode."
    }
}

function Assert-ProtectedAcl {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $acl = Get-Acl -LiteralPath $Path
    if (-not $acl.AreAccessRulesProtected) {
        throw "ACL inheritance is still enabled for $Path."
    }

    $requiredFullControlSids = @("S-1-5-18", "S-1-5-32-544")
    foreach ($sid in $requiredFullControlSids) {
        $matchingRules = $acl.Access | Where-Object {
            $_.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -eq $sid -and
            $_.AccessControlType -eq [Security.AccessControl.AccessControlType]::Allow -and
            (($_.FileSystemRights -band [Security.AccessControl.FileSystemRights]::FullControl) -eq [Security.AccessControl.FileSystemRights]::FullControl)
        }

        if (-not $matchingRules) {
            throw "ACL is missing FullControl for SID $sid."
        }
    }

    $disallowedReadSids = @("S-1-1-0", "S-1-5-11", "S-1-5-32-545")
    $readLikeRights = [Security.AccessControl.FileSystemRights]::ReadAndExecute -bor
        [Security.AccessControl.FileSystemRights]::Read -bor
        [Security.AccessControl.FileSystemRights]::ListDirectory

    foreach ($rule in $acl.Access) {
        $sid = $rule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value
        if (
            $disallowedReadSids -contains $sid -and
            $rule.AccessControlType -eq [Security.AccessControl.AccessControlType]::Allow -and
            (($rule.FileSystemRights -band $readLikeRights) -ne 0)
        ) {
            throw "ACL grants read-like access to disallowed SID $sid."
        }
    }
}

function Protect-AgentDataRoot {
    New-Item -ItemType Directory -Force -Path $AgentDataRoot | Out-Null
    Invoke-IcaclsChecked -Arguments @(
        $AgentDataRoot,
        "/inheritance:r",
        "/grant:r",
        "*S-1-5-18:(OI)(CI)F",
        "*S-1-5-32-544:(OI)(CI)F"
    ) -Description "Apply protected DeviceAgent root ACL"
    Assert-ProtectedAcl -Path $AgentDataRoot
}

function Protect-BootstrapFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    Invoke-IcaclsChecked -Arguments @(
        $Path,
        "/inheritance:r",
        "/grant:r",
        "*S-1-5-18:F",
        "*S-1-5-32-544:F"
    ) -Description "Apply protected bootstrap enrollment ACL"
    Assert-ProtectedAcl -Path $Path
}

function Get-BootstrapContent {
    param(
        [Parameter(Mandatory = $true)]
        $Package
    )

    if (
        $Package.kind -ne "AI_BOS_DEVICE_ENROLLMENT_PACKAGE" -or
        $Package.reusable -ne $false -or
        [string]::IsNullOrWhiteSpace("$($Package.bootstrapEnvBase64)")
    ) {
        throw "Invalid AI BOS enrollment package."
    }

    $bytes = [Convert]::FromBase64String("$($Package.bootstrapEnvBase64)")
    $content = [Text.Encoding]::UTF8.GetString($bytes)

    if ($content -notmatch "^DEVICE_ENROLLMENT_KEY=aibos_enroll_ot_[A-Za-z0-9_-]+`r?`n?$") {
        throw "Enrollment package payload is invalid."
    }

    return $content
}

function Restart-AgentServiceIfPresent {
    if ($NoRestartService) {
        Write-ProvisioningLog "Service restart skipped by caller."
        return
    }

    $service = Get-Service -Name "AIBOSDeviceAgent" -ErrorAction SilentlyContinue
    if ($null -eq $service) {
        Write-ProvisioningLog "AIBOSDeviceAgent service not present; bootstrap artifact installed for next service start."
        return
    }

    if ($service.Status -eq "Running") {
        Restart-Service -Name "AIBOSDeviceAgent" -Force -ErrorAction Stop
        Write-ProvisioningLog "AIBOSDeviceAgent restarted after bootstrap provisioning."
        return
    }

    Start-Service -Name "AIBOSDeviceAgent" -ErrorAction Stop
    Write-ProvisioningLog "AIBOSDeviceAgent started after bootstrap provisioning."
}

try {
    Assert-Admin
    Write-ProvisioningLog "AI BOS device enrollment provisioning started. PackagePath=$PackagePath"

    if (-not (Test-Path -LiteralPath $PackagePath -PathType Leaf)) {
        throw "Provisioning package was not found at $PackagePath."
    }

    $package = Get-Content -LiteralPath $PackagePath -Raw | ConvertFrom-Json
    $bootstrapContent = Get-BootstrapContent -Package $package

    if ($AllowNonAdminForTest) {
        New-Item -ItemType Directory -Force -Path $AgentDataRoot | Out-Null
    } else {
        Protect-AgentDataRoot
    }

    $temporaryPath = Join-Path $AgentDataRoot (".bootstrap-enrollment.env.$([Guid]::NewGuid().ToString('N')).tmp")
    try {
        $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
        [System.IO.File]::WriteAllText($temporaryPath, $bootstrapContent, $utf8NoBom)
        Move-Item -LiteralPath $temporaryPath -Destination $bootstrapPath -Force
        Protect-BootstrapFile -Path $bootstrapPath
        if ($AllowNonAdminForTest) {
            Protect-AgentDataRoot
        }
    } catch {
        Remove-Item -LiteralPath $temporaryPath -Force -ErrorAction SilentlyContinue
        throw
    }

    Write-ProvisioningLog "Bootstrap enrollment artifact installed and ACL verified without logging secret contents."
    Restart-AgentServiceIfPresent
    Write-ProvisioningLog "AI BOS device enrollment provisioning completed successfully."

    Write-Output "AI BOS device enrollment package installed."
    Write-Output "Bootstrap artifact: $bootstrapPath"
    Write-Output "AIBOSDeviceAgent will consume it during secure enrollment."
    exit 0
} catch {
    Write-ProvisioningLog "FAILED: $($_.Exception.Message)"
    Write-Error $_.Exception.Message
    exit 1
}
