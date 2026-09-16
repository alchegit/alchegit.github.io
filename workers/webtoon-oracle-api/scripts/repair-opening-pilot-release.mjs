import { readFile } from "node:fs/promises";
import path from "node:path";
import oracledb from "oracledb";
import { createStoryHeavenSerialService } from "../src/serial-service.mjs";

await loadDotEnv(path.resolve(process.cwd(), ".env"));
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.fetchAsString = [oracledb.CLOB];

const storyId = argumentValue("--story-id");
if (!/^[a-zA-Z0-9-]{3,36}$/u.test(storyId)) throw new Error("story_id_required");

const connectionOptions = {
  user: requiredEnv("ORACLE_USER"),
  password: requiredEnv("ORACLE_PASSWORD"),
  connectString: requiredEnv("ORACLE_CONNECT_STRING")
};

const repaired = await withTransaction(async (connection) => {
  const result = await connection.execute(
    `select serial_run.id as run_id, serial_run.episode_no,
            serial_run.release_at as run_release_at, serial_run.created_at,
            publication.id as publication_id, publication.queue_status,
            publication.release_at as publication_release_at,
            schedule.cadence_days, schedule.cadence_minutes,
            schedule.publication_mode, bible.narrative_blueprint_json
       from storyheaven_serial_runs serial_run
       join storyheaven_publication_queue publication on publication.run_id = serial_run.id
       join storyheaven_serial_schedules schedule on schedule.id = serial_run.schedule_id
       join storyheaven_serial_bibles bible on bible.story_id = serial_run.story_id
      where serial_run.story_id = :story_id
        and serial_run.episode_no between 1 and 3
        and publication.queue_status in ('ready', 'published')
      order by serial_run.episode_no`,
    { story_id: storyId }
  );
  if (result.rows.length !== 3) throw new Error("opening_pilot_publications_incomplete");
  const assessment = parseJson(result.rows[0].NARRATIVE_BLUEPRINT_JSON, {})?.serialMemory?.pilotAssessment || {};
  if (assessment.operatorDecision !== "promoted") throw new Error("opening_pilot_not_promoted");
  const releaseAt = new Date();
  const releases = [];
  for (const row of result.rows) {
    if (row.QUEUE_STATUS === "ready") {
      await connection.execute(
        `update storyheaven_serial_runs set release_at = :release_at, updated_at = systimestamp where id = :run_id`,
        { run_id: row.RUN_ID, release_at: releaseAt }
      );
      await connection.execute(
        `update storyheaven_publication_queue set release_at = :release_at, updated_at = systimestamp where id = :publication_id`,
        { publication_id: row.PUBLICATION_ID, release_at: releaseAt }
      );
    }
    releases.push({
      episodeNo: Number(row.EPISODE_NO),
      status: row.QUEUE_STATUS,
      releaseAt: row.QUEUE_STATUS === "ready"
        ? releaseAt.toISOString()
        : (dateValue(row.PUBLICATION_RELEASE_AT) || dateValue(row.RUN_RELEASE_AT) || dateValue(row.CREATED_AT))?.toISOString() || null
    });
  }
  return {
    storyId,
    releaseMode: "opening_pilot_simultaneous",
    publicationMode: result.rows[0].PUBLICATION_MODE,
    pilotAssessment: assessment,
    releases
  };
});

const service = createStoryHeavenSerialService({
  withConnection,
  withTransaction,
  clob: (value) => ({ val: String(value ?? ""), type: oracledb.CLOB }),
  clobJson: (value) => ({ val: JSON.stringify(value ?? null), type: oracledb.CLOB })
});
const published = await service.publishReady(3);
console.log(JSON.stringify({ repaired, published }, null, 2));

async function withConnection(callback) {
  const connection = await oracledb.getConnection(connectionOptions);
  try {
    await connection.execute("alter session set time_zone = '+09:00'");
    return await callback(connection);
  } finally {
    await connection.close();
  }
}

async function withTransaction(callback) {
  const connection = await oracledb.getConnection(connectionOptions);
  try {
    await connection.execute("alter session set time_zone = '+09:00'");
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback().catch(() => {});
    throw error;
  } finally {
    await connection.close();
  }
}

function dateValue(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseJson(value, fallback) {
  try { return value ? JSON.parse(String(value)) : fallback; } catch { return fallback; }
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] || "").trim() : "";
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
