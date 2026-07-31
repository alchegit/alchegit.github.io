import assert from "node:assert/strict";
import { chromium } from "playwright";

const root = process.env.STORYHEAVEN_TEST_ROOT || "http://127.0.0.1:4178";
const apiPattern = "https://harvard-museum-nails-mission.trycloudflare.com/**";
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "mobile", width: 390, height: 844 }
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem("storyheaven.reading-history.v1", JSON.stringify([{
        storyId: "seed-last-platform",
        title: "8초를 싣는 막차",
        coverPath: "/storyheaven/assets/covers/last-platform.webp",
        genre: "현대판타지 · 미스터리",
        episodeNo: 1,
        episodeTitle: "반납되지 않은 8초",
        progress: .42,
        updatedAt: new Date().toISOString()
      }]));
      window.supabase = { createClient: () => ({ auth: {
        getSession: async () => ({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        signInWithOAuth: async () => ({}),
        signOut: async () => ({})
      } }) };
    });
    await page.route("https://cdn.jsdelivr.net/**", (route) => route.abort());
    await page.route(apiPattern, (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "test_offline" }) }));

    await page.goto(`${root}/storyheaven/`, { waitUntil: "networkidle" });
    await page.locator("[data-continue-reading]").waitFor({ state: "visible" });
    assert.equal(await page.locator("[data-continue-title]").textContent(), "8초를 싣는 막차", `${viewport.name} continue title`);
    assert.match(await page.locator("[data-continue-episode]").textContent(), /42% 읽음/u, `${viewport.name} continue progress`);
    await page.locator("[data-story-search]").fill("막차");
    assert.equal(await page.locator("[data-discover-title]").textContent(), "검색 결과 1편", `${viewport.name} search result count`);
    assert.equal(await page.locator("[data-human-feed] .story-card").count(), 1, `${viewport.name} search card count`);
    assert.equal(await page.locator("[data-human-feed] h3").textContent(), "8초를 싣는 막차", `${viewport.name} search title`);
    const homeLayout = await page.evaluate(() => ({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth }));
    assert.equal(homeLayout.documentWidth, homeLayout.viewport, `${viewport.name} home horizontal overflow`);
    await page.evaluate(() => window.scrollTo({ top: document.querySelector("[data-continue-reading]").offsetTop - 90, behavior: "instant" }));
    await page.screenshot({ path: `test-results/storyheaven-smart-home-${viewport.name}.png`, fullPage: false });

    await page.goto(`${root}/storyheaven/story/?id=seed-last-platform`, { waitUntil: "networkidle" });
    await page.locator("[data-detail]").waitFor({ state: "visible" });
    assert.equal(await page.locator("[data-read-first]").textContent(), "1화 이어 읽기", `${viewport.name} resume button`);
    assert.match(await page.locator(".episode-row").first().textContent(), /읽음 42%/u, `${viewport.name} episode progress`);
    await page.locator("[data-read-first]").click();
    await page.locator("[data-reader]").waitFor({ state: "visible" });
    await page.waitForTimeout(700);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("storyheaven.reading-history.v1") || "[]")[0]);
    assert.equal(saved.storyId, "seed-last-platform", `${viewport.name} saved story id`);
    assert.equal(saved.episodeNo, 1, `${viewport.name} saved episode number`);
    assert.ok(saved.progress > .05, `${viewport.name} keeps useful reading position`);
    const storyLayout = await page.evaluate(() => ({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth }));
    assert.equal(storyLayout.documentWidth, storyLayout.viewport, `${viewport.name} reader horizontal overflow`);
    assert.deepEqual(errors, [], `${viewport.name} page errors`);
    await page.screenshot({ path: `test-results/storyheaven-smart-reading-${viewport.name}.png`, fullPage: false });
    await context.close();
  }
  console.log("StoryHeaven smart reading checks passed");
} finally {
  await browser.close();
}
