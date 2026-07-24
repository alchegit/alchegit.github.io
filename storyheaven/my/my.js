(() => {
  const state = { stories: [], notifications: [], filter: "all", loaded: false };

  document.addEventListener("DOMContentLoaded", async () => {
    bindFilters();
    await StoryHeavenCommon.init(onAuth);
  });

  function bindFilters() {
    document.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("active", item === button));
      renderStories();
    }));
  }

  async function onAuth(auth) {
    const signedIn = Boolean(auth.session);
    document.querySelector("[data-login-gate]").hidden = signedIn;
    document.querySelector("[data-my-content]").hidden = !signedIn;
    if (signedIn && !state.loaded) {
      state.loaded = true;
      await loadAll();
    }
  }

  async function loadAll() {
    try {
      const [stories, notifications] = await Promise.all([
        StoryHeavenCommon.api("/api/storyheaven/me/stories"),
        StoryHeavenCommon.api("/api/storyheaven/me/notifications")
      ]);
      state.stories = stories.stories || [];
      state.notifications = notifications.notifications || [];
      renderStories();
      renderNotifications();
    } catch (error) {
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    }
  }

  function renderStories() {
    const stories = state.filter === "all" ? state.stories : state.stories.filter((story) => story.status === state.filter);
    const list = document.querySelector("[data-story-list]");
    list.replaceChildren(...stories.map(storyCard));
    document.querySelector("[data-empty]").hidden = stories.length > 0;
  }

  function renderNotifications() {
    const panel = document.querySelector("[data-notification-panel]");
    panel.hidden = state.notifications.length === 0;
    const unread = state.notifications.filter((item) => !item.read).length;
    document.querySelector("[data-unread-count]").textContent = unread ? `읽지 않음 ${unread}` : "모두 확인";
    document.querySelector("[data-notification-list]").replaceChildren(...state.notifications.map(notificationCard));
  }

  function notificationCard(notification) {
    const article = document.createElement("article");
    article.className = `notification-row${notification.read ? "" : " unread"}`;
    article.innerHTML = `<div><p class="eyebrow">${notification.read ? "NOTICE" : "NEW NOTICE"} · ${formatDate(notification.createdAt)}</p><h3>${escapeHtml(notification.title)}</h3><p>${escapeHtml(notification.message)}</p></div><div class="notification-actions"></div>`;
    const actions = article.querySelector(".notification-actions");
    if (!notification.read) {
      const read = document.createElement("button");
      read.className = "button secondary";
      read.type = "button";
      read.textContent = "읽음";
      read.addEventListener("click", () => markRead(notification, article));
      actions.append(read);
    }
    if (notification.actionPath && notification.storyId) {
      const link = document.createElement("a");
      link.className = "button secondary";
      link.href = `/storyheaven/story/?id=${encodeURIComponent(notification.storyId)}`;
      link.textContent = "작품 보기";
      actions.append(link);
    }
    if (notification.canAppeal && notification.reportId) {
      const form = document.createElement("div");
      form.className = "appeal-form";
      form.innerHTML = `<label>이의제기 사유<textarea minlength="20" maxlength="1000" placeholder="판정을 다시 살펴봐야 하는 사실과 근거를 20자 이상 적어주세요."></textarea></label><button class="button warning" type="button">이의제기 제출</button>`;
      form.querySelector("button").addEventListener("click", () => submitAppeal(notification, form));
      article.append(form);
    } else if (notification.appeal) {
      const status = document.createElement("span");
      status.className = "status-chip";
      status.textContent = notification.appeal.status === "pending" ? "이의 검토 중" : notification.appeal.status === "overturned" ? "이의 인용" : "기존 판정 유지";
      actions.append(status);
    }
    return article;
  }

  async function markRead(notification, article) {
    try {
      await StoryHeavenCommon.api(`/api/storyheaven/me/notifications/${encodeURIComponent(notification.id)}/read`, { method: "POST", body: {} });
      notification.read = true;
      article.classList.remove("unread");
      renderNotifications();
    } catch (error) {
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    }
  }

  async function submitAppeal(notification, form) {
    const reason = form.querySelector("textarea").value.trim();
    if (reason.length < 20) {
      StoryHeavenCommon.toast("이의제기 사유를 20자 이상 적어주세요.");
      return;
    }
    const button = form.querySelector("button");
    button.disabled = true;
    try {
      const payload = await StoryHeavenCommon.api(`/api/storyheaven/reports/${encodeURIComponent(notification.reportId)}/appeal`, { method: "POST", body: { reason } });
      notification.canAppeal = false;
      notification.appeal = { id: payload.appealId, status: "pending" };
      StoryHeavenCommon.toast("이의제기가 접수되었습니다.");
      renderNotifications();
    } catch (error) {
      button.disabled = false;
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    }
  }

  function storyCard(story) {
    const article = document.createElement("article");
    article.className = "list-panel";
    const status = statusInfo(story);
    article.innerHTML = `<header><div><p class="eyebrow">${escapeHtml(story.genre || "이야기")} · REV ${Number(story.revisionNo || 0)}</p><h3>${escapeHtml(story.title)}</h3></div><span class="status-chip">${status.label}</span></header><p>${escapeHtml(story.logline || "")}</p><div class="list-meta"><span>수정 ${formatDate(story.updatedAt)}</span>${story.eligibilityScore == null ? "" : `<span>검수 ${story.eligibilityScore}점</span>`}${story.likeCount ? `<span>좋아요 ${story.likeCount}</span>` : ""}</div>${story.reviewNote ? `<p><strong>검수 메모</strong><br>${escapeHtml(story.reviewNote)}</p>` : ""}<div class="list-actions">${story.status === "draft" ? `<a class="button" href="/storyheaven/write/?id=${encodeURIComponent(story.id)}">이어 쓰기</a>` : ""}${story.status === "published" ? `<a class="button secondary" href="/storyheaven/story/?id=${encodeURIComponent(story.id)}">공개 페이지</a>` : ""}</div>`;
    return article;
  }

  function statusInfo(story) {
    if (story.status === "moderation") return { label: "검수 중" };
    if (story.status === "published") return { label: "공개" };
    if (story.status === "archived") return { label: "반려" };
    if (story.reviewDecision === "changes_requested") return { label: "보강 필요" };
    return { label: "초안" };
  }

  function formatDate(value) {
    return value ? new Intl.DateTimeFormat("ko", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "-";
  }

  function escapeHtml(value) {
    const span = document.createElement("span");
    span.textContent = value || "";
    return span.innerHTML;
  }
})();
