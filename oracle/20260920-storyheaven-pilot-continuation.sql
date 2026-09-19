whenever sqlerror exit failure rollback
merge into storyheaven_serial_story_controls target
using (
  select s.id from storyheaven_stories s
   where s.content_origin = 'admin_seed' and s.story_status = 'published'
     and exists (select 1 from storyheaven_serial_bibles b where b.story_id = s.id
       and json_value(b.narrative_blueprint_json, '$.serialMemory.pilotAssessment.operatorDecision') = 'promoted')
     and exists (select 1 from storyheaven_episodes e where e.story_id = s.id
       and e.episode_no = 3 and e.episode_status = 'published')
) source on (target.story_id = source.id)
when not matched then insert (story_id, visibility, continuation_mode, created_by, updated_by)
values (source.id, 'public', 'manual', 'storyheaven-system-ai', 'storyheaven-system-ai')
/
commit;
