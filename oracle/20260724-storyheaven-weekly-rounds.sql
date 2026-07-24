-- StoryHeaven phase 3: weekly rounds, eligible entries, and auditable votes.
-- Run after 20260724-storyheaven-submissions.sql.

whenever sqlerror exit failure rollback

declare
  procedure create_table_if_missing(p_table varchar2, p_ddl clob) is
    v_count number;
  begin
    select count(*) into v_count from user_tables where table_name = upper(p_table);
    if v_count = 0 then execute immediate p_ddl; end if;
  end;
begin
  create_table_if_missing('STORYHEAVEN_ROUNDS', q'[
    create table storyheaven_rounds (
      id varchar2(36) primary key,
      round_key varchar2(30) not null unique,
      round_type varchar2(20) default 'weekly' not null
        check (round_type in ('weekly', 'runoff')),
      parent_round_id varchar2(36) references storyheaven_rounds(id),
      starts_at timestamp with time zone not null,
      submission_cutoff_at timestamp with time zone not null,
      voting_ends_at timestamp with time zone not null,
      audit_deadline_at timestamp with time zone not null,
      result_at timestamp with time zone not null,
      round_status varchar2(20) default 'scheduled' not null
        check (round_status in ('scheduled', 'open', 'auditing', 'tie_pending', 'confirmed', 'closed')),
      winner_story_id varchar2(36) references storyheaven_stories(id),
      results_json clob check (results_json is json),
      created_at timestamp with time zone default systimestamp not null,
      updated_at timestamp with time zone default systimestamp not null
    )
  ]');

  create_table_if_missing('STORYHEAVEN_ENTRIES', q'[
    create table storyheaven_entries (
      id varchar2(36) primary key,
      round_id varchar2(36) not null references storyheaven_rounds(id),
      story_id varchar2(36) not null references storyheaven_stories(id),
      author_user_id varchar2(80) not null references webtoon_profiles(user_id),
      entry_status varchar2(20) default 'candidate' not null
        check (entry_status in ('candidate', 'withdrawn', 'disqualified', 'winner', 'runner_up')),
      eligibility_score number(3) not null check (eligibility_score between 65 and 100),
      approved_at timestamp with time zone default systimestamp not null,
      final_rank number(4),
      vote_count_snapshot number(10),
      disqualification_reason varchar2(500 char),
      created_at timestamp with time zone default systimestamp not null,
      updated_at timestamp with time zone default systimestamp not null,
      constraint uq_sh_entry_story unique (round_id, story_id),
      constraint uq_sh_entry_author unique (round_id, author_user_id)
    )
  ]');

  create_table_if_missing('STORYHEAVEN_VOTES', q'[
    create table storyheaven_votes (
      id varchar2(36) primary key,
      round_id varchar2(36) not null references storyheaven_rounds(id),
      story_id varchar2(36) not null references storyheaven_stories(id),
      voter_user_id varchar2(80) not null references webtoon_profiles(user_id),
      active char(1) default 'Y' not null check (active in ('Y', 'N')),
      cast_at timestamp with time zone default systimestamp not null,
      canceled_at timestamp with time zone,
      constraint uq_sh_round_vote unique (round_id, story_id, voter_user_id)
    )
  ]');

  create_table_if_missing('STORYHEAVEN_VOTE_AUDIT', q'[
    create table storyheaven_vote_audit (
      id varchar2(36) primary key,
      vote_id varchar2(36) references storyheaven_votes(id),
      round_id varchar2(36) not null references storyheaven_rounds(id),
      story_id varchar2(36) not null references storyheaven_stories(id),
      voter_user_id varchar2(80) references webtoon_profiles(user_id),
      actor_user_id varchar2(80) references webtoon_profiles(user_id),
      event_type varchar2(20) not null check (event_type in ('cast', 'cancel', 'restore', 'invalidate')),
      signal_hash varchar2(64),
      signal_expires_at timestamp with time zone,
      details_json clob check (details_json is json),
      created_at timestamp with time zone default systimestamp not null
    )
  ]');
end;
/

declare
  v_count number;
begin
  select count(*) into v_count
    from user_tab_columns
   where table_name = 'STORYHEAVEN_VOTE_AUDIT'
     and column_name = 'SIGNAL_EXPIRES_AT';
  if v_count = 0 then
    execute immediate 'alter table storyheaven_vote_audit add (signal_expires_at timestamp with time zone)';
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
  create_index_if_missing('IDX_SH_ROUND_STATUS',
    'create index idx_sh_round_status on storyheaven_rounds(round_status, starts_at desc)');
  create_index_if_missing('IDX_SH_ENTRY_RANK',
    'create index idx_sh_entry_rank on storyheaven_entries(round_id, entry_status, vote_count_snapshot desc)');
  create_index_if_missing('IDX_SH_VOTE_COUNT',
    'create index idx_sh_vote_count on storyheaven_votes(round_id, story_id, active)');
  create_index_if_missing('IDX_SH_VOTE_VOTER',
    'create index idx_sh_vote_voter on storyheaven_votes(voter_user_id, cast_at desc)');
  create_index_if_missing('IDX_SH_VOTE_AUDIT',
    'create index idx_sh_vote_audit on storyheaven_vote_audit(round_id, created_at desc)');
end;
/

commit;

prompt StoryHeaven weekly round migration complete.
