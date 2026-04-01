#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/QuotaTracker"
ROOT_DIR="$SCRIPT_DIR/.."
APP_NAME="QuotaTracker"
BUNDLE="$SCRIPT_DIR/$APP_NAME.app"
ARCH="${1:-$(uname -m)}"

echo "==> Building for $ARCH..."

# 1. Build CLI binary (if not already present)
BIN_DIR="$PROJECT_DIR/Sources/Resources/bin"
mkdir -p "$BIN_DIR"
if [ ! -f "$BIN_DIR/quotatracker" ]; then
    echo "==> Compiling CLI binary..."
    cd "$ROOT_DIR"
    bun install --frozen-lockfile
    bun build --compile src/index.ts --outfile "$BIN_DIR/quotatracker"
fi

# 2. Build Swift binary
echo "==> Building SwiftUI app..."
cd "$PROJECT_DIR"
swift build -c release --arch "$ARCH"

# 3. Find the built binary
SWIFT_BIN="$PROJECT_DIR/.build/release/$APP_NAME"
if [ ! -f "$SWIFT_BIN" ]; then
    SWIFT_BIN="$PROJECT_DIR/.build/apple/Products/Release/$APP_NAME"
fi

if [ ! -f "$SWIFT_BIN" ]; then
    echo "ERROR: Cannot find built binary"
    exit 1
fi

# 4. Assemble .app bundle
echo "==> Assembling $APP_NAME.app..."
rm -rf "$BUNDLE"
mkdir -p "$BUNDLE/Contents/MacOS"
mkdir -p "$BUNDLE/Contents/Resources/bin"

# Executable
cp "$SWIFT_BIN" "$BUNDLE/Contents/MacOS/$APP_NAME"

# Info.plist
cp "$PROJECT_DIR/Sources/Resources/Info.plist" "$BUNDLE/Contents/Info.plist"

# CLI binary
cp "$BIN_DIR/quotatracker" "$BUNDLE/Contents/Resources/bin/quotatracker"
chmod +x "$BUNDLE/Contents/Resources/bin/quotatracker"

# App icon — compile xcassets to .car
if command -v actool &>/dev/null; then
    echo "==> Compiling assets..."
    actool "$PROJECT_DIR/Sources/Resources/Assets.xcassets" \
        --compile "$BUNDLE/Contents/Resources" \
        --platform macosx \
        --minimum-deployment-target 14.0 \
        --app-icon AppIcon \
        --output-partial-info-plist /dev/null 2>/dev/null || true
else
    # Fallback: create .icns from largest PNG
    ICON_SRC="$PROJECT_DIR/Sources/Resources/Assets.xcassets/AppIcon.appiconset/icon_512x512@2x.png"
    if [ -f "$ICON_SRC" ]; then
        ICONSET=$(mktemp -d)/AppIcon.iconset
        mkdir -p "$ICONSET"
        for size in 16 32 128 256 512; do
            src="$PROJECT_DIR/Sources/Resources/Assets.xcassets/AppIcon.appiconset/icon_${size}x${size}.png"
            src2x="$PROJECT_DIR/Sources/Resources/Assets.xcassets/AppIcon.appiconset/icon_${size}x${size}@2x.png"
            [ -f "$src" ] && cp "$src" "$ICONSET/icon_${size}x${size}.png"
            [ -f "$src2x" ] && cp "$src2x" "$ICONSET/icon_${size}x${size}@2x.png"
        done
        iconutil -c icns "$ICONSET" -o "$BUNDLE/Contents/Resources/AppIcon.icns" 2>/dev/null || true
    fi
fi

# 5. Ad-hoc codesign
echo "==> Signing..."
codesign --force --deep --sign - "$BUNDLE" 2>/dev/null || true

echo "==> Done: $BUNDLE"
echo "    Size: $(du -sh "$BUNDLE" | cut -f1)"
