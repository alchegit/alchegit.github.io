window.NEOKIM_I18N = (() => {
  const defaultLocale = "en-US";
  const storageKey = "preferredLocale";
  const legacyStorageKey = "preferredLanguage";
  const recommendedLocales = ["ko", "en-US", "ja-JP", "zh-CN", "zh-TW", "es-ES", "fr-FR", "de-DE", "pt-BR"];
  const baseFallbacks = {
    en: "en-US",
    es: "es-419",
    fr: "fr-FR",
    pt: "pt-BR",
    zh: "zh-CN",
    ko: "ko",
    ja: "ja-JP",
    de: "de-DE",
    fa: "fa",
    ms: "ms"
  };

  const locales = [
    { code: "ko", nativeName: "한국어", englishName: "Korean", regionGroup: "Asia", rtl: false },
    { code: "en-US", nativeName: "English", englishName: "English", regionGroup: "Other", rtl: false },
    { code: "gl-ES", nativeName: "Galego", englishName: "Galician", regionGroup: "Europe", rtl: false },
    { code: "gu", nativeName: "ગુજરાતી", englishName: "Gujarati", regionGroup: "Asia", rtl: false },
    { code: "el-GR", nativeName: "Ελληνικά", englishName: "Greek", regionGroup: "Europe", rtl: false },
    { code: "nl-NL", nativeName: "Nederlands", englishName: "Dutch", regionGroup: "Europe", rtl: false },
    { code: "ne-NP", nativeName: "नेपाली", englishName: "Nepali", regionGroup: "Asia", rtl: false },
    { code: "no-NO", nativeName: "Norsk", englishName: "Norwegian", regionGroup: "Europe", rtl: false },
    { code: "da-DK", nativeName: "Dansk", englishName: "Danish", regionGroup: "Europe", rtl: false },
    { code: "de-DE", nativeName: "Deutsch", englishName: "German", regionGroup: "Europe", rtl: false },
    { code: "lo-LA", nativeName: "ລາວ", englishName: "Lao", regionGroup: "Asia", rtl: false },
    { code: "lv", nativeName: "Latviešu", englishName: "Latvian", regionGroup: "Europe", rtl: false },
    { code: "ru-RU", nativeName: "Русский", englishName: "Russian", regionGroup: "Europe", rtl: false },
    { code: "rm", nativeName: "Rumantsch", englishName: "Romansh", regionGroup: "Europe", rtl: false },
    { code: "ro", nativeName: "Română", englishName: "Romanian", regionGroup: "Europe", rtl: false },
    { code: "lt", nativeName: "Lietuvių", englishName: "Lithuanian", regionGroup: "Europe", rtl: false },
    { code: "mr-IN", nativeName: "मराठी", englishName: "Marathi", regionGroup: "Asia", rtl: false },
    { code: "mk-MK", nativeName: "Македонски", englishName: "Macedonian", regionGroup: "Europe", rtl: false },
    { code: "ml-IN", nativeName: "മലയാളം", englishName: "Malayalam", regionGroup: "Asia", rtl: false },
    { code: "ms", nativeName: "Bahasa Melayu", englishName: "Malay", regionGroup: "Asia", rtl: false },
    { code: "ms-MY", nativeName: "Bahasa Melayu (Malaysia)", englishName: "Malay (Malaysia)", regionGroup: "Asia", rtl: false, fallback: "ms" },
    { code: "mn-MN", nativeName: "Монгол", englishName: "Mongolian", regionGroup: "Asia", rtl: false },
    { code: "eu-ES", nativeName: "Euskara", englishName: "Basque", regionGroup: "Europe", rtl: false },
    { code: "my-MM", nativeName: "မြန်မာ", englishName: "Burmese", regionGroup: "Asia", rtl: false },
    { code: "vi", nativeName: "Tiếng Việt", englishName: "Vietnamese", regionGroup: "Asia", rtl: false },
    { code: "be", nativeName: "Беларуская", englishName: "Belarusian", regionGroup: "Europe", rtl: false },
    { code: "bn-BD", nativeName: "বাংলা", englishName: "Bengali", regionGroup: "Asia", rtl: false },
    { code: "bg", nativeName: "Български", englishName: "Bulgarian", regionGroup: "Europe", rtl: false },
    { code: "sr", nativeName: "Српски", englishName: "Serbian", regionGroup: "Europe", rtl: false },
    { code: "sw", nativeName: "Kiswahili", englishName: "Swahili", regionGroup: "Africa", rtl: false },
    { code: "sv-SE", nativeName: "Svenska", englishName: "Swedish", regionGroup: "Europe", rtl: false },
    { code: "es-419", nativeName: "Español (Latinoamérica)", englishName: "Spanish (Latin America)", regionGroup: "Other", rtl: false },
    { code: "es-US", nativeName: "Español (EE. UU.)", englishName: "Spanish (United States)", regionGroup: "Other", rtl: false, fallback: "es-419" },
    { code: "es-ES", nativeName: "Español (España)", englishName: "Spanish (Spain)", regionGroup: "Europe", rtl: false },
    { code: "sk", nativeName: "Slovenčina", englishName: "Slovak", regionGroup: "Europe", rtl: false },
    { code: "sl", nativeName: "Slovenščina", englishName: "Slovenian", regionGroup: "Europe", rtl: false },
    { code: "si-LK", nativeName: "සිංහල", englishName: "Sinhala", regionGroup: "Asia", rtl: false },
    { code: "ar", nativeName: "العربية", englishName: "Arabic", regionGroup: "Middle East", rtl: true },
    { code: "hy-AM", nativeName: "Հայերեն", englishName: "Armenian", regionGroup: "Asia", rtl: false },
    { code: "is-IS", nativeName: "Íslenska", englishName: "Icelandic", regionGroup: "Europe", rtl: false },
    { code: "az-AZ", nativeName: "Azərbaycanca", englishName: "Azerbaijani", regionGroup: "Asia", rtl: false },
    { code: "af", nativeName: "Afrikaans", englishName: "Afrikaans", regionGroup: "Africa", rtl: false },
    { code: "sq", nativeName: "Shqip", englishName: "Albanian", regionGroup: "Europe", rtl: false },
    { code: "am", nativeName: "አማርኛ", englishName: "Amharic", regionGroup: "Africa", rtl: false },
    { code: "et", nativeName: "Eesti", englishName: "Estonian", regionGroup: "Europe", rtl: false },
    { code: "en-IN", nativeName: "English (India)", englishName: "English (India)", regionGroup: "Asia", rtl: false, fallback: "en-US" },
    { code: "en-SG", nativeName: "English (Singapore)", englishName: "English (Singapore)", regionGroup: "Asia", rtl: false, fallback: "en-US" },
    { code: "en-ZA", nativeName: "English (South Africa)", englishName: "English (South Africa)", regionGroup: "Africa", rtl: false, fallback: "en-US" },
    { code: "en-GB", nativeName: "English (UK)", englishName: "English (United Kingdom)", regionGroup: "Europe", rtl: false, fallback: "en-US" },
    { code: "en-AU", nativeName: "English (Australia)", englishName: "English (Australia)", regionGroup: "Other", rtl: false, fallback: "en-US" },
    { code: "en-CA", nativeName: "English (Canada)", englishName: "English (Canada)", regionGroup: "Other", rtl: false, fallback: "en-US" },
    { code: "ur", nativeName: "اردو", englishName: "Urdu", regionGroup: "Middle East", rtl: true },
    { code: "uk", nativeName: "Українська", englishName: "Ukrainian", regionGroup: "Europe", rtl: false },
    { code: "it-IT", nativeName: "Italiano", englishName: "Italian", regionGroup: "Europe", rtl: false },
    { code: "id", nativeName: "Bahasa Indonesia", englishName: "Indonesian", regionGroup: "Asia", rtl: false },
    { code: "ja-JP", nativeName: "日本語", englishName: "Japanese", regionGroup: "Asia", rtl: false },
    { code: "ka-GE", nativeName: "ქართული", englishName: "Georgian", regionGroup: "Asia", rtl: false },
    { code: "zu", nativeName: "IsiZulu", englishName: "Zulu", regionGroup: "Africa", rtl: false },
    { code: "zh-CN", nativeName: "简体中文", englishName: "Chinese (Simplified)", regionGroup: "Asia", rtl: false },
    { code: "zh-TW", nativeName: "繁體中文", englishName: "Chinese (Traditional Taiwan)", regionGroup: "Asia", rtl: false },
    { code: "zh-HK", nativeName: "繁體中文（香港）", englishName: "Chinese (Traditional Hong Kong)", regionGroup: "Asia", rtl: false },
    { code: "cs-CZ", nativeName: "Čeština", englishName: "Czech", regionGroup: "Europe", rtl: false },
    { code: "kk", nativeName: "Қазақ", englishName: "Kazakh", regionGroup: "Asia", rtl: false },
    { code: "ca", nativeName: "Català", englishName: "Catalan", regionGroup: "Europe", rtl: false },
    { code: "kn-IN", nativeName: "ಕನ್ನಡ", englishName: "Kannada", regionGroup: "Asia", rtl: false },
    { code: "hr", nativeName: "Hrvatski", englishName: "Croatian", regionGroup: "Europe", rtl: false },
    { code: "km-KH", nativeName: "ខ្មែរ", englishName: "Khmer", regionGroup: "Asia", rtl: false },
    { code: "ky-KG", nativeName: "Кыргызча", englishName: "Kyrgyz", regionGroup: "Asia", rtl: false },
    { code: "ta-IN", nativeName: "தமிழ்", englishName: "Tamil", regionGroup: "Asia", rtl: false },
    { code: "th", nativeName: "ไทย", englishName: "Thai", regionGroup: "Asia", rtl: false },
    { code: "te-IN", nativeName: "తెలుగు", englishName: "Telugu", regionGroup: "Asia", rtl: false },
    { code: "tr-TR", nativeName: "Türkçe", englishName: "Turkish", regionGroup: "Europe", rtl: false },
    { code: "pa", nativeName: "ਪੰਜਾਬੀ", englishName: "Punjabi", regionGroup: "Asia", rtl: false },
    { code: "fa", nativeName: "فارسی", englishName: "Persian", regionGroup: "Middle East", rtl: true },
    { code: "fa-AE", nativeName: "فارسی (امارات)", englishName: "Persian (UAE)", regionGroup: "Middle East", rtl: true, fallback: "fa" },
    { code: "fa-AF", nativeName: "دری", englishName: "Persian (Afghanistan)", regionGroup: "Middle East", rtl: true, fallback: "fa" },
    { code: "fa-IR", nativeName: "فارسی (ایران)", englishName: "Persian (Iran)", regionGroup: "Middle East", rtl: true, fallback: "fa" },
    { code: "pt-BR", nativeName: "Português (Brasil)", englishName: "Portuguese (Brazil)", regionGroup: "Other", rtl: false },
    { code: "pt-PT", nativeName: "Português (Portugal)", englishName: "Portuguese (Portugal)", regionGroup: "Europe", rtl: false },
    { code: "pl-PL", nativeName: "Polski", englishName: "Polish", regionGroup: "Europe", rtl: false },
    { code: "fr-CA", nativeName: "Français (Canada)", englishName: "French (Canada)", regionGroup: "Other", rtl: false, fallback: "fr-FR" },
    { code: "fr-FR", nativeName: "Français", englishName: "French", regionGroup: "Europe", rtl: false },
    { code: "fi-FI", nativeName: "Suomi", englishName: "Finnish", regionGroup: "Europe", rtl: false },
    { code: "fil", nativeName: "Filipino", englishName: "Filipino", regionGroup: "Asia", rtl: false },
    { code: "hu-HU", nativeName: "Magyar", englishName: "Hungarian", regionGroup: "Europe", rtl: false },
    { code: "iw-IL", nativeName: "עברית", englishName: "Hebrew", regionGroup: "Middle East", rtl: true },
    { code: "hi-IN", nativeName: "हिन्दी", englishName: "Hindi", regionGroup: "Asia", rtl: false }
  ];

  const translations = {
    "en-US": {
      seo: {
        title: "NeoKIM App Lab | Free Android Mini Apps",
        description: "Install or try private tests for Color Master 2, Galacticode, Call the UFO, Lucky Card Random Defense, and more Android mini apps.",
        ogTitle: "NeoKIM App Lab | Android Mini Apps",
        ogDescription: "Color challenges, alien-like secret messages, UFO calling experiences, and private tests for quick Android fun."
      },
      skip: {
        apps: "Skip to app list"
      },
      nav: {
        featured: "Featured",
        apps: "Apps",
        faq: "FAQ"
      },
      language: {
        buttonLabel: "Choose language",
        modalTitle: "Choose Language",
        modalDescription: "Search by language name, native name, or locale code.",
        searchLabel: "Search languages",
        searchPlaceholder: "Search: korean, 한국어, ko, japanese, 日本語, ja",
        close: "Close language selector",
        recommended: "Recommended languages",
        asia: "Asia",
        europe: "Europe",
        middleEast: "Middle East",
        africa: "Africa",
        other: "Other",
        noResults: "No languages found.",
        current: "Current language",
        availableHint: "Available in 85+ languages",
        supportedTitle: "Supported languages",
        supportedSummary: "Supported languages",
        supportedDescription: "The site can display more than 85 locales. Locales without dedicated copy currently fall back to English.",
        fallbackNotice: "Some locales use English fallback until full translations are added."
      },
      hero: {
        eyebrow: "Android mini app collection",
        title: "NeoKIM App Lab",
        subtitle: "Small Android apps made for quick fun and sharing",
        description: "Color challenges, alien-like secret messages, and UFO calling experiences. Install lightly. Enjoy in under a minute.",
        primaryCta: "Install Featured App",
        primaryAria: "Install Color Master 2 on Google Play",
        secondaryCta: "Browse Apps",
        visualAria: "Phone mockup with Color Master 2 icon and color tiles",
        badges: ["Free Apps", "Android", "No Sign-up Required", "Made by NeoKIM"]
      },
      featured: {
        kicker: "FEATURED APP",
        title: "Install This First Today",
        badge: "Featured",
        appName: "Color Master 2",
        short: "Find the different color in 10 seconds.",
        description: "A one-life color puzzle where one mistake ends the run. It starts fast, then keeps pulling you back to beat your record.",
        primaryCta: "Install on Google Play",
        primaryAria: "Install Color Master 2 on Google Play",
        secondaryCta: "Browse Apps",
        visualAria: "Color Master 2 color tile challenge phone mockup"
      },
      apps: {
        kicker: "APP CATALOG",
        title: "All Apps",
        description: "Install public apps directly. For private tests, email a request first; after tester access is added, use the Join Test button.",
        colorMaster2: {
          name: "Color Master 2",
          category: "Color puzzle",
          tagline: "Find the different color in 10 seconds.",
          description: "One mistake ends the run. A short, addictive color perception challenge.",
          highlights: ["10-second limit", "One-life run", "Leaderboard", "Colorblind aid"],
          primaryCta: "Install Color Master 2",
          detailCta: "Try Web Demo",
          statusNote: "Available now on Google Play.",
          iconAlt: "Color Master 2 icon"
        },
        galaxyCode: {
          name: "Galacticode",
          category: "Secret message app",
          tagline: "Create alien-like secret messages that need a share key to decode.",
          description: "Create your own galactic language rules. Only people with your share key can recreate the same rules, and the original text is not uploaded to a server.",
          highlights: ["Share-key based", "Personal rules", "SNS-ready", "No server upload"],
          primaryCta: "Create Secret Messages",
          detailCta: "Try Web Demo",
          statusNote: "Available now on Google Play.",
          iconAlt: "Galacticode icon"
        },
        ufoSignal: {
          name: "Call the UFO",
          category: "Immersive fun app",
          tagline: "A mysterious UFO calling experience for fun.",
          description: "Press the button, hear the signal, and imagine something listening from space.",
          highlights: ["Interactive button", "Mystery sounds", "Animation", "No sign-up"],
          primaryCta: "Call the UFO",
          detailCta: "Try Web Demo",
          statusNote: "Available now on Google Play.",
          iconAlt: "Call the UFO icon"
        },
        colorMasterClassic: {
          name: "Color Master",
          category: "Classic color puzzle",
          tagline: "The original color-focus challenge: find the answer among similar colors.",
          description: "The original version before Color Master 2. Try it on the web first, then install it from Google Play.",
          highlights: ["Original feel", "Color focus", "Quick play", "Install now"],
          primaryCta: "Install Color Master",
          detailCta: "Try Web Demo",
          statusNote: "Try it on the web first, then install it from Google Play.",
          iconAlt: "Color Master icon"
        },
        koreanRandomDefense: {
          name: "Korean Random Defense: Siege",
          category: "Private test strategy game",
          tagline: "A 2D random defense game inspired by Korean fortress battles.",
          description: "Currently in private testing. Send a tester access request, then install from the Google Play test link after you are added.",
          highlights: ["Private test", "Random defense", "Korean history", "Tester access"],
          primaryCta: "Request Tester Access",
          testJoinCta: "Join Test",
          statusNote: "After you email the developer and are added as a tester, use Join Test to install from Google Play.",
          iconAlt: "Korean Random Defense: Siege icon"
        },
        luckyCardRandomDefense: {
          name: "Lucky Card Random Defense",
          category: "Private test card random defense",
          tagline: "Survive 10 waves with card choices, summons, and merges.",
          description: "Currently in private testing. Send a tester access request, then install from the Google Play test link after you are added.",
          highlights: ["Private test", "Card choices", "Unit merges", "10 waves"],
          primaryCta: "Request Tester Access",
          testJoinCta: "Join Test",
          statusNote: "After you email the developer and are added as a tester, use Join Test to install from Google Play.",
          iconAlt: "Lucky Card Random Defense icon"
        },
        darkMaze: {
          name: "Dark Maze",
          category: "Private test escape game",
          tagline: "Find the exit in a dark maze as a lab rat escape challenge.",
          description: "Currently in private testing. The public Play link may not open, so use the test contact button.",
          highlights: ["Private test", "Maze escape", "Items", "Leaderboard planned"],
          primaryCta: "Request Tester Access",
          statusNote: "The public Google Play link may not open. Email the developer to request tester access.",
          iconAlt: "Dark Maze icon"
        }
      },
      status: {
        recommended: "Recommended",
        live: "LIVE",
        classic: "Classic",
        testing: "Private Test",
        comingSoon: "Coming Soon"
      },
      common: {
        webDemo: "Try Web Demo"
      },
      shorts: {
        kicker: "SHORTS IDEAS",
        title: "Try Them Like This",
        colorMaster2: {
          app: "Color Master 2",
          title: "“If you see this color difference, your eyes are sharp.”",
          description: "Compete with friends in a 10-second challenge."
        },
        galaxyCode: {
          app: "Galacticode",
          title: "“Send your friend an alien message they cannot decode.”",
          description: "Leave secret messages that only share-key holders can decode."
        },
        ufoSignal: {
          app: "Call the UFO",
          title: "“What happens if you press the UFO button at dawn?”",
          description: "Enjoy the sounds and animation in a dark room."
        }
      },
      faq: {
        kicker: "FAQ",
        title: "Frequently Asked Questions",
        free: {
          question: "Are the apps free?",
          answer: "Yes. The apps introduced here are currently free, and some apps may include ads."
        },
        privacy: {
          question: "Do the apps collect personal data?",
          answer: "It depends on each app policy, but the apps are built to minimize data collection where possible. Some apps may include ads, so check each app privacy policy for details."
        },
        first: {
          question: "Which app should I install first?",
          answer: "If this is your first visit, try Color Master 2 first. It is quick to play and easy to replay for a better score."
        },
        privateTest: {
          question: "How do I join private test apps?",
          answer: "Use Request Tester Access to send an email. After the developer adds you as a tester, wait a bit and press the Join Test button again."
        }
      },
      footer: {
        madeBy: "Made by NeoKIM",
        lastUpdated: "Last updated: 2026.05.31",
        googlePlay: "Google Play Apps",
        colorTest: "Color Test",
        alienText: "Alien Text Generator",
        ufoApp: "UFO App",
        privacyPolicy: "Privacy Policy",
        appAds: "app-ads.txt",
        contact: "Contact"
      },
      privateTest: {
        title: "Private Tester Signup",
        close: "Close modal",
        cardId: "#PRIVATE-TEST",
        description: "Private test links may only open for Google Play accounts registered as testers. Send a request email to the developer first.",
        steps: [
          "Check the email address used for your Google Play account.",
          "Use the button below to send a private test request to the developer.",
          "After you send the email, the developer will review it and add that Google Play account as a tester. Wait a bit, then press the Join Test button on the card again."
        ],
        emailButton: "Email Developer",
        emailAria: "Email developer",
        mailSubject: "Private test request - {appName}",
        mailBody: "Hello.\nI would like to join the private test for {appName}.\n\nGoogle Play account email:\n\nThank you."
      }
    },
    ko: {
      seo: {
        title: "NeoKIM App Lab | 무료 Android 미니앱 컬렉션",
        description: "컬러마스터2, 은하코드, UFO 호출기, 운빨 카드 랜덤디펜스 등 무료 Android 미니앱을 바로 설치하거나 비공개 테스트로 체험해보세요.",
        ogTitle: "NeoKIM App Lab | Android 미니앱",
        ogDescription: "색감 테스트, 공유키 기반 외계어 메시지, UFO 호출 체험, 운빨 카드 랜덤디펜스 비공개 테스트까지. 짧게 즐기는 Android 앱 컬렉션."
      },
      skip: {
        apps: "앱 목록으로 이동"
      },
      nav: {
        featured: "추천 앱",
        apps: "전체 앱",
        faq: "FAQ"
      },
      language: {
        buttonLabel: "언어 선택",
        modalTitle: "언어 선택",
        modalDescription: "언어 이름, 원어 이름, locale 코드로 검색할 수 있습니다.",
        searchLabel: "언어 검색",
        searchPlaceholder: "검색: korean, 한국어, ko, japanese, 日本語, ja",
        close: "언어 선택 닫기",
        recommended: "추천 언어",
        asia: "아시아",
        europe: "유럽",
        middleEast: "중동",
        africa: "아프리카",
        other: "기타",
        noResults: "검색된 언어가 없습니다.",
        current: "현재 언어",
        availableHint: "85개 이상 언어 지원",
        supportedTitle: "지원 언어",
        supportedSummary: "지원 언어",
        supportedDescription: "이 사이트는 85개 이상의 locale로 표시할 수 있습니다. 아직 전용 번역이 없는 언어는 영어로 표시됩니다.",
        fallbackNotice: "일부 locale은 정식 번역 추가 전까지 영어 fallback을 사용합니다."
      },
      hero: {
        eyebrow: "Android mini app collection",
        title: "NeoKIM App Lab",
        subtitle: "짧게 즐기고 바로 공유하는 안드로이드 미니앱 컬렉션",
        description: "색감 테스트, 외계어 메시지, UFO 호출 체험까지. 가볍게 설치하고 1분 안에 즐길 수 있는 앱들을 모았습니다.",
        primaryCta: "추천 앱 설치하기",
        primaryAria: "컬러마스터2 Google Play에서 설치",
        secondaryCta: "전체 앱 보기",
        visualAria: "컬러마스터2 앱 아이콘과 색상 타일로 구성된 휴대폰 목업",
        badges: ["Free Apps", "Android", "회원가입 없음", "Made by NeoKIM"]
      },
      featured: {
        kicker: "FEATURED APP",
        title: "오늘 먼저 설치해볼 앱",
        badge: "추천",
        appName: "컬러마스터2",
        short: "10초 안에 다른 색을 찾아보세요.",
        description: "한 번 틀리면 끝나는 원라이프 색상 판별 퍼즐입니다. 짧게 시작하지만, 기록을 깨고 싶어서 계속 다시 하게 되는 구조입니다.",
        primaryCta: "Google Play에서 설치",
        primaryAria: "컬러마스터2 Google Play에서 설치",
        secondaryCta: "전체 앱 보기",
        visualAria: "컬러마스터2 색상 타일 챌린지 휴대폰 목업"
      },
      apps: {
        kicker: "APP CATALOG",
        title: "전체 앱",
        description: "공개 앱은 바로 설치하고, 비공개 테스트 앱은 문의 메일을 보낸 뒤 테스터 등록이 완료되면 테스트 참여 버튼으로 설치할 수 있습니다.",
        colorMaster2: {
          name: "컬러마스터2",
          category: "색상 판별 퍼즐",
          tagline: "10초 안에 다른 색을 찾는 원라이프 색감 챌린지",
          description: "한 번 틀리면 끝. 색감, 집중력, 순발력을 시험하는 짧고 중독성 있는 퍼즐 게임입니다.",
          highlights: ["10초 제한", "원라이프", "랭킹 지원", "색약 보조"],
          primaryCta: "컬러마스터2 설치",
          detailCta: "웹에서 먼저 체험",
          statusNote: "Google Play에서 바로 설치할 수 있습니다.",
          iconAlt: "컬러마스터2 아이콘"
        },
        galaxyCode: {
          name: "은하코드",
          category: "비밀 메시지 생성기",
          tagline: "공유키 없이는 읽기 어려운 나만의 외계어 비밀 메시지",
          description: "나만의 은하 언어 규칙을 만들고, 공유키를 받은 사람만 같은 규칙으로 메시지를 해독할 수 있습니다. 원문과 변환 규칙은 서버로 보내지 않습니다.",
          highlights: ["공유키 기반", "나만의 규칙", "SNS 활용", "서버 전송 없음"],
          primaryCta: "비밀 메시지 만들기",
          detailCta: "웹에서 먼저 체험",
          statusNote: "Google Play에서 바로 설치할 수 있습니다.",
          iconAlt: "은하코드 아이콘"
        },
        ufoSignal: {
          name: "UFO 호출기",
          category: "몰입형 체험 앱",
          tagline: "밤에 누르면 더 재밌는 미스터리 UFO 호출 체험",
          description: "버튼, 사운드, 애니메이션으로 우주에 신호를 보내는 듯한 상상 체험을 제공합니다.",
          highlights: ["인터랙티브 버튼", "미스터리 사운드", "애니메이션", "회원가입 없음"],
          primaryCta: "UFO 호출해보기",
          detailCta: "웹에서 먼저 체험",
          statusNote: "Google Play에서 바로 설치할 수 있습니다.",
          iconAlt: "UFO 호출기 아이콘"
        },
        colorMasterClassic: {
          name: "컬러 마스터",
          category: "클래식 색상 판별 게임",
          tagline: "비슷한 색상 속에서 정답을 찾는 원작 색감 집중력 테스트",
          description: "컬러마스터2 이전에 만든 원작 버전입니다. 웹에서 먼저 체험해보고, Google Play에서 설치할 수 있습니다.",
          highlights: ["원작 감성", "색상 집중력", "짧은 플레이", "바로 설치"],
          primaryCta: "컬러 마스터 설치",
          detailCta: "웹에서 먼저 체험",
          statusNote: "웹에서 먼저 체험해보고, Google Play에서 설치할 수 있습니다.",
          iconAlt: "컬러 마스터 아이콘"
        },
        koreanRandomDefense: {
          name: "한국사 랜덤 디펜스: 수성전",
          category: "비공개 테스트 전략 게임",
          tagline: "한국사 속 수성전을 소재로 한 2D 랜덤 디펜스",
          description: "현재 비공개 테스트 중입니다. 개발자에게 참여 요청을 보낸 뒤 테스터로 등록되면 Google Play 테스트 링크로 설치할 수 있습니다.",
          highlights: ["비공개 테스트", "랜덤 디펜스", "한국사 소재", "테스터 등록"],
          primaryCta: "테스트 참여 문의",
          testJoinCta: "테스트 참여",
          statusNote: "메일을 보내 테스터로 추가된 뒤, 테스트 참여 버튼으로 Google Play에서 설치할 수 있습니다.",
          iconAlt: "한국사 랜덤 디펜스 수성전 아이콘"
        },
        luckyCardRandomDefense: {
          name: "운빨 카드 랜덤디펜스",
          category: "비공개 테스트 카드 랜덤 디펜스",
          tagline: "카드 선택과 유닛 합성으로 10웨이브를 버티는 운빨 디펜스",
          description: "현재 비공개 테스트 중입니다. 개발자에게 참여 요청을 보낸 뒤 테스터로 등록되면 Google Play 테스트 링크로 설치할 수 있습니다.",
          highlights: ["비공개 테스트", "카드 선택", "유닛 합성", "10웨이브"],
          primaryCta: "테스트 참여 문의",
          testJoinCta: "테스트 참여",
          statusNote: "메일을 보내 테스터로 추가된 뒤, 테스트 참여 버튼으로 Google Play에서 설치할 수 있습니다.",
          iconAlt: "운빨 카드 랜덤디펜스 아이콘"
        },
        darkMaze: {
          name: "다크 메이즈",
          category: "비공개 테스트 탈출 게임",
          tagline: "어둠 속 미로에서 출구를 찾는 실험쥐 탈출 게임",
          description: "현재 비공개 테스트 중입니다. 공개 Play 링크가 열리지 않을 수 있어 테스트 참여 문의로 연결합니다.",
          highlights: ["비공개 테스트", "미로 탈출", "아이템", "리더보드 예정"],
          primaryCta: "테스트 참여 문의",
          statusNote: "Google Play 공개 링크가 열리지 않을 수 있습니다. 테스트 참여를 원하면 개발자에게 메일을 보내주세요.",
          iconAlt: "다크 메이즈 아이콘"
        }
      },
      status: {
        recommended: "추천",
        live: "LIVE",
        classic: "클래식",
        testing: "비공개 테스트",
        comingSoon: "준비 중"
      },
      common: {
        webDemo: "웹에서 먼저 체험"
      },
      shorts: {
        kicker: "SHORTS IDEAS",
        title: "이렇게 즐겨보세요",
        colorMaster2: {
          app: "컬러마스터2",
          title: "“이 색 차이 보이면 눈 좋은 사람”",
          description: "10초 챌린지로 친구와 기록 경쟁하기"
        },
        galaxyCode: {
          app: "은하코드",
          title: "“친구에게 해독 못 하는 외계어 보내기”",
          description: "공유키를 받은 사람만 풀 수 있는 비밀 메시지 남기기"
        },
        ufoSignal: {
          app: "UFO 호출기",
          title: "“새벽에 UFO 호출 버튼 누르면?”",
          description: "어두운 방에서 사운드와 애니메이션 즐기기"
        }
      },
      faq: {
        kicker: "FAQ",
        title: "자주 묻는 질문",
        free: {
          question: "무료인가요?",
          answer: "네. 현재 소개된 앱들은 무료로 사용할 수 있으며, 일부 앱에는 광고가 포함될 수 있습니다."
        },
        privacy: {
          question: "개인정보를 수집하나요?",
          answer: "앱별 정책에 따라 다르지만, 가능한 한 데이터 수집을 최소화하는 방향으로 제작합니다. 일부 앱에는 광고가 포함될 수 있으며, 자세한 내용은 각 앱의 개인정보 처리방침을 확인하세요."
        },
        first: {
          question: "어떤 앱을 먼저 설치하면 좋나요?",
          answer: "처음 방문했다면 컬러마스터2를 추천합니다. 짧게 플레이할 수 있고 기록 경쟁이 가능하기 때문입니다."
        },
        privateTest: {
          question: "비공개 테스트 앱은 어떻게 참여하나요?",
          answer: "테스트 참여 문의 버튼을 눌러 메일을 보내면 개발자가 확인 후 테스터로 추가합니다. 잠시 기다렸다가 카드의 테스트 참여 버튼을 다시 눌러주세요."
        }
      },
      footer: {
        madeBy: "Made by NeoKIM",
        lastUpdated: "Last updated: 2026.05.31",
        googlePlay: "Google Play 앱 목록",
        colorTest: "색감 테스트",
        alienText: "외계어 생성기",
        ufoApp: "UFO 호출 앱",
        privacyPolicy: "Privacy Policy",
        appAds: "app-ads.txt",
        contact: "Contact"
      },
      privateTest: {
        title: "비공개 테스터 모집",
        close: "모달 닫기",
        cardId: "#PRIVATE-TEST",
        description: "비공개 테스트 링크는 테스터로 등록된 Google Play 계정에서만 열릴 수 있습니다. 먼저 개발자에게 참여 요청 메일을 보내주세요.",
        steps: [
          "Google Play 가입 계정 이메일을 확인하세요.",
          "아래 버튼으로 개발자에게 테스트 참여 요청 메일을 보내세요.",
          "메일을 보내면 개발자가 확인 후 해당 Google Play 계정을 테스터로 추가합니다. 잠시 기다린 뒤 카드의 테스트 참여 버튼을 다시 눌러주세요."
        ],
        emailButton: "개발자에게 이메일 보내기",
        emailAria: "개발자에게 이메일 보내기",
        mailSubject: "비공개 테스트 참여 요청 - {appName}",
        mailBody: "안녕하세요.\n{appName} 비공개 테스트 참여를 요청드립니다.\n\nGoogle Play 가입 이메일:\n\n감사합니다."
      }
    }
  };

  return {
    defaultLocale,
    storageKey,
    legacyStorageKey,
    recommendedLocales,
    baseFallbacks,
    locales,
    translations
  };
})();
