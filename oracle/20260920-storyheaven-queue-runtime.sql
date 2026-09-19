whenever sqlerror exit failure rollback
declare
  v_count number;
begin
  select count(*) into v_count from user_tables where table_name = 'STORYHEAVEN_SERIAL_RUNTIME';
  if v_count = 0 then
    execute immediate q'[
      create table storyheaven_serial_runtime (
        id number(1) primary key check (id = 1),
        paused char(1) default 'N' not null check (paused in ('Y','N')),
        active_queue_group_id varchar2(36),
        updated_at timestamp with time zone default systimestamp not null
      )
    ]';
    execute immediate q'[
      insert into storyheaven_serial_runtime (id, paused, active_queue_group_id)
      select 1, case when exists (
        select 1 from storyheaven_serial_jobs where job_status = 'retry_wait'
          and error_code = 'operator_system_paused'
      ) then 'Y' else 'N' end,
      (select max(r.queue_group_id) from storyheaven_serial_jobs j
         join storyheaven_serial_runs r on r.id = j.run_id where j.job_status = 'running')
      from dual
    ]';
  end if;
  select count(*) into v_count from user_tab_columns
    where table_name = 'STORYHEAVEN_SERIAL_RUNS' and column_name = 'QUEUE_REQUESTED_AT';
  if v_count = 0 then
    execute immediate 'alter table storyheaven_serial_runs add queue_requested_at timestamp with time zone';
    execute immediate 'update storyheaven_serial_runs set queue_requested_at = created_at';
    execute immediate 'alter table storyheaven_serial_runs modify queue_requested_at default systimestamp not null';
    execute immediate 'create index idx_sh_serial_queue_request on storyheaven_serial_runs(queue_group_id, queue_requested_at)';
  end if;
end;
/
commit;
