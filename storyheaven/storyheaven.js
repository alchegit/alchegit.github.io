(() => {
  const SUPABASE_URL = "https://anjbgbqkeukllsdxgckv.supabase.co";
  const SUPABASE_KEY = "sb_publishable_k6DOGCJ3PVC1av1RVxDt5w_NvOZubsE";
  const API_BASE = (document.querySelector("meta[name='storyheaven-api-base']")?.content || "").replace(/\/+$/, "");
  const FALLBACK_STORIES = [
    ["seed-last-platform", "막차가 떠난 뒤의 승강장", "종착역에 홀로 남은 청소부가 매일 한 칸씩 가까워지는 정체불명의 열차를 발견한다.", "미스터리", ["폐역", "선택"], "../webtoon/assets/guide/awakening-episode-01-last-train-v4.webp"],
    ["seed-rain-memory", "비를 보관하는 잡화점", "잊고 싶은 기억을 빗물에 담아 파는 소녀가 자신의 병만 비어 있음을 발견한다.", "감성판타지", ["비", "기억"], "../webtoon/assets/guide/awakening-episode-02-boot-trail-v4.webp"],
    ["seed-night-auditor", "13번 야간 감사관", "괴물의 민원을 처리하는 말단 공무원이 인간 세계의 마지막 민원서를 접수한다.", "현대판타지", ["공무원", "괴담"], "../webtoon/assets/guide/awakening-episode-03-inspector-v4.webp"],
    ["seed-rescue-window", "구조 요청은 한 번만", "하루에 단 한 명만 구할 수 있는 구조사가 두 곳에서 동시에 울린 신호 앞에 선다.", "재난드라마", ["구조", "가족"], "../webtoon/assets/guide/awakening-episode-04-rescue-v4.webp"],
    ["seed-airlock-choice", "한 사람만 나갈 수 있다", "산소가 끊긴 연구소에서 서로를 의심하는 생존자들이 마지막 문 앞에서 투표를 시작한다.", "SF스릴러", ["밀실", "생존"], "../webtoon/assets/guide/awakening-episode-05-airlock-choice-v4.webp"],
    ["seed-wash-away", "이름을 씻어내는 밤", "지워진 이름이 하수구에서 되살아나는 도시에서 세탁공이 자신의 이름을 발견한다.", "다크판타지", ["이름", "추적"], "../webtoon/assets/guide/awakening-episode-06-pressure-wash-v4.webp"]
  ].map(([id, title, logline, genre, tags, coverPath]) => ({
    id, title, logline, genre, tags, coverPath,
    contentOrigin: "ai_seed",
    competitionEligible: false,
    author: { nickname: "AI 이야기 씨앗", accountType: "system_ai" },
    likeCount: 0,
    likedByMe: false,
    endorsement: null
  }));

  const state = {
    client: null,
    session: null,
    profile: null,
    stories: [],
    round: null,
    filter: "latest",
    availabilityTimer: 0,
    toastTimer: 0
  };

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    bindUi();
    await initAuth();
    await Promise.all([loadFeed(), loadRound()]);
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
    document.querySelector("#nicknameInput")?.addEventListener("input", onNicknameInput);
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
    state.client.auth.onAuthStateChange((_event, session) => {
      state.session = session;
      if (session) loadProfile();
      else {
        state.profile = null;
        renderAccount();
      }
    });
    if (state.session) await loadProfile();
    else renderAccount();
  }

  async function login() {
    if (!state.client) {
      showToast("로그인 모듈을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    await state.client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.href.split("#")[0] }
    });
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
    loginButton.hidden = signedIn;
    logoutButton.hidden = !signedIn;
    nicknameButton.hidden = !signedIn;
    if (signedIn) {
      nicknameButton.textContent = state.profile?.nickname || "닉네임 설정";
      nicknameButton.title = "공개 닉네임 변경";
    }
  }

  async function loadFeed() {
    try {
      const payload = await api("/api/storyheaven/feed?limit=30", { auth: Boolean(state.session) });
      state.stories = Array.isArray(payload.stories) ? payload.stories : [];
    } catch {
      state.stories = FALLBACK_STORIES;
      showToast("현재 AI 시드 미리보기로 보여드리고 있습니다.");
    }
    renderStories();
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

  function renderStories() {
    const humanStories = state.stories.filter((story) => story.contentOrigin !== "ai_seed");
    const seedStories = state.stories.filter((story) => story.contentOrigin === "ai_seed");
    const sortStories = (stories) => [...stories].sort((a, b) => (
      state.filter === "popular"
        ? Number(b.likeCount || 0) - Number(a.likeCount || 0)
        : new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0)
    ));
    renderStoryList(document.querySelector("[data-human-feed]"), sortStories(humanStories));
    renderStoryList(document.querySelector("[data-seed-feed]"), sortStories(seedStories.length ? seedStories : FALLBACK_STORIES));
    document.querySelector("[data-human-empty]").hidden = humanStories.length > 0;
    renderWeekly(humanStories);
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
    card.querySelector(".genre").textContent = story.genre || "이야기";
    card.querySelector(".author").textContent = story.author?.nickname || "이야기씨앗";
    card.querySelector("h3 [data-story-link]").textContent = story.title;
    card.querySelectorAll("[data-story-link]").forEach((link) => {
      link.href = "/storyheaven/story/?id=" + encodeURIComponent(story.id);
    });
    card.querySelector(".logline").textContent = story.logline;

    const originBadge = card.querySelector(".origin-badge");
    if (story.contentOrigin === "ai_seed") {
      originBadge.textContent = "AI 시드 스토리";
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
    competitionNote.textContent = story.weeklyRoundId ? `이번 주 ${Number(story.weeklyVoteCount || 0)}표` : story.competitionEligible ? "다음 후보" : "순위 제외";
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
    if (path.startsWith("/webtoon/")) return ".." + path;
    return path;
  }

  function nicknameError(code) {
    return ({
      nickname_length_out_of_range: "닉네임은 2~20자로 입력해주세요.",
      nickname_invalid_characters: "한글, 영문, 숫자, 띄어쓰기, 밑줄과 하이픈만 사용할 수 있습니다.",
      nickname_contact_info_not_allowed: "연락처나 웹 주소는 닉네임으로 사용할 수 없습니다.",
      nickname_reserved: "서비스 운영에 사용하는 이름이라 선택할 수 없습니다.",
      nickname_unavailable: "이미 사용 중이거나 보호 중인 이름입니다."
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
