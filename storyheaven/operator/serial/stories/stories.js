(() => {
  const state = { stories: [], enabled: false };
  const elements = {};
  const visibilityLabels = { public: "공개", private: "비공개", archived: "보관" };
  const continuationLabels = { auto: "추천 11개 자동", manual: "운영자 요청", paused: "일시 정지", ended: "연재 종료" };

  document.addEventListener("DOMContentLoaded", async () => {
    cache();
    bind();
    await StoryHeavenCommon.init(onAuth);
  });

  function cache() {
    elements.gate = document.querySelector("[data-access-gate]");
    elements.dashboard = document.querySelector("[data-works-dashboard]");
    elements.engineState = document.querySelector("[data-engine-state]");
    elements.list = document.querySelector("[data-managed-list]");
    elements.search = document.querySelector("[data-story-search]");
    elements.visibility = document.querySelector("[data-visibility-filter]");
    elements.continuation = document.querySelector("[data-continuation-filter]");
    elements.resultCount = document.querySelector("[data-result-count]");
  }

  function bind() {
    elements.search.addEventListener("input", renderList);
    elements.visibility.addEventListener("change", renderList);
    elements.continuation.addEventListener("change", renderList);
    document.querySelector("[data-refresh]").addEventListener("click", () => {
      refresh().catch((error) => StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error)));
    });
  }

  async function onAuth(auth) {
    if (!auth.session) return showAccess();
    try {
      await refresh();
      elements.gate.hidden = true;
      elements.dashboard.hidden = false;
    } catch (error) {
      showAccess();
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    }
  }

  function showAccess() {
    elements.gate.hidden = false;
    elements.dashboard.hidden = true;
    elements.engineState.textContent = "관리자 확인 필요";
  }

  async function refresh() {
    const button = document.querySelector("[data-refresh]");
    button.disabled = true;
    try {
      const payload = await StoryHeavenCommon.api("/api/storyheaven/operator/serial-engine/stories");
      state.stories = Array.isArray(payload.stories) ? payload.stories : [];
      state.enabled = payload.enabled === true;
      elements.engineState.textContent = state.enabled ? "자동 연재 가동 중" : "자동 연재 전체 멈춤";
      renderSummary();
      renderList();
    } finally {
      button.disabled = false;
    }
  }

  function renderSummary() {
    setText("[data-summary-total]", state.stories.length);
    setText("[data-summary-public]", state.stories.filter((story) => story.visibility === "public").length);
    setText("[data-summary-stopped]", state.stories.filter((story) => ["paused", "ended"].includes(story.continuationMode)).length);
    setText("[data-summary-ready]", state.stories.reduce((sum, story) => sum + Number(story.readyPublicationCount || 0), 0));
  }

  function renderList() {
    const query = elements.search.value.trim().toLocaleLowerCase("ko-KR");
    const filtered = state.stories.filter((story) => {
      const searchText = [story.title, story.logline, ...(story.genres || [])].join(" ").toLocaleLowerCase("ko-KR");
      return (!query || searchText.includes(query))
        && (elements.visibility.value === "all" || story.visibility === elements.visibility.value)
        && (elements.continuation.value === "all" || story.continuationMode === elements.continuation.value);
    });
    elements.resultCount.textContent = `${filtered.length.toLocaleString("ko-KR")}편`;
    if (!filtered.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = state.stories.length ? "조건에 맞는 작품이 없습니다." : "아직 관리할 자동 연재 작품이 없습니다.";
      elements.list.replaceChildren(empty);
      return;
    }
    elements.list.replaceChildren(...filtered.map(storyRow));
  }

  function storyRow(story) {
    const row = document.createElement("article");
    row.className = "managed-story";
    row.dataset.storyId = story.id;

    const summary = document.createElement("section");
    summary.className = "story-summary";
    const stateLine = document.createElement("div");
    stateLine.className = "story-state-line";
    stateLine.append(badge(visibilityLabels[story.visibility] || story.visibility, story.visibility));
    stateLine.append(badge(continuationLabels[story.continuationMode] || story.continuationMode, story.continuationMode));
    if (story.queue) {
      stateLine.append(badge(story.queue.status === "running" ? "제작 중" : `대기 ${story.queue.queuePosition}번`, story.queue.status));
    } else if (story.activeRunCount > 0) {
      stateLine.append(badge("제작 준비 중", "auto"));
    }
    const title = document.createElement("h3");
    title.textContent = story.title;
    const logline = document.createElement("p");
    logline.textContent = story.logline || "등록된 한 줄 소개가 없습니다.";
    const tags = document.createElement("div");
    tags.className = "story-tags";
    tags.append(...(story.genres || []).slice(0, 5).map(tag));
    summary.append(stateLine, title, logline, tags);

    const metrics = document.createElement("section");
    metrics.className = "story-metrics";
    const grid = document.createElement("div");
    grid.className = "metric-grid";
    grid.append(
      metric("최신 회차", story.latestEpisodeNo ? `${story.latestEpisodeNo}화 · ${story.latestEpisodeTitle || "제목 없음"}` : "공개 회차 없음"),
      metric("공개 / 전체", `${story.publishedEpisodeCount} / ${story.episodeCount}`),
      metric("누적 조회", number(story.viewCount)),
      metric("누적 추천", number(story.recommendationCount)),
      metric("공개 대기", `${number(story.readyPublicationCount)}화`),
      metric("최근 제작", runLabel(story.latestRunStatus))
    );
    const schedule = document.createElement("p");
    schedule.className = "schedule-note";
    schedule.textContent = story.schedule
      ? `자동 연재 설정 · ${story.schedule.status === "active" ? "가동 중" : "멈춤"}`
      : "연결된 자동 연재 일정이 없습니다.";
    metrics.append(grid, schedule);

    const controls = document.createElement("section");
    controls.className = "story-controls";
    const visibility = selectField("공개 상태", [
      ["public", "공개"], ["private", "비공개"], ["archived", "보관"]
    ], story.visibility);
    const continuation = selectField("다음 화 제작", [
      ["auto", "추천 11개가 모이면 자동"], ["manual", "운영자 요청으로만"], ["paused", "일시 정지"], ["ended", "연재 종료"]
    ], story.continuationMode);
    const noteDetails = document.createElement("details");
    noteDetails.className = "operator-note";
    const noteSummary = document.createElement("summary");
    noteSummary.textContent = story.operatorNote ? "운영 메모 확인" : "운영 메모 추가";
    const note = document.createElement("textarea");
    note.maxLength = 1000;
    note.placeholder = "독자에게 보이지 않는 메모";
    note.value = story.operatorNote || "";
    noteDetails.append(noteSummary, note);

    const saveState = document.createElement("div");
    saveState.className = "story-save-state";
    saveState.textContent = story.controlUpdatedAt ? `마지막 설정 ${formatDate(story.controlUpdatedAt)}` : "기본 정책 적용 중";
    const actions = document.createElement("div");
    actions.className = "story-actions";
    const save = actionButton("설정 저장", "", () => saveControl(story, row, visibility.select, continuation.select, note, save));
    save.disabled = true;
    const next = actionButton("다음 화 작성", "warning", () => requestNextEpisode(story, next));
    const nextReason = nextEpisodeBlockReason(story);
    next.disabled = Boolean(nextReason);
    if (nextReason) next.title = nextReason;
    const view = document.createElement("a");
    view.className = "button secondary";
    view.href = `/storyheaven/story/?id=${encodeURIComponent(story.id)}`;
    view.textContent = "작품 확인";
    actions.append(save, next);
    if (story.queue?.cancelable) actions.append(actionButton("대기 취소", "secondary", () => cancelQueuedWork(story)));
    actions.append(view);

    const markDirty = () => {
      normalizeControlPair(visibility.select, continuation.select);
      const dirty = visibility.select.value !== story.visibility
        || continuation.select.value !== story.continuationMode
        || note.value.trim() !== (story.operatorNote || "");
      save.disabled = !dirty;
      saveState.textContent = dirty ? "저장하지 않은 변경이 있습니다." : (story.controlUpdatedAt ? `마지막 설정 ${formatDate(story.controlUpdatedAt)}` : "기본 정책 적용 중");
      saveState.classList.toggle("is-dirty", dirty);
      updateAutoOption(visibility.select, continuation.select);
    };
    visibility.select.addEventListener("change", markDirty);
    continuation.select.addEventListener("change", markDirty);
    note.addEventListener("input", markDirty);
    updateAutoOption(visibility.select, continuation.select);

    controls.append(visibility.label, continuation.label, noteDetails, saveState, actions);
    row.append(summary, metrics, controls);
    return row;
  }

  function normalizeControlPair(visibility, continuation) {
    if (visibility.value === "archived") continuation.value = "ended";
    else if (visibility.value !== "public" && continuation.value === "auto") continuation.value = "manual";
  }

  function updateAutoOption(visibility, continuation) {
    const auto = continuation.querySelector("option[value='auto']");
    auto.disabled = visibility.value !== "public";
  }

  async function saveControl(story, row, visibility, continuation, note, button) {
    if (!confirmControlChange(story, visibility.value, continuation.value)) return;
    button.disabled = true;
    try {
      const payload = await StoryHeavenCommon.api(`/api/storyheaven/operator/serial-engine/stories/${encodeURIComponent(story.id)}/control`, {
        method: "PATCH",
        body: { visibility: visibility.value, continuationMode: continuation.value, operatorNote: note.value }
      });
      const index = state.stories.findIndex((item) => item.id === story.id);
      if (index >= 0) state.stories[index] = { ...payload.story, queue: story.queue || null };
      renderSummary();
      renderList();
      StoryHeavenCommon.toast("작품 운영 설정을 저장했습니다.");
    } catch (error) {
      button.disabled = false;
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
      row.scrollIntoView({ block: "nearest" });
    }
  }

  function confirmControlChange(story, visibility, continuation) {
    if (visibility === "archived" && story.visibility !== "archived") {
      return window.confirm("작품을 보관하면 공개 목록에서 사라지고 다음 화 제작이 종료됩니다. 기존 원고와 기록은 남습니다. 계속할까요?");
    }
    if (visibility === "private" && story.visibility === "public") {
      return window.confirm("작품을 비공개로 바꾸면 독자 목록에서 즉시 숨겨집니다. 기존 원고는 삭제되지 않습니다. 계속할까요?");
    }
    if (continuation === "ended" && story.continuationMode !== "ended") {
      return window.confirm("연재 종료로 저장하면 추천 수가 늘어도 다음 화를 자동 제작하지 않습니다. 계속할까요?");
    }
    return true;
  }

  async function requestNextEpisode(story, button) {
    if (!window.confirm(`${story.title} ${story.latestEpisodeNo + 1}화를 제작 대기열에 넣을까요?`)) return;
    button.disabled = true;
    try {
      await StoryHeavenCommon.api(`/api/storyheaven/operator/serial-engine/stories/${encodeURIComponent(story.id)}/episodes/${story.latestEpisodeNo}/continue`, {
        method: "POST",
        body: {}
      });
      StoryHeavenCommon.toast(`${story.latestEpisodeNo + 1}화를 제작 대기열에 넣었습니다.`);
      await refresh();
    } catch (error) {
      button.disabled = false;
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    }
  }

  async function cancelQueuedWork(story) {
    if (!story.queue?.cancelable) return;
    if (!window.confirm(`${story.title}의 대기 중인 다음 화 제작을 취소할까요?`)) return;
    try {
      await StoryHeavenCommon.api(`/api/storyheaven/operator/serial-engine/queue/${encodeURIComponent(story.queue.id)}/cancel`, {
        method: "POST",
        body: {}
      });
      await refresh();
      StoryHeavenCommon.toast("대기 중인 제작을 취소했습니다.");
    } catch (error) {
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    }
  }

  function nextEpisodeBlockReason(story) {
    if (!state.enabled) return "자동 연재 엔진 전체 설정이 멈춰 있습니다.";
    if (!story.latestEpisodeNo || story.latestEpisodeNo < 3) return "3화까지 준비된 뒤 운영자가 다음 화를 요청할 수 있습니다.";
    if (!["auto", "manual"].includes(story.continuationMode)) return "작품의 다음 화 제작이 멈춰 있습니다.";
    if (!story.schedule || story.schedule.status !== "active") return "연결된 자동 연재 일정이 멈춰 있습니다.";
    if (story.queue) return story.queue.status === "running" ? "현재 다음 화를 제작하고 있습니다." : `제작 대기 ${story.queue.queuePosition}번입니다.`;
    if (story.activeRunCount > 0 || story.readyPublicationCount > 0) return "이미 제작 중이거나 공개를 기다리는 회차가 있습니다.";
    return "";
  }

  function selectField(text, options, selected) {
    const label = document.createElement("label");
    label.className = "control-field";
    const title = document.createElement("span");
    title.textContent = text;
    const select = document.createElement("select");
    for (const [value, copy] of options) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = copy;
      option.selected = value === selected;
      select.append(option);
    }
    label.append(title, select);
    return { label, select };
  }

  function badge(text, kind) {
    const element = document.createElement("span");
    element.className = `state-badge ${kind || ""}`;
    element.textContent = text;
    return element;
  }

  function tag(text) {
    const element = document.createElement("span");
    element.className = "tag";
    element.textContent = text;
    return element;
  }

  function metric(label, value) {
    const element = document.createElement("div");
    const title = document.createElement("span");
    title.textContent = label;
    const copy = document.createElement("strong");
    copy.textContent = value;
    copy.title = value;
    element.append(title, copy);
    return element;
  }

  function actionButton(text, variant, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `button ${variant || ""}`.trim();
    button.textContent = text;
    button.addEventListener("click", handler);
    return button;
  }

  function runLabel(status) {
    return ({ queued: "대기", running: "제작 중", rewrite: "수정 중", ready: "공개 대기", published: "공개 완료", blocked: "검수 중단", error: "오류" })[status] || "기록 없음";
  }

  function number(value) {
    return Number(value || 0).toLocaleString("ko-KR");
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(date);
  }

  function setText(selector, value) {
    document.querySelector(selector).textContent = Number(value || 0).toLocaleString("ko-KR");
  }
})();
