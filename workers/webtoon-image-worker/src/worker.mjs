import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const args = new Set(process.argv.slice(2));
await loadDotEnv();

const backend = process.env.WEBTOON_BACKEND || (process.env.ORACLE_API_BASE_URL ? "oracle" : "supabase");

const config = {
  backend,
  supabaseUrl: envOrEmpty("SUPABASE_URL").replace(/\/+$/, ""),
  serviceRoleKey: envOrEmpty("SUPABASE_SERVICE_ROLE_KEY"),
  oracleApiBaseUrl: envOrEmpty("ORACLE_API_BASE_URL").replace(/\/+$/, ""),
  workerToken: envOrEmpty("WEBTOON_WORKER_TOKEN"),
  mode: process.env.WORKER_MODE || "manual-prompt",
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS || 8000),
  batchSize: Number(process.env.BATCH_SIZE || 1),
  outboxDir: process.env.OUTBOX_DIR || "./outbox"
};

if (!Number.isFinite(config.pollIntervalMs) || config.pollIntervalMs < 1000) {
  throw new Error("POLL_INTERVAL_MS must be 1000 or greater.");
}

if (!Number.isFinite(config.batchSize) || config.batchSize < 1 || config.batchSize > 10) {
  throw new Error("BATCH_SIZE must be between 1 and 10.");
}

if (config.mode !== "manual-prompt") {
  throw new Error(`Unsupported WORKER_MODE: ${config.mode}`);
}

if (config.backend === "oracle") {
  requireConfigured("ORACLE_API_BASE_URL", config.oracleApiBaseUrl);
  requireConfigured("WEBTOON_WORKER_TOKEN", config.workerToken);
} else if (config.backend === "supabase") {
  requireConfigured("SUPABASE_URL", config.supabaseUrl);
  requireConfigured("SUPABASE_SERVICE_ROLE_KEY", config.serviceRoleKey);
} else {
  throw new Error(`Unsupported WEBTOON_BACKEND: ${config.backend}`);
}

console.log(`[worker] backend=${config.backend} mode=${config.mode} interval=${config.pollIntervalMs}ms`);

if (args.has("--once")) {
  await tick();
  process.exit(0);
}

for (;;) {
  try {
    await tick();
  } catch (error) {
    console.error("[worker] tick failed", error);
  }
  await sleep(config.pollIntervalMs);
}

async function tick() {
  const jobs = await fetchReadyJobs();
  if (!jobs.length) {
    console.log("[worker] no ready jobs");
    return;
  }

  for (const job of jobs) {
    await processJob(job);
  }
}

async function fetchReadyJobs() {
  if (config.backend === "oracle") {
    const data = await oracleFetch(`/api/webtoon/jobs/ready?limit=${config.batchSize}`);
    return (data.jobs || []).map(normalizeJob);
  }

  const search = new URLSearchParams({
    select: "id,user_id,project_id,job_type,scenario_key,cost,request_payload,created_at",
    status: "eq.ready",
    order: "created_at.asc",
    limit: String(config.batchSize)
  });

  const jobs = await supabaseRest(`/rest/v1/webtoon_generation_jobs?${search.toString()}`);
  return jobs.map(normalizeJob);
}

async function processJob(job) {
  console.log(`[worker] processing ${job.id} ${job.job_type}`);

  await updateJob(job.id, {
    status: "running",
    progress: 15,
    error_message: null
  });

  try {
    const prompt = buildManualPrompt(job);
    const promptFile = await writePromptFile(job, prompt);

    await updateJob(job.id, {
      status: "done",
      progress: 100,
      result_payload: {
        schemaVersion: "webtoon-worker-result/v1",
        mode: "manual-prompt",
        promptFile,
        prompt,
        imageUrl: null,
        message: "Paste this prompt into ChatGPT Pro, then import the generated image into /webtoon/."
      },
      error_message: null
    });

    console.log(`[worker] done ${job.id} -> ${promptFile}`);
  } catch (error) {
    await updateJob(job.id, {
      status: "failed",
      progress: 100,
      error_message: String(error?.message || error)
    });
    throw error;
  }
}

function buildManualPrompt(job) {
  const payload = job.request_payload || {};
  const panels = Array.isArray(payload.panels) ? payload.panels : [];
  const targetPanel = payload.panel || null;
  const subject = targetPanel || panels[0] || {};

  const lines = [
    "# ChatGPT Pro Image Prompt",
    "",
    `Job type: ${job.job_type}`,
    `Scenario: ${job.scenario_key || "modern-awakening"}`,
    "",
    "Create an original Korean vertical webtoon-style panel for a modern fantasy awakening story.",
    "Do not copy existing webtoons, anime, games, logos, named characters, or recognizable art styles.",
    "Use a clean original character design, dramatic lighting, readable action, and a strong cliffhanger mood.",
    "Keep text minimal. If text is difficult, leave balloon or system-window areas blank.",
    "",
    "Panel direction:",
    `- Beat: ${subject.beat || payload.idea || "A weak hunter discovers a mysterious quest window in an abandoned subway platform."}`,
    `- Dialogue: ${subject.line || "Is this quest window only visible to me?"}`,
    `- SFX: ${subject.sfx || "BEEP"}`,
    `- Note: ${subject.note || "Vertical webtoon panel, cinematic modern fantasy, original design."}`,
    "",
    "Composition:",
    "- Tall vertical frame.",
    "- Clear foreground character silhouette.",
    "- System window or quest UI can glow, but should not contain much text.",
    "- Leave safe empty space for speech balloons.",
    "- Mood: tense, commercial K-webtoon intro, polished but original.",
    "",
    "After generating, save the image and import it into the matching panel slot in /webtoon/."
  ];

  if (panels.length) {
    lines.push("", "Project panels for continuity:");
    panels.forEach((panel, index) => {
      lines.push(`${index + 1}. ${panel.beat || ""} / ${panel.line || ""}`);
    });
  }

  return lines.join("\n");
}

async function writePromptFile(job, prompt) {
  const dir = path.resolve(config.outboxDir);
  await mkdir(dir, { recursive: true });
  const fileName = `${new Date().toISOString().replace(/[:.]/g, "-")}_${safeId(job.id)}.md`;
  const filePath = path.join(dir, fileName);
  await writeFile(filePath, prompt, "utf8");
  return filePath;
}

async function updateJob(id, patch) {
  if (config.backend === "oracle") {
    const body = {
      status: patch.status,
      progress: patch.progress,
      resultPayload: patch.result_payload,
      errorMessage: patch.error_message
    };
    return oracleFetch(`/api/webtoon/jobs/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(body)
    });
  }

  const search = new URLSearchParams({ id: `eq.${id}` });
  return supabaseRest(`/rest/v1/webtoon_generation_jobs?${search.toString()}`, {
    method: "PATCH",
    headers: {
      Prefer: "return=minimal"
    },
    body: JSON.stringify(patch)
  });
}

async function oracleFetch(pathname, options = {}) {
  const response = await fetch(`${config.oracleApiBaseUrl}${pathname}`, {
    ...options,
    headers: {
      "X-Webtoon-Worker-Token": config.workerToken,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Oracle API ${response.status}: ${text}`);
  }

  return response.json();
}

async function supabaseRest(pathname, options = {}) {
  const response = await fetch(`${config.supabaseUrl}${pathname}`, {
    ...options,
    headers: {
      apikey: config.serviceRoleKey,
      Authorization: `Bearer ${config.serviceRoleKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase ${response.status}: ${text}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function loadDotEnv() {
  const envPath = path.resolve(".env");
  let text = "";

  try {
    text = await readFile(envPath, "utf8");
  } catch {
    return;
  }

  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const equalsAt = trimmed.indexOf("=");
    if (equalsAt < 1) {
      continue;
    }
    const key = trimmed.slice(0, equalsAt).trim();
    const value = trimmed.slice(equalsAt + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value || value.includes("replace_with")) {
    throw new Error(`${name} is required. Copy .env.example to .env on the server.`);
  }
  return value;
}

function envOrEmpty(name) {
  const value = process.env[name] || "";
  return value.includes("replace_with") ? "" : value;
}

function requireConfigured(name, value) {
  if (!value) {
    throw new Error(`${name} is required. Copy .env.example to .env on the server.`);
  }
}

function normalizeJob(job) {
  return {
    id: job.id,
    user_id: job.user_id || job.userId,
    project_id: job.project_id || job.projectId,
    job_type: job.job_type || job.jobType,
    scenario_key: job.scenario_key || job.scenarioKey,
    cost: job.cost || 0,
    request_payload: job.request_payload || job.requestPayload || {},
    created_at: job.created_at || job.createdAt
  };
}

function safeId(value) {
  return String(value || "job").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 80) || "job";
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
