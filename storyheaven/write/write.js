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
- 1화 제목: 2~80자
- 회차 소개: 원고에서 자동 생성
- 원고: 공백 제외 최소 2,500자, 권장 4,000~7,000자, 최대 12,000자
- 문단: 최소 8개, 최대 240개. 장면이 바뀌면 한 줄을 비워 구분
- 외부 링크: 최대 3개
- 허용 형식: 일반 글만 가능. 그림, 첨부파일, HTML, 스크립트, DB 명령은 불가능

[붙여넣기 전 확인]
- 같은 문단을 반복해 분량을 채우지 않았나요?
- 주인공이 직접 판단하고 행동하나요?
- 한 화 안에서 상황이나 관계가 달라지나요?
- 마지막에 다음 장면을 궁금하게 만드는 변화가 있나요?`;
  const state = {
    storyId: new URLSearchParams(location.search).get("id"),
    story: null,
    episode: null,
    genre: "",
    genreComposing: false,
    tags: [],
    tagComposing: false,
    ready: false,
    saving: false
  };
  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    bindForm();
    await window.StoryHeavenCommon.init(onAuth);
  }

  function bindForm() {
    const form = document.querySelector("[data-story-form]");
    bindGenreEditor();
    bindTagEditor();
    form.addEventListener("input", () => { updateCounters(); updateProgress(); updateManuscriptHealth(); clearFieldErrors(); });
    document.querySelector("[data-save]").addEventListener("click", saveDraft);
    document.querySelector("[data-submit]").addEventListener("click", submitStory);
    document.querySelector("[data-copy-submission-guide]").addEventListener("click", copySubmissionGuide);
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
      } else if (event.key === "Backspace" && !input.value && state.genre) {
        setGenre("");
      }
    });
    input.addEventListener("blur", () => commitGenreInput(true));
    document.querySelector("[data-genre-chip]").addEventListener("click", () => {
      const removed = state.genre;
      setGenre("");
      setGenreStatus(`${removed} 장르를 삭제했습니다.`, false);
      input.focus();
    });
    renderGenre();
  }

  function commitGenreInput(force = false) {
    const input = document.querySelector("[data-genre-input]");
    const hasSeparator = /[,\s]/u.test(input.value);
    const raw = input.value.split(/[,\s]+/u)[0]?.trim() || "";
    const matched = genres.find((genre) => genre.toLocaleLowerCase("ko-KR") === raw.toLocaleLowerCase("ko-KR"));
    if (matched) {
      setGenre(matched);
      input.value = "";
      return true;
    }
    if ((force || hasSeparator) && raw) {
      setGenreStatus("목록에 있는 장르를 입력해주세요.", true);
      if (hasSeparator) input.value = raw;
    }
    return false;
  }

  function setGenre(value) {
    state.genre = value;
    document.querySelector('[name="genre"]').value = value;
    if (value) setGenreStatus("", false);
    renderGenre();
    updateProgress();
  }

  function renderGenre() {
    const container = document.querySelector("[data-genre-chip]");
    if (!state.genre) {
      container.replaceChildren();
      return;
    }
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "tag-chip genre-chip";
    chip.setAttribute("aria-label", `${state.genre} 장르 삭제`);
    chip.title = "눌러서 삭제";
    chip.textContent = `${state.genre} ×`;
    container.replaceChildren(chip);
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
    return true;
  }

  function removeTag(index) {
    if (!Number.isInteger(index) || index < 0 || index >= state.tags.length) return;
    const [removed] = state.tags.splice(index, 1);
    setTagStatus(`${removed} 태그를 삭제했습니다.`, false);
    renderTags();
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
      if (state.story.status !== "draft") {
        StoryHeavenCommon.toast("검수 중이거나 공개된 이야기는 이 화면에서 수정할 수 없습니다.");
        location.href = "/storyheaven/my/";
        return;
      }
      applyPacket(state.story.packet || state.story);
      await loadEpisode();
      document.querySelector("[data-save-state]").textContent = `수정본 ${state.story.revisionNo} · 저장됨`;
    } catch (error) {
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    }
  }

  async function loadEpisode() {
    const payload = await StoryHeavenCommon.api(`/api/storyheaven/stories/${encodeURIComponent(state.storyId)}/episodes`);
    const first = (payload.episodes || []).find((episode) => Number(episode.episodeNo) === 1);
    if (!first) return;
    const detail = await StoryHeavenCommon.api(`/api/storyheaven/stories/${encodeURIComponent(state.storyId)}/episodes/1`);
    state.episode = detail.episode;
    applyEpisode(state.episode);
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
      const path = state.storyId ? `/api/storyheaven/stories/${encodeURIComponent(state.storyId)}/draft` : "/api/storyheaven/stories";
      const payload = await StoryHeavenCommon.api(path, { method: state.storyId ? "PATCH" : "POST", body: { packet } });
      state.story = payload.story;
      state.storyId = payload.story.id;
      history.replaceState(null, "", "?id=" + encodeURIComponent(state.storyId));
      const episodeIncluded = hasEpisodeInput() || Boolean(state.episode);
      if (episodeIncluded) await saveEpisodeDraft();
      const form = document.querySelector("[data-story-form]");
      if (!form.synopsis.value.trim() && packet.synopsis) {
        form.synopsis.value = packet.synopsis;
        document.querySelector("[data-synopsis-status]").textContent = "1화 원고에서 줄거리를 자동으로 만들었습니다. 자유롭게 고쳐도 됩니다.";
        updateCounters();
      }
      document.querySelector("[data-save-state]").textContent = `수정본 ${state.story.revisionNo} · 방금 저장됨`;
      StoryHeavenCommon.toast(episodeIncluded ? "이야기와 1화 초안을 저장했습니다." : "이야기를 저장했습니다. 1화는 나중에 이어서 쓸 수 있습니다.");
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

  async function saveEpisodeDraft() {
    const episode = collectEpisode();
    const path = state.episode
      ? `/api/storyheaven/stories/${encodeURIComponent(state.storyId)}/episodes/${state.episode.episodeNo}/draft`
      : `/api/storyheaven/stories/${encodeURIComponent(state.storyId)}/episodes`;
    const payload = await StoryHeavenCommon.api(path, {
      method: state.episode ? "PATCH" : "POST",
      body: { episode }
    });
    state.episode = payload.episode;
  }

  async function submitStory() {
    if (state.saving) return;
    if (!state.storyId && !(await saveDraft())) return;
    if (!hasEpisodeInput() && !state.episode) {
      const episodeSection = document.querySelector("[data-episode-section]");
      episodeSection.open = true;
      episodeSection.scrollIntoView({ behavior: "smooth", block: "start" });
      StoryHeavenCommon.toast("이야기는 저장했습니다. 공개 검수는 1화 원고를 작성한 뒤 요청할 수 있습니다.");
      return;
    }
    if (!state.episode && !(await saveDraft())) return;
    const form = document.querySelector("[data-story-form]");
    if (![form.consentDisplay, form.consentOriginality, form.consentAdult].every((input) => input.checked)) {
      const consentSection = document.querySelector("[data-consent-section]");
      consentSection.open = true;
      consentSection.scrollIntoView({ behavior: "smooth", block: "center" });
      StoryHeavenCommon.toast("공개 검수에 필요한 세 가지 항목을 먼저 확인해주세요.");
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
          episodeNo: state.episode?.episodeNo || 1,
          episode: collectEpisode(),
          consents: {
            display: form.consentDisplay.checked,
            originality: form.consentOriginality.checked,
            adult: form.consentAdult.checked,
            training: form.consentTraining.checked
          }
        }
      });
      state.story = payload.story;
      StoryHeavenCommon.toast("작품 소개와 1화 검수 요청을 보냈습니다. 승인 전에는 공개되지 않습니다.");
      setTimeout(() => { location.href = "/storyheaven/my/"; }, 800);
    } catch (error) {
      showErrors(error);
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    } finally {
      state.saving = false;
      setBusy(false);
    }
  }

  function collectPacket() {
    const f = document.querySelector("[data-story-form]");
    const lines = (name, max) => f[name].value.split("\n").map((item) => item.trim()).filter(Boolean).slice(0, max);
    const character = { name:f.characterName.value, desire:f.characterDesire.value, fear:f.characterFear.value, secret:f.characterSecret.value };
    const automaticSynopsis = createExcerpt(f.episodeBody.value, 700, 360);
    const synopsis = f.synopsis.value.trim() || automaticSynopsis;
    const existingLogline = state.story?.packet?.logline || state.story?.logline || "";
    const keepExistingLogline = existingLogline && !/의 이야기를 준비하고 있습니다[.]?$/u.test(existingLogline);
    return {
      title:f.title.value,
      logline:keepExistingLogline ? existingLogline : createLogline(synopsis || f.episodeBody.value, f.title.value),
      synopsis,
      genre:state.genre,
      secondaryGenre:"",
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

  function collectEpisode() {
    const f = document.querySelector("[data-story-form]");
    return {
      title: f.episodeTitle.value.trim() || (f.episodeBody.value.trim() ? "1화" : ""),
      summary: createExcerpt(f.episodeBody.value, 300, 100),
      body: f.episodeBody.value
    };
  }

  function hasEpisodeInput() {
    const f = document.querySelector("[data-story-form]");
    return Boolean(f.episodeTitle.value.trim() || f.episodeBody.value.trim());
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
    if (!state.genre) {
      const error = document.querySelector('[data-error-for="genre"]');
      error.textContent = "장르를 하나 선택해주세요.";
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
    const f = document.querySelector("[data-story-form]");
    const set = (name, value) => { if (f[name]) f[name].value = value || ""; };
    ["title","synopsis"].forEach((name) => set(name, packet[name]));
    setGenre(packet.genre || "");
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
    updateCounters(); updateProgress();
  }

  function applyEpisode(episode) {
    const f = document.querySelector("[data-story-form]");
    f.episodeTitle.value = episode.title || "";
    f.episodeBody.value = episode.body || "";
    document.querySelector("[data-episode-section]").open = true;
    updateCounters();
    updateProgress();
    updateManuscriptHealth();
  }

  function updateCounters() {
    document.querySelectorAll("[data-count-for]").forEach((counter) => {
      const field = document.querySelector(`[name="${counter.dataset.countFor}"]`);
      counter.textContent = String(field ? [...field.value].length : 0);
    });
  }

  function updateProgress() {
    const f = document.querySelector("[data-story-form]");
    const checks = {
      title:f.title.value.trim().length>=2,
      genre:Boolean(state.genre),
      rating:["all","12","15"].includes(f.rating.value)
    };
    Object.entries(checks).forEach(([name,done]) => document.querySelector(`[data-check="${name}"]`)?.classList.toggle("done",done));
    const value = Math.round(Object.values(checks).filter(Boolean).length / Object.keys(checks).length * 100);
    document.querySelector("[data-progress-bar]").style.width = value + "%";
    document.querySelector("[data-progress-value]").textContent = String(value);
  }

  function updateManuscriptHealth() {
    const body = document.querySelector('[name="episodeBody"]').value;
    const length = compactLength(body);
    const paragraphs = countParagraphs(body);
    const lengthLabel = length < 2500 ? `${length.toLocaleString()}자 · 더 필요해요` : length <= 7000 ? `${length.toLocaleString()}자 · 적당해요` : `${length.toLocaleString()}자 · 긴 호흡`;
    document.querySelector("[data-manuscript-length]").textContent = lengthLabel;
    document.querySelector("[data-manuscript-paragraphs]").textContent = `${paragraphs}개${paragraphs >= 8 ? " · 좋아요" : " · 8개 이상"}`;
    document.querySelector("[data-manuscript-time]").textContent = `${length ? Math.max(1, Math.ceil(length / 450)) : 0}분`;
    document.querySelector("[data-manuscript-health]").classList.toggle("is-ready", length >= 2500 && paragraphs >= 8);
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
    document.querySelectorAll("[data-save],[data-submit]").forEach((button) => { button.disabled=busy; });
    if (busy) document.querySelector("[data-save-state]").textContent = label + "…";
  }
})();
