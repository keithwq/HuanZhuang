import { chromium } from '@playwright/test';

/** M1 证据采集：R-01 点选延迟 + R-02 翻转窗口 实测数值（写入 tests/evidence/） */
const run = async (): Promise<void> => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto('http://localhost:4173');
  await page.waitForFunction(() => {
    const hz = (window as unknown as { __hz?: { game: { scene: { isActive(k: string): boolean } } } }).__hz;
    return hz != null && hz.game.scene.isActive('Stage') && hz.game.scene.isActive('UI');
  }, undefined, { timeout: 10_000 });

  // R-01：连续 8 次点选（穿/卸循环）采样
  const taps = await page.evaluate(() => {
    const hz = (window as unknown as { __hz: { ui: { firstOwnedItemOf(g: string): string | null; tapCard(id: string): { type: string } } } }).__hz;
    const id = hz.ui.firstOwnedItemOf('G2')!;
    const samples: number[] = [];
    for (let i = 0; i < 8; i++) {
      const t0 = performance.now();
      hz.ui.tapCard(id);
      samples.push(+(performance.now() - t0).toFixed(2));
    }
    return samples;
  });
  console.log('R-01 tapCard samples(ms):', JSON.stringify(taps));
  console.log('R-01 max(ms):', Math.max(...taps), 'redline: 300');

  // R-02：翻转计时（request → 视图落位时刻）
  const flipMs = await page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const hz = (window as unknown as { __hz: { app: { model: { getView(): string } }; ui: { flip(): string } } }).__hz;
        const t0 = performance.now();
        hz.ui.flip();
        const timer = setInterval(() => {
          if (hz.app.model.getView() === 'back') {
            clearInterval(timer);
            resolve(+(performance.now() - t0).toFixed(1));
          }
          if (performance.now() - t0 > 2000) {
            clearInterval(timer);
            resolve(-1);
          }
        }, 8);
      }),
  );
  console.log('R-02 flip front→back landed in(ms):', flipMs, 'redline window: 300');

  const tex = await page.evaluate(() => {
    const hz = (window as unknown as { __hz: { texmemKeys(): string[] } }).__hz;
    return { count: hz.texmemKeys().length };
  });
  console.log('texmem keys after flip(back):', tex.count);
  await browser.close();
};

run().catch((e) => {
  console.error('EVIDENCE SCRIPT ERROR', e);
  process.exit(1);
});
