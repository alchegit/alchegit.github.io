-- StoryHeaven separated development and independent editorial critique stages.
-- Run after 20260731-storyheaven-serial-engine.sql.

whenever sqlerror exit failure rollback

declare
  v_constraint_name user_constraints.constraint_name%type;
begin
  begin
    select constraint_name into v_constraint_name
      from user_constraints
     where table_name = 'STORYHEAVEN_SERIAL_JOBS'
       and constraint_type = 'C'
       and lower(search_condition_vc) like '%concept_gate%'
       and rownum = 1;
    execute immediate 'alter table storyheaven_serial_jobs drop constraint ' || v_constraint_name;
  exception
    when no_data_found then null;
  end;

  execute immediate q'[
    alter table storyheaven_serial_jobs add constraint chk_sh_serial_job_type check (
      job_type in (
        'concept_candidates', 'concept_selection', 'concept_gate',
        'build_bible', 'build_arc', 'build_episode_card',
        'write_draft', 'editorial_critique', 'editorial_review', 'rewrite_draft'
      )
    )
  ]';
end;
/

commit;

prompt StoryHeaven separated development pipeline migration complete.
