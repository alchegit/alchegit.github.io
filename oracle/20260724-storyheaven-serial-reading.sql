-- StoryHeaven phase 6: serialized episodes, guest previews, reading progress, and structured reactions.
-- Run after 20260724-storyheaven-submissions.sql on EENTA_REPO3 / ORAHOON.

whenever sqlerror exit failure rollback

declare
  procedure create_table_if_missing(p_table varchar2, p_ddl clob) is
    v_count number;
  begin
    select count(*) into v_count from user_tables where table_name = upper(p_table);
    if v_count = 0 then execute immediate p_ddl; end if;
  end;
begin
  create_table_if_missing('STORYHEAVEN_EPISODES', q'[
    create table storyheaven_episodes (
      id varchar2(36) primary key,
      story_id varchar2(36) not null references storyheaven_stories(id),
      episode_no number(5) not null check (episode_no between 1 and 300),
      title varchar2(120 char) not null,
      public_summary varchar2(1000 char),
      body_text clob,
      character_count number(6) default 0 not null check (character_count between 0 and 12000),
      paragraph_count number(4) default 0 not null check (paragraph_count between 0 and 240),
      estimated_read_minutes number(3) default 1 not null check (estimated_read_minutes between 1 and 120),
      preview_character_count number(6) default 0 not null check (preview_character_count between 0 and 2500),
      episode_status varchar2(30) default 'draft' not null
        check (episode_status in ('draft', 'moderation', 'published', 'archived')),
      review_decision varchar2(30) default 'none' not null
        check (review_decision in ('none', 'pending', 'approved', 'changes_requested', 'rejected')),
      review_note varchar2(1000 char),
      current_revision_no number(6) default 1 not null,
      submitted_at timestamp with time zone,
      reviewed_at timestamp with time zone,
      reviewed_by varchar2(80),
      published_at timestamp with time zone,
      created_at timestamp with time zone default systimestamp not null,
      updated_at timestamp with time zone default systimestamp not null,
      constraint uq_sh_episode_no unique (story_id, episode_no)
    )
  ]');

  create_table_if_missing('STORYHEAVEN_EPISODE_REVISIONS', q'[
    create table storyheaven_episode_revisions (
      id varchar2(36) primary key,
      episode_id varchar2(36) not null references storyheaven_episodes(id),
      revision_no number(6) not null,
      actor_user_id varchar2(80) not null references webtoon_profiles(user_id),
      revision_kind varchar2(20) default 'draft' not null
        check (revision_kind in ('draft', 'submit', 'review', 'publish')),
      title varchar2(120 char) not null,
      public_summary varchar2(1000 char),
      body_text clob,
      content_hash varchar2(64) not null,
      quality_json clob check (quality_json is json),
      created_at timestamp with time zone default systimestamp not null,
      constraint uq_sh_episode_revision unique (episode_id, revision_no)
    )
  ]');

  create_table_if_missing('STORYHEAVEN_READING_PROGRESS', q'[
    create table storyheaven_reading_progress (
      user_id varchar2(80) not null references webtoon_profiles(user_id),
      story_id varchar2(36) not null references storyheaven_stories(id),
      episode_id varchar2(36) not null references storyheaven_episodes(id),
      last_character_offset number(6) default 0 not null check (last_character_offset between 0 and 12000),
      completion_rate number(5,4) default 0 not null check (completion_rate between 0 and 1),
      completed_at timestamp with time zone,
      updated_at timestamp with time zone default systimestamp not null,
      primary key (user_id, story_id)
    )
  ]');

  create_table_if_missing('STORYHEAVEN_EPISODE_REACTIONS', q'[
    create table storyheaven_episode_reactions (
      episode_id varchar2(36) not null references storyheaven_episodes(id),
      user_id varchar2(80) not null references webtoon_profiles(user_id),
      reaction_type varchar2(30) not null
        check (reaction_type in ('next_episode', 'character', 'world', 'tension')),
      created_at timestamp with time zone default systimestamp not null,
      primary key (episode_id, user_id, reaction_type)
    )
  ]');
end;
/

declare
  v_exists number;
begin
  select count(*) into v_exists from user_tables where table_name = 'STORYHEAVEN_NOTIFICATIONS';
  if v_exists = 1 then
    for item in (
      select constraint_name
        from user_constraints
       where table_name = 'STORYHEAVEN_NOTIFICATIONS'
         and constraint_type = 'C'
         and upper(search_condition_vc) like '%NOTIFICATION_TYPE%'
    ) loop
      execute immediate 'alter table storyheaven_notifications drop constraint ' || item.constraint_name;
    end loop;
    execute immediate q'[alter table storyheaven_notifications add constraint chk_sh_notification_type check (
      notification_type in ('report_result', 'appeal_received', 'appeal_result', 'episode_review_result')
    )]';
  end if;
end;
/

declare
  procedure create_index_if_missing(p_name varchar2, p_ddl varchar2) is
    v_count number;
  begin
    select count(*) into v_count from user_indexes where index_name = upper(p_name);
    if v_count = 0 then execute immediate p_ddl; end if;
  end;
begin
  create_index_if_missing('IDX_SH_EPISODE_PUBLIC',
    'create index idx_sh_episode_public on storyheaven_episodes(story_id, episode_status, episode_no)');
  create_index_if_missing('IDX_SH_EPISODE_MODERATION',
    'create index idx_sh_episode_moderation on storyheaven_episodes(episode_status, submitted_at)');
  create_index_if_missing('IDX_SH_EPISODE_REVISION',
    'create index idx_sh_episode_revision on storyheaven_episode_revisions(episode_id, revision_no desc)');
  create_index_if_missing('IDX_SH_READING_RECENT',
    'create index idx_sh_reading_recent on storyheaven_reading_progress(user_id, updated_at desc)');
end;
/

commit;

prompt StoryHeaven serial reading migration complete.
