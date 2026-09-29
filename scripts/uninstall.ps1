$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Vibes Music Player - Uninstall" -ForegroundColor Cyan
Write-Host "  Windows Prerequisites Remover" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

$ProjectDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$BinDir = Join-Path $ProjectDir "bin"
$NodeDir = Join-Path $BinDir "node"

Write-Host "[1/4] Removing yt-dlp..." -ForegroundColor Yellow
$YtdlpFile = Join-Path $BinDir "yt-dlp.exe"
if (Test-Path $YtdlpFile) {
    Remove-Item $YtdlpFile -Force
    Write-Host "  Removed $YtdlpFile" -ForegroundColor Green
} else {
    Write-Host "  Not found, skipping" -ForegroundColor Gray
}
Write-Host ""

Write-Host "[2/4] Removing ffmpeg..." -ForegroundColor Yellow
foreach ($f in @("ffmpeg.exe", "ffprobe.exe")) {
    $FilePath = Join-Path $BinDir $f
    if (Test-Path $FilePath) {
        Remove-Item $FilePath -Force
        Write-Host "  Removed $FilePath" -ForegroundColor Green
    }
}
Write-Host ""

Write-Host "[3/4] Removing Node.js..." -ForegroundColor Yellow
if (Test-Path $NodeDir) {
    Remove-Item -Recurse -Force $NodeDir
    Write-Host "  Removed $NodeDir\" -ForegroundColor Green
} else {
    Write-Host "  Not found, skipping" -ForegroundColor Gray
}
Write-Host ""

Write-Host "[4/4] Removing from system PATH..." -ForegroundColor Yellow
$PathsToRemove = @($BinDir, $NodeDir)

$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
$Scopes = if ($IsAdmin) { @("Machine", "User") } else { @("User") }

foreach ($scope in $Scopes) {
    try {
        $ScopePath = [Environment]::GetEnvironmentVariable("PATH", $scope)
        if ($ScopePath) {
            $ScopeChanged = $false
            foreach ($p in $PathsToRemove) {
                if ($ScopePath -like "*$p*") {
                    $ScopePath = ($ScopePath -split ";" | Where-Object { $_ -ne $p -and $_ -ne "" }) -join ";"
                    $ScopeChanged = $true
                    Write-Host "  Removed from $scope PATH: $p" -ForegroundColor Green
                }
            }
            if ($ScopeChanged) {
                [Environment]::SetEnvironmentVariable("PATH", $ScopePath, $scope)
            }
        }
    } catch {}
}

foreach ($p in $PathsToRemove) {
    if ($env:PATH -like "*$p*") {
        $env:PATH = ($env:PATH -split ";" | Where-Object { $_ -ne $p -and $_ -ne "" }) -join ";"
    }
}
Write-Host ""

if (Test-Path $BinDir) {
    $Remaining = Get-ChildItem $BinDir -ErrorAction SilentlyContinue
    if (-not $Remaining) {
        Remove-Item $BinDir -Force
        Write-Host "Removed empty bin\ directory" -ForegroundColor Green
    } else {
        Write-Host "bin\ not empty, left in place" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Uninstall complete!" -ForegroundColor Green
Write-Host ""
Write-Host "  Note: node_modules\ and .env" -ForegroundColor White
Write-Host "  were left untouched." -ForegroundColor White
Write-Host ""
Write-Host "  Restart your terminal for" -ForegroundColor White
Write-Host "  PATH changes to take effect." -ForegroundColor White
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
