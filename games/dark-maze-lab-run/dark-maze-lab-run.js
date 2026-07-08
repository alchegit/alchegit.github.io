(() => {
  "use strict";

  const canvas = document.getElementById("mazeCanvas");
  const ctx = canvas.getContext("2d");
  const levelValue = document.getElementById("levelValue");
  const timeValue = document.getElementById("timeValue");
  const bestValue = document.getElementById("bestValue");
  const startOverlay = document.getElementById("startOverlay");
  const resultOverlay = document.getElementById("resultOverlay");
  const resultKicker = document.getElementById("resultKicker");
  const resultTitle = document.getElementById("resultTitle");
  const resultCopy = document.getElementById("resultCopy");
  const resultButton = document.getElementById("resultButton");
  const startButton = document.getElementById("startButton");
  const lightButton = document.getElementById("lightButton");
  const lightLabel = document.getElementById("lightLabel");
  const restartButton = document.getElementById("restartButton");
  const storyButton = document.getElementById("storyButton");
  const storyOverlay = document.getElementById("storyOverlay");
  const storyImage = document.getElementById("storyImage");
  const storyClose = document.getElementById("storyClose");
  const storyPrev = document.getElementById("storyPrev");
  const storyNext = document.getElementById("storyNext");
  const storyDots = document.getElementById("storyDots");

  const storageKey = "neokim-dark-maze-lab-run:v3";
  const assetPath = (name) => `./assets/${name}`;
  const normalVisionRadius = 1.36;
  const litVisionRadius = 2.45;
  const makeImage = (name) => {
    const image = new Image();
    image.decoding = "async";
    image.src = assetPath(name);
    return image;
  };

  const floorImage = makeImage("game_floor_tile_dark_v2.webp");
  const wallImage = makeImage("maze_wall_texture_v2.webp");
  const entryImage = makeImage("maze-entry-lab-basic.png");
  const bulbImage = makeImage("item-light-bulb-gold.png");
  const storyPageSources = Array.from({ length: 5 }, (_, index) => (
    assetPath(`intro_story_page_${String(index + 1).padStart(2, "0")}.webp`)
  ));
  const ratFrames = Array.from({ length: 12 }, (_, index) => (
    makeImage(`lab-rat-walk-top-${String(index).padStart(2, "0")}.png`)
  ));

  const levels = [
    {
      name: "입구 연구실",
      timeLimit: 45,
      grid: [
        "#########",
        "#S..#...#",
        "#.#.#.#.#",
        "#.#...#.#",
        "#.#.###.#",
        "#.#.....#",
        "#.#####.#",
        "#......E#",
        "#########"
      ]
    },
    {
      name: "냉각 통로",
      timeLimit: 52,
      grid: [
        "###########",
        "#S....#...#",
        "###.#.#.#.#",
        "#...#...#.#",
        "#.#####.#.#",
        "#.#...#.#.#",
        "#.#.#.#.#.#",
        "#...#.#...#",
        "#.###.###.#",
        "#.....#..E#",
        "###########"
      ]
    },
    {
      name: "저온 배관실",
      timeLimit: 54,
      grid: [
        "#############",
        "#S......#...#",
        "###.#.#.#.#.#",
        "#.#.#.#...#.#",
        "#.#.#.#.###.#",
        "#.#.#...#E#.#",
        "#.#.###.#.#.#",
        "#.#.....#...#",
        "#.#.##.##.###",
        "#...#...#.#.#",
        "#.#.#.#.#.#.#",
        "#.#...#.....#",
        "#############"
      ]
    },
    {
      name: "표본 보관고",
      timeLimit: 58,
      grid: [
        "###############",
        "#S#.....#.....#",
        "#.###.#.#.###.#",
        "#...#.#.#.#.#.#",
        "#.#.#.#.#.#.#.#",
        "#.#...#.......#",
        "#.#####...#.###",
        "#.....#.#.#...#",
        "#.###.#.#.###.#",
        "#.....#...#.#E#",
        "#.#.#######.#.#",
        "#.#.........#.#",
        "#.###.#######.#",
        "#...#.........#",
        "###############"
      ]
    },
    {
      name: "무음 환풍로",
      timeLimit: 61,
      grid: [
        "###############",
        "#S..#.......#.#",
        "###.#####.#.#.#",
        "#.#.......#...#",
        "#.#####.#####.#",
        "#...#...#.....#",
        "#.###.#.#.#####",
        "#.....#...#..E#",
        "#.###.###.#.#.#",
        "#.#.......#.#.#",
        "#.#.#####.#.#.#",
        "#.#.#...#.#...#",
        "#.#.#.#.#.#...#",
        "#...#.#.....#.#",
        "###############"
      ]
    },
    {
      name: "보관 복도",
      timeLimit: 64,
      grid: [
        "#############",
        "#S#.....#...#",
        "#.#####.#.#.#",
        "#.....#.....#",
        "#####...#.#.#",
        "#...#...#.#.#",
        "#.#.###.###.#",
        "#.#...#.....#",
        "#.###.#####.#",
        "#.#.#.......#",
        "#.#.#.#######",
        "#..........E#",
        "#############"
      ]
    },
    {
      name: "경보 차단실",
      timeLimit: 68,
      grid: [
        "#################",
        "#S..........#...#",
        "###.#.#.###.#.###",
        "#...#.#...#.#...#",
        "#.#####.#.#.#.#.#",
        "#.#.......#...#.#",
        "#.###.###.###.#.#",
        "#.#...#.....#.#.#",
        "#.#.###.###.#.#.#",
        "#...#.#.#...#.#.#",
        "#####.#.#.###.#.#",
        "#.......#...#...#",
        "#.#########.###.#",
        "#.#....E#.#...#.#",
        "#.###.#.#.###.#.#",
        "#.....#.........#",
        "#################"
      ]
    },
    {
      name: "암전 구역",
      timeLimit: 74,
      grid: [
        "#############",
        "#S..#.......#",
        "###.#.#####.#",
        "#...#.....#.#",
        "#.#####.#.#.#",
        "#.#.....#.#.#",
        "#.#.#####.#.#",
        "#.#.....#...#",
        "#.#####.###.#",
        "#.....#...#.#",
        "###.#.###.#.#",
        "#...#.....#E#",
        "#############"
      ]
    },
    {
      name: "깜박임 홀",
      timeLimit: 78,
      grid: [
        "###############",
        "#S....#.#.....#",
        "###.#.#.#.###.#",
        "#.....#.#.#...#",
        "#.#.#.#.#.#.#.#",
        "#.#...#...#.#E#",
        "#.#.#.#.###.###",
        "#...#.#.#.#...#",
        "#.###.#.#.###.#",
        "#.#...#...#...#",
        "#.#.#####.#.###",
        "#.#.#...#.#...#",
        "#.#.#.#.#.###.#",
        "#.....#.......#",
        "###############"
      ]
    },
    {
      name: "심야 회수로",
      timeLimit: 82,
      grid: [
        "#################",
        "#S..#...#.......#",
        "###.#.#.##.##.#.#",
        "#.#.#.#.#...#...#",
        "#.#.#.#.#.#.###.#",
        "#...#.#...#...#.#",
        "#.###.#######.#.#",
        "#.#.....#...#...#",
        "#.##.##.#.#.###.#",
        "#.......#.#.#...#",
        "#####.#.#.#.###.#",
        "#...#.#...#...#.#",
        "#.###.#.#####.#.#",
        "#...#.#.#...#.#.#",
        "#.#.#.###.#.#.#.#",
        "#.#...........#E#",
        "#################"
      ]
    }
  ].map((level) => ({
    ...level,
    start: findCell(level.grid, "S"),
    exit: findCell(level.grid, "E")
  }));

  const progress = loadProgress();
  const state = {
    levelIndex: 0,
    player: { x: levels[0].start.x + 0.5, y: levels[0].start.y + 0.5 },
    pointer: { active: false, x: 0, y: 0 },
    lastMove: { x: 0, y: 1 },
    started: false,
    resultOpen: false,
    storyOpen: false,
    lightCharges: 1,
    lightTimer: 0,
    timeLeft: levels[0].timeLimit,
    sessionSeconds: 0,
    frame: 0,
    bumpTimer: 0,
    particles: [],
    trail: [],
    pawSide: -1,
    storyIndex: 0,
    lastTick: performance.now(),
    view: { width: 0, height: 0, cell: 1, offsetX: 0, offsetY: 0 },
    resultAction: () => {}
  };

  startButton.addEventListener("click", startRun);
  restartButton.addEventListener("click", startRun);
  resultButton.addEventListener("click", () => {
    const action = state.resultAction;
    resultOverlay.hidden = true;
    state.resultOpen = false;
    action();
  });

  lightButton.addEventListener("click", () => {
    if (!state.started || state.resultOpen || state.lightCharges <= 0) {
      return;
    }

    state.lightCharges -= 1;
    state.lightTimer = 3.1;
    addSpark(state.player.x, state.player.y, 10, "#ffd166");
    updateHud();
  });

  canvas.addEventListener("pointerdown", (event) => {
    if (!state.started || state.resultOpen) {
      return;
    }

    event.preventDefault();
    state.pointer.active = true;
    updatePointer(event);

    try {
      canvas.setPointerCapture(event.pointerId);
    } catch (error) {
      // Some embedded browsers do not expose pointer capture.
    }
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!state.pointer.active || !state.started || state.resultOpen) {
      return;
    }

    event.preventDefault();
    updatePointer(event);
  });

  canvas.addEventListener("pointerup", releasePointer);
  canvas.addEventListener("pointercancel", releasePointer);
  window.addEventListener("resize", resizeCanvas);
  storyButton.addEventListener("click", openStory);
  storyClose.addEventListener("click", closeStory);
  storyPrev.addEventListener("click", showPreviousStoryPage);
  storyNext.addEventListener("click", showNextStoryPage);
  storyImage.addEventListener("click", (event) => {
    const rect = storyImage.getBoundingClientRect();
    if (event.clientX - rect.left >= rect.width / 2) {
      showNextStoryPage();
    } else {
      showPreviousStoryPage();
    }
  });
  storyOverlay.addEventListener("click", (event) => {
    if (event.target === storyOverlay) {
      closeStory();
    }
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.storyOpen) {
      closeStory();
    }
  });

  updateHud();
  requestAnimationFrame(tick);

  function findCell(grid, marker) {
    for (let y = 0; y < grid.length; y += 1) {
      const x = grid[y].indexOf(marker);
      if (x !== -1) {
        return { x, y };
      }
    }
    return { x: 1, y: 1 };
  }

  function loadProgress() {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return {
        bestSeconds: Number.isFinite(Number(parsed.bestSeconds)) ? Number(parsed.bestSeconds) : null,
        clears: Number.isFinite(Number(parsed.clears)) ? Number(parsed.clears) : 0
      };
    } catch (error) {
      return { bestSeconds: null, clears: 0 };
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(progress));
    } catch (error) {
      // Local records are optional on locked-down browsers.
    }
  }

  function openStory() {
    state.storyOpen = true;
    state.pointer.active = false;
    state.storyIndex = 0;
    storyOverlay.hidden = false;
    renderStoryPage();
  }

  function closeStory() {
    state.storyOpen = false;
    storyOverlay.hidden = true;
    state.lastTick = performance.now();
  }

  function showNextStoryPage() {
    if (state.storyIndex >= storyPageSources.length - 1) {
      closeStory();
      return;
    }
    state.storyIndex += 1;
    renderStoryPage();
  }

  function showPreviousStoryPage() {
    state.storyIndex = Math.max(0, state.storyIndex - 1);
    renderStoryPage();
  }

  function renderStoryPage() {
    storyImage.src = storyPageSources[state.storyIndex];
    storyDots.replaceChildren(...storyPageSources.map((_, index) => {
      const dot = document.createElement("span");
      if (index === state.storyIndex) {
        dot.className = "is-active";
      }
      return dot;
    }));
  }

  function startRun() {
    startOverlay.hidden = true;
    resultOverlay.hidden = true;
    state.sessionSeconds = 0;
    startLevel(0);
  }

  function startLevel(index) {
    const level = levels[index];
    state.levelIndex = index;
    state.started = true;
    state.resultOpen = false;
    state.pointer.active = false;
    state.player.x = level.start.x + 0.5;
    state.player.y = level.start.y + 0.5;
    state.lastMove.x = 0;
    state.lastMove.y = 1;
    state.timeLeft = level.timeLimit;
    state.lightCharges = 1;
    state.lightTimer = 0;
    state.bumpTimer = 0;
    state.particles = [];
    state.pawSide = -1;
    state.trail = [{
      x: state.player.x,
      y: state.player.y,
      life: 1,
      direction: Math.PI / 2,
      side: state.pawSide
    }];
    state.lastTick = performance.now();
    updateHud();
  }

  function tick(now) {
    const dt = Math.min(0.05, Math.max(0, (now - state.lastTick) / 1000 || 0));
    state.lastTick = now;

    if (state.started && !state.resultOpen && !state.storyOpen) {
      updateGame(dt);
    } else {
      updateParticles(dt);
    }

    render();
    requestAnimationFrame(tick);
  }

  function updateGame(dt) {
    state.timeLeft = Math.max(0, state.timeLeft - dt);
    state.lightTimer = Math.max(0, state.lightTimer - dt);
    state.bumpTimer = Math.max(0, state.bumpTimer - dt);

    movePlayer(dt);
    updateParticles(dt);
    updateTrail(dt);

    const level = levels[state.levelIndex];
    const exitX = level.exit.x + 0.5;
    const exitY = level.exit.y + 0.5;
    if (Math.hypot(state.player.x - exitX, state.player.y - exitY) < 0.43) {
      completeLevel();
      return;
    }

    if (state.timeLeft <= 0) {
      failLevel();
      return;
    }

    updateHud();
  }

  function movePlayer(dt) {
    if (!state.pointer.active) {
      return;
    }

    const dx = state.pointer.x - state.player.x;
    const dy = state.pointer.y - state.player.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 0.08) {
      return;
    }

    const speed = state.lightTimer > 0 ? 3.05 : 2.62;
    const step = Math.min(speed * dt, distance);
    const vx = (dx / distance) * step;
    const vy = (dy / distance) * step;
    const movedX = tryMove(vx, 0);
    const movedY = tryMove(0, vy);

    if (!movedX && Math.abs(vx) > 0.001) {
      bump();
    }
    if (!movedY && Math.abs(vy) > 0.001) {
      bump();
    }

    if (movedX || movedY) {
      state.lastMove.x = dx / distance;
      state.lastMove.y = dy / distance;
      state.frame += distance * 0.38;
    }
  }

  function tryMove(dx, dy) {
    const nextX = state.player.x + dx;
    const nextY = state.player.y + dy;

    if (isWalkablePosition(nextX, nextY)) {
      state.player.x = nextX;
      state.player.y = nextY;
      return true;
    }

    return false;
  }

  function bump() {
    if (state.bumpTimer <= 0) {
      state.bumpTimer = 0.12;
      addSpark(state.player.x, state.player.y, 4, "#76c7ff");
    }
  }

  function isWalkablePosition(x, y) {
    const radius = 0.23;
    const probes = [
      [x - radius, y - radius],
      [x + radius, y - radius],
      [x - radius, y + radius],
      [x + radius, y + radius]
    ];
    return probes.every(([px, py]) => isWalkableCell(Math.floor(px), Math.floor(py)));
  }

  function isWalkableCell(x, y) {
    const level = levels[state.levelIndex];
    const row = level.grid[y];
    if (!row || x < 0 || x >= row.length) {
      return false;
    }
    return row[x] !== "#";
  }

  function completeLevel() {
    const level = levels[state.levelIndex];
    const spent = level.timeLimit - state.timeLeft;
    state.sessionSeconds += spent;
    state.pointer.active = false;
    addSpark(level.exit.x + 0.5, level.exit.y + 0.5, 18, "#6ee7bc");

    if (state.levelIndex === levels.length - 1) {
      const total = state.sessionSeconds;
      const isBest = progress.bestSeconds === null || total < progress.bestSeconds;
      if (isBest) {
        progress.bestSeconds = total;
      }
      progress.clears += 1;
      saveProgress();
      showResult(
        isBest ? "Best" : "Clear",
        isBest ? "최고 기록으로 탈출" : "연구소 탈출 성공",
        `${formatClock(total)} 만에 모든 미로를 통과했습니다.`,
        "처음부터",
        () => {
          state.started = false;
          startOverlay.hidden = false;
          updateHud();
        }
      );
      return;
    }

    showResult(
      "Clear",
      `${level.name} 통과`,
      `${formatClock(spent)} 만에 다음 구역 문이 열렸습니다.`,
      "다음 미로",
      () => startLevel(state.levelIndex + 1)
    );
  }

  function failLevel() {
    state.pointer.active = false;
    showResult(
      "Time Up",
      "출구 불빛을 놓쳤습니다",
      "같은 미로에서 바로 다시 시작합니다.",
      "재도전",
      () => startLevel(state.levelIndex)
    );
  }

  function showResult(kicker, title, copy, buttonText, action) {
    state.resultOpen = true;
    resultKicker.textContent = kicker;
    resultTitle.textContent = title;
    resultCopy.textContent = copy;
    resultButton.textContent = buttonText;
    state.resultAction = action;
    resultOverlay.hidden = false;
    updateHud();
  }

  function releasePointer(event) {
    state.pointer.active = false;
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch (error) {
      // Pointer capture may already be released.
    }
  }

  function updatePointer(event) {
    const rect = canvas.getBoundingClientRect();
    const level = levels[state.levelIndex];
    const metrics = getMetrics(rect.width, rect.height, level);
    const x = (event.clientX - rect.left - metrics.offsetX) / metrics.cell;
    const y = (event.clientY - rect.top - metrics.offsetY) / metrics.cell;
    state.pointer.x = clamp(x, 0.5, level.grid[0].length - 0.5);
    state.pointer.y = clamp(y, 0.5, level.grid.length - 0.5);
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const size = Math.max(280, Math.floor(Math.min(rect.width, rect.height || rect.width)));
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const pixelSize = Math.floor(size * dpr);

    if (canvas.width !== pixelSize || canvas.height !== pixelSize) {
      canvas.width = pixelSize;
      canvas.height = pixelSize;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      state.view.width = size;
      state.view.height = size;
    }
  }

  function getMetrics(width, height, level) {
    const rows = level.grid.length;
    const cols = level.grid[0].length;
    const cell = Math.floor(Math.min(width / cols, height / rows));
    const boardWidth = cell * cols;
    const boardHeight = cell * rows;
    return {
      cell,
      offsetX: (width - boardWidth) / 2,
      offsetY: (height - boardHeight) / 2,
      width: boardWidth,
      height: boardHeight
    };
  }

  function render() {
    resizeCanvas();

    const level = levels[state.levelIndex];
    const width = state.view.width || canvas.getBoundingClientRect().width;
    const height = state.view.height || width;
    const metrics = getMetrics(width, height, level);
    state.view = { width, height, ...metrics };

    ctx.clearRect(0, 0, width, height);
    drawBackground(width, height);
    drawMaze(level, metrics);
    drawExit(level, metrics);
    drawControlLine(metrics);
    drawDarkness(metrics);
    drawLocalMazeOutlines(level, metrics);
    drawExitBeacon(level, metrics);
    drawParticles(metrics);
    drawTrail(metrics);
    drawRat(metrics);
    drawLightBadge(metrics);
  }

  function drawBackground(width, height) {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#111823");
    gradient.addColorStop(1, "#262230");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  function drawMaze(level, metrics) {
    ctx.save();
    ctx.translate(metrics.offsetX, metrics.offsetY);
    for (let y = 0; y < level.grid.length; y += 1) {
      for (let x = 0; x < level.grid[y].length; x += 1) {
        const cellX = x * metrics.cell;
        const cellY = y * metrics.cell;
        drawImageCell(floorImage, cellX, cellY, metrics.cell, "#242b35");
        if (level.grid[y][x] === "#") {
          drawImageCell(wallImage, cellX, cellY, metrics.cell, "#0d1119");
          ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
          ctx.fillRect(cellX, cellY + metrics.cell * 0.72, metrics.cell, metrics.cell * 0.28);
        }
      }
    }
    ctx.restore();

    drawStart(level, metrics);
  }

  function drawImageCell(image, x, y, size, fallback) {
    ctx.fillStyle = fallback;
    ctx.fillRect(x, y, size, size);
    if (image.complete && image.naturalWidth > 0) {
      ctx.drawImage(image, x, y, size, size);
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.035)";
    ctx.strokeRect(x + 0.5, y + 0.5, size - 1, size - 1);
  }

  function drawStart(level, metrics) {
    const x = metrics.offsetX + level.start.x * metrics.cell;
    const y = metrics.offsetY + level.start.y * metrics.cell;
    if (entryImage.complete && entryImage.naturalWidth > 0) {
      ctx.drawImage(entryImage, x, y, metrics.cell, metrics.cell);
    }
    ctx.strokeStyle = "rgba(118, 199, 255, 0.72)";
    ctx.lineWidth = Math.max(2, metrics.cell * 0.07);
    ctx.strokeRect(x + metrics.cell * 0.18, y + metrics.cell * 0.18, metrics.cell * 0.64, metrics.cell * 0.64);
  }

  function drawTrail(metrics) {
    ctx.save();
    for (const point of state.trail) {
      const pos = toPixel(point.x, point.y, metrics);
      const alpha = point.life * point.life * 0.94;
      const size = clamp(metrics.cell * 0.27, 14, 24);
      drawMousePawPrint(pos.x, pos.y, point.direction, point.side, size, alpha);
    }
    ctx.restore();
  }

  function drawMousePawPrint(x, y, direction, side, size, alpha) {
    const nx = -Math.sin(direction);
    const ny = Math.cos(direction);
    const pawX = x + nx * side * size * 0.34;
    const pawY = y + ny * side * size * 0.34;

    ctx.save();
    ctx.translate(pawX, pawY);
    ctx.rotate(direction);
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = alpha;
    ctx.shadowColor = "rgba(67, 255, 220, 0.86)";
    ctx.shadowBlur = size * 0.72;

    ctx.fillStyle = "rgba(56, 255, 213, 0.24)";
    ctx.beginPath();
    ctx.ellipse(-size * 0.04, 0, size * 0.5, size * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(170, 255, 214, 0.92)";
    ctx.beginPath();
    ctx.ellipse(-size * 0.15, 0, size * 0.22, size * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = size * 0.48;
    ctx.fillStyle = "rgba(221, 255, 247, 0.96)";
    for (let i = 0; i < 3; i += 1) {
      const toeY = (i - 1) * size * 0.19;
      const toeX = size * (0.2 + (i === 1 ? 0.05 : -0.02));
      ctx.beginPath();
      ctx.arc(toeX, toeY, size * 0.078, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = alpha * 0.42;
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(204, 255, 239, 0.78)";
    ctx.lineWidth = Math.max(1, size * 0.08);
    ctx.beginPath();
    ctx.ellipse(-size * 0.13, 0, size * 0.2, size * 0.145, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  function drawExit(level, metrics) {
    const x = metrics.offsetX + level.exit.x * metrics.cell;
    const y = metrics.offsetY + level.exit.y * metrics.cell;
    const cx = x + metrics.cell * 0.5;
    const cy = y + metrics.cell * 0.5;
    const glow = ctx.createRadialGradient(cx, cy, metrics.cell * 0.08, cx, cy, metrics.cell * 0.9);
    glow.addColorStop(0, "rgba(110, 231, 188, 0.88)");
    glow.addColorStop(1, "rgba(110, 231, 188, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - metrics.cell * 0.7, y - metrics.cell * 0.7, metrics.cell * 2.4, metrics.cell * 2.4);

    ctx.fillStyle = "#6ee7bc";
    ctx.fillRect(x + metrics.cell * 0.25, y + metrics.cell * 0.25, metrics.cell * 0.5, metrics.cell * 0.5);
    ctx.strokeStyle = "#080a10";
    ctx.lineWidth = Math.max(2, metrics.cell * 0.07);
    ctx.strokeRect(x + metrics.cell * 0.25, y + metrics.cell * 0.25, metrics.cell * 0.5, metrics.cell * 0.5);
  }

  function drawControlLine(metrics) {
    if (!state.pointer.active) {
      return;
    }

    const start = toPixel(state.player.x, state.player.y, metrics);
    const end = toPixel(state.pointer.x, state.pointer.y, metrics);
    ctx.save();
    ctx.strokeStyle = "rgba(110, 231, 188, 0.76)";
    ctx.lineWidth = Math.max(3, metrics.cell * 0.075);
    ctx.setLineDash([metrics.cell * 0.18, metrics.cell * 0.12]);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.restore();
  }

  function drawRat(metrics) {
    const position = toPixel(state.player.x, state.player.y, metrics);
    const size = metrics.cell * 0.86;
    const frameIndex = Math.floor(state.frame) % ratFrames.length;
    const image = ratFrames[frameIndex];
    const angle = Math.atan2(state.lastMove.y, state.lastMove.x) - Math.PI / 2;
    const shake = state.bumpTimer > 0 ? Math.sin(state.bumpTimer * 90) * metrics.cell * 0.025 : 0;

    ctx.save();
    ctx.translate(position.x + shake, position.y);
    ctx.rotate(angle);
    if (image.complete && image.naturalWidth > 0) {
      ctx.drawImage(image, -size / 2, -size / 2, size, size);
    } else {
      ctx.fillStyle = "#d8d1c6";
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.34, size * 0.44, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#080a10";
      ctx.lineWidth = Math.max(2, metrics.cell * 0.05);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawDarkness(metrics) {
    const position = toPixel(state.player.x, state.player.y, metrics);
    const vision = getVisionRadius();
    const radius = metrics.cell * vision;
    const darkness = 1;

    ctx.save();
    ctx.fillStyle = `rgba(5, 7, 13, ${darkness})`;
    ctx.fillRect(0, 0, state.view.width, state.view.height);
    ctx.globalCompositeOperation = "destination-out";
    const beam = ctx.createRadialGradient(position.x, position.y, metrics.cell * 0.2, position.x, position.y, radius);
    beam.addColorStop(0, "rgba(0, 0, 0, 1)");
    beam.addColorStop(0.46, "rgba(0, 0, 0, 0.95)");
    beam.addColorStop(0.78, "rgba(0, 0, 0, 0.36)");
    beam.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    const glow = ctx.createRadialGradient(position.x, position.y, metrics.cell * 0.22, position.x, position.y, radius * 1.08);
    glow.addColorStop(0, "rgba(118, 199, 255, 0.14)");
    glow.addColorStop(0.58, "rgba(118, 199, 255, 0.045)");
    glow.addColorStop(1, "rgba(118, 199, 255, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(position.x, position.y, radius * 1.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawExitBeacon(level, metrics) {
    if (!state.started) {
      return;
    }

    const dist = Math.hypot(state.player.x - (level.exit.x + 0.5), state.player.y - (level.exit.y + 0.5));
    const visibleDistance = getVisionRadius();
    const visible = dist < visibleDistance;
    if (!visible) {
      return;
    }

    const pulse = 0.65 + Math.sin(performance.now() / 160) * 0.25;
    const pos = toPixel(level.exit.x + 0.5, level.exit.y + 0.5, metrics);
    ctx.save();
    ctx.globalAlpha = Math.max(0.12, (visibleDistance - dist) / visibleDistance) * pulse;
    ctx.strokeStyle = "#6ee7bc";
    ctx.lineWidth = Math.max(3, metrics.cell * 0.08);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, metrics.cell * 0.42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawLocalMazeOutlines(level, metrics) {
    const radius = getVisionRadius();
    const edgeReach = radius + 0.35;
    const radiusSquared = edgeReach * edgeReach;

    ctx.save();
    ctx.translate(metrics.offsetX, metrics.offsetY);
    for (let y = 0; y < level.grid.length; y += 1) {
      for (let x = 0; x < level.grid[y].length; x += 1) {
        const cx = x + 0.5;
        const cy = y + 0.5;
        const dx = cx - state.player.x;
        const dy = cy - state.player.y;
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared > radiusSquared) {
          continue;
        }

        const distance = Math.sqrt(distanceSquared);
        const strength = clamp(1 - distance / edgeReach, 0, 1);
        const cellX = x * metrics.cell;
        const cellY = y * metrics.cell;
        const isWall = level.grid[y][x] === "#";

        if (isWall) {
          ctx.fillStyle = `rgba(6, 13, 20, ${0.66 * strength})`;
          ctx.fillRect(cellX + 1, cellY + 1, metrics.cell - 2, metrics.cell - 2);
          ctx.strokeStyle = `rgba(94, 164, 214, ${0.82 * strength})`;
          ctx.lineWidth = Math.max(2, metrics.cell * 0.05);
          ctx.strokeRect(cellX + metrics.cell * 0.04, cellY + metrics.cell * 0.04, metrics.cell * 0.92, metrics.cell * 0.92);
          ctx.strokeStyle = `rgba(2, 7, 12, ${0.78 * strength})`;
          ctx.lineWidth = Math.max(1, metrics.cell * 0.018);
          ctx.strokeRect(cellX + metrics.cell * 0.14, cellY + metrics.cell * 0.14, metrics.cell * 0.72, metrics.cell * 0.72);
        } else {
          ctx.fillStyle = `rgba(31, 54, 47, ${0.38 * strength})`;
          ctx.fillRect(cellX + metrics.cell * 0.05, cellY + metrics.cell * 0.05, metrics.cell * 0.9, metrics.cell * 0.9);
          ctx.strokeStyle = `rgba(119, 232, 188, ${0.32 * strength})`;
          ctx.lineWidth = Math.max(1, metrics.cell * 0.018);
          ctx.strokeRect(cellX + metrics.cell * 0.12, cellY + metrics.cell * 0.12, metrics.cell * 0.76, metrics.cell * 0.76);
          ctx.strokeStyle = `rgba(255, 236, 174, ${0.08 * strength})`;
          ctx.beginPath();
          ctx.moveTo(cellX + metrics.cell * 0.2, cellY + metrics.cell * 0.5);
          ctx.lineTo(cellX + metrics.cell * 0.8, cellY + metrics.cell * 0.5);
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  function getVisionRadius() {
    return state.lightTimer > 0 ? litVisionRadius : normalVisionRadius;
  }

  function drawLightBadge(metrics) {
    if (state.lightTimer <= 0 || !bulbImage.complete || bulbImage.naturalWidth === 0) {
      return;
    }

    const size = metrics.cell * 0.58;
    ctx.save();
    ctx.globalAlpha = 0.94;
    ctx.drawImage(bulbImage, state.view.width - size - 14, 14, size, size);
    ctx.restore();
  }

  function addSpark(x, y, count, color) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1.5;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.45 + Math.random() * 0.35,
        maxLife: 0.8,
        color
      });
    }
  }

  function updateParticles(dt) {
    state.particles = state.particles
      .map((particle) => ({
        ...particle,
        x: particle.x + particle.vx * dt,
        y: particle.y + particle.vy * dt,
        life: particle.life - dt
      }))
      .filter((particle) => particle.life > 0);
  }

  function drawParticles(metrics) {
    ctx.save();
    for (const particle of state.particles) {
      const pos = toPixel(particle.x, particle.y, metrics);
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, Math.max(2, metrics.cell * 0.045), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function updateTrail(dt) {
    state.trail = state.trail
      .map((point) => ({ ...point, life: point.life - dt / 2.35 }))
      .filter((point) => point.life > 0);

    const last = state.trail[state.trail.length - 1];
    if (!last || Math.hypot(last.x - state.player.x, last.y - state.player.y) > 0.52) {
      const direction = Math.atan2(state.lastMove.y, state.lastMove.x);
      state.pawSide *= -1;
      state.trail.push({
        x: state.player.x - Math.cos(direction) * 0.16,
        y: state.player.y - Math.sin(direction) * 0.16,
        life: 1,
        direction,
        side: state.pawSide
      });
    }

    if (state.trail.length > 10) {
      state.trail.shift();
    }
  }

  function toPixel(x, y, metrics) {
    return {
      x: metrics.offsetX + x * metrics.cell,
      y: metrics.offsetY + y * metrics.cell
    };
  }

  function updateHud() {
    levelValue.textContent = `${state.levelIndex + 1} / ${levels.length}`;
    timeValue.textContent = state.timeLeft.toFixed(1);
    bestValue.textContent = progress.bestSeconds === null ? "--" : formatClock(progress.bestSeconds);

    const canUseLight = state.started && !state.resultOpen && state.lightCharges > 0;
    lightButton.disabled = !canUseLight;
    if (state.lightTimer > 0) {
      lightLabel.textContent = "조명 켜짐";
    } else if (state.lightCharges > 0) {
      lightLabel.textContent = "조명";
    } else {
      lightLabel.textContent = "조명 없음";
    }
  }

  function formatClock(seconds) {
    const total = Math.max(0, seconds);
    const minutes = Math.floor(total / 60);
    const rest = total - minutes * 60;
    if (minutes > 0) {
      return `${minutes}:${String(rest.toFixed(1)).padStart(4, "0")}`;
    }
    return `${rest.toFixed(1)}초`;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
})();
