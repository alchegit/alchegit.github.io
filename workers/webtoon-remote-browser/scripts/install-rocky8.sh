#!/usr/bin/env bash
set -euo pipefail

RUN_USER="${RUN_USER:-webtoonbrowser}"

if [[ "$(id -u)" != "0" ]]; then
  echo "Run as root: sudo ./scripts/install-rocky8.sh" >&2
  exit 1
fi

dnf install -y epel-release || true

dnf install -y \
  chromium \
  firefox \
  tigervnc-server \
  tigervnc \
  xterm \
  novnc \
  python3-websockify \
  fluxbox \
  dbus-x11 \
  glibc-langpack-ko \
  langpacks-ko \
  google-noto-sans-cjk-ttc-fonts \
  google-noto-serif-cjk-ttc-fonts \
  google-noto-emoji-color-fonts \
  dejavu-sans-fonts \
  liberation-fonts \
  || dnf install -y \
    chromium \
    firefox \
    tigervnc-server \
    xterm \
    novnc \
    python3-websockify \
    dbus-x11 \
    glibc-langpack-ko \
    langpacks-ko \
    dejavu-sans-fonts \
    liberation-fonts

if ! id "$RUN_USER" >/dev/null 2>&1; then
  useradd -m -s /bin/bash "$RUN_USER"
fi

install -d -m 700 -o "$RUN_USER" -g "$RUN_USER" "/home/$RUN_USER/.vnc"
cat > "/home/$RUN_USER/.vnc/xstartup" <<'EOF'
#!/usr/bin/env bash
unset SESSION_MANAGER
unset DBUS_SESSION_BUS_ADDRESS

if command -v fluxbox >/dev/null 2>&1; then
  exec fluxbox
fi

xterm &
wait
EOF
chown "$RUN_USER:$RUN_USER" "/home/$RUN_USER/.vnc/xstartup"
chmod 700 "/home/$RUN_USER/.vnc/xstartup"

install -d -m 700 -o "$RUN_USER" -g "$RUN_USER" "/home/$RUN_USER/.config/chromium-webtoon"
install -d -m 700 -o "$RUN_USER" -g "$RUN_USER" "/home/$RUN_USER/.mozilla-webtoon"
fc-cache -f >/dev/null 2>&1 || true
install -d -m 755 /var/log/webtoon-remote-browser

cat <<EOF
Remote browser packages are installed.

Next:
  sudo -u $RUN_USER vncpasswd
  sudo ./scripts/start-session.sh

Use SSH tunneling from your local PC:
  ssh -N -L 6080:127.0.0.1:6080 <SSH_ALIAS>
EOF
