(() => {
  'use strict';
  const key = 'storyheaven.reader-settings.v1';
  let settings = { size: 20, line: 1.9, font: 'serif', theme: 'paper' };
  let actions;
  const q = (selector) => document.querySelector(selector);
  const number = (value, min, max, fallback) => Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Number(value))) : fallback;
  function apply() {
    const root = document.documentElement;
    root.style.setProperty('--reading-size', `${settings.size}px`);
    root.style.setProperty('--reading-line', String(settings.line));
    root.dataset.readingFont = settings.font;
    root.dataset.readingTheme = settings.theme;
    q('[data-reading-size]').value = settings.size;
    q('[data-reading-line]').value = settings.line;
    q('[data-font-size-value]').textContent = settings.size;
    q('[data-line-height-value]').textContent = settings.line;
    document.querySelectorAll('[name=readingFont]').forEach((input) => { input.checked = input.value === settings.font; });
    document.querySelectorAll('button[data-reading-theme]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.readingTheme === settings.theme)));
  }
  function update(name, value) {
    const body = q('[data-reader-body]');
    const paragraph = [...body.children].find((node) => node.getBoundingClientRect().bottom > 0);
    const top = paragraph?.getBoundingClientRect().top;
    settings[name] = value;
    apply();
    if (paragraph && document.body.classList.contains('is-reading')) scrollBy(0, paragraph.getBoundingClientRect().top - top);
    try { localStorage.setItem(key, JSON.stringify(settings)); } catch { /* Reading works with storage disabled. */ }
  }
  function init(callbacks) {
    actions = callbacks;
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      settings = { size: number(saved.size, 16, 28, 20), line: number(saved.line, 1.5, 2.5, 1.9),
        font: ['serif', 'sans'].includes(saved.font) ? saved.font : 'serif',
        theme: ['paper', 'mist', 'night'].includes(saved.theme) ? saved.theme : 'paper' };
    } catch { /* Keep defaults. */ }
    apply();
    q('[data-reading-size]').addEventListener('input', (event) => update('size', Number(event.target.value)));
    q('[data-reading-line]').addEventListener('input', (event) => update('line', Number(event.target.value)));
    document.querySelectorAll('[name=readingFont]').forEach((input) => input.addEventListener('change', () => update('font', input.value)));
    document.querySelectorAll('button[data-reading-theme]').forEach((button) => button.addEventListener('click', () => update('theme', button.dataset.readingTheme)));
    q('[data-dock-prev]').addEventListener('click', () => actions.move(-1));
    q('[data-dock-next]').addEventListener('click', () => actions.move(1));
    q('[data-reader-exit]').addEventListener('click', () => actions.exit());
    q('[data-reader-settings]').addEventListener('click', () => q('[data-reader-settings-dialog]').showModal());
    q('[data-reader-toc]').addEventListener('click', () => q('[data-reader-toc-dialog]').showModal());
    q('[data-reader-comments]').addEventListener('click', () => q('[data-comment-section=episode]').scrollIntoView({ behavior: 'smooth' }));
    document.querySelectorAll('.reader-dialog').forEach((dialog) => dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    }));
  }
  function show(story, episodes, current) {
    document.body.classList.add('is-reading');
    q('[data-reader-dock]').hidden = false;
    q('[data-reading-story-title]').textContent = story.title;
    const index = episodes.findIndex((episode) => Number(episode.episodeNo) === Number(current.episodeNo));
    q('[data-dock-prev]').disabled = index <= 0;
    q('[data-dock-next]').disabled = index < 0 || index === episodes.length - 1;
    q('[data-reader-toc-list]').replaceChildren(...episodes.map((episode) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = episode.title;
      if (Number(episode.episodeNo) === Number(current.episodeNo)) button.setAttribute('aria-current', 'page');
      button.addEventListener('click', () => { q('[data-reader-toc-dialog]').close(); actions.select(episode.episodeNo); });
      return button;
    }));
  }
  function hide() {
    document.body.classList.remove('is-reading');
    q('[data-reader-dock]').hidden = true;
  }
  window.StoryHeavenReaderControls = { init, show, hide };
})();
