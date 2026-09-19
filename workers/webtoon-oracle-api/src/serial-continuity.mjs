export function buildContinuityContext(rows, episodeNo) {
  const previous = new Map();
  for (const row of rows || []) {
    const number = Number(row.episodeNo);
    if (!Number.isInteger(number) || number < 1 || number >= Number(episodeNo)) continue;
    if (!['published', 'ready'].includes(row.status)) continue;
    const existing = previous.get(number);
    if (!existing || (row.status === 'published' && existing.status !== 'published')) previous.set(number, row);
  }
  return {
    version: '2026-09-20',
    throughEpisodeNo: Number(episodeNo) - 1,
    installments: [...previous.values()].sort((a, b) => b.episodeNo - a.episodeNo).slice(0, 2)
      .reverse().map((row) => ({
        episodeNo: row.episodeNo,
        title: String(row.title || '').slice(0, 120),
        summary: String(row.summary || '').slice(0, 600),
        endingExcerpt: endingExcerpt(row.body, 1800),
        source: row.status === 'published' ? 'published_manuscript' : 'approved_pilot_manuscript'
      }))
  };
}

function endingExcerpt(body, limit) {
  const paragraphs = String(body || '').split(/\n\s*\n/u).filter((text) => text.trim());
  const selected = [];
  let count = 0;
  for (const paragraph of paragraphs.reverse()) {
    if (count + paragraph.length > limit) {
      if (!selected.length) selected.unshift(paragraph.slice(-limit));
      break;
    }
    selected.unshift(paragraph);
    count += paragraph.length + 2;
  }
  return selected.join('\n\n');
}
