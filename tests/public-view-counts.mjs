import assert from "node:assert/strict";
import { chromium } from "playwright";

const root = process.env.PUBLIC_VIEW_TEST_ROOT || "http://127.0.0.1:4173";
const apiHost = "https://harvard-museum-nails-mission.trycloudflare.com";
const browser = await chromium.launch({ headless: true });

function installSignedOutSupabase(page) {
  return page.addInitScript(() => {
    window.supabase = {
      createClient: () => ({ auth: {
        getSession: async () => ({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        signInWithOAuth: async () => ({}),
        signOut: async () => ({})
      } })
    };
  });
}

try {
  const storyPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await installSignedOutSupabase(storyPage);
  await storyPage.route("https://cdn.jsdelivr.net/**", (route) => route.abort());
  let storyViews = 4;
  let episodeViews = 9;
  let storyViewPosts = 0;
  let episodeViewPosts = 0;
  await storyPage.route(`${apiHost}/**`, (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const json = (body) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    if (request.method() === "GET" && path === "/api/storyheaven/stories/view-story") {
      return json({ story: {
        id: "view-story", title: "무료 독서 테스트", logline: "누구나 끝까지 읽는 이야기",
        synopsis: "로그인 없이 공개 원고 전체를 읽습니다.", genre: "미스터리",
        contentOrigin: "human", contentRating: "all", author: { nickname: "이야기씨앗" },
        likeCount: 2, viewCount: storyViews
      } });
    }
    if (request.method() === "GET" && path === "/api/storyheaven/stories/view-story/episodes") {
      return json({ episodes: [{
        id: "view-episode-1", episodeNo: 1, title: "열린 첫 화", summary: "무료 공개",
        characterCount: 120, totalCharacters: 120, estimatedReadMinutes: 1, viewCount: episodeViews
      }] });
    }
    if (request.method() === "GET" && path === "/api/storyheaven/stories/view-story/episodes/1") {
      return json({ episode: {
        id: "view-episode-1", episodeNo: 1, title: "열린 첫 화",
        body: "로그인하지 않아도 첫 문장을 읽습니다.\n\n그리고 마지막 문장까지 무료로 읽습니다.",
        totalCharacters: 120, estimatedReadMinutes: 1, viewCount: episodeViews,
        guestPreview: false, loginRequired: false, reactions: {}
      } });
    }
    if (request.method() === "POST" && path === "/api/storyheaven/stories/view-story/view") {
      assert.equal(request.headers().authorization, undefined, "guest story view has no bearer token");
      storyViewPosts += 1;
      storyViews += 1;
      return json({ storyId: "view-story", viewCount: storyViews, counted: true });
    }
    if (request.method() === "POST" && path === "/api/storyheaven/stories/view-story/episodes/1/view") {
      assert.equal(request.headers().authorization, undefined, "guest episode view has no bearer token");
      episodeViewPosts += 1;
      episodeViews += 1;
      return json({ storyId: "view-story", episodeNo: 1, viewCount: episodeViews, counted: true });
    }
    return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "not_found" }) });
  });

  await storyPage.goto(`${root}/storyheaven/story/?id=view-story`, { waitUntil: "networkidle" });
  await storyPage.waitForFunction(() => document.querySelector("[data-views]")?.textContent === "조회 5");
  await storyPage.locator("[data-read-first]").click();
  await storyPage.getByText("그리고 마지막 문장까지 무료로 읽습니다.").waitFor({ state: "visible" });
  await storyPage.waitForFunction(() => document.querySelector("[data-reader-views]")?.textContent === "조회 10");
  assert.equal(storyViewPosts, 1, "story opening counts once");
  assert.equal(episodeViewPosts, 1, "episode opening counts once");
  assert.equal(await storyPage.locator("[data-reader-login-wall]").count(), 0, "free reader has no login wall");
  await storyPage.locator(".episode-row").click();
  await storyPage.waitForFunction(() => document.querySelector("[data-reader-views]")?.textContent === "조회 11");
  assert.equal(episodeViewPosts, 2, "reopening an episode counts again");
  await storyPage.close();

  const webtoonPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await installSignedOutSupabase(webtoonPage);
  await webtoonPage.route("https://cdn.jsdelivr.net/**", (route) => route.abort());
  let webtoonViewPosts = 0;
  await webtoonPage.route(`${apiHost}/**`, (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const json = (body) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    if (request.method() === "GET" && path === "/api/webtoon/projects/public/latest") {
      return json({ project: {
        id: "public-view-webtoon", remoteId: "public-view-webtoon", title: "공개 웹툰 테스트",
        idea: "조회수 테스트", genre: "modern-awakening", status: "published", isPublic: true,
        viewCount: 21, panelCount: 0, panels: [], publishLocales: ["ko"]
      } });
    }
    if (request.method() === "POST" && path === "/api/webtoon/projects/public-view-webtoon/view") {
      assert.equal(request.headers().authorization, undefined, "guest webtoon view has no bearer token");
      webtoonViewPosts += 1;
      return json({ projectId: "public-view-webtoon", viewCount: 22, counted: true });
    }
    return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "not_found" }) });
  });

  await webtoonPage.goto(`${root}/webtoon/reader/`, { waitUntil: "networkidle" });
  await webtoonPage.getByText("공개 웹툰 테스트").first().waitFor({ state: "visible" });
  await webtoonPage.waitForFunction(() => document.querySelector("#readerViews")?.textContent === "22");
  assert.equal(webtoonViewPosts, 1, "public webtoon opening counts once");
  assert.equal(await webtoonPage.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "desktop reader has no horizontal overflow");
  await webtoonPage.screenshot({ path: "test-results/public-webtoon-view-count.png", fullPage: true });
  await webtoonPage.setViewportSize({ width: 390, height: 844 });
  await webtoonPage.reload({ waitUntil: "networkidle" });
  await webtoonPage.waitForFunction(() => document.querySelector("#readerViews")?.textContent === "22");
  assert.equal(webtoonViewPosts, 2, "a repeated page visit counts again");
  assert.equal(await webtoonPage.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "mobile reader has no horizontal overflow");
  await webtoonPage.screenshot({ path: "test-results/public-webtoon-view-count-mobile.png", fullPage: true });
  await webtoonPage.close();

  console.log("Public reading and view-count checks passed");
} finally {
  await browser.close();
}
