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
    humor: "creativeHumor"
  });
  const creativePresets = Object.freeze({
    balanced: Object.freeze({ pace: 3, suspense: 3, curiosity: 4, surprise: 3, emotion: 3, romance: 2, action: 3, description: 3, humor: 2 }),
    fast: Object.freeze({ pace: 5, suspense: 4, curiosity: 4, surprise: 3, emotion: 3, romance: 1, action: 4, description: 2, humor: 2 }),
    emotional: Object.freeze({ pace: 2, suspense: 2, curiosity: 3, surprise: 2, emotion: 5, romance: 4, action: 1, description: 4, humor: 2 })
  });
  const draftStorageKey = "storyheaven.operator.serial-draft.v6";
  const legacyDraftStorageKeys = ["storyheaven.operator.serial-draft.v5", "storyheaven.operator.serial-draft.v4", "storyheaven.operator.serial-draft.v3", "storyheaven.operator.serial-draft.v2"];
  let draftReady = false;
  let draftSaveTimer = 0;
  let restoredDraftAt = "";
  let queueRefreshTimer = 0;

  document.addEventListener("DOMContentLoaded", async () => {
    cache();
    restoreDraft();
    renderPrimaryGenres();
    renderSubgenres();
    bind();
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
    selectors.scheduleForm = document.querySelector("[data-schedule-form]");
    selectors.scheduleList = document.querySelector("[data-schedule-list]");
    selectors.queueList = document.querySelector("[data-queue-list]");
    selectors.attentionList = document.querySelector("[data-attention-list]");
    selectors.completedList = document.querySelector("[data-completed-list]");
    selectors.completedCaption = document.querySelector("[data-completed-caption]");
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
    document.querySelector("[data-process-due]").addEventListener("click", processDue);
    document.querySelector("[data-reset-draft]").addEventListener("click", resetDraft);
    selectors.scheduleForm.elements.cadenceUnit.addEventListener("change", syncCadenceBounds);
    selectors.scheduleForm.elements.targetEpisodeCount.addEventListener("input", updateTargetButton);
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
      }, 6_000);
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
    return entries.length ? entries.map(([label, value]) => `${label} ${value}`).join(" · ") : "균형";
  }

  function humorIntensityFromControls(values) {
    if (Number(values?.humor) >= 4) return "comedy-first";
    if (Number(values?.humor) >= 3) return "balanced";
    return "light";
  }

  async function refreshSchedules() {
    const payload = await StoryHeavenCommon.api("/api/storyheaven/operator/serial-engine/schedules");
    const pollSeconds = Math.max(1, Number(payload.pollSeconds) || 60);
    selectors.engineState.textContent = payload.enabled
      ? `자동 연재 연결됨 · ${pollSeconds}초마다 예약 확인`
      : "자동 연재 서버 멈춤";
    const queue = payload.queue || {};
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
    detail.textContent = `${subgenreLabels(schedule).join(" · ")} · 강도 ${creativeControlSummary(controls)} · ${schedule.targetEpisodeCount || 1}화까지 완성 뒤 ${formatCadence(schedule.cadenceMinutes)} 대기`;
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
        ? `랜덤 장르의 ${targetEpisodeCount}화까지 제작을 대기열에 넣었습니다.`
        : `${targetEpisodeCount}화까지 제작을 대기열에 넣었습니다.`);
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
    renderCompleted(completed);
    selectors.queueNote.textContent = "진행 상황은 6초마다 갱신됩니다. 이전 오류는 현재 작업과 분리해 기록으로만 보관합니다.";
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
    renderRunHistory(queue.history || []);
  }

  function renderStatusCounts(counts, running, waiting, completed, attention) {
    selectors.statusRunning.textContent = String(Number(counts.running ?? running));
    selectors.statusWaiting.textContent = String(Number(counts.waiting ?? waiting));
    selectors.statusComplete.textContent = String(Number(counts.complete ?? completed));
    selectors.statusAttention.textContent = String(Number(counts.attention ?? attention));
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
      title.textContent = item.title && item.title !== "새 작품 기획" ? item.title : item.workLabel;
      detail.textContent = `${stageLabel(item.stage)}에서 멈춤 · ${formatDate(item.completedAt || item.requestedAt)} · ${failureLabel(item.failureCode)}`;
      copy.append(title, detail);
      const actions = document.createElement("div");
      actions.className = "attention-actions";
      actions.append(actionButton("중단 지점부터 재개", "queue-retry", () => resumeQueue(item)));
      if (item.scheduleId) actions.append(actionButton("연결 설정 보기", "secondary", () => focusSchedule(item.scheduleId)));
      row.append(copy, actions);
      selectors.attentionList.append(row);
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
      title.textContent = item.title && item.title !== "새 작품 기획" ? item.title : item.workLabel;
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

  function renderRunHistory(history) {
    selectors.runHistory.replaceChildren();
    const completeCount = history.filter((item) => item.status === "complete").length;
    const issueCount = history.filter((item) => item.status === "error").length;
    selectors.historySummary.textContent = `이전 실행 기록 · 완료 ${completeCount} · 과거 중단 ${issueCount}`;
    if (!history.length) {
      selectors.runHistory.append(message("아직 기록된 자동 연재 실행이 없습니다."));
      return;
    }
    for (const run of history) {
      const item = document.createElement("article");
      item.className = `run-history-item is-${run.status}`;
      const header = document.createElement("div");
      const title = document.createElement("strong");
      const meta = document.createElement("span");
      title.textContent = run.workLabel || run.title;
      meta.textContent = `${historyStatusLabel(run.status)} · ${formatDuration(run.elapsedSeconds)} · ${formatDate(run.completedAt || run.startedAt || run.requestedAt)}`;
      header.append(title, meta);
      item.append(header);

      const timings = Array.isArray(run.stageTimings) ? run.stageTimings : [];
      if (timings.length) {
        const details = document.createElement("details");
        const summary = document.createElement("summary");
        summary.textContent = `단계별 시간 ${timings.length}건`;
        const list = document.createElement("ol");
        list.className = "stage-timing-list";
        for (const timing of timings) {
          const row = document.createElement("li");
          const label = document.createElement("span");
          const value = document.createElement("b");
          label.textContent = `${timing.episodeNo ? `${timing.episodeNo}화 · ` : ""}${stageLabel(timing.type)}`;
          value.textContent = timing.durationSeconds === null
            ? historyStatusLabel(timing.status)
            : formatDuration(timing.durationSeconds);
          row.append(label, value);
          list.append(row);
        }
        details.append(summary, list);
        item.append(details);
      }
      selectors.runHistory.append(item);
    }
  }

  function historyStatusLabel(status) {
    return ({
      complete: "완료",
      running: "진행 중",
      waiting: "대기",
      error: "중단",
      canceled: "취소",
      stopped: "종료",
      queued: "대기",
      retry_wait: "재시도 대기"
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
      title.textContent = `${active.workLabel || active.title} · ${progress.steps[progress.currentIndex]}`;
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
    if (active) selectors.queueLive.append(renderProductionProgress(active));
  }

  function markQueueRefreshFailure() {
    selectors.queueLive.classList.add("is-stale");
    const title = selectors.queueLive.querySelector("strong");
    const detail = selectors.queueLive.querySelector("small");
    if (title) title.textContent = "진행 정보를 새로 불러오지 못했습니다.";
    if (detail) detail.textContent = "서버 연결을 확인하는 중입니다. 다음 자동 갱신에서 다시 시도합니다.";
  }

  function failureLabel(code) {
    return ({
      codex_auth_required: "Codex 로그인이 필요합니다",
      codex_model_unavailable: "Codex 모델 연결 실패",
      codex_output_schema_invalid: "Codex 결과 형식 오류",
      codex_rate_limited: "Codex 사용량 제한 대기",
      serial_job_attempts_exhausted: "재시도 횟수 초과"
    })[String(code || "")] || "작업 오류";
  }

  function renderScheduleFailure(schedule, failedWork) {
    const wrapper = document.createElement("div");
    wrapper.className = "schedule-failure";
    const copy = document.createElement("div");
    const title = document.createElement("strong");
    const detail = document.createElement("small");
    title.textContent = `설정은 가동 중 · 최근 제작 시도는 중단`;
    detail.textContent = `${failureLabel(failedWork.failureCode)} · ${stageLabel(failedWork.stage)} · ${formatDate(failedWork.completedAt)}`;
    copy.append(title, detail);
    wrapper.append(copy, actionButton("중단 지점부터 재개", "queue-retry", () => resumeQueue(failedWork)));
    return wrapper;
  }

  async function resumeQueue(failedWork) {
    if (!failedWork?.id) return retrySchedule(failedWork?.scheduleId);
    try {
      const result = await StoryHeavenCommon.api(`/api/storyheaven/operator/serial-engine/queue/${encodeURIComponent(failedWork.id)}/retry`, {
        method: "POST",
        body: {}
      });
      await refreshSchedules();
      StoryHeavenCommon.toast(result.reused
        ? "이미 재개된 작업을 계속 진행하고 있습니다."
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
    title.textContent = item.workLabel || item.title;
    const stage = document.createElement("p");
    stage.textContent = `${stageLabel(item.stage)} · AI 작업 ${item.completedJobs}/${Math.max(item.totalJobs, item.completedJobs)}회 · ${item.status === "running" ? `경과 ${formatDuration(item.elapsedSeconds)}` : `${formatDate(item.requestedAt)} 요청`}`;
    copy.append(title, stage);
    row.append(position, copy);
    if (item.cancelable) {
      row.append(actionButton("대기 취소", "secondary queue-cancel", () => cancelQueue(item)));
    }
    row.append(renderProductionProgress(item));
    return row;
  }

  function renderProductionProgress(item) {
    const state = productionProgressState(item);
    const section = document.createElement("section");
    section.className = "production-progress";
    section.setAttribute("aria-label", `${item.workLabel || item.title} 제작 진행 상황`);

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
    meter.setAttribute("aria-label", `${item.workLabel || item.title} ${state.percent}% 진행`);
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
    const initialBatch = item.initialBatch === true || /^새 작품 ·/u.test(String(item.workLabel || ""));
    const bootstrapPlan = item.bootstrapPlan === true;
    const targetEpisodeCount = Math.max(1, Math.min(10, Number(item.targetEpisodeCount || 1)));
    const episodeSteps = Array.from({ length: targetEpisodeCount }, (_, index) => [
      `${index + 1}화 구성`,
      `${index + 1}화 원고`,
      `${index + 1}화 검수`
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

  async function cancelQueue(item) {
    if (!window.confirm(`${item.workLabel || item.title} 작업을 대기열에서 취소할까요? 이미 완료된 기록은 지우지 않습니다.`)) return;
    try {
      await StoryHeavenCommon.api(`/api/storyheaven/operator/serial-engine/queue/${encodeURIComponent(item.id)}/cancel`, {
        method: "POST",
        body: {}
      });
      await refreshSchedules();
      StoryHeavenCommon.toast("대기 작업을 취소했습니다.");
    } catch (error) {
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
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
    if (latestReview) wrapper.append(renderScoreBoard(latestReview, payload.run.quality?.decision?.readerExperienceScore));

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

  function renderScoreBoard(review, weightedScore) {
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
    const grid = document.createElement("div");
    grid.className = "score-grid";
    for (const [key, score] of Object.entries(review.scores || {})) {
      const card = document.createElement("details");
      const summary = document.createElement("summary");
      const name = document.createElement("span");
      name.textContent = scoreLabel(key);
      const value = document.createElement("strong");
      value.textContent = score;
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
    input.setCustomValidity(value < 1 || value > 10 ? "1화 이상 10화 이하로 설정해주세요." : "");
    if (!input.reportValidity()) return null;
    return value;
  }

  function updateTargetButton() {
    const input = selectors.scheduleForm?.elements.targetEpisodeCount;
    const button = selectors.scheduleForm?.querySelector("button[type='submit']");
    if (!input || !button) return;
    const value = Math.max(1, Math.min(10, Math.round(Number(input.value) || 1)));
    button.textContent = `${value}화까지 제작을 대기열에 추가`;
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
      version: 6,
      savedAt: new Date().toISOString(),
      primaryGenres,
      subgenresByGenre: Object.fromEntries(primaryGenres.map((genreId) => [
        genreId,
        [...(selectedSubgenresByGenre.get(genreId) || [])]
      ])),
      cadenceValue: String(form.get("cadenceValue") || "2"),
      cadenceUnit: String(form.get("cadenceUnit") || "hours"),
      targetEpisodeCount: String(form.get("targetEpisodeCount") || "1"),
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
    if (!draft || ![2, 3, 4, 5, 6].includes(draft.version)) return;
    applyGenreSelection(draft.primaryGenres, draft.subgenresByGenre);
    if (draft.version < 5) {
      setFormValue("cadenceValue", "2");
      setFormValue("cadenceUnit", "hours");
    } else {
      setFormValue("cadenceValue", draft.cadenceValue);
      setFormValue("cadenceUnit", draft.cadenceUnit);
    }
    setFormValue("targetEpisodeCount", draft.targetEpisodeCount || 1);
    setFormValue("publicationMode", draft.publicationMode);
    applyCreativeControlsToForm(draft.creativeControls || {
      ...creativePresets.balanced,
      humor: draft.humorIntensity === "comedy-first" ? 5 : draft.humorIntensity === "balanced" ? 3 : 2,
      preset: "balanced"
    });
    setFormValue("conceptPolicy", draft.conceptPolicy);
    restoredDraftAt = draft.savedAt || "";
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
    setFormValue("publicationMode", schedule.publicationMode);
    applyCreativeControlsToForm(schedule.creativeControls || { ...creativePresets.balanced, preset: "balanced" });
    setFormValue("conceptPolicy", schedule.conceptPolicy);
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

  function formatDraftTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
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
      build_arc: "장기 전개 설계",
      build_episode_card: "회차 장면 구성",
      write_draft: "원고 작성",
      editorial_review: "편집 검수",
      rewrite_draft: "원고 보완",
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
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return "방금 갱신";
    return `${new Intl.DateTimeFormat("ko-KR", {
      timeZone: seoulTimeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(date)} (서울) 기준`;
  }

  function runStatus(run) {
    return ({ queued: "대기 중", running: "작성 중", rewrite: "다듬는 중", ready: "검수 통과", blocked: "품질 미달", published: "공개됨", error: "오류" })[run.status] || run.status;
  }

  function scoreLabel(key) {
    return ({ koreanReadability: "한국어 문장", canonConsistency: "설정 일관성", causality: "인과관계", sceneVisualization: "장면 가시성", openingGrip: "초반 흡입력", narrativeMomentum: "전개 추진력", emotionalPayoff: "감정 보상", genrePromise: "장르 만족", curiosityAndHook: "다음 화 궁금증", characterAgency: "주인공의 능동성", novelty: "참신성" })[key] || key;
  }

  function message(text) {
    const element = document.createElement("p");
    element.className = "empty-message";
    element.textContent = text;
    return element;
  }

  function formatDate(value) {
    if (!value) return "미정";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "미정";
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
