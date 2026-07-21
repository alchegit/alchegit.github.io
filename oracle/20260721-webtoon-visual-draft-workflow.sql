-- Separates low-cost visual drafts from approved final artwork.
-- Run after 20260720-webtoon-panel-version-audit.sql and before deploying the matching API.

whenever sqlerror exit failure rollback

begin
  execute immediate q'[
    alter table webtoon_panel_versions add (
      render_stage varchar2(20) default 'final' not null
        check (render_stage in ('draft', 'final')),
      requested_quality varchar2(20) default 'high' not null
        check (requested_quality in ('low', 'high')),
      is_stage_approved char(1) default 'N' not null
        check (is_stage_approved in ('Y', 'N'))
    )
  ]';
exception
  when others then
    if sqlcode != -1430 then raise; end if;
end;
/

update webtoon_panel_versions
   set render_stage = 'final',
       requested_quality = 'high',
       is_stage_approved = case when is_approved = 'Y' then 'Y' else is_stage_approved end;

begin
  execute immediate 'create index idx_wt_panel_versions_stage on webtoon_panel_versions(project_id, panel_id, render_stage, is_stage_approved, created_at desc)';
exception
  when others then
    if sqlcode != -955 then raise; end if;
end;
/

commit;
