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
- 회차 소개: 80~500자, 결말 스포일러 제외
- 원고: 공백 제외 최소 2,500자, 권장 4,000~7,000자, 최대 12,000자
- 문단: 최소 8개, 최대 240개. 장면이 바뀌면 한 줄을 비워 구분
- 외부 링크: 최대 3개
- 허용 형식: 일반 글만 가능. 그림, 첨부파일, HTML, 스크립트, DB 명령은 불가능

[붙여넣기 전 확인]
- 같은 문단을 반복해 분량을 채우지 않았나요?
- 주인공이 직접 판단하고 행동하나요?
- 한 화 안에서 상황이나 관계가 달라지나요?
- 마지막에 다음 장면을 궁금하게 만드는 변화가 있나요?`;
  const state = { storyId: new URLSearchParams(location.search).get("id"), story: null, episode: null, ready: false, saving: false };
  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    fillGenres();
    bindForm();
    await window.StoryHeavenCommon.init(onAuth);
  }

  function fillGenres() {
    const primary = document.querySelector('[name="genre"]');
    const secondary = document.querySelector('[name="secondaryGenre"]');
    genres.forEach((genre) => primary.add(new Option(genre, genre)));
    genres.forEach((genre) => secondary.add(new Option(genre, genre)));
  }

  function bindForm() {
    const form = document.querySelector("[data-story-form]");
    form.addEventListener("input", () => { updateCounters(); updateProgress(); updateManuscriptHealth(); clearFieldErrors(); });
    document.querySelector("[data-save]").addEventListener("click", saveDraft);
    document.querySelector("[data-submit]").addEventListener("click", submitStory);
    document.querySelector("[data-copy-submission-guide]").addEventListener("click", copySubmissionGuide);
    updateCounters();
    updateProgress();
    updateManuscriptHealth();
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
      const packet = collectPacket();
      const path = state.storyId ? `/api/storyheaven/stories/${encodeURIComponent(state.storyId)}/draft` : "/api/storyheaven/stories";
      const payload = await StoryHeavenCommon.api(path, { method: state.storyId ? "PATCH" : "POST", body: { packet } });
      state.story = payload.story;
      state.storyId = payload.story.id;
      history.replaceState(null, "", "?id=" + encodeURIComponent(state.storyId));
      await saveEpisodeDraft();
      document.querySelector("[data-save-state]").textContent = `수정본 ${state.story.revisionNo} · 방금 저장됨`;
      StoryHeavenCommon.toast("작품 소개와 1화 초안을 안전하게 저장했습니다.");
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
    if (!state.episode && !(await saveDraft())) return;
    state.saving = true;
    setBusy(true, "제출 중");
    clearFieldErrors();
    try {
      const form = document.querySelector("[data-story-form]");
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
    return {
      title:f.title.value, logline:f.logline.value, synopsis:f.synopsis.value,
      protagonistGoal:f.protagonistGoal.value, obstacleStakes:f.obstacleStakes.value,
      genre:f.genre.value, secondaryGenre:f.secondaryGenre.value, rating:f.rating.value,
      contentOrigin:f.contentOrigin.value,
      tags:f.tags.value.split(",").map((item) => item.trim()).filter(Boolean).slice(0,5),
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
      title: f.episodeTitle.value,
      summary: f.episodeSummary.value,
      body: f.episodeBody.value
    };
  }

  function applyPacket(packet) {
    const f = document.querySelector("[data-story-form]");
    const set = (name, value) => { if (f[name]) f[name].value = value || ""; };
    ["title","logline","synopsis","protagonistGoal","obstacleStakes","genre","secondaryGenre"].forEach((name) => set(name, packet[name]));
    const origin = packet.contentOrigin || "human";
    const originInput = f.querySelector(`[name="contentOrigin"][value="${CSS.escape(origin)}"]`);
    if (originInput) originInput.checked = true;
    set("rating", packet.rating || "all"); set("tags", (packet.tags || []).join(", "));
    const e = packet.editorial || {}; set("endingDirection", e.endingDirection); set("worldRules", e.worldRules);
    const c = e.characters?.[0] || {}; set("characterName", c.name); set("characterDesire", c.desire); set("characterFear", c.fear); set("characterSecret", c.secret);
    const t = e.turningPoints || {}; set("turnIntro", t.intro); set("turnTurn", t.turn); set("turnCrisis", t.crisis); set("turnDecision", t.decision); set("turnHook", t.hook);
    set("mustKeep", (e.mustKeep || []).join("\n")); set("mustAvoid", (e.mustAvoid || []).join("\n")); set("visualAnchors", (e.visualAnchors || []).join("\n"));
    updateCounters(); updateProgress();
  }

  function applyEpisode(episode) {
    const f = document.querySelector("[data-story-form]");
    f.episodeTitle.value = episode.title || "";
    f.episodeSummary.value = episode.summary || "";
    f.episodeBody.value = episode.body || "";
    updateCounters();
    updateProgress();
    updateManuscriptHealth();
  }

  function updateCounters() {
    document.querySelectorAll("[data-count-for]").forEach((counter) => {
      counter.textContent = String([...document.querySelector(`[name="${counter.dataset.countFor}"]`).value].length);
    });
  }

  function updateProgress() {
    const f = document.querySelector("[data-story-form]");
    const episodeBodyLength = compactLength(f.episodeBody.value);
    const paragraphCount = countParagraphs(f.episodeBody.value);
    const checks = {
      title:f.title.value.trim().length>=2,
      logline:[...f.logline.value.trim()].length>=30,
      synopsis:[...f.synopsis.value.trim()].length>=400,
      protagonistGoal:[...f.protagonistGoal.value.trim()].length>=40,
      obstacleStakes:[...f.obstacleStakes.value.trim()].length>=40,
      episodeTitle:[...f.episodeTitle.value.trim()].length>=2,
      episodeSummary:[...f.episodeSummary.value.trim()].length>=80,
      episodeBody:episodeBodyLength>=2500,
      episodeParagraphs:paragraphCount>=8
    };
    Object.entries(checks).forEach(([name,done]) => document.querySelector(`[data-check="${name}"]`).classList.toggle("done",done));
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
