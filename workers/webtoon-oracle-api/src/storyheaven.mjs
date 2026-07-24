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
const allowedPattern = /^[\p{Script=Hangul}\p{Letter}\p{Number}_ -]+$/u;
const contactPattern = /(?:https?:\/\/|www\.|@|\.(?:com|net|org|kr)\b)/iu;

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

  const totalLength = storyPacketLength(packet);
  if (totalLength > STORYHEAVEN_STORY_LIMITS.total) {
    errors.push({ field: "story", code: "story_total_too_long", max: STORYHEAVEN_STORY_LIMITS.total, actual: totalLength });
  }

  return { ok: errors.length === 0, errors, packet, totalLength };
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

function cleanList(value, maximum) {
  const source = Array.isArray(value) ? value : String(value || "").split(/[,\n]/u);
  return [...new Set(source.map(cleanText).filter(Boolean))].slice(0, maximum);
}
