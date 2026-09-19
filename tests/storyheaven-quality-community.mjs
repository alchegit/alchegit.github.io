import assert from 'node:assert/strict';
import { hasCommentProfanity, publicCommentBody, createCommentModerationService } from '../workers/webtoon-oracle-api/src/comment-moderation.mjs';
import { buildContinuityContext } from '../workers/webtoon-oracle-api/src/serial-continuity.mjs';
import { decideStoryHeavenSerialReview, STORYHEAVEN_SERIAL_LIMITS } from '../workers/webtoon-oracle-api/src/serial-engine.mjs';

for (const value of ['씨발', '씨.발', '씨\u200b발', '시1발', '개 새 끼', '병신아', '지 랄', '미친놈', 'f.u.c.k', 'ASSHOLE', 'ㅅ ㅂ', 'ㅅ.ㅂ', '씨발'.normalize('NFD')]) {
  assert.equal(hasCommentProfanity(value), true, `blocks obfuscated insult: ${value}`);
}
for (const value of ['이번 회차의 시발점이 궁금해요.', '신발을 잃어버렸네요.', '병신년은 육십간지의 해입니다.', '뒤늦게 발견한 복선이 좋아요.', '개선할 점도 있네요.', 'Scunthorpe', '진지한 분위기가 마음에 들어요.']) {
  assert.equal(hasCommentProfanity(value), false, `allows normal discussion: ${value}`);
}
assert.equal(publicCommentBody({ COMMENT_STATUS: 'hidden', BODY_TEXT: 'private text' }).includes('private'), false);
assert.equal(publicCommentBody({ COMMENT_STATUS: 'active', BODY_TEXT: '씨발' }).includes('씨발'), false);
assert.equal(publicCommentBody({ COMMENT_STATUS: 'deleted', BODY_TEXT: 'old comment' }), '작성자가 삭제한 댓글입니다.');

const continuity = buildContinuityContext([
  { episodeNo: 1, status: 'ready', body: 'approved pilot' },
  { episodeNo: 1, status: 'published', body: 'published replacement' },
  { episodeNo: 2, status: 'ready', body: '과거 문장입니다.\n\n'.repeat(600) + '마지막 선택이 남는다.' },
  { episodeNo: 3, status: 'published', body: 'current episode' },
  { episodeNo: 4, status: 'ready', body: 'future spoiler' },
  { episodeNo: 2, status: 'blocked', body: 'rejected text' }
], 3);
assert.equal(continuity.installments.length, 2);
assert.equal(continuity.installments[0].endingExcerpt, 'published replacement');
assert.ok(continuity.installments[1].endingExcerpt.length <= 1800);
assert.ok(continuity.installments[1].endingExcerpt.endsWith('마지막 선택이 남는다.'));
assert.deepEqual(buildContinuityContext([{ episodeNo: 1, status: 'ready' }], 1).installments, []);

const review = { decision: 'rewrite_required', safetyPassed: true, scores: Object.fromEntries(Object.keys(STORYHEAVEN_SERIAL_LIMITS.quality).map((key) => [key, 99])), issues: [], comparativeVerdict: { wouldReadNext: true } };
const qa = { passed: true, score: 100 };
assert.equal(decideStoryHeavenSerialReview({ review, qa, rewriteCount: 2 }).state, 'approved');
assert.equal(decideStoryHeavenSerialReview({ review: { ...review, repairVerification: [{ key: 'r', status: 'unresolved' }] }, qa, rewriteCount: 2 }).state, 'blocked');
assert.equal(decideStoryHeavenSerialReview({ review: { ...review, scores: { ...review.scores, causality: undefined } }, qa, rewriteCount: 2 }).state, 'blocked');
assert.equal(decideStoryHeavenSerialReview({ review: { ...review, scores: { ...review.scores, causality: 'not-a-number' } }, qa, rewriteCount: 2 }).state, 'blocked');

let status = 'active';
let reports = [];
const writes = [];
const connection = { execute: async (sql, binds) => {
  if (sql.includes('for update of c.comment_status')) return { rows: [{ ID: 'comment-1', USER_ID: 'author-1', COMMENT_STATUS: status }] };
  if (sql.startsWith('select id from storyheaven_comment_reports')) return { rows: reports };
  if (sql.startsWith('insert into storyheaven_comment_reports')) { reports.push({ ID: binds.id }); writes.push(binds); return {}; }
  if (sql.startsWith('update storyheaven_comments')) { status = 'deleted'; writes.push(binds); return {}; }
  throw new Error(`unexpected query: ${sql}`);
} };
const service = createCommentModerationService({ withConnection: async (fn) => fn(connection), withTransaction: async (fn) => fn(connection), randomId: () => 'report-1' });
await assert.rejects(service.remove('comment-1', 'someone-else'), /comment_not_owned/u);
assert.equal(writes.length, 0);
await service.report('comment-1', 'reader-1', 'abuse');
assert.equal((await service.report('comment-1', 'reader-1', 'abuse')).alreadyReported, true);
assert.equal(writes.length, 1);
await service.remove('comment-1', 'author-1');
assert.equal(status, 'deleted');
await assert.rejects(service.report('comment-1', 'reader-2', 'abuse'), /comment_not_found/u);
console.log('Quality gates, continuity retrieval, comment filtering and ownership checks passed');
