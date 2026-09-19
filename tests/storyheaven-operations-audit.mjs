import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const root = process.env.STORYHEAVEN_TEST_ROOT || 'http://127.0.0.1:4178';
const browser = await chromium.launch();
try {
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 960 } });
    const errors = [];
    const requests = [];
    const holds = Array.from({ length: 13 }, (_, index) => ({
      id: `story-${index + 1}`, title: `검수할 작품 ${index + 1}`, episodeNo: index === 0 ? 2 : 1,
      latestRunId: `run-${index + 1}`, latestRunStatus: 'blocked', latestStage: 'editorial_blocked',
      rewriteCount: 2, operatorRewriteCount: 1, draft: { characterCount: 3700 },
      latestCompletedAt: new Date().toISOString(), schedule: { id: 'schedule-1', status: 'active' },
      review: { decision: 'blocked', safetyPassed: true, summary: '고칠 장면이 한 곳 남아 있습니다.',
        issues: [{ severity: 'critical', sceneNo: 2, evidence: '도구가 준비 과정 없이 등장합니다.', suggestion: '도구를 챙기는 행동을 앞 장면에서 보여 주세요.' }] }
    }));
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      const session = { access_token: 'test-admin', user: { id: 'test-admin' } };
      window.supabase = { createClient: () => ({ auth: {
        getSession: async () => ({ data: { session } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })
      } }) };
    });
    await page.route('https://cdn.jsdelivr.net/**', (route) => route.abort());
    await page.route('https://harvard-museum-nails-mission.trycloudflare.com/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
      if (path.endsWith('/slow')) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return json({});
      }
      if (path.endsWith('/profile')) return json({ profile: { isAdmin: true, nickname: '운영자' } });
      if (path.endsWith('/schedules')) return json({ enabled: true, emergencyPaused: false, pollSeconds: 60,
        schedules: [{ id: 'schedule-1', status: 'active', primaryGenre: 'fantasy', cadenceMinutes: 120,
          targetEpisodeCount: 3, publicationMode: 'auto_public', nextRunAt: new Date(Date.now() + 600000).toISOString() }],
        queue: {
          updatedAt: new Date().toISOString(), actionRequiredTotal: holds.length,
          items: [
            { id: 'current', title: '현재 작성 중인 작품', status: 'running', stage: 'write_draft', scheduleId: 'schedule-1', stageElapsedSeconds: 30, elapsedSeconds: 90000, totalJobs: 9, completedJobs: 8, targetEpisodeCount: 3 },
            { id: 'retry', title: '자동 재시도할 작품', status: 'waiting', waitReason: 'retry_delay', queuePosition: 1,
              stage: 'editorial_review', nextAttemptAt: new Date(Date.now() + 60000).toISOString(), failureCode: 'codex_rate_limited', totalJobs: 9, completedJobs: 8, requestedAt: new Date().toISOString() },
            { id: 'paused', title: '개별 중지 작품', status: 'waiting', waitReason: 'schedule_paused', scheduleStatus: 'paused', scheduleId: 'schedule-1', queuePosition: null, stage: 'write_draft', totalJobs: 2, completedJobs: 1, requestedAt: new Date().toISOString() }
          ],
          attention: holds.length ? [{ id: 'duplicate', storyId: 'story-1', title: '검수할 작품 1', attentionType: 'quality_hold', status: 'error' }] : [],
          stalledFirstEpisodeStories: holds, history: [], recentCompleted: []
        }
      });
      if (path.endsWith('/runs/resolve-quality-holds')) {
        const body = route.request().postDataJSON(); requests.push(body);
        await new Promise((resolve) => setTimeout(resolve, 400));
        const failed = requests.length === 1 ? 'run-2' : null;
        const results = body.runIds.map((runId) => ({ runId, queued: runId !== failed, ...(runId === failed ? { error: 'serial_quality_hold_not_active' } : {}) }));
        for (const result of results) if (result.queued) {
          const index = holds.findIndex((item) => item.latestRunId === result.runId); if (index >= 0) holds.splice(index, 1);
        }
        return json({ results, queuedCount: results.filter((item) => item.queued).length, failedCount: failed ? 1 : 0 }, 202);
      }
      return json({});
    });
    await page.goto(`${root}/storyheaven/operator/serial/`, { waitUntil: 'networkidle' });
    await page.locator('[data-serial-dashboard]').waitFor({ state: 'visible' });
    const timedOut = await page.evaluate(async () => {
      try { await StoryHeavenCommon.api('/api/storyheaven/operator/serial-engine/slow', { timeoutMs: 20 }); }
      catch (error) { return error.message; }
    });
    assert.equal(timedOut, 'request_timed_out', 'slow requests must release controls with an actionable message');
    assert.equal(await page.locator('[data-system-state-title]').textContent(), '제작 중');
    assert.match(await page.locator('[data-system-state-cause]').textContent(), /이번 단계 30초/u);
    assert.equal(await page.locator('.stalled-row').count(), 13);
    assert.equal(await page.locator('[data-attention-group]').isHidden(), true, 'one story must not appear in both action lists');
    assert.equal(await page.locator('[data-status-attention]').textContent(), '13');
    assert.match(await page.locator('.stalled-row').first().textContent(), /본편 1화/u);
    assert.equal(await page.locator('.queue-progress-details').first().evaluate((node) => node.open), false);
    assert.match(await page.locator('[data-queue-id=retry]').textContent(), /뒤 자동으로 다시 시도/u);
    assert.match(await page.locator('[data-queue-id=paused] .queue-position').textContent(), /설정 중지/u);
    assert.equal(await page.getByRole('button', { name: '검토 후 직접 승인', exact: true }).first().isVisible(), false);
    await page.locator('.stalled-row .stalled-select input').nth(0).check();
    await page.locator('.stalled-row .stalled-select input').nth(1).check();
    assert.equal(await page.locator('[data-stalled-select-all]').evaluate((node) => node.indeterminate), true);
    await page.locator('[data-stalled-bulk-rewrite]').click();
    assert.equal(await page.locator('[data-stalled-bulk-rewrite]').isDisabled(), true);
    await page.waitForFunction(() => document.querySelectorAll('.stalled-row').length === 12);
    assert.equal(await page.locator('[data-stalled-selected-count]').textContent(), '1건 선택', 'failed row remains selected');
    await page.locator('[data-stalled-group]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/storyheaven-operations-audit-${width}.png` });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.locator('[data-stalled-select-all]').check();
    await page.locator('[data-stalled-bulk-rewrite]').click();
    await page.locator('[data-stalled-group]').waitFor({ state: 'hidden' });
    assert.equal(requests.length, 2);
    assert.equal(requests[0].runIds.length, 2);
    assert.equal(requests[1].runIds.length, 12);
    assert.deepEqual(errors, []);
    await page.close();
  }
  console.log('Operator waiting reasons, main-episode holds, deduplication and partial bulk recovery passed');
} finally { await browser.close(); }
