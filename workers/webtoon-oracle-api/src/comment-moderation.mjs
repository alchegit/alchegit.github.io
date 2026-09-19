// Normalize separators and composed Hangul without treating every short syllable as abuse.
export function hasCommentProfanity(value) {
  const normalized = String(value || '').normalize('NFKC').toLowerCase()
    .replace(/[\p{Cf}\u034f\u180e]/gu, '');
  const compact = normalized.replace(/[\s\p{P}\p{S}\d_]/gu, '');
  const strong = /씨[발빨팔]|시[발빨팔](?!점|역|열차|택시)|[좆좃][가-힣]*|[개씹]새[끼낀]|새끼야|[좆좃]까|지랄|씹새|병신(?!년)|미친놈|미친년|느금마|니애미|니애비|엿먹/iu;
  if (strong.test(compact)) return true;
  // Initial-only insults must be tokens, so initials in ordinary words do not match.
  if (/(?:^|[^\p{L}])(?:ㅅ[\s\p{P}\p{S}\p{Cf}\d]*ㅂ|ㅆ[\s\p{P}\p{S}\p{Cf}\d]*ㅂ|ㅂ[\s\p{P}\p{S}\p{Cf}\d]*ㅅ|ㅈ[\s\p{P}\p{S}\p{Cf}\d]*ㄹ)(?=$|[^\p{L}])/u.test(String(value || ''))) return true;
  return /(?:^|[^a-z])(?:f[\W_]*u[\W_]*c[\W_]*k(?:ing)?|b[\W_]*i[\W_]*t[\W_]*c[\W_]*h|asshole)(?=$|[^a-z])/iu.test(normalized);
}

export function publicCommentBody(row) {
  if (row.COMMENT_STATUS === 'deleted') return '작성자가 삭제한 댓글입니다.';
  if (row.COMMENT_STATUS === 'hidden') return '운영자가 숨긴 댓글입니다.';
  return hasCommentProfanity(row.BODY_TEXT) ? '욕설이 포함되어 표시되지 않는 댓글입니다.' : String(row.BODY_TEXT || '');
}

export function createCommentModerationService({ withConnection, withTransaction, randomId }) {
  const error = (message, status = 400) => Object.assign(new Error(message), { status });
  const id = (value) => {
    if (!/^[a-zA-Z0-9-]{3,36}$/u.test(String(value || ''))) throw error('comment_not_found', 404);
    return String(value);
  };
  async function target(connection, commentId) {
    const result = await connection.execute(
      `select c.id, c.user_id, c.comment_status from storyheaven_comments c
         join storyheaven_stories s on s.id = c.story_id
         left join storyheaven_episodes e on e.id = c.episode_id
        where c.id = :id and s.story_status = 'published'
          and (c.episode_id is null or e.episode_status = 'published') for update of c.comment_status`,
      { id: commentId });
    if (!result.rows[0]) throw error('comment_not_found', 404);
    return result.rows[0];
  }
  return {
    async remove(commentId, userId) {
      return withTransaction(async (connection) => {
        const row = await target(connection, id(commentId));
        if (row.USER_ID !== userId) throw error('comment_not_owned', 403);
        if (row.COMMENT_STATUS !== 'deleted') await connection.execute(
          `update storyheaven_comments set comment_status = 'deleted', updated_at = systimestamp where id = :id`, { id: row.ID });
        return { deleted: true, id: row.ID };
      });
    },
    async report(commentId, userId, reason) {
      if (!['abuse', 'spam', 'spoiler', 'other'].includes(reason)) throw error('comment_report_reason_invalid');
      return withTransaction(async (connection) => {
        const row = await target(connection, id(commentId));
        if (row.COMMENT_STATUS !== 'active') throw error('comment_not_found', 404);
        const exists = await connection.execute(`select id from storyheaven_comment_reports where comment_id = :id and reporter_id = :user_id`, { id: row.ID, user_id: userId });
        if (exists.rows.length) return { reported: true, alreadyReported: true };
        await connection.execute(
          `insert into storyheaven_comment_reports (id, comment_id, reporter_id, reason)
           values (:id, :comment_id, :reporter_id, :reason)`,
          { id: randomId(), comment_id: row.ID, reporter_id: userId, reason });
        return { reported: true };
      });
    },
    async listReports() {
      return withConnection(async (connection) => {
        const result = await connection.execute(
          `select r.id, r.comment_id, r.reason, r.created_at, c.body_text, c.comment_status,
                  s.id story_id, s.title story_title, e.episode_no, p.nickname
             from storyheaven_comment_reports r join storyheaven_comments c on c.id = r.comment_id
             join storyheaven_stories s on s.id = c.story_id
             left join storyheaven_episodes e on e.id = c.episode_id
             join webtoon_profiles p on p.user_id = c.user_id
            where r.report_status = 'open' order by r.created_at fetch first 100 rows only`);
        return { reports: result.rows.map((row) => ({ id: row.ID, commentId: row.COMMENT_ID,
          reason: row.REASON, body: row.BODY_TEXT, status: row.COMMENT_STATUS, storyId: row.STORY_ID,
          storyTitle: row.STORY_TITLE, episodeNo: row.EPISODE_NO, author: row.NICKNAME || '독자', createdAt: row.CREATED_AT })) };
      });
    },
    async resolve(reportId, userId, action) {
      if (!['hide', 'dismiss'].includes(action)) throw error('comment_report_action_invalid');
      return withTransaction(async (connection) => {
        const result = await connection.execute(`select comment_id, report_status from storyheaven_comment_reports where id = :id for update`, { id: id(reportId) });
        const row = result.rows[0];
        if (!row) throw error('comment_report_not_found', 404);
        if (row.REPORT_STATUS !== 'open') return { resolved: true, alreadyResolved: true };
        if (action === 'hide') await connection.execute(
          `update storyheaven_comments set comment_status = 'hidden', updated_at = systimestamp
            where id = :id and comment_status = 'active'`, { id: row.COMMENT_ID });
        await connection.execute(
          `update storyheaven_comment_reports set report_status = :status, resolved_by = :user_id, resolved_at = systimestamp
            where comment_id = :comment_id and report_status = 'open'`,
          { comment_id: row.COMMENT_ID, user_id: userId, status: action === 'hide' ? 'hidden' : 'dismissed' });
        return { resolved: true, action };
      });
    }
  };
}
