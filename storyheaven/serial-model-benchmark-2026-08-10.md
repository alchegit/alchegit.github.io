# StoryHeaven serial model benchmark - 2026-08-10

## Test method

- The same preserved prologue writing job and private story bible were supplied to TERRA and SOL.
- Both drafts were judged once by the same LUNA editorial-review prompt.
- Token usage came from Codex JSONL usage events. Prices are the OpenAI model prices published on 2026-08-10.
- This is a one-pair operational benchmark, not a statistically complete model evaluation.

## Result

| Writer | Writer tokens (in/out) | Review tokens (in/out) | Total time | Mean of 16 scores | First decision | Estimated total |
| --- | ---: | ---: | ---: | ---: | --- | ---: |
| TERRA | 45,056 / 3,019 | 45,790 / 3,072 | 118.5s | 91.06 | rewrite required | $0.139184 |
| SOL | 45,056 / 4,898 | 46,873 / 3,957 | 231.5s | 93.25 | rewrite required | $0.386343 |

SOL improved the mean score by 2.19 points and causality from 84 to 92. It was 1.95 times slower and the writer-plus-review estimate was 2.78 times higher. Both variants still needed at least one correction, so replacing every TERRA call with SOL would not remove the review loop.

## Production policy

1. Use TERRA for planning, first drafts, and the first targeted rewrite.
2. Use SOL for `rewrite_draft` from rewrite number 2 onward. This spends the stronger model only after a real editorial failure shows that TERRA did not resolve a structural issue.
3. Keep LUNA for independent critic roles and the final editorial aggregation.
4. On the first draft, run the six independent roles: character, relationship, serial momentum, world causality, scene expression, and skeptical reader.
5. After a rewrite, rerun only failed or mixed roles plus the skeptical-reader role. Carry forward prior strong panels.
6. Approve automatically when deterministic Korean QA and safety pass, every numeric threshold passes, and the reviewer would read the next installment. Review notes remain visible, but only a blocked result, a safety or deterministic failure, or a failed numeric gate prevents approval; an inconsistent issue label cannot create an endless rewrite loop by itself.

## Incident finding

The stopped prologue did not fail because TERRA wrote invalid prose. One LUNA critic returned an outer `jobId`/`inputHash` envelope that differed from the leased queue identity. The API correctly rejected it, but three retries repeated the same transport-envelope mistake and marked the run as a system error. The worker now treats the leased API identity as authoritative while the API still validates the completion request against that lease.

The apparent one-hour production time combined about 21 minutes of real initial planning, drafting, and review with earlier bible-contract retries, operator waiting, and a 7m46s retry stall. The two-hour cadence is the delay between completed production batches, not a timeout granted to each AI step.

The release scheduler also used the legacy day-based cadence field even when the operator selected a minute-based interval. It now reads `CADENCE_MINUTES`, so a two-hour setting schedules the pilot installments 120 minutes apart instead of one day apart.

## References

- OpenAI latest-model guide: https://developers.openai.com/api/docs/guides/latest-model
- OpenAI model comparison and pricing: https://developers.openai.com/api/docs/models/compare
- OpenAI TERRA model page: https://developers.openai.com/api/docs/models/gpt-5.6-terra
