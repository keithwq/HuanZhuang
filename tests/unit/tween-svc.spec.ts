/**
 * E1-S09 · 动效白名单 guard + 可打断补间（paperdoll §2.4/§8.2/§8.6，R-01/R-08/R-15）
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bus } from '../../src/core/bus';
import { FEEDBACK_MS } from '../../src/core/constants/budget';
import { reducedMotionResolved, TweenService } from '../../src/systems/paperdoll/tweenSvc';

beforeEach(() => {
  bus.clear();
  vi.restoreAllMocks();
});

describe('白名单 guard（D1-11：白名单外循环动效一律拒绝）', () => {
  it('常驻动效仅 3 项可创建：breath / blink / sway', () => {
    const svc = new TweenService();
    for (const id of ['breath', 'blink', 'sway']) {
      expect(svc.createResident(id, 'torso')).not.toBeNull();
    }
  });

  it('白名单外常驻动效 → 抛错拒绝（运行时 guard，R-08）', () => {
    const svc = new TweenService();
    expect(() => svc.createResident('starPulse', 'bg')).toThrow(/白名单外/);
    expect(() => svc.createResident('lightFlicker', 'lamp')).toThrow(/白名单外/);
    expect(() => svc.createResident('shake', 'slot')).toThrow(/白名单外/);
    expect(svc.activeHandles()).toHaveLength(0); // 拒绝的不入表
  });

  it('常驻参数与美术圣经 §8.2 逐值一致（周期/幅度）', () => {
    const svc = new TweenService();
    const breath = svc.createResident('breath', 'torso')!;
    expect(breath.durationMs).toBe(3000);
    expect(breath.params.scaleAmplitude).toBe(0.01);
    const blink = svc.createResident('blink', 'face')!;
    expect(blink.durationMs).toBe(8000);
    expect(blink.params.jitter).toBe(2000);
    expect(blink.params.closedMs).toBe(120);
    const sway = svc.createResident('sway', 'hairF')!;
    expect(sway.durationMs).toBe(4000);
    expect(sway.params.swayPx).toBe(2);
  });
});

describe('一次性反馈家族（art §8：≤300ms、可打断、无队列）', () => {
  it('反馈超 300ms → 抛错（R-01 红线）', () => {
    const svc = new TweenService();
    expect(() => svc.createOneShot('tryonConfirm', 'TOP', 301)).toThrow(/超上限/);
    expect(svc.createOneShot('tryonConfirm', 'TOP', 300)).not.toBeNull(); // 边界值
  });

  it('同目标新动效到达 → 旧动效立即中止（killTweensOf，paperdoll §4）', () => {
    const svc = new TweenService();
    const h1 = svc.createOneShot('tryonConfirm', 'TOP', 300);
    svc.advance(100);
    const h2 = svc.createOneShot('tryonConfirm', 'TOP', 300);
    expect(h1.running).toBe(false); // 旧动效中止
    expect(h2.running).toBe(true);  // 新动效接续（无队列）
    expect(svc.killTweensOf('TOP', 'oneshot')).toBe(1);
  });

  it('换装确认时序：旧件淡出 100ms → 新件淡入 150ms（总 ≤300ms）', () => {
    const svc = new TweenService();
    const fadeOut = svc.createOneShot('fadeOut', 'TOP', 100);
    svc.advance(100);
    expect(fadeOut.running).toBe(false); // 淡出完成
    const fadeIn = svc.createOneShot('fadeIn', 'TOP', 150);
    svc.advance(150);
    expect(fadeIn.running).toBe(false);
    // 总时长 250ms ≤ 300ms ✓（加 2% 上浮落定同窗完成）
  });
});

describe('减敏模式（art §9.4 / R-15）', () => {
  it('常驻 3 项全关（返回 null）；反馈压缩 100ms 纯淡切', () => {
    const svc = new TweenService(() => true);
    for (const id of ['breath', 'blink', 'sway']) {
      expect(svc.createResident(id, 'torso')).toBeNull();
    }
    const h = svc.createOneShot('tryonConfirm', 'TOP', 300);
    expect(h.durationMs).toBe(FEEDBACK_MS.reducedMotion); // 100ms
    expect(h.animId).toContain('reducedFade'); // 纯淡切
  });

  it('减敏判定：用户覆盖优先于系统偏好（local-save §2.1 三态）', () => {
    expect(reducedMotionResolved(true, null)).toBe(true);  // null 跟随系统
    expect(reducedMotionResolved(true, false)).toBe(false); // 覆盖优先
    expect(reducedMotionResolved(false, true)).toBe(true);
  });
});

describe('帧率降档容忍（paperdoll §4：时长不变、帧数减半）', () => {
  it('30fps 推进（dt 加倍）下动效时长恒定完成', () => {
    const svc = new TweenService();
    const h = svc.createOneShot('tryonConfirm', 'TOP', 300);
    for (let i = 0; i < 2; i++) svc.tick(60); // 120ms：进行中
    expect(h.running).toBe(true);
    for (let i = 0; i < 3; i++) svc.tick(60); // 累计 300ms
    expect(h.running).toBe(false); // 300ms 总时长不变
  });
});
