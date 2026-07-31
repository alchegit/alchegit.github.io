-- StoryHeaven automatic serials: combine one to three primary genres.
-- Existing single-genre schedules are migrated without changing their meaning.

declare
  procedure add_column_if_missing(p_table varchar2, p_column varchar2, p_ddl varchar2) is
    v_count number;
  begin
    select count(*) into v_count
      from user_tab_columns
     where table_name = upper(p_table) and column_name = upper(p_column);
    if v_count = 0 then execute immediate p_ddl; end if;
  end;
begin
  add_column_if_missing('STORYHEAVEN_SERIAL_SCHEDULES', 'PRIMARY_GENRES_JSON',
    'alter table storyheaven_serial_schedules add primary_genres_json clob');
  add_column_if_missing('STORYHEAVEN_SERIAL_SCHEDULES', 'SUBGENRES_BY_GENRE_JSON',
    'alter table storyheaven_serial_schedules add subgenres_by_genre_json clob');
end;
/

update storyheaven_serial_schedules
   set primary_genres_json = nvl(
         primary_genres_json,
         to_clob('["') || primary_genre || to_clob('"]')
       ),
       subgenres_by_genre_json = nvl(
         subgenres_by_genre_json,
         to_clob('{"') || primary_genre || to_clob('":') || subgenres_json || to_clob('}')
       );
/

alter table storyheaven_serial_schedules modify (
  primary_genres_json not null,
  subgenres_by_genre_json not null
);
/

declare
  procedure add_constraint_if_missing(p_name varchar2, p_ddl varchar2) is
    v_count number;
  begin
    select count(*) into v_count from user_constraints where constraint_name = upper(p_name);
    if v_count = 0 then execute immediate p_ddl; end if;
  end;
begin
  add_constraint_if_missing('CHK_SH_SERIAL_PRIMARY_GENRES_JSON', q'[
    alter table storyheaven_serial_schedules add constraint chk_sh_serial_primary_genres_json
      check (primary_genres_json is json)
  ]');
  add_constraint_if_missing('CHK_SH_SERIAL_SUBGENRES_MAP_JSON', q'[
    alter table storyheaven_serial_schedules add constraint chk_sh_serial_subgenres_map_json
      check (subgenres_by_genre_json is json)
  ]');
end;
/

commit;
