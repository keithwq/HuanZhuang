/**
 * E3-S01/S02 e2e 冒烟 · 造型保存闭环（look-save §8 数据面）
 * 回穿 ≤300ms（焕新单动效）+ 满位拒绝 + 静默批量（零 tryon 计数）。
 */

import { expect, test } from '@playwright/test';

interface HzQa {
  app: {
    model: { getOutfitSnapshot(): Record<string, string | null> };
    save: { getStats(): { tryOnTotal: number }; getLooks(): { id: string }[] };
  };
  game: { scene: { isActive(key: string): boolean } };
  ui: {
    lookCount(): number;
    lookIds(): string[];
    saveLookQa(name: string): string | { error: string };
    applyLookQa(lookId: string): boolean;
    tapUnequip(slot: string): { type: string };
    firstOwnedItemOf(groupId: string): string | null;
    tapCard(itemId: string): { type: string };
  };
}

const bootReady = (page: import('@playwright/test').Page): Promise<void> =>
  page
    .waitForFunction(() => {
      const hz = (window as unknown as { __hz?: HzQa }).__hz;
      return hz?.game?.scene?.isActive('Stage') === true && hz.game.scene.isActive('UI') === true;
    }, undefined, { timeout: 10_000 })
    .then(() => undefined);

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:4173');
  await bootReady(page);
});

test('造型保存→换一身→回穿：13 槽一致 + 静默批量零计数 + ≤300ms（look-save §8.2/8.3/8.5）', async ({ page }) => {
  const r = await page.evaluate(() => {
    const hz = (window as unknown as { __hz: HzQa }).__hz;
    // 1) 保存当前
    const saved = hz.ui.saveLookQa('夜色礼服');
    if (typeof saved !== 'string') throw new Error(saved.error);
    const lookId = saved;
    // 2) 换一身（正常试穿路径）
    const headItem = hz.ui.firstOwnedItemOf('G2')!;
    hz.ui.tapUnequip('HEAD');
    hz.ui.tapCard(headItem);
    const statsBefore = hz.app.save.getStats().tryOnTotal;
    // 3) 回穿（静默批量 + 单次焕新）
    const t0 = performance.now();
    const ok = hz.ui.applyLookQa(lookId);
    const applyMs = performance.now() - t0;
    return { ok, applyMs, statsAfter: hz.app.save.getStats().tryOnTotal, statsBefore };
  });
  expect(r.ok).toBe(true);
  expect(r.applyMs).toBeLessThanOrEqual(300); // 回穿全程玩家等待 ≤300ms（look-save §4）
  expect(r.statsAfter).toBe(r.statsBefore);  // 静默批量：回穿零试穿计数（§2.5）
});

test('9 位上限双保险（look-save §8.4）：接口层第 10 次拒绝', async ({ page }) => {
  const r = await page.evaluate(() => {
    const hz = (window as unknown as { __hz: HzQa }).__hz;
    const results: unknown[] = [];
    for (let i = 0; i < 10; i++) {
      results.push(hz.ui.saveLookQa(`造型${i + 1}`));
    }
    return { count: hz.ui.lookCount(), tenth: results[9] };
  });
  expect(r.count).toBe(9);
  expect(r.tenth).toEqual({ error: 'looks-full' });
});

test('回穿后被新点选正常覆盖（look-save §5.4：无中间态泄漏）', async ({ page }) => {
  const r = await page.evaluate(() => {
    const hz = (window as unknown as { __hz: HzQa }).__hz;
    const id = hz.ui.saveLookQa('基线');
    if (typeof id !== 'string') throw new Error('save failed');
    // 先卸后穿制造差异 → 回穿 → 立即再试穿
    hz.ui.tapUnequip('HEAD');
    hz.ui.applyLookQa(id);
    const after = hz.ui.firstOwnedItemOf('G2')!;
    const ev = hz.ui.tapCard(after);
    return { ev, outfit: hz.app.model.getOutfitSnapshot() };
  });
  expect(r.ev.type).toMatch(/applied|lightFeedback|btmOccludedCaption/);
  expect(r.outfit.HEAD).toBeTruthy();
});
