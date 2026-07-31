(() => {
  "use strict";

  const id = new URLSearchParams(location.search).get("id");
  const state = { story: null, episodes: [], current: null, editorial: null, remoteEpisodeNumbers: new Set(), local: false, serverBacked: false, progressTimer: 0, localProgressTimer: 0, storyViewRecorded: false, lastProgressAt: 0, lastProgressRatio: 0, commentParents: { story: null, episode: null } };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    document.querySelector("[data-report-form]").addEventListener("submit", submitReport);
    document.querySelector("[data-read-first]").addEventListener("click", () => {
      const episodeNo = resumeEpisodeNo() || state.episodes[0]?.episodeNo;
      openEpisode(episodeNo, true, true);
    });
    document.querySelector("[data-prev-episode]").addEventListener("click", () => moveEpisode(-1));
    document.querySelector("[data-next-episode]").addEventListener("click", () => moveEpisode(1));
    document.querySelector("[data-inline-next]").addEventListener("click", () => moveEpisode(1));
    document.querySelectorAll("[data-reaction]").forEach((button) => button.addEventListener("click", () => toggleReaction(button)));
    document.querySelectorAll("[data-episode-vote]").forEach((button) => button.addEventListener("click", () => setRecommendation(button)));
    document.querySelector("[data-request-next-episode]").addEventListener("click", requestNextEpisode);
    document.querySelectorAll("[data-comment-form]").forEach((form) => form.addEventListener("submit", submitComment));
    document.querySelectorAll("[data-comment-input]").forEach((input) => input.addEventListener("input", updateCommentLength));
    document.querySelectorAll("[data-reply-cancel]").forEach((button) => button.addEventListener("click", () => clearReply(button.dataset.replyCancel)));
    addEventListener("scroll", onReaderScroll, { passive: true });
    addEventListener("pagehide", saveLocalReadingProgress);
    await StoryHeavenCommon.init(() => {
      if (state.current) renderRecommendation(state.current.recommendation || emptyRecommendation());
      renderCommentComposerState();
    });
    await load();
  }

  async function load() {
    if (!id) return fail();
    try {
      try {
        const [{ story }, { episodes }] = await Promise.all([
          StoryHeavenCommon.api(`/api/storyheaven/stories/${encodeURIComponent(id)}`, { auth: Boolean(StoryHeavenCommon.state.session) }),
          StoryHeavenCommon.api(`/api/storyheaven/stories/${encodeURIComponent(id)}/episodes`, { auth: Boolean(StoryHeavenCommon.state.session) })
        ]);
        const local = window.StoryHeavenSeeds?.byId?.[id];
        state.editorial = local || null;
        state.story = local ? {
          ...local,
          likeCount: Number(story.likeCount || 0),
          likedByMe: Boolean(story.likedByMe),
          viewCount: Number(story.viewCount || 0)
        } : story;
        state.remoteEpisodeNumbers = new Set((episodes || []).map((episode) => Number(episode.episodeNo)));
        state.episodes = local ? mergeEditorialEpisodes(local.episodes || [], episodes || []) : (episodes || []);
        state.local = Boolean(local && !episodes?.length);
        state.serverBacked = true;
      } catch (error) {
        const local = window.StoryHeavenSeeds?.byId?.[id];
        if (!local) throw error;
        state.editorial = local;
        state.story = local;
        state.episodes = local.episodes || [];
        state.remoteEpisodeNumbers = new Set();
        state.local = true;
      }
      renderSeries();
      renderEpisodeList();
      document.querySelector("[data-loading]").hidden = true;
      document.querySelector("[data-detail]").hidden = false;
      recordStoryView();
      loadComments("story");
      const requestedEpisode = Number(new URLSearchParams(location.search).get("episode"));
      if (requestedEpisode && state.episodes.some((episode) => episode.episodeNo === requestedEpisode)) {
        await openEpisode(requestedEpisode, true, true);
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
    document.querySelector("[data-origin]").textContent = isEditorialStory(story) ? "EDITORIAL SERIAL" : "READER SERIAL";
    document.querySelector("[data-title]").textContent = story.title;
    document.querySelector("[data-author]").textContent = story.author?.nickname || (isEditorialStory(story) ? "스토리천국 편집부" : "새 이야기꾼");
    document.querySelector("[data-genre]").textContent = story.genre;
    document.querySelector("[data-rating]").textContent = story.contentRating === "all" ? "전체 이용" : `${story.contentRating || 12}세 이상`;
    document.querySelector("[data-likes]").textContent = `좋아요 ${story.likeCount || 0}`;
    document.querySelector("[data-views]").textContent = `조회 ${Number(story.viewCount || 0).toLocaleString("ko-KR")}`;
    document.querySelector("[data-comment-count='story']").textContent = `(${Number(story.commentCount || 0).toLocaleString("ko-KR")})`;
    document.querySelector("[data-logline]").textContent = story.logline;
    document.querySelector("[data-synopsis]").textContent = story.synopsis || "아직 공개된 작품 소개가 없습니다.";
    const disclosure = document.querySelector("[data-disclosure]");
    disclosure.hidden = true;
    disclosure.textContent = "";
    updateReadButton();
  }

  function renderEpisodeList() {
    const list = document.querySelector("[data-episode-list]");
    const resumeNo = resumeEpisodeNo();
    list.replaceChildren(...state.episodes.map((episode) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "episode-row";
      button.classList.toggle("is-current", state.current?.episodeNo === episode.episodeNo);
      button.classList.toggle("is-resume", !state.current && resumeNo === episode.episodeNo);
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
      const localProgress = localEpisodeProgress(episode.episodeNo);
      const progress = localProgress || Number(episode.progress?.completionRate || 0);
      meta.textContent = `${episode.estimatedReadMinutes || 1}분 · 조회 ${Number(episode.viewCount || 0).toLocaleString("ko-KR")} · 추천 ${Number(episode.recommendationCount || 0).toLocaleString("ko-KR")} · 댓글 ${Number(episode.commentCount || 0).toLocaleString("ko-KR")}${progress ? ` · 읽음 ${Math.round(progress * 100)}%` : ""}`;
      button.append(number, copy, meta);
      button.addEventListener("click", () => openEpisode(episode.episodeNo, true, resumeNo === episode.episodeNo));
      return button;
    }));
    document.querySelector("[data-episode-empty]").hidden = state.episodes.length > 0;
    document.querySelector("[data-episode-summary]").textContent = state.episodes.length
      ? `공개 ${state.episodes.length}화 · 읽던 위치는 이 기기에 자동 저장됩니다.`
      : "첫 회차 검수 중";
  }

  async function recordStoryView() {
    if (!state.serverBacked || state.storyViewRecorded) return;
    state.storyViewRecorded = true;
    try {
      const view = await StoryHeavenCommon.api(`/api/storyheaven/stories/${encodeURIComponent(id)}/view`, {
        method: "POST",
        auth: Boolean(StoryHeavenCommon.state.session)
      });
      state.story.viewCount = Number(view.viewCount || 0);
      document.querySelector("[data-views]").textContent = `조회 ${state.story.viewCount.toLocaleString("ko-KR")}`;
    } catch {
      // A temporary counter failure must never interrupt free reading.
    }
  }

  async function recordEpisodeView(episode) {
    if (!canSyncEpisode(episode.episodeNo)) return;
    try {
      const view = await StoryHeavenCommon.api(
        `/api/storyheaven/stories/${encodeURIComponent(id)}/episodes/${encodeURIComponent(episode.episodeNo)}/view`,
        { method: "POST", auth: Boolean(StoryHeavenCommon.state.session) }
      );
      const summary = state.episodes.find((item) => item.episodeNo === episode.episodeNo);
      if (summary) summary.viewCount = Number(view.viewCount || 0);
      if (state.current?.episodeNo === episode.episodeNo) {
        state.current.viewCount = Number(view.viewCount || 0);
        document.querySelector("[data-reader-views]").textContent = `조회 ${state.current.viewCount.toLocaleString("ko-KR")}`;
      }
      renderEpisodeList();
    } catch {
      // Counting remains best-effort so the manuscript is always readable.
    }
  }

  async function openEpisode(episodeNo, scrollToReader, restoreSavedPosition = false) {
    if (!episodeNo) return;
    try {
      let episode;
      if (state.editorial) {
        const source = state.episodes.find((item) => item.episodeNo === Number(episodeNo));
        if (!source) throw new Error("episode_not_found");
        episode = localEpisodeForViewer(source);
        if (canSyncEpisode(episodeNo)) {
          try {
            const response = await StoryHeavenCommon.api(
              `/api/storyheaven/stories/${encodeURIComponent(id)}/episodes/${encodeURIComponent(episodeNo)}`,
              { auth: Boolean(StoryHeavenCommon.state.session) }
            );
            episode = mergeEditorialEpisodeForReader(episode, response.episode);
          } catch {
            // The curated manuscript remains readable while live metadata recovers.
          }
        }
      } else {
        ({ episode } = await StoryHeavenCommon.api(
          `/api/storyheaven/stories/${encodeURIComponent(id)}/episodes/${encodeURIComponent(episodeNo)}`,
          { auth: Boolean(StoryHeavenCommon.state.session) }
        ));
      }
      state.current = episode;
      renderReader();
      rememberCurrentEpisode();
      renderEpisodeList();
      updateReadButton();
      loadComments("episode");
      recordEpisodeView(episode);
      const url = new URL(location.href);
      url.searchParams.set("episode", String(episode.episodeNo));
      history.replaceState(null, "", url);
      if (scrollToReader) scrollToEpisode(restoreSavedPosition);
    } catch (error) {
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    }
  }

  function localEpisodeForViewer(source) {
    const characterCount = source.characterCount || [...String(source.body || "")].length;
    return { ...source, storyId: id, storyTitle: state.story.title, author: state.story.author.nickname, guestPreview: false, loginRequired: false, totalCharacters: characterCount, previewCharacters: characterCount, viewCount: source.viewCount || 0, reactions: emptyReactions(), recommendation: emptyRecommendation() };
  }

  function mergeEditorialEpisodes(localEpisodes, remoteEpisodes) {
    const remoteByNumber = new Map(remoteEpisodes.map((episode) => [Number(episode.episodeNo), episode]));
    return localEpisodes.map((episode) => {
      const remote = remoteByNumber.get(Number(episode.episodeNo));
      return remote ? {
        ...episode,
        viewCount: Number(remote.viewCount || 0),
        recommendationCount: Number(remote.recommendationCount || 0),
        commentCount: Number(remote.commentCount || 0),
        progress: remote.progress || null,
        reactions: remote.reactions || undefined
      } : episode;
    });
  }

  function mergeEditorialEpisodeForReader(localEpisode, remoteEpisode) {
    if (!remoteEpisode) return localEpisode;
    return {
      ...localEpisode,
      viewCount: Number(remoteEpisode.viewCount || localEpisode.viewCount || 0),
      commentCount: Number(remoteEpisode.commentCount || localEpisode.commentCount || 0),
      progress: remoteEpisode.progress || null,
        reactions: remoteEpisode.reactions || localEpisode.reactions,
        recommendation: remoteEpisode.recommendation || localEpisode.recommendation
    };
  }

  function canSyncEpisode(episodeNo) {
    return Boolean(state.serverBacked && (!state.editorial || state.remoteEpisodeNumbers.has(Number(episodeNo))));
  }

  function renderReader() {
    const episode = state.current;
    const reader = document.querySelector("[data-reader]");
    reader.hidden = false;
    document.querySelector("[data-reader-number]").textContent = `EPISODE ${String(episode.episodeNo).padStart(2, "0")}`;
    document.querySelector("[data-reader-title]").textContent = episode.title;
    document.querySelector("[data-reader-length]").textContent = `${Number(episode.totalCharacters || episode.characterCount || 0).toLocaleString()}자`;
    document.querySelector("[data-reader-time]").textContent = `약 ${episode.estimatedReadMinutes || 1}분`;
    document.querySelector("[data-reader-views]").textContent = `조회 ${Number(episode.viewCount || 0).toLocaleString("ko-KR")}`;
    const body = document.querySelector("[data-reader-body]");
    body.replaceChildren(...String(episode.body || "").split(/\n\s*\n/gu).filter(Boolean).map((text) => {
      const paragraph = document.createElement("p");
      paragraph.textContent = text;
      return paragraph;
    }));
    document.querySelector("[data-reader-finish]").hidden = false;
    renderReactions(episode.reactions || emptyReactions());
    renderRecommendation(episode.recommendation || emptyRecommendation());
    updateEpisodeNavigation();
    updateReadingProgress();
  }

  function updateEpisodeNavigation() {
    const index = state.episodes.findIndex((episode) => episode.episodeNo === state.current?.episodeNo);
    const next = state.episodes[index + 1];
    document.querySelector("[data-prev-episode]").disabled = index <= 0;
    document.querySelector("[data-next-episode]").disabled = index < 0 || index >= state.episodes.length - 1;
    const inline = document.querySelector("[data-reader-inline-next]");
    inline.hidden = !next;
    if (next) document.querySelector("[data-inline-next-title]").textContent = `${next.episodeNo}화 · ${next.title}`;
  }

  function moveEpisode(direction) {
    const index = state.episodes.findIndex((episode) => episode.episodeNo === state.current?.episodeNo);
    const target = state.episodes[index + direction];
    if (target) openEpisode(target.episodeNo, true);
  }

  function resumeEpisodeNo() {
    if (!state.episodes.length) return null;
    const local = window.StoryHeavenReading?.get(id);
    if (local && state.episodes.some((episode) => episode.episodeNo === local.episodeNo)) {
      if (local.progress >= .95) {
        const index = state.episodes.findIndex((episode) => episode.episodeNo === local.episodeNo);
        return state.episodes[index + 1]?.episodeNo || local.episodeNo;
      }
      return local.episodeNo;
    }
    const progressed = [...state.episodes]
      .filter((episode) => Number(episode.progress?.completionRate || 0) > 0)
      .sort((a, b) => Number(b.episodeNo) - Number(a.episodeNo))[0];
    if (!progressed) return null;
    const ratio = Number(progressed.progress?.completionRate || 0);
    const index = state.episodes.findIndex((episode) => episode.episodeNo === progressed.episodeNo);
    return ratio >= .95 ? (state.episodes[index + 1]?.episodeNo || progressed.episodeNo) : progressed.episodeNo;
  }

  function localEpisodeProgress(episodeNo) {
    const saved = window.StoryHeavenReading?.get(id);
    return saved?.episodeNo === Number(episodeNo) ? Number(saved.progress || 0) : 0;
  }

  function rememberCurrentEpisode() {
    if (!state.current || !state.story) return;
    window.StoryHeavenReading?.remember({
      storyId: id,
      title: state.story.title,
      coverPath: state.story.coverPath,
      genre: Array.isArray(state.story.genres) ? state.story.genres.join(" · ") : state.story.genre,
      episodeNo: state.current.episodeNo,
      episodeTitle: state.current.title
    });
  }

  function saveLocalReadingProgress() {
    if (!state.current) return;
    window.StoryHeavenReading?.updateProgress(id, state.current.episodeNo, readerRatio());
  }

  function scrollToEpisode(restoreSavedPosition) {
    const saved = window.StoryHeavenReading?.get(id);
    const ratio = restoreSavedPosition && saved?.episodeNo === state.current?.episodeNo ? Number(saved.progress || 0) : 0;
    requestAnimationFrame(() => {
      if (ratio > .03 && ratio < .95) {
        const body = document.querySelector("[data-reader-body]");
        const start = body.getBoundingClientRect().top + scrollY - innerHeight * .55;
        const distance = Math.max(1, body.offsetHeight - innerHeight * .35);
        scrollTo({ top: start + distance * ratio, behavior: "smooth" });
      } else {
        document.querySelector("[data-reader]").scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  function updateReadButton() {
    const button = document.querySelector("[data-read-first]");
    const episodeNo = resumeEpisodeNo();
    button.disabled = !state.episodes.length;
    button.textContent = !state.episodes.length
      ? "첫 화 준비 중"
      : episodeNo
        ? `${episodeNo}화 이어 읽기`
        : "첫 화 읽기";
  }

  async function loadComments(scope) {
    const requestedEpisodeNo = scope === "episode" ? Number(state.current?.episodeNo) : null;
    if (!state.serverBacked || (scope === "episode" && !canSyncEpisode(state.current?.episodeNo))) {
      renderComments(scope, { comments: [], count: 0 });
      return;
    }
    const list = document.querySelector(`[data-comment-list='${scope}']`);
    if (list) {
      const loading = document.createElement("p");
      loading.className = "comment-loading";
      loading.textContent = "댓글을 불러오고 있습니다.";
      list.replaceChildren(loading);
    }
    try {
      const payload = await StoryHeavenCommon.api(commentEndpoint(scope), { auth: Boolean(StoryHeavenCommon.state.session) });
      if (scope === "episode" && requestedEpisodeNo !== Number(state.current?.episodeNo)) return;
      renderComments(scope, payload);
    } catch (error) {
      if (list) {
        const message = document.createElement("p");
        message.className = "comment-loading";
        message.textContent = "댓글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.";
        list.replaceChildren(message);
      }
    }
  }

  function renderComments(scope, payload) {
    const comments = Array.isArray(payload?.comments) ? payload.comments : [];
    const count = Number(payload?.count || 0);
    const list = document.querySelector(`[data-comment-list='${scope}']`);
    const empty = document.querySelector(`[data-comment-empty='${scope}']`);
    const countNode = document.querySelector(`[data-comment-count='${scope}']`);
    countNode.textContent = `(${count.toLocaleString("ko-KR")})`;
    empty.hidden = comments.length > 0;
    list.replaceChildren(...comments.map((comment) => {
      const thread = document.createElement("article");
      thread.className = "comment-thread";
      thread.append(createCommentNode(scope, comment, false));
      if (comment.replies?.length) {
        const replies = document.createElement("div");
        replies.className = "comment-replies";
        replies.append(...comment.replies.map((reply) => createCommentNode(scope, reply, true)));
        thread.append(replies);
      }
      return thread;
    }));
    if (scope === "story") state.story.commentCount = count;
    if (scope === "episode" && state.current) {
      state.current.commentCount = count;
      const summary = state.episodes.find((episode) => episode.episodeNo === state.current.episodeNo);
      if (summary) summary.commentCount = count;
      renderEpisodeList();
    }
  }

  function createCommentNode(scope, comment, reply) {
    const item = document.createElement("div");
    item.className = `comment-item${reply ? " is-reply" : ""}`;
    const header = document.createElement("header");
    const author = document.createElement("strong");
    author.textContent = comment.author;
    const time = document.createElement("time");
    time.dateTime = comment.createdAt || "";
    time.textContent = formatCommentTime(comment.createdAt);
    header.append(author, time);
    const body = document.createElement("p");
    body.textContent = comment.bodyText;
    item.append(header, body);
    if (!reply) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "comment-reply-button";
      button.textContent = "답글";
      button.addEventListener("click", () => setReply(scope, comment));
      item.append(button);
    }
    return item;
  }

  function setReply(scope, comment) {
    state.commentParents[scope] = { id: comment.id, author: comment.author };
    const context = document.querySelector(`[data-reply-context='${scope}']`);
    context.hidden = false;
    context.querySelector("span").textContent = `${comment.author}님에게 답글`;
    document.querySelector(`[data-comment-input='${scope}']`)?.focus();
  }

  function clearReply(scope) {
    state.commentParents[scope] = null;
    document.querySelector(`[data-reply-context='${scope}']`).hidden = true;
  }

  async function submitComment(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const scope = form.dataset.commentForm;
    if (!StoryHeavenCommon.state.session) {
      StoryHeavenCommon.toast("댓글을 쓰려면 Google 로그인이 필요합니다.");
      await StoryHeavenCommon.login();
      return;
    }
    if (!canComment(scope)) {
      StoryHeavenCommon.toast("이 댓글 공간을 서버에 연결하고 있습니다.");
      return;
    }
    const input = form.querySelector("textarea");
    const bodyText = input.value.trim();
    if ([...bodyText].length < 2) {
      StoryHeavenCommon.toast("댓글을 두 글자 이상 입력해주세요.");
      input.focus();
      return;
    }
    const button = form.querySelector("[data-comment-submit]");
    button.disabled = true;
    button.textContent = "등록 중";
    try {
      await StoryHeavenCommon.api(commentEndpoint(scope), {
        method: "POST",
        body: { bodyText, parentCommentId: state.commentParents[scope]?.id || null }
      });
      input.value = "";
      updateCommentLength({ currentTarget: input });
      clearReply(scope);
      await loadComments(scope);
      StoryHeavenCommon.toast("댓글을 등록했습니다.");
    } catch (error) {
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    } finally {
      button.disabled = false;
      renderCommentComposerState();
    }
  }

  function commentEndpoint(scope) {
    const base = `/api/storyheaven/stories/${encodeURIComponent(id)}`;
    return scope === "episode"
      ? `${base}/episodes/${encodeURIComponent(state.current?.episodeNo || "")}/comments`
      : `${base}/comments`;
  }

  function canComment(scope) {
    return Boolean(state.serverBacked && (scope === "story" || canSyncEpisode(state.current?.episodeNo)));
  }

  function renderCommentComposerState() {
    const signedIn = Boolean(StoryHeavenCommon.state.session);
    document.querySelectorAll("[data-comment-submit]").forEach((button) => {
      button.textContent = signedIn ? "댓글 쓰기" : "로그인 후 댓글";
    });
  }

  function updateCommentLength(event) {
    const input = event.currentTarget;
    document.querySelector(`[data-comment-length='${input.dataset.commentInput}']`).textContent = String([...input.value].length);
  }

  function formatCommentTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "방금 전";
    const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}시간 전`;
    return new Intl.DateTimeFormat("ko", { year: "numeric", month: "short", day: "numeric" }).format(date);
  }

  function onReaderScroll() {
    if (!state.current || document.querySelector("[data-reader]").hidden) return;
    updateReadingProgress();
    clearTimeout(state.localProgressTimer);
    state.localProgressTimer = setTimeout(saveLocalReadingProgress, 500);
    if (!StoryHeavenCommon.state.session || !canSyncEpisode(state.current.episodeNo)) return;
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
    if (!canSyncEpisode(state.current?.episodeNo)) {
      StoryHeavenCommon.toast("샘플 연재 반응은 서버 연결 후 저장됩니다.");
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

  function emptyRecommendation() {
    return {
      recommend: { count: 0, selected: false },
      notRecommend: { count: 0, selected: false },
      canVote: false,
      isLatestPublished: false,
      autoContinuationEligible: false,
      operatorAvailable: false,
      canRequestNext: false,
      initialEpisodeCount: 3,
      threshold: 11,
      targetEpisodeNo: Number(state.current?.episodeNo || 0) + 1,
      continuation: null
    };
  }

  function renderRecommendation(value) {
    const recommendation = { ...emptyRecommendation(), ...(value || {}) };
    const isAdmin = Boolean(StoryHeavenCommon.state.profile?.isAdmin);
    const controls = document.querySelector("[data-recommendation-buttons]");
    controls.hidden = isAdmin;
    document.querySelectorAll("[data-episode-vote]").forEach((button) => {
      const vote = button.dataset.episodeVote === "recommend"
        ? recommendation.recommend
        : recommendation.notRecommend;
      button.setAttribute("aria-pressed", String(Boolean(vote?.selected)));
      button.querySelector("b").textContent = Number(vote?.count || 0).toLocaleString("ko-KR");
      const signedIn = Boolean(StoryHeavenCommon.state.session);
      button.disabled = isAdmin
        || (signedIn && (!canSyncEpisode(state.current?.episodeNo) || !recommendation.canVote));
    });

    const operator = document.querySelector("[data-operator-continuation]");
    operator.hidden = !(isAdmin && recommendation.operatorAvailable);
    const requestButton = document.querySelector("[data-request-next-episode]");
    requestButton.disabled = !recommendation.canRequestNext;
    requestButton.textContent = recommendation.continuation ? "다음 화 준비 중" : "다음 화 작성";

    const guide = document.querySelector("[data-recommendation-guide]");
    guide.textContent = isAdmin
      ? "운영자 평가는 독자 추천 수에 포함되지 않습니다."
      : recommendation.canVote
        ? "한 계정은 회차마다 추천과 비추천 중 하나만 선택할 수 있습니다. 선택은 바꿀 수 있습니다."
        : "추천하려면 Google 로그인이 필요합니다. 숫자는 로그인하지 않아도 볼 수 있습니다.";

    const status = document.querySelector("[data-continuation-status]");
    const continuation = recommendation.continuation;
    if (continuation?.status === "fulfilled") {
      status.textContent = `${continuation.targetEpisodeNo}화가 공개되었습니다.`;
    } else if (continuation) {
      status.textContent = `${continuation.targetEpisodeNo}화 집필 요청이 접수되었습니다. 완성 후 순서대로 공개됩니다.`;
    } else if (recommendation.continuationRetryPending) {
      status.textContent = "추천 기준을 넘었습니다. 다음 화 요청을 다시 연결하고 있습니다.";
    } else if (recommendation.autoContinuationEligible && recommendation.isLatestPublished) {
      const remaining = Math.max(0, Number(recommendation.threshold || 11) - Number(recommendation.recommend?.count || 0));
      status.textContent = remaining
        ? `추천 ${recommendation.threshold}개가 모이면 ${recommendation.targetEpisodeNo}화를 준비합니다. 앞으로 ${remaining}개 남았습니다.`
        : `${recommendation.targetEpisodeNo}화 집필을 준비하고 있습니다.`;
    } else if (Number(state.current?.episodeNo || 0) < Number(recommendation.initialEpisodeCount || 3)) {
      status.textContent = `첫 ${recommendation.initialEpisodeCount || 3}화는 기본으로 준비됩니다.`;
    } else {
      status.textContent = "이 평가는 다음 연재를 준비할 때 참고합니다.";
    }
  }

  async function setRecommendation(button) {
    if (!StoryHeavenCommon.state.session) {
      StoryHeavenCommon.toast("추천하거나 비추천하려면 Google 로그인이 필요합니다.");
      await StoryHeavenCommon.login();
      return;
    }
    if (StoryHeavenCommon.state.profile?.isAdmin) {
      StoryHeavenCommon.toast("운영자 평가는 독자 추천 수에 포함되지 않습니다.");
      return;
    }
    if (!canSyncEpisode(state.current?.episodeNo)) {
      StoryHeavenCommon.toast("이 회차의 투표 저장소를 연결하고 있습니다.");
      return;
    }
    document.querySelectorAll("[data-episode-vote]").forEach((item) => { item.disabled = true; });
    try {
      const { recommendation } = await StoryHeavenCommon.api(
        `/api/storyheaven/stories/${encodeURIComponent(id)}/episodes/${state.current.episodeNo}/recommendation`,
        { method: "POST", body: { voteType: button.dataset.episodeVote } }
      );
      state.current.recommendation = recommendation;
      const summary = state.episodes.find((episode) => episode.episodeNo === state.current.episodeNo);
      if (summary) summary.recommendationCount = Number(recommendation.recommend?.count || 0);
      renderEpisodeList();
      renderRecommendation(recommendation);
    } catch (error) {
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
      renderRecommendation(state.current.recommendation || emptyRecommendation());
    }
  }

  async function requestNextEpisode() {
    if (!StoryHeavenCommon.state.profile?.isAdmin || !state.current) return;
    const button = document.querySelector("[data-request-next-episode]");
    button.disabled = true;
    button.textContent = "요청 중";
    try {
      const { continuation } = await StoryHeavenCommon.api(
        `/api/storyheaven/operator/serial-engine/stories/${encodeURIComponent(id)}/episodes/${state.current.episodeNo}/continue`,
        { method: "POST", body: {} }
      );
      state.current.recommendation = {
        ...(state.current.recommendation || emptyRecommendation()),
        continuation,
        canRequestNext: false
      };
      renderRecommendation(state.current.recommendation);
      StoryHeavenCommon.toast(`${continuation.targetEpisodeNo}화 집필을 요청했습니다.`);
    } catch (error) {
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
      renderRecommendation(state.current.recommendation || emptyRecommendation());
    }
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
    return value.startsWith("/") ? `../..${value}` : value;
  }

  function isEditorialStory(story) {
    return ["admin_seed", "ai_seed"].includes(story?.contentOrigin)
      || Boolean(window.StoryHeavenSeeds?.byId?.[story?.id]);
  }
})();
