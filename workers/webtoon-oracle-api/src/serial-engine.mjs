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
    sceneVisualization: 85,
    openingGrip: 75,
    narrativeMomentum: 80,
    emotionalPayoff: 75,
    genrePromise: 80,
    curiosityAndHook: 80,
    characterAgency: 75,
    novelty: 75
  })
});

const STORYHEAVEN_FIRST_EPISODE_QUALITY = Object.freeze({
  sceneVisualization: 88,
  openingGrip: 90,
  narrativeMomentum: 86,
  emotionalPayoff: 82,
  genrePromise: 88,
  curiosityAndHook: 92,
  characterAgency: 82,
  novelty: 86
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
  humor: 2
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
  const creativeControls = normalizeCreativeControls(input.creativeControls, humorIntensity);
  const normalizedHumorIntensity = humorIntensityForLevel(creativeControls.values.humor);
  const humorProfile = STORYHEAVEN_HUMOR_PROFILES[normalizedHumorIntensity];
  const targetAge = ["all", "teen"].includes(input.targetAge) ? input.targetAge : "teen";
  const publicationMode = ["test_private", "auto_public"].includes(input.publicationMode)
    ? input.publicationMode
    : "test_private";
  const conceptPolicy = text(input.conceptPolicy, STORYHEAVEN_SERIAL_LIMITS.conceptPolicy);
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
        guidance: creativeControlGuidance(creativeControls.values)
      },
      randomized: genre.randomized || { primaryGenre: false, subgenres: false }
    }
  };
}

function normalizeCreativeControls(input, legacyHumorIntensity) {
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

function creativeControlGuidance(values) {
  return {
    pace: `전개 속도 ${values.pace}/5: 낮을수록 여운과 탐색을 허용하고, 높을수록 사건과 선택의 간격을 줄이되 인과를 생략하지 않는다.`,
    suspense: `긴장 ${values.suspense}/5: 위험과 불확실성의 압력을 조절하고 매 장면을 같은 고조 상태로 만들지 않는다.`,
    curiosity: `호기심 ${values.curiosity}/5: 독자가 답을 알고 싶은 인과 질문의 밀도를 조절하고 공정한 단서를 함께 둔다.`,
    surprise: `반전 ${values.surprise}/5: 예상 전환의 빈도와 크기를 조절하되 사전 단서 없는 임의 반전을 금지한다.`,
    emotion: `감정 진폭 ${values.emotion}/5: 인물 선택의 정서적 대가와 회수 강도를 조절한다.`,
    romance: `관계·로맨스 ${values.romance}/5: 관계 변화가 차지하는 장면 비중을 조절하며 선택 장르의 약속을 침범하지 않는다.`,
    action: `액션 ${values.action}/5: 물리적 충돌과 즉각적 행동 보상의 빈도를 조절하고 공간 인과를 유지한다.`,
    description: `묘사 밀도 ${values.description}/5: 독자가 장면을 그릴 구체물과 감각의 양을 조절하되 장식적 나열을 피한다.`,
    humor: `웃음 ${values.humor}/5: 인물과 상황에서 나오는 웃음의 빈도와 보상 크기를 조절한다.`
  };
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

export function validateStoryHeavenEpisodeRun(input = {}) {
  const errors = [];
  const episodeNo = integer(input.episodeNo, 1, 300, null);
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

export function normalizeStoryHeavenSerialWorkerResult(jobTypeValue, value) {
  const jobType = String(jobTypeValue || "").trim();
  if (!JOB_TYPES.has(jobType)) throw new Error("serial_unknown_job_type");
  const source = object(value);
  if (jobType === "concept_gate") return normalizeConcept(source);
  if (jobType === "build_bible") return normalizeBible(source);
  if (jobType === "build_arc") return normalizeArc(source);
  if (jobType === "build_episode_card") return normalizeEpisodeCard(source);
  if (jobType === "write_draft") return normalizeDraft(source, false);
  if (jobType === "rewrite_draft") return normalizeDraft(source, true);
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
    openingGrip: 0.13,
    sceneVisualization: 0.15,
    narrativeMomentum: 0.17,
    emotionalPayoff: 0.13,
    genrePromise: 0.13,
    curiosityAndHook: 0.16,
    characterAgency: 0.08,
    novelty: 0.05
  };
  const score = Object.entries(weights).reduce((sum, [name, weight]) => {
    return sum + Math.max(0, Math.min(100, Number(scores[name]) || 0)) * weight;
  }, 0);
  return Number(score.toFixed(1));
}

function normalizeConcept(source) {
  const concept = {
    title: requiredText(source.title, 80, 2, "serial_concept_title_invalid"),
    logline: requiredText(source.logline, 220, 20, "serial_concept_logline_invalid"),
    synopsis: requiredText(source.synopsis, 2_000, 100, "serial_concept_synopsis_invalid"),
    genres: requiredList(source.genres, { min: 1, max: 5, itemMax: 40 }, "serial_concept_genres_invalid"),
    tags: stringList(source.tags, { max: 5, itemMax: 30 }),
    rating: ["all", "teen"].includes(source.rating) ? source.rating : "teen",
    readerPromise: requiredText(source.readerPromise, 300, 20, "serial_reader_promise_invalid"),
    familiarPleasure: requiredText(source.familiarPleasure, 300, 10, "serial_familiar_pleasure_invalid"),
    novelTwist: requiredText(source.novelTwist, 300, 10, "serial_novel_twist_invalid"),
    targetAge: ["all", "teen"].includes(source.targetAge) ? source.targetAge : "teen"
  };
  return concept;
}

function normalizeBible(source) {
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
      forbiddenHabits: stringList(voice.forbiddenHabits, { max: 20, itemMax: 160 })
    },
    narrativeBlueprint: {
      informationStrategy: requiredText(narrative.informationStrategy, 500, 20, "serial_narrative_information_invalid"),
      openingModes: requiredList(narrative.openingModes, { min: 3, max: 7, itemMax: 120 }, "serial_narrative_openings_invalid"),
      signatureTechniques: requiredList(narrative.signatureTechniques, { min: 3, max: 7, itemMax: 160 }, "serial_narrative_techniques_invalid"),
      escalationPattern: requiredText(narrative.escalationPattern, 500, 20, "serial_narrative_escalation_invalid"),
      revealCadence: requiredText(narrative.revealCadence, 500, 20, "serial_narrative_reveal_invalid"),
      antiRepetitionRules: requiredList(narrative.antiRepetitionRules, { min: 3, max: 10, itemMax: 240 }, "serial_narrative_repetition_invalid")
    }
  };
}

function normalizeArc(source) {
  const episodePlan = array(source.episodePlan).slice(0, STORYHEAVEN_SERIAL_LIMITS.episodesPerArcMax).map((item) => {
    const value = object(item);
    return {
      episodeNo: integer(value.episodeNo, 1, 300, null),
      promise: requiredText(value.promise, 300, 10, "serial_arc_episode_promise_invalid"),
      turn: requiredText(value.turn, 300, 10, "serial_arc_episode_turn_invalid"),
      hook: requiredText(value.hook, 300, 10, "serial_arc_episode_hook_invalid")
    };
  });
  if (episodePlan.length < STORYHEAVEN_SERIAL_LIMITS.episodesPerArcMin || episodePlan.some((item) => item.episodeNo === null)) {
    throw new Error("serial_arc_episode_plan_invalid");
  }
  const episodeNumbers = episodePlan.map((item) => item.episodeNo);
  if (new Set(episodeNumbers).size !== episodeNumbers.length
    || episodeNumbers.some((episodeNo, index) => index > 0 && episodeNo !== episodeNumbers[index - 1] + 1)) {
    throw new Error("serial_arc_episode_plan_not_sequential");
  }
  const reveals = array(source.reveals).slice(0, 30).map((item, index) => {
    const value = object(item);
    return {
      key: text(value.key, 80) || `reveal-${index + 1}`,
      secret: requiredText(value.secret, 500, 10, "serial_reveal_secret_invalid"),
      introduceEpisode: integer(value.introduceEpisode, 1, 300, null),
      payoffEpisode: integer(value.payoffEpisode, 1, 300, null)
    };
  });
  if (reveals.length < 3 || reveals.some((item) => item.introduceEpisode === null || item.payoffEpisode === null)) {
    throw new Error("serial_arc_reveals_invalid");
  }
  if (reveals.some((item) => item.payoffEpisode < item.introduceEpisode)) {
    throw new Error("serial_reveal_payoff_order_invalid");
  }
  return {
    arcTitle: requiredText(source.arcTitle, 120, 2, "serial_arc_title_invalid"),
    centralQuestion: requiredText(source.centralQuestion, 500, 20, "serial_arc_question_invalid"),
    midpointReversal: requiredText(source.midpointReversal, 800, 20, "serial_arc_midpoint_invalid"),
    endingTruth: requiredText(source.endingTruth, 800, 20, "serial_arc_ending_invalid"),
    episodePlan,
    reveals,
    narrativePlan: normalizeNarrativePlan(source.narrativePlan)
  };
}

function normalizeEpisodeCard(source) {
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
  return {
    episodeNo: integer(source.episodeNo, 1, 300, null),
    promise: requiredText(source.promise, 300, 10, "serial_episode_promise_invalid"),
    openingDisturbance: requiredText(source.openingDisturbance, 500, 10, "serial_episode_opening_invalid"),
    scenes,
    payoff: requiredText(source.payoff, 500, 10, "serial_episode_payoff_invalid"),
    hook: requiredText(source.hook, 500, 10, "serial_episode_hook_invalid"),
    knowledgeBefore: stringList(source.knowledgeBefore, { max: 30, itemMax: 300 }),
    canonReferences: stringList(source.canonReferences, { max: 40, itemMax: 80 }),
    techniquePlan: normalizeTechniquePlan(source.techniquePlan)
  };
}

function normalizeDraft(source, rewritten) {
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
    reason: requiredText(source.reason, 400, 10, "serial_technique_reason_invalid")
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

function fieldError(field, code) {
  return { field, code };
}

function issue(code, message, evidence = []) {
  return { code, message, evidence };
}
