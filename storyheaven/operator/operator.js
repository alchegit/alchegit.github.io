(() => {
  let currentRound = null;

  document.addEventListener("DOMContentLoaded", async () => {
    await StoryHeavenCommon.init(onAuth);
  });

  async function onAuth(auth) {
    if (!auth.session) {
      showAccess();
      return;
    }
    try {
      const [submissions, reports] = await Promise.all([
        StoryHeavenCommon.api("/api/storyheaven/operator/submissions"),
        StoryHeavenCommon.api("/api/storyheaven/operator/reports")
      ]);
      document.querySelector("[data-access-gate]").hidden = true;
      document.querySelector("[data-operator]").hidden = false;
      renderSubmissions(submissions.submissions || []);
      renderReports(reports.reports || []);
      await refreshRound();
    } catch (error) {
      showAccess();
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    }
  }

  function showAccess() {
    document.querySelector("[data-access-gate]").hidden = false;
    document.querySelector("[data-operator]").hidden = true;
  }

  async function refreshRound() {
    const [round, pending] = await Promise.all([
      StoryHeavenCommon.api("/api/storyheaven/rounds/current"),
      StoryHeavenCommon.api("/api/storyheaven/operator/rounds/pending")
    ]);
    const target = (pending.rounds || []).find((item) => item.status === "auditing") || round.round;
    await renderRound(target);
  }

  async function renderRound(round) {
    currentRound = round;
    const labels = { open: "투표 중", auditing: "감사 대기", tie_pending: "결선 필요", confirmed: "확정" };
    document.querySelector("[data-round-title]").textContent = round?.type === "runoff" ? "공동 1위 결선" : `주간 ${round?.key || ""}`;
    document.querySelector("[data-round-chip]").textContent = labels[round?.status] || "예정";
    const copy = document.querySelector("[data-round-copy]");
    copy.textContent = round?.status === "open"
      ? `후보 ${round.entries?.length || 0}편 · ${formatDate(round.votingEndsAt)} 마감`
      : round?.status === "auditing"
        ? "투표가 끝났습니다. 근거를 확인한 뒤 결과를 확정하세요."
        : round?.status === "tie_pending"
          ? "공동 1위 결선 라운드가 생성되었습니다."
          : "확정된 라운드입니다.";

    const button = document.querySelector("[data-finalize-round]");
    button.hidden = round?.status !== "auditing";
    button.disabled = false;
    button.onclick = finalizeRound;
    document.querySelector("[data-audit-tools]").hidden = true;

    if (round?.status === "auditing") {
      await loadAudit(round.id);
    }
  }

  async function loadAudit(roundId) {
    const audit = await StoryHeavenCommon.api(`/api/storyheaven/operator/rounds/${encodeURIComponent(roundId)}/audit`);
    document.querySelector("[data-round-copy]").textContent += ` 유효표 ${audit.activeVotes}개, 취소·무효 ${audit.canceledVotes}개, 공동 네트워크 신호 ${audit.riskClusters.length}건입니다. 네트워크 신호만으로 제재하지 않습니다.`;
    renderAudit(audit);
  }

  function renderAudit(audit) {
    const tools = document.querySelector("[data-audit-tools]");
    tools.hidden = false;
    document.querySelector("[data-audit-summary]").textContent = `후보 ${audit.entries?.filter((entry) => entry.status === "candidate").length || 0}편 · 익명 투표자 ${audit.voterCount || 0}명 · 신호 보관 ${audit.signalRetentionDays || 30}일`;

    const entries = document.querySelector("[data-audit-entries]");
    entries.replaceChildren(...(audit.entries || []).map(entryCard));
    if (!audit.entries?.length) entries.append(emptyRow("등록된 후보가 없습니다."));

    const votes = document.querySelector("[data-audit-votes]");
    votes.replaceChildren(...(audit.votes || []).map(voteCard));
    if (!audit.votes?.length) votes.append(emptyRow("확인할 표가 없습니다."));
  }

  function entryCard(entry) {
    const row = document.createElement("article");
    row.className = "audit-row";
    row.innerHTML = `<div><strong>${escapeHtml(entry.title)}</strong><p>${escapeHtml(entry.author)} · 유효 ${Number(entry.voteCount || 0)}표 · 적격성 ${Number(entry.eligibilityScore || 0)}점</p></div>`;
    if (entry.status !== "candidate") {
      const state = document.createElement("span");
      state.className = "status-chip audit-state";
      state.textContent = entry.status === "disqualified" ? "후보 제외" : entry.status;
      row.append(state);
      return row;
    }
    const form = moderationForm("후보 제외 사유를 10자 이상 기록", "후보 제외", "danger");
    form.button.addEventListener("click", () => disqualifyEntry(entry.entryId, form));
    row.append(form.element);
    return row;
  }

  function voteCard(vote) {
    const row = document.createElement("article");
    row.className = "audit-row vote-row";
    const statusLabel = vote.status === "active" ? "유효" : vote.status === "invalidated" ? "운영 무효" : "사용자 취소";
    row.innerHTML = `<div><strong>${escapeHtml(vote.storyTitle)}</strong><p>${escapeHtml(vote.voterKey)} · ${statusLabel} · ${formatDate(vote.castAt)}</p></div>`;
    if (vote.status === "invalidated") {
      const state = document.createElement("span");
      state.className = "status-chip audit-state";
      state.textContent = "무효 처리됨";
      row.append(state);
      return row;
    }
    const form = moderationForm("표 무효화 근거를 10자 이상 기록", "표 무효화", "secondary");
    form.button.addEventListener("click", () => invalidateVote(vote.voteId, form));
    row.append(form.element);
    return row;
  }

  function moderationForm(placeholder, label, tone) {
    const element = document.createElement("div");
    element.className = "audit-action";
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 500;
    input.placeholder = placeholder;
    input.setAttribute("aria-label", placeholder);
    const button = document.createElement("button");
    button.className = `button ${tone}`;
    button.type = "button";
    button.textContent = label;
    element.append(input, button);
    return { element, input, button };
  }

  function emptyRow(message) {
    const row = document.createElement("p");
    row.className = "audit-empty";
    row.textContent = message;
    return row;
  }

  async function invalidateVote(voteId, form) {
    const reason = form.input.value.trim();
    if (reason.length < 10) {
      StoryHeavenCommon.toast("무효화 근거를 10자 이상 적어주세요.");
      form.input.focus();
      return;
    }
    form.button.disabled = true;
    try {
      await StoryHeavenCommon.api(`/api/storyheaven/operator/votes/${encodeURIComponent(voteId)}/invalidate`, { method: "POST", body: { reason } });
      StoryHeavenCommon.toast("표를 무효화하고 감사 기록을 남겼습니다.");
      await renderRound(currentRound);
    } catch (error) {
      form.button.disabled = false;
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    }
  }

  async function disqualifyEntry(entryId, form) {
    const reason = form.input.value.trim();
    if (reason.length < 10) {
      StoryHeavenCommon.toast("후보 제외 사유를 10자 이상 적어주세요.");
      form.input.focus();
      return;
    }
    form.button.disabled = true;
    try {
      const result = await StoryHeavenCommon.api(`/api/storyheaven/operator/entries/${encodeURIComponent(entryId)}/disqualify`, { method: "POST", body: { reason } });
      StoryHeavenCommon.toast(`후보를 제외하고 ${result.invalidatedVotes || 0}표를 무효화했습니다.`);
      await renderRound(currentRound);
    } catch (error) {
      form.button.disabled = false;
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    }
  }

  async function finalizeRound() {
    if (!currentRound) return;
    const button = document.querySelector("[data-finalize-round]");
    button.disabled = true;
    try {
      const payload = await StoryHeavenCommon.api(`/api/storyheaven/operator/rounds/${encodeURIComponent(currentRound.id)}/finalize`, { method: "POST", body: {} });
      StoryHeavenCommon.toast(payload.status === "runoff_created" ? "동률 결선 라운드를 만들었습니다." : payload.winnerStoryId ? "주간 1위를 확정했습니다." : "유효표가 없어 당선작 없이 마감했습니다.");
      await refreshRound();
    } catch (error) {
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
      button.disabled = false;
    }
  }

  function renderReports(reports) {
    const active = reports.filter((report) => ["pending", "reviewing"].includes(report.status) || report.appeal?.status === "pending");
    document.querySelector("[data-report-count]").textContent = `${active.length}건`;
    document.querySelector("[data-report-review-list]").replaceChildren(...active.map(reportCard));
    document.querySelector("[data-report-empty]").hidden = active.length > 0;
  }

  function reportCard(report) {
    const article = document.createElement("article");
    article.className = "review-card report-review-card";
    const labels = { plagiarism: "표절 의심", rights: "저작권·권리", impersonation: "사칭", personal_info: "개인정보", hate_safety: "혐오·안전", spam: "스팸", other: "기타" };
    article.innerHTML = `<header><div><p class="eyebrow">${labels[report.category] || "신고"} · ${escapeHtml(report.reporterKey)} · ${formatDate(report.createdAt)}</p><h3>${escapeHtml(report.storyTitle)}</h3></div><span class="status-chip">${report.appeal?.status === "pending" ? "이의 대기" : "신고 대기"}</span></header><p><strong>작성자</strong> ${escapeHtml(report.author)}</p><p>${escapeHtml(report.details)}</p><div class="report-reference"></div>`;
    if (report.referenceUrl) {
      const link = document.createElement("a");
      link.className = "report-link";
      link.href = report.referenceUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "HTTPS 참고 자료 열기";
      article.querySelector(".report-reference").append(link);
    }
    if (["pending", "reviewing"].includes(report.status)) {
      const form = reportDecisionForm("판정 근거를 20자 이상 기록해주세요.");
      form.dismiss.addEventListener("click", () => resolveReport(report.id, "dismissed", form));
      form.action.addEventListener("click", () => resolveReport(report.id, "action_required", form));
      article.append(form.element);
    }
    if (report.appeal?.status === "pending") {
      const section = document.createElement("section");
      section.className = "appeal-review";
      section.innerHTML = `<p class="eyebrow">APPEAL</p><h4>작성자 이의제기</h4><p>${escapeHtml(report.appeal.reason)}</p>`;
      const form = appealDecisionForm("이의제기 재검토 근거를 20자 이상 기록해주세요.");
      form.uphold.addEventListener("click", () => resolveAppeal(report.appeal.id, "upheld", form));
      form.overturn.addEventListener("click", () => resolveAppeal(report.appeal.id, "overturned", form));
      section.append(form.element);
      article.append(section);
    }
    return article;
  }

  function reportDecisionForm(placeholder) {
    const element = document.createElement("div");
    element.className = "report-decision";
    element.innerHTML = `<textarea maxlength="1000" placeholder="${placeholder}"></textarea><div><button class="button secondary" type="button">위반 없음</button><button class="button danger" type="button">조치 필요</button></div>`;
    return { element, textarea: element.querySelector("textarea"), dismiss: element.querySelectorAll("button")[0], action: element.querySelectorAll("button")[1] };
  }

  function appealDecisionForm(placeholder) {
    const element = document.createElement("div");
    element.className = "report-decision";
    element.innerHTML = `<textarea maxlength="1000" placeholder="${placeholder}"></textarea><div><button class="button secondary" type="button">기존 판정 유지</button><button class="button" type="button">이의 인용</button></div>`;
    return { element, textarea: element.querySelector("textarea"), uphold: element.querySelectorAll("button")[0], overturn: element.querySelectorAll("button")[1] };
  }

  async function resolveReport(reportId, decision, form) {
    const resolution = form.textarea.value.trim();
    if (resolution.length < 20) {
      StoryHeavenCommon.toast("판정 근거를 20자 이상 적어주세요.");
      form.textarea.focus();
      return;
    }
    form.element.querySelectorAll("button").forEach((button) => { button.disabled = true; });
    try {
      await StoryHeavenCommon.api(`/api/storyheaven/operator/reports/${encodeURIComponent(reportId)}/resolve`, { method: "POST", body: { decision, resolution } });
      StoryHeavenCommon.toast("판정을 저장하고 작성자에게 알렸습니다.");
      await refreshReports();
    } catch (error) {
      form.element.querySelectorAll("button").forEach((button) => { button.disabled = false; });
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    }
  }

  async function resolveAppeal(appealId, decision, form) {
    const resolution = form.textarea.value.trim();
    if (resolution.length < 20) {
      StoryHeavenCommon.toast("이의제기 판정 근거를 20자 이상 적어주세요.");
      form.textarea.focus();
      return;
    }
    form.element.querySelectorAll("button").forEach((button) => { button.disabled = true; });
    try {
      await StoryHeavenCommon.api(`/api/storyheaven/operator/appeals/${encodeURIComponent(appealId)}/resolve`, { method: "POST", body: { decision, resolution } });
      StoryHeavenCommon.toast("이의제기 결과를 저장하고 작성자에게 알렸습니다.");
      await refreshReports();
    } catch (error) {
      form.element.querySelectorAll("button").forEach((button) => { button.disabled = false; });
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    }
  }

  async function refreshReports() {
    const payload = await StoryHeavenCommon.api("/api/storyheaven/operator/reports");
    renderReports(payload.reports || []);
  }

  function renderSubmissions(stories) {
    document.querySelector("[data-queue-count]").textContent = `${stories.length}편`;
    const list = document.querySelector("[data-review-list]");
    list.replaceChildren(...stories.map(submissionCard));
    document.querySelector("[data-empty]").hidden = stories.length > 0;
  }

  function submissionCard(story) {
    const article = document.createElement("article");
    article.className = "review-card";
    const packet = story.packet || story;
    article.innerHTML = `<header><div><p class="eyebrow">${escapeHtml(story.author?.nickname || "")} · ${escapeHtml(story.genre || "")}</p><h3>${escapeHtml(story.title)}</h3></div><span class="status-chip">대기 ${formatDate(story.submittedAt)}</span></header><div class="review-grid"><div><p><strong>한 줄</strong><br>${escapeHtml(story.logline)}</p><p><strong>줄거리</strong><br>${escapeHtml(packet.synopsis || story.synopsis || "")}</p><p><strong>목표</strong><br>${escapeHtml(packet.protagonistGoal || "")}</p><p><strong>장애물과 대가</strong><br>${escapeHtml(packet.obstacleStakes || "")}</p></div><div class="review-controls"><label>적격성 점수<input type="number" min="0" max="100" value="65" data-score></label><label>검수 메모<textarea maxlength="1000" data-note placeholder="보강 또는 반려 사유"></textarea></label><div class="review-buttons"><button class="button" type="button" data-decision="approved">공개 승인</button><button class="button warning" type="button" data-decision="changes_requested">보강 요청</button><button class="button danger" type="button" data-decision="rejected">반려</button></div></div></div>`;
    article.querySelectorAll("[data-decision]").forEach((button) => button.addEventListener("click", () => review(story.id, button.dataset.decision, article)));
    return article;
  }

  async function review(id, decision, article) {
    const score = Number(article.querySelector("[data-score]").value);
    const note = article.querySelector("[data-note]").value.trim();
    article.querySelectorAll("button").forEach((button) => { button.disabled = true; });
    try {
      await StoryHeavenCommon.api(`/api/storyheaven/operator/stories/${encodeURIComponent(id)}/review`, { method: "POST", body: { decision, eligibilityScore: score, note } });
      article.remove();
      StoryHeavenCommon.toast(decision === "approved" ? "이야기를 공개했습니다." : "검수 결과를 저장했습니다.");
      const count = document.querySelectorAll(".review-card").length;
      document.querySelector("[data-queue-count]").textContent = `${count}편`;
      document.querySelector("[data-empty]").hidden = count > 0;
    } catch (error) {
      article.querySelectorAll("button").forEach((button) => { button.disabled = false; });
      StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error));
    }
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
