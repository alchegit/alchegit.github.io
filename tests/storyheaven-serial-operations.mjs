import assert from "node:assert/strict";
import { chromium } from "playwright";

const root = process.env.STORYHEAVEN_TEST_ROOT || "http://127.0.0.1:4178";
const apiPattern = "https://harvard-museum-nails-mission.trycloudflare.com/**";
const browser = await chromium.launch({ headless: true });

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
    activeRunCount: 0,
    latestRunStatus: "published",
    readyPublicationCount: 0,
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
    episodeCount: 3,
    publishedEpisodeCount: 3,
    latestEpisodeNo: 3,
    latestEpisodeTitle: "돌아온 얼룩",
    latestEpisodeAt: "2026-07-29T03:00:00.000Z",
    recommendationCount: 4,
    activeRunCount: 0,
    latestRunStatus: "published",
    readyPublicationCount: 0,
    schedule: { id: "schedule-b", name: "미스터리 실험", status: "active", publicationMode: "test_private" },
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
    schedule: { id: "schedule-c", name: "SF 단편", status: "paused", publicationMode: "auto_public" },
    createdAt: "2026-07-10T03:00:00.000Z",
    updatedAt: "2026-07-18T03:00:00.000Z",
    controlUpdatedAt: "2026-07-19T03:00:00.000Z"
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
        return json({ enabled: true, stories });
      }
      if (path.endsWith("/control") && request.method() === "PATCH") {
        const body = request.postDataJSON();
        patchRequests.push(body);
        return json({ story: { ...stories[0], ...body, controlUpdatedAt: "2026-07-31T05:00:00.000Z" } });
      }
      if (path.endsWith("/continue") && request.method() === "POST") {
        return json({ continuation: { status: "queued" } }, 202);
      }
      return json({ error: "not_found" }, 404);
    });

    await page.goto(`${root}/storyheaven/operator/serial/stories/`, { waitUntil: "networkidle" });
    await page.locator("[data-works-dashboard]").waitFor({ state: "visible" });
    assert.equal(await page.locator(".managed-story").count(), 3, `${viewport.name} managed story count`);
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

    await page.locator("[data-visibility-filter]").selectOption("private");
    assert.equal(await page.locator(".managed-story").count(), 1, `${viewport.name} visibility filter`);
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
