(() => {
  const canvas = document.getElementById("lunchCanvas");
  const ctx = canvas.getContext("2d");
  const timeValue = document.getElementById("timeValue");
  const bentoValue = document.getElementById("bentoValue");
  const judgeValue = document.getElementById("judgeValue");
  const comboValue = document.getElementById("comboValue");
  const cardValue = document.getElementById("cardValue");
  const scoreValue = document.getElementById("scoreValue");
  const hintText = document.getElementById("hintText");
  const dailyButton = document.getElementById("dailyButton");
  const stickerButton = document.getElementById("stickerButton");
  const cardButton = document.getElementById("cardButton");
  const compareButton = document.getElementById("compareButton");
  const restartButton = document.getElementById("restartButton");
  const overlayRestartButton = document.getElementById("overlayRestartButton");
  const resultOverlay = document.getElementById("resultOverlay");
  const resultKicker = document.getElementById("resultKicker");
  const resultTitle = document.getElementById("resultTitle");
  const resultCopy = document.getElementById("resultCopy");

  const width = canvas.width;
  const height = canvas.height;
  const targetCount = 18;
  const dailyTargetCount = 24;
  const cardTotal = 9;
  const grid = { x: 218, y: 86, cell: 116, gap: 12 };
  const foodColors = ["#ffd85a", "#35d7a8", "#e95b88", "#69c8ff", "#ff9a6c", "#8f78ff"];
  const baseBeatWindows = {
    perfect: 0.1,
    good: 0.3,
    burn: 0.56
  };
  const menus = [
    {
      id: "sushi",
      name: "초밥",
      pattern: [0, 1, 2, 5, 8, 7, 6, 3, 4, 1, 5, 7, 3, 0, 4, 8, 2, 6],
      accent: "#e95b88",
      notes: [523, 659, 784, 659],
      beatCenter: 0.7
    },
    {
      id: "kimbap",
      name: "김밥",
      pattern: [3, 4, 5, 2, 1, 0, 3, 6, 7, 8, 5, 4, 1, 2, 5, 8, 7, 4],
      accent: "#35d7a8",
      notes: [392, 494, 587, 740],
      beatCenter: 0.64
    },
    {
      id: "fruit",
      name: "과일",
      pattern: [6, 4, 2, 0, 1, 5, 8, 4, 6, 7, 3, 0, 4, 8, 5, 1, 3, 7],
      accent: "#ffd85a",
      notes: [440, 554, 660, 880],
      beatCenter: 0.78
    }
  ];
  const progressStorageKey = "lunchboxTapTapProgress:v2";
  const stickerSlots = 6;
  let audioContext = null;

  let state;

  function resetGame(options = {}) {
    const progress = loadProgress();
    const dailyMode = typeof options.dailyMode === "boolean" ? options.dailyMode : progress.lastDailyMode;
    const menu = dailyMode ? menus[dailySeed() % menus.length] : menus[(dailySeed() + progress.plays) % menus.length];
    state = {
      active: true,
      finished: false,
      lastTime: performance.now(),
      dailyMode,
      dayKey: localDayKey(),
      targetGoal: dailyMode ? dailyTargetCount : targetCount,
      timeLeft: dailyMode ? 38 : 32,
      score: 0,
      combo: 0,
      maxCombo: 0,
      perfectHits: 0,
      perfectStreak: 0,
      maxPerfectStreak: 0,
      earlyHits: 0,
      burntHits: 0,
      timingOffsetSum: 0,
      filled: 0,
      patternIndex: 0,
      activeCell: menu.pattern[0],
      nextCell: menu.pattern[1],
      secondNextCell: menu.pattern[2],
      cellStartedAt: performance.now(),
      lastJudge: "READY",
      judgeFlash: 0,
      feverTime: 0,
      rhythmPhraseTime: 0,
      albumMode: false,
      selectedStickerSlot: null,
      menu,
      cells: Array.from({ length: 9 }, () => null),
      sparks: [],
      progress,
      cards: new Set(progress.cards),
      stickers: Array.isArray(progress.stickers) ? progress.stickers.slice(0, stickerSlots) : Array.from({ length: stickerSlots }, () => ""),
      friendRecord: normalizeFriendRecord(progress.friendRecord),
      resultCardCode: "",
      hint: `${dailyMode ? "오늘 메뉴" : menu.name} 도시락 패턴입니다. 링이 가운데 선에 닿을 때 톡 눌러주세요.`
    };
    while (state.stickers.length < stickerSlots) {
      state.stickers.push("");
    }
    state.progress.lastDailyMode = dailyMode;
    localStorage.setItem(progressStorageKey, JSON.stringify(state.progress));
    chooseNextCell();
    resultOverlay.hidden = true;
    updateHud();
  }

  function loadProgress() {
    try {
      const parsed = JSON.parse(localStorage.getItem(progressStorageKey) || "{}");
      return {
        bestScore: Number(parsed.bestScore || 0),
        bestPerfectCombo: Number(parsed.bestPerfectCombo || 0),
        plays: Number(parsed.plays || 0),
        cards: Array.isArray(parsed.cards) ? parsed.cards.filter((card) => typeof card === "string") : [],
        stickers: Array.isArray(parsed.stickers) ? parsed.stickers.filter((card) => typeof card === "string") : [],
        dailyRecords: parsed.dailyRecords && typeof parsed.dailyRecords === "object" ? parsed.dailyRecords : {},
        resultCards: Array.isArray(parsed.resultCards) ? parsed.resultCards.filter((card) => typeof card === "string").slice(-12) : [],
        stickerCursor: Number(parsed.stickerCursor || 0),
        lastDailyMode: Boolean(parsed.lastDailyMode),
        friendRecord: normalizeFriendRecord(parsed.friendRecord)
      };
    } catch {
      return {
        bestScore: 0,
        bestPerfectCombo: 0,
        plays: 0,
        cards: [],
        stickers: [],
        dailyRecords: {},
        resultCards: [],
        stickerCursor: 0,
        lastDailyMode: false,
        friendRecord: null
      };
    }
  }

  function saveProgress() {
    state.progress.bestScore = Math.max(state.progress.bestScore, Math.round(state.score));
    state.progress.bestPerfectCombo = Math.max(state.progress.bestPerfectCombo, state.maxPerfectStreak);
    state.progress.cards = Array.from(state.cards);
    state.progress.stickers = state.stickers;
    state.progress.lastDailyMode = state.dailyMode;
    state.progress.friendRecord = normalizeFriendRecord(state.friendRecord);
    if (state.resultCardCode) {
      state.progress.resultCards = [...new Set([...(state.progress.resultCards || []), state.resultCardCode])].slice(-12);
    }
    localStorage.setItem(progressStorageKey, JSON.stringify(state.progress));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function getAudioContext() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
    return audioContext;
  }

  function playTone(frequency, duration, type = "square", volume = 0.035, delay = 0) {
    try {
      const audio = getAudioContext();
      const startedAt = audio.currentTime + delay;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, startedAt);
      gain.gain.setValueAtTime(0.0001, startedAt);
      gain.gain.exponentialRampToValueAtTime(volume, startedAt + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, startedAt + duration);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(startedAt);
      oscillator.stop(startedAt + duration + 0.02);
    } catch {
      // Audio is optional; gameplay must continue if the browser blocks it.
    }
  }

  function playTapSound(label) {
    const notes = state.menu.notes;
    const note = notes[state.patternIndex % notes.length];
    if (label === "MISS" || label === "BURNT") {
      playTone(154, 0.08, "sawtooth", 0.025);
      return;
    }
    if (label === "EARLY") {
      playTone(note * 0.55, 0.05, "triangle", 0.018);
      return;
    }
    if (label === "LATE") {
      playTone(note * 0.75, 0.08, "triangle", 0.026);
      return;
    }
    playTone(note, 0.07, "square", label === "PERFECT" ? 0.04 : 0.03);
    if (label === "PERFECT") {
      playTone(note * 1.5, 0.06, "triangle", 0.025, 0.055);
    }
  }

  function playRhythmPhrase() {
    const notes = state.menu.notes;
    const start = state.patternIndex % notes.length;
    for (let i = 0; i < 4; i += 1) {
      const note = notes[(start + i) % notes.length];
      playTone(note * (i === 3 ? 1.5 : 1), 0.06, i % 2 === 0 ? "square" : "triangle", 0.024, i * 0.06);
    }
    state.rhythmPhraseTime = 1.2;
  }

  function updateHud() {
    timeValue.textContent = String(Math.ceil(Math.max(0, state.timeLeft)));
    bentoValue.textContent = `${state.filled}/${state.targetGoal}`;
    judgeValue.textContent = state.lastJudge;
    comboValue.textContent = String(state.combo);
    cardValue.textContent = `${state.cards.size}/${cardTotal}`;
    scoreValue.textContent = String(Math.round(state.score));
    hintText.textContent = state.hint;
    dailyButton.textContent = state.dailyMode ? "일반 메뉴" : "오늘 메뉴";
    stickerButton.textContent = state.albumMode ? "앨범 닫기" : "스티커";
    stickerButton.classList.toggle("is-active", state.albumMode);
  }

  function chooseNextCell() {
    state.activeCell = state.menu.pattern[state.patternIndex % state.menu.pattern.length];
    state.nextCell = state.menu.pattern[(state.patternIndex + 1) % state.menu.pattern.length];
    state.secondNextCell = state.menu.pattern[(state.patternIndex + 2) % state.menu.pattern.length];
    state.cellStartedAt = performance.now();
  }

  function pointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (width / rect.width),
      y: (event.clientY - rect.top) * (height / rect.height)
    };
  }

  function cellAt(point) {
    for (let index = 0; index < 9; index += 1) {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = grid.x + col * (grid.cell + grid.gap);
      const y = grid.y + row * (grid.cell + grid.gap);
      if (point.x >= x && point.x <= x + grid.cell && point.y >= y && point.y <= y + grid.cell) {
        return index;
      }
    }
    return -1;
  }

  function currentBeatSpec() {
    const feverFactor = state.feverTime > 0 ? 0.9 : 1;
    return {
      center: (state.menu.beatCenter || 0.7) * feverFactor,
      perfect: baseBeatWindows.perfect,
      good: baseBeatWindows.good,
      burn: baseBeatWindows.burn
    };
  }

  function beatInfo(now = performance.now()) {
    const spec = currentBeatSpec();
    const elapsed = (now - state.cellStartedAt) / 1000;
    const offset = elapsed - spec.center;
    const total = spec.center + spec.burn;
    let zone = "wait";
    if (Math.abs(offset) <= spec.perfect) {
      zone = "perfect";
    } else if (Math.abs(offset) <= spec.good) {
      zone = "good";
    } else if (offset > spec.good) {
      zone = "late";
    }
    return {
      elapsed,
      offset,
      progress: clamp(elapsed / total, 0, 1),
      remaining: total - elapsed,
      zone,
      spec
    };
  }

  function timingJudge() {
    const info = beatInfo();
    const absOffset = Math.abs(info.offset);
    if (info.offset < -info.spec.good) {
      return { label: "EARLY", score: 0, time: -0.42, perfect: false, keepsCombo: false, advance: false, offset: info.offset };
    }
    if (absOffset <= info.spec.perfect) {
      return { label: "PERFECT", score: 160, time: 0.52, perfect: true, keepsCombo: true, advance: true, offset: info.offset };
    }
    if (absOffset <= info.spec.good) {
      return { label: "GOOD", score: 100, time: 0.24, perfect: false, keepsCombo: true, advance: true, offset: info.offset };
    }
    return { label: "LATE", score: 48, time: -0.32, perfect: false, keepsCombo: false, advance: true, offset: info.offset };
  }

  function tapCell(index) {
    if (!state.active || state.finished || index < 0) {
      return;
    }

    if (index === state.activeCell) {
      const judge = timingJudge();
      if (!judge.advance) {
        state.combo = 0;
        state.perfectStreak = 0;
        state.earlyHits += 1;
        state.feverTime = Math.max(0, state.feverTime - 0.7);
        state.timeLeft = Math.max(0, state.timeLeft + judge.time);
        state.lastJudge = judge.label;
        state.judgeFlash = 0.46;
        state.hint = "조금 빨랐어요. 링이 가운데 선에 가까워질 때 다시 톡 눌러주세요.";
        playTapSound(judge.label);
        addSparks(cellCenter(index).x, cellCenter(index).y, "#69c8ff", 8);
        updateHud();
        return;
      }

      const color = foodColors[(state.filled + state.combo) % foodColors.length];
      const multiplier = state.feverTime > 0 ? 1.35 : 1;
      const gained = Math.round((judge.score + state.combo * 16) * multiplier);

      state.cells[index] = { color, mark: judge.label[0] };
      state.filled += 1;
      state.combo = judge.keepsCombo ? state.combo + 1 : 0;
      state.maxCombo = Math.max(state.maxCombo, state.combo);
      state.score += gained;
      state.timeLeft = clamp(state.timeLeft + judge.time, 0, 36);
      state.lastJudge = judge.label;
      state.judgeFlash = 0.65;
      state.timingOffsetSum += Math.abs(judge.offset || 0);

      if (judge.perfect) {
        state.perfectHits += 1;
        state.perfectStreak += 1;
        state.maxPerfectStreak = Math.max(state.maxPerfectStreak, state.perfectStreak);
        if (state.perfectStreak >= 3) {
          state.feverTime = Math.max(state.feverTime, 5.5);
        }
        if (state.perfectStreak > 0 && state.perfectStreak % 4 === 0) {
          playRhythmPhrase();
        }
      } else {
        state.perfectStreak = 0;
      }

      playTapSound(judge.label);
      state.hint = judge.perfect && state.perfectStreak >= 3
        ? `반짝 피버! PERFECT x${state.perfectStreak} +${gained}`
        : `${judge.label} +${gained}. ${state.menu.name} 박자 ${Math.min(state.targetGoal, state.filled + 1)}/${state.targetGoal}`;
      addSparks(cellCenter(index).x, cellCenter(index).y, color, judge.perfect ? 22 : 14);

      if (state.filled >= state.targetGoal) {
        finishGame(true);
      } else {
        state.patternIndex += 1;
        chooseNextCell();
      }
    } else {
      state.combo = 0;
      state.perfectStreak = 0;
      state.feverTime = Math.max(0, state.feverTime - 1.2);
      state.timeLeft = Math.max(0, state.timeLeft - 1.3);
      state.lastJudge = "MISS";
      state.judgeFlash = 0.55;
      state.hint = "다른 칸이 반짝이고 있어요. 패턴의 다음 칸을 다시 잡아봅시다.";
      playTapSound("MISS");
      if (index >= 0) {
        addSparks(cellCenter(index).x, cellCenter(index).y, "#ffffff", 8);
      }
    }

    updateHud();
  }

  function cellCenter(index) {
    const col = index % 3;
    const row = Math.floor(index / 3);
    return {
      x: grid.x + col * (grid.cell + grid.gap) + grid.cell / 2,
      y: grid.y + row * (grid.cell + grid.gap) + grid.cell / 2
    };
  }

  function addSparks(x, y, color, count = 10) {
    for (let i = 0; i < count; i += 1) {
      state.sparks.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 110,
        vy: (Math.random() - 0.8) * 100,
        life: 0.65,
        maxLife: 0.65,
        color
      });
    }
  }

  function burnActiveCell() {
    if (!state.active || state.finished) {
      return;
    }

    const index = state.activeCell;
    state.combo = 0;
    state.perfectStreak = 0;
    state.burntHits += 1;
    state.timeLeft = Math.max(0, state.timeLeft - 0.85);
    state.lastJudge = "BURNT";
    state.judgeFlash = 0.58;
    state.hint = "반찬이 식어버렸어요. 다음 칸의 박자를 보고 다시 이어가세요.";
    playTapSound("MISS");
    addSparks(cellCenter(index).x, cellCenter(index).y, "#8f78ff", 12);
    state.patternIndex += 1;
    chooseNextCell();
  }

  function gradeForRun(won) {
    const perfectRatio = state.perfectHits / state.targetGoal;
    const mistakeCount = state.earlyHits + state.burntHits;
    if (won && perfectRatio >= 0.78 && state.maxCombo >= Math.floor(state.targetGoal * 0.66) && mistakeCount <= 2) {
      return "S";
    }
    if (won && perfectRatio >= 0.5 && mistakeCount <= 5) {
      return "A";
    }
    if (state.filled >= Math.floor(state.targetGoal * 0.66)) {
      return "B";
    }
    return "C";
  }

  function unlockCard(grade) {
    if (grade === "C") {
      return "";
    }
    const cardId = `${state.menu.id}-${grade}`;
    const before = state.cards.size;
    state.cards.add(cardId);
    return state.cards.size > before ? `${state.menu.name} ${grade} 카드 획득!` : "";
  }

  function resultCardCode(grade, won) {
    return [
      "LBT1",
      state.dayKey.replaceAll("-", ""),
      state.menu.id,
      state.dailyMode ? "D" : "N",
      grade,
      Math.round(state.score),
      state.perfectHits,
      state.maxCombo,
      won ? "1" : "0"
    ].join("-");
  }

  function normalizeFriendRecord(record) {
    if (!record || typeof record !== "object") {
      return null;
    }
    return {
      code: typeof record.code === "string" ? record.code : "",
      menuId: typeof record.menuId === "string" ? record.menuId : "",
      mode: record.mode === "D" ? "D" : "N",
      grade: typeof record.grade === "string" ? record.grade : "C",
      score: Math.max(0, Number(record.score || 0)),
      perfectHits: Math.max(0, Number(record.perfectHits || 0)),
      maxCombo: Math.max(0, Number(record.maxCombo || 0)),
      won: Boolean(record.won)
    };
  }

  function parseResultCard(code) {
    const parts = String(code || "").trim().split("-");
    if (parts.length < 9 || parts[0] !== "LBT1") {
      return null;
    }
    return normalizeFriendRecord({
      code: parts.join("-"),
      menuId: parts[2],
      mode: parts[3],
      grade: parts[4],
      score: Number(parts[5]),
      perfectHits: Number(parts[6]),
      maxCombo: Number(parts[7]),
      won: parts[8] === "1"
    });
  }

  function compareWithFriend() {
    if (!state.friendRecord) {
      return "";
    }
    const scoreDiff = Math.round(state.score) - state.friendRecord.score;
    const perfectDiff = state.perfectHits - state.friendRecord.perfectHits;
    const comboDiff = state.maxCombo - state.friendRecord.maxCombo;
    const scoreText = scoreDiff >= 0 ? `점수 +${scoreDiff}` : `점수 ${scoreDiff}`;
    const perfectText = perfectDiff >= 0 ? `PERFECT +${perfectDiff}` : `PERFECT ${perfectDiff}`;
    const comboText = comboDiff >= 0 ? `콤보 +${comboDiff}` : `콤보 ${comboDiff}`;
    return `${scoreText}, ${perfectText}, ${comboText}`;
  }

  function importFriendCard() {
    const code = window.prompt("친구의 LBT1 결과 카드 코드를 입력하세요.", state.friendRecord?.code || "");
    if (code === null) {
      return;
    }
    const record = parseResultCard(code);
    if (!record) {
      state.hint = "LBT1 결과 카드 코드만 비교할 수 있습니다.";
      updateHud();
      return;
    }
    state.friendRecord = record;
    state.progress.friendRecord = record;
    saveProgress();
    state.hint = `친구 기록 불러옴: ${record.grade} 등급, ${record.score}점`;
    updateHud();
  }

  function updateDailyRecord(grade) {
    if (!state.dailyMode) {
      return;
    }
    const record = state.progress.dailyRecords[state.dayKey] || {
      bestScore: 0,
      bestGrade: "C",
      plays: 0,
      menu: state.menu.id
    };
    record.bestScore = Math.max(record.bestScore, Math.round(state.score));
    if ("CBAS".indexOf(grade) > "CBAS".indexOf(record.bestGrade || "C")) {
      record.bestGrade = grade;
    }
    record.plays += 1;
    record.menu = state.menu.id;
    state.progress.dailyRecords[state.dayKey] = record;
  }

  function toggleDailyMode() {
    resetGame({ dailyMode: !state.dailyMode });
  }

  function cardParts(cardId) {
    const [menuId, grade = ""] = cardId.split("-");
    const menu = menus.find((item) => item.id === menuId) || menus[0];
    return { menu, grade };
  }

  function stickerSlotAt(point) {
    for (let index = 0; index < stickerSlots; index += 1) {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 58 + col * 52;
      const y = 324 + row * 38;
      if (point.x >= x && point.x <= x + 42 && point.y >= y && point.y <= y + 28) {
        return index;
      }
    }
    return -1;
  }

  function nextStickerCard() {
    const cards = Array.from(state.cards).sort();
    if (cards.length === 0) {
      return "";
    }
    return cards[state.progress.stickerCursor % cards.length];
  }

  function handleStickerBookTap(point) {
    const slot = stickerSlotAt(point);
    if (slot < 0) {
      return false;
    }

    if (!state.stickers[slot]) {
      const cardId = nextStickerCard();
      if (!cardId) {
        state.hint = "도시락을 B등급 이상으로 완성하면 붙일 스티커가 생깁니다.";
        updateHud();
        return true;
      }
      state.stickers[slot] = cardId;
      state.progress.stickerCursor += 1;
      const { menu, grade } = cardParts(cardId);
      state.hint = `${slot + 1}번 칸에 ${menu.name} ${grade} 스티커를 붙였어요.`;
      state.selectedStickerSlot = slot;
      saveProgress();
      updateHud();
      return true;
    }

    if (state.selectedStickerSlot === null || state.selectedStickerSlot === slot) {
      state.selectedStickerSlot = state.selectedStickerSlot === slot ? null : slot;
      state.hint = state.selectedStickerSlot === null ? "스티커 선택을 해제했습니다." : `${slot + 1}번 스티커를 선택했습니다. 옮길 칸을 누르세요.`;
      updateHud();
      return true;
    }

    const from = state.selectedStickerSlot;
    const temp = state.stickers[from];
    state.stickers[from] = state.stickers[slot];
    state.stickers[slot] = temp;
    state.selectedStickerSlot = slot;
    state.hint = `${from + 1}번과 ${slot + 1}번 스티커 위치를 바꿨습니다.`;
    saveProgress();
    updateHud();
    return true;
  }

  function toggleAlbumMode() {
    if (state.cards.size === 0) {
      state.hint = "도시락을 B등급 이상으로 완성하면 앨범에 붙일 카드가 생깁니다.";
      updateHud();
      return;
    }
    state.albumMode = !state.albumMode;
    state.selectedStickerSlot = null;
    state.hint = state.albumMode
      ? "앨범 모드: 빈 스티커 칸을 누르거나 두 칸을 차례로 눌러 위치를 바꾸세요."
      : "앨범 모드를 닫았습니다.";
    updateHud();
  }

  function showResultCard() {
    const latest = state.resultCardCode || (state.progress.resultCards || []).slice(-1)[0];
    state.hint = latest ? `결과 카드 ${latest}` : "완성 후 결과 카드 코드가 만들어집니다.";
    updateHud();
  }

  function finishGame(won) {
    if (state.finished) {
      return;
    }

    state.active = false;
    state.finished = true;
    resultOverlay.hidden = false;

    const grade = gradeForRun(won);
    const cardMessage = unlockCard(grade);
    state.progress.plays += 1;

    if (won) {
      const bonus = Math.ceil(state.timeLeft) * 22 + state.combo * 30 + state.perfectHits * 12;
      state.score += bonus;
      state.resultCardCode = resultCardCode(grade, won);
      updateDailyRecord(grade);
      const friendCopy = compareWithFriend();
      const mistakeCopy = state.earlyHits + state.burntHits > 0
        ? ` EARLY ${state.earlyHits}번, BURNT ${state.burntHits}번.`
        : " 박자가 깨끗했어요.";
      resultKicker.textContent = "Lunchbox Complete";
      resultTitle.textContent = `도시락 ${grade} 등급`;
      resultCopy.textContent =
        `남은 시간, 콤보, PERFECT 보너스 ${bonus}점을 더해 ${Math.round(state.score)}점을 기록했어요. ` +
        `${cardMessage || "이미 가진 도시락 카드입니다."}${mistakeCopy} 카드 ${state.resultCardCode}` +
        `${friendCopy ? ` · 친구 비교 ${friendCopy}` : ""}`;
    } else {
      state.resultCardCode = resultCardCode(grade, won);
      updateDailyRecord(grade);
      const friendCopy = compareWithFriend();
      resultKicker.textContent = "Kitchen Closed";
      resultTitle.textContent = "오늘 도시락 마감";
      resultCopy.textContent =
        `${state.filled}/${state.targetGoal}칸을 채웠어요. EARLY ${state.earlyHits}번, BURNT ${state.burntHits}번. 카드 ${state.resultCardCode}` +
        `${friendCopy ? ` · 친구 비교 ${friendCopy}` : ""}`;
    }

    saveProgress();
    updateHud();
  }

  function updateSparks(dt) {
    state.sparks = state.sparks.filter((spark) => {
      spark.life -= dt;
      spark.vy += 220 * dt;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      return spark.life > 0;
    });
  }

  function updateGame(dt) {
    if (state.active) {
      state.timeLeft -= dt;
      state.feverTime = Math.max(0, state.feverTime - dt);
      state.rhythmPhraseTime = Math.max(0, state.rhythmPhraseTime - dt);
      state.judgeFlash = Math.max(0, state.judgeFlash - dt);
      if (beatInfo().remaining <= 0) {
        burnActiveCell();
      }
      if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        finishGame(false);
      }
    }
    updateSparks(dt);
    updateHud();
  }

  function drawPixelRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#fff2df");
    gradient.addColorStop(0.56, "#e9ffed");
    gradient.addColorStop(1, "#dff8ff");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 0.16;
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
  }

  function drawLunchbox(time) {
    drawPixelRect(grid.x - 24, grid.y - 24, grid.cell * 3 + grid.gap * 2 + 48, grid.cell * 3 + grid.gap * 2 + 48, "#ffffff");
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 5;
    ctx.strokeRect(grid.x - 24, grid.y - 24, grid.cell * 3 + grid.gap * 2 + 48, grid.cell * 3 + grid.gap * 2 + 48);

    for (let index = 0; index < 9; index += 1) {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = grid.x + col * (grid.cell + grid.gap);
      const y = grid.y + row * (grid.cell + grid.gap);
      const active = index === state.activeCell && state.active;
      const next = index === state.nextCell && state.active && !active;
      const secondNext = index === state.secondNextCell && state.active && !active && !next;
      const pulse = active ? 1 + Math.sin(time * 9) * 0.06 : 1;
      const entry = state.cells[index];
      const color = entry ? entry.color : "#fff8e8";

      ctx.save();
      ctx.translate(x + grid.cell / 2, y + grid.cell / 2);
      ctx.scale(pulse, pulse);
      drawPixelRect(-grid.cell / 2, -grid.cell / 2, grid.cell, grid.cell, active ? state.menu.accent : color);
      drawPixelRect(-grid.cell / 2 + 10, -grid.cell / 2 + 10, grid.cell - 20, 10, "rgba(255,255,255,0.55)");
      ctx.strokeStyle = state.feverTime > 0 && active ? "#ffd85a" : "#243047";
      ctx.lineWidth = active ? 5 : 3;
      ctx.strokeRect(-grid.cell / 2, -grid.cell / 2, grid.cell, grid.cell);
      if (next) {
        ctx.strokeStyle = "#69c8ff";
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 8]);
        ctx.strokeRect(-grid.cell / 2 + 8, -grid.cell / 2 + 8, grid.cell - 16, grid.cell - 16);
        ctx.setLineDash([]);
        drawPixelRect(28, -42, 16, 16, "#69c8ff");
      }
      if (secondNext) {
        ctx.globalAlpha = 0.58;
        ctx.strokeStyle = "#8f78ff";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 8]);
        ctx.strokeRect(-grid.cell / 2 + 16, -grid.cell / 2 + 16, grid.cell - 32, grid.cell - 32);
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }

      if (active) {
        drawBeatRing(time);
      }

      if (entry) {
        ctx.fillStyle = "#243047";
        ctx.font = "900 30px ui-monospace, Consolas, monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(entry.mark, 0, 4);
      }
      ctx.restore();
    }
  }

  function drawBeatRing(time) {
    const info = beatInfo();
    const targetRadius = 32;
    const movingRadius = 64 - info.progress * 36;
    const zoneColor = info.zone === "perfect" ? "#fff8e8" : info.zone === "good" ? "#ffd85a" : info.zone === "late" ? "#e95b88" : "#69c8ff";

    ctx.save();
    ctx.strokeStyle = "rgba(36,48,71,0.72)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, targetRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = zoneColor;
    ctx.lineWidth = info.zone === "perfect" ? 8 : 5;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(18, movingRadius), 0, Math.PI * 2);
    ctx.stroke();

    if (info.zone === "perfect") {
      ctx.globalAlpha = 0.36 + Math.sin(time * 18) * 0.1;
      ctx.fillStyle = "#fff8e8";
      ctx.beginPath();
      ctx.arc(0, 0, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = "#243047";
    ctx.font = "900 15px ui-monospace, Consolas, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const beatText = info.zone === "wait" ? "..." : info.zone === "perfect" ? "TAP" : info.zone === "late" ? "!" : "tap";
    ctx.fillText(beatText, 0, 2);
    ctx.restore();
  }

  function drawMenuPanel() {
    drawPixelRect(44, 84, 128, 176, "rgba(255,255,255,0.86)");
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 3;
    ctx.strokeRect(44, 84, 128, 176);
    ctx.fillStyle = "#526078";
    ctx.font = "900 12px ui-monospace, Consolas, monospace";
    ctx.textAlign = "left";
    ctx.fillText("MENU", 58, 108);
    ctx.fillStyle = "#182033";
    ctx.font = "900 18px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText(state.menu.name, 58, 136);
    ctx.font = "900 13px ui-monospace, Consolas, monospace";
    ctx.fillText(`P ${state.perfectHits}`, 58, 166);
    ctx.fillText(`MAX ${state.maxCombo}`, 58, 190);
    ctx.fillText(`CARD ${state.cards.size}/${cardTotal}`, 58, 214);
    ctx.fillText(state.dailyMode ? "DAILY" : "NORMAL", 58, 244);
    drawBeatMeter(58, 250, 88, 8);
    if (state.feverTime > 0) {
      drawPixelRect(58, 230, 88, 12, "#ffd85a");
      drawPixelRect(58, 230, 88 * (state.feverTime / 5.5), 12, "#e95b88");
      ctx.strokeStyle = "#243047";
      ctx.lineWidth = 2;
      ctx.strokeRect(58, 230, 88, 12);
    }
  }

  function drawBeatMeter(x, y, w, h) {
    if (!state.active) {
      return;
    }
    const info = beatInfo();
    drawPixelRect(x, y, w, h, "rgba(255,255,255,0.75)");
    const fill = clamp(info.progress, 0, 1) * w;
    drawPixelRect(x, y, fill, h, info.zone === "perfect" ? "#35d7a8" : info.zone === "late" ? "#e95b88" : "#69c8ff");
    const targetX = x + (info.spec.center / (info.spec.center + info.spec.burn)) * w;
    drawPixelRect(targetX - 2, y - 3, 4, h + 6, "#243047");
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);
  }

  function drawStickerBook() {
    drawPixelRect(44, 286, 128, 172, "rgba(255,255,255,0.82)");
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 3;
    ctx.strokeRect(44, 286, 128, 172);
    ctx.fillStyle = "#526078";
    ctx.font = "900 12px ui-monospace, Consolas, monospace";
    ctx.textAlign = "left";
    ctx.fillText("STICKER", 58, 310);

    for (let index = 0; index < stickerSlots; index += 1) {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 58 + col * 52;
      const y = 324 + row * 38;
      const cardId = state.stickers[index] || "";
      const selected = state.selectedStickerSlot === index;
      drawPixelRect(x, y, 42, 28, cardId ? cardParts(cardId).menu.accent : state.albumMode ? "#fff2df" : "#fff8e8");
      ctx.strokeStyle = selected ? "#e95b88" : "#243047";
      ctx.lineWidth = selected ? 4 : 2;
      ctx.strokeRect(x, y, 42, 28);
      if (cardId) {
        const { grade } = cardParts(cardId);
        ctx.fillStyle = "#182033";
        ctx.font = "900 14px ui-monospace, Consolas, monospace";
        ctx.textAlign = "center";
        ctx.fillText(grade, x + 21, y + 19);
      }
    }
  }

  function drawJudgeFlash() {
    if (state.judgeFlash <= 0 || state.lastJudge === "READY") {
      return;
    }
    ctx.globalAlpha = Math.min(1, state.judgeFlash * 1.8);
    drawPixelRect(520, 36, 204, 48, "rgba(255,255,255,0.86)");
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 3;
    ctx.strokeRect(520, 36, 204, 48);
    ctx.fillStyle = state.lastJudge === "PERFECT" ? "#e95b88" : "#182033";
    ctx.font = "900 24px ui-monospace, Consolas, monospace";
    ctx.textAlign = "center";
    ctx.fillText(state.lastJudge, 622, 68);
    ctx.globalAlpha = 1;
  }

  function drawRhythmPhrase() {
    if (state.rhythmPhraseTime <= 0) {
      return;
    }
    ctx.globalAlpha = Math.min(1, state.rhythmPhraseTime);
    drawPixelRect(520, 92, 204, 34, "rgba(255,216,90,0.9)");
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 3;
    ctx.strokeRect(520, 92, 204, 34);
    ctx.fillStyle = "#182033";
    ctx.font = "900 14px ui-monospace, Consolas, monospace";
    ctx.textAlign = "center";
    ctx.fillText(`RHYTHM x${Math.max(1, Math.floor(state.perfectStreak / 4))}`, 622, 114);
    ctx.globalAlpha = 1;
  }

  function drawFriendCompare() {
    if (!state.friendRecord) {
      return;
    }
    drawPixelRect(612, 146, 144, 82, "rgba(255,255,255,0.84)");
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 3;
    ctx.strokeRect(612, 146, 144, 82);
    ctx.fillStyle = "#526078";
    ctx.font = "900 11px ui-monospace, Consolas, monospace";
    ctx.textAlign = "left";
    ctx.fillText("FRIEND", 626, 168);
    ctx.fillStyle = "#182033";
    ctx.font = "900 13px ui-monospace, Consolas, monospace";
    ctx.fillText(`${state.friendRecord.grade} ${state.friendRecord.score}`, 626, 190);
    ctx.fillText(`P${state.friendRecord.perfectHits} C${state.friendRecord.maxCombo}`, 626, 212);
  }

  function drawSparks() {
    for (const spark of state.sparks) {
      ctx.globalAlpha = spark.life / spark.maxLife;
      drawPixelRect(spark.x, spark.y, 5, 5, spark.color);
    }
    ctx.globalAlpha = 1;
  }

  function draw(time) {
    drawBackground();
    drawMenuPanel();
    drawStickerBook();
    drawLunchbox(time);
    drawJudgeFlash();
    drawRhythmPhrase();
    drawFriendCompare();
    drawSparks();
  }

  function loop(timestamp) {
    const dt = clamp((timestamp - state.lastTime) / 1000, 0, 0.04);
    state.lastTime = timestamp;
    updateGame(dt);
    draw(timestamp / 1000);
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

  canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const point = pointerPosition(event);
    if (state.albumMode && handleStickerBookTap(point)) {
      return;
    }
    tapCell(cellAt(point));
  });
  dailyButton.addEventListener("click", toggleDailyMode);
  stickerButton.addEventListener("click", toggleAlbumMode);
  cardButton.addEventListener("click", showResultCard);
  compareButton.addEventListener("click", importFriendCard);
  restartButton.addEventListener("click", () => resetGame({ dailyMode: state.dailyMode }));
  overlayRestartButton.addEventListener("click", () => resetGame({ dailyMode: state.dailyMode }));

  resetGame();
  requestAnimationFrame(loop);
})();
