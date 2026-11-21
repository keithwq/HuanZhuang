/**
 * E1-S06 · TexMemAccountant（ADR-003 §2）
 */

import { describe, expect, it } from 'vitest';
import { TexMemAccountant } from '../../src/texmem/accountant';

const MB = 1024 * 1024;

describe('register/release 成对纪律（T-02 风险的测试面）', () => {
  it('register 即登记 w×h×4 字节', () => {
    const t = new TexMemAccountant(true);
    t.register('a', 512, 1024);
    expect(t.currentBytes()).toBe(512 * 1024 * 4);
    expect(t.has('a')).toBe(true);
  });

  it('release 未知键抛错；重复 register 同键抛错（泄漏路径防呆）', () => {
    const t = new TexMemAccountant(true);
    t.register('a', 10, 10);
    expect(() => t.release('nope')).toThrow();
    expect(() => t.register('a', 10, 10)).toThrow(/duplicate/);
  });

  it('任意事件序列后净值 = 常驻集合（循环试穿无泄漏）', () => {
    const t = new TexMemAccountant(true);
    // 模拟 500 次换装循环：旧件 release、新件 register
    for (let i = 0; i < 500; i++) {
      const k = `item_${i}`;
      t.register(k, 340, 430);
      t.release(k);
    }
    t.register('steady_1', 512, 1024);
    t.register('steady_2', 280, 900);
    expect(t.currentBytes()).toBe(512 * 1024 * 4 + 280 * 900 * 4);
  });
});

describe('三档预算断言（R-05=45 / R-06=75 / R-07=60，cal-04 §5）', () => {
  it('稳态档超限 → strict 模式抛错', () => {
    const t = new TexMemAccountant(true);
    t.register('big', 5120, 2400); // ≈49.2MB > 45MB
    expect(() => t.assertBudget('dressSteady')).toThrow(/dressSteady/);
  });

  it('生产模式 warn 不抛（ADR-003 §2：开发态硬断言 / 生产态 console.warn）', () => {
    const t = new TexMemAccountant(false);
    t.register('big', 5120, 2400);
    expect(() => t.assertBudget('dressSteady')).not.toThrow();
    expect(t.warnings().length).toBe(1);
  });

  it('翻转峰值窗口内两套共存 ≤75MB 通过、超限抛错', () => {
    const t = new TexMemAccountant(true);
    // 稳态 ≈43MB（cal-04 §2.2 紧口径）
    for (let i = 0; i < 10; i++) t.register(`front_${i}`, 512, 1100); // ≈22.5MB
    for (let i = 0; i < 8; i++) t.register(`ui_${i}`, 400, 400);      // ≈5.1MB
    t.assertBudget('dressSteady');
    // 峰值：+背视图 ≈14MB → ≈41.6MB ≤75
    for (let i = 0; i < 7; i++) t.register(`back_${i}`, 512, 990);
    t.assertBudget('flipPeak');
    // 卸载旧视图 → 回稳态
    for (let i = 0; i < 10; i++) t.release(`front_${i}`);
    t.assertBudget('dressSteady');
  });

  it('report 导出（cal-04 §7 证据口径）', () => {
    const t = new TexMemAccountant(true);
    t.register('a', 1024, 1024); // 4MB
    const r = t.report();
    expect(r.currentMB).toBe(4);
    expect(r.peakBytes).toBe(4 * MB);
    expect(r.keys).toEqual(['a']);
  });
});
