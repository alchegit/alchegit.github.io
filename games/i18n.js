(() => {
  const storageKey = "preferredLocale";
  const legacyStorageKey = "preferredLanguage";
  const supportedLocales = [
    { code: "ko", nativeName: "한국어", englishName: "Korean", htmlLang: "ko" },
    { code: "en-US", nativeName: "English", englishName: "English", htmlLang: "en" },
    { code: "ja-JP", nativeName: "日本語", englishName: "Japanese", htmlLang: "ja" }
  ];

  const ui = {
    "en-US": {
      language: {
        buttonLabel: "Choose language",
        modalKicker: "Language",
        modalTitle: "Choose Language",
        modalDescription: "This game shelf currently supports Korean, English, and Japanese.",
        close: "Close language selector",
        current: "Current"
      },
      action: {
        play: "Play",
        install: "Install App",
        installShort: "Install",
        home: "home"
      },
      catalog: {
        loading: "Loading games.",
        error: "Could not load the game list.",
        empty: "No games to show.",
        previewSuffix: "pixel preview",
        likeAria: "{title} like, {count}",
        source: "Original reference",
        docs: "Source / docs"
      },
      filter: {
        all: "All",
        playable: "Playable",
        next: "Next"
      }
    },
    "ja-JP": {
      language: {
        buttonLabel: "言語を選択",
        modalKicker: "Language",
        modalTitle: "言語を選択",
        modalDescription: "このゲーム棚は現在、韓国語・英語・日本語に対応しています。",
        close: "言語選択を閉じる",
        current: "現在"
      },
      action: {
        play: "プレイ",
        install: "アプリをインストール",
        installShort: "インストール",
        home: "ホーム"
      },
      catalog: {
        loading: "ゲーム一覧を読み込んでいます。",
        error: "ゲーム一覧を読み込めませんでした。",
        empty: "表示するゲームがありません。",
        previewSuffix: "ピクセルプレビュー",
        likeAria: "{title} いいね {count}件",
        source: "原作参考",
        docs: "ソース / ドキュメント"
      },
      filter: {
        all: "すべて",
        playable: "プレイ可能",
        next: "次候補"
      }
    }
  };

  const catalogText = {
    "en-US": {
      "flame-pudding-pad-race": {
        title: "Pudding Pad Race",
        summary: "A mobile racing game where you drag a tiny pudding kart through the center gates of a cushion track."
      },
      "flame-pocket-rogue-bakery": {
        title: "Pocket Bakery Defense",
        summary: "A cute defense game where dough drops and stands hold back waves of incoming orders."
      },
      "defold-star-delivery-rocket": {
        title: "Twinkle Delivery Rocket",
        summary: "Touch the left and right sides to steer rotation and thrust, then land star mail gently."
      },
      "defold-marshmallow-sling": {
        title: "Marshmallow Sling Studio",
        summary: "Pull and release marshmallows to hit weak points and topple cookie towers with satisfying crashes."
      },
      "html5-pixel-color-garden": {
        title: "Pixel Color Garden",
        summary: "Find the one different pixel among similar color tiles and bloom a tiny color garden."
      },
      "phaser-jelly-brick-shop": {
        title: "Jelly Brick Shop",
        summary: "Drag the paddle, bounce sugar balls, and pop jelly brick combos in a candy break-out game."
      },
      "solar2d-lunchbox-tapper": {
        title: "Lunchbox Tap Tap Kitchen",
        summary: "Watch the next tray hint, tap side dishes in rhythm, and complete a cheerful lunchbox."
      },
      "love-moon-letter-runner": {
        title: "Moon Letter Runner",
        summary: "Ride moonlit platforms, collect letters, and chase high-path combos in a mobile runner."
      },
      "html5-hidden-picture-atelier": {
        title: "Hidden Difference Theme Atelier",
        summary: "Pick anime mood, landscape, medieval art, ancient, modern, or wildlife scenes and find five differences between two pictures in 90 seconds."
      },
      "released-ufo-signal-room": {
        title: "UFO Signal Room",
        summary: "Hold the UFO call signal and tap noise nodes to keep the mysterious channel stable."
      },
      "released-galacticode-cipher-lab": {
        title: "Galacticode Cipher Lab",
        summary: "Turn sentences into constellation glyphs and solve quick decoding puzzles."
      },
      "released-color-master-memory": {
        title: "Color Master Memory Challenge",
        summary: "Memorize a target color for a moment, then pick the matching color from the choices."
      },
      "released-color-master-2-spectrum-sprint": {
        title: "Color Master 2 Spectrum Sprint",
        summary: "Find the one odd tile quickly in a color grid that becomes denser each level."
      },
      "released-dark-maze-lab-run": {
        title: "Dark Maze Lab Run",
        summary: "Drag a lab rat through a narrow field of vision and search for the exit light."
      }
    },
    "ja-JP": {
      "flame-pudding-pad-race": {
        title: "プリンパッドレース",
        summary: "小さなプリンカートをドラッグして、クッションコースの中央ゲートを抜けるモバイルレースです。"
      },
      "flame-pocket-rogue-bakery": {
        title: "ポケットベーカリーディフェンス",
        summary: "生地のしずくとスタンドを配置して、押し寄せる注文ラッシュを止めるかわいい防衛ゲームです。"
      },
      "defold-star-delivery-rocket": {
        title: "くるくる星配達ロケット",
        summary: "画面の左右をタッチして回転と推進を調整し、星の手紙をやさしく着陸させます。"
      },
      "defold-marshmallow-sling": {
        title: "マシュマロシュン工房",
        summary: "マシュマロを引っぱって放ち、お菓子タワーの弱点を狙って気持ちよく崩します。"
      },
      "html5-pixel-color-garden": {
        title: "ピクセルカラーガーデン",
        summary: "似た色のタイルの中から一つだけ違うピクセルを見つけ、小さな庭を咲かせます。"
      },
      "phaser-jelly-brick-shop": {
        title: "ゼリーブロックショップ",
        summary: "パドルをドラッグして砂糖ボールを弾き、ゼリーブロックのコンボを割るブロック崩しです。"
      },
      "solar2d-lunchbox-tapper": {
        title: "お弁当タップタップキッチン",
        summary: "次のマスの予告を見ながら、おかずを順番にタップしてお弁当を完成させます。"
      },
      "love-moon-letter-runner": {
        title: "月明かりレターランナー",
        summary: "月明かりの足場を走って手紙を集め、高いルートのコンボを狙うモバイルランナーです。"
      },
      "html5-hidden-picture-atelier": {
        title: "まちがい探しテーマアトリエ",
        summary: "アニメ風、風景、中世芸術、古代、現代、動植物の絵を選び、90秒以内に2枚の絵のちがいを5つ探します。"
      },
      "released-ufo-signal-room": {
        title: "UFOシグナル待機室",
        summary: "UFO呼び出し信号を保ち、ノイズノードをタップして交信を安定させます。"
      },
      "released-galacticode-cipher-lab": {
        title: "ギャラクシーコード解読ラボ",
        summary: "文章を星座のような記号に変え、短い解読クイズに挑戦します。"
      },
      "released-color-master-memory": {
        title: "カラーマスター記憶チャレンジ",
        summary: "一瞬見た目標色を覚えて、選択肢から同じ色を選ぶ色感ミニゲームです。"
      },
      "released-color-master-2-spectrum-sprint": {
        title: "カラーマスター2 スペクトラムスプリント",
        summary: "だんだん細かくなる色グリッドから、一つだけ違うタイルを素早く見つけます。"
      },
      "released-dark-maze-lab-run": {
        title: "ダークメイズ研究所脱出",
        summary: "狭い視界の中で実験ネズミをドラッグし、出口の光を探す迷路脱出ゲームです。"
      }
    }
  };

  const tagText = {
    "en-US": {
      "released-app": "released app",
      playable: "playable",
      touch: "touch",
      html5: "HTML5",
      canvas: "canvas",
      maze: "maze",
      "dark-maze": "dark maze",
      "hidden-object": "hidden object",
      theme: "theme",
      mobile: "mobile",
      ufo: "UFO",
      galacticode: "galacticode",
      cipher: "cipher"
    },
    "ja-JP": {
      "released-app": "公開アプリ",
      playable: "プレイ可",
      touch: "タッチ",
      html5: "HTML5",
      canvas: "Canvas",
      maze: "迷路",
      "dark-maze": "ダークメイズ",
      "hidden-object": "隠し絵",
      theme: "テーマ",
      mobile: "モバイル",
      ufo: "UFO",
      galacticode: "ギャラクシーコード",
      cipher: "暗号"
    }
  };

  const text = {
    "en-US": {
      "게임 목록으로 이동": "Skip to game list",
      "게임 목록을 불러오는 중입니다.": "Loading games.",
      "게임 목록을 불러오지 못했습니다.": "Could not load the game list.",
      "표시할 게임이 없습니다.": "No games to show.",
      "NeoKIM HTML5 game shelf": "NeoKIM HTML5 game shelf",
      "Game Cabinet": "Game Cabinet",
      "Design Summary": "Design Summary",
      "NeoKIM Game Cabinet Summary": "NeoKIM Game Cabinet Summary",
      "이 문서는 설계DB를 사람이 빠르게 확인하기 위한 요약입니다. 실제 공개 카드 화면에는 원본 참조나 긴 설명을 노출하지 않습니다.": "This page is a quick human-readable summary of the design DB. The public card view does not expose original references or long planning notes.",
      "공개 유지 게임과 재미 보수": "Public Games and Fun Repairs",
      "폐쇄 및 반복 금지 기록": "Closed Games and Lessons Not to Repeat",
      "전역 원칙": "Global Rules",
      "Games": "Games",
      "Engines": "Engines",
      "Playable": "Playable",
      "home": "home",
      "플레이": "Play",
      "앱 설치": "Install App",
      "원본 참고": "Original reference",
      "소스/문서": "Source / docs",
      "새 게임": "New Game",
      "새 라운드": "New Round",
      "다시 시작": "Restart",
      "시작": "Start",
      "준비": "Ready",
      "기록": "Record",
      "점수 0": "Score 0",
      "점수 0점": "Score 0",
      "시간 0.0초": "Time 0.0s",
      "정확도 0%": "Accuracy 0%",
      "최고 콤보 0": "Best Combo 0",
      "다시 도전": "Try Again",
      "다시 찾기": "Find Again",
      "다시 해독": "Decode Again",
      "계속": "Continue",
      "처음부터": "Restart",
      "조명": "Light",
      "조명 켜기": "Turn on light",
      "닫기": "Close",
      "이전 장": "Previous page",
      "다음 장": "Next page",
      "소리 켜기": "Sound on",
      "소리 끄기": "Sound off",
      "새 정류장": "New Station",
      "새 점괘": "New Fortune",
      "새 진열": "New Display",
      "새 행진": "New Parade",
      "새 도시락": "New Lunchbox",
      "새 공방": "New Workshop",
      "새 편지길": "New Letter Run",
      "새 항로": "New Route",
      "새 배달": "New Delivery",
      "새 레이스": "New Race",
      "새 영업": "New Shift",
      "목표 색을 기억하고 보기 중 같은 색을 고르는 Color Master 기반 무제한 HTML5 미니게임입니다.": "An endless HTML5 Color Master mini game where you memorize a target color and pick the matching one.",
      "실수 3번 전까지 계속 이어지는 모바일 터치 색감 챌린지입니다.": "A mobile touch color challenge that continues until three misses.",
      "색을 보고 같은 색을 골라보세요.": "Look at the color, then pick the matching one.",
      "오늘의 색감 감각을 가볍게 깨워봅니다.": "Warm up your color sense for today.",
      "Life": "Life",
      "보기 수가 늘어납니다. 첫 느낌을 붙잡아보세요.": "More choices are coming. Hold onto your first impression.",
      "하나만 다른 타일을 탭하세요.": "Tap the single different tile.",
      "seed를 고르면 같은 문장도 다른 은하 문자로 바뀝니다.": "Pick a seed to turn the same message into different galactic glyphs.",
      "샘플": "Sample",
      "복사": "Copy",
      "대기": "Standby",
      "해독 시작": "Start Decode",
      "호출 시작": "Start Call",
      "호출 종료": "End Call",
      "다시 호출": "Call Again",
      "조용한 채널입니다.": "The channel is quiet.",
      "대기 종료": "Session Ended",
      "신호가 열렸습니다.": "The signal is open.",
      "신호 노이즈 안정화": "Stabilize signal noise",
      "노이즈가 신호를 갉아먹었습니다.": "Noise ate into the signal.",
      "브라우저가 소리를 잠시 막았습니다.": "The browser briefly blocked audio.",
      "완벽한 호출": "Perfect Call",
      "호출 성공": "Call Successful",
      "신호 손실": "Signal Lost",
      "노이즈를 거의 놓치지 않았습니다. 대기실이 아주 조용하게 빛났습니다.": "You barely missed any noise. The signal room glowed quietly.",
      "UFO 신호가 끝까지 이어졌습니다. 다음에는 더 높은 안정도를 노려보세요.": "The UFO signal held to the end. Aim for higher stability next time.",
      "직접 호출을 마쳤습니다. 누적 대기 시간은 계속 쌓입니다.": "You ended the call manually. Total waiting time keeps growing.",
      "신호가 끊겼습니다. 노이즈가 뜨면 조금 더 빠르게 탭해보세요.": "The signal dropped. Tap noise nodes a little faster next time.",
      "신호가 또렷해졌습니다.": "The signal became clearer.",
      "채널이 안정되고 있습니다.": "The channel is stabilizing.",
      "노이즈 고정.": "Noise locked.",
      "호출 기록이 저장되었습니다.": "Call record saved.",
      "다크메이즈": "Dark Maze",
      "연구소 탈출": "Lab Run",
      "어둠 속 출구 불빛을 따라": "Follow the exit light in the dark",
      "실험쥐를 천천히 이끌어 주세요.": "Guide the lab rat slowly.",
      "미로": "Maze",
      "남은 시간": "Time Left",
      "최고 기록": "Best",
      "진행 정보": "Progress",
      "어두운 연구소 미로": "Dark lab maze",
      "드래그해서 길을 찾으세요": "Drag to find the path",
      "조명은 미로마다 한 번만 켤 수 있습니다.": "You can turn on the light once per maze.",
      "미로 통과": "Maze Cleared",
      "다음 미로로 이동합니다.": "Moving to the next maze.",
      "다크메이즈 시작 웹툰": "Dark Maze opening comic",
      "시작 웹툰 보기": "View opening comic",
      "실험쥐 미로탈출 다크메이즈 Google Play에서 설치": "Install Lab Rat Maze Escape: Dark Maze on Google Play",
      "UFO 호출기 Google Play에서 설치": "Install UFO Signal Simulator on Google Play",
      "외계어 변환기 은하코드 Google Play에서 설치": "Install Alien Text Maker: Galaxy Code on Google Play",
      "색감 테스트 컬러 마스터 Google Play에서 설치": "Install Color Sense Test: Color Master on Google Play",
      "다른 색 찾기 컬러 마스터2 Google Play에서 설치": "Install Find Odd Color: Color Master 2 on Google Play",
      "하나만 다른 색을 찾는 색상 격자": "Color grid where one tile is different",
      "기억할 색상": "Color to remember",
      "색상 보기": "Color choices",
      "외계어 변환기: 은하코드": "Alien Text Maker: Galaxy Code",
      "갤럭시코드 해독 연구실": "Galacticode Cipher Lab",
      "컬러마스터 기억 챌린지": "Color Master Memory Challenge",
      "컬러마스터2 스펙트럼 스프린트": "Color Master 2 Spectrum Sprint",
      "UFO 신호 대기실": "UFO Signal Room",
      "픽셀 컬러 정원": "Pixel Color Garden",
      "푸딩 패드 레이스": "Pudding Pad Race",
      "주머니 빵집 디펜스": "Pocket Bakery Defense",
      "빙글별 배달 로켓": "Twinkle Delivery Rocket",
      "마시멜로 슝 공방": "Marshmallow Sling Studio",
      "젤리 벽돌 가게": "Jelly Brick Shop",
      "도시락 탭탭 키친": "Lunchbox Tap Tap Kitchen",
      "달빛 편지 러너": "Moon Letter Runner",
      "포근한 스위치 정류장": "Cozy Switchyard",
      "별점 모찌 상점": "Crystal Mochi Stand",
      "별사탕 행진대": "Konpeito Swarm Parade",
      "비스킷 해양 조약": "Pax Biscuitica",
      "점괘 정산": "Fortune Result",
      "분류 결과": "Sorting Result",
      "정리 결과": "Cleanup Result",
      "행진 정산": "Parade Result",
      "도시락 결과": "Lunchbox Result",
      "러닝 결과": "Run Result",
      "항로 결과": "Route Result",
      "배달 정산": "Delivery Result",
      "레이스 정산": "Race Result",
      "빵집 정산": "Bakery Result",
      "정원 정산": "Garden Result",
      "오븐 정비 시간": "Oven Tune-up",
      "스위치를 목적지 색에 맞춘 뒤 상자를 출발시키세요.": "Match the switch to the destination color, then launch the box.",
      "모찌를 길게 누른 뒤 반짝 고리에 가까울 때 놓아주세요.": "Hold the mochi, then release near the sparkling ring.",
      "손가락으로 패들을 드래그해 설탕 구슬을 튕기고 젤리 벽돌을 정리하세요.": "Drag the paddle, bounce sugar balls, and clear jelly bricks.",
      "화면을 눌러 간식 신호를 옮기고, 별사탕을 조각과 바구니로 이끌어주세요.": "Press the screen to move the snack signal and guide candies to pieces and baskets.",
      "빛나는 칸을 박자에 맞춰 탭하고, 하늘색 예고 칸으로 다음 박자를 준비하세요.": "Tap glowing cells on beat and use the blue preview cell to prepare the next beat.",
      "마시멜로를 뒤로 당긴 뒤 놓아 분홍 별표 과자 블록을 테이블 밖으로 밀어내세요.": "Pull the marshmallow back and release it to knock pink star cookie blocks off the table.",
      "탭으로 점프하고 길게 눌러 활강하세요. 높은 편지길은 MOON LINE 보너스로 이어집니다.": "Tap to jump and hold to glide. High letter routes lead to MOON LINE bonuses.",
      "노란 구간에 맞춰 생산하면 더 단단한 비스킷 함대가 출항합니다.": "Bake during the yellow zone to launch sturdier biscuit fleets.",
      "살짝 색이 다른 꽃 한 송이를 눌러주세요.": "Tap the one flower with a slightly different color.",
      "화면을 탭하거나 드래그해 움직이고, 가까운 주문 러시에는 반죽 방울이 자동 발사됩니다.": "Tap or drag to move; dough drops auto-fire at nearby order rushes.",
      "화면을 누른 채 좌우로 밀어 조향하고, 게이트 중심을 빠르게 통과해 피버를 터뜨리세요.": "Hold and slide left or right to steer, then pass gate centers quickly to trigger fever.",
      "화면 왼쪽/오른쪽은 회전, 가운데는 추진입니다. 목표 링에 부드럽게 들어가 보세요.": "Left and right rotate, center thrusts. Glide gently into the target ring.",
      "오늘 메뉴": "Today Menu",
      "스티커": "Stickers",
      "결과 카드": "Result Card",
      "친구비교": "Friend Compare",
      "스테이지": "Stage",
      "이야기": "Story",
      "기록 카드": "Record Card",
      "주간 카드": "Weekly Card",
      "기록": "Records",
      "카드": "Card",
      "비교": "Compare",
      "오늘": "Today",
      "무늬": "Pattern",
      "배치": "Arrange",
      "꾸미기": "Decorate",
      "리플레이": "Replay",
      "응원": "Cheer",
      "응원 0": "Cheer 0",
      "코드": "Code",
      "입력": "Input",
      "궤적": "Trail",
      "통통": "Bouncy",
      "무거움": "Heavy",
      "끈적": "Sticky",
      "상": "Top",
      "하": "Bottom",
      "기본": "Basic",
      "굽기": "Bake",
      "트랙": "Track",
      "맛": "Flavor",
      "프리셋": "Preset",
      "출발": "Launch",
      "앞 스위치": "Front Switch",
      "뒤 스위치": "Back Switch",
      "이전 스테이지": "Previous stage",
      "다음 스테이지": "Next stage",
      "이전 챕터": "Previous chapter",
      "다음 챕터": "Next chapter",
      "이전 맵": "Previous map",
      "다음 맵": "Next map",
      "이전 진열": "Previous display",
      "다음 진열": "Next display",
      "이전 코스": "Previous course",
      "다음 코스": "Next course",
      "이전 지역": "Previous region",
      "다음 지역": "Next region",
      "왼쪽": "Left",
      "오른쪽": "Right",
      "위": "Up",
      "아래": "Down",
      "가속": "Thrust",
      "추진": "Thrust",
      "왼쪽 회전": "Rotate left",
      "오른쪽 회전": "Rotate right",
      "정류장 챕터": "Station chapter",
      "퍼즐 맵": "Puzzle map",
      "Shop controls": "Shop controls",
      "Garden controls": "Garden controls",
      "Race controls": "Race controls",
      "Race setup": "Race setup",
      "Bakery movement controls": "Bakery movement controls",
      "Rocket controls": "Rocket controls"
    },
    "ja-JP": {
      "게임 목록으로 이동": "ゲーム一覧へ移動",
      "게임 목록을 불러오는 중입니다.": "ゲーム一覧を読み込んでいます。",
      "게임 목록을 불러오지 못했습니다.": "ゲーム一覧を読み込めませんでした。",
      "표시할 게임이 없습니다.": "表示するゲームがありません。",
      "NeoKIM HTML5 game shelf": "NeoKIM HTML5ゲーム棚",
      "Game Cabinet": "ゲームキャビネット",
      "Design Summary": "設計サマリー",
      "NeoKIM Game Cabinet Summary": "NeoKIMゲームキャビネット 設計サマリー",
      "이 문서는 설계DB를 사람이 빠르게 확인하기 위한 요약입니다. 실제 공개 카드 화면에는 원본 참조나 긴 설명을 노출하지 않습니다.": "このページは設計DBを人がすばやく確認するための要約です。公開カード画面には元ネタ参照や長い説明は表示しません。",
      "공개 유지 게임과 재미 보수": "公開継続ゲームと面白さの補修",
      "폐쇄 및 반복 금지 기록": "非公開化と繰り返し禁止の記録",
      "전역 원칙": "全体ルール",
      "Games": "ゲーム",
      "Engines": "エンジン",
      "Playable": "プレイ可能",
      "home": "ホーム",
      "플레이": "プレイ",
      "앱 설치": "アプリをインストール",
      "원본 참고": "原作参考",
      "소스/문서": "ソース / ドキュメント",
      "새 게임": "新しいゲーム",
      "새 라운드": "新しいラウンド",
      "다시 시작": "やり直し",
      "시작": "開始",
      "준비": "準備",
      "기록": "記録",
      "점수 0": "スコア 0",
      "점수 0점": "スコア 0",
      "시간 0.0초": "時間 0.0秒",
      "정확도 0%": "正確度 0%",
      "최고 콤보 0": "最高コンボ 0",
      "다시 도전": "もう一度挑戦",
      "다시 찾기": "もう一度探す",
      "다시 해독": "もう一度解読",
      "계속": "続ける",
      "처음부터": "最初から",
      "조명": "ライト",
      "조명 켜기": "ライトをつける",
      "닫기": "閉じる",
      "이전 장": "前のページ",
      "다음 장": "次のページ",
      "소리 켜기": "音をオン",
      "소리 끄기": "音をオフ",
      "새 정류장": "新しい駅",
      "새 점괘": "新しい占い",
      "새 진열": "新しい陳列",
      "새 행진": "新しい行進",
      "새 도시락": "新しいお弁当",
      "새 공방": "新しい工房",
      "새 편지길": "新しい手紙道",
      "새 항로": "新しい航路",
      "새 배달": "新しい配達",
      "새 레이스": "新しいレース",
      "새 영업": "新しい営業",
      "목표 색을 기억하고 보기 중 같은 색을 고르는 Color Master 기반 무제한 HTML5 미니게임입니다.": "目標の色を覚えて、選択肢から同じ色を選ぶColor MasterベースのエンドレスHTML5ミニゲームです。",
      "실수 3번 전까지 계속 이어지는 모바일 터치 색감 챌린지입니다.": "3回ミスするまで続く、モバイル向けタッチ色感チャレンジです。",
      "색을 보고 같은 색을 골라보세요.": "色を見て、同じ色を選んでください。",
      "오늘의 색감 감각을 가볍게 깨워봅니다.": "今日の色感を軽く目覚めさせましょう。",
      "Life": "ライフ",
      "보기 수가 늘어납니다. 첫 느낌을 붙잡아보세요.": "選択肢が増えます。最初の印象をつかんでください。",
      "하나만 다른 타일을 탭하세요.": "一つだけ違うタイルをタップしてください。",
      "seed를 고르면 같은 문장도 다른 은하 문자로 바뀝니다.": "seedを選ぶと、同じ文も別の銀河文字に変わります。",
      "샘플": "サンプル",
      "복사": "コピー",
      "대기": "待機",
      "해독 시작": "解読開始",
      "호출 시작": "呼び出し開始",
      "호출 종료": "呼び出し終了",
      "다시 호출": "もう一度呼び出す",
      "조용한 채널입니다.": "静かなチャンネルです。",
      "대기 종료": "待機終了",
      "신호가 열렸습니다.": "信号が開きました。",
      "신호 노이즈 안정화": "信号ノイズを安定化",
      "노이즈가 신호를 갉아먹었습니다.": "ノイズが信号を削りました。",
      "브라우저가 소리를 잠시 막았습니다.": "ブラウザが一時的に音をブロックしました。",
      "완벽한 호출": "完璧な呼び出し",
      "호출 성공": "呼び出し成功",
      "신호 손실": "信号ロスト",
      "노이즈를 거의 놓치지 않았습니다. 대기실이 아주 조용하게 빛났습니다.": "ノイズをほとんど逃しませんでした。待機室が静かに光りました。",
      "UFO 신호가 끝까지 이어졌습니다. 다음에는 더 높은 안정도를 노려보세요.": "UFO信号が最後まで続きました。次はさらに高い安定度を狙いましょう。",
      "직접 호출을 마쳤습니다. 누적 대기 시간은 계속 쌓입니다.": "手動で呼び出しを終了しました。累計待機時間は増え続けます。",
      "신호가 끊겼습니다. 노이즈가 뜨면 조금 더 빠르게 탭해보세요.": "信号が切れました。ノイズが出たら少し早くタップしてみましょう。",
      "신호가 또렷해졌습니다.": "信号がはっきりしました。",
      "채널이 안정되고 있습니다.": "チャンネルが安定しています。",
      "노이즈 고정.": "ノイズ固定。",
      "호출 기록이 저장되었습니다.": "呼び出し記録を保存しました。",
      "다크메이즈": "ダークメイズ",
      "연구소 탈출": "研究所脱出",
      "어둠 속 출구 불빛을 따라": "闇の中の出口の光を追って",
      "실험쥐를 천천히 이끌어 주세요.": "実験ネズミをゆっくり導いてください。",
      "미로": "迷路",
      "남은 시간": "残り時間",
      "최고 기록": "最高記録",
      "진행 정보": "進行情報",
      "어두운 연구소 미로": "暗い研究所の迷路",
      "드래그해서 길을 찾으세요": "ドラッグして道を探してください",
      "조명은 미로마다 한 번만 켤 수 있습니다.": "ライトは迷路ごとに一度だけ使えます。",
      "미로 통과": "迷路クリア",
      "다음 미로로 이동합니다.": "次の迷路へ進みます。",
      "다크메이즈 시작 웹툰": "ダークメイズ開始コミック",
      "시작 웹툰 보기": "開始コミックを見る",
      "실험쥐 미로탈출 다크메이즈 Google Play에서 설치": "実験ネズミ迷路脱出: ダークメイズをGoogle Playでインストール",
      "UFO 호출기 Google Play에서 설치": "UFOシグナルシミュレーターをGoogle Playでインストール",
      "외계어 변환기 은하코드 Google Play에서 설치": "外星語メーカー: ギャラクシーコードをGoogle Playでインストール",
      "색감 테스트 컬러 마스터 Google Play에서 설치": "色感テスト: カラーマスターをGoogle Playでインストール",
      "다른 색 찾기 컬러 마스터2 Google Play에서 설치": "違う色探し: カラーマスター2をGoogle Playでインストール",
      "하나만 다른 색을 찾는 색상 격자": "一つだけ違う色を探す色グリッド",
      "기억할 색상": "覚える色",
      "색상 보기": "色の選択肢",
      "외계어 변환기: 은하코드": "外星語メーカー: ギャラクシーコード",
      "갤럭시코드 해독 연구실": "ギャラクシーコード解読ラボ",
      "컬러마스터 기억 챌린지": "カラーマスター記憶チャレンジ",
      "컬러마스터2 스펙트럼 스프린트": "カラーマスター2 スペクトラムスプリント",
      "UFO 신호 대기실": "UFOシグナル待機室",
      "픽셀 컬러 정원": "ピクセルカラーガーデン",
      "푸딩 패드 레이스": "プリンパッドレース",
      "주머니 빵집 디펜스": "ポケットベーカリーディフェンス",
      "빙글별 배달 로켓": "くるくる星配達ロケット",
      "마시멜로 슝 공방": "マシュマロシュン工房",
      "젤리 벽돌 가게": "ゼリーブロックショップ",
      "도시락 탭탭 키친": "お弁当タップタップキッチン",
      "달빛 편지 러너": "月明かりレターランナー",
      "포근한 스위치 정류장": "ほっこりスイッチ駅",
      "별점 모찌 상점": "星占いもちショップ",
      "별사탕 행진대": "こんぺいとう行進隊",
      "비스킷 해양 조약": "ビスケット海洋条約",
      "점괘 정산": "占い結果",
      "분류 결과": "仕分け結果",
      "정리 결과": "整理結果",
      "행진 정산": "行進結果",
      "도시락 결과": "お弁当結果",
      "러닝 결과": "ラン結果",
      "항로 결과": "航路結果",
      "배달 정산": "配達結果",
      "레이스 정산": "レース結果",
      "빵집 정산": "ベーカリー結果",
      "정원 정산": "庭の結果",
      "오븐 정비 시간": "オーブン整備時間",
      "스위치를 목적지 색에 맞춘 뒤 상자를 출발시키세요.": "スイッチを目的地の色に合わせてから、箱を出発させましょう。",
      "모찌를 길게 누른 뒤 반짝 고리에 가까울 때 놓아주세요.": "もちを長押しして、光るリングに近い時に離してください。",
      "손가락으로 패들을 드래그해 설탕 구슬을 튕기고 젤리 벽돌을 정리하세요.": "指でパドルをドラッグし、砂糖ボールを弾いてゼリーブロックを片付けましょう。",
      "화면을 눌러 간식 신호를 옮기고, 별사탕을 조각과 바구니로 이끌어주세요.": "画面を押しておやつ信号を動かし、こんぺいとうを欠片とバスケットへ導きましょう。",
      "빛나는 칸을 박자에 맞춰 탭하고, 하늘색 예고 칸으로 다음 박자를 준비하세요.": "光るマスをリズムに合わせてタップし、水色の予告マスで次の拍を準備しましょう。",
      "마시멜로를 뒤로 당긴 뒤 놓아 분홍 별표 과자 블록을 테이블 밖으로 밀어내세요.": "マシュマロを後ろへ引いて離し、ピンクの星印クッキーブロックをテーブルの外へ押し出しましょう。",
      "탭으로 점프하고 길게 눌러 활강하세요. 높은 편지길은 MOON LINE 보너스로 이어집니다.": "タップでジャンプ、長押しで滑空。高い手紙道はMOON LINEボーナスにつながります。",
      "노란 구간에 맞춰 생산하면 더 단단한 비스킷 함대가 출항합니다.": "黄色い区間に合わせて焼くと、より頑丈なビスケット艦隊が出航します。",
      "살짝 색이 다른 꽃 한 송이를 눌러주세요.": "少しだけ色が違う花を一つタップしてください。",
      "화면을 탭하거나 드래그해 움직이고, 가까운 주문 러시에는 반죽 방울이 자동 발사됩니다.": "画面をタップまたはドラッグして動き、近い注文ラッシュには生地のしずくが自動発射されます。",
      "화면을 누른 채 좌우로 밀어 조향하고, 게이트 중심을 빠르게 통과해 피버를 터뜨리세요.": "画面を押したまま左右に動かして操縦し、ゲート中央を素早く通過してフィーバーを起こしましょう。",
      "화면 왼쪽/오른쪽은 회전, 가운데는 추진입니다. 목표 링에 부드럽게 들어가 보세요.": "画面の左/右は回転、中央は推進です。目標リングへやさしく入りましょう。",
      "오늘 메뉴": "今日のメニュー",
      "스티커": "ステッカー",
      "결과 카드": "結果カード",
      "친구비교": "友達比較",
      "스테이지": "ステージ",
      "이야기": "ストーリー",
      "기록 카드": "記録カード",
      "주간 카드": "週間カード",
      "기록": "記録",
      "카드": "カード",
      "비교": "比較",
      "오늘": "今日",
      "무늬": "模様",
      "배치": "配置",
      "꾸미기": "飾る",
      "리플레이": "リプレイ",
      "응원": "応援",
      "응원 0": "応援 0",
      "코드": "コード",
      "입력": "入力",
      "궤적": "軌跡",
      "통통": "弾む",
      "무거움": "重い",
      "끈적": "ねばねば",
      "상": "上",
      "하": "下",
      "기본": "基本",
      "굽기": "焼く",
      "트랙": "コース",
      "맛": "味",
      "프리셋": "プリセット",
      "출발": "出発",
      "앞 스위치": "前スイッチ",
      "뒤 스위치": "後ろスイッチ",
      "이전 스테이지": "前のステージ",
      "다음 스테이지": "次のステージ",
      "이전 챕터": "前のチャプター",
      "다음 챕터": "次のチャプター",
      "이전 맵": "前のマップ",
      "다음 맵": "次のマップ",
      "이전 진열": "前の陳列",
      "다음 진열": "次の陳列",
      "이전 코스": "前のコース",
      "다음 코스": "次のコース",
      "이전 지역": "前の地域",
      "다음 지역": "次の地域",
      "왼쪽": "左",
      "오른쪽": "右",
      "위": "上",
      "아래": "下",
      "가속": "加速",
      "추진": "推進",
      "왼쪽 회전": "左回転",
      "오른쪽 회전": "右回転",
      "정류장 챕터": "駅チャプター",
      "퍼즐 맵": "パズルマップ",
      "Shop controls": "ショップ操作",
      "Garden controls": "庭の操作",
      "Race controls": "レース操作",
      "Race setup": "レース設定",
      "Bakery movement controls": "ベーカリー移動操作",
      "Rocket controls": "ロケット操作"
    }
  };

  const regexRules = {
    "en-US": [
      [/^시간 ([\d.]+)초$/, "Time $1s"],
      [/^등급 (.+)$/, "Grade $1"],
      [/^누적 (.+)$/, "Total $1"],
      [/^레벨 (\d+)$/, "Level $1"],
      [/^라운드 (\d+)$/, "Round $1"],
      [/^(\d+)라운드 생존$/, "Survived $1 rounds"],
      [/^점수 ([\d,]+)$/, "Score $1"],
      [/^정확도 (\d+)%$/, "Accuracy $1%"],
      [/^최고 콤보 (\d+)$/, "Best Combo $1"],
      [/^최고 연속 (\d+)$/, "Best Streak $1"],
      [/^시간이 지났습니다\. 하트 (\d+)개 남았습니다\.$/, "Time ran out. $1 hearts left."],
      [/^조금 달랐습니다\. 하트 (\d+)개 남았습니다\.$/, "A little off. $1 hearts left."],
      [/^(\d+)라운드까지 버텼습니다\. 이번 기록은 ([\d,]+)점입니다\.$/, "You lasted $1 rounds. Your score is $2."],
      [/^(\d+)라운드 생존, ([\d,]+)점입니다\. 조금만 더 이어가면 최고 기록도 보입니다\.$/, "Survived $1 rounds with $2 points. Keep going a little longer and your best is in reach."],
      [/^(\d+)라운드 생존, ([\d,]+)점입니다\. 첫 색을 조금 더 오래 붙잡아보세요\.$/, "Survived $1 rounds with $2 points. Hold onto the first color a little longer."],
      [/^이번 기록은 ([\d,]+)점입니다\. 손끝 감각이 제법 반짝였습니다\.$/, "Your score is $1. Your fingertip sense sparkled nicely."],
      [/^이번 기록은 ([\d,]+)점입니다\. 조금만 더 빠르면 최고 기록도 보입니다\.$/, "Your score is $1. A little faster and your best record is in reach."],
      [/^이번 기록은 ([\d,]+)점입니다\. 첫 색을 조금 더 오래 붙잡아보세요\.$/, "Your score is $1. Hold onto the first color a little longer."],
      [/^(.+) 좋아요 (\d+)개$/, "$1 likes $2"]
    ],
    "ja-JP": [
      [/^시간 ([\d.]+)초$/, "時間 $1秒"],
      [/^등급 (.+)$/, "ランク $1"],
      [/^누적 (.+)$/, "累計 $1"],
      [/^레벨 (\d+)$/, "レベル $1"],
      [/^라운드 (\d+)$/, "ラウンド $1"],
      [/^(\d+)라운드 생존$/, "$1ラウンド生存"],
      [/^점수 ([\d,]+)$/, "スコア $1"],
      [/^정확도 (\d+)%$/, "正確度 $1%"],
      [/^최고 콤보 (\d+)$/, "最高コンボ $1"],
      [/^최고 연속 (\d+)$/, "最高連続 $1"],
      [/^시간이 지났습니다\. 하트 (\d+)개 남았습니다\.$/, "時間切れです。ハートは残り$1個です。"],
      [/^조금 달랐습니다\. 하트 (\d+)개 남았습니다\.$/, "少し違いました。ハートは残り$1個です。"],
      [/^(\d+)라운드까지 버텼습니다\. 이번 기록은 ([\d,]+)점입니다\.$/, "$1ラウンドまで耐えました。今回の記録は$2点です。"],
      [/^(\d+)라운드 생존, ([\d,]+)점입니다\. 조금만 더 이어가면 최고 기록도 보입니다\.$/, "$1ラウンド生存、$2点です。もう少し続けば最高記録も見えてきます。"],
      [/^(\d+)라운드 생존, ([\d,]+)점입니다\. 첫 색을 조금 더 오래 붙잡아보세요\.$/, "$1ラウンド生存、$2点です。最初の色をもう少し長く覚えてみましょう。"],
      [/^이번 기록은 ([\d,]+)점입니다\. 손끝 감각이 제법 반짝였습니다\.$/, "今回の記録は$1点です。指先の感覚がかなり輝いていました。"],
      [/^이번 기록은 ([\d,]+)점입니다\. 조금만 더 빠르면 최고 기록도 보입니다\.$/, "今回の記録は$1点です。もう少し速ければ最高記録も見えてきます。"],
      [/^이번 기록은 ([\d,]+)점입니다\. 첫 색을 조금 더 오래 붙잡아보세요\.$/, "今回の記録は$1点です。最初の色をもう少し長く覚えてみましょう。"],
      [/^(.+) 좋아요 (\d+)개$/, "$1 いいね $2件"]
    ]
  };

  let currentLocale = normalizeLocale(new URLSearchParams(window.location.search).get("lang"))
    || normalizeLocale(safeLocalStorageGet(storageKey))
    || normalizeLocale(safeLocalStorageGet(legacyStorageKey))
    || normalizeLocale(navigator.language)
    || "ko";

  const textNodeSources = new WeakMap();
  const attrSources = new WeakMap();
  let observer = null;
  let isTranslating = false;

  function normalizeLocale(locale) {
    if (!locale) {
      return "";
    }
    const value = String(locale).trim();
    if (value === "ko" || value.toLowerCase().startsWith("ko")) {
      return "ko";
    }
    if (value === "ja-JP" || value.toLowerCase().startsWith("ja")) {
      return "ja-JP";
    }
    if (value === "en-US" || value.toLowerCase().startsWith("en")) {
      return "en-US";
    }
    return "";
  }

  function safeLocalStorageGet(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      return "";
    }
  }

  function safeLocalStorageSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      // Ignore private-mode storage failures.
    }
  }

  function getLocaleMeta(localeCode = currentLocale) {
    return supportedLocales.find((locale) => locale.code === localeCode) || supportedLocales[0];
  }

  function getNested(bundle, key) {
    return key.split(".").reduce((node, part) => (node && Object.prototype.hasOwnProperty.call(node, part) ? node[part] : undefined), bundle);
  }

  function t(key, fallback = key) {
    if (currentLocale === "ko") {
      return fallback;
    }
    const translated = getNested(ui[currentLocale], key);
    return typeof translated === "string" ? translated : fallback;
  }

  function translateGameText(gameId, field, fallback) {
    if (currentLocale === "ko") {
      return fallback;
    }
    return catalogText[currentLocale]?.[gameId]?.[field] || fallback;
  }

  function translateTag(tag) {
    if (currentLocale === "ko") {
      return tag;
    }
    return tagText[currentLocale]?.[tag] || tag;
  }

  function translateText(source) {
    const raw = String(source ?? "");
    if (currentLocale === "ko") {
      return raw;
    }

    const trimmed = raw.trim();
    if (!trimmed) {
      return raw;
    }

    const exact = text[currentLocale]?.[trimmed];
    if (exact) {
      return raw.replace(trimmed, exact);
    }

    const separated = translateSeparatedText(trimmed);
    if (separated && separated !== trimmed) {
      return raw.replace(trimmed, separated);
    }

    for (const [pattern, replacement] of regexRules[currentLocale] || []) {
      if (pattern.test(trimmed)) {
        return raw.replace(trimmed, trimmed.replace(pattern, replacement));
      }
    }

    return raw;
  }

  function translateSeparatedText(value) {
    if (!value.includes(" | ")) {
      return null;
    }

    let changed = false;
    const translatedParts = value.split(" | ").map((part) => {
      const translated = text[currentLocale]?.[part] || part;
      if (translated !== part) {
        changed = true;
      }
      return translated;
    });

    if (!changed) {
      return null;
    }

    const compactParts = [];
    translatedParts.forEach((part) => {
      if (!compactParts.includes(part)) {
        compactParts.push(part);
      }
    });

    return compactParts.join(" | ");
  }

  function formatLikeLabel(title, count) {
    if (currentLocale === "ko") {
      return `${title} 좋아요 ${count}개`;
    }
    return t("catalog.likeAria", "{title} like, {count}").replace("{title}", title).replace("{count}", String(count));
  }

  function setLocale(localeCode) {
    const normalized = normalizeLocale(localeCode) || "ko";
    currentLocale = normalized;
    safeLocalStorageSet(storageKey, normalized);
    updateUrlLocale(normalized);
    updateDocumentLanguage();
    renderLanguageControls();
    translateDom(document.body);
    window.dispatchEvent(new CustomEvent("neokim:games-localechange", { detail: { locale: currentLocale } }));
  }

  function updateUrlLocale(localeCode) {
    const url = new URL(window.location.href);
    if (localeCode === "ko") {
      url.searchParams.delete("lang");
    } else {
      url.searchParams.set("lang", localeCode);
    }
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function updateDocumentLanguage() {
    const locale = getLocaleMeta();
    document.documentElement.lang = locale.htmlLang;
  }

  function init() {
    updateDocumentLanguage();
    ensureLanguageInterface();
    renderLanguageControls();
    translateDom(document.body);
    observeTranslations();
  }

  function ensureLanguageInterface() {
    if (document.querySelector("[data-games-language-trigger]")) {
      return;
    }

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "games-language-trigger";
    trigger.dataset.gamesLanguageTrigger = "true";
    trigger.innerHTML = `<span aria-hidden="true">LANG</span><span data-games-current-language></span>`;
    trigger.addEventListener("click", openLanguageModal);

    const topbarNav = document.querySelector(".topbar-nav");
    const topbarActions = document.querySelector(".topbar-actions");
    const titleBlock = document.querySelector(".game-header .title-block");

    if (topbarNav) {
      topbarNav.appendChild(trigger);
    } else if (topbarActions) {
      const homeLink = topbarActions.querySelector(".home-link");
      topbarActions.insertBefore(trigger, homeLink || null);
    } else if (titleBlock) {
      titleBlock.appendChild(trigger);
    } else {
      trigger.classList.add("games-i18n-floating");
      document.body.appendChild(trigger);
    }

    if (!document.getElementById("gamesLanguageModal")) {
      const modal = document.createElement("div");
      modal.id = "gamesLanguageModal";
      modal.className = "games-language-modal";
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      modal.setAttribute("aria-labelledby", "gamesLanguageModalTitle");
      modal.hidden = true;
      modal.innerHTML = `
        <div class="games-language-modal__backdrop" data-games-language-close></div>
        <section class="games-language-modal__sheet">
          <header class="games-language-modal__top">
            <div>
              <p class="games-language-modal__kicker" data-games-modal-kicker></p>
              <h2 id="gamesLanguageModalTitle" class="games-language-modal__title" data-games-modal-title></h2>
            </div>
            <button type="button" class="games-language-close" data-games-language-close>&times;</button>
          </header>
          <p class="games-language-modal__description" data-games-modal-description></p>
          <div class="games-language-list" data-games-language-list></div>
        </section>
      `;
      modal.addEventListener("click", (event) => {
        if (event.target.closest("[data-games-language-close]")) {
          closeLanguageModal();
        }
      });
      document.body.appendChild(modal);
    }

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeLanguageModal();
      }
    });
  }

  function renderLanguageControls() {
    const locale = getLocaleMeta();
    document.querySelectorAll("[data-games-current-language]").forEach((element) => {
      element.textContent = locale.nativeName;
    });
    document.querySelectorAll("[data-games-language-trigger]").forEach((button) => {
      const label = `${t("language.buttonLabel", "언어 선택")}: ${locale.nativeName}`;
      if (button.getAttribute("aria-label") !== label) {
        button.setAttribute("aria-label", label);
      }
    });

    const modal = document.getElementById("gamesLanguageModal");
    if (!modal) {
      return;
    }

    modal.querySelector("[data-games-modal-kicker]").textContent = t("language.modalKicker", "Language");
    modal.querySelector("[data-games-modal-title]").textContent = t("language.modalTitle", "언어 선택");
    modal.querySelector("[data-games-modal-description]").textContent = t("language.modalDescription", "한국어, 영어, 일본어를 지원합니다.");
    modal.querySelector(".games-language-close").setAttribute("aria-label", t("language.close", "닫기"));

    const list = modal.querySelector("[data-games-language-list]");
    list.innerHTML = supportedLocales.map((language) => {
      const isCurrent = language.code === currentLocale;
      return `
        <button type="button" class="games-language-option${isCurrent ? " is-current" : ""}" data-games-locale="${language.code}" aria-current="${isCurrent ? "true" : "false"}">
          <span>
            <span class="games-language-option__native">${escapeHtml(language.nativeName)}</span>
            <span class="games-language-option__meta">${escapeHtml(language.englishName)} · ${escapeHtml(language.code)}</span>
          </span>
          <span class="games-language-option__check" aria-hidden="true">✓</span>
        </button>
      `;
    }).join("");

    list.querySelectorAll("[data-games-locale]").forEach((button) => {
      button.addEventListener("click", () => {
        setLocale(button.dataset.gamesLocale);
        closeLanguageModal();
      });
    });
  }

  function openLanguageModal() {
    const modal = document.getElementById("gamesLanguageModal");
    if (!modal) {
      return;
    }
    renderLanguageControls();
    modal.hidden = false;
    document.body.classList.add("games-language-modal-open");
    modal.querySelector("[data-games-locale]")?.focus();
  }

  function closeLanguageModal() {
    const modal = document.getElementById("gamesLanguageModal");
    if (!modal || modal.hidden) {
      return;
    }
    modal.hidden = true;
    document.body.classList.remove("games-language-modal-open");
    document.querySelector("[data-games-language-trigger]")?.focus();
  }

  function translateDom(root = document.body) {
    if (!root || isTranslating) {
      return;
    }
    isTranslating = true;
    try {
      translateTitleAndMeta();
      translateTextNodes(root);
      translateAttributes(root);
      renderLanguageControls();
    } finally {
      isTranslating = false;
    }
  }

  function translateTitleAndMeta() {
    if (!document.documentElement.dataset.gamesOriginalTitle) {
      document.documentElement.dataset.gamesOriginalTitle = document.title;
    }
    document.title = translateText(document.documentElement.dataset.gamesOriginalTitle);

    document.querySelectorAll("meta[name='description'], meta[property='og:title'], meta[property='og:description'], meta[name='twitter:title'], meta[name='twitter:description']").forEach((element) => {
      if (!element.dataset.gamesOriginalContent) {
        element.dataset.gamesOriginalContent = element.getAttribute("content") || "";
      }
      element.setAttribute("content", translateText(element.dataset.gamesOriginalContent));
    });
  }

  function translateTextNodes(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
        const parent = node.parentElement;
        if (!parent || parent.closest("script, style, noscript, template, textarea, [data-games-i18n-ignore], .games-language-modal")) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) {
      nodes.push(walker.currentNode);
    }

    nodes.forEach((node) => {
      if (!textNodeSources.has(node)) {
        textNodeSources.set(node, node.nodeValue);
      }
      const translated = translateText(textNodeSources.get(node));
      if (node.nodeValue !== translated) {
        node.nodeValue = translated;
      }
    });
  }

  function translateAttributes(root) {
    const attrs = ["aria-label", "alt", "title", "placeholder"];
    const elements = root.nodeType === Node.ELEMENT_NODE ? [root, ...root.querySelectorAll("*")] : [...document.querySelectorAll("*")];
    elements.forEach((element) => {
      if (element.closest?.("[data-games-i18n-ignore], .games-language-modal")) {
        return;
      }
      attrs.forEach((attr) => {
        if (!element.hasAttribute(attr)) {
          return;
        }
        let map = attrSources.get(element);
        if (!map) {
          map = {};
          attrSources.set(element, map);
        }
        if (!Object.prototype.hasOwnProperty.call(map, attr)) {
          map[attr] = element.getAttribute(attr) || "";
        }
        const translated = translateText(map[attr]);
        if (element.getAttribute(attr) !== translated) {
          element.setAttribute(attr, translated);
        }
      });
    });
  }

  function observeTranslations() {
    if (observer || !("MutationObserver" in window)) {
      return;
    }
    observer = new MutationObserver((mutations) => {
      if (isTranslating) {
        return;
      }
      const shouldTranslate = mutations.some((mutation) => mutation.type === "childList" || mutation.type === "characterData" || mutation.type === "attributes");
      if (!shouldTranslate) {
        return;
      }
      window.requestAnimationFrame(() => translateDom(document.body));
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["aria-label", "alt", "title", "placeholder"]
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  window.NEOKIM_GAMES_I18N = {
    getLocale: () => currentLocale,
    setLocale,
    t,
    text: translateText,
    gameText: translateGameText,
    tag: translateTag,
    formatLikeLabel,
    translateDom
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
