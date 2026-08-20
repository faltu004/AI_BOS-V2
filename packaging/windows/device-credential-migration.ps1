Set-StrictMode -Version Latest

function Write-AiBosMigrationLog {
    param(
        [Parameter(Mandatory = $true)]
        [string]$LogPath,
        [Parameter(Mandatory = $true)]
        [string]$Message
    )

    $logRoot = Split-Path -Parent $LogPath
    if ($logRoot) {
        New-Item -ItemType Directory -Force -Path $logRoot | Out-Null
    }

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"
    Add-Content -LiteralPath $LogPath -Value "[$timestamp] $Message"
}

function Read-AiBosEnvMap {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $map = @{}
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        return $map
    }

    $content = Get-Content -LiteralPath $Path -Raw
    foreach ($line in ($content -split "\r?\n")) {
        if ($line.TrimStart().StartsWith("#")) {
            continue
        }

        if ($line -match "^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$") {
            $name = $matches[1]
            $value = $matches[2].Trim()

            if (
                ($value.StartsWith('"') -and $value.EndsWith('"')) -or
                ($value.StartsWith("'") -and $value.EndsWith("'"))
            ) {
                $value = $value.Substring(1, $value.Length - 2)
            }

            $map[$name] = $value
        }
    }

    return $map
}

function Test-AiBosCredentialValue {
    param(
        [AllowNull()][string]$DeviceId,
        [AllowNull()][string]$DeviceToken
    )

    if ([string]::IsNullOrWhiteSpace($DeviceId)) {
        return $false
    }

    if (
        $DeviceId.Contains("`r") -or
        $DeviceId.Contains("`n")
    ) {
        return $false
    }

    if ([string]::IsNullOrWhiteSpace($DeviceToken)) {
        return $false
    }

    if (
        $DeviceToken.Contains("`r") -or
        $DeviceToken.Contains("`n")
    ) {
        return $false
    }

    return $DeviceToken.StartsWith("aibos_device_") -and
        $DeviceToken.Length -gt "aibos_device_".Length
}

function Get-AiBosValidatedCredential {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        return $null
    }

    $envMap = Read-AiBosEnvMap -Path $Path
    $deviceId = "$($envMap["DEVICE_ID"])".Trim()
    $deviceToken = "$($envMap["DEVICE_TOKEN"])".Trim()

    if (-not (Test-AiBosCredentialValue -DeviceId $deviceId -DeviceToken $deviceToken)) {
        return $null
    }

    return [PSCustomObject]@{
        DeviceId = $deviceId
        DeviceToken = $deviceToken
    }
}

function Set-AiBosEnvLine {
    param(
        [Parameter(Mandatory = $true)]
        [AllowEmptyString()]
        [string]$Content,
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $true)]
        [string]$Value
    )

    if (
        [string]::IsNullOrWhiteSpace($Value) -or
        $Value.Contains("`r") -or
        $Value.Contains("`n")
    ) {
        throw "$Name contains an invalid value."
    }

    $newline = if ($Content.Contains("`r`n")) { "`r`n" } else { "`n" }
    $lines = if ($Content.Length -gt 0) { @($Content -split "\r?\n") } else { @() }
    $updated = New-Object System.Collections.Generic.List[string]
    $replaced = $false

    foreach ($line in $lines) {
        if ($line.TrimStart().StartsWith("$Name=")) {
            $updated.Add("$Name=$Value")
            $replaced = $true
        } else {
            $updated.Add($line)
        }
    }

    if (-not $replaced) {
        $updated.Add("$Name=$Value")
    }

    return [string]::Join($newline, $updated)
}

function Invoke-AiBosIcaclsChecked {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,
        [Parameter(Mandatory = $true)]
        [string]$Description,
        [Parameter(Mandatory = $true)]
        [string]$LogPath
    )

    $icacls = Join-Path $env:SystemRoot "System32\icacls.exe"
    Write-AiBosMigrationLog -LogPath $LogPath -Message "${Description}: $icacls $($Arguments -join ' ')"
    $output = & $icacls @Arguments 2>&1
    $exitCode = $LASTEXITCODE

    foreach ($line in $output) {
        if ($null -ne $line -and "$line".Trim().Length -gt 0) {
            Write-AiBosMigrationLog -LogPath $LogPath -Message "${Description} output: $line"
        }
    }

    Write-AiBosMigrationLog -LogPath $LogPath -Message "$Description exit code: $exitCode"
    if ($exitCode -ne 0) {
        throw "$Description failed with exit code $exitCode."
    }
}

function Assert-AiBosCredentialAcl {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $acl = Get-Acl -LiteralPath $Path
    if (-not $acl.AreAccessRulesProtected) {
        throw "Credential ACL inheritance is still enabled for $Path."
    }

    $requiredFullControlSids = @("S-1-5-18", "S-1-5-32-544")
    foreach ($sid in $requiredFullControlSids) {
        $matchingRules = $acl.Access | Where-Object {
            $_.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -eq $sid -and
            $_.AccessControlType -eq [Security.AccessControl.AccessControlType]::Allow -and
            (($_.FileSystemRights -band [Security.AccessControl.FileSystemRights]::FullControl) -eq [Security.AccessControl.FileSystemRights]::FullControl)
        }

        if (-not $matchingRules) {
            throw "Credential ACL is missing FullControl for SID $sid."
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
            throw "Credential ACL grants read-like access to disallowed SID $sid."
        }
    }
}

function Protect-AiBosCredentialFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $true)]
        [string]$LogPath
    )

    Invoke-AiBosIcaclsChecked -Arguments @(
        $Path,
        "/inheritance:r",
        "/grant:r",
        "*S-1-5-18:F",
        "*S-1-5-32-544:F"
    ) -Description "Apply protected DeviceAgent credential ACL" -LogPath $LogPath

    Assert-AiBosCredentialAcl -Path $Path
}

function Write-AiBosCredentialAtomically {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ProtectedEnvPath,
        [Parameter(Mandatory = $true)]
        [string]$Content,
        [Parameter(Mandatory = $true)]
        [string]$LogPath
    )

    $destinationRoot = Split-Path -Parent $ProtectedEnvPath
    New-Item -ItemType Directory -Force -Path $destinationRoot | Out-Null

    $temporaryPath = Join-Path $destinationRoot (".env.migration-$([Guid]::NewGuid().ToString('N')).tmp")
    $backupPath = Join-Path $destinationRoot (".env.migration-$([Guid]::NewGuid().ToString('N')).bak")

    try {
        $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
        [System.IO.File]::WriteAllText($temporaryPath, $Content, $utf8NoBom)

        if (Test-Path -LiteralPath $ProtectedEnvPath -PathType Leaf) {
            [System.IO.File]::Replace($temporaryPath, $ProtectedEnvPath, $backupPath, $true)
            Remove-Item -LiteralPath $backupPath -Force -ErrorAction SilentlyContinue
        } else {
            [System.IO.File]::Move($temporaryPath, $ProtectedEnvPath)
        }
    } catch {
        Remove-Item -LiteralPath $temporaryPath -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $backupPath -Force -ErrorAction SilentlyContinue
        throw
    }
}

function Invoke-AiBosLegacyCredentialMigration {
    param(
        [string]$LegacyEnvPath = "C:\AI-BOS\DeviceAgent\agent\.env",
        [string]$AgentDataRoot = (Join-Path $env:ProgramData "AI BOS\DeviceAgent"),
        [string]$ProtectedEnvPath = (Join-Path $AgentDataRoot ".env"),
        [string]$LogPath = (Join-Path (Join-Path $env:ProgramData "AI BOS\InstallLogs") "employee-device-services-install.log")
    )

    Write-AiBosMigrationLog -LogPath $LogPath -Message "Legacy DeviceAgent credential migration check started."

    $existingCredential = Get-AiBosValidatedCredential -Path $ProtectedEnvPath
    if ($null -ne $existingCredential) {
        Protect-AiBosCredentialFile -Path $ProtectedEnvPath -LogPath $LogPath
        Write-AiBosMigrationLog -LogPath $LogPath -Message "Secure ProgramData credential already exists; legacy credential migration skipped."
        return [PSCustomObject]@{
            Status = "PreservedExisting"
            Migrated = $false
            LegacyDetected = $false
            ProtectedEnvPath = $ProtectedEnvPath
        }
    }

    if (-not (Test-Path -LiteralPath $LegacyEnvPath -PathType Leaf)) {
        Write-AiBosMigrationLog -LogPath $LogPath -Message "Legacy DeviceAgent credential file was not present."
        return [PSCustomObject]@{
            Status = "LegacyMissing"
            Migrated = $false
            LegacyDetected = $false
            ProtectedEnvPath = $ProtectedEnvPath
        }
    }

    $legacyCredential = Get-AiBosValidatedCredential -Path $LegacyEnvPath
    if ($null -eq $legacyCredential) {
        Write-AiBosMigrationLog -LogPath $LogPath -Message "Legacy DeviceAgent credential file was present but did not contain a valid per-device credential."
        return [PSCustomObject]@{
            Status = "LegacyInvalid"
            Migrated = $false
            LegacyDetected = $true
            ProtectedEnvPath = $ProtectedEnvPath
        }
    }

    Write-AiBosMigrationLog -LogPath $LogPath -Message "Valid legacy DeviceAgent credential detected; migrating to protected ProgramData storage."

    $destinationContent = ""
    if (Test-Path -LiteralPath $ProtectedEnvPath -PathType Leaf) {
        $destinationContent = Get-Content -LiteralPath $ProtectedEnvPath -Raw
    }

    $updatedContent = Set-AiBosEnvLine -Content $destinationContent -Name "DEVICE_ID" -Value $legacyCredential.DeviceId
    $updatedContent = Set-AiBosEnvLine -Content $updatedContent -Name "DEVICE_TOKEN" -Value $legacyCredential.DeviceToken

    Write-AiBosCredentialAtomically -ProtectedEnvPath $ProtectedEnvPath -Content $updatedContent -LogPath $LogPath

    $verifiedCredential = Get-AiBosValidatedCredential -Path $ProtectedEnvPath
    if (
        $null -eq $verifiedCredential -or
        $verifiedCredential.DeviceId -ne $legacyCredential.DeviceId -or
        $verifiedCredential.DeviceToken -ne $legacyCredential.DeviceToken
    ) {
        throw "Migrated DeviceAgent credential could not be verified."
    }

    Protect-AiBosCredentialFile -Path $ProtectedEnvPath -LogPath $LogPath
    Write-AiBosMigrationLog -LogPath $LogPath -Message "Legacy DeviceAgent credential migrated and verified; legacy source file preserved."

    return [PSCustomObject]@{
        Status = "Migrated"
        Migrated = $true
        LegacyDetected = $true
        ProtectedEnvPath = $ProtectedEnvPath
    }
}
