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

Write-Host "[2/5] Setting up Node.js..." -ForegroundColor Yellow
$NodeDir = Join-Path $BinDir "node"
$NodePath = Get-Command node -ErrorAction SilentlyContinue
if ($NodePath) {
    Write-Host "  Already installed: $(node -v) at $($NodePath.Source)" -ForegroundColor Green
} else {
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

Write-Host "[3/5] Setting up ffmpeg..." -ForegroundColor Yellow
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

Write-Host "[4/5] Setting up yt-dlp..." -ForegroundColor Yellow
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

Write-Host "[5/5] Adding to PATH..." -ForegroundColor Yellow
$PathsToAdd = @()
if (-not $FfmpegPath -or -not $YtdlpPath) {
    $PathsToAdd += $BinDir
}
if (-not $NodePath) {
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

Write-Host "[+] Installing npm dependencies..." -ForegroundColor Yellow
Push-Location $ProjectDir
try { npm install } finally { Pop-Location }
Write-Host ""

$EnvFile = Join-Path $ProjectDir ".env"
if (-not (Test-Path $EnvFile)) {
    $YtdlpFinal = if ($YtdlpPath) { $YtdlpPath.Source } else { Join-Path $BinDir "yt-dlp.exe" }
    $CookiesFinal = Join-Path $ProjectDir "cookies.txt"
    $Secret = -join ((1..64) | ForEach-Object { [char](Get-Random -Minimum 33 -Maximum 126) })

    @"
PORT=5000
HOSTNAME=0.0.0.0
NODE_ENV=development
SESSION_SECRET=$Secret
COOKIE_SECURE=false
YTDLP_PATH=$YtdlpFinal
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

$FinalYtdlp = if ($YtdlpPath) { $YtdlpPath.Source } else { "$BinDir\yt-dlp.exe" }
$FinalFfmpeg = if ($FfmpegPath) { $FfmpegPath.Source } else { "$BinDir\ffmpeg.exe" }
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
