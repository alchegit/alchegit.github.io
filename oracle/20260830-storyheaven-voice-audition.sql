-- StoryHeaven private prose-voice audition stages for new genre/style schedules.
-- Run after 20260809-storyheaven-development-pipeline.sql and
-- 20260809-storyheaven-arc-replanning.sql.

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
        'voice_sample', 'voice_review',
        'build_bible', 'replan_arc', 'build_arc', 'build_episode_card',
        'write_draft', 'editorial_critique', 'editorial_review', 'rewrite_draft'
      )
    )
  ]';
end;
/

commit;

prompt StoryHeaven prose-voice audition migration complete.
