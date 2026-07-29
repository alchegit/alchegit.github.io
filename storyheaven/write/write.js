(() => {
  const genres = ["현대판타지","로맨스","로맨스판타지","미스터리","스릴러","SF","드라마","코미디","액션","공포","일상","기타"];
  const submissionGuideText = `StoryHeaven 회차 원고 가이드

[권장 흐름]
1. 도입: 주인공과 지금의 상황을 빠르게 보여주세요.
2. 사건: 평소와 다른 문제나 위협을 발생시키세요.
3. 대응: 주인공이 판단하고 직접 행동하게 해주세요.
4. 변화: 행동의 결과로 관계나 상황이 달라져야 합니다.
5. 다음 화: 새로운 사실, 선택 또는 위험을 남겨주세요.

[제출 기준]
- 회차 제목: 선택, 최대 80자. 비우면 회차 번호로 자동 저장
- 회차 소개: 원고에서 자동 생성
- 원고: 공백 제외 최소 2,500자, 권장 4,000~7,000자, 최대 12,000자
- 문단: 최소 8개, 최대 240개. 장면이 바뀌면 한 줄을 비워 구분
- 외부 링크: 최대 3개
- 묶음 제출: 한 번에 최대 10화
- 허용 형식: 일반 글만 가능. 그림, 첨부파일, HTML, 스크립트, DB 명령은 불가능

[붙여넣기 전 확인]
- 같은 문단을 반복해 분량을 채우지 않았나요?
- 주인공이 직접 판단하고 행동하나요?
- 한 화 안에서 상황이나 관계가 달라지나요?
- 마지막에 다음 장면을 궁금하게 만드는 변화가 있나요?`;
  const state = {
    storyId: new URLSearchParams(location.search).get("id"),
    story: null,
    episodes: [{ episodeNo: 1, id: null, title: "", body: "", status: "draft" }],
    genres: [],
    genreComposing: false,
    tags: [],
    tagComposing: false,
    ready: false,
    saving: false,
    dirty: false,
    hydrating: false,
    consentAutoOpened: false,
    expandedEpisodes: new Set([1])
  };
  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    bindForm();
    await window.StoryHeavenCommon.init(onAuth);
  }

  function bindForm() {
    const form = document.querySelector("[data-story-form]");
    const guide = document.querySelector("[data-submission-guide]");
    guide.open = localStorage.getItem("storyheaven.submission-guide-seen") !== "1";
    guide.addEventListener("toggle", () => {
      if (!guide.open) localStorage.setItem("storyheaven.submission-guide-seen", "1");
    });
    bindGenreEditor();
    bindTagEditor();
    form.addEventListener("input", () => {
      markDirty();
      updateCounters();
      updateProgress();
      updateManuscriptHealth();
      clearFieldErrors();
    });
    document.querySelector("[data-add-episode]").addEventListener("click", addEpisodeDraft);
    document.querySelector("[data-episode-list]").addEventListener("input", handleEpisodeInput);
    document.querySelector("[data-episode-list]").addEventListener("click", handleEpisodeAction);
    document.querySelector("[data-save]").addEventListener("click", saveDraft);
    document.querySelector("[data-submit]").addEventListener("click", submitStory);
    document.querySelector("[data-copy-submission-guide]").addEventListener("click", copySubmissionGuide);
    window.addEventListener("beforeunload", (event) => {
      if (!state.dirty) return;
      event.preventDefault();
      event.returnValue = "";
    });
    renderEpisodes();
    updateCounters();
    updateProgress();
    updateManuscriptHealth();
  }

  function bindGenreEditor() {
    const input = document.querySelector("[data-genre-input]");
    input.addEventListener("compositionstart", () => { state.genreComposing = true; });
    input.addEventListener("compositionend", () => {
      state.genreComposing = false;
      commitGenreInput();
    });
    input.addEventListener("input", () => {
      if (!state.genreComposing) commitGenreInput();
    });
    input.addEventListener("keydown", (event) => {
      if (state.genreComposing) return;
      if ((event.key === "Enter" || event.key === "Tab") && input.value.trim()) {
        event.preventDefault();
        commitGenreInput(true);
      } else if (event.key === "Backspace" && !input.value && state.genres.length) {
        removeGenre(state.genres.length - 1);
      }
    });
    input.addEventListener("blur", () => commitGenreInput(true));
    document.querySelector("[data-genre-chips]").addEventListener("click", (event) => {
      const chip = event.target.closest("[data-genre-index]");
      if (chip) removeGenre(Number(chip.dataset.genreIndex));
    });
    renderGenres();
  }

  function commitGenreInput(force = false) {
    const input = document.querySelector("[data-genre-input]");
    const raw = input.value;
    const hasSeparator = /[,\s]/u.test(raw);
    if (!hasSeparator && !force) return false;
    const endsWithSeparator = /[,\s]$/u.test(raw);
    const parts = raw.split(/[,\s]+/u);
    const remainder = endsWithSeparator || force ? "" : parts.pop() || "";
    let added = false;
    parts.filter(Boolean).forEach((value) => { added = addGenre(value) || added; });
    if (force && remainder) added = addGenre(remainder) || added;
    input.value = remainder;
    return added;
  }

  function addGenre(value) {
    const raw = String(value || "").normalize("NFKC").trim();
    if (!raw) return false;
    if ([...raw].length > 20) {
      setGenreStatus("장르 이름은 20자까지 입력할 수 있습니다.", true);
      return false;
    }
    if (!/^[\p{L}\p{N}&+._-]+$/u.test(raw)) {
      setGenreStatus("장르는 글자와 숫자로 간단하게 입력해주세요.", true);
      return false;
    }
    const matched = genres.find((genre) => genre.toLocaleLowerCase("ko-KR") === raw.toLocaleLowerCase("ko-KR")) || raw;
    if (state.genres.some((genre) => genre.toLocaleLowerCase("ko-KR") === matched.toLocaleLowerCase("ko-KR"))) {
      setGenreStatus("이미 등록된 장르입니다.", true);
      return false;
    }
    if (state.genres.length >= 5) {
      setGenreStatus("장르는 최대 5개까지 등록할 수 있습니다.", true);
      return false;
    }
    state.genres.push(matched);
    setGenreStatus("", false);
    renderGenres();
    markDirty();
    updateProgress();
    return true;
  }

  function removeGenre(index) {
    if (!Number.isInteger(index) || index < 0 || index >= state.genres.length) return;
    const [removed] = state.genres.splice(index, 1);
    setGenreStatus(`${removed} 장르를 삭제했습니다.`, false);
    renderGenres();
    markDirty();
    updateProgress();
    document.querySelector("[data-genre-input]").focus();
  }

  function renderGenres() {
    const container = document.querySelector("[data-genre-chips]");
    const fragment = document.createDocumentFragment();
    state.genres.forEach((genre, index) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "tag-chip genre-chip";
      chip.dataset.genreIndex = String(index);
      chip.setAttribute("aria-label", `${genre} 장르 삭제`);
      chip.title = "눌러서 삭제";
      chip.textContent = `${genre} ×`;
      fragment.append(chip);
    });
    container.replaceChildren(fragment);
    document.querySelector('[name="genre"]').value = state.genres.join(",");
    document.querySelector("[data-genre-count]").textContent = String(state.genres.length);
  }

  function setGenreStatus(message, isError) {
    const status = document.querySelector("[data-genre-status]");
    status.textContent = message;
    status.classList.toggle("is-error", isError);
  }

  function bindTagEditor() {
    const input = document.querySelector("[data-tag-input]");
    input.addEventListener("compositionstart", () => { state.tagComposing = true; });
    input.addEventListener("compositionend", () => {
      state.tagComposing = false;
      commitTagInput();
    });
    input.addEventListener("input", () => {
      if (!state.tagComposing) commitTagInput();
    });
    input.addEventListener("keydown", (event) => {
      if (state.tagComposing) return;
      if ((event.key === "Enter" || event.key === "Tab") && input.value.trim()) {
        event.preventDefault();
        addTag(input.value);
        input.value = "";
      } else if (event.key === "Backspace" && !input.value && state.tags.length) {
        removeTag(state.tags.length - 1);
      }
    });
    input.addEventListener("blur", () => {
      if (input.value.trim()) {
        addTag(input.value);
        input.value = "";
      }
    });
    document.querySelector("[data-tag-chips]").addEventListener("click", (event) => {
      const chip = event.target.closest("[data-tag-index]");
      if (chip) removeTag(Number(chip.dataset.tagIndex));
    });
    renderTags();
  }

  function commitTagInput() {
    const input = document.querySelector("[data-tag-input]");
    const raw = input.value;
    if (!/[,\s]/u.test(raw)) return;
    const endsWithSeparator = /[,\s]$/u.test(raw);
    const parts = raw.split(/[,\s]+/u);
    const remainder = endsWithSeparator ? "" : parts.pop() || "";
    parts.filter(Boolean).forEach(addTag);
    input.value = remainder;
  }

  function addTag(value) {
    const status = document.querySelector("[data-tag-status]");
    const tag = String(value || "").normalize("NFKC").trim().replace(/^#+/u, "");
    if (!tag) return false;
    if ([...tag].length > 12) {
      setTagStatus("태그는 12자까지 입력할 수 있습니다.", true);
      return false;
    }
    if (state.tags.some((item) => item.toLocaleLowerCase("ko-KR") === tag.toLocaleLowerCase("ko-KR"))) {
      setTagStatus("이미 등록한 태그입니다.", true);
      return false;
    }
    if (state.tags.length >= 5) {
      setTagStatus("태그는 최대 5개까지 등록할 수 있습니다.", true);
      return false;
    }
    state.tags.push(tag);
    status.textContent = "";
    status.classList.remove("is-error");
    renderTags();
    markDirty();
    updateProgress();
    return true;
  }

  function removeTag(index) {
    if (!Number.isInteger(index) || index < 0 || index >= state.tags.length) return;
    const [removed] = state.tags.splice(index, 1);
    setTagStatus(`${removed} 태그를 삭제했습니다.`, false);
    renderTags();
    markDirty();
    updateProgress();
    document.querySelector("[data-tag-input]").focus();
  }

  function renderTags() {
    const container = document.querySelector("[data-tag-chips]");
    const fragment = document.createDocumentFragment();
    state.tags.forEach((tag, index) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "tag-chip";
      chip.dataset.tagIndex = String(index);
      chip.setAttribute("aria-label", `${tag} 태그 삭제`);
      chip.title = "눌러서 삭제";
      chip.textContent = `#${tag} ×`;
      fragment.append(chip);
    });
    container.replaceChildren(fragment);
    document.querySelector('[name="tags"]').value = state.tags.join(",");
    document.querySelector("[data-tag-count]").textContent = String(state.tags.length);
  }

  function setTagStatus(message, isError) {
    const status = document.querySelector("[data-tag-status]");
    status.textContent = message;
    status.classList.toggle("is-error", isError);
  }

  async function copySubmissionGuide() {
    const status = document.querySelector("[data-guide-copy-status]");
    try {
      await copyText(submissionGuideText);
      localStorage.setItem("storyheaven.submission-guide-seen", "1");
      status.textContent = "가이드를 복사했습니다. 작성 도구에 붙여넣어 활용하세요.";
      StoryHeavenCommon.toast("회차 원고 가이드를 복사했습니다.");
    } catch {
      status.textContent = "복사하지 못했습니다. 브라우저의 클립보드 권한을 확인해주세요.";
    }
  }

  async function copyText(value) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
    const buffer = document.createElement("textarea");
    buffer.className = "clipboard-buffer";
    buffer.value = value;
    buffer.setAttribute("readonly", "");
    document.body.append(buffer);
    buffer.select();
    const copied = document.execCommand("copy");
    buffer.remove();
    if (!copied) throw new Error("clipboard_unavailable");
  }

  async function onAuth(auth) {
    const signedIn = Boolean(auth.session);
    document.querySelector("[data-login-gate]").hidden = signedIn;
    document.querySelector("[data-nickname-gate]").hidden = !signedIn || auth.profile?.nicknameStatus === "active";
    document.querySelector("[data-editor]").hidden = !signedIn || auth.profile?.nicknameStatus !== "active";
    if (signedIn && auth.profile?.nicknameStatus === "active" && state.storyId && !state.ready) {
      await loadStory();
    }
    state.ready = signedIn;
  }

  async function loadStory() {
    try {
      const payload = await StoryHeavenCommon.api("/api/storyheaven/stories/" + encodeURIComponent(state.storyId));
      state.story = payload.story;
      if (!new Set(["draft", "published"]).has(state.story.status)) {
        StoryHeavenCommon.toast("검수 중인 이야기는 결과가 나온 뒤 다시 수정할 수 있습니다.");
        location.href = "/storyheaven/my/";
        return;
      }
      applyPacket(state.story.packet || state.story);
      await loadEpisodes();
      applyPublishedStoryMode();
      state.dirty = false;
      updateProgress();
      document.querySelector("[data-save-state]").textContent = `수정본 ${state.story.revisionNo} · 저장됨`;
    } catch (error) {
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    }
  }

  async function loadEpisodes() {
    const payload = await StoryHeavenCommon.api(`/api/storyheaven/stories/${encodeURIComponent(state.storyId)}/episodes`);
    const allEpisodes = payload.episodes || [];
    const drafts = allEpisodes.filter((episode) => episode.status === "draft").slice(0, 10);
    if (drafts.length) {
      const details = await Promise.all(drafts.map((episode) => (
        StoryHeavenCommon.api(`/api/storyheaven/stories/${encodeURIComponent(state.storyId)}/episodes/${episode.episodeNo}`)
      )));
      state.episodes = details.map((item) => ({ ...item.episode, body: item.episode.body || "" }));
    } else {
      const nextEpisodeNo = Math.max(0, ...allEpisodes.map((episode) => Number(episode.episodeNo) || 0)) + 1;
      state.episodes = [{ episodeNo: nextEpisodeNo, id: null, title: "", body: "", status: "draft" }];
    }
    const activeDraft = state.episodes.find((episode) => !episodeIsReviewReady(episode)) || state.episodes.at(-1);
    state.expandedEpisodes = new Set(activeDraft ? [Number(activeDraft.episodeNo)] : []);
    renderEpisodes();
    document.querySelector("[data-episode-section]").open = drafts.length > 0;
  }

  function applyPublishedStoryMode() {
    const published = state.story?.status === "published";
    document.querySelectorAll('[data-story-form] > .form-section:not([data-episode-section]) input, [data-story-form] > .form-section:not([data-episode-section]) textarea, [data-story-form] > .form-section:not([data-episode-section]) select').forEach((field) => {
      if (!field.closest("[data-consent-section]")) field.disabled = published;
    });
    document.querySelectorAll("[data-genre-chips] button, [data-tag-chips] button").forEach((button) => {
      button.disabled = published;
    });
    document.querySelector("[data-consent-section]").hidden = published;
    document.querySelector("[data-save]").textContent = published ? "회차 초안 저장" : "초안 저장";
    document.querySelector("[data-submit]").textContent = published ? "새 회차 검수 요청" : "작성한 회차 검수 요청";
  }

  async function saveDraft() {
    if (state.saving) return;
    state.saving = true;
    setBusy(true, "저장 중");
    clearFieldErrors();
    try {
      commitPendingInputs();
      if (!validateBasics()) return false;
      const packet = collectPacket();
      if (state.story?.status !== "published") {
        const path = state.storyId ? `/api/storyheaven/stories/${encodeURIComponent(state.storyId)}/draft` : "/api/storyheaven/stories";
        const payload = await StoryHeavenCommon.api(path, { method: state.storyId ? "PATCH" : "POST", body: { packet } });
        state.story = payload.story;
        state.storyId = payload.story.id;
        history.replaceState(null, "", "?id=" + encodeURIComponent(state.storyId));
      }
      const episodeIncluded = hasEpisodeInput() || state.episodes.some((episode) => episode.id);
      if (episodeIncluded) await saveEpisodeDrafts();
      const form = document.querySelector("[data-story-form]");
      if (!form.synopsis.value.trim() && packet.synopsis) {
        form.synopsis.value = packet.synopsis;
        document.querySelector("[data-synopsis-status]").textContent = "첫 원고에서 줄거리를 자동으로 만들었습니다. 자유롭게 고쳐도 됩니다.";
        updateCounters();
      }
      document.querySelector("[data-save-state]").textContent = `수정본 ${state.story.revisionNo} · 방금 저장됨`;
      state.dirty = false;
      updateProgress();
      StoryHeavenCommon.toast(episodeIncluded ? "이야기와 작성한 회차 초안을 저장했습니다." : "이야기를 저장했습니다. 회차는 나중에 이어서 쓸 수 있습니다.");
      return true;
    } catch (error) {
      showErrors(error);
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
      return false;
    } finally {
      state.saving = false;
      setBusy(false);
    }
  }

  async function saveEpisodeDrafts() {
    const drafts = state.episodes.filter((draft) => draft.title.trim() || draft.body.trim() || draft.id);
    if (!drafts.length) return;
    const payload = await StoryHeavenCommon.api(
      `/api/storyheaven/stories/${encodeURIComponent(state.storyId)}/episodes/batch-draft`,
      {
        method: "POST",
        body: {
          episodes: drafts.map((draft) => ({ episodeNo: draft.episodeNo, ...collectEpisode(draft) }))
        }
      }
    );
    (payload.episodes || []).forEach((saved) => {
      const draft = state.episodes.find((item) => item.episodeNo === Number(saved.episodeNo));
      if (draft) Object.assign(draft, saved, { body: saved.body || draft.body });
    });
    renderEpisodes();
  }

  async function submitStory() {
    if (state.saving) return;
    commitPendingInputs();
    const readiness = getSubmissionReadiness();
    if (!readiness.canSubmit) {
      focusSubmissionIssue(readiness);
      return;
    }
    const createdNow = !state.storyId;
    if (createdNow && !(await saveDraft())) return;
    if (!hasEpisodeInput() && !state.episodes.some((episode) => episode.id && episode.body.trim())) {
      const episodeSection = document.querySelector("[data-episode-section]");
      episodeSection.open = true;
      episodeSection.scrollIntoView({ behavior: "smooth", block: "start" });
      StoryHeavenCommon.toast("이야기는 저장했습니다. 공개 검수는 회차 원고를 작성한 뒤 요청할 수 있습니다.");
      return;
    }
    if (!createdNow && !(await saveDraft())) return;
    const form = document.querySelector("[data-story-form]");
    if (state.story.status !== "published" && ![form.consentDisplay, form.consentOriginality, form.consentAdult].every((input) => input.checked)) {
      const consentSection = document.querySelector("[data-consent-section]");
      consentSection.open = true;
      consentSection.scrollIntoView({ behavior: "smooth", block: "center" });
      StoryHeavenCommon.toast("첫 공개 검수에 필요한 세 가지 항목을 먼저 확인해주세요.");
      return;
    }
    state.saving = true;
    setBusy(true, "제출 중");
    clearFieldErrors();
    try {
      const payload = await StoryHeavenCommon.api(`/api/storyheaven/stories/${encodeURIComponent(state.storyId)}/submit`, {
        method: "POST",
        body: {
          packet: collectPacket(),
          episodes: state.episodes
            .filter((episode) => episode.id && episode.body.trim())
            .map((episode) => ({ episodeNo: episode.episodeNo, ...collectEpisode(episode) })),
          consents: {
            display: form.consentDisplay.checked,
            originality: form.consentOriginality.checked,
            adult: form.consentAdult.checked,
            training: form.consentTraining.checked
          }
        }
      });
      state.story = payload.story;
      state.dirty = false;
      StoryHeavenCommon.toast(`${payload.review?.estimateLabel || "보통 3~5분"} 안에 자동 검수 결과를 알려드립니다.`);
      setTimeout(() => { location.href = "/storyheaven/my/"; }, 1200);
    } catch (error) {
      showErrors(error);
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    } finally {
      state.saving = false;
      setBusy(false);
    }
  }

  function collectPacket() {
    if (state.story?.status === "published" && state.story.packet) {
      return structuredClone(state.story.packet);
    }
    const f = document.querySelector("[data-story-form]");
    const lines = (name, max) => f[name].value.split("\n").map((item) => item.trim()).filter(Boolean).slice(0, max);
    const character = { name:f.characterName.value, desire:f.characterDesire.value, fear:f.characterFear.value, secret:f.characterSecret.value };
    const firstBody = state.episodes.find((episode) => episode.body.trim())?.body || "";
    const automaticSynopsis = createExcerpt(firstBody, 700, 360);
    const synopsis = f.synopsis.value.trim() || automaticSynopsis;
    const existingLogline = state.story?.packet?.logline || state.story?.logline || "";
    const keepExistingLogline = existingLogline && !/의 이야기를 준비하고 있습니다[.]?$/u.test(existingLogline);
    return {
      title:f.title.value,
      logline:keepExistingLogline ? existingLogline : createLogline(synopsis || firstBody, f.title.value),
      synopsis,
      genres:[...state.genres],
      genre:state.genres[0] || "",
      secondaryGenre:state.genres[1] || "",
      rating:f.rating.value,
      contentOrigin:f.contentOrigin.value,
      tags:[...state.tags],
      editorial:{
        endingDirection:f.endingDirection.value, worldRules:f.worldRules.value,
        characters:Object.values(character).some(Boolean) ? [character] : [],
        turningPoints:{ intro:f.turnIntro.value, turn:f.turnTurn.value, crisis:f.turnCrisis.value, decision:f.turnDecision.value, hook:f.turnHook.value },
        mustKeep:lines("mustKeep",5), mustAvoid:lines("mustAvoid",5), visualAnchors:lines("visualAnchors",8)
      }
    };
  }

  function collectEpisode(draft) {
    return {
      title: draft.title.trim() || (draft.body.trim() ? `${draft.episodeNo}화` : ""),
      summary: createExcerpt(draft.body, 300, 100),
      body: draft.body
    };
  }

  function hasEpisodeInput() {
    return state.episodes.some((episode) => episode.title.trim() || episode.body.trim());
  }

  function addEpisodeDraft() {
    if (state.episodes.length >= 10) {
      StoryHeavenCommon.toast("한 번에 최대 10화까지 작성할 수 있습니다.");
      return;
    }
    const nextEpisodeNo = Math.max(0, ...state.episodes.map((episode) => Number(episode.episodeNo) || 0)) + 1;
    state.episodes.push({ episodeNo: nextEpisodeNo, id: null, title: "", body: "", status: "draft" });
    state.expandedEpisodes.clear();
    state.expandedEpisodes.add(nextEpisodeNo);
    markDirty();
    renderEpisodes();
    document.querySelector(`[data-episode-card="${nextEpisodeNo}"] [data-episode-title]`)?.focus();
  }

  function handleEpisodeInput(event) {
    const card = event.target.closest("[data-episode-card]");
    if (!card) return;
    const draft = state.episodes.find((episode) => episode.episodeNo === Number(card.dataset.episodeCard));
    if (!draft) return;
    if (event.target.matches("[data-episode-title]")) draft.title = event.target.value;
    if (event.target.matches("[data-episode-body]")) draft.body = event.target.value;
    updateEpisodeCardHealth(card, draft);
    updateReviewEstimate();
    updateProgress();
  }

  function handleEpisodeAction(event) {
    const button = event.target.closest("[data-remove-episode]");
    if (!button) return;
    const episodeNo = Number(button.dataset.removeEpisode);
    const draft = state.episodes.find((episode) => episode.episodeNo === episodeNo);
    if (!draft || draft.id) return;
    state.episodes = state.episodes.filter((episode) => episode !== draft);
    state.expandedEpisodes.delete(episodeNo);
    if (!state.episodes.length) state.episodes.push({ episodeNo: 1, id: null, title: "", body: "", status: "draft" });
    if (!state.expandedEpisodes.size) state.expandedEpisodes.add(Number(state.episodes.at(-1).episodeNo));
    markDirty();
    renderEpisodes();
  }

  function renderEpisodes() {
    const list = document.querySelector("[data-episode-list]");
    list.replaceChildren(...state.episodes.map((episode, index) => {
      const details = document.createElement("details");
      details.className = "episode-draft-card";
      details.dataset.episodeCard = String(episode.episodeNo);
      details.open = state.expandedEpisodes.has(Number(episode.episodeNo));
      details.innerHTML = `<summary><span><span class="eyebrow">EPISODE ${episode.episodeNo}</span><strong>${escapeHtml(episode.title || `${episode.episodeNo}화 원고`)}</strong></span><span class="episode-summary-meta"><b data-episode-summary-state>작성 전</b><i aria-hidden="true"></i></span></summary>
        <div class="episode-draft-body">
          ${!episode.id && state.episodes.length > 1 ? `<div class="episode-draft-tools"><button class="button secondary episode-remove" type="button" data-remove-episode="${episode.episodeNo}" aria-label="${episode.episodeNo}화 입력칸 삭제">이 회차 삭제</button></div>` : ""}
          <label class="field"><span class="field-label"><span>회차 제목 <em>선택</em></span><small><b data-episode-title-count>${[...String(episode.title || "")].length}</b>/80</small></span><input data-episode-title maxlength="80" autocomplete="off" value="${escapeHtml(episode.title || "")}" placeholder="비우면 ${episode.episodeNo}화로 저장됩니다"><p class="field-error" data-error-for="episodes.${index}.title"></p></label>
          <label class="field manuscript-field"><span class="field-label"><span>${episode.episodeNo}화 원고</span><small><b data-episode-body-count>${compactLength(episode.body).toLocaleString()}</b>/12,000 · 최소 2,500자</small></span><textarea class="manuscript" data-episode-body maxlength="12000" spellcheck="true" placeholder="문단 사이를 한 줄 비워 장면과 호흡을 나눠주세요. 일반 글만 입력할 수 있습니다.">${escapeHtml(episode.body || "")}</textarea><p class="field-error" data-error-for="episodes.${index}.body"></p></label>
          <div class="manuscript-health" data-manuscript-health aria-live="polite"><div><span>원고 분량</span><strong data-manuscript-length>시작 전</strong></div><div><span>문단 호흡</span><strong data-manuscript-paragraphs>0개</strong></div><div><span>예상 읽기</span><strong data-manuscript-time>0분</strong></div></div>
        </div>`;
      details.addEventListener("toggle", () => {
        const episodeNo = Number(details.dataset.episodeCard);
        if (details.open) state.expandedEpisodes.add(episodeNo);
        else state.expandedEpisodes.delete(episodeNo);
      });
      updateEpisodeCardHealth(details, episode);
      return details;
    }));
    document.querySelector("[data-add-episode]").disabled = state.episodes.length >= 10;
    document.querySelector("[data-episode-limit]").textContent = `회차 원고 ${state.episodes.length}/10 · 작성한 회차를 함께 저장하고 한 번에 검수합니다.`;
    updateReviewEstimate();
    updateProgress();
  }

  function updateReviewEstimate() {
    const count = Math.max(1, state.episodes.filter((episode) => episode.body.trim()).length);
    const center = 4 + Math.floor(count / 2);
    document.querySelector("[data-review-estimate]").textContent = `${count}화 기준 보통 ${center - 1}~${center + 1}분`;
  }

  function commitPendingInputs() {
    const tagInput = document.querySelector("[data-tag-input]");
    if (tagInput.value.trim()) {
      addTag(tagInput.value);
      tagInput.value = "";
    }
    commitGenreInput(true);
  }

  function validateBasics() {
    const f = document.querySelector("[data-story-form]");
    let first = null;
    if ([...f.title.value.trim()].length < 2) {
      const error = document.querySelector('[data-error-for="title"]');
      error.textContent = "제목을 2자 이상 적어주세요.";
      f.title.setAttribute("aria-invalid", "true");
      first = f.title;
    }
    if (!state.genres.length) {
      const error = document.querySelector('[data-error-for="genre"]');
      error.textContent = "장르를 한 개 이상 입력해주세요.";
      const input = document.querySelector("[data-genre-input]");
      input.setAttribute("aria-invalid", "true");
      first ||= input;
    }
    first?.focus();
    return !first;
  }

  function createLogline(source, title) {
    const excerpt = createExcerpt(source, 150, 30);
    return excerpt || `${String(title || "이 이야기").trim()}의 이야기를 준비하고 있습니다.`;
  }

  function createExcerpt(value, maximum, preferredMinimum) {
    const text = String(value || "").normalize("NFKC").replace(/\s+/gu, " ").trim();
    if (!text) return "";
    const units = [...text];
    if (units.length <= maximum) return text;
    let punctuation = 0;
    for (let index = preferredMinimum - 1; index < maximum; index += 1) {
      if (/[.!?。！？]/u.test(units[index] || "") && (!units[index + 1] || /\s/u.test(units[index + 1]))) {
        punctuation = index + 1;
      }
    }
    return units.slice(0, punctuation || maximum).join("").trim();
  }

  function applyPacket(packet) {
    state.hydrating = true;
    const f = document.querySelector("[data-story-form]");
    const set = (name, value) => { if (f[name]) f[name].value = value || ""; };
    ["title","synopsis"].forEach((name) => set(name, packet[name]));
    state.genres = [];
    const savedGenres = Array.isArray(packet.genres) && packet.genres.length
      ? packet.genres
      : [packet.genre, packet.secondaryGenre].filter(Boolean);
    savedGenres.forEach(addGenre);
    renderGenres();
    const origin = packet.contentOrigin || "human";
    const originInput = f.querySelector(`[name="contentOrigin"][value="${CSS.escape(origin)}"]`);
    if (originInput) originInput.checked = true;
    set("rating", packet.rating || "all");
    state.tags = [];
    (packet.tags || []).forEach(addTag);
    renderTags();
    const e = packet.editorial || {}; set("endingDirection", e.endingDirection); set("worldRules", e.worldRules);
    const c = e.characters?.[0] || {}; set("characterName", c.name); set("characterDesire", c.desire); set("characterFear", c.fear); set("characterSecret", c.secret);
    const t = e.turningPoints || {}; set("turnIntro", t.intro); set("turnTurn", t.turn); set("turnCrisis", t.crisis); set("turnDecision", t.decision); set("turnHook", t.hook);
    set("mustKeep", (e.mustKeep || []).join("\n")); set("mustAvoid", (e.mustAvoid || []).join("\n")); set("visualAnchors", (e.visualAnchors || []).join("\n"));
    state.hydrating = false;
    updateCounters(); updateProgress();
  }

  function updateCounters() {
    document.querySelectorAll("[data-count-for]").forEach((counter) => {
      const field = document.querySelector(`[name="${counter.dataset.countFor}"]`);
      counter.textContent = String(field ? [...field.value].length : 0);
    });
  }

  function updateProgress() {
    const readiness = getSubmissionReadiness();
    const checks = {
      title: readiness.titleReady,
      genre: readiness.genreReady,
      manuscript: readiness.manuscriptReady
    };
    Object.entries(checks).forEach(([name, done]) => {
      document.querySelector(`[data-check="${name}"]`)?.classList.toggle("done", done);
    });

    document.querySelector("[data-next-step]").textContent = readiness.nextStep;
    document.querySelector("[data-action-guidance]").textContent = readiness.nextStep;

    const saveButton = document.querySelector("[data-save]");
    const submitButton = document.querySelector("[data-submit]");
    saveButton.disabled = state.saving || !readiness.basicsReady;
    submitButton.disabled = state.saving || !readiness.canSubmit;
    saveButton.textContent = state.story?.status === "published" ? "회차 초안 저장" : "초안 저장";
    submitButton.textContent = readiness.submitLabel;

    if (readiness.shouldOpenConsent && !state.consentAutoOpened) {
      document.querySelector("[data-consent-section]").open = true;
      state.consentAutoOpened = true;
    }
  }

  function getSubmissionReadiness() {
    const form = document.querySelector("[data-story-form]");
    const titleReady = [...form.title.value.trim()].length >= 2;
    const genreReady = state.genres.length > 0;
    const basicsReady = titleReady && genreReady;
    const enteredEpisodes = state.episodes.filter((episode) => episode.title.trim() || episode.body.trim());
    const firstInvalidEpisode = enteredEpisodes.find((episode) => !episodeIsReviewReady(episode)) || null;
    const manuscriptReady = enteredEpisodes.length > 0 && !firstInvalidEpisode;
    const published = state.story?.status === "published";
    const consentReady = published || [form.consentDisplay, form.consentOriginality, form.consentAdult].every((input) => input.checked);
    const canSubmit = basicsReady && manuscriptReady && consentReady;
    let nextStep = `${enteredEpisodes.length}화가 준비되었습니다. 한 번에 자동 검수를 요청합니다.`;
    let issue = null;

    if (!titleReady) {
      nextStep = "이야기 제목을 2자 이상 적어주세요.";
      issue = { type: "title" };
    } else if (!genreReady) {
      nextStep = "장르를 1개 이상 입력해주세요.";
      issue = { type: "genre" };
    } else if (!enteredEpisodes.length) {
      nextStep = "회차 원고를 추가하면 공개 검수를 요청할 수 있습니다.";
      issue = { type: "episode", episode: state.episodes[0] };
    } else if (firstInvalidEpisode) {
      const metrics = episodeMetrics(firstInvalidEpisode);
      if (!firstInvalidEpisode.body.trim()) {
        nextStep = `${firstInvalidEpisode.episodeNo}화 원고를 붙여넣어주세요.`;
      } else if (metrics.length < 2500) {
        nextStep = `${firstInvalidEpisode.episodeNo}화 원고를 ${(2500 - metrics.length).toLocaleString()}자 더 적어주세요.`;
      } else {
        nextStep = `${firstInvalidEpisode.episodeNo}화 원고를 ${8 - metrics.paragraphs}문단 더 나눠주세요.`;
      }
      issue = { type: "episode", episode: firstInvalidEpisode };
    } else if (!consentReady) {
      nextStep = "공개 확인 3가지만 체크하면 검수를 요청할 수 있습니다.";
      issue = { type: "consent" };
    }

    let submitLabel = `${enteredEpisodes.length || 1}화 검수 요청`;
    if (!enteredEpisodes.length) submitLabel = "원고를 추가하면 검수 가능";
    else if (!manuscriptReady) submitLabel = "원고 기준을 확인해주세요";
    else if (!consentReady) submitLabel = "공개 확인이 필요합니다";

    return {
      titleReady,
      genreReady,
      basicsReady,
      manuscriptReady,
      consentReady,
      canSubmit,
      enteredEpisodes,
      firstInvalidEpisode,
      nextStep,
      submitLabel,
      issue,
      shouldOpenConsent: basicsReady && manuscriptReady && !consentReady && !published
    };
  }

  function focusSubmissionIssue(readiness) {
    const issue = readiness.issue;
    if (issue?.type === "title") document.querySelector('[name="title"]').focus();
    if (issue?.type === "genre") document.querySelector("[data-genre-input]").focus();
    if (issue?.type === "episode") {
      document.querySelector("[data-episode-section]").open = true;
      const card = document.querySelector(`[data-episode-card="${issue.episode?.episodeNo || state.episodes[0].episodeNo}"]`);
      if (card) {
        card.open = true;
        card.scrollIntoView({ behavior: "smooth", block: "center" });
        card.querySelector("[data-episode-body]")?.focus({ preventScroll: true });
      }
    }
    if (issue?.type === "consent") {
      const consent = document.querySelector("[data-consent-section]");
      consent.open = true;
      consent.scrollIntoView({ behavior: "smooth", block: "center" });
      consent.querySelector('input:not(:checked)')?.focus({ preventScroll: true });
    }
    StoryHeavenCommon.toast(readiness.nextStep);
  }

  function updateManuscriptHealth() {
    document.querySelectorAll("[data-episode-card]").forEach((card) => {
      const draft = state.episodes.find((episode) => episode.episodeNo === Number(card.dataset.episodeCard));
      if (draft) updateEpisodeCardHealth(card, draft);
    });
    updateReviewEstimate();
  }

  function updateEpisodeCardHealth(card, draft) {
    const { length, paragraphs } = episodeMetrics(draft);
    const lengthLabel = length < 2500 ? `${length.toLocaleString()}자 · 더 필요해요` : length <= 7000 ? `${length.toLocaleString()}자 · 적당해요` : `${length.toLocaleString()}자 · 긴 호흡`;
    card.querySelector("[data-manuscript-length]").textContent = lengthLabel;
    card.querySelector("[data-manuscript-paragraphs]").textContent = `${paragraphs}개${paragraphs >= 8 ? " · 좋아요" : " · 8개 이상"}`;
    card.querySelector("[data-manuscript-time]").textContent = `${length ? Math.max(1, Math.ceil(length / 450)) : 0}분`;
    card.querySelector("[data-manuscript-health]").classList.toggle("is-ready", length >= 2500 && paragraphs >= 8);
    card.querySelector("[data-episode-title-count]").textContent = String([...draft.title].length);
    card.querySelector("[data-episode-body-count]").textContent = length.toLocaleString();
    card.querySelector("summary > span:first-child > strong").textContent = draft.title.trim() || `${draft.episodeNo}화 원고`;
    const summaryState = card.querySelector("[data-episode-summary-state]");
    if (!draft.title.trim() && !draft.body.trim()) summaryState.textContent = "작성 전";
    else if (!draft.body.trim()) summaryState.textContent = "원고 없음";
    else if (length < 2500) summaryState.textContent = `${(2500 - length).toLocaleString()}자 더 필요`;
    else if (paragraphs < 8) summaryState.textContent = `${8 - paragraphs}문단 더 필요`;
    else summaryState.textContent = "검수 준비됨";
    card.classList.toggle("is-ready", length >= 2500 && paragraphs >= 8);
  }

  function episodeMetrics(episode) {
    return { length: compactLength(episode?.body), paragraphs: countParagraphs(episode?.body) };
  }

  function episodeIsReviewReady(episode) {
    const metrics = episodeMetrics(episode);
    return Boolean(episode?.body?.trim()) && metrics.length >= 2500 && metrics.paragraphs >= 8;
  }

  function compactLength(value) {
    return [...String(value || "").replace(/\s/gu, "")].length;
  }

  function countParagraphs(value) {
    return String(value || "").trim().split(/\n\s*\n/gu).map((item) => item.trim()).filter(Boolean).length;
  }

  function showErrors(error) {
    (error.details || []).forEach((detail) => {
      const target = document.querySelector(`[data-error-for="${CSS.escape(detail.field)}"]`);
      if (!target) return;
      target.textContent = ({
        story_field_too_short: `최소 ${detail.min}자 이상 적어주세요.`,
        story_field_too_long: `최대 ${detail.max}자까지 적을 수 있습니다.`,
        story_origin_invalid: "작성 방식을 다시 선택해주세요.",
        episode_too_few_paragraphs: `문단을 ${detail.min}개 이상으로 나눠주세요.`,
        episode_too_many_paragraphs: `문단은 최대 ${detail.max}개까지 작성할 수 있습니다.`,
        episode_repeated_content: "같은 문단이 지나치게 반복됩니다. 실제 장면과 사건으로 보강해주세요.",
        episode_too_many_urls: `외부 주소는 최대 ${detail.max}개까지 포함할 수 있습니다.`,
        episode_media_not_allowed: "회차 원고에는 그림이나 첨부파일을 넣을 수 없습니다.",
        unsafe_content_pattern: "실행 가능한 코드나 DB 명령으로 보이는 내용은 원고에 넣을 수 없습니다."
      })[detail.code] || "이 항목을 작성해주세요.";
      target.closest(".field")?.querySelector("input,textarea,select")?.setAttribute("aria-invalid","true");
    });
    document.querySelector('[aria-invalid="true"]')?.scrollIntoView({ behavior:"smooth", block:"center" });
  }

  function clearFieldErrors() {
    document.querySelectorAll("[data-error-for]").forEach((item) => { item.textContent=""; });
    document.querySelectorAll('[aria-invalid="true"]').forEach((item) => item.removeAttribute("aria-invalid"));
  }

  function setBusy(busy, label="") {
    if (busy) document.querySelector("[data-save-state]").textContent = label + "…";
    updateProgress();
  }

  function markDirty() {
    if (state.hydrating || state.saving) return;
    state.dirty = true;
    document.querySelector("[data-save-state]").textContent = "저장되지 않은 변경이 있습니다.";
  }

  function escapeHtml(value) {
    const span = document.createElement("span");
    span.textContent = String(value || "");
    return span.innerHTML;
  }
})();
