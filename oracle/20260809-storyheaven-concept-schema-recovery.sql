-- Resume the newest concept-candidate run that was preserved during the
-- 2026-08-09 structured-output schema repair. Older terminal failures remain
-- untouched as an audit trail and are not regenerated as duplicate stories.

whenever sqlerror exit failure rollback

declare
  v_count number;
begin
  select count(*) into v_count
    from user_tables
   where table_name = 'STORYHEAVEN_SERIAL_RECOVERIES';
  if v_count = 0 then
    execute immediate q'[
      create table storyheaven_serial_recoveries (
        recovery_id varchar2(80 char) primary key,
        queue_group_id varchar2(36 char) not null,
        reason_code varchar2(100 char) not null,
        affected_jobs number default 0 not null,
        applied_at timestamp with time zone default systimestamp not null
      )
    ]';
  end if;
end;
/

declare
  c_recovery_id constant varchar2(80) := '20260809-concept-candidate-schema-v1';
  c_queue_group_id constant varchar2(36) := '5df5eee3-4be3-44d7-b5b2-b0993ce1e54c';
  v_applied number;
  v_affected_jobs number := 0;
begin
  select count(*) into v_applied
    from storyheaven_serial_recoveries
   where recovery_id = c_recovery_id;

  if v_applied = 0 then
    update storyheaven_serial_jobs
       set job_status = 'queued',
           attempt_count = 0,
           next_attempt_at = systimestamp,
           worker_id = null,
           lease_id = null,
           lease_expires_at = null,
           error_code = null,
           started_at = null,
           completed_at = null,
           updated_at = systimestamp
     where run_id in (
       select id
         from storyheaven_serial_runs
        where queue_group_id = c_queue_group_id
          and queue_canceled_at is null
     )
       and job_type = 'concept_candidates'
       and job_status = 'retry_wait'
       and error_code = 'operator_system_paused';
    v_affected_jobs := sql%rowcount;

    if v_affected_jobs <> 1 then
      raise_application_error(-20051, 'unexpected_concept_recovery_job_count');
    end if;

    update storyheaven_serial_runs
       set run_status = 'queued',
           current_stage = 'concept_candidates',
           failure_code = null,
           started_at = null,
           completed_at = null,
           updated_at = systimestamp
     where queue_group_id = c_queue_group_id
       and queue_canceled_at is null;

    update storyheaven_serial_schedules
       set schedule_status = 'active',
           updated_at = systimestamp
     where id in (
       select schedule_id
         from storyheaven_serial_runs
        where queue_group_id = c_queue_group_id
          and schedule_id is not null
     )
       and schedule_status = 'paused';

    insert into storyheaven_serial_recoveries (
      recovery_id, queue_group_id, reason_code, affected_jobs
    ) values (
      c_recovery_id, c_queue_group_id, 'serial_output_identity_mismatch', v_affected_jobs
    );
  end if;
end;
/

commit;
/
