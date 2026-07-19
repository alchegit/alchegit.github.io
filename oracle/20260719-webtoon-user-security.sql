-- Apply once to an existing NeoKIM Webtoon Studio Oracle schema.
-- Adds Google-account status, acorn administration, and privacy-minimized security events.

whenever sqlerror exit failure rollback

declare
  procedure add_column_if_missing(p_column varchar2, p_definition varchar2) is
    v_count number;
  begin
    select count(*)
      into v_count
      from user_tab_columns
     where table_name = 'WEBTOON_PROFILES'
       and column_name = upper(p_column);

    if v_count = 0 then
      execute immediate 'alter table webtoon_profiles add (' || p_definition || ')';
    end if;
  end;
begin
  add_column_if_missing('account_status', 'account_status varchar2(20) default ''active'' not null');
  add_column_if_missing('banned_at', 'banned_at timestamp with time zone');
  add_column_if_missing('ban_reason', 'ban_reason varchar2(500 char)');
  add_column_if_missing('last_seen_at', 'last_seen_at timestamp with time zone');
  add_column_if_missing('login_count', 'login_count number(10) default 0 not null');
  add_column_if_missing('last_ip_hash', 'last_ip_hash varchar2(64)');
  add_column_if_missing('last_user_agent', 'last_user_agent varchar2(80)');
end;
/

declare
  v_count number;
begin
  select count(*)
    into v_count
    from user_constraints
   where constraint_name = 'CHK_WT_PROFILE_STATUS';

  if v_count = 0 then
    execute immediate q'[
      alter table webtoon_profiles add constraint chk_wt_profile_status
      check (account_status in ('active', 'banned'))
    ]';
  end if;
end;
/

declare
  v_count number;
begin
  select count(*)
    into v_count
    from user_tables
   where table_name = 'WEBTOON_SECURITY_EVENTS';

  if v_count = 0 then
    execute immediate q'[
      create table webtoon_security_events (
        id varchar2(36) primary key,
        user_id varchar2(80),
        event_type varchar2(60) not null,
        severity varchar2(10) default 'info' not null
          check (severity in ('info', 'warn', 'high')),
        ip_hash varchar2(64),
        user_agent_category varchar2(80),
        details_json clob check (details_json is json),
        created_at timestamp with time zone default systimestamp not null,
        expires_at timestamp with time zone
          default (systimestamp + interval '30' day) not null
      )
    ]';
    execute immediate 'create index idx_wt_security_created on webtoon_security_events(created_at desc)';
    execute immediate 'create index idx_wt_security_user_created on webtoon_security_events(user_id, created_at desc)';
  end if;
end;
/

update webtoon_profiles
   set account_status = 'active'
 where account_status is null;

update webtoon_profiles
   set login_count = 0
 where login_count is null;

commit;

exit success;
