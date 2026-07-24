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

1. For a new database, run `oracle/webtoon-platform-oracle.sql` as the Oracle application user. For an existing database, apply the dated migrations in order. The visual draft release requires `20260720-webtoon-panel-version-audit.sql` followed by `20260721-webtoon-visual-draft-workflow.sql`. StoryHeaven additionally requires `20260724-storyheaven-foundation.sql`, `20260724-storyheaven-submissions.sql`, `20260724-storyheaven-weekly-rounds.sql`, `20260724-storyheaven-round-moderation.sql`, and `20260724-storyheaven-reports.sql` in that order before deploying the matching API.
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
- `GET /api/storyheaven/feed`
- `GET /api/storyheaven/profile`
- `GET /api/storyheaven/rounds/current`
- `GET /api/storyheaven/nicknames/availability`
- `PATCH /api/storyheaven/me/nickname`
- `GET /api/storyheaven/me/stories`
- `GET /api/storyheaven/stories/:id`
- `POST /api/storyheaven/stories`
- `PATCH /api/storyheaven/stories/:id/draft`
- `POST /api/storyheaven/stories/:id/submit`
- `POST /api/storyheaven/stories/:id/like`
- `DELETE /api/storyheaven/stories/:id/like`
- `POST /api/storyheaven/stories/:id/report`
- `GET /api/storyheaven/me/notifications`
- `POST /api/storyheaven/me/notifications/:id/read`
- `POST /api/storyheaven/reports/:id/appeal`
- `POST /api/storyheaven/operator/stories/:id/endorsement`
- `GET /api/storyheaven/operator/submissions`
- `GET /api/storyheaven/operator/reports`
- `POST /api/storyheaven/operator/reports/:id/resolve`
- `POST /api/storyheaven/operator/appeals/:id/resolve`
- `GET /api/storyheaven/operator/rounds/pending`
- `GET /api/storyheaven/operator/rounds/:id/audit`
- `POST /api/storyheaven/operator/votes/:id/invalidate`
- `POST /api/storyheaven/operator/entries/:id/disqualify`
- `POST /api/storyheaven/operator/rounds/:id/finalize`
- `POST /api/storyheaven/operator/stories/:id/review`

Browser endpoints require a verified Supabase access token created by Google login. Administrator endpoints additionally require the exact `ADMIN_GOOGLE_EMAIL` identity. Worker endpoints require the server-only `X-Webtoon-Worker-Token`.

`POST /api/webtoon/assets/reference` is the authenticated browser path for an approved visual draft. Final-render jobs are rejected unless every prompt package includes both an approved draft version ID and an HTTPS `approved-draft` reference.

Keep `ADMIN_ONLY_CREATION=true` during private testing. In this mode, project writes and generation jobs reject every non-admin account with `403 development_in_progress`, even if a caller bypasses the browser UI.

`SUPABASE_SERVICE_ROLE_KEY` is optional but recommended. When configured, a ban is synchronized to Supabase Auth as well as being enforced by this API. Never expose that key to the browser.

Raw IP addresses are not stored. The API records an HMAC-derived connection fingerprint, a coarse device/browser category, and selected security events for 30 days by default. Disclose this processing in the public privacy notice and adjust the retention period to the minimum needed for operation.

StoryHeaven reader likes and editorial endorsements are separate records. A like is unique per story and authenticated account; an editorial endorsement never changes the public reader-like total or weekly ranking. AI seed stories use `content_origin=ai_seed`, remain ineligible for the human weekly competition, and must keep their visible disclosure.

Human StoryHeaven drafts remain private until an administrator approves a submitted immutable revision. Submission requires an active public nickname, display/originality/adult confirmations, and the server-side story limits. The optional training consent is stored separately and defaults to off. Authors cannot like their own published stories.

Weekly candidate votes are stored separately from all-time story likes. KST schedules are server-generated, one author can enter one story per round, and tied first-place stories create a 24-hour runoff instead of an arbitrary winner. Vote-risk fingerprints are HMAC-derived, never contain raw IP addresses, expire after the configured retention period, and are not an automatic penalty signal.

Vote invalidation and candidate disqualification are administrator-only, require a 10-500 character reason, and are accepted only while the round is in `auditing`. An invalidated vote cannot be restored by another like request. Disqualifying an entry invalidates each active vote with its own audit event; finalization then ranks only the remaining candidates. The operator view exposes a server-pseudonymized voter key, never a Google email or raw IP.

Story reports are structured, authenticated, and unique per account/story/category. Report evidence accepts HTTPS references only and is never fetched by the API. A decision requires a written reason and creates a creator notification without reporter identity. Only an affected story owner can submit one appeal within seven days. Report decisions do not automatically unpublish a story or alter a ranking; those remain separate explicit operator actions.

## Limits

- Projects: title 60 characters, story 3,000 characters, 1-20 key scenes, 512KiB serialized JSON.
- Jobs: allowlisted job types, server-owned acorn costs, 64KiB request and 128KiB result payloads.
- Images: JPG, PNG, or WebP only, maximum 12MiB, with MIME and file-signature validation.
- API: 60 requests per minute per client IP, 10 creation requests per minute per account, and 30 administrator requests per minute per account by default.
- StoryHeaven: 60-character title, 160-character logline, 400-1,200-character submitted synopsis, 5,000-character total packet, up to 5 tags, and up to 10 active drafts per member.
