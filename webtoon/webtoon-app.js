(() => {
  document.addEventListener("DOMContentLoaded", () => {
    const body = document.querySelector(".webtoon-app-page");
    if (!body) {
      return;
    }

    initCompactHeader(body);
    initPageReveal(body);
    centerActiveNavigation(body);
  });

  function initCompactHeader(body) {
    const header = body.querySelector(".wt-topbar");
    if (!header) {
      return;
    }

    let scheduled = false;
    const update = () => {
      header.classList.toggle("is-compact", window.scrollY > 24);
      scheduled = false;
    };

    window.addEventListener("scroll", () => {
      if (scheduled) {
        return;
      }
      scheduled = true;
      requestAnimationFrame(update);
    }, { passive: true });
    update();
  }

  function initPageReveal(body) {
    const selector = [
      ".studio-head",
      ".page-head",
      ".access-banner",
      ".draft-bar",
      ".toolbar",
      ".guide-control",
      ".guide-preview",
      ".template-card",
      ".plan-band",
      ".plan-card",
      ".operator-card"
    ].join(",");
    const targets = [...body.querySelectorAll(selector)];
    if (!targets.length) {
      return;
    }

    targets.forEach((target, index) => {
      target.classList.add("app-reveal");
      target.style.transitionDelay = `${Math.min(index % 4, 3) * 55}ms`;
    });

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
    }, { threshold: 0.08, rootMargin: "0px 0px -5%" });

    targets.forEach((target) => observer.observe(target));
  }

  function centerActiveNavigation(body) {
    const navigation = body.querySelector(".topbar-nav");
    const active = navigation?.querySelector("[aria-current='page']");
    if (!navigation || !active || window.innerWidth > 820) {
      return;
    }

    requestAnimationFrame(() => {
      const targetLeft = active.offsetLeft - (navigation.clientWidth - active.clientWidth) / 2;
      navigation.scrollTo({ left: Math.max(0, targetLeft), behavior: "auto" });
    });
  }
})();
