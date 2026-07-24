(() => {
  const SUPABASE_URL = "https://anjbgbqkeukllsdxgckv.supabase.co";
  const SUPABASE_KEY = "sb_publishable_k6DOGCJ3PVC1av1RVxDt5w_NvOZubsE";
  const API_BASE = (document.querySelector("meta[name='storyheaven-api-base']")?.content || "").replace(/\/+$/, "");
  const state = { client: null, session: null, profile: null, listeners: [] };

  window.StoryHeavenCommon = {
    state,
    init,
    api,
    login,
    logout,
    toast,
    readableError
  };

  async function init(listener) {
    if (typeof listener === "function") state.listeners.push(listener);
    bindAccountButtons();
    if (!window.supabase?.createClient) {
      renderAccount();
      notify();
      return state;
    }
    state.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    const { data } = await state.client.auth.getSession();
    state.session = data.session;
    if (state.session) await loadProfile();
    else {
      renderAccount();
      notify();
    }
    state.client.auth.onAuthStateChange(async (_event, session) => {
      state.session = session;
      state.profile = null;
      if (session) await loadProfile();
      else {
        renderAccount();
        notify();
      }
    });
    return state;
  }

  function bindAccountButtons() {
    document.querySelectorAll("[data-common-login]").forEach((button) => button.addEventListener("click", login));
    document.querySelectorAll("[data-common-logout]").forEach((button) => button.addEventListener("click", logout));
  }

  async function loadProfile() {
    try {
      const payload = await api("/api/storyheaven/profile");
      state.profile = payload.profile;
    } catch (error) {
      toast(readableError(error));
    }
    renderAccount();
    notify();
  }

  function renderAccount() {
    const signedIn = Boolean(state.session);
    document.querySelectorAll("[data-common-login]").forEach((element) => { element.hidden = signedIn; });
    document.querySelectorAll("[data-common-logout]").forEach((element) => { element.hidden = !signedIn; });
    document.querySelectorAll("[data-common-user]").forEach((element) => {
      element.hidden = !signedIn;
      element.textContent = state.profile?.nickname || "로그인 중";
    });
  }

  function notify() {
    state.listeners.forEach((listener) => listener(state));
  }

  async function login() {
    if (!state.client) {
      toast("로그인 모듈을 불러오지 못했습니다.");
      return;
    }
    await state.client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.href.split("#")[0] }
    });
  }

  async function logout() {
    await state.client?.auth.signOut();
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
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || "request_failed");
      error.details = payload.details || [];
      throw error;
    }
    return payload;
  }

  function readableError(error) {
    return ({
      google_login_required: "Google 로그인이 필요합니다.",
      account_banned: "이용이 제한된 계정입니다.",
      storyheaven_nickname_required: "공개 활동 이름을 먼저 확정해주세요.",
      story_validation_failed: "표시된 원고 항목을 확인해주세요.",
      story_consent_required: "필수 확인 사항에 동의해주세요.",
      story_not_editable: "검수 중인 원고는 수정할 수 없습니다.",
      story_not_submittable: "현재 제출할 수 없는 원고입니다.",
      story_draft_limit_reached: "초안은 최대 10편까지 보관할 수 있습니다.",
      author_cannot_like_own_story: "자신의 이야기에는 좋아요를 누를 수 없습니다.",
      round_author_entry_exists: "이번 라운드에는 이미 다른 이야기가 후보로 등록되어 있습니다.",
      round_voting_closed: "현재 이 이야기의 주간 투표 시간이 아닙니다.",
      vote_invalidated_by_operator: "운영 검수에서 무효 처리된 표는 다시 사용할 수 없습니다.",
      round_not_in_audit: "마감 감사 중인 라운드에서만 처리할 수 있습니다.",
      vote_already_invalidated: "이미 무효 처리된 표입니다.",
      entry_already_disqualified: "이미 후보에서 제외된 작품입니다.",
      moderation_reason_too_short: "조치 근거를 10자 이상 적어주세요.",
      author_cannot_report_own_story: "자신의 이야기에는 신고를 제출할 수 없습니다.",
      invalid_report_category: "신고 유형을 다시 선택해주세요.",
      report_details_too_short: "신고 내용을 20자 이상 구체적으로 적어주세요.",
      report_already_submitted: "같은 유형의 신고가 이미 접수되었습니다.",
      referenceUrl_invalid: "참고 주소는 안전한 HTTPS 주소만 사용할 수 있습니다.",
      appeal_reason_too_short: "이의제기 사유를 20자 이상 적어주세요.",
      appeal_already_submitted: "이 신고에는 이미 이의제기를 제출했습니다.",
      appeal_window_closed: "이의제기 기간 7일이 지났습니다.",
      report_not_appealable: "현재 이의제기할 수 있는 판정이 아닙니다.",
      report_resolution_too_short: "판정 근거를 20자 이상 적어주세요.",
      appeal_resolution_too_short: "이의제기 판정 근거를 20자 이상 적어주세요.",
      admin_account_required: "관리자만 접근할 수 있습니다.",
      api_unavailable: "서버 연결 주소를 확인해주세요.",
      server_error: "서버에서 요청을 처리하지 못했습니다."
    })[error?.message] || "요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.";
  }

  function toast(message) {
    let element = document.querySelector("[data-common-toast]");
    if (!element) {
      element = document.createElement("div");
      element.className = "toast";
      element.dataset.commonToast = "";
      element.setAttribute("role", "status");
      document.body.append(element);
    }
    element.textContent = message;
    element.hidden = false;
    clearTimeout(element._timer);
    element._timer = setTimeout(() => { element.hidden = true; }, 3600);
  }
})();
