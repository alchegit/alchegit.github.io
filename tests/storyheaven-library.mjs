import assert from "node:assert/strict";
import { chromium } from "playwright";

const root = process.env.STORYHEAVEN_TEST_ROOT || "http://127.0.0.1:4173";
const apiPattern = "https://harvard-museum-nails-mission.trycloudflare.com/**";
const browser = await chromium.launch({ headless: true });

const stories = [{
  id: "prologue-shared-cover",
  title: "짐이 직업을 정합니다",
  logline: "해 뜰 때 들고 있던 짐이 직업을 정하는 왕국 이야기.",
  genre: "fantasy",
  genres: ["fantasy", "comedy", "isekai"],
  tags: ["짐", "직업"],
  contentOrigin: "admin_seed",
  coverPath: "/storyheaven/assets/covers/last-platform.webp",
  episodeCount: 1,
  publishedAt: "2026-08-03T10:00:00+09:00",
  latestEpisodeAt: "2026-08-03T10:00:00+09:00",
  author: { nickname: "스토리천국 편집부", accountType: "system_ai" },
  likeCount: 0,
  viewCount: 0
}, {
  id: "prologue-empty-cover",
  title: "마왕성 공동구매의 배송사고",
  logline: "공동구매에서 모자란 물건이 마법 생물이 되는 배송 이야기.",
  genre: "판타지",
  genres: ["판타지", "코미디"],
  tags: ["배송", "마왕성"],
  contentOrigin: "admin_seed",
  coverPath: "",
  episodeCount: 1,
  publishedAt: "2026-08-03T09:00:00+09:00",
  latestEpisodeAt: "2026-08-03T09:00:00+09:00",
  author: { nickname: "스토리천국 편집부", accountType: "system_ai" },
  likeCount: 0,
  viewCount: 0
}, {
  id: "main-rain-cover",
  title: "빗물 기억 상점의 첫 손님",
  logline: "기억을 빗물에 보관하는 상점의 장기 연재.",
  genre: "감성판타지",
  genres: ["감성판타지"],
  tags: ["비", "기억"],
  contentOrigin: "admin_seed",
  coverPath: "/storyheaven/assets/covers/rain-memory-shop.webp",
  episodeCount: 2,
  publishedAt: "2026-08-02T09:00:00+09:00",
  latestEpisodeAt: "2026-08-03T08:00:00+09:00",
  author: { nickname: "스토리천국 편집부", accountType: "system_ai" },
  likeCount: 2,
  viewCount: 5
}, {
  id: "main-space-cover",
  title: "한 자리뿐인 우주선",
  logline: "한 좌석을 둘러싼 생존 투표 SF 연재.",
  genre: "SF",
  genres: ["SF", "스릴러"],
  tags: ["우주", "생존"],
  contentOrigin: "admin_seed",
  coverPath: "/storyheaven/assets/covers/airlock-choice.webp",
  episodeCount: 4,
  publishedAt: "2026-08-01T09:00:00+09:00",
  latestEpisodeAt: "2026-08-03T07:00:00+09:00",
  author: { nickname: "스토리천국 편집부", accountType: "system_ai" },
  likeCount: 20,
  viewCount: 100
}];

try {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000, minimumColumns: 5 },
    { name: "mobile", width: 390, height: 844, minimumColumns: 2 }
  ]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      const session = { access_token: "library-admin-token", user: { id: "library-admin" } };
      window.supabase = { createClient: () => ({ auth: {
        getSession: async () => ({ data: { session } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        signInWithOAuth: async () => ({}),
        signOut: async () => ({})
      } }) };
    });
    await page.route("https://cdn.jsdelivr.net/**", (route) => route.abort());
    await page.route(apiPattern, (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/storyheaven/feed") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ stories }) });
      if (path === "/api/storyheaven/profile") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ profile: { nickname: "운영자", isAdmin: true } }) });
      if (path === "/api/storyheaven/discovery") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ genres: [], periods: {} }) });
      if (path === "/api/storyheaven/rounds/current") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ round: null }) });
      if (path === "/api/storyheaven/stories/prologue-shared-cover/episodes") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ episodes: [{ id: "prologue-episode", episodeNo: 1, title: "프롤로그", summary: "첫 만남", estimatedReadMinutes: 3 }] }) });
      if (path === "/api/storyheaven/stories/prologue-shared-cover") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ story: stories[0] }) });
      return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "not_found" }) });
    });

    await page.goto(`${root}/storyheaven/`, { waitUntil: "networkidle" });
    const grid = page.locator("[data-seed-feed]");
    await grid.locator(".story-card").first().waitFor({ state: "visible" });

    for (const id of ["prologue-shared-cover", "prologue-empty-cover"]) {
      const card = grid.locator(`.story-card[data-story-id="${id}"]`);
      assert.equal(await card.evaluate((node) => node.classList.contains("is-prologue-only")), true, `${viewport.name} ${id} prologue state`);
      assert.equal(await card.locator("img").isHidden(), true, `${viewport.name} ${id} has no thumbnail image`);
      assert.equal(await card.locator("img").getAttribute("src"), null, `${viewport.name} ${id} does not borrow a shared cover`);
      assert.match(await card.locator(".no-cover-state").textContent(), /프롤로그 공개/u, `${viewport.name} ${id} explains no-cover state`);
    }

    const rainCover = await grid.locator('[data-story-id="main-rain-cover"] img').getAttribute("src");
    const spaceCover = await grid.locator('[data-story-id="main-space-cover"] img').getAttribute("src");
    assert.notEqual(rainCover, spaceCover, `${viewport.name} main serials keep distinct covers`);
    assert.match(rainCover, /rain-memory-shop\.webp$/u, `${viewport.name} rain serial uses its cover`);
    assert.match(spaceCover, /airlock-choice\.webp$/u, `${viewport.name} sf serial uses its cover`);

    const columns = await grid.evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(" ").filter(Boolean).length);
    assert.ok(columns >= viewport.minimumColumns, `${viewport.name} compact catalog columns`);
    assert.equal(await page.locator("[data-genre-list]").getByRole("button", { name: /^fantasy/u }).count(), 0, `${viewport.name} hides raw English genre labels`);
    assert.ok(await page.locator("[data-genre-list]").getByRole("button", { name: /^판타지/u }).count() > 0, `${viewport.name} combines fantasy under Korean label`);
    const webtoonAdminLink = page.locator('[data-storyheaven-admin-webtoon-nav][href="/webtoon/"]');
    assert.equal(await webtoonAdminLink.count(), 1, `${viewport.name} operator webtoon navigation exists`);
    assert.ok(await webtoonAdminLink.isVisible(), `${viewport.name} operator webtoon navigation visible`);

    await page.getByRole("tab", { name: "프롤로그" }).click();
    assert.equal(await grid.locator(".story-card").count(), 2, `${viewport.name} prologue filter`);
    await page.getByRole("tab", { name: "전체" }).click();
    await page.locator("[data-story-search]").fill("우주선");
    assert.equal(await grid.locator(".story-card").count(), 1, `${viewport.name} title search`);
    assert.equal(await grid.locator("h3").textContent(), "한 자리뿐인 우주선", `${viewport.name} title search result`);
    await page.locator("[data-story-search]").fill("");
    await page.getByRole("tab", { name: "인기순" }).click();
    assert.equal(await grid.locator(".story-card h3").first().textContent(), "한 자리뿐인 우주선", `${viewport.name} popular sorting`);
    assert.ok(await grid.locator('[data-story-id="main-space-cover"] .manage-story-button').isVisible(), `${viewport.name} operator management action`);

    const layout = await page.evaluate(() => ({ viewport: innerWidth, documentWidth: document.documentElement.scrollWidth }));
    assert.equal(layout.documentWidth, layout.viewport, `${viewport.name} horizontal overflow`);
    assert.deepEqual(errors, [], `${viewport.name} page errors`);
    await page.screenshot({ path: `test-results/storyheaven-library-${viewport.name}.png`, fullPage: true });

    await page.goto(`${root}/storyheaven/story/?id=prologue-shared-cover`, { waitUntil: "networkidle" });
    await page.locator("[data-detail]").waitFor({ state: "visible" });
    assert.equal(await page.locator("[data-cover]").isHidden(), true, `${viewport.name} prologue detail hides shared cover`);
    assert.equal(await page.locator(".series-hero").evaluate((node) => node.classList.contains("has-no-cover")), true, `${viewport.name} prologue detail uses text-first layout`);
    await context.close();
  }
  console.log("StoryHeaven compact library checks passed");
} finally {
  await browser.close();
}
