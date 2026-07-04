(function () {
  "use strict";

  var canvas = document.getElementById("game-canvas");
  var ctx = canvas.getContext("2d");
  var root = document.getElementById("ad-root");
  var introPanel = document.getElementById("intro-panel");
  var introTitle = document.getElementById("intro-title");
  var introHint = document.getElementById("intro-hint");
  var resultPanel = document.getElementById("result-panel");
  var resultTitle = document.getElementById("result-title");
  var resultBody = document.getElementById("result-body");
  var ctaButton = document.getElementById("cta-button");
  var lightButton = document.getElementById("light-button");
  var restartButton = document.getElementById("restart-button");

  var STRINGS = {
    en: {
      introTitle: "Escape the dark maze",
      introHint: "Drag to move the lab rat",
      successTitle: "Escape complete!",
      successBody: "Try darker mazes in the app",
      failTitle: "Lost in the dark",
      failBody: "Try the escape again in the app",
      cta: "Continue in app",
      light: "Use light"
    },
    ko: {
      introTitle: "어둠 속 미로 탈출",
      introHint: "드래그해서 실험쥐를 움직이세요",
      successTitle: "탈출 성공!",
      successBody: "더 어두운 미로는 앱에서 도전하세요",
      failTitle: "길을 잃었습니다",
      failBody: "앱에서 다시 탈출에 도전하세요",
      cta: "앱에서 계속하기",
      light: "라이트 사용"
    },
    ja: {
      introTitle: "暗闇の迷路から脱出",
      introHint: "ドラッグしてラットを動かそう",
      successTitle: "脱出成功!",
      successBody: "もっと暗い迷路はアプリで挑戦",
      failTitle: "道に迷いました",
      failBody: "アプリで再び脱出に挑戦",
      cta: "アプリで続ける",
      light: "ライトを使う"
    },
    fr: {
      introTitle: "Échappez au labyrinthe",
      introHint: "Faites glisser le rat de labo",
      successTitle: "Évasion réussie!",
      successBody: "Défiez des labyrinthes plus sombres dans l'app",
      failTitle: "Perdu dans le noir",
      failBody: "Retentez l'évasion dans l'app",
      cta: "Continuer dans l'app",
      light: "Utiliser la lumière"
    },
    es: {
      introTitle: "Escapa del laberinto",
      introHint: "Arrastra para mover al ratón",
      successTitle: "¡Escape logrado!",
      successBody: "Prueba laberintos más oscuros en la app",
      failTitle: "Te perdiste",
      failBody: "Vuelve a intentar escapar en la app",
      cta: "Continuar en la app",
      light: "Usar luz"
    },
    de: {
      introTitle: "Entkomme dem dunklen Labyrinth",
      introHint: "Ziehe die Laborratte",
      successTitle: "Flucht geschafft!",
      successBody: "Dunklere Labyrinthe warten in der App",
      failTitle: "Im Dunkeln verirrt",
      failBody: "Versuche die Flucht erneut in der App",
      cta: "In der App weiter",
      light: "Licht nutzen"
    },
    zh: {
      introTitle: "逃出黑暗迷宫",
      introHint: "拖动实验鼠前进",
      successTitle: "逃脱成功！",
      successBody: "更黑暗的迷宫在应用中等你挑战",
      failTitle: "迷路了",
      failBody: "在应用中再次挑战逃脱",
      cta: "在应用中继续",
      light: "使用灯光"
    },
    pt: {
      introTitle: "Escape do labirinto escuro",
      introHint: "Arraste para mover o rato",
      successTitle: "Fuga concluída!",
      successBody: "Tente labirintos mais escuros no app",
      failTitle: "Perdido no escuro",
      failBody: "Tente escapar de novo no app",
      cta: "Continuar no app",
      light: "Usar luz"
    },
    id: {
      introTitle: "Kabur dari labirin gelap",
      introHint: "Seret untuk menggerakkan tikus lab",
      successTitle: "Berhasil kabur!",
      successBody: "Coba labirin lebih gelap di aplikasi",
      failTitle: "Tersesat",
      failBody: "Coba kabur lagi di aplikasi",
      cta: "Lanjutkan di aplikasi",
      light: "Gunakan lampu"
    }
  };

  var THEME = {
    background: "#020304",
    floor: "#10161A",
    wall: "#8C9AA4",
    wallJoint: "#94A3AE",
    accent: "#BFE7F2",
    pawGlow: "#2CFFD8",
    pawFill: "#B8FFCB",
    exitGold: "#FFD35A"
  };

  var ASSETS = {
    entry: "assets/maze-entry-lab-basic.png",
    floor: "assets/maze-floor-lab-basic.png",
    wall: "assets/maze-wall-lab-basic.png",
    light: "assets/item-light-bulb-gold.png",
    rat: [
      "assets/lab-rat-walk-top-00.png",
      "assets/lab-rat-walk-top-01.png",
      "assets/lab-rat-walk-top-02.png",
      "assets/lab-rat-walk-top-03.png",
      "assets/lab-rat-walk-top-04.png",
      "assets/lab-rat-walk-top-05.png",
      "assets/lab-rat-walk-top-06.png",
      "assets/lab-rat-walk-top-07.png",
      "assets/lab-rat-walk-top-08.png",
      "assets/lab-rat-walk-top-09.png",
      "assets/lab-rat-walk-top-10.png",
      "assets/lab-rat-walk-top-11.png"
    ]
  };

  var CONFIG = {
    width: 7,
    height: 7,
    cellSizeM: 1,
    ratRadiusM: 0.28,
    wallThicknessM: 0.12,
    moveSpeedMps: 1.72,
    visionBaseRadiusM: 1.46,
    visionForwardBonusM: 0.84,
    pawLifetimeMs: 3800,
    playLimitMs: 12000,
    lightDurationMs: 1500
  };

  var assets = {
    entry: null,
    floor: null,
    wall: null,
    light: null,
    rat: []
  };
  var state = createInitialState();
  var view = {
    dpr: 1,
    width: 320,
    height: 480,
    ppm: 78,
    centerX: 160,
    centerY: 246,
    cameraX: state.rat.x,
    cameraY: state.rat.y
  };
  var keys = {};
  var pointer = {
    active: false,
    startX: 0,
    startY: 0,
    x: 0,
    y: 0
  };
  var maze = buildLevelTwoMaze();
  var wallSegments = collectWallSegments(maze);
  var floorPattern = null;
  var wallPattern = null;
  var lastFrameTime = 0;
  var introHidden = false;
  var lastPawDistance = 0;
  var installUrl = "https://play.google.com/store/apps/details?id=com.neokim.darkmaze&referrer=utm_source%3Dneokim_site%26utm_medium%3Dweb_playable%26utm_campaign%3Ddarkmaze%26utm_content%3Dplayable_cta";

  window.goInstall = function goInstall() {
    if (window.ExitApi && typeof window.ExitApi.exit === "function") {
      window.ExitApi.exit();
      return;
    }
    window.open(installUrl, "_blank", "noopener");
  };

  applyLocale();
  bindEvents();
  resize();
  loadAssets().then(function () {
    floorPattern = assets.floor ? ctx.createPattern(assets.floor, "repeat") : null;
    wallPattern = assets.wall ? ctx.createPattern(assets.wall, "repeat") : null;
    requestAnimationFrame(loop);
  }).catch(function () {
    requestAnimationFrame(loop);
  });

  window.setTimeout(hideIntro, 1050);

  function createInitialState() {
    return {
      phase: "play",
      elapsedMs: 0,
      rat: { x: 3.5, y: 3.5 },
      facingRad: -Math.PI * 0.5,
      lastMovedMs: -1000,
      lightUntilMs: 0,
      lightUsed: false,
      pawTrail: [],
      result: null
    };
  }

  function applyLocale() {
    var lang = ((navigator.language || "en").split("-")[0] || "en").toLowerCase();
    var text = STRINGS[lang] || STRINGS.en;
    introTitle.textContent = text.introTitle;
    introHint.textContent = text.introHint;
    ctaButton.textContent = text.cta;
    lightButton.setAttribute("aria-label", text.light);
  }

  function bindEvents() {
    window.addEventListener("resize", resize);
    root.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerup", onPointerUp);
    root.addEventListener("pointercancel", onPointerUp);
    ctaButton.addEventListener("click", window.goInstall);
    if (restartButton) {
      restartButton.addEventListener("click", resetPlayable);
    }
    lightButton.addEventListener("pointerdown", function (event) {
      event.stopPropagation();
    });
    lightButton.addEventListener("click", function (event) {
      event.stopPropagation();
      useLight();
    });
    window.addEventListener("keydown", function (event) {
      if (state.phase !== "play") return;
      if (event.key === "ArrowUp" || event.key === "ArrowDown" ||
          event.key === "ArrowLeft" || event.key === "ArrowRight") {
        keys[event.key] = true;
        hideIntro();
        event.preventDefault();
      }
    });
    window.addEventListener("keyup", function (event) {
      keys[event.key] = false;
    });
  }

  function loadAssets() {
    var jobs = [
      loadImage(ASSETS.entry).then(function (img) { assets.entry = img; }),
      loadImage(ASSETS.floor).then(function (img) { assets.floor = img; }),
      loadImage(ASSETS.wall).then(function (img) { assets.wall = img; }),
      loadImage(ASSETS.light).then(function (img) { assets.light = img; })
    ];
    ASSETS.rat.forEach(function (path, index) {
      jobs.push(loadImage(path).then(function (img) { assets.rat[index] = img; }));
    });
    return Promise.all(jobs);
  }

  function loadImage(path) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = reject;
      img.src = path;
    });
  }

  function buildLevelTwoMaze() {
    var cells = [];
    for (var y = 0; y < CONFIG.height; y += 1) {
      for (var x = 0; x < CONFIG.width; x += 1) {
        cells.push({ x: x, y: y, n: true, e: true, s: true, w: true, active: true });
      }
    }
    var m = {
      width: CONFIG.width,
      height: CONFIG.height,
      cells: cells,
      start: { x: 3, y: 3 },
      exit: { x: 6, y: 3, direction: "E" }
    };

    openBetween(m, 3, 3, 3, 2);
    openBetween(m, 3, 2, 2, 2);
    openBetween(m, 2, 2, 2, 1);
    openBetween(m, 2, 1, 3, 1);
    openBetween(m, 3, 1, 4, 1);
    openBetween(m, 4, 1, 4, 2);
    openBetween(m, 4, 2, 5, 2);
    openBetween(m, 5, 2, 5, 3);
    openBetween(m, 5, 3, 6, 3);

    openBetween(m, 3, 3, 2, 3);
    openBetween(m, 2, 3, 2, 4);
    openBetween(m, 2, 4, 1, 4);
    openBetween(m, 2, 1, 1, 1);
    openBetween(m, 1, 1, 1, 2);
    openBetween(m, 5, 3, 5, 4);
    openBetween(m, 5, 4, 4, 4);
    openBetween(m, 4, 2, 4, 3);
    openBetween(m, 6, 3, 6, 2);
    cellAt(m, 6, 3).e = false;
    return m;
  }

  function cellAt(m, x, y) {
    if (x < 0 || y < 0 || x >= m.width || y >= m.height) return null;
    return m.cells[y * m.width + x];
  }

  function openBetween(m, ax, ay, bx, by) {
    var a = cellAt(m, ax, ay);
    var b = cellAt(m, bx, by);
    if (!a || !b) return;
    if (bx === ax + 1) {
      a.e = false;
      b.w = false;
    } else if (bx === ax - 1) {
      a.w = false;
      b.e = false;
    } else if (by === ay + 1) {
      a.s = false;
      b.n = false;
    } else if (by === ay - 1) {
      a.n = false;
      b.s = false;
    }
  }

  function collectWallSegments(m) {
    var segments = [];
    var seen = {};
    m.cells.forEach(function (cell) {
      addWall(cell.n, cell.x, cell.y, cell.x + 1, cell.y);
      addWall(cell.e, cell.x + 1, cell.y, cell.x + 1, cell.y + 1);
      addWall(cell.s, cell.x, cell.y + 1, cell.x + 1, cell.y + 1);
      addWall(cell.w, cell.x, cell.y, cell.x, cell.y + 1);
    });
    return segments;

    function addWall(enabled, ax, ay, bx, by) {
      if (!enabled) return;
      var key = ax + "," + ay + "," + bx + "," + by;
      var reverse = bx + "," + by + "," + ax + "," + ay;
      if (seen[key] || seen[reverse]) return;
      seen[key] = true;
      segments.push({ ax: ax, ay: ay, bx: bx, by: by });
    }
  }

  function resize() {
    var rect = root.getBoundingClientRect();
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    view.dpr = dpr;
    view.width = Math.max(280, Math.floor(rect.width));
    view.height = Math.max(420, Math.floor(rect.height));
    canvas.width = Math.floor(view.width * dpr);
    canvas.height = Math.floor(view.height * dpr);
    canvas.style.width = view.width + "px";
    canvas.style.height = view.height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    updateViewScale();
  }

  function updateViewScale() {
    var narrowScale = view.width * 0.244;
    var tallScale = view.height * 0.142;
    view.ppm = clamp(Math.min(narrowScale, tallScale), 64, 96);
    view.centerX = view.width * 0.5;
    view.centerY = view.height * 0.52;
  }

  function onPointerDown(event) {
    if (state.phase !== "play") return;
    hideIntro();
    pointer.active = true;
    pointer.startX = event.clientX;
    pointer.startY = event.clientY;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    if (root.setPointerCapture) {
      root.setPointerCapture(event.pointerId);
    }
  }

  function onPointerMove(event) {
    if (!pointer.active || state.phase !== "play") return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  }

  function onPointerUp(event) {
    pointer.active = false;
    if (root.releasePointerCapture) {
      try {
        root.releasePointerCapture(event.pointerId);
      } catch (ignored) {
        // Some local preview browsers release capture automatically.
      }
    }
  }

  function hideIntro() {
    if (introHidden) return;
    introHidden = true;
    introPanel.classList.add("is-hidden");
  }

  function resetPlayable() {
    state = createInitialState();
    pointer.active = false;
    introHidden = false;
    lastPawDistance = 0;
    view.cameraX = state.rat.x;
    view.cameraY = state.rat.y;
    lastFrameTime = 0;
    resultPanel.classList.remove("is-visible");
    lightButton.classList.remove("is-used");
    introPanel.classList.remove("is-hidden");
    applyLocale();
    window.setTimeout(hideIntro, 1050);
  }

  function useLight() {
    if (state.phase !== "play" || state.lightUsed) return;
    hideIntro();
    state.lightUsed = true;
    state.lightUntilMs = state.elapsedMs + CONFIG.lightDurationMs;
    lightButton.classList.add("is-used");
  }

  function loop(time) {
    if (!lastFrameTime) lastFrameTime = time;
    var dtMs = Math.min(50, time - lastFrameTime);
    lastFrameTime = time;
    update(dtMs / 1000, dtMs);
    draw();
    requestAnimationFrame(loop);
  }

  function update(dt, dtMs) {
    if (state.phase !== "play") return;
    state.elapsedMs += dtMs;
    var input = getInputVector();
    if (input.x !== 0 || input.y !== 0) {
      var next = {
        x: state.rat.x + input.x * CONFIG.moveSpeedMps * dt,
        y: state.rat.y + input.y * CONFIG.moveSpeedMps * dt
      };
      var moved = moveWithCollision(state.rat, next);
      var dx = moved.x - state.rat.x;
      var dy = moved.y - state.rat.y;
      var distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 0.0008) {
        state.rat.x = moved.x;
        state.rat.y = moved.y;
        state.facingRad = Math.atan2(dy, dx);
        state.lastMovedMs = state.elapsedMs;
        lastPawDistance += distance;
        if (lastPawDistance >= 0.34) {
          lastPawDistance = 0;
          state.pawTrail.push({
            x: state.rat.x - Math.cos(state.facingRad) * 0.18,
            y: state.rat.y - Math.sin(state.facingRad) * 0.18,
            facingRad: state.facingRad,
            bornMs: state.elapsedMs
          });
        }
      }
    }
    state.pawTrail = state.pawTrail.filter(function (paw) {
      return state.elapsedMs - paw.bornMs < CONFIG.pawLifetimeMs;
    });
    if (hasEscaped()) {
      showResult(true);
    } else if (state.elapsedMs >= CONFIG.playLimitMs) {
      showResult(false);
    }
  }

  function getInputVector() {
    var x = 0;
    var y = 0;
    if (pointer.active) {
      var dx = pointer.x - pointer.startX;
      var dy = pointer.y - pointer.startY;
      var len = Math.sqrt(dx * dx + dy * dy);
      if (len > 7) {
        x += dx / len;
        y += dy / len;
      }
    }
    if (keys.ArrowLeft) x -= 1;
    if (keys.ArrowRight) x += 1;
    if (keys.ArrowUp) y -= 1;
    if (keys.ArrowDown) y += 1;
    var mag = Math.sqrt(x * x + y * y);
    if (mag > 1) {
      x /= mag;
      y /= mag;
    }
    return { x: x, y: y };
  }

  function moveWithCollision(from, target) {
    var full = resolveCollision(target);
    if (distanceBetween(from, full) > 0.002) return full;
    var xOnly = resolveCollision({ x: target.x, y: from.y });
    if (distanceBetween(from, xOnly) > 0.002) return xOnly;
    var yOnly = resolveCollision({ x: from.x, y: target.y });
    return yOnly;
  }

  function resolveCollision(point) {
    var p = {
      x: clamp(point.x, CONFIG.ratRadiusM, CONFIG.width - CONFIG.ratRadiusM),
      y: clamp(point.y, CONFIG.ratRadiusM, CONFIG.height - CONFIG.ratRadiusM)
    };
    var minDistance = CONFIG.ratRadiusM + CONFIG.wallThicknessM * 0.5;
    for (var pass = 0; pass < 3; pass += 1) {
      for (var i = 0; i < wallSegments.length; i += 1) {
        var wall = wallSegments[i];
        var closest = closestPointOnSegment(p.x, p.y, wall.ax, wall.ay, wall.bx, wall.by);
        var dx = p.x - closest.x;
        var dy = p.y - closest.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 0 && distance < minDistance) {
          var push = minDistance - distance;
          p.x += (dx / distance) * push;
          p.y += (dy / distance) * push;
        } else if (distance === 0) {
          p.x += 0.001;
        }
      }
      p.x = clamp(p.x, CONFIG.ratRadiusM, CONFIG.width - CONFIG.ratRadiusM);
      p.y = clamp(p.y, CONFIG.ratRadiusM, CONFIG.height - CONFIG.ratRadiusM);
    }
    return p;
  }

  function closestPointOnSegment(px, py, ax, ay, bx, by) {
    var abx = bx - ax;
    var aby = by - ay;
    var t = ((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby);
    t = clamp(t, 0, 1);
    return { x: ax + abx * t, y: ay + aby * t };
  }

  function hasEscaped() {
    var ex = maze.exit.x + 0.68;
    var ey = maze.exit.y + 0.5;
    return state.rat.x >= ex && Math.abs(state.rat.y - ey) < 0.38;
  }

  function showResult(success) {
    if (state.phase !== "play") return;
    state.phase = "result";
    pointer.active = false;
    hideIntro();
    var lang = ((navigator.language || "en").split("-")[0] || "en").toLowerCase();
    var text = STRINGS[lang] || STRINGS.en;
    resultTitle.textContent = success ? text.successTitle : text.failTitle;
    resultBody.textContent = success ? text.successBody : text.failBody;
    ctaButton.textContent = text.cta;
    resultPanel.classList.add("is-visible");
  }

  function draw() {
    updateCamera();
    ctx.clearRect(0, 0, view.width, view.height);
    drawAmbientBackdrop();
    drawFloor();
    drawPawTrail();
    drawMazeWalls();
    drawExitMarker();
    drawFieldLightHalo();
    drawDarkness();
    drawExitBeaconOverFog();
    drawRat();
    drawTimeBar();
  }

  function updateCamera() {
    var lookAhead = state.phase === "play" ? 0.22 : 0.05;
    var targetX = state.rat.x + Math.cos(state.facingRad) * lookAhead;
    var targetY = state.rat.y + Math.sin(state.facingRad) * lookAhead;
    view.cameraX += (targetX - view.cameraX) * 0.13;
    view.cameraY += (targetY - view.cameraY) * 0.13;
  }

  function drawAmbientBackdrop() {
    ctx.fillStyle = THEME.background;
    ctx.fillRect(0, 0, view.width, view.height);
    if (assets.entry) {
      drawImageCover(assets.entry, 0, 0, view.width, view.height, 0.54);
    }
    var ambient = ctx.createRadialGradient(
      view.width * 0.46,
      view.height * 0.28,
      view.width * 0.05,
      view.width * 0.5,
      view.height * 0.55,
      Math.max(view.width, view.height) * 0.82
    );
    ambient.addColorStop(0, "rgba(29, 46, 60, 0.42)");
    ambient.addColorStop(0.42, "rgba(4, 10, 15, 0.44)");
    ambient.addColorStop(1, "rgba(0, 0, 0, 0.82)");
    ctx.fillStyle = ambient;
    ctx.fillRect(0, 0, view.width, view.height);
  }

  function drawFloor() {
    maze.cells.forEach(function (cell) {
      var p = worldToScreen(cell.x, cell.y);
      var s = view.ppm;
      ctx.save();
      ctx.beginPath();
      ctx.rect(p.x, p.y, s, s);
      ctx.clip();
      ctx.fillStyle = THEME.floor;
      ctx.fillRect(p.x, p.y, s, s);
      if (floorPattern) {
        ctx.globalAlpha = 0.72;
        ctx.fillStyle = floorPattern;
        ctx.translate(p.x, p.y);
        ctx.scale(s / 256, s / 256);
        ctx.fillRect(0, 0, 256, 256);
      }
      ctx.restore();
      ctx.strokeStyle = "rgba(255,255,255,0.018)";
      ctx.lineWidth = 1;
      ctx.strokeRect(p.x + 0.5, p.y + 0.5, s - 1, s - 1);
    });
  }

  function drawMazeWalls() {
    wallSegments.forEach(drawWallSegment);
    drawWallJoints();
  }

  function drawWallSegment(wall) {
    var a = worldToScreen(wall.ax, wall.ay);
    var b = worldToScreen(wall.bx, wall.by);
    var dx = b.x - a.x;
    var dy = b.y - a.y;
    var len = Math.sqrt(dx * dx + dy * dy);
    var angle = Math.atan2(dy, dx);
    var thickness = Math.max(9, view.ppm * CONFIG.wallThicknessM);
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(angle);
    ctx.shadowColor = "rgba(0,0,0,0.68)";
    ctx.shadowBlur = thickness * 0.72;
    ctx.shadowOffsetY = 2;
    roundRect(-thickness * 0.5, -thickness * 0.5, len + thickness, thickness, thickness * 0.28);
    ctx.fillStyle = "rgba(6, 10, 12, 0.58)";
    ctx.fill();
    roundRect(0, -thickness * 0.42, len, thickness * 0.84, thickness * 0.26);
    ctx.fillStyle = "rgba(140, 154, 164, 0.74)";
    ctx.fill();
    if (wallPattern) {
      ctx.save();
      roundRect(0, -thickness * 0.42, len, thickness * 0.84, thickness * 0.26);
      ctx.clip();
      ctx.globalAlpha = 0.42;
      ctx.fillStyle = wallPattern;
      ctx.scale(view.ppm / 280, view.ppm / 280);
      ctx.fillRect(0, -220, len * 280 / view.ppm, 440);
      ctx.restore();
    }
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "rgba(255,255,255,0.21)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(4, -thickness * 0.25);
    ctx.lineTo(len - 4, -thickness * 0.25);
    ctx.stroke();
    ctx.strokeStyle = "rgba(0,0,0,0.34)";
    ctx.beginPath();
    ctx.moveTo(4, thickness * 0.28);
    ctx.lineTo(len - 4, thickness * 0.28);
    ctx.stroke();
    ctx.restore();
  }

  function drawWallJoints() {
    var points = {};
    wallSegments.forEach(function (wall) {
      points[wall.ax + "," + wall.ay] = { x: wall.ax, y: wall.ay };
      points[wall.bx + "," + wall.by] = { x: wall.bx, y: wall.by };
    });
    Object.keys(points).forEach(function (key) {
      var point = points[key];
      var screen = worldToScreen(point.x, point.y);
      var radius = Math.max(3, view.ppm * 0.045);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(148, 163, 174, 0.72)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(screen.x - radius * 0.28, screen.y - radius * 0.28, radius * 0.38, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fill();
    });
  }

  function drawPawTrail() {
    state.pawTrail.forEach(function (paw) {
      var age = state.elapsedMs - paw.bornMs;
      var fade = clamp(1 - age / CONFIG.pawLifetimeMs, 0, 1);
      var alpha = fade * fade * 0.96;
      if (alpha <= 0.01) return;
      var p = worldToScreen(paw.x, paw.y);
      var size = clamp(view.ppm * 0.22, 16, 34);
      drawCutePawPair(p.x, p.y, paw.facingRad, size, alpha);
    });
  }

  function drawCutePawPair(x, y, facingRad, size, alpha) {
    var nx = -Math.sin(facingRad);
    var ny = Math.cos(facingRad);
    var spread = size * 0.26;
    drawCutePawPrint(x + nx * spread, y + ny * spread, facingRad, size, alpha);
    drawCutePawPrint(x - nx * spread, y - ny * spread, facingRad, size, alpha * 0.82);
  }

  function drawCutePawPrint(x, y, facingRad, size, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(facingRad + Math.PI * 0.5);
    ctx.globalAlpha = alpha;
    ctx.shadowColor = THEME.pawGlow;
    ctx.shadowBlur = size * 0.42;
    ctx.fillStyle = THEME.pawFill;
    ellipse(0, size * 0.1, size * 0.17, size * 0.23);
    ellipse(-size * 0.16, -size * 0.11, size * 0.08, size * 0.1);
    ellipse(0, -size * 0.16, size * 0.08, size * 0.105);
    ellipse(size * 0.16, -size * 0.11, size * 0.08, size * 0.1);
    ctx.restore();
  }

  function drawExitMarker() {
    var gate = exitGatePoint();
    var g = worldToScreen(gate.x, gate.y);
    var tangent = { x: 0, y: 1 };
    var inward = { x: -1, y: 0 };
    var width = view.ppm * 0.84;
    var depth = view.ppm * 0.56;
    var pulse = 0.5 + 0.5 * Math.sin(state.elapsedMs / 260);

    var glow = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, view.ppm * (1.1 + pulse * 0.22));
    glow.addColorStop(0, "rgba(255, 232, 127, 0.72)");
    glow.addColorStop(0.45, "rgba(255, 201, 68, 0.24)");
    glow.addColorStop(1, "rgba(255, 201, 68, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(g.x - view.ppm * 1.4, g.y - view.ppm * 1.4, view.ppm * 2.8, view.ppm * 2.8);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.beginPath();
    ctx.moveTo(g.x + tangent.x * width * 0.42, g.y + tangent.y * width * 0.42);
    ctx.lineTo(g.x - tangent.x * width * 0.42, g.y - tangent.y * width * 0.42);
    ctx.lineTo(g.x + inward.x * depth - tangent.x * width * 0.18, g.y + inward.y * depth - tangent.y * width * 0.18);
    ctx.lineTo(g.x + inward.x * depth + tangent.x * width * 0.18, g.y + inward.y * depth + tangent.y * width * 0.18);
    ctx.closePath();
    var beam = ctx.createLinearGradient(g.x, g.y, g.x + inward.x * depth, g.y + inward.y * depth);
    beam.addColorStop(0, "rgba(255, 230, 135, 0.62)");
    beam.addColorStop(0.7, "rgba(255, 197, 62, 0.14)");
    beam.addColorStop(1, "rgba(255, 197, 62, 0)");
    ctx.fillStyle = beam;
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 232, 127, 0.95)";
    ctx.lineWidth = Math.max(2, view.ppm * 0.045);
    ctx.beginPath();
    ctx.moveTo(g.x, g.y - width * 0.5);
    ctx.lineTo(g.x, g.y + width * 0.5);
    ctx.stroke();

    for (var i = 0; i < 5; i += 1) {
      var offset = (i - 2) * width * 0.18;
      ctx.strokeStyle = "rgba(255, 226, 115, " + (0.18 + pulse * 0.12) + ")";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y + offset);
      ctx.lineTo(g.x + inward.x * (depth * (0.55 + i * 0.05)), g.y + offset * 0.22);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawFieldLightHalo() {
    if (state.lightUntilMs <= state.elapsedMs) return;
    var ratio = clamp((state.lightUntilMs - state.elapsedMs) / CONFIG.lightDurationMs, 0, 1);
    var p = worldToScreen(state.rat.x, state.rat.y);
    var r = view.ppm * (2.0 - ratio * 0.24);
    var halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
    halo.addColorStop(0, "rgba(255, 238, 151, 0.15)");
    halo.addColorStop(0.42, "rgba(93, 255, 231, 0.08)");
    halo.addColorStop(1, "rgba(93, 255, 231, 0)");
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = halo;
    ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
    ctx.restore();
  }

  function drawDarkness() {
    var multiplier = state.lightUntilMs > state.elapsedMs ? 2.0 : 1.0;
    var p = worldToScreen(state.rat.x, state.rat.y);
    var base = CONFIG.visionBaseRadiusM * multiplier * view.ppm;
    var radius = base * 1.48;
    var gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(0.4, "rgba(0,0,0,0)");
    gradient.addColorStop(0.64, "rgba(0,0,0,0.62)");
    gradient.addColorStop(0.84, "rgba(0,0,0,0.92)");
    gradient.addColorStop(1, "rgba(0,0,0,0.995)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, view.width, view.height);
    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    ctx.fillRect(0, 0, view.width, view.height);
  }

  function drawExitBeaconOverFog() {
    var gate = exitGatePoint();
    var g = worldToScreen(gate.x, gate.y);
    var ratDistance = Math.sqrt(Math.pow(gate.x - state.rat.x, 2) + Math.pow(gate.y - state.rat.y, 2));
    var alpha = ratDistance < 3.8 ? clamp(1 - (ratDistance - 1.5) / 2.3, 0.12, 0.62) : 0.08;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    var r = view.ppm * 0.58;
    var glow = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, r);
    glow.addColorStop(0, "rgba(255, 236, 145, " + alpha + ")");
    glow.addColorStop(0.42, "rgba(255, 201, 68, " + (alpha * 0.42) + ")");
    glow.addColorStop(1, "rgba(255, 201, 68, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(g.x - r, g.y - r, r * 2, r * 2);
    ctx.restore();
  }

  function drawRat() {
    var frames = assets.rat;
    var moving = state.elapsedMs - state.lastMovedMs >= 0 && state.elapsedMs - state.lastMovedMs < 100;
    var index = moving ? Math.floor((state.elapsedMs % 640) / (640 / Math.max(1, frames.length))) : 9;
    var img = frames[index] || frames[0];
    var p = worldToScreen(state.rat.x, state.rat.y);
    var size = clamp(view.ppm * 0.88, 72, 180);
    var bob = moving ? Math.sin(state.elapsedMs / 52) * size * 0.014 : 0;
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    ctx.rotate(state.facingRad - Math.PI * 0.5);
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = size * 0.1;
    ctx.shadowOffsetY = size * 0.04;
    if (img) {
      ctx.drawImage(img, -size * 0.5, -size * 0.5, size, size);
    } else {
      ctx.fillStyle = "#d9dce0";
      ellipse(0, 0, size * 0.22, size * 0.31);
      ctx.fillStyle = "#f2a6b7";
      ellipse(0, -size * 0.31, size * 0.08, size * 0.06);
    }
    ctx.restore();
  }

  function drawTimeBar() {
    if (state.phase !== "play") return;
    var margin = 16;
    var y = view.height - 9;
    var w = view.width - margin * 2;
    var ratio = clamp(1 - state.elapsedMs / CONFIG.playLimitMs, 0, 1);
    ctx.fillStyle = "rgba(255,255,255,0.09)";
    roundRect(margin, y, w, 3, 2);
    ctx.fill();
    var bar = ctx.createLinearGradient(margin, y, margin + w, y);
    bar.addColorStop(0, "#5cffdf");
    bar.addColorStop(1, "#ffd35a");
    ctx.fillStyle = bar;
    roundRect(margin, y, w * ratio, 3, 2);
    ctx.fill();
  }

  function worldToScreen(x, y) {
    return {
      x: view.centerX + (x - view.cameraX) * view.ppm,
      y: view.centerY + (y - view.cameraY) * view.ppm
    };
  }

  function exitGatePoint() {
    return {
      x: maze.exit.x + 1,
      y: maze.exit.y + 0.5
    };
  }

  function drawImageCover(img, x, y, w, h, alpha) {
    var scale = Math.max(w / img.width, h / img.height);
    var sw = w / scale;
    var sh = h / scale;
    var sx = (img.width - sw) * 0.5;
    var sy = (img.height - sh) * 0.5;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    ctx.restore();
  }

  function ellipse(x, y, rx, ry) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function roundRect(x, y, w, h, r) {
    var radius = Math.max(0, Math.min(r, Math.abs(w) * 0.5, Math.abs(h) * 0.5));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function distanceBetween(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
}());
