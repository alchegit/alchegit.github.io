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
    const retries = [];
    const runningSchedule = {
      id: "schedule-running",
      status: "active",
      publicationMode: "test_private",
      primaryGenre: "fantasy",
      primaryGenres: ["fantasy"],
      subgenres: ["modern-fantasy"],
      subgenresByGenre: { fantasy: ["modern-fantasy"] },
      humorIntensity: "light",
      creativeControls: { preset: "balanced", pace: 3, suspense: 3, curiosity: 4, surprise: 3, emotion: 3, romance: 2, action: 3, description: 3, humor: 2 },
      targetAge: "teen",
      cadenceMinutes: 360,
      targetEpisodeCount: 3,
      episode1Timing: { sampleCount: 2, averageSeconds: 615, lastSeconds: 630 },
      nextRunAt: "2026-07-31T09:00:00.000Z",
      conceptPolicy: "test"
    };
    let waitingQueueVisible = true;
    let failureMode = false;
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
        return json({ enabled: true, schedules: [runningSchedule], queue: {
          concurrency: 1,
          updatedAt: "2026-07-31T05:01:00.000Z",
          items: failureMode ? [] : [
            { id: "queue-running", scheduleId: "schedule-running", status: "running", queuePosition: 0, cancelable: false, initialBatch: true, targetEpisodeCount: 3, workLabel: "새 작품 · 3화까지", stage: "write_draft", episodeNo: 2, completedJobs: 8, totalJobs: 9, elapsedSeconds: 246, requestedAt: "2026-07-31T04:56:00.000Z" },
            ...(waitingQueueVisible ? [{ id: "queue-a", status: "waiting", queuePosition: 1, cancelable: true, workLabel: "미스터리 · 4화", stage: "write_draft", episodeNo: 4, completedJobs: 1, totalJobs: 3, requestedAt: "2026-07-31T05:00:00.000Z" }] : [])
          ],
          lastFailed: failureMode ? { id: "failed-run", scheduleId: "schedule-running", status: "error", initialBatch: true, targetEpisodeCount: 3, workLabel: "새 작품 · 3화까지", stage: "concept_gate", failureCode: "codex_model_unavailable", completedAt: "2026-07-31T04:51:00.000Z", completedJobs: 0, totalJobs: 1 } : null,
          attention: failureMode ? [{ id: "failed-run", scheduleId: "schedule-running", status: "error", initialBatch: true, targetEpisodeCount: 3, workLabel: "새 작품 · 3화까지", stage: "concept_gate", failureCode: "codex_model_unavailable", completedAt: "2026-07-31T04:51:00.000Z", completedJobs: 0, totalJobs: 1 }] : [],
          lastCompleted: { latestRunId: "completed-run", workLabel: "판타지 · 3화까지", elapsedSeconds: 754, completedJobs: 14, completedAt: "2026-07-31T04:00:00.000Z" },
          recentCompleted: [{ latestRunId: "completed-run", workLabel: "판타지 · 3화까지", elapsedSeconds: 754, completedJobs: 14, completedAt: "2026-07-31T04:00:00.000Z" }],
          statusCounts: { running: failureMode ? 0 : 1, waiting: failureMode || !waitingQueueVisible ? 0 : 1, complete: 1, attention: failureMode ? 1 : 0 },
          history: [{ id: "history-1", status: "complete", initialBatch: true, targetEpisodeCount: 1, workLabel: "새 작품 · 1화까지", elapsedSeconds: 615, completedJobs: 6, completedAt: "2026-07-31T04:00:00.000Z", stageTimings: [{ type: "concept_gate", status: "complete", durationSeconds: 42, attemptCount: 1 }, { type: "write_draft", episodeNo: 1, status: "complete", durationSeconds: 210, attemptCount: 1 }] }],
          quotaNote: "실제 AI 작업 수와 소요 시간을 기록합니다."
        } });
      }
      if (path === "/api/storyheaven/operator/serial-engine/queue/queue-a/cancel" && request.method() === "POST") {
        canceled.push(path);
        waitingQueueVisible = false;
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
      if (path === "/api/storyheaven/operator/serial-engine/queue/failed-run/retry" && request.method() === "POST") {
        retries.push(path);
        failureMode = false;
        return json({ resumed: true, reused: false, queueGroupId: "failed-run" }, 202);
      }
      return json({ error: "not_found" }, 404);
    });

    await page.goto(`${root}/storyheaven/operator/serial/`, { waitUntil: "networkidle" });
    await page.locator("[data-serial-dashboard]").waitFor({ state: "visible" });
    await page.locator('[data-schedule-form] select[name="cadenceUnit"]').selectOption("minutes");
    await page.locator('[data-schedule-form] input[name="cadenceValue"]').fill("90");
    await page.locator('[data-schedule-form] input[name="targetEpisodeCount"]').fill("4");
    const primary = page.locator("[data-primary-genres]");
    assert.equal(await primary.locator("input:checked").count(), 1, `${viewport.name} starts with one genre`);

    await primary.locator('input[value="romance"]').check();
    await primary.locator('input[value="sf"]').check();
    assert.equal(await primary.locator("input:checked").count(), 3, `${viewport.name} accepts three genres`);
    assert.equal(await primary.locator('input[value="comedy"]').isDisabled(), true, `${viewport.name} blocks fourth genre`);
    assert.equal(await page.locator(".subgenre-group").count(), 3, `${viewport.name} renders one subgenre group per primary genre`);

    await primary.locator('input[value="fantasy"]').uncheck();
    await primary.locator('input[value="comedy"]').check();
    assert.equal(await page.locator("[data-creative-controls]").isVisible(), true, `${viewport.name} keeps creative controls available`);
    assert.equal(await page.locator("[data-creative-controls]").evaluate((node) => node.classList.contains("has-comedy")), true, `${viewport.name} marks comedy-aware controls`);

    await page.locator('.subgenre-group:has(h3:text("로맨스")) input[value="office-romance"]').check();
    await page.locator('.subgenre-group:has(h3:text("SF")) input[value="near-future"]').check();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem("storyheaven.operator.serial-draft.v6") || "null")?.primaryGenres?.length === 3);
    await page.reload({ waitUntil: "networkidle" });
    await page.locator("[data-serial-dashboard]").waitFor({ state: "visible" });
    assert.equal(await page.locator('[data-schedule-form] input[name="cadenceValue"]').inputValue(), "90", `${viewport.name} restores cadence value`);
    assert.equal(await page.locator('[data-schedule-form] select[name="cadenceUnit"]').inputValue(), "minutes", `${viewport.name} restores cadence unit`);
    assert.equal(await page.locator('[data-schedule-form] input[name="targetEpisodeCount"]').inputValue(), "4", `${viewport.name} restores target episode count`);
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
    assert.equal(submitted.humorIntensity, "light", `${viewport.name} derives legacy humor compatibility`);
    assert.equal(submitted.creativeControls.curiosity, 4, `${viewport.name} creative control payload`);
    assert.equal(submitted.cadenceMinutes, 90, `${viewport.name} minute cadence payload`);
    assert.equal(submitted.targetEpisodeCount, 4, `${viewport.name} initial episode target payload`);
    assert.equal("name" in submitted, false, `${viewport.name} omits redundant schedule name`);
    assert.equal("maxActiveSerials" in submitted, false, `${viewport.name} omits parallel-work setting`);
    assert.ok(runs.length > 0, `${viewport.name} queues selected initial work`);
    const liveProgress = page.locator("[data-queue-live]");
    assert.match(await liveProgress.textContent(), /58%/u, `${viewport.name} live overview exposes numeric progress`);
    assert.equal(await liveProgress.locator('[role="progressbar"]').getAttribute("aria-valuenow"), "58", `${viewport.name} live overview is accessible`);
    const scheduleProgress = page.locator(".schedule-row .schedule-progress");
    assert.equal(await scheduleProgress.count(), 1, `${viewport.name} active schedule carries its own progress meter`);
    assert.match(await scheduleProgress.textContent(), /58%/u, `${viewport.name} schedule meter exposes numeric progress`);
    assert.equal(await page.locator(".queue-row").count(), 1, `${viewport.name} waiting work is separated from live work`);
    const runningProgress = page.locator("[data-queue-live] .production-progress");
    assert.equal(await runningProgress.count(), 1, `${viewport.name} running work has a progress train`);
    assert.match(await runningProgress.locator(".production-progress-heading").textContent(), /현재 · 2화 원고.*7 \/ 13단계 완료/u, `${viewport.name} current production stage is explicit`);
    assert.equal(await runningProgress.locator(".production-step.is-complete").count(), 7, `${viewport.name} completed stages are filled`);
    assert.equal(await runningProgress.locator(".production-step.is-current").textContent(), "082화 원고진행 중", `${viewport.name} current stage is highlighted`);
    assert.equal(await runningProgress.locator(".production-step.is-upcoming").count(), 5, `${viewport.name} planned stages remain unfilled`);
    assert.equal(await page.locator("[data-status-running]").textContent(), "1", `${viewport.name} running count is explicit`);
    assert.equal(await page.locator("[data-status-waiting]").textContent(), "1", `${viewport.name} waiting count is explicit`);
    assert.equal(await page.locator("[data-status-complete]").textContent(), "1", `${viewport.name} completed count is explicit`);
    assert.match(await page.locator("[data-queue-last]").textContent(), /12분 34초/u, `${viewport.name} last duration is visible`);
    assert.match(await page.locator("[data-timing-summary]").textContent(), /10분 15초.*2건/u, `${viewport.name} persisted episode-one estimate is visible`);
    assert.match(await page.locator("[data-run-history]").textContent(), /아이디어.*42초/u, `${viewport.name} per-stage history is visible`);
    page.once("dialog", (dialog) => dialog.accept());
    await page.locator(".queue-row.waiting").getByRole("button", { name: "대기 취소" }).click();
    await page.waitForFunction(() => document.querySelectorAll(".queue-row").length === 0);
    assert.equal(canceled.length, 1, `${viewport.name} cancels a waiting queue item`);

    const layout = await page.evaluate(() => ({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth }));
    assert.equal(layout.documentWidth, layout.viewport, `${viewport.name} horizontal overflow`);
    assert.deepEqual(errors, [], `${viewport.name} page errors`);
    await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
    await page.screenshot({ path: `test-results/storyheaven-serial-multi-genre-${viewport.name}.png`, fullPage: true });

    failureMode = true;
    await page.reload({ waitUntil: "networkidle" });
    await page.locator("[data-serial-dashboard]").waitFor({ state: "visible" });
    assert.match(await page.locator("[data-queue-live]").textContent(), /현재 제작 중인 작품이 없습니다/u, `${viewport.name} live area does not mix in failed history`);
    assert.equal(await page.locator(".schedule-row .schedule-failure").count(), 1, `${viewport.name} schedule exposes its failed attempt`);
    assert.equal(await page.locator("[data-status-attention]").textContent(), "1", `${viewport.name} attention count is explicit`);
    await page.locator("[data-attention-list]").getByRole("button", { name: "연결 설정 보기" }).click();
    await page.waitForFunction(() => document.querySelector(".schedule-row")?.classList.contains("is-focused"));
    await page.screenshot({ path: `test-results/storyheaven-serial-retry-${viewport.name}.png`, fullPage: true });
    await page.locator("[data-attention-list]").getByRole("button", { name: "중단 지점부터 재개" }).click();
    await page.waitForFunction(() => document.querySelector("[data-queue-live]")?.textContent.includes("현재 제작 중"));
    assert.equal(retries.length, 1, `${viewport.name} failed schedule is retried directly`);
    await page.close();
  }
  console.log("StoryHeaven multi-genre UI checks passed");
} finally {
  await browser.close();
}
