# StoryHeaven Codex review worker

This private worker polls the Oracle API for leased StoryHeaven moderation jobs. It runs a low-reasoning Codex classification pass with `gpt-5.6-luna`; only rejected or low-confidence results are rechecked with `gpt-5.6-terra`. Up to ten episodes from one submission are leased together, then split in order into requests capped at six episodes and about 24,000 serialized characters. The public website never invokes Codex or a shell command directly.

When the queue is empty, polling backs off from 10 seconds to at most 60 seconds with a small jitter. Completing work resets the interval immediately, and `SIGTERM` interrupts idle sleep so deployments stop cleanly.

## Safety boundary

- Deterministic validation runs in the Oracle API before a job is queued.
- Manuscripts are sent to Codex over stdin and are not written to disk.
- The dedicated Codex permission profile denies filesystem reads outside the minimal runtime, disables network access and web search, disables subagents, and never asks for elevated approval.
- Results must match the JSON schema, original review IDs, content hashes, worker ID, and active lease ID.
- Failed, timed-out, rate-limited, or ambiguous reviews remain private.
- This ChatGPT-account-backed worker is suitable for an administrator-only pilot. Keep the provider contract replaceable for a future production API or local model.

## Install outline

1. Apply `oracle/20260729-storyheaven-codex-review-worker.sql`.
2. Set the Oracle API to `STORYHEAVEN_AI_REVIEW_MODE=external-worker` and deploy the matching API.
3. Install the current Codex CLI globally on `EETNA_WEB_HOON`.
4. Create the `storyreview` system account and `/var/lib/neokim-storyheaven-review`.
5. Copy this directory to `/opt/neokim-storyheaven-codex-review-worker`, create `.env`, and copy `codex/config.toml` into `$CODEX_HOME/config.toml`.
6. Authenticate Codex interactively as `storyreview`; never copy the resulting credentials into Git.
7. Install and start the systemd service.

Run `npm run check` before deployment. Use `npm run once` for a single poll after authentication.
