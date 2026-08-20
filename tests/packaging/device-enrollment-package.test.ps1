$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$installScript = Join-Path $repoRoot "packaging\windows\provisioning\Install-AiBosDeviceEnrollmentPackage.ps1"
$testRoot = Join-Path $env:TEMP ("AI BOS Enrollment Package Test " + [Guid]::NewGuid().ToString("N"))
$icacls = Join-Path $env:SystemRoot "System32\icacls.exe"
$currentSid = [Security.Principal.WindowsIdentity]::GetCurrent().User.Value

function Write-TestResult {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    Write-Output "$Name PASS"
}

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

function Grant-CleanupAccess {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Root
    )

    if (-not (Test-Path -LiteralPath $Root)) {
        return
    }

    & $icacls $Root "/grant:r" "*$($currentSid):(OI)(CI)F" | Out-Null
    Get-ChildItem -LiteralPath $Root -Force -Recurse -ErrorAction SilentlyContinue | ForEach-Object {
        if ($_.PSIsContainer) {
            & $icacls $_.FullName "/grant:r" "*$($currentSid):(OI)(CI)F" | Out-Null
        } else {
            & $icacls $_.FullName "/grant:r" "*$($currentSid):F" | Out-Null
        }
    }
}

function Assert-ProtectedAcl {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $acl = Get-Acl -LiteralPath $Path
    Assert-True -Condition $acl.AreAccessRulesProtected -Message "ACL inheritance is enabled for $Path."

    foreach ($sid in @("S-1-5-18", "S-1-5-32-544")) {
        $matchingRules = $acl.Access | Where-Object {
            $_.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -eq $sid -and
            $_.AccessControlType -eq [Security.AccessControl.AccessControlType]::Allow -and
            (($_.FileSystemRights -band [Security.AccessControl.FileSystemRights]::FullControl) -eq [Security.AccessControl.FileSystemRights]::FullControl)
        }

        Assert-True -Condition ([bool]$matchingRules) -Message "Missing FullControl for $sid."
    }

    foreach ($rule in $acl.Access) {
        $sid = $rule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value
        $readLikeRights = [Security.AccessControl.FileSystemRights]::ReadAndExecute -bor
            [Security.AccessControl.FileSystemRights]::Read -bor
            [Security.AccessControl.FileSystemRights]::ListDirectory

        if (
            @("S-1-1-0", "S-1-5-11", "S-1-5-32-545") -contains $sid -and
            $rule.AccessControlType -eq [Security.AccessControl.AccessControlType]::Allow -and
            (($rule.FileSystemRights -band $readLikeRights) -ne 0)
        ) {
            throw "ACL grants read-like access to disallowed SID $sid."
        }
    }
}

function Assert-ProtectedOrInaccessible {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    try {
        $exists = Test-Path -LiteralPath $Path -PathType Leaf
        Assert-True -Condition $exists -Message "Bootstrap artifact was not created."
        Assert-ProtectedAcl -Path $Path
    } catch [System.UnauthorizedAccessException] {
        return
    }
}

try {
    New-Item -ItemType Directory -Force -Path $testRoot | Out-Null

    $secret = "aibos_enroll_ot_dummyOneTimeSecret123"
    $bootstrapContent = "DEVICE_ENROLLMENT_KEY=$secret`r`n"
    $packagePath = Join-Path $testRoot "aibos-device-enrollment-package.json"
    $agentDataRoot = Join-Path $testRoot "Program Data\AI BOS\DeviceAgent"
    $logRoot = Join-Path $testRoot "Program Data\AI BOS\InstallLogs"
    $bootstrapPath = Join-Path $agentDataRoot ".bootstrap-enrollment.env"

    $package = [ordered]@{
        schemaVersion = 1
        kind = "AI_BOS_DEVICE_ENROLLMENT_PACKAGE"
        secretType = "one-time-device-enrollment"
        reusable = $false
        createdAt = "2026-08-18T00:00:00.0000000Z"
        expiresAt = "2026-08-18T00:15:00.0000000Z"
        apiBaseUrl = "https://ADMIN-WORKNAI:5443/api/v1"
        bootstrapEnvBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($bootstrapContent))
    }

    $package | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $packagePath -Encoding UTF8

    $packageText = Get-Content -LiteralPath $packagePath -Raw
    $packageJson = $packageText | ConvertFrom-Json
    Assert-True -Condition (-not $packageText.Contains("SERVICE_API_KEY")) -Message "Package contains SERVICE_API_KEY."
    Assert-True -Condition (-not $packageText.Contains("DEVICE_TOKEN")) -Message "Package contains DEVICE_TOKEN."
    Assert-True -Condition ($packageJson.reusable -eq $false) -Message "Package is not marked one-time."
    Write-TestResult -Name "bootstrap package contains no reusable secret"

    powershell.exe -NoProfile -ExecutionPolicy Bypass -File $installScript `
        -PackagePath $packagePath `
        -AgentDataRoot $agentDataRoot `
        -LogRoot $logRoot `
        -NoRestartService `
        -AllowNonAdminForTest | Out-Null

    Assert-ProtectedOrInaccessible -Path $bootstrapPath
    Write-TestResult -Name "target ACL protected"

    Grant-CleanupAccess -Root $testRoot
    $installedContent = Get-Content -LiteralPath $bootstrapPath -Raw
    Assert-True -Condition ($installedContent -eq $bootstrapContent) -Message "Bootstrap artifact content mismatch."

    $logPath = Join-Path $logRoot "employee-device-enrollment-provisioning.log"
    if (Test-Path -LiteralPath $logPath -PathType Leaf) {
        $logContent = Get-Content -LiteralPath $logPath -Raw
        Assert-True -Condition (-not $logContent.Contains($secret)) -Message "Provisioning log leaked the one-time secret."
    }
    Write-TestResult -Name "secrets absent from logs"
} finally {
    Grant-CleanupAccess -Root $testRoot
    Remove-Item -LiteralPath $testRoot -Recurse -Force -ErrorAction SilentlyContinue
}
