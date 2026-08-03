const GENRE_PROFILES = Object.freeze({
  fantasy: Object.freeze([
    "Begin with an ordinary lack, duty, or vulnerability before the impossible rule appears.",
    "Show a power or world rule changing a physical result before naming it; then reveal its cost, limit, or forced choice.",
    "Use future knowledge, reincarnation, or system access to change a concrete choice rather than mirroring the protagonist's former chore as a matching fantasy job, title, tool, or spell.",
    "When a protagonist enters an unfamiliar world or group, make suspicion, misunderstanding, verification, language, and the source of every known name part of the causal scene."
  ]),
  romance: Object.freeze([
    "Establish the relationship's current state, each person's immediate want, and any power imbalance before the first major emotional reversal.",
    "Let dialogue alter distance, trust, obligation, or misunderstanding; pair words with a visible reaction or choice.",
    "Use rooms, clothing, work, money, and social rules to make relational pressure legible without pausing for a biography."
  ]),
  "mystery-thriller": Object.freeze([
    "Establish an ordinary procedure and what should happen before introducing the anomaly.",
    "Present a clue in observable form before a character interprets it; keep clue, interpretation, action, and result in causal order.",
    "Withhold the answer, not the basic scene facts a reader needs to test a suspicion fairly."
  ]),
  sf: Object.freeze([
    "Show the human need, everyday use, or failure of a technology before its technical name or history.",
    "Every explanation must change a decision, reveal a cost, or redefine a relationship in the current scene.",
    "Anchor the large idea in one inspectable object, body effect, workplace, or domestic routine."
  ]),
  horror: Object.freeze([
    "Map the safe, ordinary layout and routine first, then violate exactly one understandable part of it.",
    "Make fear grow from an observable change and the viewpoint character's existing desire, guilt, duty, or attachment.",
    "Do not replace missing facts with vague darkness; readers should know what is present even when they do not know why."
  ]),
  "action-adventure": Object.freeze([
    "State the immediate objective, terrain, constraint, and failure cost before accelerating the action.",
    "Keep technique, contact, bodily or environmental result, and tactical choice in readable order.",
    "Use movement to reveal competence and character; do not interrupt a fight with an unrelated ability catalogue."
  ]),
  drama: Object.freeze([
    "Open on a daily task, relationship, or meaningful object that lets the reader infer the person's present life.",
    "Make dialogue change face, help, distance, obligation, or misunderstanding instead of merely delivering background.",
    "Give the current reason a memory matters before entering a flashback, and return with a changed present choice."
  ]),
  historical: Object.freeze([
    "Introduce the period through lived objects, work, travel limits, prices, forms of address, and consequences in action.",
    "Explain a title or institution only when it changes what a person may do, say, own, or risk in the scene.",
    "Even when the historical outcome is known, foreground the character's uncertain present choice and personal cost."
  ]),
  comedy: Object.freeze([
    "Establish the normal rule and a sincere desire before exposing the contradiction that makes the situation funny.",
    "Escalate through consequence and character choice so each comic beat also advances the plot.",
    "Aim satire at systems, incentives, hypocrisy, or power; vary setup and payoff instead of repeating one verbal gag."
  ])
});

const GENRE_ALIASES = Object.freeze([
  ["mystery-thriller", ["mystery-thriller", "미스터리·스릴러", "미스터리", "스릴러", "추리"]],
  ["action-adventure", ["action-adventure", "액션·모험", "액션", "모험", "무협"]],
  ["historical", ["historical", "시대·역사", "시대", "역사", "시대극"]],
  ["fantasy", ["fantasy", "판타지"]],
  ["romance", ["romance", "로맨스"]],
  ["sf", ["sf", "과학소설", "과학 소설"]],
  ["horror", ["horror", "호러", "공포"]],
  ["drama", ["drama", "드라마"]],
  ["comedy", ["comedy", "코미디", "유머"]]
]);

export function buildSerialGenreEditorialGuidance(payload = {}) {
  const genres = selectedGenres(payload);
  const lines = genres.flatMap((genre, index) => [
    `Genre ${index + 1} (${genre}) transferable craft rules:`,
    ...GENRE_PROFILES[genre].map((rule) => `- ${rule}`)
  ]);
  return [
    "CONTROLLED_AGGREGATE_GENRE_GUIDANCE_START",
    "These are aggregate, high-level craft principles distilled from multiple works. Never name, quote, paraphrase, or imitate any benchmark work or author. Create wholly original characters, events, wording, and scene sequences.",
    ...(lines.length ? lines : ["No specific genre profile was resolved. Apply the universal reader-orientation rules without inventing a benchmark style."]),
    "When several genres are selected, give each a distinct dramatic job and resolve conflicts in favor of reader comprehension and causal continuity.",
    "CONTROLLED_AGGREGATE_GENRE_GUIDANCE_END"
  ].join("\n");
}

function selectedGenres(payload) {
  const schedule = object(payload.schedule);
  const story = object(payload.story);
  const concept = object(payload.concept);
  const bibleConcept = object(object(payload.bible).concept);
  const candidates = [
    ...array(schedule.primaryGenres),
    schedule.primaryGenre,
    ...array(payload.primaryGenres),
    payload.primaryGenre,
    ...array(story.genres),
    ...array(concept.genres),
    ...array(bibleConcept.genres)
  ];
  const resolved = [];
  for (const value of candidates) {
    const genre = resolveGenre(value);
    if (genre && !resolved.includes(genre)) resolved.push(genre);
    if (resolved.length === 3) break;
  }
  return resolved;
}

function resolveGenre(value) {
  const normalized = String(value || "").trim().toLocaleLowerCase("ko-KR");
  if (!normalized) return "";
  for (const [genre, aliases] of GENRE_ALIASES) {
    if (aliases.some((alias) => normalized === alias || normalized.includes(alias))) return genre;
  }
  return "";
}

function object(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function array(value) {
  return Array.isArray(value) ? value : [];
}
