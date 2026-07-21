-- Adds server-side panel version and QC audit records without deleting project JSON history.
-- Run after webtoon-platform-oracle.sql on an existing Oracle 19c installation.

whenever sqlerror exit failure rollback

begin
  execute immediate q'[
    create table webtoon_panel_versions (
      version_key varchar2(300) primary key,
      project_id varchar2(36) not null references webtoon_projects(id),
      panel_id varchar2(120) not null,
      version_id varchar2(120) not null,
      parent_version_id varchar2(120),
      source_asset_id varchar2(500),
      prompt_package_id varchar2(120),
      edit_target varchar2(40),
      mask_asset_id varchar2(160),
      version_status varchar2(30) not null check (version_status in ('candidate', 'approved', 'needs-fix', 'superseded')),
      is_approved char(1) default 'N' not null check (is_approved in ('Y', 'N')),
      metadata_json clob not null check (metadata_json is json),
      created_at timestamp with time zone default systimestamp not null,
      updated_at timestamp with time zone default systimestamp not null,
      unique (project_id, panel_id, version_id)
    )
  ]';
exception
  when others then
    if sqlcode != -955 then raise; end if;
end;
/

begin
  execute immediate 'create index idx_wt_panel_versions_lookup on webtoon_panel_versions(project_id, panel_id, is_approved, created_at desc)';
exception
  when others then
    if sqlcode != -955 then raise; end if;
end;
/

begin
  execute immediate q'[
    create table webtoon_panel_qc_issues (
      id varchar2(36) primary key,
      version_key varchar2(300) not null references webtoon_panel_versions(version_key),
      project_id varchar2(36) not null references webtoon_projects(id),
      panel_id varchar2(120) not null,
      severity varchar2(20) default 'warning' not null check (severity in ('info', 'warning', 'error', 'critical')),
      category varchar2(80),
      issue_json clob not null check (issue_json is json),
      created_at timestamp with time zone default systimestamp not null
    )
  ]';
exception
  when others then
    if sqlcode != -955 then raise; end if;
end;
/

begin
  execute immediate 'create index idx_wt_panel_qc_lookup on webtoon_panel_qc_issues(project_id, panel_id, version_key)';
exception
  when others then
    if sqlcode != -955 then raise; end if;
end;
/

create or replace trigger trg_wt_panel_versions_bu
before update on webtoon_panel_versions
for each row
begin
  :new.updated_at := systimestamp;
end;
/

commit;
