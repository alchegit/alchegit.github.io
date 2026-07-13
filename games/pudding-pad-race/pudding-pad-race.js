const canvas = document.getElementById("raceCanvas");
const ctx = canvas.getContext("2d");
const scoreValue = document.getElementById("scoreValue");
const timeValue = document.getElementById("timeValue");
const lapValue = document.getElementById("lapValue");
const gateValue = document.getElementById("gateValue");
const hintText = document.getElementById("hintText");
const trackButton = document.getElementById("trackButton");
const flavorButton = document.getElementById("flavorButton");
const restartButton = document.getElementById("restartButton");
const overlayRestartButton = document.getElementById("overlayRestartButton");
const resultOverlay = document.getElementById("resultOverlay");
const resultKicker = document.getElementById("resultKicker");
const resultTitle = document.getElementById("resultTitle");
const resultCopy = document.getElementById("resultCopy");
const controlButtons = Array.from(document.querySelectorAll("[data-control]"));

const bestTimeStorageKey = "puddingPadRaceBestTime:v1";
const starStorageKey = "puddingPadRaceStars:v1";
const progressStorageKey = "puddingPadRaceProgress:v2";
const width = 800;
const height = 520;
const roundSeconds = 75;
const totalLaps = 3;
const center = { x: 400, y: 260 };
const trackLayouts = [
  {
    id: "pillow-loop",
    name: "쿠션 루프",
    rx: 270,
    ry: 154,
    outer: 1.16,
    inner: 0.58,
    gates: [
      { angle: -0.06, color: "#ffd85a", name: "커스터드" },
      { angle: 1.5, color: "#e95b88", name: "딸기" },
      { angle: 3.13, color: "#35d7a8", name: "민트" },
      { angle: 4.7, color: "#8f78ff", name: "포도" }
    ]
  },
  {
    id: "berry-bend",
    name: "베리 헤어핀",
    rx: 248,
    ry: 176,
    outer: 1.14,
    inner: 0.53,
    gates: [
      { angle: 0.18, color: "#e95b88", name: "베리" },
      { angle: 1.24, color: "#ffd85a", name: "크림" },
      { angle: 2.92, color: "#69c8ff", name: "소다" },
      { angle: 4.35, color: "#35d7a8", name: "허브" }
    ]
  },
  {
    id: "mint-wave",
    name: "민트 물결",
    rx: 286,
    ry: 132,
    outer: 1.2,
    inner: 0.62,
    gates: [
      { angle: -0.3, color: "#35d7a8", name: "민트" },
      { angle: 1.86, color: "#8f78ff", name: "라벤더" },
      { angle: 3.0, color: "#ffd85a", name: "레몬" },
      { angle: 5.0, color: "#e95b88", name: "잼" }
    ]
  },
  {
    id: "grape-pocket",
    name: "포도 포켓",
    rx: 232,
    ry: 150,
    outer: 1.22,
    inner: 0.47,
    gates: [
      { angle: 0.0, color: "#8f78ff", name: "포도" },
      { angle: 1.7, color: "#69c8ff", name: "하늘" },
      { angle: 3.35, color: "#ffd85a", name: "버터" },
      { angle: 4.65, color: "#e95b88", name: "베리" }
    ]
  },
  {
    id: "soda-sprint",
    name: "소다 스프린트",
    rx: 300,
    ry: 166,
    outer: 1.1,
    inner: 0.66,
    gates: [
      { angle: 0.32, color: "#69c8ff", name: "소다" },
      { angle: 1.38, color: "#35d7a8", name: "라임" },
      { angle: 3.02, color: "#e95b88", name: "베리" },
      { angle: 4.82, color: "#ffd85a", name: "슈가" }
    ]
  }
];
const flavorMods = [
  { id: "custard", name: "커스터드", color: "#ffd66e", accel: 1.06, turn: 0.98, grip: 1, unlockStars: 0, mission: "완주", missionCheck: (state) => state.lap >= totalLaps },
  { id: "berry", name: "딸기", color: "#e95b88", accel: 0.96, turn: 1.12, grip: 0.95, unlockStars: 4, mission: "콤보 x7", missionCheck: (state) => state.bestGateCombo >= 7 },
  { id: "mint", name: "민트", color: "#35d7a8", accel: 1, turn: 1.02, grip: 1.12, unlockStars: 7, mission: "부스트 4", missionCheck: (state) => state.driftBoosts >= 4 }
];

let currentTrack = trackLayouts[0];
let track = { rx: currentTrack.rx, ry: currentTrack.ry, outer: currentTrack.outer, inner: currentTrack.inner };
let currentFlavor = flavorMods[0];
let gates = [];

let state;
let keys = { left: false, right: false, thrust: false };
let touchDrive = { active: false, startX: 0, lastX: 0 };
let animationFrame = 0;
let lastTimestamp = 0;

restartButton.addEventListener("click", () => startGame({ trackIndex: state.selectedTrackIndex, flavorIndex: state.selectedFlavorIndex }));
overlayRestartButton.addEventListener("click", () => startGame({ trackIndex: state.selectedTrackIndex, flavorIndex: state.selectedFlavorIndex }));
trackButton.addEventListener("click", cycleTrack);
flavorButton.addEventListener("click", cycleFlavor);
canvas.addEventListener("pointerdown", startTouchDrive);
canvas.addEventListener("pointermove", moveTouchDrive);
canvas.addEventListener("pointerup", endTouchDrive);
canvas.addEventListener("pointercancel", endTouchDrive);

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

function normalizeIndex(value, length) {
  const index = Number(value);
  if (!Number.isFinite(index)) {
    return 0;
  }
  return (Math.round(index) + length) % length;
}

function configureCourse(trackIndex, flavorIndex) {
  currentTrack = trackLayouts[normalizeIndex(trackIndex, trackLayouts.length)];
  track = { rx: currentTrack.rx, ry: currentTrack.ry, outer: currentTrack.outer, inner: currentTrack.inner };
  currentFlavor = flavorMods[normalizeIndex(flavorIndex, flavorMods.length)];
  gates = currentTrack.gates.map((gate) => ({
    ...gate,
    x: center.x + Math.cos(gate.angle) * track.rx,
    y: center.y + Math.sin(gate.angle) * track.ry
  }));
}

function totalStars(progress) {
  return Object.values(progress.tracks || {}).reduce((sum, record) => sum + Number(record.bestStars || 0), 0);
}

function unlockedFlavorIndices(progress) {
  const stars = totalStars(progress);
  return flavorMods
    .map((flavor, index) => ({ flavor, index }))
    .filter((entry) => stars >= entry.flavor.unlockStars)
    .map((entry) => entry.index);
}

function createInitialState(options = {}) {
  const progress = loadProgress();
  const selectedTrackIndex = normalizeIndex(options.trackIndex ?? progress.selectedTrackIndex ?? getDailyTrackIndex(), trackLayouts.length);
  const unlockedFlavors = unlockedFlavorIndices(progress);
  const requestedFlavorIndex = normalizeIndex(options.flavorIndex ?? progress.selectedFlavorIndex ?? getDailyFlavorIndex(), flavorMods.length);
  const selectedFlavorIndex = unlockedFlavors.includes(requestedFlavorIndex) ? requestedFlavorIndex : unlockedFlavors[0];
  configureCourse(selectedTrackIndex, selectedFlavorIndex);
  const trackRecord = progress.tracks[currentTrack.id] || {};

  return {
    active: false,
    selectedTrackIndex,
    selectedFlavorIndex,
    score: 0,
    elapsed: 0,
    timeLeft: roundSeconds,
    lap: 0,
    gateIndex: 0,
    message: `${currentFlavor.name} 카트 출발`,
    gateCombo: 0,
    bestGateCombo: 0,
    perfectGates: 0,
    driftBoosts: 0,
    apexLinks: 0,
    lineCharge: 0,
    lineReady: false,
    boostTime: 0,
    feverTime: 0,
    boostCooldown: 0,
    offTrackTimer: 0,
    floaters: [],
    progress,
    trackName: currentTrack.name,
    totalStars: totalStars(progress),
    flavorMissionDone: Boolean(progress.flavorMissions?.[currentFlavor.id]),
    ghostTrace: Array.isArray(trackRecord.ghostTrace) ? trackRecord.ghostTrace : [],
    raceTrace: [],
    traceTimer: 0,
    bestTime: Number(trackRecord.bestTime || localStorage.getItem(bestTimeStorageKey) || 0),
    bestStars: Number(trackRecord.bestStars || localStorage.getItem(starStorageKey) || 0),
    kart: {
      x: gates[3].x + 6,
      y: gates[3].y + 38,
      angle: -0.08,
      speed: 0,
      drift: 0,
      trail: []
    }
  };
}

function startGame(options = {}) {
  state = createInitialState(options);
  state.active = true;
  saveSelectionProgress();
  resultOverlay.hidden = true;
  hintText.textContent = state.message;
  keys = { left: false, right: false, thrust: false };
  syncButtons();
  lastTimestamp = performance.now();
  cancelAnimationFrame(animationFrame);
  animationFrame = requestAnimationFrame(tick);
}

function saveSelectionProgress() {
  const nextProgress = {
    ...state.progress,
    selectedTrackIndex: state.selectedTrackIndex,
    selectedFlavorIndex: state.selectedFlavorIndex
  };
  state.progress = nextProgress;
  localStorage.setItem(progressStorageKey, JSON.stringify(nextProgress));
}

function tick(timestamp) {
  const delta = Math.min(0.05, (timestamp - lastTimestamp) / 1000);
  lastTimestamp = timestamp;

  if (state.active) {
    state.elapsed += delta;
    state.timeLeft = Math.max(0, state.timeLeft - delta);
    state.offTrackTimer = Math.max(0, state.offTrackTimer - delta);
    state.boostCooldown = Math.max(0, state.boostCooldown - delta);
    state.boostTime = Math.max(0, state.boostTime - delta);
    updateKart(delta);
    updateRacingLine(delta);
    recordRaceTrace(delta);
    updateFloaters(delta);
    checkGate();

    if (state.timeLeft <= 0) {
      finishGame(false);
    }
  }

  updateHud();
  draw(timestamp);
  animationFrame = requestAnimationFrame(tick);
}

function setControl(control, value) {
  if (control in keys) {
    keys[control] = value;
    syncButtons();
  }
}

function startTouchDrive(event) {
  event.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  touchDrive = { active: true, startX: x, lastX: x };
  setControl("thrust", true);
  if (canvas.setPointerCapture) {
    canvas.setPointerCapture(event.pointerId);
  }
}

function moveTouchDrive(event) {
  if (!touchDrive.active) {
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const dx = x - touchDrive.startX;
  touchDrive.lastX = x;
  setControl("left", dx < -18);
  setControl("right", dx > 18);
}

function endTouchDrive(event) {
  touchDrive.active = false;
  setControl("left", false);
  setControl("right", false);
  setControl("thrust", false);
  if (canvas.releasePointerCapture && event?.pointerId !== undefined) {
    canvas.releasePointerCapture(event.pointerId);
  }
}

function syncButtons() {
  for (const button of controlButtons) {
    button.classList.toggle("is-active", Boolean(keys[button.dataset.control]));
  }
}

function cycleTrack() {
  startGame({
    trackIndex: state.selectedTrackIndex + 1,
    flavorIndex: state.selectedFlavorIndex
  });
}

function cycleFlavor() {
  const unlocked = unlockedFlavorIndices(state.progress);
  const currentIndex = unlocked.indexOf(state.selectedFlavorIndex);
  const nextFlavorIndex = unlocked[(currentIndex + 1 + unlocked.length) % unlocked.length];
  startGame({
    trackIndex: state.selectedTrackIndex,
    flavorIndex: nextFlavorIndex
  });
}

function updateKart(delta) {
  const kart = state.kart;
  const turnInput = (keys.left ? -1 : 0) + (keys.right ? 1 : 0);
  const thrust = (keys.thrust ? 180 : 86) * currentFlavor.accel;
  const turnPower = (2.25 + Math.min(1, Math.abs(kart.speed) / 170) * 1.6) * currentFlavor.turn;

  kart.angle += turnInput * turnPower * delta;
  kart.speed += thrust * delta;
  kart.speed *= keys.thrust ? 0.992 : 0.982;
  kart.speed = Math.min(kart.speed, keys.thrust ? 245 : 174);

  if (state.boostTime > 0) {
    kart.speed += 120 * delta;
    kart.speed = Math.min(kart.speed, 292);
  }

  if (state.feverTime > 0) {
    state.feverTime = Math.max(0, state.feverTime - delta);
    kart.speed += 82 * delta;
    kart.speed = Math.min(kart.speed, 306);
  }

  const onTrack = getTrackBand(kart.x, kart.y);

  if (!onTrack.inside) {
    kart.speed *= 0.91;
    const correction = forceTowardTrack(kart.x, kart.y);
    kart.x += correction.x * delta;
    kart.y += correction.y * delta;
    state.offTrackTimer = 1.25;
    state.gateCombo = 0;
    kart.drift = Math.max(0, kart.drift - delta * 1.6);
  } else {
    const drifting = keys.thrust && turnInput !== 0 && kart.speed > 118;
    if (drifting) {
      kart.drift = Math.min(1, kart.drift + delta * (0.55 + kart.speed / 220) * currentFlavor.grip);
    } else {
      kart.drift = Math.max(0, kart.drift - delta * 0.45);
    }
  }

  if (kart.drift >= 1 && state.boostCooldown <= 0) {
    triggerDriftBoost();
  }

  kart.x += Math.cos(kart.angle) * kart.speed * delta;
  kart.y += Math.sin(kart.angle) * kart.speed * delta;

  if (kart.x < 28 || kart.x > width - 28) {
    kart.x = clamp(kart.x, 28, width - 28);
    kart.angle = Math.PI - kart.angle;
    kart.speed *= 0.62;
  }

  if (kart.y < 28 || kart.y > height - 28) {
    kart.y = clamp(kart.y, 28, height - 28);
    kart.angle = -kart.angle;
    kart.speed *= 0.62;
  }

  kart.trail.push({ x: kart.x, y: kart.y, life: 0.48, drift: kart.drift });
  for (const mark of kart.trail) {
    mark.life -= delta;
  }
  kart.trail = kart.trail.filter((mark) => mark.life > 0);
}

function recordRaceTrace(delta) {
  state.traceTimer -= delta;
  if (state.traceTimer > 0) {
    return;
  }

  state.traceTimer = 0.24;
  state.raceTrace.push({
    x: Math.round(state.kart.x),
    y: Math.round(state.kart.y),
    lap: state.lap,
    gate: state.gateIndex
  });

  if (state.raceTrace.length > 120) {
    state.raceTrace.shift();
  }
}

function triggerDriftBoost() {
  const kart = state.kart;
  state.boostTime = 0.78;
  state.boostCooldown = 0.95;
  state.driftBoosts += 1;
  kart.drift = 0.18;
  kart.speed = Math.min(292, kart.speed + 52);

  const bonus = 90 + state.gateCombo * 24;
  state.score += bonus;
  hintText.textContent = `드리프트 젤리 부스트 +${bonus}`;
  spawnFloatText(`BOOST +${bonus}`, currentFlavor.color, kart.x, kart.y - 28);
}

function angleDelta(a, b) {
  let delta = (a - b + Math.PI) % (Math.PI * 2) - Math.PI;
  if (delta < -Math.PI) {
    delta += Math.PI * 2;
  }
  return delta;
}

function updateRacingLine(delta) {
  const gate = gates[state.gateIndex];
  const nextGate = gates[(state.gateIndex + 1) % gates.length];
  if (!gate || !nextGate) {
    state.lineCharge = 0;
    state.lineReady = false;
    return;
  }

  const kart = state.kart;
  const distanceToGate = Math.hypot(kart.x - gate.x, kart.y - gate.y);
  const angleToNext = Math.atan2(nextGate.y - kart.y, nextGate.x - kart.x);
  const setupError = Math.abs(angleDelta(kart.angle, angleToNext));
  const onTrack = getTrackBand(kart.x, kart.y).inside;
  const setupWindow = distanceToGate < 138 && distanceToGate > 18 && kart.speed > 112 && onTrack && setupError < 0.68;

  if (setupWindow) {
    const quality = clamp(1 - setupError / 0.68, 0.12, 1);
    state.lineCharge = clamp(state.lineCharge + delta * (0.95 + quality * 1.05), 0, 1);
  } else {
    state.lineCharge = clamp(state.lineCharge - delta * 0.92, 0, 1);
  }

  state.lineReady = state.lineCharge >= 0.64;
}

function spawnFloatText(text, color, x, y) {
  state.floaters.push({
    text,
    x,
    y,
    vy: -34,
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

function getTrackBand(x, y) {
  const nx = (x - center.x) / track.rx;
  const ny = (y - center.y) / track.ry;
  const value = Math.sqrt(nx * nx + ny * ny);
  return {
    value,
    inside: value <= track.outer && value >= track.inner
  };
}

function forceTowardTrack(x, y) {
  const dx = x - center.x;
  const dy = y - center.y;
  const angle = Math.atan2(dy / track.ry, dx / track.rx);
  const targetScale = clamp(getTrackBand(x, y).value, track.inner, track.outer);
  const targetX = center.x + Math.cos(angle) * track.rx * targetScale;
  const targetY = center.y + Math.sin(angle) * track.ry * targetScale;
  return {
    x: (targetX - x) * 4.5,
    y: (targetY - y) * 4.5
  };
}

function checkGate() {
  const gate = gates[state.gateIndex];
  const distance = Math.hypot(state.kart.x - gate.x, state.kart.y - gate.y);

  if (distance > 42) {
    return;
  }

  const cleanPass = state.offTrackTimer <= 0 && state.kart.speed > 118;
  const perfectPass = cleanPass && distance < 18 && state.kart.speed > 158;
  const apexLink = cleanPass && state.lineReady;
  state.gateCombo = cleanPass ? state.gateCombo + 1 : 1;
  state.bestGateCombo = Math.max(state.bestGateCombo, state.gateCombo);

  const comboBonus = state.gateCombo * 48;
  const speedBonus = Math.round(Math.min(220, state.kart.speed));
  const perfectBonus = perfectPass ? 180 + state.gateCombo * 30 : 0;
  const apexBonus = apexLink ? 150 + state.gateCombo * 34 : 0;
  const gateScore = 140 + state.gateIndex * 35 + state.lap * 120 + comboBonus + speedBonus + perfectBonus + apexBonus;
  state.score += gateScore;
  if (perfectPass) {
    triggerPerfectGate(gate);
  }
  if (apexLink) {
    state.apexLinks += 1;
    state.boostTime = Math.max(state.boostTime, 0.46);
    state.kart.speed = Math.min(306, state.kart.speed + 24);
    spawnFloatText(`APEX +${apexBonus}`, "#8f78ff", state.kart.x, state.kart.y - 44);
  }
  state.lineCharge = apexLink ? 0.22 : 0;
  state.lineReady = false;
  state.gateIndex += 1;
  hintText.textContent = apexLink
    ? `APEX LINK! 다음 게이트 라인을 잘 탔어요 x${state.gateCombo}`
    : perfectPass ? `PERFECT ${gate.name}! 푸딩 피버 x${state.gateCombo}` : `${gate.name} 게이트 x${state.gateCombo}`;
  spawnFloatText(`${perfectPass ? "PERFECT " : ""}x${state.gateCombo} +${gateScore}`, perfectPass ? "#ffd66e" : gate.color, gate.x, gate.y - 26);

  if (state.gateIndex >= gates.length) {
    state.gateIndex = 0;
    state.lap += 1;
    const lapBonus = 350 + Math.ceil(state.timeLeft) * 3 + state.bestGateCombo * 36;
    state.score += lapBonus;
    hintText.textContent = `${state.lap}랩 완료 x${state.bestGateCombo}`;

    if (state.lap >= totalLaps) {
      finishGame(true);
    }
  }
}

function triggerPerfectGate(gate) {
  state.perfectGates += 1;
  state.feverTime = Math.max(state.feverTime, 0.72);
  state.kart.speed = Math.min(306, state.kart.speed + 34);
  for (let i = 0; i < 8; i += 1) {
    state.kart.trail.push({
      x: gate.x + (Math.random() - 0.5) * 42,
      y: gate.y + (Math.random() - 0.5) * 42,
      life: 0.56 + Math.random() * 0.22,
      drift: 1
    });
  }
}

function finishGame(won) {
  if (!state.active) {
    return;
  }

  state.active = false;
  const timeBonus = won ? Math.ceil(state.timeLeft) * 24 : 0;
  const stars = evaluateStars(won);
  state.score += timeBonus;
  let newBestTime = false;

  if (won && (state.bestTime === 0 || state.elapsed < state.bestTime)) {
    state.bestTime = state.elapsed;
    newBestTime = true;
    localStorage.setItem(bestTimeStorageKey, state.bestTime.toFixed(2));
  }

  if (stars > state.bestStars) {
    state.bestStars = stars;
    localStorage.setItem(starStorageKey, String(stars));
  }
  const missionCleared = won && currentFlavor.missionCheck(state);
  saveProgress(stars, newBestTime, missionCleared);

  resultKicker.textContent = won ? "Race Complete" : "Race Paused";
  resultTitle.textContent = won ? "말랑한 완주" : "다시 달려볼까요";
  resultCopy.textContent = won
    ? `${state.trackName} 별 ${stars}/3, 기록 ${formatTime(state.elapsed)}, 콤보 x${state.bestGateCombo}, APEX ${state.apexLinks}회, 부스트 ${state.driftBoosts}회입니다. ${currentFlavor.name} 미션 ${missionCleared ? "완료" : currentFlavor.mission}.`
    : `${state.trackName} ${state.lap}/${totalLaps}랩, 게이트 ${state.gateIndex + 1}/${gates.length}, 최고 콤보 x${state.bestGateCombo}, APEX ${state.apexLinks}회까지 진행했습니다.`;
  resultOverlay.hidden = false;
  syncButtons();
}

function evaluateStars(won) {
  if (!won) {
    return 0;
  }

  const finishStar = 1;
  const timeStar = state.elapsed <= 58 ? 1 : 0;
  const skillStar = state.bestGateCombo >= 6 && state.driftBoosts >= 3 ? 1 : 0;
  return finishStar + timeStar + skillStar;
}

function formatTime(seconds) {
  if (!seconds) {
    return "--.--";
  }

  return `${seconds.toFixed(2)}s`;
}

function updateHud() {
  scoreValue.textContent = state.score.toString();
  timeValue.textContent = Math.ceil(state.timeLeft).toString();
  lapValue.textContent = `${state.lap}/${totalLaps}`;
  gateValue.textContent = `${state.gateIndex + 1}/${gates.length} x${state.gateCombo}`;
  trackButton.textContent = `${state.selectedTrackIndex + 1}/${trackLayouts.length} ${currentTrack.name}`;
  flavorButton.textContent = `${currentFlavor.name} · ${state.flavorMissionDone ? "완료" : currentFlavor.mission}`;
}

function draw(timestamp) {
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, width, height);
  drawBackground(timestamp);
  drawTrack();
  drawGhostTrace(timestamp);
  drawRacingLine(timestamp);
  drawGates(timestamp);
  drawTrail();
  drawKart(timestamp);
  drawFloaters();
  drawRaceOverlay();
}

function drawBackground(timestamp) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#dff8ff");
  gradient.addColorStop(1, "#ffe8c7");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(36, 48, 71, 0.06)";
  for (let x = 0; x <= width; x += 20) {
    ctx.fillRect(x, 0, 1, height);
  }
  for (let y = 0; y <= height; y += 20) {
    ctx.fillRect(0, y, width, 1);
  }

  const drift = (timestamp / 80) % 140;
  ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
  for (let i = -1; i < 6; i += 1) {
    const x = i * 140 + drift;
    ctx.fillRect(x, 60, 58, 10);
    ctx.fillRect(x + 18, 48, 44, 10);
  }
}

function drawTrack() {
  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.strokeStyle = "#243047";
  ctx.lineWidth = 106;
  ctx.beginPath();
  ctx.ellipse(0, 0, track.rx, track.ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "#fffef7";
  ctx.lineWidth = 96;
  ctx.beginPath();
  ctx.ellipse(0, 0, track.rx, track.ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "#f3d7a8";
  ctx.lineWidth = 72;
  ctx.beginPath();
  ctx.ellipse(0, 0, track.rx, track.ry, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(36, 48, 71, 0.22)";
  ctx.lineWidth = 4;
  ctx.setLineDash([18, 14]);
  ctx.beginPath();
  ctx.ellipse(0, 0, track.rx, track.ry, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawGhostTrace(timestamp) {
  if (!state.ghostTrace || state.ghostTrace.length < 2) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = "rgba(36, 48, 71, 0.28)";
  ctx.lineWidth = 5;
  ctx.setLineDash([8, 10]);
  ctx.beginPath();
  state.ghostTrace.forEach((point, index) => {
    if (index === 0) {
      ctx.moveTo(point.x, point.y);
    } else {
      ctx.lineTo(point.x, point.y);
    }
  });
  ctx.stroke();
  ctx.setLineDash([]);

  const replayIndex = Math.floor((timestamp / 120) % state.ghostTrace.length);
  const last = state.ghostTrace[replayIndex];
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.strokeStyle = "#243047";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(last.x, last.y, 15, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#69c8ff";
  ctx.fillRect(last.x - 5, last.y - 4, 10, 8);
  ctx.restore();
}

function drawRacingLine(timestamp) {
  const gate = gates[state.gateIndex];
  const nextGate = gates[(state.gateIndex + 1) % gates.length];
  if (!gate || !nextGate || !state.active) {
    return;
  }

  const pulse = 0.5 + Math.sin(timestamp / 180) * 0.2;
  ctx.save();
  ctx.globalAlpha = 0.38 + state.lineCharge * 0.36;
  ctx.strokeStyle = state.lineReady ? "#ffd66e" : "#8f78ff";
  ctx.lineWidth = state.lineReady ? 6 : 4;
  ctx.setLineDash([14, 12]);
  ctx.beginPath();
  ctx.moveTo(gate.x, gate.y);
  const midX = center.x + (gate.x + nextGate.x - center.x * 2) * 0.18;
  const midY = center.y + (gate.y + nextGate.y - center.y * 2) * 0.18;
  ctx.quadraticCurveTo(midX, midY, nextGate.x, nextGate.y);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.globalAlpha = 0.58 + state.lineCharge * 0.3;
  ctx.strokeStyle = state.lineReady ? "#ffd66e" : currentFlavor.color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(nextGate.x, nextGate.y, 44 + pulse * 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.08, state.lineCharge));
  ctx.stroke();

  ctx.fillStyle = state.lineReady ? "#ffd66e" : "#fffef7";
  ctx.strokeStyle = "#243047";
  ctx.lineWidth = 2;
  ctx.font = "900 11px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.textAlign = "center";
  ctx.strokeText(state.lineReady ? "APEX" : "NEXT", nextGate.x, nextGate.y - 48);
  ctx.fillText(state.lineReady ? "APEX" : "NEXT", nextGate.x, nextGate.y - 48);
  ctx.restore();
}

function drawGates(timestamp) {
  for (let i = 0; i < gates.length; i += 1) {
    const gate = gates[i];
    const active = i === state.gateIndex;
    const pulse = active ? 1 + Math.sin(timestamp / 180) * 0.12 : 1;

    ctx.save();
    ctx.translate(gate.x, gate.y);
    ctx.rotate(gate.angle + Math.PI / 2);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = active ? gate.color : "#ffffff";
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 4;
    ctx.fillRect(-36, -12, 72, 24);
    ctx.strokeRect(-36, -12, 72, 24);
    ctx.fillStyle = gate.color;
    ctx.fillRect(-28, -6, 18, 12);
    ctx.fillRect(10, -6, 18, 12);
    ctx.restore();
  }
}

function drawTrail() {
  for (const mark of state.kart.trail) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, mark.life);
  ctx.fillStyle = state.feverTime > 0 ? "#ffd66e" : state.boostTime > 0 ? currentFlavor.color : mark.drift > 0.2 ? "#e95b88" : "rgba(255, 255, 255, 0.7)";
    ctx.beginPath();
    ctx.ellipse(mark.x, mark.y, 11 + mark.drift * 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawKart(timestamp) {
  const kart = state.kart;
  const bob = Math.sin(timestamp / 130) * 1.5;

  ctx.save();
  ctx.translate(kart.x, kart.y + bob);
  ctx.rotate(kart.angle);
  ctx.fillStyle = currentFlavor.color;
  ctx.strokeStyle = "#243047";
  ctx.lineWidth = 4;
  roundRect(-24, -17, 48, 34, 9);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#fff7cb";
  roundRect(-14, -10, 28, 20, 7);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#243047";
  ctx.fillRect(18, -7, 10, 5);
  ctx.fillRect(18, 4, 10, 5);
  ctx.fillStyle = "#e95b88";
  ctx.fillRect(-20, -4, 8, 8);

  if (state.boostTime > 0) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-34, -10, 10, 5);
    ctx.fillRect(-40, 2, 14, 5);
  }

  ctx.restore();
}

function drawFloaters() {
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "900 18px ui-monospace, SFMono-Regular, Consolas, monospace";

  for (const floater of state.floaters) {
    const alpha = Math.max(0, floater.life / floater.maxLife);
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 5;
    ctx.strokeStyle = "#243047";
    ctx.strokeText(floater.text, floater.x, floater.y);
    ctx.fillStyle = floater.color;
    ctx.fillText(floater.text, floater.x, floater.y);
  }

  ctx.restore();
}

function drawRaceOverlay() {
  drawPanel(28, 28, 214, 102);
  ctx.fillStyle = "#526078";
  ctx.font = "900 10px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.fillText("FLAVOR", 46, 50);
  ctx.fillText("BEST", 146, 50);
  ctx.fillStyle = "#243047";
  ctx.font = "900 15px system-ui, sans-serif";
  ctx.fillText(currentFlavor.name, 46, 73);
  ctx.font = "900 15px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.fillText(formatTime(state.bestTime), 146, 73);
  ctx.fillStyle = "#526078";
  ctx.font = "900 10px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.fillText("TRACK", 46, 96);
  ctx.fillText("MISSION", 146, 96);
  ctx.fillStyle = "#243047";
  ctx.font = "900 13px system-ui, sans-serif";
  ctx.fillText(state.trackName, 46, 116);
  ctx.font = "900 13px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.fillText(state.flavorMissionDone ? "DONE" : currentFlavor.mission, 146, 116);

  drawPanel(width - 226, 28, 198, 106);
  ctx.fillStyle = "#526078";
  ctx.font = "900 10px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.fillText("DRIFT", width - 206, 50);
  ctx.fillText(`STAR ${state.totalStars}`, width - 108, 50);

  ctx.fillStyle = "rgba(36, 48, 71, 0.16)";
  ctx.fillRect(width - 206, 66, 78, 12);
  ctx.fillStyle = state.boostTime > 0 ? currentFlavor.color : "#e95b88";
  ctx.fillRect(width - 206, 66, 78 * state.kart.drift, 12);
  ctx.strokeStyle = "#243047";
  ctx.lineWidth = 2;
  ctx.strokeRect(width - 206, 66, 78, 12);

  ctx.fillStyle = "#526078";
  ctx.font = "900 10px ui-monospace, SFMono-Regular, Consolas, monospace";
  ctx.fillText("APEX", width - 206, 96);
  ctx.fillStyle = "rgba(36, 48, 71, 0.16)";
  ctx.fillRect(width - 206, 112, 78, 10);
  ctx.fillStyle = state.lineReady ? "#ffd66e" : "#8f78ff";
  ctx.fillRect(width - 206, 112, 78 * state.lineCharge, 10);
  ctx.strokeStyle = "#243047";
  ctx.strokeRect(width - 206, 112, 78, 10);

  for (let i = 0; i < 3; i += 1) {
    drawMiniStar(width - 108 + i * 24, 72, i < state.bestStars ? "#ffd66e" : "#ffffff");
  }
}

function drawPanel(x, y, w, h) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.86)";
  ctx.strokeStyle = "#243047";
  ctx.lineWidth = 3;
  roundRect(x, y, w, h, 6);
  ctx.fill();
  ctx.stroke();
}

function drawMiniStar(x, y, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.strokeStyle = "#243047";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 10;
    const radius = i % 2 === 0 ? 8 : 4;
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getDailyFlavorIndex() {
  const today = new Date();
  const dayNumber = Math.floor(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 86400000);
  return dayNumber % flavorMods.length;
}

function getDailyTrackIndex() {
  const today = new Date();
  const dayNumber = Math.floor(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) / 86400000);
  return dayNumber % trackLayouts.length;
}

function loadProgress() {
  try {
    const parsed = JSON.parse(localStorage.getItem(progressStorageKey) || "{}");
    return {
      tracks: parsed.tracks && typeof parsed.tracks === "object" ? parsed.tracks : {},
      flavorMissions: parsed.flavorMissions && typeof parsed.flavorMissions === "object" ? parsed.flavorMissions : {},
      selectedTrackIndex: Number.isFinite(Number(parsed.selectedTrackIndex)) ? Number(parsed.selectedTrackIndex) : getDailyTrackIndex(),
      selectedFlavorIndex: Number.isFinite(Number(parsed.selectedFlavorIndex)) ? Number(parsed.selectedFlavorIndex) : getDailyFlavorIndex()
    };
  } catch (error) {
    return {
      tracks: {},
      flavorMissions: {},
      selectedTrackIndex: getDailyTrackIndex(),
      selectedFlavorIndex: getDailyFlavorIndex()
    };
  }
}

function saveProgress(stars, newBestTime, missionCleared = false) {
  const nextProgress = {
    tracks: {
      ...state.progress.tracks
    },
    flavorMissions: {
      ...(state.progress.flavorMissions || {})
    },
    selectedTrackIndex: state.selectedTrackIndex,
    selectedFlavorIndex: state.selectedFlavorIndex
  };
  const previous = nextProgress.tracks[currentTrack.id] || {};
  nextProgress.tracks[currentTrack.id] = {
    bestTime: state.bestTime,
    bestStars: Math.max(Number(previous.bestStars || 0), stars),
    ghostTrace: newBestTime ? state.raceTrace.slice(-96) : (previous.ghostTrace || state.ghostTrace || [])
  };
  if (missionCleared) {
    nextProgress.flavorMissions[currentFlavor.id] = true;
  }

  state.progress = nextProgress;
  state.flavorMissionDone = Boolean(nextProgress.flavorMissions[currentFlavor.id]);
  state.totalStars = totalStars(nextProgress);
  state.ghostTrace = nextProgress.tracks[currentTrack.id].ghostTrace;
  localStorage.setItem(progressStorageKey, JSON.stringify(nextProgress));
}
