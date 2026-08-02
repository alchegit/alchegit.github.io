import assert from "node:assert/strict";
import { chromium } from "playwright";

const root = process.env.STORYHEAVEN_TEST_ROOT || "http://127.0.0.1:4173";
const apiPattern = "https://harvard-museum-nails-mission.trycloudflare.com/**";
const browser = await chromium.launch({ headless: true });

try {
  for (const isAdmin of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(({ admin }) => {
      const session = admin ? { access_token: "platform-admin-token", user: { id: "platform-admin", email: "admin@example.com" } } : null;
      window.supabase = { createClient: () => ({ auth: {
        getSession: async () => ({ data: { session } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        signInWithOAuth: async () => ({}),
        signOut: async () => ({})
      } }) };
    }, { admin: isAdmin });
    await page.route("https://cdn.jsdelivr.net/**", (route) => route.abort());
    await page.route(apiPattern, (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/storyheaven/profile") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ profile: { nickname: "운영자", isAdmin } }) });
      }
      if (path === "/api/webtoon/profile") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ displayName: "운영자", isAdmin, canCreate: isAdmin, acorns: 0 }) });
      }
      if (path === "/api/storyheaven/feed") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ stories: [] }) });
      }
      if (path === "/api/storyheaven/discovery") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ genres: [], periods: {} }) });
      }
      if (path === "/api/storyheaven/rounds/current") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ round: null }) });
      }
      return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "not_found" }) });
    });

    await page.goto(`${root}/storyheaven/`, { waitUntil: "networkidle" });
    const storyheavenSwitch = page.locator('.main-nav a[href="/webtoon/"]');
    assert.equal(await storyheavenSwitch.count(), isAdmin ? 1 : 0, `${isAdmin ? "admin" : "guest"} StoryHeaven switch visibility`);
    if (isAdmin) assert.ok(await storyheavenSwitch.isVisible(), "admin StoryHeaven switch is visible");

    await page.goto(`${root}/webtoon/`, { waitUntil: "networkidle" });
    const webtoonSwitch = page.locator('.landing-nav a[href="/storyheaven/"]');
    assert.equal(await webtoonSwitch.count(), 1, `${isAdmin ? "admin" : "guest"} webtoon switch exists`);
    assert.equal(await webtoonSwitch.isVisible(), isAdmin, `${isAdmin ? "admin" : "guest"} webtoon switch visibility`);
    assert.deepEqual(errors, [], `${isAdmin ? "admin" : "guest"} platform page errors`);
    await context.close();
  }
  console.log("StoryHeaven operator-only platform switching checks passed");
} finally {
  await browser.close();
}
