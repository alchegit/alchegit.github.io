(() => {
  const canvas = document.getElementById("rocketCanvas");
  const ctx = canvas.getContext("2d");
  const scoreValue = document.getElementById("scoreValue");
  const timeValue = document.getElementById("timeValue");
  const mailValue = document.getElementById("mailValue");
  const speedValue = document.getElementById("speedValue");
  const hintText = document.getElementById("hintText");
  const restartButton = document.getElementById("restartButton");
  const overlayRestartButton = document.getElementById("overlayRestartButton");
  const resultOverlay = document.getElementById("resultOverlay");
  const resultKicker = document.getElementById("resultKicker");
  const resultTitle = document.getElementById("resultTitle");
  const resultCopy = document.getElementById("resultCopy");
  const controlButtons = Array.from(document.querySelectorAll("[data-control]"));
  const prevCourseButton = document.getElementById("prevCourseButton");
  const nextCourseButton = document.getElementById("nextCourseButton");
  const courseLabel = document.getElementById("courseLabel");
  const skinControls = document.getElementById("skinControls");
  const shareResultButton = document.getElementById("shareResultButton");
  const cardLikeButton = document.getElementById("cardLikeButton");

  const width = canvas.width;
  const height = canvas.height;
  const controls = { left: false, right: false, thrust: false };
  const bestStickerStorageKey = "twinkleDeliveryBestSticker:v1";
  const progressStorageKey = "twinkleDeliveryProgress:v2";
  const likedCardsStorageKey = "twinkleDeliveryLikedCards:v1";
  const fuelMax = 100;
  const softApproachRange = 158;
  const silkyGlideThreshold = 0.72;
  const courseLayouts = [
    {
      id: "moon-loop",
      name: "달빛 루프",
      time: 70,
      start: { x: 104, y: 424, angle: -0.7 },
      mailboxes: [
        { x: 656, y: 132, angle: -0.08, color: "#ffd85a", label: "A" },
        { x: 188, y: 194, angle: Math.PI * 0.52, color: "#e95b88", label: "B" },
        { x: 600, y: 400, angle: -0.38, color: "#35d7a8", label: "C" }
      ],
      planetoids: [
        { x: 398, y: 142, r: 30, color: "#6a78b8", gravity: 18, range: 150 },
        { x: 318, y: 372, r: 24, color: "#7fc9d7", gravity: 10, range: 110 },
        { x: 492, y: 280, r: 18, color: "#f4a7c0", gravity: 8, range: 90 }
      ],
      windZones: [],
      fuelStars: [
        { x: 288, y: 116 },
        { x: 146, y: 344 },
        { x: 526, y: 214 },
        { x: 702, y: 342 }
      ]
    },
    {
      id: "mint-gust",
      name: "민트 돌풍",
      time: 74,
      start: { x: 96, y: 92, angle: 0.22 },
      mailboxes: [
        { x: 684, y: 102, angle: 0.18, color: "#35d7a8", label: "A", spin: 0.35 },
        { x: 578, y: 394, angle: -0.74, color: "#ffd85a", label: "B" },
        { x: 166, y: 398, angle: Math.PI * 0.5, color: "#e95b88", label: "C", spin: -0.22 }
      ],
      planetoids: [
        { x: 354, y: 250, r: 36, color: "#7fc9d7", gravity: 34, range: 190 },
        { x: 600, y: 238, r: 22, color: "#f4a7c0", gravity: 14, range: 112 }
      ],
      windZones: [
        { x: 238, y: 54, w: 110, h: 400, vx: 42, vy: -10, color: "#35d7a8", label: "E" },
        { x: 478, y: 76, w: 92, h: 348, vx: -28, vy: 18, color: "#69c8ff", label: "W" }
      ],
      fuelStars: [
        { x: 190, y: 176 },
        { x: 436, y: 96 },
        { x: 470, y: 430 },
        { x: 690, y: 290 }
      ]
    },
    {
      id: "berry-orbit",
      name: "베리 궤도",
      time: 76,
      start: { x: 392, y: 444, angle: -Math.PI * 0.5 },
      mailboxes: [
        { x: 398, y: 94, angle: Math.PI * 0.5, color: "#e95b88", label: "A", spin: 0.28 },
        { x: 680, y: 300, angle: -0.2, color: "#69c8ff", label: "B", spin: -0.18 },
        { x: 120, y: 304, angle: Math.PI + 0.2, color: "#ffd85a", label: "C" }
      ],
      planetoids: [
        { x: 398, y: 258, r: 50, color: "#6a78b8", gravity: 48, range: 230 },
        { x: 194, y: 138, r: 20, color: "#35d7a8", gravity: 16, range: 110 },
        { x: 608, y: 142, r: 22, color: "#f4a7c0", gravity: 16, range: 110 }
      ],
      windZones: [
        { x: 60, y: 216, w: 680, h: 74, vx: 0, vy: -38, color: "#e95b88", label: "UP" }
      ],
      fuelStars: [
        { x: 260, y: 210 },
        { x: 536, y: 210 },
        { x: 256, y: 388 },
        { x: 540, y: 388 }
      ]
    },
    {
      id: "soda-satellite",
      name: "소다 위성",
      time: 78,
      start: { x: 94, y: 262, angle: 0 },
      mailboxes: [
        { x: 680, y: 260, angle: 0.02, color: "#69c8ff", label: "A", spin: 0.42 },
        { x: 414, y: 102, angle: Math.PI * 0.5, color: "#ffd85a", label: "B", spin: -0.3 },
        { x: 414, y: 418, angle: -Math.PI * 0.5, color: "#35d7a8", label: "C", spin: 0.3 }
      ],
      planetoids: [
        { x: 262, y: 148, r: 28, color: "#7fc9d7", gravity: 22, range: 150 },
        { x: 262, y: 370, r: 28, color: "#7fc9d7", gravity: 22, range: 150 },
        { x: 548, y: 260, r: 34, color: "#6a78b8", gravity: 38, range: 190 }
      ],
      windZones: [
        { x: 340, y: 174, w: 98, h: 172, vx: 36, vy: 0, color: "#69c8ff", label: "E" }
      ],
      fuelStars: [
        { x: 176, y: 88 },
        { x: 176, y: 432 },
        { x: 606, y: 112 },
        { x: 606, y: 410 }
      ]
    }
  ];
  const skinOptions = [
    { id: "cream", label: "기본", short: "CREAM", unlock: () => true, body: "#fff9ed", flame: "#ffd85a", mail: "#e95b88" },
    { id: "comet", label: "혜성", short: "COMET", unlock: (progress) => getTotalSGrades(progress) >= 1, body: "#d9fbff", flame: "#69c8ff", mail: "#ffd85a" },
    { id: "berry", label: "베리", short: "BERRY", unlock: (progress) => getBestFuelSaved(progress) >= 35, body: "#ffe0ec", flame: "#e95b88", mail: "#35d7a8" },
    { id: "map", label: "지도", short: "MAP", unlock: (progress) => getCompletedCourseCount(progress) >= 3, body: "#fff1ca", flame: "#35d7a8", mail: "#69c8ff" }
  ];
  const stickerRank = { "-": 0, B: 1, A: 2, S: 3 };
  const stars = Array.from({ length: 88 }, (_, index) => ({
    x: (index * 97) % width,
    y: (index * 53) % height,
    size: index % 4 === 0 ? 2 : 1,
    phase: (index * 0.73) % Math.PI
  }));

  let state;
  let touchZone = "";

  function resetGame() {
    const progress = loadProgress();
    const courseIndex = clamp(Number(progress.selectedCourseIndex), 0, courseLayouts.length - 1);
    const course = courseLayouts[courseIndex];
    const skin = getSelectableSkin(progress.selectedSkinId, progress);
    const courseBest = normalizeCourseBest(progress.courseBest[course.id]);
    const currentCardCode = progress.lastShareCode || "";
    state = {
      active: true,
      finished: false,
      progress,
      courseIndex,
      course,
      skin,
      score: 0,
      delivered: 0,
      perfectDeliveries: 0,
      targetIndex: 0,
      timeLeft: course.time,
      fuel: fuelMax,
      fuelCollected: 0,
      glideCharge: 0,
      glideLandings: 0,
      stampRingReady: false,
      stampRingChain: 0,
      bestStampRingChain: 0,
      stampRingHits: 0,
      stampRingFlash: 0,
      stampRing: null,
      stickers: [],
      landingLog: [],
      bestSticker: getCourseBestSticker(progress, course.id),
      ghostTrace: normalizeGhostTrace(courseBest.ghostTrace || []),
      routeTrace: [],
      traceTimer: 0,
      currentCardCode,
      cardRecord: getCardRecord(progress, currentCardCode),
      lastTime: performance.now(),
      bumpTimer: 0,
      successTimer: 0,
      hint: `${course.name} / ${skin.label} 로켓`,
      rocket: {
        x: course.start.x,
        y: course.start.y,
        angle: course.start.angle,
        vx: 0,
        vy: 0,
        trail: []
      },
      mailboxes: course.mailboxes.map((mailbox) => ({ ...mailbox, baseAngle: mailbox.angle })),
      planetoids: course.planetoids.map((planetoid) => ({ ...planetoid })),
      windZones: course.windZones.map((windZone) => ({ ...windZone })),
      fuelStars: course.fuelStars.map((star) => ({ ...star, collected: false })),
      sparkles: []
    };
    resultOverlay.hidden = true;
    renderMissionControls();
    updateHud();
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function angleDelta(a, b) {
    let delta = (a - b + Math.PI) % (Math.PI * 2) - Math.PI;
    if (delta < -Math.PI) {
      delta += Math.PI * 2;
    }
    return delta;
  }

  function updateHud() {
    const speed = Math.round(Math.hypot(state.rocket.vx, state.rocket.vy));
    scoreValue.textContent = String(Math.max(0, Math.round(state.score)));
    timeValue.textContent = String(Math.ceil(Math.max(0, state.timeLeft)));
    mailValue.textContent = `${state.delivered}/${state.mailboxes.length}`;
    speedValue.textContent = String(speed);
    hintText.textContent = state.hint;
    courseLabel.textContent = `${state.courseIndex + 1}/${courseLayouts.length}`;
  }

  function getLandingGrade(speed, angleError) {
    if (speed < 34 && angleError < 0.22) {
      return "S";
    }

    if (speed < 54 && angleError < 0.48) {
      return "A";
    }

    return "B";
  }

  function rememberSticker(grade) {
    state.stickers.push(grade);

    if (stickerRank[grade] > stickerRank[state.bestSticker]) {
      state.bestSticker = grade;
      localStorage.setItem(bestStickerStorageKey, grade);
    }
  }

  function rememberCourseResult(won) {
    const courseBest = normalizeCourseBest(state.progress.courseBest[state.course.id]);
    const bestRunSticker = state.stickers.reduce((best, grade) => (stickerRank[grade] > stickerRank[best] ? grade : best), "-");
    const fuelLeft = Math.floor(state.fuel);
    const previousSticker = courseBest.bestSticker || "-";
    const shouldSaveGhost = won && state.routeTrace.length > 8 && (
      stickerRank[bestRunSticker] > stickerRank[previousSticker] ||
      (stickerRank[bestRunSticker] === stickerRank[previousSticker] && fuelLeft >= Number(courseBest.bestFuel || 0))
    );

    courseBest.bestSticker = stickerRank[bestRunSticker] > stickerRank[courseBest.bestSticker || "-"] ? bestRunSticker : courseBest.bestSticker || "-";
    courseBest.bestFuel = Math.max(Number(courseBest.bestFuel || 0), fuelLeft);

    if (won) {
      courseBest.completions = Number(courseBest.completions || 0) + 1;
    }

    if (won && state.stickers.length > 0 && state.stickers.every((grade) => grade === "S")) {
      courseBest.sClears = Number(courseBest.sClears || 0) + 1;
    }

    if (shouldSaveGhost) {
      courseBest.ghostTrace = state.routeTrace.filter((_, index) => index % 2 === 0).slice(-70);
      courseBest.ghostSticker = bestRunSticker;
      courseBest.ghostFuel = fuelLeft;
    }

    state.progress.courseBest[state.course.id] = courseBest;
    state.progress.selectedCourseIndex = state.courseIndex;
    state.progress.selectedSkinId = state.skin.id;
    state.progress.unlockedSkinIds = getUnlockedSkinIds(state.progress);
    updateDailyProgress(won, bestRunSticker);
    saveProgress(state.progress);
  }

  function finishGame(won) {
    if (state.finished) {
      return;
    }

    state.active = false;
    state.finished = true;
    resultOverlay.hidden = false;
    rememberCourseResult(won);
    renderMissionControls();

    if (won) {
      const timeBonus = Math.ceil(state.timeLeft) * 12;
      const fuelBonus = Math.ceil(state.fuel) * 5;
      state.score += timeBonus + fuelBonus;
      resultKicker.textContent = "Delivery Complete";
      resultTitle.textContent = "별 우편 배달 완료!";
      resultCopy.textContent = `${state.course.name} 스티커 ${state.stickers.join("/")}, 활강 착륙 ${state.glideLandings}회, 우표 링 ${state.stampRingHits}회, 연료 보너스 ${fuelBonus}점, 최고 스티커 ${state.bestSticker}입니다.`;
    } else {
      resultKicker.textContent = "Delivery Closed";
      resultTitle.textContent = "오늘 우편 마감";
      resultCopy.textContent = `${state.course.name} ${state.delivered}/${state.mailboxes.length}개 배달, 활강 착륙 ${state.glideLandings}회, 우표 링 ${state.stampRingHits}회, 스티커 ${state.stickers.join("/") || "-"}, 최고 스티커 ${state.bestSticker}입니다.`;
    }

    syncResultCardRecord();
    renderMissionControls();
    updateHud();
  }

  function addSparkle(x, y, color) {
    state.sparkles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 84,
      vy: (Math.random() - 0.7) * 84,
      life: 0.65,
      maxLife: 0.65,
      color
    });
  }

  function deliverMail(target, speed, angleError) {
    const grade = getLandingGrade(speed, angleError);
    const perfect = grade === "S";
    const silkyGlide = state.glideCharge >= silkyGlideThreshold && grade !== "B";
    const stampRingBonus = state.stampRingReady ? 150 + state.stampRingChain * 45 : 0;
    const speedScore = Math.round(clamp(130 - speed, 0, 130));
    const angleScore = Math.round(clamp(80 - angleError * 90, 0, 80));
    const stickerBonus = grade === "S" ? 220 : grade === "A" ? 120 : 50;
    const perfectBonus = perfect ? 160 + state.perfectDeliveries * 40 : 0;
    const glideBonus = silkyGlide ? Math.round(120 + state.glideCharge * 150) : 0;
    const deliveryScore = 220 + speedScore + angleScore + stickerBonus + perfectBonus + glideBonus + stampRingBonus;

    state.score += deliveryScore;
    state.delivered += 1;
    state.targetIndex += 1;
    if (perfect) {
      state.perfectDeliveries += 1;
      state.fuel = Math.min(fuelMax, state.fuel + 16);
    }
    if (silkyGlide) {
      state.glideLandings += 1;
      state.fuel = Math.min(fuelMax, state.fuel + 8);
    }
    if (!state.stampRingReady) {
      state.stampRingChain = 0;
    }
    state.bestStampRingChain = Math.max(state.bestStampRingChain, state.stampRingChain);
    state.landingLog.push({
      label: target.label,
      grade,
      speed: Math.round(speed),
      angle: Number(angleError.toFixed(2)),
      glide: silkyGlide,
      stampRing: state.stampRingReady
    });
    rememberSticker(grade);
    state.successTimer = perfect ? 1.15 : 0.9;
    state.glideCharge = 0;
    state.rocket.vx *= 0.26;
    state.rocket.vy *= 0.26;
    state.hint = perfect
      ? `PERFECT DELIVERY!${silkyGlide ? " SILKY GLIDE!" : ""}${stampRingBonus ? " STAMP RING!" : ""} 우편함 ${target.label} +${deliveryScore}`
      : `${grade} 스티커${silkyGlide ? " / SILKY GLIDE" : ""}${stampRingBonus ? " / STAMP RING" : ""} / 우편함 ${target.label} +${deliveryScore}`;
    state.stampRingReady = false;
    state.stampRing = null;

    for (let i = 0; i < (perfect ? 38 : 26) + (silkyGlide ? 20 : 0); i += 1) {
      addSparkle(target.x, target.y - 10, silkyGlide && i % 2 === 0 ? "#fff9ed" : target.color);
    }

    if (state.delivered >= state.mailboxes.length) {
      finishGame(true);
    }
  }

  function updateGlideAssist(dt, target, targetDistance, currentSpeed, currentAngleError) {
    if (!target) {
      state.glideCharge = Math.max(0, state.glideCharge - dt * 2);
      return;
    }

    const rocket = state.rocket;
    const inApproach = targetDistance < softApproachRange;
    const gentleSpeed = currentSpeed < 112;
    const alignedEnough = currentAngleError < 0.82;
    const coasting = !controls.thrust;

    if (inApproach && gentleSpeed && alignedEnough && coasting) {
      state.glideCharge = clamp(state.glideCharge + dt * 1.18, 0, 1);
    } else {
      state.glideCharge = clamp(state.glideCharge - dt * (inApproach ? 0.72 : 1.8), 0, 1);
    }

    if (state.glideCharge > 0.28 && targetDistance > 1) {
      const pull = 8.5 * state.glideCharge * dt;
      rocket.vx += ((target.x - rocket.x) / targetDistance) * pull;
      rocket.vy += ((target.y - rocket.y) / targetDistance) * pull;
    }
  }

  function getRouteStartPoint() {
    if (state.targetIndex <= 0) {
      return state.course.start;
    }
    return state.mailboxes[state.targetIndex - 1] || state.course.start;
  }

  function updateStampRing(dt) {
    const target = state.mailboxes[state.targetIndex];
    if (!target || !state.active) {
      state.stampRing = null;
      return;
    }

    state.stampRingFlash = Math.max(0, state.stampRingFlash - dt);

    const start = getRouteStartPoint();
    const dx = target.x - start.x;
    const dy = target.y - start.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const offsetSign = (state.courseIndex + state.targetIndex) % 2 === 0 ? 1 : -1;
    const offset = clamp(length * 0.16, 38, 72) * offsetSign;
    const t = 0.54;
    state.stampRing = {
      x: clamp(start.x + dx * t + (-dy / length) * offset, 64, width - 64),
      y: clamp(start.y + dy * t + (dx / length) * offset, 70, height - 70),
      color: target.color
    };

    if (state.stampRingReady) {
      return;
    }

    const speed = Math.hypot(state.rocket.vx, state.rocket.vy);
    const ringDistance = Math.hypot(state.rocket.x - state.stampRing.x, state.rocket.y - state.stampRing.y);
    if (ringDistance < 31 && speed > 42 && speed < 205) {
      state.stampRingReady = true;
      state.stampRingChain += 1;
      state.bestStampRingChain = Math.max(state.bestStampRingChain, state.stampRingChain);
      state.stampRingHits += 1;
      state.stampRingFlash = 0.8;
      state.score += 90 + state.stampRingChain * 22;
      state.fuel = Math.min(fuelMax, state.fuel + 6);
      state.hint = `우표 링 x${state.stampRingChain}! 다음 착륙 보너스가 커집니다.`;
      for (let i = 0; i < 24; i += 1) {
        addSparkle(state.stampRing.x, state.stampRing.y, i % 2 === 0 ? "#ffd85a" : target.color);
      }
    }
  }

  function bumpRocket(target) {
    if (state.bumpTimer > 0) {
      return;
    }

    const rocket = state.rocket;
    const pushAngle = Math.atan2(rocket.y - target.y, rocket.x - target.x);
    const approachSpeed = Math.hypot(rocket.vx, rocket.vy);
    const angleError = Math.abs(angleDelta(rocket.angle, target.angle));
    const speed = Math.max(90, approachSpeed);
    rocket.vx = Math.cos(pushAngle) * speed * 0.55;
    rocket.vy = Math.sin(pushAngle) * speed * 0.55;
    state.bumpTimer = 0.6;
    state.score = Math.max(0, state.score - 25);
    if (approachSpeed > 92) {
      state.hint = `속도가 빨라 튕겼어요. 현재 ${Math.round(approachSpeed)}, 75 아래로 미끄러지듯 접근하세요.`;
    } else if (angleError > 0.72) {
      state.hint = "코 방향이 우편함과 어긋났어요. 흰 슬롯 방향에 로켓 앞머리를 맞춰보세요.";
    } else {
      state.hint = "중앙에서 살짝 벗어났어요. 우편함 링 가운데로 천천히 들어가세요.";
    }
    for (let i = 0; i < 12; i += 1) {
      addSparkle(target.x, target.y, i % 2 === 0 ? "#e95b88" : target.color);
    }
  }

  function collectFuelStars() {
    for (const fuelStar of state.fuelStars) {
      if (fuelStar.collected || distance(state.rocket, fuelStar) > 28) {
        continue;
      }

      fuelStar.collected = true;
      state.fuelCollected += 1;
      state.fuel = Math.min(fuelMax, state.fuel + 26);
      state.score += 95;
      state.hint = `연료 별 +${state.fuelCollected}`;

      for (let i = 0; i < 16; i += 1) {
        addSparkle(fuelStar.x, fuelStar.y, "#ffd85a");
      }
    }
  }

  function updateCourseMotion(dt) {
    for (const mailbox of state.mailboxes) {
      if (mailbox.spin) {
        mailbox.angle += mailbox.spin * dt;
      }
    }
  }

  function recordRouteTrace(dt) {
    state.traceTimer -= dt;
    if (state.traceTimer > 0) {
      return;
    }

    state.traceTimer = 0.18;
    state.routeTrace.push({
      x: Math.round(state.rocket.x),
      y: Math.round(state.rocket.y),
      a: Number(state.rocket.angle.toFixed(2))
    });
    if (state.routeTrace.length > 120) {
      state.routeTrace.shift();
    }
  }

  function applyCourseForces(dt) {
    const rocket = state.rocket;

    for (const planetoid of state.planetoids) {
      if (!planetoid.gravity) {
        continue;
      }

      const dx = planetoid.x - rocket.x;
      const dy = planetoid.y - rocket.y;
      const d = Math.max(20, Math.hypot(dx, dy));
      const range = planetoid.range || 150;

      if (d < range) {
        const pull = planetoid.gravity * (1 - d / range);
        rocket.vx += (dx / d) * pull * dt;
        rocket.vy += (dy / d) * pull * dt;
      }
    }

    for (const windZone of state.windZones) {
      if (
        rocket.x >= windZone.x &&
        rocket.x <= windZone.x + windZone.w &&
        rocket.y >= windZone.y &&
        rocket.y <= windZone.y + windZone.h
      ) {
        rocket.vx += windZone.vx * dt;
        rocket.vy += windZone.vy * dt;
        state.hint = `${windZone.label} 바람`;
      }
    }
  }

  function updateGame(dt) {
    if (!state.active) {
      state.sparkles = state.sparkles.filter((sparkle) => {
        sparkle.life -= dt;
        sparkle.x += sparkle.vx * dt;
        sparkle.y += sparkle.vy * dt;
        sparkle.vy += 50 * dt;
        return sparkle.life > 0;
      });
      return;
    }

    const rocket = state.rocket;
    const rotationSpeed = 3.75;
    const thrustPower = 190;

    state.timeLeft -= dt;
    state.bumpTimer = Math.max(0, state.bumpTimer - dt);
    state.successTimer = Math.max(0, state.successTimer - dt);
    updateCourseMotion(dt);

    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      finishGame(false);
      return;
    }

    if (controls.left) {
      rocket.angle -= rotationSpeed * dt;
    }
    if (controls.right) {
      rocket.angle += rotationSpeed * dt;
    }
    if (controls.thrust && state.fuel > 0) {
      state.fuel = Math.max(0, state.fuel - dt * 10.5);
      rocket.vx += Math.cos(rocket.angle) * thrustPower * dt;
      rocket.vy += Math.sin(rocket.angle) * thrustPower * dt;

      if (Math.random() < 0.72) {
        addSparkle(
          rocket.x - Math.cos(rocket.angle) * 19,
          rocket.y - Math.sin(rocket.angle) * 19,
          Math.random() > 0.5 ? "#ffd85a" : "#69c8ff"
        );
      }
    } else if (controls.thrust && state.fuel <= 0) {
      state.hint = "연료 별을 주워 다시 추진하세요.";
    }

    rocket.vx *= Math.pow(0.989, dt * 60);
    rocket.vy *= Math.pow(0.989, dt * 60);
    applyCourseForces(dt);

    const speed = Math.hypot(rocket.vx, rocket.vy);
    if (speed > 245) {
      rocket.vx = (rocket.vx / speed) * 245;
      rocket.vy = (rocket.vy / speed) * 245;
    }

    rocket.x += rocket.vx * dt;
    rocket.y += rocket.vy * dt;
    recordRouteTrace(dt);

    const margin = 22;
    if (rocket.x < margin || rocket.x > width - margin) {
      rocket.x = clamp(rocket.x, margin, width - margin);
      rocket.vx *= -0.48;
      state.hint = "가장자리 별 먼지에 튕겼어요. 추진을 짧게 끊어주세요.";
    }
    if (rocket.y < margin || rocket.y > height - margin) {
      rocket.y = clamp(rocket.y, margin, height - margin);
      rocket.vy *= -0.48;
      state.hint = "가장자리 별 먼지에 튕겼어요. 추진을 짧게 끊어주세요.";
    }

    for (const planetoid of state.planetoids) {
      const d = distance(rocket, planetoid);
      if (d < planetoid.r + 18) {
        const pushAngle = Math.atan2(rocket.y - planetoid.y, rocket.x - planetoid.x);
        rocket.x = planetoid.x + Math.cos(pushAngle) * (planetoid.r + 18);
        rocket.y = planetoid.y + Math.sin(pushAngle) * (planetoid.r + 18);
        rocket.vx += Math.cos(pushAngle) * 70;
        rocket.vy += Math.sin(pushAngle) * 70;
        state.hint = "작은 행성은 돌아가면 편해요. 로켓이 살짝 튕겼습니다.";
      }
    }

    collectFuelStars();
    updateStampRing(dt);

    const target = state.mailboxes[state.targetIndex];
    if (target) {
      const targetDistance = distance(rocket, target);
      const currentSpeed = Math.hypot(rocket.vx, rocket.vy);
      const currentAngleError = Math.abs(angleDelta(rocket.angle, target.angle));
      updateGlideAssist(dt, target, targetDistance, currentSpeed, currentAngleError);

      if (targetDistance < 43) {
        if (currentSpeed < 76 && currentAngleError < 0.92) {
          deliverMail(target, currentSpeed, currentAngleError);
        } else {
          bumpRocket(target);
        }
      } else if (targetDistance < 128 && currentSpeed < 95) {
        state.hint = "좋아요. 이제 우편함 방향과 로켓 코를 비슷하게 맞춰 착지하세요.";
      } else if (currentSpeed > 150) {
        state.hint = "속도가 꽤 빨라요. 추진을 쉬면서 미끄러지듯 접근해보세요.";
      }
    } else {
      updateGlideAssist(dt, null, Infinity, 0, 0);
    }

    rocket.trail.unshift({ x: rocket.x, y: rocket.y, angle: rocket.angle });
    rocket.trail = rocket.trail.slice(0, 18);

    state.sparkles = state.sparkles.filter((sparkle) => {
      sparkle.life -= dt;
      sparkle.x += sparkle.vx * dt;
      sparkle.y += sparkle.vy * dt;
      sparkle.vy += 50 * dt;
      return sparkle.life > 0;
    });

    updateHud();
  }

  function drawPixelRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function drawBackground(time) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#182033");
    gradient.addColorStop(0.58, "#25366b");
    gradient.addColorStop(1, "#314b80");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 0.14;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
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

    for (const star of stars) {
      const twinkle = 0.45 + Math.sin(time * 2.4 + star.phase) * 0.28;
      ctx.globalAlpha = clamp(twinkle, 0.18, 0.85);
      drawPixelRect(star.x, star.y, star.size + 1, star.size + 1, "#fff9ed");
    }
    ctx.globalAlpha = 1;

    ctx.fillStyle = "rgba(105, 200, 255, 0.08)";
    ctx.beginPath();
    ctx.arc(730, 470, 130, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPlanetoids() {
    for (const planetoid of state.planetoids) {
      ctx.save();
      ctx.translate(planetoid.x, planetoid.y);
      ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
      ctx.beginPath();
      ctx.arc(0, 0, planetoid.r + 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = planetoid.color;
      ctx.beginPath();
      ctx.arc(0, 0, planetoid.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(-planetoid.r * 0.5, -planetoid.r * 0.35, planetoid.r * 0.7, 5);
      ctx.restore();
    }
  }

  function drawWindZones() {
    for (const windZone of state.windZones) {
      ctx.save();
      ctx.globalAlpha = 0.26;
      ctx.fillStyle = windZone.color;
      ctx.fillRect(windZone.x, windZone.y, windZone.w, windZone.h);
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = windZone.color;
      ctx.setLineDash([8, 8]);
      ctx.strokeRect(windZone.x + 2, windZone.y + 2, windZone.w - 4, windZone.h - 4);
      ctx.setLineDash([]);
      ctx.fillStyle = "#fff9ed";
      ctx.font = "900 14px ui-monospace, Consolas, monospace";
      for (let y = windZone.y + 28; y < windZone.y + windZone.h; y += 44) {
        ctx.fillText(windZone.label, windZone.x + 14, y);
      }
      ctx.restore();
    }
  }

  function drawFuelStars(time) {
    for (const fuelStar of state.fuelStars) {
      if (fuelStar.collected) {
        continue;
      }

      const bob = Math.sin(time * 4 + fuelStar.x) * 3;
      ctx.save();
      ctx.translate(fuelStar.x, fuelStar.y + bob);
      ctx.fillStyle = "#ffd85a";
      ctx.strokeStyle = "#182033";
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let i = 0; i < 10; i += 1) {
        const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 10;
        const radius = i % 2 === 0 ? 12 : 6;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawStampRing(time) {
    if (!state.stampRing || !state.active) {
      return;
    }

    const ring = state.stampRing;
    const pulse = 1 + Math.sin(time * 5.2) * 0.07 + state.stampRingFlash * 0.08;
    ctx.save();
    ctx.translate(ring.x, ring.y);
    ctx.scale(pulse, pulse);
    ctx.globalAlpha = state.stampRingReady ? 0.62 : 0.88;
    ctx.strokeStyle = state.stampRingReady ? "#ffd85a" : ring.color;
    ctx.lineWidth = state.stampRingReady ? 5 : 4;
    ctx.setLineDash(state.stampRingReady ? [] : [7, 6]);
    ctx.beginPath();
    ctx.arc(0, 0, state.stampRingReady ? 26 : 31, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = state.stampRingReady ? 0.26 : 0.14;
    ctx.fillStyle = state.stampRingReady ? "#ffd85a" : ring.color;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#fff9ed";
    ctx.font = "900 11px ui-monospace, Consolas, monospace";
    ctx.textAlign = "center";
    ctx.fillText(state.stampRingReady ? `x${state.stampRingChain}` : "STAMP", 0, 4);
    ctx.restore();
  }

  function drawMailbox(mailbox, index, time) {
    const isTarget = index === state.targetIndex;
    const isDone = index < state.targetIndex;
    const pulse = isTarget ? 1 + Math.sin(time * 5) * 0.07 : 1;

    ctx.save();
    ctx.translate(mailbox.x, mailbox.y);
    ctx.rotate(mailbox.angle);
    ctx.scale(pulse, pulse);

    if (isTarget) {
      ctx.strokeStyle = mailbox.color;
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, 45, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#fff9ed";
      ctx.font = "900 10px ui-monospace, Consolas, monospace";
      ctx.textAlign = "center";
      ctx.fillText("SOFT <76", 0, -54);
    }

    ctx.fillStyle = "rgba(0,0,0,0.24)";
    ctx.fillRect(-24, 19, 52, 9);
    drawPixelRect(-20, -19, 40, 34, isDone ? "#9fb3c5" : mailbox.color);
    drawPixelRect(-25, -8, 50, 11, "#fff9ed");
    drawPixelRect(-5, -29, 10, 14, "#fff9ed");
    drawPixelRect(10, -24, 14, 8, isDone ? "#35d7a8" : "#e95b88");
    drawPixelRect(-11, -2, 22, 5, "#243047");
    drawPixelRect(-4, 15, 8, 18, "#243047");

    ctx.fillStyle = "#182033";
    ctx.font = "900 16px ui-monospace, Consolas, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(mailbox.label, 0, 7);
    ctx.restore();
  }

  function drawFlightVector() {
    if (!state.active) {
      return;
    }

    const rocket = state.rocket;
    const speed = Math.hypot(rocket.vx, rocket.vy);
    if (speed < 18) {
      return;
    }

    ctx.save();
    ctx.globalAlpha = 0.72;
    const vectorColor = state.glideCharge > 0.45 ? "#ffd85a" : "#69c8ff";
    for (let i = 1; i <= 8; i += 1) {
      const t = i * 0.15;
      const x = rocket.x + rocket.vx * t;
      const y = rocket.y + rocket.vy * t;
      const radius = 2 + i * 0.45;
      ctx.fillStyle = i % 2 === 0 ? "#fff9ed" : vectorColor;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawApproachGuide(time) {
    const target = state.mailboxes[state.targetIndex];
    if (!target || !state.active) {
      return;
    }

    const rocket = state.rocket;
    const targetDistance = distance(rocket, target);
    if (targetDistance > softApproachRange + 34 && state.glideCharge <= 0.01) {
      return;
    }

    const speed = Math.hypot(rocket.vx, rocket.vy);
    const angleError = Math.abs(angleDelta(rocket.angle, target.angle));
    const speedReady = speed < 112;
    const angleReady = angleError < 0.82;
    const color = speedReady && angleReady ? "#35d7a8" : speedReady ? "#ffd85a" : "#e95b88";
    const pulse = 1 + Math.sin(time * 6) * 0.04;

    ctx.save();
    ctx.translate(target.x, target.y);
    ctx.rotate(target.angle);
    ctx.globalAlpha = 0.86;
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 61 * pulse, -Math.PI * 0.35, Math.PI * 0.35);
    ctx.stroke();

    ctx.globalAlpha = 0.22;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-72, -18);
    ctx.lineTo(-25, 0);
    ctx.lineTo(-72, 18);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    if (state.glideCharge > 0.02) {
      ctx.save();
      ctx.translate(target.x, target.y);
      ctx.strokeStyle = "#fff9ed";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 72, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * state.glideCharge);
      ctx.stroke();
      ctx.fillStyle = state.glideCharge >= silkyGlideThreshold ? "#ffd85a" : "#fff9ed";
      ctx.font = "900 11px ui-monospace, Consolas, monospace";
      ctx.textAlign = "center";
      ctx.fillText(state.glideCharge >= silkyGlideThreshold ? "GLIDE" : "COAST", 0, 84);
      ctx.restore();
    }
  }

  function drawRocket() {
    const rocket = state.rocket;
    const skin = state.skin;

    rocket.trail.forEach((point, index) => {
      const alpha = (1 - index / rocket.trail.length) * 0.28;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = skin.flame;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 8 - index * 0.18, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(rocket.x, rocket.y);
    ctx.rotate(rocket.angle);

    if (controls.thrust && state.active) {
      ctx.fillStyle = skin.flame;
      ctx.beginPath();
      ctx.moveTo(-20, -8);
      ctx.lineTo(-38 - Math.random() * 8, 0);
      ctx.lineTo(-20, 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#e95b88";
      ctx.fillRect(-31, -4, 14, 8);
    }

    ctx.fillStyle = "#182033";
    ctx.fillRect(-19, -12, 34, 24);
    ctx.fillStyle = skin.body;
    ctx.fillRect(-16, -9, 28, 18);
    ctx.fillStyle = "#69c8ff";
    ctx.fillRect(0, -6, 14, 12);
    ctx.fillStyle = skin.mail;
    ctx.fillRect(-12, -17, 13, 8);
    ctx.fillRect(-12, 9, 13, 8);
    ctx.fillStyle = skin.flame;
    ctx.beginPath();
    ctx.moveTo(15, -12);
    ctx.lineTo(30, 0);
    ctx.lineTo(15, 12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#182033";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  }

  function drawGhostTrace() {
    if (!state.ghostTrace.length) {
      return;
    }

    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = "#fff9ed";
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(state.ghostTrace[0].x, state.ghostTrace[0].y);
    for (let i = 1; i < state.ghostTrace.length; i += 1) {
      ctx.lineTo(state.ghostTrace[i].x, state.ghostTrace[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    const last = state.ghostTrace[state.ghostTrace.length - 1];
    ctx.fillStyle = "#69c8ff";
    ctx.fillRect(last.x - 6, last.y - 6, 12, 12);
    ctx.strokeStyle = "#182033";
    ctx.strokeRect(last.x - 7, last.y - 7, 14, 14);
    ctx.restore();
  }

  function drawSparkles() {
    for (const sparkle of state.sparkles) {
      const alpha = sparkle.life / sparkle.maxLife;
      ctx.globalAlpha = alpha;
      drawPixelRect(sparkle.x - 2, sparkle.y, 4, 4, sparkle.color);
      drawPixelRect(sparkle.x, sparkle.y - 2, 4, 4, "#fff9ed");
    }
    ctx.globalAlpha = 1;
  }

  function drawCompass() {
    const target = state.mailboxes[state.targetIndex];
    if (!target || !state.active) {
      return;
    }

    const rocket = state.rocket;
    const angle = Math.atan2(target.y - rocket.y, target.x - rocket.x);
    ctx.save();
    ctx.translate(54, 54);
    ctx.fillStyle = "rgba(255, 249, 237, 0.86)";
    ctx.strokeStyle = "#182033";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-28, -28, 56, 56, 8);
    ctx.fill();
    ctx.stroke();
    ctx.rotate(angle);
    ctx.fillStyle = target.color;
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-8, -9);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-8, 9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function getOverlayAlpha(x, y, w, h) {
    const target = state.mailboxes[state.targetIndex];
    const points = [state.rocket, target].filter(Boolean);
    const padding = 74;
    const overlapping = points.some((point) => (
      point.x >= x - padding &&
      point.x <= x + w + padding &&
      point.y >= y - padding &&
      point.y <= y + h + padding
    ));
    return overlapping ? 0.34 : 1;
  }

  function drawRunOverlay() {
    ctx.save();
    const topX = width - 178;
    const topY = 24;
    ctx.globalAlpha = getOverlayAlpha(topX, topY, 148, 162);
    ctx.fillStyle = "rgba(255, 249, 237, 0.9)";
    ctx.strokeStyle = "#182033";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(topX, topY, 148, 74, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#526078";
    ctx.font = "900 10px ui-monospace, Consolas, monospace";
    ctx.textAlign = "left";
    ctx.fillText("FUEL", topX + 18, 46);
    ctx.fillText("BEST", topX + 96, 46);
    ctx.fillStyle = "rgba(24,32,51,0.16)";
    ctx.fillRect(topX + 18, 62, 66, 10);
    ctx.fillStyle = state.fuel > 22 ? "#35d7a8" : "#e95b88";
    ctx.fillRect(topX + 18, 62, 66 * (state.fuel / fuelMax), 10);
    ctx.strokeStyle = "#182033";
    ctx.strokeRect(topX + 18, 62, 66, 10);
    ctx.fillStyle = "#182033";
    ctx.font = "900 22px ui-monospace, Consolas, monospace";
    ctx.fillText(state.bestSticker, topX + 96, 76);

    ctx.fillStyle = "rgba(255, 249, 237, 0.9)";
    ctx.strokeStyle = "#182033";
    ctx.beginPath();
    ctx.roundRect(topX, 108, 148, 78, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#526078";
    ctx.font = "900 10px ui-monospace, Consolas, monospace";
    ctx.fillText(state.courseIndex === getDailyCourseIndex() ? "TODAY" : "COURSE", topX + 18, 130);
    ctx.fillText("SKIN", topX + 96, 130);
    ctx.fillStyle = "#182033";
    ctx.font = "900 15px ui-monospace, Consolas, monospace";
    ctx.fillText(`${state.courseIndex + 1}/${courseLayouts.length}`, topX + 18, 150);
    ctx.fillText(state.skin.short, topX + 96, 150);
    ctx.fillStyle = "#526078";
    ctx.font = "900 10px ui-monospace, Consolas, monospace";
    ctx.fillText("STREAK", topX + 18, 174);
    ctx.fillText("GHOST", topX + 96, 174);
    ctx.fillStyle = "#182033";
    ctx.font = "900 13px ui-monospace, Consolas, monospace";
    ctx.fillText(`${getDailyProgress(state.progress).streak}S`, topX + 18, 181);
    ctx.fillText(getGhostLabel(), topX + 96, 181);
    ctx.globalAlpha = 1;

    ctx.fillStyle = "rgba(255, 249, 237, 0.9)";
    ctx.strokeStyle = "#182033";
    ctx.beginPath();
    ctx.roundRect(24, height - 92, 246, 64, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#526078";
    ctx.font = "900 10px ui-monospace, Consolas, monospace";
    ctx.fillText("STICKERS", 42, height - 68);
    ctx.fillText("WEEK", 150, height - 68);
    ctx.fillStyle = "#182033";
    ctx.font = "900 18px ui-monospace, Consolas, monospace";
    ctx.fillText(state.stickers.join("/") || "-", 42, height - 42);
    ctx.font = "900 13px ui-monospace, Consolas, monospace";
    ctx.fillText(getWeekStickerMarks(state.progress).join(""), 150, height - 42);
    ctx.restore();
  }

  function draw(time) {
    drawBackground(time);
    drawWindZones();
    drawPlanetoids();
    drawFuelStars(time);
    drawStampRing(time);
    state.mailboxes.forEach((mailbox, index) => drawMailbox(mailbox, index, time));
    drawApproachGuide(time);
    drawFlightVector();
    drawSparkles();
    drawGhostTrace();
    drawRocket();
    drawCompass();
    drawRunOverlay();

    if (state.successTimer > 0) {
      ctx.globalAlpha = clamp(state.successTimer, 0, 1);
      ctx.fillStyle = "#fff9ed";
      ctx.font = "900 24px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(state.perfectDeliveries > 0 ? "PERFECT!" : "STAMP!", width / 2, 74);
      ctx.globalAlpha = 1;
    }
  }

  function loop(timestamp) {
    const dt = clamp((timestamp - state.lastTime) / 1000, 0, 0.04);
    state.lastTime = timestamp;
    updateGame(dt);
    draw(timestamp / 1000);
    requestAnimationFrame(loop);
  }

  function setControl(control, active) {
    controls[control] = active;
    controlButtons
      .filter((button) => button.dataset.control === control)
      .forEach((button) => button.classList.toggle("is-active", active));
  }

  function setTouchZone(nextZone) {
    if (touchZone === nextZone) {
      return;
    }
    touchZone = nextZone;
    setControl("left", nextZone === "left");
    setControl("right", nextZone === "right");
    setControl("thrust", nextZone === "thrust");
  }

  function updateTouchZone(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const third = rect.width / 3;
    if (x < third) {
      setTouchZone("left");
    } else if (x > third * 2) {
      setTouchZone("right");
    } else {
      setTouchZone("thrust");
    }
  }

  function clearTouchZone() {
    setTouchZone("");
  }

  function getDailyCourseIndex() {
    const now = new Date();
    const key = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    let total = 0;
    for (let i = 0; i < key.length; i += 1) {
      total += key.charCodeAt(i) * (i + 1);
    }
    return total % courseLayouts.length;
  }

  function loadProgress() {
    const defaultProgress = {
      selectedCourseIndex: getDailyCourseIndex(),
      selectedSkinId: "cream",
      courseBest: {},
      unlockedSkinIds: ["cream"],
      lastShareCode: "",
      daily: { streak: 0, lastSDate: "", week: {} },
      cardStats: {}
    };

    try {
      const parsed = JSON.parse(localStorage.getItem(progressStorageKey) || "{}");
      const progress = {
        ...defaultProgress,
        ...parsed,
        courseBest: typeof parsed.courseBest === "object" && parsed.courseBest ? parsed.courseBest : {},
        unlockedSkinIds: Array.isArray(parsed.unlockedSkinIds) ? parsed.unlockedSkinIds : ["cream"],
        daily: typeof parsed.daily === "object" && parsed.daily ? parsed.daily : { streak: 0, lastSDate: "", week: {} },
        cardStats: typeof parsed.cardStats === "object" && parsed.cardStats ? parsed.cardStats : {}
      };
      const legacySticker = localStorage.getItem(bestStickerStorageKey) || "-";
      if (legacySticker !== "-" && !progress.courseBest[courseLayouts[0].id]) {
        progress.courseBest[courseLayouts[0].id] = { bestSticker: legacySticker, bestFuel: 0, sClears: legacySticker === "S" ? 1 : 0, completions: 1 };
      }

      for (const course of courseLayouts) {
        progress.courseBest[course.id] = normalizeCourseBest(progress.courseBest[course.id]);
      }

      progress.selectedCourseIndex = clamp(Number(progress.selectedCourseIndex), 0, courseLayouts.length - 1);
      progress.lastShareCode = typeof progress.lastShareCode === "string" ? progress.lastShareCode : "";
      progress.daily = normalizeDailyProgress(progress.daily);
      progress.cardStats = normalizeCardStats(progress.cardStats);
      progress.unlockedSkinIds = getUnlockedSkinIds(progress);
      progress.selectedSkinId = getSelectableSkin(progress.selectedSkinId, progress).id;
      saveProgress(progress);
      return progress;
    } catch (error) {
      saveProgress(defaultProgress);
      return defaultProgress;
    }
  }

  function normalizeCourseBest(best) {
    const safe = typeof best === "object" && best ? best : {};
    const bestSticker = stickerRank[safe.bestSticker] ? safe.bestSticker : "-";
    return {
      bestSticker,
      bestFuel: clamp(Number(safe.bestFuel || 0), 0, fuelMax),
      sClears: Math.max(0, Number(safe.sClears || 0)),
      completions: Math.max(0, Number(safe.completions || 0)),
      ghostTrace: normalizeGhostTrace(safe.ghostTrace || []),
      ghostSticker: stickerRank[safe.ghostSticker] ? safe.ghostSticker : "-",
      ghostFuel: clamp(Number(safe.ghostFuel || 0), 0, fuelMax)
    };
  }

  function saveProgress(progress) {
    localStorage.setItem(progressStorageKey, JSON.stringify(progress));
  }

  function normalizeGhostTrace(points) {
    if (!Array.isArray(points)) {
      return [];
    }

    return points
      .slice(-80)
      .map((point) => ({
        x: Math.round(clamp(Number(point.x), 0, width)),
        y: Math.round(clamp(Number(point.y), 0, height)),
        a: Number(point.a || 0)
      }))
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
  }

  function normalizeDailyProgress(daily) {
    const safe = typeof daily === "object" && daily ? daily : {};
    const week = typeof safe.week === "object" && safe.week ? safe.week : {};
    const normalizedWeek = {};
    for (const [date, sticker] of Object.entries(week)) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        normalizedWeek[date] = stickerRank[sticker] ? sticker : "-";
      }
    }
    return {
      streak: Math.max(0, Number(safe.streak || 0)),
      lastSDate: typeof safe.lastSDate === "string" ? safe.lastSDate : "",
      week: normalizedWeek
    };
  }

  function normalizeCardStats(stats) {
    const safe = typeof stats === "object" && stats ? stats : {};
    return Object.fromEntries(Object.entries(safe).map(([code, record]) => [code, {
      shares: Math.max(0, Number(record?.shares || 0)),
      likes: Math.max(0, Number(record?.likes || 0)),
      bestScore: Math.max(0, Number(record?.bestScore || 0))
    }]));
  }

  function getDateKey(offsetDays = 0) {
    const date = new Date();
    date.setDate(date.getDate() + offsetDays);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function updateDailyProgress(won, bestRunSticker) {
    if (state.courseIndex !== getDailyCourseIndex() || !won) {
      return;
    }

    const daily = normalizeDailyProgress(state.progress.daily);
    const today = getDateKey();
    const previous = daily.week[today] || "-";
    daily.week[today] = stickerRank[bestRunSticker] > stickerRank[previous] ? bestRunSticker : previous;

    if (bestRunSticker === "S" && daily.lastSDate !== today) {
      daily.streak = daily.lastSDate === getDateKey(-1) ? daily.streak + 1 : 1;
      daily.lastSDate = today;
    }

    const keep = new Set(Array.from({ length: 14 }, (_, index) => getDateKey(-index)));
    for (const date of Object.keys(daily.week)) {
      if (!keep.has(date)) {
        delete daily.week[date];
      }
    }
    state.progress.daily = daily;
  }

  function getDailyProgress(progress) {
    progress.daily = normalizeDailyProgress(progress.daily);
    return progress.daily;
  }

  function getWeekStickerMarks(progress) {
    const daily = getDailyProgress(progress);
    return Array.from({ length: 7 }, (_, index) => {
      const sticker = daily.week[getDateKey(index - 6)] || "-";
      return sticker === "-" ? "·" : sticker;
    });
  }

  function getGhostLabel() {
    const courseBest = normalizeCourseBest(state.progress.courseBest[state.course.id]);
    return courseBest.ghostTrace.length ? `${courseBest.ghostSticker}${Math.round(courseBest.ghostFuel)}` : "--";
  }

  function buildResultCardCode() {
    const payload = {
      v: 1,
      c: state.course.id,
      s: state.stickers.join("") || "-",
      f: Math.floor(state.fuel),
      skin: state.skin.id,
      score: Math.max(0, Math.round(state.score)),
      streak: getDailyProgress(state.progress).streak
    };
    return `TDR1-${btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
  }

  function getCardRecord(progress, code) {
    progress.cardStats = normalizeCardStats(progress.cardStats);
    if (!code) {
      return { shares: 0, likes: 0, bestScore: 0 };
    }
    const record = progress.cardStats[code] || { shares: 0, likes: 0, bestScore: 0 };
    progress.cardStats[code] = record;
    return record;
  }

  function syncResultCardRecord() {
    const code = buildResultCardCode();
    const record = getCardRecord(state.progress, code);
    record.bestScore = Math.max(record.bestScore, Math.max(0, Math.round(state.score)));
    state.currentCardCode = code;
    state.cardRecord = record;
    state.progress.lastShareCode = code;
    saveProgress(state.progress);
  }

  function getLikedCards() {
    try {
      const parsed = JSON.parse(localStorage.getItem(likedCardsStorageKey) || "[]");
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      return new Set();
    }
  }

  function saveLikedCards(liked) {
    localStorage.setItem(likedCardsStorageKey, JSON.stringify([...liked].slice(-160)));
  }

  function getCourseBestSticker(progress, courseId) {
    const courseBest = normalizeCourseBest(progress.courseBest[courseId]);
    const legacySticker = localStorage.getItem(bestStickerStorageKey) || "-";
    return stickerRank[courseBest.bestSticker] >= stickerRank[legacySticker] ? courseBest.bestSticker : legacySticker;
  }

  function getTotalSGrades(progress) {
    return Object.values(progress.courseBest || {}).reduce((sum, best) => sum + Number(normalizeCourseBest(best).sClears || 0), 0);
  }

  function getBestFuelSaved(progress) {
    return Object.values(progress.courseBest || {}).reduce((bestFuel, best) => Math.max(bestFuel, Number(normalizeCourseBest(best).bestFuel || 0)), 0);
  }

  function getCompletedCourseCount(progress) {
    return Object.values(progress.courseBest || {}).filter((best) => Number(normalizeCourseBest(best).completions || 0) > 0).length;
  }

  function getUnlockedSkinIds(progress) {
    return skinOptions.filter((skin) => skin.unlock(progress)).map((skin) => skin.id);
  }

  function getSelectableSkin(skinId, progress) {
    const unlockedSkinIds = getUnlockedSkinIds(progress);
    const skin = skinOptions.find((option) => option.id === skinId && unlockedSkinIds.includes(option.id));
    return skin || skinOptions[0];
  }

  function renderMissionControls() {
    courseLabel.textContent = `${state.courseIndex + 1}/${courseLayouts.length}`;
    skinControls.innerHTML = skinOptions.map((skin) => {
      const unlocked = getUnlockedSkinIds(state.progress).includes(skin.id);
      const selected = skin.id === state.skin.id;
      const label = unlocked ? skin.label : "잠김";
      return `<button class="skin-button${selected ? " is-selected" : ""}" type="button" data-skin="${skin.id}" ${unlocked ? "" : "disabled"}>${label}</button>`;
    }).join("");

    for (const button of skinControls.querySelectorAll("[data-skin]")) {
      button.addEventListener("click", () => selectSkin(button.dataset.skin));
    }

    shareResultButton.title = state.progress.lastShareCode || "현재 결과 카드 코드";
    const code = state.currentCardCode || state.progress.lastShareCode || "";
    state.cardRecord = getCardRecord(state.progress, code);
    const liked = code ? getLikedCards().has(code) : false;
    cardLikeButton.textContent = `응원 ${state.cardRecord.likes}`;
    cardLikeButton.classList.toggle("is-selected", liked);
    cardLikeButton.title = code
      ? liked ? "이미 응원한 결과 카드입니다." : "현재 결과 카드를 한 번 응원합니다."
      : "배달 결과가 나온 뒤 응원할 수 있습니다.";
    cardLikeButton.disabled = !code;
  }

  function selectCourse(direction) {
    const progress = loadProgress();
    progress.selectedCourseIndex = (clamp(Number(progress.selectedCourseIndex), 0, courseLayouts.length - 1) + direction + courseLayouts.length) % courseLayouts.length;
    saveProgress(progress);
    resetGame();
  }

  function selectSkin(skinId) {
    const progress = loadProgress();
    const skin = getSelectableSkin(skinId, progress);
    progress.selectedSkinId = skin.id;
    saveProgress(progress);
    resetGame();
  }

  function shareResultCard() {
    const code = buildResultCardCode();
    const record = getCardRecord(state.progress, code);
    record.shares += 1;
    record.bestScore = Math.max(record.bestScore, Math.max(0, Math.round(state.score)));
    state.currentCardCode = code;
    state.cardRecord = record;
    state.progress.lastShareCode = code;
    saveProgress(state.progress);
    renderMissionControls();

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code).then(() => {
        state.hint = "결과 카드 코드가 복사됐습니다.";
        updateHud();
      }).catch(() => {
        window.prompt("결과 카드 코드", code);
      });
    } else {
      window.prompt("결과 카드 코드", code);
    }
  }

  function likeResultCard() {
    const code = state.currentCardCode || state.progress.lastShareCode || buildResultCardCode();
    if (!code) {
      state.hint = "배달 결과가 나온 뒤 응원할 수 있습니다.";
      updateHud();
      return;
    }

    const liked = getLikedCards();
    if (liked.has(code)) {
      state.hint = "이미 응원한 결과 카드입니다.";
      updateHud();
      return;
    }

    const record = getCardRecord(state.progress, code);
    record.likes += 1;
    record.bestScore = Math.max(record.bestScore, Math.max(0, Math.round(state.score)));
    state.currentCardCode = code;
    state.cardRecord = record;
    state.progress.lastShareCode = code;
    saveProgress(state.progress);
    liked.add(code);
    saveLikedCards(liked);
    state.hint = `결과 카드를 응원했습니다. ${record.likes}개`;
    renderMissionControls();
    updateHud();
  }

  canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    updateTouchZone(event);
    if (canvas.setPointerCapture) {
      canvas.setPointerCapture(event.pointerId);
    }
  });
  canvas.addEventListener("pointermove", (event) => {
    if (touchZone) {
      updateTouchZone(event);
    }
  });
  canvas.addEventListener("pointerup", clearTouchZone);
  canvas.addEventListener("pointercancel", clearTouchZone);

  controlButtons.forEach((button) => {
    const control = button.dataset.control;
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      setControl(control, true);
    });
    button.addEventListener("pointerup", () => setControl(control, false));
    button.addEventListener("pointercancel", () => setControl(control, false));
    button.addEventListener("lostpointercapture", () => setControl(control, false));
  });

  restartButton.addEventListener("click", resetGame);
  overlayRestartButton.addEventListener("click", resetGame);
  prevCourseButton.addEventListener("click", () => selectCourse(-1));
  nextCourseButton.addEventListener("click", () => selectCourse(1));
  shareResultButton.addEventListener("click", shareResultCard);
  cardLikeButton.addEventListener("click", likeResultCard);

  resetGame();
  requestAnimationFrame(loop);
})();
