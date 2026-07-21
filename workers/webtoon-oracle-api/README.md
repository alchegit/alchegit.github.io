# Webtoon Oracle API

This server replaces the `/webtoon` Supabase data path with an Oracle-backed API on `EENTA_REPO3`.

The browser never connects to Oracle directly. GitHub Pages talks to this API, and this API talks to Oracle with server-only credentials.
The application listens on `127.0.0.1` by default so the public entry point remains the HTTPS tunnel or reverse proxy.

## Responsibilities

- Store public webtoon projects.
- Verify Supabase Google sessions and store per-user profile/acorn state.
- Give only `ADMIN_GOOGLE_EMAIL` administrator privileges.
- Let the administrator adjust balances, ban accounts, and inspect privacy-minimized security events.
- Create and update generation jobs.
- Register manually downloaded/generated images as managed assets.
- Serve uploaded image files from the API server.

## Boundaries

- Do not put Oracle passwords in static frontend files.
- Do not automate ChatGPT web, paste prompts, click buttons, or extract outputs.
- The download watcher only uploads files that the admin manually downloaded from the remote browser.

## Setup

1. For a new database, run `oracle/webtoon-platform-oracle.sql` as the Oracle application user. For an existing database, apply the dated migrations in order. The visual draft release requires `20260720-webtoon-panel-version-audit.sql` followed by `20260721-webtoon-visual-draft-workflow.sql` before deploying the matching API.
2. Copy `.env.example` to `.env` on `EENTA_REPO3`.
3. Fill in Oracle connection values, Supabase Auth values, the exact administrator Google email, and long random server secrets.
4. Install dependencies and start:

```bash
npm install
npm run check
npm start
```

## Key Endpoints

- `GET /health`
- `GET /api/webtoon/profile`
- `POST /api/webtoon/acorns/claim`
- `GET /api/webtoon/projects/public/latest`
- `POST /api/webtoon/projects`
- `PUT /api/webtoon/projects/:id`
- `POST /api/webtoon/jobs`
- `POST /api/webtoon/assets/reference`
- `GET /api/webtoon/jobs/ready`
- `PATCH /api/webtoon/jobs/:id`
- `POST /api/webtoon/assets/upload`
- `GET /api/webtoon/admin/users`
- `PATCH /api/webtoon/admin/users/:id/acorns`
- `PATCH /api/webtoon/admin/users/:id/status`
- `GET /api/webtoon/admin/security/events`
- `GET /api/webtoon/admin/plan`

Browser endpoints require a verified Supabase access token created by Google login. Administrator endpoints additionally require the exact `ADMIN_GOOGLE_EMAIL` identity. Worker endpoints require the server-only `X-Webtoon-Worker-Token`.

`POST /api/webtoon/assets/reference` is the authenticated browser path for an approved visual draft. Final-render jobs are rejected unless every prompt package includes both an approved draft version ID and an HTTPS `approved-draft` reference.

Keep `ADMIN_ONLY_CREATION=true` during private testing. In this mode, project writes and generation jobs reject every non-admin account with `403 development_in_progress`, even if a caller bypasses the browser UI.

`SUPABASE_SERVICE_ROLE_KEY` is optional but recommended. When configured, a ban is synchronized to Supabase Auth as well as being enforced by this API. Never expose that key to the browser.

Raw IP addresses are not stored. The API records an HMAC-derived connection fingerprint, a coarse device/browser category, and selected security events for 30 days by default. Disclose this processing in the public privacy notice and adjust the retention period to the minimum needed for operation.

## Limits

- Projects: title 60 characters, story 3,000 characters, 1-20 key scenes, 512KiB serialized JSON.
- Jobs: allowlisted job types, server-owned acorn costs, 64KiB request and 128KiB result payloads.
- Images: JPG, PNG, or WebP only, maximum 12MiB, with MIME and file-signature validation.
- API: 60 requests per minute per client IP, 10 creation requests per minute per account, and 30 administrator requests per minute per account by default.
