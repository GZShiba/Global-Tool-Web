# Generates public/og-cover.png (1200x630) using System.Drawing (Windows only).
# Brand: OmniToolify - dark rounded-card theme with the actual logo.

Add-Type -AssemblyName System.Drawing

Set-Location "C:\Web_Devlopment\OpenCode\Global Tool\gzx-assets-store"

$W = 1200; $H = 630
$bmp = New-Object System.Drawing.Bitmap($W, $H, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Background: near-black with a soft blue radial accent (matches app theme)
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
  (New-Object System.Drawing.Point(0,0)), (New-Object System.Drawing.Point($W,$H)),
  [System.Drawing.Color]::FromArgb(255, 10, 10, 10),
  [System.Drawing.Color]::FromArgb(255, 17, 22, 32))
$g.FillRectangle($brush, 0, 0, $W, $H)

# Subtle blue glow top-right
$glow = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 59, 130, 246))
$g.FillEllipse($glow, 820, -180, 640, 640)
$g.FillEllipse($glow, -120, 380, 480, 480)

# Logo (keep aspect, ~180px)
$logo = [System.Drawing.Image]::FromFile((Resolve-Path "public\OmniToolify_Icon.png"))
$logoSize = 170
$logoX = 90; $logoY = (($H - $logoSize) / 2)
$g.DrawImage($logo, $logoX, $logoY, $logoSize, $logoSize)

# Title text
$fontTitle = New-Object System.Drawing.Font("Segoe UI", 52, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$fontSub = New-Object System.Drawing.Font("Segoe UI", 26, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)

$white = [System.Drawing.Brushes]::White
$gray = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 176, 184, 198))

$textX = $logoX + $logoSize + 40
$titleRect = New-Object System.Drawing.RectangleF($textX, 200, ($W - $textX - 80), 130)
$subRect  = New-Object System.Drawing.RectangleF($textX, 350, ($W - $textX - 80), 90)

$g.DrawString("OmniToolify", $fontTitle, $white, $titleRect)
$g.DrawString("Discover and use online tools in one place", $fontSub, $gray, $subRect)

$g.Dispose()
$bmp.Save("public\og-cover.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()

Write-Output "OG cover written: public/og-cover.png"
