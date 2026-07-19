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
  projectJsonBytes: 512 * 1024,
  jobRequestBytes: 64 * 1024,
  jobResultBytes: 128 * 1024,
  errorMessage: 1000,
  uploadMetadata: Object.freeze({
    originalName: 120,
    source: 60,
    note: 500
  })
});

const generationCosts = Object.freeze({
  draft_generation: 3,
  panel_regenerate: 1
});

const uploadMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

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
  methods: ["GET", "POST", "PUT", "PATCH", "OPTIONS"],
  allowedHeaders: ["Authorization", "Content-Type", "X-Webtoon-Worker-Token"],
  credentials: false,
  maxAge: 600,
  optionsSuccessStatus: 204
}));
app.use(express.json({ limit: "768kb" }));
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
  res.status(status).json({ error: message });
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
          user_id, email, display_name, is_admin, acorns, guide_completed, profile_json
        ) values (
          :user_id, :email, :display_name, 'Y', 20, 'N', :profile_json
        )`,
        {
          user_id: config.adminUserId,
          email: config.adminEmail,
          display_name: config.adminDisplayName,
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
      `select user_id, email, display_name, is_admin, acorns, account_status,
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
      await connection.execute(
        `insert into webtoon_profiles (
          user_id, email, display_name, is_admin, acorns, account_status,
          last_seen_at, login_count, last_ip_hash, last_user_agent,
          guide_completed, profile_json
        ) values (
          :user_id, :email, :display_name, :is_admin, :acorns, 'active',
          systimestamp, 1, :last_ip_hash, :last_user_agent,
          'N', :profile_json
        )`,
        {
          user_id: user.id,
          email: user.email,
          display_name: user.displayName,
          is_admin: admin ? "Y" : "N",
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
    }

    const profile = await connection.execute(
      `select user_id, email, display_name, is_admin, acorns, account_status,
              banned_at, ban_reason, last_seen_at, login_count, last_ip_hash,
              last_user_agent, guide_completed, created_at, updated_at
         from webtoon_profiles
        where user_id = :user_id`,
      { user_id: user.id }
    );
    return mapProfile(profile.rows[0]);
  });
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

    return getProject(project.id, connection);
  });
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
  const cost = generationCosts[jobType];
  if (cost === undefined) {
    throw httpError("invalid_job_type", 400);
  }

  const requestPayload = input.requestPayload || input.request_payload || {};
  assertJsonSize(requestPayload, contentLimits.jobRequestBytes, "job_request_too_large");

  const job = {
    id: randomId(),
    projectId: nullableBoundedString(input.projectId || input.project_id, "projectId", 36),
    jobType,
    scenarioKey: nullableBoundedString(input.scenarioKey || input.scenario_key, "scenarioKey", 100),
    cost,
    requestPayload
  };

  const ensuredProfile = await ensureUserProfile(user, req);
  const admin = isAdminIdentity(user);

  return withTransaction(async (connection) => {
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

    await connection.execute(
      `insert into webtoon_generation_jobs (
        id, user_id, project_id, job_type, scenario_key, cost, status, progress, request_payload
      ) values (
        :id, :user_id, :project_id, :job_type, :scenario_key, :cost, 'ready', 0, :request_payload
      )`,
      {
        id: job.id,
        user_id: user.id,
        project_id: job.projectId,
        job_type: job.jobType,
        scenario_key: job.scenarioKey,
        cost: job.cost,
        request_payload: clobJson(job.requestPayload)
      }
    );

    const createdJob = await getJob(job.id, connection);
    return {
      job: createdJob,
      profile: {
        acorns: balanceAfter,
        isAdmin: admin
      }
    };
  });
}

async function readyJobs(limit) {
  return withConnection(async (connection) => {
    const result = await connection.execute(
      `select id, user_id, project_id, job_type, scenario_key, cost, status, progress,
              request_payload, result_payload, error_message, created_at, updated_at
         from webtoon_generation_jobs
        where status = 'ready'
        order by created_at asc
        fetch first ${limit} rows only`
    );
    return result.rows.map(mapJob);
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

    await connection.execute(
      `update webtoon_generation_jobs
          set status = coalesce(:status, status),
              progress = coalesce(:progress, progress),
              result_payload = case when :result_payload_set = 1 then :result_payload else result_payload end,
              error_message = case when :error_message_set = 1 then :error_message else error_message end
        where id = :id`,
      {
        id,
        status: patch.status,
        progress: patch.progress,
        result_payload_set: patch.result_payload === undefined ? 0 : 1,
        result_payload: patch.result_payload === undefined ? null : clobJson(patch.result_payload),
        error_message_set: input.errorMessage === undefined && input.error_message === undefined ? 0 : 1,
        error_message: patch.error_message
      }
    );

    return getJob(id, connection);
  });
}

async function getJob(id, connection) {
  const result = await connection.execute(
    `select id, user_id, project_id, job_type, scenario_key, cost, status, progress,
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

async function registerUploadedAsset(req) {
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
        user_id, email, display_name, is_admin, acorns, guide_completed, profile_json
      ) values (
        :user_id, :email, :display_name, 'Y', 20, 'N', :profile_json
      )`,
      {
        user_id: config.adminUserId,
        email: config.adminEmail,
        display_name: config.adminDisplayName,
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
    id: boundedString(project.id || project.remoteId || randomId(), "id", 36, { required: true }),
    title,
    idea,
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
    beat: boundedString(source.beat || "", `panels[${index}].beat`, contentLimits.panel.beat, { required: true }),
    camera: boundedString(source.camera || "wide", `panels[${index}].camera`, contentLimits.panel.camera, { required: true }),
    line: boundedString(source.line || "", `panels[${index}].line`, contentLimits.panel.line),
    sfx: boundedString(source.sfx || "", `panels[${index}].sfx`, contentLimits.panel.sfx),
    phase: boundedString(source.phase || "development", `panels[${index}].phase`, contentLimits.panel.phase),
    accent,
    note: boundedString(source.note || "", `panels[${index}].note`, contentLimits.panel.note),
    imageKey: boundedString(source.imageKey || "", `panels[${index}].imageKey`, contentLimits.panel.imageKey),
    imageName: boundedString(source.imageName || "", `panels[${index}].imageName`, contentLimits.panel.imageName),
    imageUpdatedAt: boundedString(source.imageUpdatedAt || "", `panels[${index}].imageUpdatedAt`, 60)
  };
}

function normalizeEpisodePlan(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  assertJsonSize(value, 32 * 1024, "episode_plan_too_large");
  return value;
}

function mapProfile(row) {
  return {
    userId: row.USER_ID,
    email: row.EMAIL,
    displayName: row.DISPLAY_NAME,
    isAdmin: row.IS_ADMIN === "Y",
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

function clampInt(value, min, max, fallback) {
  const number = Number.parseInt(value, 10);
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
