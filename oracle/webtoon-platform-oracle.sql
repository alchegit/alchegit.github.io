-- NeoKIM Webtoon Studio schema for Oracle 19c.
-- Target: EENTA_REPO3 / ORAHOON schema.
-- Run as the application schema user. This script is intentionally free of passwords.

whenever sqlerror exit failure rollback

create table webtoon_profiles (
  user_id varchar2(80) primary key,
  email varchar2(320),
  display_name varchar2(200),
  is_admin char(1) default 'N' not null check (is_admin in ('Y', 'N')),
  account_type varchar2(20) default 'human' not null check (account_type in ('human', 'system_ai', 'admin')),
  nickname varchar2(80 char),
  nickname_normalized varchar2(120 char),
  nickname_status varchar2(20) default 'temporary' not null check (nickname_status in ('temporary', 'active', 'restricted')),
  nickname_changed_at timestamp with time zone,
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

create unique index uq_wt_nickname_normalized
  on webtoon_profiles(nickname_normalized);

create table storyheaven_nickname_history (
  id varchar2(36) primary key,
  user_id varchar2(80) not null references webtoon_profiles(user_id),
  nickname varchar2(80 char) not null,
  nickname_normalized varchar2(120 char) not null,
  change_source varchar2(30) default 'user' not null check (change_source in ('user', 'admin', 'migration')),
  changed_at timestamp with time zone default systimestamp not null,
  reserved_until timestamp with time zone not null
);

create index idx_sh_nickname_hold
  on storyheaven_nickname_history(nickname_normalized, reserved_until desc);

create table storyheaven_reserved_names (
  nickname_normalized varchar2(120 char) primary key,
  reason varchar2(120 char) default 'protected' not null,
  created_at timestamp with time zone default systimestamp not null
);

create table storyheaven_stories (
  id varchar2(36) primary key,
  slug varchar2(120 char) not null unique,
  author_user_id varchar2(80) not null references webtoon_profiles(user_id),
  title varchar2(80 char) not null,
  logline varchar2(220 char) not null,
  public_synopsis clob,
  protagonist_goal varchar2(500 char),
  obstacle_stakes varchar2(500 char),
  genre varchar2(40 char) default '현대판타지' not null,
  secondary_genre varchar2(40 char),
  tags_json clob check (tags_json is json),
  content_rating varchar2(20) default 'all' not null check (content_rating in ('all', 'teen', 'adult')),
  rating_detail varchar2(10) default 'all' not null check (rating_detail in ('all', '12', '15')),
  content_origin varchar2(30) default 'human' not null check (content_origin in ('human', 'human_ai_assisted', 'ai_seed', 'admin_seed')),
  competition_eligible char(1) default 'Y' not null check (competition_eligible in ('Y', 'N')),
  ai_disclosure_version varchar2(40),
  cover_path varchar2(1000 char),
  story_status varchar2(30) default 'draft' not null check (story_status in ('draft', 'published', 'archived', 'moderation')),
  current_revision_no number(6) default 0 not null,
  submitted_revision_no number(6),
  submitted_at timestamp with time zone,
  reviewed_at timestamp with time zone,
  reviewed_by varchar2(80),
  review_decision varchar2(30) default 'none' not null check (review_decision in ('none', 'pending', 'approved', 'changes_requested', 'rejected')),
  review_note varchar2(1000 char),
  eligibility_score number(3) check (eligibility_score between 0 and 100),
  rights_confirmed char(1) default 'N' not null check (rights_confirmed in ('Y', 'N')),
  adult_confirmed char(1) default 'N' not null check (adult_confirmed in ('Y', 'N')),
  published_at timestamp with time zone,
  created_at timestamp with time zone default systimestamp not null,
  updated_at timestamp with time zone default systimestamp not null
);

create index idx_sh_stories_feed
  on storyheaven_stories(story_status, published_at desc);

create index idx_sh_stories_author
  on storyheaven_stories(author_user_id, updated_at desc);

create index idx_sh_moderation_queue
  on storyheaven_stories(story_status, submitted_at);

create table storyheaven_revisions (
  id varchar2(36) primary key,
  story_id varchar2(36) not null references storyheaven_stories(id),
  revision_no number(6) not null,
  actor_user_id varchar2(80) not null references webtoon_profiles(user_id),
  revision_kind varchar2(20) default 'draft' not null check (revision_kind in ('draft', 'submit', 'review')),
  packet_json clob not null check (packet_json is json),
  content_hash varchar2(64) not null,
  created_at timestamp with time zone default systimestamp not null,
  constraint uq_sh_revision_no unique (story_id, revision_no)
);

create index idx_sh_revision_story
  on storyheaven_revisions(story_id, revision_no desc);

create table storyheaven_consents (
  id varchar2(36) primary key,
  story_id varchar2(36) not null references storyheaven_stories(id),
  user_id varchar2(80) not null references webtoon_profiles(user_id),
  consent_type varchar2(30) not null check (consent_type in ('display', 'originality', 'adult', 'training', 'adaptation')),
  document_version varchar2(40) not null,
  accepted char(1) default 'Y' not null check (accepted in ('Y', 'N')),
  content_hash varchar2(64) not null,
  accepted_at timestamp with time zone default systimestamp not null,
  constraint uq_sh_consent unique (story_id, user_id, consent_type, document_version)
);

create table storyheaven_activity (
  id varchar2(36) primary key,
  story_id varchar2(36) references storyheaven_stories(id),
  actor_user_id varchar2(80) references webtoon_profiles(user_id),
  activity_type varchar2(40) not null,
  from_status varchar2(30),
  to_status varchar2(30),
  details_json clob check (details_json is json),
  created_at timestamp with time zone default systimestamp not null
);

create index idx_sh_activity_story
  on storyheaven_activity(story_id, created_at desc);

create table storyheaven_rounds (
  id varchar2(36) primary key,
  round_key varchar2(30) not null unique,
  round_type varchar2(20) default 'weekly' not null check (round_type in ('weekly', 'runoff')),
  parent_round_id varchar2(36) references storyheaven_rounds(id),
  starts_at timestamp with time zone not null,
  submission_cutoff_at timestamp with time zone not null,
  voting_ends_at timestamp with time zone not null,
  audit_deadline_at timestamp with time zone not null,
  result_at timestamp with time zone not null,
  round_status varchar2(20) default 'scheduled' not null check (round_status in ('scheduled', 'open', 'auditing', 'tie_pending', 'confirmed', 'closed')),
  winner_story_id varchar2(36) references storyheaven_stories(id),
  results_json clob check (results_json is json),
  created_at timestamp with time zone default systimestamp not null,
  updated_at timestamp with time zone default systimestamp not null
);

create index idx_sh_round_status
  on storyheaven_rounds(round_status, starts_at desc);

create table storyheaven_entries (
  id varchar2(36) primary key,
  round_id varchar2(36) not null references storyheaven_rounds(id),
  story_id varchar2(36) not null references storyheaven_stories(id),
  author_user_id varchar2(80) not null references webtoon_profiles(user_id),
  entry_status varchar2(20) default 'candidate' not null check (entry_status in ('candidate', 'withdrawn', 'disqualified', 'winner', 'runner_up')),
  eligibility_score number(3) not null check (eligibility_score between 65 and 100),
  approved_at timestamp with time zone default systimestamp not null,
  final_rank number(4),
  vote_count_snapshot number(10),
  disqualification_reason varchar2(500 char),
  disqualified_at timestamp with time zone,
  disqualified_by varchar2(80) references webtoon_profiles(user_id),
  created_at timestamp with time zone default systimestamp not null,
  updated_at timestamp with time zone default systimestamp not null,
  constraint uq_sh_entry_story unique (round_id, story_id),
  constraint uq_sh_entry_author unique (round_id, author_user_id)
);

create index idx_sh_entry_rank
  on storyheaven_entries(round_id, entry_status, vote_count_snapshot desc);

create table storyheaven_votes (
  id varchar2(36) primary key,
  round_id varchar2(36) not null references storyheaven_rounds(id),
  story_id varchar2(36) not null references storyheaven_stories(id),
  voter_user_id varchar2(80) not null references webtoon_profiles(user_id),
  active char(1) default 'Y' not null check (active in ('Y', 'N')),
  cast_at timestamp with time zone default systimestamp not null,
  canceled_at timestamp with time zone,
  invalidated_at timestamp with time zone,
  invalidated_by varchar2(80) references webtoon_profiles(user_id),
  invalidation_reason varchar2(500 char),
  constraint uq_sh_round_vote unique (round_id, story_id, voter_user_id)
);

create index idx_sh_vote_count
  on storyheaven_votes(round_id, story_id, active);

create index idx_sh_vote_voter
  on storyheaven_votes(voter_user_id, cast_at desc);

create table storyheaven_vote_audit (
  id varchar2(36) primary key,
  vote_id varchar2(36) references storyheaven_votes(id),
  round_id varchar2(36) not null references storyheaven_rounds(id),
  story_id varchar2(36) not null references storyheaven_stories(id),
  voter_user_id varchar2(80) references webtoon_profiles(user_id),
  actor_user_id varchar2(80) references webtoon_profiles(user_id),
  event_type varchar2(20) not null check (event_type in ('cast', 'cancel', 'restore', 'invalidate')),
  signal_hash varchar2(64),
  signal_expires_at timestamp with time zone,
  details_json clob check (details_json is json),
  created_at timestamp with time zone default systimestamp not null
);

create index idx_sh_vote_audit
  on storyheaven_vote_audit(round_id, created_at desc);

create table storyheaven_reports (
  id varchar2(36) primary key,
  story_id varchar2(36) not null references storyheaven_stories(id),
  reporter_user_id varchar2(80) not null references webtoon_profiles(user_id),
  report_category varchar2(30) not null check (report_category in ('plagiarism', 'rights', 'impersonation', 'personal_info', 'hate_safety', 'spam', 'other')),
  report_details varchar2(1000 char) not null,
  reference_url varchar2(1000 char),
  report_status varchar2(30) default 'pending' not null check (report_status in ('pending', 'reviewing', 'resolved_action', 'dismissed')),
  resolution_note varchar2(1000 char),
  resolved_by varchar2(80) references webtoon_profiles(user_id),
  resolved_at timestamp with time zone,
  created_at timestamp with time zone default systimestamp not null,
  updated_at timestamp with time zone default systimestamp not null,
  constraint uq_sh_report_once unique (story_id, reporter_user_id, report_category)
);

create index idx_sh_report_queue
  on storyheaven_reports(report_status, created_at);

create index idx_sh_report_story
  on storyheaven_reports(story_id, created_at desc);

create table storyheaven_notifications (
  id varchar2(36) primary key,
  user_id varchar2(80) not null references webtoon_profiles(user_id),
  story_id varchar2(36) references storyheaven_stories(id),
  report_id varchar2(36) references storyheaven_reports(id),
  notification_type varchar2(30) not null check (notification_type in ('report_result', 'appeal_received', 'appeal_result')),
  title varchar2(120 char) not null,
  message varchar2(500 char) not null,
  action_path varchar2(500 char),
  read_at timestamp with time zone,
  created_at timestamp with time zone default systimestamp not null
);

create index idx_sh_notify_user
  on storyheaven_notifications(user_id, read_at, created_at desc);

create table storyheaven_appeals (
  id varchar2(36) primary key,
  report_id varchar2(36) not null references storyheaven_reports(id),
  story_id varchar2(36) not null references storyheaven_stories(id),
  appellant_user_id varchar2(80) not null references webtoon_profiles(user_id),
  appeal_reason varchar2(1000 char) not null,
  appeal_status varchar2(20) default 'pending' not null check (appeal_status in ('pending', 'upheld', 'overturned')),
  resolution_note varchar2(1000 char),
  resolved_by varchar2(80) references webtoon_profiles(user_id),
  resolved_at timestamp with time zone,
  created_at timestamp with time zone default systimestamp not null,
  updated_at timestamp with time zone default systimestamp not null,
  constraint uq_sh_report_appeal unique (report_id)
);

create index idx_sh_appeal_queue
  on storyheaven_appeals(appeal_status, created_at);

create table storyheaven_likes (
  story_id varchar2(36) not null references storyheaven_stories(id),
  user_id varchar2(80) not null references webtoon_profiles(user_id),
  created_at timestamp with time zone default systimestamp not null,
  primary key (story_id, user_id)
);

create index idx_sh_likes_created
  on storyheaven_likes(story_id, created_at desc);

create table storyheaven_endorsements (
  story_id varchar2(36) primary key references storyheaven_stories(id),
  admin_user_id varchar2(80) not null references webtoon_profiles(user_id),
  endorsement_level number(1) default 1 not null check (endorsement_level between 1 and 3),
  public_reason varchar2(180 char),
  created_at timestamp with time zone default systimestamp not null,
  updated_at timestamp with time zone default systimestamp not null
);

create table storyheaven_ai_personas (
  id varchar2(36) primary key,
  author_user_id varchar2(80) not null references webtoon_profiles(user_id),
  pen_name varchar2(80 char) not null,
  voice_profile_json clob not null check (voice_profile_json is json),
  persona_status varchar2(20) default 'active' not null check (persona_status in ('active', 'paused', 'retired')),
  created_at timestamp with time zone default systimestamp not null,
  updated_at timestamp with time zone default systimestamp not null
);

create table storyheaven_provenance (
  id varchar2(36) primary key,
  story_id varchar2(36) not null references storyheaven_stories(id),
  producer_type varchar2(30) not null check (producer_type in ('human', 'human_ai_assisted', 'system_ai', 'admin')),
  generator_name varchar2(120 char),
  disclosure_text varchar2(500 char) not null,
  metadata_json clob check (metadata_json is json),
  created_at timestamp with time zone default systimestamp not null
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
  parent_job_id varchar2(36) references webtoon_generation_jobs(id),
  panel_id varchar2(120),
  prompt_package_id varchar2(120),
  attempt number(4) default 1 not null check (attempt between 1 and 99),
  job_type varchar2(60) not null check (job_type in ('draft_generation', 'episode_generation', 'panel_generation', 'panel_regenerate')),
  scenario_key varchar2(100),
  cost number(10) default 0 not null check (
    (job_type in ('draft_generation', 'episode_generation') and cost = 3)
    or (job_type = 'panel_generation' and cost = 0)
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

create index idx_wt_jobs_parent
  on webtoon_generation_jobs(parent_job_id, status, created_at);

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
  render_stage varchar2(20) default 'final' not null check (render_stage in ('draft', 'final')),
  requested_quality varchar2(20) default 'high' not null check (requested_quality in ('low', 'high')),
  version_status varchar2(30) not null check (version_status in ('candidate', 'approved', 'needs-fix', 'superseded')),
  is_approved char(1) default 'N' not null check (is_approved in ('Y', 'N')),
  is_stage_approved char(1) default 'N' not null check (is_stage_approved in ('Y', 'N')),
  metadata_json clob not null check (metadata_json is json),
  created_at timestamp with time zone default systimestamp not null,
  updated_at timestamp with time zone default systimestamp not null,
  unique (project_id, panel_id, version_id)
);

create index idx_wt_panel_versions_lookup
  on webtoon_panel_versions(project_id, panel_id, is_approved, created_at desc);

create index idx_wt_panel_versions_stage
  on webtoon_panel_versions(project_id, panel_id, render_stage, is_stage_approved, created_at desc);

create table webtoon_panel_qc_issues (
  id varchar2(36) primary key,
  version_key varchar2(300) not null references webtoon_panel_versions(version_key),
  project_id varchar2(36) not null references webtoon_projects(id),
  panel_id varchar2(120) not null,
  severity varchar2(20) default 'warning' not null check (severity in ('info', 'warning', 'error', 'critical')),
  category varchar2(80),
  issue_json clob not null check (issue_json is json),
  created_at timestamp with time zone default systimestamp not null
);

create index idx_wt_panel_qc_lookup
  on webtoon_panel_qc_issues(project_id, panel_id, version_key);

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

create or replace trigger trg_wt_panel_versions_bu
before update on webtoon_panel_versions
for each row
begin
  :new.updated_at := systimestamp;
end;
/

commit;
