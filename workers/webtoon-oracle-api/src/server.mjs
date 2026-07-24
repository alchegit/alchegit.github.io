import crypto from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, open, readFile, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import multer from "multer";
import oracledb from "oracledb";
import {
  STORYHEAVEN_STORY_LIMITS,
  STORYHEAVEN_NICKNAME_LIMITS,
  normalizeStoryHeavenNickname,
  storyHeavenRoundSchedule,
  temporaryStoryHeavenNickname,
  validateStoryHeavenPacket,
  validateStoryHeavenNickname
} from "./storyheaven.mjs";

await loadDotEnv();

const contentLimits = Object.freeze({
  title: 60,
  story: 3000,
  panelMin: 1,
  panelMax: 20,
  panel: Object.freeze({
    id: 120,
    beat: 180,
    camera: 40,
    line: 80,
    sfx: 16,
    phase: 40,
    note: 180,
    imageKey: 200,
    imageName: 120
  }),
  projectJsonBytes: 1536 * 1024,
  jobRequestBytes: 768 * 1024,
  jobResultBytes: 512 * 1024,
  regionMaskBytes: 256 * 1024,
  errorMessage: 1000,
  uploadMetadata: Object.freeze({
    originalName: 120,
    source: 60,
    note: 500
  })
});

const generationCosts = Object.freeze({
  draft_generation: 3,
  episode_generation: 3,
  panel_generation: 0,
  panel_regenerate: 1
});

const uploadMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const storyHeavenReportCategories = new Set([
  "plagiarism",
  "rights",
  "impersonation",
  "personal_info",
  "hate_safety",
  "spam",
  "other"
]);

const config = {
  host: process.env.HOST || "127.0.0.1",
  port: Number(process.env.PORT || 8088),
  publicBaseUrl: trimTrailingSlash(process.env.PUBLIC_BASE_URL || ""),
  allowedOrigins: splitCsv(requiredEnv("ALLOWED_ORIGINS")),
  workerToken: requiredStrongSecret("WEBTOON_WORKER_TOKEN"),
  adminUserId: process.env.ADMIN_USER_ID || "admin",
  adminEmail: normalizeEmail(requiredEnv("ADMIN_GOOGLE_EMAIL")),
  adminDisplayName: process.env.ADMIN_DISPLAY_NAME || "NeoKIM",
  adminOnlyCreation: parseBoolean(process.env.ADMIN_ONLY_CREATION, true),
  supabaseUrl: trimTrailingSlash(requiredEnv("SUPABASE_URL")),
  supabasePublishableKey: requiredEnv("SUPABASE_PUBLISHABLE_KEY"),
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  securityHashSecret: requiredStrongSecret("SECURITY_HASH_SECRET"),
  securityRetentionDays: clampInt(process.env.SECURITY_RETENTION_DAYS, 7, 90, 30),
  adminPlanFile: process.env.WEBTOON_ADMIN_PLAN_FILE || "",
  oracleUser: requiredEnv("ORACLE_USER"),
  oraclePassword: requiredEnv("ORACLE_PASSWORD"),
  oracleConnectString: requiredEnv("ORACLE_CONNECT_STRING"),
  poolMin: Number(process.env.ORACLE_POOL_MIN || 1),
  poolMax: Number(process.env.ORACLE_POOL_MAX || 4),
  assetDir: path.resolve(process.env.WEBTOON_ASSET_DIR || "./data/assets"),
  tmpDir: path.resolve(process.env.WEBTOON_TMP_DIR || "./data/tmp"),
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 12),
  rateLimitWindowMs: clampInt(process.env.RATE_LIMIT_WINDOW_MS, 10_000, 600_000, 60_000),
  rateLimitPerWindow: clampInt(process.env.RATE_LIMIT_PER_WINDOW, 10, 300, 60),
  creationRateLimitPerWindow: clampInt(process.env.CREATION_RATE_LIMIT_PER_WINDOW, 1, 30, 10),
  adminRateLimitPerWindow: clampInt(process.env.ADMIN_RATE_LIMIT_PER_WINDOW, 5, 120, 30)
};

if (!config.allowedOrigins.length) {
  throw new Error("ALLOWED_ORIGINS must contain at least one trusted origin");
}

oracledb.fetchAsString = [oracledb.CLOB];
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

await mkdir(config.assetDir, { recursive: true });
await mkdir(config.tmpDir, { recursive: true });

const pool = await oracledb.createPool({
  user: config.oracleUser,
  password: config.oraclePassword,
  connectString: config.oracleConnectString,
  poolMin: config.poolMin,
  poolMax: config.poolMax,
  poolIncrement: 1
});

const upload = multer({
  dest: config.tmpDir,
  fileFilter(_req, file, callback) {
    if (uploadMimeTypes.has(file.mimetype)) {
      callback(null, true);
      return;
    }
    callback(httpError("unsupported_image_type", 415));
  },
  limits: {
    fileSize: config.maxUploadMb * 1024 * 1024,
    files: 1
  }
});

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", "loopback");
app.set("query parser", "simple");
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || config.allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(httpError("origin_not_allowed", 403));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type", "X-Webtoon-Worker-Token"],
  credentials: false,
  maxAge: 600,
  optionsSuccessStatus: 204
}));
app.use(express.json({ limit: "2mb" }));
app.use("/api/webtoon", createRateLimiter({
  name: "api_ip",
  limit: config.rateLimitPerWindow,
  windowMs: config.rateLimitWindowMs,
  keyResolver: (req) => `ip:${clientIp(req)}`
}));
app.use("/api/webtoon", (_req, res, next) => {
  res.set("Cache-Control", "no-store, max-age=0");
  next();
});
app.use("/api/storyheaven", createRateLimiter({
  name: "storyheaven_ip",
  limit: config.rateLimitPerWindow,
  windowMs: config.rateLimitWindowMs,
  keyResolver: (req) => `storyheaven:${clientIp(req)}`
}));
app.use("/api/storyheaven", (_req, res, next) => {
  res.set("Cache-Control", "no-store, max-age=0");
  next();
});
app.use("/assets/webtoon", express.static(config.assetDir, {
  immutable: true,
  maxAge: "30d"
}));

const creationRateLimiter = createRateLimiter({
  name: "creation_user",
  limit: config.creationRateLimitPerWindow,
  windowMs: config.rateLimitWindowMs,
  keyResolver: (req) => `user:${req.user?.id || "unknown"}`
});

const adminRateLimiter = createRateLimiter({
  name: "admin_user",
  limit: config.adminRateLimitPerWindow,
  windowMs: config.rateLimitWindowMs,
  keyResolver: (req) => `admin:${req.user?.id || "unknown"}`
});

const assetUploadRateLimiter = createRateLimiter({
  name: "asset_upload_user",
  limit: config.adminRateLimitPerWindow,
  windowMs: config.rateLimitWindowMs,
  keyResolver: (req) => `asset:${req.user?.id || "unknown"}`
});

app.get("/health", async (_req, res, next) => {
  try {
    const result = await withConnection((connection) => connection.execute("select 1 as ok from dual"));
    if (result.rows?.[0]?.OK !== 1) {
      throw new Error("health_check_failed");
    }
    res.set("Cache-Control", "no-store, max-age=0").json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get("/api/webtoon/profile", requireUser, async (req, res, next) => {
  try {
    const profile = await ensureUserProfile(req.user, req);
    res.json(withCreationCapability(profile, req.user));
  } catch (error) {
    next(error);
  }
});

app.get("/api/storyheaven/feed", optionalUser, async (req, res, next) => {
  try {
    const stories = await listStoryHeavenFeed({
      userId: req.user?.id || null,
      limit: clampInt(req.query.limit, 1, 40, 24)
    });
    res.json({
      schemaVersion: "storyheaven-feed/v1",
      season: "founding",
      rankingPolicy: "reader_likes_only",
      stories
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/storyheaven/rounds/current", optionalUser, async (req, res, next) => {
  try {
    const round = await getCurrentStoryHeavenRound(req.user?.id || null);
    res.json({ round });
  } catch (error) {
    next(error);
  }
});

app.get("/api/storyheaven/profile", requireUser, async (req, res, next) => {
  try {
    const profile = await ensureUserProfile(req.user, req);
    res.json({ profile: withCreationCapability(profile, req.user) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/storyheaven/nicknames/availability", optionalUser, async (req, res, next) => {
  try {
    const result = await storyHeavenNicknameAvailability(req.query.value, req.user?.id || null);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.patch("/api/storyheaven/me/nickname", requireUser, requireJsonBody, async (req, res, next) => {
  try {
    await ensureUserProfile(req.user, req);
    const profile = await updateStoryHeavenNickname(req.user, req.body?.nickname, req);
    res.json({ profile: withCreationCapability(profile, req.user) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/storyheaven/me/stories", requireUser, async (req, res, next) => {
  try {
    await ensureUserProfile(req.user, req);
    res.json({ stories: await listMyStoryHeavenStories(req.user.id) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/storyheaven/stories/:id", optionalUser, async (req, res, next) => {
  try {
    const story = await getStoryHeavenStory(req.params.id, req.user || null);
    res.json({ story });
  } catch (error) {
    next(error);
  }
});

app.post("/api/storyheaven/stories", requireUser, creationRateLimiter, requireJsonBody, async (req, res, next) => {
  try {
    const profile = await ensureUserProfile(req.user, req);
    assertActiveStoryHeavenNickname(profile);
    const story = await createStoryHeavenDraft(req.user.id, req.body?.packet || req.body || {});
    res.status(201).json({ story, limits: STORYHEAVEN_STORY_LIMITS });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/storyheaven/stories/:id/draft", requireUser, creationRateLimiter, requireJsonBody, async (req, res, next) => {
  try {
    await ensureUserProfile(req.user, req);
    const story = await saveStoryHeavenDraft(req.params.id, req.user.id, req.body?.packet || req.body || {});
    res.json({ story });
  } catch (error) {
    next(error);
  }
});

app.post("/api/storyheaven/stories/:id/submit", requireUser, creationRateLimiter, requireJsonBody, async (req, res, next) => {
  try {
    const profile = await ensureUserProfile(req.user, req);
    assertActiveStoryHeavenNickname(profile);
    const story = await submitStoryHeavenStory(req.params.id, req.user.id, req.body || {});
    res.json({ story });
  } catch (error) {
    next(error);
  }
});

app.post("/api/storyheaven/stories/:id/like", requireUser, requireJsonBody, async (req, res, next) => {
  try {
    await ensureUserProfile(req.user, req);
    const result = await setStoryHeavenLike(req.params.id, req.user.id, true, req);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.delete("/api/storyheaven/stories/:id/like", requireUser, async (req, res, next) => {
  try {
    await ensureUserProfile(req.user, req);
    const result = await setStoryHeavenLike(req.params.id, req.user.id, false, req);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/api/storyheaven/stories/:id/report", requireUser, creationRateLimiter, requireJsonBody, async (req, res, next) => {
  try {
    await ensureUserProfile(req.user, req);
    res.status(201).json(await createStoryHeavenReport(req.params.id, req.user.id, req.body || {}));
  } catch (error) {
    next(error);
  }
});

app.get("/api/storyheaven/me/notifications", requireUser, async (req, res, next) => {
  try {
    await ensureUserProfile(req.user, req);
    res.json({ notifications: await listStoryHeavenNotifications(req.user.id) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/storyheaven/me/notifications/:id/read", requireUser, requireJsonBody, async (req, res, next) => {
  try {
    await ensureUserProfile(req.user, req);
    res.json(await readStoryHeavenNotification(req.params.id, req.user.id));
  } catch (error) {
    next(error);
  }
});

app.post("/api/storyheaven/reports/:id/appeal", requireUser, creationRateLimiter, requireJsonBody, async (req, res, next) => {
  try {
    await ensureUserProfile(req.user, req);
    res.status(201).json(await createStoryHeavenAppeal(req.params.id, req.user.id, req.body || {}));
  } catch (error) {
    next(error);
  }
});

app.post("/api/storyheaven/operator/stories/:id/endorsement", requireUser, requireAdminAccount, adminRateLimiter, requireJsonBody, async (req, res, next) => {
  try {
    await ensureUserProfile(req.user, req);
    const result = await setStoryHeavenEndorsement(req.params.id, req.body || {}, req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/api/storyheaven/operator/submissions", requireUser, requireAdminAccount, adminRateLimiter, async (_req, res, next) => {
  try {
    res.json({ submissions: await listStoryHeavenSubmissions() });
  } catch (error) {
    next(error);
  }
});

app.get("/api/storyheaven/operator/reports", requireUser, requireAdminAccount, adminRateLimiter, async (_req, res, next) => {
  try {
    res.json({ reports: await listStoryHeavenReports() });
  } catch (error) {
    next(error);
  }
});

app.post("/api/storyheaven/operator/reports/:id/resolve", requireUser, requireAdminAccount, adminRateLimiter, requireJsonBody, async (req, res, next) => {
  try {
    await ensureUserProfile(req.user, req);
    res.json(await resolveStoryHeavenReport(req.params.id, req.user.id, req.body || {}));
  } catch (error) {
    next(error);
  }
});

app.post("/api/storyheaven/operator/appeals/:id/resolve", requireUser, requireAdminAccount, adminRateLimiter, requireJsonBody, async (req, res, next) => {
  try {
    await ensureUserProfile(req.user, req);
    res.json(await resolveStoryHeavenAppeal(req.params.id, req.user.id, req.body || {}));
  } catch (error) {
    next(error);
  }
});

app.get("/api/storyheaven/operator/rounds/pending", requireUser, requireAdminAccount, adminRateLimiter, async (_req, res, next) => {
  try {
    res.json({ rounds: await listPendingStoryHeavenRounds() });
  } catch (error) {
    next(error);
  }
});

app.get("/api/storyheaven/operator/rounds/:id/audit", requireUser, requireAdminAccount, adminRateLimiter, async (req, res, next) => {
  try {
    res.json(await getStoryHeavenVoteAudit(req.params.id));
  } catch (error) {
    next(error);
  }
});

app.post("/api/storyheaven/operator/votes/:id/invalidate", requireUser, requireAdminAccount, adminRateLimiter, requireJsonBody, async (req, res, next) => {
  try {
    await ensureUserProfile(req.user, req);
    res.json(await invalidateStoryHeavenVote(req.params.id, req.body || {}, req.user.id));
  } catch (error) {
    next(error);
  }
});

app.post("/api/storyheaven/operator/entries/:id/disqualify", requireUser, requireAdminAccount, adminRateLimiter, requireJsonBody, async (req, res, next) => {
  try {
    await ensureUserProfile(req.user, req);
    res.json(await disqualifyStoryHeavenEntry(req.params.id, req.body || {}, req.user.id));
  } catch (error) {
    next(error);
  }
});

app.post("/api/storyheaven/operator/stories/:id/review", requireUser, requireAdminAccount, adminRateLimiter, requireJsonBody, async (req, res, next) => {
  try {
    await ensureUserProfile(req.user, req);
    const story = await reviewStoryHeavenSubmission(req.params.id, req.user.id, req.body || {});
    res.json({ story });
  } catch (error) {
    next(error);
  }
});

app.post("/api/storyheaven/operator/rounds/:id/finalize", requireUser, requireAdminAccount, adminRateLimiter, requireJsonBody, async (req, res, next) => {
  try {
    await ensureUserProfile(req.user, req);
    const result = await finalizeStoryHeavenRound(req.params.id, req.user.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/api/webtoon/acorns/claim", requireUser, async (req, res, next) => {
  try {
    const result = await claimDailyAcorns(req.user, req);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/api/webtoon/projects/public/latest", async (_req, res, next) => {
  try {
    const project = await latestPublicProject();
    res.json({ project });
  } catch (error) {
    next(error);
  }
});

app.get("/api/webtoon/projects/:id", optionalUser, async (req, res, next) => {
  try {
    const project = await getProject(req.params.id);
    if (!project) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    if (!project.isPublic && (!req.user || (!isAdminIdentity(req.user) && project.userId !== req.user.id))) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json({ project });
  } catch (error) {
    next(error);
  }
});

app.post("/api/webtoon/projects", requireUser, creationRateLimiter, requireCreatorAccount, requireJsonBody, async (req, res, next) => {
  try {
    const project = await upsertProject({ ...req.body, id: req.body?.id || randomId() }, req.user, req);
    res.status(201).json({ project });
  } catch (error) {
    next(error);
  }
});

app.put("/api/webtoon/projects/:id", requireUser, creationRateLimiter, requireCreatorAccount, requireJsonBody, async (req, res, next) => {
  try {
    const project = await upsertProject({ ...req.body, id: req.params.id }, req.user, req);
    res.json({ project });
  } catch (error) {
    next(error);
  }
});

app.post("/api/webtoon/assets/reference", requireUser, assetUploadRateLimiter, requireCreatorAccount, upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "image_required" });
      return;
    }
    const asset = await registerUploadedAsset(req, req.user);
    res.status(201).json({ asset });
  } catch (error) {
    next(error);
  } finally {
    if (req.file?.path) {
      unlink(req.file.path).catch(() => {});
    }
  }
});

app.post("/api/webtoon/jobs", requireUser, creationRateLimiter, requireCreatorAccount, requireJsonBody, async (req, res, next) => {
  try {
    const result = await createJob(req.body || {}, req.user, req);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/api/webtoon/admin/users", requireUser, requireAdminAccount, adminRateLimiter, async (req, res, next) => {
  try {
    const users = await listUsers({
      search: req.query.search,
      limit: clampInt(req.query.limit, 1, 100, 50)
    });
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/webtoon/admin/users/:id/acorns", requireUser, requireAdminAccount, adminRateLimiter, requireJsonBody, async (req, res, next) => {
  try {
    const profile = await setUserAcorns(req.params.id, req.body || {}, req.user, req);
    res.json({ profile });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/webtoon/admin/users/:id/status", requireUser, requireAdminAccount, adminRateLimiter, requireJsonBody, async (req, res, next) => {
  try {
    const result = await setUserStatus(req.params.id, req.body || {}, req.user, req);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.get("/api/webtoon/admin/security/events", requireUser, requireAdminAccount, adminRateLimiter, async (req, res, next) => {
  try {
    const events = await listSecurityEvents(clampInt(req.query.limit, 1, 100, 40));
    res.json({ events, retentionDays: config.securityRetentionDays, rawIpStored: false });
  } catch (error) {
    next(error);
  }
});

app.get("/api/webtoon/admin/plan", requireUser, requireAdminAccount, adminRateLimiter, async (_req, res, next) => {
  try {
    res.json(await loadAdminPlan());
  } catch (error) {
    next(error);
  }
});

app.get("/api/webtoon/jobs/ready", requireWorker, async (req, res, next) => {
  try {
    const limit = clampInt(req.query.limit, 1, 10, 1);
    const jobs = await readyJobs(limit);
    res.json({ jobs });
  } catch (error) {
    next(error);
  }
});

app.get("/api/webtoon/jobs/:id/status", requireUser, async (req, res, next) => {
  try {
    const result = await getJobStatus(req.params.id, req.user);
    if (!result) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
});

app.post("/api/webtoon/jobs/:id/retry", requireWorker, async (req, res, next) => {
  try {
    const job = await retryFailedJob(req.params.id);
    if (!job) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json({ job });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/webtoon/jobs/:id", requireWorker, async (req, res, next) => {
  try {
    const job = await updateJob(req.params.id, req.body || {});
    if (!job) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json({ job });
  } catch (error) {
    next(error);
  }
});

app.post("/api/webtoon/assets/upload", requireWorker, upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "image_required" });
      return;
    }
    const asset = await registerUploadedAsset(req);
    res.status(201).json({ asset });
  } catch (error) {
    next(error);
  } finally {
    if (req.file?.path) {
      unlink(req.file.path).catch(() => {});
    }
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: "not_found" });
});

app.use((error, _req, res, _next) => {
  const isUploadError = error instanceof multer.MulterError;
  const isUploadLimit = error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE";
  const status = isUploadLimit ? 413 : isUploadError ? 400 : error.status || 500;
  const message = isUploadLimit
    ? "image_too_large"
    : isUploadError
      ? "invalid_upload"
      : status >= 500
        ? "server_error"
        : error.message;
  if (status >= 500) {
    console.error(error);
  }
  res.status(status).json({ error: message, ...(Array.isArray(error.details) ? { details: error.details } : {}) });
});

const server = app.listen(config.port, config.host, () => {
  console.log(`[webtoon-oracle-api] listening on ${config.host}:${config.port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    server.close();
    await pool.close(5).catch(() => {});
    process.exit(0);
  });
}

async function requireUser(req, res, next) {
  try {
    const token = bearerToken(req);
    if (!token) {
      res.status(401).json({ error: "google_login_required" });
      return;
    }

    const user = await verifySupabaseGoogleUser(token);
    const status = await existingAccountStatus(user.id);
    if (status === "banned") {
      await recordSecurityEvent({
        req,
        userId: user.id,
        eventType: "banned_access",
        severity: "high"
      }).catch(() => {});
      res.status(403).json({ error: "account_banned" });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    await recordSecurityEvent({
      req,
      eventType: "auth_failed",
      severity: "warn",
      details: { code: error.message }
    }).catch(() => {});
    res.status(error.status || 401).json({ error: error.message || "invalid_auth_token" });
  }
}

async function optionalUser(req, res, next) {
  if (!bearerToken(req)) {
    next();
    return;
  }
  await requireUser(req, res, next);
}

function requireAdminAccount(req, res, next) {
  if (req.user && isAdminIdentity(req.user)) {
    next();
    return;
  }
  res.status(403).json({ error: "admin_account_required" });
}

function requireCreatorAccount(req, res, next) {
  if (canCreate(req.user)) {
    next();
    return;
  }
  recordSecurityEvent({
    req,
    userId: req.user?.id,
    eventType: "blocked_creation_attempt",
    severity: "warn"
  }).catch(() => {});
  res.status(403).json({ error: "development_in_progress" });
}

function requireJsonBody(req, res, next) {
  if (req.is("application/json")) {
    next();
    return;
  }
  res.status(415).json({ error: "json_content_type_required" });
}

function requireWorker(req, res, next) {
  const workerOk = constantTokenEquals(req.get("X-Webtoon-Worker-Token"), config.workerToken);
  if (workerOk) {
    next();
    return;
  }
  res.status(401).json({ error: "worker_token_required" });
}

async function ensureAdminProfile() {
  return withTransaction(async (connection) => {
    const existing = await connection.execute(
      `select user_id, email, display_name, is_admin, acorns, guide_completed
         from webtoon_profiles
        where user_id = :user_id
        for update`,
      { user_id: config.adminUserId }
    );

    if (!existing.rows.length) {
      await connection.execute(
        `insert into webtoon_profiles (
          user_id, email, display_name, is_admin, account_type,
          nickname, nickname_normalized, nickname_status, nickname_changed_at,
          acorns, guide_completed, profile_json
        ) values (
          :user_id, :email, :display_name, 'Y', 'admin',
          :nickname, :nickname_normalized, 'active', systimestamp,
          20, 'N', :profile_json
        )`,
        {
          user_id: config.adminUserId,
          email: config.adminEmail,
          display_name: config.adminDisplayName,
          nickname: "시스템 보관함",
          nickname_normalized: normalizeStoryHeavenNickname("시스템 보관함"),
          profile_json: clobJson({ source: "oracle-api-bootstrap" })
        }
      );

      await connection.execute(
        `insert into webtoon_acorn_ledger (
          id, user_id, delta, balance_after, reason, metadata_json
        ) values (
          :id, :user_id, 20, 20, 'signup_bonus', :metadata_json
        )`,
        {
          id: randomId(),
          user_id: config.adminUserId,
          metadata_json: clobJson({ source: "oracle-api-bootstrap" })
        }
      );
    }

    const profile = await connection.execute(
      `select user_id, email, display_name, is_admin, acorns, guide_completed
         from webtoon_profiles
        where user_id = :user_id`,
      { user_id: config.adminUserId }
    );

    return mapProfile(profile.rows[0]);
  });
}

async function ensureUserProfile(user, req) {
  const admin = isAdminIdentity(user);
  const ipHash = hashClientIp(req);
  const userAgent = classifyUserAgent(req.get("user-agent"));

  return withTransaction(async (connection) => {
    const existingResult = await connection.execute(
      `select user_id, email, display_name, is_admin, account_type, nickname,
              nickname_normalized, nickname_status, nickname_changed_at, acorns, account_status,
              banned_at, ban_reason, last_seen_at, login_count, last_ip_hash,
              last_user_agent, guide_completed, created_at, updated_at
         from webtoon_profiles
        where user_id = :user_id
        for update`,
      { user_id: user.id }
    );

    const existing = existingResult.rows[0];
    if (!existing) {
      const startingAcorns = admin ? 0 : 20;
      const storyHeavenIdentity = await allocateInitialStoryHeavenIdentity(connection, user.id, admin, user.displayName);
      await connection.execute(
        `insert into webtoon_profiles (
          user_id, email, display_name, is_admin, account_type,
          nickname, nickname_normalized, nickname_status, nickname_changed_at,
          acorns, account_status,
          last_seen_at, login_count, last_ip_hash, last_user_agent,
          guide_completed, profile_json
        ) values (
          :user_id, :email, :display_name, :is_admin, :account_type,
          :nickname, :nickname_normalized, :nickname_status, systimestamp,
          :acorns, 'active',
          systimestamp, 1, :last_ip_hash, :last_user_agent,
          'N', :profile_json
        )`,
        {
          user_id: user.id,
          email: user.email,
          display_name: user.displayName,
          is_admin: admin ? "Y" : "N",
          account_type: admin ? "admin" : "human",
          nickname: storyHeavenIdentity.nickname,
          nickname_normalized: storyHeavenIdentity.normalized,
          nickname_status: storyHeavenIdentity.status,
          acorns: startingAcorns,
          last_ip_hash: ipHash,
          last_user_agent: userAgent,
          profile_json: clobJson({ source: "supabase-google", provider: "google" })
        }
      );

      if (!admin) {
        await connection.execute(
          `insert into webtoon_acorn_ledger (
            id, user_id, delta, balance_after, reason, metadata_json
          ) values (
            :id, :user_id, 20, 20, 'signup_bonus', :metadata_json
          )`,
          {
            id: randomId(),
            user_id: user.id,
            metadata_json: clobJson({ source: "google_signup" })
          }
        );
      }

      await insertSecurityEvent(connection, {
        req,
        userId: user.id,
        eventType: "google_account_created",
        severity: "info"
      });
    } else {
      const lastSeenAt = existing.LAST_SEEN_AT ? new Date(existing.LAST_SEEN_AT).getTime() : 0;
      const isNewSession = !lastSeenAt
        || Date.now() - lastSeenAt > 30 * 60 * 1000
        || existing.LAST_IP_HASH !== ipHash;

      await connection.execute(
        `update webtoon_profiles
            set email = :email,
                display_name = :display_name,
                is_admin = :is_admin,
                account_type = :account_type,
                account_status = case when :is_admin = 'Y' then 'active' else account_status end,
                banned_at = case when :is_admin = 'Y' then null else banned_at end,
                ban_reason = case when :is_admin = 'Y' then null else ban_reason end,
                last_seen_at = systimestamp,
                login_count = login_count + :login_increment,
                last_ip_hash = :last_ip_hash,
                last_user_agent = :last_user_agent
          where user_id = :user_id`,
        {
          user_id: user.id,
          email: user.email,
          display_name: user.displayName,
          is_admin: admin ? "Y" : "N",
          account_type: admin ? "admin" : "human",
          login_increment: isNewSession ? 1 : 0,
          last_ip_hash: ipHash,
          last_user_agent: userAgent
        }
      );

      if (isNewSession) {
        await insertSecurityEvent(connection, {
          req,
          userId: user.id,
          eventType: "google_login",
          severity: "info"
        });
      }

      if (!existing.NICKNAME || !existing.NICKNAME_NORMALIZED) {
        const storyHeavenIdentity = await allocateInitialStoryHeavenIdentity(connection, user.id, admin, user.displayName);
        await connection.execute(
          `update webtoon_profiles
              set nickname = :nickname,
                  nickname_normalized = :nickname_normalized,
                  nickname_status = :nickname_status,
                  nickname_changed_at = systimestamp
            where user_id = :user_id`,
          {
            user_id: user.id,
            nickname: storyHeavenIdentity.nickname,
            nickname_normalized: storyHeavenIdentity.normalized,
            nickname_status: storyHeavenIdentity.status
          }
        );
      }
    }

    const profile = await connection.execute(
      `select user_id, email, display_name, is_admin, account_type, nickname,
              nickname_normalized, nickname_status, nickname_changed_at, acorns, account_status,
              banned_at, ban_reason, last_seen_at, login_count, last_ip_hash,
              last_user_agent, guide_completed, created_at, updated_at
         from webtoon_profiles
        where user_id = :user_id`,
      { user_id: user.id }
    );
    return mapProfile(profile.rows[0]);
  });
}

async function allocateInitialStoryHeavenIdentity(connection, userId, isAdmin, displayName) {
  const preferred = isAdmin ? validateStoryHeavenNickname(displayName || config.adminDisplayName) : null;
  if (preferred?.ok && !(await isStoryHeavenNicknameUnavailable(connection, preferred.normalized, userId))) {
    return { nickname: preferred.nickname, normalized: preferred.normalized, status: "active" };
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const nickname = temporaryStoryHeavenNickname(userId, attempt);
    const normalized = normalizeStoryHeavenNickname(nickname);
    if (!(await isStoryHeavenNicknameUnavailable(connection, normalized, userId))) {
      return { nickname, normalized, status: isAdmin ? "active" : "temporary" };
    }
  }
  throw httpError("nickname_allocation_failed", 503);
}

async function storyHeavenNicknameAvailability(value, userId = null) {
  const validation = validateStoryHeavenNickname(value);
  if (!validation.ok) {
    return { available: false, reason: validation.error, limits: STORYHEAVEN_NICKNAME_LIMITS };
  }
  const unavailable = await withConnection((connection) => (
    isStoryHeavenNicknameUnavailable(connection, validation.normalized, userId)
  ));
  return {
    available: !unavailable,
    reason: unavailable ? "nickname_unavailable" : null,
    nickname: validation.nickname,
    limits: STORYHEAVEN_NICKNAME_LIMITS
  };
}

async function isStoryHeavenNicknameUnavailable(connection, normalized, userId = null) {
  const result = await connection.execute(
    `select (
       (select count(*) from webtoon_profiles
         where nickname_normalized = :nickname_normalized
           and (:user_id is null or user_id <> :user_id))
       + (select count(*) from storyheaven_reserved_names
           where nickname_normalized = :nickname_normalized)
       + (select count(*) from storyheaven_nickname_history
           where nickname_normalized = :nickname_normalized
             and reserved_until > systimestamp
             and (:user_id is null or user_id <> :user_id))
     ) as unavailable_count
     from dual`,
    { nickname_normalized: normalized, user_id: userId }
  );
  return Number(result.rows?.[0]?.UNAVAILABLE_COUNT || 0) > 0;
}

async function updateStoryHeavenNickname(user, value, req) {
  const validation = validateStoryHeavenNickname(value);
  if (!validation.ok) {
    throw httpError(validation.error, 400);
  }

  try {
    return await withTransaction(async (connection) => {
      const result = await connection.execute(
        `select user_id, email, display_name, is_admin, account_type, nickname,
                nickname_normalized, nickname_status, nickname_changed_at, acorns,
                account_status, guide_completed
           from webtoon_profiles
          where user_id = :user_id
          for update`,
        { user_id: user.id }
      );
      const current = result.rows[0];
      if (!current) {
        throw httpError("profile_not_found", 404);
      }
      if (current.NICKNAME_NORMALIZED === validation.normalized) {
        return mapProfile(current);
      }

      const changedAt = current.NICKNAME_CHANGED_AT ? new Date(current.NICKNAME_CHANGED_AT).getTime() : 0;
      const cooldownMs = STORYHEAVEN_NICKNAME_LIMITS.cooldownDays * 24 * 60 * 60 * 1000;
      if (current.NICKNAME_STATUS === "active" && changedAt && Date.now() - changedAt < cooldownMs) {
        const error = httpError("nickname_change_cooldown", 409);
        error.details = [{
          availableAt: new Date(changedAt + cooldownMs).toISOString(),
          cooldownDays: STORYHEAVEN_NICKNAME_LIMITS.cooldownDays
        }];
        throw error;
      }

      if (await isStoryHeavenNicknameUnavailable(connection, validation.normalized, user.id)) {
        throw httpError("nickname_unavailable", 409);
      }

      if (current.NICKNAME && current.NICKNAME_NORMALIZED) {
        await connection.execute(
          `insert into storyheaven_nickname_history (
             id, user_id, nickname, nickname_normalized, change_source, reserved_until
           ) values (
             :id, :user_id, :nickname, :nickname_normalized, 'user',
             systimestamp + numtodsinterval(:hold_days, 'DAY')
           )`,
          {
            id: randomId(),
            user_id: user.id,
            nickname: current.NICKNAME,
            nickname_normalized: current.NICKNAME_NORMALIZED,
            hold_days: STORYHEAVEN_NICKNAME_LIMITS.historyHoldDays
          }
        );
      }

      await connection.execute(
        `update webtoon_profiles
            set nickname = :nickname,
                nickname_normalized = :nickname_normalized,
                nickname_status = 'active',
                nickname_changed_at = systimestamp
          where user_id = :user_id`,
        {
          user_id: user.id,
          nickname: validation.nickname,
          nickname_normalized: validation.normalized
        }
      );
      await insertSecurityEvent(connection, {
        req,
        userId: user.id,
        eventType: "storyheaven_nickname_changed",
        severity: "info"
      });

      const updated = await connection.execute(
        `select user_id, email, display_name, is_admin, account_type, nickname,
                nickname_normalized, nickname_status, nickname_changed_at, acorns,
                account_status, guide_completed
           from webtoon_profiles
          where user_id = :user_id`,
        { user_id: user.id }
      );
      return mapProfile(updated.rows[0]);
    });
  } catch (error) {
    if (String(error?.message || "").includes("ORA-00001")) {
      throw httpError("nickname_unavailable", 409);
    }
    throw error;
  }
}

async function listStoryHeavenFeed({ userId = null, limit = 24 } = {}) {
  return withConnection(async (connection) => {
    const result = await connection.execute(
      `select * from (
         select s.id, s.slug, s.title, s.logline, s.public_synopsis, s.genre,
                s.tags_json, s.content_rating, s.content_origin,
                s.competition_eligible, s.ai_disclosure_version, s.cover_path,
                s.published_at, p.nickname, p.display_name, p.account_type,
                (select count(*) from storyheaven_likes likes where likes.story_id = s.id) as like_count,
                (select count(*)
                   from storyheaven_votes weekly_votes
                   join storyheaven_rounds weekly_round on weekly_round.id = weekly_votes.round_id
                  where weekly_votes.story_id = s.id
                    and weekly_votes.active = 'Y'
                    and weekly_round.round_status in ('open', 'auditing', 'tie_pending')) as weekly_vote_count,
                (select max(weekly_round.id)
                   from storyheaven_entries weekly_entry
                   join storyheaven_rounds weekly_round on weekly_round.id = weekly_entry.round_id
                  where weekly_entry.story_id = s.id
                    and weekly_entry.entry_status in ('candidate', 'winner', 'runner_up')
                    and weekly_round.round_status in ('open', 'auditing', 'tie_pending')) as weekly_round_id,
                case when exists (
                  select 1
                    from storyheaven_votes weekly_mine
                    join storyheaven_rounds weekly_round on weekly_round.id = weekly_mine.round_id
                   where weekly_mine.story_id = s.id
                     and weekly_mine.voter_user_id = :viewer_user_id
                     and weekly_mine.active = 'Y'
                     and weekly_round.round_status in ('open', 'auditing', 'tie_pending')
                ) then 'Y' else 'N' end as weekly_voted_by_me,
                case when exists (
                  select 1 from storyheaven_likes mine
                   where mine.story_id = s.id and mine.user_id = :viewer_user_id
                ) then 'Y' else 'N' end as liked_by_me,
                nvl(e.endorsement_level, 0) as endorsement_level,
                e.public_reason as endorsement_reason
           from storyheaven_stories s
           join webtoon_profiles p on p.user_id = s.author_user_id
           left join storyheaven_endorsements e on e.story_id = s.id
          where s.story_status = 'published'
          order by weekly_vote_count desc, nvl(e.endorsement_level, 0) desc, like_count desc, s.published_at desc
       ) where rownum <= ${clampInt(limit, 1, 40, 24)}`,
      { viewer_user_id: userId }
    );
    return result.rows.map(mapStoryHeavenStory);
  });
}

async function getCurrentStoryHeavenRound(userId) {
  return withTransaction(async (connection) => {
    const schedule = storyHeavenRoundSchedule(new Date());
    const weekly = await ensureStoryHeavenRound(connection, schedule);
    const runoffResult = await connection.execute(
      `select * from (
         select id, round_key, round_type, parent_round_id, starts_at,
                submission_cutoff_at, voting_ends_at, audit_deadline_at,
                result_at, round_status, winner_story_id, results_json
           from storyheaven_rounds
          where round_type = 'runoff'
            and round_status in ('open', 'auditing')
          order by starts_at desc
       ) where rownum = 1`,
      {}
    );
    const row = runoffResult.rows[0] || weekly;
    const entries = await connection.execute(
      `select e.id, e.story_id, e.entry_status, e.eligibility_score,
              e.final_rank, e.vote_count_snapshot,
              s.title, s.logline, s.genre, s.cover_path,
              p.nickname, p.display_name,
              (select count(*) from storyheaven_votes votes
                where votes.round_id = e.round_id
                  and votes.story_id = e.story_id
                  and votes.active = 'Y') as vote_count,
              case when exists (
                select 1 from storyheaven_votes mine
                 where mine.round_id = e.round_id
                   and mine.story_id = e.story_id
                   and mine.voter_user_id = :viewer_user_id
                   and mine.active = 'Y'
              ) then 'Y' else 'N' end as voted_by_me
         from storyheaven_entries e
         join storyheaven_stories s on s.id = e.story_id
         join webtoon_profiles p on p.user_id = e.author_user_id
        where e.round_id = :round_id
          and e.entry_status <> 'disqualified'
        order by vote_count desc, e.approved_at asc`,
      { round_id: row.ID, viewer_user_id: userId }
    );
    return mapStoryHeavenRound(row, entries.rows);
  });
}

async function ensureStoryHeavenRound(connection, schedule) {
  await connection.execute(
    `update storyheaven_vote_audit
        set signal_hash = null
      where signal_hash is not null and signal_expires_at < systimestamp`
  );
  await connection.execute(
    `update storyheaven_rounds
        set round_status = 'open', updated_at = systimestamp
      where round_status = 'scheduled'
        and starts_at <= systimestamp
        and voting_ends_at > systimestamp`
  );
  await connection.execute(
    `update storyheaven_rounds
        set round_status = 'auditing', updated_at = systimestamp
      where round_status = 'open' and voting_ends_at <= systimestamp`
  );
  await connection.execute(
    `merge into storyheaven_rounds target
     using (select :round_key round_key from dual) source
        on (target.round_key = source.round_key)
     when not matched then insert (
       id, round_key, round_type, starts_at, submission_cutoff_at,
       voting_ends_at, audit_deadline_at, result_at, round_status
     ) values (
       :id, :round_key, 'weekly',
       to_timestamp_tz(:starts_at, 'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'),
       to_timestamp_tz(:submission_cutoff_at, 'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'),
       to_timestamp_tz(:voting_ends_at, 'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'),
       to_timestamp_tz(:audit_deadline_at, 'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'),
       to_timestamp_tz(:result_at, 'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'),
       :round_status
     )`,
    {
      id: randomId(),
      round_key: schedule.roundKey,
      starts_at: oracleTimestampString(schedule.startsAt),
      submission_cutoff_at: oracleTimestampString(schedule.submissionCutoffAt),
      voting_ends_at: oracleTimestampString(schedule.votingEndsAt),
      audit_deadline_at: oracleTimestampString(schedule.auditDeadlineAt),
      result_at: oracleTimestampString(schedule.resultAt),
      round_status: schedule.status
    }
  );
  const result = await connection.execute(
    `select id, round_key, round_type, parent_round_id, starts_at,
            submission_cutoff_at, voting_ends_at, audit_deadline_at,
            result_at, round_status, winner_story_id, results_json
       from storyheaven_rounds where round_key = :round_key`,
    { round_key: schedule.roundKey }
  );
  return result.rows[0];
}

async function listPendingStoryHeavenRounds() {
  return withConnection(async (connection) => {
    const result = await connection.execute(
      `select id, round_key, round_type, parent_round_id, starts_at,
              submission_cutoff_at, voting_ends_at, audit_deadline_at,
              result_at, round_status, winner_story_id, results_json
         from storyheaven_rounds
        where round_status in ('auditing', 'tie_pending')
        order by voting_ends_at asc`
    );
    return result.rows.map((row) => mapStoryHeavenRound(row));
  });
}

async function getStoryHeavenVoteAudit(roundIdValue) {
  const roundId = boundedString(roundIdValue, "roundId", 36, { required: true });
  return withConnection(async (connection) => {
    const exists = await connection.execute(
      `select id from storyheaven_rounds where id = :round_id`,
      { round_id: roundId }
    );
    if (!exists.rows.length) throw httpError("round_not_found", 404);
    const totals = await connection.execute(
      `select count(case when active = 'Y' then 1 end) as active_votes,
              count(case when active = 'N' then 1 end) as canceled_votes,
              count(distinct voter_user_id) as voter_count
         from storyheaven_votes where round_id = :round_id`,
      { round_id: roundId }
    );
    const clusters = await connection.execute(
      `select * from (
         select substr(signal_hash, 1, 12) as cluster_key,
                count(distinct voter_user_id) as account_count,
                count(*) as event_count
           from storyheaven_vote_audit
          where round_id = :round_id
            and signal_hash is not null
            and signal_expires_at >= systimestamp
            and event_type in ('cast', 'restore')
          group by signal_hash
         having count(distinct voter_user_id) >= 5
          order by account_count desc
       ) where rownum <= 20`,
      { round_id: roundId }
    );
    const entries = await connection.execute(
      `select e.id, e.story_id, e.entry_status, e.eligibility_score,
              e.disqualification_reason, e.disqualified_at,
              s.title, p.nickname, p.display_name,
              count(case when v.active = 'Y' then 1 end) as vote_count
         from storyheaven_entries e
         join storyheaven_stories s on s.id = e.story_id
         join webtoon_profiles p on p.user_id = e.author_user_id
         left join storyheaven_votes v
           on v.round_id = e.round_id and v.story_id = e.story_id
        where e.round_id = :round_id
        group by e.id, e.story_id, e.entry_status, e.eligibility_score,
                 e.disqualification_reason, e.disqualified_at,
                 s.title, p.nickname, p.display_name, e.approved_at
        order by vote_count desc, e.approved_at asc`,
      { round_id: roundId }
    );
    const votes = await connection.execute(
      `select * from (
         select v.id, v.story_id, v.voter_user_id, v.active, v.cast_at,
                v.canceled_at, v.invalidated_at, v.invalidation_reason,
                s.title
           from storyheaven_votes v
           join storyheaven_stories s on s.id = v.story_id
          where v.round_id = :round_id
          order by v.cast_at desc
       ) where rownum <= 200`,
      { round_id: roundId }
    );
    return {
      roundId,
      activeVotes: Number(totals.rows[0].ACTIVE_VOTES || 0),
      canceledVotes: Number(totals.rows[0].CANCELED_VOTES || 0),
      voterCount: Number(totals.rows[0].VOTER_COUNT || 0),
      riskClusters: clusters.rows.map((row) => ({
        clusterKey: row.CLUSTER_KEY,
        accountCount: Number(row.ACCOUNT_COUNT || 0),
        eventCount: Number(row.EVENT_COUNT || 0),
        automaticPenalty: false
      })),
      entries: entries.rows.map((row) => ({
        entryId: row.ID,
        storyId: row.STORY_ID,
        title: row.TITLE,
        author: row.NICKNAME || row.DISPLAY_NAME || "이야기씨앗",
        status: row.ENTRY_STATUS,
        eligibilityScore: Number(row.ELIGIBILITY_SCORE || 0),
        voteCount: Number(row.VOTE_COUNT || 0),
        disqualificationReason: row.DISQUALIFICATION_REASON || "",
        disqualifiedAt: row.DISQUALIFIED_AT || null
      })),
      votes: votes.rows.map((row) => ({
        voteId: row.ID,
        storyId: row.STORY_ID,
        storyTitle: row.TITLE,
        voterKey: anonymousStoryHeavenVoterKey(row.VOTER_USER_ID),
        status: row.INVALIDATED_AT ? "invalidated" : row.ACTIVE === "Y" ? "active" : "canceled",
        castAt: row.CAST_AT,
        canceledAt: row.CANCELED_AT || null,
        invalidatedAt: row.INVALIDATED_AT || null,
        invalidationReason: row.INVALIDATION_REASON || ""
      })),
      caution: "A shared network is not proof of abuse. Review account timing and behavior before taking action.",
      signalRetentionDays: config.securityRetentionDays
    };
  });
}

async function invalidateStoryHeavenVote(voteIdValue, input, adminUserId) {
  const voteId = boundedString(voteIdValue, "voteId", 36, { required: true });
  const reason = requireStoryHeavenModerationReason(input?.reason);
  return withTransaction(async (connection) => {
    const locked = await connection.execute(
      `select v.id, v.round_id, v.story_id, v.voter_user_id, v.active,
              v.invalidated_at, r.round_status
         from storyheaven_votes v
         join storyheaven_rounds r on r.id = v.round_id
        where v.id = :vote_id for update`,
      { vote_id: voteId }
    );
    if (!locked.rows.length) throw httpError("vote_not_found", 404);
    const vote = locked.rows[0];
    if (vote.ROUND_STATUS !== "auditing") throw httpError("round_not_in_audit", 409);
    if (vote.INVALIDATED_AT) throw httpError("vote_already_invalidated", 409);

    await connection.execute(
      `update storyheaven_votes
          set active = 'N', canceled_at = systimestamp,
              invalidated_at = systimestamp, invalidated_by = :admin_user_id,
              invalidation_reason = :reason
        where id = :vote_id`,
      { vote_id: voteId, admin_user_id: adminUserId, reason }
    );
    await connection.execute(
      `delete from storyheaven_likes
        where story_id = :story_id and user_id = :voter_user_id`,
      { story_id: vote.STORY_ID, voter_user_id: vote.VOTER_USER_ID }
    );
    await connection.execute(
      `insert into storyheaven_vote_audit (
        id, vote_id, round_id, story_id, voter_user_id, actor_user_id,
        event_type, details_json
      ) values (
        :id, :vote_id, :round_id, :story_id, :voter_user_id, :actor_user_id,
        'invalidate', :details_json
      )`,
      {
        id: randomId(),
        vote_id: voteId,
        round_id: vote.ROUND_ID,
        story_id: vote.STORY_ID,
        voter_user_id: vote.VOTER_USER_ID,
        actor_user_id: adminUserId,
        details_json: clobJson({ reason, previousActive: vote.ACTIVE === "Y" })
      }
    );
    await insertStoryHeavenActivity(connection, {
      storyId: vote.STORY_ID,
      actorUserId: adminUserId,
      type: "weekly_vote_invalidated",
      details: { roundId: vote.ROUND_ID, voteId, reason }
    });
    const count = await connection.execute(
      `select count(*) as vote_count from storyheaven_votes
        where round_id = :round_id and story_id = :story_id and active = 'Y'`,
      { round_id: vote.ROUND_ID, story_id: vote.STORY_ID }
    );
    return {
      voteId,
      roundId: vote.ROUND_ID,
      storyId: vote.STORY_ID,
      status: "invalidated",
      voteCount: Number(count.rows[0].VOTE_COUNT || 0)
    };
  });
}

async function disqualifyStoryHeavenEntry(entryIdValue, input, adminUserId) {
  const entryId = boundedString(entryIdValue, "entryId", 36, { required: true });
  const reason = requireStoryHeavenModerationReason(input?.reason);
  return withTransaction(async (connection) => {
    const locked = await connection.execute(
      `select e.id, e.round_id, e.story_id, e.entry_status, r.round_status
         from storyheaven_entries e
         join storyheaven_rounds r on r.id = e.round_id
        where e.id = :entry_id for update`,
      { entry_id: entryId }
    );
    if (!locked.rows.length) throw httpError("entry_not_found", 404);
    const entry = locked.rows[0];
    if (entry.ROUND_STATUS !== "auditing") throw httpError("round_not_in_audit", 409);
    if (entry.ENTRY_STATUS === "disqualified") throw httpError("entry_already_disqualified", 409);
    if (entry.ENTRY_STATUS !== "candidate") throw httpError("entry_not_disqualifiable", 409);

    const activeVotes = await connection.execute(
      `select id, voter_user_id from storyheaven_votes
        where round_id = :round_id and story_id = :story_id and active = 'Y'`,
      { round_id: entry.ROUND_ID, story_id: entry.STORY_ID }
    );
    await connection.execute(
      `update storyheaven_entries
          set entry_status = 'disqualified', disqualification_reason = :reason,
              disqualified_at = systimestamp, disqualified_by = :admin_user_id,
              updated_at = systimestamp
        where id = :entry_id`,
      { entry_id: entryId, admin_user_id: adminUserId, reason }
    );

    for (const vote of activeVotes.rows) {
      await connection.execute(
        `update storyheaven_votes
            set active = 'N', canceled_at = systimestamp,
                invalidated_at = systimestamp, invalidated_by = :admin_user_id,
                invalidation_reason = :reason
          where id = :vote_id`,
        { vote_id: vote.ID, admin_user_id: adminUserId, reason }
      );
      await connection.execute(
        `delete from storyheaven_likes
          where story_id = :story_id and user_id = :voter_user_id`,
        { story_id: entry.STORY_ID, voter_user_id: vote.VOTER_USER_ID }
      );
      await connection.execute(
        `insert into storyheaven_vote_audit (
          id, vote_id, round_id, story_id, voter_user_id, actor_user_id,
          event_type, details_json
        ) values (
          :id, :vote_id, :round_id, :story_id, :voter_user_id, :actor_user_id,
          'invalidate', :details_json
        )`,
        {
          id: randomId(),
          vote_id: vote.ID,
          round_id: entry.ROUND_ID,
          story_id: entry.STORY_ID,
          voter_user_id: vote.VOTER_USER_ID,
          actor_user_id: adminUserId,
          details_json: clobJson({ reason, cause: "entry_disqualified", entryId })
        }
      );
    }
    await insertStoryHeavenActivity(connection, {
      storyId: entry.STORY_ID,
      actorUserId: adminUserId,
      type: "weekly_entry_disqualified",
      details: { roundId: entry.ROUND_ID, entryId, reason, invalidatedVotes: activeVotes.rows.length }
    });
    return {
      entryId,
      roundId: entry.ROUND_ID,
      storyId: entry.STORY_ID,
      status: "disqualified",
      invalidatedVotes: activeVotes.rows.length,
      succession: "recalculated_when_round_is_finalized"
    };
  });
}

function requireStoryHeavenModerationReason(value) {
  const reason = boundedString(value, "reason", 500, { required: true });
  if (reason.length < 10) throw httpError("moderation_reason_too_short", 400);
  return reason;
}

function anonymousStoryHeavenVoterKey(userId) {
  const digest = crypto
    .createHmac("sha256", config.securityHashSecret)
    .update(`storyheaven-voter:${String(userId || "")}`)
    .digest("hex")
    .slice(0, 10)
    .toUpperCase();
  return `V-${digest}`;
}

async function createStoryHeavenReport(storyIdValue, reporterUserId, input) {
  const storyId = boundedString(storyIdValue, "storyId", 36, { required: true });
  const category = boundedString(input?.category, "category", 30, { required: true });
  if (!storyHeavenReportCategories.has(category)) throw httpError("invalid_report_category", 400);
  const details = boundedString(input?.details, "details", 1000, { required: true });
  if (details.length < 20) throw httpError("report_details_too_short", 400);
  const referenceUrl = optionalHttpsUrl(input?.referenceUrl, "referenceUrl", 1000);

  try {
    return await withTransaction(async (connection) => {
      const story = await connection.execute(
        `select id, author_user_id from storyheaven_stories
          where id = :story_id and story_status = 'published'`,
        { story_id: storyId }
      );
      if (!story.rows.length) throw httpError("story_not_found", 404);
      if (story.rows[0].AUTHOR_USER_ID === reporterUserId) throw httpError("author_cannot_report_own_story", 403);

      const reportId = randomId();
      await connection.execute(
        `insert into storyheaven_reports (
          id, story_id, reporter_user_id, report_category, report_details, reference_url
        ) values (
          :id, :story_id, :reporter_user_id, :report_category, :report_details, :reference_url
        )`,
        {
          id: reportId,
          story_id: storyId,
          reporter_user_id: reporterUserId,
          report_category: category,
          report_details: details,
          reference_url: referenceUrl
        }
      );
      await insertStoryHeavenActivity(connection, {
        storyId,
        actorUserId: reporterUserId,
        type: "report_submitted",
        details: { reportId, category, hasReference: Boolean(referenceUrl) }
      });
      return { reportId, storyId, category, status: "pending" };
    });
  } catch (error) {
    if (String(error?.message || "").includes("ORA-00001")) {
      throw httpError("report_already_submitted", 409);
    }
    throw error;
  }
}

async function listStoryHeavenNotifications(userId) {
  return withConnection(async (connection) => {
    const result = await connection.execute(
      `select * from (
         select n.id, n.story_id, n.report_id, n.notification_type,
                n.title, n.message, n.action_path, n.read_at, n.created_at,
                r.report_status, r.resolved_at,
                a.id as appeal_id, a.appeal_status,
                case when r.report_status = 'resolved_action'
                           and a.id is null
                           and r.resolved_at >= systimestamp - numtodsinterval(7, 'DAY')
                     then 'Y' else 'N' end as can_appeal
           from storyheaven_notifications n
           left join storyheaven_reports r on r.id = n.report_id
           left join storyheaven_appeals a on a.report_id = n.report_id
          where n.user_id = :user_id
          order by n.created_at desc
       ) where rownum <= 50`,
      { user_id: userId }
    );
    return result.rows.map((row) => ({
      id: row.ID,
      storyId: row.STORY_ID || null,
      reportId: row.REPORT_ID || null,
      type: row.NOTIFICATION_TYPE,
      title: row.TITLE,
      message: row.MESSAGE,
      actionPath: row.ACTION_PATH || "",
      read: Boolean(row.READ_AT),
      createdAt: row.CREATED_AT,
      canAppeal: row.CAN_APPEAL === "Y",
      appeal: row.APPEAL_ID ? { id: row.APPEAL_ID, status: row.APPEAL_STATUS } : null
    }));
  });
}

async function readStoryHeavenNotification(notificationIdValue, userId) {
  const notificationId = boundedString(notificationIdValue, "notificationId", 36, { required: true });
  return withTransaction(async (connection) => {
    const result = await connection.execute(
      `update storyheaven_notifications set read_at = nvl(read_at, systimestamp)
        where id = :notification_id and user_id = :user_id`,
      { notification_id: notificationId, user_id: userId }
    );
    if (!result.rowsAffected) throw httpError("notification_not_found", 404);
    return { notificationId, read: true };
  });
}

async function createStoryHeavenAppeal(reportIdValue, appellantUserId, input) {
  const reportId = boundedString(reportIdValue, "reportId", 36, { required: true });
  const reason = boundedString(input?.reason, "reason", 1000, { required: true });
  if (reason.length < 20) throw httpError("appeal_reason_too_short", 400);

  try {
    return await withTransaction(async (connection) => {
      const report = await connection.execute(
        `select r.id, r.story_id, r.report_status, r.resolved_at, r.resolved_by,
                s.author_user_id
           from storyheaven_reports r
           join storyheaven_stories s on s.id = r.story_id
          where r.id = :report_id for update`,
        { report_id: reportId }
      );
      if (!report.rows.length) throw httpError("report_not_found", 404);
      const row = report.rows[0];
      if (row.AUTHOR_USER_ID !== appellantUserId) throw httpError("appeal_owner_required", 403);
      if (row.REPORT_STATUS !== "resolved_action") throw httpError("report_not_appealable", 409);
      if (!row.RESOLVED_AT || Date.now() - new Date(row.RESOLVED_AT).getTime() > 7 * 24 * 60 * 60 * 1000) {
        throw httpError("appeal_window_closed", 409);
      }

      const appealId = randomId();
      await connection.execute(
        `insert into storyheaven_appeals (
          id, report_id, story_id, appellant_user_id, appeal_reason
        ) values (
          :id, :report_id, :story_id, :appellant_user_id, :appeal_reason
        )`,
        {
          id: appealId,
          report_id: reportId,
          story_id: row.STORY_ID,
          appellant_user_id: appellantUserId,
          appeal_reason: reason
        }
      );
      if (row.RESOLVED_BY) {
        await insertStoryHeavenNotification(connection, {
          userId: row.RESOLVED_BY,
          storyId: row.STORY_ID,
          reportId,
          type: "appeal_received",
          title: "이의제기가 접수되었습니다",
          message: "신고 판정에 대한 작성자 이의제기가 도착했습니다. 운영 화면에서 근거를 다시 확인해주세요.",
          actionPath: "/storyheaven/operator/"
        });
      }
      await insertStoryHeavenActivity(connection, {
        storyId: row.STORY_ID,
        actorUserId: appellantUserId,
        type: "report_appealed",
        details: { reportId, appealId }
      });
      return { appealId, reportId, status: "pending" };
    });
  } catch (error) {
    if (String(error?.message || "").includes("ORA-00001")) {
      throw httpError("appeal_already_submitted", 409);
    }
    throw error;
  }
}

async function listStoryHeavenReports() {
  return withConnection(async (connection) => {
    const result = await connection.execute(
      `select r.id, r.story_id, r.reporter_user_id, r.report_category,
              r.report_details, r.reference_url, r.report_status,
              r.resolution_note, r.resolved_at, r.created_at,
              s.title, s.author_user_id, p.nickname, p.display_name,
              a.id as appeal_id, a.appeal_reason, a.appeal_status,
              a.resolution_note as appeal_resolution, a.created_at as appeal_created_at
         from storyheaven_reports r
         join storyheaven_stories s on s.id = r.story_id
         join webtoon_profiles p on p.user_id = s.author_user_id
         left join storyheaven_appeals a on a.report_id = r.id
        order by case r.report_status when 'pending' then 0 when 'reviewing' then 1 else 2 end,
                 r.created_at asc`,
      {}
    );
    return result.rows.map((row) => ({
      id: row.ID,
      storyId: row.STORY_ID,
      storyTitle: row.TITLE,
      author: row.NICKNAME || row.DISPLAY_NAME || "이야기씨앗",
      reporterKey: anonymousStoryHeavenVoterKey(row.REPORTER_USER_ID),
      category: row.REPORT_CATEGORY,
      details: row.REPORT_DETAILS,
      referenceUrl: row.REFERENCE_URL || "",
      status: row.REPORT_STATUS,
      resolution: row.RESOLUTION_NOTE || "",
      resolvedAt: row.RESOLVED_AT || null,
      createdAt: row.CREATED_AT,
      appeal: row.APPEAL_ID ? {
        id: row.APPEAL_ID,
        reason: row.APPEAL_REASON,
        status: row.APPEAL_STATUS,
        resolution: row.APPEAL_RESOLUTION || "",
        createdAt: row.APPEAL_CREATED_AT
      } : null
    }));
  });
}

async function resolveStoryHeavenReport(reportIdValue, adminUserId, input) {
  const reportId = boundedString(reportIdValue, "reportId", 36, { required: true });
  const decision = boundedString(input?.decision, "decision", 30, { required: true });
  if (!new Set(["dismissed", "action_required"]).has(decision)) throw httpError("invalid_report_decision", 400);
  const resolution = boundedString(input?.resolution, "resolution", 1000, { required: true });
  if (resolution.length < 20) throw httpError("report_resolution_too_short", 400);
  const status = decision === "dismissed" ? "dismissed" : "resolved_action";

  return withTransaction(async (connection) => {
    const locked = await connection.execute(
      `select r.id, r.story_id, r.report_status, s.author_user_id
         from storyheaven_reports r
         join storyheaven_stories s on s.id = r.story_id
        where r.id = :report_id for update`,
      { report_id: reportId }
    );
    if (!locked.rows.length) throw httpError("report_not_found", 404);
    const report = locked.rows[0];
    if (!new Set(["pending", "reviewing"]).has(report.REPORT_STATUS)) throw httpError("report_already_resolved", 409);

    await connection.execute(
      `update storyheaven_reports
          set report_status = :report_status, resolution_note = :resolution_note,
              resolved_by = :resolved_by, resolved_at = systimestamp,
              updated_at = systimestamp
        where id = :report_id`,
      {
        report_id: reportId,
        report_status: status,
        resolution_note: resolution,
        resolved_by: adminUserId
      }
    );
    const prefix = status === "dismissed"
      ? "검토 결과 운영 위반을 확인하지 못했습니다."
      : "검토 결과 추가 운영 조치가 필요한 것으로 판정했습니다.";
    await insertStoryHeavenNotification(connection, {
      userId: report.AUTHOR_USER_ID,
      storyId: report.STORY_ID,
      reportId,
      type: "report_result",
      title: "작품 신고 검토 결과",
      message: `${prefix} ${resolution}`.slice(0, 500),
      actionPath: `/storyheaven/my/?report=${encodeURIComponent(reportId)}`
    });
    await insertStoryHeavenActivity(connection, {
      storyId: report.STORY_ID,
      actorUserId: adminUserId,
      type: status === "dismissed" ? "report_dismissed" : "report_action_required",
      details: { reportId, resolution }
    });
    return { reportId, status, authorNotified: true, automaticStoryAction: false };
  });
}

async function resolveStoryHeavenAppeal(appealIdValue, adminUserId, input) {
  const appealId = boundedString(appealIdValue, "appealId", 36, { required: true });
  const decision = boundedString(input?.decision, "decision", 20, { required: true });
  if (!new Set(["upheld", "overturned"]).has(decision)) throw httpError("invalid_appeal_decision", 400);
  const resolution = boundedString(input?.resolution, "resolution", 1000, { required: true });
  if (resolution.length < 20) throw httpError("appeal_resolution_too_short", 400);

  return withTransaction(async (connection) => {
    const locked = await connection.execute(
      `select a.id, a.report_id, a.story_id, a.appellant_user_id, a.appeal_status
         from storyheaven_appeals a where a.id = :appeal_id for update`,
      { appeal_id: appealId }
    );
    if (!locked.rows.length) throw httpError("appeal_not_found", 404);
    const appeal = locked.rows[0];
    if (appeal.APPEAL_STATUS !== "pending") throw httpError("appeal_already_resolved", 409);

    await connection.execute(
      `update storyheaven_appeals
          set appeal_status = :appeal_status, resolution_note = :resolution_note,
              resolved_by = :resolved_by, resolved_at = systimestamp,
              updated_at = systimestamp
        where id = :appeal_id`,
      {
        appeal_id: appealId,
        appeal_status: decision,
        resolution_note: resolution,
        resolved_by: adminUserId
      }
    );
    if (decision === "overturned") {
      await connection.execute(
        `update storyheaven_reports
            set report_status = 'dismissed', resolution_note = :resolution_note,
                resolved_by = :resolved_by, resolved_at = systimestamp,
                updated_at = systimestamp
          where id = :report_id`,
        {
          report_id: appeal.REPORT_ID,
          resolution_note: `이의제기 인용: ${resolution}`.slice(0, 1000),
          resolved_by: adminUserId
        }
      );
    }
    await insertStoryHeavenNotification(connection, {
      userId: appeal.APPELLANT_USER_ID,
      storyId: appeal.STORY_ID,
      reportId: appeal.REPORT_ID,
      type: "appeal_result",
      title: "이의제기 검토 결과",
      message: `${decision === "overturned" ? "이의제기가 받아들여졌습니다." : "기존 판정이 유지되었습니다."} ${resolution}`.slice(0, 500),
      actionPath: `/storyheaven/my/?report=${encodeURIComponent(appeal.REPORT_ID)}`
    });
    await insertStoryHeavenActivity(connection, {
      storyId: appeal.STORY_ID,
      actorUserId: adminUserId,
      type: decision === "overturned" ? "appeal_overturned" : "appeal_upheld",
      details: { reportId: appeal.REPORT_ID, appealId, resolution }
    });
    return { appealId, reportId: appeal.REPORT_ID, status: decision, authorNotified: true };
  });
}

async function insertStoryHeavenNotification(connection, { userId, storyId = null, reportId = null, type, title, message, actionPath = null }) {
  await connection.execute(
    `insert into storyheaven_notifications (
      id, user_id, story_id, report_id, notification_type, title, message, action_path
    ) values (
      :id, :user_id, :story_id, :report_id, :notification_type, :title, :message, :action_path
    )`,
    {
      id: randomId(),
      user_id: userId,
      story_id: storyId,
      report_id: reportId,
      notification_type: type,
      title,
      message,
      action_path: actionPath
    }
  );
}

async function assignStoryHeavenEntry(connection, { storyId, authorUserId, eligibilityScore }) {
  const schedule = storyHeavenRoundSchedule(new Date(), { nextAfterCutoff: true });
  const round = await ensureStoryHeavenRound(connection, schedule);
  const occupied = await connection.execute(
    `select story_id from storyheaven_entries
      where round_id = :round_id and author_user_id = :author_user_id`,
    { round_id: round.ID, author_user_id: authorUserId }
  );
  if (occupied.rows.length && occupied.rows[0].STORY_ID !== storyId) {
    throw httpError("round_author_entry_exists", 409);
  }
  await connection.execute(
    `merge into storyheaven_entries target
     using (select :round_id round_id, :story_id story_id from dual) source
        on (target.round_id = source.round_id and target.story_id = source.story_id)
     when not matched then insert (
       id, round_id, story_id, author_user_id, eligibility_score
     ) values (
       :id, :round_id, :story_id, :author_user_id, :eligibility_score
     )`,
    {
      id: randomId(),
      round_id: round.ID,
      story_id: storyId,
      author_user_id: authorUserId,
      eligibility_score: eligibilityScore
    }
  );
  return round;
}

function mapStoryHeavenRound(row, entryRows = []) {
  return {
    id: row.ID,
    key: row.ROUND_KEY,
    type: row.ROUND_TYPE || "weekly",
    parentRoundId: row.PARENT_ROUND_ID || null,
    startsAt: row.STARTS_AT,
    submissionCutoffAt: row.SUBMISSION_CUTOFF_AT,
    votingEndsAt: row.VOTING_ENDS_AT,
    auditDeadlineAt: row.AUDIT_DEADLINE_AT,
    resultAt: row.RESULT_AT,
    status: row.ROUND_STATUS,
    winnerStoryId: row.WINNER_STORY_ID || null,
    results: parseJson(row.RESULTS_JSON, null),
    entries: entryRows.map((entry) => ({
      entryId: entry.ID,
      storyId: entry.STORY_ID,
      title: entry.TITLE,
      logline: entry.LOGLINE,
      genre: entry.GENRE,
      coverPath: entry.COVER_PATH || "",
      author: entry.NICKNAME || entry.DISPLAY_NAME || "이야기씨앗",
      status: entry.ENTRY_STATUS,
      eligibilityScore: Number(entry.ELIGIBILITY_SCORE || 0),
      voteCount: Number(entry.VOTE_COUNT ?? entry.VOTE_COUNT_SNAPSHOT ?? 0),
      votedByMe: entry.VOTED_BY_ME === "Y",
      finalRank: entry.FINAL_RANK == null ? null : Number(entry.FINAL_RANK)
    }))
  };
}

async function listMyStoryHeavenStories(userId) {
  return withConnection(async (connection) => {
    const result = await connection.execute(
      `${storyHeavenOwnerSelect()}
        where s.author_user_id = :user_id
        order by s.updated_at desc`,
      { user_id: userId, viewer_user_id: userId }
    );
    return result.rows.map(mapStoryHeavenOwnerStory);
  });
}

async function getStoryHeavenStory(storyIdValue, user) {
  const storyId = boundedString(storyIdValue, "storyId", 36, { required: true });
  return withConnection(async (connection) => {
    const result = await connection.execute(
      `${storyHeavenOwnerSelect()}
        where s.id = :story_id`,
      { story_id: storyId, viewer_user_id: user?.id || null }
    );
    if (!result.rows.length) throw httpError("story_not_found", 404);
    const row = result.rows[0];
    const mayReadPrivate = row.STORY_STATUS === "published"
      || row.AUTHOR_USER_ID === user?.id
      || isAdminIdentity(user);
    if (!mayReadPrivate) throw httpError("story_not_found", 404);
    const story = mapStoryHeavenOwnerStory(row);
    if (row.STORY_STATUS === "published" && row.AUTHOR_USER_ID !== user?.id && !isAdminIdentity(user)) {
      delete story.packet;
      delete story.reviewNote;
    }
    return story;
  });
}

async function createStoryHeavenDraft(userId, input) {
  const validated = requireStoryHeavenPacket(input, "draft");
  const storyId = randomId();
  const revisionNo = 1;
  const slug = storyHeavenSlug(validated.packet.title);
  const hash = hashStoryHeavenPacket(validated.packet);

  return withTransaction(async (connection) => {
    const drafts = await connection.execute(
      `select count(*) as draft_count
         from storyheaven_stories
        where author_user_id = :user_id and story_status = 'draft'`,
      { user_id: userId }
    );
    if (Number(drafts.rows[0].DRAFT_COUNT || 0) >= 10) {
      throw httpError("story_draft_limit_reached", 409);
    }

    await connection.execute(
      `insert into storyheaven_stories (
        id, slug, author_user_id, title, logline, public_synopsis,
        protagonist_goal, obstacle_stakes, genre, secondary_genre, tags_json,
        content_rating, rating_detail, content_origin, competition_eligible,
        story_status, current_revision_no, review_decision
      ) values (
        :id, :slug, :author_user_id, :title, :logline, :public_synopsis,
        :protagonist_goal, :obstacle_stakes, :genre, :secondary_genre, :tags_json,
        :content_rating, :rating_detail, 'human', 'N',
        'draft', :current_revision_no, 'none'
      )`,
      storyHeavenStoryBinds(storyId, slug, userId, validated.packet, revisionNo)
    );
    await insertStoryHeavenRevision(connection, {
      storyId,
      revisionNo,
      actorUserId: userId,
      kind: "draft",
      packet: validated.packet,
      hash
    });
    await insertStoryHeavenActivity(connection, {
      storyId,
      actorUserId: userId,
      type: "draft_created",
      toStatus: "draft",
      details: { revisionNo, totalLength: validated.totalLength }
    });
    return selectStoryHeavenOwnerStory(connection, storyId, userId);
  });
}

async function saveStoryHeavenDraft(storyIdValue, userId, input) {
  const storyId = boundedString(storyIdValue, "storyId", 36, { required: true });
  const validated = requireStoryHeavenPacket(input, "draft");
  return withTransaction(async (connection) => {
    const current = await lockStoryHeavenStory(connection, storyId, userId);
    if (current.STORY_STATUS !== "draft") {
      throw httpError("story_not_editable", 409);
    }
    const revisionNo = Number(current.CURRENT_REVISION_NO || 0) + 1;
    const hash = hashStoryHeavenPacket(validated.packet);
    await updateStoryHeavenCurrentPacket(connection, storyId, validated.packet, revisionNo, {
      reviewDecision: current.REVIEW_DECISION === "changes_requested" ? "none" : current.REVIEW_DECISION,
      reviewNote: current.REVIEW_DECISION === "changes_requested" ? null : current.REVIEW_NOTE
    });
    await insertStoryHeavenRevision(connection, {
      storyId,
      revisionNo,
      actorUserId: userId,
      kind: "draft",
      packet: validated.packet,
      hash
    });
    await insertStoryHeavenActivity(connection, {
      storyId,
      actorUserId: userId,
      type: "draft_saved",
      fromStatus: "draft",
      toStatus: "draft",
      details: { revisionNo, totalLength: validated.totalLength }
    });
    return selectStoryHeavenOwnerStory(connection, storyId, userId);
  });
}

async function submitStoryHeavenStory(storyIdValue, userId, input) {
  const storyId = boundedString(storyIdValue, "storyId", 36, { required: true });
  const validated = requireStoryHeavenPacket(input.packet || {}, "submit");
  const consent = input.consents && typeof input.consents === "object" ? input.consents : {};
  const requiredConsents = ["display", "originality", "adult"];
  const missing = requiredConsents.filter((name) => consent[name] !== true);
  if (missing.length) {
    const error = httpError("story_consent_required", 400);
    error.details = missing.map((field) => ({ field: `consents.${field}`, code: "story_consent_required" }));
    throw error;
  }

  return withTransaction(async (connection) => {
    const current = await lockStoryHeavenStory(connection, storyId, userId);
    if (current.STORY_STATUS !== "draft") {
      throw httpError("story_not_submittable", 409);
    }
    const revisionNo = Number(current.CURRENT_REVISION_NO || 0) + 1;
    const hash = hashStoryHeavenPacket(validated.packet);
    await updateStoryHeavenCurrentPacket(connection, storyId, validated.packet, revisionNo, {
      reviewDecision: "pending",
      reviewNote: null
    });
    await insertStoryHeavenRevision(connection, {
      storyId,
      revisionNo,
      actorUserId: userId,
      kind: "submit",
      packet: validated.packet,
      hash
    });
    await connection.execute(
      `update storyheaven_stories
          set story_status = 'moderation',
              submitted_revision_no = :revision_no,
              submitted_at = systimestamp,
              reviewed_at = null,
              reviewed_by = null,
              review_decision = 'pending',
              review_note = null,
              eligibility_score = null,
              rights_confirmed = 'Y',
              adult_confirmed = 'Y',
              competition_eligible = 'N'
        where id = :story_id`,
      { story_id: storyId, revision_no: revisionNo }
    );
    for (const type of [...requiredConsents, "training"]) {
      await upsertStoryHeavenConsent(connection, {
        storyId,
        userId,
        type,
        accepted: consent[type] === true,
        hash
      });
    }
    await insertStoryHeavenActivity(connection, {
      storyId,
      actorUserId: userId,
      type: "submitted_for_review",
      fromStatus: "draft",
      toStatus: "moderation",
      details: { revisionNo, totalLength: validated.totalLength, trainingConsent: consent.training === true }
    });
    return selectStoryHeavenOwnerStory(connection, storyId, userId);
  });
}

async function listStoryHeavenSubmissions() {
  return withConnection(async (connection) => {
    const result = await connection.execute(
      `${storyHeavenOwnerSelect()}
        where s.story_status = 'moderation'
        order by s.submitted_at asc`,
      { viewer_user_id: null }
    );
    return result.rows.map(mapStoryHeavenOwnerStory);
  });
}

async function reviewStoryHeavenSubmission(storyIdValue, adminUserId, input) {
  const storyId = boundedString(storyIdValue, "storyId", 36, { required: true });
  const decision = boundedString(input.decision, "decision", 30, { required: true });
  if (!new Set(["approved", "changes_requested", "rejected"]).has(decision)) {
    throw httpError("invalid_review_decision", 400);
  }
  const score = Number(input.eligibilityScore);
  if (!Number.isInteger(score) || score < 0 || score > 100) {
    throw httpError("invalid_eligibility_score", 400);
  }
  if (decision === "approved" && score < 65) {
    throw httpError("eligibility_score_too_low", 400);
  }
  const note = boundedString(input.note, "reviewNote", 1000, { required: decision !== "approved" });
  const nextStatus = decision === "approved" ? "published" : decision === "rejected" ? "archived" : "draft";

  return withTransaction(async (connection) => {
    const current = await connection.execute(
      `select story_status, author_user_id from storyheaven_stories where id = :story_id for update`,
      { story_id: storyId }
    );
    if (!current.rows.length) throw httpError("story_not_found", 404);
    if (current.rows[0].STORY_STATUS !== "moderation") throw httpError("story_not_in_moderation", 409);
    if (decision === "approved") {
      await assignStoryHeavenEntry(connection, {
        storyId,
        authorUserId: current.rows[0].AUTHOR_USER_ID,
        eligibilityScore: score
      });
    }
    await connection.execute(
      `update storyheaven_stories
          set story_status = :story_status,
              review_decision = :review_decision,
              review_note = :review_note,
              eligibility_score = :eligibility_score,
              reviewed_at = systimestamp,
              reviewed_by = :reviewed_by,
              competition_eligible = :competition_eligible,
              published_at = case when :publish_flag = 'Y' then systimestamp else published_at end
        where id = :story_id`,
      {
        story_id: storyId,
        story_status: nextStatus,
        review_decision: decision,
        review_note: note || null,
        eligibility_score: score,
        reviewed_by: adminUserId,
        competition_eligible: decision === "approved" ? "Y" : "N",
        publish_flag: decision === "approved" ? "Y" : "N"
      }
    );
    await insertStoryHeavenActivity(connection, {
      storyId,
      actorUserId: adminUserId,
      type: `review_${decision}`,
      fromStatus: "moderation",
      toStatus: nextStatus,
      details: { eligibilityScore: score, note }
    });
    return selectStoryHeavenOwnerStory(connection, storyId, adminUserId);
  });
}

async function finalizeStoryHeavenRound(roundIdValue, adminUserId) {
  const roundId = boundedString(roundIdValue, "roundId", 36, { required: true });
  return withTransaction(async (connection) => {
    await connection.execute(
      `update storyheaven_rounds set round_status = 'auditing', updated_at = systimestamp
        where id = :round_id and round_status = 'open' and voting_ends_at <= systimestamp`,
      { round_id: roundId }
    );
    const locked = await connection.execute(
      `select id, round_key, round_type, parent_round_id, starts_at,
              submission_cutoff_at, voting_ends_at, audit_deadline_at,
              result_at, round_status, winner_story_id, results_json
         from storyheaven_rounds where id = :round_id for update`,
      { round_id: roundId }
    );
    if (!locked.rows.length) throw httpError("round_not_found", 404);
    const round = locked.rows[0];
    if (round.ROUND_STATUS !== "auditing") throw httpError("round_not_ready_to_finalize", 409);

    const counts = await connection.execute(
      `select e.id as entry_id, e.story_id, e.author_user_id,
              count(case when v.active = 'Y' then 1 end) as vote_count
         from storyheaven_entries e
         left join storyheaven_votes v
           on v.round_id = e.round_id and v.story_id = e.story_id
        where e.round_id = :round_id and e.entry_status = 'candidate'
        group by e.id, e.story_id, e.author_user_id, e.approved_at
        order by vote_count desc, e.approved_at asc`,
      { round_id: roundId }
    );
    const results = counts.rows.map((row, index) => ({
      entryId: row.ENTRY_ID,
      storyId: row.STORY_ID,
      authorUserId: row.AUTHOR_USER_ID,
      voteCount: Number(row.VOTE_COUNT || 0),
      rank: index + 1
    }));
    const topCount = results[0]?.voteCount || 0;
    const tied = topCount > 0 ? results.filter((item) => item.voteCount === topCount) : [];

    if (tied.length > 1) {
      const runoff = await createStoryHeavenRunoff(connection, round, tied);
      await connection.execute(
        `update storyheaven_rounds
            set round_status = 'tie_pending', results_json = :results_json, updated_at = systimestamp
          where id = :round_id`,
        { round_id: roundId, results_json: clobJson({ status: "tie", tied, runoffRoundId: runoff.ID }) }
      );
      return {
        status: "runoff_created",
        round: { ...mapStoryHeavenRound(round), status: "tie_pending" },
        runoff: mapStoryHeavenRound(runoff),
        tiedStoryIds: tied.map((item) => item.storyId)
      };
    }

    let previousCount = null;
    let currentRank = 0;
    for (let index = 0; index < results.length; index += 1) {
      const item = results[index];
      if (item.voteCount !== previousCount) currentRank = index + 1;
      previousCount = item.voteCount;
      item.rank = currentRank;
      const entryStatus = topCount > 0 && currentRank === 1 ? "winner" : currentRank === 2 ? "runner_up" : "candidate";
      await connection.execute(
        `update storyheaven_entries
            set entry_status = :entry_status,
                final_rank = :final_rank,
                vote_count_snapshot = :vote_count_snapshot,
                updated_at = systimestamp
          where id = :entry_id`,
        {
          entry_id: item.entryId,
          entry_status: entryStatus,
          final_rank: currentRank,
          vote_count_snapshot: item.voteCount
        }
      );
    }
    const winner = topCount > 0 ? results.find((item) => item.rank === 1) : null;
    await connection.execute(
      `update storyheaven_rounds
          set round_status = 'confirmed',
              winner_story_id = :winner_story_id,
              results_json = :results_json,
              updated_at = systimestamp
        where id = :round_id`,
      {
        round_id: roundId,
        winner_story_id: winner?.storyId || null,
        results_json: clobJson({ status: winner ? "confirmed" : "no_valid_votes", results, finalizedBy: adminUserId })
      }
    );
    if (winner) {
      await insertStoryHeavenActivity(connection, {
        storyId: winner.storyId,
        actorUserId: adminUserId,
        type: "weekly_winner_confirmed",
        details: { roundId, voteCount: winner.voteCount }
      });
    }
    return {
      status: winner ? "confirmed" : "no_valid_votes",
      winnerStoryId: winner?.storyId || null,
      results
    };
  });
}

async function createStoryHeavenRunoff(connection, parentRound, tied) {
  const now = new Date();
  const ends = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const audit = new Date(ends.getTime() + 12 * 60 * 60 * 1000);
  const resultAt = new Date(ends.getTime() + 18 * 60 * 60 * 1000);
  const runoff = {
    ID: randomId(),
    ROUND_KEY: `${parentRound.ROUND_KEY}-R-${Date.now().toString(36)}`.slice(0, 30),
    ROUND_TYPE: "runoff",
    PARENT_ROUND_ID: parentRound.ID,
    STARTS_AT: now,
    SUBMISSION_CUTOFF_AT: now,
    VOTING_ENDS_AT: ends,
    AUDIT_DEADLINE_AT: audit,
    RESULT_AT: resultAt,
    ROUND_STATUS: "open",
    WINNER_STORY_ID: null,
    RESULTS_JSON: null
  };
  await connection.execute(
    `insert into storyheaven_rounds (
      id, round_key, round_type, parent_round_id, starts_at, submission_cutoff_at,
      voting_ends_at, audit_deadline_at, result_at, round_status
    ) values (
      :id, :round_key, 'runoff', :parent_round_id,
      to_timestamp_tz(:starts_at, 'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'),
      to_timestamp_tz(:submission_cutoff_at, 'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'),
      to_timestamp_tz(:voting_ends_at, 'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'),
      to_timestamp_tz(:audit_deadline_at, 'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'),
      to_timestamp_tz(:result_at, 'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM'),
      'open'
    )`,
    {
      id: runoff.ID,
      round_key: runoff.ROUND_KEY,
      parent_round_id: runoff.PARENT_ROUND_ID,
      starts_at: oracleTimestampString(now),
      submission_cutoff_at: oracleTimestampString(now),
      voting_ends_at: oracleTimestampString(ends),
      audit_deadline_at: oracleTimestampString(audit),
      result_at: oracleTimestampString(resultAt)
    }
  );
  for (const item of tied) {
    await connection.execute(
      `insert into storyheaven_entries (
        id, round_id, story_id, author_user_id, entry_status, eligibility_score
      ) select :id, :round_id, source.story_id, source.author_user_id, 'candidate', source.eligibility_score
          from storyheaven_entries source where source.id = :source_entry_id`,
      { id: randomId(), round_id: runoff.ID, source_entry_id: item.entryId }
    );
  }
  return runoff;
}

function requireStoryHeavenPacket(input, mode) {
  const result = validateStoryHeavenPacket(input, { mode });
  if (!result.ok) {
    const error = httpError("story_validation_failed", 400);
    error.details = result.errors;
    throw error;
  }
  return result;
}

function assertActiveStoryHeavenNickname(profile) {
  if (profile.nicknameStatus !== "active") {
    throw httpError("storyheaven_nickname_required", 409);
  }
}

function storyHeavenSlug(title) {
  const readable = String(title || "story")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .toLowerCase()
    .slice(0, 36) || "story";
  return `${readable}-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
}

function hashStoryHeavenPacket(packet) {
  return crypto.createHash("sha256").update(JSON.stringify(packet)).digest("hex");
}

function storyHeavenStoryBinds(storyId, slug, userId, packet, revisionNo) {
  return {
    id: storyId,
    slug,
    author_user_id: userId,
    title: packet.title,
    logline: packet.logline,
    public_synopsis: packet.synopsis || null,
    protagonist_goal: packet.protagonistGoal || null,
    obstacle_stakes: packet.obstacleStakes || null,
    genre: packet.genre,
    secondary_genre: packet.secondaryGenre || null,
    tags_json: clobJson(packet.tags),
    content_rating: packet.rating === "all" ? "all" : "teen",
    rating_detail: packet.rating,
    current_revision_no: revisionNo
  };
}

async function updateStoryHeavenCurrentPacket(connection, storyId, packet, revisionNo, { reviewDecision, reviewNote }) {
  const binds = storyHeavenStoryBinds(storyId, "", "", packet, revisionNo);
  await connection.execute(
    `update storyheaven_stories
        set title = :title,
            logline = :logline,
            public_synopsis = :public_synopsis,
            protagonist_goal = :protagonist_goal,
            obstacle_stakes = :obstacle_stakes,
            genre = :genre,
            secondary_genre = :secondary_genre,
            tags_json = :tags_json,
            content_rating = :content_rating,
            rating_detail = :rating_detail,
            current_revision_no = :current_revision_no,
            review_decision = :review_decision,
            review_note = :review_note
      where id = :id`,
    {
      id: binds.id,
      title: binds.title,
      logline: binds.logline,
      public_synopsis: binds.public_synopsis,
      protagonist_goal: binds.protagonist_goal,
      obstacle_stakes: binds.obstacle_stakes,
      genre: binds.genre,
      secondary_genre: binds.secondary_genre,
      tags_json: binds.tags_json,
      content_rating: binds.content_rating,
      rating_detail: binds.rating_detail,
      current_revision_no: binds.current_revision_no,
      review_decision: reviewDecision,
      review_note: reviewNote
    }
  );
}

async function lockStoryHeavenStory(connection, storyId, userId) {
  const result = await connection.execute(
    `select id, author_user_id, story_status, current_revision_no, review_decision, review_note
       from storyheaven_stories
      where id = :story_id and author_user_id = :user_id
      for update`,
    { story_id: storyId, user_id: userId }
  );
  if (!result.rows.length) throw httpError("story_not_found", 404);
  return result.rows[0];
}

async function insertStoryHeavenRevision(connection, { storyId, revisionNo, actorUserId, kind, packet, hash }) {
  await connection.execute(
    `insert into storyheaven_revisions (
      id, story_id, revision_no, actor_user_id, revision_kind, packet_json, content_hash
    ) values (
      :id, :story_id, :revision_no, :actor_user_id, :revision_kind, :packet_json, :content_hash
    )`,
    {
      id: randomId(),
      story_id: storyId,
      revision_no: revisionNo,
      actor_user_id: actorUserId,
      revision_kind: kind,
      packet_json: clobJson(packet),
      content_hash: hash
    }
  );
}

async function upsertStoryHeavenConsent(connection, { storyId, userId, type, accepted, hash }) {
  await connection.execute(
    `merge into storyheaven_consents target
     using (select :story_id story_id, :user_id user_id, :consent_type consent_type,
                   :document_version document_version from dual) source
        on (target.story_id = source.story_id
            and target.user_id = source.user_id
            and target.consent_type = source.consent_type
            and target.document_version = source.document_version)
     when matched then update set
       accepted = :accepted,
       content_hash = :content_hash,
       accepted_at = systimestamp
     when not matched then insert (
       id, story_id, user_id, consent_type, document_version, accepted, content_hash
     ) values (
       :id, :story_id, :user_id, :consent_type, :document_version, :accepted, :content_hash
     )`,
    {
      id: randomId(),
      story_id: storyId,
      user_id: userId,
      consent_type: type,
      document_version: "storyheaven-submit-v1",
      accepted: accepted ? "Y" : "N",
      content_hash: hash
    }
  );
}

async function insertStoryHeavenActivity(connection, { storyId, actorUserId, type, fromStatus = null, toStatus = null, details = {} }) {
  await connection.execute(
    `insert into storyheaven_activity (
      id, story_id, actor_user_id, activity_type, from_status, to_status, details_json
    ) values (
      :id, :story_id, :actor_user_id, :activity_type, :from_status, :to_status, :details_json
    )`,
    {
      id: randomId(),
      story_id: storyId,
      actor_user_id: actorUserId,
      activity_type: type,
      from_status: fromStatus,
      to_status: toStatus,
      details_json: clobJson(details)
    }
  );
}

function storyHeavenOwnerSelect() {
  return `select s.id, s.slug, s.author_user_id, s.title, s.logline, s.public_synopsis,
                 s.protagonist_goal, s.obstacle_stakes, s.genre, s.secondary_genre,
                 s.tags_json, s.content_rating, s.rating_detail, s.content_origin,
                 s.competition_eligible, s.ai_disclosure_version, s.cover_path,
                 s.story_status, s.current_revision_no, s.submitted_revision_no,
                 s.submitted_at, s.reviewed_at, s.review_decision, s.review_note,
                 s.eligibility_score, s.published_at, s.created_at, s.updated_at,
                 p.nickname, p.display_name, p.account_type,
                 r.packet_json,
                 (select count(*) from storyheaven_likes likes where likes.story_id = s.id) as like_count,
                 case when exists (
                   select 1 from storyheaven_likes mine
                    where mine.story_id = s.id and mine.user_id = :viewer_user_id
                 ) then 'Y' else 'N' end as liked_by_me,
                 nvl(e.endorsement_level, 0) as endorsement_level,
                 e.public_reason as endorsement_reason
            from storyheaven_stories s
            join webtoon_profiles p on p.user_id = s.author_user_id
            left join storyheaven_revisions r
              on r.story_id = s.id and r.revision_no = s.current_revision_no
            left join storyheaven_endorsements e on e.story_id = s.id`;
}

async function selectStoryHeavenOwnerStory(connection, storyId, viewerUserId) {
  const result = await connection.execute(
    `${storyHeavenOwnerSelect()} where s.id = :story_id`,
    { story_id: storyId, viewer_user_id: viewerUserId || null }
  );
  if (!result.rows.length) throw httpError("story_not_found", 404);
  return mapStoryHeavenOwnerStory(result.rows[0]);
}

function mapStoryHeavenOwnerStory(row) {
  return {
    ...mapStoryHeavenStory(row),
    authorUserId: row.AUTHOR_USER_ID,
    secondaryGenre: row.SECONDARY_GENRE || "",
    rating: row.RATING_DETAIL || (row.CONTENT_RATING === "all" ? "all" : "15"),
    status: row.STORY_STATUS,
    revisionNo: Number(row.CURRENT_REVISION_NO || 0),
    submittedRevisionNo: row.SUBMITTED_REVISION_NO == null ? null : Number(row.SUBMITTED_REVISION_NO),
    submittedAt: row.SUBMITTED_AT || null,
    reviewedAt: row.REVIEWED_AT || null,
    reviewDecision: row.REVIEW_DECISION || "none",
    reviewNote: row.REVIEW_NOTE || "",
    eligibilityScore: row.ELIGIBILITY_SCORE == null ? null : Number(row.ELIGIBILITY_SCORE),
    createdAt: row.CREATED_AT,
    updatedAt: row.UPDATED_AT,
    packet: parseJson(row.PACKET_JSON, null)
  };
}

async function setStoryHeavenLike(storyIdValue, userId, liked, req = null) {
  const storyId = boundedString(storyIdValue, "storyId", 36, { required: true });
  return withTransaction(async (connection) => {
    const story = await connection.execute(
      `select id, author_user_id, content_origin, competition_eligible from storyheaven_stories
        where id = :story_id and story_status = 'published'`,
      { story_id: storyId }
    );
    if (!story.rows.length) {
      throw httpError("story_not_found", 404);
    }
    if (story.rows[0].AUTHOR_USER_ID === userId) {
      throw httpError("author_cannot_like_own_story", 403);
    }

    const ranked = story.rows[0].COMPETITION_ELIGIBLE === "Y" && story.rows[0].CONTENT_ORIGIN === "human";
    let roundEntry = null;
    let previousVote = null;
    if (ranked) {
      const entry = await connection.execute(
        `select e.round_id
           from storyheaven_entries e
           join storyheaven_rounds r on r.id = e.round_id
          where e.story_id = :story_id
            and e.entry_status = 'candidate'
            and r.round_status = 'open'
            and r.voting_ends_at > systimestamp`,
        { story_id: storyId }
      );
      if (!entry.rows.length) throw httpError("round_voting_closed", 409);
      roundEntry = entry.rows[0];
      const existing = await connection.execute(
        `select id, active, invalidated_at from storyheaven_votes
          where round_id = :round_id and story_id = :story_id and voter_user_id = :user_id`,
        { round_id: roundEntry.ROUND_ID, story_id: storyId, user_id: userId }
      );
      previousVote = existing.rows[0] || null;
      if (liked && previousVote?.INVALIDATED_AT) {
        throw httpError("vote_invalidated_by_operator", 409);
      }
    }

    if (liked) {
      await connection.execute(
        `merge into storyheaven_likes target
         using (select :story_id story_id, :user_id user_id from dual) source
            on (target.story_id = source.story_id and target.user_id = source.user_id)
         when not matched then insert (story_id, user_id)
         values (source.story_id, source.user_id)`,
        { story_id: storyId, user_id: userId }
      );
    } else {
      await connection.execute(
        `delete from storyheaven_likes where story_id = :story_id and user_id = :user_id`,
        { story_id: storyId, user_id: userId }
      );
    }

    if (roundEntry) {
      if (liked) {
        await connection.execute(
          `merge into storyheaven_votes target
           using (select :round_id round_id, :story_id story_id, :user_id voter_user_id from dual) source
              on (target.round_id = source.round_id
                  and target.story_id = source.story_id
                  and target.voter_user_id = source.voter_user_id)
           when matched then update set active = 'Y', cast_at = systimestamp, canceled_at = null
           when not matched then insert (id, round_id, story_id, voter_user_id)
           values (:id, :round_id, :story_id, :user_id)`,
          { id: randomId(), round_id: roundEntry.ROUND_ID, story_id: storyId, user_id: userId }
        );
      } else if (previousVote) {
        await connection.execute(
          `update storyheaven_votes set active = 'N', canceled_at = systimestamp
            where id = :id`,
          { id: previousVote.ID }
        );
      }

      const vote = await connection.execute(
        `select id from storyheaven_votes
          where round_id = :round_id and story_id = :story_id and voter_user_id = :user_id`,
        { round_id: roundEntry.ROUND_ID, story_id: storyId, user_id: userId }
      );
      if (vote.rows.length && (liked || previousVote?.ACTIVE === "Y")) {
        const eventType = liked ? (previousVote ? "restore" : "cast") : "cancel";
        await connection.execute(
          `insert into storyheaven_vote_audit (
            id, vote_id, round_id, story_id, voter_user_id, actor_user_id,
            event_type, signal_hash, signal_expires_at, details_json
          ) values (
            :id, :vote_id, :round_id, :story_id, :voter_user_id, :actor_user_id,
            :event_type, :signal_hash,
            systimestamp + numtodsinterval(:retention_days, 'DAY'), :details_json
          )`,
          {
            id: randomId(),
            vote_id: vote.rows[0].ID,
            round_id: roundEntry.ROUND_ID,
            story_id: storyId,
            voter_user_id: userId,
            actor_user_id: userId,
            event_type: eventType,
            signal_hash: hashClientIp(req),
            retention_days: config.securityRetentionDays,
            details_json: clobJson({ userAgent: classifyUserAgent(req?.get?.("user-agent")) })
          }
        );
      }
    }

    const count = await connection.execute(
      `select count(*) as like_count from storyheaven_likes where story_id = :story_id`,
      { story_id: storyId }
    );
    const weeklyCount = roundEntry
      ? await connection.execute(
          `select count(*) as vote_count from storyheaven_votes
            where round_id = :round_id and story_id = :story_id and active = 'Y'`,
          { round_id: roundEntry.ROUND_ID, story_id: storyId }
        )
      : null;
    return {
      storyId,
      liked: Boolean(liked),
      likeCount: Number(count.rows[0].LIKE_COUNT || 0),
      weeklyVoteCount: Number(weeklyCount?.rows?.[0]?.VOTE_COUNT || 0),
      roundId: roundEntry?.ROUND_ID || null,
      rankingPolicy: "reader_likes_only"
    };
  });
}

async function setStoryHeavenEndorsement(storyIdValue, input, adminUserId) {
  const storyId = boundedString(storyIdValue, "storyId", 36, { required: true });
  const level = Number(input.level ?? input.endorsementLevel ?? 0);
  if (!Number.isInteger(level) || level < 0 || level > 3) {
    throw httpError("invalid_endorsement_level", 400);
  }
  const reason = boundedString(input.reason || "", "reason", 180);

  return withTransaction(async (connection) => {
    const story = await connection.execute(
      `select id from storyheaven_stories where id = :story_id`,
      { story_id: storyId }
    );
    if (!story.rows.length) {
      throw httpError("story_not_found", 404);
    }

    if (level === 0) {
      await connection.execute(
        `delete from storyheaven_endorsements where story_id = :story_id`,
        { story_id: storyId }
      );
    } else {
      await connection.execute(
        `merge into storyheaven_endorsements target
         using (select :story_id story_id from dual) source
            on (target.story_id = source.story_id)
         when matched then update set
           admin_user_id = :admin_user_id,
           endorsement_level = :endorsement_level,
           public_reason = :public_reason
         when not matched then insert (
           story_id, admin_user_id, endorsement_level, public_reason
         ) values (
           :story_id, :admin_user_id, :endorsement_level, :public_reason
         )`,
        {
          story_id: storyId,
          admin_user_id: adminUserId,
          endorsement_level: level,
          public_reason: reason || null
        }
      );
    }
    return { storyId, endorsementLevel: level, reason, affectsReaderLikeCount: false };
  });
}

function mapStoryHeavenStory(row) {
  return {
    id: row.ID,
    slug: row.SLUG,
    title: row.TITLE,
    logline: row.LOGLINE,
    synopsis: row.PUBLIC_SYNOPSIS || "",
    genre: row.GENRE,
    tags: parseJson(row.TAGS_JSON, []),
    contentRating: row.CONTENT_RATING,
    contentOrigin: row.CONTENT_ORIGIN,
    competitionEligible: row.COMPETITION_ELIGIBLE === "Y",
    aiDisclosureVersion: row.AI_DISCLOSURE_VERSION || null,
    coverPath: row.COVER_PATH || "",
    publishedAt: row.PUBLISHED_AT,
    author: {
      nickname: row.NICKNAME || row.DISPLAY_NAME || "이야기씨앗",
      accountType: row.ACCOUNT_TYPE || "human"
    },
    likeCount: Number(row.LIKE_COUNT || 0),
    weeklyVoteCount: Number(row.WEEKLY_VOTE_COUNT || 0),
    weeklyRoundId: row.WEEKLY_ROUND_ID || null,
    likedByMe: row.WEEKLY_ROUND_ID ? row.WEEKLY_VOTED_BY_ME === "Y" : row.LIKED_BY_ME === "Y",
    endorsement: Number(row.ENDORSEMENT_LEVEL || 0) > 0
      ? { level: Number(row.ENDORSEMENT_LEVEL), reason: row.ENDORSEMENT_REASON || "" }
      : null
  };
}

async function claimDailyAcorns(user, req) {
  const profile = await ensureUserProfile(user, req);
  if (profile.isAdmin) {
    return { claimed: false, acorns: 999, isAdmin: true };
  }

  return withTransaction(async (connection) => {
    const claim = await connection.execute(
      `select amount
         from webtoon_daily_acorn_claims
        where user_id = :user_id
          and claim_date = trunc(sysdate)`,
      { user_id: user.id }
    );

    if (claim.rows.length) {
      const current = await selectProfileForUpdate(connection, user.id);
      return { claimed: false, acorns: Number(current.ACORNS), isAdmin: false };
    }

    const current = await selectProfileForUpdate(connection, user.id);
    const balance = Number(current.ACORNS) + 5;

    await connection.execute(
      `insert into webtoon_daily_acorn_claims (user_id, claim_date, amount)
       values (:user_id, trunc(sysdate), 5)`,
      { user_id: user.id }
    );

    await connection.execute(
      `update webtoon_profiles
          set acorns = :balance
        where user_id = :user_id`,
      { balance, user_id: user.id }
    );

    await connection.execute(
      `insert into webtoon_acorn_ledger (
        id, user_id, delta, balance_after, reason, metadata_json
      ) values (
        :id, :user_id, 5, :balance, 'daily_claim', :metadata_json
      )`,
      {
        id: randomId(),
        user_id: user.id,
        balance,
        metadata_json: clobJson({ source: "oracle-api" })
      }
    );

    return { claimed: true, acorns: balance, isAdmin: false };
  });
}

async function listUsers({ search = "", limit = 50 } = {}) {
  const normalizedSearch = String(search || "").trim().slice(0, 120).replace(/[\\%_]/g, "");
  return withConnection(async (connection) => {
    const binds = {};
    const where = normalizedSearch
      ? "where lower(email) like :search or lower(display_name) like :search"
      : "";
    if (normalizedSearch) {
      binds.search = `%${normalizedSearch.toLowerCase()}%`;
    }

    const result = await connection.execute(
      `select user_id, email, display_name, is_admin, acorns, account_status,
              banned_at, ban_reason, last_seen_at, login_count, last_ip_hash,
              last_user_agent, guide_completed, created_at, updated_at
         from webtoon_profiles
         ${where}
        order by is_admin desc, created_at desc
        fetch first ${limit} rows only`,
      binds
    );
    return result.rows.map(mapProfile);
  });
}

async function setUserAcorns(userId, input, adminUser, req) {
  const targetId = boundedString(userId, "userId", 80, { required: true });
  const balance = Number(input.balance);
  const reason = boundedString(input.reason || "관리자 조정", "reason", 200, { required: true });
  if (!Number.isInteger(balance) || balance < 0 || balance > 999999) {
    throw httpError("invalid_acorn_balance", 400);
  }

  return withTransaction(async (connection) => {
    const current = await selectProfileForUpdate(connection, targetId);
    if (current.IS_ADMIN === "Y" || normalizeEmail(current.EMAIL) === config.adminEmail) {
      throw httpError("admin_balance_is_unlimited", 409);
    }
    const previous = Number(current.ACORNS);

    await connection.execute(
      `update webtoon_profiles set acorns = :balance where user_id = :user_id`,
      { balance, user_id: targetId }
    );
    await connection.execute(
      `insert into webtoon_acorn_ledger (
        id, user_id, delta, balance_after, reason, ref_type, ref_id, metadata_json
      ) values (
        :id, :user_id, :delta, :balance_after, 'admin_adjust', 'admin_user', :ref_id, :metadata_json
      )`,
      {
        id: randomId(),
        user_id: targetId,
        delta: balance - previous,
        balance_after: balance,
        ref_id: adminUser.id,
        metadata_json: clobJson({ reason })
      }
    );
    await insertSecurityEvent(connection, {
      req,
      userId: targetId,
      eventType: "admin_acorn_adjust",
      severity: "info",
      details: { adminUserId: adminUser.id, previous, balance, reason }
    });

    const updated = await connection.execute(
      `select user_id, email, display_name, is_admin, acorns, account_status,
              banned_at, ban_reason, last_seen_at, login_count, last_ip_hash,
              last_user_agent, guide_completed, created_at, updated_at
         from webtoon_profiles where user_id = :user_id`,
      { user_id: targetId }
    );
    return mapProfile(updated.rows[0]);
  });
}

async function setUserStatus(userId, input, adminUser, req) {
  const targetId = boundedString(userId, "userId", 80, { required: true });
  const status = String(input.status || "").trim();
  const reason = boundedString(input.reason || "", "reason", 500);
  if (!new Set(["active", "banned"]).has(status)) {
    throw httpError("invalid_account_status", 400);
  }
  if (status === "banned" && reason.length < 3) {
    throw httpError("ban_reason_required", 400);
  }

  const profile = await withTransaction(async (connection) => {
    const current = await selectProfileForUpdate(connection, targetId);
    if (current.IS_ADMIN === "Y" || normalizeEmail(current.EMAIL) === config.adminEmail) {
      throw httpError("admin_account_is_protected", 409);
    }

    await connection.execute(
      `update webtoon_profiles
          set account_status = :account_status,
              banned_at = case when :account_status = 'banned' then systimestamp else null end,
              ban_reason = case when :account_status = 'banned' then :ban_reason else null end
        where user_id = :user_id`,
      { account_status: status, ban_reason: reason || null, user_id: targetId }
    );
    await insertSecurityEvent(connection, {
      req,
      userId: targetId,
      eventType: status === "banned" ? "admin_ban" : "admin_unban",
      severity: status === "banned" ? "high" : "info",
      details: { adminUserId: adminUser.id, reason }
    });

    const updated = await connection.execute(
      `select user_id, email, display_name, is_admin, acorns, account_status,
              banned_at, ban_reason, last_seen_at, login_count, last_ip_hash,
              last_user_agent, guide_completed, created_at, updated_at
         from webtoon_profiles where user_id = :user_id`,
      { user_id: targetId }
    );
    return mapProfile(updated.rows[0]);
  });

  const providerBanSynced = await syncSupabaseBan(targetId, status).catch(() => false);
  return { profile, providerBanSynced };
}

async function listSecurityEvents(limit) {
  return withTransaction(async (connection) => {
    await connection.execute("delete from webtoon_security_events where expires_at < systimestamp");
    const result = await connection.execute(
      `select id, user_id, event_type, severity, ip_hash, user_agent_category,
              details_json, created_at, expires_at
         from webtoon_security_events
        order by created_at desc
        fetch first ${limit} rows only`
    );
    return result.rows.map((row) => ({
      id: row.ID,
      userId: row.USER_ID,
      eventType: row.EVENT_TYPE,
      severity: row.SEVERITY,
      ipFingerprint: shortHash(row.IP_HASH),
      userAgent: row.USER_AGENT_CATEGORY || "unknown",
      details: parseJson(row.DETAILS_JSON, {}),
      createdAt: row.CREATED_AT,
      expiresAt: row.EXPIRES_AT
    }));
  });
}

async function loadAdminPlan() {
  if (!config.adminPlanFile) {
    return {
      available: false,
      message: "서버의 WEBTOON_ADMIN_PLAN_FILE을 설정하면 비공개 설계 문서를 불러옵니다."
    };
  }
  const file = await readFile(path.resolve(config.adminPlanFile), "utf8");
  if (Buffer.byteLength(file, "utf8") > 1024 * 1024) {
    throw httpError("admin_plan_too_large", 413);
  }
  return { available: true, plan: parseJson(file, { text: file }) };
}

async function syncSupabaseBan(userId, status) {
  if (!config.supabaseServiceRoleKey) {
    return false;
  }
  const response = await fetch(`${config.supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
    headers: {
      apikey: config.supabaseServiceRoleKey,
      Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ ban_duration: status === "banned" ? "876000h" : "none" }),
    signal: AbortSignal.timeout(8000)
  });
  return response.ok;
}

async function upsertProject(input, user, req) {
  assertCreationAllowed(user);
  const project = normalizeProject(input);
  await ensureUserProfile(user, req);

  return withTransaction(async (connection) => {
    const existing = await connection.execute(
      `select id, user_id from webtoon_projects where id = :id`,
      { id: project.id }
    );

    if (existing.rows.length && !isAdminIdentity(user) && existing.rows[0].USER_ID !== user.id) {
      throw httpError("project_access_denied", 403);
    }

    const mayPublish = isAdminIdentity(user);
    project.status = mayPublish ? project.status : "draft";
    project.isPublic = mayPublish ? project.isPublic : false;
    project.project.status = project.status;
    project.project.isPublic = project.isPublic;
    if (project.status === "published" || project.isPublic) {
      assertProjectPublishReady(project.project);
    }

    const binds = {
      id: project.id,
      user_id: user.id,
      title: project.title,
      idea: { val: project.idea, type: oracledb.CLOB },
      genre: project.genre,
      panels_json: clobJson(project.panels),
      project_json: clobJson(project.project),
      status: project.status,
      is_public: project.isPublic ? "Y" : "N"
    };

    if (existing.rows.length) {
      await connection.execute(
        `update webtoon_projects
            set user_id = :user_id,
                title = :title,
                idea = :idea,
                genre = :genre,
                panels_json = :panels_json,
                project_json = :project_json,
                status = :status,
                is_public = :is_public
          where id = :id`,
        binds
      );
    } else {
      await connection.execute(
        `insert into webtoon_projects (
          id, user_id, title, idea, genre, panels_json, project_json, status, is_public
        ) values (
          :id, :user_id, :title, :idea, :genre, :panels_json, :project_json, :status, :is_public
        )`,
        binds
      );
    }

    await syncPanelProductionRecords(connection, project);

    return getProject(project.id, connection);
  });
}

async function syncPanelProductionRecords(connection, project) {
  try {
    await connection.execute(
      `update webtoon_panel_versions set is_approved = 'N', is_stage_approved = 'N' where project_id = :project_id`,
      { project_id: project.id }
    );
    for (const panel of project.panels) {
      const versions = Array.isArray(panel.imageVersions) ? panel.imageVersions : [];
      for (const version of versions) {
        const versionId = boundedString(version?.id, "panelVersion.id", 120, { required: true });
        const versionKey = `${project.id}|${panel.id}|${versionId}`;
        const status = ["candidate", "approved", "needs-fix", "superseded"].includes(version?.status)
          ? version.status
          : "candidate";
        await connection.execute(
          `merge into webtoon_panel_versions target
           using (select :version_key as version_key from dual) source
              on (target.version_key = source.version_key)
           when matched then update set
             parent_version_id = :parent_version_id,
             source_asset_id = :source_asset_id,
             prompt_package_id = :prompt_package_id,
             edit_target = :edit_target,
             mask_asset_id = :mask_asset_id,
             render_stage = :render_stage,
             requested_quality = :requested_quality,
             version_status = :version_status,
             is_approved = :is_approved,
             is_stage_approved = :is_stage_approved,
             metadata_json = :metadata_json
           when not matched then insert (
             version_key, project_id, panel_id, version_id, parent_version_id,
             source_asset_id, prompt_package_id, edit_target, mask_asset_id,
             render_stage, requested_quality, version_status, is_approved, is_stage_approved, metadata_json
           ) values (
             :version_key, :project_id, :panel_id, :version_id, :parent_version_id,
             :source_asset_id, :prompt_package_id, :edit_target, :mask_asset_id,
             :render_stage, :requested_quality, :version_status, :is_approved, :is_stage_approved, :metadata_json
           )`,
          {
            version_key: versionKey,
            project_id: project.id,
            panel_id: panel.id,
            version_id: versionId,
            parent_version_id: nullableBoundedString(version.parentVersionId, "parentVersionId", 120),
            source_asset_id: nullableBoundedString(version.sourceAssetId || version.imageKey, "sourceAssetId", 500),
            prompt_package_id: nullableBoundedString(version.promptPackageId, "promptPackageId", 120),
            edit_target: nullableBoundedString(version.editTarget || "full", "editTarget", 40),
            mask_asset_id: nullableBoundedString(version.maskAssetId, "maskAssetId", 160),
            render_stage: version.renderStage === "draft" ? "draft" : "final",
            requested_quality: version.requestedQuality === "low" ? "low" : "high",
            version_status: status,
            is_approved: panel.approvedVersionId === versionId ? "Y" : "N",
            is_stage_approved: (version.renderStage === "draft" ? panel.draftApprovedVersionId : panel.finalApprovedVersionId || panel.approvedVersionId) === versionId ? "Y" : "N",
            metadata_json: clobJson(version)
          }
        );

        await connection.execute(
          `delete from webtoon_panel_qc_issues where version_key = :version_key`,
          { version_key: versionKey }
        );
        const issues = Array.isArray(version?.qc?.issues) ? version.qc.issues.slice(0, 40) : [];
        for (const issue of issues) {
          const severity = ["info", "warning", "error", "critical"].includes(issue?.severity)
            ? issue.severity
            : "warning";
          await connection.execute(
            `insert into webtoon_panel_qc_issues (
              id, version_key, project_id, panel_id, severity, category, issue_json
            ) values (
              :id, :version_key, :project_id, :panel_id, :severity, :category, :issue_json
            )`,
            {
              id: randomId(),
              version_key: versionKey,
              project_id: project.id,
              panel_id: panel.id,
              severity,
              category: nullableBoundedString(issue?.category, "qcIssue.category", 80),
              issue_json: clobJson(issue)
            }
          );
        }
      }
    }
  } catch (error) {
    if ([904, 942].includes(Number(error?.errorNum))) {
      console.warn("[oracle] panel version audit migration is incomplete; project JSON remains authoritative");
      return;
    }
    throw error;
  }
}

async function latestPublicProject() {
  return withConnection(async (connection) => {
    const result = await connection.execute(
      `select id, user_id, title, idea, genre, panels_json, project_json, status, is_public, updated_at
         from webtoon_projects
        where is_public = 'Y'
          and status = 'published'
        order by updated_at desc
        fetch first 1 rows only`
    );

    return result.rows.length ? mapProject(result.rows[0]) : null;
  });
}

async function getProject(id, existingConnection = null) {
  const projectId = boundedString(id, "id", 36, { required: true });
  const run = async (connection) => {
    const result = await connection.execute(
      `select id, user_id, title, idea, genre, panels_json, project_json, status, is_public, updated_at
         from webtoon_projects
        where id = :id`,
      { id: projectId }
    );
    return result.rows.length ? mapProject(result.rows[0]) : null;
  };

  return existingConnection ? run(existingConnection) : withConnection(run);
}

async function createJob(input, user, req) {
  assertCreationAllowed(user);
  const jobType = boundedString(input.jobType || input.job_type, "jobType", 60, { required: true });
  if (!["draft_generation", "panel_regenerate"].includes(jobType)) {
    throw httpError("invalid_job_type", 400);
  }
  const cost = generationCosts[jobType];

  const rawRequestPayload = input.requestPayload || input.request_payload || {};
  if (!rawRequestPayload || typeof rawRequestPayload !== "object" || Array.isArray(rawRequestPayload)) {
    throw httpError("invalid_job_request", 400);
  }
  const requestPayload = { ...rawRequestPayload };
  const renderStage = requestPayload.renderStage === "final" ? "final" : "draft";
  if (requestPayload.renderStage && !["draft", "final"].includes(requestPayload.renderStage)) {
    throw httpError("invalid_render_stage", 400);
  }
  requestPayload.renderStage = renderStage;
  requestPayload.requestedQuality = renderStage === "final" ? "high" : "low";
  if (jobType === "draft_generation" && renderStage === "final") {
    const packages = Array.isArray(requestPayload.promptPackages) ? requestPayload.promptPackages : [];
    const missingDraftReference = packages.some((item) => (
      !item?.sourceDraftVersionId
      || !Array.isArray(item.referenceManifest)
      || !item.referenceManifest.some((reference) => reference?.type === "approved-draft" && /^https:\/\//i.test(String(reference?.source || "")))
    ));
    if (!packages.length || missingDraftReference) {
      throw httpError("approved_draft_reference_required", 400);
    }
  }
  if (jobType === "panel_regenerate") {
    const regionMask = normalizeRegionMaskRequest(requestPayload.regionMask);
    if (regionMask) {
      requestPayload.regionMask = regionMask;
      requestPayload.regionMaskAssetId = regionMask.id;
      requestPayload.targetRegion = regionMask.bounds;
    } else {
      requestPayload.regionMask = null;
    }
  }
  assertJsonSize(requestPayload, contentLimits.jobRequestBytes, "job_request_too_large");

  const job = {
    id: randomId(),
    projectId: nullableBoundedString(input.projectId || input.project_id, "projectId", 36),
    jobType,
    scenarioKey: nullableBoundedString(input.scenarioKey || input.scenario_key, "scenarioKey", 100),
    cost,
    requestPayload,
    parentJobId: null,
    panelId: nullableBoundedString(requestPayload.panel?.id, "panelId", 120),
    promptPackageId: nullableBoundedString(requestPayload.promptPackage?.id, "promptPackageId", 120),
    attempt: 1
  };

  const ensuredProfile = await ensureUserProfile(user, req);
  const admin = isAdminIdentity(user);

  return withTransaction(async (connection) => {
    if (job.jobType === "draft_generation" && renderStage === "final") {
      await assertApprovedDraftReferences(connection, job, user);
    }
    let balanceAfter = admin ? 999 : Number(ensuredProfile.acorns);
    if (job.cost > 0 && !admin) {
      const profile = await selectProfileForUpdate(connection, user.id);
      const balance = Number(profile.ACORNS);
      if (balance < job.cost) {
        const error = new Error("not_enough_acorns");
        error.status = 409;
        throw error;
      }

      const nextBalance = balance - job.cost;
      await connection.execute(
        `update webtoon_profiles set acorns = :balance where user_id = :user_id`,
        { balance: nextBalance, user_id: user.id }
      );
      await connection.execute(
        `insert into webtoon_acorn_ledger (
          id, user_id, delta, balance_after, reason, ref_type, ref_id, metadata_json
        ) values (
          :id, :user_id, :delta, :balance_after, :reason, 'generation_job', :ref_id, :metadata_json
        )`,
        {
          id: randomId(),
          user_id: user.id,
          delta: -job.cost,
          balance_after: nextBalance,
          reason: job.jobType,
          ref_id: job.id,
          metadata_json: clobJson({ projectId: job.projectId })
        }
      );
      balanceAfter = nextBalance;
    }

    const packages = job.jobType === "draft_generation" && Array.isArray(job.requestPayload.promptPackages)
      ? job.requestPayload.promptPackages
      : [];
    let createdJob;
    let childCount = 0;
    if (packages.length) {
      const parentJob = {
        ...job,
        jobType: "episode_generation",
        panelId: null,
        promptPackageId: null
      };
      await insertGenerationJob(connection, parentJob, user.id, "running");
      const sourcePanels = Array.isArray(job.requestPayload.panels) ? job.requestPayload.panels : [];
      for (const [index, promptPackage] of packages.entries()) {
        const panelId = boundedString(promptPackage.panelId || `panel-${index + 1}`, "panelId", 120, { required: true });
        const panel = sourcePanels.find((item) => item?.id === panelId) || null;
        const childJob = {
          id: randomId(),
          projectId: job.projectId,
          parentJobId: parentJob.id,
          panelId,
          promptPackageId: nullableBoundedString(promptPackage.id, "promptPackageId", 120),
          jobType: "panel_generation",
          scenarioKey: job.scenarioKey,
          cost: 0,
          attempt: 1,
          requestPayload: {
            ...job.requestPayload,
            promptPackages: [promptPackage],
            panel,
            panelIndex: Number.isInteger(promptPackage.panelIndex) ? promptPackage.panelIndex : index
          }
        };
        assertJsonSize(childJob.requestPayload, contentLimits.jobRequestBytes, "job_request_too_large");
        await insertGenerationJob(connection, childJob, user.id, "ready");
        childCount += 1;
      }
      createdJob = await getJob(parentJob.id, connection);
    } else {
      await insertGenerationJob(connection, job, user.id, "ready");
      createdJob = await getJob(job.id, connection);
    }
    return {
      job: createdJob,
      childCount,
      profile: {
        acorns: balanceAfter,
        isAdmin: admin
      }
    };
  });
}

async function assertApprovedDraftReferences(connection, job, user) {
  if (!job.projectId) throw httpError("project_required", 400);
  const project = await getProject(job.projectId, connection);
  if (!project || (!isAdminIdentity(user) && project.userId !== user.id)) {
    throw httpError("project_not_found", 404);
  }
  const packages = Array.isArray(job.requestPayload.promptPackages) ? job.requestPayload.promptPackages : [];
  for (const promptPackage of packages) {
    const panelId = String(promptPackage?.panelId || "");
    const panel = (project.panels || []).find((item) => String(item?.id || "") === panelId);
    const versionId = String(promptPackage?.sourceDraftVersionId || "");
    const version = panel?.imageVersions?.find((item) => String(item?.id || "") === versionId);
    const reference = promptPackage?.referenceManifest?.find((item) => item?.type === "approved-draft");
    const storedSource = String(version?.sourceUrl || "");
    const requestedSource = String(reference?.source || "");
    const storedPath = storedSource.startsWith("/")
      ? storedSource
      : /^https?:\/\//i.test(storedSource) ? new URL(storedSource).pathname : "";
    const sourceMatches = Boolean(storedSource && requestedSource && (
      requestedSource === storedSource
      || (storedPath && requestedSource.endsWith(storedPath))
    ));
    const assetResult = sourceMatches
      ? await connection.execute(
          `select count(*) as asset_count
             from webtoon_assets
            where project_id = :project_id
              and panel_id = :panel_id
              and public_path = :public_path`,
          { project_id: job.projectId, panel_id: panelId, public_path: storedSource }
        )
      : null;
    const assetExists = Number(assetResult?.rows?.[0]?.ASSET_COUNT || 0) > 0;
    if (
      !panel
      || panel.draftApprovedVersionId !== versionId
      || version?.renderStage !== "draft"
      || version?.status !== "approved"
      || version?.qc?.overall !== "approved"
      || !sourceMatches
      || !assetExists
    ) {
      throw httpError("approved_draft_reference_mismatch", 409);
    }
  }
}

async function insertGenerationJob(connection, job, userId, status) {
  await connection.execute(
    `insert into webtoon_generation_jobs (
      id, user_id, project_id, parent_job_id, panel_id, prompt_package_id, attempt,
      job_type, scenario_key, cost, status, progress, request_payload
    ) values (
      :id, :user_id, :project_id, :parent_job_id, :panel_id, :prompt_package_id, :attempt,
      :job_type, :scenario_key, :cost, :status, 0, :request_payload
    )`,
    {
      id: job.id,
      user_id: userId,
      project_id: job.projectId,
      parent_job_id: job.parentJobId,
      panel_id: job.panelId,
      prompt_package_id: job.promptPackageId,
      attempt: job.attempt || 1,
      job_type: job.jobType,
      scenario_key: job.scenarioKey,
      cost: job.cost,
      status,
      request_payload: clobJson(job.requestPayload)
    }
  );
}

async function readyJobs(limit) {
  return withConnection(async (connection) => {
    const result = await connection.execute(
      `select id, user_id, project_id, parent_job_id, panel_id, prompt_package_id, attempt,
              job_type, scenario_key, cost, status, progress,
              request_payload, result_payload, error_message, created_at, updated_at
         from webtoon_generation_jobs
        where status = 'ready'
          and job_type <> 'episode_generation'
        order by created_at asc
        fetch first ${limit} rows only`
    );
    return result.rows.map(mapJob);
  });
}

async function getJobStatus(id, user) {
  return withConnection(async (connection) => {
    const job = await getJob(id, connection);
    if (!job) return null;
    if (!isAdminIdentity(user) && job.userId !== user.id) {
      throw httpError("job_access_denied", 403);
    }
    const result = await connection.execute(
      `select id, user_id, project_id, parent_job_id, panel_id, prompt_package_id, attempt,
              job_type, scenario_key, cost, status, progress,
              request_payload, result_payload, error_message, created_at, updated_at
         from webtoon_generation_jobs
        where parent_job_id = :parent_job_id
        order by created_at asc`,
      { parent_job_id: job.id }
    );
    return { job, children: result.rows.map(mapJob) };
  });
}

async function retryFailedJob(id) {
  boundedString(id, "id", 36, { required: true });
  return withTransaction(async (connection) => {
    const job = await getJob(id, connection);
    if (!job) return null;
    if (!["panel_generation", "panel_regenerate"].includes(job.jobType)) {
      throw httpError("job_not_retryable", 409);
    }
    if (job.status !== "failed") {
      throw httpError("job_not_failed", 409);
    }
    if (job.attempt >= 3) {
      throw httpError("job_retry_limit_reached", 409);
    }
    await connection.execute(
      `update webtoon_generation_jobs
          set status = 'ready',
              progress = 0,
              attempt = attempt + 1,
              result_payload = null,
              error_message = null
        where id = :id`,
      { id }
    );
    if (job.parentJobId) await refreshParentJob(connection, job.parentJobId);
    return getJob(id, connection);
  });
}

async function updateJob(id, input) {
  boundedString(id, "id", 36, { required: true });
  if (input.resultPayload !== undefined || input.result_payload !== undefined) {
    assertJsonSize(
      input.resultPayload ?? input.result_payload,
      contentLimits.jobResultBytes,
      "job_result_too_large"
    );
  }

  return withTransaction(async (connection) => {
    const allowedStatus = new Set(["ready", "running", "done", "failed", "canceled"]);
    if (input.status !== undefined && !allowedStatus.has(input.status)) {
      throw httpError("invalid_job_status", 400);
    }
    if (input.progress !== undefined) {
      const progress = Number(input.progress);
      if (!Number.isInteger(progress) || progress < 0 || progress > 100) {
        throw httpError("invalid_job_progress", 400);
      }
    }
    const patch = {
      status: allowedStatus.has(input.status) ? input.status : null,
      progress: input.progress === undefined ? null : Number(input.progress),
      result_payload: input.resultPayload ?? input.result_payload,
      error_message: nullableBoundedString(
        input.errorMessage ?? input.error_message,
        "errorMessage",
        contentLimits.errorMessage
      )
    };

    const current = await getJob(id, connection);
    if (!current) {
      return null;
    }

    const assignments = [];
    const bindings = { id };
    if (input.status !== undefined) {
      assignments.push("status = :status");
      bindings.status = patch.status;
    }
    if (input.progress !== undefined) {
      assignments.push("progress = :progress");
      bindings.progress = patch.progress;
    }
    if (patch.result_payload !== undefined) {
      assignments.push("result_payload = :result_payload");
      bindings.result_payload = clobJson(patch.result_payload);
    }
    if (input.errorMessage !== undefined || input.error_message !== undefined) {
      assignments.push("error_message = :error_message");
      bindings.error_message = patch.error_message;
    }

    if (assignments.length) {
      await connection.execute(
        `update webtoon_generation_jobs
            set ${assignments.join(", ")}
          where id = :id`,
        bindings
      );
    }

    if (current.parentJobId) {
      await refreshParentJob(connection, current.parentJobId);
    }

    return getJob(id, connection);
  });
}

async function refreshParentJob(connection, parentJobId) {
  const summary = await connection.execute(
    `select count(*) as total,
            sum(case when status = 'done' then 1 else 0 end) as done_count,
            sum(case when status = 'failed' then 1 else 0 end) as failed_count,
            round(avg(progress)) as avg_progress
       from webtoon_generation_jobs
      where parent_job_id = :parent_job_id`,
    { parent_job_id: parentJobId }
  );
  const row = summary.rows[0];
  const total = Number(row?.TOTAL || 0);
  const done = Number(row?.DONE_COUNT || 0);
  const failed = Number(row?.FAILED_COUNT || 0);
  const status = total > 0 && done === total ? "done" : failed > 0 ? "failed" : "running";
  const progress = total > 0 && done === total ? 100 : Number(row?.AVG_PROGRESS || 0);
  await connection.execute(
    `update webtoon_generation_jobs
        set status = :status,
            progress = :progress,
            result_payload = :result_payload
      where id = :id`,
    {
      id: parentJobId,
      status,
      progress,
      result_payload: clobJson({
        schemaVersion: "webtoon-episode-job-result/v1",
        total,
        done,
        failed,
        pending: Math.max(0, total - done - failed)
      })
    }
  );
}

async function getJob(id, connection) {
  const result = await connection.execute(
    `select id, user_id, project_id, parent_job_id, panel_id, prompt_package_id, attempt,
            job_type, scenario_key, cost, status, progress,
            request_payload, result_payload, error_message, created_at, updated_at
       from webtoon_generation_jobs
      where id = :id`,
    { id }
  );
  return result.rows.length ? mapJob(result.rows[0]) : null;
}

async function resolveAssetOwner(connection, { jobId, projectId }) {
  if (jobId) {
    const job = await connection.execute(
      "select user_id from webtoon_generation_jobs where id = :id",
      { id: jobId }
    );
    if (job.rows.length) {
      return job.rows[0].USER_ID;
    }
  }
  if (projectId) {
    const project = await connection.execute(
      "select user_id from webtoon_projects where id = :id",
      { id: projectId }
    );
    if (project.rows.length) {
      return project.rows[0].USER_ID;
    }
  }
  return config.adminUserId;
}

async function registerUploadedAsset(req, actorUser = null) {
  await ensureAdminProfile();

  const tempPath = req.file.path;
  const fileStats = await stat(tempPath);
  const detectedImage = await detectImageFile(tempPath);
  if (!detectedImage) {
    throw httpError("invalid_image_signature", 415);
  }
  const sha256 = await hashFile(tempPath);
  const metadata = {
    originalName: boundedString(
      req.file.originalname || "image",
      "originalName",
      contentLimits.uploadMetadata.originalName,
      { required: true }
    ),
    source: boundedString(
      req.body.source || "manual-download",
      "source",
      contentLimits.uploadMetadata.source,
      { required: true }
    ),
    note: boundedString(req.body.note || "", "note", contentLimits.uploadMetadata.note)
  };

  const projectId = nullableBoundedString(req.body.projectId || req.body.project_id, "projectId", 36);
  const jobId = nullableBoundedString(req.body.jobId || req.body.job_id, "jobId", 36);
  const panelId = nullableBoundedString(req.body.panelId || req.body.panel_id, "panelId", 120);
  const id = randomId();
  const storedName = `${new Date().toISOString().replace(/[:.]/g, "-")}_${sha256.slice(0, 16)}${detectedImage.extension}`;
  const finalPath = path.join(config.assetDir, storedName);
  const publicPath = `/assets/webtoon/${storedName}`;
  const publicUrl = config.publicBaseUrl ? `${config.publicBaseUrl}${publicPath}` : publicPath;
  await rename(tempPath, finalPath);

  try {
    return await withTransaction(async (connection) => {
      const assetOwnerId = await resolveAssetOwner(connection, { jobId, projectId });
      if (actorUser && !isAdminIdentity(actorUser) && actorUser.id !== assetOwnerId) {
        throw httpError("asset_owner_mismatch", 403);
      }
      await connection.execute(
        `insert into webtoon_assets (
          id, user_id, project_id, job_id, panel_id, file_name, mime_type, file_size,
          sha256, storage_path, public_path, metadata_json
        ) values (
          :id, :user_id, :project_id, :job_id, :panel_id, :file_name, :mime_type, :file_size,
          :sha256, :storage_path, :public_path, :metadata_json
        )`,
        {
          id,
          user_id: assetOwnerId,
          project_id: projectId,
          job_id: jobId,
          panel_id: panelId,
          file_name: storedName,
          mime_type: detectedImage.mimeType,
          file_size: fileStats.size,
          sha256,
          storage_path: finalPath,
          public_path: publicUrl,
          metadata_json: clobJson(metadata)
        }
      );

      await connection.execute(
        `insert into webtoon_asset_versions (
          id, asset_id, version_no, storage_path, public_path, metadata_json
        ) values (
          :id, :asset_id, 1, :storage_path, :public_path, :metadata_json
        )`,
        {
          id: randomId(),
          asset_id: id,
          storage_path: finalPath,
          public_path: publicUrl,
          metadata_json: clobJson({ initial: true })
        }
      );

      return {
        id,
        projectId,
        panelId,
        fileName: storedName,
        mimeType: detectedImage.mimeType,
        fileSize: fileStats.size,
        sha256,
        publicPath: publicUrl
      };
    });
  } catch (error) {
    await unlink(finalPath).catch(() => {});
    throw error;
  }
}

async function selectProfileForUpdate(connection, userId) {
  const result = await connection.execute(
    `select user_id, email, display_name, is_admin, acorns, account_status, guide_completed
       from webtoon_profiles
      where user_id = :user_id
      for update`,
    { user_id: userId }
  );

  if (!result.rows.length) {
    throw httpError("profile_not_found", 404);
  }

  return result.rows[0];
}

async function ensureAdminProfileInConnection(connection) {
  const result = await connection.execute(
    `select user_id from webtoon_profiles where user_id = :user_id`,
    { user_id: config.adminUserId }
  );

  if (!result.rows.length) {
    await connection.execute(
      `insert into webtoon_profiles (
        user_id, email, display_name, is_admin, account_type,
        nickname, nickname_normalized, nickname_status, nickname_changed_at,
        acorns, guide_completed, profile_json
      ) values (
        :user_id, :email, :display_name, 'Y', 'admin',
        :nickname, :nickname_normalized, 'active', systimestamp,
        20, 'N', :profile_json
      )`,
      {
        user_id: config.adminUserId,
        email: config.adminEmail,
        display_name: config.adminDisplayName,
        nickname: "시스템 보관함",
        nickname_normalized: normalizeStoryHeavenNickname("시스템 보관함"),
        profile_json: clobJson({ source: "oracle-api-bootstrap" })
      }
    );
  }
}

function normalizeProject(input) {
  const project = input.project && typeof input.project === "object" ? input.project : input;
  const sourcePanels = Array.isArray(project.panels) ? project.panels : [];
  if (sourcePanels.length < contentLimits.panelMin || sourcePanels.length > contentLimits.panelMax) {
    throw httpError("panel_count_out_of_range", 400);
  }

  const panels = sourcePanels.map(normalizePanel);
  if (new Set(panels.map((panel) => panel.id)).size !== panels.length) {
    throw httpError("duplicate_panel_id", 400);
  }
  const title = boundedString(project.title || "Untitled Webtoon", "title", contentLimits.title, { required: true });
  const idea = boundedString(project.idea || "", "idea", contentLimits.story);
  const genre = boundedString(project.genre || "modern-awakening", "genre", 80, { required: true });
  if (genre !== "modern-awakening") {
    throw httpError("unsupported_genre", 400);
  }

  const safeProject = {
    schemaVersion: clampInt(project.schemaVersion, 1, 20, 2),
    id: boundedString(project.id || project.remoteId || randomId(), "id", 36, { required: true }),
    title,
    idea,
    episodeLabel: boundedString(project.episodeLabel || "EP.01", "episodeLabel", 40),
    synopsis: boundedString(project.synopsis || "", "synopsis", 600),
    templateId: boundedString(project.templateId || "", "templateId", 80),
    episodeStory: boundedString(project.episodeStory || "", "episodeStory", contentLimits.story),
    nextEpisodeStory: boundedString(project.nextEpisodeStory || "", "nextEpisodeStory", contentLimits.story),
    genre,
    tone: boundedString(project.tone || "bright", "tone", 30),
    status: ["draft", "published", "archived"].includes(project.status) ? project.status : "draft",
    isPublic: project.isPublic === true || project.is_public === true || project.is_public === "Y",
    hasUnpublishedChanges: project.hasUnpublishedChanges === true,
    panelCount: panels.length,
    episodePlan: normalizeEpisodePlan(project.episodePlan),
    storyIntent: normalizeJsonSection(project.storyIntent, 48 * 1024, "story_intent_too_large"),
    aiSuggestions: normalizeJsonSection(project.aiSuggestions, 48 * 1024, "story_suggestions_too_large", []),
    seriesBible: normalizeJsonSection(project.seriesBible, 96 * 1024, "series_bible_too_large"),
    scenePlans: normalizeJsonSection(project.scenePlans, 128 * 1024, "scene_plans_too_large", []),
    storyboardApproval: normalizeJsonSection(project.storyboardApproval, 32 * 1024, "storyboard_approval_too_large"),
    promptPackages: normalizeJsonSection(project.promptPackages, 768 * 1024, "prompt_packages_too_large", []),
    generationScope: ["representative", "remaining"].includes(project.generationScope) ? project.generationScope : "representative",
    visualWorkflow: normalizeJsonSection(project.visualWorkflow, 8 * 1024, "visual_workflow_too_large", {
      schemaVersion: "webtoon-visual-workflow/v1",
      stage: "storyboard-review",
      generationPass: "draft"
    }),
    publishLocales: Array.isArray(project.publishLocales)
      ? [...new Set(["ko", ...project.publishLocales.filter((locale) => ["en", "ja"].includes(locale))])].slice(0, 3)
      : ["ko"],
    productionStage: boundedString(project.productionStage || "story-draft", "productionStage", 60),
    generationJobId: boundedString(project.generationJobId || "", "generationJobId", 80),
    panels,
    updatedAt: boundedString(project.updatedAt || new Date().toISOString(), "updatedAt", 60)
  };
  assertJsonSize(safeProject, contentLimits.projectJsonBytes, "project_too_large");

  return {
    id: safeProject.id,
    title,
    idea,
    genre,
    panels,
    project: safeProject,
    status: safeProject.status,
    isPublic: safeProject.isPublic
  };
}

function normalizePanel(panel, index) {
  const source = panel && typeof panel === "object" ? panel : {};
  const accent = /^#[0-9a-f]{6}$/i.test(String(source.accent || "")) ? source.accent : "#69c8ff";
  return {
    id: boundedString(source.id || `panel-${index + 1}`, `panels[${index}].id`, contentLimits.panel.id, { required: true }),
    sceneId: boundedString(source.sceneId || `scene-${index + 1}`, `panels[${index}].sceneId`, 120),
    beat: boundedString(source.beat || "", `panels[${index}].beat`, contentLimits.panel.beat, { required: true }),
    camera: boundedString(source.camera || "wide", `panels[${index}].camera`, contentLimits.panel.camera, { required: true }),
    line: boundedString(source.line || "", `panels[${index}].line`, contentLimits.panel.line),
    sfx: boundedString(source.sfx || "", `panels[${index}].sfx`, contentLimits.panel.sfx),
    phase: boundedString(source.phase || "development", `panels[${index}].phase`, contentLimits.panel.phase),
    accent,
    note: boundedString(source.note || "", `panels[${index}].note`, contentLimits.panel.note),
    reaction: boundedString(source.reaction || "", `panels[${index}].reaction`, 180),
    frameX: clampNumber(source.frameX, 0, 100, 50),
    frameY: clampNumber(source.frameY, 0, 100, 50),
    gapAfter: clampNumber(source.gapAfter, 16, 180, 46),
    overlayVisibility: normalizeJsonSection(source.overlayVisibility, 4 * 1024, "overlay_visibility_too_large"),
    overlayPositions: normalizeJsonSection(source.overlayPositions, 4 * 1024, "overlay_positions_too_large"),
    panelSpec: normalizeJsonSection(source.panelSpec, 32 * 1024, "panel_spec_too_large"),
    storyboardStatus: ["pending", "approved"].includes(source.storyboardStatus) ? source.storyboardStatus : "pending",
    textObjects: normalizeJsonSection(source.textObjects, 32 * 1024, "text_objects_too_large", []),
    imageVersions: normalizeJsonSection(source.imageVersions, 64 * 1024, "image_versions_too_large", []),
    currentVersionId: boundedString(source.currentVersionId || "", `panels[${index}].currentVersionId`, 120),
    draftApprovedVersionId: boundedString(source.draftApprovedVersionId || "", `panels[${index}].draftApprovedVersionId`, 120),
    finalApprovedVersionId: boundedString(source.finalApprovedVersionId || source.approvedVersionId || "", `panels[${index}].finalApprovedVersionId`, 120),
    approvedVersionId: boundedString(source.approvedVersionId || "", `panels[${index}].approvedVersionId`, 120),
    qcStatus: ["missing", "pending", "needs-fix", "approved"].includes(source.qcStatus) ? source.qcStatus : "missing",
    lastRegenerationRequest: normalizeJsonSection(source.lastRegenerationRequest, 8 * 1024, "regeneration_request_too_large"),
    imageKey: boundedString(source.imageKey || "", `panels[${index}].imageKey`, contentLimits.panel.imageKey),
    imageName: boundedString(source.imageName || "", `panels[${index}].imageName`, contentLimits.panel.imageName),
    imageUpdatedAt: boundedString(source.imageUpdatedAt || "", `panels[${index}].imageUpdatedAt`, 60)
  };
}

function assertProjectPublishReady(project) {
  const issues = [];
  const panels = Array.isArray(project?.panels) ? project.panels : [];
  const locales = Array.isArray(project?.publishLocales) && project.publishLocales.includes("ko")
    ? [...new Set(project.publishLocales.filter((locale) => ["ko", "en", "ja"].includes(locale)))]
    : ["ko"];

  if (!project?.storyIntent?.approvedAt && !project?.episodePlan?.developmentApprovedAt) {
    issues.push("story_not_approved");
  }

  panels.forEach((panel, index) => {
    if (panel.storyboardStatus !== "approved") {
      issues.push(`panel_${index + 1}_storyboard_not_approved`);
    }
    const versions = Array.isArray(panel.imageVersions) ? panel.imageVersions : [];
    const finalVersionId = String(panel.finalApprovedVersionId || panel.approvedVersionId || "");
    const current = versions.find((version) => String(version?.id || "") === finalVersionId);
    if (!current || !finalVersionId) {
      issues.push(`panel_${index + 1}_version_not_approved`);
    } else if ((current.renderStage && current.renderStage !== "final") || current.status !== "approved" || current.qc?.overall !== "approved") {
      issues.push(`panel_${index + 1}_qc_not_approved`);
    }

    const textObjects = Array.isArray(panel.textObjects) ? panel.textObjects : [];
    textObjects.filter((item) => item?.visible !== false).forEach((item) => {
      locales.forEach((locale) => {
        const text = String(item?.textByLocale?.[locale] || "").trim();
        if (!text) {
          issues.push(`panel_${index + 1}_${locale}_text_missing`);
        } else if (serverTextLikelyOverflows(item, locale, text)) {
          issues.push(`panel_${index + 1}_${locale}_text_overflow`);
        }
      });
    });
  });

  if (!panels.length) issues.push("panels_missing");
  if (issues.length) {
    const error = httpError("publish_gate_failed", 409);
    error.details = issues.slice(0, 12);
    throw error;
  }
}

function serverTextLikelyOverflows(item, locale, text) {
  const compactLength = text.replace(/\s+/gu, "").length;
  const limits = {
    dialogue: locale === "en" ? 105 : 68,
    thought: locale === "en" ? 105 : 68,
    line: locale === "en" ? 105 : 68,
    narration: locale === "en" ? 170 : 112,
    sfx: 24
  };
  return compactLength > (limits[item?.kind] || 88) || text.split(/\r?\n/u).length > 4;
}

function normalizeEpisodePlan(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  assertJsonSize(value, 32 * 1024, "episode_plan_too_large");
  return value;
}

function normalizeJsonSection(value, maxBytes, errorCode, fallback = {}) {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (typeof value !== "object") {
    throw httpError(errorCode, 400);
  }
  assertJsonSize(value, maxBytes, errorCode);
  return JSON.parse(JSON.stringify(value));
}

function normalizeRegionMaskRequest(value) {
  if (value === undefined || value === null) {
    return null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw httpError("invalid_region_mask", 400);
  }

  const schemaVersion = boundedString(value.schemaVersion, "regionMask.schemaVersion", 60, { required: true });
  if (schemaVersion !== "webtoon-region-mask/v1") {
    throw httpError("unsupported_region_mask_schema", 400);
  }
  if (value.mimeType !== "image/png") {
    throw httpError("invalid_region_mask_mime", 400);
  }

  const match = /^data:image\/png;base64,([a-z0-9+/]+={0,2})$/i.exec(String(value.dataUrl || ""));
  if (!match) {
    throw httpError("invalid_region_mask_data", 400);
  }
  const png = Buffer.from(match[1], "base64");
  if (!png.length || png.length > contentLimits.regionMaskBytes) {
    throw httpError("region_mask_too_large", 413);
  }
  if (
    png.length < 24
    || png.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a"
    || png.subarray(12, 16).toString("ascii") !== "IHDR"
  ) {
    throw httpError("invalid_region_mask_png", 400);
  }

  const pngWidth = png.readUInt32BE(16);
  const pngHeight = png.readUInt32BE(20);
  if (pngWidth !== 320 || pngHeight !== 480) {
    throw httpError("invalid_region_mask_dimensions", 400);
  }
  const declaredWidth = Number(value.width);
  const declaredHeight = Number(value.height);
  if (declaredWidth !== pngWidth || declaredHeight !== pngHeight) {
    throw httpError("region_mask_dimension_mismatch", 400);
  }

  const coverage = Number(value.coverage);
  if (!Number.isFinite(coverage) || coverage < 0.0005 || coverage > 1) {
    throw httpError("invalid_region_mask_coverage", 400);
  }
  const bounds = normalizeRegionMaskBounds(value.bounds);
  const id = boundedString(value.id, "regionMask.id", 80, { required: true });
  if (!/^brush-fnv1a-[a-f0-9]{8}$/i.test(id)) {
    throw httpError("invalid_region_mask_id", 400);
  }
  const hash = boundedString(value.hash, "regionMask.hash", 40, { required: true });
  const expectedHash = fnv1aText(`data:image/png;base64,${match[1]}`);
  if (!/^fnv1a-[a-f0-9]{8}$/i.test(hash) || hash !== expectedHash || id !== `brush-${hash}`) {
    throw httpError("invalid_region_mask_hash", 400);
  }

  return {
    schemaVersion,
    id,
    mimeType: "image/png",
    width: pngWidth,
    height: pngHeight,
    coverage: Math.round(coverage * 10000) / 10000,
    encodedBytes: png.length,
    bounds,
    hash,
    dataUrl: `data:image/png;base64,${match[1]}`
  };
}

function normalizeRegionMaskBounds(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || value.mode !== "brush-mask") {
    throw httpError("invalid_region_mask_bounds", 400);
  }
  const x = Number(value.x);
  const y = Number(value.y);
  const width = Number(value.width);
  const height = Number(value.height);
  const values = [x, y, width, height];
  if (
    values.some((number) => !Number.isFinite(number))
    || x < 0 || y < 0 || width <= 0 || height <= 0
    || x + width > 100.1 || y + height > 100.1
  ) {
    throw httpError("invalid_region_mask_bounds", 400);
  }
  return {
    mode: "brush-mask",
    unit: "percent",
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
    width: Math.round(width * 10) / 10,
    height: Math.round(height * 10) / 10
  };
}

function mapProfile(row) {
  return {
    userId: row.USER_ID,
    email: row.EMAIL,
    displayName: row.DISPLAY_NAME,
    isAdmin: row.IS_ADMIN === "Y",
    accountType: row.ACCOUNT_TYPE || (row.IS_ADMIN === "Y" ? "admin" : "human"),
    nickname: row.NICKNAME || row.DISPLAY_NAME || "",
    nicknameStatus: row.NICKNAME_STATUS || "temporary",
    nicknameChangedAt: row.NICKNAME_CHANGED_AT || null,
    acorns: Number(row.ACORNS || 0),
    accountStatus: row.ACCOUNT_STATUS || "active",
    bannedAt: row.BANNED_AT || null,
    banReason: row.BAN_REASON || "",
    lastSeenAt: row.LAST_SEEN_AT || null,
    loginCount: Number(row.LOGIN_COUNT || 0),
    ipFingerprint: shortHash(row.LAST_IP_HASH),
    userAgent: row.LAST_USER_AGENT || "unknown",
    guideCompleted: row.GUIDE_COMPLETED === "Y"
  };
}

function mapProject(row) {
  const panels = parseJson(row.PANELS_JSON, []);
  const project = parseJson(row.PROJECT_JSON, {});
  return {
    ...project,
    id: project.id || `oracle-${row.ID}`,
    remoteId: row.ID,
    userId: row.USER_ID,
    title: row.TITLE,
    idea: row.IDEA || "",
    genre: row.GENRE,
    panelCount: panels.length,
    panels,
    status: row.STATUS,
    isPublic: row.IS_PUBLIC === "Y",
    updatedAt: row.UPDATED_AT
  };
}

function mapJob(row) {
  return {
    id: row.ID,
    userId: row.USER_ID,
    projectId: row.PROJECT_ID,
    parentJobId: row.PARENT_JOB_ID || null,
    panelId: row.PANEL_ID || null,
    promptPackageId: row.PROMPT_PACKAGE_ID || null,
    attempt: Number(row.ATTEMPT || 1),
    jobType: row.JOB_TYPE,
    scenarioKey: row.SCENARIO_KEY,
    cost: Number(row.COST || 0),
    status: row.STATUS,
    progress: Number(row.PROGRESS || 0),
    requestPayload: parseJson(row.REQUEST_PAYLOAD, {}),
    resultPayload: parseJson(row.RESULT_PAYLOAD, null),
    errorMessage: row.ERROR_MESSAGE,
    createdAt: row.CREATED_AT,
    updatedAt: row.UPDATED_AT
  };
}

async function verifySupabaseGoogleUser(token) {
  const response = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: config.supabasePublishableKey,
      Authorization: `Bearer ${token}`
    },
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) {
    throw httpError("invalid_auth_token", 401);
  }

  const source = await response.json();
  const providers = new Set([
    source.app_metadata?.provider,
    ...(Array.isArray(source.app_metadata?.providers) ? source.app_metadata.providers : []),
    ...(Array.isArray(source.identities) ? source.identities.map((identity) => identity.provider) : [])
  ].filter(Boolean));
  if (!providers.has("google")) {
    throw httpError("google_login_required", 403);
  }

  const email = normalizeEmail(source.email);
  if (!source.id || !email || !source.email_confirmed_at) {
    throw httpError("verified_google_email_required", 403);
  }

  return {
    id: boundedString(source.id, "userId", 80, { required: true }),
    email,
    displayName: String(
      source.user_metadata?.full_name
        || source.user_metadata?.name
        || email.split("@")[0]
    ).trim().slice(0, 200),
    provider: "google"
  };
}

async function existingAccountStatus(userId) {
  return withConnection(async (connection) => {
    const result = await connection.execute(
      "select account_status from webtoon_profiles where user_id = :user_id",
      { user_id: userId }
    );
    return result.rows[0]?.ACCOUNT_STATUS || "new";
  });
}

async function recordSecurityEvent(event) {
  return withTransaction((connection) => insertSecurityEvent(connection, event));
}

async function insertSecurityEvent(connection, {
  req,
  userId = null,
  eventType,
  severity = "info",
  details = {}
}) {
  const safeEventType = boundedString(eventType, "eventType", 60, { required: true });
  const safeSeverity = new Set(["info", "warn", "high"]).has(severity) ? severity : "info";
  assertJsonSize(details, 16 * 1024, "security_details_too_large");
  await connection.execute(
    `insert into webtoon_security_events (
      id, user_id, event_type, severity, ip_hash, user_agent_category,
      details_json, expires_at
    ) values (
      :id, :user_id, :event_type, :severity, :ip_hash, :user_agent_category,
      :details_json, systimestamp + numtodsinterval(:retention_days, 'DAY')
    )`,
    {
      id: randomId(),
      user_id: userId ? boundedString(userId, "userId", 80) : null,
      event_type: safeEventType,
      severity: safeSeverity,
      ip_hash: hashClientIp(req),
      user_agent_category: classifyUserAgent(req?.get?.("user-agent")),
      details_json: clobJson(details),
      retention_days: config.securityRetentionDays
    }
  );
}

function bearerToken(req) {
  const authorization = String(req.get("authorization") || "");
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function isAdminIdentity(user) {
  return Boolean(
    user
    && user.provider === "google"
    && normalizeEmail(user.email) === config.adminEmail
  );
}

function canCreate(user) {
  return !config.adminOnlyCreation || isAdminIdentity(user);
}

function assertCreationAllowed(user) {
  if (!canCreate(user)) {
    throw httpError("development_in_progress", 403);
  }
}

function withCreationCapability(profile, user) {
  return {
    ...profile,
    canCreate: canCreate(user),
    creationMode: config.adminOnlyCreation ? "admin_test" : "members"
  };
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function hashClientIp(req) {
  const source = req ? clientIp(req) : "server-internal";
  return crypto
    .createHmac("sha256", config.securityHashSecret)
    .update(String(source).slice(0, 160))
    .digest("hex");
}

function shortHash(value) {
  return value ? String(value).slice(0, 12) : "";
}

function classifyUserAgent(value) {
  const userAgent = String(value || "").toLowerCase();
  const device = /ipad|tablet/.test(userAgent)
    ? "tablet"
    : /mobile|android|iphone/.test(userAgent)
      ? "mobile"
      : "desktop";
  const browser = userAgent.includes("edg/")
    ? "edge"
    : userAgent.includes("firefox/")
      ? "firefox"
      : userAgent.includes("chrome/")
        ? "chrome"
        : userAgent.includes("safari/")
          ? "safari"
          : "other";
  return `${device}:${browser}`;
}

async function withConnection(callback) {
  const connection = await pool.getConnection();
  try {
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

async function hashFile(filePath) {
  const hash = crypto.createHash("sha256");
  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", resolve);
    stream.on("error", reject);
  });
  return hash.digest("hex");
}

async function detectImageFile(filePath) {
  const handle = await open(filePath, "r");
  try {
    const signature = Buffer.alloc(16);
    const { bytesRead } = await handle.read(signature, 0, signature.length, 0);
    const bytes = signature.subarray(0, bytesRead);

    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return { extension: ".jpg", mimeType: "image/jpeg" };
    }
    if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      return { extension: ".png", mimeType: "image/png" };
    }
    if (
      bytes.length >= 12
      && bytes.subarray(0, 4).toString("ascii") === "RIFF"
      && bytes.subarray(8, 12).toString("ascii") === "WEBP"
    ) {
      return { extension: ".webp", mimeType: "image/webp" };
    }
    return null;
  } finally {
    await handle.close();
  }
}

async function loadDotEnv() {
  let text = "";
  try {
    text = await readFile(path.resolve(".env"), "utf8");
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

function clobJson(value) {
  return { val: JSON.stringify(value ?? null), type: oracledb.CLOB };
}

function parseJson(value, fallback) {
  if (!value) {
    return fallback;
  }
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value || value.includes("replace_with")) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

function boundedString(value, name, max, { required = false } = {}) {
  const string = String(value ?? "").trim();
  if (required && !string) {
    throw httpError(`${name}_required`, 400);
  }
  if (string.length > max) {
    throw httpError(`${name}_too_long`, 400);
  }
  return string;
}

function nullableBoundedString(value, name, max) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  return boundedString(value, name, max, { required: true });
}

function optionalHttpsUrl(value, name, max) {
  const string = boundedString(value || "", name, max);
  if (!string) return null;
  let parsed;
  try {
    parsed = new URL(string);
  } catch {
    throw httpError(`${name}_invalid`, 400);
  }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw httpError(`${name}_invalid`, 400);
  }
  return parsed.toString();
}

function assertJsonSize(value, maxBytes, code) {
  let json;
  try {
    json = JSON.stringify(value ?? null);
  } catch {
    throw httpError("invalid_json_payload", 400);
  }
  if (Buffer.byteLength(json, "utf8") > maxBytes) {
    throw httpError(code, 413);
  }
}

function httpError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function randomId() {
  return crypto.randomUUID();
}

function fnv1aText(value) {
  let hash = 2166136261;
  for (const character of String(value || "")) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function splitCsv(value) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  return new Set(["1", "true", "yes", "on"]).has(String(value).trim().toLowerCase());
}

function requiredStrongSecret(name) {
  const value = requiredEnv(name);
  if (value.length < 32 || /replace|example|changeme/i.test(value)) {
    throw new Error(`${name} must be a non-placeholder secret of at least 32 characters`);
  }
  return value;
}

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function oracleTimestampString(value) {
  return new Date(value).toISOString().replace(/Z$/u, "+00:00");
}

function clampInt(value, min, max, fallback) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, number));
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, number));
}

function constantTokenEquals(actual, expected) {
  if (!actual || !expected) {
    return false;
  }
  const a = Buffer.from(String(actual));
  const b = Buffer.from(String(expected));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function createRateLimiter({ name, limit, windowMs, keyResolver }) {
  const buckets = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const windowNumber = Math.floor(now / windowMs);
    const key = `${String(keyResolver(req)).slice(0, 200)}|${windowNumber}`;
    const count = (buckets.get(key) || 0) + 1;
    buckets.set(key, count);
    const resetAt = (windowNumber + 1) * windowMs;

    res.set("RateLimit-Limit", String(limit));
    res.set("RateLimit-Remaining", String(Math.max(0, limit - count)));
    res.set("RateLimit-Reset", String(Math.ceil(resetAt / 1000)));

    if (count === 1 && buckets.size > 5000) {
      pruneRateBuckets(buckets, now, windowMs);
    }

    if (count > limit) {
      if (count === limit + 1) {
        recordSecurityEvent({
          req,
          userId: req.user?.id,
          eventType: "rate_limited",
          severity: "warn",
          details: { limiter: name, path: req.path }
        }).catch(() => {});
      }
      res.set("Retry-After", String(Math.max(1, Math.ceil((resetAt - now) / 1000))));
      res.status(429).json({ error: "rate_limited" });
      return;
    }

    next();
  };
}

function pruneRateBuckets(buckets, now, windowMs) {
  const current = Math.floor(now / windowMs);
  for (const key of buckets.keys()) {
    const bucketWindow = Number(key.slice(key.lastIndexOf("|") + 1));
    if (!Number.isFinite(bucketWindow) || bucketWindow < current - 1) {
      buckets.delete(key);
    }
  }
}

function clientIp(req) {
  return String(req.ip || req.socket?.remoteAddress || "unknown").trim();
}
