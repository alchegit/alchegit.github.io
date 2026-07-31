(() => {
  const selectors = {};
  const scheduleById = new Map();
  const selectedPrimaryGenres = new Set(["fantasy"]);
  const selectedSubgenresByGenre = new Map([["fantasy", new Set(["modern-fantasy"])] ]);
  const primaryGenreLimit = 3;
  const subgenreLimit = 10;
  const draftStorageKey = "storyheaven.operator.serial-draft.v2";
  let draftReady = false;
  let draftSaveTimer = 0;
  let restoredDraftAt = "";

  document.addEventListener("DOMContentLoaded", async () => {
    cache();
    restoreDraft();
    renderPrimaryGenres();
    renderSubgenres();
    bind();
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
    selectors.primaryGenres = document.querySelector("[data-primary-genres]");
    selectors.subgenres = document.querySelector("[data-subgenres]");
    selectors.subgenreCount = document.querySelector("[data-subgenre-count]");
    selectors.subgenreHelp = document.querySelector("[data-subgenre-help]");
    selectors.humorControl = document.querySelector("[data-humor-control]");
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
  }

  async function onAuth(auth) {
    if (!auth.session) return showAccess();
    try {
      await refreshSchedules();
      selectors.gate.hidden = true;
      selectors.dashboard.hidden = false;
    } catch (error) {
      showAccess();
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    }
  }

  function showAccess() {
    selectors.gate.hidden = false;
    selectors.dashboard.hidden = true;
    selectors.engineState.textContent = "관리자 확인 필요";
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
    selectors.humorControl.hidden = !selectedPrimaryGenres.has("comedy");
  }

  async function refreshSchedules() {
    const payload = await StoryHeavenCommon.api("/api/storyheaven/operator/serial-engine/schedules");
    selectors.engineState.textContent = payload.enabled ? "자동 연재 연결됨" : "자동 연재 멈춤";
    scheduleById.clear();
    for (const schedule of payload.schedules || []) scheduleById.set(schedule.id, schedule);
    selectors.scheduleList.replaceChildren(...(payload.schedules || []).map(scheduleRow));
    if (!payload.schedules?.length) selectors.scheduleList.append(message("아직 시작한 자동 연재가 없습니다."));
  }

  function scheduleRow(schedule) {
    const row = document.createElement("article");
    row.className = "schedule-row";
    const copy = document.createElement("div");
    const heading = document.createElement("div");
    heading.className = "schedule-heading";
    const title = document.createElement("strong");
    title.textContent = schedule.name;
    const status = badge(schedule.status === "active" ? "가동 중" : "멈춤", schedule.status);
    const mode = badge(schedule.publicationMode === "auto_public" ? "자동 공개" : "테스트 비공개", schedule.publicationMode);
    heading.append(title, status, mode);
    const detail = document.createElement("p");
    const humor = schedulePrimaryGenres(schedule).includes("comedy") ? ` · 웃음 ${schedule.humorLabel || humorLabel(schedule.humorIntensity)}` : "";
    detail.textContent = `${genreLabels(schedule).join(" × ")} · ${subgenreLabels(schedule).join(" · ")}${humor} · ${schedule.cadenceDays}일마다 새 작품 기획`;
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
      await StoryHeavenCommon.api("/api/storyheaven/operator/serial-engine/schedules", {
        method: "POST",
        body: {
          name: form.get("name"),
          primaryGenre: primaryGenres[0],
          primaryGenres,
          subgenres,
          subgenresByGenre,
          publicationMode: form.get("publicationMode"),
          cadenceDays: Number(form.get("cadenceDays")),
          maxActiveSerials: Number(form.get("maxActiveSerials")),
          humorIntensity: selectors.humorControl.hidden ? "light" : form.get("humorIntensity"),
          targetAge: "teen",
          status: "active",
          conceptPolicy: form.get("conceptPolicy")
        }
      });
      await refreshSchedules();
      saveDraftNow();
      StoryHeavenCommon.toast(selectedPrimaryGenres.has("random") || subgenres.includes("random")
        ? "랜덤 장르를 확정하고 자동 연재를 시작했습니다."
        : "자동 연재를 시작했습니다.");
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
          name: schedule.name,
          primaryGenre: schedule.primaryGenre,
          primaryGenres: schedulePrimaryGenres(schedule),
          subgenres: schedule.subgenres,
          subgenresByGenre: scheduleSubgenresByGenre(schedule),
          publicationMode: schedule.publicationMode,
          cadenceDays: schedule.cadenceDays,
          maxActiveSerials: schedule.maxActiveSerials,
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
      item.textContent = `${job.type} · ${job.status}${job.attemptCount > 1 ? ` · ${job.attemptCount}회 시도` : ""}`;
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

  function scheduleSubgenresByGenre(schedule) {
    if (schedule.subgenresByGenre && typeof schedule.subgenresByGenre === "object") return schedule.subgenresByGenre;
    return schedule.primaryGenre ? { [schedule.primaryGenre]: schedule.subgenres || [] } : {};
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
      version: 2,
      savedAt: new Date().toISOString(),
      primaryGenres,
      subgenresByGenre: Object.fromEntries(primaryGenres.map((genreId) => [
        genreId,
        [...(selectedSubgenresByGenre.get(genreId) || [])]
      ])),
      name: String(form.get("name") || ""),
      cadenceDays: String(form.get("cadenceDays") || "7"),
      maxActiveSerials: String(form.get("maxActiveSerials") || "6"),
      publicationMode: String(form.get("publicationMode") || "test_private"),
      humorIntensity: String(form.get("humorIntensity") || "balanced"),
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
      draft = JSON.parse(localStorage.getItem(draftStorageKey) || "null");
    } catch {
      return;
    }
    if (!draft || draft.version !== 2) return;
    applyGenreSelection(draft.primaryGenres, draft.subgenresByGenre);
    setFormValue("name", draft.name);
    setFormValue("cadenceDays", draft.cadenceDays);
    setFormValue("maxActiveSerials", draft.maxActiveSerials);
    setFormValue("publicationMode", draft.publicationMode);
    setFormValue("humorIntensity", draft.humorIntensity);
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

  function loadScheduleIntoForm(schedule) {
    applyGenreSelection(schedulePrimaryGenres(schedule), scheduleSubgenresByGenre(schedule));
    setFormValue("name", `${schedule.name} 복사`);
    setFormValue("cadenceDays", schedule.cadenceDays);
    setFormValue("maxActiveSerials", schedule.maxActiveSerials);
    setFormValue("publicationMode", schedule.publicationMode);
    setFormValue("humorIntensity", schedule.humorIntensity || "balanced");
    setFormValue("conceptPolicy", schedule.conceptPolicy);
    renderPrimaryGenres();
    renderSubgenres();
    saveDraftNow();
    selectors.scheduleForm.scrollIntoView({ behavior: "smooth", block: "start" });
    selectors.scheduleForm.elements.name.focus({ preventScroll: true });
    selectors.scheduleForm.elements.name.select();
    StoryHeavenCommon.toast("기존 설정을 새 연재 입력란에 불러왔습니다.");
  }

  function resetDraft() {
    selectors.scheduleForm.reset();
    selectedPrimaryGenres.clear();
    selectedSubgenresByGenre.clear();
    selectDefaultGenre();
    renderPrimaryGenres();
    renderSubgenres();
    saveDraftNow();
    selectors.scheduleForm.elements.name.focus();
    StoryHeavenCommon.toast("새 연재 기본값으로 돌아왔습니다.");
  }

  function updateDraftStatus(value) {
    if (selectors.draftStatus) selectors.draftStatus.textContent = value;
  }

  function formatDraftTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
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
    return new Intl.DateTimeFormat("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  }
})();
