-- StoryHeaven phase 1 foundation for an existing NeoKIM Oracle schema.
-- Keeps real reader likes, visible editorial endorsements, and AI seed provenance separate.

whenever sqlerror exit failure rollback

declare
  procedure add_profile_column(p_column varchar2, p_definition varchar2) is
    v_count number;
  begin
    select count(*) into v_count
      from user_tab_columns
     where table_name = 'WEBTOON_PROFILES'
       and column_name = upper(p_column);
    if v_count = 0 then
      execute immediate 'alter table webtoon_profiles add (' || p_definition || ')';
    end if;
  end;
begin
  add_profile_column('account_type', 'account_type varchar2(20) default ''human'' not null');
  add_profile_column('nickname', 'nickname varchar2(80 char)');
  add_profile_column('nickname_normalized', 'nickname_normalized varchar2(120 char)');
  add_profile_column('nickname_status', 'nickname_status varchar2(20) default ''temporary'' not null');
  add_profile_column('nickname_changed_at', 'nickname_changed_at timestamp with time zone');
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
  add_constraint_if_missing('CHK_WT_ACCOUNT_TYPE',
    q'[alter table webtoon_profiles add constraint chk_wt_account_type check (account_type in ('human', 'system_ai', 'admin'))]');
  add_constraint_if_missing('CHK_WT_NICKNAME_STATUS',
    q'[alter table webtoon_profiles add constraint chk_wt_nickname_status check (nickname_status in ('temporary', 'active', 'restricted'))]');
end;
/

declare
  v_count number;
begin
  select count(*) into v_count from user_indexes where index_name = 'UQ_WT_NICKNAME_NORMALIZED';
  if v_count = 0 then
    execute immediate 'create unique index uq_wt_nickname_normalized on webtoon_profiles(nickname_normalized)';
  end if;
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
  create_table_if_missing('STORYHEAVEN_NICKNAME_HISTORY', q'[
    create table storyheaven_nickname_history (
      id varchar2(36) primary key,
      user_id varchar2(80) not null references webtoon_profiles(user_id),
      nickname varchar2(80 char) not null,
      nickname_normalized varchar2(120 char) not null,
      change_source varchar2(30) default 'user' not null
        check (change_source in ('user', 'admin', 'migration')),
      changed_at timestamp with time zone default systimestamp not null,
      reserved_until timestamp with time zone not null
    )
  ]');

  create_table_if_missing('STORYHEAVEN_RESERVED_NAMES', q'[
    create table storyheaven_reserved_names (
      nickname_normalized varchar2(120 char) primary key,
      reason varchar2(120 char) default 'protected' not null,
      created_at timestamp with time zone default systimestamp not null
    )
  ]');

  create_table_if_missing('STORYHEAVEN_STORIES', q'[
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
      tags_json clob check (tags_json is json),
      content_rating varchar2(20) default 'all' not null
        check (content_rating in ('all', 'teen', 'adult')),
      content_origin varchar2(30) default 'human' not null
        check (content_origin in ('human', 'human_ai_assisted', 'ai_seed', 'admin_seed')),
      competition_eligible char(1) default 'Y' not null
        check (competition_eligible in ('Y', 'N')),
      ai_disclosure_version varchar2(40),
      cover_path varchar2(1000 char),
      story_status varchar2(30) default 'draft' not null
        check (story_status in ('draft', 'published', 'archived', 'moderation')),
      published_at timestamp with time zone,
      created_at timestamp with time zone default systimestamp not null,
      updated_at timestamp with time zone default systimestamp not null
    )
  ]');

  create_table_if_missing('STORYHEAVEN_LIKES', q'[
    create table storyheaven_likes (
      story_id varchar2(36) not null references storyheaven_stories(id),
      user_id varchar2(80) not null references webtoon_profiles(user_id),
      created_at timestamp with time zone default systimestamp not null,
      primary key (story_id, user_id)
    )
  ]');

  create_table_if_missing('STORYHEAVEN_ENDORSEMENTS', q'[
    create table storyheaven_endorsements (
      story_id varchar2(36) primary key references storyheaven_stories(id),
      admin_user_id varchar2(80) not null references webtoon_profiles(user_id),
      endorsement_level number(1) default 1 not null check (endorsement_level between 1 and 3),
      public_reason varchar2(180 char),
      created_at timestamp with time zone default systimestamp not null,
      updated_at timestamp with time zone default systimestamp not null
    )
  ]');

  create_table_if_missing('STORYHEAVEN_AI_PERSONAS', q'[
    create table storyheaven_ai_personas (
      id varchar2(36) primary key,
      author_user_id varchar2(80) not null references webtoon_profiles(user_id),
      pen_name varchar2(80 char) not null,
      voice_profile_json clob not null check (voice_profile_json is json),
      persona_status varchar2(20) default 'active' not null check (persona_status in ('active', 'paused', 'retired')),
      created_at timestamp with time zone default systimestamp not null,
      updated_at timestamp with time zone default systimestamp not null
    )
  ]');

  create_table_if_missing('STORYHEAVEN_PROVENANCE', q'[
    create table storyheaven_provenance (
      id varchar2(36) primary key,
      story_id varchar2(36) not null references storyheaven_stories(id),
      producer_type varchar2(30) not null check (producer_type in ('human', 'human_ai_assisted', 'system_ai', 'admin')),
      generator_name varchar2(120 char),
      disclosure_text varchar2(500 char) not null,
      metadata_json clob check (metadata_json is json),
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
  create_index_if_missing('IDX_SH_NICKNAME_HOLD',
    'create index idx_sh_nickname_hold on storyheaven_nickname_history(nickname_normalized, reserved_until desc)');
  create_index_if_missing('IDX_SH_STORIES_FEED',
    'create index idx_sh_stories_feed on storyheaven_stories(story_status, published_at desc)');
  create_index_if_missing('IDX_SH_STORIES_AUTHOR',
    'create index idx_sh_stories_author on storyheaven_stories(author_user_id, updated_at desc)');
  create_index_if_missing('IDX_SH_LIKES_CREATED',
    'create index idx_sh_likes_created on storyheaven_likes(story_id, created_at desc)');
end;
/

merge into storyheaven_reserved_names target
using (
  select 'admin' nickname_normalized, 'system role' reason from dual union all
  select 'administrator', 'system role' from dual union all
  select 'official', 'system role' from dual union all
  select 'operator', 'system role' from dual union all
  select 'storyheaven', 'service name' from dual union all
  select 'support', 'system role' from dual union all
  select '관리자', 'system role' from dual union all
  select '스토리천국', 'service name' from dual union all
  select '운영자', 'system role' from dual union all
  select '운영진', 'system role' from dual
) source
on (target.nickname_normalized = source.nickname_normalized)
when not matched then insert (nickname_normalized, reason)
values (source.nickname_normalized, source.reason);

merge into webtoon_profiles target
using (select 'storyheaven-system-ai' user_id from dual) source
on (target.user_id = source.user_id)
when not matched then insert (
  user_id, display_name, is_admin, account_type, nickname, nickname_normalized,
  nickname_status, nickname_changed_at, acorns, account_status, guide_completed, profile_json
) values (
  source.user_id, 'StoryHeaven Seed Writer', 'N', 'system_ai',
  'AI 이야기 씨앗', 'ai 이야기 씨앗', 'active', systimestamp,
  0, 'active', 'Y', to_clob('{"source":"storyheaven","disclosure":"system_ai"}')
);

merge into storyheaven_ai_personas target
using (select 'ai-persona-story-seed' id from dual) source
on (target.id = source.id)
when not matched then insert (id, author_user_id, pen_name, voice_profile_json)
values (
  source.id, 'storyheaven-system-ai', 'AI 이야기 씨앗',
  to_clob('{"tone":"transparent-seed","purpose":"empty-state-bootstrap"}')
);

declare
  procedure seed_story(
    p_id varchar2, p_slug varchar2, p_title varchar2, p_logline varchar2,
    p_synopsis varchar2, p_genre varchar2, p_tags varchar2,
    p_cover varchar2, p_hours_ago number
  ) is
  begin
    merge into storyheaven_stories target
    using (select p_id id from dual) source
       on (target.id = source.id)
    when not matched then insert (
      id, slug, author_user_id, title, logline, public_synopsis, genre, tags_json,
      content_origin, competition_eligible, ai_disclosure_version, cover_path,
      story_status, published_at
    ) values (
      p_id, p_slug, 'storyheaven-system-ai', p_title, p_logline, to_clob(p_synopsis),
      p_genre, to_clob(p_tags), 'ai_seed', 'N', 'ai-seed/v1', p_cover,
      'published', systimestamp - numtodsinterval(p_hours_ago, 'HOUR')
    );

    merge into storyheaven_provenance target
    using (select p_id || '-source' id from dual) source
       on (target.id = source.id)
    when not matched then insert (
      id, story_id, producer_type, generator_name, disclosure_text, metadata_json
    ) values (
      source.id, p_id, 'system_ai', 'StoryHeaven seed pipeline',
      '초기 감상을 위해 AI가 만든 시드 스토리입니다. 주간 경쟁에는 참여하지 않습니다.',
      to_clob('{"competitionEligible":false,"visibleLabel":"AI 시드 스토리"}')
    );
  end;
begin
  seed_story(
    'seed-last-platform', 'last-platform-signal', '막차가 떠난 뒤의 승강장',
    '종착역에 홀로 남은 청소부가 매일 한 칸씩 가까워지는 정체불명의 열차를 발견한다.',
    '막차가 끊긴 폐역. 야간 청소부 도윤은 운행 기록에 없는 열차가 매일 자정 한 칸씩 가까워진다는 사실을 알아챈다.',
    '미스터리', '["폐역","미스터리","선택"]',
    '/webtoon/assets/guide/awakening-episode-01-last-train-v4.webp', 2
  );
  seed_story(
    'seed-rain-memory', 'rain-memory-market', '비를 보관하는 잡화점',
    '잊고 싶은 기억을 빗물에 담아 파는 소녀가 자신의 병만 비어 있음을 발견한다.',
    '사람들의 기억이 비가 되어 내리는 골목. 잡화점 주인 해원은 손님의 슬픔을 병에 담아주지만 정작 자신의 유년기는 떠올리지 못한다.',
    '감성판타지', '["비","기억","잡화점"]',
    '/webtoon/assets/guide/awakening-episode-02-boot-trail-v4.webp', 5
  );
  seed_story(
    'seed-night-auditor', 'night-auditor-13', '13번 야간 감사관',
    '괴물의 민원을 처리하는 말단 공무원이 인간 세계의 마지막 민원서를 접수한다.',
    '도시가 잠든 뒤에만 열리는 지하 민원실. 신입 감사관 세림은 폐기 대상이 된 인간의 소원을 살리기 위해 규정을 거슬러야 한다.',
    '현대판타지', '["공무원","괴담","규칙"]',
    '/webtoon/assets/guide/awakening-episode-03-inspector-v4.webp', 9
  );
  seed_story(
    'seed-rescue-window', 'rescue-window', '구조 요청은 한 번만',
    '하루에 단 한 명만 구할 수 있는 구조사가 두 곳에서 동시에 울린 신호 앞에 선다.',
    '재난 예지 능력을 가진 구조사 유진에게는 하루 한 번만 문을 열 수 있다는 제약이 있다. 어느 날 가족과 낯선 아이의 신호가 동시에 들어온다.',
    '재난드라마', '["구조","제약","가족"]',
    '/webtoon/assets/guide/awakening-episode-04-rescue-v4.webp', 14
  );
  seed_story(
    'seed-airlock-choice', 'airlock-choice', '한 사람만 나갈 수 있다',
    '산소가 끊긴 연구소에서 서로를 의심하는 생존자들이 마지막 문 앞에서 투표를 시작한다.',
    '잠긴 공중 연구소의 생존자는 다섯 명, 탈출정의 좌석은 하나뿐이다. 그런데 투표가 시작될 때마다 사라진 사람의 목소리가 방송에 섞인다.',
    'SF스릴러', '["밀실","투표","생존"]',
    '/webtoon/assets/guide/awakening-episode-05-airlock-choice-v4.webp', 21
  );
  seed_story(
    'seed-wash-away', 'wash-away-names', '이름을 씻어내는 밤',
    '지워진 이름이 하수구에서 되살아나는 도시에서 세탁공이 자신의 이름을 발견한다.',
    '죄를 지우는 대신 이름을 반납하는 도시. 세탁공 수호는 배수구에서 자신의 이름표를 건져 올리고 자신이 이미 한 번 지워졌음을 알게 된다.',
    '다크판타지', '["이름","도시","추적"]',
    '/webtoon/assets/guide/awakening-episode-06-pressure-wash-v4.webp', 30
  );
end;
/

update webtoon_profiles
   set account_type = case when is_admin = 'Y' then 'admin' else nvl(account_type, 'human') end,
       nickname_status = nvl(nickname_status, 'temporary')
 where account_type is null
    or nickname_status is null
    or is_admin = 'Y';

create or replace trigger trg_sh_stories_bu
before update on storyheaven_stories
for each row
begin
  :new.updated_at := systimestamp;
end;
/

create or replace trigger trg_sh_endorsements_bu
before update on storyheaven_endorsements
for each row
begin
  :new.updated_at := systimestamp;
end;
/

create or replace trigger trg_sh_ai_personas_bu
before update on storyheaven_ai_personas
for each row
begin
  :new.updated_at := systimestamp;
end;
/

commit;
exit success;
