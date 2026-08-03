-- StoryHeaven operator log visibility, independent from production state.
-- Run after 20260731-storyheaven-single-work-queue.sql.

whenever sqlerror exit failure rollback

declare
  procedure add_column_if_missing(p_table varchar2, p_column varchar2, p_ddl varchar2) is
    v_count number;
  begin
    select count(*) into v_count
      from user_tab_columns
     where table_name = upper(p_table) and column_name = upper(p_column);
    if v_count = 0 then execute immediate p_ddl; end if;
  end;

  procedure create_index_if_missing(p_name varchar2, p_ddl varchar2) is
    v_count number;
  begin
    select count(*) into v_count from user_indexes where index_name = upper(p_name);
    if v_count = 0 then execute immediate p_ddl; end if;
  end;
begin
  add_column_if_missing(
    'STORYHEAVEN_SERIAL_RUNS',
    'HISTORY_HIDDEN_AT',
    'alter table storyheaven_serial_runs add history_hidden_at timestamp with time zone'
  );
  add_column_if_missing(
    'STORYHEAVEN_SERIAL_RUNS',
    'HISTORY_HIDDEN_BY',
    'alter table storyheaven_serial_runs add history_hidden_by varchar2(80)'
  );
  create_index_if_missing(
    'IDX_SH_SERIAL_RUN_HISTORY_HIDE',
    'create index idx_sh_serial_run_history_hide on storyheaven_serial_runs(history_hidden_at, queue_group_id)'
  );
end;
/

commit;

prompt StoryHeaven history visibility migration complete.
