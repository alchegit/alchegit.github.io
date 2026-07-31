import { spawn } from "node:child_process";
import crypto from "node:crypto";
import { hostname } from "node:os";
import path from "node:path";
import process from "node:process";
import { mkdir, readFile, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  buildModerationPrompt,
  finalizeSecondaryReview,
  partitionModerationJobs,
  parseModerationOutput,
  shouldEscalateReview,
  toApiResult
} from "./moderation.mjs";
import {
  buildSerialPrompt,
  modelRoleForSerialJob,
  parseSerialOutput
} from "./serial.mjs";

await loadDotEnv();

const args = new Set(process.argv.slice(2));
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = {
  apiBaseUrl: requiredEnv("ORACLE_API_BASE_URL").replace(/\/+$/u, ""),
  workerToken: requiredEnv("WEBTOON_WORKER_TOKEN"),
  workerId: process.env.STORYHEAVEN_REVIEW_WORKER_ID || `storyheaven-${hostname()}`,
  batchSize: boundedInt(process.env.STORYHEAVEN_REVIEW_BATCH_SIZE, 1, 10, 10),
  requestMaxCharacters: boundedInt(process.env.STORYHEAVEN_REVIEW_REQUEST_MAX_CHARACTERS, 4_000, 48_000, 24_000),
  requestMaxItems: boundedInt(process.env.STORYHEAVEN_REVIEW_REQUEST_MAX_ITEMS, 1, 10, 6),
  pollMs: boundedInt(process.env.STORYHEAVEN_REVIEW_POLL_MS, 2_000, 300_000, 10_000),
  pollMaxMs: boundedInt(process.env.STORYHEAVEN_REVIEW_POLL_MAX_MS, 10_000, 600_000, 60_000),
  requestTimeoutMs: boundedInt(process.env.STORYHEAVEN_REVIEW_REQUEST_TIMEOUT_MS, 5_000, 120_000, 30_000),
  codexTimeoutMs: boundedInt(process.env.STORYHEAVEN_CODEX_TIMEOUT_MS, 30_000, 600_000, 180_000),
  stateDir: path.resolve(process.env.STORYHEAVEN_REVIEW_STATE_DIR || "./runtime"),
  workspace: path.resolve(process.env.STORYHEAVEN_REVIEW_WORKSPACE || "./workspace"),
  codexBinary: process.env.CODEX_BINARY || "codex",
  primaryModel: process.env.CODEX_PRIMARY_MODEL || "gpt-5.6-luna",
  secondaryModel: process.env.CODEX_SECONDARY_MODEL || "gpt-5.6-terra",
  reasoningEffort: process.env.CODEX_REASONING_EFFORT || "low",
  confidenceBelow: boundedInt(process.env.CODEX_ESCALATE_CONFIDENCE_BELOW, 1, 100, 80),
  approvalScoreBelow: boundedInt(process.env.CODEX_ESCALATE_APPROVAL_SCORE_BELOW, 1, 100, 75),
  schemaPath: path.join(packageRoot, "schemas", "review-results.schema.json"),
  serialEnabled: parseBoolean(process.env.STORYHEAVEN_SERIAL_ENGINE_ENABLED, false),
  serialWriterModel: process.env.CODEX_SERIAL_WRITER_MODEL || process.env.CODEX_SECONDARY_MODEL || "gpt-5.6-terra",
  serialEditorModel: process.env.CODEX_SERIAL_EDITOR_MODEL || process.env.CODEX_PRIMARY_MODEL || "gpt-5.6-luna",
  serialReasoningEffort: process.env.CODEX_SERIAL_REASONING_EFFORT || "medium",
  serialTimeoutMs: boundedInt(process.env.STORYHEAVEN_SERIAL_CODEX_TIMEOUT_MS, 60_000, 1_200_000, 480_000),
  serialSchemaPath: path.join(packageRoot, "schemas", "serial-result.schema.json")
};
config.pollMaxMs = Math.max(config.pollMs, config.pollMaxMs);

const runtime = { stopping: false, wakeSleep: null };
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    runtime.stopping = true;
    runtime.wakeSleep?.();
  });
}

await mkdir(config.stateDir, { recursive: true });
await mkdir(config.workspace, { recursive: true });

console.log(
  `[storyheaven-review-worker] id=${config.workerId} claim=${config.batchSize} ` +
  `request=${config.requestMaxItems}/${config.requestMaxCharacters} primary=${config.primaryModel} ` +
  `serial=${config.serialEnabled ? `${config.serialWriterModel}/${config.serialEditorModel}` : "off"}`
);

if (args.has("--once")) {
  await tick();
} else {
  let idlePollMs = config.pollMs;
  while (!runtime.stopping) {
    try {
      const worked = await tick();
      if (worked) {
        idlePollMs = config.pollMs;
        continue;
      }
      await interruptibleSleep(withJitter(idlePollMs));
      idlePollMs = Math.min(config.pollMaxMs, Math.round(idlePollMs * 1.6));
    } catch (error) {
      console.error(`[storyheaven-review-worker] tick failed: ${safeErrorCode(error)}`);
      await interruptibleSleep(withJitter(idlePollMs));
      idlePollMs = Math.min(config.pollMaxMs, Math.round(idlePollMs * 1.6));
    }
  }
  console.log("[storyheaven-review-worker] stopped");
}

async function tick() {
  const lease = await apiRequest("/api/storyheaven/worker/reviews/claim", {
    workerId: config.workerId,
    limit: config.batchSize
  });
  const jobs = Array.isArray(lease.jobs) ? lease.jobs : [];
  if (!jobs.length) return config.serialEnabled ? tickSerial() : false;

  try {
    const primaryGroups = partitionModerationJobs(jobs, {
      maxCharacters: config.requestMaxCharacters,
      maxItems: config.requestMaxItems
    });
    const primary = [];
    for (const group of primaryGroups) {
      primary.push(...await runCodexReview(group, config.primaryModel, "primary"));
    }
    const escalationIds = new Set(primary
      .filter((review) => shouldEscalateReview(review, config))
      .map((review) => review.id));
    const finalById = new Map(primary.map((review) => [review.id, review]));

    if (escalationIds.size) {
      const escalationJobs = jobs.filter((job) => escalationIds.has(job.id));
      const secondaryGroups = partitionModerationJobs(escalationJobs, {
        maxCharacters: config.requestMaxCharacters,
        maxItems: config.requestMaxItems
      });
      for (const group of secondaryGroups) {
        const secondary = await runCodexReview(group, config.secondaryModel, "secondary");
        for (const review of secondary) {
          const original = finalById.get(review.id);
          finalById.set(review.id, finalizeSecondaryReview({
            ...review,
            audit: [...(original?.audit || []), ...(review.audit || [])]
          }));
        }
      }
    }

    const results = jobs.map((job) => toApiResult(finalById.get(job.id)));
    await apiRequest("/api/storyheaven/worker/reviews/complete", {
      workerId: config.workerId,
      leaseId: lease.leaseId,
      results
    });
    console.log(
      `[storyheaven-review-worker] completed ${results.length} review(s) in ${primaryGroups.length} request(s), ` +
      `escalated ${escalationIds.size}`
    );
    return true;
  } catch (error) {
    const errorCode = safeErrorCode(error);
    await apiRequest("/api/storyheaven/worker/reviews/fail", {
      workerId: config.workerId,
      leaseId: lease.leaseId,
      errorCode
    }).catch((reportError) => {
      console.error(`[storyheaven-review-worker] failure callback failed: ${safeErrorCode(reportError)}`);
    });
    throw error;
  }
}

async function tickSerial() {
  const lease = await apiRequest("/api/storyheaven/worker/serial-engine/claim", {
    workerId: config.workerId
  });
  const job = lease.job;
  if (!job) return false;
  const role = modelRoleForSerialJob(job.type);
  const model = role === "editor" ? config.serialEditorModel : config.serialWriterModel;
  try {
    const parsed = await runCodexSerial(job, model);
    await apiRequest("/api/storyheaven/worker/serial-engine/complete", {
      workerId: config.workerId,
      leaseId: lease.leaseId,
      jobId: job.id,
      inputHash: job.inputHash,
      result: parsed.result,
      model: parsed.model
    });
    console.log(`[storyheaven-review-worker] serial ${job.type} completed run=${job.runId} model=${model}`);
    return true;
  } catch (error) {
    const errorCode = safeErrorCode(error);
    await apiRequest("/api/storyheaven/worker/serial-engine/fail", {
      workerId: config.workerId,
      leaseId: lease.leaseId,
      jobId: job.id,
      errorCode
    }).catch((reportError) => {
      console.error(`[storyheaven-review-worker] serial failure callback failed: ${safeErrorCode(reportError)}`);
    });
    throw error;
  }
}

async function runCodexReview(jobs, model, tier) {
  const outputPath = path.join(config.stateDir, `review-${crypto.randomUUID()}.json`);
  const prompt = buildModerationPrompt(jobs, { tier });
  const childArgs = [
    "exec",
    "--ephemeral",
    "--skip-git-repo-check",
    "--model",
    model,
    "--config",
    `model_reasoning_effort=\"${config.reasoningEffort}\"`,
    "--output-schema",
    config.schemaPath,
    "--output-last-message",
    outputPath,
    "-"
  ];

  try {
    await runProcess(config.codexBinary, childArgs, prompt, config.codexTimeoutMs);
    const output = await readFile(outputPath, "utf8");
    return parseModerationOutput(output, jobs, { model, tier });
  } finally {
    await unlink(outputPath).catch(() => {});
  }
}

async function runCodexSerial(job, model) {
  const outputPath = path.join(config.stateDir, `serial-${crypto.randomUUID()}.json`);
  const prompt = buildSerialPrompt(job);
  const childArgs = [
    "exec",
    "--ephemeral",
    "--skip-git-repo-check",
    "--model",
    model,
    "--config",
    `model_reasoning_effort=\"${config.serialReasoningEffort}\"`,
    "--output-schema",
    config.serialSchemaPath,
    "--output-last-message",
    outputPath,
    "-"
  ];
  try {
    await runProcess(config.codexBinary, childArgs, prompt, config.serialTimeoutMs);
    const output = await readFile(outputPath, "utf8");
    return parseSerialOutput(output, job, { model });
  } finally {
    await unlink(outputPath).catch(() => {});
  }
}

async function runProcess(command, childArgs, stdin, timeoutMs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, childArgs, {
      cwd: config.workspace,
      env: process.env,
      stdio: ["pipe", "ignore", "pipe"]
    });
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 5_000).unref();
    }, timeoutMs);
    timeout.unref();
    child.stderr.on("data", (chunk) => {
      stderr = `${stderr}${chunk}`.slice(-8_000);
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code, signal) => {
      clearTimeout(timeout);
      if (code === 0) resolve();
      else reject(new Error(signal ? "codex_review_timeout" : classifyCodexError(stderr, code)));
    });
    child.stdin.end(stdin);
  });
}

async function apiRequest(route, body) {
  const response = await fetch(`${config.apiBaseUrl}${route}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webtoon-Worker-Token": config.workerToken
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(config.requestTimeoutMs)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`review_api_${response.status}_${payload.error || "failed"}`);
  return payload;
}

function classifyCodexError(stderr, code) {
  const text = String(stderr || "").toLowerCase();
  if (text.includes("login") || text.includes("authentication")) return "codex_auth_required";
  if (text.includes("rate limit") || text.includes("usage limit")) return "codex_rate_limited";
  if (text.includes("invalid_json_schema")) return "codex_output_schema_invalid";
  if (text.includes("model") && (text.includes("not found") || text.includes("unavailable") || text.includes("does not exist"))) {
    return "codex_model_unavailable";
  }
  return `codex_exit_${Number(code) || 1}`;
}

function safeErrorCode(error) {
  return String(error?.message || "codex_review_failed")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gu, "_")
    .replace(/^_+|_+$/gu, "")
    .slice(0, 80) || "codex_review_failed";
}

function requiredEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function boundedInt(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function parseBoolean(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  return new Set(["1", "true", "yes", "on"]).has(String(value).trim().toLowerCase());
}

async function loadDotEnv() {
  const filePath = path.resolve(process.cwd(), process.env.ENV_FILE || ".env");
  let source = "";
  try {
    source = await readFile(filePath, "utf8");
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    return;
  }
  for (const line of source.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    const name = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[name] === undefined) process.env[name] = value;
  }
}

function withJitter(ms) {
  return Math.max(250, Math.round(ms * (0.9 + Math.random() * 0.2)));
}

function interruptibleSleep(ms) {
  if (runtime.stopping) return Promise.resolve();
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (runtime.wakeSleep === finish) runtime.wakeSleep = null;
      resolve();
    };
    const timer = setTimeout(finish, ms);
    runtime.wakeSleep = finish;
  });
}
