import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const inputPaths = process.argv.slice(2).filter((arg) => !arg.startsWith("--"));
if (!outputArg || !inputPaths.length) throw new Error("usage: render-private-samples.mjs --output=directory export1.json export2.json ...");
const outputDirectory = path.resolve(outputArg.slice("--output=".length));
const samples = [];
for (const inputPath of inputPaths) {
  const sample = JSON.parse(await readFile(inputPath, "utf8"));
  if (!sample.story?.title || !sample.manuscripts?.length) throw new Error(`sample_not_ready:${inputPath}`);
  samples.push(sample);
}
await mkdir(outputDirectory, { recursive: true });

const styles = `
:root{color-scheme:light dark;--bg:#fff;--ink:#181c20;--muted:#4b5862;--line:#ccd5d9;--accent:#006c56}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font:18px/1.95 system-ui,"Malgun Gothic",sans-serif;letter-spacing:0}
main{max-width:760px;margin:auto;padding:36px 24px 80px}nav{font-size:15px;display:flex;flex-wrap:wrap;gap:10px 24px;margin-bottom:36px}a{color:var(--accent);text-underline-offset:4px}h1{font-size:30px;line-height:1.5;margin:12px 0 18px}h2{font-size:23px;line-height:1.5}h1,h2,p,a{word-break:keep-all;overflow-wrap:anywhere}.meta{color:var(--muted);font-size:14px}.synopsis{color:var(--muted);margin:26px 0 36px;padding-bottom:28px;border-bottom:1px solid var(--line)}.manuscript p{margin:0 0 1.15em}article+article{border-top:1px solid var(--line);margin-top:30px;padding-top:22px}details{margin-top:52px;border-top:1px solid var(--line);padding-top:18px;font-size:15px;color:var(--muted)}summary{cursor:pointer;font-weight:700}footer{margin-top:48px;border-top:1px solid var(--line);padding-top:20px;font-size:15px}blockquote{margin:14px 0;padding-left:14px;border-left:3px solid var(--line)}
@media(max-width:520px){main{padding:24px 18px 56px}h1{font-size:26px}body{font-size:17px;line-height:1.95}}
@media(prefers-color-scheme:dark){:root{--bg:#141718;--ink:#edf2f2;--muted:#bbc6c9;--line:#414c50;--accent:#58d8b3}}
@media print{nav,footer,details{display:none}body{background:white;color:black;font-size:12pt}main{max-width:none;padding:0}a{color:black}}
`;
const escape = (value) => String(value ?? "").replace(/[&<>"']/gu, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const page = (title, body) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title><style>${styles}</style></head><body><main>${body}</main></body></html>\n`;
const cards = [];
const markdown = ["# 신규 작품 비공개 원고 모음"];

for (const [index, sample] of samples.entries()) {
  const filename = `sample-${index + 1}`;
  const manuscript = sample.manuscripts[0];
  const draft = manuscript.draft;
  const approved = ["ready", "published"].includes(manuscript.status) && manuscript.review?.decision === "approved";
  const status = approved ? "검수 통과 · 비공개"
    : manuscript.status === "error" ? "검수 오류 · 비공개 시험 원고"
      : manuscript.review ? "검수 보완 필요 · 비공개 시험 원고" : "검수 중 · 비공개 시험 원고";
  const direction = sample.narrativeDirection?.label || "";
  const title = sample.story.title;
  const synopsis = sample.story.synopsis || "";
  const paragraphs = String(draft.body || "").split(/\n\s*\n/u).map((item) => item.trim()).filter(Boolean);
  if (!paragraphs.length) throw new Error(`empty_manuscript:${filename}`);
  const reviewDetails = `<details><summary>제작·검수 기록</summary><p>${escape(status)}</p><p>${escape(manuscript.review?.summary || "검수 결과가 아직 없습니다.")}</p>${manuscript.toneAssessment ? `<p>${escape(manuscript.toneAssessment.summary)}</p>` : ""}</details>`;
  const navigation = `<nav aria-label="원고 목록"><a href="index.html">작품 목록</a><a href="${filename}.md">텍스트 원고</a></nav>`;
  const next = index + 1 < samples.length ? `<a href="sample-${index + 2}.html">다음 작품</a>` : `<a href="index.html">작품 목록</a>`;
  const body = `${navigation}<p class="meta">${index + 1} / ${samples.length} · ${escape(direction)} · ${escape(status)}</p><h1>${escape(title)}</h1>${synopsis ? `<p class="synopsis">${escape(synopsis)}</p>` : ""}<h2>${escape(draft.title)}</h2><div class="manuscript">${paragraphs.map((paragraph) => `<p>${escape(paragraph).replace(/\n/gu, "<br>")}</p>`).join("\n")}</div>${reviewDetails}<footer>${next}</footer>`;
  await writeFile(path.join(outputDirectory, `${filename}.html`), page(title, body), "utf8");
  const text = [`# ${title}`, "", `${direction} · ${status}`, "", synopsis, "", `## ${draft.title}`, "", draft.body, ""].join("\n");
  await writeFile(path.join(outputDirectory, `${filename}.md`), text, "utf8");
  markdown.push(text);
  cards.push(`<article><p class="meta">${index + 1} · ${escape(direction)} · ${escape(status)}</p><h2><a href="${filename}.html">${escape(title)}</a></h2><p>${escape(synopsis)}</p></article>`);
}

await writeFile(path.join(outputDirectory, "index.html"), page("신규 작품 비공개 원고 모음", `<p class="meta">StoryHeaven · 비공개 시험 제작</p><h1>신규 작품 원고 ${samples.length}편</h1>${cards.join("\n")}<footer><a href="manuscripts.md">전체 텍스트 원고</a></footer>`), "utf8");
await writeFile(path.join(outputDirectory, "manuscripts.md"), markdown.join("\n---\n\n"), "utf8");
console.log(JSON.stringify({ directory: outputDirectory, sampleCount: samples.length, titles: samples.map((sample) => sample.story.title) }));
