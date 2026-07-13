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
const candidateReportElementId = "candidateMetricsReport";
const appInstallUrlsByGameId = {
  "released-dark-maze-lab-run": "https://play.google.com/store/apps/details?id=com.neokim.darkmaze&referrer=utm_source%3Dneokim_site%26utm_medium%3Dgames%26utm_campaign%3Ddarkmaze%26utm_content%3Dcabinet_card",
  "released-color-master-2-spectrum-sprint": "https://play.google.com/store/apps/details?id=com.codexdev.color_master2&referrer=utm_source%3Dneokim_site%26utm_medium%3Dgames%26utm_campaign%3Dcolor_master2%26utm_content%3Dcabinet_card",
  "released-color-master-memory": "https://play.google.com/store/apps/details?id=com.neokim.colormaster&referrer=utm_source%3Dneokim_site%26utm_medium%3Dgames%26utm_campaign%3Dcolormaster%26utm_content%3Dcabinet_card",
  "released-galacticode-cipher-lab": "https://play.google.com/store/apps/details?id=com.galactic.speak&referrer=utm_source%3Dneokim_site%26utm_medium%3Dgames%26utm_campaign%3Dgalacticode%26utm_content%3Dcabinet_card",
  "released-ufo-signal-room": "https://play.google.com/store/apps/details?id=com.call_the_ufo&referrer=utm_source%3Dneokim_site%26utm_medium%3Dgames%26utm_campaign%3Dcall_the_ufo%26utm_content%3Dcabinet_card"
};

let catalogGames = [];
let activeFilter = { type: "all", value: "all" };
let baseLikeCounts = new Map();
let likedGameIds = new Set();
let likeCountsAreAuthoritative = false;

document.addEventListener("DOMContentLoaded", () => {
  likedGameIds = loadLikedGameIds();
  document.getElementById("gameGrid").addEventListener("click", handleLikeClick);
  window.addEventListener("neokim:games-localechange", () => {
    if (!catalogGames.length) {
      return;
    }
    renderFilters(catalogGames);
    renderGrid(filterGames(catalogGames, activeFilter));
    window.NEOKIM_GAMES_I18N?.translateDom(document.body);
  });
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
        .sort(compareCatalogGames)
      : [];

    renderStats(catalogGames);
    renderFilters(catalogGames);
    renderGrid(catalogGames);
    updateCandidateMetricsReport(catalogGames);
  } catch (error) {
    document.getElementById("gameGrid").innerHTML = `<p class="error-copy">${escapeHtml(t("catalog.error", "게임 목록을 불러오지 못했습니다."))}</p>`;
    console.error(error);
  }
}

function compareCatalogGames(a, b) {
  const releaseDelta = Number(isReleasedAppGame(b)) - Number(isReleasedAppGame(a));
  if (releaseDelta !== 0) {
    return releaseDelta;
  }

  if (isReleasedAppGame(a) && isReleasedAppGame(b)) {
    const releaseSlotDelta = String(b.gridSlot || "").localeCompare(String(a.gridSlot || ""), "ko", {
      numeric: true,
      sensitivity: "base"
    });
    if (releaseSlotDelta !== 0) {
      return releaseSlotDelta;
    }
  }

  const slotDelta = String(b.gridSlot || "").localeCompare(String(a.gridSlot || ""), "ko", {
    numeric: true,
    sensitivity: "base"
  });
  if (slotDelta !== 0) {
    return slotDelta;
  }

  return String(a.workingTitleKo || a.id || "").localeCompare(String(b.workingTitleKo || b.id || ""), "ko", {
    numeric: true,
    sensitivity: "base"
  });
}

function isReleasedAppGame(game) {
  return game?.id?.startsWith("released-") || (Array.isArray(game?.tags) && game.tags.includes("released-app"));
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
  const filters = [{ type: "all", value: "all", label: t("filter.all", "All") }];

  if (games.some((game) => game.status === "playable")) {
    filters.push({ type: "status", value: "playable", label: t("filter.playable", "Playable") });
  }

  if (games.some((game) => game.status === "prototype-next")) {
    filters.push({ type: "status", value: "prototype-next", label: t("filter.next", "Next") });
  }

  filters.push(...engines.map((engine) => ({ type: "engine", value: engine, label: engine })));

  filterBar.innerHTML = filters
    .map((filter) => {
      const isActive = filter.type === activeFilter.type && filter.value === activeFilter.value;
      return `<button class="filter-button${isActive ? " is-active" : ""}" type="button" data-filter-type="${escapeHtml(filter.type)}" data-filter-value="${escapeHtml(filter.value)}">${escapeHtml(filter.label)}</button>`;
    })
    .join("");

  filterBar.onclick = (event) => {
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
  };
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
    grid.innerHTML = `<p class="empty-copy">${escapeHtml(t("catalog.empty", "표시할 게임이 없습니다."))}</p>`;
    return;
  }

  grid.innerHTML = games.map((game, index) => renderGameCard(game, index)).join("");
}

function renderGameCard(game, index) {
  const accent = accentColors[index % accentColors.length];
  const tags = Array.isArray(game.tags) ? game.tags.slice(0, 4) : [];
  const playableUrl = game.playableUrl || game.demoUrl || "";
  const appInstallUrl = appInstallUrlsByGameId[game.id] || "";
  const liked = likedGameIds.has(game.id);
  const likeCount = getLikeCount(game.id);
  const title = gameText(game, "title", game.workingTitleKo);
  const summary = gameText(game, "summary", game.oneLineSummary);
  const likeLabel = getI18n()?.formatLikeLabel ? getI18n().formatLikeLabel(title, likeCount) : `${title} 좋아요 ${likeCount}개`;

  return `
    <article class="game-card" data-status="${escapeHtml(game.status)}" style="--accent: ${accent}">
      <div class="preview-frame" role="img" aria-label="${escapeHtml(`${title} ${t("catalog.previewSuffix", "픽셀 미리보기")}`)}">
        ${renderPreview(game.preview?.animationKey)}
      </div>
      <div class="game-card-body">
        <div class="card-meta">
          <h2 class="game-title">${escapeHtml(title)}</h2>
          <button class="like-button${liked ? " is-liked" : ""}" type="button" data-like-game="${escapeHtml(game.id)}" aria-label="${escapeHtml(likeLabel)}" aria-pressed="${liked ? "true" : "false"}"${liked ? " disabled" : ""}>
            <span class="like-mark" aria-hidden="true">${liked ? "♥" : "♡"}</span>
            <span class="like-count" data-like-count>${escapeHtml(likeCount)}</span>
          </button>
        </div>
        <p class="game-summary">${escapeHtml(summary)}</p>
        <div class="pill-row">
          <span class="engine-pill">${escapeHtml(game.engine)}</span>
          ${tags.map((tag) => `<span class="tag-pill">${escapeHtml(getI18n()?.tag ? getI18n().tag(tag) : tag)}</span>`).join("")}
        </div>
        ${playableUrl ? `
          <div class="play-actions${appInstallUrl ? " has-install" : ""}">
            <a class="play-link" href="${escapeHtml(playableUrl)}">${escapeHtml(t("action.play", "플레이"))}</a>
            ${appInstallUrl ? `<a class="install-link" href="${escapeHtml(appInstallUrl)}" target="_blank" rel="noopener" aria-label="${escapeHtml(`${title} ${t("action.install", "앱 설치")}`)}">${escapeHtml(t("action.installShort", "설치"))}</a>` : ""}
          </div>
        ` : ""}
        <div class="card-actions" hidden aria-hidden="true">
          <a class="card-link" href="${escapeHtml(game.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(t("catalog.source", "원본 참고"))}</a>
          <a class="card-link" href="${escapeHtml(game.sourceRepoUrl)}" target="_blank" rel="noopener">${escapeHtml(t("catalog.docs", "소스/문서"))}</a>
        </div>
      </div>
    </article>
  `;
}

function getI18n() {
  return window.NEOKIM_GAMES_I18N || null;
}

function t(key, fallback) {
  return getI18n()?.t ? getI18n().t(key, fallback) : fallback;
}

function gameText(game, field, fallback) {
  return getI18n()?.gameText ? getI18n().gameText(game.id, field, fallback) : fallback;
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

async function getVoterHash() {
  const visitorId = getVisitorId();
  const salt = "neokim-game-cabinet-like:v1";
  if (!globalThis.crypto?.subtle || typeof TextEncoder === "undefined") {
    return fallbackHash(`${salt}:${visitorId}`);
  }

  const data = new TextEncoder().encode(`${salt}:${visitorId}`);
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hashBuffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getLikeEndpoint() {
  const configured = window.GAME_LIKE_ENDPOINT || document.querySelector('meta[name="game-like-endpoint"]')?.content || "";
  return configured.trim();
}

function getSupabaseConfig() {
  const url = window.GAME_LIKE_SUPABASE_URL || document.querySelector('meta[name="game-like-supabase-url"]')?.content || "";
  const key = window.GAME_LIKE_SUPABASE_KEY || document.querySelector('meta[name="game-like-supabase-key"]')?.content || "";
  if (!url.trim() || !key.trim()) {
    return null;
  }
  return { url: url.trim().replace(/\/+$/, ""), key: key.trim() };
}

async function callSupabaseRpc(functionName, body) {
  const supabase = getSupabaseConfig();
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  const response = await fetch(`${supabase.url}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: {
      apikey: supabase.key,
      Authorization: `Bearer ${supabase.key}`,
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : "{}"
  });

  if (!response.ok) {
    throw new Error(`Supabase RPC failed: HTTP ${response.status}`);
  }

  return response.json();
}

async function sendLikeVote(gameId) {
  const voterHash = await getVoterHash();
  const supabase = getSupabaseConfig();
  if (supabase) {
    return callSupabaseRpc("create_game_like", {
      p_game_id: gameId,
      p_voter_hash: voterHash,
      p_page: location.pathname || "/games/"
    });
  }

  const endpoint = getLikeEndpoint();
  if (!endpoint) {
    return null;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameId, voterHash, page: location.pathname || "/games/" })
  });

  if (!response.ok) {
    throw new Error(`Like vote failed: HTTP ${response.status}`);
  }

  return response.json();
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
  button.disabled = true;
  button.setAttribute("aria-pressed", "true");
  button.querySelector(".like-mark").textContent = "♥";
  button.querySelector("[data-like-count]").textContent = String(getLikeCount(gameId));
  const game = catalogGames.find((item) => item.id === gameId);
  if (game) {
    const title = gameText(game, "title", game.workingTitleKo);
    const count = getLikeCount(gameId);
    button.setAttribute("aria-label", getI18n()?.formatLikeLabel ? getI18n().formatLikeLabel(title, count) : `${title} 좋아요 ${count}개`);
  }

  sendLikeVote(gameId)
    .then((result) => {
      if (result && result.gameId === gameId && Number.isFinite(Number(result.count))) {
        baseLikeCounts.set(gameId, Number(result.count));
        button.querySelector("[data-like-count]").textContent = String(getLikeCount(gameId));
        if (game) {
          const title = gameText(game, "title", game.workingTitleKo);
          const count = getLikeCount(gameId);
          button.setAttribute("aria-label", getI18n()?.formatLikeLabel ? getI18n().formatLikeLabel(title, count) : `${title} 좋아요 ${count}개`);
        }
      }
    })
    .catch((error) => console.warn("Like vote was not sent", error));
}

function renderPreview(animationKey = "") {
  const key = String(animationKey).replace(/[^a-z0-9-]/gi, "");

  switch (key) {
    case "sparkle-oracle":
      return `
        <div class="preview-stage preview-sparkle-oracle">
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
    case "ufo-signal":
      return `
        <div class="preview-stage preview-ufo-signal">
          <span class="scene-piece ufo-disc"></span>
          <span class="scene-piece signal-beam"></span>
          <span class="scene-piece noise n1"></span>
          <span class="scene-piece noise n2"></span>
          <span class="scene-piece signal-dot"></span>
        </div>
      `;
    case "galacticode-cipher":
      return `
        <div class="preview-stage preview-galacticode-cipher">
          <span class="scene-piece cipher-screen">△◇☆</span>
          <span class="scene-piece scan-line"></span>
          <span class="scene-piece answer-chip a">문장</span>
          <span class="scene-piece answer-chip b">신호</span>
          <span class="scene-piece answer-chip c">좌표</span>
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
    case "color-memory":
      return `
        <div class="preview-stage preview-color-memory">
          <span class="scene-piece memory-target"></span>
          <span class="memory-options" aria-hidden="true">${Array.from({ length: 6 }, () => "<span></span>").join("")}</span>
          <span class="scene-piece memory-cursor"></span>
          <span class="scene-piece memory-flash"></span>
        </div>
      `;
    case "spectrum-sprint":
      return `
        <div class="preview-stage preview-spectrum-sprint">
          <span class="spectrum-grid" aria-hidden="true">${Array.from({ length: 25 }, () => "<span></span>").join("")}</span>
          <span class="scene-piece spectrum-cursor"></span>
          <span class="scene-piece spectrum-grade">PERFECT</span>
        </div>
      `;
    case "dark-maze-run":
      return `
        <div class="preview-stage preview-dark-maze-run">
          <span class="maze-preview-grid" aria-hidden="true">${Array.from({ length: 49 }, () => "<span></span>").join("")}</span>
          <span class="scene-piece maze-exit"></span>
          <span class="scene-piece maze-rat"></span>
          <span class="scene-piece maze-light"></span>
        </div>
      `;
    case "hidden-picture-atelier":
      return `
        <div class="preview-stage preview-hidden-picture-atelier">
          <span class="scene-piece picture-card left"></span>
          <span class="scene-piece picture-card right"></span>
          <span class="scene-piece difference-ring r1"></span>
          <span class="scene-piece difference-ring r2"></span>
          <span class="scene-piece found-flash"></span>
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

function updateCandidateMetricsReport(games) {
  const report = document.getElementById(candidateReportElementId);
  if (!report) {
    return;
  }

  const payload = {
    schemaVersion: "candidate-metrics/v1",
    updatedAt: new Date().toISOString(),
    visibleGameIds: games.map((game) => game.id),
    likedGameIds: [...likedGameIds]
  };
  report.textContent = JSON.stringify(payload, null, 2);
}

function fallbackHash(input) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }

  const hex = `${(h1 >>> 0).toString(16).padStart(8, "0")}${(h2 >>> 0).toString(16).padStart(8, "0")}`;
  return hex.repeat(4).slice(0, 64);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
