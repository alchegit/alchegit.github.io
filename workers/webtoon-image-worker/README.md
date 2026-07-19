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

## Current Flow

1. `/webtoon/` creates a future generation job in the Oracle API or Supabase.
2. This worker finds `status = ready` jobs.
3. The worker marks the job as `running`.
4. The worker writes a prompt file into `outbox/`.
5. The worker marks the job as `done` with `result_payload.mode = manual-prompt`.
6. The admin can paste the prompt into ChatGPT Pro, create images manually, then import them into the webtoon studio.

## Future Flow

When paid API generation is acceptable, add a new mode that stores generated image files in Oracle API server storage or Supabase Storage, then writes the image URL into `result_payload`.
