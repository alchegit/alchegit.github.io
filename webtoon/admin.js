(() => {
  document.addEventListener("DOMContentLoaded", () => {
    const consoleRoot = document.querySelector("[data-admin-console]");
    const lockedRoot = document.querySelector("[data-admin-locked]");
    if (!consoleRoot || !lockedRoot || !window.WebtoonAdminApi) {
      return;
    }

    let loaded = false;
    const syncAccess = (state = window.WebtoonAdminApi.getAccessState()) => {
      if (!state.ready) {
        return;
      }
      const allowed = Boolean(state.isAdmin);
      consoleRoot.hidden = !allowed;
      lockedRoot.hidden = allowed;
      if (allowed) {
        consoleRoot.querySelectorAll(".app-reveal").forEach((element) => element.classList.add("is-visible"));
      }
      if (allowed && !loaded) {
        loaded = true;
        if (document.body.classList.contains("page-operator")) {
          initMemberOperations();
        }
        if (document.body.classList.contains("page-plan")) {
          initPrivatePlan();
        }
      }
    };

    document.addEventListener("webtoon:access-change", (event) => syncAccess(event.detail));
    syncAccess();
  });

  function initMemberOperations() {
    const api = window.WebtoonAdminApi;
    const rows = byId("adminUserRows");
    const empty = byId("adminUsersEmpty");
    const eventsRoot = byId("adminSecurityEvents");
    const dialog = byId("adminUserDialog");
    const search = byId("adminUserSearch");
    let users = [];
    let selected = null;
    let searchTimer = 0;

    const refresh = async () => {
      try {
        const query = search?.value.trim() || "";
        const [userData, securityData] = await Promise.all([
          api.request(`/api/webtoon/admin/users?limit=100&search=${encodeURIComponent(query)}`),
          api.request("/api/webtoon/admin/security/events?limit=40")
        ]);
        users = Array.isArray(userData?.users) ? userData.users : [];
        renderUsers();
        renderEvents(Array.isArray(securityData?.events) ? securityData.events : []);
      } catch (error) {
        toast(adminErrorMessage(error));
      }
    };

    const renderUsers = () => {
      rows.replaceChildren();
      empty.hidden = users.length > 0;
      byId("adminTotalUsers").textContent = String(users.length);
      byId("adminActiveUsers").textContent = String(users.filter((user) => user.accountStatus !== "banned").length);
      byId("adminBannedUsers").textContent = String(users.filter((user) => user.accountStatus === "banned").length);

      users.forEach((user) => {
        const row = document.createElement("tr");
        row.append(
          tableCell(user.displayName || user.email, user.email),
          tableCell(user.isAdmin ? "999+" : String(user.acorns)),
          tableCell(user.isAdmin ? "관리자" : user.accountStatus === "banned" ? "제명" : "이용 가능"),
          tableCell(formatDate(user.lastSeenAt), `${user.userAgent || "unknown"} · ${user.ipFingerprint || "식별값 없음"}`)
        );
        const actionCell = document.createElement("td");
        const action = document.createElement("button");
        action.className = "tool-button admin-row-action";
        action.type = "button";
        action.textContent = user.isAdmin ? "보호됨" : "관리";
        action.disabled = Boolean(user.isAdmin);
        action.addEventListener("click", () => openUser(user));
        actionCell.append(action);
        row.append(actionCell);
        rows.append(row);
      });
    };

    const renderEvents = (events) => {
      eventsRoot.replaceChildren();
      byId("adminSecurityCount").textContent = String(events.length);
      if (!events.length) {
        const message = document.createElement("p");
        message.className = "admin-empty";
        message.textContent = "최근 보안 이벤트가 없습니다.";
        eventsRoot.append(message);
        return;
      }
      events.forEach((event) => {
        const item = document.createElement("article");
        item.className = `security-event severity-${event.severity || "info"}`;
        const title = document.createElement("strong");
        title.textContent = eventLabel(event.eventType);
        const meta = document.createElement("span");
        const member = users.find((user) => user.userId === event.userId);
        meta.textContent = `${member?.email || event.userId || "비회원"} · ${formatDate(event.createdAt)} · ${event.userAgent || "unknown"} · ${event.ipFingerprint || "식별값 없음"}`;
        item.append(title, meta);
        eventsRoot.append(item);
      });
    };

    const openUser = (user) => {
      selected = user;
      byId("adminDialogName").textContent = user.displayName || "회원 관리";
      byId("adminDialogEmail").textContent = user.email || "--";
      byId("adminDialogStatus").textContent = user.accountStatus === "banned" ? "제명" : "이용 가능";
      byId("adminDialogFingerprint").textContent = user.ipFingerprint || "기록 없음";
      byId("adminDialogAgent").textContent = user.userAgent || "unknown";
      byId("adminDialogLastSeen").textContent = formatDate(user.lastSeenAt);
      byId("adminDialogLoginCount").textContent = `${Number(user.loginCount || 0)}회`;
      byId("adminAcornBalance").value = String(user.acorns || 0);
      byId("adminAcornReason").value = "";
      byId("adminBanReason").value = user.banReason || "";
      byId("adminToggleBan").textContent = user.accountStatus === "banned" ? "계정 복구" : "계정 제명";
      byId("adminToggleBan").classList.toggle("primary", user.accountStatus === "banned");
      dialog.showModal();
    };

    byId("adminRefresh")?.addEventListener("click", refresh);
    search?.addEventListener("input", () => {
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(refresh, 250);
    });
    byId("adminSaveAcorns")?.addEventListener("click", async (event) => {
      if (!selected) {
        return;
      }
      const button = event.currentTarget;
      button.disabled = true;
      try {
        await api.request(`/api/webtoon/admin/users/${encodeURIComponent(selected.userId)}/acorns`, {
          method: "PATCH",
          body: JSON.stringify({
            balance: Number(byId("adminAcornBalance").value),
            reason: byId("adminAcornReason").value.trim() || "관리자 조정"
          })
        });
        dialog.close();
        await refresh();
        toast("도토리 잔액을 저장했습니다.");
      } catch (error) {
        toast(adminErrorMessage(error));
      } finally {
        button.disabled = false;
      }
    });
    byId("adminToggleBan")?.addEventListener("click", async (event) => {
      if (!selected) {
        return;
      }
      const banning = selected.accountStatus !== "banned";
      const reason = byId("adminBanReason").value.trim();
      if (banning && reason.length < 3) {
        toast("제명 사유를 3자 이상 입력해주세요.");
        return;
      }
      if (banning && !window.confirm(`${selected.email} 계정을 제명할까요?`)) {
        return;
      }
      const button = event.currentTarget;
      button.disabled = true;
      try {
        const result = await api.request(`/api/webtoon/admin/users/${encodeURIComponent(selected.userId)}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: banning ? "banned" : "active", reason })
        });
        dialog.close();
        await refresh();
        const providerNote = result?.providerBanSynced ? " Google 로그인에도 반영했습니다." : " 서비스 API에서 즉시 차단했습니다.";
        toast(`${banning ? "계정을 제명했습니다." : "계정을 복구했습니다."}${providerNote}`);
      } catch (error) {
        toast(adminErrorMessage(error));
      } finally {
        button.disabled = false;
      }
    });

    refresh();
  }

  function initPrivatePlan() {
    const content = byId("adminPlanContent");
    const load = async () => {
      content.textContent = "서버에서 설계 문서를 확인하고 있습니다.";
      try {
        const data = await window.WebtoonAdminApi.request("/api/webtoon/admin/plan");
        if (!data?.available) {
          content.textContent = data?.message || "비공개 설계 문서가 아직 서버에 연결되지 않았습니다.";
          return;
        }
        const pre = document.createElement("pre");
        pre.className = "admin-plan-document";
        pre.textContent = JSON.stringify(data.plan, null, 2);
        content.replaceChildren(pre);
      } catch (error) {
        content.textContent = adminErrorMessage(error);
      }
    };
    byId("adminPlanRefresh")?.addEventListener("click", load);
    load();
  }

  function tableCell(primary, secondary = "") {
    const cell = document.createElement("td");
    const strong = document.createElement("strong");
    strong.textContent = primary || "--";
    cell.append(strong);
    if (secondary && secondary !== primary) {
      const small = document.createElement("small");
      small.textContent = secondary;
      cell.append(small);
    }
    return cell;
  }

  function formatDate(value) {
    if (!value) {
      return "기록 없음";
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "기록 없음"
      : new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "short" }).format(date);
  }

  function eventLabel(type) {
    return ({
      google_account_created: "Google 회원 가입",
      google_login: "Google 로그인",
      auth_failed: "인증 실패",
      banned_access: "제명 계정 접근",
      blocked_creation_attempt: "비공개 제작 접근 차단",
      rate_limited: "요청 제한",
      admin_acorn_adjust: "도토리 조정",
      admin_ban: "계정 제명",
      admin_unban: "계정 복구"
    })[type] || type || "보안 이벤트";
  }

  function adminErrorMessage(error) {
    return ({
      admin_account_required: "관리자 계정만 사용할 수 있습니다.",
      google_login_required: "Google 로그인이 필요합니다.",
      account_banned: "이 계정은 이용이 제한되었습니다.",
      invalid_acorn_balance: "도토리는 0~999,999 사이의 정수로 입력해주세요.",
      ban_reason_required: "제명 사유를 3자 이상 입력해주세요.",
      rate_limited: "요청이 많습니다. 잠시 후 다시 시도해주세요."
    })[error?.code] || "관리 요청을 처리하지 못했습니다.";
  }

  function toast(message) {
    const root = byId("toast");
    if (!root) {
      return;
    }
    root.textContent = message;
    root.hidden = false;
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => {
      root.hidden = true;
    }, 2600);
  }

  function byId(id) {
    return document.getElementById(id);
  }
})();
