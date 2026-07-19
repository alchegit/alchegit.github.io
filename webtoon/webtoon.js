(() => {
  // Every page starts in visitor mode. Admin UI is revealed only after the
  // backend has verified the signed-in Google account role.
  document.documentElement.dataset.webtoonAccess = "visitor";

  const storageKey = "neokim-webtoon-project:v1";
  const incomingTemplateKey = "neokim-webtoon-template:v1";
  const studioUiStorageKey = "neokim-webtoon-studio-ui:v1";
  const imageDbName = "neokim-webtoon-images:v1";
  const imageStoreName = "panelImages";
  const supabaseUrl = "https://anjbgbqkeukllsdxgckv.supabase.co";
  const supabasePublishableKey = "sb_publishable_k6DOGCJ3PVC1av1RVxDt5w_NvOZubsE";
  const draftGenerationCost = 3;
  const accents = ["#69c8ff", "#ffd85a", "#35d7a8", "#e95b88", "#ff9a6c", "#75c96b"];
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
    panelFields: Object.freeze({ beat: 180, line: 80, sfx: 16, note: 180 }),
    dialogueRecommendedMax: 45,
    imageBytes: 12 * 1024 * 1024,
    imageMinSide: 320,
    imageMaxPixels: 40_000_000,
    imageMimeTypes: Object.freeze(["image/jpeg", "image/png", "image/webp"]),
    imageExtensions: Object.freeze(["jpg", "jpeg", "png", "webp"])
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
    let project = loadProject();
    let selectedPanelId = "";
    let advisorTimer = 0;
    let storyAnalysis;
    const incomingTemplateId = getIncomingTemplateId();
    const studioSections = Array.from(document.querySelectorAll("[data-studio-section]"));

    if (incomingTemplateId || !isSupportedProject(project)) {
      project = buildProject({ templateId: incomingTemplateId, count: 16 });
    }

    project.idea = clipText(project.idea, contentLimits.storyMax);
    ideaInput.value = project.idea;
    genreSelect.value = project.genre;
    setPanelCount(project.panelCount || project.panels.length || 16);
    storyAnalysis = analyzeStory(project.idea);
    renderStoryAdvisor(storyAnalysis);
    updateIdeaLimitState();
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
      if (!accessState.isAdmin && accessState.acorns < draftGenerationCost) {
        flash(`도토리 ${draftGenerationCost}개가 필요합니다.`);
        return;
      }

      draftButton.disabled = true;
      try {
        const generation = await oracleFetch("/api/webtoon/jobs", {
          method: "POST",
          body: JSON.stringify({
            jobType: "draft_generation",
            scenarioKey: "studio-draft",
            requestPayload: {
              idea: ideaInput.value,
              genre: genreSelect.value,
              panelCount: getPanelCount()
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
      } catch (error) {
        flash(accountErrorMessage(error));
        syncCreationAvailability();
        return;
      }

      storyAnalysis = analyzeStory(ideaInput.value);
      const uiPreferences = project.uiPreferences;
      project = buildProject({
        idea: ideaInput.value,
        genre: genreSelect.value,
        count: getPanelCount()
      });
      if (uiPreferences) {
        project.uiPreferences = uiPreferences;
      }
      renderAll();
      flash(accessState.isAdmin ? "관리자 초안 완성" : `초안 완성 · 도토리 ${draftGenerationCost}개 사용`);
      syncCreationAvailability();
    });

    ideaInput.addEventListener("input", () => {
      updateIdeaLimitState();
      window.clearTimeout(advisorTimer);
      advisorTimer = window.setTimeout(() => {
        storyAnalysis = analyzeStory(ideaInput.value);
        renderStoryAdvisor(storyAnalysis);
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
      updateFieldCounter(target, maxLength);
      project.updatedAt = new Date().toISOString();
      project.hasUnpublishedChanges = true;
      renderPreview(preview, project);
      renderStats(project);
      renderProjectState(project);
    });

    panelList.addEventListener("change", async (event) => {
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
        if (project.panels[index].imageKey) {
          await deletePanelImage(project.panels[index].imageKey).catch(() => {});
        }
        delete project.panels[index].imageData;
        delete project.panels[index].imageKey;
        delete project.panels[index].imageName;
        delete project.panels[index].imageUpdatedAt;
        renderAll();
        flash("이미지 제거");
        return;
      }
      if (action === "up" && index > 0) {
        [project.panels[index - 1], project.panels[index]] = [project.panels[index], project.panels[index - 1]];
      }
      if (action === "down" && index < project.panels.length - 1) {
        [project.panels[index + 1], project.panels[index]] = [project.panels[index], project.panels[index + 1]];
      }
      if (action === "delete" && project.panels.length > contentLimits.manualSceneMin) {
        project.panels.splice(index, 1);
      }
      project.panelCount = project.panels.length;
      renderAll();
    });

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
        && accessState.canCreate
        && (accessState.isAdmin || accessState.acorns >= draftGenerationCost);
      draftButton.disabled = !validIdea || !accessState.ready || !hasAccess;
      draftButton.textContent = accessState.canCreate ? "웹툰 만들기" : "개발 중";

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
        note.textContent = "관리자 제작은 도토리가 차감되지 않습니다.";
      } else if (accessState.acorns < draftGenerationCost) {
        note.textContent = `도토리가 부족합니다. 제작에는 ${draftGenerationCost}개가 필요합니다.`;
      } else {
        note.textContent = `제작 시 도토리 ${draftGenerationCost}개 · 현재 ${accessState.acorns}개`;
      }
    }

    function renderAll({ persist = accessState.signedIn, changed = true } = {}) {
      project.title = createTitle(project.idea, project.genre);
      project.updatedAt = new Date().toISOString();
      if (changed) {
        project.hasUnpublishedChanges = true;
      }
      renderPanelList(panelList, project);
      renderPreview(preview, project);
      renderStats(project);
      renderProjectState(project);
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
      const imageKey = panelImageKey(project, panel);
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
      selectedPanelId = panel.id;
      renderAll();
      const activeSlot = panelList.querySelector(`[data-panel-id="${panel.id}"] .image-slot`);
      activeSlot?.classList.add("is-active");
      flash("이미지 반영");
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

    const loadedProject = loadProject();
    let project = isSupportedProject(loadedProject)
      ? loadedProject
      : buildProject({ templateId: "awakening-subway-gate", count: episodeRules.keySceneRange[1] });
    const useLocalDraft = new URLSearchParams(window.location.search).get("draft") === "local";
    renderReaderProject(project);

    document.addEventListener("webtoon:access-change", async (event) => {
      if (event.detail.signedIn || useLocalDraft) {
        const localProject = loadProject();
        project = isSupportedProject(localProject) ? localProject : project;
        renderReaderProject(project);
        return;
      }

      await renderLatestPublicProject();
    });

    if (!useLocalDraft) {
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
      renderReaderPage(currentProject);
      hydrateProjectImages(currentProject).then(() => renderReaderPage(currentProject)).catch(() => {});
    }

    function renderReaderPage(currentProject) {
      byId("readerTitle").textContent = currentProject.title;
      const readerPanelCount = countReaderPanels(currentProject);
      byId("readerPanels").textContent = String(readerPanelCount);
      byId("readerGenre").textContent = genreLabel(currentProject.genre);
      byId("readerMinutes").textContent = `${estimateReaderMinutes(readerPanelCount)}분`;
      reader.innerHTML = renderReader(currentProject);
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

  function buildProject({ idea = "", genre = "", count = episodeRules.targetKeyScenes, templateId = "" } = {}) {
    const template = templates.find((item) => item.id === templateId);
    const finalIdea = clipText(
      template?.idea || idea || "폐역 플랫폼에서 F급 헌터가 자신에게만 보이는 퀘스트 창을 발견한다",
      contentLimits.storyMax
    ).trim();
    const finalGenre = template?.genre || genre || "modern-awakening";
    const finalCount = Math.max(
      episodeRules.keySceneRange[0],
      Math.min(episodeRules.keySceneRange[1], Number(count) || episodeRules.targetKeyScenes)
    );
    const episodePlan = analyzeStory(finalIdea);
    const episodeStory = episodePlan.episodeOneStory || finalIdea;
    const outline = buildSceneOutline({
      genre: finalGenre,
      story: episodeStory,
      count: finalCount,
      templateId: template?.id || ""
    });
    const panels = outline.map((scene, index) => createPanel(finalGenre, finalIdea, index, scene));

    return {
      id: createId(),
      title: template?.title || createTitle(finalIdea, finalGenre),
      idea: finalIdea,
      templateId: template?.id || "",
      episodeStory,
      nextEpisodeStory: episodePlan.nextEpisodeStory || "",
      genre: finalGenre,
      tone: template?.tone || "bright",
      status: "draft",
      isPublic: false,
      hasUnpublishedChanges: false,
      panelCount: finalCount,
      episodePlan,
      panels,
      updatedAt: new Date().toISOString()
    };
  }

  function isSupportedProject(project) {
    return Boolean(project && project.genre === "modern-awakening" && Array.isArray(project.panels));
  }

  function buildSceneOutline({ genre, story, count, templateId }) {
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

    const sentences = splitStorySentences(story);
    if (!sentences.length) {
      return scenes;
    }

    const anchors = new Map();
    sentences.forEach((sentence, sentenceIndex) => {
      const anchorIndex = sentences.length === 1
        ? Math.min(count - 1, Math.max(0, Math.round(count * 0.24)))
        : Math.round(sentenceIndex * (count - 1) / (sentences.length - 1));
      const previous = anchors.get(anchorIndex);
      anchors.set(anchorIndex, previous ? `${previous} ${sentence}` : sentence);
    });

    return scenes.map((scene, index) => {
      const sourceSentence = anchors.get(index);
      if (!sourceSentence) {
        return scene;
      }
      return [sourceSentence, scene[1], scene[2], scene[3]];
    });
  }

  function createPanel(genre, idea, index, scene) {
    const bank = beatBank[genre] || beatBank.daily;
    const beat = scene || bank[index % bank.length];
    return {
      id: createId(),
      beat: beat[0].replace("주인공", getHeroName(idea)),
      camera: ["wide", "close", "top", "over"][index % 4],
      line: beat[1],
      sfx: beat[2],
      phase: beat[3] || "development",
      accent: accents[(index + genreIndex(genre)) % accents.length],
      note: `${index + 1}장면 · 약 ${episodeRules.readerPanelsPerScene}개 읽기 비트로 분할`,
      imageData: "",
      imageName: ""
    };
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

  function renderPanelList(container, project) {
    container.innerHTML = project.panels.map((panel, index) => {
      const hasImage = Boolean(panel.imageData);
      const hasStoredImage = hasImage || Boolean(panel.imageKey);
      const phase = phaseLabel(panel.phase);
      const emptyImageLabel = panel.imageKey ? "저장된 이미지 불러오는 중" : `${index + 1}장면 이미지 슬롯`;
      const imageNote = hasImage
        ? panel.imageName || "가져온 이미지"
        : panel.imageKey
          ? "저장된 이미지를 불러오는 중입니다."
          : "ChatGPT Pro에서 만든 이미지를 저장한 뒤 이 컷에 가져오세요.";

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
            <button class="icon-button" type="button" data-action="up" aria-label="${index + 1}장면 위로">↑</button>
            <button class="icon-button" type="button" data-action="down" aria-label="${index + 1}장면 아래로">↓</button>
            <button class="icon-button" type="button" data-action="delete" aria-label="${index + 1}장면 삭제" ${project.panels.length <= contentLimits.manualSceneMin ? "disabled" : ""}>×</button>
          </div>
        </div>
        <div class="panel-fields">
          <label class="field wide">
            <span class="field-label-row"><span>장면</span><small class="input-counter">${textLength(panel.beat)} / ${contentLimits.panelFields.beat}</small></span>
            <textarea data-field="beat" rows="2" maxlength="${contentLimits.panelFields.beat}">${escapeHtml(panel.beat)}</textarea>
          </label>
          <label class="field">
            <span class="field-label-row"><span>대사</span><small class="input-counter ${textLength(panel.line) > contentLimits.dialogueRecommendedMax ? "is-recommended-over" : ""}">${textLength(panel.line)} / ${contentLimits.panelFields.line}</small></span>
            <input data-field="line" maxlength="${contentLimits.panelFields.line}" value="${escapeHtml(panel.line)}">
          </label>
          <label class="field">
            <span class="field-label-row"><span>효과음</span><small class="input-counter">${textLength(panel.sfx)} / ${contentLimits.panelFields.sfx}</small></span>
            <input data-field="sfx" maxlength="${contentLimits.panelFields.sfx}" value="${escapeHtml(panel.sfx)}">
          </label>
          <label class="field wide">
            <span class="field-label-row"><span>연출 메모</span><small class="input-counter">${textLength(panel.note)} / ${contentLimits.panelFields.note}</small></span>
            <input data-field="note" maxlength="${contentLimits.panelFields.note}" value="${escapeHtml(panel.note)}">
          </label>
        </div>
        <div class="panel-image-tools">
          <div class="image-slot ${hasImage ? "has-image" : ""}">
            ${hasImage ? `<img src="${escapeHtml(panel.imageData)}" alt="${index + 1}장면 가져온 이미지">` : `<span>${escapeHtml(emptyImageLabel)}</span>`}
          </div>
          <div class="image-tool-actions">
            <button class="tool-button mini pro" type="button" data-action="copy-prompt">${index + 1}장면 프롬프트</button>
            <label class="tool-button mini image-import">
              이미지 가져오기
              <input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" data-image-input>
            </label>
            <button class="tool-button mini" type="button" data-action="clear-image" ${hasStoredImage ? "" : "disabled"}>제거</button>
          </div>
          <p class="image-slot-note">${escapeHtml(imageNote)} · JPG·PNG·WebP, 12MB 이하</p>
        </div>
        </div>
      </details>
    `;
    }).join("");
  }

  function renderPreview(container, project) {
    container.innerHTML = `
      <div class="phone-title">${escapeHtml(project.title)}</div>
      ${project.panels.map((panel) => renderScene(panel, "preview")).join("")}
    `;
  }

  function renderReader(project) {
    return `
      <div class="reader-title">${escapeHtml(project.title)}</div>
      ${project.panels.map((panel) => renderScene(panel, "reader")).join("")}
    `;
  }

  function renderScene(panel, mode) {
    const className = mode === "reader" ? "reader-panel" : "preview-panel";
    const sceneClass = mode === "reader" ? "reader-scene" : "preview-scene";
    const soft = softenColor(panel.accent);
    return `
      <div class="${sceneClass}" data-phase="${escapeHtml(panel.phase || "development")}">
        <section class="${className} scene-beat beat-establish" style="--panel-accent: ${panel.accent}; --panel-soft: ${soft};">
          <div class="scene-horizon" aria-hidden="true"></div>
          <p class="panel-caption">${escapeHtml(panel.beat)}</p>
        </section>
        <section class="${className} scene-beat beat-focus ${panel.imageData ? "has-image" : ""}" style="--panel-accent: ${panel.accent}; --panel-soft: ${soft};">
          ${panel.imageData ? `<img class="panel-art-image" src="${escapeHtml(panel.imageData)}" alt="${escapeHtml(panel.beat)}">` : ""}
          <div class="speech">${escapeHtml(panel.line)}</div>
          <div class="panel-character" aria-hidden="true"></div>
          <div class="panel-art-line" aria-hidden="true"></div>
        </section>
        <section class="${className} scene-beat beat-reaction" style="--panel-accent: ${panel.accent}; --panel-soft: ${soft};">
          <strong class="sfx">${escapeHtml(panel.sfx)}</strong>
          <p class="reaction-copy">${escapeHtml(phaseReaction(panel.phase))}</p>
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
        `장면: ${panel.beat}`,
        `대사: ${panel.line}`,
        `효과음: ${panel.sfx}`,
        `연출: ${panel.note}`,
        `이미지: ${panel.imageName || (panel.imageKey ? "저장됨" : "없음")}`,
        ""
      ])
    ];
    return rows.join("\n");
  }

  function projectToChatGptPrompt(project) {
    const analysis = analyzeStory(project.idea);
    const panelPrompts = project.panels.map((panel, index) => panelToChatGptPrompt(project, panel, index)).join("\n\n");

    return [
      "아래 기획을 바탕으로 K웹툰식 현대 판타지 각성물 도입부 이미지를 만들어주세요.",
      "기존 웹툰, 애니, 게임, 작가의 고유 캐릭터/세계관/로고/그림체를 따라 하지 말고 완전히 오리지널로 그려주세요.",
      "각 핵심 장면은 표정, 행동, 반응, 여백을 포함한 2~4개의 모바일 읽기 비트로 나눠주세요.",
      `전체는 약 ${episodeRules.readerPanelRange[0]}~${episodeRules.targetReaderPanels}개의 독자 컷이 되는 한 화 분량으로 구성합니다.`,
      "말풍선 텍스트는 너무 길게 넣지 말고, 텍스트가 부정확해질 것 같으면 말풍선 영역만 비워도 됩니다.",
      "",
      `작품 제목: ${project.title}`,
      `전체 원고: ${project.idea}`,
      `이번 1화에 사용할 원고: ${project.episodeStory || project.idea}`,
      ...(project.nextEpisodeStory ? [`다음 화로 넘길 원고: ${project.nextEpisodeStory}`] : []),
      `타입: ${genreLabel(project.genre)}`,
      `핵심 장면 수: ${project.panels.length}`,
      `1화 마감 제안: ${analysis.cutLabel}`,
      "",
      panelPrompts,
      "",
      "먼저 전체 톤과 인물 설정을 맞춘 뒤 1장면부터 순서대로 생성해주세요."
    ].join("\n");
  }

  function panelToChatGptPrompt(project, panel, index) {
    return [
      `${index + 1}장면`,
      `작품 제목: ${project.title}`,
      `1화 원고: ${shorten(project.episodeStory || project.idea, 900)}`,
      `장면: ${panel.beat}`,
      `말풍선: ${panel.line}`,
      `효과음: ${panel.sfx}`,
      `연출 메모: ${panel.note}`,
      "이미지 지시: 세로 웹툰 장면, 현대 한국 도시 판타지, 오리지널 캐릭터, 스마트폰에서 읽기 좋은 강한 실루엣과 명확한 조명. 한 장면을 2~4개 읽기 비트로 구성하고 상태창 UI는 짧고 선명하게.",
      "금지: 기존 웹툰/애니/게임 캐릭터, 작가 고유 화풍, 로고, 작품명, 알아볼 수 있는 원작 설정을 닮지 않게 해주세요.",
      "텍스트 주의: 이미지 안 글자는 최소화하고, 정확히 넣기 어렵다면 말풍선 영역만 비워주세요."
    ].join("\n");
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

  async function oracleFetch(path, { method = "GET", body = null, auth = true } = {}) {
    const base = getOracleApiBase();
    if (!base) {
      throw new Error("oracle_api_not_configured");
    }

    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json"
    };
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

  function panelImageKey(project, panel) {
    return `${project.id}:${panel.id}`;
  }

  async function hydrateProjectImages(project) {
    await Promise.all(project.panels.map(async (panel) => {
      if (panel.imageData && !panel.imageKey) {
        const key = panelImageKey(project, panel);
        const updatedAt = panel.imageUpdatedAt || new Date().toISOString();
        await putPanelImage(key, {
          key,
          dataUrl: panel.imageData,
          name: panel.imageName || "imported-panel.jpg",
          updatedAt
        });
        panel.imageKey = key;
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
