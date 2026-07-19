#!/usr/bin/env bash
set -euo pipefail

RUN_USER="${RUN_USER:-webtoonbrowser}"
DISPLAY_NUM="${DISPLAY_NUM:-1}"
VNC_GEOMETRY="${VNC_GEOMETRY:-1440x1000}"
NO_VNC_HOST="${NO_VNC_HOST:-127.0.0.1}"
NO_VNC_PORT="${NO_VNC_PORT:-6080}"
START_URL="${START_URL:-https://chatgpt.com/}"
SESSION_LANG="${SESSION_LANG:-ko_KR.UTF-8}"

if [[ "$(id -u)" != "0" ]]; then
  echo "Run as root: sudo ./scripts/start-session.sh" >&2
  exit 1
fi

VNC_BIN="$(command -v vncserver || command -v tigervncserver || true)"
WEBSOCKIFY_BIN="$(command -v websockify || true)"
FIREFOX_BIN="$(command -v firefox || true)"
CHROMIUM_BIN="$(command -v chromium-browser || command -v chromium || command -v google-chrome || true)"
BROWSER_BIN="${FIREFOX_BIN:-$CHROMIUM_BIN}"

if [[ -z "$VNC_BIN" || -z "$WEBSOCKIFY_BIN" || -z "$BROWSER_BIN" ]]; then
  echo "Missing vncserver, websockify, or a browser. Run install-rocky8.sh first." >&2
  exit 1
fi

if [[ ! -f "/home/$RUN_USER/.vnc/passwd" ]]; then
  echo "VNC password is not set. Run: sudo -u $RUN_USER vncpasswd" >&2
  exit 1
fi

install -d -m 755 /var/log/webtoon-remote-browser
touch /var/log/webtoon-remote-browser/vnc.log /var/log/webtoon-remote-browser/browser.log
chown "$RUN_USER:$RUN_USER" /var/log/webtoon-remote-browser/browser.log
runuser -u "$RUN_USER" -- mkdir -p \
  "/home/$RUN_USER/.config/chromium-webtoon/Crashpad" \
  "/home/$RUN_USER/.cache/chromium-webtoon" \
  "/home/$RUN_USER/.mozilla-webtoon"
install -d -m 700 -o "$RUN_USER" -g "$RUN_USER" "/tmp/runtime-$RUN_USER"

VNC_PORT="$((5900 + DISPLAY_NUM))"
NOVNC_WEB="/usr/share/novnc"
if [[ ! -d "$NOVNC_WEB" ]]; then
  NOVNC_WEB="/usr/share/novnc/core"
fi

runuser -u "$RUN_USER" -- "$VNC_BIN" ":$DISPLAY_NUM" -geometry "$VNC_GEOMETRY" -localhost yes >/var/log/webtoon-remote-browser/vnc.log 2>&1 || true

if [[ -n "$FIREFOX_BIN" ]]; then
  runuser -u "$RUN_USER" -- bash -lc "
    DISPLAY=:$DISPLAY_NUM \
    HOME='/home/$RUN_USER' \
    XDG_RUNTIME_DIR='/tmp/runtime-$RUN_USER' \
    LANG='$SESSION_LANG' \
    LC_ALL='$SESSION_LANG' \
    '$FIREFOX_BIN' \
      --no-remote \
      --profile '/home/$RUN_USER/.mozilla-webtoon' \
      '$START_URL' \
      >/var/log/webtoon-remote-browser/browser.log 2>&1 &
  "
else
  runuser -u "$RUN_USER" -- bash -lc "
    DISPLAY=:$DISPLAY_NUM \
    HOME='/home/$RUN_USER' \
    XDG_RUNTIME_DIR='/tmp/runtime-$RUN_USER' \
    LANG='$SESSION_LANG' \
    LC_ALL='$SESSION_LANG' \
    '$CHROMIUM_BIN' \
    --user-data-dir='/home/$RUN_USER/.config/chromium-webtoon' \
    --no-first-run \
    --no-default-browser-check \
    --password-store=basic \
    --disable-breakpad \
    --disable-crash-reporter \
    --disable-crashpad \
    --crash-dumps-dir='/home/$RUN_USER/.config/chromium-webtoon/Crashpad' \
    --disk-cache-dir='/home/$RUN_USER/.cache/chromium-webtoon' \
    --disable-dev-shm-usage \
    '$START_URL' \
    >/var/log/webtoon-remote-browser/browser.log 2>&1 &
  "
fi

echo "noVNC is listening on $NO_VNC_HOST:$NO_VNC_PORT"
echo "From your local PC, run: ssh -N -L 6080:127.0.0.1:$NO_VNC_PORT <SSH_ALIAS>"
echo "Then open: http://127.0.0.1:6080/vnc.html"

exec "$WEBSOCKIFY_BIN" --web "$NOVNC_WEB" "$NO_VNC_HOST:$NO_VNC_PORT" "127.0.0.1:$VNC_PORT"
