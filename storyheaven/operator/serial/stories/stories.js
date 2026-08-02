(() => {
  const state = { stories: [], enabled: false, requestedStoryId: new URLSearchParams(location.search).get("story") || "", requestApplied: false };
  const elements = {};
  const visibilityLabels = { public: "공개", private: "비공개", archived: "숨김" };
  const continuationLabels = { auto: "추천 11개 모이면 자동", manual: "운영자 요청", paused: "일시 정지", ended: "연재 종료" };

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
      applyRequestedStory();
      elements.engineState.textContent = state.enabled ? "자동 연재 가동 중" : "자동 연재 전체 멈춤";
      renderSummary();
      renderList();
    } finally {
      button.disabled = false;
    }
  }

  function applyRequestedStory() {
    if (state.requestApplied || !state.requestedStoryId) return;
    const requested = state.stories.find((story) => story.id === state.requestedStoryId);
    if (!requested) return;
    elements.search.value = requested.title;
    elements.visibility.value = "all";
    elements.continuation.value = "all";
    state.requestApplied = true;
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
      const visibility = elements.visibility.value;
      return (!query || searchText.includes(query))
        && (visibility === "all" || (visibility === "managed" ? story.visibility !== "archived" : story.visibility === visibility))
        && (elements.continuation.value === "all" || story.continuationMode === elements.continuation.value);
    });
    elements.resultCount.textContent = `${filtered.length.toLocaleString("ko-KR")}편`;
    if (!filtered.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = state.stories.length
        ? (elements.visibility.value === "managed" ? "현재 운영 중인 작품이 없습니다. 숨긴 작품은 공개 상태 필터에서 확인할 수 있습니다." : "조건에 맞는 작품이 없습니다.")
        : "아직 관리할 자동 연재 작품이 없습니다.";
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
      metric("최신 회차", story.latestEpisodeNo ? `${story.latestEpisodeNo}화 · ${story.latestEpisodeTitle || "제목 없음"}` : "공개 회차 없음", "latest"),
      metric("공개 / 전체", `${story.publishedEpisodeCount} / ${story.episodeCount}`, "published"),
      metric("누적 조회", number(story.viewCount), "views"),
      metric("누적 추천", number(story.recommendationCount), "recommendations"),
      metric("공개 전", `${number(story.readyPublicationCount)}화`, "ready"),
      metric("최근 제작", runLabel(story.latestRunStatus), "run")
    );
    const schedule = document.createElement("p");
    schedule.className = "schedule-note";
    schedule.textContent = story.schedule
      ? `자동 연재 설정 · ${story.schedule.status === "active" ? "가동 중" : "멈춤"}`
      : "자동 연재 설정 없음 · 다음 화 요청 시 작품 설정부터 자동 준비합니다.";
    metrics.append(grid, schedule);

    const controls = document.createElement("section");
    controls.className = "story-controls";
    const visibility = selectField("공개 상태", [
      ["public", "공개"], ["private", "비공개"], ["archived", "목록에서 숨김"]
    ], story.visibility);
    const continuation = selectField("다음 화 제작", [
      ["auto", "추천 11개가 모이면 자동"], ["manual", "운영자 요청으로만"], ["paused", "일시 정지"], ["ended", "연재 종료"]
    ], story.continuationMode);
    const batch = selectField("연속 제작 수", [
      ["1", "1화씩"], ["3", "3화 연속"], ["5", "5화 연속"]
    ], String(story.schedule?.continuationBatchCount || 1));
    const rewrite = rewriteField(story);
    const saveState = document.createElement("div");
    saveState.className = "story-save-state";
    saveState.textContent = story.controlUpdatedAt ? `마지막 설정 ${formatDate(story.controlUpdatedAt)}` : "기본 정책 적용 중";
    const actions = document.createElement("div");
    actions.className = "story-actions";
    const save = actionButton("설정 저장", "", () => saveControl(story, row, visibility.select, continuation.select, save));
    save.disabled = true;
    const restartFirst = actionButton("프롤로그 제작 재개", "warning", () => requestFirstEpisode(story, restartFirst));
    const restartReason = firstEpisodeRestartBlockReason(story);
    restartFirst.disabled = Boolean(restartReason);
    const next = actionButton(nextEpisodeButtonLabel(story), "warning", () => requestNextEpisode(story, next, batch.select));
    const nextReason = nextEpisodeBlockReason(story);
    next.disabled = Boolean(nextReason);
    const nextHelp = document.createElement("p");
    nextHelp.className = "next-episode-help";
    if (!restartReason && !story.latestEpisodeNo) {
      nextHelp.textContent = "아직 프롤로그가 없으므로 프롤로그 제작 재개를 누르면 설정집과 장기 전개부터 다시 준비합니다.";
    } else if (nextReason) {
      next.title = nextReason;
      nextHelp.id = `next-episode-help-${story.id}`;
      nextHelp.textContent = `다음 화를 만들 수 없는 이유 · ${nextReason}`;
      next.setAttribute("aria-describedby", nextHelp.id);
    } else {
      nextHelp.hidden = true;
    }
    const view = document.createElement("a");
    view.className = "button secondary";
    view.href = `/storyheaven/story/?id=${encodeURIComponent(story.id)}`;
    view.textContent = "작품 확인";
    actions.append(save);
    if (!story.latestEpisodeNo) actions.append(restartFirst);
    else actions.append(next);
    if (story.queue?.cancelable) actions.append(actionButton("대기 취소", "secondary", () => cancelQueuedWork(story)));
    actions.append(view);
    if (story.visibility === "archived") {
      const restore = actionButton("목록에 복원", "", () => restoreStory(story, restore));
      actions.append(restore);
    } else {
      const hide = actionButton("목록에서 숨기기", "secondary", () => hideStory(story, hide));
      actions.append(hide);
    }

    const markDirty = () => {
      normalizeControlPair(visibility.select, continuation.select);
      const dirty = visibility.select.value !== story.visibility
        || continuation.select.value !== story.continuationMode;
      save.disabled = !dirty;
      saveState.textContent = dirty ? "저장하지 않은 변경이 있습니다." : (story.controlUpdatedAt ? `마지막 설정 ${formatDate(story.controlUpdatedAt)}` : "기본 정책 적용 중");
      saveState.classList.toggle("is-dirty", dirty);
      updateAutoOption(visibility.select, continuation.select);
    };
    visibility.select.addEventListener("change", markDirty);
    continuation.select.addEventListener("change", markDirty);
    updateAutoOption(visibility.select, continuation.select);

    controls.append(visibility.label, continuation.label, batch.label, rewrite.label, saveState, nextHelp, actions);

    const management = document.createElement("details");
    management.className = "story-management";
    management.open = !window.matchMedia("(max-width: 820px)").matches;
    const managementSummary = document.createElement("summary");
    const managementTitle = document.createElement("strong");
    managementTitle.textContent = "관리·통계";
    const managementPreview = document.createElement("small");
    managementPreview.textContent = `${story.latestEpisodeNo ? `${story.latestEpisodeNo}화` : "회차 없음"} · 조회 ${number(story.viewCount)} · 추천 ${number(story.recommendationCount)}`;
    managementSummary.append(managementTitle, managementPreview);
    const managementContent = document.createElement("div");
    managementContent.className = "story-management-content";
    managementContent.append(metrics, controls);
    management.append(managementSummary, managementContent);
    row.append(summary, management);
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

  async function saveControl(story, row, visibility, continuation, button) {
    if (!confirmControlChange(story, visibility.value, continuation.value)) return;
    button.disabled = true;
    try {
      await StoryHeavenCommon.api(`/api/storyheaven/operator/serial-engine/stories/${encodeURIComponent(story.id)}/control`, {
        method: "PATCH",
        body: { visibility: visibility.value, continuationMode: continuation.value, operatorNote: story.operatorNote || "" }
      });
      await refresh();
      StoryHeavenCommon.toast("작품 운영 설정을 저장했습니다.");
    } catch (error) {
      button.disabled = false;
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
      row.scrollIntoView({ block: "nearest" });
    }
  }

  function confirmControlChange(story, visibility, continuation) {
    if (visibility === "archived" && story.visibility !== "archived") {
      return window.confirm("작품을 숨기면 독자·운영 기본 목록과 미완성 목록에서 사라지고 진행 중인 제작도 종료됩니다. 기존 원고와 기록은 남습니다. 계속할까요?");
    }
    if (visibility === "private" && story.visibility === "public") {
      return window.confirm("작품을 비공개로 바꾸면 독자 목록에서 즉시 숨겨집니다. 기존 원고는 삭제되지 않습니다. 계속할까요?");
    }
    if (continuation === "ended" && story.continuationMode !== "ended") {
      return window.confirm("연재 종료로 저장하면 추천 수가 늘어도 다음 화를 자동 제작하지 않습니다. 계속할까요?");
    }
    return true;
  }

  async function hideStory(story, button) {
    button.disabled = true;
    try {
      await StoryHeavenCommon.api(`/api/storyheaven/operator/serial-engine/stories/${encodeURIComponent(story.id)}/control`, {
        method: "PATCH",
        body: {
          visibility: "archived",
          continuationMode: "ended",
          operatorNote: story.operatorNote || "연재 작품 목록에서 운영자 숨김"
        }
      });
      await refresh();
      StoryHeavenCommon.toast("작품과 연결된 대기·미완성·로그 목록을 숨겼습니다.");
    } catch (error) {
      button.disabled = false;
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    }
  }

  async function restoreStory(story, button) {
    button.disabled = true;
    try {
      await StoryHeavenCommon.api(`/api/storyheaven/operator/serial-engine/stories/${encodeURIComponent(story.id)}/control`, {
        method: "PATCH",
        body: {
          visibility: "private",
          continuationMode: "manual",
          operatorNote: story.operatorNote || "숨긴 작품 복원"
        }
      });
      await refresh();
      StoryHeavenCommon.toast("작품을 비공개 운영 목록에 복원했습니다.");
    } catch (error) {
      button.disabled = false;
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    }
  }

  async function requestNextEpisode(story, button, batchSelect) {
    const batchCount = readBatchCount(batchSelect);
    const targetLabel = nextEpisodeTargetLabel(story);
    const batchText = batchCount === 1 ? targetLabel : `${targetLabel}부터 ${batchCount}화 연속`;
    const preparation = story.schedule ? "" : "\n\n작품 설정이 없으면 설정집과 장기 전개부터 자동으로 준비합니다.";
    if (!window.confirm(`${story.title} ${batchText} 제작을 대기열에 넣을까요?${preparation}`)) return;
    button.disabled = true;
    try {
      await StoryHeavenCommon.api(`/api/storyheaven/operator/serial-engine/stories/${encodeURIComponent(story.id)}/episodes/${story.latestEpisodeNo}/continue`, {
        method: "POST",
        body: { batchCount }
      });
      StoryHeavenCommon.toast(`${batchText} 제작을 대기열에 넣었습니다.`);
      await refresh();
    } catch (error) {
      button.disabled = false;
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    }
  }

  async function requestRewriteEpisode(story, input, button) {
    const episodeNo = Math.round(Number(input.value));
    input.setCustomValidity(!Number.isInteger(episodeNo) || episodeNo < 1 || episodeNo > Number(story.latestEpisodeNo || 0)
      ? "재작성할 공개 회차 번호를 입력해주세요."
      : "");
    if (!input.reportValidity()) return;
    const label = episodeDisplayLabel(episodeNo);
    if (!window.confirm(`${story.title} ${label}를 새 원고로 다시 작성할까요?\n\n검수를 통과하면 교체용 공개 대기 원고로 준비됩니다.`)) return;
    button.disabled = true;
    try {
      await StoryHeavenCommon.api(`/api/storyheaven/operator/serial-engine/stories/${encodeURIComponent(story.id)}/episodes/${episodeNo}/rewrite`, {
        method: "POST",
        body: { notes: `${label} 운영자 요청 재작성` }
      });
      StoryHeavenCommon.toast(`${label} 재작성 작업을 대기열에 넣었습니다.`);
      await refresh();
    } catch (error) {
      button.disabled = false;
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    }
  }

  async function requestFirstEpisode(story, button) {
    if (!window.confirm(`${story.title}의 프롤로그 제작을 다시 시작할까요?\n\n설정집과 장기 전개를 확인한 뒤 프롤로그 원고 제작까지 이어갑니다.`)) return;
    button.disabled = true;
    try {
      const payload = await StoryHeavenCommon.api(`/api/storyheaven/operator/serial-engine/stories/${encodeURIComponent(story.id)}/plan`, {
        method: "POST",
        body: { autoEpisode: true }
      });
      StoryHeavenCommon.toast(payload.run?.reused
        ? "이미 준비 중인 프롤로그 작업으로 연결했습니다."
        : "프롤로그 제작을 다시 대기열에 넣었습니다.");
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
    if (!state.enabled) return "자동 연재 전체가 멈춰 있어 다음 화를 만들 수 없습니다.";
    if (story.queue) return story.queue.status === "running" ? "현재 다음 화를 제작하고 있습니다." : `제작 대기 ${story.queue.queuePosition}번입니다.`;
    if (story.activeRunCount > 0 || story.readyPublicationCount > 0) return "이미 제작 중이거나 아직 공개 전인 회차가 있습니다.";
    const reasons = [];
    if (!story.latestEpisodeNo) reasons.push("먼저 공개된 회차가 한 편 이상 있어야 합니다.");
    return reasons.join(" ");
  }

  function firstEpisodeRestartBlockReason(story) {
    if (story.latestEpisodeNo || Number(story.episodeCount || 0) > 0) return "이미 등록된 회차가 있습니다.";
    if (!state.enabled) return "자동 연재 전체가 멈춰 있습니다.";
    if (story.queue) return story.queue.status === "running" ? "현재 1화 또는 다음 단계가 제작 중입니다." : `제작 대기 ${story.queue.queuePosition}번입니다.`;
    if (story.activeRunCount > 0 || story.readyPublicationCount > 0) return "이미 제작 중이거나 공개 전인 회차가 있습니다.";
    if (story.visibility === "archived" || story.continuationMode === "ended") return "숨김 또는 연재 종료 상태입니다.";
    return "";
  }

  function selectField(text, options, selected) {
    const label = document.createElement("label");
    label.className = "control-field";
    const title = document.createElement("span");
    title.textContent = text;
    const help = controlHelp(text);
    if (help && window.StoryHeavenCommon?.createHelpButton) {
      title.className = "help-topic";
      const titleText = document.createElement("span");
      titleText.textContent = text;
      title.textContent = "";
      title.append(titleText, window.StoryHeavenCommon.createHelpButton(help.title, help.body));
    }
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

  function rewriteField(story) {
    const label = document.createElement("label");
    label.className = "control-field rewrite-field";
    const title = document.createElement("span");
    title.className = "help-topic";
    const titleText = document.createElement("span");
    titleText.textContent = "특정 회차 재작성";
    title.append(titleText);
    if (window.StoryHeavenCommon?.createHelpButton) {
      title.append(window.StoryHeavenCommon.createHelpButton(
        "특정 회차 재작성",
        "번호를 입력한 공개 회차를 새 원고로 다시 제작합니다. 프롤로그는 1번, 본편 1화는 2번으로 입력합니다.\n\n기존 공개 원고를 즉시 지우지 않고, 새 원고가 검수를 통과하면 교체용 공개 대기 원고로 준비합니다."
      ));
    }
    const controls = document.createElement("span");
    controls.className = "rewrite-controls";
    const input = document.createElement("input");
    input.type = "number";
    input.inputMode = "numeric";
    input.min = "1";
    input.max = String(Math.max(1, Number(story.latestEpisodeNo || 1)));
    input.value = story.latestEpisodeNo ? String(story.latestEpisodeNo) : "";
    input.placeholder = story.latestEpisodeNo > 1 ? "예: 2" : "예: 1";
    const button = actionButton("재작성", "secondary", () => requestRewriteEpisode(story, input, button));
    button.disabled = !story.latestEpisodeNo || !state.enabled || Boolean(story.queue) || Number(story.activeRunCount || 0) > 0;
    const hint = document.createElement("small");
    hint.textContent = "프롤로그 1번 · 본편 1화 2번";
    controls.append(input, button);
    label.append(title, controls, hint);
    return { label, input, button };
  }

  function readBatchCount(select) {
    const count = Number(select?.value || 1);
    return [1, 3, 5].includes(count) ? count : 1;
  }

  function nextEpisodeButtonLabel(story) {
    return Number(story.latestEpisodeNo || 0) === 1 ? "본편 1화 작성" : "다음 화 작성";
  }

  function nextEpisodeTargetLabel(story) {
    return episodeDisplayLabel(Number(story.latestEpisodeNo || 0) + 1);
  }

  function episodeDisplayLabel(internalEpisodeNo) {
    const number = Number(internalEpisodeNo || 1);
    return number === 1 ? "프롤로그" : `본편 ${number - 1}화`;
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

  function metric(label, value, key) {
    const element = document.createElement("div");
    element.dataset.metric = key;
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
    return ({ queued: "대기", running: "제작 중", rewrite: "수정 중", ready: "공개 전", published: "공개 완료", blocked: "검수 후 공개 보류", error: "시스템 오류" })[status] || "기록 없음";
  }

  function controlHelp(text) {
    return ({
      "공개 상태": {
        title: "작품 공개 상태",
        body: "공개는 독자가 볼 수 있는 상태입니다. 비공개는 독자 목록에서만 숨기고 운영 목록에는 남깁니다.\n\n목록에서 숨김은 운영 기본 목록, 미완성 목록과 작업 로그에서도 함께 숨기고 다음 화 제작을 종료합니다. 원고와 감사 기록은 삭제하지 않습니다."
      },
      "다음 화 제작": {
        title: "다음 화 제작 방식",
        body: "추천 자동은 최신 공개 회차의 추천이 11개가 되면 다음 화를 자동으로 요청합니다. 운영자 요청은 버튼을 눌렀을 때만 다음 화를 만듭니다.\n\n일시 정지는 잠깐 멈춤, 연재 종료는 더 이어 쓰지 않겠다는 결정입니다."
      }
    })[text] || null;
  }

  function number(value) {
    return Number(value || 0).toLocaleString("ko-KR");
  }

  function parseSerialDate(value) {
    if (!value) return null;
    let text = String(value).trim().replace(" ", "T");
    if (/^\d{4}-\d{2}-\d{2}$/u.test(text)) text = `${text}T00:00:00`;
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?$/u.test(text)) text = `${text}+09:00`;
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatDate(value) {
    if (!value) return "-";
    const date = parseSerialDate(value);
    if (!date) return "-";
    return `${new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date)} (서울)`;
  }

  function setText(selector, value) {
    document.querySelector(selector).textContent = Number(value || 0).toLocaleString("ko-KR");
  }
})();
