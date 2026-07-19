# Webtoon Download Watcher

This watcher runs on the remote browser server. It watches the browser download folder and uploads manually downloaded image files to the Oracle API on `EENTA_REPO3`.

It does not control ChatGPT web. The admin still logs in, creates images, and downloads files manually.

## Flow

1. Admin uses the noVNC remote browser.
2. Admin manually downloads an image from ChatGPT.
3. This watcher sees the finished image file.
4. The watcher uploads the file to `POST /api/webtoon/assets/upload`.
5. The Oracle API stores the file and registers metadata in Oracle.
6. The watcher moves the local file to `uploaded/`.

Only JPG, PNG, and WebP files up to 12MiB are considered. The Oracle API checks the actual file signature again before registering an asset.

## Setup

```bash
cd workers/webtoon-download-watcher
cp .env.example .env
python3 watch_downloads.py --once
python3 watch_downloads.py
```

Use a real `.env` only on the server. Do not commit it.

## Temporary public API tunnel

For GitHub Pages testing without a custom domain, run a Cloudflare Quick Tunnel
on the remote browser server. It exposes the local Oracle API tunnel
(`http://127.0.0.1:8088`) as a temporary HTTPS URL.

```bash
dnf -y install ./cloudflared-linux-x86_64.rpm
cp start-public-api-tunnel.sh /opt/neokim-webtoon-download-watcher/
cp systemd/neokim-webtoon-public-api-tunnel.service.example \
  /etc/systemd/system/neokim-webtoon-public-api-tunnel.service
systemctl daemon-reload
systemctl enable --now neokim-webtoon-public-api-tunnel.service
./get-public-api-url.sh
```

The `trycloudflare.com` URL is temporary and may change when the service
restarts. Keep admin and worker tokens on the server only.
