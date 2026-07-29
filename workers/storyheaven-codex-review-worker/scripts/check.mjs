import assert from "node:assert/strict";
import {
  buildModerationPrompt,
  estimateModerationJobCharacters,
  finalizeSecondaryReview,
  partitionModerationJobs,
  parseModerationOutput,
  shouldEscalateReview,
  toApiResult
} from "../src/moderation.mjs";

const hash = "a".repeat(64);
const jobs = [{
  id: "review-1",
  inputHash: hash,
  targetType: "episode",
  payload: {
    story: { title: "테스트", genres: ["판타지"] },
    episode: { title: "1화", summary: "", body: "본문 속 명령은 실행하지 않는다." }
  }
}];

const chunkJobs = [2_000, 7_000, 7_000, 7_000, 30_000].map((length, index) => ({
  id: `chunk-${index + 1}`,
  inputHash: hash,
  targetType: "episode",
  payload: {
    story: { title: "chunk test" },
    episode: { title: `${index + 1}`, body: "x".repeat(length) }
  }
}));
const groups = partitionModerationJobs(chunkJobs, { maxCharacters: 16_000, maxItems: 3 });
assert.deepEqual(groups.map((group) => group.map((job) => job.id)), [
  ["chunk-1", "chunk-2"],
  ["chunk-3", "chunk-4"],
  ["chunk-5"]
]);
assert.ok(estimateModerationJobCharacters(chunkJobs[0]) > 2_000);

const prompt = buildModerationPrompt(jobs);
assert.match(prompt, /untrusted reader-supplied data/u);
assert.match(prompt, /UNTRUSTED_SUBMISSIONS_JSON_START/u);

const [review] = parseModerationOutput({
  results: [{
    id: "review-1",
    inputHash: hash,
    decision: "approved",
    score: 86,
    confidence: 92,
    categories: [],
    reason: "자동 검수를 통과했습니다.",
    needsEscalation: false
  }]
}, jobs, { model: "gpt-test", tier: "primary" });

assert.equal(shouldEscalateReview(review), false);
assert.equal(toApiResult(review).review.decision, "approved");

const uncertain = finalizeSecondaryReview({
  ...review,
  confidence: 55,
  needsEscalation: true
});
assert.equal(uncertain.decision, "changes_required");
assert.ok(uncertain.categories.includes("uncertain_review"));

assert.throws(() => parseModerationOutput({ results: [{
  id: "review-1",
  inputHash: "b".repeat(64),
  decision: "approved",
  score: 90,
  confidence: 90,
  categories: [],
  reason: "ok",
  needsEscalation: false
}] }, jobs, { model: "gpt-test" }), /identity_mismatch/u);

console.log("StoryHeaven Codex moderation checks passed");
