#!/usr/bin/env bash
# ==============================================================================
# SIH26096 — Digital Heritage Archive for Memorials, Manuscripts & Ambedkar
# LINUX / RASPBERRY PI EXHIBITION TERMINAL KIOSK LAUNCHER
# ==============================================================================
# Sets up uncluttered X11 environment, disables screensaver/blanking, and launches
# Chromium in full-screen locked kiosk mode.
# ==============================================================================

set -euo pipefail

KIOSK_SERVER_URL="${KIOSK_SERVER_URL:-http://localhost:80}"
KIOSK_START_ROUTE="${KIOSK_START_ROUTE:-/kiosk/media}"
KIOSK_FULL_URL="${KIOSK_SERVER_URL}${KIOSK_START_ROUTE}"

echo "=============================================================================="
echo "  AMBEDKAR MEMORIAL ARCHIVE - LINUX EXHIBITION KIOSK TERMINAL"
echo "=============================================================================="
echo "Target Kiosk URL: ${KIOSK_FULL_URL}"

# Disable screen blanking, DPMS, and screensaver on X11
if command -v xset >/dev/null 2>&1; then
    xset s off || true
    xset -dpms || true
    xset s noblank || true
fi

# Hide mouse cursor when inactive (optional tool unclutter)
if command -v unclutter >/dev/null 2>&1; then
    unclutter -idle 3 -root &
fi

# Find Chromium or Google Chrome
BROWSER_BIN=""
for candidate in chromium-browser chromium google-chrome google-chrome-stable; do
    if command -v "$candidate" >/dev/null 2>&1; then
        BROWSER_BIN="$candidate"
        break
    fi
done

if [ -z "$BROWSER_BIN" ]; then
    echo "[ERROR] No Chromium browser binary found. Please run: sudo apt install chromium-browser"
    exit 1
fi

echo "Launching ${BROWSER_BIN} in locked kiosk mode..."

PROFILE_DIR="/tmp/kiosk_archive_linux_profile"
rm -rf "$PROFILE_DIR"
mkdir -p "$PROFILE_DIR"

exec "$BROWSER_BIN" \
    --app="${KIOSK_FULL_URL}" \
    --kiosk \
    --disable-pinch \
    --overscroll-history-navigation=0 \
    --no-first-run \
    --disable-features=TranslateUI \
    --disable-session-crashed-bubble \
    --autoplay-policy=no-user-gesture-required \
    --user-data-dir="${PROFILE_DIR}"
