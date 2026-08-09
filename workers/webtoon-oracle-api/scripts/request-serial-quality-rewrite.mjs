import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import oracledb from "oracledb";

await loadDotEnv(path.resolve(process.cwd(), ".env"));
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.fetchAsString = [oracledb.CLOB];

const runId = argumentValue("--run-id");
if (!/^[a-zA-Z0-9-]{3,36}$/u.test(runId)) throw new Error("run_id_required");
const requestedInstruction = argumentValue("--instruction");
const requestedDraftVersion = Math.max(0, Math.trunc(Number(argumentValue("--draft-version") || 0)));

const connection = await oracledb.getConnection({
  user: requiredEnv("ORACLE_USER"),
  password: requiredEnv("ORACLE_PASSWORD"),
  connectString: requiredEnv("ORACLE_CONNECT_STRING")
});

try {
  await connection.execute("alter session set time_zone = '+09:00'");
  const run = await one(`select * from storyheaven_serial_runs where id = :run_id for update`, { run_id: runId });
  if (!run || run.RUN_STATUS !== "blocked" || run.CURRENT_STAGE !== "editorial_blocked") {
    throw new Error("serial_quality_hold_not_active");
  }
  const active = await one(
    `select count(*) as active_count from storyheaven_serial_jobs
      where run_id = :run_id and job_status in ('queued', 'running', 'retry_wait')`,
    { run_id: runId }
  );
  if (Number(active.ACTIVE_COUNT || 0) > 0) throw new Error("serial_quality_hold_work_active");

  const draft = requestedDraftVersion > 0
    ? await one(
      `select * from storyheaven_serial_drafts
        where run_id = :run_id and version_no = :version_no`,
      { run_id: runId, version_no: requestedDraftVersion }
    )
    : await one(
      `select * from storyheaven_serial_drafts
        where run_id = :run_id order by version_no desc fetch first 1 row only`,
      { run_id: runId }
    );
  const priorRewrite = await one(
    `select input_json from storyheaven_serial_jobs
      where run_id = :run_id and job_type = 'rewrite_draft'
      order by created_at desc fetch first 1 row only`,
    { run_id: runId }
  );
  if (!draft || !priorRewrite) throw new Error("serial_quality_hold_evidence_missing");

  const quality = parseJson(run.QUALITY_JSON, {});
  const rewriteNumber = Number(run.REWRITE_COUNT || 0) + Number(run.OPERATOR_REWRITE_COUNT || 0) + 1;
  const input = {
    ...parseJson(priorRewrite.INPUT_JSON, {}),
    draft: {
      id: draft.ID,
      title: draft.TITLE,
      summary: draft.PUBLIC_SUMMARY,
      body: draft.BODY_TEXT,
      sceneRanges: parseJson(draft.SCENE_RANGES_JSON, [])
    },
    deterministicQa: parseJson(draft.DETERMINISTIC_JSON, {}),
    editor: quality.editorial || {},
    rewriteNumber,
    instruction: requestedInstruction || "검수에서 실패한 근거와 장면만 표적 보완한다. 새 세계 규칙이나 예외를 만들지 말고, 행위자·대상·의무·행동·결과를 기존 설정에 맞게 일관되게 연결한다. 이미 통과한 인물·관계·장르 보상과 다른 강한 문단은 그대로 보존한다."
  };
  const json = JSON.stringify(input);
  const nextQuality = JSON.stringify({
    ...quality,
    operatorResolution: {
      action: "rewrite",
      instruction: input.instruction,
      sourceDraftVersion: Number(draft.VERSION_NO || 0),
      requestedAt: new Date().toISOString()
    }
  });
  const jobId = crypto.randomUUID();
  await connection.execute(
    `insert into storyheaven_serial_jobs (
      id, run_id, story_id, job_type, job_status, priority,
      input_hash, input_json, max_attempts, next_attempt_at
    ) values (
      :id, :run_id, :story_id, 'rewrite_draft', 'queued', 75,
      :input_hash, :input_json, 3, systimestamp
    )`,
    {
      id: jobId,
      run_id: runId,
      story_id: run.STORY_ID,
      input_hash: crypto.createHash("sha256").update(json).digest("hex"),
      input_json: { val: json, type: oracledb.CLOB }
    }
  );
  await connection.execute(
    `update storyheaven_serial_runs
        set run_status = 'rewrite', current_stage = 'rewrite_draft',
            operator_rewrite_count = operator_rewrite_count + 1, failure_code = null,
            quality_json = :quality_json, completed_at = null, updated_at = systimestamp
      where id = :run_id`,
    { run_id: runId, quality_json: { val: nextQuality, type: oracledb.CLOB } }
  );
  await connection.commit();
  console.log(JSON.stringify({
    runId,
    jobId,
    rewriteNumber,
    sourceDraftVersion: Number(draft.VERSION_NO || 0),
    inputCharacters: json.length
  }));
} catch (error) {
  await connection.rollback().catch(() => {});
  throw error;
} finally {
  await connection.close();
}

async function one(sql, binds) {
  const result = await connection.execute(sql, binds);
  return result.rows[0] || null;
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
