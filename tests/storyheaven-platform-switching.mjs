import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

const root = process.env.STORYHEAVEN_TEST_ROOT || "http://127.0.0.1:4173";
const apiPattern = "https://harvard-museum-nails-mission.trycloudflare.com/**";
const browser = await chromium.launch({ headless: true });
const storyBase = [
  ["/storyheaven/", "연재"],
  ["/storyheaven/write/", "투고"],
  ["/storyheaven/my/", "내 이야기"]
];
const storyAdmin = [
  ["/storyheaven/operator/", "운영 검수"],
  ["/storyheaven/operator/serial/", "자동 연재"],
  ["/storyheaven/operator/serial/stories/", "작품 관리"],
  ["/", "앱 홈"],
  ["/webtoon/", "웹툰"],
  ["/operator/members/", "회원 관리"]
];
const webtoonBase = [
  ["/webtoon/", "소개"],
  ["/webtoon/studio/", "작업대"],
  ["/webtoon/guide/", "가이드"],
  ["/webtoon/templates/", "템플릿"],
  ["/webtoon/reader/", "감상"]
];
const webtoonAdmin = [
  ["/", "앱 홈"],
  ["/storyheaven/", "스토리천국"],
  ["/operator/members/", "회원 관리"],
  ["/webtoon/plan/", "설계"]
];

await assertStaticNavigation();

try {
  for (const role of [
    { name: "guest", signedIn: false, isAdmin: false },
    { name: "member", signedIn: true, isAdmin: false },
    { name: "admin", signedIn: true, isAdmin: true }
  ]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(({ signedIn, isAdmin }) => {
      const session = signedIn
        ? { access_token: `${isAdmin ? "admin" : "member"}-token`, user: { id: `${isAdmin ? "admin" : "member"}-id`, email: `${isAdmin ? "admin" : "member"}@example.com` } }
        : null;
      window.supabase = { createClient: () => ({ auth: {
        getSession: async () => ({ data: { session } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        signInWithOAuth: async () => ({}),
        signOut: async () => ({})
      } }) };
    }, role);
    await page.route("https://cdn.jsdelivr.net/**", (route) => route.abort());
    await page.route(apiPattern, (route) => fulfillApi(route, role));

    await page.goto(`${root}/`, { waitUntil: "networkidle" });
    assert.equal(await page.locator('.terminal-actions a[href="/storyheaven/"]').isVisible(), true, `${role.name} can open StoryHeaven from app home`);
    assert.equal(await page.locator('.terminal-actions a[href="/webtoon/"]').isVisible(), role.isAdmin, `${role.name} app-home Webtoon visibility`);
    assert.equal(await page.locator('.terminal-actions a[href="/operator/members/"]').isVisible(), role.isAdmin, `${role.name} app-home member-admin visibility`);
    assert.equal(await page.locator('.hero-actions a[href="/webtoon/"]').isVisible(), role.isAdmin, `${role.name} app-home Webtoon feature visibility`);
    if (role.isAdmin) await page.screenshot({ path: "test-results/platform-home-admin-desktop.png" });

    await page.goto(`${root}/storyheaven/`, { waitUntil: "networkidle" });
    await assertMenu(page, ".main-nav", storyBase, storyAdmin, role);
    if (role.isAdmin) await page.screenshot({ path: "test-results/storyheaven-admin-desktop-nav.png" });

    await page.goto(`${root}/storyheaven/operator/`, { waitUntil: "networkidle" });
    await assertMenu(page, ".main-nav", storyBase, storyAdmin, role);
    assert.equal(await page.locator('.main-nav a[href="/storyheaven/operator/"][aria-current="page"]').count(), role.isAdmin ? 1 : 0, `${role.name} StoryHeaven active operator menu`);

    await page.goto(`${root}/webtoon/`, { waitUntil: "networkidle" });
    await assertMenu(page, ".landing-nav", webtoonBase, webtoonAdmin, role);
    if (role.isAdmin) await page.screenshot({ path: "test-results/webtoon-admin-desktop-nav.png" });

    await page.goto(`${root}/webtoon/guide/`, { waitUntil: "networkidle" });
    await assertMenu(page, ".topbar-nav", webtoonBase, webtoonAdmin, role);

    await page.goto(`${root}/operator/members/`, { waitUntil: "networkidle" });
    assert.equal(await page.locator("[data-admin-console]").isVisible(), role.isAdmin, `${role.name} member console access`);
    assert.equal(await page.locator("[data-admin-locked]").isVisible(), !role.isAdmin, `${role.name} member access gate`);
    for (const [href] of webtoonAdmin.slice(0, 3)) {
      assert.equal(await page.locator(`.member-platform-nav a[href="${href}"]`).isVisible(), role.isAdmin, `${role.name} member platform link ${href}`);
    }
    assert.ok(await page.locator("[data-member-back]").isVisible(), `${role.name} member back action`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 1280, `${role.name} member desktop has no horizontal overflow`);
    if (role.isAdmin) await page.screenshot({ path: "test-results/member-admin-desktop.png" });

    if (role.isAdmin) {
      await page.setViewportSize({ width: 390, height: 844 });
      for (const [path, screenshot] of [
        ["/", "platform-home-admin-mobile.png"],
        ["/storyheaven/", "storyheaven-admin-mobile-nav.png"],
        ["/webtoon/", "webtoon-admin-mobile-nav.png"],
        ["/operator/members/", "member-admin-mobile.png"]
      ]) {
        await page.goto(`${root}${path}`, { waitUntil: "networkidle" });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390, `admin ${path} mobile has no page overflow`);
        await page.screenshot({ path: `test-results/${screenshot}`, fullPage: true });
      }
    }
    assert.deepEqual(errors, [], `${role.name} platform page errors`);
    await context.close();
  }
  console.log("StoryHeaven and Webtoon role-aware navigation checks passed");
} finally {
  await browser.close();
}

async function assertMenu(page, selector, baseItems, adminItems, role) {
  const baseActual = await page.locator(`${selector} > a:not([data-admin-only]):not([data-storyheaven-admin-nav])`).evaluateAll((links) => links.map((link) => [new URL(link.href).pathname, link.textContent.trim()]));
  assert.deepEqual(baseActual, baseItems, `${role.name} ${selector} base navigation`);
  const adminLocator = page.locator(`${selector} > a[data-admin-only], ${selector} > a[data-storyheaven-admin-nav]`);
  assert.equal(await adminLocator.count(), role.isAdmin ? adminItems.length : selector === ".main-nav" ? 0 : adminItems.length, `${role.name} ${selector} admin navigation count`);
  if (!role.isAdmin) {
    for (const link of await adminLocator.all()) assert.equal(await link.isVisible(), false, `${role.name} ${selector} admin link hidden`);
    return;
  }
  const adminActual = await adminLocator.evaluateAll((links) => links.map((link) => [new URL(link.href).pathname, link.textContent.trim()]));
  assert.deepEqual(adminActual, adminItems, `${role.name} ${selector} admin navigation`);
  for (const link of await adminLocator.all()) assert.equal(await link.isVisible(), true, `${role.name} ${selector} admin link visible`);
}

async function fulfillApi(route, role) {
  const path = new URL(route.request().url()).pathname;
  if (path === "/api/storyheaven/profile") {
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ profile: { nickname: role.isAdmin ? "운영자" : "일반 회원", isAdmin: role.isAdmin } }) });
  }
  if (path === "/api/webtoon/profile") {
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ displayName: role.isAdmin ? "운영자" : "일반 회원", isAdmin: role.isAdmin, canCreate: role.isAdmin, acorns: 0 }) });
  }
  if (path === "/api/admin/users") {
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ users: [] }) });
  }
  if (path === "/api/admin/security/events") {
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ events: [], retentionDays: 30, rawIpStored: false }) });
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
}

async function assertStaticNavigation() {
  const storyFiles = [
    "storyheaven/index.html",
    "storyheaven/write/index.html",
    "storyheaven/my/index.html",
    "storyheaven/story/index.html",
    "storyheaven/operator/index.html",
    "storyheaven/operator/serial/index.html",
    "storyheaven/operator/serial/stories/index.html"
  ];
  for (const file of storyFiles) {
    const html = await readFile(file, "utf8");
    assert.deepEqual(extractStaticMenu(html, "main-nav"), storyBase, `${file} static reader menu`);
  }

  const webtoonFiles = [
    "webtoon/index.html",
    "webtoon/guide/index.html",
    "webtoon/plan/index.html",
    "webtoon/privacy/index.html",
    "webtoon/reader/index.html",
    "webtoon/studio/index.html",
    "webtoon/templates/index.html"
  ];
  for (const file of webtoonFiles) {
    const html = await readFile(file, "utf8");
    const menu = extractStaticMenu(html, file === "webtoon/index.html" ? "landing-nav" : "topbar-nav");
    assert.deepEqual(menu, [...webtoonBase, ...webtoonAdmin], `${file} static Webtoon menu`);
  }
}

function extractStaticMenu(html, className) {
  const nav = html.match(new RegExp(`<nav[^>]*class="[^"]*${className}[^"]*"[^>]*>([\\s\\S]*?)<\\/nav>`))?.[1] || "";
  return [...nav.matchAll(/<a\s+([^>]*?)>([\s\S]*?)<\/a>/gu)].map((match) => {
    const href = match[1].match(/href="([^"]+)"/u)?.[1] || "";
    const label = match[2].replace(/<[^>]+>/gu, "").trim();
    return [href, label];
  });
}
