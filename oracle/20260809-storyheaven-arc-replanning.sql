-- StoryHeaven adaptive arc replanning stage.
-- Run after 20260809-storyheaven-development-pipeline.sql.

whenever sqlerror exit failure rollback

begin
  for existing_constraint in (
    select constraint_name
      from user_constraints
     where table_name = 'STORYHEAVEN_SERIAL_JOBS'
       and constraint_type = 'C'
       and lower(search_condition_vc) like '%concept_candidates%'
  ) loop
    execute immediate 'alter table storyheaven_serial_jobs drop constraint '
      || existing_constraint.constraint_name;
  end loop;

  execute immediate q'[
    alter table storyheaven_serial_jobs add constraint chk_sh_serial_job_type check (
      job_type in (
        'concept_candidates', 'concept_selection', 'concept_gate',
        'build_bible', 'replan_arc', 'build_arc', 'build_episode_card',
        'write_draft', 'editorial_critique', 'editorial_review', 'rewrite_draft'
      )
    )
  ]';
end;
/

commit;

prompt StoryHeaven adaptive arc replanning migration complete.
