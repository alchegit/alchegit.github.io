import assert from "node:assert/strict";
import { chromium } from "playwright";

const root = process.env.STORYHEAVEN_TEST_ROOT || "http://127.0.0.1:4173";
const apiPattern = "https://harvard-museum-nails-mission.trycloudflare.com/**";
const browser = await chromium.launch({ headless: true });

async function blockRemote(page) {
  await page.route("https://cdn.jsdelivr.net/**", (route) => route.abort());
  await page.route(apiPattern, (route) => route.fulfill({
    status: 503,
    contentType: "application/json",
    body: JSON.stringify({ error: "test_offline" })
  }));
}

try {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000 },
    { name: "mobile", width: 390, height: 844 }
  ]) {
    const guest = await browser.newPage({ viewport });
    const errors = [];
    guest.on("pageerror", (error) => errors.push(error.message));
    await blockRemote(guest);
    await guest.goto(`${root}/storyheaven/story/?id=seed-last-platform`, { waitUntil: "networkidle" });
    await guest.locator("[data-read-first]").click();
    await guest.locator("[data-reader-body] p").first().waitFor({ state: "visible" });
    const guestState = await guest.evaluate(() => ({
      title: document.querySelector("[data-title]")?.textContent,
      paragraphs: document.querySelectorAll("[data-reader-body] p").length,
      previewCharacters: document.querySelector("[data-reader-body]")?.textContent.length,
      loginWallCount: document.querySelectorAll("[data-reader-login-wall]").length,
      hasEnding: document.querySelector("[data-reader-body]")?.textContent.includes("시간을 견딜 수 있는 자"),
      overflow: document.documentElement.scrollWidth > innerWidth
    }));
    assert.equal(guestState.title, "8초를 싣는 막차", `${viewport.name} serial title`);
    assert.ok(guestState.paragraphs >= 20, `${viewport.name} full manuscript paragraphs`);
    assert.ok(guestState.previewCharacters >= 4000, `${viewport.name} full manuscript length`);
    assert.equal(guestState.loginWallCount, 0, `${viewport.name} has no login reading wall`);
    assert.equal(guestState.hasEnding, true, `${viewport.name} guest can read the ending`);
    assert.equal(guestState.overflow, false, `${viewport.name} no horizontal overflow`);
    assert.deepEqual(errors, [], `${viewport.name} guest page errors`);
    await guest.screenshot({ path: `test-results/storyheaven-serial-${viewport.name}.png`, fullPage: true });
    await guest.close();

    const member = await browser.newPage({ viewport });
    await member.addInitScript(() => {
      const session = { access_token: "serial-test-token", user: { id: "serial-reader" } };
      window.supabase = {
        createClient: () => ({ auth: {
          getSession: async () => ({ data: { session } }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
          signInWithOAuth: async () => ({}),
          signOut: async () => ({})
        } })
      };
    });
    await blockRemote(member);
    await member.goto(`${root}/storyheaven/story/?id=seed-last-platform`, { waitUntil: "networkidle" });
    await member.locator("[data-read-first]").click();
    await member.locator("[data-reader-body] p").first().waitFor({ state: "visible" });
    assert.equal(await member.locator("[data-reader-login-wall]").count(), 0, `${viewport.name} member has no login reading wall`);
    assert.equal(await member.locator("[data-reader-body]").textContent().then((text) => text.includes("시간을 견딜 수 있는 자")), true, `${viewport.name} member ending`);
    await member.close();
  }

  const safetyPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await safetyPage.addInitScript(() => {
    const session = { access_token: "safety-token", user: { id: "safety-reader" } };
    window.supabase = { createClient: () => ({ auth: {
      getSession: async () => ({ data: { session } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithOAuth: async () => ({}),
      signOut: async () => ({})
    } }) };
  });
  await safetyPage.route("https://cdn.jsdelivr.net/**", (route) => route.abort());
  await safetyPage.route(apiPattern, (route) => {
    const path = new URL(route.request().url()).pathname;
    const json = (body) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    if (path === "/api/storyheaven/profile") return json({ profile: { nickname: "안전독자", nicknameStatus: "active" } });
    if (path === "/api/storyheaven/stories/safety-story") return json({ story: { id: "safety-story", title: "<img src=x onerror=window.pwned=1>", logline: "표시 안전성 확인", synopsis: "문자열은 실행되지 않아야 합니다.", genre: "미스터리", contentOrigin: "human", contentRating: "all", author: { nickname: "<script>window.pwned=1</script>" }, likeCount: 0 } });
    if (path === "/api/storyheaven/stories/safety-story/episodes") return json({ episodes: [{ id: "safe-1", episodeNo: 1, title: "안전 회차", summary: "안전 검사", estimatedReadMinutes: 1 }] });
    if (path === "/api/storyheaven/stories/safety-story/episodes/1") return json({ episode: { id: "safe-1", episodeNo: 1, title: "안전 회차", body: "<script>window.pwned=1</script>\n\n이 문자열은 글로만 보여야 합니다.", totalCharacters: 48, estimatedReadMinutes: 1, guestPreview: false, loginRequired: false, reactions: {} } });
    return route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "not_found" }) });
  });
  await safetyPage.goto(`${root}/storyheaven/story/?id=safety-story`, { waitUntil: "networkidle" });
  await safetyPage.locator("[data-read-first]").click();
  await safetyPage.getByText("이 문자열은 글로만 보여야 합니다.").waitFor({ state: "visible" });
  assert.equal(await safetyPage.evaluate(() => window.pwned), undefined, "reader never executes submitted markup");
  assert.ok((await safetyPage.locator("[data-reader-body]").textContent()).includes("<script>"), "submitted markup remains visible as text");
  await safetyPage.close();

  console.log("StoryHeaven serial reader checks passed");
} finally {
  await browser.close();
}
