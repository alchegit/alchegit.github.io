(() => {
  "use strict";

  const sessionGoalMs = 45000;
  const maxSignal = 100;
  const storageKey = "ufoSignalRoomRecord:v1";
  const gifs = ["./assets/contact_ufo1.gif", "./assets/contact_ufo3.gif"];
  const sounds = ["./assets/ufo_call_sound0.mp3", "./assets/ufo_call_sound3.mp3"];

  const elements = {
    stage: document.getElementById("signalStage"),
    visual: document.getElementById("ufoVisual"),
    start: document.getElementById("startButton"),
    stop: document.getElementById("stopButton"),
    restart: document.getElementById("restartButton"),
    mute: document.getElementById("muteButton"),
    intro: document.getElementById("introPanel"),
    result: document.getElementById("resultOverlay"),
    noiseLayer: document.getElementById("noiseLayer"),
    time: document.getElementById("timeValue"),
    signal: document.getElementById("signalValue"),
    locks: document.getElementById("lockValue"),
    total: document.getElementById("totalValue"),
    signalBar: document.getElementById("signalBar"),
    feedback: document.getElementById("feedbackText"),
    resultTitle: document.getElementById("resultTitle"),
    resultCopy: document.getElementById("resultCopy"),
    resultTime: document.getElementById("resultTime"),
    resultGrade: document.getElementById("resultGrade"),
    resultTotal: document.getElementById("resultTotal")
  };

  const state = {
    phase: "ready",
    startedAt: 0,
    lastTickAt: 0,
    elapsedMs: 0,
    signal: 0,
    locks: 0,
    lockStreak: 0,
    bestChain: 0,
    syncBursts: 0,
    syncTimer: 0,
    spawned: 0,
    missed: 0,
    muted: false,
    frameId: 0,
    spawnTimer: 0,
    audio: null,
    record: loadRecord()
  };

  elements.start.addEventListener("click", startCall);
  elements.stop.addEventListener("click", () => finishCall("manual"));
  elements.restart.addEventListener("click", startCall);
  elements.mute.addEventListener("click", toggleMute);
  window.addEventListener("pagehide", stopAudio);

  renderReady();

  function renderReady() {
    clearTimers();
    state.phase = "ready";
    state.elapsedMs = 0;
    state.signal = 0;
    state.locks = 0;
    state.lockStreak = 0;
    state.bestChain = 0;
    state.syncBursts = 0;
    state.syncTimer = 0;
    state.spawned = 0;
    state.missed = 0;
    elements.stage.classList.remove("is-calling", "is-danger", "is-synced");
    elements.intro.classList.remove("is-hidden");
    elements.result.hidden = true;
    elements.noiseLayer.innerHTML = "";
    elements.visual.src = "./assets/ufo_call_button.jpg";
    elements.stop.disabled = true;
    elements.feedback.textContent = "조용한 채널입니다.";
    updateHud();
  }

  function startCall() {
    clearTimers();
    stopAudio();
    state.phase = "calling";
    state.startedAt = performance.now();
    state.lastTickAt = state.startedAt;
    state.elapsedMs = 0;
    state.signal = 76;
    state.locks = 0;
    state.lockStreak = 0;
    state.bestChain = 0;
    state.syncBursts = 0;
    state.syncTimer = 0;
    state.spawned = 0;
    state.missed = 0;
    elements.intro.classList.add("is-hidden");
    elements.result.hidden = true;
    elements.stage.classList.add("is-calling");
    elements.stop.disabled = false;
    elements.noiseLayer.innerHTML = "";
    elements.visual.src = pick(gifs);
    elements.feedback.textContent = "신호가 열렸습니다.";
    playSignalSound();
    scheduleNoise(740);
    state.frameId = requestAnimationFrame(tick);
  }

  function tick(now) {
    if (state.phase !== "calling") {
      return;
    }

    const deltaMs = Math.min(120, now - state.lastTickAt);
    state.lastTickAt = now;
    state.elapsedMs = now - state.startedAt;
    state.syncTimer = Math.max(0, state.syncTimer - deltaMs / 1000);
    const syncEase = state.syncTimer > 0 ? 0.64 : 1;
    const drain = (4.5 + Math.min(7.5, state.elapsedMs / 7000)) * syncEase;
    state.signal = clamp(state.signal - (drain * deltaMs) / 1000, 0, maxSignal);

    updateHud();
    if (state.signal <= 0) {
      finishCall("lost");
      return;
    }
    if (state.elapsedMs >= sessionGoalMs) {
      finishCall("complete");
      return;
    }
    state.frameId = requestAnimationFrame(tick);
  }

  function scheduleNoise(delayMs) {
    clearTimeout(state.spawnTimer);
    state.spawnTimer = window.setTimeout(() => {
      if (state.phase !== "calling") {
        return;
      }
      spawnNoiseNode();
      const nextDelay = clamp(1550 - state.elapsedMs / 70, 620, 1550);
      scheduleNoise(nextDelay);
    }, delayMs);
  }

  function spawnNoiseNode() {
    state.spawned += 1;
    const node = document.createElement("button");
    node.type = "button";
    const syncCandidate = state.lockStreak >= 2;
    node.className = syncCandidate ? "noise-node is-sync" : "noise-node";
    node.setAttribute("aria-label", "신호 노이즈 안정화");
    const x = 10 + Math.random() * 76;
    const y = 12 + Math.random() * 62;
    node.style.left = `${x}%`;
    node.style.top = `${y}%`;
    const spawnedAt = performance.now();
    let resolved = false;

    const timeout = window.setTimeout(() => {
      if (resolved || state.phase !== "calling") {
        node.remove();
        return;
      }
      resolved = true;
      state.missed += 1;
      state.lockStreak = 0;
      state.signal = clamp(state.signal - 12, 0, maxSignal);
      elements.feedback.textContent = "노이즈가 신호를 갉아먹었습니다. 연속 고정이 끊겼어요.";
      node.remove();
      updateHud();
    }, 1450);

    node.addEventListener("click", () => {
      if (resolved || state.phase !== "calling") {
        return;
      }
      resolved = true;
      clearTimeout(timeout);
      const quickLock = performance.now() - spawnedAt < 900;
      state.locks += 1;
      state.lockStreak = quickLock ? state.lockStreak + 1 : Math.max(1, state.lockStreak - 1);
      state.bestChain = Math.max(state.bestChain, state.lockStreak);
      const burst = state.lockStreak > 0 && state.lockStreak % 3 === 0;
      if (burst) {
        state.syncBursts += 1;
        state.syncTimer = 3.2;
        state.signal = clamp(state.signal + 22 + Math.min(10, state.syncBursts * 2), 0, maxSignal);
      } else {
        state.signal = clamp(state.signal + 10 + Math.min(8, state.locks), 0, maxSignal);
      }
      elements.feedback.textContent = burst ? `SYNC BURST x${state.syncBursts}! 신호 감쇠가 잠시 느려집니다.` : lockCopy(state.locks, state.lockStreak, quickLock);
      node.remove();
      updateHud();
    }, { once: true });

    elements.noiseLayer.appendChild(node);
  }

  function finishCall(reason) {
    if (state.phase !== "calling") {
      return;
    }
    state.phase = "result";
    clearTimers();
    stopAudio();
    elements.noiseLayer.innerHTML = "";
    elements.stage.classList.remove("is-calling", "is-danger", "is-synced");
    elements.stop.disabled = true;
    const elapsedSec = Math.max(0, state.elapsedMs / 1000);
    const grade = gradeRun(reason, elapsedSec, state.signal, state.locks);
    state.record.totalSeconds = Math.round((state.record.totalSeconds || 0) + elapsedSec);
    state.record.bestSeconds = Math.max(Number(state.record.bestSeconds || 0), Number(elapsedSec.toFixed(1)));
    state.record.bestLocks = Math.max(Number(state.record.bestLocks || 0), state.locks);
    state.record.sessions = Math.min(999, Number(state.record.sessions || 0) + 1);
    state.record.updatedAt = new Date().toISOString();
    saveRecord(state.record);

    elements.resultTitle.textContent = titleForReason(reason, grade);
    elements.resultCopy.textContent = copyForReason(reason, grade);
    elements.resultTime.textContent = `시간 ${elapsedSec.toFixed(1)}초`;
    elements.resultGrade.textContent = `등급 ${grade} · SYNC ${state.syncBursts}`;
    elements.resultTotal.textContent = `누적 ${formatSeconds(state.record.totalSeconds)}`;
    elements.result.hidden = false;
    elements.feedback.textContent = "호출 기록이 저장되었습니다.";
    updateHud();
  }

  function updateHud() {
    const signalValue = Math.round(state.signal);
    elements.time.textContent = (state.elapsedMs / 1000).toFixed(1);
    elements.signal.textContent = `${signalValue}%`;
    elements.locks.textContent = state.lockStreak > 1 ? `${state.locks} x${state.lockStreak}` : String(state.locks);
    elements.total.textContent = formatSeconds(state.record.totalSeconds || 0);
    elements.signalBar.style.transform = `scaleX(${clamp(state.signal / maxSignal, 0, 1)})`;
    elements.stage.classList.toggle("is-danger", state.phase === "calling" && state.signal < 28);
    elements.stage.classList.toggle("is-synced", state.phase === "calling" && state.syncTimer > 0);
  }

  function playSignalSound() {
    if (state.muted) {
      return;
    }
    const audio = new Audio(pick(sounds));
    audio.loop = true;
    audio.volume = 0.45;
    state.audio = audio;
    audio.play().catch(() => {
      elements.feedback.textContent = "브라우저가 소리를 잠시 막았습니다.";
    });
  }

  function stopAudio() {
    if (state.audio) {
      state.audio.pause();
      state.audio.currentTime = 0;
      state.audio = null;
    }
  }

  function toggleMute() {
    state.muted = !state.muted;
    elements.mute.classList.toggle("is-muted", state.muted);
    elements.mute.setAttribute("aria-label", state.muted ? "소리 켜기" : "소리 끄기");
    elements.mute.textContent = state.muted ? "×" : "♪";
    if (state.muted) {
      stopAudio();
    } else if (state.phase === "calling") {
      playSignalSound();
    }
  }

  function clearTimers() {
    cancelAnimationFrame(state.frameId);
    clearTimeout(state.spawnTimer);
    state.frameId = 0;
    state.spawnTimer = 0;
  }

  function gradeRun(reason, elapsedSec, signal, locks) {
    if (reason === "complete" && signal >= 70 && locks >= 18 && state.syncBursts >= 3) {
      return "S";
    }
    if (reason === "complete") {
      return "A";
    }
    if (elapsedSec >= 30 && locks >= 10) {
      return "B";
    }
    if (elapsedSec >= 18) {
      return "C";
    }
    return "D";
  }

  function titleForReason(reason, grade) {
    if (reason === "complete") {
      return grade === "S" ? "완벽한 호출" : "호출 성공";
    }
    if (reason === "manual") {
      return "호출 종료";
    }
    return "신호 손실";
  }

  function copyForReason(reason, grade) {
    if (reason === "complete" && grade === "S") {
      return `노이즈를 거의 놓치지 않았습니다. SYNC ${state.syncBursts}회, 최고 연속 ${state.bestChain}으로 대기실이 아주 조용하게 빛났습니다.`;
    }
    if (reason === "complete") {
      return `UFO 신호가 끝까지 이어졌습니다. SYNC ${state.syncBursts}회, 최고 연속 ${state.bestChain}입니다.`;
    }
    if (reason === "manual") {
      return "직접 호출을 마쳤습니다. 누적 대기 시간은 계속 쌓입니다.";
    }
    return "신호가 끊겼습니다. 노이즈가 뜨면 조금 더 빠르게 탭해보세요.";
  }

  function lockCopy(locks, streak, quickLock) {
    if (!quickLock) {
      return `노이즈 고정. 천천히 잡아서 연속 ${streak}입니다.`;
    }
    if (streak >= 2) {
      return `연속 ${streak}! 다음 노이즈를 빠르게 잡으면 공명이 터집니다.`;
    }
    if (locks % 6 === 0) {
      return "신호가 또렷해졌습니다.";
    }
    if (locks % 3 === 0) {
      return "채널이 안정되고 있습니다.";
    }
    return "노이즈 고정.";
  }

  function loadRecord() {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function saveRecord(record) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(record));
    } catch (error) {
      console.warn("Could not save UFO signal record", error);
    }
  }

  function formatSeconds(seconds) {
    const total = Math.max(0, Math.round(Number(seconds) || 0));
    if (total < 60) {
      return `${total}s`;
    }
    const minutes = Math.floor(total / 60);
    const remain = total % 60;
    return `${minutes}m ${remain}s`;
  }

  function pick(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
})();
