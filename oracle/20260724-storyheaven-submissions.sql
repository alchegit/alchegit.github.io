-- StoryHeaven phase 2: private drafts, immutable revisions, consent, and moderation.
-- Run after 20260724-storyheaven-foundation.sql on EENTA_REPO3 / ORAHOON.

whenever sqlerror exit failure rollback

declare
  procedure add_story_column(p_column varchar2, p_definition varchar2) is
    v_count number;
  begin
    select count(*) into v_count
      from user_tab_columns
     where table_name = 'STORYHEAVEN_STORIES'
       and column_name = upper(p_column);
    if v_count = 0 then
      execute immediate 'alter table storyheaven_stories add (' || p_definition || ')';
    end if;
  end;
begin
  add_story_column('secondary_genre', 'secondary_genre varchar2(40 char)');
  add_story_column('rating_detail', 'rating_detail varchar2(10) default ''all'' not null');
  add_story_column('current_revision_no', 'current_revision_no number(6) default 0 not null');
  add_story_column('submitted_revision_no', 'submitted_revision_no number(6)');
  add_story_column('submitted_at', 'submitted_at timestamp with time zone');
  add_story_column('reviewed_at', 'reviewed_at timestamp with time zone');
  add_story_column('reviewed_by', 'reviewed_by varchar2(80)');
  add_story_column('review_decision', 'review_decision varchar2(30) default ''none'' not null');
  add_story_column('review_note', 'review_note varchar2(1000 char)');
  add_story_column('eligibility_score', 'eligibility_score number(3)');
  add_story_column('rights_confirmed', 'rights_confirmed char(1) default ''N'' not null');
  add_story_column('adult_confirmed', 'adult_confirmed char(1) default ''N'' not null');
end;
/

declare
  procedure add_constraint_if_missing(p_name varchar2, p_ddl varchar2) is
    v_count number;
  begin
    select count(*) into v_count from user_constraints where constraint_name = upper(p_name);
    if v_count = 0 then execute immediate p_ddl; end if;
  end;
begin
  add_constraint_if_missing('CHK_SH_RATING_DETAIL',
    q'[alter table storyheaven_stories add constraint chk_sh_rating_detail check (rating_detail in ('all', '12', '15'))]');
  add_constraint_if_missing('CHK_SH_REVIEW_DECISION',
    q'[alter table storyheaven_stories add constraint chk_sh_review_decision check (review_decision in ('none', 'pending', 'approved', 'changes_requested', 'rejected'))]');
  add_constraint_if_missing('CHK_SH_ELIGIBILITY_SCORE',
    q'[alter table storyheaven_stories add constraint chk_sh_eligibility_score check (eligibility_score between 0 and 100)]');
  add_constraint_if_missing('CHK_SH_RIGHTS_CONFIRMED',
    q'[alter table storyheaven_stories add constraint chk_sh_rights_confirmed check (rights_confirmed in ('Y', 'N'))]');
  add_constraint_if_missing('CHK_SH_ADULT_CONFIRMED',
    q'[alter table storyheaven_stories add constraint chk_sh_adult_confirmed check (adult_confirmed in ('Y', 'N'))]');
end;
/

declare
  procedure create_table_if_missing(p_table varchar2, p_ddl clob) is
    v_count number;
  begin
    select count(*) into v_count from user_tables where table_name = upper(p_table);
    if v_count = 0 then execute immediate p_ddl; end if;
  end;
begin
  create_table_if_missing('STORYHEAVEN_REVISIONS', q'[
    create table storyheaven_revisions (
      id varchar2(36) primary key,
      story_id varchar2(36) not null references storyheaven_stories(id),
      revision_no number(6) not null,
      actor_user_id varchar2(80) not null references webtoon_profiles(user_id),
      revision_kind varchar2(20) default 'draft' not null
        check (revision_kind in ('draft', 'submit', 'review')),
      packet_json clob not null check (packet_json is json),
      content_hash varchar2(64) not null,
      created_at timestamp with time zone default systimestamp not null,
      constraint uq_sh_revision_no unique (story_id, revision_no)
    )
  ]');

  create_table_if_missing('STORYHEAVEN_CONSENTS', q'[
    create table storyheaven_consents (
      id varchar2(36) primary key,
      story_id varchar2(36) not null references storyheaven_stories(id),
      user_id varchar2(80) not null references webtoon_profiles(user_id),
      consent_type varchar2(30) not null
        check (consent_type in ('display', 'originality', 'adult', 'training', 'adaptation')),
      document_version varchar2(40) not null,
      accepted char(1) default 'Y' not null check (accepted in ('Y', 'N')),
      content_hash varchar2(64) not null,
      accepted_at timestamp with time zone default systimestamp not null,
      constraint uq_sh_consent unique (story_id, user_id, consent_type, document_version)
    )
  ]');

  create_table_if_missing('STORYHEAVEN_ACTIVITY', q'[
    create table storyheaven_activity (
      id varchar2(36) primary key,
      story_id varchar2(36) references storyheaven_stories(id),
      actor_user_id varchar2(80) references webtoon_profiles(user_id),
      activity_type varchar2(40) not null,
      from_status varchar2(30),
      to_status varchar2(30),
      details_json clob check (details_json is json),
      created_at timestamp with time zone default systimestamp not null
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
  create_index_if_missing('IDX_SH_REVISION_STORY',
    'create index idx_sh_revision_story on storyheaven_revisions(story_id, revision_no desc)');
  create_index_if_missing('IDX_SH_MODERATION_QUEUE',
    'create index idx_sh_moderation_queue on storyheaven_stories(story_status, submitted_at)');
  create_index_if_missing('IDX_SH_ACTIVITY_STORY',
    'create index idx_sh_activity_story on storyheaven_activity(story_id, created_at desc)');
end;
/

commit;

prompt StoryHeaven submission workflow migration complete.
