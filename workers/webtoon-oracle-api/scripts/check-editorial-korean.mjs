import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const root = new URL("../../../", import.meta.url);
const context = vm.createContext({ window: {} });

for (const path of ["storyheaven/seed-library.js", "storyheaven/editorial-episodes.js"]) {
  const source = await readFile(new URL(path, root), "utf8");
  vm.runInContext(source, context, { filename: path });
}

const stories = context.window.StoryHeavenSeeds?.stories ?? [];
const episodes = stories.flatMap((story) =>
  (story.episodes ?? []).map((episode) => ({ story, episode }))
);

assert.equal(stories.length, 6, "editorial showcase must contain six serials");
assert.equal(episodes.length, 12, "editorial showcase must contain twelve episodes");
assert.equal(stories[0]?.title, "8초를 싣는 막차");

const forbiddenPatterns = [
  [/열한 해/u, "11년"],
  [/여덟 초/u, "8초"],
  [/사십 분/u, "40분"],
  [/삼 년/u, "3년"],
  [/다섯 해/u, "5년"],
  [/스물일곱 해/u, "27년"],
  [/열세 층/u, "13층"],
  [/스무 해/u, "20년"],
  [/새벽 두 시/u, "새벽 2시"],
  [/두 시간 십칠 분/u, "2시간 17분"],
  [/한 시간 십 분/u, "1시간 10분"],
  [/되어졌/u, "됐 또는 되었"],
  [/에 의하여|에 의해/u, "능동형 문장"]
];

const reports = [];
for (const { story, episode } of episodes) {
  const body = String(episode.body ?? "").trim();
  assert.ok(body, `${episode.id}: body is empty`);
  assert.doesNotMatch(body, /<\/?(?:script|iframe|object|embed)\b/iu, `${episode.id}: executable markup`);
  assert.doesNotMatch(body, /[ \t]{2,}/u, `${episode.id}: repeated spaces`);

  for (const [pattern, replacement] of forbiddenPatterns) {
    assert.doesNotMatch(
      `${story.title}\n${episode.title}\n${episode.summary}\n${body}`,
      pattern,
      `${episode.id}: use ${replacement}`
    );
  }

  const paragraphs = body.split(/\n{2,}/u).filter(Boolean);
  const sentences = body
    .split(/(?<=[.!?。！？’”])\s+/u)
    .map((sentence) => sentence.replace(/\s+/gu, " ").trim())
    .filter(Boolean);
  const longestSentence = Math.max(...sentences.map((sentence) => [...sentence].length));
  assert.ok(longestSentence <= 130, `${episode.id}: sentence exceeds 130 characters`);

  const dialogueParagraphs = paragraphs.filter((paragraph) => /^[‘'"「『\[]/u.test(paragraph)).length;
  reports.push({
    id: episode.id,
    title: `${story.title} ${episode.episodeNo}화`,
    characters: [...body.replace(/\s/gu, "")].length,
    paragraphs: paragraphs.length,
    averageSentence: Number(
      (sentences.reduce((sum, sentence) => sum + [...sentence].length, 0) / sentences.length).toFixed(1)
    ),
    longestSentence,
    dialogueRatio: Number((dialogueParagraphs / paragraphs.length).toFixed(2))
  });
}

const signatureCount = new Set(
  reports.map((report) => `${report.averageSentence}:${report.dialogueRatio}`)
).size;
assert.ok(signatureCount >= 6, "editorial serials need measurably different prose rhythms");

console.table(reports);
console.log("StoryHeaven Korean editorial checks passed");
