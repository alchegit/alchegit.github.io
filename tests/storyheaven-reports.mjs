import assert from "node:assert/strict";
import { chromium } from "playwright";

const root = process.env.STORYHEAVEN_TEST_ROOT || "http://127.0.0.1:4173";
const apiHost = "https://harvard-museum-nails-mission.trycloudflare.com";
const browser = await chromium.launch({ headless: true });

function sessionInit() {
  const session = { access_token: "reports-test-token", user: { id: "reports-user" } };
  window.supabase = {
    createClient: () => ({
      auth: {
        getSession: async () => ({ data: { session } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        signInWithOAuth: async () => ({}),
        signOut: async () => ({})
      }
    })
  };
}

try {
  for (const viewport of [{ name: "desktop", width: 1440, height: 1000 }, { name: "mobile", width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    const requests = [];
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(sessionInit);
    await page.route("https://cdn.jsdelivr.net/**", (route) => route.abort());
    await page.route(`${apiHost}/**`, async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      const json = (body) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
      if (path === "/api/storyheaven/profile") return json({ profile: { nickname: "신고테스터", nicknameStatus: "active", isAdmin: true } });
      if (path === "/api/storyheaven/stories/story-report") return json({ story: { id: "story-report", title: "유리숲의 편지", logline: "유리로 변한 숲에서 우체부가 마지막 수신인을 찾는다.", synopsis: "유리 나뭇잎이 울리는 밤, 우체부는 주소가 지워진 편지를 들고 숲으로 들어간다.", genre: "미스터리", contentOrigin: "human", contentRating: "all", coverPath: "/webtoon/assets/guide/awakening-episode-01-last-train-v4.webp", author: { nickname: "숲지기" }, likeCount: 3 } });
      if (path === "/api/storyheaven/stories/story-report/report" && request.method() === "POST") {
        requests.push({ type: "report", body: request.postDataJSON() });
        return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ reportId: "report-test", status: "pending" }) });
      }
      if (path === "/api/storyheaven/me/stories") return json({ stories: [] });
      if (path === "/api/storyheaven/me/notifications") return json({ notifications: [{ id: "notice-test", storyId: "story-report", reportId: "report-test", type: "report_result", title: "작품 신고 검토 결과", message: "추가 운영 조치가 필요한 것으로 판정했습니다.", read: false, createdAt: "2026-07-24T04:00:00Z", canAppeal: true, appeal: null }] });
      if (path === "/api/storyheaven/reports/report-test/appeal" && request.method() === "POST") {
        requests.push({ type: "appeal", body: request.postDataJSON() });
        return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ appealId: "appeal-test", reportId: "report-test", status: "pending" }) });
      }
      if (path === "/api/storyheaven/operator/submissions") return json({ submissions: [] });
      if (path === "/api/storyheaven/operator/reports") return json({ reports: [{ id: "report-admin", storyId: "story-report", storyTitle: "유리숲의 편지", author: "숲지기", reporterKey: "V-ABCDEF0123", category: "rights", details: "권리 관계를 확인할 수 있는 원본 게시 주소가 있습니다.", referenceUrl: "https://example.com/evidence", status: "pending", createdAt: "2026-07-24T04:00:00Z", appeal: null }] });
      if (path === "/api/storyheaven/operator/reports/report-admin/resolve" && request.method() === "POST") {
        requests.push({ type: "resolve", body: request.postDataJSON() });
        return json({ reportId: "report-admin", status: "dismissed", authorNotified: true, automaticStoryAction: false });
      }
      if (path === "/api/storyheaven/rounds/current") return json({ round: { id: "round-open", key: "2026-07-20", type: "weekly", status: "open", entries: [], votingEndsAt: "2026-07-26T12:00:00Z" } });
      if (path === "/api/storyheaven/operator/rounds/pending") return json({ rounds: [] });
      return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "not_found" }) });
    });

    await page.goto(`${root}/storyheaven/story/?id=story-report`, { waitUntil: "networkidle" });
    await page.locator("[data-report-box]").evaluate((element) => { element.open = true; });
    await page.locator('[name="category"]').selectOption("rights");
    await page.locator('[name="details"]').fill("원본 게시 시각과 문장이 동일하여 권리 관계 확인이 필요합니다.");
    const reportRequest = page.waitForRequest((request) => request.url().endsWith("/stories/story-report/report") && request.method() === "POST");
    await page.locator("[data-report-submit]").click();
    await reportRequest;

    await page.goto(`${root}/storyheaven/my/`, { waitUntil: "networkidle" });
    await page.locator(".appeal-form textarea").fill("원문 작성 시각과 수정 이력을 확인하면 제 창작물임을 확인할 수 있습니다.");
    const appealRequest = page.waitForRequest((request) => request.url().endsWith("/reports/report-test/appeal") && request.method() === "POST");
    await page.locator(".appeal-form button").click();
    await appealRequest;

    await page.goto(`${root}/storyheaven/operator/`, { waitUntil: "networkidle" });
    await page.locator("[data-report-review-list] .report-decision textarea").fill("제출된 자료만으로는 권리 침해를 확인할 수 없어 신고를 기각합니다.");
    const resolveRequest = page.waitForRequest((request) => request.url().endsWith("/operator/reports/report-admin/resolve") && request.method() === "POST");
    await page.locator("[data-report-review-list] .report-decision button").first().click();
    await resolveRequest;

    assert.deepEqual(requests.map((item) => item.type).sort(), ["appeal", "report", "resolve"], `${viewport.name} report workflow`);
    assert.equal(requests.find((item) => item.type === "report").body.category, "rights", `${viewport.name} report category`);
    assert.ok(requests.every((item) => Object.values(item.body).some((value) => typeof value === "string" && value.length >= 20)), `${viewport.name} reasons captured`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth), true, `${viewport.name} overflow`);
    assert.deepEqual(errors, [], `${viewport.name} page errors`);
    await page.close();
  }
  console.log("StoryHeaven reports browser checks passed");
} finally {
  await browser.close();
}
