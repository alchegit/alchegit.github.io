(() => {
  "use strict";

  const totalRounds = 10;
  const quizLimitMs = 10000;
  const storageKey = "colorMasterMemoryBest:v1";
  const difficultyScale = 0.5;
  const steps = [
    { rounds: 2, options: 2, variation: 0.42 * difficultyScale, hue: 120 * difficultyScale, previewMs: 1850 },
    { rounds: 2, options: 3, variation: 0.34 * difficultyScale, hue: 85 * difficultyScale, previewMs: 1700 },
    { rounds: 2, options: 4, variation: 0.24 * difficultyScale, hue: 55 * difficultyScale, previewMs: 1550 },
    { rounds: 2, options: 4, variation: 0.17 * difficultyScale, hue: 32 * difficultyScale, previewMs: 1450 },
    { rounds: 2, options: 6, variation: 0.11 * difficultyScale, hue: 18 * difficultyScale, previewMs: 1350 }
  ];

  const elements = {
    restart: document.getElementById("restartButton"),
    start: document.getElementById("startButton"),
    overlayRestart: document.getElementById("overlayRestartButton"),
    target: document.getElementById("targetSwatch"),
    phaseLabel: document.getElementById("phaseLabel"),
    phaseCopy: document.getElementById("phaseCopy"),
    focusBar: document.getElementById("focusBar"),
    optionGrid: document.getElementById("optionGrid"),
    round: document.getElementById("roundValue"),
    score: document.getElementById("scoreValue"),
    combo: document.getElementById("comboValue"),
    best: document.getElementById("bestValue"),
    feedback: document.getElementById("feedbackText"),
    resultOverlay: document.getElementById("resultOverlay"),
    resultTitle: document.getElementById("resultTitle"),
    resultCopy: document.getElementById("resultCopy"),
    resultAccuracy: document.getElementById("resultAccuracy"),
    resultTime: document.getElementById("resultTime"),
    resultCombo: document.getElementById("resultCombo")
  };

  const state = {
    phase: "ready",
    questions: [],
    roundIndex: 0,
    score: 0,
    combo: 0,
    maxCombo: 0,
    correctCount: 0,
    startedAt: 0,
    quizStartedAt: 0,
    previewTimer: 0,
    quizTimer: 0,
    focusTimer: 0,
    locked: false,
    best: loadBest()
  };

  elements.restart.addEventListener("click", startGame);
  elements.start.addEventListener("click", startGame);
  elements.overlayRestart.addEventListener("click", startGame);
  elements.optionGrid.addEventListener("click", handleOptionTap);

  renderReady();

  function renderReady() {
    clearTimers();
    state.phase = "ready";
    elements.resultOverlay.hidden = true;
    elements.start.disabled = false;
    elements.start.textContent = "시작";
    elements.target.classList.remove("is-hidden", "is-pop");
    elements.target.style.background = "linear-gradient(135deg, #35d7a8, #69c8ff)";
    elements.phaseLabel.textContent = "준비";
    elements.phaseCopy.textContent = "색을 보고 같은 색을 골라보세요.";
    elements.feedback.textContent = "오늘의 색감 감각을 가볍게 깨워봅니다.";
    elements.optionGrid.innerHTML = "";
    elements.optionGrid.className = "option-grid";
    elements.focusBar.style.transform = "scaleX(1)";
    updateHud();
  }

  function startGame() {
    clearTimers();
    state.phase = "preview";
    state.questions = buildQuestions();
    state.roundIndex = 0;
    state.score = 0;
    state.combo = 0;
    state.maxCombo = 0;
    state.correctCount = 0;
    state.startedAt = performance.now();
    state.locked = false;
    elements.resultOverlay.hidden = true;
    elements.start.disabled = true;
    elements.start.textContent = "진행 중";
    elements.feedback.textContent = "처음 보이는 색을 기억하세요.";
    updateHud();
    showPreview();
  }

  function showPreview() {
    clearTimers();
    const question = currentQuestion();
    if (!question) {
      finishGame();
      return;
    }

    state.phase = "preview";
    state.locked = true;
    elements.optionGrid.innerHTML = "";
    elements.optionGrid.className = `option-grid count-${question.options.length}`;
    elements.target.classList.remove("is-hidden");
    elements.target.classList.add("is-pop");
    elements.target.style.background = colorToCss(question.correct);
    elements.phaseLabel.textContent = `${state.roundIndex + 1} / ${totalRounds}`;
    elements.phaseCopy.textContent = "이 색을 기억하세요.";
    elements.feedback.textContent = previewHintForRound(state.roundIndex);
    elements.focusBar.style.transform = "scaleX(1)";
    updateHud();

    window.setTimeout(() => elements.target.classList.remove("is-pop"), 190);
    state.previewTimer = window.setTimeout(showQuiz, question.previewMs);
  }

  function showQuiz() {
    const question = currentQuestion();
    if (!question) {
      finishGame();
      return;
    }

    state.phase = "quiz";
    state.locked = false;
    state.quizStartedAt = performance.now();
    elements.target.classList.add("is-hidden");
    elements.phaseLabel.textContent = "선택";
    elements.phaseCopy.textContent = "같은 색을 탭하세요.";
    elements.feedback.textContent = `${question.options.length}개의 색 중 하나입니다.`;
    elements.optionGrid.innerHTML = question.options
      .map((color, index) => {
        return `<button class="color-option" type="button" data-index="${index}" style="--swatch: ${colorToCss(color)}" aria-label="색상 보기 ${index + 1}"></button>`;
      })
      .join("");
    elements.optionGrid.className = `option-grid count-${question.options.length}`;
    startFocusTimer();
  }

  function handleOptionTap(event) {
    const button = event.target.closest(".color-option");
    if (!button || state.phase !== "quiz" || state.locked) {
      return;
    }
    submitAnswer(Number(button.dataset.index), button);
  }

  function submitAnswer(selectedIndex, selectedButton) {
    const question = currentQuestion();
    if (!question) {
      return;
    }

    state.locked = true;
    clearTimeout(state.quizTimer);
    clearInterval(state.focusTimer);
    const buttons = [...elements.optionGrid.querySelectorAll(".color-option")];
    buttons.forEach((button) => {
      button.disabled = true;
    });

    const isTimeout = selectedIndex < 0;
    const isCorrect = selectedIndex === question.answerIndex;
    const answerMs = Math.max(0, performance.now() - state.quizStartedAt);
    buttons[question.answerIndex]?.classList.add("is-correct");
    if (!isCorrect && selectedButton) {
      selectedButton.classList.add("is-wrong");
    }

    if (isCorrect) {
      const gained = scoreRound(question, answerMs, state.combo + 1);
      state.score += gained;
      state.combo += 1;
      state.maxCombo = Math.max(state.maxCombo, state.combo);
      state.correctCount += 1;
      elements.feedback.textContent = correctCopy(answerMs, gained, state.combo);
    } else {
      state.combo = 0;
      elements.feedback.textContent = isTimeout
        ? "시간이 다 됐습니다. 정답 색을 확인하세요."
        : "조금 달랐습니다. 정답 색을 확인하세요.";
    }

    elements.target.classList.remove("is-hidden");
    elements.target.style.background = colorToCss(question.correct);
    updateHud();

    window.setTimeout(() => {
      state.roundIndex += 1;
      if (state.roundIndex >= totalRounds) {
        finishGame();
      } else {
        showPreview();
      }
    }, isCorrect ? 650 : 980);
  }

  function startFocusTimer() {
    clearTimeout(state.quizTimer);
    clearInterval(state.focusTimer);
    const startedAt = performance.now();
    elements.focusBar.style.transform = "scaleX(1)";
    state.focusTimer = window.setInterval(() => {
      const ratio = Math.max(0, 1 - (performance.now() - startedAt) / quizLimitMs);
      elements.focusBar.style.transform = `scaleX(${ratio})`;
    }, 80);
    state.quizTimer = window.setTimeout(() => {
      submitAnswer(-1, null);
    }, quizLimitMs);
  }

  function finishGame() {
    clearTimers();
    state.phase = "result";
    state.locked = true;
    const elapsedMs = Math.max(1, performance.now() - state.startedAt);
    const accuracy = Math.round((state.correctCount / totalRounds) * 100);
    const previousBest = state.best.score || 0;
    const isNewBest = state.score > previousBest;
    if (isNewBest) {
      state.best = {
        score: state.score,
        accuracy,
        elapsedMs: Math.round(elapsedMs),
        maxCombo: state.maxCombo,
        updatedAt: new Date().toISOString()
      };
      saveBest(state.best);
    }

    elements.start.disabled = false;
    elements.start.textContent = "다시";
    elements.resultTitle.textContent = isNewBest ? "새 최고 기록" : resultTitleForAccuracy(accuracy);
    elements.resultCopy.textContent = resultCopy(accuracy, state.score, isNewBest);
    elements.resultAccuracy.textContent = `정확도 ${accuracy}%`;
    elements.resultTime.textContent = `시간 ${(elapsedMs / 1000).toFixed(1)}초`;
    elements.resultCombo.textContent = `최고 콤보 ${state.maxCombo}`;
    elements.resultOverlay.hidden = false;
    elements.feedback.textContent = "색감 테스트가 끝났습니다.";
    updateHud();
  }

  function updateHud() {
    elements.round.textContent = `${Math.min(state.roundIndex + (state.phase === "ready" ? 0 : 1), totalRounds)}/${totalRounds}`;
    elements.score.textContent = String(state.score);
    elements.combo.textContent = String(state.combo);
    elements.best.textContent = String(Math.max(state.best.score || 0, state.score));
  }

  function buildQuestions() {
    const random = mulberry32(Date.now() ^ Math.floor(Math.random() * 0xffffffff));
    const questions = [];
    for (const step of steps) {
      for (let i = 0; i < step.rounds; i += 1) {
        questions.push(buildQuestion(step, random, questions.length));
      }
    }
    return questions.slice(0, totalRounds);
  }

  function buildQuestion(step, random, roundIndex) {
    const correct = safeColor(random);
    const options = [correct];
    let guard = 0;
    while (options.length < step.options && guard < 80) {
      guard += 1;
      const variant = variantColor(correct, step, random, roundIndex);
      if (options.every((color) => colorDistance(color, variant) > 5)) {
        options.push(variant);
      }
    }
    while (options.length < step.options) {
      options.push(variantColor(correct, step, random, roundIndex));
    }
    shuffle(options, random);
    return {
      correct,
      options,
      answerIndex: options.indexOf(correct),
      previewMs: step.previewMs,
      level: roundIndex + 1
    };
  }

  function safeColor(random) {
    return {
      h: Math.floor(random() * 360),
      s: Math.round(48 + random() * 38),
      l: Math.round(42 + random() * 26)
    };
  }

  function variantColor(base, step, random, roundIndex) {
    const direction = random() > 0.5 ? 1 : -1;
    const lateTighten = Math.max(0.62, 1 - roundIndex * 0.028);
    const hueShift = step.hue * lateTighten * (0.72 + random() * 0.56) * direction;
    const saturationShift = step.variation * 100 * lateTighten * (0.45 + random() * 0.8) * (random() > 0.5 ? 1 : -1);
    const lightShift = step.variation * 92 * lateTighten * (0.45 + random() * 0.8) * (random() > 0.5 ? 1 : -1);
    return {
      h: wrapHue(base.h + hueShift),
      s: clamp(base.s + saturationShift, 22, 96),
      l: clamp(base.l + lightShift, 24, 84)
    };
  }

  function scoreRound(question, answerMs, comboCount) {
    const answerSec = answerMs / 1000;
    const base = 780 + question.level * 42 + question.options.length * 35;
    const speedBonus = Math.round(Math.max(0, (quizLimitMs / 1000 - answerSec) / (quizLimitMs / 1000)) * 220);
    const gradeBonus = answerMs <= 2000 ? 240 : answerMs <= 5000 ? 130 : 55;
    const comboBonus = comboCount >= 2 ? Math.min(180, comboCount * 24) : 0;
    return base + speedBonus + gradeBonus + comboBonus;
  }

  function correctCopy(answerMs, gained, combo) {
    const grade = answerMs <= 2000 ? "PERFECT" : answerMs <= 5000 ? "EXCELLENT" : "COOL";
    return `${grade} +${gained}점 · 콤보 ${combo}`;
  }

  function previewHintForRound(roundIndex) {
    if (roundIndex < 2) {
      return "처음은 넉넉하게 보여드립니다.";
    }
    if (roundIndex < 6) {
      return "이제 색 차이가 조금 가까워집니다.";
    }
    return "작은 차이를 기억해보세요.";
  }

  function resultTitleForAccuracy(accuracy) {
    if (accuracy >= 90) {
      return "색감이 깨어났어요";
    }
    if (accuracy >= 70) {
      return "꽤 선명했습니다";
    }
    return "다시 보면 더 보입니다";
  }

  function resultCopy(accuracy, score, isNewBest) {
    if (isNewBest) {
      return `이번 기록은 ${score}점입니다. 손끝 감각이 제법 반짝였습니다.`;
    }
    if (accuracy >= 80) {
      return `이번 기록은 ${score}점입니다. 조금만 더 빠르면 최고 기록도 보입니다.`;
    }
    return `이번 기록은 ${score}점입니다. 첫 색을 조금 더 오래 붙잡아보세요.`;
  }

  function currentQuestion() {
    return state.questions[state.roundIndex] || null;
  }

  function colorToCss(color) {
    return `hsl(${Math.round(color.h)} ${Math.round(color.s)}% ${Math.round(color.l)}%)`;
  }

  function colorDistance(a, b) {
    const hue = Math.min(Math.abs(a.h - b.h), 360 - Math.abs(a.h - b.h)) / 3.6;
    return hue + Math.abs(a.s - b.s) + Math.abs(a.l - b.l);
  }

  function shuffle(items, random) {
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
  }

  function wrapHue(value) {
    return ((value % 360) + 360) % 360;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function clearTimers() {
    clearTimeout(state.previewTimer);
    clearTimeout(state.quizTimer);
    clearInterval(state.focusTimer);
  }

  function loadBest() {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function saveBest(best) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(best));
    } catch (error) {
      console.warn("Could not save Color Master Memory best score", error);
    }
  }

  function mulberry32(seed) {
    let value = seed >>> 0;
    return function next() {
      value += 0x6d2b79f5;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
})();
