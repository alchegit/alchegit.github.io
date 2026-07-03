(() => {
  const canvas = document.getElementById("brickCanvas");
  const ctx = canvas.getContext("2d");
  const scoreValue = document.getElementById("scoreValue");
  const jellyValue = document.getElementById("jellyValue");
  const ballValue = document.getElementById("ballValue");
  const comboValue = document.getElementById("comboValue");
  const missionValue = document.getElementById("missionValue");
  const bestValue = document.getElementById("bestValue");
  const hintText = document.getElementById("hintText");
  const restartButton = document.getElementById("restartButton");
  const overlayRestartButton = document.getElementById("overlayRestartButton");
  const resultOverlay = document.getElementById("resultOverlay");
  const resultKicker = document.getElementById("resultKicker");
  const resultTitle = document.getElementById("resultTitle");
  const resultCopy = document.getElementById("resultCopy");
  const prevStageButton = document.getElementById("prevStageButton");
  const nextStageButton = document.getElementById("nextStageButton");
  const stageLabel = document.getElementById("stageLabel");
  const decorateButton = document.getElementById("decorateButton");
  const shareResultButton = document.getElementById("shareResultButton");
  const resultLikeButton = document.getElementById("resultLikeButton");

  const width = canvas.width;
  const height = canvas.height;
  const colors = [
    { id: "berry", label: "분홍", value: "#e95b88" },
    { id: "lemon", label: "노랑", value: "#ffd85a" },
    { id: "mint", label: "민트", value: "#35d7a8" },
    { id: "grape", label: "보라", value: "#8f78ff" },
    { id: "sky", label: "하늘", value: "#69c8ff" }
  ];
  const powerupTypes = {
    wide: { label: "W", color: "#35d7a8", name: "넓은 패들" },
    slow: { label: "S", color: "#69c8ff", name: "느린 구슬" },
    split: { label: "x2", color: "#ffd85a", name: "쌍둥이 구슬" },
    magnet: { label: "M", color: "#e95b88", name: "자석 패들" }
  };
  const missionTemplates = [
    { id: "combo8", type: "combo", label: "콤보 8", target: 8 },
    { id: "berry6", type: "color", label: "분홍 6", target: 6, colorId: "berry" },
    { id: "power2", type: "powerup", label: "아이템 2", target: 2 },
    { id: "hard4", type: "hard", label: "단단 4", target: 4 }
  ];
  const keys = { left: false, right: false };
  const totalBricks = 30;
  const progressStorageKey = "jellyBrickShopProgress:v1";
  const likedResultsStorageKey = "jellyBrickLikedResults:v1";
  const stagePresets = [
    { id: "daily-mix", name: "오늘 진열", order: [], hardRows: [0], moverRows: [2], difficulty: 1, rewardMul: 1 },
    { id: "berry-order", name: "베리 주문", order: ["berry", "lemon", "mint"], hardRows: [1], moverRows: [3], difficulty: 2, rewardMul: 1.12 },
    { id: "sky-order", name: "하늘 주문", order: ["sky", "grape", "berry"], hardRows: [0, 2], moverRows: [1], difficulty: 3, rewardMul: 1.22 },
    { id: "one-ball", name: "한 구슬 도전", order: [], hardRows: [0, 1], moverRows: [2, 3], oneBall: true, difficulty: 4, rewardMul: 1.35 }
  ];

  let state;
  let nextBallId = 1;

  function resetGame() {
    const progress = loadProgress();
    const stageIndex = clamp(Number(progress.selectedStageIndex || 0), 0, stagePresets.length - 1);
    const stage = stagePresets[stageIndex];
    nextBallId = 1;
    state = {
      active: true,
      finished: false,
      stage,
      stageIndex,
      lastTime: performance.now(),
      score: 0,
      lives: 3,
      lostBalls: 0,
      combo: 0,
      bestComboThisRun: 0,
      edgeShotReady: false,
      angleCombos: 0,
      cleared: 0,
      orderQueue: stage.order.slice(),
      decorateMode: false,
      dragShelf: null,
      paddle: { x: 340, y: 456, w: 120, h: 18, targetX: 340, flash: 0 },
      balls: [makeBall()],
      bricks: makeBricks(stage),
      powerups: [],
      activePowerups: { wide: 0, slow: 0, magnet: 0 },
      pops: [],
      shelf: { ...emptyShelf(), ...progress.shelf },
      progress,
      mission: makeMission(progress),
      currentResultCode: "",
      resultRecord: null,
      hint: `${stage.name} 진열`
    };
    resultOverlay.hidden = true;
    renderStageControls();
    syncResultButtons();
    updateHud();
  }

  function makeBall(x = 400, y = 430, vx = 155, vy = -210) {
    return { id: nextBallId += 1, x, y, vx, vy, r: 10 };
  }

  function makeBricks(stage = stagePresets[0]) {
    const bricks = [];
    const cols = 6;
    const rows = 5;
    const brickW = 90;
    const brickH = 28;
    const gap = 10;
    const startX = (width - cols * brickW - (cols - 1) * gap) / 2;
    const startY = 72;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const color = colors[(row + col) % colors.length];
        let kind = "normal";
        let hp = 1;
        let vx = 0;
        let powerup = null;

        if (stage.hardRows.includes(row) && col % 2 === 1) {
          kind = "hard";
          hp = 2;
        } else if (stage.moverRows.includes(row) && col % 3 === 0) {
          kind = "mover";
          vx = col === 0 ? 34 : -34;
        }

        if ((row * cols + col + dailySeed()) % 7 === 0) {
          powerup = Object.keys(powerupTypes)[(row + col + dailySeed()) % Object.keys(powerupTypes).length];
          if (kind === "normal") {
            kind = "crate";
          }
        }

        bricks.push({
          x: startX + col * (brickW + gap),
          y: startY + row * (brickH + gap),
          baseX: startX + col * (brickW + gap),
          w: brickW,
          h: brickH,
          colorId: color.id,
          color: color.value,
          kind,
          hp,
          maxHp: hp,
          vx,
          powerup,
          alive: true
        });
      }
    }
    return bricks;
  }

  function emptyShelf() {
    return colors.reduce((shelf, color) => {
      shelf[color.id] = 0;
      return shelf;
    }, {});
  }

  function loadProgress() {
    try {
      const parsed = JSON.parse(localStorage.getItem(progressStorageKey) || "{}");
      return {
        bestScore: Number(parsed.bestScore || 0),
        bestCombo: Number(parsed.bestCombo || 0),
        shelf: { ...emptyShelf(), ...(parsed.shelf || {}) },
        completedMissionDays: Array.isArray(parsed.completedMissionDays) ? parsed.completedMissionDays : [],
        selectedStageIndex: clamp(Number(parsed.selectedStageIndex || 0), 0, stagePresets.length - 1),
        stageBest: typeof parsed.stageBest === "object" && parsed.stageBest ? parsed.stageBest : {},
        oneBallClears: Array.isArray(parsed.oneBallClears) ? parsed.oneBallClears : [],
        shelfLayout: Array.isArray(parsed.shelfLayout)
          ? parsed.shelfLayout.filter((id) => colors.some((color) => color.id === id))
          : colors.map((color) => color.id),
        shelfPositions: normalizeShelfPositions(parsed.shelfPositions, parsed.shelfLayout),
        resultStats: normalizeResultStats(parsed.resultStats),
        lastResultCode: typeof parsed.lastResultCode === "string" ? parsed.lastResultCode : ""
      };
    } catch {
      return {
        bestScore: 0,
        bestCombo: 0,
        shelf: emptyShelf(),
        completedMissionDays: [],
        selectedStageIndex: 0,
        stageBest: {},
        oneBallClears: [],
        shelfLayout: colors.map((color) => color.id),
        shelfPositions: normalizeShelfPositions(null, null),
        resultStats: {},
        lastResultCode: ""
      };
    }
  }

  function saveProgress() {
    state.progress.bestScore = Math.max(state.progress.bestScore, Math.round(state.score));
    state.progress.bestCombo = Math.max(state.progress.bestCombo, state.bestComboThisRun);
    state.progress.shelf = { ...state.shelf };
    state.progress.selectedStageIndex = state.stageIndex;
    state.progress.stageBest[state.stage.id] = Math.max(Number(state.progress.stageBest[state.stage.id] || 0), Math.round(state.score));
    if (state.stage.oneBall && state.lostBalls === 0 && state.cleared >= totalBricks && !state.progress.oneBallClears.includes(state.stage.id)) {
      state.progress.oneBallClears.push(state.stage.id);
    }
    state.progress.shelfLayout = normalizeShelfLayout(state.progress.shelfLayout);
    state.progress.shelfPositions = normalizeShelfPositions(state.progress.shelfPositions, state.progress.shelfLayout);
    state.progress.resultStats = normalizeResultStats(state.progress.resultStats);
    localStorage.setItem(progressStorageKey, JSON.stringify(state.progress));
  }

  function makeMission(progress) {
    const template = missionTemplates[dailySeed() % missionTemplates.length];
    const dayId = missionDayId(template.id);

    return {
      ...template,
      progress: 0,
      complete: progress.completedMissionDays.includes(dayId),
      dayId
    };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function addScore(baseScore) {
    const earned = Math.round(baseScore * Number(state.stage.rewardMul || 1));
    state.score += earned;
    return earned;
  }

  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (width / rect.width),
      y: (event.clientY - rect.top) * (height / rect.height)
    };
  }

  function updateHud() {
    scoreValue.textContent = String(Math.round(state.score));
    jellyValue.textContent = `${state.cleared}/${totalBricks}`;
    ballValue.textContent = String(state.lives + Math.max(0, state.balls.length - 1));
    comboValue.textContent = String(state.combo);
    missionValue.textContent = state.mission.complete
      ? "완료"
      : `${Math.min(state.mission.progress, state.mission.target)}/${state.mission.target}`;
    bestValue.textContent = String(state.progress.bestScore);
    stageLabel.textContent = `${state.stageIndex + 1}/${stagePresets.length} D${state.stage.difficulty}`;
    hintText.textContent = state.hint;
  }

  function finishGame(won) {
    if (state.finished) {
      return;
    }

    state.active = false;
    state.finished = true;
    resultOverlay.hidden = false;

    if (won) {
      const bonus = addScore(state.lives * 180 + state.combo * 12 + state.balls.length * 40);
      const result = syncResultRecord(true);
      resultKicker.textContent = "Shop Clear";
      resultTitle.textContent = "젤리 진열 완료!";
      resultCopy.textContent =
        `남은 구슬 보너스 ${bonus}점을 더해 ${Math.round(state.score)}점을 기록했어요. ` +
        `최고 콤보는 ${state.bestComboThisRun}, 카드 ${result.code}, 응원 ${result.record.likes}입니다.`;
    } else {
      const result = syncResultRecord(false);
      resultKicker.textContent = "Shop Closed";
      resultTitle.textContent = "오늘 진열 마감";
      resultCopy.textContent =
        `${state.cleared}/${totalBricks}개 젤리를 정리했어요. ` +
        `카드 ${result.code}, 응원 ${result.record.likes}. 아이템 젤리를 먼저 노리면 다음 시도가 훨씬 부드러워집니다.`;
    }

    saveProgress();
    syncResultButtons();
    updateHud();
  }

  function addPop(x, y, color, strength = 1) {
    const count = Math.round(10 * strength);
    for (let i = 0; i < count; i += 1) {
      state.pops.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 125 * strength,
        vy: (Math.random() - 0.8) * 120 * strength,
        life: 0.65,
        maxLife: 0.65,
        color
      });
    }
  }

  function resetBall() {
    state.balls = [makeBall()];
    state.combo = 0;
    state.paddle.x = 340;
    state.paddle.targetX = 340;
    state.paddle.flash = 0;
    state.hint = state.lives > 0
      ? "새 설탕 구슬입니다. 아이템 젤리와 움직이는 젤리를 먼저 살펴보세요."
      : "구슬을 모두 사용했습니다.";
    updateHud();
  }

  function hitPaddle(ball) {
    const paddle = state.paddle;
    const center = paddle.x + paddle.w / 2;
    const offset = clamp((ball.x - center) / (paddle.w / 2), -1, 1);
    const edge = Math.abs(offset);
    const edgeShot = edge > 0.68;
    const speedLimit = state.activePowerups.slow > 0 ? 285 : 360;
    const speed = Math.min(speedLimit + (edgeShot ? 44 : 0), Math.hypot(ball.vx, ball.vy) + 10 + edge * 24);
    const angle = -Math.PI / 2 + offset * 1.16;

    ball.vx = Math.cos(angle) * speed;
    ball.vy = Math.sin(angle) * speed;
    ball.y = paddle.y - ball.r - 1;
    paddle.flash = edgeShot ? 0.28 : 0.12;
    if (edgeShot) {
      state.edgeShotReady = true;
      state.combo = Math.max(1, state.combo);
      addScore(12 + Math.round(edge * 18));
      addPop(ball.x, paddle.y - 10, "#ffd85a", edgeShot ? 1.3 : 1);
      state.hint = "가장자리 슛! 구슬이 더 깊은 각도로 튀었습니다.";
    } else {
      state.edgeShotReady = false;
      state.combo = Math.floor(state.combo * 0.45);
      state.hint = state.activePowerups.magnet > 0
        ? "자석 패들이 구슬을 부드럽게 다시 올렸습니다."
        : "패들 끝을 노리면 구석 젤리를 더 쉽게 맞출 수 있어요.";
    }
  }

  function hitBrick(brick, ball) {
    bounceBallFromBrick(ball, brick);

    if (state.orderQueue.length && brick.colorId !== state.orderQueue[0]) {
      state.combo = 0;
      state.score = Math.max(0, state.score - 15);
      state.hint = `${colorLabel(state.orderQueue[0])} 젤리 주문 먼저`;
      addPop(brick.x + brick.w / 2, brick.y + brick.h / 2, "#ffffff");
      updateHud();
      return;
    }

    if (brick.hp > 1) {
      brick.hp -= 1;
      addScore(35 + state.combo * 4);
      addPop(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color);
      state.hint = "두꺼운 젤리는 한 번 더 맞아야 정리됩니다.";
      updateHud();
      return;
    }

    brick.alive = false;
    state.cleared += 1;
    state.combo += 1;
    if (state.edgeShotReady) {
      state.edgeShotReady = false;
      state.angleCombos += 1;
      const angleBonus = addScore(95 + state.angleCombos * 18);
      addPop(brick.x + brick.w / 2, brick.y + brick.h / 2, "#ffd85a", 1.7);
      state.hint = `ANGLE COMBO! 구석 공략 +${angleBonus}`;
    }
    state.bestComboThisRun = Math.max(state.bestComboThisRun, state.combo);
    state.shelf[brick.colorId] = (state.shelf[brick.colorId] || 0) + 1;
    addScore(80 + state.combo * 12 + (brick.kind === "mover" ? 30 : 0) + (brick.kind === "hard" ? 45 : 0));
    addPop(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color);

    if (brick.powerup) {
      spawnPowerup(brick);
    }

    const missionMessages = [
      advanceMission("combo", state.combo),
      advanceMission("color", 1, { colorId: brick.colorId }),
      brick.kind === "hard" ? advanceMission("hard", 1) : ""
    ].filter(Boolean);

    state.hint = state.hint.startsWith("ANGLE COMBO") ? state.hint : (missionMessages[0] || `젤리 정리! 콤보 ${state.combo}`);
    advanceOrderQueue();

    if (state.cleared >= totalBricks) {
      finishGame(true);
    }
  }

  function advanceOrderQueue() {
    if (!state.orderQueue.length) {
      return;
    }

    const current = state.orderQueue[0];
    const stillAlive = state.bricks.some((brick) => brick.alive && brick.colorId === current);
    if (!stillAlive) {
      state.orderQueue.shift();
      addScore(180);
      state.hint = state.orderQueue.length
        ? `다음 주문: ${colorLabel(state.orderQueue[0])}`
        : "주문 진열 순서 완료!";
    }
  }

  function bounceBallFromBrick(ball, brick) {
    const overlapLeft = ball.x + ball.r - brick.x;
    const overlapRight = brick.x + brick.w - (ball.x - ball.r);
    const overlapTop = ball.y + ball.r - brick.y;
    const overlapBottom = brick.y + brick.h - (ball.y - ball.r);
    const overlapX = Math.min(overlapLeft, overlapRight);
    const overlapY = Math.min(overlapTop, overlapBottom);

    if (overlapX < overlapY) {
      ball.vx *= -1;
    } else {
      ball.vy *= -1;
    }
  }

  function spawnPowerup(brick) {
    const type = brick.powerup;
    state.powerups.push({
      type,
      x: brick.x + brick.w / 2 - 18,
      y: brick.y + brick.h / 2 - 12,
      w: 36,
      h: 24,
      vy: 82
    });
  }

  function applyPowerup(powerup) {
    const type = powerup.type;

    if (type === "wide") {
      state.activePowerups.wide = 9;
      state.hint = "패들이 넓어졌습니다. 위험한 각도도 받아낼 수 있어요.";
    } else if (type === "slow") {
      state.activePowerups.slow = 7;
      state.balls.forEach((ball) => {
        ball.vx *= 0.78;
        ball.vy *= 0.78;
      });
      state.hint = "구슬이 천천히 움직입니다. 원하는 색을 노려보세요.";
    } else if (type === "split") {
      const additions = state.balls.slice(0, 2).map((ball, index) =>
        makeBall(ball.x, ball.y, ball.vx * (index === 0 ? -0.9 : 0.9), -Math.abs(ball.vy) - 30)
      );
      state.balls.push(...additions);
      state.hint = "쌍둥이 구슬이 나왔습니다. 콤보 기회가 커졌어요.";
    } else if (type === "magnet") {
      state.activePowerups.magnet = 8;
      state.hint = "자석 패들이 켜졌습니다. 구슬이 패들 쪽으로 살짝 끌려옵니다.";
    }

    addScore(50);
    const missionMessage = advanceMission("powerup", 1);
    if (missionMessage) {
      state.hint = missionMessage;
    }
  }

  function advanceMission(type, amount, meta = {}) {
    const mission = state.mission;
    if (mission.complete || mission.type !== type) {
      return "";
    }
    if (mission.type === "color" && mission.colorId !== meta.colorId) {
      return "";
    }

    if (mission.type === "combo") {
      mission.progress = Math.max(mission.progress, amount);
    } else {
      mission.progress += amount;
    }

    if (mission.progress >= mission.target) {
      mission.complete = true;
      const missionBonus = addScore(250);
      if (!state.progress.completedMissionDays.includes(mission.dayId)) {
        state.progress.completedMissionDays.push(mission.dayId);
      }
      saveProgress();
      return `오늘 미션 ${mission.label} 완료! 보너스 +${missionBonus}`;
    }

    return "";
  }

  function isOrderClear() {
    return state.stage.order.length > 0 && state.orderQueue.length === 0;
  }

  function isOneBallClear() {
    return Boolean(state.stage.oneBall && state.lostBalls === 0 && state.cleared >= totalBricks);
  }

  function buildResultCode(won) {
    const stageKey = state.stage.id.replace(/-/g, "");
    const scoreKey = Math.round(state.score).toString(36).toUpperCase();
    const comboKey = state.bestComboThisRun.toString(36).toUpperCase();
    const dayKey = localDayKey().replace(/-/g, "").slice(2);
    return [
      "JBS1",
      stageKey,
      won ? "W" : "L",
      scoreKey,
      comboKey,
      isOneBallClear() ? "ONE" : "RUN",
      isOrderClear() ? "ORDER" : "FREE",
      state.mission.complete ? "MISSION" : "TRY",
      dayKey
    ].join("-");
  }

  function normalizeResultStats(stats) {
    const normalized = {};
    if (!stats || typeof stats !== "object") {
      return normalized;
    }

    Object.entries(stats).forEach(([code, record]) => {
      if (typeof code !== "string" || !code.startsWith("JBS1-") || !record || typeof record !== "object") {
        return;
      }
      normalized[code] = {
        shares: Math.max(0, Number(record.shares || 0)),
        likes: Math.max(0, Number(record.likes || 0)),
        bestScore: Math.max(0, Number(record.bestScore || 0)),
        bestCombo: Math.max(0, Number(record.bestCombo || 0)),
        wins: Math.max(0, Number(record.wins || 0)),
        oneBall: Boolean(record.oneBall),
        orderClear: Boolean(record.orderClear)
      };
    });

    return normalized;
  }

  function getResultRecord(code) {
    state.progress.resultStats = normalizeResultStats(state.progress.resultStats);
    if (!state.progress.resultStats[code]) {
      state.progress.resultStats[code] = {
        shares: 0,
        likes: 0,
        bestScore: 0,
        bestCombo: 0,
        wins: 0,
        oneBall: false,
        orderClear: false
      };
    }
    return state.progress.resultStats[code];
  }

  function syncResultRecord(won) {
    const code = buildResultCode(won);
    const record = getResultRecord(code);
    record.bestScore = Math.max(record.bestScore, Math.round(state.score));
    record.bestCombo = Math.max(record.bestCombo, state.bestComboThisRun);
    record.oneBall = record.oneBall || isOneBallClear();
    record.orderClear = record.orderClear || isOrderClear();
    if (won) {
      record.wins += 1;
    }
    state.currentResultCode = code;
    state.resultRecord = record;
    state.progress.lastResultCode = code;
    return { code, record };
  }

  function loadLikedResults() {
    try {
      const parsed = JSON.parse(localStorage.getItem(likedResultsStorageKey) || "[]");
      return Array.isArray(parsed) ? parsed.filter((code) => typeof code === "string") : [];
    } catch {
      return [];
    }
  }

  function saveLikedResults(codes) {
    localStorage.setItem(likedResultsStorageKey, JSON.stringify([...new Set(codes)]));
  }

  function persistProgress() {
    state.progress.shelfLayout = normalizeShelfLayout(state.progress.shelfLayout);
    state.progress.shelfPositions = normalizeShelfPositions(state.progress.shelfPositions, state.progress.shelfLayout);
    state.progress.resultStats = normalizeResultStats(state.progress.resultStats);
    localStorage.setItem(progressStorageKey, JSON.stringify(state.progress));
  }

  function shareResultCard() {
    if (!state.currentResultCode) {
      return;
    }
    const record = getResultRecord(state.currentResultCode);
    record.shares += 1;
    persistProgress();
    state.hint = `결과 카드 ${state.currentResultCode} 공유 준비`;
    syncResultButtons();
    updateHud();
  }

  function likeResultCard() {
    if (!state.currentResultCode) {
      return;
    }
    const liked = loadLikedResults();
    if (liked.includes(state.currentResultCode)) {
      state.hint = "이 결과 카드는 이미 응원했습니다.";
      syncResultButtons();
      updateHud();
      return;
    }

    const record = getResultRecord(state.currentResultCode);
    record.likes += 1;
    liked.push(state.currentResultCode);
    saveLikedResults(liked);
    persistProgress();
    state.hint = `응원 ${record.likes}개가 이 결과 카드에 모였습니다.`;
    syncResultButtons();
    updateHud();
  }

  function syncResultButtons() {
    const hasResult = Boolean(state.currentResultCode);
    const record = hasResult ? getResultRecord(state.currentResultCode) : null;
    const liked = hasResult ? loadLikedResults().includes(state.currentResultCode) : false;
    shareResultButton.disabled = !hasResult;
    resultLikeButton.disabled = !hasResult || liked;
    resultLikeButton.textContent = hasResult ? `응원 ${record.likes}` : "응원 0";
  }

  function updateGame(dt) {
    if (!state.active) {
      updatePops(dt);
      return;
    }

    updateTimers(dt);
    updatePaddle(dt);
    updateMovingBricks(dt);
    updateBalls(dt);
    updatePowerups(dt);
    updatePops(dt);
    updateHud();
  }

  function updateTimers(dt) {
    Object.keys(state.activePowerups).forEach((key) => {
      state.activePowerups[key] = Math.max(0, state.activePowerups[key] - dt);
    });

    const targetWidth = state.activePowerups.wide > 0 ? 168 : 120;
    state.paddle.w += (targetWidth - state.paddle.w) * clamp(dt * 12, 0, 1);
    state.paddle.flash = Math.max(0, state.paddle.flash - dt);
  }

  function updatePaddle(dt) {
    const paddle = state.paddle;
    if (keys.left) {
      paddle.targetX -= 430 * dt;
    }
    if (keys.right) {
      paddle.targetX += 430 * dt;
    }
    paddle.targetX = clamp(paddle.targetX, 18, width - paddle.w - 18);
    paddle.x += (paddle.targetX - paddle.x) * clamp(dt * 18, 0, 1);
  }

  function updateMovingBricks(dt) {
    for (const brick of state.bricks) {
      if (!brick.alive || brick.kind !== "mover") {
        continue;
      }
      brick.x += brick.vx * dt;
      if (brick.x < brick.baseX - 26 || brick.x > brick.baseX + 26) {
        brick.x = clamp(brick.x, brick.baseX - 26, brick.baseX + 26);
        brick.vx *= -1;
      }
    }
  }

  function updateBalls(dt) {
    const paddle = state.paddle;

    for (const ball of state.balls) {
      if (state.activePowerups.magnet > 0 && ball.vy > 0 && ball.y > paddle.y - 150) {
        const center = paddle.x + paddle.w / 2;
        ball.vx += clamp(center - ball.x, -80, 80) * dt * 3.2;
      }

      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.x < ball.r || ball.x > width - ball.r) {
        ball.x = clamp(ball.x, ball.r, width - ball.r);
        ball.vx *= -1;
      }
      if (ball.y < ball.r) {
        ball.y = ball.r;
        ball.vy *= -1;
      }

      const overPaddle =
        ball.x > paddle.x &&
        ball.x < paddle.x + paddle.w &&
        ball.y + ball.r > paddle.y &&
        ball.y - ball.r < paddle.y + paddle.h &&
        ball.vy > 0;

      if (overPaddle) {
        hitPaddle(ball);
      }

      for (const brick of state.bricks) {
        if (!brick.alive) {
          continue;
        }

        const closestX = clamp(ball.x, brick.x, brick.x + brick.w);
        const closestY = clamp(ball.y, brick.y, brick.y + brick.h);
        if (Math.hypot(ball.x - closestX, ball.y - closestY) < ball.r) {
          hitBrick(brick, ball);
          break;
        }
      }
    }

    state.balls = state.balls.filter((ball) => ball.y <= height + 24);

    if (state.balls.length === 0 && state.active) {
      state.lives -= 1;
      state.lostBalls += 1;
      if (state.lives <= 0) {
        finishGame(false);
      } else {
        resetBall();
      }
    }
  }

  function updatePowerups(dt) {
    const paddle = state.paddle;
    state.powerups = state.powerups.filter((powerup) => {
      powerup.y += powerup.vy * dt;
      const caught =
        powerup.x + powerup.w > paddle.x &&
        powerup.x < paddle.x + paddle.w &&
        powerup.y + powerup.h > paddle.y &&
        powerup.y < paddle.y + paddle.h;

      if (caught) {
        applyPowerup(powerup);
        return false;
      }

      return powerup.y < height + 40;
    });
  }

  function updatePops(dt) {
    state.pops = state.pops.filter((pop) => {
      pop.life -= dt;
      pop.vy += 260 * dt;
      pop.x += pop.vx * dt;
      pop.y += pop.vy * dt;
      return pop.life > 0;
    });
  }

  function drawPixelRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#f6edff");
    gradient.addColorStop(0.5, "#d8fff4");
    gradient.addColorStop(1, "#fff2c4");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 0.18;
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

    drawPixelRect(42, 42, width - 84, 12, "#ffffff");
    drawPixelRect(42, 260, width - 84, 12, "#ffffff");
    drawShelf();
  }

  function drawShelf() {
    const y = 492;
    drawPixelRect(52, y, width - 104, 14, "#ffffff");
    drawPixelRect(52, y + 14, width - 104, 6, "#d1a974");

    if (state.decorateMode) {
      ctx.globalAlpha = 0.22;
      drawPixelRect(52, 420, width - 104, 72, "#ffd85a");
      for (let x = 70; x < width - 70; x += 36) {
        drawPixelRect(x, 430, 2, 52, "#243047");
      }
      ctx.globalAlpha = 1;
    }

    getShelfBottleBoxes().forEach((box) => {
      const color = colors.find((item) => item.id === box.colorId);
      const lift = state.dragShelf?.colorId === box.colorId ? 4 : 0;
      drawPixelRect(box.x, box.y - lift, box.w, box.h, color?.value || "#ffffff");
      drawPixelRect(box.x + 4, box.y + 4 - lift, box.w - 8, 4, "rgba(255,255,255,0.5)");
      ctx.strokeStyle = "#243047";
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y - lift, box.w, box.h);
    });
  }

  function getShelfBottleBoxes() {
    const layout = normalizeShelfLayout(state.progress.shelfLayout);
    const positions = normalizeShelfPositions(state.progress.shelfPositions, layout);
    return layout.map((colorId) => {
      const count = Math.min(9, state.shelf[colorId] || 0);
      const bottleHeight = 10 + count * 2;
      const position = positions[colorId];
      return {
        colorId,
        x: position.x,
        y: position.y - bottleHeight,
        baseY: position.y,
        w: 22,
        h: bottleHeight
      };
    });
  }

  function drawOrderOverlay() {
    if (!state.orderQueue.length) {
      return;
    }

    ctx.fillStyle = "rgba(255,249,237,0.9)";
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(28, 18, 190, 42, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#526078";
    ctx.font = "900 10px ui-monospace, monospace";
    ctx.fillText("ORDER", 44, 35);
    state.orderQueue.forEach((colorId, index) => {
      const color = colors.find((item) => item.id === colorId);
      drawPixelRect(96 + index * 28, 28, 20, 18, color?.value || "#ffffff");
      ctx.strokeStyle = "#243047";
      ctx.strokeRect(96 + index * 28, 28, 20, 18);
    });
  }

  function drawBricks() {
    for (const brick of state.bricks) {
      if (!brick.alive) {
        continue;
      }

      drawPixelRect(brick.x, brick.y, brick.w, brick.h, brick.color);
      drawPixelRect(brick.x + 8, brick.y + 6, brick.w - 16, 6, "rgba(255,255,255,0.45)");

      if (brick.kind === "hard") {
        drawPixelRect(brick.x + 8, brick.y + brick.h - 9, brick.w - 16, 5, "#ffffff");
        if (brick.hp < brick.maxHp) {
          drawPixelRect(brick.x + brick.w / 2 - 4, brick.y + 4, 8, brick.h - 8, "#243047");
        }
      } else if (brick.kind === "mover") {
        drawPixelRect(brick.x + 8, brick.y + brick.h - 9, 14, 5, "#ffffff");
        drawPixelRect(brick.x + brick.w - 22, brick.y + brick.h - 9, 14, 5, "#ffffff");
      }

      if (brick.powerup) {
        const powerup = powerupTypes[brick.powerup];
        drawPixelRect(brick.x + brick.w / 2 - 15, brick.y + 5, 30, 18, "#ffffff");
        ctx.fillStyle = "#243047";
        ctx.font = "900 13px ui-monospace, monospace";
        ctx.textAlign = "center";
        ctx.fillText(powerup.label, brick.x + brick.w / 2, brick.y + 19);
      }

      ctx.strokeStyle = "#243047";
      ctx.lineWidth = 3;
      ctx.strokeRect(brick.x, brick.y, brick.w, brick.h);
    }
  }

  function drawPaddleAndBalls() {
    const paddle = state.paddle;
    const paddleColor = paddle.flash > 0 ? "#ffd85a" : (state.activePowerups.magnet > 0 ? "#e95b88" : "#ff9a6c");

    drawPixelRect(paddle.x, paddle.y, paddle.w, paddle.h, paddleColor);
    drawPixelRect(paddle.x + 12, paddle.y + 4, Math.max(10, paddle.w - 24), 5, "#ffd85a");
    drawPixelRect(paddle.x + 8, paddle.y - 4, 22, 4, "#ffffff");
    drawPixelRect(paddle.x + paddle.w - 30, paddle.y - 4, 22, 4, "#ffffff");
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 4;
    ctx.strokeRect(paddle.x, paddle.y, paddle.w, paddle.h);

    for (const ball of state.balls) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#243047";
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  function drawPowerups() {
    for (const powerup of state.powerups) {
      const info = powerupTypes[powerup.type];
      drawPixelRect(powerup.x, powerup.y, powerup.w, powerup.h, info.color);
      drawPixelRect(powerup.x + 4, powerup.y + 4, powerup.w - 8, 5, "rgba(255,255,255,0.5)");
      ctx.strokeStyle = "#243047";
      ctx.lineWidth = 3;
      ctx.strokeRect(powerup.x, powerup.y, powerup.w, powerup.h);
      ctx.fillStyle = "#243047";
      ctx.font = "900 13px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText(info.label, powerup.x + powerup.w / 2, powerup.y + 17);
    }
  }

  function drawPops() {
    for (const pop of state.pops) {
      ctx.globalAlpha = pop.life / pop.maxLife;
      drawPixelRect(pop.x, pop.y, 5, 5, pop.color);
    }
    ctx.globalAlpha = 1;
  }

  function drawActiveBadges() {
    const badges = Object.entries(state.activePowerups).filter(([, time]) => time > 0);
    badges.forEach(([type, time], index) => {
      const info = powerupTypes[type];
      const x = width - 60 - index * 46;
      drawPixelRect(x, 18, 36, 24, info.color);
      ctx.strokeStyle = "#243047";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, 18, 36, 24);
      ctx.fillStyle = "#243047";
      ctx.font = "900 12px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText(String(Math.ceil(time)), x + 18, 35);
    });
  }

  function drawStageOverlay() {
    const x = state.orderQueue.length ? 232 : 28;
    const label = `D${state.stage.difficulty} x${Number(state.stage.rewardMul || 1).toFixed(2)}`;
    ctx.fillStyle = "rgba(255,249,237,0.9)";
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, 18, 96, 42, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#526078";
    ctx.font = "900 10px ui-monospace, monospace";
    ctx.textAlign = "left";
    ctx.fillText("REWARD", x + 16, 35);
    ctx.fillStyle = "#243047";
    ctx.font = "900 13px ui-monospace, monospace";
    ctx.fillText(label, x + 16, 51);
  }

  function draw() {
    drawBackground();
    drawBricks();
    drawPowerups();
    drawPaddleAndBalls();
    drawPops();
    drawActiveBadges();
    drawOrderOverlay();
    drawStageOverlay();
  }

  function loop(timestamp) {
    const dt = clamp((timestamp - state.lastTime) / 1000, 0, 0.04);
    state.lastTime = timestamp;
    updateGame(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function dailySeed() {
    return localDayKey().split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  }

  function localDayKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function missionDayId(missionId) {
    return `${localDayKey()}:${missionId}`;
  }

  function colorLabel(colorId) {
    return colors.find((color) => color.id === colorId)?.label || colorId;
  }

  function normalizeShelfLayout(layout) {
    const ordered = Array.isArray(layout)
      ? layout.filter((id) => colors.some((color) => color.id === id))
      : [];
    for (const color of colors) {
      if (!ordered.includes(color.id)) {
        ordered.push(color.id);
      }
    }
    return ordered;
  }

  function defaultShelfPositions(layout) {
    return normalizeShelfLayout(layout).reduce((positions, colorId, index) => {
      positions[colorId] = {
        x: 90 + index * 44,
        y: 492
      };
      return positions;
    }, {});
  }

  function normalizeShelfPositions(positions, layout) {
    const defaults = defaultShelfPositions(layout);
    const normalized = {};
    colors.forEach((color) => {
      const position = positions && typeof positions === "object" ? positions[color.id] : null;
      normalized[color.id] = {
        x: clamp(Number(position?.x ?? defaults[color.id].x), 64, width - 86),
        y: clamp(Number(position?.y ?? defaults[color.id].y), 432, 492)
      };
    });
    return normalized;
  }

  function findShelfBottle(point) {
    const boxes = getShelfBottleBoxes().slice().reverse();
    return boxes.find((box) =>
      point.x >= box.x - 4 &&
      point.x <= box.x + box.w + 4 &&
      point.y >= box.y - 6 &&
      point.y <= box.baseY + 6
    );
  }

  function moveShelfBottle(point) {
    if (!state.dragShelf) {
      return;
    }
    state.progress.shelfPositions = normalizeShelfPositions(state.progress.shelfPositions, state.progress.shelfLayout);
    state.progress.shelfPositions[state.dragShelf.colorId] = {
      x: clamp(point.x - state.dragShelf.offsetX, 64, width - 86),
      y: clamp(point.y - state.dragShelf.offsetY, 432, 492)
    };
  }

  function finishShelfDrag() {
    if (!state.dragShelf) {
      return;
    }
    const positions = normalizeShelfPositions(state.progress.shelfPositions, state.progress.shelfLayout);
    state.progress.shelfPositions = positions;
    state.progress.shelfLayout = normalizeShelfLayout(state.progress.shelfLayout)
      .sort((left, right) => positions[left].x - positions[right].x);
    state.dragShelf = null;
    persistProgress();
    state.hint = "젤리 병 위치를 저장했습니다.";
    updateHud();
  }

  function renderStageControls() {
    stageLabel.textContent = `${state.stageIndex + 1}/${stagePresets.length} D${state.stage.difficulty}`;
    decorateButton.classList.toggle("is-active", state.decorateMode);
  }

  function selectStage(direction) {
    const progress = loadProgress();
    progress.selectedStageIndex = (clamp(Number(progress.selectedStageIndex || 0), 0, stagePresets.length - 1) + direction + stagePresets.length) % stagePresets.length;
    localStorage.setItem(progressStorageKey, JSON.stringify(progress));
    resetGame();
  }

  function toggleDecorate() {
    finishShelfDrag();
    state.decorateMode = !state.decorateMode;
    renderStageControls();
    state.hint = state.decorateMode ? "젤리 병을 잡아서 선반 위에 놓으세요." : `${state.stage.name} 진열`;
    updateHud();
  }

  function rotateShelfLayout() {
    const layout = normalizeShelfLayout(state.progress.shelfLayout);
    layout.push(layout.shift());
    state.progress.shelfLayout = layout;
    state.progress.shelfPositions = defaultShelfPositions(layout);
    persistProgress();
    state.hint = "젤리 병 배치를 바꿨습니다.";
    updateHud();
  }

  canvas.addEventListener("pointermove", (event) => {
    const point = pointerPosition(event);
    if (state.decorateMode && state.dragShelf) {
      event.preventDefault();
      moveShelfBottle(point);
      return;
    }
    if (state.decorateMode) {
      return;
    }
    state.paddle.targetX = clamp(point.x - state.paddle.w / 2, 18, width - state.paddle.w - 18);
  });
  canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const point = pointerPosition(event);
    if (state.decorateMode) {
      const bottle = findShelfBottle(point);
      if (bottle) {
        state.dragShelf = {
          colorId: bottle.colorId,
          offsetX: point.x - bottle.x,
          offsetY: point.y - bottle.baseY
        };
        moveShelfBottle(point);
        state.hint = `${colorLabel(bottle.colorId)} 젤리 병 이동 중`;
        updateHud();
        if (canvas.setPointerCapture) {
          canvas.setPointerCapture(event.pointerId);
        }
        return;
      }
      rotateShelfLayout();
      return;
    }
    state.paddle.targetX = clamp(point.x - state.paddle.w / 2, 18, width - state.paddle.w - 18);
  });
  canvas.addEventListener("pointerup", (event) => {
    if (state.decorateMode && state.dragShelf) {
      event.preventDefault();
      finishShelfDrag();
      if (canvas.releasePointerCapture) {
        canvas.releasePointerCapture(event.pointerId);
      }
    }
  });
  canvas.addEventListener("pointercancel", finishShelfDrag);
  restartButton.addEventListener("click", resetGame);
  overlayRestartButton.addEventListener("click", resetGame);
  prevStageButton.addEventListener("click", () => selectStage(-1));
  nextStageButton.addEventListener("click", () => selectStage(1));
  decorateButton.addEventListener("click", toggleDecorate);
  shareResultButton.addEventListener("click", shareResultCard);
  resultLikeButton.addEventListener("click", likeResultCard);

  resetGame();
  requestAnimationFrame(loop);
})();
