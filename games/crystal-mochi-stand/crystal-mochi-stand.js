const canvas = document.getElementById("mochiCanvas");
const ctx = canvas.getContext("2d");
const scoreValue = document.getElementById("scoreValue");
const timeValue = document.getElementById("timeValue");
const cardValue = document.getElementById("cardValue");
const starValue = document.getElementById("starValue");
const streakValue = document.getElementById("streakValue");
const bestValue = document.getElementById("bestValue");
const hintText = document.getElementById("hintText");
const chargeBadge = document.getElementById("chargeBadge");
const buildPresetButton = document.getElementById("buildPresetButton");
const weeklyCardButton = document.getElementById("weeklyCardButton");
const weeklyCompareButton = document.getElementById("weeklyCompareButton");
const recordBookButton = document.getElementById("recordBookButton");
const restartButton = document.getElementById("restartButton");
const overlayRestartButton = document.getElementById("overlayRestartButton");
const resultOverlay = document.getElementById("resultOverlay");
const resultKicker = document.getElementById("resultKicker");
const resultTitle = document.getElementById("resultTitle");
const resultCopy = document.getElementById("resultCopy");
const recordBookOverlay = document.getElementById("recordBookOverlay");
const recordBookContent = document.getElementById("recordBookContent");
const closeRecordBookButton = document.getElementById("closeRecordBookButton");
const pinPresetButton = document.getElementById("pinPresetButton");
const resetPresetButton = document.getElementById("resetPresetButton");
const clearArchiveButton = document.getElementById("clearArchiveButton");

const storageKey = "crystalMochiStandBest";
const collectionStorageKey = "crystalMochiStandCollection:v2";
const progressStorageKey = "crystalMochiStandProgress:v1";
const cabinetLikeStorageKey = "neokim-game-cabinet-liked:v1";
const cabinetGameId = "flame-crystal-mochi-stand";
const width = 760;
const height = 520;
const roundSeconds = 60;
const roundCardLimit = 10;
const sweetMin = 68;
const sweetMax = 86;
const perfectMin = 75;
const perfectMax = 80;
const overchargeMin = 94;
const setLabels = {
  bakery: "별빵",
  sky: "하늘",
  dream: "꿈결"
};
const rarityStyles = {
  common: { label: "C", color: "#69c8ff", bonus: 30, weight: 64 },
  rare: { label: "R", color: "#35d7a8", bonus: 80, weight: 26 },
  epic: { label: "E", color: "#8f78ff", bonus: 150, weight: 8 },
  mythic: { label: "M", color: "#e95b88", bonus: 260, weight: 2 }
};
const fortuneDeck = [
  {
    id: "sugar-sun",
    name: "햇살 별사탕",
    fortune: "작은 시도가 문을 엽니다",
    rarity: "common",
    set: "bakery",
    color: "#ffd85a"
  },
  {
    id: "mint-moon",
    name: "민트 달조각",
    fortune: "천천히 눌러도 빛은 모입니다",
    rarity: "common",
    set: "sky",
    color: "#35d7a8"
  },
  {
    id: "peach-comet",
    name: "복숭아 혜성",
    fortune: "오늘의 행운색은 복숭아",
    rarity: "common",
    set: "dream",
    color: "#ff9a6c"
  },
  {
    id: "cloud-cookie",
    name: "구름 쿠키",
    fortune: "반짝임은 가까운 곳에 있습니다",
    rarity: "common",
    set: "bakery",
    color: "#ffffff"
  },
  {
    id: "berry-orbit",
    name: "베리 궤도",
    fortune: "다음 클릭은 더 정확합니다",
    rarity: "rare",
    set: "sky",
    color: "#e95b88"
  },
  {
    id: "lemon-lamp",
    name: "레몬 램프",
    fortune: "달콤한 집중력이 올라갑니다",
    rarity: "rare",
    set: "dream",
    color: "#ffd85a"
  },
  {
    id: "pudding-star",
    name: "푸딩 북극성",
    fortune: "별사탕 하나가 길을 알려줍니다",
    rarity: "rare",
    set: "bakery",
    color: "#c89157"
  },
  {
    id: "aqua-bell",
    name: "아쿠아 종",
    fortune: "좋은 리듬이 손끝에 있습니다",
    rarity: "rare",
    set: "sky",
    color: "#69c8ff"
  },
  {
    id: "violet-ribbon",
    name: "보라 리본",
    fortune: "새로운 장면이 곧 열립니다",
    rarity: "epic",
    set: "dream",
    color: "#8f78ff"
  },
  {
    id: "mellow-door",
    name: "말랑 문",
    fortune: "마음이 가벼우면 점수도 뜁니다",
    rarity: "epic",
    set: "bakery",
    color: "#35d7a8"
  },
  {
    id: "heart-spark",
    name: "하트 불꽃",
    fortune: "귀여움은 훌륭한 동력입니다",
    rarity: "epic",
    set: "dream",
    color: "#e95b88"
  },
  {
    id: "crystal-crown",
    name: "수정 왕관",
    fortune: "오늘의 상점은 대성공",
    rarity: "mythic",
    set: "sky",
    color: "#8f78ff"
  }
];
const totalCards = fortuneDeck.length;
const sparkleColors = ["#ffd85a", "#35d7a8", "#69c8ff", "#e95b88", "#8f78ff", "#ff9a6c"];
const todayCard = fortuneDeck[getTodayCardIndex()];
const decorationPanel = { x: width - 216, y: 286, w: 178, h: 214 };
const decorations = [
  { id: "smile", name: "방긋 얼굴", cost: 8, kind: "face", color: "#ff9a6c", effectLabel: "점수 +5%", effect: { scoreMultiplier: 1.05 } },
  { id: "lamp", name: "별 램프", cost: 14, kind: "bg", color: "#ffd85a", effectLabel: "카드 +8%", effect: { cardChanceBonus: 0.08 } },
  { id: "curtain", name: "꿈 커튼", cost: 24, kind: "bg", color: "#8f78ff", effectLabel: "시간 +0.4", effect: { timeBonus: 0.4 } },
  { id: "crown", name: "수정 왕관", cost: 36, kind: "hat", color: "#69c8ff", effectLabel: "별 +25%", effect: { starMultiplier: 1.25 } }
];
const buildPresets = [
  { id: "balanced", name: "균형", effectLabel: "기본", effect: {} },
  { id: "score", name: "점수", effectLabel: "점수 +4%", effect: { scoreMultiplier: 1.04 } },
  { id: "card", name: "카드", effectLabel: "카드 +5%", effect: { cardChanceBonus: 0.05 } },
  { id: "starlight", name: "별빛", effectLabel: "별 +12%", effect: { starMultiplier: 1.12 } }
];
const setBonusEffects = {
  bakery: { label: "별빵 점수 +3%", effect: { scoreMultiplier: 1.03 } },
  sky: { label: "하늘 시간 +0.2", effect: { timeBonus: 0.2 } },
  dream: { label: "꿈결 카드 +4%", effect: { cardChanceBonus: 0.04 } }
};

let state = createInitialState();
let animationFrame = 0;
let lastTimestamp = 0;
let recordBookResumeOnClose = false;

restartButton.addEventListener("click", startGame);
overlayRestartButton.addEventListener("click", startGame);
buildPresetButton.addEventListener("click", cycleBuildPreset);
weeklyCardButton.addEventListener("click", showWeeklyCard);
weeklyCompareButton.addEventListener("click", importWeeklyCardCompare);
recordBookButton.addEventListener("click", openRecordBook);
closeRecordBookButton.addEventListener("click", closeRecordBook);
pinPresetButton.addEventListener("click", togglePinnedPreset);
resetPresetButton.addEventListener("click", resetCurrentPresetRecord);
clearArchiveButton.addEventListener("click", clearArchivedFriendRecords);
recordBookContent.addEventListener("click", handleRecordBookAction);
recordBookContent.addEventListener("change", handleRecordBookChange);
recordBookOverlay.addEventListener("click", (event) => {
  if (event.target === recordBookOverlay) {
    closeRecordBook();
  }
});
window.addEventListener("hashchange", openRecordBookFromHash);
canvas.addEventListener("pointerdown", startCharge);
canvas.addEventListener("pointerup", releaseCharge);
canvas.addEventListener("pointerleave", releaseCharge);
canvas.addEventListener("pointercancel", releaseCharge);

startGame();
openRecordBookFromHash();

function createInitialState() {
  const collection = new Set(loadCollectionIds());
  const progress = loadProgress();

  return {
    active: false,
    charging: false,
    charge: 0,
    chargeDirection: 1,
    score: 0,
    timeLeft: roundSeconds,
    roundCards: [],
    collection,
    progress,
    starBits: progress.starBits,
    unlockedDecor: new Set(progress.unlockedDecorIds),
    equippedDecor: progress.equippedDecor,
    dailySpecialsUsed: progress.daily.used,
    weeklyPerfects: progress.weekly.perfects,
    weeklyClaimed: progress.weekly.claimed,
    weeklyCardCode: progress.weekly.cardCode,
    buildPreset: progress.buildPreset,
    pinnedBuildPreset: progress.pinnedBuildPreset,
    presetRecords: normalizePresetRecords(progress.presetRecords),
    cardStats: normalizeCardStats(progress.cardStats, collection),
    friendWeekly: normalizeFriendWeekly(progress.friendWeekly),
    friendWeeklyRecords: normalizeFriendWeeklyRecords(progress.friendWeeklyRecords, progress.friendWeekly),
    friendWeekFilter: progress.friendWeekFilter,
    friendArchiveFilter: progress.friendArchiveFilter,
    visitDays: progress.visitDays,
    candidateMetrics: normalizeCandidateMetrics(progress.candidateMetrics),
    sparkles: [],
    floaters: [],
    best: Number(localStorage.getItem(storageKey) || 0),
    lastResult: "ready",
    lastCard: null,
    combo: 0,
    perfectStreak: 0,
    bestPerfectStreak: progress.bestPerfectStreak,
    perfects: 0,
    newCards: 0,
    duplicates: 0,
    todayHits: 0,
    setBonuses: [],
    weeklyBonusClaimedThisRun: false,
    mochiPulse: 0
  };
}

function startGame() {
  state = createInitialState();
  state.active = true;
  resultOverlay.hidden = true;
  recordBookOverlay.hidden = true;
  recordBookResumeOnClose = false;
  hintText.textContent = `오늘의 카드: ${todayCard.name} · 특별 점괘 ${Math.max(0, 3 - state.dailySpecialsUsed)}/3`;
  saveProgress();
  lastTimestamp = performance.now();
  cancelAnimationFrame(animationFrame);
  animationFrame = requestAnimationFrame(tick);
}

function tick(timestamp) {
  const delta = Math.min(0.05, (timestamp - lastTimestamp) / 1000);
  lastTimestamp = timestamp;

  if (state.active) {
    state.timeLeft = Math.max(0, state.timeLeft - delta);
    updateCharge(delta);
    updateSparkles(delta);
    updateFloaters(delta);
    state.mochiPulse += delta * (state.charging ? 9 : 4);

    if (state.timeLeft <= 0 || state.roundCards.length >= roundCardLimit) {
      finishGame();
    }
  }

  updateHud();
  draw(timestamp);
  animationFrame = requestAnimationFrame(tick);
}

function startCharge(event) {
  if (!state.active || state.charging) {
    return;
  }

  event.preventDefault();
  if (handleDecorationPointer(getCanvasPoint(event))) {
    return;
  }

  state.charging = true;
  state.chargeDirection = 1;
  state.lastResult = "charging";
  hintText.textContent = "반짝 고리가 가장 선명할 때 놓아주세요.";
}

function releaseCharge() {
  if (!state.active || !state.charging) {
    return;
  }

  state.charging = false;
  const passive = getEquippedPassive();
  const judgement = getReleaseJudgement(state.charge);
  const baseScore = 70 + judgement.accuracy * 245 + state.combo * 16;
  let gained = Math.round(baseScore * judgement.scoreMultiplier);
  let starBitsGained = getStarBitsForJudgement(judgement);
  let weeklyBonus = null;
  let cardResult = null;

  if (judgement.key === "perfect") {
    state.combo += 1;
    state.perfectStreak += 1;
    state.perfects += 1;
    state.bestPerfectStreak = Math.max(state.bestPerfectStreak, state.perfectStreak);
    weeklyBonus = advanceWeeklyChallenge();
  } else if (judgement.key === "sweet") {
    state.combo = Math.max(1, Math.floor(state.combo * 0.7));
    state.perfectStreak = 0;
  } else {
    state.combo = 0;
    state.perfectStreak = 0;
  }

  if (judgement.key === "over") {
    state.timeLeft = Math.max(0, state.timeLeft - 1.2);
  } else {
    state.timeLeft = Math.min(roundSeconds + 8, state.timeLeft + judgement.timeBonus + passive.timeBonus);
  }

  if (Math.random() <= getAdjustedCardChance(judgement, passive) && state.roundCards.length < roundCardLimit) {
    cardResult = addFortuneCard(judgement);
    if (cardResult) {
      gained += cardResult.scoreBonus;
      starBitsGained += cardResult.card.isNew ? 3 : 1;
      if (cardResult.card.isToday) {
        starBitsGained += 4;
      }
    }
  }

  if (cardResult && consumeDailySpecial()) {
    cardResult.dailySpecial = true;
    gained += 120;
    starBitsGained += 8;
  }

  if (weeklyBonus) {
    gained += weeklyBonus.score;
    starBitsGained += weeklyBonus.bits;
  }

  gained = Math.round(gained * passive.scoreMultiplier);
  starBitsGained = Math.ceil(starBitsGained * passive.starMultiplier);
  state.starBits += starBitsGained;
  state.score += gained;
  if (weeklyBonus && !state.weeklyCardCode) {
    state.weeklyCardCode = buildWeeklyCardCode();
    weeklyBonus.cardCode = state.weeklyCardCode;
  }
  state.lastResult = judgement.key;
  spawnSparkles(judgement.sparkles + Math.round(judgement.accuracy * 8) + state.combo * 2, judgement.accuracy, judgement.color);
  spawnFloatText(`+${gained}`, judgement.color);
  hintText.textContent = buildReleaseMessage(judgement, gained, cardResult, starBitsGained, weeklyBonus, passive);
  state.charge = Math.max(8, state.charge * 0.25);
  saveProgress();
}

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (width / rect.width),
    y: (event.clientY - rect.top) * (height / rect.height)
  };
}

function handleDecorationPointer(point) {
  if (
    point.x < decorationPanel.x ||
    point.x > decorationPanel.x + decorationPanel.w ||
    point.y < decorationPanel.y ||
    point.y > decorationPanel.y + decorationPanel.h
  ) {
    return false;
  }

  const rowStart = decorationPanel.y + 74;
  const rowHeight = 30;
  const index = Math.floor((point.y - rowStart) / rowHeight);
  const decoration = decorations[index];

  if (!decoration) {
    return true;
  }

  if (state.unlockedDecor.has(decoration.id)) {
    state.equippedDecor = decoration.id;
    hintText.textContent = `${decoration.name} 장착`;
    saveProgress();
    updateHud();
    return true;
  }

  if (state.starBits >= decoration.cost) {
    state.starBits -= decoration.cost;
    state.unlockedDecor.add(decoration.id);
    state.equippedDecor = decoration.id;
    hintText.textContent = `${decoration.name} 해금`;
    spawnSparkles(18, 1, decoration.color);
    saveProgress();
    updateHud();
    return true;
  }

  hintText.textContent = `${decoration.name}은 별조각 ${decoration.cost}개가 필요합니다.`;
  updateHud();
  return true;
}

function updateCharge(delta) {
  if (!state.charging) {
    state.charge = Math.max(0, state.charge - delta * 30);
    return;
  }

  state.charge += state.chargeDirection * delta * 118;

  if (state.charge >= 100) {
    state.charge = 100;
    state.chargeDirection = -1;
  }

  if (state.charge <= 0) {
    state.charge = 0;
    state.chargeDirection = 1;
  }
}

function getReleaseJudgement(charge) {
  const accuracy = getAccuracy(charge);

  if (charge >= overchargeMin) {
    return {
      key: "over",
      label: "OVER",
      accuracy,
      scoreMultiplier: 0.48,
      timeBonus: -1.2,
      cardChance: 0.16,
      sparkles: 9,
      color: "#e95b88"
    };
  }

  if (charge >= perfectMin && charge <= perfectMax) {
    return {
      key: "perfect",
      label: "PERFECT",
      accuracy: 1,
      scoreMultiplier: 1.75,
      timeBonus: 2.2,
      cardChance: 1,
      sparkles: 26,
      color: "#ffd85a"
    };
  }

  if (charge >= sweetMin && charge <= sweetMax) {
    return {
      key: "sweet",
      label: "SWEET",
      accuracy: 0.92,
      scoreMultiplier: 1.25,
      timeBonus: 1.35,
      cardChance: 0.9,
      sparkles: 18,
      color: "#35d7a8"
    };
  }

  if (accuracy > 0.74) {
    return {
      key: "near",
      label: "NEAR",
      accuracy,
      scoreMultiplier: 0.86,
      timeBonus: 0.45,
      cardChance: 0.48,
      sparkles: 12,
      color: "#69c8ff"
    };
  }

  return {
    key: "soft",
    label: "SOFT",
    accuracy,
    scoreMultiplier: 0.56,
    timeBonus: 0.15,
    cardChance: 0,
    sparkles: 7,
    color: "#8f78ff"
  };
}

function getAccuracy(charge) {
  if (charge >= sweetMin && charge <= sweetMax) {
    return 1;
  }

  const target = charge < sweetMin ? sweetMin : sweetMax;
  const distance = Math.abs(charge - target);
  return Math.max(0, 1 - distance / 54);
}

function getStarBitsForJudgement(judgement) {
  if (judgement.key === "perfect") {
    return 5;
  }

  if (judgement.key === "sweet") {
    return 3;
  }

  if (judgement.key === "near" || judgement.key === "soft") {
    return 1;
  }

  return 0;
}

function getEquippedDecoration() {
  return decorations.find((decoration) => decoration.id === state.equippedDecor && state.unlockedDecor.has(decoration.id)) || null;
}

function getBuildPreset() {
  return buildPresets.find((preset) => preset.id === state.buildPreset) || buildPresets[0];
}

function completedSetIds(collection = state.collection) {
  return Object.keys(setLabels).filter((setId) =>
    fortuneDeck.filter((card) => card.set === setId).every((card) => collection.has(card.id))
  );
}

function combinePassive(base, effect = {}) {
  return {
    scoreMultiplier: base.scoreMultiplier * Number(effect.scoreMultiplier || 1),
    cardChanceBonus: base.cardChanceBonus + Number(effect.cardChanceBonus || 0),
    timeBonus: base.timeBonus + Number(effect.timeBonus || 0),
    starMultiplier: base.starMultiplier * Number(effect.starMultiplier || 1)
  };
}

function getSetBonusPassive() {
  const setIds = completedSetIds();
  let passive = {
    scoreMultiplier: 1,
    cardChanceBonus: 0,
    timeBonus: 0,
    starMultiplier: 1
  };
  for (const setId of setIds) {
    passive = combinePassive(passive, setBonusEffects[setId]?.effect);
  }
  return {
    ...passive,
    labels: setIds.map((setId) => setBonusEffects[setId]?.label).filter(Boolean)
  };
}

function getEquippedPassive() {
  const decoration = getEquippedDecoration();
  const effect = decoration?.effect || {};
  const preset = getBuildPreset();
  const setBonus = getSetBonusPassive();
  const combined = combinePassive(combinePassive(setBonus, effect), preset.effect);
  return {
    decoration,
    preset,
    setBonus,
    label: [preset.effectLabel, decoration?.effectLabel, ...setBonus.labels].filter(Boolean).join(" / "),
    scoreMultiplier: combined.scoreMultiplier,
    cardChanceBonus: combined.cardChanceBonus,
    timeBonus: combined.timeBonus,
    starMultiplier: combined.starMultiplier
  };
}

function getAdjustedCardChance(judgement, passive) {
  return Math.max(0, Math.min(1, judgement.cardChance + passive.cardChanceBonus));
}

function consumeDailySpecial() {
  if (state.dailySpecialsUsed >= 3) {
    return false;
  }

  state.dailySpecialsUsed += 1;
  return true;
}

function advanceWeeklyChallenge() {
  if (state.weeklyClaimed) {
    return null;
  }

  state.weeklyPerfects += 1;
  if (state.weeklyPerfects >= 7) {
    state.weeklyClaimed = true;
    state.weeklyBonusClaimedThisRun = true;
    return { bits: 25, score: 180 };
  }

  return null;
}

function buildWeeklyCardCode() {
  return [
    "CMSW1",
    currentWeekKey(),
    Math.min(7, state.weeklyPerfects),
    state.bestPerfectStreak,
    state.collection.size,
    state.starBits,
    Math.round(state.score),
    state.equippedDecor || "none",
    state.buildPreset || "balanced"
  ].join("-");
}

function showWeeklyCard() {
  const code = state.weeklyCardCode || state.progress.weekly.cardCode || "";
  if (code) {
    hintText.textContent = `주간 별자리 카드 ${code}`;
  } else {
    hintText.textContent = `주간 퍼펙트 ${Math.min(7, state.weeklyPerfects)}/7을 채우면 공유 카드가 만들어집니다.`;
  }
}

function cycleBuildPreset() {
  const currentIndex = buildPresets.findIndex((preset) => preset.id === state.buildPreset);
  const nextPreset = buildPresets[(currentIndex + 1 + buildPresets.length) % buildPresets.length];
  state.buildPreset = nextPreset.id;
  hintText.textContent = `${nextPreset.name} 프리셋 장착: ${nextPreset.effectLabel}`;
  saveProgress();
  updateHud();
}

function openRecordBook() {
  recordBookResumeOnClose = state.active;
  state.active = false;
  recordBookOverlay.hidden = false;
  renderRecordBook();
  closeRecordBookButton.focus();
}

function openRecordBookFromHash() {
  if (location.hash === "#records") {
    openRecordBook();
  }
}

function closeRecordBook() {
  recordBookOverlay.hidden = true;

  if (recordBookResumeOnClose && state.timeLeft > 0 && !resultOverlay.hidden) {
    recordBookResumeOnClose = false;
    return;
  }

  if (recordBookResumeOnClose && state.timeLeft > 0) {
    state.active = true;
    lastTimestamp = performance.now();
  }

  recordBookResumeOnClose = false;
}

function togglePinnedPreset() {
  const presetId = getBuildPreset().id;
  state.pinnedBuildPreset = state.pinnedBuildPreset === presetId ? "" : presetId;
  saveProgress();
  renderRecordBook();
  updateHud();
  hintText.textContent = state.pinnedBuildPreset
    ? `${getBuildPreset().name} 프리셋을 기본값으로 고정했습니다.`
    : "프리셋 고정을 해제했습니다.";
}

function resetCurrentPresetRecord() {
  const preset = getBuildPreset();

  if (!window.confirm(`${preset.name} 프리셋 기록을 리셋할까요?`)) {
    return;
  }

  state.presetRecords[preset.id] = emptyPresetRecord();
  saveProgress();
  renderRecordBook();
  updateHud();
  hintText.textContent = `${preset.name} 프리셋 기록을 리셋했습니다.`;
}

function clearArchivedFriendRecords() {
  const archivedCount = normalizeFriendWeeklyRecords(state.friendWeeklyRecords, state.friendWeekly)
    .filter((record) => record.archived).length;

  if (!archivedCount || !window.confirm(`보관된 친구 기록 ${archivedCount}개를 지울까요?`)) {
    return;
  }

  state.friendWeeklyRecords = normalizeFriendWeeklyRecords(state.friendWeeklyRecords, state.friendWeekly)
    .filter((record) => !record.archived);
  state.friendWeekly = pickBestFriendWeeklyRecord(state.friendWeeklyRecords);
  state.friendArchiveFilter = "active";
  state.friendWeekFilter = "all";
  saveProgress();
  renderRecordBook();
  hintText.textContent = "보관함을 비웠습니다.";
}

function handleRecordBookAction(event) {
  const nicknameButton = event.target.closest("[data-friend-nickname]");
  const archiveButton = event.target.closest("[data-friend-archive]");
  const moveButton = event.target.closest("[data-friend-move]");

  if (archiveButton) {
    toggleFriendArchive(archiveButton.dataset.friendArchive);
    return;
  }

  if (moveButton) {
    moveFriendRecord(moveButton.dataset.friendKey, Number(moveButton.dataset.friendMove || 0));
    return;
  }

  if (!nicknameButton) {
    return;
  }

  const key = nicknameButton.dataset.friendNickname;
  const record = state.friendWeeklyRecords.find((item) => friendRecordKey(item) === key);

  if (!record) {
    return;
  }

  const nickname = window.prompt("친구 이름 메모", record.nickname || "");

  if (nickname === null) {
    return;
  }

  record.nickname = sanitizeNickname(nickname);
  state.friendWeekly = pickBestFriendWeeklyRecord(state.friendWeeklyRecords);
  saveProgress();
  renderRecordBook();
}

function handleRecordBookChange(event) {
  if (event.target.id === "friendWeekFilter") {
    state.friendWeekFilter = sanitizeFriendWeekFilter(event.target.value);
    saveProgress();
    renderRecordBook();
    return;
  }

  if (event.target.id === "friendArchiveFilter") {
    state.friendArchiveFilter = sanitizeFriendArchiveFilter(event.target.value);
    saveProgress();
    renderRecordBook();
  }
}

function toggleFriendArchive(key) {
  const record = state.friendWeeklyRecords.find((item) => friendRecordKey(item) === key);

  if (!record) {
    return;
  }

  record.archived = !record.archived;
  state.friendWeekly = pickBestFriendWeeklyRecord(state.friendWeeklyRecords);
  saveProgress();
  renderRecordBook();
}

function moveFriendRecord(key, direction) {
  const records = normalizeFriendWeeklyRecords(state.friendWeeklyRecords, state.friendWeekly);
  const visibleRecords = filterFriendRecordsByArchive(records, sanitizeFriendArchiveFilter(state.friendArchiveFilter));
  const index = visibleRecords.findIndex((record) => friendRecordKey(record) === key);
  const nextIndex = index + direction;

  if (index < 0 || nextIndex < 0 || nextIndex >= visibleRecords.length) {
    return;
  }

  const current = records.find((record) => friendRecordKey(record) === friendRecordKey(visibleRecords[index]));
  const next = records.find((record) => friendRecordKey(record) === friendRecordKey(visibleRecords[nextIndex]));

  if (!current || !next) {
    return;
  }

  const temp = current.order;
  current.order = next.order;
  next.order = temp;
  state.friendWeeklyRecords = records;
  saveProgress();
  renderRecordBook();
}

function renderRecordBook() {
  const currentPreset = getBuildPreset();
  const collection = state.collection;
  const friendRecords = normalizeFriendWeeklyRecords(state.friendWeeklyRecords, state.friendWeekly);
  const archiveFilter = sanitizeFriendArchiveFilter(state.friendArchiveFilter);
  const recordsForArchive = filterFriendRecordsByArchive(friendRecords, archiveFilter);
  const weeks = ["all", ...new Set(recordsForArchive.map((record) => record.week).filter(Boolean))];
  const activeWeek = weeks.includes(state.friendWeekFilter) ? state.friendWeekFilter : "all";
  const filteredFriendRecords = activeWeek === "all"
    ? recordsForArchive
    : recordsForArchive.filter((record) => record.week === activeWeek);

  state.friendWeekFilter = activeWeek;
  state.friendArchiveFilter = archiveFilter;
  pinPresetButton.textContent = state.pinnedBuildPreset === currentPreset.id ? "고정 해제" : "현재 프리셋 고정";
  resetPresetButton.textContent = `${currentPreset.name} 기록 리셋`;
  clearArchiveButton.textContent = `보관함 비우기 ${friendRecords.filter((record) => record.archived).length}`;
  clearArchiveButton.disabled = !friendRecords.some((record) => record.archived);

  recordBookContent.innerHTML = `
    <section class="record-section" aria-label="카드북">
      <h3>카드북 ${collection.size}/${totalCards}</h3>
      <div class="record-card-grid">
        ${fortuneDeck.map((card) => renderRecordCard(card, collection.has(card.id))).join("")}
      </div>
    </section>
    <section class="record-section" aria-label="세트 미션">
      <h3>세트 미션</h3>
      <div class="mission-list">
        ${Object.keys(setLabels).map(renderSetMission).join("")}
      </div>
    </section>
    <section class="record-section" aria-label="프리셋 기록">
      <h3>프리셋 기록</h3>
      <div class="preset-record-list">
        ${buildPresets.map((preset) => renderPresetRecord(preset, currentPreset.id)).join("")}
      </div>
    </section>
    <section class="record-section" aria-label="친구 기록">
      <div class="friend-toolbar">
        <h3>친구 기록 ${friendRecords.length}</h3>
        <label>
          Week
          <select id="friendWeekFilter">
            ${weeks.map((week) => `<option value="${escapeHtml(week)}"${week === activeWeek ? " selected" : ""}>${week === "all" ? "전체" : escapeHtml(week)}</option>`).join("")}
          </select>
        </label>
        <label>
          Box
          <select id="friendArchiveFilter">
            ${["active", "archive", "all"].map((filter) => `<option value="${filter}"${filter === archiveFilter ? " selected" : ""}>${getFriendArchiveLabel(filter)}</option>`).join("")}
          </select>
        </label>
      </div>
      <div class="friend-record-list">
        ${filteredFriendRecords.length
          ? filteredFriendRecords.map(renderFriendRecord).join("")
          : `<p class="empty-record">저장된 친구 기록이 없습니다.</p>`}
      </div>
    </section>
  `;
}

function renderRecordCard(card, owned) {
  const stat = normalizeCardStat(state.cardStats[card.id]);

  return `
    <div class="record-card${owned ? " is-owned" : ""}" style="--card-color: ${escapeHtml(card.color)}">
      <strong>${owned ? escapeHtml(card.name) : "???"}</strong>
      <span>${rarityStyles[card.rarity].label} / ${escapeHtml(setLabels[card.set])}</span>
      ${owned ? `<span>GET ${escapeHtml(stat.firstAcquiredDay || "OLD")}</span><span>TODAY ${stat.todayHits}</span>` : ""}
    </div>
  `;
}

function renderSetMission(setId) {
  const cards = fortuneDeck.filter((card) => card.set === setId);
  const ownedCards = cards.filter((card) => state.collection.has(card.id));
  const missingCards = cards.filter((card) => !state.collection.has(card.id));
  const completed = missingCards.length === 0;
  const hintCard = pickSetHintCard(missingCards);
  const todayHits = cards.reduce((sum, card) => sum + normalizeCardStat(state.cardStats[card.id]).todayHits, 0);

  return `
    <div class="mission-card${completed ? " is-complete" : ""}">
      <div>
        <strong>${escapeHtml(setLabels[setId])} ${ownedCards.length}/${cards.length}</strong>
        <span>${completed ? "BONUS ON" : `HINT ${rarityStyles[hintCard?.rarity || "common"].label} / PERFECT`}</span>
        <span>TODAY ${todayHits}</span>
      </div>
      <span>${escapeHtml(setBonusEffects[setId]?.label || "SET")}</span>
    </div>
  `;
}

function pickSetHintCard(cards) {
  const rank = { mythic: 4, epic: 3, rare: 2, common: 1 };
  return [...cards].sort((a, b) => rank[b.rarity] - rank[a.rarity])[0] || null;
}

function renderPresetRecord(preset, currentPresetId) {
  const record = normalizePresetRecord(state.presetRecords[preset.id]);
  const isCurrent = currentPresetId === preset.id;
  const isPinned = state.pinnedBuildPreset === preset.id;

  return `
    <div class="preset-record${isCurrent ? " is-current" : ""}${isPinned ? " is-pinned" : ""}">
      <div>
        <strong>${escapeHtml(preset.name)}${isPinned ? " / 고정" : ""}</strong>
        <span>BEST ${record.bestScore} / C ${record.bestCards} / N ${record.bestNewCards} / P ${record.plays}</span>
      </div>
      <span>${escapeHtml(preset.effectLabel)}</span>
    </div>
  `;
}

function renderFriendRecord(record) {
  const key = friendRecordKey(record);
  const name = record.nickname || "친구";

  return `
    <div class="friend-record${record.archived ? " is-archived" : ""}">
      <div>
        <strong>${escapeHtml(name)} / ${escapeHtml(record.week || "week")}${record.archived ? " / 보관" : ""}</strong>
        <span>P ${record.perfects}/7 / BOOK ${record.collectionSize}/${totalCards} / SCORE ${record.score} / ${escapeHtml(record.preset)}</span>
      </div>
      <div class="friend-actions">
        <button class="mini-button" type="button" data-friend-move="-1" data-friend-key="${escapeHtml(key)}">위</button>
        <button class="mini-button" type="button" data-friend-move="1" data-friend-key="${escapeHtml(key)}">아래</button>
        <button class="mini-button" type="button" data-friend-archive="${escapeHtml(key)}">${record.archived ? "복귀" : "보관"}</button>
        <button class="mini-button" type="button" data-friend-nickname="${escapeHtml(key)}">이름</button>
      </div>
    </div>
  `;
}

function isValidBuildPresetId(id) {
  return buildPresets.some((preset) => preset.id === id);
}

function filterFriendRecordsByArchive(records, filter) {
  if (filter === "archive") {
    return records.filter((record) => record.archived);
  }

  if (filter === "all") {
    return records;
  }

  return records.filter((record) => !record.archived);
}

function getFriendArchiveLabel(filter) {
  return {
    active: "활성",
    archive: "보관함",
    all: "전체"
  }[filter] || "활성";
}

function normalizeFriendWeekly(record) {
  if (!record || typeof record !== "object") {
    return null;
  }
  return {
    code: typeof record.code === "string" ? record.code : "",
    week: typeof record.week === "string" ? record.week : "",
    perfects: Math.max(0, Number(record.perfects || 0)),
    bestPerfectStreak: Math.max(0, Number(record.bestPerfectStreak || 0)),
    collectionSize: Math.max(0, Number(record.collectionSize || 0)),
    starBits: Math.max(0, Number(record.starBits || 0)),
    score: Math.max(0, Number(record.score || 0)),
    decor: typeof record.decor === "string" ? record.decor : "none",
    preset: isValidBuildPresetId(record.preset) ? record.preset : "balanced",
    nickname: sanitizeNickname(record.nickname),
    archived: Boolean(record.archived),
    order: Math.max(0, Number(record.order || 0))
  };
}

function emptyPresetRecord() {
  return {
    bestScore: 0,
    bestCards: 0,
    bestNewCards: 0,
    plays: 0
  };
}

function normalizePresetRecord(record) {
  if (!record || typeof record !== "object") {
    return emptyPresetRecord();
  }

  return {
    bestScore: Math.max(0, Number(record.bestScore || 0)),
    bestCards: Math.max(0, Number(record.bestCards || 0)),
    bestNewCards: Math.max(0, Number(record.bestNewCards || 0)),
    plays: Math.max(0, Number(record.plays || 0))
  };
}

function normalizePresetRecords(records) {
  const source = records && typeof records === "object" ? records : {};

  return buildPresets.reduce((next, preset) => {
    next[preset.id] = normalizePresetRecord(source[preset.id]);
    return next;
  }, {});
}

function currentPresetRecord() {
  return normalizePresetRecord(state.presetRecords?.[getBuildPreset().id]);
}

function updatePresetRecord() {
  const presetId = getBuildPreset().id;
  const record = currentPresetRecord();
  record.bestScore = Math.max(record.bestScore, Math.round(state.score));
  record.bestCards = Math.max(record.bestCards, state.roundCards.length);
  record.bestNewCards = Math.max(record.bestNewCards, state.newCards);
  record.plays += 1;
  state.presetRecords[presetId] = record;
}

function emptyCardStat() {
  return {
    firstAcquiredDay: "",
    lastAcquiredDay: "",
    pulls: 0,
    todayHits: 0
  };
}

function normalizeCardStat(record) {
  if (!record || typeof record !== "object") {
    return emptyCardStat();
  }

  return {
    firstAcquiredDay: typeof record.firstAcquiredDay === "string" ? record.firstAcquiredDay : "",
    lastAcquiredDay: typeof record.lastAcquiredDay === "string" ? record.lastAcquiredDay : "",
    pulls: Math.max(0, Number(record.pulls || 0)),
    todayHits: Math.max(0, Number(record.todayHits || 0))
  };
}

function normalizeCardStats(records, collection = new Set()) {
  const source = records && typeof records === "object" ? records : {};

  return fortuneDeck.reduce((next, card) => {
    const stat = normalizeCardStat(source[card.id]);

    if (collection.has(card.id) && !stat.firstAcquiredDay) {
      stat.firstAcquiredDay = "OLD";
      stat.lastAcquiredDay = "OLD";
      stat.pulls = Math.max(1, stat.pulls);
    }

    next[card.id] = stat;
    return next;
  }, {});
}

function updateCardStats(card, isToday) {
  const day = localDayKey();
  const stat = normalizeCardStat(state.cardStats[card.id]);

  if (!stat.firstAcquiredDay || stat.firstAcquiredDay === "OLD") {
    stat.firstAcquiredDay = stat.firstAcquiredDay || day;
  }

  stat.lastAcquiredDay = day;
  stat.pulls += 1;

  if (isToday) {
    stat.todayHits += 1;
  }

  state.cardStats[card.id] = stat;
}

function normalizeFriendWeeklyRecords(records, fallback = null) {
  const source = Array.isArray(records) ? records : [];
  const normalized = source.map(normalizeFriendWeekly).filter(Boolean);
  const fallbackRecord = normalizeFriendWeekly(fallback);
  const currentWeek = currentWeekKey();

  if (fallbackRecord) {
    normalized.push(fallbackRecord);
  }

  const unique = [];
  const keyed = new Map();

  for (const record of normalized) {
    const key = friendRecordKey(record);

    if (keyed.has(key)) {
      const existing = keyed.get(key);
      existing.nickname = record.nickname || existing.nickname;
      existing.archived = record.archived || existing.archived;
      existing.order = Math.max(existing.order, record.order);
      continue;
    }

    keyed.set(key, record);
    unique.push(record);
  }

  return unique
    .map((record, index) => ({
      ...record,
      archived: record.archived || Boolean(record.week && record.week !== currentWeek),
      order: record.order || index + 1
    }))
    .sort((a, b) => a.archived - b.archived || a.order - b.order)
    .slice(0, 12);
}

function pickBestFriendWeeklyRecord(records) {
  return [...normalizeFriendWeeklyRecords(records).filter((record) => !record.archived)]
    .sort((a, b) =>
      b.score - a.score ||
      b.collectionSize - a.collectionSize ||
      b.perfects - a.perfects ||
      b.bestPerfectStreak - a.bestPerfectStreak
    )[0] || null;
}

function bestFriendWeeklyRecord() {
  return pickBestFriendWeeklyRecord(normalizeFriendWeeklyRecords(state.friendWeeklyRecords, state.friendWeekly));
}

function friendRecordKey(record) {
  return record?.code || `${record?.week || "week"}-${record?.perfects || 0}-${record?.collectionSize || 0}-${record?.score || 0}-${record?.preset || "balanced"}`;
}

function sanitizeNickname(value) {
  return String(value || "").trim().slice(0, 14);
}

function sanitizeFriendWeekFilter(value) {
  const text = String(value || "all").trim();
  return text || "all";
}

function sanitizeFriendArchiveFilter(value) {
  return ["active", "archive", "all"].includes(value) ? value : "active";
}

function normalizeVisitDays(days, today = localDayKey()) {
  const source = Array.isArray(days) ? days : [];
  const unique = [];

  for (const day of [...source, today]) {
    const text = String(day || "").trim();

    if (text && !unique.includes(text)) {
      unique.push(text);
    }
  }

  return unique.slice(-30);
}

function normalizeCandidateMetrics(metrics) {
  if (!metrics || typeof metrics !== "object") {
    return {
      score: 0,
      tier: "quiet",
      likedByUser: false,
      likeThresholdMet: false,
      completionPercent: 0,
      returnDays: 0,
      friendAdvantage: 0
    };
  }

  return {
    score: Math.max(0, Math.min(100, Number(metrics.score || 0))),
    tier: typeof metrics.tier === "string" ? metrics.tier : "quiet",
    likedByUser: Boolean(metrics.likedByUser),
    likeThresholdMet: Boolean(metrics.likeThresholdMet),
    completionPercent: Math.max(0, Math.min(100, Number(metrics.completionPercent || 0))),
    returnDays: Math.max(0, Number(metrics.returnDays || 0)),
    friendAdvantage: Math.max(0, Math.min(2, Number(metrics.friendAdvantage || 0)))
  };
}

function getCabinetLikedGameIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(cabinetLikeStorageKey) || "[]");
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch (error) {
    return new Set();
  }
}

function buildCandidateMetrics(friendWeeklyRecords) {
  const likedByUser = getCabinetLikedGameIds().has(cabinetGameId);
  const completion = state.collection.size / totalCards;
  const activeFriends = normalizeFriendWeeklyRecords(friendWeeklyRecords, state.friendWeekly).filter((record) => !record.archived);
  const bestFriendScore = activeFriends.reduce((best, record) => Math.max(best, record.score), 0);
  const bestFriendBook = activeFriends.reduce((best, record) => Math.max(best, record.collectionSize), 0);
  const friendAdvantage = activeFriends.length
    ? Number(state.best >= bestFriendScore) + Number(state.collection.size >= bestFriendBook)
    : 0;
  const returnDays = normalizeVisitDays(state.visitDays).length;
  const score = Math.min(
    100,
    (likedByUser ? 25 : 0) +
    Math.round(completion * 35) +
    Math.min(20, returnDays * 4) +
    friendAdvantage * 10
  );

  return {
    score,
    tier: score >= 75 ? "hot" : score >= 45 ? "warm" : score >= 20 ? "spark" : "quiet",
    likedByUser,
    likeThresholdMet: likedByUser,
    completionPercent: Math.round(completion * 100),
    returnDays,
    friendAdvantage
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function parseWeeklyCardCode(code) {
  const parts = String(code || "").trim().split("-");
  if (parts.length < 8 || parts[0] !== "CMSW1") {
    return null;
  }
  const hasSplitWeek = /^W\d+$/i.test(parts[2] || "");
  const offset = hasSplitWeek ? 1 : 0;
  const week = hasSplitWeek ? `${parts[1]}-${parts[2]}` : parts[1];
  return normalizeFriendWeekly({
    code: parts.join("-"),
    week,
    perfects: Number(parts[2 + offset]),
    bestPerfectStreak: Number(parts[3 + offset]),
    collectionSize: Number(parts[4 + offset]),
    starBits: Number(parts[5 + offset]),
    score: Number(parts[6 + offset]),
    decor: parts[7 + offset],
    preset: parts[8 + offset] || "balanced"
  });
}

function importWeeklyCardCompare() {
  const code = window.prompt("친구의 CMSW1 주간 카드 코드를 입력하세요.", state.friendWeekly?.code || "");
  if (code === null) {
    return;
  }
  const record = parseWeeklyCardCode(code);
  if (!record) {
    hintText.textContent = "CMSW1 주간 카드 코드만 비교할 수 있습니다.";
    return;
  }
  const nickname = window.prompt("친구 이름 메모", record.nickname || "");
  if (nickname !== null) {
    record.nickname = sanitizeNickname(nickname);
  }
  state.friendWeeklyRecords = normalizeFriendWeeklyRecords([...(state.friendWeeklyRecords || []), record]);
  state.friendWeekly = pickBestFriendWeeklyRecord(state.friendWeeklyRecords) || record;
  state.progress.friendWeekly = state.friendWeekly;
  state.progress.friendWeeklyRecords = state.friendWeeklyRecords;
  saveProgress();
  hintText.textContent = `FRIENDS ${state.friendWeeklyRecords.length} / BEST ${state.friendWeekly.score} / BOOK ${state.friendWeekly.collectionSize}/${totalCards}`;
  updateHud();
}

function weeklyCompareText() {
  const friend = bestFriendWeeklyRecord();
  if (!friend) {
    return "";
  }
  const perfectDiff = Math.min(7, state.weeklyPerfects) - friend.perfects;
  const collectionDiff = state.collection.size - friend.collectionSize;
  const scoreDiff = Math.round(state.score) - friend.score;
  const perfectText = perfectDiff >= 0 ? `퍼펙트 +${perfectDiff}` : `퍼펙트 ${perfectDiff}`;
  const collectionText = collectionDiff >= 0 ? `카드 +${collectionDiff}` : `카드 ${collectionDiff}`;
  const scoreText = scoreDiff >= 0 ? `점수 +${scoreDiff}` : `점수 ${scoreDiff}`;
  return `${perfectText}, ${collectionText}, ${scoreText}`;
}

function addFortuneCard(judgement) {
  const previousCollection = new Set(state.collection);
  const card = pickFortuneCard(judgement);
  const isNew = !state.collection.has(card.id);
  const isToday = card.id === todayCard.id;
  let scoreBonus = rarityStyles[card.rarity].bonus;
  let completedSet = null;

  updateCardStats(card, isToday);

  if (isNew) {
    state.collection.add(card.id);
    state.newCards += 1;
    scoreBonus += 90;
    saveCollection(state.collection);

    if (isSetCompleted(card.set, previousCollection, state.collection)) {
      completedSet = card.set;
      state.setBonuses.push(card.set);
      scoreBonus += 220;
    }
  } else {
    state.duplicates += 1;
    scoreBonus += 20;
  }

  if (isToday) {
    state.todayHits += 1;
    scoreBonus += 160;
  }

  const cardEntry = {
    ...card,
    isNew,
    isToday,
    completedSet
  };
  state.roundCards.push(cardEntry);
  state.lastCard = cardEntry;

  return {
    card: cardEntry,
    scoreBonus
  };
}

function pickFortuneCard(judgement) {
  const rarityBoost = {
    perfect: { common: 0.5, rare: 1.45, epic: 2.4, mythic: 3.4 },
    sweet: { common: 0.82, rare: 1.25, epic: 1.7, mythic: 2 },
    near: { common: 1.2, rare: 0.8, epic: 0.42, mythic: 0.18 },
    over: { common: 1.45, rare: 0.52, epic: 0.18, mythic: 0.04 },
    soft: { common: 1, rare: 0.45, epic: 0.15, mythic: 0.02 }
  };
  const boost = rarityBoost[judgement.key] || rarityBoost.soft;
  const weightedDeck = fortuneDeck.map((card) => {
    let weight = rarityStyles[card.rarity].weight * boost[card.rarity];

    if (!state.collection.has(card.id)) {
      weight *= 2.2;
    }

    if (card.id === todayCard.id) {
      weight *= 1.7;
    }

    return { card, weight };
  });
  const totalWeight = weightedDeck.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const entry of weightedDeck) {
    roll -= entry.weight;

    if (roll <= 0) {
      return entry.card;
    }
  }

  return fortuneDeck[0];
}

function isSetCompleted(setId, before, after) {
  const setCards = fortuneDeck.filter((card) => card.set === setId);
  const wasComplete = setCards.every((card) => before.has(card.id));
  const isComplete = setCards.every((card) => after.has(card.id));
  return !wasComplete && isComplete;
}

function buildReleaseMessage(judgement, gained, cardResult, starBitsGained, weeklyBonus, passive) {
  if (!cardResult) {
    if (judgement.key === "over") {
      return `오버차지! 점수 +${gained}`;
    }

    return `${judgement.label} +${gained} · 별조각 +${starBitsGained}${passive.label ? ` · ${passive.label}` : ""}`;
  }

  const fragments = [cardResult.card.name];

  if (cardResult.card.isNew) {
    fragments.push("NEW");
  }

  if (cardResult.card.isToday) {
    fragments.push("TODAY");
  }

  if (cardResult.card.completedSet) {
    fragments.push(`${setLabels[cardResult.card.completedSet]} 세트`);
  }

  if (cardResult.dailySpecial) {
    fragments.push("SPECIAL");
  }

  if (weeklyBonus) {
    fragments.push(weeklyBonus.cardCode ? "WEEKLY CARD" : "WEEKLY");
  }

  if (passive.label) {
    fragments.push(passive.label);
  }

  return `${judgement.label} ${fragments.join(" / ")} +${gained} · 별조각 +${starBitsGained}`;
}

function spawnSparkles(count, accuracy, preferredColor) {
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.45;
    const speed = 86 + Math.random() * 150 + accuracy * 80;
    state.sparkles.push({
      x: width / 2,
      y: 302,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 45,
      life: 0.75 + Math.random() * 0.55,
      maxLife: 1.2,
      size: 5 + Math.random() * 6,
      color: i % 3 === 0 && preferredColor ? preferredColor : sparkleColors[Math.floor(Math.random() * sparkleColors.length)],
      spin: Math.random() * Math.PI
    });
  }
}

function updateSparkles(delta) {
  for (const sparkle of state.sparkles) {
    sparkle.x += sparkle.vx * delta;
    sparkle.y += sparkle.vy * delta;
    sparkle.vy += 80 * delta;
    sparkle.life -= delta;
    sparkle.spin += delta * 5;
  }

  state.sparkles = state.sparkles.filter((sparkle) => sparkle.life > 0);
}

function spawnFloatText(text, color) {
  state.floaters.push({
    text,
    x: width / 2,
    y: 174,
    vy: -38,
    life: 0.9,
    maxLife: 0.9,
    color
  });
}

function updateFloaters(delta) {
  for (const floater of state.floaters) {
    floater.y += floater.vy * delta;
    floater.life -= delta;
  }

  state.floaters = state.floaters.filter((floater) => floater.life > 0);
}

function finishGame() {
  if (!state.active) {
    return;
  }

  state.active = false;

  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem(storageKey, String(state.best));
  }
  updatePresetRecord();
  saveProgress();

  const collectionComplete = state.collection.size >= totalCards;
  resultKicker.textContent = collectionComplete ? "Card Book Complete" : "Shop Closed";
  resultTitle.textContent = collectionComplete ? "카드북 완성" : "상점 정산";
  const compareCopy = weeklyCompareText();
  resultCopy.textContent = collectionComplete
    ? `카드북 ${state.collection.size}/${totalCards}, 별조각 ${state.starBits}개, 최고 퍼펙트 ${state.bestPerfectStreak}연속입니다.`
    : `이번 상점에서 ${state.roundCards.length}장, 새 카드 ${state.newCards}장, 장식 ${state.unlockedDecor.size}/${decorations.length}개를 모았습니다.${state.weeklyCardCode ? ` 주간 카드 ${state.weeklyCardCode}` : ""}`;
  if (compareCopy) {
    resultCopy.textContent = `${resultCopy.textContent} 친구 비교 ${compareCopy}`;
  }
  resultOverlay.hidden = false;
  updateHud();
}

function updateHud() {
  scoreValue.textContent = state.score.toString();
  timeValue.textContent = Math.ceil(state.timeLeft).toString();
  cardValue.textContent = `${state.collection.size}/${totalCards}`;
  starValue.textContent = state.starBits.toString();
  streakValue.textContent = `${state.perfectStreak}/${state.bestPerfectStreak}`;
  bestValue.textContent = state.best.toString();
  chargeBadge.textContent = `${getChargeLabel()} ${Math.round(state.charge)}%`;
  buildPresetButton.textContent = `${state.pinnedBuildPreset === getBuildPreset().id ? "고정" : "프리셋"} ${getBuildPreset().name}`;
}

function getChargeLabel() {
  if (state.charge >= overchargeMin) {
    return "OVER";
  }

  if (state.charge >= perfectMin && state.charge <= perfectMax) {
    return "PERFECT";
  }

  if (state.charge >= sweetMin && state.charge <= sweetMax) {
    return "SWEET";
  }

  return "CHARGE";
}

function draw(timestamp) {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, height);
  drawBackground(timestamp);
  drawShopTable();
  drawChargeRing();
  drawMochi(timestamp);
  drawSparkles();
  drawFloaters();
  drawCards();
  drawGuideText();
  drawDecorationPanel();
}

function drawBackground(timestamp) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#e9fff8");
  gradient.addColorStop(0.62, "#fff4bf");
  gradient.addColorStop(1, "#ffe2f0");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(36, 48, 71, 0.06)";
  for (let x = 0; x <= width; x += 20) {
    ctx.fillRect(x, 0, 1, height);
  }

  for (let y = 0; y <= height; y += 20) {
    ctx.fillRect(0, y, width, 1);
  }

  const drift = (timestamp / 70) % 140;
  ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
  for (let i = -1; i < 6; i += 1) {
    const x = i * 140 + drift;
    ctx.fillRect(x, 72, 54, 10);
    ctx.fillRect(x + 16, 60, 38, 10);
  }

  drawEquippedBackground();
}

function drawEquippedBackground() {
  if (state.equippedDecor === "lamp") {
    for (let i = 0; i < 4; i += 1) {
      const x = 130 + i * 150;
      drawStar(x, 128, 10, "#ffd85a", state.mochiPulse * 0.2 + i);
      ctx.fillStyle = "#243047";
      ctx.fillRect(x - 1, 94, 2, 25);
    }
  }

  if (state.equippedDecor === "curtain") {
    ctx.fillStyle = "rgba(143, 120, 255, 0.32)";
    ctx.fillRect(0, 0, 54, height);
    ctx.fillRect(width - 54, 0, 54, height);
    ctx.fillStyle = "rgba(255, 255, 255, 0.38)";
    ctx.fillRect(18, 0, 8, height);
    ctx.fillRect(width - 26, 0, 8, height);
  }
}

function drawShopTable() {
  ctx.fillStyle = "#c89157";
  ctx.fillRect(70, 374, 620, 44);
  ctx.strokeStyle = "#243047";
  ctx.lineWidth = 4;
  ctx.strokeRect(70, 374, 620, 44);
  ctx.fillStyle = "#9f6f47";
  ctx.fillRect(94, 418, 26, 70);
  ctx.fillRect(640, 418, 26, 70);

  ctx.fillStyle = "rgba(255, 216, 90, 0.34)";
  ctx.fillRect(136, 384, 82, 10);
  ctx.fillRect(536, 384, 82, 10);
}

function drawChargeRing() {
  const cx = width / 2;
  const cy = 298;
  const radius = 108;
  const start = -Math.PI / 2;
  const chargeEnd = start + Math.PI * 2 * (state.charge / 100);
  const sweetStart = start + Math.PI * 2 * (sweetMin / 100);
  const sweetEnd = start + Math.PI * 2 * (sweetMax / 100);
  const perfectStart = start + Math.PI * 2 * (perfectMin / 100);
  const perfectEnd = start + Math.PI * 2 * (perfectMax / 100);
  const overStart = start + Math.PI * 2 * (overchargeMin / 100);

  ctx.lineWidth = 16;
  ctx.strokeStyle = "rgba(36, 48, 71, 0.15)";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "#ffd85a";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, sweetStart, sweetEnd);
  ctx.stroke();

  ctx.lineWidth = 22;
  ctx.strokeStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, perfectStart, perfectEnd);
  ctx.stroke();

  ctx.lineWidth = 16;
  ctx.strokeStyle = "#e95b88";
  ctx.beginPath();
  ctx.arc(cx, cy, radius, overStart, start + Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = getReleaseJudgement(state.charge).color;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, start, chargeEnd);
  ctx.stroke();
}

function drawMochi(timestamp) {
  const cx = width / 2;
  const cy = 302 + Math.sin(state.mochiPulse) * (state.charging ? 5 : 2);
  const scale = 1 + Math.sin(state.mochiPulse * 1.4) * (state.charging ? 0.045 : 0.02);
  const eyeLift = state.lastResult === "perfect" ? -3 : 0;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  ctx.fillStyle = "rgba(255, 255, 255, 0.34)";
  ctx.beginPath();
  ctx.ellipse(0, 112, 92, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = state.lastResult === "over" ? "#ffd2dc" : "#a7f1dd";
  ctx.strokeStyle = "#243047";
  ctx.lineWidth = 5;
  roundRect(-58, -52, 116, 94, 18);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#243047";
  ctx.fillRect(-25, -16 + eyeLift, 13, 13);
  ctx.fillRect(14, -16 + eyeLift, 13, 13);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(-8, 16, 18, 5);

  if (state.combo > 1) {
    ctx.fillStyle = "#ffd85a";
    ctx.fillRect(-12, -72, 24, 12);
    ctx.fillRect(-6, -82, 12, 10);
    ctx.strokeStyle = "#243047";
    ctx.strokeRect(-12, -72, 24, 12);
    ctx.strokeRect(-6, -82, 12, 10);
  }

  if (state.equippedDecor === "crown") {
    ctx.fillStyle = "#69c8ff";
    ctx.fillRect(-22, -82, 44, 12);
    ctx.fillRect(-18, -94, 10, 14);
    ctx.fillRect(-5, -100, 10, 20);
    ctx.fillRect(8, -94, 10, 14);
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 3;
    ctx.strokeRect(-22, -82, 44, 12);
    ctx.strokeRect(-18, -94, 10, 14);
    ctx.strokeRect(-5, -100, 10, 20);
    ctx.strokeRect(8, -94, 10, 14);
  }

  if (state.equippedDecor === "smile") {
    ctx.fillStyle = "#ff9a6c";
    ctx.fillRect(-41, 3, 10, 6);
    ctx.fillRect(31, 3, 10, 6);
    ctx.fillStyle = "#243047";
    ctx.fillRect(-13, 22, 26, 5);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-9, 21, 18, 3);
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
  ctx.fillRect(-38, -36, 30, 10);
  ctx.restore();

  drawStar(cx - 128, cy - 88, 9, "#ffd85a", timestamp / 300);
  drawStar(cx + 130, cy - 102, 8, "#e95b88", timestamp / 340);
  drawStar(cx + 160, cy + 4, 7, "#69c8ff", timestamp / 260);
}

function drawSparkles() {
  for (const sparkle of state.sparkles) {
    const alpha = Math.max(0, sparkle.life / sparkle.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    drawStar(sparkle.x, sparkle.y, sparkle.size, sparkle.color, sparkle.spin);
    ctx.restore();
  }
}

function drawFloaters() {
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "900 22px ui-monospace, SFMono-Regular, Consolas, monospace";

  for (const floater of state.floaters) {
    const alpha = Math.max(0, floater.life / floater.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 5;
    ctx.strokeText(floater.text, floater.x, floater.y);
    ctx.fillStyle = floater.color;
    ctx.fillText(floater.text, floater.x, floater.y);
  }

  ctx.restore();
}

function drawCards() {
  const startX = 38;
  const startY = 34;

  for (let i = 0; i < totalCards; i += 1) {
    const card = fortuneDeck[i];
    const rarity = rarityStyles[card.rarity];
    const x = startX + (i % 6) * 54;
    const y = startY + Math.floor(i / 6) * 68;
    const owned = state.collection.has(card.id);
    const isLast = state.lastCard && state.lastCard.id === card.id;
    const isToday = todayCard.id === card.id;

    ctx.fillStyle = owned ? "#ffffff" : "rgba(255, 255, 255, 0.45)";
    ctx.strokeStyle = owned ? rarity.color : "#243047";
    ctx.lineWidth = isLast ? 5 : 3;
    roundRect(x, y, 38, 52, 5);
    ctx.fill();
    ctx.stroke();

    if (owned) {
      drawStar(x + 19, y + 24, 9, card.color, i * 0.7);
      ctx.fillStyle = "#243047";
      ctx.font = "900 9px ui-monospace, SFMono-Regular, Consolas, monospace";
      ctx.fillText(rarity.label, x + 6, y + 45);
    } else {
      ctx.fillStyle = "rgba(36, 48, 71, 0.22)";
      ctx.fillRect(x + 12, y + 21, 14, 10);
    }

    if (isToday) {
      ctx.fillStyle = "#ffd85a";
      ctx.fillRect(x + 27, y - 5, 12, 12);
      ctx.strokeStyle = "#243047";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 27, y - 5, 12, 12);
    }
  }
}

function drawGuideText() {
  drawStatusPanel(width - 216, 32, 178, 100);
  ctx.fillStyle = "#526078";
  ctx.font = "900 10px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.fillText("TODAY", width - 194, 54);
  ctx.fillStyle = "#243047";
  ctx.font = "900 15px system-ui, sans-serif";
  ctx.fillText(todayCard.name, width - 194, 78);
  ctx.fillStyle = todayCard.color;
  ctx.fillRect(width - 194, 90, 92, 8);

  ctx.fillStyle = "#526078";
  ctx.font = "900 10px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.fillText("COMBO", width - 86, 54);
  ctx.fillStyle = "#243047";
  ctx.font = "900 26px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.fillText(`x${Math.max(1, state.combo)}`, width - 86, 84);

  ctx.fillStyle = "#526078";
  ctx.font = "900 10px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.fillText("DAILY", width - 194, 106);
  ctx.fillText("WEEK", width - 86, 106);
  ctx.fillStyle = "#243047";
  ctx.font = "900 14px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.fillText(`${Math.max(0, 3 - state.dailySpecialsUsed)}/3`, width - 194, 124);
  ctx.fillText(`${Math.min(7, state.weeklyPerfects)}/7`, width - 86, 124);

  if (state.lastCard) {
    drawBigCard(width - 178, 144, state.lastCard);
  } else {
    const friend = bestFriendWeeklyRecord();
    if (!friend) {
      return;
    }

    const friendCount = normalizeFriendWeeklyRecords(state.friendWeeklyRecords, state.friendWeekly).length;
    drawStatusPanel(width - 216, 144, 178, 92);
    ctx.fillStyle = "#526078";
    ctx.font = "900 10px ui-monospace, SFMono-Regular, Consolas, monospace";
    ctx.fillText(`FRIEND ${friendCount}`, width - 194, 166);
    ctx.fillStyle = "#243047";
    ctx.font = "900 13px ui-monospace, SFMono-Regular, Consolas, monospace";
    ctx.fillText(`P ${friend.perfects}/7`, width - 194, 188);
    ctx.fillText(`BOOK ${friend.collectionSize}/${totalCards}`, width - 194, 207);
    ctx.fillText(`BEST ${friend.score}`, width - 194, 226);
  }
}

function drawDecorationPanel() {
  drawStatusPanel(decorationPanel.x, decorationPanel.y, decorationPanel.w, decorationPanel.h);
  const preset = getBuildPreset();
  const presetRecord = currentPresetRecord();
  const setCount = completedSetIds().length;
  ctx.fillStyle = "#526078";
  ctx.font = "900 10px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.fillText("BUILD", decorationPanel.x + 14, decorationPanel.y + 22);
  ctx.fillStyle = "#243047";
  ctx.font = "900 10px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.fillText(`STAR ${state.starBits}`, decorationPanel.x + 106, decorationPanel.y + 22);
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#243047";
  ctx.lineWidth = 2;
  roundRect(decorationPanel.x + 12, decorationPanel.y + 32, decorationPanel.w - 24, 42, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#243047";
  ctx.font = "900 11px system-ui, sans-serif";
  ctx.fillText(`${preset.name} / SET ${setCount}/3`, decorationPanel.x + 22, decorationPanel.y + 51);
  ctx.fillStyle = "#526078";
  ctx.font = "900 9px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.fillText(`BEST ${presetRecord.bestScore} / C ${presetRecord.bestCards} / N ${presetRecord.bestNewCards}`, decorationPanel.x + 22, decorationPanel.y + 67);

  decorations.forEach((decoration, index) => {
    const y = decorationPanel.y + 86 + index * 30;
    const unlocked = state.unlockedDecor.has(decoration.id);
    const equipped = state.equippedDecor === decoration.id;
    ctx.fillStyle = equipped ? decoration.color : unlocked ? "#ffffff" : "rgba(255,255,255,0.56)";
    ctx.strokeStyle = equipped ? "#243047" : decoration.color;
    ctx.lineWidth = equipped ? 4 : 2;
    roundRect(decorationPanel.x + 12, y, decorationPanel.w - 24, 23, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#243047";
    ctx.font = "800 11px system-ui, sans-serif";
    ctx.fillText(decoration.name, decorationPanel.x + 22, y + 16);
    ctx.fillStyle = "#526078";
    ctx.font = "800 9px ui-monospace, SFMono-Regular, Consolas, monospace";
    ctx.fillText(decoration.effectLabel, decorationPanel.x + 78, y + 16);
    ctx.fillStyle = "#243047";
    ctx.font = "900 10px ui-monospace, SFMono-Regular, Consolas, monospace";
    const status = unlocked ? (equipped ? "ON" : "SET") : `${decoration.cost}`;
    ctx.fillText(status, decorationPanel.x + decorationPanel.w - 44, y + 16);
  });
}

function drawStatusPanel(x, y, w, h) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
  ctx.strokeStyle = "#243047";
  ctx.lineWidth = 3;
  roundRect(x, y, w, h, 6);
  ctx.fill();
  ctx.stroke();
}

function drawBigCard(x, y, card) {
  const rarity = rarityStyles[card.rarity];

  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = rarity.color;
  ctx.lineWidth = 5;
  roundRect(x, y, 124, 154, 7);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#243047";
  ctx.font = "900 10px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.fillText(`${rarity.label} / ${setLabels[card.set]}`, x + 12, y + 22);
  drawStar(x + 62, y + 64, 24, card.color, state.mochiPulse * 0.25);

  ctx.fillStyle = "#243047";
  ctx.font = "900 14px system-ui, sans-serif";
  ctx.fillText(card.name, x + 12, y + 111);
  ctx.fillStyle = "#526078";
  ctx.font = "800 10px system-ui, sans-serif";
  ctx.fillText(card.isNew ? "NEW CARD" : "DUPLICATE", x + 12, y + 132);

  if (card.isToday) {
    ctx.fillStyle = "#ffd85a";
    ctx.fillRect(x + 78, y + 121, 30, 12);
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 78, y + 121, 30, 12);
  }
}

function drawStar(x, y, r, color, rotation) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.fillStyle = color;
  ctx.strokeStyle = "#243047";
  ctx.lineWidth = 3;
  ctx.beginPath();

  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 10;
    const radius = i % 2 === 0 ? r : r * 0.55;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius;

    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }

  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function getTodayCardIndex() {
  const today = new Date();
  const dayNumber = Math.floor(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 86400000);
  return dayNumber % fortuneDeck.length;
}

function localDayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function currentWeekKey() {
  const now = new Date();
  const dayNumber = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
  const yearStart = Math.floor(Date.UTC(now.getFullYear(), 0, 1) / 86400000);
  const week = Math.floor((dayNumber - yearStart) / 7) + 1;
  return `${now.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function loadProgress() {
  const validDecorIds = new Set(decorations.map((decoration) => decoration.id));
  const day = localDayKey();
  const week = currentWeekKey();

  try {
    const stored = JSON.parse(localStorage.getItem(progressStorageKey) || "{}");
    const unlockedDecorIds = Array.isArray(stored.unlockedDecorIds)
      ? stored.unlockedDecorIds.filter((id) => validDecorIds.has(id))
      : [];
    const equippedDecor = unlockedDecorIds.includes(stored.equippedDecor) ? stored.equippedDecor : "";
    const daily = stored.daily && stored.daily.day === day
      ? { day, used: Math.min(3, Number(stored.daily.used || 0)) }
      : { day, used: 0 };
    const weekly = stored.weekly && stored.weekly.week === week
      ? {
          week,
          perfects: Math.min(7, Number(stored.weekly.perfects || 0)),
          claimed: Boolean(stored.weekly.claimed),
          cardCode: typeof stored.weekly.cardCode === "string" ? stored.weekly.cardCode : ""
        }
      : { week, perfects: 0, claimed: false, cardCode: "" };
    const friendWeekly = normalizeFriendWeekly(stored.friendWeekly);
    const friendWeeklyRecords = normalizeFriendWeeklyRecords(stored.friendWeeklyRecords, friendWeekly);
    const pinnedBuildPreset = isValidBuildPresetId(stored.pinnedBuildPreset) ? stored.pinnedBuildPreset : "";
    const buildPreset = pinnedBuildPreset || (isValidBuildPresetId(stored.buildPreset) ? stored.buildPreset : "balanced");

    return {
      starBits: Math.max(0, Number(stored.starBits || 0)),
      unlockedDecorIds,
      equippedDecor,
      buildPreset,
      pinnedBuildPreset,
      presetRecords: normalizePresetRecords(stored.presetRecords),
      cardStats: normalizeCardStats(stored.cardStats),
      friendWeekly: pickBestFriendWeeklyRecord(friendWeeklyRecords) || friendWeekly,
      friendWeeklyRecords,
      friendWeekFilter: sanitizeFriendWeekFilter(stored.friendWeekFilter),
      friendArchiveFilter: sanitizeFriendArchiveFilter(stored.friendArchiveFilter),
      visitDays: normalizeVisitDays(stored.visitDays, day),
      candidateMetrics: normalizeCandidateMetrics(stored.candidateMetrics),
      bestPerfectStreak: Math.max(0, Number(stored.bestPerfectStreak || 0)),
      daily,
      weekly
    };
  } catch (error) {
    return {
      starBits: 0,
      unlockedDecorIds: [],
      equippedDecor: "",
      buildPreset: "balanced",
      pinnedBuildPreset: "",
      presetRecords: normalizePresetRecords({}),
      cardStats: normalizeCardStats({}),
      friendWeekly: null,
      friendWeeklyRecords: [],
      friendWeekFilter: "all",
      friendArchiveFilter: "active",
      visitDays: normalizeVisitDays([], day),
      candidateMetrics: normalizeCandidateMetrics({}),
      bestPerfectStreak: 0,
      daily: { day, used: 0 },
      weekly: { week, perfects: 0, claimed: false, cardCode: "" }
    };
  }
}

function saveProgress() {
  const friendWeeklyRecords = normalizeFriendWeeklyRecords(state.friendWeeklyRecords, state.friendWeekly);
  const friendWeekly = pickBestFriendWeeklyRecord(friendWeeklyRecords) || normalizeFriendWeekly(state.friendWeekly);
  const visitDays = normalizeVisitDays(state.visitDays);
  state.visitDays = visitDays;
  state.candidateMetrics = buildCandidateMetrics(friendWeeklyRecords);
  const payload = {
    starBits: state.starBits,
    unlockedDecorIds: [...state.unlockedDecor],
    equippedDecor: state.unlockedDecor.has(state.equippedDecor) ? state.equippedDecor : "",
    buildPreset: getBuildPreset().id,
    pinnedBuildPreset: isValidBuildPresetId(state.pinnedBuildPreset) ? state.pinnedBuildPreset : "",
    presetRecords: normalizePresetRecords(state.presetRecords),
    cardStats: normalizeCardStats(state.cardStats, state.collection),
    friendWeekly,
    friendWeeklyRecords,
    friendWeekFilter: sanitizeFriendWeekFilter(state.friendWeekFilter),
    friendArchiveFilter: sanitizeFriendArchiveFilter(state.friendArchiveFilter),
    visitDays,
    candidateMetrics: state.candidateMetrics,
    bestPerfectStreak: state.bestPerfectStreak,
    daily: {
      day: localDayKey(),
      used: state.dailySpecialsUsed
    },
    weekly: {
      week: currentWeekKey(),
      perfects: state.weeklyPerfects,
      claimed: state.weeklyClaimed,
      cardCode: state.weeklyCardCode || state.progress.weekly.cardCode || ""
    }
  };
  localStorage.setItem(progressStorageKey, JSON.stringify(payload));
}

function loadCollectionIds() {
  try {
    const stored = JSON.parse(localStorage.getItem(collectionStorageKey) || "[]");
    const validIds = new Set(fortuneDeck.map((card) => card.id));
    return Array.isArray(stored) ? stored.filter((id) => validIds.has(id)) : [];
  } catch (error) {
    return [];
  }
}

function saveCollection(collection) {
  localStorage.setItem(collectionStorageKey, JSON.stringify([...collection]));
}
