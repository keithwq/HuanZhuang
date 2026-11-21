/**
 * E1-S08 · 正/背双视图切换（paperdoll §2.2/§4/§5.3/§8.2/§8.5，R-02/R-06）
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { bus } from '../../src/core/bus';
import { ViewSwap, type ViewSwapCallbacks } from '../../src/systems/paperdoll/ViewSwap';

const makeCallbacks = () => {
  const log: string[] = [];
  const cb: ViewSwapCallbacks = {
    preload: (v) => log.push(`preload:${v}`),
    applyView: (v) => log.push(`apply:${v}`),
    onComplete: (v) => log.push(`complete:${v}`),
    onLateComplete: (v) => log.push(`late:${v}`),
    onSilhouette: (sx) => log.push(`sx:${sx.toFixed(2)}`),
  };
  return { log, cb };
};

beforeEach(() => bus.clear());

describe('过渡时序（paperdoll §4 公式 / §8.2 红线）', () => {
  it('t=T/2 完成纹理换装、t=T 完成（≤300ms 全程）', () => {
    const { log, cb } = makeCallbacks();
    const vs = new ViewSwap(cb, false);
    expect(vs.request('back')).toBe(true);
    log.length = 0;
    vs.advance(149);
    expect(log.some((l) => l.startsWith('apply:'))).toBe(false); // 未到中点
    vs.markTexturesReady();
    vs.advance(1); // t=150 = T/2
    expect(vs.view()).toBe('back');
    expect(log).toContain('apply:back');
    vs.advance(150); // t=300 = T
    expect(log).toContain('complete:back'); // 完成即卸载旧视图（R-06 窗口硬上限）
    expect(vs.isTransitioning()).toBe(false);
  });

  it('剪影压缩公式 scaleX = max(|cos(πt/T)|, 0.08)：中点最窄 8%', () => {
    const { log, cb } = makeCallbacks();
    const vs = new ViewSwap(cb, false);
    vs.request('back');
    log.length = 0;
    vs.markTexturesReady();
    vs.advance(150); // 中点
    const sxMid = (log.find((l) => l.startsWith('sx:')) ?? '').slice(3);
    expect(parseFloat(sxMid)).toBeCloseTo(0.08, 2); // |cos(π/2)|=0 → 下限 0.08
  });

  it('过渡中再翻转请求一律忽略（无旋转队列，paperdoll §5.3）', () => {
    const { cb } = makeCallbacks();
    const vs = new ViewSwap(cb, false);
    vs.request('back');
    expect(vs.request('front')).toBe(false); // 过渡中忽略
    vs.markTexturesReady();
    vs.advance(300);
    expect(vs.request('front')).toBe(true); // 完成后才可再翻转
    expect(vs.request('front')).toBe(false); // 同视图忽略
  });
});

describe('懒加载与卸载（D2-01 / ADR-003 §3）', () => {
  it('翻转触发即预载目标视图；完成即卸载旧视图（峰值窗口 = 过渡时长）', () => {
    const { log, cb } = makeCallbacks();
    const vs = new ViewSwap(cb, false);
    vs.request('back');
    expect(log).toContain('preload:back'); // 300ms 窗口内预载
    vs.markTexturesReady();
    vs.advance(300);
    expect(log).toContain('complete:back'); // → 调用方在 complete 卸载旧视图
  });
});

describe('纹理迟到兜底（paperdoll §5.3：宁可晚到也不出空槽）', () => {
  it('剪影照常走完 → 旧视图停留 → 纹理到达后淡切补完（≤ T+200ms 量级）', () => {
    const { log, cb } = makeCallbacks();
    const vs = new ViewSwap(cb, false);
    vs.request('back');
    // 不 markTexturesReady：剪影走完但纹理未到
    vs.advance(300);
    expect(log).not.toContain('apply:back');
    expect(log).not.toContain('complete:back');
    expect(vs.isTransitioning()).toBe(true); // 等纹理态
    // 纹理迟到 200ms 后到达
    vs.markTexturesReady();
    expect(log).toContain('apply:back');
    expect(log).toContain('late:back'); // 旧视图淡切到新视图补完
    expect(log).toContain('complete:back');
    expect(vs.isTransitioning()).toBe(false);
    expect(vs.view()).toBe('back');
  });

  it('迟到态下不会出现"旧视图纹理被提前卸载"信号（complete 只在就绪后发）', () => {
    const { log, cb } = makeCallbacks();
    const vs = new ViewSwap(cb, false);
    vs.request('back');
    vs.advance(300);
    vs.advance(500); // 再等也不 complete
    expect(log).not.toContain('complete:back');
  });
});

describe('减敏模式（paperdoll §5.7 / art §9.4）', () => {
  it('100ms 交叉淡切、无压缩转身（silhouette 恒 1）', () => {
    const { log, cb } = makeCallbacks();
    const vs = new ViewSwap(cb, true);
    vs.request('back');
    log.length = 0;
    vs.markTexturesReady();
    vs.advance(50); // T/2 = 50ms
    expect(vs.view()).toBe('back');
    vs.advance(50); // t = 100ms
    expect(log).toContain('complete:back');
    expect(log.filter((l) => l.startsWith('sx:')).every((l) => l === 'sx:1.00')).toBe(true);
  });
});
