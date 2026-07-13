const canvas = document.getElementById("bakeryCanvas");
const ctx = canvas.getContext("2d");
const scoreValue = document.getElementById("scoreValue");
const timeValue = document.getElementById("timeValue");
const basketValue = document.getElementById("basketValue");
const waveValue = document.getElementById("waveValue");
const hintText = document.getElementById("hintText");
const presetButton = document.getElementById("presetButton");
const burstButton = document.getElementById("burstButton");
const restartButton = document.getElementById("restartButton");
const overlayRestartButton = document.getElementById("overlayRestartButton");
const upgradeOverlay = document.getElementById("upgradeOverlay");
const upgradeChoices = document.getElementById("upgradeChoices");
const resultOverlay = document.getElementById("resultOverlay");
const resultKicker = document.getElementById("resultKicker");
const resultTitle = document.getElementById("resultTitle");
const resultCopy = document.getElementById("resultCopy");
const controlButtons = Array.from(document.querySelectorAll("[data-control]"));

const width = 800;
const height = 520;
const roundSeconds = 75;
const basketMax = 100;
const burstMeterMax = 100;
const recipeStorageKey = "pocketBakeryRecipes:v1";
const bestScoreStorageKey = "pocketBakeryBestScore:v1";
const progressStorageKey = "pocketBakeryProgress:v2";
const playerStart = { x: 400, y: 300 };
const basket = { x: 400, y: 246, r: 48 };
const spawnPoints = [
  { x: -30, y: 92 },
  { x: 830, y: 108 },
  { x: -30, y: 430 },
  { x: 830, y: 414 },
  { x: 148, y: -30 },
  { x: 660, y: -30 }
];
const waveHintPattern = [
  { id: "left", label: "왼쪽 매대", marker: "LEFT", spawnIndexes: [0, 2], x: 30, y: 262, dx: 1, dy: 0, color: "#e95b88" },
  { id: "right", label: "오른쪽 매대", marker: "RIGHT", spawnIndexes: [1, 3], x: width - 30, y: 262, dx: -1, dy: 0, color: "#69c8ff" },
  { id: "top", label: "윗문", marker: "TOP", spawnIndexes: [4, 5], x: width / 2, y: 34, dx: 0, dy: 1, color: "#ffd85a" }
];
const ingredientSpots = [
  { x: 150, y: 166 },
  { x: 650, y: 172 },
  { x: 144, y: 404 },
  { x: 662, y: 398 },
  { x: 400, y: 430 }
];
const shelfItems = [
  { id: "croissant", name: "초승달빵", cost: 3, color: "#f4b860", effectLabel: "점수 +4%", effect: { scoreBonus: 0.04 } },
  { id: "jam", name: "딸기잼", cost: 6, color: "#e95b88", effectLabel: "피해 +1", effect: { damageBonus: 1 } },
  { id: "cream", name: "크림롤", cost: 10, color: "#fff1d6", effectLabel: "보호 +4", effect: { shieldBonus: 4 } },
  { id: "mint", name: "민트타르트", cost: 15, color: "#35d7a8", effectLabel: "이동 +12", effect: { speedBonus: 12 } },
  { id: "star", name: "별식빵", cost: 22, color: "#ffd85a", effectLabel: "발사 -6%", effect: { fireMultiplier: 0.94 } }
];
const starterPresets = [
  { id: "balanced", name: "균형", unlockRecipes: 0, counts: { oven: 1, bubble: 1, sugar: 1, basket: 1 } },
  { id: "oven", name: "오븐", unlockRecipes: 4, counts: { oven: 2, bubble: 1, sugar: 0, basket: 0 } },
  { id: "bubble", name: "반죽", unlockRecipes: 8, counts: { oven: 0, bubble: 2, sugar: 1, basket: 0 } },
  { id: "sugar", name: "설탕", unlockRecipes: 12, counts: { oven: 1, bubble: 0, sugar: 2, basket: 0 } },
  { id: "basket", name: "바구니", unlockRecipes: 16, counts: { oven: 0, bubble: 1, sugar: 0, basket: 2 } }
];
const familyLabels = {
  oven: "오븐",
  bubble: "반죽",
  sugar: "설탕",
  basket: "바구니"
};
const enemyTypes = [
  { id: "order", name: "주문서", color: "#fff1d6", hp: 5, speed: 58, size: 14, damage: 3, score: 1, shield: 0 },
  { id: "coupon", name: "쿠폰", color: "#69c8ff", hp: 4, speed: 94, size: 12, damage: 2, score: 1.15, shield: 0 },
  { id: "plate", name: "접시", color: "#d7c8ff", hp: 7, speed: 44, size: 18, damage: 4, score: 1.35, shield: 5 },
  { id: "scroll", name: "긴 주문서", color: "#f4b860", hp: 12, speed: 34, size: 20, damage: 6, score: 1.5, shield: 0 }
];
const upgrades = [
  { id: "oven", family: "oven", title: "오븐 열기", detail: "발사 속도 +18%", apply: (state) => { addBuild(state, "oven"); state.fireDelay *= state.buildCounts.oven >= 2 ? 0.76 : 0.82; } },
  { id: "bubble", family: "bubble", title: "쫀득 반죽", detail: "방울 크기와 피해 +1", apply: (state) => { addBuild(state, "bubble"); state.bubbleSize += 1.4; state.bubbleDamage += 1; state.splashRadius += state.buildCounts.bubble >= 2 ? 10 : 0; } },
  { id: "sugar", family: "sugar", title: "설탕 코팅", detail: "주문 러시 감속", apply: (state) => { addBuild(state, "sugar"); state.sugarSlow += 0.18; state.scoreMultiplier += 0.04; } },
  { id: "shoes", family: "sugar", title: "미끄럼 신발", detail: "이동 속도 +18%", apply: (state) => { addBuild(state, "sugar"); state.player.speed += 28; } },
  { id: "basket", family: "basket", title: "튼튼 바구니", detail: "내구도 +18, 보호막 +4", apply: (state) => { addBuild(state, "basket"); state.basketHp = Math.min(basketMax, state.basketHp + 18); state.basketShield += 4; } },
  { id: "recipe", family: "oven", title: "레시피 메모", detail: "점수 +8%, 재료 등장", apply: (state) => { addBuild(state, "oven"); state.scoreMultiplier += 0.08; state.ingredientTimer = Math.min(state.ingredientTimer, 1.5); } }
];

let keys = { left: false, right: false, up: false, down: false };
let state = createInitialState();
let animationFrame = 0;
let lastTimestamp = 0;

restartButton.addEventListener("click", () => startGame(state?.selectedPresetId));
overlayRestartButton.addEventListener("click", () => startGame(state?.selectedPresetId));
presetButton.addEventListener("click", cyclePreset);
burstButton.addEventListener("click", activateOvenBurst);
canvas.addEventListener("pointerdown", setMoveTarget);
canvas.addEventListener("pointermove", (event) => {
  if (event.buttons === 1 && state.active && !state.paused) {
    setMoveTarget(event);
  }
});

for (const button of controlButtons) {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    setControl(button.dataset.control, true);
  });
  button.addEventListener("pointerup", () => setControl(button.dataset.control, false));
  button.addEventListener("pointerleave", () => setControl(button.dataset.control, false));
  button.addEventListener("pointercancel", () => setControl(button.dataset.control, false));
}

startGame();

function createInitialState(presetId = "") {
  const progress = loadProgress();
  const selectedPreset = getSelectedPreset(progress, presetId || progress.selectedPresetId);
  const buildCounts = getStarterBuildCounts(progress, selectedPreset);
  const shelfPassive = getShelfPassive(progress.shelfIds);
  const fireDelay = (0.42 - buildCounts.oven * 0.04) * shelfPassive.fireMultiplier;
  const bubbleSize = 8 + buildCounts.bubble * 1.4;
  const bubbleDamage = 3 + buildCounts.bubble + shelfPassive.damageBonus;

  return {
    active: false,
    paused: false,
    selectedPresetId: selectedPreset.id,
    selectedPresetName: selectedPreset.name,
    shelfPassive,
    waveRule: null,
    waveRuleTimer: 0,
    score: 0,
    timeLeft: roundSeconds,
    wave: 1,
    nextUpgradeWave: 2,
    nextWaveHint: getWaveHint(2),
    activeWaveHint: null,
    waveFocusTimer: 0,
    guardTimer: 0,
    guardPrep: 0,
    burstMeter: 24,
    burstCooldown: 0,
    burstActivations: 0,
    burstHits: 0,
    burstSaves: 0,
    counterBakeTimer: 0,
    counterBakeShots: 0,
    counterBakeCueId: "",
    counterBakeWave: 0,
    counterBakeActivations: 0,
    counterBakeHits: 0,
    waveWarningIssuedFor: 0,
    spawnTimer: 0,
    fireTimer: 0,
    fireDelay: Math.max(0.27, fireDelay),
    bubbleSize,
    bubbleDamage,
    splashRadius: buildCounts.bubble >= 2 ? 10 : 0,
    sugarSlow: buildCounts.sugar > 0 ? 0.12 + (buildCounts.sugar - 1) * 0.12 : 0,
    scoreMultiplier: 1 + shelfPassive.scoreBonus,
    basketHp: basketMax,
    basketShield: buildCounts.basket * 5 + shelfPassive.shieldBonus,
    buildCounts,
    lastSynergy: "",
    ingredientTimer: 6,
    ingredient: null,
    collectedIngredients: 0,
    progress,
    recipes: progress.recipes,
    shelfIds: new Set(progress.shelfIds),
    mission: null,
    nextMissionTimer: 8,
    missionCompletions: 0,
    bestScore: Number(localStorage.getItem(bestScoreStorageKey) || 0),
    player: { x: playerStart.x, y: playerStart.y, speed: 148 + shelfPassive.speedBonus, target: null, bob: 0 },
    enemies: [],
    bubbles: [],
    crumbs: [],
    pulses: []
  };
}

function getUnlockedPresets(progress) {
  return starterPresets.filter((preset) => progress.recipes >= preset.unlockRecipes);
}

function getSelectedPreset(progress, presetId) {
  const unlocked = getUnlockedPresets(progress);
  return unlocked.find((preset) => preset.id === presetId) || unlocked[0] || starterPresets[0];
}

function getStarterBuildCounts(progress, preset) {
  const starterCount = Math.min(4, Math.floor(progress.recipes / 4));
  const unlockedFamilies = {
    oven: starterCount >= 1 ? 1 : 0,
    bubble: starterCount >= 2 ? 1 : 0,
    sugar: starterCount >= 3 ? 1 : 0,
    basket: starterCount >= 4 ? 1 : 0
  };
  if (preset.id === "balanced") {
    return unlockedFamilies;
  }

  const counts = { oven: 0, bubble: 0, sugar: 0, basket: 0 };
  let remaining = starterCount;
  for (const family of ["oven", "bubble", "sugar", "basket"]) {
    const assigned = Math.min(remaining, preset.counts[family] || 0);
    counts[family] = assigned;
    remaining -= assigned;
  }
  return counts;
}

function getShelfPassive(shelfIdsInput) {
  const ids = shelfIdsInput instanceof Set ? shelfIdsInput : new Set(shelfIdsInput || []);
  return shelfItems.reduce((passive, item) => {
    if (!ids.has(item.id)) {
      return passive;
    }
    const effect = item.effect || {};
    passive.scoreBonus += Number(effect.scoreBonus || 0);
    passive.damageBonus += Number(effect.damageBonus || 0);
    passive.shieldBonus += Number(effect.shieldBonus || 0);
    passive.speedBonus += Number(effect.speedBonus || 0);
    passive.fireMultiplier *= Number(effect.fireMultiplier || 1);
    passive.labels.push(item.effectLabel);
    return passive;
  }, { scoreBonus: 0, damageBonus: 0, shieldBonus: 0, speedBonus: 0, fireMultiplier: 1, labels: [] });
}

function getPassiveSummary(passive) {
  if (!passive.labels.length) {
    return "패시브 없음";
  }
  return passive.labels.slice(0, 2).join(" / ");
}

function startGame(presetId = "") {
  state = createInitialState(presetId);
  state.active = true;
  saveProgress();
  upgradeOverlay.hidden = true;
  resultOverlay.hidden = true;
  hintText.textContent = state.recipes >= 4
    ? `${state.selectedPresetName} 프리셋으로 영업을 시작합니다.`
    : "화면을 탭하거나 드래그해 움직이고, 가까운 주문 러시에는 반죽 방울이 자동 발사됩니다.";
  keys = { left: false, right: false, up: false, down: false };
  syncButtons();
  lastTimestamp = performance.now();
  cancelAnimationFrame(animationFrame);
  animationFrame = requestAnimationFrame(tick);
}

function cyclePreset() {
  const progress = loadProgress();
  const unlocked = getUnlockedPresets(progress);
  const currentIndex = Math.max(0, unlocked.findIndex((preset) => preset.id === state.selectedPresetId));
  const nextPreset = unlocked[(currentIndex + 1) % unlocked.length] || starterPresets[0];
  startGame(nextPreset.id);
}

function tick(timestamp) {
  const delta = Math.min(0.05, (timestamp - lastTimestamp) / 1000);
  lastTimestamp = timestamp;

  if (state.active && !state.paused) {
    state.timeLeft = Math.max(0, state.timeLeft - delta);
    updateWave();
    updateWaveFocus(delta);
    updateWaveRule(delta);
    state.guardTimer = Math.max(0, state.guardTimer - delta);
    updatePlayer(delta);
    updateGuardPrep(delta);
    spawnEnemies(delta);
    updateEnemies(delta);
    updateBubbles(delta);
    updateIngredient(delta);
    updateMission(delta);
    updateBurst(delta);
    updateCrumbs(delta);
    autoFire(delta);
    checkFinish();
  }

  updateHud();
  draw(timestamp);
  animationFrame = requestAnimationFrame(tick);
}

function setControl(control, value) {
  if (control in keys) {
    keys[control] = value;
    if (value) {
      state.player.target = null;
    }
    syncButtons();
  }
}

function syncButtons() {
  for (const button of controlButtons) {
    button.classList.toggle("is-active", Boolean(keys[button.dataset.control]));
  }
}

function addBuild(state, family) {
  state.buildCounts[family] += 1;
  state.lastSynergy = state.buildCounts[family] >= 2 ? `${familyLabels[family]} x${state.buildCounts[family]}` : "";
}

function setMoveTarget(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = width / rect.width;
  const scaleY = height / rect.height;
  state.player.target = {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY
  };
}

function updateWave() {
  const elapsed = roundSeconds - state.timeLeft;
  const nextWave = Math.min(5, state.wave + 1);
  const nextWaveAt = state.wave * 15;
  const secondsToNextWave = nextWaveAt - elapsed;
  if (nextWave <= 5 && secondsToNextWave > 0 && secondsToNextWave <= 4 && state.waveWarningIssuedFor !== nextWave) {
    state.waveWarningIssuedFor = nextWave;
    hintText.textContent = `곧 ${nextWave}번째 주문 러시: ${state.nextWaveHint.label} 쪽을 지켜주세요.`;
  }

  const wave = Math.min(5, 1 + Math.floor((roundSeconds - state.timeLeft) / 15));
  if (wave !== state.wave) {
    state.wave = wave;
    state.activeWaveHint = state.nextWaveHint || getWaveHint(state.wave);
    state.waveFocusTimer = 5;
    state.guardPrep = 0;
    state.counterBakeWave = 0;
    state.counterBakeTimer = 0;
    state.counterBakeShots = 0;
    state.counterBakeCueId = "";
    state.nextWaveHint = getWaveHint(state.wave + 1);
    state.waveWarningIssuedFor = 0;
    hintText.textContent = `${state.wave}번째 주문 러시가 ${state.activeWaveHint.label}에서 시작됐습니다.`;

    if (state.wave === state.nextUpgradeWave) {
      showUpgrade();
      state.nextUpgradeWave += 2;
    }
  }
}

function getWaveHint(wave) {
  return waveHintPattern[Math.abs(wave - 2) % waveHintPattern.length];
}

function updateWaveFocus(delta) {
  if (state.waveFocusTimer > 0) {
    state.waveFocusTimer = Math.max(0, state.waveFocusTimer - delta);
    if (state.waveFocusTimer === 0) {
      state.activeWaveHint = null;
    }
  }
}

function updateWaveRule(delta) {
  if (!state.waveRule) {
    return;
  }
  state.waveRuleTimer -= delta;
  if (state.waveRuleTimer <= 0) {
    hintText.textContent = `${state.waveRule.label} 규칙이 끝났습니다.`;
    state.waveRule = null;
    state.waveRuleTimer = 0;
  }
}

function updateGuardPrep(delta) {
  state.counterBakeTimer = Math.max(0, state.counterBakeTimer - delta);

  if (state.counterBakeTimer === 0 && state.counterBakeShots > 0) {
    state.counterBakeShots = 0;
    state.counterBakeCueId = "";
  }

  const cue = state.activeWaveHint;
  if (!cue || state.waveFocusTimer <= 0 || state.counterBakeWave === state.wave) {
    state.guardPrep = Math.max(0, state.guardPrep - delta * 0.42);
    return;
  }

  if (isInGuardZone(cue)) {
    state.guardPrep = Math.min(1, state.guardPrep + delta * 0.52);
    if (state.guardPrep >= 1) {
      state.guardPrep = 0;
      state.counterBakeTimer = 4.4;
      state.counterBakeShots = 5;
      state.counterBakeCueId = cue.id;
      state.counterBakeWave = state.wave;
      state.counterBakeActivations += 1;
      state.guardTimer = 0.72;
      state.score += 40 + state.wave * 12;
      spawnCrumbs(state.player.x, state.player.y - 18, 20, "#ffd85a");
      hintText.textContent = `카운터 굽기 준비 완료! ${cue.label} 러시를 크게 튕겨냅니다.`;
    }
  } else {
    state.guardPrep = Math.max(0, state.guardPrep - delta * 0.22);
  }
}

function updateBurst(delta) {
  state.burstCooldown = Math.max(0, state.burstCooldown - delta);
  for (const pulse of state.pulses) {
    pulse.life -= delta;
    pulse.radius += pulse.speed * delta;
  }
  state.pulses = state.pulses.filter((pulse) => pulse.life > 0);
}

function addBurstMeter(amount) {
  state.burstMeter = clamp(state.burstMeter + amount, 0, burstMeterMax);
}

function activateOvenBurst() {
  if (!state.active || state.paused || state.burstCooldown > 0 || state.burstMeter < burstMeterMax) {
    return;
  }

  const radius = 158 + state.wave * 6 + state.buildCounts.bubble * 4;
  const damage = 8 + state.wave * 2 + state.bubbleDamage * 0.8;
  let hits = 0;

  state.burstMeter = 0;
  state.burstCooldown = 5.2;
  state.burstActivations += 1;
  state.guardTimer = 0.62;
  state.pulses.push({
    x: state.player.x,
    y: state.player.y,
    radius: 18,
    maxRadius: radius,
    speed: 420,
    life: 0.42,
    color: "#35d7a8"
  });

  for (const enemy of state.enemies) {
    const distance = Math.hypot(enemy.x - state.player.x, enemy.y - state.player.y);
    if (distance <= radius + enemy.size) {
      const falloff = 1 - Math.min(0.55, distance / (radius * 1.8));
      applyBubbleDamage(enemy, damage * falloff);
      enemy.slowTimer = Math.max(enemy.slowTimer, 1.15);
      knockEnemyFrom(enemy, state.player.x, state.player.y, 38 + (1 - distance / Math.max(1, radius)) * 30);
      hits += 1;
    }
  }

  state.burstHits += hits;
  state.score += hits * (34 + state.wave * 7);
  if (state.basketHp <= 36 && hits >= 3) {
    state.burstSaves += 1;
    state.basketHp = Math.min(basketMax, state.basketHp + 8);
  }
  spawnCrumbs(state.player.x, state.player.y, 32, hits ? "#35d7a8" : "#ffd85a");
  collectDefeatedEnemies("#35d7a8", 1.18);
  hintText.textContent = hits
    ? `오븐 파동! 주문 ${hits}개를 말랑하게 밀어냈습니다.`
    : "오븐 파동이 반짝였지만 주문이 너무 멀었어요.";
}

function getGuardZone(cue) {
  if (!cue) {
    return null;
  }
  if (cue.id === "left") {
    return { x: 70, y: 112, w: 122, h: 300 };
  }
  if (cue.id === "right") {
    return { x: width - 192, y: 112, w: 122, h: 300 };
  }
  return { x: 278, y: 84, w: 244, h: 96 };
}

function isInGuardZone(cue) {
  const zone = getGuardZone(cue);
  if (!zone) {
    return false;
  }
  return state.player.x >= zone.x
    && state.player.x <= zone.x + zone.w
    && state.player.y >= zone.y
    && state.player.y <= zone.y + zone.h;
}

function updatePlayer(delta) {
  const player = state.player;
  let dx = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
  let dy = (keys.up ? -1 : 0) + (keys.down ? 1 : 0);

  if (dx === 0 && dy === 0 && player.target) {
    dx = player.target.x - player.x;
    dy = player.target.y - player.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 8) {
      player.target = null;
      dx = 0;
      dy = 0;
    }
  }

  const length = Math.hypot(dx, dy);
  if (length > 0) {
    player.x += (dx / length) * player.speed * delta;
    player.y += (dy / length) * player.speed * delta;
  }

  player.x = clamp(player.x, 42, width - 42);
  player.y = clamp(player.y, 70, height - 44);
  player.bob += delta * 6;
}

function spawnEnemies(delta) {
  state.spawnTimer -= delta;
  if (state.spawnTimer > 0) {
    return;
  }

  const focus = state.waveFocusTimer > 0 ? state.activeWaveHint : null;
  const pointIndexes = focus && Math.random() < 0.74 ? focus.spawnIndexes : null;
  const pointIndex = pointIndexes
    ? pointIndexes[Math.floor(Math.random() * pointIndexes.length)]
    : Math.floor(Math.random() * spawnPoints.length);
  const point = spawnPoints[pointIndex];
  const type = pickEnemyType();
  state.enemies.push({
    x: point.x,
    y: point.y,
    type: type.id,
    name: type.name,
    hp: type.hp + state.wave * (type.id === "scroll" ? 2 : 1.2),
    maxHp: type.hp + state.wave * (type.id === "scroll" ? 2 : 1.2),
    shield: type.shield + (type.shield ? state.wave : 0),
    maxShield: type.shield + (type.shield ? state.wave : 0),
    speed: type.speed + state.wave * (type.id === "coupon" ? 12 : 8) + (state.waveRule?.enemySpeedBonus || 0),
    size: type.size,
    damage: type.damage,
    scoreMod: type.score,
    color: type.color,
    slowTimer: 0,
    nibbleTimer: 0,
    wobble: Math.random() * Math.PI * 2
  });

  const ruleSpawnMultiplier = state.waveRule?.spawnMultiplier || 1;
  state.spawnTimer = Math.max(0.26, (1.16 - state.wave * 0.13) * ruleSpawnMultiplier);
}

function pickEnemyType() {
  const roll = Math.random();

  if (state.wave >= 4 && roll > 0.78) {
    return enemyTypes[3];
  }

  if (state.wave >= 2 && roll > 0.55) {
    return enemyTypes[1];
  }

  if (state.wave >= 3 && roll > 0.36) {
    return enemyTypes[2];
  }

  return enemyTypes[0];
}

function updateEnemies(delta) {
  for (const enemy of state.enemies) {
    enemy.slowTimer = Math.max(0, enemy.slowTimer - delta);
    const dx = basket.x - enemy.x;
    const dy = basket.y - enemy.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const speed = enemy.slowTimer > 0 ? enemy.speed * 0.55 : enemy.speed;

    if (distance > basket.r + enemy.size) {
      enemy.x += (dx / distance) * speed * delta;
      enemy.y += (dy / distance) * speed * delta;
    } else {
      enemy.nibbleTimer -= delta;
      if (enemy.nibbleTimer <= 0) {
        enemy.nibbleTimer = 0.72;
        const damage = enemy.damage;
        if (state.basketShield > 0) {
          state.basketShield = Math.max(0, state.basketShield - damage);
        } else {
          state.basketHp = Math.max(0, state.basketHp - damage);
        }
        spawnCrumbs(enemy.x, enemy.y, 6, "#e95b88");
      }
    }

    enemy.wobble += delta * 5;
  }
}

function autoFire(delta) {
  state.fireTimer -= delta;
  if (state.fireTimer > 0) {
    return;
  }

  const target = findNearestEnemy();
  if (!target) {
    return;
  }

  const guarding = isGuardingRush();
  const counterBake = isCounterBakeActive();
  const dx = target.x - state.player.x;
  const dy = target.y - state.player.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  state.bubbles.push({
    x: state.player.x,
    y: state.player.y - 8,
    vx: (dx / distance) * (counterBake ? 368 : guarding ? 318 : 275),
    vy: (dy / distance) * (counterBake ? 368 : guarding ? 318 : 275),
    r: state.bubbleSize + (counterBake ? 5.4 : guarding ? 2.2 : 0),
    damage: state.bubbleDamage * (counterBake ? 1.72 : guarding ? 1.24 : 1),
    life: counterBake ? 1.6 : 1.45,
    counterBake
  });
  if (counterBake) {
    state.counterBakeShots = Math.max(0, state.counterBakeShots - 1);
    state.guardTimer = 0.4;
    state.score += 9 + state.wave * 2;
  } else if (guarding) {
    state.guardTimer = 0.28;
    state.score += 3;
  }
  state.fireTimer = state.fireDelay * (state.waveRule?.fireMultiplier || 1) * (counterBake ? 0.58 : guarding ? 0.72 : 1);
}

function isCounterBakeActive() {
  return state.counterBakeTimer > 0 && state.counterBakeShots > 0;
}

function isGuardingRush() {
  const cue = state.activeWaveHint;
  if (!cue || state.waveFocusTimer <= 0) {
    return false;
  }
  if (cue.id === "left") {
    return state.player.x < basket.x - 128;
  }
  if (cue.id === "right") {
    return state.player.x > basket.x + 128;
  }
  return state.player.y < basket.y - 78;
}

function findNearestEnemy() {
  let nearest = null;
  let nearestDistance = Infinity;

  for (const enemy of state.enemies) {
    const distance = Math.hypot(enemy.x - state.player.x, enemy.y - state.player.y);
    if (distance < nearestDistance) {
      nearest = enemy;
      nearestDistance = distance;
    }
  }

  return nearestDistance < 340 ? nearest : null;
}

function updateBubbles(delta) {
  for (const bubble of state.bubbles) {
    bubble.x += bubble.vx * delta;
    bubble.y += bubble.vy * delta;
    bubble.life -= delta;

    for (const enemy of state.enemies) {
      if (Math.hypot(enemy.x - bubble.x, enemy.y - bubble.y) < enemy.size + bubble.r) {
        applyBubbleDamage(enemy, bubble.damage);
        const splashRadius = bubble.counterBake ? Math.max(52, state.splashRadius + 26) : state.splashRadius;
        if (bubble.counterBake) {
          state.counterBakeHits += 1;
          state.score += 18 + state.wave * 4;
          addBurstMeter(2.2);
          enemy.slowTimer = Math.max(enemy.slowTimer, 0.85);
          knockEnemyFrom(enemy, bubble.x, bubble.y, 28);
        }
        if (splashRadius > 0) {
          for (const nearby of state.enemies) {
            if (nearby !== enemy && Math.hypot(nearby.x - bubble.x, nearby.y - bubble.y) < splashRadius + nearby.size) {
              applyBubbleDamage(nearby, Math.max(1, bubble.damage * (bubble.counterBake ? 0.62 : 0.45)));
              if (bubble.counterBake) {
                nearby.slowTimer = Math.max(nearby.slowTimer, 0.6);
                knockEnemyFrom(nearby, bubble.x, bubble.y, 18);
              }
            }
          }
        }
        bubble.life = 0;
        spawnCrumbs(bubble.x, bubble.y, bubble.counterBake ? 16 : 4, bubble.counterBake ? "#ffd85a" : "#ffffff");
        break;
      }
    }
  }

  state.bubbles = state.bubbles.filter((bubble) => bubble.life > 0 && bubble.x > -30 && bubble.x < width + 30 && bubble.y > -30 && bubble.y < height + 30);

  collectDefeatedEnemies("#ffd85a", 1);
}

function collectDefeatedEnemies(color, scoreBoost) {
  const defeated = [];
  state.enemies = state.enemies.filter((enemy) => {
    if (enemy.hp <= 0) {
      defeated.push(enemy);
      return false;
    }
    return true;
  });

  for (const enemy of defeated) {
    state.score += Math.round((70 + enemy.maxHp * 8 + state.wave * 12) * enemy.scoreMod * state.scoreMultiplier * scoreBoost);
    addBurstMeter(7 + state.wave * 1.6 + (enemy.type === "scroll" ? 4 : 0));
    spawnCrumbs(enemy.x, enemy.y, 10, color);
  }
}

function applyBubbleDamage(enemy, damage) {
  if (enemy.shield > 0) {
    enemy.shield = Math.max(0, enemy.shield - damage);
  } else {
    enemy.hp -= damage;
  }

  if (state.sugarSlow > 0) {
    enemy.slowTimer = Math.max(enemy.slowTimer, 0.45 + state.sugarSlow);
  }
}

function knockEnemyFrom(enemy, x, y, force) {
  const dx = enemy.x - x;
  const dy = enemy.y - y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  enemy.x = clamp(enemy.x + (dx / distance) * force, 12, width - 12);
  enemy.y = clamp(enemy.y + (dy / distance) * force, 36, height - 12);
  enemy.wobble += 0.8;
}

function updateIngredient(delta) {
  if (!state.ingredient) {
    state.ingredientTimer -= delta;

    if (state.ingredientTimer <= 0) {
      const spot = ingredientSpots[Math.floor(Math.random() * ingredientSpots.length)];
      state.ingredient = {
        x: spot.x,
        y: spot.y,
        life: 8.5,
        pulse: 0
      };
      state.ingredientTimer = 10 + Math.random() * 4;
      hintText.textContent = "재료 상자가 도착했습니다.";
    }

    return;
  }

  state.ingredient.life -= delta;
  state.ingredient.pulse += delta * 6;

  const distance = Math.hypot(state.player.x - state.ingredient.x, state.player.y - state.ingredient.y);
  if (distance < 34) {
    state.collectedIngredients += 1;
    state.basketHp = Math.min(basketMax, state.basketHp + 8 + state.buildCounts.basket * 2);
    state.score += Math.round(160 * state.scoreMultiplier);
    addBurstMeter(14);
    spawnCrumbs(state.ingredient.x, state.ingredient.y, 14, "#35d7a8");
    hintText.textContent = `재료 상자 +${state.collectedIngredients}`;
    state.ingredient = null;
    return;
  }

  if (state.ingredient.life <= 0) {
    state.ingredient = null;
  }
}

function updateMission(delta) {
  if (!state.mission) {
    state.nextMissionTimer -= delta;
    if (state.nextMissionTimer <= 0) {
      const repair = state.wave % 2 === 1;
      state.mission = {
        type: repair ? "repair" : "carry",
        title: repair ? "오븐 수리" : "재료 운반",
        x: repair ? 400 : ingredientSpots[state.wave % ingredientSpots.length].x,
        y: repair ? 170 : ingredientSpots[state.wave % ingredientSpots.length].y,
        timeLeft: 10,
        progress: 0,
        target: repair ? 2.2 : 1.6
      };
      hintText.textContent = `${state.mission.title} 미션이 시작됐습니다.`;
    }
    return;
  }

  state.mission.timeLeft -= delta;
  const distance = Math.hypot(state.player.x - state.mission.x, state.player.y - state.mission.y);
  if (distance < 44) {
    state.mission.progress += delta;
  }

  if (state.mission.progress >= state.mission.target) {
    const reward = state.mission.type === "repair" ? 260 : 210;
    state.score += Math.round(reward * state.scoreMultiplier);
    state.basketHp = Math.min(basketMax, state.basketHp + (state.mission.type === "repair" ? 10 : 6));
    state.missionCompletions += 1;
    state.recipes += 1;
    addBurstMeter(state.mission.type === "repair" ? 20 : 16);
    spawnCrumbs(state.mission.x, state.mission.y, 18, state.mission.type === "repair" ? "#f4b860" : "#35d7a8");
    hintText.textContent = `${state.mission.title} 완료! 레시피 +1`;
    setMissionWaveRule(true, state.mission.type);
    state.mission = null;
    state.nextMissionTimer = 18;
    return;
  }

  if (state.mission.timeLeft <= 0) {
    hintText.textContent = `${state.mission.title} 미션은 다음 영업에 다시 도전해요.`;
    setMissionWaveRule(false, state.mission.type);
    state.mission = null;
    state.nextMissionTimer = 14;
  }
}

function setMissionWaveRule(success, type) {
  if (success && type === "repair") {
    state.waveRule = { id: "warm-oven", label: "따끈한 오븐", fireMultiplier: 0.78, spawnMultiplier: 0.92, enemySpeedBonus: 0 };
  } else if (success && type === "carry") {
    state.waveRule = { id: "fresh-stock", label: "신선한 재료", fireMultiplier: 0.94, spawnMultiplier: 0.96, enemySpeedBonus: -6 };
    state.ingredientTimer = Math.min(state.ingredientTimer, 1.2);
  } else if (type === "repair") {
    state.waveRule = { id: "smoky-oven", label: "그을린 오븐", fireMultiplier: 1.12, spawnMultiplier: 1.08, enemySpeedBonus: 4 };
  } else {
    state.waveRule = { id: "late-box", label: "늦은 배송", fireMultiplier: 1, spawnMultiplier: 0.88, enemySpeedBonus: 12 };
  }
  state.waveRuleTimer = 13;
}

function updateCrumbs(delta) {
  for (const crumb of state.crumbs) {
    crumb.x += crumb.vx * delta;
    crumb.y += crumb.vy * delta;
    crumb.vy += 72 * delta;
    crumb.life -= delta;
  }

  state.crumbs = state.crumbs.filter((crumb) => crumb.life > 0);
}

function spawnCrumbs(x, y, count, color) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 92;
    state.crumbs.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.45 + Math.random() * 0.42,
      color,
      size: 3 + Math.random() * 4
    });
  }
}

function showUpgrade() {
  state.paused = true;
  const shuffled = [...upgrades].sort(() => Math.random() - 0.5).slice(0, 3);
  upgradeChoices.innerHTML = shuffled
    .map((upgrade) => `<button type="button" data-upgrade="${upgrade.id}"><span>${familyLabels[upgrade.family]}</span>${upgrade.title}<br><small>${upgrade.detail}</small></button>`)
    .join("");

  upgradeChoices.onclick = (event) => {
    const button = event.target.closest("[data-upgrade]");
    if (!button) {
      return;
    }

    const upgrade = upgrades.find((item) => item.id === button.dataset.upgrade);
    if (upgrade) {
      upgrade.apply(state);
      hintText.textContent = state.lastSynergy ? `${upgrade.title} / ${state.lastSynergy}` : `${upgrade.title} 업그레이드 완료`;
    }

    upgradeOverlay.hidden = true;
    state.paused = false;
  };

  upgradeOverlay.hidden = false;
}

function checkFinish() {
  if (state.basketHp <= 0) {
    finishGame(false);
    return;
  }

  if (state.timeLeft <= 0) {
    finishGame(true);
  }
}

function finishGame(won) {
  if (!state.active) {
    return;
  }

  state.active = false;
  state.paused = false;
  upgradeOverlay.hidden = true;

  const hpBonus = won ? Math.ceil(state.basketHp) * 18 : 0;
  state.score += hpBonus;
  const recipeGain = Math.max(1, Math.floor(state.score / 1400) + state.collectedIngredients + state.missionCompletions + (won ? 2 : 0));
  state.recipes += recipeGain;
  localStorage.setItem(recipeStorageKey, String(state.recipes));
  const newShelfItems = unlockShelfItems();
  saveProgress();

  if (state.score > state.bestScore) {
    state.bestScore = state.score;
    localStorage.setItem(bestScoreStorageKey, String(state.bestScore));
  }

  resultKicker.textContent = won ? "Bakery Complete" : "Bakery Closed";
  resultTitle.textContent = won ? "오늘 영업 성공" : "재료 바구니가 비었어요";
  const counterSummary = `카운터 ${state.counterBakeActivations}회/${state.counterBakeHits}타`;
  const burstSummary = `오븐 파동 ${state.burstActivations}회/${state.burstHits}타`;
  resultCopy.textContent = won
    ? `${state.selectedPresetName} 프리셋, 내구도 ${Math.ceil(state.basketHp)}, ${counterSummary}, ${burstSummary}, 미션 ${state.missionCompletions}회, 레시피 +${recipeGain}, 새 진열 ${newShelfItems}개입니다.`
    : `${state.selectedPresetName} 프리셋, 점수 ${state.score}점, ${counterSummary}, ${burstSummary}, 미션 ${state.missionCompletions}회, 레시피 +${recipeGain}, 새 진열 ${newShelfItems}개입니다.`;
  resultOverlay.hidden = false;
}

function updateHud() {
  scoreValue.textContent = state.score.toString();
  timeValue.textContent = Math.ceil(state.timeLeft).toString();
  basketValue.textContent = Math.ceil(state.basketHp).toString();
  waveValue.textContent = state.wave.toString();
  const unlocked = getUnlockedPresets({ recipes: state.recipes });
  presetButton.textContent = `프리셋: ${state.selectedPresetName}`;
  presetButton.disabled = unlocked.length < 2;
  presetButton.title = unlocked.length < 2 ? "레시피 4개부터 새 프리셋이 열립니다." : "다음 시작 프리셋으로 바꿉니다.";
  const burstReady = state.burstMeter >= burstMeterMax && state.burstCooldown <= 0 && state.active && !state.paused;
  const burstPercent = Math.floor(state.burstMeter);
  burstButton.disabled = !burstReady;
  burstButton.textContent = state.burstCooldown > 0
    ? `오븐 파동 ${Math.ceil(state.burstCooldown)}`
    : `오븐 파동 ${burstPercent}%`;
  burstButton.classList.toggle("is-ready", burstReady);
  burstButton.classList.toggle("is-cooling", state.burstCooldown > 0);
  burstButton.title = burstReady ? "가까운 주문을 밀어내는 오븐 파동을 터뜨립니다." : "주문을 막고 재료를 모으면 충전됩니다.";
}

function draw(timestamp) {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, height);
  drawBackground(timestamp);
  drawBakery();
  drawGuardPrepZone(timestamp);
  drawBasket();
  drawIngredient();
  drawMission();
  drawBubbles();
  drawEnemies(timestamp);
  drawPlayer(timestamp);
  drawCrumbs();
  drawPulses();
  drawRunOverlay();
  drawWaveCue();
}

function drawBackground(timestamp) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#fef3da");
  gradient.addColorStop(1, "#dbf8df");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(36, 48, 71, 0.06)";
  for (let x = 0; x <= width; x += 20) ctx.fillRect(x, 0, 1, height);
  for (let y = 0; y <= height; y += 20) ctx.fillRect(0, y, width, 1);

  const drift = (timestamp / 80) % 130;
  ctx.fillStyle = "rgba(255, 255, 255, 0.68)";
  for (let i = -1; i < 7; i += 1) {
    const x = i * 130 + drift;
    ctx.fillRect(x, 56, 58, 10);
    ctx.fillRect(x + 20, 44, 38, 10);
  }
}

function drawBakery() {
  ctx.fillStyle = "#f4b860";
  ctx.strokeStyle = "#243047";
  ctx.lineWidth = 4;
  roundRect(270, 124, 260, 112, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(250, 94, 300, 40);
  ctx.strokeRect(250, 94, 300, 40);
  ctx.fillStyle = "#e95b88";
  for (let x = 250; x < 550; x += 48) {
    ctx.fillRect(x, 94, 24, 40);
  }

  ctx.fillStyle = "#243047";
  ctx.fillRect(330, 166, 16, 16);
  ctx.fillRect(454, 166, 16, 16);
  ctx.fillStyle = "#fff1d6";
  ctx.fillRect(370, 194, 60, 12);

  drawPixelShelf();
}

function drawPixelShelf() {
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#243047";
  ctx.lineWidth = 3;
  roundRect(286, 222, 228, 34, 5);
  ctx.fill();
  ctx.stroke();

  shelfItems.forEach((item, index) => {
    const x = 304 + index * 40;
    const owned = state.shelfIds.has(item.id);
    ctx.fillStyle = owned ? item.color : "rgba(36, 48, 71, 0.16)";
    ctx.fillRect(x, 232, 24, owned ? 14 : 8);
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, 232, 24, owned ? 14 : 8);
    if (owned) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x + 5, 235, 5, 5);
      ctx.fillStyle = "#ffd85a";
      ctx.fillRect(x + 15, 229, 5, 5);
    }
  });
}

function drawBasket() {
  ctx.fillStyle = "#8fd6a3";
  ctx.strokeStyle = "#243047";
  ctx.lineWidth = 4;
  roundRect(basket.x - 54, basket.y - 28, 108, 56, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#fff1d6";
  ctx.fillRect(basket.x - 38, basket.y - 16, 76, 14);
  ctx.fillStyle = state.basketHp > 34 ? "#35d7a8" : "#e95b88";
  ctx.fillRect(basket.x - 38, basket.y + 8, Math.max(0, 76 * state.basketHp / basketMax), 10);

  if (state.basketShield > 0) {
    ctx.fillStyle = "#69c8ff";
    ctx.fillRect(basket.x - 38, basket.y + 22, Math.min(76, state.basketShield * 5), 6);
  }
}

function drawIngredient() {
  if (!state.ingredient) {
    return;
  }

  const pulse = Math.sin(state.ingredient.pulse) * 2;
  ctx.save();
  ctx.translate(state.ingredient.x, state.ingredient.y + pulse);
  ctx.fillStyle = "#fff1d6";
  ctx.strokeStyle = "#243047";
  ctx.lineWidth = 3;
  roundRect(-18, -15, 36, 30, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#35d7a8";
  ctx.fillRect(-13, -9, 10, 10);
  ctx.fillStyle = "#e95b88";
  ctx.fillRect(4, -9, 10, 10);
  ctx.fillStyle = "#f4b860";
  ctx.fillRect(-5, 4, 10, 8);
  ctx.restore();
}

function drawMission() {
  if (!state.mission) {
    return;
  }

  const ratio = Math.max(0, state.mission.timeLeft / 10);
  const progress = Math.min(1, state.mission.progress / state.mission.target);
  ctx.save();
  ctx.translate(state.mission.x, state.mission.y);
  ctx.fillStyle = state.mission.type === "repair" ? "#f4b860" : "#35d7a8";
  ctx.strokeStyle = "#243047";
  ctx.lineWidth = 3;
  roundRect(-28, -24, 56, 48, 6);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(-18, -10, 36, 7);
  ctx.fillStyle = "#243047";
  ctx.font = "900 10px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.textAlign = "center";
  ctx.fillText(state.mission.type === "repair" ? "FIX" : "BOX", 0, 16);
  ctx.restore();

  ctx.fillStyle = "rgba(36, 48, 71, 0.18)";
  ctx.fillRect(state.mission.x - 34, state.mission.y + 34, 68, 8);
  ctx.fillStyle = "#ffd85a";
  ctx.fillRect(state.mission.x - 34, state.mission.y + 34, 68 * progress, 8);
  ctx.strokeStyle = "#243047";
  ctx.lineWidth = 2;
  ctx.strokeRect(state.mission.x - 34, state.mission.y + 34, 68, 8);

  ctx.fillStyle = "#e95b88";
  ctx.fillRect(state.mission.x - 34, state.mission.y + 46, 68 * ratio, 5);
}

function drawGuardPrepZone(timestamp) {
  const cue = state.activeWaveHint;
  if (!cue || state.waveFocusTimer <= 0) {
    return;
  }

  const zone = getGuardZone(cue);
  if (!zone) {
    return;
  }

  const pulse = 0.5 + Math.sin(timestamp / 140) * 0.5;
  const armed = state.counterBakeWave === state.wave && state.counterBakeShots > 0;
  const used = state.counterBakeWave === state.wave && state.counterBakeShots <= 0;
  ctx.save();
  ctx.globalAlpha = armed ? 0.24 : used ? 0.12 : 0.16 + pulse * 0.12;
  ctx.fillStyle = armed ? "#ffd85a" : used ? "#526078" : cue.color;
  ctx.strokeStyle = armed ? "#ffd85a" : used ? "#526078" : cue.color;
  ctx.lineWidth = armed ? 5 : 3;
  ctx.setLineDash([10, 8]);
  roundRect(zone.x, zone.y, zone.w, zone.h, 8);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);

  const barWidth = zone.w - 24;
  const barX = zone.x + 12;
  const barY = zone.y + zone.h - 18;
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = "rgba(255, 255, 255, 0.84)";
  ctx.fillRect(barX, barY, barWidth, 8);
  ctx.fillStyle = armed ? "#ffd85a" : used ? "#526078" : "#35d7a8";
  ctx.fillRect(barX, barY, barWidth * (armed || used ? 1 : state.guardPrep), 8);
  ctx.strokeStyle = "#243047";
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, barY, barWidth, 8);

  ctx.fillStyle = "#243047";
  ctx.font = "900 11px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.textAlign = "center";
  ctx.fillText(armed ? "COUNTER READY" : used ? "COUNTER USED" : "PREP ZONE", zone.x + zone.w / 2, zone.y + 18);
  ctx.restore();
}

function drawPlayer(timestamp) {
  const player = state.player;
  const bob = Math.sin(player.bob) * 2;
  ctx.save();
  ctx.translate(player.x, player.y + bob);
  if (isCounterBakeActive()) {
    const pulse = 0.5 + Math.sin(timestamp / 70) * 0.5;
    ctx.globalAlpha = 0.28 + pulse * 0.18;
    ctx.fillStyle = "#ffd85a";
    ctx.beginPath();
    ctx.arc(0, -2, 38 + pulse * 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else if (state.guardTimer > 0 || state.guardPrep > 0.35) {
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = state.guardPrep > 0.35 ? "#35d7a8" : "#ffd85a";
    ctx.fillRect(-28, -34, 56 * Math.max(0.18, state.guardPrep || 1), 8);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = "#a7f1dd";
  ctx.strokeStyle = "#243047";
  ctx.lineWidth = 4;
  roundRect(-19, -22, 38, 44, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(-16, -34, 32, 14);
  ctx.strokeRect(-16, -34, 32, 14);
  ctx.fillStyle = "#243047";
  ctx.fillRect(-9, -8, 7, 7);
  ctx.fillRect(4, -8, 7, 7);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(-5, 10, 12, 4);
  ctx.restore();
}

function drawEnemies(timestamp) {
  for (const enemy of state.enemies) {
    const wobble = Math.sin(enemy.wobble + timestamp / 200) * 2;
    ctx.save();
    ctx.translate(enemy.x, enemy.y + wobble);
    ctx.fillStyle = enemy.color;
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 3;
    roundRect(-enemy.size, -enemy.size, enemy.size * 2, enemy.size * 2, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#243047";
    ctx.fillRect(-6, -4, 4, 4);
    ctx.fillRect(4, -4, 4, 4);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-7, 7, 14, 4);

    if (enemy.slowTimer > 0) {
      ctx.fillStyle = "#35d7a8";
      ctx.fillRect(-enemy.size + 3, enemy.size - 4, enemy.size * 2 - 6, 4);
    }

    if (enemy.shield > 0) {
      ctx.strokeStyle = "#69c8ff";
      ctx.lineWidth = 3;
      ctx.strokeRect(-enemy.size - 5, -enemy.size - 5, enemy.size * 2 + 10, enemy.size * 2 + 10);
    }

    ctx.fillStyle = "#e95b88";
    ctx.fillRect(-enemy.size, -enemy.size - 10, enemy.size * 2 * enemy.hp / enemy.maxHp, 4);
    ctx.restore();
  }
}

function drawBubbles() {
  for (const bubble of state.bubbles) {
    if (bubble.counterBake) {
      ctx.save();
      ctx.globalAlpha = 0.24;
      ctx.fillStyle = "#ffd85a";
      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, bubble.r + 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = bubble.counterBake ? "#fff1d6" : "#ffffff";
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = bubble.counterBake ? 3 : 2;
    ctx.beginPath();
    ctx.arc(bubble.x, bubble.y, bubble.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (bubble.counterBake) {
      ctx.fillStyle = "#ffd85a";
      ctx.fillRect(bubble.x - 3, bubble.y - bubble.r - 2, 6, 6);
    }
  }
}

function drawCrumbs() {
  for (const crumb of state.crumbs) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, crumb.life);
    ctx.fillStyle = crumb.color;
    ctx.fillRect(crumb.x, crumb.y, crumb.size, crumb.size);
    ctx.restore();
  }
}

function drawPulses() {
  for (const pulse of state.pulses) {
    const progress = 1 - pulse.life / 0.42;
    const radius = Math.min(pulse.maxRadius, pulse.radius);
    ctx.save();
    ctx.globalAlpha = Math.max(0, 0.5 - progress * 0.42);
    ctx.strokeStyle = pulse.color;
    ctx.lineWidth = 8 - progress * 4;
    ctx.beginPath();
    ctx.arc(pulse.x, pulse.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = Math.max(0, 0.18 - progress * 0.14);
    ctx.fillStyle = pulse.color;
    ctx.beginPath();
    ctx.arc(pulse.x, pulse.y, radius * 0.82, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawRunOverlay() {
  drawPanel(28, 28, 236, 96);
  ctx.fillStyle = "#526078";
  ctx.font = "900 10px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.fillText("BUILD", 46, 50);
  ctx.fillText("RECIPES", 178, 50);

  const families = ["oven", "bubble", "sugar", "basket"];
  for (let i = 0; i < families.length; i += 1) {
    const family = families[i];
    const x = 46 + i * 27;
    ctx.fillStyle = state.buildCounts[family] > 0 ? "#ffd85a" : "#ffffff";
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 2;
    ctx.fillRect(x, 66, 18, 18);
    ctx.strokeRect(x, 66, 18, 18);
    ctx.fillStyle = "#243047";
    ctx.font = "900 10px ui-monospace, SFMono-Regular, Consolas, monospace";
    ctx.fillText(String(state.buildCounts[family]), x + 6, 80);
  }

  ctx.fillStyle = "#243047";
  ctx.font = "900 20px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.fillText(String(state.recipes), 178, 80);
  ctx.font = "900 11px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.fillText(`PRESET ${state.selectedPresetName}`, 46, 108);

  drawPanel(width - 224, 28, 196, 76);
  ctx.fillStyle = "#526078";
  ctx.font = "900 10px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.fillText("BEST", width - 204, 50);
  ctx.fillText("ING", width - 100, 50);
  ctx.fillStyle = "#243047";
  ctx.font = "900 17px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.fillText(String(state.bestScore), width - 204, 78);
  ctx.fillText(String(state.collectedIngredients), width - 100, 78);

  drawPanel(width - 224, 112, 196, 96);
  ctx.fillStyle = "#526078";
  ctx.font = "900 10px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.fillText("SHELF", width - 204, 134);
  ctx.fillText("MISSION", width - 100, 134);
  ctx.fillStyle = "#243047";
  ctx.font = "900 16px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.fillText(`${state.shelfIds.size}/${shelfItems.length}`, width - 204, 158);
  ctx.fillText(state.mission ? `${Math.ceil(state.mission.timeLeft)}` : "--", width - 100, 158);
  ctx.fillStyle = "#526078";
  ctx.font = "900 10px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.fillText(state.waveRule ? `RULE ${state.waveRule.label} ${Math.ceil(state.waveRuleTimer)}` : "RULE --", width - 204, 184);
  ctx.fillText(getGuardStatusText(), width - 204, 200);
}

function getGuardStatusText() {
  if (isCounterBakeActive()) {
    return `COUNTER x${state.counterBakeShots}`;
  }
  if (state.counterBakeWave === state.wave) {
    return state.counterBakeShots > 0 ? "COUNTER READY" : "COUNTER USED";
  }
  if (state.guardPrep > 0) {
    return `PREP ${Math.round(state.guardPrep * 100)}%`;
  }
  return isGuardingRush() ? "GUARD ON" : getPassiveSummary(state.shelfPassive);
}

function drawWaveCue() {
  const upcomingWave = Math.min(5, state.wave + 1);
  const elapsed = roundSeconds - state.timeLeft;
  const secondsToNextWave = state.wave * 15 - elapsed;
  const isWarning = upcomingWave <= 5 && secondsToNextWave > 0 && secondsToNextWave <= 4;
  const cue = state.waveFocusTimer > 0 ? state.activeWaveHint : (isWarning ? state.nextWaveHint : null);
  if (!cue) {
    return;
  }

  const pulse = 0.5 + Math.sin(performance.now() / 120) * 0.5;
  ctx.save();
  ctx.globalAlpha = 0.92;
  drawPanel(296, 24, 208, 58);
  ctx.fillStyle = "#526078";
  ctx.font = "900 10px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.textAlign = "center";
  ctx.fillText(state.waveFocusTimer > 0 ? "ORDER RUSH" : "NEXT RUSH", 400, 44);
  ctx.fillStyle = "#243047";
  ctx.font = "900 16px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.fillText(cue.label, 400, 68);

  ctx.globalAlpha = 0.42 + pulse * 0.35;
  ctx.fillStyle = cue.color;
  ctx.strokeStyle = "#243047";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cue.x, cue.y);
  ctx.lineTo(cue.x + cue.dx * 44 - cue.dy * 16, cue.y + cue.dy * 44 + cue.dx * 16);
  ctx.lineTo(cue.x + cue.dx * 44 + cue.dy * 16, cue.y + cue.dy * 44 - cue.dx * 16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawPanel(x, y, w, h) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.86)";
  ctx.strokeStyle = "#243047";
  ctx.lineWidth = 3;
  roundRect(x, y, w, h, 6);
  ctx.fill();
  ctx.stroke();
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

function loadProgress() {
  try {
    const parsed = JSON.parse(localStorage.getItem(progressStorageKey) || "{}");
    const recipes = Math.max(Number(localStorage.getItem(recipeStorageKey) || 0), Number(parsed.recipes || 0));
    const shelfIds = new Set(
      Array.isArray(parsed.shelfIds)
        ? parsed.shelfIds.filter((id) => shelfItems.some((item) => item.id === id))
        : []
    );
    shelfItems.forEach((item) => {
      if (recipes >= item.cost) {
        shelfIds.add(item.id);
      }
    });

    const normalized = {
      recipes,
      shelfIds: [...shelfIds],
      selectedPresetId: typeof parsed.selectedPresetId === "string" ? parsed.selectedPresetId : "balanced"
    };
    localStorage.setItem(progressStorageKey, JSON.stringify(normalized));
    return normalized;
  } catch (error) {
    const recipes = Number(localStorage.getItem(recipeStorageKey) || 0);
    const normalized = {
      recipes,
      shelfIds: shelfItems.filter((item) => recipes >= item.cost).map((item) => item.id),
      selectedPresetId: "balanced"
    };
    localStorage.setItem(progressStorageKey, JSON.stringify(normalized));
    return normalized;
  }
}

function saveProgress() {
  const payload = {
    recipes: state.recipes,
    shelfIds: [...state.shelfIds],
    selectedPresetId: state.selectedPresetId || "balanced"
  };
  localStorage.setItem(progressStorageKey, JSON.stringify(payload));
}

function unlockShelfItems() {
  const before = state.shelfIds.size;
  shelfItems.forEach((item) => {
    if (state.recipes >= item.cost) {
      state.shelfIds.add(item.id);
    }
  });
  return state.shelfIds.size - before;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
