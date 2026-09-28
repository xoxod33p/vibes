$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Vibes Music Player - Setup" -ForegroundColor Cyan
Write-Host "  Windows Server Installer" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$ProjectDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$BinDir = Join-Path $ProjectDir "bin"
New-Item -ItemType Directory -Force -Path $BinDir | Out-Null

Write-Host "[1/4] Architecture: $env:PROCESSOR_ARCHITECTURE" -ForegroundColor Yellow
Write-Host ""

# Install Node.js
Write-Host "[2/4] Setting up Node.js..." -ForegroundColor Yellow
$NodePath = Get-Command node -ErrorAction SilentlyContinue
if ($NodePath) {
    Write-Host "  Already installed: $(node -v) at $($NodePath.Source)" -ForegroundColor Green
} else {
    $NodeIndex = Invoke-RestMethod -Uri "https://nodejs.org/dist/index.json" -UseBasicParsing
    $NodeVersion = ($NodeIndex | Where-Object { $_.lts } | Select-Object -First 1).version.TrimStart("v")
    $NodeZip = "node-v$NodeVersion-win-x64.zip"
    $NodeUrl = "https://nodejs.org/dist/v$NodeVersion/$NodeZip"
    $NodeDir = Join-Path $BinDir "node"

    Write-Host "  Downloading Node.js v$NodeVersion..." -ForegroundColor White
    Invoke-WebRequest -Uri $NodeUrl -OutFile (Join-Path $BinDir $NodeZip) -UseBasicParsing
    Expand-Archive -Path (Join-Path $BinDir $NodeZip) -DestinationPath $BinDir -Force
    if (Test-Path $NodeDir) { Remove-Item -Recurse -Force $NodeDir }
    Rename-Item (Join-Path $BinDir "node-v$NodeVersion-win-x64") $NodeDir
    Remove-Item (Join-Path $BinDir $NodeZip)

    $env:PATH = "$NodeDir;$env:PATH"
    Write-Host "  Installed: $(node -v) at $NodeDir\node.exe" -ForegroundColor Green
}
Write-Host ""

# Install ffmpeg
Write-Host "[3/4] Setting up ffmpeg..." -ForegroundColor Yellow
$FfmpegPath = Get-Command ffmpeg -ErrorAction SilentlyContinue
if ($FfmpegPath) {
    Write-Host "  Already installed at $($FfmpegPath.Source)" -ForegroundColor Green
} else {
    $FfmpegUrl = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
    $FfmpegZip = Join-Path $BinDir "ffmpeg.zip"

    Write-Host "  Downloading ffmpeg..." -ForegroundColor White
    Invoke-WebRequest -Uri $FfmpegUrl -OutFile $FfmpegZip -UseBasicParsing
    Expand-Archive -Path $FfmpegZip -DestinationPath $BinDir -Force

    $FfmpegExtracted = Get-ChildItem $BinDir -Directory -Filter "ffmpeg-*" | Select-Object -First 1
    Copy-Item (Join-Path $FfmpegExtracted.FullName "bin\ffmpeg.exe") $BinDir
    Copy-Item (Join-Path $FfmpegExtracted.FullName "bin\ffprobe.exe") $BinDir
    Remove-Item -Recurse -Force $FfmpegExtracted.FullName
    Remove-Item $FfmpegZip

    $env:PATH = "$BinDir;$env:PATH"
    Write-Host "  Installed at $BinDir\ffmpeg.exe" -ForegroundColor Green
}
Write-Host ""

# Install yt-dlp
Write-Host "[4/4] Setting up yt-dlp..." -ForegroundColor Yellow
$YtdlpPath = Get-Command yt-dlp -ErrorAction SilentlyContinue
if ($YtdlpPath) {
    Write-Host "  Already installed: $(yt-dlp --version) at $($YtdlpPath.Source)" -ForegroundColor Green
} else {
    $YtdlpUrl = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"

    Write-Host "  Downloading yt-dlp..." -ForegroundColor White
    Invoke-WebRequest -Uri $YtdlpUrl -OutFile (Join-Path $BinDir "yt-dlp.exe") -UseBasicParsing

    $env:PATH = "$BinDir;$env:PATH"
    $YtdlpVersion = & (Join-Path $BinDir "yt-dlp.exe") --version
    Write-Host "  Installed: $YtdlpVersion at $BinDir\yt-dlp.exe" -ForegroundColor Green
}
Write-Host ""

# Install npm dependencies
Write-Host "[+] Installing npm dependencies..." -ForegroundColor Yellow
Push-Location $ProjectDir
try { npm install } finally { Pop-Location }
Write-Host ""

# Setup .env
$EnvFile = Join-Path $ProjectDir ".env"
if (-not (Test-Path $EnvFile)) {
    $YtdlpFinal = if ($YtdlpPath) { $YtdlpPath.Source } else { Join-Path $BinDir "yt-dlp.exe" }
    $CookiesFinal = Join-Path $ProjectDir "cookies.txt"
    $Secret = -join ((1..64) | ForEach-Object { [char](Get-Random -Minimum 33 -Maximum 126) })

    @"
SESSION_SECRET=$Secret
YTDLP_PATH=$YtdlpFinal
COOKIES_PATH=$CookiesFinal
"@ | Set-Content $EnvFile -Encoding UTF8

    Write-Host "[+] Created .env with auto-detected paths" -ForegroundColor Yellow
} else {
    Write-Host "[+] .env already exists, skipping" -ForegroundColor Green
}

$FinalYtdlp = if ($YtdlpPath) { $YtdlpPath.Source } else { "$BinDir\yt-dlp.exe" }
$FinalFfmpeg = if ($FfmpegPath) { $FfmpegPath.Source } else { "$BinDir\ffmpeg.exe" }
$FinalNode = (Get-Command node -ErrorAction SilentlyContinue)?.Source ?? "not found"

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "  yt-dlp:  $FinalYtdlp" -ForegroundColor White
Write-Host "  ffmpeg:  $FinalFfmpeg" -ForegroundColor White
Write-Host "  node:    $FinalNode" -ForegroundColor White
Write-Host "  bin dir: $BinDir" -ForegroundColor White
Write-Host ""
Write-Host "  Run with: npm run dev" -ForegroundColor Yellow
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
