-- Public StoryHeaven and Webtoon view counters.
-- Repeated page visits are counted. Authenticated administrators are excluded by the API.

declare
  v_count number;

  procedure add_column_if_missing(p_table varchar2, p_column varchar2, p_ddl varchar2) is
  begin
    select count(*) into v_count
      from user_tab_columns
     where table_name = upper(p_table)
       and column_name = upper(p_column);
    if v_count = 0 then execute immediate p_ddl; end if;
  end;
begin
  add_column_if_missing(
    'STORYHEAVEN_STORIES',
    'VIEW_COUNT',
    'alter table storyheaven_stories add (view_count number(19) default 0 not null)'
  );
  add_column_if_missing(
    'STORYHEAVEN_EPISODES',
    'VIEW_COUNT',
    'alter table storyheaven_episodes add (view_count number(19) default 0 not null)'
  );
  add_column_if_missing(
    'WEBTOON_PROJECTS',
    'VIEW_COUNT',
    'alter table webtoon_projects add (view_count number(19) default 0 not null)'
  );
end;
/

commit;
