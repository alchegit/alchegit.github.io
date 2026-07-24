(() => {
  const genres = ["현대판타지","로맨스","로맨스판타지","미스터리","스릴러","SF","드라마","코미디","액션","공포","일상","기타"];
  const state = { storyId: new URLSearchParams(location.search).get("id"), story: null, ready: false, saving: false };
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
    form.addEventListener("input", () => { updateCounters(); updateProgress(); clearFieldErrors(); });
    document.querySelector("[data-save]").addEventListener("click", saveDraft);
    document.querySelector("[data-submit]").addEventListener("click", submitStory);
    updateCounters();
    updateProgress();
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
      document.querySelector("[data-save-state]").textContent = `수정본 ${state.story.revisionNo} · 저장됨`;
    } catch (error) {
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    }
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
      document.querySelector("[data-save-state]").textContent = `수정본 ${state.story.revisionNo} · 방금 저장됨`;
      StoryHeavenCommon.toast("초안을 안전하게 저장했습니다.");
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

  async function submitStory() {
    if (state.saving) return;
    if (!state.storyId && !(await saveDraft())) return;
    state.saving = true;
    setBusy(true, "제출 중");
    clearFieldErrors();
    try {
      const form = document.querySelector("[data-story-form]");
      const payload = await StoryHeavenCommon.api(`/api/storyheaven/stories/${encodeURIComponent(state.storyId)}/submit`, {
        method: "POST",
        body: {
          packet: collectPacket(),
          consents: {
            display: form.consentDisplay.checked,
            originality: form.consentOriginality.checked,
            adult: form.consentAdult.checked,
            training: form.consentTraining.checked
          }
        }
      });
      state.story = payload.story;
      StoryHeavenCommon.toast("검수 요청을 보냈습니다. 공개 전까지 원고는 보이지 않습니다.");
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
      tags:f.tags.value.split(",").map((item) => item.trim()).filter(Boolean).slice(0,5),
      editorial:{
        endingDirection:f.endingDirection.value, worldRules:f.worldRules.value,
        characters:Object.values(character).some(Boolean) ? [character] : [],
        turningPoints:{ intro:f.turnIntro.value, turn:f.turnTurn.value, crisis:f.turnCrisis.value, decision:f.turnDecision.value, hook:f.turnHook.value },
        mustKeep:lines("mustKeep",5), mustAvoid:lines("mustAvoid",5), visualAnchors:lines("visualAnchors",8)
      }
    };
  }

  function applyPacket(packet) {
    const f = document.querySelector("[data-story-form]");
    const set = (name, value) => { if (f[name]) f[name].value = value || ""; };
    ["title","logline","synopsis","protagonistGoal","obstacleStakes","genre","secondaryGenre"].forEach((name) => set(name, packet[name]));
    set("rating", packet.rating || "all"); set("tags", (packet.tags || []).join(", "));
    const e = packet.editorial || {}; set("endingDirection", e.endingDirection); set("worldRules", e.worldRules);
    const c = e.characters?.[0] || {}; set("characterName", c.name); set("characterDesire", c.desire); set("characterFear", c.fear); set("characterSecret", c.secret);
    const t = e.turningPoints || {}; set("turnIntro", t.intro); set("turnTurn", t.turn); set("turnCrisis", t.crisis); set("turnDecision", t.decision); set("turnHook", t.hook);
    set("mustKeep", (e.mustKeep || []).join("\n")); set("mustAvoid", (e.mustAvoid || []).join("\n")); set("visualAnchors", (e.visualAnchors || []).join("\n"));
    updateCounters(); updateProgress();
  }

  function updateCounters() {
    document.querySelectorAll("[data-count-for]").forEach((counter) => {
      counter.textContent = String([...document.querySelector(`[name="${counter.dataset.countFor}"]`).value].length);
    });
  }

  function updateProgress() {
    const f = document.querySelector("[data-story-form]");
    const checks = { title:f.title.value.trim().length>=2, logline:[...f.logline.value.trim()].length>=30, synopsis:[...f.synopsis.value.trim()].length>=400, protagonistGoal:[...f.protagonistGoal.value.trim()].length>=40, obstacleStakes:[...f.obstacleStakes.value.trim()].length>=40, endingDirection:[...f.endingDirection.value.trim()].length>=30 };
    Object.entries(checks).forEach(([name,done]) => document.querySelector(`[data-check="${name}"]`).classList.toggle("done",done));
    const value = Math.round(Object.values(checks).filter(Boolean).length / Object.keys(checks).length * 100);
    document.querySelector("[data-progress-bar]").style.width = value + "%";
    document.querySelector("[data-progress-value]").textContent = String(value);
  }

  function showErrors(error) {
    (error.details || []).forEach((detail) => {
      const target = document.querySelector(`[data-error-for="${CSS.escape(detail.field)}"]`);
      if (!target) return;
      target.textContent = detail.code === "story_field_too_short" ? `최소 ${detail.min}자 이상 적어주세요.` : detail.code === "story_field_too_long" ? `최대 ${detail.max}자까지 적을 수 있습니다.` : "이 항목을 작성해주세요.";
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
