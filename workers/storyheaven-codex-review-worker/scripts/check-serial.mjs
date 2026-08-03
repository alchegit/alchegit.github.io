import assert from "node:assert/strict";
import { SERIAL_EDITORIAL_POLICY_VERSION, buildSerialJsonRepairPrompt, buildSerialPrompt, modelRoleForSerialJob, parseSerialOutput } from "../src/serial.mjs";
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
assert.match(prompt, /legacy story created without the new private seriesArchitecture/u);
assert.doesNotMatch(prompt, /Every newly generated story must build a complete seriesArchitecture/u);
assert.match(prompt, /pace, suspense, curiosity, surprise, emotion, romance, action, description, humor, and novelty/u);
assert.match(prompt, /not permission to flatten every scene to one intensity/u);
assert.match(prompt, /payload\.schedule\.policy\.creativeControls or payload\.creativeControls/u);
assert.match(prompt, /If novelty is absent, use 2/u);
assert.match(prompt, /not a command to maximize strangeness/u);
assert.match(prompt, /arbitrary mashup of an occupation, household object, and magic rule/u);
assert.match(prompt, /novelty score measures fit to the requested novelty level/u);
assert.match(prompt, /character attachment, relationship momentum, reader reward, premise accessibility/u);
assert.match(prompt, /competence and generic kindness alone do not qualify/u);
assert.match(prompt, /exposition helper who simply cooperates does not qualify/u);
assert.match(prompt, /at least two concrete on-page payoffs/u);
assert.match(prompt, /after all invented terms are removed/u);
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
  assert.match(guidance, /at least two concrete payoffs and move one important relationship/u);
  assert.match(guidance, /after invented nouns and rules are removed/u);
}
assert.match(
  buildSerialGenreEditorialGuidance({ schedule: { primaryGenres: ["fantasy"] } }),
  /rather than mirroring the protagonist's former chore as a matching fantasy job/u
);

const writingPrompt = buildSerialPrompt({ ...job, type: "write_draft" });
assert.match(writingPrompt, /spatialAnchor, characterBlocking, sensoryAnchor, and visualTurn/u);
assert.match(writingPrompt, /two to four memorable concrete details per scene/u);
assert.match(writingPrompt, /techniquePlan\.readerOrientation/u);
assert.match(writingPrompt, /techniquePlan\.readerRewardPlan/u);
assert.match(writingPrompt, /at least two concrete reader payoffs/u);
assert.match(writingPrompt, /Do not confuse speed with omission/u);
assert.match(writingPrompt, /prologueDisclosurePlan is a hard information boundary/u);

const planningPrompt = buildSerialPrompt({ ...job, type: "build_episode_card" });
assert.match(planningPrompt, /lock a spatial anchor, character blocking/u);
assert.match(planningPrompt, /force the protagonist into a costly or irreversible choice/u);
assert.match(planningPrompt, /techniquePlan\.readerOrientation and techniquePlan\.readerRewardPlan/u);
assert.match(planningPrompt, /ordinaryBaseline[\s\S]*immediateGoal[\s\S]*knownContext[\s\S]*firstChange[\s\S]*stakes/u);
assert.match(planningPrompt, /do not force a catastrophe into the first two paragraphs/u);
assert.match(planningPrompt, /copy the binding disclosure boundary/u);

const conceptPrompt = buildSerialPrompt({
  ...job,
  type: "concept_gate",
  payload: { schedule: { policy: { creativeControls: { novelty: 2 } } } }
});
assert.match(conceptPrompt, /defaulting to 2 when absent/u);
assert.match(conceptPrompt, /add only one restrained differentiator/u);
assert.match(conceptPrompt, /not merely advertise a quirky rule/u);
assert.match(conceptPrompt, /single narrative description shown on the public story-detail page/u);
assert.match(conceptPrompt, /opening-plot summary/u);
assert.match(conceptPrompt, /Never mention total volumes or episodes/u);
assert.match(conceptPrompt, /only in internalPlanningSummary/u);
assert.match(conceptPrompt, /상세 페이지용 초반 줄거리 요약 100-700자/u);
assert.match(conceptPrompt, /비공개 작가용 장기 기획 100-4000자/u);
assert.match(conceptPrompt, /A premiseAudit is mandatory/u);
assert.match(conceptPrompt, /A readerAppealPlan is mandatory/u);
assert.match(conceptPrompt, /silently develop several genuinely different premise skeletons/u);
assert.match(conceptPrompt, /payload\.recentConcepts/u);
assert.match(conceptPrompt, /Inspect at least five recent concepts/u);
assert.match(conceptPrompt, /return comparedTitles as \[\] and nearestTitle as 'none'/u);
assert.match(conceptPrompt, /diligent student, a matching otherworldly administrative chore/u);
assert.match(conceptPrompt, /humanPremise without invented nouns or rules/u);
assert.match(conceptPrompt, /recentConceptComparison/u);
assert.match(conceptPrompt, /주인공의 공감 가능한 결핍/u);
assert.match(conceptPrompt, /growth\|problem_solving\|relationship\|mystery/u);
assert.match(conceptPrompt, /real-world task directly into the matching fantasy job/u);
assert.match(conceptPrompt, /usesMatchingTaskTransfer must be false/u);
assert.match(conceptPrompt, /nameKnownBeforeIntroduction/u);
assert.match(conceptPrompt, /hasMultiStepTrigger must be false/u);
assert.match(conceptPrompt, /현지인이 이름을 알게 되는 출처와 시점/u);

const recentConceptPrompt = buildSerialPrompt({
  ...job,
  type: "concept_gate",
  payload: {
    schedule: { policy: { creativeControls: { novelty: 2 } } },
    recentConcepts: Array.from({ length: 5 }, (_, index) => ({ title: `최근 작품 ${index + 1}` }))
  }
});
assert.match(recentConceptPrompt, /최소 5개 또는 전체/u);
assert.match(recentConceptPrompt, /최근 작품 5/u);

const premiseAudit = {
  entryType: "transported",
  usesMatchingTaskTransfer: false,
  priorLifeSkillRelation: "indirect",
  transitionCause: "검증용 전환 원인",
  localReception: "검증용 현지 반응",
  immediateAcceptance: false,
  nameKnowledgeRule: "직접 소개한 뒤 이름을 안다",
  nameKnownBeforeIntroduction: false,
  languageRule: "초기에는 통역이 필요하다",
  firstAcceptanceCondition: "눈앞의 위험을 함께 막는다",
  familiarGenreFoundation: "정통 이세계 모험",
  differentiator: "선택의 대가",
  abilityPlan: {
    mode: "familiar",
    coreAbility: "방어 마법",
    activation: "짧은 주문",
    costOrLimit: "체력 소모",
    extraRuleCount: 0,
    hasMultiStepTrigger: false,
    readerExplanation: "주문하면 방어막이 생기고 체력이 줄어든다."
  }
};

const readerAppealPlan = {
  humanPremise: "가족을 지키려다 혼자 책임지는 사람이 타인을 믿는 법을 배우는 이야기",
  relatableLack: "도움을 청하지 못하는 죄책감",
  immediateWant: "사라진 가족의 첫 단서를 찾는다",
  personalStake: "실패하면 가족의 기억과 동료의 신뢰를 잃는다",
  flawedChoicePattern: "상의하지 않고 자신이 모든 대가를 치른다",
  firstRelationshipFriction: "정보를 숨기는 동료와 기록을 요구하는 주인공이 충돌한다",
  dominantPleasure: "mystery",
  familiarGenreRewards: ["공정한 단서 추리", "금지 규칙 돌파"],
  prologueRewards: ["첫 사건 해결", "불신하던 동료의 제한적 협력"],
  earlyEpisodePlan: [
    { installment: "prologue", concreteGoal: "첫 사건을 해결한다", genreReward: "금지 규칙을 시험한다", relationshipChange: "적대에서 감시로 바뀐다", personalConsequence: "기억 하나를 잃는다" },
    { installment: "main-1", concreteGoal: "첫 단서를 확인한다", genreReward: "단서를 추리한다", relationshipChange: "정보를 하나씩 교환한다", personalConsequence: "도움이 필요함을 인정한다" },
    { installment: "main-2", concreteGoal: "위기에 빠진 사람을 구한다", genreReward: "규칙의 빈틈을 활용한다", relationshipChange: "판단을 한 번 믿어 준다", personalConsequence: "비밀이 외부에 드러난다" }
  ],
  recentConceptComparison: {
    comparedTitles: ["최근 작품"],
    nearestTitle: "최근 작품",
    overlapAxisCount: 1,
    usesRecentTemplate: false,
    repeatedPatternsToAvoid: ["현실 업무의 이세계 복제", "오래된 전쟁 음모만 남기는 결말"],
    structuralDifferences: ["성인 노동자 주인공", "움직이는 도시 무대", "가족 관계 중심 미스터리"],
    fingerprint: { protagonistFrame: "worker", openingMode: "quiet_anomaly", episodeEngine: "mystery_investigation", storyArena: "journey", powerSource: "artifact", oppositionType: "mystery" }
  }
};

const biblePrompt = buildSerialPrompt({ ...job, type: "build_bible", payload: { concept: { premiseAudit, readerAppealPlan } } });
assert.match(biblePrompt, /numeric seriesPlan is not a long-form plan by itself/u);
assert.match(biblePrompt, /Every newly generated story must build a complete seriesArchitecture before its prologue is planned/u);
assert.match(biblePrompt, /private writer bible/u);
assert.match(biblePrompt, /narrativeBlueprint\.noveltyPolicy/u);
assert.match(biblePrompt, /what kinds of new gimmicks may not be added later/u);
assert.match(biblePrompt, /참신성 목표와 새 요소 추가 제한/u);
assert.match(biblePrompt, /volumePlan must contain exactly 10 sequential entries/u);
assert.match(biblePrompt, /Every characterArc must contain at least 3 milestones/u);
assert.match(biblePrompt, /Every characterArc id and every milestone id must be globally unique/u);
assert.match(biblePrompt, /cover every volume from 1 through 10/u);
assert.match(biblePrompt, /strictly less than payoffVolume/u);
assert.match(biblePrompt, /never include payoffVolume itself/u);
assert.match(biblePrompt, /renewableConflictSources/u);
assert.match(biblePrompt, /mustNotAnswerRevealKeys/u);
assert.match(biblePrompt, /each character knowledge list must state whether and how/u);
assert.match(biblePrompt, /unearned acceptance, unexplained name use/u);
assert.match(biblePrompt, /Turn the lack, want, stake, flawed choice pattern/u);
assert.match(biblePrompt, /long mystery may deepen the story but may not be its only continuation reason/u);

const auditedPlanningPrompt = buildSerialPrompt({
  ...job,
  type: "build_episode_card",
  payload: { bible: { concept: { premiseAudit, readerAppealPlan } } }
});
assert.match(auditedPlanningPrompt, /In knowledgeBefore, record by character/u);
assert.match(auditedPlanningPrompt, /move visibly toward firstAcceptanceCondition/u);
assert.match(auditedPlanningPrompt, /Complete techniquePlan\.readerRewardPlan before scenes/u);
assert.match(auditedPlanningPrompt, /relationshipAfter must materially differ/u);

const auditedWritingPrompt = buildSerialPrompt({
  ...job,
  type: "write_draft",
  payload: { bible: { concept: { premiseAudit, readerAppealPlan } } }
});
assert.match(auditedWritingPrompt, /check whether its speaker has learned the protagonist's name/u);
assert.match(auditedWritingPrompt, /ordinary label, question, or omission/u);
assert.match(auditedWritingPrompt, /Do not reduce supporting characters to cooperative exposition/u);

const auditedReviewPrompt = buildSerialPrompt({
  ...job,
  type: "editorial_review",
  payload: { bible: { concept: { premiseAudit, readerAppealPlan } } }
});
assert.match(auditedReviewPrompt, /unearned immediate acceptance of an outsider/u);
assert.match(auditedReviewPrompt, /multi-step unrelated ability trigger/u);
assert.match(auditedReviewPrompt, /Compare the manuscript to techniquePlan\.readerRewardPlan/u);
assert.match(auditedReviewPrompt, /High characterAttachment requires/u);
assert.match(auditedReviewPrompt, /High relationshipMomentum requires/u);
assert.match(auditedReviewPrompt, /High readerReward requires/u);
assert.match(auditedReviewPrompt, /High premiseAccessibility requires/u);

const appealArcPrompt = buildSerialPrompt({
  ...job,
  type: "build_arc",
  payload: { concept: { readerAppealPlan }, arcScope: { firstEpisodeNo: 1, lastEpisodeNo: 3, volumeNo: 1 } }
});
assert.match(appealArcPrompt, /Preserve the exact prologue, main-1, and main-2 reward commitments/u);
assert.match(appealArcPrompt, /setup and conspiracy hints only/u);

const appealRewritePrompt = buildSerialPrompt({
  ...job,
  type: "rewrite_draft",
  payload: { bible: { concept: { premiseAudit, readerAppealPlan } } }
});
assert.match(appealRewritePrompt, /Repair generic altruism with a specific personal consequence/u);
assert.match(appealRewritePrompt, /Do not solve a weak episode by adding another rule/u);
assert.match(appealRewritePrompt, /When readerReward fails/u);

const scopedArcPrompt = buildSerialPrompt({
  ...job,
  type: "build_arc",
  payload: {
    arcScope: { firstEpisodeNo: 1, lastEpisodeNo: 26, volumeNo: 1 },
    bible: {
      narrativeBlueprint: {
        seriesArchitecture: { schemaVersion: "2026-08-03-v1", volumePlan: [{ volumeNo: 1 }] }
      }
    }
  }
});
assert.match(scopedArcPrompt, /exactly payload\.arcScope\.firstEpisodeNo through payload\.arcScope\.lastEpisodeNo/u);
assert.match(scopedArcPrompt, /do not redefine or reschedule/u);

const legacyArcPrompt = buildSerialPrompt({
  ...job,
  type: "build_arc",
  payload: {
    arcScope: { firstEpisodeNo: 27, lastEpisodeNo: 50, volumeNo: 2 },
    bible: { narrativeBlueprint: {} },
    priorArcs: [{ arcNo: 1 }],
    canon: [{ canonKey: "legacy-rule" }]
  }
});
assert.match(legacyArcPrompt, /legacy story created without the new private seriesArchitecture/u);
assert.match(legacyArcPrompt, /do not retrofit, infer, or generate a replacement full-series architecture/u);
assert.match(legacyArcPrompt, /may be empty when no stable architecture keys exist/u);
assert.doesNotMatch(legacyArcPrompt, /seriesArchitecture as binding: advance/u);

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

const repairedEncoded = parseSerialOutput({
  jobId: job.id,
  inputHash: job.inputHash,
  jobType: job.type,
  resultJson: '{"decision":"approved" "scores":{}}'
}, job, { model: "gpt-test" });
assert.equal(repairedEncoded.result.decision, "approved");
assert.deepEqual(repairedEncoded.result.scores, {});
const repairPrompt = buildSerialJsonRepairPrompt("malformed-output", job);
assert.match(repairPrompt, /Repair only JSON punctuation and escaping/u);
assert.match(repairPrompt, /JSON\.parse\(resultJson\) also succeeds/u);
assert.match(repairPrompt, new RegExp(job.id, "u"));

assert.throws(() => parseSerialOutput({
  jobId: job.id,
  inputHash: "b".repeat(64),
  jobType: job.type,
  result: {}
}, job, { model: "gpt-test" }), /identity_mismatch/u);

console.log("StoryHeaven serial prompt checks passed");
