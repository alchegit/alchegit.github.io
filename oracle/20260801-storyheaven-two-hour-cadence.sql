-- StoryHeaven two-hour default cadence for new and existing operator schedules.
-- Run after 20260801-storyheaven-initial-target-timing.sql.

whenever sqlerror exit failure rollback

begin
  execute immediate 'alter table storyheaven_serial_schedules modify cadence_minutes default 120';

  update storyheaven_serial_schedules
     set cadence_minutes = 120,
         cadence_days = 1,
         next_run_at = case
           when schedule_status = 'active'
             then least(nvl(next_run_at, systimestamp), systimestamp + numtodsinterval(120, 'MINUTE'))
           else next_run_at
         end,
         updated_at = systimestamp
   where schedule_status <> 'archived';
end;
/

commit;
