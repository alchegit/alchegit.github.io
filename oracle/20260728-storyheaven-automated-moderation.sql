-- StoryHeaven: deterministic preflight + real AI moderation batch queue.
-- Run after 20260728-storyheaven-multiple-genres.sql on EENTA_REPO3 / ORAHOON.

whenever sqlerror exit failure rollback

declare
  procedure create_table_if_missing(p_table varchar2, p_ddl clob) is
    v_count number;
  begin
    select count(*) into v_count from user_tables where table_name = upper(p_table);
    if v_count = 0 then execute immediate p_ddl; end if;
  end;
begin
  create_table_if_missing('STORYHEAVEN_AI_REVIEW_BATCHES', q'[
    create table storyheaven_ai_review_batches (
      id varchar2(36) primary key,
      story_id varchar2(36) not null references storyheaven_stories(id),
      author_user_id varchar2(80) not null references webtoon_profiles(user_id),
      story_revision_no number(6) not null,
      batch_status varchar2(30) default 'queued' not null check (
        batch_status in ('queued', 'running', 'provider_pending', 'retry_wait', 'approved', 'changes_required', 'error')
      ),
      episode_count number(2) not null check (episode_count between 1 and 10),
      completed_count number(2) default 0 not null check (completed_count between 0 and 11),
      estimated_minutes number(3) default 4 not null check (estimated_minutes between 1 and 120),
      provider_name varchar2(80 char),
      model_name varchar2(160 char),
      public_message varchar2(500 char),
      failure_code varchar2(80 char),
      submitted_at timestamp with time zone default systimestamp not null,
      started_at timestamp with time zone,
      completed_at timestamp with time zone,
      next_attempt_at timestamp with time zone,
      created_at timestamp with time zone default systimestamp not null,
      updated_at timestamp with time zone default systimestamp not null
    )
  ]');

  create_table_if_missing('STORYHEAVEN_AI_REVIEWS', q'[
    create table storyheaven_ai_reviews (
      id varchar2(36) primary key,
      batch_id varchar2(36) not null references storyheaven_ai_review_batches(id),
      story_id varchar2(36) not null references storyheaven_stories(id),
      target_type varchar2(20) not null check (target_type in ('story', 'episode')),
      target_id varchar2(36) not null,
      revision_no number(6) not null,
      review_status varchar2(30) default 'queued' not null check (
        review_status in ('queued', 'running', 'provider_pending', 'retry_wait', 'approved', 'changes_required', 'error')
      ),
      input_hash varchar2(64) not null,
      score number(3) check (score between 0 and 100),
      decision varchar2(30) check (decision in ('approved', 'changes_required')),
      category_json clob check (category_json is json),
      public_reason varchar2(1000 char),
      result_json clob check (result_json is json),
      attempt_count number(3) default 0 not null check (attempt_count between 0 and 99),
      provider_name varchar2(80 char),
      model_name varchar2(160 char),
      failure_code varchar2(80 char),
      started_at timestamp with time zone,
      completed_at timestamp with time zone,
      next_attempt_at timestamp with time zone,
      created_at timestamp with time zone default systimestamp not null,
      updated_at timestamp with time zone default systimestamp not null,
      constraint uq_sh_ai_review_target unique (target_type, target_id, revision_no)
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
  create_index_if_missing('IDX_SH_AI_BATCH_STORY',
    'create index idx_sh_ai_batch_story on storyheaven_ai_review_batches(story_id, created_at desc)');
  create_index_if_missing('IDX_SH_AI_BATCH_QUEUE',
    'create index idx_sh_ai_batch_queue on storyheaven_ai_review_batches(batch_status, next_attempt_at, created_at)');
  create_index_if_missing('IDX_SH_AI_REVIEW_QUEUE',
    'create index idx_sh_ai_review_queue on storyheaven_ai_reviews(review_status, next_attempt_at, created_at)');
  create_index_if_missing('IDX_SH_AI_REVIEW_BATCH',
    'create index idx_sh_ai_review_batch on storyheaven_ai_reviews(batch_id, review_status, created_at)');
  create_index_if_missing('IDX_SH_EP_REVISION_HASH',
    'create index idx_sh_ep_revision_hash on storyheaven_episode_revisions(content_hash, created_at desc)');
end;
/

commit;

prompt StoryHeaven automated moderation migration complete.
