-- StoryHeaven internal serialized-fiction planning, generation, review and publication queue.
-- Run after 20260730-storyheaven-editorial-episodes.sql on EENTA_REPO3 / ORAHOON.

whenever sqlerror exit failure rollback

declare
  procedure create_table_if_missing(p_table varchar2, p_ddl clob) is
    v_count number;
  begin
    select count(*) into v_count from user_tables where table_name = upper(p_table);
    if v_count = 0 then execute immediate p_ddl; end if;
  end;
begin
  create_table_if_missing('STORYHEAVEN_SERIAL_SCHEDULES', q'[
    create table storyheaven_serial_schedules (
      id varchar2(36) primary key,
      schedule_name varchar2(80 char) not null,
      schedule_status varchar2(20) default 'paused' not null
        check (schedule_status in ('active', 'paused', 'archived')),
      cadence_days number(2) default 7 not null check (cadence_days between 1 and 30),
      target_age varchar2(20) default 'teen' not null check (target_age in ('all', 'teen')),
      genre_pool_json clob not null check (genre_pool_json is json),
      concept_policy_json clob not null check (concept_policy_json is json),
      max_active_serials number(2) default 6 not null check (max_active_serials between 1 and 20),
      next_run_at timestamp with time zone,
      last_run_at timestamp with time zone,
      created_by varchar2(80) not null references webtoon_profiles(user_id),
      created_at timestamp with time zone default systimestamp not null,
      updated_at timestamp with time zone default systimestamp not null
    )
  ]');

  create_table_if_missing('STORYHEAVEN_SERIAL_BIBLES', q'[
    create table storyheaven_serial_bibles (
      story_id varchar2(36) primary key references storyheaven_stories(id),
      bible_version number(6) default 1 not null,
      bible_status varchar2(20) default 'draft' not null check (bible_status in ('draft', 'active', 'archived')),
      concept_json clob not null check (concept_json is json),
      world_rules_json clob check (world_rules_json is json),
      characters_json clob check (characters_json is json),
      timeline_json clob check (timeline_json is json),
      glossary_json clob check (glossary_json is json),
      forbidden_json clob check (forbidden_json is json),
      voice_profile_json clob check (voice_profile_json is json),
      source_job_id varchar2(36),
      created_at timestamp with time zone default systimestamp not null,
      updated_at timestamp with time zone default systimestamp not null
    )
  ]');

  create_table_if_missing('STORYHEAVEN_SERIAL_ARCS', q'[
    create table storyheaven_serial_arcs (
      id varchar2(36) primary key,
      story_id varchar2(36) not null references storyheaven_stories(id),
      arc_no number(4) not null,
      arc_version number(6) default 1 not null,
      arc_status varchar2(20) default 'draft' not null check (arc_status in ('draft', 'active', 'complete', 'archived')),
      arc_title varchar2(120 char) not null,
      central_question varchar2(500 char) not null,
      midpoint_reversal varchar2(1000 char) not null,
      ending_truth varchar2(1000 char) not null,
      episode_plan_json clob not null check (episode_plan_json is json),
      source_job_id varchar2(36),
      created_at timestamp with time zone default systimestamp not null,
      updated_at timestamp with time zone default systimestamp not null,
      constraint uq_sh_serial_arc unique (story_id, arc_no, arc_version)
    )
  ]');

  create_table_if_missing('STORYHEAVEN_EPISODE_CARDS', q'[
    create table storyheaven_episode_cards (
      id varchar2(36) primary key,
      story_id varchar2(36) not null references storyheaven_stories(id),
      arc_id varchar2(36) not null references storyheaven_serial_arcs(id),
      episode_no number(5) not null check (episode_no between 1 and 300),
      card_version number(6) default 1 not null,
      card_status varchar2(20) default 'active' not null check (card_status in ('active', 'superseded', 'archived')),
      episode_promise varchar2(500 char) not null,
      opening_disturbance varchar2(1000 char) not null,
      scenes_json clob not null check (scenes_json is json),
      payoff varchar2(1000 char) not null,
      hook varchar2(1000 char) not null,
      knowledge_json clob check (knowledge_json is json),
      canon_refs_json clob check (canon_refs_json is json),
      source_job_id varchar2(36),
      created_at timestamp with time zone default systimestamp not null,
      updated_at timestamp with time zone default systimestamp not null,
      constraint uq_sh_episode_card unique (story_id, episode_no, card_version)
    )
  ]');

  create_table_if_missing('STORYHEAVEN_CANON_FACTS', q'[
    create table storyheaven_canon_facts (
      id varchar2(36) primary key,
      story_id varchar2(36) not null references storyheaven_stories(id),
      fact_key varchar2(80 char) not null,
      fact_version number(6) default 1 not null,
      fact_category varchar2(40 char) default 'event' not null,
      fact_value varchar2(1000 char) not null,
      fact_status varchar2(20) default 'active' not null check (fact_status in ('active', 'retconned', 'archived')),
      source_episode_no number(5),
      source_draft_id varchar2(36),
      replaces_fact_id varchar2(36),
      created_at timestamp with time zone default systimestamp not null,
      updated_at timestamp with time zone default systimestamp not null,
      constraint uq_sh_canon_fact unique (story_id, fact_key, fact_version)
    )
  ]');

  create_table_if_missing('STORYHEAVEN_REVEAL_LEDGER', q'[
    create table storyheaven_reveal_ledger (
      id varchar2(36) primary key,
      story_id varchar2(36) not null references storyheaven_stories(id),
      reveal_key varchar2(80 char) not null,
      secret_text varchar2(1000 char) not null,
      introduce_episode_no number(5) not null,
      payoff_episode_no number(5) not null,
      reveal_status varchar2(20) default 'planned' not null check (reveal_status in ('planned', 'seeded', 'revealed', 'retired')),
      source_arc_id varchar2(36) references storyheaven_serial_arcs(id),
      source_episode_no number(5),
      created_at timestamp with time zone default systimestamp not null,
      updated_at timestamp with time zone default systimestamp not null,
      constraint uq_sh_reveal_key unique (story_id, reveal_key)
    )
  ]');

  create_table_if_missing('STORYHEAVEN_SERIAL_RUNS', q'[
    create table storyheaven_serial_runs (
      id varchar2(36) primary key,
      schedule_id varchar2(36) references storyheaven_serial_schedules(id),
      story_id varchar2(36) references storyheaven_stories(id),
      arc_id varchar2(36) references storyheaven_serial_arcs(id),
      episode_no number(5),
      run_type varchar2(20) not null check (run_type in ('concept', 'planning', 'episode')),
      run_status varchar2(30) default 'queued' not null check (
        run_status in ('queued', 'running', 'rewrite', 'approved', 'blocked', 'ready', 'published', 'error')
      ),
      current_stage varchar2(40) not null,
      rewrite_count number(1) default 0 not null check (rewrite_count between 0 and 2),
      requested_by varchar2(80) not null references webtoon_profiles(user_id),
      release_at timestamp with time zone,
      input_json clob check (input_json is json),
      quality_json clob check (quality_json is json),
      failure_code varchar2(100 char),
      started_at timestamp with time zone,
      completed_at timestamp with time zone,
      created_at timestamp with time zone default systimestamp not null,
      updated_at timestamp with time zone default systimestamp not null
    )
  ]');

  create_table_if_missing('STORYHEAVEN_SERIAL_JOBS', q'[
    create table storyheaven_serial_jobs (
      id varchar2(36) primary key,
      run_id varchar2(36) not null references storyheaven_serial_runs(id),
      story_id varchar2(36) references storyheaven_stories(id),
      job_type varchar2(40) not null check (
        job_type in ('concept_gate', 'build_bible', 'build_arc', 'build_episode_card', 'write_draft', 'editorial_review', 'rewrite_draft')
      ),
      job_status varchar2(30) default 'queued' not null check (
        job_status in ('queued', 'running', 'retry_wait', 'complete', 'error', 'canceled')
      ),
      priority number(4) default 100 not null,
      input_hash varchar2(64) not null,
      input_json clob not null check (input_json is json),
      output_json clob check (output_json is json),
      attempt_count number(2) default 0 not null check (attempt_count between 0 and 20),
      max_attempts number(2) default 3 not null check (max_attempts between 1 and 10),
      next_attempt_at timestamp with time zone default systimestamp not null,
      worker_id varchar2(80 char),
      lease_id varchar2(36),
      lease_expires_at timestamp with time zone,
      error_code varchar2(100 char),
      started_at timestamp with time zone,
      completed_at timestamp with time zone,
      created_at timestamp with time zone default systimestamp not null,
      updated_at timestamp with time zone default systimestamp not null
    )
  ]');

  create_table_if_missing('STORYHEAVEN_SERIAL_DRAFTS', q'[
    create table storyheaven_serial_drafts (
      id varchar2(36) primary key,
      run_id varchar2(36) not null references storyheaven_serial_runs(id),
      story_id varchar2(36) not null references storyheaven_stories(id),
      episode_card_id varchar2(36) not null references storyheaven_episode_cards(id),
      episode_no number(5) not null,
      version_no number(6) not null,
      draft_kind varchar2(20) not null check (draft_kind in ('initial', 'rewrite')),
      title varchar2(120 char) not null,
      public_summary varchar2(1000 char) not null,
      body_text clob not null,
      scene_ranges_json clob not null check (scene_ranges_json is json),
      canon_candidates_json clob check (canon_candidates_json is json),
      reveal_updates_json clob check (reveal_updates_json is json),
      changes_json clob check (changes_json is json),
      deterministic_json clob not null check (deterministic_json is json),
      content_hash varchar2(64) not null,
      source_job_id varchar2(36) not null,
      created_at timestamp with time zone default systimestamp not null,
      constraint uq_sh_serial_draft unique (run_id, version_no)
    )
  ]');

  create_table_if_missing('STORYHEAVEN_EDITORIAL_REVIEWS', q'[
    create table storyheaven_editorial_reviews (
      id varchar2(36) primary key,
      run_id varchar2(36) not null references storyheaven_serial_runs(id),
      draft_id varchar2(36) not null references storyheaven_serial_drafts(id),
      review_version number(6) not null,
      decision varchar2(30) not null check (decision in ('approved', 'rewrite_required', 'blocked')),
      scores_json clob not null check (scores_json is json),
      safety_passed char(1) not null check (safety_passed in ('Y', 'N')),
      summary_text varchar2(1000 char) not null,
      issues_json clob check (issues_json is json),
      rewrite_scenes_json clob check (rewrite_scenes_json is json),
      source_job_id varchar2(36) not null,
      created_at timestamp with time zone default systimestamp not null,
      constraint uq_sh_editorial_review unique (run_id, review_version)
    )
  ]');

  create_table_if_missing('STORYHEAVEN_PUBLICATION_QUEUE', q'[
    create table storyheaven_publication_queue (
      id varchar2(36) primary key,
      run_id varchar2(36) not null unique references storyheaven_serial_runs(id),
      story_id varchar2(36) not null references storyheaven_stories(id),
      draft_id varchar2(36) not null references storyheaven_serial_drafts(id),
      episode_no number(5) not null,
      queue_status varchar2(20) default 'ready' not null check (queue_status in ('ready', 'publishing', 'published', 'error', 'canceled')),
      release_at timestamp with time zone default systimestamp not null,
      published_episode_id varchar2(36),
      attempt_count number(2) default 0 not null,
      failure_code varchar2(100 char),
      published_at timestamp with time zone,
      created_at timestamp with time zone default systimestamp not null,
      updated_at timestamp with time zone default systimestamp not null
    )
  ]');

  create_table_if_missing('STORYHEAVEN_QUALITY_METRICS', q'[
    create table storyheaven_quality_metrics (
      id varchar2(36) primary key,
      run_id varchar2(36) not null references storyheaven_serial_runs(id),
      draft_id varchar2(36) references storyheaven_serial_drafts(id),
      metric_name varchar2(60 char) not null,
      metric_score number(5,2) not null check (metric_score between 0 and 100),
      threshold_score number(5,2) not null check (threshold_score between 0 and 100),
      passed char(1) not null check (passed in ('Y', 'N')),
      evidence_json clob check (evidence_json is json),
      created_at timestamp with time zone default systimestamp not null
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
  create_index_if_missing('IDX_SH_SERIAL_SCHEDULE_DUE',
    'create index idx_sh_serial_schedule_due on storyheaven_serial_schedules(schedule_status, next_run_at)');
  create_index_if_missing('IDX_SH_SERIAL_ARC_ACTIVE',
    'create index idx_sh_serial_arc_active on storyheaven_serial_arcs(story_id, arc_status, arc_no desc)');
  create_index_if_missing('IDX_SH_CANON_ACTIVE',
    'create index idx_sh_canon_active on storyheaven_canon_facts(story_id, fact_status, fact_key)');
  create_index_if_missing('IDX_SH_REVEAL_STATUS',
    'create index idx_sh_reveal_status on storyheaven_reveal_ledger(story_id, reveal_status, payoff_episode_no)');
  create_index_if_missing('IDX_SH_SERIAL_RUN_STORY',
    'create index idx_sh_serial_run_story on storyheaven_serial_runs(story_id, created_at desc)');
  create_index_if_missing('IDX_SH_SERIAL_JOB_QUEUE',
    'create index idx_sh_serial_job_queue on storyheaven_serial_jobs(job_status, next_attempt_at, priority, created_at)');
  create_index_if_missing('IDX_SH_SERIAL_JOB_LEASE',
    'create index idx_sh_serial_job_lease on storyheaven_serial_jobs(lease_id, lease_expires_at)');
  create_index_if_missing('IDX_SH_PUBLICATION_DUE',
    'create index idx_sh_publication_due on storyheaven_publication_queue(queue_status, release_at)');
  create_index_if_missing('IDX_SH_QUALITY_RUN',
    'create index idx_sh_quality_run on storyheaven_quality_metrics(run_id, metric_name)');
end;
/

commit;

prompt StoryHeaven serial engine migration complete.
