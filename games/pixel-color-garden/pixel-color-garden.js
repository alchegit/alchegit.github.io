(() => {
  const canvas = document.getElementById("gardenCanvas");
  const ctx = canvas.getContext("2d");
  const scoreValue = document.getElementById("scoreValue");
  const timeValue = document.getElementById("timeValue");
  const levelValue = document.getElementById("levelValue");
  const gardenValue = document.getElementById("gardenValue");
  const bloomValue = document.getElementById("bloomValue");
  const bestValue = document.getElementById("bestValue");
  const hintText = document.getElementById("hintText");
  const comboBadge = document.getElementById("comboBadge");
  const dailyButton = document.getElementById("dailyButton");
  const assistButton = document.getElementById("assistButton");
  const arrangeButton = document.getElementById("arrangeButton");
  const shareButton = document.getElementById("shareButton");
  const compareButton = document.getElementById("compareButton");
  const restartButton = document.getElementById("restartButton");
  const overlayRestartButton = document.getElementById("overlayRestartButton");
  const resultOverlay = document.getElementById("resultOverlay");
  const resultCopy = document.getElementById("resultCopy");

  const storageKey = "pixelColorGardenBest";
  const progressStorageKey = "pixelColorGardenProgress:v1";
  const size = 512;
  const margin = 30;
  const roundSeconds = 45;
  const palettes = [
    { bg: "#dffdf1", soil: "#cce9a4", base: [120, 63, 55], accent: "#ffd85a" },
    { bg: "#e5f7ff", soil: "#bfe4a0", base: [192, 72, 58], accent: "#e95b88" },
    { bg: "#fff3d8", soil: "#d7dc92", base: [44, 82, 57], accent: "#69c8ff" },
    { bg: "#f2e9ff", soil: "#b8d88f", base: [282, 58, 61], accent: "#35d7a8" }
  ];
  const modeSchedule = ["color", "shape", "color", "pattern", "sparkle", "shape", "sway", "pattern"];
  const modes = {
    color: { label: "색", hint: "살짝 색이 다른 꽃 한 송이를 눌러주세요." },
    shape: { label: "모양", hint: "꽃잎 모양이 다른 꽃을 찾아주세요." },
    pattern: { label: "무늬", hint: "가운데 씨앗 무늬가 다른 꽃을 찾아주세요." },
    sparkle: { label: "반짝", hint: "잠깐 반짝이는 꽃을 놓치지 마세요." },
    sway: { label: "흔들림", hint: "다른 방향으로 흔들리는 꽃을 찾아주세요." }
  };
  const flowerVarieties = [
    { id: "mint-daisy", name: "민트 데이지", shape: "plus", color: "#35d7a8", accent: "#ffd85a" },
    { id: "berry-cosmos", name: "베리 코스모스", shape: "diamond", color: "#e95b88", accent: "#fff3d8" },
    { id: "lemon-tulip", name: "레몬 튤립", shape: "cup", color: "#ffd85a", accent: "#35d7a8" },
    { id: "sky-pinwheel", name: "하늘 바람꽃", shape: "pinwheel", color: "#69c8ff", accent: "#f2e9ff" },
    { id: "grape-star", name: "포도 별꽃", shape: "star", color: "#a875ff", accent: "#ffd85a" },
    { id: "peach-bell", name: "복숭아 방울꽃", shape: "bell", color: "#ff9f82", accent: "#fff3d8" },
    { id: "cream-clover", name: "크림 클로버", shape: "clover", color: "#f7f0c4", accent: "#35d7a8" },
    { id: "night-lantern", name: "밤하늘 등불꽃", shape: "lantern", color: "#44506a", accent: "#69c8ff" }
  ];

  let state = createInitialState();
  let animationFrame = 0;
  let lastTimestamp = 0;

  restartButton.addEventListener("click", startGame);
  overlayRestartButton.addEventListener("click", startGame);
  dailyButton.addEventListener("click", startDailyGarden);
  assistButton.addEventListener("click", toggleColorAssist);
  arrangeButton.addEventListener("click", toggleArrangeMode);
  shareButton.addEventListener("click", shareDailyResult);
  compareButton.addEventListener("click", loadFriendResult);
  canvas.addEventListener("pointerdown", handlePointer);
  canvas.addEventListener("pointermove", handleGardenDrag);
  canvas.addEventListener("pointerup", endGardenDrag);
  canvas.addEventListener("pointercancel", endGardenDrag);
  window.addEventListener("resize", draw);

  startGame();

  function createInitialState() {
    const progress = loadProgress();
    if (!progress.unlockedIds.length) {
      progress.unlockedIds.push(flowerVarieties[0].id);
      saveRawProgress(progress);
    }

    return {
      active: false,
      score: 0,
      level: 1,
      combo: 0,
      water: 0,
      timeLeft: roundSeconds,
      gridSize: 3,
      oddIndex: 0,
      paletteIndex: 0,
      currentMode: modes.color,
      currentModeId: "color",
      roundVariety: flowerVarieties[0],
      baseShape: "plus",
      oddShape: "plus",
      baseColor: "hsl(120 63% 55%)",
      oddColor: "hsl(132 63% 55%)",
      roundStartedAt: performance.now(),
      effects: [],
      dailyMode: false,
      dailyAnswered: 0,
      dailyCorrect: 0,
      arrangeMode: false,
      draggingGardenId: "",
      progress,
      unlockedIds: new Set(progress.unlockedIds),
      best: Number(localStorage.getItem(storageKey) || 0),
      dailyVariety: flowerVarieties[dailySeed() % flowerVarieties.length]
    };
  }

  function loadProgress() {
    try {
      const parsed = JSON.parse(localStorage.getItem(progressStorageKey) || "{}");
      return {
        unlockedIds: Array.isArray(parsed.unlockedIds)
          ? parsed.unlockedIds.filter((id) => flowerVarieties.some((flower) => flower.id === id))
          : [],
        maxCombo: Number(parsed.maxCombo || 0),
        totalCorrect: Number(parsed.totalCorrect || 0),
        lastBloomName: typeof parsed.lastBloomName === "string" ? parsed.lastBloomName : "",
        lastPlayedDay: typeof parsed.lastPlayedDay === "string" ? parsed.lastPlayedDay : "",
        colorAssist: Boolean(parsed.colorAssist),
        dailyRecords: typeof parsed.dailyRecords === "object" && parsed.dailyRecords ? parsed.dailyRecords : {},
        gardenSlots: Array.isArray(parsed.gardenSlots)
          ? parsed.gardenSlots.filter((id) => flowerVarieties.some((flower) => flower.id === id))
          : [],
        gardenPositions: normalizeGardenPositions(parsed.gardenPositions),
        friendRecord: normalizeFriendRecord(parsed.friendRecord),
        firstAssistPromptSeen: Boolean(parsed.firstAssistPromptSeen),
        lastShareCode: typeof parsed.lastShareCode === "string" ? parsed.lastShareCode : ""
      };
    } catch {
      return {
        unlockedIds: [],
        maxCombo: 0,
        totalCorrect: 0,
        lastBloomName: "",
        lastPlayedDay: "",
        colorAssist: false,
        dailyRecords: {},
        gardenSlots: [],
        gardenPositions: {},
        friendRecord: null,
        firstAssistPromptSeen: false,
        lastShareCode: ""
      };
    }
  }

  function saveProgress() {
    state.progress.unlockedIds = Array.from(state.unlockedIds);
    state.progress.maxCombo = Math.max(state.progress.maxCombo, state.combo);
    state.progress.lastPlayedDay = localDayKey();
    state.progress.gardenSlots = normalizeGardenSlots(state.progress.gardenSlots, state.unlockedIds);
    state.progress.gardenPositions = normalizeGardenPositions(state.progress.gardenPositions);
    saveRawProgress(state.progress);
  }

  function saveRawProgress(progress) {
    localStorage.setItem(progressStorageKey, JSON.stringify(progress));
  }

  function startGame() {
    state = createInitialState();
    state.active = true;
    resultOverlay.hidden = true;
    nextRound();
    if (!state.progress.firstAssistPromptSeen) {
      state.progress.firstAssistPromptSeen = true;
      hintText.textContent = "색 구분이 어렵다면 무늬 버튼을 켤 수 있습니다.";
      saveRawProgress(state.progress);
    }
    syncControlButtons();
    updateHud();
    lastTimestamp = performance.now();
    cancelAnimationFrame(animationFrame);
    animationFrame = requestAnimationFrame(tick);
  }

  function startDailyGarden() {
    startGame();
    state.dailyMode = true;
    state.dailyAnswered = 0;
    state.dailyCorrect = 0;
    state.timeLeft = 60;
    hintText.textContent = "오늘의 정원 10문제";
    syncControlButtons();
    updateHud();
  }

  function toggleColorAssist() {
    state.progress.colorAssist = !state.progress.colorAssist;
    saveProgress();
    syncControlButtons();
    hintText.textContent = state.progress.colorAssist ? "색 보조 무늬 켜짐" : "색 보조 무늬 꺼짐";
    draw();
  }

  function toggleArrangeMode() {
    state.arrangeMode = !state.arrangeMode;
    syncControlButtons();
    hintText.textContent = state.arrangeMode ? "아래 정원 꽃을 눌러 배치를 바꿔보세요." : state.currentMode.hint;
  }

  function syncControlButtons() {
    assistButton.classList.toggle("is-active", state.progress.colorAssist);
    arrangeButton.classList.toggle("is-active", state.arrangeMode);
    dailyButton.classList.toggle("is-active", state.dailyMode);
    assistButton.textContent = state.progress.colorAssist ? "무늬 ON" : "무늬";
    compareButton.classList.toggle("is-active", Boolean(state.progress.friendRecord));
    compareButton.title = state.progress.friendRecord
      ? `${state.progress.friendRecord.correct}/10 · ${state.progress.friendRecord.score}점`
      : "PCG1 친구 결과 카드를 불러옵니다.";
  }

  function tick(timestamp) {
    const delta = Math.min(0.05, (timestamp - lastTimestamp) / 1000);
    lastTimestamp = timestamp;

    if (state.active) {
      state.timeLeft = Math.max(0, state.timeLeft - delta);
      if (state.timeLeft <= 0) {
        finishGame();
      }
    }

    updateHud();
    draw(timestamp);
    animationFrame = requestAnimationFrame(tick);
  }

  function nextRound(carryMessage = "") {
    state.gridSize = Math.min(8, 3 + Math.floor((state.level - 1) / 3));
    state.currentModeId = modeSchedule[(state.level - 1) % modeSchedule.length];
    state.currentMode = modes[state.currentModeId];
    state.roundVariety = flowerVarieties[
      (state.level + state.unlockedIds.size + dailySeed()) % flowerVarieties.length
    ];

    const palette = palettes[(state.level - 1) % palettes.length];
    const difficulty = Math.max(4, 21 - Math.floor(state.level * 1.2));
    const hueShift = state.level % 2 === 0 ? difficulty : -difficulty;
    const lightShift = state.level % 3 === 0 ? 4 : 0;
    const shapes = flowerVarieties.map((flower) => flower.shape);

    state.paletteIndex = (state.level - 1) % palettes.length;
    state.oddIndex = Math.floor(Math.random() * state.gridSize * state.gridSize);
    state.baseShape = state.roundVariety.shape;
    state.oddShape = shapes[(shapes.indexOf(state.baseShape) + 1 + state.level) % shapes.length];
    state.baseColor = `hsl(${palette.base[0]} ${palette.base[1]}% ${palette.base[2]}%)`;
    state.oddColor = `hsl(${palette.base[0] + hueShift} ${palette.base[1]}% ${palette.base[2] + lightShift}%)`;
    state.roundStartedAt = performance.now();
    hintText.textContent = carryMessage || `${state.currentMode.hint} 오늘꽃은 ${state.dailyVariety.name}입니다.`;
  }

  function handlePointer(event) {
    if (!state.active) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const scale = size / rect.width;
    const x = (event.clientX - rect.left) * scale;
    const y = (event.clientY - rect.top) * scale;

    if (state.arrangeMode && y > size - 92) {
      startGardenDrag(x, y, event.pointerId);
      return;
    }

    const index = getTileIndex(x, y);

    if (index < 0) {
      return;
    }

    if (index === state.oddIndex) {
      state.dailyAnswered += state.dailyMode ? 1 : 0;
      state.dailyCorrect += state.dailyMode ? 1 : 0;
      const elapsed = (performance.now() - state.roundStartedAt) / 1000;
      const speedBonus = Math.max(0, Math.round((3.2 - elapsed) * 18));
      const modeBonus = ["sparkle", "sway"].includes(state.currentModeId) ? 45 : 20;
      const dailyBonus = state.roundVariety.id === state.dailyVariety.id ? 35 : 0;
      const nextCombo = state.combo + 1;
      const gained = 120 + state.level * 18 + state.combo * 15 + speedBonus + modeBonus + dailyBonus;
      const waterGain = 1 + Math.floor(nextCombo / 4);
      const unlocked = unlockBloom(nextCombo);

      addEffect(index, "hit");
      if (nextCombo >= 3) {
        addBloomBurst(index, Math.min(5, 2 + Math.floor(nextCombo / 2)));
      }
      state.score += gained;
      state.combo = nextCombo;
      state.water += waterGain;
      state.level += 1;
      state.progress.totalCorrect += 1;
      state.progress.maxCombo = Math.max(state.progress.maxCombo, state.combo);
      state.timeLeft = Math.min(roundSeconds + 8, state.timeLeft + 1.2 + waterGain * 0.12);

      const roundMessage = nextCombo >= 3
        ? `BLOOM STREAK x${nextCombo}! 꽃잎이 번졌습니다. +${gained}`
        : unlocked
        ? `${unlocked.name}이 정원에 피었습니다. +${gained}`
        : `정답입니다. 물방울 +${waterGain}, 점수 +${gained}`;

      if (unlocked) {
        state.progress.lastBloomName = unlocked.name;
      }

      saveProgress();
      if (state.dailyMode && state.dailyAnswered >= 10) {
        finishGame();
      } else {
        nextRound(roundMessage);
      }
    } else {
      state.dailyAnswered += state.dailyMode ? 1 : 0;
      const near = isNearOddIndex(index);
      addEffect(index, near ? "near" : "miss");
      if (near) {
        addEffect(state.oddIndex, "near");
      }
      state.score = Math.max(0, state.score - (near ? 12 : 45));
      state.combo = near ? Math.max(0, state.combo - 1) : 0;
      state.timeLeft = Math.max(0, state.timeLeft - (near ? 0.8 : 2.2));
      hintText.textContent = near ? "따뜻해요. 바로 옆 꽃밭에 다른 꽃이 숨어 있습니다." : "그 꽃은 오늘도 건강해요. 다시 찾아보세요.";

      if (state.dailyMode && state.dailyAnswered >= 10) {
        finishGame();
      }
    }

    updateHud();
    draw();
  }

  function unlockBloom(nextCombo) {
    const shouldUnlock = nextCombo % 3 === 0 || state.level % 5 === 0;
    if (!shouldUnlock || state.unlockedIds.size >= flowerVarieties.length) {
      return null;
    }

    const locked = flowerVarieties.filter((flower) => !state.unlockedIds.has(flower.id));
    const unlocked = locked[(state.level + nextCombo + dailySeed()) % locked.length];
    state.unlockedIds.add(unlocked.id);
    return unlocked;
  }

  function isNearOddIndex(index) {
    const row = Math.floor(index / state.gridSize);
    const col = index % state.gridSize;
    const oddRow = Math.floor(state.oddIndex / state.gridSize);
    const oddCol = state.oddIndex % state.gridSize;
    return Math.abs(row - oddRow) <= 1 && Math.abs(col - oddCol) <= 1;
  }

  function addBloomBurst(index, count) {
    const row = Math.floor(index / state.gridSize);
    const col = index % state.gridSize;
    const candidates = [];
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const nextRow = row + dy;
        const nextCol = col + dx;
        if (nextRow >= 0 && nextCol >= 0 && nextRow < state.gridSize && nextCol < state.gridSize) {
          candidates.push(nextRow * state.gridSize + nextCol);
        }
      }
    }
    for (let i = 0; i < count && candidates.length; i += 1) {
      const picked = candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0];
      addEffect(picked, "bloom");
    }
  }

  function normalizeGardenSlots(slots, unlockedIds = new Set()) {
    const unlocked = flowerVarieties.filter((flower) => unlockedIds.has(flower.id)).map((flower) => flower.id);
    const ordered = Array.isArray(slots)
      ? slots.filter((id) => unlocked.includes(id))
      : [];
    for (const id of unlocked) {
      if (!ordered.includes(id)) {
        ordered.push(id);
      }
    }
    return ordered;
  }

  function normalizeGardenPositions(positions) {
    const safe = typeof positions === "object" && positions ? positions : {};
    return Object.fromEntries(Object.entries(safe)
      .filter(([id]) => flowerVarieties.some((flower) => flower.id === id))
      .map(([id, point]) => [id, {
        x: Math.round(clamp(Number(point?.x || 0), 24, size - 24)),
        y: Math.round(clamp(Number(point?.y || 0), size - 84, size - 16))
      }])
      .filter(([, point]) => Number.isFinite(point.x) && Number.isFinite(point.y)));
  }

  function normalizeFriendRecord(record) {
    if (!record || typeof record !== "object") {
      return null;
    }

    const score = Math.max(0, Number(record.score || 0));
    const correct = clamp(Number(record.correct || 0), 0, 10);
    if (!Number.isFinite(score) || !Number.isFinite(correct)) {
      return null;
    }

    return {
      day: typeof record.day === "string" ? record.day : "",
      correct,
      score,
      blooms: clamp(Number(record.blooms || 0), 0, flowerVarieties.length)
    };
  }

  function getGardenPositions(slots) {
    const saved = normalizeGardenPositions(state.progress.gardenPositions);
    const startX = 40;
    const gap = Math.min(54, Math.floor((size - 80) / Math.max(1, flowerVarieties.length - 1)));
    return Object.fromEntries(slots.map((id, index) => [id, saved[id] || {
      x: startX + index * gap,
      y: size - 33
    }]));
  }

  function rotateGardenSlot(x) {
    const slots = normalizeGardenSlots(state.progress.gardenSlots, state.unlockedIds);
    if (slots.length < 2) {
      return;
    }

    const slotWidth = size / slots.length;
    const index = clamp(Math.floor(x / slotWidth), 0, slots.length - 1);
    const [picked] = slots.splice(index, 1);
    slots.push(picked);
    state.progress.gardenSlots = slots;
    saveProgress();
    hintText.textContent = "정원 배치를 바꿨습니다.";
    draw();
  }

  function startGardenDrag(x, y, pointerId) {
    const slots = normalizeGardenSlots(state.progress.gardenSlots, state.unlockedIds);
    if (!slots.length) {
      return;
    }

    const positions = getGardenPositions(slots);
    let nearest = null;
    let nearestDistance = Infinity;
    for (const id of slots) {
      const point = positions[id];
      const distance = Math.hypot(point.x - x, point.y - y);
      if (distance < nearestDistance) {
        nearest = id;
        nearestDistance = distance;
      }
    }

    if (!nearest || nearestDistance > 34) {
      rotateGardenSlot(x);
      return;
    }

    state.draggingGardenId = nearest;
    canvas.setPointerCapture(pointerId);
    moveGardenFlower(nearest, x, y);
  }

  function handleGardenDrag(event) {
    if (!state.arrangeMode || !state.draggingGardenId) {
      return;
    }

    const point = pointerPosition(event);
    moveGardenFlower(state.draggingGardenId, point.x, point.y);
  }

  function endGardenDrag() {
    if (!state.draggingGardenId) {
      return;
    }

    state.draggingGardenId = "";
    saveProgress();
    hintText.textContent = "꽃 위치를 저장했습니다.";
    draw();
  }

  function moveGardenFlower(id, x, y) {
    state.progress.gardenPositions = normalizeGardenPositions(state.progress.gardenPositions);
    state.progress.gardenPositions[id] = {
      x: Math.round(clamp(x, 24, size - 24)),
      y: Math.round(clamp(y, size - 84, size - 16))
    };
    draw();
  }

  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = size / rect.width;
    return {
      x: (event.clientX - rect.left) * scale,
      y: (event.clientY - rect.top) * scale
    };
  }

  function shareDailyResult() {
    const today = localDayKey();
    const record = state.progress.dailyRecords[today] || { correct: state.dailyCorrect, score: state.score, completed: false };
    const payload = {
      v: 1,
      d: today,
      c: record.correct || state.dailyCorrect,
      s: Math.max(record.score || 0, state.score),
      b: state.unlockedIds.size
    };
    const code = `PCG1-${btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
    state.progress.lastShareCode = code;
    saveProgress();

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code).then(() => {
        hintText.textContent = "결과 카드 코드가 복사됐습니다.";
      }).catch(() => {
        window.prompt("결과 카드 코드", code);
      });
    } else {
      window.prompt("결과 카드 코드", code);
    }
  }

  function loadFriendResult() {
    const code = window.prompt("PCG1 결과 카드 입력");
    if (!code) {
      return;
    }

    try {
      const record = decodeDailyResult(code.trim());
      state.progress.friendRecord = record;
      saveProgress();
      syncControlButtons();
      hintText.textContent = `친구 기록 ${record.correct}/10 · ${record.score}점`;
      updateHud();
    } catch (error) {
      hintText.textContent = "결과 카드를 읽지 못했습니다.";
    }
  }

  function decodeDailyResult(code) {
    const body = code.startsWith("PCG1-") ? code.slice(5) : code;
    const padded = body.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((body.length + 3) % 4);
    const payload = JSON.parse(atob(padded));
    return normalizeFriendRecord({
      day: payload.d,
      correct: payload.c,
      score: payload.s,
      blooms: payload.b
    });
  }

  function getTileIndex(x, y) {
    const gap = getGap();
    const tile = getTileSize(gap);
    const board = state.gridSize * tile + (state.gridSize - 1) * gap;
    const start = (size - board) / 2;

    if (x < start || y < start || x > start + board || y > start + board) {
      return -1;
    }

    const col = Math.floor((x - start) / (tile + gap));
    const row = Math.floor((y - start) / (tile + gap));
    const localX = (x - start) - col * (tile + gap);
    const localY = (y - start) - row * (tile + gap);

    if (col < 0 || row < 0 || col >= state.gridSize || row >= state.gridSize || localX > tile || localY > tile) {
      return -1;
    }

    return row * state.gridSize + col;
  }

  function getTileBounds(index) {
    const gap = getGap();
    const tile = getTileSize(gap);
    const board = state.gridSize * tile + (state.gridSize - 1) * gap;
    const start = (size - board) / 2;
    const row = Math.floor(index / state.gridSize);
    const col = index % state.gridSize;

    return {
      x: Math.round(start + col * (tile + gap)),
      y: Math.round(start + row * (tile + gap)),
      tile
    };
  }

  function addEffect(index, type) {
    state.effects.push({
      ...getTileBounds(index),
      type,
      startedAt: performance.now()
    });
  }

  function updateHud() {
    const gardenRank = getGardenRank();
    scoreValue.textContent = state.score.toString();
    timeValue.textContent = Math.ceil(state.timeLeft).toString();
    levelValue.textContent = state.level.toString();
    gardenValue.textContent = `Lv.${gardenRank}`;
    bloomValue.textContent = `${state.unlockedIds.size}/${flowerVarieties.length}`;
    bestValue.textContent = state.best.toString();
    const friend = state.progress.friendRecord;
    comboBadge.textContent = friend
      ? `friend ${friend.correct}/10 · ${friend.score}`
      : state.dailyMode
      ? `daily ${state.dailyAnswered}/10 · ${state.dailyCorrect}정답`
      : `${state.currentMode.label} · combo ${state.combo} · 물 ${state.water}`;
  }

  function finishGame() {
    state.active = false;

    if (state.score > state.best) {
      state.best = state.score;
      localStorage.setItem(storageKey, String(state.best));
    }

    if (state.dailyMode) {
      const today = localDayKey();
      const prev = state.progress.dailyRecords[today] || { correct: 0, score: 0, completed: false };
      state.progress.dailyRecords[today] = {
        correct: Math.max(prev.correct || 0, state.dailyCorrect),
        score: Math.max(prev.score || 0, state.score),
        completed: true
      };
    }

    saveProgress();
    resultCopy.textContent =
      `${state.dailyMode ? `오늘 ${state.dailyCorrect}/10, ` : ""}점수 ${state.score}점, 레벨 ${state.level}까지 정원을 돌봤습니다. ` +
      `꽃 ${state.unlockedIds.size}/${flowerVarieties.length}, 최고 콤보 ${state.progress.maxCombo}입니다.` +
      (state.progress.friendRecord ? ` 친구 ${state.progress.friendRecord.correct}/10, ${state.progress.friendRecord.score}점.` : "");
    resultOverlay.hidden = false;
    updateHud();
  }

  function draw(timestamp = performance.now()) {
    const palette = palettes[state.paletteIndex];
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, size, size);
    drawBackground(palette, timestamp);

    const gap = getGap();
    const tile = getTileSize(gap);
    const board = state.gridSize * tile + (state.gridSize - 1) * gap;
    const start = (size - board) / 2;

    for (let row = 0; row < state.gridSize; row += 1) {
      for (let col = 0; col < state.gridSize; col += 1) {
        const index = row * state.gridSize + col;
        const x = Math.round(start + col * (tile + gap));
        const y = Math.round(start + row * (tile + gap));
        const traits = tileTraits(index, palette);
        const sway = Math.sin((timestamp / 280) + index) * 1.4 * traits.swaySign;
        drawTile(x, y, tile, traits, sway, timestamp);
      }
    }

    drawEffects(timestamp);
  }

  function tileTraits(index, palette) {
    const isOdd = index === state.oddIndex;
    const shapeMode = state.currentModeId === "shape";
    const colorMode = state.currentModeId === "color";
    const patternMode = state.currentModeId === "pattern";
    const sparkleMode = state.currentModeId === "sparkle";
    const swayMode = state.currentModeId === "sway";

    return {
      color: isOdd && colorMode ? state.oddColor : state.baseColor,
      shape: isOdd && shapeMode ? state.oddShape : state.baseShape,
      pattern: (isOdd && patternMode) || (isOdd && colorMode && state.progress.colorAssist),
      sparkle: isOdd && sparkleMode,
      swaySign: isOdd && swayMode ? -1 : 1,
      accent: state.roundVariety.accent || palette.accent
    };
  }

  function drawBackground(palette, timestamp) {
    ctx.fillStyle = palette.bg;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = "rgba(36, 48, 71, 0.06)";
    for (let i = 0; i <= size; i += 16) {
      ctx.fillRect(i, 0, 1, size);
      ctx.fillRect(0, i, size, 1);
    }

    ctx.fillStyle = palette.soil;
    for (let y = size - 74; y < size; y += 14) {
      ctx.fillRect(0, y, size, 7);
    }

    drawCollectedGarden(timestamp);

    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    const drift = (timestamp / 60) % 128;
    for (let i = -1; i < 5; i += 1) {
      const x = i * 128 + drift;
      ctx.fillRect(x, 42, 40, 8);
      ctx.fillRect(x + 12, 34, 28, 8);
    }
  }

  function drawCollectedGarden(timestamp) {
    const slots = normalizeGardenSlots(state.progress.gardenSlots, state.unlockedIds);
    const unlocked = slots
      .map((id) => flowerVarieties.find((flower) => flower.id === id))
      .filter(Boolean);
    const positions = getGardenPositions(slots);

    unlocked.forEach((flower, index) => {
      const point = positions[flower.id];
      const x = point.x;
      const y = point.y + Math.sin(timestamp / 360 + index) * 2;
      ctx.fillStyle = "#5fae58";
      ctx.fillRect(x - 1, y - 18, 3, 20);
      drawBloomShape(x, y - 23, flower.id === state.draggingGardenId ? 5 : 4, flower.shape, flower.color, flower.accent, index === 0, false, timestamp);
    });
  }

  function drawTile(x, y, tile, traits, sway, timestamp) {
    ctx.fillStyle = "#f8fff1";
    ctx.fillRect(x, y, tile, tile);
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 1.5, y + 1.5, tile - 3, tile - 3);

    ctx.fillStyle = "#8ccf72";
    ctx.fillRect(x + 8, y + tile - 16, tile - 16, 7);
    ctx.fillStyle = "#5fae58";
    ctx.fillRect(x + tile / 2 - 2 + sway, y + tile / 2 - 1, 4, tile / 2 - 14);
    ctx.fillRect(x + tile / 2 + 3 + sway, y + tile / 2 + 8, 10, 5);
    ctx.fillRect(x + tile / 2 - 13 + sway, y + tile / 2 + 3, 10, 5);

    const cx = Math.round(x + tile / 2 + sway);
    const cy = Math.round(y + tile / 2 - 8);
    const petal = Math.max(5, Math.floor(tile / 8));
    drawBloomShape(cx, cy, petal, traits.shape, traits.color, traits.accent, traits.pattern, traits.sparkle, timestamp);
  }

  function drawBloomShape(cx, cy, petal, shape, flowerColor, accentColor, pattern, sparkle, timestamp) {
    ctx.fillStyle = flowerColor;

    if (shape === "diamond") {
      ctx.fillRect(cx - petal, cy - petal * 2, petal * 2, petal);
      ctx.fillRect(cx - petal * 2, cy - petal, petal * 4, petal * 2);
      ctx.fillRect(cx - petal, cy + petal, petal * 2, petal);
    } else if (shape === "cup") {
      ctx.fillRect(cx - petal * 2, cy - petal, petal * 4, petal * 2);
      ctx.fillRect(cx - petal, cy - petal * 2, petal, petal);
      ctx.fillRect(cx, cy - petal * 2, petal, petal);
      ctx.fillRect(cx - petal, cy + petal, petal * 2, petal);
    } else if (shape === "pinwheel") {
      ctx.fillRect(cx - petal, cy - petal * 3, petal * 2, petal * 2);
      ctx.fillRect(cx + 1, cy - petal, petal * 3, petal * 2);
      ctx.fillRect(cx - petal, cy + 1, petal * 2, petal * 3);
      ctx.fillRect(cx - petal * 3, cy - petal, petal * 2, petal * 2);
    } else if (shape === "star") {
      ctx.fillRect(cx - petal, cy - petal * 3, petal * 2, petal * 6);
      ctx.fillRect(cx - petal * 3, cy - petal, petal * 6, petal * 2);
      ctx.fillRect(cx - petal * 2, cy - petal * 2, petal, petal);
      ctx.fillRect(cx + petal, cy - petal * 2, petal, petal);
      ctx.fillRect(cx - petal * 2, cy + petal, petal, petal);
      ctx.fillRect(cx + petal, cy + petal, petal, petal);
    } else if (shape === "bell") {
      ctx.fillRect(cx - petal * 2, cy - petal, petal * 4, petal * 3);
      ctx.fillRect(cx - petal, cy - petal * 2, petal * 2, petal);
      ctx.fillRect(cx - petal * 3, cy + petal, petal, petal);
      ctx.fillRect(cx + petal * 2, cy + petal, petal, petal);
    } else if (shape === "clover") {
      ctx.fillRect(cx - petal * 2, cy - petal * 2, petal * 2, petal * 2);
      ctx.fillRect(cx + 1, cy - petal * 2, petal * 2, petal * 2);
      ctx.fillRect(cx - petal * 2, cy + 1, petal * 2, petal * 2);
      ctx.fillRect(cx + 1, cy + 1, petal * 2, petal * 2);
    } else if (shape === "lantern") {
      ctx.fillRect(cx - petal * 2, cy - petal, petal * 4, petal * 3);
      ctx.fillRect(cx - petal, cy - petal * 2, petal * 2, petal);
      ctx.fillRect(cx - petal, cy + petal * 2, petal * 2, petal);
    } else {
      ctx.fillRect(cx - petal, cy - petal * 2, petal * 2, petal * 2);
      ctx.fillRect(cx - petal, cy + 1, petal * 2, petal * 2);
      ctx.fillRect(cx - petal * 2 - 1, cy - petal, petal * 2, petal * 2);
      ctx.fillRect(cx + 1, cy - petal, petal * 2, petal * 2);
    }

    ctx.fillStyle = accentColor;
    ctx.fillRect(cx - 4, cy - 4, 8, 8);

    if (pattern) {
      ctx.fillStyle = "#243047";
      ctx.fillRect(cx - 8, cy - 1, 3, 3);
      ctx.fillRect(cx + 5, cy - 1, 3, 3);
      ctx.fillRect(cx - 1, cy + 5, 3, 3);
    }

    if (sparkle && Math.floor(timestamp / 160) % 2 === 0) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(cx - petal * 3, cy - petal * 3, 4, 4);
      ctx.fillRect(cx + petal * 2, cy - petal * 2, 4, 4);
      ctx.fillRect(cx + petal * 2, cy + petal * 2, 4, 4);
    }
  }

  function drawEffects(timestamp) {
    state.effects = state.effects.filter((effect) => timestamp - effect.startedAt <= 520);

    state.effects.forEach((effect) => {
      const age = timestamp - effect.startedAt;
      const pulse = 1 - age / 520;
      const colors = {
        hit: "#35d7a8",
        miss: "#e95b88",
        near: "#ffd85a",
        bloom: "#69c8ff"
      };
      ctx.strokeStyle = colors[effect.type] || "#35d7a8";
      ctx.lineWidth = effect.type === "bloom" ? 4 : 5;
      ctx.strokeRect(
        effect.x + 5 - pulse * 6,
        effect.y + 5 - pulse * 6,
        effect.tile - 10 + pulse * 12,
        effect.tile - 10 + pulse * 12
      );
      if (effect.type === "bloom" || effect.type === "near") {
        ctx.globalAlpha = Math.max(0, pulse * 0.35);
        ctx.fillStyle = colors[effect.type];
        ctx.fillRect(effect.x + 10, effect.y + 10, effect.tile - 20, effect.tile - 20);
        ctx.globalAlpha = 1;
      }
    });
  }

  function getGardenRank() {
    return 1 + Math.floor((state.progress.totalCorrect + state.unlockedIds.size * 2) / 8);
  }

  function getGap() {
    return state.gridSize >= 7 ? 5 : 7;
  }

  function getTileSize(gap) {
    return Math.floor((size - margin * 2 - gap * (state.gridSize - 1)) / state.gridSize);
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
})();
