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
const slot = Math.max(1, Math.min(9, Number(argumentValue("--slot=") || 1)));
const requestedGenrePreset = argumentValue("--genre=") || "curated-long-fantasy-random";
const stateDir = path.resolve(process.env.STORYHEAVEN_REVIEW_STATE_DIR || "./runtime");
const statePath = path.join(stateDir, slot === 1 ? "v3-private-pilot.json" : `v3-private-pilot-${slot}.json`);
const previous = await readJson(statePath);
if (previous?.scheduleId && previous?.runId && !report && !resumeBlocked && !repairCard) {
  console.log(JSON.stringify({ reused: true, ...previous }, null, 2));
  process.exit(0);
}

const request = {
  genrePresetId: requestedGenrePreset,
  proseStyleId: "light-witty-v1",
  publicationMode: "test_private",
  openingPilotMode: "three_episode_incubation",
  openingPilotApprovalMode: "system_auto",
  cadenceMinutes: 10_080,
  targetEpisodeCount: 3,
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
    humor: 2,
    novelty: 2
  },
  targetAge: "teen",
  status: "active",
  conceptPolicy: STORYHEAVEN_DEFAULT_CONCEPT_POLICY
};

if (!execute && !report && !resumeBlocked && !repairCard) {
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
  if (report) {
    if (!previous?.queueGroupId) throw new Error("v3_pilot_state_missing");
    const runRows = await withConnection(async (connection) => {
      const result = await connection.execute(
        `select id
           from storyheaven_serial_runs
          where queue_group_id = :queue_group_id
          order by created_at`,
        { queue_group_id: previous.queueGroupId }
      );
      return result.rows;
    });
    const reports = [];
    for (const row of runRows) reports.push(await service.getRun(row.ID));
    const story = await withConnection(async (connection) => {
      const result = await connection.execute(
        `select id, title
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
    console.log(JSON.stringify({
      checkedAt: new Date().toISOString(),
      scheduleId: previous.scheduleId,
      queueGroupId: previous.queueGroupId,
      story: story ? { id: story.ID, title: story.TITLE } : null,
      voiceAudition: reports.find((item) => item.voiceAudition)?.voiceAudition || null,
      runs: reports.map(summarizeRun),
      totals: summarizeTotals(reports)
    }, null, 2));
  } else if (resumeBlocked || repairCard) {
    if (!previous?.queueGroupId) throw new Error("v3_pilot_state_missing");
    const operatorId = await latestOperatorId();
    const blockedRunId = await withConnection(async (connection) => {
      const result = await connection.execute(
        `select id
           from storyheaven_serial_runs
          where queue_group_id = :queue_group_id
            and run_status = 'blocked'
            and current_stage = 'editorial_blocked'
          order by episode_no, created_at fetch first 1 row only`,
        { queue_group_id: previous.queueGroupId }
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
