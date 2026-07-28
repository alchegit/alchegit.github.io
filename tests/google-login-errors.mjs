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

  const webtoonPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await installDisabledProvider(webtoonPage);
  await webtoonPage.goto(`${root}/webtoon/`, { waitUntil: "networkidle" });
  await webtoonPage.locator("[data-auth-action='login']").click();
  await webtoonPage.getByText("Google 로그인이 아직 인증 서버에서 활성화되지 않았습니다.").waitFor({ state: "visible" });
  assert.equal(await webtoonPage.evaluate(() => window.__oauthRedirectTo), `${root}/webtoon/`, "Webtoon uses a stable callback URL");
  await webtoonPage.close();

  console.log("Google login error handling checks passed");
} finally {
  await browser.close();
}
