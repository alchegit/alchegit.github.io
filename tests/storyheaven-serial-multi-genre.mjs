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
    const runs = [];
    const canceled = [];
    let queueVisible = true;
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
        return json({ enabled: true, schedules: [], queue: {
          concurrency: 1,
          items: queueVisible ? [{ id: "queue-a", status: "waiting", queuePosition: 1, cancelable: true, workLabel: "미스터리 · 4화", stage: "write_draft", completedJobs: 1, totalJobs: 3, requestedAt: "2026-07-31T05:00:00.000Z" }] : [],
          lastCompleted: { workLabel: "판타지 · 기본 3화", elapsedSeconds: 754, completedJobs: 14, completedAt: "2026-07-31T04:00:00.000Z" },
          quotaNote: "실제 AI 작업 수와 소요 시간을 기록합니다."
        } });
      }
      if (path === "/api/storyheaven/operator/serial-engine/queue/queue-a/cancel" && request.method() === "POST") {
        canceled.push(path);
        queueVisible = false;
        return json({ canceled: true, queueGroupId: "queue-a" });
      }
      if (path === "/api/storyheaven/operator/serial-engine/schedules" && request.method() === "POST") {
        saved.push(request.postDataJSON());
        return json({ schedule: { id: "hybrid-schedule" } }, 201);
      }
      if (path === "/api/storyheaven/operator/serial-engine/schedules/hybrid-schedule/run" && request.method() === "POST") {
        runs.push(path);
        return json({ run: { id: "new-run", queueGroupId: "new-run" } }, 202);
      }
      return json({ error: "not_found" }, 404);
    });

    await page.goto(`${root}/storyheaven/operator/serial/`, { waitUntil: "networkidle" });
    await page.locator("[data-serial-dashboard]").waitFor({ state: "visible" });
    await page.locator('[data-schedule-form] select[name="cadenceUnit"]').selectOption("minutes");
    await page.locator('[data-schedule-form] input[name="cadenceValue"]').fill("90");
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
    await page.waitForFunction(() => JSON.parse(localStorage.getItem("storyheaven.operator.serial-draft.v3") || "null")?.primaryGenres?.length === 3);
    await page.reload({ waitUntil: "networkidle" });
    await page.locator("[data-serial-dashboard]").waitFor({ state: "visible" });
    assert.equal(await page.locator('[data-schedule-form] input[name="cadenceValue"]').inputValue(), "90", `${viewport.name} restores cadence value`);
    assert.equal(await page.locator('[data-schedule-form] select[name="cadenceUnit"]').inputValue(), "minutes", `${viewport.name} restores cadence unit`);
    assert.equal(await page.locator('[data-primary-genres] input:checked').count(), 3, `${viewport.name} restores primary genres`);
    assert.equal(await page.locator('.subgenre-group:has(h3:text("로맨스")) input[value="office-romance"]').isChecked(), true, `${viewport.name} restores romance detail`);
    assert.equal(await page.locator('.subgenre-group:has(h3:text("SF")) input[value="near-future"]').isChecked(), true, `${viewport.name} restores sf detail`);
    assert.match(await page.locator("[data-draft-status]").textContent(), /복원/u, `${viewport.name} shows restore status`);
    await page.locator("[data-schedule-form] button[type='submit']").click();
    await page.waitForFunction(() => document.querySelector("[data-common-toast]")?.textContent.includes("대기열에 넣었습니다"));

    const submitted = saved.at(-1);
    assert.deepEqual(submitted.primaryGenres, ["romance", "sf", "comedy"], `${viewport.name} primary genre payload`);
    assert.deepEqual(Object.keys(submitted.subgenresByGenre), ["romance", "sf", "comedy"], `${viewport.name} grouped subgenre payload`);
    assert.ok(submitted.subgenresByGenre.romance.includes("office-romance"), `${viewport.name} romance subgenre payload`);
    assert.ok(submitted.subgenresByGenre.sf.includes("near-future"), `${viewport.name} sf subgenre payload`);
    assert.equal(submitted.humorIntensity, "balanced", `${viewport.name} comedy blend control`);
    assert.equal(submitted.cadenceMinutes, 90, `${viewport.name} minute cadence payload`);
    assert.equal("name" in submitted, false, `${viewport.name} omits redundant schedule name`);
    assert.equal("maxActiveSerials" in submitted, false, `${viewport.name} omits parallel-work setting`);
    assert.ok(runs.length > 0, `${viewport.name} queues initial three-episode work`);
    assert.equal(await page.locator(".queue-row").count(), 1, `${viewport.name} queue is visible`);
    assert.match(await page.locator("[data-queue-last]").textContent(), /12분 34초/u, `${viewport.name} last duration is visible`);
    page.once("dialog", (dialog) => dialog.accept());
    await page.locator(".queue-row").getByRole("button", { name: "대기 취소" }).click();
    await page.waitForFunction(() => !document.querySelector(".queue-row"));
    assert.equal(canceled.length, 1, `${viewport.name} cancels a waiting queue item`);

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
