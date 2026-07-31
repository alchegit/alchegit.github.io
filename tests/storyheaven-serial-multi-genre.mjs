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
    const page = await browser.newPage({ viewport });
    const errors = [];
    const saved = [];
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
      if (path === "/api/storyheaven/operator/serial-engine/schedules" && request.method() === "GET") {
        return json({ enabled: true, schedules: [] });
      }
      if (path === "/api/storyheaven/operator/serial-engine/schedules" && request.method() === "POST") {
        saved.push(request.postDataJSON());
        return json({ schedule: { id: "hybrid-schedule" } }, 201);
      }
      return json({ error: "not_found" }, 404);
    });

    await page.goto(`${root}/storyheaven/operator/serial/`, { waitUntil: "networkidle" });
    await page.locator("[data-serial-dashboard]").waitFor({ state: "visible" });
    await page.locator('[data-schedule-form] input[name="name"]').fill("로맨스 SF 야간 연재");
    const primary = page.locator("[data-primary-genres]");
    assert.equal(await primary.locator("input:checked").count(), 1, `${viewport.name} starts with one genre`);

    await primary.locator('input[value="romance"]').check();
    await primary.locator('input[value="sf"]').check();
    assert.equal(await primary.locator("input:checked").count(), 3, `${viewport.name} accepts three genres`);
    assert.equal(await primary.locator('input[value="comedy"]').isDisabled(), true, `${viewport.name} blocks fourth genre`);
    assert.equal(await page.locator(".subgenre-group").count(), 3, `${viewport.name} renders one subgenre group per primary genre`);

    await primary.locator('input[value="fantasy"]').uncheck();
    await primary.locator('input[value="comedy"]').check();
    assert.equal(await page.locator("[data-humor-control]").isVisible(), true, `${viewport.name} shows humor control for supporting comedy`);

    await page.locator('.subgenre-group:has(h3:text("로맨스")) input[value="office-romance"]').check();
    await page.locator('.subgenre-group:has(h3:text("SF")) input[value="near-future"]').check();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem("storyheaven.operator.serial-draft.v2") || "null")?.primaryGenres?.length === 3);
    await page.reload({ waitUntil: "networkidle" });
    await page.locator("[data-serial-dashboard]").waitFor({ state: "visible" });
    assert.equal(await page.locator('[data-schedule-form] input[name="name"]').inputValue(), "로맨스 SF 야간 연재", `${viewport.name} restores schedule name`);
    assert.equal(await page.locator('[data-primary-genres] input:checked').count(), 3, `${viewport.name} restores primary genres`);
    assert.equal(await page.locator('.subgenre-group:has(h3:text("로맨스")) input[value="office-romance"]').isChecked(), true, `${viewport.name} restores romance detail`);
    assert.equal(await page.locator('.subgenre-group:has(h3:text("SF")) input[value="near-future"]').isChecked(), true, `${viewport.name} restores sf detail`);
    assert.match(await page.locator("[data-draft-status]").textContent(), /복원/u, `${viewport.name} shows restore status`);
    await page.locator("[data-schedule-form] button[type='submit']").click();
    await page.waitForFunction(() => document.querySelector("[data-common-toast]")?.textContent.includes("시작했습니다"));

    assert.deepEqual(saved[0].primaryGenres, ["romance", "sf", "comedy"], `${viewport.name} primary genre payload`);
    assert.deepEqual(Object.keys(saved[0].subgenresByGenre), ["romance", "sf", "comedy"], `${viewport.name} grouped subgenre payload`);
    assert.ok(saved[0].subgenresByGenre.romance.includes("office-romance"), `${viewport.name} romance subgenre payload`);
    assert.ok(saved[0].subgenresByGenre.sf.includes("near-future"), `${viewport.name} sf subgenre payload`);
    assert.equal(saved[0].humorIntensity, "balanced", `${viewport.name} comedy blend control`);

    const layout = await page.evaluate(() => ({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth }));
    assert.equal(layout.documentWidth, layout.viewport, `${viewport.name} horizontal overflow`);
    assert.deepEqual(errors, [], `${viewport.name} page errors`);
    await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
    await page.screenshot({ path: `test-results/storyheaven-serial-multi-genre-${viewport.name}.png`, fullPage: true });
    await page.close();
  }
  console.log("StoryHeaven multi-genre UI checks passed");
} finally {
  await browser.close();
}
