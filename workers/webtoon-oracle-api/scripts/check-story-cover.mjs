import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import {
  STORYHEAVEN_COVER_EPISODE_THRESHOLD,
  buildStoryHeavenCoverSvg,
  createStoryHeavenCoverService,
  shouldGenerateStoryHeavenCover
} from "../src/story-cover.mjs";

assert.equal(STORYHEAVEN_COVER_EPISODE_THRESHOLD, 4);
assert.equal(shouldGenerateStoryHeavenCover({ publishedEpisodeCount: 3 }), false);
assert.equal(shouldGenerateStoryHeavenCover({ publishedEpisodeCount: 4 }), true);
assert.equal(shouldGenerateStoryHeavenCover({ publishedEpisodeCount: 8, coverPath: "/cover.webp" }), false);

const story = {
  id: "cover-check-story",
  title: "검을 빌린 소녀와 도망친 왕자",
  logline: "상처까지 나눠 갖는 소녀와 왕자가 용의 둥지를 지난다.",
  synopsis: "눈 덮인 국경에서 두 사람은 기사단을 피해 달아난다.",
  genre: "fantasy",
  genres: ["fantasy", "romance"],
  tags: ["검", "왕자", "용", "눈"]
};
const svg = buildStoryHeavenCoverSvg(story);
assert.equal(svg, buildStoryHeavenCoverSvg(story));
assert.match(svg, /viewBox="0 0 1536 864"/u);
assert.match(svg, /rotate\(/u);

const tempRoot = await mkdtemp(path.join(os.tmpdir(), "storyheaven-cover-"));
try {
  let updateBind = null;
  const service = createStoryHeavenCoverService({
    assetDir: tempRoot,
    withConnection: async (callback) => callback({
      execute: async () => ({ rows: [{
        ID: story.id,
        TITLE: story.title,
        LOGLINE: story.logline,
        PUBLIC_SYNOPSIS: story.synopsis,
        GENRE: story.genre,
        GENRES_JSON: JSON.stringify(story.genres),
        TAGS_JSON: JSON.stringify(story.tags),
        COVER_PATH: null,
        PUBLISHED_EPISODE_COUNT: 4
      }] })
    }),
    withTransaction: async (callback) => callback({
      execute: async (_sql, bind) => {
        updateBind = bind;
        return { rowsAffected: 1 };
      }
    })
  });
  const result = await service.ensureEligibleCovers();
  assert.equal(result.failed.length, 0);
  assert.equal(result.generated.length, 1);
  assert.equal(result.generated[0].coverPath, "/assets/webtoon/storyheaven-covers/cover-check-story.webp");
  assert.equal(updateBind.story_id, story.id);
  const coverBuffer = await readFile(path.join(tempRoot, "storyheaven-covers", "cover-check-story.webp"));
  const metadata = await sharp(coverBuffer).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 1536);
  assert.equal(metadata.height, 864);
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

console.log("StoryHeaven automatic cover checks passed");
