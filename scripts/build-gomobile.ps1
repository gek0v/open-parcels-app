<#
.SYNOPSIS
  Open Parcels Mobile — Gomobile Compilation Pipeline for Windows (PowerShell)
#>

$ProjectRoot = Resolve-Path "$PSScriptRoot\.."
$GoCoreDir = Resolve-Path "$ProjectRoot\..\open-parcels" -ErrorAction SilentlyContinue
$OutputDir = "$ProjectRoot\src\infrastructure\engine\native\binaries"

Write-Host "📦 === Open Parcels Gomobile Build Pipeline (Windows) ===" -ForegroundColor Cyan
Write-Host "📁 Go Core: $GoCoreDir"
Write-Host "📁 Output:  $OutputDir"

New-Item -ItemType Directory -Force -Path "$OutputDir\android" | Out-Null
New-Item -ItemType Directory -Force -Path "$OutputDir\ios" | Out-Null

$gomobileCmd = Get-Command gomobile -ErrorAction SilentlyContinue

if (-not $gomobileCmd) {
    Write-Host "⚠️ 'gomobile' command not found in PATH." -ForegroundColor Yellow
    Write-Host "👉 Install with: go install golang.org/x/mobile/cmd/gomobile@latest && gomobile init"
    Write-Host "Skipping native compilation; TypeScript fallback engine remains 100% active." -ForegroundColor Yellow
    exit 0
}

Set-Location $GoCoreDir

Write-Host "🤖 Compiling Android AAR..." -ForegroundColor Green
& gomobile bind -v -target=android -androidapi 24 -javapkg=com.openparcels.core -o "$OutputDir\android\openparcels.aar" ./pkg/detector ./pkg/model ./pkg/validators

Write-Host "✅ Gomobile compilation complete." -ForegroundColor Green
