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

Write-Host "[1/5] Architecture: $env:PROCESSOR_ARCHITECTURE" -ForegroundColor Yellow
Write-Host ""

# ── Node.js ───────────────────────────────────────────────────────────────────
Write-Host "[2/5] Setting up Node.js..." -ForegroundColor Yellow
$NodeDir = Join-Path $BinDir "node"
$NodeInBin = Join-Path $NodeDir "node.exe"
$NodeCmd = Get-Command node -ErrorAction SilentlyContinue

if ($NodeCmd) {
    $NodeInstalled = $true
    Write-Host "  Already installed: $(node -v) at $($NodeCmd.Source)" -ForegroundColor Green
} elseif (Test-Path $NodeInBin) {
    $NodeInstalled = $true
    $env:PATH = "$NodeDir;$env:PATH"
    Write-Host "  Already installed: $(& $NodeInBin -v) at $NodeInBin" -ForegroundColor Green
} else {
    $NodeInstalled = $false
    $NodeIndex = Invoke-RestMethod -Uri "https://nodejs.org/dist/index.json" -UseBasicParsing
    $NodeVersion = ($NodeIndex | Where-Object { $_.lts } | Select-Object -First 1).version.TrimStart("v")
    $NodeZip = "node-v$NodeVersion-win-x64.zip"
    $NodeUrl = "https://nodejs.org/dist/v$NodeVersion/$NodeZip"

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

# ── ffmpeg ────────────────────────────────────────────────────────────────────
Write-Host "[3/5] Setting up ffmpeg..." -ForegroundColor Yellow
$FfmpegInBin = Join-Path $BinDir "ffmpeg.exe"
$FfmpegCmd = Get-Command ffmpeg -ErrorAction SilentlyContinue

if ($FfmpegCmd) {
    $FfmpegInstalled = $true
    $FfmpegFinalPath = $FfmpegCmd.Source
    Write-Host "  Already installed at $FfmpegFinalPath" -ForegroundColor Green
} elseif (Test-Path $FfmpegInBin) {
    $FfmpegInstalled = $true
    $FfmpegFinalPath = $FfmpegInBin
    $env:PATH = "$BinDir;$env:PATH"
    Write-Host "  Already installed at $FfmpegFinalPath" -ForegroundColor Green
} else {
    $FfmpegInstalled = $false
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
    $FfmpegFinalPath = $FfmpegInBin
    Write-Host "  Installed at $FfmpegFinalPath" -ForegroundColor Green
}
Write-Host ""

# ── yt-dlp ────────────────────────────────────────────────────────────────────
Write-Host "[4/5] Setting up yt-dlp..." -ForegroundColor Yellow
$YtdlpInBin = Join-Path $BinDir "yt-dlp.exe"
$YtdlpCmd = Get-Command yt-dlp -ErrorAction SilentlyContinue

if ($YtdlpCmd) {
    $YtdlpInstalled = $true
    $YtdlpFinalPath = $YtdlpCmd.Source
    Write-Host "  Already installed: $(yt-dlp --version) at $YtdlpFinalPath" -ForegroundColor Green
    Write-Host "  Updating to latest..." -ForegroundColor White
    try { & $YtdlpFinalPath -U } catch {}
} elseif (Test-Path $YtdlpInBin) {
    $YtdlpInstalled = $true
    $YtdlpFinalPath = $YtdlpInBin
    $env:PATH = "$BinDir;$env:PATH"
    Write-Host "  Already installed: $(& $YtdlpInBin --version) at $YtdlpInBin" -ForegroundColor Green
    Write-Host "  Updating to latest..." -ForegroundColor White
    try { & $YtdlpInBin -U } catch {}
} else {
    $YtdlpInstalled = $false
    $YtdlpUrl = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"

    Write-Host "  Downloading yt-dlp..." -ForegroundColor White
    Invoke-WebRequest -Uri $YtdlpUrl -OutFile $YtdlpInBin -UseBasicParsing

    $env:PATH = "$BinDir;$env:PATH"
    $YtdlpFinalPath = $YtdlpInBin
    $YtdlpVersion = & $YtdlpInBin --version
    Write-Host "  Installed: $YtdlpVersion at $YtdlpFinalPath" -ForegroundColor Green
}
Write-Host ""

# ── PATH persistence ──────────────────────────────────────────────────────────
Write-Host "[5/5] Adding to PATH..." -ForegroundColor Yellow
$PathsToAdd = @()
if (-not $FfmpegInstalled -or -not $YtdlpInstalled) {
    $PathsToAdd += $BinDir
}
if (-not $NodeInstalled) {
    $PathsToAdd += $NodeDir
}

if ($PathsToAdd.Count -eq 0) {
    Write-Host "  All components already installed and in PATH, skipping" -ForegroundColor Green
} else {
    $IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    $TargetScope = if ($IsAdmin) { "Machine" } else { "User" }

    $TargetPath = [Environment]::GetEnvironmentVariable("PATH", $TargetScope)
    if ($null -eq $TargetPath) { $TargetPath = "" }
    $PathChanged = $false

    foreach ($p in $PathsToAdd) {
        if ($TargetPath -notlike "*$p*") {
            $TargetPath = if ($TargetPath) { "$p;$TargetPath" } else { $p }
            $PathChanged = $true
            Write-Host "  Added: $p" -ForegroundColor Green
        } else {
            Write-Host "  Already in PATH: $p" -ForegroundColor Gray
        }
        if ($env:PATH -notlike "*$p*") {
            $env:PATH = "$p;$env:PATH"
        }
    }

    if ($PathChanged) {
        try {
            [Environment]::SetEnvironmentVariable("PATH", $TargetPath, $TargetScope)
            Write-Host "  $TargetScope PATH updated (persisted)" -ForegroundColor Green
        } catch {
            $UserPath = [Environment]::GetEnvironmentVariable("PATH", "User")
            if ($null -eq $UserPath) { $UserPath = "" }
            foreach ($p in $PathsToAdd) {
                if ($UserPath -notlike "*$p*") {
                    $UserPath = if ($UserPath) { "$p;$UserPath" } else { $p }
                }
            }
            [Environment]::SetEnvironmentVariable("PATH", $UserPath, "User")
            Write-Host "  User PATH updated (persisted)" -ForegroundColor Green
        }
    }
}
Write-Host ""

# ── npm install ───────────────────────────────────────────────────────────────
Write-Host "[+] Installing npm dependencies..." -ForegroundColor Yellow
Push-Location $ProjectDir
try { npm install } finally { Pop-Location }
Write-Host ""

# ── .env generation ───────────────────────────────────────────────────────────
$EnvFile = Join-Path $ProjectDir ".env"
if (-not (Test-Path $EnvFile)) {
    $YtdlpEnvLine = if ($YtdlpFinalPath -and ($YtdlpFinalPath -ne $YtdlpInBin)) { "YTDLP_PATH=$YtdlpFinalPath" } else { "# YTDLP_PATH=  # auto-detected from ./bin/yt-dlp.exe or system PATH" }
    $FfmpegEnvLine = if ($FfmpegFinalPath -and ($FfmpegFinalPath -ne $FfmpegInBin)) { "FFMPEG_PATH=$FfmpegFinalPath" } else { "# FFMPEG_PATH=  # auto-detected from ./bin/ffmpeg.exe or system PATH" }
    $CookiesFinal = Join-Path $ProjectDir "cookies.txt"
    $Secret = -join ((1..64) | ForEach-Object { [char](Get-Random -Minimum 33 -Maximum 126) })

    @"
PORT=5000
HOSTNAME=0.0.0.0
NODE_ENV=development
SESSION_SECRET=$Secret
COOKIE_SECURE=false
$YtdlpEnvLine
$FfmpegEnvLine
COOKIES_PATH=$CookiesFinal
FIREBASE_SERVICE_ACCOUNT_KEY=
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
"@ | Set-Content $EnvFile -Encoding UTF8

    Write-Host "[+] Created .env with auto-detected paths" -ForegroundColor Yellow
} else {
    Write-Host "[+] .env already exists, skipping" -ForegroundColor Green
}

$FinalYtdlp = if ($YtdlpFinalPath) { $YtdlpFinalPath } else { "$BinDir\yt-dlp.exe" }
$FinalFfmpeg = if ($FfmpegFinalPath) { $FfmpegFinalPath } else { "$BinDir\ffmpeg.exe" }
$NodeCheck = Get-Command node -ErrorAction SilentlyContinue
$FinalNode = if ($NodeCheck) { $NodeCheck.Source } else { "not found" }

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
