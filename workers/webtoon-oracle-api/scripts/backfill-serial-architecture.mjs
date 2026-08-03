import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import oracledb from "oracledb";

await loadDotEnv(path.resolve(process.cwd(), ".env"));
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
oracledb.fetchAsString = [oracledb.CLOB];

const apply = process.argv.includes("--apply");
const connection = await oracledb.getConnection({
  user: requiredEnv("ORACLE_USER"),
  password: requiredEnv("ORACLE_PASSWORD"),
  connectString: requiredEnv("ORACLE_CONNECT_STRING")
});

try {
  const candidates = await connection.execute(
    `select story.id, story.title, story.logline, story.public_synopsis,
            story.genre, story.genres_json, story.tags_json, story.content_rating,
            bible.bible_version, bible.bible_status, bible.concept_json,
            bible.world_rules_json, bible.characters_json, bible.timeline_json,
            bible.glossary_json, bible.forbidden_json, bible.voice_profile_json,
            bible.narrative_blueprint_json,
            (select count(*) from storyheaven_serial_runs serial_run
              where serial_run.story_id = story.id
                and serial_run.run_status in ('queued', 'running', 'rewrite', 'ready')
                and serial_run.queue_canceled_at is null) as active_run_count
       from storyheaven_stories story
       join storyheaven_serial_bibles bible on bible.story_id = story.id
      where story.author_user_id = 'storyheaven-system-ai'
        and story.content_origin = 'admin_seed'
        and story.story_status <> 'archived'
      order by story.created_at`
  );
  const weak = candidates.rows.filter((row) => !architectureComplete(row));
  console.log(`${weak.length} stories need long-form architecture strengthening.`);
  if (!apply) {
    for (const row of weak) console.log(`DRY RUN: ${row.TITLE}`);
    console.log("Run again with --apply to enqueue these non-destructive bible jobs.");
  } else {
    const requestedBy = process.env.ADMIN_USER_ID || "admin";
    let queued = 0;
    let skippedActive = 0;
    for (const row of weak) {
      if (Number(row.ACTIVE_RUN_COUNT || 0) > 0) {
        skippedActive += 1;
        console.log(`SKIP ACTIVE: ${row.TITLE}`);
        continue;
      }
      const context = await loadExistingContext(connection, row);
      const seriesPlan = normalizeSeriesPlan(
        context.bible.narrativeBlueprint?.seriesPlan
        || context.bible.concept?.seriesPlan
      );
      const concept = { ...context.bible.concept, seriesPlan };
      await connection.execute(
        `update storyheaven_serial_bibles
            set concept_json = :concept_json, updated_at = systimestamp
          where story_id = :story_id`,
        { story_id: row.ID, concept_json: clobJson(concept) }
      );
      const runId = crypto.randomUUID();
      await connection.execute(
        `insert into storyheaven_serial_runs (
          id, queue_group_id, story_id, run_type, run_status,
          current_stage, requested_by, input_json
        ) values (
          :id, :queue_group_id, :story_id, 'planning', 'queued',
          'build_bible', :requested_by, :input_json
        )`,
        {
          id: runId,
          queue_group_id: runId,
          story_id: row.ID,
          requested_by: requestedBy,
          input_json: clobJson({ architectureOnly: true, preserveExistingWork: true, backfill: true })
        }
      );
      const payload = {
        story: context.story,
        concept,
        seriesPlan,
        architectureOnly: true,
        preserveExistingWork: true,
        existingBible: { ...context.bible, concept },
        priorArcs: context.priorArcs,
        canon: context.canon,
        reveals: context.reveals,
        recentEpisodes: context.recentEpisodes
      };
      const inputJson = JSON.stringify(payload);
      await connection.execute(
        `insert into storyheaven_serial_jobs (
          id, run_id, story_id, job_type, job_status, priority,
          input_hash, input_json, max_attempts, next_attempt_at
        ) values (
          :id, :run_id, :story_id, 'build_bible', 'queued', 100,
          :input_hash, :input_json, 3, systimestamp
        )`,
        {
          id: crypto.randomUUID(),
          run_id: runId,
          story_id: row.ID,
          input_hash: crypto.createHash("sha256").update(inputJson).digest("hex"),
          input_json: clob(inputJson)
        }
      );
      queued += 1;
      console.log(`QUEUED: ${row.TITLE}`);
    }
    await connection.commit();
    console.log(`Queued ${queued} architecture jobs; skipped ${skippedActive} stories with active work.`);
  }
} catch (error) {
  await connection.rollback().catch(() => {});
  throw error;
} finally {
  await connection.close();
}

async function loadExistingContext(connection, row) {
  const [arcs, canon, reveals, episodes] = await Promise.all([
    connection.execute(
      `select arc_no, arc_title, central_question, ending_truth,
              episode_plan_json, narrative_plan_json
         from storyheaven_serial_arcs
        where story_id = :story_id
        order by arc_no desc fetch first 10 rows only`,
      { story_id: row.ID }
    ),
    connection.execute(
      `select fact_key, fact_category, fact_value, source_episode_no
         from storyheaven_canon_facts
        where story_id = :story_id and fact_status = 'active'
        order by fact_key`,
      { story_id: row.ID }
    ),
    connection.execute(
      `select reveal_key, secret_text, introduce_episode_no, payoff_episode_no, reveal_status
         from storyheaven_reveal_ledger
        where story_id = :story_id and reveal_status <> 'retired'
        order by introduce_episode_no`,
      { story_id: row.ID }
    ),
    connection.execute(
      `select episode_no, title, public_summary
         from storyheaven_episodes
        where story_id = :story_id and episode_status = 'published'
        order by episode_no desc fetch first 10 rows only`,
      { story_id: row.ID }
    )
  ]);
  return {
    story: {
      id: row.ID,
      title: row.TITLE,
      logline: row.LOGLINE,
      synopsis: String(row.PUBLIC_SYNOPSIS || ""),
      genres: parseJson(row.GENRES_JSON, [row.GENRE].filter(Boolean)),
      tags: parseJson(row.TAGS_JSON, []),
      rating: row.CONTENT_RATING === "all" ? "all" : "teen"
    },
    bible: {
      storyId: row.ID,
      version: Number(row.BIBLE_VERSION || 1),
      status: row.BIBLE_STATUS,
      concept: parseJson(row.CONCEPT_JSON, {}),
      worldRules: parseJson(row.WORLD_RULES_JSON, []),
      characters: parseJson(row.CHARACTERS_JSON, []),
      timeline: parseJson(row.TIMELINE_JSON, []),
      glossary: parseJson(row.GLOSSARY_JSON, []),
      forbiddenContradictions: parseJson(row.FORBIDDEN_JSON, []),
      voiceProfile: parseJson(row.VOICE_PROFILE_JSON, {}),
      narrativeBlueprint: parseJson(row.NARRATIVE_BLUEPRINT_JSON, {})
    },
    priorArcs: arcs.rows.reverse().map((arc) => ({
      arcNo: Number(arc.ARC_NO),
      title: arc.ARC_TITLE,
      centralQuestion: arc.CENTRAL_QUESTION,
      endingTruth: arc.ENDING_TRUTH,
      episodePlan: parseJson(arc.EPISODE_PLAN_JSON, []),
      narrativePlan: parseJson(arc.NARRATIVE_PLAN_JSON, {})
    })),
    canon: canon.rows.map((fact) => ({
      key: fact.FACT_KEY,
      category: fact.FACT_CATEGORY,
      value: fact.FACT_VALUE,
      sourceEpisodeNo: fact.SOURCE_EPISODE_NO === null ? null : Number(fact.SOURCE_EPISODE_NO)
    })),
    reveals: reveals.rows.map((reveal) => ({
      key: reveal.REVEAL_KEY,
      secret: reveal.SECRET_TEXT,
      introduceEpisode: Number(reveal.INTRODUCE_EPISODE_NO),
      payoffEpisode: Number(reveal.PAYOFF_EPISODE_NO),
      status: reveal.REVEAL_STATUS
    })),
    recentEpisodes: episodes.rows.reverse().map((episode) => ({
      episodeNo: Number(episode.EPISODE_NO),
      title: episode.TITLE,
      summary: episode.PUBLIC_SUMMARY || ""
    }))
  };
}

function architectureComplete(row) {
  const narrative = parseJson(row.NARRATIVE_BLUEPRINT_JSON, {});
  const plan = normalizeSeriesPlan(narrative.seriesPlan || parseJson(row.CONCEPT_JSON, {}).seriesPlan);
  const architecture = narrative.seriesArchitecture || {};
  return Boolean(architecture.schemaVersion)
    && Number(architecture.plannedVolumeCount) === plan.totalVolumes
    && Number(architecture.plannedMainEpisodeCount) === plan.totalMainEpisodes
    && Array.isArray(architecture.volumePlan)
    && architecture.volumePlan.length === plan.totalVolumes
    && Array.isArray(architecture.renewableConflictSources)
    && architecture.renewableConflictSources.length >= 5
    && Array.isArray(architecture.longReveals)
    && architecture.longReveals.some((item) => Number(item?.payoffVolume) === plan.totalVolumes);
}

function normalizeSeriesPlan(value = {}) {
  const totalVolumes = clampInteger(value.totalVolumes ?? value.volumeCount, 1, 30, 10);
  const episodesPerVolume = clampInteger(value.episodesPerVolume, 10, 50, 25);
  return {
    totalVolumes,
    episodesPerVolume,
    totalMainEpisodes: totalVolumes * episodesPerVolume,
    prologueRequired: true,
    prologueEpisodeNo: 1,
    firstMainEpisodeNo: 2
  };
}

function clampInteger(value, min, max, fallback) {
  const number = Number(value);
  return Number.isInteger(number) ? Math.max(min, Math.min(max, number)) : fallback;
}

function parseJson(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  try { return typeof value === "string" ? JSON.parse(value) : value; } catch { return fallback; }
}

function clob(value) {
  return { val: String(value), type: oracledb.CLOB };
}

function clobJson(value) {
  return clob(JSON.stringify(value));
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
