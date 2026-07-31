(() => {
  "use strict";

  const storageKey = "storyheaven.reading-history.v1";
  const maxEntries = 12;

  window.StoryHeavenReading = { list, get, remember, updateProgress };

  function list() {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || "[]");
      if (!Array.isArray(value)) return [];
      return value.map(normalize).filter(Boolean).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    } catch {
      return [];
    }
  }

  function get(storyId) {
    return list().find((entry) => entry.storyId === String(storyId || "")) || null;
  }

  function remember(input) {
    const storyId = clean(input?.storyId, 80);
    const episodeNo = Math.max(1, Math.floor(Number(input?.episodeNo || 0)));
    if (!storyId || !episodeNo) return null;
    const current = get(storyId);
    const sameEpisode = current?.episodeNo === episodeNo;
    const entry = normalize({
      storyId,
      title: clean(input.title || current?.title, 120),
      coverPath: clean(input.coverPath || current?.coverPath, 500),
      genre: clean(input.genre || current?.genre, 80),
      episodeNo,
      episodeTitle: clean(input.episodeTitle || (sameEpisode ? current?.episodeTitle : ""), 120),
      progress: input.progress === undefined ? (sameEpisode ? current?.progress : 0) : input.progress,
      updatedAt: new Date().toISOString()
    });
    if (!entry) return null;
    const entries = [entry, ...list().filter((item) => item.storyId !== storyId)].slice(0, maxEntries);
    try {
      localStorage.setItem(storageKey, JSON.stringify(entries));
    } catch {
      return null;
    }
    return entry;
  }

  function updateProgress(storyId, episodeNo, progress) {
    const current = get(storyId);
    if (!current || current.episodeNo !== Number(episodeNo)) return null;
    return remember({ ...current, progress });
  }

  function normalize(input) {
    if (!input || typeof input !== "object") return null;
    const storyId = clean(input.storyId, 80);
    const episodeNo = Math.max(1, Math.floor(Number(input.episodeNo || 0)));
    const updatedAt = new Date(input.updatedAt || 0);
    if (!storyId || !episodeNo || Number.isNaN(updatedAt.getTime())) return null;
    const progress = Number(input.progress || 0);
    return {
      storyId,
      title: clean(input.title, 120) || "읽던 이야기",
      coverPath: clean(input.coverPath, 500),
      genre: clean(input.genre, 80),
      episodeNo,
      episodeTitle: clean(input.episodeTitle, 120),
      progress: Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0,
      updatedAt: updatedAt.toISOString()
    };
  }

  function clean(value, max) {
    return String(value || "").trim().slice(0, max);
  }
})();
