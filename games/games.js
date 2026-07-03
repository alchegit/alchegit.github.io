const accentColors = [
  "#35d7a8",
  "#ffd85a",
  "#69c8ff",
  "#e95b88",
  "#8f78ff",
  "#75c96b",
  "#ff9a6c",
  "#96e8d2",
  "#f4b860",
  "#93d8ff",
  "#f0758f",
  "#c9df63"
];

const likeStorageKey = "neokim-game-cabinet-liked:v1";
const visitorStorageKey = "neokim-game-cabinet-visitor:v1";
const crystalMochiGameId = "flame-crystal-mochi-stand";
const candidateReportElementId = "candidateMetricsReport";

let catalogGames = [];
let activeFilter = { type: "all", value: "all" };
let baseLikeCounts = new Map();
let likedGameIds = new Set();
let likeCountsAreAuthoritative = false;

const crystalMochiPreviewSets = {
  bakery: ["sugar-sun", "cloud-cookie", "pudding-star", "mellow-door"],
  sky: ["mint-moon", "berry-orbit", "aqua-bell", "crystal-crown"],
  dream: ["peach-comet", "lemon-lamp", "violet-ribbon", "heart-spark"]
};
const crystalMochiPreviewPresets = new Set(["balanced", "score", "card", "starlight"]);

document.addEventListener("DOMContentLoaded", () => {
  likedGameIds = loadLikedGameIds();
  document.getElementById("gameGrid").addEventListener("click", handleLikeClick);
  loadCatalog();
});

async function loadCatalog() {
  try {
    const response = await fetch("./design-db.json", { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const db = await response.json();
    const likeData = await loadLikeCounts();
    baseLikeCounts = likeData.counts;
    likeCountsAreAuthoritative = likeData.authoritative;
    catalogGames = Array.isArray(db.games)
      ? db.games
        .filter((game) => game.status !== "closed" && game.visibleInCabinet !== false)
        .sort((a, b) => String(a.gridSlot).localeCompare(String(b.gridSlot)))
      : [];

    renderStats(catalogGames);
    renderFilters(catalogGames);
    renderGrid(catalogGames);
    updateCandidateMetricsReport(catalogGames);
  } catch (error) {
    const grid = document.getElementById("gameGrid");
    grid.innerHTML = `<p class="error-copy">게임 목록을 불러오지 못했습니다.</p>`;
    console.error(error);
  }
}

async function loadLikeCounts() {
  const supabase = getSupabaseConfig();
  if (supabase) {
    try {
      const data = await callSupabaseRpc("get_game_like_counts");
      const counts = data && typeof data.counts === "object" ? data.counts : {};
      return {
        counts: new Map(Object.entries(counts).map(([gameId, count]) => [gameId, Number(count) || 0])),
        authoritative: true
      };
    } catch (error) {
      console.warn("Supabase like counts unavailable", error);
    }
  }

  const endpoint = getLikeEndpoint();
  if (endpoint) {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        const counts = data && typeof data.counts === "object" ? data.counts : {};
        return {
          counts: new Map(Object.entries(counts).map(([gameId, count]) => [gameId, Number(count) || 0])),
          authoritative: true
        };
      }
      console.warn(`Live like counts unavailable: HTTP ${response.status}`);
    } catch (error) {
      console.warn("Live like counts unavailable", error);
    }
  }

  try {
    const response = await fetch("./like-counts.json", { cache: "no-store" });
    if (!response.ok) {
      return { counts: new Map(), authoritative: false };
    }

    const data = await response.json();
    const counts = data && typeof data.counts === "object" ? data.counts : {};
    return {
      counts: new Map(Object.entries(counts).map(([gameId, count]) => [gameId, Number(count) || 0])),
      authoritative: false
    };
  } catch (error) {
    console.warn("Like counts unavailable", error);
    return { counts: new Map(), authoritative: false };
  }
}

function renderStats(games) {
  const engines = new Set(games.map((game) => game.engine));
  const playableCount = games.filter((game) => game.status === "playable").length;

  document.getElementById("statDesigns").textContent = String(games.length).padStart(2, "0");
  document.getElementById("statEngines").textContent = String(engines.size).padStart(2, "0");
  document.getElementById("statNext").textContent = String(playableCount).padStart(2, "0");
}

function renderFilters(games) {
  const filterBar = document.getElementById("filterBar");
  const engines = [...new Set(games.map((game) => game.engine))];
  const filters = [{ type: "all", value: "all", label: "All" }];

  if (games.some((game) => game.status === "playable")) {
    filters.push({ type: "status", value: "playable", label: "Playable" });
  }

  if (games.some((game) => game.status === "prototype-next")) {
    filters.push({ type: "status", value: "prototype-next", label: "Next" });
  }

  filters.push(...engines.map((engine) => ({ type: "engine", value: engine, label: engine })));

  filterBar.innerHTML = filters
    .map((filter) => {
      const isActive = filter.type === activeFilter.type && filter.value === activeFilter.value;
      return `<button class="filter-button${isActive ? " is-active" : ""}" type="button" data-filter-type="${escapeHtml(filter.type)}" data-filter-value="${escapeHtml(filter.value)}">${escapeHtml(filter.label)}</button>`;
    })
    .join("");

  filterBar.addEventListener("click", (event) => {
    const button = event.target.closest(".filter-button");

    if (!button) {
      return;
    }

    activeFilter = {
      type: button.dataset.filterType,
      value: button.dataset.filterValue
    };

    renderFilters(catalogGames);
    renderGrid(filterGames(catalogGames, activeFilter));
  }, { once: true });
}

function filterGames(games, filter) {
  if (filter.type === "status") {
    return games.filter((game) => game.status === filter.value);
  }

  if (filter.type === "engine") {
    return games.filter((game) => game.engine === filter.value);
  }

  return games;
}

function renderGrid(games) {
  const grid = document.getElementById("gameGrid");

  if (!games.length) {
    grid.innerHTML = `<p class="empty-copy">표시할 게임이 없습니다.</p>`;
    return;
  }

  grid.innerHTML = games.map((game, index) => renderGameCard(game, index)).join("");
}

function renderGameCard(game, index) {
  const accent = accentColors[index % accentColors.length];
  const tags = Array.isArray(game.tags) ? game.tags.slice(0, 4) : [];
  const playableUrl = game.playableUrl || game.demoUrl || "";
  const liked = likedGameIds.has(game.id);
  const likeCount = getLikeCount(game.id);
  const likeLabel = `${game.workingTitleKo} 좋아요 ${likeCount}개`;

  return `
    <article class="game-card" data-status="${escapeHtml(game.status)}" style="--accent: ${accent}">
      <div class="preview-frame" role="img" aria-label="${escapeHtml(game.workingTitleKo)} 픽셀 미리보기">
        ${renderPreview(game.preview?.animationKey)}
      </div>
      <div class="game-card-body">
        <div class="card-meta">
          <h2 class="game-title">${escapeHtml(game.workingTitleKo)}</h2>
          <button class="like-button${liked ? " is-liked" : ""}" type="button" data-like-game="${escapeHtml(game.id)}" aria-label="${escapeHtml(likeLabel)}" aria-pressed="${liked ? "true" : "false"}"${liked ? " disabled" : ""}>
            <span class="like-mark" aria-hidden="true">${liked ? "♥" : "♡"}</span>
            <span class="like-count" data-like-count>${escapeHtml(likeCount)}</span>
          </button>
        </div>
        <p class="game-summary">${escapeHtml(game.oneLineSummary)}</p>
        <div class="pill-row">
          <span class="engine-pill">${escapeHtml(game.engine)}</span>
          ${tags.map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`).join("")}
        </div>
        ${playableUrl ? `<div class="play-actions"><a class="play-link" href="${escapeHtml(playableUrl)}">플레이</a></div>` : ""}
        <div class="card-actions" hidden aria-hidden="true">
          <a class="card-link" href="${escapeHtml(game.sourceUrl)}" target="_blank" rel="noopener">원본 참고</a>
          <a class="card-link" href="${escapeHtml(game.sourceRepoUrl)}" target="_blank" rel="noopener">소스/문서</a>
        </div>
      </div>
    </article>
  `;
}

function getLikeCount(gameId) {
  const baseCount = baseLikeCounts.get(gameId) || 0;
  return baseCount + (!likeCountsAreAuthoritative && likedGameIds.has(gameId) ? 1 : 0);
}

function loadLikedGameIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(likeStorageKey) || "[]");
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch (error) {
    console.warn("Liked games unavailable", error);
    return new Set();
  }
}

function saveLikedGameIds() {
  try {
    localStorage.setItem(likeStorageKey, JSON.stringify([...likedGameIds]));
  } catch (error) {
    console.warn("Liked games could not be saved", error);
  }
}

function getVisitorId() {
  try {
    let visitorId = localStorage.getItem(visitorStorageKey);
    if (!visitorId) {
      visitorId = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
      localStorage.setItem(visitorStorageKey, visitorId);
    }
    return visitorId;
  } catch (error) {
    return `session-${Date.now()}-${Math.random()}`;
  }
}

async function hashVisitorId(visitorId) {
  if (!globalThis.crypto?.subtle || typeof TextEncoder === "undefined") {
    return visitorId;
  }

  const buffer = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(visitorId));
  return [...new Uint8Array(buffer)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function getLikeEndpoint() {
  const configured = window.GAME_LIKE_ENDPOINT || document.querySelector('meta[name="game-like-endpoint"]')?.content || "";
  return String(configured).trim();
}

function getSupabaseConfig() {
  const url = window.GAME_LIKE_SUPABASE_URL || document.querySelector('meta[name="game-like-supabase-url"]')?.content || "";
  const key = window.GAME_LIKE_SUPABASE_KEY || document.querySelector('meta[name="game-like-supabase-key"]')?.content || "";
  const normalizedUrl = String(url).trim().replace(/\/+$/g, "");
  const normalizedKey = String(key).trim();

  if (!normalizedUrl || !normalizedKey) {
    return null;
  }

  return {
    url: normalizedUrl,
    key: normalizedKey
  };
}

async function callSupabaseRpc(functionName, body = {}) {
  const supabase = getSupabaseConfig();
  if (!supabase) {
    return null;
  }

  const response = await fetch(`${supabase.url}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: {
      apikey: supabase.key,
      Authorization: `Bearer ${supabase.key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Supabase RPC ${functionName} responded with HTTP ${response.status}`);
  }

  return response.json();
}

async function sendLikeVote(gameId) {
  const voterHash = await hashVisitorId(getVisitorId());
  const supabase = getSupabaseConfig();
  if (supabase) {
    return callSupabaseRpc("create_game_like", {
      p_game_id: gameId,
      p_voter_hash: voterHash,
      p_page: "/games/"
    });
  }

  const endpoint = getLikeEndpoint();
  if (!endpoint) {
    return null;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      gameId,
      voterHash,
      page: "/games/",
      value: 1
    })
  });

  if (!response.ok) {
    throw new Error(`Like endpoint responded with HTTP ${response.status}`);
  }

  return response.json();
}

function updateCandidateMetricsReport(games) {
  const reportElement = document.getElementById(candidateReportElementId);

  if (!reportElement) {
    return;
  }

  reportElement.textContent = JSON.stringify(buildCandidateMetricsReport(games));
}

function buildCandidateMetricsReport(games) {
  const items = games
    .map((game) => {
      const metrics = game.id === crystalMochiGameId ? getCrystalMochiStoredMetrics() : null;
      const liked = likedGameIds.has(game.id);
      const priority = Math.max(1, Number(game.priority || 12));
      const fallbackScore = Math.min(100, (liked ? 25 : 0) + (game.status === "playable" ? 20 : 5) + Math.max(0, 13 - priority) * 3);
      const score = Math.max(0, Math.min(100, Number(metrics?.score ?? fallbackScore)));

      return {
        id: game.id,
        title: game.workingTitleKo,
        engine: game.engine,
        status: game.status,
        score,
        tier: metrics?.tier || getCandidateTier(score),
        likedByUser: liked,
        completionPercent: Number(metrics?.completionPercent || 0),
        returnDays: Number(metrics?.returnDays || 0),
        source: metrics ? "local-progress" : "catalog-baseline"
      };
    })
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));

  return {
    route: "/games/",
    generatedAt: new Date().toISOString(),
    items
  };
}

function getCrystalMochiStoredMetrics() {
  try {
    const progress = JSON.parse(localStorage.getItem("crystalMochiStandProgress:v1") || "{}");
    const metrics = progress && typeof progress.candidateMetrics === "object" ? progress.candidateMetrics : null;

    if (!metrics) {
      return null;
    }

    return {
      score: Number(metrics.score || 0),
      tier: typeof metrics.tier === "string" ? metrics.tier : getCandidateTier(Number(metrics.score || 0)),
      completionPercent: Number(metrics.completionPercent || 0),
      returnDays: Number(metrics.returnDays || 0)
    };
  } catch (error) {
    return null;
  }
}

function getCandidateTier(score) {
  if (score >= 75) {
    return "hot";
  }

  if (score >= 45) {
    return "warm";
  }

  if (score >= 20) {
    return "spark";
  }

  return "quiet";
}

function handleLikeClick(event) {
  const button = event.target.closest("[data-like-game]");
  if (!button) {
    return;
  }

  const gameId = button.dataset.likeGame;
  if (!gameId || likedGameIds.has(gameId)) {
    return;
  }

  likedGameIds.add(gameId);
  saveLikedGameIds();
  button.classList.add("is-liked");
  button.setAttribute("aria-pressed", "true");
  button.disabled = true;
  button.querySelector(".like-mark").textContent = "♥";

  if (likeCountsAreAuthoritative) {
    baseLikeCounts.set(gameId, (baseLikeCounts.get(gameId) || 0) + 1);
  }

  button.querySelector("[data-like-count]").textContent = String(getLikeCount(gameId));
  updateCandidateMetricsReport(catalogGames);
  sendLikeVote(gameId)
    .then((result) => {
      if (result && result.gameId === gameId && Number.isFinite(Number(result.count))) {
        baseLikeCounts.set(gameId, Number(result.count));
        button.querySelector("[data-like-count]").textContent = String(getLikeCount(gameId));
      }
    })
    .catch((error) => console.warn("Like vote was not sent", error));
}

function renderPreview(animationKey = "") {
  const key = String(animationKey).replace(/[^a-z0-9-]/gi, "");
  const crystalPreview = key === "sparkle-oracle" ? getCrystalMochiPreviewState() : { className: "" };

  switch (key) {
    case "sparkle-oracle":
      return `
        <div class="preview-stage preview-sparkle-oracle ${crystalPreview.className}">
          <span class="scene-piece decor-curtain left"></span>
          <span class="scene-piece decor-curtain right"></span>
          <span class="scene-piece decor-lamp"></span>
          <span class="scene-piece mochi"></span>
          <span class="scene-piece decor-smile"></span>
          <span class="scene-piece decor-crown"></span>
          <span class="scene-piece sparkle one"></span>
          <span class="scene-piece sparkle two"></span>
          <span class="scene-piece sparkle three"></span>
          <span class="scene-piece fortune-card"></span>
          <span class="scene-piece candidate-signal"></span>
        </div>
      `;
    case "pudding-race":
      return `
        <div class="preview-stage preview-pudding-race">
          <span class="scene-piece track"></span>
          <span class="scene-piece gate one"></span>
          <span class="scene-piece gate two"></span>
          <span class="scene-piece kart"></span>
        </div>
      `;
    case "bakery-defense":
      return `
        <div class="preview-stage preview-bakery-defense">
          <span class="scene-piece bakery"></span>
          <span class="scene-piece hero"></span>
          <span class="scene-piece bubble b1"></span>
          <span class="scene-piece bubble b2"></span>
          <span class="scene-piece crate"></span>
        </div>
      `;
    case "konpeito-swarm":
      return `
        <div class="preview-stage preview-konpeito-swarm">
          <span class="scene-piece beacon"></span>
          ${Array.from({ length: 7 }, (_, i) => `<span class="scene-piece candy c${i + 1}"></span>`).join("")}
        </div>
      `;
    case "rocket-delivery":
      return `
        <div class="preview-stage preview-rocket-delivery">
          <span class="scene-piece rocket"></span>
          <span class="scene-piece mail-star a"></span>
          <span class="scene-piece mail-star b"></span>
          <span class="scene-piece mailbox"></span>
        </div>
      `;
    case "marshmallow-sling":
      return `
        <div class="preview-stage preview-marshmallow-sling">
          <span class="scene-piece sling"></span>
          <span class="scene-piece band"></span>
          <span class="scene-piece mallow"></span>
          <span class="scene-piece block b1"></span>
          <span class="scene-piece block b2"></span>
          <span class="scene-piece block b3"></span>
        </div>
      `;
    case "biscuit-fleet":
      return `
        <div class="preview-stage preview-biscuit-fleet">
          <span class="scene-piece sea-route"></span>
          <span class="scene-piece base"></span>
          <span class="scene-piece jam"></span>
          <span class="scene-piece fleet f1"></span>
          <span class="scene-piece fleet f2"></span>
          <span class="scene-piece fleet f3"></span>
        </div>
      `;
    case "color-garden":
      return `
        <div class="preview-stage preview-color-garden">
          <span class="garden-grid" aria-hidden="true">${Array.from({ length: 16 }, () => "<span></span>").join("")}</span>
          <span class="scene-piece drop"></span>
        </div>
      `;
    case "jelly-bricks":
      return `
        <div class="preview-stage preview-jelly-bricks">
          <span class="brick-grid" aria-hidden="true">${Array.from({ length: 20 }, () => "<span></span>").join("")}</span>
          <span class="scene-piece sugar-ball"></span>
          <span class="scene-piece paddle"></span>
        </div>
      `;
    case "switchyard":
      return `
        <div class="preview-stage preview-switchyard">
          <span class="scene-piece rail r1"></span>
          <span class="scene-piece rail r2"></span>
          <span class="scene-piece rail r3"></span>
          <span class="scene-piece switch"></span>
          <span class="scene-piece gift"></span>
        </div>
      `;
    case "lunchbox-tapper":
      return `
        <div class="preview-stage preview-lunchbox-tapper">
          <span class="lunchbox" aria-hidden="true">${Array.from({ length: 6 }, () => "<span></span>").join("")}</span>
          <span class="scene-piece tap-spark"></span>
        </div>
      `;
    case "moon-runner":
      return `
        <div class="preview-stage preview-moon-runner">
          <span class="scene-piece moon"></span>
          <span class="scene-piece platform p1"></span>
          <span class="scene-piece platform p2"></span>
          <span class="scene-piece platform p3"></span>
          <span class="scene-piece runner"></span>
          <span class="scene-piece letter"></span>
        </div>
      `;
    default:
      return `
        <div class="preview-stage preview-color-garden">
          <span class="garden-grid" aria-hidden="true">${Array.from({ length: 16 }, () => "<span></span>").join("")}</span>
        </div>
      `;
  }
}

function getCrystalMochiPreviewState() {
  try {
    const stored = JSON.parse(localStorage.getItem("crystalMochiStandProgress:v1") || "{}");
    const collection = JSON.parse(localStorage.getItem("crystalMochiStandCollection:v2") || "[]");
    const unlocked = Array.isArray(stored.unlockedDecorIds) ? stored.unlockedDecorIds : [];
    const preferred = typeof stored.equippedDecor === "string" && stored.equippedDecor
      ? stored.equippedDecor
      : unlocked[unlocked.length - 1] || "";
    const valid = new Set(["smile", "lamp", "curtain", "crown"]);
    const classNames = [];
    if (valid.has(preferred)) {
      classNames.push(`has-${preferred}`);
    }
    const collectedIds = new Set(Array.isArray(collection) ? collection.filter(Boolean) : []);
    const collectionSize = collectedIds.size;
    const ratio = collectionSize / 12;
    if (ratio >= 1) {
      classNames.push("book-full");
    } else if (ratio >= 0.5) {
      classNames.push("book-half");
    } else if (ratio > 0) {
      classNames.push("book-start");
    }
    for (const [setId, ids] of Object.entries(crystalMochiPreviewSets)) {
      if (ids.every((id) => collectedIds.has(id))) {
        classNames.push(`set-${setId}`);
      }
    }
    const preset = crystalMochiPreviewPresets.has(stored.buildPreset) ? stored.buildPreset : "balanced";
    classNames.push(`preset-${preset}`);
    const signalLevel = getCrystalMochiCandidateSignal(stored, collectionSize, ratio);
    if (likedGameIds.has(crystalMochiGameId)) {
      classNames.push("liked-by-user");
    }
    if (signalLevel >= 1) {
      classNames.push("candidate-spark");
    }
    if (signalLevel >= 2) {
      classNames.push("candidate-warm");
    }
    if (signalLevel >= 3) {
      classNames.push("candidate-hot");
    }
    return { className: classNames.join(" ") };
  } catch (error) {
    return { className: "" };
  }
}

function getCrystalMochiCandidateSignal(progress, collectionSize, ratio) {
  const metrics = progress && typeof progress.candidateMetrics === "object" ? progress.candidateMetrics : null;

  if (metrics && Number.isFinite(Number(metrics.score))) {
    const score = Number(metrics.score);

    if (score >= 75) {
      return 3;
    }

    if (score >= 45) {
      return 2;
    }

    if (score >= 20) {
      return 1;
    }

    return 0;
  }

  let score = likedGameIds.has(crystalMochiGameId) ? 1 : 0;
  const friendRecords = Array.isArray(progress.friendWeeklyRecords)
    ? progress.friendWeeklyRecords.filter((record) => !record?.archived)
    : [];
  const bestFriendScore = friendRecords.reduce((best, record) => Math.max(best, Number(record?.score || 0)), 0);
  const bestFriendBook = friendRecords.reduce((best, record) => Math.max(best, Number(record?.collectionSize || 0)), 0);
  const playerBest = Number(localStorage.getItem("crystalMochiStandBest") || 0);

  if (ratio >= 0.5) {
    score += 1;
  }

  if (ratio >= 1) {
    score += 1;
  }

  if (friendRecords.length) {
    score += playerBest >= bestFriendScore || collectionSize >= bestFriendBook ? 1 : 0;
  }

  return Math.min(3, score);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
