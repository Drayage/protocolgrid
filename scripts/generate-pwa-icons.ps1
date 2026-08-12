param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot "..\public")
)

Add-Type -AssemblyName System.Drawing

function New-ProtocolGridIcon([int]$Size, [string]$Path) {
  $bitmap = [System.Drawing.Bitmap]::new($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.ScaleTransform($Size / 512, $Size / 512)
    $background = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(3, 9, 11))
    $cyan = [System.Drawing.Color]::FromArgb(95, 246, 213)
    $red = [System.Drawing.Color]::FromArgb(255, 82, 103)
    $gridPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(34, 95, 246, 213), 2)
    $cyanPen = [System.Drawing.Pen]::new($cyan, 18)
    $redPen = [System.Drawing.Pen]::new($red, 12)
    $whitePen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(230, 241, 239), 30)
    try {
      $graphics.FillRectangle($background, 0, 0, 512, 512)
      for ($position = 72; $position -le 440; $position += 46) {
        $graphics.DrawLine($gridPen, $position, 52, $position, 460)
        $graphics.DrawLine($gridPen, 52, $position, 460, $position)
      }

      $cyanPen.StartCap = $cyanPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Square
      $redPen.StartCap = $redPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Square
      $whitePen.StartCap = $whitePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Square
      $graphics.DrawLines($cyanPen, [System.Drawing.Point[]]@(
        [System.Drawing.Point]::new(64, 132), [System.Drawing.Point]::new(64, 64),
        [System.Drawing.Point]::new(132, 64)
      ))
      $graphics.DrawLines($redPen, [System.Drawing.Point[]]@(
        [System.Drawing.Point]::new(380, 448), [System.Drawing.Point]::new(448, 448),
        [System.Drawing.Point]::new(448, 380)
      ))

      $graphics.DrawLines($whitePen, [System.Drawing.Point[]]@(
        [System.Drawing.Point]::new(352, 166), [System.Drawing.Point]::new(314, 128),
        [System.Drawing.Point]::new(198, 128), [System.Drawing.Point]::new(146, 180),
        [System.Drawing.Point]::new(146, 332), [System.Drawing.Point]::new(198, 384),
        [System.Drawing.Point]::new(328, 384), [System.Drawing.Point]::new(366, 346),
        [System.Drawing.Point]::new(366, 270), [System.Drawing.Point]::new(274, 270)
      ))

      $nodeBrush = [System.Drawing.SolidBrush]::new($cyan)
      $enemyBrush = [System.Drawing.SolidBrush]::new($red)
      try {
        $graphics.FillEllipse($nodeBrush, 116, 238, 34, 34)
        $graphics.FillEllipse($enemyBrush, 362, 238, 34, 34)
        $graphics.FillEllipse($nodeBrush, 242, 242, 28, 28)
      } finally {
        $nodeBrush.Dispose()
        $enemyBrush.Dispose()
      }
      $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $background.Dispose()
      $gridPen.Dispose()
      $cyanPen.Dispose()
      $redPen.Dispose()
      $whitePen.Dispose()
    }
  } finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

New-Item -ItemType Directory -Force -Path $OutputDirectory | Out-Null
New-ProtocolGridIcon 192 (Join-Path $OutputDirectory "pwa-icon-192.png")
New-ProtocolGridIcon 512 (Join-Path $OutputDirectory "pwa-icon-512.png")
