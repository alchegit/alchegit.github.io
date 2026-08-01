-- StoryHeaven configurable initial episode target and persisted episode-one timing.
-- Run after 20260731-storyheaven-single-work-queue.sql on EENTA_REPO3 / ORAHOON.

whenever sqlerror exit failure rollback

declare
  procedure add_column_if_missing(p_table varchar2, p_column varchar2, p_ddl varchar2) is
    v_count number;
  begin
    select count(*) into v_count
      from user_tab_columns
     where table_name = upper(p_table)
       and column_name = upper(p_column);
    if v_count = 0 then execute immediate p_ddl; end if;
  end;

  procedure add_constraint_if_missing(p_name varchar2, p_ddl varchar2) is
    v_count number;
  begin
    select count(*) into v_count from user_constraints where constraint_name = upper(p_name);
    if v_count = 0 then execute immediate p_ddl; end if;
  end;
begin
  add_column_if_missing(
    'STORYHEAVEN_SERIAL_SCHEDULES',
    'TARGET_EPISODE_COUNT',
    'alter table storyheaven_serial_schedules add target_episode_count number(2) default 1'
  );
  add_column_if_missing(
    'STORYHEAVEN_SERIAL_SCHEDULES',
    'EPISODE1_SAMPLE_COUNT',
    'alter table storyheaven_serial_schedules add episode1_sample_count number(8) default 0'
  );
  add_column_if_missing(
    'STORYHEAVEN_SERIAL_SCHEDULES',
    'EPISODE1_AVG_SECONDS',
    'alter table storyheaven_serial_schedules add episode1_avg_seconds number(12,2)'
  );
  add_column_if_missing(
    'STORYHEAVEN_SERIAL_SCHEDULES',
    'EPISODE1_LAST_SECONDS',
    'alter table storyheaven_serial_schedules add episode1_last_seconds number(12,2)'
  );

  execute immediate q'[
    update storyheaven_serial_schedules
       set target_episode_count = 1
     where target_episode_count is null
  ]';
  execute immediate q'[
    update storyheaven_serial_schedules
       set episode1_sample_count = 0
     where episode1_sample_count is null
  ]';
  execute immediate 'alter table storyheaven_serial_schedules modify target_episode_count default 1 not null';
  execute immediate 'alter table storyheaven_serial_schedules modify episode1_sample_count default 0 not null';

  add_constraint_if_missing(
    'CK_SH_SERIAL_TARGET_EPISODES',
    'alter table storyheaven_serial_schedules add constraint ck_sh_serial_target_episodes check (target_episode_count between 1 and 10)'
  );
  add_constraint_if_missing(
    'CK_SH_SERIAL_EP1_SAMPLE_COUNT',
    'alter table storyheaven_serial_schedules add constraint ck_sh_serial_ep1_sample_count check (episode1_sample_count >= 0)'
  );
end;
/

commit;
