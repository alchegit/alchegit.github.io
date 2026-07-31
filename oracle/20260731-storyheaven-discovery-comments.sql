-- StoryHeaven genre discovery, period rankings, and one-level text comments.
-- Run after 20260731-storyheaven-episode-continuation.sql on EENTA_REPO3 / ORAHOON.

whenever sqlerror exit failure rollback

declare
  v_count number;
begin
  select count(*) into v_count
    from all_tables
   where owner = sys_context('USERENV', 'CURRENT_SCHEMA')
     and table_name = 'STORYHEAVEN_COMMENTS';

  if v_count = 0 then
    execute immediate q'[
      create table storyheaven_comments (
        id varchar2(36) primary key,
        story_id varchar2(36) not null references storyheaven_stories(id),
        episode_id varchar2(36) references storyheaven_episodes(id),
        parent_comment_id varchar2(36) references storyheaven_comments(id),
        user_id varchar2(80) not null references webtoon_profiles(user_id),
        body_text varchar2(500 char) not null,
        comment_status varchar2(20) default 'active' not null
          check (comment_status in ('active', 'deleted', 'hidden')),
        created_at timestamp with time zone default systimestamp not null,
        updated_at timestamp with time zone default systimestamp not null,
        constraint ck_sh_comment_body_length
          check (length(trim(body_text)) between 2 and 500)
      )
    ]';
  end if;
end;
/

declare
  procedure create_index_if_missing(p_name varchar2, p_ddl varchar2) is
    v_count number;
  begin
    select count(*) into v_count
      from all_indexes
     where owner = sys_context('USERENV', 'CURRENT_SCHEMA')
       and index_name = upper(p_name);
    if v_count = 0 then execute immediate p_ddl; end if;
  end;
begin
  create_index_if_missing('IDX_SH_COMMENTS_SCOPE',
    'create index idx_sh_comments_scope on storyheaven_comments(story_id, episode_id, comment_status, created_at)');
  create_index_if_missing('IDX_SH_COMMENTS_PARENT',
    'create index idx_sh_comments_parent on storyheaven_comments(parent_comment_id, comment_status, created_at)');
  create_index_if_missing('IDX_SH_COMMENTS_USER',
    'create index idx_sh_comments_user on storyheaven_comments(user_id, created_at)');
end;
/

commit;

prompt StoryHeaven discovery and comments migration complete.
