const canvas = document.getElementById("swarmCanvas");
const ctx = canvas.getContext("2d");
const scoreValue = document.getElementById("scoreValue");
const timeValue = document.getElementById("timeValue");
const snackValue = document.getElementById("snackValue");
const homeValue = document.getElementById("homeValue");
const hintText = document.getElementById("hintText");
const signalBadge = document.getElementById("signalBadge");
const restartButton = document.getElementById("restartButton");
const overlayRestartButton = document.getElementById("overlayRestartButton");
const resultOverlay = document.getElementById("resultOverlay");
const resultKicker = document.getElementById("resultKicker");
const resultTitle = document.getElementById("resultTitle");
const resultCopy = document.getElementById("resultCopy");
const prevLevelButton = document.getElementById("prevLevelButton");
const nextLevelButton = document.getElementById("nextLevelButton");
const stageLabel = document.getElementById("stageLabel");
const crewControls = document.getElementById("crewControls");
const editorButton = document.getElementById("editorButton");
const shareButton = document.getElementById("shareButton");
const loadCodeButton = document.getElementById("loadCodeButton");
const planLikeButton = document.getElementById("planLikeButton");

const width = 800;
const height = 520;
const agentCount = 24;
const maxSignals = 3;
const bestStarsStorageKey = "konpeitoSwarmBestStars:v1";
const progressStorageKey = "konpeitoSwarmProgress:v2";
const likedPlansStorageKey = "konpeitoSwarmLikedPlans:v1";
const colors = ["#e95b88", "#35d7a8", "#69c8ff", "#ffd85a", "#8f78ff", "#ff9a6c"];
const personalities = [
  { id: "quick", label: "빠름", speed: 1.18, target: 1.08, separation: 0.9, radius: 9 },
  { id: "shy", label: "소심", speed: 0.92, target: 0.9, separation: 1.35, radius: 10 },
  { id: "heavy", label: "묵직", speed: 0.82, target: 1.2, separation: 0.72, radius: 12 }
];
const crewModes = [
  { id: "mixed", label: "혼합", short: "MIX", unlockStars: 0, pattern: ["quick", "shy", "heavy"], bonusLabel: "조각 +4%", scoreMultiplier: 1.04, cleanBumpBonus: 0, homeTargetDelta: 0, timeBonus: 0 },
  { id: "quick", label: "빠른", short: "FAST", unlockStars: 3, pattern: ["quick", "quick", "shy"], bonusLabel: "시간 +4초", scoreMultiplier: 1, cleanBumpBonus: 0, homeTargetDelta: 0, timeBonus: 4 },
  { id: "careful", label: "조심", short: "SAFE", unlockStars: 5, pattern: ["shy", "shy", "heavy"], bonusLabel: "충돌 +6", scoreMultiplier: 1, cleanBumpBonus: 6, homeTargetDelta: 0, timeBonus: 0 },
  { id: "heavy", label: "묵직", short: "HOLD", unlockStars: 8, pattern: ["heavy", "heavy", "quick"], bonusLabel: "도착 -2", scoreMultiplier: 1, cleanBumpBonus: 0, homeTargetDelta: -2, timeBonus: 0 }
];
const levelLayouts = [
  {
    id: "ribbon-gate",
    name: "리본문",
    roundSeconds: 60,
    homeTarget: 18,
    cleanBumps: 18,
    timeStar: 12,
    start: { x: 70, y: 195, w: 82, h: 128 },
    initialSignals: [{ x: 140, y: 250 }],
    home: { x: 720, y: 424, r: 48 },
    obstacles: [
      { x: 260, y: 86, w: 46, h: 208 },
      { x: 414, y: 226, w: 48, h: 214 },
      { x: 558, y: 76, w: 48, h: 186 }
    ],
    snacks: [
      [190, 120], [342, 96], [512, 122], [660, 160],
      [194, 392], [332, 340], [514, 358], [634, 276],
      [126, 86], [302, 458], [498, 70], [704, 318]
    ]
  },
  {
    id: "berry-bend",
    name: "베리 굽이",
    roundSeconds: 62,
    homeTarget: 17,
    cleanBumps: 20,
    timeStar: 13,
    start: { x: 66, y: 76, w: 90, h: 110 },
    initialSignals: [{ x: 148, y: 126 }, { x: 360, y: 238 }],
    home: { x: 708, y: 126, r: 46 },
    obstacles: [
      { x: 224, y: 58, w: 46, h: 172 },
      { x: 358, y: 292, w: 52, h: 154 },
      { x: 516, y: 94, w: 50, h: 242 }
    ],
    snacks: [
      [148, 326], [216, 390], [330, 88], [348, 220],
      [466, 414], [482, 168], [610, 72], [632, 258],
      [690, 332], [112, 238], [290, 458], [738, 214]
    ]
  },
  {
    id: "sugar-pocket",
    name: "설탕 주머니",
    roundSeconds: 64,
    homeTarget: 18,
    cleanBumps: 22,
    timeStar: 14,
    start: { x: 66, y: 324, w: 96, h: 118 },
    initialSignals: [{ x: 130, y: 374 }, { x: 330, y: 260 }],
    home: { x: 704, y: 260, r: 50 },
    obstacles: [
      { x: 232, y: 142, w: 210, h: 44 },
      { x: 232, y: 336, w: 210, h: 44 },
      { x: 530, y: 70, w: 44, h: 168 },
      { x: 590, y: 292, w: 44, h: 158 }
    ],
    snacks: [
      [156, 112], [286, 94], [488, 106], [666, 92],
      [176, 250], [356, 260], [496, 260], [660, 260],
      [166, 456], [320, 430], [500, 430], [716, 410]
    ]
  },
  {
    id: "mint-bridge",
    name: "민트 다리",
    roundSeconds: 66,
    homeTarget: 18,
    cleanBumps: 24,
    timeStar: 14,
    start: { x: 60, y: 180, w: 88, h: 150 },
    initialSignals: [{ x: 140, y: 256 }, { x: 330, y: 124 }, { x: 520, y: 390 }],
    home: { x: 720, y: 424, r: 48 },
    obstacles: [
      { x: 190, y: 84, w: 44, h: 352 },
      { x: 356, y: 0, w: 52, h: 212 },
      { x: 356, y: 304, w: 52, h: 216 },
      { x: 560, y: 134, w: 44, h: 250 }
    ],
    snacks: [
      [116, 88], [286, 82], [480, 84], [672, 92],
      [286, 222], [476, 258], [684, 246], [116, 430],
      [286, 454], [480, 444], [662, 370], [720, 312]
    ]
  },
  {
    id: "star-maze",
    name: "별가루 미로",
    roundSeconds: 70,
    homeTarget: 19,
    cleanBumps: 26,
    timeStar: 16,
    start: { x: 62, y: 218, w: 96, h: 100 },
    initialSignals: [{ x: 142, y: 266 }, { x: 332, y: 116 }, { x: 522, y: 410 }],
    home: { x: 724, y: 260, r: 50 },
    obstacles: [
      { x: 248, y: 64, w: 44, h: 188 },
      { x: 248, y: 318, w: 44, h: 146 },
      { x: 420, y: 130, w: 46, h: 260 },
      { x: 590, y: 64, w: 44, h: 188 },
      { x: 590, y: 318, w: 44, h: 146 }
    ],
    snacks: [
      [150, 104], [334, 72], [506, 76], [700, 94],
      [158, 414], [340, 454], [506, 452], [704, 416],
      [334, 260], [506, 260], [682, 260], [148, 260]
    ]
  }
];

let state = createInitialState();
let animationFrame = 0;
let lastTimestamp = 0;

restartButton.addEventListener("click", startGame);
overlayRestartButton.addEventListener("click", startGame);
prevLevelButton.addEventListener("click", () => selectLevel(-1));
nextLevelButton.addEventListener("click", () => selectLevel(1));
editorButton.addEventListener("click", toggleEditor);
shareButton.addEventListener("click", sharePlan);
loadCodeButton.addEventListener("click", loadShareCode);
planLikeButton.addEventListener("click", likeCurrentPlan);
canvas.addEventListener("pointerdown", placeSignal);
canvas.addEventListener("pointermove", (event) => {
  if (event.buttons === 1 && state.active && !state.editorMode) {
    placeSignal(event);
  }
});

startGame();

function createInitialState() {
  const progress = loadProgress();
  const levelIndex = clamp(Number(progress.selectedLevelIndex || 0), 0, levelLayouts.length - 1);
  const level = levelLayouts[levelIndex];
  const crew = getSelectableCrew(progress.selectedCrewId, progress);
  const plannerPins = normalizePins(progress.plannerPins[level.id] || []);
  const signals = (plannerPins.length > 0 ? plannerPins : level.initialSignals).map((point) => ({
    x: point.x,
    y: point.y,
    age: 0
  }));
  const shareCode = buildCurrentShareCode(level.id, crew.id, plannerPins.length > 0 ? plannerPins : signals);
  const shareRecord = getShareRecord(progress, shareCode);
  const homeTarget = Math.max(12, level.homeTarget + Number(crew.homeTargetDelta || 0));
  const cleanBumps = level.cleanBumps + Number(crew.cleanBumpBonus || 0);

  return {
    active: false,
    score: 0,
    timeLeft: level.roundSeconds + Number(crew.timeBonus || 0),
    roundSeconds: level.roundSeconds + Number(crew.timeBonus || 0),
    levelIndex,
    level,
    crew,
    homeTarget,
    cleanBumps,
    scoreMultiplier: Number(crew.scoreMultiplier || 1),
    progress,
    shareCode,
    shareRecord,
    signal: { x: signals[signals.length - 1].x, y: signals[signals.length - 1].y },
    signals,
    plannerPins,
    editorMode: false,
    agents: [],
    snacks: [],
    homeCount: 0,
    collected: 0,
    bumpCount: 0,
    bestStars: Number(progress.levelStars[level.id] || 0),
    totalStars: getTotalStars(progress),
    pulse: 0
  };
}

function startGame() {
  state = createInitialState();
  state.active = true;
  state.agents = createAgents();
  state.snacks = createSnacks();
  state.homeCount = 0;
  state.collected = 0;
  resultOverlay.hidden = true;
  hintText.textContent = `${state.level.name} ${state.crew.label} 편성`;
  renderPlannerControls();
  lastTimestamp = performance.now();
  cancelAnimationFrame(animationFrame);
  animationFrame = requestAnimationFrame(tick);
}

function selectLevel(direction) {
  const progress = loadProgress();
  progress.selectedLevelIndex = (clamp(Number(progress.selectedLevelIndex || 0), 0, levelLayouts.length - 1) + direction + levelLayouts.length) % levelLayouts.length;
  saveProgressObject(progress);
  startGame();
}

function setCrewMode(crewId) {
  const progress = loadProgress();
  const crew = crewModes.find((mode) => mode.id === crewId);
  if (!crew || !isCrewUnlocked(crew, progress)) {
    return;
  }

  progress.selectedCrewId = crew.id;
  saveProgressObject(progress);
  startGame();
}

function createAgents() {
  const start = state.level.start;

  return Array.from({ length: agentCount }, (_, index) => {
    const personalityId = state.crew.pattern[index % state.crew.pattern.length];
    const personality = personalities.find((item) => item.id === personalityId) || personalities[0];
    return {
      x: start.x + Math.random() * start.w,
      y: start.y + Math.random() * start.h,
      vx: Math.random() * 20 - 10,
      vy: Math.random() * 20 - 10,
      r: personality.radius,
      personality,
      color: colors[index % colors.length],
      delivered: false,
      bumpTimer: 0,
      wobble: Math.random() * Math.PI * 2
    };
  });
}

function createSnacks() {
  return state.level.snacks.map(([x, y], index) => ({
    x,
    y,
    r: 10,
    color: colors[(index + 2) % colors.length],
    collected: false,
    spin: Math.random() * Math.PI * 2
  }));
}

function tick(timestamp) {
  const delta = Math.min(0.05, (timestamp - lastTimestamp) / 1000);
  lastTimestamp = timestamp;

  if (state.active) {
    state.timeLeft = Math.max(0, state.timeLeft - delta);
    updateSignals(delta);
    updateAgents(delta);
    collectSnacks();
    updateHomeCount();
    checkFinish();
  }

  draw(timestamp);
  updateHud();
  animationFrame = requestAnimationFrame(tick);
}

function placeSignal(event) {
  if (!state.active) {
    return;
  }

  const point = getCanvasPoint(event);
  if (!point) {
    return;
  }

  if (state.editorMode) {
    placePlannerPin(point.x, point.y);
    return;
  }

  addSignal(point.x, point.y);
}

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = width / rect.width;
  const scaleY = height / rect.height;
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;

  if (x < 20 || y < 20 || x > width - 20 || y > height - 20) {
    return null;
  }

  return { x, y };
}

function addSignal(x, y) {
  const lastSignal = state.signals[state.signals.length - 1];
  const farEnough = !lastSignal || Math.hypot(lastSignal.x - x, lastSignal.y - y) > 24;

  if (farEnough) {
    state.signals.push({ x, y, age: 0 });
    if (state.signals.length > maxSignals) {
      state.signals.shift();
    }
  } else if (lastSignal) {
    lastSignal.x = x;
    lastSignal.y = y;
    lastSignal.age = 0;
  }

  state.signal = { x, y };
  state.pulse = performance.now();
  hintText.textContent = `간식 신호 ${state.signals.length}/${maxSignals}`;
}

function placePlannerPin(x, y) {
  const lastPin = state.plannerPins[state.plannerPins.length - 1];
  const farEnough = !lastPin || Math.hypot(lastPin.x - x, lastPin.y - y) > 24;

  if (farEnough) {
    state.plannerPins.push({ x: Math.round(x), y: Math.round(y) });
    if (state.plannerPins.length > maxSignals) {
      state.plannerPins.shift();
    }
  } else if (lastPin) {
    lastPin.x = Math.round(x);
    lastPin.y = Math.round(y);
  }

  state.signals = state.plannerPins.map((pin) => ({ x: pin.x, y: pin.y, age: 0 }));
  state.signal = { x: Math.round(x), y: Math.round(y) };
  state.pulse = performance.now();
  state.progress.plannerPins[state.level.id] = state.plannerPins.map((pin) => ({ x: pin.x, y: pin.y }));
  saveProgressObject(state.progress);
  hintText.textContent = `핀 ${state.plannerPins.length}/${maxSignals}`;
  renderPlannerControls();
}

function toggleEditor() {
  state.editorMode = !state.editorMode;
  editorButton.classList.toggle("is-selected", state.editorMode);
  hintText.textContent = state.editorMode ? "핀 편집 모드" : `${state.level.name} ${state.crew.label} 편성`;
  renderPlannerControls();
}

function sharePlan() {
  const points = state.plannerPins.length > 0 ? state.plannerPins : state.signals;
  const code = buildCurrentShareCode(state.level.id, state.crew.id, points);
  state.shareCode = code;
  state.shareRecord = getShareRecord(state.progress, code);
  state.shareRecord.shares += 1;
  state.progress.shareStats[code] = state.shareRecord;
  state.progress.lastShareCode = code;
  saveProgressObject(state.progress);
  renderPlannerControls();

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(code).then(() => {
      hintText.textContent = "공유 코드가 복사됐습니다.";
    }).catch(() => {
      window.prompt("공유 코드", code);
    });
  } else {
    window.prompt("공유 코드", code);
  }
}

function likeCurrentPlan() {
  const code = buildCurrentShareCode(state.level.id, state.crew.id, state.plannerPins.length > 0 ? state.plannerPins : state.signals);
  const liked = getLikedPlans();

  if (liked.has(code)) {
    hintText.textContent = "이미 응원한 배치입니다.";
    return;
  }

  state.shareCode = code;
  state.shareRecord = getShareRecord(state.progress, code);
  state.shareRecord.likes += 1;
  state.progress.shareStats[code] = state.shareRecord;
  saveProgressObject(state.progress);
  liked.add(code);
  saveLikedPlans(liked);
  hintText.textContent = `이 배치를 응원했습니다. ${state.shareRecord.likes}개`;
  renderPlannerControls();
}

function loadShareCode() {
  const code = window.prompt("공유 코드 입력");
  if (!code) {
    return;
  }

  try {
    const payload = decodeShareCode(code.trim());
    const levelIndex = levelLayouts.findIndex((level) => level.id === payload.l);
    if (levelIndex < 0) {
      throw new Error("unknown level");
    }

    const progress = loadProgress();
    const crew = getSelectableCrew(payload.c, progress);
    progress.selectedLevelIndex = levelIndex;
    progress.selectedCrewId = crew.id;
    progress.plannerPins[levelLayouts[levelIndex].id] = normalizePins((payload.p || []).map(([x, y]) => ({ x, y })));
    progress.lastShareCode = code.trim();
    progress.activeShareCode = code.trim();
    saveProgressObject(progress);
    startGame();
    hintText.textContent = "공유 코드를 불러왔습니다.";
  } catch (error) {
    hintText.textContent = "공유 코드를 읽지 못했습니다.";
  }
}

function updateSignals(delta) {
  for (const signal of state.signals) {
    signal.age += delta;
  }

  if (state.signals.length > 1 && !state.editorMode) {
    state.signals = state.signals.filter((signal, index) => index === state.signals.length - 1 || signal.age < 16);
  }
}

function updateAgents(delta) {
  const activeAgents = state.agents.filter((agent) => !agent.delivered);

  for (const agent of activeAgents) {
    let ax = 0;
    let ay = 0;

    agent.bumpTimer = Math.max(0, agent.bumpTimer - delta);
    const target = getNearestSignal(agent);
    const targetForce = forceToward(agent, target.x, target.y, 38 * agent.personality.target);
    ax += targetForce.x;
    ay += targetForce.y;

    for (const other of activeAgents) {
      if (agent === other) {
        continue;
      }

      const dx = agent.x - other.x;
      const dy = agent.y - other.y;
      const distSq = dx * dx + dy * dy;
      const comfort = 30 + agent.personality.separation * 10;

      if (distSq > 0 && distSq < comfort * comfort) {
        const dist = Math.sqrt(distSq);
        const push = (comfort - dist) * 0.72;
        ax += (dx / dist) * push;
        ay += (dy / dist) * push;

        if (dist < 15 && agent.bumpTimer <= 0) {
          state.bumpCount += 1;
          agent.bumpTimer = 1.2;
        }
      }
    }

    for (const obstacle of state.level.obstacles) {
      const closestX = clamp(agent.x, obstacle.x, obstacle.x + obstacle.w);
      const closestY = clamp(agent.y, obstacle.y, obstacle.y + obstacle.h);
      const dx = agent.x - closestX;
      const dy = agent.y - closestY;
      const distSq = dx * dx + dy * dy;

      if (distSq < 30 * 30) {
        const dist = Math.max(1, Math.sqrt(distSq));
        const push = (30 - dist) * 2.4;
        ax += (dx / dist) * push;
        ay += (dy / dist) * push;

        if (agent.bumpTimer <= 0) {
          state.bumpCount += 1;
          agent.bumpTimer = 1.2;
        }
      }
    }

    const maxSpeed = 90 * agent.personality.speed;
    agent.vx = clamp((agent.vx + ax * delta) * 0.94, -maxSpeed, maxSpeed);
    agent.vy = clamp((agent.vy + ay * delta) * 0.94, -maxSpeed, maxSpeed);
    agent.x += agent.vx * delta;
    agent.y += agent.vy * delta;
    agent.wobble += delta * 5;

    bounceBounds(agent);
  }
}

function getNearestSignal(agent) {
  let nearest = state.signals[0] || state.signal;
  let nearestDistance = Infinity;

  for (const signal of state.signals) {
    const distance = Math.hypot(agent.x - signal.x, agent.y - signal.y) + signal.age * 4;
    if (distance < nearestDistance) {
      nearest = signal;
      nearestDistance = distance;
    }
  }

  return nearest;
}

function forceToward(agent, x, y, strength) {
  const dx = x - agent.x;
  const dy = y - agent.y;
  const distance = Math.max(1, Math.hypot(dx, dy));

  return {
    x: (dx / distance) * strength,
    y: (dy / distance) * strength
  };
}

function bounceBounds(agent) {
  if (agent.x < 22) {
    agent.x = 22;
    agent.vx = Math.abs(agent.vx) * 0.7;
  }

  if (agent.x > width - 22) {
    agent.x = width - 22;
    agent.vx = -Math.abs(agent.vx) * 0.7;
  }

  if (agent.y < 22) {
    agent.y = 22;
    agent.vy = Math.abs(agent.vy) * 0.7;
  }

  if (agent.y > height - 22) {
    agent.y = height - 22;
    agent.vy = -Math.abs(agent.vy) * 0.7;
  }
}

function collectSnacks() {
  for (const snack of state.snacks) {
    if (snack.collected) {
      continue;
    }

    const touched = state.agents.some((agent) => !agent.delivered && Math.hypot(agent.x - snack.x, agent.y - snack.y) < 24);

    if (touched) {
      snack.collected = true;
      state.collected += 1;
      state.score += Math.round((180 + state.collected * 25) * state.scoreMultiplier);
      state.timeLeft = Math.min(state.roundSeconds + 10, state.timeLeft + 1.1);
      hintText.textContent = `조각 ${state.collected}개`;
    }
  }
}

function updateHomeCount() {
  let count = 0;

  for (const agent of state.agents) {
    const inHome = Math.hypot(agent.x - state.level.home.x, agent.y - state.level.home.y) < state.level.home.r;

    if (inHome) {
      count += 1;
      if (!agent.delivered && state.collected === state.snacks.length) {
        agent.delivered = true;
        state.score += Math.round(90 * state.scoreMultiplier);
      }
    }
  }

  state.homeCount = count;
}

function checkFinish() {
  if (state.collected === state.snacks.length && state.agents.filter((agent) => agent.delivered).length >= state.homeTarget) {
    finishGame(true);
    return;
  }

  if (state.timeLeft <= 0) {
    finishGame(false);
  }
}

function finishGame(won) {
  state.active = false;
  const delivered = state.agents.filter((agent) => agent.delivered).length;
  const timeBonus = won ? Math.ceil(state.timeLeft) * 20 : 0;
  const stars = evaluateStars(won, delivered);
  state.score += timeBonus;
  recordShareResult(won, stars);

  if (stars > state.bestStars) {
    state.bestStars = stars;
    state.progress.levelStars[state.level.id] = stars;
    localStorage.setItem(bestStarsStorageKey, String(Math.max(Number(localStorage.getItem(bestStarsStorageKey) || 0), stars)));
  }

  state.progress.selectedLevelIndex = state.levelIndex;
  state.progress.selectedCrewId = state.crew.id;
  saveProgressObject(state.progress);
  state.totalStars = getTotalStars(state.progress);
  renderPlannerControls();

  resultKicker.textContent = won ? "Parade Complete" : "Parade Paused";
  resultTitle.textContent = won ? "달콤한 행진 성공" : "다시 행진해볼까요";
  resultCopy.textContent = won
    ? `${state.level.name} ${state.crew.label} 편성, 별 ${stars}/3, 도착 ${delivered}개, 응원 ${state.shareRecord.likes}개입니다.`
    : `${state.level.name} 조각 ${state.collected}/${state.snacks.length}개, 도착 ${delivered}/${state.homeTarget}개, 부딪힘 ${state.bumpCount}회입니다.`;
  resultOverlay.hidden = false;
}

function evaluateStars(won, delivered) {
  if (!won) {
    return 0;
  }

  const deliveryStar = delivered >= state.homeTarget ? 1 : 0;
  const cleanStar = state.bumpCount <= state.cleanBumps ? 1 : 0;
  const timeStar = state.timeLeft >= state.level.timeStar ? 1 : 0;
  return deliveryStar + cleanStar + timeStar;
}

function updateHud() {
  const delivered = state.agents.filter((agent) => agent.delivered).length;
  scoreValue.textContent = state.score.toString();
  timeValue.textContent = Math.ceil(state.timeLeft).toString();
  snackValue.textContent = `${state.collected}/${state.snacks.length}`;
  homeValue.textContent = `${delivered}/${state.homeTarget}`;
  signalBadge.textContent = state.editorMode
    ? `pins ${state.plannerPins.length}/${maxSignals}`
    : `stage ${state.levelIndex + 1}/${levelLayouts.length} · signals ${state.signals.length}/${maxSignals}`;
  stageLabel.textContent = `${state.levelIndex + 1}/${levelLayouts.length}`;
}

function renderPlannerControls() {
  const totalStars = getTotalStars(state.progress);
  stageLabel.textContent = `${state.levelIndex + 1}/${levelLayouts.length}`;
  editorButton.classList.toggle("is-selected", state.editorMode);
  editorButton.setAttribute("aria-pressed", String(state.editorMode));
  crewControls.innerHTML = crewModes.map((mode) => {
    const unlocked = isCrewUnlocked(mode, state.progress);
    const selected = mode.id === state.crew.id;
    const label = unlocked ? mode.label : `${mode.unlockStars}별`;
    return `<button class="crew-button${selected ? " is-selected" : ""}" type="button" data-crew="${mode.id}" ${unlocked ? "" : "disabled"}>${label}</button>`;
  }).join("");

  for (const button of crewControls.querySelectorAll("[data-crew]")) {
    button.addEventListener("click", () => setCrewMode(button.dataset.crew));
  }

  shareButton.title = state.progress.lastShareCode ? state.progress.lastShareCode : "현재 핀 배치 공유";
  state.shareCode = buildCurrentShareCode(state.level.id, state.crew.id, state.plannerPins.length > 0 ? state.plannerPins : state.signals);
  state.shareRecord = getShareRecord(state.progress, state.shareCode);
  const liked = getLikedPlans().has(state.shareCode);
  planLikeButton.textContent = liked ? `응원 ${state.shareRecord.likes}` : `응원 ${state.shareRecord.likes}`;
  planLikeButton.classList.toggle("is-selected", liked);
  planLikeButton.title = liked ? "이미 응원한 배치입니다." : "이 핀 배치를 한 번 응원합니다.";
  signalBadge.textContent = `stars ${totalStars}/15`;
}

function buildCurrentShareCode(levelId, crewId, points) {
  return encodeShareCode({
    v: 1,
    l: levelId,
    c: crewId,
    p: normalizePins(points).slice(-maxSignals).map((point) => [Math.round(point.x), Math.round(point.y)])
  });
}

function getShareRecord(progress, code) {
  progress.shareStats = typeof progress.shareStats === "object" && progress.shareStats ? progress.shareStats : {};
  const existing = progress.shareStats[code] || {};
  const record = {
    plays: clamp(Number(existing.plays || 0), 0, 9999),
    wins: clamp(Number(existing.wins || 0), 0, 9999),
    bestStars: clamp(Number(existing.bestStars || 0), 0, 3),
    likes: clamp(Number(existing.likes || 0), 0, 9999),
    shares: clamp(Number(existing.shares || 0), 0, 9999)
  };
  progress.shareStats[code] = record;
  return record;
}

function recordShareResult(won, stars) {
  state.shareCode = buildCurrentShareCode(state.level.id, state.crew.id, state.plannerPins.length > 0 ? state.plannerPins : state.signals);
  const record = getShareRecord(state.progress, state.shareCode);
  record.plays += 1;
  record.wins += won ? 1 : 0;
  record.bestStars = Math.max(record.bestStars, stars);
  state.progress.shareStats[state.shareCode] = record;
  state.shareRecord = record;
  saveProgressObject(state.progress);
}

function getLikedPlans() {
  try {
    const parsed = JSON.parse(localStorage.getItem(likedPlansStorageKey) || "[]");
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch (error) {
    return new Set();
  }
}

function saveLikedPlans(liked) {
  localStorage.setItem(likedPlansStorageKey, JSON.stringify([...liked].slice(-120)));
}

function getPinDiff() {
  if (!state.plannerPins.length) {
    return null;
  }

  const hints = normalizePins(state.level.initialSignals);
  const total = state.plannerPins.reduce((sum, pin, index) => {
    const hint = hints[index] || hints[hints.length - 1] || pin;
    return sum + Math.hypot(pin.x - hint.x, pin.y - hint.y);
  }, 0);
  return Math.round(total / state.plannerPins.length);
}

function draw(timestamp) {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, height);
  drawBackground(timestamp);
  drawObstacles();
  drawHome(timestamp);
  drawSnacks(timestamp);
  drawSignal(timestamp);
  drawHintPins();
  drawPlannerPins();
  drawAgents(timestamp);
  drawRunOverlay();
}

function drawBackground(timestamp) {
  const drift = (timestamp / 80) % 80;
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, state.levelIndex % 2 === 0 ? "#f8e8ff" : "#fff0d9");
  gradient.addColorStop(1, state.levelIndex % 2 === 0 ? "#d9fbff" : "#e2fff4");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(36, 48, 71, 0.06)";
  for (let x = -80 + drift; x < width; x += 40) {
    ctx.fillRect(x, 0, 2, height);
  }

  for (let y = 0; y < height; y += 40) {
    ctx.fillRect(0, y, width, 2);
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
  ctx.fillRect(34, 54, 82, 12);
  ctx.fillRect(56, 42, 54, 12);
  ctx.fillRect(620, 46, 104, 12);
  ctx.fillRect(642, 34, 60, 12);
}

function drawObstacles() {
  for (const obstacle of state.level.obstacles) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 4;
    ctx.strokeRect(obstacle.x + 2, obstacle.y + 2, obstacle.w - 4, obstacle.h - 4);
    ctx.fillStyle = "rgba(53, 215, 168, 0.18)";
    for (let y = obstacle.y + 12; y < obstacle.y + obstacle.h - 8; y += 18) {
      ctx.fillRect(obstacle.x + 8, y, obstacle.w - 16, 6);
    }
  }
}

function drawHome(timestamp) {
  const home = state.level.home;
  const pulse = 1 + Math.sin(timestamp / 220) * 0.05;
  ctx.save();
  ctx.translate(home.x, home.y);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = "#ffd85a";
  ctx.beginPath();
  ctx.arc(0, 0, home.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#243047";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(-28, -10, 56, 36);
  ctx.fillStyle = "#e95b88";
  ctx.fillRect(-22, -4, 44, 10);
  ctx.restore();
}

function drawSnacks(timestamp) {
  for (const snack of state.snacks) {
    if (snack.collected) {
      continue;
    }

    snack.spin += 0.035;
    drawStar(snack.x, snack.y + Math.sin(timestamp / 240 + snack.spin) * 3, snack.r, snack.color, snack.spin);
  }
}

function drawSignal(timestamp) {
  const age = timestamp - state.pulse;
  const pulse = age < 550 ? 1 + (1 - age / 550) * 0.7 : 1;

  for (let i = 0; i < state.signals.length; i += 1) {
    const signal = state.signals[i];
    const alpha = state.editorMode ? 0.95 : Math.max(0.45, 1 - signal.age / 18);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(signal.x, signal.y);
    ctx.scale(i === state.signals.length - 1 ? pulse : 1, i === state.signals.length - 1 ? pulse : 1);
    drawStar(0, 0, 16 - i * 2, colors[(i + 3) % colors.length], timestamp / 350 + i);
    ctx.strokeStyle = "rgba(36, 48, 71, 0.34)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 32 - i * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#243047";
    ctx.font = "900 12px ui-monospace, SFMono-Regular, Consolas, monospace";
    ctx.fillText(String(i + 1), -4, 4);
    ctx.restore();
  }
}

function drawHintPins() {
  if (!state.editorMode && !state.plannerPins.length) {
    return;
  }

  const hints = normalizePins(state.level.initialSignals);
  if (!hints.length) {
    return;
  }

  ctx.save();
  ctx.globalAlpha = state.editorMode ? 0.72 : 0.36;
  ctx.setLineDash([7, 7]);
  ctx.strokeStyle = "#ffd85a";
  ctx.lineWidth = 4;
  drawPinRoute(hints);

  for (let i = 0; i < hints.length; i += 1) {
    const pin = hints[i];
    ctx.fillStyle = "#fff6b8";
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pin.x, pin.y, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#243047";
    ctx.font = "900 12px ui-monospace, SFMono-Regular, Consolas, monospace";
    ctx.fillText(`H${i + 1}`, pin.x - 9, pin.y + 4);
  }
  ctx.restore();
}

function drawPlannerPins() {
  if (!state.plannerPins.length || (!state.editorMode && state.active)) {
    return;
  }

  ctx.save();
  ctx.setLineDash([8, 6]);
  ctx.strokeStyle = "#243047";
  ctx.lineWidth = 3;
  drawPinRoute(state.plannerPins);
  for (let i = 0; i < state.plannerPins.length; i += 1) {
    const pin = state.plannerPins[i];
    ctx.beginPath();
    ctx.arc(pin.x, pin.y, 42, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(pin.x - 13, pin.y - 32, 26, 20);
    ctx.fillStyle = "#243047";
    ctx.font = "900 13px ui-monospace, SFMono-Regular, Consolas, monospace";
    ctx.fillText(`P${i + 1}`, pin.x - 9, pin.y - 17);
  }
  ctx.restore();
}

function drawPinRoute(points) {
  if (points.length < 2) {
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
}

function drawAgents(timestamp) {
  for (const agent of state.agents) {
    if (agent.delivered) {
      continue;
    }

    const wobble = Math.sin(agent.wobble + timestamp / 280) * 0.08;
    drawCrewAura(agent, timestamp);
    drawStar(agent.x, agent.y, agent.r, agent.color, wobble);
  }
}

function drawCrewAura(agent, timestamp) {
  ctx.save();
  ctx.globalAlpha = 0.62;
  if (state.crew.id === "quick") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(agent.x - agent.vx * 0.08, agent.y - agent.vy * 0.08, 8, 4);
    ctx.fillRect(agent.x - agent.vx * 0.14, agent.y - agent.vy * 0.14, 5, 3);
  } else if (state.crew.id === "careful") {
    ctx.strokeStyle = "#69c8ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(agent.x, agent.y, agent.r + 5 + Math.sin(timestamp / 180 + agent.wobble) * 2, 0, Math.PI * 2);
    ctx.stroke();
  } else if (state.crew.id === "heavy") {
    ctx.fillStyle = "rgba(36, 48, 71, 0.18)";
    ctx.fillRect(agent.x - agent.r, agent.y + agent.r + 3, agent.r * 2, 5);
  } else {
    ctx.fillStyle = "#ffd85a";
    ctx.fillRect(agent.x + agent.r + 2, agent.y - agent.r, 4, 4);
  }
  ctx.restore();
}

function drawRunOverlay() {
  drawPanel(28, 28, 206, 94);
  ctx.fillStyle = "#526078";
  ctx.font = "900 10px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.fillText("BEST", 48, 50);
  ctx.fillText("BUMPS", 126, 50);

  for (let i = 0; i < 3; i += 1) {
    drawStar(52 + i * 22, 76, 8, i < state.bestStars ? "#ffd85a" : "#ffffff", 0);
  }

  ctx.fillStyle = "#243047";
  ctx.font = "900 18px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.fillText(String(state.bumpCount), 126, 80);
  ctx.fillStyle = "#526078";
  ctx.font = "900 10px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.fillText(`CLEAN ${state.cleanBumps}`, 48, 106);
  ctx.fillText(getPinDiff() === null ? "DIFF HINT" : `DIFF ${getPinDiff()}`, 126, 106);

  drawPanel(width - 244, 28, 216, 94);
  ctx.fillStyle = "#526078";
  ctx.font = "900 10px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.fillText("STAGE", width - 224, 50);
  ctx.fillText("CREW", width - 146, 50);
  ctx.fillText("PINS", width - 76, 50);
  ctx.fillStyle = "#243047";
  ctx.font = "900 16px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.fillText(`${state.levelIndex + 1}/${levelLayouts.length}`, width - 224, 80);
  ctx.fillText(state.crew.short, width - 146, 80);
  ctx.fillText(`${state.signals.length}`, width - 76, 80);
  ctx.fillStyle = "#526078";
  ctx.font = "900 10px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.fillText(`BONUS ${state.crew.bonusLabel}`, width - 224, 106);
  ctx.fillText(`PLAN ${state.shareRecord.wins}/${state.shareRecord.plays} · ${state.shareRecord.likes}`, width - 118, 106);
}

function drawPanel(x, y, w, h) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.84)";
  ctx.strokeStyle = "#243047";
  ctx.lineWidth = 3;
  roundRect(x, y, w, h, 6);
  ctx.fill();
  ctx.stroke();
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
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(-3, -3, 6, 6);
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

function loadProgress() {
  const base = {
    selectedLevelIndex: 0,
    selectedCrewId: "mixed",
    levelStars: {},
    plannerPins: {},
    lastShareCode: "",
    activeShareCode: "",
    shareStats: {}
  };

  try {
    const parsed = JSON.parse(localStorage.getItem(progressStorageKey) || "{}");
    const progress = {
      ...base,
      ...parsed,
      levelStars: typeof parsed.levelStars === "object" && parsed.levelStars ? parsed.levelStars : {},
      plannerPins: typeof parsed.plannerPins === "object" && parsed.plannerPins ? parsed.plannerPins : {},
      shareStats: typeof parsed.shareStats === "object" && parsed.shareStats ? parsed.shareStats : {}
    };
    const legacyBest = Number(localStorage.getItem(bestStarsStorageKey) || 0);
    if (legacyBest > 0 && !progress.levelStars[levelLayouts[0].id]) {
      progress.levelStars[levelLayouts[0].id] = clamp(legacyBest, 0, 3);
    }

    progress.selectedLevelIndex = clamp(Number(progress.selectedLevelIndex || 0), 0, levelLayouts.length - 1);
    progress.lastShareCode = typeof progress.lastShareCode === "string" ? progress.lastShareCode : "";
    progress.activeShareCode = typeof progress.activeShareCode === "string" ? progress.activeShareCode : "";
    for (const level of levelLayouts) {
      progress.levelStars[level.id] = clamp(Number(progress.levelStars[level.id] || 0), 0, 3);
      progress.plannerPins[level.id] = normalizePins(progress.plannerPins[level.id] || []);
    }
    for (const [code, record] of Object.entries(progress.shareStats)) {
      progress.shareStats[code] = {
        plays: clamp(Number(record?.plays || 0), 0, 9999),
        wins: clamp(Number(record?.wins || 0), 0, 9999),
        bestStars: clamp(Number(record?.bestStars || 0), 0, 3),
        likes: clamp(Number(record?.likes || 0), 0, 9999),
        shares: clamp(Number(record?.shares || 0), 0, 9999)
      };
    }

    progress.selectedCrewId = getSelectableCrew(progress.selectedCrewId, progress).id;
    saveProgressObject(progress);
    return progress;
  } catch (error) {
    saveProgressObject(base);
    return base;
  }
}

function saveProgressObject(progress) {
  localStorage.setItem(progressStorageKey, JSON.stringify(progress));
}

function getTotalStars(progress) {
  return levelLayouts.reduce((sum, level) => sum + clamp(Number(progress.levelStars[level.id] || 0), 0, 3), 0);
}

function getSelectableCrew(crewId, progress) {
  const selected = crewModes.find((mode) => mode.id === crewId) || crewModes[0];
  return isCrewUnlocked(selected, progress) ? selected : crewModes[0];
}

function isCrewUnlocked(mode, progress) {
  return getTotalStars(progress) >= mode.unlockStars;
}

function normalizePins(points) {
  if (!Array.isArray(points)) {
    return [];
  }

  return points
    .slice(0, maxSignals)
    .map((point) => {
      if (Array.isArray(point)) {
        return { x: Number(point[0]), y: Number(point[1]) };
      }
      return { x: Number(point.x), y: Number(point.y) };
    })
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    .map((point) => ({
      x: Math.round(clamp(point.x, 24, width - 24)),
      y: Math.round(clamp(point.y, 24, height - 24))
    }));
}

function encodeShareCode(payload) {
  const json = JSON.stringify(payload);
  return `KSP1-${btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}

function decodeShareCode(code) {
  const body = code.startsWith("KSP1-") ? code.slice(5) : code;
  const padded = body.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((body.length + 3) % 4);
  return JSON.parse(atob(padded));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
