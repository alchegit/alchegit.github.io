import assert from "node:assert/strict";
import { chromium } from "playwright";

const root = process.env.STORYHEAVEN_TEST_ROOT || "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "mobile", width: 390, height: 844 }
  ]) {
    const page = await browser.newPage({ viewport });
    const pageErrors = [];
    const moderationRequests = [];
    const storyCreateRequests = [];
    const episodeCreateRequests = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.addInitScript(() => {
      const session = { access_token: "browser-test-token", user: { id: "test-user" } };
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: async (value) => { window.__copiedSubmissionGuide = value; } }
      });
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
    await page.route("https://harvard-museum-nails-mission.trycloudflare.com/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/storyheaven/profile") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ profile: { nickname: "테스트작가", nicknameStatus: "active", isAdmin: true } }) });
        return;
      }
      if (path === "/api/storyheaven/stories" && route.request().method() === "POST") {
        storyCreateRequests.push(route.request().postDataJSON());
        await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ story: { id: `story-${viewport.name}`, revisionNo: 1, status: "draft" } }) });
        return;
      }
      if (path.endsWith("/episodes") && route.request().method() === "POST") {
        episodeCreateRequests.push(route.request().postDataJSON());
        await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ episode: { id: "episode-test", episodeNo: 1, status: "draft" } }) });
        return;
      }
      if (path === "/api/storyheaven/me/stories") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ stories: [] }) });
        return;
      }
      if (path === "/api/storyheaven/me/notifications") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ notifications: [] }) });
        return;
      }
      if (path === "/api/storyheaven/operator/submissions") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ submissions: [] }) });
        return;
      }
      if (path === "/api/storyheaven/operator/reports") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ reports: [] }) });
        return;
      }
      if (path === "/api/storyheaven/operator/episodes") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ episodes: [] }) });
        return;
      }
      if (path === "/api/storyheaven/rounds/current") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ round: { id: "round-test", key: "2026-07-20", type: "weekly", status: "auditing", entries: [], votingEndsAt: "2026-07-26T12:00:00.000Z" } }) });
        return;
      }
      if (path === "/api/storyheaven/operator/rounds/pending") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ rounds: [{ id: "round-test", key: "2026-07-20", type: "weekly", status: "auditing", entries: [], votingEndsAt: "2026-07-26T12:00:00.000Z" }] }) });
        return;
      }
      if (path === "/api/storyheaven/operator/rounds/round-test/audit") {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ activeVotes: 12, canceledVotes: 1, voterCount: 10, riskClusters: [], signalRetentionDays: 30, entries: [{ entryId: "entry-test", storyId: "story-test", title: "막차의 마지막 승객", author: "테스트작가", status: "candidate", eligibilityScore: 82, voteCount: 12 }], votes: [{ voteId: "vote-test", storyId: "story-test", storyTitle: "막차의 마지막 승객", voterKey: "V-12AB34CD56", status: "active", castAt: "2026-07-24T02:00:00.000Z" }] }) });
        return;
      }
      if (path === "/api/storyheaven/operator/votes/vote-test/invalidate" && route.request().method() === "POST") {
        moderationRequests.push({ type: "vote", body: route.request().postDataJSON() });
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ voteId: "vote-test", status: "invalidated", voteCount: 11 }) });
        return;
      }
      if (path === "/api/storyheaven/operator/entries/entry-test/disqualify" && route.request().method() === "POST") {
        moderationRequests.push({ type: "entry", body: route.request().postDataJSON() });
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ entryId: "entry-test", status: "disqualified", invalidatedVotes: 12 }) });
        return;
      }
      await route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "not_found" }) });
    });

    await page.goto(`${root}/storyheaven/write/`, { waitUntil: "networkidle" });
    await page.locator("[data-editor]").waitFor({ state: "visible" });
    const episodeSection = page.locator("[data-episode-section]");
    assert.equal(await episodeSection.getAttribute("open"), null, `${viewport.name} optional episode starts folded`);
    await episodeSection.locator(":scope > summary").click();
    const guide = page.locator("[data-submission-guide]");
    assert.equal(await guide.getAttribute("open"), "", `${viewport.name} guide starts open`);
    assert.equal(await page.locator('input[type="file"]').count(), 0, `${viewport.name} image upload absent`);
    assert.equal(await page.locator('[name="protagonistGoal"]').count(), 0, `${viewport.name} protagonist goal removed`);
    assert.equal(await page.locator('[name="obstacleStakes"]').count(), 0, `${viewport.name} obstacle and stakes removed`);
    assert.equal(await page.locator('[name="logline"]').count(), 0, `${viewport.name} logline input removed`);
    assert.equal(await page.locator('[name="secondaryGenre"]').count(), 0, `${viewport.name} secondary genre removed`);
    assert.equal(await page.locator('[name="episodeSummary"]').count(), 0, `${viewport.name} episode summary input removed`);
    const genreInput = page.locator("[data-genre-input]");
    await genreInput.fill("미스터리,");
    await page.getByRole("button", { name: "미스터리 장르 삭제" }).waitFor();
    await genreInput.fill("생활밀착SF ");
    await page.getByRole("button", { name: "생활밀착SF 장르 삭제" }).waitFor();
    assert.equal(await page.locator("[data-genre-chips] .tag-chip").count(), 2, `${viewport.name} separators create multiple genres`);
    assert.equal(await page.locator('[name="genre"]').inputValue(), "미스터리,생활밀착SF", `${viewport.name} hidden genre value stays synchronized`);
    await page.getByRole("button", { name: "미스터리 장르 삭제" }).click();
    assert.equal(await page.locator("[data-genre-chips] .tag-chip").count(), 1, `${viewport.name} genre removes on click`);
    const tagInput = page.locator("[data-tag-input]");
    await tagInput.fill("폐역 ");
    await page.getByRole("button", { name: "폐역 태그 삭제" }).waitFor();
    await tagInput.fill("가족,");
    assert.equal(await page.locator("[data-tag-chips] .tag-chip").count(), 2, `${viewport.name} separators create tags`);
    await page.getByRole("button", { name: "폐역 태그 삭제" }).click();
    assert.equal(await page.locator("[data-tag-chips] .tag-chip").count(), 1, `${viewport.name} tag removes on click`);
    assert.equal(await page.locator('[name="tags"]').inputValue(), "가족", `${viewport.name} hidden tag value stays synchronized`);
    await page.locator("[data-copy-submission-guide]").click();
    assert.match(await page.evaluate(() => window.__copiedSubmissionGuide || ""), /최소 2,500자/u, `${viewport.name} guide copies limits`);
    assert.match(await page.evaluate(() => window.__copiedSubmissionGuide || ""), /그림, 첨부파일/u, `${viewport.name} guide copies text-only rule`);
    await guide.locator("summary").click();
    assert.equal(await guide.getAttribute("open"), null, `${viewport.name} guide folds`);
    await guide.locator("summary").click();
    assert.equal(await guide.getAttribute("open"), "", `${viewport.name} guide reopens`);
    await guide.screenshot({ path: `test-results/storyheaven-submission-guide-${viewport.name}.png` });
    await page.locator('[name="title"]').fill("막차가 떠난 뒤의 승강장");
    await page.evaluate(() => scrollTo(0, 0));
    const metrics = await page.evaluate(() => {
      const editor = document.querySelector(".editor-layout").getBoundingClientRect();
      const form = document.querySelector(".editor-form").getBoundingClientRect();
      const side = document.querySelector(".side-panel").getBoundingClientRect();
      const buttons = [...document.querySelectorAll(".form-actions .button")].map((button) => button.getBoundingClientRect());
      return {
        viewportWidth: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        formWidth: form.width,
        sideWidth: side.width,
        sideBesideForm: Math.abs(side.top - form.top) < 5 && side.left > form.right,
        buttonsFit: buttons.every((box) => box.left >= editor.left - 1 && box.right <= editor.right + 1),
        nextStep: document.querySelector("[data-next-step]").textContent,
        saveDisabled: document.querySelector("[data-save]").disabled
      };
    });
    assert.equal(metrics.documentWidth, metrics.viewportWidth, `${viewport.name} horizontal overflow`);
    assert.equal(metrics.buttonsFit, true, `${viewport.name} action buttons fit`);
    assert.match(metrics.nextStep, /회차 원고/u, `${viewport.name} next action reacts`);
    assert.equal(metrics.saveDisabled, false, `${viewport.name} draft save is ready`);
    assert.equal(metrics.sideBesideForm, viewport.name === "desktop", `${viewport.name} responsive editor layout`);
    const createRequest = page.waitForRequest((request) => new URL(request.url()).pathname === "/api/storyheaven/stories" && request.method() === "POST");
    await page.locator("[data-save]").click();
    await createRequest;
    assert.equal(storyCreateRequests.length, 1, `${viewport.name} story saves with basic fields`);
    assert.equal(episodeCreateRequests.length, 0, `${viewport.name} empty episode is not created`);
    assert.equal(storyCreateRequests[0].packet.synopsis, "", `${viewport.name} synopsis may stay empty without episode`);
    assert.deepEqual(storyCreateRequests[0].packet.genres, ["생활밀착SF"], `${viewport.name} multiple genre array included in story packet`);
    assert.equal(storyCreateRequests[0].packet.genre, "생활밀착SF", `${viewport.name} first genre keeps legacy compatibility`);
    assert.equal(storyCreateRequests[0].packet.tags.join(","), "가족", `${viewport.name} tags included in story packet`);
    assert.deepEqual(pageErrors, [], `${viewport.name} page errors`);

    await page.goto(`${root}/storyheaven/my/`, { waitUntil: "networkidle" });
    await page.locator("[data-my-content]").waitFor({ state: "visible" });
    assert.equal(await page.locator("[data-empty]").isVisible(), true, `${viewport.name} my stories empty state`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth), true, `${viewport.name} my stories overflow`);

    await page.goto(`${root}/storyheaven/operator/`, { waitUntil: "networkidle" });
    await page.locator("[data-operator]").waitFor({ state: "visible" });
    assert.equal(await page.locator("[data-finalize-round]").isVisible(), true, `${viewport.name} finalize shown only for auditing round`);
    await page.locator("[data-audit-tools]").waitFor({ state: "visible" });
    await page.locator("[data-audit-entries] input").fill("권리 침해 신고가 확인되어 후보에서 제외합니다.");
    const entryRequest = page.waitForRequest((request) => request.url().includes("/operator/entries/entry-test/disqualify") && request.method() === "POST");
    const auditRefresh = page.waitForResponse((response) => response.url().includes("/operator/rounds/round-test/audit") && response.request().method() === "GET");
    await page.locator("[data-audit-entries] button").click();
    await entryRequest;
    await auditRefresh;
    await page.locator("[data-audit-votes] input").waitFor({ state: "attached" });
    await page.locator("[data-audit-votes]").locator("xpath=ancestor::details").evaluate((element) => { element.open = true; });
    await page.locator("[data-audit-votes] input").fill("중복 계정 운영 증거를 별도로 확인했습니다.");
    const voteRequest = page.waitForRequest((request) => request.url().includes("/operator/votes/vote-test/invalidate") && request.method() === "POST");
    await page.locator("[data-audit-votes] button").click();
    await voteRequest;
    assert.deepEqual(moderationRequests.map((item) => item.type).sort(), ["entry", "vote"], `${viewport.name} moderation actions`);
    assert.ok(moderationRequests.every((item) => item.body.reason.length >= 10), `${viewport.name} moderation reasons`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth), true, `${viewport.name} operator overflow`);
    await page.close();
  }

  const reviewPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  let batchStatusRequests = 0;
  let legacyStatusRequests = 0;
  reviewPage.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path === "/api/storyheaven/me/review-statuses") batchStatusRequests += 1;
    if (/\/api\/storyheaven\/stories\/[^/]+\/review-status$/u.test(path)) legacyStatusRequests += 1;
  });
  await reviewPage.addInitScript(() => {
    const session = { access_token: "browser-test-token", user: { id: "review-list-user" } };
    window.supabase = { createClient: () => ({ auth: {
      getSession: async () => ({ data: { session } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithOAuth: async () => ({}), signOut: async () => ({})
    } }) };
  });
  await reviewPage.route("https://cdn.jsdelivr.net/**", (route) => route.abort());
  await reviewPage.route("https://harvard-museum-nails-mission.trycloudflare.com/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = (body) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    if (path === "/api/storyheaven/profile") return json({ profile: { nickname: "검수작가", nicknameStatus: "active", isAdmin: false } });
    if (path === "/api/storyheaven/me/stories") return json({ stories: [1, 2].map((id) => ({ id: `moderation-${id}`, title: `검수 이야기 ${id}`, genre: "미스터리", status: "moderation", revisionNo: 1, updatedAt: "2026-07-29T00:00:00.000Z" })) });
    if (path === "/api/storyheaven/me/notifications") return json({ notifications: [] });
    if (path === "/api/storyheaven/me/review-statuses") return json({ reviews: [1, 2].map((id) => ({ storyId: `moderation-${id}`, status: "running", stage: "ai_running", message: "AI가 원고를 검수하고 있습니다.", estimateLabel: "보통 3~5분", totalCount: 2, completedCount: 1 })) });
    return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "not_found" }) });
  });
  await reviewPage.goto(`${root}/storyheaven/my/`, { waitUntil: "networkidle" });
  await reviewPage.locator("[data-story-list] .list-panel").first().waitFor();
  assert.equal(await reviewPage.locator("[data-story-list] .list-panel").count(), 2, "two moderation stories render");
  assert.equal(batchStatusRequests, 1, "moderation statuses load in one batch request");
  assert.equal(legacyStatusRequests, 0, "legacy per-story status requests are removed");
  await reviewPage.close();

  const publicPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await publicPage.goto(`${root}/storyheaven/`, { waitUntil: "networkidle" });
  assert.equal(await publicPage.locator('a[href="/storyheaven/operator/"]').count(), 0, "operator link must stay hidden from public navigation");
  await publicPage.close();
  console.log("StoryHeaven submission browser checks passed");
} finally {
  await browser.close();
}
