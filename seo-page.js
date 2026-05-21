const playLinks = {
  colorMaster2: {
    appId: "color-master-2",
    baseUrl: "https://play.google.com/store/apps/details?id=com.codexdev.color_master2",
    campaign: "color_master2"
  },
  galacticode: {
    appId: "galacticode",
    baseUrl: "https://play.google.com/store/apps/details?id=com.galactic.speak",
    campaign: "galacticode"
  },
  callTheUfo: {
    appId: "call-the-ufo",
    baseUrl: "https://play.google.com/store/apps/details?id=com.call_the_ufo",
    campaign: "call_the_ufo"
  }
};

const colorRounds = [
  { base: "#38e2bd", answer: "#1fb797" },
  { base: "#5fa8ff", answer: "#4e8ee8" },
  { base: "#f26bd9", answer: "#d84fc0" },
  { base: "#ffe15c", answer: "#ebc949" },
  { base: "#a875ff", answer: "#9e6ef0" }
];

const alienGlyphs = ["⟁", "⌁", "◇", "◌", "⟐", "⋔", "⧫", "⌬", "◍", "⟡", "⋇", "⟁", "⌖", "◈"];

document.addEventListener("DOMContentLoaded", () => {
  bindPlayLinks();
  initColorTest();
  initGalacticodeTool();
  initUfoTool();
  initMobileStickyCta();
});

function bindPlayLinks() {
  document.querySelectorAll("[data-play-target]").forEach((link) => {
    const target = link.dataset.playTarget;
    const playInfo = playLinks[target];
    const rawHref = link.getAttribute("href") || "";

    if (playInfo && (!rawHref || rawHref === "#")) {
      link.href = buildPlayUrl(playInfo, link.dataset.utmContent || "seo_page");
    }

    if (playInfo && !link.dataset.appId) {
      link.dataset.appId = playInfo.appId;
    }

    if (!link.dataset.event) {
      link.dataset.event = "play_click";
    }

    link.addEventListener("click", () => {
      console.log("seo_play_click", {
        target,
        appId: link.dataset.appId,
        href: link.href,
        placement: link.dataset.utmContent,
        page: document.body.dataset.page
      });
    });
  });
}

function buildPlayUrl(playInfo, placement) {
  const url = new URL(playInfo.baseUrl);
  const referrer = new URLSearchParams({
    utm_source: "neokim_site",
    utm_medium: "landing",
    utm_campaign: playInfo.campaign,
    utm_content: placement
  }).toString();

  url.searchParams.set("referrer", referrer);
  return url.toString();
}

function initColorTest() {
  const grid = document.getElementById("colorTestGrid");
  const timer = document.getElementById("colorTestTimer");
  const result = document.getElementById("colorTestResult");
  const restartButton = document.getElementById("colorTestRestart");
  const installPrompt = document.getElementById("colorInstallPrompt");
  const installTitle = document.getElementById("colorInstallTitle");
  const installSummary = document.getElementById("colorInstallSummary");
  const installDetail = document.getElementById("colorInstallDetail");

  if (!grid || !timer || !result || !restartButton) {
    return;
  }

  let answerIndex = 0;
  let startTime = 0;
  let timeLeft = 10;
  let intervalId = null;
  let roundIndex = 0;
  let active = false;

  const startRound = () => {
    const round = colorRounds[roundIndex % colorRounds.length];
    answerIndex = Math.floor(Math.random() * 16);
    startTime = performance.now();
    timeLeft = 10;
    active = true;
    result.textContent = "정답이라고 생각하는 색상 칸을 눌러보세요.";
    installPrompt?.setAttribute("hidden", "");
    timer.textContent = "00:10";
    grid.innerHTML = "";

    window.clearInterval(intervalId);
    intervalId = window.setInterval(() => {
      timeLeft -= 1;
      timer.textContent = `00:${String(Math.max(timeLeft, 0)).padStart(2, "0")}`;

      if (timeLeft <= 0) {
        active = false;
        window.clearInterval(intervalId);
        revealAnswer();
        result.textContent = "시간 종료! 다시 한 번 색상 구별에 도전해보세요.";
        showColorInstallPrompt("timeout");
      }
    }, 1000);

    for (let index = 0; index < 16; index += 1) {
      const button = document.createElement("button");
      const isAnswer = index === answerIndex;
      button.type = "button";
      button.className = "color-cell";
      button.style.setProperty("--tile-color", isAnswer ? round.answer : round.base);
      button.setAttribute("aria-label", `${index + 1}번 색상 칸`);
      button.addEventListener("click", () => selectColor(index));
      grid.appendChild(button);
    }
  };

  const selectColor = (index) => {
    if (!active) {
      return;
    }

    active = false;
    window.clearInterval(intervalId);
    revealAnswer();

    if (index === answerIndex) {
      const seconds = Math.max(0.1, (performance.now() - startTime) / 1000).toFixed(1);
      result.textContent = `당신의 색감 반응 속도는 ${seconds}초입니다. 앱에서 랭킹에 도전해보세요.`;
      showColorInstallPrompt("correct");
      roundIndex += 1;
      return;
    }

    result.textContent = "아깝습니다. 정답 칸을 확인하고 다시 도전해보세요.";
    showColorInstallPrompt("wrong");
  };

  const revealAnswer = () => {
    const answer = grid.children[answerIndex];
    answer?.classList.add("is-correct");
  };

  const showColorInstallPrompt = (state) => {
    if (!installPrompt || !installTitle || !installSummary || !installDetail) {
      return;
    }

    if (state === "correct") {
      installTitle.textContent = "정답입니다!";
      installSummary.textContent = "당신은 10초 안에 다른 색을 찾았습니다.";
      installDetail.textContent = "앱에서는 더 어려운 색상 단계와 랭킹 도전을 할 수 있습니다.";
    } else {
      installTitle.textContent = "아쉽습니다.";
      installSummary.textContent = "비슷한 색이라 쉽게 헷갈릴 수 있습니다.";
      installDetail.textContent = "앱에서 다시 도전하고 최고 기록을 남겨보세요.";
    }

    installPrompt.removeAttribute("hidden");
  };

  restartButton.addEventListener("click", startRound);
  startRound();
}

function initGalacticodeTool() {
  const input = document.getElementById("galacticInput");
  const output = document.getElementById("galacticOutput");
  const copyButton = document.getElementById("galacticCopy");
  const installPrompt = document.getElementById("galacticInstallPrompt");

  if (!input || !output || !copyButton) {
    return;
  }

  const convert = () => {
    const value = input.value.trim() || "안녕?";
    const converted = Array.from(value)
      .map((char, index) => {
        if (char === " ") {
          return " / ";
        }

        const code = char.codePointAt(0) || 0;
        return alienGlyphs[(code + index) % alienGlyphs.length];
      })
      .join(" ");

    output.textContent = converted;
  };

  input.addEventListener("input", convert);
  copyButton.addEventListener("click", async () => {
    await copyText(output.textContent);
    installPrompt?.removeAttribute("hidden");
    copyButton.textContent = "복사 완료";
    window.setTimeout(() => {
      copyButton.textContent = "결과 복사";
    }, 1600);
  });

  convert();
}

function initUfoTool() {
  const stage = document.getElementById("ufoStage");
  const button = document.getElementById("ufoButton");
  const log = document.getElementById("ufoLog");
  const installPrompt = document.getElementById("ufoInstallPrompt");

  if (!stage || !button || !log) {
    return;
  }

  let callCount = 0;
  const logs = [
    "신호 송신 중... 3.72GHz",
    "대기권 반사파 감지",
    "응답 없음. 한 번 더 보내볼까요?",
    "미확인 신호가 아주 약하게 잡혔습니다"
  ];

  button.addEventListener("click", () => {
    stage.classList.add("is-calling");
    log.textContent = logs[callCount % logs.length];
    installPrompt?.removeAttribute("hidden");
    callCount += 1;

    window.setTimeout(() => {
      stage.classList.remove("is-calling");
    }, 2600);
  });
}

function initMobileStickyCta() {
  const stickyCta = document.querySelector("[data-mobile-sticky]");
  const closeButton = stickyCta?.querySelector("[data-mobile-sticky-close]");

  if (!stickyCta) {
    return;
  }

  let dismissed = false;
  const mobileQuery = window.matchMedia("(max-width: 768px)");

  const updateVisibility = () => {
    const shouldShow = !dismissed && mobileQuery.matches && window.scrollY > 300;
    stickyCta.hidden = !shouldShow;
    stickyCta.classList.toggle("is-visible", shouldShow);
    document.body.classList.toggle("has-mobile-sticky", shouldShow);
  };

  closeButton?.addEventListener("click", () => {
    dismissed = true;
    updateVisibility();
  });

  window.addEventListener("scroll", updateVisibility, { passive: true });
  window.addEventListener("resize", updateVisibility);
  updateVisibility();
}

function copyText(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
  return Promise.resolve();
}
