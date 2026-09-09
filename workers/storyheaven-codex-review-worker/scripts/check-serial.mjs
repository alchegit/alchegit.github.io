import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { SERIAL_EDITORIAL_POLICY_VERSION, SERIAL_JOB_TYPES, buildSerialJsonRepairPrompt, buildSerialPrompt, mergeCodexUsage, modelRoleForSerialJob, parseCodexJsonlUsage, parseSerialOutput, selectSerialModel } from "../src/serial.mjs";
import { buildSerialGenreEditorialGuidance } from "../src/serial-editorial-guidance.mjs";

const serialSchema = JSON.parse(await readFile(fileURLToPath(new URL("../schemas/serial-result.schema.json", import.meta.url)), "utf8"));
assert.deepEqual(
  [...serialSchema.properties.jobType.enum].sort(),
  [...SERIAL_JOB_TYPES].sort(),
  "Every accepted serial stage must also be allowed by the Codex structured-output schema."
);

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
assert.match(buildSerialPrompt({ ...job, type: "rewrite_draft" }), /counted after removing ALL whitespace/u);
assert.match(buildSerialPrompt({ ...job, type: "rewrite_draft" }), /surgical-edit rule does not require preserving an undersized draft/u);
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
assert.match(prompt, /Korean semantic agreement is a publication gate/u);
assert.match(prompt, /An impossible subject-predicate pairing/u);
assert.match(prompt, /do not approve the draft while any such sentence remains/u);
assert.match(prompt, /scoreEvidence/u);
assert.equal(modelRoleForSerialJob("editorial_review"), "editor");
assert.equal(modelRoleForSerialJob("editorial_critique"), "editor");
assert.equal(modelRoleForSerialJob("concept_selection"), "editor");
assert.equal(modelRoleForSerialJob("voice_review"), "editor");
assert.equal(modelRoleForSerialJob("replan_arc"), "editor");
assert.equal(modelRoleForSerialJob("concept_candidates"), "writer");
assert.equal(modelRoleForSerialJob("voice_sample"), "writer");
assert.equal(modelRoleForSerialJob("line_polish"), "writer");
assert.equal(modelRoleForSerialJob("revise_episode_card"), "writer");
assert.equal(modelRoleForSerialJob("write_draft"), "writer");
const serialModels = { writerModel: "gpt-5.6-terra", editorModel: "gpt-5.6-luna", escalationModel: "gpt-5.6-sol" };
assert.equal(selectSerialModel({ type: "write_draft", payload: {} }, serialModels), "gpt-5.6-terra");
assert.equal(selectSerialModel({ type: "rewrite_draft", payload: { rewriteNumber: 1 } }, serialModels), "gpt-5.6-terra");
assert.equal(selectSerialModel({ type: "rewrite_draft", payload: { rewriteNumber: 2 } }, serialModels), "gpt-5.6-sol");
assert.equal(selectSerialModel({ type: "editorial_review", payload: { rewriteNumber: 9 } }, serialModels), "gpt-5.6-luna");
assert.equal(selectSerialModel({ type: "voice_sample", payload: {} }, serialModels), "gpt-5.6-terra");
assert.equal(selectSerialModel({ type: "voice_review", payload: {} }, serialModels), "gpt-5.6-luna");
assert.equal(selectSerialModel({ type: "line_polish", payload: { rewriteNumber: 1 } }, serialModels), "gpt-5.6-terra");
assert.equal(selectSerialModel({ type: "revise_episode_card", payload: {} }, serialModels), "gpt-5.6-sol");

const draftPrompt = buildSerialPrompt({ ...job, type: "write_draft" });
assert.match(draftPrompt, /silent sentence-by-sentence subject-predicate pass/u);
assert.match(draftPrompt, /집은 부서졌다/u);
assert.match(draftPrompt, /writingBrief as the primary one-page assignment/u);
assert.match(draftPrompt, /never expand the brief with unused distant-volume lore/u);
const rewritePrompt = buildSerialPrompt({ ...job, type: "rewrite_draft" });
assert.match(rewritePrompt, /semantic_predicate_mismatch/u);
assert.match(rewritePrompt, /surgical copy edit/u);
assert.match(rewritePrompt, /preserve unaffected scenes and paragraphs verbatim/u);
assert.match(rewritePrompt, /subject-agent-object-predicate check/u);
assert.match(rewritePrompt, /payload\.writingBrief/u);
const linePolishPrompt = buildSerialPrompt({ ...job, type: "line_polish", payload: { writingBrief: {}, draft: { body: "원문" } } });
assert.match(linePolishPrompt, /prose-only local polish/u);
assert.match(linePolishPrompt, /Preserve title, summary, paragraph count and boundaries/u);
assert.match(linePolishPrompt, /Do not add or remove a paragraph, event, fact, action, speaker turn/u);
assert.match(linePolishPrompt, /Run the silent subject-agent-object-predicate check/u);
const cardRepairPrompt = buildSerialPrompt({
  ...job,
  type: "revise_episode_card",
  payload: { currentCard: {}, editor: { issues: [] }, bible: { concept: { storyCore: {} } } }
});
assert.match(cardRepairPrompt, /senior structural editor after prose rewrites failed/u);
assert.match(cardRepairPrompt, /Copy payload\.currentCard\.continuityMemoryPlan exactly/u);
assert.match(cardRepairPrompt, /opponent, witness, enforcer, or nearby person is not automatically/u);
assert.match(cardRepairPrompt, /server supersedes the prior card and writes a fresh draft/u);

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
assert.match(planningPrompt, /Return at least one ruleApplicationProof/u);
assert.match(planningPrompt, /eligibilityEvidence must be an observable existing fact/u);

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
assert.match(conceptPrompt, /targetType, eligibilityRule, requiredEvidence, and forbiddenInference are mandatory/u);
assert.match(conceptPrompt, /enemy, witness, enforcer, nearby person/u);
assert.match(conceptPrompt, /현지인이 이름을 알게 되는 출처와 시점/u);
assert.match(conceptPrompt, /developmentRoom and storyCore are mandatory/u);
assert.match(conceptPrompt, /exactly four genuinely different candidates/u);
assert.match(conceptPrompt, /character magnetism, emotional engine, scene potential/u);
assert.match(conceptPrompt, /selected candidate must have the highest average score/u);
assert.match(conceptPrompt, /작품을 움직이는 인간적 감정/u);
assert.match(conceptPrompt, /candidate-4/u);

const genrePreset = {
  requestedId: "curated-long-fantasy-random",
  resolvedId: "game-progression-adventure-v1",
  version: "2026-08-30",
  label: "게임 모험 성장",
  experience: {
    corePromise: "분명한 목표와 규칙 아래 작은 성취가 능력·관계·지위와 다음 선택지를 누적해서 바꾼다.",
    recurringRewards: ["퀘스트 해결", "희귀 발견", "기술 숙련", "동료 협력"],
    progressionRule: "수치 상승은 새로운 행동과 관계와 사회적 결과로 체감되게 한다.",
    arcVariationRule: "탐험·제작·거래·협동·경쟁·방어를 번갈아 사용한다.",
    forbiddenShortcuts: ["상태창이 장면을 대신하는 설명", "사용 결과 없는 보상 수치"]
  }
};
const proseStyle = {
  requestedId: "light-witty-v1",
  resolvedId: "light-witty-v1",
  version: "2026-08-30",
  label: "가볍고 유쾌한 몰입형",
  lockedStyle: {
    narratorDistance: "주인공의 판단과 감각에 가까운 제한적 서술을 유지한다.",
    sentenceRhythm: "짧은 행동문 뒤 선택의 감정적 결과에는 한 호흡의 여유를 준다.",
    vocabulary: "중학생도 문맥에서 바로 이해할 생활어와 정확한 보통말을 우선한다.",
    dialogueRange: [30, 48],
    humorSource: "욕망, 허점, 체면과 관계의 엇갈림에서 웃음을 만든다.",
    descriptionRule: "행동과 판단을 바꾸는 구체물만 골라 보여준다.",
    emotionRule: "감정을 선언하기 전에 반응과 선택의 변화를 보여준다.",
    forbiddenHabits: ["매 문단 농담", "손실을 농담으로 무효화"]
  }
};
const genreStyleConceptPrompt = buildSerialPrompt({
  ...job,
  type: "concept_gate",
  payload: { schedule: { policy: { creativeControls: { novelty: 2 }, genrePreset, proseStyle } } }
});
assert.match(genreStyleConceptPrompt, /server-locked long-form genre experience/u);
assert.match(genreStyleConceptPrompt, /game-progression-adventure-v1/u);
assert.match(genreStyleConceptPrompt, /genreExperiencePlan/u);
assert.match(genreStyleConceptPrompt, /server-locked prose style/u);
assert.match(genreStyleConceptPrompt, /가볍고 유쾌한 몰입형/u);
assert.match(genreStyleConceptPrompt, /quietEpisodePleasure/u);
assert.doesNotMatch(genreStyleConceptPrompt, /가즈나이트|눈물을 마시는 새|묵향|더 로그|템빨|달빛조각사/u);
const voiceSamplePrompt = buildSerialPrompt({
  ...job,
  type: "voice_sample",
  payload: { concept: { title: "검수용 기획", storyCore: {} }, genrePreset, proseStyle, voiceAttempt: 1 }
});
assert.match(voiceSamplePrompt, /private Korean prose-voice audition of 600-900 readable characters/u);
assert.match(voiceSamplePrompt, /not the prologue and must never be published or copied/u);
assert.doesNotMatch(voiceSamplePrompt, /first generated installment is always a prologue/u);
assert.match(voiceSamplePrompt, /"sampleBody"/u);
const correctedVoiceSamplePrompt = buildSerialPrompt({
  ...job,
  type: "voice_sample",
  payload: { concept: { title: "검수용 기획", storyCore: {} }, genrePreset, proseStyle, voiceAttempt: 2, voiceFeedback: { corrections: ["대화 목적을 분리한다.", "같은 종결을 줄인다."] } }
});
assert.match(correctedVoiceSamplePrompt, /single correction attempt/u);
assert.match(correctedVoiceSamplePrompt, /대화 목적을 분리한다/u);
const voiceReviewPrompt = buildSerialPrompt({
  ...job,
  type: "voice_review",
  payload: { concept: { title: "검수용 기획", storyCore: {} }, genrePreset, proseStyle, voiceSample: { sampleBody: "비공개 샘플" }, voiceAttempt: 1 }
});
assert.match(voiceReviewPrompt, /independent Korean prose editor/u);
assert.match(voiceReviewPrompt, /Approve only when every supplied style threshold is met/u);
assert.match(voiceReviewPrompt, /"dialogueCharacterization"/u);

const candidatePrompt = buildSerialPrompt({
  ...job,
  type: "concept_candidates",
  payload: { schedule: { policy: { creativeControls: { novelty: 2 } } }, recentConcepts: [] }
});
assert.match(candidatePrompt, /exactly four original Korean long-form series candidates/u);
assert.match(candidatePrompt, /simple long-term human desire/u);
assert.match(candidatePrompt, /opponents and companions want things that would still matter/u);
assert.match(candidatePrompt, /Do not choose, rank, title the final work/u);
assert.match(candidatePrompt, /candidate-4/u);

const selectionPrompt = buildSerialPrompt({
  ...job,
  type: "concept_selection",
  payload: {
    schedule: { policy: { creativeControls: { novelty: 2 } } },
    developmentCandidates: [{ candidateId: "candidate-1" }],
    recentConcepts: []
  }
});
assert.match(selectionPrompt, /senior commissioning editor/u);
assert.match(selectionPrompt, /immutable candidates/u);
assert.match(selectionPrompt, /Do not invent a fifth candidate/u);
assert.match(selectionPrompt, /Do not reproduce developmentRoom\.candidates/u);
assert.match(selectionPrompt, /server attaches the authoritative slate/u);

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
    readerExplanation: "주문하면 방어막이 생기고 체력이 줄어든다.",
    targetType: "person",
    eligibilityRule: "시야 안에서 주문자가 이름을 직접 부른 한 사람만 방어막의 보호 대상이 된다.",
    requiredEvidence: "주문자가 상대를 보고 이름을 부르는 행동이 방어막 생성보다 먼저 원고에 나타나야 한다.",
    forbiddenInference: "가까이 있거나 같은 편이라는 이유만으로 이름을 부르지 않은 사람까지 보호할 수 없다."
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

const storyCore = {
  readerFantasy: "위험한 길을 통과해 다른 사람의 마지막 목적지를 찾아 주는 체험",
  emotionalCore: "가족을 기억하려는 사랑과 책임을 혼자 지려는 죄책감의 충돌",
  protagonistContradiction: "남을 지키는 책임감이 도움을 거부하고 자신을 희생하게 만든다",
  centralRelationship: "기록을 원하는 주인공과 기록을 숨겨야 하는 동료가 서로 필요하다",
  worldPressure: "도시가 외면한 책임이 승객과 정류장의 문제로 계속 돌아온다",
  repeatableStoryEngine: "한 사건의 선택과 대가가 관계의 빚과 다음 사건을 함께 만든다",
  signaturePromise: "매 운행에서 사건을 해결하고 실제 대가를 치르며 가족의 단서에 접근한다",
  thematicQuestion: "책임을 잊는 일과 기억하며 나누는 일 중 무엇이 사람을 지키는가",
  proofOfConceptScene: "가족의 목소리 기억을 잃고 승객을 구한 뒤 불신하던 동료가 기록 일부를 건넨다",
  longTailSources: ["승객의 서로 다른 선택", "운수 회사의 기록 통제", "동료와 쌓이는 정보의 빚"]
};

const biblePrompt = buildSerialPrompt({ ...job, type: "build_bible", payload: { concept: { premiseAudit, readerAppealPlan, storyCore } } });
assert.match(biblePrompt, /numeric seriesPlan is not a long-form plan by itself/u);
assert.match(biblePrompt, /Every newly generated story must build a complete directional seriesArchitecture before its prologue is planned/u);
assert.match(biblePrompt, /planningHorizon makes volume 1 detailed, volumes 2-3 directional/u);
assert.match(biblePrompt, /private writer bible/u);
assert.match(biblePrompt, /narrativeBlueprint\.noveltyPolicy/u);
assert.match(biblePrompt, /what kinds of new gimmicks may not be added later/u);
assert.match(biblePrompt, /중심 차별점 하나의 인물·사회적 결과만 깊게 변주한다/u);
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
assert.match(biblePrompt, /Every major character must have a misbelief/u);
assert.match(biblePrompt, /Every development field from misbelief through changeResistance must be a concrete description of at least 10 characters/u);
assert.match(biblePrompt, /Build a relationshipWeb/u);
assert.match(biblePrompt, /Build worldDynamics/u);
assert.match(biblePrompt, /at least three causal worldDynamics/u);
assert.match(biblePrompt, /possibleShift must name the triggering choice/u);
assert.match(biblePrompt, /force is a concrete 2-240 character name or label/u);
assert.match(biblePrompt, /world-force-3/u);
assert.match(biblePrompt, /conflict-stable-key-5/u);
assert.match(biblePrompt, /series-reveal-stable-key-4/u);
assert.match(biblePrompt, /character-2-volume-10/u);
assert.match(biblePrompt, /"directionalThroughVolume":3/u);
assert.match(biblePrompt, /행동으로 확인할 핵심 규칙/u);
assert.match(biblePrompt, /기존 전제와 복선을 지키는 확장 규칙 4/u);
assert.doesNotMatch(biblePrompt, /"openingModes":\["3-7개 도입 방식"\]/u);
assert.match(biblePrompt, /later volume entries are revisable hypotheses/u);
const styledBiblePrompt = buildSerialPrompt({
  ...job,
  type: "build_bible",
  payload: { concept: { premiseAudit, readerAppealPlan, storyCore, genrePreset, genreExperiencePlan: { recurringRewards: genrePreset.experience.recurringRewards } }, genrePreset, proseStyle }
});
assert.match(styledBiblePrompt, /Build the story-specific voiceProfile inside this locked range/u);
assert.match(styledBiblePrompt, /Do not output proseStyle, styleContractId, or calibration/u);
assert.match(styledBiblePrompt, /dialogue percentage range: \[30,48\]/iu);
assert.match(biblePrompt, /각자 혼자서는 얻을 수 없는 정보와 행동력이 필요하다/u);
assert.match(biblePrompt, /실제 장면에서 행동과 결과로 증명할 수 있는 능숙한 기술이나 판단/u);
assert.match(biblePrompt, /laterVolumesAreHypotheses/u);

const retryBiblePrompt = buildSerialPrompt({
  ...job,
  type: "build_bible",
  attemptCount: 2,
  previousErrorCode: "review_api_422_serial_world_dynamic_force_invalid",
  payload: { concept: { premiseAudit, readerAppealPlan, storyCore } }
});
assert.match(retryBiblePrompt, /previous result failed validation/u);
assert.match(retryBiblePrompt, /Short proper labels such as '왕실' are valid/u);
assert.doesNotMatch(biblePrompt, /previous result failed validation/u);

const conflictRetryBiblePrompt = buildSerialPrompt({
  ...job,
  type: "build_bible",
  attemptCount: 2,
  previousErrorCode: "review_api_422_serial_architecture_conflicts_invalid",
  payload: { concept: { premiseAudit, readerAppealPlan, storyCore } }
});
assert.match(conflictRetryBiblePrompt, /at least five entries with five distinct non-empty keys/u);
assert.match(conflictRetryBiblePrompt, /use every key in at least one volumePlan\.conflictSourceKeys/u);

const competenceRetryBiblePrompt = buildSerialPrompt({
  ...job,
  type: "build_bible",
  attemptCount: 3,
  previousErrorCode: "review_api_422_serial_character_competence_invalid",
  payload: { concept: { premiseAudit, readerAppealPlan, storyCore } }
});
assert.match(competenceRetryBiblePrompt, /characters\[\]\.competence value must be a concrete 10-300 character description/u);
assert.match(competenceRetryBiblePrompt, /Do not return a short category label/u);

const auditedPlanningPrompt = buildSerialPrompt({
  ...job,
  type: "build_episode_card",
  payload: { bible: { concept: { premiseAudit, readerAppealPlan, storyCore } } }
});
assert.match(auditedPlanningPrompt, /In knowledgeBefore, record by character/u);
assert.match(auditedPlanningPrompt, /move visibly toward firstAcceptanceCondition/u);
assert.match(auditedPlanningPrompt, /Complete techniquePlan\.readerRewardPlan before scenes/u);
assert.match(auditedPlanningPrompt, /relationshipAfter must materially differ/u);
assert.match(auditedPlanningPrompt, /Select one episodeMode/u);
assert.match(auditedPlanningPrompt, /Complete dramaticCore as desire, obstacle, choice, cost/u);

const auditedWritingPrompt = buildSerialPrompt({
  ...job,
  type: "write_draft",
  payload: { bible: { concept: { premiseAudit, readerAppealPlan, storyCore } } }
});
assert.match(auditedWritingPrompt, /check whether its speaker has learned the protagonist's name/u);
assert.match(auditedWritingPrompt, /ordinary label, question, or omission/u);
assert.match(auditedWritingPrompt, /Do not reduce supporting characters to cooperative exposition/u);
assert.match(auditedWritingPrompt, /Follow episodeCard\.episodeMode and dramaticCore/u);

const auditedReviewPrompt = buildSerialPrompt({
  ...job,
  type: "editorial_review",
  payload: { bible: { concept: { premiseAudit, readerAppealPlan, storyCore } } }
});
assert.match(auditedReviewPrompt, /unearned immediate acceptance of an outsider/u);
assert.match(auditedReviewPrompt, /multi-step unrelated ability trigger/u);
assert.match(auditedReviewPrompt, /Compare the manuscript to techniquePlan\.readerRewardPlan/u);
assert.match(auditedReviewPrompt, /High characterAttachment requires/u);
assert.match(auditedReviewPrompt, /High relationshipMomentum requires/u);
assert.match(auditedReviewPrompt, /High readerReward requires/u);
assert.match(auditedReviewPrompt, /High premiseAccessibility requires/u);
assert.match(auditedReviewPrompt, /Return six independent criticPanels/u);
assert.match(auditedReviewPrompt, /wouldReadNext is a publication gate/u);

const critiquePrompt = buildSerialPrompt({
  ...job,
  type: "editorial_critique",
  payload: { criticRole: "relationship", bible: { concept: { premiseAudit, readerAppealPlan, storyCore } } }
});
assert.match(critiquePrompt, /Act only as the 'relationship' critic/u);
assert.match(critiquePrompt, /independent agendas, mutual need, value conflict/u);
assert.match(critiquePrompt, /Do not output scores or a publication decision/u);

const finalReviewPrompt = buildSerialPrompt({
  ...job,
  type: "editorial_review",
  payload: {
    bible: { concept: { premiseAudit, readerAppealPlan, storyCore } },
    criticPacket: { character: { verdict: "strong" } }
  }
});
assert.match(finalReviewPrompt, /final senior editor after an independent six-role critique pass/u);
assert.match(finalReviewPrompt, /Do not output criticPanels/u);
assert.match(finalReviewPrompt, /server attaches the authoritative packet/u);
const styledReviewPrompt = buildSerialPrompt({
  ...job,
  type: "editorial_review",
  payload: {
    bible: { concept: { premiseAudit, readerAppealPlan, storyCore, genrePreset }, voiceProfile: { proseStyle } },
    criticPacket: { character: { verdict: "strong" } }
  }
});
assert.match(styledReviewPrompt, /Return styleAssessment with 0-100 scores/u);
assert.match(styledReviewPrompt, /voiceAdherence, dialogueCharacterization, toneConsistency, and sentenceRhythm/u);
assert.match(styledReviewPrompt, /"styleAssessment"/u);
assert.match(styledReviewPrompt, /확정 문체와 원고의 구체적 근거/u);

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
  payload: { bible: { concept: { premiseAudit, readerAppealPlan, storyCore } } }
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

const replan = {
  sourceJobId: "replan-job-2",
  strengthsToPreserve: [{ asset: "관계 협상 장면" }],
  weaknessesToRepair: [{ risk: "같은 사건 순서 반복" }],
  nextArcDirective: {
    architectureReferences: {
      volumeNo: 2,
      conflictSourceKeys: ["conflict-2"],
      characterMilestoneIds: ["milestone-2"],
      longRevealKeys: []
    }
  }
};
const replanPrompt = buildSerialPrompt({
  ...job,
  type: "replan_arc",
  payload: {
    concept: { readerAppealPlan, storyCore },
    arcNo: 2,
    arcScope: {
      firstEpisodeNo: 27,
      lastEpisodeNo: 51,
      volumeNo: 2,
      volume: { conflictSourceKeys: ["conflict-2"], characterMilestoneIds: ["milestone-2"] },
      relevantLongReveals: []
    },
    bible: {
      concept: { readerAppealPlan, storyCore },
      narrativeBlueprint: {
        planningHorizon: {
          protectedElements: ["중심 관계의 가치 충돌", "기억을 요금으로 치르는 규칙"],
          replanningTriggers: ["같은 사건 박자가 반복될 때", "관계의 실제 강점이 예상과 다를 때"]
        },
        seriesArchitecture: { schemaVersion: "2026-08-03-v1", plannedVolumeCount: 10, volumePlan: [{ volumeNo: 2 }] }
      }
    },
    evidence: { installments: [{ episodeNo: 26, summary: "두 인물이 책임을 나누었다." }] }
  }
});
assert.match(replanPrompt, /senior development editor before the next arc is planned/u);
assert.match(replanPrompt, /immutableFactsAcknowledged must be true and retconRequired must be false/u);
assert.match(replanPrompt, /중심 관계의 가치 충돌/u);
assert.match(replanPrompt, /같은 사건 박자가 반복될 때/u);
assert.match(replanPrompt, /may redirect only unpublished volumes after the target volume/u);

const adaptiveArcPrompt = buildSerialPrompt({
  ...job,
  type: "build_arc",
  payload: {
    concept: { readerAppealPlan, storyCore },
    arcScope: { firstEpisodeNo: 27, lastEpisodeNo: 51, volumeNo: 2 },
    bible: {
      concept: { readerAppealPlan, storyCore },
      narrativeBlueprint: {
        seriesArchitecture: { schemaVersion: "2026-08-03-v1", volumePlan: [{ volumeNo: 2 }] }
      }
    },
    replan
  }
});
assert.match(adaptiveArcPrompt, /completed development replan in payload\.replan is binding/u);
assert.match(adaptiveArcPrompt, /Copy its architectureReferences exactly/u);
assert.match(adaptiveArcPrompt, /replanApplication/u);
assert.match(adaptiveArcPrompt, /관계 협상 장면/u);

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

const correctedIdentity = parseSerialOutput({
  jobId: job.id,
  inputHash: "b".repeat(64),
  jobType: job.type,
  result: {}
}, job, { model: "gpt-test" });
assert.equal(correctedIdentity.identityCorrected, true);
assert.deepEqual(correctedIdentity.result, {});

const authoritativeCriticPacket = {
  character: { verdict: "strong", evidence: ["원본 근거"], fatalRisk: "없음", nextAction: "강한 선택을 계속 보존한다." }
};
const authoritativeReview = parseSerialOutput({
  jobId: job.id,
  inputHash: job.inputHash,
  jobType: job.type,
  result: {
    criticPanels: { character: { verdict: "weak" } },
    decision: "approved"
  }
}, {
  ...job,
  payload: { ...job.payload, criticPacket: authoritativeCriticPacket }
}, { model: "gpt-test" });
assert.deepEqual(authoritativeReview.result.criticPanels, authoritativeCriticPacket);

const authoritativeCandidates = [{ candidateId: "candidate-1", workingTitle: "원본 후보" }];
const authoritativeSelection = parseSerialOutput({
  jobId: job.id,
  inputHash: job.inputHash,
  jobType: "concept_selection",
  result: { developmentRoom: { candidates: [{ candidateId: "mutated" }] } }
}, {
  ...job,
  type: "concept_selection",
  payload: { developmentCandidates: authoritativeCandidates }
}, { model: "gpt-test" });
assert.deepEqual(authoritativeSelection.result.developmentRoom.candidates, authoritativeCandidates);
const authoritativeDraftState = {
  title: "원본 제목",
  summary: "원본 요약은 문체 보정에서 바뀌지 않는다.",
  body: "원본 본문",
  sceneRanges: [{ sceneNo: 1, startParagraph: 1, endParagraph: 1 }],
  newCanonFacts: [{ key: "fact-1", category: "event", value: "원본 사건" }],
  revealUpdates: [{ key: "reveal-1", status: "seeded" }]
};
const authoritativeLinePolish = parseSerialOutput({
  jobId: job.id,
  inputHash: job.inputHash,
  jobType: "line_polish",
  result: {
    title: "바뀐 제목",
    summary: "바뀐 요약",
    body: "표현만 고친 본문",
    sceneRanges: [],
    newCanonFacts: [],
    revealUpdates: [],
    changes: [{ sceneNo: 1, reason: "문장 리듬 보정" }]
  }
}, {
  ...job,
  type: "line_polish",
  payload: { draft: authoritativeDraftState }
}, { model: "gpt-test" });
assert.equal(authoritativeLinePolish.result.title, authoritativeDraftState.title);
assert.deepEqual(authoritativeLinePolish.result.sceneRanges, authoritativeDraftState.sceneRanges);
assert.deepEqual(authoritativeLinePolish.result.newCanonFacts, authoritativeDraftState.newCanonFacts);

const usage = parseCodexJsonlUsage([
  JSON.stringify({ type: "turn.started" }),
  JSON.stringify({ type: "turn.completed", usage: {
    input_tokens: 100,
    cached_input_tokens: 40,
    cache_write_input_tokens: 5,
    output_tokens: 20,
    reasoning_output_tokens: 3
  } })
].join("\n"));
assert.deepEqual(usage, {
  inputTokens: 100,
  cachedInputTokens: 40,
  cacheWriteInputTokens: 5,
  outputTokens: 20,
  reasoningOutputTokens: 3
});
assert.deepEqual(mergeCodexUsage(usage, { inputTokens: 2, outputTokens: 1 }), {
  inputTokens: 102,
  cachedInputTokens: 40,
  cacheWriteInputTokens: 5,
  outputTokens: 21,
  reasoningOutputTokens: 3
});

console.log("StoryHeaven serial prompt checks passed");
