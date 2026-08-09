-- Restore the same preserved build-bible job after the remaining character and
-- long-form contract examples were aligned with their validator requirements.

whenever sqlerror exit failure rollback

declare
  c_recovery_id constant varchar2(80) := '20260809-bible-contract-v2';
  c_queue_group_id constant varchar2(36) := '5df5eee3-4be3-44d7-b5b2-b0993ce1e54c';
  c_job_id constant varchar2(36) := '50c6f2c0-3f69-41c0-8b5a-5c3729845cb9';
  v_applied number;
  v_affected_jobs number := 0;
begin
  select count(*) into v_applied
    from storyheaven_serial_recoveries
   where recovery_id = c_recovery_id;

  if v_applied = 0 then
    update storyheaven_serial_jobs
       set job_status = 'retry_wait',
           attempt_count = 0,
           next_attempt_at = systimestamp,
           worker_id = null,
           lease_id = null,
           lease_expires_at = null,
           started_at = null,
           completed_at = null,
           updated_at = systimestamp
     where id = c_job_id
       and run_id in (
         select id
           from storyheaven_serial_runs
          where queue_group_id = c_queue_group_id
            and queue_canceled_at is null
       )
       and job_type = 'build_bible'
       and job_status = 'retry_wait'
       and error_code = 'review_api_422_serial_character_competence_invalid';
    v_affected_jobs := sql%rowcount;

    if v_affected_jobs <> 1 then
      raise_application_error(-20053, 'unexpected_bible_v2_recovery_job_count');
    end if;

    update storyheaven_serial_runs
       set run_status = 'queued',
           current_stage = 'build_bible',
           failure_code = null,
           completed_at = null,
           updated_at = systimestamp
     where queue_group_id = c_queue_group_id
       and queue_canceled_at is null;

    insert into storyheaven_serial_recoveries (
      recovery_id, queue_group_id, reason_code, affected_jobs
    ) values (
      c_recovery_id,
      c_queue_group_id,
      'review_api_422_serial_character_competence_invalid',
      v_affected_jobs
    );
  end if;
end;
/

commit;
/
