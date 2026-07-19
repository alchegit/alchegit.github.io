#!/usr/bin/env bash
set -euo pipefail

RUN_USER="${RUN_USER:-webtoonbrowser}"
DISPLAY_NUM="${DISPLAY_NUM:-1}"
NO_VNC_PORT="${NO_VNC_PORT:-6080}"

if [[ "$(id -u)" != "0" ]]; then
  echo "Run as root: sudo ./scripts/stop-session.sh" >&2
  exit 1
fi

VNC_BIN="$(command -v vncserver || command -v tigervncserver || true)"
if [[ -n "$VNC_BIN" ]]; then
  runuser -u "$RUN_USER" -- "$VNC_BIN" "-kill" ":$DISPLAY_NUM" >/dev/null 2>&1 || true
fi

pkill -u "$RUN_USER" -f "chromium-webtoon" >/dev/null 2>&1 || true
pkill -f "websockify.*:$NO_VNC_PORT" >/dev/null 2>&1 || true

echo "Remote browser session stopped."
