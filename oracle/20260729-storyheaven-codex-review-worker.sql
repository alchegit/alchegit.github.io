-- StoryHeaven: leased external Codex moderation worker.
-- Run after 20260728-storyheaven-automated-moderation.sql on EENTA_REPO3 / ORAHOON.

whenever sqlerror exit failure rollback

declare
  procedure add_column_if_missing(
    p_table varchar2,
    p_column varchar2,
    p_definition varchar2
  ) is
    v_count number;
  begin
    select count(*) into v_count
      from user_tab_columns
     where table_name = upper(p_table)
       and column_name = upper(p_column);
    if v_count = 0 then
      execute immediate 'alter table ' || p_table || ' add (' || p_definition || ')';
    end if;
  end;

  procedure create_index_if_missing(p_name varchar2, p_ddl varchar2) is
    v_count number;
  begin
    select count(*) into v_count from user_indexes where index_name = upper(p_name);
    if v_count = 0 then execute immediate p_ddl; end if;
  end;
begin
  add_column_if_missing('STORYHEAVEN_AI_REVIEWS', 'LEASE_ID',
    'lease_id varchar2(36)');
  add_column_if_missing('STORYHEAVEN_AI_REVIEWS', 'WORKER_ID',
    'worker_id varchar2(80 char)');
  add_column_if_missing('STORYHEAVEN_AI_REVIEWS', 'LEASE_EXPIRES_AT',
    'lease_expires_at timestamp with time zone');

  create_index_if_missing('IDX_SH_AI_REVIEW_LEASE',
    'create index idx_sh_ai_review_lease on storyheaven_ai_reviews(lease_id, lease_expires_at)');
end;
/

commit;

prompt StoryHeaven Codex review worker migration complete.
