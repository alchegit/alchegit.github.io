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
    readableError,
    createHelpButton
  };

  let helpDialog = null;
  let helpReturnFocus = null;

  document.addEventListener("DOMContentLoaded", bindHelp);

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
    renderAccount();
    notify();
    if (state.session) await loadProfile();
    state.client.auth.onAuthStateChange(async (_event, session) => {
      const previousUserId = state.session?.user?.id || null;
      const previousAccessToken = state.session?.access_token || null;
      state.session = session;
      if (!session) state.profile = null;
      renderAccount();
      notify();
      if (session && (
        session.user?.id !== previousUserId
        || session.access_token !== previousAccessToken
      )) await loadProfile();
    });
    return state;
  }

  function bindAccountButtons() {
    document.querySelectorAll("[data-common-login]").forEach((button) => button.addEventListener("click", login));
    document.querySelectorAll("[data-common-logout]").forEach((button) => button.addEventListener("click", logout));
  }

  function bindHelp() {
    document.addEventListener("click", (event) => {
      const button = event.target.closest("[data-help]");
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      openHelp(button);
    });
  }

  function createHelpButton(title, body) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "help-button";
    button.dataset.help = "";
    button.dataset.helpTitle = title;
    button.dataset.helpBody = body;
    button.setAttribute("aria-label", `도움말: ${title}`);
    button.textContent = "?";
    return button;
  }

  function openHelp(button) {
    helpReturnFocus = button;
    const dialog = ensureHelpDialog();
    dialog.querySelector("[data-help-dialog-title]").textContent = button.dataset.helpTitle || "도움말";
    const body = dialog.querySelector("[data-help-dialog-body]");
    body.replaceChildren(...String(button.dataset.helpBody || "추가 설명이 없습니다.")
      .split(/\n{2,}/u)
      .map((paragraph) => {
        const element = document.createElement("p");
        element.textContent = paragraph.trim();
        return element;
      }));
    if (dialog.showModal) {
      dialog.showModal();
    } else {
      dialog.hidden = false;
      dialog.setAttribute("open", "");
    }
    dialog.querySelector("[data-help-close]")?.focus();
  }

  function ensureHelpDialog() {
    if (helpDialog) return helpDialog;
    helpDialog = document.createElement("dialog");
    helpDialog.className = "help-dialog";
    helpDialog.setAttribute("aria-labelledby", "storyheavenHelpTitle");
    helpDialog.innerHTML = `
      <form method="dialog">
        <button class="dialog-close" type="button" data-help-close aria-label="도움말 닫기">×</button>
        <p class="eyebrow">HELP</p>
        <h2 id="storyheavenHelpTitle" data-help-dialog-title>도움말</h2>
        <div class="help-dialog-body" data-help-dialog-body></div>
      </form>
    `;
    helpDialog.addEventListener("click", (event) => {
      if (event.target === helpDialog) closeHelpDialog();
    });
    helpDialog.querySelector("[data-help-close]").addEventListener("click", closeHelpDialog);
    helpDialog.addEventListener("close", () => {
      if (helpReturnFocus?.isConnected) helpReturnFocus.focus();
      helpReturnFocus = null;
    });
    document.body.append(helpDialog);
    return helpDialog;
  }

  function closeHelpDialog() {
    if (!helpDialog) return;
    if (helpDialog.open) helpDialog.close();
    else {
      helpDialog.hidden = true;
      helpDialog.removeAttribute("open");
    }
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
    const isAdmin = Boolean(state.profile?.isAdmin);
    document.querySelectorAll("[data-common-login]").forEach((element) => { element.hidden = signedIn; });
    document.querySelectorAll("[data-common-logout]").forEach((element) => { element.hidden = !signedIn; });
    document.querySelectorAll("[data-common-user]").forEach((element) => {
      element.hidden = !signedIn;
      element.textContent = state.profile?.nickname || "로그인 중";
    });
    document.querySelectorAll("[data-storyheaven-admin-menu]").forEach((element) => { element.hidden = !isAdmin; });
    renderAdminNavigation();
  }

  function renderAdminNavigation() {
    const nav = document.querySelector(".main-nav");
    if (!nav) return;
    const serialLink = nav.querySelector("[data-storyheaven-admin-nav]");
    const webtoonLink = nav.querySelector("[data-storyheaven-admin-webtoon-nav]");
    const membersLink = nav.querySelector("[data-storyheaven-admin-members-nav]");
    if (!state.profile?.isAdmin) {
      serialLink?.remove();
      webtoonLink?.remove();
      membersLink?.remove();
      return;
    }
    if (!serialLink && !nav.querySelector('a[href="/storyheaven/operator/serial/"]')) {
      const link = document.createElement("a");
      link.href = "/storyheaven/operator/serial/";
      link.dataset.storyheavenAdminNav = "";
      link.textContent = "소설 연재 관리";
      link.setAttribute("aria-label", "관리자 전용 소설 연재 관리");
      nav.append(link);
    }
    if (!webtoonLink && !nav.querySelector('a[href^="/webtoon/"]')) {
      const link = document.createElement("a");
      link.href = "/webtoon/";
      link.dataset.storyheavenAdminWebtoonNav = "";
      link.textContent = "웹툰 스튜디오";
      link.setAttribute("aria-label", "관리자 전용 웹툰 스튜디오 이동");
      nav.append(link);
    }
    if (!membersLink && !nav.querySelector('a[href="/operator/members/"]')) {
      const link = document.createElement("a");
      link.href = "/operator/members/";
      link.dataset.storyheavenAdminMembersNav = "";
      link.textContent = "회원 관리";
      link.setAttribute("aria-label", "관리자 전용 회원 관리 이동");
      nav.append(link);
    }
  }

  function notify() {
    state.listeners.forEach((listener) => listener(state));
  }

  async function login() {
    if (!state.client) {
      toast("로그인 모듈을 불러오지 못했습니다.");
      return;
    }
    const buttons = [...document.querySelectorAll("[data-common-login]")];
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
      toast(detail.includes("provider") && (detail.includes("not enabled") || detail.includes("unsupported"))
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
      error.status = response.status;
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
      episode_validation_failed: "표시된 회차 원고의 분량과 형식을 확인해주세요.",
      episode_not_found: "회차를 찾을 수 없습니다.",
      episode_not_editable: "검수 중이거나 공개된 회차는 이 화면에서 수정할 수 없습니다.",
      episode_not_submittable: "현재 검수 요청을 보낼 수 없는 회차입니다.",
      episode_review_required: "첫 회차를 먼저 공개 승인한 뒤 작품 소개를 승인해주세요.",
      episode_draft_limit_reached: "한 작품에는 회차 초안을 최대 10편까지 보관할 수 있습니다.",
      episode_review_batch_size_invalid: "한 번에 1화부터 최대 10화까지 검수할 수 있습니다.",
      episode_draft_batch_size_invalid: "한 번에 저장할 회차를 1화부터 최대 10화까지 선택해주세요.",
      episode_draft_batch_not_sequential: "새 회차는 이전 회차 다음 번호부터 순서대로 추가해주세요.",
      episode_review_batch_duplicate_number: "같은 회차 번호가 두 번 포함되어 있습니다.",
      episode_review_batch_not_sequential: "함께 검수할 회차는 번호가 순서대로 이어져야 합니다.",
      episode_review_batch_duplicate_content: "같은 내용의 회차가 묶음 안에 반복되어 있습니다.",
      episode_duplicate_manuscript: "이미 다른 회차에 저장한 것과 같은 원고입니다.",
      story_review_rate_limited: "짧은 시간에 검수 요청이 많았습니다. 한 시간 뒤 다시 시도해주세요.",
      story_review_already_in_progress: "진행 중인 자동 검수가 있습니다. 결과가 나온 뒤 다음 원고를 요청해주세요.",
      episode_series_limit_reached: "한 작품의 회차는 최대 300화까지 등록할 수 있습니다.",
      episode_request_too_large: "한 번에 전송할 수 있는 원고 크기를 넘었습니다.",
      invalid_episode_number: "올바른 회차 번호가 아닙니다.",
      invalid_episode_reaction: "선택할 수 없는 독자 반응입니다.",
      invalid_episode_recommendation: "추천과 비추천 중 하나를 선택해주세요.",
      admin_episode_vote_not_allowed: "운영자 평가는 독자 추천 수에 포함되지 않습니다.",
      comment_required: "댓글 내용을 입력해주세요.",
      comment_too_short: "댓글을 두 글자 이상 입력해주세요.",
      comment_too_long: "댓글은 500자까지 작성할 수 있습니다.",
      comment_unsafe_content: "실행 코드나 위험한 명령이 포함된 문장은 등록할 수 없습니다.",
      comment_too_many_urls: "댓글에는 웹 주소를 하나까지만 넣을 수 있습니다.",
      comment_parent_not_found: "답글을 달 댓글을 찾을 수 없습니다.",
      comment_reply_depth_exceeded: "답글에는 다시 답글을 달 수 없습니다.",
      rate_limited: "요청이 너무 잦습니다. 잠시 뒤 다시 시도해주세요.",
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
      serial_engine_disabled: "연재 엔진이 아직 서버에서 시작되지 않았습니다.",
      serial_system_paused: "자동 연재가 전체 중지 상태입니다. 다시 시작한 뒤 이용해주세요.",
      rate_limited: "요청이 많아 잠시 제한되었습니다. 잠시 후 다시 시도해주세요.",
      serial_system_action_invalid: "자동 연재 시스템 동작을 다시 선택해주세요.",
      serial_schedule_invalid: "연재 이름, 기본 장르 1~3개, 세부장르 전체 1~10개와 기획 원칙을 확인해주세요.",
      serial_schedule_not_found: "제작 일정을 찾을 수 없습니다.",
      serial_queue_not_found: "재개할 자동 연재 작업을 찾을 수 없습니다.",
      serial_queue_not_retryable: "지금 다시 시작할 수 있는 중단 단계가 없습니다.",
      serial_queue_not_waiting: "취소할 수 있는 대기 작업이 없습니다.",
      serial_queue_completed_cannot_cancel: "이미 완료된 작품 기록은 로그 숨김으로 숨길 수 없습니다.",
      serial_queue_running_cannot_cancel: "진행 중인 작업은 취소할 수 없습니다. 멈춘 경우에는 단계 다시 시작을 사용해주세요.",
      serial_history_not_found: "숨길 작업 로그를 찾을 수 없습니다. 화면을 새로고침한 뒤 다시 확인해주세요.",
      serial_history_running_cannot_hide: "실제로 실행 중인 AI 작업은 로그 숨김 처리할 수 없습니다. 멈춘 경우 중단 위치부터 재개를 먼저 사용해주세요.",
      serial_history_waiting_cannot_hide: "아직 대기 중인 작업은 로그 숨김이 아니라 대기 취소로 처리해주세요.",
      serial_history_completed_cannot_hide: "이미 완료된 작품 기록은 로그 숨김으로 숨길 수 없습니다.",
      serial_series_volume_count_invalid: "전체 권수는 1권 이상 30권 이하로 설정해주세요.",
      serial_episodes_per_volume_invalid: "1권당 본편 화수는 10화 이상 50화 이하로 설정해주세요.",
      serial_continuation_batch_count_invalid: "연속 제작 수는 1화, 3화, 5화 중에서 선택해주세요.",
      serial_story_not_system_owned: "운영 예시 작품만 자동 연재 엔진에 연결할 수 있습니다.",
      serial_story_archived: "숨긴 작품은 제작을 시작할 수 없습니다. 연재 작품 관리에서 먼저 복원해주세요.",
      serial_plan_required: "설정집과 장기 흐름을 먼저 만들어주세요.",
      serial_episode_already_queued: "이 회차는 이미 제작 중입니다.",
      serial_episode_sequence_required: "이전 회차를 먼저 공개한 뒤 다음 회차를 만들어주세요.",
      serial_arc_episode_not_planned: "현재 장기 흐름에 포함되지 않은 회차입니다.",
      serial_continuation_episode_invalid: "최신 공개 회차에서 다음 화를 요청해주세요.",
      serial_continuation_latest_episode_required: "가장 최근에 공개된 회차에서만 다음 화를 요청할 수 있습니다.",
      serial_continuation_unavailable: "이 작품은 자동 연재와 연결되어 있지 않습니다.",
      serial_recommendation_threshold_pending: "추천 11개가 모이면 다음 화를 준비합니다.",
      serial_schedule_paused: "자동 연재가 멈춰 있어 다음 화를 요청할 수 없습니다.",
      serial_story_visibility_invalid: "작품의 공개 상태를 다시 선택해주세요.",
      serial_story_continuation_mode_invalid: "다음 화 제작 방식을 다시 선택해주세요.",
      serial_private_story_auto_invalid: "비공개 작품은 자동 연재할 수 없습니다. 수동 또는 일시 정지를 선택해주세요.",
      serial_archived_story_must_end: "보관 작품은 연재 종료 상태로 저장해주세요.",
      serial_story_publish_requires_episode: "공개할 회차가 한 편 이상 있어야 작품을 공개할 수 있습니다.",
      serial_story_auto_continuation_disabled: "이 작품은 추천 기반 자동 연재 대상이 아닙니다.",
      serial_story_continuation_paused: "이 작품은 다음 화 제작이 멈춰 있습니다.",
      serial_run_not_found: "실행 기록을 찾을 수 없습니다.",
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
