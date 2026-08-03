import crypto from "node:crypto";
import {
  STORYHEAVEN_CREATIVE_CONTROL_DEFAULTS,
  STORYHEAVEN_SERIAL_LIMITS,
  STORYHEAVEN_SERIAL_STORY_CONTROL,
  analyzeStoryHeavenSerialDraft,
  buildStoryHeavenArcScope,
  decideStoryHeavenSerialReview,
  normalizeStoryHeavenConceptPolicy,
  normalizeStoryHeavenCreativeControls,
  storyHeavenCreativeControlGuidance,
  storyHeavenSeriesPosition,
  storyHeavenSerialQualityThresholds,
  normalizeStoryHeavenSerialWorkerResult,
  validateStoryHeavenSerialStoryControl,
  validateStoryHeavenContinuationRequest,
  validateStoryHeavenEpisodeRun,
  validateStoryHeavenSerialSchedule
} from "./serial-engine.mjs";

const SYSTEM_AUTHOR_ID = "storyheaven-system-ai";
const ARCHITECTURE_MAX_ATTEMPTS = 10;
const RUN_STATES_DONE = new Set(["approved", "blocked", "published", "error"]);
const SEOUL_OFFSET = "+09:00";
const OFFSET_TIME_RE = /(?:z|[+-]\d{2}:?\d{2})$/iu;
const OFFSETLESS_TIME_RE = /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?)?$/u;
export const STORYHEAVEN_CONTINUATION_POLICY = Object.freeze({
  initialEpisodeCount: 1,
  adminMinimumEpisodeCount: 1,
  recommendationThreshold: 11
});

export function continuationMinimumEpisode(triggerType) {
  return triggerType === "admin_request"
    ? STORYHEAVEN_CONTINUATION_POLICY.adminMinimumEpisodeCount
    : STORYHEAVEN_CONTINUATION_POLICY.initialEpisodeCount;
}

export function createStoryHeavenSerialService({
  withConnection,
  withTransaction,
  clob,
  clobJson,
  leaseSeconds = 900,
  retryMinutes = 3,
  maxAttempts = 3
}) {
  return Object.freeze({
    listSchedules,
    getQueueState,
    cancelQueueGroup,
    hideQueueHistory,
    retryQueueGroup,
    setSystemPaused,
    resumeInterruptedQueues,
    listManagedStories,
    updateStoryControl,
    updateStoryControls,
    saveSchedule,
    archiveSchedule,
    runSchedule,
    planStory,
    strengthenStoryArchitecture,
    queueEpisode,
    requestContinuation,
    rewriteEpisode,
    getStoryState,
    getRun,
    resolveQualityHold,
    claimJob,
    completeJob,
    failJob,
    processDue
  });

  async function listSchedules() {
    return withConnection(async (connection) => {
      const result = await connection.execute(
        `select id, schedule_name, schedule_status, cadence_days, cadence_minutes,
                target_episode_count, target_age,
                genre_pool_json, primary_genre, primary_genres_json,
                subgenres_json, subgenres_by_genre_json, publication_mode,
                concept_policy_json, max_active_serials,
                next_run_at, last_run_at, last_cycle_completed_at,
                episode1_sample_count, episode1_avg_seconds, episode1_last_seconds,
                created_at, updated_at,
                (select max(serial_run.id) keep (dense_rank last order by serial_run.created_at)
                   from storyheaven_serial_runs serial_run
                  where serial_run.schedule_id = schedule.id) as last_run_id,
                (select max(serial_run.story_id) keep (dense_rank last order by serial_run.created_at)
                   from storyheaven_serial_runs serial_run
                  where serial_run.schedule_id = schedule.id
                    and serial_run.story_id is not null) as last_story_id
           from storyheaven_serial_schedules schedule
          where schedule_status <> 'archived'
          order by created_at desc`
      );
      return result.rows.map(mapSchedule);
    });
  }

  async function getQueueState() {
    return withConnection(async (connection) => {
      const result = await connection.execute(
        `select * from (
           select serial_run.id, serial_run.queue_group_id, serial_run.schedule_id,
                  serial_run.story_id, serial_run.episode_no, serial_run.run_type,
                  serial_run.run_status, serial_run.current_stage,
                  serial_run.started_at, serial_run.completed_at, serial_run.created_at,
                  serial_run.queue_canceled_at, serial_run.failure_code,
                  json_value(serial_run.input_json, '$.targetEpisodeCount' returning number null on error) as run_target_episode_count,
                  story.title as story_title,
                  schedule.primary_genre, schedule.primary_genres_json,
                  schedule.target_episode_count,
                  schedule.subgenres_by_genre_json,
                  (select count(*) from storyheaven_serial_jobs job
                    where job.run_id = serial_run.id) as total_job_count,
                  (select count(*) from storyheaven_serial_jobs job
                    where job.run_id = serial_run.id and job.job_status = 'complete') as completed_job_count,
                  (select count(*) from storyheaven_serial_jobs job
                    where job.run_id = serial_run.id
                      and job.job_status in ('queued', 'running', 'retry_wait')) as active_job_count,
                  (select count(*) from storyheaven_serial_jobs job
                    where job.run_id = serial_run.id and job.job_status = 'running') as running_job_count
             from storyheaven_serial_runs serial_run
             left join storyheaven_stories story on story.id = serial_run.story_id
             left join storyheaven_serial_schedules schedule on schedule.id = serial_run.schedule_id
            where serial_run.created_at >= systimestamp - numtodsinterval(30, 'DAY')
               or serial_run.queue_canceled_at >= systimestamp - numtodsinterval(90, 'DAY')
               or exists (
                 select 1 from storyheaven_serial_jobs active_job
                  where active_job.run_id = serial_run.id
                    and active_job.job_status in ('queued', 'running', 'retry_wait')
               )
            order by serial_run.created_at desc
         ) where rownum <= 500`
      );
      const timing = await connection.execute(
        `select serial_run.queue_group_id, serial_run.id as run_id,
                serial_run.episode_no, job.job_type, job.job_status,
                job.attempt_count, job.started_at, job.completed_at, job.created_at
           from storyheaven_serial_jobs job
          join storyheaven_serial_runs serial_run on serial_run.id = job.run_id
          where serial_run.created_at >= systimestamp - numtodsinterval(30, 'DAY')
             or serial_run.queue_canceled_at >= systimestamp - numtodsinterval(90, 'DAY')
          order by job.created_at`
      );
      const queue = summarizeQueue(result.rows, timing.rows);
      queue.stalledFirstEpisodeStories = await listStalledFirstEpisodeStories(connection);
      return queue;
    });
  }

  async function cancelQueueGroup(queueGroupIdValue, userId) {
    const queueGroupId = requireId(queueGroupIdValue, "queue_group_id");
    return withTransaction(async (connection) => {
      const state = await selectOne(connection,
        `select
            count(distinct serial_run.id) as run_count,
            sum(case when job.job_status = 'running' then 1 else 0 end) as running_count,
            sum(case when job.job_status in ('queued', 'retry_wait') then 1 else 0 end) as waiting_count,
            sum(case when serial_run.run_status in ('error', 'blocked', 'queued', 'running', 'rewrite', 'approved') then 1 else 0 end) as cancellable_run_count
           from storyheaven_serial_runs serial_run
           left join storyheaven_serial_jobs job on job.run_id = serial_run.id
          where (serial_run.queue_group_id = :queue_group_id or serial_run.id = :queue_group_id)
            and serial_run.queue_canceled_at is null`,
        { queue_group_id: queueGroupId });
      if (!state || Number(state.RUN_COUNT || 0) < 1) throw failure("serial_queue_not_found", 404);
      if (Number(state.RUNNING_COUNT || 0) > 0) throw failure("serial_queue_running_cannot_cancel", 409);
      const waitingCount = Number(state.WAITING_COUNT || 0);
      const historical = waitingCount < 1;
      if (historical && Number(state.CANCELLABLE_RUN_COUNT || 0) < 1) throw failure("serial_queue_completed_cannot_cancel", 409);

      await connection.execute(
        `update storyheaven_serial_jobs
            set job_status = 'canceled', error_code = 'operator_canceled',
                completed_at = systimestamp, updated_at = systimestamp
          where run_id in (
            select id from storyheaven_serial_runs
             where queue_group_id = :queue_group_id or id = :queue_group_id
          ) and job_status in ('queued', 'retry_wait')`,
        { queue_group_id: queueGroupId }
      );
      await connection.execute(
        `update storyheaven_serial_runs
            set run_status = 'blocked', current_stage = 'queue_canceled',
                failure_code = coalesce(failure_code, 'operator_canceled'), queue_canceled_at = systimestamp,
                queue_canceled_by = :queue_canceled_by,
                completed_at = coalesce(completed_at, systimestamp), updated_at = systimestamp
          where (queue_group_id = :queue_group_id or id = :queue_group_id)
            and queue_canceled_at is null
            and run_status in ('queued', 'running', 'rewrite', 'approved', 'error', 'blocked')`,
        { queue_group_id: queueGroupId, queue_canceled_by: userId }
      );
      await connection.execute(
        `delete from storyheaven_serial_continuations
          where run_id in (
            select id from storyheaven_serial_runs
             where queue_group_id = :queue_group_id or id = :queue_group_id
          ) and request_status in ('queued', 'requesting')`,
        { queue_group_id: queueGroupId }
      );
      return { canceled: true, queueGroupId, historical };
    });
  }

  async function hideQueueHistory(queueGroupIdValue, userId) {
    const queueGroupId = requireId(queueGroupIdValue, "queue_group_id");
    return withTransaction(async (connection) => {
      const state = await selectOne(connection,
        `select
            count(distinct serial_run.id) as run_count,
            count(job.id) as total_job_count,
            sum(case when job.job_status = 'complete' then 1 else 0 end) as completed_job_count,
            sum(case when job.job_status = 'running' then 1 else 0 end) as running_job_count,
            sum(case when job.job_status in ('queued', 'retry_wait') then 1 else 0 end) as waiting_job_count,
            sum(case when serial_run.run_status in ('ready', 'published') then 1 else 0 end) as completed_run_count,
            sum(case when serial_run.run_status in ('error', 'blocked', 'queued', 'running', 'rewrite', 'approved') then 1 else 0 end) as hideable_run_count
           from storyheaven_serial_runs serial_run
           left join storyheaven_serial_jobs job on job.run_id = serial_run.id
          where (serial_run.queue_group_id = :queue_group_id or serial_run.id = :queue_group_id)
            and serial_run.queue_canceled_at is null`,
        { queue_group_id: queueGroupId });
      const runCount = Number(state?.RUN_COUNT || 0);
      if (runCount < 1) throw failure("serial_history_not_found", 404);
      if (Number(state.RUNNING_JOB_COUNT || 0) > 0) throw failure("serial_history_running_cannot_hide", 409);
      if (Number(state.WAITING_JOB_COUNT || 0) > 0) throw failure("serial_history_waiting_cannot_hide", 409);
      const totalJobs = Number(state.TOTAL_JOB_COUNT || 0);
      const completedJobs = Number(state.COMPLETED_JOB_COUNT || 0);
      const hideableRuns = Number(state.HIDEABLE_RUN_COUNT || 0);
      const completedRuns = Number(state.COMPLETED_RUN_COUNT || 0);
      const looksComplete = totalJobs > 0 && completedJobs >= totalJobs && completedRuns >= runCount;
      if (looksComplete || hideableRuns < 1) throw failure("serial_history_completed_cannot_hide", 409);

      await connection.execute(
        `update storyheaven_serial_runs
            set run_status = 'blocked',
                current_stage = 'history_hidden',
                failure_code = coalesce(failure_code, 'operator_hidden'),
                queue_canceled_at = systimestamp,
                queue_canceled_by = :queue_canceled_by,
                completed_at = coalesce(completed_at, systimestamp),
                updated_at = systimestamp
          where (queue_group_id = :queue_group_id or id = :queue_group_id)
            and queue_canceled_at is null
            and run_status not in ('ready', 'published')`,
        { queue_group_id: queueGroupId, queue_canceled_by: userId }
      );
      return { hidden: true, queueGroupId, historical: true };
    });
  }

  async function retryQueueGroup(queueGroupIdValue, options = {}) {
    const queueGroupId = requireId(queueGroupIdValue, "queue_group_id");
    const force = options.force === true;
    return withTransaction(async (connection) => {
      const state = await selectOne(connection,
        `select
            sum(case when job.job_status in ('queued', 'running', 'retry_wait') then 1 else 0 end) as active_count,
            sum(case when job.job_status in ('queued', 'retry_wait') then 1 else 0 end) as waiting_count,
            sum(case when job.job_status = 'running' then 1 else 0 end) as running_count,
            sum(case when job.job_status = 'error' then 1 else 0 end) as error_count
           from storyheaven_serial_runs serial_run
           left join storyheaven_serial_jobs job on job.run_id = serial_run.id
          where serial_run.queue_group_id = :queue_group_id
            and serial_run.queue_canceled_at is null`,
        { queue_group_id: queueGroupId });
      if (!state) throw failure("serial_queue_not_found", 404);
      if (Number(state.ACTIVE_COUNT || 0) > 0) {
        let forceReleased = 0;
        if (force && Number(state.RUNNING_COUNT || 0) > 0) {
          const released = await connection.execute(
            `update storyheaven_serial_jobs
                set job_status = 'queued',
                    next_attempt_at = systimestamp,
                    lease_id = null, lease_expires_at = null, worker_id = null,
                    error_code = 'operator_forced_resume',
                    started_at = null, completed_at = null, updated_at = systimestamp
              where run_id in (
                select id from storyheaven_serial_runs where queue_group_id = :queue_group_id
              ) and job_status = 'running'`,
            { queue_group_id: queueGroupId }
          );
          forceReleased = Number(released.rowsAffected || 0);
        }
        await connection.execute(
          `update storyheaven_serial_jobs
              set next_attempt_at = systimestamp,
                  lease_id = null, lease_expires_at = null, worker_id = null,
                  updated_at = systimestamp
            where run_id in (
              select id from storyheaven_serial_runs where queue_group_id = :queue_group_id
            ) and job_status in ('queued', 'retry_wait')`,
          { queue_group_id: queueGroupId }
        );
        await connection.execute(
          `update storyheaven_serial_runs
              set run_status = 'queued',
                  failure_code = null,
                  completed_at = null,
                  started_at = case when :force_resume = 1 then null else started_at end,
                  updated_at = systimestamp
            where id in (
              select serial_run.id
                from storyheaven_serial_runs serial_run
                join storyheaven_serial_jobs job on job.run_id = serial_run.id
               where serial_run.queue_group_id = :queue_group_id
                 and serial_run.queue_canceled_at is null
                 and job.job_status in ('queued', 'retry_wait')
            )
              and queue_canceled_at is null
              and run_status in ('queued', 'running', 'rewrite', 'approved')`,
          { queue_group_id: queueGroupId, force_resume: force ? 1 : 0 }
        );
        return {
          resumed: true,
          reused: true,
          forceReleased: forceReleased > 0,
          queueGroupId
        };
      }
      if (Number(state.ERROR_COUNT || 0) < 1) throw failure("serial_queue_not_retryable", 409);

      await connection.execute(
        `update storyheaven_serial_jobs
            set job_status = 'queued', attempt_count = 0,
                next_attempt_at = systimestamp, lease_id = null, lease_expires_at = null,
                worker_id = null, error_code = null, started_at = null,
                completed_at = null, updated_at = systimestamp
          where run_id in (
            select id from storyheaven_serial_runs where queue_group_id = :queue_group_id
          ) and job_status = 'error'`,
        { queue_group_id: queueGroupId }
      );
      await connection.execute(
        `update storyheaven_serial_runs
            set run_status = 'queued', failure_code = null,
                started_at = null, completed_at = null, updated_at = systimestamp
          where queue_group_id = :queue_group_id
            and queue_canceled_at is null
            and run_status = 'error'`,
        { queue_group_id: queueGroupId }
      );
      return { resumed: true, reused: false, queueGroupId };
    });
  }

  async function setSystemPaused(paused) {
    const targetStatus = paused ? "paused" : "active";
    return withTransaction(async (connection) => {
      const state = await selectOne(connection,
        `select count(*) as total_count,
                sum(case when schedule_status = 'active' then 1 else 0 end) as active_count,
                sum(case when schedule_status = 'paused' then 1 else 0 end) as paused_count
           from storyheaven_serial_schedules
          where schedule_status <> 'archived'`);
      const jobState = paused ? await selectOne(connection,
        `select count(*) as active_count,
                sum(case when job_status = 'running' then 1 else 0 end) as running_count,
                sum(case when job_status in ('queued', 'retry_wait') then 1 else 0 end) as waiting_count
           from storyheaven_serial_jobs job
          where job.job_status in ('queued', 'running', 'retry_wait')
            and exists (
              select 1
                from storyheaven_serial_runs serial_run
               where serial_run.id = job.run_id
                 and serial_run.queue_canceled_at is null
            )`) : null;
      const schedules = await connection.execute(
        `update storyheaven_serial_schedules
            set schedule_status = :target_status,
                updated_at = systimestamp
          where schedule_status <> 'archived'
            and schedule_status <> :target_status`,
        { target_status: targetStatus }
      );
      let heldJobs = 0;
      let interruptedRuns = 0;
      if (paused) {
        const held = await connection.execute(
          `update storyheaven_serial_jobs job
              set job_status = 'retry_wait',
                  next_attempt_at = systimestamp + numtodsinterval(365, 'DAY'),
                  lease_id = null,
                  lease_expires_at = null,
                  worker_id = null,
                  error_code = 'operator_system_paused',
                  completed_at = null,
                  updated_at = systimestamp
            where job.job_status in ('queued', 'running', 'retry_wait')
              and exists (
                select 1
                  from storyheaven_serial_runs serial_run
                 where serial_run.id = job.run_id
                   and serial_run.queue_canceled_at is null
              )`
        );
        heldJobs = Number(held.rowsAffected || 0);
        const runs = await connection.execute(
          `update storyheaven_serial_runs
              set run_status = 'queued',
                  failure_code = null,
                  completed_at = null,
                  updated_at = systimestamp
            where run_status = 'running'
              and queue_canceled_at is null
              and exists (
                select 1
                  from storyheaven_serial_jobs paused_job
                 where paused_job.run_id = storyheaven_serial_runs.id
                   and paused_job.job_status = 'retry_wait'
                   and paused_job.error_code = 'operator_system_paused'
              )`
        );
        interruptedRuns = Number(runs.rowsAffected || 0);
      }
      return {
        paused,
        persisted: true,
        schedulesAffected: Number(schedules.rowsAffected || 0),
        schedulesTotal: Number(state?.TOTAL_COUNT || 0),
        activeBefore: Number(state?.ACTIVE_COUNT || 0),
        pausedBefore: Number(state?.PAUSED_COUNT || 0),
        heldJobs,
        interruptedRunningJobs: Number(jobState?.RUNNING_COUNT || 0),
        waitingJobs: Number(jobState?.WAITING_COUNT || 0),
        interruptedRuns
      };
    });
  }

  async function resumeInterruptedQueues() {
    return withTransaction(async (connection) => {
      const expired = await connection.execute(
        `update storyheaven_serial_jobs
            set job_status = case when attempt_count < max_attempts then 'retry_wait' else 'error' end,
                next_attempt_at = systimestamp,
                lease_id = null,
                lease_expires_at = null,
                worker_id = null,
                error_code = 'lease_expired',
                updated_at = systimestamp
          where job_status = 'running'
            and lease_expires_at < systimestamp`
      );
      const waiting = await connection.execute(
        `update storyheaven_serial_jobs job
            set next_attempt_at = systimestamp,
                lease_id = null,
                lease_expires_at = null,
                worker_id = null,
                error_code = case when error_code = 'operator_system_paused' then null else error_code end,
                updated_at = systimestamp
          where job.job_status in ('queued', 'retry_wait')
            and exists (
              select 1
                from storyheaven_serial_runs serial_run
               where serial_run.id = job.run_id
                 and serial_run.queue_canceled_at is null
            )`
      );
      const retryableGroups = retryableAttentionGroupsSql();
      const errorJobs = await connection.execute(
        `update storyheaven_serial_jobs
            set job_status = 'queued',
                attempt_count = 0,
                next_attempt_at = systimestamp,
                lease_id = null,
                lease_expires_at = null,
                worker_id = null,
                error_code = null,
                started_at = null,
                completed_at = null,
                updated_at = systimestamp
          where job_status = 'error'
            and run_id in (
              select id
                from storyheaven_serial_runs
               where queue_group_id in (${retryableGroups})
            )`
      );
      const errorRuns = await connection.execute(
        `update storyheaven_serial_runs
            set run_status = 'queued',
                failure_code = null,
                started_at = null,
                completed_at = null,
                updated_at = systimestamp
          where run_status = 'error'
            and queue_canceled_at is null
            and queue_group_id in (${retryableGroups})`
      );
      return {
        expiredReleased: Number(expired.rowsAffected || 0),
        waitingReleased: Number(waiting.rowsAffected || 0),
        errorJobsReleased: Number(errorJobs.rowsAffected || 0),
        errorRunsReleased: Number(errorRuns.rowsAffected || 0)
      };
    });
  }

  async function listManagedStories(filters = {}) {
    const { createdFrom, createdTo } = managedStoryDateRange(filters);
    const dateClauses = [];
    const binds = { author_user_id: SYSTEM_AUTHOR_ID };
    if (createdFrom) {
      dateClauses.push("and story.created_at >= to_timestamp_tz(:created_from || ' 00:00:00 +09:00', 'YYYY-MM-DD HH24:MI:SS TZH:TZM')");
      binds.created_from = createdFrom;
    }
    if (createdTo) {
      dateClauses.push("and story.created_at < to_timestamp_tz(:created_to || ' 00:00:00 +09:00', 'YYYY-MM-DD HH24:MI:SS TZH:TZM') + numtodsinterval(1, 'DAY')");
      binds.created_to = createdTo;
    }
    return withConnection(async (connection) => {
      const result = await connection.execute(
        `select story.id, story.title, story.logline, story.genres_json,
                story.story_status, story.view_count, story.published_at,
                story.created_at, story.updated_at,
                nvl(control.visibility,
                  case when story.story_status = 'published' then 'public'
                       when story.story_status = 'archived' then 'archived'
                       else 'private' end) as visibility,
                nvl(control.continuation_mode,
                  case when story.story_status = 'archived' then 'ended'
                       when story.story_status = 'published' then 'auto'
                       else 'manual' end) as continuation_mode,
                control.operator_note, control.updated_at as control_updated_at,
                source.schedule_id, schedule.schedule_name, schedule.schedule_status,
                schedule.publication_mode, schedule.concept_policy_json,
                json_value(bible.narrative_blueprint_json, '$.seriesArchitecture.schemaVersion'
                  returning varchar2(40) null on error) as architecture_version,
                json_value(bible.narrative_blueprint_json, '$.seriesArchitecture.plannedVolumeCount'
                  returning number null on error) as architecture_volume_count,
                json_value(bible.narrative_blueprint_json, '$.seriesArchitecture.plannedMainEpisodeCount'
                  returning number null on error) as architecture_episode_count,
                json_value(bible.narrative_blueprint_json, '$.seriesArchitecture.renewableConflictCount'
                  returning number null on error) as architecture_conflict_count,
                json_value(bible.narrative_blueprint_json, '$.seriesArchitecture.longRevealCount'
                  returning number null on error) as architecture_reveal_count,
                json_value(bible.narrative_blueprint_json, '$.seriesArchitecture.lateRevealCount'
                  returning number null on error) as architecture_late_reveal_count,
                (select count(*) from storyheaven_episodes episode
                  where episode.story_id = story.id) as episode_count,
                (select count(*) from storyheaven_episodes episode
                  where episode.story_id = story.id and episode.episode_status = 'published') as published_episode_count,
                (select max(episode.episode_no) from storyheaven_episodes episode
                  where episode.story_id = story.id and episode.episode_status = 'published') as latest_episode_no,
                (select max(episode.title) keep (dense_rank last order by episode.episode_no)
                   from storyheaven_episodes episode
                  where episode.story_id = story.id and episode.episode_status = 'published') as latest_episode_title,
                (select max(episode.published_at) from storyheaven_episodes episode
                  where episode.story_id = story.id and episode.episode_status = 'published') as latest_episode_at,
                (select count(*) from storyheaven_episode_votes vote
                   join storyheaven_episodes episode on episode.id = vote.episode_id
                  where episode.story_id = story.id and vote.vote_type = 'recommend') as recommendation_count,
                (select count(*) from storyheaven_serial_runs serial_run
                  where serial_run.story_id = story.id
                    and serial_run.run_status in ('queued', 'running', 'rewrite', 'ready')
                    and serial_run.queue_canceled_at is null) as active_run_count,
                (select max(serial_run.run_status) keep (dense_rank last order by serial_run.created_at)
                   from storyheaven_serial_runs serial_run
                  where serial_run.story_id = story.id) as latest_run_status,
                (select count(*) from storyheaven_publication_queue publication
                  where publication.story_id = story.id and publication.queue_status = 'ready') as ready_publication_count
           from storyheaven_stories story
           left join storyheaven_serial_story_controls control on control.story_id = story.id
           left join (
             select serial_run.story_id,
                    max(serial_run.schedule_id) keep (dense_rank last order by serial_run.created_at) as schedule_id
               from storyheaven_serial_runs serial_run
              where serial_run.story_id is not null and serial_run.schedule_id is not null
              group by serial_run.story_id
           ) source on source.story_id = story.id
           left join storyheaven_serial_schedules schedule on schedule.id = source.schedule_id
           left join storyheaven_serial_bibles bible on bible.story_id = story.id
          where story.author_user_id = :author_user_id
            and story.content_origin = 'admin_seed'
            ${dateClauses.join("\n            ")}
          order by nvl((select max(episode.published_at) from storyheaven_episodes episode
                         where episode.story_id = story.id), story.updated_at) desc
          fetch first 500 rows only`,
        binds
      );
      return result.rows.map(mapManagedStory);
    });
  }

  async function getManagedStory(connection, storyId) {
    const row = await selectOne(connection,
      `select story.id, story.title, story.logline, story.genres_json,
              story.story_status, story.view_count, story.published_at,
              story.created_at, story.updated_at,
              nvl(control.visibility,
                case when story.story_status = 'published' then 'public'
                     when story.story_status = 'archived' then 'archived'
                     else 'private' end) as visibility,
              nvl(control.continuation_mode,
                case when story.story_status = 'archived' then 'ended'
                     when story.story_status = 'published' then 'auto'
                     else 'manual' end) as continuation_mode,
              control.operator_note, control.updated_at as control_updated_at,
              source.schedule_id, schedule.schedule_name, schedule.schedule_status,
              schedule.publication_mode, schedule.concept_policy_json,
              json_value(bible.narrative_blueprint_json, '$.seriesArchitecture.schemaVersion'
                returning varchar2(40) null on error) as architecture_version,
              json_value(bible.narrative_blueprint_json, '$.seriesArchitecture.plannedVolumeCount'
                returning number null on error) as architecture_volume_count,
              json_value(bible.narrative_blueprint_json, '$.seriesArchitecture.plannedMainEpisodeCount'
                returning number null on error) as architecture_episode_count,
              json_value(bible.narrative_blueprint_json, '$.seriesArchitecture.renewableConflictCount'
                returning number null on error) as architecture_conflict_count,
              json_value(bible.narrative_blueprint_json, '$.seriesArchitecture.longRevealCount'
                returning number null on error) as architecture_reveal_count,
              json_value(bible.narrative_blueprint_json, '$.seriesArchitecture.lateRevealCount'
                returning number null on error) as architecture_late_reveal_count,
              (select count(*) from storyheaven_episodes episode
                where episode.story_id = story.id) as episode_count,
              (select count(*) from storyheaven_episodes episode
                where episode.story_id = story.id and episode.episode_status = 'published') as published_episode_count,
              (select max(episode.episode_no) from storyheaven_episodes episode
                where episode.story_id = story.id and episode.episode_status = 'published') as latest_episode_no,
              (select max(episode.title) keep (dense_rank last order by episode.episode_no)
                 from storyheaven_episodes episode
                where episode.story_id = story.id and episode.episode_status = 'published') as latest_episode_title,
              (select max(episode.published_at) from storyheaven_episodes episode
                where episode.story_id = story.id and episode.episode_status = 'published') as latest_episode_at,
              (select count(*) from storyheaven_episode_votes vote
                 join storyheaven_episodes episode on episode.id = vote.episode_id
                where episode.story_id = story.id and vote.vote_type = 'recommend') as recommendation_count,
              (select count(*) from storyheaven_serial_runs serial_run
                where serial_run.story_id = story.id
                  and serial_run.run_status in ('queued', 'running', 'rewrite', 'ready')
                  and serial_run.queue_canceled_at is null) as active_run_count,
              (select max(serial_run.run_status) keep (dense_rank last order by serial_run.created_at)
                 from storyheaven_serial_runs serial_run
                where serial_run.story_id = story.id) as latest_run_status,
              (select count(*) from storyheaven_publication_queue publication
                where publication.story_id = story.id and publication.queue_status = 'ready') as ready_publication_count
         from storyheaven_stories story
         left join storyheaven_serial_story_controls control on control.story_id = story.id
         left join (
           select serial_run.story_id,
                  max(serial_run.schedule_id) keep (dense_rank last order by serial_run.created_at) as schedule_id
             from storyheaven_serial_runs serial_run
            where serial_run.story_id is not null and serial_run.schedule_id is not null
            group by serial_run.story_id
         ) source on source.story_id = story.id
         left join storyheaven_serial_schedules schedule on schedule.id = source.schedule_id
         left join storyheaven_serial_bibles bible on bible.story_id = story.id
        where story.id = :story_id
          and story.author_user_id = :author_user_id
          and story.content_origin = 'admin_seed'`,
      { story_id: storyId, author_user_id: SYSTEM_AUTHOR_ID });
    if (!row) throw failure("story_not_found", 404);
    return mapManagedStory(row);
  }

  async function updateStoryControl(storyIdValue, input = {}, userId) {
    const storyId = requireId(storyIdValue, "story_id");
    const checked = validateStoryHeavenSerialStoryControl(input);
    if (!checked.ok) throw failure(checked.errors[0].code, 400, checked.errors);
    const { visibility, continuationMode, operatorNote } = checked.control;

    return withTransaction(async (connection) => {
      const story = await selectOne(connection,
        `select id, author_user_id, content_origin, story_status
           from storyheaven_stories where id = :story_id for update`,
        { story_id: storyId });
      if (!story) throw failure("story_not_found", 404);
      if (story.AUTHOR_USER_ID !== SYSTEM_AUTHOR_ID || story.CONTENT_ORIGIN !== "admin_seed") {
        throw failure("serial_story_not_system_owned", 409);
      }
      if (visibility === "public") {
        const episodes = await selectOne(connection,
          `select count(*) as published_count from storyheaven_episodes
            where story_id = :story_id and episode_status = 'published'`,
          { story_id: storyId });
        if (Number(episodes.PUBLISHED_COUNT || 0) < 1) throw failure("serial_story_publish_requires_episode", 409);
      }

      await connection.execute(
        `merge into storyheaven_serial_story_controls target
         using (select :story_id story_id from dual) source on (target.story_id = source.story_id)
         when matched then update set
           target.visibility = :visibility,
           target.continuation_mode = :continuation_mode,
           target.operator_note = :operator_note,
           target.updated_by = :updated_by,
           target.updated_at = systimestamp
         when not matched then insert (
           story_id, visibility, continuation_mode, operator_note, created_by, updated_by
         ) values (
           :story_id, :visibility, :continuation_mode, :operator_note, :created_by, :updated_by
         )`,
        {
          story_id: storyId,
          visibility,
          continuation_mode: continuationMode,
          operator_note: operatorNote || null,
          created_by: userId,
          updated_by: userId
        }
      );

      const storyStatus = visibility === "public" ? "published" : visibility === "archived" ? "archived" : "draft";
      await connection.execute(
        `update storyheaven_stories
            set story_status = :story_status,
                review_decision = case when :story_status = 'published' then 'approved' else review_decision end,
                published_at = case when :story_status = 'published' then coalesce(published_at, systimestamp) else published_at end,
                updated_at = systimestamp
          where id = :story_id`,
        { story_id: storyId, story_status: storyStatus }
      );

      let linkedHidden = null;
      if (visibility === "archived") {
        const jobs = await connection.execute(
          `update storyheaven_serial_jobs
              set job_status = 'canceled',
                  lease_id = null,
                  lease_expires_at = null,
                  worker_id = null,
                  error_code = 'operator_story_hidden',
                  completed_at = systimestamp,
                  updated_at = systimestamp
            where story_id = :story_id
              and job_status in ('queued', 'running', 'retry_wait')`,
          { story_id: storyId }
        );
        const runs = await connection.execute(
          `update storyheaven_serial_runs
              set run_status = case
                    when run_status in ('queued', 'running', 'rewrite', 'approved') then 'blocked'
                    else run_status
                  end,
                  current_stage = case
                    when run_status in ('queued', 'running', 'rewrite', 'approved') then 'story_hidden'
                    else current_stage
                  end,
                  failure_code = case
                    when run_status in ('queued', 'running', 'rewrite', 'approved') then 'operator_story_hidden'
                    else failure_code
                  end,
                  queue_canceled_at = coalesce(queue_canceled_at, systimestamp),
                  queue_canceled_by = coalesce(queue_canceled_by, :queue_canceled_by),
                  completed_at = case
                    when run_status in ('queued', 'running', 'rewrite', 'approved') then coalesce(completed_at, systimestamp)
                    else completed_at
                  end,
                  updated_at = systimestamp
            where story_id = :story_id
              and queue_canceled_at is null`,
          { story_id: storyId, queue_canceled_by: userId }
        );
        const publications = await connection.execute(
          `update storyheaven_publication_queue
              set queue_status = 'canceled',
                  failure_code = 'operator_story_hidden',
                  updated_at = systimestamp
            where story_id = :story_id
              and queue_status in ('ready', 'publishing')`,
          { story_id: storyId }
        );
        const continuations = await connection.execute(
          `delete from storyheaven_serial_continuations
            where story_id = :story_id
              and request_status in ('queued', 'requesting')`,
          { story_id: storyId }
        );
        linkedHidden = {
          jobs: Number(jobs.rowsAffected || 0),
          runs: Number(runs.rowsAffected || 0),
          publications: Number(publications.rowsAffected || 0),
          continuations: Number(continuations.rowsAffected || 0)
        };
      }

      return { ...await getManagedStory(connection, storyId), linkedHidden };
    });
  }

  async function updateStoryControls(input = {}, userId) {
    const rawStoryIds = Array.isArray(input.storyIds) ? input.storyIds : [];
    if (!rawStoryIds.length) throw failure("serial_bulk_story_selection_required", 400);
    if (rawStoryIds.length > 100) throw failure("serial_bulk_story_limit", 400);
    const storyIds = [...new Set(rawStoryIds.map((storyId) => requireId(storyId, "story_id")))];
    const visibility = String(input.visibility || "").trim();
    if (!STORYHEAVEN_SERIAL_STORY_CONTROL.visibilities.includes(visibility)) {
      throw failure("serial_story_visibility_invalid", 400, [{ field: "visibility", code: "serial_story_visibility_invalid" }]);
    }

    const updatedStoryIds = [];
    const failures = [];
    for (let index = 0; index < storyIds.length; index += 1) {
      const storyId = storyIds[index];
      let current = null;
      try {
        current = await withConnection((connection) => getManagedStory(connection, storyId));
        const continuationMode = visibility === "archived"
          ? "ended"
          : visibility === "private" && (current.visibility === "archived" || current.continuationMode === "auto")
            ? "manual"
            : current.continuationMode;
        await updateStoryControl(storyId, {
          visibility,
          continuationMode,
          operatorNote: current.operatorNote || ""
        }, userId);
        updatedStoryIds.push(storyId);
      } catch (error) {
        const code = Number.isInteger(error?.status)
          ? cleanCode(error.message)
          : "serial_bulk_story_update_failed";
        failures.push({
          storyId,
          title: current?.title || "",
          code
        });
        if (!Number.isInteger(error?.status)) {
          failures.push(...storyIds.slice(index + 1).map((pendingStoryId) => ({
            storyId: pendingStoryId,
            title: "",
            code
          })));
          break;
        }
      }
    }
    return {
      visibility,
      requestedCount: storyIds.length,
      updatedCount: updatedStoryIds.length,
      updatedStoryIds,
      failures
    };
  }

  async function saveSchedule(input, userId, scheduleIdValue = null) {
    const checked = validateStoryHeavenSerialSchedule(input);
    if (!checked.ok) throw failure("serial_schedule_invalid", 400, checked.errors);
    const scheduleId = scheduleIdValue ? requireId(scheduleIdValue, "schedule_id") : randomId();
    const status = ["active", "paused"].includes(input.status) ? input.status : "paused";
    const nextRunAt = dateOrNull(input.nextRunAt, "serial_schedule_time_invalid")
      || new Date(Date.now() + checked.schedule.cadenceMinutes * 60_000);
    return withTransaction(async (connection) => {
      await connection.execute(
        `merge into storyheaven_serial_schedules target
         using (select :id id from dual) source on (target.id = source.id)
         when matched then update set
           target.schedule_name = :schedule_name,
           target.schedule_status = :schedule_status,
           target.cadence_days = :cadence_days,
           target.cadence_minutes = :cadence_minutes,
           target.target_episode_count = :target_episode_count,
           target.target_age = :target_age,
           target.genre_pool_json = :genre_pool_json,
           target.primary_genre = :primary_genre,
           target.primary_genres_json = :primary_genres_json,
           target.subgenres_json = :subgenres_json,
           target.subgenres_by_genre_json = :subgenres_by_genre_json,
           target.publication_mode = :publication_mode,
           target.concept_policy_json = :concept_policy_json,
           target.max_active_serials = 1,
           target.next_run_at = :next_run_at,
           target.updated_at = systimestamp
         when not matched then insert (
           id, schedule_name, schedule_status, cadence_days, cadence_minutes,
           target_episode_count, target_age,
           genre_pool_json, primary_genre, primary_genres_json,
           subgenres_json, subgenres_by_genre_json, publication_mode,
           concept_policy_json, max_active_serials,
           next_run_at, created_by
         ) values (
           :id, :schedule_name, :schedule_status, :cadence_days, :cadence_minutes,
           :target_episode_count, :target_age,
           :genre_pool_json, :primary_genre, :primary_genres_json,
           :subgenres_json, :subgenres_by_genre_json, :publication_mode,
           :concept_policy_json, 1,
           :next_run_at, :created_by
         )`,
        {
          id: scheduleId,
          schedule_name: checked.schedule.name,
          schedule_status: status,
          cadence_days: checked.schedule.cadenceDays,
          cadence_minutes: checked.schedule.cadenceMinutes,
          target_episode_count: checked.schedule.targetEpisodeCount,
          target_age: checked.schedule.targetAge,
          genre_pool_json: clobJson(checked.schedule.genrePool),
          primary_genre: checked.schedule.primaryGenre,
          primary_genres_json: clobJson(checked.schedule.primaryGenres),
          subgenres_json: clobJson(checked.schedule.subgenres),
          subgenres_by_genre_json: clobJson(checked.schedule.subgenresByGenre),
          publication_mode: checked.schedule.publicationMode,
          concept_policy_json: clobJson({
            instruction: checked.schedule.conceptPolicy,
            creativeControls: checked.schedule.creativeControls,
            seriesPlan: checked.schedule.seriesPlan,
            continuationBatchCount: checked.schedule.continuationBatchCount,
            randomized: checked.schedule.randomized
          }),
          next_run_at: nextRunAt,
          created_by: userId
        }
      );
      const row = await selectOne(connection,
        `select * from storyheaven_serial_schedules where id = :id`, { id: scheduleId });
      return mapSchedule(row);
    });
  }

  async function archiveSchedule(scheduleIdValue, userId) {
    const scheduleId = requireId(scheduleIdValue, "schedule_id");
    return withTransaction(async (connection) => {
      const schedule = await selectOne(connection,
        `select id, schedule_status
           from storyheaven_serial_schedules
          where id = :schedule_id for update`,
        { schedule_id: scheduleId });
      if (!schedule) throw failure("serial_schedule_not_found", 404);

      const jobs = await connection.execute(
        `update storyheaven_serial_jobs job
            set job_status = 'canceled',
                lease_id = null,
                lease_expires_at = null,
                worker_id = null,
                error_code = 'operator_schedule_deleted',
                completed_at = systimestamp,
                updated_at = systimestamp
          where job.job_status in ('queued', 'running', 'retry_wait')
            and exists (
              select 1
                from storyheaven_serial_runs serial_run
               where serial_run.id = job.run_id
                 and serial_run.schedule_id = :schedule_id
            )`,
        { schedule_id: scheduleId }
      );
      const publications = await connection.execute(
        `update storyheaven_publication_queue publication
            set queue_status = 'canceled',
                failure_code = 'operator_schedule_deleted',
                updated_at = systimestamp
          where publication.queue_status in ('ready', 'publishing')
            and exists (
              select 1
                from storyheaven_serial_runs serial_run
               where serial_run.id = publication.run_id
                 and serial_run.schedule_id = :schedule_id
            )`,
        { schedule_id: scheduleId }
      );
      const continuations = await connection.execute(
        `delete from storyheaven_serial_continuations continuation
          where continuation.request_status in ('queued', 'requesting')
            and exists (
              select 1
                from storyheaven_serial_runs serial_run
               where serial_run.id = continuation.run_id
                 and serial_run.schedule_id = :schedule_id
            )`,
        { schedule_id: scheduleId }
      );
      const runs = await connection.execute(
        `update storyheaven_serial_runs
            set run_status = 'blocked',
                current_stage = 'schedule_deleted',
                failure_code = 'operator_schedule_deleted',
                queue_canceled_at = coalesce(queue_canceled_at, systimestamp),
                queue_canceled_by = coalesce(queue_canceled_by, :queue_canceled_by),
                completed_at = coalesce(completed_at, systimestamp),
                updated_at = systimestamp
          where schedule_id = :schedule_id
            and run_status <> 'published'
            and queue_canceled_at is null`,
        { schedule_id: scheduleId, queue_canceled_by: userId }
      );
      await connection.execute(
        `update storyheaven_serial_schedules
            set schedule_status = 'archived',
                next_run_at = null,
                updated_at = systimestamp
          where id = :schedule_id`,
        { schedule_id: scheduleId }
      );
      return {
        deleted: true,
        scheduleId,
        alreadyDeleted: schedule.SCHEDULE_STATUS === "archived",
        canceled: {
          jobs: Number(jobs.rowsAffected || 0),
          runs: Number(runs.rowsAffected || 0),
          publications: Number(publications.rowsAffected || 0),
          continuations: Number(continuations.rowsAffected || 0)
        }
      };
    });
  }

  async function runSchedule(scheduleIdValue, userId) {
    const scheduleId = requireId(scheduleIdValue, "schedule_id");
    return withTransaction((connection) => queueConceptRun(connection, scheduleId, userId, { manual: true }));
  }

  async function planStory(storyIdValue, userId, input = {}) {
    const storyId = requireId(storyIdValue, "story_id");
    return withTransaction(async (connection) => {
      const story = await selectOne(connection,
        `select id, title, logline, public_synopsis, genre, genres_json, tags_json,
                content_rating, content_origin, author_user_id, story_status
           from storyheaven_stories where id = :story_id for update`,
        { story_id: storyId });
      if (!story) throw failure("story_not_found", 404);
      if (story.AUTHOR_USER_ID !== SYSTEM_AUTHOR_ID || story.CONTENT_ORIGIN !== "admin_seed") {
        throw failure("serial_story_not_system_owned", 409);
      }
      if (story.STORY_STATUS === "archived") throw failure("serial_story_archived", 409);
      return queueStoryPlanning(connection, story, userId, input);
    });
  }

  async function strengthenStoryArchitecture(storyIdValue, userId, input = {}) {
    const storyId = requireId(storyIdValue, "story_id");
    return withTransaction(async (connection) => {
      const story = await selectOne(connection,
        `select id, title, logline, public_synopsis, genre, genres_json, tags_json,
                content_rating, content_origin, author_user_id, story_status
           from storyheaven_stories where id = :story_id for update`,
        { story_id: storyId });
      if (!story) throw failure("story_not_found", 404);
      if (story.AUTHOR_USER_ID !== SYSTEM_AUTHOR_ID || story.CONTENT_ORIGIN !== "admin_seed") {
        throw failure("serial_story_not_system_owned", 409);
      }
      if (story.STORY_STATUS === "archived") throw failure("serial_story_archived", 409);
      const active = await selectOne(connection,
        `select count(*) as active_count
           from storyheaven_serial_runs
          where story_id = :story_id
            and run_status in ('queued', 'running', 'rewrite', 'ready')
            and queue_canceled_at is null`,
        { story_id: storyId });
      if (Number(active.ACTIVE_COUNT || 0) > 0) throw failure("serial_story_work_active", 409);

      const bibleRow = await selectOne(connection,
        `select * from storyheaven_serial_bibles where story_id = :story_id`,
        { story_id: storyId });
      const existingContext = bibleRow
        ? await loadSerialContext(connection, storyId, { requireArc: false })
        : null;
      const existingConcept = existingContext?.bible?.concept || {};
      const concept = normalizeStoryHeavenSerialWorkerResult("concept_gate", {
        title: input.concept?.title || existingConcept.title || story.TITLE,
        logline: input.concept?.logline || existingConcept.logline || story.LOGLINE,
        synopsis: input.concept?.synopsis || existingConcept.synopsis || story.PUBLIC_SYNOPSIS,
        genres: input.concept?.genres || existingConcept.genres || parseJson(story.GENRES_JSON, [story.GENRE]),
        tags: input.concept?.tags || existingConcept.tags || parseJson(story.TAGS_JSON, []),
        rating: existingConcept.rating || (story.CONTENT_RATING === "all" ? "all" : "teen"),
        readerPromise: input.concept?.readerPromise || existingConcept.readerPromise || `${story.TITLE}의 중심 갈등이 매 권 새로운 선택과 결과로 이어진다.`,
        familiarPleasure: input.concept?.familiarPleasure || existingConcept.familiarPleasure || "장르 독자가 기대하는 사건 해결과 인물 성장의 즐거움",
        novelTwist: input.concept?.novelTwist || existingConcept.novelTwist || "기존 설정의 한 가지 차별점이 인물의 선택마다 다른 대가를 만든다.",
        targetAge: existingConcept.targetAge || (story.CONTENT_RATING === "all" ? "all" : "teen")
      });
      const seriesPlan = normalizeSeriesPlan(
        input.seriesPlan
        || existingContext?.bible?.narrativeBlueprint?.seriesPlan
        || existingConcept.seriesPlan
      );
      const conceptWithPlan = { ...concept, seriesPlan };
      if (bibleRow) {
        await connection.execute(
          `update storyheaven_serial_bibles
              set concept_json = :concept_json, updated_at = systimestamp
            where story_id = :story_id`,
          { story_id: storyId, concept_json: clobJson(conceptWithPlan) }
        );
      } else {
        await upsertBibleConcept(connection, storyId, conceptWithPlan);
      }
      const run = await createRun(connection, {
        storyId,
        runType: "planning",
        stage: "build_bible",
        userId,
        input: { architectureOnly: true, preserveExistingWork: true }
      });
      await queueJob(connection, {
        runId: run.id,
        storyId,
        type: "build_bible",
        maxAttempts: ARCHITECTURE_MAX_ATTEMPTS,
        input: {
          story: publicStory(story),
          concept: conceptWithPlan,
          seriesPlan,
          architectureOnly: true,
          preserveExistingWork: true,
          existingBible: existingContext?.bible || null,
          priorArcs: existingContext?.priorArcs || [],
          canon: existingContext?.canon || [],
          reveals: existingContext?.reveals || [],
          recentEpisodes: existingContext?.recentEpisodes || []
        }
      });
      return run;
    });
  }

  async function queueStoryPlanning(connection, story, userId, input = {}) {
    const existing = await selectOne(connection,
      `select * from (
         select serial_run.* from storyheaven_serial_runs serial_run
          where serial_run.story_id = :story_id
            and serial_run.run_type = 'planning'
            and serial_run.run_status in ('queued', 'running', 'rewrite')
            and serial_run.queue_canceled_at is null
          order by serial_run.created_at desc
       ) where rownum = 1`,
      { story_id: story.ID });
    if (existing) return { ...mapRun(existing), reused: true };
    const concept = normalizeStoryHeavenSerialWorkerResult("concept_gate", {
      title: input.concept?.title || story.TITLE,
      logline: input.concept?.logline || story.LOGLINE,
      synopsis: input.concept?.synopsis || story.PUBLIC_SYNOPSIS,
      genres: input.concept?.genres || parseJson(story.GENRES_JSON, [story.GENRE]),
      tags: input.concept?.tags || parseJson(story.TAGS_JSON, []),
      rating: story.CONTENT_RATING === "all" ? "all" : "teen",
      readerPromise: input.concept?.readerPromise || `매 회차 ${story.TITLE}의 핵심 갈등을 진전시키며 다음 화의 질문을 남긴다.`,
      familiarPleasure: input.concept?.familiarPleasure || "장르 독자가 기대하는 사건 해결과 성장의 즐거움",
      novelTwist: input.concept?.novelTwist || "작품 고유의 세계 규칙이 인물의 선택마다 다른 대가를 만든다.",
      targetAge: story.CONTENT_RATING === "all" ? "all" : "teen"
    });
    const conceptWithPlan = { ...concept, seriesPlan: normalizeSeriesPlan(input.seriesPlan) };
    await upsertBibleConcept(connection, story.ID, conceptWithPlan);
    const run = await createRun(connection, {
      storyId: story.ID,
      runType: "planning",
      stage: "build_bible",
      userId,
      input: {
        autoEpisode: input.autoEpisode === true,
        releaseAt: dateOrNull(input.releaseAt)?.toISOString() || null,
        concept: conceptWithPlan,
        batchEndEpisodeNo: positiveInteger(input.batchEndEpisodeNo)
      }
    });
    await queueJob(connection, {
      runId: run.id,
      storyId: story.ID,
      type: "build_bible",
      input: { story: publicStory(story), concept: conceptWithPlan, seriesPlan: conceptWithPlan.seriesPlan }
    });
    return run;
  }

  async function queueStoryContinuationBootstrap(connection, story, userId, targetEpisodeNo, batchEndEpisodeNo = null) {
    const bible = await selectOne(connection,
      `select story_id from storyheaven_serial_bibles
        where story_id = :story_id and bible_status = 'active'`,
      { story_id: story.ID });
    if (!bible) return queueStoryPlanning(connection, story, userId, { autoEpisode: true, batchEndEpisodeNo });

    const existing = await selectOne(connection,
      `select * from (
         select serial_run.* from storyheaven_serial_runs serial_run
          where serial_run.story_id = :story_id
            and serial_run.run_status in ('queued', 'running', 'rewrite')
            and serial_run.queue_canceled_at is null
          order by serial_run.created_at desc
       ) where rownum = 1`,
      { story_id: story.ID });
    if (existing) return { ...mapRun(existing), reused: true };

    const context = await loadSerialContext(connection, story.ID, { requireArc: false });
    if (context.arc?.episodePlan.some((item) => Number(item.episodeNo) === targetEpisodeNo)) {
      return createEpisodeRun(connection, {
        storyId: story.ID,
        userId,
        episodeNo: targetEpisodeNo,
        releaseAt: null,
        notes: "",
        scheduleId: null,
        batchEndEpisodeNo
      });
    }

    const nextArcNo = Math.max(0, ...context.priorArcs.map((arc) => Number(arc.arcNo || 0))) + 1;
    const seriesPlan = context.bible.narrativeBlueprint?.seriesPlan || context.bible.concept?.seriesPlan || normalizeSeriesPlan();
    const arcScope = safeArcScope(targetEpisodeNo, seriesPlan, context.bible.narrativeBlueprint?.seriesArchitecture);
    const planning = await createRun(connection, {
      storyId: story.ID,
      runType: "planning",
      stage: "build_arc",
      userId,
      input: { autoEpisode: true, releaseAt: null, batchEndEpisodeNo }
    });
    await queueJob(connection, {
      runId: planning.id,
      storyId: story.ID,
      type: "build_arc",
      input: {
        story: context.story,
        concept: context.bible.concept,
        bible: context.bible,
        arcNo: nextArcNo,
        firstEpisodeNo: targetEpisodeNo,
        seriesPlan,
        arcScope,
        priorArcs: context.priorArcs,
        canon: context.canon,
        autoEpisode: true
      }
    });
    return planning;
  }

  async function queueEpisode(storyIdValue, userId, input = {}) {
    const storyId = requireId(storyIdValue, "story_id");
    const checked = validateStoryHeavenEpisodeRun(input);
    if (!checked.ok) throw failure("serial_episode_request_invalid", 400, checked.errors);
    return withTransaction((connection) => createEpisodeRun(connection, {
      storyId,
      userId,
      episodeNo: checked.request.episodeNo,
      releaseAt: checked.request.releaseAt,
      notes: checked.request.notes,
      scheduleId: null
    }));
  }

  async function rewriteEpisode(storyIdValue, episodeNoValue, userId, input = {}) {
    const storyId = requireId(storyIdValue, "story_id");
    const episodeNo = Number(episodeNoValue);
    if (!Number.isInteger(episodeNo) || episodeNo < 1 || episodeNo > STORYHEAVEN_SERIAL_LIMITS.internalEpisodeNoMax) throw failure("invalid_episode_number", 400);
    return withTransaction(async (connection) => {
      const story = await selectOne(connection,
        `select id, author_user_id, content_origin
           from storyheaven_stories where id = :story_id for update`,
        { story_id: storyId });
      if (!story) throw failure("story_not_found", 404);
      if (story.AUTHOR_USER_ID !== SYSTEM_AUTHOR_ID || story.CONTENT_ORIGIN !== "admin_seed") {
        throw failure("serial_story_not_system_owned", 409);
      }
      const existing = await selectOne(connection,
        `select title, public_summary, episode_status
           from storyheaven_episodes
          where story_id = :story_id and episode_no = :episode_no`,
        { story_id: storyId, episode_no: episodeNo });
      if (!existing) throw failure("episode_not_found", 404);
      const active = await selectOne(connection,
        `select count(*) as run_count
           from storyheaven_serial_runs
          where story_id = :story_id
            and episode_no = :episode_no
            and run_status in ('queued', 'running', 'rewrite', 'ready')
            and queue_canceled_at is null`,
        { story_id: storyId, episode_no: episodeNo });
      if (Number(active.RUN_COUNT || 0) > 0) throw failure("serial_episode_already_queued", 409);
      const context = await loadSerialContext(connection, storyId);
      const planItem = context.arc.episodePlan.find((item) => Number(item.episodeNo) === episodeNo)
        || context.cards.find((item) => Number(item.episodeNo) === episodeNo);
      if (!planItem) throw failure("serial_arc_episode_not_planned", 409);
      const run = await createRun(connection, {
        storyId,
        arcId: context.arc.id,
        episodeNo,
        runType: "episode",
        stage: "build_episode_card",
        userId,
        releaseAt: null,
        input: {
          notes: cleanText(input.notes, 1000),
          rewriteEpisode: true,
          rewriteTarget: {
            episodeNo,
            title: existing.TITLE,
            summary: existing.PUBLIC_SUMMARY || "",
            status: existing.EPISODE_STATUS
          }
        }
      });
      await queueJob(connection, {
        runId: run.id,
        storyId,
        type: "build_episode_card",
        input: {
          ...episodePlanningPayload(context, episodeNo, planItem, input.notes),
          rewriteTarget: {
            episodeNo,
            title: existing.TITLE,
            summary: existing.PUBLIC_SUMMARY || "",
            instruction: "운영자가 이 회차를 다시 쓰라고 요청했다. 기존 회차의 핵심 기능은 살리되 더 명확하고 이어 읽기 좋은 새 원고로 교체할 준비를 한다."
          }
        }
      });
      return run;
    });
  }

  async function requestContinuation(storyIdValue, sourceEpisodeNoValue, {
    requestedBy = null,
    triggerType = "reader_threshold",
    batchCount = 1,
    notes = ""
  } = {}) {
    const storyId = requireId(storyIdValue, "story_id");
    const checked = validateStoryHeavenContinuationRequest({ batchCount, notes });
    if (!checked.ok) throw failure(checked.errors[0].code, 400, checked.errors);
    const sourceEpisodeNo = Number(sourceEpisodeNoValue);
    if (!new Set(["reader_threshold", "admin_request"]).has(triggerType)) {
      throw failure("serial_continuation_trigger_invalid", 400);
    }
    if (!Number.isInteger(sourceEpisodeNo) || sourceEpisodeNo < continuationMinimumEpisode(triggerType) || sourceEpisodeNo >= STORYHEAVEN_SERIAL_LIMITS.internalEpisodeNoMax) {
      throw failure("serial_continuation_episode_invalid", 400);
    }
    const targetEpisodeNo = sourceEpisodeNo + 1;
    const batchEndEpisodeNo = Math.min(STORYHEAVEN_SERIAL_LIMITS.internalEpisodeNoMax, sourceEpisodeNo + checked.request.batchCount);
    return withTransaction(async (connection) => {
      const source = await selectOne(connection,
        `select episode.id as episode_id, episode.story_id, episode.episode_no,
                story.author_user_id, story.content_origin, story.story_status,
                nvl(control.visibility,
                  case when story.story_status = 'published' then 'public' else 'private' end) as visibility,
                nvl(control.continuation_mode,
                  case when story.story_status = 'published' then 'auto' else 'manual' end) as continuation_mode,
                (select max(latest.episode_no) from storyheaven_episodes latest
                  where latest.story_id = episode.story_id
                    and latest.episode_status = 'published') as latest_episode_no
           from storyheaven_episodes episode
           join storyheaven_stories story on story.id = episode.story_id
           left join storyheaven_serial_story_controls control on control.story_id = story.id
          where episode.story_id = :story_id and episode.episode_no = :episode_no
            and episode.episode_status = 'published'
            and story.story_status in ('published', 'draft')`,
        { story_id: storyId, episode_no: sourceEpisodeNo });
      if (!source) throw failure("episode_not_found", 404);
      if (source.AUTHOR_USER_ID !== SYSTEM_AUTHOR_ID || source.CONTENT_ORIGIN !== "admin_seed") {
        throw failure("serial_story_not_system_owned", 409);
      }
      if (triggerType === "reader_threshold"
        && (source.STORY_STATUS !== "published" || source.VISIBILITY !== "public" || source.CONTINUATION_MODE !== "auto")) {
        throw failure("serial_story_auto_continuation_disabled", 409);
      }
      if (Number(source.LATEST_EPISODE_NO || 0) !== sourceEpisodeNo) {
        throw failure("serial_continuation_latest_episode_required", 409);
      }

      const recommendation = await selectOne(connection,
        `select count(*) as recommendation_count
           from storyheaven_episode_votes
          where episode_id = :episode_id and vote_type = 'recommend'`,
        { episode_id: source.EPISODE_ID });
      const recommendationCount = Number(recommendation.RECOMMENDATION_COUNT || 0);
      if (triggerType === "reader_threshold" && recommendationCount < STORYHEAVEN_CONTINUATION_POLICY.recommendationThreshold) {
        throw failure("serial_recommendation_threshold_pending", 409, [{
          recommendationCount,
          threshold: STORYHEAVEN_CONTINUATION_POLICY.recommendationThreshold
        }]);
      }

      const existingRequest = await selectOne(connection,
        `select * from storyheaven_serial_continuations
          where story_id = :story_id and target_episode_no = :target_episode_no
          for update`,
        { story_id: storyId, target_episode_no: targetEpisodeNo });
      if (existingRequest) return mapContinuation(existingRequest);

      const sourceRun = await selectOne(connection,
        `select * from (
           select serial_run.* from storyheaven_serial_runs serial_run
            where serial_run.story_id = :story_id
              and serial_run.episode_no = :episode_no
              and serial_run.run_type = 'episode'
              and serial_run.run_status = 'published'
              and serial_run.schedule_id is not null
            order by serial_run.created_at desc
        ) where rownum = 1`,
        { story_id: storyId, episode_no: sourceEpisodeNo });
      if (!sourceRun && triggerType === "admin_request") {
        const story = await selectOne(connection,
          `select id, title, logline, public_synopsis, genre, genres_json, tags_json,
                  content_rating, content_origin, author_user_id
             from storyheaven_stories where id = :story_id for update`,
          { story_id: storyId });
        const planningRun = await queueStoryContinuationBootstrap(connection, story, requestedBy, targetEpisodeNo, batchEndEpisodeNo);
        const requestId = randomId();
        await connection.execute(
          `insert into storyheaven_serial_continuations (
            id, story_id, source_episode_id, source_episode_no, target_episode_no,
            trigger_type, requested_by, recommendation_count, request_status, run_id
          ) values (
            :id, :story_id, :source_episode_id, :source_episode_no, :target_episode_no,
            'admin_request', :requested_by, :recommendation_count, 'queued', :run_id
          )`,
          {
            id: requestId,
            story_id: storyId,
            source_episode_id: source.EPISODE_ID,
            source_episode_no: sourceEpisodeNo,
            target_episode_no: targetEpisodeNo,
            requested_by: requestedBy,
            recommendation_count: recommendationCount,
            run_id: planningRun.id
          }
        );
        const created = await selectOne(connection,
          `select * from storyheaven_serial_continuations where id = :id`, { id: requestId });
        return mapContinuation(created);
      }
      if (!sourceRun) throw failure("serial_continuation_unavailable", 409);
      const schedule = await selectOne(connection,
        `select cadence_days, cadence_minutes, created_by, publication_mode
           from storyheaven_serial_schedules
          where id = :id
            and (schedule_status = 'active' or :trigger_type = 'admin_request')
          for update`,
        { id: sourceRun.SCHEDULE_ID, trigger_type: triggerType });
      if (!schedule) throw failure("serial_schedule_paused", 409);

      const existingEpisode = await selectOne(connection,
        `select id, episode_status from storyheaven_episodes
          where story_id = :story_id and episode_no = :episode_no`,
        { story_id: storyId, episode_no: targetEpisodeNo });
      const existingRun = await selectOne(connection,
        `select * from (
           select id, run_status from storyheaven_serial_runs
            where story_id = :story_id and episode_no = :episode_no and run_type = 'episode'
            order by created_at desc
         ) where rownum = 1`,
        { story_id: storyId, episode_no: targetEpisodeNo });
      const reusableRun = existingRun && !new Set(["blocked", "error"]).has(existingRun.RUN_STATUS)
        ? existingRun
        : null;
      const requestId = randomId();
      const currentStatus = existingEpisode?.EPISODE_STATUS === "published" ? "fulfilled" : "requesting";
      try {
        await connection.execute(
          `insert into storyheaven_serial_continuations (
            id, story_id, source_episode_id, source_episode_no, target_episode_no,
            trigger_type, requested_by, recommendation_count, request_status, run_id
          ) values (
            :id, :story_id, :source_episode_id, :source_episode_no, :target_episode_no,
            :trigger_type, :requested_by, :recommendation_count, :request_status, :run_id
          )`,
          {
            id: requestId,
            story_id: storyId,
            source_episode_id: source.EPISODE_ID,
            source_episode_no: sourceEpisodeNo,
            target_episode_no: targetEpisodeNo,
            trigger_type: triggerType,
            requested_by: requestedBy || null,
            recommendation_count: recommendationCount,
            request_status: reusableRun ? "queued" : currentStatus,
            run_id: reusableRun?.ID || null
          }
        );
      } catch (error) {
        if (Number(error?.errorNum) !== 1) throw error;
        const concurrent = await selectOne(connection,
          `select * from storyheaven_serial_continuations
            where story_id = :story_id and target_episode_no = :target_episode_no`,
          { story_id: storyId, target_episode_no: targetEpisodeNo });
        if (concurrent) return mapContinuation(concurrent);
        throw error;
      }

      if (!reusableRun && currentStatus !== "fulfilled") {
        const queuedRun = await queueNextEpisode(connection, sourceRun, schedule, { batchEndEpisodeNo, notes: checked.request.notes });
        await connection.execute(
          `update storyheaven_serial_continuations
              set request_status = 'queued', run_id = :run_id, updated_at = systimestamp
            where id = :id`,
          { id: requestId, run_id: queuedRun?.id || null }
        );
      }
      const created = await selectOne(connection,
        `select * from storyheaven_serial_continuations where id = :id`, { id: requestId });
      return mapContinuation(created);
    });
  }

  async function getStoryState(storyIdValue) {
    const storyId = requireId(storyIdValue, "story_id");
    return withConnection(async (connection) => {
      const story = await selectOne(connection,
        `select id, title, logline, story_status, published_at, updated_at
           from storyheaven_stories where id = :story_id`, { story_id: storyId });
      if (!story) throw failure("story_not_found", 404);
      const [bible, arcs, canon, reveals, runs, publications, continuations] = await Promise.all([
        connection.execute(`select * from storyheaven_serial_bibles where story_id = :story_id`, { story_id: storyId }),
        connection.execute(`select id, arc_no, arc_version, arc_status, arc_title, central_question, created_at from storyheaven_serial_arcs where story_id = :story_id order by arc_no desc, arc_version desc`, { story_id: storyId }),
        connection.execute(`select fact_key, fact_version, fact_category, fact_value, source_episode_no from storyheaven_canon_facts where story_id = :story_id and fact_status = 'active' order by fact_key`, { story_id: storyId }),
        connection.execute(`select reveal_key, secret_text, introduce_episode_no, payoff_episode_no, reveal_status from storyheaven_reveal_ledger where story_id = :story_id order by introduce_episode_no`, { story_id: storyId }),
        connection.execute(`select id, queue_group_id, run_type, run_status, current_stage, episode_no,
                                   rewrite_count, release_at, failure_code, started_at, completed_at,
                                   queue_canceled_at, created_at, updated_at
                              from storyheaven_serial_runs
                             where story_id = :story_id
                             order by created_at desc fetch first 30 rows only`, { story_id: storyId }),
        connection.execute(`select id, run_id, episode_no, queue_status, release_at, published_episode_id, failure_code from storyheaven_publication_queue where story_id = :story_id order by episode_no desc`, { story_id: storyId }),
        connection.execute(`select * from storyheaven_serial_continuations where story_id = :story_id order by target_episode_no desc`, { story_id: storyId })
      ]);
      return {
        story: { id: story.ID, title: story.TITLE, logline: story.LOGLINE, status: story.STORY_STATUS, publishedAt: isoTime(story.PUBLISHED_AT), updatedAt: isoTime(story.UPDATED_AT) },
        bible: bible.rows[0] ? mapBible(bible.rows[0]) : null,
        arcs: arcs.rows.map((row) => ({ id: row.ID, arcNo: Number(row.ARC_NO), version: Number(row.ARC_VERSION), status: row.ARC_STATUS, title: row.ARC_TITLE, centralQuestion: row.CENTRAL_QUESTION, createdAt: isoTime(row.CREATED_AT) })),
        canon: canon.rows.map((row) => ({ key: row.FACT_KEY, version: Number(row.FACT_VERSION), category: row.FACT_CATEGORY, value: row.FACT_VALUE, sourceEpisodeNo: row.SOURCE_EPISODE_NO === null ? null : Number(row.SOURCE_EPISODE_NO) })),
        reveals: reveals.rows.map(mapReveal),
        runs: runs.rows.map(mapRun),
        publications: publications.rows.map(mapPublication),
        continuations: continuations.rows.map(mapContinuation)
      };
    });
  }

  async function getRun(runIdValue) {
    const runId = requireId(runIdValue, "run_id");
    return withConnection(async (connection) => {
      const run = await selectOne(connection, `select * from storyheaven_serial_runs where id = :run_id`, { run_id: runId });
      if (!run) throw failure("serial_run_not_found", 404);
      const [jobs, drafts, reviews, metrics] = await Promise.all([
        connection.execute(`select id, job_type, job_status, attempt_count, max_attempts, worker_id, error_code, started_at, completed_at, created_at from storyheaven_serial_jobs where run_id = :run_id order by created_at`, { run_id: runId }),
        connection.execute(`select id, version_no, draft_kind, title, public_summary, body_text, scene_ranges_json, deterministic_json, content_hash, created_at from storyheaven_serial_drafts where run_id = :run_id order by version_no`, { run_id: runId }),
        connection.execute(`select id, draft_id, review_version, decision, scores_json, safety_passed, summary_text, issues_json, rewrite_scenes_json, score_evidence_json, audience_lenses_json, created_at from storyheaven_editorial_reviews where run_id = :run_id order by review_version`, { run_id: runId }),
        connection.execute(`select draft_id, metric_name, metric_score, threshold_score, passed, evidence_json from storyheaven_quality_metrics where run_id = :run_id order by created_at`, { run_id: runId })
      ]);
      return {
        run: mapRun(run),
        jobs: jobs.rows.map((row) => ({
          id: row.ID,
          type: row.JOB_TYPE,
          status: row.JOB_STATUS,
          attemptCount: Number(row.ATTEMPT_COUNT),
          maxAttempts: Number(row.MAX_ATTEMPTS),
          workerId: row.WORKER_ID,
          errorCode: row.ERROR_CODE,
          startedAt: isoTime(row.STARTED_AT),
          completedAt: isoTime(row.COMPLETED_AT),
          durationSeconds: elapsedSeconds(timeValue(row.STARTED_AT), timeValue(row.COMPLETED_AT)),
          createdAt: isoTime(row.CREATED_AT)
        })),
        drafts: drafts.rows.map((row) => ({ id: row.ID, version: Number(row.VERSION_NO), kind: row.DRAFT_KIND, title: row.TITLE, summary: row.PUBLIC_SUMMARY, body: row.BODY_TEXT, sceneRanges: parseJson(row.SCENE_RANGES_JSON, []), qa: parseJson(row.DETERMINISTIC_JSON, {}), contentHash: row.CONTENT_HASH, createdAt: isoTime(row.CREATED_AT) })),
        reviews: reviews.rows.map((row) => ({ id: row.ID, draftId: row.DRAFT_ID, version: Number(row.REVIEW_VERSION), decision: row.DECISION, scores: parseJson(row.SCORES_JSON, {}), scoreEvidence: parseJson(row.SCORE_EVIDENCE_JSON, {}), audienceLenses: parseJson(row.AUDIENCE_LENSES_JSON, []), safetyPassed: row.SAFETY_PASSED === "Y", summary: row.SUMMARY_TEXT, issues: parseJson(row.ISSUES_JSON, []), rewriteScenes: parseJson(row.REWRITE_SCENES_JSON, []), createdAt: isoTime(row.CREATED_AT) })),
        metrics: metrics.rows.map((row) => ({ draftId: row.DRAFT_ID, name: row.METRIC_NAME, score: Number(row.METRIC_SCORE), threshold: Number(row.THRESHOLD_SCORE), passed: row.PASSED === "Y", evidence: parseJson(row.EVIDENCE_JSON, []) }))
      };
    });
  }

  async function resolveQualityHold(runIdValue, userId, input = {}) {
    const runId = requireId(runIdValue, "run_id");
    const action = String(input.action || "").trim();
    if (!new Set(["rewrite", "approve"]).has(action)) {
      throw failure("serial_quality_hold_action_invalid", 400);
    }
    return withTransaction(async (connection) => {
      const run = await selectOne(connection,
        `select * from storyheaven_serial_runs where id = :run_id for update`,
        { run_id: runId });
      if (!run) throw failure("serial_run_not_found", 404);
      if (run.RUN_STATUS !== "blocked" || run.CURRENT_STAGE !== "editorial_blocked" || run.QUEUE_CANCELED_AT) {
        throw failure("serial_quality_hold_not_active", 409);
      }
      const active = await selectOne(connection,
        `select count(*) as active_count
           from storyheaven_serial_jobs
          where run_id = :run_id
            and job_status in ('queued', 'running', 'retry_wait')`,
        { run_id: runId });
      if (Number(active?.ACTIVE_COUNT || 0) > 0) throw failure("serial_quality_hold_work_active", 409);

      const draft = await selectOne(connection,
        `select * from storyheaven_serial_drafts
          where run_id = :run_id
          order by version_no desc fetch first 1 row only`,
        { run_id: runId });
      const review = await selectOne(connection,
        `select * from storyheaven_editorial_reviews
          where run_id = :run_id
          order by review_version desc fetch first 1 row only`,
        { run_id: runId });
      if (!draft || !review) throw failure("serial_quality_hold_evidence_missing", 409);

      const quality = parseJson(run.QUALITY_JSON, {});
      const operatorResolution = {
        action,
        userId,
        requestedAt: new Date().toISOString(),
        previousDecision: review.DECISION,
        previousRewriteCount: Number(run.REWRITE_COUNT || 0)
      };
      await connection.execute(
        `update storyheaven_serial_runs
            set quality_json = :quality_json,
                updated_at = systimestamp
          where id = :run_id`,
        {
          run_id: runId,
          quality_json: clobJson({ ...quality, operatorResolution })
        }
      );

      if (action === "approve") {
        if (review.SAFETY_PASSED !== "Y") throw failure("serial_quality_hold_safety_failed", 409);
        await approveDraft(connection, run, draft);
      } else {
        const editor = {
          scores: parseJson(review.SCORES_JSON, {}),
          safetyPassed: review.SAFETY_PASSED === "Y",
          summary: review.SUMMARY_TEXT,
          issues: parseJson(review.ISSUES_JSON, []),
          rewriteScenes: parseJson(review.REWRITE_SCENES_JSON, []),
          scoreEvidence: parseJson(review.SCORE_EVIDENCE_JSON, {}),
          audienceLenses: parseJson(review.AUDIENCE_LENSES_JSON, [])
        };
        const qa = parseJson(draft.DETERMINISTIC_JSON, {});
        const rewriteNumber = Number(run.REWRITE_COUNT || 0) + 1;
        await connection.execute(
          `update storyheaven_serial_runs
              set run_status = 'rewrite', current_stage = 'rewrite_draft',
                  rewrite_count = :rewrite_count, failure_code = null,
                  completed_at = null, updated_at = systimestamp
            where id = :run_id`,
          { run_id: runId, rewrite_count: rewriteNumber }
        );
        const context = await loadSerialContext(connection, run.STORY_ID);
        await queueJob(connection, {
          runId,
          storyId: run.STORY_ID,
          type: "rewrite_draft",
          priority: 75,
          input: {
            story: context.story,
            bible: context.bible,
            arc: context.arc,
            canon: context.canon,
            reveals: context.reveals,
            episodeCard: context.cards.find((item) => Number(item.episodeNo) === Number(run.EPISODE_NO)),
            draft: {
              id: draft.ID,
              title: draft.TITLE,
              summary: draft.PUBLIC_SUMMARY,
              body: draft.BODY_TEXT,
              sceneRanges: parseJson(draft.SCENE_RANGES_JSON, [])
            },
            deterministicQa: qa,
            editor,
            rewriteNumber,
            instruction: "운영자가 검수 보류 사유를 확인하고 추가 보완을 요청했다. 지적된 장면과 문장만 우선 고치고, 이미 잘 작동하는 사건 구조와 문체는 유지한다."
          }
        });
      }
      const updated = await selectOne(connection,
        `select * from storyheaven_serial_runs where id = :run_id`,
        { run_id: runId });
      return { action, run: mapRun(updated) };
    });
  }

  async function claimJob({ workerId }) {
    await withTransaction((connection) => connection.execute(
      `update storyheaven_serial_jobs
          set job_status = case when attempt_count < max_attempts then 'retry_wait' else 'error' end,
              next_attempt_at = systimestamp, lease_id = null, lease_expires_at = null,
              worker_id = null, error_code = 'lease_expired', updated_at = systimestamp
        where job_status = 'running' and lease_expires_at < systimestamp`
    ));
    return withTransaction(async (connection) => {
      const result = await connection.execute(
        `select * from (
           select job.id, job.run_id, job.story_id, job.job_type,
                  job.input_hash, job.input_json, job.attempt_count
             from storyheaven_serial_jobs job
             join storyheaven_serial_runs serial_run on serial_run.id = job.run_id
            where job.job_status in ('queued', 'retry_wait')
              and job.next_attempt_at <= systimestamp
              and serial_run.queue_canceled_at is null
              and (
                serial_run.schedule_id is null
                or exists (
                  select 1
                    from storyheaven_serial_schedules schedule_gate
                   where schedule_gate.id = serial_run.schedule_id
                     and schedule_gate.schedule_status = 'active'
                )
              )
              and not exists (
                select 1 from storyheaven_serial_jobs running_job
                  join storyheaven_serial_runs running_run on running_run.id = running_job.run_id
                 where running_job.job_status = 'running'
                   and running_run.queue_canceled_at is null
              )
              and serial_run.queue_group_id = (
                select queue_group_id from (
                  select candidate_run.queue_group_id,
                         min(queue_origin.created_at) as queued_at
                   from storyheaven_serial_jobs candidate_job
                    join storyheaven_serial_runs candidate_run on candidate_run.id = candidate_job.run_id
                    join storyheaven_serial_runs queue_origin on queue_origin.queue_group_id = candidate_run.queue_group_id
                   where candidate_job.job_status in ('queued', 'running', 'retry_wait')
                     and candidate_run.queue_canceled_at is null
                     and (
                       candidate_run.schedule_id is null
                       or exists (
                         select 1
                           from storyheaven_serial_schedules candidate_schedule
                          where candidate_schedule.id = candidate_run.schedule_id
                            and candidate_schedule.schedule_status = 'active'
                       )
                   )
                   group by candidate_run.queue_group_id
                   order by min(queue_origin.created_at), candidate_run.queue_group_id
                ) where rownum = 1
              )
            order by job.priority asc, job.created_at asc
         ) where rownum = 1`
      );
      if (!result.rows.length) return { leaseId: null, job: null };
      const row = result.rows[0];
      const leaseId = randomId();
      const updated = await connection.execute(
        `update storyheaven_serial_jobs
            set job_status = 'running', attempt_count = attempt_count + 1,
                worker_id = :worker_id, lease_id = :lease_id,
                lease_expires_at = systimestamp + numtodsinterval(:lease_seconds, 'SECOND'),
                started_at = coalesce(started_at, systimestamp), error_code = null,
                updated_at = systimestamp
          where id = :id and job_status in ('queued', 'retry_wait')`,
        { id: row.ID, worker_id: workerId, lease_id: leaseId, lease_seconds: leaseSeconds }
      );
      if (Number(updated.rowsAffected || 0) !== 1) return { leaseId: null, job: null };
      await connection.execute(
        `update storyheaven_serial_runs set run_status = 'running', current_stage = :stage,
                started_at = coalesce(started_at, systimestamp), updated_at = systimestamp
          where id = :run_id and run_status not in ('blocked', 'published', 'error')`,
        { run_id: row.RUN_ID, stage: row.JOB_TYPE }
      );
      return {
        leaseId,
        leaseSeconds,
        job: {
          id: row.ID,
          runId: row.RUN_ID,
          storyId: row.STORY_ID,
          type: row.JOB_TYPE,
          inputHash: row.INPUT_HASH,
          attemptCount: Number(row.ATTEMPT_COUNT || 0) + 1,
          payload: parseJson(row.INPUT_JSON, {})
        }
      };
    });
  }

  async function completeJob({ workerId, leaseId, jobId, inputHash, result, model }) {
    return withTransaction(async (connection) => {
      const job = await selectOne(connection,
        `select id, run_id, story_id, job_type, input_hash, input_json
           from storyheaven_serial_jobs
          where id = :id and lease_id = :lease_id and worker_id = :worker_id
            and job_status = 'running' for update`,
        { id: jobId, lease_id: leaseId, worker_id: workerId });
      if (!job) throw failure("serial_job_lease_mismatch", 409);
      if (job.INPUT_HASH !== inputHash) throw failure("serial_job_revision_mismatch", 409);
      const type = job.JOB_TYPE;
      const payload = parseJson(job.INPUT_JSON, {});
      let safeResult;
      try {
        safeResult = normalizeStoryHeavenSerialWorkerResult(type, result?.result ?? result, { payload });
      } catch (error) {
        const validationCode = cleanCode(error?.message || "serial_worker_result_invalid");
        if (validationCode.startsWith("serial_")) throw failure(validationCode, 422);
        throw error;
      }
      await connection.execute(
        `update storyheaven_serial_jobs
            set job_status = 'complete', output_json = :output_json, completed_at = systimestamp,
                lease_id = null, lease_expires_at = null, worker_id = null, updated_at = systimestamp
          where id = :id`,
        { id: job.ID, output_json: clobJson({ model: cleanText(model, 160), result: safeResult }) }
      );
      await advanceJob(connection, { job, payload, result: safeResult });
      return { accepted: true, jobId: job.ID, runId: job.RUN_ID };
    });
  }

  async function failJob({ workerId, leaseId, jobId, errorCode }) {
    return withTransaction(async (connection) => {
      const row = await selectOne(connection,
        `select id, run_id, attempt_count, max_attempts from storyheaven_serial_jobs
          where id = :id and lease_id = :lease_id and worker_id = :worker_id
            and job_status = 'running' for update`,
        { id: jobId, lease_id: leaseId, worker_id: workerId });
      if (!row) throw failure("serial_job_lease_mismatch", 409);
      const retry = Number(row.ATTEMPT_COUNT) < Number(row.MAX_ATTEMPTS);
      await connection.execute(
        `update storyheaven_serial_jobs
            set job_status = :job_status,
                next_attempt_at = case when :job_status = 'retry_wait'
                  then systimestamp + numtodsinterval(:retry_minutes, 'MINUTE') else next_attempt_at end,
                error_code = :error_code, lease_id = null, lease_expires_at = null,
                worker_id = null, completed_at = case when :job_status = 'error' then systimestamp else null end,
                updated_at = systimestamp
          where id = :id`,
        { id: row.ID, job_status: retry ? "retry_wait" : "error", retry_minutes: retryMinutes, error_code: cleanCode(errorCode) }
      );
      if (!retry) {
        await connection.execute(
          `update storyheaven_serial_runs set run_status = 'error', failure_code = :failure_code,
                  completed_at = systimestamp, updated_at = systimestamp where id = :run_id`,
          { run_id: row.RUN_ID, failure_code: cleanCode(errorCode) }
        );
      }
      return { retry, runId: row.RUN_ID };
    });
  }

  async function processDue() {
    const scheduled = await withTransaction(async (connection) => {
      const activeQueue = await selectOne(connection,
        `select count(*) as active_count
          from storyheaven_serial_jobs job
           join storyheaven_serial_runs serial_run on serial_run.id = job.run_id
          where job.job_status in ('queued', 'running', 'retry_wait')
            and serial_run.queue_canceled_at is null
            and exists (
              select 1
                from storyheaven_serial_schedules active_schedule
               where active_schedule.schedule_status = 'active'
            )
            and (
              serial_run.schedule_id is null
              or exists (
                select 1
                  from storyheaven_serial_schedules schedule_gate
                 where schedule_gate.id = serial_run.schedule_id
                   and schedule_gate.schedule_status = 'active'
              )
            )`);
      if (Number(activeQueue.ACTIVE_COUNT || 0) > 0) return [];
      const due = await connection.execute(
        `select * from (
           select id, created_by from storyheaven_serial_schedules
            where schedule_status = 'active' and next_run_at <= systimestamp
            order by next_run_at
         ) where rownum = 1`
      );
      const queued = [];
      for (const row of due.rows) {
        queued.push(await queueConceptRun(connection, row.ID, row.CREATED_BY, { automatic: true }));
      }
      return queued;
    });
    const published = [];
    for (let index = 0; index < 3; index += 1) {
      const item = await publishNextDue();
      if (!item) break;
      published.push(item);
    }
    const continuations = await queueDueContinuations();
    return { scheduled, published, continuations };
  }

  async function queueDueContinuations() {
    const candidates = await withConnection(async (connection) => {
      const result = await connection.execute(
        `select * from (
           select episode.story_id, episode.episode_no
             from storyheaven_episodes episode
             join storyheaven_stories story on story.id = episode.story_id
             left join storyheaven_serial_story_controls control on control.story_id = story.id
            where story.content_origin = 'admin_seed'
              and story.story_status = 'published'
              and nvl(control.visibility, 'public') = 'public'
              and nvl(control.continuation_mode, 'auto') = 'auto'
              and episode.episode_status = 'published'
              and episode.episode_no >= nvl((
                select max(schedule.target_episode_count) keep (dense_rank last order by serial_run.created_at)
                  from storyheaven_serial_runs serial_run
                  join storyheaven_serial_schedules schedule on schedule.id = serial_run.schedule_id
                 where serial_run.story_id = episode.story_id
              ), :initial_episode_count)
              and episode.episode_no = (
                select max(latest.episode_no) from storyheaven_episodes latest
                 where latest.story_id = episode.story_id
                   and latest.episode_status = 'published'
              )
              and (select count(*) from storyheaven_episode_votes vote
                    where vote.episode_id = episode.id and vote.vote_type = 'recommend') >= :threshold
              and not exists (
                select 1 from storyheaven_serial_continuations continuation
                 where continuation.story_id = episode.story_id
                   and continuation.target_episode_no = episode.episode_no + 1
              )
              and exists (
                select 1 from storyheaven_serial_runs serial_run
                  join storyheaven_serial_schedules schedule on schedule.id = serial_run.schedule_id
                 where serial_run.story_id = episode.story_id
                   and serial_run.episode_no = episode.episode_no
                   and serial_run.run_status = 'published'
                   and schedule.schedule_status = 'active'
              )
            order by episode.published_at
         ) where rownum <= 3`,
        {
          initial_episode_count: STORYHEAVEN_CONTINUATION_POLICY.initialEpisodeCount,
          threshold: STORYHEAVEN_CONTINUATION_POLICY.recommendationThreshold
        }
      );
      return result.rows.map((row) => ({ storyId: row.STORY_ID, episodeNo: Number(row.EPISODE_NO) }));
    });
    const queued = [];
    for (const candidate of candidates) {
      try {
        queued.push(await requestContinuation(candidate.storyId, candidate.episodeNo, {
          triggerType: "reader_threshold"
        }));
      } catch (error) {
        console.error("[storyheaven] due continuation failed", candidate.storyId, candidate.episodeNo, error?.message || error);
      }
    }
    return queued;
  }

  async function queueConceptRun(connection, scheduleId, userId, source) {
    const schedule = await selectOne(connection,
      `select * from storyheaven_serial_schedules where id = :id for update`, { id: scheduleId });
    if (!schedule) throw failure("serial_schedule_not_found", 404);
    const inFlight = await selectOne(connection,
      `select * from (
         select concept_run.*
           from storyheaven_serial_runs concept_run
          where concept_run.schedule_id = :schedule_id
            and concept_run.run_type = 'concept'
            and concept_run.queue_canceled_at is null
            and exists (
              select 1
                from storyheaven_serial_runs grouped_run
                join storyheaven_serial_jobs grouped_job on grouped_job.run_id = grouped_run.id
               where grouped_run.queue_group_id = concept_run.queue_group_id
                 and grouped_run.queue_canceled_at is null
                 and grouped_job.job_status in ('queued', 'running', 'retry_wait')
            )
          order by concept_run.created_at desc
       ) where rownum = 1`,
      { schedule_id: scheduleId });
    if (inFlight) return { ...mapRun(inFlight), reused: true };
    const cadenceMinutes = Number(schedule.CADENCE_MINUTES || Number(schedule.CADENCE_DAYS || 1) * 1_440);
    const nextRunAt = new Date(Date.now() + cadenceMinutes * 60_000);
    await connection.execute(
      `update storyheaven_serial_schedules set last_run_at = systimestamp,
              next_run_at = :next_run_at, updated_at = systimestamp where id = :id`,
      { id: scheduleId, next_run_at: nextRunAt }
    );
    const run = await createRun(connection, {
      scheduleId,
      runType: "concept",
      stage: "concept_gate",
      userId,
      input: {
        autoEpisode: true,
        targetEpisodeCount: Number(schedule.TARGET_EPISODE_COUNT || STORYHEAVEN_CONTINUATION_POLICY.initialEpisodeCount),
        source
      }
    });
    await queueJob(connection, {
      runId: run.id,
      type: "concept_gate",
      input: {
        schedule: {
          name: schedule.SCHEDULE_NAME,
          genres: parseJson(schedule.GENRE_POOL_JSON, []),
          primaryGenre: schedule.PRIMARY_GENRE,
          primaryGenres: parseJson(schedule.PRIMARY_GENRES_JSON, [schedule.PRIMARY_GENRE]),
          subgenres: parseJson(schedule.SUBGENRES_JSON, []),
          subgenresByGenre: parseJson(schedule.SUBGENRES_BY_GENRE_JSON, {
            [schedule.PRIMARY_GENRE]: parseJson(schedule.SUBGENRES_JSON, [])
          }),
          publicationMode: schedule.PUBLICATION_MODE,
          targetEpisodeCount: Number(schedule.TARGET_EPISODE_COUNT || STORYHEAVEN_CONTINUATION_POLICY.initialEpisodeCount),
          targetAge: schedule.TARGET_AGE,
          policy: normalizeStoredConceptPolicy(parseJson(schedule.CONCEPT_POLICY_JSON, {}))
        },
        existingTitles: await existingSystemTitles(connection)
      }
    });
    return run;
  }

  async function createEpisodeRun(connection, { storyId, userId, episodeNo, releaseAt, notes, scheduleId, queueGroupId = null, batchEndEpisodeNo = null }) {
    const context = await loadSerialContext(connection, storyId);
    if (!context.bible || !context.arc) throw failure("serial_plan_required", 409);
    const seriesPlan = context.bible.narrativeBlueprint?.seriesPlan || context.bible.concept?.seriesPlan || normalizeSeriesPlan();
    const seriesArchitecture = context.bible.narrativeBlueprint?.seriesArchitecture;
    if (!isCompleteSeriesArchitecture(seriesArchitecture, seriesPlan)) {
      throw failure("serial_architecture_required", 409);
    }
    const sequence = await selectOne(connection,
      `select greatest(
         nvl((
           select max(episode_no) from storyheaven_episodes
            where story_id = :story_id and episode_status = 'published'
         ), 0),
         nvl((
           select max(episode_no) from storyheaven_serial_runs
            where story_id = :story_id and run_type = 'episode'
              and run_status in ('ready', 'published')
         ), 0)
       ) + 1 as next_episode_no from dual`, { story_id: storyId });
    const nextEpisodeNo = Number(sequence.NEXT_EPISODE_NO || 1);
    const targetEpisodeNo = episodeNo || nextEpisodeNo;
    try {
      storyHeavenSeriesPosition(targetEpisodeNo, seriesPlan);
    } catch (error) {
      if (error?.message === "serial_series_episode_out_of_range") throw failure("serial_series_complete", 409);
      throw error;
    }
    if (targetEpisodeNo !== nextEpisodeNo) {
      throw failure("serial_episode_sequence_required", 409, [{ nextEpisodeNo }]);
    }
    const planItem = context.arc.episodePlan.find((item) => Number(item.episodeNo) === targetEpisodeNo);
    if (!planItem) throw failure("serial_arc_episode_not_planned", 409);
    const active = await selectOne(connection,
      `select count(*) as run_count from storyheaven_serial_runs
        where story_id = :story_id and episode_no = :episode_no
          and run_status in ('queued', 'running', 'rewrite', 'ready')`,
      { story_id: storyId, episode_no: targetEpisodeNo });
    if (Number(active.RUN_COUNT || 0) > 0) throw failure("serial_episode_already_queued", 409);
    const run = await createRun(connection, {
      scheduleId,
      storyId,
      arcId: context.arc.id,
      episodeNo: targetEpisodeNo,
      runType: "episode",
      stage: "build_episode_card",
      userId,
      queueGroupId,
      releaseAt: dateOrNull(releaseAt),
      input: {
        notes: cleanText(notes, 1000),
        batchEndEpisodeNo: positiveInteger(batchEndEpisodeNo)
      }
    });
    await queueJob(connection, {
      runId: run.id,
      storyId,
      type: "build_episode_card",
      input: episodePlanningPayload(context, targetEpisodeNo, planItem, notes)
    });
    return run;
  }

  async function advanceJob(connection, { job, payload, result }) {
    if (job.JOB_TYPE === "concept_gate") return acceptConcept(connection, job, payload, result);
    if (job.JOB_TYPE === "build_bible") return acceptBible(connection, job, payload, result);
    if (job.JOB_TYPE === "build_arc") return acceptArc(connection, job, payload, result);
    if (job.JOB_TYPE === "build_episode_card") return acceptEpisodeCard(connection, job, result);
    if (job.JOB_TYPE === "write_draft" || job.JOB_TYPE === "rewrite_draft") {
      return acceptDraft(connection, job, result, job.JOB_TYPE === "rewrite_draft");
    }
    return acceptEditorialReview(connection, job, result);
  }

  async function acceptConcept(connection, job, payload, concept) {
    const storyId = randomId();
    const slug = makeSlug(concept.title);
    const packet = {
      title: concept.title,
      logline: concept.logline,
      synopsis: concept.synopsis,
      genres: concept.genres,
      tags: concept.tags,
      rating: concept.rating,
      contentOrigin: "admin_seed"
    };
    const packetHash = sha256(packet);
    await connection.execute(
      `insert into storyheaven_stories (
        id, slug, author_user_id, title, logline, public_synopsis,
        genre, secondary_genre, genres_json, tags_json,
        content_rating, rating_detail, content_origin, competition_eligible,
        story_status, current_revision_no, review_decision
      ) values (
        :id, :slug, :author_user_id, :title, :logline, :public_synopsis,
        :genre, :secondary_genre, :genres_json, :tags_json,
        :content_rating, :rating_detail, 'admin_seed', 'N',
        'draft', 1, 'approved'
      )`,
      {
        id: storyId, slug, author_user_id: SYSTEM_AUTHOR_ID,
        title: concept.title, logline: concept.logline, public_synopsis: clob(concept.synopsis),
        genre: concept.genres[0], secondary_genre: concept.genres[1] || null,
        genres_json: clobJson(concept.genres), tags_json: clobJson(concept.tags),
        content_rating: concept.rating, rating_detail: concept.rating === "all" ? "all" : "15"
      }
    );
    await connection.execute(
      `insert into storyheaven_revisions (
        id, story_id, revision_no, actor_user_id, revision_kind, packet_json, content_hash
      ) values (:id, :story_id, 1, :actor_user_id, 'draft', :packet_json, :content_hash)`,
      { id: randomId(), story_id: storyId, actor_user_id: SYSTEM_AUTHOR_ID, packet_json: clobJson(packet), content_hash: packetHash }
    );
    await connection.execute(
      `insert into storyheaven_provenance (
        id, story_id, producer_type, generator_name, disclosure_text, metadata_json
      ) values (
        :id, :story_id, 'system_ai', 'storyheaven-serial-engine',
        :disclosure_text, :metadata_json
      )`,
      {
        id: randomId(), story_id: storyId,
        disclosure_text: "StoryHeaven 내부 연재 제작 엔진에서 생성하고 자동 편집 검수를 거친 운영 원고입니다.",
        metadata_json: clobJson({ runId: job.RUN_ID, conceptJobId: job.ID })
      }
    );
    const seriesPlan = normalizeSeriesPlan(payload?.schedule?.policy?.seriesPlan);
    const conceptWithPlan = { ...concept, seriesPlan };
    await upsertBibleConcept(connection, storyId, conceptWithPlan);
    await connection.execute(
      `update storyheaven_serial_runs set story_id = :story_id, run_type = 'planning',
              current_stage = 'build_bible', updated_at = systimestamp where id = :run_id`,
      { story_id: storyId, run_id: job.RUN_ID }
    );
    const story = { ID: storyId, TITLE: concept.title, LOGLINE: concept.logline, PUBLIC_SYNOPSIS: concept.synopsis, GENRE: concept.genres[0], GENRES_JSON: JSON.stringify(concept.genres), TAGS_JSON: JSON.stringify(concept.tags), CONTENT_RATING: concept.rating };
    await queueJob(connection, {
      runId: job.RUN_ID,
      storyId,
      type: "build_bible",
      input: {
        story: publicStory(story),
        concept: conceptWithPlan,
        creativeControls: payload?.schedule?.policy?.creativeControls || null,
        seriesPlan
      }
    });
  }

  async function acceptBible(connection, job, payload, bible) {
    const storyId = job.STORY_ID;
    if (!storyId) throw failure("serial_story_missing", 409);
    const previousBible = await selectOne(connection,
      `select * from storyheaven_serial_bibles where story_id = :story_id for update`,
      { story_id: storyId });
    const previousNarrativeBlueprint = parseJson(previousBible?.NARRATIVE_BLUEPRINT_JSON, {});
    const previousArchitecture = previousNarrativeBlueprint.seriesArchitecture || null;
    const seriesPlan = normalizeSeriesPlan(payload.seriesPlan || payload.concept?.seriesPlan);
    const preserveExistingBible = payload.architectureOnly === true
      && parseJson(previousBible?.WORLD_RULES_JSON, []).length >= 5
      && parseJson(previousBible?.CHARACTERS_JSON, []).length >= 2;
    const narrativeBlueprint = preserveExistingBible
      ? {
          ...previousNarrativeBlueprint,
          seriesArchitecture: bible.narrativeBlueprint.seriesArchitecture,
          seriesPlan
        }
      : { ...bible.narrativeBlueprint, seriesPlan };
    if (preserveExistingBible) {
      await connection.execute(
        `update storyheaven_serial_bibles set
            bible_status = 'active', narrative_blueprint_json = :narrative_blueprint_json,
            source_job_id = :source_job_id, updated_at = systimestamp
          where story_id = :story_id`,
        {
          story_id: storyId,
          narrative_blueprint_json: clobJson(narrativeBlueprint),
          source_job_id: job.ID
        }
      );
    } else {
      await connection.execute(
        `update storyheaven_serial_bibles set
            bible_status = 'active', world_rules_json = :world_rules_json,
            characters_json = :characters_json, timeline_json = :timeline_json,
            glossary_json = :glossary_json, forbidden_json = :forbidden_json,
            voice_profile_json = :voice_profile_json,
            narrative_blueprint_json = :narrative_blueprint_json,
            source_job_id = :source_job_id,
            updated_at = systimestamp where story_id = :story_id`,
        {
          story_id: storyId, world_rules_json: clobJson(bible.worldRules),
          characters_json: clobJson(bible.characters), timeline_json: clobJson(bible.timeline),
          glossary_json: clobJson(bible.glossary), forbidden_json: clobJson(bible.forbiddenContradictions),
          voice_profile_json: clobJson(bible.voiceProfile),
          narrative_blueprint_json: clobJson(narrativeBlueprint), source_job_id: job.ID
        }
      );
    }
    await syncSeriesArchitectureReveals(
      connection,
      storyId,
      previousArchitecture,
      narrativeBlueprint.seriesArchitecture
    );
    if (payload.architectureOnly === true) {
      await connection.execute(
        `update storyheaven_serial_runs
            set run_status = 'approved', current_stage = 'architecture_complete',
                completed_at = systimestamp, updated_at = systimestamp
          where id = :run_id`,
        { run_id: job.RUN_ID }
      );
      return;
    }
    const arcNoRow = await selectOne(connection,
      `select nvl((
                select max(arc_no) from storyheaven_serial_arcs where story_id = :story_id
              ), 0) + 1 as next_arc_no,
              greatest(
                nvl((select max(episode_no) from storyheaven_episodes where story_id = :story_id), 0),
                nvl((select max(episode_no) from storyheaven_episode_cards where story_id = :story_id), 0)
              ) + 1 as first_episode_no
         from dual`, { story_id: storyId });
    const context = await loadSerialContext(connection, storyId, { requireArc: false });
    const firstEpisodeNo = Number(arcNoRow.FIRST_EPISODE_NO || 1);
    const arcScope = buildStoryHeavenArcScope(
      firstEpisodeNo,
      seriesPlan,
      narrativeBlueprint.seriesArchitecture
    );
    await connection.execute(
      `update storyheaven_serial_runs set current_stage = 'build_arc', updated_at = systimestamp where id = :run_id`,
      { run_id: job.RUN_ID }
    );
    await queueJob(connection, {
      runId: job.RUN_ID,
      storyId,
      type: "build_arc",
      input: {
        story: context.story,
        concept: payload.concept || context.bible.concept,
        bible: { ...bible, narrativeBlueprint },
        seriesPlan,
        arcNo: Number(arcNoRow.NEXT_ARC_NO || 1),
        firstEpisodeNo,
        arcScope,
        priorArcs: context.priorArcs,
        canon: context.canon,
        autoEpisode: payload.autoEpisode === true
      }
    });
  }

  async function syncSeriesArchitectureReveals(connection, storyId, previousArchitecture, nextArchitecture) {
    const previousKeys = new Set((previousArchitecture?.longReveals || []).map((item) => String(item?.key || "")).filter(Boolean));
    const nextReveals = Array.isArray(nextArchitecture?.longReveals) ? nextArchitecture.longReveals : [];
    const nextKeys = new Set(nextReveals.map((item) => String(item?.key || "")).filter(Boolean));
    for (const oldKey of previousKeys) {
      if (nextKeys.has(oldKey)) continue;
      await connection.execute(
        `update storyheaven_reveal_ledger
            set reveal_status = 'retired', updated_at = systimestamp
          where story_id = :story_id and reveal_key = :reveal_key
            and reveal_status in ('planned', 'seeded')`,
        { story_id: storyId, reveal_key: oldKey }
      );
    }
    for (const reveal of nextReveals) {
      await connection.execute(
        `merge into storyheaven_reveal_ledger target
         using (select :story_id story_id, :reveal_key reveal_key from dual) source
            on (target.story_id = source.story_id and target.reveal_key = source.reveal_key)
         when matched then update set
           target.secret_text = :secret_text,
           target.introduce_episode_no = :introduce_episode_no,
           target.payoff_episode_no = :payoff_episode_no,
           target.reveal_status = case
             when target.reveal_status in ('seeded', 'revealed') then target.reveal_status
             else 'planned'
           end,
           target.updated_at = systimestamp
         when not matched then insert (
           id, story_id, reveal_key, secret_text, introduce_episode_no,
           payoff_episode_no, reveal_status, source_arc_id
         ) values (
           :id, :story_id, :reveal_key, :secret_text, :introduce_episode_no,
           :payoff_episode_no, 'planned', null
         )`,
        {
          id: randomId(),
          story_id: storyId,
          reveal_key: reveal.key,
          secret_text: reveal.secret,
          introduce_episode_no: reveal.introduceEpisode,
          payoff_episode_no: reveal.payoffEpisode
        }
      );
    }
  }

  async function acceptArc(connection, job, payload, arc) {
    const storyId = job.STORY_ID;
    const arcNo = Number(payload.arcNo || 1);
    const expectedFirst = Number(payload.firstEpisodeNo || 1);
    const expectedLast = Number(payload.arcScope?.lastEpisodeNo || arc.episodePlan.at(-1)?.episodeNo);
    if (Number(arc.episodePlan[0]?.episodeNo) !== expectedFirst
      || Number(arc.episodePlan.at(-1)?.episodeNo) !== expectedLast) {
      throw failure("serial_arc_scope_mismatch", 409);
    }
    await connection.execute(
      `update storyheaven_serial_arcs set arc_status = 'complete', updated_at = systimestamp
        where story_id = :story_id and arc_status = 'active'`, { story_id: storyId });
    const arcId = randomId();
    await connection.execute(
      `insert into storyheaven_serial_arcs (
        id, story_id, arc_no, arc_version, arc_status, arc_title,
        central_question, midpoint_reversal, ending_truth,
        episode_plan_json, narrative_plan_json, source_job_id
      ) values (
        :id, :story_id, :arc_no, 1, 'active', :arc_title,
        :central_question, :midpoint_reversal, :ending_truth,
        :episode_plan_json, :narrative_plan_json, :source_job_id
      )`,
      {
        id: arcId, story_id: storyId, arc_no: arcNo, arc_title: arc.arcTitle,
        central_question: arc.centralQuestion, midpoint_reversal: arc.midpointReversal,
        ending_truth: arc.endingTruth, episode_plan_json: clobJson(arc.episodePlan),
        narrative_plan_json: clobJson({
          ...arc.narrativePlan,
          architectureReferences: arc.architectureReferences,
          arcScope: payload.arcScope || null
        }), source_job_id: job.ID
      }
    );
    for (const reveal of arc.reveals) {
      await connection.execute(
        `merge into storyheaven_reveal_ledger target
         using (select :story_id story_id, :reveal_key reveal_key from dual) source
            on (target.story_id = source.story_id and target.reveal_key = source.reveal_key)
         when matched then update set
           target.secret_text = :secret_text,
           target.introduce_episode_no = :introduce_episode_no,
           target.payoff_episode_no = :payoff_episode_no,
           target.reveal_status = 'planned', target.source_arc_id = :source_arc_id,
           target.updated_at = systimestamp
         when not matched then insert (
           id, story_id, reveal_key, secret_text, introduce_episode_no,
           payoff_episode_no, reveal_status, source_arc_id
         ) values (
           :id, :story_id, :reveal_key, :secret_text, :introduce_episode_no,
           :payoff_episode_no, 'planned', :source_arc_id
         )`,
        {
          id: randomId(), story_id: storyId, reveal_key: reveal.key,
          secret_text: reveal.secret, introduce_episode_no: reveal.introduceEpisode,
          payoff_episode_no: reveal.payoffEpisode, source_arc_id: arcId
        }
      );
    }
    const run = await selectOne(connection, `select * from storyheaven_serial_runs where id = :run_id for update`, { run_id: job.RUN_ID });
    await connection.execute(
      `update storyheaven_serial_runs set arc_id = :arc_id, run_status = 'approved',
              current_stage = 'plan_complete', completed_at = systimestamp, updated_at = systimestamp
        where id = :run_id`, { arc_id: arcId, run_id: job.RUN_ID });
    const runInput = parseJson(run.INPUT_JSON, {});
    if (runInput.autoEpisode === true || payload.autoEpisode === true) {
      await createEpisodeRun(connection, {
        storyId,
        userId: run.REQUESTED_BY,
        episodeNo: expectedFirst,
        releaseAt: runInput.releaseAt || null,
        notes: "",
        scheduleId: run.SCHEDULE_ID,
        queueGroupId: run.QUEUE_GROUP_ID,
        batchEndEpisodeNo: positiveInteger(runInput.batchEndEpisodeNo)
      });
    }
  }

  async function acceptEpisodeCard(connection, job, card) {
    const run = await selectOne(connection, `select * from storyheaven_serial_runs where id = :run_id for update`, { run_id: job.RUN_ID });
    if (Number(card.episodeNo) !== Number(run.EPISODE_NO)) throw failure("serial_episode_card_number_mismatch", 409);
    await connection.execute(
      `update storyheaven_episode_cards set card_status = 'superseded', updated_at = systimestamp
        where story_id = :story_id and episode_no = :episode_no and card_status = 'active'`,
      { story_id: job.STORY_ID, episode_no: run.EPISODE_NO }
    );
    const version = await selectOne(connection,
      `select nvl(max(card_version), 0) + 1 as next_version from storyheaven_episode_cards
        where story_id = :story_id and episode_no = :episode_no`,
      { story_id: job.STORY_ID, episode_no: run.EPISODE_NO });
    const cardId = randomId();
    await connection.execute(
      `insert into storyheaven_episode_cards (
        id, story_id, arc_id, episode_no, card_version, card_status,
        episode_promise, opening_disturbance, scenes_json, payoff, hook,
        knowledge_json, canon_refs_json, technique_plan_json, source_job_id
      ) values (
        :id, :story_id, :arc_id, :episode_no, :card_version, 'active',
        :episode_promise, :opening_disturbance, :scenes_json, :payoff, :hook,
        :knowledge_json, :canon_refs_json, :technique_plan_json, :source_job_id
      )`,
      {
        id: cardId, story_id: job.STORY_ID, arc_id: run.ARC_ID,
        episode_no: run.EPISODE_NO, card_version: Number(version.NEXT_VERSION || 1),
        episode_promise: card.promise, opening_disturbance: card.openingDisturbance,
        scenes_json: clobJson(card.scenes), payoff: card.payoff, hook: card.hook,
        knowledge_json: clobJson(card.knowledgeBefore), canon_refs_json: clobJson(card.canonReferences),
        technique_plan_json: clobJson({
          ...card.techniquePlan,
          prologueDisclosurePlan: card.prologueDisclosurePlan
        }),
        source_job_id: job.ID
      }
    );
    const context = await loadSerialContext(connection, job.STORY_ID);
    await connection.execute(
      `update storyheaven_serial_runs set current_stage = 'write_draft', updated_at = systimestamp where id = :run_id`,
      { run_id: job.RUN_ID }
    );
    await queueJob(connection, {
      runId: job.RUN_ID,
      storyId: job.STORY_ID,
      type: "write_draft",
      input: writingPayload(context, { ...card, id: cardId }, Number(run.EPISODE_NO))
    });
  }

  async function acceptDraft(connection, job, draft, rewritten) {
    const run = await selectOne(connection, `select * from storyheaven_serial_runs where id = :run_id for update`, { run_id: job.RUN_ID });
    const card = await selectOne(connection,
      `select id from storyheaven_episode_cards
        where story_id = :story_id and episode_no = :episode_no and card_status = 'active'`,
      { story_id: job.STORY_ID, episode_no: run.EPISODE_NO });
    if (!card) throw failure("serial_episode_card_missing", 409);
    const version = await selectOne(connection,
      `select nvl(max(version_no), 0) + 1 as next_version from storyheaven_serial_drafts where run_id = :run_id`,
      { run_id: job.RUN_ID });
    const qa = analyzeStoryHeavenSerialDraft(draft);
    const draftId = randomId();
    await connection.execute(
      `insert into storyheaven_serial_drafts (
        id, run_id, story_id, episode_card_id, episode_no, version_no,
        draft_kind, title, public_summary, body_text, scene_ranges_json,
        canon_candidates_json, reveal_updates_json, changes_json,
        deterministic_json, content_hash, source_job_id
      ) values (
        :id, :run_id, :story_id, :episode_card_id, :episode_no, :version_no,
        :draft_kind, :title, :public_summary, :body_text, :scene_ranges_json,
        :canon_candidates_json, :reveal_updates_json, :changes_json,
        :deterministic_json, :content_hash, :source_job_id
      )`,
      {
        id: draftId, run_id: job.RUN_ID, story_id: job.STORY_ID, episode_card_id: card.ID,
        episode_no: run.EPISODE_NO, version_no: Number(version.NEXT_VERSION || 1),
        draft_kind: rewritten ? "rewrite" : "initial", title: draft.title,
        public_summary: draft.summary, body_text: clob(draft.body), scene_ranges_json: clobJson(draft.sceneRanges),
        canon_candidates_json: clobJson(draft.newCanonFacts), reveal_updates_json: clobJson(draft.revealUpdates),
        changes_json: clobJson(draft.changes || []), deterministic_json: clobJson(qa),
        content_hash: sha256({ title: draft.title, summary: draft.summary, body: draft.body }), source_job_id: job.ID
      }
    );
    const context = await loadSerialContext(connection, job.STORY_ID);
    const reviewThresholds = storyHeavenSerialQualityThresholds(run.EPISODE_NO);
    await connection.execute(
      `update storyheaven_serial_runs set current_stage = 'editorial_review', updated_at = systimestamp where id = :run_id`,
      { run_id: job.RUN_ID }
    );
    await queueJob(connection, {
      runId: job.RUN_ID,
      storyId: job.STORY_ID,
      type: "editorial_review",
      priority: 80,
      input: {
        story: context.story,
        bible: context.bible,
        arc: context.arc,
        canon: context.canon,
        reveals: context.reveals,
        episodeCard: context.cards.find((item) => Number(item.episodeNo) === Number(run.EPISODE_NO)),
        draft: { ...draft, id: draftId, version: Number(version.NEXT_VERSION || 1) },
        deterministicQa: qa,
        reviewPolicy: {
          thresholds: reviewThresholds,
          rewriteCount: Number(run.REWRITE_COUNT || 0),
          firstEpisode: Number(run.EPISODE_NO) === 1
        }
      }
    });
  }

  async function acceptEditorialReview(connection, job, review) {
    const run = await selectOne(connection, `select * from storyheaven_serial_runs where id = :run_id for update`, { run_id: job.RUN_ID });
    if (!run || RUN_STATES_DONE.has(run.RUN_STATUS)) throw failure("serial_run_not_reviewable", 409);
    const draft = await selectOne(connection,
      `select * from storyheaven_serial_drafts where run_id = :run_id order by version_no desc fetch first 1 row only`,
      { run_id: job.RUN_ID });
    if (!draft) throw failure("serial_draft_missing", 409);
    const qa = parseJson(draft.DETERMINISTIC_JSON, {});
    const thresholds = storyHeavenSerialQualityThresholds(run.EPISODE_NO);
    const decision = decideStoryHeavenSerialReview({
      review,
      qa,
      rewriteCount: Number(run.REWRITE_COUNT || 0),
      episodeNo: run.EPISODE_NO
    });
    const reviewVersion = await selectOne(connection,
      `select nvl(max(review_version), 0) + 1 as next_version from storyheaven_editorial_reviews where run_id = :run_id`,
      { run_id: job.RUN_ID });
    await connection.execute(
      `insert into storyheaven_editorial_reviews (
        id, run_id, draft_id, review_version, decision, scores_json,
        safety_passed, summary_text, issues_json, rewrite_scenes_json,
        score_evidence_json, audience_lenses_json, source_job_id
      ) values (
        :id, :run_id, :draft_id, :review_version, :decision, :scores_json,
        :safety_passed, :summary_text, :issues_json, :rewrite_scenes_json,
        :score_evidence_json, :audience_lenses_json, :source_job_id
      )`,
      {
        id: randomId(), run_id: job.RUN_ID, draft_id: draft.ID,
        review_version: Number(reviewVersion.NEXT_VERSION || 1), decision: decision.state === "approved" ? "approved" : decision.state,
        scores_json: clobJson(review.scores), safety_passed: review.safetyPassed ? "Y" : "N",
        summary_text: review.summary, issues_json: clobJson(review.issues),
        rewrite_scenes_json: clobJson(review.rewriteScenes),
        score_evidence_json: clobJson(review.scoreEvidence),
        audience_lenses_json: clobJson(review.audienceLenses), source_job_id: job.ID
      }
    );
    for (const [name, threshold] of Object.entries(thresholds)) {
      const evidence = review.scoreEvidence[name] || [];
      await connection.execute(
        `insert into storyheaven_quality_metrics (
          id, run_id, draft_id, metric_name, metric_score,
          threshold_score, passed, evidence_json
        ) values (
          :id, :run_id, :draft_id, :metric_name, :metric_score,
          :threshold_score, :passed, :evidence_json
        )`,
        {
          id: randomId(), run_id: job.RUN_ID, draft_id: draft.ID, metric_name: name,
          metric_score: review.scores[name], threshold_score: threshold,
          passed: Number(review.scores[name]) >= threshold ? "Y" : "N", evidence_json: clobJson(evidence)
        }
      );
    }
    await connection.execute(
      `update storyheaven_serial_runs set quality_json = :quality_json, updated_at = systimestamp where id = :run_id`,
      { run_id: job.RUN_ID, quality_json: clobJson({ deterministic: qa, editorial: review, decision }) }
    );
    if (decision.state === "approved") return approveDraft(connection, run, draft);
    if (!decision.rewriteAllowed) {
      await connection.execute(
        `update storyheaven_serial_runs set run_status = 'blocked', current_stage = 'editorial_blocked',
                failure_code = 'quality_threshold_not_met', completed_at = systimestamp,
                updated_at = systimestamp where id = :run_id`, { run_id: job.RUN_ID });
      return;
    }
    const nextRewrite = Number(run.REWRITE_COUNT || 0) + 1;
    await connection.execute(
      `update storyheaven_serial_runs set run_status = 'rewrite', current_stage = 'rewrite_draft',
              rewrite_count = :rewrite_count, updated_at = systimestamp where id = :run_id`,
      { run_id: job.RUN_ID, rewrite_count: nextRewrite }
    );
    const context = await loadSerialContext(connection, job.STORY_ID);
    await queueJob(connection, {
      runId: job.RUN_ID,
      storyId: job.STORY_ID,
      type: "rewrite_draft",
      priority: 70,
      input: {
        story: context.story,
        bible: context.bible,
        arc: context.arc,
        canon: context.canon,
        reveals: context.reveals,
        episodeCard: context.cards.find((item) => Number(item.episodeNo) === Number(run.EPISODE_NO)),
        draft: { id: draft.ID, title: draft.TITLE, summary: draft.PUBLIC_SUMMARY, body: draft.BODY_TEXT, sceneRanges: parseJson(draft.SCENE_RANGES_JSON, []) },
        deterministicQa: qa,
        editor: review,
        rewriteNumber: nextRewrite,
        instruction: "지적된 장면만 우선 고치되 수정 때문에 앞뒤 인과나 설정이 깨지는 부분은 함께 정리한다."
      }
    });
  }

  async function approveDraft(connection, run, draft) {
    for (const fact of parseJson(draft.CANON_CANDIDATES_JSON, [])) {
      const previous = await selectOne(connection,
        `select id, fact_version from storyheaven_canon_facts
          where story_id = :story_id and fact_key = :fact_key and fact_status = 'active'
          order by fact_version desc fetch first 1 row only`,
        { story_id: run.STORY_ID, fact_key: fact.key });
      if (previous) {
        await connection.execute(
          `update storyheaven_canon_facts set fact_status = 'retconned', updated_at = systimestamp where id = :id`,
          { id: previous.ID }
        );
      }
      await connection.execute(
        `insert into storyheaven_canon_facts (
          id, story_id, fact_key, fact_version, fact_category, fact_value,
          source_episode_no, source_draft_id, replaces_fact_id
        ) values (
          :id, :story_id, :fact_key, :fact_version, :fact_category, :fact_value,
          :source_episode_no, :source_draft_id, :replaces_fact_id
        )`,
        {
          id: randomId(), story_id: run.STORY_ID, fact_key: fact.key,
          fact_version: Number(previous?.FACT_VERSION || 0) + 1,
          fact_category: fact.category, fact_value: fact.value,
          source_episode_no: run.EPISODE_NO, source_draft_id: draft.ID,
          replaces_fact_id: previous?.ID || null
        }
      );
    }
    for (const reveal of parseJson(draft.REVEAL_UPDATES_JSON, [])) {
      await connection.execute(
        `update storyheaven_reveal_ledger set reveal_status = :reveal_status,
                source_episode_no = :source_episode_no, updated_at = systimestamp
          where story_id = :story_id and reveal_key = :reveal_key`,
        { story_id: run.STORY_ID, reveal_key: reveal.key, reveal_status: reveal.status, source_episode_no: run.EPISODE_NO }
      );
    }
    const releaseAt = run.RELEASE_AT || new Date();
    await connection.execute(
      `insert into storyheaven_publication_queue (
        id, run_id, story_id, draft_id, episode_no, queue_status, release_at
      ) values (
        :id, :run_id, :story_id, :draft_id, :episode_no, 'ready', :release_at
      )`,
      { id: randomId(), run_id: run.ID, story_id: run.STORY_ID, draft_id: draft.ID, episode_no: run.EPISODE_NO, release_at: releaseAt }
    );
    await connection.execute(
      `update storyheaven_serial_runs set run_status = 'ready', current_stage = 'publication_ready',
              completed_at = systimestamp, updated_at = systimestamp where id = :run_id`,
      { run_id: run.ID }
    );
    if (run.SCHEDULE_ID && Number(run.EPISODE_NO) === 1) {
      const timing = await selectOne(connection,
        `select round((cast(systimestamp as date) - cast(min(nvl(started_at, created_at)) as date)) * 86400, 2) as duration_seconds
           from storyheaven_serial_runs
          where queue_group_id = :queue_group_id`,
        { queue_group_id: run.QUEUE_GROUP_ID || run.ID });
      const durationSeconds = Math.max(1, Number(timing?.DURATION_SECONDS || 0));
      if (durationSeconds > 0) {
        await connection.execute(
          `update storyheaven_serial_schedules
              set episode1_avg_seconds = round(
                    (nvl(episode1_avg_seconds, 0) * episode1_sample_count + :duration_seconds)
                    / (episode1_sample_count + 1), 2
                  ),
                  episode1_last_seconds = :duration_seconds,
                  episode1_sample_count = episode1_sample_count + 1,
                  updated_at = systimestamp
            where id = :schedule_id`,
          { schedule_id: run.SCHEDULE_ID, duration_seconds: durationSeconds }
        );
      }
    }
    const runInput = parseJson(run.INPUT_JSON, {});
    const batchEndEpisodeNo = positiveInteger(runInput.batchEndEpisodeNo);
    if (batchEndEpisodeNo && Number(run.EPISODE_NO) < batchEndEpisodeNo) {
      const scheduleRow = run.SCHEDULE_ID
        ? await selectOne(connection,
            `select cadence_days, cadence_minutes, created_by, publication_mode
               from storyheaven_serial_schedules where id = :id`,
            { id: run.SCHEDULE_ID })
        : null;
      const schedule = scheduleRow || { CADENCE_DAYS: 0, CADENCE_MINUTES: 0, CREATED_BY: run.REQUESTED_BY, PUBLICATION_MODE: "test_private" };
      await queueNextEpisode(connection, run, schedule, {
        queueGroupId: run.QUEUE_GROUP_ID,
        batchEndEpisodeNo,
        notes: runInput.notes || ""
      });
    } else if (run.SCHEDULE_ID) await queueFollowingEpisode(connection, run);
  }

  async function publishNextDue() {
    return withTransaction(async (connection) => {
      const queue = await selectOne(connection,
        `select * from (
           select publication.* from storyheaven_publication_queue publication
             join storyheaven_serial_runs serial_run on serial_run.id = publication.run_id
             join storyheaven_stories story on story.id = publication.story_id
             left join storyheaven_serial_schedules schedule on schedule.id = serial_run.schedule_id
             left join storyheaven_serial_story_controls control on control.story_id = publication.story_id
            where publication.queue_status = 'ready'
              and publication.release_at <= systimestamp
              and nvl(control.visibility, 'public') = 'public'
              and nvl(control.continuation_mode, 'auto') in ('auto', 'manual')
              and (serial_run.schedule_id is null or (
                schedule.schedule_status = 'active' and schedule.publication_mode = 'auto_public'
              ))
              and (
                publication.episode_no = nvl((
                  select max(episode.episode_no)
                    from storyheaven_episodes episode
                   where episode.story_id = publication.story_id
                     and episode.episode_status = 'published'
                ), 0) + 1
                or (
                  json_value(serial_run.input_json, '$.rewriteEpisode' returning varchar2(10) null on error) = 'true'
                  and exists (
                    select 1
                      from storyheaven_episodes existing_episode
                     where existing_episode.story_id = publication.story_id
                       and existing_episode.episode_no = publication.episode_no
                       and existing_episode.episode_status = 'published'
                  )
                )
              )
            order by publication.release_at, publication.created_at
         ) where rownum = 1`
      );
      if (!queue) return null;
      const story = await selectOne(connection,
        `select author_user_id, content_origin, current_revision_no, story_status
           from storyheaven_stories where id = :story_id for update`,
        { story_id: queue.STORY_ID });
      if (!story || story.AUTHOR_USER_ID !== SYSTEM_AUTHOR_ID || story.CONTENT_ORIGIN !== "admin_seed") {
        throw failure("serial_publication_source_invalid", 409);
      }
      if (story.STORY_STATUS === "archived") return null;
      const locked = await connection.execute(
        `update storyheaven_publication_queue set queue_status = 'publishing',
                attempt_count = attempt_count + 1, updated_at = systimestamp
          where id = :id and queue_status = 'ready'`, { id: queue.ID });
      if (Number(locked.rowsAffected || 0) !== 1) return null;
      const draft = await selectOne(connection,
        `select * from storyheaven_serial_drafts where id = :draft_id`, { draft_id: queue.DRAFT_ID });
      const run = await selectOne(connection,
        `select * from storyheaven_serial_runs where id = :run_id for update`, { run_id: queue.RUN_ID });
      if (!draft || !run) {
        throw failure("serial_publication_source_invalid", 409);
      }
      const runInput = parseJson(run.INPUT_JSON, {});
      const rewriteExisting = runInput.rewriteEpisode === true;
      const qa = parseJson(draft.DETERMINISTIC_JSON, {});
      const existing = await selectOne(connection,
        `select id, episode_status, current_revision_no from storyheaven_episodes
          where story_id = :story_id and episode_no = :episode_no for update`,
        { story_id: queue.STORY_ID, episode_no: queue.EPISODE_NO });
      let episodeId = existing?.ID || randomId();
      if (!existing) {
        await connection.execute(
          `insert into storyheaven_episodes (
            id, story_id, episode_no, title, public_summary, body_text,
            character_count, paragraph_count, estimated_read_minutes,
            preview_character_count, episode_status, review_decision,
            current_revision_no, submitted_at, reviewed_at, reviewed_by, published_at
          ) values (
            :id, :story_id, :episode_no, :title, :public_summary, :body_text,
            :character_count, :paragraph_count, :estimated_read_minutes,
            :preview_character_count, 'published', 'approved',
            1, systimestamp, systimestamp, 'storyheaven-serial-editor', systimestamp
          )`,
          episodeBinds(episodeId, queue, draft, qa)
        );
      } else if (existing.EPISODE_STATUS !== "published" || rewriteExisting) {
        await connection.execute(
          `update storyheaven_episodes set title = :title, public_summary = :public_summary,
                  body_text = :body_text, character_count = :character_count,
                  paragraph_count = :paragraph_count, estimated_read_minutes = :estimated_read_minutes,
                  preview_character_count = :preview_character_count,
                  episode_status = 'published', review_decision = 'approved', review_note = null,
                  current_revision_no = :revision_no, submitted_at = systimestamp,
                  reviewed_at = systimestamp, reviewed_by = 'storyheaven-serial-editor',
                  published_at = systimestamp, updated_at = systimestamp where id = :id`,
          { ...episodeBinds(episodeId, queue, draft, qa), revision_no: Number(existing.CURRENT_REVISION_NO || 0) + 1 }
        );
      }
      const revisionNo = existing ? Number(existing.CURRENT_REVISION_NO || 0) + (existing.EPISODE_STATUS === "published" && !rewriteExisting ? 0 : 1) : 1;
      const revisionExists = await selectOne(connection,
        `select count(*) as revision_count from storyheaven_episode_revisions
          where episode_id = :episode_id and revision_no = :revision_no`,
        { episode_id: episodeId, revision_no: revisionNo });
      if (Number(revisionExists.REVISION_COUNT || 0) === 0) {
        await connection.execute(
          `insert into storyheaven_episode_revisions (
            id, episode_id, revision_no, actor_user_id, revision_kind,
            title, public_summary, body_text, content_hash, quality_json
          ) values (
            :id, :episode_id, :revision_no, :actor_user_id, 'publish',
            :title, :public_summary, :body_text, :content_hash, :quality_json
          )`,
          {
            id: randomId(), episode_id: episodeId, revision_no: revisionNo,
            actor_user_id: SYSTEM_AUTHOR_ID, title: draft.TITLE,
            public_summary: draft.PUBLIC_SUMMARY, body_text: clob(draft.BODY_TEXT),
            content_hash: draft.CONTENT_HASH, quality_json: clobJson(qa)
          }
        );
      }
      await connection.execute(
        `update storyheaven_stories set story_status = 'published', review_decision = 'approved',
                published_at = coalesce(published_at, systimestamp), updated_at = systimestamp
          where id = :story_id`, { story_id: queue.STORY_ID });
      await connection.execute(
        `update storyheaven_publication_queue set queue_status = 'published',
                published_episode_id = :episode_id, published_at = systimestamp,
                failure_code = null, updated_at = systimestamp where id = :id`,
        { id: queue.ID, episode_id: episodeId }
      );
      await connection.execute(
        `update storyheaven_serial_runs set run_status = 'published', current_stage = 'published',
                completed_at = systimestamp, updated_at = systimestamp where id = :run_id`,
        { run_id: queue.RUN_ID }
      );
      await connection.execute(
        `update storyheaven_serial_continuations
            set request_status = 'fulfilled', run_id = :run_id,
                failure_code = null, updated_at = systimestamp
          where story_id = :story_id and target_episode_no = :episode_no
            and request_status <> 'fulfilled'`,
        { story_id: queue.STORY_ID, episode_no: queue.EPISODE_NO, run_id: queue.RUN_ID }
      );
      if (run.SCHEDULE_ID) await queueFollowingEpisode(connection, run);
      return { storyId: queue.STORY_ID, episodeNo: Number(queue.EPISODE_NO), episodeId };
    });
  }

  async function queueFollowingEpisode(connection, run) {
    const control = await selectOne(connection,
      `select continuation_mode from storyheaven_serial_story_controls where story_id = :story_id`,
      { story_id: run.STORY_ID });
    if (control && control.CONTINUATION_MODE !== "auto") return;
    const schedule = await selectOne(connection,
      `select cadence_days, cadence_minutes, target_episode_count, created_by, publication_mode
         from storyheaven_serial_schedules where id = :id and schedule_status = 'active'`,
      { id: run.SCHEDULE_ID });
    if (!schedule) return;
    const pipeline = await selectOne(connection,
      `select
          nvl(max(case
            when run_type = 'episode' and run_status in ('ready', 'published') then episode_no
          end), 0) as last_approved_episode,
          sum(case
            when run_type = 'episode' and run_status in ('queued', 'running', 'rewrite') then 1 else 0
          end) as active_count,
          sum(case
            when run_type = 'episode'
             and run_status in ('queued', 'running', 'rewrite', 'ready')
             and episode_no > nvl((
               select max(episode.episode_no)
                 from storyheaven_episodes episode
                where episode.story_id = :story_id
                  and episode.episode_status = 'published'
             ), 0)
            then 1 else 0
          end) as buffer_count
         from storyheaven_serial_runs
        where story_id = :story_id`,
      { story_id: run.STORY_ID });
    const bufferTarget = Math.max(1, Number(schedule.TARGET_EPISODE_COUNT || STORYHEAVEN_CONTINUATION_POLICY.initialEpisodeCount));
    if (Number(pipeline.ACTIVE_COUNT || 0) > 0) return;
    const nextEpisodeNo = Math.max(Number(run.EPISODE_NO), Number(pipeline.LAST_APPROVED_EPISODE || 0)) + 1;
    if (nextEpisodeNo > bufferTarget) {
      await connection.execute(
        `update storyheaven_serial_schedules
            set last_cycle_completed_at = systimestamp,
                next_run_at = systimestamp + numtodsinterval(cadence_minutes, 'MINUTE'),
                updated_at = systimestamp
          where id = :schedule_id
            and (
              last_cycle_completed_at is null
              or last_cycle_completed_at < (
                select serial_run.created_at
                  from storyheaven_serial_runs serial_run
                 where serial_run.id = :run_id
              )
            )`,
        { schedule_id: run.SCHEDULE_ID, run_id: run.ID }
      );
      return;
    }
    if (Number(pipeline.BUFFER_COUNT || 0) >= bufferTarget) return;
    return queueNextEpisode(connection, run, schedule, { queueGroupId: run.QUEUE_GROUP_ID });
  }

  async function queueNextEpisode(connection, run, schedule, { queueGroupId = null, batchEndEpisodeNo = null, notes = "" } = {}) {
    const pipeline = await selectOne(connection,
      `select greatest(
         nvl((select max(episode_no) from storyheaven_episodes
               where story_id = :story_id and episode_status = 'published'), 0),
         nvl((select max(episode_no) from storyheaven_serial_runs
               where story_id = :story_id and run_type = 'episode'
                 and run_status in ('ready', 'published')), 0)
       ) + 1 as next_episode_no from dual`,
      { story_id: run.STORY_ID });
    const nextEpisodeNo = Number(pipeline.NEXT_EPISODE_NO || 1);
    if (batchEndEpisodeNo && nextEpisodeNo > Number(batchEndEpisodeNo)) return null;
    const arc = await selectOne(connection,
      `select episode_plan_json from storyheaven_serial_arcs where id = :arc_id`, { arc_id: run.ARC_ID });
    const releaseBase = dateOrNull(run.RELEASE_AT) || new Date();
    const cadenceDays = schedule.CADENCE_DAYS === null || schedule.CADENCE_DAYS === undefined
      ? 7
      : Number(schedule.CADENCE_DAYS);
    const releaseAt = new Date(releaseBase.getTime() + Math.max(0, cadenceDays) * 86_400_000);
    const hasNext = parseJson(arc?.EPISODE_PLAN_JSON, []).some((item) => Number(item.episodeNo) === nextEpisodeNo);
    if (hasNext) {
      return createEpisodeRun(connection, {
        storyId: run.STORY_ID, userId: schedule.CREATED_BY, episodeNo: nextEpisodeNo,
        releaseAt, notes, scheduleId: run.SCHEDULE_ID, queueGroupId,
        batchEndEpisodeNo
      });
    }
    const existingPlanning = await selectOne(connection,
      `select * from (
         select id, schedule_id, story_id, run_type, run_status, current_stage, release_at
           from storyheaven_serial_runs
          where story_id = :story_id and run_type = 'planning'
            and run_status in ('queued', 'running', 'rewrite')
          order by created_at desc
       ) where rownum = 1`,
      { story_id: run.STORY_ID });
    if (existingPlanning) return {
      id: existingPlanning.ID,
      scheduleId: existingPlanning.SCHEDULE_ID,
      storyId: existingPlanning.STORY_ID,
      type: existingPlanning.RUN_TYPE,
      status: existingPlanning.RUN_STATUS,
      stage: existingPlanning.CURRENT_STAGE,
      releaseAt: existingPlanning.RELEASE_AT
    };
    const context = await loadSerialContext(connection, run.STORY_ID);
    const seriesPlan = context.bible.narrativeBlueprint?.seriesPlan || context.bible.concept?.seriesPlan || normalizeSeriesPlan();
    const arcScope = safeArcScope(nextEpisodeNo, seriesPlan, context.bible.narrativeBlueprint?.seriesArchitecture);
    const planning = await createRun(connection, {
      scheduleId: run.SCHEDULE_ID, storyId: run.STORY_ID, runType: "planning",
      stage: "build_arc", userId: schedule.CREATED_BY,
      queueGroupId,
      input: { autoEpisode: true, releaseAt: releaseAt.toISOString(), batchEndEpisodeNo }
    });
    await queueJob(connection, {
      runId: planning.id, storyId: run.STORY_ID, type: "build_arc",
      input: {
        story: context.story, concept: context.bible.concept, bible: context.bible,
        arcNo: Number(context.arc.arcNo) + 1, firstEpisodeNo: nextEpisodeNo,
        seriesPlan,
        arcScope,
        priorArcs: context.priorArcs, canon: context.canon, autoEpisode: true
      }
    });
    return planning;
  }

  async function loadSerialContext(connection, storyId, { requireArc = true } = {}) {
    const storyRow = await selectOne(connection,
      `select id, title, logline, public_synopsis, genre, genres_json, tags_json, content_rating
         from storyheaven_stories where id = :story_id`, { story_id: storyId });
    if (!storyRow) throw failure("story_not_found", 404);
    const bibleRow = await selectOne(connection,
      `select * from storyheaven_serial_bibles where story_id = :story_id`, { story_id: storyId });
    const arcRow = await selectOne(connection,
      `select * from storyheaven_serial_arcs
        where story_id = :story_id and arc_status = 'active'
        order by arc_no desc, arc_version desc fetch first 1 row only`, { story_id: storyId });
    if (!bibleRow) throw failure("serial_bible_required", 409);
    if (requireArc && !arcRow) throw failure("serial_arc_required", 409);
    const [canon, reveals, episodes, cards, priorArcs] = await Promise.all([
      connection.execute(`select fact_key, fact_category, fact_value, source_episode_no from storyheaven_canon_facts where story_id = :story_id and fact_status = 'active' order by fact_key`, { story_id: storyId }),
      connection.execute(`select reveal_key, secret_text, introduce_episode_no, payoff_episode_no, reveal_status from storyheaven_reveal_ledger where story_id = :story_id and reveal_status <> 'retired' order by introduce_episode_no`, { story_id: storyId }),
      connection.execute(`select episode_no, title, public_summary from storyheaven_episodes where story_id = :story_id and episode_status = 'published' order by episode_no desc fetch first 5 rows only`, { story_id: storyId }),
      connection.execute(`select id, episode_no, episode_promise, opening_disturbance, scenes_json, payoff, hook, knowledge_json, canon_refs_json, technique_plan_json from storyheaven_episode_cards where story_id = :story_id and card_status = 'active' order by episode_no`, { story_id: storyId }),
      connection.execute(`select arc_no, arc_title, central_question, ending_truth, episode_plan_json, narrative_plan_json from storyheaven_serial_arcs where story_id = :story_id order by arc_no desc fetch first 5 rows only`, { story_id: storyId })
    ]);
    return {
      story: publicStory(storyRow),
      bible: mapBible(bibleRow),
      arc: arcRow ? mapArc(arcRow) : null,
      canon: canon.rows.map((row) => ({ key: row.FACT_KEY, category: row.FACT_CATEGORY, value: row.FACT_VALUE, sourceEpisodeNo: row.SOURCE_EPISODE_NO === null ? null : Number(row.SOURCE_EPISODE_NO) })),
      reveals: reveals.rows.map(mapReveal),
      recentEpisodes: episodes.rows.map((row) => ({ episodeNo: Number(row.EPISODE_NO), title: row.TITLE, summary: row.PUBLIC_SUMMARY || "" })).reverse(),
      cards: cards.rows.map(mapCard),
      priorArcs: priorArcs.rows.map((row) => ({ arcNo: Number(row.ARC_NO), title: row.ARC_TITLE, centralQuestion: row.CENTRAL_QUESTION, endingTruth: row.ENDING_TRUTH, episodePlan: parseJson(row.EPISODE_PLAN_JSON, []), narrativePlan: parseJson(row.NARRATIVE_PLAN_JSON, {}) })).reverse()
    };
  }

  async function upsertBibleConcept(connection, storyId, concept) {
    await connection.execute(
      `merge into storyheaven_serial_bibles target
       using (select :story_id story_id from dual) source on (target.story_id = source.story_id)
       when matched then update set target.concept_json = :concept_json,
         target.bible_status = 'draft', target.updated_at = systimestamp
       when not matched then insert (
         story_id, bible_version, bible_status, concept_json, narrative_blueprint_json
       ) values (
         :story_id, 1, 'draft', :concept_json, :narrative_blueprint_json
       )`,
      {
        story_id: storyId,
        concept_json: clobJson(concept),
        narrative_blueprint_json: clobJson({})
      }
    );
  }

  async function createRun(connection, { scheduleId = null, storyId = null, arcId = null, episodeNo = null, runType, stage, userId, queueGroupId = null, releaseAt = null, input = {} }) {
    const id = randomId();
    const effectiveQueueGroupId = queueGroupId || id;
    await connection.execute(
      `insert into storyheaven_serial_runs (
        id, queue_group_id, schedule_id, story_id, arc_id, episode_no, run_type,
        run_status, current_stage, requested_by, release_at, input_json
      ) values (
        :id, :queue_group_id, :schedule_id, :story_id, :arc_id, :episode_no, :run_type,
        'queued', :current_stage, :requested_by, :release_at, :input_json
      )`,
      {
        id, queue_group_id: effectiveQueueGroupId, schedule_id: scheduleId, story_id: storyId, arc_id: arcId,
        episode_no: episodeNo, run_type: runType, current_stage: stage,
        requested_by: userId, release_at: releaseAt, input_json: clobJson(input)
      }
    );
    return { id, queueGroupId: effectiveQueueGroupId, scheduleId, storyId, arcId, episodeNo, type: runType, status: "queued", stage, releaseAt };
  }

  async function queueJob(connection, { runId, storyId = null, type, input, priority = 100, maxAttempts: jobMaxAttempts = maxAttempts }) {
    const json = JSON.stringify(input ?? {});
    if (Buffer.byteLength(json, "utf8") > STORYHEAVEN_SERIAL_LIMITS.jobPayloadBytes) {
      throw failure("serial_job_payload_too_large", 413);
    }
    await connection.execute(
      `insert into storyheaven_serial_jobs (
        id, run_id, story_id, job_type, job_status, priority,
        input_hash, input_json, max_attempts, next_attempt_at
      ) values (
        :id, :run_id, :story_id, :job_type, 'queued', :priority,
        :input_hash, :input_json, :max_attempts, systimestamp
      )`,
      {
        id: randomId(), run_id: runId, story_id: storyId, job_type: type,
        priority, input_hash: sha256(json), input_json: clob(json), max_attempts: jobMaxAttempts
      }
    );
  }

  function episodePlanningPayload(context, episodeNo, planItem, notes) {
    const seriesPlan = context.bible.narrativeBlueprint?.seriesPlan || context.bible.concept?.seriesPlan || normalizeSeriesPlan();
    const seriesArchitecture = context.bible.narrativeBlueprint?.seriesArchitecture || {};
    const seriesPosition = storyHeavenSeriesPosition(episodeNo, seriesPlan);
    return {
      story: context.story,
      bible: context.bible,
      arc: context.arc,
      episodeNo,
      installment: installmentMeta(episodeNo),
      seriesPlan,
      seriesPosition,
      volumeContext: (seriesArchitecture.volumePlan || []).find((item) => Number(item.volumeNo) === seriesPosition.volumeNo) || null,
      prologueDisclosure: seriesPosition.isPrologue ? seriesArchitecture.prologueDisclosure || null : null,
      arcPlan: planItem,
      canon: context.canon,
      reveals: context.reveals,
      recentEpisodes: context.recentEpisodes,
      recentTechniquePlans: context.cards
        .filter((item) => Number(item.episodeNo) < Number(episodeNo))
        .slice(-3)
        .map((item) => ({ episodeNo: item.episodeNo, ...item.techniquePlan })),
      operatorNotes: cleanText(notes, 1000)
    };
  }

  function writingPayload(context, card, episodeNo) {
    const seriesPlan = context.bible.narrativeBlueprint?.seriesPlan || context.bible.concept?.seriesPlan || normalizeSeriesPlan();
    const seriesPosition = storyHeavenSeriesPosition(episodeNo, seriesPlan);
    return {
      story: context.story,
      bible: context.bible,
      arc: context.arc,
      episodeNo,
      installment: installmentMeta(episodeNo),
      seriesPlan,
      seriesPosition,
      episodeCard: card,
      canon: context.canon,
      reveals: context.reveals,
      recentEpisodes: context.recentEpisodes,
      constraints: {
        minimumCharacters: STORYHEAVEN_SERIAL_LIMITS.draftCharactersMin,
        maximumCharacters: STORYHEAVEN_SERIAL_LIMITS.draftCharactersMax,
        minimumParagraphs: 8,
        numeralStyle: "시간과 수치 정보는 11년, 8초처럼 아라비아 숫자로 적는다.",
        language: "번역투가 아닌 자연스럽고 빠르게 읽히는 한국어",
        readerOrientation: "첫 2개 문단 안에 시점 인물, 장소, 평소 상태, 당장 목표를 자연스럽게 밝히고 3번째 문단까지 첫 변화와 실패 시 손실을 이해시킨다.",
        newTermBudget: "첫 문단의 낯선 고유 용어는 최대 1개, 첫 장면 전체는 최대 3개다. 쉬운 뜻이나 눈에 보이는 효과를 먼저 또는 함께 보여주고 같은 문단의 행동에 연결한다.",
        sceneClarity: "각 장면의 첫 2개 문단 안에 시점 인물의 위치, 가까운 장애물이나 물체, 움직이거나 달라지는 대상을 독자가 파악할 수 있게 한다.",
        concreteDetailBudget: "장면당 기억할 구체물은 2~4개만 선택하고 시점 인물이 실제 감지할 수 있는 감각만 쓴다.",
        spatialContinuity: "인물의 상대 위치, 이동 방향, 손에 든 물건과 행동 결과가 문단 사이에서 순간이동하거나 모순되지 않게 한다."
      }
    };
  }

  function installmentMeta(episodeNo) {
    const number = Number(episodeNo || 1);
    return {
      internalEpisodeNo: number,
      isPrologue: number === 1,
      publicLabel: number === 1 ? "프롤로그" : `본편 ${number - 1}화`,
      mainEpisodeNo: number > 1 ? number - 1 : null
    };
  }

  function episodeBinds(episodeId, queue, draft, qa) {
    return {
      id: episodeId, story_id: queue.STORY_ID, episode_no: queue.EPISODE_NO,
      title: draft.TITLE, public_summary: draft.PUBLIC_SUMMARY, body_text: clob(draft.BODY_TEXT),
      character_count: Number(qa.characterCount || 0), paragraph_count: Number(qa.paragraphCount || 0),
      estimated_read_minutes: Number(qa.estimatedReadMinutes || 1),
      preview_character_count: Math.min(Number(qa.characterCount || 0), 2500)
    };
  }

  async function existingSystemTitles(connection) {
    const result = await connection.execute(
      `select title, logline from storyheaven_stories
        where author_user_id = :author_user_id and story_status <> 'archived'
        order by created_at desc fetch first 50 rows only`,
      { author_user_id: SYSTEM_AUTHOR_ID }
    );
    return result.rows.map((row) => ({ title: row.TITLE, logline: row.LOGLINE }));
  }
}

function retryableAttentionGroupsSql() {
  return `
    select queue_group_id from (
      select grouped.queue_group_id,
             grouped.has_error,
             grouped.has_blocked,
             row_number() over (
               partition by grouped.group_key
               order by grouped.group_time desc, grouped.queue_group_id desc
             ) as rank_no
        from (
          select serial_run.queue_group_id,
                 nvl(serial_run.schedule_id, serial_run.queue_group_id) as group_key,
                 max(coalesce(serial_run.completed_at, serial_run.started_at, serial_run.created_at)) as group_time,
                 max(case when serial_run.run_status = 'error' then 1 else 0 end) as has_error,
                 max(case when serial_run.run_status = 'blocked' then 1 else 0 end) as has_blocked,
                 max(case when serial_run.queue_canceled_at is not null then 1 else 0 end) as has_canceled
            from storyheaven_serial_runs serial_run
           where serial_run.created_at >= systimestamp - numtodsinterval(30, 'DAY')
           group by serial_run.queue_group_id, nvl(serial_run.schedule_id, serial_run.queue_group_id)
        ) grouped
       where grouped.has_canceled = 0
    )
    where rank_no = 1
      and has_error = 1
      and has_blocked = 0`;
}

function mapSchedule(row) {
  const policy = normalizeStoredConceptPolicy(parseJson(row.CONCEPT_POLICY_JSON, {}));
  const primaryGenres = parseJson(row.PRIMARY_GENRES_JSON, row.PRIMARY_GENRE ? [row.PRIMARY_GENRE] : []);
  const subgenres = parseJson(row.SUBGENRES_JSON, []);
  const subgenresByGenre = parseJson(row.SUBGENRES_BY_GENRE_JSON, row.PRIMARY_GENRE ? { [row.PRIMARY_GENRE]: subgenres } : {});
  const storedCreativeControls = policy.creativeControls && typeof policy.creativeControls === "object"
    ? policy.creativeControls
    : {};
  const legacyHumor = storedCreativeControls.humorIntensity === "comedy-first"
    ? 5
    : storedCreativeControls.humorIntensity === "balanced"
      ? 3
      : STORYHEAVEN_CREATIVE_CONTROL_DEFAULTS.humor;
  const creativeControls = {
    ...STORYHEAVEN_CREATIVE_CONTROL_DEFAULTS,
    humor: legacyHumor,
    preset: "balanced",
    ...storedCreativeControls
  };
  const seriesPlan = normalizeSeriesPlan(policy.seriesPlan);
  return {
    id: row.ID,
    name: row.SCHEDULE_NAME,
    status: row.SCHEDULE_STATUS,
    cadenceMinutes: Number(row.CADENCE_MINUTES || Number(row.CADENCE_DAYS || 1) * 1_440),
    cadenceDays: Number(row.CADENCE_DAYS || 1),
    targetEpisodeCount: Math.max(1, Number(row.TARGET_EPISODE_COUNT || STORYHEAVEN_CONTINUATION_POLICY.initialEpisodeCount)),
    targetAge: row.TARGET_AGE,
    genrePool: parseJson(row.GENRE_POOL_JSON, []),
    conceptPolicy: policy.instruction || "",
    seriesPlan,
    continuationBatchCount: normalizeContinuationBatchCount(policy.continuationBatchCount),
    creativeControls,
    humorIntensity: creativeControls.humorIntensity || "light",
    humorLabel: creativeControls.humorLabel || "미소 중심",
    randomized: policy.randomized || { primaryGenre: false, subgenres: false },
    primaryGenre: row.PRIMARY_GENRE,
    primaryGenres,
    subgenres,
    subgenresByGenre,
    publicationMode: row.PUBLICATION_MODE || "test_private",
    maxActiveSerials: 1,
    nextRunAt: isoTime(row.NEXT_RUN_AT),
    lastRunAt: isoTime(row.LAST_RUN_AT),
    lastCycleCompletedAt: isoTime(row.LAST_CYCLE_COMPLETED_AT),
    episode1Timing: {
      sampleCount: Number(row.EPISODE1_SAMPLE_COUNT || 0),
      averageSeconds: row.EPISODE1_AVG_SECONDS === null || row.EPISODE1_AVG_SECONDS === undefined
        ? null
        : Number(row.EPISODE1_AVG_SECONDS),
      lastSeconds: row.EPISODE1_LAST_SECONDS === null || row.EPISODE1_LAST_SECONDS === undefined
        ? null
        : Number(row.EPISODE1_LAST_SECONDS)
    },
    createdAt: isoTime(row.CREATED_AT),
    updatedAt: isoTime(row.UPDATED_AT),
    lastRunId: row.LAST_RUN_ID || null,
    lastStoryId: row.LAST_STORY_ID || null
  };
}

function normalizeStoredConceptPolicy(policyValue) {
  const policy = policyValue && typeof policyValue === "object" ? policyValue : {};
  const storedControls = policy.creativeControls && typeof policy.creativeControls === "object"
    ? policy.creativeControls
    : {};
  const normalizedControls = normalizeStoryHeavenCreativeControls(
    storedControls,
    storedControls.humorIntensity
  );
  return {
    ...policy,
    instruction: normalizeStoryHeavenConceptPolicy(policy.instruction),
    creativeControls: {
      ...storedControls,
      ...normalizedControls.values,
      preset: normalizedControls.preset,
      guidance: storyHeavenCreativeControlGuidance(normalizedControls.values)
    }
  };
}

function normalizeSeriesPlan(value = {}) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const totalVolumes = clampInteger(
    source.totalVolumes ?? source.volumeCount,
    STORYHEAVEN_SERIAL_LIMITS.seriesVolumeCountMin,
    STORYHEAVEN_SERIAL_LIMITS.seriesVolumeCountMax,
    10
  );
  const episodesPerVolume = clampInteger(
    source.episodesPerVolume,
    STORYHEAVEN_SERIAL_LIMITS.episodesPerVolumeMin,
    STORYHEAVEN_SERIAL_LIMITS.episodesPerVolumeMax,
    25
  );
  return {
    totalVolumes,
    episodesPerVolume,
    totalMainEpisodes: totalVolumes * episodesPerVolume,
    prologueRequired: true,
    prologueEpisodeNo: 1,
    firstMainEpisodeNo: 2,
    firstMainEpisodeLabel: "본편 1화",
    planningRule: `프롤로그 1편 뒤에 본편 ${totalVolumes}권, 권당 ${episodesPerVolume}화, 총 본편 ${totalVolumes * episodesPerVolume}화를 버틸 장편 구조로 설계한다.`
  };
}

function safeArcScope(firstEpisodeNo, plan, architecture) {
  try {
    return buildStoryHeavenArcScope(firstEpisodeNo, plan, architecture);
  } catch (error) {
    if (error?.message === "serial_series_episode_out_of_range") {
      throw failure("serial_series_complete", 409);
    }
    throw error;
  }
}

function isCompleteSeriesArchitecture(architectureValue, planValue) {
  const architecture = architectureValue && typeof architectureValue === "object" && !Array.isArray(architectureValue)
    ? architectureValue
    : {};
  const plan = normalizeSeriesPlan(planValue);
  return Boolean(architecture.schemaVersion)
    && Number(architecture.plannedVolumeCount) === plan.totalVolumes
    && Number(architecture.plannedMainEpisodeCount) === plan.totalMainEpisodes
    && Array.isArray(architecture.volumePlan)
    && architecture.volumePlan.length === plan.totalVolumes
    && Array.isArray(architecture.renewableConflictSources)
    && architecture.renewableConflictSources.length >= 5
    && Array.isArray(architecture.longReveals)
    && architecture.longReveals.some((item) => Number(item?.payoffVolume) === plan.totalVolumes);
}

function normalizeContinuationBatchCount(value) {
  const count = Number(value ?? 1);
  return STORYHEAVEN_SERIAL_LIMITS.continuationBatchCounts.includes(count) ? count : 1;
}

function clampInteger(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isInteger(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function summarizeQueue(rows = [], timingRows = []) {
  const groups = new Map();
  for (const row of rows) {
    const id = row.QUEUE_GROUP_ID || row.ID;
    const requestedAt = timeValue(row.CREATED_AT);
    const startedAt = timeValue(row.STARTED_AT);
    const completedAt = timeValue(row.COMPLETED_AT);
    const group = groups.get(id) || {
      id,
      scheduleId: row.SCHEDULE_ID || null,
      storyId: null,
      title: "새 작품 기획",
      primaryGenres: [],
      subgenresByGenre: {},
      requestedAt: null,
      startedAt: null,
      completedAt: null,
      canceledAt: null,
      latestRunId: null,
      totalJobs: 0,
      completedJobs: 0,
      activeJobs: 0,
      runningJobs: 0,
      maxEpisodeNo: 0,
      targetEpisodeCount: Math.max(1, Number(row.TARGET_EPISODE_COUNT || STORYHEAVEN_CONTINUATION_POLICY.initialEpisodeCount)),
      stageTimings: [],
      stage: row.CURRENT_STAGE || "queued",
      failureCode: row.FAILURE_CODE || null,
      hasConcept: false,
      hasPlanning: false,
      hasError: false,
      hasBlocked: false
    };
    group.latestRunId ||= row.ID || null;
    group.storyId ||= row.STORY_ID || null;
    if (row.STORY_TITLE) group.title = row.STORY_TITLE;
    if (!group.primaryGenres.length) {
      group.primaryGenres = parseJson(row.PRIMARY_GENRES_JSON, [row.PRIMARY_GENRE].filter(Boolean));
      group.subgenresByGenre = parseJson(row.SUBGENRES_BY_GENRE_JSON, {});
    }
    group.requestedAt = earlierTime(group.requestedAt, requestedAt);
    group.startedAt = earlierTime(group.startedAt, startedAt);
    group.completedAt = laterTime(group.completedAt, completedAt);
    group.canceledAt = laterTime(group.canceledAt, timeValue(row.QUEUE_CANCELED_AT));
    group.totalJobs += Number(row.TOTAL_JOB_COUNT || 0);
    group.completedJobs += Number(row.COMPLETED_JOB_COUNT || 0);
    group.activeJobs += Number(row.ACTIVE_JOB_COUNT || 0);
    group.runningJobs += Number(row.RUNNING_JOB_COUNT || 0);
    group.maxEpisodeNo = Math.max(group.maxEpisodeNo, Number(row.EPISODE_NO || 0));
    if (Number(row.RUN_TARGET_EPISODE_COUNT) > 0) {
      group.targetEpisodeCount = Math.max(1, Number(row.RUN_TARGET_EPISODE_COUNT));
    }
    group.hasConcept ||= row.RUN_TYPE === "concept";
    group.hasPlanning ||= row.RUN_TYPE === "planning";
    group.hasError ||= row.RUN_STATUS === "error";
    group.hasBlocked ||= row.RUN_STATUS === "blocked" && !row.QUEUE_CANCELED_AT;
    if (row.FAILURE_CODE) group.failureCode = row.FAILURE_CODE;
    if (Number(row.ACTIVE_JOB_COUNT || 0) > 0) group.stage = row.CURRENT_STAGE || group.stage;
    groups.set(id, group);
  }

  for (const row of timingRows) {
    const group = groups.get(row.QUEUE_GROUP_ID || row.RUN_ID);
    if (!group) continue;
    const startedAt = timeValue(row.STARTED_AT);
    const completedAt = timeValue(row.COMPLETED_AT);
    group.stageTimings.push({
      runId: row.RUN_ID,
      episodeNo: row.EPISODE_NO === null || row.EPISODE_NO === undefined ? null : Number(row.EPISODE_NO),
      type: row.JOB_TYPE,
      status: row.JOB_STATUS,
      attemptCount: Number(row.ATTEMPT_COUNT || 0),
      startedAt: isoTime(startedAt),
      completedAt: isoTime(completedAt),
      durationSeconds: elapsedSeconds(startedAt, completedAt),
      createdAt: isoTime(timeValue(row.CREATED_AT))
    });
  }

  const all = [...groups.values()];
  const active = all
    .filter((group) => group.activeJobs > 0 && !group.canceledAt)
    .sort((left, right) => (left.requestedAt || 0) - (right.requestedAt || 0));
  const hasRunning = active.some((group) => group.runningJobs > 0);
  let waitingPosition = 0;
  const items = active.map((group) => {
    const running = group.runningJobs > 0;
    if (!running) waitingPosition += 1;
    return queueGroupView(group, {
      status: running ? "running" : "waiting",
      queuePosition: running ? 0 : waitingPosition,
      cancelable: !running,
      elapsedSeconds: elapsedSeconds(group.startedAt || group.requestedAt, Date.now())
    });
  });
  const completed = all
    .filter((group) => !group.canceledAt && !group.hasBlocked && group.activeJobs === 0 && group.totalJobs > 0 && group.completedJobs === group.totalJobs)
    .sort((left, right) => (right.completedAt || 0) - (left.completedAt || 0));
  const lastCompleted = completed[0]
    ? queueGroupView(completed[0], {
        status: "complete",
        queuePosition: null,
        cancelable: false,
        elapsedSeconds: elapsedSeconds(completed[0].startedAt || completed[0].requestedAt, completed[0].completedAt)
      })
    : null;
  const failed = all
    .filter((group) => !group.canceledAt && (group.hasError || group.hasBlocked))
    .sort((left, right) => (right.completedAt || right.requestedAt || 0) - (left.completedAt || left.requestedAt || 0));
  const latestHealthyTimeBySchedule = new Map();
  for (const group of [...active, ...completed]) {
    if (!group.scheduleId) continue;
    const time = group.completedAt || group.startedAt || group.requestedAt || 0;
    latestHealthyTimeBySchedule.set(
      group.scheduleId,
      Math.max(latestHealthyTimeBySchedule.get(group.scheduleId) || 0, time)
    );
  }
  const attentionGroups = [];
  const seenFailedSchedules = new Set();
  for (const group of failed) {
    const key = group.scheduleId || group.id;
    if (seenFailedSchedules.has(key)) continue;
    seenFailedSchedules.add(key);
    const failedAt = group.completedAt || group.requestedAt || 0;
    if (group.scheduleId && (latestHealthyTimeBySchedule.get(group.scheduleId) || 0) > failedAt) continue;
    attentionGroups.push(group);
  }
  const attention = attentionGroups.slice(0, 5).map((group) => queueGroupView(group, {
    status: "error",
    queuePosition: null,
    cancelable: false,
    elapsedSeconds: elapsedSeconds(group.startedAt || group.requestedAt, group.completedAt)
  }));
  const lastFailed = attentionGroups[0]
    ? queueGroupView(attentionGroups[0], {
        status: "error",
        queuePosition: null,
        cancelable: false,
        elapsedSeconds: elapsedSeconds(attentionGroups[0].startedAt || attentionGroups[0].requestedAt, attentionGroups[0].completedAt)
      })
    : null;
  const history = all
    .filter((group) => !group.canceledAt && group.totalJobs > 0)
    .sort((left, right) => (right.requestedAt || 0) - (left.requestedAt || 0))
    .slice(0, 30)
    .map((group) => {
      const status = group.canceledAt
        ? "canceled"
        : group.activeJobs > 0
          ? (group.runningJobs > 0 ? "running" : "waiting")
          : group.hasError
            ? "error"
            : group.hasBlocked
              ? "blocked"
              : group.completedJobs === group.totalJobs
                ? "complete"
                : "stopped";
      return queueGroupView(group, {
        status,
        queuePosition: null,
        cancelable: false,
        elapsedSeconds: elapsedSeconds(
          group.startedAt || group.requestedAt,
          group.completedAt || (group.activeJobs > 0 ? Date.now() : null)
        )
      });
    });
  const hiddenHistory = all
    .filter((group) => group.canceledAt && group.totalJobs > 0)
    .sort((left, right) => (right.canceledAt || right.requestedAt || 0) - (left.canceledAt || left.requestedAt || 0))
    .slice(0, 50)
    .map((group) => queueGroupView(group, {
      status: "hidden",
      queuePosition: null,
      cancelable: false,
      elapsedSeconds: elapsedSeconds(
        group.startedAt || group.requestedAt,
        group.completedAt || group.canceledAt || null
      )
    }));
  return {
    concurrency: 1,
    running: hasRunning,
    items,
    lastCompleted,
    lastFailed,
    attention,
    recentCompleted: completed.slice(0, 5).map((group) => queueGroupView(group, {
      status: "complete",
      queuePosition: null,
      cancelable: false,
      elapsedSeconds: elapsedSeconds(group.startedAt || group.requestedAt, group.completedAt)
    })),
    statusCounts: {
      running: items.filter((item) => item.status === "running").length,
      waiting: items.filter((item) => item.status === "waiting").length,
      complete: completed.length,
      attention: attention.length,
      hidden: hiddenHistory.length
    },
    history,
    hiddenHistory,
    updatedAt: new Date().toISOString(),
    quotaPercent: null,
    quotaNote: "구독 계정의 남은 사용량 비율은 서버에서 조회할 수 없어 표시하지 않습니다. 대신 실제 AI 작업 수와 소요 시간을 기록합니다."
  };
}

function queueGroupView(group, overrides) {
  const titlePending = group.hasConcept && (!group.title || group.title === "새 작품 기획");
  const view = {
    id: group.id,
    latestRunId: group.latestRunId,
    scheduleId: group.scheduleId,
    storyId: group.storyId,
    title: group.title,
    titlePending,
    workLabel: group.hasConcept
      ? `새 작품 · ${initialBatchLabel(group.targetEpisodeCount)}`
      : group.hasPlanning
        ? `${group.title} · 다음 화 준비`
        : `${group.title} · ${group.maxEpisodeNo || "다음"}화`,
    bootstrapPlan: group.hasPlanning && !group.hasConcept,
    initialBatch: group.hasConcept,
    primaryGenres: group.primaryGenres,
    subgenresByGenre: group.subgenresByGenre,
    episodeNo: group.maxEpisodeNo || null,
    targetEpisodeCount: group.targetEpisodeCount,
    stageTimings: group.stageTimings,
    stage: group.stage,
    requestedAt: isoTime(group.requestedAt),
    startedAt: isoTime(group.startedAt),
    completedAt: isoTime(group.completedAt),
    canceledAt: isoTime(group.canceledAt),
    totalJobs: group.totalJobs,
    completedJobs: group.completedJobs,
    failureCode: group.failureCode,
    attentionType: group.hasBlocked ? "quality_hold" : group.hasError ? "system_error" : null,
    retryable: group.hasError,
    ...overrides
  };
  view.progress = queueProgressView(group, view.status);
  return view;
}

function initialBatchLabel(value) {
  const count = Math.max(1, Number(value || STORYHEAVEN_CONTINUATION_POLICY.initialEpisodeCount));
  return count === 1 ? "프롤로그" : `프롤로그+본편 ${count - 1}화까지`;
}

function queueProgressView(group, status) {
  const initialBatch = group.hasConcept;
  const bootstrapPlan = group.hasPlanning && !group.hasConcept;
  const targetEpisodeCount = Math.max(1, Number(group.targetEpisodeCount || STORYHEAVEN_CONTINUATION_POLICY.initialEpisodeCount));
  const initialEpisodeSteps = Array.from({ length: targetEpisodeCount }, (_, index) => [
    `episode-${index + 1}-card`,
    `episode-${index + 1}-draft`,
    `episode-${index + 1}-review`
  ]).flat();
  const steps = initialBatch
    ? ["concept", "bible", "arc", ...initialEpisodeSteps, "publication"]
    : bootstrapPlan
      ? ["bible", "arc", "episode-card", "draft", "review", "publication"]
      : ["episode-card", "draft", "review", "publication"];
  const stage = String(group.stage || "queued");
  let currentIndex = 0;
  if (initialBatch) {
    if (stage === "build_bible") currentIndex = 1;
    else if (stage === "build_arc" || stage === "plan_complete") currentIndex = 2;
    else if (["build_episode_card", "write_draft", "editorial_review", "rewrite_draft", "editorial_blocked"].includes(stage)) {
      const episodeIndex = Math.min(targetEpisodeCount, Math.max(1, Number(group.maxEpisodeNo || 1))) - 1;
      const stageOffset = stage === "build_episode_card"
        ? 0
        : ["write_draft", "rewrite_draft"].includes(stage)
          ? 1
          : 2;
      currentIndex = 3 + (episodeIndex * 3) + stageOffset;
    } else if (["publication_ready", "published"].includes(stage)) currentIndex = steps.length - 1;
  } else if (bootstrapPlan) {
    if (stage === "build_arc" || stage === "plan_complete") currentIndex = 1;
    else if (stage === "build_episode_card") currentIndex = 2;
    else if (["write_draft", "rewrite_draft"].includes(stage)) currentIndex = 3;
    else if (["editorial_review", "editorial_blocked"].includes(stage)) currentIndex = 4;
    else if (["publication_ready", "published"].includes(stage)) currentIndex = 5;
  } else {
    if (["write_draft", "rewrite_draft"].includes(stage)) currentIndex = 1;
    else if (["editorial_review", "editorial_blocked"].includes(stage)) currentIndex = 2;
    else if (["publication_ready", "published"].includes(stage)) currentIndex = 3;
  }
  const percent = status === "complete"
    ? 100
    : Math.min(99, Math.round(((currentIndex + (status === "running" ? 0.5 : 0)) / steps.length) * 100));
  return {
    stage,
    completedSteps: currentIndex,
    totalSteps: steps.length,
    percent
  };
}

function timeValue(value) {
  if (!value) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : null;
  }
  const time = new Date(normalizeDbTimeString(value)).getTime();
  return Number.isFinite(time) ? time : null;
}

function normalizeDbTimeString(value) {
  let text = String(value || "").trim();
  if (!text) return "";
  text = text.replace(/\s+\([^()]*\)\s*$/u, "");
  if (/^\d{4}-\d{2}-\d{2}\s/u.test(text)) text = text.replace(" ", "T");
  if (OFFSETLESS_TIME_RE.test(text) && !OFFSET_TIME_RE.test(text)) {
    if (/^\d{4}-\d{2}-\d{2}$/u.test(text)) text = `${text}T00:00:00`;
    return `${text}${SEOUL_OFFSET}`;
  }
  return text;
}

function earlierTime(current, candidate) {
  if (!candidate) return current;
  return current ? Math.min(current, candidate) : candidate;
}

function laterTime(current, candidate) {
  if (!candidate) return current;
  return current ? Math.max(current, candidate) : candidate;
}

function elapsedSeconds(start, end) {
  if (!start || !end) return null;
  return Math.max(0, Math.round((end - start) / 1_000));
}

function isoTime(value) {
  const time = timeValue(value);
  return time === null ? null : new Date(time).toISOString();
}

function mapManagedStory(row) {
  const schedulePolicy = parseJson(row.CONCEPT_POLICY_JSON, {});
  const scheduleSeriesPlan = row.SCHEDULE_ID ? normalizeSeriesPlan(schedulePolicy.seriesPlan) : null;
  const architectureVolumeCount = Number(row.ARCHITECTURE_VOLUME_COUNT || 0);
  const architectureEpisodeCount = Number(row.ARCHITECTURE_EPISODE_COUNT || 0);
  const architectureConflictCount = Number(row.ARCHITECTURE_CONFLICT_COUNT || 0);
  const architectureRevealCount = Number(row.ARCHITECTURE_REVEAL_COUNT || 0);
  const architectureLateRevealCount = Number(row.ARCHITECTURE_LATE_REVEAL_COUNT || 0);
  const architectureComplete = Boolean(row.ARCHITECTURE_VERSION)
    && architectureVolumeCount > 0
    && architectureEpisodeCount > 0
    && architectureConflictCount >= 5
    && architectureRevealCount >= 2
    && (architectureVolumeCount === 1 || architectureLateRevealCount >= 1)
    && (!scheduleSeriesPlan
      || (architectureVolumeCount === scheduleSeriesPlan.totalVolumes
        && architectureEpisodeCount === scheduleSeriesPlan.totalMainEpisodes));
  return {
    id: row.ID,
    title: row.TITLE,
    logline: row.LOGLINE || "",
    genres: parseJson(row.GENRES_JSON, []),
    storyStatus: row.STORY_STATUS,
    visibility: row.VISIBILITY,
    continuationMode: row.CONTINUATION_MODE,
    operatorNote: row.OPERATOR_NOTE || "",
    viewCount: Number(row.VIEW_COUNT || 0),
    episodeCount: Number(row.EPISODE_COUNT || 0),
    publishedEpisodeCount: Number(row.PUBLISHED_EPISODE_COUNT || 0),
    latestEpisodeNo: row.LATEST_EPISODE_NO === null ? null : Number(row.LATEST_EPISODE_NO),
    latestEpisodeTitle: row.LATEST_EPISODE_TITLE || "",
    latestEpisodeAt: isoTime(row.LATEST_EPISODE_AT),
    recommendationCount: Number(row.RECOMMENDATION_COUNT || 0),
    activeRunCount: Number(row.ACTIVE_RUN_COUNT || 0),
    latestRunStatus: row.LATEST_RUN_STATUS || null,
    readyPublicationCount: Number(row.READY_PUBLICATION_COUNT || 0),
    architecture: {
      status: architectureComplete ? "complete" : "needs_strengthening",
      schemaVersion: row.ARCHITECTURE_VERSION || null,
      plannedVolumeCount: architectureVolumeCount,
      plannedMainEpisodeCount: architectureEpisodeCount,
      renewableConflictCount: architectureConflictCount,
      longRevealCount: architectureRevealCount,
      lateRevealCount: architectureLateRevealCount
    },
    schedule: row.SCHEDULE_ID ? {
      id: row.SCHEDULE_ID,
      name: row.SCHEDULE_NAME || "",
      status: row.SCHEDULE_STATUS || "archived",
      publicationMode: row.PUBLICATION_MODE || "test_private",
      seriesPlan: scheduleSeriesPlan,
      continuationBatchCount: normalizeContinuationBatchCount(schedulePolicy.continuationBatchCount)
    } : null,
    publishedAt: isoTime(row.PUBLISHED_AT),
    createdAt: isoTime(row.CREATED_AT),
    updatedAt: isoTime(row.UPDATED_AT),
    controlUpdatedAt: isoTime(row.CONTROL_UPDATED_AT)
  };
}

async function listStalledFirstEpisodeStories(connection) {
  const result = await connection.execute(
    `select * from (
       select story.id, story.title, story.logline, story.genres_json,
              story.story_status, story.created_at, story.updated_at,
              latest.id as latest_run_id,
              latest.queue_group_id as latest_queue_group_id,
              latest.schedule_id,
              latest.run_status as latest_run_status,
              latest.current_stage as latest_stage,
              latest.rewrite_count,
              latest.failure_code as latest_failure_code,
              latest.completed_at as latest_completed_at,
              latest.created_at as latest_run_created_at,
              schedule.schedule_name, schedule.schedule_status, schedule.publication_mode,
              control.visibility,
              draft.id as latest_draft_id, draft.title as latest_draft_title,
              dbms_lob.getlength(draft.body_text) as latest_draft_characters,
              review.decision as latest_review_decision,
              review.safety_passed as latest_review_safety_passed,
              review.summary_text as latest_review_summary,
              review.scores_json as latest_review_scores_json,
              review.issues_json as latest_review_issues_json,
              publication.queue_status as publication_status,
              publication.release_at as publication_release_at
         from storyheaven_stories story
         left join (
           select * from (
             select serial_run.id, serial_run.queue_group_id, serial_run.story_id,
                    serial_run.schedule_id, serial_run.run_status, serial_run.current_stage,
                    serial_run.rewrite_count, serial_run.failure_code,
                    serial_run.queue_canceled_at, serial_run.completed_at, serial_run.created_at,
                    row_number() over (partition by serial_run.story_id order by serial_run.created_at desc) as rank_no
               from storyheaven_serial_runs serial_run
              where serial_run.story_id is not null
           ) where rank_no = 1
         ) latest on latest.story_id = story.id
         left join storyheaven_serial_schedules schedule on schedule.id = latest.schedule_id
         left join storyheaven_serial_story_controls control on control.story_id = story.id
         left join storyheaven_serial_drafts draft on draft.id = (
           select max(serial_draft.id) keep (dense_rank last order by serial_draft.version_no)
             from storyheaven_serial_drafts serial_draft
            where serial_draft.run_id = latest.id
         )
         left join storyheaven_editorial_reviews review on review.id = (
           select max(editorial_review.id) keep (dense_rank last order by editorial_review.review_version)
             from storyheaven_editorial_reviews editorial_review
            where editorial_review.run_id = latest.id
         )
         left join storyheaven_publication_queue publication on publication.run_id = latest.id
        where story.author_user_id = :author_user_id
          and story.content_origin = 'admin_seed'
          and story.story_status <> 'archived'
          and latest.queue_canceled_at is null
          and not exists (
            select 1 from storyheaven_episodes episode where episode.story_id = story.id
          )
          and not exists (
            select 1
              from storyheaven_serial_runs active_run
              join storyheaven_serial_jobs active_job on active_job.run_id = active_run.id
             where active_run.story_id = story.id
               and active_run.queue_canceled_at is null
               and active_job.job_status in ('queued', 'running', 'retry_wait')
          )
        order by nvl(latest.completed_at, latest.created_at) desc, story.updated_at desc
     ) where rownum <= 12`,
    { author_user_id: SYSTEM_AUTHOR_ID }
  );
  return result.rows.map(mapStalledFirstEpisodeStory);
}

function mapStalledFirstEpisodeStory(row) {
  return {
    id: row.ID,
    title: row.TITLE,
    logline: row.LOGLINE || "",
    genres: parseJson(row.GENRES_JSON, []),
    status: row.STORY_STATUS,
    latestRunId: row.LATEST_RUN_ID || null,
    queueGroupId: row.LATEST_QUEUE_GROUP_ID || null,
    schedule: row.SCHEDULE_ID ? {
      id: row.SCHEDULE_ID,
      name: row.SCHEDULE_NAME || "",
      status: row.SCHEDULE_STATUS || "archived",
      publicationMode: row.PUBLICATION_MODE || "test_private"
    } : null,
    visibility: row.VISIBILITY || null,
    latestRunStatus: row.LATEST_RUN_STATUS || null,
    latestStage: row.LATEST_STAGE || null,
    rewriteCount: Number(row.REWRITE_COUNT || 0),
    latestFailureCode: row.LATEST_FAILURE_CODE || null,
    draft: row.LATEST_DRAFT_ID ? {
      id: row.LATEST_DRAFT_ID,
      title: row.LATEST_DRAFT_TITLE || "",
      characterCount: Number(row.LATEST_DRAFT_CHARACTERS || 0)
    } : null,
    review: row.LATEST_REVIEW_DECISION ? {
      decision: row.LATEST_REVIEW_DECISION,
      safetyPassed: row.LATEST_REVIEW_SAFETY_PASSED === "Y",
      summary: row.LATEST_REVIEW_SUMMARY || "",
      scores: parseJson(row.LATEST_REVIEW_SCORES_JSON, {}),
      issues: parseJson(row.LATEST_REVIEW_ISSUES_JSON, [])
    } : null,
    publication: row.PUBLICATION_STATUS ? {
      status: row.PUBLICATION_STATUS,
      releaseAt: isoTime(row.PUBLICATION_RELEASE_AT)
    } : null,
    latestCompletedAt: isoTime(row.LATEST_COMPLETED_AT),
    latestRunCreatedAt: isoTime(row.LATEST_RUN_CREATED_AT),
    createdAt: isoTime(row.CREATED_AT),
    updatedAt: isoTime(row.UPDATED_AT)
  };
}

function publicStory(row) {
  return {
    id: row.ID,
    title: row.TITLE,
    logline: row.LOGLINE,
    synopsis: String(row.PUBLIC_SYNOPSIS || ""),
    genres: parseJson(row.GENRES_JSON, [row.GENRE].filter(Boolean)),
    tags: parseJson(row.TAGS_JSON, []),
    rating: row.CONTENT_RATING === "all" ? "all" : "teen"
  };
}

function mapBible(row) {
  return {
    storyId: row.STORY_ID,
    version: Number(row.BIBLE_VERSION || 1),
    status: row.BIBLE_STATUS,
    concept: parseJson(row.CONCEPT_JSON, {}),
    worldRules: parseJson(row.WORLD_RULES_JSON, []),
    characters: parseJson(row.CHARACTERS_JSON, []),
    timeline: parseJson(row.TIMELINE_JSON, []),
    glossary: parseJson(row.GLOSSARY_JSON, []),
    forbiddenContradictions: parseJson(row.FORBIDDEN_JSON, []),
    voiceProfile: parseJson(row.VOICE_PROFILE_JSON, {}),
    narrativeBlueprint: parseJson(row.NARRATIVE_BLUEPRINT_JSON, {})
  };
}

function mapArc(row) {
  return {
    id: row.ID,
    storyId: row.STORY_ID,
    arcNo: Number(row.ARC_NO),
    version: Number(row.ARC_VERSION),
    status: row.ARC_STATUS,
    title: row.ARC_TITLE,
    centralQuestion: row.CENTRAL_QUESTION,
    midpointReversal: row.MIDPOINT_REVERSAL,
    endingTruth: row.ENDING_TRUTH,
    episodePlan: parseJson(row.EPISODE_PLAN_JSON, []),
    narrativePlan: parseJson(row.NARRATIVE_PLAN_JSON, {})
  };
}

function mapReveal(row) {
  return {
    key: row.REVEAL_KEY,
    secret: row.SECRET_TEXT,
    introduceEpisode: Number(row.INTRODUCE_EPISODE_NO),
    payoffEpisode: Number(row.PAYOFF_EPISODE_NO),
    status: row.REVEAL_STATUS
  };
}

function mapCard(row) {
  const techniquePlan = parseJson(row.TECHNIQUE_PLAN_JSON, {});
  return {
    id: row.ID,
    episodeNo: Number(row.EPISODE_NO),
    promise: row.EPISODE_PROMISE,
    openingDisturbance: row.OPENING_DISTURBANCE,
    scenes: parseJson(row.SCENES_JSON, []),
    payoff: row.PAYOFF,
    hook: row.HOOK,
    knowledgeBefore: parseJson(row.KNOWLEDGE_JSON, []),
    canonReferences: parseJson(row.CANON_REFS_JSON, []),
    techniquePlan,
    prologueDisclosurePlan: techniquePlan.prologueDisclosurePlan || {
      mustShow: [], mayHintRevealKeys: [], mustNotAnswerRevealKeys: [], resolvedNow: [], openQuestions: []
    }
  };
}

function mapRun(row) {
  const startedAt = isoTime(row.STARTED_AT);
  const completedAt = isoTime(row.COMPLETED_AT);
  return {
    id: row.ID,
    queueGroupId: row.QUEUE_GROUP_ID || row.ID,
    scheduleId: row.SCHEDULE_ID,
    storyId: row.STORY_ID,
    arcId: row.ARC_ID,
    episodeNo: row.EPISODE_NO === null ? null : Number(row.EPISODE_NO),
    type: row.RUN_TYPE,
    status: row.RUN_STATUS,
    stage: row.CURRENT_STAGE,
    rewriteCount: Number(row.REWRITE_COUNT || 0),
    releaseAt: isoTime(row.RELEASE_AT),
    failureCode: row.FAILURE_CODE,
    startedAt,
    completedAt,
    durationSeconds: elapsedSeconds(timeValue(startedAt), timeValue(completedAt)),
    canceledAt: isoTime(row.QUEUE_CANCELED_AT),
    quality: parseJson(row.QUALITY_JSON, null),
    createdAt: isoTime(row.CREATED_AT),
    updatedAt: isoTime(row.UPDATED_AT)
  };
}

function mapPublication(row) {
  return {
    id: row.ID,
    runId: row.RUN_ID,
    episodeNo: Number(row.EPISODE_NO),
    status: row.QUEUE_STATUS,
    releaseAt: isoTime(row.RELEASE_AT),
    episodeId: row.PUBLISHED_EPISODE_ID,
    failureCode: row.FAILURE_CODE
  };
}

function mapContinuation(row) {
  return {
    id: row.ID,
    storyId: row.STORY_ID,
    sourceEpisodeNo: Number(row.SOURCE_EPISODE_NO),
    targetEpisodeNo: Number(row.TARGET_EPISODE_NO),
    triggerType: row.TRIGGER_TYPE,
    recommendationCount: Number(row.RECOMMENDATION_COUNT || 0),
    status: row.REQUEST_STATUS,
    runId: row.RUN_ID || null,
    failureCode: row.FAILURE_CODE || null,
    createdAt: isoTime(row.CREATED_AT),
    updatedAt: isoTime(row.UPDATED_AT)
  };
}

async function selectOne(connection, sql, binds = {}) {
  const result = await connection.execute(sql, binds);
  return result.rows[0] || null;
}

function parseJson(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  try { return typeof value === "string" ? JSON.parse(value) : value; } catch { return fallback; }
}

function cleanText(value, max) {
  return [...String(value ?? "").normalize("NFC").replace(/[\u0000-\u001F\u007F]/gu, " ").replace(/\s+/gu, " ").trim()].slice(0, max).join("");
}

function cleanCode(value) {
  return cleanText(value || "serial_worker_failed", 100).toLowerCase().replace(/[^a-z0-9_-]+/gu, "_") || "serial_worker_failed";
}

function requireId(value, code) {
  const id = String(value || "").trim();
  if (!/^[a-zA-Z0-9-]{3,36}$/u.test(id)) throw failure(code, 400);
  return id;
}

function managedStoryDateRange(input = {}) {
  const createdFrom = managedStoryDate(input.createdFrom, "createdFrom");
  const createdTo = managedStoryDate(input.createdTo, "createdTo");
  if (createdFrom && createdTo && createdFrom > createdTo) {
    throw failure("serial_story_date_range_invalid", 400, [{ field: "createdTo", code: "serial_story_date_range_invalid" }]);
  }
  return { createdFrom, createdTo };
}

function managedStoryDate(value, field) {
  const text = String(value || "").trim();
  if (!text) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(text);
  if (!match) throw failure("serial_story_date_filter_invalid", 400, [{ field, code: "serial_story_date_filter_invalid" }]);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw failure("serial_story_date_filter_invalid", 400, [{ field, code: "serial_story_date_filter_invalid" }]);
  }
  return text;
}

function dateOrNull(value, code = "invalid_date") {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(normalizeDbTimeString(value));
  if (Number.isNaN(date.getTime())) throw failure(code, 400);
  return date;
}

function makeSlug(title) {
  const base = String(title || "story")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .toLowerCase()
    .slice(0, 36) || "story";
  return `${base}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
}

function randomId() {
  return crypto.randomUUID();
}

function sha256(value) {
  const source = typeof value === "string" ? value : JSON.stringify(value);
  return crypto.createHash("sha256").update(source).digest("hex");
}

function failure(message, status = 400, details = undefined) {
  const error = new Error(message);
  error.status = status;
  if (details) error.details = details;
  return error;
}
