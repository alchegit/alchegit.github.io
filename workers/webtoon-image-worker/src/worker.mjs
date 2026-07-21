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
  outboxDir: process.env.OUTBOX_DIR || "./outbox",
  referenceOrigins: envOrEmpty("REFERENCE_ASSET_ORIGINS").split(",").map((value) => value.trim()).filter(Boolean),
  maxReferenceBytes: Number(process.env.MAX_REFERENCE_MB || 12) * 1024 * 1024
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
} else {
  for (;;) {
    try {
      await tick();
    } catch (error) {
      console.error("[worker] tick failed", error);
    }
    await sleep(config.pollIntervalMs);
  }
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
    const documents = buildPromptDocuments(job);
    const written = await writePromptBundle(job, documents);

    await updateJob(job.id, {
      status: "done",
      progress: 100,
      result_payload: {
        schemaVersion: "webtoon-worker-result/v2",
        mode: "manual-prompt",
        promptFile: written.promptFiles[0] || null,
        promptFiles: written.promptFiles,
        referenceFiles: written.referenceFiles,
        downloadedReferenceFiles: written.downloadedReferenceFiles,
        maskFiles: written.maskFiles,
        expectedResultFiles: written.expectedResultFiles,
        manifestFile: written.manifestFile,
        promptCount: documents.length,
        packages: documents.map((document) => ({
          panelId: document.panelId,
          panelIndex: document.panelIndex,
          renderStage: document.renderStage,
          requestedQuality: document.requestedQuality,
          promptHash: document.promptHash,
          sourceSpecHash: document.sourceSpecHash,
          regionMaskId: document.regionMask?.id || null
        })),
        imageUrl: null,
        message: "Create one image per prompt file, then import each image into its matching panel in /webtoon/."
      },
      error_message: null
    });

    console.log(`[worker] done ${job.id} -> ${written.promptFiles.length} prompt file(s)`);
  } catch (error) {
    await updateJob(job.id, {
      status: "failed",
      progress: 100,
      error_message: String(error?.message || error)
    });
    throw error;
  }
}

function buildPromptDocuments(job) {
  const payload = job.request_payload || {};
  const packages = Array.isArray(payload.promptPackages) ? payload.promptPackages : [];
  if (packages.length) {
    return packages.map((item, index) => ({
      panelId: String(item.panelId || `panel-${index + 1}`),
      panelIndex: Number.isInteger(item.panelIndex) ? item.panelIndex : index,
      promptHash: String(item.promptHash || ""),
      sourceSpecHash: String(item.sourceSpecHash || ""),
      schemaVersion: String(item.schemaVersion || "webtoon-prompt-package/v2"),
      compilerVersion: String(item.compilerVersion || payload.compilerVersion || "unknown"),
      projectId: String(item.projectId || payload.projectId || job.project_id || "project"),
      episodeId: String(item.episodeId || payload.episodeId || "episode-01"),
      renderStage: item.renderStage === "final" || payload.renderStage === "final" ? "final" : "draft",
      requestedQuality: item.requestedQuality === "high" || payload.requestedQuality === "high" ? "high" : "low",
      sourceDraftVersionId: String(item.sourceDraftVersionId || ""),
      referenceManifest: Array.isArray(item.referenceManifest) ? item.referenceManifest : [],
      expectedResult: item.expectedResult && typeof item.expectedResult === "object" ? item.expectedResult : {},
      regionMask: normalizeRegionMaskAttachment(item.regionMask || payload.regionMask),
      prompt: String(item.prompt || "").trim() || buildManualPrompt(job)
    }));
  }
  return [{
    panelId: String(payload.panel?.id || "panel-1"),
    panelIndex: Number(payload.panelIndex || 0),
    promptHash: "",
    sourceSpecHash: "",
    schemaVersion: "webtoon-prompt-package/legacy",
    compilerVersion: "legacy",
    projectId: String(payload.projectId || job.project_id || "project"),
    episodeId: String(payload.episodeId || "episode-01"),
    renderStage: payload.renderStage === "final" ? "final" : "draft",
    requestedQuality: payload.requestedQuality === "high" ? "high" : "low",
    sourceDraftVersionId: String(payload.sourceDraftVersionId || ""),
    referenceManifest: [],
    expectedResult: payload.expectedResult && typeof payload.expectedResult === "object" ? payload.expectedResult : {},
    regionMask: normalizeRegionMaskAttachment(payload.regionMask),
    prompt: buildManualPrompt(job)
  }];
}

function buildManualPrompt(job) {
  const payload = job.request_payload || {};
  const renderStage = payload.renderStage === "final" ? "final" : "draft";
  const panels = Array.isArray(payload.panels) ? payload.panels : [];
  const targetPanel = payload.panel || null;
  const subject = targetPanel || panels[0] || {};
  const editTarget = ["background", "character", "specific-character", "face", "hands", "outfit", "prop", "lighting", "composition", "full"].includes(payload.editTarget)
    ? payload.editTarget
    : "full";
  const editInstruction = String(payload.editInstruction || "").trim();
  const preserve = Array.isArray(payload.preserve) ? payload.preserve.filter(Boolean) : [];
  const targetRules = {
    background: [
      "Redraw only the environment/background.",
      "Preserve the character design, pose, expression, camera framing, and all overlay-safe spaces exactly.",
      "Do not bake dialogue, narration, or SFX into the image."
    ],
    character: [
      "Redraw only the foreground character or requested person.",
      "Preserve the background, camera framing, lighting direction, and all overlay-safe spaces exactly.",
      "Keep the established outfit, hair, age, body proportions, and identity continuity unless the correction says otherwise."
    ],
    "specific-character": [
      `Redraw only character ID ${String(payload.targetCharacterId || "specified-character")}.`,
      "Preserve every other character, their poses and expressions, the background, camera framing, lighting, and overlay-safe spaces exactly.",
      "Match the approved identity and outfit references for the selected character and do not merge visual traits with another character."
    ],
    face: [
      "Redraw only the face and facial expression of the requested character.",
      "Preserve hair, outfit, body pose, hands, environment, framing, lighting, and overlay-safe spaces.",
      "Match the approved identity reference and express the specified emotion without changing age or facial proportions."
    ],
    hands: [
      "Redraw only the hands and their contact with the specified prop or surface.",
      "Preserve identity, face, outfit, body pose, prop design, environment, framing, and overlay-safe spaces.",
      "Use anatomically plausible fingers, grip, scale, and occlusion."
    ],
    outfit: [
      "Redraw only the clothing and wearable accessories.",
      "Preserve identity, face, body pose, environment, camera, lighting, and overlay-safe spaces.",
      "Match the approved outfit state, colors, damage, and carried accessories exactly."
    ],
    prop: [
      "Redraw only the requested story prop.",
      "Preserve character identity, pose, environment, camera, lighting, and overlay-safe spaces.",
      "Correct the prop shape, count, scale, position, and interaction according to the panel specification."
    ],
    lighting: [
      "Redraw only the lighting, shadow, and color-temperature treatment.",
      "Preserve character design, pose, environment structure, camera framing, and overlay-safe spaces.",
      "Match the approved location light direction and time of day."
    ],
    composition: [
      "Redraw the camera composition and subject placement while preserving character and location identity.",
      "Follow the requested shot size, angle, gaze direction, focal target, and overlay-safe spaces.",
      "Do not alter the intended story beat, outfit state, or key props."
    ],
    full: [
      "Redraw the complete panel while preserving the same story beat and continuity with adjacent panels.",
      "Keep dialogue, narration, and SFX as layout metadata rather than baked image text."
    ]
  };

  const lines = [
    "# ChatGPT Pro Image Prompt",
    "",
    `Job type: ${job.job_type}`,
    `Scenario: ${job.scenario_key || "modern-awakening"}`,
    `Render stage: ${renderStage}`,
    `Requested quality: ${renderStage === "final" ? "high" : "low"}`,
    "",
    "Create an original Korean vertical webtoon-style panel for a modern fantasy awakening story.",
    "Do not copy existing webtoons, anime, games, logos, named characters, or recognizable art styles.",
    "Use a clean original character design, dramatic lighting, readable action, and a strong cliffhanger mood.",
    "Keep text minimal. If text is difficult, leave balloon or system-window areas blank.",
    ...(renderStage === "draft" ? [
      "This is a fast visual draft: use simple linework and limited values, prioritizing composition over detail.",
      "Do not spend detail on textures, hair strands, fingers, or polished rendering. Make blocking and camera intent easy to judge."
    ] : [
      "This is final rendering: treat the approved draft reference as a strict composition lock.",
      "Preserve its camera, blocking, gaze, action, props, and text-safe spaces while finishing anatomy, lighting, materials, and background depth."
    ]),
    "",
    "Panel direction:",
    `- Beat: ${subject.beat || payload.idea || "A weak hunter discovers a mysterious quest window in an abandoned subway platform."}`,
    `- Dialogue: ${subject.line || "Is this quest window only visible to me?"}`,
    `- SFX: ${subject.sfx || "BEEP"}`,
    `- Note: ${subject.note || "Vertical webtoon panel, cinematic modern fantasy, original design."}`,
    `- Narration: ${subject.reaction || subject.beat || ""}`,
    `- Edit target: ${editTarget}`,
    `- Target character ID: ${payload.targetCharacterId || "not-applicable"}`,
    `- Correction request: ${editInstruction || "Improve visual accuracy without changing the intended story beat."}`,
    `- Target region: ${JSON.stringify(payload.targetRegion || { mode: "full-panel" })}`,
    `- Region mask asset ID: ${payload.regionMaskAssetId || "rectangle-metadata-only"}`,
    ...(payload.regionMask ? [
      `- Region mask coverage: ${Number(payload.regionMask.coverage || 0).toFixed(4)}`,
      "- A PNG region mask is included in this bundle. White pixels are the only editable area; transparent pixels must remain unchanged."
    ] : []),
    `- Base approved version ID: ${payload.baseVersionId || "none"}`,
    "",
    "Selective redraw rules:",
    ...targetRules[editTarget].map((rule) => `- ${rule}`),
    ...(preserve.length ? [`- Explicitly preserve: ${preserve.join(", ")}.`] : []),
    ...(payload.sourceImage ? [`- Source image reference: ${payload.sourceImage}`] : []),
    ...(payload.expectedResult ? [`- Expected semantic result: ${JSON.stringify(payload.expectedResult)}`] : []),
    ...(payload.promptPackage?.prompt ? ["", "Approved base panel prompt:", payload.promptPackage.prompt] : []),
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

async function writePromptBundle(job, documents) {
  const dir = path.resolve(config.outboxDir);
  await mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const jobId = safeId(job.id);
  const promptFiles = [];
  const referenceFiles = [];
  const downloadedReferenceFiles = [];
  const maskFiles = [];
  const expectedResultFiles = [];
  for (const document of documents) {
    const panelNumber = String(document.panelIndex + 1).padStart(2, "0");
    const panelId = safeId(document.panelId);
    const projectId = safeId(document.projectId || job.project_id || "project");
    const episodeId = safeId(document.episodeId || "episode-01");
    const promptVersion = safeId(document.compilerVersion || "v1");
    const prefix = `${stamp}_${projectId}_${episodeId}_${jobId}_p${panelNumber}_${panelId}_${promptVersion}`;
    const filePath = path.join(dir, `${prefix}.md`);
    const referencesPath = path.join(dir, `${prefix}_required-reference.json`);
    const expectedPath = path.join(dir, `${prefix}_expected-result.json`);
    let maskPath = null;
    let maskMetadata = null;
    const downloadedReferences = [];
    for (const [referenceIndex, reference] of document.referenceManifest.entries()) {
      if (reference?.type !== "approved-draft" || !reference?.source) continue;
      downloadedReferences.push(await downloadApprovedDraftReference(reference.source, dir, `${prefix}_approved-draft-${referenceIndex + 1}`));
    }
    if (document.regionMask) {
      const decodedMask = decodeRegionMask(document.regionMask);
      maskPath = path.join(dir, `${prefix}_region-mask.png`);
      await writeFile(maskPath, decodedMask.png);
      maskMetadata = decodedMask.metadata;
    }
    await writeFile(filePath, document.prompt, "utf8");
    await writeFile(referencesPath, JSON.stringify({
      schemaVersion: "webtoon-required-reference/v1",
      projectId: document.projectId,
      panelId: document.panelId,
      renderStage: document.renderStage,
      requestedQuality: document.requestedQuality,
      sourceDraftVersionId: document.sourceDraftVersionId,
      references: document.referenceManifest,
      downloadedReferences,
      regionMask: maskMetadata,
      regionMaskFile: maskPath
    }, null, 2), "utf8");
    await writeFile(expectedPath, JSON.stringify({
      schemaVersion: "webtoon-expected-result/v1",
      projectId: document.projectId,
      panelId: document.panelId,
      renderStage: document.renderStage,
      requestedQuality: document.requestedQuality,
      expectedResult: document.expectedResult
    }, null, 2), "utf8");
    promptFiles.push(filePath);
    referenceFiles.push(referencesPath);
    downloadedReferenceFiles.push(downloadedReferences);
    maskFiles.push(maskPath);
    expectedResultFiles.push(expectedPath);
  }
  const manifestFile = path.join(dir, `${stamp}_${jobId}_manifest.json`);
  await writeFile(manifestFile, JSON.stringify({
    schemaVersion: "webtoon-prompt-bundle/v2",
    jobId: job.id,
    jobType: job.job_type,
    createdAt: new Date().toISOString(),
    prompts: documents.map((document, index) => ({
      panelId: document.panelId,
      panelIndex: document.panelIndex,
      renderStage: document.renderStage,
      requestedQuality: document.requestedQuality,
      sourceDraftVersionId: document.sourceDraftVersionId,
      promptHash: document.promptHash,
      sourceSpecHash: document.sourceSpecHash,
      schemaVersion: document.schemaVersion,
      compilerVersion: document.compilerVersion,
      file: promptFiles[index],
      requiredReferenceFile: referenceFiles[index],
      downloadedReferenceFiles: downloadedReferenceFiles[index],
      regionMaskFile: maskFiles[index],
      expectedResultFile: expectedResultFiles[index]
    }))
  }, null, 2), "utf8");
  return { promptFiles, referenceFiles, downloadedReferenceFiles, maskFiles, expectedResultFiles, manifestFile };
}

async function downloadApprovedDraftReference(source, dir, prefix) {
  const url = new URL(String(source));
  const allowedOrigins = new Set(config.referenceOrigins);
  if (config.oracleApiBaseUrl) allowedOrigins.add(new URL(config.oracleApiBaseUrl).origin);
  if (url.protocol !== "https:" || !allowedOrigins.has(url.origin)) {
    throw new Error(`Approved draft reference origin is not allowed: ${url.origin}`);
  }
  const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`Approved draft reference download failed: ${response.status}`);
  const contentType = String(response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const extensions = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };
  const extension = extensions[contentType];
  if (!extension) throw new Error(`Unsupported approved draft type: ${contentType || "unknown"}`);
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > config.maxReferenceBytes) throw new Error("Approved draft reference exceeds size limit.");
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length || buffer.length > config.maxReferenceBytes) throw new Error("Approved draft reference has an invalid size.");
  const filePath = path.join(dir, `${prefix}${extension}`);
  await writeFile(filePath, buffer);
  return { source: url.href, file: filePath, contentType, bytes: buffer.length };
}

function normalizeRegionMaskAttachment(value) {
  if (value === undefined || value === null) return null;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid region mask attachment.");
  }
  return {
    schemaVersion: String(value.schemaVersion || ""),
    id: String(value.id || ""),
    mimeType: String(value.mimeType || ""),
    width: Number(value.width),
    height: Number(value.height),
    coverage: Number(value.coverage),
    encodedBytes: Number(value.encodedBytes),
    bounds: value.bounds && typeof value.bounds === "object" ? value.bounds : null,
    hash: String(value.hash || ""),
    dataUrl: String(value.dataUrl || "")
  };
}

function decodeRegionMask(mask) {
  if (mask.schemaVersion !== "webtoon-region-mask/v1" || mask.mimeType !== "image/png") {
    throw new Error("Unsupported region mask attachment.");
  }
  const match = /^data:image\/png;base64,([a-z0-9+/]+={0,2})$/i.exec(mask.dataUrl);
  if (!match) throw new Error("Region mask does not contain a valid PNG data URL.");
  const png = Buffer.from(match[1], "base64");
  if (!png.length || png.length > 256 * 1024) throw new Error("Region mask PNG exceeds 256KB.");
  if (
    png.length < 24
    || png.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a"
    || png.subarray(12, 16).toString("ascii") !== "IHDR"
  ) {
    throw new Error("Region mask PNG signature is invalid.");
  }
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (width !== 320 || height !== 480 || mask.width !== width || mask.height !== height) {
    throw new Error("Region mask dimensions must be 320x480.");
  }
  const { dataUrl: _dataUrl, ...metadata } = mask;
  return {
    png,
    metadata: {
      ...metadata,
      encodedBytes: png.length
    }
  };
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
    created_at: job.created_at || job.createdAt,
    parent_job_id: job.parent_job_id || job.parentJobId || "",
    panel_id: job.panel_id || job.panelId || "",
    prompt_package_id: job.prompt_package_id || job.promptPackageId || "",
    attempt: Number(job.attempt || 1)
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
