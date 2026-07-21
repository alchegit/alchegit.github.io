(() => {
  const scenario = window.NeoKIMWebtoonScenario;
  const samplePrompt = scenario?.idea || "폐역 플랫폼 청소 알바를 하던 F급 헌터가 막차가 끊긴 뒤 혼자 남는다. 전광판이 꺼지는 순간 균열이 열리고, 그에게만 보이는 퀘스트 창이 뜬다.";
  const guideLimits = Object.freeze({ promptMin: 10, promptMax: 600, dialogueMax: 80 });
  const guideTiming = Object.freeze({
    generation: 4800,
    reducedGeneration: 4800,
    generationCompleteHold: 900,
    finalization: 4200,
    reducedFinalization: 4200,
    finalizationCompleteHold: 900,
    actorMove: 1100,
    reducedActorMove: 360,
    panelRegeneration: 2600,
    reducedPanelRegeneration: 1500,
    regenerationCompleteHold: 900
  });

  const sceneTitles = [
    "지워진 이름", "야간 청소 대타", "마지막 점검", "그림자 막차", "첫 상태창",
    "자정의 실패 조건", "벽 너머 무전", "검표원", "잔류 마력", "숨겨진 통로",
    "가짜 구조 요청", "서미라 구조", "한 사람의 출구", "세 번째 답", "형광 흔적",
    "가짜 노선", "임시 역무원", "아홉 개의 폐역", "예정 실종자", "0번 승강장"
  ];
  const sceneAccents = ["#243047", "#69c8ff", "#ffd85a", "#35d7a8", "#e95b88", "#ff9a6c"];
  const guideActStarts = Object.freeze({
    0: ["PROLOGUE", "지워진 이름"],
    4: ["ACT 1", "나에게만 보이는 임무"],
    8: ["ACT 2", "쓸모없던 능력의 쓰임"],
    12: ["ACT 3", "정해진 답을 거부하다"],
    16: ["EPILOGUE", "끝나지 않은 노선"]
  });
  const panels = (scenario?.scenes || []).map((scene, index) => ({
    id: `p${index + 1}`,
    title: sceneTitles[index] || `${index + 1}장면`,
    line: scene.line,
    caption: scene.reaction || scene.beat,
    sfx: scene.sfx,
    accent: sceneAccents[index % sceneAccents.length],
    images: Array.from(scene.variants || [scene.imageData]),
    actorImage: index === 9 ? "/webtoon/assets/guide/awakening-character-v1.webp" : "",
    actor: index === 9 ? { x: 56, y: 68 } : null,
    bubble: { x: index % 3 === 1 ? 36 : 6, y: 6, width: index % 3 === 1 ? 58 : 62 },
    variant: 0
  }));

  const progressStages = [
    { from: 0, to: 18, label: "로그라인 분석", log: "주인공의 약점, 장소, 첫 위기를 찾고 있습니다." },
    { from: 18, to: 38, label: "도입부 설계", log: "일상 균열, 상태창, 첫 미션, 다음 화 훅을 나누고 있습니다." },
    { from: 38, to: 60, label: "콘티 구성", log: "장면별 인물 위치, 시선과 카메라를 정하고 있습니다." },
    { from: 60, to: 80, label: "저해상도 시안", log: "완성도보다 구도와 이야기 전달을 먼저 확인할 시안을 만들고 있습니다." },
    { from: 80, to: 96, label: "시안 묶음 정리", log: "승인 전에 비교할 대표 장면과 나머지 장면을 정리하고 있습니다." }
  ];

  const finalizationStages = [
    { from: 0, to: 20, label: "승인 시안 잠금", log: "승인한 카메라, 인물 위치와 시선을 변경하지 않도록 고정합니다." },
    { from: 20, to: 44, label: "선화와 인체 정리", log: "구도는 유지하고 인물의 선과 표정을 완성도 있게 다듬습니다." },
    { from: 44, to: 68, label: "빛과 재질 완성", log: "폐역의 조명, 의상과 소품의 재질을 장면 분위기에 맞춥니다." },
    { from: 68, to: 88, label: "배경 연속성 확인", log: "컷 사이의 시간, 공간과 인물 외형이 이어지는지 확인합니다." },
    { from: 88, to: 100, label: "완성본 검수", log: "잘림, 잘못 그려진 인물과 글자 안전 영역을 마지막으로 확인합니다." }
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
      title: "콘티와 시안부터 만들어요",
      text: "원고를 장면으로 나누고 완성도가 아닌 구도를 확인할 가벼운 시안을 만듭니다.",
      action: "콘티와 시안 만들기"
    },
    {
      target: "[data-tour-target='progress']",
      title: "시안이 만들어지는 과정을 볼게요",
      text: "로그라인 분석, 콘티 구성, 저해상도 시안을 차례로 진행합니다. 가이드라서 실제보다 빠르게 보여드립니다.",
      action: "시안 생성 중..."
    },
    {
      target: ".guide-panel[data-panel-id='p1']",
      title: "완성 전 시안을 먼저 확인해요",
      text: "20개 장면의 이야기 전달, 카메라와 인물 배치를 먼저 봅니다. 이 단계에서는 세부 묘사보다 구도가 중요합니다.",
      action: "시안 승인하기"
    },
    {
      target: "#guideApprovalButton",
      title: "마음에 드는 구도를 승인해요",
      text: "승인한 시안은 완성화의 기준이 됩니다. 이후에는 카메라와 인물 배치를 바꾸지 않고 품질만 높입니다.",
      action: "시안 구도 승인"
    },
    {
      target: "[data-tour-target='progress']",
      title: "승인한 시안만 완성화해요",
      text: "선화, 인체, 빛과 배경을 다듬되 승인한 구도는 그대로 유지합니다.",
      action: "완성화 중..."
    },
    {
      target: "#guideApprovalButton",
      title: "완성본을 마지막으로 승인해요",
      text: "완성본에 잘림이나 이야기 불일치가 없는지 확인한 뒤 최종 승인합니다. 승인 전에는 게시할 수 없습니다.",
      action: "완성본 최종 승인"
    },
    {
      target: ".guide-panel[data-panel-id='p5'] .guide-bubble",
      title: "말풍선은 바로 고칠 수 있어요",
      text: "전체를 다시 만들 필요 없이 원하는 컷의 대사만 바꿉니다.",
      action: "대사 바꾸기"
    },
    {
      target: ".guide-panel[data-panel-id='p10'] .guide-actor",
      title: "인물과 구도도 조절할 수 있어요",
      text: "인물을 드래그해 컷 안의 시선과 구도를 다듬을 수 있습니다. 실제 작업대에서도 같은 단계로 조절합니다.",
      action: "인물·구도 옮기기"
    },
    {
      target: "#regenPanelButton",
      title: "마음에 들지 않는 컷만 다시 만들어요",
      text: "다른 컷은 유지하고 선택한 컷만 다시 만드는 마지막 단계입니다.",
      action: "선택한 컷 다시 만들기"
    }
  ];

  const state = {
    generated: false,
    generating: false,
    finalizing: false,
    renderStage: "empty",
    draftApproved: false,
    finalApproved: false,
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
      if (state.tourActive && state.tourIndex === 9) {
        handleTourPrimary();
        return;
      }
      regenerateQuestPanel();
    });
    byId("guideApprovalButton").addEventListener("click", () => {
      if (state.tourActive && [4, 6].includes(state.tourIndex)) {
        handleTourPrimary();
        return;
      }
      if (state.renderStage === "draft" && !state.draftApproved) {
        approveDraftAndFinalize();
      } else if (state.renderStage === "final" && !state.finalApproved) {
        approveFinal();
      }
    });
    byId("guideReaderLink").addEventListener("click", (event) => {
      if (!state.finalApproved) {
        event.preventDefault();
        flash("완성본을 최종 승인한 뒤 감상할 수 있어요");
      }
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
    updateVisualFlow();
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
    state.finalizing = false;
    state.renderStage = "empty";
    state.draftApproved = false;
    state.finalApproved = false;
    state.completed.clear();
    state.regenCount = 0;
    state.tourBusy = false;
    byId("guidePrompt").value = "";
    updateGuidePromptLimit(false);
    byId("runGuideButton").disabled = true;
    byId("runGuideButton").textContent = "콘티와 시안 만들기";
    byId("guideApprovalButton").disabled = true;
    byId("guideApprovalButton").textContent = "시안 구도 승인";
    byId("regenPanelButton").disabled = true;
    byId("guideReaderLink").classList.add("is-disabled");
    byId("guideReaderLink").setAttribute("aria-disabled", "true");
    byId("guideReaderLink").setAttribute("tabindex", "-1");
    byId("previewTitle").textContent = "시안 미리보기";
    setProgress(0, "대기 중", "콘티와 시안을 확인한 뒤 승인한 구도만 완성화합니다.");
    byId("guideCanvas").className = "guide-canvas is-empty";
    byId("guideCanvas").innerHTML = `
      <div class="guide-empty">
        <strong>먼저 가벼운 시안으로 확인해보세요.</strong>
        <span>마음에 드는 구도를 승인하면 같은 장면을 완성본으로 다듬습니다.</span>
      </div>
    `;
    updateSteps();
    updateVisualFlow();
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
    state.renderStage = "storyboard";
    markDone("run");
    updateVisualFlow();
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

        setProgress(100, "시안 정리", "20개 핵심 장면을 구도 확인용 시안으로 배치하고 있습니다.");
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
    state.renderStage = "draft";
    markDone("draft");
    renderCanvas();
    byId("runGuideButton").disabled = true;
    byId("guideApprovalButton").disabled = false;
    byId("previewTitle").textContent = "시안 구도 확인";
    setProgress(100, "시안 준비 완료", "이야기 전달, 카메라와 인물 배치를 확인한 뒤 구도를 승인하세요.");
    updateVisualFlow();
    flash("20장면 시안 준비 완료");

    if (state.tourActive && state.tourIndex === 2) {
      state.tourBusy = false;
      renderTourCoach({ action: "시안 보기", text: "20개 핵심 장면의 시안이 준비됐습니다. 완성도를 올리기 전에 이야기와 구도를 먼저 확인합니다." });
      scheduleTourLayout();
    }
  }

  async function approveDraftAndFinalize() {
    if (state.renderStage !== "draft" || state.draftApproved || state.finalizing) {
      return;
    }
    state.draftApproved = true;
    markDone("draft-approve");
    byId("guideApprovalButton").disabled = true;
    byId("guideApprovalButton").textContent = "완성화 중";
    updateVisualFlow();
    flash("시안 구도 승인 · 완성화를 시작합니다");
    await finalizeGuide();
  }

  function finalizeGuide() {
    if (state.finalizing || state.renderStage !== "draft") {
      return Promise.resolve();
    }
    state.finalizing = true;
    const canvas = byId("guideCanvas");
    canvas.classList.add("is-finalizing");
    setProgress(0, "승인 시안 불러오기", "승인한 시안의 카메라와 인물 배치를 완성화 기준으로 잠급니다.");

    return new Promise((resolve) => {
      const started = performance.now();
      const duration = reducedMotion() ? guideTiming.reducedFinalization : guideTiming.finalization;

      function tick(now) {
        const elapsed = Math.max(0, now - started);
        const overall = Math.min(1, elapsed / duration);
        const stagePosition = overall * finalizationStages.length;
        const stageIndex = Math.min(finalizationStages.length - 1, Math.floor(stagePosition));
        const stageProgress = overall >= 1 ? 1 : stagePosition - stageIndex;
        const stage = finalizationStages[stageIndex];
        const percent = Math.round(stage.from + (stage.to - stage.from) * stageProgress);
        setProgress(percent, `${stageIndex + 1} / ${finalizationStages.length} · ${stage.label}`, stage.log);

        if (overall < 1) {
          requestAnimationFrame(tick);
          return;
        }

        readableWait(guideTiming.finalizationCompleteHold).then(() => {
          state.finalizing = false;
          state.renderStage = "final";
          canvas.classList.remove("is-finalizing", "is-draft-stage");
          renderCanvas();
          byId("previewTitle").textContent = "완성본 최종 확인";
          byId("guideApprovalButton").disabled = false;
          byId("guideApprovalButton").textContent = "완성본 최종 승인";
          setProgress(100, "완성화 완료", "승인한 구도를 유지한 완성본입니다. 마지막 검수 후 최종 승인하세요.");
          updateVisualFlow();
          flash("완성본 준비 완료");
          if (state.tourActive && state.tourIndex === 5) {
            state.tourBusy = false;
            renderTourCoach({ action: "완성본 보기", text: "승인한 구도는 유지하고 선화, 빛과 배경만 완성했습니다. 이제 완성본을 확인합니다." });
            scheduleTourLayout();
          }
          resolve();
        });
      }

      requestAnimationFrame(tick);
    });
  }

  function approveFinal() {
    if (state.renderStage !== "final" || state.finalApproved) {
      return;
    }
    state.finalApproved = true;
    markDone("final-approve");
    byId("guideApprovalButton").disabled = true;
    byId("guideApprovalButton").textContent = "최종 승인 완료";
    byId("regenPanelButton").disabled = false;
    byId("guideReaderLink").classList.remove("is-disabled");
    byId("guideReaderLink").removeAttribute("aria-disabled");
    byId("guideReaderLink").removeAttribute("tabindex");
    byId("previewTitle").textContent = "승인된 완성 웹툰";
    renderCanvas();
    updateVisualFlow();
    setProgress(100, "최종 승인 완료", "이제 말풍선과 위치를 조정하거나 원하는 컷만 다시 만들 수 있습니다.");
    flash("완성본 최종 승인 완료");
  }

  function regenerateQuestPanel() {
    if (!state.generated || !state.finalApproved || panels[4].regenerating) {
      if (!state.finalApproved) {
        flash("완성본을 최종 승인한 뒤 원하는 컷을 수정할 수 있어요");
      }
      return Promise.resolve();
    }

    const button = byId("regenPanelButton");
    const panel = panels[4];
    button.disabled = true;
    panel.regenerating = true;
    renderCanvas();
    setProgress(18, "5장면 분석", "선택한 상태창 장면에서 유지할 대사와 구도를 먼저 확인합니다.");

    return new Promise((resolve) => {
      const started = performance.now();
      const duration = reducedMotion() ? guideTiming.reducedPanelRegeneration : guideTiming.panelRegeneration;

      function tick(now) {
        const ratio = Math.min(1, (now - started) / duration);
        const percent = Math.round(18 + ratio * 82);
        setProgress(percent, ratio < 0.72 ? "5장면 다시 만들기" : "새 구도 정리", ratio < 0.72 ? "선택한 장면만 빠르게 다시 만들고 있습니다." : "말풍선과 시선을 새 장면에 맞추고 있습니다.");
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
        setProgress(100, "컷 다시 만들기 완료", "다른 19개 장면은 유지되고 5장면만 새 구도와 대사로 바뀌었습니다.");
        button.disabled = false;
        flash("5장면만 새로 완성");
        resolve();
      }

      requestAnimationFrame(tick);
    });
  }

  function renderCanvas() {
    const canvas = byId("guideCanvas");
    canvas.className = `guide-canvas is-ready ${state.renderStage === "draft" ? "is-draft-stage" : "is-final-stage"}`;
    canvas.innerHTML = panels.map((panel, index) => {
      const act = guideActStarts[index];
      return `${act ? `<div class="guide-act-divider"><span>${act[0]}</span><strong>${act[1]}</strong></div>` : ""}${renderPanel(panel, index)}`;
    }).join("");
  }

  function renderPanel(panel, index) {
    const soft = soften(panel.accent);
    const image = panel.images[panel.variant % panel.images.length];
    const actor = panel.actorImage ? `
      <div class="guide-actor ${state.finalApproved ? "guide-draggable" : ""}" data-part="actor" data-panel-id="${panel.id}" style="left:${panel.actor.x}%;top:${panel.actor.y}%;" role="img" aria-label="${index + 1}컷에서 이동할 주인공">
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
        <div class="guide-bubble" contenteditable="${state.finalApproved ? "true" : "false"}" spellcheck="false" data-maxlength="${guideLimits.dialogueMax}" data-panel-id="${panel.id}" aria-label="${index + 1}컷 말풍선 · 최대 ${guideLimits.dialogueMax}자">${escapeHtml(panel.line)}</div>
        ${actor}
        <strong class="guide-sfx">${escapeHtml(panel.sfx)}</strong>
        <p class="guide-caption">${escapeHtml(panel.caption)}</p>
        ${panel.regenerating ? '<div class="guide-panel-overlay"><span></span><strong>선택한 컷만 다시 만드는 중</strong></div>' : ""}
      </article>
    `;
  }

  function handleBubbleEdit(event) {
    const bubble = event.target.closest(".guide-bubble");
    if (!bubble || !state.finalApproved) {
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
    if (!state.finalApproved) {
      return;
    }
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
          state.tourActions.add(4);
          state.tourBusy = true;
          showTourStep(5);
          state.tourBusy = true;
          renderTourCoach({ title: "승인한 시안을 완성화하는 중", text: "구도는 잠그고 선화, 인체, 빛과 배경만 차례로 다듬습니다.", action: "완성화 중...", disabled: true, progress: { percent: 0, label: "승인 시안 잠금" } });
          await approveDraftAndFinalize();
        }
        break;
      case 5:
        if (state.renderStage === "final") {
          showTourStep(6);
        }
        break;
      case 6:
        if (!state.tourActions.has(6)) {
          approveFinal();
          state.tourActions.add(6);
          renderTourCoach({ title: "완성본이 최종 승인됐어요", text: "이제 승인된 그림 위에서 말풍선과 위치를 다듬거나 필요한 컷만 다시 만들 수 있습니다.", action: "대사 수정하기" });
          updateTourLayout();
        } else {
          showTourStep(7);
        }
        break;
      case 7:
        if (!state.tourActions.has(7)) {
          state.tourBusy = true;
          renderTourCoach({ title: "말풍선을 수정하는 중", text: "준비된 대사가 현재 컷의 말풍선에 입력되고 있습니다.", action: "대사 입력 중...", disabled: true });
          await autoEditSpeech();
          state.tourBusy = false;
          state.tourActions.add(7);
          renderTourCoach({ title: "대사만 깔끔하게 바뀌었어요", text: "완성본 그림은 유지한 채 말풍선만 수정됐습니다.", action: "그림 위치 조절하기" });
          updateTourLayout();
        } else {
          showTourStep(8);
        }
        break;
      case 8:
        if (!state.tourActions.has(8)) {
          state.tourBusy = true;
          renderTourCoach({ title: "인물 위치를 조절하는 중", text: "선택한 인물을 컷의 중심선에 맞춰 자연스럽게 옮기고 있습니다.", action: "이동 중...", disabled: true });
          await autoMoveActor();
          state.tourBusy = false;
          state.tourActions.add(8);
          renderTourCoach({ title: "인물을 옮겨 구도가 달라졌어요", text: "직접 드래그할 때도 같은 방식으로 컷 안에서 위치를 정할 수 있습니다.", action: "마지막 단계" });
          updateTourLayout();
        } else {
          showTourStep(9);
        }
        break;
      case 9:
        if (!state.tourActions.has(9)) {
          state.tourBusy = true;
          renderTourCoach({
            title: "5장면만 다시 만드는 중",
            text: "다른 19개 장면은 잠근 채 선택한 상태창 장면의 구도와 대사만 교체합니다.",
            action: "다시 만드는 중...",
            disabled: true,
            progress: { percent: 18, label: "유지할 요소 확인" }
          });
          await regenerateQuestPanel();
          await readableWait(guideTiming.regenerationCompleteHold);
          state.tourBusy = false;
          state.tourActions.add(9);
          renderTourCoach();
          updateTourLayout();
        } else if (!state.tourActions.has("9-summary")) {
          state.tourActions.add("9-summary");
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
      || (state.tourIndex === 2 && !state.generated)
      || (state.tourIndex === 5 && state.renderStage !== "final");
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
    const isGenerating = (state.tourIndex === 2 && !state.generated) || (state.tourIndex === 5 && state.renderStage !== "final");
    const isActionDone = state.tourActions.has(state.tourIndex);
    const isFinalSummary = state.tourActions.has("9-summary");
    let title = overrides.title || step.title;
    let text = overrides.text || step.text;
    let action = overrides.action || step.action;

    if (state.tourIndex === 2 && state.generated) {
      action = "시안 보기";
    } else if (state.tourIndex === 5 && state.renderStage === "final") {
      action = "완성본 보기";
    } else if (state.tourIndex === 6 && isActionDone) {
      action = "대사 수정하기";
    } else if (state.tourIndex === 7 && isActionDone) {
      action = "그림 위치 조절하기";
    } else if (state.tourIndex === 8 && isActionDone) {
      action = "마지막 단계";
    } else if (state.tourIndex === 9 && isFinalSummary) {
      action = "체험 마치기";
      title = overrides.title || "제작 흐름을 모두 익혔어요";
      text = overrides.text || "원고 입력, 시안 승인, 완성화, 최종 승인, 대사 수정, 위치 이동과 부분 재생성까지 완료했습니다.";
    } else if (state.tourIndex === 9 && isActionDone) {
      action = "완료 내용 확인";
      title = overrides.title || "선택한 장면만 새로 완성됐어요";
      text = overrides.text || "다른 19개 장면은 그대로 유지되고, 5장면의 구도와 대사만 바뀌었습니다.";
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
    const panel = panels[4];
    const bubble = document.querySelector(".guide-panel[data-panel-id='p5'] .guide-bubble");
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
      flash("5장면 대사 수정 완료");
    });
  }

  function autoMoveActor() {
    const panel = panels[9];
    const actor = document.querySelector(".guide-panel[data-panel-id='p10'] .guide-actor");
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
        flash("10장면 인물 위치 이동 완료");
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
    const completedCount = ["run", "draft", "draft-approve", "final-approve", "speech", "move", "regen"]
      .filter((step) => state.completed.has(step)).length;
    byId("guideDoneCount").textContent = `${completedCount} / 7`;
  }

  function firstOpenStep() {
    return ["run", "draft", "draft-approve", "final-approve", "speech", "move", "regen"]
      .find((step) => !state.completed.has(step)) || "regen";
  }

  function updateVisualFlow() {
    const completeStages = new Set();
    if (state.completed.has("run")) completeStages.add("storyboard");
    if (state.draftApproved) completeStages.add("draft");
    if (state.renderStage === "final" || state.finalApproved) completeStages.add("final");
    if (state.finalApproved) completeStages.add("approval");

    let currentStage = "storyboard";
    if (state.renderStage === "draft" && !state.draftApproved) currentStage = "draft";
    if (state.draftApproved && state.renderStage !== "final") currentStage = "final";
    if (state.renderStage === "final" && !state.finalApproved) currentStage = "approval";
    if (state.finalApproved) currentStage = "";

    document.querySelectorAll("#guideVisualFlow [data-visual-stage]").forEach((item) => {
      const stage = item.dataset.visualStage;
      item.classList.toggle("is-complete", completeStages.has(stage));
      item.classList.toggle("is-current", stage === currentStage);
    });
  }

  function setProgress(percent, label, log) {
    byId("progressPercent").textContent = `${percent}%`;
    byId("progressLabel").textContent = label;
    byId("progressFill").style.width = `${percent}%`;
    byId("progressLog").textContent = log;
    if (state.tourActive && state.tourBusy && [2, 5, 9].includes(state.tourIndex)) {
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
