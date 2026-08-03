import assert from "node:assert/strict";
import { chromium } from "playwright";

const root = process.env.STORYHEAVEN_TEST_ROOT || "http://127.0.0.1:4178";
const apiPattern = "https://harvard-museum-nails-mission.trycloudflare.com/**";
const browser = await chromium.launch({ headless: true });
const completeArchitecture = {
  status: "complete",
  schemaVersion: "2026-08-03-v1",
  plannedVolumeCount: 10,
  plannedMainEpisodeCount: 250,
  renewableConflictCount: 5,
  longRevealCount: 6,
  lateRevealCount: 3
};
const weakArchitecture = {
  status: "needs_strengthening",
  schemaVersion: null,
  plannedVolumeCount: 0,
  plannedMainEpisodeCount: 0,
  renewableConflictCount: 0,
  longRevealCount: 0,
  lateRevealCount: 0
};

const stories = [
  {
    id: "serial-public-auto",
    title: "0번 버스의 마지막 승객",
    logline: "기억을 요금으로 받는 버스 기사가 사라진 누나의 정류장을 추적한다.",
    genres: ["현대판타지", "도시괴담"],
    storyStatus: "published",
    visibility: "public",
    continuationMode: "auto",
    operatorNote: "",
    viewCount: 1834,
    episodeCount: 4,
    publishedEpisodeCount: 3,
    latestEpisodeNo: 3,
    latestEpisodeTitle: "지워진 정류장",
    latestEpisodeAt: "2026-07-31T03:00:00.000Z",
    recommendationCount: 18,
    activeRunCount: 1,
    queue: { id: "queue-next-4", status: "waiting", queuePosition: 2, cancelable: true },
    latestRunStatus: "published",
    readyPublicationCount: 0,
    architecture: completeArchitecture,
    schedule: { id: "schedule-a", name: "주간 판타지", status: "active", publicationMode: "auto_public" },
    publishedAt: "2026-07-20T03:00:00.000Z",
    createdAt: "2026-07-20T03:00:00.000Z",
    updatedAt: "2026-07-31T03:00:00.000Z",
    controlUpdatedAt: null
  },
  {
    id: "serial-private-manual",
    title: "잠들지 않는 세탁소",
    logline: "손님의 악몽을 세탁하는 야간 직원이 지워지지 않는 얼룩을 발견한다.",
    genres: ["미스터리", "생활밀착SF"],
    storyStatus: "draft",
    visibility: "private",
    continuationMode: "manual",
    operatorNote: "2화의 중반 전개를 다시 확인할 것",
    viewCount: 92,
    episodeCount: 2,
    publishedEpisodeCount: 2,
    latestEpisodeNo: 2,
    latestEpisodeTitle: "지워지지 않는 얼룩",
    latestEpisodeAt: "2026-07-29T03:00:00.000Z",
    recommendationCount: 4,
    activeRunCount: 0,
    latestRunStatus: "published",
    readyPublicationCount: 0,
    architecture: completeArchitecture,
    schedule: null,
    createdAt: "2026-07-24T03:00:00.000Z",
    updatedAt: "2026-07-29T03:00:00.000Z",
    controlUpdatedAt: "2026-07-30T03:00:00.000Z"
  },
  {
    id: "serial-ended",
    title: "마지막 궤도 정거장",
    logline: "폐쇄된 우주 정거장에서 구조 신호가 11년 만에 다시 들려온다.",
    genres: ["SF", "우주생존"],
    storyStatus: "archived",
    visibility: "archived",
    continuationMode: "ended",
    operatorNote: "3화 완결",
    viewCount: 411,
    episodeCount: 3,
    publishedEpisodeCount: 3,
    latestEpisodeNo: 3,
    latestEpisodeTitle: "귀환 신호",
    latestEpisodeAt: "2026-07-18T03:00:00.000Z",
    recommendationCount: 21,
    activeRunCount: 0,
    latestRunStatus: "published",
    readyPublicationCount: 0,
    architecture: completeArchitecture,
    schedule: { id: "schedule-c", name: "SF 단편", status: "paused", publicationMode: "auto_public" },
    createdAt: "2026-07-10T03:00:00.000Z",
    updatedAt: "2026-07-18T03:00:00.000Z",
    controlUpdatedAt: "2026-07-19T03:00:00.000Z"
  },
  {
    id: "serial-zero",
    title: "마왕의 박수 충전소",
    logline: "스킬을 쓰려면 관객의 박수가 필요한 마왕이 첫 무대 전에 멈춰 섰다.",
    genres: ["코미디", "현대판타지"],
    storyStatus: "draft",
    visibility: "private",
    continuationMode: "manual",
    operatorNote: "",
    viewCount: 0,
    episodeCount: 0,
    publishedEpisodeCount: 0,
    latestEpisodeNo: null,
    latestEpisodeTitle: "",
    latestEpisodeAt: null,
    recommendationCount: 0,
    activeRunCount: 0,
    latestRunStatus: "error",
    readyPublicationCount: 0,
    architecture: weakArchitecture,
    schedule: null,
    createdAt: "2026-07-31T03:00:00.000Z",
    updatedAt: "2026-07-31T04:10:00.000Z",
    controlUpdatedAt: null
  }
];

try {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "mobile", width: 390, height: 844 }
  ]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    const patchRequests = [];
    const canceled = [];
    const continuationRequests = [];
    const rewriteRequests = [];
    const firstEpisodeRequests = [];
    let queued = true;
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      const session = { access_token: "operator-test-token", user: { id: "operator-test" } };
      window.supabase = { createClient: () => ({ auth: {
        getSession: async () => ({ data: { session } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        signInWithOAuth: async () => ({}),
        signOut: async () => ({})
      } }) };
    });
    await page.route("https://cdn.jsdelivr.net/**", (route) => route.abort());
    await page.route(apiPattern, async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      const json = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
      if (path === "/api/storyheaven/profile") return json({ profile: { nickname: "운영자", isAdmin: true } });
      if (path === "/api/storyheaven/operator/serial-engine/stories" && request.method() === "GET") {
        const liveStories = stories.map((story, index) => index === 0
          ? { ...story, queue: queued ? story.queue : null }
          : story);
        return json({ enabled: true, stories: liveStories, queue: { concurrency: 1, items: queued ? [stories[0].queue] : [] } });
      }
      if (path === "/api/storyheaven/operator/serial-engine/queue/queue-next-4/cancel" && request.method() === "POST") {
        canceled.push(path);
        queued = false;
        return json({ canceled: true, queueGroupId: "queue-next-4" });
      }
      if (path.endsWith("/control") && request.method() === "PATCH") {
        const body = request.postDataJSON();
        patchRequests.push(body);
        return json({ story: { ...stories[0], ...body, controlUpdatedAt: "2026-07-31T05:00:00.000Z" } });
      }
      if (path.endsWith("/continue") && request.method() === "POST") {
        continuationRequests.push({ path, body: request.postDataJSON() });
        return json({ continuation: { status: "queued" } }, 202);
      }
      if (path.endsWith("/rewrite") && request.method() === "POST") {
        rewriteRequests.push({ path, body: request.postDataJSON() });
        return json({ run: { id: "rewrite-run", queueGroupId: "rewrite-run" } }, 202);
      }
      if (path === "/api/storyheaven/operator/serial-engine/stories/serial-zero/plan" && request.method() === "POST") {
        firstEpisodeRequests.push(request.postDataJSON());
        return json({ run: { id: "serial-zero-plan", queueGroupId: "serial-zero-plan" } }, 202);
      }
      return json({ error: "not_found" }, 404);
    });

    await page.goto(`${root}/storyheaven/operator/serial/stories/`, { waitUntil: "networkidle" });
    await page.locator("[data-works-dashboard]").waitFor({ state: "visible" });
    assert.equal(await page.locator(".managed-story").count(), 3, `${viewport.name} managed story count excludes hidden stories by default`);
    assert.equal(await page.locator("[data-summary-public]").textContent(), "1", `${viewport.name} public summary`);
    assert.equal(await page.locator("[data-summary-stopped]").textContent(), "1", `${viewport.name} stopped summary`);
    const layout = await page.evaluate(() => ({
      viewport: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      title: document.querySelector(".managed-story h3")?.textContent,
      hasExecutableImage: Boolean(document.querySelector(".managed-story img"))
    }));
    assert.equal(layout.documentWidth, layout.viewport, `${viewport.name} horizontal overflow`);
    assert.equal(layout.title, "0번 버스의 마지막 승객", `${viewport.name} title`);
    assert.equal(layout.hasExecutableImage, false, `${viewport.name} text-only rendering`);
    assert.equal(await page.locator(".operator-note").count(), 0, `${viewport.name} operator notes are not exposed`);
    await page.locator("[data-visibility-filter]").selectOption("all");
    assert.equal(await page.locator(".managed-story").count(), 4, `${viewport.name} full view includes hidden stories`);
    assert.equal(
      await page.locator(".managed-story").nth(2).getByRole("button", { name: "다음 화 작성", includeHidden: true }).evaluate((button) => button.disabled),
      false,
      `${viewport.name} explicit operator request overrides paused continuation mode`
    );
    const legacyStory = page.locator(".managed-story").filter({ hasText: "잠들지 않는 세탁소" });
    assert.equal(
      await legacyStory.getByRole("button", { name: "다음 화 작성", includeHidden: true }).evaluate((button) => button.disabled),
      false,
      `${viewport.name} operator can continue a two-episode story without a schedule`
    );
    assert.match(await legacyStory.locator(".schedule-note").textContent(), /작품 설정부터 자동 준비/u, `${viewport.name} explains automatic bootstrap`);
    assert.match(await page.locator(".managed-story").first().locator(".story-state-line").textContent(), /대기 2번/u, `${viewport.name} queue position`);
    const firstManagement = page.locator(".managed-story").first().locator(".story-management");
    assert.equal(await firstManagement.evaluate((element) => element.open), viewport.name === "desktop", `${viewport.name} management disclosure default`);
    if (viewport.name === "mobile") {
      await firstManagement.locator(":scope > summary").click();
      assert.equal(await firstManagement.evaluate((element) => element.open), true, "mobile opens management controls on demand");
      const expandedLayout = await page.evaluate(() => ({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth }));
      assert.equal(expandedLayout.documentWidth, expandedLayout.viewport, "mobile expanded controls do not overflow");
      await page.screenshot({ path: "test-results/storyheaven-serial-operations-mobile-expanded.png", fullPage: true });
    }
    assert.equal(await page.locator(".managed-story").first().getByRole("button", { name: "대기 취소" }).count(), 1, `${viewport.name} queue cancellation control`);
    const zeroStory = page.locator(".managed-story").filter({ hasText: "마왕의 박수 충전소" });
    assert.equal(await zeroStory.getByRole("button", { name: "프롤로그 제작 재개", includeHidden: true }).isEnabled(), true, `${viewport.name} zero-episode story can restart`);
    if (viewport.name === "desktop") {
      page.once("dialog", (dialog) => dialog.accept());
      await zeroStory.getByRole("button", { name: "프롤로그 제작 재개" }).click();
      await page.waitForFunction(() => document.querySelector("[data-common-toast]")?.textContent.includes("프롤로그 제작"));
      assert.deepEqual(firstEpisodeRequests.at(-1), { autoEpisode: true }, "zero-episode story restarts first episode planning");
    }

    page.once("dialog", (dialog) => dialog.accept());
    await page.locator(".managed-story").first().getByRole("button", { name: "대기 취소" }).click();
    await page.waitForFunction(() => !document.querySelector(".managed-story .state-badge.waiting"));
    assert.equal(canceled.length, 1, `${viewport.name} cancels queued continuation`);

    if (viewport.name === "desktop") {
      await legacyStory.locator(".control-field").filter({ hasText: "연속 제작 수" }).locator("select").selectOption("3");
      page.once("dialog", (dialog) => dialog.accept());
      await legacyStory.getByRole("button", { name: "다음 화 작성" }).click();
      await page.waitForFunction(() => document.querySelector("[data-common-toast]")?.textContent.includes("대기열에 넣었습니다"));
      await page.waitForFunction(() => !document.querySelector("[data-refresh]")?.disabled);
      assert.match(continuationRequests[0].path, /\/episodes\/2\/continue$/u, "legacy story requests episode 3 directly");
      assert.deepEqual(continuationRequests[0].body, { batchCount: 3 }, "legacy story requests three consecutive episodes");

      await legacyStory.locator(".rewrite-field input").fill("1");
      assert.equal(await legacyStory.locator(".rewrite-field input").inputValue(), "1", "rewrite target input accepts a specific episode number");
      page.once("dialog", (dialog) => dialog.accept());
      await legacyStory.locator(".rewrite-field").getByRole("button", { name: "재작성", exact: true }).click();
      await page.waitForFunction(() => document.querySelector("[data-common-toast]")?.textContent.includes("재작성 작업"));
      assert.match(rewriteRequests.at(-1).path, /\/episodes\/1\/rewrite$/u, "operator can request a specific episode rewrite");
      assert.match(rewriteRequests.at(-1).body.notes, /프롤로그|본편/u, "rewrite request carries an operator note");
    }

    await page.locator("[data-visibility-filter]").selectOption("private");
    assert.equal(await page.locator(".managed-story").count(), 2, `${viewport.name} visibility filter`);
    await page.locator("[data-visibility-filter]").selectOption("all");
    await page.locator("[data-story-search]").fill("우주");
    assert.equal(await page.locator(".managed-story").count(), 1, `${viewport.name} search filter`);
    await page.locator("[data-story-search]").fill("");

    if (viewport.name === "desktop") {
      const first = page.locator(".managed-story").first();
      await first.locator(".control-field select").first().selectOption("private");
      assert.equal(await first.getByRole("button", { name: "설정 저장" }).isEnabled(), true, "dirty settings enable save");
      page.once("dialog", (dialog) => dialog.accept());
      await first.getByRole("button", { name: "설정 저장" }).click();
      await page.waitForFunction(() => document.querySelector("[data-common-toast]")?.textContent.includes("저장했습니다"));
      assert.deepEqual(patchRequests[0], { visibility: "private", continuationMode: "manual", operatorNote: "" });
    }

    assert.deepEqual(errors, [], `${viewport.name} page errors`);
    await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
    await page.waitForTimeout(50);
    await page.screenshot({ path: `test-results/storyheaven-serial-operations-${viewport.name}.png`, fullPage: true });
    await page.close();
  }
  console.log("StoryHeaven serial operations UI checks passed");
} finally {
  await browser.close();
}
