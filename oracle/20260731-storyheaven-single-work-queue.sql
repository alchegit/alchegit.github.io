-- StoryHeaven single-worker serial queue and minute-based cadence.
-- Run after 20260731-storyheaven-serial-engine.sql.

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

  procedure add_constraint_if_missing(p_name varchar2, p_ddl varchar2) is
    v_count number;
  begin
    select count(*) into v_count from user_constraints where constraint_name = upper(p_name);
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
    'STORYHEAVEN_SERIAL_SCHEDULES',
    'CADENCE_MINUTES',
    'alter table storyheaven_serial_schedules add cadence_minutes number(6)'
  );
  add_column_if_missing(
    'STORYHEAVEN_SERIAL_SCHEDULES',
    'LAST_CYCLE_COMPLETED_AT',
    'alter table storyheaven_serial_schedules add last_cycle_completed_at timestamp with time zone'
  );
  add_constraint_if_missing(
    'CK_SH_SERIAL_CADENCE_MINUTES',
    'alter table storyheaven_serial_schedules add constraint ck_sh_serial_cadence_minutes check (cadence_minutes between 15 and 10080)'
  );

  add_column_if_missing(
    'STORYHEAVEN_SERIAL_RUNS',
    'QUEUE_GROUP_ID',
    'alter table storyheaven_serial_runs add queue_group_id varchar2(36)'
  );
  add_column_if_missing(
    'STORYHEAVEN_SERIAL_RUNS',
    'QUEUE_CANCELED_AT',
    'alter table storyheaven_serial_runs add queue_canceled_at timestamp with time zone'
  );
  add_column_if_missing(
    'STORYHEAVEN_SERIAL_RUNS',
    'QUEUE_CANCELED_BY',
    'alter table storyheaven_serial_runs add queue_canceled_by varchar2(80)'
  );

  execute immediate q'[
    update storyheaven_serial_schedules
       set cadence_minutes = least(10080, greatest(15, cadence_days * 1440))
     where cadence_minutes is null
  ]';
  execute immediate 'alter table storyheaven_serial_schedules modify cadence_minutes default 360 not null';
  execute immediate q'[
    update storyheaven_serial_schedules
       set max_active_serials = 1
     where max_active_serials <> 1
  ]';
  execute immediate q'[
    update storyheaven_serial_runs
       set queue_group_id = id
     where queue_group_id is null
  ]';
  execute immediate 'alter table storyheaven_serial_runs modify queue_group_id not null';

  create_index_if_missing(
    'IDX_SH_SERIAL_RUN_QUEUE_GROUP',
    'create index idx_sh_serial_run_queue_group on storyheaven_serial_runs(queue_group_id, created_at)'
  );
end;
/

commit;

prompt StoryHeaven single-work queue migration complete.
