(() => {
  const scenario = window.NeoKIMWebtoonScenario;
  const samplePrompt = scenario?.idea || "폐역 플랫폼 청소 알바를 하던 F급 헌터가 운행이 끝난 뒤 들어온 수상한 막차를 발견한다. 승객이 탄 열차와 봉쇄문으로 이어지는 한 사람의 젖은 안전화 자국을 따라간 그는 검표원을 피해 갇힌 보수 기사를 구한다. 하지만 출구는 한 번에 한 사람만 통과할 수 있다.";
  const guideLimits = Object.freeze({ promptMin: 10, promptMax: 600, dialogueMax: 80, narrationMax: 180, sfxMax: 16 });
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

  const guideTemplateVersion = "awakening-subway-intro/v4";
  const sceneAccents = ["#243047", "#69c8ff", "#ffd85a", "#35d7a8", "#e95b88", "#ff9a6c"];
  const guideActStarts = Object.freeze({
    0: ["OPENING", "막차가 떠난 뒤"],
    3: ["TURN", "살아 있는 목소리"],
    5: ["HOOK", "역의 규칙을 거부하다"]
  });
  const guideTemplatePanels = Object.freeze([
    {
      id: "p1",
      title: "막차의 승객들",
      line: "운행은 끝났는데... 승객이 있어.",
      caption: "영업이 끝난 시각, 불이 켜진 막차가 승객을 태운 채 플랫폼으로 들어왔다.",
      sfx: "철컥",
      draftImages: ["/webtoon/assets/guide/awakening-draft-01-last-train-v4.webp"],
      finalImages: ["/webtoon/assets/guide/awakening-episode-01-last-train-v4.webp"],
      direction: { shotSize: "extreme-wide", angle: "eye-level", facing: "back", purpose: "실제 승객과 도윤을 한 화면에 두어 첫 이상 징후를 현실적으로 제시한다" },
      realityChecks: ["승객의 몸이 열차 창 안에 보인다", "그림자와 반사가 광원과 신체에 연결된다", "도윤과 카트의 바닥 접촉이 보인다"],
      bubble: { x: 6, y: 7, width: 60 },
      captionPosition: { x: 4, y: 87 },
      sfxPosition: { x: 70, y: 64 }
    },
    {
      id: "p2",
      title: "남겨진 발자국",
      line: "한 사람의 안전화 자국... 정비실로 이어져.",
      caption: "새는 배관 아래에서 시작된 젖은 발자국 여덟 개가 봉쇄된 정비실 앞에서 멈췄다.",
      sfx: "뚝",
      draftImages: ["/webtoon/assets/guide/awakening-draft-02-boot-trail-v4.webp"],
      finalImages: ["/webtoon/assets/guide/awakening-episode-02-boot-trail-v4.webp"],
      direction: { shotSize: "medium-wide", angle: "high-angle", facing: "three-quarter-right", purpose: "한 사람의 보행 간격과 목적지인 봉쇄문을 동시에 읽힌다" },
      realityChecks: ["안전화 자국은 정확히 8개다", "좌우가 번갈아 55~65cm 보폭으로 찍힌다", "젖은 자국은 이동 방향을 따라 점차 옅어진다"],
      bubble: { x: 38, y: 7, width: 55 },
      captionPosition: { x: 4, y: 87 },
      sfxPosition: { x: 63, y: 58 }
    },
    {
      id: "p3",
      title: "검표원",
      line: "숨을 죽여. 발소리가 가까워져.",
      caption: "열린 열차 문에서 검표원이 내려와 젖은 플랫폼을 천천히 밟았다.",
      sfx: "쿵",
      draftImages: ["/webtoon/assets/guide/awakening-draft-03-inspector-v4.webp"],
      finalImages: ["/webtoon/assets/guide/awakening-episode-03-inspector-v4.webp"],
      direction: { shotSize: "wide", angle: "low-angle", facing: "three-quarter-left", purpose: "낮은 시점과 열차 문턱으로 검표원의 체중과 위협을 함께 전달한다" },
      realityChecks: ["검표원의 두 발이 바닥이나 문턱에 닿는다", "그림자는 부츠에서 시작된다", "도윤은 카트 뒤에 실제로 몸을 숨긴다"],
      bubble: { x: 6, y: 7, width: 55 },
      captionPosition: { x: 4, y: 87 },
      sfxPosition: { x: 68, y: 54 }
    },
    {
      id: "p4",
      title: "벽 너머 생존자",
      line: "손 잡아요. 제가 당길게요.",
      caption: "무너진 정비실 문틀 너머에서 미라가 도윤의 손목을 힘껏 붙잡았다.",
      sfx: "꽉",
      draftImages: ["/webtoon/assets/guide/awakening-draft-04-rescue-v4.webp"],
      finalImages: ["/webtoon/assets/guide/awakening-episode-04-rescue-v4.webp"],
      direction: { shotSize: "medium", angle: "profile-side", facing: "three-quarter-left", purpose: "옆 시점으로 두 사람의 손, 발, 지지점을 한 줄에 배치해 구조 행동을 명확히 한다" },
      realityChecks: ["무너진 문틀은 철제 구조물에 지지된다", "두 사람의 손목과 손이 자연스럽게 맞물린다", "양쪽 인물의 발과 무릎이 바닥에 지지된다"],
      bubble: { x: 6, y: 7, width: 58 },
      captionPosition: { x: 4, y: 87 },
      sfxPosition: { x: 70, y: 56 }
    },
    {
      id: "p5",
      title: "한 사람의 출구",
      line: "이 문은 한 번에 한 명만 지나갈 수 있어.",
      caption: "미라가 안쪽 압력판을 밟자 출구는 열렸고, 도윤 쪽 문은 잠겼다.",
      sfx: "삐",
      draftImages: ["/webtoon/assets/guide/awakening-draft-05-airlock-choice-v4.webp"],
      finalImages: [
        "/webtoon/assets/guide/awakening-episode-05-airlock-choice-v4.webp",
        "/webtoon/assets/guide/awakening-episode-05-airlock-choice-birdeye-v4.webp"
      ],
      direction: { shotSize: "medium-wide", angle: "low-angle", facing: "three-quarter-left", purpose: "금속 문틀과 두 압력판으로 한 명만 통과하는 규칙을 설명한다" },
      realityChecks: ["에어록은 두 개의 연속 문과 레일을 가진다", "미라와 도윤은 서로 다른 압력판을 밟는다", "열린 문과 잠긴 문의 상태가 공간적으로 구분된다"],
      bubble: { x: 34, y: 8, width: 58 },
      captionPosition: { x: 4, y: 87 },
      sfxPosition: { x: 68, y: 58 }
    },
    {
      id: "p6",
      title: "청소부의 해답",
      line: "한 명만 나갈 필요가 없게 만들면 돼.",
      caption: "미라가 펌프를 지탱하고, 도윤은 연결된 고압 세척수로 검표원의 균열을 밀어냈다.",
      sfx: "촤아악",
      draftImages: ["/webtoon/assets/guide/awakening-draft-06-pressure-wash-v4.webp"],
      finalImages: ["/webtoon/assets/guide/awakening-episode-06-pressure-wash-v4.webp"],
      direction: { shotSize: "wide", angle: "ground-low-diagonal", facing: "three-quarter-left", purpose: "펌프, 호스, 세척봉, 충돌점을 한 대각선으로 연결해 행동의 원인과 쾌감을 함께 보여준다" },
      realityChecks: ["호스가 펌프에서 세척봉까지 끊김 없이 연결된다", "도윤과 미라의 자세가 반동과 하중을 설명한다", "검표원의 두 발이 충격 중에도 바닥에 닿는다"],
      bubble: { x: 6, y: 7, width: 58 },
      captionPosition: { x: 4, y: 87 },
      sfxPosition: { x: 62, y: 55 }
    }
  ]);
  const overlayDefaults = Object.freeze({
    bubble: { width: 58, height: 11 },
    caption: { width: 88, height: 8 },
    sfx: { width: 32, height: 12 }
  });
  const letteringDefaults = Object.freeze({
    bubble: { font: "sans", scale: 1, color: "#0b1018", weight: 900 },
    caption: { font: "sans", scale: 1, color: "#f8f3e8", weight: 800 },
    sfx: { font: "mono", scale: 1, color: "#f8f3e8", weight: 900 }
  });
  const panels = guideTemplatePanels.map((panel, index) => {
    const copy = JSON.parse(JSON.stringify(panel));
    return {
      ...copy,
      bubble: { ...overlayDefaults.bubble, ...copy.bubble },
      captionPosition: { ...overlayDefaults.caption, ...copy.captionPosition },
      sfxPosition: { ...overlayDefaults.sfx, ...copy.sfxPosition },
      lettering: {
        bubble: { ...letteringDefaults.bubble, ...copy.lettering?.bubble },
        caption: { ...letteringDefaults.caption, ...copy.lettering?.caption },
        sfx: { ...letteringDefaults.sfx, ...copy.lettering?.sfx }
      },
      accent: sceneAccents[index % sceneAccents.length],
      actorImage: panel.actorImage || "",
      actor: panel.actor ? { ...panel.actor } : null,
      variant: 0
    };
  });
  const panelDefaults = JSON.parse(JSON.stringify(panels));

  const progressStages = [
    { from: 0, to: 18, label: "로그라인 분석", log: "주인공의 약점, 장소, 첫 위기를 찾고 있습니다." },
    { from: 18, to: 38, label: "도입부 설계", log: "첫 의문, 단서, 위협, 구조, 선택과 반격을 나누고 있습니다." },
    { from: 38, to: 60, label: "콘티 구성", log: "장면별 인물 위치, 시선과 카메라를 정하고 있습니다." },
    { from: 60, to: 80, label: "저해상도 시안", log: "완성도보다 구도와 이야기 전달을 먼저 확인할 시안을 만들고 있습니다." },
    { from: 80, to: 96, label: "시안 묶음 정리", log: "계속하기 전에 비교할 대표 장면과 나머지 장면을 정리하고 있습니다." }
  ];

  const finalizationStages = [
    { from: 0, to: 20, label: "선택한 시안 불러오기", log: "선택한 카메라, 인물 위치와 시선을 완성화 기준으로 가져옵니다." },
    { from: 20, to: 44, label: "선화와 인체 정리", log: "구도는 유지하고 인물의 선과 표정을 완성도 있게 다듬습니다." },
    { from: 44, to: 68, label: "빛과 재질 완성", log: "폐역의 조명, 의상과 소품의 재질을 장면 분위기에 맞춥니다." },
    { from: 68, to: 88, label: "배경 연속성 확인", log: "컷 사이의 시간, 공간과 인물 외형이 이어지는지 확인합니다." },
    { from: 88, to: 100, label: "완성본 검수", log: "잘림, 잘못 그려진 인물과 글자 안전 영역을 마지막으로 확인합니다." }
  ];

  const tourSteps = [
    {
      target: "[data-tour-target='prompt']",
      title: "한 줄 이야기부터 시작해요",
      text: "준비된 도입부가 입력됩니다. 실제 작업에서는 자신의 이야기를 자유롭게 적습니다.",
      action: "다음"
    },
    {
      target: "[data-tour-target='run']",
      title: "가벼운 시안을 먼저 만들어요",
      text: "이야기를 장면으로 나누고 카메라와 인물 배치를 빠르게 확인합니다. 만드는 과정도 이 단계 안에서 차례로 보여드립니다.",
      action: "시안 만들기"
    },
    {
      target: "[data-tour-target='continue']",
      title: "마음에 들면 그대로 이어가요",
      text: "마음에 들면 이대로 완성하고, 아니면 이전으로 돌아가 장면 설정을 바꾸면 됩니다.",
      action: "이대로 완성하기"
    },
    {
      target: ".guide-panel[data-panel-id='p5']",
      title: "글자와 위치를 컷 위에서 다듬어요",
      text: "글자를 눌러 서식을 바꾸고, 글자 바깥 여백을 끌어 옮깁니다. 네 모서리 가까이에서는 커서가 바뀌며 상자 크기를 조절할 수 있습니다.",
      action: "글자 편집 체험"
    },
    {
      target: "[data-tour-target='redraw']",
      title: "카메라와 인물 방향을 바꿔 다시 그려요",
      text: "측면, 탑뷰, 로우앵글 같은 시점과 앞·뒤·좌·우 방향을 고릅니다. 실제 생성 전에는 도토리 비용을 확인합니다.",
      action: "다시 그리기 설정"
    },
    {
      target: "[data-tour-target='assets']",
      title: "만든 그림은 자동으로 보관돼요",
      text: "장면과 인물은 원래 컷과 함께 분류됩니다. 이전 장면을 현재 컷이나 회상 장면에 다시 사용할 수 있습니다.",
      action: "장면 재사용 체험"
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
    layoutTimer: 0,
    redrawTourPending: false,
    decisionLog: [],
    decisionTimers: {},
    sessionStartedAt: 0,
    reusedFlashback: false,
    selectedLettering: null
  };

  document.addEventListener("DOMContentLoaded", () => {
    const runButton = byId("runGuideButton");
    if (!runButton) {
      return;
    }

    byId("startTourButton").addEventListener("click", startTour);
    byId("guidePrompt").addEventListener("input", () => {
      if (!state.sessionStartedAt) {
        state.sessionStartedAt = performance.now();
      }
      beginDecision("story");
      updateGuidePromptLimit(true);
    });
    runButton.addEventListener("click", () => {
      if (state.tourActive && state.tourIndex === 1) {
        handleTourPrimary();
        return;
      }
      runGuide();
    });
    byId("regenPanelButton").addEventListener("click", toggleRedrawControls);
    byId("guideRedrawRequestButton").addEventListener("click", openGuideCostDialog);
    byId("confirmGuideRedrawButton").addEventListener("click", confirmGuideRedraw);
    byId("guideBackButton").addEventListener("click", returnToSceneSettings);
    byId("guideApprovalButton").addEventListener("click", () => {
      if (state.tourActive && state.tourIndex === 2) {
        handleTourPrimary();
        return;
      }
      if (state.renderStage === "draft" && !state.draftApproved) {
        approveDraftAndFinalize();
      }
    });
    byId("guideReaderLink").addEventListener("click", (event) => {
      if (!state.finalApproved) {
        event.preventDefault();
        flash("완성화를 마친 뒤 감상할 수 있어요");
      }
    });

    byId("nextTourButton").addEventListener("click", handleTourPrimary);
    byId("previousTourButton").addEventListener("click", previousTourStep);
    byId("closeTourButton").addEventListener("click", () => closeTour(false));

    const canvas = byId("guideCanvas");
    canvas.addEventListener("input", handleLetteringEdit);
    canvas.addEventListener("focusin", handleLetteringFocus);
    canvas.addEventListener("pointerdown", startDrag);
    canvas.addEventListener("pointermove", moveDrag);
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
    byId("guideLetteringFont").addEventListener("change", (event) => updateSelectedLetteringStyle({ font: event.target.value }));
    byId("guideLetteringSize").addEventListener("input", (event) => updateSelectedLetteringStyle({ scale: Number(event.target.value) / 100 }, false));
    byId("guideLetteringSize").addEventListener("change", () => flash("글자 크기 조절 완료"));
    byId("guideLetteringBold").addEventListener("click", () => {
      const current = getSelectedLetteringStyle();
      if (current) updateSelectedLetteringStyle({ weight: current.weight >= 800 ? 600 : 900 });
    });
    byId("guideLetteringToolbar").addEventListener("click", (event) => {
      const swatch = event.target.closest("[data-guide-letter-color]");
      if (swatch) updateSelectedLetteringStyle({ color: swatch.dataset.guideLetterColor });
    });
    byId("guideLetteringCustomColor").addEventListener("input", (event) => updateSelectedLetteringStyle({ color: event.target.value }, false));
    byId("guideLetteringCustomColor").addEventListener("change", () => flash("직접 고른 글자색 적용 완료"));
    byId("guideLetteringReset").addEventListener("click", resetSelectedLetteringStyle);
    byId("guideAssetList").addEventListener("click", handleGuideAssetAction);
    byId("copyGuideLogButton").addEventListener("click", copyGuideDecisionLog);

    window.addEventListener("resize", () => {
      syncMobileLetteringToolbarPlacement();
      scheduleTourLayout();
    });
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
    state.sessionStartedAt = performance.now();
    beginDecision("story");
    state.tourActive = true;
    state.tourIndex = 0;
    state.tourActions.clear();
    byId("guideTour").hidden = false;
    document.body.classList.add("is-guide-touring");
    showTourStep(0);
    typeText(byId("guidePrompt"), samplePrompt, 760).then(() => {
      recordDecision({
        id: "story",
        title: "1. 원고 진단",
        observation: "폐역, F급 헌터와 한 사람만 통과하는 출구는 선명하지만, 단서와 위협을 거쳐 구조 대상으로 이어지는 인과가 필요했습니다.",
        decision: "전체 1화가 아니라 갈등과 선택이 한 번에 보이는 6컷 도입부로 범위를 줄였습니다.",
        change: "승객이 탄 막차 → 젖은 안전화 자국 → 검표원 → 생존자 → 한 사람의 에어록 → 규칙 파괴 순서로 재배치했습니다."
      });
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
    state.redrawTourPending = false;
    state.decisionLog = [];
    state.decisionTimers = {};
    state.sessionStartedAt = 0;
    state.reusedFlashback = false;
    state.selectedLettering = null;
    panels.splice(0, panels.length, ...JSON.parse(JSON.stringify(panelDefaults)));
    byId("guidePrompt").value = "";
    updateGuidePromptLimit(false);
    byId("runGuideButton").disabled = true;
    byId("runGuideButton").textContent = "시안 만들기";
    byId("guideApprovalButton").disabled = true;
    byId("guideApprovalButton").textContent = "이대로 완성하기";
    byId("guideApprovalButton").hidden = false;
    byId("guideBackButton").hidden = true;
    byId("regenPanelButton").disabled = true;
    byId("guideRedrawControls").hidden = true;
    byId("guideAssetShelf").hidden = true;
    byId("guideAssetList").innerHTML = "";
    byId("guideLetteringToolbar").hidden = true;
    byId("guideCameraAngle").value = "bird-eye";
    byId("guideCharacterFacing").value = "front";
    if (byId("guideCostDialog").open) {
      byId("guideCostDialog").close();
    }
    byId("guideReaderLink").classList.add("is-disabled");
    byId("guideReaderLink").setAttribute("aria-disabled", "true");
    byId("guideReaderLink").setAttribute("tabindex", "-1");
    byId("previewTitle").textContent = "시안 미리보기";
    setProgress(0, "대기 중", "가벼운 시안으로 이야기와 구도를 먼저 확인합니다.");
    byId("guideCanvas").className = "guide-canvas is-empty";
    byId("guideCanvas").innerHTML = `
      <div class="guide-empty">
        <strong>먼저 가벼운 시안으로 확인해보세요.</strong>
        <span>마음에 들면 그대로 완성하고, 아니면 돌아가 장면을 바꿀 수 있습니다.</span>
      </div>
    `;
    updateSteps();
    updateVisualFlow();
    renderDecisionLog();
  }

  function runGuide() {
    if (state.generating) {
      return Promise.resolve();
    }
    if (byId("guidePrompt").value.trim().length < guideLimits.promptMin) {
      flash(`샘플 원고를 ${guideLimits.promptMin}자 이상 적어주세요`);
      return Promise.resolve();
    }

    if (!state.sessionStartedAt) {
      state.sessionStartedAt = performance.now();
    }
    if (!state.decisionLog.some((entry) => entry.id === "story")) {
      beginDecision("story");
      recordDecision({
        id: "story",
        title: "1. 원고 진단",
        observation: "장소와 사건은 보이지만 짧은 체험 안에서 주인공의 선택까지 도달해야 긴장감이 살아납니다.",
        decision: "원고의 핵심 사실은 유지하고 도입부를 6컷으로 압축했습니다.",
        change: "승객이 탄 막차, 안전화 자국, 검표원, 구조, 에어록의 실패 조건, 연결된 장비를 이용한 반격 순서로 다시 배치했습니다."
      });
    }
    beginDecision("draft");

    const button = byId("runGuideButton");
    button.disabled = true;
    state.generated = false;
    state.generating = true;
    state.renderStage = "draft";
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

        setProgress(100, "시안 정리", "6개 핵심 장면을 서로 다른 카메라 구도로 배치하고 있습니다.");
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
    markDone("create");
    renderCanvas();
    byId("runGuideButton").disabled = true;
    byId("guideApprovalButton").disabled = false;
    byId("guideBackButton").hidden = false;
    byId("previewTitle").textContent = "시안 확인";
    setProgress(100, "시안 준비 완료", "마음에 들면 그대로 완성하고, 아니면 장면 설정으로 돌아가세요.");
    recordDecision({
      id: "draft",
      title: "2. 6컷 시안 검토",
      observation: "모든 장면을 눈높이 중경으로 잡으면 단서, 위협, 관계와 액션의 크기가 모두 비슷해져 리듬이 사라졌습니다.",
      decision: "장면마다 독자가 가장 먼저 읽어야 할 정보 하나를 정하고, 그 정보에 맞춰 거리·높이·깊이·동선을 따로 설계했습니다.",
      change: "대원경 고립, 하이앵글 단서, 로우앵글 위협, 프레임 속 구조, 출구가 가르는 선택, 대각선 액션으로 6컷의 기능을 분리했습니다."
    });
    updateVisualFlow();
    flash("6컷 도입부 시안 준비 완료");

    if (state.tourActive && state.tourIndex === 1) {
      state.tourBusy = false;
      state.tourActions.add(1);
      renderTourCoach({ action: "시안 확인하기", text: "6컷을 검토해 반복되던 시점을 탑뷰와 로우앵글로 바꿨습니다. 결과가 마음에 들면 그대로 완성합니다." });
      scheduleTourLayout();
    }
  }

  async function approveDraftAndFinalize() {
    if (state.renderStage !== "draft" || state.draftApproved || state.finalizing) {
      return;
    }
    state.draftApproved = true;
    beginDecision("final");
    markDone("continue");
    byId("guideApprovalButton").disabled = true;
    byId("guideApprovalButton").textContent = "완성화 중";
    byId("guideBackButton").hidden = true;
    updateVisualFlow();
    flash("선택한 시안으로 완성화를 시작합니다");
    await finalizeGuide();
  }

  function finalizeGuide() {
    if (state.finalizing || state.renderStage !== "draft") {
      return Promise.resolve();
    }
    state.finalizing = true;
    const canvas = byId("guideCanvas");
    canvas.classList.add("is-finalizing");
    setProgress(0, "선택한 시안 불러오기", "현재 카메라와 인물 배치를 유지한 채 완성도를 높입니다.");

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
          approveFinal();
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
    byId("guideApprovalButton").hidden = !(state.tourActive && state.tourIndex === 2);
    byId("guideApprovalButton").disabled = true;
    byId("guideApprovalButton").textContent = "완성화 완료";
    byId("guideBackButton").hidden = true;
    byId("regenPanelButton").disabled = false;
    byId("guideRedrawControls").hidden = false;
    byId("guideAssetShelf").hidden = false;
    byId("guideReaderLink").classList.remove("is-disabled");
    byId("guideReaderLink").removeAttribute("aria-disabled");
    byId("guideReaderLink").removeAttribute("tabindex");
    byId("previewTitle").textContent = "직접 다듬는 웹툰";
    renderCanvas();
    renderGuideAssetShelf();
    updateVisualFlow();
    recordDecision({
      id: "final",
      title: "3. 완성화 결과 검수",
      observation: "콘티의 카메라와 동선은 채색 원고로 이어졌지만, 글자가 얼굴·출구·괴물과 물줄기를 가리지 않는 안전 영역이 필요했습니다.",
      decision: "그림 구도는 유지하고 레터링을 독립 객체로 분리해 완성 직후 바로 고칠 수 있게 했습니다.",
      change: "말풍선, 나레이션과 효과음을 이미지 밖의 편집 데이터로 유지했습니다."
    });
    setProgress(100, "편집 준비 완료", "말풍선·나레이션·효과음의 문구와 서식을 고치고, 여백 이동과 모서리 크기 조절을 사용할 수 있습니다.");
    flash("완성화 완료 · 바로 편집할 수 있어요");
    if (state.tourActive && state.tourIndex === 2) {
      state.tourBusy = false;
      state.tourActions.add(2);
      renderTourCoach({ action: "글자 편집하기", text: "완성화가 끝났습니다. 이제 바로 글자와 구도를 편집할 수 있습니다." });
      scheduleTourLayout();
    }
  }

  function regenerateQuestPanel() {
    if (!state.generated || !state.finalApproved || panels[4].regenerating) {
      if (!state.finalApproved) {
        flash("완성화를 마친 뒤 원하는 컷을 수정할 수 있어요");
      }
      return Promise.resolve();
    }

    const button = byId("regenPanelButton");
    const panel = panels[4];
    panel.direction = {
      angle: byId("guideCameraAngle").value,
      facing: byId("guideCharacterFacing").value
    };
    button.disabled = true;
    panel.regenerating = true;
    renderCanvas();
    setProgress(18, "5장면 분석", "선택한 출구 장면에서 유지할 인물, 대사와 공간 축을 먼저 확인합니다.");

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
        panel.variant = ({
          "bird-eye": 1,
          "high-angle": 1,
          "profile-side": 2,
          "low-angle": 2,
          "ground-low-diagonal": 0,
          "over-shoulder": 2
        })[panel.direction.angle] ?? ((panel.variant + 1) % panelImageSet(panel, "final").length);
        panel.accent = ["#ffd85a", "#8f78ff", "#ff9a6c"][panel.variant];
        panel.line = [
          "한 명만 통과 가능... 장난하나.",
          "한 명만 통과 가능? 그럼 출구부터 고쳐.",
          "내가 먼저 문을 열게. 뒤를 부탁해."
        ][panel.variant];
        panel.sfx = ["경고", "지잉", "개방"][panel.variant];
        panel.regenerating = false;
        markDone("redraw");
        renderCanvas();
        renderGuideAssetShelf();
        setProgress(100, "컷 다시 만들기 완료", "다른 5개 장면은 유지되고 5컷만 새 구도와 대사로 바뀌었습니다.");
        recordDecision({
          id: "redraw",
          title: "5. 선택 컷 재연출",
          observation: "5컷의 낮은 시점은 출구의 위압감은 살렸지만, 두 사람이 서로 다른 판정 위에 놓인 공간 관계는 충분히 보이지 않았습니다.",
          decision: `${directionLabel(panel.direction.angle)} 구도와 ${facingLabel(panel.direction.facing)} 방향으로 5컷만 다시 만들었습니다.`,
          change: "나머지 컷은 건드리지 않고 기존 5컷도 보관함에 남겨 비교할 수 있게 했습니다."
        });
        button.disabled = false;
        flash("5장면만 새로 완성");
        resolve();
      }

      requestAnimationFrame(tick);
    });
  }

  function toggleRedrawControls() {
    if (!state.finalApproved) {
      flash("완성화를 마친 뒤 카메라를 바꿀 수 있어요");
      return;
    }
    const controls = byId("guideRedrawControls");
    controls.hidden = !controls.hidden;
    byId("regenPanelButton").setAttribute("aria-expanded", String(!controls.hidden));
    if (!controls.hidden) {
      controls.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function openGuideCostDialog() {
    if (!state.finalApproved) {
      flash("완성화를 마친 뒤 다시 그릴 수 있어요");
      return;
    }
    byId("guideCostCamera").textContent = directionLabel(byId("guideCameraAngle").value);
    byId("guideCostFacing").textContent = facingLabel(byId("guideCharacterFacing").value);
    const dialog = byId("guideCostDialog");
    if (!dialog.open) {
      dialog.showModal();
    }
  }

  async function confirmGuideRedraw(event) {
    event?.preventDefault();
    byId("guideCostDialog").close();
    beginDecision("redraw");
    state.redrawTourPending = state.tourActive && state.tourIndex === 4;
    if (state.redrawTourPending) {
      state.tourBusy = true;
      renderTourCoach({
        title: "선택한 각도로 새 버전을 만드는 중",
        text: "기존 컷은 보관함에 그대로 두고 다섯 번째 컷만 다시 만듭니다.",
        action: "다시 그리는 중...",
        disabled: true,
        progress: { percent: 18, label: "카메라와 인물 방향 확인" }
      });
    }
    await regenerateQuestPanel();
    if (state.redrawTourPending) {
      await readableWait(guideTiming.regenerationCompleteHold);
      state.redrawTourPending = false;
      state.tourBusy = false;
      state.tourActions.add(4);
      renderTourCoach({
        title: "새 버전이 보관함과 컷에 함께 추가됐어요",
        text: "기존 그림을 지우지 않았습니다. 다음 단계에서 이전 장면을 다시 가져오는 방법을 확인합니다.",
        action: "장면 보관함 보기"
      });
      scheduleTourLayout();
    }
  }

  function returnToSceneSettings() {
    if (state.finalizing) {
      return;
    }
    state.generated = false;
    state.renderStage = "empty";
    state.draftApproved = false;
    state.finalApproved = false;
    ["create", "continue", "lettering", "redraw", "reuse"].forEach((step) => state.completed.delete(step));
    byId("runGuideButton").disabled = !updateGuidePromptLimit(false);
    byId("runGuideButton").textContent = "시안 다시 만들기";
    byId("guideApprovalButton").disabled = true;
    byId("guideBackButton").hidden = true;
    byId("regenPanelButton").disabled = true;
    byId("guideRedrawControls").hidden = true;
    byId("guideAssetShelf").hidden = true;
    byId("previewTitle").textContent = "장면 설정 바꾸기";
    byId("guideCanvas").className = "guide-canvas is-empty";
    byId("guideCanvas").innerHTML = '<div class="guide-empty"><strong>원고를 다듬고 시안을 다시 만들어보세요.</strong><span>이전 시안은 실제 작업에서 후보 버전으로 보관됩니다.</span></div>';
    setProgress(0, "장면 설정으로 돌아옴", "원고나 장면 방향을 바꾼 뒤 시안을 다시 만들 수 있습니다.");
    updateSteps();
    updateVisualFlow();
    flash("장면 설정으로 돌아왔어요");
  }

  function renderGuideAssetShelf() {
    const list = byId("guideAssetList");
    if (!list) {
      return;
    }
    list.innerHTML = panels.filter((panel) => !panel.isFlashback).slice(0, 6).map((panel, index) => {
      const finalImages = panelImageSet(panel, "final");
      const image = finalImages[panel.variant % finalImages.length];
      const category = "완성 장면";
      return `
        <article class="guide-asset-item">
          <img src="${escapeHtml(image)}" alt="${index + 1}컷 ${escapeHtml(panel.title)} 보관 이미지" loading="lazy">
          <div><span>${category}</span><strong>${index + 1}컷 · ${escapeHtml(panel.title)}</strong><small>${escapeHtml(directionLabel(panel.direction.angle))}</small></div>
          <button class="tool-button mini" type="button" data-guide-asset-panel="${escapeHtml(panel.id)}">회상 컷으로 삽입</button>
        </article>
      `;
    }).join("");
  }

  function handleGuideAssetAction(event) {
    const button = event.target.closest("[data-guide-asset-panel]");
    if (!button || !state.finalApproved) {
      return;
    }
    const source = panels.find((panel) => panel.id === button.dataset.guideAssetPanel);
    if (!source) {
      return;
    }
    beginDecision("reuse");
    const sourceImages = panelImageSet(source, "final");
    const sourceImage = sourceImages[source.variant % sourceImages.length];
    const existingFlashback = panels.find((panel) => panel.isFlashback);
    const flashback = {
      ...JSON.parse(JSON.stringify(source)),
      id: "p-flashback",
      title: "몇 분 전",
      line: "살아서 퇴근한다. 이번에는 둘 다.",
      caption: "평범했던 몇 분 전을 떠올리자, 지켜야 할 약속이 더 또렷해졌다.",
      sfx: "...",
      draftImages: [sourceImage],
      finalImages: [sourceImage],
      actorImage: "",
      actor: null,
      bubble: { ...overlayDefaults.bubble, x: 6, y: 7, width: 58 },
      captionPosition: { ...overlayDefaults.caption, x: 4, y: 87 },
      sfxPosition: { ...overlayDefaults.sfx, x: 66, y: 62 },
      accent: "#69c8ff",
      variant: 0,
      isFlashback: true,
      reusedFrom: source.id
    };
    if (existingFlashback) {
      panels.splice(panels.indexOf(existingFlashback), 1, flashback);
    } else {
      panels.splice(Math.max(0, panels.length - 1), 0, flashback);
    }
    state.reusedFlashback = true;
    markDone("reuse");
    recordDecision({
      id: "reuse",
      title: "6. 장면 재사용 판단",
      observation: "이전 그림으로 현재 5컷을 덮으면 사건의 인과가 끊기고 어렵게 만든 새 구도도 사라졌습니다.",
      decision: `${source.title} 장면은 교체용이 아니라 마지막 결심 직전의 짧은 회상으로 사용했습니다.`,
      change: "원본과 현재 컷을 모두 보존하면서 출처가 기록된 회상 컷 하나를 새로 삽입했습니다."
    });
    renderCanvas();
    renderGuideAssetShelf();
    flash(`${source.title} 장면을 회상 컷으로 삽입`);
    if (state.tourActive && state.tourIndex === 5) {
      state.tourActions.add(5);
      renderTourCoach({
        title: "이전 장면을 회상 컷으로 다시 썼어요",
        text: "현재 컷을 덮지 않고 출처가 남는 회상 컷을 삽입했습니다. 결과를 확인하고 이야기 흐름에 맞는 재사용 방식을 고른 것입니다.",
        action: "체험 마치기",
        complete: true
      });
      scheduleTourLayout();
    }
  }

  function panelImageSet(panel, renderStage = state.renderStage) {
    const stageImages = renderStage === "draft" ? panel.draftImages : panel.finalImages;
    if (Array.isArray(stageImages) && stageImages.length) {
      return stageImages;
    }
    if (Array.isArray(panel.images) && panel.images.length) {
      return panel.images;
    }
    return [""];
  }

  function shotSizeLabel(value) {
    return {
      "extreme-wide": "대원경",
      wide: "원경",
      "medium-wide": "중원경",
      medium: "중경",
      "medium-close": "중근경",
      close: "근경",
      detail: "세부"
    }[value] || "자동 거리";
  }

  function directionLabel(value) {
    return {
      "eye-level": "눈높이",
      "profile-side": "인물 옆에서",
      "bird-eye": "천장에서 아래로",
      "high-angle": "위에서 내려다보기",
      "low-angle": "아래에서 올려다보기",
      "ground-low-diagonal": "바닥에서 대각선 위로",
      "over-shoulder": "어깨 너머로"
    }[value] || "장면에 맞게 자동";
  }

  function facingLabel(value) {
    return {
      front: "앞모습",
      back: "뒷모습",
      "left-profile": "왼쪽 옆모습",
      "right-profile": "오른쪽 옆모습",
      "three-quarter-left": "왼쪽 반측면",
      "three-quarter-right": "오른쪽 반측면"
    }[value] || "장면에 맞게 자동";
  }

  function renderCanvas() {
    const canvas = byId("guideCanvas");
    canvas.className = `guide-canvas is-ready ${state.renderStage === "draft" ? "is-draft-stage" : "is-final-stage"}`;
    canvas.innerHTML = panels.map((panel, index) => {
      const act = guideActStarts[index];
      return `${act ? `<div class="guide-act-divider"><span>${act[0]}</span><strong>${act[1]}</strong></div>` : ""}${renderPanel(panel, index)}`;
    }).join("");
    const selected = state.selectedLettering;
    if (selected && state.finalApproved) {
      selectLettering(selected.panelId, selected.part);
    } else if (state.finalApproved) {
      showLetteringToolbarIdle();
    } else {
      byId("guideLetteringToolbar").hidden = true;
    }
  }

  function renderPanel(panel, index) {
    const soft = soften(panel.accent);
    const imageSet = panelImageSet(panel, state.renderStage);
    const image = imageSet[panel.variant % imageSet.length];
    const bubble = { ...overlayDefaults.bubble, ...panel.bubble };
    const caption = { ...overlayDefaults.caption, ...panel.captionPosition };
    const sfx = { ...overlayDefaults.sfx, ...panel.sfxPosition };
    const bubbleLettering = getLetteringStyle(panel, "bubble");
    const captionLettering = getLetteringStyle(panel, "caption");
    const sfxLettering = getLetteringStyle(panel, "sfx");
    const actor = panel.actorImage ? `
      <div class="guide-actor ${state.finalApproved ? "guide-draggable" : ""}" data-part="actor" data-panel-id="${panel.id}" style="left:${panel.actor.x}%;top:${panel.actor.y}%;" role="img" aria-label="${index + 1}컷에서 이동할 주인공">
        <img src="${panel.actorImage}" alt="" draggable="false">
      </div>
    ` : "";
    return `
      <article class="guide-panel" data-panel-id="${panel.id}" data-render-stage="${state.renderStage}" aria-label="${index + 1}컷, ${escapeHtml(panel.caption)}" style="--panel-accent:${panel.accent};--panel-soft:${soft};--panel-image:url('${image}');--bubble-left:${bubble.x}%;--bubble-top:${bubble.y}%;--bubble-width:${bubble.width}%;--bubble-height:${bubble.height}%;--caption-left:${caption.x}%;--caption-top:${caption.y}%;--caption-width:${caption.width}%;--caption-height:${caption.height}%;--sfx-left:${sfx.x}%;--sfx-top:${sfx.y}%;--sfx-width:${sfx.width}%;--sfx-height:${sfx.height}%;">
        <div class="guide-panel-meta">
          <span>${index + 1}컷</span>
          <strong>${escapeHtml(panel.title)}</strong>
          <small data-bubble-count>${panel.line.length} / ${guideLimits.dialogueMax}</small>
        </div>
        <div class="guide-bubble guide-font-${bubbleLettering.font} ${state.finalApproved ? "guide-draggable" : ""}" data-part="bubble" data-panel-id="${panel.id}" style="${letteringStyleProperties("bubble", bubbleLettering)}">
          <span class="guide-text-value" contenteditable="${state.finalApproved ? "true" : "false"}" spellcheck="false" data-guide-text="line" data-maxlength="${guideLimits.dialogueMax}" data-panel-id="${panel.id}" aria-label="${index + 1}컷 말풍선 · 최대 ${guideLimits.dialogueMax}자">${escapeHtml(panel.line)}</span>
          ${renderResizeZones()}
        </div>
        ${actor}
        <strong class="guide-sfx guide-font-${sfxLettering.font} ${state.finalApproved ? "guide-draggable" : ""}" data-part="sfx" data-panel-id="${panel.id}" style="${letteringStyleProperties("sfx", sfxLettering)}"><span class="guide-text-value" contenteditable="${state.finalApproved ? "true" : "false"}" spellcheck="false" data-guide-text="sfx" data-maxlength="${guideLimits.sfxMax}" data-panel-id="${panel.id}">${escapeHtml(panel.sfx)}</span>${renderResizeZones()}</strong>
        <p class="guide-caption guide-font-${captionLettering.font} ${state.finalApproved ? "guide-draggable" : ""}" data-part="caption" data-panel-id="${panel.id}" style="${letteringStyleProperties("caption", captionLettering)}"><span class="guide-text-value" contenteditable="${state.finalApproved ? "true" : "false"}" spellcheck="false" data-guide-text="caption" data-maxlength="${guideLimits.narrationMax}" data-panel-id="${panel.id}">${escapeHtml(panel.caption)}</span>${renderResizeZones()}</p>
        ${state.finalApproved ? `<span class="guide-direction-chip">${escapeHtml(shotSizeLabel(panel.direction.shotSize))} · ${escapeHtml(directionLabel(panel.direction.angle))} · ${escapeHtml(facingLabel(panel.direction.facing))}</span>` : ""}
        ${panel.regenerating ? '<div class="guide-panel-overlay"><span></span><strong>선택한 컷만 다시 만드는 중</strong></div>' : ""}
      </article>
    `;
  }

  function renderResizeZones() {
    if (!state.finalApproved) {
      return "";
    }
    return ["nw", "ne", "sw", "se"].map((corner) => `<span class="guide-resize-zone is-${corner}" data-guide-resize-corner="${corner}" contenteditable="false" aria-hidden="true"></span>`).join("");
  }

  function getLetteringStyle(panel, part) {
    const fallback = letteringDefaults[part] || letteringDefaults.bubble;
    return { ...fallback, ...panel.lettering?.[part] };
  }

  function letteringStyleProperties(part, style) {
    const baseSize = { bubble: 1.05, caption: 0.9, sfx: 3.1 }[part] || 1;
    const fontSize = Math.round(baseSize * style.scale * 100) / 100;
    return `--letter-color:${style.color};--letter-size:${fontSize}rem;--letter-weight:${style.weight};`;
  }

  function handleLetteringFocus(event) {
    const valueElement = event.target.closest("[data-guide-text]");
    const target = valueElement?.closest(".guide-draggable");
    if (target) selectLettering(target.dataset.panelId, target.dataset.part, target);
  }

  function selectLettering(panelId, part, target = null) {
    if (!state.finalApproved || !["bubble", "caption", "sfx"].includes(part)) return;
    document.querySelectorAll(".guide-draggable.is-lettering-selected").forEach((element) => element.classList.remove("is-lettering-selected"));
    const selectedTarget = target || document.querySelector(`.guide-panel[data-panel-id='${panelId}'] [data-part='${part}']`);
    const panel = panels.find((item) => item.id === panelId);
    if (!selectedTarget || !panel) return;
    state.selectedLettering = { panelId, part };
    selectedTarget.classList.add("is-lettering-selected");
    const toolbar = byId("guideLetteringToolbar");
    toolbar.hidden = false;
    toolbar.classList.remove("is-idle");
    toolbar.querySelectorAll("button, input, select").forEach((control) => { control.disabled = false; });
    syncLetteringToolbar(panel, part);
    scheduleTourLayout();
  }

  function showLetteringToolbarIdle() {
    const toolbar = byId("guideLetteringToolbar");
    toolbar.hidden = false;
    toolbar.classList.add("is-idle");
    byId("guideLetteringLabel").textContent = "글자 선택";
    byId("guideLetteringHint").textContent = "말풍선, 나레이션 또는 효과음을 누르면 서식이 열려요.";
    toolbar.querySelectorAll("button, input, select").forEach((control) => { control.disabled = true; });
  }

  function syncLetteringToolbar(panel, part) {
    const style = getLetteringStyle(panel, part);
    const meta = {
      bubble: ["말풍선", "대사는 고딕과 또렷한 대비가 읽기 편해요."],
      caption: ["나레이션", "설명문은 본문보다 조금 작게 두면 자연스러워요."],
      sfx: ["효과음", "효과음은 장면에 맞춰 크게 키우거나 색을 강조해보세요."]
    }[part];
    byId("guideLetteringLabel").textContent = meta[0];
    byId("guideLetteringHint").textContent = meta[1];
    byId("guideLetteringFont").value = style.font;
    byId("guideLetteringSize").value = Math.round(style.scale * 100);
    byId("guideLetteringSizeValue").textContent = `${Math.round(style.scale * 100)}%`;
    byId("guideLetteringCustomColor").value = style.color;
    byId("guideLetteringBold").setAttribute("aria-pressed", style.weight >= 800 ? "true" : "false");
    byId("guideLetteringBold").classList.toggle("is-active", style.weight >= 800);
    document.querySelectorAll("[data-guide-letter-color]").forEach((swatch) => {
      const selected = swatch.dataset.guideLetterColor.toLowerCase() === style.color.toLowerCase();
      swatch.classList.toggle("is-selected", selected);
      swatch.setAttribute("aria-pressed", selected ? "true" : "false");
    });
  }

  function getSelectedLetteringStyle() {
    const selected = state.selectedLettering;
    if (!selected) return null;
    const panel = panels.find((item) => item.id === selected.panelId);
    return panel ? getLetteringStyle(panel, selected.part) : null;
  }

  function updateSelectedLetteringStyle(patch, announce = true) {
    const selected = state.selectedLettering;
    if (!selected) return;
    const panel = panels.find((item) => item.id === selected.panelId);
    const target = document.querySelector(`.guide-panel[data-panel-id='${selected.panelId}'] [data-part='${selected.part}']`);
    if (!panel || !target) return;
    const next = { ...getLetteringStyle(panel, selected.part), ...patch };
    panel.lettering = panel.lettering || {};
    panel.lettering[selected.part] = next;
    target.classList.remove("guide-font-sans", "guide-font-serif", "guide-font-hand", "guide-font-mono");
    target.classList.add(`guide-font-${next.font}`);
    const baseSize = { bubble: 1.05, caption: 0.9, sfx: 3.1 }[selected.part];
    target.style.setProperty("--letter-color", next.color);
    target.style.setProperty("--letter-size", `${Math.round(baseSize * next.scale * 100) / 100}rem`);
    target.style.setProperty("--letter-weight", next.weight);
    syncLetteringToolbar(panel, selected.part);
    markDone("lettering");
    beginDecision("lettering");
    recordDecision({
      id: "lettering",
      title: "4. 글자와 위치 다듬기",
      observation: "장면 분위기와 배경 명도에 맞춰 글자가 충분히 잘 읽히는지 확인했습니다.",
      decision: "선택한 글자 요소에만 글꼴, 크기, 굵기와 색상을 적용했습니다.",
      change: "그림을 다시 만들지 않고 레터링 서식만 독립적으로 조정했습니다."
    });
    if (announce) flash("글자 서식 적용 완료");
  }

  function resetSelectedLetteringStyle() {
    const selected = state.selectedLettering;
    if (!selected) return;
    updateSelectedLetteringStyle({ ...letteringDefaults[selected.part] });
  }

  function handleLetteringEdit(event) {
    const valueElement = event.target.closest("[data-guide-text]");
    if (!valueElement || !state.finalApproved) {
      return;
    }
    const panel = panels.find((item) => item.id === valueElement.dataset.panelId);
    if (!panel) {
      return;
    }
    selectLettering(panel.id, valueElement.closest("[data-part]")?.dataset.part, valueElement.closest(".guide-draggable"));
    const field = valueElement.dataset.guideText;
    const contract = {
      line: { target: "line", limit: guideLimits.dialogueMax, label: "말풍선" },
      caption: { target: "caption", limit: guideLimits.narrationMax, label: "나레이션" },
      sfx: { target: "sfx", limit: guideLimits.sfxMax, label: "효과음" }
    }[field];
    if (!contract) {
      return;
    }
    const clipped = String(valueElement.textContent || "").slice(0, contract.limit);
    if (valueElement.textContent !== clipped) {
      valueElement.textContent = clipped;
      placeCaretAtEnd(valueElement);
      flash(`${contract.label}은 최대 ${contract.limit}자입니다`);
    }
    panel[contract.target] = clipped.trim() || { line: "새 대사를 입력하세요.", caption: "나레이션을 입력하세요.", sfx: "효과음" }[contract.target];
    const counter = valueElement.closest(".guide-panel")?.querySelector("[data-bubble-count]");
    if (counter && contract.target === "line") {
      counter.textContent = `${panel.line.length} / ${guideLimits.dialogueMax}`;
      counter.classList.toggle("is-recommended-over", panel.line.length > 45);
    }
    markDone("lettering");
    beginDecision("lettering");
    recordDecision({
      id: "lettering",
      title: "4. 글자와 위치 다듬기",
      observation: "완성된 그림 위의 글자가 시선 흐름과 겹치는지 직접 확인했습니다.",
      decision: `${contract.label}을 이미지와 분리된 편집 객체로 고쳤습니다.`,
      change: "그림을 다시 만들지 않고 글자와 서식을 수정하고, 여백 이동과 네 모서리 크기 조절을 사용할 수 있습니다."
    });
  }

  function startDrag(event) {
    if (!state.finalApproved) {
      return;
    }
    const resizeZone = event.target.closest("[data-guide-resize-corner]");
    const overlayTarget = event.target.closest(".guide-bubble.guide-draggable, .guide-caption.guide-draggable, .guide-sfx.guide-draggable");
    const actorTarget = event.target.closest(".guide-actor.guide-draggable");
    if (!resizeZone && overlayTarget && event.target.closest("[data-guide-text]")) {
      selectLettering(overlayTarget.dataset.panelId, overlayTarget.dataset.part, overlayTarget);
      return;
    }
    const target = resizeZone?.closest(".guide-draggable") || actorTarget || overlayTarget;
    if (!target) {
      return;
    }
    const panelElement = target.closest(".guide-panel");
    const panel = panels.find((item) => item.id === target.dataset.panelId);
    if (!panel) {
      return;
    }
    const part = target.dataset.part;
    if (part !== "actor") selectLettering(panel.id, part, target);
    const panelRect = panelElement.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const position = getOverlayPosition(panel, part);
    const size = getOverlaySize(panel, part, targetRect, panelRect);
    const pointerX = ((event.clientX - panelRect.left) / panelRect.width) * 100;
    const pointerY = ((event.clientY - panelRect.top) / panelRect.height) * 100;
    const captureTarget = resizeZone || target;
    captureTarget.setPointerCapture(event.pointerId);
    state.activeDrag = {
      pointerId: event.pointerId,
      mode: resizeZone ? "resize" : "move",
      resizeCorner: resizeZone?.dataset.guideResizeCorner || "",
      panel,
      part,
      panelElement,
      target,
      captureTarget,
      offsetX: pointerX - position.x,
      offsetY: pointerY - position.y,
      startPointerX: pointerX,
      startPointerY: pointerY,
      startWidth: size.width,
      startHeight: size.height,
      startX: position.x,
      startY: position.y,
      moved: false
    };
    target.classList.add("is-dragging");
    target.classList.toggle("is-resizing", Boolean(resizeZone));
    event.preventDefault();
  }

  function moveDrag(event) {
    const drag = state.activeDrag;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    const rect = drag.panelElement.getBoundingClientRect();
    const pointerX = ((event.clientX - rect.left) / rect.width) * 100;
    const pointerY = ((event.clientY - rect.top) / rect.height) * 100;
    if (drag.mode === "resize") {
      resizeOverlay(drag, pointerX, pointerY);
      markDone("lettering");
      scheduleTourLayout();
      return;
    }
    const size = getOverlaySize(drag.panel, drag.part, drag.target.getBoundingClientRect(), rect);
    const halfWidth = drag.part === "actor" ? size.width / 2 : 0;
    const halfHeight = drag.part === "actor" ? size.height / 2 : 0;
    const x = roundLayoutValue(clamp(pointerX - drag.offsetX, 1 + halfWidth, 99 - size.width + halfWidth));
    const y = roundLayoutValue(clamp(pointerY - drag.offsetY, 1 + halfHeight, 99 - size.height + halfHeight));
    if (drag.part === "actor") {
      drag.panel.actor = { x, y };
    } else if (drag.part === "bubble") {
      drag.panel.bubble = { ...drag.panel.bubble, x, y };
    } else if (drag.part === "caption") {
      drag.panel.captionPosition = { ...drag.panel.captionPosition, x, y };
    } else if (drag.part === "sfx") {
      drag.panel.sfxPosition = { ...drag.panel.sfxPosition, x, y };
    }
    drag.target.style.left = `${x}%`;
    drag.target.style.top = `${y}%`;
    drag.moved = true;
    markDone("lettering");
    scheduleTourLayout();
  }

  function endDrag(event) {
    const drag = state.activeDrag;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    drag.target.classList.remove("is-dragging", "is-resizing");
    if (drag.captureTarget.hasPointerCapture?.(event.pointerId)) {
      drag.captureTarget.releasePointerCapture(event.pointerId);
    }
    state.activeDrag = null;
    if (!drag.moved) {
      return;
    }
    beginDecision("lettering");
    recordDecision({
      id: "lettering",
      title: "4. 글자와 위치 다듬기",
      observation: "완성된 그림 위에서 글자 요소가 인물과 중요한 배경을 가리지 않는지 확인했습니다.",
      decision: drag.mode === "resize" ? "선택한 글자 요소의 너비와 높이를 컷 안에서 조정했습니다." : "잡은 지점을 유지한 채 선택한 요소를 안전 영역으로 옮겼습니다.",
      change: drag.mode === "resize" ? "글자 상자의 모서리를 끌어 크기를 바꿨습니다." : "글자 바깥 여백을 끌어 위치를 바꿨습니다."
    });
    flash(drag.part === "actor" ? "인물 위치 이동 완료" : drag.mode === "resize" ? "글자 상자 크기 조절 완료" : "글자 위치 이동 완료");
  }

  function getOverlayPosition(panel, part) {
    if (part === "actor") return panel.actor || { x: 50, y: 50 };
    if (part === "bubble") return panel.bubble;
    if (part === "caption") return panel.captionPosition;
    return panel.sfxPosition;
  }

  function getOverlaySize(panel, part, targetRect, panelRect) {
    if (part === "actor") {
      return {
        width: (targetRect.width / panelRect.width) * 100,
        height: (targetRect.height / panelRect.height) * 100
      };
    }
    const position = getOverlayPosition(panel, part);
    const defaults = part === "bubble" ? overlayDefaults.bubble : part === "caption" ? overlayDefaults.caption : overlayDefaults.sfx;
    return {
      width: Number(position.width) || defaults.width,
      height: Number(position.height) || defaults.height
    };
  }

  function resizeOverlay(drag, pointerX, pointerY) {
    const limits = {
      bubble: { minWidth: 24, minHeight: 7 },
      caption: { minWidth: 28, minHeight: 6 },
      sfx: { minWidth: 14, minHeight: 8 }
    }[drag.part];
    if (!limits) return;
    const deltaX = pointerX - drag.startPointerX;
    const deltaY = pointerY - drag.startPointerY;
    const corner = drag.resizeCorner;
    let x = drag.startX;
    let y = drag.startY;
    let width = drag.startWidth;
    let height = drag.startHeight;
    if (corner.includes("e")) {
      width = clamp(drag.startWidth + deltaX, limits.minWidth, 98 - drag.startX);
    }
    if (corner.includes("w")) {
      x = clamp(drag.startX + deltaX, 1, drag.startX + drag.startWidth - limits.minWidth);
      width = drag.startWidth + drag.startX - x;
    }
    if (corner.includes("s")) {
      height = clamp(drag.startHeight + deltaY, limits.minHeight, 98 - drag.startY);
    }
    if (corner.includes("n")) {
      y = clamp(drag.startY + deltaY, 1, drag.startY + drag.startHeight - limits.minHeight);
      height = drag.startHeight + drag.startY - y;
    }
    const next = { ...getOverlayPosition(drag.panel, drag.part), x: roundLayoutValue(x), y: roundLayoutValue(y), width: roundLayoutValue(width), height: roundLayoutValue(height) };
    if (drag.part === "bubble") drag.panel.bubble = next;
    if (drag.part === "caption") drag.panel.captionPosition = next;
    if (drag.part === "sfx") drag.panel.sfxPosition = next;
    drag.target.style.left = `${next.x}%`;
    drag.target.style.top = `${next.y}%`;
    drag.target.style.width = `${width}%`;
    drag.target.style.height = `${height}%`;
    drag.moved = true;
  }

  function roundLayoutValue(value) {
    return Math.round(value * 10) / 10;
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
        if (!state.generated) {
          state.tourBusy = true;
          renderTourCoach({ title: "이야기를 시안으로 나누는 중", text: "로그라인, 장면 목적, 카메라와 저해상도 시안을 한 흐름 안에서 차례로 준비합니다.", action: "시안 만드는 중...", disabled: true, progress: { percent: 0, label: "원고 읽기" } });
          runGuide();
        } else {
          showTourStep(2);
        }
        break;
      case 2:
        if (!state.finalApproved) {
          state.tourBusy = true;
          renderTourCoach({ title: "이 시안으로 완성하는 중", text: "선택한 카메라와 인물 배치를 유지하고 선화, 빛과 배경을 다듬습니다.", action: "완성화 중...", disabled: true, progress: { percent: 0, label: "선택한 시안 불러오기" } });
          await approveDraftAndFinalize();
        } else {
          byId("guideApprovalButton").hidden = true;
          showTourStep(3);
        }
        break;
      case 3:
        if (!state.tourActions.has(3)) {
          state.tourBusy = true;
          renderTourCoach({ title: "세 종류의 글자를 함께 다듬는 중", text: "문구와 위치뿐 아니라 글꼴, 크기와 색상도 장면에 맞게 바꿉니다.", action: "글자 편집 중...", disabled: true });
          await autoEditLettering();
          state.tourBusy = false;
          state.tourActions.add(3);
          renderTourCoach({ title: "글자와 서식이 각각 바뀌었어요", text: "그림을 다시 만들지 않고 세 요소의 문구, 위치, 크기와 서식을 독립적으로 편집했습니다.", action: "다시 그리기 보기" });
          updateTourLayout();
        } else {
          showTourStep(4);
        }
        break;
      case 4:
        if (!state.tourActions.has("4-controls")) {
          state.tourActions.add("4-controls");
          byId("guideRedrawControls").hidden = false;
          renderTourCoach({ title: "원하는 카메라와 인물 방향을 고르세요", text: "시안을 본 뒤 5컷을 천장 탑뷰와 앞모습으로 바꾸기로 했습니다. 다음을 누르면 실제 작업의 도토리 비용 확인창을 체험합니다.", action: "비용 확인하고 만들기" });
          updateTourLayout();
        } else if (!state.tourActions.has(4)) {
          openGuideCostDialog();
        } else {
          showTourStep(5);
        }
        break;
      case 5:
        if (!state.tourActions.has(5)) {
          byId("guideAssetList").querySelector("[data-guide-asset-panel]")?.click();
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
    document.body.classList.toggle("is-guide-lettering-step", state.tourIndex === 3);
    syncMobileLetteringToolbarPlacement();
    if (state.tourIndex === 5) {
      beginDecision("reuse");
    }
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
    if (state.tourIndex === 3 && window.innerWidth > 640) {
      const toolbarHeight = byId("guideLetteringToolbar").getBoundingClientRect().height;
      window.scrollBy({ top: -(toolbarHeight + 18), behavior: "instant" });
    }
    window.clearTimeout(state.layoutTimer);
    state.layoutTimer = window.setTimeout(updateTourLayout, 30);
  }

  function renderTourCoach(overrides = {}) {
    if (!state.tourActive) {
      return;
    }
    const step = tourSteps[state.tourIndex];
    const isGenerating = (state.tourIndex === 1 && state.tourBusy && !state.generated)
      || (state.tourIndex === 2 && state.tourBusy && !state.finalApproved)
      || (state.tourIndex === 4 && state.tourBusy);
    const isActionDone = state.tourActions.has(state.tourIndex);
    let title = overrides.title || step.title;
    let text = overrides.text || step.text;
    let action = overrides.action || step.action;

    if (state.tourIndex === 1 && state.generated) {
      action = "시안 확인하기";
    } else if (state.tourIndex === 2 && state.finalApproved) {
      action = "글자 편집하기";
    } else if (state.tourIndex === 3 && isActionDone) {
      action = "다시 그리기 보기";
    } else if (state.tourIndex === 4 && state.tourActions.has(4)) {
      action = "장면 보관함 보기";
    } else if (state.tourIndex === 4 && state.tourActions.has("4-controls")) {
      action = "비용 확인하고 만들기";
    } else if (state.tourIndex === 5 && isActionDone) {
      action = "체험 마치기";
      title = overrides.title || "간단한 제작 흐름을 모두 익혔어요";
      text = overrides.text || "시안, 완성화, 글자 편집, 선택 컷 다시 그리기와 장면 재사용을 한 흐름으로 마쳤습니다.";
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
    byId("guideCoach").classList.toggle("is-complete", Boolean(overrides.complete) || (state.tourIndex === 5 && isActionDone));

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
    document.body.classList.remove("is-guide-touring", "is-guide-lettering-step");
    syncMobileLetteringToolbarPlacement();
    byId("startTourButton").textContent = completed ? "가이드 다시 보기" : "가이드 시작";
    if (completed) {
      flash("가이드 체험 완료");
    }
  }

  function syncMobileLetteringToolbarPlacement() {
    const toolbar = byId("guideLetteringToolbar");
    const anchor = byId("guideLetteringToolbarAnchor");
    if (!toolbar || !anchor) return;
    const shouldFloat = state.tourActive && state.tourIndex === 3 && window.innerWidth <= 640;
    if (shouldFloat && toolbar.parentElement !== document.body) {
      document.body.append(toolbar);
    } else if (!shouldFloat && toolbar.parentElement === document.body) {
      anchor.after(toolbar);
    }
    toolbar.classList.toggle("is-mobile-tour-floating", shouldFloat);
  }

  async function autoEditLettering() {
    beginDecision("lettering");
    const panel = panels[4];
    const panelElement = document.querySelector(".guide-panel[data-panel-id='p5']");
    if (!panelElement) {
      return;
    }
    const changes = [
      ["line", "보상: 임시 스킬 개방. 제한 시간 10초."],
      ["caption", "꺼진 전광판 아래, 도윤에게만 새로운 규칙이 보였다."],
      ["sfx", "지이잉"]
    ];
    for (const [field, value] of changes) {
      const target = panelElement.querySelector(`[data-guide-text='${field}']`);
      if (!target) continue;
      target.classList.add("is-auto-writing");
      target.textContent = value;
      if (field === "line") panel.line = value;
      if (field === "caption") panel.caption = value;
      if (field === "sfx") panel.sfx = value;
      await wait(520);
      target.classList.remove("is-auto-writing");
    }
    panel.bubble = { ...panel.bubble, x: 30, y: 9, width: 62, height: 12 };
    panel.captionPosition = { ...panel.captionPosition, x: 5, y: 84, width: 86, height: 9 };
    panel.sfxPosition = { ...panel.sfxPosition, x: 66, y: 58, width: 28, height: 13 };
    panelElement.style.setProperty("--bubble-left", `${panel.bubble.x}%`);
    panelElement.style.setProperty("--bubble-top", `${panel.bubble.y}%`);
    panelElement.style.setProperty("--bubble-width", `${panel.bubble.width}%`);
    panelElement.style.setProperty("--bubble-height", `${panel.bubble.height}%`);
    panelElement.style.setProperty("--caption-left", `${panel.captionPosition.x}%`);
    panelElement.style.setProperty("--caption-top", `${panel.captionPosition.y}%`);
    panelElement.style.setProperty("--caption-width", `${panel.captionPosition.width}%`);
    panelElement.style.setProperty("--caption-height", `${panel.captionPosition.height}%`);
    panelElement.style.setProperty("--sfx-left", `${panel.sfxPosition.x}%`);
    panelElement.style.setProperty("--sfx-top", `${panel.sfxPosition.y}%`);
    panelElement.style.setProperty("--sfx-width", `${panel.sfxPosition.width}%`);
    panelElement.style.setProperty("--sfx-height", `${panel.sfxPosition.height}%`);
    selectLettering(panel.id, "caption", panelElement.querySelector("[data-part='caption']"));
    updateSelectedLetteringStyle({ font: "serif", scale: 0.95 }, false);
    selectLettering(panel.id, "sfx", panelElement.querySelector("[data-part='sfx']"));
    updateSelectedLetteringStyle({ font: "hand", scale: 1.15, color: "#4ee0b5" }, false);
    selectLettering(panel.id, "bubble", panelElement.querySelector("[data-part='bubble']"));
    updateSelectedLetteringStyle({ font: "sans", scale: 1.05, color: "#0b1018", weight: 900 }, false);
    markDone("lettering");
    recordDecision({
      id: "lettering",
      title: "4. 글자와 위치 다듬기",
      observation: "5컷의 원래 말풍선과 효과음이 인물의 얼굴과 푸른 출구가 만드는 중앙 시선을 방해했습니다.",
      decision: "대사는 짧게 고치고 세 글자 요소를 안전 영역으로 이동한 뒤 장면별 글꼴, 크기와 색상을 맞췄습니다.",
      change: "말풍선은 또렷한 고딕, 나레이션은 차분한 명조, 효과음은 민트색 손글씨로 조정하고 각 상자의 너비와 높이도 맞췄습니다."
    });
    flash("말풍선·나레이션·효과음 편집 완료");
    scheduleTourLayout();
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

  function beginDecision(id) {
    if (!state.decisionTimers[id]) {
      state.decisionTimers[id] = performance.now();
    }
  }

  function recordDecision({ id, title, observation, decision, change }) {
    if (state.decisionLog.some((entry) => entry.id === id)) {
      return;
    }
    const now = performance.now();
    const startedAt = state.decisionTimers[id] || now;
    const sessionStartedAt = state.sessionStartedAt || startedAt;
    state.decisionLog.push({
      id,
      title,
      observation,
      decision,
      change,
      durationMs: Math.max(0, Math.round(now - startedAt)),
      elapsedMs: Math.max(0, Math.round(now - sessionStartedAt))
    });
    renderDecisionLog();
  }

  function renderDecisionLog() {
    const list = byId("guideDecisionList");
    const count = byId("guideDecisionCount");
    const copyButton = byId("copyGuideLogButton");
    if (!list || !count || !copyButton) {
      return;
    }
    count.textContent = `${state.decisionLog.length} / 6`;
    copyButton.disabled = state.decisionLog.length === 0;
    if (!state.decisionLog.length) {
      list.innerHTML = '<li class="is-waiting"><span>대기</span><strong>가이드를 시작하면 판단 기록이 쌓입니다.</strong></li>';
      return;
    }
    list.innerHTML = state.decisionLog.map((entry) => `
      <li>
        <div><span>완료</span><time>${formatDuration(entry.durationMs)}</time></div>
        <strong>${escapeHtml(entry.title)}</strong>
        <dl>
          <div><dt>관찰</dt><dd>${escapeHtml(entry.observation)}</dd></div>
          <div><dt>판단</dt><dd>${escapeHtml(entry.decision)}</dd></div>
          <div><dt>수정</dt><dd>${escapeHtml(entry.change)}</dd></div>
        </dl>
        <small>누적 ${formatDuration(entry.elapsedMs)}</small>
      </li>
    `).join("");
  }

  async function copyGuideDecisionLog() {
    const text = [
      `가이드 템플릿: ${guideTemplateVersion}`,
      ...state.decisionLog.flatMap((entry) => [
        "",
        `${entry.title} · ${formatDuration(entry.durationMs)} · 누적 ${formatDuration(entry.elapsedMs)}`,
        `관찰: ${entry.observation}`,
        `판단: ${entry.decision}`,
        `수정: ${entry.change}`
      ]),
      "",
      `총 소요: ${formatDuration(state.decisionLog.at(-1)?.elapsedMs || 0)}`
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      flash("판단 로그를 복사했습니다");
    } catch {
      flash("브라우저에서 클립보드 권한을 허용해주세요");
    }
  }

  function formatDuration(milliseconds) {
    const seconds = Math.max(0, Number(milliseconds) || 0) / 1000;
    return seconds < 10 ? `${seconds.toFixed(1)}초` : `${Math.round(seconds)}초`;
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
    const completedCount = ["create", "continue", "lettering", "redraw", "reuse"]
      .filter((step) => state.completed.has(step)).length;
    byId("guideDoneCount").textContent = `${completedCount} / 5`;
  }

  function firstOpenStep() {
    return ["create", "continue", "lettering", "redraw", "reuse"]
      .find((step) => !state.completed.has(step)) || "reuse";
  }

  function updateVisualFlow() {
    const completeStages = new Set();
    if (state.generated) completeStages.add("draft");
    if (state.finalApproved) completeStages.add("final");
    if (state.completed.has("reuse")) completeStages.add("edit");

    let currentStage = "draft";
    if (state.generated && !state.finalApproved) currentStage = "final";
    if (state.finalApproved && !state.completed.has("reuse")) currentStage = "edit";
    if (state.completed.has("reuse")) currentStage = "";

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
    if (state.tourActive && state.tourBusy && [1, 2, 4].includes(state.tourIndex)) {
      setTourProgress(percent, label);
    }
  }

  function preloadGuideAssets() {
    const urls = new Set();
    panels.forEach((panel) => {
      panelImageSet(panel, "draft").forEach((url) => urls.add(url));
      panelImageSet(panel, "final").forEach((url) => urls.add(url));
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

  window.NeoKIMGuideTest = Object.freeze({
    snapshot: () => ({
      templateVersion: guideTemplateVersion,
      renderStage: state.renderStage,
      generated: state.generated,
      finalReady: state.finalApproved,
      completed: Array.from(state.completed),
      panelCount: panels.length,
      panelIds: panels.map((panel) => panel.id),
      reusedFlashback: state.reusedFlashback,
      redrawCount: state.regenCount,
      decisions: state.decisionLog.map((entry) => ({ ...entry })),
      panelImages: panels.map((panel) => ({
        id: panel.id,
        draft: [...panelImageSet(panel, "draft")],
        final: [...panelImageSet(panel, "final")],
        current: panelImageSet(panel, state.renderStage)[panel.variant % panelImageSet(panel, state.renderStage).length],
        realityChecks: [...(panel.realityChecks || [])]
      }))
    })
  });
})();
