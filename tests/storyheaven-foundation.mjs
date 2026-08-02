import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.STORYHEAVEN_TEST_URL || "http://127.0.0.1:4173/storyheaven/";
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000, expectedColumns: 6 },
    { name: "mobile", width: 390, height: 844, expectedColumns: 2 }
  ]) {
    const page = await browser.newPage({ viewport });
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.route("https://harvard-museum-nails-mission.trycloudflare.com/**", (route) => {
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ error: "test_offline" })
      });
    });

    await page.goto(baseUrl, { waitUntil: "networkidle" });
    const cards = page.locator(".seed-section .story-card");
    await cards.first().waitFor({ state: "visible" });
    assert.ok((await cards.count()) >= 6, viewport.name + " curated serial count");

    for (let index = 0; index < await cards.count(); index += 1) {
      await cards.nth(index).scrollIntoViewIfNeeded();
    }
    await page.waitForFunction(() => [...document.querySelectorAll(".seed-section img")].every((image) => image.complete));

    const metrics = await page.evaluate(() => {
      const first = document.querySelector(".seed-section .story-card");
      const grid = document.querySelector(".seed-section .story-grid");
      return {
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        columns: grid ? getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length : 0,
        brokenImages: [...document.querySelectorAll(".seed-section img")]
          .filter((image) => image.naturalWidth === 0)
          .map((image) => image.src),
        hasEditorialLabels: [...document.querySelectorAll(".seed-section .origin-badge")]
          .every((badge) => badge.textContent.trim() === "편집부 연재"),
        hasAiDisclosure: document.querySelector(".seed-section").textContent.includes("AI")
      };
    });

    assert.equal(metrics.documentWidth, metrics.viewportWidth, viewport.name + " horizontal overflow");
    assert.equal(metrics.columns, viewport.expectedColumns, viewport.name + " grid columns");
    assert.deepEqual(metrics.brokenImages, [], viewport.name + " image loading");
    assert.equal(metrics.hasEditorialLabels, true, viewport.name + " editorial labels");
    assert.equal(metrics.hasAiDisclosure, false, viewport.name + " public AI disclosure");
    assert.equal(await page.locator('.main-nav a[href^="/webtoon/"]').count(), 0, viewport.name + " guest webtoon navigation hidden");
    assert.match(await page.locator("#introTitle").textContent(), /다음 화로/u, viewport.name + " continuation-first headline");
    assert.match(await page.locator("#continuation").textContent(), /추천으로 알려주세요/u, viewport.name + " recommendation continuation copy");
    assert.equal((await page.locator("main").textContent()).includes("웹툰"), false, viewport.name + " no unfinished webtoon promotion");
    assert.deepEqual(pageErrors, [], viewport.name + " page errors");
    await page.close();
  }
  console.log("StoryHeaven browser checks passed");
} finally {
  await browser.close();
}
