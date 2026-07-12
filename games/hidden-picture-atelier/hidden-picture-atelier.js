(() => {
  "use strict";

  const targetCount = 5;
  const timeLimitSeconds = 90;
  const maxHints = 2;
  const positionVariantCount = 3;
  const nearMissMultiplier = 1.9;
  const warmMissMultiplier = 2.7;
  const loupeZoom = 1.85;
  const loupeRadiusRatio = 0.15;
  const storageKey = "hiddenPictureAtelierBest:v1";

  const elements = {
    canvas: document.getElementById("sceneCanvas"),
    title: document.getElementById("gameTitle"),
    kicker: document.getElementById("kickerLabel"),
    heroLead: document.getElementById("heroLead"),
    foundLabel: document.getElementById("foundLabel"),
    foundValue: document.getElementById("foundValue"),
    timeLabel: document.getElementById("timeLabel"),
    timeValue: document.getElementById("timeValue"),
    bestLabel: document.getElementById("bestLabel"),
    bestValue: document.getElementById("bestValue"),
    themeKicker: document.getElementById("themeKicker"),
    themeTitle: document.getElementById("themeTitle"),
    themeButtons: document.getElementById("themeButtons"),
    targetKicker: document.getElementById("targetKicker"),
    targetTitle: document.getElementById("targetTitle"),
    targetList: document.getElementById("targetList"),
    loupeButton: document.getElementById("loupeButton"),
    hintButton: document.getElementById("hintButton"),
    newGameButton: document.getElementById("newGameButton"),
    feedback: document.getElementById("feedbackText"),
    readyOverlay: document.getElementById("readyOverlay"),
    readyKicker: document.getElementById("readyKicker"),
    readyTitle: document.getElementById("readyTitle"),
    readyCopy: document.getElementById("readyCopy"),
    startButton: document.getElementById("startButton"),
    resultOverlay: document.getElementById("resultOverlay"),
    resultKicker: document.getElementById("resultKicker"),
    resultTitle: document.getElementById("resultTitle"),
    resultCopy: document.getElementById("resultCopy"),
    resultBadge: document.getElementById("resultBadge"),
    resultScore: document.getElementById("resultScore"),
    resultFound: document.getElementById("resultFound"),
    resultButton: document.getElementById("resultButton")
  };

  const ctx = elements.canvas.getContext("2d", { alpha: false });

  const copy = {
    ko: {
      pageTitle: "숨은그림 테마 아틀리에 | NeoKIM Game Cabinet",
      metaDescription: "테마를 고르고 90초 안에 숨은 물건 5개를 찾는 모바일 HTML5 숨은그림찾기 게임입니다.",
      kicker: "Hidden Picture",
      title: "숨은그림 테마 아틀리에",
      lead: "테마를 고르고 90초 안에 숨은 물건 5개를 찾아보세요.",
      found: "찾음",
      time: "남은 시간",
      best: "최고 점수",
      themeKicker: "Theme",
      themeTitle: "테마",
      targetKicker: "Objects",
      targetTitle: "찾을 물건",
      random: "랜덤",
      readyKicker: "Ready",
      readyTitle: "장면을 살펴보세요",
      readyCopy: "목록의 물건 5개를 찾아 탭하면 됩니다.",
      start: "시작",
      loupe: "돋보기",
      loupeOn: "돋보기 켜짐",
      hint: "힌트",
      newScene: "새 장면",
      retry: "다시 찾기",
      nextRandom: "랜덤으로 다시",
      readyFeedback: "테마를 고르면 바로 시작할 수 있어요.",
      startFeedback: "작은 물건들은 주변 색과 살짝 섞여 있어요.",
      loupeReady: "시작 후 돋보기를 켜고 장면을 드래그해 자세히 볼 수 있어요.",
      loupeOnFeedback: "돋보기로 수상한 부분을 훑어보세요. 다시 누르면 선택 모드로 돌아갑니다.",
      loupeOffFeedback: "돋보기를 껐어요. 이제 물건을 탭해서 찾을 수 있어요.",
      noHint: "힌트를 모두 썼어요. 장면의 가장자리도 천천히 살펴보세요.",
      wrongTap: "거긴 아닌 것 같아요. 시간 2초가 줄었어요.",
      closeTap: "거의 맞았어요. 그 주변을 조금만 더 살펴보세요.",
      warmTap: "근처에 뭔가 있어요. 시간은 1초만 줄었어요.",
      foundObject: (label) => `${label} 찾았어요.`,
      hintObject: (label) => `${label} 주변을 잠깐 비출게요.`,
      winTitle: "모두 찾았어요",
      loseTitle: "시간 종료",
      winCopy: (score) => `점수 ${score}점. 같은 테마를 더 빠르게 찾을 수 있을까요?`,
      loseCopy: (found) => `${found}개를 찾았어요. 힌트를 아껴 쓰면 더 안정적이에요.`,
      perfectBadge: "반짝 완벽",
      noMissBadge: "또렷한 눈",
      swiftBadge: "빠른 발견",
      clearBadge: "클리어",
      retryBadge: "다시 도전",
      score: "점수",
      sceneAria: "숨은그림 장면"
    },
    "en-US": {
      pageTitle: "Hidden Picture Theme Atelier | NeoKIM Game Cabinet",
      metaDescription: "A mobile HTML5 hidden-picture game where you pick a theme and find five hidden objects in 90 seconds.",
      kicker: "Hidden Picture",
      title: "Hidden Picture Theme Atelier",
      lead: "Pick a theme and find five hidden objects in 90 seconds.",
      found: "Found",
      time: "Time",
      best: "Best",
      themeKicker: "Theme",
      themeTitle: "Theme",
      targetKicker: "Objects",
      targetTitle: "Find",
      random: "Random",
      readyKicker: "Ready",
      readyTitle: "Study the scene",
      readyCopy: "Find and tap the five objects on the list.",
      start: "Start",
      loupe: "Loupe",
      loupeOn: "Loupe On",
      hint: "Hint",
      newScene: "New Scene",
      retry: "Find Again",
      nextRandom: "Random Again",
      readyFeedback: "Choose a theme, then jump right in.",
      startFeedback: "Tiny objects are blended gently into the scene.",
      loupeReady: "After starting, turn on the loupe and drag over the scene to inspect details.",
      loupeOnFeedback: "Sweep suspicious spots with the loupe. Tap it again to return to selection.",
      loupeOffFeedback: "Loupe off. You can tap objects again.",
      noHint: "No hints left. Check the edges slowly.",
      wrongTap: "Not quite. Two seconds were trimmed.",
      closeTap: "Almost there. Look a little closer around that spot.",
      warmTap: "Something is nearby. Only one second was trimmed.",
      foundObject: (label) => `Found ${label}.`,
      hintObject: (label) => `A soft ring will reveal ${label}.`,
      winTitle: "All Found",
      loseTitle: "Time Up",
      winCopy: (score) => `Score ${score}. Can you find them faster next time?`,
      loseCopy: (found) => `You found ${found}. Saving hints makes the run steadier.`,
      perfectBadge: "Spark Perfect",
      noMissBadge: "Sharp Eye",
      swiftBadge: "Swift Find",
      clearBadge: "Clear",
      retryBadge: "Try Again",
      score: "Score",
      sceneAria: "Hidden picture scene"
    },
    "ja-JP": {
      pageTitle: "隠し絵テーマアトリエ | NeoKIM Game Cabinet",
      metaDescription: "テーマを選び、90秒以内に5つの隠れた物を探すモバイルHTML5隠し絵ゲームです。",
      kicker: "Hidden Picture",
      title: "隠し絵テーマアトリエ",
      lead: "テーマを選び、90秒以内に隠れた物を5つ見つけてください。",
      found: "発見",
      time: "残り時間",
      best: "ベスト",
      themeKicker: "Theme",
      themeTitle: "テーマ",
      targetKicker: "Objects",
      targetTitle: "探す物",
      random: "ランダム",
      readyKicker: "Ready",
      readyTitle: "絵をよく見て",
      readyCopy: "リストの5つの物を見つけてタップします。",
      start: "スタート",
      loupe: "ルーペ",
      loupeOn: "ルーペ中",
      hint: "ヒント",
      newScene: "新しい絵",
      retry: "もう一度",
      nextRandom: "ランダムでもう一度",
      readyFeedback: "テーマを選べばすぐに始められます。",
      startFeedback: "小さな物は背景にやさしく溶け込んでいます。",
      loupeReady: "開始後、ルーペをオンにして絵をドラッグすると細部を見られます。",
      loupeOnFeedback: "気になる場所をルーペでなぞってください。もう一度押すと選択に戻ります。",
      loupeOffFeedback: "ルーペをオフにしました。物をタップして探せます。",
      noHint: "ヒントはもうありません。端のほうもゆっくり見てください。",
      wrongTap: "そこではなさそうです。残り時間が2秒減りました。",
      closeTap: "ほとんど正解です。その周りをもう少し見てください。",
      warmTap: "近くに何かあります。時間は1秒だけ減りました。",
      foundObject: (label) => `${label}を見つけました。`,
      hintObject: (label) => `${label}の近くを少し照らします。`,
      winTitle: "全部発見",
      loseTitle: "時間切れ",
      winCopy: (score) => `スコア ${score}。次はもっと速く探せるでしょうか？`,
      loseCopy: (found) => `${found}個見つけました。ヒントを残すと安定します。`,
      perfectBadge: "きらめき完璧",
      noMissBadge: "するどい目",
      swiftBadge: "高速発見",
      clearBadge: "クリア",
      retryBadge: "再挑戦",
      score: "スコア",
      sceneAria: "隠し絵の場面"
    }
  };

  const scenes = [
    {
      id: "anime",
      color: "#ffd86a",
      labels: { ko: "애니풍", "en-US": "Anime Mood", "ja-JP": "アニメ風" },
      draw: drawAnimeScene,
      objects: [
        object("star-pin", "starPin", 0.214, 0.255, 0.043, { ko: "별 머리핀", "en-US": "star hairpin", "ja-JP": "星のヘアピン" }),
        object("tiny-key", "tinyKey", 0.744, 0.622, 0.044, { ko: "작은 열쇠", "en-US": "tiny key", "ja-JP": "小さな鍵" }),
        object("paper-crane", "paperCrane", 0.565, 0.318, 0.046, { ko: "종이학", "en-US": "paper crane", "ja-JP": "折り鶴" }),
        object("bell-charm", "bellCharm", 0.353, 0.706, 0.045, { ko: "방울 참", "en-US": "bell charm", "ja-JP": "鈴のチャーム" }),
        object("red-ribbon", "redRibbon", 0.845, 0.238, 0.045, { ko: "빨간 리본", "en-US": "red ribbon", "ja-JP": "赤いリボン" })
      ]
    },
    {
      id: "landscape",
      color: "#7fc8ff",
      labels: { ko: "풍경", "en-US": "Landscape", "ja-JP": "風景" },
      draw: drawLandscapeScene,
      objects: [
        object("compass", "compass", 0.182, 0.606, 0.047, { ko: "나침반", "en-US": "compass", "ja-JP": "コンパス" }),
        object("red-scarf", "scarf", 0.586, 0.513, 0.05, { ko: "빨간 스카프", "en-US": "red scarf", "ja-JP": "赤いスカーフ" }),
        object("coin", "coin", 0.775, 0.742, 0.04, { ko: "동전", "en-US": "coin", "ja-JP": "コイン" }),
        object("boot-print", "bootPrint", 0.383, 0.778, 0.047, { ko: "발자국", "en-US": "boot print", "ja-JP": "足跡" }),
        object("glass-bottle", "glassBottle", 0.876, 0.396, 0.047, { ko: "유리병", "en-US": "glass bottle", "ja-JP": "ガラス瓶" })
      ]
    },
    {
      id: "medieval",
      color: "#d3a761",
      labels: { ko: "중세 예술", "en-US": "Medieval Art", "ja-JP": "中世芸術" },
      draw: drawMedievalScene,
      objects: [
        object("gold-ring", "goldRing", 0.405, 0.458, 0.043, { ko: "금반지", "en-US": "gold ring", "ja-JP": "金の指輪" }),
        object("quill", "quill", 0.772, 0.279, 0.048, { ko: "깃펜", "en-US": "quill", "ja-JP": "羽ペン" }),
        object("blue-ribbon", "blueRibbon", 0.236, 0.74, 0.049, { ko: "푸른 리본", "en-US": "blue ribbon", "ja-JP": "青いリボン" }),
        object("chalice", "chalice", 0.64, 0.672, 0.045, { ko: "작은 성배", "en-US": "tiny chalice", "ja-JP": "小さな杯" }),
        object("old-key", "oldKey", 0.841, 0.811, 0.046, { ko: "낡은 열쇠", "en-US": "old key", "ja-JP": "古い鍵" })
      ]
    },
    {
      id: "ancient",
      color: "#ffb16c",
      labels: { ko: "고대", "en-US": "Ancient", "ja-JP": "古代" },
      draw: drawAncientScene,
      objects: [
        object("scarab", "scarab", 0.312, 0.528, 0.046, { ko: "스카라브", "en-US": "scarab", "ja-JP": "スカラベ" }),
        object("sun-disk", "sunDisk", 0.69, 0.256, 0.045, { ko: "태양 원반", "en-US": "sun disk", "ja-JP": "太陽円盤" }),
        object("papyrus", "papyrus", 0.828, 0.626, 0.047, { ko: "파피루스", "en-US": "papyrus", "ja-JP": "パピルス" }),
        object("reed-brush", "reedBrush", 0.182, 0.338, 0.047, { ko: "갈대 붓", "en-US": "reed brush", "ja-JP": "葦の筆" }),
        object("cat-statue", "catStatue", 0.523, 0.777, 0.047, { ko: "고양이 상", "en-US": "cat statue", "ja-JP": "猫の像" })
      ]
    },
    {
      id: "modern",
      color: "#61e6bd",
      labels: { ko: "현대", "en-US": "Modern", "ja-JP": "現代" },
      draw: drawModernScene,
      objects: [
        object("earbud", "earbud", 0.257, 0.589, 0.045, { ko: "무선 이어버드", "en-US": "earbud", "ja-JP": "イヤーバッド" }),
        object("metro-card", "metroCard", 0.698, 0.413, 0.049, { ko: "교통카드", "en-US": "metro card", "ja-JP": "交通カード" }),
        object("camera-lens", "lens", 0.845, 0.724, 0.045, { ko: "카메라 렌즈", "en-US": "camera lens", "ja-JP": "カメラレンズ" }),
        object("sticky-note", "stickyNote", 0.421, 0.292, 0.047, { ko: "노란 메모", "en-US": "yellow memo", "ja-JP": "黄色いメモ" }),
        object("toy-car", "toyCar", 0.558, 0.804, 0.05, { ko: "장난감 자동차", "en-US": "toy car", "ja-JP": "おもちゃの車" })
      ]
    },
    {
      id: "wildlife",
      color: "#80c46f",
      labels: { ko: "동식물", "en-US": "Wildlife", "ja-JP": "動植物" },
      draw: drawWildlifeScene,
      objects: [
        object("butterfly", "butterfly", 0.178, 0.294, 0.048, { ko: "나비", "en-US": "butterfly", "ja-JP": "蝶" }),
        object("frog", "frog", 0.637, 0.696, 0.047, { ko: "작은 개구리", "en-US": "tiny frog", "ja-JP": "小さなカエル" }),
        object("red-berry", "berry", 0.806, 0.488, 0.042, { ko: "빨간 열매", "en-US": "red berry", "ja-JP": "赤い実" }),
        object("feather", "feather", 0.338, 0.813, 0.047, { ko: "깃털", "en-US": "feather", "ja-JP": "羽" }),
        object("binoculars", "binoculars", 0.514, 0.375, 0.049, { ko: "쌍안경", "en-US": "binoculars", "ja-JP": "双眼鏡" })
      ]
    }
  ];

  const state = {
    locale: "ko",
    selectedSceneId: "anime",
    scene: scenes[0],
    sceneVariant: 0,
    roundObjects: [],
    found: new Set(),
    hintsLeft: maxHints,
    started: false,
    ended: false,
    endTime: 0,
    timeLeft: timeLimitSeconds,
    score: 0,
    wrongTaps: 0,
    nearMisses: 0,
    best: loadBest(),
    feedbackKey: "readyFeedback",
    feedbackArgs: [],
    hintPulse: null,
    sparkles: [],
    ripples: [],
    loupe: {
      enabled: false,
      active: false,
      x: 0.5,
      y: 0.5,
      pointerId: null
    },
    view: { width: 960, height: 640 },
    lastRandomSceneId: ""
  };

  let animationFrame = 0;

  init();

  function init() {
    state.locale = currentLocale();
    state.roundObjects = buildRoundObjects(state.scene, state.sceneVariant);
    renderStaticCopy();
    renderThemeButtons();
    renderTargets();
    renderHud();
    renderFeedback();
    resizeCanvas();

    elements.startButton.addEventListener("click", startGame);
    elements.resultButton.addEventListener("click", () => startGame(state.selectedSceneId === "random"));
    elements.newGameButton.addEventListener("click", () => {
      startGame(state.selectedSceneId === "random");
    });
    elements.loupeButton.addEventListener("click", toggleLoupe);
    elements.hintButton.addEventListener("click", useHint);
    elements.canvas.addEventListener("pointerdown", handlePointerDown);
    elements.canvas.addEventListener("pointermove", handlePointerMove);
    elements.canvas.addEventListener("pointerup", endLoupeDrag);
    elements.canvas.addEventListener("pointercancel", endLoupeDrag);
    elements.canvas.addEventListener("pointerleave", endLoupeDrag);
    window.addEventListener("neokim:games-localechange", () => {
      state.locale = currentLocale();
      renderStaticCopy();
      renderThemeButtons();
      renderTargets();
      renderHud();
      renderFeedback();
      renderResultCopy();
    });

    if ("ResizeObserver" in window) {
      new ResizeObserver(resizeCanvas).observe(elements.canvas);
    } else {
      window.addEventListener("resize", resizeCanvas);
    }

    animationFrame = window.requestAnimationFrame(tick);
  }

  function object(id, shape, x, y, hit, labels) {
    return { id, shape, x, y, hit, labels };
  }

  function activeObjects() {
    return state.roundObjects.length ? state.roundObjects : state.scene.objects;
  }

  function buildRoundObjects(scene, variantIndex) {
    const offsets = [
      [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
      [[0.022, -0.018], [-0.026, 0.018], [0.018, 0.024], [-0.018, -0.02], [0.026, 0.012]],
      [[-0.024, 0.018], [0.02, -0.024], [-0.022, 0.016], [0.024, 0.022], [-0.018, -0.018]]
    ];
    const variantOffsets = offsets[variantIndex % offsets.length];
    return scene.objects.map((item, index) => {
      const [dx, dy] = variantOffsets[index % variantOffsets.length];
      return {
        ...item,
        x: clamp(item.x + dx, 0.08, 0.92),
        y: clamp(item.y + dy, 0.1, 0.88)
      };
    });
  }

  function currentLocale() {
    const locale = window.NEOKIM_GAMES_I18N?.getLocale?.() || document.documentElement.lang || "ko";
    if (String(locale).toLowerCase().startsWith("ja")) {
      return "ja-JP";
    }
    if (String(locale).toLowerCase().startsWith("en")) {
      return "en-US";
    }
    return "ko";
  }

  function t(key) {
    return copy[state.locale]?.[key] ?? copy.ko[key] ?? key;
  }

  function label(value) {
    return value?.[state.locale] || value?.ko || "";
  }

  function renderStaticCopy() {
    document.title = t("pageTitle");
    document.querySelector("meta[name='description']")?.setAttribute("content", t("metaDescription"));
    document.querySelector("meta[property='og:title']")?.setAttribute("content", t("pageTitle"));
    document.querySelector("meta[property='og:description']")?.setAttribute("content", t("metaDescription"));
    elements.canvas.setAttribute("aria-label", t("sceneAria"));
    elements.kicker.textContent = t("kicker");
    elements.title.textContent = t("title");
    elements.heroLead.textContent = t("lead");
    elements.foundLabel.textContent = t("found");
    elements.timeLabel.textContent = t("time");
    elements.bestLabel.textContent = t("best");
    elements.themeKicker.textContent = t("themeKicker");
    elements.themeTitle.textContent = t("themeTitle");
    elements.targetKicker.textContent = t("targetKicker");
    elements.targetTitle.textContent = t("targetTitle");
    elements.readyKicker.textContent = t("readyKicker");
    elements.readyTitle.textContent = t("readyTitle");
    elements.readyCopy.textContent = t("readyCopy");
    elements.startButton.textContent = t("start");
    elements.newGameButton.textContent = t("newScene");
    elements.resultButton.textContent = state.selectedSceneId === "random" ? t("nextRandom") : t("retry");
  }

  function renderThemeButtons() {
    const buttons = [
      ...scenes.map((scene) => ({ id: scene.id, label: label(scene.labels), color: scene.color })),
      { id: "random", label: t("random"), color: "#a997ff" }
    ];

    elements.themeButtons.innerHTML = buttons
      .map((button) => {
        const active = state.selectedSceneId === button.id;
        return `
          <button class="theme-button${active ? " is-active" : ""}${button.id === "random" ? " is-random" : ""}" type="button" data-theme="${button.id}" style="--button-color: ${button.color}">
            ${escapeHtml(button.label)}
          </button>
        `;
      })
      .join("");

    elements.themeButtons.querySelectorAll("[data-theme]").forEach((button) => {
      button.addEventListener("click", () => {
        selectScene(button.dataset.theme);
      });
    });
  }

  function selectScene(sceneId) {
    state.selectedSceneId = sceneId;
    if (sceneId !== "random") {
      state.scene = scenes.find((scene) => scene.id === sceneId) || scenes[0];
    }
    resetRound(false);
    renderThemeButtons();
    renderTargets();
    draw(performance.now());
  }

  function startGame(forceRandom = false) {
    if (state.selectedSceneId === "random" || forceRandom) {
      state.scene = pickRandomScene();
    } else {
      state.scene = scenes.find((scene) => scene.id === state.selectedSceneId) || scenes[0];
    }

    state.sceneVariant = Math.floor(Math.random() * positionVariantCount);
    state.roundObjects = buildRoundObjects(state.scene, state.sceneVariant);
    resetRound(true);
    state.started = true;
    state.ended = false;
    state.endTime = performance.now() + timeLimitSeconds * 1000;
    state.feedbackKey = "startFeedback";
    state.feedbackArgs = [];
    disableLoupe();
    elements.readyOverlay.hidden = true;
    elements.resultOverlay.hidden = true;
    renderThemeButtons();
    renderTargets();
    renderHud();
    renderFeedback();
  }

  function resetRound(keepScene) {
    if (!keepScene && state.selectedSceneId !== "random") {
      state.scene = scenes.find((scene) => scene.id === state.selectedSceneId) || scenes[0];
    }

    if (!state.roundObjects.length || !keepScene) {
      state.sceneVariant = 0;
      state.roundObjects = buildRoundObjects(state.scene, state.sceneVariant);
    }
    state.found = new Set();
    state.hintsLeft = maxHints;
    state.started = false;
    state.ended = false;
    state.endTime = 0;
    state.timeLeft = timeLimitSeconds;
    state.score = 0;
    state.wrongTaps = 0;
    state.nearMisses = 0;
    state.feedbackKey = "readyFeedback";
    state.feedbackArgs = [];
    disableLoupe();
    state.hintPulse = null;
    state.sparkles = [];
    state.ripples = [];
    elements.readyOverlay.hidden = false;
    elements.resultOverlay.hidden = true;
    renderHud();
    renderFeedback();
    renderStaticCopy();
  }

  function pickRandomScene() {
    const pool = scenes.filter((scene) => scene.id !== state.lastRandomSceneId);
    const next = pool[Math.floor(Math.random() * pool.length)] || scenes[0];
    state.lastRandomSceneId = next.id;
    return next;
  }

  function renderTargets() {
    elements.targetList.innerHTML = activeObjects()
      .map((target) => {
        const found = state.found.has(target.id);
        return `
          <li class="${found ? "is-found" : ""}">
            <canvas class="target-icon" width="44" height="44" data-shape="${escapeHtml(target.shape)}" data-found="${found ? "true" : "false"}" aria-hidden="true"></canvas>
            <span class="target-name">${escapeHtml(label(target.labels))}</span>
          </li>
        `;
      })
      .join("");
    drawTargetIcons();
  }

  function drawTargetIcons() {
    elements.targetList.querySelectorAll(".target-icon").forEach((canvas) => {
      const iconContext = canvas.getContext("2d");
      const found = canvas.dataset.found === "true";
      iconContext.clearRect(0, 0, canvas.width, canvas.height);
      iconContext.save();
      iconContext.translate(canvas.width / 2, canvas.height / 2);
      iconContext.globalAlpha = found ? 0.24 : 0.96;
      drawObjectShape(iconContext, canvas.dataset.shape, 24);
      iconContext.restore();
    });
  }

  function renderHud() {
    elements.foundValue.textContent = `${state.found.size} / ${targetCount}`;
    elements.timeValue.textContent = state.started && !state.ended
      ? Math.max(0, Math.ceil(state.timeLeft)).toString()
      : String(timeLimitSeconds);
    elements.bestValue.textContent = state.best > 0 ? String(state.best) : "--";
    elements.loupeButton.textContent = state.loupe.enabled ? t("loupeOn") : t("loupe");
    elements.loupeButton.disabled = !state.started || state.ended;
    elements.loupeButton.classList.toggle("is-active", state.loupe.enabled);
    elements.loupeButton.setAttribute("aria-pressed", state.loupe.enabled ? "true" : "false");
    elements.hintButton.textContent = `${t("hint")} ${state.hintsLeft}`;
    elements.hintButton.disabled = state.hintsLeft <= 0 || !state.started || state.ended;
  }

  function renderFeedback() {
    const value = t(state.feedbackKey);
    elements.feedback.textContent = typeof value === "function" ? value(...state.feedbackArgs) : value;
  }

  function toggleLoupe() {
    if (!state.started || state.ended) {
      state.feedbackKey = "loupeReady";
      state.feedbackArgs = [];
      renderFeedback();
      return;
    }

    state.loupe.enabled = !state.loupe.enabled;
    state.loupe.active = false;
    state.loupe.pointerId = null;
    state.feedbackKey = state.loupe.enabled ? "loupeOnFeedback" : "loupeOffFeedback";
    state.feedbackArgs = [];
    renderHud();
    renderFeedback();
  }

  function disableLoupe() {
    state.loupe.enabled = false;
    state.loupe.active = false;
    state.loupe.pointerId = null;
  }

  function renderResultCopy() {
    if (elements.resultOverlay.hidden || !state.ended) {
      return;
    }
    const won = state.found.size >= targetCount;
    elements.resultKicker.textContent = won ? "Clear" : "Result";
    elements.resultTitle.textContent = won ? t("winTitle") : t("loseTitle");
    elements.resultCopy.textContent = won ? t("winCopy")(state.score) : t("loseCopy")(state.found.size);
    elements.resultBadge.textContent = t(resultBadgeKey(won));
    elements.resultScore.textContent = `${t("score")} ${state.score}`;
    elements.resultFound.textContent = `${state.found.size} / ${targetCount}`;
    elements.resultButton.textContent = state.selectedSceneId === "random" ? t("nextRandom") : t("retry");
  }

  function useHint() {
    if (!state.started || state.ended || state.hintsLeft <= 0) {
      state.feedbackKey = "noHint";
      state.feedbackArgs = [];
      renderFeedback();
      return;
    }

    const target = activeObjects().find((item) => !state.found.has(item.id));
    if (!target) {
      return;
    }

    state.hintsLeft -= 1;
    state.hintPulse = {
      targetId: target.id,
      until: performance.now() + 1600
    };
    state.feedbackKey = "hintObject";
    state.feedbackArgs = [label(target.labels)];
    renderHud();
    renderFeedback();
  }

  function handlePointerDown(event) {
    if (!state.started || state.ended) {
      return;
    }

    const point = pointerToScene(event);
    if (state.loupe.enabled) {
      event.preventDefault();
      state.loupe.active = true;
      state.loupe.pointerId = event.pointerId;
      state.loupe.x = clamp(point.x, 0, 1);
      state.loupe.y = clamp(point.y, 0, 1);
      safelySetPointerCapture(event.pointerId);
      return;
    }

    const target = activeObjects().find((item) => !state.found.has(item.id) && hitTest(item, point));
    if (target) {
      state.found.add(target.id);
      state.score = calculateScore();
      state.feedbackKey = "foundObject";
      state.feedbackArgs = [label(target.labels)];
      state.sparkles.push({ x: target.x, y: target.y, born: performance.now() });
      renderTargets();
      renderHud();
      renderFeedback();
      if (state.found.size >= targetCount) {
        finishGame(true);
      }
      return;
    }

    const nearest = nearestHiddenTarget(point);
    const missType = classifyMiss(nearest);
    if (missType === "close") {
      state.nearMisses += 1;
      state.feedbackKey = "closeTap";
      state.ripples.push({ x: point.x, y: point.y, born: performance.now(), kind: "close" });
      renderFeedback();
      return;
    }

    state.wrongTaps += 1;
    state.endTime = Math.max(performance.now() + 1000, state.endTime - (missType === "warm" ? 1000 : 2000));
    state.feedbackKey = missType === "warm" ? "warmTap" : "wrongTap";
    state.feedbackArgs = [];
    state.ripples.push({ x: point.x, y: point.y, born: performance.now(), kind: missType });
    renderFeedback();
  }

  function handlePointerMove(event) {
    if (!state.loupe.active || state.loupe.pointerId !== event.pointerId) {
      return;
    }
    event.preventDefault();
    const point = pointerToScene(event);
    state.loupe.x = clamp(point.x, 0, 1);
    state.loupe.y = clamp(point.y, 0, 1);
  }

  function endLoupeDrag(event) {
    if (!state.loupe.active || (state.loupe.pointerId !== null && event.pointerId !== state.loupe.pointerId)) {
      return;
    }
    state.loupe.active = false;
    state.loupe.pointerId = null;
    safelyReleasePointerCapture(event.pointerId);
  }

  function pointerToScene(event) {
    const rect = elements.canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height
    };
  }

  function hitTest(target, point) {
    const minSide = Math.min(state.view.width, state.view.height);
    const dx = (point.x - target.x) * state.view.width;
    const dy = (point.y - target.y) * state.view.height;
    return Math.hypot(dx, dy) <= target.hit * minSide;
  }

  function nearestHiddenTarget(point) {
    const minSide = Math.min(state.view.width, state.view.height);
    return activeObjects()
      .filter((item) => !state.found.has(item.id))
      .map((item) => {
        const dx = (point.x - item.x) * state.view.width;
        const dy = (point.y - item.y) * state.view.height;
        return {
          item,
          distance: Math.hypot(dx, dy),
          hitRadius: item.hit * minSide
        };
      })
      .sort((a, b) => a.distance - b.distance)[0] || null;
  }

  function classifyMiss(nearest) {
    if (!nearest) {
      return "cold";
    }
    if (nearest.distance <= nearest.hitRadius * nearMissMultiplier) {
      return "close";
    }
    if (nearest.distance <= nearest.hitRadius * warmMissMultiplier) {
      return "warm";
    }
    return "cold";
  }

  function calculateScore() {
    const timeBonus = Math.max(0, Math.ceil(state.timeLeft)) * 4;
    const hintBonus = state.hintsLeft * 80;
    const foundScore = state.found.size * 320;
    const cleanBonus = state.found.size >= targetCount && state.wrongTaps === 0 ? 160 : 0;
    const penalty = state.wrongTaps * 24 + state.nearMisses * 6;
    return Math.max(0, foundScore + timeBonus + hintBonus + cleanBonus - penalty);
  }

  function resultBadgeKey(won) {
    if (!won) {
      return "retryBadge";
    }
    if (state.wrongTaps === 0 && state.hintsLeft === maxHints) {
      return "perfectBadge";
    }
    if (state.wrongTaps === 0) {
      return "noMissBadge";
    }
    if (state.timeLeft >= 42) {
      return "swiftBadge";
    }
    return "clearBadge";
  }

  function finishGame(won) {
    state.ended = true;
    state.started = false;
    disableLoupe();
    state.timeLeft = Math.max(0, state.timeLeft);
    state.score = calculateScore();
    if (won && state.score > state.best) {
      state.best = state.score;
      saveBest(state.best);
    }
    elements.resultOverlay.hidden = false;
    renderHud();
    renderResultCopy();
  }

  function tick(now) {
    if (state.started && !state.ended) {
      state.timeLeft = Math.max(0, (state.endTime - now) / 1000);
      state.score = calculateScore();
      if (state.timeLeft <= 0) {
        finishGame(false);
      }
      renderHud();
    }

    draw(now);
    animationFrame = window.requestAnimationFrame(tick);
  }

  function resizeCanvas() {
    const rect = elements.canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(320, rect.width || 960);
    const height = Math.max(320, rect.height || 640);
    elements.canvas.width = Math.round(width * ratio);
    elements.canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    state.view.width = width;
    state.view.height = height;
    draw(performance.now());
  }

  function draw(now) {
    const width = state.view.width;
    const height = state.view.height;
    ctx.clearRect(0, 0, width, height);
    drawSceneLayer(ctx, width, height, now);
    drawHintPulse(ctx, width, height, now);
    drawSparkles(ctx, width, height, now);
    drawRipples(ctx, width, height, now);
    drawLoupe(ctx, width, height, now);
  }

  function drawSceneLayer(context, width, height, now) {
    state.scene.draw(context, width, height, now, state.sceneVariant);
    activeObjects().forEach((item) => {
      drawHiddenObject(context, item, width, height, state.found.has(item.id), now);
    });
  }

  function drawAnimeScene(context, width, height, now) {
    const sky = context.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, "#9fd8ff");
    sky.addColorStop(0.52, "#ffe5c7");
    sky.addColorStop(1, "#f8f0ff");
    context.fillStyle = sky;
    context.fillRect(0, 0, width, height);
    drawCloud(context, width * 0.18, height * 0.18, width * 0.14, "#ffffff", 0.8);
    drawCloud(context, width * 0.76, height * 0.15, width * 0.17, "#fff6fb", 0.8);
    context.fillStyle = "#ffcf80";
    context.fillRect(0, height * 0.57, width, height * 0.43);
    context.fillStyle = "#e9b368";
    for (let i = 0; i < 8; i += 1) {
      context.fillRect(i * width * 0.13 - 18, height * 0.58, width * 0.07, height * 0.42);
    }
    context.fillStyle = "#ffffff";
    fillRoundRect(context, width * 0.11, height * 0.31, width * 0.22, height * 0.18, 16);
    fillRoundRect(context, width * 0.4, height * 0.29, width * 0.2, height * 0.17, 16);
    fillRoundRect(context, width * 0.7, height * 0.36, width * 0.18, height * 0.15, 16);
    context.strokeStyle = "rgba(31, 41, 56, 0.45)";
    context.lineWidth = 3;
    for (let i = 0; i < 5; i += 1) {
      const y = height * (0.66 + i * 0.058);
      line(context, 0, y, width, y);
    }
    drawTinyStars(context, width, height, now);
  }

  function drawLandscapeScene(context, width, height) {
    const sky = context.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, "#b8e7ff");
    sky.addColorStop(0.5, "#eaf8ff");
    sky.addColorStop(1, "#94d3cc");
    context.fillStyle = sky;
    context.fillRect(0, 0, width, height);
    drawMountain(context, width * 0.18, height * 0.55, width * 0.35, height * 0.35, "#6b7e8e");
    drawMountain(context, width * 0.44, height * 0.56, width * 0.42, height * 0.38, "#7d909f");
    drawMountain(context, width * 0.74, height * 0.57, width * 0.36, height * 0.33, "#647887");
    const lake = context.createLinearGradient(0, height * 0.56, 0, height);
    lake.addColorStop(0, "#73b8d8");
    lake.addColorStop(1, "#3c8fa8");
    context.fillStyle = lake;
    context.fillRect(0, height * 0.56, width, height * 0.44);
    context.globalAlpha = 0.34;
    context.fillStyle = "#ffffff";
    for (let i = 0; i < 9; i += 1) {
      context.fillRect(width * (0.08 + i * 0.105), height * (0.64 + (i % 3) * 0.07), width * 0.08, 3);
    }
    context.globalAlpha = 1;
    for (let i = 0; i < 10; i += 1) {
      drawPine(context, width * (0.05 + i * 0.1), height * (0.47 + (i % 2) * 0.03), width * 0.035);
    }
    context.fillStyle = "#5d6a70";
    fillRoundRect(context, width * 0.08, height * 0.78, width * 0.18, height * 0.06, 22);
    fillRoundRect(context, width * 0.62, height * 0.82, width * 0.2, height * 0.07, 24);
  }

  function drawMedievalScene(context, width, height) {
    const base = context.createLinearGradient(0, 0, width, height);
    base.addColorStop(0, "#f7dfaf");
    base.addColorStop(0.55, "#b98652");
    base.addColorStop(1, "#6b4b3b");
    context.fillStyle = base;
    context.fillRect(0, 0, width, height);
    context.fillStyle = "rgba(255, 248, 222, 0.82)";
    fillRoundRect(context, width * 0.09, height * 0.1, width * 0.82, height * 0.78, 18);
    context.strokeStyle = "#8c603a";
    context.lineWidth = 8;
    context.strokeRect(width * 0.12, height * 0.13, width * 0.76, height * 0.72);
    context.fillStyle = "#b84546";
    fillRoundRect(context, width * 0.18, height * 0.18, width * 0.2, height * 0.55, 8);
    context.fillStyle = "#26517a";
    fillRoundRect(context, width * 0.62, height * 0.2, width * 0.18, height * 0.5, 8);
    context.fillStyle = "#d6a744";
    for (let i = 0; i < 6; i += 1) {
      drawDiamond(context, width * (0.26 + i * 0.08), height * 0.52, width * 0.028, height * 0.045);
    }
    context.strokeStyle = "rgba(105, 74, 58, 0.34)";
    context.lineWidth = 2;
    for (let i = 0; i < 9; i += 1) {
      line(context, width * 0.16, height * (0.18 + i * 0.07), width * 0.84, height * (0.18 + i * 0.07));
    }
  }

  function drawAncientScene(context, width, height) {
    const sand = context.createLinearGradient(0, 0, 0, height);
    sand.addColorStop(0, "#f3c276");
    sand.addColorStop(0.52, "#d78f4f");
    sand.addColorStop(1, "#8d5b3f");
    context.fillStyle = sand;
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#bd7b45";
    context.fillRect(width * 0.1, height * 0.16, width * 0.8, height * 0.68);
    context.fillStyle = "#e5ad69";
    for (let i = 0; i < 6; i += 1) {
      fillRoundRect(context, width * (0.14 + i * 0.13), height * 0.2, width * 0.07, height * 0.58, 8);
    }
    context.fillStyle = "rgba(87, 58, 44, 0.28)";
    for (let i = 0; i < 22; i += 1) {
      const x = width * (0.17 + (i % 11) * 0.06);
      const y = height * (0.26 + Math.floor(i / 11) * 0.18);
      drawGlyph(context, x, y, width * 0.022, i);
    }
    context.fillStyle = "#9a5c3e";
    context.beginPath();
    context.moveTo(width * 0.1, height * 0.84);
    context.lineTo(width * 0.9, height * 0.84);
    context.lineTo(width, height);
    context.lineTo(0, height);
    context.closePath();
    context.fill();
  }

  function drawModernScene(context, width, height) {
    const wall = context.createLinearGradient(0, 0, width, height);
    wall.addColorStop(0, "#e8f4ff");
    wall.addColorStop(0.45, "#ffecef");
    wall.addColorStop(1, "#e8fff7");
    context.fillStyle = wall;
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#22314a";
    context.fillRect(0, height * 0.68, width, height * 0.32);
    context.fillStyle = "#f6f8fb";
    fillRoundRect(context, width * 0.12, height * 0.16, width * 0.27, height * 0.34, 12);
    fillRoundRect(context, width * 0.45, height * 0.13, width * 0.38, height * 0.24, 12);
    context.fillStyle = "#334155";
    fillRoundRect(context, width * 0.1, height * 0.56, width * 0.78, height * 0.1, 14);
    context.fillStyle = "#ffffff";
    fillRoundRect(context, width * 0.16, height * 0.58, width * 0.16, height * 0.05, 8);
    fillRoundRect(context, width * 0.38, height * 0.58, width * 0.2, height * 0.05, 8);
    fillRoundRect(context, width * 0.64, height * 0.58, width * 0.15, height * 0.05, 8);
    context.fillStyle = "#91c7ff";
    for (let i = 0; i < 6; i += 1) {
      context.fillRect(width * (0.17 + i * 0.1), height * 0.19, width * 0.035, height * 0.14);
    }
  }

  function drawWildlifeScene(context, width, height) {
    const jungle = context.createLinearGradient(0, 0, 0, height);
    jungle.addColorStop(0, "#d8f6b0");
    jungle.addColorStop(0.52, "#76b96d");
    jungle.addColorStop(1, "#2f694d");
    context.fillStyle = jungle;
    context.fillRect(0, 0, width, height);
    drawSunShaft(context, width * 0.16, 0, width * 0.25, height);
    drawSunShaft(context, width * 0.54, 0, width * 0.2, height);
    for (let i = 0; i < 11; i += 1) {
      drawLeafCluster(context, width * (0.04 + i * 0.095), height * (0.16 + (i % 3) * 0.08), width * 0.08, i);
    }
    context.fillStyle = "#5c3f2b";
    fillRoundRect(context, width * 0.08, height * 0.58, width * 0.12, height * 0.32, 20);
    fillRoundRect(context, width * 0.78, height * 0.45, width * 0.1, height * 0.43, 18);
    context.fillStyle = "#365a35";
    for (let i = 0; i < 12; i += 1) {
      fillRoundRect(context, width * (0.02 + i * 0.085), height * (0.78 + (i % 2) * 0.045), width * 0.12, height * 0.05, 30);
    }
  }

  function drawHiddenObject(context, item, width, height, found, now) {
    const minSide = Math.min(width, height);
    const x = item.x * width;
    const y = item.y * height;
    const size = item.hit * minSide * 1.15;
    context.save();
    context.translate(x, y);
    context.globalAlpha = found ? 0.92 : 0.86;
    drawObjectShape(context, item.shape, size);
    if (found) {
      context.globalAlpha = 1;
      context.strokeStyle = "#61e6bd";
      context.lineWidth = Math.max(3, size * 0.12);
      context.beginPath();
      context.arc(0, 0, size * (0.8 + Math.sin(now / 160) * 0.05), 0, Math.PI * 2);
      context.stroke();
    }
    context.restore();
  }

  function drawObjectShape(context, shape, size) {
    switch (shape) {
      case "starPin":
        context.strokeStyle = "#6f4b2d";
        context.lineWidth = size * 0.12;
        line(context, -size * 0.65, size * 0.5, size * 0.6, -size * 0.45);
        drawStar(context, 0, 0, size * 0.42, "#ffd85a", "#6f4b2d");
        break;
      case "tinyKey":
      case "oldKey":
        context.strokeStyle = shape === "oldKey" ? "#6b4b3b" : "#5a6778";
        context.lineWidth = size * 0.16;
        context.beginPath();
        context.arc(-size * 0.34, 0, size * 0.24, 0, Math.PI * 2);
        context.stroke();
        line(context, -size * 0.1, 0, size * 0.62, 0);
        line(context, size * 0.4, 0, size * 0.4, size * 0.28);
        line(context, size * 0.58, 0, size * 0.58, size * 0.22);
        break;
      case "paperCrane":
        context.fillStyle = "#ffffff";
        triangle(context, -size * 0.6, 0, 0, -size * 0.4, size * 0.18, size * 0.14);
        triangle(context, size * 0.62, -size * 0.04, 0, -size * 0.4, size * 0.16, size * 0.16);
        context.fillStyle = "#c8e3ff";
        triangle(context, -size * 0.15, size * 0.12, size * 0.12, size * 0.16, -size * 0.02, size * 0.54);
        context.strokeStyle = "#53657e";
        context.lineWidth = size * 0.06;
        context.stroke();
        break;
      case "bellCharm":
        context.strokeStyle = "#6f4b2d";
        context.lineWidth = size * 0.1;
        line(context, 0, -size * 0.62, 0, -size * 0.24);
        context.fillStyle = "#ffd86a";
        context.beginPath();
        context.arc(0, 0, size * 0.35, Math.PI, 0);
        context.lineTo(size * 0.32, size * 0.25);
        context.lineTo(-size * 0.32, size * 0.25);
        context.closePath();
        context.fill();
        context.stroke();
        context.fillStyle = "#6f4b2d";
        circle(context, 0, size * 0.32, size * 0.08);
        break;
      case "redRibbon":
      case "blueRibbon":
        context.fillStyle = shape === "blueRibbon" ? "#4b78d8" : "#f45b78";
        triangle(context, -size * 0.08, 0, -size * 0.62, -size * 0.34, -size * 0.58, size * 0.34);
        triangle(context, size * 0.08, 0, size * 0.62, -size * 0.34, size * 0.58, size * 0.34);
        context.fillStyle = "#ffffff";
        circle(context, 0, 0, size * 0.16);
        break;
      case "compass":
        context.fillStyle = "#e9f8ff";
        context.strokeStyle = "#23465b";
        context.lineWidth = size * 0.12;
        circleStroke(context, 0, 0, size * 0.45);
        context.fillStyle = "#f45b78";
        triangle(context, 0, -size * 0.34, size * 0.12, size * 0.08, -size * 0.03, size * 0.02);
        context.fillStyle = "#23465b";
        triangle(context, 0, size * 0.34, -size * 0.12, -size * 0.08, size * 0.03, -size * 0.02);
        break;
      case "scarf":
        context.fillStyle = "#e84e6d";
        fillRoundRect(context, -size * 0.58, -size * 0.12, size * 1.0, size * 0.24, size * 0.12);
        triangle(context, size * 0.18, size * 0.05, size * 0.62, size * 0.38, size * 0.36, -size * 0.02);
        context.fillStyle = "#ffb2c2";
        context.fillRect(-size * 0.22, -size * 0.12, size * 0.12, size * 0.24);
        break;
      case "coin":
        context.fillStyle = "#f7c957";
        context.strokeStyle = "#7a5c1e";
        context.lineWidth = size * 0.1;
        circleStroke(context, 0, 0, size * 0.4);
        context.fillStyle = "#fff0a9";
        circle(context, -size * 0.1, -size * 0.1, size * 0.13);
        break;
      case "bootPrint":
        context.fillStyle = "rgba(66, 75, 82, 0.82)";
        context.save();
        context.rotate(-0.35);
        fillRoundRect(context, -size * 0.24, -size * 0.15, size * 0.32, size * 0.54, size * 0.16);
        circle(context, size * 0.08, -size * 0.34, size * 0.08);
        circle(context, -size * 0.04, -size * 0.38, size * 0.07);
        circle(context, -size * 0.15, -size * 0.34, size * 0.06);
        context.restore();
        break;
      case "glassBottle":
        context.fillStyle = "rgba(158, 226, 218, 0.72)";
        context.strokeStyle = "#3a6b72";
        context.lineWidth = size * 0.1;
        fillRoundRect(context, -size * 0.22, -size * 0.34, size * 0.44, size * 0.72, size * 0.12);
        context.strokeRect(-size * 0.12, -size * 0.54, size * 0.24, size * 0.22);
        break;
      case "goldRing":
        context.strokeStyle = "#efc85a";
        context.lineWidth = size * 0.18;
        circleStroke(context, 0, 0, size * 0.35);
        context.strokeStyle = "#7c5b20";
        context.lineWidth = size * 0.05;
        circleStroke(context, 0, 0, size * 0.43);
        break;
      case "quill":
        context.fillStyle = "#f7efe0";
        context.strokeStyle = "#6a4a3a";
        context.lineWidth = size * 0.08;
        context.save();
        context.rotate(-0.65);
        ellipse(context, -size * 0.08, -size * 0.08, size * 0.18, size * 0.55);
        line(context, 0, -size * 0.58, 0, size * 0.62);
        context.restore();
        break;
      case "chalice":
        context.fillStyle = "#d6a744";
        context.strokeStyle = "#6a4a3a";
        context.lineWidth = size * 0.09;
        context.beginPath();
        context.moveTo(-size * 0.34, -size * 0.3);
        context.lineTo(size * 0.34, -size * 0.3);
        context.lineTo(size * 0.18, size * 0.12);
        context.lineTo(-size * 0.18, size * 0.12);
        context.closePath();
        context.fill();
        context.stroke();
        line(context, 0, size * 0.12, 0, size * 0.45);
        line(context, -size * 0.28, size * 0.46, size * 0.28, size * 0.46);
        break;
      case "scarab":
        context.fillStyle = "#2d8f8a";
        context.strokeStyle = "#38504d";
        context.lineWidth = size * 0.08;
        ellipse(context, 0, 0, size * 0.38, size * 0.48);
        line(context, 0, -size * 0.42, 0, size * 0.42);
        line(context, -size * 0.42, -size * 0.05, size * 0.42, -size * 0.05);
        break;
      case "sunDisk":
        context.fillStyle = "#ffd85a";
        context.strokeStyle = "#8d5b3f";
        context.lineWidth = size * 0.08;
        circleStroke(context, 0, 0, size * 0.36);
        for (let i = 0; i < 8; i += 1) {
          const a = i * Math.PI / 4;
          line(context, Math.cos(a) * size * 0.46, Math.sin(a) * size * 0.46, Math.cos(a) * size * 0.66, Math.sin(a) * size * 0.66);
        }
        break;
      case "papyrus":
        context.fillStyle = "#f5df9d";
        context.strokeStyle = "#7a5534";
        context.lineWidth = size * 0.08;
        fillRoundRect(context, -size * 0.42, -size * 0.28, size * 0.84, size * 0.56, size * 0.1);
        line(context, -size * 0.22, -size * 0.12, size * 0.22, -size * 0.12);
        line(context, -size * 0.18, size * 0.08, size * 0.26, size * 0.08);
        break;
      case "reedBrush":
        context.strokeStyle = "#5c4734";
        context.lineWidth = size * 0.12;
        line(context, -size * 0.46, size * 0.42, size * 0.36, -size * 0.36);
        context.fillStyle = "#2f694d";
        triangle(context, size * 0.28, -size * 0.28, size * 0.58, -size * 0.54, size * 0.44, -size * 0.12);
        break;
      case "catStatue":
        context.fillStyle = "#3e454c";
        context.strokeStyle = "#1f2938";
        context.lineWidth = size * 0.08;
        triangle(context, -size * 0.25, -size * 0.25, -size * 0.08, -size * 0.56, size * 0.02, -size * 0.22);
        triangle(context, size * 0.25, -size * 0.25, size * 0.08, -size * 0.56, -size * 0.02, -size * 0.22);
        ellipse(context, 0, -size * 0.14, size * 0.3, size * 0.28);
        fillRoundRect(context, -size * 0.23, size * 0.1, size * 0.46, size * 0.44, size * 0.16);
        break;
      case "earbud":
        context.fillStyle = "#f9fbff";
        context.strokeStyle = "#334155";
        context.lineWidth = size * 0.09;
        circleStroke(context, -size * 0.1, -size * 0.1, size * 0.22);
        fillRoundRect(context, size * 0.06, size * 0.02, size * 0.18, size * 0.48, size * 0.08);
        break;
      case "metroCard":
        context.fillStyle = "#7fc8ff";
        context.strokeStyle = "#172033";
        context.lineWidth = size * 0.08;
        fillRoundRect(context, -size * 0.48, -size * 0.28, size * 0.96, size * 0.56, size * 0.08);
        context.fillStyle = "#ffd86a";
        context.fillRect(-size * 0.34, -size * 0.11, size * 0.68, size * 0.12);
        break;
      case "lens":
        context.fillStyle = "#182235";
        context.strokeStyle = "#74d7ff";
        context.lineWidth = size * 0.1;
        circleStroke(context, 0, 0, size * 0.42);
        context.fillStyle = "#6ee7bc";
        circle(context, -size * 0.1, -size * 0.1, size * 0.12);
        break;
      case "stickyNote":
        context.fillStyle = "#ffd86a";
        context.strokeStyle = "#b68725";
        context.lineWidth = size * 0.07;
        fillRoundRect(context, -size * 0.34, -size * 0.34, size * 0.68, size * 0.68, size * 0.06);
        context.fillStyle = "rgba(255, 255, 255, 0.45)";
        triangle(context, size * 0.12, size * 0.34, size * 0.34, size * 0.12, size * 0.34, size * 0.34);
        break;
      case "toyCar":
        context.fillStyle = "#ff6f9c";
        context.strokeStyle = "#172033";
        context.lineWidth = size * 0.08;
        fillRoundRect(context, -size * 0.48, -size * 0.12, size * 0.96, size * 0.34, size * 0.12);
        context.fillStyle = "#7fc8ff";
        fillRoundRect(context, -size * 0.18, -size * 0.34, size * 0.38, size * 0.25, size * 0.08);
        context.fillStyle = "#172033";
        circle(context, -size * 0.28, size * 0.25, size * 0.12);
        circle(context, size * 0.28, size * 0.25, size * 0.12);
        break;
      case "butterfly":
        context.fillStyle = "#ffb4d0";
        ellipseRotated(context, -size * 0.2, -size * 0.05, size * 0.24, size * 0.36, -0.65);
        ellipseRotated(context, size * 0.2, -size * 0.05, size * 0.24, size * 0.36, 0.65);
        context.fillStyle = "#7c4a9d";
        fillRoundRect(context, -size * 0.04, -size * 0.32, size * 0.08, size * 0.64, size * 0.05);
        break;
      case "frog":
        context.fillStyle = "#61e66f";
        context.strokeStyle = "#245b36";
        context.lineWidth = size * 0.08;
        ellipse(context, 0, size * 0.05, size * 0.42, size * 0.32);
        circle(context, -size * 0.18, -size * 0.2, size * 0.15);
        circle(context, size * 0.18, -size * 0.2, size * 0.15);
        context.fillStyle = "#172033";
        circle(context, -size * 0.18, -size * 0.22, size * 0.04);
        circle(context, size * 0.18, -size * 0.22, size * 0.04);
        break;
      case "berry":
        context.fillStyle = "#e84e6d";
        circle(context, -size * 0.13, 0, size * 0.18);
        circle(context, size * 0.08, size * 0.02, size * 0.18);
        circle(context, 0, -size * 0.2, size * 0.16);
        context.fillStyle = "#2f694d";
        triangle(context, -size * 0.08, -size * 0.35, size * 0.12, -size * 0.34, 0, -size * 0.56);
        break;
      case "feather":
        context.fillStyle = "#c7f2ff";
        context.strokeStyle = "#2c5b64";
        context.lineWidth = size * 0.07;
        context.save();
        context.rotate(0.65);
        ellipse(context, 0, -size * 0.08, size * 0.18, size * 0.58);
        line(context, 0, -size * 0.6, 0, size * 0.55);
        context.restore();
        break;
      case "binoculars":
        context.fillStyle = "#26364a";
        context.strokeStyle = "#9bd7ff";
        context.lineWidth = size * 0.08;
        circleStroke(context, -size * 0.2, 0, size * 0.25);
        circleStroke(context, size * 0.2, 0, size * 0.25);
        fillRoundRect(context, -size * 0.12, -size * 0.12, size * 0.24, size * 0.24, size * 0.06);
        break;
      default:
        drawStar(context, 0, 0, size * 0.35, "#ffd86a", "#172033");
    }
  }

  function drawHintPulse(context, width, height, now) {
    if (!state.hintPulse || state.hintPulse.until < now) {
      state.hintPulse = null;
      return;
    }

    const target = activeObjects().find((item) => item.id === state.hintPulse.targetId);
    if (!target) {
      return;
    }

    const left = (state.hintPulse.until - now) / 1600;
    const radius = target.hit * Math.min(width, height) * (2.1 - left * 0.5);
    context.save();
    context.globalAlpha = Math.max(0, left);
    context.strokeStyle = "#ffd86a";
    context.lineWidth = 5;
    context.beginPath();
    context.arc(target.x * width, target.y * height, radius, 0, Math.PI * 2);
    context.stroke();
    context.restore();
  }

  function drawSparkles(context, width, height, now) {
    state.sparkles = state.sparkles.filter((spark) => now - spark.born < 900);
    state.sparkles.forEach((spark) => {
      const age = (now - spark.born) / 900;
      const x = spark.x * width;
      const y = spark.y * height;
      context.save();
      context.globalAlpha = 1 - age;
      for (let i = 0; i < 7; i += 1) {
        const angle = i * Math.PI * 2 / 7;
        const distance = 12 + age * 32;
        drawStar(context, x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, 5, "#61e6bd", "#172033");
      }
      context.restore();
    });
  }

  function drawRipples(context, width, height, now) {
    state.ripples = state.ripples.filter((ripple) => now - ripple.born < 520);
    state.ripples.forEach((ripple) => {
      const age = (now - ripple.born) / 520;
      context.save();
      context.globalAlpha = 1 - age;
      context.strokeStyle = ripple.kind === "close" ? "#ffd86a" : ripple.kind === "warm" ? "#7fc8ff" : "#ff6f9c";
      context.lineWidth = 4;
      context.beginPath();
      context.arc(ripple.x * width, ripple.y * height, 8 + age * 28, 0, Math.PI * 2);
      context.stroke();
      context.restore();
    });
  }

  function drawLoupe(context, width, height, now) {
    if (!state.loupe.enabled || !state.loupe.active) {
      return;
    }

    const minSide = Math.min(width, height);
    const radius = Math.max(58, minSide * loupeRadiusRatio);
    const x = clamp(state.loupe.x, 0, 1) * width;
    const y = clamp(state.loupe.y, 0, 1) * height;

    context.save();
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.clip();
    context.translate(x, y);
    context.scale(loupeZoom, loupeZoom);
    context.translate(-x, -y);
    drawSceneLayer(context, width, height, now);
    context.restore();

    context.save();
    context.lineWidth = 5;
    context.strokeStyle = "#172033";
    context.fillStyle = "rgba(255, 255, 255, 0.08)";
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    context.strokeStyle = "#ffd86a";
    context.lineWidth = 3;
    context.beginPath();
    context.arc(x, y, radius - 8, -0.85, 0.25);
    context.stroke();
    context.strokeStyle = "#172033";
    context.lineWidth = 7;
    context.lineCap = "round";
    context.beginPath();
    context.moveTo(x + radius * 0.58, y + radius * 0.58);
    context.lineTo(x + radius * 0.9, y + radius * 0.9);
    context.stroke();
    context.restore();
  }

  function drawTinyStars(context, width, height, now) {
    context.save();
    context.globalAlpha = 0.58 + Math.sin(now / 260) * 0.12;
    for (let i = 0; i < 6; i += 1) {
      drawStar(context, width * (0.14 + i * 0.14), height * (0.12 + (i % 2) * 0.16), width * 0.008, "#ffffff", "#ffffff");
    }
    context.restore();
  }

  function drawCloud(context, x, y, size, color, alpha) {
    context.save();
    context.globalAlpha = alpha;
    context.fillStyle = color;
    circle(context, x, y, size * 0.25);
    circle(context, x + size * 0.22, y - size * 0.08, size * 0.32);
    circle(context, x + size * 0.5, y, size * 0.24);
    fillRoundRect(context, x - size * 0.18, y, size * 0.82, size * 0.24, size * 0.12);
    context.restore();
  }

  function drawMountain(context, x, baseY, width, height, color) {
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(x - width * 0.5, baseY);
    context.lineTo(x, baseY - height);
    context.lineTo(x + width * 0.5, baseY);
    context.closePath();
    context.fill();
    context.fillStyle = "rgba(255, 255, 255, 0.7)";
    context.beginPath();
    context.moveTo(x, baseY - height);
    context.lineTo(x - width * 0.14, baseY - height * 0.65);
    context.lineTo(x + width * 0.09, baseY - height * 0.72);
    context.lineTo(x + width * 0.2, baseY - height * 0.56);
    context.closePath();
    context.fill();
  }

  function drawPine(context, x, y, size) {
    context.fillStyle = "#2f694d";
    triangle(context, x, y - size * 1.6, x - size, y, x + size, y);
    triangle(context, x, y - size * 1.1, x - size * 1.15, y + size * 0.55, x + size * 1.15, y + size * 0.55);
    context.fillStyle = "#5a3e2e";
    context.fillRect(x - size * 0.14, y + size * 0.4, size * 0.28, size * 0.7);
  }

  function drawDiamond(context, x, y, width, height) {
    context.beginPath();
    context.moveTo(x, y - height);
    context.lineTo(x + width, y);
    context.lineTo(x, y + height);
    context.lineTo(x - width, y);
    context.closePath();
    context.fill();
  }

  function drawGlyph(context, x, y, size, index) {
    context.save();
    context.translate(x, y);
    if (index % 4 === 0) {
      circleStroke(context, 0, 0, size);
      line(context, -size, 0, size, 0);
    } else if (index % 4 === 1) {
      triangle(context, 0, -size, -size, size, size, size);
    } else if (index % 4 === 2) {
      line(context, -size, -size, size, size);
      line(context, size, -size, -size, size);
    } else {
      fillRoundRect(context, -size, -size, size * 2, size * 2, size * 0.3);
    }
    context.restore();
  }

  function drawSunShaft(context, x, y, width, height) {
    const shaft = context.createLinearGradient(x, y, x + width, height);
    shaft.addColorStop(0, "rgba(255, 255, 255, 0.34)");
    shaft.addColorStop(1, "rgba(255, 255, 255, 0)");
    context.fillStyle = shaft;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + width, y);
    context.lineTo(x + width * 0.28, height);
    context.lineTo(x - width * 0.35, height);
    context.closePath();
    context.fill();
  }

  function drawLeafCluster(context, x, y, size, seed) {
    const colors = ["#2f7a4d", "#4c9a5a", "#7bbf65", "#276347"];
    for (let i = 0; i < 5; i += 1) {
      context.fillStyle = colors[(seed + i) % colors.length];
      ellipseRotated(context, x + Math.cos(i) * size * 0.32, y + Math.sin(i * 1.7) * size * 0.24, size * 0.42, size * 0.18, i * 0.7);
    }
  }

  function drawStar(context, x, y, radius, fill, stroke) {
    context.save();
    context.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const angle = -Math.PI / 2 + i * Math.PI / 5;
      const r = i % 2 === 0 ? radius : radius * 0.44;
      const px = x + Math.cos(angle) * r;
      const py = y + Math.sin(angle) * r;
      if (i === 0) {
        context.moveTo(px, py);
      } else {
        context.lineTo(px, py);
      }
    }
    context.closePath();
    context.fillStyle = fill;
    context.fill();
    if (stroke) {
      context.strokeStyle = stroke;
      context.lineWidth = Math.max(1.4, radius * 0.18);
      context.stroke();
    }
    context.restore();
  }

  function fillRoundRect(context, x, y, width, height, radius) {
    context.beginPath();
    if (typeof context.roundRect === "function") {
      context.roundRect(x, y, width, height, radius);
    } else {
      const r = Math.min(radius, Math.abs(width) / 2, Math.abs(height) / 2);
      context.moveTo(x + r, y);
      context.lineTo(x + width - r, y);
      context.quadraticCurveTo(x + width, y, x + width, y + r);
      context.lineTo(x + width, y + height - r);
      context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
      context.lineTo(x + r, y + height);
      context.quadraticCurveTo(x, y + height, x, y + height - r);
      context.lineTo(x, y + r);
      context.quadraticCurveTo(x, y, x + r, y);
    }
    context.fill();
  }

  function circle(context, x, y, radius) {
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  function circleStroke(context, x, y, radius) {
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }

  function ellipse(context, x, y, rx, ry) {
    context.beginPath();
    context.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }

  function ellipseRotated(context, x, y, rx, ry, rotation) {
    context.beginPath();
    context.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2);
    context.fill();
  }

  function triangle(context, x1, y1, x2, y2, x3, y3) {
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.lineTo(x3, y3);
    context.closePath();
    context.fill();
  }

  function line(context, x1, y1, x2, y2) {
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function safelySetPointerCapture(pointerId) {
    try {
      elements.canvas.setPointerCapture?.(pointerId);
    } catch (error) {
      // Pointer capture is a convenience for dragging; the loupe still works without it.
    }
  }

  function safelyReleasePointerCapture(pointerId) {
    try {
      elements.canvas.releasePointerCapture?.(pointerId);
    } catch (error) {
      // Some browsers release capture automatically when the pointer leaves the canvas.
    }
  }

  function loadBest() {
    try {
      return Number(localStorage.getItem(storageKey)) || 0;
    } catch (error) {
      return 0;
    }
  }

  function saveBest(value) {
    try {
      localStorage.setItem(storageKey, String(value));
    } catch (error) {
      // Private mode can block storage; the game still works without best score.
    }
  }

  window.addEventListener("beforeunload", () => {
    window.cancelAnimationFrame(animationFrame);
  });
})();
