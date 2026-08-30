# StoryHeaven Codex review worker

This private worker polls the Oracle API for leased StoryHeaven moderation jobs. It runs a low-reasoning Codex classification pass with `gpt-5.6-luna`; only rejected or low-confidence results are rechecked with `gpt-5.6-terra`. Up to ten episodes from one submission are leased together, then split in order into requests capped at six episodes and about 24,000 serialized characters. The public website never invokes Codex or a shell command directly.

When `STORYHEAVEN_SERIAL_ENGINE_ENABLED=true`, the same isolated process also handles the private serialized-fiction pipeline after the public moderation queue is empty. Planning and writing use the configured writer model; blind editorial review uses a separately configured editor model and receives only the manuscript, canon, episode card, and deterministic evidence. The editor returns separate evidence for readability, canon, causality, reader orientation, opening grip, momentum, emotional payoff, genre promise, curiosity, agency, and novelty plus three heuristic audience lenses. The Oracle API, not a human approval button and not the model, decides whether thresholds passed, whether a rewrite remains available, and whether a draft may enter the private or public queue.

The research basis for the nine controlled genre profiles and the shared opening rules is documented in [GENRE_BENCHMARKS_KO.md](./GENRE_BENCHMARKS_KO.md). The worker receives only aggregated, high-level craft guidance and never receives benchmark titles, excerpts, or instructions to imitate an author.

New concepts created under editorial policy `2026-08-09-story-development-v20` use a writer-only four-candidate pass followed by an editor-only immutable selection pass. The selected concept retains an auditable selection report, a binding story core, richer character and relationship dynamics, and causal world pressures. Episode cards rotate dramatic modes, explicit choice-cost chains, unresolved reader promises, emotional debts, and recent-pattern variation. Six isolated critic jobs inspect character, relationship, serial momentum, world causality, scene expression, and skeptical-reader risk before a final editor copies and weighs their evidence. A positive voluntary next-read verdict remains mandatory. At a later arc boundary, `replan_arc` uses the editor model to compare approved installment evidence with the protected planning horizon, then returns a constrained next-arc directive; it cannot retcon published facts, change protected elements, or introduce a replacement premise. The following writer-model arc must copy the approved architecture references and report how it applied every preserved strength and repair target. Legacy jobs and stories continue under their previous contracts without retroactive rewriting. The diagnosis, boundaries, and phased roadmap are documented in [serial-quality-v2-plan.md](../../storyheaven/serial-quality-v2-plan.md).

Editorial policy `2026-08-30-genre-voice-quality-v30` adds server-owned long-form fantasy experience presets and prose-voice presets for new schedules. Random choices resolve once. After concept selection, a private 600-900-character sample is written and independently reviewed; one correction attempt is allowed before its compact guidance is attached to the story bible. Draft jobs receive a current-volume writing brief instead of the full distant-volume plan, and critic jobs receive role-focused packets before the server reconstructs the authoritative final-review packet. Final review gates voice adherence, dialogue characterization, tone consistency, and sentence rhythm independently from basic readability. When only those style metrics fail, `line_polish` may alter sentence-level expression but the worker and API restore or verify title, summary, paragraph structure, scene ranges, canon facts, and reveal state. Legacy schedules keep their stored genre and voice. The remaining live pilot-comparison phase, non-imitation boundary, rollout gates, and test matrix are documented in [serial-quality-v3-plan.md](../../storyheaven/serial-quality-v3-plan.md).

When the queue is empty, polling backs off from 10 seconds to at most 60 seconds with a small jitter. Completing work resets the interval immediately, and `SIGTERM` interrupts idle sleep so deployments stop cleanly.

## Safety boundary

- Deterministic validation runs in the Oracle API before a job is queued.
- Manuscripts are sent to Codex over stdin and are not written to disk.
- The dedicated Codex permission profile denies filesystem reads outside the minimal runtime, disables network access and web search, disables subagents, and never asks for elevated approval.
- Results must match the JSON schema, original review IDs, content hashes, worker ID, and active lease ID.
- Serial results must additionally match the job type. The API normalizes every stage again and rejects non-sequential episode plans, impossible reveal order, malformed scene ranges, and weak editorial evidence.
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

Before enabling serial production, apply `oracle/20260731-storyheaven-serial-engine.sql` and `oracle/20260731-storyheaven-serial-narrative-dna.sql`, deploy the matching Oracle API, and set the serial flag on both services. A schedule starts only when the operator submits it as active. `test_private` never publishes; `auto_public` publishes only quality-passed episodes in strict sequence.
