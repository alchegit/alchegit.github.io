# NeoKIM Webtoon Image Worker

This worker is meant to run on the external server, not inside GitHub Pages.

The first mode is `manual-prompt`: it polls ready `webtoon_generation_jobs`, turns each job into a structured prompt file, and writes that file to `outbox/`. It can use the new Oracle API backend or the older Supabase REST backend.

Visitors should only view public webtoon results. Creation, job processing, and prompt handling are admin-only flows.

## Secret Rule

Never commit `.env`.

Only `.env.example` belongs in Git. Put real values on the server:

- `SUPABASE_SERVICE_ROLE_KEY`
- future image API keys, if you later enable API generation

## Setup On Server

```bash
cd workers/webtoon-image-worker
cp .env.example .env
nano .env
npm run check
npm run once
npm start
```

The EETNA_WEB_HOON deployment uses these paths:

- application: `/opt/neokim-webtoon-image-worker`
- protected environment: `/opt/neokim-webtoon-image-worker/.env`
- prompt outbox: `/var/lib/neokim-webtoon-worker/outbox`
- service: `neokim-webtoon-image-worker.service`

Install the example unit from `systemd/` after creating the unprivileged
`webtoonworker` account. The unit deliberately grants write access only to the
prompt outbox and reaches Oracle through the existing localhost SSH tunnel.

## Current Flow

1. `/webtoon/` creates a future generation job in the Oracle API or Supabase.
2. This worker finds `status = ready` jobs.
3. The worker marks the job as `running`.
4. The worker writes one prompt, reference JSON, expected-result JSON, and manifest entry per panel. Final-render jobs also download the approved draft image from the allowlisted HTTPS origin so it can be used as the composition reference. A selective brush redraw writes a matching transparent PNG mask; white pixels are editable and transparent pixels are protected.
5. The worker marks the job as `done` with `result_payload.mode = manual-prompt`.
6. The admin can paste the prompt into ChatGPT Pro, create images manually, then import them into the webtoon studio.

Visual draft jobs carry `renderStage = draft` and `requestedQuality = low`; their prompts favor simple linework and composition checks. Final jobs carry `renderStage = final` and `requestedQuality = high`; they must include the approved draft version and HTTPS asset reference, and their prompts lock the approved camera and blocking while increasing rendering quality.

Set `REFERENCE_ASSET_ORIGINS` to a comma-separated allowlist of trusted asset origins. The worker rejects non-HTTPS URLs, redirects, unsupported image types, and files larger than `MAX_REFERENCE_MB`.

## Future Flow

When paid API generation is acceptable, add a new mode that stores generated image files in Oracle API server storage or Supabase Storage, then writes the image URL into `result_payload`.
