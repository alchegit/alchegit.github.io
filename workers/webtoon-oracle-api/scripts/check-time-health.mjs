import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";
import oracledb from "oracledb";

const execFileAsync = promisify(execFile);
await loadDotEnv(path.resolve(process.cwd(), ".env"));
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

const connection = await oracledb.getConnection({
  user: requiredEnv("ORACLE_USER"),
  password: requiredEnv("ORACLE_PASSWORD"),
  connectString: requiredEnv("ORACLE_CONNECT_STRING")
});

try {
  await connection.execute("alter session set time_zone = '+09:00'");
  const clockResult = await connection.execute(`
    select
      to_char(systimestamp, 'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM') as db_system_time,
      to_char(current_timestamp, 'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM') as db_session_time,
      to_char(current_timestamp at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM') as db_utc_time,
      dbtimezone as db_time_zone,
      sessiontimezone as session_time_zone
    from dual
  `);
  const recentResult = await connection.execute(`
    select * from (
      select
        id,
        to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM') as stored_time,
        to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM') as stored_utc_time,
        to_char(created_at at time zone 'Asia/Seoul', 'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM') as stored_seoul_time
      from storyheaven_serial_runs
      order by created_at desc
    ) where rownum <= 5
  `);
  const futureResult = await connection.execute(`
    select count(*) as future_event_count
    from (
      select created_at as event_time from storyheaven_serial_schedules
      union all select updated_at from storyheaven_serial_schedules
      union all select last_run_at from storyheaven_serial_schedules
      union all select last_cycle_completed_at from storyheaven_serial_schedules
      union all select created_at from storyheaven_serial_runs
      union all select updated_at from storyheaven_serial_runs
      union all select started_at from storyheaven_serial_runs
      union all select completed_at from storyheaven_serial_runs
      union all select queue_canceled_at from storyheaven_serial_runs
      union all select history_hidden_at from storyheaven_serial_runs
      union all select created_at from storyheaven_serial_jobs
      union all select updated_at from storyheaven_serial_jobs
      union all select started_at from storyheaven_serial_jobs
      union all select completed_at from storyheaven_serial_jobs
    )
    where event_time > systimestamp + numtodsinterval(120, 'SECOND')
  `);

  const database = clockResult.rows[0];
  const ntp = await chronyHealth();
  const hostUtcTime = new Date().toISOString();
  const driftSeconds = Math.round((Date.parse(database.DB_UTC_TIME) - Date.now()) / 1000);
  console.log(JSON.stringify({
    hostUtcTime,
    hostSeoulTime: formatSeoul(Date.now()),
    ntp,
    database,
    driftSeconds,
    futureSerialEventCount: Number(futureResult.rows[0].FUTURE_EVENT_COUNT || 0),
    recentSerialRuns: recentResult.rows
  }, null, 2));
  if (
    !ntp.synchronized
    || !Number.isFinite(driftSeconds)
    || Math.abs(driftSeconds) > 120
    || Number(futureResult.rows[0].FUTURE_EVENT_COUNT || 0) > 0
  ) process.exitCode = 1;
} finally {
  await connection.close();
}

async function chronyHealth() {
  try {
    const { stdout } = await execFileAsync("chronyc", ["tracking"], { timeout: 5_000 });
    const referenceId = /^Reference ID\s*:\s*(\S+)/mu.exec(stdout)?.[1] || "";
    const leapStatus = /^Leap status\s*:\s*(.+)$/mu.exec(stdout)?.[1]?.trim() || "";
    const systemTime = /^System time\s*:\s*(.+)$/mu.exec(stdout)?.[1]?.trim() || "";
    return {
      synchronized: referenceId !== "00000000" && leapStatus === "Normal",
      referenceId,
      leapStatus,
      systemTime
    };
  } catch (error) {
    return { synchronized: false, error: error?.code || "chrony_unavailable" };
  }
}

function formatSeoul(value) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).format(value).replace(" ", "T") + "+09:00";
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
