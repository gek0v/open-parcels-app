#!/usr/bin/env bash
set -e

# ==============================================================================
# Open Parcels Mobile — Gomobile Compilation Pipeline
# Compiles core Go engine into native Android .aar and iOS .xcframework
# ==============================================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${PROJECT_ROOT}/src/infrastructure/engine/native/binaries"

# Candidate search paths for open-parcels core
CANDIDATE_PATHS=(
  "${OPEN_PARCELS_GO_DIR:-}"
  "${PROJECT_ROOT}/../open-parcels"
  "${PROJECT_ROOT}/../../open-parcels"
  "${PROJECT_ROOT}/../../../open-parcels"
  "/d/Workspaces/open-parcels"
  "D:/Workspaces/open-parcels"
)

GO_CORE_DIR=""
for cand in "${CANDIDATE_PATHS[@]}"; do
  if [ -n "${cand}" ] && [ -d "${cand}" ]; then
    GO_CORE_DIR="$(cd "${cand}" 2>/dev/null && pwd || true)"
    break
  fi
done

echo "📦 === Open Parcels Gomobile Build Pipeline ==="
echo "📂 Project Root: ${PROJECT_ROOT}"
echo "📂 Go Core Dir:  ${GO_CORE_DIR:-not found}"
echo "📂 Output Dir:   ${OUTPUT_DIR}"

mkdir -p "${OUTPUT_DIR}/android"
mkdir -p "${OUTPUT_DIR}/ios"

if [ -z "${GO_CORE_DIR}" ] || [ ! -d "${GO_CORE_DIR}" ]; then
  echo "⚠️ Go core directory not found in candidate paths."
  echo "Set OPEN_PARCELS_GO_DIR to your open-parcels checkout path."
  echo "Skipping native compilation; TypeScript fallback engine remains 100% active."
  exit 0
fi

if ! command -v gomobile &> /dev/null; then
  if [ -x "${HOME}/go/bin/gomobile" ]; then
    export PATH="${PATH}:${HOME}/go/bin"
  fi
fi

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
  ./pkg/models ./pkg/detector ./pkg/carriers ./pkg/engine || echo "Android gomobile build skipped"

# 2. iOS XCFramework build
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "🍎 Building iOS XCFramework (OpenParcels.xcframework)..."
  gomobile bind -v \
    -target=ios \
    -o "${OUTPUT_DIR}/ios/OpenParcels.xcframework" \
    ./pkg/models ./pkg/detector ./pkg/carriers ./pkg/engine || echo "iOS gomobile build skipped"
else
  echo "ℹ️ Skipping iOS XCFramework build (requires macOS host with Xcode)."
fi

echo "✅ Gomobile compilation pipeline finished."
