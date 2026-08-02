import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  STORYHEAVEN_CREATIVE_CONTROL_DEFAULTS,
  STORYHEAVEN_DEFAULT_CONCEPT_POLICY,
  STORYHEAVEN_SERIAL_LIMITS,
  STORYHEAVEN_SERIAL_STORY_CONTROL,
  analyzeStoryHeavenSerialDraft,
  calculateStoryHeavenReaderExperienceScore,
  decideStoryHeavenSerialReview,
  normalizeStoryHeavenConceptPolicy,
  storyHeavenSerialQualityThresholds,
  normalizeStoryHeavenSerialWorkerResult,
  validateStoryHeavenEpisodeRun,
  validateStoryHeavenSerialSchedule,
  validateStoryHeavenSerialStoryControl
} from "../src/serial-engine.mjs";
import {
  STORYHEAVEN_PRIMARY_GENRE_LIMIT,
  STORYHEAVEN_SERIAL_GENRES,
  STORYHEAVEN_SUBGENRE_LIMIT,
  validateSerialGenreSelection
} from "../src/serial-genres.mjs";
import { STORYHEAVEN_CONTINUATION_POLICY, continuationMinimumEpisode } from "../src/serial-service.mjs";

const serialServiceSource = await readFile(new URL("../src/serial-service.mjs", import.meta.url), "utf8");
const serverSource = await readFile(new URL("../src/server.mjs", import.meta.url), "utf8");
const serialOperatorSource = await readFile(new URL("../../../storyheaven/operator/serial/serial.js", import.meta.url), "utf8");
const serialOperatorHtml = await readFile(new URL("../../../storyheaven/operator/serial/index.html", import.meta.url), "utf8");
const serialOperatorCss = await readFile(new URL("../../../storyheaven/operator/serial/serial.css", import.meta.url), "utf8");
const managedStoriesSource = await readFile(new URL("../../../storyheaven/operator/serial/stories/stories.js", import.meta.url), "utf8");
const managedStoriesHtml = await readFile(new URL("../../../storyheaven/operator/serial/stories/index.html", import.meta.url), "utf8");
assert.match(
  serialServiceSource,
  /insert \(\s*story_id, bible_version, bible_status, concept_json, narrative_blueprint_json\s*\)/u,
  "new story bibles must seed the required narrative blueprint"
);
assert.match(serialServiceSource, /recentCompleted/u, "queue API must separate recent completed work");
assert.match(serialServiceSource, /statusCounts/u, "queue API must expose status counts");
assert.match(serialServiceSource, /hiddenHistory/u, "queue API must expose hidden historical logs for full-view audits");
assert.match(serialServiceSource, /hideQueueHistory/u, "history hiding must use a dedicated service path");
assert.match(serialServiceSource, /newTermBudget/u, "draft payloads must carry the first-scene term budget");
assert.match(serialServiceSource, /readerOrientation/u, "draft payloads must carry reader-orientation constraints");
assert.match(serialServiceSource, /serial_run\.queue_group_id = :queue_group_id or serial_run\.id = :queue_group_id/u, "history operations must support legacy run ids without queue groups");
assert.match(serialServiceSource, /seenFailedSchedules/u, "queue API must deduplicate actionable failures by schedule");
assert.match(serialServiceSource, /run_status in \('error', 'blocked', 'queued', 'running', 'rewrite', 'approved'\)/u, "stalled running groups without active jobs must be hideable from history");
assert.match(serialServiceSource, /attentionType: group\.hasBlocked \? "quality_hold"/u, "quality holds must be separate from system failures");
assert.match(serialServiceSource, /episode-\$\{index \+ 1\}-card/u, "initial production progress must track episode planning");
assert.match(serialServiceSource, /job\.job_status in \('queued', 'running', 'retry_wait'\)/u, "system pause must include an already running AI job");
assert.match(serialServiceSource, /error_code = 'operator_system_paused'/u, "system pause must persist a resumable pause reason");
assert.match(serialServiceSource, /lease_id = null,[\s\S]*worker_id = null/u, "system pause must revoke worker leases before a late result can be stored");
assert.match(serverSource, /skip: isSerialEmergencyPauseRequest/u, "emergency pause must bypass the shared IP request limiter");
assert.match(serverSource, /requireAdminAccount, serialSystemRateLimiter/u, "emergency pause must bypass the shared admin limiter after admin authentication");
assert.match(serverSource, /if \(storyHeavenSerialEmergencyPaused\) throw httpError\("serial_system_paused", 409\)/u, "late worker results must be rejected during emergency pause");
assert.match(serverSource, /scheduleSerialPausePersistenceRetry/u, "emergency pause must retry database persistence without reopening the queue");
assert.match(serialServiceSource, /not exists \(\s*select 1 from storyheaven_serial_jobs running_job/u, "all automatic and operator work must share one running slot");
assert.match(serialServiceSource, /join storyheaven_serial_runs queue_origin on queue_origin\.queue_group_id = candidate_run\.queue_group_id/u, "all stages in one work must keep their original queue position");
assert.match(serialServiceSource, /order by min\(queue_origin\.created_at\), candidate_run\.queue_group_id/u, "queue groups must be claimed in stable request order");
assert.match(serialServiceSource, /error_code = 'operator_story_hidden'/u, "hiding a story must revoke linked jobs");
assert.match(serialServiceSource, /queue_status in \('ready', 'publishing'\)/u, "hiding a story must cancel linked publication work");
assert.match(serialServiceSource, /and serial_run\.queue_canceled_at is null\) as active_run_count/u, "hidden runs must not block a restored story");
assert.match(serialOperatorSource, /재개 요청 순서대로 제작/u, "incomplete prologues must explain shared queue ordering");
assert.match(serialOperatorSource, /hideIncompleteStory/u, "incomplete prologues must be independently hideable");
assert.match(serialOperatorHtml, /문제 해결 도구/u, "operator recovery tools must use task-oriented language");
assert.match(serialOperatorCss, /details\.advanced > summary[\s\S]*color: #f4f7fb/u, "dark advanced summaries must retain readable text");
assert.match(managedStoriesHtml, /value="managed" selected>운영 중/u, "managed stories must hide archived works by default");
assert.match(managedStoriesSource, /목록에 복원/u, "hidden stories must be restorable");

assert.deepEqual(STORYHEAVEN_CONTINUATION_POLICY, {
  initialEpisodeCount: 1,
  adminMinimumEpisodeCount: 1,
  recommendationThreshold: 11
});
assert.equal(continuationMinimumEpisode("reader_threshold"), 1);
assert.equal(continuationMinimumEpisode("admin_request"), 1);
assert.match(STORYHEAVEN_DEFAULT_CONCEPT_POLICY, /첫 2개 문단/u);
assert.match(STORYHEAVEN_DEFAULT_CONCEPT_POLICY, /프롤로그/u);
assert.equal(normalizeStoryHeavenConceptPolicy(""), STORYHEAVEN_DEFAULT_CONCEPT_POLICY);
assert.equal(normalizeStoryHeavenConceptPolicy("중학생부터 성인까지 자연스럽게 읽히는 한국어로 쓴다. 선택한 장르의 익숙한 즐거움과 한 문장으로 설명할 수 있는 새 규칙을 결합한다. 주인공이 매 화 선택하고 그 선택의 결과가 다음 화 갈등으로 이어지게 한다. 같은 도입법과 같은 종류의 끝맺음을 연속해서 반복하지 않는다."), STORYHEAVEN_DEFAULT_CONCEPT_POLICY);
assert.equal(normalizeStoryHeavenConceptPolicy("운영자가 직접 정한 별도의 작품 원칙은 그대로 보존한다."), "운영자가 직접 정한 별도의 작품 원칙은 그대로 보존한다.");
assert.deepEqual(STORYHEAVEN_SERIAL_STORY_CONTROL.visibilities, ["public", "private", "archived"]);
assert.equal(validateStoryHeavenSerialStoryControl({ visibility: "public", continuationMode: "auto" }).ok, true);
assert.equal(validateStoryHeavenSerialStoryControl({ visibility: "private", continuationMode: "manual" }).ok, true);
assert.equal(validateStoryHeavenSerialStoryControl({ visibility: "private", continuationMode: "auto" }).errors[0].code, "serial_private_story_auto_invalid");
assert.equal(validateStoryHeavenSerialStoryControl({ visibility: "archived", continuationMode: "paused" }).errors[0].code, "serial_archived_story_must_end");

for (const [primaryGenre, definition] of Object.entries(STORYHEAVEN_SERIAL_GENRES)) {
  assert.equal(Object.keys(definition.subgenres).length, 10, `${primaryGenre} must expose ten subgenres`);
}

const randomGenre = validateSerialGenreSelection("random", ["random"], { random: () => 0 });
assert.equal(randomGenre.ok, true);
assert.equal(randomGenre.primaryGenre, "fantasy");
assert.deepEqual(randomGenre.subgenres, ["power-fantasy"]);
assert.deepEqual(randomGenre.randomized, {
  primaryGenre: true,
  primaryGenres: true,
  subgenres: true,
  subgenresByGenre: ["fantasy"]
});
assert.equal(validateSerialGenreSelection("comedy", ["random", "gag-slapstick"]).error, "serial_random_subgenre_exclusive");
assert.equal(validateSerialGenreSelection("random", ["gag-slapstick"]).error, "serial_random_primary_requires_random_subgenre");
assert.equal(STORYHEAVEN_PRIMARY_GENRE_LIMIT, 3);
assert.equal(STORYHEAVEN_SUBGENRE_LIMIT, 10);
assert.equal(validateSerialGenreSelection(["random", "sf"], { random: ["random"], sf: ["near-future"] }).error, "serial_random_primary_exclusive");
assert.equal(validateSerialGenreSelection(["fantasy", "romance", "sf", "comedy"], {}).error, "serial_primary_genre_limit");

const hybridGenre = validateSerialGenreSelection(
  ["romance", "sf"],
  { romance: ["office-romance"], sf: ["near-future", "android-ai"] }
);
assert.equal(hybridGenre.ok, true);
assert.deepEqual(hybridGenre.primaryGenres, ["romance", "sf"]);
assert.deepEqual(hybridGenre.primaryLabels, ["로맨스", "SF"]);
assert.deepEqual(hybridGenre.subgenresByGenre, {
  romance: ["office-romance"],
  sf: ["near-future", "android-ai"]
});

const allFantasySubgenres = Object.keys(STORYHEAVEN_SERIAL_GENRES.fantasy.subgenres);
const maximumGenreSchedule = validateStoryHeavenSerialSchedule({
  name: "세부장르 최대 선택 연재",
  primaryGenre: "fantasy",
  subgenres: allFantasySubgenres,
  conceptPolicy: "서로 다른 세부장르의 역할을 설정과 사건에 명확히 배분하고 독자 약속이 흐려지지 않도록 기획한다."
});
assert.equal(maximumGenreSchedule.ok, true);
assert.equal(maximumGenreSchedule.schedule.subgenres.length, 10);
const excessiveGenreSchedule = validateStoryHeavenSerialSchedule({
  ...maximumGenreSchedule.schedule,
  subgenresByGenre: { fantasy: [...allFantasySubgenres, "unexpected-eleventh-genre"] }
});
assert.equal(excessiveGenreSchedule.ok, false);
assert.equal(excessiveGenreSchedule.errors[0].code, "serial_subgenre_limit");
const comedySchedule = validateStoryHeavenSerialSchedule({
  name: "웃음 강도 연재",
  primaryGenre: "comedy",
  subgenres: ["gag-slapstick", "social-satire"],
  humorIntensity: "comedy-first",
  conceptPolicy: "인물과 사건의 인과를 유지하면서 각 장면의 웃음 설정과 회수를 다르게 설계하고 같은 농담을 반복하지 않는다."
});
assert.equal(comedySchedule.ok, true);
assert.equal(comedySchedule.schedule.creativeControls.humorIntensity, "comedy-first");
assert.equal(comedySchedule.schedule.creativeControls.humorShare, 65);
assert.equal(validateStoryHeavenSerialSchedule({ ...comedySchedule.schedule, humorIntensity: "too-much" }).ok, false);
assert.deepEqual(STORYHEAVEN_CREATIVE_CONTROL_DEFAULTS, {
  pace: 3,
  suspense: 3,
  curiosity: 4,
  surprise: 3,
  emotion: 3,
  romance: 2,
  action: 3,
  description: 3,
  humor: 2
});
const controlledSchedule = validateStoryHeavenSerialSchedule({
  ...comedySchedule.schedule,
  humorIntensity: "comedy-first",
  creativeControls: {
    preset: "custom",
    pace: 5,
    suspense: 4,
    curiosity: 5,
    surprise: 2,
    emotion: 4,
    romance: 1,
    action: 3,
    description: 4,
    humor: 5
  }
});
assert.equal(controlledSchedule.ok, true);
assert.equal(controlledSchedule.schedule.creativeControls.pace, 5);
assert.equal(controlledSchedule.schedule.creativeControls.preset, "custom");
assert.match(controlledSchedule.schedule.creativeControls.guidance.curiosity, /5\/5/u);
assert.equal(validateStoryHeavenSerialSchedule({
  ...controlledSchedule.schedule,
  creativeControls: { ...controlledSchedule.schedule.creativeControls, suspense: 6 }
}).ok, false);

const schedule = validateStoryHeavenSerialSchedule({
  primaryGenre: "fantasy",
  subgenres: ["modern-fantasy", "hunter-dungeon"],
  publicationMode: "test_private",
  cadenceMinutes: 90,
  targetAge: "teen",
  conceptPolicy: "자연스러운 한국어와 선택의 결과를 중심에 두고 같은 도입과 후킹을 연속해서 반복하지 않는다."
});
assert.equal(schedule.ok, true);
assert.equal(schedule.schedule.cadenceMinutes, 90);
assert.equal(schedule.schedule.targetEpisodeCount, 1);
assert.equal(schedule.schedule.maxActiveSerials, 1);
const fiveEpisodeSchedule = validateStoryHeavenSerialSchedule({ ...schedule.schedule, targetEpisodeCount: 5 });
assert.equal(fiveEpisodeSchedule.ok, true);
assert.equal(fiveEpisodeSchedule.schedule.targetEpisodeCount, 5);
assert.equal(validateStoryHeavenSerialSchedule({ ...schedule.schedule, targetEpisodeCount: 11 }).ok, false);
assert.match(schedule.schedule.name, /자동 연재/u);
assert.deepEqual(schedule.schedule.genrePool, ["판타지", "현대판타지", "헌터·던전"]);
assert.equal(validateStoryHeavenSerialSchedule({ ...schedule.schedule, subgenresByGenre: { fantasy: ["office-romance"] } }).ok, false);
assert.equal(validateStoryHeavenSerialSchedule({ ...schedule.schedule, subgenresByGenre: { fantasy: [] } }).ok, false);

const hybridSchedule = validateStoryHeavenSerialSchedule({
  name: "로맨스 SF 자동 연재",
  primaryGenres: ["romance", "sf"],
  subgenresByGenre: { romance: ["office-romance"], sf: ["near-future"] },
  conceptPolicy: "로맨스의 관계 변화가 근미래 기술의 규칙과 인과적으로 맞물리며 두 장르의 보상을 매 화 함께 전진시킨다."
});
assert.equal(hybridSchedule.ok, true);
assert.deepEqual(hybridSchedule.schedule.genrePool, ["로맨스", "SF", "오피스로맨스", "근미래 기술"]);
assert.equal(hybridSchedule.schedule.primaryGenre, "romance");
assert.equal(validateStoryHeavenEpisodeRun({ episodeNo: 4 }).ok, true);
assert.equal(validateStoryHeavenEpisodeRun({ episodeNo: 0 }).ok, false);

const concept = normalizeStoryHeavenSerialWorkerResult("concept_gate", {
  title: "마지막 시간버스",
  logline: "죽은 사람의 마지막 목적지를 지나는 심야버스에서 신입 기사가 사라진 누나의 승차 기록을 발견한다.",
  synopsis: "심야 막차 이후에만 운행하는 0번 버스는 죽은 사람의 미련을 목적지까지 데려다준다. 신입 기사 도윤은 승객을 내려주며 누나의 실종을 추적하고, 정류장마다 자신의 기억 하나를 요금으로 내야 한다는 규칙을 알아낸다.",
  genres: ["판타지", "현대판타지", "헌터·던전"],
  tags: ["시간버스", "기억"],
  rating: "teen",
  readerPromise: "매 회차 새로운 승객의 사연을 해결하면서 누나와 0번 노선의 비밀에 가까워진다.",
  familiarPleasure: "도시괴담과 직업물의 친숙한 재미",
  novelTwist: "요금은 돈이 아니라 기사의 기억이다.",
  targetAge: "teen"
});
assert.equal(concept.genres.length, 3);

const bible = normalizeStoryHeavenSerialWorkerResult("build_bible", {
  worldRules: ["0번 버스는 자정 이후 운행한다.", "승객은 생전 마지막 목적지만 말한다.", "기사는 기억으로 요금을 낸다.", "운행 기록은 거짓말을 하지 않는다.", "종점에서 내리지 못하면 노선에 묶인다."],
  characters: [
    { name: "도윤", role: "신입 기사", desire: "누나를 찾는다.", fear: "누나에 대한 기억을 잃는다.", knowledge: ["버스 운전법"] },
    { name: "해진", role: "차고지 관리자", desire: "0번 노선을 끝낸다.", fear: "과거 사고가 드러난다.", knowledge: ["노선 규칙"] }
  ],
  timeline: ["11년 전 노선 사고가 발생했다.", "누나가 3년 전 실종됐다.", "도윤이 오늘 첫 운행을 시작한다."],
  glossary: ["0번 노선"],
  forbiddenContradictions: ["죽은 승객은 현금을 내지 않는다.", "운행 기록은 조작할 수 없다.", "도윤은 누나의 얼굴을 기억한다."],
  voiceProfile: {
    narratorDistance: "도윤에게 가까운 3인칭 제한 시점",
    sentenceRhythm: "행동은 짧게, 감정의 여운은 한 문단 길게 쓴다.",
    dialogueRatio: 40,
    humorStyle: "긴장 뒤에 기사들의 건조한 농담을 짧게 둔다.",
    descriptionDensity: 55,
    emotionStyle: "감정을 이름 붙이기보다 행동과 감각으로 보여준다.",
    sensoryPalette: "젖은 아스팔트의 반사광, 버스의 낮은 진동, 차고지 금속 냄새처럼 이동과 위험에 영향을 주는 감각만 고른다.",
    visualizationRules: [
      "장면 시작 2개 문단 안에 도윤의 위치와 가장 가까운 장애물을 밝힌다.",
      "대화 중 손과 시선 또는 도구의 움직임을 하나 이상 이어 붙인다.",
      "장면마다 2~4개의 구체물만 기억에 남기고 같은 비 냄새를 반복하지 않는다."
    ],
    readerOnboardingRules: [
      "첫 2개 문단 안에 시점 인물과 장소, 평소 상태, 당장 목표를 밝힌다.",
      "3번째 문단까지 처음 달라지는 현상과 실패할 때의 손실을 밝힌다.",
      "첫 문단에는 낯선 고유 용어를 최대 1개만 쓴다.",
      "신규 용어는 쉬운 뜻이나 눈에 보이는 효과를 같은 문단에서 행동으로 증명한다."
    ],
    forbiddenHabits: ["번역투", "같은 문장 종결 반복"]
  },
  narrativeBlueprint: {
    informationStrategy: "승객의 사연은 한 회 안에서 풀되 누나와 노선의 비밀은 단서가 서로 의미를 바꾸도록 단계적으로 공개한다.",
    openingModes: ["사건 한가운데", "결과를 먼저 제시", "평범한 일상의 균열"],
    signatureTechniques: ["제한된 정보", "극적 아이러니", "설정과 회수"],
    escalationPattern: "개인 승객의 문제에서 차고지 전체와 도시 교통망의 위기로 범위를 넓힌다.",
    revealCadence: "매 화 작은 답 하나와 더 큰 질문 하나를 남기고 3화마다 기존 단서의 의미를 뒤집는다.",
    antiRepetitionRules: ["같은 도입법을 연속 사용하지 않는다.", "항상 새 승객 등장으로 시작하지 않는다.", "모든 회차를 정체 공개로 끝내지 않는다."]
  }
});
assert.equal(bible.narrativeBlueprint.openingModes.length, 3);
assert.equal(bible.voiceProfile.readerOnboardingRules.length, 4);

const arc = normalizeStoryHeavenSerialWorkerResult("build_arc", {
  arcTitle: "사라진 노선",
  centralQuestion: "누가 0번 노선에서 누나의 마지막 승차 기록을 지웠는가?",
  midpointReversal: "도윤이 찾던 승객은 누나가 아니라 도윤 자신이 버린 기억의 형상으로 드러난다.",
  endingTruth: "누나는 사고 피해자가 아니라 더 큰 참사를 막기 위해 스스로 노선 관리자가 되었다.",
  episodePlan: Array.from({ length: 6 }, (_, index) => ({
    episodeNo: index + 1,
    promise: `${index + 1}번째 승객의 미련과 누나의 단서를 함께 해결한다.`,
    turn: `${index + 1}번째 정류장에서 알고 있던 노선 규칙의 빈틈이 드러난다.`,
    hook: `다음 정류장의 단서가 도윤이 잃어버린 기억과 연결된다.`
  })),
  reveals: [
    { key: "ticket", secret: "누나의 승차권은 왕복표다.", introduceEpisode: 1, payoffEpisode: 5 },
    { key: "fare", secret: "지워진 기억은 차고지에 보관된다.", introduceEpisode: 2, payoffEpisode: 4 },
    { key: "driver", secret: "도윤은 과거에도 0번 버스를 몰았다.", introduceEpisode: 3, payoffEpisode: 6 }
  ],
  narrativePlan: {
    arcShape: "각 승객의 완결형 사건이 누나의 장기 미스터리를 한 단계씩 전진시키는 상승 나선형 구조",
    tensionEngine: "도윤이 단서를 얻을수록 누나를 기억하지 못하게 되는 시간 압박",
    openingRotation: ["미래 장면 선공개", "평범한 운행의 이상 징후", "승객 시점의 짧은 프롤로그"],
    techniqueRotationRules: ["인접 회차의 시점과 도입법을 다르게 한다.", "반전 뒤에는 감정 회수 회차를 둔다.", "후킹 유형을 정보·위험·선택으로 순환한다."],
    climaxMethod: "도윤이 누나의 기억과 승객 전원의 생존 중 하나를 선택하게 한다.",
    avoidPatterns: ["설명 독백으로 규칙 공개", "우연한 구조", "매화 새 괴물 등장"]
  }
});
assert.equal(arc.episodePlan.length, 6);

const card = normalizeStoryHeavenSerialWorkerResult("build_episode_card", {
  episodeNo: 1,
  promise: "첫 승객을 내려주며 0번 노선의 요금 규칙을 체험한다.",
  openingDisturbance: "도윤이 아직 출발하지 않은 버스 안에서 자신의 안내 방송을 듣는다.",
  scenes: Array.from({ length: 3 }, (_, index) => ({
    sceneNo: index + 1,
    goal: "승객의 목적지를 확인한다.",
    conflict: "승객이 목적지를 기억하지 못한다.",
    change: "도윤이 자신의 기억을 요금함에 넣는다.",
    location: "0번 버스",
    pov: "도윤",
    spatialAnchor: "도윤은 좁은 운전석에 있고 승객은 요금함 너머 첫 좌석에 앉아 있어 둘 사이를 낡은 표와 손잡이가 가른다.",
    characterBlocking: "도윤이 운전석에서 일어나 통로로 한 걸음 나가고, 승객은 좌석 끝으로 물러나며 표만 앞으로 내민다.",
    sensoryAnchor: "요금함에서 동전 대신 젖은 종이 냄새가 나고 발밑 엔진 진동이 갑자기 멎는다.",
    visualTurn: "도윤이 표를 넣자 운전석 위 노선도에서 한 정류장이 지워지고 누나 이름이 종점 칸에 나타난다.",
    cameraIntent: "좁은 운전석과 비어 있는 좌석의 거리를 강조한다."
  })),
  payoff: "잃어버린 기억이 누나의 목소리였다는 사실을 확인한다.",
  hook: "운행 기록에 다음 승객으로 도윤의 이름이 찍힌다.",
  knowledgeBefore: ["0번 버스는 자정에 출발한다."],
  canonReferences: ["route-zero"],
  techniquePlan: {
    openingMode: "사건 한가운데",
    viewpointStrategy: "도윤의 제한 시점으로 보이지 않는 방송 주체를 숨긴다.",
    primaryTechnique: "제한된 정보",
    tensionMethod: "기억이 사라지는 즉각적 대가를 카운트다운처럼 쌓는다.",
    hookType: "정체 위협",
    reason: "첫 화에는 세계관 설명보다 도윤이 규칙의 대가를 직접 겪는 장면이 더 빠른 흡입력을 만든다.",
    readerOrientation: {
      viewpoint: "도윤",
      ordinaryBaseline: "신입 기사 도윤이 자정 첫 운행을 앞두고 차고지의 빈 버스를 점검한다.",
      immediateGoal: "버스 상태를 확인하고 정시에 첫 운행을 시작한다.",
      knownContext: "도윤은 누나의 실종 뒤 생계를 위해 오늘 처음 심야 노선 기사로 출근했다.",
      firstChange: "출발 전인데 버스 스피커에서 도윤 자신의 안내 방송이 흘러나온다.",
      stakes: "원인을 찾지 못하고 출발하면 첫 승객과 자신의 일자리를 위험에 빠뜨린다.",
      firstSceneQuestion: "누가 출발 전 버스에서 도윤의 목소리를 재생했는가?",
      newTerms: [
        { term: "0번 노선", plainMeaning: "자정에만 출발하는 심야버스 노선", demonstration: "노선도 불이 켜지고 잠긴 차고지 문이 저절로 열린다." }
      ]
    }
  }
});
assert.equal(card.techniquePlan.openingMode, "사건 한가운데");
assert.equal(card.techniquePlan.readerOrientation.newTerms.length, 1);

const paragraph = "도윤은 버스 문을 열고 빈 좌석 사이를 천천히 확인했다. 창문에는 차고지 불빛 대신 오래전 폐역의 시계가 비쳤다. 그는 승객의 낡은 표를 받아 운행 기록과 대조했고, 자신이 기억하지 못하는 누나의 목소리가 안내 방송에서 흘러나오는 이유를 찾기로 했다.";
const body = Array.from({ length: 36 }, (_, index) => `${index + 1}번째 움직임. ${paragraph} ${paragraph}`).join("\n\n");
const qa = analyzeStoryHeavenSerialDraft({ title: "돌아오지 않는 종점", summary: "도윤이 첫 승객의 목적지를 찾다가 누나의 왕복 승차권과 기억을 요금으로 내는 규칙을 발견한다.", body });
assert.equal(qa.passed, true);
assert.ok(qa.characterCount >= STORYHEAVEN_SERIAL_LIMITS.draftCharactersMin);

const scores = Object.fromEntries(Object.keys(STORYHEAVEN_SERIAL_LIMITS.quality).map((key) => [key, 96]));
const evidence = Object.fromEntries(Object.keys(scores).map((key) => [key, [`${key} 판단을 뒷받침하는 장면 근거입니다.`]]));
const review = normalizeStoryHeavenSerialWorkerResult("editorial_review", {
  decision: "approved",
  scores,
  safetyPassed: true,
  summary: "설정과 인과가 안정적이고 첫 화의 약속과 다음 화 질문이 선명합니다.",
  issues: [],
  rewriteScenes: [],
  scoreEvidence: evidence,
  audienceLenses: [
    { lens: "모바일 일반 독자", reaction: "첫 문단의 이상 방송이 빠르게 시선을 붙듭니다.", continueReason: "누나의 기록이 궁금합니다.", dropRisk: "규칙 설명이 길어지면 이탈할 수 있습니다." },
    { lens: "장르 선호 독자", reaction: "도시괴담 규칙과 직업물의 결합이 익숙하면서 새롭습니다.", continueReason: "노선의 비밀을 추리할 수 있습니다.", dropRisk: "승객 구조가 반복되면 익숙해질 수 있습니다." },
    { lens: "인내심 낮은 독자", reaction: "초반 사건은 빠르지만 중간 설명은 압축할 여지가 있습니다.", continueReason: "마지막 이름 반전이 강합니다.", dropRisk: "중반에 행동이 멈추면 이탈할 수 있습니다." }
  ]
});
const approved = decideStoryHeavenSerialReview({ qa, review, rewriteCount: 0 });
assert.equal(approved.state, "approved");
assert.equal(approved.readerExperienceScore, 96);
assert.equal(calculateStoryHeavenReaderExperienceScore({ ...scores, openingGrip: 80 }), 94.4);
assert.equal(storyHeavenSerialQualityThresholds(1).readerOrientation, 92);
assert.equal(storyHeavenSerialQualityThresholds(1).openingGrip, 90);
assert.equal(storyHeavenSerialQualityThresholds(1).curiosityAndHook, 92);
assert.equal(storyHeavenSerialQualityThresholds(2).openingGrip, 75);
const weakFirstEpisode = decideStoryHeavenSerialReview({
  qa,
  review: { ...review, scores: { ...scores, openingGrip: 85 } },
  rewriteCount: 0,
  episodeNo: 1
});
assert.equal(weakFirstEpisode.state, "rewrite_required");
assert.equal(weakFirstEpisode.failedMetrics[0].name, "openingGrip");

const disorientingFirstEpisode = decideStoryHeavenSerialReview({
  qa,
  review: { ...review, scores: { ...scores, readerOrientation: 88 } },
  rewriteCount: 0,
  episodeNo: 1
});
assert.equal(disorientingFirstEpisode.state, "rewrite_required");
assert.equal(disorientingFirstEpisode.failedMetrics[0].name, "readerOrientation");

const visuallyWeakReview = { ...review, decision: "rewrite_required", scores: { ...scores, sceneVisualization: 70 } };
const visualRewrite = decideStoryHeavenSerialReview({ qa, review: visuallyWeakReview, rewriteCount: 0 });
assert.equal(visualRewrite.state, "rewrite_required");
assert.equal(visualRewrite.failedMetrics[0].name, "sceneVisualization");

const weakReview = { ...review, decision: "rewrite_required", scores: { ...scores, curiosityAndHook: 60 } };
const rewrite = decideStoryHeavenSerialReview({ qa, review: weakReview, rewriteCount: 0 });
assert.equal(rewrite.state, "rewrite_required");
assert.equal(rewrite.failedMetrics[0].name, "curiosityAndHook");
assert.throws(() => normalizeStoryHeavenSerialWorkerResult("editorial_review", { ...review, scoreEvidence: {} }), /evidence_invalid/u);

console.log("StoryHeaven serial engine checks passed");
