-- StoryHeaven editorial showcase metadata sync.
-- Public pages use neutral editorial labels; production provenance stays private.

update webtoon_profiles
   set display_name = 'StoryHeaven Editorial',
       nickname = '스토리천국 편집부',
       nickname_normalized = '스토리천국 편집부',
       profile_json = to_clob('{"source":"storyheaven","role":"editorial"}'),
       updated_at = systimestamp
 where user_id = 'storyheaven-system-ai';

declare
  procedure sync_story(
    p_id varchar2,
    p_title varchar2,
    p_logline varchar2,
    p_synopsis varchar2,
    p_genre varchar2,
    p_tags varchar2,
    p_cover varchar2
  ) is
  begin
    merge into storyheaven_stories target
    using (select p_id id from dual) source
       on (target.id = source.id)
    when matched then update set
      target.title = p_title,
      target.logline = p_logline,
      target.public_synopsis = to_clob(p_synopsis),
      target.genre = p_genre,
      target.tags_json = to_clob(p_tags),
      target.content_origin = 'admin_seed',
      target.competition_eligible = 'N',
      target.ai_disclosure_version = null,
      target.cover_path = p_cover,
      target.story_status = 'published',
      target.updated_at = systimestamp
    when not matched then insert (
      id, slug, author_user_id, title, logline, public_synopsis, genre, tags_json,
      content_origin, competition_eligible, ai_disclosure_version, cover_path,
      story_status, published_at, updated_at
    ) values (
      p_id, p_id, 'storyheaven-system-ai', p_title, p_logline, to_clob(p_synopsis),
      p_genre, to_clob(p_tags), 'admin_seed', 'N', null, p_cover,
      'published', systimestamp, systimestamp
    );
  end;
begin
  sync_story(
    'seed-last-platform',
    '8초를 싣는 막차',
    '사라진 동생의 마지막 8초를 숨겨 온 기억 청소부가, 정차할 때마다 소중한 기억을 빼앗는 회수 열차에 오른다.',
    '자정이 지나면 버려진 기억이 잔향으로 고이는 해원시. 기억 청소부 서이결은 실종된 동생의 마지막 8초를 몰래 간직한 채 살아간다. 어느 날 봉쇄된 승강장에 지워진 사람들의 이름을 실은 회수 열차가 나타나고, 그 안에서 동생의 이름도 발견된다. 13번 감사관은 열차의 문을 열 때마다 현실이 무너진다고 경고한다. 하지만 이결은 기억을 하나씩 내주며 동생이 갇힌 곳으로 향한다. 새로운 역의 사건을 풀 때마다 동생의 실종과 감사국의 목적, 해원시가 숨긴 최초의 8초가 하나로 이어진다.',
    '현대판타지',
    '["기억","괴이열차","도시미스터리"]',
    '/storyheaven/assets/covers/last-platform.webp'
  );
  sync_story(
    'seed-rain-memory',
    '비를 보관하는 잡화점',
    '사람들의 기억을 빗물에 담아주는 가게에, 아직 태어나지 않은 딸이 사흘 뒤의 화재를 품은 병을 들고 찾아온다.',
    '사람의 기억이 비가 되어 내리는 골목에서 우천상회를 운영하는 장예슬은 손님이 잊고 싶은 날을 병에 보관한다. 어느 맑은 날, 미래에서 왔다는 아이가 사흘 뒤 가게가 불타는 장면과 장예슬의 딸이라는 라벨이 붙은 병을 내민다.',
    '감성판타지',
    '["비","기억가게","시간미스터리"]',
    '/storyheaven/assets/covers/rain-memory-shop.webp'
  );
  sync_story(
    'seed-night-auditor',
    '13번 야간 감사관',
    '괴물의 민원을 심사하는 말단 감사관이, 자기 이름으로 접수된 사망 후 근무 취소 신청서를 발견한다.',
    '도시가 잠든 뒤에만 열리는 시청 지하 13층. 야간 감사관 도세림은 존재할 수 없는 13번 민원인의 인간 자격 복구 신청을 접수한 뒤 자신이 3년 전에 사망했다는 기록과 마주한다.',
    '오피스괴담',
    '["야간민원실","규칙괴담","정체미스터리"]',
    '/storyheaven/assets/covers/night-auditor.webp'
  );
  sync_story(
    'seed-rescue-window',
    '구조 요청은 한 번만',
    '하루 한 번만 공간을 열 수 있는 구조사가 동생 대신 낯선 아이를 구하자, 미래의 동생이 두 번째 창을 열고 경고한다.',
    '도시재난구조국의 한유진은 벽 하나를 재난 현장과 연결하는 구조창을 하루 한 번 열 수 있다. 동생과 낯선 아이의 신호가 동시에 들어온 날, 아이를 선택한 유진 앞에 스스로 열린 두 번째 창이 나타난다.',
    '재난판타지',
    '["구조창","시간재난","가족"]',
    '/storyheaven/assets/covers/rescue-window.webp'
  );
  sync_story(
    'seed-airlock-choice',
    '한 사람만 나갈 수 있다',
    '생존자는 다섯인데 탈출 투표에는 여섯 표가 나왔다. 죽은 승무원의 표는 한 사람을 지구로 보내려 한다.',
    '충돌로 붕괴 중인 궤도농업기지 에덴-7에는 탈출정 좌석이 하나뿐이다. 다섯 생존자가 투표를 마쳤지만 여섯 개의 생체 표가 집계되고, 죽은 승무원의 표까지 법식물학자 서나리를 선택한다.',
    '우주생존',
    '["궤도온실","생존투표","식물SF"]',
    '/storyheaven/assets/covers/airlock-choice.webp'
  );
  sync_story(
    'seed-wash-away',
    '이름을 씻어내는 밤',
    '사람의 이름을 지워주는 야간 세탁사의 배수구에서, 그가 스스로 버린 집행감사관의 이름이 되돌아온다.',
    '백야세탁소는 도시에서 사라지고 싶은 사람의 이름을 옷에서 씻어 기록과 기억을 함께 지운다. 과거를 잃은 야간 세탁사 한도윤은 배수구에서 자신의 옛 이름과 이름관리국의 내부 고발 장부를 되찾는다.',
    '도시누아르',
    '["이름세탁","기억추적","야간세탁소"]',
    '/storyheaven/assets/covers/wash-away-name.webp'
  );
end;
/

commit;
