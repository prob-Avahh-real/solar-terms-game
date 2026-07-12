#!/bin/bash
# Build script for Capacitor native app
# Usage: ./scripts/build.sh [ios|android|all]
set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo "=== 节气世界 · Capacitor Native Build ==="

# Install deps if needed
if [ ! -d "node_modules" ]; then
  echo "[1/4] Installing npm dependencies..."
  npm install
else
  echo "[1/4] Dependencies already installed"
fi

# Build web assets (copy to www/)
echo "[2/4] Preparing web assets..."
rm -rf www
mkdir -p www
cp -r index.html css js icons manifest.json sw.js www/

# Sync Capacitor
echo "[3/4] Syncing Capacitor..."
npx cap sync

PLATFORM="${1:-all}"

if [ "$PLATFORM" = "ios" ] || [ "$PLATFORM" = "all" ]; then
  echo "[4/4] Opening iOS project..."
  npx cap open ios
fi

if [ "$PLATFORM" = "android" ] || [ "$PLATFORM" = "all" ]; then
  echo "[4/4] Opening Android project..."
  npx cap open android
fi

echo "=== Done. Use Xcode / Android Studio to build & run ==="
