/**
 * E2-S01/S02/S05 · HUD 布局 / 抽屉两档 / 覆盖层 / 模式切换（hud §2/§4/§5/§8）
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { bus } from '../../src/core/bus';
import { badgeText, computeLayout, fontScale, TAB_BAR_H, TOP_NAV_H } from '../../src/systems/hud/layout';
import { DrawerController } from '../../src/systems/hud/DrawerController';
import { ModeManager, OverlayManager } from '../../src/systems/hud/OverlayManager';

beforeEach(() => bus.clear());

describe('布局公式（hud §4：720 逻辑宽 + 安全区 + 档位百分比）', () => {
  it('9:16 基准：舞台剩余高 = 屏高 − 状态栏 − 顶导 88 − 标签栏 96 − 安全区', () => {
    // 720×1280 竖屏、无安全区
    const l = computeLayout({ cssW: 360, cssH: 640, safeTop: 0, safeBottom: 0 });
    expect(l.logicalW).toBe(720);
    expect(l.scale).toBeCloseTo(0.5, 5);
    expect(l.stageH).toBe(1280 - 0 - 88 - 96 - 0);
    expect(l.stageH).toBe(1096);
    expect(l.drawerDefaultH).toBe(Math.round(1096 * 0.45));
    expect(l.drawerExpandedH).toBe(Math.round(1096 * 0.7));
  });

  it('异形屏安全区避让（hud §8.6）：顶导下探/标签栏上探不侵舞台栅格', () => {
    const l = computeLayout({ cssW: 390, cssH: 844, safeTop: 47, safeBottom: 34 });
    expect(l.stageH).toBeCloseTo(844 / (390 / 720) - 47 / (390 / 720) - TOP_NAV_H - TAB_BAR_H - 34 / (390 / 720), 0);
    expect(l.stageH).toBeGreaterThan(0);
  });

  it('20:9 长屏增益全归舞台区（hud §5.7：栅格中轴不变、无截断）', () => {
    const base = computeLayout({ cssW: 360, cssH: 640, safeTop: 0, safeBottom: 0 });
    const long = computeLayout({ cssW: 360, cssH: 800, safeTop: 0, safeBottom: 0 });
    expect(long.stageH - base.stageH).toBe(160 / long.scale - 0); // 增量 = 屏高增益
    expect(long.drawerDefaultH).toBe(Math.round(long.stageH * 0.45)); // 档位百分比自适应
  });

  it('字号换算（art §3.2）+ 12 独立像素下限（§9.5）', () => {
    expect(fontScale(28, 360)).toBeCloseTo(14, 5); // Body @720 → 360 屏
    expect(fontScale(10, 100)).toBe(12); // 下限不破
  });

  it('角标规则（hud §4）：>0 才显示、>9 显 "9+"', () => {
    expect(badgeText(0)).toBeNull();
    expect(badgeText(3)).toBe('3');
    expect(badgeText(9)).toBe('9');
    expect(badgeText(10)).toBe('9+');
  });
});

describe('抽屉两档（wardrobe §4 / hud §4）', () => {
  const stageH = 1096;
  const mk = () => {
    const changes: { tier: string; h: number }[] = [];
    const d = new DrawerController(stageH, (tier, h) => changes.push({ tier, h }));
    return { d, changes };
  };

  it('默认档 45% / 上拉档 70%', () => {
    const { d } = mk();
    expect(d.current().height).toBe(Math.round(1096 * 0.45));
    d.toggle();
    expect(d.current().tier).toBe('expanded');
    expect(d.current().height).toBe(Math.round(1096 * 0.7));
  });

  it('快速上拉（速度 > 0.5px/ms）→ 越档吸附 expanded（wardrobe §4）', () => {
    const { d } = mk();
    d.beginDrag();
    d.dragTo(600);
    expect(d.endDrag(0.8, true)).toBe('expanded');
  });

  it('慢速拖拽跟手 + 就近吸附（中点判定）', () => {
    const { d } = mk();
    d.beginDrag();
    d.dragTo(d.heightOf('default') + 10); // 只拖出一点点
    expect(d.current().height).toBe(d.heightOf('default') + 10); // 跟手
    expect(d.endDrag(0.2, true)).toBe('default'); // 慢速就近 → 回默认档

    d.beginDrag();
    const mid = (d.heightOf('default') + d.heightOf('expanded')) / 2;
    d.dragTo(mid + 40);
    expect(d.endDrag(0.2, true)).toBe('expanded'); // 拖过中点 → 上拉档
  });

  it('快速下拉 → 越档吸附回默认档', () => {
    const { d } = mk();
    d.toggle(); // expanded
    d.beginDrag();
    d.dragTo(d.heightOf('default') + 20);
    expect(d.endDrag(0.9, false)).toBe('default');
  });

  it('拖拽高度被夹紧在两档之间（不越界）', () => {
    const { d } = mk();
    d.beginDrag();
    d.dragTo(99999);
    expect(d.current().height).toBe(d.heightOf('expanded'));
    d.dragTo(0);
    expect(d.current().height).toBe(d.heightOf('default'));
  });

  it('进入模式重置默认档（hud §2.4：状态不跨模式记忆）', () => {
    const { d } = mk();
    d.toggle();
    d.resetDefault();
    expect(d.current().tier).toBe('default');
  });
});

describe('覆盖层单层互斥（hud §5.4 / §8.4）', () => {
  it('同一时刻仅一层：已有覆盖时再开 → 拒绝返回 null（不排队）', () => {
    const om = new OverlayManager();
    expect(om.openOverlay('shop')).toBe('shop');
    expect(om.openOverlay('task')).toBeNull(); // 排队拒绝（daily §5.7 口径）
    expect(om.openOverlay('look')).toBeNull();
    om.closeOverlay();
    expect(om.openOverlay('task')).toBe('task'); // 关闭后可开
  });

  it('打开期间 isOpen=true（遮罩吸收触控——UI 层据此刻度）', () => {
    const om = new OverlayManager();
    om.openOverlay('achieve');
    expect(om.isOpen()).toBe(true);
    expect(om.current()).toBe('achieve');
  });
});

describe('模式切换状态机（hud §2.4 / §8.3：≤300ms 可打断、无过渡队列）', () => {
  it('切换启动 → completeTransition 落定 → 抽屉重置 + hud:modeChange 事件', () => {
    const events: string[] = [];
    const mm = new ModeManager(
      () => {},
      (mode) => events.push(mode),
    );
    bus.on('hud:modeChange', (p) => events.push(`bus:${p.mode}`));
    expect(mm.request('room')).toBe(true);
    expect(mm.isTransitioning()).toBe(true);
    mm.completeTransition();
    expect(mm.current()).toBe('room');
    // 落定序：bus 事件（architecture §4 事件名登记）先广播，再回调本页 onSettled
    expect(events).toEqual(['bus:room', 'room']);
  });

  it('过渡中快速往返：中止过渡直接落定目标态（无队列，hud §5.3）', () => {
    const mm = new ModeManager(() => {}, () => {});
    mm.request('room');       // 过渡开始
    expect(mm.request('dress')).toBe(true); // 中止 → 直接落定 dress
    expect(mm.current()).toBe('dress');
    expect(mm.isTransitioning()).toBe(false);
  });

  it('同模式请求无操作', () => {
    const mm = new ModeManager(() => {}, () => {});
    expect(mm.request('dress')).toBe(false);
  });
});
