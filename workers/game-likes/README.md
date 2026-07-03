# NeoKIM Game Likes Worker

Small Cloudflare Worker + D1 API for `/games` likes.

## API

- `GET /likes`
  - Returns `{ counts: { [gameId]: number } }`.
- `POST /likes`
  - Body: `{ "gameId": "...", "voterHash": "...", "page": "/games/", "value": 1 }`
  - Stores one like per `(game_id, voter_hash)`.
  - Applies rate limits per visitor hash and per IP hash.

The worker stores only hashes (`voter_hash`, `ip_hash`, `user_agent_hash`), not raw visitor IDs or raw IPs.

## Deploy

From `workers/game-likes`:

```powershell
npx wrangler login
npx wrangler d1 create neokim-game-likes
```

Copy the returned `database_id` into `wrangler.toml`.

```powershell
npx wrangler d1 migrations apply neokim-game-likes --remote
npx wrangler deploy
```

Then copy the deployed endpoint URL, usually:

```text
https://neokim-game-likes.<your-workers-subdomain>.workers.dev/likes
```

Paste it into:

```html
<meta name="game-like-endpoint" content="https://.../likes">
```

in `games/index.html`, then commit and push the static site again.

## Local Test

```powershell
npx wrangler d1 migrations apply neokim-game-likes --local
npx wrangler dev
```

Use a temporary local endpoint in `games/index.html`:

```html
<meta name="game-like-endpoint" content="http://127.0.0.1:8787/likes">
```

The committed value should be the production Worker URL.
