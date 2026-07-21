-- Cut-level generation jobs for the AI-assisted webtoon pipeline.
-- Run once on an existing EENTA_REPO3 schema after webtoon-platform-oracle.sql.

whenever sqlerror exit failure rollback

declare
  procedure add_column_if_missing(p_sql varchar2) is
  begin
    execute immediate p_sql;
  exception
    when others then
      if sqlcode != -1430 then raise; end if;
  end;
begin
  add_column_if_missing('alter table webtoon_generation_jobs add parent_job_id varchar2(36)');
  add_column_if_missing('alter table webtoon_generation_jobs add panel_id varchar2(120)');
  add_column_if_missing('alter table webtoon_generation_jobs add prompt_package_id varchar2(120)');
  add_column_if_missing('alter table webtoon_generation_jobs add attempt number(4) default 1 not null');
end;
/

begin
  execute immediate 'alter table webtoon_generation_jobs add constraint fk_wt_jobs_parent foreign key (parent_job_id) references webtoon_generation_jobs(id)';
exception
  when others then
    if sqlcode not in (-2264, -2275) then raise; end if;
end;
/

declare
begin
  for item in (
    select constraint_name
      from user_constraints
     where table_name = 'WEBTOON_GENERATION_JOBS'
       and constraint_type = 'C'
       and (
         upper(search_condition_vc) like '%JOB_TYPE%'
         or upper(search_condition_vc) like '%COST%'
       )
       and upper(search_condition_vc) not like '%IS NOT NULL%'
  ) loop
    execute immediate 'alter table webtoon_generation_jobs drop constraint ' || dbms_assert.simple_sql_name(item.constraint_name);
  end loop;
end;
/

begin
  for item in (
    select column_name
      from user_tab_columns
     where table_name = 'WEBTOON_GENERATION_JOBS'
       and column_name in ('JOB_TYPE', 'COST', 'ATTEMPT')
       and nullable = 'Y'
  ) loop
    execute immediate 'alter table webtoon_generation_jobs modify ('
      || dbms_assert.simple_sql_name(item.column_name)
      || ' not null)';
  end loop;
end;
/

alter table webtoon_generation_jobs add constraint ck_wt_jobs_type
  check (job_type in ('draft_generation', 'episode_generation', 'panel_generation', 'panel_regenerate'));

alter table webtoon_generation_jobs add constraint ck_wt_jobs_cost
  check (
    (job_type in ('draft_generation', 'episode_generation') and cost = 3)
    or (job_type = 'panel_generation' and cost = 0)
    or (job_type = 'panel_regenerate' and cost = 1)
  );

begin
  execute immediate 'alter table webtoon_generation_jobs add constraint ck_wt_jobs_attempt check (attempt between 1 and 99)';
exception
  when others then
    if sqlcode != -2264 then raise; end if;
end;
/

begin
  execute immediate 'create index idx_wt_jobs_parent on webtoon_generation_jobs(parent_job_id, status, created_at)';
exception
  when others then
    if sqlcode != -955 then raise; end if;
end;
/

commit;
