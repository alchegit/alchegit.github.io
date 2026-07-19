#!/usr/bin/env python3
import argparse
import hashlib
import json
import os
import shutil
import sys
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path


IMAGE_MIME_TYPES = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
}
IMAGE_EXTENSIONS = set(IMAGE_MIME_TYPES)
PARTIAL_EXTENSIONS = {".part", ".crdownload", ".tmp"}


def main():
    parser = argparse.ArgumentParser(description="Upload manually downloaded webtoon images to the Oracle API.")
    parser.add_argument("--once", action="store_true", help="Scan once and exit.")
    args = parser.parse_args()

    load_dotenv()
    config = {
        "api_base_url": required_env("WEBTOON_API_BASE_URL").rstrip("/"),
        "worker_token": required_env("WEBTOON_WORKER_TOKEN"),
        "download_dir": Path(os.getenv("DOWNLOAD_DIR", "~/Downloads")).expanduser(),
        "uploaded_dir": Path(os.getenv("UPLOADED_DIR", "~/Downloads/uploaded")).expanduser(),
        "state_file": Path(os.getenv("STATE_FILE", "~/.webtoon-download-watcher-state.json")).expanduser(),
        "poll_interval": max(2, int(os.getenv("POLL_INTERVAL_SECONDS", "5"))),
        "max_upload_bytes": max(1, int(os.getenv("MAX_UPLOAD_MB", "12"))) * 1024 * 1024,
        "project_id": os.getenv("PROJECT_ID", ""),
        "panel_id": os.getenv("PANEL_ID", ""),
        "job_id": os.getenv("JOB_ID", ""),
    }

    config["download_dir"].mkdir(parents=True, exist_ok=True)
    config["uploaded_dir"].mkdir(parents=True, exist_ok=True)
    state = load_state(config["state_file"])

    while True:
        uploaded = scan_once(config, state)
        save_state(config["state_file"], state)
        print(f"[watcher] uploaded={uploaded} known={len(state.get('files', {}))}")
        if args.once:
            return
        time.sleep(config["poll_interval"])


def scan_once(config, state):
    count = 0
    known = state.setdefault("files", {})
    for file_path in sorted(config["download_dir"].iterdir()):
        if not file_path.is_file():
            continue
        if file_path.suffix.lower() in PARTIAL_EXTENSIONS:
            continue
        if file_path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        if not is_stable(file_path):
            continue
        if file_path.stat().st_size > config["max_upload_bytes"]:
            state_key = f"{file_path.name}:oversize:{file_path.stat().st_size}"
            if state_key not in known:
                known[state_key] = {
                    "rejectedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    "reason": "image_too_large",
                }
                print(f"[watcher] skipped {file_path.name}: image exceeds upload limit", file=sys.stderr)
            continue

        digest = sha256_file(file_path)
        state_key = f"{file_path.name}:{digest}"
        if state_key in known:
            continue

        try:
            asset = upload_file(config, file_path, digest)
            known[state_key] = {
                "uploadedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "asset": asset,
            }
            move_uploaded(file_path, config["uploaded_dir"], digest)
            count += 1
            print(f"[watcher] uploaded {file_path.name} -> {asset.get('publicPath') or asset.get('id')}")
        except Exception as exc:
            print(f"[watcher] upload failed for {file_path.name}: {exc}", file=sys.stderr)
    return count


def upload_file(config, file_path, digest):
    boundary = f"----webtoon-{uuid.uuid4().hex}"
    mime_type = IMAGE_MIME_TYPES[file_path.suffix.lower()]
    fields = {
        "source": "remote-browser-download",
        "note": f"sha256:{digest}",
    }
    for key, env_key in (("projectId", "project_id"), ("panelId", "panel_id"), ("jobId", "job_id")):
        value = config.get(env_key)
        if value:
            fields[key] = value

    body = bytearray()
    for name, value in fields.items():
        body.extend(f"--{boundary}\r\n".encode())
        body.extend(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode())
        body.extend(str(value).encode())
        body.extend(b"\r\n")

    body.extend(f"--{boundary}\r\n".encode())
    body.extend(
        (
            f'Content-Disposition: form-data; name="image"; filename="{file_path.name}"\r\n'
            f"Content-Type: {mime_type}\r\n\r\n"
        ).encode()
    )
    body.extend(file_path.read_bytes())
    body.extend(b"\r\n")
    body.extend(f"--{boundary}--\r\n".encode())

    request = urllib.request.Request(
        f"{config['api_base_url']}/api/webtoon/assets/upload",
        data=bytes(body),
        method="POST",
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "X-Webtoon-Worker-Token": config["worker_token"],
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.loads(response.read().decode("utf-8")).get("asset", {})
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {error.code}: {detail}") from error


def move_uploaded(file_path, uploaded_dir, digest):
    target = uploaded_dir / f"{file_path.stem}_{digest[:10]}{file_path.suffix.lower()}"
    counter = 2
    while target.exists():
        target = uploaded_dir / f"{file_path.stem}_{digest[:10]}_{counter}{file_path.suffix.lower()}"
        counter += 1
    shutil.move(str(file_path), str(target))


def is_stable(file_path):
    first = file_path.stat().st_size
    time.sleep(0.5)
    second = file_path.stat().st_size
    return first > 0 and first == second


def sha256_file(file_path):
    digest = hashlib.sha256()
    with file_path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_state(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {"files": {}}


def save_state(path, state):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")


def load_dotenv():
    env_path = Path(".env")
    if not env_path.exists():
      return
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


def required_env(name):
    value = os.getenv(name, "")
    if not value or "replace_with" in value:
        raise RuntimeError(f"{name} is required.")
    return value


if __name__ == "__main__":
    main()
