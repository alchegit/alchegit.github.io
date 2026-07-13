(() => {
  const canvas = document.getElementById("runnerCanvas");
  const ctx = canvas.getContext("2d");
  const distanceValue = document.getElementById("distanceValue");
  const letterValue = document.getElementById("letterValue");
  const heartValue = document.getElementById("heartValue");
  const jumpValue = document.getElementById("jumpValue");
  const storyValue = document.getElementById("storyValue");
  const scoreValue = document.getElementById("scoreValue");
  const hintText = document.getElementById("hintText");
  const stageButton = document.getElementById("stageButton");
  const albumButton = document.getElementById("albumButton");
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
  const storyTotal = 6;
  const progressStorageKey = "moonLetterRunnerProgress:v2";
  const stampRanks = { "-": 0, C: 1, B: 2, A: 3, S: 4 };
  const storyLines = [
    "첫 달빛 우표",
    "잠든 골목의 답장",
    "옥상 난간의 약속",
    "바다 냄새 편지",
    "새벽 별자리 지도",
    "다시 만나는 산책길"
  ];
  const stars = Array.from({ length: 88 }, (_, index) => ({
    x: (index * 79) % width,
    y: (index * 47) % 300,
    phase: index * 0.37,
    size: index % 5 === 0 ? 2 : 1
  }));
  const stagePresets = [
    {
      id: "forest",
      name: "숲길",
      finishDistance: 620,
      bg: ["#24315f", "#3b5290", "#6dd7cf"],
      startPlatforms: [
        { x: 70, y: 420, w: 230, route: "safe" },
        { x: 350, y: 365, w: 150, route: "high" },
        { x: 570, y: 420, w: 190, route: "safe" },
        { x: 830, y: 340, w: 160, route: "high" }
      ],
      startPickups: [
        { x: 420, y: 315, type: "letter" },
        { x: 635, y: 370, type: "letter" },
        { x: 900, y: 292, type: "story" }
      ],
      hazards: [{ x: 690, y: 454, w: 56, h: 18 }],
      pattern: [
        { y: 398, w: 178, route: "safe", pickup: "letter" },
        { y: 330, w: 142, route: "high", pickup: "story" },
        { y: 432, w: 210, route: "safe", pickup: "letter" },
        { y: 352, w: 160, route: "high", pickup: "letter" },
        { y: 410, w: 126, route: "risky", pickup: "letter" }
      ]
    },
    {
      id: "roof",
      name: "옥상",
      finishDistance: 680,
      bg: ["#1e244d", "#594f95", "#ffcfbc"],
      startPlatforms: [
        { x: 70, y: 432, w: 210, route: "safe" },
        { x: 340, y: 318, w: 120, route: "high" },
        { x: 540, y: 372, w: 150, route: "risky" },
        { x: 780, y: 300, w: 140, route: "high" }
      ],
      startPickups: [
        { x: 380, y: 266, type: "story" },
        { x: 605, y: 326, type: "letter" },
        { x: 830, y: 250, type: "letter" }
      ],
      hazards: [
        { x: 570, y: 410, w: 54, h: 18 },
        { x: 720, y: 454, w: 48, h: 18 }
      ],
      pattern: [
        { y: 420, w: 150, route: "safe", pickup: "letter" },
        { y: 312, w: 118, route: "high", pickup: "story" },
        { y: 376, w: 128, route: "risky", pickup: "letter" },
        { y: 286, w: 110, route: "high", pickup: "letter" },
        { y: 436, w: 180, route: "safe", pickup: "letter" }
      ]
    },
    {
      id: "beach",
      name: "해변",
      finishDistance: 650,
      bg: ["#25366d", "#316b9e", "#87e6d2"],
      startPlatforms: [
        { x: 70, y: 408, w: 240, route: "safe" },
        { x: 370, y: 380, w: 150, route: "safe" },
        { x: 610, y: 330, w: 135, route: "high" },
        { x: 820, y: 428, w: 160, route: "risky" }
      ],
      startPickups: [
        { x: 430, y: 330, type: "letter" },
        { x: 665, y: 278, type: "story" },
        { x: 890, y: 378, type: "letter" }
      ],
      hazards: [{ x: 840, y: 454, w: 72, h: 18 }],
      pattern: [
        { y: 406, w: 220, route: "safe", pickup: "letter" },
        { y: 342, w: 146, route: "high", pickup: "story" },
        { y: 438, w: 156, route: "risky", pickup: "letter" },
        { y: 386, w: 190, route: "safe", pickup: "letter" },
        { y: 320, w: 128, route: "high", pickup: "letter" }
      ]
    }
  ];

  let state;

  function normalizeStageIndex(value) {
    const index = Number(value);
    if (!Number.isFinite(index)) {
      return 0;
    }
    return Math.max(0, Math.min(stagePresets.length - 1, Math.round(index)));
  }

  function emptyStageRecord() {
    return {
      bestScore: 0,
      bestStamp: "-",
      bestLetters: 0,
      clears: 0,
      noDamageClears: 0,
      allPickupClears: 0
    };
  }

  function resetGame(options = {}) {
    const progress = loadProgress();
    const stageIndex = normalizeStageIndex(options.stageIndex ?? progress.selectedStageIndex);
    state = {
      active: true,
      finished: false,
      lastTime: performance.now(),
      stageIndex,
      distance: 0,
      score: 0,
      letters: 0,
      hearts: 3,
      damage: 0,
      jumps: 0,
      nextPlatform: 0,
      nextStoryIndex: progress.storyIds.length % storyTotal,
      pickupTarget: 0,
      pickupsCollected: 0,
      hasDoubleJump: progress.unlockedDoubleJump,
      hasGlide: progress.unlockedGlide,
      gliding: false,
      actionHeld: false,
      moonLine: 0,
      moonLineTimer: 0,
      landingBonusReady: false,
      landingGlow: 0,
      airTime: 0,
      softLandings: 0,
      landingChain: 0,
      player: { x: 145, y: 338, w: 30, h: 42, vy: 0, grounded: false, jumpsLeft: 1, invuln: 0 },
      platforms: [],
      pickups: [],
      hazards: [],
      sparks: [],
      storyThisRun: new Set(),
      pickupRoute: [],
      progress,
      friendRecord: normalizeFriendRecord(progress.friendRecord),
      resultCardCode: "",
      albumIndex: Number(progress.albumIndex || 0),
      albumMode: false,
      hint: skillHint(progress)
    };
    state.progress.selectedStageIndex = stageIndex;
    localStorage.setItem(progressStorageKey, JSON.stringify(state.progress));
    seedLevel();
    resultOverlay.hidden = true;
    updateHud();
  }

  function loadProgress() {
    try {
      const parsed = JSON.parse(localStorage.getItem(progressStorageKey) || "{}");
      return {
        bestScore: Number(parsed.bestScore || 0),
        bestStamp: typeof parsed.bestStamp === "string" ? parsed.bestStamp : "-",
        bestLetters: Number(parsed.bestLetters || 0),
        storyIds: Array.isArray(parsed.storyIds)
          ? parsed.storyIds.filter((id) => Number.isInteger(id) && id >= 0 && id < storyTotal)
          : [],
        unlockedDoubleJump: Boolean(parsed.unlockedDoubleJump),
        unlockedGlide: Boolean(parsed.unlockedGlide),
        selectedStageIndex: normalizeStageIndex(parsed.selectedStageIndex),
        stageRecords: stagePresets.map((_, index) => ({
          ...emptyStageRecord(),
          ...(Array.isArray(parsed.stageRecords) && parsed.stageRecords[index] ? parsed.stageRecords[index] : {})
        })),
        albumIndex: Number(parsed.albumIndex || 0),
        resultCards: Array.isArray(parsed.resultCards) ? parsed.resultCards.filter((card) => typeof card === "string").slice(-12) : [],
        friendRecord: normalizeFriendRecord(parsed.friendRecord)
      };
    } catch {
      return {
        bestScore: 0,
        bestStamp: "-",
        bestLetters: 0,
        storyIds: [],
        unlockedDoubleJump: false,
        unlockedGlide: false,
        selectedStageIndex: 0,
        stageRecords: stagePresets.map(emptyStageRecord),
        albumIndex: 0,
        resultCards: [],
        friendRecord: null
      };
    }
  }

  function saveProgress(stamp) {
    const stageRecord = state.progress.stageRecords[state.stageIndex] || emptyStageRecord();
    const allPickupClear = state.pickupTarget > 0 && state.pickupsCollected >= state.pickupTarget;
    state.progress.bestScore = Math.max(state.progress.bestScore, Math.round(state.score));
    state.progress.bestLetters = Math.max(state.progress.bestLetters, state.letters);
    if (stampRanks[stamp] > stampRanks[state.progress.bestStamp || "-"]) {
      state.progress.bestStamp = stamp;
    }
    state.progress.unlockedDoubleJump = state.progress.unlockedDoubleJump || state.hasDoubleJump;
    state.progress.unlockedGlide = state.progress.unlockedGlide || state.hasGlide;
    state.progress.storyIds = Array.from(new Set([...state.progress.storyIds, ...state.storyThisRun]));
    state.progress.selectedStageIndex = state.stageIndex;
    state.progress.albumIndex = state.albumIndex;
    state.progress.friendRecord = normalizeFriendRecord(state.friendRecord);
    if (state.resultCardCode) {
      state.progress.resultCards = [...new Set([...(state.progress.resultCards || []), state.resultCardCode])].slice(-12);
    }
    stageRecord.bestScore = Math.max(stageRecord.bestScore, Math.round(state.score));
    stageRecord.bestLetters = Math.max(stageRecord.bestLetters, state.letters);
    if (stampRanks[stamp] > stampRanks[stageRecord.bestStamp || "-"]) {
      stageRecord.bestStamp = stamp;
    }
    if (state.distance >= currentStage().finishDistance) {
      stageRecord.clears += 1;
    }
    if (state.damage === 0 && state.distance >= currentStage().finishDistance) {
      stageRecord.noDamageClears += 1;
    }
    if (allPickupClear && state.distance >= currentStage().finishDistance) {
      stageRecord.allPickupClears += 1;
    }
    state.progress.stageRecords[state.stageIndex] = stageRecord;
    localStorage.setItem(progressStorageKey, JSON.stringify(state.progress));
  }

  function skillHint(progress) {
    if (progress.unlockedGlide) {
      return "탭으로 점프하고, 공중에서 길게 누르면 달빛 활강을 합니다.";
    }
    if (progress.unlockedDoubleJump) {
      return "공중에서 한 번 더 눌러 2단 점프를 사용할 수 있습니다.";
    }
    return "탭으로 점프해 달빛 편지를 모으고, 공중에서 길게 누르면 더 오래 버팁니다.";
  }

  function currentStage() {
    return stagePresets[state ? state.stageIndex : 0];
  }

  function stageRecord() {
    return state.progress.stageRecords[state.stageIndex] || emptyStageRecord();
  }

  function registerPickup(pickup) {
    state.pickupTarget += 1;
    return {
      storyId: state.nextStoryIndex,
      taken: false,
      route: pickup.route || (pickup.y < 340 ? "high" : pickup.y > 424 ? "risky" : "safe"),
      ...pickup
    };
  }

  function seedLevel() {
    const stage = currentStage();
    state.platforms = stage.startPlatforms.map((platform) => ({ ...platform }));
    state.pickups = stage.startPickups.map((pickup) => registerPickup(pickup));
    state.hazards = stage.hazards.map((hazard) => ({ ...hazard }));
    state.nextPlatform = 0;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function updateHud() {
    distanceValue.textContent = `${Math.floor(state.distance)}m`;
    letterValue.textContent = String(state.letters);
    heartValue.textContent = String(Math.max(0, state.hearts));
    jumpValue.textContent = String(state.jumps);
    storyValue.textContent = `${new Set([...state.progress.storyIds, ...state.storyThisRun]).size}/${storyTotal}`;
    scoreValue.textContent = String(Math.max(0, Math.round(state.score)));
    hintText.textContent = state.hint;
    stageButton.textContent = `${state.stageIndex + 1}/${stagePresets.length} ${currentStage().name}`;
    albumButton.classList.toggle("is-active", state.albumMode);
  }

  function startAction() {
    if (!state.active || state.finished) {
      return;
    }

    state.actionHeld = true;
    const player = state.player;
    if (player.grounded) {
      player.vy = -430;
      player.grounded = false;
      state.gliding = false;
      player.jumpsLeft = state.hasDoubleJump ? 1 : 0;
      state.jumps += 1;
      state.hint = "좋은 점프입니다. 편지 봉투를 지나가며 모아보세요.";
      addSparks(player.x + 14, player.y + player.h, "#fff4a8", 8);
    } else if (player.jumpsLeft > 0) {
      player.vy = -360;
      player.jumpsLeft -= 1;
      state.gliding = false;
      state.jumps += 1;
      state.hint = "2단 점프로 높은 편지길을 노렸습니다.";
      addSparks(player.x + 14, player.y + player.h, "#69c8ff", 12);
    } else if (state.hasGlide) {
      state.gliding = true;
      state.hint = "달빛 활강 중입니다. 높은 길의 편지를 천천히 노려보세요.";
    }

    updateHud();
  }

  function endAction() {
    state.actionHeld = false;
    state.gliding = false;
  }

  function unlockSkills() {
    if (!state.hasDoubleJump && state.letters >= 3) {
      state.hasDoubleJump = true;
      state.player.jumpsLeft = Math.max(state.player.jumpsLeft, 1);
      state.hint = "2단 점프를 배웠습니다. 공중에서 한 번 더 누를 수 있어요.";
      addSparks(state.player.x, state.player.y, "#69c8ff", 18);
    }
    if (!state.hasGlide && state.storyThisRun.size >= 2) {
      state.hasGlide = true;
      state.hint = "달빛 활강을 배웠습니다. 공중에서 길게 눌러 천천히 내려오세요.";
      addSparks(state.player.x, state.player.y, "#fff4a8", 24);
    }
  }

  function addSparks(x, y, color, count = 8) {
    for (let i = 0; i < count; i += 1) {
      state.sparks.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 95,
        vy: (Math.random() - 0.8) * 105,
        life: 0.65,
        maxLife: 0.65,
        color
      });
    }
  }

  function spawnMore(scrollSpeed, dt) {
    const stage = currentStage();
    const last = state.platforms[state.platforms.length - 1];
    if (last && last.x + last.w < width + 120) {
      const pattern = stage.pattern[state.nextPlatform % stage.pattern.length];
      const platform = {
        x: width + 180,
        y: pattern.y,
        w: pattern.w,
        route: pattern.route
      };
      state.platforms.push(platform);
      state.pickups.push(registerPickup({
        x: platform.x + platform.w * 0.55,
        y: platform.y - (pattern.route === "high" ? 62 : 52),
        type: pattern.pickup,
        route: pattern.route
      }));
      if (pattern.route === "risky") {
        state.hazards.push({ x: platform.x + platform.w + 70, y: 454, w: 62, h: 18 });
      }
      state.nextPlatform += 1;
    }

    state.platforms = state.platforms.filter((platform) => platform.x + platform.w > -80);
    state.pickups = state.pickups.filter((pickup) => pickup.x > -80 && !pickup.taken);
    state.hazards = state.hazards.filter((hazard) => hazard.x + hazard.w > -80);

    for (const platform of state.platforms) {
      platform.x -= scrollSpeed * dt;
    }
    for (const pickup of state.pickups) {
      pickup.x -= scrollSpeed * dt;
    }
    for (const hazard of state.hazards) {
      hazard.x -= scrollSpeed * dt;
    }
  }

  function updatePlayer(dt) {
    const player = state.player;
    const wasGrounded = player.grounded;
    if (state.actionHeld && state.hasGlide && !player.grounded && player.vy > -20 && player.jumpsLeft <= 0) {
      state.gliding = true;
    }
    const gravity = state.gliding && player.vy > 0 ? 310 : 900;
    player.vy += gravity * dt;
    if (state.gliding && player.vy > 150) {
      player.vy = 150;
    }
    player.y += player.vy * dt;
    player.grounded = false;
    player.invuln = Math.max(0, player.invuln - dt);
    state.moonLineTimer = Math.max(0, state.moonLineTimer - dt);
    state.landingGlow = Math.max(0, state.landingGlow - dt);
    if (!wasGrounded) {
      state.airTime += dt;
    }

    for (const platform of state.platforms) {
      const overlapsX = player.x + player.w > platform.x && player.x < platform.x + platform.w;
      const falling = player.vy >= 0;
      const bottom = player.y + player.h;
      if (overlapsX && falling && bottom >= platform.y && bottom <= platform.y + 24) {
        const landedFromAir = state.airTime > 0.18;
        player.y = platform.y - player.h;
        player.vy = 0;
        player.grounded = true;
        player.jumpsLeft = state.hasDoubleJump ? 1 : 0;
        state.gliding = false;
        if (landedFromAir) {
          handleSoftLanding(platform);
        }
        state.airTime = 0;
        if (state.landingBonusReady) {
          const landingBonus = 55 + Math.min(state.moonLine, 5) * 12;
          state.score += landingBonus;
          state.landingBonusReady = false;
          state.landingGlow = 0.62;
          state.hint = `달빛 착지 보너스! MOON LINE x${state.moonLine} +${landingBonus}`;
          addSparks(player.x + player.w * 0.5, player.y + player.h, "#fff4a8", 24);
        }
      }
    }

    for (const hazard of state.hazards) {
      const hit =
        player.x + player.w > hazard.x &&
        player.x < hazard.x + hazard.w &&
        player.y + player.h > hazard.y &&
        player.y < hazard.y + hazard.h;
      if (hit && player.invuln <= 0) {
        player.invuln = 1.2;
        state.hearts -= 1;
        state.damage += 1;
        state.score = Math.max(0, state.score - 90);
        state.hint = "잠든 그림자를 스쳤습니다. 무피격 스탬프는 다음 도전으로!";
        addSparks(player.x, player.y + player.h, "#e95b88", 18);
      }
    }

    if (player.y > height + 60) {
      player.y = 270;
      player.vy = 0;
      state.airTime = 0;
      state.landingChain = 0;
      player.invuln = 1.2;
      state.hearts -= 1;
      state.damage += 1;
      state.score = Math.max(0, state.score - 100);
      state.hint = "발판을 놓쳤지만 다시 달빛길로 돌아왔습니다.";
    }

    if (state.hearts <= 0) {
      finishGame(false);
    }
  }

  function handleSoftLanding(platform) {
    const player = state.player;
    const playerCenter = player.x + player.w / 2;
    const platformCenter = platform.x + platform.w / 2;
    const centerQuality = 1 - Math.abs(playerCenter - platformCenter) / Math.max(1, platform.w / 2);
    const goodLanding = centerQuality > 0.54 && state.airTime > 0.34;

    if (!goodLanding) {
      state.landingChain = Math.max(0, state.landingChain - 1);
      return;
    }

    state.softLandings += 1;
    state.landingChain += 1;
    const routeBonus = platform.route === "high" ? 32 : platform.route === "risky" ? 42 : 18;
    const bonus = 45 + routeBonus + Math.min(5, state.landingChain) * 16;
    state.score += bonus;
    state.landingGlow = Math.max(state.landingGlow, 0.72);
    state.hint = `SOFT LAND x${state.landingChain}! 발판 중앙 착지 +${bonus}`;
    addSparks(player.x + player.w * 0.5, player.y + player.h, platform.route === "risky" ? "#ff9a6c" : "#fff4a8", 18 + Math.min(5, state.landingChain) * 3);
  }

  function collectLetters() {
    const player = state.player;
    for (const pickup of state.pickups) {
      if (pickup.taken) {
        continue;
      }
      const hit =
        player.x < pickup.x + 18 &&
        player.x + player.w > pickup.x - 18 &&
        player.y < pickup.y + 14 &&
        player.y + player.h > pickup.y - 14;
      if (!hit) {
        continue;
      }

      pickup.taken = true;
      state.pickupsCollected += 1;
      const moonLine = state.gliding && pickup.route === "high";
      const moonLineBonus = moonLine ? triggerMoonLine(pickup) : 0;
      state.pickupRoute.push({
        distance: Math.round(state.distance + pickup.x),
        type: pickup.type === "story" ? "S" : "L"
      });
      if (pickup.type === "story") {
        const storyId = pickup.storyId % storyTotal;
        state.storyThisRun.add(storyId);
        state.nextStoryIndex = (storyId + 1) % storyTotal;
        state.letters += 1;
        const routeBonus = pickup.route === "high" ? 80 : pickup.route === "risky" ? 45 : 0;
        state.score += 230 + routeBonus;
        state.hint = moonLine
          ? `MOON LINE x${state.moonLine}! ${storyLines[storyId]} +${moonLineBonus}`
          : routeBonus > 0
          ? `${storyLines[storyId]} 조각을 높은 길 보너스와 함께 찾았습니다.`
          : `${storyLines[storyId]} 조각을 찾았습니다.`;
        addSparks(pickup.x, pickup.y, "#69c8ff", moonLine ? 34 : pickup.route === "high" ? 28 : 20);
      } else {
        state.letters += 1;
        const routeBonus = pickup.route === "high" ? 60 : pickup.route === "risky" ? 35 : 0;
        state.score += 140 + routeBonus;
        state.hint = moonLine
          ? `MOON LINE x${state.moonLine}! 활강 편지 +${moonLineBonus}`
          : routeBonus > 0
          ? "높은 길 편지 보너스!"
          : "달빛 편지를 모았습니다.";
        addSparks(pickup.x, pickup.y, "#fff4a8", moonLine ? 32 : pickup.route === "high" ? 24 : 16);
      }
      unlockSkills();
    }
  }

  function triggerMoonLine(pickup) {
    state.moonLine += 1;
    state.moonLineTimer = 0.95;
    state.landingBonusReady = true;
    const bonus = 95 + state.moonLine * 24;
    state.score += bonus;
    addSparks(pickup.x, pickup.y, "#fff4a8", 18 + Math.min(state.moonLine, 6) * 4);
    return bonus;
  }

  function gradeForRun(won) {
    const allPickups = state.pickupTarget > 0 && state.pickupsCollected >= state.pickupTarget;
    if (won && state.damage === 0 && allPickups && state.storyThisRun.size >= 2) {
      return "S";
    }
    if (won && state.letters >= 6) {
      return "A";
    }
    if (won || state.letters >= 4) {
      return "B";
    }
    return "C";
  }

  function resultCardCode(stamp, won) {
    return [
      "MLR1",
      currentStage().id,
      stamp,
      Math.round(state.score),
      state.letters,
      state.storyThisRun.size,
      state.damage,
      state.pickupsCollected,
      state.pickupTarget,
      won ? "1" : "0",
      compressPickupRoute()
    ].join("-");
  }

  function compressPickupRoute() {
    return state.pickupRoute
      .slice(0, 10)
      .map((entry) => `${entry.type}${Math.max(0, entry.distance).toString(36).toUpperCase()}`)
      .join(".");
  }

  function parsePickupRoute(routeKey) {
    return String(routeKey || "")
      .split(".")
      .map((item) => {
        const type = item.slice(0, 1);
        const distance = parseInt(item.slice(1), 36);
        if (!["L", "S"].includes(type) || !Number.isFinite(distance)) {
          return null;
        }
        return { type, distance };
      })
      .filter(Boolean);
  }

  function normalizeFriendRecord(record) {
    if (!record || typeof record !== "object") {
      return null;
    }
    return {
      code: typeof record.code === "string" ? record.code : "",
      stageId: typeof record.stageId === "string" ? record.stageId : "",
      stamp: typeof record.stamp === "string" ? record.stamp : "C",
      score: Math.max(0, Number(record.score || 0)),
      letters: Math.max(0, Number(record.letters || 0)),
      stories: Math.max(0, Number(record.stories || 0)),
      damage: Math.max(0, Number(record.damage || 0)),
      pickupsCollected: Math.max(0, Number(record.pickupsCollected || 0)),
      pickupTarget: Math.max(0, Number(record.pickupTarget || 0)),
      won: Boolean(record.won),
      route: Array.isArray(record.route) ? record.route : []
    };
  }

  function parseResultCard(code) {
    const parts = String(code || "").trim().split("-");
    if (parts.length < 10 || parts[0] !== "MLR1") {
      return null;
    }
    return normalizeFriendRecord({
      code: parts.join("-"),
      stageId: parts[1],
      stamp: parts[2],
      score: Number(parts[3]),
      letters: Number(parts[4]),
      stories: Number(parts[5]),
      damage: Number(parts[6]),
      pickupsCollected: Number(parts[7]),
      pickupTarget: Number(parts[8]),
      won: parts[9] === "1",
      route: parsePickupRoute(parts[10] || "")
    });
  }

  function importFriendCard() {
    const code = window.prompt("친구의 MLR1 기록 카드 코드를 입력하세요.", state.friendRecord?.code || "");
    if (code === null) {
      return;
    }
    const record = parseResultCard(code);
    if (!record) {
      state.hint = "MLR1 기록 카드 코드만 비교할 수 있습니다.";
      updateHud();
      return;
    }
    state.friendRecord = record;
    state.progress.friendRecord = record;
    localStorage.setItem(progressStorageKey, JSON.stringify(state.progress));
    state.hint = `친구 기록 불러옴: ${record.stamp} 스탬프, 편지 ${record.letters}개`;
    updateHud();
  }

  function friendComparisonText() {
    if (!state.friendRecord) {
      return "";
    }
    const scoreDiff = Math.round(state.score) - state.friendRecord.score;
    const letterDiff = state.letters - state.friendRecord.letters;
    const damageDiff = state.damage - state.friendRecord.damage;
    const scoreText = scoreDiff >= 0 ? `점수 +${scoreDiff}` : `점수 ${scoreDiff}`;
    const letterText = letterDiff >= 0 ? `편지 +${letterDiff}` : `편지 ${letterDiff}`;
    const damageText = damageDiff <= 0 ? `피해 ${damageDiff}` : `피해 +${damageDiff}`;
    return `${scoreText}, ${letterText}, ${damageText}`;
  }

  function changeStage() {
    resetGame({ stageIndex: (state.stageIndex + 1) % stagePresets.length });
  }

  function showAlbumLine() {
    const storyIds = Array.from(new Set([...state.progress.storyIds, ...state.storyThisRun])).sort((a, b) => a - b);
    if (storyIds.length === 0) {
      state.hint = "이야기 조각을 모으면 밤 산책 앨범을 읽을 수 있습니다.";
      updateHud();
      return;
    }
    const storyId = storyIds[state.albumIndex % storyIds.length];
    state.albumIndex = (state.albumIndex + 1) % storyIds.length;
    state.albumMode = true;
    state.progress.albumIndex = state.albumIndex;
    state.hint = `이야기 ${storyId + 1}: ${storyLines[storyId]}`;
    localStorage.setItem(progressStorageKey, JSON.stringify(state.progress));
    updateHud();
  }

  function showResultCard() {
    const latest = state.resultCardCode || (state.progress.resultCards || []).slice(-1)[0];
    state.hint = latest ? `기록 카드 ${latest}` : "완주 후 무피격/전부 수집 기록 카드가 만들어집니다.";
    updateHud();
  }

  function finishGame(won = true) {
    if (state.finished) {
      return;
    }

    state.active = false;
    state.finished = true;
    resultOverlay.hidden = false;
    const stamp = gradeForRun(won);
    const bonus = (won ? 160 : 0) + state.letters * 80 + Math.max(0, 20 - state.jumps) * 18 + state.storyThisRun.size * 90;
    state.score += bonus;
    state.resultCardCode = resultCardCode(stamp, won);
    const friendCopy = friendComparisonText();
    resultKicker.textContent = won ? "Run Complete" : "Run Paused";
    resultTitle.textContent = won ? `달빛 배달 ${stamp} 스탬프` : "편지길 쉬어가기";
    resultCopy.textContent =
      `편지 ${state.letters}개, 이야기 ${state.storyThisRun.size}조각, SOFT LAND ${state.softLandings}회, 피해 ${state.damage}회입니다. ` +
      `보너스 ${bonus}점을 더해 ${Math.round(state.score)}점을 기록했어요. 카드 ${state.resultCardCode}` +
      `${friendCopy ? ` · 친구 비교 ${friendCopy}` : ""}`;
    saveProgress(stamp);
    updateHud();
  }

  function updateSparks(dt) {
    state.sparks = state.sparks.filter((spark) => {
      spark.life -= dt;
      spark.vy += 210 * dt;
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      return spark.life > 0;
    });
  }

  function updateGame(dt) {
    if (state.active) {
      const scrollSpeed = 138 + state.distance * 0.05;
      state.distance += scrollSpeed * dt * 0.08;
      state.score += dt * 5;
      spawnMore(scrollSpeed, dt);
      updatePlayer(dt);
      collectLetters();
      if (state.distance >= currentStage().finishDistance) {
        finishGame(true);
      }
    }
    updateSparks(dt);
    updateHud();
  }

  function drawPixelRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function drawBackground(time) {
    const bg = currentStage().bg;
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, bg[0]);
    gradient.addColorStop(0.54, bg[1]);
    gradient.addColorStop(1, bg[2]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    for (const star of stars) {
      ctx.globalAlpha = 0.35 + Math.sin(time * 2 + star.phase) * 0.28;
      drawPixelRect(star.x, star.y, star.size + 1, star.size + 1, "#fff9ed");
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = "#fff4a8";
    ctx.beginPath();
    ctx.arc(690, 76, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(36,49,95,0.45)";
    ctx.beginPath();
    ctx.arc(704, 66, 28, 0, Math.PI * 2);
    ctx.fill();

    drawPixelRect(0, 472, width, 48, "#203657");
  }

  function drawPlatforms() {
    for (const platform of state.platforms) {
      const topColor = platform.route === "high" ? "#fff4a8" : platform.route === "risky" ? "#ff9a6c" : "#fff9ed";
      drawPixelRect(platform.x, platform.y, platform.w, 16, topColor);
      drawPixelRect(platform.x + 8, platform.y + 5, platform.w - 16, 5, "#ffffff");
      const zoneW = clamp(platform.w * 0.34, 34, 62);
      drawPixelRect(platform.x + platform.w / 2 - zoneW / 2, platform.y - 5, zoneW, 5, platform.route === "risky" ? "#ff9a6c" : "#fff4a8");
      if (platform.route === "high") {
        for (let x = platform.x + 22; x < platform.x + platform.w - 12; x += 42) {
          drawPixelRect(x, platform.y - 10, 6, 6, "#fff4a8");
          drawPixelRect(x + 2, platform.y - 13, 2, 12, "#fff4a8");
        }
      }
      ctx.strokeStyle = "#243047";
      ctx.lineWidth = 3;
      ctx.strokeRect(platform.x, platform.y, platform.w, 16);
    }
  }

  function drawHazards(time) {
    for (const hazard of state.hazards) {
      const bob = Math.sin(time * 4 + hazard.x * 0.02) * 2;
      drawPixelRect(hazard.x, hazard.y + bob, hazard.w, hazard.h, "#e95b88");
      drawPixelRect(hazard.x + 8, hazard.y + 5 + bob, hazard.w - 16, 4, "rgba(255,255,255,0.45)");
      ctx.strokeStyle = "#243047";
      ctx.lineWidth = 3;
      ctx.strokeRect(hazard.x, hazard.y + bob, hazard.w, hazard.h);
    }
  }

  function drawPickups(time) {
    for (const pickup of state.pickups) {
      if (pickup.taken) {
        continue;
      }
      const bob = Math.sin(time * 5 + pickup.x * 0.01) * 5;
      const color = pickup.type === "story" ? "#69c8ff" : "#ffffff";
      if (pickup.route === "high") {
        ctx.globalAlpha = 0.55 + Math.sin(time * 7 + pickup.x * 0.02) * 0.2;
        ctx.strokeStyle = "#fff4a8";
        ctx.lineWidth = 2;
        ctx.strokeRect(pickup.x - 21, pickup.y - 17 + bob, 42, 34);
        ctx.globalAlpha = 1;
      }
      drawPixelRect(pickup.x - 13, pickup.y - 9 + bob, 26, 18, color);
      drawPixelRect(pickup.x - 12, pickup.y - 8 + bob, 24, 4, "#fff4a8");
      if (pickup.type === "story") {
        drawPixelRect(pickup.x - 4, pickup.y - 4 + bob, 8, 8, "#ffffff");
      }
      ctx.strokeStyle = "#243047";
      ctx.lineWidth = 3;
      ctx.strokeRect(pickup.x - 13, pickup.y - 9 + bob, 26, 18);
    }
  }

  function drawPlayer() {
    const player = state.player;
    ctx.globalAlpha = player.invuln > 0 && Math.floor(player.invuln * 10) % 2 === 0 ? 0.55 : 1;
    if (state.landingGlow > 0) {
      ctx.globalAlpha = 0.32 + state.landingGlow * 0.45;
      drawPixelRect(player.x - 10, player.y + player.h + 5, player.w + 20, 6, "#fff4a8");
      drawPixelRect(player.x - 2, player.y + player.h + 13, player.w + 4, 4, "#ffffff");
      ctx.globalAlpha = 1;
    }
    if (state.moonLineTimer > 0) {
      ctx.globalAlpha = 0.34 + state.moonLineTimer * 0.38;
      drawPixelRect(player.x - 16, player.y + 12, player.w + 32, 5, "#fff4a8");
      drawPixelRect(player.x - 10, player.y + 22, player.w + 20, 4, "#69c8ff");
      ctx.globalAlpha = 1;
    }
    drawPixelRect(player.x, player.y, player.w, player.h, "#35d7a8");
    drawPixelRect(player.x + 6, player.y + 8, 18, 8, "#fff9ed");
    drawPixelRect(player.x + 8, player.y + 24, 8, 18, "#243047");
    drawPixelRect(player.x + 19, player.y + 24, 8, 18, "#243047");
    if (state.gliding) {
      drawPixelRect(player.x - 10, player.y + 14, 50, 6, "#fff4a8");
    }
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 3;
    ctx.strokeRect(player.x, player.y, player.w, player.h);
    ctx.globalAlpha = 1;
  }

  function drawSparks() {
    for (const spark of state.sparks) {
      ctx.globalAlpha = spark.life / spark.maxLife;
      drawPixelRect(spark.x, spark.y, 5, 5, spark.color);
    }
    ctx.globalAlpha = 1;
  }

  function drawSkillPanel() {
    drawPixelRect(42, 42, 236, 108, "rgba(255,255,255,0.84)");
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 3;
    ctx.strokeRect(42, 42, 236, 108);
    ctx.fillStyle = "#526078";
    ctx.font = "900 12px ui-monospace, Consolas, monospace";
    ctx.textAlign = "left";
    ctx.fillText(`${state.stageIndex + 1}/${stagePresets.length} ${currentStage().name}`, 56, 64);
    ctx.fillStyle = "#182033";
    ctx.font = "900 14px ui-monospace, Consolas, monospace";
    const skill = state.hasGlide ? "GLIDE" : state.hasDoubleJump ? "2JUMP" : "JUMP";
    ctx.fillText(`${skill}  STORY ${new Set([...state.progress.storyIds, ...state.storyThisRun]).size}/${storyTotal}`, 56, 92);
    ctx.fillText(`PICK ${state.pickupsCollected}/${state.pickupTarget}`, 56, 116);
    const record = stageRecord();
    const noHit = record.noDamageClears > 0 ? "NOHIT" : "--";
    const allPick = record.allPickupClears > 0 ? "ALL" : "--";
    ctx.fillText(`BADGE ${noHit} ${allPick}`, 56, 140);
  }

  function drawFinishHint() {
    if (currentStage().finishDistance - state.distance > 130) {
      return;
    }

    const x = width - (currentStage().finishDistance - state.distance) * 3;
    drawPixelRect(x, 296, 18, 176, "#fff9ed");
    drawPixelRect(x + 18, 302, 74, 38, "#ffd85a");
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, 296, 18, 176);
    ctx.strokeRect(x + 18, 302, 74, 38);
  }

  function drawFriendGhost() {
    if (!state.friendRecord || !state.friendRecord.route.length) {
      return;
    }
    ctx.globalAlpha = 0.58;
    for (const entry of state.friendRecord.route) {
      const x = 140 + (entry.distance - state.distance) * 1.25;
      if (x < 0 || x > width) {
        continue;
      }
      const y = entry.type === "S" ? 164 : 210;
      drawPixelRect(x, y, 22, 16, entry.type === "S" ? "#69c8ff" : "#fff4a8");
      ctx.strokeStyle = "#243047";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, 22, 16);
    }
    ctx.globalAlpha = 1;
  }

  function currentAlbumStoryId() {
    const storyIds = Array.from(new Set([...state.progress.storyIds, ...state.storyThisRun])).sort((a, b) => a - b);
    if (!storyIds.length) {
      return -1;
    }
    return storyIds[(state.albumIndex + storyIds.length - 1) % storyIds.length];
  }

  function drawStoryAlbum() {
    if (!state.albumMode) {
      return;
    }
    const storyId = currentAlbumStoryId();
    if (storyId < 0) {
      return;
    }
    drawPixelRect(520, 54, 226, 150, "rgba(255,249,237,0.9)");
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 3;
    ctx.strokeRect(520, 54, 226, 150);
    ctx.fillStyle = "#526078";
    ctx.font = "900 12px ui-monospace, Consolas, monospace";
    ctx.textAlign = "left";
    ctx.fillText(`STORY ${storyId + 1}/${storyTotal}`, 538, 78);
    drawPixelRect(538, 92, 62, 58, storyId % 2 === 0 ? "#24315f" : "#6dd7cf");
    drawPixelRect(552, 106, 34, 20, "#fff4a8");
    drawPixelRect(566, 126, 20, 12, storyId % 3 === 0 ? "#35d7a8" : "#e95b88");
    ctx.fillStyle = "#182033";
    ctx.font = "800 13px ui-sans-serif, system-ui, sans-serif";
    const line = storyLines[storyId];
    ctx.fillText(line.slice(0, 13), 616, 110);
    ctx.fillText(line.slice(13, 26), 616, 134);
    ctx.fillText(line.slice(26), 616, 158);
  }

  function draw(time) {
    drawBackground(time);
    drawFinishHint();
    drawFriendGhost();
    drawPlatforms();
    drawHazards(time);
    drawPickups(time);
    drawPlayer();
    drawSkillPanel();
    drawStoryAlbum();
    drawSparks();
  }

  function loop(timestamp) {
    const dt = clamp((timestamp - state.lastTime) / 1000, 0, 0.04);
    state.lastTime = timestamp;
    updateGame(dt);
    draw(timestamp / 1000);
    requestAnimationFrame(loop);
  }

  canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    startAction();
  });
  canvas.addEventListener("pointerup", endAction);
  canvas.addEventListener("pointercancel", endAction);
  stageButton.addEventListener("click", changeStage);
  albumButton.addEventListener("click", showAlbumLine);
  cardButton.addEventListener("click", showResultCard);
  compareButton.addEventListener("click", importFriendCard);
  restartButton.addEventListener("click", () => resetGame({ stageIndex: state.stageIndex }));
  overlayRestartButton.addEventListener("click", () => resetGame({ stageIndex: state.stageIndex }));

  resetGame();
  requestAnimationFrame(loop);
})();
