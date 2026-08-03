import crypto from "node:crypto";
import { mkdir, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const STORYHEAVEN_COVER_EPISODE_THRESHOLD = 4;
export const STORYHEAVEN_COVER_SIZE = Object.freeze({ width: 1536, height: 864 });

export function shouldGenerateStoryHeavenCover({ coverPath = "", publishedEpisodeCount = 0 } = {}) {
  return !String(coverPath || "").trim()
    && Number(publishedEpisodeCount || 0) >= STORYHEAVEN_COVER_EPISODE_THRESHOLD;
}

export function createStoryHeavenCoverService({
  withConnection,
  withTransaction,
  assetDir,
  logger = console
}) {
  const coverDir = path.join(path.resolve(assetDir), "storyheaven-covers");
  let activeSweep = null;

  return Object.freeze({ ensureEligibleCovers });

  async function ensureEligibleCovers({ storyId = null, limit = 4 } = {}) {
    if (activeSweep) return activeSweep;
    activeSweep = runSweep({ storyId, limit }).finally(() => {
      activeSweep = null;
    });
    return activeSweep;
  }

  async function runSweep({ storyId, limit }) {
    const safeLimit = Math.max(1, Math.min(12, Math.floor(Number(limit || 4))));
    const candidates = await withConnection(async (connection) => {
      const result = await connection.execute(
        `select * from (
           select s.id, s.title, s.logline, s.public_synopsis, s.genre,
                  s.genres_json, s.tags_json, s.cover_path,
                  (select count(*) from storyheaven_episodes episode
                    where episode.story_id = s.id
                      and episode.episode_status = 'published') as published_episode_count
             from storyheaven_stories s
            where s.story_status = 'published'
              and s.content_origin in ('admin_seed', 'ai_seed')
              and trim(s.cover_path) is null
              and (:story_id is null or s.id = :story_id)
              and (select count(*) from storyheaven_episodes episode
                    where episode.story_id = s.id
                      and episode.episode_status = 'published') >= :episode_threshold
            order by s.published_at, s.id
         ) where rownum <= ${safeLimit}`,
        { story_id: storyId || null, episode_threshold: STORYHEAVEN_COVER_EPISODE_THRESHOLD }
      );
      return result.rows.map(mapCandidate);
    });
    if (!candidates.length) return { generated: [], failed: [] };

    await mkdir(coverDir, { recursive: true });
    const generated = [];
    const failed = [];
    for (const story of candidates) {
      try {
        const fileName = `${safeStoryId(story.id)}.webp`;
        const outputPath = path.join(coverDir, fileName);
        if (!await fileExists(outputPath)) {
          await renderStoryHeavenCover({ story, outputPath });
        }
        const publicPath = `/assets/webtoon/storyheaven-covers/${fileName}`;
        const linked = await withTransaction(async (connection) => {
          const result = await connection.execute(
            `update storyheaven_stories
                set cover_path = :cover_path, updated_at = systimestamp
              where id = :story_id and trim(cover_path) is null`,
            { story_id: story.id, cover_path: publicPath }
          );
          return Number(result.rowsAffected || 0) === 1;
        });
        generated.push({ storyId: story.id, coverPath: publicPath, linked });
      } catch (error) {
        const code = String(error?.code || error?.message || "story_cover_generation_failed").slice(0, 160);
        logger.error?.(`[storyheaven] cover generation failed story=${story.id} code=${code}`);
        failed.push({ storyId: story.id, code });
      }
    }
    return { generated, failed };
  }
}

export async function renderStoryHeavenCover({ story, outputPath }) {
  const target = path.resolve(outputPath);
  const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;
  const svg = buildStoryHeavenCoverSvg(story);
  try {
    await sharp(Buffer.from(svg))
      .resize(STORYHEAVEN_COVER_SIZE.width, STORYHEAVEN_COVER_SIZE.height, { fit: "cover" })
      .webp({ quality: 91, effort: 5 })
      .toFile(temporary);
    await rename(temporary, target);
  } catch (error) {
    await unlink(temporary).catch(() => {});
    throw error;
  }
  return target;
}

export function buildStoryHeavenCoverSvg(story = {}) {
  const title = clean(story.title);
  const description = [story.logline, story.synopsis, ...(story.tags || [])].map(clean).join(" ");
  const genres = Array.isArray(story.genres) ? story.genres.map(clean) : [clean(story.genre)];
  const source = `${title} ${description} ${genres.join(" ")}`.toLocaleLowerCase("ko-KR");
  const theme = chooseTheme(source);
  const random = deterministicNumbers(`${story.id || "story"}|${title}|${description}`, 42);
  const horizon = 430 + Math.round(random[0] * 90);
  const moonX = 220 + Math.round(random[1] * 1050);
  const moonY = 120 + Math.round(random[2] * 150);
  const moonSize = 74 + Math.round(random[3] * 75);
  const streaks = random.slice(4, 18).map((value, index) => {
    const x = Math.round(value * 1500);
    const y = 70 + Math.round(random[(index + 11) % random.length] * 330);
    const length = 24 + Math.round(random[(index + 17) % random.length] * 110);
    return `<path d="M ${x} ${y} l ${length} ${-8 - Math.round(value * 22)}" stroke="${theme.spark}" stroke-width="${2 + (index % 3)}" opacity="${(0.18 + value * 0.42).toFixed(2)}"/>`;
  }).join("");
  const distant = buildDistantScene(theme, source, random, horizon);
  const motif = buildStoryMotif(theme, source, random, horizon);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${STORYHEAVEN_COVER_SIZE.width}" height="${STORYHEAVEN_COVER_SIZE.height}" viewBox="0 0 1536 864">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${theme.skyTop}"/>
      <stop offset="0.56" stop-color="${theme.skyBottom}"/>
      <stop offset="1" stop-color="${theme.glow}"/>
    </linearGradient>
    <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${theme.ground}"/>
      <stop offset="1" stop-color="${theme.ink}"/>
    </linearGradient>
    <radialGradient id="light" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="${theme.spark}" stop-opacity="0.95"/>
      <stop offset="1" stop-color="${theme.spark}" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="18"/></filter>
  </defs>
  <rect width="1536" height="864" fill="url(#sky)"/>
  <circle cx="${moonX}" cy="${moonY}" r="${moonSize * 1.9}" fill="url(#light)" filter="url(#soft)" opacity="0.65"/>
  <circle cx="${moonX}" cy="${moonY}" r="${moonSize}" fill="${theme.moon}" opacity="0.92"/>
  ${streaks}
  ${distant}
  <path d="M0 ${horizon + 42} C280 ${horizon - 15}, 520 ${horizon + 92}, 790 ${horizon + 28} S1260 ${horizon - 18},1536 ${horizon + 50} V864 H0Z" fill="url(#ground)"/>
  ${motif}
  <path d="M0 782 C350 710, 550 830, 860 758 S1270 702,1536 790 V864 H0Z" fill="${theme.ink}" opacity="0.92"/>
  <path d="M0 30 H1040 L870 0 H0Z" fill="${theme.accent}" opacity="0.1"/>
  <path d="M1536 834 H496 L666 864 H1536Z" fill="${theme.spark}" opacity="0.12"/>
</svg>`;
}

function buildDistantScene(theme, source, random, horizon) {
  if (/(우주|행성|궤도|sf|science|우주선)/u.test(source)) {
    return `<ellipse cx="1210" cy="215" rx="190" ry="48" fill="none" stroke="${theme.accent}" stroke-width="14" opacity="0.72" transform="rotate(-12 1210 215)"/>
      <circle cx="1210" cy="215" r="105" fill="${theme.accent}" opacity="0.68"/>
      <path d="M160 ${horizon + 15} L360 ${horizon - 110} L550 ${horizon + 15}Z" fill="${theme.ink}" opacity="0.48"/>`;
  }
  if (/(도시|학교|현대|미스터리|스릴러|괴담|사무|회사)/u.test(source)) {
    const buildings = Array.from({ length: 13 }, (_, index) => {
      const width = 70 + Math.round(random[(index + 8) % random.length] * 65);
      const height = 90 + Math.round(random[(index + 15) % random.length] * 250);
      const x = index * 128 - 35;
      return `<rect x="${x}" y="${horizon - height}" width="${width}" height="${height + 65}" fill="${theme.ink}" opacity="${(0.38 + (index % 3) * 0.12).toFixed(2)}"/><rect x="${x + 18}" y="${horizon - height + 32}" width="12" height="8" fill="${theme.spark}" opacity="0.65"/>`;
    }).join("");
    return buildings;
  }
  return `<path d="M0 ${horizon + 35} L220 ${horizon - 145} L380 ${horizon - 10} L610 ${horizon - 235} L845 ${horizon + 20} L1080 ${horizon - 175} L1320 ${horizon - 5} L1536 ${horizon - 125} V${horizon + 80} H0Z" fill="${theme.ink}" opacity="0.42"/>
    <path d="M0 ${horizon + 55} L330 ${horizon - 75} L610 ${horizon + 32} L990 ${horizon - 94} L1280 ${horizon + 18} L1536 ${horizon - 38} V${horizon + 110} H0Z" fill="${theme.accent}" opacity="0.22"/>`;
}

function buildStoryMotif(theme, source, random, horizon) {
  const pieces = [];
  if (/(열차|기차|역|플랫폼)/u.test(source)) {
    pieces.push(`<path d="M120 ${horizon + 115} H1010 L1235 ${horizon + 235} H230Z" fill="${theme.accent}" opacity="0.75"/><rect x="170" y="${horizon - 70}" width="720" height="190" rx="24" fill="${theme.ink}"/><g fill="${theme.moon}">${Array.from({ length: 7 }, (_, i) => `<rect x="${220 + i * 88}" y="${horizon - 25}" width="58" height="54" rx="5" opacity="${0.55 + i * 0.04}"/>`).join("")}</g>`);
  } else if (/(우주|행성|궤도|sf|science|우주선)/u.test(source)) {
    pieces.push(`<path d="M410 ${horizon + 160} Q760 ${horizon - 170} 1125 ${horizon + 70} Q790 ${horizon + 35} 410 ${horizon + 160}Z" fill="${theme.moon}"/><path d="M500 ${horizon + 125} L268 ${horizon + 258} L555 ${horizon + 172}Z" fill="${theme.accent}" opacity="0.8"/><circle cx="910" cy="${horizon + 15}" r="23" fill="${theme.spark}"/>`);
  } else {
    if (/(왕|왕궁|성|기사|판타지|마법|용)/u.test(source)) {
      pieces.push(`<g fill="${theme.ink}"><rect x="1030" y="${horizon - 115}" width="315" height="250"/><rect x="990" y="${horizon - 205}" width="82" height="340"/><rect x="1302" y="${horizon - 245}" width="82" height="380"/><path d="M980 ${horizon - 205} L1031 ${horizon - 300} L1082 ${horizon - 205}Z"/><path d="M1292 ${horizon - 245} L1343 ${horizon - 350} L1394 ${horizon - 245}Z"/></g>`);
    }
    if (/(검|기사|전투|액션|수호자)/u.test(source)) {
      pieces.push(`<g transform="translate(${430 + Math.round(random[31] * 170)} ${horizon - 155}) rotate(${35 + Math.round(random[32] * 18)})"><path d="M0 0 L38 0 L28 360 L10 405 L0 360Z" fill="${theme.moon}"/><rect x="-38" y="345" width="112" height="26" rx="8" fill="${theme.accent}"/><rect x="9" y="368" width="20" height="118" rx="9" fill="${theme.ink}"/></g>`);
    }
    if (/(용|드래곤)/u.test(source)) {
      pieces.push(`<path d="M1060 ${horizon - 250} C915 ${horizon - 385},780 ${horizon - 275},720 ${horizon - 175} C850 ${horizon - 245},940 ${horizon - 145},1010 ${horizon - 45} C1050 ${horizon - 160},1145 ${horizon - 175},1265 ${horizon - 120} C1200 ${horizon - 245},1120 ${horizon - 305},1060 ${horizon - 250}Z" fill="${theme.accent}" opacity="0.88"/><circle cx="1110" cy="${horizon - 205}" r="9" fill="${theme.spark}"/>`);
    }
  }
  const pair = /(소녀|소년|왕자|동료|로맨스|사랑|둘은|두 사람)/u.test(source);
  const firstX = pair ? 650 : 735;
  pieces.push(personSilhouette(firstX, horizon + 125, 1 + random[35] * 0.16, theme.ink, theme.accent));
  if (pair) pieces.push(personSilhouette(820, horizon + 145, 0.88 + random[36] * 0.12, theme.ink, theme.spark));
  if (/(비|장마|빗물)/u.test(source)) {
    pieces.push(`<g stroke="${theme.moon}" stroke-width="4" opacity="0.34">${Array.from({ length: 18 }, (_, index) => `<path d="M${70 + index * 88} ${40 + (index % 4) * 30} l-55 155"/>`).join("")}</g>`);
  }
  if (/(눈|겨울|설원|빙하)/u.test(source)) {
    pieces.push(`<g fill="${theme.moon}" opacity="0.7">${Array.from({ length: 22 }, (_, index) => `<circle cx="${55 + index * 69}" cy="${80 + (index % 6) * 78}" r="${3 + (index % 4)}"/>`).join("")}</g>`);
  }
  return pieces.join("");
}

function personSilhouette(x, groundY, scale, color, accent) {
  return `<g transform="translate(${x} ${groundY}) scale(${scale.toFixed(2)})"><circle cx="0" cy="-252" r="48" fill="${color}"/><path d="M-54 -210 Q0 -244 54 -210 L83 2 H-76Z" fill="${color}"/><path d="M-48 -182 L-138 -15 L-101 2 L4 -150Z" fill="${color}"/><path d="M43 -180 L135 -28 L101 -3 L-4 -145Z" fill="${color}"/><path d="M-55 -120 Q0 -85 61 -126" fill="none" stroke="${accent}" stroke-width="13" opacity="0.75"/></g>`;
}

function chooseTheme(source) {
  if (/(공포|호러|괴담|좀비)/u.test(source)) return theme("#17161b", "#44313b", "#110f14", "#e04b53", "#f1d8bd", "#ffcc66", "#24202a");
  if (/(우주|행성|궤도|sf|science|우주선)/u.test(source)) return theme("#11182f", "#264a65", "#0c1224", "#ef5da8", "#79e7f2", "#ffe06b", "#161a2b");
  if (/(로맨스|사랑|연애|로맨틱)/u.test(source)) return theme("#31445a", "#d56b7d", "#222d3c", "#f2b35d", "#f6ded0", "#67d7c2", "#252b36");
  if (/(미스터리|스릴러|추리|범죄|괴담)/u.test(source)) return theme("#18252d", "#46636a", "#11191e", "#db7053", "#d5ddd5", "#f2c14f", "#192027");
  if (/(액션|전투|무협|헌터)/u.test(source)) return theme("#22262f", "#536577", "#14171d", "#e84545", "#dce6e8", "#54c8c0", "#1d2229");
  if (/(역사|사극|시대|궁중)/u.test(source)) return theme("#31443b", "#9d7850", "#1d2a25", "#c84b4b", "#ead9b7", "#e4b84b", "#273129");
  return theme("#17253e", "#4b6385", "#111827", "#d85858", "#e8d9b7", "#55d9b3", "#1a2332");
}

function theme(skyTop, skyBottom, ground, accent, moon, spark, ink) {
  return { skyTop, skyBottom, ground, glow: accent, accent, moon, spark, ink };
}

function deterministicNumbers(seed, count) {
  const digest = crypto.createHash("sha256").update(seed).digest();
  let state = digest.readUInt32BE(0) || 1;
  return Array.from({ length: count }, (_, index) => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state = (state + digest[index % digest.length]) >>> 0;
    return state / 0xffffffff;
  });
}

function mapCandidate(row) {
  const genres = parseJson(row.GENRES_JSON, [row.GENRE]).filter(Boolean);
  return {
    id: row.ID,
    title: row.TITLE,
    logline: row.LOGLINE || "",
    synopsis: row.PUBLIC_SYNOPSIS || "",
    genre: genres[0] || row.GENRE,
    genres,
    tags: parseJson(row.TAGS_JSON, []),
    coverPath: row.COVER_PATH || "",
    publishedEpisodeCount: Number(row.PUBLISHED_EPISODE_COUNT || 0)
  };
}

function parseJson(value, fallback) {
  try {
    const parsed = JSON.parse(String(value || ""));
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function safeStoryId(value) {
  const id = String(value || "").trim();
  if (!/^[a-z0-9-]{1,80}$/iu.test(id)) throw new Error("story_cover_id_invalid");
  return id;
}

async function fileExists(filePath) {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

function clean(value) {
  return String(value || "").replace(/\s+/gu, " ").trim().slice(0, 1000);
}
