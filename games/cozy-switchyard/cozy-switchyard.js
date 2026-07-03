(() => {
  const canvas = document.getElementById("switchCanvas");
  const ctx = canvas.getContext("2d");
  const deliveredValue = document.getElementById("deliveredValue");
  const boxValue = document.getElementById("boxValue");
  const dockValue = document.getElementById("dockValue");
  const moveValue = document.getElementById("moveValue");
  const stampValue = document.getElementById("stampValue");
  const scoreValue = document.getElementById("scoreValue");
  const hintText = document.getElementById("hintText");
  const ruleText = document.getElementById("ruleText");
  const stageLabel = document.getElementById("stageLabel");
  const stagePrevButton = document.getElementById("stagePrevButton");
  const stageNextButton = document.getElementById("stageNextButton");
  const mapLabel = document.getElementById("mapLabel");
  const mapPrevButton = document.getElementById("mapPrevButton");
  const mapNextButton = document.getElementById("mapNextButton");
  const switchAButton = document.getElementById("switchAButton");
  const switchBButton = document.getElementById("switchBButton");
  const launchButton = document.getElementById("launchButton");
  const shareReplayButton = document.getElementById("shareReplayButton");
  const replayLikeButton = document.getElementById("replayLikeButton");
  const restartButton = document.getElementById("restartButton");
  const overlayRestartButton = document.getElementById("overlayRestartButton");
  const resultOverlay = document.getElementById("resultOverlay");
  const resultKicker = document.getElementById("resultKicker");
  const resultTitle = document.getElementById("resultTitle");
  const resultCopy = document.getElementById("resultCopy");

  const width = canvas.width;
  const height = canvas.height;
  const start = { x: 104, y: 270 };
  const switchA = { x: 292, y: 270 };
  const laneJoin = { x: 458, y: 270 };
  const switchB = { x: 540, y: 270 };
  const lanes = [
    { name: "TOP", ko: "윗길", short: "UP", color: "#75c96b", y: 156 },
    { name: "MID", ko: "가운데", short: "MID", color: "#ffd85a", y: 270 },
    { name: "LOW", ko: "아랫길", short: "LOW", color: "#69c8ff", y: 384 }
  ];
  const docks = [
    { name: "PINK", short: "PNK", ko: "분홍", color: "#e95b88", x: 698, y: 152 },
      { name: "YELLOW", short: "YEL", ko: "노랑", color: "#ffd85a", x: 698, y: 270 },
    { name: "MINT", short: "MNT", ko: "민트", color: "#35d7a8", x: 698, y: 388 }
  ];
  const baseGiftOrder = [
    { dock: 0, lane: 0, seal: "꽃" },
    { dock: 2, lane: 2, seal: "잎" },
    { dock: 1, lane: 1, seal: "별" },
    { dock: 0, lane: 2, seal: "달" },
    { dock: 1, lane: 0, seal: "빛" },
    { dock: 2, lane: 1, seal: "씨앗" }
  ];
  const stagePresets = [
    {
      name: "초록 기본역",
      short: "기본역",
      rule: "색 띠와 정류장을 맞춰 차분하게 분류하세요.",
      guide: "첫 정류장은 스위치를 미리 맞춘 뒤 출발시키면 됩니다.",
      parMoves: 11,
      autoLaunch: false,
      allowMidSwitch: false,
      theme: { sky: "#efffe0", middle: "#ffe2d0", ground: "#dff8ff", rail: "#ffd85a" },
      gifts: baseGiftOrder
    },
    {
      name: "시간차 플랫폼",
      short: "시간차",
      rule: "상자가 자동 출발합니다. 움직이는 동안 다음 스위치를 바꾸세요.",
      guide: "타이머가 끝나면 바로 출발합니다. 중간 조작이 핵심입니다.",
      parMoves: 9,
      autoLaunch: true,
      allowMidSwitch: true,
      launchInterval: 1.7,
      theme: { sky: "#e8f6ff", middle: "#fff0b8", ground: "#fde1ec", rail: "#69c8ff" },
      gifts: [
        { dock: 2, lane: 1, seal: "파" },
        { dock: 0, lane: 2, seal: "리" },
        { dock: 1, lane: 0, seal: "종" },
        { dock: 2, lane: 2, seal: "꽃" },
        { dock: 0, lane: 1, seal: "잎" },
        { dock: 1, lane: 2, seal: "별" }
      ]
    },
    {
      name: "일방 숲길",
      short: "일방길",
      rule: "첫 스위치를 틀리면 상자가 출발점으로 돌아옵니다.",
      guide: "일방통행 표지를 보고 먼저 지나갈 길을 정확히 맞추세요.",
      parMoves: 10,
      autoLaunch: false,
      allowMidSwitch: true,
      oneWay: true,
      theme: { sky: "#e4fff3", middle: "#d6ebba", ground: "#dff8ff", rail: "#75c96b" },
      gifts: [
        { dock: 1, lane: 0, seal: "솔" },
        { dock: 0, lane: 0, seal: "잎" },
        { dock: 2, lane: 2, seal: "샘" },
        { dock: 1, lane: 1, seal: "새" },
        { dock: 0, lane: 2, seal: "달" },
        { dock: 2, lane: 1, seal: "꽃" }
      ]
    },
    {
      name: "되돌이 항구",
      short: "되돌이",
      rule: "뒤 스위치가 틀리면 한 번 되돌아와 다시 고를 수 있습니다.",
      guide: "되돌이 레일을 도는 동안 뒤 스위치를 바꿔 마지막 정류장을 맞추세요.",
      parMoves: 12,
      autoLaunch: true,
      allowMidSwitch: true,
      returnWrongDock: true,
      launchInterval: 2,
      theme: { sky: "#e7fbff", middle: "#ffe6ba", ground: "#d7ecff", rail: "#c89157" },
      gifts: [
        { dock: 0, lane: 1, seal: "닻" },
        { dock: 2, lane: 0, seal: "돛" },
        { dock: 1, lane: 2, seal: "물" },
        { dock: 2, lane: 1, seal: "별" },
        { dock: 0, lane: 2, seal: "등" },
        { dock: 1, lane: 0, seal: "달" }
      ]
    }
  ];
  stagePresets.forEach((stage, index) => {
    stage.maps = buildChapterMaps(stage, index);
  });
  const progressStorageKey = "cozySwitchyardProgress:v2";
  const likedReplaysStorageKey = "cozySwitchyardLikedReplays:v1";
  const stampRanks = { "-": 0, C: 1, B: 2, A: 3, S: 4 };
  const returnLoop = { x: 622, y: 448 };

  let state;

  function buildChapterMaps(stage, chapterIndex) {
    const gifts = stage.gifts.map((gift) => ({ ...gift }));
    const rotateGift = (gift, offset) => ({
      ...gift,
      lane: (gift.lane + offset + lanes.length) % lanes.length,
      dock: (gift.dock + chapterIndex + offset + docks.length) % docks.length
    });
    const weave = gifts.map((gift, index) => rotateGift(gift, index % 2 === 0 ? 1 : -1));
    const sprint = gifts
      .slice()
      .reverse()
      .map((gift, index) => rotateGift(gift, index % 3 === 0 ? 2 : 0));

    return [
      {
        name: "느긋한길",
        parMoves: stage.parMoves,
        gifts
      },
      {
        name: "꼬리표길",
        parMoves: Math.max(6, stage.parMoves - 1),
        gifts: weave
      },
      {
        name: "반짝우회",
        parMoves: stage.parMoves + (stage.returnWrongDock ? 1 : 0),
        gifts: sprint
      }
    ];
  }

  function normalizeStageIndex(value) {
    const index = Number(value);
    if (!Number.isFinite(index)) {
      return 0;
    }
    return Math.max(0, Math.min(stagePresets.length - 1, Math.round(index)));
  }

  function normalizeMapIndex(stageIndex, value) {
    const maps = stagePresets[normalizeStageIndex(stageIndex)].maps || [];
    const index = Number(value);
    if (!Number.isFinite(index)) {
      return 0;
    }
    return Math.max(0, Math.min(Math.max(0, maps.length - 1), Math.round(index)));
  }

  function emptyStageRecord() {
    return {
      bestScore: 0,
      bestStamp: "-",
      bestMoves: 0,
      clears: 0,
      perfectRoutes: 0,
      mapRecords: []
    };
  }

  function emptyMapRecord() {
    return {
      bestScore: 0,
      bestStamp: "-",
      bestMoves: 0,
      clears: 0,
      perfectRoutes: 0,
      bestReplayCode: ""
    };
  }

  function resetGame(stageIndex = null, mapIndex = null) {
    const progress = loadProgress();
    const selectedStageIndex = normalizeStageIndex(stageIndex ?? progress.selectedStageIndex);
    const selectedMapIndexes = normalizeSelectedMapIndexes(progress.selectedMapIndexes);
    const selectedMapIndex = normalizeMapIndex(selectedStageIndex, mapIndex ?? selectedMapIndexes[selectedStageIndex]);
    const stage = stagePresets[selectedStageIndex];
    state = {
      active: true,
      finished: false,
      lastTime: performance.now(),
      stageIndex: selectedStageIndex,
      mapIndex: selectedMapIndex,
      score: 0,
      delivered: 0,
      currentIndex: 0,
      switchAIndex: 1,
      switchBIndex: 1,
      moving: false,
      segment: 0,
      progressOnSegment: 0,
      routeLaneIndex: null,
      routeDockIndex: null,
      returning: false,
      usedReturnLoop: false,
      returnLoopUses: 0,
      detourBonuses: 0,
      launchCooldown: stage.autoLaunch ? 1.1 : 0,
      moveCount: 0,
      mistakes: 0,
      streak: 0,
      path: [],
      routeLog: [],
      gift: { x: start.x, y: start.y },
      sparks: [],
      progress,
      currentReplayCode: "",
      replayRecord: null,
      hint: ""
    };
    state.hint = stage.autoLaunch ? `${stage.guide} 첫 상자가 곧 출발합니다.` : nextHint();
    state.progress.selectedStageIndex = selectedStageIndex;
    state.progress.selectedMapIndexes = selectedMapIndexes;
    state.progress.selectedMapIndexes[selectedStageIndex] = selectedMapIndex;
    localStorage.setItem(progressStorageKey, JSON.stringify(state.progress));
    resultOverlay.hidden = true;
    syncReplayButtons();
    updateHud();
  }

  function loadProgress() {
    try {
      const parsed = JSON.parse(localStorage.getItem(progressStorageKey) || "{}");
      const stageRecords = stagePresets.map((_, index) => {
        const record = Array.isArray(parsed.stageRecords) && parsed.stageRecords[index]
          ? parsed.stageRecords[index]
          : {};
        const mapRecords = stagePresets[index].maps.map((__, mapIndex) => {
          const mapRecord = Array.isArray(record.mapRecords) && record.mapRecords[mapIndex]
            ? record.mapRecords[mapIndex]
            : {};
          return normalizeMapRecord(mapRecord);
        });
        return {
          ...emptyStageRecord(),
          ...record,
          bestScore: Number(record.bestScore || 0),
          bestStamp: typeof record.bestStamp === "string" ? record.bestStamp : "-",
          bestMoves: Number(record.bestMoves || 0),
          clears: Number(record.clears || 0),
          perfectRoutes: Number(record.perfectRoutes || 0),
          mapRecords
        };
      });
      return {
        bestScore: Number(parsed.bestScore || 0),
        bestStamp: typeof parsed.bestStamp === "string" ? parsed.bestStamp : "-",
        bestMoves: Number(parsed.bestMoves || 0),
        perfectRoutes: Number(parsed.perfectRoutes || 0),
        selectedStageIndex: normalizeStageIndex(parsed.selectedStageIndex),
        selectedMapIndexes: normalizeSelectedMapIndexes(parsed.selectedMapIndexes),
        stageRecords,
        replayStats: normalizeReplayStats(parsed.replayStats),
        lastReplayCode: typeof parsed.lastReplayCode === "string" ? parsed.lastReplayCode : ""
      };
    } catch {
      return {
        bestScore: 0,
        bestStamp: "-",
        bestMoves: 0,
        perfectRoutes: 0,
        selectedStageIndex: 0,
        selectedMapIndexes: normalizeSelectedMapIndexes(null),
        stageRecords: stagePresets.map((stage) => ({
          ...emptyStageRecord(),
          mapRecords: stage.maps.map(emptyMapRecord)
        })),
        replayStats: {},
        lastReplayCode: ""
      };
    }
  }

  function saveProgress(stamp) {
    const record = state.progress.stageRecords[state.stageIndex] || emptyStageRecord();
    const mapRecord = normalizeMapRecord(record.mapRecords?.[state.mapIndex]);
    const total = totalBoxes();
    state.progress.selectedStageIndex = state.stageIndex;
    state.progress.selectedMapIndexes = normalizeSelectedMapIndexes(state.progress.selectedMapIndexes);
    state.progress.selectedMapIndexes[state.stageIndex] = state.mapIndex;
    state.progress.bestScore = Math.max(state.progress.bestScore, Math.round(state.score));
    if (stampRanks[stamp] > stampRanks[state.progress.bestStamp || "-"]) {
      state.progress.bestStamp = stamp;
    }
    if (state.delivered === total && (state.progress.bestMoves === 0 || state.moveCount < state.progress.bestMoves)) {
      state.progress.bestMoves = state.moveCount;
    }
    if (stamp === "S") {
      state.progress.perfectRoutes += 1;
    }
    record.bestScore = Math.max(record.bestScore, Math.round(state.score));
    if (stampRanks[stamp] > stampRanks[record.bestStamp || "-"]) {
      record.bestStamp = stamp;
    }
    if (state.delivered === total && (record.bestMoves === 0 || state.moveCount < record.bestMoves)) {
      record.bestMoves = state.moveCount;
    }
    if (state.delivered === total) {
      record.clears += 1;
    }
    if (stamp === "S") {
      record.perfectRoutes += 1;
    }
    mapRecord.bestScore = Math.max(mapRecord.bestScore, Math.round(state.score));
    if (stampRanks[stamp] > stampRanks[mapRecord.bestStamp || "-"]) {
      mapRecord.bestStamp = stamp;
    }
    if (state.delivered === total && (mapRecord.bestMoves === 0 || state.moveCount < mapRecord.bestMoves)) {
      mapRecord.bestMoves = state.moveCount;
    }
    if (state.delivered === total) {
      mapRecord.clears += 1;
    }
    if (stamp === "S") {
      mapRecord.perfectRoutes += 1;
    }
    if (state.currentReplayCode) {
      mapRecord.bestReplayCode = state.currentReplayCode;
    }
    record.mapRecords = stagePresets[state.stageIndex].maps.map((_, index) =>
      index === state.mapIndex ? mapRecord : normalizeMapRecord(record.mapRecords?.[index])
    );
    state.progress.stageRecords[state.stageIndex] = record;
    state.progress.replayStats = normalizeReplayStats(state.progress.replayStats);
    localStorage.setItem(progressStorageKey, JSON.stringify(state.progress));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function localDayKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function normalizeMapRecord(record) {
    const source = record && typeof record === "object" ? record : {};
    return {
      ...emptyMapRecord(),
      bestScore: Math.max(0, Number(source.bestScore || 0)),
      bestStamp: typeof source.bestStamp === "string" ? source.bestStamp : "-",
      bestMoves: Math.max(0, Number(source.bestMoves || 0)),
      clears: Math.max(0, Number(source.clears || 0)),
      perfectRoutes: Math.max(0, Number(source.perfectRoutes || 0)),
      bestReplayCode: typeof source.bestReplayCode === "string" ? source.bestReplayCode : ""
    };
  }

  function normalizeSelectedMapIndexes(indexes) {
    return stagePresets.map((_, stageIndex) => {
      const value = Array.isArray(indexes) ? indexes[stageIndex] : 0;
      return normalizeMapIndex(stageIndex, value);
    });
  }

  function currentStage() {
    return stagePresets[state ? state.stageIndex : 0];
  }

  function currentMap() {
    const stage = currentStage();
    return stage.maps?.[state ? state.mapIndex : 0] || {
      name: "기본길",
      parMoves: stage.parMoves,
      gifts: stage.gifts
    };
  }

  function currentOrders() {
    return currentMap().gifts;
  }

  function totalBoxes() {
    return currentOrders().length;
  }

  function currentParMoves() {
    return currentMap().parMoves || currentStage().parMoves;
  }

  function currentGift() {
    const orders = currentOrders();
    return orders[state.currentIndex] || orders[orders.length - 1];
  }

  function currentDock() {
    return docks[currentGift().dock];
  }

  function currentLane() {
    return lanes[currentGift().lane];
  }

  function selectedDock() {
    return docks[state.switchBIndex];
  }

  function selectedLane() {
    return lanes[state.switchAIndex];
  }

  function nextHint() {
    const gift = currentGift();
    const dock = docks[gift.dock];
    const lane = lanes[gift.lane];
    return `${gift.seal} 상자는 ${lane.ko}을 지나 ${dock.ko} 정류장으로 보내야 합니다.`;
  }

  function projectedStamp() {
    if (state.mistakes === 0 && state.moveCount <= currentParMoves()) {
      return "S";
    }
    if (state.mistakes <= 1 && state.delivered >= Math.max(1, state.currentIndex - 1)) {
      return "A";
    }
    if (state.delivered >= 3) {
      return "B";
    }
    return "C";
  }

  function finalStamp() {
    const total = totalBoxes();
    if (state.delivered === total && state.mistakes === 0 && state.moveCount <= currentParMoves()) {
      return "S";
    }
    if (state.delivered === total && state.mistakes <= 1) {
      return "A";
    }
    if (state.delivered >= 4) {
      return "B";
    }
    return "C";
  }

  function chapterProgressText() {
    const record = state.progress.stageRecords[state.stageIndex] || emptyStageRecord();
    const mapRecords = currentStage().maps.map((_, index) => normalizeMapRecord(record.mapRecords?.[index]));
    const cleared = mapRecords.filter((item) => item.clears > 0).length;
    const sCount = mapRecords.filter((item) => item.bestStamp === "S").length;
    return `맵 ${cleared}/${mapRecords.length}, S ${sCount}/${mapRecords.length}`;
  }

  function compressRouteLog() {
    return state.routeLog
      .slice(0, 9)
      .map((entry) => `${entry.box}${entry.lane}${entry.dock}${entry.ok ? "T" : "F"}${entry.loop ? "L" : "N"}`)
      .join(".");
  }

  function buildReplayCode(stamp) {
    const scoreKey = Math.max(0, Math.round(state.score)).toString(36).toUpperCase();
    const movesKey = state.moveCount.toString(36).toUpperCase();
    const dayKey = localDayKey().replace(/-/g, "").slice(2);
    return [
      "CSY1",
      `C${state.stageIndex + 1}`,
      `M${state.mapIndex + 1}`,
      stamp,
      scoreKey,
      movesKey,
      `E${state.mistakes}`,
      `R${state.returnLoopUses}`,
      compressRouteLog() || "EMPTY",
      dayKey
    ].join("-");
  }

  function normalizeReplayStats(stats) {
    const normalized = {};
    if (!stats || typeof stats !== "object") {
      return normalized;
    }
    Object.entries(stats).forEach(([code, record]) => {
      if (typeof code !== "string" || !code.startsWith("CSY1-") || !record || typeof record !== "object") {
        return;
      }
      normalized[code] = {
        shares: Math.max(0, Number(record.shares || 0)),
        likes: Math.max(0, Number(record.likes || 0)),
        bestScore: Math.max(0, Number(record.bestScore || 0)),
        bestStamp: typeof record.bestStamp === "string" ? record.bestStamp : "-",
        bestMoves: Math.max(0, Number(record.bestMoves || 0)),
        detours: Math.max(0, Number(record.detours || 0))
      };
    });
    return normalized;
  }

  function getReplayRecord(code) {
    state.progress.replayStats = normalizeReplayStats(state.progress.replayStats);
    if (!state.progress.replayStats[code]) {
      state.progress.replayStats[code] = {
        shares: 0,
        likes: 0,
        bestScore: 0,
        bestStamp: "-",
        bestMoves: 0,
        detours: 0
      };
    }
    return state.progress.replayStats[code];
  }

  function syncReplayRecord(stamp) {
    const code = buildReplayCode(stamp);
    const record = getReplayRecord(code);
    record.bestScore = Math.max(record.bestScore, Math.round(state.score));
    record.bestMoves = record.bestMoves === 0 ? state.moveCount : Math.min(record.bestMoves, state.moveCount);
    record.detours = Math.max(record.detours, state.detourBonuses);
    if (stampRanks[stamp] > stampRanks[record.bestStamp || "-"]) {
      record.bestStamp = stamp;
    }
    state.currentReplayCode = code;
    state.replayRecord = record;
    state.progress.lastReplayCode = code;
    return { code, record };
  }

  function loadLikedReplays() {
    try {
      const parsed = JSON.parse(localStorage.getItem(likedReplaysStorageKey) || "[]");
      return Array.isArray(parsed) ? parsed.filter((code) => typeof code === "string") : [];
    } catch {
      return [];
    }
  }

  function saveLikedReplays(codes) {
    localStorage.setItem(likedReplaysStorageKey, JSON.stringify([...new Set(codes)]));
  }

  function persistProgress() {
    state.progress.replayStats = normalizeReplayStats(state.progress.replayStats);
    localStorage.setItem(progressStorageKey, JSON.stringify(state.progress));
  }

  function shareReplayCard() {
    if (!state.currentReplayCode) {
      return;
    }
    const record = getReplayRecord(state.currentReplayCode);
    record.shares += 1;
    persistProgress();
    state.hint = `리플레이 카드 ${state.currentReplayCode} 공유 준비`;
    syncReplayButtons();
    updateHud();
  }

  function likeReplayCard() {
    if (!state.currentReplayCode) {
      return;
    }
    const liked = loadLikedReplays();
    if (liked.includes(state.currentReplayCode)) {
      state.hint = "이 리플레이 카드는 이미 응원했습니다.";
      syncReplayButtons();
      updateHud();
      return;
    }
    const record = getReplayRecord(state.currentReplayCode);
    record.likes += 1;
    liked.push(state.currentReplayCode);
    saveLikedReplays(liked);
    persistProgress();
    state.hint = `리플레이 응원 ${record.likes}개`;
    syncReplayButtons();
    updateHud();
  }

  function syncReplayButtons() {
    const hasReplay = Boolean(state.currentReplayCode);
    const record = hasReplay ? getReplayRecord(state.currentReplayCode) : null;
    const liked = hasReplay ? loadLikedReplays().includes(state.currentReplayCode) : false;
    shareReplayButton.disabled = !hasReplay;
    replayLikeButton.disabled = !hasReplay || liked;
    replayLikeButton.textContent = hasReplay ? `응원 ${record.likes}` : "응원 0";
  }

  function updateHud() {
    const stage = currentStage();
    const total = totalBoxes();
    const dock = currentDock();
    deliveredValue.textContent = `${state.delivered}/${total}`;
    boxValue.textContent = String(Math.max(0, total - state.currentIndex));
    dockValue.textContent = state.currentIndex >= total ? "DONE" : dock.name;
    moveValue.textContent = String(state.moveCount);
    stampValue.textContent = state.finished ? finalStamp() : projectedStamp();
    scoreValue.textContent = String(Math.max(0, Math.round(state.score)));
    hintText.textContent = state.hint;
    ruleText.textContent = `${stage.rule} · ${chapterProgressText()}`;
    stageLabel.textContent = `${state.stageIndex + 1}/${stagePresets.length} ${stage.short}`;
    mapLabel.textContent = `M${state.mapIndex + 1}/${stage.maps.length} ${currentMap().name}`;
    switchAButton.textContent = `앞 ${selectedLane().short}`;
    switchBButton.textContent = `뒤 ${selectedDock().name}`;
    if (stage.autoLaunch && state.active && !state.moving && state.currentIndex < total) {
      launchButton.textContent = state.launchCooldown > 0 ? `${Math.ceil(state.launchCooldown)}초` : "바로 출발";
    } else {
      launchButton.textContent = "출발";
    }
  }

  function cycleSwitch(which, direction = 1) {
    if (!state.active || (state.moving && !currentStage().allowMidSwitch)) {
      return;
    }

    if (which === "lane") {
      state.switchAIndex = (state.switchAIndex + direction + lanes.length) % lanes.length;
      state.hint = state.moving
        ? `달리는 중 앞 스위치를 ${selectedLane().ko}로 바꿨어요.`
        : `앞 스위치가 ${selectedLane().ko}로 향합니다.`;
      addSparks(switchA.x, switchA.y, selectedLane().color, 8);
    } else {
      state.switchBIndex = (state.switchBIndex + direction + docks.length) % docks.length;
      state.hint = state.moving
        ? `달리는 중 뒤 스위치를 ${selectedDock().ko} 정류장으로 바꿨어요.`
        : `뒤 스위치가 ${selectedDock().ko} 정류장으로 향합니다.`;
      addSparks(switchB.x, switchB.y, selectedDock().color, 8);
    }

    state.moveCount += 1;
    updateHud();
  }

  function launchGift() {
    if (!state.active || state.moving || state.currentIndex >= totalBoxes()) {
      return;
    }

    state.path = [
      { ...start, node: "start" },
      { ...switchA, node: "switchA" }
    ];
    state.segment = 0;
    state.progressOnSegment = 0;
    state.routeLaneIndex = null;
    state.routeDockIndex = null;
    state.returning = false;
    state.usedReturnLoop = false;
    state.launchCooldown = 0;
    state.moving = true;
    state.hint = currentStage().allowMidSwitch
      ? "상자가 움직입니다. 도착하기 전에 필요한 스위치를 바꾸세요."
      : "상자가 두 스위치를 지나 이동합니다.";
    updateHud();
  }

  function sendBackToStart(message) {
    state.returning = true;
    state.mistakes += 1;
    state.streak = 0;
    state.score = Math.max(0, state.score - 35);
    state.path = [
      { x: state.gift.x, y: state.gift.y, node: "returning" },
      { ...start, node: "start" }
    ];
    state.segment = 0;
    state.progressOnSegment = 0;
    state.hint = message;
    addSparks(state.gift.x, state.gift.y, "#ffffff", 14);
  }

  function finishReturnToStart() {
    const stage = currentStage();
    state.returning = false;
    state.moving = false;
    state.gift.x = start.x;
    state.gift.y = start.y;
    state.launchCooldown = stage.autoLaunch ? 1.1 : 0;
    state.hint = stage.autoLaunch
      ? `${stage.guide} 다시 곧 출발합니다.`
      : `${stage.guide} 같은 상자를 다시 보내세요.`;
  }

  function handleRouteNode(node) {
    const stage = currentStage();
    const gift = currentGift();

    if (state.returning && node === "start") {
      finishReturnToStart();
      return true;
    }

    if (node === "switchA") {
      state.routeLaneIndex = state.switchAIndex;
      if (stage.oneWay && state.routeLaneIndex !== gift.lane) {
        sendBackToStart(`일방통행 표지와 달라서 되돌아왔어요. ${lanes[gift.lane].ko}로 맞추세요.`);
        return true;
      }
      const lane = lanes[state.routeLaneIndex];
      state.path.push({ x: laneJoin.x, y: lane.y, node: "laneJoin" });
      return false;
    }

    if (node === "laneJoin") {
      state.path.push({ ...switchB, node: "switchB" });
      return false;
    }

    if (node === "returnLoop") {
      state.path.push({ ...switchB, node: "switchB" });
      return false;
    }

    if (node === "switchB") {
      const chosenDockIndex = state.switchBIndex;
      if (stage.returnWrongDock && chosenDockIndex !== gift.dock && !state.usedReturnLoop) {
        state.usedReturnLoop = true;
        state.returnLoopUses += 1;
        state.hint = `${selectedDock().ko} 앞에서 되돌이 레일을 탔어요. 뒤 스위치를 바꿀 기회입니다.`;
        state.path.push({ ...returnLoop, node: "returnLoop" });
        addSparks(switchB.x, switchB.y, "#ffffff", 12);
        return false;
      }

      state.routeDockIndex = chosenDockIndex;
      const dock = docks[state.routeDockIndex];
      state.path.push({ x: dock.x, y: dock.y, node: "dock" });
      return false;
    }

    return false;
  }

  function arriveGift() {
    const expectedDock = currentDock();
    const expectedLane = currentLane();
    const chosenDock = docks[state.routeDockIndex ?? state.switchBIndex];
    const chosenLane = lanes[state.routeLaneIndex ?? state.switchAIndex];
    const laneOk = expectedLane.name === chosenLane.name;
    const dockOk = expectedDock.name === chosenDock.name;
    const success = laneOk && dockOk;

    if (success) {
      state.delivered += 1;
      state.streak += 1;
      state.score += 190 + state.delivered * 25 + state.streak * 20;
      if (state.moveCount <= currentParMoves()) {
        state.score += 30;
      }
      if (state.usedReturnLoop) {
        state.detourBonuses += 1;
        state.score += 85;
      }
      state.hint = `${expectedLane.ko} 경유, ${expectedDock.ko} 도착 성공!`;
      if (state.usedReturnLoop) {
        state.hint = `${state.hint} 우회 보너스 +85`;
      }
      addSparks(chosenDock.x, chosenDock.y, chosenDock.color, 22);
    } else {
      state.mistakes += 1;
      state.streak = 0;
      state.score = Math.max(0, state.score - 45);
      state.hint = laneOk
        ? `정류장은 ${expectedDock.ko}이어야 했어요.`
        : `먼저 ${expectedLane.ko}을 지나야 했어요.`;
      addSparks(chosenDock.x, chosenDock.y, "#ffffff", 12);
    }

    state.routeLog.push({
      box: state.currentIndex + 1,
      lane: state.routeLaneIndex ?? state.switchAIndex,
      dock: state.routeDockIndex ?? state.switchBIndex,
      ok: success,
      loop: state.usedReturnLoop
    });

    state.currentIndex += 1;
    state.moving = false;
    state.gift.x = start.x;
    state.gift.y = start.y;

    if (state.currentIndex >= totalBoxes()) {
      finishGame();
    } else {
      const stage = currentStage();
      if (stage.autoLaunch) {
        state.launchCooldown = stage.launchInterval || 1.7;
        state.hint = `${state.hint} 다음 상자는 곧 자동 출발합니다.`;
      } else {
        state.hint = success ? `${state.hint} 다음은 ${nextHint()}` : `${state.hint} 다음 상자: ${nextHint()}`;
      }
    }
    updateHud();
  }

  function finishGame() {
    if (state.finished) {
      return;
    }

    state.active = false;
    state.finished = true;
    resultOverlay.hidden = false;
    const stamp = finalStamp();
    const perfect = stamp === "S";
    const bonus = perfect ? 320 : state.delivered * 35 + stampRanks[stamp] * 45;
    const noReturnBonus = state.delivered === totalBoxes() && state.mistakes === 0 && state.returnLoopUses === 0 ? 180 : 0;
    state.score += bonus;
    state.score += noReturnBonus;
    const replay = syncReplayRecord(stamp);
    resultKicker.textContent = perfect ? `${currentStage().short} S Stamp` : `${currentStage().short} Closed`;
    resultTitle.textContent = perfect ? "스탬프 S!" : "오늘 분류 마감";
    resultCopy.textContent =
      `스탬프 ${stamp}, 조작 ${state.moveCount}회, 오배송 ${state.mistakes}회입니다. ` +
      `우회 ${state.detourBonuses}회, 무반송 보너스 ${noReturnBonus}점, 카드 ${replay.code}, 응원 ${replay.record.likes}입니다.`;
    saveProgress(stamp);
    syncReplayButtons();
    updateHud();
  }

  function addSparks(x, y, color, count = 10) {
    for (let i = 0; i < count; i += 1) {
      state.sparks.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 100,
        vy: (Math.random() - 0.8) * 90,
        life: 0.7,
        maxLife: 0.7,
        color
      });
    }
  }

  function updateGift(dt) {
    if (!state.moving) {
      return;
    }

    const from = state.path[state.segment];
    const to = state.path[state.segment + 1];
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const speed = state.streak >= 2 ? 215 : 190;
    state.progressOnSegment += (speed * dt) / distance;

    if (state.progressOnSegment >= 1) {
      state.segment += 1;
      state.progressOnSegment = 0;
      state.gift.x = to.x;
      state.gift.y = to.y;
      if (handleRouteNode(to.node)) {
        return;
      }
      if (state.segment >= state.path.length - 1) {
        arriveGift();
      }
      return;
    }

    state.gift.x = from.x + (to.x - from.x) * state.progressOnSegment;
    state.gift.y = from.y + (to.y - from.y) * state.progressOnSegment;
  }

  function updateSparks(dt) {
    state.sparks = state.sparks.filter((spark) => {
      spark.life -= dt;
      spark.vy += 180 * dt;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      return spark.life > 0;
    });
  }

  function updateTimedLaunch(dt) {
    const stage = currentStage();
    if (!stage.autoLaunch || !state.active || state.finished || state.moving || state.currentIndex >= totalBoxes()) {
      return;
    }

    state.launchCooldown = Math.max(0, state.launchCooldown - dt);
    if (state.launchCooldown <= 0) {
      launchGift();
    }
  }

  function updateGame(dt) {
    if (!state.finished) {
      updateTimedLaunch(dt);
      updateGift(dt);
    }
    updateSparks(dt);
    updateHud();
  }

  function drawPixelRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function drawBackground() {
    const theme = currentStage().theme;
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, theme.sky);
    gradient.addColorStop(0.58, theme.middle);
    gradient.addColorStop(1, theme.ground);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = "#243047";
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawRail(from, to, active, color = "#9f8b65") {
    ctx.strokeStyle = active ? color : "#9f8b65";
    ctx.lineWidth = active ? 14 : 10;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }

  function drawRailArrow(x, y, color) {
    ctx.fillStyle = color;
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 10);
    ctx.lineTo(x + 10, y);
    ctx.lineTo(x - 8, y + 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function drawRails() {
    const stage = currentStage();
    drawRail(start, switchA, true, stage.theme.rail);
    lanes.forEach((lane, index) => {
      const lanePoint = { x: laneJoin.x, y: lane.y };
      drawRail(switchA, lanePoint, index === state.switchAIndex, lane.color);
      drawRail(lanePoint, switchB, index === state.switchAIndex, lane.color);
      if (stage.oneWay) {
        drawRailArrow(386, lane.y, lane.color);
        drawRailArrow(506, lane.y, lane.color);
      }
    });
    docks.forEach((dock, index) => {
      drawRail(switchB, dock, index === state.switchBIndex, dock.color);
    });
    if (stage.returnWrongDock) {
      drawRail(switchB, returnLoop, true, "#c89157");
      drawRailArrow(returnLoop.x - 20, returnLoop.y - 5, "#ffd85a");
    }

    drawSwitchNode(switchA, selectedLane().color, "A");
    drawSwitchNode(switchB, selectedDock().color, "B");
  }

  function drawSwitchNode(point, color, label) {
    ctx.fillStyle = color;
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#182033";
    ctx.font = "900 16px ui-monospace, Consolas, monospace";
    ctx.textAlign = "center";
    ctx.fillText(label, point.x, point.y + 6);
  }

  function drawDocks() {
    docks.forEach((dock) => {
      drawPixelRect(dock.x - 42, dock.y - 30, 84, 60, "#ffffff");
      drawPixelRect(dock.x - 32, dock.y - 20, 64, 40, dock.color);
      ctx.strokeStyle = "#243047";
      ctx.lineWidth = 4;
      ctx.strokeRect(dock.x - 42, dock.y - 30, 84, 60);
      ctx.fillStyle = "#182033";
      ctx.font = "900 13px ui-monospace, Consolas, monospace";
      ctx.textAlign = "center";
      ctx.fillText(dock.short, dock.x, dock.y + 48);
    });
  }

  function drawGift() {
    if (state.currentIndex >= totalBoxes()) {
      return;
    }

    const dock = currentDock();
    const lane = currentLane();
    const gift = state.gift;
    drawPixelRect(gift.x - 20, gift.y - 18, 40, 36, dock.color);
    drawPixelRect(gift.x - 20, gift.y - 24, 40, 7, lane.color);
    drawPixelRect(gift.x - 4, gift.y - 18, 8, 36, "#fff9ed");
    drawPixelRect(gift.x - 20, gift.y - 2, 40, 8, "#fff9ed");
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 4;
    ctx.strokeRect(gift.x - 20, gift.y - 18, 40, 36);
    ctx.fillStyle = "#182033";
    ctx.font = "900 12px ui-monospace, Consolas, monospace";
    ctx.textAlign = "center";
    ctx.fillText(currentGift().seal, gift.x, gift.y + 34);
  }

  function drawSparks() {
    for (const spark of state.sparks) {
      ctx.globalAlpha = spark.life / spark.maxLife;
      drawPixelRect(spark.x, spark.y, 5, 5, spark.color);
    }
    ctx.globalAlpha = 1;
  }

  function drawRouteCard() {
    const gift = currentGift();
    if (!gift || state.currentIndex >= totalBoxes()) {
      return;
    }
    drawPixelRect(48, 40, 252, 88, "rgba(255,255,255,0.85)");
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 3;
    ctx.strokeRect(48, 40, 252, 88);
    ctx.fillStyle = "#526078";
    ctx.font = "900 12px ui-monospace, Consolas, monospace";
    ctx.textAlign = "left";
    ctx.fillText(`${state.stageIndex + 1}/${stagePresets.length} ${currentStage().short} · M${state.mapIndex + 1}`, 62, 62);
    ctx.fillStyle = currentLane().color;
    ctx.fillRect(62, 76, 42, 12);
    ctx.fillStyle = currentDock().color;
    ctx.fillRect(112, 76, 42, 12);
    ctx.fillStyle = "#182033";
    ctx.font = "900 15px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(`${currentLane().ko} / ${currentDock().ko}`, 62, 104);
    if (currentStage().autoLaunch && !state.moving) {
      ctx.fillStyle = "#526078";
      ctx.font = "900 12px ui-monospace, Consolas, monospace";
      ctx.fillText(`AUTO ${Math.ceil(state.launchCooldown)}s`, 182, 88);
    }
  }

  function draw() {
    drawBackground();
    drawRails();
    drawDocks();
    drawGift();
    drawRouteCard();
    drawSparks();
  }

  function loop(timestamp) {
    const dt = clamp((timestamp - state.lastTime) / 1000, 0, 0.04);
    state.lastTime = timestamp;
    updateGame(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function canvasPress(event) {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (width / rect.width);
    const y = (event.clientY - rect.top) * (height / rect.height);
    if (Math.hypot(x - switchA.x, y - switchA.y) < 80) {
      cycleSwitch("lane");
    } else if (Math.hypot(x - switchB.x, y - switchB.y) < 80) {
      cycleSwitch("dock");
    }
  }

  function changeStage(direction) {
    resetGame((state.stageIndex + direction + stagePresets.length) % stagePresets.length);
  }

  function changeMap(direction) {
    const count = currentStage().maps.length;
    resetGame(state.stageIndex, (state.mapIndex + direction + count) % count);
  }

  canvas.addEventListener("pointerdown", canvasPress);
  switchAButton.addEventListener("click", () => cycleSwitch("lane"));
  switchBButton.addEventListener("click", () => cycleSwitch("dock"));
  launchButton.addEventListener("click", launchGift);
  stagePrevButton.addEventListener("click", () => changeStage(-1));
  stageNextButton.addEventListener("click", () => changeStage(1));
  mapPrevButton.addEventListener("click", () => changeMap(-1));
  mapNextButton.addEventListener("click", () => changeMap(1));
  restartButton.addEventListener("click", () => resetGame(state.stageIndex, state.mapIndex));
  overlayRestartButton.addEventListener("click", () => resetGame(state.stageIndex, state.mapIndex));
  shareReplayButton.addEventListener("click", shareReplayCard);
  replayLikeButton.addEventListener("click", likeReplayCard);
  window.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp") {
      cycleSwitch("lane", -1);
    }
    if (event.key === "ArrowDown") {
      cycleSwitch("lane", 1);
    }
    if (event.key === "ArrowLeft") {
      cycleSwitch("dock", -1);
    }
    if (event.key === "ArrowRight") {
      cycleSwitch("dock", 1);
    }
    if (event.code === "Space" || event.key === "Enter") {
      event.preventDefault();
      launchGift();
    }
  });

  resetGame();
  requestAnimationFrame(loop);
})();
