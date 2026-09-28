$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Vibes Music Player - Uninstall" -ForegroundColor Cyan
Write-Host "  Windows Prerequisites Remover" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$ProjectDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$BinDir = Join-Path $ProjectDir "bin"

if (-not (Test-Path $BinDir)) {
    Write-Host "Nothing to uninstall - bin\ directory not found." -ForegroundColor Yellow
    exit 0
}

Write-Host "[1/3] Removing yt-dlp..." -ForegroundColor Yellow
$YtdlpFile = Join-Path $BinDir "yt-dlp.exe"
if (Test-Path $YtdlpFile) {
    Remove-Item $YtdlpFile -Force
    Write-Host "  Removed $YtdlpFile" -ForegroundColor Green
} else {
    Write-Host "  Not found, skipping" -ForegroundColor Gray
}
Write-Host ""

Write-Host "[2/3] Removing ffmpeg..." -ForegroundColor Yellow
foreach ($f in @("ffmpeg.exe", "ffprobe.exe")) {
    $FilePath = Join-Path $BinDir $f
    if (Test-Path $FilePath) {
        Remove-Item $FilePath -Force
        Write-Host "  Removed $FilePath" -ForegroundColor Green
    }
}
Write-Host ""

Write-Host "[3/3] Removing Node.js..." -ForegroundColor Yellow
$NodeDir = Join-Path $BinDir "node"
if (Test-Path $NodeDir) {
    Remove-Item -Recurse -Force $NodeDir
    Write-Host "  Removed $NodeDir\" -ForegroundColor Green
} else {
    Write-Host "  Not found, skipping" -ForegroundColor Gray
}
Write-Host ""

# Clean up empty bin dir
$Remaining = Get-ChildItem $BinDir -ErrorAction SilentlyContinue
if (-not $Remaining) {
    Remove-Item $BinDir -Force
    Write-Host "Removed empty bin\ directory" -ForegroundColor Green
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Uninstall complete!" -ForegroundColor Green
Write-Host ""
Write-Host "  Note: node_modules\ and .env" -ForegroundColor White
Write-Host "  were left untouched." -ForegroundColor White
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
