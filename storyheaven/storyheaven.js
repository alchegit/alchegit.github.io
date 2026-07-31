(() => {
  const SUPABASE_URL = "https://anjbgbqkeukllsdxgckv.supabase.co";
  const SUPABASE_KEY = "sb_publishable_k6DOGCJ3PVC1av1RVxDt5w_NvOZubsE";
  const API_BASE = (document.querySelector("meta[name='storyheaven-api-base']")?.content || "").replace(/\/+$/, "");
  const FALLBACK_STORIES = window.StoryHeavenSeeds?.stories || [];

  const state = {
    client: null,
    session: null,
    profile: null,
    stories: [],
    genreStories: null,
    discovery: null,
    round: null,
    filter: "latest",
    genre: "",
    query: "",
    rankingPeriod: "daily",
    availabilityTimer: 0,
    toastTimer: 0
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    bindUi();
    renderContinueReading();
    await initAuth();
    await Promise.all([loadFeed(), loadRound(), loadDiscovery()]);
    renderDiscovery();
  }

  function bindUi() {
    document.querySelector("[data-login]")?.addEventListener("click", login);
    document.querySelector("[data-logout]")?.addEventListener("click", logout);
    document.querySelector("[data-nickname-button]")?.addEventListener("click", openNicknameDialog);
    document.querySelector("[data-dialog-close]")?.addEventListener("click", closeNicknameDialog);
    document.querySelector("[data-nickname-form]")?.addEventListener("submit", saveNickname);
    document.querySelector("[data-nickname-dialog]")?.addEventListener("click", (event) => {
      if (event.target === event.currentTarget) closeNicknameDialog();
    });
    document.querySelectorAll("[data-feed-filter]").forEach((button) => {
      button.addEventListener("click", () => setFilter(button.dataset.feedFilter));
    });
    document.querySelectorAll("[data-ranking-period]").forEach((button) => {
      button.addEventListener("click", () => setRankingPeriod(button.dataset.rankingPeriod));
    });
    document.querySelector("#nicknameInput")?.addEventListener("input", onNicknameInput);
    document.querySelector("[data-story-search]")?.addEventListener("input", (event) => setSearch(event.currentTarget.value));
  }

  async function initAuth() {
    if (!window.supabase?.createClient) {
      renderAccount();
      return;
    }
    state.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    const { data } = await state.client.auth.getSession();
    state.session = data.session;
    renderAccount();
    state.client.auth.onAuthStateChange((_event, session) => {
      const previousUserId = state.session?.user?.id || null;
      const previousAccessToken = state.session?.access_token || null;
      state.session = session;
      if (!session) {
        state.profile = null;
      }
      renderAccount();
      if (session && (
        session.user?.id !== previousUserId
        || session.access_token !== previousAccessToken
      )) loadProfile();
    });
    if (state.session) await loadProfile();
  }

  async function login() {
    if (!state.client) {
      showToast("로그인 모듈을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    const buttons = [...document.querySelectorAll("[data-login]")];
    buttons.forEach((button) => { button.disabled = true; });
    try {
      const { error } = await state.client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: new URL(
            `${window.location.pathname}${window.location.search}`,
            window.location.origin
          ).href
        }
      });
      if (error) throw error;
    } catch (error) {
      const detail = `${error?.code || ""} ${error?.message || ""}`.toLowerCase();
      showToast(detail.includes("provider") && (detail.includes("not enabled") || detail.includes("unsupported"))
        ? "Google 로그인이 아직 인증 서버에서 활성화되지 않았습니다."
        : detail.includes("redirect") && detail.includes("allow")
          ? "현재 페이지가 로그인 복귀 주소로 등록되지 않았습니다."
          : "Google 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      buttons.forEach((button) => { button.disabled = false; });
    }
  }

  async function logout() {
    await state.client?.auth.signOut();
    state.session = null;
    state.profile = null;
    renderAccount();
    await loadFeed();
  }

  async function loadProfile() {
    try {
      const payload = await api("/api/storyheaven/profile");
      state.profile = payload.profile;
      renderAccount();
      renderStories();
      if (location.hash === "#nickname" && state.profile?.nicknameStatus !== "active") {
        openNicknameDialog();
      }
    } catch (error) {
      showToast(readableError(error));
      renderAccount();
    }
  }

  function renderAccount() {
    const loginButton = document.querySelector("[data-login]");
    const logoutButton = document.querySelector("[data-logout]");
    const nicknameButton = document.querySelector("[data-nickname-button]");
    const signedIn = Boolean(state.session);
    if (loginButton) loginButton.hidden = signedIn;
    if (logoutButton) logoutButton.hidden = !signedIn;
    if (nicknameButton) nicknameButton.hidden = !signedIn;
    if (signedIn) {
      if (nicknameButton) {
        nicknameButton.textContent = state.profile?.nickname || "닉네임 설정";
        nicknameButton.title = "공개 닉네임 변경";
      }
    }
    renderAdminNavigation();
  }

  function renderAdminNavigation() {
    const nav = document.querySelector(".main-nav");
    if (!nav) return;
    const existing = nav.querySelector("[data-storyheaven-admin-nav]");
    if (!state.profile?.isAdmin) {
      existing?.remove();
      return;
    }
    if (existing) return;
    const link = document.createElement("a");
    link.href = "/storyheaven/operator/serial/";
    link.dataset.storyheavenAdminNav = "";
    link.textContent = "소설 연재 관리";
    link.setAttribute("aria-label", "관리자 전용 소설 연재 관리");
    nav.append(link);
  }

  async function loadFeed() {
    try {
      const payload = await api("/api/storyheaven/feed?limit=30", { auth: Boolean(state.session) });
      state.stories = mergeEditorialLibrary(Array.isArray(payload.stories) ? payload.stories : []);
    } catch {
      state.stories = FALLBACK_STORIES;
    }
    renderStories();
  }

  async function loadDiscovery() {
    try {
      state.discovery = await api("/api/storyheaven/discovery", { auth: false });
    } catch {
      state.discovery = fallbackDiscovery();
    }
    renderDiscovery();
  }

  async function loadRound() {
    try {
      const payload = await api("/api/storyheaven/rounds/current", { auth: Boolean(state.session) });
      state.round = payload.round || null;
    } catch {
      state.round = null;
    }
    renderRound();
  }

  function setFilter(filter) {
    state.filter = filter;
    document.querySelectorAll("[data-feed-filter]").forEach((button) => {
      const active = button.dataset.feedFilter === filter;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });
    renderStories();
  }

  async function setGenre(genre) {
    state.genre = String(genre || "");
    const requestedGenre = state.genre;
    state.genreStories = null;
    renderGenreFilters();
    renderGenreSummary(true);
    if (state.genre) {
      try {
        const params = new URLSearchParams({ limit: "40", genre: state.genre });
        const payload = await api(`/api/storyheaven/feed?${params}`, { auth: Boolean(state.session) });
        if (state.genre !== requestedGenre) return;
        state.genreStories = mergeEditorialLibrary(Array.isArray(payload.stories) ? payload.stories : [], state.genre);
      } catch {
        if (state.genre !== requestedGenre) return;
        state.genreStories = state.stories.filter((story) => storyHasGenre(story, state.genre));
      }
    }
    renderStories();
    renderGenreSummary(false);
    document.querySelector("#discover")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setRankingPeriod(period) {
    if (!state.discovery?.periods?.[period]) return;
    state.rankingPeriod = period;
    document.querySelectorAll("[data-ranking-period]").forEach((button) => {
      const active = button.dataset.rankingPeriod === period;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
    });
    renderRanking();
  }

  function renderStories() {
    const humanStories = state.stories.filter((story) => !isEditorialStory(story));
    const seedStories = state.stories.filter(isEditorialStory);
    const sourceStories = state.genre ? (state.genreStories || []) : (state.query ? state.stories : humanStories);
    const discoveryStories = state.query ? sourceStories.filter(matchesSearch) : sourceStories;
    const sortStories = (stories) => [...stories].sort((a, b) => (
      state.filter === "popular"
        ? Number(b.likeCount || 0) - Number(a.likeCount || 0)
        : new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0)
    ));
    renderStoryList(document.querySelector("[data-human-feed]"), sortStories(discoveryStories));
    renderStoryList(document.querySelector("[data-seed-feed]"), sortStories(seedStories.length ? seedStories : FALLBACK_STORIES));
    document.querySelector("[data-human-empty]").hidden = discoveryStories.length > 0;
    renderSearchState(discoveryStories.length);
    renderWeekly(humanStories);
  }

  function setSearch(value) {
    state.query = String(value || "").trim().toLocaleLowerCase("ko-KR");
    renderStories();
  }

  function matchesSearch(story) {
    if (!state.query) return true;
    const genres = Array.isArray(story.genres) ? story.genres : [story.genre];
    const haystack = [
      story.title,
      story.logline,
      story.author?.nickname,
      ...genres,
      ...(story.tags || [])
    ].filter(Boolean).join(" ").toLocaleLowerCase("ko-KR");
    return state.query.split(/\s+/u).every((term) => haystack.includes(term));
  }

  function renderSearchState(resultCount) {
    const title = document.querySelector("[data-discover-title]");
    const emptyTitle = document.querySelector("[data-human-empty-title]");
    const emptyCopy = document.querySelector("[data-human-empty-copy]");
    if (state.query) {
      title.textContent = `검색 결과 ${resultCount}편`;
      emptyTitle.textContent = "일치하는 연재를 찾지 못했습니다.";
      emptyCopy.textContent = "검색어를 줄이거나 다른 장르를 선택해보세요.";
    } else if (state.genre) {
      title.textContent = `${state.genre} 연재`;
      emptyTitle.textContent = "이 장르의 공개 연재가 아직 없습니다.";
      emptyCopy.textContent = "전체 장르에서 다른 작품을 먼저 만나보세요.";
    } else {
      title.textContent = "새로 시작한 연재";
      emptyTitle.textContent = "아직 공개된 독자 이야기가 없습니다.";
      emptyCopy.textContent = "투고가 열리면 최신 이야기부터 이곳에 표시됩니다.";
    }
  }

  function renderContinueReading() {
    const entry = window.StoryHeavenReading?.list()?.[0];
    const section = document.querySelector("[data-continue-reading]");
    if (!section || !entry) return;
    const link = section.querySelector("[data-continue-link]");
    link.href = `/storyheaven/story/?id=${encodeURIComponent(entry.storyId)}&episode=${entry.episodeNo}`;
    const image = section.querySelector("[data-continue-cover]");
    image.src = normalizeCover(entry.coverPath);
    image.alt = `${entry.title} 표지`;
    section.querySelector("[data-continue-genre]").textContent = entry.genre || "최근 읽은 연재";
    section.querySelector("[data-continue-title]").textContent = entry.title;
    section.querySelector("[data-continue-episode]").textContent = `${entry.episodeNo}화${entry.episodeTitle ? ` · ${entry.episodeTitle}` : ""} · ${Math.round(entry.progress * 100)}% 읽음`;
    section.querySelector("[data-continue-progress]").style.width = `${Math.round(entry.progress * 100)}%`;
    section.hidden = false;
  }

  function renderDiscovery() {
    renderGenreFilters();
    renderGenreSummary(false);
    renderRanking();
  }

  function renderGenreFilters() {
    const container = document.querySelector("[data-genre-list]");
    if (!container) return;
    const values = [{ name: "", storyCount: null }, ...(state.discovery?.genres || [])];
    container.replaceChildren(...values.map((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "genre-chip";
      button.classList.toggle("is-active", item.name === state.genre);
      button.setAttribute("aria-pressed", String(item.name === state.genre));
      button.textContent = item.name || "전체";
      if (item.storyCount !== null) {
        const count = document.createElement("small");
        count.textContent = String(item.storyCount);
        button.append(count);
      }
      button.addEventListener("click", () => setGenre(item.name));
      return button;
    }));
  }

  function renderGenreSummary(loading) {
    const summary = document.querySelector("[data-genre-summary]");
    if (!summary) return;
    if (loading) {
      summary.textContent = `${state.genre} 연재를 찾고 있습니다.`;
      return;
    }
    if (!state.genre) {
      summary.textContent = `전체 공개 연재 ${state.stories.length || FALLBACK_STORIES.length}편을 보고 있습니다.`;
      return;
    }
    summary.textContent = `${state.genre} 연재 ${state.genreStories?.length || 0}편을 모았습니다.`;
  }

  function renderRanking() {
    const period = state.discovery?.periods?.[state.rankingPeriod];
    const list = document.querySelector("[data-ranking-list]");
    const rule = document.querySelector("[data-ranking-rule]");
    if (!list || !period) return;
    rule.textContent = `${period.label} 동안 받은 회차 추천을 작품별로 합산합니다.`;
    list.replaceChildren(...(period.items || []).map((story, index) => {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = `/storyheaven/story/?id=${encodeURIComponent(story.id)}`;
      const rank = document.createElement("b");
      rank.className = "ranking-number";
      rank.textContent = String(index + 1).padStart(2, "0");
      const copy = document.createElement("span");
      copy.className = "ranking-copy";
      const title = document.createElement("strong");
      title.textContent = story.title;
      const meta = document.createElement("small");
      meta.textContent = `${story.genre || "이야기"} · 공개 ${Number(story.episodeCount || 0)}화`;
      copy.append(title, meta);
      const score = document.createElement("span");
      score.className = "ranking-score";
      const scoreLabel = document.createElement("small");
      scoreLabel.textContent = "추천";
      const scoreValue = document.createElement("b");
      scoreValue.textContent = Number(story.recommendationCount || 0).toLocaleString("ko-KR");
      score.append(scoreLabel, scoreValue);
      link.append(rank, copy, score);
      item.append(link);
      return item;
    }));
    if (!(period.items || []).length) {
      const item = document.createElement("li");
      item.className = "ranking-empty";
      item.textContent = "공개된 연재가 모이면 순위가 시작됩니다.";
      list.append(item);
    }
  }

  function fallbackDiscovery() {
    const genreCounts = new Map();
    FALLBACK_STORIES.forEach((story) => {
      const values = Array.isArray(story.genres) && story.genres.length ? story.genres : [story.genre];
      [...new Set(values.filter(Boolean))].forEach((genre) => genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1));
    });
    const items = [...FALLBACK_STORIES]
      .sort((a, b) => Number(b.viewCount || 0) - Number(a.viewCount || 0))
      .slice(0, 5)
      .map((story) => ({ ...story, recommendationCount: 0 }));
    return {
      genres: [...genreCounts.entries()].map(([name, storyCount]) => ({ name, storyCount })),
      periods: Object.fromEntries([
        ["daily", "최근 1일"], ["weekly", "최근 7일"], ["monthly", "최근 30일"], ["yearly", "최근 365일"]
      ].map(([key, label]) => [key, { label, items }]))
    };
  }

  function renderStoryList(container, stories) {
    if (!container) return;
    container.replaceChildren(...stories.map(createStoryCard));
  }

  function createStoryCard(story) {
    const fragment = document.querySelector("#storyCardTemplate").content.cloneNode(true);
    const card = fragment.querySelector(".story-card");
    card.dataset.storyId = story.id;
    const image = card.querySelector("img");
    image.src = normalizeCover(story.coverPath);
    image.alt = story.title + " 이야기 표지";
    const storyGenres = Array.isArray(story.genres) && story.genres.length ? story.genres : [story.genre].filter(Boolean);
    const visibleGenres = storyGenres.slice(0, 3).join(" · ");
    card.querySelector(".genre").textContent = `${visibleGenres}${storyGenres.length > 3 ? ` +${storyGenres.length - 3}` : ""}` || "이야기";
    card.querySelector(".author").textContent = story.author?.nickname || (isEditorialStory(story) ? "스토리천국 편집부" : "새 이야기꾼");
    card.querySelector("h3 [data-story-link]").textContent = story.title;
    card.querySelectorAll("[data-story-link]").forEach((link) => {
      link.href = "/storyheaven/story/?id=" + encodeURIComponent(story.id);
    });
    card.querySelector(".logline").textContent = story.logline;
    card.querySelector("[data-episode-count]").textContent = story.episodeCount
      ? `연재 ${Number(story.episodeCount)}화`
      : "첫 화 준비 중";
    card.querySelector("[data-latest-episode]").textContent = story.latestEpisodeAt
      ? `최근 ${formatShortDate(story.latestEpisodeAt)}`
      : "";
    card.querySelector("[data-view-count]").textContent = `조회 ${Number(story.viewCount || 0).toLocaleString("ko-KR")}`;

    const originBadge = card.querySelector(".origin-badge");
    if (isEditorialStory(story)) {
      originBadge.textContent = "편집부 연재";
    } else {
      originBadge.textContent = "독자 투고";
      originBadge.classList.add("is-human");
    }
    const editorBadge = card.querySelector(".editor-badge");
    if (story.endorsement?.level) {
      editorBadge.hidden = false;
      editorBadge.textContent = "운영진 추천 " + story.endorsement.level;
      editorBadge.title = story.endorsement.reason || "운영진이 주목한 이야기";
    }
    const tags = card.querySelector(".tag-list");
    (story.tags || []).slice(0, 3).forEach((tag) => {
      const chip = document.createElement("span");
      chip.textContent = "#" + tag;
      tags.append(chip);
    });

    const likeButton = card.querySelector(".like-button");
    likeButton.setAttribute("aria-pressed", String(Boolean(story.likedByMe)));
    likeButton.setAttribute("aria-label", story.title + " 좋아요");
    likeButton.querySelector("b").textContent = String(story.likeCount || 0);
    likeButton.addEventListener("click", () => toggleLike(story, likeButton));
    const competitionNote = card.querySelector(".competition-note");
    competitionNote.textContent = story.weeklyRoundId
      ? `이번 주 ${Number(story.weeklyVoteCount || 0)}표`
      : story.competitionEligible ? "다음 후보" : isEditorialStory(story) ? "샘플 연재" : "순위 제외";
    competitionNote.classList.toggle("is-weekly", Boolean(story.weeklyRoundId));

    const endorseButton = card.querySelector(".endorse-button");
    if (state.profile?.isAdmin) {
      endorseButton.hidden = false;
      endorseButton.textContent = "추천 " + (story.endorsement?.level || 0) + " →";
      endorseButton.addEventListener("click", () => cycleEndorsement(story, endorseButton));
    }
    return fragment;
  }

  function renderWeekly(humanStories) {
    const list = document.querySelector("[data-weekly-list]");
    const eligible = humanStories
      .filter((story) => story.weeklyRoundId)
      .sort((a, b) => Number(b.weeklyVoteCount || 0) - Number(a.weeklyVoteCount || 0))
      .slice(0, 3);
    if (!eligible.length) {
      list.classList.remove("story-grid");
      list.innerHTML = '<div class="empty-state"><strong>첫 주인공을 기다리고 있어요.</strong><span>창립 시즌의 첫 투고가 올라오면 이곳에서 순위가 시작됩니다.</span></div>';
      return;
    }
    list.replaceChildren(...eligible.map(createStoryCard));
    list.classList.add("story-grid");
  }

  function renderRound() {
    const status = document.querySelector("[data-round-status]");
    const clock = document.querySelector("[data-round-clock]");
    const weeklyMeta = document.querySelector("[data-weekly-meta]");
    if (!state.round) {
      status.textContent = "WEEKLY PASS";
      clock.textContent = "창립 시즌 후보를 기다리고 있습니다.";
      weeklyMeta.textContent = "실제 독자의 좋아요만 순위에 반영됩니다.";
      return;
    }
    const labels = { open: "VOTING OPEN", auditing: "VOTE AUDIT", tie_pending: "RUNOFF", confirmed: "RESULT" };
    status.textContent = labels[state.round.status] || "NEXT ROUND";
    if (state.round.status === "open") {
      clock.textContent = `투표 마감 ${formatRemaining(state.round.votingEndsAt)} · ${formatDate(state.round.votingEndsAt)}`;
      weeklyMeta.textContent = `이번 주 후보 ${state.round.entries?.length || 0}편 · 한 계정당 작품별 한 표`;
    } else if (state.round.status === "auditing" || state.round.status === "tie_pending") {
      clock.textContent = state.round.status === "tie_pending" ? "공동 1위 결선 투표를 준비하고 있습니다." : "마감된 표의 유효성을 확인하고 있습니다.";
      weeklyMeta.textContent = "마감 후 감사가 끝날 때까지 순위는 잠정 결과입니다.";
    } else {
      clock.textContent = "확정 결과를 공개했습니다.";
      weeklyMeta.textContent = "확정된 유효표만 표시합니다.";
    }
  }

  function formatRemaining(value) {
    const ms = new Date(value).getTime() - Date.now();
    if (ms <= 0) return "종료";
    const hours = Math.ceil(ms / 3600000);
    return hours >= 24 ? `${Math.floor(hours / 24)}일 ${hours % 24}시간 후` : `${hours}시간 후`;
  }

  function formatDate(value) {
    return new Intl.DateTimeFormat("ko", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  }

  function formatShortDate(value) {
    return new Intl.DateTimeFormat("ko", { month: "short", day: "numeric" }).format(new Date(value));
  }

  async function toggleLike(story, button) {
    if (!state.session) {
      showToast("좋아요는 Google 로그인 후 한 번만 누를 수 있습니다.");
      document.querySelector("[data-login]")?.focus();
      return;
    }
    button.disabled = true;
    const nextLiked = !story.likedByMe;
    try {
      const payload = await api("/api/storyheaven/stories/" + encodeURIComponent(story.id) + "/like", {
        method: nextLiked ? "POST" : "DELETE",
        body: nextLiked ? {} : undefined
      });
      story.likedByMe = payload.liked;
      story.likeCount = payload.likeCount;
      story.weeklyVoteCount = payload.weeklyVoteCount;
      if (payload.roundId) story.weeklyRoundId = payload.roundId;
      renderStories();
    } catch (error) {
      showToast(readableError(error));
    } finally {
      button.disabled = false;
    }
  }

  async function cycleEndorsement(story, button) {
    const level = (Number(story.endorsement?.level || 0) + 1) % 4;
    button.disabled = true;
    try {
      const payload = await api("/api/storyheaven/operator/stories/" + encodeURIComponent(story.id) + "/endorsement", {
        method: "POST",
        body: { level, reason: level ? "운영진이 주목한 이야기" : "" }
      });
      story.endorsement = payload.endorsementLevel
        ? { level: payload.endorsementLevel, reason: payload.reason }
        : null;
      renderStories();
      showToast(level ? "운영진 추천 " + level + "단계로 표시했습니다." : "운영진 추천을 해제했습니다.");
    } catch (error) {
      showToast(readableError(error));
    } finally {
      button.disabled = false;
    }
  }

  function openNicknameDialog() {
    if (!state.session) return;
    const dialog = document.querySelector("[data-nickname-dialog]");
    const input = document.querySelector("#nicknameInput");
    input.value = state.profile?.nickname || "";
    updateNicknameCount();
    document.querySelector(".save-nickname").disabled = true;
    dialog.showModal();
    requestAnimationFrame(() => input.focus());
  }

  function closeNicknameDialog() {
    document.querySelector("[data-nickname-dialog]")?.close();
  }

  function onNicknameInput() {
    updateNicknameCount();
    clearTimeout(state.availabilityTimer);
    const input = document.querySelector("#nicknameInput");
    const status = document.querySelector("[data-nickname-status]");
    const save = document.querySelector(".save-nickname");
    save.disabled = true;
    status.className = "field-status";
    if ([...input.value.trim()].length < 2) {
      status.textContent = "두 글자 이상 입력해주세요.";
      return;
    }
    status.textContent = "사용할 수 있는 이름인지 확인하고 있습니다.";
    state.availabilityTimer = setTimeout(checkNicknameAvailability, 350);
  }

  function updateNicknameCount() {
    document.querySelector("[data-nickname-count]").textContent = String([...document.querySelector("#nicknameInput").value].length);
  }

  async function checkNicknameAvailability() {
    const value = document.querySelector("#nicknameInput").value.trim();
    const status = document.querySelector("[data-nickname-status]");
    const save = document.querySelector(".save-nickname");
    try {
      const result = await api("/api/storyheaven/nicknames/availability?value=" + encodeURIComponent(value), { auth: Boolean(state.session) });
      status.className = "field-status " + (result.available ? "is-good" : "is-bad");
      status.textContent = result.available ? "사용할 수 있는 이름입니다." : nicknameError(result.reason);
      save.disabled = !result.available;
    } catch (error) {
      status.className = "field-status is-bad";
      status.textContent = readableError(error);
      save.disabled = true;
    }
  }

  async function saveNickname(event) {
    event.preventDefault();
    const button = document.querySelector(".save-nickname");
    button.disabled = true;
    try {
      const payload = await api("/api/storyheaven/me/nickname", {
        method: "PATCH",
        body: { nickname: document.querySelector("#nicknameInput").value.trim() }
      });
      state.profile = payload.profile;
      renderAccount();
      closeNicknameDialog();
      showToast("새 활동 이름을 저장했습니다.");
    } catch (error) {
      const status = document.querySelector("[data-nickname-status]");
      status.className = "field-status is-bad";
      status.textContent = readableError(error);
      button.disabled = false;
    }
  }

  async function api(path, options = {}) {
    if (!API_BASE) throw new Error("api_unavailable");
    const headers = new Headers(options.headers || {});
    if (options.body !== undefined) headers.set("Content-Type", "application/json");
    if (options.auth !== false && state.session?.access_token) {
      headers.set("Authorization", "Bearer " + state.session.access_token);
    }
    const response = await fetch(API_BASE + path, {
      method: options.method || "GET",
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || "request_failed_" + response.status);
      error.details = payload.details;
      throw error;
    }
    return payload;
  }

  function normalizeCover(path) {
    if (!path) return "../webtoon/assets/guide/awakening-episode-01-last-train-v4.webp";
    if (path.startsWith("/")) return ".." + path;
    return path;
  }

  function isEditorialStory(story) {
    return ["admin_seed", "ai_seed"].includes(story?.contentOrigin)
      || FALLBACK_STORIES.some((item) => item.id === story?.id);
  }

  function mergeEditorialLibrary(remoteStories, genre = "") {
    const editorialIds = new Set(FALLBACK_STORIES.map((story) => story.id));
    const remoteById = new Map(remoteStories.map((story) => [story.id, story]));
    const readerStories = remoteStories.filter((story) => !isEditorialStory(story));
    const editorialStories = FALLBACK_STORIES.filter((story) => !genre || storyHasGenre(story, genre)).map((local) => {
      const remote = remoteById.get(local.id);
      if (!remote) return local;
      return {
        ...local,
        likeCount: Number(remote.likeCount || 0),
        likedByMe: Boolean(remote.likedByMe),
        viewCount: Number(remote.viewCount || 0),
        weeklyVoteCount: Number(remote.weeklyVoteCount || 0),
        endorsement: remote.endorsement || null
      };
    });
    const extraEditorial = remoteStories.filter((story) => isEditorialStory(story) && !editorialIds.has(story.id));
    return [...readerStories, ...editorialStories, ...extraEditorial];
  }

  function storyHasGenre(story, genre) {
    const values = Array.isArray(story?.genres) && story.genres.length ? story.genres : [story?.genre];
    return values.includes(genre);
  }

  function nicknameError(code) {
    return ({
      nickname_length_out_of_range: "닉네임은 2~20자로 입력해주세요.",
      nickname_invalid_characters: "한글, 영문, 숫자, 띄어쓰기, 밑줄과 하이픈만 사용할 수 있습니다.",
      nickname_contact_info_not_allowed: "연락처나 웹 주소는 닉네임으로 사용할 수 없습니다.",
      nickname_reserved: "서비스 운영에 사용하는 이름이라 선택할 수 없습니다.",
      nickname_unavailable: "이미 사용 중이거나 보호 중인 이름입니다.",
      nickname_change_cooldown: "활동 이름은 마지막 변경 후 30일이 지나야 다시 바꿀 수 있습니다."
    })[code] || "이 이름은 사용할 수 없습니다.";
  }

  function readableError(error) {
    const code = error?.message || "";
    if (code.startsWith("nickname_")) return nicknameError(code);
    return ({
      google_login_required: "Google 로그인이 필요합니다.",
      account_banned: "이용이 제한된 계정입니다.",
      api_unavailable: "서버 연결을 확인해주세요.",
      story_not_found: "이야기를 찾을 수 없습니다.",
      server_error: "잠시 후 다시 시도해주세요."
    })[code] || "요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.";
  }

  function showToast(message) {
    const toast = document.querySelector("[data-toast]");
    clearTimeout(state.toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    state.toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
  }
})();
