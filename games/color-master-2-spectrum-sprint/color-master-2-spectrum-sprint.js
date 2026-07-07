(() => {
  "use strict";

  const storageKey = "colorMaster2SpectrumBest:v1";
  const roundLimitMs = 8000;
  const canvas = document.getElementById("spectrumCanvas");
  const ctx = canvas.getContext("2d");

  const elements = {
    restart: document.getElementById("restartButton"),
    start: document.getElementById("startButton"),
    overlayRestart: document.getElementById("overlayRestartButton"),
    level: document.getElementById("levelValue"),
    score: document.getElementById("scoreValue"),
    combo: document.getElementById("comboValue"),
    best: document.getElementById("bestValue"),
    time: document.getElementById("timeValue"),
    timeBar: document.getElementById("timeBar"),
    feedback: document.getElementById("feedbackText"),
    result: document.getElementById("resultOverlay"),
    resultTitle: document.getElementById("resultTitle"),
    resultCopy: document.getElementById("resultCopy"),
    resultLevel: document.getElementById("resultLevel"),
    resultScore: document.getElementById("resultScore"),
    resultGrade: document.getElementById("resultGrade")
  };

  const state = {
    phase: "ready",
    level: 1,
    score: 0,
    combo: 0,
    best: loadBest(),
    round: null,
    roundStartedAt: 0,
    frameId: 0,
    lastGrade: "COOL",
    revealWrongIndex: -1
  };

  elements.restart.addEventListener("click", startRun);
  elements.start.addEventListener("click", startRun);
  elements.overlayRestart.addEventListener("click", startRun);
  canvas.addEventListener("pointerdown", handlePointer);
  window.addEventListener("resize", () => draw());

  renderReady();

  function renderReady() {
    cancelAnimationFrame(state.frameId);
    state.phase = "ready";
    state.level = 1;
    state.score = 0;
    state.combo = 0;
    state.round = createRound(1);
    state.revealWrongIndex = -1;
    elements.result.hidden = true;
    elements.start.disabled = false;
    elements.start.textContent = "시작";
    elements.feedback.textContent = "하나만 다른 타일을 탭하세요.";
    updateHud(roundLimitMs);
    draw();
  }

  function startRun() {
    cancelAnimationFrame(state.frameId);
    state.phase = "playing";
    state.level = 1;
    state.score = 0;
    state.combo = 0;
    state.revealWrongIndex = -1;
    elements.result.hidden = true;
    elements.start.disabled = true;
    elements.start.textContent = "진행중";
    startRound();
  }

  function startRound() {
    state.round = createRound(state.level);
    state.roundStartedAt = performance.now();
    state.revealWrongIndex = -1;
    elements.feedback.textContent = `Lv.${state.level} · 하나만 다른 색을 찾으세요.`;
    updateHud(roundLimitMs);
    draw();
    state.frameId = requestAnimationFrame(tick);
  }

  function tick(now) {
    if (state.phase !== "playing") {
      return;
    }
    const remainingMs = Math.max(0, roundLimitMs - (now - state.roundStartedAt));
    updateHud(remainingMs);
    if (remainingMs <= 0) {
      finishRun("timeout");
      return;
    }
    draw();
    state.frameId = requestAnimationFrame(tick);
  }

  function handlePointer(event) {
    if (state.phase !== "playing" || !state.round) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const index = hitTest(x, y, rect.width, rect.height);
    if (index < 0) {
      return;
    }
    if (index === state.round.answerIndex) {
      const elapsedMs = performance.now() - state.roundStartedAt;
      const gained = scoreRound(state.round.spec, elapsedMs, state.combo + 1);
      state.score += gained.total;
      state.combo += 1;
      state.lastGrade = gained.grade;
      elements.feedback.textContent = `${gained.grade} +${gained.total}점`;
      state.level += 1;
      updateHud(roundLimitMs);
      window.setTimeout(startRound, 180);
    } else {
      state.revealWrongIndex = index;
      draw();
      window.setTimeout(() => finishRun("wrong"), 420);
    }
  }

  function finishRun(reason) {
    if (state.phase !== "playing") {
      return;
    }
    cancelAnimationFrame(state.frameId);
    state.phase = "result";
    const reachedLevel = state.level;
    const previousBest = state.best.score || 0;
    const isNewBest = state.score > previousBest;
    if (isNewBest) {
      state.best = {
        score: state.score,
        level: reachedLevel,
        combo: state.combo,
        updatedAt: new Date().toISOString()
      };
      saveBest(state.best);
    }
    elements.start.disabled = false;
    elements.start.textContent = "다시";
    elements.resultTitle.textContent = isNewBest ? "새 최고 기록" : resultTitle(reason, reachedLevel);
    elements.resultCopy.textContent = resultCopy(reason, reachedLevel, state.score, isNewBest);
    elements.resultLevel.textContent = `레벨 ${reachedLevel}`;
    elements.resultScore.textContent = `점수 ${state.score}`;
    elements.resultGrade.textContent = `최근 ${state.lastGrade}`;
    elements.result.hidden = false;
    updateHud(0);
    draw();
  }

  function createRound(level) {
    const spec = levelSpec(level);
    const base = safeHsv();
    const variant = variantColor(base, spec);
    const answerIndex = Math.floor(Math.random() * spec.cells);
    return {
      spec,
      baseColor: hsvToRgb(base),
      answerColor: hsvToRgb(variant),
      answerIndex
    };
  }

  function levelSpec(level) {
    let rows;
    let cols;
    if (level <= 3) {
      rows = cols = 2;
    } else if (level <= 8) {
      rows = cols = 3;
    } else if (level <= 15) {
      rows = cols = 4;
    } else if (level <= 25) {
      rows = cols = 5;
    } else if (level <= 40) {
      rows = cols = 6;
    } else if (level <= 60) {
      rows = cols = 7;
    } else {
      rows = cols = 8;
    }
    const early = clamp((level - 1) / 80, 0, 1);
    const late = clamp((level - 80) / 160, 0, 1);
    const t = Math.max(early, late);
    return {
      level,
      rows,
      cols,
      cells: rows * cols,
      hueShift: lerp(18, 0.08, t),
      saturationShift: lerp(0.117, 1 / 255, t),
      valueShift: lerp(0.105, 1 / 255, t),
      minimumChannelDistance: Math.max(1, 44 - Math.floor(level / 2))
    };
  }

  function safeHsv() {
    return {
      h: Math.random() * 360,
      s: 0.35 + Math.random() * 0.6,
      v: 0.45 + Math.random() * 0.5
    };
  }

  function variantColor(base, spec) {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const direction = Math.random() > 0.5 ? 1 : -1;
      const axes = pickAxes(spec.level);
      const variant = { ...base };
      for (const axis of axes) {
        if (axis === "h") {
          variant.h = (variant.h + spec.hueShift * direction + 360) % 360;
        } else if (axis === "s") {
          variant.s = clamp(variant.s + spec.saturationShift * direction, 0.18, 1);
        } else {
          variant.v = clamp(variant.v + spec.valueShift * direction, 0.22, 1);
        }
      }
      if (rgbDistance(hsvToRgb(base), hsvToRgb(variant)) >= spec.minimumChannelDistance) {
        return variant;
      }
    }
    return {
      h: (base.h + Math.max(2, spec.hueShift * 2)) % 360,
      s: clamp(base.s + spec.saturationShift * 2, 0.18, 1),
      v: clamp(base.v + spec.valueShift * 2, 0.22, 1)
    };
  }

  function pickAxes(level) {
    const sets = level <= 80
      ? [["h", "s"], ["h", "v"], ["s", "v"], ["h", "s", "v"], ["h", "v"]]
      : [["h"], ["s"], ["v"], ["h", "s"], ["h", "v"], ["s", "v"]];
    return sets[Math.floor(Math.random() * sets.length)];
  }

  function scoreRound(spec, elapsedMs, combo) {
    const grade = elapsedMs <= 2000 ? "PERFECT" : elapsedMs <= 5000 ? "EXCELLENT" : "COOL";
    const basePoint = 1000 + Math.min(120, spec.level * 3) + spec.cells;
    const speedRatio = Math.max(0, (roundLimitMs - elapsedMs) / roundLimitMs);
    const speedBonus = Math.round(basePoint * 0.08 * speedRatio);
    const gradeBonus = grade === "PERFECT" ? 220 : grade === "EXCELLENT" ? 120 : 50;
    const comboBonus = grade !== "COOL" && combo >= 2 ? Math.min(160, combo * 20) : 0;
    return {
      grade,
      total: basePoint + speedBonus + gradeBonus + comboBonus
    };
  }

  function draw() {
    const rect = canvas.getBoundingClientRect();
    const size = Math.max(240, Math.floor(Math.min(rect.width || 640, rect.height || 640)));
    const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    if (canvas.width !== Math.floor(size * dpr) || canvas.height !== Math.floor(size * dpr)) {
      canvas.width = Math.floor(size * dpr);
      canvas.height = Math.floor(size * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#f8fbff";
    ctx.fillRect(0, 0, size, size);

    if (!state.round) {
      return;
    }
    const { spec } = state.round;
    const gap = Math.max(5, Math.floor(size * 0.012));
    const pad = Math.max(12, Math.floor(size * 0.035));
    const cell = (size - pad * 2 - gap * (spec.cols - 1)) / spec.cols;
    for (let index = 0; index < spec.cells; index += 1) {
      const col = index % spec.cols;
      const row = Math.floor(index / spec.cols);
      const x = pad + col * (cell + gap);
      const y = pad + row * (cell + gap);
      const color = index === state.round.answerIndex ? state.round.answerColor : state.round.baseColor;
      drawTile(x, y, cell, rgbCss(color), index);
    }
  }

  function drawTile(x, y, size, fill, index) {
    ctx.fillStyle = "#243047";
    roundRect(x + 3, y + 3, size, size, 8);
    ctx.fill();
    ctx.fillStyle = fill;
    roundRect(x, y, size, size, 8);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    roundRect(x + 4, y + 4, size - 8, Math.max(8, size * 0.2), 5);
    ctx.fill();
    if (state.phase === "result" && index === state.round.answerIndex) {
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#35d7a8";
      roundRect(x + 5, y + 5, size - 10, size - 10, 8);
      ctx.stroke();
    }
    if (index === state.revealWrongIndex) {
      ctx.lineWidth = 5;
      ctx.strokeStyle = "#e95b88";
      roundRect(x + 6, y + 6, size - 12, size - 12, 8);
      ctx.stroke();
    }
  }

  function hitTest(x, y, boardWidth, boardHeight) {
    if (!state.round) {
      return -1;
    }
    const size = Math.max(240, Math.floor(Math.min(boardWidth, boardHeight)));
    const { spec } = state.round;
    const gap = Math.max(5, Math.floor(size * 0.012));
    const pad = Math.max(12, Math.floor(size * 0.035));
    const cell = (size - pad * 2 - gap * (spec.cols - 1)) / spec.cols;
    for (let index = 0; index < spec.cells; index += 1) {
      const col = index % spec.cols;
      const row = Math.floor(index / spec.cols);
      const tx = pad + col * (cell + gap);
      const ty = pad + row * (cell + gap);
      if (x >= tx && x <= tx + cell && y >= ty && y <= ty + cell) {
        return index;
      }
    }
    return -1;
  }

  function updateHud(remainingMs) {
    elements.level.textContent = String(state.level);
    elements.score.textContent = String(state.score);
    elements.combo.textContent = String(state.combo);
    elements.best.textContent = String(Math.max(state.best.score || 0, state.score));
    elements.time.textContent = (Math.max(0, remainingMs) / 1000).toFixed(1);
    elements.timeBar.style.transform = `scaleX(${clamp(remainingMs / roundLimitMs, 0, 1)})`;
  }

  function resultTitle(reason, level) {
    if (reason === "timeout") {
      return "시간 초과";
    }
    if (level >= 20) {
      return "스펙트럼 감각 좋음";
    }
    return "다시 보면 보입니다";
  }

  function resultCopy(reason, level, score, isNewBest) {
    if (isNewBest) {
      return `${score}점입니다. 이번 스프린트가 새 기준이 됐습니다.`;
    }
    if (reason === "timeout") {
      return `Lv.${level}에서 시간이 다 됐습니다. 색 차이를 빠르게 훑어보세요.`;
    }
    return `Lv.${level}에서 다른 타일을 놓쳤습니다. 모서리부터 리듬 있게 훑으면 더 안정적입니다.`;
  }

  function hsvToRgb(hsv) {
    const h = hsv.h / 60;
    const c = hsv.v * hsv.s;
    const x = c * (1 - Math.abs((h % 2) - 1));
    const m = hsv.v - c;
    let r = 0;
    let g = 0;
    let b = 0;
    if (h < 1) [r, g, b] = [c, x, 0];
    else if (h < 2) [r, g, b] = [x, c, 0];
    else if (h < 3) [r, g, b] = [0, c, x];
    else if (h < 4) [r, g, b] = [0, x, c];
    else if (h < 5) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  }

  function rgbDistance(a, b) {
    return Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
  }

  function rgbCss(color) {
    return `rgb(${color.r} ${color.g} ${color.b})`;
  }

  function roundRect(x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function lerp(from, to, t) {
    return from + (to - from) * clamp(t, 0, 1);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function loadBest() {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function saveBest(best) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(best));
    } catch (error) {
      console.warn("Could not save Color Master 2 best score", error);
    }
  }
})();
