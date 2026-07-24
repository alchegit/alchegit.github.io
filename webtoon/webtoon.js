(() => {
  // Every page starts in visitor mode. Admin UI is revealed only after the
  // backend has verified the signed-in Google account role.
  document.documentElement.dataset.webtoonAccess = "visitor";

  const storageKey = "neokim-webtoon-project:v1";
  const incomingTemplateKey = "neokim-webtoon-template:v1";
  const studioUiStorageKey = "neokim-webtoon-studio-ui:v1";
  const imageDbName = "neokim-webtoon-images:v1";
  const imageStoreName = "panelImages";
  const projectSchemaVersion = 2;
  const promptCompilerVersion = "neokim-panel-prompt/v2.1.0";
  const regenerationMaskRules = Object.freeze({
    width: 320,
    height: 480,
    maxStrokes: 24,
    maxPointsPerStroke: 96,
    maxEncodedBytes: 256 * 1024
  });
  const supabaseUrl = "https://anjbgbqkeukllsdxgckv.supabase.co";
  const supabasePublishableKey = "sb_publishable_k6DOGCJ3PVC1av1RVxDt5w_NvOZubsE";
  const generationPassCost = 3;
  const visualRenderStages = Object.freeze(["draft", "final"]);
  const accents = ["#69c8ff", "#ffd85a", "#35d7a8", "#e95b88", "#ff9a6c", "#75c96b"];
  const overlayDefaults = Object.freeze({
    line: Object.freeze({ x: 6, y: 7 }),
    narration: Object.freeze({ x: 4, y: 86 }),
    sfx: Object.freeze({ x: 64, y: 70 })
  });
  const regenerationTargetCopy = Object.freeze({
    background: Object.freeze({
      label: "배경만",
      note: "인물, 표정, 말풍선과 텍스트 배치는 그대로 보존합니다."
    }),
    character: Object.freeze({
      label: "인물만",
      note: "배경, 카메라 구도, 말풍선과 텍스트 배치는 그대로 보존합니다."
    }),
    "specific-character": Object.freeze({
      label: "특정 인물",
      note: "선택한 인물만 다시 그리고 다른 인물, 배경, 구도와 텍스트 배치는 그대로 보존합니다."
    }),
    face: Object.freeze({
      label: "얼굴·표정",
      note: "머리, 의상, 몸의 자세, 배경과 구도를 유지하고 얼굴과 표정만 바로잡습니다."
    }),
    hands: Object.freeze({
      label: "손",
      note: "인물의 정체성과 자세, 소품, 배경을 유지하고 손의 형태와 접촉만 바로잡습니다."
    }),
    outfit: Object.freeze({
      label: "의상",
      note: "얼굴, 자세, 배경과 구도를 유지하고 확정된 의상 기준에 맞춰 수정합니다."
    }),
    prop: Object.freeze({
      label: "소품",
      note: "인물과 배경을 유지하고 선택한 소품의 형태, 수량과 위치만 바로잡습니다."
    }),
    lighting: Object.freeze({
      label: "조명",
      note: "인물, 배경 구조와 구도를 유지하고 시간대와 광원 방향만 바로잡습니다."
    }),
    composition: Object.freeze({
      label: "구도",
      note: "인물과 장소의 정체성을 유지하고 카메라 거리, 시선과 화면 배치만 바로잡습니다."
    }),
    full: Object.freeze({
      label: "전체",
      note: "장면 의도와 대사는 유지하지만 배경과 인물 구도가 함께 바뀔 수 있습니다."
    })
  });
  const episodeRules = {
    targetReaderPanels: 60,
    readerPanelRange: [48, 72],
    targetKeyScenes: 16,
    keySceneRange: [12, 20],
    readerPanelsPerScene: 3
  };
  const contentLimits = Object.freeze({
    titleMax: 60,
    storyMin: 10,
    storyRecommendedMin: 280,
    storyRecommendedMax: 950,
    storyMax: 3000,
    manualSceneMin: 1,
    sceneMax: 20,
    panelFields: Object.freeze({ beat: 180, line: 80, reaction: 180, sfx: 16, note: 180 }),
    regenerationInstructionMax: 240,
    dialogueRecommendedMax: 45,
    imageBytes: 12 * 1024 * 1024,
    imageMinSide: 320,
    imageMaxPixels: 40_000_000,
    imageMimeTypes: Object.freeze(["image/jpeg", "image/png", "image/webp"]),
    imageExtensions: Object.freeze(["jpg", "jpeg", "png", "webp"])
  });
  const studioProgressStages = Object.freeze([
    { to: 18, label: "로그라인 분석", log: "주인공의 목표와 첫 위기를 찾고 있습니다." },
    { to: 38, label: "도입부 설계", log: "도입, 사건, 선택, 다음 화의 훅을 나누고 있습니다." },
    { to: 62, label: "세로 컷 구성", log: "모바일에서 읽기 좋은 순서로 장면을 배치하고 있습니다." },
    { to: 82, label: "말풍선 배치", log: "대사와 효과음을 컷마다 정리하고 있습니다." },
    { to: 100, label: "콘티 완성", log: "편집할 수 있는 세로 웹툰 초안을 준비했습니다." }
  ]);
  const storySuggestionLabels = Object.freeze({
    goal: "이번 화의 목표",
    conflict: "실패 위험",
    turn: "중반 전환",
    choice: "주인공의 선택",
    cliffhanger: "마지막 질문",
    "visual-detail": "시각적 단서"
  });

  const templates = [
    {
      id: "awakening-subway-gate",
      title: "폐역 게이트",
      genre: "modern-awakening",
      tone: "tense",
      idea: "폐역 플랫폼에서 F급 헌터가 자신에게만 보이는 퀘스트 창을 발견한다",
      tags: ["현대판타지", "각성", "시스템"],
      colors: ["#69c8ff", "#243047"]
    },
    {
      id: "awakening-return-clock",
      title: "회귀 알림",
      genre: "modern-awakening",
      tone: "tense",
      idea: "던전 사고로 끝났다고 생각한 헌터가 10분 전으로 돌아와 상태창을 확인한다",
      tags: ["회귀", "상태창", "생존"],
      colors: ["#ffd85a", "#e95b88"]
    },
    {
      id: "awakening-rooftop-raid",
      title: "옥상 레이드",
      genre: "modern-awakening",
      tone: "bright",
      idea: "새벽 옥상에서 배달 알바를 하던 주인공이 균열 몬스터와 첫 계약을 맺는다",
      tags: ["레이드", "도시", "첫 전투"],
      colors: ["#35d7a8", "#8f78ff"]
    }
  ];

  const beatBank = {
    "modern-awakening": [
      ["비상등만 남은 폐역에서 누군가 주인공의 이름이 적힌 실종자 명단을 긁어 지운다.", "한도윤... 아직 도착 전인데.", "사각", "cold-open"],
      ["30분 전, F급 헌터 한도윤은 출입 금지 플랫폼의 야간 청소 대타를 맡는다.", "게이트보다 밀린 월세가 더 무섭지.", "철컥", "setup"],
      ["관리 앱에는 마지막 열차가 떠난 뒤 혼자 점검표를 보내라는 지시가 뜬다.", "사진 한 장이면 오늘 일당 끝.", "띵", "setup"],
      ["막차가 지나가지만 유리창 속 승객들의 그림자만 플랫폼에 남는다.", "방금... 내린 사람은 없었는데.", "쿠우웅", "hook"],
      ["도윤에게만 보이는 푸른 퀘스트 창이 어둠 한가운데 켜진다.", "미등록 역무원 확인. 임시 임무를 시작합니다.", "삐빅", "inciting"],
      ["임무의 실패 조건에는 자정까지 답하지 않으면 역 전체가 지상으로 열린다고 적혀 있다.", "문 하나가 아니라, 역 전체가 게이트라고?", "경고", "stakes"],
      ["신호가 끊긴 승강장에서 보수 기사 서미라의 무전만 벽 너머에서 들린다.", "들리면 대답해요. 여기 길이 계속 바뀌어요!", "치직", "goal"],
      ["검표원 모양의 긴 그림자가 승강장 번호를 하나씩 삼키며 다가온다.", "표를... 보여주시죠.", "스르륵", "threat"],
      ["도윤은 쓸모없다고 평가받던 잔류 마력 읽기로 바닥의 마지막 발자국을 본다.", "약해서 흐린 게 아니었어. 오래된 흔적까지 겹친 거야.", "반짝", "ability"],
      ["서로 다른 시간대의 발자국을 분리하자 봉쇄된 직원 통로가 드러난다.", "파란 흔적만 따라가면 미라 씨에게 닿아.", "탁", "progress"],
      ["그림자는 구조 요청을 흉내 내 도윤을 막힌 선로 쪽으로 유인한다.", "도윤 씨, 이쪽이에요.", "메아리", "complication"],
      ["도윤은 목소리가 아니라 마력 흔적을 믿고 반대편 벽을 부숴 미라를 찾아낸다.", "내 이름을 어떻게 알았죠?", "쾅", "midpoint"],
      ["구조에 성공하자 퀘스트가 둘 중 한 명만 역무원이 될 수 있다는 선택으로 바뀐다.", "한 명을 남기면 출구를 개방합니다.", "선택", "reversal"],
      ["도윤은 보상을 거부하고 둘 다 나가는 세 번째 답을 찾겠다고 선언한다.", "규칙을 만든 놈이 정답까지 정하진 못해.", "거절", "decision"],
      ["청소 카트의 형광 세정제를 뿌리자 그림자의 진짜 몸과 끊어진 노선이 선명해진다.", "더러운 건 빛을 받으면 흔적이 남거든.", "촤악", "payoff"],
      ["미라가 셔터를 내리는 동안 도윤이 가짜 검표선을 역으로 연결해 그림자를 가둔다.", "지금이에요. 세 번째 선을 끊어요!", "콰앙", "climax"],
      ["출구 불이 켜지고 퀘스트 창에는 첫 임무 완료와 함께 임시 역무원 자격이 찍힌다.", "보상: 폐선의 잔향. 등급 측정 불가.", "딩", "resolution"],
      ["밖으로 나온 도윤의 지도에는 서울 아래 잠든 아홉 개의 폐역이 새로 표시된다.", "이 역 하나로 끝난 게 아니야.", "점등", "reveal"],
      ["관리 앱의 실종자 명단이 갱신되고, 맨 위에 내일 날짜와 도윤의 이름이 나타난다.", "예정 실종자... 한도윤.", "갱신", "cliffhanger"],
      ["존재하지 않는 0번 승강장 문이 열리며 오래전 실종된 누나의 음성이 들린다.", "도윤아, 이번에는 절대 들어오지 마.", "철컥", "next-episode"]
    ],
    daily: [
      ["주인공이 익숙한 장소에서 이상한 빛을 발견한다.", "이거... 가격표가 아니잖아?", "반짝"],
      ["작은 선택 하나가 평소와 다른 하루를 만든다.", "딱 한 번만 확인해보자.", "톡"],
      ["주변 사람이 아무렇지 않게 더 큰 비밀을 말한다.", "그거 원래 가끔 떨어져요.", "슥"],
      ["주인공이 빛나는 물건을 숨기려다 들킨다.", "잠깐, 주머니에서 별빛 나요.", "두근"],
      ["작은 비밀이 누군가의 기분을 살린다.", "오늘은 좀 덜 외롭네요.", "포근"],
      ["마지막에 평범한 풍경이 살짝 다르게 보인다.", "내일도 같은 시간에 와볼까.", "반짝"]
    ],
    fantasy: [
      ["낡은 물건 안에서 다른 세계의 신호가 열린다.", "문이... 안쪽으로 더 있어.", "끼익"],
      ["작은 안내자가 나타나 급한 부탁을 한다.", "왕국의 불이 꺼지기 전에요!", "파닥"],
      ["주인공은 현실의 물건으로 첫 문제를 해결한다.", "연필이면 다리도 만들 수 있지.", "뚝딱"],
      ["새 세계의 규칙이 예상보다 귀엽게 드러난다.", "여기서는 지각하면 쿠키 벌금이에요.", "딩동"],
      ["선택의 순간, 주인공이 자기 방식으로 길을 낸다.", "큰 마법보다 작은 손이 필요해.", "촤악"],
      ["현실로 돌아왔지만 작은 증거가 남아 있다.", "서랍 안에서 종이 왕관이 굴러왔다.", "달그락"]
    ],
    romance: [
      ["둘이 같은 장소에서 서로를 알아보지 못한 채 스친다.", "오늘도 같은 우산이네.", "후두둑"],
      ["작은 오해가 생기지만 표정은 숨기지 못한다.", "아니, 기다린 건 아닌데.", "힐끔"],
      ["상대가 남긴 소품이 마음을 대신 말한다.", "이 색을 기억하고 있었구나.", "사락"],
      ["둘만 아는 규칙이 생긴다.", "노란 우산이면 좋은 소식.", "톡톡"],
      ["말 대신 행동으로 마음을 건넨다.", "오늘은 내가 씌워줄게.", "스윽"],
      ["다음 만남을 예고하는 작은 약속이 남는다.", "비 안 와도 가져와요.", "두근"]
    ],
    thriller: [
      ["반복되는 이상 현상이 처음으로 기록된다.", "또 13분이 사라졌어.", "삐빅"],
      ["주인공이 규칙을 시험하자 더 큰 단서가 나온다.", "닫힘 버튼을 세 번 누르면...", "쿵"],
      ["평범한 장소의 배치가 조금씩 달라진다.", "여기 거울이 있었나?", "지직"],
      ["보이지 않던 누군가가 메시지를 남긴다.", "내리지 마.", "탁"],
      ["도망보다 관찰이 답이라는 것을 깨닫는다.", "멈춘 게 아니라 기다리는 거야.", "쉿"],
      ["마지막 컷에서 첫 장면의 의미가 바뀐다.", "처음 탄 사람은 내가 아니었다.", "딸깍"]
    ],
    comedy: [
      ["작은 존재들이 너무 진지한 회의를 연다.", "오늘의 안건은 바삭함입니다.", "와글"],
      ["주인공이 말도 안 되는 규칙을 너무 성실히 따른다.", "회의록은 초코펜으로 쓰겠습니다.", "쓱쓱"],
      ["사소한 다툼이 과하게 커진다.", "감자칩파와 쿠키파는 양보 없습니다.", "우당탕"],
      ["엉뚱한 해결책이 의외로 먹힌다.", "그럼 반반 봉지로 합시다.", "짠"],
      ["모두가 납득한 순간 더 이상한 문제가 생긴다.", "누가 새우깡을 초대했죠?", "정적"],
      ["마지막에 주인공만 이상함을 모르는 표정이다.", "오늘 회의도 평화로웠다.", "끄덕"]
    ],
    action: [
      ["주인공이 제한 시간 안에 목표를 확인한다.", "해 뜨기 전에 도착해야 해.", "삐익"],
      ["첫 장애물을 빠르게 넘어 리듬을 만든다.", "옥상 루트로 간다!", "탁"],
      ["예상 밖의 추격자가 등장한다.", "저 드론, 우리 편 아니지?", "부웅"],
      ["팀원이 각자의 장점으로 길을 연다.", "3초만 벌어줘!", "쾅"],
      ["주인공이 위험한 지름길을 선택한다.", "편지는 늦으면 의미가 없어.", "휙"],
      ["도착 후 진짜 임무가 드러난다.", "이건 배달이 아니라 구조였어.", "촤르륵"]
    ]
  };

  const awakeningEpisodeArt = Object.freeze({
    "cold-open": "/webtoon/assets/guide/awakening-episode-01-cold-open-v1.jpg",
    setup: "/webtoon/assets/guide/awakening-panel-01-v1.webp",
    hook: "/webtoon/assets/guide/awakening-episode-04-shadow-train-v1.jpg",
    inciting: "/webtoon/assets/guide/awakening-panel-02a-v1.webp",
    stakes: "/webtoon/assets/guide/awakening-panel-02b-v1.webp",
    goal: "/webtoon/assets/guide/awakening-panel-03-bg-v1.webp",
    threat: "/webtoon/assets/guide/awakening-episode-08-inspector-v1.jpg",
    ability: "/webtoon/assets/guide/awakening-episode-09-footprints-v1.jpg",
    progress: "/webtoon/assets/guide/awakening-panel-03-bg-v1.webp",
    complication: "/webtoon/assets/guide/awakening-episode-08-inspector-v1.jpg",
    midpoint: "/webtoon/assets/guide/awakening-episode-12-rescue-v1.jpg",
    reversal: "/webtoon/assets/guide/awakening-episode-14-choice-v1.jpg",
    decision: "/webtoon/assets/guide/awakening-episode-14-choice-v1.jpg",
    payoff: "/webtoon/assets/guide/awakening-episode-16-payoff-v1.jpg",
    climax: "/webtoon/assets/guide/awakening-episode-16-payoff-v1.jpg",
    resolution: "/webtoon/assets/guide/awakening-panel-02c-v1.webp",
    cost: "/webtoon/assets/guide/awakening-episode-18-map-v1.jpg",
    reveal: "/webtoon/assets/guide/awakening-episode-18-map-v1.jpg",
    cliffhanger: "/webtoon/assets/guide/awakening-episode-01-cold-open-v1.jpg",
    "next-episode": "/webtoon/assets/guide/awakening-episode-20-platform-zero-v1.jpg"
  });

  const awakeningEpisodeReactions = Object.freeze([
    "명단에서 지워진 마지막 얼굴은, 아직 역에 도착하지도 않은 한도윤이었다.",
    "그는 오늘 밤도 월세를 벌고 무사히 퇴근할 생각뿐이었다.",
    "점검 사진 한 장. 그 사소한 지시가 도윤을 플랫폼에 혼자 남겼다.",
    "열차는 떠났는데, 승객의 그림자만 바닥 위에 서 있었다.",
    "푸른 창은 도윤의 이름을 알고 있었다.",
    "자정까지 남은 시간은 스물세 분. 실패하면 역이 도시를 삼킨다.",
    "살아 있는 목소리가 하나 있다. 오늘 밤 도윤이 나갈 이유도 하나 생겼다.",
    "검표원은 표가 아니라 사람의 이름을 거두고 있었다.",
    "약한 능력은 틀리지 않았다. 너무 많은 과거를 한꺼번에 보고 있었을 뿐이다.",
    "파란 발자국은 벽 앞에서 끝나지 않았다. 벽 너머로 이어졌다.",
    "그림자는 서미라의 목소리까지 훔쳤지만, 발자국의 시간은 흉내 내지 못했다.",
    "미라를 찾는 순간, 구조 임무는 둘 중 하나를 버리는 게임으로 바뀌었다.",
    "출구는 한 사람 몫만 빛났다.",
    "도윤은 보상 대신 규칙의 빈틈을 골랐다.",
    "청소부에게만 보이는 더러움이 있었다. 그리고 더러움에는 흔적이 남는다.",
    "미라가 셔터를 내리고, 도윤이 마지막 가짜 노선을 끊었다.",
    "첫 임무는 끝났다. 하지만 상태창의 등급 표시는 끝내 숫자로 바뀌지 않았다.",
    "지도 아래 아홉 개의 불빛이 켜졌다. 폐역은 하나가 아니었다.",
    "내일의 실종자 명단 맨 위에는 한도윤의 이름이 있었다.",
    "0번 승강장 안에서, 십 년 전 사라진 누나가 도윤의 이름을 불렀다."
  ]);

  const awakeningEpisodeActStarts = Object.freeze({
    0: ["PROLOGUE", "지워진 이름"],
    4: ["ACT 1", "나에게만 보이는 임무"],
    8: ["ACT 2", "쓸모없던 능력의 쓰임"],
    12: ["ACT 3", "정해진 답을 거부하다"],
    16: ["EPILOGUE", "끝나지 않은 노선"]
  });

  const awakeningScenarioScenes = beatBank["modern-awakening"].map((scene, index) => Object.freeze({
    beat: scene[0],
    line: scene[1],
    sfx: scene[2],
    phase: scene[3],
    reaction: awakeningEpisodeReactions[index],
    imageData: awakeningEpisodeArt[scene[3]],
    variants: scene[3] === "inciting" ? Object.freeze([
      "/webtoon/assets/guide/awakening-panel-02a-v1.webp",
      "/webtoon/assets/guide/awakening-panel-02b-v1.webp",
      "/webtoon/assets/guide/awakening-panel-02c-v1.webp"
    ]) : Object.freeze([awakeningEpisodeArt[scene[3]]])
  }));

  window.NeoKIMWebtoonScenario = Object.freeze({
    id: "guide-episode",
    title: "폐역 게이트: 0번 승강장",
    episodeLabel: "EP.01",
    synopsis: "F급 헌터 한도윤은 막차가 끊긴 폐역에서 자신에게만 보이는 임무를 받는다. 한 사람만 내보내겠다는 역의 규칙을 깨고, 갇힌 보수 기사 서미라와 함께 살아 나가야 한다.",
    idea: "폐역 플랫폼 청소 알바를 하던 F급 헌터 한도윤이 막차가 끊긴 뒤 혼자 남는다. 전광판이 꺼지는 순간 균열이 열리고, 그에게만 보이는 퀘스트 창이 뜬다. 갇힌 보수 기사 서미라를 구하려면 한 사람만 남아야 한다는 역의 규칙부터 깨야 한다.",
    scenes: Object.freeze(awakeningScenarioScenes)
  });

  const genericEpisodeBlueprint = [
    ["미래의 위험한 결과를 먼저 보여주고, 왜 이런 일이 생겼는지 질문을 남긴다.", "대체 어디서부터 잘못된 거지?", "불길", "cold-open"],
    ["사건 전 주인공의 평범한 일상과 낮은 위치를 짧게 보여준다.", "오늘만 조용히 지나가면 돼.", "일상", "setup"],
    ["주인공이 지금 가장 원하는 현실적인 목표를 드러낸다.", "이번 일만 끝내면 숨 좀 돌릴 수 있어.", "다짐", "setup"],
    ["익숙한 장소에 설명되지 않는 작은 이상 징후가 나타난다.", "잠깐, 방금 저게 움직였나?", "지직", "hook"],
    ["주인공만 알아볼 수 있는 규칙이나 메시지가 사건을 시작시킨다.", "이게... 나한테만 보이는 거야?", "삐빅", "inciting"],
    ["무시할 수 없는 실패 조건과 제한 시간을 분명하게 만든다.", "실패하면 전부 잃는다.", "경고", "stakes"],
    ["주인공이 이번 화 안에 해결해야 할 구체적인 목표를 선택한다.", "먼저 안에 있는 사람부터 찾는다.", "목표", "goal"],
    ["목표를 가로막는 존재가 처음으로 모습을 드러낸다.", "저건 내가 알던 규칙 밖의 존재야.", "스르륵", "threat"],
    ["쓸모없어 보였던 능력이나 물건의 새로운 사용법을 시험한다.", "강하지 않아도 방법은 있어.", "반짝", "ability"],
    ["첫 시도가 작은 성공을 만들며 독자에게 진행감을 준다.", "됐어. 이 길은 통한다.", "탁", "progress"],
    ["성공이 함정이었음이 드러나고 상황이 더 불리해진다.", "일부러 여기까지 오게 만든 거였어.", "덜컹", "complication"],
    ["중간 목표를 이루지만 더 큰 진실이나 대가를 발견한다.", "찾긴 찾았는데... 끝난 게 아니야.", "쾅", "midpoint"],
    ["처음 믿었던 규칙이 뒤집히며 새로운 선택을 강요한다.", "처음부터 선택지는 두 개가 아니었어.", "반전", "reversal"],
    ["주인공이 손해를 감수하고 자기만의 답을 선택한다.", "정해진 답 말고, 내가 고른 답으로 간다.", "결심", "decision"],
    ["앞에서 보여준 약점과 소품을 결합해 해결 계획을 실행한다.", "한 번만 정확히 맞추면 돼.", "집중", "payoff"],
    ["선택의 결과가 가장 큰 행동과 감정 변화로 폭발한다.", "지금이야!", "콰앙", "climax"],
    ["이번 화의 당면 목표를 해결하고 짧은 안도감을 준다.", "살아남았어. 이번에는.", "완료", "resolution"],
    ["해결의 대가나 주인공에게 생긴 변화를 조용히 확인한다.", "얻은 것보다 잃은 게 더 큰 걸까.", "잔향", "cost"],
    ["사건의 범위가 더 컸다는 사실을 한 장면으로 드러낸다.", "이건 시작점 하나에 불과했어.", "점등", "reveal"],
    ["다음 화에서 답해야 할 인물, 문, 메시지 중 하나를 열어 둔다.", "이번에는 네가 선택할 차례야.", "철컥", "next-episode"]
  ];

  document.addEventListener("DOMContentLoaded", () => {
    initAccount();
    initStudio();
    initTemplates();
    initReader();
    initOperator();
  });

  let supabaseClient;
  const accessState = {
    isAdmin: false,
    signedIn: false,
    acorns: 0,
    canCreate: false,
    ready: false
  };

  function getSupabaseClient() {
    if (supabaseClient) {
      return supabaseClient;
    }
    if (!window.supabase?.createClient) {
      return null;
    }

    supabaseClient = window.supabase.createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    return supabaseClient;
  }

  function initAccount() {
    const root = document.querySelector("[data-account]");
    if (!root) {
      return;
    }

    if (getOracleApiBase()) {
      initOracleAccount(root);
      return;
    }

    const client = getSupabaseClient();
    if (!client) {
      renderAccount(root, { error: "Supabase 클라이언트를 불러오지 못했습니다." });
      return;
    }

    renderAccount(root, { loading: true });

    root.querySelector("[data-auth-action='login']")?.addEventListener("click", async () => {
      await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.href.split("#")[0]
        }
      });
    });

    root.querySelector("[data-auth-action='logout']")?.addEventListener("click", async () => {
      await client.auth.signOut();
      renderAccount(root);
      flash("로그아웃");
    });

    root.querySelector("[data-auth-action='claim']")?.addEventListener("click", async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      try {
        const { data, error } = await client.rpc("webtoon_claim_daily_acorns");
        if (error) {
          throw error;
        }
        const { data: sessionData } = await client.auth.getSession();
        await refreshAccount(root, client, sessionData.session);
        flash(data?.claimed ? "도토리 +5" : "오늘 도토리는 이미 받았어요");
      } catch (error) {
        flash("도토리 지급 준비 필요");
      } finally {
        button.disabled = false;
      }
    });

    client.auth.getSession()
      .then(({ data }) => refreshAccount(root, client, data.session))
      .catch(() => renderAccount(root, { error: "로그인 상태 확인 실패" }));

    client.auth.onAuthStateChange((_event, session) => {
      refreshAccount(root, client, session);
    });
  }

  function initOracleAccount(root) {
    const client = getSupabaseClient();
    const loginButton = root.querySelector("[data-auth-action='login']");
    const claimButton = root.querySelector("[data-auth-action='claim']");
    const logoutButton = root.querySelector("[data-auth-action='logout']");

    if (!client) {
      renderAccount(root, { error: "로그인 모듈을 불러오지 못했습니다." });
      return;
    }

    if (loginButton) {
      loginButton.textContent = "Google로 로그인";
      loginButton.addEventListener("click", async () => {
        await client.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: window.location.href.split("#")[0]
          }
        });
      });
    }

    if (logoutButton) {
      logoutButton.addEventListener("click", async () => {
        await client.auth.signOut();
        setAccess({ signedIn: false });
        renderAccount(root);
        flash("로그아웃");
      });
    }

    if (claimButton) {
      claimButton.addEventListener("click", async (event) => {
        const button = event.currentTarget;
        button.disabled = true;
        try {
          const data = await oracleFetch("/api/webtoon/acorns/claim", { method: "POST" });
          const { data: sessionData } = await client.auth.getSession();
          await refreshOracleAccount(root, sessionData.session);
          flash(data?.claimed ? "도토리 +5" : "오늘 도토리는 이미 받았어요");
        } catch (error) {
          flash(accountErrorMessage(error));
        } finally {
          button.disabled = false;
        }
      });
    }

    renderAccount(root, { loading: true });
    client.auth.getSession().then(({ data }) => {
      refreshOracleAccount(root, data.session);
    }).catch(() => {
      setAccess({ signedIn: false });
      renderAccount(root, { error: "로그인 상태를 확인하지 못했습니다." });
    });
    client.auth.onAuthStateChange((_event, session) => {
      refreshOracleAccount(root, session);
    });
  }

  async function refreshOracleAccount(root, session) {
    if (!session) {
      setAccess({ signedIn: false });
      renderAccount(root);
      return;
    }

    renderAccount(root, { session, loading: true });
    try {
      const profile = await oracleFetch("/api/webtoon/profile");
      setAccess({
        signedIn: true,
        isAdmin: Boolean(profile?.isAdmin),
        acorns: Number(profile?.acorns || 0),
        canCreate: Boolean(profile?.canCreate)
      });
      renderAccount(root, { session, profile });
    } catch (error) {
      if (error.code === "account_banned") {
        await clientSignOut();
      }
      setAccess({ signedIn: false });
      renderAccount(root, {
        error: accountErrorMessage(error)
      });
    }
  }

  async function refreshAccount(root, client, session) {
    if (!session) {
      setAccess({ signedIn: false });
      renderAccount(root);
      return;
    }

    renderAccount(root, { session, loading: true });

    try {
      const { data, error } = await client.rpc("webtoon_bootstrap_profile");
      if (error) {
        throw error;
      }
      setAccess({
        signedIn: true,
        isAdmin: Boolean(data?.isAdmin),
        acorns: Number(data?.acorns || 0),
        canCreate: false
      });
      renderAccount(root, { session, profile: data });
    } catch (error) {
      setAccess({ signedIn: false });
      renderAccount(root, {
        session,
        error: "Supabase SQL을 먼저 실행해야 도토리를 표시할 수 있습니다."
      });
    }
  }

  function renderAccount(root, { session = null, profile = null, loading = false, error = "" } = {}) {
    const name = root.querySelector("[data-account-name]");
    const acorns = root.querySelector("[data-acorns]");
    const acornCount = root.querySelector("[data-acorn-count]");
    const login = root.querySelector("[data-auth-action='login']");
    const claim = root.querySelector("[data-auth-action='claim']");
    const logout = root.querySelector("[data-auth-action='logout']");
    const signedIn = Boolean(session);
    const isAdmin = Boolean(profile?.isAdmin);

    root.dataset.accountStatus = error ? "error" : signedIn ? "signed-in" : "signed-out";
    root.dataset.accountRole = isAdmin ? "admin" : "viewer";
    root.title = error || "";

    if (loading) {
      if (name) {
        name.hidden = false;
        name.textContent = signedIn ? "계정 확인 중" : "연결 중";
      }
      if (login) {
        login.hidden = true;
      }
      if (claim) {
        claim.hidden = true;
      }
      if (logout) {
        logout.hidden = true;
      }
      if (acorns) {
        acorns.hidden = true;
      }
      return;
    }

    if (name) {
      name.hidden = !signedIn;
      const label = profile?.displayName || session?.user?.email?.split("@")[0] || "로그인";
      name.textContent = isAdmin ? `${label} · 관리자` : label;
    }
    if (acorns) {
      acorns.hidden = !signedIn;
    }
    if (acornCount) {
      acornCount.textContent = isAdmin ? "999+" : profile?.acorns ?? "--";
    }
    if (login) {
      login.hidden = signedIn;
    }
    if (claim) {
      claim.hidden = !signedIn || isAdmin;
    }
    if (logout) {
      logout.hidden = !signedIn;
    }
  }

  function setAccess({ signedIn = false, isAdmin = false, acorns = 0, canCreate = false } = {}) {
    accessState.signedIn = Boolean(signedIn);
    accessState.isAdmin = Boolean(isAdmin);
    accessState.acorns = accessState.isAdmin ? Number.POSITIVE_INFINITY : Math.max(0, Number(acorns) || 0);
    accessState.canCreate = Boolean(accessState.signedIn && canCreate);
    accessState.ready = true;
    document.documentElement.dataset.webtoonAccess = accessState.isAdmin ? "admin" : "visitor";
    document.documentElement.dataset.webtoonAccount = accessState.signedIn ? "signed-in" : "signed-out";
    document.dispatchEvent(new CustomEvent("webtoon:access-change", {
      detail: {
        isAdmin: accessState.isAdmin,
        signedIn: accessState.signedIn,
        acorns: accessState.isAdmin ? "unlimited" : accessState.acorns,
        canCreate: accessState.canCreate,
        ready: true
      }
    }));
  }

  async function clientSignOut() {
    const client = getSupabaseClient();
    if (client) {
      await client.auth.signOut();
    }
  }

  async function refreshVisibleAccount() {
    const root = document.querySelector("[data-account]");
    const client = getSupabaseClient();
    if (!root || !client) {
      return;
    }
    const { data } = await client.auth.getSession();
    await refreshOracleAccount(root, data.session);
  }

  function accountErrorMessage(error) {
    const messages = {
      account_banned: "이 계정은 이용이 제한되었습니다.",
      google_login_required: "Google 로그인이 필요합니다.",
      verified_google_email_required: "확인된 Google 계정으로 로그인해주세요.",
      not_enough_acorns: "도토리가 부족합니다.",
      development_in_progress: "웹툰 제작 기능은 현재 개발 중입니다.",
      rate_limited: "요청이 많습니다. 잠시 후 다시 시도해주세요."
    };
    return messages[error?.code] || "계정 정보를 확인하지 못했습니다.";
  }

  function initStudio() {
    const ideaInput = byId("ideaInput");
    if (!ideaInput) {
      return;
    }

    const genreSelect = byId("genreSelect");
    const panelList = byId("panelList");
    const preview = byId("phonePreview");
    const draftButton = byId("draftButton");
    const addPanelButton = byId("addPanelButton");
    const applyEpisodePlanButton = byId("applyEpisodePlanButton");
    const storyEditorPromptButton = byId("storyEditorPromptButton");
    const storyDevelopmentPanel = byId("storyDevelopmentPanel");
    const storySuggestionList = byId("storySuggestionList");
    const approveStoryPlanButton = byId("approveStoryPlanButton");
    const sourceOnlyStoryButton = byId("sourceOnlyStoryButton");
    const storyMustKeep = byId("storyMustKeep");
    const storyMustAvoid = byId("storyMustAvoid");
    const storyboardApprovalPanel = byId("storyboardApprovalPanel");
    const storyboardSceneList = byId("storyboardSceneList");
    const approveAllStoryboardButton = byId("approveAllStoryboardButton");
    const resetStoryboardApprovalButton = byId("resetStoryboardApprovalButton");
    const generationQueuePanel = byId("generationQueuePanel");
    const queueGenerationButton = byId("queueGenerationButton");
    const copyAllPromptPackagesButton = byId("copyAllPromptPackagesButton");
    const regenerateSelectedButton = byId("regenerateSelectedButton");
    const regenerationPanel = byId("regenerationPanel");
    const regenerationInstruction = byId("regenerationInstruction");
    const regenerationInstructionCount = byId("regenerationInstructionCount");
    const regenerationPreserveNote = byId("regenerationPreserveNote");
    const regenerationCameraAngle = byId("regenerationCameraAngle");
    const regenerationCharacterFacing = byId("regenerationCharacterFacing");
    const regenerationCostDialog = byId("regenerationCostDialog");
    const confirmRegenerationCostButton = byId("confirmRegenerationCostButton");
    const studioAssetShelf = byId("studioAssetShelf");
    const selectedPanelLabel = byId("selectedPanelLabel");
    const requestRegenerationButton = byId("requestRegenerationButton");
    const closeRegenerationButton = byId("closeRegenerationButton");
    const regenerationTargetButtons = Array.from(document.querySelectorAll("[data-regeneration-target]"));
    const regenerationCharacterField = byId("regenerationCharacterField");
    const regenerationCharacterSelect = byId("regenerationCharacterSelect");
    const regenerationRegionInputs = Array.from(document.querySelectorAll("[data-region-field]"));
    const regenerationRegionOutputs = Array.from(document.querySelectorAll("[data-region-output]"));
    const regenerationRegionModeButtons = Array.from(document.querySelectorAll("[data-region-mode]"));
    const regenerationRectangleControls = byId("regenerationRectangleControls");
    const regenerationBrushControls = byId("regenerationBrushControls");
    const regenerationRegionSummary = byId("regenerationRegionSummary");
    const regenerationBrushSize = byId("regenerationBrushSize");
    const regenerationBrushSizeOutput = byId("regenerationBrushSizeOutput");
    const regenerationMaskState = byId("regenerationMaskState");
    const regenerationMaskToolButtons = Array.from(document.querySelectorAll("[data-mask-tool]"));
    const undoRegenerationMask = byId("undoRegenerationMask");
    const clearRegenerationMask = byId("clearRegenerationMask");
    const previewWidthButtons = Array.from(document.querySelectorAll("[data-preview-width]"));
    const studioStepElements = Array.from(document.querySelectorAll("[data-studio-step]"));
    let project = loadProject();
    let selectedPanelId = "";
    let advisorTimer = 0;
    let storyAnalysis;
    let studioGenerating = false;
    let studioRegenerating = false;
    let studioDrag = null;
    let regenerationMaskDraw = null;
    let regenerationMaskTool = "paint";
    let regenerationTarget = "background";
    let regenerationCostConfirmed = false;
    let generationPollTimer = 0;
    const completedStudioSteps = new Set();
    const incomingTemplateId = getIncomingTemplateId();
    const incomingScenarioId = getIncomingScenarioId();
    const studioSections = Array.from(document.querySelectorAll("[data-studio-section]"));

    if (incomingTemplateId || incomingScenarioId || !isSupportedProject(project)) {
      project = buildProject({
        templateId: incomingTemplateId || (incomingScenarioId ? "awakening-subway-gate" : ""),
        scenarioId: incomingScenarioId,
        count: incomingScenarioId ? episodeRules.keySceneRange[1] : 16
      });
    }

    project = ensureProjectSchemaV2(project);

    project.panels.forEach(ensurePanelEditingState);
    project.idea = clipText(project.idea, contentLimits.storyMax);
    ideaInput.value = project.idea;
    genreSelect.value = project.genre;
    setPanelCount(project.panelCount || project.panels.length || 16);
    setPreviewWidth(390);

    previewWidthButtons.forEach((button) => {
      button.addEventListener("click", () => setPreviewWidth(Number(button.dataset.previewWidth)));
    });
    selectedPanelId = project.panels[0]?.id || "";
    storyAnalysis = analyzeStory(project.idea);
    renderStoryAdvisor(storyAnalysis);
    renderStoryDevelopment(project);
    renderStoryboardApproval(project, selectedPanelId);
    renderGenerationQueue(project);
    renderStudioAssetShelf(project, selectedPanelId);
    updateIdeaLimitState();
    if (project.panels.length) {
      completedStudioSteps.add("run");
      completedStudioSteps.add("view");
      setStudioProgress(100, "콘티 불러옴", "세로 컷을 확인하고 말풍선과 구도를 바로 다듬어보세요.");
    } else {
      setStudioProgress(0, "대기 중", "이야기를 입력하면 장면과 대사를 구성합니다.");
    }
    updateStudioSteps();
    restoreStudioSectionState();
    renderAll({ persist: false, changed: false });
    hydrateProjectImages(project).then(() => renderAll({ persist: false, changed: false })).catch(() => {});

    studioSections.forEach((section) => {
      section.addEventListener("toggle", persistStudioSectionState);
    });
    window.addEventListener("pagehide", persistStudioSectionState);

    document.addEventListener("webtoon:access-change", () => {
      renderAll({ persist: false, changed: false });
      syncCreationAvailability();
    });

    draftButton.addEventListener("click", async () => {
      if (!updateIdeaLimitState()) {
        flash(`아이디어를 ${contentLimits.storyMin}자 이상 적어주세요`);
        return;
      }
      if (!accessState.signedIn) {
        flash("Google 로그인 후 웹툰을 만들 수 있습니다.");
        return;
      }
      if (!accessState.canCreate) {
        flash("웹툰 제작 기능은 현재 개발 중입니다.");
        return;
      }
      const currentIdea = ideaInput.value.trim();
      if (!isStoryDevelopmentApproved(project, currentIdea)) {
        project = prepareStoryDevelopment(project, currentIdea, genreSelect.value);
        storyAnalysis = analyzeStory(currentIdea);
        renderStoryAdvisor(storyAnalysis);
        renderStoryDevelopment(project, { focus: true });
        setStudioProgress(18, "이야기 보강안 준비", "내가 쓴 사실과 AI가 제안한 내용을 나누었습니다. 사용할 내용만 확인해주세요.");
        saveProject(project);
        syncCreationAvailability();
        flash("보강안을 확인해주세요");
        return;
      }

      const preparedProject = buildProject({
        idea: currentIdea,
        genre: genreSelect.value,
        count: getPanelCount(),
        templateId: project.scenarioId ? (project.templateId || "awakening-subway-gate") : "",
        scenarioId: project.scenarioId || "",
        development: extractStoryDevelopment(project)
      });
      studioGenerating = true;
      draftButton.disabled = true;
      setStudioProgress(6, "콘티 설계", "선택한 이야기만 사용해 장면의 목적과 카메라를 정하고 있습니다.");
      await runStudioProgress();

      storyAnalysis = analyzeStory(ideaInput.value);
      const uiPreferences = project.uiPreferences;
      project = preparedProject;
      if (uiPreferences) {
        project.uiPreferences = uiPreferences;
      }
      selectedPanelId = project.panels[0]?.id || "";
      initializeStoryboardApproval(project);
      project.productionStage = "storyboard-review";
      renderStoryDevelopment(project);
      completedStudioSteps.clear();
      completedStudioSteps.add("run");
      completedStudioSteps.add("view");
      setStudioProgress(100, "콘티 준비", "장면의 목적과 구도를 확인한 뒤 마음에 들면 시안 만들기를 이어가세요.");
      renderAll();
      updateStudioSteps();
      preview.querySelector("[data-studio-panel-id]")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      flash("콘티 준비 완료 · 아직 도토리는 사용하지 않았습니다");
      studioGenerating = false;
      syncCreationAvailability();
    });

    ideaInput.addEventListener("input", () => {
      updateIdeaLimitState();
      if (ideaInput.value.trim() !== project.idea.trim()) {
        if (project.storyIntent?.sourceHash !== hashText(ideaInput.value.trim())) {
          project.storyIntent.approvedAt = "";
          invalidateDownstreamProduction(project, "story");
        }
        completedStudioSteps.clear();
        preview.classList.add("is-stale");
        setStudioProgress(0, "원고 수정 중", "웹툰 만들기를 누르면 새 원고로 콘티를 구성합니다.");
        updateStudioSteps();
      } else if (project.panels.length) {
        completedStudioSteps.add("run");
        completedStudioSteps.add("view");
        preview.classList.remove("is-stale");
        setStudioProgress(100, "콘티 불러옴", "세로 컷을 확인하고 말풍선과 구도를 바로 다듬어보세요.");
        updateStudioSteps();
      }
      syncRegenerateButton();
      window.clearTimeout(advisorTimer);
      advisorTimer = window.setTimeout(() => {
        storyAnalysis = analyzeStory(ideaInput.value);
        renderStoryAdvisor(storyAnalysis);
        renderStoryDevelopment(project);
      }, 120);
    });

    applyEpisodePlanButton?.addEventListener("click", () => {
      storyAnalysis = analyzeStory(ideaInput.value);
      setPanelCount(storyAnalysis.recommendedScenes);
      renderStoryAdvisor(storyAnalysis);
      flash(`${storyAnalysis.recommendedScenes}장면 구성 적용`);
    });

    storyEditorPromptButton?.addEventListener("click", () => {
      storyAnalysis = analyzeStory(ideaInput.value);
      const text = storyEditorPrompt(ideaInput.value, storyAnalysis);
      showExport("AI 스토리 편집 요청문", text);
      copyText(text);
      flash("편집 비서 프롬프트 복사");
    });

    storySuggestionList?.addEventListener("input", (event) => {
      const input = event.target.closest("[data-story-suggestion-text]");
      if (!input) {
        return;
      }
      const suggestion = project.aiSuggestions?.find((item) => item.id === input.dataset.storySuggestionText);
      if (!suggestion) {
        return;
      }
      suggestion.text = clipText(input.value, 240);
      if (input.value !== suggestion.text) {
        input.value = suggestion.text;
      }
      suggestion.approval = suggestion.approval === "rejected" ? "pending" : "edited";
      invalidateDownstreamProduction(project, "story");
      saveProject(project);
    });

    storySuggestionList?.addEventListener("change", (event) => {
      const checkbox = event.target.closest("[data-story-suggestion-toggle]");
      if (!checkbox) {
        return;
      }
      const suggestion = project.aiSuggestions?.find((item) => item.id === checkbox.dataset.storySuggestionToggle);
      if (!suggestion) {
        return;
      }
      suggestion.approval = checkbox.checked ? "accepted" : "rejected";
      invalidateDownstreamProduction(project, "story");
      renderStoryDevelopment(project);
      saveProject(project);
    });

    [storyMustKeep, storyMustAvoid].forEach((input) => {
      input?.addEventListener("input", () => {
        if (!project.storyIntent) {
          return;
        }
        const field = input === storyMustKeep ? "mustKeep" : "mustAvoid";
        project.storyIntent[field] = splitConstraintLines(clipText(input.value, 500));
        project.storyIntent.approvedAt = "";
        invalidateDownstreamProduction(project, "story");
        saveProject(project);
      });
    });

    approveStoryPlanButton?.addEventListener("click", () => {
      if (!project.storyIntent || project.storyIntent.sourceHash !== hashText(ideaInput.value.trim())) {
        project = prepareStoryDevelopment(project, ideaInput.value.trim(), genreSelect.value);
      }
      approveStoryDevelopment(project, { sourceOnly: false });
      renderStoryDevelopment(project);
      setStudioProgress(28, "이야기 선택", "선택한 내용만 사용해 세로 콘티를 구성합니다.");
      saveProject(project);
      flash("선택한 이야기로 콘티를 만듭니다");
      draftButton.click();
    });

    sourceOnlyStoryButton?.addEventListener("click", () => {
      if (!project.storyIntent || project.storyIntent.sourceHash !== hashText(ideaInput.value.trim())) {
        project = prepareStoryDevelopment(project, ideaInput.value.trim(), genreSelect.value);
      }
      approveStoryDevelopment(project, { sourceOnly: true });
      renderStoryDevelopment(project);
      setStudioProgress(28, "원문 잠금", "AI 보강 없이 내가 쓴 내용만 사용해 세로 콘티를 구성합니다.");
      saveProject(project);
      flash("원문만 사용합니다");
      draftButton.click();
    });

    storyboardSceneList?.addEventListener("click", (event) => {
      const selectButton = event.target.closest("[data-storyboard-select]");
      if (selectButton) {
        selectedPanelId = selectButton.dataset.storyboardSelect;
        renderStudioPreview(preview, project, selectedPanelId);
        renderStoryboardApproval(project, selectedPanelId);
        preview.querySelector(`[data-studio-panel-id="${selectedPanelId}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        return;
      }
      const approveButton = event.target.closest("[data-storyboard-approve]");
      if (!approveButton) {
        return;
      }
      const panel = project.panels.find((item) => item.id === approveButton.dataset.storyboardApprove);
      if (!panel) {
        return;
      }
      ensurePanelProductionState(panel, project.panels.indexOf(panel), project);
      panel.storyboardStatus = panel.storyboardStatus === "approved" ? "pending" : "approved";
      panel.panelSpec.approval = panel.storyboardStatus;
      project.storyboardApproval[panel.id] = panel.storyboardStatus === "approved";
      project.productionStage = isStoryboardReady(project) ? "storyboard-approved" : "storyboard-review";
      project.promptPackages = [];
      renderAll();
      flash(panel.storyboardStatus === "approved" ? "이 구도 선택" : "구도 선택 취소");
    });

    approveAllStoryboardButton?.addEventListener("click", () => {
      initializeStoryboardApproval(project, { approveAll: true });
      project.productionStage = "storyboard-approved";
      project.promptPackages = [];
      renderAll();
      flash("이 구도로 시안을 이어갑니다");
    });

    resetStoryboardApprovalButton?.addEventListener("click", () => {
      initializeStoryboardApproval(project, { approveAll: false, reset: true });
      project.productionStage = "storyboard-review";
      project.promptPackages = [];
      renderAll();
      flash("장면 설정을 다시 열었습니다");
    });

    generationQueuePanel?.addEventListener("input", (event) => {
      const scopeInput = event.target.closest("[name='generation-scope']");
      if (scopeInput) {
        if (scopeInput.value === "remaining" && !isRepresentativeBatchApproved(project)) {
          project.generationScope = "representative";
          renderGenerationQueue(project);
          flash("대표 3컷을 먼저 선택해주세요");
          return;
        }
        project.generationScope = scopeInput.value === "remaining" ? "remaining" : "representative";
        saveProject(project);
        renderGenerationQueue(project);
        return;
      }
      const input = event.target.closest("[data-reference-field]");
      if (!input) {
        return;
      }
      const [kind, field] = input.dataset.referenceField.split(".");
      const target = kind === "character" ? project.seriesBible?.characters?.[0] : project.seriesBible?.locations?.[0];
      if (!target || !field) {
        return;
      }
      target[field] = clipText(input.value, 500);
      target.referenceStatus = "pending";
      project.promptPackages = [];
      const root = byId("generationQueuePanel");
      if (root) {
        root.dataset.state = "pending";
      }
      saveProject(project);
    });

    generationQueuePanel?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-reference-approve]");
      if (!button) {
        return;
      }
      const kind = button.dataset.referenceApprove;
      const target = kind === "character" ? project.seriesBible?.characters?.[0] : project.seriesBible?.locations?.[0];
      const complete = kind === "character"
        ? textLength(target?.appearance) >= 5 && textLength(target?.outfitState) >= 3
        : textLength(target?.structure) >= 5 && textLength(target?.lighting) >= 3;
      if (!target || !complete) {
        flash(kind === "character" ? "인물 외형과 의상을 조금 더 적어주세요" : "장소 구조와 조명을 조금 더 적어주세요");
        return;
      }
      target.referenceStatus = "approved";
      target.referenceApprovedAt = new Date().toISOString();
      project.promptPackages = [];
      renderGenerationQueue(project);
      saveProject(project);
      flash(kind === "character" ? "인물 기준 확정" : "장소 기준 확정");
    });

    byId("qualityReviewPanel")?.addEventListener("change", (event) => {
      const localeInput = event.target.closest("[data-publish-locale]");
      if (!localeInput || localeInput.dataset.publishLocale === "ko") {
        return;
      }
      project.publishLocales = [
        "ko",
        ...Array.from(document.querySelectorAll("[data-publish-locale]:checked"))
          .map((input) => input.dataset.publishLocale)
          .filter((locale) => locale !== "ko")
      ];
      project.hasUnpublishedChanges = true;
      renderQualityReview(project);
      saveProject(project);
      flash(localeInput.checked ? `${localeInput.dataset.publishLocale.toUpperCase()} 게시 준비 추가` : `${localeInput.dataset.publishLocale.toUpperCase()} 게시 제외`);
    });

    copyAllPromptPackagesButton?.addEventListener("click", () => {
      if (!project.promptPackages?.length) {
        project.promptPackages = compilePromptPackages(project);
      }
      const text = project.promptPackages.map((item) => item.prompt).join("\n\n---\n\n");
      showExport("컷별 이미지 프롬프트", text);
      copyText(text);
      flash(`${project.promptPackages.length}개 컷 프롬프트 복사`);
    });

    queueGenerationButton?.addEventListener("click", async () => {
      const renderStage = getVisualRenderStage(project);
      const renderLabel = visualStageLabel(renderStage);
      const readiness = getPromptReadiness(project);
      if (!readiness.ready) {
        flash(readiness.issues[0] || "콘티와 기준 자료를 먼저 확인해주세요");
        return;
      }
      if (!accessState.signedIn || !accessState.canCreate) {
        flash(accessState.signedIn ? "웹툰 제작 기능은 현재 개발 중입니다." : "Google 로그인 후 그림 작업을 요청할 수 있습니다.");
        return;
      }
      if (!accessState.isAdmin && accessState.acorns < generationPassCost) {
        flash(`그림 작업에는 도토리 ${generationPassCost}개가 필요합니다.`);
        return;
      }
      project.promptPackages = compilePromptPackages(project);
      const generationBatch = getGenerationBatch(project);
      if (!generationBatch.length) {
        flash("현재 순서에서 요청할 컷이 없습니다");
        return;
      }
      queueGenerationButton.disabled = true;
      setStudioProgress(12, `${renderLabel} 작업 접수`, `${generationBatch.length}개의 ${renderLabel} 요구사항을 서버에 보내고 있습니다.`);
      try {
        const generation = await oracleFetch("/api/webtoon/jobs", {
          method: "POST",
          body: JSON.stringify({
            projectId: project.remoteId || project.id,
            jobType: "draft_generation",
            scenarioKey: project.scenarioId || "studio-panel-packages-v2",
            requestPayload: {
              schemaVersion: projectSchemaVersion,
              compilerVersion: promptCompilerVersion,
              projectId: project.remoteId || project.id,
              episodeId: project.episodeLabel || "EP.01",
              idea: project.idea,
              genre: project.genre,
              storyIntent: project.storyIntent,
              seriesBible: project.seriesBible,
              episodePlan: project.episodePlan,
              renderStage,
              requestedQuality: renderStage === "draft" ? "low" : "high",
              generationScope: project.generationScope,
              promptPackages: generationBatch,
              panels: project.panels.map((panel) => ({
                id: panel.id,
                sceneId: panel.sceneId,
                beat: panel.beat,
                line: panel.line,
                reaction: panel.reaction,
                sfx: panel.sfx,
                panelSpec: panel.panelSpec,
                approvedDraftVersion: renderStage === "final" ? getApprovedVersionForStage(panel, "draft") : null
              }))
            }
          })
        });
        project.generationJobId = generation?.job?.id || generation?.id || "";
        project.productionStage = "generation-queued";
        project.visualWorkflow = {
          ...project.visualWorkflow,
          queuedPass: renderStage,
          queuedJobId: project.generationJobId
        };
        project.promptPackages.forEach((item) => {
          if (generationBatch.some((queuedItem) => queuedItem.panelId === item.panelId)) {
            item.status = "queued";
            item.jobId = project.generationJobId;
          }
        });
        if (!accessState.isAdmin && generation?.profile) {
          setAccess({
            signedIn: true,
            isAdmin: false,
            acorns: Number(generation.profile.acorns || 0),
            canCreate: accessState.canCreate
          });
        }
        setStudioProgress(100, `${renderLabel} 작업 접수 완료`, `컷마다 별도의 ${renderLabel} 프롬프트 파일이 만들어집니다. 결과가 도착하면 검수 단계에서 확인합니다.`);
        saveProject(project);
        renderGenerationQueue(project);
        watchGenerationJob(project.generationJobId);
        flash(accessState.isAdmin ? `관리자 ${renderLabel} 작업 접수` : `${renderLabel} 작업 접수 · 도토리 ${generationPassCost}개 사용`);
      } catch (error) {
        setStudioProgress(0, "접수 실패", accountErrorMessage(error));
        flash(accountErrorMessage(error));
      } finally {
        renderGenerationQueue(project);
      }
    });

    addPanelButton.addEventListener("click", () => {
      if (project.panels.length >= contentLimits.sceneMax) {
        flash(`핵심 장면은 최대 ${contentLimits.sceneMax}장입니다`);
        return;
      }
      const outline = buildSceneOutline({
        genre: project.genre,
        story: project.episodeStory || project.idea,
        count: project.panels.length + 1,
        templateId: project.templateId || ""
      });
      project.panels.push(createPanel(project.genre, project.idea, project.panels.length, outline.at(-1)));
      if (project.templateId === "awakening-subway-gate") {
        decorateAwakeningPanels(project.panels);
      }
      project.panelCount = project.panels.length;
      renderAll();
      flash("장면 추가");
    });

    byId("twistButton").addEventListener("click", () => {
      addTwist(project);
      renderAll();
      flash("반전 추가");
    });

    byId("promptPackButton").addEventListener("click", () => {
      const text = projectToChatGptPrompt(project);
      showExport("ChatGPT Pro 프롬프트", text);
      copyText(text);
      flash("프롬프트 복사");
    });

    byId("saveButton").addEventListener("click", async () => {
      if (project.isPublic && !project.hasUnpublishedChanges) {
        saveProject(project);
        renderProjectState(project);
        flash("이미 게시된 최신 상태입니다");
        return;
      }
      if (project.isPublic && project.hasUnpublishedChanges) {
        project.remoteId = "";
        project.id = createId();
      }
      project.status = "draft";
      project.isPublic = false;
      project.hasUnpublishedChanges = false;
      saveProject(project);
      renderProjectState(project);

      if (!accessState.isAdmin) {
        flash("이 기기에 비공개 초안 저장");
        return;
      }
      const saveResult = await saveProjectToRemote(project, { status: "draft", isPublic: false });
      if (saveResult === "remote") {
        renderProjectState(project);
        flash("서버에 비공개 초안 저장");
        return;
      }
      if (saveResult === "remote-error") {
        flash("로컬 저장 완료, 서버 준비 필요");
        return;
      }
      flash("로컬 저장 완료");
    });

    byId("publishButton")?.addEventListener("click", async (event) => {
      if (!accessState.isAdmin) {
        flash("게시는 관리자만 사용할 수 있습니다");
        return;
      }
      const readiness = getPublishReadiness(project);
      if (!readiness.ready) {
        renderQualityReview(project);
        byId("qualityReviewPanel")?.scrollIntoView({ behavior: "smooth", block: "center" });
        flash(readiness.issues[0] || "그림 검수를 완료해주세요");
        return;
      }
      if (!window.confirm("현재 미리보기 상태를 공개 게시할까요?")) {
        return;
      }

      const button = event.currentTarget;
      button.disabled = true;
      try {
        const saveResult = await saveProjectToRemote(project, { status: "published", isPublic: true });
        if (saveResult === "remote") {
          project.hasUnpublishedChanges = false;
          saveProject(project);
          renderProjectState(project);
          flash("공개 게시 완료");
          return;
        }
        flash(saveResult === "remote-error" ? "게시 실패 · 서버 상태 확인 필요" : "게시 서버 연결 필요");
      } finally {
        button.disabled = false;
      }
    });

    byId("previewButton")?.addEventListener("click", () => {
      saveProject(project);
      window.location.href = "/webtoon/reader/?draft=local";
    });

    byId("exportButton").addEventListener("click", () => {
      const text = projectToText(project);
      showExport("내보내기", text);
      downloadText(`${slugify(project.title)}.txt`, text);
      flash("TXT 내보내기");
    });

    byId("copyExportButton")?.addEventListener("click", () => {
      copyText(byId("exportText").value);
      flash("복사 완료");
    });

    document.querySelectorAll("[data-panel-count]").forEach((button) => {
      button.addEventListener("click", () => {
        setPanelCount(Number(button.dataset.panelCount));
      });
    });

    panelList.addEventListener("input", (event) => {
      const target = event.target;
      const textObjectId = target.dataset.textObjectId;
      if (textObjectId) {
        const id = target.closest("[data-panel-id]")?.dataset.panelId;
        const panel = project.panels.find((item) => item.id === id);
        const textObject = panel?.textObjects?.find((item) => item.id === textObjectId);
        if (!panel || !textObject) return;
        if (target.dataset.textObjectField === "speakerId") {
          textObject.speakerId = clipText(target.value, 80);
        } else if (target.dataset.textObjectField === "tailX" || target.dataset.textObjectField === "tailY") {
          const axis = target.dataset.textObjectField === "tailX" ? "x" : "y";
          textObject.tailTarget[axis] = clampNumber(target.value, 0, 100, axis === "x" ? 50 : 56);
        } else if (target.dataset.textObjectField === "size") {
          textObject.size = clampNumber(target.value, 0.8, 1.4, 1);
        } else {
          const locale = target.dataset.textObjectLocale || "ko";
          textObject.textByLocale[locale] = clipText(target.value, contentLimits.panelFields.line);
          target.value = textObject.textByLocale[locale];
        }
        project.hasUnpublishedChanges = true;
        renderStudioPreview(preview, project, selectedPanelId);
        renderQualityReview(project);
        saveProject(project);
        return;
      }
      if (target.matches("[data-gap-after]")) {
        const id = target.closest("[data-panel-id]")?.dataset.panelId;
        const panel = project.panels.find((item) => item.id === id);
        if (!panel) return;
        panel.gapAfter = clampNumber(target.value, 16, 180, 46);
        target.closest("label")?.querySelector("output")?.replaceChildren(String(Math.round(panel.gapAfter)));
        project.hasUnpublishedChanges = true;
        renderStudioPreview(preview, project, selectedPanelId);
        saveProject(project);
        return;
      }
      const specField = target.dataset.specField;
      if (specField) {
        const id = target.closest("[data-panel-id]")?.dataset.panelId;
        const panel = project.panels.find((item) => item.id === id);
        if (!panel) return;
        ensurePanelProductionState(panel, project.panels.indexOf(panel), project);
        if (specField === "camera.shotSize") {
          panel.panelSpec.camera.shotSize = target.value;
          panel.panelSpec.camera.lensFeel = lensFeelForShot(target.value, panel.panelSpec.camera.angle);
          panel.panelSpec.camera.directorIntent = directorIntentForShot(panel.phase, panel.panelSpec.camera.angle, target.value);
          panel.camera = target.value;
        } else if (specField === "camera.angle") {
          panel.panelSpec.camera.angle = target.value;
          panel.panelSpec.camera.height = cameraHeightForAngle(target.value);
          panel.panelSpec.camera.lensFeel = lensFeelForShot(panel.panelSpec.camera.shotSize, target.value);
          panel.panelSpec.camera.directorIntent = directorIntentForShot(panel.phase, target.value, panel.panelSpec.camera.shotSize);
        } else if (specField === "subject.screenPosition") {
          panel.panelSpec.subjects[0].screenPosition = target.value;
        } else if (specField === "subject.facing") {
          panel.panelSpec.subjects[0].facing = target.value;
          panel.panelSpec.camera.movementAxis = movementAxisForFacing(target.value);
        } else if (["mustInclude", "mustAvoid"].includes(specField)) {
          panel.panelSpec[specField] = splitConstraintLines(target.value);
        }
        invalidatePanelStoryboard(project, panel);
        renderStudioPreview(preview, project, selectedPanelId);
        renderStoryboardApproval(project, selectedPanelId);
        renderGenerationQueue(project);
        saveProject(project);
        return;
      }
      if (target.matches("[data-qc-issue]")) {
        const id = target.closest("[data-panel-id]")?.dataset.panelId;
        const panel = project.panels.find((item) => item.id === id);
        const version = getCurrentImageVersion(panel);
        if (!panel || !version) return;
        version.qc.issues = clipText(target.value, 500).trim()
          ? [{ severity: "warning", category: "human-note", observed: clipText(target.value, 500), suggestedFix: clipText(target.value, 500) }]
          : [];
        project.hasUnpublishedChanges = true;
        saveProject(project);
        return;
      }
      const translationKind = target.dataset.translationKind;
      const translationLocale = target.dataset.translationLocale;
      if (translationKind && ["en", "ja"].includes(translationLocale)) {
        const id = target.closest("[data-panel-id]")?.dataset.panelId;
        const panel = project.panels.find((item) => item.id === id);
        const textObject = panel?.textObjects?.find((item) => item.kind === translationKind);
        if (!panel || !textObject) {
          return;
        }
        const maxLength = contentLimits.panelFields[translationKind === "narration" ? "reaction" : translationKind];
        textObject.textByLocale[translationLocale] = clipText(target.value, maxLength);
        target.value = textObject.textByLocale[translationLocale];
        project.updatedAt = new Date().toISOString();
        project.hasUnpublishedChanges = true;
        renderQualityReview(project);
        saveProject(project);
        return;
      }
      const id = target.closest("[data-panel-id]")?.dataset.panelId;
      const field = target.dataset.field;
      const panel = project.panels.find((item) => item.id === id);
      if (!panel || !field) {
        return;
      }
      const maxLength = contentLimits.panelFields[field];
      const value = maxLength ? clipText(target.value, maxLength) : target.value;
      if (target.value !== value) {
        target.value = value;
      }
      panel[field] = value;
      syncPanelTextObjectsFromLegacy(panel);
      if (field === "beat") {
        ensurePanelProductionState(panel, project.panels.indexOf(panel), project);
        panel.panelSpec.moment = value;
        panel.storyboardStatus = "pending";
        panel.panelSpec.approval = "pending";
        project.storyboardApproval[panel.id] = false;
        project.productionStage = "storyboard-review";
      }
      project.promptPackages = [];
      updateFieldCounter(target, maxLength);
      project.updatedAt = new Date().toISOString();
      project.hasUnpublishedChanges = true;
      renderStudioPreview(preview, project, selectedPanelId);
      renderStats(project);
      renderProjectState(project);
    });

    panelList.addEventListener("change", async (event) => {
      const textVisibility = event.target.closest("[data-text-object-visible]");
      if (textVisibility) {
        const id = textVisibility.closest("[data-panel-id]")?.dataset.panelId;
        const panel = project.panels.find((item) => item.id === id);
        const textObject = panel?.textObjects?.find((item) => item.id === textVisibility.dataset.textObjectVisible);
        if (!panel || !textObject) return;
        textObject.visible = textVisibility.checked;
        project.hasUnpublishedChanges = true;
        renderStudioPreview(preview, project, selectedPanelId);
        renderQualityReview(project);
        saveProject(project);
        return;
      }
      const qcInput = event.target.closest("[data-qc-check]");
      if (qcInput) {
        const id = qcInput.closest("[data-panel-id]")?.dataset.panelId;
        const panel = project.panels.find((item) => item.id === id);
        const version = getCurrentImageVersion(panel);
        if (!panel || !version || !Object.hasOwn(version.qc.checks, qcInput.dataset.qcCheck)) return;
        version.qc.checks[qcInput.dataset.qcCheck] = qcInput.checked;
        updateQcSummary(version);
        panel.qcStatus = version.qc.overall === "approved" ? "approved" : version.qc.overall;
        if (version.qc.overall !== "approved" && version.renderStage === "draft" && panel.draftApprovedVersionId === version.id) {
          panel.draftApprovedVersionId = "";
          version.status = "needs-fix";
        }
        if (version.qc.overall !== "approved" && version.renderStage === "final" && panel.approvedVersionId === version.id) {
          panel.finalApprovedVersionId = "";
          panel.approvedVersionId = "";
          version.status = "needs-fix";
        }
        syncVisualWorkflow(project);
        project.hasUnpublishedChanges = true;
        renderAll();
        return;
      }
      const versionSelect = event.target.closest("[data-image-version]");
      if (versionSelect) {
        const id = versionSelect.closest("[data-panel-id]")?.dataset.panelId;
        const panel = project.panels.find((item) => item.id === id);
        const version = panel?.imageVersions?.find((item) => item.id === versionSelect.value);
        if (!panel || !version) {
          return;
        }
        await activatePanelVersion(panel, version);
        selectedPanelId = panel.id;
        renderAll();
        flash(version.status === "approved" ? "선택한 버전으로 전환" : "후보 버전으로 전환");
        return;
      }
      const visibilityInput = event.target.closest("[data-visibility]");
      if (visibilityInput) {
        const id = visibilityInput.closest("[data-panel-id]")?.dataset.panelId;
        const panel = project.panels.find((item) => item.id === id);
        const key = visibilityInput.dataset.visibility;
        if (!panel || !Object.hasOwn(overlayDefaults, key)) {
          return;
        }
        ensurePanelEditingState(panel);
        panel.overlayVisibility[key] = visibilityInput.checked;
        syncPanelTextObjectsFromLegacy(panel);
        selectedPanelId = panel.id;
        project.updatedAt = new Date().toISOString();
        project.hasUnpublishedChanges = true;
        renderStudioPreview(preview, project, selectedPanelId);
        renderProjectState(project);
        saveProject(project);
        flash(`${overlayLabel(key)} ${visibilityInput.checked ? "표시" : "숨김"}`);
        return;
      }
      const input = event.target.closest("[data-image-input]");
      if (!input) {
        return;
      }
      const id = input.closest("[data-panel-id]")?.dataset.panelId;
      const panel = project.panels.find((item) => item.id === id);
      const file = input.files?.[0];
      if (!panel || !file) {
        return;
      }
      try {
        await importPanelImage(panel, file);
      } catch (error) {
        flash(error.message || "이미지 실패");
      } finally {
        input.value = "";
      }
    });

    panelList.addEventListener("dragover", (event) => {
      const slot = event.target.closest(".image-slot");
      if (!slot) {
        return;
      }
      event.preventDefault();
      slot.classList.add("is-dragover");
    });

    panelList.addEventListener("dragleave", (event) => {
      event.target.closest(".image-slot")?.classList.remove("is-dragover");
    });

    panelList.addEventListener("drop", async (event) => {
      const slot = event.target.closest(".image-slot");
      if (!slot) {
        return;
      }
      event.preventDefault();
      slot.classList.remove("is-dragover");
      const id = slot.closest("[data-panel-id]")?.dataset.panelId;
      const panel = project.panels.find((item) => item.id === id);
      const file = event.dataTransfer?.files?.[0];
      if (!panel || !file) {
        return;
      }
      selectedPanelId = panel.id;
      try {
        await importPanelImage(panel, file);
      } catch (error) {
        flash(error.message || "이미지 실패");
      }
    });

    document.addEventListener("paste", async (event) => {
      if (!selectedPanelId || !document.body.contains(panelList)) {
        return;
      }
      const item = Array.from(event.clipboardData?.items || []).find((entry) => entry.type.startsWith("image/"));
      if (!item) {
        return;
      }
      const panel = project.panels.find((entry) => entry.id === selectedPanelId);
      const file = item.getAsFile();
      if (!panel || !file) {
        return;
      }
      event.preventDefault();
      try {
        await importPanelImage(panel, file);
      } catch (error) {
        flash(error.message || "붙여넣기 실패");
      }
    });

    panelList.addEventListener("click", async (event) => {
      const slot = event.target.closest(".image-slot");
      if (slot) {
        selectedPanelId = slot.closest("[data-panel-id]")?.dataset.panelId || "";
        document.querySelectorAll(".image-slot.is-active").forEach((item) => item.classList.remove("is-active"));
        slot.classList.add("is-active");
        flash("붙여넣기 대상");
        return;
      }
      const button = event.target.closest("[data-action]");
      if (!button) {
        return;
      }
      const id = button.closest("[data-panel-id]")?.dataset.panelId;
      const index = project.panels.findIndex((panel) => panel.id === id);
      if (index < 0) {
        return;
      }
      const action = button.dataset.action;
      if (action === "copy-prompt") {
        const text = panelToChatGptPrompt(project, project.panels[index], index);
        showExport(`${index + 1}컷 프롬프트`, text);
        copyText(text);
        flash("컷 프롬프트 복사");
        return;
      }
      if (action === "clear-image") {
        const panel = project.panels[index];
        ensurePanelVersionState(panel, project);
        await Promise.all((panel.imageVersions || []).map((version) => deletePanelImage(version.imageKey).catch(() => {})));
        panel.imageVersions = [];
        panel.currentVersionId = "";
        panel.draftApprovedVersionId = "";
        panel.finalApprovedVersionId = "";
        panel.approvedVersionId = "";
        panel.qcStatus = "missing";
        delete panel.imageData;
        delete panel.imageKey;
        delete panel.imageName;
        delete panel.imageUpdatedAt;
        project.visualWorkflow = {
          ...project.visualWorkflow,
          generationPass: "draft",
          stage: "draft-ready",
          draftApprovedAt: "",
          finalApprovedAt: ""
        };
        project.promptPackages = [];
        renderAll();
        flash("이미지 제거");
        return;
      }
      if (action === "sync-draft-asset") {
        const panel = project.panels[index];
        ensurePanelVersionState(panel, project);
        const version = getCurrentImageVersion(panel);
        if (!version || version.renderStage !== "draft") return;
        try {
          await uploadApprovedDraftAsset(project, panel, version);
          project.promptPackages = [];
          saveProject(project);
          renderAll();
          flash("선택 시안을 완성화 참조로 저장했습니다");
        } catch (error) {
          version.assetSyncStatus = "failed";
          renderAll();
          flash(accountErrorMessage(error));
        }
        return;
      }
      if (action === "approve-image-version" || action === "flag-image-version") {
        const panel = project.panels[index];
        ensurePanelVersionState(panel, project);
        const version = getCurrentImageVersion(panel);
        if (!version) {
          flash("먼저 이미지를 가져오세요");
          return;
        }
        if (action === "approve-image-version") {
          const renderStage = version.renderStage || getVisualRenderStage(project);
          panel.imageVersions.forEach((item) => {
            if (item.renderStage === renderStage) {
              item.status = item.id === version.id ? "approved" : (item.status === "approved" ? "superseded" : item.status);
            }
          });
          version.qc = {
            ...createPanelQc(),
            checks: Object.fromEntries(Object.keys(createPanelQc().checks).map((key) => [key, true])),
            overall: "approved",
            storyMatch: "passed",
            characterContinuity: "passed",
            spatialContinuity: "passed",
            anatomy: "passed",
            textArtifacts: "passed",
            storyMatchScore: 100,
            continuityScore: 100,
            visualQualityScore: 100,
            reviewSource: "human",
            reviewedAt: new Date().toISOString(),
            issues: []
          };
          if (renderStage === "draft") {
            panel.draftApprovedVersionId = version.id;
            try {
              await uploadApprovedDraftAsset(project, panel, version);
            } catch (_error) {
              version.assetSyncStatus = "failed";
            }
          } else {
            panel.finalApprovedVersionId = version.id;
            panel.approvedVersionId = version.id;
          }
          panel.qcStatus = "approved";
          syncVisualWorkflow(project);
          const unsyncedDraftCount = project.panels.filter((item) => {
            const approvedDraft = getApprovedVersionForStage(item, "draft");
            return approvedDraft && !approvedDraftReferenceSource(approvedDraft);
          }).length;
          if (renderStage === "draft" && project.visualWorkflow.generationPass === "final" && !unsyncedDraftCount) {
            project.generationScope = "representative";
            project.promptPackages = [];
            flash("모든 시안 선택 완료 · 이 구도로 완성화합니다");
          } else if (renderStage === "draft" && unsyncedDraftCount) {
            flash(`시안 구도 선택 · 서버 참조 저장 ${unsyncedDraftCount}컷 필요`);
          } else {
            flash(renderStage === "draft" ? "이 시안 구도 사용" : "이 완성본 사용");
          }
        } else {
          const renderStage = version.renderStage || getVisualRenderStage(project);
          version.status = "needs-fix";
          version.qc = {
            ...createPanelQc(),
            overall: "needs-fix",
            checks: { ...createPanelQc().checks },
            reviewedAt: new Date().toISOString(),
            issues: [{
              severity: "warning",
              category: "human-review",
              expected: panel.panelSpec?.moment || panel.beat,
              observed: "이야기 또는 설정과 맞지 않아 선택 수정이 필요합니다.",
              suggestedFix: "검수 항목을 확인하고 잘못된 부분만 다시 그립니다.",
              region: { mode: "full-panel" }
            }]
          };
          if (renderStage === "draft" && panel.draftApprovedVersionId === version.id) {
            panel.draftApprovedVersionId = "";
          }
          if (renderStage === "final" && panel.approvedVersionId === version.id) {
            panel.finalApprovedVersionId = "";
            panel.approvedVersionId = "";
          }
          panel.qcStatus = "needs-fix";
          selectedPanelId = panel.id;
          regenerationPanel.hidden = false;
          regenerateSelectedButton?.setAttribute("aria-expanded", "true");
          flash("수정할 부분을 선택해주세요");
        }
        syncVisualWorkflow(project);
        project.updatedAt = new Date().toISOString();
        project.hasUnpublishedChanges = true;
        renderAll();
        return;
      }
      if (action === "select-image-version") {
        const panel = project.panels[index];
        const version = panel.imageVersions?.find((item) => item.id === button.dataset.versionId);
        if (!version) return;
        await activatePanelVersion(panel, version);
        selectedPanelId = panel.id;
        renderAll();
        flash(version.status === "approved" ? "사용할 버전 선택" : "비교할 후보 선택");
        return;
      }
      if (action === "prepare-qc-fix") {
        const panel = project.panels[index];
        const version = getCurrentImageVersion(panel);
        if (!version) return;
        selectedPanelId = panel.id;
        const instruction = buildQcFixInstruction(panel, version);
        regenerationInstruction.value = instruction;
        regenerationInstructionCount.textContent = `${textLength(instruction)} / ${contentLimits.regenerationInstructionMax}`;
        regenerationPanel.hidden = false;
        regenerateSelectedButton?.setAttribute("aria-expanded", "true");
        syncRegenerateButton();
        regenerationPanel.scrollIntoView({ behavior: "smooth", block: "center" });
        flash("검수 결과로 수정문을 준비했습니다");
        return;
      }
      if (action === "reset-overlays") {
        project.panels[index].overlayPositions = cloneOverlayDefaults();
        selectedPanelId = project.panels[index].id;
        project.updatedAt = new Date().toISOString();
        project.hasUnpublishedChanges = true;
        renderAll();
        flash("텍스트 위치 초기화");
        return;
      }
      if (action === "add-dialogue" || action === "add-thought") {
        const panel = project.panels[index];
        ensurePanelEditingState(panel);
        const extras = panel.textObjects.filter((item) => ["dialogue", "thought"].includes(item.kind));
        if (extras.length >= 5) {
          flash("추가 말풍선은 한 컷에 최대 5개입니다");
          return;
        }
        const kind = action === "add-thought" ? "thought" : "dialogue";
        panel.textObjects.push({
          id: `text-${panel.id}-${Date.now()}-${extras.length + 1}`,
          kind,
          order: panel.textObjects.length,
          speakerId: "hero",
          textByLocale: { ko: kind === "thought" ? "마음속 말을 입력하세요." : "추가 대사를 입력하세요.", en: "", ja: "" },
          visible: true,
          position: { x: 48 + extras.length * 5, y: 20 + extras.length * 11 },
          tailTarget: { x: 50, y: 56 },
          size: 1,
          locked: false,
          stylePreset: kind === "thought" ? "thought" : "speech",
          style: { variant: kind === "thought" ? "thought" : "speech" }
        });
        project.hasUnpublishedChanges = true;
        renderAll();
        flash(kind === "thought" ? "생각 말풍선 추가" : "말풍선 추가");
        return;
      }
      if (action === "delete-text-object") {
        const panel = project.panels[index];
        panel.textObjects = panel.textObjects.filter((item) => item.id !== button.dataset.textObjectId);
        project.hasUnpublishedChanges = true;
        renderAll();
        flash("추가 말풍선 삭제");
        return;
      }
      if (action === "text-object-up" || action === "text-object-down") {
        const panel = project.panels[index];
        ensurePanelEditingState(panel);
        const extras = panel.textObjects
          .filter((item) => ["dialogue", "thought"].includes(item.kind))
          .sort((a, b) => a.order - b.order);
        const currentIndex = extras.findIndex((item) => item.id === button.dataset.textObjectId);
        const nextIndex = action === "text-object-up" ? currentIndex - 1 : currentIndex + 1;
        if (currentIndex < 0 || nextIndex < 0 || nextIndex >= extras.length) return;
        [extras[currentIndex], extras[nextIndex]] = [extras[nextIndex], extras[currentIndex]];
        extras.forEach((item, order) => {
          item.order = 3 + order;
        });
        panel.textObjects = panel.textObjects.sort((a, b) => a.order - b.order);
        project.hasUnpublishedChanges = true;
        renderAll();
        flash("말풍선 읽기 순서를 바꿨습니다");
        return;
      }
      if (action === "split-panel") {
        if (project.panels.length >= contentLimits.sceneMax) {
          flash(`핵심 장면은 최대 ${contentLimits.sceneMax}장입니다`);
          return;
        }
        const source = project.panels[index];
        const [firstMoment, secondMoment] = splitPanelMoment(source.panelSpec?.moment || source.beat);
        const next = structuredCloneSafe(source);
        await clearPanelVisualState(source);
        clearPanelVisualMetadata(next);
        next.id = createId();
        next.sceneId = source.sceneId;
        next.beat = secondMoment;
        next.panelSpec.id = `spec-${next.id}`;
        next.panelSpec.moment = secondMoment;
        next.panelSpec.camera = { ...next.panelSpec.camera, shotSize: "close", focalTarget: "행동 직후의 표정 또는 결과" };
        next.camera = "close";
        next.reaction = "";
        next.storyboardStatus = "pending";
        source.beat = firstMoment;
        source.panelSpec.moment = firstMoment;
        source.line = "";
        invalidatePanelStoryboard(project, source);
        delete source.textObjects;
        delete next.textObjects;
        ensurePanelEditingState(source);
        ensurePanelEditingState(next);
        project.panels.splice(index + 1, 0, next);
        initializeStoryboardApproval(project, { reset: true });
        project.panelCount = project.panels.length;
        selectedPanelId = source.id;
        renderAll();
        flash("한 순간씩 두 컷으로 나눴습니다");
        return;
      }
      if (action === "merge-next" && index < project.panels.length - 1) {
        const panel = project.panels[index];
        const next = project.panels[index + 1];
        await clearPanelVisualState(panel);
        await clearPanelVisualState(next);
        panel.beat = clipText(next.panelSpec?.moment || next.beat, contentLimits.panelFields.beat);
        panel.line = next.line || panel.line;
        panel.sfx = next.sfx || panel.sfx;
        panel.reaction = panel.reaction || next.reaction;
        panel.panelSpec.storyFact = clipText(`${panel.panelSpec.storyFact}; ${next.panelSpec?.storyFact || next.beat}`, 480);
        panel.panelSpec.moment = panel.beat;
        panel.panelSpec.continuity = { ...(panel.panelSpec.continuity || {}), mergedFromPanelId: next.id };
        invalidatePanelStoryboard(project, panel);
        delete panel.textObjects;
        ensurePanelEditingState(panel);
        project.panels.splice(index + 1, 1);
        initializeStoryboardApproval(project, { reset: true });
        project.panelCount = project.panels.length;
        selectedPanelId = panel.id;
        renderAll();
        flash("다음 컷의 결과 순간으로 합쳤습니다");
        return;
      }
      if (action === "up" && index > 0) {
        [project.panels[index - 1], project.panels[index]] = [project.panels[index], project.panels[index - 1]];
        initializeStoryboardApproval(project, { reset: true });
      }
      if (action === "down" && index < project.panels.length - 1) {
        [project.panels[index + 1], project.panels[index]] = [project.panels[index], project.panels[index + 1]];
        initializeStoryboardApproval(project, { reset: true });
      }
      if (action === "delete" && project.panels.length > contentLimits.manualSceneMin) {
        project.panels.splice(index, 1);
        initializeStoryboardApproval(project);
      }
      project.panelCount = project.panels.length;
      renderAll();
    });

    preview.addEventListener("click", (event) => {
      const panelElement = event.target.closest("[data-studio-panel-id]");
      if (!panelElement) {
        return;
      }
      selectStudioPanel(panelElement.dataset.studioPanelId);
    });

    preview.addEventListener("beforeinput", (event) => {
      if (!event.target.closest(".studio-editable-overlay") || ideaInput.value.trim() === project.idea.trim()) {
        return;
      }
      event.preventDefault();
      flash("새 원고로 웹툰을 먼저 만들어주세요");
    });

    preview.addEventListener("input", (event) => {
      const overlay = event.target.closest(".studio-editable-overlay");
      if (!overlay) {
        return;
      }
      if (ideaInput.value.trim() !== project.idea.trim()) {
        renderStudioPreview(preview, project, selectedPanelId);
        preview.classList.add("is-stale");
        flash("새 원고로 웹툰을 먼저 만들어주세요");
        return;
      }
      const panel = project.panels.find((item) => item.id === overlay.dataset.panelId);
      const extraTextObject = panel?.textObjects?.find((item) => item.id === overlay.dataset.textObjectEdit);
      if (panel && extraTextObject) {
        const clipped = clipText(overlay.textContent || "", contentLimits.panelFields.line);
        if (overlay.textContent !== clipped) {
          overlay.textContent = clipped;
          placeCaretAtEnd(overlay);
        }
        extraTextObject.textByLocale.ko = clipped;
        project.updatedAt = new Date().toISOString();
        project.hasUnpublishedChanges = true;
        completedStudioSteps.add("speech");
        updateStudioSteps();
        renderProjectState(project);
        saveProject(project);
        return;
      }
      const field = overlay.dataset.overlayField;
      const overlayKey = overlayKeyForField(field);
      const maxLength = contentLimits.panelFields[field];
      if (!panel || !maxLength || !Object.hasOwn(overlayDefaults, overlayKey)) {
        return;
      }
      const clipped = clipText(overlay.textContent || "", maxLength);
      if (overlay.textContent !== clipped) {
        overlay.textContent = clipped;
        placeCaretAtEnd(overlay);
      }
      panel[field] = clipped;
      syncPanelTextObjectsFromLegacy(panel);
      project.updatedAt = new Date().toISOString();
      project.hasUnpublishedChanges = true;
      const counter = field === "line"
        ? overlay.closest(".studio-guide-panel")?.querySelector("[data-studio-bubble-count]")
        : null;
      if (counter && field === "line") {
        counter.textContent = `${textLength(clipped)} / ${contentLimits.panelFields.line}`;
        counter.classList.toggle("is-recommended-over", textLength(clipped) > contentLimits.dialogueRecommendedMax);
      }
      completedStudioSteps.add("speech");
      updateStudioSteps();
      renderProjectState(project);
      saveProject(project);
    });

    preview.addEventListener("blur", (event) => {
      const overlay = event.target.closest(".studio-editable-overlay");
      if (!overlay) {
        return;
      }
      if (ideaInput.value.trim() !== project.idea.trim()) {
        renderStudioPreview(preview, project, selectedPanelId);
        preview.classList.add("is-stale");
        return;
      }
      const panel = project.panels.find((item) => item.id === overlay.dataset.panelId);
      const extraTextObject = panel?.textObjects?.find((item) => item.id === overlay.dataset.textObjectEdit);
      if (panel && extraTextObject) {
        extraTextObject.textByLocale.ko = (overlay.textContent || "").trim() || "추가 대사를 입력하세요.";
        overlay.textContent = extraTextObject.textByLocale.ko;
        saveProject(project);
        renderPanelList(panelList, project);
        return;
      }
      const field = overlay.dataset.overlayField;
      const overlayKey = overlayKeyForField(field);
      if (!panel || !Object.hasOwn(overlayDefaults, overlayKey)) {
        return;
      }
      const fallback = { line: "대사를 입력하세요.", reaction: "나레이션을 입력하세요.", sfx: "효과음" }[field];
      panel[field] = (overlay.textContent || "").trim() || fallback;
      overlay.textContent = panel[field];
      saveProject(project);
      renderPanelList(panelList, project);
    }, true);

    preview.addEventListener("pointerdown", (event) => {
      const maskCanvas = event.target.closest("[data-regeneration-mask-canvas]");
      if (maskCanvas) {
        const panelElement = maskCanvas.closest("[data-studio-panel-id]");
        const panel = project.panels.find((item) => item.id === panelElement?.dataset.studioPanelId);
        if (!panel || panel.id !== selectedPanelId) return;
        event.preventDefault();
        event.stopPropagation();
        const mask = normalizeRegenerationMask(panel.regenerationDraftMask);
        if (mask.strokes.length >= regenerationMaskRules.maxStrokes) mask.strokes.shift();
        const stroke = {
          tool: regenerationMaskTool,
          size: clampNumber(mask.brushSize, 8, 72, 28),
          points: [regenerationMaskPoint(event, maskCanvas)]
        };
        mask.strokes.push(stroke);
        mask.updatedAt = new Date().toISOString();
        panel.regenerationDraftMask = mask;
        regenerationMaskDraw = { pointerId: event.pointerId, panel, canvas: maskCanvas, stroke };
        maskCanvas.setPointerCapture?.(event.pointerId);
        drawRegenerationMask(maskCanvas, mask, { visual: true });
        return;
      }
      const textObjectHandle = event.target.closest("[data-text-object-handle]");
      const overlayHandle = event.target.closest("[data-overlay-handle]");
      const compositionHandle = event.target.closest("[data-composition-handle]");
      const handle = textObjectHandle || overlayHandle || compositionHandle;
      if (!handle) {
        return;
      }
      if (ideaInput.value.trim() !== project.idea.trim()) {
        flash("새 원고로 웹툰을 먼저 만들어주세요");
        return;
      }
      const panelElement = handle.closest("[data-studio-panel-id]");
      const panel = project.panels.find((item) => item.id === panelElement?.dataset.studioPanelId);
      if (!panel || !panelElement) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      selectStudioPanel(panel.id);
      const rect = panelElement.getBoundingClientRect();
      if (textObjectHandle) {
        const textObject = panel.textObjects.find((item) => item.id === textObjectHandle.dataset.textObjectHandle);
        const overlayElement = textObjectHandle.closest("[data-text-object-overlay]");
        if (!textObject || !overlayElement) return;
        const overlayRect = overlayElement.getBoundingClientRect();
        studioDrag = {
          type: "text-object",
          textObject,
          pointerId: event.pointerId,
          panel,
          panelElement,
          overlayElement,
          handle,
          rect,
          startX: event.clientX,
          startY: event.clientY,
          originX: textObject.position.x,
          originY: textObject.position.y,
          maxX: Math.max(0, 100 - (overlayRect.width / rect.width) * 100),
          maxY: Math.max(0, 100 - (overlayRect.height / rect.height) * 100)
        };
      } else if (overlayHandle) {
        const kind = overlayHandle.dataset.overlayHandle;
        const overlayElement = overlayHandle.closest("[data-overlay-kind]");
        if (!overlayElement || !Object.hasOwn(overlayDefaults, kind)) {
          return;
        }
        ensurePanelEditingState(panel);
        const point = overlayPosition(panel, kind);
        const overlayRect = overlayElement.getBoundingClientRect();
        studioDrag = {
          type: "overlay",
          kind,
          pointerId: event.pointerId,
          panel,
          panelElement,
          overlayElement,
          handle,
          rect,
          startX: event.clientX,
          startY: event.clientY,
          originX: point.x,
          originY: point.y,
          maxX: Math.max(0, 100 - (overlayRect.width / rect.width) * 100),
          maxY: Math.max(0, 100 - (overlayRect.height / rect.height) * 100)
        };
      } else {
        studioDrag = {
          type: "composition",
          pointerId: event.pointerId,
          panel,
          panelElement,
          handle,
          rect,
          startX: event.clientX,
          startY: event.clientY,
          frameX: Number(panel.frameX ?? 50),
          frameY: Number(panel.frameY ?? 50)
        };
      }
      handle.setPointerCapture?.(event.pointerId);
      handle.classList.add("is-dragging");
    });

    preview.addEventListener("pointermove", (event) => {
      if (regenerationMaskDraw?.pointerId === event.pointerId) {
        event.preventDefault();
        const point = regenerationMaskPoint(event, regenerationMaskDraw.canvas);
        const points = regenerationMaskDraw.stroke.points;
        const previous = points[points.length - 1];
        const distance = Math.hypot(point.x - previous.x, point.y - previous.y);
        if (distance >= 0.65 && points.length < regenerationMaskRules.maxPointsPerStroke) {
          points.push(point);
          regenerationMaskDraw.panel.regenerationDraftMask.updatedAt = new Date().toISOString();
          drawRegenerationMask(regenerationMaskDraw.canvas, regenerationMaskDraw.panel.regenerationDraftMask, { visual: true });
        }
        return;
      }
      if (!studioDrag || studioDrag.pointerId !== event.pointerId) {
        return;
      }
      event.preventDefault();
      if (studioDrag.type === "overlay") {
        const x = Math.max(0, Math.min(studioDrag.maxX, studioDrag.originX + ((event.clientX - studioDrag.startX) / studioDrag.rect.width) * 100));
        const y = Math.max(0, Math.min(studioDrag.maxY, studioDrag.originY + ((event.clientY - studioDrag.startY) / studioDrag.rect.height) * 100));
        studioDrag.panel.overlayPositions[studioDrag.kind] = {
          x: Math.round(x * 10) / 10,
          y: Math.round(y * 10) / 10
        };
        syncPanelTextObjectsFromLegacy(studioDrag.panel);
        studioDrag.overlayElement.style.setProperty("--overlay-x", `${studioDrag.panel.overlayPositions[studioDrag.kind].x}%`);
        studioDrag.overlayElement.style.setProperty("--overlay-y", `${studioDrag.panel.overlayPositions[studioDrag.kind].y}%`);
        return;
      }
      if (studioDrag.type === "text-object") {
        const x = Math.max(0, Math.min(studioDrag.maxX, studioDrag.originX + ((event.clientX - studioDrag.startX) / studioDrag.rect.width) * 100));
        const y = Math.max(0, Math.min(studioDrag.maxY, studioDrag.originY + ((event.clientY - studioDrag.startY) / studioDrag.rect.height) * 100));
        studioDrag.textObject.position = { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
        studioDrag.overlayElement.style.setProperty("--overlay-x", `${studioDrag.textObject.position.x}%`);
        studioDrag.overlayElement.style.setProperty("--overlay-y", `${studioDrag.textObject.position.y}%`);
        return;
      }
      const x = Math.max(12, Math.min(88, studioDrag.frameX + ((event.clientX - studioDrag.startX) / studioDrag.rect.width) * 100));
      const y = Math.max(12, Math.min(88, studioDrag.frameY + ((event.clientY - studioDrag.startY) / studioDrag.rect.height) * 100));
      studioDrag.panel.frameX = Math.round(x * 10) / 10;
      studioDrag.panel.frameY = Math.round(y * 10) / 10;
      studioDrag.panelElement.style.setProperty("--frame-x", `${studioDrag.panel.frameX}%`);
      studioDrag.panelElement.style.setProperty("--frame-y", `${studioDrag.panel.frameY}%`);
    });

    ["pointerup", "pointercancel"].forEach((eventName) => {
      preview.addEventListener(eventName, (event) => {
        if (regenerationMaskDraw?.pointerId === event.pointerId) {
          const completedMask = regenerationMaskDraw.panel.regenerationDraftMask;
          regenerationMaskDraw.canvas.releasePointerCapture?.(event.pointerId);
          regenerationMaskDraw = null;
          project.updatedAt = new Date().toISOString();
          project.hasUnpublishedChanges = true;
          saveProject(project);
          syncRegenerationRegionEditor({ resetForTarget: false });
          renderStudioPreview(preview, project, selectedPanelId);
          flash(completedMask.strokes.at(-1)?.tool === "erase" ? "지운 영역을 반영했습니다" : "수정할 영역을 칠했습니다");
          return;
        }
        if (!studioDrag || studioDrag.pointerId !== event.pointerId) {
          return;
        }
        const savedDrag = studioDrag;
        savedDrag.handle.classList.remove("is-dragging");
        studioDrag = null;
        project.updatedAt = new Date().toISOString();
        project.hasUnpublishedChanges = true;
        completedStudioSteps.add("move");
        updateStudioSteps();
        renderProjectState(project);
        saveProject(project);
        flash(savedDrag.type === "overlay" ? `${overlayLabel(savedDrag.kind)} 위치 저장` : savedDrag.type === "text-object" ? "추가 말풍선 위치 저장" : "컷 구도 저장");
      });
    });

    regenerateSelectedButton?.addEventListener("click", () => {
      if (!regenerationPanel || regenerateSelectedButton.disabled) {
        return;
      }
      const willOpen = regenerationPanel.hidden;
      regenerationPanel.hidden = !willOpen;
      regenerateSelectedButton.setAttribute("aria-expanded", String(willOpen));
      if (willOpen) {
        syncRegenerationRegionEditor({ resetForTarget: false });
        syncRegenerateButton();
        regenerationPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
        regenerationInstruction?.focus({ preventScroll: true });
      }
    });

    closeRegenerationButton?.addEventListener("click", () => {
      regenerationPanel.hidden = true;
      regenerateSelectedButton?.setAttribute("aria-expanded", "false");
      regenerateSelectedButton?.focus();
    });

    regenerationTargetButtons.forEach((button) => {
      button.addEventListener("click", () => {
        regenerationTarget = button.dataset.regenerationTarget;
        syncRegenerationRegionEditor({ resetForTarget: true });
        renderStudioPreview(preview, project, selectedPanelId);
        syncRegenerateButton();
      });
    });

    [regenerationCameraAngle, regenerationCharacterFacing].forEach((select) => {
      select?.addEventListener("change", () => {
        const panel = project.panels.find((item) => item.id === selectedPanelId);
        if (!panel) return;
        ensurePanelProductionState(panel, project.panels.indexOf(panel), project);
        if (select === regenerationCameraAngle) {
          panel.panelSpec.camera.angle = select.value;
          panel.panelSpec.camera.height = cameraHeightForAngle(select.value);
          panel.panelSpec.camera.lensFeel = lensFeelForShot(panel.panelSpec.camera.shotSize, select.value);
          panel.panelSpec.camera.directorIntent = directorIntentForShot(panel.phase, select.value, panel.panelSpec.camera.shotSize);
        } else if (panel.panelSpec.subjects?.[0]) {
          panel.panelSpec.subjects[0].facing = select.value;
          panel.panelSpec.camera.movementAxis = movementAxisForFacing(select.value);
        }
        invalidatePanelStoryboard(project, panel);
        project.hasUnpublishedChanges = true;
        renderStudioPreview(preview, project, selectedPanelId);
        renderStoryboardApproval(project, selectedPanelId);
        renderGenerationQueue(project);
        saveProject(project);
      });
    });

    confirmRegenerationCostButton?.addEventListener("click", (event) => {
      event.preventDefault();
      regenerationCostConfirmed = true;
      regenerationCostDialog?.close();
      requestRegenerationButton?.click();
    });

    studioAssetShelf?.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-reuse-scene]");
      if (!button) return;
      const sourcePanel = project.panels.find((item) => item.id === button.dataset.sourcePanelId);
      const sourceVersion = sourcePanel?.imageVersions?.find((item) => item.id === button.dataset.versionId);
      const targetPanel = project.panels.find((item) => item.id === selectedPanelId);
      if (!sourcePanel || !sourceVersion || !targetPanel) return;
      try {
        await reuseStoredScene(project, sourcePanel, sourceVersion, targetPanel);
        completedStudioSteps.add("reuse");
        renderAll();
        updateStudioSteps();
        flash(`${project.panels.indexOf(sourcePanel) + 1}컷 그림을 선택한 컷에 새 버전으로 넣었습니다.`);
      } catch (error) {
        flash(error?.message || "보관한 그림을 불러오지 못했습니다.");
      }
    });

    regenerationRegionModeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const panel = project.panels.find((item) => item.id === selectedPanelId);
        if (!panel) return;
        panel.regenerationDraftMaskMode = button.dataset.regionMode === "brush" ? "brush" : "rectangle";
        if (panel.regenerationDraftMaskMode === "brush") {
          panel.regenerationDraftMask = normalizeRegenerationMask(panel.regenerationDraftMask);
        }
        syncRegenerationRegionEditor({ resetForTarget: false });
        renderStudioPreview(preview, project, selectedPanelId);
        saveProject(project);
      });
    });

    regenerationMaskToolButtons.forEach((button) => {
      button.addEventListener("click", () => {
        regenerationMaskTool = button.dataset.maskTool === "erase" ? "erase" : "paint";
        const panel = project.panels.find((item) => item.id === selectedPanelId);
        if (panel) panel.regenerationDraftMaskTool = regenerationMaskTool;
        syncRegenerationRegionEditor({ resetForTarget: false });
        renderStudioPreview(preview, project, selectedPanelId);
      });
    });

    regenerationBrushSize?.addEventListener("input", () => {
      const panel = project.panels.find((item) => item.id === selectedPanelId);
      if (!panel) return;
      const mask = normalizeRegenerationMask(panel.regenerationDraftMask);
      mask.brushSize = clampNumber(regenerationBrushSize.value, 8, 72, 28);
      panel.regenerationDraftMask = mask;
      if (regenerationBrushSizeOutput) regenerationBrushSizeOutput.textContent = String(Math.round(mask.brushSize));
      saveProject(project);
    });

    undoRegenerationMask?.addEventListener("click", () => {
      const panel = project.panels.find((item) => item.id === selectedPanelId);
      if (!panel) return;
      const mask = normalizeRegenerationMask(panel.regenerationDraftMask);
      mask.strokes.pop();
      mask.updatedAt = new Date().toISOString();
      panel.regenerationDraftMask = mask;
      syncRegenerationRegionEditor({ resetForTarget: false });
      renderStudioPreview(preview, project, selectedPanelId);
      saveProject(project);
    });

    clearRegenerationMask?.addEventListener("click", () => {
      const panel = project.panels.find((item) => item.id === selectedPanelId);
      if (!panel) return;
      panel.regenerationDraftMask = createRegenerationMask();
      syncRegenerationRegionEditor({ resetForTarget: false });
      renderStudioPreview(preview, project, selectedPanelId);
      saveProject(project);
    });

    regenerationCharacterSelect?.addEventListener("change", () => {
      const panel = project.panels.find((item) => item.id === selectedPanelId);
      if (!panel) return;
      panel.regenerationDraftCharacterId = regenerationCharacterSelect.value;
      panel.regenerationDraftRegion = regenerationTargetRegion(panel, regenerationTarget, regenerationCharacterSelect.value);
      panel.regenerationDraftMask = createRegenerationMask();
      syncRegenerationRegionEditor({ resetForTarget: false });
      renderStudioPreview(preview, project, selectedPanelId);
      saveProject(project);
    });

    regenerationRegionInputs.forEach((input) => {
      input.addEventListener("input", () => {
        const panel = project.panels.find((item) => item.id === selectedPanelId);
        if (!panel) return;
        const current = normalizeRegenerationRegion(panel.regenerationDraftRegion || regenerationTargetRegion(panel, regenerationTarget));
        current[input.dataset.regionField] = Number(input.value);
        panel.regenerationDraftRegion = normalizeRegenerationRegion(current);
        panel.regenerationDraftTarget = regenerationTarget;
        syncRegenerationRegionEditor({ resetForTarget: false });
        renderStudioPreview(preview, project, selectedPanelId);
        saveProject(project);
      });
    });

    regenerationInstruction?.addEventListener("input", () => {
      const clipped = clipText(regenerationInstruction.value, contentLimits.regenerationInstructionMax);
      if (regenerationInstruction.value !== clipped) {
        regenerationInstruction.value = clipped;
      }
      regenerationInstructionCount.textContent = `${textLength(clipped)} / ${contentLimits.regenerationInstructionMax}`;
    });

    requestRegenerationButton?.addEventListener("click", async () => {
      const panel = project.panels.find((item) => item.id === selectedPanelId);
      if (!panel || studioRegenerating) {
        return;
      }
      if (!accessState.signedIn) {
        flash("Google 로그인 후 컷을 다시 만들 수 있습니다.");
        return;
      }
      if (!accessState.canCreate) {
        flash("웹툰 제작 기능은 현재 개발 중입니다.");
        return;
      }
      if (!regenerationCostConfirmed) {
        const camera = panel.panelSpec?.camera?.angle || "eye-level";
        const facing = panel.panelSpec?.subjects?.[0]?.facing || "three-quarter-left";
        byId("regenerationCostCamera").textContent = cameraAngleLabel(camera);
        byId("regenerationCostFacing").textContent = characterFacingLabel(facing);
        byId("regenerationCostDialog")?.querySelector("[data-regeneration-cost]")?.replaceChildren(accessState.isAdmin ? "관리자 · 차감 없음" : "도토리 1개");
        const adminNote = byId("regenerationCostDialog")?.querySelector("[data-regeneration-admin-note]");
        if (adminNote) adminNote.hidden = !accessState.isAdmin;
        regenerationCostDialog?.showModal();
        return;
      }
      regenerationCostConfirmed = false;

      const instruction = clipText(regenerationInstruction?.value || "", contentLimits.regenerationInstructionMax).trim();
      const sourceVersion = getCurrentImageVersion(panel);
      const renderStage = sourceVersion?.renderStage || getVisualRenderStage(project);
      const targetCopy = regenerationTargetCopy[regenerationTarget] || regenerationTargetCopy.full;
      const preserve = regenerationPreserveFields(regenerationTarget);
      const targetCharacterId = regenerationTarget === "specific-character"
        ? (regenerationCharacterSelect?.value || panel.panelSpec?.subjects?.[0]?.characterId || "")
        : "";
      const maskMode = panel.regenerationDraftMaskMode === "brush" ? "brush" : "rectangle";
      let targetRegion = normalizeRegenerationRegion(panel.regenerationDraftRegion || regenerationTargetRegion(panel, regenerationTarget, targetCharacterId));
      let regionMask = null;
      let regionMaskAssetId = `rectangle-${hashObject(targetRegion)}`;
      if (maskMode === "brush") {
        regionMask = rasterizeRegenerationMask(panel.regenerationDraftMask);
        if (!regionMask || regionMask.coverage < 0.0005) {
          flash("오른쪽 컷에서 고칠 부분을 먼저 칠해주세요");
          return;
        }
        if (regionMask.encodedBytes > regenerationMaskRules.maxEncodedBytes) {
          flash("마스크가 너무 복잡합니다 · 초기화 후 조금 단순하게 칠해주세요");
          return;
        }
        regionMaskAssetId = regionMask.id;
        targetRegion = regionMask.bounds;
      }

      studioRegenerating = true;
      panel.regenerating = true;
      syncRegenerateButton();
      renderStudioPreview(preview, project, selectedPanelId);
      setStudioProgress(18, `${targetCopy.label} 분석`, `다른 장면과 보존 요소를 잠그고 ${targetCopy.label} 수정 요청을 준비합니다.`);
      try {
        const generation = await oracleFetch("/api/webtoon/jobs", {
          method: "POST",
          body: JSON.stringify({
            projectId: project.remoteId || project.id,
            jobType: "panel_regenerate",
            scenarioKey: `studio-panel-regenerate-${regenerationTarget}`,
            requestPayload: {
              idea: project.idea,
              genre: project.genre,
              panelIndex: project.panels.indexOf(panel),
              editTarget: regenerationTarget,
              targetCharacterId,
              targetRegion,
              regionMaskAssetId,
              regionMask,
              baseVersionId: getCurrentImageVersion(panel)?.id || "",
              renderStage,
              requestedQuality: renderStage === "draft" ? "low" : "high",
              editInstruction: instruction,
              preserve,
              sourceImage: /^https?:|^\//i.test(panel.imageData || "") ? panel.imageData : "",
              sourceVersion: getCurrentImageVersion(panel),
              qualityReview: getCurrentImageVersion(panel)?.qc || createPanelQc(),
              promptPackage: getPanelPromptPackage(project, panel) || buildPromptPackage(project, panel, project.panels.indexOf(panel)),
              expectedResult: (getPanelPromptPackage(project, panel) || buildPromptPackage(project, panel, project.panels.indexOf(panel))).expectedResult,
              overlayLayout: {
                visibility: panel.overlayVisibility,
                positions: panel.overlayPositions
              },
              panel: {
                id: panel.id,
                beat: panel.beat,
                line: panel.line,
                reaction: panel.reaction,
                sfx: panel.sfx,
                note: panel.note,
                panelSpec: panel.panelSpec
              }
            }
          })
        });
        if (!accessState.isAdmin) {
          setAccess({
            signedIn: true,
            isAdmin: false,
            acorns: Number(generation?.profile?.acorns || 0),
            canCreate: accessState.canCreate
          });
          await refreshVisibleAccount();
        }
        await animateStudioProgress(18, 100, 2200, `${targetCopy.label} 수정 요청`, `선택한 컷의 ${targetCopy.label} 이미지 작업 요청을 준비하고 있습니다.`);
        panel.regenerationRequestedAt = new Date().toISOString();
        panel.lastRegenerationRequest = {
          target: regenerationTarget,
          editTarget: regenerationTarget,
          targetCharacterId,
          targetRegion,
          regionMaskAssetId,
          maskMode,
          maskSummary: regionMask ? {
            width: regionMask.width,
            height: regionMask.height,
            coverage: regionMask.coverage,
            encodedBytes: regionMask.encodedBytes
          } : null,
          instruction,
          renderStage,
          requestedQuality: renderStage === "draft" ? "low" : "high",
          requestedAt: panel.regenerationRequestedAt
        };
        panel.expectedImportRenderStage = renderStage;
        completedStudioSteps.add("regen");
        setStudioProgress(100, "요청 접수", `선택한 컷의 ${targetCopy.label} 작업만 요청했습니다. 나머지 장면과 텍스트 배치는 유지합니다.`);
        updateStudioSteps();
        saveProject(project);
        flash(`${targetCopy.label} 다시 그리기 요청 완료`);
      } catch (error) {
        setStudioProgress(0, "요청 실패", accountErrorMessage(error));
        flash(accountErrorMessage(error));
      } finally {
        delete panel.regenerating;
        studioRegenerating = false;
        saveProject(project);
        renderStudioPreview(preview, project, selectedPanelId);
        syncRegenerateButton();
      }
    });

    function selectStudioPanel(id) {
      if (!project.panels.some((panel) => panel.id === id)) {
        return;
      }
      selectedPanelId = id;
      preview.querySelectorAll("[data-studio-panel-id]").forEach((panelElement) => {
        panelElement.classList.toggle("is-selected", panelElement.dataset.studioPanelId === id);
      });
      syncRegenerationRegionEditor({ resetForTarget: false });
      syncRegenerateButton();
    }

    function syncRegenerationRegionEditor({ resetForTarget = false } = {}) {
      const panel = project.panels.find((item) => item.id === selectedPanelId);
      if (!panel) return;
      const subjects = Array.isArray(panel.panelSpec?.subjects) ? panel.panelSpec.subjects : [];
      if (regenerationCameraAngle) {
        regenerationCameraAngle.value = panel.panelSpec?.camera?.angle || "eye-level";
      }
      if (regenerationCharacterFacing) {
        regenerationCharacterFacing.value = subjects[0]?.facing || "three-quarter-left";
      }
      const savedCharacterId = panel.regenerationDraftCharacterId || subjects[0]?.characterId || "";
      if (regenerationCharacterSelect) {
        regenerationCharacterSelect.innerHTML = subjects.length
          ? subjects.map((subject, index) => `<option value="${escapeHtml(subject.characterId || `character-${index + 1}`)}">${escapeHtml(subject.name || subject.characterId || `인물 ${index + 1}`)}</option>`).join("")
          : '<option value="">인물 정보 없음</option>';
        regenerationCharacterSelect.value = subjects.some((subject) => subject.characterId === savedCharacterId)
          ? savedCharacterId
          : (subjects[0]?.characterId || "");
        panel.regenerationDraftCharacterId = regenerationCharacterSelect.value;
      }
      if (regenerationCharacterField) {
        regenerationCharacterField.hidden = regenerationTarget !== "specific-character";
      }
      if (resetForTarget || panel.regenerationDraftTarget !== regenerationTarget || !panel.regenerationDraftRegion) {
        panel.regenerationDraftRegion = regenerationTargetRegion(panel, regenerationTarget, panel.regenerationDraftCharacterId);
        panel.regenerationDraftTarget = regenerationTarget;
        if (resetForTarget) panel.regenerationDraftMask = createRegenerationMask();
      }
      const region = normalizeRegenerationRegion(panel.regenerationDraftRegion);
      panel.regenerationDraftRegion = region;
      panel.regenerationDraftMaskMode = panel.regenerationDraftMaskMode === "brush" ? "brush" : "rectangle";
      panel.regenerationDraftMaskTool = panel.regenerationDraftMaskTool === "erase" ? "erase" : "paint";
      regenerationMaskTool = panel.regenerationDraftMaskTool;
      panel.regenerationDraftMask = normalizeRegenerationMask(panel.regenerationDraftMask);
      regenerationRegionInputs.forEach((input) => {
        input.value = String(region[input.dataset.regionField]);
      });
      regenerationRegionOutputs.forEach((output) => {
        output.textContent = String(region[output.dataset.regionOutput]);
      });
      const brushMode = panel.regenerationDraftMaskMode === "brush";
      regenerationRegionModeButtons.forEach((button) => {
        const active = button.dataset.regionMode === panel.regenerationDraftMaskMode;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
        button.disabled = studioRegenerating;
      });
      if (regenerationRectangleControls) regenerationRectangleControls.hidden = brushMode;
      if (regenerationBrushControls) regenerationBrushControls.hidden = !brushMode;
      if (regenerationRegionSummary) regenerationRegionSummary.textContent = brushMode ? "컷 위에 직접 칠하기" : "컷 위 사각 범위";
      if (regenerationBrushSize) regenerationBrushSize.value = String(panel.regenerationDraftMask.brushSize);
      if (regenerationBrushSizeOutput) regenerationBrushSizeOutput.textContent = String(Math.round(panel.regenerationDraftMask.brushSize));
      regenerationMaskToolButtons.forEach((button) => {
        const active = button.dataset.maskTool === regenerationMaskTool;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
        button.disabled = studioRegenerating;
      });
      const paintStrokes = panel.regenerationDraftMask.strokes.filter((stroke) => stroke.tool === "paint").length;
      if (regenerationMaskState) {
        regenerationMaskState.textContent = paintStrokes
          ? `${panel.regenerationDraftMask.strokes.length}번 작업 · 선택한 영역만 PNG 마스크로 전달됩니다.`
          : "아직 칠한 영역이 없습니다.";
      }
      if (undoRegenerationMask) undoRegenerationMask.disabled = studioRegenerating || panel.regenerationDraftMask.strokes.length === 0;
      if (clearRegenerationMask) clearRegenerationMask.disabled = studioRegenerating || panel.regenerationDraftMask.strokes.length === 0;
    }

    function setPreviewWidth(width) {
      const value = [360, 390, 430].includes(width) ? width : 390;
      preview.style.setProperty("--studio-preview-width", `${value}px`);
      previewWidthButtons.forEach((button) => {
        const active = Number(button.dataset.previewWidth) === value;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });
    }

    function syncRegenerateButton() {
      if (!regenerateSelectedButton) {
        return;
      }
      const hasPanel = project.panels.some((panel) => panel.id === selectedPanelId);
      const currentDraft = ideaInput.value.trim() === project.idea.trim();
      const canRequest = !studioRegenerating && hasPanel && currentDraft && accessState.ready && accessState.canCreate;
      regenerateSelectedButton.disabled = !canRequest;
      regenerateSelectedButton.textContent = studioRegenerating ? "선택한 컷 요청 중" : "다시 그리기 설정";
      if (requestRegenerationButton) {
        requestRegenerationButton.disabled = !canRequest;
        requestRegenerationButton.textContent = studioRegenerating
          ? "요청 중"
          : `${regenerationTargetCopy[regenerationTarget]?.label || "전체"} 다시 그리기 요청`;
      }
      regenerationTargetButtons.forEach((button) => {
        const active = button.dataset.regenerationTarget === regenerationTarget;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
        button.disabled = studioRegenerating;
      });
      const selectedIndex = project.panels.findIndex((panel) => panel.id === selectedPanelId);
      if (selectedPanelLabel) {
        selectedPanelLabel.textContent = selectedIndex >= 0
          ? `${String(selectedIndex + 1).padStart(2, "0")}컷 · ${shorten(project.panels[selectedIndex].beat, 58)}`
          : "먼저 수정할 컷을 선택하세요.";
      }
      if (regenerationPreserveNote) {
        regenerationPreserveNote.textContent = regenerationTargetCopy[regenerationTarget]?.note || regenerationTargetCopy.full.note;
      }
      syncRegenerationRegionEditor({ resetForTarget: false });
    }

    async function watchGenerationJob(jobId, attempt = 0) {
      window.clearTimeout(generationPollTimer);
      if (!jobId || attempt >= 120) return;
      generationPollTimer = window.setTimeout(async () => {
        try {
          const result = await oracleFetch(`/api/webtoon/jobs/${encodeURIComponent(jobId)}/status`);
          const parent = result?.job || {};
          const children = Array.isArray(result?.children) ? result.children : [];
          children.forEach((child) => {
            const promptPackage = project.promptPackages.find((item) => (
              item.id === child.promptPackageId || item.panelId === child.panelId
            ));
            if (promptPackage) {
              promptPackage.status = child.status || promptPackage.status;
              promptPackage.jobId = child.id || promptPackage.jobId;
              promptPackage.progress = Number(child.progress || 0);
              promptPackage.attempt = Number(child.attempt || 1);
            }
          });
          const needsReview = children.filter((child) => child.status === "done").length;
          const failed = children.filter((child) => child.status === "failed").length;
          setStudioProgress(
            Number(parent.progress || 0),
            parent.status === "done" ? "컷별 작업 지시서 준비 완료" : failed ? "일부 컷 준비 실패" : "컷별 작업 지시서 준비 중",
            `${children.length}컷 중 준비 ${needsReview}개${failed ? ` · 실패 ${failed}개` : ""}`
          );
          renderGenerationQueue(project);
          saveProject(project);
          if (!["done", "canceled"].includes(parent.status)) watchGenerationJob(jobId, attempt + 1);
        } catch (_error) {
          watchGenerationJob(jobId, attempt + 1);
        }
      }, attempt ? 5000 : 1200);
    }

    function setStudioProgress(percent, label, log) {
      const value = Math.max(0, Math.min(100, Math.round(percent)));
      byId("studioProgressLabel").textContent = label;
      byId("studioProgressPercent").textContent = `${value}%`;
      byId("studioProgressFill").style.width = `${value}%`;
      byId("studioProgressLog").textContent = log;
    }

    async function animateStudioProgress(from, to, duration, label, log) {
      const startedAt = performance.now();
      return new Promise((resolve) => {
        function tick(now) {
          const elapsed = Math.min(1, (now - startedAt) / duration);
          const eased = 1 - Math.pow(1 - elapsed, 3);
          setStudioProgress(from + (to - from) * eased, label, log);
          if (elapsed < 1) {
            requestAnimationFrame(tick);
          } else {
            resolve();
          }
        }
        requestAnimationFrame(tick);
      });
    }

    async function runStudioProgress() {
      let from = 6;
      for (const stage of studioProgressStages) {
        await animateStudioProgress(from, stage.to, 820, stage.label, stage.log);
        from = stage.to;
      }
    }

    function updateStudioSteps() {
      const current = studioStepElements.find((item) => !completedStudioSteps.has(item.dataset.studioStep));
      studioStepElements.forEach((item) => {
        const done = completedStudioSteps.has(item.dataset.studioStep);
        item.classList.toggle("is-done", done);
        item.classList.toggle("is-current", !done && item === current);
      });
      const count = byId("studioStepCount");
      if (count) {
        count.textContent = `${completedStudioSteps.size} / ${studioStepElements.length}`;
      }
    }

    function restoreStudioSectionState() {
      let browserSections = null;
      try {
        const stored = JSON.parse(localStorage.getItem(studioUiStorageKey) || "null");
        browserSections = Array.isArray(stored?.openSections) ? stored.openSections : null;
      } catch {
        browserSections = null;
      }

      const projectSections = Array.isArray(project.uiPreferences?.openStudioSections)
        ? project.uiPreferences.openStudioSections
        : [];
      const openSections = browserSections || projectSections;
      studioSections.forEach((section) => {
        section.open = openSections.includes(section.dataset.studioSection);
      });
    }

    function persistStudioSectionState() {
      const openSections = studioSections
        .filter((section) => section.open)
        .map((section) => section.dataset.studioSection);
      project.uiPreferences = {
        ...(project.uiPreferences || {}),
        openStudioSections: openSections
      };
      try {
        localStorage.setItem(studioUiStorageKey, JSON.stringify({ openSections }));
      } catch {
        // Project storage below remains the fallback when UI preference storage is unavailable.
      }
      saveProject(project);
    }

    function updateIdeaLimitState() {
      const clipped = clipText(ideaInput.value, contentLimits.storyMax);
      if (ideaInput.value !== clipped) {
        ideaInput.value = clipped;
      }
      const length = textLength(clipped);
      const counter = byId("ideaCharCount");
      const hint = byId("ideaLimitNote");
      const valid = clipped.trim().length >= contentLimits.storyMin;

      counter.textContent = `${length.toLocaleString("ko-KR")} / ${contentLimits.storyMax.toLocaleString("ko-KR")}자`;
      counter.classList.toggle("is-invalid", length > 0 && !valid);
      counter.classList.toggle("is-recommended-over", length > contentLimits.storyRecommendedMax);
      ideaInput.setAttribute("aria-invalid", String(length > 0 && !valid));

      if (length > contentLimits.storyRecommendedMax) {
        hint.textContent = "한 화 권장 분량을 넘었습니다. 편집 비서가 다음 화로 나눠드립니다.";
      } else if (length > 0 && length < contentLimits.storyMin) {
        hint.textContent = `아이디어를 ${contentLimits.storyMin}자 이상 적어주세요.`;
      } else {
        hint.textContent = "10~3,000자 · 한 화 권장 280~950자";
      }

      [applyEpisodePlanButton, storyEditorPromptButton].forEach((button) => {
        if (button) {
          button.disabled = !valid;
        }
      });
      syncCreationAvailability(valid);
      return valid;
    }

    function syncCreationAvailability(validIdea = ideaInput.value.trim().length >= contentLimits.storyMin) {
      const note = byId("creationAccessNote");
      const hasAccess = accessState.signedIn
        && accessState.canCreate;
      draftButton.disabled = studioGenerating || !validIdea || !accessState.ready || !hasAccess;
      draftButton.textContent = studioGenerating
        ? "콘티 만드는 중"
        : accessState.canCreate
          ? (isStoryDevelopmentApproved(project, ideaInput.value.trim()) ? "세로 콘티 만들기" : "이야기 다듬기")
          : "개발 중";

      if (!note) {
        return;
      }
      if (!accessState.ready) {
        note.textContent = "계정과 권한을 확인하고 있습니다.";
      } else if (!accessState.signedIn) {
        note.textContent = "현재 관리자 테스트 중입니다. 일반 회원 제작은 준비 중입니다.";
      } else if (!accessState.canCreate) {
        note.textContent = "웹툰 제작 기능은 개발 중이며, 현재 관리자만 테스트할 수 있습니다.";
      } else if (accessState.isAdmin) {
        note.textContent = "이야기와 콘티 검토는 무료이며 관리자 이미지 작업은 도토리가 차감되지 않습니다.";
      } else {
        note.textContent = `이야기와 콘티 검토는 무료 · 시안 또는 완성화 요청 ${generationPassCost}개`;
      }
    }

    function renderAll({ persist = accessState.signedIn, changed = true } = {}) {
      project.title = createTitle(project.idea, project.genre);
      project.updatedAt = new Date().toISOString();
      if (changed) {
        project.hasUnpublishedChanges = true;
      }
      if (!project.panels.some((panel) => panel.id === selectedPanelId)) {
        selectedPanelId = project.panels[0]?.id || "";
      }
      renderPanelList(panelList, project);
      renderStudioPreview(preview, project, selectedPanelId);
      preview.classList.toggle("is-stale", ideaInput.value.trim() !== project.idea.trim());
      renderStats(project);
      renderProjectState(project);
      renderStoryDevelopment(project);
      renderStoryboardApproval(project, selectedPanelId);
      renderGenerationQueue(project);
      renderQualityReview(project);
      renderStudioAssetShelf(project, selectedPanelId);
      syncRegenerateButton();
      addPanelButton.disabled = project.panels.length >= contentLimits.sceneMax;
      addPanelButton.title = addPanelButton.disabled
        ? `핵심 장면은 최대 ${contentLimits.sceneMax}장입니다.`
        : "핵심 장면 추가";
      if (persist) {
        saveProject(project);
      }
    }

    async function importPanelImage(panel, file) {
      validateImageFile(file);
      const dataUrl = await imageFileToDataUrl(file);
      const updatedAt = new Date().toISOString();
      ensurePanelVersionState(panel, project);
      const renderStage = visualRenderStages.includes(panel.expectedImportRenderStage)
        ? panel.expectedImportRenderStage
        : getVisualRenderStage(project);
      const parentVersion = getCurrentImageVersion(panel);
      const versionId = `version-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const imageKey = panelImageKey(project, panel, versionId);
      try {
        await putPanelImage(imageKey, {
          key: imageKey,
          dataUrl,
          name: clipText(file.name || "clipboard-image.jpg", 120),
          updatedAt
        });
      } catch (error) {
        if (error?.name === "QuotaExceededError") {
          throw new Error("브라우저 이미지 저장 공간이 부족합니다 · 사용하지 않는 컷 이미지를 지워주세요");
        }
        throw error;
      }
      panel.imageKey = imageKey;
      panel.imageData = dataUrl;
      panel.imageName = clipText(file.name || "clipboard-image.jpg", 120);
      panel.imageUpdatedAt = updatedAt;
      panel.currentVersionId = versionId;
      panel.qcStatus = "pending";
      panel.imageVersions.push({
        id: versionId,
        parentVersionId: parentVersion?.id || "",
        sourceAssetId: imageKey,
        imageKey,
        name: panel.imageName,
        sourceUrl: "",
        createdAt: updatedAt,
        sourcePromptHash: getPanelPromptPackage(project, panel)?.promptHash || "",
        sourceSpecHash: getPanelPromptPackage(project, panel)?.sourceSpecHash || hashObject(panel.panelSpec || {}),
        promptPackageId: getPanelPromptPackage(project, panel)?.id || "",
        editTarget: panel.lastRegenerationRequest?.editTarget || "full",
        maskAssetId: panel.lastRegenerationRequest?.regionMaskAssetId || "",
        targetRegion: panel.lastRegenerationRequest?.targetRegion || null,
        renderStage,
        requestedQuality: renderStage === "draft" ? "low" : "high",
        status: "candidate",
        qc: createPanelQc()
      });
      delete panel.expectedImportRenderStage;
      project.productionStage = renderStage === "draft" ? "draft-review" : "visual-review";
      syncVisualWorkflow(project);
      selectedPanelId = panel.id;
      renderAll();
      const activeSlot = panelList.querySelector(`[data-panel-id="${panel.id}"] .image-slot`);
      activeSlot?.classList.add("is-active");
      flash(`${visualStageLabel(renderStage)} 후보 반영 · 마음에 들면 이 버전을 사용하세요`);
    }
  }

  function initTemplates() {
    const grid = byId("templateGrid");
    if (!grid) {
      return;
    }

    grid.innerHTML = templates.map((template) => `
      <article class="template-card">
        <div class="template-thumb" style="--thumb-a: ${template.colors[0]}; --thumb-b: ${template.colors[1]};" aria-hidden="true"></div>
        <p class="kicker">${escapeHtml(genreLabel(template.genre))}</p>
        <h2>${escapeHtml(template.title)}</h2>
        <p>${escapeHtml(template.idea)}</p>
        <div class="template-tags">
          ${template.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
        </div>
        <button class="template-button" type="button" data-template-id="${template.id}">이 이야기로 시작</button>
      </article>
    `).join("");

    grid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-template-id]");
      if (!button) {
        return;
      }
      localStorage.setItem(incomingTemplateKey, button.dataset.templateId);
      window.location.href = "/webtoon/studio/";
    });
  }

  function initReader() {
    const reader = byId("readerCanvas");
    if (!reader) {
      return;
    }

    const query = new URLSearchParams(window.location.search);
    const scenarioId = query.get("scenario") || "";
    const forceScenario = scenarioId === window.NeoKIMWebtoonScenario?.id;
    const loadedProject = loadProject();
    let project = forceScenario
      ? buildProject({ templateId: "awakening-subway-gate", scenarioId, count: episodeRules.keySceneRange[1] })
      : (isSupportedProject(loadedProject)
        ? loadedProject
        : buildProject({ templateId: "awakening-subway-gate", count: episodeRules.keySceneRange[1] }));
    ensureProjectSchemaV2(project);
    const readerLanguage = byId("readerLanguage");
    let readerLocale = new URLSearchParams(window.location.search).get("lang") || "ko";
    if (!["ko", "en", "ja"].includes(readerLocale)) readerLocale = "ko";
    const useLocalDraft = query.get("draft") === "local";
    if (forceScenario) {
      const editLink = document.querySelector(".page-reader .toolbar .tool-button.primary");
      editLink?.setAttribute("href", "/webtoon/studio/?template=awakening-subway-gate&scenario=guide-episode");
    }
    renderReaderProject(project);

    readerLanguage?.addEventListener("change", () => {
      readerLocale = readerLanguage.value;
      renderReaderProject(project);
    });

    document.addEventListener("webtoon:access-change", async (event) => {
      if (forceScenario) {
        renderReaderProject(project);
        return;
      }
      if (event.detail.signedIn || useLocalDraft) {
        const localProject = loadProject();
        project = isSupportedProject(localProject) ? localProject : project;
        renderReaderProject(project);
        return;
      }

      await renderLatestPublicProject();
    });

    if (!useLocalDraft && !forceScenario) {
      renderLatestPublicProject();
    }

    async function renderLatestPublicProject() {
      const publicProject = await loadLatestPublicProject();
      if (!publicProject) {
        renderReaderProject(project);
        return;
      }
      project = publicProject;
      renderReaderProject(project);
    }

    function renderReaderProject(currentProject) {
      prepareApprovedImagePointers(currentProject);
      renderReaderPage(currentProject);
      hydrateProjectImages(currentProject, { approvedOnly: true }).then(() => renderReaderPage(currentProject)).catch(() => {});
    }

    function renderReaderPage(currentProject) {
      ensureProjectSchemaV2(currentProject);
      const locales = currentProject.publishLocales || ["ko"];
      if (!locales.includes(readerLocale)) readerLocale = "ko";
      if (readerLanguage) {
        readerLanguage.value = readerLocale;
        Array.from(readerLanguage.options).forEach((option) => {
          option.disabled = !locales.includes(option.value);
        });
      }
      byId("readerTitle").textContent = currentProject.title;
      const readerPanelCount = countReaderPanels(currentProject);
      byId("readerPanels").textContent = String(readerPanelCount);
      byId("readerGenre").textContent = genreLabel(currentProject.genre);
      byId("readerMinutes").textContent = `${estimateReaderMinutes(readerPanelCount)}분`;
      reader.innerHTML = renderReader(currentProject, readerLocale);
    }
  }

  function initOperator() {
    const promptBox = byId("operatorPrompt");
    if (!promptBox) {
      return;
    }

    const apiBase = byId("operatorApiBase");
    const apiStatus = byId("operatorApiStatus");
    const latestProject = byId("operatorLatestProject");

    const renderOperatorPrompt = () => {
      const loaded = loadProject();
      const project = isSupportedProject(loaded)
        ? loaded
        : buildProject({ templateId: "awakening-subway-gate", count: episodeRules.keySceneRange[1] });
      promptBox.value = projectToChatGptPrompt(project);
    };

    renderOperatorPrompt();
    document.addEventListener("webtoon:access-change", renderOperatorPrompt);

    byId("copyOperatorPrompt")?.addEventListener("click", async () => {
      await copyText(promptBox.value);
      flash("프롬프트 복사 완료");
    });

    byId("refreshOperatorStatus")?.addEventListener("click", async () => {
      await renderOperatorStatus();
    });

    byId("copyApiBase")?.addEventListener("click", async () => {
      const base = getOracleApiBase();
      if (!base) {
        flash("API 주소 없음");
        return;
      }
      await copyText(base);
      flash("API 주소 복사");
    });

    renderOperatorStatus();
    document.addEventListener("webtoon:access-change", renderOperatorStatus);

    async function renderOperatorStatus() {
      const base = getOracleApiBase();
      if (apiBase) {
        apiBase.textContent = base || "미설정";
      }
      if (apiStatus) {
        apiStatus.textContent = "확인 중";
        apiStatus.dataset.state = "loading";
      }
      if (latestProject) {
        latestProject.textContent = "확인 중";
      }

      if (!base) {
        if (apiStatus) {
          apiStatus.textContent = "API base 없음";
          apiStatus.dataset.state = "error";
        }
        if (latestProject) {
          latestProject.textContent = "--";
        }
        return;
      }

      try {
        const health = await oracleFetch("/health", { auth: false });
        if (apiStatus) {
          apiStatus.textContent = health?.ok ? "정상 연결" : "응답 이상";
          apiStatus.dataset.state = health?.ok ? "ok" : "warn";
        }
      } catch {
        if (apiStatus) {
          apiStatus.textContent = "연결 실패";
          apiStatus.dataset.state = "error";
        }
      }

      try {
        const publicProject = await loadLatestPublicProject();
        if (latestProject) {
          latestProject.textContent = publicProject
            ? `${publicProject.title} · ${publicProject.panels?.length || 0}장면`
            : "아직 없음";
        }
      } catch {
        if (latestProject) {
          latestProject.textContent = "조회 실패";
        }
      }
    }
  }

  function buildProject({ idea = "", genre = "", count = episodeRules.targetKeyScenes, templateId = "", scenarioId = "", development = null } = {}) {
    const template = templates.find((item) => item.id === templateId);
    const isGuideScenario = scenarioId === window.NeoKIMWebtoonScenario?.id;
    const finalIdea = clipText(
      (isGuideScenario ? window.NeoKIMWebtoonScenario.idea : "") || template?.idea || idea || "폐역 플랫폼에서 F급 헌터가 자신에게만 보이는 퀘스트 창을 발견한다",
      contentLimits.storyMax
    ).trim();
    const finalGenre = template?.genre || genre || "modern-awakening";
    const finalCount = Math.max(
      episodeRules.keySceneRange[0],
      Math.min(episodeRules.keySceneRange[1], Number(count) || episodeRules.targetKeyScenes)
    );
    const episodePlan = analyzeStory(finalIdea);
    const episodeStory = episodePlan.episodeOneStory || finalIdea;
    const storyDevelopment = development || createStoryDevelopment(finalIdea, finalGenre, {
      approved: Boolean(template?.id || isGuideScenario)
    });
    const outline = buildSceneOutline({
      genre: finalGenre,
      story: episodeStory,
      count: finalCount,
      templateId: template?.id || "",
      development: storyDevelopment
    });
    const scenePlans = outline.map((scene, index) => planScene(finalGenre, finalIdea, index, scene, storyDevelopment));
    const panels = scenePlans.map((scenePlan, index) => createPanel(finalGenre, finalIdea, index, scenePlan, storyDevelopment));
    if (template?.id === "awakening-subway-gate") {
      decorateAwakeningPanels(panels);
    }
    return ensureProjectSchemaV2({
      schemaVersion: projectSchemaVersion,
      id: createId(),
      title: isGuideScenario ? window.NeoKIMWebtoonScenario.title : (template?.title || createTitle(finalIdea, finalGenre)),
      idea: finalIdea,
      templateId: template?.id || "",
      scenarioId: isGuideScenario ? scenarioId : "",
      episodeLabel: isGuideScenario ? window.NeoKIMWebtoonScenario.episodeLabel : "EP.01",
      synopsis: isGuideScenario ? window.NeoKIMWebtoonScenario.synopsis : "",
      episodeStory,
      nextEpisodeStory: episodePlan.nextEpisodeStory || "",
      genre: finalGenre,
      tone: template?.tone || "bright",
      status: "draft",
      isPublic: false,
      hasUnpublishedChanges: false,
      panelCount: finalCount,
      episodePlan: {
        ...episodePlan,
        ...(storyDevelopment.episodePlan || {})
      },
      storyIntent: storyDevelopment.storyIntent,
      aiSuggestions: storyDevelopment.aiSuggestions,
      seriesBible: storyDevelopment.seriesBible,
      scenePlans,
      panels,
      updatedAt: new Date().toISOString()
    });
  }

  function decorateAwakeningPanels(panels) {
    panels.forEach((panel) => {
      panel.imageData = awakeningEpisodeArt[panel.phase] || "";
      panel.imageName = panel.imageData.split("/").pop() || "";
      const fullSceneIndex = beatBank["modern-awakening"].findIndex((scene) => scene[0] === panel.beat);
      panel.reaction = fullSceneIndex >= 0
        ? awakeningEpisodeReactions[fullSceneIndex]
        : phaseReaction(panel.phase);
    });
  }

  function isSupportedProject(project) {
    return Boolean(project && project.genre === "modern-awakening" && Array.isArray(project.panels));
  }

  function buildSceneOutline({ genre, story, count, templateId, development = null }) {
    const sourceBank = templateId === "awakening-subway-gate"
      ? beatBank[genre] || beatBank["modern-awakening"]
      : genericEpisodeBlueprint;
    const scenes = Array.from({ length: count }, (_, index) => {
      const bankIndex = count <= 1 ? 0 : Math.round(index * (sourceBank.length - 1) / (count - 1));
      return [...sourceBank[bankIndex]];
    });

    if (templateId === "awakening-subway-gate") {
      return scenes;
    }

    const approvedSuggestions = (development?.aiSuggestions || [])
      .filter((item) => item.approval === "accepted")
      .map((item) => item.text)
      .filter(Boolean);
    const sourceFacts = development?.storyIntent?.facts?.length
      ? development.storyIntent.facts
      : splitStorySentences(story);
    const storyUnits = [...sourceFacts, ...approvedSuggestions].filter(Boolean);
    if (!storyUnits.length) {
      return scenes;
    }
    return scenes.map((scene, index) => {
      const unitIndex = count <= 1 ? 0 : Math.min(storyUnits.length - 1, Math.floor(index * storyUnits.length / count));
      const sourceSentence = storyUnits[unitIndex];
      return [sourceSentence, scene[1], scene[2], scene[3], {
        sourceTrace: unitIndex < sourceFacts.length ? `storyFact:${unitIndex}` : `acceptedSuggestion:${unitIndex - sourceFacts.length}`,
        blueprintPurpose: scene[0]
      }];
    });
  }

  function planScene(genre, idea, index, scene, development = null) {
    const source = Array.isArray(scene) ? scene : [String(scene || idea), "", "", "development"];
    const phase = source[3] || "development";
    const metadata = source[4] && typeof source[4] === "object" ? source[4] : {};
    const hero = development?.seriesBible?.characters?.[0]?.name || getHeroName(idea);
    const storyFact = clipText(String(source[0] || idea).replace("주인공", hero), 240);
    const isTemplateScene = !metadata.blueprintPurpose;
    const purpose = scenePurpose(phase);
    return {
      id: `scene-${String(index + 1).padStart(2, "0")}-${hashText(`${storyFact}:${phase}`).slice(-6)}`,
      order: index,
      phase,
      purpose,
      storyFact,
      moment: isTemplateScene ? storyFact : buildVisualMoment(storyFact, phase, hero),
      emotionBeforeAfter: sceneEmotionArc(phase),
      line: isTemplateScene ? source[1] : safeSceneDialogue(phase),
      sfx: isTemplateScene ? source[2] : safeSceneSfx(phase),
      reaction: isTemplateScene && source[4] && typeof source[4] === "string" ? source[4] : storyFact,
      sourceTrace: metadata.sourceTrace || `storyFact:${index}`,
      blueprintPurpose: metadata.blueprintPurpose || "",
      approval: "pending"
    };
  }

  function buildPanelSpec(scene, development, index) {
    const bible = development?.seriesBible || {};
    const storyIntent = development?.storyIntent || {};
    const hero = bible.characters?.[0] || { id: "hero", name: "주인공", outfitState: "확정된 기본 의상" };
    const location = bible.locations?.[0] || { id: "location-primary", name: "이야기의 첫 장소", lighting: "연속된 조명" };
    const shot = planShotForScene(scene.phase, index);
    return {
      schemaVersion: 1,
      storyFact: scene.storyFact,
      purpose: scene.purpose,
      moment: scene.moment,
      emotionBeforeAfter: scene.emotionBeforeAfter,
      subjects: [{
        characterId: hero.id || "hero",
        name: hero.name || "주인공",
        action: sceneAction(scene.phase),
        emotion: sceneEmotion(scene.phase),
        gaze: sceneGaze(scene.phase),
        facing: shot.facing,
        screenPosition: shot.subjectPosition,
        pose: scenePose(scene.phase),
        outfitState: hero.outfitState || "확정된 기본 의상"
      }],
      setting: {
        locationId: location.id || "location-primary",
        locationName: location.name || "이야기의 첫 장소",
        time: "앞 컷과 같은 시간대",
        weather: "실내이면 해당 없음",
        lighting: location.lighting || "앞 컷과 같은 조명 방향",
        activeProps: hero.fixedProps || []
      },
      camera: shot.camera,
      composition: {
        foreground: shot.foreground,
        midground: `${hero.name || "주인공"}의 ${sceneAction(scene.phase)}`,
        background: `${location.name || "장소"}의 고정 랜드마크`,
        focalPoint: shot.focalPoint,
        depth: shot.depth,
        negativeSpace: shot.negativeSpace
      },
      continuity: {
        previousPanelId: index > 0 ? "previous-panel" : "",
        entranceDirection: index > 0 ? "앞 컷의 이동·시선 방향 유지" : "첫 방향 설정",
        carriedProps: hero.fixedProps || [],
        characterState: hero.outfitState || "확정된 기본 상태",
        locationState: location.lighting || "첫 장소 상태"
      },
      mustInclude: [scene.storyFact, hero.name, ...(storyIntent.mustKeep || [])].filter(Boolean),
      mustAvoid: ["이미지 안의 읽을 수 없는 가짜 문자", "기존 작품의 캐릭터·로고·고유 화풍", ...(storyIntent.mustAvoid || [])],
      overlaySafeZones: [
        { type: "dialogue", area: shot.negativeSpace },
        { type: "narration", area: "상단 또는 하단 가장자리" }
      ],
      sourceTrace: scene.sourceTrace,
      approval: "pending"
    };
  }

  function planShotForScene(phase, index) {
    const directed = window.NeoKIMWebtoonDirector?.select?.(phase, index);
    if (directed) {
      return {
        subjectPosition: directed.subjectPosition,
        facing: directed.facing,
        focalPoint: directed.intent,
        depth: directed.depthPlan,
        negativeSpace: directed.negativeSpace,
        foreground: directed.shotSize === "detail" ? "핵심 단서 또는 손을 크게 배치" : directed.depthPlan.split(",")[0],
        camera: {
          shotSize: directed.shotSize,
          angle: directed.angle,
          height: cameraHeightForAngle(directed.angle),
          perspective: directed.depthPlan,
          movement: phase === "climax" ? "행동 방향을 따라가는 역동적 프레이밍" : "장면 목적을 선명하게 유지하는 고정 카메라",
          focalTarget: directed.intent,
          lensFeel: lensFeelForShot(directed.shotSize, directed.angle),
          movementAxis: movementAxisForFacing(directed.facing),
          directorIntent: directed.intent,
          framingDevice: directed.framingDevice,
          sequenceRule: directed.sequenceRule,
          mustAvoidComposition: directed.avoid,
          knowledgeVersion: window.NeoKIMWebtoonDirector.schemaVersion
        }
      };
    }
    const shots = {
      "cold-open": ["wide", "bird-eye", "center", "불길한 결과 또는 단서", "넓은 공간 정보", "upper-right", "back"],
      setup: ["medium-wide", "profile-side", index % 2 ? "right" : "left", "주인공의 일상 행동", "인물과 장소를 함께 읽는 깊이", "opposite-subject", index % 2 ? "left-profile" : "right-profile"],
      hook: ["detail", "over-shoulder", "center", "처음 나타난 이상 징후", "얕은 초점", "upper-left", "back"],
      inciting: ["medium-close", "ground-low-diagonal", "left", "사건 요소와 주인공의 반응", "전경과 인물의 두 층", "upper-right", "three-quarter-right"],
      stakes: ["close", "high-angle", "center", "실패 조건을 받아들이는 표정", "얕은 초점", "upper-left", "front"],
      goal: ["medium", "profile-side", "left", "목표를 선택하는 행동", "인물 중심", "upper-right", "right-profile"],
      threat: ["wide", "low-angle", "lower-left", "위협과 인물의 거리", "큰 원근 대비", "upper-right", "back"],
      ability: ["detail", "over-shoulder", "center", "능력 또는 소품의 작동", "손과 대상의 두 층", "upper-left", "back"],
      progress: ["medium", "eye-level", "right", "첫 성공의 결과", "행동 방향이 읽히는 깊이", "upper-left", "three-quarter-left"],
      complication: ["wide", "bird-eye", "center", "상황이 더 불리해진 공간", "장소 전체", "upper-right", "back"],
      midpoint: ["medium-close", "profile-side", "right", "새로운 진실을 본 반응", "인물과 단서", "upper-left", "left-profile"],
      reversal: ["close", "dutch-subtle", "center", "규칙이 뒤집히는 순간", "불안정한 깊이", "upper-right", "front"],
      decision: ["medium-close", "low-angle", "left", "결정을 내린 표정과 자세", "인물 중심", "upper-right", "three-quarter-right"],
      payoff: ["detail", "over-shoulder", "center", "앞에서 준비한 소품의 쓰임", "손·소품·대상의 세 층", "upper-left", "back"],
      climax: ["wide", "ground-low-diagonal", "center", "가장 큰 행동의 정점", "강한 전경과 배경 원근", "upper-right", "three-quarter-left"],
      resolution: ["medium-wide", "high-angle", "right", "해결 직후의 안도", "차분한 공간", "upper-left", "three-quarter-left"],
      cost: ["close", "profile-side", "center", "해결의 대가를 확인하는 표정", "얕은 초점", "upper-right", "left-profile"],
      reveal: ["wide", "bird-eye", "lower-center", "더 큰 사건 범위", "장소 전체", "upper-left", "back"],
      cliffhanger: ["detail", "ground-low-diagonal", "center", "다음 질문을 만드는 단서", "단서 중심", "upper-right", "front"],
      "next-episode": ["wide", "over-shoulder", "lower-left", "새로 열린 공간 또는 인물", "깊은 원근", "upper-right", "back"]
    };
    const [shotSize, angle, subjectPosition, focalPoint, depth, negativeSpace, facing] = shots[phase] || ["medium", "eye-level", "center", "현재 사건", "인물 중심", "upper-right", "three-quarter-left"];
    return {
      subjectPosition,
      facing,
      focalPoint,
      depth,
      negativeSpace,
      foreground: shotSize === "detail" ? "핵심 단서 또는 손" : "장면을 가리지 않는 최소 전경",
      camera: {
        shotSize,
        angle,
        height: cameraHeightForAngle(angle),
        perspective: shotSize === "wide" ? "공간 깊이가 분명한 원근" : "인물과 단서가 읽히는 자연스러운 원근",
        movement: phase === "climax" ? "행동 방향을 따라가는 역동적 프레이밍" : "고정 카메라",
        focalTarget: focalPoint,
        lensFeel: lensFeelForShot(shotSize, angle),
        movementAxis: movementAxisForFacing(facing),
        directorIntent: directorIntentForShot(phase, angle, shotSize)
      }
    };
  }

  function scenePurpose(phase) {
    return {
      "cold-open": "미래의 결과를 암시해 첫 질문 만들기",
      setup: "일상과 현재 상태 이해",
      hook: "이상 징후 발견",
      inciting: "사건 시작",
      stakes: "실패 위험 확인",
      goal: "이번 화 목표 선택",
      threat: "목표를 막는 위협 확인",
      ability: "능력 또는 소품 시험",
      progress: "첫 진행감 제공",
      complication: "상황 악화",
      midpoint: "중간 목표와 더 큰 진실",
      reversal: "처음 규칙 뒤집기",
      decision: "주인공다운 선택",
      payoff: "앞에서 준비한 요소 회수",
      climax: "가장 큰 행동과 감정 폭발",
      resolution: "당면 목표 해결",
      cost: "해결의 대가 확인",
      reveal: "사건의 더 큰 범위 공개",
      cliffhanger: "다음 화 질문 만들기",
      "next-episode": "새로운 문 또는 인물 예고"
    }[phase] || "이야기 진행";
  }

  function buildVisualMoment(storyFact, phase, hero) {
    const directions = {
      "cold-open": `${hero}보다 먼저 사건의 결과나 핵심 단서가 화면에 드러나는 순간`,
      setup: `${hero}가 사건 직전의 일상 행동을 하며 현재 처지를 보여주는 순간`,
      hook: `${hero}가 원고 속 이상 징후를 처음 알아차리는 순간`,
      inciting: `원고의 사건 요소가 실제로 작동하고 ${hero}가 걸음을 멈추는 순간`,
      stakes: `${hero}가 실패 위험을 읽거나 목격하고 표정이 굳는 순간`,
      goal: `${hero}가 다음 행동의 방향을 정하고 몸을 돌리는 순간`,
      threat: `${hero}와 위협 요소의 거리가 한 화면에서 드러나는 순간`,
      ability: `${hero}의 손이나 핵심 소품이 처음 작동하는 순간`,
      progress: `${hero}의 첫 시도가 눈에 보이는 결과를 만드는 순간`,
      complication: `성공처럼 보였던 상황이 불리하게 바뀌는 순간`,
      midpoint: `${hero}가 중간 목표와 더 큰 진실을 동시에 발견하는 순간`,
      reversal: `처음 믿었던 규칙의 의미가 뒤집히는 단서가 나타나는 순간`,
      decision: `${hero}가 손해를 감수할 선택을 표정과 자세로 확정하는 순간`,
      payoff: `앞서 등장한 능력이나 소품이 해결 방법으로 연결되는 순간`,
      climax: `${hero}의 선택이 가장 큰 행동으로 폭발하는 한순간`,
      resolution: `${hero}가 당면 목표가 해결됐음을 확인하는 순간`,
      cost: `${hero}가 해결 뒤 남은 대가를 조용히 확인하는 순간`,
      reveal: `사건의 범위가 더 컸음을 보여주는 장소나 단서가 펼쳐지는 순간`,
      cliffhanger: `다음 화의 질문이 되는 단서가 마지막으로 드러나는 순간`,
      "next-episode": `새로운 공간이나 인물이 열리며 ${hero}가 바라보는 순간`
    };
    return `${storyFact} ${directions[phase] || `${hero}가 사건에 반응하는 순간`}.`;
  }

  function sceneEmotionArc(phase) {
    return {
      setup: "무심함 → 작은 불안",
      hook: "평온 → 의심",
      inciting: "의심 → 놀람",
      stakes: "놀람 → 긴장",
      goal: "망설임 → 결심",
      threat: "결심 → 공포",
      ability: "불안 → 집중",
      progress: "집중 → 희망",
      complication: "희망 → 당혹",
      midpoint: "당혹 → 깨달음",
      reversal: "확신 → 혼란",
      decision: "혼란 → 결의",
      payoff: "결의 → 확신",
      climax: "긴장 → 폭발",
      resolution: "폭발 → 안도",
      cost: "안도 → 씁쓸함",
      reveal: "안도 → 경계",
      cliffhanger: "경계 → 충격",
      "next-episode": "충격 → 다음 결심"
    }[phase] || "불안 → 궁금증";
  }

  function sceneAction(phase) {
    return {
      setup: "일상 행동을 이어간다",
      hook: "이상 징후를 향해 고개를 돌린다",
      inciting: "걸음을 멈추고 사건 요소를 바라본다",
      stakes: "실패 위험을 읽거나 목격한다",
      goal: "목표 방향으로 몸을 돌린다",
      threat: "위협과 거리를 두며 자세를 낮춘다",
      ability: "손 또는 소품으로 능력을 시험한다",
      progress: "첫 결과를 확인한다",
      complication: "바뀐 상황을 보고 균형을 다시 잡는다",
      midpoint: "발견한 단서에 손을 뻗는다",
      reversal: "뒤집힌 규칙을 확인한다",
      decision: "결정을 내리고 앞으로 한 걸음 나간다",
      payoff: "준비한 능력이나 소품을 사용한다",
      climax: "결정적인 행동을 실행한다",
      resolution: "해결된 상황을 확인한다",
      cost: "남은 대가를 내려다본다",
      reveal: "더 큰 범위의 단서를 바라본다",
      cliffhanger: "새 단서에 시선이 멈춘다",
      "next-episode": "새로 열린 공간을 바라본다"
    }[phase] || "현재 사건에 반응한다";
  }

  function sceneEmotion(phase) {
    return sceneEmotionArc(phase).split("→").at(-1).trim();
  }

  function sceneGaze(phase) {
    return ["ability", "payoff"].includes(phase) ? "손에 든 소품 또는 능력" : ["reveal", "next-episode"].includes(phase) ? "새로 열린 공간" : "현재 사건의 핵심 대상";
  }

  function scenePose(phase) {
    return ["threat", "climax"].includes(phase) ? "무게중심을 낮춘 역동적인 자세" : ["decision", "goal"].includes(phase) ? "앞으로 향하는 단단한 자세" : "행동과 표정이 함께 읽히는 자연스러운 자세";
  }

  function safeSceneDialogue(phase) {
    return {
      "cold-open": "대체 어디서부터 잘못된 거지?",
      setup: "오늘만 조용히 지나가면 돼.",
      hook: "잠깐... 방금 뭐였지?",
      inciting: "이게 나한테만 보이는 거야?",
      stakes: "무시할 수는 없어.",
      goal: "먼저 확인해야 해.",
      threat: "다가오고 있어.",
      ability: "방법은 있을 거야.",
      progress: "됐어. 반응했어.",
      complication: "일부러 유인한 거였어.",
      midpoint: "끝난 게 아니야.",
      reversal: "처음부터 다른 규칙이었어.",
      decision: "내가 고른 답으로 간다.",
      payoff: "지금이라면 가능해.",
      climax: "지금이야!",
      resolution: "이번에는 끝났어.",
      cost: "이게 대가였나.",
      reveal: "여기 하나로 끝난 게 아니야.",
      cliffhanger: "이건... 뭐지?",
      "next-episode": "누가 있는 거야?"
    }[phase] || "확인해보자.";
  }

  function safeSceneSfx(phase) {
    return {
      "cold-open": "사각",
      setup: "철컥",
      hook: "지직",
      inciting: "삐빅",
      stakes: "경고",
      goal: "탁",
      threat: "스르륵",
      ability: "반짝",
      progress: "점등",
      complication: "덜컹",
      midpoint: "쾅",
      reversal: "반전",
      decision: "결심",
      payoff: "촤악",
      climax: "콰앙",
      resolution: "딩",
      cost: "잔향",
      reveal: "점등",
      cliffhanger: "철컥",
      "next-episode": "끼익"
    }[phase] || "톡";
  }

  function invalidatePanelStoryboard(project, panel) {
    panel.storyboardStatus = "pending";
    if (panel.panelSpec) panel.panelSpec.approval = "pending";
    project.storyboardApproval = project.storyboardApproval || {};
    project.storyboardApproval[panel.id] = false;
    project.productionStage = "storyboard-review";
    project.promptPackages = [];
    project.hasUnpublishedChanges = true;
  }

  function splitPanelMoment(moment) {
    const text = String(moment || "장면의 핵심 순간").trim();
    const parts = text.split(/(?:,|그리고|그러자|그때|뒤이어|후)\s*/u).map((item) => item.trim()).filter(Boolean);
    if (parts.length > 1) {
      return [clipText(parts[0], contentLimits.panelFields.beat), clipText(parts.slice(1).join(" "), contentLimits.panelFields.beat)];
    }
    return [
      clipText(`${text} 직전의 행동`, contentLimits.panelFields.beat),
      clipText(`${text} 결과가 드러나는 순간`, contentLimits.panelFields.beat)
    ];
  }

  function clearPanelVisualMetadata(panel) {
    panel.imageVersions = [];
    panel.currentVersionId = "";
    panel.draftApprovedVersionId = "";
    panel.finalApprovedVersionId = "";
    panel.approvedVersionId = "";
    panel.qcStatus = "missing";
    delete panel.imageData;
    delete panel.imageKey;
    delete panel.imageName;
    delete panel.imageUpdatedAt;
    delete panel.regenerationDraftMask;
    delete panel.regenerationDraftMaskMode;
    delete panel.regenerationDraftMaskTool;
    delete panel.regenerationDraftRegion;
    delete panel.lastRegenerationRequest;
  }

  async function clearPanelVisualState(panel) {
    await Promise.all((panel.imageVersions || []).map((version) => deletePanelImage(version.imageKey).catch(() => {})));
    clearPanelVisualMetadata(panel);
  }

  function createPanel(genre, idea, index, scenePlan, development = null) {
    const fallback = (beatBank[genre] || beatBank.daily)[index % (beatBank[genre] || beatBank.daily).length];
    const scene = scenePlan || planScene(genre, idea, index, fallback, development || createStoryDevelopment(idea, genre));
    const panelSpec = buildPanelSpec(scene, development, index);
    return {
      id: createId(),
      sceneId: scene.id,
      beat: scene.moment,
      camera: panelSpec.camera.shotSize,
      line: scene.line,
      sfx: scene.sfx,
      phase: scene.phase || "development",
      accent: accents[(index + genreIndex(genre)) % accents.length],
      note: `${index + 1}장면 · ${scene.purpose} · 한 순간, 한 카메라`,
      reaction: scene.reaction || "",
      panelSpec,
      storyboardStatus: "pending",
      imageData: "",
      imageName: "",
      frameX: 50,
      frameY: 50,
      gapAfter: scene.phase === "climax" ? 84 : scene.phase === "resolution" ? 70 : 46,
      overlayVisibility: {
        line: true,
        narration: true,
        sfx: true
      },
      overlayPositions: cloneOverlayDefaults()
    };
  }

  function cloneOverlayDefaults() {
    return Object.fromEntries(Object.entries(overlayDefaults).map(([key, point]) => [key, { ...point }]));
  }

  function ensurePanelEditingState(panel) {
    const savedVisibility = panel.overlayVisibility && typeof panel.overlayVisibility === "object"
      ? panel.overlayVisibility
      : {};
    const savedPositions = panel.overlayPositions && typeof panel.overlayPositions === "object"
      ? panel.overlayPositions
      : {};

    panel.reaction = String(panel.reaction || phaseReaction(panel.phase));
    panel.gapAfter = clampNumber(panel.gapAfter, 16, 180, panel.phase === "climax" ? 84 : panel.phase === "resolution" ? 70 : 46);
    panel.overlayVisibility = {
      line: savedVisibility.line !== false,
      narration: savedVisibility.narration !== false && savedVisibility.beat !== false,
      sfx: savedVisibility.sfx !== false
    };
    panel.overlayPositions = Object.fromEntries(Object.entries(overlayDefaults).map(([key, fallback]) => {
      const saved = savedPositions[key] || (key === "narration" ? savedPositions.beat : null) || {};
      return [key, {
        x: clampNumber(saved.x, 0, 96, fallback.x),
        y: clampNumber(saved.y, 0, 96, fallback.y)
      }];
    }));
    ensurePanelTextObjects(panel);
    panel.regenerationDraftMaskMode = panel.regenerationDraftMaskMode === "brush" ? "brush" : "rectangle";
    panel.regenerationDraftMaskTool = panel.regenerationDraftMaskTool === "erase" ? "erase" : "paint";
    panel.regenerationDraftMask = normalizeRegenerationMask(panel.regenerationDraftMask);
    if (panel.regenerationDraftRegion) {
      panel.regenerationDraftRegion = normalizeRegenerationRegion(panel.regenerationDraftRegion);
    }
    return panel;
  }

  function ensurePanelTextObjects(panel) {
    const existing = Array.isArray(panel.textObjects) ? panel.textObjects : [];
    const definitions = [
      { kind: "line", field: "line", visibility: "line", speakerId: "hero" },
      { kind: "narration", field: "reaction", visibility: "narration", speakerId: "narrator" },
      { kind: "sfx", field: "sfx", visibility: "sfx", speakerId: "sound" }
    ];
    const baseObjects = definitions.map((definition, order) => {
      const current = existing.find((item) => item.kind === definition.kind) || {};
      return {
        id: String(current.id || `text-${panel.id}-${definition.kind}`),
        kind: definition.kind,
        order: Number.isInteger(current.order) ? current.order : order,
        speakerId: String(current.speakerId || definition.speakerId),
        textByLocale: {
          ko: String(panel[definition.field] || current.textByLocale?.ko || ""),
          en: String(current.textByLocale?.en || ""),
          ja: String(current.textByLocale?.ja || "")
        },
        visible: panel.overlayVisibility?.[definition.visibility] !== false,
        position: { ...(panel.overlayPositions?.[definition.visibility] || overlayDefaults[definition.visibility]) },
        tailTarget: definition.kind === "line"
          ? { x: clampNumber(current.tailTarget?.x, 0, 100, 50), y: clampNumber(current.tailTarget?.y, 0, 100, 56) }
          : null,
        size: clampNumber(current.size, 0.8, 1.4, 1),
        locked: current.locked === true,
        stylePreset: String(current.stylePreset || (definition.kind === "line" ? "speech" : definition.kind)),
        style: { variant: definition.kind === "line" ? "speech" : definition.kind, ...(current.style || {}) }
      };
    });
    const extraObjects = existing
      .filter((item) => !definitions.some((definition) => definition.kind === item.kind))
      .filter((item) => ["dialogue", "thought"].includes(item.kind))
      .slice(0, 5)
      .map((item, extraIndex) => ({
        id: String(item.id || `text-${panel.id}-extra-${extraIndex + 1}`),
        kind: item.kind,
        order: Number.isInteger(item.order) ? item.order : baseObjects.length + extraIndex,
        speakerId: clipText(item.speakerId || "hero", 80),
        textByLocale: {
          ko: clipText(item.textByLocale?.ko || "추가 대사를 입력하세요.", contentLimits.panelFields.line),
          en: clipText(item.textByLocale?.en || "", contentLimits.panelFields.line),
          ja: clipText(item.textByLocale?.ja || "", contentLimits.panelFields.line)
        },
        visible: item.visible !== false,
        position: {
          x: clampNumber(item.position?.x, 0, 82, 48 + extraIndex * 6),
          y: clampNumber(item.position?.y, 0, 88, 20 + extraIndex * 12)
        },
        tailTarget: {
          x: clampNumber(item.tailTarget?.x, 0, 100, 50),
          y: clampNumber(item.tailTarget?.y, 0, 100, 56)
        },
        size: clampNumber(item.size, 0.8, 1.4, 1),
        locked: item.locked === true,
        stylePreset: String(item.stylePreset || (item.kind === "thought" ? "thought" : "speech")),
        style: { variant: item.kind === "thought" ? "thought" : "speech", ...(item.style || {}) }
      }));
    panel.textObjects = [...baseObjects, ...extraObjects].sort((a, b) => a.order - b.order);
    return panel.textObjects;
  }

  function syncPanelTextObjectsFromLegacy(panel) {
    ensurePanelTextObjects(panel);
    const mapping = {
      line: { field: "line", visibility: "line" },
      narration: { field: "reaction", visibility: "narration" },
      sfx: { field: "sfx", visibility: "sfx" }
    };
    panel.textObjects.forEach((item) => {
      const definition = mapping[item.kind];
      if (!definition) return;
      item.textByLocale.ko = String(panel[definition.field] || "");
      item.visible = panel.overlayVisibility?.[definition.visibility] !== false;
      item.position = { ...(panel.overlayPositions?.[definition.visibility] || overlayDefaults[definition.visibility]) };
    });
  }

  function panelTextForLocale(panel, kind, locale = "ko") {
    ensurePanelTextObjects(panel);
    const item = panel.textObjects.find((entry) => entry.kind === kind);
    return String(item?.textByLocale?.[locale] || item?.textByLocale?.ko || "");
  }

  function clampNumber(value, min, max, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
  }

  function overlayIsVisible(panel, key) {
    return panel.overlayVisibility?.[key] !== false;
  }

  function overlayPosition(panel, key) {
    return panel.overlayPositions?.[key] || overlayDefaults[key];
  }

  function overlayLabel(key) {
    return { line: "말풍선", narration: "나레이션", sfx: "의성어" }[key] || "텍스트";
  }

  function overlayKeyForField(field) {
    return field === "reaction" ? "narration" : field;
  }

  function addTwist(project) {
    if (!project.panels.length) {
      return;
    }
    const targetIndex = Math.max(0, project.panels.length - 2);
    const target = project.panels[targetIndex];
    target.beat = `예상과 다르게 ${target.beat}`;
    target.line = "잠깐, 이건 생각한 방향이 아닌데?";
    target.sfx = "반전";
    target.accent = "#e95b88";
  }

  function analyzeStory(story) {
    const text = String(story || "").replace(/\r/g, "").replace(/[ \t]+/g, " ").trim();
    const compactLength = text.replace(/\s/g, "").length;
    const sentences = splitStorySentences(text);
    const paragraphs = text ? text.split(/\n+/).filter(Boolean).length : 0;
    const signals = {
      goal: /원하|해야|하려|찾으|구하|막으|탈출|지키|되려|목표/u.test(text),
      conflict: /하지만|그러나|위험|실패|막히|쫓|공격|죽|잃|문제|괴물|균열|적이/u.test(text),
      turn: /하지만|그러나|그런데|그때|순간|알고 보니|드러나|바뀌|정체|사실/u.test(text),
      choice: /결심|선택|수락|거절|포기|대신|나서|하기로/u.test(text),
      cliffhanger: /문이 열|나타났|목소리|메시지|다음|아직|실종|정체|예정|돌아갈 수/u.test(text)
    };
    const signalCount = Object.values(signals).filter(Boolean).length;
    const beatCount = Math.max(
      text ? 1 : 0,
      Math.min(30, sentences.length + Math.ceil(signalCount * 0.8) + Math.max(0, paragraphs - 1))
    );
    const estimatedScenes = Math.max(4, Math.min(36, Math.ceil(compactLength / 65) + Math.ceil(beatCount * 0.7)));
    const estimatedReaderPanels = estimatedScenes * episodeRules.readerPanelsPerScene;
    const estimatedEpisodes = Math.max(1, Math.ceil(estimatedReaderPanels / episodeRules.targetReaderPanels));
    const missing = [];

    if (!signals.goal) missing.push("주인공의 목표");
    if (!signals.conflict) missing.push("실패 조건");
    if (!signals.turn) missing.push("중반 반전");
    if (!signals.cliffhanger) missing.push("마지막 질문");

    let state = "fit";
    let stateLabel = "1화 적정";
    let recommendedScenes = episodeRules.targetKeyScenes;

    if (compactLength < 180 || beatCount < 4 || (compactLength < 280 && beatCount < 7)) {
      state = "expand";
      stateLabel = compactLength < 100 ? "아이디어 단계" : "확장 필요";
      recommendedScenes = episodeRules.keySceneRange[0];
    } else if (compactLength > 950 || beatCount > 13 || estimatedReaderPanels > episodeRules.readerPanelRange[1]) {
      state = "split";
      stateLabel = "회차 분할 권장";
      recommendedScenes = episodeRules.targetKeyScenes;
    }

    const cutPlan = chooseEpisodeCut(text, sentences, state, estimatedEpisodes, signals);
    let comment;

    if (state === "expand") {
      const missingText = missing.slice(0, 2).join("과 ") || "구체적인 사건";
      comment = `지금은 좋은 출발점이지만 한 화로 읽기에는 짧습니다. ${missingText}을 보강하고, 주인공이 되돌릴 수 없는 선택을 하는 장면까지 확장해보세요.`;
    } else if (state === "split") {
      comment = `한 화에 모두 담으면 사건의 감정이 빨리 지나갑니다. 약 ${estimatedEpisodes}화 분량으로 보고, 첫 번째 큰 반전 직후 독자가 답을 궁금해하는 지점에서 1화를 닫는 편이 좋습니다.`;
    } else {
      const missingText = missing.length ? ` 다만 ${missing[0]}이 조금 더 선명하면 다음 화 유도가 좋아집니다.` : " 도입, 위기, 선택, 다음 질문의 흐름도 갖춰져 있습니다.";
      comment = `현재 원고는 한 화로 확장하기 좋은 밀도입니다.${missingText}`;
    }

    return {
      state,
      stateLabel,
      compactLength,
      sentenceCount: sentences.length,
      beatCount,
      estimatedScenes,
      estimatedReaderPanels,
      estimatedEpisodes,
      recommendedScenes,
      missing,
      signals,
      comment,
      cutLabel: cutPlan.label,
      episodeOneStory: cutPlan.episodeOneStory,
      nextEpisodeStory: cutPlan.nextEpisodeStory
    };
  }

  function splitStorySentences(text) {
    if (!text) {
      return [];
    }
    return (text.match(/[^.!?。！？\n]+[.!?。！？]?/gu) || [text])
      .map((sentence) => sentence.trim())
      .filter(Boolean);
  }

  function shorten(text, limit) {
    const value = String(text || "").trim();
    return value.length > limit ? `${value.slice(0, Math.max(1, limit - 1))}…` : value;
  }

  function clipText(value, limit) {
    return String(value ?? "").slice(0, Math.max(0, limit));
  }

  function textLength(value) {
    return String(value ?? "").length;
  }

  function placeCaretAtEnd(element) {
    const selection = window.getSelection?.();
    if (!selection || !element) {
      return;
    }
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function updateFieldCounter(target, limit) {
    if (!target || !limit) {
      return;
    }
    const counter = target.closest(".field")?.querySelector(".input-counter");
    if (!counter) {
      return;
    }
    const length = textLength(target.value);
    counter.textContent = `${length} / ${limit}`;
    counter.classList.toggle(
      "is-recommended-over",
      target.dataset.field === "line" && length > contentLimits.dialogueRecommendedMax
    );
  }

  function chooseEpisodeCut(text, sentences, state, estimatedEpisodes, signals) {
    if (!text) {
      return {
        label: "한 줄 아이디어부터 입력해보세요.",
        episodeOneStory: "",
        nextEpisodeStory: ""
      };
    }

    if (state === "expand") {
      return {
        label: "첫 위기를 해결한 직후, 더 큰 대가나 다음 임무가 드러나는 순간.",
        episodeOneStory: text,
        nextEpisodeStory: ""
      };
    }

    if (state !== "split" || sentences.length < 3) {
      const ending = sentences.at(-1) || text;
      return {
        label: signals.cliffhanger
          ? `“${shorten(ending, 92)}” 뒤에서 마감`
          : `“${shorten(ending, 82)}” 뒤에 돌이킬 수 없는 선택을 한 장면 더 붙여 마감`,
        episodeOneStory: text,
        nextEpisodeStory: ""
      };
    }

    const totalLength = sentences.reduce((sum, sentence) => sum + sentence.replace(/\s/g, "").length, 0);
    const targetLength = totalLength / estimatedEpisodes;
    let cumulative = 0;
    let bestIndex = 0;
    let bestScore = -Infinity;

    sentences.forEach((sentence, index) => {
      cumulative += sentence.replace(/\s/g, "").length;
      if (index >= sentences.length - 1) {
        return;
      }
      const distanceScore = 1 - Math.min(1, Math.abs(cumulative - targetLength) / Math.max(1, targetLength));
      const turnBonus = /하지만|그러나|그런데|그때|순간|결국|드러나|바뀌|정체|선택/u.test(sentence) ? 0.42 : 0;
      const positionPenalty = index < 1 ? 0.45 : 0;
      const score = distanceScore + turnBonus - positionPenalty;
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });

    const episodeOneStory = sentences.slice(0, bestIndex + 1).join(" ");
    const nextEpisodeStory = sentences.slice(bestIndex + 1).join(" ");
    return {
      label: `“${shorten(sentences[bestIndex], 92)}” 직후 1화 마감 · 뒤의 ${sentences.length - bestIndex - 1}개 사건 비트는 다음 화로`,
      episodeOneStory,
      nextEpisodeStory
    };
  }

  function renderStoryAdvisor(analysis) {
    const state = document.querySelector("[data-advisor-state]");
    if (!state) {
      return;
    }
    state.dataset.state = analysis.state;
    state.textContent = analysis.stateLabel;
    document.querySelector("[data-advisor-length]").textContent = `${analysis.compactLength.toLocaleString("ko-KR")}자 · ${analysis.beatCount}비트`;
    document.querySelector("[data-advisor-panels]").textContent = `약 ${analysis.estimatedReaderPanels}컷 · ${analysis.estimatedEpisodes}화`;
    document.querySelector("[data-advisor-scenes]").textContent = `${analysis.recommendedScenes}장면`;
    document.querySelector("[data-advisor-comment]").textContent = analysis.comment || buildAdvisorComment(analysis);
    document.querySelector("[data-advisor-cut]").textContent = analysis.cutLabel;
    const nextWrap = document.querySelector("[data-advisor-next-wrap]");
    const nextText = document.querySelector("[data-advisor-next]");
    if (nextWrap && nextText) {
      nextWrap.hidden = !analysis.nextEpisodeStory;
      nextText.textContent = analysis.nextEpisodeStory
        ? shorten(analysis.nextEpisodeStory, 220)
        : "";
    }
  }

  function buildAdvisorComment(analysis) {
    if (analysis.state === "expand") {
      return "아이디어를 주인공의 목표, 첫 실패, 되돌릴 수 없는 선택까지 확장하면 한 화의 추진력이 생깁니다.";
    }
    if (analysis.state === "split") {
      return `약 ${analysis.estimatedEpisodes}화 분량입니다. 첫 번째 큰 반전 뒤에서 1화를 닫고 나머지 사건은 다음 화로 넘기는 편이 좋습니다.`;
    }
    return "한 화로 확장하기 좋은 밀도입니다. 마지막 장면에는 다음 답을 보고 싶게 만드는 질문을 남겨보세요.";
  }

  function storyEditorPrompt(story, analysis) {
    return [
      "당신은 K웹툰의 회차 구성과 모바일 스크롤 리듬을 점검하는 스토리 편집자입니다.",
      "아래 원고를 특정 기존 작품과 비교하거나 모방하지 말고, 오리지널 현대 판타지 각성물로만 진단해주세요.",
      "한 화의 작업 목표는 핵심 장면 12~20개, 모바일 읽기 비트 약 48~60컷입니다.",
      "장면마다 2~4개의 표정, 행동, 반응, 여백 비트로 나눌 수 있다고 가정하세요.",
      "",
      "[원고]",
      String(story || "(비어 있음)"),
      "",
      "[브라우저 사전 진단]",
      `판정: ${analysis.stateLabel}`,
      `원고: ${analysis.compactLength}자 / ${analysis.beatCount}개 사건 비트`,
      `예상: 약 ${analysis.estimatedReaderPanels}컷 / ${analysis.estimatedEpisodes}화`,
      `1화 마감 제안: ${analysis.cutLabel}`,
      "",
      "[답변 형식]",
      "1. 분량 판정: 너무 짧음 / 1화 적정 / 분할 권장 중 하나와 이유 2문장",
      "2. 빠진 서사 요소: 최대 3개",
      "3. 1화에 포함할 내용과 정확한 마감 문장",
      "4. 다음 화로 넘길 내용",
      "5. 1화 핵심 장면 16개: 장면 목적, 사건, 감정 변화, 마지막 대사",
      "6. 마지막에 작가에게 가장 중요한 수정 한 가지만 짧게 코멘트"
    ].join("\n");
  }

  function ensureProjectSchemaV2(project) {
    if (!project || typeof project !== "object") {
      return project;
    }
    const idea = clipText(project.idea || project.episodeStory || "", contentLimits.storyMax).trim();
    const approved = Boolean(project.panels?.length && !project.schemaVersion);
    const defaults = createStoryDevelopment(idea, project.genre || "modern-awakening", { approved });
    project.schemaVersion = projectSchemaVersion;
    project.storyIntent = normalizeStoryIntent(project.storyIntent, defaults.storyIntent, idea, approved);
    project.aiSuggestions = normalizeStorySuggestions(project.aiSuggestions, defaults.aiSuggestions);
    project.seriesBible = normalizeSeriesBible(project.seriesBible, defaults.seriesBible);
    project.episodePlan = {
      ...(project.episodePlan && typeof project.episodePlan === "object" ? project.episodePlan : {}),
      ...Object.fromEntries(Object.entries(defaults.episodePlan).filter(([key]) => project.episodePlan?.[key] === undefined))
    };
    project.scenePlans = Array.isArray(project.scenePlans) ? project.scenePlans : [];
    project.panels = Array.isArray(project.panels) ? project.panels : [];
    project.panels.forEach((panel, index) => {
      ensurePanelProductionState(panel, index, project);
      ensurePanelVersionState(panel, project);
    });
    project.visualWorkflow = normalizeVisualWorkflow(project);
    if (!project.scenePlans.length && project.panels.length) {
      project.scenePlans = project.panels.map((panel, index) => ({
        id: panel.sceneId,
        order: index,
        phase: panel.phase || "development",
        purpose: panel.panelSpec.purpose,
        storyFact: panel.panelSpec.storyFact,
        moment: panel.panelSpec.moment,
        emotionBeforeAfter: panel.panelSpec.emotionBeforeAfter,
        line: panel.line || "",
        sfx: panel.sfx || "",
        reaction: panel.reaction || "",
        sourceTrace: panel.panelSpec.sourceTrace,
        approval: panel.storyboardStatus
      }));
    }
    project.storyboardApproval = project.storyboardApproval && typeof project.storyboardApproval === "object"
      ? project.storyboardApproval
      : {};
    project.panels.forEach((panel) => {
      project.storyboardApproval[panel.id] = panel.storyboardStatus === "approved";
    });
    project.promptPackages = Array.isArray(project.promptPackages) ? project.promptPackages : [];
    project.generationScope = ["representative", "remaining"].includes(project.generationScope)
      ? project.generationScope
      : "representative";
    project.publishLocales = Array.isArray(project.publishLocales) && project.publishLocales.includes("ko")
      ? [...new Set(project.publishLocales.filter((locale) => ["ko", "en", "ja"].includes(locale)))]
      : ["ko"];
    project.productionStage = project.productionStage || (approved ? "storyboard" : "story-draft");
    return project;
  }

  function normalizeVisualWorkflow(project) {
    const source = project?.visualWorkflow && typeof project.visualWorkflow === "object"
      ? project.visualWorkflow
      : {};
    const panels = project?.panels || [];
    const hasFinalResult = panels.some((panel) => panel.imageVersions?.some((version) => version.renderStage === "final"));
    const allDraftApproved = Boolean(panels.length && panels.every((panel) => isPanelStageApproved(panel, "draft")));
    const allFinalApproved = Boolean(panels.length && panels.every((panel) => isPanelStageApproved(panel, "final")));
    const hasExplicitPass = visualRenderStages.includes(source.generationPass);
    let generationPass = hasExplicitPass ? source.generationPass : "draft";
    if ((!hasExplicitPass && hasFinalResult) || allDraftApproved || allFinalApproved) {
      generationPass = "final";
    }
    const stage = allFinalApproved
      ? "final-approved"
      : generationPass === "final"
        ? (hasFinalResult ? "final-review" : "final-ready")
        : panels.some((panel) => panel.imageVersions?.some((version) => version.renderStage === "draft"))
          ? "draft-review"
          : isStoryboardReady(project)
            ? "draft-ready"
            : "storyboard-review";
    return {
      schemaVersion: "webtoon-visual-workflow/v1",
      stage,
      generationPass,
      queuedPass: visualRenderStages.includes(source.queuedPass) ? source.queuedPass : "",
      queuedJobId: String(source.queuedJobId || ""),
      draftApprovedAt: source.draftApprovedAt || (allDraftApproved ? new Date().toISOString() : ""),
      finalApprovedAt: source.finalApprovedAt || (allFinalApproved ? new Date().toISOString() : "")
    };
  }

  function syncVisualWorkflow(project) {
    project.visualWorkflow = normalizeVisualWorkflow(project);
    if (project.visualWorkflow.stage === "final-approved") {
      project.productionStage = "publish-ready";
    } else if (project.visualWorkflow.stage === "final-review") {
      project.productionStage = "visual-review";
    } else if (project.visualWorkflow.stage === "final-ready") {
      project.productionStage = "final-ready";
    } else if (project.visualWorkflow.stage === "draft-review") {
      project.productionStage = "draft-review";
    }
    return project.visualWorkflow;
  }

  function getVisualRenderStage(project) {
    return visualRenderStages.includes(project?.visualWorkflow?.generationPass)
      ? project.visualWorkflow.generationPass
      : "draft";
  }

  function getApprovedVersionForStage(panel, renderStage) {
    const pointer = renderStage === "draft" ? panel?.draftApprovedVersionId : panel?.finalApprovedVersionId || panel?.approvedVersionId;
    return panel?.imageVersions?.find((version) => version.id === pointer && version.renderStage === renderStage)
      || panel?.imageVersions?.find((version) => version.renderStage === renderStage && version.status === "approved")
      || null;
  }

  function isPanelStageApproved(panel, renderStage) {
    const version = getApprovedVersionForStage(panel, renderStage);
    return Boolean(version && version.qc?.overall === "approved");
  }

  function visualStageLabel(renderStage) {
    return renderStage === "final" ? "완성본" : "시안";
  }

  function ensurePanelProductionState(panel, index, project) {
    const phase = panel.phase || "development";
    const scene = {
      id: panel.sceneId || `scene-legacy-${String(index + 1).padStart(2, "0")}`,
      phase,
      purpose: scenePurpose(phase),
      storyFact: panel.beat || project?.storyIntent?.facts?.[0] || project?.idea || "장면 사건",
      moment: panel.beat || "장면의 핵심 순간",
      emotionBeforeAfter: sceneEmotionArc(phase),
      sourceTrace: "legacy-panel"
    };
    panel.sceneId = scene.id;
    panel.panelSpec = panel.panelSpec && typeof panel.panelSpec === "object"
      ? panel.panelSpec
      : buildPanelSpec(scene, project, index);
    panel.panelSpec.schemaVersion = 1;
    panel.panelSpec.storyFact = panel.panelSpec.storyFact || scene.storyFact;
    panel.panelSpec.purpose = panel.panelSpec.purpose || scene.purpose;
    panel.panelSpec.moment = panel.panelSpec.moment || scene.moment;
    panel.panelSpec.emotionBeforeAfter = panel.panelSpec.emotionBeforeAfter || scene.emotionBeforeAfter;
    const plannedShot = planShotForScene(phase, index);
    panel.panelSpec.camera = { ...plannedShot.camera, ...(panel.panelSpec.camera || {}) };
    panel.panelSpec.camera.angle = panel.panelSpec.camera.angle || "eye-level";
    panel.panelSpec.camera.height = panel.panelSpec.camera.height || cameraHeightForAngle(panel.panelSpec.camera.angle);
    panel.panelSpec.camera.lensFeel = panel.panelSpec.camera.lensFeel
      || lensFeelForShot(panel.panelSpec.camera.shotSize, panel.panelSpec.camera.angle);
    panel.panelSpec.camera.directorIntent = panel.panelSpec.camera.directorIntent
      || directorIntentForShot(phase, panel.panelSpec.camera.angle, panel.panelSpec.camera.shotSize);
    panel.panelSpec.subjects = Array.isArray(panel.panelSpec.subjects) && panel.panelSpec.subjects.length
      ? panel.panelSpec.subjects.map((subject, subjectIndex) => ({
          ...subject,
          facing: subject.facing || (subjectIndex === 0 ? plannedShot.facing : "three-quarter-left")
        }))
      : buildPanelSpec(scene, project, index).subjects;
    panel.panelSpec.camera.movementAxis = panel.panelSpec.camera.movementAxis
      || movementAxisForFacing(panel.panelSpec.subjects[0]?.facing);
    panel.storyboardStatus = ["pending", "approved"].includes(panel.storyboardStatus)
      ? panel.storyboardStatus
      : (project?.schemaVersion === projectSchemaVersion && project?.productionStage ? "pending" : "approved");
    panel.panelSpec.approval = panel.storyboardStatus;
    return panel;
  }

  function createPanelQc() {
    return {
      overall: "pending",
      checks: {
        requiredCharacters: null,
        visibleAction: null,
        emotionAndGaze: null,
        blocking: null,
        requiredProps: null,
        forbiddenElements: null,
        characterContinuity: null,
        locationContinuity: null,
        cameraCompliance: null,
        anatomyAndArtifacts: null,
        textSafety: null
      },
      storyMatch: "pending",
      characterContinuity: "pending",
      spatialContinuity: "pending",
      anatomy: "pending",
      textArtifacts: "pending",
      storyMatchScore: 0,
      continuityScore: 0,
      visualQualityScore: 0,
      reviewSource: "human",
      issues: [],
      reviewedAt: ""
    };
  }

  function normalizePanelQc(qc, status = "candidate") {
    const defaults = createPanelQc();
    const legacyChecks = qc?.checks || {};
    const normalized = {
      ...defaults,
      ...(qc || {}),
      checks: {
        ...defaults.checks,
        ...legacyChecks,
        blocking: legacyChecks.blocking ?? legacyChecks.blockingAndProps ?? null,
        requiredProps: legacyChecks.requiredProps ?? legacyChecks.blockingAndProps ?? null,
        locationContinuity: legacyChecks.locationContinuity ?? legacyChecks.locationAndCamera ?? null,
        cameraCompliance: legacyChecks.cameraCompliance ?? legacyChecks.locationAndCamera ?? null
      }
    };
    if (status === "approved" && normalized.overall === "approved") {
      Object.keys(normalized.checks).forEach((key) => {
        if (normalized.checks[key] === null) normalized.checks[key] = true;
      });
      normalized.storyMatchScore ||= 100;
      normalized.continuityScore ||= 100;
      normalized.visualQualityScore ||= 100;
    }
    return normalized;
  }

  function ensurePanelVersionState(panel, project) {
    panel.imageVersions = Array.isArray(panel.imageVersions) ? panel.imageVersions : [];
    if ((panel.imageKey || panel.imageData) && !panel.imageVersions.length) {
      const legacyId = `version-legacy-${hashText(panel.imageKey || panel.imageData || panel.id).slice(-8)}`;
      const imageKey = panel.imageKey || panelImageKey(project, panel, legacyId);
      panel.imageVersions.push({
        id: legacyId,
        imageKey,
        sourceAssetId: imageKey,
        name: panel.imageName || "기존 이미지",
        sourceUrl: panel.imageData && !/^data:/i.test(panel.imageData) ? panel.imageData : "",
        createdAt: panel.imageUpdatedAt || project?.updatedAt || new Date().toISOString(),
        sourcePromptHash: "legacy",
        sourceSpecHash: hashObject(panel.panelSpec || {}),
        renderStage: "final",
        requestedQuality: "high",
        status: "approved",
        qc: normalizePanelQc({ overall: "approved", issues: [], reviewedAt: panel.imageUpdatedAt || new Date().toISOString() }, "approved")
      });
      panel.imageKey = imageKey;
      panel.currentVersionId = legacyId;
      panel.finalApprovedVersionId = legacyId;
      panel.approvedVersionId = legacyId;
      panel.qcStatus = "approved";
    }
    panel.imageVersions = panel.imageVersions.map((version, index) => ({
      id: String(version.id || `version-${index + 1}`),
      parentVersionId: String(version.parentVersionId || ""),
      sourceAssetId: String(version.sourceAssetId || version.imageKey || panel.imageKey || ""),
      imageKey: String(version.imageKey || panel.imageKey || ""),
      name: clipText(version.name || panel.imageName || `버전 ${index + 1}`, 120),
      sourceUrl: String(version.sourceUrl || ""),
      createdAt: version.createdAt || panel.imageUpdatedAt || new Date().toISOString(),
      sourcePromptHash: String(version.sourcePromptHash || ""),
      sourceSpecHash: String(version.sourceSpecHash || ""),
      promptPackageId: String(version.promptPackageId || ""),
      editTarget: String(version.editTarget || "full"),
      maskAssetId: String(version.maskAssetId || ""),
      targetRegion: version.targetRegion ? normalizeRegenerationRegion(version.targetRegion) : null,
      renderStage: visualRenderStages.includes(version.renderStage)
        ? version.renderStage
        : (version.id === panel.draftApprovedVersionId ? "draft" : "final"),
      requestedQuality: ["low", "high"].includes(version.requestedQuality)
        ? version.requestedQuality
        : (version.renderStage === "draft" || version.id === panel.draftApprovedVersionId ? "low" : "high"),
      status: ["candidate", "approved", "needs-fix", "superseded"].includes(version.status) ? version.status : "candidate",
      qc: normalizePanelQc(version.qc, version.status)
    }));
    if (panel.imageVersions.length && !panel.imageVersions.some((version) => version.id === panel.currentVersionId)) {
      panel.currentVersionId = panel.imageVersions.at(-1).id;
    }
    const draftApproved = panel.imageVersions.find((version) => version.id === panel.draftApprovedVersionId && version.renderStage === "draft")
      || panel.imageVersions.find((version) => version.renderStage === "draft" && version.status === "approved");
    const finalApproved = panel.imageVersions.find((version) => version.id === (panel.finalApprovedVersionId || panel.approvedVersionId) && version.renderStage === "final")
      || panel.imageVersions.find((version) => version.renderStage === "final" && version.status === "approved");
    panel.draftApprovedVersionId = draftApproved?.id || "";
    panel.finalApprovedVersionId = finalApproved?.id || "";
    panel.approvedVersionId = finalApproved?.id || "";
    const activeStage = project?.visualWorkflow ? getVisualRenderStage(project) : finalApproved ? "final" : "draft";
    const activeApproved = getApprovedVersionForStage(panel, activeStage);
    panel.qcStatus = activeApproved
      ? "approved"
      : (getCurrentImageVersion(panel)?.status === "needs-fix" ? "needs-fix" : panel.imageVersions.length ? "pending" : "missing");
    return panel;
  }

  function getCurrentImageVersion(panel) {
    return panel?.imageVersions?.find((version) => version.id === panel.currentVersionId)
      || panel?.imageVersions?.at(-1)
      || null;
  }

  function getCurrentVersionForStage(panel, renderStage) {
    const current = getCurrentImageVersion(panel);
    return current?.renderStage === renderStage
      ? current
      : [...(panel?.imageVersions || [])].reverse().find((version) => version.renderStage === renderStage) || null;
  }

  function getPanelPromptPackage(project, panel) {
    return project?.promptPackages?.find((item) => item.panelId === panel?.id) || null;
  }

  async function activatePanelVersion(panel, version) {
    const stored = await getPanelImage(version.imageKey).catch(() => null);
    panel.currentVersionId = version.id;
    panel.imageKey = version.imageKey;
    panel.imageName = version.name || "";
    panel.imageUpdatedAt = version.createdAt || "";
    panel.imageData = stored?.dataUrl || version.sourceUrl || "";
  }

  async function hydrateVersionThumbnails(container, panel) {
    await Promise.all((panel.imageVersions || []).map(async (version) => {
      const node = container.querySelector(`[data-panel-id="${panel.id}"] [data-version-thumbnail="${version.id}"]`);
      if (!node) return;
      const source = version.id === panel.currentVersionId && panel.imageData
        ? panel.imageData
        : version.sourceUrl || (await getPanelImage(version.imageKey).catch(() => null))?.dataUrl || "";
      if (!source || !node.isConnected) return;
      const image = document.createElement("img");
      image.src = source;
      image.alt = "";
      image.loading = "lazy";
      node.textContent = "";
      node.appendChild(image);
    }));
  }

  function updateQcSummary(version) {
    const checks = version.qc?.checks || createPanelQc().checks;
    const score = (keys) => Math.round((keys.filter((key) => checks[key] === true).length / keys.length) * 100);
    const storyKeys = ["requiredCharacters", "visibleAction", "emotionAndGaze", "requiredProps", "forbiddenElements"];
    const continuityKeys = ["blocking", "characterContinuity", "locationContinuity", "cameraCompliance"];
    const qualityKeys = ["anatomyAndArtifacts", "textSafety"];
    version.qc.storyMatchScore = score(storyKeys);
    version.qc.continuityScore = score(continuityKeys);
    version.qc.visualQualityScore = score(qualityKeys);
    const values = Object.values(checks);
    if (values.some((value) => value === false)) {
      version.qc.overall = "needs-fix";
      version.status = "needs-fix";
    } else if (values.every((value) => value === true)) {
      version.qc.overall = version.status === "approved" ? "approved" : "ready";
      if (version.status !== "approved") version.status = "candidate";
    } else {
      version.qc.overall = "pending";
      if (version.status !== "approved") version.status = "candidate";
    }
    version.qc.reviewSource = "human";
    version.qc.reviewedAt = new Date().toISOString();
  }

  function buildQcFixInstruction(panel, version) {
    const labels = {
      requiredCharacters: "필요한 인물의 수와 정체",
      visibleAction: "장면의 핵심 행동",
      emotionAndGaze: "표정과 시선",
      blocking: "인물의 좌우·전후 위치",
      requiredProps: "필수 소품과 상태",
      forbiddenElements: "금지 인물·사물·문자",
      characterContinuity: "인물 외형·의상 연속성",
      locationContinuity: "장소 구조·조명 연속성",
      cameraCompliance: "카메라 구도와 안전 영역",
      anatomyAndArtifacts: "손·팔다리·중복 형태",
      textSafety: "가짜 문자와 말풍선 여백"
    };
    const failed = Object.entries(version.qc?.checks || {}).filter(([, value]) => value === false).map(([key]) => labels[key]).filter(Boolean);
    const note = version.qc?.issues?.[0]?.observed || "";
    return clipText([
      failed.length ? `${failed.join(", ")}을 바로잡아주세요.` : "검수에서 발견한 오류만 바로잡아주세요.",
      note,
      `유지할 이야기: ${panel.panelSpec?.storyFact || panel.beat}`,
      `반드시 보일 것: ${(panel.panelSpec?.mustInclude || []).join(", ")}`
    ].filter(Boolean).join(" "), contentLimits.regenerationInstructionMax);
  }

  function qcBadgeState(version, keys) {
    if (!version) return { state: "missing", label: "대기" };
    const values = keys.map((key) => version.qc?.checks?.[key]);
    if (values.some((value) => value === false)) return { state: "fail", label: "수정" };
    if (values.every((value) => value === true)) return { state: "pass", label: "통과" };
    return { state: "pending", label: "확인" };
  }

  function regenerationPreserveFields(target) {
    const map = {
      background: ["character", "character_design", "expression", "camera", "text", "overlay_layout"],
      character: ["background", "camera", "lighting", "text", "overlay_layout"],
      "specific-character": ["other_characters", "background", "camera", "lighting", "text", "overlay_layout"],
      face: ["hair", "outfit", "body_pose", "background", "camera", "lighting", "text", "overlay_layout"],
      hands: ["identity", "face", "outfit", "body_pose", "prop", "background", "camera", "text", "overlay_layout"],
      outfit: ["identity", "face", "body_pose", "background", "camera", "lighting", "text", "overlay_layout"],
      prop: ["identity", "character", "background", "camera", "lighting", "text", "overlay_layout"],
      lighting: ["identity", "character", "background_structure", "camera", "text", "overlay_layout"],
      composition: ["identity", "character_design", "location_identity", "story_beat", "text", "overlay_layout"],
      full: ["story_beat", "dialogue", "narration", "sfx"]
    };
    return map[target] || map.full;
  }

  function regenerationTargetRegion(panel, target, targetCharacterId = "") {
    const subject = panel.panelSpec?.subjects?.find((item) => item.characterId === targetCharacterId)
      || panel.panelSpec?.subjects?.[0]
      || {};
    const position = subject.screenPosition || "center midground";
    const centerX = /left/u.test(position) ? 28 : /right/u.test(position) ? 72 : 50;
    const regions = {
      face: { x: centerX - 12, y: 16, width: 24, height: 22 },
      hands: { x: centerX - 20, y: 42, width: 40, height: 30 },
      outfit: { x: centerX - 20, y: 30, width: 40, height: 48 },
      character: { x: centerX - 26, y: 12, width: 52, height: 76 },
      "specific-character": { x: centerX - 26, y: 12, width: 52, height: 76 },
      prop: { x: centerX - 26, y: 45, width: 52, height: 34 },
      lighting: { x: 0, y: 0, width: 100, height: 100 },
      composition: { x: 0, y: 0, width: 100, height: 100 },
      background: { x: 0, y: 0, width: 100, height: 100, excludeSubject: true },
      full: { x: 0, y: 0, width: 100, height: 100 }
    };
    return { mode: "semantic-rectangle", unit: "percent", ...(regions[target] || regions.full) };
  }

  function normalizeRegenerationRegion(value) {
    const source = value && typeof value === "object" ? value : {};
    const x = clampNumber(source.x, 0, 90, 0);
    const y = clampNumber(source.y, 0, 90, 0);
    const width = clampNumber(source.width, 10, 100 - x, 100 - x);
    const height = clampNumber(source.height, 10, 100 - y, 100 - y);
    return {
      ...source,
      mode: "semantic-rectangle",
      unit: "percent",
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height)
    };
  }

  function createRegenerationMask() {
    return {
      schemaVersion: "webtoon-region-mask-strokes/v1",
      width: regenerationMaskRules.width,
      height: regenerationMaskRules.height,
      brushSize: 28,
      strokes: [],
      updatedAt: ""
    };
  }

  function normalizeRegenerationMask(value) {
    const source = value && typeof value === "object" ? value : {};
    const strokes = Array.isArray(source.strokes) ? source.strokes : [];
    return {
      schemaVersion: "webtoon-region-mask-strokes/v1",
      width: regenerationMaskRules.width,
      height: regenerationMaskRules.height,
      brushSize: Math.round(clampNumber(source.brushSize, 8, 72, 28)),
      strokes: strokes.slice(-regenerationMaskRules.maxStrokes).map((stroke) => ({
        tool: stroke?.tool === "erase" ? "erase" : "paint",
        size: Math.round(clampNumber(stroke?.size, 8, 72, 28)),
        points: (Array.isArray(stroke?.points) ? stroke.points : [])
          .slice(0, regenerationMaskRules.maxPointsPerStroke)
          .map((point) => ({
            x: Math.round(clampNumber(point?.x, 0, 100, 50) * 10) / 10,
            y: Math.round(clampNumber(point?.y, 0, 100, 50) * 10) / 10
          }))
          .filter((point, index, points) => index === 0 || point.x !== points[index - 1].x || point.y !== points[index - 1].y)
      })).filter((stroke) => stroke.points.length),
      updatedAt: String(source.updatedAt || "")
    };
  }

  function regenerationMaskPoint(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.round(clampNumber(((event.clientX - rect.left) / rect.width) * 100, 0, 100, 50) * 10) / 10,
      y: Math.round(clampNumber(((event.clientY - rect.top) / rect.height) * 100, 0, 100, 50) * 10) / 10
    };
  }

  function drawRegenerationMask(canvas, rawMask, { visual = true } = {}) {
    const context = canvas?.getContext?.("2d");
    if (!context) return;
    const mask = normalizeRegenerationMask(rawMask);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.lineCap = "round";
    context.lineJoin = "round";
    mask.strokes.forEach((stroke) => {
      context.globalCompositeOperation = stroke.tool === "erase" ? "destination-out" : "source-over";
      context.strokeStyle = visual ? "rgba(78, 224, 181, 0.7)" : "#ffffff";
      context.fillStyle = context.strokeStyle;
      context.lineWidth = stroke.size;
      if (stroke.points.length === 1) {
        const point = stroke.points[0];
        context.beginPath();
        context.arc((point.x / 100) * canvas.width, (point.y / 100) * canvas.height, stroke.size / 2, 0, Math.PI * 2);
        context.fill();
      } else {
        context.beginPath();
        stroke.points.forEach((point, index) => {
          const x = (point.x / 100) * canvas.width;
          const y = (point.y / 100) * canvas.height;
          if (index === 0) context.moveTo(x, y);
          else context.lineTo(x, y);
        });
        context.stroke();
      }
    });
    context.globalCompositeOperation = "source-over";
  }

  function hydrateRegenerationMaskCanvases(container, project) {
    container.querySelectorAll("[data-regeneration-mask-canvas]").forEach((canvas) => {
      const panelElement = canvas.closest("[data-studio-panel-id]");
      const panel = project.panels.find((item) => item.id === panelElement?.dataset.studioPanelId);
      if (panel) drawRegenerationMask(canvas, panel.regenerationDraftMask, { visual: true });
    });
  }

  function rasterizeRegenerationMask(rawMask) {
    const mask = normalizeRegenerationMask(rawMask);
    if (!mask.strokes.some((stroke) => stroke.tool === "paint")) return null;
    const canvas = document.createElement("canvas");
    canvas.width = regenerationMaskRules.width;
    canvas.height = regenerationMaskRules.height;
    drawRegenerationMask(canvas, mask, { visual: false });
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let count = 0;
    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        if (pixels[((y * canvas.width) + x) * 4 + 3] < 16) continue;
        count += 1;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    if (!count || maxX < minX || maxY < minY) return null;
    const dataUrl = canvas.toDataURL("image/png");
    const bounds = {
      mode: "brush-mask",
      unit: "percent",
      x: Math.round((minX / canvas.width) * 1000) / 10,
      y: Math.round((minY / canvas.height) * 1000) / 10,
      width: Math.round(((maxX - minX + 1) / canvas.width) * 1000) / 10,
      height: Math.round(((maxY - minY + 1) / canvas.height) * 1000) / 10
    };
    const hash = hashText(dataUrl);
    return {
      schemaVersion: "webtoon-region-mask/v1",
      id: `brush-${hash}`,
      mimeType: "image/png",
      width: canvas.width,
      height: canvas.height,
      coverage: Math.round((count / (canvas.width * canvas.height)) * 10000) / 10000,
      encodedBytes: dataUrlByteLength(dataUrl),
      bounds,
      hash,
      dataUrl
    };
  }

  function normalizeStoryIntent(value, fallback, idea, approved) {
    const source = value && typeof value === "object" ? value : {};
    const sourceText = clipText(source.sourceText || idea, contentLimits.storyMax).trim();
    return {
      ...fallback,
      ...source,
      sourceText,
      sourceHash: source.sourceHash || hashText(sourceText),
      facts: Array.isArray(source.facts) && source.facts.length
        ? source.facts.map((item) => clipText(item, 240)).filter(Boolean).slice(0, 12)
        : fallback.facts,
      mustKeep: Array.isArray(source.mustKeep) ? source.mustKeep.map((item) => clipText(item, 240)).filter(Boolean).slice(0, 12) : [],
      mustAvoid: Array.isArray(source.mustAvoid) ? source.mustAvoid.map((item) => clipText(item, 240)).filter(Boolean).slice(0, 12) : [],
      approvedAt: source.approvedAt || (approved ? new Date().toISOString() : "")
    };
  }

  function normalizeStorySuggestions(value, fallback) {
    const source = Array.isArray(value) && value.length ? value : fallback;
    return source.slice(0, 12).map((item, index) => ({
      id: clipText(item.id || `suggestion-${index + 1}`, 80),
      type: Object.hasOwn(storySuggestionLabels, item.type) ? item.type : "visual-detail",
      text: clipText(item.text || "", 240),
      reason: clipText(item.reason || "장면을 그림으로 명확하게 옮기기 위한 보강입니다.", 180),
      source: "ai",
      approval: ["pending", "accepted", "edited", "rejected"].includes(item.approval) ? item.approval : "pending"
    })).filter((item) => item.text);
  }

  function normalizeSeriesBible(value, fallback) {
    const source = value && typeof value === "object" ? value : {};
    return {
      ...fallback,
      ...source,
      characters: Array.isArray(source.characters) && source.characters.length ? source.characters : fallback.characters,
      locations: Array.isArray(source.locations) && source.locations.length ? source.locations : fallback.locations,
      worldRules: Array.isArray(source.worldRules) ? source.worldRules : fallback.worldRules,
      styleGuide: { ...fallback.styleGuide, ...(source.styleGuide || {}) },
      creativeLocks: { ...fallback.creativeLocks, ...(source.creativeLocks || {}) }
    };
  }

  function createStoryDevelopment(story, genre, { approved = false } = {}) {
    const sourceText = clipText(story || "", contentLimits.storyMax).trim();
    const analysis = analyzeStory(sourceText);
    const facts = extractStoryFacts(sourceText);
    const heroRole = getHeroName(sourceText);
    const locationName = inferPrimaryLocation(sourceText);
    const now = approved ? new Date().toISOString() : "";
    return {
      storyIntent: {
        sourceText,
        sourceHash: hashText(sourceText),
        logline: facts[0] || shorten(sourceText, 140),
        theme: inferStoryTheme(sourceText),
        genre: genre || "modern-awakening",
        tone: inferStoryTone(sourceText),
        facts,
        mustKeep: [],
        mustAvoid: [],
        approvedAt: now
      },
      aiSuggestions: buildStorySuggestions(sourceText, analysis, heroRole).map((item) => ({
        ...item,
        approval: approved ? "accepted" : "pending"
      })),
      seriesBible: {
        characters: [{
          id: "hero",
          name: heroRole,
          role: "주인공",
          appearance: inferHeroAppearance(sourceText),
          outfitState: inferHeroOutfit(sourceText),
          speechStyle: "짧고 직접적인 말투",
          fixedProps: inferStoryProps(sourceText),
          references: [],
          locked: false,
          referenceStatus: approved ? "approved" : "pending",
          referenceApprovedAt: approved ? now : ""
        }],
        locations: [{
          id: "location-primary",
          name: locationName,
          structure: inferLocationStructure(sourceText, locationName),
          lighting: inferLocationLighting(sourceText),
          landmarks: [],
          references: [],
          locked: false,
          referenceStatus: approved ? "approved" : "pending",
          referenceApprovedAt: approved ? now : ""
        }],
        worldRules: [],
        styleGuide: {
          format: "vertical-webtoon",
          genre: genre || "modern-awakening",
          textInImage: false,
          originality: "기존 작품·캐릭터·로고·고유 화풍을 모방하지 않는 오리지널 디자인"
        },
        creativeLocks: {}
      },
      episodePlan: {
        objective: analysis.signals.goal ? "사용자 원고에 명시된 목표를 유지" : "선택한 보강안에서 이번 화의 목표를 확정",
        stakes: analysis.signals.conflict ? "사용자 원고에 명시된 실패 위험을 유지" : "선택한 보강안에서 실패 위험을 확정",
        openingHook: facts[0] || "첫 장면의 질문을 확정",
        turningPoint: "선택한 중반 전환을 사용",
        climax: "선택한 주인공의 결정을 사용",
        closingHook: "선택한 마지막 질문을 사용",
        episodeStory: analysis.episodeOneStory || sourceText,
        nextEpisodeStory: analysis.nextEpisodeStory || "",
        developmentApprovedAt: now
      }
    };
  }

  function prepareStoryDevelopment(project, story, genre) {
    const development = createStoryDevelopment(story, genre, { approved: false });
    return ensureProjectSchemaV2({
      ...project,
      schemaVersion: projectSchemaVersion,
      idea: story,
      genre,
      storyIntent: development.storyIntent,
      aiSuggestions: development.aiSuggestions,
      seriesBible: development.seriesBible,
      episodePlan: {
        ...(project.episodePlan || {}),
        ...development.episodePlan
      },
      productionStage: "story-review",
      updatedAt: new Date().toISOString(),
      hasUnpublishedChanges: true
    });
  }

  function approveStoryDevelopment(project, { sourceOnly = false } = {}) {
    const now = new Date().toISOString();
    project.aiSuggestions = (project.aiSuggestions || []).map((item) => ({
      ...item,
      approval: sourceOnly ? "rejected" : (item.approval === "rejected" ? "rejected" : "accepted")
    }));
    project.storyIntent.sourceHash = hashText(project.storyIntent.sourceText);
    project.storyIntent.approvedAt = now;
    project.episodePlan = {
      ...(project.episodePlan || {}),
      approvedSuggestions: project.aiSuggestions.filter((item) => item.approval === "accepted").map((item) => ({
        id: item.id,
        type: item.type,
        text: item.text
      })),
      developmentApprovedAt: now
    };
    project.productionStage = "story-approved";
    project.updatedAt = now;
    project.hasUnpublishedChanges = true;
  }

  function extractStoryDevelopment(project) {
    return {
      storyIntent: structuredCloneSafe(project.storyIntent),
      aiSuggestions: structuredCloneSafe(project.aiSuggestions || []),
      seriesBible: structuredCloneSafe(project.seriesBible),
      episodePlan: structuredCloneSafe(project.episodePlan || {})
    };
  }

  function isStoryDevelopmentApproved(project, story) {
    return Boolean(
      project?.storyIntent?.approvedAt
      && project.storyIntent.sourceHash === hashText(story)
      && project.storyIntent.sourceText === story
    );
  }

  function renderStoryDevelopment(project, { focus = false } = {}) {
    const panel = byId("storyDevelopmentPanel");
    const list = byId("storySuggestionList");
    const facts = byId("storyFactList");
    if (!panel || !list || !facts || !project?.storyIntent) {
      return;
    }
    const currentStory = byId("ideaInput")?.value.trim() || project.idea || "";
    const matches = project.storyIntent.sourceHash === hashText(currentStory);
    panel.hidden = !matches;
    if (!matches) {
      return;
    }
    const approved = isStoryDevelopmentApproved(project, currentStory);
    panel.dataset.state = approved ? "approved" : "pending";
    const state = byId("storyDevelopmentState");
    if (state) {
      state.textContent = approved ? "이야기 선택됨" : "확인 전";
    }
    facts.innerHTML = (project.storyIntent.facts || []).map((fact) => `<li>${escapeHtml(fact)}</li>`).join("")
      || "<li>원고에서 유지할 사건을 찾고 있습니다.</li>";
    list.innerHTML = (project.aiSuggestions || []).map((suggestion) => {
      const selected = suggestion.approval !== "rejected";
      return `
        <label class="story-suggestion-item ${selected ? "is-selected" : ""}">
          <input type="checkbox" data-story-suggestion-toggle="${escapeHtml(suggestion.id)}" ${selected ? "checked" : ""}>
          <span class="story-suggestion-check" aria-hidden="true">✓</span>
          <span class="story-suggestion-copy">
            <strong>${escapeHtml(storySuggestionLabels[suggestion.type] || "보강 내용")}</strong>
            <textarea rows="2" maxlength="240" data-story-suggestion-text="${escapeHtml(suggestion.id)}">${escapeHtml(suggestion.text)}</textarea>
            <small>${escapeHtml(suggestion.reason)}</small>
          </span>
        </label>
      `;
    }).join("");
    const keep = byId("storyMustKeep");
    const avoid = byId("storyMustAvoid");
    if (keep && document.activeElement !== keep) {
      keep.value = (project.storyIntent.mustKeep || []).join("\n");
    }
    if (avoid && document.activeElement !== avoid) {
      avoid.value = (project.storyIntent.mustAvoid || []).join("\n");
    }
    if (focus) {
      panel.hidden = false;
      panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function initializeStoryboardApproval(project, { approveAll = false, reset = false } = {}) {
    project.storyboardApproval = reset || !project.storyboardApproval || typeof project.storyboardApproval !== "object"
      ? {}
      : project.storyboardApproval;
    project.panels.forEach((panel, index) => {
      ensurePanelProductionState(panel, index, project);
      const approved = approveAll || (!reset && project.storyboardApproval[panel.id] === true);
      panel.storyboardStatus = approved ? "approved" : "pending";
      panel.panelSpec.approval = panel.storyboardStatus;
      project.storyboardApproval[panel.id] = approved;
      panel.panelSpec.continuity.previousPanelId = index > 0 ? project.panels[index - 1].id : "";
    });
    project.generationReadiness = getGenerationReadiness(project);
  }

  function renderStoryboardApproval(project, selectedPanelId = "") {
    const root = byId("storyboardApprovalPanel");
    const list = byId("storyboardSceneList");
    const state = byId("storyboardApprovalState");
    const readinessNode = byId("storyboardReadiness");
    if (!root || !list || !state || !readinessNode) {
      return;
    }
    const visible = Boolean(project?.panels?.length && isStoryDevelopmentApproved(project, project.idea || ""));
    root.hidden = !visible;
    if (!visible) {
      return;
    }
    project.panels.forEach((panel, index) => ensurePanelProductionState(panel, index, project));
    const approvedCount = project.panels.filter((panel) => panel.storyboardStatus === "approved").length;
    const readiness = getGenerationReadiness(project);
    project.generationReadiness = readiness;
    root.dataset.state = readiness.ready ? "approved" : "pending";
    state.textContent = `${approvedCount} / ${project.panels.length}`;
    list.innerHTML = project.panels.map((panel, index) => {
      const spec = panel.panelSpec;
      const approved = panel.storyboardStatus === "approved";
      const selected = panel.id === selectedPanelId;
      return `
        <article class="storyboard-scene-item ${approved ? "is-approved" : ""} ${selected ? "is-current" : ""}">
          <button class="storyboard-scene-select" type="button" data-storyboard-select="${escapeHtml(panel.id)}" aria-label="${index + 1}컷 미리보기로 이동">
            <span>${String(index + 1).padStart(2, "0")}</span>
            <span>
              <strong>${escapeHtml(spec.purpose)}</strong>
              <small>${escapeHtml(shorten(spec.moment, 86))}</small>
            </span>
            <i>${escapeHtml(cameraLabel(spec.camera?.shotSize))}</i>
          </button>
          <button class="storyboard-approve-button" type="button" data-storyboard-approve="${escapeHtml(panel.id)}" aria-pressed="${approved}">${approved ? "선택됨" : "이 구도"}</button>
        </article>
      `;
    }).join("");
    readinessNode.dataset.state = readiness.ready ? "ready" : readiness.structuralIssues.length ? "blocked" : "pending";
    readinessNode.innerHTML = readiness.ready
      ? `<strong>그림 만들기 준비 완료</strong><span>모든 컷의 사건과 구도를 골랐습니다.</span>`
      : readiness.structuralIssues.length
        ? `<strong>확인이 필요한 항목 ${readiness.structuralIssues.length}개</strong><span>${escapeHtml(readiness.structuralIssues[0])}</span>`
        : `<strong>${project.panels.length - approvedCount}컷 확인 필요</strong><span>컷을 누르면 오른쪽 세로 콘티에서 바로 확인할 수 있습니다.</span>`;
    if (byId("approveAllStoryboardButton")) {
      byId("approveAllStoryboardButton").disabled = Boolean(readiness.structuralIssues.length);
    }
  }

  function getGenerationReadiness(project) {
    const structuralIssues = [];
    if (!isStoryDevelopmentApproved(project, project?.idea || "")) {
      structuralIssues.push("사용할 이야기 보강안을 먼저 골라주세요.");
    }
    const unapprovedSuggestions = (project?.aiSuggestions || []).filter((item) => item.approval === "pending" || item.approval === "edited");
    if (unapprovedSuggestions.length) {
      structuralIssues.push(`AI 보강안 ${unapprovedSuggestions.length}개의 사용 여부가 정해지지 않았습니다.`);
    }
    (project?.panels || []).forEach((panel, index) => {
      const spec = panel.panelSpec || {};
      if (!spec.storyFact || !spec.moment) structuralIssues.push(`${index + 1}컷의 사건 또는 보이는 순간이 비어 있습니다.`);
      if (!spec.subjects?.every((subject) => subject.characterId && subject.action)) structuralIssues.push(`${index + 1}컷의 인물 행동 정보가 부족합니다.`);
      if (!spec.setting?.locationId) structuralIssues.push(`${index + 1}컷의 장소 기준이 없습니다.`);
      if (!spec.camera?.shotSize || !spec.camera?.focalTarget) structuralIssues.push(`${index + 1}컷의 카메라 기준이 없습니다.`);
      if (!spec.overlaySafeZones?.length) structuralIssues.push(`${index + 1}컷의 말풍선 안전 영역이 없습니다.`);
    });
    const approvedCount = (project?.panels || []).filter((panel) => panel.storyboardStatus === "approved").length;
    return {
      ready: Boolean(project?.panels?.length && approvedCount === project.panels.length && !structuralIssues.length),
      approvedCount,
      total: project?.panels?.length || 0,
      structuralIssues: [...new Set(structuralIssues)]
    };
  }

  function isStoryboardReady(project) {
    return getGenerationReadiness(project).ready;
  }

  function cameraLabel(value) {
    return {
      wide: "원경",
      "medium-wide": "중원경",
      medium: "중경",
      "medium-close": "중근경",
      close: "근경",
      detail: "세부"
    }[value] || "중경";
  }

  function cameraAngleLabel(value) {
    return {
      "eye-level": "눈높이",
      "profile-side": "인물 옆에서",
      "bird-eye": "천장에서 아래로",
      "high-angle": "위에서 내려다보기",
      "slightly-high": "살짝 위에서",
      "low-angle": "아래에서 올려다보기",
      "slightly-low": "살짝 아래에서",
      "ground-low-diagonal": "바닥에서 대각선 위로",
      "over-shoulder": "어깨 너머로",
      "dutch-subtle": "살짝 기울인 화면"
    }[value] || "눈높이";
  }

  function characterFacingLabel(value) {
    return {
      front: "앞모습",
      back: "뒷모습",
      "left-profile": "왼쪽 옆모습",
      "right-profile": "오른쪽 옆모습",
      "three-quarter-left": "왼쪽 반측면",
      "three-quarter-right": "오른쪽 반측면"
    }[value] || "왼쪽 반측면";
  }

  function cameraHeightForAngle(angle) {
    if (["bird-eye", "high-angle", "slightly-high"].includes(angle)) return angle === "bird-eye" ? "천장 높이" : "머리 위";
    if (["ground-low-diagonal", "low-angle", "slightly-low"].includes(angle)) return angle === "ground-low-diagonal" ? "바닥 가까이" : "허리 아래";
    if (angle === "over-shoulder") return "인물 어깨 높이";
    return "눈높이";
  }

  function lensFeelForShot(shotSize, angle) {
    if (["bird-eye", "wide", "medium-wide"].includes(angle) || ["wide", "medium-wide"].includes(shotSize)) return "공간 깊이와 이동 경로가 읽히는 넓은 화각";
    if (["detail", "close"].includes(shotSize)) return "표정과 단서만 분리하는 얕은 심도";
    if (["ground-low-diagonal", "low-angle"].includes(angle)) return "전경을 크게 두어 원근과 힘을 강조하는 화각";
    return "인물 왜곡이 적고 행동이 자연스러운 표준 화각";
  }

  function movementAxisForFacing(facing) {
    if (["left-profile", "three-quarter-left"].includes(facing)) return "화면 오른쪽에서 왼쪽으로 이어지는 시선·행동 축";
    if (["right-profile", "three-quarter-right"].includes(facing)) return "화면 왼쪽에서 오른쪽으로 이어지는 시선·행동 축";
    if (facing === "back") return "인물 뒤에서 화면 깊이 방향으로 이어지는 축";
    return "카메라를 향하는 중심 축";
  }

  function directorIntentForShot(phase, angle, shotSize) {
    const emotionalPurpose = {
      "cold-open": "공간 속 고립감과 첫 의문을 동시에 제시",
      setup: "행동 방향과 생활 공간을 자연스럽게 소개",
      hook: "인물이 발견한 단서를 독자도 같은 순서로 보게 함",
      threat: "위협의 크기와 인물의 열세를 강조",
      climax: "행동의 속도와 충돌 방향을 가장 강하게 전달",
      reveal: "인물이 몰랐던 사건의 전체 규모를 공개",
      cliffhanger: "다음 컷을 넘기게 할 정보 하나만 강하게 남김"
    }[phase] || "이 컷의 핵심 감정과 행동을 한눈에 전달";
    return `${emotionalPurpose}; ${cameraAngleLabel(angle)} ${cameraLabel(shotSize)} 구도를 사용하되 앞뒤 컷과 같은 거리·각도를 반복하지 않음`;
  }

  function getRepresentativePanelIds(project) {
    const panels = project?.panels || [];
    if (!panels.length) return [];
    return [...new Set([0, Math.floor((panels.length - 1) / 2), panels.length - 1])]
      .map((index) => panels[index]?.id)
      .filter(Boolean);
  }

  function isRepresentativeBatchApproved(project, renderStage = getVisualRenderStage(project)) {
    const ids = getRepresentativePanelIds(project);
    return Boolean(ids.length && ids.every((id) => {
      const panel = project.panels.find((item) => item.id === id);
      ensurePanelVersionState(panel, project);
      return isPanelStageApproved(panel, renderStage);
    }));
  }

  function getGenerationBatch(project) {
    const representativeIds = new Set(getRepresentativePanelIds(project));
    const scope = project.generationScope === "remaining" ? "remaining" : "representative";
    const renderStage = getVisualRenderStage(project);
    return (project.promptPackages || []).filter((item) => (
      (!item.status || item.status === "ready")
      && item.renderStage === renderStage
      && (scope === "representative" ? representativeIds.has(item.panelId) : !representativeIds.has(item.panelId))
    ));
  }

  function renderVisualWorkflowSteps(project) {
    const root = byId("visualWorkflowSteps");
    if (!root) return;
    const visible = Boolean(project?.panels?.length && isStoryDevelopmentApproved(project, project.idea || ""));
    root.hidden = !visible;
    if (!visible) return;
    const workflow = syncVisualWorkflow(project);
    const storyboardReady = isStoryboardReady(project);
    const anyDraft = project.panels.some((panel) => panel.imageVersions?.some((version) => version.renderStage === "draft"));
    const allDraft = project.panels.every((panel) => isPanelStageApproved(panel, "draft"));
    const anyFinal = project.panels.some((panel) => panel.imageVersions?.some((version) => version.renderStage === "final"));
    const allFinal = project.panels.every((panel) => isPanelStageApproved(panel, "final"));
    const state = {
      storyboard: { complete: storyboardReady, current: !storyboardReady },
      draft: { complete: allDraft || workflow.generationPass === "final", current: storyboardReady && workflow.generationPass === "draft" },
      final: { complete: allFinal, current: workflow.generationPass === "final" && !allFinal },
      approval: { complete: allFinal, current: allFinal }
    };
    if (!anyDraft && workflow.generationPass === "draft") state.draft.current = storyboardReady;
    if (!anyFinal && workflow.generationPass === "final") state.final.current = true;
    root.querySelectorAll("[data-visual-step]").forEach((item) => {
      const itemState = state[item.dataset.visualStep] || {};
      item.classList.toggle("is-complete", Boolean(itemState.complete));
      item.classList.toggle("is-current", Boolean(itemState.current));
      item.setAttribute("aria-current", itemState.current ? "step" : "false");
    });
  }

  function renderGenerationQueue(project) {
    const root = byId("generationQueuePanel");
    const state = byId("generationQueueState");
    const referenceNode = byId("referenceReadiness");
    const packageNode = byId("promptPackageList");
    const queueButton = byId("queueGenerationButton");
    const copyButton = byId("copyAllPromptPackagesButton");
    if (!root || !state || !referenceNode || !packageNode || !queueButton || !copyButton) {
      return;
    }
    const visible = Boolean(project?.panels?.length && isStoryDevelopmentApproved(project, project.idea || ""));
    root.hidden = !visible;
    if (!visible) {
      return;
    }
    const workflow = syncVisualWorkflow(project);
    const renderStage = workflow.generationPass;
    const renderLabel = visualStageLabel(renderStage);
    renderVisualWorkflowSteps(project);
    const character = project.seriesBible?.characters?.[0] || {};
    const location = project.seriesBible?.locations?.[0] || {};
    const reference = getReferenceReadiness(project);
    const readiness = getPromptReadiness(project);
    const sourceProjectHash = promptSourceHash(project);
    if (readiness.ready && (!project.promptPackages?.length || project.promptPackages[0]?.sourceProjectHash !== sourceProjectHash || project.promptPackages[0]?.renderStage !== renderStage)) {
      project.promptPackages = compilePromptPackages(project);
    }
    const queued = project.productionStage === "generation-queued" && project.visualWorkflow?.queuedPass === renderStage;
    const representativeIds = new Set(getRepresentativePanelIds(project));
    const representativeApproved = isRepresentativeBatchApproved(project, renderStage);
    if (project.generationScope === "remaining" && !representativeApproved) {
      project.generationScope = "representative";
    }
    const scopeInputs = root.querySelectorAll("[name='generation-scope']");
    scopeInputs.forEach((input) => {
      input.checked = input.value === project.generationScope;
      input.disabled = input.value === "remaining" && !representativeApproved;
    });
    const scopeHint = byId("generationScopeHint");
    if (scopeHint) {
      scopeHint.textContent = representativeApproved
        ? `대표 ${renderLabel}을 골랐습니다. 나머지 컷을 이어서 요청할 수 있습니다.`
        : renderStage === "draft"
          ? "도입·중간·마지막 대표 시안으로 이야기와 구도를 먼저 확인합니다."
          : "선택한 대표 시안의 위치와 카메라를 유지한 완성본부터 확인합니다.";
    }
    const title = byId("generationQueueTitle");
    const kicker = byId("generationQueueKicker");
    const copy = byId("generationQueueCopy");
    const costNote = byId("generationCostNote");
    if (title) title.textContent = renderStage === "draft" ? "저비용 시안 만들기" : "선택한 시안 완성화";
    if (kicker) kicker.textContent = renderStage === "draft" ? "Visual draft" : "Final rendering";
    if (copy) copy.textContent = renderStage === "draft"
      ? "완성 작화 전에 인물 위치, 이야기 전달과 카메라 구도를 빠르게 확인합니다."
      : "선택한 시안을 구도 기준으로 고정하고, 인물과 배경을 게시 가능한 완성 작화로 다듬습니다.";
    if (costNote) costNote.textContent = renderStage === "draft"
      ? `콘티는 무료입니다. 시안 요청은 ${generationPassCost}도토리를 사용하며 작화 완성도 대신 구도를 확인합니다.`
      : `완성화 요청은 ${generationPassCost}도토리를 사용합니다. 선택한 시안 구도를 바꾸지 않고 최종 품질로 제작합니다.`;
    const generationBatch = getGenerationBatch(project);
    root.dataset.state = queued ? "queued" : readiness.ready ? "approved" : "pending";
    state.textContent = queued ? "작업 접수됨" : readiness.ready ? `${generationBatch.length}컷 준비` : "준비 전";
    referenceNode.innerHTML = `
      <article class="reference-item ${character.referenceStatus === "approved" ? "is-approved" : ""}">
        <div class="reference-item-head"><strong>인물 기준</strong><span>${character.referenceStatus === "approved" ? "확정" : "확인 필요"}</span></div>
        <label><span>외형</span><textarea rows="2" maxlength="500" data-reference-field="character.appearance">${escapeHtml(character.appearance || "")}</textarea></label>
        <label><span>의상·소품</span><textarea rows="2" maxlength="500" data-reference-field="character.outfitState">${escapeHtml(character.outfitState || "")}</textarea></label>
        <button class="tool-button mini" type="button" data-reference-approve="character">인물 기준 확정</button>
      </article>
      <article class="reference-item ${location.referenceStatus === "approved" ? "is-approved" : ""}">
        <div class="reference-item-head"><strong>장소 기준</strong><span>${location.referenceStatus === "approved" ? "확정" : "확인 필요"}</span></div>
        <label><span>공간 구조</span><textarea rows="2" maxlength="500" data-reference-field="location.structure">${escapeHtml(location.structure || "")}</textarea></label>
        <label><span>조명</span><textarea rows="2" maxlength="500" data-reference-field="location.lighting">${escapeHtml(location.lighting || "")}</textarea></label>
        <button class="tool-button mini" type="button" data-reference-approve="location">장소 기준 확정</button>
      </article>
    `;
    packageNode.innerHTML = readiness.ready
      ? project.promptPackages.map((item, index) => `
          <div class="prompt-package-item" data-state="${escapeHtml(item.status || "ready")}" data-batch="${representativeIds.has(item.panelId) ? "representative" : "remaining"}">
            <span>${String(index + 1).padStart(2, "0")}</span>
            <span><strong>${escapeHtml(shorten(item.expectedResult?.moment || "컷 프롬프트", 72))}</strong><small>${representativeIds.has(item.panelId) ? "대표 컷 · " : ""}${escapeHtml(renderLabel)} · ${escapeHtml(item.referenceManifest.length ? `참조 ${item.referenceManifest.length}개` : "텍스트 기준 참조")}</small></span>
            <i>${escapeHtml({ queued: "접수", ready: "대기", running: `${Math.round(item.progress || 0)}%`, done: "도착", failed: "실패" }[item.status] || "준비")}</i>
          </div>
        `).join("")
      : `<div class="generation-lock-message"><strong>${reference.ready ? "콘티 확인이 필요합니다" : "인물·장소 기준을 먼저 확정해주세요"}</strong><span>${escapeHtml(readiness.issues[0] || "준비 항목을 확인해주세요.")}</span></div>`;
    queueButton.disabled = !readiness.ready || queued || !generationBatch.length;
    queueButton.textContent = queued ? `${renderLabel} 작업 접수됨` : `${project.generationScope === "remaining" ? "나머지" : "대표"} ${generationBatch.length}컷 ${renderStage === "draft" ? "시안" : "완성화"} 요청 · ${generationPassCost}도토리`;
    copyButton.disabled = !readiness.ready || !project.promptPackages.length;
  }

  function renderQualityReview(project) {
    const root = byId("qualityReviewPanel");
    const state = byId("qualityReviewState");
    const list = byId("qualityReviewList");
    const publish = byId("publishReadiness");
    if (!root || !state || !list || !publish) {
      return;
    }
    const workflow = syncVisualWorkflow(project);
    const renderStage = workflow.generationPass;
    const renderLabel = visualStageLabel(renderStage);
    project.panels.forEach((panel) => ensurePanelVersionState(panel, project));
    const hasResults = project.panels.some((panel) => panel.imageVersions.length)
      || ["generation-queued", "visual-review", "lettering-review", "publish-ready"].includes(project.productionStage);
    root.hidden = !hasResults;
    if (!hasResults) {
      return;
    }
    const approvedCount = project.panels.filter((panel) => isPanelStageApproved(panel, renderStage)).length;
    const readiness = getPublishReadiness(project);
    const title = byId("qualityReviewTitle");
    const kicker = byId("qualityReviewKicker");
    const copy = byId("qualityReviewCopy");
    if (title) title.textContent = renderStage === "draft" ? "시안 구도 확인" : "완성본 최종 검수";
    if (kicker) kicker.textContent = renderStage === "draft" ? "Draft review" : "Final review";
    if (copy) copy.textContent = renderStage === "draft"
      ? "시안에서는 이야기, 인물 위치와 카메라 구도만 확인합니다. 세부 작화는 완성화 단계에서 다듬습니다."
      : "완성본의 이야기 일치, 인물 연속성, 손과 얼굴, 배경과 글자 여백을 확인한 뒤 사용할 버전을 고릅니다.";
    root.querySelectorAll("[data-publish-locale]").forEach((input) => {
      input.checked = input.dataset.publishLocale === "ko" || (project.publishLocales || ["ko"]).includes(input.dataset.publishLocale);
    });
    root.dataset.state = renderStage === "final" && readiness.ready ? "approved" : approvedCount ? "pending" : "review";
    state.textContent = `${approvedCount} / ${project.panels.length}`;
    list.innerHTML = project.panels.map((panel, index) => {
      const current = getCurrentVersionForStage(panel, renderStage);
      const approved = isPanelStageApproved(panel, renderStage);
      const label = approved ? `${renderLabel} 선택` : current?.status === "needs-fix" ? "수정 필요" : current ? "검수 전" : `${renderLabel} 대기`;
      return `
        <button class="quality-review-item" type="button" data-quality-panel="${escapeHtml(panel.id)}" data-state="${approved ? "approved" : current?.status || "missing"}">
          <span>${String(index + 1).padStart(2, "0")}</span>
          <span><strong>${escapeHtml(shorten(panel.panelSpec?.moment || panel.beat, 68))}</strong><small>${escapeHtml(current?.name || "아직 가져온 이미지가 없습니다.")} · ${escapeHtml(panelTranslationLabel(panel, project.publishLocales))}</small></span>
          <i>${escapeHtml(label)}</i>
        </button>
      `;
    }).join("");
    publish.innerHTML = renderStage === "draft"
      ? approvedCount === project.panels.length
        ? "<strong>시안 선택 완료</strong><span>고른 구도를 기준으로 완성화를 시작할 수 있습니다.</span>"
        : `<strong>완성화 전 확인</strong><span>${project.panels.length - approvedCount}컷의 시안 구도를 더 골라야 합니다.</span>`
      : readiness.ready
        ? "<strong>게시 준비 완료</strong><span>모든 컷의 완성본이 최종 검수를 통과했습니다.</span>"
        : `<strong>게시 전 확인</strong><span>${escapeHtml(readiness.issues[0] || "완성본 검수가 필요합니다.")}</span>`;
    const report = byId("authorAssistantReport");
    if (report) {
      const notes = renderStage === "draft"
        ? ["대사보다 인물의 행동이 먼저 읽히는지 확인하세요.", "카메라와 인물 위치가 마음에 들지 않으면 완성화 전에 시안을 수정하세요."]
        : buildAuthorAssistantReport(project, readiness);
      report.innerHTML = `<div><span>Author assistant</span><strong>${renderStage === "draft" ? "시안에서 확인할 것" : "게시 전 우선 확인"}</strong></div><ol>${notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("")}</ol>`;
    }
    list.querySelectorAll("[data-quality-panel]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = project.panels.find((panel) => panel.id === button.dataset.qualityPanel);
        if (!target) return;
        selectedPanelId = target.id;
        renderPanelList(byId("panelList"), project);
        renderStudioPreview(byId("phonePreview"), project, selectedPanelId);
        byId("phonePreview")?.querySelector(`[data-studio-panel-id="${target.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  }

  function getPublishReadiness(project) {
    const issues = [];
    if (!isStoryDevelopmentApproved(project, project.idea || "")) {
      issues.push("사용할 이야기 보강안을 먼저 골라주세요.");
    }
    if (!isStoryboardReady(project)) {
      issues.push("모든 세로 콘티를 먼저 확인해주세요.");
    }
    (project.panels || []).forEach((panel, index) => {
      ensurePanelVersionState(panel, project);
      const current = getCurrentVersionForStage(panel, "final");
      if (!current) {
        issues.push(`${index + 1}컷 완성본이 없습니다.`);
      } else if (current.id !== (panel.finalApprovedVersionId || panel.approvedVersionId) || current.qc?.overall !== "approved") {
        issues.push(`${index + 1}컷의 완성본을 확인하고 사용할 버전을 골라주세요.`);
      }
      issues.push(...getPanelTextPublishingIssues(panel, project.publishLocales || ["ko"], index));
    });
    return { ready: Boolean(project.panels?.length && !issues.length), issues: [...new Set(issues)] };
  }

  function getPanelTextPublishingIssues(panel, locales, index) {
    ensurePanelEditingState(panel);
    const issues = [];
    (locales || ["ko"]).forEach((locale) => {
      panel.textObjects.filter((item) => item.visible).forEach((item) => {
        if (!String(item.textByLocale?.[locale] || "").trim()) {
          const language = { ko: "한국어", en: "영어", ja: "일본어" }[locale] || locale;
          const kind = { line: "말풍선", narration: "나레이션", sfx: "효과음" }[item.kind] || "글자";
          issues.push(`${index + 1}컷의 ${language} ${kind}이 비어 있습니다.`);
        } else if (textObjectLikelyOverflows(item, locale)) {
          const language = { ko: "한국어", en: "영어", ja: "일본어" }[locale] || locale;
          issues.push(`${index + 1}컷의 ${language} 글자가 모바일 말풍선에서 넘칠 수 있습니다.`);
        }
      });
    });
    return issues;
  }

  function textObjectLikelyOverflows(item, locale) {
    const text = String(item.textByLocale?.[locale] || "").trim();
    const compactLength = text.replace(/\s+/gu, "").length;
    const limits = {
      dialogue: locale === "en" ? 105 : 68,
      thought: locale === "en" ? 105 : 68,
      narration: locale === "en" ? 170 : 112,
      sfx: 24,
      line: locale === "en" ? 105 : 68
    };
    return compactLength > (limits[item.kind] || 88) || text.split(/\r?\n/u).length > 4;
  }

  function buildAuthorAssistantReport(project, readiness = getPublishReadiness(project)) {
    const notes = [...readiness.issues];
    const panels = project.panels || [];
    if (panels.length && !panels.slice(0, Math.min(2, panels.length)).some((panel) => /목표|퀘스트|해야|찾|구하|탈출|선택/u.test(`${panel.beat} ${panel.line}`))) {
      notes.push("첫 5스크롤 안에서 주인공의 목표나 질문이 더 또렷하게 보이도록 다듬어보세요.");
    }
    const repeated = panels.filter((panel, index) => index > 0 && panel.line.trim() && panel.line.trim() === panels[index - 1].line.trim());
    if (repeated.length) notes.push("바로 이어지는 컷에서 같은 대사가 반복됩니다. 한쪽을 표정이나 침묵으로 바꿔보세요.");
    if (panels.length && !panels.some((panel) => panel.gapAfter >= 70)) notes.push("감정 전환이나 반전 뒤에 긴 세로 여백을 한 번 두면 호흡이 선명해집니다.");
    if (panels.length && !/\?|까|나|다음|하지만|그때/u.test(`${panels.at(-1).line} ${panels.at(-1).beat}`)) notes.push("마지막 컷에 다음 화를 궁금하게 하는 질문이나 변화가 약합니다.");
    if (!notes.length) notes.push("이미지 선택, 글자 배치, 번역과 모바일 호흡이 게시 기준을 통과했습니다.");
    return [...new Set(notes)].slice(0, 5);
  }

  function panelTranslationLabel(panel, locales) {
    const targets = (locales || ["ko"]).filter((locale) => locale !== "ko");
    if (!targets.length) return "한국어 게시";
    const missing = getPanelTextPublishingIssues(panel, ["ko", ...targets], 0).length;
    return missing ? `번역 ${missing}개 필요` : `${targets.map((locale) => locale.toUpperCase()).join("·")} 준비`;
  }

  function getReferenceReadiness(project) {
    const character = project?.seriesBible?.characters?.[0];
    const location = project?.seriesBible?.locations?.[0];
    const issues = [];
    if (!character || character.referenceStatus !== "approved") issues.push("인물 외형과 의상 기준을 확정해야 합니다.");
    if (!location || location.referenceStatus !== "approved") issues.push("장소 구조와 조명 기준을 확정해야 합니다.");
    return { ready: !issues.length, issues };
  }

  function getPromptReadiness(project) {
    const storyboard = getGenerationReadiness(project);
    const reference = getReferenceReadiness(project);
    const issues = [...storyboard.structuralIssues];
    if (storyboard.approvedCount !== storyboard.total) issues.push(`${storyboard.total - storyboard.approvedCount}개의 콘티를 아직 확인하지 않았습니다.`);
    if (getVisualRenderStage(project) === "final") {
      const missingDrafts = (project.panels || []).filter((panel) => !isPanelStageApproved(panel, "draft"));
      if (missingDrafts.length) issues.push(`${missingDrafts.length}개의 시안 구도를 먼저 골라주세요.`);
      const unsyncedDrafts = (project.panels || []).filter((panel) => {
        const version = getApprovedVersionForStage(panel, "draft");
        return version && !approvedDraftReferenceSource(version);
      });
      if (unsyncedDrafts.length) issues.push(`${unsyncedDrafts.length}개의 선택 시안을 서버 참조 파일로 저장해야 합니다.`);
    }
    issues.push(...reference.issues);
    return { ready: storyboard.ready && reference.ready && !issues.length, issues: [...new Set(issues)] };
  }

  function compilePromptPackages(project) {
    if (!getPromptReadiness(project).ready) {
      return [];
    }
    const renderStage = getVisualRenderStage(project);
    const sourceProjectHash = promptSourceHash(project, renderStage);
    return project.panels.map((panel, index) => buildPromptPackage(project, panel, index, sourceProjectHash));
  }

  function buildPromptPackage(project, panel, index, sourceProjectHash = promptSourceHash(project, getVisualRenderStage(project))) {
    ensurePanelProductionState(panel, index, project);
    ensurePanelEditingState(panel);
    ensurePanelVersionState(panel, project);
    const renderStage = getVisualRenderStage(project);
    const approvedDraft = renderStage === "final" ? getApprovedVersionForStage(panel, "draft") : null;
    const spec = panel.panelSpec;
    const characterRefs = (project.seriesBible?.characters || []).flatMap((character) => (character.references || []).map((reference) => ({
      type: "character",
      ownerId: character.id,
      source: reference
    })));
    const locationRefs = (project.seriesBible?.locations || []).flatMap((location) => (location.references || []).map((reference) => ({
      type: "location",
      ownerId: location.id,
      source: reference
    })));
    const approvedCharacterSpecs = (project.seriesBible?.characters || [])
      .filter((character) => character.referenceStatus === "approved")
      .map((character) => ({
        type: "character-spec",
        ownerId: character.id,
        source: `series-bible://character/${character.id}/${hashObject({ appearance: character.appearance, outfitState: character.outfitState, fixedProps: character.fixedProps || [] })}`
      }));
    const approvedLocationSpecs = (project.seriesBible?.locations || [])
      .filter((location) => location.referenceStatus === "approved")
      .map((location) => ({
        type: "location-spec",
        ownerId: location.id,
        source: `series-bible://location/${location.id}/${hashObject({ structure: location.structure, lighting: location.lighting, landmarks: location.landmarks || [] })}`
      }));
    const previousPanel = index > 0 ? project.panels[index - 1] : null;
    const referenceManifest = [
      ...characterRefs,
      ...locationRefs,
      ...approvedCharacterSpecs,
      ...approvedLocationSpecs,
      ...(approvedDraftReferenceSource(approvedDraft) ? [{ type: "approved-draft", ownerId: panel.id, source: approvedDraftReferenceSource(approvedDraft) }] : []),
      ...(previousPanel?.imageKey ? [{ type: "previous-panel", ownerId: previousPanel.id, source: previousPanel.imageKey }] : [])
    ];
    const expectedResult = {
      panelId: panel.id,
      renderStage,
      requestedQuality: renderStage === "draft" ? "low" : "high",
      preserveApprovedDraftComposition: renderStage === "final",
      approvedDraftVersionId: approvedDraft?.id || "",
      storyFact: spec.storyFact,
      moment: spec.moment,
      characters: spec.subjects.map((subject) => ({ id: subject.characterId, action: subject.action, emotion: subject.emotion, position: subject.screenPosition })),
      requiredProps: spec.setting.activeProps || [],
      mustInclude: spec.mustInclude,
      mustAvoid: spec.mustAvoid,
      camera: spec.camera,
      safeZones: spec.overlaySafeZones,
      lettering: panel.textObjects.map((item) => ({
        id: item.id,
        kind: item.kind,
        speakerId: item.speakerId,
        visible: item.visible,
        position: item.position,
        tailTarget: item.tailTarget,
        textByLocale: item.textByLocale
      }))
    };
    const prompt = compilePanelPrompt(project, panel, index, referenceManifest, expectedResult);
    const promptHash = hashText(prompt);
    return {
      id: `prompt-${renderStage}-${panel.id}-${promptHash.slice(-8)}`,
      schemaVersion: "webtoon-prompt-package/v2",
      compilerVersion: promptCompilerVersion,
      projectId: project.remoteId || project.id,
      panelId: panel.id,
      panelIndex: index,
      sourceProjectHash,
      sourceSpecHash: hashObject(spec),
      promptHash,
      renderStage,
      requestedQuality: renderStage === "draft" ? "low" : "high",
      sourceDraftVersionId: approvedDraft?.id || "",
      referenceManifest,
      expectedResult,
      prompt,
      status: "ready",
      createdAt: new Date().toISOString()
    };
  }

  function compilePanelPrompt(project, panel, index, references, expectedResult) {
    const spec = panel.panelSpec;
    const character = project.seriesBible?.characters?.[0] || {};
    const location = project.seriesBible?.locations?.[0] || {};
    const previous = index > 0 ? project.panels[index - 1]?.panelSpec : null;
    const renderStage = expectedResult.renderStage === "final" ? "final" : "draft";
    const stageInstructions = renderStage === "draft"
      ? [
          "[이번 출력: 구도 시안]",
          "- 빠른 검토용 저비용 시안입니다. 완성 일러스트처럼 세밀하게 렌더링하지 마세요.",
          "- 단순한 선화와 제한된 명암 또는 제한된 색으로 인물 위치, 행동, 시선, 카메라, 전후 공간만 명확히 보여주세요.",
          "- 손가락·머리카락·재질의 세부 묘사보다 이야기 전달과 실루엣 가독성을 우선합니다.",
          "- 이후 완성화가 같은 구도를 재사용할 수 있도록 피사체 경계와 빈 말풍선 영역을 분명히 남기세요."
        ]
      : [
          "[이번 출력: 선택한 시안 완성화]",
          "- 참조 목록의 선택 시안 이미지를 가장 우선하는 구도 기준으로 사용하세요.",
          "- 선택 시안의 카메라 거리, 인물 위치, 시선 방향, 행동, 소품 위치, 빈 말풍선 영역을 바꾸지 마세요.",
          "- 선택한 구도를 게시 가능한 한국 세로 웹툰 완성 작화로 정교하게 렌더링하세요.",
          "- 인물 외형, 손과 얼굴의 형태, 배경 원근, 재질, 조명과 색을 자연스럽게 마감하되 새 사건이나 소품을 추가하지 마세요."
        ];
    const bullets = (items) => (items?.length ? items.map((item) => `- ${typeof item === "string" ? item : JSON.stringify(item)}`) : ["- 없음"]);
    return [
      `# ${String(index + 1).padStart(2, "0")}컷 이미지 생성 요구사항`,
      "",
      "오리지널 한국 세로 웹툰의 단일 컷 이미지를 제작하세요. 한 이미지에는 한 순간과 한 카메라 구도만 표현합니다.",
      "기존 웹툰·애니·게임·유명 인물·로고·작가의 고유 화풍을 복제하지 마세요.",
      "대사, 나레이션, 효과음과 상태창 문자는 이미지에 그리지 말고 지정된 빈 공간만 남기세요.",
      "",
      ...stageInstructions,
      "",
      "[사용자 의도]",
      `- 작품: ${project.title}`,
      `- 원고 핵심: ${project.storyIntent?.logline || project.idea}`,
      `- 주제: ${project.storyIntent?.theme || "주인공의 선택"}`,
      `- 분위기: ${project.storyIntent?.tone || project.tone}`,
      ...bullets((project.storyIntent?.mustKeep || []).map((item) => `변경 금지: ${item}`)),
      ...bullets((project.storyIntent?.mustAvoid || []).map((item) => `금지: ${item}`)),
      "",
      "[고정 인물 기준]",
      `- ${character.name || "주인공"}: ${character.appearance || "확정된 외형"}`,
      `- 의상과 상태: ${character.outfitState || "확정된 기본 의상"}`,
      `- 고정 소품: ${(character.fixedProps || []).join(", ") || "없음"}`,
      "",
      "[고정 장소 기준]",
      `- ${location.name || "주요 장소"}: ${location.structure || "확정된 공간 구조"}`,
      `- 조명: ${location.lighting || "앞뒤 컷과 같은 방향"}`,
      "",
      "[앞 컷에서 이어지는 상태]",
      previous
        ? `- 이전 컷 행동과 방향: ${previous.subjects?.[0]?.action || "이전 행동"}, ${previous.continuity?.entranceDirection || "이동 방향 유지"}`
        : "- 첫 컷이므로 인물의 기본 화면 방향을 명확히 설정합니다.",
      `- 현재 연속성: ${spec.continuity.characterState}; ${spec.continuity.locationState}`,
      `- 소지품: ${(spec.continuity.carriedProps || []).join(", ") || "없음"}`,
      "",
      "[이 컷에서 반드시 보일 사건]",
      `- 이야기 사실: ${spec.storyFact}`,
      `- 단 하나의 순간: ${spec.moment}`,
      `- 장면 목적: ${spec.purpose}`,
      `- 감정 변화: ${spec.emotionBeforeAfter}`,
      "",
      "[인물 연기와 위치]",
      ...spec.subjects.map((subject) => `- ${subject.name || subject.characterId}: ${subject.action}; 표정 ${subject.emotion}; 시선 ${subject.gaze}; 화면 방향 ${characterFacingLabel(subject.facing)}(${subject.facing || "three-quarter-left"}); 위치 ${subject.screenPosition}; 자세 ${subject.pose}`),
      "",
      "[카메라와 화면 구성]",
      `- 세로 2:3 단일 패널, ${cameraLabel(spec.camera.shotSize)}(${spec.camera.shotSize}), ${cameraAngleLabel(spec.camera.angle)}(${spec.camera.angle}), 카메라 높이 ${spec.camera.height}`,
      `- 연출 의도: ${spec.camera.directorIntent || directorIntentForShot(panel.phase, spec.camera.angle, spec.camera.shotSize)}`,
      `- 화각과 심도: ${spec.camera.lensFeel || lensFeelForShot(spec.camera.shotSize, spec.camera.angle)}`,
      `- 시선·행동 축: ${spec.camera.movementAxis || movementAxisForFacing(spec.subjects?.[0]?.facing)}`,
      ...(spec.camera.framingDevice ? [`- 프레이밍 장치: ${spec.camera.framingDevice}`] : []),
      ...(spec.camera.sequenceRule ? [`- 컷 연속 규칙: ${spec.camera.sequenceRule}`] : []),
      ...(spec.camera.mustAvoidComposition ? [`- 피할 상투 구도: ${spec.camera.mustAvoidComposition}`] : []),
      "- 앞뒤 컷과 같은 거리·각도·인물 방향을 기계적으로 반복하지 말고, 사건의 정보와 감정에 맞는 영화적 시점 변화를 사용하세요.",
      `- 초점: ${spec.camera.focalTarget}`,
      `- 전경: ${spec.composition.foreground}`,
      `- 중경: ${spec.composition.midground}`,
      `- 배경: ${spec.composition.background}`,
      `- 깊이: ${spec.composition.depth}`,
      `- 비워둘 영역: ${spec.composition.negativeSpace}`,
      "",
      "[반드시 포함]",
      ...bullets(expectedResult.mustInclude),
      "",
      "[절대 포함하지 않기]",
      ...bullets(expectedResult.mustAvoid),
      "",
      "[말풍선 안전 영역]",
      ...spec.overlaySafeZones.map((zone) => `- ${zone.type}: ${zone.area}`),
      "",
      `[참조 파일] ${references.length ? references.map((item) => `${item.type}:${item.source}`).join(", ") : "첨부 이미지가 없으므로 위에서 확정한 텍스트 기준을 엄격히 유지"}`,
      "",
      `출력 파일 식별자: ${project.id}_${String(index + 1).padStart(2, "0")}_${panel.id}`
    ].join("\n");
  }

  function promptSourceHash(project, renderStage = getVisualRenderStage(project)) {
    return hashObject({
      renderStage,
      storyIntent: project.storyIntent,
      seriesBible: project.seriesBible,
      panels: project.panels.map((panel) => ({
        panelSpec: panel.panelSpec,
        approvedDraftVersionId: renderStage === "final" ? panel.draftApprovedVersionId || "" : ""
      }))
    });
  }

  function hashObject(value) {
    return hashText(stableStringify(value));
  }

  function stableStringify(value) {
    if (Array.isArray(value)) {
      return `[${value.map(stableStringify).join(",")}]`;
    }
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }

  function invalidateDownstreamProduction(project, from) {
    if (!project) {
      return;
    }
    if (from === "story") {
      project.productionStage = "story-review";
      project.storyboardApproval = {};
      project.promptPackages = [];
      project.generationReadiness = null;
      (project.panels || []).forEach((panel) => {
        panel.draftApprovedVersionId = "";
        panel.finalApprovedVersionId = "";
        panel.approvedVersionId = "";
        panel.qcStatus = panel.imageVersions?.length ? "needs-fix" : "missing";
        (panel.imageVersions || []).forEach((version) => {
          if (version.status === "approved") version.status = "needs-fix";
          if (version.qc?.overall === "approved") version.qc.overall = "pending";
        });
      });
      project.visualWorkflow = {
        schemaVersion: "webtoon-visual-workflow/v1",
        stage: "storyboard-review",
        generationPass: "draft",
        queuedPass: "",
        queuedJobId: "",
        draftApprovedAt: "",
        finalApprovedAt: ""
      };
    }
  }

  function extractStoryFacts(story) {
    const sentences = splitStorySentences(story);
    const facts = (sentences.length ? sentences : [story])
      .map((sentence) => clipText(sentence.replace(/\s+/g, " ").trim(), 240))
      .filter(Boolean)
      .slice(0, 8);
    return facts.length ? facts : ["사용자가 입력한 원문을 유지합니다."];
  }

  function buildStorySuggestions(story, analysis, heroRole) {
    const suggestions = [];
    if (!analysis.signals.goal) {
      suggestions.push({ id: "goal", type: "goal", text: `${heroRole}은 이번 화 안에 이상 현상의 정체를 확인하고 안전하게 돌아가려 한다.`, reason: "주인공이 무엇을 위해 움직이는지 그림의 방향을 고정합니다." });
    }
    if (!analysis.signals.conflict) {
      suggestions.push({ id: "conflict", type: "conflict", text: "이 현상을 무시하거나 해결하지 못하면 평범한 일상으로 돌아갈 수 없다는 위험이 드러난다.", reason: "실패 위험이 있어야 행동과 표정의 긴장도가 정해집니다." });
    }
    if (!analysis.signals.turn) {
      suggestions.push({ id: "turn", type: "turn", text: "처음에는 단순한 기회처럼 보였던 현상이 주인공을 시험하는 규칙이었다는 사실이 드러난다.", reason: "중간 장면의 구도와 감정이 반복되지 않게 전환점을 만듭니다." });
    }
    if (!analysis.signals.choice) {
      suggestions.push({ id: "choice", type: "choice", text: "주인공은 도망칠 수 있는 순간에도 눈앞의 문제를 직접 확인하기로 선택한다.", reason: "클라이맥스에서 주인공다운 행동을 보여주기 위한 제안입니다." });
    }
    if (!analysis.signals.cliffhanger) {
      suggestions.push({ id: "cliffhanger", type: "cliffhanger", text: "문제가 끝난 듯한 순간, 같은 현상이 다른 장소에서도 시작됐다는 단서가 나타난다.", reason: "첫 화의 해결 뒤에 다음 화의 질문을 남깁니다." });
    }
    suggestions.push({
      id: "visual-detail",
      type: "visual-detail",
      text: `${inferPrimaryLocation(story)}의 고정 랜드마크와 ${heroRole}의 손에 든 소품을 앞뒤 컷에서 계속 유지한다.`,
      reason: "장소와 소품이 컷마다 바뀌는 문제를 줄이기 위한 시각적 기준입니다."
    });
    return suggestions.slice(0, 6);
  }

  function inferPrimaryLocation(story) {
    const candidates = ["폐역 플랫폼", "지하철역", "던전", "옥상", "학교", "회사", "골목", "병원", "집"];
    return candidates.find((item) => story.includes(item.replace(" 플랫폼", ""))) || "이야기의 첫 장소";
  }

  function inferHeroOutfit(story) {
    if (/청소|알바/u.test(story)) return "작업복과 현장 소품";
    if (/학생|학교/u.test(story)) return "학생복 또는 일상복";
    if (/헌터|던전/u.test(story)) return "현대적인 헌터 장비와 일상복의 혼합";
    return "사용자 선택 전 의상 미정";
  }

  function inferHeroAppearance(story) {
    if (/학생/u.test(story)) return "한국인 청소년 주인공, 얼굴과 머리 모양은 기준 확정 후 모든 컷에서 동일하게 유지";
    if (/헌터/u.test(story)) return "한국인 성인 헌터 주인공, 과장되지 않은 체형과 반복해서 알아볼 수 있는 얼굴 특징";
    return "한국인 성인 주인공, 현실적인 체형과 컷마다 유지되는 얼굴·머리 특징";
  }

  function inferLocationStructure(story, locationName) {
    if (/폐역|지하철/u.test(story)) return `${locationName}, 긴 승강장과 선로, 기둥·전광판·출구 위치가 컷마다 동일한 구조`;
    if (/옥상/u.test(story)) return `${locationName}, 난간과 출입문, 주변 건물의 방향이 반복 컷에서 동일한 구조`;
    return `${locationName}, 주요 출입구와 고정 랜드마크의 좌우 위치를 모든 컷에서 유지`;
  }

  function inferStoryProps(story) {
    return ["대걸레", "청소 카트", "상태창", "검", "휴대폰", "가방"].filter((item) => story.includes(item));
  }

  function inferLocationLighting(story) {
    if (/밤|야간|어둠|폐역/u.test(story)) return "낮은 주변광과 사건 요소의 제한된 강조광";
    if (/새벽/u.test(story)) return "차가운 새벽빛과 긴 그림자";
    return "시간대는 유연하되 컷 사이 조명 방향을 유지";
  }

  function inferStoryTheme(story) {
    if (/구하|지키|구조/u.test(story)) return "위험 속에서도 타인을 포기하지 않는 선택";
    if (/회귀|돌아/u.test(story)) return "실패를 다시 선택할 기회";
    return "평범한 사람이 낯선 규칙 앞에서 내리는 선택";
  }

  function inferStoryTone(story) {
    if (/공포|어둠|실종|죽/u.test(story)) return "tense-dark";
    if (/웃|귀엽|코미디/u.test(story)) return "light-comedy";
    return "tense-hopeful";
  }

  function splitConstraintLines(text) {
    return String(text || "").split(/\n|,|;/u).map((item) => item.trim()).filter(Boolean).slice(0, 12);
  }

  function hashText(text) {
    let hash = 2166136261;
    for (const character of String(text || "")) {
      hash ^= character.codePointAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }

  function structuredCloneSafe(value) {
    if (typeof structuredClone === "function") {
      return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value));
  }

  function renderStudioAssetShelf(project, selectedPanelId = "") {
    const root = byId("studioAssetShelf");
    if (!root) return;
    const entries = (project?.panels || []).flatMap((panel, panelIndex) => {
      ensurePanelVersionState(panel, project);
      return (panel.imageVersions || []).map((version, versionIndex) => ({ panel, panelIndex, version, versionIndex }));
    });
    if (!entries.length) {
      root.innerHTML = '<p class="studio-asset-empty">그림을 만들거나 가져오면 장면별 버전이 이곳에 자동으로 모입니다.</p>';
      return;
    }
    root.innerHTML = entries.map(({ panel, panelIndex, version, versionIndex }) => {
      const category = ["character", "specific-character", "face", "outfit"].includes(version.editTarget) ? "인물" : "장면";
      return `
        <article class="studio-asset-card ${panel.id === selectedPanelId ? "is-current-panel" : ""}">
          <span class="studio-asset-thumb" data-asset-thumbnail="${escapeHtml(panel.id)}:${escapeHtml(version.id)}">${String(panelIndex + 1).padStart(2, "0")}</span>
          <div>
            <small>${escapeHtml(category)} · ${escapeHtml(visualStageLabel(version.renderStage))}</small>
            <strong>${panelIndex + 1}컷 · v${versionIndex + 1}</strong>
            <span>${escapeHtml(shorten(panel.panelSpec?.moment || panel.beat, 50))}</span>
          </div>
          <button class="tool-button mini" type="button" data-reuse-scene data-source-panel-id="${escapeHtml(panel.id)}" data-version-id="${escapeHtml(version.id)}">선택 컷에 넣기</button>
        </article>
      `;
    }).join("");
    entries.forEach(async ({ panel, version }) => {
      const key = `${panel.id}:${version.id}`;
      const node = Array.from(root.querySelectorAll("[data-asset-thumbnail]")).find((item) => item.dataset.assetThumbnail === key);
      if (!node) return;
      const source = version.sourceUrl
        || (version.id === panel.currentVersionId ? panel.imageData : "")
        || (await getPanelImage(version.imageKey).catch(() => null))?.dataUrl
        || "";
      if (!source || !node.isConnected) return;
      const image = document.createElement("img");
      image.src = source;
      image.alt = "";
      image.loading = "lazy";
      node.replaceChildren(image);
    });
  }

  async function reuseStoredScene(project, sourcePanel, sourceVersion, targetPanel) {
    ensurePanelVersionState(sourcePanel, project);
    ensurePanelVersionState(targetPanel, project);
    const stored = await getPanelImage(sourceVersion.imageKey).catch(() => null);
    const source = sourceVersion.sourceUrl
      || (sourceVersion.id === sourcePanel.currentVersionId ? sourcePanel.imageData : "")
      || stored?.dataUrl
      || "";
    if (!source) throw new Error("보관한 그림 파일을 찾지 못했습니다.");
    const createdAt = new Date().toISOString();
    const versionId = `version-reuse-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const imageKey = panelImageKey(project, targetPanel, versionId);
    if (/^data:/i.test(source)) {
      await putPanelImage(imageKey, {
        key: imageKey,
        dataUrl: source,
        name: `reused-panel-${sourcePanel.id}.webp`,
        updatedAt: createdAt
      });
    }
    const current = getCurrentImageVersion(targetPanel);
    const version = {
      ...sourceVersion,
      id: versionId,
      parentVersionId: current?.id || "",
      sourceAssetId: `reuse:${sourcePanel.id}:${sourceVersion.id}`,
      imageKey,
      name: `재사용 · ${sourcePanel.id}`,
      sourceUrl: /^data:/i.test(source) ? "" : source,
      createdAt,
      status: "candidate",
      qc: createPanelQc(),
      editTarget: "reuse",
      reusedFrom: { panelId: sourcePanel.id, versionId: sourceVersion.id }
    };
    targetPanel.imageVersions.push(version);
    targetPanel.currentVersionId = version.id;
    targetPanel.imageKey = imageKey;
    targetPanel.imageData = source;
    targetPanel.imageName = version.name;
    targetPanel.imageUpdatedAt = createdAt;
    targetPanel.qcStatus = "pending";
    targetPanel.lastReuseSource = version.reusedFrom;
    project.hasUnpublishedChanges = true;
    project.updatedAt = createdAt;
    syncVisualWorkflow(project);
  }

  function renderPanelList(container, project) {
    container.innerHTML = project.panels.map((panel, index) => {
      ensurePanelEditingState(panel);
      ensurePanelVersionState(panel, project);
      const hasImage = Boolean(panel.imageData);
      const hasStoredImage = hasImage || Boolean(panel.imageKey);
      const currentVersion = getCurrentImageVersion(panel);
      const activeRenderStage = getVisualRenderStage(project);
      const currentRenderStage = currentVersion?.renderStage || activeRenderStage;
      const currentStageApproved = Boolean(currentVersion && getApprovedVersionForStage(panel, currentRenderStage)?.id === currentVersion.id);
      const versionStateLabel = currentVersion?.status === "approved"
        ? `${visualStageLabel(currentRenderStage)} 선택`
        : currentVersion?.status === "needs-fix"
          ? "수정 필요"
          : currentVersion ? "검수 전" : "이미지 없음";
      const dialogueObject = panel.textObjects.find((item) => item.kind === "line");
      const narrationObject = panel.textObjects.find((item) => item.kind === "narration");
      const sfxObject = panel.textObjects.find((item) => item.kind === "sfx");
      const extraTextObjects = panel.textObjects.filter((item) => ["dialogue", "thought"].includes(item.kind));
      const storyQc = qcBadgeState(currentVersion, ["requiredCharacters", "visibleAction", "emotionAndGaze", "requiredProps", "forbiddenElements"]);
      const continuityQc = qcBadgeState(currentVersion, ["blocking", "characterContinuity", "locationContinuity", "cameraCompliance"]);
      const qualityQc = qcBadgeState(currentVersion, ["anatomyAndArtifacts", "textSafety"]);
      const qcIssue = currentVersion?.qc?.issues?.[0]?.observed || "";
      const qcChecks = currentRenderStage === "draft"
        ? [
            ["requiredCharacters", "필요한 인물"], ["visibleAction", "핵심 행동"], ["emotionAndGaze", "표정·시선"],
            ["blocking", "인물 위치"], ["requiredProps", "필수 소품"], ["cameraCompliance", "카메라·여백"],
            ["textSafety", "글자 안전 영역"]
          ]
        : [
            ["requiredCharacters", "필요한 인물"], ["visibleAction", "핵심 행동"], ["emotionAndGaze", "표정·시선"],
            ["blocking", "인물 위치"], ["requiredProps", "필수 소품"], ["forbiddenElements", "금지 요소 없음"],
            ["characterContinuity", "인물 연속성"], ["locationContinuity", "장소 연속성"], ["cameraCompliance", "카메라·여백"],
            ["anatomyAndArtifacts", "손·깨진 형태"], ["textSafety", "가짜 문자·여백"]
          ];
      const phase = phaseLabel(panel.phase);
      const emptyImageLabel = panel.imageKey ? "저장된 이미지 불러오는 중" : `${index + 1}장면 이미지 슬롯`;
      const imageNote = hasImage
        ? panel.imageName || "가져온 이미지"
        : panel.imageKey
          ? "저장된 이미지를 불러오는 중입니다."
          : `${visualStageLabel(activeRenderStage)} 이미지를 만든 뒤 이 컷에 가져오세요.`;

      return `
      <details class="panel-card" data-panel-id="${panel.id}" ${index === 0 ? "open" : ""}>
        <summary class="panel-card-summary">
          <span class="panel-number">${index + 1}</span>
          <span class="panel-summary-copy">
            <strong>${escapeHtml(phase)}</strong>
            <span>${escapeHtml(shorten(panel.beat, 76))}</span>
          </span>
          <span class="panel-summary-toggle" aria-hidden="true"></span>
        </summary>
        <div class="panel-card-body">
        <div class="panel-card-head">
          <span class="panel-edit-label">장면 세부 편집</span>
          <div class="panel-actions">
            <button class="tool-button mini" type="button" data-action="split-panel" title="이 장면을 서로 다른 순간의 두 컷으로 나눕니다">나누기</button>
            <button class="tool-button mini" type="button" data-action="merge-next" title="다음 컷의 결과 순간을 남기고 하나로 합칩니다" ${index >= project.panels.length - 1 ? "disabled" : ""}>다음과 합치기</button>
            <button class="icon-button" type="button" data-action="up" aria-label="${index + 1}장면 위로">↑</button>
            <button class="icon-button" type="button" data-action="down" aria-label="${index + 1}장면 아래로">↓</button>
            <button class="icon-button" type="button" data-action="delete" aria-label="${index + 1}장면 삭제" ${project.panels.length <= contentLimits.manualSceneMin ? "disabled" : ""}>×</button>
          </div>
        </div>
        <div class="panel-fields">
          <label class="field wide">
            <span class="field-label-row"><span>장면 설명</span><small class="input-counter">${textLength(panel.beat)} / ${contentLimits.panelFields.beat}</small></span>
            <textarea data-field="beat" rows="2" maxlength="${contentLimits.panelFields.beat}" aria-label="${index + 1}장면 제작 설명">${escapeHtml(panel.beat)}</textarea>
          </label>
          <div class="field wide overlay-field-control">
            <span class="field-label-row"><span>나레이션</span><span><small class="input-counter">${textLength(panel.reaction)} / ${contentLimits.panelFields.reaction}</small><label class="compact-toggle"><input type="checkbox" data-visibility="narration" ${overlayIsVisible(panel, "narration") ? "checked" : ""}><i></i><b>표시</b></label></span></span>
            <textarea data-field="reaction" rows="2" maxlength="${contentLimits.panelFields.reaction}" aria-label="${index + 1}장면 나레이션">${escapeHtml(panel.reaction)}</textarea>
          </div>
          <div class="field overlay-field-control">
            <span class="field-label-row"><span>말풍선 대사</span><span><small class="input-counter ${textLength(panel.line) > contentLimits.dialogueRecommendedMax ? "is-recommended-over" : ""}">${textLength(panel.line)} / ${contentLimits.panelFields.line}</small><label class="compact-toggle"><input type="checkbox" data-visibility="line" ${overlayIsVisible(panel, "line") ? "checked" : ""}><i></i><b>표시</b></label></span></span>
            <input data-field="line" maxlength="${contentLimits.panelFields.line}" value="${escapeHtml(panel.line)}" aria-label="${index + 1}장면 말풍선 대사">
          </div>
          <div class="field overlay-field-control">
            <span class="field-label-row"><span>의성어·효과음</span><span><small class="input-counter">${textLength(panel.sfx)} / ${contentLimits.panelFields.sfx}</small><label class="compact-toggle"><input type="checkbox" data-visibility="sfx" ${overlayIsVisible(panel, "sfx") ? "checked" : ""}><i></i><b>표시</b></label></span></span>
            <input data-field="sfx" maxlength="${contentLimits.panelFields.sfx}" value="${escapeHtml(panel.sfx)}" aria-label="${index + 1}장면 의성어">
          </div>
          <label class="field wide">
            <span class="field-label-row"><span>연출 메모</span><small class="input-counter">${textLength(panel.note)} / ${contentLimits.panelFields.note}</small></span>
            <input data-field="note" maxlength="${contentLimits.panelFields.note}" value="${escapeHtml(panel.note)}">
          </label>
          <button class="tool-button mini overlay-reset-button" type="button" data-action="reset-overlays">텍스트 위치 초기화</button>
          <label class="scroll-gap-control wide"><span>이 컷 뒤 세로 여백 <output>${Math.round(panel.gapAfter)}</output>px</span><input type="range" min="16" max="180" step="2" value="${panel.gapAfter}" data-gap-after></label>
          <details class="extra-text-editor wide" ${extraTextObjects.length ? "open" : ""}>
            <summary><strong>추가 말풍선</strong><span>${extraTextObjects.length} / 5</span></summary>
            <div class="extra-text-actions"><button class="tool-button mini" type="button" data-action="add-dialogue">대사 추가</button><button class="tool-button mini" type="button" data-action="add-thought">생각 추가</button></div>
            <div class="extra-text-list">
              ${extraTextObjects.length ? extraTextObjects.map((item, extraIndex) => `
                <article class="extra-text-item" data-text-kind="${item.kind}">
                  <div class="extra-text-head"><strong>${item.kind === "thought" ? "생각" : "대사"} ${extraIndex + 2}</strong><span class="extra-text-order"><button class="icon-button" type="button" data-action="text-object-up" data-text-object-id="${escapeHtml(item.id)}" aria-label="읽기 순서 앞으로" ${extraIndex === 0 ? "disabled" : ""}>↑</button><button class="icon-button" type="button" data-action="text-object-down" data-text-object-id="${escapeHtml(item.id)}" aria-label="읽기 순서 뒤로" ${extraIndex === extraTextObjects.length - 1 ? "disabled" : ""}>↓</button></span><label class="compact-toggle"><input type="checkbox" data-text-object-visible="${escapeHtml(item.id)}" ${item.visible ? "checked" : ""}><i></i><b>표시</b></label><button class="icon-button" type="button" data-action="delete-text-object" data-text-object-id="${escapeHtml(item.id)}" aria-label="추가 말풍선 삭제">×</button></div>
                  <label><span>화자</span><input data-text-object-id="${escapeHtml(item.id)}" data-text-object-field="speakerId" maxlength="80" value="${escapeHtml(item.speakerId)}"></label>
                  <label><span>KO</span><input data-text-object-id="${escapeHtml(item.id)}" data-text-object-locale="ko" maxlength="${contentLimits.panelFields.line}" value="${escapeHtml(item.textByLocale.ko)}"></label>
                  <label><span>EN</span><input data-text-object-id="${escapeHtml(item.id)}" data-text-object-locale="en" maxlength="${contentLimits.panelFields.line}" value="${escapeHtml(item.textByLocale.en)}"></label>
                  <label><span>JA</span><input data-text-object-id="${escapeHtml(item.id)}" data-text-object-locale="ja" maxlength="${contentLimits.panelFields.line}" value="${escapeHtml(item.textByLocale.ja)}"></label>
                  <div class="extra-text-tail-grid">
                    <label><span>꼬리 가로 ${Math.round(item.tailTarget.x)}</span><input type="range" min="0" max="100" value="${item.tailTarget.x}" data-text-object-id="${escapeHtml(item.id)}" data-text-object-field="tailX"></label>
                    <label><span>꼬리 세로 ${Math.round(item.tailTarget.y)}</span><input type="range" min="0" max="100" value="${item.tailTarget.y}" data-text-object-id="${escapeHtml(item.id)}" data-text-object-field="tailY"></label>
                    <label><span>글자 크기 ${Number(item.size).toFixed(1)}</span><input type="range" min="0.8" max="1.4" step="0.1" value="${item.size}" data-text-object-id="${escapeHtml(item.id)}" data-text-object-field="size"></label>
                  </div>
                </article>
              `).join("") : '<p class="extra-text-empty">대화가 이어지는 컷에서만 필요한 만큼 추가하세요.</p>'}
            </div>
          </details>
          <details class="panel-spec-editor wide">
            <summary><strong>구도와 필수 요소</strong><span>상세 연출</span></summary>
            <div class="panel-spec-grid">
              <label><span>카메라 거리</span><select data-spec-field="camera.shotSize"><option value="wide" ${panel.panelSpec?.camera?.shotSize === "wide" ? "selected" : ""}>원경</option><option value="medium-wide" ${panel.panelSpec?.camera?.shotSize === "medium-wide" ? "selected" : ""}>중원경</option><option value="medium" ${panel.panelSpec?.camera?.shotSize === "medium" ? "selected" : ""}>중경</option><option value="medium-close" ${panel.panelSpec?.camera?.shotSize === "medium-close" ? "selected" : ""}>중근경</option><option value="close" ${panel.panelSpec?.camera?.shotSize === "close" ? "selected" : ""}>근경</option><option value="detail" ${panel.panelSpec?.camera?.shotSize === "detail" ? "selected" : ""}>세부</option></select></label>
              <label><span>카메라 각도</span><select data-spec-field="camera.angle"><option value="eye-level" ${panel.panelSpec?.camera?.angle === "eye-level" ? "selected" : ""}>눈높이</option><option value="profile-side" ${panel.panelSpec?.camera?.angle === "profile-side" ? "selected" : ""}>인물 옆에서</option><option value="bird-eye" ${panel.panelSpec?.camera?.angle === "bird-eye" ? "selected" : ""}>천장에서 아래로</option><option value="high-angle" ${panel.panelSpec?.camera?.angle === "high-angle" ? "selected" : ""}>위에서 내려다보기</option><option value="low-angle" ${panel.panelSpec?.camera?.angle === "low-angle" ? "selected" : ""}>아래에서 올려다보기</option><option value="ground-low-diagonal" ${panel.panelSpec?.camera?.angle === "ground-low-diagonal" ? "selected" : ""}>바닥에서 대각선 위로</option><option value="over-shoulder" ${panel.panelSpec?.camera?.angle === "over-shoulder" ? "selected" : ""}>어깨 너머로</option><option value="dutch-subtle" ${panel.panelSpec?.camera?.angle === "dutch-subtle" ? "selected" : ""}>살짝 기울인 화면</option></select></label>
              <label><span>주인공 위치</span><select data-spec-field="subject.screenPosition"><option value="left midground" ${/left/u.test(panel.panelSpec?.subjects?.[0]?.screenPosition || "") ? "selected" : ""}>왼쪽</option><option value="center midground" ${/center/u.test(panel.panelSpec?.subjects?.[0]?.screenPosition || "") ? "selected" : ""}>가운데</option><option value="right midground" ${/right/u.test(panel.panelSpec?.subjects?.[0]?.screenPosition || "") ? "selected" : ""}>오른쪽</option></select></label>
              <label><span>주인공 방향</span><select data-spec-field="subject.facing"><option value="three-quarter-left" ${panel.panelSpec?.subjects?.[0]?.facing === "three-quarter-left" ? "selected" : ""}>왼쪽 반측면</option><option value="three-quarter-right" ${panel.panelSpec?.subjects?.[0]?.facing === "three-quarter-right" ? "selected" : ""}>오른쪽 반측면</option><option value="front" ${panel.panelSpec?.subjects?.[0]?.facing === "front" ? "selected" : ""}>앞모습</option><option value="back" ${panel.panelSpec?.subjects?.[0]?.facing === "back" ? "selected" : ""}>뒷모습</option><option value="left-profile" ${panel.panelSpec?.subjects?.[0]?.facing === "left-profile" ? "selected" : ""}>왼쪽 옆모습</option><option value="right-profile" ${panel.panelSpec?.subjects?.[0]?.facing === "right-profile" ? "selected" : ""}>오른쪽 옆모습</option></select></label>
              <label><span>반드시 보일 것</span><textarea rows="2" maxlength="500" data-spec-field="mustInclude">${escapeHtml((panel.panelSpec?.mustInclude || []).join("\n"))}</textarea></label>
              <label><span>보이면 안 될 것</span><textarea rows="2" maxlength="500" data-spec-field="mustAvoid">${escapeHtml((panel.panelSpec?.mustAvoid || []).join("\n"))}</textarea></label>
            </div>
          </details>
          <details class="panel-translation-editor wide">
            <summary><strong>영어·일본어 글자</strong><span>게시 언어를 선택할 때 입력</span></summary>
            <div class="panel-translation-grid">
              <label><span>EN · 말풍선</span><input data-translation-kind="line" data-translation-locale="en" maxlength="${contentLimits.panelFields.line}" value="${escapeHtml(dialogueObject?.textByLocale.en || "")}"></label>
              <label><span>JA · 말풍선</span><input data-translation-kind="line" data-translation-locale="ja" maxlength="${contentLimits.panelFields.line}" value="${escapeHtml(dialogueObject?.textByLocale.ja || "")}"></label>
              <label><span>EN · 나레이션</span><textarea rows="2" data-translation-kind="narration" data-translation-locale="en" maxlength="${contentLimits.panelFields.reaction}">${escapeHtml(narrationObject?.textByLocale.en || "")}</textarea></label>
              <label><span>JA · 나레이션</span><textarea rows="2" data-translation-kind="narration" data-translation-locale="ja" maxlength="${contentLimits.panelFields.reaction}">${escapeHtml(narrationObject?.textByLocale.ja || "")}</textarea></label>
              <label><span>EN · 효과음</span><input data-translation-kind="sfx" data-translation-locale="en" maxlength="${contentLimits.panelFields.sfx}" value="${escapeHtml(sfxObject?.textByLocale.en || "")}"></label>
              <label><span>JA · 효과음</span><input data-translation-kind="sfx" data-translation-locale="ja" maxlength="${contentLimits.panelFields.sfx}" value="${escapeHtml(sfxObject?.textByLocale.ja || "")}"></label>
            </div>
          </details>
        </div>
        <div class="panel-image-tools">
          <div class="image-slot ${hasImage ? "has-image" : ""}">
            ${hasImage ? `<img src="${escapeHtml(panel.imageData)}" alt="${index + 1}장면 가져온 이미지">` : `<span>${escapeHtml(emptyImageLabel)}</span>`}
          </div>
          <div class="image-tool-actions">
            <button class="tool-button mini pro" type="button" data-action="copy-prompt">${index + 1}장면 프롬프트</button>
            <label class="tool-button mini image-import">
              ${visualStageLabel(activeRenderStage)} 가져오기
              <input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" data-image-input>
            </label>
            <button class="tool-button mini" type="button" data-action="clear-image" ${hasStoredImage ? "" : "disabled"}>제거</button>
          </div>
          <p class="image-slot-note">${escapeHtml(imageNote)} · JPG·PNG·WebP, 12MB 이하</p>
          ${panel.imageVersions.length ? `
            <div class="image-version-review" data-state="${escapeHtml(currentVersion?.status || "candidate")}" data-render-stage="${escapeHtml(currentRenderStage)}">
              <span class="image-render-stage" data-stage="${escapeHtml(currentRenderStage)}">${escapeHtml(visualStageLabel(currentRenderStage))} · ${currentVersion?.requestedQuality === "low" ? "빠른 품질" : "최종 품질"}</span>
              <div class="image-version-head">
                <label><span>그림 버전</span>
                  <select data-image-version aria-label="${index + 1}컷 그림 버전">
                    ${panel.imageVersions.map((version, versionIndex) => `<option value="${escapeHtml(version.id)}" ${version.id === panel.currentVersionId ? "selected" : ""}>v${versionIndex + 1} · ${visualStageLabel(version.renderStage)} · ${version.status === "approved" ? "선택" : version.status === "needs-fix" ? "수정 필요" : "후보"}</option>`).join("")}
                  </select>
                </label>
                <strong>${escapeHtml(versionStateLabel)}</strong>
              </div>
              <p>${currentVersion?.sourcePromptHash ? `프롬프트 ${escapeHtml(shorten(currentVersion.sourcePromptHash, 22))}` : "이전 제작 이미지"}</p>
              ${panel.imageVersions.length > 1 ? `<div class="image-version-strip" aria-label="${index + 1}컷 버전 비교">${panel.imageVersions.map((version, versionIndex) => `<button type="button" data-action="select-image-version" data-version-id="${escapeHtml(version.id)}" class="${version.id === panel.currentVersionId ? "is-current" : ""}" aria-label="버전 ${versionIndex + 1} 보기"><span data-version-thumbnail="${escapeHtml(version.id)}">v${versionIndex + 1}</span><i>${version.status === "approved" ? "선택" : version.status === "needs-fix" ? "수정" : "후보"}</i></button>`).join("")}</div>` : ""}
              <div class="image-qc-badges" aria-label="그림 검수 요약">
                <span data-state="${storyQc.state}">이야기 ${storyQc.label}</span>
                <span data-state="${continuityQc.state}">연속성 ${continuityQc.label}</span>
                <span data-state="${qualityQc.state}">작화 ${qualityQc.label}</span>
              </div>
              <details class="image-qc-details">
                <summary><strong>검수 항목</strong><span>직접 확인한 항목만 체크하세요</span></summary>
                <div class="image-qc-check-grid">
                  ${qcChecks.map(([key, label]) => `<label><input type="checkbox" data-qc-check="${key}" ${currentVersion?.qc?.checks?.[key] === true ? "checked" : ""}><span>${label}</span></label>`).join("")}
                </div>
                <label class="image-qc-note"><span>발견한 문제</span><textarea rows="2" maxlength="500" data-qc-issue placeholder="예: 주인공 오른손의 손가락이 겹쳐 보입니다.">${escapeHtml(qcIssue)}</textarea></label>
                <button class="tool-button mini" type="button" data-action="prepare-qc-fix">검수 내용으로 수정문 만들기</button>
              </details>
              <div class="image-version-actions">
                <button class="tool-button mini primary" type="button" data-action="approve-image-version" ${currentStageApproved ? "disabled" : ""}>${currentRenderStage === "draft" ? "이 구도로 완성하기" : "이 완성본 사용"}</button>
                ${currentRenderStage === "draft" && currentStageApproved && !approvedDraftReferenceSource(currentVersion) ? '<button class="tool-button mini" type="button" data-action="sync-draft-asset">완성화 참조 저장</button>' : ""}
                <button class="tool-button mini" type="button" data-action="flag-image-version" ${currentVersion ? "" : "disabled"}>수정 필요</button>
              </div>
            </div>
          ` : ""}
        </div>
        </div>
      </details>
    `;
    }).join("");
    project.panels.forEach((panel) => hydrateVersionThumbnails(container, panel));
  }

  function renderStudioPreview(container, project, selectedPanelId) {
    const previousScrollTop = container.scrollTop;
    container.className = "guide-canvas is-ready studio-preview-frame studio-guide-canvas";
    container.innerHTML = project.panels.map((panel, index) => {
      ensurePanelEditingState(panel);
      const frameX = Math.max(12, Math.min(88, Number(panel.frameX ?? 50)));
      const frameY = Math.max(12, Math.min(88, Number(panel.frameY ?? 50)));
      const bubblePosition = overlayPosition(panel, "line");
      const narrationPosition = overlayPosition(panel, "narration");
      const sfxPosition = overlayPosition(panel, "sfx");
      const soft = softenColor(panel.accent);
      const hasImage = Boolean(panel.imageData);
      const selected = panel.id === selectedPanelId;
      const panelLabel = `${index + 1}컷 · ${phaseLabel(panel.phase)}`;
      const panelSpec = panel.panelSpec || {};
      const storyboardX = /right/u.test(panelSpec.subjects?.[0]?.screenPosition || "") ? 72 : /left/u.test(panelSpec.subjects?.[0]?.screenPosition || "") ? 28 : 50;
      const art = hasImage
        ? `<img class="studio-panel-art" src="${escapeHtml(panel.imageData)}" alt="${escapeHtml(panel.beat)}" draggable="false">`
        : `
          <div class="studio-storyboard-art" aria-label="${index + 1}컷 이미지 준비 중">
            <div class="studio-storyboard-grid" aria-hidden="true"></div>
            <div class="studio-storyboard-safe-zone" aria-hidden="true"></div>
            <div class="studio-storyboard-subject" aria-hidden="true" style="--storyboard-subject-x:${storyboardX}%"><i></i><b></b></div>
            <p><span>${escapeHtml(cameraLabel(panelSpec.camera?.shotSize))} · ${escapeHtml(panelSpec.purpose || "이야기 진행")}</span><strong>${escapeHtml(shorten(panelSpec.moment || panel.beat, 92))}</strong><small>${escapeHtml(panelSpec.emotionBeforeAfter || "감정 변화 확인")}</small></p>
          </div>
        `;
      const extraOverlays = panel.textObjects
        .filter((item) => ["dialogue", "thought"].includes(item.kind))
        .map((item) => `
          <div class="studio-overlay studio-overlay-extra ${item.kind === "thought" ? "is-thought" : ""} ${item.visible ? "" : "is-hidden"}" data-text-object-overlay="${escapeHtml(item.id)}" style="--overlay-x:${item.position.x}%;--overlay-y:${item.position.y}%;--text-scale:${item.size};">
            <div class="guide-bubble studio-editable-overlay studio-editable-bubble" contenteditable="true" spellcheck="false" data-panel-id="${panel.id}" data-text-object-edit="${escapeHtml(item.id)}" data-maxlength="${contentLimits.panelFields.line}" aria-label="추가 ${item.kind === "thought" ? "생각" : "대사"} 말풍선">${escapeHtml(item.textByLocale.ko)}</div>
            <button class="studio-overlay-handle" type="button" data-text-object-handle="${escapeHtml(item.id)}" aria-label="추가 말풍선 이동" title="추가 말풍선 이동">✥</button>
          </div>
          <span class="studio-tail-target ${item.visible ? "" : "is-hidden"}" aria-hidden="true" style="--tail-x:${item.tailTarget.x}%;--tail-y:${item.tailTarget.y}%;"></span>
        `).join("");
      const showRegenerationEditor = selected && !byId("regenerationPanel")?.hidden;
      const brushMaskMode = panel.regenerationDraftMaskMode === "brush";
      const regenerationRegion = showRegenerationEditor && !brushMaskMode && panel.regenerationDraftRegion
        ? normalizeRegenerationRegion(panel.regenerationDraftRegion)
        : null;

      return `
        <article class="guide-panel studio-guide-panel ${hasImage ? "has-image" : "is-storyboard"} ${selected ? "is-selected" : ""}" data-studio-panel-id="${panel.id}" tabindex="0" aria-label="${escapeHtml(panelLabel)}" style="--panel-accent:${panel.accent};--panel-soft:${soft};--frame-x:${frameX}%;--frame-y:${frameY}%;">
          ${art}
          ${regenerationRegion ? `<div class="studio-regeneration-region" aria-hidden="true" style="--region-x:${regenerationRegion.x}%;--region-y:${regenerationRegion.y}%;--region-width:${regenerationRegion.width}%;--region-height:${regenerationRegion.height}%;"><span>수정 영역</span></div>` : ""}
          ${showRegenerationEditor && brushMaskMode ? `<canvas class="studio-regeneration-mask" width="${regenerationMaskRules.width}" height="${regenerationMaskRules.height}" data-regeneration-mask-canvas aria-label="${index + 1}컷 수정 영역 붓 마스크"></canvas><span class="studio-regeneration-mask-hint">${panel.regenerationDraftMaskTool === "erase" ? "지울 부분을 문지르세요" : "고칠 부분만 칠하세요"}</span>` : ""}
          <button class="studio-panel-selector" type="button" data-select-panel aria-label="${index + 1}컷 선택" aria-pressed="${selected}"><span aria-hidden="true">✓</span>${selected ? "선택됨" : `${index + 1}컷`}</button>
          <div class="guide-panel-meta">
            <span>${String(index + 1).padStart(2, "0")}</span>
            <strong>${escapeHtml(phaseLabel(panel.phase))}</strong>
            <small data-studio-bubble-count class="${textLength(panel.line) > contentLimits.dialogueRecommendedMax ? "is-recommended-over" : ""}">${textLength(panel.line)} / ${contentLimits.panelFields.line}</small>
          </div>
          <div class="studio-overlay studio-overlay-line ${overlayIsVisible(panel, "line") ? "" : "is-hidden"}" data-overlay-kind="line" style="--overlay-x:${bubblePosition.x}%;--overlay-y:${bubblePosition.y}%;">
            <div class="guide-bubble studio-editable-overlay studio-editable-bubble" contenteditable="true" spellcheck="false" data-panel-id="${panel.id}" data-overlay-field="line" data-maxlength="${contentLimits.panelFields.line}" aria-label="${index + 1}컷 말풍선 · 최대 ${contentLimits.panelFields.line}자">${escapeHtml(panel.line)}</div>
            <button class="studio-overlay-handle" type="button" data-overlay-handle="line" aria-label="${index + 1}컷 말풍선 이동" title="말풍선 이동">✥</button>
          </div>
          ${extraOverlays}
          <div class="studio-overlay studio-overlay-sfx ${overlayIsVisible(panel, "sfx") ? "" : "is-hidden"}" data-overlay-kind="sfx" style="--overlay-x:${sfxPosition.x}%;--overlay-y:${sfxPosition.y}%;">
            <strong class="guide-sfx studio-editable-overlay" contenteditable="true" spellcheck="false" data-panel-id="${panel.id}" data-overlay-field="sfx" data-maxlength="${contentLimits.panelFields.sfx}" aria-label="${index + 1}컷 의성어 · 최대 ${contentLimits.panelFields.sfx}자">${escapeHtml(panel.sfx)}</strong>
            <button class="studio-overlay-handle" type="button" data-overlay-handle="sfx" aria-label="${index + 1}컷 의성어 이동" title="의성어 이동">✥</button>
          </div>
          <div class="studio-overlay studio-overlay-beat ${overlayIsVisible(panel, "narration") ? "" : "is-hidden"}" data-overlay-kind="narration" style="--overlay-x:${narrationPosition.x}%;--overlay-y:${narrationPosition.y}%;">
            <p class="guide-caption studio-editable-overlay" contenteditable="true" spellcheck="false" data-panel-id="${panel.id}" data-overlay-field="reaction" data-maxlength="${contentLimits.panelFields.reaction}" aria-label="${index + 1}컷 나레이션 · 최대 ${contentLimits.panelFields.reaction}자">${escapeHtml(panel.reaction)}</p>
            <button class="studio-overlay-handle" type="button" data-overlay-handle="narration" aria-label="${index + 1}컷 나레이션 이동" title="나레이션 이동">✥</button>
          </div>
          <button class="studio-composition-handle" type="button" data-composition-handle aria-label="${index + 1}컷 인물과 구도 이동" title="드래그해서 인물과 구도 이동"><span class="sr-only">인물과 구도 이동</span></button>
          ${panel.regenerating ? '<div class="guide-panel-overlay"><span></span><strong>선택한 컷만 요청하는 중</strong></div>' : ""}
        </article>
      `;
    }).join("");
    hydrateRegenerationMaskCanvases(container, project);
    container.scrollTop = previousScrollTop;
  }

  function renderPreview(container, project) {
    container.innerHTML = `
      <div class="phone-title">${escapeHtml(project.title)}</div>
      ${project.panels.map((panel, index) => renderScene(panel, "preview", index, project.panels.length)).join("")}
    `;
  }

  function renderReader(project, locale = "ko") {
    const synopsis = project.synopsis || "평범했던 하루가 무너진 순간, 주인공은 처음 보는 규칙 속에서 자기만의 답을 선택한다.";
    return `
      <header class="reader-episode-head">
        <span>${escapeHtml(project.episodeLabel || "EP.01")}</span>
        <h2>${escapeHtml(project.title)}</h2>
        <p>${escapeHtml(synopsis)}</p>
      </header>
      ${project.panels.map((panel, index) => {
        const act = project.templateId === "awakening-subway-gate" ? awakeningEpisodeActStarts[index] : null;
        return `${act ? renderEpisodeActDivider(act, index) : ""}${renderScene(panel, "reader", index, project.panels.length, locale)}`;
      }).join("")}
      <footer class="reader-episode-end">
        <span>EPISODE 01</span>
        <strong>한도윤의 이름은 왜 내일의 실종자 명단에 있었을까?</strong>
        <p>0번 승강장의 문이 열렸다.</p>
      </footer>
    `;
  }

  function renderEpisodeActDivider(act, index) {
    return `
      <div class="reader-act-divider" aria-label="${escapeHtml(act[1])}">
        <span>${escapeHtml(act[0])}</span>
        <strong>${escapeHtml(act[1])}</strong>
        <small>${String(index + 1).padStart(2, "0")}</small>
      </div>
    `;
  }

  function renderScene(panel, mode, index = 0, total = 0, locale = "ko") {
    ensurePanelEditingState(panel);
    const className = mode === "reader" ? "reader-panel" : "preview-panel";
    const sceneClass = mode === "reader" ? "reader-scene" : "preview-scene";
    const soft = softenColor(panel.accent);
    const bubblePosition = overlayPosition(panel, "line");
    const narrationPosition = overlayPosition(panel, "narration");
    const sfxPosition = overlayPosition(panel, "sfx");
    const localizedLine = panelTextForLocale(panel, "line", locale);
    const localizedNarration = panelTextForLocale(panel, "narration", locale);
    const localizedSfx = panelTextForLocale(panel, "sfx", locale);
    const extraLettering = panel.textObjects
      .filter((item) => ["dialogue", "thought"].includes(item.kind) && item.visible)
      .sort((a, b) => a.order - b.order)
      .map((item) => `<div class="speech extra-speech ${item.kind === "thought" ? "is-thought" : ""}" lang="${escapeHtml(locale)}" data-reading-order="${item.order}" style="--extra-speech-x:${item.position.x}%;--extra-speech-y:${item.position.y}%;--extra-text-scale:${item.size};--tail-target-x:${item.tailTarget.x}%;--tail-target-y:${item.tailTarget.y}%;">${escapeHtml(item.textByLocale?.[locale] || item.textByLocale?.ko || "")}</div>`)
      .join("");
    const overlayStyle = `--speech-x:${bubblePosition.x}%;--speech-y:${bubblePosition.y}%;--narration-x:${narrationPosition.x}%;--narration-y:${narrationPosition.y}%;--sfx-x:${sfxPosition.x}%;--sfx-y:${sfxPosition.y}%;`;
    const backgroundArt = panel.imageData
      ? `<img class="beat-background-art" src="${escapeHtml(panel.imageData)}" alt="" loading="lazy" aria-hidden="true">`
      : "";

    if (mode === "reader") {
      return `
        <div class="${sceneClass}" data-phase="${escapeHtml(panel.phase || "development")}" style="${overlayStyle}--scene-gap-after:${panel.gapAfter}px;">
          <div class="reader-scene-index"><span>SCENE ${String(index + 1).padStart(2, "0")}</span><strong>${escapeHtml(phaseLabel(panel.phase))}</strong><small>${index + 1} / ${total}</small></div>
          <section class="${className} scene-beat reader-art-panel ${panel.imageData ? "has-image" : ""}" style="--panel-accent: ${panel.accent}; --panel-soft: ${soft};">
            ${panel.imageData ? `<img class="panel-art-image" src="${escapeHtml(panel.imageData)}" alt="${escapeHtml(panel.beat)}" loading="lazy">` : ""}
            ${overlayIsVisible(panel, "narration") ? `<p class="panel-caption" lang="${escapeHtml(locale)}">${escapeHtml(localizedNarration)}</p>` : ""}
            ${overlayIsVisible(panel, "line") ? `<div class="speech" lang="${escapeHtml(locale)}">${escapeHtml(localizedLine)}</div>` : ""}
            ${extraLettering}
            ${overlayIsVisible(panel, "sfx") ? `<strong class="sfx" lang="${escapeHtml(locale)}">${escapeHtml(localizedSfx)}</strong>` : ""}
            <div class="panel-character" aria-hidden="true"></div>
            <div class="panel-art-line" aria-hidden="true"></div>
          </section>
        </div>
      `;
    }

    return `
      <div class="${sceneClass}" data-phase="${escapeHtml(panel.phase || "development")}" style="${overlayStyle}--scene-gap-after:${panel.gapAfter}px;">
        <section class="${className} scene-beat beat-establish ${panel.imageData ? "has-scene-art" : ""}" style="--panel-accent: ${panel.accent}; --panel-soft: ${soft};">
          ${backgroundArt}
          <div class="scene-horizon" aria-hidden="true"></div>
          ${overlayIsVisible(panel, "narration") ? `<p class="panel-caption" lang="${escapeHtml(locale)}">${escapeHtml(localizedNarration)}</p>` : ""}
        </section>
        <section class="${className} scene-beat beat-focus ${panel.imageData ? "has-image" : ""}" style="--panel-accent: ${panel.accent}; --panel-soft: ${soft};">
          ${panel.imageData ? `<img class="panel-art-image" src="${escapeHtml(panel.imageData)}" alt="${escapeHtml(panel.beat)}" loading="lazy">` : ""}
          ${overlayIsVisible(panel, "line") ? `<div class="speech" lang="${escapeHtml(locale)}">${escapeHtml(localizedLine)}</div>` : ""}
          ${extraLettering}
          <div class="panel-character" aria-hidden="true"></div>
          <div class="panel-art-line" aria-hidden="true"></div>
        </section>
        <section class="${className} scene-beat beat-reaction ${panel.imageData ? "has-scene-art" : ""}" style="--panel-accent: ${panel.accent}; --panel-soft: ${soft};">
          ${backgroundArt}
          ${overlayIsVisible(panel, "sfx") ? `<strong class="sfx" lang="${escapeHtml(locale)}">${escapeHtml(localizedSfx)}</strong>` : ""}
        </section>
      </div>
    `;
  }

  function renderStats(project) {
    byId("statPanels").textContent = String(project.panels.length);
    byId("statGenre").textContent = genreLabel(project.genre);
    byId("statMinutes").textContent = `${estimateReaderMinutes(countReaderPanels(project))}분`;
  }

  function renderProjectState(project) {
    const state = document.querySelector("[data-project-state]");
    if (!state) {
      return;
    }

    if (project.isPublic && project.status === "published") {
      state.dataset.state = project.hasUnpublishedChanges ? "changed" : "published";
      state.textContent = project.hasUnpublishedChanges
        ? "게시 후 수정됨 · 다시 게시 필요"
        : "공개 게시됨";
      return;
    }

    if (accessState.isAdmin && project.remoteId) {
      state.dataset.state = "remote-draft";
      state.textContent = "서버의 비공개 초안";
      return;
    }

    state.dataset.state = "local-draft";
    state.textContent = "이 기기의 비공개 초안";
  }

  function projectToText(project) {
    const analysis = analyzeStory(project.idea);
    const rows = [
      `# ${project.title}`,
      "",
      `전체 원고: ${project.idea}`,
      `1화 사용 원고: ${project.episodeStory || project.idea}`,
      ...(project.nextEpisodeStory ? [`다음 화 보류 원고: ${project.nextEpisodeStory}`] : []),
      `장르: ${genreLabel(project.genre)}`,
      `핵심 장면: ${project.panels.length}`,
      `예상 독자 컷: 약 ${project.panels.length * episodeRules.readerPanelsPerScene}`,
      `1화 마감 제안: ${analysis.cutLabel}`,
      "",
      ...project.panels.flatMap((panel, index) => [
        `## ${index + 1}장면`,
        `장면 설명: ${panel.beat}`,
        `나레이션: ${overlayIsVisible(panel, "narration") ? panel.reaction : "숨김"}`,
        `대사: ${overlayIsVisible(panel, "line") ? panel.line : "숨김"}`,
        `효과음: ${overlayIsVisible(panel, "sfx") ? panel.sfx : "숨김"}`,
        `나레이션 표시: ${overlayIsVisible(panel, "narration") ? "표시" : "숨김"}`,
        `텍스트 위치: ${JSON.stringify(panel.overlayPositions || cloneOverlayDefaults())}`,
        `연출: ${panel.note}`,
        `이미지: ${panel.imageName || (panel.imageKey ? "저장됨" : "없음")}`,
        ""
      ])
    ];
    return rows.join("\n");
  }

  function projectToChatGptPrompt(project) {
    const readiness = getPromptReadiness(project);
    const packages = readiness.ready
      ? (project.promptPackages?.length ? project.promptPackages : compilePromptPackages(project))
      : project.panels.map((panel, index) => buildPromptPackage(project, panel, index));
    return packages.map((item) => item.prompt).join("\n\n---\n\n");
  }

  function panelToChatGptPrompt(project, panel, index) {
    ensurePanelEditingState(panel);
    return buildPromptPackage(project, panel, index).prompt;
  }

  function showExport(title, text) {
    const exportColumn = byId("exportColumn");
    const outputSection = exportColumn.closest("[data-studio-section]");
    if (outputSection instanceof HTMLDetailsElement) {
      outputSection.open = true;
    }
    byId("exportTitle").textContent = title;
    byId("exportText").value = text;
    exportColumn.hidden = false;
    exportColumn.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function saveProject(project) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(stripProjectForStorage(project)));
    } catch (error) {
      flash("저장 공간 부족");
    }
  }

  async function saveProjectToRemote(project, options = {}) {
    if (getOracleApiBase()) {
      return saveProjectToOracle(project, options);
    }
    return saveProjectToSupabase(project, options);
  }

  async function saveProjectToOracle(project, { status = "draft", isPublic = false } = {}) {
    if (!accessState.signedIn) {
      return "local";
    }

    try {
      const storedProject = stripProjectForStorage(project);
      const body = {
        project: {
          ...storedProject,
          id: project.remoteId || storedProject.remoteId || storedProject.id,
          isPublic: accessState.isAdmin ? isPublic : false,
          status: accessState.isAdmin ? status : "draft"
        }
      };
      const path = project.remoteId
        ? `/api/webtoon/projects/${encodeURIComponent(project.remoteId)}`
        : "/api/webtoon/projects";
      const method = project.remoteId ? "PUT" : "POST";
      const data = await oracleFetch(path, { method, body: JSON.stringify(body) });
      project.remoteId = data?.project?.remoteId || data?.project?.id || project.remoteId;
      project.status = status;
      project.isPublic = isPublic;
      project.hasUnpublishedChanges = false;
      saveProject(project);
      return "remote";
    } catch {
      return "remote-error";
    }
  }

  async function saveProjectToSupabase(project, { status = "draft", isPublic = false } = {}) {
    if (!accessState.signedIn) {
      return "local";
    }

    const client = getSupabaseClient();
    if (!client) {
      return "local";
    }

    try {
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError || !sessionData.session) {
        return "local";
      }

      const storedProject = stripProjectForStorage(project);
      const row = {
        user_id: sessionData.session.user.id,
        title: storedProject.title,
        idea: storedProject.idea,
        genre: storedProject.genre,
        panels: storedProject.panels,
        status: accessState.isAdmin ? status : "draft",
        is_public: accessState.isAdmin ? isPublic : false
      };

      const request = project.remoteId
        ? client.from("webtoon_projects").update(row).eq("id", project.remoteId).select("id").single()
        : client.from("webtoon_projects").insert(row).select("id").single();
      const { data, error } = await request;
      if (error) {
        throw error;
      }

      project.remoteId = data.id;
      project.status = accessState.isAdmin ? status : "draft";
      project.isPublic = accessState.isAdmin ? isPublic : false;
      project.hasUnpublishedChanges = false;
      saveProject(project);
      return "remote";
    } catch (error) {
      return "remote-error";
    }
  }

  async function loadLatestPublicProject() {
    if (getOracleApiBase()) {
      try {
        const data = await oracleFetch("/api/webtoon/projects/public/latest", {
          auth: false
        });
        return data?.project || null;
      } catch {
        return null;
      }
    }

    const client = getSupabaseClient();
    if (!client) {
      return null;
    }

    const { data, error } = await client
      .from("webtoon_projects")
      .select("id,title,idea,genre,panels,updated_at")
      .eq("is_public", true)
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: `public-${data.id}`,
      remoteId: data.id,
      title: data.title,
      idea: data.idea,
      genre: data.genre,
      tone: "bright",
      status: "published",
      isPublic: true,
      hasUnpublishedChanges: false,
      panelCount: Array.isArray(data.panels) ? data.panels.length : 0,
      panels: Array.isArray(data.panels) ? data.panels : [],
      updatedAt: data.updated_at
    };
  }

  function approvedDraftReferenceSource(version) {
    const source = String(version?.sourceUrl || version?.publicPath || "").trim();
    if (!source) return "";
    try {
      return new URL(source, getOracleApiBase() || window.location.origin).href;
    } catch {
      return "";
    }
  }

  async function uploadApprovedDraftAsset(project, panel, version) {
    const existing = approvedDraftReferenceSource(version);
    if (!getOracleApiBase() || !accessState.signedIn || !accessState.canCreate) {
      throw new Error("draft_asset_upload_unavailable");
    }
    if (existing) {
      version.assetSyncStatus = "ready";
      const persistence = await saveProjectToRemote(project, { status: "draft", isPublic: false });
      if (persistence === "remote-error") throw new Error("draft_project_save_failed");
      return existing;
    }
    if (!project.remoteId) {
      const persistence = await saveProjectToRemote(project, { status: "draft", isPublic: false });
      if (persistence === "remote-error") throw new Error("draft_project_save_failed");
    }
    const stored = await getPanelImage(version.imageKey).catch(() => null);
    const dataUrl = stored?.dataUrl || (panel.currentVersionId === version.id ? panel.imageData : "");
    if (!/^data:image\/(?:jpeg|png|webp);base64,/i.test(dataUrl || "")) {
      throw new Error("draft_asset_missing");
    }
    const blob = await fetch(dataUrl).then((response) => response.blob());
    const body = new FormData();
    body.append("image", blob, version.name || `${panel.id}-draft.webp`);
    body.append("projectId", project.remoteId || project.id);
    body.append("panelId", panel.id);
    body.append("source", "approved-draft");
    body.append("note", `Approved visual draft ${version.id}`);
    version.assetSyncStatus = "uploading";
    const result = await oracleFetch("/api/webtoon/assets/reference", { method: "POST", body });
    const publicPath = String(result?.asset?.publicPath || "");
    if (!publicPath) throw new Error("draft_asset_upload_failed");
    version.assetId = String(result.asset.id || "");
    version.sourceUrl = publicPath;
    version.sourceAssetId = publicPath;
    version.assetSyncStatus = "ready";
    const persistence = await saveProjectToRemote(project, { status: "draft", isPublic: false });
    if (persistence === "remote-error") throw new Error("draft_project_save_failed");
    return approvedDraftReferenceSource(version);
  }

  async function oracleFetch(path, { method = "GET", body = null, auth = true } = {}) {
    const base = getOracleApiBase();
    if (!base) {
      throw new Error("oracle_api_not_configured");
    }

    const headers = { Accept: "application/json" };
    if (!(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }
    if (auth) {
      const client = getSupabaseClient();
      const { data } = client ? await client.auth.getSession() : { data: null };
      const token = data?.session?.access_token;
      if (!token) {
        const error = new Error("google_login_required");
        error.code = "google_login_required";
        error.status = 401;
        throw error;
      }
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${base}${path}`, {
      method,
      headers,
      body,
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer"
    });
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    if (!response.ok) {
      const error = new Error(payload?.error || `oracle_api_${response.status}`);
      error.code = payload?.error || `oracle_api_${response.status}`;
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  function getOracleApiBase() {
    const meta = document.querySelector("meta[name='webtoon-api-base']")?.content?.trim();
    if (!meta) {
      return "";
    }
    try {
      const parsed = new URL(meta, window.location.origin);
      const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
      if (parsed.protocol !== "https:" && !isLocal) {
        return "";
      }
      return parsed.origin.replace(/\/+$/, "");
    } catch {
      return "";
    }
  }

  function stripProjectForStorage(project) {
    return {
      ...project,
      panels: project.panels.map((panel) => {
        const { imageData, ...rest } = panel;
        return rest.imageKey || !imageData ? rest : { ...rest, imageData };
      })
    };
  }

  function loadProject() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "null");
    } catch {
      return null;
    }
  }

  function getIncomingTemplateId() {
    const urlTemplate = new URLSearchParams(window.location.search).get("template");
    const stored = localStorage.getItem(incomingTemplateKey);
    if (stored) {
      localStorage.removeItem(incomingTemplateKey);
    }
    return urlTemplate || stored || "";
  }

  function getIncomingScenarioId() {
    const scenarioId = new URLSearchParams(window.location.search).get("scenario") || "";
    return scenarioId === window.NeoKIMWebtoonScenario?.id ? scenarioId : "";
  }

  function setPanelCount(count) {
    const buttons = Array.from(document.querySelectorAll("[data-panel-count]"));
    if (!buttons.length) {
      return;
    }
    const target = Number(count) || episodeRules.targetKeyScenes;
    const selected = buttons.reduce((closest, button) => (
      Math.abs(Number(button.dataset.panelCount) - target) < Math.abs(Number(closest.dataset.panelCount) - target)
        ? button
        : closest
    ), buttons[0]);
    buttons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button === selected));
    });
  }

  function getPanelCount() {
    const active = document.querySelector("[data-panel-count][aria-pressed='true']");
    return Number(active?.dataset.panelCount || episodeRules.targetKeyScenes);
  }

  function createTitle(idea, genre) {
    const clean = String(idea || "").replace(/[^\p{L}\p{N}\s]/gu, "").trim();
    if (clean) {
      return clipText(clean.split(/\s+/).slice(0, 4).join(" "), contentLimits.titleMax);
    }
    return clipText(`${genreLabel(genre)} 단편`, contentLimits.titleMax);
  }

  function getHeroName(idea) {
    if (idea.includes("헌터")) {
      return "헌터";
    }
    if (idea.includes("알바")) {
      return "알바생";
    }
    if (idea.includes("학생")) {
      return "학생";
    }
    return "주인공";
  }

  function genreIndex(genre) {
    return ["modern-awakening", "daily", "fantasy", "romance", "thriller", "comedy", "action"].indexOf(genre);
  }

  function genreLabel(genre) {
    return {
      "modern-awakening": "현대 판타지 각성물",
      daily: "일상",
      fantasy: "판타지",
      romance: "로맨스",
      thriller: "스릴러",
      comedy: "코미디",
      action: "액션"
    }[genre] || "현대 판타지 각성물";
  }

  function phaseLabel(phase) {
    return {
      "cold-open": "콜드 오픈",
      setup: "일상과 결핍",
      hook: "이상 징후",
      inciting: "사건 발생",
      stakes: "실패 조건",
      goal: "목표 선택",
      threat: "위협 등장",
      ability: "능력 시험",
      progress: "첫 성공",
      complication: "상황 악화",
      midpoint: "중간 진실",
      reversal: "규칙 반전",
      decision: "주인공의 선택",
      payoff: "해결 실행",
      climax: "절정",
      resolution: "당면 해결",
      cost: "대가",
      reveal: "더 큰 진실",
      cliffhanger: "클리프행어",
      "next-episode": "다음 화 질문"
    }[phase] || "전개";
  }

  function phaseReaction(phase) {
    return {
      "cold-open": "아직 그 이유는 밝혀지지 않았다.",
      setup: "그때는 이것이 마지막 평범한 순간인 줄 몰랐다.",
      hook: "익숙한 세계에 처음으로 금이 갔다.",
      inciting: "이제 모른 척하고 돌아갈 수는 없다.",
      stakes: "남은 시간은 생각보다 짧다.",
      goal: "해야 할 일은 하나로 좁혀졌다.",
      threat: "상대도 주인공을 알아보기 시작했다.",
      ability: "약점은 사용법에 따라 무기가 된다.",
      progress: "작은 성공이 다음 문을 열었다.",
      complication: "하지만 열린 길은 함정과 이어져 있었다.",
      midpoint: "찾아낸 답은 더 큰 문제의 일부였다.",
      reversal: "처음 믿었던 규칙이 완전히 뒤집혔다.",
      decision: "선택한 순간, 이전으로 돌아갈 길이 사라졌다.",
      payoff: "앞서 남긴 흔적들이 하나의 답으로 모였다.",
      climax: "모든 준비가 단 한 번의 행동에 걸렸다.",
      resolution: "숨을 돌릴 수 있는 시간은 잠깐뿐이었다.",
      cost: "해결에는 반드시 흔적이 남는다.",
      reveal: "사건의 진짜 크기가 이제야 보였다.",
      cliffhanger: "다음 질문은 이미 주인공을 기다리고 있었다.",
      "next-episode": "그리고 열리지 말아야 할 문이 열렸다."
    }[phase] || "다음 장면이 새로운 선택을 기다린다.";
  }

  function countReaderPanels(project) {
    return (project?.panels?.length || 0) * episodeRules.readerPanelsPerScene;
  }

  function estimateReaderMinutes(readerPanelCount) {
    return Math.max(1, Math.ceil(Number(readerPanelCount || 0) / 12));
  }

  function softenColor(hex) {
    return {
      "#69c8ff": "#dff4ff",
      "#ffd85a": "#fff3c1",
      "#35d7a8": "#d9fff2",
      "#e95b88": "#ffe0ea",
      "#ff9a6c": "#ffe3d4",
      "#75c96b": "#e6f9df",
      "#243047": "#dce3ef"
    }[hex] || "#fff3c1";
  }

  function createId() {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }
    return `wt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  function slugify(text) {
    return String(text || "webtoon-draft")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9가-힣-]/g, "")
      .slice(0, 60) || "webtoon-draft";
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function panelImageKey(project, panel, versionId = "current") {
    return `${project.id}:${panel.id}:${versionId}`;
  }

  function prepareApprovedImagePointers(project) {
    project.panels.forEach((panel) => {
      ensurePanelVersionState(panel, project);
      const approved = panel.imageVersions.find((version) => version.id === panel.approvedVersionId && version.qc?.overall === "approved");
      if (!approved) {
        panel.imageData = "";
        panel.imageKey = "";
        panel.imageName = "";
        return;
      }
      panel.imageKey = approved.imageKey;
      panel.imageName = approved.name || "";
      panel.imageUpdatedAt = approved.createdAt || "";
      panel.imageData = approved.sourceUrl || (panel.currentVersionId === approved.id ? panel.imageData : "");
    });
  }

  async function hydrateProjectImages(project, { approvedOnly = false } = {}) {
    await Promise.all(project.panels.map(async (panel) => {
      ensurePanelVersionState(panel, project);
      if (approvedOnly) {
        const approved = panel.imageVersions.find((version) => version.id === panel.approvedVersionId && version.qc?.overall === "approved");
        if (!approved) {
          panel.imageData = "";
          return;
        }
        panel.imageKey = approved.imageKey;
        panel.imageName = approved.name || "";
        panel.imageUpdatedAt = approved.createdAt || "";
        if (approved.sourceUrl) {
          panel.imageData = approved.sourceUrl;
          return;
        }
      }
      if (panel.imageData && !/^(data:|blob:)/i.test(panel.imageData)) {
        return;
      }
      if (panel.imageData && !panel.imageKey) {
        const version = getCurrentImageVersion(panel);
        const key = version?.imageKey || panelImageKey(project, panel, version?.id || "legacy");
        const updatedAt = panel.imageUpdatedAt || new Date().toISOString();
        await putPanelImage(key, {
          key,
          dataUrl: panel.imageData,
          name: panel.imageName || "imported-panel.jpg",
          updatedAt
        });
        panel.imageKey = key;
        if (version) {
          version.imageKey = key;
        }
        panel.imageUpdatedAt = updatedAt;
        return;
      }

      if (!panel.imageData && panel.imageKey) {
        const stored = await getPanelImage(panel.imageKey);
        if (stored?.dataUrl) {
          panel.imageData = stored.dataUrl;
          panel.imageName = stored.name || panel.imageName || "";
          panel.imageUpdatedAt = stored.updatedAt || panel.imageUpdatedAt || "";
        }
      }
    }));
  }

  function openImageDb() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(new Error("IndexedDB를 사용할 수 없습니다."));
        return;
      }

      const request = indexedDB.open(imageDbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(imageStoreName)) {
          db.createObjectStore(imageStoreName, { keyPath: "key" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("이미지 저장소 열기 실패"));
      request.onblocked = () => reject(new Error("이미지 저장소가 다른 탭에서 사용 중입니다."));
    });
  }

  async function useImageStore(mode, operation) {
    const db = await openImageDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(imageStoreName, mode);
      const store = transaction.objectStore(imageStoreName);
      let result;

      try {
        const request = operation(store);
        if (request && typeof request.addEventListener === "function") {
          request.addEventListener("success", () => {
            result = request.result;
          });
          request.addEventListener("error", () => {
            reject(request.error || transaction.error || new Error("이미지 저장소 요청 실패"));
          });
        } else {
          result = request;
        }
      } catch (error) {
        db.close();
        reject(error);
        return;
      }

      transaction.addEventListener("complete", () => {
        db.close();
        resolve(result);
      });
      transaction.addEventListener("error", () => {
        db.close();
        reject(transaction.error || new Error("이미지 저장소 처리 실패"));
      });
      transaction.addEventListener("abort", () => {
        db.close();
        reject(transaction.error || new Error("이미지 저장소 작업 취소"));
      });
    });
  }

  function putPanelImage(key, payload) {
    return useImageStore("readwrite", (store) => store.put({ ...payload, key }));
  }

  function getPanelImage(key) {
    return useImageStore("readonly", (store) => store.get(key));
  }

  function deletePanelImage(key) {
    return useImageStore("readwrite", (store) => store.delete(key));
  }

  function imageFileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const objectUrl = URL.createObjectURL(file);
      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        if (Math.min(image.naturalWidth, image.naturalHeight) < contentLimits.imageMinSide) {
          reject(new Error(`이미지는 가로·세로 모두 ${contentLimits.imageMinSide}px 이상이어야 합니다`));
          return;
        }
        if (image.naturalWidth * image.naturalHeight > contentLimits.imageMaxPixels) {
          reject(new Error("이미지 해상도가 너무 큽니다 · 4천만 픽셀 이하만 가능"));
          return;
        }
        const maxWidth = 960;
        const maxHeight = 1500;
        const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
        const width = Math.max(1, Math.round(image.naturalWidth * scale));
        const height = Math.max(1, Math.round(image.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        context.fillStyle = "#fff8ea";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        let dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        if (dataUrlByteLength(dataUrl) > 2.5 * 1024 * 1024) {
          dataUrl = canvas.toDataURL("image/jpeg", 0.72);
        }
        resolve(dataUrl);
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("이미지 읽기 실패"));
      };
      image.src = objectUrl;
    });
  }

  function validateImageFile(file) {
    const extension = String(file.name || "").split(".").pop().toLowerCase();
    const mimeAllowed = contentLimits.imageMimeTypes.includes(file.type);
    const extensionAllowed = contentLimits.imageExtensions.includes(extension);
    if ((!mimeAllowed && !extensionAllowed) || (file.type && !mimeAllowed) || (file.name && !extensionAllowed)) {
      throw new Error("JPG, PNG, WebP 이미지만 가져올 수 있습니다");
    }
    if (file.size > contentLimits.imageBytes) {
      throw new Error("이미지는 한 장당 12MB 이하여야 합니다");
    }
  }

  function dataUrlByteLength(dataUrl) {
    const comma = dataUrl.indexOf(",");
    return Math.ceil(Math.max(0, dataUrl.length - comma - 1) * 3 / 4);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      byId("exportText")?.select();
      document.execCommand("copy");
    }
  }

  function flash(message) {
    const toast = byId("toast");
    if (!toast) {
      return;
    }
    toast.textContent = message;
    toast.hidden = false;
    window.clearTimeout(flash.timer);
    flash.timer = window.setTimeout(() => {
      toast.hidden = true;
    }, 1400);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function byId(id) {
    return document.getElementById(id);
  }

  window.WebtoonAdminApi = Object.freeze({
    request: oracleFetch,
    getAccessState() {
      return {
        isAdmin: accessState.isAdmin,
        signedIn: accessState.signedIn,
        acorns: accessState.isAdmin ? "unlimited" : accessState.acorns,
        canCreate: accessState.canCreate,
        ready: accessState.ready
      };
    }
  });
})();
