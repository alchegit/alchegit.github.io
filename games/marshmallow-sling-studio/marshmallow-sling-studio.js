(() => {
  const canvas = document.getElementById("slingCanvas");
  const ctx = canvas.getContext("2d");
  const scoreValue = document.getElementById("scoreValue");
  const shotsValue = document.getElementById("shotsValue");
  const targetValue = document.getElementById("targetValue");
  const powerValue = document.getElementById("powerValue");
  const hintText = document.getElementById("hintText");
  const restartButton = document.getElementById("restartButton");
  const overlayRestartButton = document.getElementById("overlayRestartButton");
  const resultOverlay = document.getElementById("resultOverlay");
  const resultKicker = document.getElementById("resultKicker");
  const resultTitle = document.getElementById("resultTitle");
  const resultCopy = document.getElementById("resultCopy");
  const toolButtons = Array.from(document.querySelectorAll("[data-tool]"));
  const prevStageButton = document.getElementById("prevStageButton");
  const nextStageButton = document.getElementById("nextStageButton");
  const stageLabel = document.getElementById("stageLabel");
  const replayButton = document.getElementById("replayButton");
  const shareReplayButton = document.getElementById("shareReplayButton");
  const replayLikeButton = document.getElementById("replayLikeButton");

  const width = canvas.width;
  const height = canvas.height;
  const sling = { x: 118, y: 386 };
  const table = { x: 510, y: 432, w: 250, h: 24 };
  const floorY = 500;
  const maxPull = 118;
  const projectileGravity = 540;
  const blockGravity = 660;
  const marshmallowBurstThreshold = 510;
  const comboWindowSeconds = 1.05;
  const bestStarsStorageKey = "marshmallowSlingBestStars:v1";
  const progressStorageKey = "marshmallowSlingProgress:v2";
  const likedReplaysStorageKey = "marshmallowSlingLikedReplays:v1";
  const tools = {
    bouncy: { label: "통통", color: "#fff1d6", radius: 17, power: 6.75, impact: 1.28, bounce: 1.42, unlockStars: 0 },
    heavy: { label: "무거움", color: "#f4b860", radius: 20, power: 6.02, impact: 1.9, bounce: 0.82, unlockStars: 3 },
    sticky: { label: "끈적", color: "#a7f1dd", radius: 18, power: 6.22, impact: 1.42, bounce: 0.64, unlockStars: 6 }
  };
  const materials = {
    cookie: { label: "쿠키", push: 1.18, lift: 1.08, rotate: 1.18, friction: 0.985, color: "#f0b96f" },
    glass: { label: "유리", push: 1.45, lift: 1.18, rotate: 1.48, friction: 0.955, color: "#69c8ff" },
    jelly: { label: "젤리", push: 1.02, lift: 1.02, rotate: 0.95, friction: 0.982, color: "#8fd6a3" },
    choco: { label: "초코", push: 0.86, lift: 0.88, rotate: 0.78, friction: 0.94, color: "#8a5a44" }
  };
  const stageLayouts = [
    {
      id: "classic-table",
      name: "기본 탑",
      shots: 4,
      blocks: [
        [548, 402, 44, 30, "glass", false, "PIN"],
        [604, 402, 56, 30, "cookie", true, "1"],
        [666, 402, 56, 30, "cookie", true, "2"],
        [728, 402, 34, 30, "glass", false, "PIN"],
        [574, 372, 58, 30, "jelly", false, "PAD"],
        [636, 372, 58, 30, "glass", true, "3"],
        [698, 372, 54, 30, "cookie", false, "CAP"],
        [608, 342, 50, 28, "glass", false, "TIP"],
        [662, 342, 50, 28, "cookie", true, "4"],
        [636, 312, 44, 28, "jelly", false, "POP"]
      ]
    },
    {
      id: "glass-jar",
      name: "유리병 선반",
      shots: 4,
      blocks: [
        [568, 402, 52, 30, "glass", true, "1"],
        [622, 402, 52, 30, "glass", false, "KEEP", true],
        [676, 402, 52, 30, "glass", true, "2"],
        [594, 372, 54, 30, "cookie", false, "A"],
        [650, 372, 54, 30, "glass", true, "3"],
        [622, 342, 62, 30, "choco", false, "LID"]
      ]
    },
    {
      id: "jelly-cushion",
      name: "젤리 쿠션",
      shots: 5,
      blocks: [
        [552, 402, 62, 30, "jelly", false, "PAD"],
        [616, 402, 62, 30, "jelly", false, "PAD"],
        [680, 402, 62, 30, "jelly", false, "PAD"],
        [584, 372, 54, 30, "cookie", true, "1"],
        [648, 372, 54, 30, "glass", false, "KEEP", true],
        [710, 372, 46, 30, "cookie", true, "2"],
        [648, 342, 58, 30, "cookie", true, "3"]
      ]
    },
    {
      id: "choco-lock",
      name: "초코 잠금",
      shots: 5,
      blocks: [
        [540, 402, 58, 30, "choco", false, "W"],
        [600, 402, 58, 30, "choco", true, "1"],
        [660, 402, 58, 30, "choco", false, "W"],
        [720, 402, 44, 30, "glass", true, "2"],
        [570, 372, 58, 30, "jelly", false, "KEEP", true],
        [634, 372, 58, 30, "cookie", true, "3"],
        [698, 372, 50, 30, "choco", false, "W"]
      ]
    }
  ];

  let state;

  function resetGame() {
    const progress = loadProgress();
    const stageIndex = clamp(Number(progress.selectedStageIndex || 0), 0, stageLayouts.length - 1);
    const stage = stageLayouts[stageIndex];
    const stageBest = getStageBest(progress, stage.id);
    const selectedTool = isToolUnlocked(state?.currentTool || progress.selectedTool || "bouncy", progress)
      ? state?.currentTool || progress.selectedTool || "bouncy"
      : "bouncy";
    state = {
      active: true,
      finished: false,
      progress,
      stage,
      stageIndex,
      dragging: false,
      phase: "aim",
      score: 0,
      shots: stage.shots,
      targetCleared: 0,
      targetTotal: stage.blocks.filter((item) => item[5]).length,
      currentTool: selectedTool,
      protectedDrops: 0,
      accidentalDrops: 0,
      shotTargets: 0,
      comboBest: 0,
      impactCombo: 0,
      comboTimer: 0,
      crackShots: 0,
      bestStars: stageBest.stars,
      minShots: stageBest.minShots,
      badges: { ...stageBest.badges },
      currentReplayCode: progress.lastReplayCode || "",
      replayRecord: getReplayRecord(progress, progress.lastReplayCode || ""),
      hitShake: 0,
      hitEcho: "",
      weakCoachTime: progress.bestStars > 0 ? 2.2 : 4.6,
      lastTime: performance.now(),
      resetTimer: 0,
      slowTimer: 0,
      currentReplay: [],
      lastReplay: stageBest.replay,
      hint: `${stage.name} / ${tools[selectedTool].label} 마시멜로`,
      launchPower: 0,
      projectile: makeProjectile(selectedTool),
      blocks: makeBlocks(stage),
      crumbs: [],
      shockwaves: [],
      floatTexts: []
    };
    resultOverlay.hidden = true;
    syncToolButtons();
    renderStageControls();
    updateHud();
  }

  function makeProjectile(toolId = state?.currentTool || "bouncy") {
    const tool = tools[toolId];
    return {
      x: sling.x,
      y: sling.y,
      vx: 0,
      vy: 0,
      r: tool.radius,
      rotation: 0,
      active: false
    };
  }

  function makeBlocks(stage = state.stage) {
    return stage.blocks.map(([x, y, w, h, material, target, label, protectedBlock]) => (
      block(x, y, w, h, material, target, label, Boolean(protectedBlock))
    ));
  }

  function block(x, y, w, h, materialId, target, label, protectedBlock = false) {
    const material = materials[materialId] || materials.cookie;
    return {
      x,
      y,
      w,
      h,
      materialId,
      material,
      color: target ? "#e95b88" : material.color,
      target,
      label,
      protectedBlock,
      vx: 0,
      vy: 0,
      rotation: 0,
      angular: 0,
      hitCooldown: 0,
      dynamic: false,
      hit: false,
      cleared: false,
      penaltyCounted: false,
      burstRewarded: false
    };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function updateHud() {
    const projectile = state.projectile;
    const power = state.dragging
      ? Math.round(distance(projectile, sling))
      : Math.round(Math.hypot(projectile.vx, projectile.vy) / 8);

    scoreValue.textContent = String(Math.max(0, Math.round(state.score)));
    shotsValue.textContent = String(state.shots);
    targetValue.textContent = `${state.targetCleared}/${state.targetTotal}`;
    powerValue.textContent = String(power);
    hintText.textContent = state.hint;
    stageLabel.textContent = `${state.stageIndex + 1}/${stageLayouts.length}`;
  }

  function syncToolButtons() {
    for (const button of toolButtons) {
      button.classList.toggle("is-active", button.dataset.tool === state.currentTool);
      button.disabled = !isToolUnlocked(button.dataset.tool, state.progress);
    }
  }

  function selectTool(toolId) {
    if (!tools[toolId] || !isToolUnlocked(toolId, state.progress) || state.phase !== "aim" || state.projectile.active) {
      return;
    }

    state.currentTool = toolId;
    state.progress.selectedTool = toolId;
    saveProgress(state.progress);
    state.projectile = makeProjectile(toolId);
    state.hint = `${tools[toolId].label} 마시멜로 선택`;
    syncToolButtons();
    updateHud();
  }

  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (width / rect.width),
      y: (event.clientY - rect.top) * (height / rect.height)
    };
  }

  function startDrag(event) {
    if (!state.active || state.phase !== "aim") {
      return;
    }

    const point = pointerPosition(event);
    if (distance(point, state.projectile) > 54 && distance(point, sling) > 72) {
      return;
    }

    event.preventDefault();
    state.dragging = true;
    state.weakCoachTime = 0;
    if (canvas.setPointerCapture && event.pointerId !== undefined) {
      canvas.setPointerCapture(event.pointerId);
    }
    moveDrag(event);
  }

  function moveDrag(event) {
    if (!state.dragging) {
      return;
    }

    event.preventDefault();
    const point = pointerPosition(event);
    const dx = point.x - sling.x;
    const dy = point.y - sling.y;
    const length = Math.hypot(dx, dy) || 1;
    const pull = Math.min(length, maxPull);
    const projectile = state.projectile;

    projectile.x = sling.x + (dx / length) * pull;
    projectile.y = sling.y + (dy / length) * pull;
    state.hint = "좋아요. 더 멀리 당길수록 세게 날아갑니다.";
    updateHud();
  }

  function endDrag() {
    if (!state.dragging) {
      return;
    }

    state.dragging = false;
    const projectile = state.projectile;
    const tool = tools[state.currentTool];
    const pullX = sling.x - projectile.x;
    const pullY = sling.y - projectile.y;
    const power = Math.hypot(pullX, pullY);

    if (power < 14) {
      projectile.x = sling.x;
      projectile.y = sling.y;
      state.hint = "조금 더 뒤로 당겨야 마시멜로가 슝 날아가요.";
      updateHud();
      return;
    }

    state.shots -= 1;
    state.shotTargets = 0;
    state.impactCombo = 0;
    state.comboTimer = 0;
    state.launchPower = power;
    state.currentReplay = [];
    state.phase = "flight";
    projectile.active = true;
    projectile.vx = pullX * tool.power;
    projectile.vy = pullY * tool.power;
    addShockwave(sling.x, sling.y, tool.color, clamp(power / maxPull, 0.38, 1));
    if (power > maxPull * 0.82) {
      addFloatText(sling.x + 44, sling.y - 38, "FULL PULL!", "#ffd85a");
    }
    state.hint = "날아갑니다! 분홍 별표 블록이 테이블 밖으로 밀리면 성공이에요.";
    updateHud();
  }

  function resetProjectile() {
    state.projectile = makeProjectile(state.currentTool);
    state.phase = "aim";
    state.resetTimer = 0;
    state.hint = state.shots > 0
      ? "다음 마시멜로를 당겨 목표 블록을 다시 노려보세요."
      : "모든 마시멜로를 사용했습니다.";
    updateHud();
  }

  function finishGame(won) {
    if (state.finished) {
      return;
    }

    state.active = false;
    state.finished = true;
    resultOverlay.hidden = false;

    if (won) {
      const bonus = state.shots * 160;
      const stars = evaluateStars();
      const usedShots = state.stage.shots - state.shots;
      state.score += bonus;
      if (stars > state.bestStars || usedShots < state.minShots) {
        state.bestStars = Math.max(state.bestStars, stars);
        state.minShots = Math.min(state.minShots, usedShots);
        localStorage.setItem(bestStarsStorageKey, String(state.bestStars));
      }
      rememberStageResult(stars, usedShots);
      syncReplayRecord(stars, usedShots, true);
      renderStageControls();
      resultKicker.textContent = "Workshop Complete";
      resultTitle.textContent = "과자 탑 정리 완료!";
      resultCopy.textContent = `${state.stage.name} 별 ${stars}/3, ${usedShots}발, 배지 ${getBadgeCount(state.badges)}/3, 응원 ${state.replayRecord.likes}개입니다.`;
    } else {
      rememberStageResult(0, state.stage.shots - state.shots);
      syncReplayRecord(0, state.stage.shots - state.shots, false);
      renderStageControls();
      resultKicker.textContent = "Workshop Closed";
      resultTitle.textContent = "오늘 공방 마감";
      resultCopy.textContent = `${state.stage.name} ${state.targetCleared}/${state.targetTotal}개 목표, 콤보 x${state.comboBest}, 보호 실수 ${state.protectedDrops}입니다.`;
    }

    updateHud();
  }

  function evaluateStars() {
    const clearStar = state.targetCleared >= state.targetTotal ? 1 : 0;
    const precisionStar = state.protectedDrops === 0 ? 1 : 0;
    const efficiencyStar = state.shots >= 1 || state.comboBest >= 2 ? 1 : 0;
    return clearStar + precisionStar + efficiencyStar;
  }

  function rememberStageResult(stars, usedShots) {
    const best = getStageBest(state.progress, state.stage.id);
    const badges = evaluateBadges(stars, usedShots);
    best.stars = Math.max(best.stars, stars);
    best.badges = mergeBadges(best.badges, badges);
    if (stars > 0) {
      best.minShots = Math.min(best.minShots, Math.max(1, usedShots));
    }
    if (state.lastReplay.length > 4) {
      best.replay = state.lastReplay.slice(-90);
    }
    state.progress.stageBest[state.stage.id] = best;
    state.progress.selectedStageIndex = state.stageIndex;
    state.progress.selectedTool = state.currentTool;
    state.progress.unlockedTools = getUnlockedTools(state.progress);
    state.badges = { ...best.badges };
    saveProgress(state.progress);
  }

  function evaluateBadges(stars, usedShots) {
    const won = stars > 0 && state.targetCleared >= state.targetTotal;
    return {
      targetOnly: won && state.accidentalDrops === 0,
      oneShot: won && usedShots <= 1,
      safeKeep: won && state.protectedDrops === 0
    };
  }

  function mergeBadges(current, earned) {
    return {
      targetOnly: Boolean(current?.targetOnly || earned.targetOnly),
      oneShot: Boolean(current?.oneShot || earned.oneShot),
      safeKeep: Boolean(current?.safeKeep || earned.safeKeep)
    };
  }

  function getBadgeCount(badges) {
    return ["targetOnly", "oneShot", "safeKeep"].filter((key) => badges?.[key]).length;
  }

  function addCrumbs(x, y, color, count = 12) {
    for (let i = 0; i < count; i += 1) {
      state.crumbs.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 190,
        vy: -Math.random() * 150 - 26,
        life: 0.82 + Math.random() * 0.28,
        maxLife: 1.02,
        color,
        size: 3 + Math.random() * 4
      });
    }
  }

  function addShockwave(x, y, color = "#ffd85a", scale = 0.75) {
    state.shockwaves.push({
      x,
      y,
      color,
      radius: 12,
      maxRadius: 54 + 42 * scale,
      life: 0.38 + 0.14 * scale,
      maxLife: 0.38 + 0.14 * scale
    });
  }

  function addFloatText(x, y, text, color = "#243047") {
    state.floatTexts.push({
      x,
      y,
      text,
      color,
      vy: -54,
      life: 0.95,
      maxLife: 0.95
    });
  }

  function circleRectCollision(circle, rect) {
    const closestX = clamp(circle.x, rect.x, rect.x + rect.w);
    const closestY = clamp(circle.y, rect.y, rect.y + rect.h);
    const dx = circle.x - closestX;
    const dy = circle.y - closestY;
    const distanceSq = dx * dx + dy * dy;
    let normalX = dx;
    let normalY = dy;

    if (distanceSq < 0.0001) {
      const left = Math.abs(circle.x - rect.x);
      const right = Math.abs(rect.x + rect.w - circle.x);
      const top = Math.abs(circle.y - rect.y);
      const bottom = Math.abs(rect.y + rect.h - circle.y);
      const closestSide = Math.min(left, right, top, bottom);
      if (closestSide === left) {
        normalX = -1;
        normalY = 0;
      } else if (closestSide === right) {
        normalX = 1;
        normalY = 0;
      } else if (closestSide === top) {
        normalX = 0;
        normalY = -1;
      } else {
        normalX = 0;
        normalY = 1;
      }
    } else {
      const invDistance = 1 / Math.sqrt(distanceSq);
      normalX *= invDistance;
      normalY *= invDistance;
    }

    return {
      hit: distanceSq < circle.r * circle.r,
      dx,
      dy,
      normalX,
      normalY,
      penetration: Math.max(0, circle.r - Math.sqrt(distanceSq))
    };
  }

  function hitBlock(block, collision) {
    if (block.hitCooldown > 0) {
      return;
    }

    const projectile = state.projectile;
    const tool = tools[state.currentTool];
    const impactVx = projectile.vx;
    const impactVy = projectile.vy;
    const impact = Math.hypot(impactVx, impactVy);
    const normalX = Number.isFinite(collision?.normalX) ? collision.normalX : -Math.sign(impactVx || 1);
    const normalY = Number.isFinite(collision?.normalY) ? collision.normalY : 0;
    const pushX = -normalX || (impactVx >= 0 ? 1 : -1);
    const impactLevel = clamp((impact / 430) * tool.impact, 0.45, 2.45);
    const material = block.material;

    block.dynamic = true;
    block.hit = true;
    block.hitCooldown = 0.11;
    block.x += pushX * clamp(collision?.penetration || 0, 0, 8);
    block.vx += (impactVx * 0.42 * tool.impact + pushX * 118 * impactLevel) * material.push;
    block.vy += (impactVy * 0.14 * tool.impact - (95 + 62 * impactLevel) - Math.max(0, -normalY) * 88) * material.lift;
    block.angular += pushX * (1.5 + impactLevel * 1.35) * material.rotate;
    recordImpactCombo(block, impactLevel);
    wakeNearbyBlocks(block, impact * tool.impact * 1.08, pushX, 0.95);
    if (isWeakPoint(block)) {
      triggerCrackShot(block, impact, pushX);
    }

    if (state.currentTool === "sticky") {
      block.vx *= 0.78;
      block.angular *= 0.72;
      pullNearbyBlocks(block, impactLevel);
    }

    reflectProjectile(normalX, normalY, pushX, impactLevel);
    state.score += Math.round((block.target ? 38 : 14) * impactLevel);
    state.hitShake = Math.max(state.hitShake, block.materialId === "glass" ? 0.28 : block.materialId === "choco" ? 0.22 : 0.15, impactLevel * 0.12);
    state.hitEcho = impactLevel > 1.65 ? `BOING ${block.material.label}` : `HIT ${block.material.label}`;
    state.hint = block.target
      ? "좋은 명중입니다. 목표 블록이 테이블 밖으로 나가면 큰 점수를 얻어요."
      : "과자 블록이 흔들렸어요. 분홍 별표 블록을 계속 노려봅시다.";
    if (block.target) {
      state.slowTimer = 0.34;
    }
    addShockwave(projectile.x, projectile.y, block.target ? "#ff74a2" : block.color, impactLevel);
    addCrumbs(projectile.x, projectile.y, block.color, Math.round((block.materialId === "glass" ? 18 : 10) * impactLevel));

    if (impact > marshmallowBurstThreshold && !block.burstRewarded) {
      triggerMarshmallowBurst(block, impact, pushX, impactLevel);
    }
  }

  function recordImpactCombo(block, impactLevel) {
    state.comboTimer = comboWindowSeconds;
    state.impactCombo += block.target || impactLevel > 1.25 ? 1 : 0;
    if (state.impactCombo > 1) {
      state.comboBest = Math.max(state.comboBest, state.impactCombo);
      state.score += state.impactCombo * 26;
      addFloatText(block.x + block.w / 2, block.y - 14, `COMBO x${state.impactCombo}`, "#ff74a2");
    } else if (impactLevel > 1.55) {
      addFloatText(block.x + block.w / 2, block.y - 14, "BOING!", "#ffd85a");
    }
  }

  function reflectProjectile(normalX, normalY, pushX, impactLevel) {
    const projectile = state.projectile;
    const tool = tools[state.currentTool];
    const dot = projectile.vx * normalX + projectile.vy * normalY;
    const bounce = 0.54 * tool.bounce;
    projectile.vx = (projectile.vx - 2 * dot * normalX) * bounce + pushX * 48 * impactLevel;
    projectile.vy = (projectile.vy - 2 * dot * normalY) * bounce - 38 * impactLevel;
    projectile.vx = clamp(projectile.vx, -760, 760);
    projectile.vy = clamp(projectile.vy, -720, 720);
  }

  function isWeakPoint(block) {
    return block.materialId === "glass" && /PIN|TIP|PAD/.test(String(block.label || ""));
  }

  function triggerCrackShot(block, impact, direction) {
    if (block.crackRewarded) {
      return;
    }
    block.crackRewarded = true;
    state.crackShots += 1;
    const cx = block.x + block.w / 2;
    const cy = block.y + block.h / 2;
    state.score += 95 + state.crackShots * 35;
    state.hitShake = Math.max(state.hitShake, 0.34);
    state.hitEcho = `CRACK ${block.label}`;
    state.hint = `CRACK SHOT! 약점 ${block.label}을 맞혔습니다.`;
    wakeNearbyBlocks(block, impact * 1.9, direction, 1.25);
    addShockwave(cx, cy, "#ffd85a", 1.25);
    addFloatText(cx, cy - 20, "CRACK SHOT!", "#ffd85a");
    addCrumbs(cx, cy, "#ffd85a", 28);
  }

  function triggerMarshmallowBurst(source, impact, direction, impactLevel) {
    source.burstRewarded = true;
    const cx = source.x + source.w / 2;
    const cy = source.y + source.h / 2;
    const radius = 112 + impactLevel * 34;
    state.score += Math.round(70 * impactLevel);
    state.hitShake = Math.max(state.hitShake, 0.42);
    state.slowTimer = Math.max(state.slowTimer, 0.2);
    state.hitEcho = "MALLOW BURST";
    addShockwave(cx, cy, "#fff1d6", 1.5);
    addFloatText(cx, cy - 28, "MALLOW BURST!", "#fff1d6");
    addCrumbs(cx, cy, "#fff1d6", 34);

    for (const block of state.blocks) {
      if (block === source || block.cleared) {
        continue;
      }

      const bx = block.x + block.w / 2;
      const by = block.y + block.h / 2;
      const dx = bx - cx;
      const dy = by - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > radius) {
        continue;
      }

      const falloff = 1 - dist / radius;
      const nx = dx / (dist || 1);
      const impulse = (180 + impact * 0.22) * falloff * block.material.push;
      block.dynamic = true;
      block.hit = true;
      block.hitCooldown = 0.08;
      block.vx += (nx * impulse + direction * 56 * falloff) * block.material.push;
      block.vy -= (75 + impulse * 0.24) * block.material.lift;
      block.angular += (Math.sign(dx) || direction || 1) * (1.7 + falloff * 3.2) * block.material.rotate;
    }
  }

  function pullNearbyBlocks(source, impactLevel) {
    const sx = source.x + source.w / 2;
    const sy = source.y + source.h / 2;
    for (const block of state.blocks) {
      if (block === source || block.cleared) {
        continue;
      }

      const cx = block.x + block.w / 2;
      const cy = block.y + block.h / 2;
      const dist = Math.hypot(cx - sx, cy - sy);
      if (dist > 92) {
        continue;
      }

      const force = (1 - dist / 92) * impactLevel;
      block.dynamic = true;
      block.hit = true;
      block.vx += (sx - cx) * 1.9 * force;
      block.vy += (sy - cy) * 0.9 * force - 34 * force;
      block.angular *= 0.82;
      addCrumbs(cx, cy, "#a7f1dd", 4);
    }
  }

  function wakeNearbyBlocks(source, strength, direction, multiplier = 1) {
    const sourceCx = source.x + source.w / 2;
    const sourceCy = source.y + source.h / 2;
    const push = clamp(strength / 390, 0.28, 2.05) * multiplier;

    for (const block of state.blocks) {
      if (block === source || block.cleared || block.hitCooldown > 0.04) {
        continue;
      }

      const cx = block.x + block.w / 2;
      const cy = block.y + block.h / 2;
      const dx = cx - sourceCx;
      const dy = cy - sourceCy;
      const closeX = Math.abs(dx) < (source.w + block.w) * 0.72;
      const closeY = Math.abs(dy) < 72;
      const stacked = Math.abs(dx) < (source.w + block.w) * 0.58 && dy < 0 && dy > -92;

      if (!closeX || (!closeY && !stacked)) {
        continue;
      }

      const side = Math.sign(dx) || direction || 1;
      const lift = stacked ? -70 : -26;
      block.dynamic = true;
      block.hit = true;
      block.hitCooldown = 0.09;
      block.vx += (side * 205 + direction * 96) * push * block.material.push;
      block.vy += lift * push * block.material.lift;
      block.angular += side * push * 3.3 * block.material.rotate;
      addCrumbs(cx, cy, block.color, block.target ? 10 : 5);
    }
  }

  function updateProjectile(dt) {
    const projectile = state.projectile;
    if (!projectile.active) {
      return;
    }

    projectile.vy += projectileGravity * dt;
    projectile.x += projectile.vx * dt;
    projectile.y += projectile.vy * dt;
    projectile.rotation += projectile.vx * dt * 0.03;
    state.currentReplay.push({ x: Math.round(projectile.x), y: Math.round(projectile.y) });
    if (state.currentReplay.length > 120) {
      state.currentReplay.shift();
    }

    if (projectile.x < projectile.r) {
      projectile.x = projectile.r;
      projectile.vx *= -0.45;
    }
    if (projectile.x > width - projectile.r) {
      projectile.x = width - projectile.r;
      projectile.vx *= -0.45;
    }
    if (projectile.y > floorY - projectile.r) {
      projectile.y = floorY - projectile.r;
      projectile.vy *= -0.28;
      projectile.vx *= 0.82;
    }

    for (const block of state.blocks) {
      if (block.cleared) {
        continue;
      }

      const collision = circleRectCollision(projectile, block);
      if (collision.hit) {
        hitBlock(block, collision);
      }
    }

    const speed = Math.hypot(projectile.vx, projectile.vy);
    const out = projectile.x > width + 60 || projectile.y > height + 60 || projectile.x < -60;
    if (out || (speed < 26 && projectile.y > floorY - projectile.r - 2)) {
      state.phase = "settle";
      state.resetTimer = 0.75;
      projectile.active = false;
      state.lastReplay = state.currentReplay.slice(-100);
    }
  }

  function updateBlocks(dt) {
    for (const block of state.blocks) {
      if (!block.dynamic && !block.cleared) {
        continue;
      }

      block.vy += blockGravity * dt;
      block.hitCooldown = Math.max(0, block.hitCooldown - dt);
      block.x += block.vx * dt;
      block.y += block.vy * dt;
      block.rotation += block.angular * dt;
      block.vx *= Math.pow(0.992 * block.material.friction, dt * 60);
      block.angular *= Math.pow(0.986 * block.material.friction, dt * 60);
      if (Math.hypot(block.vx, block.vy) > 92 && block.hitCooldown <= 0.02) {
        wakeNearbyBlocks(block, Math.hypot(block.vx, block.vy) * 0.75, Math.sign(block.vx) || 1);
      }

      const blockCenterX = block.x + block.w / 2;
      const onTable =
        block.y + block.h > table.y &&
        block.y + block.h < table.y + 30 &&
        blockCenterX > table.x &&
        blockCenterX < table.x + table.w &&
        block.vy >= 0;

      if (onTable) {
        block.y = table.y - block.h;
        block.vy *= -0.18;
        block.vx *= 0.86;
      }

      if (block.y + block.h > floorY) {
        block.y = floorY - block.h;
        block.vy *= -0.16;
        block.vx *= 0.8;
      }

      const dropped =
        block.x + block.w < table.x - 18 ||
        block.x > table.x + table.w + 18 ||
        block.y > table.y + 46;

      if (dropped && !block.cleared) {
        block.cleared = true;
        block.dynamic = true;
        if (block.target) {
          state.targetCleared += 1;
          state.shotTargets += 1;
          state.comboBest = Math.max(state.comboBest, state.shotTargets);
          const comboBonus = state.shotTargets > 1 ? 180 * (state.shotTargets - 1) : 0;
          state.score += 260 + comboBonus;
          state.hint = comboBonus > 0 ? `목표 블록 ${block.label} 콤보!` : `목표 블록 ${block.label} 정리 성공!`;
          addShockwave(block.x + block.w / 2, block.y + block.h / 2, "#ffd85a", 1.18);
          addFloatText(block.x + block.w / 2, block.y - 14, comboBonus > 0 ? `TARGET x${state.shotTargets}` : "TARGET!", "#ff74a2");
          addCrumbs(block.x + block.w / 2, block.y + block.h / 2, "#ffd85a", 20);
        } else if (!block.penaltyCounted) {
          block.penaltyCounted = true;
          state.accidentalDrops += 1;
          if (block.protectedBlock) {
            state.protectedDrops += 1;
            state.score = Math.max(0, state.score - 160);
            state.hint = "보호 블록이 떨어졌어요.";
          } else {
            state.score = Math.max(0, state.score - 35);
            state.hint = "일반 과자도 같이 떨어졌어요. 그래도 목표 블록을 계속 노려봅시다.";
          }
        }
      }
    }

    resolveBlockContacts();

    if (state.targetCleared >= state.targetTotal) {
      finishGame(true);
    }
  }

  function resolveBlockContacts() {
    for (let i = 0; i < state.blocks.length; i += 1) {
      const a = state.blocks[i];
      if (a.cleared || !a.dynamic) {
        continue;
      }

      for (let j = i + 1; j < state.blocks.length; j += 1) {
        const b = state.blocks[j];
        if (b.cleared) {
          continue;
        }

        const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        if (overlapX <= 0 || overlapY <= 0) {
          continue;
        }

        const ax = a.x + a.w / 2;
        const bx = b.x + b.w / 2;
        const direction = Math.sign(bx - ax) || Math.sign(a.vx) || 1;
        const transfer = clamp((Math.abs(a.vx) + Math.abs(a.vy) + Math.abs(b.vx) + Math.abs(b.vy)) / 620, 0.12, 1.08);

        b.dynamic = true;
        b.hit = true;
        b.vx += direction * (72 + overlapX * 4.2) * transfer * b.material.push;
        b.vy -= (18 + overlapY * 1.6) * transfer * b.material.lift;
        b.angular += direction * (0.8 + transfer * 1.7) * b.material.rotate;
        a.vx -= direction * 28 * transfer;
        a.angular -= direction * 0.65 * transfer;

        if (overlapX < overlapY) {
          const separate = overlapX * 0.52;
          a.x -= direction * separate;
          b.x += direction * separate;
        } else if (a.y < b.y) {
          const separate = overlapY * 0.48;
          a.y -= separate;
          b.y += separate;
          a.vy *= -0.08;
        }
      }
    }
  }

  function updateCrumbs(dt) {
    state.crumbs = state.crumbs.filter((crumb) => {
      crumb.life -= dt;
      crumb.vy += 300 * dt;
      crumb.x += crumb.vx * dt;
      crumb.y += crumb.vy * dt;
      return crumb.life > 0;
    });
  }

  function updateEffects(dt) {
    state.shockwaves = state.shockwaves.filter((wave) => {
      wave.life -= dt;
      const progress = 1 - wave.life / wave.maxLife;
      wave.radius = 12 + (wave.maxRadius - 12) * clamp(progress, 0, 1);
      return wave.life > 0;
    });

    state.floatTexts = state.floatTexts.filter((text) => {
      text.life -= dt;
      text.y += text.vy * dt;
      text.vy *= Math.pow(0.9, dt * 60);
      return text.life > 0;
    });
  }

  function updateGame(dt) {
    if (!state.active) {
      updateCrumbs(dt);
      updateEffects(dt);
      return;
    }

    const slowDt = state.slowTimer > 0 ? dt * 0.38 : dt;
    state.slowTimer = Math.max(0, state.slowTimer - dt);
    state.weakCoachTime = Math.max(0, state.weakCoachTime - dt);
    state.hitShake = Math.max(0, state.hitShake - dt);
    state.comboTimer = Math.max(0, state.comboTimer - dt);
    if (state.comboTimer <= 0) {
      state.impactCombo = 0;
    }
    updateProjectile(slowDt);
    updateBlocks(slowDt);
    updateCrumbs(dt);
    updateEffects(dt);

    if (state.phase === "settle") {
      state.resetTimer -= dt;
      if (state.resetTimer <= 0) {
        if (state.shots > 0) {
          resetProjectile();
        } else {
          finishGame(false);
        }
      }
    }

    updateHud();
  }

  function drawPixelRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function drawBackground(time) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#dff6ff");
    gradient.addColorStop(0.6, "#fff2df");
    gradient.addColorStop(1, "#f8d7b2");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = "#243047";
    for (let x = 0; x < width; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    drawPixelRect(0, floorY, width, height - floorY, "#d8a06c");
    drawPixelRect(0, floorY, width, 5, "#243047");

    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    ctx.beginPath();
    ctx.arc(116 + Math.sin(time) * 6, 88, 36, 0, Math.PI * 2);
    ctx.arc(150, 92, 28, 0, Math.PI * 2);
    ctx.arc(690, 92, 38, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawTable() {
    drawPixelRect(table.x - 18, table.y, table.w + 36, table.h, "#b98758");
    drawPixelRect(table.x - 18, table.y, table.w + 36, 5, "#243047");
    drawPixelRect(table.x, table.y + table.h, 18, 60, "#7d5334");
    drawPixelRect(table.x + table.w - 18, table.y + table.h, 18, 60, "#7d5334");
  }

  function drawSling() {
    const projectile = state.projectile;
    drawPixelRect(82, 350, 13, 90, "#7d5334");
    drawPixelRect(135, 350, 13, 90, "#7d5334");
    drawPixelRect(88, 430, 54, 13, "#7d5334");

    const bandAttached = state.dragging || (state.phase === "aim" && !projectile.active && distance(projectile, sling) < 4);
    if (!bandAttached) {
      drawPixelRect(96, 356, 38, 5, "#e95b88");
      return;
    }

    const tension = state.dragging ? clamp(distance(projectile, sling) / maxPull, 0, 1) : 0;
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 5 + tension * 3;
    ctx.beginPath();
    ctx.moveTo(90, 358);
    ctx.lineTo(projectile.x, projectile.y);
    ctx.lineTo(143, 358);
    ctx.stroke();

    ctx.strokeStyle = "#e95b88";
    ctx.lineWidth = 3 + tension * 2;
    ctx.beginPath();
    ctx.moveTo(91, 358);
    ctx.lineTo(projectile.x, projectile.y);
    ctx.lineTo(142, 358);
    ctx.stroke();

    if (tension > 0.55) {
      ctx.fillStyle = "rgba(255, 216, 90, 0.9)";
      ctx.beginPath();
      ctx.arc(projectile.x, projectile.y - 24, 5 + tension * 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPrediction() {
    if (!state.dragging) {
      return;
    }

    const projectile = state.projectile;
    const tool = tools[state.currentTool];
    let x = projectile.x;
    let y = projectile.y;
    let vx = (sling.x - projectile.x) * tool.power;
    let vy = (sling.y - projectile.y) * tool.power;

    ctx.fillStyle = "rgba(24, 32, 51, 0.32)";
    for (let i = 0; i < 20; i += 1) {
      vx *= 0.996;
      vy += projectileGravity * 0.055;
      x += vx * 0.055;
      y += vy * 0.055;
      if (i % 2 === 0) {
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawReplayTrail() {
    if (!state.lastReplay.length) {
      return;
    }

    ctx.save();
    ctx.fillStyle = "rgba(143, 120, 255, 0.72)";
    for (let i = 0; i < state.lastReplay.length; i += 5) {
      const point = state.lastReplay[i];
      ctx.fillRect(point.x - 2, point.y - 2, 4, 4);
    }
    ctx.restore();
  }

  function drawProjectile() {
    const projectile = state.projectile;
    const tool = tools[state.currentTool];
    const speed = Math.hypot(projectile.vx, projectile.vy);
    const pullStretch = state.dragging ? clamp(distance(projectile, sling) / maxPull, 0, 1) * 0.18 : 0;
    const flightStretch = projectile.active ? clamp(speed / 950, 0, 0.24) : 0;
    const stretch = pullStretch + flightStretch;
    ctx.save();
    ctx.translate(projectile.x, projectile.y);
    ctx.rotate(projectile.rotation);
    ctx.scale(1 + stretch, Math.max(0.72, 1 - stretch * 0.55));
    ctx.shadowColor = tool.color;
    ctx.shadowBlur = projectile.active || state.dragging ? 16 : 4;
    drawPixelRect(-projectile.r + 1, -projectile.r + 1, projectile.r * 2 - 2, projectile.r * 2 - 2, tool.color);
    ctx.shadowBlur = 0;
    drawPixelRect(-16, -8, 32, 16, "#fff7ed");
    drawPixelRect(-7, -4, 5, 5, "#243047");
    drawPixelRect(5, -4, 5, 5, "#243047");
    drawPixelRect(-3, 6, 9, 4, "#e95b88");
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 3;
    ctx.strokeRect(-projectile.r + 1, -projectile.r + 1, projectile.r * 2 - 2, projectile.r * 2 - 2);
    ctx.restore();
  }

  function drawBlock(block) {
    ctx.save();
    ctx.translate(block.x + block.w / 2, block.y + block.h / 2);
    ctx.rotate(block.rotation);
    ctx.globalAlpha = block.cleared ? 0.72 : 1;
    drawPixelRect(-block.w / 2, -block.h / 2, block.w, block.h, block.color);
    drawPixelRect(-block.w / 2, -block.h / 2, block.w, 5, "rgba(255,255,255,0.45)");
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 3;
    ctx.strokeRect(-block.w / 2, -block.h / 2, block.w, block.h);

    if (block.target) {
      ctx.fillStyle = "#fff9ed";
      ctx.font = "900 17px ui-monospace, Consolas, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("*", 0, 2);
    } else if (block.protectedBlock) {
      ctx.fillStyle = "#fff9ed";
      ctx.font = "900 12px ui-monospace, Consolas, monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("KEEP", 0, 2);
    }

    if (isWeakPoint(block) && !block.cleared) {
      ctx.strokeStyle = "#ffd85a";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(-block.w / 2 - 5, -block.h / 2 - 5, block.w + 10, block.h + 10);
      ctx.setLineDash([]);
    }

    ctx.fillStyle = "rgba(36,48,71,0.74)";
    ctx.font = "900 9px ui-monospace, Consolas, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(block.material.label, 0, block.h / 2 - 8);

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function firstCoachBlock() {
    return state.blocks.find((block) => isWeakPoint(block) && !block.cleared)
      || state.blocks.find((block) => block.target && !block.cleared)
      || null;
  }

  function drawWeakCoach(time) {
    if (state.weakCoachTime <= 0 || state.phase !== "aim" || state.dragging || state.finished) {
      return;
    }
    const block = firstCoachBlock();
    if (!block) {
      return;
    }
    const cx = block.x + block.w / 2;
    const cy = block.y + block.h / 2;
    const pulse = 0.5 + Math.sin(time * 7) * 0.5;

    ctx.save();
    ctx.globalAlpha = Math.min(1, state.weakCoachTime);
    ctx.strokeStyle = "#ffd85a";
    ctx.lineWidth = 5 + pulse * 2;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(block.x - 9, block.y - 9, block.w + 18, block.h + 18);
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.moveTo(sling.x + 28, sling.y - 32);
    ctx.lineTo(cx - 12, cy);
    ctx.strokeStyle = "rgba(255,216,90,0.82)";
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = "rgba(255,249,237,0.94)";
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(cx - 58, cy - 64, 116, 34, 7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#243047";
    ctx.font = "900 16px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(isWeakPoint(block) ? "약점!" : "분홍 목표!", cx, cy - 46);
    ctx.restore();
  }

  function drawCrumbs() {
    for (const crumb of state.crumbs) {
      ctx.globalAlpha = clamp(crumb.life / crumb.maxLife, 0, 1);
      drawPixelRect(crumb.x, crumb.y, crumb.size || 5, crumb.size || 5, crumb.color);
    }
    ctx.globalAlpha = 1;
  }

  function drawShockwaves() {
    ctx.save();
    for (const wave of state.shockwaves) {
      const alpha = clamp(wave.life / wave.maxLife, 0, 1);
      ctx.globalAlpha = alpha * 0.65;
      ctx.strokeStyle = wave.color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = alpha * 0.18;
      ctx.fillStyle = wave.color;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.radius * 0.58, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawFloatTexts() {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "900 16px ui-monospace, Consolas, monospace";
    for (const item of state.floatTexts) {
      ctx.globalAlpha = clamp(item.life / item.maxLife, 0, 1);
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#243047";
      ctx.strokeText(item.text, item.x, item.y);
      ctx.fillStyle = item.color;
      ctx.fillText(item.text, item.x, item.y);
    }
    ctx.restore();
  }

  function drawRunOverlay() {
    ctx.fillStyle = "rgba(255, 249, 237, 0.88)";
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(28, 28, 194, 70, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#526078";
    ctx.font = "900 10px ui-monospace, Consolas, monospace";
    ctx.fillText("TOOL", 46, 50);
    ctx.fillText("BEST", 144, 50);
    ctx.fillStyle = "#243047";
    ctx.font = "900 16px system-ui, sans-serif";
    ctx.fillText(tools[state.currentTool].label, 46, 78);
    ctx.font = "900 18px ui-monospace, Consolas, monospace";
    ctx.fillText(`${state.bestStars}/3`, 144, 78);

    ctx.fillStyle = "rgba(255, 249, 237, 0.88)";
    ctx.strokeStyle = "#243047";
    ctx.beginPath();
    ctx.roundRect(width - 234, 28, 206, 86, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#526078";
    ctx.font = "900 10px ui-monospace, Consolas, monospace";
    ctx.fillText("COMBO", width - 214, 50);
    ctx.fillText("KEEP", width - 126, 50);
    ctx.fillText("LIKE", width - 70, 50);
    ctx.fillStyle = "#243047";
    ctx.font = "900 18px ui-monospace, Consolas, monospace";
    ctx.fillText(`x${state.comboBest}`, width - 214, 78);
    ctx.fillText(String(state.protectedDrops), width - 126, 78);
    ctx.fillText(String(state.replayRecord.likes), width - 70, 78);
    ctx.fillStyle = "#526078";
    ctx.font = "900 10px ui-monospace, Consolas, monospace";
    ctx.fillText(`BADGE ${getBadgeCount(state.badges)}/3`, width - 214, 102);
    ctx.fillText(state.hitEcho || "HIT --", width - 126, 102);

    ctx.fillStyle = "rgba(255, 249, 237, 0.88)";
    ctx.strokeStyle = "#243047";
    ctx.beginPath();
    ctx.roundRect(28, 112, 194, 54, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#526078";
    ctx.font = "900 10px ui-monospace, Consolas, monospace";
    ctx.fillText("STAGE", 46, 134);
    ctx.fillText("MIN", 144, 134);
    ctx.fillStyle = "#243047";
    ctx.font = "900 16px ui-monospace, Consolas, monospace";
    ctx.fillText(`${state.stageIndex + 1}/${stageLayouts.length}`, 46, 154);
    ctx.fillText(Number.isFinite(state.minShots) ? String(state.minShots) : "--", 144, 154);

    drawBadgeStrip(28, 180);
  }

  function drawBadgeStrip(x, y) {
    const badges = [
      ["targetOnly", "목표"],
      ["oneShot", "1발"],
      ["safeKeep", "보호"]
    ];
    ctx.fillStyle = "rgba(255, 249, 237, 0.88)";
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x, y, 194, 42, 8);
    ctx.fill();
    ctx.stroke();
    badges.forEach(([key, label], index) => {
      const bx = x + 16 + index * 58;
      ctx.fillStyle = state.badges[key] ? "#ffd85a" : "#ffffff";
      ctx.fillRect(bx, y + 12, 42, 18);
      ctx.strokeStyle = "#243047";
      ctx.strokeRect(bx, y + 12, 42, 18);
      ctx.fillStyle = "#243047";
      ctx.font = "900 10px ui-monospace, Consolas, monospace";
      ctx.fillText(label, bx + 5, y + 25);
    });
  }

  function draw(time) {
    ctx.save();
    if (state.hitShake > 0) {
      const shake = state.hitShake * 10;
      ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    }
    drawBackground(time);
    drawTable();
    drawReplayTrail();
    drawPrediction();
    drawSling();
    drawShockwaves();
    state.blocks.forEach(drawBlock);
    drawWeakCoach(time);
    drawProjectile();
    drawCrumbs();
    drawFloatTexts();
    drawRunOverlay();
    ctx.restore();
  }

  function loop(timestamp) {
    const dt = clamp((timestamp - state.lastTime) / 1000, 0, 0.04);
    state.lastTime = timestamp;
    updateGame(dt);
    draw(timestamp / 1000);
    requestAnimationFrame(loop);
  }

  function loadProgress() {
    const base = {
      selectedStageIndex: 0,
      selectedTool: "bouncy",
      stageBest: {},
      unlockedTools: ["bouncy"],
      replayStats: {},
      lastReplayCode: "",
      lastShareCode: ""
    };

    try {
      const parsed = JSON.parse(localStorage.getItem(progressStorageKey) || "{}");
      const progress = {
        ...base,
        ...parsed,
        stageBest: typeof parsed.stageBest === "object" && parsed.stageBest ? parsed.stageBest : {},
        unlockedTools: Array.isArray(parsed.unlockedTools) ? parsed.unlockedTools : ["bouncy"],
        replayStats: normalizeReplayStats(parsed.replayStats),
        lastReplayCode: typeof parsed.lastReplayCode === "string" ? parsed.lastReplayCode : "",
        lastShareCode: typeof parsed.lastShareCode === "string" ? parsed.lastShareCode : ""
      };
      const legacyStars = Number(localStorage.getItem(bestStarsStorageKey) || 0);
      if (legacyStars > 0 && !progress.stageBest[stageLayouts[0].id]) {
        progress.stageBest[stageLayouts[0].id] = { stars: legacyStars, minShots: Infinity, replay: [], badges: {} };
      }

      progress.selectedStageIndex = clamp(Number(progress.selectedStageIndex || 0), 0, stageLayouts.length - 1);
      for (const stage of stageLayouts) {
        progress.stageBest[stage.id] = getStageBest(progress, stage.id);
      }
      progress.unlockedTools = getUnlockedTools(progress);
      if (!isToolUnlocked(progress.selectedTool, progress)) {
        progress.selectedTool = "bouncy";
      }
      saveProgress(progress);
      return progress;
    } catch (error) {
      saveProgress(base);
      return base;
    }
  }

  function saveProgress(progress) {
    localStorage.setItem(progressStorageKey, JSON.stringify(progress));
  }

  function getStageBest(progress, stageId) {
    const raw = progress.stageBest?.[stageId] || {};
    const minShots = Number(raw.minShots);
    return {
      stars: clamp(Number(raw.stars || 0), 0, 3),
      minShots: Number.isFinite(minShots) && minShots > 0 ? minShots : Infinity,
      replay: normalizeReplay(raw.replay || []),
      badges: {
        targetOnly: Boolean(raw.badges?.targetOnly),
        oneShot: Boolean(raw.badges?.oneShot),
        safeKeep: Boolean(raw.badges?.safeKeep)
      }
    };
  }

  function normalizeReplay(points) {
    if (!Array.isArray(points)) {
      return [];
    }

    return points
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
      .map((point) => ({ x: Math.round(clamp(Number(point.x), 0, width)), y: Math.round(clamp(Number(point.y), 0, height)) }))
      .slice(-100);
  }

  function normalizeReplayStats(stats) {
    const safe = typeof stats === "object" && stats ? stats : {};
    return Object.fromEntries(Object.entries(safe).map(([code, record]) => [code, {
      shares: Math.max(0, Number(record?.shares || 0)),
      likes: Math.max(0, Number(record?.likes || 0)),
      bestStars: clamp(Number(record?.bestStars || 0), 0, 3),
      bestCombo: Math.max(0, Number(record?.bestCombo || 0))
    }]));
  }

  function buildReplayCode(stars = state.bestStars, usedShots = state.stage.shots - state.shots) {
    const replay = normalizeReplay(state.lastReplay.length ? state.lastReplay : state.currentReplay);
    const payload = {
      v: 1,
      s: state.stage.id,
      t: state.currentTool,
      stars,
      shots: usedShots,
      combo: state.comboBest,
      badges: Object.entries(evaluateBadges(stars, usedShots)).filter(([, value]) => value).map(([key]) => key),
      r: replay.filter((_, index) => index % 3 === 0).map((point) => [point.x, point.y]).slice(-34)
    };
    return `MSR1-${btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
  }

  function getReplayRecord(progress, code) {
    progress.replayStats = normalizeReplayStats(progress.replayStats);
    if (!code) {
      return { shares: 0, likes: 0, bestStars: 0, bestCombo: 0 };
    }
    progress.replayStats[code] = progress.replayStats[code] || { shares: 0, likes: 0, bestStars: 0, bestCombo: 0 };
    return progress.replayStats[code];
  }

  function syncReplayRecord(stars, usedShots, won) {
    const code = buildReplayCode(stars, usedShots);
    const record = getReplayRecord(state.progress, code);
    record.bestStars = Math.max(record.bestStars, stars);
    record.bestCombo = Math.max(record.bestCombo, state.comboBest);
    state.currentReplayCode = code;
    state.replayRecord = record;
    state.progress.lastReplayCode = code;
    state.progress.lastShareCode = code;
    if (won && state.lastReplay.length > 4) {
      state.progress.lastReplayCode = code;
    }
    saveProgress(state.progress);
  }

  function getLikedReplays() {
    try {
      const parsed = JSON.parse(localStorage.getItem(likedReplaysStorageKey) || "[]");
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      return new Set();
    }
  }

  function saveLikedReplays(liked) {
    localStorage.setItem(likedReplaysStorageKey, JSON.stringify([...liked].slice(-160)));
  }

  function getTotalStars(progress) {
    return stageLayouts.reduce((total, stage) => total + getStageBest(progress, stage.id).stars, 0);
  }

  function getUnlockedTools(progress) {
    const totalStars = getTotalStars(progress);
    return Object.entries(tools)
      .filter(([, tool]) => totalStars >= tool.unlockStars)
      .map(([toolId]) => toolId);
  }

  function isToolUnlocked(toolId, progress) {
    return Boolean(tools[toolId]) && getUnlockedTools(progress).includes(toolId);
  }

  function renderStageControls() {
    stageLabel.textContent = `${state.stageIndex + 1}/${stageLayouts.length}`;
    const hasReplay = state.lastReplay.length > 0 || state.currentReplay.length > 0;
    const code = state.currentReplayCode || state.progress.lastReplayCode || "";
    state.replayRecord = getReplayRecord(state.progress, code);
    const liked = code ? getLikedReplays().has(code) : false;
    replayButton.disabled = !state.lastReplay.length;
    replayButton.classList.toggle("is-active", Boolean(state.lastReplay.length));
    shareReplayButton.disabled = !hasReplay;
    shareReplayButton.title = code || "현재 리플레이 코드";
    replayLikeButton.disabled = !hasReplay && !code;
    replayLikeButton.textContent = `응원 ${state.replayRecord.likes}`;
    replayLikeButton.classList.toggle("is-active", liked);
    replayLikeButton.title = liked ? "이미 응원한 리플레이입니다." : "현재 리플레이를 한 번 응원합니다.";
  }

  function selectStage(direction) {
    const progress = loadProgress();
    progress.selectedStageIndex = (clamp(Number(progress.selectedStageIndex || 0), 0, stageLayouts.length - 1) + direction + stageLayouts.length) % stageLayouts.length;
    saveProgress(progress);
    resetGame();
  }

  function replayBestShot() {
    const best = getStageBest(state.progress, state.stage.id);
    state.lastReplay = best.replay;
    state.hint = best.replay.length ? "저장된 궤적을 표시했습니다." : "아직 저장된 궤적이 없습니다.";
    renderStageControls();
    updateHud();
  }

  function shareReplay() {
    if (!state.lastReplay.length && !state.currentReplay.length) {
      state.hint = "공유할 궤적이 아직 없습니다.";
      updateHud();
      return;
    }

    const stars = state.finished ? state.bestStars : evaluateStars();
    const usedShots = Math.max(1, state.stage.shots - state.shots);
    const code = buildReplayCode(stars, usedShots);
    const record = getReplayRecord(state.progress, code);
    record.shares += 1;
    record.bestStars = Math.max(record.bestStars, stars);
    record.bestCombo = Math.max(record.bestCombo, state.comboBest);
    state.currentReplayCode = code;
    state.replayRecord = record;
    state.progress.lastReplayCode = code;
    state.progress.lastShareCode = code;
    saveProgress(state.progress);
    renderStageControls();

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code).then(() => {
        state.hint = "리플레이 코드가 복사됐습니다.";
        updateHud();
      }).catch(() => {
        window.prompt("리플레이 코드", code);
      });
    } else {
      window.prompt("리플레이 코드", code);
    }
  }

  function likeReplay() {
    const code = state.currentReplayCode || state.progress.lastReplayCode || buildReplayCode();
    if (!code) {
      state.hint = "응원할 리플레이가 아직 없습니다.";
      updateHud();
      return;
    }

    const liked = getLikedReplays();
    if (liked.has(code)) {
      state.hint = "이미 응원한 리플레이입니다.";
      updateHud();
      return;
    }

    const record = getReplayRecord(state.progress, code);
    record.likes += 1;
    record.bestStars = Math.max(record.bestStars, state.bestStars);
    record.bestCombo = Math.max(record.bestCombo, state.comboBest);
    state.currentReplayCode = code;
    state.replayRecord = record;
    state.progress.lastReplayCode = code;
    state.progress.lastShareCode = code;
    saveProgress(state.progress);
    liked.add(code);
    saveLikedReplays(liked);
    state.hint = `리플레이를 응원했습니다. ${record.likes}개`;
    renderStageControls();
    updateHud();
  }

  canvas.addEventListener("pointerdown", startDrag);
  canvas.addEventListener("pointermove", moveDrag);
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);
  restartButton.addEventListener("click", resetGame);
  overlayRestartButton.addEventListener("click", resetGame);
  prevStageButton.addEventListener("click", () => selectStage(-1));
  nextStageButton.addEventListener("click", () => selectStage(1));
  replayButton.addEventListener("click", replayBestShot);
  shareReplayButton.addEventListener("click", shareReplay);
  replayLikeButton.addEventListener("click", likeReplay);
  toolButtons.forEach((button) => {
    button.addEventListener("click", () => selectTool(button.dataset.tool));
  });

  resetGame();
  requestAnimationFrame(loop);
})();
