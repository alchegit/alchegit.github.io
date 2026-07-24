import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl = process.env.STORYHEAVEN_TEST_URL || "http://127.0.0.1:4173/storyheaven/";
const browser = await chromium.launch({ headless: true });

try {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 1000, expectedColumns: 3 },
    { name: "mobile", width: 390, height: 844, expectedColumns: 1 }
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
    assert.equal(await cards.count(), 6, viewport.name + " seed count");

    for (let index = 0; index < await cards.count(); index += 1) {
      await cards.nth(index).scrollIntoViewIfNeeded();
    }
    await page.waitForFunction(() => [...document.querySelectorAll(".seed-section img")].every((image) => image.complete));

    const metrics = await page.evaluate(() => {
      const first = document.querySelector(".seed-section .story-card");
      const second = first?.nextElementSibling;
      return {
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        columns: first && second && Math.abs(first.getBoundingClientRect().top - second.getBoundingClientRect().top) < 4 ? 3 : 1,
        brokenImages: [...document.querySelectorAll(".seed-section img")]
          .filter((image) => image.naturalWidth === 0)
          .map((image) => image.src),
        hasAiDisclosure: [...document.querySelectorAll(".origin-badge")]
          .every((badge) => badge.textContent.includes("AI 시드 스토리"))
      };
    });

    assert.equal(metrics.documentWidth, metrics.viewportWidth, viewport.name + " horizontal overflow");
    assert.equal(metrics.columns, viewport.expectedColumns, viewport.name + " grid columns");
    assert.deepEqual(metrics.brokenImages, [], viewport.name + " image loading");
    assert.equal(metrics.hasAiDisclosure, true, viewport.name + " AI disclosure");
    assert.deepEqual(pageErrors, [], viewport.name + " page errors");
    await page.close();
  }
  console.log("StoryHeaven browser checks passed");
} finally {
  await browser.close();
}
