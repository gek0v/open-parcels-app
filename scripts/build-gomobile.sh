#!/usr/bin/env bash
set -e

# ==============================================================================
# Open Parcels Mobile — Gomobile Compilation Pipeline
# Compiles core Go engine into native Android .aar and iOS .xcframework
# ==============================================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GO_CORE_DIR="$(cd "${PROJECT_ROOT}/../open-parcels" && pwd)"
OUTPUT_DIR="${PROJECT_ROOT}/src/infrastructure/engine/native/binaries"

echo "📦 === Open Parcels Gomobile Build Pipeline ==="
echo "📁 Go Core Dir: ${GO_CORE_DIR}"
echo "📁 Output Dir:  ${OUTPUT_DIR}"

mkdir -p "${OUTPUT_DIR}/android"
mkdir -p "${OUTPUT_DIR}/ios"

if ! command -v gomobile &> /dev/null; then
  echo "⚠️ 'gomobile' command not found in PATH."
  echo "👉 Install with: go install golang.org/x/mobile/cmd/gomobile@latest && gomobile init"
  echo "Skipping native compilation; TypeScript fallback engine remains 100% active."
  exit 0
fi

cd "${GO_CORE_DIR}"

# 1. Android AAR build
echo "🤖 Building Android AAR (openparcels.aar)..."
gomobile bind -v \
  -target=android \
  -androidapi 24 \
  -javapkg=com.openparcels.core \
  -o "${OUTPUT_DIR}/android/openparcels.aar" \
  ./pkg/detector ./pkg/model ./pkg/validators || echo "Android gomobile build skipped"

# 2. iOS XCFramework build
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "🍎 Building iOS XCFramework (OpenParcels.xcframework)..."
  gomobile bind -v \
    -target=ios \
    -o "${OUTPUT_DIR}/ios/OpenParcels.xcframework" \
    ./pkg/detector ./pkg/model ./pkg/validators || echo "iOS gomobile build skipped"
else
  echo "ℹ️ Skipping iOS XCFramework build (requires macOS host with Xcode)."
fi

echo "✅ Gomobile compilation pipeline finished."
