const developerEmail = "wlgnsl14@gmail.com";
const i18nConfig = window.NEOKIM_I18N || {};
const locales = Array.isArray(i18nConfig.locales) ? i18nConfig.locales : [];
const translations = {
  ...(i18nConfig.translations || {}),
  ...(window.NEOKIM_I18N_TRANSLATIONS || {})
};
const defaultLocale = i18nConfig.defaultLocale || "en-US";
const storageKey = i18nConfig.storageKey || "preferredLocale";
const legacyStorageKey = i18nConfig.legacyStorageKey || "preferredLanguage";
const recommendedLocales = i18nConfig.recommendedLocales || ["ko", "en-US"];
const baseFallbacks = i18nConfig.baseFallbacks || {};
const localeByCode = new Map(locales.map((locale) => [locale.code, locale]));
const localeCodes = new Set(locales.map((locale) => locale.code));
const languageDisplayNamesByLocale = new Map();
const localeGroups = ["Asia", "Europe", "Middle East", "Africa", "Other"];
const regionGroupKeyMap = {
  Asia: "language.asia",
  Europe: "language.europe",
  "Middle East": "language.middleEast",
  Africa: "language.africa",
  Other: "language.other"
};

const apps = [
  {
    id: "color-master-2",
    status: "live",
    priority: 1,
    code: "ANDROID004",
    campaign: "color_master2",
    recommended: true,
    i18nKey: "apps.colorMaster2",
    icon: "assets/icon_colormaster2.png",
    playUrl: "https://play.google.com/store/apps/details?id=com.codexdev.color_master2",
    detailUrl: "./color-master-2/"
  },
  {
    id: "galacticode",
    status: "live",
    priority: 2,
    code: "ANDROID002",
    campaign: "galacticode",
    i18nKey: "apps.galaxyCode",
    icon: "assets/icon_galacticode.png",
    playUrl: "https://play.google.com/store/apps/details?id=com.galactic.speak",
    detailUrl: "./galacticode/"
  },
  {
    id: "call-the-ufo",
    status: "live",
    priority: 3,
    code: "ANDROID001",
    campaign: "call_the_ufo",
    i18nKey: "apps.ufoSignal",
    icon: "assets/icon_calltheufo.png",
    playUrl: "https://play.google.com/store/apps/details?id=com.call_the_ufo",
    detailUrl: "./call-the-ufo/"
  },
  {
    id: "color-master-classic",
    status: "classic",
    priority: 4,
    code: "ANDROID003",
    campaign: "colormaster",
    i18nKey: "apps.colorMasterClassic",
    icon: "assets/icon_colormaster.png",
    playUrl: "https://play.google.com/store/apps/details?id=com.neokim.colormaster",
    detailUrl: "./colormaster/"
  },
  {
    id: "korean-random-defense",
    status: "testing",
    priority: 5,
    code: "ANDROID006",
    i18nKey: "apps.koreanRandomDefense",
    icon: "assets/icon_korean_random_defense.png",
    originalPlayUrl: "https://play.google.com/store/apps/details?id=com.neokim.krd"
  },
  {
    id: "lucky-card-random-defense",
    status: "testing",
    priority: 6,
    code: "ANDROID007",
    i18nKey: "apps.luckyCardRandomDefense",
    icon: "assets/icon_lucky_card_random_defense.png",
    originalPlayUrl: "https://play.google.com/store/apps/details?id=com.neokim.luckycarddefense"
  },
  {
    id: "dark-maze",
    status: "live",
    priority: 7,
    code: "ANDROID005",
    campaign: "darkmaze",
    i18nKey: "apps.darkMaze",
    icon: "assets/icon_darkmaze.png",
    playUrl: "https://play.google.com/store/apps/details?id=com.neokim.darkmaze"
  }
];

let currentLocale = defaultLocale;
let lastFocusedElement = null;
let lastLanguageTrigger = null;

const colorPreviewRounds = [
  { base: "#38e2bd", answer: "#1fb797", answerIndex: 6 },
  { base: "#5fa8ff", answer: "#4e8ee8", answerIndex: 11 },
  { base: "#f26bd9", answer: "#d84fc0", answerIndex: 2 },
  { base: "#ffe15c", answer: "#ebc949", answerIndex: 13 },
  { base: "#a875ff", answer: "#9e6ef0", answerIndex: 8 }
];

document.addEventListener("DOMContentLoaded", () => {
  const initialLocale = getInitialLocale();
  currentLocale = initialLocale.locale;

  renderLanguageSelector();
  renderSupportedLanguages();
  renderFeaturedApp();
  renderAppCards();
  applyLocale(currentLocale, {
    persist: false,
    updateUrl: initialLocale.fromUrl
  });

  bindLanguageSelector();
  bindSmoothScroll();
  bindTestContactModal();
  bindPlayClickTracking();
  initColorPreviewLoop();
  initLandingCounter();
});

function getInitialLocale() {
  const params = new URLSearchParams(window.location.search);
  const urlLocale = params.get("lang");

  if (urlLocale) {
    return { locale: resolveLocale(urlLocale), fromUrl: true };
  }

  const storedLocale = localStorage.getItem(storageKey) || localStorage.getItem(legacyStorageKey);
  if (storedLocale) {
    return { locale: resolveLocale(storedLocale), fromUrl: false };
  }

  const browserLocales = Array.isArray(navigator.languages) && navigator.languages.length
    ? navigator.languages
    : [navigator.language || navigator.userLanguage || defaultLocale];

  for (const browserLocale of browserLocales) {
    const resolvedLocale = resolveLocale(browserLocale, null);
    if (resolvedLocale) {
      return { locale: resolvedLocale, fromUrl: false };
    }
  }

  return { locale: defaultLocale, fromUrl: false };
}

function resolveLocale(localeValue, finalFallback = defaultLocale, visited = new Set()) {
  if (!localeValue) {
    return finalFallback;
  }

  const normalized = normalizeLocale(localeValue);
  if (!normalized || visited.has(normalized)) {
    return finalFallback;
  }

  visited.add(normalized);

  if (localeCodes.has(normalized)) {
    return normalized;
  }

  const lowerMatch = locales.find((locale) => locale.code.toLowerCase() === normalized.toLowerCase());
  if (lowerMatch) {
    return lowerMatch.code;
  }

  const baseLanguage = normalized.split("-")[0];
  const fallbackTarget = baseFallbacks[baseLanguage];
  if (fallbackTarget) {
    const resolvedFallback = resolveLocale(fallbackTarget, null, visited);
    if (resolvedFallback) {
      return resolvedFallback;
    }
  }

  if (localeCodes.has(baseLanguage)) {
    return baseLanguage;
  }

  const baseMatch = locales.find((locale) => locale.code.split("-")[0] === baseLanguage);
  return baseMatch?.code || finalFallback;
}

function normalizeLocale(localeValue) {
  const cleaned = String(localeValue).trim().replace(/_/g, "-");
  if (!cleaned) {
    return "";
  }

  const parts = cleaned.split("-");
  return parts
    .map((part, index) => {
      if (index === 0) {
        return part.toLowerCase();
      }

      if (/^\d+$/.test(part)) {
        return part;
      }

      return part.length === 2 ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1).toLowerCase();
    })
    .join("-");
}

function applyLocale(localeCode, options = {}) {
  const resolvedLocale = resolveLocale(localeCode);
  currentLocale = resolvedLocale;
  const locale = getLocaleMeta(resolvedLocale);

  document.documentElement.lang = resolvedLocale;
  document.documentElement.dir = locale.rtl ? "rtl" : "ltr";

  if (options.persist) {
    localStorage.setItem(storageKey, resolvedLocale);
  }

  if (options.updateUrl) {
    updateUrlLocale(resolvedLocale);
  }

  updateTranslatedNodes();
  updateLocalizedAttributes();
  updateMetadata();
  updateLanguageControls();
  updateTestingMailtoLinks();
}

function setLocale(localeCode, options = {}) {
  const resolvedLocale = resolveLocale(localeCode);
  currentLocale = resolvedLocale;
  renderFeaturedApp();
  renderAppCards();
  applyLocale(resolvedLocale, {
    persist: options.persist !== false,
    updateUrl: options.updateUrl !== false
  });
}

function updateUrlLocale(localeCode) {
  const url = new URL(window.location.href);
  url.searchParams.set("lang", localeCode);
  history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function updateTranslatedNodes() {
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
}

function updateLocalizedAttributes() {
  document.querySelectorAll("[data-i18n-attr]").forEach((element) => {
    const bindings = element.dataset.i18nAttr.split(";").map((binding) => binding.trim()).filter(Boolean);

    bindings.forEach((binding) => {
      const [attributeName, key] = binding.split(":").map((part) => part.trim());
      if (!attributeName || !key) {
        return;
      }

      element.setAttribute(attributeName, t(key));
    });
  });
}

function updateMetadata() {
  document.title = t("seo.title");
  setMetaContent('meta[name="description"]', t("seo.description"));
  setMetaContent('meta[property="og:title"]', t("seo.ogTitle"));
  setMetaContent('meta[property="og:description"]', t("seo.ogDescription"));
  setMetaContent('meta[name="twitter:title"]', t("seo.ogTitle"));
  setMetaContent('meta[name="twitter:description"]', t("seo.description"));
}

function setMetaContent(selector, content) {
  const element = document.querySelector(selector);
  if (element) {
    element.setAttribute("content", content);
  }
}

function updateLanguageControls() {
  const locale = getLocaleMeta(currentLocale);
  const currentName = document.getElementById("currentLanguageName");
  const trigger = document.getElementById("languageTrigger");

  if (currentName) {
    currentName.textContent = locale.nativeName;
  }

  if (trigger) {
    trigger.setAttribute("aria-label", `${t("language.buttonLabel")}: ${locale.nativeName}`);
  }

  document.querySelectorAll("[data-locale-option]").forEach((button) => {
    const isCurrent = button.dataset.localeOption === currentLocale;
    button.classList.toggle("is-current", isCurrent);
    button.setAttribute("aria-current", isCurrent ? "true" : "false");
  });
}

function updateTestingMailtoLinks() {
  document.querySelectorAll("[data-action='test-contact']").forEach((link) => {
    const app = apps.find((item) => item.id === link.dataset.appId);
    if (app) {
      link.href = buildMailto(app);
    }
  });

  const emailButton = document.getElementById("emailDeveloperButton");
  const activeApp = apps.find((item) => item.id === emailButton?.dataset.appId);
  if (emailButton && activeApp) {
    emailButton.href = buildMailto(activeApp);
  }
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
      <div class="featured-visual" role="img" data-i18n-attr="aria-label:featured.visualAria" aria-label="${escapeAttr(t("featured.visualAria"))}">
        ${renderPhoneMockup(app)}
      </div>
      <div class="featured-copy">
        <span class="featured-badge" data-i18n="featured.badge">${escapeHtml(t("featured.badge"))}</span>
        <h3 data-i18n="featured.appName">${escapeHtml(t("featured.appName"))}</h3>
        <p class="featured-tagline" data-i18n="featured.short">${escapeHtml(t("featured.short"))}</p>
        <p class="featured-description" data-i18n="featured.description">${escapeHtml(t("featured.description"))}</p>
        ${renderHighlights(app, "highlight-list")}
        <div class="featured-actions">
          <a class="card-cta is-primary play-cta" href="${buildPlayUrl(app, "home_featured")}" target="_blank" rel="noopener" data-app-id="${escapeAttr(app.id)}" data-event="play_click" data-utm-content="home_featured" data-i18n="featured.primaryCta" data-i18n-attr="aria-label:featured.primaryAria" aria-label="${escapeAttr(t("featured.primaryAria"))}">${escapeHtml(t("featured.primaryCta"))}</a>
          <a class="card-cta is-secondary" href="#apps" data-i18n="featured.secondaryCta">${escapeHtml(t("featured.secondaryCta"))}</a>
        </div>
      </div>
    </div>
  `;
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
}

function renderAppCard(app) {
  const isInstallable = app.status === "live" || app.status === "classic";
  const isTesting = app.status === "testing" || app.status === "coming-soon";
  const href = isInstallable ? buildPlayUrl(app, "home_card") : app.playUrl;
  const opensExternally = /^https?:\/\//.test(href || "");
  const detailLink = app.detailUrl
    ? `<a class="card-cta is-secondary" href="${escapeAttr(app.detailUrl)}" data-i18n="${app.i18nKey}.detailCta">${escapeHtml(t(`${app.i18nKey}.detailCta`, t("common.webDemo")))}</a>`
    : "";
  const cta = isTesting
    ? renderTestingActions(app)
    : `<a class="card-cta ${isInstallable ? "is-primary play-cta" : "is-secondary"}" href="${escapeAttr(href)}" ${opensExternally ? 'target="_blank" rel="noopener" data-event="play_click" data-utm-content="home_card"' : ""} data-app-id="${escapeAttr(app.id)}" data-i18n="${app.i18nKey}.primaryCta" data-i18n-attr="aria-label:${app.i18nKey}.primaryCta" aria-label="${escapeAttr(t(`${app.i18nKey}.primaryCta`))}">${escapeHtml(t(`${app.i18nKey}.primaryCta`))}</a>`;

  return `
    <article class="cyber-card" data-card-id="${escapeAttr(app.code)}" data-app-id="${escapeAttr(app.id)}">
      <div class="card-content">
        <div class="card-header-area">
          <span class="card-id">#${escapeHtml(app.code)}</span>
          <div class="card-badges">
            ${app.recommended ? `<span class="status-badge is-recommended" data-i18n="status.recommended">${escapeHtml(t("status.recommended"))}</span>` : ""}
            ${renderStatusBadge(app.status)}
          </div>
        </div>
        <img class="card-icon" src="${escapeAttr(app.icon)}" alt="${escapeAttr(t(`${app.i18nKey}.iconAlt`))}" width="74" height="74" loading="lazy" data-i18n-attr="alt:${app.i18nKey}.iconAlt">
        <h3 class="card-title" data-i18n="${app.i18nKey}.name">${escapeHtml(t(`${app.i18nKey}.name`))}</h3>
        <p class="card-category" data-i18n="${app.i18nKey}.category">${escapeHtml(t(`${app.i18nKey}.category`))}</p>
        <p class="card-tagline" data-i18n="${app.i18nKey}.tagline">${escapeHtml(t(`${app.i18nKey}.tagline`))}</p>
        ${renderHighlights(app, "card-highlights", 4)}
        <p class="card-note" data-i18n="${app.i18nKey}.statusNote">${escapeHtml(t(`${app.i18nKey}.statusNote`))}</p>
        <div class="card-actions">${cta}${detailLink}</div>
      </div>
    </article>
  `;
}

function renderTestingActions(app) {
  const contactButton = `<a class="card-cta is-secondary" href="${escapeAttr(buildMailto(app))}" data-action="test-contact" data-app-id="${escapeAttr(app.id)}" data-i18n="${app.i18nKey}.primaryCta" data-i18n-attr="aria-label:${app.i18nKey}.primaryCta" aria-label="${escapeAttr(t(`${app.i18nKey}.primaryCta`))}">${escapeHtml(t(`${app.i18nKey}.primaryCta`))}</a>`;
  const joinButton = app.originalPlayUrl && hasTranslation(`${app.i18nKey}.testJoinCta`)
    ? `<a class="card-cta is-primary play-cta" href="${escapeAttr(app.originalPlayUrl)}" target="_blank" rel="noopener" data-event="play_click" data-utm-content="home_test_join" data-app-id="${escapeAttr(app.id)}" data-i18n="${app.i18nKey}.testJoinCta" data-i18n-attr="aria-label:${app.i18nKey}.testJoinCta" aria-label="${escapeAttr(t(`${app.i18nKey}.testJoinCta`))}">${escapeHtml(t(`${app.i18nKey}.testJoinCta`))}</a>`
    : "";

  return `${contactButton}${joinButton}`;
}

function renderPhoneMockup(app) {
  return `
    <div class="phone-shell">
      <div class="phone-speaker" aria-hidden="true"></div>
      <div class="phone-screen">
        <img class="phone-app-icon" src="${escapeAttr(app.icon)}" alt="${escapeAttr(t(`${app.i18nKey}.iconAlt`))}" width="78" height="78" loading="lazy" data-i18n-attr="alt:${app.i18nKey}.iconAlt">
        <div class="phone-title">${escapeHtml(t(`${app.i18nKey}.name`))}</div>
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
  const highlights = getTranslationValue(`${app.i18nKey}.highlights`);
  const items = Array.isArray(highlights) ? highlights.slice(0, maxItems || highlights.length) : [];

  return `
    <ul class="${className}">
      ${items.map((item, index) => `<li data-i18n="${app.i18nKey}.highlights.${index}">${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

function renderStatusBadge(status) {
  const statusMap = {
    live: { key: "status.live", className: "is-live" },
    classic: { key: "status.classic", className: "is-classic" },
    legacy: { key: "status.classic", className: "is-classic" },
    testing: { key: "status.testing", className: "is-testing" },
    "coming-soon": { key: "status.comingSoon", className: "is-testing" }
  };
  const statusInfo = statusMap[status] || statusMap.live;

  return `<span class="status-badge ${statusInfo.className}" data-i18n="${statusInfo.key}">${escapeHtml(t(statusInfo.key))}</span>`;
}

function renderLanguageSelector(query = "") {
  const recommendedContainer = document.getElementById("recommendedLanguages");
  const groupedContainer = document.getElementById("languageGroups");
  const noResults = document.getElementById("languageNoResults");
  const normalizedQuery = normalizeSearch(query);
  let renderedCount = 0;

  if (recommendedContainer) {
    const recommended = recommendedLocales
      .map((code) => getLocaleMeta(code))
      .filter(Boolean)
      .filter((locale) => matchesLocaleSearch(locale, normalizedQuery));

    recommendedContainer.innerHTML = recommended.map(renderLanguageButton).join("");
    renderedCount += recommended.length;
  }

  if (groupedContainer) {
    groupedContainer.innerHTML = localeGroups
      .map((group) => {
        const groupLocales = locales
          .filter((locale) => locale.regionGroup === group)
          .filter((locale) => matchesLocaleSearch(locale, normalizedQuery))
          .sort(compareLocales);

        renderedCount += groupLocales.length;

        if (!groupLocales.length) {
          return "";
        }

        return `
          <section class="language-group" aria-labelledby="languageGroup${escapeAttr(group.replace(/\s/g, ""))}">
            <h3 id="languageGroup${escapeAttr(group.replace(/\s/g, ""))}" data-i18n="${regionGroupKeyMap[group]}">${escapeHtml(t(regionGroupKeyMap[group]))}</h3>
            <div class="language-grid">
              ${groupLocales.map(renderLanguageButton).join("")}
            </div>
          </section>
        `;
      })
      .join("");
  }

  if (noResults) {
    noResults.hidden = renderedCount > 0;
  }

  updateLanguageControls();
}

function renderLanguageButton(locale) {
  const fallback = locale.fallback ? ` data-fallback="${escapeAttr(locale.fallback)}"` : "";
  const searchText = getLocaleSearchText(locale);

  return `
    <button type="button" class="language-option" data-locale-option="${escapeAttr(locale.code)}" data-search="${escapeAttr(searchText)}"${fallback}>
      <span class="language-option__native">${escapeHtml(locale.nativeName)}</span>
      <span class="language-option__meta">${escapeHtml(locale.englishName)} · ${escapeHtml(locale.code)}</span>
      <span class="language-option__check" aria-hidden="true">✓</span>
    </button>
  `;
}

function renderSupportedLanguages() {
  const container = document.getElementById("supportedLanguageGrid");

  if (!container) {
    return;
  }

  container.innerHTML = locales
    .slice()
    .sort(compareLocales)
    .map((locale) => `
      <button type="button" class="supported-language" data-locale-option="${escapeAttr(locale.code)}">
        <span>${escapeHtml(locale.nativeName)}</span>
        <small>${escapeHtml(locale.code)}</small>
      </button>
    `)
    .join("");
}

function bindLanguageSelector() {
  const trigger = document.getElementById("languageTrigger");
  const modal = document.getElementById("languageModal");
  const search = document.getElementById("languageSearch");

  trigger?.addEventListener("click", () => openLanguageModal(trigger));

  modal?.addEventListener("click", (event) => {
    if (event.target.closest("[data-language-close]")) {
      closeLanguageModal();
    }
  });

  search?.addEventListener("input", () => {
    renderLanguageSelector(search.value);
  });

  document.addEventListener("click", (event) => {
    const localeButton = event.target.closest("[data-locale-option]");

    if (!localeButton) {
      return;
    }

    setLocale(localeButton.dataset.localeOption, { persist: true, updateUrl: true });
    closeLanguageModal();
  });

  document.addEventListener("keydown", (event) => {
    if (!modal || modal.hidden) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      closeLanguageModal();
      return;
    }

    if (event.key === "Tab") {
      trapFocus(event, modal);
    }
  });
}

function openLanguageModal(trigger) {
  const modal = document.getElementById("languageModal");
  const search = document.getElementById("languageSearch");

  if (!modal) {
    return;
  }

  lastLanguageTrigger = trigger || document.activeElement;
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("language-modal-open");
  renderLanguageSelector("");

  if (search) {
    search.value = "";
    window.setTimeout(() => search.focus(), 0);
  }
}

function closeLanguageModal() {
  const modal = document.getElementById("languageModal");

  if (!modal) {
    return;
  }

  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("language-modal-open");

  if (lastLanguageTrigger) {
    lastLanguageTrigger.focus();
  }
}

function trapFocus(event, container) {
  const focusable = Array.from(container.querySelectorAll("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"))
    .filter((element) => element.offsetParent !== null);

  if (!focusable.length) {
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
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
    target.scrollIntoView({ behavior: "auto", block: "start" });
    history.pushState(null, "", targetId);
  });
}

function bindTestContactModal() {
  const modal = document.getElementById("testContactModal");
  const modalPanel = modal?.querySelector(".contact-modal__panel");
  const modalAppName = document.getElementById("testContactApp");
  const emailButton = document.getElementById("emailDeveloperButton");

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
      modalAppName.textContent = t(`${app.i18nKey}.name`);
    }

    if (emailButton && app) {
      emailButton.href = buildMailto(app);
      emailButton.dataset.appId = app.id;
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
}

function closeTestContactModal(modal) {
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");

  if (lastFocusedElement) {
    lastFocusedElement.focus();
  }
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
      placement: playLink.dataset.utmContent || (playLink.closest(".hero-section") ? "home_hero" : playLink.closest(".featured-app") ? "home_featured" : "home_card"),
      locale: currentLocale
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
    let isActive = !("IntersectionObserver" in window);

    if (tiles.length !== 16 || !timer) {
      return;
    }

    const paintRound = () => {
      const round = colorPreviewRounds[roundIndex];
      timer.textContent = `00:${String(remainingSeconds).padStart(2, "0")}`;
      phoneScreen?.classList.toggle("is-preview-active", isActive);
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

    if ("IntersectionObserver" in window && phoneScreen) {
      const observer = new IntersectionObserver((entries) => {
        isActive = entries.some((entry) => entry.isIntersecting);
        phoneScreen.classList.toggle("is-preview-active", isActive);
        if (isActive) {
          paintRound();
        }
      }, { rootMargin: "160px 0px" });

      observer.observe(phoneScreen);
    } else {
      phoneScreen?.classList.add("is-preview-active");
    }

    window.setInterval(() => {
      if (!isActive || document.hidden || resetTimerId) {
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
  const appName = app ? t(`${app.i18nKey}.name`) : "NeoKIM App Lab";
  const subject = t("privateTest.mailSubject").replace("{appName}", appName);
  const body = t("privateTest.mailBody").replace("{appName}", appName);

  return `mailto:${developerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function t(key, fallback = key) {
  const value = getTranslationValue(key);
  if (typeof value === "string") {
    return value;
  }

  if (value !== undefined && value !== null) {
    return String(value);
  }

  if (fallback !== key) {
    return fallback;
  }

  console.warn(`Missing i18n key: ${key} (${currentLocale})`);
  return key;
}

function hasTranslation(key) {
  return getTranslationValue(key) !== undefined;
}

function getTranslationValue(key) {
  const chain = getLocaleFallbackChain(currentLocale);

  for (const localeCode of chain) {
    const value = getValueByPath(translations[localeCode], key);
    if (value !== undefined) {
      return value;
    }
  }

  return undefined;
}

function getLocaleFallbackChain(localeCode) {
  const chain = [];
  const add = (code) => {
    if (code && !chain.includes(code)) {
      chain.push(code);
    }
  };
  const resolved = resolveLocale(localeCode);
  const locale = getLocaleMeta(resolved);
  const baseLanguage = resolved.split("-")[0];

  add(resolved);
  add(locale.fallback);
  add(baseLanguage);
  add(baseFallbacks[baseLanguage]);
  add(defaultLocale);

  return chain.filter((code) => translations[code]);
}

function getValueByPath(source, key) {
  if (!source) {
    return undefined;
  }

  return key.split(".").reduce((value, part) => {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (Array.isArray(value) && /^\d+$/.test(part)) {
      return value[Number(part)];
    }

    return value[part];
  }, source);
}

function getLocaleMeta(code) {
  return localeByCode.get(resolveLocale(code, defaultLocale)) || localeByCode.get(defaultLocale) || {
    code: defaultLocale,
    nativeName: "English",
    englishName: "English",
    regionGroup: "Other",
    rtl: false
  };
}

function compareLocales(a, b) {
  return a.englishName.localeCompare(b.englishName, "en", { sensitivity: "base" });
}

function matchesLocaleSearch(locale, query) {
  if (!query) {
    return true;
  }

  return getLocaleSearchText(locale).includes(query);
}

function getLocaleSearchText(locale) {
  const baseLanguage = locale.code.split("-")[0];
  const terms = [
    locale.code,
    baseLanguage,
    locale.nativeName,
    locale.englishName,
    locale.fallback,
    getLocalizedLanguageName(locale.code),
    getLocalizedLanguageName(baseLanguage)
  ];

  return normalizeSearch([...new Set(terms.filter(Boolean))].join(" "));
}

function getLocalizedLanguageName(localeCode) {
  const displayNames = getLanguageDisplayNames(currentLocale);

  if (!displayNames) {
    return "";
  }

  const candidates = [
    localeCode,
    toIntlLocaleCode(localeCode)
  ];

  for (const candidate of [...new Set(candidates.filter(Boolean))]) {
    try {
      const name = displayNames.of(candidate);
      if (name) {
        return name;
      }
    } catch (error) {
      // Some legacy or regional tags are not accepted by Intl.DisplayNames.
    }
  }

  return "";
}

function getLanguageDisplayNames(localeCode) {
  const intlLocale = toIntlLocaleCode(localeCode);

  if (!intlLocale || typeof Intl === "undefined" || !("DisplayNames" in Intl)) {
    return null;
  }

  if (languageDisplayNamesByLocale.has(intlLocale)) {
    return languageDisplayNamesByLocale.get(intlLocale);
  }

  try {
    const displayNames = new Intl.DisplayNames([intlLocale, defaultLocale], { type: "language" });
    languageDisplayNamesByLocale.set(intlLocale, displayNames);
    return displayNames;
  } catch (error) {
    languageDisplayNamesByLocale.set(intlLocale, null);
    return null;
  }
}

function toIntlLocaleCode(localeCode) {
  return String(localeCode || "").replace(/^iw\b/i, "he");
}

function normalizeSearch(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
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
