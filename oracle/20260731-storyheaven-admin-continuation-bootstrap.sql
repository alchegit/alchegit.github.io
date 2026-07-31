-- Allow an administrator to continue a curated story from its latest published episode.
-- Existing reader-threshold policy remains enforced by the API from episode 3 onward.

whenever sqlerror exit failure rollback

declare
  procedure drop_old_check(p_fragment varchar2) is
  begin
    for constraint_row in (
      select constraint_name
        from user_constraints
       where table_name = 'STORYHEAVEN_SERIAL_CONTINUATIONS'
         and constraint_type = 'C'
         and upper(search_condition_vc) like p_fragment
    ) loop
      execute immediate 'alter table storyheaven_serial_continuations drop constraint ' || constraint_row.constraint_name;
    end loop;
  end;

  procedure add_check_if_missing(p_name varchar2, p_fragment varchar2, p_ddl varchar2) is
    v_count number;
  begin
    select count(*) into v_count
      from user_constraints
     where table_name = 'STORYHEAVEN_SERIAL_CONTINUATIONS'
       and constraint_type = 'C'
       and (constraint_name = upper(p_name) or upper(search_condition_vc) like p_fragment);
    if v_count = 0 then execute immediate p_ddl; end if;
  end;
begin
  drop_old_check('%SOURCE_EPISODE_NO%BETWEEN 3%299%');
  drop_old_check('%TARGET_EPISODE_NO%BETWEEN 4%300%');
  add_check_if_missing(
    'CHK_SH_SERIAL_CONT_SOURCE_NO',
    '%SOURCE_EPISODE_NO%BETWEEN 1%299%',
    'alter table storyheaven_serial_continuations add constraint chk_sh_serial_cont_source_no check (source_episode_no between 1 and 299)'
  );
  add_check_if_missing(
    'CHK_SH_SERIAL_CONT_TARGET_NO',
    '%TARGET_EPISODE_NO%BETWEEN 2%300%',
    'alter table storyheaven_serial_continuations add constraint chk_sh_serial_cont_target_no check (target_episode_no between 2 and 300)'
  );
end;
/

commit;

prompt StoryHeaven administrator continuation bootstrap migration complete.
