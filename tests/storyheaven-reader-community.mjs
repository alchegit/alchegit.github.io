import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const root = process.env.STORYHEAVEN_TEST_ROOT || 'http://127.0.0.1:4178';
const browser = await chromium.launch();
try {
  for (const width of [320, 390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    const submitted = [];
    const reported = [];
    const removed = [];
    let delayFirst = false;
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      const session = { access_token: 'test', user: { id: 'reader-1' } };
      window.supabase = { createClient: () => ({ auth: {
        getSession: async () => ({ data: { session } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), signOut: async () => ({})
      } }) };
    });
    const story = { id: 'reader-test', title: '마도 학교의 퇴학 통지서는 괴물을 부른다', contentOrigin: 'admin_seed', contentRating: 'teen', genre: 'fantasy', genres: ['fantasy'], author: { nickname: '스토리천국 편집부' }, episodeCount: 3, synopsis: '산을 넘어 집으로 돌아가려는 두 사람이 낯선 길에서 서로의 약속을 알아 간다.', coverPath: '/storyheaven/assets/covers/last-platform.webp' };
    const episodes = [1, 2, 3].map((episodeNo) => ({ episodeNo, title: episodeNo === 1 ? '프롤로그: 남겨 둔 약속' : `본편 ${episodeNo - 1}화: 다시 길을 나서다`, summary: '길을 떠나는 두 사람의 이야기', estimatedReadMinutes: 5 }));
    const body = Array.from({ length: 45 }, (_, i) => `${i + 1}. 지윤은 문 앞에서 가방을 내려놓았다. 어제 함께 걸었던 길은 창밖의 숲 너머로 이어져 있었다. "먼저 쉬었다 가자." 동료가 물병을 건넸다. 지윤은 남은 물을 확인하고 고개를 끄덕였다.`).join('\n\n');
    await page.route('https://cdn.jsdelivr.net/**', (route) => route.abort());
    await page.route('https://harvard-museum-nails-mission.trycloudflare.com/**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname;
      const json = (value, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(value) });
      if (path.endsWith('/profile')) return json({ profile: { nickname: '독자', nicknameStatus: 'active', isAdmin: false } });
      if (path === '/api/storyheaven/stories/reader-test') return json({ story });
      if (path.endsWith('/episodes')) return json({ episodes });
      const match = path.match(/\/episodes\/(\d+)$/u);
      if (match) {
        const episodeNo = Number(match[1]);
        if (delayFirst && episodeNo === 1) await new Promise((resolve) => setTimeout(resolve, 800));
        return json({ episode: { ...episodes[episodeNo - 1], body, totalCharacters: body.length, reactions: {} } });
      }
      if (path.endsWith('/view')) return json({ viewCount: 1 });
      if (path.endsWith('/progress')) return json({ saved: true });
      if (path.endsWith('/comments')) {
        if (request.method() === 'POST') {
          submitted.push({ path, ...request.postDataJSON() });
          if (request.postDataJSON().bodyText.includes('씨발')) return json({ error: 'comment_profanity' }, 400);
          return json({ comment: { id: 'new-comment' } }, 201);
        }
        const episode = path.includes('/episodes/') ? path.match(/\/episodes\/(\d+)/u)[1] : 'story';
        if (url.searchParams.get('offset') === '20') return json({ comments: [{ id: 'older', author: '이전 독자', bodyText: '이전 감상입니다.', createdAt: new Date().toISOString() }], count: 2, nextOffset: null });
        return json({ comments: [{ id: `comment-${episode}`, author: '동료 독자', bodyText: `${episode} 회차의 선택이 좋았어요. <img src=x onerror=window.pwned=1>`, createdAt: new Date().toISOString(), canReply: true, replies: [{ id: `reply-${episode}`, author: '독자', isMine: true, bodyText: '저도 같은 생각이에요.', createdAt: new Date().toISOString() }] }], count: 2, nextOffset: 20 });
      }
      if (path.endsWith('/report')) { reported.push(request.postDataJSON()); return json({ reported: true }, 202); }
      if (path.startsWith('/api/storyheaven/comments/') && request.method() === 'DELETE') { removed.push(path); return json({ deleted: true }); }
      return json({}, 200);
    });
    await page.goto(`${root}/storyheaven/story/?id=reader-test&episode=1`, { waitUntil: 'networkidle' });
    await page.locator('[data-reader-body] p').first().waitFor();
    assert.equal(await page.locator('[data-dock-prev]').isDisabled(), true);
    await page.locator('[data-reader-settings]').click();
    await page.locator('[data-reading-size]').fill('26');
    await page.locator('[data-reading-line]').fill('2.3');
    await page.locator('[data-reading-theme=night]').click();
    await page.locator('[name=readingFont][value=sans]').check();
    await page.getByRole('button', { name: '설정 닫기', exact: true }).click();
    assert.equal(await page.locator('[data-reader-body] p').first().evaluate((p) => getComputedStyle(p).fontSize), '26px');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `test-results/storyheaven-book-night-${width}.png` });
    await page.locator('[data-dock-next]').click();
    await page.waitForFunction(() => document.querySelector('[data-reader-title]').textContent.includes('본편 1화'));
    assert.equal(await page.locator('[data-dock-prev]').isDisabled(), false);
    await page.locator('[data-reader-comments]').click();
    await page.locator('[data-comment-list=episode]').getByRole('button', { name: '답글', exact: true }).click();
    assert.match(await page.locator('[data-reply-context=episode]').textContent(), /동료 독자/u);
    await page.locator('[data-comment-input=episode]').fill('씨발');
    await page.locator('[data-comment-submit=episode]').click();
    await page.locator('[data-comment-form=episode] [data-comment-error]').filter({ hasText: '욕설' }).waitFor();
    assert.equal(await page.locator('[data-comment-input=episode]').inputValue(), '씨발');
    await page.locator('[data-comment-input=episode]').fill('다음 장면도 기대돼요.');
    await page.locator('[data-comment-submit=episode]').click();
    await page.waitForFunction(() => document.querySelector('[data-comment-input=episode]').value === '');
    assert.equal(submitted.at(-1).parentCommentId, 'comment-2');
    await page.locator('[data-comment-list=episode]').getByRole('button', { name: '신고', exact: true }).first().click();
    await page.locator('[data-comment-report-form] select').selectOption('abuse');
    await page.locator('[data-comment-report-form]').getByRole('button', { name: '신고 접수' }).click();
    await page.waitForFunction(() => !document.querySelector('[data-comment-report-dialog]').open);
    assert.equal(reported.at(-1).reason, 'abuse');
    await page.locator('[data-comment-list=episode]').getByRole('button', { name: '삭제', exact: true }).click();
    await page.waitForTimeout(100);
    assert.ok(removed.at(-1).endsWith('reply-2'));
    await page.locator('[data-comment-list=episode]').getByRole('button', { name: '댓글 더 보기', exact: true }).click();
    await page.getByText('이전 감상입니다.', { exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.pwned), undefined);
    await page.screenshot({ path: `test-results/storyheaven-comments-${width}.png` });
    delayFirst = true;
    await page.locator('[data-reader-toc]').click();
    await page.locator('[data-reader-toc-list] button').nth(0).click();
    await page.locator('[data-reader-toc]').click();
    await page.locator('[data-reader-toc-list] button').nth(2).click();
    await page.waitForTimeout(1100);
    assert.match(await page.locator('[data-reader-title]').textContent(), /본편 2화/u);
    assert.equal(await page.locator('[data-dock-next]').isDisabled(), true);
    assert.ok(new URL(page.url()).searchParams.get('episode') === '3');
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.evaluate(() => document.documentElement.dataset.readingTheme), 'night');
    await page.locator('[data-reader-settings]').click();
    await page.locator('[data-reading-theme=paper]').click();
    await page.locator('[data-reading-size]').fill('20');
    await page.locator('[name=readingFont][value=serif]').check();
    await page.getByRole('button', { name: '설정 닫기', exact: true }).click();
    await page.screenshot({ path: `test-results/storyheaven-book-paper-${width}.png` });
    const targets = await page.locator('.reader-dock button').evaluateAll((buttons) => buttons.map((b) => ({ w: b.clientWidth, h: b.clientHeight })));
    assert.ok(targets.every((button) => button.w >= 44 && button.h >= 44));
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.locator('[data-reader-exit]').click();
    assert.equal(await page.locator('.series-hero').isVisible(), true);
    assert.equal(await page.locator('[data-reader-dock]').isHidden(), true);
    assert.deepEqual(errors, []);
    await page.close();
  }
  const admin = await browser.newPage({ viewport: { width: 390, height: 844 } });
  let reportOpen = true;
  const decisions = [];
  await admin.addInitScript(() => {
    const session = { access_token: 'admin-test', user: { id: 'admin-test' } };
    window.supabase = { createClient: () => ({ auth: {
      getSession: async () => ({ data: { session } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })
    } }) };
  });
  await admin.route('https://cdn.jsdelivr.net/**', (route) => route.abort());
  await admin.route('https://harvard-museum-nails-mission.trycloudflare.com/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data = {};
    if (path.endsWith('/profile')) data = { profile: { nickname: '운영자', isAdmin: true, nicknameStatus: 'active' } };
    if (path.endsWith('/comment-reports')) data = { reports: reportOpen ? [{ id: 'report-1', commentId: 'comment-1', storyId: 'reader-test', storyTitle: '먼 길을 걷는 두 사람', author: '독자', reason: 'abuse', status: 'active', body: '신고된 댓글 원문' }] : [] };
    if (path.endsWith('/comment-reports/report-1')) { decisions.push(route.request().postDataJSON()); reportOpen = false; data = { resolved: true }; }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  });
  await admin.goto(`${root}/storyheaven/operator/`, { waitUntil: 'networkidle' });
  await admin.getByText('신고된 댓글 원문', { exact: true }).waitFor();
  await admin.locator('.comment-report-panel').screenshot({ path: 'test-results/storyheaven-comment-operator.png' });
  await admin.getByRole('button', { name: '댓글 숨김', exact: true }).click();
  await admin.getByText('처리할 댓글 신고가 없습니다.', { exact: true }).waitFor();
  assert.equal(decisions[0].action, 'hide');
  await admin.close();
  console.log('Book reader, mobile controls, request races, comments and operator report workflows passed');
} finally { await browser.close(); }
