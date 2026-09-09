import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import oracledb from "oracledb";
import { STORYHEAVEN_DEFAULT_CONCEPT_POLICY } from "../src/serial-engine.mjs";
import { createStoryHeavenSerialService } from "../src/serial-service.mjs";

await loadDotEnv(path.resolve(process.cwd(), ".env"));

const execute = process.argv.includes("--execute");
const report = process.argv.includes("--report");
const resumeBlocked = process.argv.includes("--resume-blocked");
const repairCard = process.argv.includes("--repair-card");
const pauseSchedule = process.argv.includes("--pause-schedule");
const exportDrafts = process.argv.includes("--export");
const compact = process.argv.includes("--compact");
const retryError = process.argv.includes("--retry-error");
const publishDraft = process.argv.includes("--publish");
const rewritePublished = process.argv.includes("--rewrite-published");
const slot = Math.max(1, Math.min(9, Number(argumentValue("--slot=") || 1)));
const requestedGenrePreset = argumentValue("--genre=") || "curated-long-fantasy-random";
const stateDir = path.resolve(process.env.STORYHEAVEN_REVIEW_STATE_DIR || "./runtime");
const statePath = path.join(stateDir, slot === 1 ? "v3-private-pilot.json" : `v3-private-pilot-${slot}.json`);
const previous = await readJson(statePath);
if (previous?.scheduleId && previous?.runId && !report && !resumeBlocked && !repairCard && !pauseSchedule && !exportDrafts && !retryError && !publishDraft && !rewritePublished) {
  console.log(JSON.stringify({ reused: true, ...previous }, null, 2));
  process.exit(0);
}

const episodeCount = Number(argumentValue("--episodes=") || 3);
if (![1, 3].includes(episodeCount)) throw new Error("pilot_episode_count_invalid");
const request = {
  genrePresetId: requestedGenrePreset,
  proseStyleId: argumentValue("--style=") || "light-witty-v1",
  narrativeDirectionId: argumentValue("--direction=") || undefined,
  publicationMode: "test_private",
  openingPilotMode: episodeCount === 1 ? "single_episode" : "three_episode_incubation",
  openingPilotApprovalMode: "system_auto",
  cadenceMinutes: 10_080,
  targetEpisodeCount: episodeCount,
  totalVolumes: 10,
  episodesPerVolume: 25,
  continuationBatchCount: 1,
  creativeControls: {
    preset: "balanced",
    pace: 3,
    suspense: 3,
    curiosity: 4,
    surprise: 3,
    emotion: 3,
    romance: 2,
    action: 3,
    description: 3,
    humor: Number(argumentValue("--humor=") || 2),
    novelty: 2
  },
  targetAge: "teen",
  status: "active",
  conceptPolicy: STORYHEAVEN_DEFAULT_CONCEPT_POLICY
};

if (!execute && !report && !resumeBlocked && !repairCard && !pauseSchedule && !exportDrafts && !retryError && !publishDraft && !rewritePublished) {
  console.log(JSON.stringify({ dryRun: true, statePath, request }, null, 2));
  process.exit(0);
}

oracledb.fetchAsString = [oracledb.CLOB, oracledb.DATE];
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
const pool = await oracledb.createPool({
  user: requiredEnv("ORACLE_USER"),
  password: requiredEnv("ORACLE_PASSWORD"),
  connectString: requiredEnv("ORACLE_CONNECT_STRING"),
  poolMin: 1,
  poolMax: 2,
  poolIncrement: 1
});

async function withConnection(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.execute("alter session set time_zone = '+09:00'");
    await connection.execute(`alter session set nls_date_format = 'YYYY-MM-DD"T"HH24:MI:SS'`);
    await connection.execute(`alter session set nls_timestamp_format = 'YYYY-MM-DD"T"HH24:MI:SS.FF3'`);
    await connection.execute(`alter session set nls_timestamp_tz_format = 'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'`);
    return await callback(connection);
  } finally {
    await connection.close();
  }
}

async function withTransaction(callback) {
  return withConnection(async (connection) => {
    try {
      const value = await callback(connection);
      await connection.commit();
      return value;
    } catch (error) {
      await connection.rollback().catch(() => {});
      throw error;
    }
  });
}

const service = createStoryHeavenSerialService({
  withConnection,
  withTransaction,
  clob: (value) => ({ val: String(value ?? ""), type: oracledb.CLOB }),
  clobJson: (value) => ({ val: JSON.stringify(value ?? null), type: oracledb.CLOB })
});

try {
  if (rewritePublished) {
    if (!previous?.queueGroupId) throw new Error("v3_pilot_state_missing");
    const operatorId = await latestOperatorId();
    let replacedRepair = null;
    if (previous.publishedRepairQueueGroupId) {
      try {
        replacedRepair = await service.cancelQueueGroup(previous.publishedRepairQueueGroupId, operatorId);
      } catch (error) {
        if (!new Set(["serial_queue_not_cancelable", "serial_queue_not_found"]).has(error?.message)) throw error;
      }
    }
    const storyId = await withConnection(async (connection) => {
      const result = await connection.execute(
        `select max(story_id) keep (dense_rank last order by created_at) as story_id
           from storyheaven_serial_runs where queue_group_id = :queue_group_id`,
        { queue_group_id: previous.queueGroupId });
      return result.rows[0]?.STORY_ID || "";
    });
    if (!storyId) throw new Error("v3_pilot_story_missing");
    const run = await service.rewriteEpisode(storyId, 1, operatorId, {
      notes: "최종 검수에 남은 치명적 장면 동선 문제를 해결한다. 세드릭이 외문 감시를 맡고 로안이 브람과 창고로 이동하는 순서, 협곡 확인 담당자와 감시 공백이 없다는 사실을 명시한다. 이미 승인된 사건·인물·유머·설정은 보존한다."
    });
    const state = { ...previous, publishedRepairRunId: run.id, publishedRepairQueueGroupId: run.queueGroupId };
    await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ rewritePublished: true, replacedRepair, storyId, run }));
  } else if (publishDraft) {
    if (!previous?.scheduleId || !previous?.queueGroupId) throw new Error("v3_pilot_state_missing");
    const operatorId = await latestOperatorId();
    const target = await withConnection(async (connection) => {
      const result = await connection.execute(
        `select id, story_id, schedule_id from storyheaven_serial_runs
          where ((:repair_run_id is not null and id = :repair_run_id)
             or (:repair_run_id is null and queue_group_id = :queue_group_id))
            and run_type = 'episode' and run_status = 'ready'
          order by episode_no fetch first 1 row only`,
        { queue_group_id: previous.queueGroupId, repair_run_id: previous.publishedRepairRunId || null });
      return result.rows[0] || null;
    });
    if (!target) throw new Error("v3_pilot_ready_run_missing");
    if (target.SCHEDULE_ID) {
      await withTransaction((connection) => connection.execute(
        `update storyheaven_serial_schedules
            set schedule_status = 'active', publication_mode = 'auto_public', updated_at = systimestamp
          where id = :schedule_id and schedule_status <> 'archived'`,
        { schedule_id: target.SCHEDULE_ID }
      ));
    }
    let published = [];
    try {
      published = await service.publishReady(1, target.ID);
      if (published.length !== 1 || published[0].storyId !== target.STORY_ID) {
        throw new Error("v3_pilot_target_publish_failed");
      }
      await service.updateStoryControl(target.STORY_ID, {
        visibility: "public",
        continuationMode: "manual",
        operatorNote: "신규 원고 시험 후 검수 보완을 통과해 운영자가 공개했습니다."
      }, operatorId);
    } finally {
      await withTransaction((connection) => connection.execute(
        `update storyheaven_serial_schedules
            set schedule_status = 'paused', publication_mode = 'test_private',
                next_run_at = null, updated_at = systimestamp
          where id = :schedule_id`,
        { schedule_id: previous.scheduleId }
      ));
    }
    const managed = (await service.listManagedStories()).find((item) => item.id === target.STORY_ID);
    console.log(JSON.stringify({ published: true, item: published[0], story: managed }));
  } else if (pauseSchedule) {
    if (!previous?.scheduleId) throw new Error("v3_pilot_state_missing");
    const result = await withTransaction(async (connection) => {
      const schedule = await connection.execute(
        `select schedule_status, publication_mode
           from storyheaven_serial_schedules
          where id = :schedule_id for update`,
        { schedule_id: previous.scheduleId }
      );
      const row = schedule.rows[0] || null;
      if (!row) throw new Error("v3_pilot_schedule_missing");
      if (row.PUBLICATION_MODE !== "test_private") throw new Error("v3_pilot_schedule_not_private");
      await connection.execute(
        `update storyheaven_serial_schedules
            set schedule_status = 'paused', next_run_at = null, updated_at = systimestamp
          where id = :schedule_id`,
        { schedule_id: previous.scheduleId }
      );
      return {
        scheduleId: previous.scheduleId,
        previousStatus: row.SCHEDULE_STATUS,
        status: "paused",
        publicationMode: row.PUBLICATION_MODE
      };
    });
    console.log(JSON.stringify({ paused: true, ...result }, null, 2));
  } else if (retryError) {
    if (!previous?.queueGroupId) throw new Error("v3_pilot_state_missing");
    console.log(JSON.stringify(await service.retryQueueGroup(previous.publishedRepairQueueGroupId || previous.queueGroupId)));
  } else if (report || exportDrafts) {
    if (!previous?.queueGroupId) throw new Error("v3_pilot_state_missing");
    const runRows = await withConnection(async (connection) => {
      const result = await connection.execute(
        `select id
           from storyheaven_serial_runs
          where queue_group_id = :queue_group_id
             or (:repair_run_id is not null and id = :repair_run_id)
          order by created_at`,
        { queue_group_id: previous.queueGroupId, repair_run_id: previous.publishedRepairRunId || null }
      );
      return result.rows;
    });
    const reports = [];
    for (const row of runRows) reports.push(await service.getRun(row.ID));
    const story = await withConnection(async (connection) => {
      const result = await connection.execute(
        `select id, title, public_synopsis
           from storyheaven_stories
          where id = (
            select max(story_id) keep (dense_rank last order by created_at)
              from storyheaven_serial_runs
             where queue_group_id = :queue_group_id
               and story_id is not null
          )`,
        { queue_group_id: previous.queueGroupId }
      );
      return result.rows[0] || null;
    });
    const managedStory = story
      ? (await service.listManagedStories()).find((item) => item.id === story.ID) || null
      : null;
    const result = {
      checkedAt: new Date().toISOString(),
      scheduleId: previous.scheduleId,
      queueGroupId: previous.queueGroupId,
      story: story ? { id: story.ID, title: story.TITLE, synopsis: story.PUBLIC_SYNOPSIS } : null,
      narrativeDirection: previous.narrativeDirection || null,
      operation: managedStory ? {
        storyStatus: managedStory.storyStatus,
        visibility: managedStory.visibility,
        publishedEpisodeCount: managedStory.publishedEpisodeCount,
        readyPublicationCount: managedStory.readyPublicationCount,
        schedule: managedStory.schedule,
        openingPilot: managedStory.openingPilot
      } : null,
      voiceAudition: reports.find((item) => item.voiceAudition)?.voiceAudition || null,
      runs: reports.map(summarizeRun),
      totals: summarizeTotals(reports)
    };
    if (exportDrafts) {
      const latestReportByEpisode = new Map();
      for (const item of reports.filter((entry) => entry.drafts.length)) {
        latestReportByEpisode.set(Number(item.run.episodeNo), item);
      }
      const manuscripts = [...latestReportByEpisode.values()]
        .sort((left, right) => Number(left.run.episodeNo) - Number(right.run.episodeNo))
        .map((item) => {
          const latestReview = item.reviews.at(-1);
          const approved = ["ready", "published"].includes(item.run.status) && latestReview?.decision === "approved";
          const draft = approved ? item.drafts.find((entry) => entry.id === latestReview.draftId) : item.drafts.at(-1);
          if (!draft) throw new Error("pilot_approved_draft_missing");
          return {
            runId: item.run.id,
            episodeNo: item.run.episodeNo,
            status: item.run.status,
            draft,
            review: item.reviews.filter((entry) => entry.draftId === draft.id).at(-1) || null,
            toneAssessment: item.run.quality?.editorial?.toneAssessment || null
          };
        });
      if (!manuscripts.length) throw new Error("pilot_manuscript_not_ready");
      const exportPath = path.join(stateDir, `v3-private-pilot-${slot}-export.json`);
      await writeFile(exportPath, `${JSON.stringify({ ...result, manuscripts }, null, 2)}\n`, "utf8");
      console.log(JSON.stringify({ exportPath, manuscriptCount: manuscripts.length, title: story?.TITLE }));
    } else if (compact) {
      console.log(JSON.stringify({
        slot, title: result.story?.title, direction: result.narrativeDirection?.label,
        scheduleStatus: result.operation?.schedule?.status,
        runs: result.runs.map((run) => ({
          id: run.id, episodeNo: run.episodeNo, status: run.status, stage: run.stage,
          draftCharacters: run.draftCharacters, rewriteCount: run.rewriteCount,
          failureCode: run.failureCode,
          score: run.review?.readerExperienceScore,
          jobs: run.jobs.slice(-3)
        })), totals: result.totals
      }));
    } else console.log(JSON.stringify(result, null, 2));
  } else if (resumeBlocked || repairCard) {
    if (!previous?.queueGroupId) throw new Error("v3_pilot_state_missing");
    const operatorId = await latestOperatorId();
    const targetQueueGroupId = previous.publishedRepairQueueGroupId || previous.queueGroupId;
    const blockedRunId = await withConnection(async (connection) => {
      const result = await connection.execute(
        `select id
           from storyheaven_serial_runs
          where queue_group_id = :queue_group_id
            and run_status = 'blocked'
            and current_stage = 'editorial_blocked'
          order by episode_no, created_at fetch first 1 row only`,
        { queue_group_id: targetQueueGroupId }
      );
      return result.rows[0]?.ID || "";
    });
    if (!blockedRunId) throw new Error("v3_pilot_blocked_run_missing");
    const action = repairCard ? "repair_card" : "rewrite";
    const result = await service.resolveQualityHold(blockedRunId, operatorId, { action });
    console.log(JSON.stringify({ resumed: true, action, runId: blockedRunId, result }, null, 2));
  } else {
    const operatorId = await latestOperatorId();
    const schedule = await service.saveSchedule(request, operatorId);
    const run = await service.runSchedule(schedule.id, operatorId);
    const state = {
      createdAt: new Date().toISOString(),
      scheduleId: schedule.id,
      runId: run.id,
      queueGroupId: run.queueGroupId,
      genrePreset: schedule.genrePreset,
      proseStyle: schedule.proseStyle,
      narrativeDirection: schedule.narrativeDirection,
      targetEpisodeCount: schedule.targetEpisodeCount,
      publicationMode: schedule.publicationMode,
      cadenceMinutes: schedule.cadenceMinutes
    };
    await mkdir(stateDir, { recursive: true });
    await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({ reused: false, ...state }, null, 2));
  }
} finally {
  await pool.close(10);
}

async function latestOperatorId() {
  const operatorId = await withConnection(async (connection) => {
    const result = await connection.execute(
      `select created_by
         from storyheaven_serial_schedules
        where created_by is not null
        order by created_at desc fetch first 1 row only`
    );
    return result.rows[0]?.CREATED_BY || "";
  });
  if (!operatorId) throw new Error("v3_pilot_operator_missing");
  return operatorId;
}

function summarizeRun(report) {
  const latestReview = report.reviews.at(-1) || null;
  const latestDraft = report.drafts.at(-1) || null;
  return {
    id: report.run.id,
    episodeNo: report.run.episodeNo,
    status: report.run.status,
    stage: report.run.stage,
    rewriteCount: report.run.rewriteCount,
    failureCode: report.run.failureCode,
    durationSeconds: report.run.durationSeconds,
    draftCharacters: Number(latestDraft?.qa?.characterCount || 0),
    review: latestReview ? {
      decision: latestReview.decision,
      scores: latestReview.scores,
      summary: latestReview.summary,
      issues: latestReview.issues,
      wouldReadNext: report.run.quality?.editorial?.comparativeVerdict?.wouldReadNext ?? null,
      wouldReadNextReason: report.run.quality?.editorial?.comparativeVerdict?.wouldReadNextReason ?? "",
      rewritePriority: report.run.quality?.editorial?.comparativeVerdict?.rewritePriority ?? "",
      readerExperienceScore: report.run.quality?.decision?.readerExperienceScore ?? null,
      styleAssessment: report.run.quality?.editorial?.styleAssessment ?? null
    } : null,
    jobs: report.jobs.map((job) => ({
      type: job.type,
      criticRole: job.criticRole,
      status: job.status,
      errorCode: job.errorCode,
      attempts: job.attemptCount,
      model: job.model,
      durationSeconds: job.durationSeconds,
      inputTokens: Number(job.usage?.inputTokens || 0),
      outputTokens: Number(job.usage?.outputTokens || 0)
    }))
  };
}

function summarizeTotals(reports) {
  const jobs = reports.flatMap((item) => item.jobs);
  return {
    runCount: reports.length,
    completedJobs: jobs.filter((job) => job.status === "complete").length,
    errorJobs: jobs.filter((job) => job.status === "error").length,
    retriedJobs: jobs.filter((job) => Number(job.attemptCount || 0) > 1).length,
    inputTokens: jobs.reduce((sum, job) => sum + Number(job.usage?.inputTokens || 0), 0),
    outputTokens: jobs.reduce((sum, job) => sum + Number(job.usage?.outputTokens || 0), 0),
    aiDurationSeconds: jobs.reduce((sum, job) => sum + Number(job.durationSeconds || 0), 0)
  };
}

async function readJson(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    return null;
  }
}

async function loadDotEnv(filePath) {
  const text = await readFile(filePath, "utf8").catch(() => "");
  for (const line of text.split(/\r?\n/u)) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/u);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`missing_environment:${name}`);
  return value;
}

function argumentValue(prefix) {
  const item = process.argv.find((value) => value.startsWith(prefix));
  return item ? item.slice(prefix.length).trim() : "";
}
