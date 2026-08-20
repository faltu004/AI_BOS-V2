param(
    [Parameter(Mandatory = $true)]
    [string]$InstallRoot
)

$ErrorActionPreference = "Stop"

$logRoot = Join-Path $env:ProgramData "AI BOS\InstallLogs"
$agentDataRoot = Join-Path $env:ProgramData "AI BOS\DeviceAgent"
$bootstrapEnrollmentPath = Join-Path $agentDataRoot ".bootstrap-enrollment.env"
$logPath = Join-Path $logRoot "employee-device-services-install.log"
$credentialMigrationScript = Join-Path $PSScriptRoot "device-credential-migration.ps1"

if (-not (Test-Path -LiteralPath $credentialMigrationScript -PathType Leaf)) {
    throw "Device credential migration helper was not found at $credentialMigrationScript."
}

. $credentialMigrationScript

function Write-InstallLog {
    param([string]$Message)
    New-Item -ItemType Directory -Force -Path $logRoot | Out-Null
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss.fff"
    Add-Content -LiteralPath $logPath -Value "[$timestamp] $Message"
}

function Assert-Admin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]::new($identity)
    if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
        throw "AI BOS Employee installer requires administrator elevation to install services."
    }
}

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,
        [Parameter(Mandatory = $true)]
        [string]$Description,
        [switch]$AllowFailure
    )

    Write-InstallLog "${Description}: $FilePath $($Arguments -join ' ')"
    $process = Start-Process -FilePath $FilePath -ArgumentList $Arguments -Wait -NoNewWindow -PassThru
    Write-InstallLog "$Description exit code: $($process.ExitCode)"

    if ($process.ExitCode -ne 0 -and -not $AllowFailure) {
        throw "$Description failed with exit code $($process.ExitCode). See $logPath."
    }

    return $process.ExitCode
}

function Assert-File {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path,
        [Parameter(Mandatory = $true)]
        [string]$Label
    )

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "$Label was not found at $Path."
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
    Write-InstallLog "${Description}: $icacls $($Arguments -join ' ')"
    $output = & $icacls @Arguments 2>&1
    $exitCode = $LASTEXITCODE

    foreach ($line in $output) {
        if ($null -ne $line -and "$line".Trim().Length -gt 0) {
            Write-InstallLog "${Description} output: $line"
        }
    }
    Write-InstallLog "$Description exit code: $exitCode"

    if ($exitCode -ne 0) {
        throw "$Description failed with exit code $exitCode. See $logPath."
    }
}

function Assert-ProtectedAgentAcl {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    $acl = Get-Acl -LiteralPath $Path
    if (-not $acl.AreAccessRulesProtected) {
        throw "DeviceAgent ACL inheritance is still enabled for $Path."
    }

    $requiredFullControlSids = @("S-1-5-18", "S-1-5-32-544")
    foreach ($sid in $requiredFullControlSids) {
        $matchingRules = $acl.Access | Where-Object {
            $_.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value -eq $sid -and
            $_.AccessControlType -eq [Security.AccessControl.AccessControlType]::Allow -and
            (($_.FileSystemRights -band [Security.AccessControl.FileSystemRights]::FullControl) -eq [Security.AccessControl.FileSystemRights]::FullControl)
        }

        if (-not $matchingRules) {
            throw "DeviceAgent ACL is missing FullControl for SID $sid."
        }
    }

    $disallowedReadSids = @("S-1-1-0", "S-1-5-11", "S-1-5-32-545")
    $readLikeRights = [Security.AccessControl.FileSystemRights]::ReadAndExecute -bor
        [Security.AccessControl.FileSystemRights]::Read -bor
        [Security.AccessControl.FileSystemRights]::ListDirectory
    foreach ($rule in $acl.Access) {
        $sid = $rule.IdentityReference.Translate([Security.Principal.SecurityIdentifier]).Value
        if ($disallowedReadSids -contains $sid -and
            $rule.AccessControlType -eq [Security.AccessControl.AccessControlType]::Allow -and
            (($rule.FileSystemRights -band $readLikeRights) -ne 0)) {
            throw "DeviceAgent ACL grants read-like access to disallowed SID $sid."
        }
    }
}

function Protect-BootstrapEnrollmentArtifact {
    if (-not (Test-Path -LiteralPath $bootstrapEnrollmentPath -PathType Leaf)) {
        Write-InstallLog "No protected bootstrap enrollment artifact was present."
        return
    }

    Invoke-IcaclsChecked -Arguments @(
        $bootstrapEnrollmentPath,
        "/inheritance:r",
        "/grant:r",
        "*S-1-5-18:F",
        "*S-1-5-32-544:F"
    ) -Description "Apply protected bootstrap enrollment ACL"

    Assert-ProtectedAgentAcl -Path $bootstrapEnrollmentPath
    Write-InstallLog "Bootstrap enrollment artifact ACL verified without logging credential contents."
}

function Protect-AgentData {
    New-Item -ItemType Directory -Force -Path $agentDataRoot | Out-Null
    Invoke-IcaclsChecked -Arguments @(
        $agentDataRoot,
        "/inheritance:r",
        "/grant:r",
        "*S-1-5-18:(OI)(CI)F",
        "*S-1-5-32-544:(OI)(CI)F"
    ) -Description "Apply protected DeviceAgent ACL"
    Assert-ProtectedAgentAcl -Path $agentDataRoot
    Protect-BootstrapEnrollmentArtifact
    Write-InstallLog "DeviceAgent ACL verified: inheritance disabled; SYSTEM and Administrators have FullControl; broad user read access absent."
}

function Install-WinSwService {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ServiceName,
        [Parameter(Mandatory = $true)]
        [string]$WrapperPath,
        [Parameter(Mandatory = $true)]
        [string]$XmlPath,
        [switch]$RequireRunning
    )

    Assert-File -Path $WrapperPath -Label "$ServiceName WinSW executable"
    Assert-File -Path $XmlPath -Label "$ServiceName WinSW XML"

    Invoke-Checked -FilePath $WrapperPath -Arguments @("stop") -Description "Stop $ServiceName" -AllowFailure | Out-Null
    Invoke-Checked -FilePath $WrapperPath -Arguments @("uninstall") -Description "Uninstall existing $ServiceName" -AllowFailure | Out-Null
    Invoke-Checked -FilePath $WrapperPath -Arguments @("install") -Description "Install $ServiceName" | Out-Null

    $service = Get-CimInstance Win32_Service -Filter "Name='$ServiceName'" -ErrorAction Stop
    if (-not $service) {
        throw "$ServiceName was not found after WinSW install."
    }
    if ($service.StartName -ne "LocalSystem") {
        throw "$ServiceName account is $($service.StartName), expected LocalSystem."
    }
    if ($service.StartMode -ne "Auto") {
        throw "$ServiceName StartMode is $($service.StartMode), expected Auto."
    }

    Invoke-Checked -FilePath $WrapperPath -Arguments @("start") -Description "Start $ServiceName" | Out-Null

    if ($RequireRunning) {
        $deadline = (Get-Date).AddSeconds(45)
        do {
            Start-Sleep -Seconds 2
            $service = Get-Service -Name $ServiceName -ErrorAction Stop
            if ($service.Status -eq "Running") {
                Write-InstallLog "$ServiceName verified Running."
                return
            }
        } while ((Get-Date) -lt $deadline)

        throw "$ServiceName did not reach Running state after install/start."
    }

    Write-InstallLog "$ServiceName installed. Runtime state check not required."
}

try {
    Assert-Admin
    Write-InstallLog "AI BOS Employee device service install started. InstallRoot=$InstallRoot"

    $agentRoot = Join-Path $InstallRoot "agent"
    $agentDist = Join-Path $agentRoot "dist"
    $runtimeNode = Join-Path $InstallRoot "runtime\node.exe"
    $serviceRoot = Join-Path $InstallRoot "service"
    $agentWrapper = Join-Path $serviceRoot "AIBOSDeviceAgent.exe"
    $agentXml = Join-Path $serviceRoot "AIBOSDeviceAgent.xml"
    $updaterWrapper = Join-Path $serviceRoot "AIBOSDeviceUpdater.exe"
    $updaterXml = Join-Path $serviceRoot "AIBOSDeviceUpdater.xml"

    Assert-File -Path $runtimeNode -Label "Bundled Node runtime"
    Assert-File -Path (Join-Path $agentDist "index.js") -Label "Compiled Device Agent entry point"
    Assert-File -Path (Join-Path $agentDist "updater-activation-engine.js") -Label "Compiled Device Updater entry point"
    if (-not (Test-Path -LiteralPath (Join-Path $agentRoot "node_modules") -PathType Container)) {
        throw "Device Agent node_modules folder was not found."
    }

    Protect-AgentData
    Invoke-AiBosLegacyCredentialMigration `
        -LegacyEnvPath "C:\AI-BOS\DeviceAgent\agent\.env" `
        -AgentDataRoot $agentDataRoot `
        -ProtectedEnvPath (Join-Path $agentDataRoot ".env") `
        -LogPath $logPath | Out-Null

    Install-WinSwService -ServiceName "AIBOSDeviceAgent" -WrapperPath $agentWrapper -XmlPath $agentXml -RequireRunning
    Install-WinSwService -ServiceName "AIBOSDeviceUpdater" -WrapperPath $updaterWrapper -XmlPath $updaterXml -RequireRunning

    Write-InstallLog "AI BOS Employee device service install completed successfully."
    exit 0
} catch {
    Write-InstallLog "FAILED: $($_.Exception.Message)"
    Write-Error $_.Exception.Message
    exit 1
}
