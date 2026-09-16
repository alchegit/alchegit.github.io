import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import oracledb from "oracledb";

await loadDotEnv(path.resolve(process.cwd(), ".env"));
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.fetchAsString = [oracledb.CLOB];

const runId = argumentValue("--run-id");
const jobId = argumentValue("--job-id");
const includeResult = process.argv.includes("--include-result");
const exportJobPath = argumentValue("--export-job");

const connection = await oracledb.getConnection({
  user: requiredEnv("ORACLE_USER"),
  password: requiredEnv("ORACLE_PASSWORD"),
  connectString: requiredEnv("ORACLE_CONNECT_STRING")
});

try {
  await connection.execute("alter session set time_zone = '+09:00'");
  const recent = await connection.execute(`
    select * from (
      select
        serial_run.queue_group_id,
        serial_run.id as run_id,
        serial_run.schedule_id,
        serial_run.run_status,
        serial_run.current_stage,
        serial_run.failure_code,
        schedule.schedule_status,
        to_char(schedule.next_run_at, 'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM') as schedule_next_run_at,
        job.id as job_id,
        job.job_type,
        job.job_status,
        job.attempt_count,
        job.max_attempts,
        job.error_code,
        to_char(job.next_attempt_at, 'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM') as next_attempt_at,
        to_char(job.started_at, 'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM') as started_at,
        to_char(job.completed_at, 'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM') as completed_at,
        to_char(serial_run.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM') as run_created_at
      from storyheaven_serial_runs serial_run
      join storyheaven_serial_jobs job on job.run_id = serial_run.id
      left join storyheaven_serial_schedules schedule on schedule.id = serial_run.schedule_id
      order by serial_run.created_at desc, job.created_at desc
    ) where rownum <= 12
  `);
  const errors = await connection.execute(`
    select nvl(error_code, '(none)') as error_code, count(*) as occurrence_count
    from storyheaven_serial_jobs
    where updated_at >= systimestamp - numtodsinterval(24, 'HOUR')
      and error_code is not null
    group by error_code
    order by count(*) desc, error_code
  `);
  const attention = await connection.execute(`
    select serial_run.id, serial_run.queue_group_id, serial_run.schedule_id,
           serial_run.story_id, story.title as story_title, serial_run.episode_no,
           serial_run.run_status, serial_run.current_stage, serial_run.failure_code,
           serial_run.rewrite_count, serial_run.operator_rewrite_count,
           serial_run.quality_json, schedule.schedule_status,
           to_char(serial_run.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM') as updated_at
      from storyheaven_serial_runs serial_run
      left join storyheaven_stories story on story.id = serial_run.story_id
      left join storyheaven_serial_schedules schedule on schedule.id = serial_run.schedule_id
     where serial_run.queue_canceled_at is null
       and serial_run.run_status in ('queued', 'running', 'rewrite', 'blocked', 'error')
     order by serial_run.created_at
  `);
  const details = runId || jobId
    ? await connection.execute(`
        select job.id, job.run_id, job.job_type, job.job_status,
               job.attempt_count, job.max_attempts, job.error_code,
               job.input_hash, job.input_json, job.output_json,
               job.started_at, job.completed_at, job.created_at
          from storyheaven_serial_jobs job
         where (:run_id is not null and job.run_id = :run_id)
            or (:job_id is not null and job.id = :job_id)
         order by job.created_at
      `, { run_id: runId || null, job_id: jobId || null })
    : { rows: [] };
  const runDetail = runId
    ? await connection.execute(`
        select serial_run.id, serial_run.story_id, story.title as story_title,
               serial_run.episode_no, serial_run.run_status,
               serial_run.current_stage, serial_run.failure_code,
               serial_run.rewrite_count, serial_run.input_json, serial_run.quality_json,
               schedule.target_episode_count, schedule.concept_policy_json
          from storyheaven_serial_runs serial_run
          left join storyheaven_serial_schedules schedule on schedule.id = serial_run.schedule_id
          left join storyheaven_stories story on story.id = serial_run.story_id
         where serial_run.id = :run_id
      `, { run_id: runId })
    : { rows: [] };
  if (exportJobPath) {
    const row = details.rows[0];
    if (!row) throw new Error("serial_job_not_found");
    await writeFile(exportJobPath, JSON.stringify({
      id: row.ID,
      runId: row.RUN_ID,
      type: row.JOB_TYPE,
      inputHash: row.INPUT_HASH,
      payload: parseJson(row.INPUT_JSON, {})
    }), { encoding: "utf8", mode: 0o600 });
  }
  console.log(JSON.stringify({
    checkedAt: new Date().toISOString(),
    recentJobs: recent.rows,
    errorsLast24Hours: errors.rows,
    attention: attention.rows.map(summarizeAttention),
    ...(runDetail.rows[0] ? {
      run: {
        id: runDetail.rows[0].ID,
        storyId: runDetail.rows[0].STORY_ID || null,
        storyTitle: runDetail.rows[0].STORY_TITLE || null,
        episodeNo: Number(runDetail.rows[0].EPISODE_NO || 0),
        status: runDetail.rows[0].RUN_STATUS,
        stage: runDetail.rows[0].CURRENT_STAGE,
        failureCode: runDetail.rows[0].FAILURE_CODE || null,
        rewriteCount: Number(runDetail.rows[0].REWRITE_COUNT || 0),
        input: parseJson(runDetail.rows[0].INPUT_JSON, {}),
        quality: parseJson(runDetail.rows[0].QUALITY_JSON, null),
        scheduleTargetEpisodeCount: Number(runDetail.rows[0].TARGET_EPISODE_COUNT || 0),
        schedulePolicy: parseJson(runDetail.rows[0].CONCEPT_POLICY_JSON, {})
      }
    } : {}),
    ...(details.rows.length ? { details: details.rows.map(summarizeJob) } : {})
  }, null, 2));
} finally {
  await connection.close();
}

function summarizeAttention(row) {
  const quality = parseJson(row.QUALITY_JSON, null);
  const issues = Array.isArray(quality?.editorial?.issues) ? quality.editorial.issues : [];
  return {
    id: row.ID,
    queueGroupId: row.QUEUE_GROUP_ID,
    scheduleId: row.SCHEDULE_ID || null,
    scheduleStatus: row.SCHEDULE_STATUS || null,
    storyId: row.STORY_ID || null,
    storyTitle: row.STORY_TITLE || null,
    episodeNo: Number(row.EPISODE_NO || 0),
    status: row.RUN_STATUS,
    stage: row.CURRENT_STAGE,
    failureCode: row.FAILURE_CODE || null,
    rewriteCount: Number(row.REWRITE_COUNT || 0),
    operatorRewriteCount: Number(row.OPERATOR_REWRITE_COUNT || 0),
    criticalIssueCount: issues.filter((item) => item?.severity === "critical").length,
    warningIssueCount: issues.filter((item) => item?.severity === "warning").length,
    readerExperienceScore: quality?.decision?.readerExperienceScore ?? null,
    updatedAt: row.UPDATED_AT || null
  };
}

function summarizeJob(row) {
  const input = parseJson(row.INPUT_JSON, {});
  const output = parseJson(row.OUTPUT_JSON, null);
  const payload = input?.payload && typeof input.payload === "object" ? input.payload : input;
  const startedAt = dateValue(row.STARTED_AT);
  const completedAt = dateValue(row.COMPLETED_AT);
  return {
    id: row.ID,
    runId: row.RUN_ID,
    type: row.JOB_TYPE,
    status: row.JOB_STATUS,
    attemptCount: Number(row.ATTEMPT_COUNT || 0),
    maxAttempts: Number(row.MAX_ATTEMPTS || 0),
    errorCode: row.ERROR_CODE || null,
    model: output?.model || null,
    usage: output?.usage || null,
    criticRole: payload?.criticRole || null,
    inputHash: row.INPUT_HASH,
    inputCharacters: String(row.INPUT_JSON || "").length,
    outputCharacters: String(row.OUTPUT_JSON || "").length,
    hasOutput: Boolean(output),
    ...(includeResult && output?.result ? { result: output.result } : {}),
    startedAt: startedAt?.toISOString() || null,
    completedAt: completedAt?.toISOString() || null,
    durationSeconds: startedAt && completedAt ? Math.max(0, Math.round((completedAt - startedAt) / 1_000)) : null
  };
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] || "").trim() : "";
}

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(String(value)) : fallback;
  } catch {
    return fallback;
  }
}

function dateValue(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
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
