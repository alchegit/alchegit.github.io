import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  createStoryHeavenEpisodeSummary,
  createStoryHeavenGuestPreview,
  createStoryHeavenSynopsis,
  normalizeStoryHeavenNickname,
  storyHeavenRoundSchedule,
  temporaryStoryHeavenNickname,
  validateStoryHeavenEpisode,
  validateStoryHeavenPacket,
  validateStoryHeavenNickname
} from "../src/storyheaven.mjs";

assert.equal(normalizeStoryHeavenNickname("  Ｓｔｏｒｙ  씨앗  "), "story 씨앗");
assert.deepEqual(validateStoryHeavenNickname("관리자"), { ok: false, error: "nickname_reserved" });
assert.equal(validateStoryHeavenNickname("관리자", { allowReserved: true }).ok, true);
assert.equal(validateStoryHeavenNickname("작가_17").ok, true);
assert.equal(validateStoryHeavenNickname("hello@example.com").error, "nickname_invalid_characters");
assert.equal(validateStoryHeavenNickname("한").error, "nickname_length_out_of_range");

const temporary = temporaryStoryHeavenNickname("google-user-123");
assert.match(temporary, /^이야기씨앗-[A-F0-9]{6}$/u);
assert.equal(validateStoryHeavenNickname(temporary).ok, true);
assert.equal(temporaryStoryHeavenNickname("google-user-123"), temporary);

const completePacket = {
  title: "막차가 사라진 뒤",
  logline: "폐역 청소부가 매일 가까워지는 유령 열차를 멈추기 위해 마지막 승객의 이름을 찾는다.",
  synopsis: "막차가 끊긴 폐역에서 홀로 청소하는 도윤은 매일 자정, 운행표에 없는 열차가 한 칸씩 가까워지는 것을 본다. 역무실에는 열차가 도착하면 한 사람만 돌아갈 수 있다는 낡은 기록이 남아 있다. 도윤은 열차 안에서 실종된 누나의 우산을 발견하고, 누나를 구하려면 승강장에 남은 다른 사람을 대신 태워야 한다는 사실을 알게 된다. 그는 역에 갇힌 승객들의 이름과 마지막 선택을 추적하며 열차의 규칙을 깨려 한다. 그러나 자정이 가까워질수록 역사 전체가 과거의 모습으로 되돌아가고, 도윤 자신도 명단의 마지막 승객이었다는 단서가 드러난다. 도윤은 누나를 데려오는 대신 모든 승객의 이름을 방송해 열차를 멈추기로 결심한다. 방송이 시작되자 닫혀 있던 문들이 열리지만, 스피커에서는 아직 부르지 않은 도윤의 이름이 먼저 흘러나온다.",
  protagonistGoal: "도윤은 실종된 누나를 찾으면서도 다른 승객을 희생하지 않고 유령 열차의 운행 규칙을 끝내려 한다.",
  obstacleStakes: "자정 전까지 명단의 규칙을 풀지 못하면 역에 남은 사람 한 명이 열차에 타고 모두의 기억에서 사라진다.",
  genre: "미스터리",
  secondaryGenre: "현대판타지",
  rating: "12",
  tags: ["폐역", "가족", "유령열차"],
  editorial: {
    endingDirection: "도윤이 누나를 포기하는 선택처럼 보이지만 이름을 방송해 규칙 자체를 깨고, 마지막에 자신의 이름이 들리며 다음 화를 연다.",
    worldRules: "열차는 자정마다 한 칸 가까워지고 승객 명단에 적힌 이름만 태울 수 있다. 이름이 방송되면 당사자의 마지막 기억이 역사에 재생된다.",
    characters: [{ name: "도윤", desire: "누나를 찾고 싶다", fear: "다른 사람을 대신 희생시키는 것", secret: "자신도 명단에 있다" }],
    turningPoints: { intro: "유령 열차 발견", turn: "누나의 우산 발견", crisis: "대체 승객 규칙 확인", decision: "전원의 이름 방송", hook: "도윤의 이름이 먼저 방송됨" },
    mustKeep: ["자정 시계", "누나의 노란 우산"],
    mustAvoid: ["이유 없는 유령 출현"],
    visualAnchors: ["젖은 폐역 승강장", "꺼진 행선 안내판"]
  }
};
assert.equal(validateStoryHeavenPacket(completePacket, { mode: "submit" }).ok, true);
const simplifiedPacket = { ...completePacket };
delete simplifiedPacket.protagonistGoal;
delete simplifiedPacket.obstacleStakes;
assert.equal(validateStoryHeavenPacket(simplifiedPacket, { mode: "submit" }).ok, true);
const basicPacket = validateStoryHeavenPacket({
  title: "막차가 사라진 뒤",
  genre: "미스터리",
  rating: "12",
  tags: ["폐역", "가족"]
}, { mode: "draft" });
assert.equal(basicPacket.ok, true);
assert.equal(basicPacket.packet.synopsis, "");
assert.match(basicPacket.packet.logline, /이야기를 준비하고 있습니다/u);
assert.equal(validateStoryHeavenPacket({ ...completePacket, contentOrigin: "human_ai_assisted" }, { mode: "submit" }).packet.contentOrigin, "human_ai_assisted");
assert.equal(validateStoryHeavenPacket({ ...completePacket, contentOrigin: "system_ai" }, { mode: "submit" }).ok, false);
assert.ok(validateStoryHeavenPacket({ ...completePacket, title: "<script>alert(1)</script>" }, { mode: "submit" }).errors.some((item) => item.code === "unsafe_content_pattern"));
const incompletePacket = validateStoryHeavenPacket({ title: "짧은 제목", logline: "너무 짧다" }, { mode: "submit" });
assert.equal(incompletePacket.ok, false);
assert.ok(incompletePacket.errors.some((item) => item.field === "genre"));
assert.equal(validateStoryHeavenPacket({ ...completePacket, rating: "adult" }, { mode: "submit" }).ok, false);

const episodeParagraphs = Array.from({ length: 28 }, (_, index) => (
  `${index + 1}번째 장면에서 주인공은 서로 다른 단서와 선택을 마주한다. ` +
  `이 문단은 장면 ${index + 1}만의 행동, 감정, 결과를 담아 반복 원고 검사를 통과하도록 충분히 구체적으로 작성되었다. ` +
  "독자는 선택이 다음 장면에 남기는 결과를 확인하며 이야기를 따라간다. 인물의 목표와 방해 요소가 충돌하고 장면 끝에는 새로운 질문이 남는다."
));
const completeEpisode = {
  title: "첫 번째 정차역",
  summary: "회수 열차에 오른 주인공이 첫 정차역의 규칙을 발견하고, 잃어버린 기억을 되찾기 위해 되돌릴 수 없는 선택을 내립니다. 그 선택은 동료의 운명과 다음 정차역의 비밀까지 바꾸는 회차입니다.",
  body: episodeParagraphs.join("\n\n")
};
const checkedEpisode = validateStoryHeavenEpisode(completeEpisode, { mode: "submit" });
assert.equal(checkedEpisode.ok, true);
assert.ok(checkedEpisode.analysis.characterCount >= 2500);
const automaticCopyEpisode = validateStoryHeavenEpisode({ body: completeEpisode.body }, { mode: "submit" });
assert.equal(automaticCopyEpisode.ok, true);
assert.equal(automaticCopyEpisode.episode.title, "1화");
assert.equal(automaticCopyEpisode.episode.summary, createStoryHeavenEpisodeSummary(completeEpisode.body));
assert.equal(
  validateStoryHeavenPacket(basicPacket.packet, { mode: "submit", episodeBody: completeEpisode.body }).packet.synopsis,
  createStoryHeavenSynopsis(completeEpisode.body)
);
assert.equal(validateStoryHeavenEpisode({ ...completeEpisode, body: "안녕" }, { mode: "submit" }).ok, false);
assert.ok(validateStoryHeavenEpisode({ ...completeEpisode, body: `${completeEpisode.body}\n\n<script>alert(1)</script>` }, { mode: "submit" }).errors.some((item) => item.code === "unsafe_content_pattern"));
assert.ok(validateStoryHeavenEpisode({ ...completeEpisode, body: `${completeEpisode.body}\n\nDROP TABLE users` }, { mode: "submit" }).errors.some((item) => item.code === "unsafe_content_pattern"));
assert.ok(validateStoryHeavenEpisode({ ...completeEpisode, images: ["cover.png"] }, { mode: "submit" }).errors.some((item) => item.code === "episode_media_not_allowed"));
const preview = createStoryHeavenGuestPreview(`${completeEpisode.body}\n\n마지막 반전은 로그인 전에는 노출하지 않습니다.`);
assert.equal(preview.truncated, true);
assert.ok(preview.body.length >= 1200 && preview.body.length <= 2500);
assert.equal(preview.body.includes("마지막 반전"), false);

const round = storyHeavenRoundSchedule("2026-07-22T03:00:00.000Z");
assert.equal(round.roundKey, "2026-07-20");
assert.equal(round.startsAt, "2026-07-19T15:00:00.000Z");
assert.equal(round.submissionCutoffAt, "2026-07-24T09:00:00.000Z");
assert.equal(round.votingEndsAt, "2026-07-26T12:00:00.000Z");
assert.equal(round.status, "open");
assert.equal(storyHeavenRoundSchedule("2026-07-24T10:00:00.000Z", { nextAfterCutoff: true }).roundKey, "2026-07-27");

const server = await readFile(new URL("../src/server.mjs", import.meta.url), "utf8");
for (const route of [
  "/api/storyheaven/feed",
  "/api/storyheaven/nicknames/availability",
  "/api/storyheaven/me/nickname",
  "/api/storyheaven/rounds/current",
  "/api/storyheaven/me/stories",
  "/api/storyheaven/stories/:id/draft",
  "/api/storyheaven/stories/:id/submit",
  "/api/storyheaven/stories/:id/like",
  "/api/storyheaven/stories/:id/report",
  "/api/storyheaven/stories/:id/view",
  "/api/storyheaven/stories/:id/episodes",
  "/api/storyheaven/stories/:id/episodes/:episodeNo",
  "/api/storyheaven/stories/:id/episodes/:episodeNo/view",
  "/api/storyheaven/stories/:id/episodes/:episodeNo/draft",
  "/api/storyheaven/stories/:id/episodes/:episodeNo/submit",
  "/api/storyheaven/stories/:id/reading-progress",
  "/api/storyheaven/stories/:id/episodes/:episodeNo/reactions",
  "/api/storyheaven/me/notifications",
  "/api/storyheaven/me/notifications/:id/read",
  "/api/storyheaven/reports/:id/appeal",
  "/api/storyheaven/operator/stories/:id/endorsement",
  "/api/storyheaven/operator/submissions",
  "/api/storyheaven/operator/episodes",
  "/api/storyheaven/operator/episodes/:id/review",
  "/api/storyheaven/operator/reports",
  "/api/storyheaven/operator/reports/:id/resolve",
  "/api/storyheaven/operator/appeals/:id/resolve",
  "/api/storyheaven/operator/rounds/pending",
  "/api/storyheaven/operator/rounds/:id/audit",
  "/api/storyheaven/operator/votes/:id/invalidate",
  "/api/storyheaven/operator/entries/:id/disqualify",
  "/api/storyheaven/operator/stories/:id/review",
  "/api/storyheaven/operator/rounds/:id/finalize"
]) {
  assert.ok(server.includes(route), "missing route: " + route);
}
assert.ok(server.includes('rankingPolicy: "reader_likes_only"'));
assert.ok(server.includes('affectsReaderLikeCount: false'));
assert.ok(server.includes('author_cannot_like_own_story'));
assert.ok(server.includes('new Set(["human", "human_ai_assisted"])'));
assert.ok(server.includes("createStoryHeavenGuestPreview"));
assert.ok(server.includes('app.use("/api/storyheaven", express.json({ limit: "64kb" }))'));
assert.ok(server.includes('eventType: "storyheaven_unsafe_content_blocked"'));
assert.ok(server.includes('throw httpError("episode_review_required", 409)'));
assert.ok(server.includes('!allowReserved && current.NICKNAME_STATUS === "active"'));
assert.ok(server.includes('/api/webtoon/projects/:id/view'));
assert.ok(server.includes("view_count = view_count + 1"));
assert.ok(server.includes("const counted = !isAdminIdentity(user)"));
assert.ok(server.includes("loginRequired: false"));

const migration = await readFile(new URL("../../../oracle/20260724-storyheaven-foundation.sql", import.meta.url), "utf8");
for (const table of [
  "storyheaven_stories",
  "storyheaven_likes",
  "storyheaven_endorsements",
  "storyheaven_nickname_history",
  "storyheaven_provenance"
]) {
  assert.ok(migration.includes(table), "missing table: " + table);
}
assert.ok(migration.includes("'ai_seed'"));
assert.ok(migration.includes("competition_eligible"));

const submissionMigration = await readFile(new URL("../../../oracle/20260724-storyheaven-submissions.sql", import.meta.url), "utf8");
for (const table of ["storyheaven_revisions", "storyheaven_consents", "storyheaven_activity"]) {
  assert.ok(submissionMigration.includes(table), "missing submission table: " + table);
}
assert.ok(submissionMigration.includes("review_decision"));

const weeklyMigration = await readFile(new URL("../../../oracle/20260724-storyheaven-weekly-rounds.sql", import.meta.url), "utf8");
for (const table of ["storyheaven_rounds", "storyheaven_entries", "storyheaven_votes", "storyheaven_vote_audit"]) {
  assert.ok(weeklyMigration.includes(table), "missing weekly table: " + table);
}
assert.ok(weeklyMigration.includes("uq_sh_entry_author"));
assert.ok(weeklyMigration.includes("uq_sh_round_vote"));

const moderationMigration = await readFile(new URL("../../../oracle/20260724-storyheaven-round-moderation.sql", import.meta.url), "utf8");
for (const column of ["invalidated_at", "invalidation_reason", "disqualified_at", "disqualified_by"]) {
  assert.ok(moderationMigration.includes(column), "missing moderation column: " + column);
}
assert.ok(server.includes("vote_invalidated_by_operator"));
assert.ok(server.includes("weekly_entry_disqualified"));

const reportsMigration = await readFile(new URL("../../../oracle/20260724-storyheaven-reports.sql", import.meta.url), "utf8");
for (const table of ["storyheaven_reports", "storyheaven_notifications", "storyheaven_appeals"]) {
  assert.ok(reportsMigration.includes(table), "missing reports table: " + table);
}
assert.ok(reportsMigration.includes("uq_sh_report_once"));
assert.ok(reportsMigration.includes("uq_sh_report_appeal"));
assert.ok(server.includes("author_cannot_report_own_story"));
assert.ok(server.includes("automaticStoryAction: false"));

const serialMigration = await readFile(new URL("../../../oracle/20260724-storyheaven-serial-reading.sql", import.meta.url), "utf8");
for (const table of ["storyheaven_episodes", "storyheaven_episode_revisions", "storyheaven_reading_progress", "storyheaven_episode_reactions"]) {
  assert.ok(serialMigration.includes(table), "missing serial table: " + table);
}
assert.ok(serialMigration.includes("episode_review_result"));

const viewMigration = await readFile(new URL("../../../oracle/20260727-public-view-counts.sql", import.meta.url), "utf8");
for (const table of ["storyheaven_stories", "storyheaven_episodes", "webtoon_projects"]) {
  assert.ok(viewMigration.includes(table), "missing view-count table: " + table);
}
assert.ok(viewMigration.includes("view_count"));

const page = await readFile(new URL("../../../storyheaven/index.html", import.meta.url), "utf8");
assert.ok(page.includes("실제 독자의 좋아요만 순위에 반영됩니다."));
assert.ok(page.includes("Google 로그인"));
const pageScript = await readFile(new URL("../../../storyheaven/storyheaven.js", import.meta.url), "utf8");
assert.ok(pageScript.includes("AI 시드 스토리"));
const seedLibrary = await readFile(new URL("../../../storyheaven/seed-library.js", import.meta.url), "utf8");
assert.ok(seedLibrary.includes("여덟 초를 싣는 막차"));
assert.ok(seedLibrary.includes("contentOrigin: \"ai_seed\""));
const writePage = await readFile(new URL("../../../storyheaven/write/index.html", import.meta.url), "utf8");
assert.ok(writePage.includes("data-submission-guide"));
assert.ok(writePage.includes("그림·첨부파일·HTML은 불가능"));

console.log("StoryHeaven foundation checks passed");
