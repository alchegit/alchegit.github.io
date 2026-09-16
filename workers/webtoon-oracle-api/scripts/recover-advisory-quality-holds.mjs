import { readFile } from "node:fs/promises";
import path from "node:path";
import oracledb from "oracledb";
import { decideStoryHeavenSerialReview } from "../src/serial-engine.mjs";
import { createStoryHeavenSerialService } from "../src/serial-service.mjs";

await loadDotEnv(path.resolve(process.cwd(), ".env"));
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.fetchAsString = [oracledb.CLOB];

const apply = process.argv.includes("--apply");
const runId = argumentValue("--run-id");
if (runId && !/^[a-zA-Z0-9-]{3,36}$/u.test(runId)) throw new Error("run_id_invalid");

const connectionOptions = {
  user: requiredEnv("ORACLE_USER"),
  password: requiredEnv("ORACLE_PASSWORD"),
  connectString: requiredEnv("ORACLE_CONNECT_STRING")
};
const service = createStoryHeavenSerialService({
  withConnection,
  withTransaction,
  clob: (value) => ({ val: String(value ?? ""), type: oracledb.CLOB }),
  clobJson: (value) => ({ val: JSON.stringify(value ?? null), type: oracledb.CLOB })
});

const candidates = await withConnection(async (connection) => {
  const result = await connection.execute(
    `select serial_run.id, serial_run.story_id, serial_run.episode_no,
            serial_run.rewrite_count, serial_run.quality_json,
            story.title
       from storyheaven_serial_runs serial_run
       left join storyheaven_stories story on story.id = serial_run.story_id
      where serial_run.run_status = 'blocked'
        and serial_run.current_stage = 'editorial_blocked'
        and serial_run.queue_canceled_at is null
        and (:run_id is null or serial_run.id = :run_id)
      order by serial_run.created_at`,
    { run_id: runId || null }
  );
  return result.rows.map((row) => {
    const quality = parseJson(row.QUALITY_JSON, {});
    const decision = decideStoryHeavenSerialReview({
      review: quality.editorial,
      qa: quality.deterministic,
      rewriteCount: Number(row.REWRITE_COUNT || 0),
      episodeNo: row.EPISODE_NO
    });
    return {
      runId: row.ID,
      storyId: row.STORY_ID,
      title: row.TITLE || "제목 없는 작품",
      episodeNo: Number(row.EPISODE_NO || 0),
      rewriteCount: Number(row.REWRITE_COUNT || 0),
      state: decision.state,
      advisoryApproval: decision.advisoryApproval === true,
      approvalReason: decision.approvalReason,
      failedMetrics: decision.failedMetrics,
      criticalIssues: Array.isArray(quality.editorial?.issues)
        ? quality.editorial.issues.filter((issue) => issue?.severity === "critical").length
        : 0
    };
  });
});

const recoverable = candidates.filter((item) => item.state === "approved");
const recovered = [];
if (apply) {
  for (const item of recoverable) {
    const result = await service.resolveQualityHold(item.runId, "storyheaven-system-recovery", { action: "approve" });
    recovered.push({ runId: item.runId, title: item.title, status: result.run?.status || "approved" });
  }
}

console.log(JSON.stringify({
  mode: apply ? "apply" : "dry-run",
  examined: candidates.length,
  recoverable,
  retainedForOperator: candidates.filter((item) => item.state !== "approved"),
  recovered
}, null, 2));

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

function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? String(process.argv[index + 1] || "").trim() : "";
}

async function loadDotEnv(filePath) {
  const source = await readFile(filePath, "utf8").catch(() => "");
  for (const line of source.split(/\r?\n/u)) {
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
