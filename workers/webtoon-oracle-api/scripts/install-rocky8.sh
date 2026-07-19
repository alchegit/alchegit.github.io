#!/usr/bin/env bash
set -euo pipefail

if [[ "$(id -u)" != "0" ]]; then
  echo "Run as root: sudo ./scripts/install-rocky8.sh" >&2
  exit 1
fi

dnf install -y git curl tar gzip

if ! command -v node >/dev/null 2>&1; then
  dnf module enable -y nodejs:20 || true
  dnf install -y nodejs npm
fi

id webtoonapi >/dev/null 2>&1 || useradd -r -m -s /bin/bash webtoonapi
install -d -m 755 -o webtoonapi -g webtoonapi /opt/neokim-webtoon-oracle-api
install -d -m 755 -o webtoonapi -g webtoonapi /var/lib/neokim-webtoon/assets
install -d -m 755 -o webtoonapi -g webtoonapi /var/lib/neokim-webtoon/tmp

echo "Node: $(node --version)"
echo "NPM: $(npm --version)"
echo "Install complete. Copy the API files to /opt/neokim-webtoon-oracle-api and create .env there."
