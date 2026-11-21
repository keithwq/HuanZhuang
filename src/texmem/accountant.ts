/**
 * TexMemAccountant · 纹理预算会计（E1-S06，ADR-003 §2）
 * 红线（ADR-003 §6 / checklist §3-2）：全项目纹理进出唯一登记处；估算口径 = w×h×4B（RGBA 未压缩，cal-04 §1 保守口径）。
 */

import { TEXMEM_TIERS } from '../core/constants/budget';

export type BudgetTier = keyof typeof TEXMEM_TIERS;

interface Entry {
  w: number;
  h: number;
  /** 载入时间戳（LRU 排序备用） */
  at: number;
}

export class TexMemAccountant {
  private entries = new Map<string, Entry>();
  /** 峰值采样（report 用） */
  private peakBytes = 0;
  private strict: boolean;
  private warns: string[] = [];

  constructor(strict = true) {
    this.strict = strict;
  }

  /** 载入即登记：estBytes = w×h×4 */
  register(key: string, w: number, h: number): void {
    if (this.entries.has(key)) throw new Error(`texmem: duplicate register ${key}（同键重复载入，疑似泄漏路径）`);
    if (w <= 0 || h <= 0) throw new Error(`texmem: invalid size ${w}x${h}`);
    this.entries.set(key, { w, h, at: Date.now() });
    this.recomputePeak();
  }

  /** 卸载即销记 */
  release(key: string): void {
    if (!this.entries.delete(key)) throw new Error(`texmem: release unknown key ${key}（释放未登记纹理——register/release 必须成对）`);
  }

  /** 是否已登记 */
  has(key: string): boolean {
    return this.entries.has(key);
  }

  /** 当前估算总量（字节） */
  currentBytes(): number {
    let sum = 0;
    for (const e of this.entries.values()) sum += e.w * e.h * 4;
    return sum;
  }

  /** 预算校验：超阈值开发态断言、生产态 warn（ADR-003 §2） */
  assertBudget(tier: BudgetTier): void {
    const limit = TEXMEM_TIERS[tier] * 1024 * 1024;
    const cur = this.currentBytes();
    if (cur > limit) {
      const msg = `texmem: ${tier} 预算超限 ${cur} / ${limit} bytes`;
      this.warns.push(msg);
      if (this.strict) throw new Error(msg);
      else console.warn(msg);
    }
  }

  /** 超限告警列表（e2e 断言预算零告警用，R-05/06/07 运行时面） */
  warnings(): readonly string[] {
    return this.warns;
  }

  clearWarnings(): void {
    this.warns = [];
  }

  /** 供 evidence 导出（cal-04 §7） */
  report(): { keys: string[]; currentBytes: number; peakBytes: number; currentMB: number; peakMB: number } {
    return {
      keys: [...this.entries.keys()],
      currentBytes: this.currentBytes(),
      peakBytes: this.peakBytes,
      currentMB: +(this.currentBytes() / 1048576).toFixed(2),
      peakMB: +(this.peakBytes / 1048576).toFixed(2),
    };
  }

  private recomputePeak(): void {
    const cur = this.currentBytes();
    if (cur > this.peakBytes) this.peakBytes = cur;
  }
}

/** 全项目唯一实例 */
export const texmem = new TexMemAccountant(true);
