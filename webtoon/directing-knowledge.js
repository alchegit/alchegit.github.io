(() => {
  const profiles = Object.freeze({
    "cold-open": profile("wide", "bird-eye", "center", "back", "결과를 먼저 보여줘 첫 질문을 만든다", "작은 인물과 넓은 공간의 크기 차", "전경의 구조물, 중경의 인물, 배경의 이상 징후", "설명용 정면 전신샷"),
    setup: profile("medium-wide", "profile-side", "left", "right-profile", "인물의 일상 행동과 이동 방향을 소개한다", "행동 축을 따라 비워 둔 진행 공간", "전경 소품, 중경 행동, 배경 랜드마크", "카메라를 보는 증명사진 구도"),
    hook: profile("detail", "over-shoulder", "center", "back", "인물이 발견한 단서를 독자도 같은 순서로 보게 한다", "어깨 너머 단서 인서트", "전경 어깨, 중경 손·단서, 흐린 배경", "장소 전체를 다시 설명하는 원경"),
    inciting: profile("medium-close", "ground-low-diagonal", "left", "three-quarter-right", "사건이 인물의 안전 영역을 침범하는 순간을 잡는다", "대각선 진입선과 전경 왜곡", "큰 전경 사건, 중경 반응, 배경 탈출 방향", "수평 눈높이 정중앙 배치"),
    stakes: profile("close", "high-angle", "center", "front", "실패 조건을 받아들이는 표정과 압박을 붙잡는다", "머리 위 여백을 줄인 압박 프레임", "얕은 전경, 얼굴, 흐린 위협", "감정이 보이지 않는 뒷모습 원경"),
    goal: profile("medium", "profile-side", "left", "right-profile", "목표를 선택하는 행동이 대사보다 먼저 읽히게 한다", "시선과 손이 같은 방향을 가리키는 측면", "전경 목표물, 중경 인물, 배경 진행 방향", "가만히 서서 말만 하는 정면샷"),
    threat: profile("wide", "low-angle", "lower-left", "back", "위협의 크기와 인물의 열세를 동시에 비교한다", "전경의 작은 인물과 배경의 거대한 실루엣", "인물, 가림 구조물, 위협의 세 층", "위협과 인물이 같은 크기로 보이는 중경"),
    ability: profile("detail", "over-shoulder", "center", "back", "능력이나 소품이 작동하는 원인을 명확히 보여준다", "손에서 대상까지 이어지는 동작선", "손, 작동 소품, 반응하는 대상", "효과만 크고 작동 원인이 없는 화면"),
    progress: profile("medium", "eye-level", "right", "three-quarter-left", "첫 성공의 행동과 결과를 한 호흡으로 읽힌다", "행동 뒤에 결과가 놓이는 좌우 흐름", "전경 결과, 중경 인물, 배경 다음 목표", "성공 전과 같은 거리·각도 반복"),
    complication: profile("wide", "bird-eye", "center", "back", "불리해진 공간 관계와 막힌 경로를 공개한다", "위에서 보이는 경로와 장애물의 지도형 구도", "막힌 길, 인물, 위협 경로", "표정만 보여 공간 문제를 숨기는 근경"),
    midpoint: profile("medium-close", "profile-side", "right", "left-profile", "새 진실과 표정 변화를 한 프레임에서 연결한다", "인물 옆얼굴과 단서의 투 포인트", "전경 단서, 중경 반응, 배경 사건", "단서 없는 정면 얼굴만의 근경"),
    reversal: profile("close", "dutch-subtle", "center", "front", "규칙이 뒤집힌 불안정을 짧고 강하게 전달한다", "수평선만 살짝 기울인 불균형", "전경 파편, 표정, 뒤집힌 상태", "과도한 기울기와 장식적 왜곡"),
    decision: profile("medium-close", "low-angle", "left", "three-quarter-right", "결정한 인물의 자세와 시선을 힘 있게 세운다", "낮은 시점과 앞으로 기운 몸의 삼각형", "전경 발·손, 중경 인물, 배경 목표", "아무 행동 없이 카메라만 보는 정면샷"),
    payoff: profile("detail", "over-shoulder", "center", "back", "앞에서 준비한 소품의 쓰임을 독자가 알아보게 한다", "익숙한 소품과 새 결과를 한 축에 배치", "전경 소품, 중경 작동, 배경 결과", "새 소품을 갑자기 추가하는 해결"),
    climax: profile("wide", "ground-low-diagonal", "center", "three-quarter-left", "가장 큰 행동의 속도와 충돌 방향을 폭발시킨다", "전경에서 배경으로 뻗는 강한 대각선", "큰 전경, 충돌 중경, 위협 배경", "평평한 옆모습과 수직·수평선뿐인 구도"),
    resolution: profile("medium-wide", "high-angle", "right", "three-quarter-left", "해결 직후의 거리와 안도를 차분히 정리한다", "숨 쉴 여백이 생긴 느슨한 삼각 배치", "남은 흔적, 인물, 열린 공간", "클라이맥스와 같은 과장된 로우앵글"),
    cost: profile("close", "profile-side", "center", "left-profile", "해결의 대가를 표정과 작은 변화로 남긴다", "측면 빛으로 얼굴을 양분", "대가의 단서, 표정, 흐린 배경", "대가를 대사로만 설명하는 원경"),
    reveal: profile("wide", "bird-eye", "lower-center", "back", "인물이 몰랐던 사건의 전체 규모를 공개한다", "인물을 작게 두고 사건 범위를 화면 대부분에 배치", "전경 경계, 중경 인물, 배경 전체 사건", "앞 컷과 같은 정보량의 중경"),
    cliffhanger: profile("detail", "ground-low-diagonal", "center", "front", "다음 컷을 넘기게 할 정보 하나만 남긴다", "하나의 단서가 프레임을 지배하는 인서트", "단서, 반응 일부, 검은 여백", "여러 정보를 같은 크기로 나열"),
    "next-episode": profile("wide", "over-shoulder", "lower-left", "back", "새로 열린 공간이나 적을 주인공과 함께 마주 보게 한다", "어깨 너머 깊은 소실점", "전경 인물, 중경 문턱, 배경 새 세계", "새 장소만 보여 인물의 관계를 끊는 풍경샷")
  });

  const sources = Object.freeze([
    "https://helpx.adobe.com/pdf/adobe_story_reference.pdf",
    "https://helpx.adobe.com/firefly/mobile/work-with-audio-and-video/work-with-video/generate-videos-using-text-prompts.html",
    "https://www.webtoons.com/en/canvas/comics-tips/list?title_no=892865"
  ]);

  function profile(shotSize, angle, subjectPosition, facing, intent, framingDevice, depthPlan, avoid) {
    return Object.freeze({ shotSize, angle, subjectPosition, facing, intent, framingDevice, depthPlan, avoid });
  }

  function select(phase, index = 0) {
    const selected = profiles[phase] || profile("medium", "eye-level", "center", index % 2 ? "three-quarter-right" : "three-quarter-left", "현재 사건의 행동과 감정을 한눈에 전달한다", "인물과 사건을 비대칭으로 배치", "전경, 인물, 배경의 세 층", "정중앙 눈높이 전신샷의 연속 반복");
    return {
      ...selected,
      negativeSpace: selected.subjectPosition.includes("right") ? "upper-left" : "upper-right",
      movementAxis: selected.facing.includes("left") ? "right-to-left" : selected.facing.includes("right") ? "left-to-right" : "depth",
      sequenceRule: "앞뒤 두 컷과 거리·높이·인물 방향이 모두 같으면 한 요소 이상 바꾸고, 바꾼 이유를 장면 정보로 설명한다."
    };
  }

  window.NeoKIMWebtoonDirector = Object.freeze({
    schemaVersion: "neokim-webtoon-director/v1",
    sources,
    profiles,
    select
  });
})();
