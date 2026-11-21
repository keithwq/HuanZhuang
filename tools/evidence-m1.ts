import { chromium } from '@playwright/test';

/**
 * M1 证据采集 v2（探针口径，QA 计划 §2.0/§2.1/§2.2/§2.3）：
 * - R-01 tap_in→render_commit：跨组穿/卸循环 ≥30 样本（QA §2.1「跨 8 组各取若干」——
 *   灰盒默认套装覆盖 G1~G7，G8 光效组默认集空、跳过并在报告标注）
 * - R-02 flip_start→flip_commit：30 次翻转（按钮路径驱动；手势路径归严守真 touch 仿真）
 * - 帧间隔 p95/dropBursts + texmem 报表
 */
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
    const hz = (window as unknown as { __hz?: { game?: { scene?: { isActive(k: string): boolean } } } }).__hz;
    return hz?.game?.scene?.isActive('Stage') === true && hz.game.scene.isActive('UI') === true;
  }, undefined, { timeout: 10_000 });

  // ---------- R-01：跨组穿/卸循环（每轮 7 组 × 穿/卸 = 2 样本/组）
  const tapStats = await page.evaluate(async () => {
    const hz = (window as unknown as {
      __hz: {
        ui: { firstOwnedItemOf(g: string): string | null; tapCard(id: string): { type: string }; tapUnequip(s: string): unknown };
        probe: { reset(): void; stats(): { taps: { n: number; p50: number; p95: number; max: number } } };
      };
    }).__hz;
    hz.probe.reset();
    const groups: [string, string][] = [
      ['G1', 'HAIR_F'], ['G2', 'HEAD'], ['G3', 'TOP'], ['G4', 'BTM'],
      ['G5', 'OUT'], ['G6', 'LEG'], ['G7', 'NECK'],
    ];
    for (let round = 0; round < 5; round++) {
      for (const [g, unequipSlot] of groups) {
        const id = hz.ui.firstOwnedItemOf(g);
        if (!id) continue;
        hz.ui.tapCard(id); // 穿（applied → render_commit 样本）
        await new Promise((r) => setTimeout(r, 50));
        hz.ui.tapUnequip(unequipSlot); // 卸（tryon:done(null) → 样本）
        await new Promise((r) => setTimeout(r, 50));
      }
    }
    await new Promise((r) => setTimeout(r, 250));
    return hz.probe.stats().taps;
  });
  console.log('R-01 taps:', JSON.stringify(tapStats), '| PASS 判据 max<=300:', tapStats.max <= 300 ? 'PASS' : 'FAIL');

  // ---------- R-02：30 次翻转
  const flipStats = await page.evaluate(async () => {
    const hz = (window as unknown as {
      __hz: {
        ui: { flip(): string };
        probe: { reset(): void; stats(): { flips: { n: number; p50: number; p95: number; max: number } } };
      };
    }).__hz;
    hz.probe.reset();
    for (let i = 0; i < 30; i++) {
      hz.ui.flip();
      await new Promise((r) => setTimeout(r, 420)); // 过渡窗 + 余量
    }
    return hz.probe.stats().flips;
  });
  console.log('R-02 flips:', JSON.stringify(flipStats), '| PASS 判据 max<=300:', flipStats.max <= 300 ? 'PASS' : 'FAIL');

  // ---------- 帧间隔 + texmem
  const misc = await page.evaluate(async () => {
    const hz = (window as unknown as {
      __hz: { probe: { stats(): { frames: { n: number; p50: number; p95: number; max: number; dropBursts: number } }; texmem(): { currentMB: number; peakMB: number; keys: string[] } } };
    }).__hz;
    await new Promise((r) => setTimeout(r, 1000)); // 稳态采样窗
    return { frames: hz.probe.stats().frames, tex: hz.probe.texmem() };
  });
  console.log('frames:', JSON.stringify(misc.frames), '| QA §2.4 口径 p95<=25:', misc.frames.p95 <= 25 ? 'PASS' : 'CHECK');
  console.log('texmem:', JSON.stringify({ currentMB: misc.tex.currentMB, peakMB: misc.tex.peakMB, keys: misc.tex.keys.length }));

  await browser.close();
};

run().catch((e) => {
  console.error('EVIDENCE SCRIPT ERROR', e);
  process.exit(1);
});
