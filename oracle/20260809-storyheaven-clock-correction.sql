-- Correct automatic-serial timestamps written while the host clock was
-- 32,597 seconds ahead of trusted NTP time. Backup rows make this auditable
-- and the correction log prevents an accidental second application.

whenever sqlerror exit failure rollback

declare
  v_count number;
begin
  select count(*) into v_count from user_tables where table_name = 'STORYHEAVEN_TIME_CORRECTIONS';
  if v_count = 0 then
    execute immediate q'[
      create table storyheaven_time_corrections (
        correction_id varchar2(60 char) primary key,
        offset_seconds number not null,
        applied_at timestamp with time zone default systimestamp not null
      )
    ]';
  end if;

  select count(*) into v_count from user_tables where table_name = 'STORYHEAVEN_TIME_BACKUP';
  if v_count = 0 then
    execute immediate q'[
      create table storyheaven_time_backup (
        correction_id varchar2(60 char) not null,
        table_name varchar2(128 char) not null,
        column_name varchar2(128 char) not null,
        record_id varchar2(128 char) not null,
        old_value timestamp with time zone not null,
        constraint pk_storyheaven_time_backup primary key (correction_id, table_name, column_name, record_id)
      )
    ]';
  end if;
end;
/

declare
  c_correction_id constant varchar2(60) := '20260809-host-clock-plus-32597s';
  c_offset_seconds constant number := 32597;
  v_applied number;

  procedure shift_column(p_table varchar2, p_column varchar2) is
  begin
    execute immediate
      'insert into storyheaven_time_backup (correction_id, table_name, column_name, record_id, old_value) ' ||
      'select :correction_id, :table_name, :column_name, id, ' || dbms_assert.simple_sql_name(p_column) ||
      ' from ' || dbms_assert.simple_sql_name(p_table) ||
      ' where ' || dbms_assert.simple_sql_name(p_column) || ' is not null'
      using c_correction_id, upper(p_table), upper(p_column);
    execute immediate
      'update ' || dbms_assert.simple_sql_name(p_table) ||
      ' set ' || dbms_assert.simple_sql_name(p_column) ||
      ' = ' || dbms_assert.simple_sql_name(p_column) || ' - numtodsinterval(:offset_seconds, ''SECOND'')' ||
      ' where ' || dbms_assert.simple_sql_name(p_column) || ' is not null'
      using c_offset_seconds;
  end;
begin
  select count(*) into v_applied
    from storyheaven_time_corrections
   where correction_id = c_correction_id;

  if v_applied = 0 then
    shift_column('STORYHEAVEN_SERIAL_SCHEDULES', 'NEXT_RUN_AT');
    shift_column('STORYHEAVEN_SERIAL_SCHEDULES', 'LAST_RUN_AT');
    shift_column('STORYHEAVEN_SERIAL_SCHEDULES', 'LAST_CYCLE_COMPLETED_AT');
    shift_column('STORYHEAVEN_SERIAL_SCHEDULES', 'CREATED_AT');
    shift_column('STORYHEAVEN_SERIAL_SCHEDULES', 'UPDATED_AT');

    shift_column('STORYHEAVEN_SERIAL_RUNS', 'RELEASE_AT');
    shift_column('STORYHEAVEN_SERIAL_RUNS', 'STARTED_AT');
    shift_column('STORYHEAVEN_SERIAL_RUNS', 'COMPLETED_AT');
    shift_column('STORYHEAVEN_SERIAL_RUNS', 'CREATED_AT');
    shift_column('STORYHEAVEN_SERIAL_RUNS', 'UPDATED_AT');
    shift_column('STORYHEAVEN_SERIAL_RUNS', 'QUEUE_CANCELED_AT');
    shift_column('STORYHEAVEN_SERIAL_RUNS', 'HISTORY_HIDDEN_AT');

    shift_column('STORYHEAVEN_SERIAL_JOBS', 'NEXT_ATTEMPT_AT');
    shift_column('STORYHEAVEN_SERIAL_JOBS', 'LEASE_EXPIRES_AT');
    shift_column('STORYHEAVEN_SERIAL_JOBS', 'STARTED_AT');
    shift_column('STORYHEAVEN_SERIAL_JOBS', 'COMPLETED_AT');
    shift_column('STORYHEAVEN_SERIAL_JOBS', 'CREATED_AT');
    shift_column('STORYHEAVEN_SERIAL_JOBS', 'UPDATED_AT');

    insert into storyheaven_time_corrections (correction_id, offset_seconds)
    values (c_correction_id, c_offset_seconds);
  end if;
end;
/

commit;
/
