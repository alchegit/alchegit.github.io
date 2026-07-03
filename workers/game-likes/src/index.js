const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);

    try {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: cors });
      }

      const url = new URL(request.url);
      const pathname = normalizePath(url.pathname);

      if (request.method === "GET" && (pathname === "/" || pathname === "/likes")) {
        return jsonResponse(await getLikeCounts(env), 200, cors);
      }

      if (request.method === "POST" && (pathname === "/" || pathname === "/likes")) {
        return jsonResponse(await createLike(request, env), 200, cors);
      }

      return jsonResponse({ error: "not_found" }, 404, cors);
    } catch (error) {
      const status = Number(error.status || 500);
      const body = {
        error: status === 500 ? "server_error" : "request_error",
        message: status === 500 ? "Unexpected server error." : error.message
      };
      return jsonResponse(body, status, cors);
    }
  }
};

async function getLikeCounts(env) {
  const validGameIds = getValidGameIds(env);
  const rows = await env.DB
    .prepare("SELECT game_id, COUNT(*) AS count FROM game_likes GROUP BY game_id")
    .all();
  const counts = Object.fromEntries(validGameIds.map((gameId) => [gameId, 0]));

  for (const row of rows.results || []) {
    if (!validGameIds.length || counts[row.game_id] !== undefined) {
      counts[row.game_id] = Number(row.count || 0);
    }
  }

  return {
    schemaVersion: "game-likes/v1",
    source: "cloudflare-d1",
    updatedAt: new Date().toISOString(),
    counts
  };
}

async function createLike(request, env) {
  const body = await readJsonBody(request);
  const gameId = normalizeGameId(body.gameId);
  const voterHash = normalizeVoterHash(body.voterHash);
  const page = normalizePage(body.page);

  if (!gameId || !getValidGameIds(env).includes(gameId)) {
    throw new HttpError(400, "Unknown gameId.");
  }

  if (!voterHash) {
    throw new HttpError(400, "Invalid voterHash.");
  }

  const now = Math.floor(Date.now() / 1000);
  const windowSeconds = numberFromEnv(env.RATE_LIMIT_WINDOW_SECONDS, 60);
  const ipHash = await hashText(`${env.RATE_LIMIT_SALT || ""}:${request.headers.get("CF-Connecting-IP") || "unknown"}`);
  const userAgentHash = await hashText(String(request.headers.get("User-Agent") || "").slice(0, 240));

  await enforceRateLimit(env, `visitor:${voterHash}`, numberFromEnv(env.RATE_LIMIT_MAX_PER_VISITOR, 8), now, windowSeconds);
  await enforceRateLimit(env, `ip:${ipHash}`, numberFromEnv(env.RATE_LIMIT_MAX_PER_IP, 60), now, windowSeconds);

  const insert = await env.DB
    .prepare(
      `INSERT OR IGNORE INTO game_likes
        (game_id, voter_hash, page, ip_hash, user_agent_hash)
        VALUES (?, ?, ?, ?, ?)`
    )
    .bind(gameId, voterHash, page, ipHash, userAgentHash)
    .run();

  const count = await getGameLikeCount(env, gameId);
  const inserted = Number(insert.meta?.changes || 0) > 0;

  return {
    schemaVersion: "game-likes/v1",
    gameId,
    count,
    liked: true,
    duplicate: !inserted
  };
}

async function enforceRateLimit(env, bucketKey, maxCount, now, windowSeconds) {
  const windowStart = Math.floor(now / windowSeconds) * windowSeconds;
  const row = await env.DB
    .prepare("SELECT window_start, count FROM like_rate_limits WHERE bucket_key = ?")
    .bind(bucketKey)
    .first();

  if (!row || Number(row.window_start) !== windowStart) {
    await env.DB
      .prepare("INSERT OR REPLACE INTO like_rate_limits (bucket_key, window_start, count) VALUES (?, ?, 1)")
      .bind(bucketKey, windowStart)
      .run();
    return;
  }

  if (Number(row.count || 0) >= maxCount) {
    throw new HttpError(429, "Too many like requests. Please wait a moment.");
  }

  await env.DB
    .prepare("UPDATE like_rate_limits SET count = count + 1 WHERE bucket_key = ?")
    .bind(bucketKey)
    .run();
}

async function getGameLikeCount(env, gameId) {
  const row = await env.DB
    .prepare("SELECT COUNT(*) AS count FROM game_likes WHERE game_id = ?")
    .bind(gameId)
    .first();
  return Number(row?.count || 0);
}

async function readJsonBody(request) {
  const type = request.headers.get("Content-Type") || "";
  if (!type.toLowerCase().includes("application/json")) {
    throw new HttpError(415, "Content-Type must be application/json.");
  }

  const text = await request.text();
  if (text.length > 4096) {
    throw new HttpError(413, "Request body is too large.");
  }

  try {
    return JSON.parse(text || "{}");
  } catch {
    throw new HttpError(400, "Invalid JSON body.");
  }
}

function normalizePath(pathname) {
  const clean = pathname.replace(/\/+$/g, "");
  return clean || "/";
}

function normalizeGameId(value) {
  const gameId = String(value || "").trim();
  return /^[a-z0-9-]{3,80}$/.test(gameId) ? gameId : "";
}

function normalizeVoterHash(value) {
  const voterHash = String(value || "").trim();
  return /^[a-zA-Z0-9._:-]{16,160}$/.test(voterHash) ? voterHash : "";
}

function normalizePage(value) {
  const page = String(value || "/games/").trim();
  if (!page.startsWith("/") || page.length > 120) {
    return "/games/";
  }
  return page;
}

function getValidGameIds(env) {
  return String(env.VALID_GAME_IDS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function numberFromEnv(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function hashText(value) {
  const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(value)));
  return [...new Uint8Array(buffer)].map((item) => item.toString(16).padStart(2, "0")).join("");
}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin") || "";
  const allowed = String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const headers = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };

  if (origin && allowed.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  } else if (!origin) {
    headers["Access-Control-Allow-Origin"] = "*";
  }

  return headers;
}

function jsonResponse(body, status, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...extraHeaders
    }
  });
}
