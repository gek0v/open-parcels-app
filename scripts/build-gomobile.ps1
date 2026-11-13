<#
.SYNOPSIS
  Open Parcels Mobile — Gomobile Compilation Pipeline for Windows (PowerShell)
  Compiles core Go engine into native Android .aar package for local on-device execution.
#>

param(
    [string]$GoCorePath = "",
    [int]$AndroidApi = 24
)

$ProjectRoot = (Resolve-Path "$PSScriptRoot\..").Path
$OutputDir = "$ProjectRoot\src\infrastructure\engine\native\binaries"

Write-Host "=== Open Parcels Gomobile Build Pipeline (Windows) ===" -ForegroundColor Cyan
Write-Host "[*] Project Root: $ProjectRoot"
Write-Host "[*] Output Dir:   $OutputDir"

New-Item -ItemType Directory -Force -Path "$OutputDir\android" | Out-Null
New-Item -ItemType Directory -Force -Path "$OutputDir\ios" | Out-Null

# 1. Resolve Go Core Directory
$CandidatePaths = @(
    $GoCorePath,
    $env:OPEN_PARCELS_GO_DIR,
    "$ProjectRoot\..\open-parcels",
    "$ProjectRoot\..\..\open-parcels",
    "$ProjectRoot\..\..\..\open-parcels",
    "D:\Workspaces\open-parcels",
    "C:\Workspaces\open-parcels"
)

$GoCoreDir = $null
foreach ($cand in $CandidatePaths) {
    if ($cand -and (Test-Path -Path $cand -PathType Container)) {
        $GoCoreDir = (Resolve-Path $cand).Path
        break
    }
}

if (-not $GoCoreDir) {
    Write-Host "[!] Go core directory not found in candidate paths." -ForegroundColor Yellow
    Write-Host "Checked paths:"
    foreach ($cand in $CandidatePaths) {
        if ($cand) { Write-Host "  - $cand" }
    }
    Write-Host "[i] Set `$env:OPEN_PARCELS_GO_DIR to the path of your open-parcels Go repository."
    Write-Host "Skipping native compilation; TypeScript on-device engine remains 100% active and autonomous." -ForegroundColor Yellow
    exit 0
}

Write-Host "[+] Detected Go Core: $GoCoreDir" -ForegroundColor Green

# 2. Check for Go
$goCmd = Get-Command go -ErrorAction SilentlyContinue
if (-not $goCmd) {
    Write-Host "[!] 'go' binary not found in PATH." -ForegroundColor Yellow
    Write-Host "Skipping native compilation; TypeScript engine remains 100% active." -ForegroundColor Yellow
    exit 0
}

# 3. Check for Gomobile
$gomobileCmd = Get-Command gomobile -ErrorAction SilentlyContinue
if (-not $gomobileCmd) {
    $userGoBin = "$env:USERPROFILE\go\bin\gomobile.exe"
    if (Test-Path $userGoBin) {
        $gomobileCmd = $userGoBin
    }
}

if (-not $gomobileCmd) {
    Write-Host "[!] 'gomobile' command not found in PATH or ~/go/bin." -ForegroundColor Yellow
    Write-Host "[i] Install gomobile with:" -ForegroundColor White
    Write-Host "    go install golang.org/x/mobile/cmd/gomobile@latest" -ForegroundColor Cyan
    Write-Host "    gomobile init" -ForegroundColor Cyan
    Write-Host "Skipping native compilation; TypeScript on-device engine remains 100% active." -ForegroundColor Yellow
    exit 0
}

# 4. Check Android NDK environment for AAR compilation
if (-not $env:ANDROID_HOME -and -not $env:ANDROID_NDK_HOME) {
    Write-Host "[i] ANDROID_HOME or ANDROID_NDK_HOME not set. If Android NDK is required by gomobile, ensure it is configured." -ForegroundColor DarkGray
}

Set-Location $GoCoreDir

Write-Host "[*] Compiling Android AAR (openparcels.aar)..." -ForegroundColor Green
$bindArgs = @(
    "bind",
    "-v",
    "-target=android",
    "-androidapi", "$AndroidApi",
    "-javapkg=com.openparcels.core",
    "-o", "$OutputDir\android\openparcels.aar",
    "./pkg/models",
    "./pkg/detector",
    "./pkg/carriers",
    "./pkg/engine"
)

try {
    & $gomobileCmd $bindArgs
    if ($LASTEXITCODE -eq 0 -and (Test-Path "$OutputDir\android\openparcels.aar")) {
        Write-Host "[+] Gomobile compilation complete: $OutputDir\android\openparcels.aar" -ForegroundColor Green
    } else {
        Write-Host "[!] Gomobile compilation returned exit code $LASTEXITCODE. TypeScript fallback engine remains active." -ForegroundColor Yellow
    }
} catch {
    Write-Host "[!] Error executing gomobile: $_. TypeScript engine remains 100% active." -ForegroundColor Yellow
} finally {
    Set-Location $ProjectRoot
}
