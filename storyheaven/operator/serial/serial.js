(() => {
  const selectors = {};
  const scheduleById = new Map();
  const queueByScheduleId = new Map();
  const failedByScheduleId = new Map();
  const selectedPrimaryGenres = new Set(["fantasy"]);
  const selectedSubgenresByGenre = new Map([["fantasy", new Set(["modern-fantasy"])] ]);
  const primaryGenreLimit = 3;
  const subgenreLimit = 10;
  const seoulTimeZone = "Asia/Seoul";
  const creativeFields = Object.freeze({
    pace: "creativePace",
    suspense: "creativeSuspense",
    curiosity: "creativeCuriosity",
    surprise: "creativeSurprise",
    emotion: "creativeEmotion",
    romance: "creativeRomance",
    action: "creativeAction",
    description: "creativeDescription",
    humor: "creativeHumor",
    novelty: "creativeNovelty"
  });
  const creativePresets = Object.freeze({
    balanced: Object.freeze({ pace: 3, suspense: 3, curiosity: 4, surprise: 3, emotion: 3, romance: 2, action: 3, description: 3, humor: 2, novelty: 2 }),
    fast: Object.freeze({ pace: 5, suspense: 4, curiosity: 4, surprise: 3, emotion: 3, romance: 1, action: 4, description: 2, humor: 2, novelty: 2 }),
    emotional: Object.freeze({ pace: 2, suspense: 2, curiosity: 3, surprise: 2, emotion: 5, romance: 4, action: 1, description: 4, humor: 2, novelty: 2 })
  });
  const previousDefaultConceptPolicy = "중학생 독자도 첫 장면부터 인물과 사건을 따라갈 수 있는 쉬운 한국어로 쓴다. 첫 2개 문단 안에 시점 인물, 장소, 사건 전의 평소 상태와 당장 이루려는 목표를 밝히고, 3번째 문단까지 처음 달라진 현상과 실패할 때의 손실을 구체적으로 보여준다. 첫 문단의 낯선 고유 용어는 1개 이하, 첫 장면 전체는 3개 이하로 제한하며 처음 나온 문단에서 쉬운 뜻과 눈에 보이는 작동 결과를 함께 설명한다. 첫 회차는 장편의 주인공과 고유 규칙을 행동으로 이해시키고 본편 1화를 기대하게 만드는 프롤로그로 쓰며, 단편처럼 모든 갈등을 끝내지 않는다. 설정한 전체 권수와 권당 화수에 맞춰 장기 갈등과 성장 단계를 배분하고, 선택한 장르의 익숙한 보상을 매 화 제공한다. 주인공의 선택이 결과를 만들고 그 결과가 다음 갈등으로 이어지게 하며, 같은 도입 방식과 반전과 끝맺음을 연속해서 반복하지 않는다.";
  const noveltyDefaultConceptPolicy = `${previousDefaultConceptPolicy} 참신성은 설정값을 따르며, 기본 2에서는 익숙한 장르 문법과 인간적인 갈등을 중심에 두고 한 가지 분명한 차별점만 더한다. 서로 무관한 직업·사물·마법 규칙을 억지로 결합해 낯설게 만드는 방식은 피한다.`;
  const premiseCoherenceDefaultConceptPolicy = `${noveltyDefaultConceptPolicy} 현실에서 하던 작업과 같은 일을 이세계에서 곧바로 맡기는 도입을 반복하지 않는다. 이전 삶의 경험은 선택에 간접적으로만 영향을 주고, 새 세계의 직업·능력·도구와 일대일로 대응시키지 않는다. 낯선 세계나 집단에 들어온 주인공은 경계·오해·검증·보호자·거래처럼 받아들여지는 과정을 거친다. 이름·출신·능력을 알게 되는 정보 출처와 언어가 통하는 이유를 설정집과 장면에서 일관되게 지킨다. 특별 능력은 익숙한 장르 기반 위에 핵심 효과 하나, 발동 조건 하나, 대가나 한계 하나로 설명한다. 서로 무관한 행동이나 사물을 여러 단계로 이어 붙인 발동 장치는 사용하지 않는다.`;
  const defaultConceptPolicy = `${premiseCoherenceDefaultConceptPolicy} 작품의 고유 용어와 능력 규칙을 빼고도 주인공이 무엇을 원하고 왜 실패가 아픈지 한 문장으로 설명할 수 있어야 한다. 선량함만으로 성격을 대신하지 말고 결핍, 약점, 피하고 싶은 일, 지키고 싶은 관계 중 적어도 두 가지를 행동으로 보여준다. 최근 작품과 주인공 유형, 도입 방식, 사건 해결 방식, 주요 무대, 대립 구조, 장기 비밀이 비슷한지 비교한다. 이 가운데 세 가지 이상이 겹치면 소품과 제목만 바꾸지 말고 기획의 뼈대부터 다시 만든다. 프롤로그는 설정 소개 외에 익숙한 장르의 즐거움, 주인공 개인의 작은 성취나 손실, 다른 인물과의 관계 변화라는 세 보상 중 적어도 두 가지를 실제 장면으로 제공한다. 본편 1화와 2화까지 각각 구체적인 목표, 장르 보상, 관계 변화, 개인적 결과를 미리 계획한다. 거대한 왕국의 음모나 오래된 비밀만으로 다음 화를 유도하지 말고 주인공이 당장 해야 할 개인적인 선택을 남긴다.`;
  const legacyConceptPolicies = new Set([
    "중학생부터 성인까지 자연스럽게 읽히는 한국어로 쓴다. 선택한 장르의 익숙한 즐거움과 한 문장으로 설명할 수 있는 새 규칙을 결합한다. 주인공이 매 화 선택하고 그 선택의 결과가 다음 화 갈등으로 이어지게 한다. 같은 도입법과 같은 종류의 끝맺음을 연속해서 반복하지 않는다.",
    previousDefaultConceptPolicy,
    noveltyDefaultConceptPolicy,
    premiseCoherenceDefaultConceptPolicy
  ]);
  const draftStorageKey = "storyheaven.operator.serial-draft.v9";
  const legacyDraftStorageKeys = ["storyheaven.operator.serial-draft.v8", "storyheaven.operator.serial-draft.v7", "storyheaven.operator.serial-draft.v6", "storyheaven.operator.serial-draft.v5", "storyheaven.operator.serial-draft.v4", "storyheaven.operator.serial-draft.v3", "storyheaven.operator.serial-draft.v2"];
  const hiddenHistoryStorageKey = "storyheaven.operator.serial-hidden-history.v1";
  let draftReady = false;
  let draftSaveTimer = 0;
  let restoredDraftAt = "";
  let queueRefreshTimer = 0;
  let clockTimer = 0;
  let serverClockOffsetMs = 0;
  let showHiddenHistory = false;
  const locallyHiddenHistory = new Map();
  let latestSerialSnapshot = { enabled: false, emergencyPaused: false, pollSeconds: 60, schedules: [], queue: {} };

  document.addEventListener("DOMContentLoaded", async () => {
    cache();
    restoreDraft();
    restoreHiddenHistory();
    renderPrimaryGenres();
    renderSubgenres();
    bind();
    startSeoulClock();
    syncCadenceBounds();
    updateTargetButton();
    draftReady = true;
    updateDraftStatus(restoredDraftAt ? `마지막 설정 ${formatDraftTime(restoredDraftAt)} 복원` : "설정 자동 저장");
    await StoryHeavenCommon.init(onAuth);
  });

  function cache() {
    selectors.gate = document.querySelector("[data-access-gate]");
    selectors.dashboard = document.querySelector("[data-serial-dashboard]");
    selectors.engineState = document.querySelector("[data-engine-state]");
    selectors.systemPanel = document.querySelector("[data-serial-control-panel]");
    selectors.systemTitle = document.querySelector("[data-system-state-title]");
    selectors.systemClock = document.querySelector("[data-seoul-clock]");
    selectors.systemDetail = document.querySelector("[data-system-state-detail]");
    selectors.systemCause = document.querySelector("[data-system-state-cause]");
    selectors.systemResume = document.querySelector("[data-resume-system]");
    selectors.systemPause = document.querySelector("[data-pause-system]");
    selectors.systemStart = document.querySelector("[data-start-system]");
    selectors.scheduleForm = document.querySelector("[data-schedule-form]");
    selectors.scheduleList = document.querySelector("[data-schedule-list]");
    selectors.queueList = document.querySelector("[data-queue-list]");
    selectors.attentionList = document.querySelector("[data-attention-list]");
    selectors.completedList = document.querySelector("[data-completed-list]");
    selectors.completedCaption = document.querySelector("[data-completed-caption]");
    selectors.stalledList = document.querySelector("[data-stalled-list]");
    selectors.stalledCaption = document.querySelector("[data-stalled-caption]");
    selectors.waitingCaption = document.querySelector("[data-waiting-caption]");
    selectors.historySummary = document.querySelector("[data-history-summary]");
    selectors.statusRunning = document.querySelector("[data-status-running]");
    selectors.statusWaiting = document.querySelector("[data-status-waiting]");
    selectors.statusComplete = document.querySelector("[data-status-complete]");
    selectors.statusAttention = document.querySelector("[data-status-attention]");
    selectors.queueLive = document.querySelector("[data-queue-live]");
    selectors.queueLast = document.querySelector("[data-queue-last]");
    selectors.queueNote = document.querySelector("[data-queue-note]");
    selectors.timingSummary = document.querySelector("[data-timing-summary]");
    selectors.runHistory = document.querySelector("[data-run-history]");
    selectors.historyHiddenToggle = document.querySelector("[data-history-hidden-toggle]");
    selectors.primaryGenres = document.querySelector("[data-primary-genres]");
    selectors.subgenres = document.querySelector("[data-subgenres]");
    selectors.subgenreCount = document.querySelector("[data-subgenre-count]");
    selectors.subgenreHelp = document.querySelector("[data-subgenre-help]");
    selectors.creativeControls = document.querySelector("[data-creative-controls]");
    selectors.creativeSummary = document.querySelector("[data-creative-summary]");
    selectors.creativeWarning = document.querySelector("[data-creative-warning]");
    selectors.draftStatus = document.querySelector("[data-draft-status]");
    selectors.runSearch = document.querySelector("[data-run-search]");
    selectors.runState = document.querySelector("[data-run-state]");
  }

  function bind() {
    selectors.scheduleForm.addEventListener("submit", saveSchedule);
    selectors.scheduleForm.addEventListener("input", queueDraftSave);
    selectors.scheduleForm.addEventListener("change", queueDraftSave);
    selectors.runSearch.addEventListener("submit", loadRunFromForm);
    selectors.systemResume.addEventListener("click", () => guardedSystemButton(selectors.systemResume, resumeSystemFromPanel));
    selectors.systemPause.addEventListener("click", () => guardedSystemButton(selectors.systemPause, () => controlSerialSystem("pause")));
    selectors.systemStart.addEventListener("click", () => guardedSystemButton(selectors.systemStart, () => controlSerialSystem("start")));
    selectors.historyHiddenToggle.addEventListener("click", toggleHiddenHistory);
    document.querySelector("[data-process-due]").addEventListener("click", processDue);
    document.querySelector("[data-reset-draft]").addEventListener("click", resetDraft);
    selectors.scheduleForm.elements.cadenceUnit.addEventListener("change", syncCadenceBounds);
    selectors.scheduleForm.elements.targetEpisodeCount.addEventListener("input", updateTargetButton);
    selectors.scheduleForm.elements.totalVolumes.addEventListener("input", queueDraftSave);
    selectors.scheduleForm.elements.episodesPerVolume.addEventListener("input", queueDraftSave);
    selectors.scheduleForm.elements.continuationBatchCount.addEventListener("change", queueDraftSave);
    for (const input of selectors.scheduleForm.querySelectorAll("input[name='creativePreset']")) {
      input.addEventListener("change", () => {
        if (input.checked && input.value !== "custom") applyCreativePreset(input.value);
      });
    }
    for (const name of Object.values(creativeFields)) {
      selectors.scheduleForm.elements[name].addEventListener("input", () => {
        setCreativePreset("custom");
        renderCreativeControls();
      });
    }
  }

  async function onAuth(auth) {
    if (!auth.session) return showAccess();
    try {
      await refreshSchedules();
      selectors.gate.hidden = true;
      selectors.dashboard.hidden = false;
      clearInterval(queueRefreshTimer);
      queueRefreshTimer = window.setInterval(() => {
        if (!document.hidden) refreshSchedules().catch(markQueueRefreshFailure);
      }, 10_000);
    } catch (error) {
      showAccess();
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    }
  }

  function showAccess() {
    selectors.gate.hidden = false;
    selectors.dashboard.hidden = true;
    selectors.engineState.textContent = "관리자 확인 필요";
    clearInterval(queueRefreshTimer);
  }

  function renderPrimaryGenres() {
    const catalog = window.StoryHeavenGenreCatalog || {};
    const choices = [
      ["random", { label: "랜덤", description: "기본 장르와 세부장르를 서버가 한 번에 정합니다.", subgenres: {} }],
      ...Object.entries(catalog)
    ];
    selectors.primaryGenres.replaceChildren(...choices.map(([id, item]) => {
      const label = document.createElement("label");
      label.className = "genre-choice";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = "primaryGenres";
      input.value = id;
      input.checked = selectedPrimaryGenres.has(id);
      input.disabled = id !== "random"
        && !input.checked
        && (selectedPrimaryGenres.has("random") || selectedPrimaryGenres.size >= primaryGenreLimit);
      input.addEventListener("change", () => {
        if (id === "random") {
          selectedPrimaryGenres.clear();
          selectedSubgenresByGenre.clear();
          if (input.checked) {
            selectedPrimaryGenres.add("random");
            selectedSubgenresByGenre.set("random", new Set(["random"]));
          } else {
            selectDefaultGenre();
          }
        } else if (input.checked) {
          selectedPrimaryGenres.delete("random");
          selectedSubgenresByGenre.delete("random");
          selectedPrimaryGenres.add(id);
          ensureSubgenreSelection(id);
        } else if (selectedPrimaryGenres.size > 1) {
          selectedPrimaryGenres.delete(id);
          selectedSubgenresByGenre.delete(id);
        } else {
          input.checked = true;
          StoryHeavenCommon.toast("기본 장르는 한 개 이상 필요합니다.");
        }
        renderPrimaryGenres();
        renderSubgenres();
      });
      const copy = document.createElement("span");
      const title = document.createElement("strong");
      title.textContent = item.label;
      const description = document.createElement("small");
      description.textContent = item.description;
      copy.append(title, description);
      label.append(input, copy);
      return label;
    }));
  }

  function renderSubgenres() {
    if (selectedPrimaryGenres.has("random")) {
      selectors.subgenres.replaceChildren(createSubgenreChoice("random", "random", "기본·세부장르 모두 랜덤", true));
      selectors.subgenreCount.textContent = "랜덤";
      selectors.subgenreHelp.textContent = "연재 시작 시 기본 장르 하나와 세부장르 하나를 확정하고 작품이 끝날 때까지 유지합니다.";
      selectors.subgenreHelp.classList.remove("invalid");
      renderHumorControl();
      return;
    }

    const groups = [...selectedPrimaryGenres].map((genreId) => {
      ensureSubgenreSelection(genreId);
      const definition = window.StoryHeavenGenreCatalog?.[genreId];
      const section = document.createElement("section");
      section.className = "subgenre-group";
      const heading = document.createElement("h3");
      heading.textContent = definition?.label || genreId;
      const choices = document.createElement("div");
      choices.className = "subgenre-group-choices";
      const entries = [["random", "이 장르에서 랜덤"], ...Object.entries(definition?.subgenres || {})];
      choices.replaceChildren(...entries.map(([id, labelText]) => createSubgenreChoice(genreId, id, labelText)));
      section.append(heading, choices);
      return section;
    });
    selectors.subgenres.replaceChildren(...groups);
    const count = selectedSubgenreCount();
    selectors.subgenreCount.textContent = `${count} / ${subgenreLimit}`;
    selectors.subgenreHelp.textContent = "선택한 기본 장르마다 세부장르를 한 개 이상 고르세요. 전체 합계는 최대 열 개입니다.";
    selectors.subgenreHelp.classList.toggle("invalid", !hasValidSubgenreSelection());
    renderHumorControl();
  }

  function createSubgenreChoice(genreId, id, labelText, locked = false) {
    const selection = selectedSubgenresByGenre.get(genreId) || new Set();
    const randomSelected = selection.has("random");
    const label = document.createElement("label");
    label.className = `subgenre-choice${id === "random" ? " random-choice" : ""}`;
    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = id;
    input.checked = selection.has(id);
    input.disabled = locked || (id !== "random" && (randomSelected || (!input.checked && selectedSubgenreCount() >= subgenreLimit)));
    input.addEventListener("change", () => {
      if (id === "random" && input.checked) {
        selection.clear();
        selection.add("random");
      } else if (id === "random") {
        selection.clear();
        const first = Object.keys(window.StoryHeavenGenreCatalog?.[genreId]?.subgenres || {})[0];
        if (first) selection.add(first);
      } else if (input.checked) {
        selection.add(id);
      } else if (selection.size > 1) {
        selection.delete(id);
      } else {
        input.checked = true;
        StoryHeavenCommon.toast("선택한 기본 장르마다 세부장르가 한 개 이상 필요합니다.");
      }
      selectedSubgenresByGenre.set(genreId, selection);
      renderSubgenres();
    });
    const text = document.createElement("span");
    text.textContent = labelText;
    label.append(input, text);
    return label;
  }

  function selectDefaultGenre() {
    selectedPrimaryGenres.add("fantasy");
    selectedSubgenresByGenre.set("fantasy", new Set(["modern-fantasy"]));
  }

  function ensureSubgenreSelection(genreId) {
    if (selectedSubgenresByGenre.get(genreId)?.size) return;
    const first = Object.keys(window.StoryHeavenGenreCatalog?.[genreId]?.subgenres || {})[0];
    selectedSubgenresByGenre.set(genreId, new Set(first ? [first] : []));
  }

  function selectedSubgenreCount() {
    return [...selectedSubgenresByGenre.entries()]
      .filter(([genreId]) => selectedPrimaryGenres.has(genreId))
      .reduce((sum, [, values]) => sum + values.size, 0);
  }

  function hasValidSubgenreSelection() {
    return selectedPrimaryGenres.size > 0
      && [...selectedPrimaryGenres].every((genreId) => (selectedSubgenresByGenre.get(genreId)?.size || 0) > 0)
      && selectedSubgenreCount() <= subgenreLimit;
  }

  function renderHumorControl() {
    if (!selectors.creativeControls) return;
    selectors.creativeControls.classList.toggle("has-comedy", selectedPrimaryGenres.has("comedy"));
    renderCreativeControls();
  }

  function applyCreativePreset(name) {
    const preset = creativePresets[name];
    if (!preset) return;
    for (const [key, fieldName] of Object.entries(creativeFields)) {
      selectors.scheduleForm.elements[fieldName].value = String(preset[key]);
    }
    setCreativePreset(name);
    renderCreativeControls();
  }

  function setCreativePreset(name) {
    const input = selectors.scheduleForm.querySelector(`input[name='creativePreset'][value='${name}']`);
    if (input) input.checked = true;
  }

  function readCreativeControls() {
    const values = {};
    for (const [key, fieldName] of Object.entries(creativeFields)) {
      values[key] = Math.max(1, Math.min(5, Math.round(Number(selectors.scheduleForm.elements[fieldName].value) || 3)));
    }
    values.preset = String(new FormData(selectors.scheduleForm).get("creativePreset") || "custom");
    return values;
  }

  function renderCreativeControls() {
    if (!selectors.creativeControls) return;
    const values = readCreativeControls();
    for (const [key, fieldName] of Object.entries(creativeFields)) {
      const input = selectors.scheduleForm.elements[fieldName];
      const output = input.closest("label")?.querySelector("output");
      if (output) output.value = String(values[key]);
      if (key === "novelty") {
        const label = noveltyLevelLabel(values[key]);
        input.setAttribute("aria-valuetext", `${values[key]} · ${label}`);
        if (output) output.title = label;
      }
      input.style.setProperty("--range-value", `${(values[key] - 1) * 25}%`);
    }
    const presetLabels = { balanced: "균형 설정", fast: "빠른 몰입 설정", emotional: "감정 중심 설정", custom: "직접 조정" };
    selectors.creativeSummary.textContent = presetLabels[values.preset] || "직접 조정";
    const maximumCount = Object.entries(values).filter(([key, value]) => key !== "preset" && value === 5).length;
    selectors.creativeWarning.hidden = maximumCount < 4;
  }

  function creativeControlSummary(values = {}) {
    const entries = [
      ["속도", values.pace],
      ["긴장", values.suspense],
      ["호기심", values.curiosity],
      ["감정", values.emotion]
    ].filter(([, value]) => Number(value) >= 4);
    const novelty = Math.max(1, Math.min(5, Number(values.novelty || creativePresets.balanced.novelty)));
    return [...entries.map(([label, value]) => `${label} ${value}`), `참신성 ${novelty} · ${noveltyLevelLabel(novelty)}`].join(" · ");
  }

  function noveltyLevelLabel(value) {
    return ({ 1: "익숙함 우선", 2: "절제된 차별화", 3: "균형", 4: "독창적", 5: "실험적" })[Number(value)] || "절제된 차별화";
  }

  function humorIntensityFromControls(values) {
    if (Number(values?.humor) >= 4) return "comedy-first";
    if (Number(values?.humor) >= 3) return "balanced";
    return "light";
  }

  async function refreshSchedules() {
    const payload = await StoryHeavenCommon.api("/api/storyheaven/operator/serial-engine/schedules");
    const pollSeconds = Math.max(1, Number(payload.pollSeconds) || 60);
    const queue = payload.queue || {};
    syncServerClock(queue.updatedAt);
    latestSerialSnapshot = {
      enabled: payload.enabled === true,
      emergencyPaused: payload.emergencyPaused === true,
      pollSeconds,
      schedules: Array.isArray(payload.schedules) ? payload.schedules : [],
      queue
    };
    queueByScheduleId.clear();
    failedByScheduleId.clear();
    for (const item of queue.items || []) {
      if (item.scheduleId) queueByScheduleId.set(item.scheduleId, item);
    }
    if (!queueByScheduleId.size && payload.schedules?.length === 1 && queue.items?.length) {
      queueByScheduleId.set(payload.schedules[0].id, queue.items.find((item) => item.status === "running") || queue.items[0]);
    }
    if (queue.lastFailed?.scheduleId) failedByScheduleId.set(queue.lastFailed.scheduleId, queue.lastFailed);
    scheduleById.clear();
    for (const schedule of payload.schedules || []) scheduleById.set(schedule.id, schedule);
    selectors.scheduleList.replaceChildren(...(payload.schedules || []).map(scheduleRow));
    if (!payload.schedules?.length) selectors.scheduleList.append(message("아직 시작한 자동 연재가 없습니다."));
    renderQueue(queue);
    renderSystemState(latestSerialSnapshot);
  }

  function scheduleRow(schedule) {
    const row = document.createElement("article");
    row.className = "schedule-row";
    row.dataset.scheduleId = schedule.id;
    const copy = document.createElement("div");
    const heading = document.createElement("div");
    heading.className = "schedule-heading";
    const title = document.createElement("strong");
    title.textContent = scheduleLabel(schedule);
    const status = badge(schedule.status === "active" ? "가동 중" : "멈춤", schedule.status);
    const mode = badge(schedule.publicationMode === "auto_public" ? "자동 공개" : "테스트 비공개", schedule.publicationMode);
    heading.append(title, status, mode);
    const detail = document.createElement("p");
    const controls = schedule.creativeControls || {};
    detail.textContent = `${subgenreLabels(schedule).join(" · ")} · ${seriesPlanLabel(schedule.seriesPlan)} · 다음 화 기본 ${schedule.continuationBatchCount || 1}화 · 강도 ${creativeControlSummary(controls)} · ${initialBatchText(schedule.targetEpisodeCount || 1)} 완성 뒤 ${formatCadence(schedule.cadenceMinutes)} 대기`;
    const next = document.createElement("small");
    next.textContent = schedule.status === "active" ? `다음 확인 ${formatDate(schedule.nextRunAt)}` : "서비스를 다시 시작할 때까지 생성과 공개가 멈춥니다.";
    copy.append(heading, detail, next);

    const actions = document.createElement("div");
    actions.className = "schedule-actions";
    const power = actionButton(schedule.status === "active" ? "멈춤" : "시작", "secondary", () => updateSchedule(schedule, { status: schedule.status === "active" ? "paused" : "active" }));
    const switchMode = actionButton(schedule.publicationMode === "auto_public" ? "테스트로 전환" : "자동 공개로 전환", "secondary", async () => {
      if (schedule.publicationMode !== "auto_public" && !window.confirm("검수를 통과한 회차가 예약 순서대로 공개됩니다. 자동 공개로 전환할까요?")) return;
      await updateSchedule(schedule, { publicationMode: schedule.publicationMode === "auto_public" ? "test_private" : "auto_public" });
    });
    actions.append(power, switchMode);
    actions.append(actionButton("설정 불러오기", "secondary", () => loadScheduleIntoForm(schedule)));
    if (schedule.lastRunId) actions.append(actionButton("최근 기록", "", () => loadRun(schedule.lastRunId)));
    actions.append(actionButton(schedule.status === "active" ? "중지 후 삭제" : "삭제", "danger", () => deleteSchedule(schedule)));
    row.append(copy, actions);
    const activeWork = queueByScheduleId.get(schedule.id);
    if (activeWork) row.append(renderScheduleProgress(activeWork));
    else {
      const failedWork = failedByScheduleId.get(schedule.id);
      if (failedWork) row.append(renderScheduleFailure(schedule, failedWork));
    }
    return row;
  }

  async function saveSchedule(event) {
    event.preventDefault();
    if (!hasValidSubgenreSelection()) {
      selectors.subgenreHelp.classList.add("invalid");
      selectors.subgenres.querySelector("input")?.focus();
      return StoryHeavenCommon.toast("선택한 장르마다 세부장르를 한 개 이상 골라주세요.");
    }
    const button = selectors.scheduleForm.querySelector("button[type='submit']");
    button.disabled = true;
    try {
      const form = new FormData(selectors.scheduleForm);
      const primaryGenres = [...selectedPrimaryGenres];
      const subgenresByGenre = Object.fromEntries(primaryGenres.map((genreId) => [
        genreId,
        [...(selectedSubgenresByGenre.get(genreId) || [])]
      ]));
      const subgenres = Object.values(subgenresByGenre).flat();
      const cadenceMinutes = readCadenceMinutes();
      if (!cadenceMinutes) return;
      const targetEpisodeCount = readTargetEpisodeCount();
      if (!targetEpisodeCount) return;
      const seriesPlan = readSeriesPlan();
      if (!seriesPlan) return;
      const creativeControls = readCreativeControls();
      const created = await StoryHeavenCommon.api("/api/storyheaven/operator/serial-engine/schedules", {
        method: "POST",
        body: {
          primaryGenre: primaryGenres[0],
          primaryGenres,
          subgenres,
          subgenresByGenre,
          publicationMode: form.get("publicationMode"),
          cadenceMinutes,
          targetEpisodeCount,
          totalVolumes: seriesPlan.totalVolumes,
          episodesPerVolume: seriesPlan.episodesPerVolume,
          continuationBatchCount: readContinuationBatchCount(),
          creativeControls,
          humorIntensity: humorIntensityFromControls(creativeControls),
          targetAge: "teen",
          status: "active",
          conceptPolicy: form.get("conceptPolicy")
        }
      });
      await StoryHeavenCommon.api(`/api/storyheaven/operator/serial-engine/schedules/${encodeURIComponent(created.schedule.id)}/run`, {
        method: "POST",
        body: {}
      });
      await refreshSchedules();
      saveDraftNow();
      StoryHeavenCommon.toast(selectedPrimaryGenres.has("random") || subgenres.includes("random")
        ? `랜덤 장르의 ${initialBatchText(targetEpisodeCount)} 제작을 대기열에 넣었습니다.`
        : `${initialBatchText(targetEpisodeCount)} 제작을 대기열에 넣었습니다.`);
    } catch (error) {
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    } finally {
      button.disabled = false;
    }
  }

  async function updateSchedule(schedule, changes) {
    try {
      await StoryHeavenCommon.api(`/api/storyheaven/operator/serial-engine/schedules/${encodeURIComponent(schedule.id)}`, {
        method: "PATCH",
        body: {
          primaryGenre: schedule.primaryGenre,
          primaryGenres: schedulePrimaryGenres(schedule),
          subgenres: schedule.subgenres,
          subgenresByGenre: scheduleSubgenresByGenre(schedule),
          publicationMode: schedule.publicationMode,
          cadenceMinutes: schedule.cadenceMinutes,
          targetEpisodeCount: schedule.targetEpisodeCount || 1,
          totalVolumes: schedule.seriesPlan?.totalVolumes || 10,
          episodesPerVolume: schedule.seriesPlan?.episodesPerVolume || 25,
          continuationBatchCount: schedule.continuationBatchCount || 1,
          creativeControls: schedule.creativeControls || creativePresets.balanced,
          humorIntensity: schedule.humorIntensity || "light",
          targetAge: schedule.targetAge,
          status: schedule.status,
          nextRunAt: schedule.nextRunAt,
          conceptPolicy: schedule.conceptPolicy,
          ...changes
        }
      });
      await refreshSchedules();
      StoryHeavenCommon.toast(changes.status === "paused" ? "자동 연재를 멈췄습니다." : "연재 설정을 반영했습니다.");
    } catch (error) {
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    }
  }

  async function deleteSchedule(schedule) {
    const warning = `‘${scheduleLabel(schedule)}’ 자동 연재 설정을 목록에서 삭제할까요?\n\n현재 진행·대기 중인 제작과 공개 예약은 취소됩니다. 이미 만든 작품과 작업 기록은 지워지지 않습니다.`;
    if (!window.confirm(warning)) return;
    try {
      const result = await StoryHeavenCommon.api(`/api/storyheaven/operator/serial-engine/schedules/${encodeURIComponent(schedule.id)}`, {
        method: "DELETE"
      });
      await refreshSchedules();
      const canceled = result.canceled || {};
      const count = Number(canceled.jobs || 0) + Number(canceled.publications || 0) + Number(canceled.continuations || 0);
      StoryHeavenCommon.toast(count
        ? `자동 연재 설정을 삭제하고 연결된 대기 작업 ${count}건을 취소했습니다.`
        : "자동 연재 설정을 목록에서 삭제했습니다. 기존 작품과 기록은 보존됩니다.");
    } catch (error) {
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    }
  }

  function renderQueue(queue) {
    const items = Array.isArray(queue.items) ? queue.items : [];
    const running = items.filter((item) => item.status === "running");
    const waiting = items.filter((item) => item.status !== "running");
    const attention = Array.isArray(queue.attention) ? queue.attention : (queue.lastFailed ? [queue.lastFailed] : []);
    const completed = Array.isArray(queue.recentCompleted) ? queue.recentCompleted : (queue.lastCompleted ? [queue.lastCompleted] : []);
    renderStatusCounts(queue.statusCounts || {}, running.length, waiting.length, completed.length, attention.length);
    renderQueueLive(running, queue.updatedAt);
    selectors.queueList.replaceChildren(...waiting.map(queueRow));
    if (!waiting.length) selectors.queueList.append(message("대기 중인 제작이 없습니다."));
    selectors.waitingCaption.textContent = `${waiting.length}건`;
    renderAttention(attention);
    renderStalledFirstEpisodes(Array.isArray(queue.stalledFirstEpisodeStories) ? queue.stalledFirstEpisodeStories : []);
    renderCompleted(completed);
    selectors.queueNote.textContent = "진행 상황은 6초마다 갱신됩니다. 이전 실패와 공개 보류는 현재 작업과 분리해 기록으로 보관합니다.";
    const last = queue.lastCompleted;
    selectors.queueLast.replaceChildren();
    const title = document.createElement("strong");
    const detail = document.createElement("span");
    if (last) {
      title.textContent = `직전 연재 작업 ${formatDuration(last.elapsedSeconds)}`;
      detail.textContent = `${last.workLabel} · AI 작업 ${last.completedJobs}회 · ${formatDate(last.completedAt)}`;
    } else {
      title.textContent = "직전 연재 작업 기록 없음";
      detail.textContent = "첫 작업이 끝나면 실제 소요 시간과 AI 작업 수가 표시됩니다.";
    }
    selectors.queueLast.append(title, detail);
    renderTimingSummary();
    renderRunHistory(queue.history || [], queue.hiddenHistory || []);
  }

  function toggleHiddenHistory() {
    showHiddenHistory = !showHiddenHistory;
    renderRunHistory(latestSerialSnapshot.queue?.history || [], latestSerialSnapshot.queue?.hiddenHistory || []);
  }

  function renderStatusCounts(counts, running, waiting, completed, attention) {
    selectors.statusRunning.textContent = String(Number(counts.running ?? running));
    selectors.statusWaiting.textContent = String(Number(counts.waiting ?? waiting));
    selectors.statusComplete.textContent = String(Number(counts.complete ?? completed));
    selectors.statusAttention.textContent = String(Number(counts.attention ?? attention));
  }

  function renderSystemState(snapshot = latestSerialSnapshot) {
    const queue = snapshot.queue || {};
    const items = Array.isArray(queue.items) ? queue.items : [];
    const running = items.filter((item) => item.status === "running");
    const waiting = items.filter((item) => item.status !== "running");
    const attention = Array.isArray(queue.attention) ? queue.attention : (queue.lastFailed ? [queue.lastFailed] : []);
    const systemAttention = attention.filter((item) => item.attentionType !== "quality_hold");
    const qualityHold = attention.find((item) => item.attentionType === "quality_hold");
    const schedules = Array.isArray(snapshot.schedules) ? snapshot.schedules : [];
    const activeSchedules = schedules.filter((schedule) => schedule.status === "active");
    const pausedSchedules = schedules.filter((schedule) => schedule.status === "paused");
    const resumeTarget = findSystemResumeTarget(snapshot);
    const state = {
      kind: "cooldown",
      title: "쿨타임 대기",
      chip: "쿨타임 대기",
      detail: `${Math.max(1, Number(snapshot.pollSeconds) || 60)}초마다 예약 시간이 된 작업을 확인합니다.`,
      cause: ""
    };

    if (!snapshot.enabled) {
      state.kind = "disabled";
      state.title = "서버 엔진 꺼짐";
      state.chip = "서버 설정 꺼짐";
      state.detail = "서버 설정에서 자동 연재 엔진이 꺼져 있어 제작과 예약 확인이 실행되지 않습니다.";
      state.cause = "서버 환경 설정을 켠 뒤 다시 시작 버튼을 사용할 수 있습니다.";
    } else if (snapshot.emergencyPaused || (schedules.length && !activeSchedules.length)) {
      state.kind = "paused";
      state.title = "전체 중지됨";
      state.chip = "전체 중지";
      state.detail = "새 예약과 다음 단계 처리가 멈춰 있습니다. 다시 시작을 누르면 대기열을 먼저 깨운 뒤 예약을 확인합니다.";
      state.cause = systemPauseCause({ running, waiting, systemAttention });
    } else if (systemAttention.length) {
      const issue = systemAttention[0];
      state.kind = "attention";
      state.title = "확인 필요";
      state.chip = "확인 필요";
      state.detail = "시스템 오류로 멈춘 작업이 있습니다. 중단 위치부터 재개하면 실패한 단계부터 다시 대기열에 넣습니다.";
      state.cause = `${workDisplayTitle(issue)} · ${stageLabel(issue.stage)} · ${failureLabel(issue.failureCode)}`;
    } else if (running.length) {
      const active = running[0];
      state.kind = "running";
      state.title = "제작 중";
      state.chip = "제작 중";
      state.detail = `${workDisplayTitle(active)} 작업을 처리하고 있습니다.`;
      state.cause = `${stageLabel(active.stage)} · 경과 ${formatDuration(active.elapsedSeconds)}${running.length > 1 ? ` · 추가 진행 ${running.length - 1}건` : ""}`;
    } else if (waiting.length) {
      const next = waiting[0];
      state.kind = "waiting";
      state.title = "대기열 준비됨";
      state.chip = "대기 중";
      state.detail = `${waiting.length}건이 순서를 기다립니다. 중단 위치부터 재개를 누르면 다음 작업을 바로 확인합니다.`;
      state.cause = `${workDisplayTitle(next)} · ${stageLabel(next.stage)} · ${formatDate(next.requestedAt)} 요청`;
    } else if (qualityHold) {
      state.kind = "attention";
      state.title = "검수 보류 확인 필요";
      state.chip = "검수 보류";
      state.detail = "원고 생성은 끝났지만 자동 편집 검수에서 바로 공개하기 어렵다고 판단한 작업이 있습니다.";
      state.cause = `${workDisplayTitle(qualityHold)} · 검수 결과 보기를 열어 보류 사유를 확인하세요.`;
    } else if (activeSchedules.length) {
      const nextSchedule = nextActiveSchedule(activeSchedules);
      if (nextSchedule) {
        const due = serialTime(nextSchedule.nextRunAt) <= serialNow();
        state.title = due ? "예약 확인 대기" : "쿨타임 대기";
        state.chip = due ? "예약 확인 대기" : "쿨타임 대기";
        state.detail = due
          ? "예약 시간이 지난 설정이 있어 다음 자동 확인에서 새 작업을 요청합니다."
          : `다음 예약까지 기다리는 중입니다. ${formatDate(nextSchedule.nextRunAt)}에 확인합니다.`;
        state.cause = `${scheduleLabel(nextSchedule)} · ${formatCadence(nextSchedule.cadenceMinutes)} 간격`;
      } else {
        state.detail = "가동 중인 설정은 있지만 다음 예약 시간이 아직 정해지지 않았습니다.";
        state.cause = "설정 카드에서 다음 확인 시간을 조정할 수 있습니다.";
      }
    } else {
      state.kind = "setup";
      state.title = "설정 없음";
      state.chip = "설정 없음";
      state.detail = "아직 자동 연재 설정이 없습니다. 장르를 고르고 첫 제작을 대기열에 넣어주세요.";
      state.cause = "";
    }

    selectors.systemPanel.className = `serial-control-panel is-${state.kind}`;
    selectors.systemTitle.textContent = state.title;
    if (selectors.systemClock) selectors.systemClock.hidden = state.kind !== "cooldown";
    updateSeoulClock();
    selectors.systemDetail.textContent = state.detail;
    selectors.systemCause.textContent = state.cause;
    selectors.systemCause.hidden = !state.cause;
    selectors.engineState.textContent = state.chip;

    const globallyPaused = snapshot.emergencyPaused || (schedules.length > 0 && !activeSchedules.length);
    selectors.systemResume.disabled = !snapshot.enabled || !resumeTarget || globallyPaused;
    selectors.systemPause.disabled = !snapshot.enabled || globallyPaused;
    selectors.systemStart.disabled = !snapshot.enabled || (!snapshot.emergencyPaused && (!schedules.length || (!pausedSchedules.length && !waiting.length && !systemAttention.length)));
    selectors.systemResume.title = globallyPaused ? "전체 중지 상태에서는 다시 시작을 먼저 눌러주세요." : resumeTarget ? "" : "재개할 중단 또는 대기 작업이 없습니다.";
    selectors.systemPause.title = activeSchedules.length ? "" : "이미 전체 중지 상태입니다.";
    selectors.systemStart.title = selectors.systemStart.disabled ? "중지된 설정이나 깨울 대기열이 없습니다." : "";
  }

  function systemPauseCause({ running, waiting, systemAttention }) {
    const parts = [];
    if (running.length) parts.push(`실행 중 ${running.length}건의 저장 권한 회수`);
    if (waiting.length) parts.push(`대기 ${waiting.length}건`);
    if (systemAttention.length) parts.push(`중단 ${systemAttention.length}건`);
    return parts.length ? `${parts.join(" · ")} · 다시 시작하면 이 작업부터 이어갑니다.` : "새 작업 요청과 자동 공개가 멈춰 있습니다.";
  }

  function nextActiveSchedule(schedules) {
    return schedules
      .filter((schedule) => schedule.nextRunAt && Number.isFinite(serialTime(schedule.nextRunAt)))
      .sort((left, right) => serialTime(left.nextRunAt) - serialTime(right.nextRunAt))[0] || null;
  }

  function findSystemResumeTarget(snapshot = latestSerialSnapshot) {
    const queue = snapshot.queue || {};
    const items = Array.isArray(queue.items) ? queue.items : [];
    const attention = Array.isArray(queue.attention) ? queue.attention : (queue.lastFailed ? [queue.lastFailed] : []);
    const issue = attention.find((item) => item.attentionType !== "quality_hold" && (item.id || item.scheduleId));
    if (issue) return { item: issue, force: false };
    const waiting = items.find((item) => item.status !== "running" && (item.id || item.scheduleId));
    if (waiting) return { item: waiting, force: false };
    const running = items.find((item) => item.status === "running" && item.id);
    if (running) return { item: running, force: true };
    return null;
  }

  async function guardedSystemButton(button, handler) {
    const controls = [selectors.systemResume, selectors.systemPause, selectors.systemStart].filter(Boolean);
    controls.forEach((control) => { control.disabled = true; });
    try {
      await handler();
    } finally {
      renderSystemState(latestSerialSnapshot);
    }
  }

  async function resumeSystemFromPanel() {
    const target = findSystemResumeTarget();
    if (target) {
      await resumeQueue(target.item, { force: target.force });
      return;
    }
    await controlSerialSystem("resume");
  }

  async function controlSerialSystem(action) {
    try {
      const payload = action === "pause"
        ? await requestEmergencyPause()
        : await StoryHeavenCommon.api("/api/storyheaven/operator/serial-engine/system", {
          method: "POST",
          body: { action }
        });
      await refreshSchedules();
      if (action === "pause") {
        const held = Number(payload.system?.heldJobs || 0);
        const interrupted = Number(payload.system?.interruptedRunningJobs || 0);
        const detail = [interrupted ? `작성 중 ${interrupted}건` : "", held ? `전체 대기 ${held}건` : ""].filter(Boolean).join(" · ");
        const persistence = payload.system?.persisted === false ? " 서버 차단은 적용했으며 중지 상태 저장을 재시도하고 있습니다." : "";
        StoryHeavenCommon.toast(`자동 연재를 즉시 전체 중지했습니다.${detail ? ` ${detail}을 멈췄습니다.` : ""}${persistence}`);
      } else {
        const resumed = payload.resumed || {};
        const resumedCount = Number(resumed.waitingReleased || 0) + Number(resumed.errorJobsReleased || 0) + Number(resumed.expiredReleased || 0);
        StoryHeavenCommon.toast(resumedCount ? `자동 연재를 다시 시작했습니다. 대기·중단 단계 ${resumedCount}건을 깨웠습니다.` : "자동 연재를 다시 시작했습니다.");
      }
    } catch (error) {
      const message = action === "pause" && ["request_failed", "api_unavailable"].includes(error?.message)
        ? "긴급 중지 요청이 서버에 닿지 않았습니다. 네트워크 연결을 확인한 뒤 다시 눌러주세요."
        : StoryHeavenCommon.readableError(error);
      StoryHeavenCommon.toast(message);
    }
  }

  async function requestEmergencyPause() {
    let lastError;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await StoryHeavenCommon.api("/api/storyheaven/operator/serial-engine/system", {
          method: "POST",
          body: { action: "pause" }
        });
      } catch (error) {
        lastError = error;
        if (["google_login_required", "admin_account_required"].includes(error?.message)) throw error;
        if (attempt < 2) await new Promise((resolve) => window.setTimeout(resolve, 400 * (attempt + 1)));
      }
    }
    throw lastError;
  }

  function renderAttention(items) {
    selectors.attentionList.replaceChildren();
    if (!items.length) {
      const empty = message("지금 조치할 문제는 없습니다.");
      empty.classList.add("is-success");
      selectors.attentionList.append(empty);
      return;
    }
    for (const item of items) {
      const row = document.createElement("article");
      row.className = "attention-row";
      const copy = document.createElement("div");
      const title = document.createElement("strong");
      const detail = document.createElement("p");
      title.textContent = workDisplayTitle(item);
      detail.textContent = item.attentionType === "quality_hold"
        ? `원고 작성은 완료됐으며 일부 품질 기준이 남아 회차 등록만 보류했습니다. · ${formatDate(item.completedAt || item.requestedAt)}`
        : `${stageLabel(item.stage)}에서 멈춤 · ${formatDate(item.completedAt || item.requestedAt)} · ${failureLabel(item.failureCode)}`;
      copy.append(title, detail);
      const actions = document.createElement("div");
      actions.className = "attention-actions";
      if (item.attentionType === "quality_hold" && item.latestRunId) {
        actions.append(actionButton("검수 결과 보기", "queue-retry", () => loadRun(item.latestRunId)));
      } else {
        actions.append(actionButton("중단 지점부터 재개", "queue-retry", () => resumeQueue(item)));
      }
      if (item.scheduleId) actions.append(actionButton("연결 설정 보기", "secondary", () => focusSchedule(item.scheduleId)));
      row.append(copy, actions);
      selectors.attentionList.append(row);
    }
  }

  function renderStalledFirstEpisodes(items) {
    selectors.stalledList.replaceChildren();
    const qualityCount = items.filter((story) => stalledPrologueState(story) === "quality").length;
    const errorCount = items.filter((story) => stalledPrologueState(story) === "error").length;
    selectors.stalledCaption.textContent = `${items.length}건 · 보완 ${qualityCount} · 오류 ${errorCount}`;
    if (!items.length) {
      const empty = message("프롤로그 등록 전에 확인할 작품은 없습니다.");
      empty.classList.add("is-success");
      selectors.stalledList.append(empty);
      return;
    }
    for (const story of items) {
      const row = document.createElement("article");
      row.className = "stalled-row";
      const copy = document.createElement("div");
      copy.className = "stalled-copy";
      const heading = document.createElement("div");
      heading.className = "stalled-heading";
      const title = document.createElement("strong");
      title.textContent = story.title || "제목 없는 작품";
      const state = stalledPrologueState(story);
      const stateBadge = document.createElement("span");
      stateBadge.className = `stalled-state is-${state}`;
      stateBadge.textContent = stalledPrologueStateLabel(state);
      heading.append(title, stateBadge);
      const detail = document.createElement("p");
      const time = story.latestCompletedAt || story.latestRunCreatedAt || story.updatedAt || story.createdAt;
      detail.textContent = stalledPrologueDetail(story, state, time);
      const reason = document.createElement("small");
      reason.className = "stalled-reason";
      reason.textContent = stalledPrologueReason(story, state);
      const resolution = document.createElement("small");
      resolution.className = "stalled-resolution";
      resolution.textContent = stalledPrologueResolution(story, state);
      copy.append(heading, detail, reason, resolution);
      const actions = document.createElement("div");
      actions.className = "stalled-actions";
      if (story.latestRunId) actions.append(actionButton(state === "quality" ? "원고·검수 사유 보기" : "원고·로그 보기", "secondary", () => loadRun(story.latestRunId)));
      if (state === "quality") {
        actions.append(actionButton("지적 부분 다시 보완", "queue-retry", () => resolveQualityHold(story, "rewrite")));
        if (story.review?.safetyPassed !== false) {
          actions.append(actionButton("현재 원고 승인", "warning", () => resolveQualityHold(story, "approve")));
        }
      } else if (state === "error" && story.queueGroupId) {
        actions.append(actionButton("오류 단계 재개", "queue-retry", () => resumeQueue({ ...story, id: story.queueGroupId })));
      } else if (["draft", "missing"].includes(state)) {
        actions.append(actionButton(state === "draft" ? "프롤로그 제작 다시 요청" : "프롤로그 제작 시작", "queue-retry", () => resumeFirstEpisodeStory(story)));
      }
      if (story.schedule?.id) actions.append(actionButton("연결 설정 보기", "secondary", () => focusSchedule(story.schedule.id)));
      actions.append(actionButton("목록에서 숨기기", "secondary", () => hideIncompleteStory(story)));
      row.append(copy, actions);
      selectors.stalledList.append(row);
    }
  }

  function stalledPrologueState(story) {
    if (story.latestRunStatus === "error") return "error";
    if (story.latestRunStatus === "ready" || story.publication?.status === "ready") return "ready";
    if (story.latestRunStatus === "blocked" && (story.latestStage === "editorial_blocked" || story.review?.decision === "blocked")) return "quality";
    return story.draft ? "draft" : "missing";
  }

  function stalledPrologueStateLabel(state) {
    return ({
      quality: "원고 완성 · 보완 필요",
      error: "원고 완성 · 시스템 오류",
      ready: "검수 통과 · 공개 대기",
      draft: "원고 완성 · 등록 대기",
      missing: "원고 미작성"
    })[state];
  }

  function stalledPrologueDetail(story, state, time) {
    const characters = Number(story.draft?.characterCount || 0);
    const manuscript = characters ? `원고 ${characters.toLocaleString("ko-KR")}자 작성 완료` : "프롤로그 회차 미등록";
    if (state === "quality") return `${manuscript} · 자동 보완 ${Number(story.rewriteCount || 0)}회 · ${formatDate(time)}`;
    if (state === "error") return `${manuscript} · ${failureLabel(story.latestFailureCode)} · ${formatDate(time)}`;
    if (state === "ready") return `${manuscript} · 자동 검수 통과 · ${formatDate(time)}`;
    if (state === "draft") return `${manuscript} · 회차 등록 전 확인 필요 · ${formatDate(time)}`;
    return `프롤로그 원고가 아직 만들어지지 않았습니다. · ${formatDate(time)}`;
  }

  function stalledPrologueReason(story, state) {
    if (state === "quality") return story.review?.summary || "자동 편집 검수의 공개 기준을 충족하지 못해 원고를 보존한 채 회차 등록을 멈췄습니다.";
    if (state === "error") return `원고는 보존돼 있습니다. ${failureLabel(story.latestFailureCode)} 때문에 검수 또는 등록 단계가 끝나지 않았습니다.`;
    if (state === "ready") return readyPublicationReason(story);
    if (state === "draft") return "원고는 있지만 검수 통과 또는 회차 등록 기록이 없어 운영자 확인이 필요합니다.";
    return story.logline || "설정과 제목까지만 만들어졌으며 프롤로그 원고는 아직 없습니다.";
  }

  function stalledPrologueResolution(story, state) {
    if (state === "quality") {
      const issue = (story.review?.issues || []).find((item) => ["critical", "warning"].includes(item.severity)) || story.review?.issues?.[0];
      return `해결 방법 · ${issue?.suggestion || "검수 결과를 열어 지적 부분만 다시 보완하거나, 안전성 문제가 없다면 현재 원고를 운영자 승인합니다."}`;
    }
    if (state === "error") return "해결 방법 · 오류 단계 재개를 누르면 완성 원고를 유지하고 멈춘 검수부터 다시 시작합니다.";
    if (state === "ready") return "해결 방법 · 연결된 자동연재 설정의 상태와 공개 방식을 확인하세요. 조건이 충족되면 다음 자동 처리에서 회차로 등록됩니다.";
    if (state === "draft") return "해결 방법 · 원고·로그에서 마지막 상태를 확인한 뒤 필요하면 프롤로그 제작을 다시 요청하세요.";
    return "해결 방법 · 프롤로그 제작 시작을 누르면 기존 설정집을 이용해 같은 대기열에 추가합니다.";
  }

  function readyPublicationReason(story) {
    if (latestSerialSnapshot.emergencyPaused) return "전체 자동 연재가 중지되어 공개 처리가 멈춰 있습니다.";
    if (story.schedule?.status === "paused") return "연결된 자동연재 설정이 멈춤 상태라 공개 처리를 기다리고 있습니다.";
    if (story.schedule?.status === "archived") return "연결된 자동연재 설정이 삭제되어 자동 공개되지 않습니다.";
    if (story.schedule?.publicationMode === "test_private") return "테스트 비공개 설정이라 검수 통과 원고를 공개하지 않고 보관 중입니다.";
    if (story.visibility === "private") return "작품이 비공개로 지정되어 자동 공개되지 않습니다.";
    if (story.publication?.releaseAt && Date.parse(story.publication.releaseAt) > Date.now()) return `${formatDate(story.publication.releaseAt)} 공개 예약입니다.`;
    return "검수는 통과했으며 공개 처리 순서를 기다리고 있습니다.";
  }

  async function resolveQualityHold(story, action) {
    if (!story?.latestRunId) return;
    if (action === "approve") {
      const autoPublic = story.schedule?.publicationMode === "auto_public";
      const warning = autoPublic
        ? "현재 원고를 운영자 승인할까요? 연결 설정이 자동 공개 상태이면 프롤로그가 공개 처리 대기열로 넘어갑니다."
        : "현재 원고를 운영자 승인할까요? 테스트 비공개 설정이면 원고는 공개되지 않고 승인 상태로 보관됩니다.";
      if (!window.confirm(warning)) return;
    }
    try {
      await StoryHeavenCommon.api(`/api/storyheaven/operator/serial-engine/runs/${encodeURIComponent(story.latestRunId)}/resolve-quality-hold`, {
        method: "POST",
        body: { action }
      });
      await refreshSchedules();
      StoryHeavenCommon.toast(action === "rewrite"
        ? "검수 지적 부분만 다시 보완하도록 대기열에 넣었습니다."
        : "현재 원고를 승인했습니다. 연결 설정의 공개 방식에 따라 처리됩니다.");
    } catch (error) {
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    }
  }

  async function resumeFirstEpisodeStory(story) {
    if (!story?.id) return;
    try {
      const payload = await StoryHeavenCommon.api(`/api/storyheaven/operator/serial-engine/stories/${encodeURIComponent(story.id)}/plan`, {
        method: "POST",
        body: { autoEpisode: true }
      });
      await refreshSchedules();
      StoryHeavenCommon.toast(payload.run?.reused
        ? "이미 준비 중인 프롤로그 작업으로 연결했습니다."
        : "프롤로그 제작을 대기열에 넣었습니다. 다른 작품도 이어서 추가할 수 있습니다.");
    } catch (error) {
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    }
  }

  async function hideIncompleteStory(story) {
    if (!story?.id) return;
    try {
      await StoryHeavenCommon.api(`/api/storyheaven/operator/serial-engine/stories/${encodeURIComponent(story.id)}/control`, {
        method: "PATCH",
        body: {
          visibility: "archived",
          continuationMode: "ended",
          operatorNote: "프롤로그 등록 전 확인 목록에서 운영자 숨김"
        }
      });
      await refreshSchedules();
      StoryHeavenCommon.toast("작품과 연결된 대기·로그를 숨겼습니다. 연재 작품 관리의 ‘숨긴 작품’에서 복원할 수 있습니다.");
    } catch (error) {
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    }
  }

  function renderCompleted(items) {
    selectors.completedList.replaceChildren();
    selectors.completedCaption.textContent = `${items.length}건`;
    if (!items.length) {
      selectors.completedList.append(message("아직 완료된 제작이 없습니다."));
      return;
    }
    for (const item of items) {
      const row = document.createElement("article");
      row.className = "completed-row";
      const copy = document.createElement("div");
      const title = document.createElement("strong");
      const detail = document.createElement("p");
      title.textContent = workDisplayTitle(item);
      detail.textContent = `${formatDate(item.completedAt)} 완료 · ${formatDuration(item.elapsedSeconds)} · AI 작업 ${item.completedJobs}회`;
      copy.append(title, detail);
      row.append(copy);
      if (item.latestRunId) row.append(actionButton("원고·검수 보기", "secondary", () => loadRun(item.latestRunId)));
      selectors.completedList.append(row);
    }
  }

  function renderTimingSummary() {
    const schedules = [...scheduleById.values()];
    const sampleCount = schedules.reduce((sum, schedule) => sum + Number(schedule.episode1Timing?.sampleCount || 0), 0);
    const weightedSeconds = schedules.reduce((sum, schedule) => {
      const samples = Number(schedule.episode1Timing?.sampleCount || 0);
      return sum + Number(schedule.episode1Timing?.averageSeconds || 0) * samples;
    }, 0);
    selectors.timingSummary.replaceChildren();
    const title = document.createElement("strong");
    const detail = document.createElement("span");
    title.textContent = "평균 1화 작업 예상 시간";
    detail.textContent = sampleCount > 0
      ? `${formatDuration(Math.round(weightedSeconds / sampleCount))} · 완료 ${sampleCount}건 기준`
      : "첫 1화가 완성되면 실제 측정값으로 자동 계산합니다.";
    selectors.timingSummary.append(title, detail);
  }

  function renderRunHistory(history, hiddenHistory = []) {
    const historyItems = Array.isArray(history) ? history : [];
    const visible = historyItems.filter((item) => !locallyHiddenHistory.has(historyStorageId(item)));
    const hiddenById = new Map((Array.isArray(hiddenHistory) ? hiddenHistory : [])
      .map((item) => [historyStorageId(item), item])
      .filter(([id]) => id));
    for (const item of historyItems) {
      const id = historyStorageId(item);
      if (!id || !locallyHiddenHistory.has(id) || hiddenById.has(id)) continue;
      hiddenById.set(id, {
        ...item,
        status: "hidden",
        stage: "history_hidden",
        canceledAt: locallyHiddenHistory.get(id) || item.completedAt || item.requestedAt
      });
    }
    const hidden = [...hiddenById.values()];
    if (!hidden.length) showHiddenHistory = false;
    selectors.historyHiddenToggle.hidden = !hidden.length;
    selectors.historyHiddenToggle.textContent = showHiddenHistory
      ? `숨긴 로그 숨기기 (${hidden.length})`
      : `숨긴 로그 보기 (${hidden.length})`;
    selectors.historyHiddenToggle.setAttribute("aria-pressed", showHiddenHistory ? "true" : "false");

    const visibleHistory = showHiddenHistory
      ? [...visible, ...hidden].sort((left, right) => historySortTime(right) - historySortTime(left))
      : visible;
    selectors.runHistory.replaceChildren();
    const completeCount = visible.filter((item) => item.status === "complete").length;
    const issueCount = visible.filter((item) => ["error", "blocked", "stopped"].includes(item.status)).length;
    selectors.historySummary.textContent = `작품별 작업 로그 · 완료 ${completeCount} · 확인 필요 ${issueCount} · 숨김 ${hidden.length}`;
    if (!visibleHistory.length) {
      selectors.runHistory.append(message(hidden.length ? "기본 보기에는 표시할 작업 로그가 없습니다. 숨긴 로그 보기를 누르면 정리한 기록을 확인할 수 있습니다." : "아직 기록된 자동 연재 작업 로그가 없습니다."));
      return;
    }
    for (const run of visibleHistory) {
      const item = document.createElement("article");
      item.className = `run-history-item is-${run.status}`;
      const header = document.createElement("header");
      const title = document.createElement("strong");
      const meta = document.createElement("p");
      title.textContent = workDisplayTitle(run);
      meta.textContent = run.status === "hidden"
        ? `${historyStatusLabel(run.status)} · ${stageLabel(run.stage)} · 숨김 처리 ${formatDate(run.canceledAt || run.completedAt || run.requestedAt)}`
        : `${historyStatusLabel(run.status)} · ${stageLabel(run.stage)} · 마지막 기록 ${formatDate(run.completedAt || run.startedAt || run.requestedAt)}`;
      header.append(title, meta);
      const summary = document.createElement("div");
      summary.className = "run-history-summary";
      summary.append(historyMetric("상태", historyStatusLabel(run.status)), historyMetric("소요 시간", formatDuration(run.elapsedSeconds)), historyMetric("AI 단계", `${run.completedJobs}/${Math.max(run.totalJobs, run.completedJobs)}회`));
      if (isPendingWorkTitle(run)) summary.append(historyMetric("제목", "아직 생성 전"));
      if (run.failureCode) summary.append(historyMetric("원인", failureLabel(run.failureCode)));
      item.append(header, summary);

      const timings = Array.isArray(run.stageTimings) ? run.stageTimings : [];
      if (timings.length) {
        const list = document.createElement("ol");
        list.className = "stage-timing-list";
        for (const timing of timings) {
          const row = document.createElement("li");
          row.className = `is-${timing.status || "unknown"}`;
          const label = document.createElement("span");
          const value = document.createElement("b");
          label.textContent = `${timing.episodeNo ? `${timing.episodeNo}화 · ` : ""}${stageLabel(timing.type)}`;
          value.textContent = timing.durationSeconds === null
            ? historyStatusLabel(timing.status)
            : formatDuration(timing.durationSeconds);
          const time = document.createElement("small");
          time.textContent = formatDate(timing.completedAt || timing.startedAt || timing.createdAt);
          row.append(label, value);
          row.append(time);
          list.append(row);
        }
        item.append(list);
      }
      const actions = document.createElement("div");
      actions.className = "run-history-actions";
      if (run.retryable) actions.append(actionButton("중단 단계 재개", "queue-retry", () => resumeQueue(run)));
      if (run.status === "blocked" && run.latestRunId) actions.append(actionButton("검수 결과 보기", "secondary", () => loadRun(run.latestRunId)));
      else if (run.latestRunId) actions.append(actionButton("상세 로그 보기", "secondary", () => loadRun(run.latestRunId)));
      if (canCancelHistoryRun(run)) actions.append(actionButton("로그 숨김", "history-cancel queue-cancel", () => hideHistoryRun(run)));
      if (actions.childElementCount) item.append(actions);
      selectors.runHistory.append(item);
    }
  }

  function historySortTime(item = {}) {
    return Date.parse(item.canceledAt || item.completedAt || item.startedAt || item.requestedAt || "") || 0;
  }

  function historyMetric(label, value) {
    const item = document.createElement("span");
    const title = document.createElement("small");
    const copy = document.createElement("b");
    title.textContent = label;
    copy.textContent = value;
    item.append(title, copy);
    return item;
  }

  function workDisplayTitle(item = {}) {
    const title = String(item.title || "").trim();
    const label = String(item.workLabel || "").trim();
    if (title && title !== "새 작품 기획") return title;
    if (label && !/^새 작품(?:\s*·|$)/u.test(label)) return label;
    if (isPendingWorkTitle(item)) {
      const genres = workGenreLabels(item).join(" × ") || "장르 미정";
      const targetCount = Math.max(1, Number(item.targetEpisodeCount || scheduleById.get(item.scheduleId)?.targetEpisodeCount || 1));
      return `제목 생성 전 · ${genres} · ${initialBatchText(targetCount)}`;
    }
    return label || title || "제목 확인 필요";
  }

  function isPendingWorkTitle(item = {}) {
    const title = String(item.title || "").trim();
    const label = String(item.workLabel || "").trim();
    return item.titlePending === true
      || title === "새 작품 기획"
      || (!title && /^새 작품(?:\s*·|$)/u.test(label));
  }

  function workGenreLabels(item = {}) {
    const schedule = item.scheduleId ? scheduleById.get(item.scheduleId) : null;
    const genreIds = Array.isArray(item.primaryGenres) && item.primaryGenres.length
      ? item.primaryGenres
      : schedule
        ? schedulePrimaryGenres(schedule)
        : [item.primaryGenre].filter(Boolean);
    return [...new Set(genreIds)].map(genreLabel).filter(Boolean);
  }

  function canCancelHistoryRun(run = {}) {
    return Boolean(run.id) && ["error", "blocked", "stopped"].includes(String(run.status || ""));
  }

  function historyStatusLabel(status) {
    return ({
      complete: "완료",
      running: "진행 중",
      waiting: "대기",
      error: "시스템 중단",
      blocked: "원고 완성 · 품질 보완 필요",
      canceled: "취소",
      stopped: "종료",
      hidden: "숨김",
      queued: "대기",
      retry_wait: "검수 재시도 대기"
    })[String(status || "")] || String(status || "확인 중");
  }

  function renderQueueLive(items, updatedAt) {
    const active = items.find((item) => item.status === "running") || null;
    selectors.queueLive.classList.toggle("is-idle", !active);
    selectors.queueLive.classList.remove("is-stale");
    selectors.queueLive.classList.remove("is-error");
    selectors.queueLive.replaceChildren();
    const copy = document.createElement("div");
    const label = document.createElement("span");
    const title = document.createElement("strong");
    const context = document.createElement("p");
    context.className = "queue-live-context";
    const meter = document.createElement("div");
    meter.className = "queue-live-meter";
    const fill = document.createElement("span");
    const detail = document.createElement("small");
    meter.append(fill);
    if (active) {
      const progress = productionProgressState(active);
      const schedule = active.scheduleId ? scheduleById.get(active.scheduleId) : null;
      label.textContent = "현재 제작 중";
      title.textContent = `${workDisplayTitle(active)} · ${progress.steps[progress.currentIndex]}`;
      context.textContent = schedule
        ? `‘${scheduleLabel(schedule)}’ 자동 연재 설정이 실행한 제작입니다.`
        : "작품 제작 대기열에서 처리 중입니다.";
      meter.style.setProperty("--progress", `${progress.percent}%`);
      meter.setAttribute("role", "progressbar");
      meter.setAttribute("aria-valuemin", "0");
      meter.setAttribute("aria-valuemax", "100");
      meter.setAttribute("aria-valuenow", String(progress.percent));
      detail.textContent = `${progress.percent}% · 경과 ${formatDuration(active.elapsedSeconds)} · ${formatRefreshTime(updatedAt)}`;
    } else {
      label.textContent = "현재 작업";
      title.textContent = "현재 제작 중인 작품이 없습니다.";
      context.textContent = "대기 작품은 아래에 따로 표시되며, 가동 중인 설정은 예약 시각에 새 작업을 요청합니다.";
      meter.style.setProperty("--progress", "0%");
      detail.textContent = `마지막 확인 ${formatRefreshTime(updatedAt)}`;
    }
    copy.append(label, title, context);
    selectors.queueLive.append(copy, meter, detail);
    if (active) {
      const actions = document.createElement("div");
      actions.className = "queue-live-actions";
      actions.append(actionButton("멈춘 단계 다시 시작", "secondary queue-retry", () => resumeQueue(active, { force: true })));
      selectors.queueLive.append(actions, renderProductionProgress(active));
    }
  }

  function markQueueRefreshFailure() {
    selectors.queueLive.classList.add("is-stale");
    const title = selectors.queueLive.querySelector("strong");
    const detail = selectors.queueLive.querySelector("small");
    if (title) title.textContent = "진행 정보를 새로 불러오지 못했습니다.";
    if (detail) detail.textContent = "서버 연결을 확인하는 중입니다. 다음 자동 갱신에서 다시 시도합니다.";
  }

  function failureLabel(code) {
    const key = String(code || "");
    const labels = {
      codex_auth_required: "AI 작성 서버 로그인이 필요합니다",
      codex_model_unavailable: "AI 작성 모델 연결 실패",
      codex_output_schema_invalid: "AI 작성 결과 형식 오류",
      codex_rate_limited: "AI 작성 사용량 제한 대기",
      review_api_422_serial_public_synopsis_meta_exposed: "독자용 작품 소개에 내부 기획 표현이 포함됨",
      review_api_422_serial_public_synopsis_sentence_count_invalid: "독자용 작품 소개의 문장 구성이 기준에 맞지 않음",
      review_api_422_serial_concept_synopsis_invalid: "독자용 작품 소개의 길이가 기준에 맞지 않음",
      review_api_422_serial_internal_planning_summary_invalid: "비공개 장기 기획 요약이 누락되거나 너무 짧음",
      review_api_422_serial_premise_matching_task_transfer_forbidden: "현실 작업과 이세계 역할이 그대로 겹치는 기획이라 재작성 필요",
      review_api_422_serial_premise_immediate_acceptance_forbidden: "낯선 주인공을 받아들이는 과정이 없어 기획 재작성 필요",
      review_api_422_serial_premise_name_leak_forbidden: "현지인이 이름을 알게 된 근거가 없어 기획 재작성 필요",
      review_api_422_serial_ability_trigger_too_complex: "능력 발동 방식이 지나치게 복잡해 기획 재작성 필요",
      review_api_422_serial_recent_template_forbidden: "최근 작품과 기획 뼈대가 겹쳐 새 기획이 필요",
      review_api_422_serial_recent_structure_too_similar: "최근 작품과 주인공·도입·전개 구조가 지나치게 비슷함",
      serial_job_attempts_exhausted: "재시도 횟수 초과",
      quality_threshold_not_met: "원고는 완성됐지만 일부 품질 기준이 남았습니다",
      review_api_500_server_error: "자동 검수 서버 오류",
      operator_schedule_deleted: "자동연재 설정 삭제",
      operator_hidden: "운영자 로그 숨김"
    };
    if (labels[key]) return labels[key];
    if (key.startsWith("review_api_422_serial_reader_appeal_")) return "주인공의 욕구·관계·초반 보상 기획이 부족함";
    if (key.startsWith("review_api_422_serial_recent_")) return "최근 작품과의 구조 비교 기준을 통과하지 못함";
    if (key.startsWith("review_api_422_serial_story_fingerprint_")) return "작품 구조 분류가 올바르지 않음";
    if (key.startsWith("review_api_422_serial_episode_reward_")) return "이번 회차의 독자 보상과 관계 변화 계획이 부족함";
    return "작업 오류";
  }

  function renderScheduleFailure(schedule, failedWork) {
    const wrapper = document.createElement("div");
    wrapper.className = "schedule-failure";
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    const detail = document.createElement("small");
    title.textContent = failedWork.attentionType === "quality_hold"
      ? "설정은 가동 중 · 최근 원고는 완성 후 품질 보완 필요"
      : "설정은 가동 중 · 최근 제작 시도는 중단";
    detail.textContent = failedWork.attentionType === "quality_hold"
      ? `원고는 보존돼 있으며 검수 사유를 확인한 뒤 추가 보완하거나 운영자 승인할 수 있습니다. · ${formatDate(failedWork.completedAt)}`
      : `${failureLabel(failedWork.failureCode)} · ${stageLabel(failedWork.stage)} · ${formatDate(failedWork.completedAt)}`;
    copy.append(title, detail);
    const action = failedWork.attentionType === "quality_hold" && failedWork.latestRunId
      ? actionButton("검수 결과 보기", "queue-retry", () => loadRun(failedWork.latestRunId))
      : actionButton("중단 지점부터 재개", "queue-retry", () => resumeQueue(failedWork));
    wrapper.append(copy, action);
    return wrapper;
  }

  async function resumeQueue(failedWork, options = {}) {
    if (!failedWork?.id) return retrySchedule(failedWork?.scheduleId);
    const force = options.force === true;
    if (force && !window.confirm("현재 작업이 실제로 멈춘 것을 확인했나요? 진행 중인 AI 작업이 살아 있다면 같은 단계가 한 번 더 실행될 수 있습니다.")) return;
    try {
      const result = await StoryHeavenCommon.api(`/api/storyheaven/operator/serial-engine/queue/${encodeURIComponent(failedWork.id)}/retry`, {
        method: "POST",
        body: { force }
      });
      await refreshSchedules();
      StoryHeavenCommon.toast(result.forceReleased
        ? "멈춘 단계의 잠금을 풀고 다시 대기열에 넣었습니다."
        : result.reused
          ? "대기 중인 단계를 지금 다시 확인하도록 요청했습니다."
          : "실패한 단계부터 작업을 재개했습니다.");
    } catch (error) {
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    }
  }

  async function retrySchedule(scheduleId) {
    const schedule = scheduleById.get(scheduleId);
    if (!schedule) return StoryHeavenCommon.toast("연결된 자동 연재 설정을 찾지 못했습니다.");
    try {
      const result = await StoryHeavenCommon.api(`/api/storyheaven/operator/serial-engine/schedules/${encodeURIComponent(scheduleId)}/run`, {
        method: "POST",
        body: {}
      });
      await refreshSchedules();
      StoryHeavenCommon.toast(result.run?.reused
        ? "이미 진행 중인 같은 작업으로 연결했습니다."
        : `‘${scheduleLabel(schedule)}’ 제작을 대기열에 다시 넣었습니다.`);
    } catch (error) {
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    }
  }

  function focusSchedule(scheduleId) {
    const row = [...selectors.scheduleList.querySelectorAll("[data-schedule-id]")]
      .find((item) => item.dataset.scheduleId === scheduleId);
    if (!row) return StoryHeavenCommon.toast("연결된 자동 연재 설정을 찾지 못했습니다.");
    row.scrollIntoView({ behavior: "smooth", block: "center" });
    row.classList.remove("is-focused");
    window.requestAnimationFrame(() => row.classList.add("is-focused"));
    window.setTimeout(() => row.classList.remove("is-focused"), 2_400);
  }

  function queueRow(item) {
    const row = document.createElement("article");
    row.className = `queue-row ${item.status}`;
    const position = document.createElement("span");
    position.className = "queue-position";
    position.textContent = item.status === "running" ? "제작 중" : `대기 ${item.queuePosition}번`;
    const copy = document.createElement("div");
    copy.className = "queue-copy";
    const title = document.createElement("strong");
    title.textContent = workDisplayTitle(item);
    const stage = document.createElement("p");
    stage.textContent = `${stageLabel(item.stage)} · AI 작업 ${item.completedJobs}/${Math.max(item.totalJobs, item.completedJobs)}회 · ${item.status === "running" ? `경과 ${formatDuration(item.elapsedSeconds)}` : `${formatDate(item.requestedAt)} 요청`}`;
    copy.append(title, stage);
    row.append(position, copy);
    const actions = document.createElement("div");
    actions.className = "queue-row-actions";
    if (item.status !== "running") {
      actions.append(actionButton("지금 재개", "queue-retry", () => resumeQueue(item)));
    }
    if (item.cancelable) {
      actions.append(actionButton("대기 취소", "secondary queue-cancel", () => cancelQueue(item)));
    }
    if (actions.childElementCount) row.append(actions);
    row.append(renderProductionProgress(item));
    return row;
  }

  function renderProductionProgress(item) {
    const state = productionProgressState(item);
    const section = document.createElement("section");
    section.className = "production-progress";
    section.setAttribute("aria-label", `${workDisplayTitle(item)} 제작 진행 상황`);

    const heading = document.createElement("div");
    heading.className = "production-progress-heading";
    const current = document.createElement("strong");
    current.textContent = item.status === "running"
      ? `현재 · ${state.steps[state.currentIndex]}`
      : `시작 예정 · ${state.steps[state.currentIndex]}`;
    const count = document.createElement("span");
    count.textContent = `${state.completedCount} / ${state.steps.length}단계 완료`;
    const percent = document.createElement("b");
    percent.className = "production-progress-percent";
    percent.textContent = `${state.percent}%`;
    heading.append(current, count, percent);

    const scroller = document.createElement("div");
    scroller.className = "production-track-scroller";
    const track = document.createElement("ol");
    track.className = "production-track";
    track.style.setProperty("--production-step-count", state.steps.length);
    state.steps.forEach((label, index) => {
      const step = document.createElement("li");
      const status = index < state.currentIndex
        ? "complete"
        : index === state.currentIndex
          ? (item.status === "running" ? "current" : "waiting")
          : "upcoming";
      step.className = `production-step is-${status}`;
      if (status === "current" || status === "waiting") step.setAttribute("aria-current", "step");
      const number = document.createElement("span");
      number.className = "production-step-number";
      number.textContent = String(index + 1).padStart(2, "0");
      const title = document.createElement("strong");
      title.textContent = label;
      const copy = document.createElement("small");
      copy.textContent = ({ complete: "완료", current: "진행 중", waiting: "대기", upcoming: "예정" })[status];
      step.append(number, title, copy);
      track.append(step);
    });
    scroller.append(track);

    const meter = document.createElement("progress");
    meter.className = "production-progress-meter";
    meter.max = 100;
    meter.value = state.percent;
    meter.setAttribute("aria-label", `${workDisplayTitle(item)} ${state.percent}% 진행`);
    meter.textContent = `${state.percent}%`;
    section.append(heading, scroller, meter);
    window.requestAnimationFrame(() => {
      const activeStep = track.children[state.currentIndex];
      if (!activeStep || scroller.scrollWidth <= scroller.clientWidth) return;
      scroller.scrollLeft = Math.max(0, activeStep.offsetLeft - ((scroller.clientWidth - activeStep.offsetWidth) / 2));
    });
    return section;
  }

  function productionProgressState(item) {
    const initialBatch = item.initialBatch === true || isPendingWorkTitle(item) || /^새 작품 ·/u.test(String(item.workLabel || ""));
    const bootstrapPlan = item.bootstrapPlan === true;
    const targetEpisodeCount = Math.max(1, Math.min(10, Number(item.targetEpisodeCount || 1)));
    const episodeSteps = Array.from({ length: targetEpisodeCount }, (_, index) => [
      `${installmentLabel(index + 1)} 구성`,
      `${installmentLabel(index + 1)} 원고`,
      `${installmentLabel(index + 1)} 검수`
    ]).flat();
    const steps = initialBatch
      ? ["아이디어", "설정집", "장기 전개", ...episodeSteps, "공개 준비"]
      : bootstrapPlan
        ? ["설정집", "장기 전개", "회차 구성", "원고 작성", "편집 검수", "공개 준비"]
        : ["회차 구성", "원고 작성", "편집 검수", "공개 준비"];
    const stage = String(item.stage || "queued");
    let currentIndex = 0;
    if (initialBatch) {
      if (stage === "build_bible") currentIndex = 1;
      else if (stage === "build_arc" || stage === "plan_complete") currentIndex = 2;
      else if (["build_episode_card", "write_draft", "editorial_review", "rewrite_draft", "editorial_blocked"].includes(stage)) {
        const episodeIndex = Math.min(targetEpisodeCount, Math.max(1, Number(item.episodeNo || 1))) - 1;
        const stageOffset = stage === "build_episode_card"
          ? 0
          : ["write_draft", "rewrite_draft"].includes(stage)
            ? 1
            : 2;
        currentIndex = 3 + (episodeIndex * 3) + stageOffset;
      } else if (["publication_ready", "published"].includes(stage)) currentIndex = steps.length - 1;
    } else if (bootstrapPlan) {
      if (stage === "build_arc" || stage === "plan_complete") currentIndex = 1;
      else if (stage === "build_episode_card") currentIndex = 2;
      else if (["write_draft", "rewrite_draft"].includes(stage)) currentIndex = 3;
      else if (["editorial_review", "editorial_blocked"].includes(stage)) currentIndex = 4;
      else if (["publication_ready", "published"].includes(stage)) currentIndex = 5;
    } else {
      if (["write_draft", "rewrite_draft"].includes(stage)) currentIndex = 1;
      else if (["editorial_review", "editorial_blocked"].includes(stage)) currentIndex = 2;
      else if (["publication_ready", "published"].includes(stage)) currentIndex = 3;
    }
    const fallbackPercent = Math.round(((currentIndex + (item.status === "running" ? 0.5 : 0)) / steps.length) * 100);
    const apiPercent = Number(item.progress?.percent);
    const percent = Number.isFinite(apiPercent) ? Math.max(0, Math.min(99, Math.round(apiPercent))) : fallbackPercent;
    return { steps, currentIndex, completedCount: currentIndex, percent };
  }

  function installmentLabel(internalEpisodeNo) {
    const number = Number(internalEpisodeNo);
    return number === 1 ? "프롤로그" : `본편 ${number - 1}화`;
  }

  function renderScheduleProgress(item) {
    const progress = productionProgressState(item);
    const wrapper = document.createElement("div");
    wrapper.className = "schedule-progress";
    const title = document.createElement("strong");
    title.textContent = `${item.status === "running" ? "제작 중" : `대기 ${item.queuePosition}번`} · ${progress.steps[progress.currentIndex]}`;
    const meter = document.createElement("div");
    meter.className = "schedule-progress-meter";
    meter.style.setProperty("--progress", `${progress.percent}%`);
    meter.setAttribute("role", "progressbar");
    meter.setAttribute("aria-valuemin", "0");
    meter.setAttribute("aria-valuemax", "100");
    meter.setAttribute("aria-valuenow", String(progress.percent));
    const fill = document.createElement("span");
    meter.append(fill);
    const copy = document.createElement("small");
    copy.textContent = `${progress.percent}%${item.status === "running" ? ` · ${formatDuration(item.elapsedSeconds)}` : ""}`;
    wrapper.append(title, meter, copy);
    return wrapper;
  }

  async function cancelQueue(item, options = {}) {
    const name = workDisplayTitle(item);
    if (!options.history && !window.confirm(`${name} 작업을 대기열에서 취소할까요? 이미 완료된 기록은 지우지 않습니다.`)) return;
    try {
      const result = await StoryHeavenCommon.api(`/api/storyheaven/operator/serial-engine/queue/${encodeURIComponent(item.id)}/cancel`, {
        method: "POST",
        body: {}
      });
      await refreshSchedules();
      StoryHeavenCommon.toast(result.historical ? "작업 로그에서 숨겼습니다." : "대기 작업을 취소했습니다.");
    } catch (error) {
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    }
  }

  async function hideHistoryRun(item) {
    const id = historyStorageId(item);
    if (!id) {
      StoryHeavenCommon.toast("숨길 로그를 식별할 수 없습니다. 화면을 새로고침한 뒤 다시 확인해주세요.");
      return;
    }
    locallyHiddenHistory.set(id, new Date().toISOString());
    persistHiddenHistory();
    showHiddenHistory = false;
    renderRunHistory(latestSerialSnapshot.queue?.history || [], latestSerialSnapshot.queue?.hiddenHistory || []);
    try {
      await StoryHeavenCommon.api(`/api/storyheaven/operator/serial-engine/queue/${encodeURIComponent(id)}/hide`, {
        method: "POST",
        body: {}
      });
      await refreshSchedules();
    } catch {
      // Browser-level hiding remains valid while an older API deployment lacks this route.
    }
  }

  function historyStorageId(item = {}) {
    return String(item.id || item.queueGroupId || "").trim();
  }

  function restoreHiddenHistory() {
    try {
      const stored = JSON.parse(localStorage.getItem(hiddenHistoryStorageKey) || "{}");
      if (!stored || typeof stored !== "object" || Array.isArray(stored)) return;
      for (const [id, hiddenAt] of Object.entries(stored)) {
        if (id) locallyHiddenHistory.set(id, String(hiddenAt || ""));
      }
    } catch {
      localStorage.removeItem(hiddenHistoryStorageKey);
    }
  }

  function persistHiddenHistory() {
    try {
      localStorage.setItem(hiddenHistoryStorageKey, JSON.stringify(Object.fromEntries(locallyHiddenHistory)));
    } catch {
      // In-memory hiding still works for the current page when browser storage is unavailable.
    }
  }

  async function processDue(event) {
    event.currentTarget.disabled = true;
    try {
      const payload = await StoryHeavenCommon.api("/api/storyheaven/operator/serial-engine/process", { method: "POST", body: {} });
      StoryHeavenCommon.toast(`새 기획 ${payload.scheduled?.length || 0}건, 공개 ${payload.published?.length || 0}건을 처리했습니다.`);
      await refreshSchedules();
    } catch (error) {
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    } finally {
      event.currentTarget.disabled = false;
    }
  }

  async function loadRunFromForm(event) {
    event.preventDefault();
    const id = new FormData(selectors.runSearch).get("runId").trim();
    if (id) await loadRun(id);
  }

  async function loadRun(id) {
    try {
      const payload = await StoryHeavenCommon.api(`/api/storyheaven/operator/serial-engine/runs/${encodeURIComponent(id)}`);
      selectors.runSearch.elements.runId.value = id;
      selectors.runState.replaceChildren(renderRun(payload));
      selectors.runState.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    }
  }

  function renderRun(payload) {
    const wrapper = document.createElement("article");
    wrapper.className = "run-report";
    const header = document.createElement("header");
    const title = document.createElement("h3");
    title.textContent = payload.run.episodeNo ? `${payload.run.episodeNo}화 · ${runStatus(payload.run)}` : runStatus(payload.run);
    const detail = document.createElement("p");
    detail.textContent = `단계 ${payload.run.stage} · 재작성 ${payload.run.rewriteCount}회`;
    header.append(title, detail);
    wrapper.append(header);

    const latestReview = payload.reviews?.at(-1);
    if (latestReview) wrapper.append(renderScoreBoard(latestReview, payload.run.quality?.decision?.readerExperienceScore, payload.metrics || []));

    const latestDraft = payload.drafts?.at(-1);
    if (latestDraft) {
      const draft = document.createElement("details");
      draft.className = "draft-copy";
      const summary = document.createElement("summary");
      summary.textContent = `원고 읽기 · ${latestDraft.title}`;
      const intro = document.createElement("p");
      intro.className = "draft-summary";
      intro.textContent = latestDraft.summary;
      const body = document.createElement("div");
      body.className = "draft-body";
      for (const paragraph of String(latestDraft.body || "").split(/\n{2,}/u).filter(Boolean)) {
        const line = document.createElement("p");
        line.textContent = paragraph;
        body.append(line);
      }
      draft.append(summary, intro, body);
      wrapper.append(draft);
    }

    if (payload.run.status === "blocked" && payload.run.stage === "editorial_blocked" && latestReview && latestDraft) {
      wrapper.append(renderQualityHoldActions(payload.run, latestReview));
    }

    const jobs = document.createElement("details");
    jobs.className = "advanced";
    const jobSummary = document.createElement("summary");
    jobSummary.textContent = "생성 단계 기록";
    const list = document.createElement("ol");
    for (const job of payload.jobs || []) {
      const item = document.createElement("li");
      item.textContent = `${stageLabel(job.type)} · ${historyStatusLabel(job.status)}${job.durationSeconds === null ? "" : ` · ${formatDuration(job.durationSeconds)}`}${job.attemptCount > 1 ? ` · ${job.attemptCount}회 시도` : ""}`;
      list.append(item);
    }
    jobs.append(jobSummary, list);
    wrapper.append(jobs);
    return wrapper;
  }

  function renderScoreBoard(review, weightedScore, metrics = []) {
    const section = document.createElement("section");
    section.className = "score-board";
    const heading = document.createElement("div");
    heading.className = "score-heading";
    const title = document.createElement("h4");
    title.textContent = "독자 체감 점검";
    const total = document.createElement("strong");
    total.textContent = weightedScore === undefined ? review.decision : `${weightedScore}점`;
    heading.append(title, total);
    section.append(heading);
    const summary = document.createElement("p");
    summary.className = "review-summary";
    summary.textContent = review.summary || "자동 편집 검수의 상세 설명이 없습니다.";
    section.append(summary);
    const metricByName = new Map(metrics.map((metric) => [metric.name, metric]));
    const grid = document.createElement("div");
    grid.className = "score-grid";
    for (const [key, score] of Object.entries(review.scores || {})) {
      const card = document.createElement("details");
      const metric = metricByName.get(key);
      card.classList.toggle("is-failed", metric?.passed === false);
      const summary = document.createElement("summary");
      const name = document.createElement("span");
      name.textContent = scoreLabel(key);
      const value = document.createElement("strong");
      value.textContent = metric ? `${score} / 기준 ${metric.threshold}` : String(score);
      summary.append(name, value);
      for (const evidence of review.scoreEvidence?.[key] || []) {
        const line = document.createElement("p");
        line.textContent = evidence;
        card.append(line);
      }
      card.prepend(summary);
      grid.append(card);
    }
    section.append(grid);

    if (Array.isArray(review.issues) && review.issues.length) {
      const issueSection = document.createElement("div");
      issueSection.className = "review-issues";
      const issueTitle = document.createElement("h5");
      issueTitle.textContent = review.decision === "blocked" ? "공개 보류 사유와 해결 방법" : "검수 메모";
      issueSection.append(issueTitle);
      for (const issue of review.issues) {
        const item = document.createElement("article");
        item.className = `review-issue is-${issue.severity || "info"}`;
        const name = document.createElement("strong");
        name.textContent = `${issueSeverityLabel(issue.severity)}${issue.sceneNo ? ` · 장면 ${issue.sceneNo}` : ""}`;
        const evidence = document.createElement("p");
        evidence.textContent = issue.evidence || issue.code || "검수 지적 사항";
        const suggestion = document.createElement("small");
        suggestion.textContent = `수정 제안 · ${issue.suggestion || "검수 요약에 맞춰 해당 부분을 보완합니다."}`;
        item.append(name, evidence, suggestion);
        issueSection.append(item);
      }
      section.append(issueSection);
    }

    const readers = document.createElement("div");
    readers.className = "audience-lenses";
    for (const lens of review.audienceLenses || []) {
      const card = document.createElement("article");
      const title = document.createElement("strong");
      title.textContent = lens.lens;
      const reaction = document.createElement("p");
      reaction.textContent = lens.reaction;
      const risk = document.createElement("small");
      risk.textContent = lens.dropRisk ? `이탈 위험: ${lens.dropRisk}` : lens.continueReason;
      card.append(title, reaction, risk);
      readers.append(card);
    }
    if (readers.childElementCount) section.append(readers);
    return section;
  }

  function renderQualityHoldActions(run, review) {
    const section = document.createElement("section");
    section.className = "quality-hold-actions";
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = "원고 작성은 끝났고, 회차 등록만 보류된 상태입니다.";
    const detail = document.createElement("p");
    detail.textContent = `자동 보완을 ${Number(run.rewriteCount || 0)}회 거쳤지만 위 기준이 남았습니다. 지적 부분만 한 번 더 보완하거나 현재 원고를 운영자 판단으로 승인할 수 있습니다.`;
    copy.append(title, detail);
    const actions = document.createElement("div");
    actions.append(actionButton("지적 부분 다시 보완", "queue-retry", () => resolveQualityHold({ latestRunId: run.id, schedule: scheduleById.get(run.scheduleId) }, "rewrite")));
    if (review.safetyPassed !== false) {
      actions.append(actionButton("현재 원고 승인", "warning", () => resolveQualityHold({ latestRunId: run.id, schedule: scheduleById.get(run.scheduleId), review }, "approve")));
    }
    section.append(copy, actions);
    return section;
  }

  function issueSeverityLabel(value) {
    return ({ critical: "반드시 수정", warning: "수정 권장", info: "후속 참고" })[value] || "검수 메모";
  }

  function badge(text, type) {
    const item = document.createElement("span");
    item.className = `status-badge ${type}`;
    item.textContent = text;
    return item;
  }

  function actionButton(text, className, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `button ${className}`.trim();
    button.textContent = text;
    button.addEventListener("click", async () => {
      button.disabled = true;
      try { await handler(); } finally { button.disabled = false; }
    });
    return button;
  }

  function genreLabel(id) {
    return window.StoryHeavenGenreCatalog?.[id]?.label || id;
  }

  function schedulePrimaryGenres(schedule) {
    return Array.isArray(schedule.primaryGenres) && schedule.primaryGenres.length
      ? schedule.primaryGenres
      : [schedule.primaryGenre].filter(Boolean);
  }

  function genreLabels(schedule) {
    return schedulePrimaryGenres(schedule).map(genreLabel);
  }

  function scheduleLabel(schedule) {
    return genreLabels(schedule).join(" × ") || "랜덤 장르";
  }

  function seriesPlanLabel(plan = {}) {
    const totalVolumes = Math.max(1, Math.round(Number(plan.totalVolumes || 10)));
    const episodesPerVolume = Math.max(1, Math.round(Number(plan.episodesPerVolume || 25)));
    return `${totalVolumes}권 × 권당 ${episodesPerVolume}화`;
  }

  function scheduleSubgenresByGenre(schedule) {
    if (schedule.subgenresByGenre && typeof schedule.subgenresByGenre === "object") return schedule.subgenresByGenre;
    return schedule.primaryGenre ? { [schedule.primaryGenre]: schedule.subgenres || [] } : {};
  }

  function readCadenceMinutes() {
    const valueInput = selectors.scheduleForm.elements.cadenceValue;
    const value = Number(valueInput.value);
    const unit = selectors.scheduleForm.elements.cadenceUnit.value;
    const minutes = Math.round(value * (unit === "hours" ? 60 : 1));
    valueInput.setCustomValidity(minutes < 15 || minutes > 10_080 ? "15분 이상 7일 이하로 설정해주세요." : "");
    if (!valueInput.reportValidity()) return null;
    return minutes;
  }

  function readTargetEpisodeCount() {
    const input = selectors.scheduleForm.elements.targetEpisodeCount;
    const value = Math.round(Number(input.value));
    input.setCustomValidity(value < 1 || value > 10 ? "1편 이상 10편 이하로 설정해주세요." : "");
    if (!input.reportValidity()) return null;
    return value;
  }

  function readSeriesPlan() {
    const totalInput = selectors.scheduleForm.elements.totalVolumes;
    const perVolumeInput = selectors.scheduleForm.elements.episodesPerVolume;
    const totalVolumes = Math.round(Number(totalInput.value));
    const episodesPerVolume = Math.round(Number(perVolumeInput.value));
    totalInput.setCustomValidity(totalVolumes < 1 || totalVolumes > 30 ? "1권 이상 30권 이하로 설정해주세요." : "");
    perVolumeInput.setCustomValidity(episodesPerVolume < 10 || episodesPerVolume > 50 ? "10화 이상 50화 이하로 설정해주세요." : "");
    if (!totalInput.reportValidity() || !perVolumeInput.reportValidity()) return null;
    return { totalVolumes, episodesPerVolume };
  }

  function readContinuationBatchCount() {
    const value = Number(selectors.scheduleForm.elements.continuationBatchCount.value || 1);
    return [1, 3, 5].includes(value) ? value : 1;
  }

  function updateTargetButton() {
    const input = selectors.scheduleForm?.elements.targetEpisodeCount;
    const button = selectors.scheduleForm?.querySelector("button[type='submit']");
    if (!input || !button) return;
    const value = Math.max(1, Math.min(10, Math.round(Number(input.value) || 1)));
    button.textContent = `${initialBatchText(value)} 제작을 대기열에 추가`;
  }

  function initialBatchText(value) {
    const count = Math.max(1, Math.min(10, Math.round(Number(value) || 1)));
    return count === 1 ? "프롤로그" : `프롤로그 + 본편 ${count - 1}화까지`;
  }

  function syncCadenceBounds() {
    const input = selectors.scheduleForm.elements.cadenceValue;
    const unit = selectors.scheduleForm.elements.cadenceUnit.value;
    input.min = unit === "hours" ? "1" : "15";
    input.max = unit === "hours" ? "168" : "10080";
    input.setCustomValidity("");
  }

  function cadenceFields(minutesValue) {
    const minutes = Number(minutesValue || 120);
    return minutes % 60 === 0
      ? { value: minutes / 60, unit: "hours" }
      : { value: minutes, unit: "minutes" };
  }

  function formatCadence(minutesValue) {
    const minutes = Number(minutesValue || 120);
    if (minutes % 1_440 === 0) return `${minutes / 1_440}일`;
    if (minutes % 60 === 0) return `${minutes / 60}시간`;
    return `${minutes}분`;
  }

  function queueDraftSave() {
    if (!draftReady) return;
    clearTimeout(draftSaveTimer);
    updateDraftStatus("저장 중");
    draftSaveTimer = setTimeout(saveDraftNow, 180);
  }

  function saveDraftNow() {
    if (!draftReady) return;
    clearTimeout(draftSaveTimer);
    const form = new FormData(selectors.scheduleForm);
    const primaryGenres = [...selectedPrimaryGenres];
    const payload = {
      version: 9,
      savedAt: new Date().toISOString(),
      primaryGenres,
      subgenresByGenre: Object.fromEntries(primaryGenres.map((genreId) => [
        genreId,
        [...(selectedSubgenresByGenre.get(genreId) || [])]
      ])),
      cadenceValue: String(form.get("cadenceValue") || "2"),
      cadenceUnit: String(form.get("cadenceUnit") || "hours"),
      targetEpisodeCount: String(form.get("targetEpisodeCount") || "1"),
      totalVolumes: String(form.get("totalVolumes") || "10"),
      episodesPerVolume: String(form.get("episodesPerVolume") || "25"),
      continuationBatchCount: String(form.get("continuationBatchCount") || "1"),
      publicationMode: String(form.get("publicationMode") || "test_private"),
      creativeControls: readCreativeControls(),
      conceptPolicy: String(form.get("conceptPolicy") || "")
    };
    try {
      localStorage.setItem(draftStorageKey, JSON.stringify(payload));
      restoredDraftAt = payload.savedAt;
      updateDraftStatus(`저장됨 ${formatDraftTime(payload.savedAt)}`);
    } catch {
      updateDraftStatus("이 브라우저에서는 자동 저장 불가");
    }
  }

  function restoreDraft() {
    let draft;
    try {
      const stored = localStorage.getItem(draftStorageKey)
        || legacyDraftStorageKeys.map((key) => localStorage.getItem(key)).find(Boolean)
        || "null";
      draft = JSON.parse(stored);
    } catch {
      return;
    }
    if (!draft || ![2, 3, 4, 5, 6, 7, 8, 9].includes(draft.version)) return;
    applyGenreSelection(draft.primaryGenres, draft.subgenresByGenre);
    if (draft.version < 5) {
      setFormValue("cadenceValue", "2");
      setFormValue("cadenceUnit", "hours");
    } else {
      setFormValue("cadenceValue", draft.cadenceValue);
      setFormValue("cadenceUnit", draft.cadenceUnit);
    }
    setFormValue("targetEpisodeCount", draft.targetEpisodeCount || 1);
    setFormValue("totalVolumes", draft.totalVolumes || 10);
    setFormValue("episodesPerVolume", draft.episodesPerVolume || 25);
    setFormValue("continuationBatchCount", draft.continuationBatchCount || 1);
    setFormValue("publicationMode", draft.publicationMode);
    applyCreativeControlsToForm(draft.creativeControls || {
      ...creativePresets.balanced,
      humor: draft.humorIntensity === "comedy-first" ? 5 : draft.humorIntensity === "balanced" ? 3 : 2,
      preset: "balanced"
    });
    setFormValue("conceptPolicy", normalizedConceptPolicy(draft.conceptPolicy));
    restoredDraftAt = draft.savedAt || "";
  }

  function normalizedConceptPolicy(value) {
    const policy = String(value || "").trim();
    return !policy || legacyConceptPolicies.has(policy) ? defaultConceptPolicy : policy;
  }

  function applyGenreSelection(primaryGenres, subgenresByGenre) {
    const catalog = window.StoryHeavenGenreCatalog || {};
    let genres = [...new Set((Array.isArray(primaryGenres) ? primaryGenres : [])
      .filter((genreId) => genreId === "random" || catalog[genreId]))].slice(0, primaryGenreLimit);
    if (genres.includes("random")) genres = ["random"];
    if (!genres.length) genres = ["fantasy"];
    selectedPrimaryGenres.clear();
    selectedSubgenresByGenre.clear();
    for (const genreId of genres) {
      selectedPrimaryGenres.add(genreId);
      if (genreId === "random") {
        selectedSubgenresByGenre.set(genreId, new Set(["random"]));
        continue;
      }
      const allowed = catalog[genreId]?.subgenres || {};
      let values = [...new Set((Array.isArray(subgenresByGenre?.[genreId]) ? subgenresByGenre[genreId] : [])
        .filter((subgenreId) => subgenreId === "random" || allowed[subgenreId]))];
      if (values.includes("random")) values = ["random"];
      selectedSubgenresByGenre.set(genreId, new Set(values));
      ensureSubgenreSelection(genreId);
    }
    trimSubgenreSelection();
  }

  function trimSubgenreSelection() {
    let remaining = subgenreLimit;
    const genres = [...selectedPrimaryGenres];
    genres.forEach((genreId, index) => {
      const values = [...(selectedSubgenresByGenre.get(genreId) || [])];
      const reservedForOthers = genres.length - index - 1;
      const kept = values.slice(0, Math.max(1, remaining - reservedForOthers));
      selectedSubgenresByGenre.set(genreId, new Set(kept));
      remaining -= kept.length;
    });
  }

  function setFormValue(name, value) {
    if (value === undefined || value === null) return;
    const control = selectors.scheduleForm.elements[name];
    if (!control) return;
    control.value = String(value);
  }

  function applyCreativeControlsToForm(values = {}) {
    for (const [key, fieldName] of Object.entries(creativeFields)) {
      setFormValue(fieldName, values[key] ?? creativePresets.balanced[key]);
    }
    setCreativePreset(values.preset || "custom");
    renderCreativeControls();
  }

  function loadScheduleIntoForm(schedule) {
    applyGenreSelection(schedulePrimaryGenres(schedule), scheduleSubgenresByGenre(schedule));
    const cadence = cadenceFields(schedule.cadenceMinutes);
    setFormValue("cadenceValue", cadence.value);
    setFormValue("cadenceUnit", cadence.unit);
    setFormValue("targetEpisodeCount", schedule.targetEpisodeCount || 1);
    setFormValue("totalVolumes", schedule.seriesPlan?.totalVolumes || 10);
    setFormValue("episodesPerVolume", schedule.seriesPlan?.episodesPerVolume || 25);
    setFormValue("continuationBatchCount", schedule.continuationBatchCount || 1);
    setFormValue("publicationMode", schedule.publicationMode);
    applyCreativeControlsToForm(schedule.creativeControls || { ...creativePresets.balanced, preset: "balanced" });
    setFormValue("conceptPolicy", normalizedConceptPolicy(schedule.conceptPolicy));
    renderPrimaryGenres();
    renderSubgenres();
    syncCadenceBounds();
    updateTargetButton();
    renderCreativeControls();
    saveDraftNow();
    selectors.scheduleForm.scrollIntoView({ behavior: "smooth", block: "start" });
    selectors.primaryGenres.querySelector("input:checked")?.focus({ preventScroll: true });
    StoryHeavenCommon.toast("기존 설정을 새 연재 입력란에 불러왔습니다.");
  }

  function resetDraft() {
    selectors.scheduleForm.reset();
    selectedPrimaryGenres.clear();
    selectedSubgenresByGenre.clear();
    selectDefaultGenre();
    renderPrimaryGenres();
    renderSubgenres();
    syncCadenceBounds();
    updateTargetButton();
    applyCreativePreset("balanced");
    saveDraftNow();
    selectors.primaryGenres.querySelector("input:checked")?.focus();
    StoryHeavenCommon.toast("새 연재 기본값으로 돌아왔습니다.");
  }

  function updateDraftStatus(value) {
    if (selectors.draftStatus) selectors.draftStatus.textContent = value;
  }

  function startSeoulClock() {
    updateSeoulClock();
    if (clockTimer) window.clearInterval(clockTimer);
    clockTimer = window.setInterval(updateSeoulClock, 1000);
  }

  function syncServerClock(value) {
    const serverTime = serialTime(value);
    if (Number.isFinite(serverTime)) serverClockOffsetMs = serverTime - Date.now();
  }

  function serialNow() {
    return Date.now() + serverClockOffsetMs;
  }

  function updateSeoulClock() {
    if (!selectors.systemClock) return;
    selectors.systemClock.textContent = `현재 ${formatSeoulClock(serialNow())}`;
    selectors.systemClock.title = "서버 응답 시각을 기준으로 보정한 대한민국 서울 현재 시각입니다.";
  }

  function parseSerialDate(value) {
    if (!value) return null;
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    let text = normalizeSerialDateText(value);
    if (!text) return null;
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function normalizeSerialDateText(value) {
    let text = String(value || "").trim();
    if (!text) return "";
    text = text.replace(/\s+/gu, " ");
    if (/^\d{4}-\d{2}-\d{2}$/u.test(text)) text = `${text}T00:00:00`;
    text = text.replace(/^(\d{4}-\d{2}-\d{2})\s/u, "$1T");
    text = text.replace(/\s+([+-]\d{2}:?\d{2}|Z)$/iu, "$1");
    text = text.replace(/([+-]\d{2}):?(\d{2})$/u, "$1:$2");
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?$/u.test(text)) text = `${text}+09:00`;
    return text;
  }

  function serialTime(value) {
    const date = parseSerialDate(value);
    return date ? date.getTime() : Number.NaN;
  }

  function formatDraftTime(value) {
    const date = parseSerialDate(value);
    if (!date) return "";
    return new Intl.DateTimeFormat("ko-KR", {
      timeZone: seoulTimeZone,
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function subgenreLabels(schedule) {
    const byGenre = scheduleSubgenresByGenre(schedule);
    return schedulePrimaryGenres(schedule).flatMap((genreId) => {
      const catalog = window.StoryHeavenGenreCatalog?.[genreId]?.subgenres || {};
      return (byGenre[genreId] || []).map((id) => catalog[id] || id);
    });
  }

  function humorLabel(value) {
    return ({ light: "미소 중심", balanced: "균형", "comedy-first": "웃음 우선" })[value] || "미소 중심";
  }

  function stageLabel(value) {
    return ({
      concept_gate: "작품 아이디어 검토",
      build_bible: "세계관과 인물 설정",
      architecture_complete: "장편 설계 완료",
      build_arc: "장기 전개 설계",
      build_episode_card: "회차 장면 구성",
      write_draft: "원고 작성",
      editorial_review: "편집 검수",
      editorial_blocked: "원고 완성 · 품질 보완 필요",
      rewrite_draft: "원고 보완",
      schedule_deleted: "자동연재 설정 삭제",
      history_hidden: "로그 숨김",
      queued: "작업 준비"
    })[value] || "작업 준비";
  }

  function formatDuration(secondsValue) {
    if (secondsValue === null || secondsValue === undefined || secondsValue === "") return "측정 중";
    const seconds = Math.max(0, Math.round(Number(secondsValue)));
    if (!Number.isFinite(seconds)) return "측정 중";
    if (seconds < 60) return `${seconds}초`;
    const minutes = Math.floor(seconds / 60);
    const secondsRest = seconds % 60;
    if (minutes < 60) return secondsRest ? `${minutes}분 ${secondsRest}초` : `${minutes}분`;
    const hours = Math.floor(minutes / 60);
    const minutesRest = minutes % 60;
    return minutesRest ? `${hours}시간 ${minutesRest}분` : `${hours}시간`;
  }

  function formatRefreshTime(value) {
    const date = value ? parseSerialDate(value) : new Date();
    if (!date) return "방금 갱신";
    return `${new Intl.DateTimeFormat("ko-KR", {
      timeZone: seoulTimeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(date)} (서울) 기준`;
  }

  function formatSeoulClock(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "서울 시각 확인 중";
    return `${new Intl.DateTimeFormat("ko-KR", {
      timeZone: seoulTimeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(date)} (서울)`;
  }

  function runStatus(run) {
    return ({ queued: "대기 중", running: "작성 중", rewrite: "다듬는 중", ready: "검수 통과", blocked: "원고 완성 · 품질 보완 필요", published: "공개됨", error: "시스템 오류" })[run.status] || run.status;
  }

  function scoreLabel(key) {
    return ({ koreanReadability: "한국어 문장", canonConsistency: "설정 일관성", causality: "인과관계", readerOrientation: "독자 안내", sceneVisualization: "장면 가시성", openingGrip: "초반 흡입력", narrativeMomentum: "전개 추진력", emotionalPayoff: "감정 보상", genrePromise: "장르 만족", curiosityAndHook: "다음 화 궁금증", characterAgency: "주인공의 능동성", characterAttachment: "인물 애착", relationshipMomentum: "관계 변화", readerReward: "회차 보상", premiseAccessibility: "설정 이해도", novelty: "참신성" })[key] || key;
  }

  function message(text) {
    const element = document.createElement("p");
    element.className = "empty-message";
    element.textContent = text;
    return element;
  }

  function formatDate(value) {
    if (!value) return "미정";
    const date = parseSerialDate(value);
    if (!date) return "미정";
    const formatted = new Intl.DateTimeFormat("ko-KR", {
      timeZone: seoulTimeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
    return `${formatted} (서울)`;
  }
})();
