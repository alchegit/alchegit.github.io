import { readFile, writeFile } from "node:fs/promises";
import vm from "node:vm";

const root = new URL("../../../", import.meta.url);
const context = vm.createContext({ window: {} });
for (const path of ["storyheaven/seed-library.js", "storyheaven/editorial-episodes.js"]) {
  const source = await readFile(new URL(path, root), "utf8");
  vm.runInContext(source, context, { filename: path });
}

const stories = context.window.StoryHeavenSeeds.stories;
const output = [
  "-- StoryHeaven editorial serial episodes and live per-episode view counters.",
  "-- Generated from storyheaven/seed-library.js and editorial-episodes.js.",
  "-- Run after 20260730-storyheaven-editorial-showcase.sql and 20260727-public-view-counts.sql.",
  "",
  "whenever sqlerror exit failure rollback",
  "",
  "declare",
  "  procedure sync_episode(",
  "    p_id varchar2, p_story_id varchar2, p_episode_no number, p_title varchar2,",
  "    p_summary varchar2, p_body clob, p_character_count number, p_paragraph_count number,",
  "    p_read_minutes number, p_published_at timestamp with time zone",
  "  ) is",
  "  begin",
  "    merge into storyheaven_episodes target",
  "    using (select p_id id from dual) source",
  "       on (target.id = source.id)",
  "    when matched then update set",
  "      target.title = p_title,",
  "      target.public_summary = p_summary,",
  "      target.body_text = p_body,",
  "      target.character_count = p_character_count,",
  "      target.paragraph_count = p_paragraph_count,",
  "      target.estimated_read_minutes = p_read_minutes,",
  "      target.preview_character_count = least(p_character_count, 2500),",
  "      target.episode_status = 'published',",
  "      target.review_decision = 'approved',",
  "      target.published_at = p_published_at,",
  "      target.updated_at = systimestamp",
  "    when not matched then insert (",
  "      id, story_id, episode_no, title, public_summary, body_text, character_count,",
  "      paragraph_count, estimated_read_minutes, preview_character_count, episode_status,",
  "      review_decision, current_revision_no, submitted_at, reviewed_at, reviewed_by,",
  "      published_at, created_at, updated_at, view_count",
  "    ) values (",
  "      p_id, p_story_id, p_episode_no, p_title, p_summary, p_body, p_character_count,",
  "      p_paragraph_count, p_read_minutes, least(p_character_count, 2500), 'published',",
  "      'approved', 1, p_published_at, p_published_at, 'storyheaven-editorial',",
  "      p_published_at, p_published_at, systimestamp, 0",
  "    );",
  "  end;",
  "begin"
];

for (const story of stories) {
  for (const episode of story.episodes) {
    output.push("  sync_episode(");
    output.push(`    ${literal(episode.id)}, ${literal(story.id)}, ${episode.episodeNo}, ${literal(episode.title)},`);
    output.push(`    ${literal(episode.summary)},`);
    output.push(`    ${clob(episode.body)},`);
    output.push(`    ${episode.characterCount}, ${episode.paragraphCount}, ${episode.estimatedReadMinutes},`);
    output.push(`    to_timestamp_tz(${literal(episode.publishedAt)}, 'YYYY-MM-DD\"T\"HH24:MI:SSTZH:TZM')`);
    output.push("  );");
  }
}

output.push("end;", "/", "", "commit;", "", "prompt StoryHeaven editorial episodes synced.", "");

const destination = new URL("oracle/20260730-storyheaven-editorial-episodes.sql", root);
await writeFile(destination, output.join("\n"), "utf8");
console.log(`Generated ${destination.pathname} with ${stories.reduce((sum, story) => sum + story.episodes.length, 0)} episodes.`);

function literal(value) {
  return `'${String(value ?? "").replaceAll("'", "''")}'`;
}

function clob(value) {
  const chars = [...String(value ?? "")];
  const chunks = [];
  for (let index = 0; index < chars.length; index += 700) {
    chunks.push(`to_clob(${literal(chars.slice(index, index + 700).join(""))})`);
  }
  return chunks.join(" ||\n    ");
}
