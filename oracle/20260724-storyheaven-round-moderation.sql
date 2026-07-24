-- StoryHeaven phase 4: operator vote invalidation and candidate disqualification.
-- Run after 20260724-storyheaven-weekly-rounds.sql.

whenever sqlerror exit failure rollback

declare
  procedure add_column_if_missing(
    p_table varchar2,
    p_column varchar2,
    p_definition varchar2
  ) is
    v_count number;
  begin
    select count(*) into v_count
      from user_tab_columns
     where table_name = upper(p_table)
       and column_name = upper(p_column);
    if v_count = 0 then
      execute immediate 'alter table ' || p_table || ' add (' || p_definition || ')';
    end if;
  end;
begin
  add_column_if_missing('STORYHEAVEN_ENTRIES', 'DISQUALIFIED_AT',
    'disqualified_at timestamp with time zone');
  add_column_if_missing('STORYHEAVEN_ENTRIES', 'DISQUALIFIED_BY',
    'disqualified_by varchar2(80) references webtoon_profiles(user_id)');

  add_column_if_missing('STORYHEAVEN_VOTES', 'INVALIDATED_AT',
    'invalidated_at timestamp with time zone');
  add_column_if_missing('STORYHEAVEN_VOTES', 'INVALIDATED_BY',
    'invalidated_by varchar2(80) references webtoon_profiles(user_id)');
  add_column_if_missing('STORYHEAVEN_VOTES', 'INVALIDATION_REASON',
    'invalidation_reason varchar2(500 char)');
end;
/

commit;

prompt StoryHeaven round moderation migration complete.
