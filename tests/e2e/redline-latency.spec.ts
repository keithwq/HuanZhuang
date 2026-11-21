/**
 * E2E · 红线冒烟（R-01/R-02 数据面 + 竖屏遮罩 + 减敏）
 * 真机视觉延迟/帧率实测归 E5-S01（DevTools 剖析）；本层先锁"逻辑路径 ≤300ms"口径。
 * 注：Playwright evaluate 不能跨边界传函数——全部驱动逻辑在浏览器侧内联执行。
 */

import { expect, test } from '@playwright/test';

/** 浏览器侧 __hz 面（QA 钩子，src/main.ts + UiScene.installQaHook 安装） */
interface HzQa {
  app: {
    model: { getOutfitSnapshot(): Record<string, string | null>; getView(): 'front' | 'back' };
    save: { getStats(): { tryOnTotal: number }; getCoins(): number };
    reducedMotion(): boolean;
  };
  game: { scene: { isActive(key: string): boolean } };
  ui: {
    tapCard(itemId: string): { type: string };
    flip(): 'front' | 'back';
    groupIds(): string[];
    firstOwnedItemOf(groupId: string): string | null;
  };
  texmemKeys(): string[];
}

const bootReady = (page: import('@playwright/test').Page): Promise<void> =>
  page
    .waitForFunction(() => {
      const hz = (window as unknown as { __hz?: HzQa }).__hz;
      return hz != null && hz.game.scene.isActive('Stage') && hz.game.scene.isActive('UI');
    }, undefined, { timeout: 10_000 })
    .then(() => undefined);

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:4173');
  await bootReady(page);
});

test.describe('Boot 冒烟（灰盒）', () => {
  test('双场景激活 + 默认套装着装 + texmem 登记（paperdoll §8.1 灰盒面）', async ({ page }) => {
    const state = await page.evaluate(() => {
      const hz = (window as unknown as { __hz: HzQa }).__hz;
      return {
        outfit: hz.app.model.getOutfitSnapshot(),
        keys: hz.texmemKeys(),
        groups: hz.ui.groupIds(),
      };
    });
    expect(state.outfit.TOP).toBeTruthy();
    expect(state.outfit.HAIR_B).toBeTruthy();
    expect(state.outfit.HAIR_F).toBeTruthy();
    expect(state.groups).toHaveLength(8);
    expect(state.keys.some((k) => k.includes('BODY_front'))).toBe(true);
    expect(state.keys.length).toBeGreaterThanOrEqual(9);
  });
});

test.describe('R-01 · 点选即换（≤300ms 数据面）', () => {
  test('点选 → 状态+计数同步落位，同步路径 ≤300ms', async ({ page }) => {
    const r = await page.evaluate(() => {
      const hz = (window as unknown as { __hz: HzQa }).__hz;
      const id = hz.ui.firstOwnedItemOf('G2'); // 头饰组（默认套装含 1 件）
      const before = hz.app.save.getStats().tryOnTotal;
      const t0 = performance.now();
      const ev = hz.ui.tapCard(id!);
      return { ev, ms: performance.now() - t0, after: hz.app.save.getStats().tryOnTotal, before };
    });
    expect(r.ev.type).toMatch(/applied|lightFeedback|btmOccludedCaption/);
    expect(r.ms).toBeLessThanOrEqual(300); // R-01：点选→状态+渲染信号同步路径
    expect(r.after).toBeGreaterThanOrEqual(r.before); // 计数经 tryon:done 单通道
  });

  test('同卡轻反馈（wardrobe §2.2）', async ({ page }) => {
    const r = await page.evaluate(() => {
      const hz = (window as unknown as { __hz: HzQa }).__hz;
      const id = hz.ui.firstOwnedItemOf('G2')!;
      hz.ui.tapCard(id); // 穿上
      return hz.ui.tapCard(id); // 再点同卡
    });
    expect(r.type).toBe('lightFeedback');
  });
});

test.describe('R-02 · 正/背切换（300ms 窗口 + 纹理互斥）', () => {
  test('翻转 → 目标视图落位、峰值后回落（texmem 净值有界）', async ({ page }) => {
    const before = await page.evaluate(() => (window as unknown as { __hz: HzQa }).__hz.texmemKeys().length);
    await page.evaluate(() => (window as unknown as { __hz: HzQa }).__hz.ui.flip());
    await page.waitForTimeout(500); // ≤300ms 过渡窗 + 余量
    const after = await page.evaluate(() => {
      const hz = (window as unknown as { __hz: HzQa }).__hz;
      return { view: hz.app.model.getView(), keys: hz.texmemKeys().length };
    });
    expect(after.view).toBe('back');
    // 懒加载语义：预载目标视图 + 卸载旧视图 → 净值增量 ≤ 背视图集合（R-06 峰值窗口硬上限的行为面）
    expect(after.keys).toBeLessThanOrEqual(before + 14);
    // 翻回
    await page.evaluate(() => (window as unknown as { __hz: HzQa }).__hz.ui.flip());
    await page.waitForTimeout(500);
    const view2 = await page.evaluate(() => (window as unknown as { __hz: HzQa }).__hz.app.model.getView());
    expect(view2).toBe('front');
  });
});

test.describe('竖屏遮罩（T-08，hud §5.1）', () => {
  test('横屏 → 全屏遮罩显示', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await expect
      .poll(() => page.evaluate(() => document.getElementById('rotate-mask')!.style.display))
      .toBe('flex');
  });
});

test.describe('减敏（R-15，art §9.4）', () => {
  test('prefers-reduced-motion 仿真 → 减敏判定为真', async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: 'reduce',
    });
    const page = await ctx.newPage();
    await page.goto('http://localhost:4173');
    await bootReady(page);
    const reduced = await page.evaluate(() => (window as unknown as { __hz: HzQa }).__hz.app.reducedMotion());
    expect(reduced).toBe(true);
    await ctx.close();
  });
});
