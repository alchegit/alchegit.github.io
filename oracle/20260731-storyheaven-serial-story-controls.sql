-- StoryHeaven per-story visibility and continuation controls.
-- Run after 20260731-storyheaven-episode-continuation.sql on EENTA_REPO3 / ORAHOON.

whenever sqlerror exit failure rollback

declare
  v_count number;
begin
  select count(*) into v_count
    from user_tables
   where table_name = 'STORYHEAVEN_SERIAL_STORY_CONTROLS';

  if v_count = 0 then
    execute immediate q'[
      create table storyheaven_serial_story_controls (
        story_id varchar2(36) primary key references storyheaven_stories(id),
        visibility varchar2(20) default 'public' not null
          check (visibility in ('public', 'private', 'archived')),
        continuation_mode varchar2(20) default 'auto' not null
          check (continuation_mode in ('auto', 'manual', 'paused', 'ended')),
        operator_note varchar2(1000 char),
        created_by varchar2(80 char),
        updated_by varchar2(80 char),
        created_at timestamp with time zone default systimestamp not null,
        updated_at timestamp with time zone default systimestamp not null
      )
    ]';
  end if;
end;
/

declare
  v_count number;
begin
  select count(*) into v_count
    from user_indexes
   where index_name = 'IDX_SH_STORY_CTRL_MODE';
  if v_count = 0 then
    execute immediate 'create index idx_sh_story_ctrl_mode on storyheaven_serial_story_controls(visibility, continuation_mode, updated_at)';
  end if;
end;
/

commit;

prompt StoryHeaven per-story serial controls migration complete.
