-- NeoKIM Webtoon Studio schema for Oracle 19c.
-- Target: EENTA_REPO3 / ORAHOON schema.
-- Run as the application schema user. This script is intentionally free of passwords.

whenever sqlerror exit failure rollback

create table webtoon_profiles (
  user_id varchar2(80) primary key,
  email varchar2(320),
  display_name varchar2(200),
  is_admin char(1) default 'N' not null check (is_admin in ('Y', 'N')),
  acorns number(10) default 0 not null check (acorns >= 0),
  account_status varchar2(20) default 'active' not null check (account_status in ('active', 'banned')),
  banned_at timestamp with time zone,
  ban_reason varchar2(500 char),
  last_seen_at timestamp with time zone,
  login_count number(10) default 0 not null check (login_count >= 0),
  last_ip_hash varchar2(64),
  last_user_agent varchar2(80),
  guide_completed char(1) default 'N' not null check (guide_completed in ('Y', 'N')),
  profile_json clob check (profile_json is json),
  created_at timestamp with time zone default systimestamp not null,
  updated_at timestamp with time zone default systimestamp not null
);

create table webtoon_acorn_ledger (
  id varchar2(36) primary key,
  user_id varchar2(80) not null references webtoon_profiles(user_id),
  delta number(10) not null,
  balance_after number(10) not null,
  reason varchar2(60) not null,
  ref_type varchar2(60),
  ref_id varchar2(80),
  metadata_json clob check (metadata_json is json),
  created_at timestamp with time zone default systimestamp not null
);

create index idx_wt_acorn_user_created
  on webtoon_acorn_ledger(user_id, created_at desc);

create table webtoon_daily_acorn_claims (
  user_id varchar2(80) not null references webtoon_profiles(user_id),
  claim_date date not null,
  amount number(10) default 5 not null,
  created_at timestamp with time zone default systimestamp not null,
  primary key (user_id, claim_date)
);

create table webtoon_projects (
  id varchar2(36) primary key,
  user_id varchar2(80) not null references webtoon_profiles(user_id),
  title varchar2(60 char) not null,
  idea clob,
  genre varchar2(80) default 'modern-awakening' not null,
  panels_json clob check (panels_json is json),
  project_json clob check (project_json is json),
  status varchar2(40) default 'draft' not null check (status in ('draft', 'archived', 'published')),
  is_public char(1) default 'N' not null check (is_public in ('Y', 'N')),
  created_at timestamp with time zone default systimestamp not null,
  updated_at timestamp with time zone default systimestamp not null
);

create index idx_wt_projects_public_updated
  on webtoon_projects(is_public, updated_at desc);

create index idx_wt_projects_user_updated
  on webtoon_projects(user_id, updated_at desc);

create table webtoon_generation_jobs (
  id varchar2(36) primary key,
  user_id varchar2(80) not null references webtoon_profiles(user_id),
  project_id varchar2(36) references webtoon_projects(id),
  job_type varchar2(60) not null check (job_type in ('draft_generation', 'panel_regenerate')),
  scenario_key varchar2(100),
  cost number(10) default 0 not null check (
    (job_type = 'draft_generation' and cost = 3)
    or (job_type = 'panel_regenerate' and cost = 1)
  ),
  status varchar2(30) default 'ready' not null check (status in ('ready', 'running', 'done', 'failed', 'canceled')),
  progress number(3) default 0 not null check (progress between 0 and 100),
  request_payload clob check (request_payload is json),
  result_payload clob check (result_payload is json),
  error_message varchar2(1000 char),
  created_at timestamp with time zone default systimestamp not null,
  updated_at timestamp with time zone default systimestamp not null
);

create index idx_wt_jobs_status_created
  on webtoon_generation_jobs(status, created_at);

create index idx_wt_jobs_user_created
  on webtoon_generation_jobs(user_id, created_at desc);

create table webtoon_assets (
  id varchar2(36) primary key,
  user_id varchar2(80) not null references webtoon_profiles(user_id),
  project_id varchar2(36) references webtoon_projects(id),
  job_id varchar2(36) references webtoon_generation_jobs(id),
  panel_id varchar2(120),
  file_name varchar2(260) not null,
  mime_type varchar2(120) not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  file_size number(18) not null check (file_size between 1 and 12582912),
  sha256 varchar2(64) not null,
  storage_path varchar2(1000) not null,
  public_path varchar2(1000),
  width number(10),
  height number(10),
  metadata_json clob check (metadata_json is json),
  created_at timestamp with time zone default systimestamp not null,
  updated_at timestamp with time zone default systimestamp not null
);

create index idx_wt_assets_project_panel
  on webtoon_assets(project_id, panel_id, created_at desc);

create index idx_wt_assets_sha
  on webtoon_assets(sha256);

create table webtoon_asset_versions (
  id varchar2(36) primary key,
  asset_id varchar2(36) not null references webtoon_assets(id),
  version_no number(10) not null,
  storage_path varchar2(1000) not null,
  public_path varchar2(1000),
  metadata_json clob check (metadata_json is json),
  created_at timestamp with time zone default systimestamp not null,
  unique (asset_id, version_no)
);

create table webtoon_security_events (
  id varchar2(36) primary key,
  user_id varchar2(80),
  event_type varchar2(60) not null,
  severity varchar2(10) default 'info' not null check (severity in ('info', 'warn', 'high')),
  ip_hash varchar2(64),
  user_agent_category varchar2(80),
  details_json clob check (details_json is json),
  created_at timestamp with time zone default systimestamp not null,
  expires_at timestamp with time zone default (systimestamp + interval '30' day) not null
);

create index idx_wt_security_created
  on webtoon_security_events(created_at desc);

create index idx_wt_security_user_created
  on webtoon_security_events(user_id, created_at desc);

create or replace trigger trg_wt_profiles_bu
before update on webtoon_profiles
for each row
begin
  :new.updated_at := systimestamp;
end;
/

create or replace trigger trg_wt_projects_bu
before update on webtoon_projects
for each row
begin
  :new.updated_at := systimestamp;
end;
/

create or replace trigger trg_wt_jobs_bu
before update on webtoon_generation_jobs
for each row
begin
  :new.updated_at := systimestamp;
end;
/

create or replace trigger trg_wt_assets_bu
before update on webtoon_assets
for each row
begin
  :new.updated_at := systimestamp;
end;
/

commit;
