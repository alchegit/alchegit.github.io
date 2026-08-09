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
  console.log(JSON.stringify({
    checkedAt: new Date().toISOString(),
    recentJobs: recent.rows,
    errorsLast24Hours: errors.rows
  }, null, 2));
} finally {
  await connection.close();
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
