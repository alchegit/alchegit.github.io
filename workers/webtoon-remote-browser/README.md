# Webtoon Remote Browser Workstation

This is a manual remote-browser workstation for the site owner/admin.

It does **not** automate ChatGPT web, extract outputs, or store ChatGPT credentials in this repository. It only helps you run a persistent browser session on the external Linux server and view/control it manually through an SSH tunnel.

## Shape

- External server: runs VNC + noVNC + Firefox, with Chromium fallback kept in the script.
- This computer: opens an SSH tunnel to the server.
- Browser access: `http://127.0.0.1:6080/vnc.html`
- ChatGPT Pro usage: the admin manually logs in, pastes prompts, saves images, and imports them into `/webtoon/`.
- Korean/CJK fonts and `ko_KR.UTF-8` locale are installed so ChatGPT Korean text renders correctly.

The browser lives on the external server. This computer only opens a private tunnel and displays the remote browser while you are working.

## Local SSH Alias

On this computer, create an SSH host alias first. Copy `windows/ssh-config.example.txt` into your local SSH config and replace the placeholder values:

```text
C:\Users\<you>\.ssh\config
```

Keep real host names, ports, users, and passwords out of this repository.

## Server Setup

Run this once on the external Rocky/RHEL-like server:

```bash
cd /path/to/alchegit.github.io/workers/webtoon-remote-browser
chmod +x scripts/*.sh
sudo ./scripts/install-rocky8.sh
sudo -u webtoonbrowser vncpasswd
```

The `vncpasswd` value is your remote desktop password. Do not commit it.

## Start The Remote Browser On The Server

```bash
cd /path/to/alchegit.github.io/workers/webtoon-remote-browser
sudo ./scripts/start-session.sh
```

Leave this running in a terminal, `tmux`, or a systemd service later.

## Connect From This Computer

If your SSH config has a host alias for the server:

```powershell
.\workers\webtoon-remote-browser\windows\start-tunnel.ps1 -HostAlias EETNA_WEB_HOON
```

Then open:

```text
http://127.0.0.1:6080/vnc.html
```

If the host alias is not configured, add it to your local SSH config first. Do not put host passwords in this repo.

## Stop The Server Session

```bash
cd /path/to/alchegit.github.io/workers/webtoon-remote-browser
sudo ./scripts/stop-session.sh
```

## Important Boundaries

- This setup is for manual admin use only.
- Do not add Playwright/Puppeteer code that controls ChatGPT web.
- Do not commit browser profile directories, cookies, `.env`, screenshots with secrets, or downloaded private images.
- Keep noVNC bound to `127.0.0.1` and reach it through SSH tunneling.
