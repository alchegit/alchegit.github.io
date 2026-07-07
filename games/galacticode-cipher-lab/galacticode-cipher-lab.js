(() => {
  "use strict";

  const storageKey = "galacticodeCipherLabBest:v1";
  const roundCount = 5;
  const languages = [
    { name: "Nebula", seed: 37091 },
    { name: "Mint", seed: 81421 },
    { name: "Solar", seed: 12977 }
  ];
  const samples = [
    "달빛 편지를 보내줘",
    "별 사이로 천천히 걸어",
    "오늘의 신호는 맑음",
    "작은 비밀을 숨겨",
    "다시 만날 좌표를 남겨"
  ];
  const puzzles = [
    "달빛 편지를 보내줘",
    "오늘의 신호는 맑음",
    "작은 비밀을 숨겨",
    "별 사이로 천천히 걸어",
    "다시 만날 좌표를 남겨",
    "푸른 문을 열어줘",
    "고요한 궤도를 따라가",
    "잠든 행성을 깨우지 마"
  ];
  const glyphs = [
    "∆", "⌁", "⌬", "⍟", "⎔", "◇", "◆", "◈", "◎", "◌", "◍", "◐",
    "◒", "◓", "◧", "◨", "◩", "◪", "◫", "◬", "◭", "◮", "◰", "◱",
    "◲", "◳", "◴", "◵", "◶", "◷", "★", "☆", "✦", "✧", "✶", "✷",
    "✹", "✺", "✽", "❖", "⬖", "⬗", "⬘", "⬙", "⬡", "⬢", "⬣", "⬟",
    "⬠", "⬤", "⭑", "⭒", "⭔", "⮌", "⮍", "⮎", "⮏", "⯌", "⯍", "⯎"
  ];

  const elements = {
    restart: document.getElementById("restartButton"),
    start: document.getElementById("startButton"),
    overlayRestart: document.getElementById("overlayRestartButton"),
    seedButtons: [...document.querySelectorAll(".seed-button")],
    message: document.getElementById("messageInput"),
    encoded: document.getElementById("encodedOutput"),
    sample: document.getElementById("sampleButton"),
    copy: document.getElementById("copyButton"),
    round: document.getElementById("roundValue"),
    score: document.getElementById("scoreValue"),
    streak: document.getElementById("streakValue"),
    best: document.getElementById("bestValue"),
    phase: document.getElementById("phaseLabel"),
    cipherCard: document.getElementById("cipherCard"),
    optionGrid: document.getElementById("optionGrid"),
    feedback: document.getElementById("feedbackText"),
    result: document.getElementById("resultOverlay"),
    resultTitle: document.getElementById("resultTitle"),
    resultCopy: document.getElementById("resultCopy"),
    resultAccuracy: document.getElementById("resultAccuracy"),
    resultSeed: document.getElementById("resultSeed"),
    resultStreak: document.getElementById("resultStreak")
  };

  const state = {
    seedIndex: 0,
    phase: "ready",
    rounds: [],
    roundIndex: 0,
    score: 0,
    streak: 0,
    maxStreak: 0,
    correct: 0,
    answerStartedAt: 0,
    best: loadBest()
  };

  elements.restart.addEventListener("click", startPuzzle);
  elements.start.addEventListener("click", startPuzzle);
  elements.overlayRestart.addEventListener("click", startPuzzle);
  elements.message.addEventListener("input", updateEncodedOutput);
  elements.sample.addEventListener("click", useSample);
  elements.copy.addEventListener("click", copyEncoded);
  elements.optionGrid.addEventListener("click", handleAnswer);
  elements.seedButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.seedIndex = Number(button.dataset.seedIndex) || 0;
      elements.seedButtons.forEach((item) => item.classList.toggle("is-active", item === button));
      updateEncodedOutput();
      if (state.phase !== "playing") {
        renderReadyPuzzle();
      }
    });
  });

  updateEncodedOutput();
  renderReadyPuzzle();

  function renderReadyPuzzle() {
    state.phase = "ready";
    elements.result.hidden = true;
    elements.start.disabled = false;
    elements.start.textContent = "해독 시작";
    elements.phase.textContent = `Seed ${currentLanguage().name}`;
    elements.cipherCard.textContent = encodeText("준비 완료", currentLanguage().seed);
    elements.optionGrid.innerHTML = "";
    elements.feedback.textContent = "seed를 고르면 같은 문장도 다른 은하 문자로 바뀝니다.";
    updateHud();
  }

  function startPuzzle() {
    state.phase = "playing";
    state.rounds = buildRounds();
    state.roundIndex = 0;
    state.score = 0;
    state.streak = 0;
    state.maxStreak = 0;
    state.correct = 0;
    elements.result.hidden = true;
    elements.start.disabled = true;
    elements.start.textContent = "진행중";
    renderRound();
  }

  function renderRound() {
    const round = currentRound();
    if (!round) {
      finishPuzzle();
      return;
    }
    state.answerStartedAt = performance.now();
    elements.phase.textContent = `${state.roundIndex + 1} / ${roundCount}`;
    elements.cipherCard.textContent = encodeText(round.answer, currentLanguage().seed);
    elements.optionGrid.innerHTML = round.options
      .map((option, index) => `<button class="answer-button" type="button" data-index="${index}">${escapeHtml(option)}</button>`)
      .join("");
    elements.feedback.textContent = "은하 문장을 읽고 원문을 고르세요.";
    updateHud();
  }

  function handleAnswer(event) {
    const button = event.target.closest(".answer-button");
    if (!button || state.phase !== "playing") {
      return;
    }
    const round = currentRound();
    if (!round) {
      return;
    }
    const index = Number(button.dataset.index);
    const buttons = [...elements.optionGrid.querySelectorAll(".answer-button")];
    buttons.forEach((item) => {
      item.disabled = true;
      if (Number(item.dataset.index) === round.answerIndex) {
        item.classList.add("is-correct");
      }
    });
    const correct = index === round.answerIndex;
    const elapsedMs = Math.max(0, performance.now() - state.answerStartedAt);
    if (correct) {
      const gained = scoreAnswer(elapsedMs, state.streak + 1);
      state.score += gained;
      state.streak += 1;
      state.maxStreak = Math.max(state.maxStreak, state.streak);
      state.correct += 1;
      elements.feedback.textContent = `해독 성공 +${gained}점`;
    } else {
      button.classList.add("is-wrong");
      state.streak = 0;
      elements.feedback.textContent = "틀렸습니다. 정답 문장을 확인하세요.";
    }
    updateHud();
    window.setTimeout(() => {
      state.roundIndex += 1;
      renderRound();
    }, correct ? 720 : 1050);
  }

  function finishPuzzle() {
    state.phase = "result";
    const accuracy = Math.round((state.correct / roundCount) * 100);
    const previousBest = state.best.score || 0;
    const isNewBest = state.score > previousBest;
    if (isNewBest) {
      state.best = {
        score: state.score,
        accuracy,
        maxStreak: state.maxStreak,
        seedName: currentLanguage().name,
        updatedAt: new Date().toISOString()
      };
      saveBest(state.best);
    }
    elements.start.disabled = false;
    elements.start.textContent = "다시";
    elements.resultTitle.textContent = isNewBest ? "새 해독 기록" : resultTitle(accuracy);
    elements.resultCopy.textContent = resultCopy(accuracy, state.score, isNewBest);
    elements.resultAccuracy.textContent = `정확도 ${accuracy}%`;
    elements.resultSeed.textContent = `Seed ${currentLanguage().name}`;
    elements.resultStreak.textContent = `최고 연속 ${state.maxStreak}`;
    elements.result.hidden = false;
    updateHud();
  }

  function buildRounds() {
    const random = mulberry32(currentLanguage().seed + Date.now());
    const pool = shuffle([...puzzles], random).slice(0, roundCount);
    return pool.map((answer) => {
      const options = shuffle([answer, ...pickDistractors(answer, random)], random);
      return {
        answer,
        options,
        answerIndex: options.indexOf(answer)
      };
    });
  }

  function pickDistractors(answer, random) {
    return shuffle(puzzles.filter((item) => item !== answer), random).slice(0, 3);
  }

  function scoreAnswer(elapsedMs, streak) {
    const base = 900;
    const speed = Math.max(0, Math.round(340 - elapsedMs / 18));
    const streakBonus = Math.min(240, streak * 45);
    return base + speed + streakBonus;
  }

  function updateEncodedOutput() {
    const text = elements.message.value.trim() || "메시지를 입력하세요";
    elements.encoded.textContent = encodeText(text, currentLanguage().seed);
  }

  function useSample() {
    const current = samples.indexOf(elements.message.value.trim());
    const next = samples[(current + 1 + samples.length) % samples.length];
    elements.message.value = next;
    updateEncodedOutput();
  }

  async function copyEncoded() {
    const value = elements.encoded.textContent.trim();
    try {
      await navigator.clipboard.writeText(value);
      elements.feedback.textContent = "은하 문장을 복사했습니다.";
    } catch (error) {
      elements.feedback.textContent = "복사는 브라우저 권한이 필요합니다.";
    }
  }

  function encodeText(text, seed) {
    const chars = Array.from(text);
    return chars.map((char) => {
      if (/\s/u.test(char)) {
        return " ";
      }
      const code = char.codePointAt(0) || 0;
      const index = positiveHash(code * 131 + seed * 17) % glyphs.length;
      const second = positiveHash(code * 19 + seed * 97) % glyphs.length;
      return glyphs[index] + (code % 5 === 0 ? glyphs[second] : "");
    }).join("");
  }

  function currentRound() {
    return state.rounds[state.roundIndex] || null;
  }

  function currentLanguage() {
    return languages[state.seedIndex] || languages[0];
  }

  function updateHud() {
    elements.round.textContent = `${Math.min(state.roundIndex + (state.phase === "playing" ? 1 : 0), roundCount)}/${roundCount}`;
    elements.score.textContent = String(state.score);
    elements.streak.textContent = String(state.streak);
    elements.best.textContent = String(Math.max(state.best.score || 0, state.score));
  }

  function resultTitle(accuracy) {
    if (accuracy >= 80) {
      return "해독 감각 양호";
    }
    if (accuracy >= 60) {
      return "신호가 조금 보입니다";
    }
    return "다시 스캔해봅시다";
  }

  function resultCopy(accuracy, score, isNewBest) {
    if (isNewBest) {
      return `${score}점입니다. 이번 seed와 꽤 잘 맞았습니다.`;
    }
    if (accuracy >= 80) {
      return `${score}점입니다. 정답을 고르는 속도만 더 줄이면 기록이 오릅니다.`;
    }
    return `${score}점입니다. 글리프 모양보다 문장 길이와 리듬을 먼저 보세요.`;
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
      console.warn("Could not save Galacticode best score", error);
    }
  }

  function shuffle(items, random) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function positiveHash(value) {
    let hash = value | 0;
    hash ^= hash << 13;
    hash ^= hash >>> 17;
    hash ^= hash << 5;
    return hash >>> 0;
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

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
