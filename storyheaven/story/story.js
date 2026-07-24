(() => {
  "use strict";

  const id = new URLSearchParams(location.search).get("id");
  const state = { story: null, episodes: [], current: null, local: false, progressTimer: 0, lastSession: false, lastProgressAt: 0, lastProgressRatio: 0 };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    document.querySelector("[data-report-form]").addEventListener("submit", submitReport);
    document.querySelector("[data-read-first]").addEventListener("click", () => openEpisode(state.episodes[0]?.episodeNo, true));
    document.querySelector("[data-reader-login]").addEventListener("click", StoryHeavenCommon.login);
    document.querySelector("[data-prev-episode]").addEventListener("click", () => moveEpisode(-1));
    document.querySelector("[data-next-episode]").addEventListener("click", () => moveEpisode(1));
    document.querySelectorAll("[data-reaction]").forEach((button) => button.addEventListener("click", () => toggleReaction(button)));
    addEventListener("scroll", onReaderScroll, { passive: true });
    await StoryHeavenCommon.init(onAuthChange);
    await load();
  }

  async function onAuthChange(auth) {
    const signedIn = Boolean(auth.session);
    if (signedIn && !state.lastSession && state.current?.guestPreview) {
      await openEpisode(state.current.episodeNo, false);
    }
    state.lastSession = signedIn;
  }

  async function load() {
    if (!id) return fail();
    try {
      try {
        const [{ story }, { episodes }] = await Promise.all([
          StoryHeavenCommon.api(`/api/storyheaven/stories/${encodeURIComponent(id)}`, { auth: Boolean(StoryHeavenCommon.state.session) }),
          StoryHeavenCommon.api(`/api/storyheaven/stories/${encodeURIComponent(id)}/episodes`, { auth: Boolean(StoryHeavenCommon.state.session) })
        ]);
        state.story = story;
        state.episodes = episodes || [];
      } catch (error) {
        const local = window.StoryHeavenSeeds?.byId?.[id];
        if (!local) throw error;
        state.story = local;
        state.episodes = local.episodes || [];
        state.local = true;
      }
      renderSeries();
      renderEpisodeList();
      document.querySelector("[data-loading]").hidden = true;
      document.querySelector("[data-detail]").hidden = false;
      const requestedEpisode = Number(new URLSearchParams(location.search).get("episode"));
      if (requestedEpisode && state.episodes.some((episode) => episode.episodeNo === requestedEpisode)) {
        await openEpisode(requestedEpisode, false);
      }
    } catch {
      fail();
    }
  }

  function renderSeries() {
    const story = state.story;
    document.title = `${story.title} | StoryHeaven`;
    const cover = document.querySelector("[data-cover]");
    cover.src = normalizeCover(story.coverPath);
    cover.alt = `${story.title} 표지`;
    document.querySelector("[data-origin]").textContent = story.contentOrigin === "ai_seed"
      ? "EDITORIAL AI SERIAL"
      : story.contentOrigin === "human_ai_assisted" ? "AI-ASSISTED READER SERIAL" : "READER SERIAL";
    document.querySelector("[data-title]").textContent = story.title;
    document.querySelector("[data-author]").textContent = story.author?.nickname || "이야기씨앗";
    document.querySelector("[data-genre]").textContent = story.genre;
    document.querySelector("[data-rating]").textContent = story.contentRating === "all" ? "전체 이용" : `${story.contentRating || 12}세 이상`;
    document.querySelector("[data-likes]").textContent = `좋아요 ${story.likeCount || 0}`;
    document.querySelector("[data-logline]").textContent = story.logline;
    document.querySelector("[data-synopsis]").textContent = story.synopsis || "아직 공개된 작품 소개가 없습니다.";
    const disclosure = document.querySelector("[data-disclosure]");
    disclosure.hidden = !story.disclosure && !["ai_seed", "human_ai_assisted"].includes(story.contentOrigin);
    disclosure.textContent = story.disclosure || (story.contentOrigin === "human_ai_assisted"
      ? "작성자가 생성형 AI의 도움을 받았다고 표시한 원고입니다."
      : "생성형 AI 보조 원고이며 운영진 검토 후 공개된 쇼케이스입니다.");
    const button = document.querySelector("[data-read-first]");
    button.disabled = !state.episodes.length;
    button.textContent = state.episodes.length ? "첫 화 읽기" : "첫 화 준비 중";
  }

  function renderEpisodeList() {
    const list = document.querySelector("[data-episode-list]");
    list.replaceChildren(...state.episodes.map((episode) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "episode-row";
      const copy = document.createElement("span");
      const number = document.createElement("b");
      number.textContent = String(episode.episodeNo).padStart(2, "0");
      const title = document.createElement("strong");
      title.textContent = episode.title;
      const summary = document.createElement("small");
      summary.textContent = episode.summary || "";
      copy.append(title, summary);
      const meta = document.createElement("span");
      meta.className = "episode-row-meta";
      meta.textContent = `${episode.estimatedReadMinutes || 1}분${episode.progress?.completionRate ? ` · ${Math.round(episode.progress.completionRate * 100)}%` : ""}`;
      button.append(number, copy, meta);
      button.addEventListener("click", () => openEpisode(episode.episodeNo, true));
      return button;
    }));
    document.querySelector("[data-episode-empty]").hidden = state.episodes.length > 0;
    document.querySelector("[data-episode-summary]").textContent = state.episodes.length
      ? `공개 ${state.episodes.length}화 · 로그인하면 읽던 위치가 저장됩니다.`
      : "첫 회차 검수 중";
  }

  async function openEpisode(episodeNo, scrollToReader) {
    if (!episodeNo) return;
    try {
      let episode;
      if (state.local) {
        const source = state.episodes.find((item) => item.episodeNo === Number(episodeNo));
        if (!source) throw new Error("episode_not_found");
        episode = localEpisodeForViewer(source, Boolean(StoryHeavenCommon.state.session));
      } else {
        ({ episode } = await StoryHeavenCommon.api(
          `/api/storyheaven/stories/${encodeURIComponent(id)}/episodes/${encodeURIComponent(episodeNo)}`,
          { auth: Boolean(StoryHeavenCommon.state.session) }
        ));
      }
      state.current = episode;
      renderReader();
      const url = new URL(location.href);
      url.searchParams.set("episode", String(episode.episodeNo));
      history.replaceState(null, "", url);
      if (scrollToReader) document.querySelector("[data-reader]").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    }
  }

  function localEpisodeForViewer(source, signedIn) {
    if (signedIn) return { ...source, storyId: id, storyTitle: state.story.title, author: state.story.author.nickname, guestPreview: false, loginRequired: false, totalCharacters: source.characterCount, previewCharacters: source.characterCount, reactions: emptyReactions() };
    const characters = [...source.body];
    const target = Math.min(2500, Math.max(1200, Math.ceil(characters.length * 0.35)));
    if (characters.length <= target) return { ...source, storyId: id, guestPreview: false, loginRequired: false, totalCharacters: characters.length, previewCharacters: characters.length, reactions: emptyReactions() };
    return { ...source, storyId: id, body: characters.slice(0, target).join("").trimEnd(), guestPreview: true, loginRequired: true, totalCharacters: characters.length, previewCharacters: target, reactions: emptyReactions() };
  }

  function renderReader() {
    const episode = state.current;
    const reader = document.querySelector("[data-reader]");
    reader.hidden = false;
    document.querySelector("[data-reader-number]").textContent = `EPISODE ${String(episode.episodeNo).padStart(2, "0")}`;
    document.querySelector("[data-reader-title]").textContent = episode.title;
    document.querySelector("[data-reader-length]").textContent = `${Number(episode.totalCharacters || episode.characterCount || 0).toLocaleString()}자`;
    document.querySelector("[data-reader-time]").textContent = `약 ${episode.estimatedReadMinutes || 1}분`;
    const body = document.querySelector("[data-reader-body]");
    body.replaceChildren(...String(episode.body || "").split(/\n\s*\n/gu).filter(Boolean).map((text) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      return paragraph;
    }));
    document.querySelector("[data-reader-login-wall]").hidden = !episode.loginRequired;
    document.querySelector("[data-reader-finish]").hidden = episode.loginRequired;
    renderReactions(episode.reactions || emptyReactions());
    updateEpisodeNavigation();
    updateReadingProgress();
  }

  function updateEpisodeNavigation() {
    const index = state.episodes.findIndex((episode) => episode.episodeNo === state.current?.episodeNo);
    document.querySelector("[data-prev-episode]").disabled = index <= 0;
    document.querySelector("[data-next-episode]").disabled = state.current?.loginRequired || index < 0 || index >= state.episodes.length - 1;
  }

  function moveEpisode(direction) {
    const index = state.episodes.findIndex((episode) => episode.episodeNo === state.current?.episodeNo);
    const target = state.episodes[index + direction];
    if (target) openEpisode(target.episodeNo, true);
  }

  function onReaderScroll() {
    if (!state.current || document.querySelector("[data-reader]").hidden) return;
    updateReadingProgress();
    if (!StoryHeavenCommon.state.session || state.current.guestPreview || state.local) return;
    clearTimeout(state.progressTimer);
    state.progressTimer = setTimeout(saveReadingProgress, 700);
  }

  function readerRatio() {
    const body = document.querySelector("[data-reader-body]");
    const start = body.getBoundingClientRect().top + scrollY - innerHeight * 0.55;
    const distance = Math.max(1, body.offsetHeight - innerHeight * 0.35);
    return Math.max(0, Math.min(1, (scrollY - start) / distance));
  }

  function updateReadingProgress() {
    document.querySelector("[data-reading-progress]").style.width = `${Math.round(readerRatio() * 100)}%`;
  }

  async function saveReadingProgress() {
    const total = Number(state.current.totalCharacters || state.current.characterCount || 0);
    const ratio = readerRatio();
    const now = Date.now();
    if (ratio < .95 && now - state.lastProgressAt < 8000 && Math.abs(ratio - state.lastProgressRatio) < .08) return;
    const offset = Math.round(total * ratio);
    try {
      await StoryHeavenCommon.api(`/api/storyheaven/stories/${encodeURIComponent(id)}/reading-progress`, {
        method: "PUT",
        body: { episodeNo: state.current.episodeNo, lastCharacterOffset: offset }
      });
      state.lastProgressAt = now;
      state.lastProgressRatio = ratio;
    } catch {
      // Reading must remain uninterrupted when progress sync is temporarily unavailable.
    }
  }

  async function toggleReaction(button) {
    if (!StoryHeavenCommon.state.session) {
      StoryHeavenCommon.toast("반응을 남기려면 Google 로그인이 필요합니다.");
      await StoryHeavenCommon.login();
      return;
    }
    if (state.local) {
      StoryHeavenCommon.toast("쇼케이스 반응은 서버 연결 후 저장됩니다.");
      return;
    }
    const type = button.dataset.reaction;
    const selected = button.getAttribute("aria-pressed") !== "true";
    button.disabled = true;
    try {
      const { reactions } = await StoryHeavenCommon.api(`/api/storyheaven/stories/${encodeURIComponent(id)}/episodes/${state.current.episodeNo}/reactions`, {
        method: "POST",
        body: { reactionType: type, selected }
      });
      state.current.reactions = reactions;
      renderReactions(reactions);
    } catch (error) {
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    } finally {
      button.disabled = false;
    }
  }

  function renderReactions(reactions) {
    document.querySelectorAll("[data-reaction]").forEach((button) => {
      const reaction = reactions[button.dataset.reaction] || { count: 0, selected: false };
      button.setAttribute("aria-pressed", String(Boolean(reaction.selected)));
      button.querySelector("b").textContent = String(reaction.count || 0);
    });
  }

  function emptyReactions() {
    return Object.fromEntries(["next_episode", "character", "world", "tension"].map((key) => [key, { count: 0, selected: false }]));
  }

  async function submitReport(event) {
    event.preventDefault();
    if (!StoryHeavenCommon.state.session) {
      StoryHeavenCommon.toast("신고를 제출하려면 Google 로그인이 필요합니다.");
      await StoryHeavenCommon.login();
      return;
    }
    const form = event.currentTarget;
    const button = form.querySelector("[data-report-submit]");
    const values = new FormData(form);
    button.disabled = true;
    try {
      await StoryHeavenCommon.api(`/api/storyheaven/stories/${encodeURIComponent(id)}/report`, {
        method: "POST",
        body: { category: values.get("category"), details: values.get("details"), referenceUrl: values.get("referenceUrl") }
      });
      form.reset();
      button.textContent = "접수 완료";
      StoryHeavenCommon.toast("신고가 접수되었습니다. 판정 전에는 작성자에게 신고자 정보가 전달되지 않습니다.");
    } catch (error) {
      button.disabled = false;
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    }
  }

  function fail() {
    document.querySelector("[data-loading]").hidden = true;
    document.querySelector("[data-error]").hidden = false;
  }

  function normalizeCover(value) {
    if (!value) return "../../webtoon/assets/guide/awakening-episode-01-last-train-v4.webp";
    return value.startsWith("/webtoon/") ? `../..${value}` : value;
  }
})();
