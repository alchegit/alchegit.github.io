import { readFile } from "node:fs/promises";
import path from "node:path";
import oracledb from "oracledb";

await loadDotEnv(path.resolve(process.cwd(), ".env"));
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
const targetRunId = argumentValue("--run-id");

const connection = await oracledb.getConnection({
  user: requiredEnv("ORACLE_USER"),
  password: requiredEnv("ORACLE_PASSWORD"),
  connectString: requiredEnv("ORACLE_CONNECT_STRING")
});

try {
  const result = await connection.execute(
    `select * from (
       select serial_run.queue_group_id, serial_run.schedule_id,
              max(nvl(serial_run.completed_at, serial_run.updated_at)) as stopped_at
         from storyheaven_serial_runs serial_run
         join storyheaven_serial_jobs job on job.run_id = serial_run.id
        where job.job_status = 'error'
          and serial_run.queue_canceled_at is null
          and (:run_id is null or serial_run.id = :run_id)
        group by serial_run.queue_group_id, serial_run.schedule_id
        order by stopped_at desc
     ) where rownum = 1`,
    { run_id: targetRunId || null }
  );
  const failed = result.rows[0];
  if (!failed) {
    console.log("No terminally failed serial group found.");
    process.exitCode = 2;
  } else {
    if (failed.SCHEDULE_ID) {
      await connection.execute(
        `update storyheaven_serial_jobs
            set job_status = 'canceled', error_code = 'superseded_recovery',
                completed_at = systimestamp, updated_at = systimestamp
          where run_id in (
            select newer.id
              from storyheaven_serial_runs newer
              join storyheaven_serial_runs failed_run
                on failed_run.queue_group_id = :queue_group_id
             where newer.schedule_id = :schedule_id
               and newer.queue_group_id <> :queue_group_id
               and newer.created_at > failed_run.created_at
               and newer.story_id is null
          ) and job_status in ('queued', 'retry_wait')`,
        { queue_group_id: failed.QUEUE_GROUP_ID, schedule_id: failed.SCHEDULE_ID }
      );
      await connection.execute(
        `update storyheaven_serial_runs
            set run_status = 'blocked', current_stage = 'history_hidden',
                failure_code = 'superseded_recovery',
                queue_canceled_at = systimestamp, history_hidden_at = systimestamp,
                completed_at = systimestamp, updated_at = systimestamp
          where schedule_id = :schedule_id
            and queue_group_id <> :queue_group_id
            and story_id is null
            and created_at > (
              select min(created_at) from storyheaven_serial_runs
               where queue_group_id = :queue_group_id
            )
            and queue_canceled_at is null`,
        { queue_group_id: failed.QUEUE_GROUP_ID, schedule_id: failed.SCHEDULE_ID }
      );
    }
    await connection.execute(
      `update storyheaven_serial_jobs
          set job_status = 'queued', attempt_count = 0,
              next_attempt_at = systimestamp, lease_id = null, lease_expires_at = null,
              worker_id = null, error_code = null, started_at = null,
              completed_at = null, updated_at = systimestamp
        where run_id in (
          select id from storyheaven_serial_runs where queue_group_id = :queue_group_id
        ) and job_status = 'error'`,
      { queue_group_id: failed.QUEUE_GROUP_ID }
    );
    await connection.execute(
      `update storyheaven_serial_runs
          set run_status = 'queued', failure_code = null,
              completed_at = null, updated_at = systimestamp
        where queue_group_id = :queue_group_id
          and queue_canceled_at is null
          and run_status = 'error'`,
      { queue_group_id: failed.QUEUE_GROUP_ID }
    );
    if (failed.SCHEDULE_ID) {
      await connection.execute(
        `update storyheaven_serial_schedules
            set schedule_status = 'active',
                next_run_at = systimestamp + numtodsinterval(nvl(cadence_minutes, 120), 'MINUTE'),
                updated_at = systimestamp
          where id = :schedule_id`,
        { schedule_id: failed.SCHEDULE_ID }
      );
    }
    await connection.commit();
    console.log(`Resumed failed serial group ${failed.QUEUE_GROUP_ID} without changing its cadence.`);
  }
} catch (error) {
  await connection.rollback().catch(() => {});
  throw error;
} finally {
  await connection.close();
}

async function loadDotEnv(filePath) {
  const text = await readFile(filePath, "utf8").catch(() => "");
  for (const line of text.split(/\r?\n/u)) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/u);
    if (!match || process.env[match[1]] !== undefined) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`missing_environment:${name}`);
  return value;
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] || "").trim() : "";
}
