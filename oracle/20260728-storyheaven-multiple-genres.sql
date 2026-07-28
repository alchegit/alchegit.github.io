-- StoryHeaven: persist up to five user-entered genres while keeping legacy columns.
-- Run after 20260724-storyheaven-submissions.sql on EENTA_REPO3 / ORAHOON.

whenever sqlerror exit failure rollback

declare
  v_count number;
begin
  select count(*) into v_count
    from user_tab_columns
   where table_name = 'STORYHEAVEN_STORIES'
     and column_name = 'GENRES_JSON';

  if v_count = 0 then
    execute immediate q'[alter table storyheaven_stories add (genres_json clob check (genres_json is json))]';
  end if;
end;
/

update storyheaven_stories
   set genres_json = case
     when secondary_genre is not null then json_array(genre, secondary_genre returning clob)
     else json_array(genre returning clob)
   end
 where genres_json is null;

commit;
