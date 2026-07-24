-- StoryHeaven phase 5: structured reports, creator notifications, and one appeal.
-- Run after 20260724-storyheaven-round-moderation.sql.

whenever sqlerror exit failure rollback

declare
  procedure create_table_if_missing(p_table varchar2, p_ddl clob) is
    v_count number;
  begin
    select count(*) into v_count from user_tables where table_name = upper(p_table);
    if v_count = 0 then execute immediate p_ddl; end if;
  end;
begin
  create_table_if_missing('STORYHEAVEN_REPORTS', q'[
    create table storyheaven_reports (
      id varchar2(36) primary key,
      story_id varchar2(36) not null references storyheaven_stories(id),
      reporter_user_id varchar2(80) not null references webtoon_profiles(user_id),
      report_category varchar2(30) not null
        check (report_category in ('plagiarism', 'rights', 'impersonation', 'personal_info', 'hate_safety', 'spam', 'other')),
      report_details varchar2(1000 char) not null,
      reference_url varchar2(1000 char),
      report_status varchar2(30) default 'pending' not null
        check (report_status in ('pending', 'reviewing', 'resolved_action', 'dismissed')),
      resolution_note varchar2(1000 char),
      resolved_by varchar2(80) references webtoon_profiles(user_id),
      resolved_at timestamp with time zone,
      created_at timestamp with time zone default systimestamp not null,
      updated_at timestamp with time zone default systimestamp not null,
      constraint uq_sh_report_once unique (story_id, reporter_user_id, report_category)
    )
  ]');

  create_table_if_missing('STORYHEAVEN_NOTIFICATIONS', q'[
    create table storyheaven_notifications (
      id varchar2(36) primary key,
      user_id varchar2(80) not null references webtoon_profiles(user_id),
      story_id varchar2(36) references storyheaven_stories(id),
      report_id varchar2(36) references storyheaven_reports(id),
      notification_type varchar2(30) not null
        check (notification_type in ('report_result', 'appeal_received', 'appeal_result')),
      title varchar2(120 char) not null,
      message varchar2(500 char) not null,
      action_path varchar2(500 char),
      read_at timestamp with time zone,
      created_at timestamp with time zone default systimestamp not null
    )
  ]');

  create_table_if_missing('STORYHEAVEN_APPEALS', q'[
    create table storyheaven_appeals (
      id varchar2(36) primary key,
      report_id varchar2(36) not null references storyheaven_reports(id),
      story_id varchar2(36) not null references storyheaven_stories(id),
      appellant_user_id varchar2(80) not null references webtoon_profiles(user_id),
      appeal_reason varchar2(1000 char) not null,
      appeal_status varchar2(20) default 'pending' not null
        check (appeal_status in ('pending', 'upheld', 'overturned')),
      resolution_note varchar2(1000 char),
      resolved_by varchar2(80) references webtoon_profiles(user_id),
      resolved_at timestamp with time zone,
      created_at timestamp with time zone default systimestamp not null,
      updated_at timestamp with time zone default systimestamp not null,
      constraint uq_sh_report_appeal unique (report_id)
    )
  ]');
end;
/

declare
  procedure create_index_if_missing(p_name varchar2, p_ddl varchar2) is
    v_count number;
  begin
    select count(*) into v_count from user_indexes where index_name = upper(p_name);
    if v_count = 0 then execute immediate p_ddl; end if;
  end;
begin
  create_index_if_missing('IDX_SH_REPORT_QUEUE',
    'create index idx_sh_report_queue on storyheaven_reports(report_status, created_at)');
  create_index_if_missing('IDX_SH_REPORT_STORY',
    'create index idx_sh_report_story on storyheaven_reports(story_id, created_at desc)');
  create_index_if_missing('IDX_SH_NOTIFY_USER',
    'create index idx_sh_notify_user on storyheaven_notifications(user_id, read_at, created_at desc)');
  create_index_if_missing('IDX_SH_APPEAL_QUEUE',
    'create index idx_sh_appeal_queue on storyheaven_appeals(appeal_status, created_at)');
end;
/

commit;

prompt StoryHeaven reports migration complete.
