[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

$assetRoot = $PSScriptRoot
$packagingRoot = Split-Path -Parent (Split-Path -Parent $assetRoot)
$iconRoot = Join-Path $packagingRoot "assets\icons"
$magick = (Get-Command magick -ErrorAction Stop).Source

function New-InstallerSidebar {
    param(
        [Parameter(Mandatory = $true)]
        [string]$LogoPath,

        [Parameter(Mandatory = $true)]
        [string]$OutputPath
    )

    & $magick `
        -size 164x314 "gradient:#FBFDFF-#EAF4FF" `
        -fill "#0078D4" -draw "rectangle 0,0 5,314" `
        -fill "#DDF0FF" -draw "circle 142,34 188,34" `
        -fill "#EDF7FF" -draw "circle 21,265 86,265" `
        -fill none -stroke "#B8DFFF" -strokewidth 1 `
        -draw "bezier 0,224 45,184 104,255 164,206" `
        -draw "bezier 0,237 52,197 111,267 164,219" `
        -draw "bezier 0,250 58,211 119,279 164,232" `
        -draw "bezier 0,263 64,224 126,291 164,245" `
        "(" $LogoPath -background none -resize "132x142>" ")" `
        -gravity north -geometry "+0+42" -composite `
        -fill "#0B2447" -font "Segoe-UI-Semibold" -pointsize 15 `
        -gravity south -annotate "+0+52" "ENTERPRISE AI" `
        -fill "#4F647D" -font "Segoe-UI" -pointsize 10 `
        -annotate "+0+35" "MANAGEMENT PLATFORM" `
        -alpha off -colorspace sRGB -depth 8 "BMP3:$OutputPath"

    if ($LASTEXITCODE -ne 0) {
        throw "ImageMagick failed to create $OutputPath"
    }
}

function New-InstallerHeader {
    param(
        [Parameter(Mandatory = $true)]
        [string]$LogoPath,

        [Parameter(Mandatory = $true)]
        [string]$OutputPath
    )

    & $magick `
        -size 150x57 xc:"#FFFFFF" `
        -fill "#F1F8FF" -draw "polygon 30,57 150,0 150,57" `
        -fill none -stroke "#C9E7FF" -strokewidth 1 `
        -draw "bezier 8,53 58,15 100,59 150,22" `
        -draw "bezier 26,57 73,22 113,57 150,31" `
        "(" $LogoPath -background none -resize "48x48>" ")" `
        -gravity east -geometry "+8+0" -composite `
        -alpha off -colorspace sRGB -depth 8 "BMP3:$OutputPath"

    if ($LASTEXITCODE -ne 0) {
        throw "ImageMagick failed to create $OutputPath"
    }
}

$products = @(
    @{
        Name = "admin"
        Logo = Join-Path $iconRoot "AI-BOS-Admin.png"
    },
    @{
        Name = "employee"
        Logo = Join-Path $iconRoot "AI-BOS-Employee.png"
    }
)

foreach ($product in $products) {
    New-InstallerSidebar `
        -LogoPath $product.Logo `
        -OutputPath (Join-Path $assetRoot "$($product.Name)-sidebar.bmp")
    New-InstallerHeader `
        -LogoPath $product.Logo `
        -OutputPath (Join-Path $assetRoot "$($product.Name)-header.bmp")
}

Write-Host "Generated AI BOS NSIS assets in $assetRoot"
