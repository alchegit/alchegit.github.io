(() => {
  const languageStorageKey = "neokim-webtoon-landing-language:v1";
  const dialogue = {
    ko: {
      ordinary: "오늘도 같은 역이었다.",
      awakening: "내가 그린 장면이... 움직여?",
      world: "다음 컷은 내가 정한다."
    },
    en: {
      ordinary: "It was the same station. Again.",
      awakening: "The scene I drew... is moving?",
      world: "I decide what comes next."
    },
    ja: {
      ordinary: "今日も同じ駅だった。",
      awakening: "私が描いた場面が…動いてる？",
      world: "次のコマは、私が決める。"
    }
  };

  const frameByScene = {
    idea: { top: "17%", left: "16%", width: "38%", height: "52%" },
    cut: { top: "9%", left: "43%", width: "44%", height: "40%" },
    dialogue: { top: "25%", left: "32%", width: "50%", height: "34%" },
    hook: { top: "43%", left: "51%", width: "39%", height: "44%" }
  };

  document.addEventListener("DOMContentLoaded", () => {
    const landing = document.querySelector("[data-webtoon-landing]");
    if (!landing) {
      return;
    }

    initHeader();
    initReveal();
    initHero(landing);
    initHeroFlow(landing);
    initStory();
    initDialogue();
  });

  function initHeader() {
    const header = document.querySelector("[data-landing-header]");
    if (!header) {
      return;
    }

    let scheduled = false;
    const update = () => {
      header.classList.toggle("is-compact", window.scrollY > 36);
      scheduled = false;
    };

    window.addEventListener("scroll", () => {
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });
    update();
  }

  function initHeroFlow(landing) {
    const steps = [...landing.querySelectorAll("[data-flow-step]")];
    const flow = landing.querySelector("[data-hero-flow]");
    if (!steps.length || !flow) {
      return;
    }

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let activeIndex = 0;
    const activate = (index) => {
      activeIndex = index % steps.length;
      steps.forEach((step, stepIndex) => {
        step.classList.toggle("is-active", stepIndex === activeIndex);
      });
    };

    steps.forEach((step, index) => {
      step.addEventListener("pointerenter", () => activate(index));
    });

    if (!reducedMotion) {
      window.setInterval(() => {
        if (!document.hidden && flow.getBoundingClientRect().bottom > 0) {
          activate(activeIndex + 1);
        }
      }, 1700);
    }
  }

  function initReveal() {
    const targets = [...document.querySelectorAll("[data-reveal]")];
    if (!targets.length) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      targets.forEach((target) => target.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8%" });

    targets.forEach((target) => observer.observe(target));
  }

  function initHero(landing) {
    const visual = landing.querySelector("[data-hero-visual]");
    const panels = [...landing.querySelectorAll("[data-hero-panel]")];
    const progress = landing.querySelector("[data-hero-progress]");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let activeIndex = 0;
    let scheduled = false;
    let userScrolled = false;
    let autoTimer = null;

    const activate = (index) => {
      activeIndex = Math.max(0, Math.min(panels.length - 1, index));
      panels.forEach((panel, panelIndex) => {
        panel.classList.toggle("is-active", panelIndex === activeIndex);
      });
    };

    const updateFromScroll = () => {
      const rect = landing.getBoundingClientRect();
      const distance = Math.max(1, rect.height + window.innerHeight * 0.35);
      const value = clamp((-rect.top + window.innerHeight * 0.08) / distance, 0, 1);
      landing.style.setProperty("--hero-progress", `${Math.round(value * 100)}%`);
      if (progress) {
        progress.style.width = `${Math.max(4, Math.round(value * 100))}%`;
      }
      if (value > 0.12) {
        activate(Math.min(panels.length - 1, Math.floor(value * panels.length)));
      }
      scheduled = false;
    };

    activate(0);
    updateFromScroll();

    window.addEventListener("scroll", () => {
      userScrolled = true;
      if (autoTimer) {
        window.clearInterval(autoTimer);
        autoTimer = null;
      }
      if (!scheduled) {
        scheduled = true;
        requestAnimationFrame(updateFromScroll);
      }
    }, { passive: true });

    if (!reducedMotion) {
      autoTimer = window.setInterval(() => {
        if (userScrolled || document.hidden) {
          return;
        }
        activate((activeIndex + 1) % panels.length);
      }, 2600);
    }

    if (visual && !reducedMotion && window.matchMedia("(pointer: fine)").matches) {
      visual.addEventListener("pointermove", (event) => {
        const rect = visual.getBoundingClientRect();
        const x = clamp((event.clientX - rect.left) / rect.width, 0, 1) * 2 - 1;
        const y = clamp((event.clientY - rect.top) / rect.height, 0, 1) * 2 - 1;
        visual.style.setProperty("--pointer-x", x.toFixed(3));
        visual.style.setProperty("--pointer-y", y.toFixed(3));
      });
      visual.addEventListener("pointerleave", () => {
        visual.style.setProperty("--pointer-x", "0");
        visual.style.setProperty("--pointer-y", "0");
      });
    }
  }

  function initStory() {
    const section = document.querySelector("[data-story-section]");
    if (!section) {
      return;
    }

    const stage = section.querySelector("[data-story-stage]");
    const art = section.querySelector("[data-story-art]");
    const frame = section.querySelector(".focus-frame");
    const count = section.querySelector("[data-story-count]");
    const title = section.querySelector("[data-story-title]");
    const beats = [...section.querySelectorAll("[data-story-beat]")];
    let activeBeat = beats[0];

    const activate = (beat) => {
      if (!beat || beat === activeBeat && beat.classList.contains("is-active")) {
        return;
      }
      activeBeat = beat;
      beats.forEach((item) => item.classList.toggle("is-active", item === beat));
      const scene = beat.dataset.scene || "idea";
      art?.style.setProperty("--story-position", beat.dataset.position || "18%");
      stage?.style.setProperty("--story-drift", scene === "hook" ? "-4%" : "0");
      if (count) {
        count.textContent = beat.dataset.count || "01";
      }
      if (title) {
        title.textContent = beat.dataset.title || "";
      }
      const nextFrame = frameByScene[scene] || frameByScene.idea;
      if (frame) {
        Object.entries(nextFrame).forEach(([property, value]) => {
          frame.style[property] = value;
        });
      }
    };

    if (!("IntersectionObserver" in window)) {
      activate(beats[0]);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) {
        activate(visible.target);
      }
    }, { threshold: [0.3, 0.5, 0.7], rootMargin: "-18% 0px -22%" });

    beats.forEach((beat) => observer.observe(beat));
    activate(beats[0]);
  }

  function initDialogue() {
    const buttons = [...document.querySelectorAll("[data-dialogue-lang]")];
    const bubbles = [...document.querySelectorAll("[data-dialogue]")];
    const comic = document.querySelector("[data-dialogue-comic]");
    if (!buttons.length || !bubbles.length) {
      return;
    }

    const stored = localStorage.getItem(languageStorageKey);
    const initial = Object.hasOwn(dialogue, stored) ? stored : "ko";

    const applyLanguage = (language, animate = true) => {
      const lines = dialogue[language] || dialogue.ko;
      if (animate) {
        comic?.classList.add("is-switching");
      }

      window.setTimeout(() => {
        bubbles.forEach((bubble) => {
          const key = bubble.dataset.dialogue;
          bubble.textContent = lines[key] || dialogue.ko[key] || "";
          bubble.lang = language === "ja" ? "ja" : language;
        });
        buttons.forEach((button) => {
          button.setAttribute("aria-pressed", String(button.dataset.dialogueLang === language));
        });
        localStorage.setItem(languageStorageKey, language);
        comic?.classList.remove("is-switching");
      }, animate ? 170 : 0);
    };

    buttons.forEach((button) => {
      button.addEventListener("click", () => applyLanguage(button.dataset.dialogueLang));
    });

    applyLanguage(initial, false);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
})();
