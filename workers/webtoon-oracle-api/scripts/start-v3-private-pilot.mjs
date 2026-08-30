import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import oracledb from "oracledb";
import { STORYHEAVEN_DEFAULT_CONCEPT_POLICY } from "../src/serial-engine.mjs";
import { createStoryHeavenSerialService } from "../src/serial-service.mjs";

await loadDotEnv(path.resolve(process.cwd(), ".env"));

const execute = process.argv.includes("--execute");
const stateDir = path.resolve(process.env.STORYHEAVEN_REVIEW_STATE_DIR || "./runtime");
const statePath = path.join(stateDir, "v3-private-pilot.json");
const previous = await readJson(statePath);
if (previous?.scheduleId && previous?.runId) {
  console.log(JSON.stringify({ reused: true, ...previous }, null, 2));
  process.exit(0);
}

const request = {
  genrePresetId: "curated-long-fantasy-random",
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

if (!execute) {
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
} finally {
  await pool.close(10);
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
