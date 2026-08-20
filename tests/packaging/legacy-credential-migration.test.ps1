$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$migrationScript = Join-Path $repoRoot "packaging\windows\device-credential-migration.ps1"
. $migrationScript

$testRoots = New-Object System.Collections.Generic.List[string]
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

function New-TestRoot {
    $root = Join-Path $env:TEMP ("AI BOS Legacy Migration Test " + [Guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Force -Path $root | Out-Null
    $testRoots.Add($root)
    return $root
}

function Write-Utf8NoBom {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $true)]
        [string]$Content
    )

    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Path) | Out-Null
    $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8NoBom)
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

try {
    $migrateRoot = New-TestRoot
    $legacyEnv = Join-Path $migrateRoot "Legacy Agent\agent\.env"
    $agentDataRoot = Join-Path $migrateRoot "Program Data\AI BOS\DeviceAgent"
    $protectedEnv = Join-Path $agentDataRoot ".env"
    $logPath = Join-Path $migrateRoot "logs\migration.log"
    $dummyDeviceId = "SIDHI-PC-04-DUMMY"
    $dummyToken = "aibos_device_dummy_migrated_token_12345"

    Write-Utf8NoBom -Path $legacyEnv -Content @"
BACKEND_URL=https://legacy.invalid:5443
HEARTBEAT_INTERVAL=30000
DEVICE_ID=$dummyDeviceId
DEVICE_TOKEN=$dummyToken
"@

    $result = Invoke-AiBosLegacyCredentialMigration `
        -LegacyEnvPath $legacyEnv `
        -AgentDataRoot $agentDataRoot `
        -ProtectedEnvPath $protectedEnv `
        -LogPath $logPath

    Assert-True -Condition ($result.LegacyDetected -eq $true -and $result.Status -eq "Migrated") -Message "Legacy env was not detected and migrated."
    Write-TestResult -Name "legacy env detected"

    Assert-AiBosCredentialAcl -Path $protectedEnv
    Write-TestResult -Name "ACL protected"

    Grant-CleanupAccess -Root $migrateRoot
    $migratedMap = Read-AiBosEnvMap -Path $protectedEnv
    Assert-True -Condition ($migratedMap["DEVICE_ID"] -eq $dummyDeviceId) -Message "DEVICE_ID was not migrated."
    Write-TestResult -Name "DEVICE_ID migrated"

    Assert-True -Condition ($migratedMap["DEVICE_TOKEN"] -eq $dummyToken) -Message "DEVICE_TOKEN was not migrated."
    Write-TestResult -Name "DEVICE_TOKEN migrated"

    Assert-True -Condition (Test-Path -LiteralPath $protectedEnv -PathType Leaf) -Message "ProgramData .env was not created."
    Write-TestResult -Name "ProgramData .env created"

    $logContent = Get-Content -LiteralPath $logPath -Raw
    Assert-True -Condition (-not $logContent.Contains($dummyToken)) -Message "Migration log leaked the dummy device token."
    Write-TestResult -Name "secret absent from logs"

    $preserveRoot = New-TestRoot
    $preserveLegacyEnv = Join-Path $preserveRoot "Legacy Agent\agent\.env"
    $preserveDataRoot = Join-Path $preserveRoot "Program Data\AI BOS\DeviceAgent"
    $preserveProtectedEnv = Join-Path $preserveDataRoot ".env"
    $preserveLogPath = Join-Path $preserveRoot "logs\migration.log"
    $existingToken = "aibos_device_existing_secure_token_67890"
    $legacyDifferentToken = "aibos_device_legacy_should_not_overwrite_67890"

    Write-Utf8NoBom -Path $preserveProtectedEnv -Content @"
DEVICE_ID=EXISTING-DEVICE
DEVICE_TOKEN=$existingToken
"@

    Write-Utf8NoBom -Path $preserveLegacyEnv -Content @"
DEVICE_ID=LEGACY-DEVICE
DEVICE_TOKEN=$legacyDifferentToken
"@

    $preserveResult = Invoke-AiBosLegacyCredentialMigration `
        -LegacyEnvPath $preserveLegacyEnv `
        -AgentDataRoot $preserveDataRoot `
        -ProtectedEnvPath $preserveProtectedEnv `
        -LogPath $preserveLogPath

    Assert-True -Condition ($preserveResult.Status -eq "PreservedExisting") -Message "Existing secure credential was not preserved."
    Grant-CleanupAccess -Root $preserveRoot
    $preservedMap = Read-AiBosEnvMap -Path $preserveProtectedEnv
    Assert-True -Condition ($preservedMap["DEVICE_ID"] -eq "EXISTING-DEVICE" -and $preservedMap["DEVICE_TOKEN"] -eq $existingToken) -Message "Existing secure credential was overwritten."
    Write-TestResult -Name "existing new credential preserved"
} finally {
    foreach ($root in $testRoots) {
        Grant-CleanupAccess -Root $root
        Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue
    }
}
