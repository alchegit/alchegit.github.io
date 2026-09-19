whenever sqlerror exit failure rollback
declare
  v_count number;
begin
  select count(*) into v_count from user_tables where table_name = 'STORYHEAVEN_COMMENT_REPORTS';
  if v_count = 0 then
    execute immediate q'[
      create table storyheaven_comment_reports (
        id varchar2(36) primary key,
        comment_id varchar2(36) not null references storyheaven_comments(id),
        reporter_id varchar2(80) not null references webtoon_profiles(user_id),
        reason varchar2(20) not null check (reason in ('abuse','spam','spoiler','other')),
        report_status varchar2(20) default 'open' not null check (report_status in ('open','hidden','dismissed')),
        created_at timestamp with time zone default systimestamp not null,
        resolved_by varchar2(80),
        resolved_at timestamp with time zone,
        constraint uq_sh_comment_reporter unique (comment_id, reporter_id)
      )
    ]';
    execute immediate 'create index idx_sh_comment_report_status on storyheaven_comment_reports(report_status, created_at)';
  end if;
end;
/
commit;
