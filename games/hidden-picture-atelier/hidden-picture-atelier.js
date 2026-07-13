(() => {
  "use strict";

  const targetCount = 5;
  const timeLimitSeconds = 90;
  const maxHints = 2;
  const clueRevealTimes = [60, 45, 30, 18, 9];
  const storageKey = "hiddenDifferenceAtelierBest:v4";

  const elements = {
    title: document.getElementById("gameTitle"),
    kicker: document.getElementById("kickerLabel"),
    heroLead: document.getElementById("heroLead"),
    foundLabel: document.getElementById("foundLabel"),
    foundValue: document.getElementById("foundValue"),
    timeLabel: document.getElementById("timeLabel"),
    timeValue: document.getElementById("timeValue"),
    bestLabel: document.getElementById("bestLabel"),
    bestValue: document.getElementById("bestValue"),
    themeKicker: document.getElementById("themeKicker"),
    themeTitle: document.getElementById("themeTitle"),
    themeButtons: document.getElementById("themeButtons"),
    targetKicker: document.getElementById("targetKicker"),
    targetTitle: document.getElementById("targetTitle"),
    targetList: document.getElementById("targetList"),
    hintButton: document.getElementById("hintButton"),
    newGameButton: document.getElementById("newGameButton"),
    feedback: document.getElementById("feedbackText"),
    readyOverlay: document.getElementById("readyOverlay"),
    readyKicker: document.getElementById("readyKicker"),
    readyTitle: document.getElementById("readyTitle"),
    readyCopy: document.getElementById("readyCopy"),
    startButton: document.getElementById("startButton"),
    resultOverlay: document.getElementById("resultOverlay"),
    resultKicker: document.getElementById("resultKicker"),
    resultTitle: document.getElementById("resultTitle"),
    resultCopy: document.getElementById("resultCopy"),
    resultBadge: document.getElementById("resultBadge"),
    resultScore: document.getElementById("resultScore"),
    resultFound: document.getElementById("resultFound"),
    resultButton: document.getElementById("resultButton"),
    stage: document.getElementById("imagePairStage"),
    leftPanel: document.getElementById("leftPanel"),
    rightPanel: document.getElementById("rightPanel"),
    leftPanelBadge: document.getElementById("leftPanelBadge"),
    rightPanelBadge: document.getElementById("rightPanelBadge"),
    markerLayer: document.getElementById("markerLayer")
  };

  const copy = {
    ko: {
      pageTitle: "숨은 차이 테마 아틀리에 | NeoKIM Game Cabinet",
      metaDescription: "테마를 고르고 90초 안에 좌우 그림 속 다른 점 5개를 찾는 모바일 HTML5 숨은그림찾기 게임입니다.",
      kicker: "Hidden Difference",
      title: "숨은 차이 테마 아틀리에",
      lead: "테마를 고르고 90초 안에 두 그림의 다른 점 5개를 찾아보세요.",
      found: "찾음",
      time: "남은 시간",
      best: "최고 점수",
      themeKicker: "Theme",
      themeTitle: "테마",
      targetKicker: "Differences",
      targetTitle: "찾을 차이",
      original: "원본",
      changed: "차이",
      random: "랜덤",
      readyKicker: "Ready",
      readyTitle: "두 그림을 비교해보세요",
      readyCopy: "오른쪽 그림에서 다른 점 5개를 찾아 탭하면 됩니다.",
      start: "시작",
      hint: "힌트",
      newScene: "새 그림",
      retry: "다시 찾기",
      nextRandom: "랜덤으로 다시",
      readyFeedback: "테마를 고르면 바로 시작할 수 있어요.",
      startFeedback: "오른쪽 그림에서 달라진 부분만 탭해보세요.",
      leftTap: "왼쪽은 비교용 원본이에요. 오른쪽 그림에서 차이를 탭해 주세요.",
      foundObject: (label) => `${label} 찾았어요.`,
      alreadyFound: "이미 찾은 차이에요.",
      wrongTap: "거긴 같아 보여요. 시간 2초가 줄었어요.",
      closeTap: "거의 맞았어요. 그 근처를 조금 더 살펴보세요.",
      warmTap: "근처에 차이가 있어요. 시간은 1초만 줄었어요.",
      hintObject: (label) => `${label} 주변을 잠깐 비출게요.`,
      lockedClue: "단서 잠김",
      clueUnlocked: (label) => `단서 공개: ${label}`,
      noHint: "힌트를 모두 썼어요. 가장자리와 작은 소품을 천천히 비교해보세요.",
      winTitle: "모두 찾았어요",
      loseTitle: "시간 종료",
      winCopy: (score) => `점수 ${score}. 이번 눈썰미 꽤 좋아요.`,
      loseCopy: (found) => `${found}개를 찾았어요. 다음에는 큰 형태부터 비교해보면 더 빨라져요.`,
      perfectBadge: "반짝 완벽",
      noMissBadge: "또렷한 눈",
      swiftBadge: "빠른 발견",
      clearBadge: "클리어",
      retryBadge: "다시 도전",
      score: "점수"
    },
    "en-US": {
      pageTitle: "Hidden Difference Theme Atelier | NeoKIM Game Cabinet",
      metaDescription: "Pick a theme and find five differences between two pictures in 90 seconds.",
      kicker: "Hidden Difference",
      title: "Hidden Difference Theme Atelier",
      lead: "Pick a theme and find five differences between two pictures in 90 seconds.",
      found: "Found",
      time: "Time",
      best: "Best",
      themeKicker: "Theme",
      themeTitle: "Theme",
      targetKicker: "Differences",
      targetTitle: "Find",
      original: "Original",
      changed: "Changed",
      random: "Random",
      readyKicker: "Ready",
      readyTitle: "Compare the pictures",
      readyCopy: "Tap the five changed spots on the right picture.",
      start: "Start",
      hint: "Hint",
      newScene: "New Picture",
      retry: "Find Again",
      nextRandom: "Random Again",
      readyFeedback: "Choose a theme, then jump right in.",
      startFeedback: "Tap only the changed spots on the right picture.",
      leftTap: "The left picture is the original. Tap differences on the right.",
      foundObject: (label) => `Found ${label}.`,
      alreadyFound: "You already found that one.",
      wrongTap: "That spot looks the same. Two seconds were trimmed.",
      closeTap: "Almost there. Look a little closer around that spot.",
      warmTap: "A difference is nearby. Only one second was trimmed.",
      hintObject: (label) => `A soft ring will reveal ${label}.`,
      lockedClue: "Clue locked",
      clueUnlocked: (label) => `Clue unlocked: ${label}`,
      noHint: "No hints left. Compare edges and tiny props slowly.",
      winTitle: "All Found",
      loseTitle: "Time Up",
      winCopy: (score) => `Score ${score}. Nice eye this round.`,
      loseCopy: (found) => `You found ${found}. Start with big shapes next time and it gets faster.`,
      perfectBadge: "Spark Perfect",
      noMissBadge: "Sharp Eye",
      swiftBadge: "Swift Find",
      clearBadge: "Clear",
      retryBadge: "Try Again",
      score: "Score"
    },
    "ja-JP": {
      pageTitle: "まちがい探しテーマアトリエ | NeoKIM Game Cabinet",
      metaDescription: "テーマを選び、90秒以内に2枚の絵のちがいを5つ見つけるHTML5ゲームです。",
      kicker: "Hidden Difference",
      title: "まちがい探しテーマアトリエ",
      lead: "テーマを選び、90秒以内に2枚の絵のちがいを5つ見つけてください。",
      found: "発見",
      time: "残り時間",
      best: "ベスト",
      themeKicker: "Theme",
      themeTitle: "テーマ",
      targetKicker: "Differences",
      targetTitle: "探すちがい",
      original: "原画",
      changed: "ちがい",
      random: "ランダム",
      readyKicker: "Ready",
      readyTitle: "2枚の絵を比べてください",
      readyCopy: "右の絵で、ちがう場所を5つタップしてください。",
      start: "スタート",
      hint: "ヒント",
      newScene: "新しい絵",
      retry: "もう一度",
      nextRandom: "ランダムでもう一度",
      readyFeedback: "テーマを選ぶとすぐに始められます。",
      startFeedback: "右の絵の変わった場所だけをタップしてください。",
      leftTap: "左は原画です。右の絵でちがいをタップしてください。",
      foundObject: (label) => `${label}を見つけました。`,
      alreadyFound: "そのちがいはもう見つけています。",
      wrongTap: "そこは同じようです。時間が2秒減りました。",
      closeTap: "かなり近いです。その周りをもう少し見てください。",
      warmTap: "近くにちがいがあります。時間は1秒だけ減りました。",
      hintObject: (label) => `${label}の近くを少し光らせます。`,
      lockedClue: "ヒント待ち",
      clueUnlocked: (label) => `ヒント公開: ${label}`,
      noHint: "ヒントはもうありません。端と小物をゆっくり比べてください。",
      winTitle: "全部見つけました",
      loseTitle: "時間切れ",
      winCopy: (score) => `スコア ${score}。いい観察力です。`,
      loseCopy: (found) => `${found}個見つけました。次は大きな形から比べると早くなります。`,
      perfectBadge: "完璧",
      noMissBadge: "鋭い目",
      swiftBadge: "高速発見",
      clearBadge: "クリア",
      retryBadge: "再挑戦",
      score: "スコア"
    }
  };

  const themes = [
    theme("anime", "#ffd86a", { ko: "애니풍", "en-US": "Anime Mood", "ja-JP": "アニメ風" }),
    theme("landscape", "#7fc8ff", { ko: "풍경", "en-US": "Landscape", "ja-JP": "風景" }),
    theme("medieval", "#d3a761", { ko: "중세 예술", "en-US": "Medieval Art", "ja-JP": "中世美術" }),
    theme("ancient", "#ffb16c", { ko: "고대", "en-US": "Ancient", "ja-JP": "古代" }),
    theme("modern", "#61e6bd", { ko: "현대", "en-US": "Modern", "ja-JP": "現代" }),
    theme("wildlife", "#80c46f", { ko: "동식물", "en-US": "Wildlife", "ja-JP": "動植物" })
  ];

  const scenes = [
    scene("anime-atelier", "anime", "./assets/anime-pair.png", [
      target("sky-bird", 0.79, 0.24, 0.062, { ko: "하늘의 새", "en-US": "sky bird", "ja-JP": "空の鳥" }),
      target("pink-brush-cup", 0.16, 0.58, 0.067, { ko: "분홍 붓컵", "en-US": "pink brush cup", "ja-JP": "ピンクの筆立て" }),
      target("blue-keychain", 0.61, 0.82, 0.062, { ko: "파란 키링", "en-US": "blue keychain", "ja-JP": "青いキーホルダー" }),
      target("notebook-flower", 0.82, 0.78, 0.06, { ko: "노트 위 꽃", "en-US": "flower on notebook", "ja-JP": "ノートの花" }),
      target("desk-brush", 0.47, 0.77, 0.06, { ko: "책상 위 붓", "en-US": "desk brush", "ja-JP": "机の筆" })
    ]),
    scene("anime-observatory", "anime", "./assets/anime-observatory-pair.png", [
      target("observatory-comet", 0.58, 0.18, 0.07, { ko: "창밖 혜성", "en-US": "window comet", "ja-JP": "窓の彗星" }),
      target("pink-lantern", 0.84, 0.10, 0.075, { ko: "분홍 등불", "en-US": "pink lantern", "ja-JP": "ピンクの提灯" }),
      target("telescope-star", 0.72, 0.26, 0.066, { ko: "망원경 별표", "en-US": "telescope star", "ja-JP": "望遠鏡の星" }),
      target("cat-cushion", 0.84, 0.68, 0.082, { ko: "고양이 쿠션", "en-US": "cat cushion", "ja-JP": "猫クッション" }),
      target("ringed-planet", 0.70, 0.75, 0.068, { ko: "고리 행성", "en-US": "ringed planet", "ja-JP": "輪の惑星" })
    ]),
    scene("anime-festival", "anime", "./assets/anime-festival-pair.png", [
      target("moon-lantern", 0.48, 0.12, 0.072, { ko: "초승달 등", "en-US": "crescent lantern", "ja-JP": "三日月提灯" }),
      target("blue-fish-bowl", 0.40, 0.51, 0.07, { ko: "파란 물고기", "en-US": "blue fish toy", "ja-JP": "青い魚" }),
      target("red-pinwheel", 0.64, 0.62, 0.075, { ko: "빨간 바람개비", "en-US": "red pinwheel", "ja-JP": "赤い風車" }),
      target("bitten-apple", 0.60, 0.45, 0.07, { ko: "베어 문 사과", "en-US": "bitten candy apple", "ja-JP": "かじったりんご飴" }),
      target("paper-boat", 0.84, 0.39, 0.075, { ko: "하얀 종이배", "en-US": "white paper boat", "ja-JP": "白い紙の舟" })
    ]),
    scene("landscape-lake", "landscape", "./assets/landscape-pair.png", [
      target("lake-duck", 0.31, 0.55, 0.055, { ko: "호수의 오리", "en-US": "lake duck", "ja-JP": "湖のカモ" }),
      target("backpack-patch", 0.30, 0.78, 0.064, { ko: "배낭 패치", "en-US": "backpack patch", "ja-JP": "リュックのワッペン" }),
      target("white-mug", 0.53, 0.82, 0.056, { ko: "하얀 머그컵", "en-US": "white mug", "ja-JP": "白いマグ" }),
      target("purple-flowers", 0.87, 0.80, 0.066, { ko: "보라 꽃무리", "en-US": "purple flowers", "ja-JP": "紫の花" }),
      target("sky-streak", 0.66, 0.09, 0.058, { ko: "하늘의 흰 선", "en-US": "white sky streak", "ja-JP": "空の白い線" })
    ]),
    scene("landscape-canyon", "landscape", "./assets/landscape-canyon-pair.png", [
      target("canyon-balloon", 0.46, 0.15, 0.07, { ko: "작은 열기구", "en-US": "tiny hot air balloon", "ja-JP": "小さな気球" }),
      target("tent-bandana", 0.32, 0.49, 0.075, { ko: "텐트의 파란 천", "en-US": "blue tent bandana", "ja-JP": "テントの青い布" }),
      target("extra-cup", 0.62, 0.73, 0.07, { ko: "두 번째 컵", "en-US": "second enamel cup", "ja-JP": "二つ目のカップ" }),
      target("red-cactus-flower", 0.92, 0.56, 0.07, { ko: "붉은 선인장 꽃", "en-US": "red cactus flower", "ja-JP": "赤いサボテン花" }),
      target("rock-lizard", 0.64, 0.92, 0.08, { ko: "바위 위 도마뱀", "en-US": "rock lizard", "ja-JP": "岩のトカゲ" })
    ]),
    scene("landscape-hotspring", "landscape", "./assets/landscape-hotspring-pair.png", [
      target("red-mitten", 0.10, 0.70, 0.078, { ko: "빨간 장갑", "en-US": "red mitten", "ja-JP": "赤い手袋" }),
      target("blue-bucket-stripe", 0.20, 0.81, 0.075, { ko: "파란 줄무늬 바가지", "en-US": "blue bucket stripe", "ja-JP": "桶の青い線" }),
      target("distant-seal", 0.13, 0.42, 0.075, { ko: "물 위 물범", "en-US": "seal in the water", "ja-JP": "水面のアザラシ" }),
      target("green-aurora", 0.55, 0.20, 0.095, { ko: "밝은 오로라", "en-US": "bright aurora", "ja-JP": "明るいオーロラ" }),
      target("small-lantern", 0.90, 0.77, 0.08, { ko: "작은 랜턴", "en-US": "small lantern", "ja-JP": "小さなランタン" })
    ]),
    scene("medieval-chamber", "medieval", "./assets/medieval-pair.png", [
      target("white-flower", 0.56, 0.24, 0.06, { ko: "하얀 꽃", "en-US": "white flower", "ja-JP": "白い花" }),
      target("castle-flag", 0.69, 0.18, 0.052, { ko: "성의 깃발", "en-US": "castle flag", "ja-JP": "城の旗" }),
      target("chest-emblem", 0.78, 0.52, 0.06, { ko: "상자 문양", "en-US": "chest emblem", "ja-JP": "箱の紋章" }),
      target("red-finial", 0.95, 0.54, 0.052, { ko: "빨간 장식", "en-US": "red finial", "ja-JP": "赤い飾り" }),
      target("berry-bowl", 0.89, 0.64, 0.06, { ko: "열매 접시", "en-US": "berry bowl", "ja-JP": "木の実の皿" })
    ]),
    scene("medieval-market", "medieval", "./assets/medieval-market-pair.png", [
      target("blue-gate-pennant", 0.60, 0.12, 0.07, { ko: "성문 파란 깃발", "en-US": "blue gate pennant", "ja-JP": "門の青い旗" }),
      target("flower-loaf", 0.21, 0.74, 0.078, { ko: "꽃 문양 빵", "en-US": "flower stamped loaf", "ja-JP": "花印のパン" }),
      target("gold-cat-fountain", 0.56, 0.58, 0.075, { ko: "분수 옆 금고양이", "en-US": "gold cat by fountain", "ja-JP": "噴水の金猫" }),
      target("basket-red-apple", 0.40, 0.81, 0.075, { ko: "허브 바구니 사과", "en-US": "red apple in herbs", "ja-JP": "ハーブの赤りんご" }),
      target("purple-banner", 0.79, 0.20, 0.085, { ko: "보라 깃발", "en-US": "purple banner", "ja-JP": "紫の旗" })
    ]),
    scene("medieval-greenhouse", "medieval", "./assets/medieval-greenhouse-pair.png", [
      target("beam-owl", 0.29, 0.08, 0.08, { ko: "들보 위 흰 부엉이", "en-US": "white owl on beam", "ja-JP": "梁の白フクロウ" }),
      target("blue-apothecary-jar", 0.92, 0.28, 0.075, { ko: "파란 약병", "en-US": "blue apothecary jar", "ja-JP": "青い薬瓶" }),
      target("red-rose", 0.94, 0.56, 0.075, { ko: "붉은 장미", "en-US": "red rose", "ja-JP": "赤いバラ" }),
      target("brass-key", 0.70, 0.64, 0.075, { ko: "황동 열쇠", "en-US": "brass key", "ja-JP": "真鍮の鍵" }),
      target("purple-glass-pane", 0.49, 0.19, 0.075, { ko: "보라 유리 조각", "en-US": "purple glass pane", "ja-JP": "紫のガラス" })
    ]),
    scene("ancient-temple", "ancient", "./assets/ancient-pair.png", [
      target("ankh-glyph", 0.50, 0.18, 0.065, { ko: "앙크 문양", "en-US": "ankh glyph", "ja-JP": "アンク記号" }),
      target("wall-symbols", 0.62, 0.25, 0.065, { ko: "벽의 기호", "en-US": "wall symbols", "ja-JP": "壁の記号" }),
      target("small-gold-pot", 0.70, 0.72, 0.065, { ko: "작은 황금 항아리", "en-US": "small gold pot", "ja-JP": "小さな金の壺" }),
      target("papyrus-lines", 0.48, 0.78, 0.07, { ko: "파피루스 선", "en-US": "papyrus lines", "ja-JP": "パピルスの線" }),
      target("missing-scarab", 0.10, 0.84, 0.075, { ko: "사라진 스카라브", "en-US": "missing scarab", "ja-JP": "消えたスカラベ" })
    ]),
    scene("ancient-cave", "ancient", "./assets/ancient-cave-pair.png", [
      target("blue-handprint", 0.50, 0.26, 0.075, { ko: "푸른 손자국", "en-US": "blue handprint", "ja-JP": "青い手形" }),
      target("wall-spiral", 0.86, 0.22, 0.075, { ko: "동굴의 나선", "en-US": "cave spiral", "ja-JP": "洞窟の渦巻き" }),
      target("extra-clay-bowl", 0.12, 0.54, 0.08, { ko: "추가된 토기", "en-US": "extra clay bowl", "ja-JP": "増えた土器" }),
      target("red-animal-horn", 0.49, 0.12, 0.08, { ko: "붉은 동물 뿔", "en-US": "red animal horn", "ja-JP": "赤い動物の角" }),
      target("shell-necklace", 0.52, 0.89, 0.085, { ko: "조개 목걸이", "en-US": "shell necklace", "ja-JP": "貝の首飾り" })
    ]),
    scene("ancient-ziggurat", "ancient", "./assets/ancient-ziggurat-pair.png", [
      target("extra-star", 0.39, 0.06, 0.075, { ko: "달 옆 밝은 별", "en-US": "extra bright star", "ja-JP": "月横の明るい星" }),
      target("blue-bead-bracelet", 0.78, 0.86, 0.08, { ko: "파란 구슬 팔찌", "en-US": "blue bead bracelet", "ja-JP": "青いビーズ腕輪" }),
      target("green-lamp-flame", 0.18, 0.69, 0.08, { ko: "초록 불꽃", "en-US": "green lamp flame", "ja-JP": "緑の炎" }),
      target("red-basket-tassel", 0.92, 0.57, 0.08, { ko: "바구니 빨간 술", "en-US": "red basket tassel", "ja-JP": "籠の赤い房" }),
      target("parapet-bird", 0.04, 0.14, 0.075, { ko: "성벽 위 새", "en-US": "bird on parapet", "ja-JP": "欄干の鳥" })
    ]),
    scene("modern-loft", "modern", "./assets/modern-pair.png", [
      target("plant-heart", 0.20, 0.51, 0.06, { ko: "화분 속 하트", "en-US": "heart in plant", "ja-JP": "鉢のハート" }),
      target("orange-cushion", 0.78, 0.56, 0.075, { ko: "주황 쿠션", "en-US": "orange cushion", "ja-JP": "オレンジのクッション" }),
      target("speckled-pot", 0.18, 0.64, 0.06, { ko: "점박이 화분", "en-US": "speckled pot", "ja-JP": "まだらの鉢" }),
      target("paper-pyramid", 0.72, 0.64, 0.06, { ko: "종이 피라미드", "en-US": "paper pyramid", "ja-JP": "紙のピラミッド" }),
      target("changed-postcards", 0.58, 0.83, 0.075, { ko: "바뀐 엽서", "en-US": "changed postcards", "ja-JP": "変わったポストカード" })
    ]),
    scene("modern-subway", "modern", "./assets/modern-subway-pair.png", [
      target("yellow-umbrella", 0.73, 0.54, 0.08, { ko: "노란 우산", "en-US": "yellow umbrella", "ja-JP": "黄色い傘" }),
      target("blue-vending-slot", 0.48, 0.44, 0.075, { ko: "파란 자판기 칸", "en-US": "blue vending slot", "ja-JP": "青い自販機口" }),
      target("green-floor-leaf", 0.39, 0.87, 0.075, { ko: "바닥의 초록 잎", "en-US": "green floor leaf", "ja-JP": "床の緑の葉" }),
      target("red-column-sticker", 0.36, 0.51, 0.075, { ko: "기둥 빨간 스티커", "en-US": "red column sticker", "ja-JP": "柱の赤シール" }),
      target("paper-crane", 0.86, 0.83, 0.08, { ko: "화분 옆 종이학", "en-US": "paper crane by plant", "ja-JP": "鉢横の折り鶴" })
    ]),
    scene("modern-laundromat", "modern", "./assets/modern-laundromat-pair.png", [
      target("pink-washer", 0.76, 0.40, 0.08, { ko: "분홍 세탁기 문", "en-US": "pink washer door", "ja-JP": "ピンクの洗濯機扉" }),
      target("yellow-sock", 0.45, 0.85, 0.08, { ko: "바닥의 노란 양말", "en-US": "yellow sock", "ja-JP": "床の黄色い靴下" }),
      target("blue-detergent", 0.89, 0.64, 0.075, { ko: "파란 세제통", "en-US": "blue detergent bottle", "ja-JP": "青い洗剤" }),
      target("red-basket-handle", 0.80, 0.76, 0.075, { ko: "빨간 바구니 손잡이", "en-US": "red basket handle", "ja-JP": "赤い籠の取っ手" }),
      target("tiny-plant", 0.95, 0.14, 0.075, { ko: "세탁기 위 작은 화분", "en-US": "tiny plant", "ja-JP": "小さな鉢" })
    ]),
    scene("wildlife-jungle", "wildlife", "./assets/wildlife-pair.png", [
      target("blue-parrot", 0.20, 0.15, 0.065, { ko: "파란 앵무새", "en-US": "blue parrot", "ja-JP": "青いインコ" }),
      target("blue-frog", 0.60, 0.66, 0.058, { ko: "파란 개구리", "en-US": "blue frog", "ja-JP": "青いカエル" }),
      target("missing-butterfly", 0.79, 0.57, 0.063, { ko: "사라진 나비", "en-US": "missing butterfly", "ja-JP": "消えた蝶" }),
      target("red-plant", 0.88, 0.84, 0.075, { ko: "붉은 잎", "en-US": "red plant", "ja-JP": "赤い葉" }),
      target("elephant-detail", 0.70, 0.49, 0.07, { ko: "코끼리 주변", "en-US": "elephant detail", "ja-JP": "ゾウの周り" })
    ]),
    scene("wildlife-savanna", "wildlife", "./assets/wildlife-savanna-pair.png", [
      target("red-bird", 0.20, 0.10, 0.075, { ko: "나무 위 붉은 새", "en-US": "red bird on branch", "ja-JP": "枝の赤い鳥" }),
      target("baby-zebra", 0.72, 0.41, 0.085, { ko: "아기 얼룩말", "en-US": "baby zebra", "ja-JP": "子どものシマウマ" }),
      target("blue-lens-cap", 0.27, 0.80, 0.08, { ko: "파란 렌즈 뚜껑", "en-US": "blue lens cap", "ja-JP": "青いレンズ蓋" }),
      target("yellow-butterfly", 0.87, 0.64, 0.075, { ko: "노란 나비", "en-US": "yellow butterfly", "ja-JP": "黄色い蝶" }),
      target("water-frog", 0.65, 0.64, 0.075, { ko: "물가의 초록 개구리", "en-US": "green frog near water", "ja-JP": "水辺の緑カエル" })
    ]),
    scene("wildlife-tidepool", "wildlife", "./assets/wildlife-tidepool-pair.png", [
      target("purple-starfish", 0.85, 0.56, 0.08, { ko: "보라 불가사리", "en-US": "purple starfish", "ja-JP": "紫のヒトデ" }),
      target("orange-crab", 0.66, 0.67, 0.08, { ko: "주황 게", "en-US": "orange crab", "ja-JP": "オレンジのカニ" }),
      target("blue-shell", 0.78, 0.77, 0.08, { ko: "파란 조개껍질", "en-US": "blue shell", "ja-JP": "青い貝殻" }),
      target("winged-gull", 0.35, 0.08, 0.085, { ko: "날개 편 갈매기", "en-US": "winged gull", "ja-JP": "羽を広げたカモメ" }),
      target("yellow-anemone", 0.55, 0.48, 0.08, { ko: "노란 말미잘", "en-US": "yellow anemone", "ja-JP": "黄色いイソギンチャク" })
    ])
  ];

  const state = {
    locale: "ko",
    selectedSceneId: "anime",
    scene: scenes[0],
    found: new Set(),
    hintsLeft: maxHints,
    started: false,
    ended: false,
    endAt: 0,
    timerId: 0,
    timeLeft: timeLimitSeconds,
    score: 0,
    wrongTaps: 0,
    nearMisses: 0,
    best: loadBest(),
    feedbackKey: "readyFeedback",
    feedbackArgs: [],
    hintTargetId: "",
    hintUntil: 0,
    revealedClues: new Set(),
    missPings: [],
    lastRandomSceneId: ""
  };

  init();

  function init() {
    state.locale = currentLocale();
    preloadSceneImage(state.scene.image);
    renderStaticCopy();
    renderThemeButtons();
    renderScene();
    renderTargets();
    renderHud();
    renderFeedback();

    elements.startButton.addEventListener("click", () => startGame(false));
    elements.resultButton.addEventListener("click", () => startGame(true));
    elements.newGameButton.addEventListener("click", () => startGame(true));
    elements.hintButton.addEventListener("click", useHint);
    elements.rightPanel.addEventListener("pointerdown", handleRightPanelTap);
    elements.leftPanel.addEventListener("pointerdown", () => {
      setFeedback("leftTap");
    });

    window.addEventListener("neokim:games-localechange", () => {
      state.locale = currentLocale();
      renderStaticCopy();
      renderThemeButtons();
      renderTargets();
      renderHud();
      renderFeedback();
      renderResultCopy();
    });
  }

  function theme(id, color, labels) {
    return { id, color, labels };
  }

  function scene(id, themeId, image, targets) {
    const themeItem = themes.find((item) => item.id === themeId) || themes[0];
    return {
      id,
      themeId,
      color: themeItem.color,
      labels: themeItem.labels,
      image,
      targets
    };
  }

  function target(id, x, y, radius, labels) {
    return { id, x, y, radius, labels };
  }

  function currentLocale() {
    const locale = window.NEOKIM_GAMES_I18N?.getLocale?.() || document.documentElement.lang || "ko";
    if (String(locale).toLowerCase().startsWith("ja")) {
      return "ja-JP";
    }
    if (String(locale).toLowerCase().startsWith("en")) {
      return "en-US";
    }
    return "ko";
  }

  function t(key) {
    return copy[state.locale]?.[key] ?? copy.ko[key] ?? key;
  }

  function label(value) {
    return value?.[state.locale] || value?.ko || "";
  }

  function renderStaticCopy() {
    document.title = t("pageTitle");
    document.documentElement.lang = state.locale === "ko" ? "ko" : state.locale;
    document.querySelector("meta[name='description']")?.setAttribute("content", t("metaDescription"));
    document.querySelector("meta[property='og:title']")?.setAttribute("content", t("pageTitle"));
    document.querySelector("meta[property='og:description']")?.setAttribute("content", t("metaDescription"));
    elements.kicker.textContent = t("kicker");
    elements.title.textContent = t("title");
    elements.heroLead.textContent = t("lead");
    elements.foundLabel.textContent = t("found");
    elements.timeLabel.textContent = t("time");
    elements.bestLabel.textContent = t("best");
    elements.themeKicker.textContent = t("themeKicker");
    elements.themeTitle.textContent = t("themeTitle");
    elements.targetKicker.textContent = t("targetKicker");
    elements.targetTitle.textContent = t("targetTitle");
    elements.readyKicker.textContent = t("readyKicker");
    elements.readyTitle.textContent = t("readyTitle");
    elements.readyCopy.textContent = t("readyCopy");
    elements.startButton.textContent = t("start");
    elements.newGameButton.textContent = t("newScene");
    elements.leftPanelBadge.textContent = t("original");
    elements.rightPanelBadge.textContent = t("changed");
    elements.leftPanel.setAttribute("aria-label", t("original"));
    elements.rightPanel.setAttribute("aria-label", t("changed"));
    elements.resultButton.textContent = state.selectedSceneId === "random" ? t("nextRandom") : t("retry");
  }

  function renderThemeButtons() {
    const buttons = [
      ...themes.map((item) => ({ id: item.id, label: label(item.labels), color: item.color })),
      { id: "random", label: t("random"), color: "#ffffff", random: true }
    ];

    elements.themeButtons.innerHTML = buttons.map((item) => `
      <button
        class="theme-button${state.selectedSceneId === item.id ? " is-active" : ""}${item.random ? " is-random" : ""}"
        type="button"
        style="--button-color:${escapeHtml(item.color)}"
        data-scene-id="${escapeHtml(item.id)}"
      >${escapeHtml(item.label)}</button>
    `).join("");

    elements.themeButtons.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => selectScene(button.dataset.sceneId));
    });
  }

  function selectScene(sceneId) {
    stopTimer();
    state.selectedSceneId = sceneId;
    resetRound(false);
    setFeedback("readyFeedback");
    renderStaticCopy();
    renderThemeButtons();
    renderScene();
    renderTargets();
    renderHud();
    renderFeedback();
  }

  function pickRandomScene() {
    const excludedId = state.scene?.id || state.lastRandomSceneId;
    const pool = scenes.filter((item) => item.id !== excludedId);
    const scenePool = pool.length ? pool : scenes;
    const next = scenePool[Math.floor(Math.random() * scenePool.length)];
    state.lastRandomSceneId = next.id;
    return next;
  }

  function pickThemeScene(themeId, advance) {
    const pool = scenes.filter((item) => item.themeId === themeId);
    if (!pool.length) {
      return scenes[0];
    }
    if (advance && state.scene?.themeId === themeId) {
      const currentIndex = pool.findIndex((item) => item.id === state.scene.id);
      return pool[(currentIndex + 1) % pool.length];
    }
    return pool[0];
  }

  function advanceSceneForSelection() {
    state.scene = state.selectedSceneId === "random"
      ? pickRandomScene()
      : pickThemeScene(state.selectedSceneId, true);
  }

  function startGame(advanceScene) {
    if (advanceScene) {
      advanceSceneForSelection();
    }
    resetRound(true);
    state.started = true;
    state.endAt = performance.now() + timeLimitSeconds * 1000;
    elements.readyOverlay.hidden = true;
    elements.resultOverlay.hidden = true;
    setFeedback("startFeedback");
    renderScene();
    renderTargets();
    renderHud();
    tickTimer();
  }

  function resetRound(keepScene) {
    if (!keepScene) {
      state.scene = state.selectedSceneId === "random"
        ? pickRandomScene()
        : pickThemeScene(state.selectedSceneId, false);
    }
    stopTimer();
    state.found = new Set();
    state.hintsLeft = maxHints;
    state.started = false;
    state.ended = false;
    state.timeLeft = timeLimitSeconds;
    state.score = 0;
    state.wrongTaps = 0;
    state.nearMisses = 0;
    state.hintTargetId = "";
    state.hintUntil = 0;
    state.revealedClues = new Set();
    state.missPings = [];
    elements.readyOverlay.hidden = false;
    elements.resultOverlay.hidden = true;
  }

  function renderScene() {
    const imageValue = `url("${state.scene.image}")`;
    preloadSceneImage(state.scene.image);
    elements.stage.style.setProperty("--scene-image", imageValue);
    elements.stage.style.setProperty("--theme-color", state.scene.color);
    elements.leftPanel.style.setProperty("--scene-image", imageValue);
    elements.rightPanel.style.setProperty("--scene-image", imageValue);
    renderMarkers();
  }

  function renderTargets() {
    elements.targetList.innerHTML = state.scene.targets.map((item, index) => {
      const isFound = state.found.has(item.id);
      const isRevealed = isFound || state.revealedClues.has(item.id);
      return `
        <li class="${isFound ? "is-found" : ""}${isRevealed ? "" : " is-locked"}">
          <span class="target-icon">${isFound ? "✓" : isRevealed ? index + 1 : "?"}</span>
          <span class="target-name">${escapeHtml(isRevealed ? label(item.labels) : t("lockedClue"))}</span>
        </li>
      `;
    }).join("");
  }

  function renderHud() {
    elements.foundValue.textContent = `${state.found.size} / ${targetCount}`;
    elements.timeValue.textContent = String(Math.max(0, Math.ceil(state.timeLeft)));
    elements.bestValue.textContent = state.best ? String(state.best) : "--";
    elements.hintButton.textContent = `${t("hint")} ${state.hintsLeft}`;
    elements.hintButton.disabled = !state.started || state.ended || state.hintsLeft <= 0;
  }

  function renderFeedback() {
    const value = t(state.feedbackKey);
    elements.feedback.textContent = typeof value === "function" ? value(...state.feedbackArgs) : value;
  }

  function renderResultCopy() {
    if (elements.resultOverlay.hidden) {
      return;
    }
    elements.resultButton.textContent = state.selectedSceneId === "random" ? t("nextRandom") : t("retry");
  }

  function renderMarkers() {
    const now = performance.now();
    state.missPings = state.missPings.filter((ping) => now - ping.born < 900);
    const foundMarkers = state.scene.targets
      .filter((item) => state.found.has(item.id))
      .map((item) => markerHtml(item, "found"));
    const hint = state.hintTargetId && state.hintUntil > now
      ? state.scene.targets.find((item) => item.id === state.hintTargetId)
      : null;
    const hintMarker = hint ? markerHtml(hint, "hint") : "";
    const missMarkers = state.missPings.map((ping) => markerHtml(ping, ping.kind));
    elements.markerLayer.innerHTML = [...foundMarkers, hintMarker, ...missMarkers].join("");
  }

  function markerHtml(item, kind) {
    return `<span class="diff-marker ${escapeHtml(kind)}" style="--x:${item.x};--y:${item.y}"></span>`;
  }

  function handleRightPanelTap(event) {
    if (!state.started || state.ended) {
      setFeedback("readyFeedback");
      return;
    }

    const point = pointerToPanel(event, elements.rightPanel);
    const hit = hitTest(point);
    if (hit?.alreadyFound) {
      addMissPing(point, "close");
      setFeedback("alreadyFound");
      renderMarkers();
      return;
    }
    if (hit?.target) {
      state.found.add(hit.target.id);
      state.revealedClues.add(hit.target.id);
      state.score += 180 + Math.ceil(state.timeLeft * 4) + state.hintsLeft * 12;
      setFeedback("foundObject", label(hit.target.labels));
      renderTargets();
      renderMarkers();
      renderHud();
      if (state.found.size >= targetCount) {
        finishGame(true);
      }
      return;
    }

    const nearest = nearestTarget(point);
    if (nearest.distance <= nearest.target.radius * 1.9) {
      state.nearMisses += 1;
      applyTimePenalty(1);
      addMissPing(point, "close");
      setFeedback("closeTap");
    } else if (nearest.distance <= nearest.target.radius * 2.7) {
      applyTimePenalty(1);
      addMissPing(point, "warm");
      setFeedback("warmTap");
    } else {
      state.wrongTaps += 1;
      applyTimePenalty(2);
      addMissPing(point, "wrong");
      setFeedback("wrongTap");
    }

    renderMarkers();
    renderHud();
    renderFeedback();
    if (state.timeLeft <= 0) {
      finishGame(false);
    }
  }

  function pointerToPanel(event, panel) {
    const rect = panel.getBoundingClientRect();
    return {
      x: clamp((event.clientX - rect.left) / rect.width, 0, 1),
      y: clamp((event.clientY - rect.top) / rect.height, 0, 1)
    };
  }

  function hitTest(point) {
    let foundHit = null;
    let targetHit = null;
    state.scene.targets.forEach((item) => {
      const distance = distanceTo(point, item);
      if (distance <= item.radius) {
        if (state.found.has(item.id)) {
          foundHit = item;
        } else {
          targetHit = item;
        }
      }
    });
    if (targetHit) {
      return { target: targetHit };
    }
    if (foundHit) {
      return { alreadyFound: true, target: foundHit };
    }
    return null;
  }

  function nearestTarget(point) {
    const remaining = state.scene.targets.filter((item) => !state.found.has(item.id));
    const pool = remaining.length ? remaining : state.scene.targets;
    return pool.reduce((best, item) => {
      const distance = distanceTo(point, item);
      return distance < best.distance ? { target: item, distance } : best;
    }, { target: pool[0], distance: Infinity });
  }

  function distanceTo(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  function addMissPing(point, kind) {
    state.missPings.push({ x: point.x, y: point.y, kind, born: performance.now() });
    window.setTimeout(renderMarkers, 920);
  }

  function applyTimePenalty(seconds) {
    state.endAt -= seconds * 1000;
    state.timeLeft = Math.max(0, (state.endAt - performance.now()) / 1000);
    updateTimedClues();
  }

  function useHint() {
    if (!state.started || state.ended) {
      setFeedback("readyFeedback");
      return;
    }
    if (state.hintsLeft <= 0) {
      setFeedback("noHint");
      return;
    }
    const remaining = state.scene.targets.filter((item) => !state.found.has(item.id));
    if (!remaining.length) {
      return;
    }
    const item = remaining[Math.floor(Math.random() * remaining.length)];
    state.hintsLeft -= 1;
    state.hintTargetId = item.id;
    state.hintUntil = performance.now() + 1800;
    state.revealedClues.add(item.id);
    setFeedback("hintObject", label(item.labels));
    renderTargets();
    renderMarkers();
    renderHud();
    window.setTimeout(renderMarkers, 1900);
  }

  function tickTimer() {
    stopTimer();
    state.timerId = window.setInterval(() => {
      if (!state.started || state.ended) {
        stopTimer();
        return;
      }
      state.timeLeft = Math.max(0, (state.endAt - performance.now()) / 1000);
      updateTimedClues();
      renderHud();
      if (state.timeLeft <= 0) {
        finishGame(false);
      }
    }, 120);
  }

  function stopTimer() {
    if (state.timerId) {
      window.clearInterval(state.timerId);
      state.timerId = 0;
    }
  }

  function finishGame(won) {
    stopTimer();
    state.ended = true;
    state.started = false;
    state.score += won ? 500 : 0;
    state.score += state.hintsLeft * 60;
    state.score -= state.wrongTaps * 30;
    state.score = Math.max(0, Math.round(state.score));
    if (state.score > state.best) {
      state.best = state.score;
      saveBest(state.best);
    }

    elements.resultTitle.textContent = won ? t("winTitle") : t("loseTitle");
    elements.resultCopy.textContent = won ? t("winCopy")(state.score) : t("loseCopy")(state.found.size);
    elements.resultBadge.textContent = resultBadge(won);
    elements.resultScore.textContent = `${t("score")} ${state.score}`;
    elements.resultFound.textContent = `${state.found.size} / ${targetCount}`;
    elements.resultButton.textContent = state.selectedSceneId === "random" ? t("nextRandom") : t("retry");
    elements.resultOverlay.hidden = false;
    renderHud();
  }

  function resultBadge(won) {
    if (!won) {
      return t("retryBadge");
    }
    if (state.wrongTaps === 0 && state.hintsLeft === maxHints) {
      return t("perfectBadge");
    }
    if (state.wrongTaps === 0) {
      return t("noMissBadge");
    }
    if (state.timeLeft >= 45) {
      return t("swiftBadge");
    }
    return t("clearBadge");
  }

  function setFeedback(key, ...args) {
    state.feedbackKey = key;
    state.feedbackArgs = args;
    renderFeedback();
  }

  function updateTimedClues() {
    if (!state.started || state.ended) {
      return;
    }
    let unlockedLabel = "";
    clueRevealTimes.forEach((time, index) => {
      const item = state.scene.targets[index];
      if (!item || state.timeLeft > time || state.revealedClues.has(item.id) || state.found.has(item.id)) {
        return;
      }
      state.revealedClues.add(item.id);
      unlockedLabel = label(item.labels);
    });
    if (unlockedLabel) {
      setFeedback("clueUnlocked", unlockedLabel);
      renderTargets();
    }
  }

  function preloadSceneImage(src) {
    const image = new Image();
    image.src = src;
  }

  function loadBest() {
    try {
      return Number(localStorage.getItem(storageKey)) || 0;
    } catch (error) {
      return 0;
    }
  }

  function saveBest(value) {
    try {
      localStorage.setItem(storageKey, String(value));
    } catch (error) {
      // Private browsing can block storage; the round still plays normally.
    }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  window.addEventListener("beforeunload", stopTimer);
})();
