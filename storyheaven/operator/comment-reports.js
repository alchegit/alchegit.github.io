(() => {
  let container;
  const labels = { abuse: '욕설·비방', spam: '스팸·도배', spoiler: '스포일러', other: '기타' };
  async function load() {
    if (!container) {
      container = document.createElement('section');
      container.className = 'comment-report-panel';
      container.setAttribute('aria-labelledby', 'commentReportPanelTitle');
      document.querySelector('[data-operator]').prepend(container);
    }
    container.replaceChildren();
    const heading = document.createElement('header');
    const title = document.createElement('h2'); title.id = 'commentReportPanelTitle'; title.textContent = '댓글 신고';
    const refresh = button('새로고침', load); heading.append(title, refresh); container.append(heading);
    const status = document.createElement('p'); status.setAttribute('role', 'status'); status.textContent = '신고를 불러오는 중입니다.'; container.append(status);
    try {
      const payload = await StoryHeavenCommon.api('/api/storyheaven/operator/comment-reports');
      status.textContent = payload.reports.length ? `미처리 ${payload.reports.length}건` : '처리할 댓글 신고가 없습니다.';
      for (const report of payload.reports) {
        const row = document.createElement('article'); row.className = 'comment-report-row';
        const link = document.createElement('a');
        link.href = `/storyheaven/story/?id=${encodeURIComponent(report.storyId)}${report.episodeNo ? `&episode=${report.episodeNo}` : ''}`;
        link.textContent = `${report.storyTitle} · ${report.episodeNo ? '회차 댓글' : '작품 댓글'}`;
        const reason = document.createElement('strong'); reason.textContent = labels[report.reason] || '기타';
        const body = document.createElement('p'); body.textContent = report.body;
        const author = document.createElement('small'); author.textContent = `${report.author} · ${report.status === 'deleted' ? '작성자 삭제됨' : report.status === 'hidden' ? '숨김 상태' : '공개 중'}`;
        const actions = document.createElement('div'); actions.className = 'comment-report-actions';
        actions.append(button('댓글 숨김', () => resolve(report, 'hide')), button('위반 없음', () => resolve(report, 'dismiss')));
        row.append(link, reason, body, author, actions); container.append(row);
      }
    } catch (error) { status.textContent = `댓글 신고를 불러오지 못했습니다. ${StoryHeavenCommon.readableError(error)}`; }
  }
  async function resolve(report, action) {
    await StoryHeavenCommon.api(`/api/storyheaven/operator/comment-reports/${encodeURIComponent(report.id)}`, { method: 'POST', body: { action } });
    await load();
  }
  function button(label, action) {
    const node = document.createElement('button'); node.type = 'button'; node.className = 'button secondary'; node.textContent = label;
    node.onclick = async () => {
      if (node.disabled) return;
      node.disabled = true;
      try { await action(); } catch (error) { StoryHeavenCommon.toast(StoryHeavenCommon.readableError(error)); }
      finally { node.disabled = false; }
    };
    return node;
  }
  window.StoryHeavenCommentReports = { load };
})();
