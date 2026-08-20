param(
    [string]$ApiBaseUrl = "https://ADMIN-WORKNAI:5443/api/v1",
    [Parameter(Mandatory = $true)]
    [string]$AccessTokenFile,
    [Parameter(Mandatory = $true)]
    [string]$OutputPath,
    [ValidateRange(1, 60)]
    [int]$TtlMinutes = 15
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Invoke-IcaclsChecked {
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,
        [Parameter(Mandatory = $true)]
        [string]$Description
    )

    $icacls = Join-Path $env:SystemRoot "System32\icacls.exe"
    $output = & $icacls @Arguments 2>&1
    $exitCode = $LASTEXITCODE

    if ($exitCode -ne 0) {
        throw "$Description failed with exit code $exitCode. $($output -join ' ')"
    }
}

function Protect-AdminPackage {
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
    ) -Description "Protect enrollment package ACL"
}

if (-not (Test-Path -LiteralPath $AccessTokenFile -PathType Leaf)) {
    throw "Admin access token file was not found at $AccessTokenFile."
}

$accessToken = (Get-Content -LiteralPath $AccessTokenFile -Raw).Trim()
if ([string]::IsNullOrWhiteSpace($accessToken)) {
    throw "Admin access token file is empty."
}

$normalizedApiBaseUrl = $ApiBaseUrl.TrimEnd("/")
$uri = "$normalizedApiBaseUrl/devices/enrollment-credentials"
$body = @{
    ttlMinutes = $TtlMinutes
} | ConvertTo-Json -Depth 3

$response = Invoke-RestMethod `
    -Method Post `
    -Uri $uri `
    -Headers @{
        Authorization = "Bearer $accessToken"
    } `
    -ContentType "application/json" `
    -Body $body

$enrollmentKey = "$($response.data.enrollmentKey)".Trim()
$expiresAt = "$($response.data.expiresAt)".Trim()

if (
    [string]::IsNullOrWhiteSpace($enrollmentKey) -or
    -not $enrollmentKey.StartsWith("aibos_enroll_ot_")
) {
    throw "Backend did not return a valid one-time enrollment credential."
}

$bootstrapContent = "DEVICE_ENROLLMENT_KEY=$enrollmentKey`r`n"
$payload = [Convert]::ToBase64String(
    [Text.Encoding]::UTF8.GetBytes($bootstrapContent)
)

$package = [ordered]@{
    schemaVersion = 1
    kind = "AI_BOS_DEVICE_ENROLLMENT_PACKAGE"
    secretType = "one-time-device-enrollment"
    reusable = $false
    createdAt = (Get-Date).ToUniversalTime().ToString("o")
    expiresAt = $expiresAt
    apiBaseUrl = $normalizedApiBaseUrl
    bootstrapEnvBase64 = $payload
}

$outputDirectory = Split-Path -Parent $OutputPath
if ($outputDirectory) {
    New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
}

$resolvedOutputPath = [System.IO.Path]::GetFullPath($OutputPath)
$temporaryPath = "$resolvedOutputPath.tmp-$([Guid]::NewGuid().ToString('N'))"

try {
    $package |
        ConvertTo-Json -Depth 5 |
        Set-Content -LiteralPath $temporaryPath -Encoding UTF8

    Move-Item -LiteralPath $temporaryPath -Destination $resolvedOutputPath -Force
    Protect-AdminPackage -Path $resolvedOutputPath
} catch {
    Remove-Item -LiteralPath $temporaryPath -Force -ErrorAction SilentlyContinue
    throw
}

Write-Output "AI BOS one-time device enrollment package created."
Write-Output "Path: $resolvedOutputPath"
Write-Output "ExpiresAt: $expiresAt"
Write-Output "Transfer this file securely to the target Employee PC and apply it with elevated PowerShell."
