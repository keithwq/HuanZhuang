/**
 * window.__hz dev-only 测试探针（P5-EL-S1b，QA 计划 §2.0 前置基础设施）
 * 采集口径（严守真 sprint1-qa-plan.md §2.0/§2.1/§2.2/§2.4）：
 * - tap_in（pointerup 时戳）→ render_commit（合成器落帧时戳——换装确认动效首帧）
 * - flip_start（翻转请求）→ flip_commit（新视图首帧展开）
 * - rAF 帧间隔（p95 ≤ 25ms + 连续掉帧段 < 3 帧，QA §2.4 备案口径）
 * - texmem 报表查询
 * 门控红线（checklist §3-11 / R-16）：**dev-only**（import.meta.env.DEV 静态替换 →
 * production 构建分支消除、window.__hz 零暴露——tests/unit/prod-bundle-hygiene.spec.ts 断言）。
 */

import Phaser from 'phaser';
import { bus } from './bus';
import { texmem } from '../texmem/accountant';

const DEV = import.meta.env.DEV;

export interface TapSample { tapIn: number; commit: number; deltaMs: number }
export interface FlipSample { start: number; commit: number; deltaMs: number }

export interface ProbeStats {
  taps: { n: number; p50: number; p95: number; max: number };
  flips: { n: number; p50: number; p95: number; max: number };
  frames: { n: number; p50: number; p95: number; max: number; dropBursts: number };
}

const percentile = (sorted: number[], p: number): number => {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return +sorted[Math.max(0, idx)].toFixed(2);
};

class Probe {
  private taps: TapSample[] = [];
  private flips: FlipSample[] = [];
  private frameDeltas: number[] = [];
  private pendingTap: number | null = null;
  private pendingFlipStart: number | null = null;
  private pendingViewCommit = false;
  private dirtyVersion = 0;
  private committedVersion = 0;
  private lastFrame = 0;
  private installed = false;

  /** tap_in 标记：真实 pointerup（install 挂接）或 QA 钩子驱动（ui.tapCard 包装）双路共用 */
  markTapIn(): void {
    if (!DEV) return;
    this.pendingTap = performance.now();
  }

  install(app: unknown, game: Phaser.Game): void {
    if (!DEV || this.installed) return;
    this.installed = true;

    // 渲染版本：换装/卸下成功 → 下一帧为「可见变化帧」（QA §2.1：非最终落定帧）
    bus.on('tryon:done', () => this.dirtyVersion++);
    // flip_start：双路径（拖拽/按钮）统一经 bus 事件（QA §2.2）
    bus.on('view:flipRequest', () => {
      this.pendingFlipStart = performance.now();
    });
    // 视图切换中点（纹理换装）→ 等待下一帧 = flip_commit（新视图首帧）
    bus.on('view:change', () => {
      if (this.pendingFlipStart !== null) this.pendingViewCommit = true;
    });

    // 真实 pointerup → tap_in（InputManager 全局事件经 events emitter 广播）
    game.input.events.on('pointerup', () => this.markTapIn());

    // 合成器落帧：POST_RENDER（QA §2.1 render_commit 口径）
    game.events.on(Phaser.Core.Events.POST_RENDER, () => {
      const now = performance.now();
      // rAF 帧间隔采样（QA §2.4：60s 混操作窗口，环形缓冲 4000 帧）
      if (this.lastFrame > 0) this.frameDeltas.push(now - this.lastFrame);
      this.lastFrame = now;
      if (this.frameDeltas.length > 4000) this.frameDeltas.splice(0, 2000);

      // render_commit：tap 后首个「脏版本」帧
      if (this.pendingTap !== null && this.dirtyVersion !== this.committedVersion) {
        this.committedVersion = this.dirtyVersion;
        this.taps.push({ tapIn: this.pendingTap, commit: now, deltaMs: now - this.pendingTap });
        this.pendingTap = null;
        if (this.taps.length > 300) this.taps.shift();
      }
      // flip_commit
      if (this.pendingFlipStart !== null && this.pendingViewCommit) {
        this.flips.push({ start: this.pendingFlipStart, commit: now, deltaMs: now - this.pendingFlipStart });
        this.pendingFlipStart = null;
        this.pendingViewCommit = false;
        if (this.flips.length > 300) this.flips.shift();
      }
    });
    void app;
  }

  stats(): ProbeStats {
    const tapD = [...this.taps.map((t) => t.deltaMs)].sort((a, b) => a - b);
    const flipD = [...this.flips.map((f) => f.deltaMs)].sort((a, b) => a - b);
    const frameD = [...this.frameDeltas].sort((a, b) => a - b);
    // 连续掉帧段：帧间隔 > 25ms 的连续帧数 ≥3（QA §2.4 口径反向计数）
    let dropBursts = 0;
    let run = 0;
    for (const d of this.frameDeltas) {
      if (d > 25) {
        run++;
        if (run === 3) dropBursts++;
      } else run = 0;
    }
    return {
      taps: { n: tapD.length, p50: percentile(tapD, 50), p95: percentile(tapD, 95), max: percentile(tapD, 100) },
      flips: { n: flipD.length, p50: percentile(flipD, 50), p95: percentile(flipD, 95), max: percentile(flipD, 100) },
      frames: {
        n: frameD.length,
        p50: percentile(frameD, 50),
        p95: percentile(frameD, 95),
        max: percentile(frameD, 100),
        dropBursts,
      },
    };
  }

  texmem(): { keys: string[]; currentMB: number; peakMB: number } {
    if (!DEV) return { keys: [], currentMB: 0, peakMB: 0 };
    const r = texmem.report();
    return { keys: r.keys, currentMB: r.currentMB, peakMB: r.peakMB };
  }

  reset(): void {
    this.taps = [];
    this.flips = [];
    this.frameDeltas = [];
    this.pendingTap = null;
    this.pendingFlipStart = null;
    this.pendingViewCommit = false;
  }
}

/** dev-only 单例（production 构建下全部方法为空分支，经静态消除） */
export const probe = new Probe();

/** 安装 window.__hz（仅 dev；production 零暴露——R-16 红线） */
export const installWindowProbe = (app: unknown, game: Phaser.Game): void => {
  if (!DEV) return;
  probe.install(app, game);
  const g = globalThis as unknown as { __hz?: Record<string, unknown> };
  g.__hz = {
    ...(g.__hz ?? {}),
    probe: {
      stats: () => probe.stats(),
      texmem: () => probe.texmem(),
      reset: () => probe.reset(),
      markTapIn: () => probe.markTapIn(),
    },
    texmemKeys: (): string[] => probe.texmem().keys,
  };
};
