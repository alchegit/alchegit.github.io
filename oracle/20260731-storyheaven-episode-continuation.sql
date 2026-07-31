-- StoryHeaven episode recommendation votes and idempotent next-episode requests.
-- Run after the two 20260731 serial-engine migrations on EENTA_REPO3 / ORAHOON.

whenever sqlerror exit failure rollback

declare
  procedure create_table_if_missing(p_table varchar2, p_ddl clob) is
    v_count number;
  begin
    select count(*) into v_count from user_tables where table_name = upper(p_table);
    if v_count = 0 then execute immediate p_ddl; end if;
  end;
begin
  create_table_if_missing('STORYHEAVEN_EPISODE_VOTES', q'[
    create table storyheaven_episode_votes (
      episode_id varchar2(36) not null references storyheaven_episodes(id),
      user_id varchar2(80) not null references webtoon_profiles(user_id),
      vote_type varchar2(20) not null
        check (vote_type in ('recommend', 'not_recommend')),
      created_at timestamp with time zone default systimestamp not null,
      updated_at timestamp with time zone default systimestamp not null,
      primary key (episode_id, user_id)
    )
  ]');

  create_table_if_missing('STORYHEAVEN_SERIAL_CONTINUATIONS', q'[
    create table storyheaven_serial_continuations (
      id varchar2(36) primary key,
      story_id varchar2(36) not null references storyheaven_stories(id),
      source_episode_id varchar2(36) not null references storyheaven_episodes(id),
      source_episode_no number(5) not null check (source_episode_no between 3 and 299),
      target_episode_no number(5) not null check (target_episode_no between 4 and 300),
      trigger_type varchar2(30) not null
        check (trigger_type in ('reader_threshold', 'admin_request')),
      requested_by varchar2(80) references webtoon_profiles(user_id),
      recommendation_count number(10) default 0 not null check (recommendation_count >= 0),
      request_status varchar2(20) default 'requesting' not null
        check (request_status in ('requesting', 'queued', 'fulfilled', 'failed')),
      run_id varchar2(36) references storyheaven_serial_runs(id),
      failure_code varchar2(100 char),
      created_at timestamp with time zone default systimestamp not null,
      updated_at timestamp with time zone default systimestamp not null,
      constraint uq_sh_serial_continue unique (story_id, target_episode_no)
    )
  ]');
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
  create_index_if_missing('IDX_SH_EPISODE_VOTE_COUNT',
    'create index idx_sh_episode_vote_count on storyheaven_episode_votes(episode_id, vote_type)');
  create_index_if_missing('IDX_SH_SERIAL_CONT_SOURCE',
    'create index idx_sh_serial_cont_source on storyheaven_serial_continuations(story_id, source_episode_no)');
  create_index_if_missing('IDX_SH_SERIAL_CONT_STATUS',
    'create index idx_sh_serial_cont_status on storyheaven_serial_continuations(request_status, created_at)');
end;
/

commit;

prompt StoryHeaven episode continuation migration complete.
