#!/usr/bin/env bash
set -euo pipefail

source /opt/neokim-webtoon-download-watcher/tunnel.env

exec /usr/bin/ssh \
  -N \
  -o ExitOnForwardFailure=yes \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  -i "$SSH_KEY_FILE" \
  -p "$REPO3_SSH_PORT" \
  -L "127.0.0.1:$LOCAL_API_PORT:127.0.0.1:$REMOTE_API_PORT" \
  "$REPO3_SSH_USER@$REPO3_SSH_HOST"
