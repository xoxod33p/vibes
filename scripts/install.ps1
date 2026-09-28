Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Vibes Music Player - Setup" -ForegroundColor Cyan
Write-Host "  Windows Prerequisites Installer" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"

function Test-Command($cmd) {
    try { Get-Command $cmd -ErrorAction Stop | Out-Null; return $true }
    catch { return $false }
}

# Check for winget
$hasWinget = Test-Command "winget"
$hasChoco = Test-Command "choco"
$hasScoop = Test-Command "scoop"

if (-not $hasWinget -and -not $hasChoco -and -not $hasScoop) {
    Write-Host "ERROR: No package manager found. Install one of: winget, chocolatey, scoop" -ForegroundColor Red
    exit 1
}

if ($hasWinget) { $pkgMgr = "winget" }
elseif ($hasChoco) { $pkgMgr = "choco" }
else { $pkgMgr = "scoop" }

Write-Host "[1/4] Detected package manager: $pkgMgr" -ForegroundColor Yellow
Write-Host ""

# Install Node.js
Write-Host "[2/4] Checking Node.js..." -ForegroundColor Yellow
if (Test-Command "node") {
    Write-Host "  Node.js $(node -v) already installed" -ForegroundColor Green
} else {
    Write-Host "  Installing Node.js..." -ForegroundColor White
    switch ($pkgMgr) {
        "winget" { winget install --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements }
        "choco"  { choco install nodejs-lts -y }
        "scoop"  { scoop install nodejs-lts }
    }
    Write-Host "  Node.js installed (restart terminal to use)" -ForegroundColor Green
}
Write-Host ""

# Install ffmpeg
Write-Host "[3/4] Checking ffmpeg..." -ForegroundColor Yellow
if (Test-Command "ffmpeg") {
    Write-Host "  ffmpeg already installed" -ForegroundColor Green
} else {
    Write-Host "  Installing ffmpeg..." -ForegroundColor White
    switch ($pkgMgr) {
        "winget" { winget install --id Gyan.FFmpeg --accept-source-agreements --accept-package-agreements }
        "choco"  { choco install ffmpeg -y }
        "scoop"  { scoop install ffmpeg }
    }
    Write-Host "  ffmpeg installed" -ForegroundColor Green
}
Write-Host ""

# Install yt-dlp
Write-Host "[4/4] Checking yt-dlp..." -ForegroundColor Yellow
if (Test-Command "yt-dlp") {
    Write-Host "  yt-dlp already installed: $(yt-dlp --version)" -ForegroundColor Green
} else {
    Write-Host "  Installing yt-dlp..." -ForegroundColor White
    switch ($pkgMgr) {
        "winget" { winget install --id yt-dlp.yt-dlp --accept-source-agreements --accept-package-agreements }
        "choco"  { choco install yt-dlp -y }
        "scoop"  { scoop install yt-dlp }
    }
    Write-Host "  yt-dlp installed" -ForegroundColor Green
}
Write-Host ""

# Install npm dependencies
Write-Host "[+] Installing npm dependencies..." -ForegroundColor Yellow
Push-Location (Join-Path $PSScriptRoot "..")
try {
    npm install
} finally {
    Pop-Location
}
Write-Host ""

# Copy .env.example if no .env exists
$projectRoot = Join-Path $PSScriptRoot ".."
$envFile = Join-Path $projectRoot ".env"
$envExample = Join-Path $projectRoot ".env.example"

if (-not (Test-Path $envFile)) {
    Copy-Item $envExample $envFile
    Write-Host "[+] Created .env from .env.example - fill in your values" -ForegroundColor Yellow
} else {
    Write-Host "[+] .env already exists, skipping" -ForegroundColor Green
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Setup complete!" -ForegroundColor Green
Write-Host ""

$ytdlpPath = (Get-Command yt-dlp -ErrorAction SilentlyContinue)?.Source
$ffmpegPath = (Get-Command ffmpeg -ErrorAction SilentlyContinue)?.Source
$nodePath = (Get-Command node -ErrorAction SilentlyContinue)?.Source

Write-Host "  yt-dlp:  $($ytdlpPath ?? 'not found (restart terminal)')" -ForegroundColor White
Write-Host "  ffmpeg:  $($ffmpegPath ?? 'not found (restart terminal)')" -ForegroundColor White
Write-Host "  node:    $($nodePath ?? 'not found (restart terminal)')" -ForegroundColor White
Write-Host ""
Write-Host "  Set your env vars in .env:" -ForegroundColor Yellow
Write-Host "    YTDLP_PATH=$($ytdlpPath ?? 'C:\path\to\yt-dlp.exe')" -ForegroundColor White
Write-Host "    COOKIES_PATH=C:\path\to\cookies.txt" -ForegroundColor White
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
