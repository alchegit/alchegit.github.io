import { readFile } from "node:fs/promises";
import path from "node:path";
import oracledb from "oracledb";

await loadDotEnv(path.resolve(process.cwd(), ".env"));
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

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
        group by serial_run.queue_group_id, serial_run.schedule_id
        order by stopped_at desc
     ) where rownum = 1`
  );
  const failed = result.rows[0];
  if (!failed) {
    console.log("No terminally failed serial group found.");
    process.exitCode = 2;
  } else {
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
              started_at = null, completed_at = null, updated_at = systimestamp
        where queue_group_id = :queue_group_id
          and queue_canceled_at is null
          and run_status = 'error'`,
      { queue_group_id: failed.QUEUE_GROUP_ID }
    );
    if (failed.SCHEDULE_ID) {
      await connection.execute(
        `update storyheaven_serial_schedules
            set schedule_status = 'active', cadence_minutes = 120, cadence_days = 1,
                next_run_at = least(nvl(next_run_at, systimestamp), systimestamp),
                updated_at = systimestamp
          where id = :schedule_id`,
        { schedule_id: failed.SCHEDULE_ID }
      );
    }
    await connection.commit();
    console.log("Resumed latest failed serial group with a 120-minute cadence.");
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
