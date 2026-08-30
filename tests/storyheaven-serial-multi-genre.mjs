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
    const logCanceled = [];
    const retries = [];
    const queueRetries = [];
    const systemRequests = [];
    const firstEpisodeResumes = [];
    const runningSchedule = {
      id: "schedule-running",
      status: "active",
      publicationMode: "test_private",
      primaryGenre: "fantasy",
      primaryGenres: ["fantasy"],
      subgenres: ["modern-fantasy"],
      subgenresByGenre: { fantasy: ["modern-fantasy"] },
      genrePreset: { requestedId: "curated-long-fantasy-random", resolvedId: "game-progression-adventure-v1", label: "게임 모험 성장", version: "2026-08-30" },
      proseStyle: { requestedId: "light-witty-v1", resolvedId: "light-witty-v1", label: "가볍고 유쾌한 몰입형", version: "2026-08-30" },
      humorIntensity: "light",
      creativeControls: { preset: "balanced", pace: 3, suspense: 3, curiosity: 4, surprise: 3, emotion: 3, romance: 2, action: 3, description: 3, humor: 2, novelty: 2 },
      targetAge: "teen",
      cadenceMinutes: 360,
      targetEpisodeCount: 3,
      episode1Timing: { sampleCount: 2, averageSeconds: 615, lastSeconds: 630 },
      nextRunAt: "2026-07-31T09:00:00.000Z",
      conceptPolicy: "test"
    };
    let waitingQueueVisible = true;
    let waitingQueueScheduleStatus = "paused";
    let cooldownMode = false;
    let clockSkewMode = false;
    let failureMode = false;
    let systemPaused = false;
    let manualSchedulesPaused = false;
    let pauseRequestCount = 0;
    let stalledVisible = true;
    let titlelessLogVisible = true;
    const titlelessHistoryLog = { id: "titleless-stopped", title: "새 작품 기획", titlePending: true, status: "stopped", initialBatch: true, targetEpisodeCount: 1, primaryGenres: ["fantasy"], workLabel: "새 작품 · 1화까지", stage: "concept_gate", elapsedSeconds: null, completedJobs: 0, totalJobs: 1, requestedAt: "2026-07-31T03:00:00.000Z", stageTimings: [{ type: "concept_gate", status: "error", durationSeconds: null, attemptCount: 1, createdAt: "2026-07-31T03:00:00.000Z" }] };
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
        const nextRunAt = cooldownMode ? new Date(Date.now() + 30 * 60_000).toISOString() : runningSchedule.nextRunAt;
        return json({ enabled: true, emergencyPaused: systemPaused, schedules: [{ ...runningSchedule, nextRunAt, status: systemPaused || manualSchedulesPaused ? "paused" : "active" }], queue: {
          concurrency: 1,
          updatedAt: cooldownMode ? new Date(Date.now() + (clockSkewMode ? 9 * 60 * 60_000 : 0)).toISOString() : "2026-07-31T05:01:00.000Z",
          items: cooldownMode || failureMode ? [] : [
            { id: "queue-running", scheduleId: "schedule-running", status: systemPaused ? "waiting" : "running", queuePosition: 0, cancelable: false, initialBatch: true, targetEpisodeCount: 3, workLabel: "새 작품 · 3화까지", stage: "write_draft", episodeNo: 2, completedJobs: 8, totalJobs: 9, elapsedSeconds: 246, requestedAt: "2026-07-31T04:56:00.000Z" },
            ...(waitingQueueVisible ? [{ id: "queue-a", scheduleId: "schedule-paused", scheduleStatus: systemPaused ? "paused" : waitingQueueScheduleStatus, status: "waiting", queuePosition: 1, cancelable: true, workLabel: "미스터리 · 4화", stage: "write_draft", episodeNo: 4, completedJobs: 1, totalJobs: 3, requestedAt: "2026-08-02T00:04:00" }] : [])
          ],
          lastFailed: !cooldownMode && failureMode ? { id: "failed-run", scheduleId: "schedule-running", status: "error", initialBatch: true, targetEpisodeCount: 3, workLabel: "새 작품 · 3화까지", stage: "concept_gate", failureCode: "codex_model_unavailable", completedAt: "2026-07-31T04:51:00.000Z", completedJobs: 0, totalJobs: 1 } : null,
          attention: !cooldownMode && failureMode ? [{ id: "failed-run", scheduleId: "schedule-running", status: "error", initialBatch: true, targetEpisodeCount: 3, workLabel: "새 작품 · 3화까지", stage: "concept_gate", failureCode: "codex_model_unavailable", completedAt: "2026-07-31T04:51:00.000Z", completedJobs: 0, totalJobs: 1 }] : [],
          lastCompleted: { latestRunId: "completed-run", workLabel: "판타지 · 3화까지", elapsedSeconds: 754, completedJobs: 14, completedAt: "2026-07-31T04:00:00.000Z" },
          recentCompleted: [{ latestRunId: "completed-run", workLabel: "판타지 · 3화까지", elapsedSeconds: 754, completedJobs: 14, completedAt: "2026-07-31T04:00:00.000Z" }],
          statusCounts: { running: cooldownMode || failureMode ? 0 : 1, waiting: cooldownMode || failureMode || !waitingQueueVisible ? 0 : 1, complete: 1, attention: !cooldownMode && failureMode ? 1 : 0 },
          history: [
            { id: "history-1", title: "완성된 판타지", status: "complete", initialBatch: true, targetEpisodeCount: 1, workLabel: "완성된 판타지 · 1화", elapsedSeconds: 615, completedJobs: 6, completedAt: "2026-07-31T04:00:00.000Z", stageTimings: [{ type: "concept_gate", status: "complete", durationSeconds: 42, attemptCount: 1 }, { type: "write_draft", episodeNo: 1, status: "complete", durationSeconds: 210, attemptCount: 1 }] },
            ...(titlelessLogVisible ? [titlelessHistoryLog] : [])
          ],
          hiddenHistory: titlelessLogVisible ? [] : [{ ...titlelessHistoryLog, status: "hidden", canceledAt: "2026-08-02T00:10:00.000Z" }],
          stalledFirstEpisodeStories: stalledVisible ? [{ id: "stalled-story", title: "0화에서 멈춘 마법사", logline: "프롤로그 회차 등록 전에 멈춘 작품", latestRunStatus: "draft", latestStage: "editorial_review", draft: { characterCount: 0 }, latestCompletedAt: "2026-07-31T04:30:00.000Z" }] : [],
          quotaNote: "실제 AI 작업 수와 소요 시간을 기록합니다."
        } });
      }
      if (path === "/api/storyheaven/operator/serial-engine/system" && request.method() === "POST") {
        const body = request.postDataJSON();
        if (body.action === "pause") {
          pauseRequestCount += 1;
          if (pauseRequestCount === 1) return json({ error: "rate_limited" }, 429);
        }
        systemRequests.push(body);
        if (body.action === "pause") systemPaused = true;
        if (body.action === "start") systemPaused = false;
        return json({
          action: body.action,
          system: { paused: systemPaused, persisted: true, heldJobs: body.action === "pause" ? 2 : 0, interruptedRunningJobs: body.action === "pause" ? 1 : 0 },
          resumed: body.action === "start" ? { waitingReleased: 1, errorJobsReleased: 0, expiredReleased: 0 } : null,
          processed: { scheduled: [], published: [], continuations: [] }
        }, 202);
      }
      if (path === "/api/storyheaven/operator/serial-engine/queue/queue-a/cancel" && request.method() === "POST") {
        canceled.push(path);
        waitingQueueVisible = false;
        return json({ canceled: true, queueGroupId: "queue-a" });
      }
      if (path === "/api/storyheaven/operator/serial-engine/queue/queue-a/retry" && request.method() === "POST") {
        queueRetries.push(request.postDataJSON());
        await new Promise((resolve) => setTimeout(resolve, 800));
        waitingQueueScheduleStatus = "active";
        return json({ resumed: true, reused: true, scheduleActivated: true, waitingCount: 1, nextCheckSeconds: 10, queueGroupId: "queue-a" }, 202);
      }
      if (path === "/api/storyheaven/operator/serial-engine/queue/titleless-stopped/hide" && request.method() === "POST") {
        logCanceled.push(path);
        return json({ error: "not_found" }, 404);
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
      if (path === "/api/storyheaven/operator/serial-engine/stories/stalled-story/plan" && request.method() === "POST") {
        firstEpisodeResumes.push(request.postDataJSON());
        stalledVisible = false;
        return json({ run: { id: "stalled-plan", queueGroupId: "stalled-plan" } }, 202);
      }
      if (path === "/api/storyheaven/operator/serial-engine/runs/development-run" && request.method() === "GET") {
        const candidates = ["마지막 시간버스", "국경의 빈 지도", "퇴학 전 마지막 합주", "마녀의 빚 장부"].map((title, index) => ({
          id: `candidate-${index + 1}`,
          title,
          selected: index === 0,
          averageScore: 92 - index * 3,
          coreFantasy: `${title}에서 독자가 직접 선택과 대가를 체험하는 익숙하고 선명한 장르 재미다.`,
          humanDesire: "잃어버린 가족과 돌아갈 장소를 되찾고 싶은 인간적인 욕망이 사건을 움직인다.",
          centralRelationship: "서로 필요한 두 사람이 정보를 감추는 이유 때문에 협력할수록 더 크게 충돌한다.",
          storyEngine: "한 사건의 선택과 대가가 관계의 빚과 다음 사건의 조건을 계속 바꾼다.",
          signatureScene: "주인공이 소중한 기억을 대가로 내면서도 눈앞의 사람을 구하는 선택을 한다.",
          fatalRisk: "같은 해결 순서가 반복되면 사건과 감정이 양식화될 수 있다.",
          rejectionReason: index ? "선명한 장점은 있으나 선정안보다 인물 욕망과 장면 보상의 결합이 약하다." : ""
        }));
        return json({
          run: { id: "development-run", status: "published", stage: "published", rewriteCount: 0, episodeNo: null },
          development: {
            selectedCandidateId: "candidate-1",
            whySelected: "가족을 찾는 단순한 욕망과 기억을 대가로 내는 선택, 불신하는 동료와의 관계가 한 장면에서 함께 충돌한다.",
            proofScene: "첫 승객을 내려 주기 위해 가장 소중한 목소리 기억을 포기하는 장면이다.",
            fatalRisk: "승객 사연과 기억 상실이 같은 순서로 반복될 수 있다.",
            mitigation: "회사와 산 사람의 불법 승차, 동료와의 빚을 교차해 선택 결과를 바꾼다.",
            candidates
          },
          replanning: {
            basedOnArcNo: 1,
            targetArcNo: 2,
            targetScope: { firstEpisodeNo: 27, lastEpisodeNo: 51, volumeNo: 2 },
            evidenceEpisodeNos: [24, 25, 26],
            decisionSummary: "관계 협상은 살리고 반복된 승객 해결 순서는 회사 조사와 추적으로 바꿉니다. 공개된 기억 요금 규칙과 결말 경계는 그대로 지킵니다.",
            strengthsToPreserve: [{ asset: "도윤과 해진의 정보 교환", carryForward: "공동 조사 대신 서로 다른 목적의 협상으로 기능을 이어 갑니다." }],
            weaknessesToRepair: [{ risk: "새 승객과 기억 요금이 같은 순서로 반복", correction: "회사 조사의 결과로 승객 사건이 뒤늦게 연결되게 바꿉니다." }],
            nextArcDirective: {
              arcIntent: "서로 다른 조직의 감시 속에서 두 사람이 공동 책임의 조건을 다시 정합니다.",
              protagonistPressure: "도윤이 혼자 손해를 떠안으면 해진의 선택권까지 빼앗게 됩니다.",
              relationshipPressure: "해진은 기록을 숨겨 보호할지 새 약속을 지킬지 선택해야 합니다.",
              worldPressure: "운수 회사가 두 사람의 자격과 기록 접근권을 갈라놓습니다.",
              rhythmShift: "승객 해결 중심에서 협상과 추적이 번갈아 움직이는 호흡으로 바꿉니다."
            },
            protectedCommitmentChecks: [
              { commitment: "도윤과 해진의 가치 충돌" },
              { commitment: "기억을 요금으로 치르는 중심 규칙" },
              { commitment: "공동 책임을 선택하는 결말 경계" }
            ],
            hypothesisAdjustments: [{ volumeNo: 3 }],
            application: {
              sourceJobId: "replan-job-2",
              preservedAssets: ["도윤과 해진의 정보 교환"],
              correctedRisks: ["새 승객과 기억 요금이 같은 순서로 반복"]
            }
          },
          jobs: [], drafts: [], reviews: [], metrics: []
        });
      }
      return json({ error: "not_found" }, 404);
    });

    await page.goto(`${root}/storyheaven/operator/serial/`, { waitUntil: "networkidle" });
    await page.locator("[data-serial-dashboard]").waitFor({ state: "visible" });
    assert.equal(await page.locator("[data-create-panel]").evaluate((node) => node.open), false, `${viewport.name} new serial settings are collapsed by default`);
    assert.equal(await page.locator("[data-inspection-band]").isHidden(), true, `${viewport.name} manuscript inspection stays hidden until selected`);
    assert.equal(await page.locator(".completed-group").evaluate((node) => node.open), false, `${viewport.name} recent completed production is collapsed by default`);
    assert.match(await page.locator("[data-completed-caption]").textContent(), /최근 24시간 · 1건/u, `${viewport.name} recent completed caption explains the rolling window`);
    await page.screenshot({ path: `test-results/storyheaven-serial-simplified-${viewport.name}.png`, fullPage: true });
    await page.locator("[data-create-panel]").evaluate((node) => { node.open = true; });
    await page.locator(".creative-details").evaluate((node) => { node.open = true; });
    const noveltyControl = page.locator('[data-schedule-form] input[name="creativeNovelty"]');
    assert.equal(await noveltyControl.isVisible(), true, `${viewport.name} shows novelty under item controls`);
    assert.equal(await noveltyControl.inputValue(), "2", `${viewport.name} starts with restrained novelty`);
    assert.match(await noveltyControl.locator("xpath=ancestor::label").textContent(), /참신성.*익숙한 장르 문법.*실험적 조합/u, `${viewport.name} explains the novelty range`);
    assert.equal(await noveltyControl.locator("xpath=ancestor::label").locator("output").getAttribute("title"), "절제된 차별화", `${viewport.name} names the default novelty level`);
    assert.equal(await page.locator('[data-schedule-form] input[name="openingPilotMode"][value="three_episode_incubation"]').isChecked(), true, `${viewport.name} defaults to a three-installment pilot`);
    assert.equal(await page.locator('[data-schedule-form] input[name="openingPilotApprovalMode"][value="system_auto"]').isChecked(), true, `${viewport.name} defaults to high-score automatic promotion`);
    assert.equal(await page.locator('[data-schedule-form] input[name="targetEpisodeCount"]').inputValue(), "3", `${viewport.name} three-installment pilot raises the minimum initial batch`);
    assert.equal(await page.locator('[data-schedule-form] input[name="genrePresetId"][value="curated-long-fantasy-random"]').isChecked(), true, `${viewport.name} defaults to curated long-fantasy random`);
    assert.equal(await page.locator('[data-schedule-form] input[name="proseStyleId"][value="light-witty-v1"]').isChecked(), true, `${viewport.name} defaults to light witty prose`);
    assert.match(await page.locator("[data-genre-preset-preview]").textContent(), /정통 영웅 모험.*신화적 세계 대서사.*무협 융합.*게임 모험 성장/u, `${viewport.name} explains the curated genre pool`);
    await page.locator("[data-create-panel]").screenshot({ path: `test-results/storyheaven-serial-v3-defaults-${viewport.name}.png` });
    await page.locator('[data-schedule-form] select[name="cadenceUnit"]').selectOption("minutes");
    await page.locator('[data-schedule-form] input[name="cadenceValue"]').fill("90");
    await page.locator('[data-schedule-form] input[name="targetEpisodeCount"]').fill("4");
    await page.locator('[data-schedule-form] input[name="genrePresetId"][value="mythic-world-epic-v1"]').check();
    assert.match(await page.locator("[data-genre-preset-preview]").textContent(), /신화적 세계 대서사.*신화·독자세계.*시대판타지.*전쟁/u, `${viewport.name} previews a concrete genre experience`);
    assert.equal(await page.locator("[data-manual-genre-fieldset]:visible").count(), 0, `${viewport.name} hides manual genre complexity for a preset`);
    await page.locator('[data-schedule-form] input[name="genrePresetId"][value="manual"]').check();
    assert.equal(await page.locator("[data-manual-genre-fieldset]:visible").count(), 2, `${viewport.name} reveals manual genres only on demand`);
    const primary = page.locator("[data-primary-genres]");
    await primary.locator('input[value="historical"]').uncheck();
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
    await page.waitForFunction(() => JSON.parse(localStorage.getItem("storyheaven.operator.serial-draft.v12") || "null")?.primaryGenres?.length === 3);
    await page.reload({ waitUntil: "networkidle" });
    await page.locator("[data-serial-dashboard]").waitFor({ state: "visible" });
    await page.locator("[data-create-panel]").evaluate((node) => { node.open = true; });
    assert.equal(await page.locator('[data-schedule-form] input[name="cadenceValue"]').inputValue(), "90", `${viewport.name} restores cadence value`);
    assert.equal(await page.locator('[data-schedule-form] select[name="cadenceUnit"]').inputValue(), "minutes", `${viewport.name} restores cadence unit`);
    assert.equal(await page.locator('[data-schedule-form] input[name="targetEpisodeCount"]').inputValue(), "4", `${viewport.name} restores target episode count`);
    assert.equal(await page.locator('[data-schedule-form] input[name="openingPilotMode"][value="three_episode_incubation"]').isChecked(), true, `${viewport.name} restores opening pilot mode`);
    assert.equal(await page.locator('[data-schedule-form] input[name="openingPilotApprovalMode"][value="system_auto"]').isChecked(), true, `${viewport.name} restores pilot approval mode`);
    assert.equal(await page.locator('[data-schedule-form] input[name="creativeNovelty"]').inputValue(), "2", `${viewport.name} restores novelty`);
    assert.equal(await page.locator('[data-schedule-form] input[name="genrePresetId"][value="manual"]').isChecked(), true, `${viewport.name} restores manual genre mode`);
    assert.equal(await page.locator('[data-schedule-form] input[name="proseStyleId"][value="light-witty-v1"]').isChecked(), true, `${viewport.name} restores prose style`);
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
    assert.equal(submitted.creativeControls.novelty, 2, `${viewport.name} novelty payload`);
    assert.equal(submitted.genrePresetId, "manual", `${viewport.name} genre preset payload`);
    assert.equal(submitted.proseStyleId, "light-witty-v1", `${viewport.name} prose style payload`);
    assert.equal(submitted.cadenceMinutes, 90, `${viewport.name} minute cadence payload`);
    assert.equal(submitted.targetEpisodeCount, 4, `${viewport.name} initial episode target payload`);
    assert.equal(submitted.openingPilotMode, "three_episode_incubation", `${viewport.name} opening pilot payload`);
    assert.equal(submitted.openingPilotApprovalMode, "system_auto", `${viewport.name} opening pilot approval payload`);
    assert.equal(submitted.totalVolumes, 10, `${viewport.name} default volume count payload`);
    assert.equal(submitted.episodesPerVolume, 25, `${viewport.name} default episodes-per-volume payload`);
    assert.equal(submitted.continuationBatchCount, 1, `${viewport.name} default continuation batch payload`);
    assert.equal("name" in submitted, false, `${viewport.name} omits redundant schedule name`);
    assert.equal("maxActiveSerials" in submitted, false, `${viewport.name} omits parallel-work setting`);
    assert.ok(runs.length > 0, `${viewport.name} queues selected initial work`);
    const liveProgress = page.locator("[data-queue-live]");
    assert.match(await liveProgress.textContent(), /58%/u, `${viewport.name} live overview exposes numeric progress`);
    assert.equal(await liveProgress.locator('[role="progressbar"]').getAttribute("aria-valuenow"), "58", `${viewport.name} live overview is accessible`);
    assert.equal(await page.locator(".schedule-row .schedule-progress").count(), 0, `${viewport.name} active progress is shown once instead of repeated on its setting card`);
    assert.match(await page.locator(".schedule-row").textContent(), /이 설정 멈추기.*설정 관리/u, `${viewport.name} setting card exposes one scoped control and collapsed management`);
    assert.match(await page.locator(".schedule-row").textContent(), /게임 모험 성장.*가볍고 유쾌한 몰입형/u, `${viewport.name} setting card exposes resolved genre and prose profiles`);
    assert.equal(await page.locator(".queue-row").count(), 1, `${viewport.name} waiting work is separated from live work`);
    const waitingText = await page.locator(".queue-row.waiting").textContent();
    assert.match(waitingText, /오전 12:04/u, `${viewport.name} offsetless DB time is treated as Seoul time`);
    assert.doesNotMatch(waitingText, /오전 0?9:04/u, `${viewport.name} offsetless DB time is not shifted nine hours`);
    const runningProgress = page.locator("[data-queue-live] .production-progress");
    assert.equal(await runningProgress.count(), 1, `${viewport.name} running work has a progress train`);
    assert.equal(await page.locator("[data-queue-live]").getByRole("button", { name: /멈춘 단계|다시 시작/u }).count(), 0, `${viewport.name} healthy running work does not expose a dangerous forced restart`);
    assert.match(await runningProgress.locator(".production-progress-heading").textContent(), /현재 · 본편 1화 원고.*7 \/ 13단계 완료/u, `${viewport.name} current production stage is explicit`);
    assert.equal(await runningProgress.locator(".production-step.is-complete").count(), 7, `${viewport.name} completed stages are filled`);
    assert.equal(await runningProgress.locator(".production-step.is-current").textContent(), "08본편 1화 원고진행 중", `${viewport.name} current stage is highlighted`);
    assert.equal(await runningProgress.locator(".production-step.is-upcoming").count(), 5, `${viewport.name} planned stages remain unfilled`);
    assert.equal(await page.locator("[data-status-running]").textContent(), "1", `${viewport.name} running count is explicit`);
    assert.equal(await page.locator("[data-status-waiting]").textContent(), "1", `${viewport.name} waiting count is explicit`);
    assert.equal(await page.locator("[data-status-complete]").textContent(), "1", `${viewport.name} completed count is explicit`);
    assert.match(await page.locator("[data-system-state-title]").textContent(), /제작 중/u, `${viewport.name} system panel shows live state`);
    const waitingRow = page.locator(".queue-row.waiting");
    assert.match(await waitingRow.textContent(), /연결된 설정이 개별 멈춤 상태/u, `${viewport.name} explains why paused work cannot start`);
    assert.equal(await waitingRow.locator(".queue-retry").count(), 0, `${viewport.name} normal waiting work does not expose a misleading manual resume`);
    assert.match(await waitingRow.locator("[data-queue-feedback]").textContent(), /가동 설정에서 이 설정만 시작/u, `${viewport.name} paused work points to the correct control scope`);
    assert.deepEqual(await waitingRow.getByRole("button").allTextContents(), ["대기 취소"], `${viewport.name} waiting work exposes cancellation only`);
    const pauseButton = page.locator("[data-pause-system]");
    await pauseButton.click();
    assert.equal(await pauseButton.getAttribute("aria-busy"), "true", `${viewport.name} emergency stop reacts immediately`);
    await page.waitForFunction(() => document.querySelector("[data-system-state-title]")?.textContent.includes("전체 중지됨"));
    assert.match(await page.locator("[data-common-toast]").textContent(), /즉시 전체 중지.*작성 중 1건/u, `${viewport.name} emergency pause confirms running work interruption`);
    const systemPrimary = page.locator("[data-system-primary]");
    assert.equal(await systemPrimary.textContent(), "전체 다시 시작", `${viewport.name} paused system exposes one unambiguous recovery action`);
    await systemPrimary.click();
    await page.waitForFunction(() => document.querySelector("[data-system-state-title]")?.textContent.includes("제작 중"));
    assert.equal(pauseRequestCount, 2, `${viewport.name} emergency pause retries a rejected rate-limited request`);
    assert.deepEqual(systemRequests.map((item) => item.action), ["pause", "start"], `${viewport.name} system controls call backend`);
    assert.match(await page.locator("[data-queue-last]").textContent(), /12분 34초/u, `${viewport.name} last duration is visible`);
    assert.match(await page.locator("[data-timing-summary]").textContent(), /10분 15초.*2건/u, `${viewport.name} persisted episode-one estimate is visible`);
    assert.match(await page.locator("[data-run-history]").textContent(), /작품 아이디어 검토.*42초/u, `${viewport.name} per-stage history is visible`);
    await page.locator(".run-history").evaluate((node) => { node.open = true; });
    const completedLog = page.locator(".run-history-item").filter({ hasText: "완성된 판타지" });
    assert.equal(await completedLog.getByRole("button", { name: "로그 숨김" }).count(), 1, `${viewport.name} completed work log can also be hidden`);
    const titlelessLog = page.locator(".run-history-item").filter({ hasText: "제목 생성 전 · 판타지 · 프롤로그" });
    assert.equal(await titlelessLog.count(), 1, `${viewport.name} titleless stopped work is labeled by genre and batch`);
    assert.match(await titlelessLog.textContent(), /로그 숨김/u, `${viewport.name} titleless stopped work can be hidden from history`);
    let hideDialogShown = false;
    const hideDialogHandler = async (dialog) => {
      hideDialogShown = true;
      await dialog.dismiss();
    };
    page.on("dialog", hideDialogHandler);
    await titlelessLog.getByRole("button", { name: "로그 숨김" }).click();
    page.off("dialog", hideDialogHandler);
    assert.equal(hideDialogShown, false, `${viewport.name} history hide does not ask for confirmation`);
    await page.waitForFunction(() => !document.querySelector("[data-run-history]")?.textContent.includes("제목 생성 전 · 판타지 · 프롤로그"));
    assert.equal(logCanceled.length, 1, `${viewport.name} titleless history hide attempts backend persistence`);
    assert.equal(await page.evaluate(() => Boolean(JSON.parse(localStorage.getItem("storyheaven.operator.serial-hidden-history.v1") || "{}")["titleless-stopped"])), true, `${viewport.name} failed backend hide persists in the operator browser`);
    assert.doesNotMatch(await page.locator("[data-common-toast]").textContent(), /요청을 처리하지 못했습니다/u, `${viewport.name} backend version mismatch does not surface a false hide failure`);
    const hiddenToggle = page.locator("[data-history-hidden-toggle]");
    assert.match(await hiddenToggle.textContent(), /숨긴 로그 보기 \(1\)/u, `${viewport.name} hidden history toggle appears`);
    await hiddenToggle.click();
    assert.match(await page.locator("[data-run-history]").textContent(), /제목 생성 전 · 판타지 · 프롤로그.*숨김/u, `${viewport.name} hidden history is visible on demand`);
    await hiddenToggle.click();
    await page.waitForFunction(() => !document.querySelector("[data-run-history]")?.textContent.includes("제목 생성 전 · 판타지 · 프롤로그"));
    await page.reload({ waitUntil: "networkidle" });
    await page.locator("[data-serial-dashboard]").waitFor({ state: "visible" });
    await page.locator("[data-create-panel]").evaluate((node) => { node.open = true; });
    await page.locator(".run-history").evaluate((node) => { node.open = true; });
    assert.doesNotMatch(await page.locator("[data-run-history]").textContent(), /제목 생성 전 · 판타지 · 프롤로그/u, `${viewport.name} browser-level history hide survives reload`);
    assert.match(await page.locator("[data-history-hidden-toggle]").textContent(), /숨긴 로그 보기 \(1\)/u, `${viewport.name} persisted hidden history remains available after reload`);
    assert.match(await page.locator("[data-stalled-list]").textContent(), /0화에서 멈춘 마법사.*프롤로그 회차 미등록/u, `${viewport.name} stalled first episode is visible`);
    await page.locator("[data-stalled-list]").getByRole("button", { name: "프롤로그 제작 다시 요청" }).click();
    await page.locator("[data-stalled-group]").waitFor({ state: "hidden" });
    assert.deepEqual(firstEpisodeResumes.at(-1), { autoEpisode: true }, `${viewport.name} stalled first episode resumes from planning`);
    page.once("dialog", (dialog) => dialog.accept());
    await page.locator(".queue-row.waiting").getByRole("button", { name: "대기 취소" }).click();
    await page.waitForFunction(() => document.querySelectorAll(".queue-row").length === 0);
    assert.equal(canceled.length, 1, `${viewport.name} cancels a waiting queue item`);

    await page.locator("details.maintenance").evaluate((node) => { node.open = true; });
    await page.locator('[data-run-search] input[name="runId"]').fill("development-run");
    await page.locator("[data-run-search]").getByRole("button", { name: "기록 열기" }).click();
    await page.locator(".development-comparison").waitFor({ state: "visible" });
    assert.equal(await page.locator(".development-candidate").count(), 4, `${viewport.name} shows all four development candidates`);
    assert.match(await page.locator(".development-candidate.is-selected").textContent(), /선정 · 마지막 시간버스/u, `${viewport.name} highlights the selected candidate`);
    assert.match(await page.locator(".selection-rationale").textContent(), /최종 선정 근거.*위험 보완/u, `${viewport.name} explains selection evidence and mitigation`);
    assert.equal(await page.locator(".arc-replanning").count(), 1, `${viewport.name} shows the completed arc replan`);
    assert.match(await page.locator(".arc-replanning").textContent(), /구간 종료 재기획.*다음 구간 반영 완료.*이어갈 강점.*이번에 고칠 점/u, `${viewport.name} explains what the replan preserves and repairs`);
    assert.match(await page.locator(".replan-directive").textContent(), /주인공 압력.*관계 압력.*세계 압력.*리듬 변화/u, `${viewport.name} exposes the next-arc operating direction`);
    await page.screenshot({ path: `test-results/storyheaven-serial-development-${viewport.name}.png`, fullPage: true });

    const layout = await page.evaluate(() => ({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth }));
    assert.equal(layout.documentWidth, layout.viewport, `${viewport.name} horizontal overflow`);
    assert.deepEqual(errors, [], `${viewport.name} page errors`);
    await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: "instant" }));
    await page.locator(".creative-details").evaluate((node) => { node.open = true; });
    await page.screenshot({ path: `test-results/storyheaven-serial-multi-genre-${viewport.name}.png`, fullPage: true });

    cooldownMode = true;
    await page.reload({ waitUntil: "networkidle" });
    await page.locator("[data-serial-dashboard]").waitFor({ state: "visible" });
    await page.waitForFunction(() => document.querySelector("[data-system-state-title]")?.textContent.includes("쿨타임 대기"));
    const clockText = await page.locator("[data-seoul-clock]").textContent();
    assert.match(clockText, /현재 .*오[전후] \d{2}:\d{2}:\d{2}.*서울/u, `${viewport.name} cooldown state shows a live Seoul clock with seconds`);
    assert.equal(await page.locator("[data-seoul-clock]").getAttribute("data-clock-source"), "server-aligned", `${viewport.name} trusts a healthy server clock`);

    clockSkewMode = true;
    await page.reload({ waitUntil: "networkidle" });
    await page.locator("[data-serial-dashboard]").waitFor({ state: "visible" });
    assert.equal(await page.locator("[data-seoul-clock]").getAttribute("data-clock-source"), "browser-fallback", `${viewport.name} rejects a server clock more than two minutes in the future`);
    assert.match(await page.locator("[data-seoul-clock]").getAttribute("title"), /운영자 기기의 서울 시각/u, `${viewport.name} explains the safe clock fallback`);
    clockSkewMode = false;

    manualSchedulesPaused = true;
    await page.reload({ waitUntil: "networkidle" });
    await page.locator("[data-serial-dashboard]").waitFor({ state: "visible" });
    assert.equal(await page.locator("[data-system-state-title]").textContent(), "가동 설정 없음", `${viewport.name} manual schedule pause is not mislabeled as a global stop`);
    assert.equal(await page.locator("[data-system-primary]").textContent(), "가동 설정 보기", `${viewport.name} manual pause points to individual settings`);
    assert.equal(await page.locator("[data-pause-system]").isHidden(), true, `${viewport.name} emergency stop is hidden when every setting is already individually paused`);

    cooldownMode = false;
    manualSchedulesPaused = false;
    failureMode = true;
    await page.reload({ waitUntil: "networkidle" });
    await page.locator("[data-serial-dashboard]").waitFor({ state: "visible" });
    assert.match(await page.locator("[data-queue-live]").textContent(), /현재 제작 중인 작품이 없습니다/u, `${viewport.name} live area does not mix in failed history`);
    assert.equal(await page.locator(".schedule-row .schedule-failure").count(), 1, `${viewport.name} schedule exposes its failed attempt`);
    assert.equal(await page.locator("[data-status-attention]").textContent(), "1", `${viewport.name} attention count is explicit`);
    assert.match(await page.locator("[data-system-state-title]").textContent(), /확인 필요/u, `${viewport.name} system panel lifts retryable failure`);
    assert.equal(await page.locator("[data-system-primary]").textContent(), "문제 작업 보기", `${viewport.name} top action navigates instead of duplicating the retry command`);
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
