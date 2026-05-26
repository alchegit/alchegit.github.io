const developerEmail = "wlgnsl14@gmail.com";

const apps = [
  {
    id: "color-master-2",
    status: "live",
    priority: 1,
    code: "ANDROID004",
    campaign: "color_master2",
    recommended: true,
    titleKo: "컬러마스터2",
    titleEn: "Color Master 2",
    categoryKo: "색상 판별 퍼즐",
    categoryEn: "Color puzzle",
    taglineKo: "10초 안에 다른 색을 찾는 원라이프 색감 챌린지",
    taglineEn: "Find the different color in 10 seconds.",
    descriptionKo: "한 번 틀리면 끝. 색감, 집중력, 순발력을 시험하는 짧고 중독성 있는 퍼즐 게임입니다.",
    descriptionEn: "One mistake ends the run. A short, addictive color perception challenge.",
    icon: "assets/icon_colormaster2.png",
    playUrl: "https://play.google.com/store/apps/details?id=com.codexdev.color_master2",
    detailUrl: "./color-master-2/",
    highlightsKo: ["10초 제한", "원라이프", "랭킹 지원", "색약 보조"],
    highlightsEn: ["10-second limit", "One-life run", "Leaderboard", "Colorblind aid"],
    primaryCtaKo: "컬러마스터2 설치",
    primaryCtaEn: "Install Color Master 2",
    statusNoteKo: "Google Play에서 바로 설치할 수 있습니다.",
    statusNoteEn: "Available now on Google Play."
  },
  {
    id: "galacticode",
    status: "live",
    priority: 2,
    code: "ANDROID002",
    campaign: "galacticode",
    titleKo: "은하코드",
    titleEn: "Galacticode",
    categoryKo: "비밀 메시지 생성기",
    categoryEn: "Secret message app",
    taglineKo: "공유키 없이는 읽기 어려운 나만의 외계어 비밀 메시지",
    taglineEn: "Create alien-like secret messages that need a share key to decode.",
    descriptionKo: "나만의 은하 언어 규칙을 만들고, 공유키를 받은 사람만 같은 규칙으로 메시지를 해독할 수 있습니다. 원문과 변환 규칙은 서버로 보내지 않습니다.",
    descriptionEn: "Create your own galactic language rules. Only people with your share key can recreate the same rules, and the original text is not uploaded to a server.",
    icon: "assets/icon_galacticode.png",
    playUrl: "https://play.google.com/store/apps/details?id=com.galactic.speak",
    detailUrl: "./galacticode/",
    highlightsKo: ["공유키 기반", "나만의 규칙", "SNS 활용", "서버 전송 없음"],
    highlightsEn: ["Share-key based", "Personal rules", "SNS-ready", "No server upload"],
    primaryCtaKo: "비밀 메시지 만들기",
    primaryCtaEn: "Create Secret Messages",
    statusNoteKo: "Google Play에서 바로 설치할 수 있습니다.",
    statusNoteEn: "Available now on Google Play."
  },
  {
    id: "call-the-ufo",
    status: "live",
    priority: 3,
    code: "ANDROID001",
    campaign: "call_the_ufo",
    titleKo: "UFO 호출기",
    titleEn: "Call the UFO",
    categoryKo: "몰입형 체험 앱",
    categoryEn: "Immersive fun app",
    taglineKo: "밤에 누르면 더 재밌는 미스터리 UFO 호출 체험",
    taglineEn: "A mysterious UFO calling experience for fun.",
    descriptionKo: "버튼, 사운드, 애니메이션으로 우주에 신호를 보내는 듯한 상상 체험을 제공합니다.",
    descriptionEn: "Press the button, hear the signal, and imagine something listening from space.",
    icon: "assets/icon_calltheufo.png",
    playUrl: "https://play.google.com/store/apps/details?id=com.call_the_ufo",
    detailUrl: "./call-the-ufo/",
    highlightsKo: ["인터랙티브 버튼", "미스터리 사운드", "애니메이션", "회원가입 없음"],
    highlightsEn: ["Interactive button", "Mystery sounds", "Animation", "No sign-up"],
    primaryCtaKo: "UFO 호출해보기",
    primaryCtaEn: "Call the UFO",
    statusNoteKo: "Google Play에서 바로 설치할 수 있습니다.",
    statusNoteEn: "Available now on Google Play."
  },
  {
    id: "color-master-classic",
    status: "classic",
    priority: 4,
    code: "ANDROID003",
    campaign: "colormaster",
    titleKo: "컬러 마스터",
    titleEn: "Color Master",
    categoryKo: "클래식 색상 판별 게임",
    categoryEn: "Classic color puzzle",
    taglineKo: "비슷한 색상 속에서 정답을 찾는 원작 색감 집중력 테스트",
    taglineEn: "The original color-focus challenge: find the answer among similar colors.",
    descriptionKo: "컬러마스터2 이전에 만든 원작 버전입니다. 클래식한 색상 판별 플레이와 랭킹 페이지를 지금도 즐길 수 있습니다.",
    descriptionEn: "The original version before Color Master 2. You can still play the classic color challenge and view its ranking page.",
    icon: "assets/icon_colormaster.png",
    playUrl: "https://play.google.com/store/apps/details?id=com.neokim.colormaster",
    detailUrl: "./colormaster/",
    detailCtaKo: "랭킹/소개 보기",
    detailCtaEn: "View Ranking",
    highlightsKo: ["원작 감성", "색상 집중력", "랭킹 페이지", "바로 설치"],
    highlightsEn: ["Original feel", "Color focus", "Ranking page", "Install now"],
    primaryCtaKo: "컬러 마스터 설치",
    primaryCtaEn: "Install Color Master",
    statusNoteKo: "컬러마스터2 이전에 만든 원작 버전입니다. 지금도 Google Play에서 설치할 수 있습니다.",
    statusNoteEn: "This is the original version before Color Master 2, and it is still available on Google Play."
  },
  {
    id: "korean-random-defense",
    status: "testing",
    priority: 5,
    code: "ANDROID006",
    titleKo: "한국사 랜덤 디펜스: 수성전",
    titleEn: "Korean Random Defense: Siege",
    categoryKo: "비공개 테스트 전략 게임",
    categoryEn: "Private test strategy game",
    taglineKo: "한국사 속 수성전을 소재로 한 2D 랜덤 디펜스",
    taglineEn: "A 2D random defense game inspired by Korean fortress battles.",
    descriptionKo: "현재 비공개 테스트 중입니다. 공개 Play 링크가 열리지 않을 수 있어 테스트 참여 문의로 연결합니다.",
    descriptionEn: "Currently in private testing. The public Play link may not open, so use the test contact button.",
    icon: "assets/icon_korean_random_defense.png",
    originalPlayUrl: "https://play.google.com/store/apps/details?id=com.neokim.krd",
    highlightsKo: ["비공개 테스트", "랜덤 디펜스", "한국사 소재", "테스트 문의"],
    highlightsEn: ["Private test", "Random defense", "Korean history", "Contact to join"],
    primaryCtaKo: "테스트 참여 문의",
    primaryCtaEn: "Join Private Test",
    statusNoteKo: "Google Play 공개 링크가 열리지 않을 수 있습니다. 테스트 참여를 원하면 개발자에게 문의하세요.",
    statusNoteEn: "The public Google Play link may not open. Contact the developer to join the test."
  },
  {
    id: "dark-maze",
    status: "testing",
    priority: 6,
    code: "ANDROID005",
    titleKo: "다크 메이즈",
    titleEn: "Dark Maze",
    categoryKo: "비공개 테스트 탈출 게임",
    categoryEn: "Private test escape game",
    taglineKo: "어둠 속 미로에서 출구를 찾는 실험쥐 탈출 게임",
    taglineEn: "Find the exit in a dark maze as a lab rat escape challenge.",
    descriptionKo: "현재 비공개 테스트 중입니다. 공개 Play 링크가 열리지 않을 수 있어 테스트 참여 문의로 연결합니다.",
    descriptionEn: "Currently in private testing. The public Play link may not open, so use the test contact button.",
    icon: "assets/icon_darkmaze.png",
    originalPlayUrl: "https://play.google.com/store/apps/details?id=com.neokim.darkmaze",
    highlightsKo: ["비공개 테스트", "미로 탈출", "아이템", "리더보드 예정"],
    highlightsEn: ["Private test", "Maze escape", "Items", "Leaderboard planned"],
    primaryCtaKo: "테스트 참여 문의",
    primaryCtaEn: "Join Private Test",
    statusNoteKo: "Google Play 공개 링크가 열리지 않을 수 있습니다. 테스트 참여를 원하면 개발자에게 문의하세요.",
    statusNoteEn: "The public Google Play link may not open. Contact the developer to join the test."
  }
];

let currentLanguage = "ko";
let lastFocusedElement = null;

const colorPreviewRounds = [
  { base: "#38e2bd", answer: "#1fb797", answerIndex: 6 },
  { base: "#5fa8ff", answer: "#4e8ee8", answerIndex: 11 },
  { base: "#f26bd9", answer: "#d84fc0", answerIndex: 2 },
  { base: "#ffe15c", answer: "#ebc949", answerIndex: 13 },
  { base: "#a875ff", answer: "#9e6ef0", answerIndex: 8 }
];

document.addEventListener("DOMContentLoaded", () => {
  initLanguage();
  renderFeaturedApp();
  renderAppCards();
  bindLanguageToggle();
  bindSmoothScroll();
  bindTestContactModal();
  bindPlayClickTracking();
  initColorPreviewLoop();
  initLandingCounter();
});

function initLanguage() {
  const storedLanguage = localStorage.getItem("preferredLanguage");
  const browserLanguage = navigator.language || navigator.userLanguage || "ko";
  currentLanguage = storedLanguage || (browserLanguage.startsWith("ko") ? "ko" : "en");
  setLanguage(currentLanguage);
}

function renderFeaturedApp() {
  const app = apps.find((item) => item.id === "color-master-2") || apps[0];
  const featuredContainer = document.getElementById("featuredApp");
  const heroPrimaryCta = document.getElementById("heroPrimaryCta");

  if (heroPrimaryCta) {
    heroPrimaryCta.href = buildPlayUrl(app, "home_hero");
    heroPrimaryCta.dataset.utmContent = "home_hero";
  }

  if (!featuredContainer) {
    return;
  }

  featuredContainer.innerHTML = `
    <div class="featured-layout">
      <div class="featured-visual" role="img" ${localizedAria("컬러마스터2 색상 타일 챌린지 휴대폰 목업", "Color Master 2 color tile challenge phone mockup")}>
        ${renderPhoneMockup(app)}
      </div>
      <div class="featured-copy">
        <span class="featured-badge">${localizedText("추천", "Featured")}</span>
        <h3>${localizedText("컬러마스터2", "Color Master 2")}</h3>
        <p class="featured-tagline">${localizedText("10초 안에 다른 색을 찾아보세요.", "Find the different color in 10 seconds.")}</p>
        <p class="featured-description">${localizedText("한 번 틀리면 끝나는 원라이프 색상 판별 퍼즐입니다. 짧게 시작하지만, 기록을 깨고 싶어서 계속 다시 하게 되는 구조입니다.", "A one-life color puzzle where one mistake ends the run. It starts fast, then keeps pulling you back to beat your record.")}</p>
        ${renderHighlights(app, "highlight-list")}
        <div class="featured-actions">
          <a class="card-cta is-primary play-cta" href="${buildPlayUrl(app, "home_featured")}" target="_blank" rel="noopener" data-app-id="${app.id}" data-event="play_click" data-utm-content="home_featured" ${localizedAria("컬러마스터2 Google Play에서 설치", "Install Color Master 2 on Google Play")}>${localizedText("Google Play에서 설치", "Install on Google Play")}</a>
          <a class="card-cta is-secondary" href="#apps">${localizedText("전체 앱 보기", "Browse Apps")}</a>
        </div>
      </div>
    </div>
  `;

  setLanguage(currentLanguage);
}

function renderAppCards() {
  const appGrid = document.getElementById("appGrid");

  if (!appGrid) {
    return;
  }

  appGrid.innerHTML = apps
    .slice()
    .sort((a, b) => a.priority - b.priority)
    .map((app) => renderAppCard(app))
    .join("");

  setLanguage(currentLanguage);
}

function setLanguage(lang) {
  const normalizedLanguage = lang === "en" ? "en" : "ko";
  currentLanguage = normalizedLanguage;
  document.documentElement.lang = normalizedLanguage;
  localStorage.setItem("preferredLanguage", normalizedLanguage);

  const title = document.querySelector("title");
  if (title?.dataset[`lang${suffix(normalizedLanguage)}`]) {
    document.title = title.dataset[`lang${suffix(normalizedLanguage)}`];
  }

  document.querySelectorAll(`[data-lang-${normalizedLanguage}]`).forEach((element) => {
    element.textContent = element.getAttribute(`data-lang-${normalizedLanguage}`);
  });

  document.querySelectorAll(`[data-lang-${normalizedLanguage}-alt]`).forEach((element) => {
    element.setAttribute("alt", element.getAttribute(`data-lang-${normalizedLanguage}-alt`));
  });

  document.querySelectorAll(`[data-lang-${normalizedLanguage}-aria]`).forEach((element) => {
    element.setAttribute("aria-label", element.getAttribute(`data-lang-${normalizedLanguage}-aria`));
  });

  document.querySelectorAll(".lang-toggle").forEach((button) => {
    const isActive = button.dataset.langTarget === normalizedLanguage;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function bindLanguageToggle() {
  document.querySelectorAll(".lang-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      setLanguage(button.dataset.langTarget);
    });
  });
}

function bindSmoothScroll() {
  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');

    if (!link) {
      return;
    }

    const targetId = link.getAttribute("href");
    const target = targetId.length > 1 ? document.querySelector(targetId) : null;

    if (!target) {
      return;
    }

    event.preventDefault();
    target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    history.pushState(null, "", targetId);
  });
}

function bindTestContactModal() {
  const modal = document.getElementById("testContactModal");
  const modalPanel = modal?.querySelector(".contact-modal__panel");
  const modalAppName = document.getElementById("testContactApp");
  const copyButton = document.getElementById("copyEmailButton");
  const copyConfirmation = document.getElementById("copyConfirmation");

  if (!modal || !modalPanel) {
    return;
  }

  document.addEventListener("click", (event) => {
    const contactButton = event.target.closest("[data-action='test-contact']");
    if (!contactButton) {
      return;
    }

    event.preventDefault();
    const app = apps.find((item) => item.id === contactButton.dataset.appId);
    lastFocusedElement = contactButton;

    if (modalAppName && app) {
      modalAppName.textContent = localize(app, "title");
    }

    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    modalPanel.focus();
  });

  modal.addEventListener("click", (event) => {
    if (event.target.closest("[data-modal-close]")) {
      closeTestContactModal(modal);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) {
      closeTestContactModal(modal);
    }
  });

  copyButton?.addEventListener("click", () => {
    copyTextToClipboard(developerEmail).then(() => {
      if (!copyConfirmation) {
        return;
      }

      copyConfirmation.classList.add("show");
      window.setTimeout(() => copyConfirmation.classList.remove("show"), 2400);
    });
  });
}

function bindPlayClickTracking() {
  document.addEventListener("click", (event) => {
    const playLink = event.target.closest("[data-event='play_click']");

    if (!playLink) {
      return;
    }

    console.log("play_click", {
      appId: playLink.dataset.appId,
      href: playLink.href,
      placement: playLink.dataset.utmContent || (playLink.closest(".hero-section") ? "home_hero" : playLink.closest(".featured-app") ? "home_featured" : "home_card")
    });
  });
}

function initColorPreviewLoop() {
  const previewGrids = document.querySelectorAll(".color-tile-grid");

  previewGrids.forEach((grid, previewIndex) => {
    const tiles = Array.from(grid.children);
    const phoneScreen = grid.closest(".phone-screen");
    const timer = phoneScreen?.querySelector(".phone-timer");
    let roundIndex = previewIndex % colorPreviewRounds.length;
    let remainingSeconds = 10;
    let resetTimerId = null;

    if (tiles.length !== 16 || !timer) {
      return;
    }

    const paintRound = () => {
      const round = colorPreviewRounds[roundIndex];
      timer.textContent = `00:${String(remainingSeconds).padStart(2, "0")}`;
      phoneScreen?.classList.toggle("is-final-second", remainingSeconds <= 1);

      tiles.forEach((tile, tileIndex) => {
        const isAnswer = tileIndex === round.answerIndex;

        tile.style.setProperty("--tile-color", isAnswer ? round.answer : round.base);
        tile.classList.toggle("is-answer", isAnswer);
        tile.classList.toggle("is-hinted", isAnswer && remainingSeconds <= 1);
      });
    };

    paintRound();

    if (prefersReducedMotion()) {
      remainingSeconds = 1;
      paintRound();
      return;
    }

    window.setInterval(() => {
      if (resetTimerId) {
        return;
      }

      remainingSeconds -= 1;

      if (remainingSeconds <= 0) {
        remainingSeconds = 0;
        paintRound();
        phoneScreen?.classList.add("is-round-changing");

        resetTimerId = window.setTimeout(() => {
          roundIndex = (roundIndex + 1) % colorPreviewRounds.length;
          remainingSeconds = 10;
          phoneScreen?.classList.remove("is-round-changing");
          resetTimerId = null;
          paintRound();
        }, 520);

        return;
      }

      paintRound();
    }, 1000);
  });
}

function initLandingCounter() {
  const counter = document.getElementById("instability-counter");
  let count = 0;

  if (!counter) {
    return;
  }

  counter.textContent = `${count.toLocaleString("en-US")}%`;

  window.setInterval(() => {
    count += 1;
    counter.textContent = `${count.toLocaleString("en-US")}%`;
  }, 1000);
}

function buildPlayUrl(app, placement = "home_card") {
  if (!app?.playUrl) {
    return app?.playUrl || "#";
  }

  try {
    const url = new URL(app.playUrl);

    if (url.hostname !== "play.google.com") {
      return app.playUrl;
    }

    const referrer = new URLSearchParams({
      utm_source: "neokim_site",
      utm_medium: "landing",
      utm_campaign: app.campaign || app.id.replaceAll("-", "_"),
      utm_content: placement
    }).toString();

    url.searchParams.set("referrer", referrer);
    return url.toString();
  } catch (error) {
    return app.playUrl;
  }
}

function buildMailto(app) {
  const subject = encodeURIComponent(`Private test request - ${app?.titleEn || "NeoKIM App Lab"}`);
  return `mailto:${developerEmail}?subject=${subject}`;
}

function renderAppCard(app) {
  const isInstallable = app.status === "live" || app.status === "classic";
  const isTesting = app.status === "testing" || app.status === "coming-soon";
  const href = isInstallable ? buildPlayUrl(app, "home_card") : app.playUrl;
  const opensExternally = /^https?:\/\//.test(href || "");
  const detailLink = app.detailUrl
    ? `<a class="card-cta is-secondary" href="${escapeAttr(app.detailUrl)}">${localizedText(app.detailCtaKo || "웹에서 먼저 체험", app.detailCtaEn || "Try Web Demo")}</a>`
    : "";
  const cta = isTesting
    ? `<a class="card-cta is-secondary" href="${escapeAttr(buildMailto(app))}" data-action="test-contact" data-app-id="${escapeAttr(app.id)}" ${localizedAria(app.primaryCtaKo, app.primaryCtaEn)}>${localizedText(app.primaryCtaKo, app.primaryCtaEn)}</a>`
    : `<a class="card-cta ${isInstallable ? "is-primary play-cta" : "is-secondary"}" href="${escapeAttr(href)}" ${opensExternally ? 'target="_blank" rel="noopener" data-event="play_click" data-utm-content="home_card"' : ""} data-app-id="${escapeAttr(app.id)}" ${localizedAria(app.primaryCtaKo, app.primaryCtaEn)}>${localizedText(app.primaryCtaKo, app.primaryCtaEn)}</a>`;

  return `
    <article class="cyber-card" data-card-id="${escapeAttr(app.code)}" data-app-id="${escapeAttr(app.id)}">
      <div class="card-content">
        <div class="card-header-area">
          <span class="card-id">#${escapeHtml(app.code)}</span>
          <div class="card-badges">
            ${app.recommended ? `<span class="status-badge is-recommended">${localizedText("추천", "Recommended")}</span>` : ""}
            ${renderStatusBadge(app.status)}
          </div>
        </div>
        <img class="card-icon" src="${escapeAttr(app.icon)}" alt="${escapeAttr(localize(app, "title"))} 아이콘" width="74" height="74" loading="lazy" data-lang-ko-alt="${escapeAttr(app.titleKo)} 아이콘" data-lang-en-alt="${escapeAttr(app.titleEn)} icon">
        <h3 class="card-title">${localizedText(app.titleKo, app.titleEn)}</h3>
        <p class="card-category">${localizedText(app.categoryKo, app.categoryEn)}</p>
        <p class="card-tagline">${localizedText(app.taglineKo, app.taglineEn)}</p>
        ${renderHighlights(app, "card-highlights", 4)}
        <p class="card-note">${localizedText(app.statusNoteKo, app.statusNoteEn)}</p>
        <div class="card-actions">${cta}${detailLink}</div>
      </div>
    </article>
  `;
}

function renderPhoneMockup(app) {
  return `
    <div class="phone-shell">
      <div class="phone-speaker" aria-hidden="true"></div>
      <div class="phone-screen">
        <img class="phone-app-icon" src="${escapeAttr(app.icon)}" alt="${escapeAttr(app.titleKo)} 아이콘" width="78" height="78" loading="lazy" data-lang-ko-alt="${escapeAttr(app.titleKo)} 아이콘" data-lang-en-alt="${escapeAttr(app.titleEn)} icon">
        <div class="phone-title">${escapeHtml(app.titleEn)}</div>
        <div class="phone-timer">00:10</div>
        <div class="color-tile-grid" aria-hidden="true">
          <span></span><span></span><span></span><span></span>
          <span></span><span></span><span></span><span></span>
          <span></span><span></span><span></span><span></span>
          <span></span><span></span><span></span><span></span>
        </div>
      </div>
    </div>
  `;
}

function renderHighlights(app, className, maxItems) {
  const koItems = app.highlightsKo.slice(0, maxItems || app.highlightsKo.length);
  const enItems = app.highlightsEn.slice(0, maxItems || app.highlightsEn.length);

  return `
    <ul class="${className}">
      ${koItems.map((item, index) => `<li>${localizedText(item, enItems[index])}</li>`).join("")}
    </ul>
  `;
}

function renderStatusBadge(status) {
  const statusMap = {
    live: { ko: "LIVE", en: "LIVE", className: "is-live" },
    classic: { ko: "클래식", en: "Classic", className: "is-classic" },
    legacy: { ko: "클래식", en: "Classic", className: "is-classic" },
    testing: { ko: "비공개 테스트", en: "Private Test", className: "is-testing" },
    "coming-soon": { ko: "준비 중", en: "Coming Soon", className: "is-testing" }
  };
  const statusInfo = statusMap[status] || statusMap.live;

  return `<span class="status-badge ${statusInfo.className}">${localizedText(statusInfo.ko, statusInfo.en)}</span>`;
}

function closeTestContactModal(modal) {
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");

  if (lastFocusedElement) {
    lastFocusedElement.focus();
  }
}

function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.top = "-999px";
  textArea.style.left = "-999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    document.execCommand("copy");
  } finally {
    document.body.removeChild(textArea);
  }

  return Promise.resolve();
}

function localizedText(ko, en) {
  const text = currentLanguage === "en" ? en : ko;
  return `<span data-lang-ko="${escapeAttr(ko)}" data-lang-en="${escapeAttr(en)}">${escapeHtml(text)}</span>`;
}

function localizedAria(ko, en) {
  const text = currentLanguage === "en" ? en : ko;
  return `data-lang-ko-aria="${escapeAttr(ko)}" data-lang-en-aria="${escapeAttr(en)}" aria-label="${escapeAttr(text)}"`;
}

function localize(app, key) {
  const languageSuffix = currentLanguage === "en" ? "En" : "Ko";
  return app[`${key}${languageSuffix}`] || app[`${key}Ko`] || "";
}

function suffix(lang) {
  return lang === "en" ? "En" : "Ko";
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}
