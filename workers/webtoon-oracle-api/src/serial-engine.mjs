import { validateSerialGenreSelection } from "./serial-genres.mjs";

const JOB_TYPES = new Set([
  "concept_gate",
  "build_bible",
  "build_arc",
  "build_episode_card",
  "write_draft",
  "editorial_review",
  "rewrite_draft"
]);

const STORYHEAVEN_PUBLIC_SYNOPSIS_META_PATTERNS = Object.freeze([
  /\d+\s*(?:권|화|회차)/iu,
  /(?:한|두|세|네|다섯|여섯|일곱|여덟|아홉|열)\s*권\s*(?:동안|짜리|분량|구성|규모|에\s*걸쳐)/iu,
  /(?:전체|총)\s*(?:권수|화수|회차)/iu,
  /권당\s*\d+\s*(?:화|회차)/iu,
  /(?:매\s*(?:화|회|회차)|회차마다)/iu,
  /(?:반복|서사|사건|에피소드|연재)\s*엔진/iu,
  /(?:프롤로그|본편\s*\d*\s*화|첫\s*(?:화|회차)|다음\s*(?:화|회차)|회차\s*(?:구성|전개|약속))/iu,
  /(?:초반|중반|후반|마지막)\s*(?:권|부)(?:\s*(?:에는|에서|까지|부터))?/iu,
  /(?:장기\s*(?:연재|전개|구조|설계)|권별\s*(?:전개|구성|갈등)|향후\s*(?:전개|계획))/iu,
  /(?:독자|운영자|작가)\s*(?:는|가|에게|를)/iu,
  /(?:결말에서|마지막에는|최종적으로)/iu,
  /(?:판타지|코미디|로맨스|액션|미스터리|스릴러|공포|에스에프|sf|무협|드라마)(?:는|가|의)\s*.{0,40}(?:담당|보상|엔진|역할|작동)/iu,
  /(?:작품|소설|이야기)(?:의|은|는)\s*(?:반복|장기|회차|권별|전체)\s*(?:구조|전개|엔진|설계)/iu
]);

export const STORYHEAVEN_SERIAL_LIMITS = Object.freeze({
  conceptPolicy: 4_000,
  cadenceMinutesMin: 15,
  cadenceMinutesMax: 10_080,
  targetEpisodeCountMin: 1,
  targetEpisodeCountMax: 10,
  seriesVolumeCountMin: 1,
  seriesVolumeCountMax: 30,
  episodesPerVolumeMin: 10,
  episodesPerVolumeMax: 50,
  internalEpisodeNoMax: 1_501,
  continuationBatchCounts: Object.freeze([1, 3, 5]),
  episodesPerArcMin: 6,
  episodesPerArcMax: 30,
  scenesMin: 3,
  scenesMax: 5,
  draftCharactersMin: 2_500,
  draftCharactersMax: 12_000,
  rewriteMax: 2,
  jobPayloadBytes: 256 * 1024,
  quality: Object.freeze({
    koreanReadability: 85,
    canonConsistency: 95,
    causality: 90,
    readerOrientation: 85,
    sceneVisualization: 85,
    openingGrip: 75,
    narrativeMomentum: 80,
    emotionalPayoff: 75,
    genrePromise: 80,
    curiosityAndHook: 80,
    characterAgency: 75,
    characterAttachment: 78,
    relationshipMomentum: 78,
    readerReward: 82,
    premiseAccessibility: 88,
    novelty: 65
  })
});

const STORYHEAVEN_DEFAULT_CONCEPT_POLICY_BASE = Object.freeze([
  "중학생 독자도 첫 장면부터 인물과 사건을 따라갈 수 있는 쉬운 한국어로 쓴다.",
  "첫 2개 문단 안에 시점 인물, 장소, 사건 전의 평소 상태와 당장 이루려는 목표를 밝히고, 3번째 문단까지 처음 달라진 현상과 실패할 때의 손실을 구체적으로 보여준다.",
  "첫 문단의 낯선 고유 용어는 1개 이하, 첫 장면 전체는 3개 이하로 제한하며 처음 나온 문단에서 쉬운 뜻과 눈에 보이는 작동 결과를 함께 설명한다.",
  "첫 회차는 장편의 주인공과 고유 규칙을 행동으로 이해시키고 본편 1화를 기대하게 만드는 프롤로그로 쓰며, 단편처럼 모든 갈등을 끝내지 않는다.",
  "설정한 전체 권수와 권당 화수에 맞춰 장기 갈등과 성장 단계를 배분하고, 선택한 장르의 익숙한 보상을 매 화 제공한다.",
  "주인공의 선택이 결과를 만들고 그 결과가 다음 갈등으로 이어지게 하며, 같은 도입 방식과 반전과 끝맺음을 연속해서 반복하지 않는다."
]);

const STORYHEAVEN_PREMISE_COHERENCE_POLICY = Object.freeze([
  "참신성은 설정값을 따르며, 기본 2에서는 익숙한 장르 문법과 인간적인 갈등을 중심에 두고 한 가지 분명한 차별점만 더한다. 서로 무관한 직업·사물·마법 규칙을 억지로 결합해 낯설게 만드는 방식은 피한다.",
  "현실에서 하던 작업과 같은 일을 이세계에서 곧바로 맡기는 도입을 반복하지 않는다. 이전 삶의 경험은 선택에 간접적으로만 영향을 주고, 새 세계의 직업·능력·도구와 일대일로 대응시키지 않는다.",
  "낯선 세계나 집단에 들어온 주인공은 경계·오해·검증·보호자·거래처럼 받아들여지는 과정을 거친다. 이름·출신·능력을 알게 되는 정보 출처와 언어가 통하는 이유를 설정집과 장면에서 일관되게 지킨다.",
  "특별 능력은 익숙한 장르 기반 위에 핵심 효과 하나, 발동 조건 하나, 대가나 한계 하나로 설명한다. 서로 무관한 행동이나 사물을 여러 단계로 이어 붙인 발동 장치는 사용하지 않는다."
]);

const STORYHEAVEN_READER_APPEAL_POLICY = Object.freeze([
  "작품의 고유 용어와 능력 규칙을 빼고도 주인공이 무엇을 원하고 왜 실패가 아픈지 한 문장으로 설명할 수 있어야 한다. 선량함만으로 성격을 대신하지 말고 결핍, 약점, 피하고 싶은 일, 지키고 싶은 관계 중 적어도 두 가지를 행동으로 보여준다.",
  "최근 작품과 주인공 유형, 도입 방식, 사건 해결 방식, 주요 무대, 대립 구조, 장기 비밀이 비슷한지 비교한다. 이 가운데 세 가지 이상이 겹치면 소품과 제목만 바꾸지 말고 기획의 뼈대부터 다시 만든다.",
  "프롤로그는 설정 소개 외에 익숙한 장르의 즐거움, 주인공 개인의 작은 성취나 손실, 다른 인물과의 관계 변화라는 세 보상 중 적어도 두 가지를 실제 장면으로 제공한다.",
  "본편 1화와 2화까지 각각 구체적인 목표, 장르 보상, 관계 변화, 개인적 결과를 미리 계획한다. 거대한 왕국의 음모나 오래된 비밀만으로 다음 화를 유도하지 말고 주인공이 당장 해야 할 개인적인 선택을 남긴다."
]);

const STORYHEAVEN_NATURAL_KOREAN_POLICY = Object.freeze([
  "문장마다 드러난 주어와 생략된 주어가 서술어의 실제 행위 주체로 자연스러운지 확인한다. 사람과 생물은 다치거나 상처를 입을 수 있지만 집·건물·벽·도로·도구 같은 사물은 파손되거나 금이 가거나 무너진다고 쓴다. 원인, 행위자, 대상, 결과가 뒤섞인 번역투 문장은 쉬운 한국어로 다시 쓴다."
]);

export const STORYHEAVEN_DEFAULT_CONCEPT_POLICY = [
  ...STORYHEAVEN_DEFAULT_CONCEPT_POLICY_BASE,
  ...STORYHEAVEN_PREMISE_COHERENCE_POLICY,
  ...STORYHEAVEN_READER_APPEAL_POLICY,
  ...STORYHEAVEN_NATURAL_KOREAN_POLICY
].join(" ");

const STORYHEAVEN_LEGACY_CONCEPT_POLICIES = Object.freeze([
  "중학생부터 성인까지 자연스럽게 읽히는 한국어로 쓴다. 선택한 장르의 익숙한 즐거움과 한 문장으로 설명할 수 있는 새 규칙을 결합한다. 주인공이 매 화 선택하고 그 선택의 결과가 다음 화 갈등으로 이어지게 한다. 같은 도입법과 같은 종류의 끝맺음을 연속해서 반복하지 않는다.",
  STORYHEAVEN_DEFAULT_CONCEPT_POLICY_BASE.join(" "),
  [
    ...STORYHEAVEN_DEFAULT_CONCEPT_POLICY_BASE,
    "참신성은 설정값을 따르며, 기본 2에서는 익숙한 장르 문법과 인간적인 갈등을 중심에 두고 한 가지 분명한 차별점만 더한다. 서로 무관한 직업·사물·마법 규칙을 억지로 결합해 낯설게 만드는 방식은 피한다."
  ].join(" "),
  [
    ...STORYHEAVEN_DEFAULT_CONCEPT_POLICY_BASE,
    ...STORYHEAVEN_PREMISE_COHERENCE_POLICY
  ].join(" "),
  [
    ...STORYHEAVEN_DEFAULT_CONCEPT_POLICY_BASE,
    ...STORYHEAVEN_PREMISE_COHERENCE_POLICY,
    ...STORYHEAVEN_READER_APPEAL_POLICY
  ].join(" ")
]);

export function normalizeStoryHeavenConceptPolicy(value) {
  const policy = text(value, STORYHEAVEN_SERIAL_LIMITS.conceptPolicy);
  return !policy || STORYHEAVEN_LEGACY_CONCEPT_POLICIES.includes(policy)
    ? STORYHEAVEN_DEFAULT_CONCEPT_POLICY
    : policy;
}

const STORYHEAVEN_FIRST_EPISODE_QUALITY = Object.freeze({
  readerOrientation: 92,
  sceneVisualization: 88,
  openingGrip: 90,
  narrativeMomentum: 86,
  emotionalPayoff: 82,
  genrePromise: 88,
  curiosityAndHook: 92,
  characterAgency: 82,
  characterAttachment: 86,
  relationshipMomentum: 84,
  readerReward: 88,
  premiseAccessibility: 92,
  novelty: 70
});

export const STORYHEAVEN_HUMOR_PROFILES = Object.freeze({
  light: Object.freeze({
    label: "미소 중심",
    storyShare: 80,
    humorShare: 20,
    guidance: "본편의 인과와 감정을 우선하고, 인물 반응과 짧은 말맛으로 긴장 뒤에 가벼운 미소만 남긴다. 농담 때문에 사건을 멈추지 않는다."
  }),
  balanced: Object.freeze({
    label: "균형",
    storyShare: 60,
    humorShare: 40,
    guidance: "사건 진행과 웃음을 함께 움직인다. 한 회에 2~3개의 분명한 웃음 지점을 두되, 인물의 성격이나 갈등에서 자연스럽게 나오게 한다."
  }),
  "comedy-first": Object.freeze({
    label: "웃음 우선",
    storyShare: 35,
    humorShare: 65,
    guidance: "독자를 웃기는 것을 회차의 핵심 보상으로 삼는다. 장면마다 설정·상승·회수를 설계하고, 같은 농담과 과도한 설명을 반복하지 않는다."
  })
});

export const STORYHEAVEN_CREATIVE_CONTROL_DEFAULTS = Object.freeze({
  pace: 3,
  suspense: 3,
  curiosity: 4,
  surprise: 3,
  emotion: 3,
  romance: 2,
  action: 3,
  description: 3,
  humor: 2,
  novelty: 2
});

const STORYHEAVEN_CREATIVE_CONTROL_KEYS = Object.freeze(Object.keys(STORYHEAVEN_CREATIVE_CONTROL_DEFAULTS));
const STORYHEAVEN_CREATIVE_PRESETS = new Set(["balanced", "fast", "emotional", "custom"]);

export const STORYHEAVEN_SERIAL_STORY_CONTROL = Object.freeze({
  visibilities: Object.freeze(["public", "private", "archived"]),
  continuationModes: Object.freeze(["auto", "manual", "paused", "ended"]),
  operatorNoteMax: 1_000
});

export function validateStoryHeavenSerialStoryControl(input = {}) {
  const errors = [];
  const visibility = String(input.visibility || "").trim();
  const continuationMode = String(input.continuationMode || "").trim();
  const operatorNote = text(input.operatorNote, STORYHEAVEN_SERIAL_STORY_CONTROL.operatorNoteMax);
  if (!STORYHEAVEN_SERIAL_STORY_CONTROL.visibilities.includes(visibility)) {
    errors.push(fieldError("visibility", "serial_story_visibility_invalid"));
  }
  if (!STORYHEAVEN_SERIAL_STORY_CONTROL.continuationModes.includes(continuationMode)) {
    errors.push(fieldError("continuationMode", "serial_story_continuation_mode_invalid"));
  }
  if (visibility !== "public" && continuationMode === "auto") {
    errors.push(fieldError("continuationMode", "serial_private_story_auto_invalid"));
  }
  if (visibility === "archived" && continuationMode !== "ended") {
    errors.push(fieldError("continuationMode", "serial_archived_story_must_end"));
  }
  return { ok: errors.length === 0, errors, control: { visibility, continuationMode, operatorNote } };
}

export function validateStoryHeavenSerialSchedule(input = {}) {
  const errors = [];
  const genre = validateSerialGenreSelection(
    input.primaryGenres || input.primaryGenre,
    input.subgenresByGenre || input.subgenres
  );
  const legacyCadence = Number(input.cadenceDays) * 1_440;
  const cadenceMinutes = integer(
    input.cadenceMinutes ?? (Number.isFinite(legacyCadence) ? legacyCadence : undefined),
    STORYHEAVEN_SERIAL_LIMITS.cadenceMinutesMin,
    STORYHEAVEN_SERIAL_LIMITS.cadenceMinutesMax,
    120
  );
  const targetEpisodeCount = integer(
    input.targetEpisodeCount,
    STORYHEAVEN_SERIAL_LIMITS.targetEpisodeCountMin,
    STORYHEAVEN_SERIAL_LIMITS.targetEpisodeCountMax,
    1
  );
  const totalVolumes = integer(
    input.totalVolumes ?? input.volumeCount,
    STORYHEAVEN_SERIAL_LIMITS.seriesVolumeCountMin,
    STORYHEAVEN_SERIAL_LIMITS.seriesVolumeCountMax,
    10
  );
  const episodesPerVolume = integer(
    input.episodesPerVolume,
    STORYHEAVEN_SERIAL_LIMITS.episodesPerVolumeMin,
    STORYHEAVEN_SERIAL_LIMITS.episodesPerVolumeMax,
    25
  );
  const continuationBatchCount = integer(
    input.continuationBatchCount,
    STORYHEAVEN_SERIAL_LIMITS.continuationBatchCounts[0],
    STORYHEAVEN_SERIAL_LIMITS.continuationBatchCounts.at(-1),
    1
  );
  const rawTargetEpisodeCount = input.targetEpisodeCount === undefined || input.targetEpisodeCount === null
    ? 1
    : Number(input.targetEpisodeCount);
  const rawTotalVolumes = input.totalVolumes === undefined && input.volumeCount === undefined
    ? 10
    : Number(input.totalVolumes ?? input.volumeCount);
  const rawEpisodesPerVolume = input.episodesPerVolume === undefined || input.episodesPerVolume === null
    ? 25
    : Number(input.episodesPerVolume);
  const rawContinuationBatchCount = input.continuationBatchCount === undefined || input.continuationBatchCount === null
    ? 1
    : Number(input.continuationBatchCount);
  const humorIntensity = String(input.humorIntensity || "light").trim();
  const creativeControls = normalizeStoryHeavenCreativeControls(input.creativeControls, humorIntensity);
  const normalizedHumorIntensity = humorIntensityForLevel(creativeControls.values.humor);
  const humorProfile = STORYHEAVEN_HUMOR_PROFILES[normalizedHumorIntensity];
  const targetAge = ["all", "teen"].includes(input.targetAge) ? input.targetAge : "teen";
  const publicationMode = ["test_private", "auto_public"].includes(input.publicationMode)
    ? input.publicationMode
    : "test_private";
  const conceptPolicy = normalizeStoryHeavenConceptPolicy(input.conceptPolicy);
  if (!genre.ok) errors.push(fieldError("subgenres", genre.error));
  if (!Number.isInteger(rawTargetEpisodeCount)
    || rawTargetEpisodeCount < STORYHEAVEN_SERIAL_LIMITS.targetEpisodeCountMin
    || rawTargetEpisodeCount > STORYHEAVEN_SERIAL_LIMITS.targetEpisodeCountMax) {
    errors.push(fieldError("targetEpisodeCount", "serial_target_episode_count_invalid"));
  }
  if (!Number.isInteger(rawTotalVolumes)
    || rawTotalVolumes < STORYHEAVEN_SERIAL_LIMITS.seriesVolumeCountMin
    || rawTotalVolumes > STORYHEAVEN_SERIAL_LIMITS.seriesVolumeCountMax) {
    errors.push(fieldError("totalVolumes", "serial_series_volume_count_invalid"));
  }
  if (!Number.isInteger(rawEpisodesPerVolume)
    || rawEpisodesPerVolume < STORYHEAVEN_SERIAL_LIMITS.episodesPerVolumeMin
    || rawEpisodesPerVolume > STORYHEAVEN_SERIAL_LIMITS.episodesPerVolumeMax) {
    errors.push(fieldError("episodesPerVolume", "serial_episodes_per_volume_invalid"));
  }
  if (!STORYHEAVEN_SERIAL_LIMITS.continuationBatchCounts.includes(rawContinuationBatchCount)) {
    errors.push(fieldError("continuationBatchCount", "serial_continuation_batch_count_invalid"));
  }
  if (input.humorIntensity !== undefined && !STORYHEAVEN_HUMOR_PROFILES[humorIntensity]) {
    errors.push(fieldError("humorIntensity", "serial_humor_intensity_invalid"));
  }
  if (!creativeControls.valid) errors.push(fieldError("creativeControls", "serial_creative_controls_invalid"));
  if (conceptPolicy.length < 30) errors.push(fieldError("conceptPolicy", "concept_policy_too_short"));
  return {
    ok: errors.length === 0,
    errors,
    schedule: {
      name: genre.ok ? `${genre.primaryLabels.join(" × ")} 자동 연재` : "자동 연재",
      primaryGenre: genre.primaryGenre,
      primaryGenreLabel: genre.primaryLabel || "",
      primaryGenres: genre.primaryGenres || [],
      primaryGenreLabels: genre.primaryLabels || [],
      subgenres: genre.subgenres,
      subgenreLabels: genre.subgenreLabels || [],
      subgenresByGenre: genre.subgenresByGenre || {},
      subgenreLabelsByGenre: genre.subgenreLabelsByGenre || {},
      genrePool: genre.ok ? [...genre.primaryLabels, ...genre.subgenreLabels] : [],
      cadenceMinutes,
      cadenceDays: Math.max(1, Math.ceil(cadenceMinutes / 1_440)),
      targetEpisodeCount,
      seriesPlan: seriesPlan(totalVolumes, episodesPerVolume),
      continuationBatchCount,
      maxActiveSerials: 1,
      targetAge,
      publicationMode,
      conceptPolicy,
      creativeControls: {
        ...creativeControls.values,
        preset: creativeControls.preset,
        humorIntensity: humorProfile ? normalizedHumorIntensity : "light",
        humorLabel: humorProfile?.label || STORYHEAVEN_HUMOR_PROFILES.light.label,
        humorGuidance: humorProfile?.guidance || STORYHEAVEN_HUMOR_PROFILES.light.guidance,
        storyShare: humorProfile?.storyShare || STORYHEAVEN_HUMOR_PROFILES.light.storyShare,
        humorShare: humorProfile?.humorShare || STORYHEAVEN_HUMOR_PROFILES.light.humorShare,
        guidance: storyHeavenCreativeControlGuidance(creativeControls.values)
      },
      randomized: genre.randomized || { primaryGenre: false, subgenres: false }
    }
  };
}

export function normalizeStoryHeavenCreativeControls(input, legacyHumorIntensity) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const values = {};
  let valid = true;
  for (const key of STORYHEAVEN_CREATIVE_CONTROL_KEYS) {
    const fallback = key === "humor"
      ? humorLevelForIntensity(legacyHumorIntensity)
      : STORYHEAVEN_CREATIVE_CONTROL_DEFAULTS[key];
    const raw = source[key] === undefined || source[key] === null || source[key] === ""
      ? fallback
      : Number(source[key]);
    if (!Number.isInteger(raw) || raw < 1 || raw > 5) valid = false;
    values[key] = Math.max(1, Math.min(5, Number.isFinite(raw) ? Math.round(raw) : fallback));
  }
  const preset = STORYHEAVEN_CREATIVE_PRESETS.has(String(source.preset || ""))
    ? String(source.preset)
    : "balanced";
  return { valid, values, preset };
}

function humorLevelForIntensity(value) {
  if (value === "comedy-first") return 5;
  if (value === "balanced") return 3;
  return 2;
}

function humorIntensityForLevel(value) {
  if (value >= 4) return "comedy-first";
  if (value >= 3) return "balanced";
  return "light";
}

export function storyHeavenCreativeControlGuidance(values) {
  return {
    pace: `전개 속도 ${values.pace}/5: 낮을수록 여운과 탐색을 허용하고, 높을수록 사건과 선택의 간격을 줄이되 인과를 생략하지 않는다.`,
    suspense: `긴장 ${values.suspense}/5: 위험과 불확실성의 압력을 조절하고 매 장면을 같은 고조 상태로 만들지 않는다.`,
    curiosity: `호기심 ${values.curiosity}/5: 독자가 답을 알고 싶은 인과 질문의 밀도를 조절하고 공정한 단서를 함께 둔다.`,
    surprise: `반전 ${values.surprise}/5: 예상 전환의 빈도와 크기를 조절하되 사전 단서 없는 임의 반전을 금지한다.`,
    emotion: `감정 진폭 ${values.emotion}/5: 인물 선택의 정서적 대가와 회수 강도를 조절한다.`,
    romance: `관계·로맨스 ${values.romance}/5: 관계 변화가 차지하는 장면 비중을 조절하며 선택 장르의 약속을 침범하지 않는다.`,
    action: `액션 ${values.action}/5: 물리적 충돌과 즉각적 행동 보상의 빈도를 조절하고 공간 인과를 유지한다.`,
    description: `묘사 밀도 ${values.description}/5: 독자가 장면을 그릴 구체물과 감각의 양을 조절하되 장식적 나열을 피한다.`,
    humor: `웃음 ${values.humor}/5: 인물과 상황에서 나오는 웃음의 빈도와 보상 크기를 조절한다.`,
    novelty: noveltyGuidance(values.novelty)
  };
}

function noveltyGuidance(value) {
  const level = Math.max(1, Math.min(5, Number(value) || STORYHEAVEN_CREATIVE_CONTROL_DEFAULTS.novelty));
  return ({
    1: "참신성 1/5 · 익숙함 우선: 검증된 장르 문법, 친숙한 역할과 갈등을 중심으로 쓰고 차별점은 인물 관계나 선택의 결과 한 가지에만 둔다. 낯선 소재 결합과 새 규칙 증식을 피한다.",
    2: "참신성 2/5 · 절제된 차별화: 독자가 바로 알아볼 장르 구조를 약 80% 유지하고, 작품을 구분할 한 가지 규칙·관계·대가만 선명하게 더한다. 서로 무관한 직업·사물·마법을 제목용으로 억지 결합하지 않는다.",
    3: "참신성 3/5 · 균형: 익숙한 장르 엔진 위에 중심 규칙 하나와 그로 인한 예상 밖의 결과를 더하되, 인물의 현실적인 욕망과 이해하기 쉬운 갈등을 기준점으로 유지한다.",
    4: "참신성 4/5 · 독창적: 드문 소재나 규칙 조합을 허용하지만 독자가 붙잡을 친숙한 목표, 감정, 장르 보상을 먼저 제시하고 모든 낯선 요소에 인과적 필요를 부여한다.",
    5: "참신성 5/5 · 실험적: 형식과 소재의 과감한 조합을 허용하되 무작위 기괴함은 금지한다. 실험은 인물의 선택과 반복 가능한 연재 갈등을 더 강하게 만들 때만 사용한다."
  })[level];
}

function seriesPlan(totalVolumes, episodesPerVolume) {
  const volumeCount = Math.max(
    STORYHEAVEN_SERIAL_LIMITS.seriesVolumeCountMin,
    Math.min(STORYHEAVEN_SERIAL_LIMITS.seriesVolumeCountMax, Number(totalVolumes || 10))
  );
  const volumeEpisodeCount = Math.max(
    STORYHEAVEN_SERIAL_LIMITS.episodesPerVolumeMin,
    Math.min(STORYHEAVEN_SERIAL_LIMITS.episodesPerVolumeMax, Number(episodesPerVolume || 25))
  );
  return {
    totalVolumes: volumeCount,
    episodesPerVolume: volumeEpisodeCount,
    totalMainEpisodes: volumeCount * volumeEpisodeCount,
    prologueRequired: true,
    prologueEpisodeNo: 1,
    firstMainEpisodeNo: 2,
    firstMainEpisodeLabel: "본편 1화",
    planningRule: `프롤로그 1편 뒤에 본편 ${volumeCount}권, 권당 ${volumeEpisodeCount}화, 총 본편 ${volumeCount * volumeEpisodeCount}화를 버틸 장편 구조로 설계한다.`
  };
}

export function storyHeavenSeriesPosition(episodeNoValue, planValue = {}) {
  const plan = seriesPlan(planValue.totalVolumes, planValue.episodesPerVolume);
  const episodeNo = integer(episodeNoValue, 1, plan.totalMainEpisodes + 1, null);
  if (episodeNo === null) throw new Error("serial_series_episode_out_of_range");
  if (episodeNo === 1) {
    return { episodeNo, isPrologue: true, mainEpisodeNo: null, volumeNo: 1, episodeWithinVolume: 0, plan };
  }
  const mainEpisodeNo = episodeNo - 1;
  return {
    episodeNo,
    isPrologue: false,
    mainEpisodeNo,
    volumeNo: Math.ceil(mainEpisodeNo / plan.episodesPerVolume),
    episodeWithinVolume: ((mainEpisodeNo - 1) % plan.episodesPerVolume) + 1,
    plan
  };
}

export function buildStoryHeavenArcScope(firstEpisodeNoValue, planValue = {}, architectureValue = {}) {
  const position = storyHeavenSeriesPosition(firstEpisodeNoValue, planValue);
  const { plan, volumeNo } = position;
  const volumeStartInternalEpisode = ((volumeNo - 1) * plan.episodesPerVolume) + 2;
  const volumeEndInternalEpisode = (volumeNo * plan.episodesPerVolume) + 1;
  const remaining = volumeEndInternalEpisode - position.episodeNo + 1;
  let episodeCount = Math.min(STORYHEAVEN_SERIAL_LIMITS.episodesPerArcMax, remaining);
  const tail = remaining - episodeCount;
  if (tail > 0 && tail < STORYHEAVEN_SERIAL_LIMITS.episodesPerArcMin) {
    episodeCount -= STORYHEAVEN_SERIAL_LIMITS.episodesPerArcMin - tail;
  }
  const allowShortBoundaryTail = episodeCount < STORYHEAVEN_SERIAL_LIMITS.episodesPerArcMin;
  const architecture = object(architectureValue);
  const volume = array(architecture.volumePlan).find((item) => Number(item?.volumeNo) === volumeNo) || null;
  const relevantLongReveals = array(architecture.longReveals).filter((item) => (
    Number(item?.seedVolume) === 0 && position.episodeNo === 1
  ) || Number(item?.seedVolume) === volumeNo
    || Number(item?.payoffVolume) === volumeNo
    || array(item?.deepenVolumes).map(Number).includes(volumeNo));
  return {
    firstEpisodeNo: position.episodeNo,
    lastEpisodeNo: position.episodeNo + episodeCount - 1,
    episodeCount,
    volumeNo,
    volumeStartInternalEpisode,
    volumeEndInternalEpisode,
    includesPrologue: position.isPrologue,
    allowShortBoundaryTail,
    volume,
    relevantLongReveals
  };
}

export function validateStoryHeavenEpisodeRun(input = {}) {
  const errors = [];
  const episodeNo = integer(input.episodeNo, 1, STORYHEAVEN_SERIAL_LIMITS.internalEpisodeNoMax, null);
  const releaseAt = input.releaseAt ? new Date(input.releaseAt) : null;
  const notes = text(input.notes, 1_000);
  if (input.episodeNo !== undefined && episodeNo === null) errors.push(fieldError("episodeNo", "invalid_episode_number"));
  if (releaseAt && Number.isNaN(releaseAt.getTime())) errors.push(fieldError("releaseAt", "invalid_release_time"));
  return {
    ok: errors.length === 0,
    errors,
    request: { episodeNo, releaseAt: releaseAt?.toISOString() || null, notes }
  };
}

export function validateStoryHeavenContinuationRequest(input = {}) {
  const rawBatchCount = input.batchCount === undefined || input.batchCount === null
    ? 1
    : Number(input.batchCount);
  const batchCount = integer(
    input.batchCount,
    STORYHEAVEN_SERIAL_LIMITS.continuationBatchCounts[0],
    STORYHEAVEN_SERIAL_LIMITS.continuationBatchCounts.at(-1),
    1
  );
  const notes = text(input.notes, 1_000);
  const errors = [];
  if (!STORYHEAVEN_SERIAL_LIMITS.continuationBatchCounts.includes(rawBatchCount)) {
    errors.push(fieldError("batchCount", "serial_continuation_batch_count_invalid"));
  }
  return {
    ok: errors.length === 0,
    errors,
    request: { batchCount, notes }
  };
}

export function normalizeStoryHeavenSerialWorkerResult(jobTypeValue, value, options = {}) {
  const jobType = String(jobTypeValue || "").trim();
  if (!JOB_TYPES.has(jobType)) throw new Error("serial_unknown_job_type");
  const source = object(value);
  if (jobType === "concept_gate") return normalizeConcept(source, options);
  if (jobType === "build_bible") return normalizeBible(source, options);
  if (jobType === "build_arc") return normalizeArc(source, options);
  if (jobType === "build_episode_card") return normalizeEpisodeCard(source, options);
  if (jobType === "write_draft") return normalizeDraft(source, false, options);
  if (jobType === "rewrite_draft") return normalizeDraft(source, true, options);
  return normalizeEditorialReview(source);
}

export function analyzeStoryHeavenSerialDraft(input = {}) {
  const title = text(input.title, 120);
  const summary = text(input.summary, 1_000);
  const body = text(input.body, 80_000, { preserveNewlines: true });
  const paragraphs = body.split(/\n{2,}/u).map((item) => item.trim()).filter(Boolean);
  const characterCount = [...body.replace(/\s/gu, "")].length;
  const sentences = body
    .split(/(?<=[.!?。！？’”])\s+/u)
    .map((item) => item.replace(/\s+/gu, " ").trim())
    .filter(Boolean);
  const errors = [];
  const warnings = [];

  if (!title) errors.push(issue("title_required", "회차 제목이 없습니다."));
  if (summary.length < 20) errors.push(issue("summary_too_short", "회차 소개가 20자보다 짧습니다."));
  if (characterCount < STORYHEAVEN_SERIAL_LIMITS.draftCharactersMin) {
    errors.push(issue("body_too_short", `본문이 ${STORYHEAVEN_SERIAL_LIMITS.draftCharactersMin.toLocaleString("ko-KR")}자보다 짧습니다.`));
  }
  if (characterCount > STORYHEAVEN_SERIAL_LIMITS.draftCharactersMax) {
    errors.push(issue("body_too_long", `본문이 ${STORYHEAVEN_SERIAL_LIMITS.draftCharactersMax.toLocaleString("ko-KR")}자를 넘습니다.`));
  }
  if (paragraphs.length < 8) errors.push(issue("paragraphs_too_few", "문단이 8개보다 적습니다."));
  if (/<\/?(?:script|iframe|object|embed|style)\b|javascript\s*:/iu.test(body)) {
    errors.push(issue("executable_markup", "실행 가능한 마크업이 포함되어 있습니다."));
  }

  const longSentences = sentences
    .map((sentence, index) => ({ index: index + 1, length: [...sentence].length, sentence }))
    .filter((entry) => entry.length > 130);
  if (longSentences.length) warnings.push(issue("long_sentences", "130자를 넘는 문장이 있습니다.", longSentences.slice(0, 5)));

  const translatedPatterns = [
    [/되어졌/gu, "되어졌"],
    [/에 의하여|에 의해/gu, "에 의해"],
    [/하는 것을 볼 수 있/gu, "하는 것을 볼 수 있다"],
    [/가지고 있었/gu, "가지고 있었다"]
  ];
  for (const [pattern, label] of translatedPatterns) {
    const count = [...body.matchAll(pattern)].length;
    if (count) warnings.push(issue("translationese", `번역투로 읽힐 수 있는 '${label}' 표현이 ${count}번 있습니다.`));
  }

  const oldNumberPatterns = [
    /(?:여덟|열한|열두|열세|스무|서른|마흔) (?:초|분|시간|년|해|살|층)/gu,
    /(?:두|세|네|다섯) (?:시간|년|해|살|층)/gu
  ];
  const numberStyleCount = oldNumberPatterns.reduce((sum, pattern) => sum + [...body.matchAll(pattern)].length, 0);
  if (numberStyleCount) errors.push(issue("number_style", `시간·기간·층수 ${numberStyleCount}곳을 11년, 8초 같은 숫자 표기로 고쳐야 합니다.`));

  const semanticPredicateMismatches = findSemanticPredicateMismatches(sentences);
  if (semanticPredicateMismatches.length) {
    errors.push(issue(
      "semantic_predicate_mismatch",
      "사물이나 장소에 생물의 부상 서술어를 사용한 문장이 있습니다. 행위 주체와 서술어를 자연스러운 한국어로 다시 써야 합니다.",
      semanticPredicateMismatches.slice(0, 5)
    ));
  }

  const endingCounts = new Map();
  for (const sentence of sentences) {
    const ending = sentence.replace(/[.!?。！？’”]+$/gu, "").slice(-2);
    if (ending) endingCounts.set(ending, (endingCounts.get(ending) || 0) + 1);
  }
  const repeatedEnding = [...endingCounts.entries()].sort((a, b) => b[1] - a[1])[0] || ["", 0];
  const repeatedEndingRatio = sentences.length ? repeatedEnding[1] / sentences.length : 0;
  if (sentences.length >= 10 && repeatedEndingRatio > 0.45) {
    warnings.push(issue("repeated_endings", `문장 끝 '${repeatedEnding[0]}'의 반복 비율이 높습니다.`));
  }

  const score = Math.max(0, 100 - errors.length * 25 - warnings.length * 5);
  return {
    passed: errors.length === 0,
    score,
    characterCount,
    paragraphCount: paragraphs.length,
    sentenceCount: sentences.length,
    estimatedReadMinutes: Math.max(1, Math.ceil(characterCount / 500)),
    longestSentence: Math.max(0, ...sentences.map((sentence) => [...sentence].length)),
    repeatedEndingRatio: Number(repeatedEndingRatio.toFixed(3)),
    errors,
    warnings
  };
}

function findSemanticPredicateMismatches(sentences = []) {
  const inanimateSubject = /(?:집|건물|주택|오두막|궁전|성벽|벽|문|창문|지붕|바닥|방|마을|도시|도로|거리|탑|마차|차량|기계|검|칼|방패|갑옷|가구)(?:은|는|이|가|도|만)/gu;
  const livingInjuryPredicate = /(?:상처(?:를)?\s*입|부상(?:을)?\s*(?:입|당하)|다치|피(?:를)?\s*흘리)/u;
  const laterExplicitSubject = /[가-힣][가-힣0-9·\s]{0,12}(?:은|는|이|가)\s/u;
  const mismatches = [];
  sentences.forEach((sentence, sentenceIndex) => {
    const clauses = sentence.split(/[,;]|(?:는데|지만|으나|더니)\s*/u).map((item) => item.trim()).filter(Boolean);
    for (const clause of clauses) {
      for (const match of clause.matchAll(inanimateSubject)) {
        const tail = clause.slice((match.index || 0) + match[0].length, (match.index || 0) + match[0].length + 56);
        const predicateIndex = tail.search(livingInjuryPredicate);
        if (predicateIndex < 0) continue;
        const between = tail.slice(0, predicateIndex);
        if (laterExplicitSubject.test(between)) continue;
        mismatches.push({ index: sentenceIndex + 1, subject: match[0], sentence });
        break;
      }
      if (mismatches.at(-1)?.index === sentenceIndex + 1) break;
    }
  });
  return mismatches;
}

export function storyHeavenSerialQualityThresholds(episodeNo = null) {
  return Number(episodeNo) === 1
    ? Object.freeze({ ...STORYHEAVEN_SERIAL_LIMITS.quality, ...STORYHEAVEN_FIRST_EPISODE_QUALITY })
    : STORYHEAVEN_SERIAL_LIMITS.quality;
}

export function decideStoryHeavenSerialReview({ review, qa, rewriteCount = 0, episodeNo = null }) {
  const scores = review?.scores || {};
  const thresholds = storyHeavenSerialQualityThresholds(episodeNo);
  const readerExperienceScore = calculateStoryHeavenReaderExperienceScore(scores);
  const failedMetrics = Object.entries(thresholds)
    .filter(([name, threshold]) => Number(scores[name]) < threshold)
    .map(([name, threshold]) => ({ name, score: Number(scores[name] || 0), threshold }));
  const mandatoryFailure = !qa?.passed || Number(qa?.score || 0) < thresholds.koreanReadability
    || review?.safetyPassed !== true || review?.decision === "blocked";
  const approved = !mandatoryFailure && review?.decision === "approved" && failedMetrics.length === 0;
  if (approved) return { state: "approved", failedMetrics, rewriteAllowed: false, readerExperienceScore };
  const rewriteAllowed = rewriteCount < STORYHEAVEN_SERIAL_LIMITS.rewriteMax && review?.decision !== "blocked";
  return { state: rewriteAllowed ? "rewrite_required" : "blocked", failedMetrics, rewriteAllowed, readerExperienceScore };
}

export function calculateStoryHeavenReaderExperienceScore(scores = {}) {
  const weights = {
    readerOrientation: 0.10,
    openingGrip: 0.08,
    sceneVisualization: 0.08,
    narrativeMomentum: 0.10,
    emotionalPayoff: 0.08,
    genrePromise: 0.08,
    curiosityAndHook: 0.08,
    characterAgency: 0.05,
    characterAttachment: 0.12,
    relationshipMomentum: 0.08,
    readerReward: 0.08,
    premiseAccessibility: 0.05,
    novelty: 0.02
  };
  const score = Object.entries(weights).reduce((sum, [name, weight]) => {
    return sum + Math.max(0, Math.min(100, Number(scores[name]) || 0)) * weight;
  }, 0);
  return Number(score.toFixed(1));
}

function normalizeConcept(source, options = {}) {
  const legacyConceptCopy = options.allowLegacyConceptCopy === true;
  const concept = {
    title: requiredText(source.title, 80, 2, "serial_concept_title_invalid"),
    logline: requiredText(source.logline, 220, 20, "serial_concept_logline_invalid"),
    synopsis: legacyConceptCopy
      ? requiredText(source.synopsis, 2_000, 100, "serial_concept_synopsis_invalid")
      : normalizePublicSynopsis(source.synopsis),
    internalPlanningSummary: requiredText(
      source.internalPlanningSummary || (legacyConceptCopy ? source.synopsis : ""),
      4_000,
      100,
      "serial_internal_planning_summary_invalid"
    ),
    genres: requiredList(source.genres, { min: 1, max: 5, itemMax: 40 }, "serial_concept_genres_invalid"),
    tags: stringList(source.tags, { max: 5, itemMax: 30 }),
    rating: ["all", "teen"].includes(source.rating) ? source.rating : "teen",
    readerPromise: requiredText(source.readerPromise, 300, 20, "serial_reader_promise_invalid"),
    familiarPleasure: requiredText(source.familiarPleasure, 300, 10, "serial_familiar_pleasure_invalid"),
    novelTwist: requiredText(source.novelTwist, 300, 10, "serial_novel_twist_invalid"),
    targetAge: ["all", "teen"].includes(source.targetAge) ? source.targetAge : "teen"
  };
  if (!legacyConceptCopy || Object.keys(object(source.premiseAudit)).length > 0) {
    concept.premiseAudit = normalizePremiseAudit(source.premiseAudit);
  }
  if (!legacyConceptCopy || Object.keys(object(source.readerAppealPlan)).length > 0) {
    concept.readerAppealPlan = normalizeReaderAppealPlan(source.readerAppealPlan, options);
  }
  return concept;
}

function normalizePremiseAudit(value) {
  const source = object(value);
  const entryTypes = new Set(["native", "summoned", "transported", "reincarnated", "possessed", "regressed", "other"]);
  const entryType = entryTypes.has(source.entryType) ? source.entryType : null;
  if (!entryType) throw new Error("serial_premise_entry_type_invalid");

  const priorLifeSkillRelation = ["none", "indirect"].includes(source.priorLifeSkillRelation)
    ? source.priorLifeSkillRelation
    : null;
  if (!priorLifeSkillRelation) throw new Error("serial_premise_prior_skill_relation_invalid");

  const usesMatchingTaskTransfer = requiredBoolean(
    source.usesMatchingTaskTransfer,
    "serial_premise_matching_task_transfer_invalid"
  );
  if (usesMatchingTaskTransfer) throw new Error("serial_premise_matching_task_transfer_forbidden");

  const immediateAcceptance = requiredBoolean(
    source.immediateAcceptance,
    "serial_premise_immediate_acceptance_invalid"
  );
  const nameKnownBeforeIntroduction = requiredBoolean(
    source.nameKnownBeforeIntroduction,
    "serial_premise_name_knowledge_invalid"
  );
  if (entryType !== "native" && immediateAcceptance) {
    throw new Error("serial_premise_immediate_acceptance_forbidden");
  }
  if (entryType !== "native" && nameKnownBeforeIntroduction) {
    throw new Error("serial_premise_name_leak_forbidden");
  }

  const abilitySource = object(source.abilityPlan);
  const abilityMode = ["none", "familiar", "single_twist"].includes(abilitySource.mode)
    ? abilitySource.mode
    : null;
  if (!abilityMode) throw new Error("serial_ability_mode_invalid");
  const extraRuleCount = integer(abilitySource.extraRuleCount, 0, 1, null);
  if (extraRuleCount === null) throw new Error("serial_ability_extra_rule_count_invalid");
  const hasMultiStepTrigger = requiredBoolean(
    abilitySource.hasMultiStepTrigger,
    "serial_ability_trigger_shape_invalid"
  );
  if (hasMultiStepTrigger) throw new Error("serial_ability_trigger_too_complex");

  return {
    entryType,
    usesMatchingTaskTransfer,
    priorLifeSkillRelation,
    transitionCause: requiredText(source.transitionCause, 400, 20, "serial_premise_transition_cause_invalid"),
    localReception: requiredText(source.localReception, 500, 30, "serial_premise_local_reception_invalid"),
    immediateAcceptance,
    nameKnowledgeRule: requiredText(source.nameKnowledgeRule, 400, 20, "serial_premise_name_rule_invalid"),
    nameKnownBeforeIntroduction,
    languageRule: requiredText(source.languageRule, 400, 20, "serial_premise_language_rule_invalid"),
    firstAcceptanceCondition: requiredText(source.firstAcceptanceCondition, 400, 20, "serial_premise_acceptance_condition_invalid"),
    familiarGenreFoundation: requiredText(source.familiarGenreFoundation, 300, 20, "serial_premise_familiar_foundation_invalid"),
    differentiator: requiredText(source.differentiator, 240, 10, "serial_premise_differentiator_invalid"),
    abilityPlan: {
      mode: abilityMode,
      coreAbility: requiredText(abilitySource.coreAbility, 180, 5, "serial_ability_core_invalid"),
      activation: requiredText(abilitySource.activation, 140, 5, "serial_ability_activation_invalid"),
      costOrLimit: requiredText(abilitySource.costOrLimit, 180, 5, "serial_ability_limit_invalid"),
      extraRuleCount,
      hasMultiStepTrigger,
      readerExplanation: requiredText(abilitySource.readerExplanation, 180, 10, "serial_ability_explanation_invalid")
    }
  };
}

function normalizeReaderAppealPlan(value, options = {}) {
  const source = object(value);
  const dominantPleasures = new Set([
    "growth", "problem_solving", "relationship", "mystery", "survival",
    "wonder", "humor", "healing", "revenge", "adventure", "other"
  ]);
  const dominantPleasure = dominantPleasures.has(source.dominantPleasure)
    ? source.dominantPleasure
    : null;
  if (!dominantPleasure) throw new Error("serial_reader_appeal_dominant_pleasure_invalid");

  const earlyEpisodePlan = array(source.earlyEpisodePlan).slice(0, 3).map((item) => {
    const entry = object(item);
    return {
      installment: ["prologue", "main-1", "main-2"].includes(entry.installment) ? entry.installment : "",
      concreteGoal: requiredText(entry.concreteGoal, 240, 10, "serial_reader_appeal_early_goal_invalid"),
      genreReward: requiredText(entry.genreReward, 240, 10, "serial_reader_appeal_early_reward_invalid"),
      relationshipChange: requiredText(entry.relationshipChange, 300, 10, "serial_reader_appeal_early_relationship_invalid"),
      personalConsequence: requiredText(entry.personalConsequence, 300, 10, "serial_reader_appeal_early_consequence_invalid")
    };
  });
  const expectedInstallments = ["prologue", "main-1", "main-2"];
  if (earlyEpisodePlan.length !== expectedInstallments.length
    || earlyEpisodePlan.some((item, index) => item.installment !== expectedInstallments[index])) {
    throw new Error("serial_reader_appeal_early_plan_invalid");
  }

  return {
    humanPremise: requiredText(source.humanPremise, 240, 20, "serial_reader_appeal_human_premise_invalid"),
    relatableLack: requiredText(source.relatableLack, 300, 20, "serial_reader_appeal_lack_invalid"),
    immediateWant: requiredText(source.immediateWant, 240, 20, "serial_reader_appeal_want_invalid"),
    personalStake: requiredText(source.personalStake, 300, 20, "serial_reader_appeal_stake_invalid"),
    flawedChoicePattern: requiredText(source.flawedChoicePattern, 300, 20, "serial_reader_appeal_choice_pattern_invalid"),
    firstRelationshipFriction: requiredText(source.firstRelationshipFriction, 400, 30, "serial_reader_appeal_relationship_invalid"),
    dominantPleasure,
    familiarGenreRewards: requiredList(source.familiarGenreRewards, { min: 2, max: 4, itemMax: 180 }, "serial_reader_appeal_genre_rewards_invalid"),
    prologueRewards: requiredList(source.prologueRewards, { min: 2, max: 3, itemMax: 220 }, "serial_reader_appeal_prologue_rewards_invalid"),
    earlyEpisodePlan,
    recentConceptComparison: normalizeRecentConceptComparison(source.recentConceptComparison, options)
  };
}

function normalizeRecentConceptComparison(value, options = {}) {
  const source = object(value);
  const recentConcepts = array(object(options.payload).recentConcepts);
  const recentTitles = [...new Set(recentConcepts.map((item) => text(object(item).title, 80)).filter(Boolean))];
  const titleSet = new Set(recentTitles);
  const minimumCompared = Math.min(5, recentTitles.length);
  const comparedTitles = requiredList(
    source.comparedTitles,
    { min: minimumCompared, max: 10, itemMax: 80 },
    "serial_recent_concept_comparison_invalid"
  );
  if (comparedTitles.some((title) => !titleSet.has(title))) {
    throw new Error("serial_recent_concept_comparison_invalid");
  }
  const nearestTitle = requiredText(source.nearestTitle, 80, 2, "serial_recent_concept_nearest_invalid");
  if (recentTitles.length && (nearestTitle === "none" || !titleSet.has(nearestTitle) || !comparedTitles.includes(nearestTitle))) {
    throw new Error("serial_recent_concept_nearest_invalid");
  }
  if (!recentTitles.length && nearestTitle !== "none") {
    throw new Error("serial_recent_concept_nearest_invalid");
  }
  const overlapAxisCount = integer(source.overlapAxisCount, 0, 2, null);
  if (overlapAxisCount === null) throw new Error("serial_recent_comparison_overlap_invalid");
  const usesRecentTemplate = requiredBoolean(source.usesRecentTemplate, "serial_recent_template_flag_invalid");
  if (usesRecentTemplate) throw new Error("serial_recent_template_forbidden");

  const fingerprint = normalizeStoryFingerprint(source.fingerprint);
  const axes = ["protagonistFrame", "openingMode", "episodeEngine", "storyArena", "powerSource", "oppositionType"];
  for (const recent of recentConcepts) {
    const recentFingerprint = object(object(recent).fingerprint);
    const matchingAxes = axes.filter((axis) => (
      fingerprint[axis] !== "other"
      && recentFingerprint[axis]
      && recentFingerprint[axis] !== "other"
      && fingerprint[axis] === recentFingerprint[axis]
    ));
    if (matchingAxes.length >= 5) throw new Error("serial_recent_structure_too_similar");
  }

  return {
    comparedTitles,
    nearestTitle,
    overlapAxisCount,
    usesRecentTemplate,
    repeatedPatternsToAvoid: requiredList(source.repeatedPatternsToAvoid, { min: 2, max: 6, itemMax: 240 }, "serial_recent_patterns_invalid"),
    structuralDifferences: requiredList(source.structuralDifferences, { min: recentTitles.length ? 3 : 1, max: 6, itemMax: 240 }, "serial_recent_differences_invalid"),
    fingerprint
  };
}

function normalizeStoryFingerprint(value) {
  const source = object(value);
  return {
    protagonistFrame: requiredEnum(source.protagonistFrame, ["student", "worker", "caregiver", "outcast", "authority", "ensemble", "nonhuman", "other"], "serial_story_fingerprint_protagonist_invalid"),
    openingMode: requiredEnum(source.openingMode, ["quiet_anomaly", "social_conflict", "deadline", "investigation", "chase", "accident", "combat", "arrival", "aftermath", "other"], "serial_story_fingerprint_opening_invalid"),
    episodeEngine: requiredEnum(source.episodeEngine, ["growth_combat", "quest_adventure", "case_solving", "survival", "relationship", "craft_work", "political", "mystery_investigation", "healing_community", "comedy_escalation", "other"], "serial_story_fingerprint_engine_invalid"),
    storyArena: requiredEnum(source.storyArena, ["school", "workplace", "household", "journey", "court", "frontier", "city", "village", "institution", "wilderness", "multiple", "other"], "serial_story_fingerprint_arena_invalid"),
    powerSource: requiredEnum(source.powerSource, ["none", "body_skill", "magic", "system", "artifact", "knowledge", "social_bond", "craft", "transformation", "other"], "serial_story_fingerprint_power_invalid"),
    oppositionType: requiredEnum(source.oppositionType, ["rival", "monster", "institution", "environment", "inner_conflict", "relationship", "mystery", "mixed", "other"], "serial_story_fingerprint_opposition_invalid")
  };
}

function normalizePublicSynopsis(value) {
  const synopsis = requiredText(value, 2_000, 100, "serial_concept_synopsis_invalid");
  if ([...synopsis].length > 700) throw new Error("serial_concept_synopsis_invalid");
  const sentenceCount = synopsis.match(/[.!?]+/gu)?.length || 1;
  if (sentenceCount < 2 || sentenceCount > 6) throw new Error("serial_public_synopsis_sentence_count_invalid");
  if (STORYHEAVEN_PUBLIC_SYNOPSIS_META_PATTERNS.some((pattern) => pattern.test(synopsis))) {
    throw new Error("serial_public_synopsis_meta_exposed");
  }
  return synopsis;
}

function normalizeBible(source, options = {}) {
  const characters = array(source.characters).slice(0, 12).map((item, index) => {
    const value = object(item);
    return {
      id: text(value.id, 50) || `character-${index + 1}`,
      name: requiredText(value.name, 80, 1, "serial_character_name_invalid"),
      role: requiredText(value.role, 120, 2, "serial_character_role_invalid"),
      desire: requiredText(value.desire, 300, 5, "serial_character_desire_invalid"),
      fear: requiredText(value.fear, 300, 5, "serial_character_fear_invalid"),
      secret: text(value.secret, 500),
      knowledge: stringList(value.knowledge, { max: 20, itemMax: 300 })
    };
  });
  if (characters.length < 2) throw new Error("serial_bible_characters_invalid");
  const worldRules = requiredList(source.worldRules, { min: 5, max: 24, itemMax: 500 }, "serial_world_rules_invalid");
  const forbiddenContradictions = requiredList(source.forbiddenContradictions, { min: 3, max: 20, itemMax: 500 }, "serial_forbidden_rules_invalid");
  const voice = object(source.voiceProfile);
  const narrative = object(source.narrativeBlueprint);
  const expectedPlan = expectedSeriesPlan(options);
  const seriesArchitecture = normalizeSeriesArchitecture(
    narrative.seriesArchitecture,
    expectedPlan,
    characters
  );
  return {
    worldRules,
    characters,
    timeline: requiredList(source.timeline, { min: 3, max: 40, itemMax: 500 }, "serial_timeline_invalid"),
    glossary: stringList(source.glossary, { max: 40, itemMax: 300 }),
    forbiddenContradictions,
    voiceProfile: {
      narratorDistance: requiredText(voice.narratorDistance, 120, 2, "serial_voice_distance_invalid"),
      sentenceRhythm: requiredText(voice.sentenceRhythm, 200, 2, "serial_voice_rhythm_invalid"),
      dialogueRatio: integer(voice.dialogueRatio, 0, 100, 35),
      humorStyle: text(voice.humorStyle, 200),
      descriptionDensity: integer(voice.descriptionDensity, 0, 100, 50),
      emotionStyle: requiredText(voice.emotionStyle, 200, 2, "serial_voice_emotion_invalid"),
      sensoryPalette: requiredText(voice.sensoryPalette, 240, 10, "serial_voice_sensory_palette_invalid"),
      visualizationRules: requiredList(voice.visualizationRules, { min: 3, max: 8, itemMax: 240 }, "serial_voice_visualization_rules_invalid"),
      readerOnboardingRules: requiredList(voice.readerOnboardingRules, { min: 4, max: 8, itemMax: 300 }, "serial_voice_reader_onboarding_rules_invalid"),
      forbiddenHabits: stringList(voice.forbiddenHabits, { max: 20, itemMax: 160 })
    },
    narrativeBlueprint: {
      informationStrategy: requiredText(narrative.informationStrategy, 500, 20, "serial_narrative_information_invalid"),
      openingModes: requiredList(narrative.openingModes, { min: 3, max: 7, itemMax: 120 }, "serial_narrative_openings_invalid"),
      signatureTechniques: requiredList(narrative.signatureTechniques, { min: 3, max: 7, itemMax: 160 }, "serial_narrative_techniques_invalid"),
      escalationPattern: requiredText(narrative.escalationPattern, 500, 20, "serial_narrative_escalation_invalid"),
      revealCadence: requiredText(narrative.revealCadence, 500, 20, "serial_narrative_reveal_invalid"),
      noveltyPolicy: requiredText(narrative.noveltyPolicy, 500, 20, "serial_narrative_novelty_invalid"),
      antiRepetitionRules: requiredList(narrative.antiRepetitionRules, { min: 3, max: 10, itemMax: 240 }, "serial_narrative_repetition_invalid"),
      seriesArchitecture
    }
  };
}

function normalizeArc(source, options = {}) {
  const payload = object(options.payload);
  const arcScope = object(payload.arcScope);
  const seriesArchitecture = object(payload.bible?.narrativeBlueprint?.seriesArchitecture);
  const episodePlan = array(source.episodePlan).slice(0, STORYHEAVEN_SERIAL_LIMITS.episodesPerArcMax).map((item) => {
    const value = object(item);
    return {
      episodeNo: integer(value.episodeNo, 1, STORYHEAVEN_SERIAL_LIMITS.internalEpisodeNoMax, null),
      promise: requiredText(value.promise, 300, 10, "serial_arc_episode_promise_invalid"),
      turn: requiredText(value.turn, 300, 10, "serial_arc_episode_turn_invalid"),
      hook: requiredText(value.hook, 300, 10, "serial_arc_episode_hook_invalid")
    };
  });
  const minimumArcEpisodes = arcScope.allowShortBoundaryTail === true ? 1 : STORYHEAVEN_SERIAL_LIMITS.episodesPerArcMin;
  if (episodePlan.length < minimumArcEpisodes || episodePlan.some((item) => item.episodeNo === null)) {
    throw new Error("serial_arc_episode_plan_invalid");
  }
  const episodeNumbers = episodePlan.map((item) => item.episodeNo);
  if (new Set(episodeNumbers).size !== episodeNumbers.length
    || episodeNumbers.some((episodeNo, index) => index > 0 && episodeNo !== episodeNumbers[index - 1] + 1)) {
    throw new Error("serial_arc_episode_plan_not_sequential");
  }
  if (arcScope.firstEpisodeNo && (
    episodeNumbers[0] !== Number(arcScope.firstEpisodeNo)
    || episodeNumbers.at(-1) !== Number(arcScope.lastEpisodeNo)
  )) {
    throw new Error("serial_arc_scope_mismatch");
  }
  const reveals = array(source.reveals).slice(0, 30).map((item, index) => {
    const value = object(item);
    return {
      key: text(value.key, 80) || `reveal-${index + 1}`,
      secret: requiredText(value.secret, 500, 10, "serial_reveal_secret_invalid"),
      introduceEpisode: integer(value.introduceEpisode, 1, STORYHEAVEN_SERIAL_LIMITS.internalEpisodeNoMax, null),
      payoffEpisode: integer(value.payoffEpisode, 1, STORYHEAVEN_SERIAL_LIMITS.internalEpisodeNoMax, null)
    };
  });
  const minimumArcReveals = arcScope.allowShortBoundaryTail === true ? 1 : 3;
  if (reveals.length < minimumArcReveals || reveals.some((item) => item.introduceEpisode === null || item.payoffEpisode === null)) {
    throw new Error("serial_arc_reveals_invalid");
  }
  if (reveals.some((item) => item.payoffEpisode < item.introduceEpisode)) {
    throw new Error("serial_reveal_payoff_order_invalid");
  }
  if (arcScope.firstEpisodeNo && reveals.some((item) => (
    item.introduceEpisode < Number(arcScope.firstEpisodeNo)
    || item.payoffEpisode > Number(arcScope.lastEpisodeNo)
  ))) {
    throw new Error("serial_arc_local_reveal_scope_invalid");
  }
  const longRevealKeys = new Set(array(seriesArchitecture.longReveals).map((item) => String(item?.key || "")).filter(Boolean));
  if (reveals.some((item) => longRevealKeys.has(item.key))) {
    throw new Error("serial_arc_long_reveal_redefinition");
  }
  return {
    arcTitle: requiredText(source.arcTitle, 120, 2, "serial_arc_title_invalid"),
    centralQuestion: requiredText(source.centralQuestion, 500, 20, "serial_arc_question_invalid"),
    midpointReversal: requiredText(source.midpointReversal, 800, 20, "serial_arc_midpoint_invalid"),
    endingTruth: requiredText(source.endingTruth, 800, 20, "serial_arc_ending_invalid"),
    episodePlan,
    reveals,
    architectureReferences: normalizeArchitectureReferences(source.architectureReferences, arcScope, seriesArchitecture),
    narrativePlan: normalizeNarrativePlan(source.narrativePlan)
  };
}

function normalizeEpisodeCard(source, options = {}) {
  const scenes = array(source.scenes).slice(0, STORYHEAVEN_SERIAL_LIMITS.scenesMax).map((item, index) => {
    const value = object(item);
    return {
      sceneNo: integer(value.sceneNo, 1, STORYHEAVEN_SERIAL_LIMITS.scenesMax, index + 1),
      goal: requiredText(value.goal, 300, 5, "serial_scene_goal_invalid"),
      conflict: requiredText(value.conflict, 300, 5, "serial_scene_conflict_invalid"),
      change: requiredText(value.change, 300, 5, "serial_scene_change_invalid"),
      location: requiredText(value.location, 160, 2, "serial_scene_location_invalid"),
      pov: requiredText(value.pov, 100, 1, "serial_scene_pov_invalid"),
      spatialAnchor: requiredText(value.spatialAnchor, 400, 10, "serial_scene_spatial_anchor_invalid"),
      characterBlocking: requiredText(value.characterBlocking, 400, 10, "serial_scene_character_blocking_invalid"),
      sensoryAnchor: requiredText(value.sensoryAnchor, 300, 5, "serial_scene_sensory_anchor_invalid"),
      visualTurn: requiredText(value.visualTurn, 400, 10, "serial_scene_visual_turn_invalid"),
      cameraIntent: text(value.cameraIntent, 240)
    };
  });
  if (scenes.length < STORYHEAVEN_SERIAL_LIMITS.scenesMin) throw new Error("serial_episode_scenes_invalid");
  const sceneNumbers = scenes.map((item) => item.sceneNo);
  if (new Set(sceneNumbers).size !== sceneNumbers.length
    || sceneNumbers.some((sceneNo, index) => sceneNo !== index + 1)) {
    throw new Error("serial_episode_scenes_not_sequential");
  }
  const episodeNo = integer(source.episodeNo, 1, STORYHEAVEN_SERIAL_LIMITS.internalEpisodeNoMax, null);
  const payload = object(options.payload);
  if (payload.episodeNo && episodeNo !== Number(payload.episodeNo)) {
    throw new Error("serial_episode_card_number_mismatch");
  }
  return {
    episodeNo,
    promise: requiredText(source.promise, 300, 10, "serial_episode_promise_invalid"),
    openingDisturbance: requiredText(source.openingDisturbance, 500, 10, "serial_episode_opening_invalid"),
    scenes,
    payoff: requiredText(source.payoff, 500, 10, "serial_episode_payoff_invalid"),
    hook: requiredText(source.hook, 500, 10, "serial_episode_hook_invalid"),
    knowledgeBefore: stringList(source.knowledgeBefore, { max: 30, itemMax: 300 }),
    canonReferences: stringList(source.canonReferences, { max: 40, itemMax: 80 }),
    techniquePlan: normalizeTechniquePlan(source.techniquePlan),
    prologueDisclosurePlan: normalizePrologueDisclosurePlan(
      source.prologueDisclosurePlan,
      episodeNo,
      payload.bible?.narrativeBlueprint?.seriesArchitecture
    )
  };
}

function normalizeDraft(source, rewritten, options = {}) {
  const draft = {
    title: requiredText(source.title, 120, 1, "serial_draft_title_invalid"),
    summary: requiredText(source.summary, 1_000, 20, "serial_draft_summary_invalid"),
    body: requiredText(source.body, 80_000, 500, "serial_draft_body_invalid", { preserveNewlines: true }),
    sceneRanges: array(source.sceneRanges).slice(0, STORYHEAVEN_SERIAL_LIMITS.scenesMax).map((item) => {
      const value = object(item);
      return {
        sceneNo: integer(value.sceneNo, 1, STORYHEAVEN_SERIAL_LIMITS.scenesMax, null),
        startParagraph: integer(value.startParagraph, 1, 240, null),
        endParagraph: integer(value.endParagraph, 1, 240, null)
      };
    }),
    newCanonFacts: array(source.newCanonFacts).slice(0, 30).map((item, index) => {
      const value = object(item);
      return {
        key: text(value.key, 80) || `fact-${index + 1}`,
        category: text(value.category, 40) || "event",
        value: requiredText(value.value, 500, 5, "serial_canon_fact_invalid")
      };
    }),
    revealUpdates: array(source.revealUpdates).slice(0, 20).map((item) => {
      const value = object(item);
      return {
        key: requiredText(value.key, 80, 1, "serial_reveal_key_invalid"),
        status: ["planned", "seeded", "revealed", "retired"].includes(value.status) ? value.status : "seeded"
      };
    })
  };
  if (draft.sceneRanges.length < STORYHEAVEN_SERIAL_LIMITS.scenesMin) throw new Error("serial_scene_ranges_invalid");
  const sceneRangeNumbers = draft.sceneRanges.map((item) => item.sceneNo);
  if (draft.sceneRanges.some((item) => item.sceneNo === null
      || item.startParagraph === null
      || item.endParagraph === null
      || item.endParagraph < item.startParagraph)
    || new Set(sceneRangeNumbers).size !== sceneRangeNumbers.length) {
    throw new Error("serial_scene_ranges_invalid");
  }
  const payload = object(options.payload);
  if (Number(payload.episodeNo) === 1) {
    const protectedKeys = new Set(array(
      payload.episodeCard?.prologueDisclosurePlan?.mustNotAnswerRevealKeys
      || payload.bible?.narrativeBlueprint?.seriesArchitecture?.prologueDisclosure?.mustNotAnswerRevealKeys
    ).map((key) => String(key || "")).filter(Boolean));
    if (draft.revealUpdates.some((item) => item.status === "revealed" && protectedKeys.has(item.key))) {
      throw new Error("serial_prologue_protected_reveal_exposed");
    }
  }
  if (rewritten) {
    draft.changes = array(source.changes).slice(0, 20).map((item) => {
      const value = object(item);
      return {
        sceneNo: integer(value.sceneNo, 1, STORYHEAVEN_SERIAL_LIMITS.scenesMax, null),
        reason: requiredText(value.reason, 500, 5, "serial_rewrite_reason_invalid")
      };
    });
    if (!draft.changes.length) throw new Error("serial_rewrite_changes_required");
  }
  return draft;
}

function normalizeEditorialReview(source) {
  const scoresSource = object(source.scores);
  const scores = {};
  for (const key of Object.keys(STORYHEAVEN_SERIAL_LIMITS.quality)) {
    const score = integer(scoresSource[key], 0, 100, null);
    if (score === null) throw new Error(`serial_review_${key}_invalid`);
    scores[key] = score;
  }
  const decision = ["approved", "rewrite_required", "blocked"].includes(source.decision)
    ? source.decision
    : "rewrite_required";
  const issues = array(source.issues).slice(0, 30).map((item) => {
    const value = object(item);
    return {
      code: text(value.code, 50) || "editorial_issue",
      severity: ["info", "warning", "critical"].includes(value.severity) ? value.severity : "warning",
      sceneNo: integer(value.sceneNo, 1, STORYHEAVEN_SERIAL_LIMITS.scenesMax, null),
      evidence: requiredText(value.evidence, 500, 5, "serial_review_evidence_invalid"),
      suggestion: requiredText(value.suggestion, 500, 5, "serial_review_suggestion_invalid")
    };
  });
  if (decision !== "approved" && !issues.length) throw new Error("serial_review_issues_required");
  if (decision === "rewrite_required" && !array(source.rewriteScenes).length) {
    throw new Error("serial_review_rewrite_scenes_required");
  }
  const scoreEvidenceSource = object(source.scoreEvidence);
  const scoreEvidence = {};
  for (const key of Object.keys(STORYHEAVEN_SERIAL_LIMITS.quality)) {
    scoreEvidence[key] = requiredList(scoreEvidenceSource[key], { min: 1, max: 4, itemMax: 300 }, `serial_review_${key}_evidence_invalid`);
  }
  const audienceLenses = array(source.audienceLenses).slice(0, 3).map((item) => {
    const value = object(item);
    return {
      lens: requiredText(value.lens, 80, 2, "serial_review_lens_invalid"),
      reaction: requiredText(value.reaction, 300, 10, "serial_review_reaction_invalid"),
      continueReason: text(value.continueReason, 300),
      dropRisk: text(value.dropRisk, 300)
    };
  });
  if (audienceLenses.length !== 3) throw new Error("serial_review_audience_lenses_invalid");
  return {
    decision,
    scores,
    safetyPassed: source.safetyPassed === true,
    summary: requiredText(source.summary, 1_000, 10, "serial_review_summary_invalid"),
    issues,
    rewriteScenes: [...new Set(array(source.rewriteScenes).map((value) => integer(value, 1, STORYHEAVEN_SERIAL_LIMITS.scenesMax, null)).filter(Boolean))],
    scoreEvidence,
    audienceLenses
  };
}

function expectedSeriesPlan(options = {}) {
  const payload = object(options.payload);
  const source = object(
    options.seriesPlan
    || payload.seriesPlan
    || payload.schedule?.policy?.seriesPlan
    || payload.concept?.seriesPlan
    || payload.bible?.narrativeBlueprint?.seriesPlan
  );
  return seriesPlan(source.totalVolumes, source.episodesPerVolume);
}

function normalizeSeriesArchitecture(value, plan, characters) {
  const source = object(value);
  const conflictSources = array(source.renewableConflictSources).slice(0, 12).map((item, index) => {
    const conflict = object(item);
    return {
      key: text(conflict.key, 80) || `conflict-${index + 1}`,
      source: requiredText(conflict.source, 400, 2, "serial_architecture_conflict_source_invalid"),
      pressure: requiredText(conflict.pressure, 400, 5, "serial_architecture_conflict_pressure_invalid"),
      variationRule: requiredText(conflict.variationRule, 400, 5, "serial_architecture_conflict_variation_invalid"),
      exhaustionGuard: requiredText(conflict.exhaustionGuard, 400, 5, "serial_architecture_conflict_guard_invalid")
    };
  });
  if (conflictSources.length < 5 || hasDuplicateKeys(conflictSources)) {
    throw new Error("serial_architecture_conflicts_invalid");
  }

  const characterIds = new Set(characters.map((item) => item.id));
  const characterArcs = array(source.characterArcs).slice(0, 12).map((item, index) => {
    const arc = object(item);
    const milestones = array(arc.milestones).slice(0, plan.totalVolumes).map((entry, milestoneIndex) => {
      const milestone = object(entry);
      return {
        id: text(milestone.id, 80) || `character-arc-${index + 1}-volume-${milestoneIndex + 1}`,
        volumeNo: integer(milestone.volumeNo, 1, plan.totalVolumes, null),
        turn: requiredText(milestone.turn, 400, 10, "serial_architecture_character_milestone_invalid")
      };
    });
    const minimumMilestones = Math.min(3, plan.totalVolumes);
    if (milestones.length < minimumMilestones
      || milestones.some((entry) => entry.volumeNo === null)
      || hasDuplicateKeys(milestones)
      || new Set(milestones.map((entry) => entry.volumeNo)).size !== milestones.length) {
      throw new Error("serial_architecture_character_milestones_invalid");
    }
    return {
      id: text(arc.id, 80) || `character-arc-${index + 1}`,
      characterId: requiredText(arc.characterId, 50, 1, "serial_architecture_character_id_invalid"),
      startState: requiredText(arc.startState, 400, 10, "serial_architecture_character_start_invalid"),
      falseBelief: requiredText(arc.falseBelief, 400, 10, "serial_architecture_character_belief_invalid"),
      endState: requiredText(arc.endState, 400, 10, "serial_architecture_character_end_invalid"),
      milestones
    };
  });
  if (characterArcs.length < Math.min(2, characters.length)
    || hasDuplicateKeys(characterArcs)
    || new Set(characterArcs.map((item) => item.characterId)).size !== characterArcs.length
    || characterArcs.some((item) => !characterIds.has(item.characterId))) {
    throw new Error("serial_architecture_character_arcs_invalid");
  }
  const milestoneIds = new Set(characterArcs.flatMap((item) => item.milestones.map((entry) => entry.id)));
  if (milestoneIds.size !== characterArcs.reduce((sum, item) => sum + item.milestones.length, 0)) {
    throw new Error("serial_architecture_character_milestone_ids_invalid");
  }
  const coveredVolumes = new Set(characterArcs.flatMap((item) => item.milestones.map((entry) => entry.volumeNo)));
  if (coveredVolumes.size !== plan.totalVolumes) {
    throw new Error("serial_architecture_character_volume_coverage_invalid");
  }

  const minimumLongReveals = plan.totalVolumes === 1 ? 2 : Math.min(6, Math.max(4, Math.ceil(plan.totalVolumes / 3)));
  const longReveals = array(source.longReveals).slice(0, 24).map((item, index) => {
    const reveal = object(item);
    const seedVolume = integer(reveal.seedVolume, 0, plan.totalVolumes, null);
    const payoffVolume = integer(reveal.payoffVolume, 1, plan.totalVolumes, null);
    const seedEpisodeWithinVolume = seedVolume === 0
      ? 0
      : integer(reveal.seedEpisodeWithinVolume, 1, plan.episodesPerVolume, null);
    const payoffEpisodeWithinVolume = integer(reveal.payoffEpisodeWithinVolume, 1, plan.episodesPerVolume, null);
    const deepenVolumes = [...new Set(array(reveal.deepenVolumes)
      .map((entry) => integer(entry, 1, plan.totalVolumes, null))
      .filter((entry) => entry !== null
        && entry >= Math.max(1, seedVolume ?? 1)
        && (payoffVolume === null || entry < payoffVolume)))].sort((a, b) => a - b);
    if (seedVolume === null || payoffVolume === null || seedEpisodeWithinVolume === null
      || payoffEpisodeWithinVolume === null || seedVolume > payoffVolume
    ) {
      throw new Error("serial_architecture_long_reveal_schedule_invalid");
    }
    const introduceEpisode = seedVolume === 0
      ? 1
      : ((seedVolume - 1) * plan.episodesPerVolume) + seedEpisodeWithinVolume + 1;
    const payoffEpisode = ((payoffVolume - 1) * plan.episodesPerVolume) + payoffEpisodeWithinVolume + 1;
    return {
      key: text(reveal.key, 80) || `series-reveal-${index + 1}`,
      secret: requiredText(reveal.secret, 700, 10, "serial_architecture_long_reveal_secret_invalid"),
      seedVolume,
      seedEpisodeWithinVolume,
      deepenVolumes,
      payoffVolume,
      payoffEpisodeWithinVolume,
      introduceEpisode,
      payoffEpisode,
      payoffConsequence: requiredText(reveal.payoffConsequence, 500, 10, "serial_architecture_long_reveal_consequence_invalid")
    };
  });
  if (longReveals.length < minimumLongReveals
    || hasDuplicateKeys(longReveals)
    || longReveals.some((item) => !item.key.startsWith("series-"))) {
    throw new Error("serial_architecture_long_reveals_invalid");
  }
  if (plan.totalVolumes > 1) {
    const firstVolumePayoffs = longReveals.filter((item) => item.payoffVolume === 1).length;
    if (firstVolumePayoffs / longReveals.length > 0.25
      || !longReveals.some((item) => item.payoffVolume > Math.ceil(plan.totalVolumes / 2))
      || !longReveals.some((item) => item.payoffVolume === plan.totalVolumes)
      || !longReveals.some((item) => item.seedVolume === 0)) {
      throw new Error("serial_architecture_long_reveal_distribution_invalid");
    }
  }

  const conflictKeys = new Set(conflictSources.map((item) => item.key));
  const longRevealKeys = new Set(longReveals.map((item) => item.key));
  const volumePlan = array(source.volumePlan).map((item) => object(item));
  if (volumePlan.length !== plan.totalVolumes) throw new Error("serial_architecture_volume_count_invalid");
  const normalizedVolumes = volumePlan.map((volume, index) => {
    const volumeNo = integer(volume.volumeNo, 1, plan.totalVolumes, null);
    const volumeConflictKeys = requiredList(volume.conflictSourceKeys, { min: 1, max: 6, itemMax: 80 }, "serial_architecture_volume_conflicts_invalid");
    const volumeMilestoneIds = characterArcs.flatMap((arc) => arc.milestones
      .filter((milestone) => milestone.volumeNo === volumeNo)
      .map((milestone) => milestone.id));
    const protectedRevealKeys = longReveals
      .filter((reveal) => reveal.payoffVolume > volumeNo)
      .map((reveal) => reveal.key);
    if (volumeNo !== index + 1
      || volumeConflictKeys.some((key) => !conflictKeys.has(key))
      || volumeMilestoneIds.length < 1) {
      throw new Error("serial_architecture_volume_references_invalid");
    }
    const mainEpisodeStart = ((volumeNo - 1) * plan.episodesPerVolume) + 1;
    const mainEpisodeEnd = volumeNo * plan.episodesPerVolume;
    return {
      volumeNo,
      mainEpisodeStart,
      mainEpisodeEnd,
      internalEpisodeStart: mainEpisodeStart + 1,
      internalEpisodeEnd: mainEpisodeEnd + 1,
      role: requiredText(volume.role, 500, 10, "serial_architecture_volume_role_invalid"),
      openingState: requiredText(volume.openingState, 500, 10, "serial_architecture_volume_opening_invalid"),
      mainGoal: requiredText(volume.mainGoal, 500, 10, "serial_architecture_volume_goal_invalid"),
      antagonistPressure: requiredText(volume.antagonistPressure, 500, 10, "serial_architecture_volume_pressure_invalid"),
      midpointTurn: requiredText(volume.midpointTurn, 500, 10, "serial_architecture_volume_midpoint_invalid"),
      climax: requiredText(volume.climax, 500, 10, "serial_architecture_volume_climax_invalid"),
      irreversibleChange: requiredText(volume.irreversibleChange, 500, 10, "serial_architecture_volume_change_invalid"),
      nextVolumeBridge: requiredText(volume.nextVolumeBridge, 500, 10, "serial_architecture_volume_bridge_invalid"),
      conflictSourceKeys: volumeConflictKeys,
      characterMilestoneIds: volumeMilestoneIds,
      protectedRevealKeys
    };
  });
  if ([...conflictKeys].some((key) => !normalizedVolumes.some((volume) => volume.conflictSourceKeys.includes(key)))) {
    throw new Error("serial_architecture_conflict_unused");
  }
  for (const arc of characterArcs) {
    for (const milestone of arc.milestones) {
      if (!normalizedVolumes[milestone.volumeNo - 1].characterMilestoneIds.includes(milestone.id)) {
        throw new Error("serial_architecture_milestone_unlinked");
      }
    }
  }

  const disclosureSource = object(source.prologueDisclosure);
  const mustShow = requiredList(disclosureSource.mustShow, { min: 3, max: 8, itemMax: 400 }, "serial_architecture_prologue_must_show_invalid");
  const resolvedNow = requiredList(disclosureSource.resolvedNow, { min: 1, max: 3, itemMax: 400 }, "serial_architecture_prologue_resolved_invalid");
  const openQuestions = requiredList(disclosureSource.openQuestions, { min: 1, max: 3, itemMax: 400 }, "serial_architecture_prologue_questions_invalid");
  const mayHintRevealKeys = stringList(disclosureSource.mayHintRevealKeys, { max: 6, itemMax: 80 });
  const mustNotAnswerRevealKeys = stringList(disclosureSource.mustNotAnswerRevealKeys, { max: 24, itemMax: 80 });
  const laterRevealKeys = longReveals.filter((item) => item.payoffVolume > 1).map((item) => item.key);
  if ((plan.totalVolumes > 1 && !mayHintRevealKeys.length)
    || mayHintRevealKeys.some((key) => !longRevealKeys.has(key))
    || mayHintRevealKeys.some((key) => longReveals.find((item) => item.key === key)?.seedVolume !== 0)
    || mustNotAnswerRevealKeys.some((key) => !longRevealKeys.has(key))
    || laterRevealKeys.some((key) => !mustNotAnswerRevealKeys.includes(key))
    || mayHintRevealKeys.some((key) => !mustNotAnswerRevealKeys.includes(key))) {
    throw new Error("serial_architecture_prologue_reveal_boundary_invalid");
  }
  const coreRevealBudgetPercent = integer(disclosureSource.coreRevealBudgetPercent, 5, 25, null);
  if (coreRevealBudgetPercent === null) throw new Error("serial_architecture_prologue_budget_invalid");

  return {
    schemaVersion: "2026-08-03-v1",
    plannedVolumeCount: plan.totalVolumes,
    plannedMainEpisodeCount: plan.totalMainEpisodes,
    centralTheme: requiredText(source.centralTheme, 600, 20, "serial_architecture_theme_invalid"),
    seriesQuestion: requiredText(source.seriesQuestion, 600, 20, "serial_architecture_question_invalid"),
    endingBoundary: requiredText(source.endingBoundary, 1_000, 30, "serial_architecture_ending_invalid"),
    endingCost: requiredText(source.endingCost, 600, 20, "serial_architecture_ending_cost_invalid"),
    renewableConflictSources: conflictSources,
    renewableConflictCount: conflictSources.length,
    characterArcs,
    characterArcCount: characterArcs.length,
    volumePlan: normalizedVolumes,
    longReveals,
    longRevealCount: longReveals.length,
    lateRevealCount: longReveals.filter((item) => item.payoffVolume > Math.ceil(plan.totalVolumes / 2)).length,
    prologueDisclosure: {
      dramaticFunction: requiredText(disclosureSource.dramaticFunction, 500, 20, "serial_architecture_prologue_function_invalid"),
      mustShow,
      mayHintRevealKeys,
      mustNotAnswerRevealKeys,
      resolvedNow,
      openQuestions,
      coreRevealBudgetPercent
    },
    expansionRules: requiredList(source.expansionRules, { min: 4, max: 10, itemMax: 400 }, "serial_architecture_expansion_rules_invalid")
  };
}

function normalizeArchitectureReferences(value, arcScope, architecture) {
  const source = object(value);
  const hasArchitecture = Boolean(architecture.schemaVersion)
    && array(architecture.volumePlan).length > 0;
  if (!arcScope.volumeNo || !hasArchitecture) {
    return {
      volumeNo: Number(arcScope.volumeNo) || integer(source.volumeNo, 1, 30, null),
      conflictSourceKeys: stringList(source.conflictSourceKeys, { max: 6, itemMax: 80 }),
      characterMilestoneIds: stringList(source.characterMilestoneIds, { max: 12, itemMax: 80 }),
      longRevealKeys: stringList(source.longRevealKeys, { max: 12, itemMax: 80 })
    };
  }
  const volumeNo = integer(source.volumeNo, 1, Number(architecture.plannedVolumeCount || 30), null);
  const volume = array(architecture.volumePlan).find((item) => Number(item.volumeNo) === Number(arcScope.volumeNo));
  if (!volume || volumeNo !== Number(arcScope.volumeNo)) throw new Error("serial_arc_architecture_volume_invalid");
  const conflictSourceKeys = requiredList(source.conflictSourceKeys, { min: 1, max: 6, itemMax: 80 }, "serial_arc_architecture_conflicts_invalid");
  const characterMilestoneIds = requiredList(source.characterMilestoneIds, { min: 1, max: 12, itemMax: 80 }, "serial_arc_architecture_milestones_invalid");
  const longRevealKeys = stringList(source.longRevealKeys, { max: 12, itemMax: 80 });
  const validLongRevealKeys = new Set(array(architecture.longReveals).map((item) => item.key));
  if (conflictSourceKeys.some((key) => !array(volume.conflictSourceKeys).includes(key))
    || characterMilestoneIds.some((key) => !array(volume.characterMilestoneIds).includes(key))
    || longRevealKeys.some((key) => !validLongRevealKeys.has(key))) {
    throw new Error("serial_arc_architecture_references_invalid");
  }
  return { volumeNo, conflictSourceKeys, characterMilestoneIds, longRevealKeys };
}

function normalizePrologueDisclosurePlan(value, episodeNo, architectureValue) {
  const emptyPlan = { mustShow: [], mayHintRevealKeys: [], mustNotAnswerRevealKeys: [], resolvedNow: [], openQuestions: [] };
  if (Number(episodeNo) !== 1) return emptyPlan;
  const architecture = object(architectureValue);
  const expected = object(architecture.prologueDisclosure);
  if (!array(expected.mustShow).length) return emptyPlan;
  const source = object(value);
  const submittedMustShow = stringList(source.mustShow, { max: 8, itemMax: 400 });
  const submittedHints = stringList(source.mayHintRevealKeys, { max: 6, itemMax: 80 });
  const submittedProtected = stringList(source.mustNotAnswerRevealKeys, { max: 24, itemMax: 80 });
  const submittedResolved = stringList(source.resolvedNow, { max: 3, itemMax: 400 });
  const submittedQuestions = stringList(source.openQuestions, { max: 3, itemMax: 400 });
  if (submittedMustShow.length < array(expected.mustShow).length
    || submittedResolved.length < array(expected.resolvedNow).length
    || submittedQuestions.length < array(expected.openQuestions).length
    || array(expected.mayHintRevealKeys).some((key) => !submittedHints.includes(key))
    || array(expected.mustNotAnswerRevealKeys).some((key) => !submittedProtected.includes(key))) {
    throw new Error("serial_prologue_disclosure_plan_incomplete");
  }
  return {
    mustShow: array(expected.mustShow),
    mayHintRevealKeys: array(expected.mayHintRevealKeys),
    mustNotAnswerRevealKeys: array(expected.mustNotAnswerRevealKeys),
    resolvedNow: array(expected.resolvedNow),
    openQuestions: array(expected.openQuestions)
  };
}

function hasDuplicateKeys(items) {
  const keys = items.map((item) => item.key || item.id);
  return new Set(keys).size !== keys.length;
}

function normalizeNarrativePlan(value) {
  const source = object(value);
  return {
    arcShape: requiredText(source.arcShape, 300, 10, "serial_arc_shape_invalid"),
    tensionEngine: requiredText(source.tensionEngine, 300, 10, "serial_arc_tension_invalid"),
    openingRotation: requiredList(source.openingRotation, { min: 3, max: 7, itemMax: 120 }, "serial_arc_opening_rotation_invalid"),
    techniqueRotationRules: requiredList(source.techniqueRotationRules, { min: 3, max: 8, itemMax: 240 }, "serial_arc_technique_rotation_invalid"),
    climaxMethod: requiredText(source.climaxMethod, 300, 10, "serial_arc_climax_invalid"),
    avoidPatterns: requiredList(source.avoidPatterns, { min: 3, max: 8, itemMax: 200 }, "serial_arc_avoid_patterns_invalid")
  };
}

function normalizeTechniquePlan(value) {
  const source = object(value);
  return {
    openingMode: requiredText(source.openingMode, 120, 2, "serial_technique_opening_invalid"),
    viewpointStrategy: requiredText(source.viewpointStrategy, 200, 5, "serial_technique_viewpoint_invalid"),
    primaryTechnique: requiredText(source.primaryTechnique, 160, 2, "serial_technique_primary_invalid"),
    tensionMethod: requiredText(source.tensionMethod, 200, 5, "serial_technique_tension_invalid"),
    hookType: requiredText(source.hookType, 120, 2, "serial_technique_hook_invalid"),
    reason: requiredText(source.reason, 400, 10, "serial_technique_reason_invalid"),
    readerOrientation: normalizeReaderOrientation(source.readerOrientation),
    readerRewardPlan: normalizeReaderRewardPlan(source.readerRewardPlan)
  };
}

function normalizeReaderOrientation(value) {
  const source = object(value);
  const newTerms = array(source.newTerms).slice(0, 3).map((item) => {
    const term = object(item);
    return {
      term: requiredText(term.term, 80, 1, "serial_reader_orientation_term_invalid"),
      plainMeaning: requiredText(term.plainMeaning, 240, 3, "serial_reader_orientation_term_meaning_invalid"),
      demonstration: requiredText(term.demonstration, 300, 5, "serial_reader_orientation_term_demonstration_invalid")
    };
  });
  return {
    viewpoint: requiredText(source.viewpoint, 100, 1, "serial_reader_orientation_viewpoint_invalid"),
    ordinaryBaseline: requiredText(source.ordinaryBaseline, 400, 10, "serial_reader_orientation_baseline_invalid"),
    immediateGoal: requiredText(source.immediateGoal, 300, 5, "serial_reader_orientation_goal_invalid"),
    knownContext: requiredText(source.knownContext, 500, 10, "serial_reader_orientation_context_invalid"),
    firstChange: requiredText(source.firstChange, 400, 10, "serial_reader_orientation_change_invalid"),
    stakes: requiredText(source.stakes, 400, 10, "serial_reader_orientation_stakes_invalid"),
    firstSceneQuestion: requiredText(source.firstSceneQuestion, 300, 5, "serial_reader_orientation_question_invalid"),
    newTerms
  };
}

function normalizeReaderRewardPlan(value) {
  const source = object(value);
  const relationshipBefore = requiredText(source.relationshipBefore, 300, 10, "serial_episode_reward_relationship_before_invalid");
  const relationshipAfter = requiredText(source.relationshipAfter, 300, 10, "serial_episode_reward_relationship_after_invalid");
  if (relationshipBefore === relationshipAfter) throw new Error("serial_episode_reward_relationship_unchanged");
  return {
    personalWant: requiredText(source.personalWant, 240, 10, "serial_episode_reward_want_invalid"),
    personalStake: requiredText(source.personalStake, 300, 10, "serial_episode_reward_stake_invalid"),
    familiarGenreReward: requiredText(source.familiarGenreReward, 240, 10, "serial_episode_reward_genre_invalid"),
    concretePayoffs: requiredList(source.concretePayoffs, { min: 2, max: 3, itemMax: 240 }, "serial_episode_reward_payoffs_invalid"),
    relationshipBefore,
    relationshipAfter,
    ruleFreeEpisodeQuestion: requiredText(source.ruleFreeEpisodeQuestion, 240, 10, "serial_episode_reward_question_invalid")
  };
}

function object(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function text(value, max, { preserveNewlines = false } = {}) {
  const source = String(value ?? "").normalize("NFC").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu, "");
  const normalized = preserveNewlines
    ? source.replace(/\r\n?/gu, "\n").replace(/[ \t]+\n/gu, "\n").trim()
    : source.replace(/\s+/gu, " ").trim();
  return [...normalized].slice(0, max).join("");
}

function requiredText(value, max, min, error, options) {
  const normalized = text(value, max, options);
  if ([...normalized].length < min) throw new Error(error);
  return normalized;
}

function stringList(value, { max, itemMax }) {
  return [...new Set(array(value).map((item) => text(item, itemMax)).filter(Boolean))].slice(0, max);
}

function requiredList(value, limits, error) {
  const normalized = stringList(value, limits);
  if (normalized.length < limits.min) throw new Error(error);
  return normalized;
}

function integer(value, min, max, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}

function requiredBoolean(value, error) {
  if (typeof value !== "boolean") throw new Error(error);
  return value;
}

function requiredEnum(value, allowed, error) {
  if (!allowed.includes(value)) throw new Error(error);
  return value;
}

function fieldError(field, code) {
  return { field, code };
}

function issue(code, message, evidence = []) {
  return { code, message, evidence };
}
