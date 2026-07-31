-- StoryHeaven genre blueprint, narrative technique and evidence-based review extension.
-- Run after 20260731-storyheaven-serial-engine.sql.

whenever sqlerror exit failure rollback

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
  add_column_if_missing('STORYHEAVEN_SERIAL_SCHEDULES', 'PRIMARY_GENRE',
    'alter table storyheaven_serial_schedules add primary_genre varchar2(40 char)');
  add_column_if_missing('STORYHEAVEN_SERIAL_SCHEDULES', 'SUBGENRES_JSON',
    'alter table storyheaven_serial_schedules add subgenres_json clob');
  add_column_if_missing('STORYHEAVEN_SERIAL_SCHEDULES', 'PUBLICATION_MODE',
    'alter table storyheaven_serial_schedules add publication_mode varchar2(20 char)');
  add_column_if_missing('STORYHEAVEN_SERIAL_BIBLES', 'NARRATIVE_BLUEPRINT_JSON',
    'alter table storyheaven_serial_bibles add narrative_blueprint_json clob');
  add_column_if_missing('STORYHEAVEN_SERIAL_ARCS', 'NARRATIVE_PLAN_JSON',
    'alter table storyheaven_serial_arcs add narrative_plan_json clob');
  add_column_if_missing('STORYHEAVEN_EPISODE_CARDS', 'TECHNIQUE_PLAN_JSON',
    'alter table storyheaven_episode_cards add technique_plan_json clob');
  add_column_if_missing('STORYHEAVEN_EDITORIAL_REVIEWS', 'SCORE_EVIDENCE_JSON',
    'alter table storyheaven_editorial_reviews add score_evidence_json clob');
  add_column_if_missing('STORYHEAVEN_EDITORIAL_REVIEWS', 'AUDIENCE_LENSES_JSON',
    'alter table storyheaven_editorial_reviews add audience_lenses_json clob');
end;
/

update storyheaven_serial_schedules
   set primary_genre = nvl(primary_genre, 'fantasy'),
       subgenres_json = nvl(subgenres_json, to_clob('["modern-fantasy"]')),
       publication_mode = nvl(publication_mode, 'test_private');

update storyheaven_serial_bibles
   set narrative_blueprint_json = nvl(narrative_blueprint_json, to_clob('{}'));
update storyheaven_serial_arcs
   set narrative_plan_json = nvl(narrative_plan_json, to_clob('{}'));
update storyheaven_episode_cards
   set technique_plan_json = nvl(technique_plan_json, to_clob('{}'));
update storyheaven_editorial_reviews
   set score_evidence_json = nvl(score_evidence_json, to_clob('{}')),
       audience_lenses_json = nvl(audience_lenses_json, to_clob('[]'));

alter table storyheaven_serial_schedules modify (
  primary_genre not null,
  subgenres_json not null,
  publication_mode default 'test_private' not null
);
alter table storyheaven_serial_bibles modify (narrative_blueprint_json not null);
alter table storyheaven_serial_arcs modify (narrative_plan_json not null);
alter table storyheaven_episode_cards modify (technique_plan_json not null);
alter table storyheaven_editorial_reviews modify (
  score_evidence_json not null,
  audience_lenses_json not null
);

declare
  procedure add_constraint_if_missing(p_name varchar2, p_ddl varchar2) is
    v_count number;
  begin
    select count(*) into v_count from user_constraints where constraint_name = upper(p_name);
    if v_count = 0 then execute immediate p_ddl; end if;
  end;
begin
  add_constraint_if_missing('CHK_SH_SERIAL_PRIMARY_GENRE', q'[
    alter table storyheaven_serial_schedules add constraint chk_sh_serial_primary_genre
      check (primary_genre in ('fantasy', 'romance', 'mystery-thriller', 'sf', 'horror', 'action-adventure', 'drama', 'historical', 'comedy'))
  ]');
  add_constraint_if_missing('CHK_SH_SERIAL_PUBLICATION_MODE', q'[
    alter table storyheaven_serial_schedules add constraint chk_sh_serial_publication_mode
      check (publication_mode in ('test_private', 'auto_public'))
  ]');
  add_constraint_if_missing('CHK_SH_SERIAL_SUBGENRES_JSON', q'[
    alter table storyheaven_serial_schedules add constraint chk_sh_serial_subgenres_json check (subgenres_json is json)
  ]');
  add_constraint_if_missing('CHK_SH_SERIAL_NARRATIVE_JSON', q'[
    alter table storyheaven_serial_bibles add constraint chk_sh_serial_narrative_json check (narrative_blueprint_json is json)
  ]');
  add_constraint_if_missing('CHK_SH_SERIAL_ARC_NARRATIVE', q'[
    alter table storyheaven_serial_arcs add constraint chk_sh_serial_arc_narrative check (narrative_plan_json is json)
  ]');
  add_constraint_if_missing('CHK_SH_SERIAL_TECHNIQUE_JSON', q'[
    alter table storyheaven_episode_cards add constraint chk_sh_serial_technique_json check (technique_plan_json is json)
  ]');
  add_constraint_if_missing('CHK_SH_SERIAL_SCORE_EVIDENCE', q'[
    alter table storyheaven_editorial_reviews add constraint chk_sh_serial_score_evidence check (score_evidence_json is json)
  ]');
  add_constraint_if_missing('CHK_SH_SERIAL_AUDIENCE_LENSES', q'[
    alter table storyheaven_editorial_reviews add constraint chk_sh_serial_audience_lenses check (audience_lenses_json is json)
  ]');
end;
/

commit;

prompt StoryHeaven serial narrative DNA migration complete.
