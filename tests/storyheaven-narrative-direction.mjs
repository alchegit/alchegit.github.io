import assert from "node:assert/strict";
import { chromium } from "playwright";
import { validateStoryHeavenSerialSchedule } from "../workers/webtoon-oracle-api/src/serial-engine.mjs";

const root = process.env.STORYHEAVEN_TEST_ROOT || "http://127.0.0.1:4178";
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [{ name: "desktop", width: 1440, height: 1000 }, { name: "mobile", width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    const requests = [];
    let schedules = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      const session = { access_token: "direction-test", user: { id: "direction-operator" } };
      window.supabase = { createClient: () => ({ auth: {
        getSession: async () => ({ data: { session } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        signInWithOAuth: async () => ({}), signOut: async () => ({})
      } }) };
    });
    await page.route("https://cdn.jsdelivr.net/**", (route) => route.abort());
    await page.route("**/api/**", async (route) => {
      const request = route.request();
      const pathname = new URL(request.url()).pathname;
      const json = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
      if (pathname === "/api/storyheaven/profile") return json({ profile: { nickname: "운영자", isAdmin: true } });
      if (pathname.endsWith("/serial-engine/schedules") && request.method() === "GET") return json({
        enabled: true, emergencyPaused: false, schedules, queue: {
          concurrency: 1, updatedAt: new Date().toISOString(), items: [], attention: [], history: [], hiddenHistory: [], recentCompleted: [], stalledFirstEpisodeStories: [],
          statusCounts: { running: 0, waiting: 0, complete: 0, attention: 0 }
        }
      });
      if (pathname.includes("/serial-engine/schedules") && ["POST", "PATCH"].includes(request.method()) && !pathname.endsWith("/run")) {
        const input = request.postDataJSON();
        const checked = validateStoryHeavenSerialSchedule(input, { random: () => 0.8 });
        assert.equal(checked.ok, true, JSON.stringify(checked.errors));
        requests.push(input);
        const schedule = { ...checked.schedule, id: "direction-schedule", status: input.status, nextRunAt: new Date(Date.now() + 7200000).toISOString() };
        schedules = [schedule];
        return json({ schedule });
      }
      if (pathname.endsWith("/run")) return json({ id: "direction-run" });
      return json({});
    });
    await page.goto(`${root}/storyheaven/operator/serial/`, { waitUntil: "networkidle" });
    await page.locator("[data-create-panel] > summary").click();
    const direction = page.locator('[name="narrativeDirectionId"]');
    const humor = page.locator('[name="creativeHumor"]');
    assert.equal(await direction.inputValue(), "auto");
    await page.locator('[name="proseStyleId"][value="serious-grand-v1"]').check();
    assert.equal(await humor.isDisabled(), true);
    assert.equal(await humor.inputValue(), "0");
    await direction.selectOption("playful");
    assert.equal(await humor.isEnabled(), true);
    await page.locator(".creative-details > summary").click();
    await humor.focus();
    await humor.press("Home");
    for (let step = 0; step < 3; step += 1) await humor.press("ArrowRight");
    await direction.selectOption("revenge");
    assert.equal(await humor.inputValue(), "0");
    await page.waitForTimeout(250);
    await page.reload({ waitUntil: "networkidle" });
    await page.locator("[data-create-panel]").evaluate((element) => { element.open = true; });
    assert.equal(await direction.inputValue(), "revenge", "draft restores the direction");
    assert.equal(await humor.inputValue(), "0", "draft preserves zero humor");
    await page.locator('[data-schedule-form] button[type="submit"]').click();
    await page.waitForFunction(() => document.querySelector('[data-schedule-id="direction-schedule"]'));
    assert.equal(requests.at(-1).narrativeDirectionId, "revenge");
    assert.equal(requests.at(-1).creativeControls.humor, 0);
    assert.equal(requests.at(-1).humorIntensity, "none");
    assert.equal(schedules[0].narrativeDirection.resolvedId, "revenge");
    const row = page.locator('[data-schedule-id="direction-schedule"]');
    assert.match(await row.textContent(), /처절한 성장과 복수/u);
    await row.getByRole("button", { name: "이 설정 멈추기", exact: true }).click();
    await row.getByRole("button", { name: "이 설정 시작하기", exact: true }).waitFor();
    assert.equal(requests.at(-1).narrativeDirectionId, "revenge", "pausing preserves direction");
    await row.getByRole("button", { name: "이 설정 시작하기", exact: true }).click();
    await row.getByRole("button", { name: "이 설정 멈추기", exact: true }).waitFor();
    assert.equal(schedules[0].creativeControls.humor, 0, "starting cannot reintroduce humor");
    await row.locator(".schedule-management > summary").click();
    await row.getByRole("button", { name: "이 값으로 새 설정 만들기" }).click();
    assert.equal(await direction.inputValue(), "revenge", "loading preserves direction");
    await direction.scrollIntoViewIfNeeded();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "no horizontal overflow");
    await page.screenshot({ path: `test-results/storyheaven-direction-${viewport.name}.png` });
    await direction.selectOption("playful");
    await page.locator(".creative-details").evaluate((element) => { element.open = true; });
    await humor.focus();
    await humor.press("Home");
    for (let step = 0; step < 3; step += 1) await humor.press("ArrowRight");
    await page.locator('[data-schedule-form] button[type="submit"]').click();
    await page.waitForFunction(() => document.querySelector('[data-schedule-id="direction-schedule"]')?.textContent.includes("유쾌한 모험"));
    assert.equal(schedules[0].narrativeDirection.humorMode, "situational");
    assert.equal(schedules[0].creativeControls.humor, 3);
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log("StoryHeaven narrative direction desktop/mobile workflows passed");
} finally {
  await browser.close();
}
