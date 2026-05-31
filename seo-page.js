const playLinks = {
  colorMaster2: {
    appId: "color-master-2",
    baseUrl: "https://play.google.com/store/apps/details?id=com.codexdev.color_master2",
    campaign: "color_master2"
  },
  colorMasterClassic: {
    appId: "color-master-classic",
    baseUrl: "https://play.google.com/store/apps/details?id=com.neokim.colormaster",
    campaign: "colormaster"
  },
  galacticode: {
    appId: "galacticode",
    baseUrl: "https://play.google.com/store/apps/details?id=com.galactic.speak",
    campaign: "galacticode"
  },
  callTheUfo: {
    appId: "call-the-ufo",
    baseUrl: "https://play.google.com/store/apps/details?id=com.call_the_ufo",
    campaign: "call_the_ufo"
  },
  darkMaze: {
    appId: "dark-maze",
    baseUrl: "https://play.google.com/store/apps/details?id=com.neokim.darkmaze",
    campaign: "darkmaze"
  }
};

const colorRounds = [
  { base: "#38e2bd", answer: "#1fb797" },
  { base: "#5fa8ff", answer: "#4e8ee8" },
  { base: "#f26bd9", answer: "#d84fc0" },
  { base: "#ffe15c", answer: "#ebc949" },
  { base: "#a875ff", answer: "#9e6ef0" }
];

const alienGlyphs = ["⟁", "⌁", "◇", "◌", "⟐", "⋔", "⧫", "⌬", "◍", "⟡", "⋇", "⟁", "⌖", "◈"];

function pageRuntimeText(key, fallback, vars = {}) {
  if (typeof window.NEOKIM_PAGE_T === "function") {
    return window.NEOKIM_PAGE_T(`seoRuntime.${key}`, vars, fallback);
  }

  return String(fallback).replace(/\{(\w+)\}/g, (match, name) => {
    return Object.prototype.hasOwnProperty.call(vars, name) ? vars[name] : match;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindPlayLinks();
  initColorTest();
  initClassicColorMaster();
  initGalacticodeTool();
  initUfoTool();
  initMobileStickyCta();
});

function bindPlayLinks() {
  document.querySelectorAll("[data-play-target]").forEach((link) => {
    const target = link.dataset.playTarget;
    const playInfo = playLinks[target];
    const rawHref = link.getAttribute("href") || "";

    if (playInfo && (!rawHref || rawHref === "#")) {
      link.href = buildPlayUrl(playInfo, link.dataset.utmContent || "seo_page");
    }

    if (playInfo && !link.dataset.appId) {
      link.dataset.appId = playInfo.appId;
    }

    if (!link.dataset.event) {
      link.dataset.event = "play_click";
    }

    link.addEventListener("click", () => {
      console.log("seo_play_click", {
        target,
        appId: link.dataset.appId,
        href: link.href,
        placement: link.dataset.utmContent,
        page: document.body.dataset.page
      });
    });
  });
}

function buildPlayUrl(playInfo, placement) {
  const url = new URL(playInfo.baseUrl);
  const referrer = new URLSearchParams({
    utm_source: "neokim_site",
    utm_medium: "landing",
    utm_campaign: playInfo.campaign,
    utm_content: placement
  }).toString();

  url.searchParams.set("referrer", referrer);
  return url.toString();
}

function initColorTest() {
  const grid = document.getElementById("colorTestGrid");
  const timer = document.getElementById("colorTestTimer");
  const result = document.getElementById("colorTestResult");
  const restartButton = document.getElementById("colorTestRestart");
  const installPrompt = document.getElementById("colorInstallPrompt");
  const installTitle = document.getElementById("colorInstallTitle");
  const installSummary = document.getElementById("colorInstallSummary");
  const installDetail = document.getElementById("colorInstallDetail");

  if (!grid || !timer || !result || !restartButton) {
    return;
  }

  let answerIndex = 0;
  let startTime = 0;
  let timeLeft = 10;
  let intervalId = null;
  let roundIndex = 0;
  let active = false;

  const startRound = () => {
    const round = colorRounds[roundIndex % colorRounds.length];
    answerIndex = Math.floor(Math.random() * 16);
    startTime = performance.now();
    timeLeft = 10;
    active = true;
    result.textContent = pageRuntimeText("colorPrompt", "Tap the color tile you think is the answer.");
    installPrompt?.setAttribute("hidden", "");
    timer.textContent = "00:10";
    grid.innerHTML = "";

    window.clearInterval(intervalId);
    intervalId = window.setInterval(() => {
      timeLeft -= 1;
      timer.textContent = `00:${String(Math.max(timeLeft, 0)).padStart(2, "0")}`;

      if (timeLeft <= 0) {
        active = false;
        window.clearInterval(intervalId);
        revealAnswer();
        result.textContent = pageRuntimeText("colorTimeout", "Time is up! Try the color challenge again.");
        showColorInstallPrompt("timeout");
      }
    }, 1000);

    for (let index = 0; index < 16; index += 1) {
      const button = document.createElement("button");
      const isAnswer = index === answerIndex;
      button.type = "button";
      button.className = "color-cell";
      button.style.setProperty("--tile-color", isAnswer ? round.answer : round.base);
      button.setAttribute("aria-label", pageRuntimeText("colorTileAria", "Color tile {index}", { index: index + 1 }));
      button.addEventListener("click", () => selectColor(index));
      grid.appendChild(button);
    }
  };

  const selectColor = (index) => {
    if (!active) {
      return;
    }

    active = false;
    window.clearInterval(intervalId);
    revealAnswer();

    if (index === answerIndex) {
      const seconds = Math.max(0.1, (performance.now() - startTime) / 1000).toFixed(1);
      result.textContent = pageRuntimeText("colorSpeed", "Your color reaction speed is {seconds} seconds. Challenge the ranking in the app.", { seconds });
      showColorInstallPrompt("correct");
      roundIndex += 1;
      return;
    }

    result.textContent = pageRuntimeText("colorWrong", "So close. Check the answer tile and try again.");
    showColorInstallPrompt("wrong");
  };

  const revealAnswer = () => {
    const answer = grid.children[answerIndex];
    answer?.classList.add("is-correct");
  };

  const showColorInstallPrompt = (state) => {
    if (!installPrompt || !installTitle || !installSummary || !installDetail) {
      return;
    }

    if (state === "correct") {
      installTitle.textContent = pageRuntimeText("colorCorrectTitle", "Correct!");
      installSummary.textContent = pageRuntimeText("colorCorrectSummary", "You found the odd color within 10 seconds.");
      installDetail.textContent = pageRuntimeText("colorCorrectDetail", "The app has harder color stages and ranking challenges.");
    } else {
      installTitle.textContent = pageRuntimeText("colorWrongTitle", "Nice try.");
      installSummary.textContent = pageRuntimeText("colorWrongSummary", "Similar colors can be tricky to tell apart.");
      installDetail.textContent = pageRuntimeText("colorWrongDetail", "Try again in the app and leave your best record.");
    }

    installPrompt.removeAttribute("hidden");
  };

  restartButton.addEventListener("click", startRound);
  startRound();
}

function initClassicColorMaster() {
  const memoryCard = document.getElementById("classicMemoryCard");
  const choiceStage = document.getElementById("classicChoiceStage");
  const choiceGrid = document.getElementById("classicChoiceGrid");
  const progress = document.getElementById("classicProgress");
  const roundTitle = document.getElementById("classicRoundTitle");
  const feedback = document.getElementById("classicFeedback");
  const comboText = document.getElementById("classicCombo");
  const timer = document.getElementById("classicTimer");
  const result = document.getElementById("classicResult");
  const resultSummary = document.getElementById("classicResultSummary");
  const restartButton = document.getElementById("classicRestart");

  if (!memoryCard || !choiceStage || !choiceGrid || !progress || !roundTitle || !feedback || !comboText || !timer || !restartButton) {
    return;
  }

  const rounds = [
    { answer: "#5c4bb3", decoys: ["#6f1e7b", "#63afd0", "#662c9a", "#4d2a6f"] },
    { answer: "#e75d65", decoys: ["#d94979", "#e98245", "#d36569", "#f07888"] },
    { answer: "#2f8f7a", decoys: ["#307f8a", "#38a675", "#407b73", "#229a90"] },
    { answer: "#efc743", decoys: ["#dfb848", "#f0d75b", "#d7c149", "#f2be51"] },
    { answer: "#355cc9", decoys: ["#3147b3", "#3b74d8", "#4160bd", "#274da6"] },
    { answer: "#9630c8", decoys: ["#a800d8", "#4b008d", "#7200b9", "#5e0085", "#8619b9"] },
    { answer: "#c15b2c", decoys: ["#b54a39", "#d17632", "#ad6131", "#c84e2f", "#b96b43"] },
    { answer: "#208cba", decoys: ["#2b74a8", "#36a3c0", "#1f7ea2", "#4297bd", "#256b9d"] },
    { answer: "#7d3fc7", decoys: ["#6e25bd", "#8a4ed1", "#5c2397", "#7330aa", "#923fc6"] },
    { answer: "#34008f", decoys: ["#b000d6", "#4a008f", "#7900c8", "#2a0079", "#6800b6"] }
  ];

  const totalRounds = 10;
  let roundIndex = 0;
  let correctCount = 0;
  let combo = 0;
  let history = [];
  let phase = "memory";
  let locked = false;
  let startedAt = performance.now();
  let timerId = null;

  const startTimer = () => {
    window.clearInterval(timerId);
    updateTimer();
    timerId = window.setInterval(updateTimer, 250);
  };

  const currentRound = () => rounds[roundIndex % rounds.length];

  function updateTimer() {
    const elapsed = Math.floor((performance.now() - startedAt) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = String(elapsed % 60).padStart(2, "0");
    timer.textContent = `${minutes}:${seconds}`;
  }

  function startGame() {
    roundIndex = 0;
    correctCount = 0;
    combo = 0;
    history = [];
    phase = "memory";
    locked = false;
    startedAt = performance.now();
    result?.setAttribute("hidden", "");
    choiceStage.setAttribute("hidden", "");
    memoryCard.removeAttribute("hidden");
    comboText.classList.remove("is-visible");
    startTimer();
    renderFrame();
  }

  function renderFrame() {
    if (phase === "result") {
      return;
    }

    const roundNumber = roundIndex + 1;
    roundTitle.textContent = phase === "memory"
      ? pageRuntimeText("classicMemoryTitle", "Round {roundNumber} Answer Color", { roundNumber })
      : pageRuntimeText("classicChoiceTitle", "Round {roundNumber} Color Select", { roundNumber });
    feedback.textContent = phase === "memory"
      ? pageRuntimeText("classicMemoryFeedback", "Memorize the answer color, then tap the card to choose.")
      : pageRuntimeText("classicChoiceFeedback", "Choose the card that matches the color you remembered.");
    memoryCard.style.setProperty("--answer-color", currentRound().answer);
    renderProgress();

    if (phase === "choice") {
      renderChoices();
    }
  }

  function renderProgress() {
    progress.innerHTML = "";

    for (let index = 0; index < totalRounds; index += 1) {
      const segment = document.createElement("span");
      segment.className = "classic-progress-segment";

      if (history[index] === "correct") {
        segment.classList.add("is-correct");
      } else if (history[index] === "wrong") {
        segment.classList.add("is-wrong");
      } else if (index === roundIndex && phase !== "result") {
        segment.classList.add("is-current");
      }

      progress.appendChild(segment);
    }
  }

  function showChoices() {
    if (locked || phase !== "memory") {
      return;
    }

    phase = "choice";
    memoryCard.setAttribute("hidden", "");
    choiceStage.removeAttribute("hidden");
    renderFrame();
  }

  function renderChoices() {
    const round = currentRound();
    const choiceCount = roundIndex < 5 ? 4 : 6;
    const answerPosition = (roundIndex * 3 + 1) % choiceCount;
    const colors = [];
    let decoyIndex = 0;

    for (let index = 0; index < choiceCount; index += 1) {
      colors.push(index === answerPosition ? round.answer : round.decoys[decoyIndex++ % round.decoys.length]);
    }

    choiceGrid.className = `classic-choice-grid choice-count-${choiceCount}`;
    choiceGrid.innerHTML = "";

    colors.forEach((color, index) => {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "classic-choice-tile";
      tile.style.setProperty("--tile-color", color);
      tile.style.background = color;
      tile.dataset.correct = String(index === answerPosition);
      tile.setAttribute("aria-label", pageRuntimeText("classicTileAria", "Color choice {index}", { index: index + 1 }));
      tile.addEventListener("click", () => selectTile(tile));
      choiceGrid.appendChild(tile);
    });
  }

  function selectTile(tile) {
    if (locked || phase !== "choice") {
      return;
    }

    locked = true;
    const isCorrect = tile.dataset.correct === "true";

    if (isCorrect) {
      markCorrect(tile);
      history[roundIndex] = "correct";
      correctCount += 1;
      combo += 1;
      feedback.textContent = pageRuntimeText("classicCorrect", "You chose the right color!");
      renderProgress();
      showCombo();
      window.setTimeout(nextRound, 1050);
      return;
    }

    combo = 0;
    history[roundIndex] = "wrong";
    tile.classList.add("is-breaking");
    addFragments(tile);
    revealAnswer();
    feedback.textContent = pageRuntimeText("classicWrong", "Nice try. Check the correct color.");
    renderProgress();
    window.setTimeout(nextRound, 1650);
  }

  function markCorrect(tile) {
    if (tile.querySelector(".classic-check")) {
      return;
    }

    tile.classList.add("is-correct-choice");
    const mark = document.createElement("span");
    mark.className = "classic-check";
    mark.textContent = "✓";
    tile.appendChild(mark);
  }

  function revealAnswer() {
    choiceGrid.querySelectorAll(".classic-choice-tile").forEach((tile) => {
      if (tile.dataset.correct === "true") {
        markCorrect(tile);
        tile.classList.add("is-answer-reveal");
      }
    });
  }

  function addFragments(tile) {
    const fragments = document.createElement("span");
    fragments.className = "classic-tile-fragments";

    for (let index = 0; index < 9; index += 1) {
      const fragment = document.createElement("span");
      fragment.style.setProperty("--piece-color", tile.style.getPropertyValue("--tile-color"));
      fragments.appendChild(fragment);
    }

    tile.appendChild(fragments);
  }

  function showCombo() {
    if (combo < 2) {
      comboText.textContent = "";
      comboText.classList.remove("is-visible");
      return;
    }

    comboText.textContent = pageRuntimeText("classicCombo", "{combo} COMBO", { combo });
    comboText.classList.add("is-visible");
    window.setTimeout(() => comboText.classList.remove("is-visible"), 850);
  }

  function nextRound() {
    comboText.classList.remove("is-visible");
    roundIndex += 1;

    if (roundIndex >= totalRounds) {
      showResult();
      return;
    }

    phase = "memory";
    locked = false;
    choiceStage.setAttribute("hidden", "");
    memoryCard.removeAttribute("hidden");
    renderFrame();
  }

  function showResult() {
    phase = "result";
    window.clearInterval(timerId);
    choiceStage.setAttribute("hidden", "");
    memoryCard.setAttribute("hidden", "");
    result?.removeAttribute("hidden");
    feedback.textContent = pageRuntimeText("classicComplete", "Play complete! Keep challenging yourself in the app.");
    resultSummary.textContent = correctCount === totalRounds
      ? pageRuntimeText("classicPerfect", "Amazing! You answered all 10 questions correctly.")
      : pageRuntimeText("classicScore", "You answered {correctCount} out of 10 questions correctly.", { correctCount });
    renderProgress();
  }

  memoryCard.addEventListener("click", showChoices);
  restartButton.addEventListener("click", startGame);
  startGame();
}

function initGalacticodeTool() {
  const input = document.getElementById("galacticInput");
  const output = document.getElementById("galacticOutput");
  const copyButton = document.getElementById("galacticCopy");
  const installPrompt = document.getElementById("galacticInstallPrompt");

  if (!input || !output || !copyButton) {
    return;
  }

  const convert = () => {
    const value = input.value.trim() || pageRuntimeText("galacticDefaultInput", "Hello!");
    const converted = Array.from(value)
      .map((char, index) => {
        if (char === " ") {
          return " / ";
        }

        const code = char.codePointAt(0) || 0;
        return alienGlyphs[(code + index) % alienGlyphs.length];
      })
      .join(" ");

    output.textContent = converted;
  };

  input.addEventListener("input", convert);
  copyButton.addEventListener("click", async () => {
    await copyText(output.textContent);
    installPrompt?.removeAttribute("hidden");
    copyButton.textContent = pageRuntimeText("galacticCopyDone", "Copied");
    window.setTimeout(() => {
      copyButton.textContent = pageRuntimeText("galacticCopyIdle", "Copy result");
    }, 1600);
  });

  convert();
}

function initUfoTool() {
  const stage = document.getElementById("ufoStage");
  const button = document.getElementById("ufoButton");
  const log = document.getElementById("ufoLog");
  const installPrompt = document.getElementById("ufoInstallPrompt");

  if (!stage || !button || !log) {
    return;
  }

  let callCount = 0;
  const logs = [
    ["ufoLogOne", "Transmitting signal... 3.72 GHz"],
    ["ufoLogTwo", "Atmospheric reflection detected."],
    ["ufoLogThree", "No response yet. Send it one more time?"],
    ["ufoLogFour", "An unidentified signal is ringing faintly."]
  ];

  button.addEventListener("click", () => {
    stage.classList.add("is-calling");
    const [logKey, fallback] = logs[callCount % logs.length];
    log.textContent = pageRuntimeText(logKey, fallback);
    installPrompt?.removeAttribute("hidden");
    callCount += 1;

    window.setTimeout(() => {
      stage.classList.remove("is-calling");
    }, 2600);
  });
}

function initMobileStickyCta() {
  const stickyCta = document.querySelector("[data-mobile-sticky]");
  const closeButton = stickyCta?.querySelector("[data-mobile-sticky-close]");

  if (!stickyCta) {
    return;
  }

  let dismissed = false;
  const mobileQuery = window.matchMedia("(max-width: 768px)");

  const updateVisibility = () => {
    const shouldShow = !dismissed && mobileQuery.matches && window.scrollY > 300;
    stickyCta.hidden = !shouldShow;
    stickyCta.classList.toggle("is-visible", shouldShow);
    document.body.classList.toggle("has-mobile-sticky", shouldShow);
  };

  closeButton?.addEventListener("click", () => {
    dismissed = true;
    updateVisibility();
  });

  window.addEventListener("scroll", updateVisibility, { passive: true });
  window.addEventListener("resize", updateVisibility);
  updateVisibility();
}

function copyText(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
  return Promise.resolve();
}
