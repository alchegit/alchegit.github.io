-- Apply once to an existing NeoKIM Webtoon Studio Oracle schema.
-- Aligns persisted story capacity with the 3,000-character application limit.

whenever sqlerror exit failure rollback

declare
  v_data_type user_tab_columns.data_type%type;
begin
  select data_type
    into v_data_type
    from user_tab_columns
   where table_name = 'WEBTOON_PROJECTS'
     and column_name = 'IDEA';

  if v_data_type <> 'CLOB' then
    execute immediate 'alter table webtoon_projects add (idea_clob clob)';
    execute immediate 'update webtoon_projects set idea_clob = to_clob(idea)';
    execute immediate 'alter table webtoon_projects drop column idea';
    execute immediate 'alter table webtoon_projects rename column idea_clob to idea';
  end if;
end;
/

update webtoon_projects
   set title = substr(title, 1, 60)
 where length(title) > 60;

alter table webtoon_projects modify (title varchar2(60 char));

update webtoon_generation_jobs
   set error_message = substr(error_message, 1, 1000)
 where length(error_message) > 1000;

alter table webtoon_generation_jobs modify (error_message varchar2(1000 char));

commit;
