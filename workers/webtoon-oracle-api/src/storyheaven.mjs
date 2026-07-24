import crypto from "node:crypto";

export const STORYHEAVEN_NICKNAME_LIMITS = Object.freeze({
  min: 2,
  max: 20,
  cooldownDays: 30,
  historyHoldDays: 90
});

export const STORYHEAVEN_STORY_LIMITS = Object.freeze({
  title: Object.freeze({ min: 2, max: 60 }),
  logline: Object.freeze({ min: 30, max: 160 }),
  synopsis: Object.freeze({ min: 400, max: 1200 }),
  protagonistGoal: Object.freeze({ min: 40, max: 300 }),
  obstacleStakes: Object.freeze({ min: 40, max: 300 }),
  endingDirection: Object.freeze({ min: 30, max: 500 }),
  worldRules: Object.freeze({ min: 50, max: 700 }),
  characterCount: 5,
  characterField: 160,
  turningPoint: 300,
  listCount: 5,
  listItem: 120,
  visualAnchorCount: 8,
  visualAnchor: 160,
  tagCount: 5,
  tag: 12,
  total: 5000
});

export const STORYHEAVEN_EPISODE_LIMITS = Object.freeze({
  title: Object.freeze({ min: 2, max: 80 }),
  summary: Object.freeze({ min: 80, max: 500 }),
  body: Object.freeze({ min: 2500, recommendedMin: 4000, recommendedMax: 7000, max: 12000 }),
  paragraphs: Object.freeze({ min: 8, max: 240 }),
  draftsPerSeries: 5,
  publishedPerSeries: 300,
  requestBodyBytes: 64 * 1024,
  guestPreview: Object.freeze({ ratio: 0.35, min: 1200, max: 2500 }),
  readingCharactersPerMinute: 450,
  urls: 3,
  duplicateParagraphRatio: 0.35
});

export const STORYHEAVEN_REACTIONS = Object.freeze([
  "next_episode",
  "character",
  "world",
  "tension"
]);

export const STORYHEAVEN_GENRES = Object.freeze([
  "현대판타지",
  "로맨스",
  "로맨스판타지",
  "미스터리",
  "스릴러",
  "SF",
  "드라마",
  "코미디",
  "액션",
  "공포",
  "일상",
  "기타"
]);

const storyRatings = new Set(["all", "12", "15"]);
const readerStoryOrigins = new Set(["human", "human_ai_assisted"]);
const turningPointKeys = ["intro", "turn", "crisis", "decision", "hook"];
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export const STORYHEAVEN_RESERVED_NICKNAMES = Object.freeze([
  "admin",
  "administrator",
  "official",
  "operator",
  "storyheaven",
  "support",
  "관리자",
  "스토리천국",
  "운영자",
  "운영진"
]);

const forbiddenPattern = /[\u0000-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/u;
const contentControlPattern = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/u;
const allowedPattern = /^[\p{Script=Hangul}\p{Letter}\p{Number}_ -]+$/u;
const contactPattern = /(?:https?:\/\/|www\.|@|\.(?:com|net|org|kr)\b)/iu;
const executableMarkupPattern = /<\s*\/?\s*(?:script|iframe|object|embed|svg|link|meta|style|form|input|button|textarea|video|audio)\b/iu;
const browserExecutionPattern = /(?:javascript|vbscript|data)\s*:|\bon(?:error|load|click|mouseover|focus|animationstart)\s*=|\b(?:eval|setTimeout|setInterval)\s*\(|\bdocument\s*\.\s*(?:cookie|write)|\bwindow\s*\.\s*location/iu;
const destructiveSqlPattern = /\b(?:drop\s+(?:table|database|user)|truncate\s+table|alter\s+table|union\s+(?:all\s+)?select|execute\s+immediate|dbms_[a-z0-9_]+|or\s+1\s*=\s*1)\b/iu;
const sqlStatementPattern = /(?:^|[;\n])\s*(?:select\s+.{1,160}\s+from|insert\s+into|update\s+[a-z0-9_$#]+\s+set|delete\s+from)\b/imu;
const sqlCommentPattern = /(?:--[^\n]*|\/\*[\s\S]*?\*\/)/u;
const urlPattern = /https?:\/\/[^\s<>{}\[\]"']+/giu;

export function normalizeStoryHeavenNickname(value) {
  return String(value || "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/gu, " ")
    .toLocaleLowerCase("ko-KR");
}

export function validateStoryHeavenNickname(value) {
  const nickname = String(value || "").normalize("NFKC").trim().replace(/\s+/gu, " ");
  const length = graphemeLength(nickname);

  if (length < STORYHEAVEN_NICKNAME_LIMITS.min || length > STORYHEAVEN_NICKNAME_LIMITS.max) {
    return { ok: false, error: "nickname_length_out_of_range" };
  }
  if (forbiddenPattern.test(nickname) || !allowedPattern.test(nickname)) {
    return { ok: false, error: "nickname_invalid_characters" };
  }
  if (contactPattern.test(nickname)) {
    return { ok: false, error: "nickname_contact_info_not_allowed" };
  }

  const normalized = normalizeStoryHeavenNickname(nickname);
  if (STORYHEAVEN_RESERVED_NICKNAMES.includes(normalized)) {
    return { ok: false, error: "nickname_reserved" };
  }
  return { ok: true, nickname, normalized, length };
}

export function temporaryStoryHeavenNickname(userId, attempt = 0) {
  const digest = crypto
    .createHash("sha256")
    .update(`${String(userId || "guest")}:${Math.max(0, Number(attempt) || 0)}`)
    .digest("hex")
    .slice(0, 6)
    .toUpperCase();
  return `이야기씨앗-${digest}`;
}

export function validateStoryHeavenPacket(value, { mode = "draft" } = {}) {
  const input = value && typeof value === "object" ? value : {};
  const requestedRating = String(input.rating || input.contentRating || "all");
  const packet = {
    title: cleanText(input.title),
    logline: cleanText(input.logline),
    synopsis: cleanMultiline(input.synopsis ?? input.publicSynopsis),
    protagonistGoal: cleanMultiline(input.protagonistGoal),
    obstacleStakes: cleanMultiline(input.obstacleStakes),
    genre: cleanText(input.genre) || STORYHEAVEN_GENRES[0],
    secondaryGenre: cleanText(input.secondaryGenre),
    contentOrigin: readerStoryOrigins.has(String(input.contentOrigin || "human"))
      ? String(input.contentOrigin || "human")
      : "human",
    rating: storyRatings.has(requestedRating)
      ? requestedRating
      : "all",
    tags: cleanList(input.tags, STORYHEAVEN_STORY_LIMITS.tagCount),
    editorial: normalizeEditorial(input.editorial || input.privateEditorial || {})
  };
  const errors = [];
  const submitting = mode === "submit";

  validateLength(errors, "title", packet.title, STORYHEAVEN_STORY_LIMITS.title, true);
  validateLength(errors, "logline", packet.logline, STORYHEAVEN_STORY_LIMITS.logline, submitting);
  validateLength(errors, "synopsis", packet.synopsis, STORYHEAVEN_STORY_LIMITS.synopsis, submitting);
  validateLength(errors, "protagonistGoal", packet.protagonistGoal, STORYHEAVEN_STORY_LIMITS.protagonistGoal, submitting);
  validateLength(errors, "obstacleStakes", packet.obstacleStakes, STORYHEAVEN_STORY_LIMITS.obstacleStakes, submitting);

  if (!STORYHEAVEN_GENRES.includes(packet.genre)) {
    errors.push({ field: "genre", code: "story_genre_invalid" });
  }
  if (packet.secondaryGenre && !STORYHEAVEN_GENRES.includes(packet.secondaryGenre)) {
    errors.push({ field: "secondaryGenre", code: "story_genre_invalid" });
  }
  if (!storyRatings.has(requestedRating)) {
    errors.push({ field: "rating", code: "story_rating_invalid" });
  }
  if (!readerStoryOrigins.has(String(input.contentOrigin || "human"))) {
    errors.push({ field: "contentOrigin", code: "story_origin_invalid" });
  }
  packet.tags.forEach((tag, index) => {
    if (graphemeLength(tag) > STORYHEAVEN_STORY_LIMITS.tag) {
      errors.push({ field: `tags.${index}`, code: "story_field_too_long", max: STORYHEAVEN_STORY_LIMITS.tag });
    }
  });

  validateOptionalLength(errors, "editorial.endingDirection", packet.editorial.endingDirection, STORYHEAVEN_STORY_LIMITS.endingDirection, submitting);
  validateOptionalLength(errors, "editorial.worldRules", packet.editorial.worldRules, STORYHEAVEN_STORY_LIMITS.worldRules, false);
  packet.editorial.characters.forEach((character, index) => {
    ["name", "desire", "fear", "secret"].forEach((key) => {
      if (graphemeLength(character[key]) > STORYHEAVEN_STORY_LIMITS.characterField) {
        errors.push({ field: `editorial.characters.${index}.${key}`, code: "story_field_too_long", max: STORYHEAVEN_STORY_LIMITS.characterField });
      }
    });
  });
  turningPointKeys.forEach((key) => {
    if (graphemeLength(packet.editorial.turningPoints[key]) > STORYHEAVEN_STORY_LIMITS.turningPoint) {
      errors.push({ field: `editorial.turningPoints.${key}`, code: "story_field_too_long", max: STORYHEAVEN_STORY_LIMITS.turningPoint });
    }
  });
  validateEditorialList(errors, "mustKeep", packet.editorial.mustKeep, STORYHEAVEN_STORY_LIMITS.listItem);
  validateEditorialList(errors, "mustAvoid", packet.editorial.mustAvoid, STORYHEAVEN_STORY_LIMITS.listItem);
  validateEditorialList(errors, "visualAnchors", packet.editorial.visualAnchors, STORYHEAVEN_STORY_LIMITS.visualAnchor);

  for (const [field, text] of storyPacketTextEntries(packet)) {
    const threat = detectStoryHeavenTextThreat(text);
    if (threat) errors.push({ field, code: "unsafe_content_pattern", threat });
  }

  const totalLength = storyPacketLength(packet);
  if (totalLength > STORYHEAVEN_STORY_LIMITS.total) {
    errors.push({ field: "story", code: "story_total_too_long", max: STORYHEAVEN_STORY_LIMITS.total, actual: totalLength });
  }

  return { ok: errors.length === 0, errors, packet, totalLength };
}

export function validateStoryHeavenEpisode(value, { mode = "draft" } = {}) {
  const input = value && typeof value === "object" ? value : {};
  const episode = {
    title: cleanText(input.title),
    summary: cleanMultiline(input.summary),
    body: cleanEpisodeBody(input.body ?? input.bodyText)
  };
  const errors = [];
  const submitting = mode === "submit";
  const mediaFields = ["image", "images", "media", "file", "files", "attachment", "attachments", "illustration"];

  if (mediaFields.some((field) => Object.prototype.hasOwnProperty.call(input, field))) {
    errors.push({ field: "body", code: "episode_media_not_allowed" });
  }

  validateLength(errors, "title", episode.title, STORYHEAVEN_EPISODE_LIMITS.title, true);
  validateOptionalLength(errors, "summary", episode.summary, STORYHEAVEN_EPISODE_LIMITS.summary, submitting);
  validateOptionalLength(errors, "body", episode.body, STORYHEAVEN_EPISODE_LIMITS.body, submitting);

  const analysis = analyzeStoryHeavenEpisode(episode.body);
  if (analysis.paragraphCount > STORYHEAVEN_EPISODE_LIMITS.paragraphs.max) {
    errors.push({ field: "body", code: "episode_too_many_paragraphs", max: STORYHEAVEN_EPISODE_LIMITS.paragraphs.max, actual: analysis.paragraphCount });
  }
  if (submitting && analysis.paragraphCount < STORYHEAVEN_EPISODE_LIMITS.paragraphs.min) {
    errors.push({ field: "body", code: "episode_too_few_paragraphs", min: STORYHEAVEN_EPISODE_LIMITS.paragraphs.min, actual: analysis.paragraphCount });
  }
  if (submitting && analysis.duplicateParagraphRatio > STORYHEAVEN_EPISODE_LIMITS.duplicateParagraphRatio) {
    errors.push({ field: "body", code: "episode_repeated_content", maxRatio: STORYHEAVEN_EPISODE_LIMITS.duplicateParagraphRatio, actualRatio: analysis.duplicateParagraphRatio });
  }
  if (analysis.urlCount > STORYHEAVEN_EPISODE_LIMITS.urls) {
    errors.push({ field: "body", code: "episode_too_many_urls", max: STORYHEAVEN_EPISODE_LIMITS.urls, actual: analysis.urlCount });
  }

  for (const [field, text] of [["title", episode.title], ["summary", episode.summary], ["body", episode.body]]) {
    const threat = detectStoryHeavenTextThreat(text);
    if (threat) errors.push({ field, code: "unsafe_content_pattern", threat });
  }

  return {
    ok: errors.length === 0,
    errors,
    episode,
    analysis,
    estimatedReadMinutes: Math.max(1, Math.ceil(analysis.characterCount / STORYHEAVEN_EPISODE_LIMITS.readingCharactersPerMinute))
  };
}

export function analyzeStoryHeavenEpisode(value) {
  const body = cleanEpisodeBody(value);
  const paragraphs = body.split(/\n\s*\n/gu).map((item) => item.trim()).filter(Boolean);
  const normalizedParagraphs = paragraphs.map((item) => item.toLocaleLowerCase("ko-KR").replace(/\s+/gu, " "));
  const counts = new Map();
  normalizedParagraphs.forEach((item) => counts.set(item, (counts.get(item) || 0) + 1));
  const duplicateCharacters = normalizedParagraphs.reduce((total, item) => (
    total + ((counts.get(item) || 0) > 1 ? graphemeLength(item) : 0)
  ), 0);
  const characterCount = graphemeLength(body.replace(/\s/gu, ""));
  return {
    characterCount,
    paragraphCount: paragraphs.length,
    duplicateParagraphRatio: characterCount ? Number((duplicateCharacters / characterCount).toFixed(4)) : 0,
    urlCount: (body.match(urlPattern) || []).length
  };
}

export function createStoryHeavenGuestPreview(value) {
  const body = cleanEpisodeBody(value);
  const length = graphemeLength(body);
  if (!length) return { body: "", previewCharacters: 0, totalCharacters: 0, truncated: false };
  const target = Math.min(
    STORYHEAVEN_EPISODE_LIMITS.guestPreview.max,
    Math.max(STORYHEAVEN_EPISODE_LIMITS.guestPreview.min, Math.ceil(length * STORYHEAVEN_EPISODE_LIMITS.guestPreview.ratio))
  );
  if (length <= target) return { body, previewCharacters: length, totalCharacters: length, truncated: false };

  const segments = typeof Intl?.Segmenter === "function"
    ? [...new Intl.Segmenter("ko", { granularity: "grapheme" }).segment(body)]
    : [...body].map((segment) => ({ segment }));
  let cut = target;
  const searchEnd = Math.min(segments.length, target + 240);
  for (let index = target; index < searchEnd; index += 1) {
    if (/[.!?。！？]\s|\n\s*\n/u.test(segments[index]?.segment + (segments[index + 1]?.segment || ""))) {
      cut = index + 1;
      break;
    }
  }
  const preview = segments.slice(0, cut).map((item) => item.segment).join("").trimEnd();
  return { body: preview, previewCharacters: graphemeLength(preview), totalCharacters: length, truncated: true };
}

export function detectStoryHeavenTextThreat(value) {
  const text = String(value || "");
  if (contentControlPattern.test(text)) return "control_characters";
  if (executableMarkupPattern.test(text)) return "executable_markup";
  if (browserExecutionPattern.test(text)) return "browser_execution";
  if (destructiveSqlPattern.test(text) || (sqlStatementPattern.test(text) && sqlCommentPattern.test(text))) return "database_execution";
  return null;
}

export function storyPacketLength(packet) {
  let total = 0;
  const visit = (item) => {
    if (typeof item === "string") total += graphemeLength(item);
    else if (Array.isArray(item)) item.forEach(visit);
    else if (item && typeof item === "object") Object.values(item).forEach(visit);
  };
  visit(packet);
  return total;
}

function storyPacketTextEntries(packet) {
  const entries = [];
  const visit = (value, path) => {
    if (typeof value === "string") entries.push([path, value]);
    else if (Array.isArray(value)) value.forEach((item, index) => visit(item, `${path}.${index}`));
    else if (value && typeof value === "object") Object.entries(value).forEach(([key, item]) => visit(item, path ? `${path}.${key}` : key));
  };
  visit(packet, "");
  return entries;
}

export function storyHeavenRoundSchedule(value = new Date(), { nextAfterCutoff = false } = {}) {
  const now = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(now.getTime())) throw new TypeError("invalid_round_date");
  const kst = new Date(now.getTime() + KST_OFFSET_MS);
  const mondayOffset = (kst.getUTCDay() + 6) % 7;
  let mondayUtc = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() - mondayOffset) - KST_OFFSET_MS;
  const cutoffUtc = mondayUtc + (4 * 24 + 18) * 60 * 60 * 1000;
  if (nextAfterCutoff && now.getTime() >= cutoffUtc) mondayUtc += 7 * 24 * 60 * 60 * 1000;
  const mondayKst = new Date(mondayUtc + KST_OFFSET_MS);
  const roundKey = [mondayKst.getUTCFullYear(), String(mondayKst.getUTCMonth() + 1).padStart(2, "0"), String(mondayKst.getUTCDate()).padStart(2, "0")].join("-");
  return Object.freeze({
    roundKey,
    startsAt: new Date(mondayUtc).toISOString(),
    submissionCutoffAt: new Date(mondayUtc + (4 * 24 + 18) * 60 * 60 * 1000).toISOString(),
    votingEndsAt: new Date(mondayUtc + (6 * 24 + 21) * 60 * 60 * 1000).toISOString(),
    auditDeadlineAt: new Date(mondayUtc + (7 * 24 + 12) * 60 * 60 * 1000).toISOString(),
    resultAt: new Date(mondayUtc + (7 * 24 + 18) * 60 * 60 * 1000).toISOString(),
    status: now.getTime() < mondayUtc
      ? "scheduled"
      : now.getTime() < mondayUtc + (6 * 24 + 21) * 60 * 60 * 1000
        ? "open"
        : "auditing"
  });
}

export function graphemeLength(value) {
  if (typeof Intl?.Segmenter === "function") {
    return [...new Intl.Segmenter("ko", { granularity: "grapheme" }).segment(String(value || ""))].length;
  }
  return [...String(value || "")].length;
}

function normalizeEditorial(value) {
  const input = value && typeof value === "object" ? value : {};
  const characters = Array.isArray(input.characters)
    ? input.characters.slice(0, STORYHEAVEN_STORY_LIMITS.characterCount).map((character) => ({
        name: cleanText(character?.name),
        desire: cleanMultiline(character?.desire),
        fear: cleanMultiline(character?.fear),
        secret: cleanMultiline(character?.secret)
      }))
    : [];
  const points = input.turningPoints && typeof input.turningPoints === "object" ? input.turningPoints : {};
  return {
    endingDirection: cleanMultiline(input.endingDirection),
    worldRules: cleanMultiline(input.worldRules),
    characters,
    turningPoints: Object.fromEntries(turningPointKeys.map((key) => [key, cleanMultiline(points[key])])),
    mustKeep: cleanList(input.mustKeep, STORYHEAVEN_STORY_LIMITS.listCount),
    mustAvoid: cleanList(input.mustAvoid, STORYHEAVEN_STORY_LIMITS.listCount),
    visualAnchors: cleanList(input.visualAnchors, STORYHEAVEN_STORY_LIMITS.visualAnchorCount)
  };
}

function validateLength(errors, field, value, limits, enforceMinimum) {
  const length = graphemeLength(value);
  if (!length) {
    errors.push({ field, code: "story_field_required" });
  } else if (enforceMinimum && length < limits.min) {
    errors.push({ field, code: "story_field_too_short", min: limits.min, actual: length });
  }
  if (length > limits.max) {
    errors.push({ field, code: "story_field_too_long", max: limits.max, actual: length });
  }
}

function validateOptionalLength(errors, field, value, limits, required) {
  const length = graphemeLength(value);
  if (required && length < limits.min) {
    errors.push({ field, code: length ? "story_field_too_short" : "story_field_required", min: limits.min, actual: length });
  }
  if (length > limits.max) {
    errors.push({ field, code: "story_field_too_long", max: limits.max, actual: length });
  }
}

function validateEditorialList(errors, name, values, maxLength) {
  values.forEach((item, index) => {
    if (graphemeLength(item) > maxLength) {
      errors.push({ field: `editorial.${name}.${index}`, code: "story_field_too_long", max: maxLength });
    }
  });
}

function cleanText(value) {
  return String(value || "").normalize("NFKC").trim().replace(/\s+/gu, " ");
}

function cleanMultiline(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/\r\n?/gu, "\n")
    .split("\n")
    .map((line) => line.trim().replace(/[ \t]+/gu, " "))
    .join("\n")
    .replace(/\n{3,}/gu, "\n\n")
    .trim();
}

function cleanEpisodeBody(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/\r\n?/gu, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/gu, "")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/gu, ""))
    .join("\n")
    .replace(/\n{4,}/gu, "\n\n\n")
    .trim();
}

function cleanList(value, maximum) {
  const source = Array.isArray(value) ? value : String(value || "").split(/[,\n]/u);
  return [...new Set(source.map(cleanText).filter(Boolean))].slice(0, maximum);
}
