import assert from "node:assert/strict";
import { chromium } from "playwright";

const root = process.env.LOGIN_TEST_ROOT || "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });

async function installDisabledProvider(page) {
  await page.addInitScript(() => {
    window.supabase = {
      createClient: () => ({ auth: {
        getSession: async () => ({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        signInWithOAuth: async ({ options }) => {
          window.__oauthRedirectTo = options.redirectTo;
          return { data: null, error: { code: "validation_failed", message: "Unsupported provider: provider is not enabled" } };
        },
        signOut: async () => ({})
      } })
    };
  });
  await page.route("https://cdn.jsdelivr.net/**", (route) => route.abort());
  await page.route("https://harvard-museum-nails-mission.trycloudflare.com/**", (route) => route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({ error: "test_offline" })
  }));
}

async function installAuthenticatedSession(page) {
  const session = {
    access_token: "test-access-token",
    user: {
      id: "google-admin-test",
      email: "admin@example.com",
      app_metadata: { provider: "google" }
    }
  };
  await page.addInitScript((mockSession) => {
    window.supabase = {
      createClient: () => ({ auth: {
        getSession: async () => ({ data: { session: mockSession } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        signInWithOAuth: async () => ({ data: null, error: null }),
        signOut: async () => ({})
      } })
    };
  }, session);
  await page.route("https://cdn.jsdelivr.net/**", (route) => route.abort());
  await page.route("https://harvard-museum-nails-mission.trycloudflare.com/**", (route) => route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({ error: "test_profile_offline" })
  }));
}

async function installRecoveringSession(page, platform) {
  const session = {
    access_token: `test-${platform}-rate-limit-token`,
    user: {
      id: `google-admin-${platform}`,
      email: "admin@example.com",
      app_metadata: { provider: "google" }
    }
  };
  let profileAttempts = 0;
  await page.addInitScript((mockSession) => {
    window.supabase = {
      createClient: () => ({ auth: {
        getSession: async () => ({ data: { session: mockSession } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        signInWithOAuth: async () => ({ data: null, error: null }),
        signOut: async () => ({})
      } })
    };
  }, session);
  await page.route("https://cdn.jsdelivr.net/**", (route) => route.abort());
  await page.route("https://harvard-museum-nails-mission.trycloudflare.com/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/profile")) {
      profileAttempts += 1;
      if (profileAttempts === 1) {
        route.fulfill({
          status: 429,
          headers: { "Retry-After": "1" },
          contentType: "application/json",
          body: JSON.stringify({ error: "rate_limited", retryAfterSeconds: 1 })
        });
        return;
      }
      const profile = {
        id: session.user.id,
        displayName: "Neo Kim",
        nickname: "Neo Kim",
        nicknameStatus: "active",
        isAdmin: true,
        acorns: 999,
        canCreate: true
      };
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(platform === "storyheaven" ? { profile } : profile)
      });
      return;
    }
    const body = path.endsWith("/feed")
      ? { stories: [] }
      : path.endsWith("/discovery")
        ? { genres: [], rankings: {} }
        : path.endsWith("/rounds/current")
          ? { round: null }
          : {};
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
  return () => profileAttempts;
}

try {
  const storyPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await installDisabledProvider(storyPage);
  await storyPage.goto(`${root}/storyheaven/`, { waitUntil: "networkidle" });
  await storyPage.locator("[data-login]").click();
  await storyPage.getByText("Google 로그인이 아직 인증 서버에서 활성화되지 않았습니다.").waitFor({ state: "visible" });
  assert.equal(await storyPage.evaluate(() => window.__oauthRedirectTo), `${root}/storyheaven/`, "StoryHeaven uses a stable callback URL");
  await storyPage.close();

  const authenticatedStoryPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await installAuthenticatedSession(authenticatedStoryPage);
  await authenticatedStoryPage.goto(`${root}/storyheaven/`, { waitUntil: "networkidle" });
  assert.equal(await authenticatedStoryPage.locator("[data-login]").evaluate((element) => element.hidden), true);
  assert.equal(await authenticatedStoryPage.locator("[data-login]").evaluate((element) => getComputedStyle(element).display), "none");
  assert.equal(await authenticatedStoryPage.locator("[data-logout]").evaluate((element) => element.hidden), false);
  assert.equal(await authenticatedStoryPage.locator("[data-nickname-button]").evaluate((element) => element.hidden), false);
  await authenticatedStoryPage.close();

  const recoveringStoryPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const storyProfileAttempts = await installRecoveringSession(recoveringStoryPage, "storyheaven");
  await recoveringStoryPage.goto(`${root}/storyheaven/`, { waitUntil: "domcontentloaded" });
  await recoveringStoryPage.getByText("Google 로그인은 완료되었습니다. 계정 정보 확인이 제한되어 1초 후 자동으로 다시 확인합니다.").waitFor({ state: "visible" });
  assert.equal(await recoveringStoryPage.locator("[data-login]").evaluate((element) => element.hidden), true, "StoryHeaven keeps the successful login session");
  assert.equal(await recoveringStoryPage.locator("[data-logout]").evaluate((element) => element.hidden), false, "StoryHeaven leaves logout available while retrying");
  await recoveringStoryPage.waitForFunction(() => document.querySelector("[data-nickname-button]")?.textContent === "Neo Kim");
  assert.equal(storyProfileAttempts(), 2, "StoryHeaven automatically retries the profile once");
  await recoveringStoryPage.close();

  const webtoonPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await installDisabledProvider(webtoonPage);
  await webtoonPage.goto(`${root}/webtoon/`, { waitUntil: "networkidle" });
  await webtoonPage.locator("[data-auth-action='login']").click();
  await webtoonPage.getByText("Google 로그인이 아직 인증 서버에서 활성화되지 않았습니다.").waitFor({ state: "visible" });
  assert.equal(await webtoonPage.evaluate(() => window.__oauthRedirectTo), `${root}/webtoon/`, "Webtoon uses a stable callback URL");
  await webtoonPage.close();

  const recoveringWebtoonPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const webtoonProfileAttempts = await installRecoveringSession(recoveringWebtoonPage, "webtoon");
  await recoveringWebtoonPage.goto(`${root}/webtoon/`, { waitUntil: "domcontentloaded" });
  await recoveringWebtoonPage.getByText("Google 로그인은 완료되었습니다. 계정 정보 확인이 제한되어 1초 후 자동으로 다시 확인합니다.").waitFor({ state: "visible" });
  assert.equal(await recoveringWebtoonPage.locator("[data-account-name]").textContent(), "로그인 완료 · 계정 확인 대기");
  assert.equal(await recoveringWebtoonPage.locator("[data-auth-action='login']").evaluate((element) => element.hidden), true, "Webtoon keeps the successful login session");
  assert.equal(await recoveringWebtoonPage.locator("[data-auth-action='logout']").evaluate((element) => element.hidden), false, "Webtoon leaves logout available while retrying");
  await recoveringWebtoonPage.waitForFunction(() => document.querySelector("[data-account-name]")?.textContent === "Neo Kim · 관리자");
  assert.equal(webtoonProfileAttempts(), 2, "Webtoon deduplicates auth events and automatically retries the profile once");
  await recoveringWebtoonPage.close();

  console.log("Google login error handling checks passed");
} finally {
  await browser.close();
}
