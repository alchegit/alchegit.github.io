import assert from "node:assert/strict";
import { chromium } from "playwright";

const root = process.env.STORYHEAVEN_TEST_ROOT || "http://127.0.0.1:4173";
const apiRoot = "https://harvard-museum-nails-mission.trycloudflare.com";
const browser = await chromium.launch({ headless: true });

function manuscript(seed) {
  return Array.from({ length: 20 }, (_, index) => (
    `${seed} ${index + 1}번째 장면에서 주인공은 이전 선택 때문에 달라진 상황을 확인한다. ` +
    "눈앞의 단서와 주변 인물의 반응을 비교하고, 망설임 끝에 다음 행동을 결정한다. " +
    "그 행동은 새로운 문제를 만들지만 동시에 다음 장면으로 이어지는 구체적인 단서를 남긴다. " +
    "등장인물의 감정과 행동, 결과가 한 문단 안에서 자연스럽게 이어진다."
  )).join("\n\n");
}

try {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "mobile", width: 390, height: 844 }
  ]) {
    const page = await browser.newPage({ viewport });
    const pageErrors = [];
    const requests = { create: [], drafts: [], submit: [] };
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.addInitScript(() => {
      const session = { access_token: "browser-test-token", user: { id: "review-test-user" } };
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
    });
    await page.route("https://cdn.jsdelivr.net/**", (route) => route.abort());
    await page.route(`${apiRoot}/**`, async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (path === "/api/storyheaven/profile") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
          profile: { nickname: "묶음테스트", nicknameStatus: "active", isAdmin: false }
        }) });
      }
      if (path === "/api/storyheaven/stories" && request.method() === "POST") {
        requests.create.push(request.postDataJSON());
        return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({
          story: { id: `review-story-${viewport.name}`, revisionNo: 1, status: "draft" }
        }) });
      }
      if (path.endsWith("/episodes/batch-draft") && request.method() === "POST") {
        const body = request.postDataJSON();
        requests.drafts.push(body);
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
          episodes: body.episodes.map((episode) => ({
            id: `episode-${episode.episodeNo}`,
            episodeNo: episode.episodeNo,
            title: episode.title,
            status: "draft",
            revisionNo: 1
          }))
        }) });
      }
      if (path.endsWith("/submit") && request.method() === "POST") {
        requests.submit.push(request.postDataJSON());
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
          story: { id: `review-story-${viewport.name}`, revisionNo: 2, status: "moderation" },
          review: { status: "queued", stage: "ai_queued", estimateLabel: "보통 4~6분" }
        }) });
      }
      return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "not_found" }) });
    });

    await page.goto(`${root}/storyheaven/write/`, { waitUntil: "networkidle" });
    await page.locator("[data-editor]").waitFor({ state: "visible" });
    await page.locator('[name="title"]').fill("열두 번째 승강장의 기록");
    await page.locator("[data-genre-input]").fill("미스터리,");
    await page.locator("[data-episode-section] > summary").click();
    const guide = page.locator("[data-submission-guide]");
    if (await guide.getAttribute("open") !== null) await guide.locator("summary").click();
    assert.equal(await page.locator("[data-submit]").isDisabled(), true, `${viewport.name}: review disabled before manuscript`);
    await page.locator("[data-add-episode]").click();
    await page.locator("[data-add-episode]").click();
    assert.equal(await page.locator("[data-episode-card]").count(), 3, `${viewport.name}: three episode editors`);
    assert.equal(await page.locator("[data-episode-card][open]").count(), 1, `${viewport.name}: only active episode expanded`);

    for (let index = 0; index < 3; index += 1) {
      const card = page.locator("[data-episode-card]").nth(index);
      await card.evaluate((element) => { element.open = true; });
      if (index < 2) await card.locator("[data-episode-title]").fill(`${index + 1}화 제목`);
      await card.locator("[data-episode-body]").fill(manuscript(`회차 ${index + 1}`));
      if (index < 2) await card.evaluate((element) => { element.open = false; });
    }
    await page.locator("[data-review-estimate]").waitFor({ state: "visible" });
    assert.match(await page.locator("[data-review-estimate]").textContent(), /3화 기준 보통 4~6분/u);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth), true, `${viewport.name}: no overflow`);

    const consents = page.locator("[data-consent-section]");
    assert.equal(await consents.getAttribute("open"), "", `${viewport.name}: public checks open when manuscript is ready`);
    assert.equal(await page.locator("[data-submit]").isDisabled(), true, `${viewport.name}: review waits for public checks`);
    for (const name of ["consentDisplay", "consentOriginality", "consentAdult"]) {
      await page.locator(`[name="${name}"]`).check();
    }
    assert.equal(await page.locator("[data-submit]").isDisabled(), false, `${viewport.name}: review enables when ready`);
    assert.match(await page.locator("[data-next-step]").textContent(), /3화가 준비/u, `${viewport.name}: next action is explicit`);
    await page.locator("[data-submit]").click();
    await page.waitForResponse((response) => response.url().endsWith("/submit") && response.request().method() === "POST");

    assert.equal(requests.create.length, 1, `${viewport.name}: story created once`);
    assert.equal(requests.drafts.length, 1, `${viewport.name}: drafts saved in one batch`);
    assert.equal(requests.drafts[0].episodes.length, 3, `${viewport.name}: three drafts in batch`);
    assert.equal(requests.drafts[0].episodes[2].title, "3화", `${viewport.name}: omitted title gets episode number`);
    assert.equal(requests.submit.length, 1, `${viewport.name}: one review request`);
    assert.equal(requests.submit[0].episodes.length, 3, `${viewport.name}: three episodes submitted together`);
    assert.deepEqual(pageErrors, [], `${viewport.name}: page errors`);
    await page.screenshot({ path: `test-results/storyheaven-review-batch-${viewport.name}.png`, fullPage: true });
    await page.close();
  }
  console.log("StoryHeaven automated review browser checks passed");
} finally {
  await browser.close();
}
