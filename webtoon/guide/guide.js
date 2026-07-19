(() => {
  const samplePrompt = "폐역 플랫폼 청소 알바를 하던 F급 헌터가 막차가 끊긴 뒤 혼자 남는다. 전광판이 꺼지는 순간 균열이 열리고, 그에게만 보이는 퀘스트 창이 뜬다. 첫 미션은 단순하지만 실패 조건은 이상하게 무겁다.";
  const guideLimits = Object.freeze({ promptMin: 10, promptMax: 600, dialogueMax: 80 });
  const guideTiming = Object.freeze({
    generation: 4800,
    reducedGeneration: 4800,
    generationCompleteHold: 900,
    actorMove: 1100,
    reducedActorMove: 360,
    panelRegeneration: 2600,
    reducedPanelRegeneration: 1500,
    regenerationCompleteHold: 900
  });

  const panels = [
    {
      id: "p1",
      title: "폐역의 막차",
      line: "오늘도 F급 청소 알바로 끝나는 줄 알았는데.",
      caption: "막차가 끊긴 폐역 플랫폼에 주인공만 남는다.",
      sfx: "지직",
      accent: "#243047",
      images: ["/webtoon/assets/guide/awakening-panel-01-v1.webp"],
      bubble: { x: 6, y: 6, width: 58 },
      variant: 0
    },
    {
      id: "p2",
      title: "첫 상태창",
      line: "퀘스트? 이게 왜 나한테만 보여?",
      caption: "전광판이 꺼지는 순간, 주인공 눈앞에 상태창이 열린다.",
      sfx: "삐빅",
      accent: "#69c8ff",
      images: [
        "/webtoon/assets/guide/awakening-panel-02a-v1.webp",
        "/webtoon/assets/guide/awakening-panel-02b-v1.webp",
        "/webtoon/assets/guide/awakening-panel-02c-v1.webp"
      ],
      bubble: { x: 6, y: 6, width: 58 },
      variant: 0
    },
    {
      id: "p3",
      title: "첫 미션",
      line: "첫 미션: 플랫폼 끝까지 걸어가라. 실패 시...",
      caption: "균열 그림자가 플랫폼 끝에서 몸을 일으킨다.",
      sfx: "웅",
      accent: "#ffd85a",
      images: ["/webtoon/assets/guide/awakening-panel-03-bg-v1.webp"],
      actorImage: "/webtoon/assets/guide/awakening-character-v1.webp",
      actor: { x: 51, y: 70 },
      bubble: { x: 6, y: 6, width: 62 },
      variant: 0
    },
    {
      id: "p4",
      title: "클리프행어",
      line: "튜토리얼 보스가 입장했습니다.",
      caption: "아무도 없는 역 안에 두 번째 퀘스트 알림이 울린다.",
      sfx: "콰앙",
      accent: "#e95b88",
      images: ["/webtoon/assets/guide/awakening-panel-04-v1.webp"],
      bubble: { x: 6, y: 6, width: 58 },
      variant: 0
    }
  ];

  const progressStages = [
    { from: 0, to: 18, label: "로그라인 분석", log: "주인공의 약점, 장소, 첫 위기를 찾고 있습니다." },
    { from: 18, to: 38, label: "도입부 설계", log: "일상 균열, 상태창, 첫 미션, 다음 화 훅을 나누고 있습니다." },
    { from: 38, to: 60, label: "컷 구성", log: "준비된 폐역 장면을 이야기 순서에 맞게 배치하고 있습니다." },
    { from: 60, to: 80, label: "말풍선 배치", log: "상태창 문구와 주인공 반응이 겹치지 않게 정리하고 있습니다." },
    { from: 80, to: 96, label: "훅 강화", log: "마지막 컷에 다음 화를 누르게 만드는 알림을 넣고 있습니다." }
  ];

  const tourSteps = [
    {
      target: "[data-tour-target='prompt']",
      title: "한 줄 원고가 출발점이에요",
      text: "준비된 도입부가 입력되는 곳입니다. 실제 작업에서는 자신의 아이디어를 자유롭게 적습니다.",
      action: "다음"
    },
    {
      target: "[data-tour-target='run']",
      title: "이 버튼으로 웹툰을 만들어요",
      text: "원고를 장면으로 나누고 각 장면의 컷과 대사를 구성합니다.",
      action: "샘플 웹툰 만들기"
    },
    {
      target: "[data-tour-target='progress']",
      title: "제작 과정을 짧게 보여드릴게요",
      text: "가이드에서는 실제 생성 과정을 짧게 압축합니다. 지금 어떤 작업을 하는지 단계별로 확인하세요.",
      action: "생성 중..."
    },
    {
      target: ".guide-panel[data-panel-id='p1']",
      title: "웹툰 컷이 완성됐어요",
      text: "각 컷에는 그림, 말풍선, 효과음과 설명이 담겨 있습니다. 아래로 읽으며 흐름을 확인하세요.",
      action: "대사 수정하기"
    },
    {
      target: ".guide-panel[data-panel-id='p2'] .guide-bubble",
      title: "말풍선은 바로 고칠 수 있어요",
      text: "전체를 다시 만들 필요 없이 원하는 컷의 대사만 바꿉니다.",
      action: "대사 바꾸기"
    },
    {
      target: ".guide-panel[data-panel-id='p3'] .guide-actor",
      title: "인물 위치도 조절할 수 있어요",
      text: "인물을 드래그해 컷 안의 시선과 구도를 다듬을 수 있습니다.",
      action: "인물 옮기기"
    },
    {
      target: "#regenPanelButton",
      title: "마음에 들지 않는 컷만 다시 만들어요",
      text: "다른 컷은 유지하고 두 번째 컷만 다시 만드는 마지막 단계입니다.",
      action: "두 번째 컷 다시 그리기"
    }
  ];

  const state = {
    generated: false,
    generating: false,
    completed: new Set(),
    activeDrag: null,
    regenCount: 0,
    tourActive: false,
    tourIndex: 0,
    tourBusy: false,
    tourActions: new Set(),
    tourTarget: null,
    typingToken: 0,
    layoutTimer: 0
  };

  document.addEventListener("DOMContentLoaded", () => {
    const runButton = byId("runGuideButton");
    if (!runButton) {
      return;
    }

    byId("startTourButton").addEventListener("click", startTour);
    byId("guidePrompt").addEventListener("input", () => updateGuidePromptLimit(true));
    runButton.addEventListener("click", () => {
      if (state.tourActive && state.tourIndex === 1) {
        handleTourPrimary();
        return;
      }
      runGuide();
    });
    byId("regenPanelButton").addEventListener("click", () => {
      if (state.tourActive && state.tourIndex === 6) {
        handleTourPrimary();
        return;
      }
      regenerateSecondPanel();
    });

    byId("nextTourButton").addEventListener("click", handleTourPrimary);
    byId("previousTourButton").addEventListener("click", previousTourStep);
    byId("closeTourButton").addEventListener("click", () => closeTour(false));

    const canvas = byId("guideCanvas");
    canvas.addEventListener("input", handleBubbleEdit);
    canvas.addEventListener("pointerdown", startDrag);
    canvas.addEventListener("pointermove", moveDrag);
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);

    window.addEventListener("resize", scheduleTourLayout);
    window.addEventListener("scroll", scheduleTourLayout, { passive: true });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && state.tourActive) {
        closeTour();
      }
    });

    updateGuidePromptLimit(true);
    updateSteps();
    preloadGuideAssets();
    if (new URLSearchParams(window.location.search).get("autoplay") === "1") {
      window.setTimeout(startTour, 220);
    }
  });

  function startTour() {
    resetGuide();
    state.tourActive = true;
    state.tourIndex = 0;
    state.tourActions.clear();
    byId("guideTour").hidden = false;
    document.body.classList.add("is-guide-touring");
    showTourStep(0);
    typeText(byId("guidePrompt"), samplePrompt, 760).then(() => {
      byId("runGuideButton").disabled = false;
      state.tourBusy = false;
      renderTourCoach();
    });
  }

  function resetGuide() {
    state.typingToken += 1;
    state.generated = false;
    state.generating = false;
    state.completed.clear();
    state.regenCount = 0;
    state.tourBusy = false;
    byId("guidePrompt").value = "";
    updateGuidePromptLimit(false);
    byId("runGuideButton").disabled = true;
    byId("regenPanelButton").disabled = true;
    setProgress(0, "대기 중", "단계를 따라 원고부터 부분 재생성까지 체험합니다.");
    byId("guideCanvas").className = "guide-canvas is-empty";
    byId("guideCanvas").innerHTML = `
      <div class="guide-empty">
        <strong>샘플 원고로 웹툰을 만들어보세요.</strong>
        <span>완성 장면을 확인하고 말풍선, 인물 위치, 원하는 컷만 차례로 수정해봅니다.</span>
      </div>
    `;
    updateSteps();
  }

  function runGuide() {
    if (state.generating) {
      return Promise.resolve();
    }
    if (byId("guidePrompt").value.trim().length < guideLimits.promptMin) {
      flash(`샘플 원고를 ${guideLimits.promptMin}자 이상 적어주세요`);
      return Promise.resolve();
    }

    const button = byId("runGuideButton");
    button.disabled = true;
    state.generated = false;
    state.generating = true;
    markDone("run");
    byId("regenPanelButton").disabled = true;
    setProgress(0, "원고 접수", "샘플 원고를 읽기 시작합니다.");
    byId("guideCanvas").className = "guide-canvas is-loading";
    byId("guideCanvas").innerHTML = `
      <div class="guide-loader" aria-label="컷 생성 중">
        <span></span><span></span><span></span>
      </div>
    `;

    return new Promise((resolve) => {
      const started = performance.now();
      const duration = reducedMotion() ? guideTiming.reducedGeneration : guideTiming.generation;

      function tick(now) {
        const elapsed = Math.max(0, now - started);
        const overall = Math.min(1, elapsed / duration);
        const stagePosition = overall * progressStages.length;
        const stageIndex = Math.min(progressStages.length - 1, Math.floor(stagePosition));
        const stageProgress = overall >= 1 ? 1 : stagePosition - stageIndex;
        const stage = progressStages[stageIndex];
        const percent = Math.round(stage.from + (stage.to - stage.from) * stageProgress);
        setProgress(percent, `${stageIndex + 1} / ${progressStages.length} · ${stage.label}`, stage.log);

        if (overall < 1) {
          requestAnimationFrame(tick);
          return;
        }

        setProgress(100, "장면 확인", "완성된 네 장면을 화면에 배치하고 있습니다.");
        readableWait(guideTiming.generationCompleteHold).then(() => {
          completeGeneration();
          resolve();
        });
      }

      requestAnimationFrame(tick);
    });
  }

  function completeGeneration() {
    state.generated = true;
    state.generating = false;
    markDone("view");
    renderCanvas();
    byId("runGuideButton").disabled = false;
    byId("regenPanelButton").disabled = false;
    setProgress(100, "완료", "준비된 컷을 확인한 뒤 대사와 구도를 직접 다듬어보세요.");
    flash("4컷 도입부 완성");

    if (state.tourActive && state.tourIndex === 2) {
      state.tourBusy = false;
      renderTourCoach({ action: "결과 보기", text: "준비된 네 장면이 컷과 대사로 완성됐습니다. 이제 결과를 직접 확인합니다." });
      scheduleTourLayout();
    }
  }

  function regenerateSecondPanel() {
    if (!state.generated || panels[1].regenerating) {
      return Promise.resolve();
    }

    const button = byId("regenPanelButton");
    const panel = panels[1];
    button.disabled = true;
    panel.regenerating = true;
    renderCanvas();
    setProgress(18, "두 번째 컷 분석", "선택한 컷에서 유지할 대사와 구도를 먼저 확인합니다.");

    return new Promise((resolve) => {
      const started = performance.now();
      const duration = reducedMotion() ? guideTiming.reducedPanelRegeneration : guideTiming.panelRegeneration;

      function tick(now) {
        const ratio = Math.min(1, (now - started) / duration);
        const percent = Math.round(18 + ratio * 82);
        setProgress(percent, ratio < 0.72 ? "두 번째 컷 다시 만들기" : "새 구도 정리", ratio < 0.72 ? "선택한 컷만 빠르게 다시 만들고 있습니다." : "말풍선과 인물 위치를 새 장면에 맞추고 있습니다.");
        if (ratio < 1) {
          requestAnimationFrame(tick);
          return;
        }

        state.regenCount += 1;
        panel.variant = (panel.variant + 1) % panel.images.length;
        panel.accent = ["#ffd85a", "#8f78ff", "#ff9a6c"][panel.variant];
        panel.line = [
          "퀘스트 창이... 내 심장 박동이랑 같이 깜빡여.",
          "보상: 임시 스킬 개방. 제한 시간 10초.",
          "좋아, 이번 컷은 상태창을 더 크게 보여주자."
        ][panel.variant];
        panel.sfx = ["삐빅", "지잉", "개방"][panel.variant];
        panel.regenerating = false;
        markDone("regen");
        renderCanvas();
        setProgress(100, "컷 다시 만들기 완료", "두 번째 컷만 새 구도와 대사로 바뀌었습니다.");
        button.disabled = false;
        flash("두 번째 컷만 새로 완성");
        resolve();
      }

      requestAnimationFrame(tick);
    });
  }

  function renderCanvas() {
    const canvas = byId("guideCanvas");
    canvas.className = "guide-canvas is-ready";
    canvas.innerHTML = panels.map((panel, index) => renderPanel(panel, index)).join("");
  }

  function renderPanel(panel, index) {
    const soft = soften(panel.accent);
    const image = panel.images[panel.variant % panel.images.length];
    const actor = panel.actorImage ? `
      <div class="guide-actor guide-draggable" data-part="actor" data-panel-id="${panel.id}" style="left:${panel.actor.x}%;top:${panel.actor.y}%;" role="img" aria-label="${index + 1}컷에서 이동할 주인공">
        <img src="${panel.actorImage}" alt="" draggable="false">
      </div>
    ` : "";
    return `
      <article class="guide-panel" data-panel-id="${panel.id}" aria-label="${index + 1}컷, ${escapeHtml(panel.caption)}" style="--panel-accent:${panel.accent};--panel-soft:${soft};--panel-image:url('${image}');--bubble-left:${panel.bubble.x}%;--bubble-top:${panel.bubble.y}%;--bubble-width:${panel.bubble.width}%;">
        <div class="guide-panel-meta">
          <span>${index + 1}컷</span>
          <strong>${escapeHtml(panel.title)}</strong>
          <small data-bubble-count>${panel.line.length} / ${guideLimits.dialogueMax}</small>
        </div>
        <div class="guide-bubble" contenteditable="true" spellcheck="false" data-maxlength="${guideLimits.dialogueMax}" data-panel-id="${panel.id}" aria-label="${index + 1}컷 말풍선 · 최대 ${guideLimits.dialogueMax}자">${escapeHtml(panel.line)}</div>
        ${actor}
        <strong class="guide-sfx">${escapeHtml(panel.sfx)}</strong>
        <p class="guide-caption">${escapeHtml(panel.caption)}</p>
        ${panel.regenerating ? '<div class="guide-panel-overlay"><span></span><strong>두 번째 컷만 다시 만드는 중</strong></div>' : ""}
      </article>
    `;
  }

  function handleBubbleEdit(event) {
    const bubble = event.target.closest(".guide-bubble");
    if (!bubble) {
      return;
    }
    const panel = panels.find((item) => item.id === bubble.dataset.panelId);
    if (!panel) {
      return;
    }
    const clipped = String(bubble.textContent || "").slice(0, guideLimits.dialogueMax);
    if (bubble.textContent !== clipped) {
      bubble.textContent = clipped;
      placeCaretAtEnd(bubble);
      flash(`말풍선은 최대 ${guideLimits.dialogueMax}자입니다`);
    }
    panel.line = clipped.trim() || "새 대사를 입력하세요.";
    const counter = bubble.closest(".guide-panel")?.querySelector("[data-bubble-count]");
    if (counter) {
      counter.textContent = `${panel.line.length} / ${guideLimits.dialogueMax}`;
      counter.classList.toggle("is-recommended-over", panel.line.length > 45);
    }
    markDone("speech");
  }

  function startDrag(event) {
    const target = event.target.closest(".guide-draggable");
    if (!target) {
      return;
    }
    const panelElement = target.closest(".guide-panel");
    const panel = panels.find((item) => item.id === target.dataset.panelId);
    if (!panel) {
      return;
    }
    target.setPointerCapture(event.pointerId);
    state.activeDrag = { pointerId: event.pointerId, panel, part: target.dataset.part, panelElement, target };
    target.classList.add("is-dragging");
    event.preventDefault();
  }

  function moveDrag(event) {
    const drag = state.activeDrag;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    const rect = drag.panelElement.getBoundingClientRect();
    const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 14, 86);
    const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 28, 78);
    drag.panel[drag.part] = { x, y };
    drag.target.style.left = `${x}%`;
    drag.target.style.top = `${y}%`;
    markDone("move");
    scheduleTourLayout();
  }

  function endDrag(event) {
    const drag = state.activeDrag;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    drag.target.classList.remove("is-dragging");
    state.activeDrag = null;
    flash("그림 위치 이동 완료");
  }

  async function handleTourPrimary() {
    if (!state.tourActive || state.tourBusy) {
      return;
    }

    switch (state.tourIndex) {
      case 0:
        showTourStep(1);
        break;
      case 1:
        state.tourBusy = true;
        showTourStep(2);
        runGuide();
        break;
      case 2:
        if (state.generated) {
          showTourStep(3);
        }
        break;
      case 3:
        showTourStep(4);
        break;
      case 4:
        if (!state.tourActions.has(4)) {
          state.tourBusy = true;
          renderTourCoach({ title: "말풍선을 수정하는 중", text: "준비된 대사가 현재 컷의 말풍선에 입력되고 있습니다.", action: "대사 입력 중...", disabled: true });
          await autoEditSpeech();
          state.tourBusy = false;
          state.tourActions.add(4);
          renderTourCoach({ title: "대사만 깔끔하게 바뀌었어요", text: "컷의 그림은 유지한 채 말풍선만 수정됐습니다.", action: "그림 위치 조절하기" });
          updateTourLayout();
        } else {
          showTourStep(5);
        }
        break;
      case 5:
        if (!state.tourActions.has(5)) {
          state.tourBusy = true;
          renderTourCoach({ title: "인물 위치를 조절하는 중", text: "선택한 인물을 컷의 중심선에 맞춰 자연스럽게 옮기고 있습니다.", action: "이동 중...", disabled: true });
          await autoMoveActor();
          state.tourBusy = false;
          state.tourActions.add(5);
          renderTourCoach({ title: "인물을 옮겨 구도가 달라졌어요", text: "직접 드래그할 때도 같은 방식으로 컷 안에서 위치를 정할 수 있습니다.", action: "마지막 단계" });
          updateTourLayout();
        } else {
          showTourStep(6);
        }
        break;
      case 6:
        if (!state.tourActions.has(6)) {
          state.tourBusy = true;
          renderTourCoach({
            title: "두 번째 컷만 다시 만드는 중",
            text: "다른 세 컷은 잠근 채 선택한 컷의 구도와 대사만 교체합니다.",
            action: "다시 만드는 중...",
            disabled: true,
            progress: { percent: 18, label: "유지할 요소 확인" }
          });
          await regenerateSecondPanel();
          await readableWait(guideTiming.regenerationCompleteHold);
          state.tourBusy = false;
          state.tourActions.add(6);
          renderTourCoach();
          updateTourLayout();
        } else if (!state.tourActions.has("6-summary")) {
          state.tourActions.add("6-summary");
          renderTourCoach();
          updateTourLayout();
        } else {
          closeTour(true);
        }
        break;
      default:
        break;
    }
  }

  function previousTourStep() {
    if (!state.tourActive || state.tourBusy || state.tourIndex === 0) {
      return;
    }
    showTourStep(state.tourIndex - 1);
  }

  function showTourStep(index) {
    state.tourIndex = clamp(index, 0, tourSteps.length - 1);
    state.tourBusy = (state.tourIndex === 0 && byId("guidePrompt").value.length < samplePrompt.length)
      || (state.tourIndex === 2 && !state.generated);
    renderTourCoach();

    const target = resolveTourTarget();
    if (!target) {
      return;
    }
    setTourTarget(target);
    target.scrollIntoView({ behavior: "instant", block: "center", inline: "nearest" });
    window.clearTimeout(state.layoutTimer);
    state.layoutTimer = window.setTimeout(updateTourLayout, 30);
  }

  function renderTourCoach(overrides = {}) {
    if (!state.tourActive) {
      return;
    }
    const step = tourSteps[state.tourIndex];
    const isGenerating = state.tourIndex === 2 && !state.generated;
    const isActionDone = state.tourActions.has(state.tourIndex);
    const isFinalSummary = state.tourActions.has("6-summary");
    let title = overrides.title || step.title;
    let text = overrides.text || step.text;
    let action = overrides.action || step.action;

    if (state.tourIndex === 2 && state.generated) {
      action = "결과 보기";
    } else if (state.tourIndex === 4 && isActionDone) {
      action = "그림 위치 조절하기";
    } else if (state.tourIndex === 5 && isActionDone) {
      action = "마지막 단계";
    } else if (state.tourIndex === 6 && isFinalSummary) {
      action = "체험 마치기";
      title = overrides.title || "제작 흐름을 모두 익혔어요";
      text = overrides.text || "원고 입력, 생성, 확인, 대사 수정, 위치 이동, 부분 재생성까지 차례로 완료했습니다.";
    } else if (state.tourIndex === 6 && isActionDone) {
      action = "완료 내용 확인";
      title = overrides.title || "두 번째 컷만 새로 완성됐어요";
      text = overrides.text || "다른 세 컷은 그대로 유지되고, 두 번째 컷의 구도와 대사만 바뀌었습니다.";
    }

    byId("guideCoachCounter").textContent = `STEP ${state.tourIndex + 1} / ${tourSteps.length}`;
    byId("guideSpotlightStep").textContent = state.tourIndex + 1;
    byId("guideCoachTitle").textContent = title;
    byId("guideCoachText").textContent = text;
    byId("guideTourDots").innerHTML = tourSteps.map((_, itemIndex) => `<i class="${itemIndex < state.tourIndex ? "is-done" : itemIndex === state.tourIndex ? "is-current" : ""}"></i>`).join("");

    const previous = byId("previousTourButton");
    const next = byId("nextTourButton");
    previous.disabled = state.tourIndex === 0 || state.tourBusy;
    next.textContent = action;
    next.disabled = Boolean(overrides.disabled) || state.tourBusy || isGenerating;
    byId("guideCoach").classList.toggle("is-complete", Boolean(overrides.complete) || isFinalSummary);

    if (overrides.progress) {
      setTourProgress(overrides.progress.percent, overrides.progress.label);
    } else if (!state.tourBusy) {
      hideTourProgress();
    }
  }

  function resolveTourTarget() {
    const selector = tourSteps[state.tourIndex]?.target;
    return selector ? document.querySelector(selector) : null;
  }

  function setTourTarget(target) {
    state.tourTarget?.classList.remove("is-tour-target");
    state.tourTarget = target;
    state.tourTarget.classList.add("is-tour-target");
  }

  function scheduleTourLayout() {
    if (!state.tourActive) {
      return;
    }
    window.clearTimeout(state.layoutTimer);
    state.layoutTimer = window.setTimeout(updateTourLayout, 30);
  }

  function updateTourLayout() {
    if (!state.tourActive) {
      return;
    }
    const target = resolveTourTarget();
    if (!target) {
      return;
    }
    if (target !== state.tourTarget) {
      setTourTarget(target);
    }

    const rect = target.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const pad = viewportWidth <= 640 ? 6 : 10;
    const left = clamp(rect.left - pad, 8, viewportWidth - 24);
    const top = clamp(rect.top - pad, 8, viewportHeight - 24);
    const right = clamp(rect.right + pad, 24, viewportWidth - 8);
    const bottom = clamp(rect.bottom + pad, 24, viewportHeight - 8);
    const spotlight = byId("guideSpotlight");
    spotlight.style.left = `${left}px`;
    spotlight.style.top = `${top}px`;
    spotlight.style.width = `${Math.max(16, right - left)}px`;
    spotlight.style.height = `${Math.max(16, bottom - top)}px`;

    const coach = byId("guideCoach");
    coach.style.left = "12px";
    coach.style.top = "12px";
    coach.style.width = `${Math.min(380, viewportWidth - 24)}px`;
    const coachRect = coach.getBoundingClientRect();
    const gap = 16;
    let coachLeft = right + gap;
    let coachTop = top;

    if (coachLeft + coachRect.width > viewportWidth - 12) {
      coachLeft = left - coachRect.width - gap;
    }
    if (coachLeft < 12) {
      coachLeft = clamp(left, 12, viewportWidth - coachRect.width - 12);
      coachTop = bottom + gap;
      if (coachTop + coachRect.height > viewportHeight - 12) {
        coachTop = top - coachRect.height - gap;
      }
    }
    if (viewportWidth <= 640) {
      coachLeft = 12;
      coachTop = bottom + 12;
      if (coachTop + coachRect.height > viewportHeight - 10) {
        coachTop = top - coachRect.height - 12;
      }
    }

    coach.style.left = `${clamp(coachLeft, 12, Math.max(12, viewportWidth - coachRect.width - 12))}px`;
    coach.style.top = `${clamp(coachTop, 10, Math.max(10, viewportHeight - coachRect.height - 10))}px`;
  }

  function closeTour(completed = false) {
    state.tourActive = false;
    state.tourBusy = false;
    state.tourTarget?.classList.remove("is-tour-target");
    state.tourTarget = null;
    byId("guideTour").hidden = true;
    document.body.classList.remove("is-guide-touring");
    byId("startTourButton").textContent = completed ? "가이드 다시 보기" : "가이드 시작";
    if (completed) {
      flash("가이드 체험 완료");
    }
  }

  function autoEditSpeech() {
    const panel = panels[1];
    const bubble = document.querySelector(".guide-panel[data-panel-id='p2'] .guide-bubble");
    const nextLine = "보상: 임시 스킬 개방. 제한 시간 10초.";
    if (!bubble) {
      return Promise.resolve();
    }
    bubble.classList.add("is-auto-writing");
    bubble.textContent = nextLine;
    panel.line = nextLine;
    return wait(620).then(() => {
      bubble.classList.remove("is-auto-writing");
      panel.line = nextLine;
      markDone("speech");
      flash("두 번째 컷 대사 수정 완료");
    });
  }

  function autoMoveActor() {
    const panel = panels[2];
    const actor = document.querySelector(".guide-panel[data-panel-id='p3'] .guide-actor");
    if (!actor) {
      return Promise.resolve();
    }
    const from = { ...panel.actor };
    const to = { x: 39, y: 66 };
    const duration = reducedMotion() ? guideTiming.reducedActorMove : guideTiming.actorMove;
    const started = performance.now();
    actor.classList.add("is-dragging", "is-auto-moving");

    return new Promise((resolve) => {
      function tick(now) {
        const ratio = Math.min(1, (now - started) / duration);
        const eased = 1 - Math.pow(1 - ratio, 3);
        const x = from.x + (to.x - from.x) * eased;
        const y = from.y + (to.y - from.y) * eased;
        actor.style.left = `${x}%`;
        actor.style.top = `${y}%`;
        panel.actor = { x, y };
        scheduleTourLayout();
        if (ratio < 1) {
          requestAnimationFrame(tick);
          return;
        }
        actor.classList.remove("is-dragging", "is-auto-moving");
        markDone("move");
        flash("3컷 인물 위치 이동 완료");
        resolve();
      }
      requestAnimationFrame(tick);
    });
  }

  function typeText(target, text, duration) {
    const token = ++state.typingToken;
    target.textContent = "";
    if ("value" in target) {
      target.value = "";
    }
    if (reducedMotion()) {
      if ("value" in target) {
        target.value = text;
      } else {
        target.textContent = text;
      }
      if (target.id === "guidePrompt") {
        updateGuidePromptLimit(false);
      }
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const started = performance.now();

      function tick(now) {
        if (token !== state.typingToken) {
          resolve();
          return;
        }
        const ratio = Math.min(1, (now - started) / duration);
        const index = Math.max(1, Math.min(text.length, Math.ceil(text.length * ratio)));
        const value = text.slice(0, index);
        if ("value" in target) {
          target.value = value;
        } else {
          target.textContent = value;
        }
        if (target.id === "guidePrompt") {
          updateGuidePromptLimit(false);
        }
        if (ratio < 1) {
          requestAnimationFrame(tick);
          return;
        }
        resolve();
      }

      requestAnimationFrame(tick);
    });
  }

  function markDone(step) {
    state.completed.add(step);
    updateSteps();
  }

  function updateGuidePromptLimit(syncButton) {
    const input = byId("guidePrompt");
    const counter = byId("guidePromptCount");
    if (!input || !counter) {
      return false;
    }
    const clipped = input.value.slice(0, guideLimits.promptMax);
    if (input.value !== clipped) {
      input.value = clipped;
    }
    const length = clipped.length;
    const valid = clipped.trim().length >= guideLimits.promptMin;
    counter.textContent = `${length} / ${guideLimits.promptMax}자`;
    counter.classList.toggle("is-invalid", length > 0 && !valid);
    counter.classList.toggle("is-recommended-over", length >= guideLimits.promptMax * 0.9);
    input.setAttribute("aria-invalid", String(length > 0 && !valid));
    if (syncButton && !state.generating) {
      byId("runGuideButton").disabled = !valid;
    }
    return valid;
  }

  function placeCaretAtEnd(element) {
    const selection = window.getSelection();
    if (!selection) {
      return;
    }
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function updateSteps() {
    document.querySelectorAll("#guideSteps li").forEach((item) => {
      const done = state.completed.has(item.dataset.step);
      item.classList.toggle("is-done", done);
      item.classList.toggle("is-current", !done && firstOpenStep() === item.dataset.step);
    });
    byId("guideDoneCount").textContent = `${state.completed.size} / 5`;
  }

  function firstOpenStep() {
    return ["run", "view", "speech", "move", "regen"].find((step) => !state.completed.has(step)) || "regen";
  }

  function setProgress(percent, label, log) {
    byId("progressPercent").textContent = `${percent}%`;
    byId("progressLabel").textContent = label;
    byId("progressFill").style.width = `${percent}%`;
    byId("progressLog").textContent = log;
    if (state.tourActive && state.tourBusy && (state.tourIndex === 2 || state.tourIndex === 6)) {
      setTourProgress(percent, label);
    }
  }

  function preloadGuideAssets() {
    const urls = new Set();
    panels.forEach((panel) => {
      panel.images.forEach((url) => urls.add(url));
      if (panel.actorImage) {
        urls.add(panel.actorImage);
      }
    });
    urls.forEach((url) => {
      const image = new Image();
      image.decoding = "async";
      image.src = url;
    });
  }

  function setTourProgress(percent, label) {
    const progress = byId("guideCoachProgress");
    const value = clamp(Math.round(percent), 0, 100);
    const wasHidden = progress.hidden;
    progress.hidden = false;
    progress.setAttribute("aria-valuenow", String(value));
    byId("guideCoachProgressLabel").textContent = label;
    byId("guideCoachProgressPercent").textContent = `${value}%`;
    byId("guideCoachProgressFill").style.width = `${value}%`;
    if (wasHidden) {
      updateTourLayout();
    }
  }

  function hideTourProgress() {
    byId("guideCoachProgress").hidden = true;
  }

  function soften(hex) {
    return {
      "#69c8ff": "#dff4ff",
      "#ffd85a": "#fff2bd",
      "#35d7a8": "#d9fff2",
      "#e95b88": "#ffe1eb",
      "#8f78ff": "#e8e4ff",
      "#ff9a6c": "#ffe4d6"
    }[hex] || "#fff2bd";
  }

  function flash(message) {
    const toast = byId("toast");
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(flash.timer);
    flash.timer = window.setTimeout(() => {
      toast.hidden = true;
    }, 1300);
  }

  function reducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function wait(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, reducedMotion() ? 40 : milliseconds));
  }

  function readableWait(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function byId(id) {
    return document.getElementById(id);
  }
})();
