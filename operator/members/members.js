(() => {
  document.addEventListener("DOMContentLoaded", () => {
    document.querySelector("[data-member-back]")?.addEventListener("click", () => {
      if (window.history.length > 1) {
        window.history.back();
        return;
      }
      window.location.assign("/storyheaven/");
    });
  });
})();
