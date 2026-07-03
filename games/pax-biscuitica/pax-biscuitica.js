(() => {
  const canvas = document.getElementById("fleetCanvas");
  const ctx = canvas.getContext("2d");
  const enemyBaseValue = document.getElementById("enemyBaseValue");
  const playerBaseValue = document.getElementById("playerBaseValue");
  const doughValue = document.getElementById("doughValue");
  const scoreValue = document.getElementById("scoreValue");
  const hintText = document.getElementById("hintText");
  const spawnButton = document.getElementById("spawnButton");
  const restartButton = document.getElementById("restartButton");
  const overlayRestartButton = document.getElementById("overlayRestartButton");
  const resultOverlay = document.getElementById("resultOverlay");
  const resultKicker = document.getElementById("resultKicker");
  const resultTitle = document.getElementById("resultTitle");
  const resultCopy = document.getElementById("resultCopy");
  const laneButtons = Array.from(document.querySelectorAll("[data-lane]"));
  const prevRegionButton = document.getElementById("prevRegionButton");
  const nextRegionButton = document.getElementById("nextRegionButton");
  const regionLabel = document.getElementById("regionLabel");
  const styleButton = document.getElementById("styleButton");
  const shareBattleButton = document.getElementById("shareBattleButton");
  const battleLikeButton = document.getElementById("battleLikeButton");

  const width = canvas.width;
  const height = canvas.height;
  const playerBase = { x: 96, y: 268, r: 46 };
  const enemyBase = { x: 704, y: 268, r: 46 };
  const lanes = [
    { id: "top", label: "상", y: 212 },
    { id: "bottom", label: "하", y: 324 }
  ];
  const island = { x: 400, y: 268, r: 46 };
  const sweetZone = { start: 0.42, end: 0.62 };
  const bestStreakStorageKey = "paxBiscuiticaBestBakeStreak:v1";
  const progressStorageKey = "paxBiscuiticaProgress:v2";
  const likedBattlesStorageKey = "paxBiscuiticaLikedBattles:v1";
  const unitTypes = {
    crisp: { label: "바삭", cost: 18, hp: 20, damage: 4.2, speed: 62, radius: 13, range: 34, color: "#dfaa66" },
    shield: { label: "크림", cost: 28, hp: 46, damage: 3.1, speed: 34, radius: 18, range: 38, color: "#fff1d6" },
    sniper: { label: "잼", cost: 34, hp: 18, damage: 8.4, speed: 42, radius: 12, range: 78, color: "#e95b88" }
  };
  const regions = [
    { id: "jam-strait", name: "잼 해협", enemyRate: 1, doughRate: 14, islandBonus: 16, costMul: {} },
    { id: "cream-reef", name: "크림 암초", enemyRate: 0.92, doughRate: 13, islandBonus: 20, costMul: { shield: 0.82 } },
    { id: "pepper-current", name: "후추 해류", enemyRate: 1.18, doughRate: 15, islandBonus: 24, costMul: { sniper: 0.9 } }
  ];
  const fleetStyles = [
    { id: "classic", label: "기본", short: "BASIC", unlockWins: 0, hpMul: 1, damageMul: 1, speedMul: 1, accent: "#dfaa66" },
    { id: "mint", label: "민트", short: "MINT", unlockWins: 2, hpMul: 1, damageMul: 1, speedMul: 1.08, accent: "#35d7a8" },
    { id: "cocoa", label: "코코아", short: "COCOA", unlockWins: 4, hpMul: 1.1, damageMul: 1.06, speedMul: 0.95, accent: "#8a5a44" }
  ];

  let state;

  function resetGame() {
    const progress = loadProgress();
    const regionIndex = clamp(Number(progress.selectedRegionIndex || 0), 0, regions.length - 1);
    const style = getSelectableStyle(progress.selectedStyleId, progress);
    state = {
      active: true,
      finished: false,
      progress,
      regionIndex,
      region: regions[regionIndex],
      style,
      selectedLane: progress.selectedLane || "top",
      lastTime: performance.now(),
      elapsed: 0,
      score: 0,
      dough: 62,
      playerHp: 100,
      enemyHp: 100,
      enemyTimer: 1.6,
      spawnCooldown: 0,
      bakeHolding: false,
      bakePressStart: 0,
      bakeHold: 0,
      bakeStreak: 0,
      bestBakeStreak: Number(localStorage.getItem(bestStreakStorageKey) || 0),
      tempoTimer: 0,
      islandOwner: null,
      islandTimer: 0,
      islandBuffTimer: 0,
      islandBuffLabel: "",
      nextId: 1,
      units: [],
      splashes: [],
      currentBattleCode: progress.lastBattleCode || "",
      battleRecord: getBattleRecord(progress, progress.lastBattleCode || ""),
      hint: `${regions[regionIndex].name} / ${laneLabel(progress.selectedLane || "top")} 항로`
    };
    resultOverlay.hidden = true;
    syncLaneButtons();
    syncStyleButton();
    renderRegionControls();
    updateHud();
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function meterValue() {
    return (Math.sin(state.elapsed * 3.25) + 1) / 2;
  }

  function isSweet(value = meterValue()) {
    return value >= sweetZone.start && value <= sweetZone.end;
  }

  function updateHud() {
    enemyBaseValue.textContent = String(Math.ceil(Math.max(0, state.enemyHp)));
    playerBaseValue.textContent = String(Math.ceil(Math.max(0, state.playerHp)));
    doughValue.textContent = String(Math.floor(state.dough));
    scoreValue.textContent = String(Math.max(0, Math.round(state.score)));
    hintText.textContent = state.hint;
    spawnButton.classList.toggle("is-hot", state.active && isSweet() && state.dough >= 22);
    spawnButton.textContent = state.bakeHolding ? unitTypes[typeFromHold(state.bakeHold)].label : "굽기";
  }

  function unit(side, power = 1, typeId = "crisp", laneId = state.selectedLane) {
    const id = state.nextId;
    state.nextId += 1;
    const lane = lanes.find((item) => item.id === laneId) || lanes[0];
    const offset = Math.sin(id * 2.13) * 12;
    const player = side === "player";
    const type = player ? unitTypes[typeId] : unitTypes.crisp;
    const tempo = player && state.tempoTimer > 0 ? 1.18 : 1;
    const style = player ? state.style : fleetStyles[0];
    const islandBuff = player && state.islandBuffTimer > 0 ? 1.12 : 1;
    const enemyBoost = player ? 1 : state.region.enemyRate;
    return {
      id,
      side,
      laneId: lane.id,
      typeId: player ? typeId : "jam",
      label: player ? type.label : "잼",
      color: player ? tintUnitColor(type.color, style.accent) : "#e95b88",
      x: player ? playerBase.x + 54 : enemyBase.x - 54,
      y: lane.y + offset,
      vx: 0,
      hp: player ? type.hp * power * style.hpMul : 30 * enemyBoost,
      maxHp: player ? type.hp * power * style.hpMul : 30 * enemyBoost,
      damage: player ? type.damage * power * tempo * style.damageMul * islandBuff : 5.2 * enemyBoost,
      speed: player ? type.speed * tempo * style.speedMul * islandBuff : 31 * enemyBoost,
      radius: player ? type.radius + power * 1.3 : 16,
      range: player ? type.range : 36,
      attackTimer: 0,
      islandClaimed: false,
      power
    };
  }

  function typeFromHold(seconds) {
    if (seconds > 1.05) {
      return "sniper";
    }

    if (seconds > 0.42) {
      return "shield";
    }

    return "crisp";
  }

  function unitCost(typeId) {
    const type = unitTypes[typeId];
    const multiplier = state.region.costMul[typeId] || 1;
    return Math.round(type.cost * multiplier);
  }

  function spawnPlayerUnit(holdSeconds = 0) {
    if (!state.active || state.spawnCooldown > 0) {
      return;
    }

    const typeId = typeFromHold(holdSeconds);
    const type = unitTypes[typeId];
    const cost = unitCost(typeId);

    if (state.dough < cost) {
      state.hint = "반죽이 조금 부족해요. 잠깐만 기다리면 다시 구울 수 있습니다.";
      updateHud();
      return;
    }

    const meter = meterValue();
    const sweet = isSweet(meter);
    const timingBonus = sweet ? 1.65 : 0.85 + meter * 0.55;
    state.dough -= cost;
    state.spawnCooldown = 0.28;
    state.units.push(unit("player", timingBonus, typeId, state.selectedLane));
    if (sweet) {
      state.bakeStreak += 1;
      state.bestBakeStreak = Math.max(state.bestBakeStreak, state.bakeStreak);
      localStorage.setItem(bestStreakStorageKey, String(state.bestBakeStreak));
      if (state.bakeStreak >= 3) {
        state.tempoTimer = 6;
      }
    } else {
      state.bakeStreak = 0;
    }
    state.score += sweet ? 35 + state.bakeStreak * 12 : 12;
    state.hint = sweet
      ? `${type.label} 함대 완벽 굽기 x${state.bakeStreak}`
      : `${type.label} 함대 출항`;
    addSplash(playerBase.x + 55, laneY(state.selectedLane), "#ffd85a", 10);
    updateHud();
  }

  function spawnEnemyUnit() {
    const laneId = Math.random() > 0.5 ? "top" : "bottom";
    state.units.push(unit("enemy", 1, "crisp", laneId));
    addSplash(enemyBase.x - 55, laneY(laneId), "#e95b88", 8);
  }

  function addSplash(x, y, color, count = 8) {
    for (let i = 0; i < count; i += 1) {
      state.splashes.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 95,
        vy: (Math.random() - 0.8) * 85,
        life: 0.7,
        maxLife: 0.7,
        color
      });
    }
  }

  function nearestEnemy(unitToCheck) {
    let best = null;
    let bestDistance = Infinity;
    for (const candidate of state.units) {
      if (candidate.side === unitToCheck.side || candidate.hp <= 0) {
        continue;
      }
      if (candidate.laneId !== unitToCheck.laneId) {
        continue;
      }
      const d = Math.hypot(candidate.x - unitToCheck.x, candidate.y - unitToCheck.y);
      if (d < bestDistance) {
        best = candidate;
        bestDistance = d;
      }
    }
    return { unit: best, distance: bestDistance };
  }

  function attack(attacker, target, dt) {
    attacker.attackTimer -= dt;
    if (attacker.attackTimer > 0) {
      return;
    }

    attacker.attackTimer = 0.5;
    target.hp -= attacker.damage;
    addSplash((attacker.x + target.x) / 2, (attacker.y + target.y) / 2, attacker.side === "player" ? "#dfaa66" : "#e95b88", 5);
    if (target.hp <= 0 && attacker.side === "player") {
      state.score += 48;
    }
  }

  function damageBase(unitToUse) {
    if (unitToUse.side === "player") {
      state.enemyHp -= unitToUse.damage * 1.8;
      state.score += 35;
      addSplash(enemyBase.x, unitToUse.y, "#ffd85a", 12);
      state.hint = "잼 기지에 비스킷 함대가 도착했습니다!";
    } else {
      state.playerHp -= unitToUse.damage * 1.7;
      addSplash(playerBase.x, unitToUse.y, "#e95b88", 12);
      state.hint = "잼 함대가 우리 기지에 닿았습니다. 다음 굽기를 서둘러요.";
    }
    unitToUse.hp = 0;
  }

  function updateUnits(dt) {
    for (const unitToMove of state.units) {
      if (unitToMove.hp <= 0) {
        continue;
      }

      const enemy = nearestEnemy(unitToMove);
      if (enemy.unit && enemy.distance < unitToMove.radius + enemy.unit.radius + unitToMove.range) {
        attack(unitToMove, enemy.unit, dt);
        continue;
      }

      const direction = unitToMove.side === "player" ? 1 : -1;
      unitToMove.x += direction * unitToMove.speed * dt;
      unitToMove.y += Math.sin(state.elapsed * 2 + unitToMove.id) * 4 * dt;
      updateIslandBonus(unitToMove);

      if (unitToMove.side === "player" && unitToMove.x > enemyBase.x - enemyBase.r) {
        damageBase(unitToMove);
      }
      if (unitToMove.side === "enemy" && unitToMove.x < playerBase.x + playerBase.r) {
        damageBase(unitToMove);
      }
    }

    state.units = state.units.filter((fleetUnit) => fleetUnit.hp > 0);
  }

  function updateIslandBonus(fleetUnit) {
    if (fleetUnit.islandClaimed || Math.hypot(fleetUnit.x - island.x, fleetUnit.y - island.y) > island.r + fleetUnit.radius) {
      return;
    }

    fleetUnit.islandClaimed = true;
    state.islandOwner = fleetUnit.side;
    state.islandTimer = 4;

    if (fleetUnit.side === "player") {
      state.dough = clamp(state.dough + state.region.islandBonus, 0, 100);
      state.islandBuffTimer = 7;
      state.islandBuffLabel = `${laneLabel(fleetUnit.laneId)} 섬 버프`;
      state.score += 90;
      state.hint = `중앙 보너스 섬 확보 +${state.region.islandBonus}, 함대 버프`;
      addSplash(island.x, island.y, "#ffd85a", 14);
    } else {
      state.playerHp -= 3;
      state.hint = "잼 함대가 중앙 섬을 지나 압박합니다.";
      addSplash(island.x, island.y, "#e95b88", 12);
    }
  }

  function updateSplashes(dt) {
    state.splashes = state.splashes.filter((splash) => {
      splash.life -= dt;
      splash.vy += 90 * dt;
      splash.x += splash.vx * dt;
      splash.y += splash.vy * dt;
      return splash.life > 0;
    });
  }

  function finishGame(won) {
    if (state.finished) {
      return;
    }

    state.active = false;
    state.finished = true;
    resultOverlay.hidden = false;

    if (won) {
      const bonus = Math.round(state.playerHp * 4 + state.dough * 2);
      state.score += bonus;
      syncBattleRecord(won);
      resultKicker.textContent = "Treaty Signed";
      resultTitle.textContent = "비스킷 항로 확보!";
      resultCopy.textContent = `${state.region.name} 확보, ${state.style.label} 함대, 최고 굽기 x${state.bestBakeStreak}, 응원 ${state.battleRecord.likes}개입니다.`;
    } else {
      syncBattleRecord(won);
      resultKicker.textContent = "Treaty Broken";
      resultTitle.textContent = "잼 항로 방어 실패";
      resultCopy.textContent = `${state.region.name} 잼 기지 ${Math.ceil(Math.max(0, state.enemyHp))}, 최고 굽기 x${state.bestBakeStreak}, 점수 ${Math.round(state.score)}점입니다.`;
    }

    rememberBattleResult(won);
    renderRegionControls();
    updateHud();
  }

  function rememberBattleResult(won) {
    const record = state.progress.regionRecords[state.region.id] || { wins: 0, bestScore: 0, bestStreak: 0 };
    if (won) {
      record.wins += 1;
    }
    record.bestScore = Math.max(record.bestScore, Math.round(state.score));
    record.bestStreak = Math.max(record.bestStreak, state.bestBakeStreak);
    state.progress.regionRecords[state.region.id] = record;
    state.progress.selectedRegionIndex = state.regionIndex;
    state.progress.selectedLane = state.selectedLane;
    state.progress.selectedStyleId = state.style.id;
    state.progress.unlockedStyleIds = getUnlockedStyleIds(state.progress);
    saveProgress(state.progress);
  }

  function updateGame(dt) {
    if (!state.active) {
      updateSplashes(dt);
      return;
    }

    state.elapsed += dt;
    state.spawnCooldown = Math.max(0, state.spawnCooldown - dt);
    state.tempoTimer = Math.max(0, state.tempoTimer - dt);
    state.islandBuffTimer = Math.max(0, state.islandBuffTimer - dt);
    if (state.bakeHolding) {
      state.bakeHold = (performance.now() - state.bakePressStart) / 1000;
    }
    state.islandTimer = Math.max(0, state.islandTimer - dt);
    state.dough = clamp(state.dough + dt * state.region.doughRate, 0, 100);
    state.enemyTimer -= dt;

    if (state.enemyTimer <= 0) {
      spawnEnemyUnit();
      state.enemyTimer = (2.1 + Math.random() * 0.75) / state.region.enemyRate;
    }

    updateUnits(dt);
    updateSplashes(dt);

    if (state.enemyHp <= 0) {
      finishGame(true);
    } else if (state.playerHp <= 0) {
      finishGame(false);
    }

    updateHud();
  }

  function drawPixelRect(x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function drawBackground(time) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#c9f6ff");
    gradient.addColorStop(0.48, "#7bd1da");
    gradient.addColorStop(1, "#3aa6bd");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 3;
    for (let y = 84; y < height; y += 46) {
      ctx.beginPath();
      for (let x = 0; x <= width; x += 24) {
        const wave = Math.sin(x * 0.04 + time * 2 + y * 0.05) * 7;
        if (x === 0) {
          ctx.moveTo(x, y + wave);
        } else {
          ctx.lineTo(x, y + wave);
        }
      }
      ctx.stroke();
    }

    for (const lane of lanes) {
      ctx.strokeStyle = lane.id === state.selectedLane ? "rgba(255,216,90,0.95)" : "rgba(255,255,255,0.72)";
      ctx.setLineDash([16, 12]);
      ctx.lineWidth = lane.id === state.selectedLane ? 7 : 5;
      ctx.beginPath();
      ctx.moveTo(playerBase.x + 44, lane.y);
      ctx.lineTo(enemyBase.x - 44, lane.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(24,32,51,0.55)";
      ctx.font = "900 12px ui-monospace, Consolas, monospace";
      ctx.fillText(lane.label, 382, lane.y - 12);
    }

    drawIsland();
  }

  function drawIsland() {
    ctx.save();
    ctx.translate(island.x, island.y);
    ctx.fillStyle = state.islandOwner === "player" && state.islandTimer > 0
      ? "#ffd85a"
      : state.islandOwner === "enemy" && state.islandTimer > 0
        ? "#e95b88"
        : "#fff1d6";
    ctx.beginPath();
    ctx.arc(0, 0, island.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 4;
    ctx.stroke();
    drawPixelRect(-26, -10, 52, 20, "#ffffff");
    drawPixelRect(-16, -3, 32, 6, "#35d7a8");
    ctx.fillStyle = "#243047";
    ctx.font = "900 10px ui-monospace, Consolas, monospace";
    ctx.textAlign = "center";
    ctx.fillText("BONUS", 0, 34);
    ctx.restore();
  }

  function drawBase(base, hp, color, label) {
    ctx.save();
    ctx.translate(base.x, base.y);
    ctx.fillStyle = "rgba(24,32,51,0.16)";
    ctx.beginPath();
    ctx.arc(0, 8, base.r + 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, base.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 4;
    ctx.stroke();
    drawPixelRect(-20, -12, 40, 24, "#fff9ed");
    drawPixelRect(-12, -5, 24, 10, color === "#dfaa66" ? "#ffd85a" : "#e95b88");
    ctx.fillStyle = "#182033";
    ctx.font = "900 13px ui-monospace, Consolas, monospace";
    ctx.textAlign = "center";
    ctx.fillText(label, 0, 68);
    drawPixelRect(-42, 52, 84, 8, "#ffffff");
    drawPixelRect(-42, 52, 84 * clamp(hp / 100, 0, 1), 8, color === "#dfaa66" ? "#35d7a8" : "#e95b88");
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 2;
    ctx.strokeRect(-42, 52, 84, 8);
    ctx.restore();
  }

  function drawUnit(fleetUnit) {
    const player = fleetUnit.side === "player";
    ctx.save();
    ctx.translate(fleetUnit.x, fleetUnit.y);
    ctx.fillStyle = "rgba(24,32,51,0.18)";
    ctx.beginPath();
    ctx.ellipse(0, 11, fleetUnit.radius + 8, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = fleetUnit.color;
    ctx.beginPath();
    ctx.arc(0, 0, fleetUnit.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 3;
    ctx.stroke();
    drawPixelRect(player ? -4 : -12, -22, 8, 18, "#fff9ed");
    drawPixelRect(player ? 4 : -20, -17, 16, 10, player ? "#ffd85a" : "#ffffff");
    ctx.fillStyle = "#243047";
    ctx.font = "900 10px ui-monospace, Consolas, monospace";
    ctx.textAlign = "center";
    ctx.fillText(fleetUnit.label.slice(0, 1), 0, 4);
    drawPixelRect(-fleetUnit.radius, fleetUnit.radius + 6, fleetUnit.radius * 2, 5, "#ffffff");
    drawPixelRect(-fleetUnit.radius, fleetUnit.radius + 6, fleetUnit.radius * 2 * clamp(fleetUnit.hp / fleetUnit.maxHp, 0, 1), 5, "#35d7a8");
    ctx.restore();
  }

  function drawSplashes() {
    for (const splash of state.splashes) {
      ctx.globalAlpha = splash.life / splash.maxLife;
      drawPixelRect(splash.x, splash.y, 5, 5, splash.color);
    }
    ctx.globalAlpha = 1;
  }

  function drawMeter() {
    const x = 214;
    const y = 54;
    const w = 372;
    const h = 24;
    const value = meterValue();
    drawPixelRect(x, y, w, h, "#ffffff");
    drawPixelRect(x + w * sweetZone.start, y, w * (sweetZone.end - sweetZone.start), h, "#ffd85a");
    drawPixelRect(x + value * w - 5, y - 6, 10, h + 12, "#e95b88");
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = "#182033";
    ctx.font = "900 13px ui-monospace, Consolas, monospace";
    ctx.textAlign = "center";
    ctx.fillText("BAKE TIMING", x + w / 2, y - 12);
  }

  function drawRunOverlay() {
    const typeId = typeFromHold(state.bakeHold);
    const type = unitTypes[typeId];
    ctx.fillStyle = "rgba(255, 249, 237, 0.9)";
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(28, 28, 176, 92, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#526078";
    ctx.font = "900 10px ui-monospace, Consolas, monospace";
    ctx.textAlign = "left";
    ctx.fillText("NEXT", 46, 50);
    ctx.fillText("STREAK", 112, 50);
    ctx.fillStyle = "#243047";
    ctx.font = "900 17px system-ui, sans-serif";
    ctx.fillText(type.label, 46, 78);
    ctx.font = "900 18px ui-monospace, Consolas, monospace";
    ctx.fillText(`x${state.bakeStreak}`, 112, 78);
    ctx.fillStyle = "#526078";
    ctx.font = "900 10px ui-monospace, Consolas, monospace";
    ctx.fillText(`STYLE ${state.style.short}`, 46, 106);
    ctx.fillText(`LIKE ${state.battleRecord.likes}`, 132, 106);

    if (state.tempoTimer > 0) {
      ctx.fillStyle = "#ffd85a";
      ctx.strokeStyle = "#243047";
      ctx.lineWidth = 2;
      ctx.fillRect(width - 170, 34, 118, 20);
      ctx.strokeRect(width - 170, 34, 118, 20);
      ctx.fillStyle = "#243047";
      ctx.font = "900 11px ui-monospace, Consolas, monospace";
      ctx.fillText("TEMPO", width - 154, 49);
    }

    ctx.fillStyle = "rgba(255, 249, 237, 0.9)";
    ctx.strokeStyle = "#243047";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(width - 206, 70, 178, 78, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#526078";
    ctx.font = "900 10px ui-monospace, Consolas, monospace";
    ctx.fillText("REGION", width - 188, 92);
    ctx.fillText("LANE", width - 106, 92);
    ctx.fillStyle = "#243047";
    ctx.font = "900 14px ui-monospace, Consolas, monospace";
    ctx.fillText(`${state.regionIndex + 1}/${regions.length}`, width - 188, 114);
    ctx.fillText(laneLabel(state.selectedLane), width - 106, 114);
    ctx.fillStyle = "#526078";
    ctx.font = "900 10px ui-monospace, Consolas, monospace";
    ctx.fillText("ISLAND", width - 188, 136);
    ctx.fillText(state.islandBuffTimer > 0 ? `${Math.ceil(state.islandBuffTimer)}s` : "--", width - 106, 136);
  }

  function draw(time) {
    drawBackground(time);
    drawMeter();
    drawBase(playerBase, state.playerHp, "#dfaa66", "BISCUIT");
    drawBase(enemyBase, state.enemyHp, "#e95b88", "JAM");
    state.units.forEach(drawUnit);
    drawSplashes();
    drawRunOverlay();
  }

  function loop(timestamp) {
    const dt = clamp((timestamp - state.lastTime) / 1000, 0, 0.04);
    state.lastTime = timestamp;
    updateGame(dt);
    draw(timestamp / 1000);
    requestAnimationFrame(loop);
  }

  function laneY(laneId) {
    return (lanes.find((lane) => lane.id === laneId) || lanes[0]).y;
  }

  function laneLabel(laneId) {
    return (lanes.find((lane) => lane.id === laneId) || lanes[0]).label;
  }

  function tintUnitColor(baseColor, accent) {
    return accent === "#dfaa66" ? baseColor : accent;
  }

  function getConqueredRegionCount(progress) {
    return regions.filter((region) => normalizeRecord(progress.regionRecords?.[region.id]).wins > 0).length;
  }

  function getUnlockedStyleIds(progress) {
    const conquered = getConqueredRegionCount(progress);
    return fleetStyles.filter((style) => conquered >= style.unlockWins).map((style) => style.id);
  }

  function getSelectableStyle(styleId, progress) {
    const unlocked = getUnlockedStyleIds(progress);
    return fleetStyles.find((style) => style.id === styleId && unlocked.includes(style.id)) || fleetStyles[0];
  }

  function buildBattleCode(won = state.finished && state.enemyHp <= 0) {
    const payload = {
      v: 1,
      r: state.region.id,
      lane: state.selectedLane,
      style: state.style.id,
      won: Boolean(won),
      score: Math.max(0, Math.round(state.score)),
      streak: state.bestBakeStreak,
      enemy: Math.ceil(Math.max(0, state.enemyHp)),
      hp: Math.ceil(Math.max(0, state.playerHp))
    };
    return `PBC1-${btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
  }

  function normalizeBattleStats(stats) {
    const safe = typeof stats === "object" && stats ? stats : {};
    return Object.fromEntries(Object.entries(safe).map(([code, record]) => [code, {
      shares: Math.max(0, Number(record?.shares || 0)),
      likes: Math.max(0, Number(record?.likes || 0)),
      bestScore: Math.max(0, Number(record?.bestScore || 0)),
      wins: Math.max(0, Number(record?.wins || 0))
    }]));
  }

  function getBattleRecord(progress, code) {
    progress.battleStats = normalizeBattleStats(progress.battleStats);
    if (!code) {
      return { shares: 0, likes: 0, bestScore: 0, wins: 0 };
    }
    progress.battleStats[code] = progress.battleStats[code] || { shares: 0, likes: 0, bestScore: 0, wins: 0 };
    return progress.battleStats[code];
  }

  function syncBattleRecord(won) {
    const code = buildBattleCode(won);
    const record = getBattleRecord(state.progress, code);
    record.bestScore = Math.max(record.bestScore, Math.round(state.score));
    record.wins += won ? 1 : 0;
    state.currentBattleCode = code;
    state.battleRecord = record;
    state.progress.lastBattleCode = code;
    state.progress.lastShareCode = code;
    saveProgress(state.progress);
  }

  function getLikedBattles() {
    try {
      const parsed = JSON.parse(localStorage.getItem(likedBattlesStorageKey) || "[]");
      return new Set(Array.isArray(parsed) ? parsed : []);
    } catch (error) {
      return new Set();
    }
  }

  function saveLikedBattles(liked) {
    localStorage.setItem(likedBattlesStorageKey, JSON.stringify([...liked].slice(-160)));
  }

  function loadProgress() {
    const base = {
      selectedRegionIndex: 0,
      selectedLane: "top",
      selectedStyleId: "classic",
      regionRecords: {},
      unlockedStyleIds: ["classic"],
      battleStats: {},
      lastBattleCode: "",
      lastShareCode: ""
    };

    try {
      const parsed = JSON.parse(localStorage.getItem(progressStorageKey) || "{}");
      const progress = {
        ...base,
        ...parsed,
        regionRecords: typeof parsed.regionRecords === "object" && parsed.regionRecords ? parsed.regionRecords : {},
        unlockedStyleIds: Array.isArray(parsed.unlockedStyleIds) ? parsed.unlockedStyleIds : ["classic"],
        battleStats: normalizeBattleStats(parsed.battleStats),
        lastBattleCode: typeof parsed.lastBattleCode === "string" ? parsed.lastBattleCode : "",
        lastShareCode: typeof parsed.lastShareCode === "string" ? parsed.lastShareCode : ""
      };
      progress.selectedRegionIndex = clamp(Number(progress.selectedRegionIndex || 0), 0, regions.length - 1);
      progress.selectedLane = lanes.some((lane) => lane.id === progress.selectedLane) ? progress.selectedLane : "top";
      for (const region of regions) {
        progress.regionRecords[region.id] = normalizeRecord(progress.regionRecords[region.id]);
      }
      progress.unlockedStyleIds = getUnlockedStyleIds(progress);
      progress.selectedStyleId = getSelectableStyle(progress.selectedStyleId, progress).id;
      saveProgress(progress);
      return progress;
    } catch (error) {
      saveProgress(base);
      return base;
    }
  }

  function normalizeRecord(record) {
    const safe = typeof record === "object" && record ? record : {};
    return {
      wins: Math.max(0, Number(safe.wins || 0)),
      bestScore: Math.max(0, Number(safe.bestScore || 0)),
      bestStreak: Math.max(Number(localStorage.getItem(bestStreakStorageKey) || 0), Number(safe.bestStreak || 0))
    };
  }

  function saveProgress(progress) {
    localStorage.setItem(progressStorageKey, JSON.stringify(progress));
  }

  function syncLaneButtons() {
    for (const button of laneButtons) {
      button.classList.toggle("is-active", button.dataset.lane === state.selectedLane);
    }
  }

  function syncStyleButton() {
    const unlocked = getUnlockedStyleIds(state.progress);
    styleButton.textContent = state.style.label;
    styleButton.title = unlocked.length > 1 ? "해금된 함대 스타일을 바꿉니다." : "지역 승리 수로 새 함대 스타일이 열립니다.";
    styleButton.disabled = unlocked.length < 2;

    const code = state.currentBattleCode || state.progress.lastBattleCode || "";
    state.battleRecord = getBattleRecord(state.progress, code);
    const liked = code ? getLikedBattles().has(code) : false;
    battleLikeButton.textContent = `응원 ${state.battleRecord.likes}`;
    battleLikeButton.disabled = !code;
    battleLikeButton.classList.toggle("is-active", liked);
    battleLikeButton.title = code
      ? liked ? "이미 응원한 전투 기록입니다." : "현재 전투 기록을 한 번 응원합니다."
      : "전투 결과가 나온 뒤 응원할 수 있습니다.";
    shareBattleButton.title = code || "현재 전투 기록 코드";
  }

  function selectLane(laneId) {
    if (!lanes.some((lane) => lane.id === laneId)) {
      return;
    }

    state.selectedLane = laneId;
    state.progress.selectedLane = laneId;
    saveProgress(state.progress);
    syncLaneButtons();
    state.hint = `${laneLabel(laneId)} 항로 선택`;
    updateHud();
  }

  function cycleStyle() {
    const progress = loadProgress();
    const unlocked = getUnlockedStyleIds(progress);
    if (unlocked.length < 2) {
      state.hint = "지역을 더 확보하면 새 함대 스타일이 열립니다.";
      updateHud();
      return;
    }
    const currentIndex = Math.max(0, unlocked.indexOf(state.style.id));
    progress.selectedStyleId = unlocked[(currentIndex + 1) % unlocked.length];
    saveProgress(progress);
    resetGame();
  }

  function shareBattle() {
    const code = state.currentBattleCode || buildBattleCode(state.finished && state.enemyHp <= 0);
    const record = getBattleRecord(state.progress, code);
    record.shares += 1;
    record.bestScore = Math.max(record.bestScore, Math.round(state.score));
    state.currentBattleCode = code;
    state.battleRecord = record;
    state.progress.lastBattleCode = code;
    state.progress.lastShareCode = code;
    saveProgress(state.progress);
    syncStyleButton();

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code).then(() => {
        state.hint = "전투 기록 코드가 복사됐습니다.";
        updateHud();
      }).catch(() => {
        window.prompt("전투 기록 코드", code);
      });
    } else {
      window.prompt("전투 기록 코드", code);
    }
  }

  function likeBattle() {
    const code = state.currentBattleCode || state.progress.lastBattleCode || "";
    if (!code) {
      state.hint = "전투 결과가 나온 뒤 응원할 수 있습니다.";
      updateHud();
      return;
    }

    const liked = getLikedBattles();
    if (liked.has(code)) {
      state.hint = "이미 응원한 전투 기록입니다.";
      updateHud();
      return;
    }

    const record = getBattleRecord(state.progress, code);
    record.likes += 1;
    record.bestScore = Math.max(record.bestScore, Math.round(state.score));
    state.currentBattleCode = code;
    state.battleRecord = record;
    state.progress.lastBattleCode = code;
    state.progress.lastShareCode = code;
    saveProgress(state.progress);
    liked.add(code);
    saveLikedBattles(liked);
    state.hint = `전투 기록을 응원했습니다. ${record.likes}개`;
    syncStyleButton();
    updateHud();
  }

  function renderRegionControls() {
    const record = state.progress.regionRecords[state.region.id] || normalizeRecord();
    regionLabel.textContent = `${state.regionIndex + 1}/${regions.length}`;
    regionLabel.title = `${state.region.name} wins ${record.wins}`;
    syncStyleButton();
  }

  function selectRegion(direction) {
    const progress = loadProgress();
    progress.selectedRegionIndex = (clamp(Number(progress.selectedRegionIndex || 0), 0, regions.length - 1) + direction + regions.length) % regions.length;
    saveProgress(progress);
    resetGame();
  }

  function beginBake() {
    if (!state.active || state.bakeHolding) {
      return;
    }
    state.bakeHolding = true;
    state.bakePressStart = performance.now();
    state.bakeHold = 0;
  }

  function endBake() {
    if (!state.bakeHolding) {
      return;
    }
    const hold = (performance.now() - state.bakePressStart) / 1000;
    state.bakeHolding = false;
    state.bakeHold = 0;
    spawnPlayerUnit(hold);
  }

  spawnButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    spawnButton.setPointerCapture(event.pointerId);
    beginBake();
  });
  spawnButton.addEventListener("pointerup", endBake);
  spawnButton.addEventListener("pointercancel", endBake);
  spawnButton.addEventListener("lostpointercapture", endBake);
  restartButton.addEventListener("click", resetGame);
  overlayRestartButton.addEventListener("click", resetGame);
  laneButtons.forEach((button) => {
    button.addEventListener("click", () => selectLane(button.dataset.lane));
  });
  prevRegionButton.addEventListener("click", () => selectRegion(-1));
  nextRegionButton.addEventListener("click", () => selectRegion(1));
  styleButton.addEventListener("click", cycleStyle);
  shareBattleButton.addEventListener("click", shareBattle);
  battleLikeButton.addEventListener("click", likeBattle);
  window.addEventListener("keydown", (event) => {
    if (event.code === "Space") {
      event.preventDefault();
      beginBake();
    }
  });
  window.addEventListener("keyup", (event) => {
    if (event.code === "Space") {
      event.preventDefault();
      endBake();
    }
  });

  resetGame();
  requestAnimationFrame(loop);
})();
