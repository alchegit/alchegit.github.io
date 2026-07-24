import { chromium } from "playwright";

const baseUrl = process.env.WEBTOON_TEST_URL || "http://127.0.0.1:4173";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const browserErrors = [];
const phases = [];
let draftVisualAudit = null;
let finalVisualAudit = null;

page.on("pageerror", (error) => browserErrors.push(`page: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") browserErrors.push(`console: ${message.text()}`);
});

async function measure(name, action, complete) {
  const startedAt = performance.now();
  await action();
  await complete();
  phases.push({ name, durationMs: Math.round(performance.now() - startedAt) });
}

async function snapshot() {
  return page.evaluate(() => window.NeoKIMGuideTest?.snapshot());
}

async function auditVisualStage(expectedStage) {
  return page.evaluate(async (stage) => {
    const state = window.NeoKIMGuideTest?.snapshot();
    const panels = Array.from(document.querySelectorAll(".guide-panel"));
    const images = await Promise.all(state.panelImages.slice(0, 6).map((panel) => new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve({ src: panel.current, width: image.naturalWidth, height: image.naturalHeight, broken: false });
      image.onerror = () => resolve({ src: panel.current, width: 0, height: 0, broken: true });
      image.src = panel.current;
    })));
    return {
      templateVersion: state.templateVersion,
      stage: state.renderStage,
      panelStages: panels.slice(0, 6).map((panel) => panel.dataset.renderStage),
      sources: state.panelImages.slice(0, 6).map((panel) => panel.current),
      pairs: state.panelImages.slice(0, 6).map((panel) => ({
        id: panel.id,
        draft: panel.draft[0],
        final: panel.final[0],
        realityChecks: panel.realityChecks
      })),
      images,
      expectedStage: stage
    };
  }, expectedStage);
}

async function auditOverlayControls() {
  const panel = page.locator(".guide-panel[data-panel-id='p5']");
  const bubble = panel.locator(".guide-bubble");
  const resizeCorner = bubble.locator("[data-guide-resize-corner='se']");
  await bubble.scrollIntoViewIfNeeded();

  const beforeMove = await bubble.boundingBox();
  const moveProbe = await bubble.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const candidates = [
      [rect.left + rect.width / 2, rect.bottom - 10],
      [rect.left + 10, rect.top + rect.height / 2],
      [rect.right - 10, rect.top + rect.height / 2],
      [rect.left + rect.width * 0.25, rect.bottom - 10],
      [rect.left + rect.width * 0.75, rect.bottom - 10]
    ];
    const point = candidates.find(([x, y]) => document.elementFromPoint(x, y) === element);
    return {
      point: point ? { x: point[0], y: point[1] } : null,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      hits: candidates.map(([x, y]) => {
        const hit = document.elementFromPoint(x, y);
        return `${hit?.tagName || "none"}.${hit?.className || ""}`;
      })
    };
  });
  const movePoint = moveProbe.point;
  if (!beforeMove || !movePoint) throw new Error(`말풍선의 드래그 가능한 여백을 찾을 수 없습니다: ${JSON.stringify(moveProbe)}`);
  const moveX = movePoint.x;
  const moveY = movePoint.y;
  await page.mouse.move(moveX, moveY);
  await page.mouse.down();
  await page.mouse.move(moveX + 1, moveY + 1);
  const afterTinyMove = await bubble.boundingBox();
  await page.mouse.move(moveX - 31, moveY + 23, { steps: 4 });
  await page.mouse.up();
  const afterMove = await bubble.boundingBox();

  const beforeResize = await bubble.boundingBox();
  const resizeBox = await resizeCorner.boundingBox();
  if (!afterTinyMove || !afterMove || !beforeResize || !resizeBox) throw new Error("말풍선 이동 상태를 측정할 수 없습니다.");
  const resizeX = resizeBox.x + resizeBox.width / 2;
  const resizeY = resizeBox.y + resizeBox.height / 2;
  await page.mouse.move(resizeX, resizeY);
  await page.mouse.down();
  await page.mouse.move(resizeX + 42, resizeY + 34, { steps: 4 });
  await page.mouse.up();
  const afterResize = await bubble.boundingBox();
  if (!afterResize) throw new Error("말풍선 크기 조절 상태를 측정할 수 없습니다.");

  await page.selectOption("#guideLetteringFont", "serif");
  await page.locator("#guideLetteringSize").fill("125");
  await page.click("#guideLetteringBold");
  await page.click("[data-guide-letter-color='#4ee0b5']");

  const controls = await panel.evaluate((element) => ({
    visibleHandleCount: element.querySelectorAll(".guide-overlay-handle, .guide-resize-handle").length,
    resizeCornerCount: element.querySelectorAll("[data-guide-resize-corner]").length,
    resizeCursors: Array.from(element.querySelectorAll("[data-guide-resize-corner]")).map((corner) => getComputedStyle(corner).cursor),
    parts: Array.from(element.querySelectorAll(".guide-bubble, .guide-caption, .guide-sfx")).map((part) => ({
      part: part.dataset.part,
      width: getComputedStyle(part).width,
      height: getComputedStyle(part).height
    })),
    bubbleStyle: (() => {
      const target = element.querySelector(".guide-bubble");
      const style = getComputedStyle(target);
      return { color: style.color, fontFamily: style.fontFamily, fontSize: style.fontSize, fontWeight: style.fontWeight };
    })()
  }));
  const toolbarVisible = await page.locator("#guideLetteringToolbar").isVisible();

  return {
    noPointerJump: Math.abs(afterTinyMove.x - beforeMove.x) < 4 && Math.abs(afterTinyMove.y - beforeMove.y) < 4,
    movedFromGrabPoint: Math.abs(afterMove.x - beforeMove.x) > 20 && afterMove.y - beforeMove.y > 12,
    widthResized: afterResize.width - beforeResize.width > 24,
    heightResized: afterResize.height - beforeResize.height > 18,
    toolbarVisible,
    ...controls
  };
}

try {
  await page.goto(`${baseUrl}/webtoon/guide/`, { waitUntil: "networkidle" });

  await measure(
    "원고 입력과 진단",
    () => page.click("#startTourButton"),
    () => page.waitForFunction(() => window.NeoKIMGuideTest?.snapshot().decisions.length === 1)
  );

  await page.click("#nextTourButton");
  await measure(
    "6컷 시안 생성과 검토",
    () => page.click("#nextTourButton"),
    () => page.waitForFunction(() => window.NeoKIMGuideTest?.snapshot().generated === true)
  );
  draftVisualAudit = await auditVisualStage("draft");

  await page.click("#nextTourButton");
  await measure(
    "선택 시안 완성화와 안전 영역 검수",
    () => page.click("#nextTourButton"),
    () => page.waitForFunction(() => window.NeoKIMGuideTest?.snapshot().finalReady === true)
  );
  finalVisualAudit = await auditVisualStage("final");

  await page.click("#nextTourButton");
  await measure(
    "말풍선·나레이션·효과음 편집",
    () => page.click("#nextTourButton"),
    () => page.waitForFunction(() => window.NeoKIMGuideTest?.snapshot().completed.includes("lettering"))
  );
  const overlayAudit = await auditOverlayControls();
  if (process.env.WEBTOON_LETTERING_SCREENSHOT) {
    await page.screenshot({ path: process.env.WEBTOON_LETTERING_SCREENSHOT });
  }

  await page.click("#nextTourButton");
  await page.click("#nextTourButton");
  await page.selectOption("#guideCameraAngle", "bird-eye");
  await page.selectOption("#guideCharacterFacing", "front");
  await page.click("#nextTourButton");
  await page.waitForFunction(() => document.querySelector("#guideCostDialog")?.open === true);
  await measure(
    "도토리 안내 후 선택 컷 재연출",
    () => page.click("#confirmGuideRedrawButton"),
    () => page.waitForFunction(() => window.NeoKIMGuideTest?.snapshot().redrawCount === 1)
  );

  await page.waitForFunction(() => {
    const button = document.querySelector("#nextTourButton");
    return button && !button.disabled && button.textContent.includes("보관함");
  });
  await page.click("#nextTourButton");
  await measure(
    "보관 장면을 회상 컷으로 재사용",
    () => page.click("#nextTourButton"),
    () => page.waitForFunction(() => window.NeoKIMGuideTest?.snapshot().reusedFlashback === true)
  );
  await page.click("#nextTourButton");
  await page.waitForFunction(() => document.querySelector("#guideTour")?.hidden === true);

  const finalSnapshot = await snapshot();
  if (process.env.WEBTOON_SCENARIO_SCREENSHOT) {
    await page.screenshot({ path: process.env.WEBTOON_SCENARIO_SCREENSHOT, fullPage: true });
  }
  const desktopAudit = await page.evaluate(() => ({
    decisionCountText: document.querySelector("#guideDecisionCount")?.textContent.trim(),
    renderedPanels: document.querySelectorAll(".guide-panel").length,
    brokenImages: Array.from(document.images).filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.src),
    duplicateIds: Array.from(document.querySelectorAll("[id]")).map((node) => node.id).filter((id, index, ids) => ids.indexOf(id) !== index),
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${baseUrl}/webtoon/guide/`, { waitUntil: "networkidle" });
  const mobileAudit = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    decisionLogVisible: Boolean(document.querySelector("#guideDecisionLogSection")),
    actionOverflow: Array.from(document.querySelectorAll(".guide-decision-actions .tool-button")).some((button) => button.scrollWidth > button.clientWidth + 1)
  }));

  await page.click("#startTourButton");
  await page.waitForFunction(() => window.NeoKIMGuideTest?.snapshot().decisions.length === 1);
  await page.click("#nextTourButton");
  await page.click("#nextTourButton");
  await page.waitForFunction(() => window.NeoKIMGuideTest?.snapshot().generated === true);
  await page.click("#nextTourButton");
  await page.click("#nextTourButton");
  await page.waitForFunction(() => window.NeoKIMGuideTest?.snapshot().finalReady === true);
  await page.click("#nextTourButton");
  await page.click("#nextTourButton");
  await page.waitForFunction(() => window.NeoKIMGuideTest?.snapshot().completed.includes("lettering"));
  Object.assign(mobileAudit, await page.evaluate(() => {
    const toolbar = document.querySelector("#guideLetteringToolbar");
    const rect = toolbar?.getBoundingClientRect();
    return {
      letteringToolbarVisible: Boolean(toolbar && !toolbar.hidden && rect && rect.width > 0 && rect.height > 0),
      letteringToolbarRect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
      letteringStepClass: document.body.classList.contains("is-guide-lettering-step"),
      letteringToolbarPosition: toolbar ? getComputedStyle(toolbar).position : null
    };
  }));
  if (process.env.WEBTOON_LETTERING_MOBILE_SCREENSHOT) {
    await page.screenshot({ path: process.env.WEBTOON_LETTERING_MOBILE_SCREENSHOT });
  }
  await page.click("#nextTourButton");
  await page.click("#nextTourButton");
  await page.selectOption("#guideCameraAngle", "bird-eye");
  await page.selectOption("#guideCharacterFacing", "front");
  await page.click("#nextTourButton");
  await page.waitForFunction(() => document.querySelector("#guideCostDialog")?.open === true);
  await page.click("#confirmGuideRedrawButton");
  await page.waitForFunction(() => window.NeoKIMGuideTest?.snapshot().redrawCount === 1);
  await page.waitForFunction(() => {
    const button = document.querySelector("#nextTourButton");
    return button && !button.disabled && button.textContent.includes("보관함");
  });
  await page.click("#nextTourButton");
  await page.click("#nextTourButton");
  await page.waitForFunction(() => window.NeoKIMGuideTest?.snapshot().reusedFlashback === true);
  await page.click("#nextTourButton");
  await page.waitForFunction(() => document.querySelector("#guideTour")?.hidden === true);
  Object.assign(mobileAudit, await page.evaluate(() => ({
    completedSnapshot: window.NeoKIMGuideTest.snapshot(),
    completedScrollWidth: document.documentElement.scrollWidth,
    completedClientWidth: document.documentElement.clientWidth,
    completedDecisionCountText: document.querySelector("#guideDecisionCount")?.textContent.trim(),
    completedBrokenImages: Array.from(document.images).filter((image) => image.complete && image.naturalWidth === 0).length
  })));
  if (process.env.WEBTOON_SCENARIO_MOBILE_SCREENSHOT) {
    await page.screenshot({ path: process.env.WEBTOON_SCENARIO_MOBILE_SCREENSHOT, fullPage: true });
  }

  const passed = finalSnapshot.decisions.length === 6
    && draftVisualAudit.templateVersion === "awakening-subway-intro/v4"
    && draftVisualAudit.stage === "draft"
    && draftVisualAudit.panelStages.every((stage) => stage === "draft")
    && draftVisualAudit.sources.every((source) => source.includes("awakening-draft-"))
    && draftVisualAudit.images.every((image) => !image.broken && image.width > 0 && image.height > image.width)
    && finalVisualAudit.stage === "final"
    && finalVisualAudit.panelStages.every((stage) => stage === "final")
    && finalVisualAudit.sources.every((source) => !source.includes("awakening-draft-"))
    && finalVisualAudit.images.every((image) => !image.broken && image.width > 0 && image.height > image.width)
    && finalVisualAudit.pairs.every((pair) => pair.draft !== pair.final)
    && finalVisualAudit.pairs.every((pair) => pair.realityChecks.length === 3)
    && finalSnapshot.panelCount === 7
    && finalSnapshot.reusedFlashback
    && finalSnapshot.redrawCount === 1
    && desktopAudit.renderedPanels === 7
    && desktopAudit.brokenImages.length === 0
    && desktopAudit.duplicateIds.length === 0
    && desktopAudit.scrollWidth === desktopAudit.clientWidth
    && overlayAudit.noPointerJump
    && overlayAudit.movedFromGrabPoint
    && overlayAudit.widthResized
    && overlayAudit.heightResized
    && overlayAudit.visibleHandleCount === 0
    && overlayAudit.resizeCornerCount === 12
    && overlayAudit.resizeCursors.includes("nwse-resize")
    && overlayAudit.resizeCursors.includes("nesw-resize")
    && overlayAudit.toolbarVisible
    && overlayAudit.bubbleStyle.color === "rgb(78, 224, 181)"
    && Number.parseFloat(overlayAudit.bubbleStyle.fontSize) > 19
    && Number.parseInt(overlayAudit.bubbleStyle.fontWeight, 10) === 600
    && mobileAudit.scrollWidth === mobileAudit.clientWidth
    && mobileAudit.decisionLogVisible
    && !mobileAudit.actionOverflow
    && mobileAudit.completedSnapshot.decisions.length === 6
    && mobileAudit.completedSnapshot.panelCount === 7
    && mobileAudit.completedScrollWidth === mobileAudit.completedClientWidth
    && mobileAudit.completedBrokenImages === 0
    && browserErrors.length === 0;

  const result = {
    passed,
    testedAt: new Date().toISOString(),
    baseUrl,
    phases,
    totalDurationMs: phases.reduce((sum, phase) => sum + phase.durationMs, 0),
    finalSnapshot,
    draftVisualAudit,
    finalVisualAudit,
    desktopAudit,
    overlayAudit,
    mobileAudit,
    browserErrors
  };
  console.log(JSON.stringify(result, null, 2));
  if (!passed) process.exitCode = 1;
} finally {
  await browser.close();
}
