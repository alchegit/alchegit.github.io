import assert from 'node:assert/strict';
import { createStoryHeavenSerialService, summarizeQueue } from '../workers/webtoon-oracle-api/src/serial-service.mjs';
import { maintainSerialLease } from '../workers/storyheaven-codex-review-worker/src/serial-lease.mjs';

function serviceWith(execute) {
  return createStoryHeavenSerialService({ withConnection: (fn) => fn({ execute }),
    withTransaction: (fn) => fn({ execute }), clob: (value) => value, clobJson: (value) => value });
}
const retrySql = [];
const retryService = serviceWith(async (sql) => {
  retrySql.push(sql);
  if (sql.includes('from storyheaven_serial_runtime')) return { rows: [{ PAUSED: 'N' }] };
  if (sql.includes('count(distinct serial_run.id)')) return { rows: [{ RUN_COUNT: 1, ACTIVE_COUNT: 2,
    WAITING_COUNT: 2, ERROR_COUNT: 1, RUNNING_COUNT: 0, SCHEDULE_ID: 'schedule-1', SCHEDULE_STATUS: 'active' }] };
  return { rows: [], rowsAffected: 1 };
});
const retry = await retryService.retryQueueGroup('queue-mixed');
assert.equal(retry.reused, false);
assert.equal(retry.waitingCount, 3);
assert.ok(retrySql.some((sql) => sql.includes("and job_status = 'error'")), 'failed sibling must be reset even when other jobs are waiting');
assert.ok(retrySql.some((sql) => sql.includes('queue_requested_at = systimestamp')));

const pauseSql = [];
const pauseService = serviceWith(async (sql) => {
  pauseSql.push(sql);
  return { rows: [{ PAUSED: 'N' }], rowsAffected: 1 };
});
await pauseService.setSystemPaused(true);
await pauseService.setSystemPaused(false);
assert.ok(pauseSql.some((sql) => sql.includes('update storyheaven_serial_runtime')));
assert.ok(!pauseSql.some((sql) => /update storyheaven_serial_schedules/u.test(sql)), 'global pause and start preserve individually paused schedules');

const pausedSql = [];
const pausedService = serviceWith(async (sql) => { pausedSql.push(sql); return { rows: [{ PAUSED: 'Y' }] }; });
assert.equal((await pausedService.claimJob({ workerId: 'worker' })).paused, true);
assert.equal(pausedSql.length, 1, 'persisted pause prevents any claim, including after restart');

const expirationSql = [];
const expirationService = serviceWith(async (sql) => {
  expirationSql.push(sql);
  if (sql.includes('from storyheaven_serial_runtime')) return { rows: [{ PAUSED: 'N' }] };
  return { rows: [], rowsAffected: 1 };
});
await expirationService.claimJob({ workerId: 'worker' });
assert.ok(expirationSql[0].endsWith('for update'), 'dispatch starts under a shared DB lock');
assert.ok(expirationSql.some((sql) => sql.includes("set run_status = 'error'") && sql.includes("j.error_code = 'lease_expired'")));

let callbackCalls = 0;
const completeService = serviceWith(async (sql) => {
  callbackCalls += 1;
  if (sql.includes('select job_status, input_hash')) return { rows: [{ JOB_STATUS: 'complete', INPUT_HASH: 'same-hash' }] };
  return { rows: [] };
});
assert.equal((await completeService.completeJob({ jobId: 'job-1', leaseId: 'old-lease', workerId: 'worker', inputHash: 'same-hash' })).alreadyAccepted, true);
assert.equal(callbackCalls, 2);

const pilotSql = [];
const pilotService = serviceWith(async (sql) => {
  pilotSql.push(sql);
  if (sql.includes('from storyheaven_stories where id = :story_id')) return { rows: [{ ID: 'pilot-story', AUTHOR_USER_ID: 'storyheaven-system-ai', CONTENT_ORIGIN: 'admin_seed' }] };
  if (sql.includes('schedule.concept_policy_json')) return { rows: [{ CONCEPT_POLICY_JSON: JSON.stringify({ openingPilotMode: 'three_episode_incubation' }), PUBLICATION_MODE: 'auto_public' }] };
  if (sql.includes('select narrative_blueprint_json')) return { rows: [{ NARRATIVE_BLUEPRINT_JSON: JSON.stringify({ serialMemory: { pilotAssessment: { operatorDecision: 'promoted', completedInstallments: 3 } } }) }] };
  return { rows: [], rowsAffected: 1 };
});
assert.equal((await pilotService.resolveOpeningPilot('pilot-story', 'operator', { action: 'promote' })).alreadyPromoted, true);
const pilotControl = pilotSql.find((sql) => sql.includes('merge into storyheaven_serial_story_controls'));
assert.ok(pilotControl.includes("'manual'"));
assert.ok(!pilotControl.includes('when matched'), 'explicit operator continuation settings must be preserved');

const now = Date.now();
const base = (id, extra = {}) => ({ ID: id, QUEUE_GROUP_ID: id, STORY_ID: id, STORY_TITLE: id,
  SCHEDULE_ID: 'shared-schedule', SCHEDULE_STATUS: 'active', RUN_TYPE: 'episode', RUN_STATUS: 'queued',
  CURRENT_STAGE: 'write_draft', CREATED_AT: new Date(now - 100000), QUEUE_REQUESTED_AT: new Date(now - 100000),
  TOTAL_JOB_COUNT: 1, COMPLETED_JOB_COUNT: 0, ACTIVE_JOB_COUNT: 1, RUNNING_JOB_COUNT: 0, ...extra });
const queue = summarizeQueue([
  base('old-requeued', { CREATED_AT: new Date(now - 86400000), QUEUE_REQUESTED_AT: new Date(now) }),
  base('first-waiting'),
  base('pinned', { QUEUE_REQUESTED_AT: new Date(now - 50000) }),
  base('paused', { SCHEDULE_STATUS: 'paused' }),
  base('old-titleless', { STORY_ID: null, RUN_TYPE: 'concept', RUN_STATUS: 'error', COMPLETED_AT: new Date(now - 200000) }),
  base('failure-one', { RUN_STATUS: 'error', FAILURE_CODE: 'test_error', COMPLETED_AT: new Date(now) }),
  base('failure-two', { RUN_STATUS: 'blocked', FAILURE_CODE: 'quality_threshold_not_met', COMPLETED_AT: new Date(now) })
], [{ QUEUE_GROUP_ID: 'pinned', RUN_ID: 'pinned', JOB_TYPE: 'editorial_review', JOB_STATUS: 'retry_wait',
  NEXT_ATTEMPT_AT: new Date(now + 60000), ERROR_CODE: 'codex_rate_limited', CREATED_AT: new Date(now) }], { activeGroupId: 'pinned' });
assert.deepEqual(queue.items.map((item) => item.id), ['pinned', 'first-waiting', 'old-requeued', 'paused']);
assert.equal(queue.items[0].waitReason, 'retry_delay');
assert.equal(queue.items[3].queuePosition, null);
assert.equal(queue.items[3].waitReason, 'schedule_paused');
assert.equal(queue.attention.length, 2, 'distinct failed stories on one schedule remain actionable');
assert.ok(!queue.history.some((item) => item.id === 'pinned'), 'active work is not repeated in past records');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let beats = 0;
const lease = maintainSerialLease({ leaseSeconds: 1, intervalMs: 10, renew: async () => ({ renewed: ++beats < 3, leaseSeconds: 1 }) });
await delay(60);
assert.equal(lease.signal.aborted, true, 'operator-revoked lease interrupts the live process');
await lease.stop();
const beatsAtStop = beats;
await delay(30);
assert.equal(beats, beatsAtStop);
let attempts = 0;
const transient = maintainSerialLease({ leaseSeconds: 1, intervalMs: 10, renew: async () => {
  if (++attempts === 1) throw new Error('network');
  return { renewed: true, leaseSeconds: 1 };
} });
await delay(40);
assert.equal(transient.signal.aborted, false, 'a short network error must not discard a valid job');
await transient.stop();
console.log('Queue retry, ordering, persistent pause, leases, callback replay and operator states passed');
