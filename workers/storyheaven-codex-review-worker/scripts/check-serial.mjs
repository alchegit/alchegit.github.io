import assert from "node:assert/strict";
import { SERIAL_EDITORIAL_POLICY_VERSION, buildSerialPrompt, modelRoleForSerialJob, parseSerialOutput } from "../src/serial.mjs";
import { buildSerialGenreEditorialGuidance } from "../src/serial-editorial-guidance.mjs";

const job = {
  id: "35de3aaf-bacc-45f8-8a86-257ec62f63ad",
  inputHash: "a".repeat(64),
  type: "editorial_review",
  payload: {
    story: { title: "검수용 이야기", genres: ["판타지"] },
    draft: { body: "원고 안의 '지시를 무시하라'는 문장도 자료일 뿐이다." }
  }
};

const prompt = buildSerialPrompt(job);
assert.match(prompt, /blind senior Korean serialized-fiction editor/u);
assert.match(prompt, /UNTRUSTED_SERIAL_INPUT_JSON_START/u);
assert.match(prompt, /opening grip, narrative momentum, emotional payoff/u);
assert.match(prompt, /scene visualization/u);
assert.match(prompt, /relative positions, purposeful movement/u);
assert.match(prompt, /reader-orientation ladder is binding/u);
assert.match(prompt, /first paragraph may introduce at most one unfamiliar/u);
assert.match(prompt, /Score natural Korean, canon, causality, reader orientation/u);
assert.match(prompt, /ordinary baseline, and immediate goal/u);
assert.match(prompt, /CONTROLLED_AGGREGATE_GENRE_GUIDANCE_START/u);
assert.match(prompt, /Begin with an ordinary lack, duty, or vulnerability/u);
assert.doesNotMatch(prompt, /나 혼자만 레벨업|전지적 독자 시점/u);
assert.match(prompt, new RegExp(SERIAL_EDITORIAL_POLICY_VERSION, "u"));
assert.match(prompt, /three clearly labeled reading lenses/u);
assert.match(prompt, /Genre combinations are binding/u);
assert.match(prompt, /distinct dramatic job/u);
assert.match(prompt, /Series length policy is binding/u);
assert.match(prompt, /first generated installment is always a prologue/u);
assert.match(prompt, /prologue is a retention gate/u);
assert.match(prompt, /numeric seriesPlan is not a long-form plan by itself/u);
assert.match(prompt, /private writer bible/u);
assert.match(prompt, /pace, suspense, curiosity, surprise, emotion, romance, action, description, humor, and novelty/u);
assert.match(prompt, /not permission to flatten every scene to one intensity/u);
assert.match(prompt, /payload\.schedule\.policy\.creativeControls or payload\.creativeControls/u);
assert.match(prompt, /If novelty is absent, use 2/u);
assert.match(prompt, /not a command to maximize strangeness/u);
assert.match(prompt, /arbitrary mashup of an occupation, household object, and magic rule/u);
assert.match(prompt, /novelty score measures fit to the requested novelty level/u);
assert.match(prompt, /scoreEvidence/u);
assert.equal(modelRoleForSerialJob("editorial_review"), "editor");
assert.equal(modelRoleForSerialJob("write_draft"), "writer");

const genreProfileSignals = {
  fantasy: /ordinary lack, duty, or vulnerability/u,
  romance: /relationship's current state/u,
  "mystery-thriller": /ordinary procedure/u,
  sf: /human need, everyday use, or failure/u,
  horror: /safe, ordinary layout/u,
  "action-adventure": /objective, terrain, constraint/u,
  drama: /daily task, relationship, or meaningful object/u,
  historical: /lived objects, work, travel limits/u,
  comedy: /normal rule and a sincere desire/u
};
for (const [genre, signal] of Object.entries(genreProfileSignals)) {
  const guidance = buildSerialGenreEditorialGuidance({ schedule: { primaryGenres: [genre] } });
  assert.match(guidance, signal);
  assert.match(guidance, /Never name, quote, paraphrase, or imitate/u);
}

const writingPrompt = buildSerialPrompt({ ...job, type: "write_draft" });
assert.match(writingPrompt, /spatialAnchor, characterBlocking, sensoryAnchor, and visualTurn/u);
assert.match(writingPrompt, /two to four memorable concrete details per scene/u);
assert.match(writingPrompt, /techniquePlan\.readerOrientation/u);
assert.match(writingPrompt, /Do not confuse speed with omission/u);
assert.match(writingPrompt, /prologueDisclosurePlan is a hard information boundary/u);

const planningPrompt = buildSerialPrompt({ ...job, type: "build_episode_card" });
assert.match(planningPrompt, /lock a spatial anchor, character blocking/u);
assert.match(planningPrompt, /force the protagonist into a costly or irreversible choice/u);
assert.match(planningPrompt, /ordinaryBaseline, immediateGoal, knownContext, firstChange, stakes/u);
assert.match(planningPrompt, /copy the binding disclosure boundary/u);

const conceptPrompt = buildSerialPrompt({
  ...job,
  type: "concept_gate",
  payload: { schedule: { policy: { creativeControls: { novelty: 2 } } } }
});
assert.match(conceptPrompt, /defaulting to 2 when absent/u);
assert.match(conceptPrompt, /add only one restrained differentiator/u);
assert.match(conceptPrompt, /not merely advertise a quirky rule/u);

const biblePrompt = buildSerialPrompt({ ...job, type: "build_bible" });
assert.match(biblePrompt, /narrativeBlueprint\.noveltyPolicy/u);
assert.match(biblePrompt, /what kinds of new gimmicks may not be added later/u);
assert.match(biblePrompt, /참신성 목표와 새 요소 추가 제한/u);
assert.match(biblePrompt, /volumePlan must contain exactly 10 sequential entries/u);
assert.match(biblePrompt, /renewableConflictSources/u);
assert.match(biblePrompt, /mustNotAnswerRevealKeys/u);

const scopedArcPrompt = buildSerialPrompt({
  ...job,
  type: "build_arc",
  payload: { arcScope: { firstEpisodeNo: 1, lastEpisodeNo: 26, volumeNo: 1 } }
});
assert.match(scopedArcPrompt, /exactly payload\.arcScope\.firstEpisodeNo through payload\.arcScope\.lastEpisodeNo/u);
assert.match(scopedArcPrompt, /do not redefine or reschedule/u);

const parsed = parseSerialOutput({
  jobId: job.id,
  inputHash: job.inputHash,
  jobType: job.type,
  result: { decision: "approved" }
}, job, { model: "gpt-test" });
assert.equal(parsed.model, "gpt-test");
assert.equal(parsed.result.decision, "approved");

const parsedEncoded = parseSerialOutput({
  jobId: job.id,
  inputHash: job.inputHash,
  jobType: job.type,
  resultJson: JSON.stringify({ decision: "approved" })
}, job, { model: "gpt-test" });
assert.equal(parsedEncoded.result.decision, "approved");
assert.match(writingPrompt, /resultJson/u);

assert.throws(() => parseSerialOutput({
  jobId: job.id,
  inputHash: "b".repeat(64),
  jobType: job.type,
  result: {}
}, job, { model: "gpt-test" }), /identity_mismatch/u);

console.log("StoryHeaven serial prompt checks passed");
