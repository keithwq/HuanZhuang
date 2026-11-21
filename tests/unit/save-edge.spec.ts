/**
 * E1-S02/S03 · SaveService 八条边缘（local-save §5.1~5.6 ↔ §8，testing-scaffold §3.1）
 * jsdom 注意：Storage 实例被冻结，setItem 补丁须打在 Storage.prototype 上（try/finally 恢复）。
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bus } from '../../src/core/bus';
import { QuotaError } from '../../src/systems/save/StorageDriver';
import { SaveService } from '../../src/systems/save/SaveService';
import { SAVE_KEY, SAVE_KEY_BAK, SAVE_KEY_MIG, newSave } from '../../src/systems/save/types';
import { CLOTHING_ITEMS } from '../../src/data/items';

const clearStorage = () => {
  for (const k of [SAVE_KEY, SAVE_KEY_BAK, SAVE_KEY_MIG, '__hz_probe__']) {
    window.localStorage.removeItem(k);
  }
  bus.clear();
};

/** 补丁 Storage.prototype.setItem（jsdom 冻结实例，必须打原型）；返回恢复函数 */
const patchSetItemThrowing = (): (() => void) => {
  const proto = Object.getPrototypeOf(window.localStorage) as Storage;
  const orig = proto.setItem;
  proto.setItem = () => {
    throw new DOMException('quota', 'QuotaExceededError');
  };
  return () => {
    proto.setItem = orig;
  };
};

beforeEach(() => {
  vi.useFakeTimers();
  clearStorage();
});

afterEach(() => {
  vi.useRealTimers();
  clearStorage();
});

describe('U-01 · localStorage 不可用降级（local-save §5.1/§8.4）', () => {
  it('探测失败 → 内存会话档：接口零异常、会话内功能完整、一次性提示恰 1 次', () => {
    const restore = patchSetItemThrowing();
    try {
      const degraded: number[] = [];
      bus.on('save:degraded', () => degraded.push(1));

      const svc = new SaveService();
      expect(svc.isMemoryOnly()).toBe(true);
      // 会话内全部接口行为一致（六系统零感知）
      expect(() => {
        svc.addItem(CLOTHING_ITEMS[0].itemId, 'shop_purchase');
        svc.addCoins(450, 'daily_task');
        expect(svc.spendCoins(150, 'shop_purchase')).toBe(true);
        svc.setOutfitSlot('TOP', CLOTHING_ITEMS[4].itemId);
      }).not.toThrow();
      expect(svc.getCoins()).toBe(300);
      expect(svc.getOwned()).toContain(CLOTHING_ITEMS[0].itemId);
      vi.advanceTimersByTime(600); // 防抖冲刷不抛（内存档直接丢弃）
      expect(degraded).toHaveLength(1); // 一次性 toast 恰 1 次
    } finally {
      restore();
    }
    // 恢复后真实写入可用（补丁彻底还原）
    const svc2 = new SaveService();
    svc2.addCoins(10, 'achievement');
    expect(window.localStorage.getItem(SAVE_KEY)).not.toBeNull();
  });
});

describe('U-02 · 写入配额失败链（local-save §5.2）', () => {
  it('配额失败 → 裁剪 ledger 重写一次 → 仍失败转内存会话档 + 一次性提示', () => {
    const svc = new SaveService();
    for (let i = 0; i < 8; i++) svc.addCoins(150, 'daily_task'); // 正常期积累

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const restore = patchSetItemThrowing();
    try {
      const degraded: number[] = [];
      bus.on('save:degraded', () => degraded.push(1));
      svc.addCoins(150, 'daily_task'); // 即时写 → 配额链
      expect(svc.isMemoryOnly()).toBe(true);
      expect(degraded).toHaveLength(1);
      // 裁剪 ledger 重写路径被尝试（warn 留痕）
      expect(warnSpy.mock.calls.some((c) => String(c[0]).includes('save'))).toBe(true);
      // 转内存档后再操作不抛、不发第二次提示
      expect(() => svc.addCoins(150, 'daily_task')).not.toThrow();
      expect(degraded).toHaveLength(1);
    } finally {
      restore();
      warnSpy.mockRestore();
    }
  });

  it('QuotaError 类型语义：驱动层抛出可被持久层识别', () => {
    const e = new QuotaError('quota');
    expect(e.name).toBe('QuotaError');
    const dom = new DOMException('q', 'QuotaExceededError');
    expect(dom.name).toBe('QuotaExceededError');
  });
});

describe('U-03 · 主键损坏 → 备份恢复（local-save §5.3/§8.3）', () => {
  it('主键 JSON 损坏 → 读备份键恢复，丢失 ≤ 上次写入间隔', () => {
    // 制造两代成功写入：gen1 → bak 为空；gen2 → bak = gen1
    const seed = new SaveService();
    seed.addCoins(450, 'daily_task');   // gen1：main=450
    seed.addCoins(50, 'daily_task');    // gen2：bak=gen1(450)、main=500
    // 进程被杀：主键半截 JSON
    window.localStorage.setItem(SAVE_KEY, '{"schemaVersion":1,"wardrobe":{"own');

    const svc = new SaveService();
    expect(svc.getCoins()).toBe(450); // 备份恢复成功（丢失 ≤ gen1→gen2 间隔）
    const main = window.localStorage.getItem(SAVE_KEY);
    expect(main).not.toBeNull();
    expect(JSON.parse(main!).economy.coins).toBe(450); // 恢复后回写主键
  });

  it('双键轮换写序：写主键前当前主键内容已复制到备份键（ADR-002 §1）', () => {
    const svc = new SaveService();
    svc.addCoins(100, 'achievement');  // gen1
    const mainV1 = window.localStorage.getItem(SAVE_KEY);
    svc.addCoins(50, 'daily_task');    // gen2
    const mainV2 = window.localStorage.getItem(SAVE_KEY);
    const bakV2 = window.localStorage.getItem(SAVE_KEY_BAK);
    expect(mainV1).not.toBe(mainV2);
    expect(bakV2).toBe(mainV1); // 备份 = 上一个成功版本
  });
});

describe('U-04 · 双键全坏 → 新档 + 默认套装路径，绝不闪退（local-save §5.3/§8.3）', () => {
  it('主备均不可解析 → 新档 + console 警告 + 接口正常', () => {
    window.localStorage.setItem(SAVE_KEY, 'garbage{{{');
    window.localStorage.setItem(SAVE_KEY_BAK, 'also-garbage');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const svc = new SaveService();
    expect(svc.getCoins()).toBe(0);
    expect(svc.getOwned()).toHaveLength(0);
    expect(svc.getLooks()).toHaveLength(0);
    expect(warnSpy).toHaveBeenCalled();
    expect(() => svc.addItem(CLOTHING_ITEMS[0].itemId, 'achievement')).not.toThrow();
    warnSpy.mockRestore();
  });
});

describe('U-06 · 多标签页（local-save §5.6 / ADR-002 §5）', () => {
  it('storage 事件 + lastSeenAt 新者胜：无 pending 时整体替换', () => {
    const svcA = new SaveService();
    const incoming = newSave(new Date().toISOString());
    incoming.economy.coins = 999;
    incoming.player.lastSeenAt = new Date().toISOString();
    window.dispatchEvent(
      new StorageEvent('storage', { key: SAVE_KEY, newValue: JSON.stringify(incoming) }),
    );
    expect(svcA.getCoins()).toBe(999); // 新者胜
  });

  it('本地有未冲刷防抖数据 → 本地优先不替换（延迟覆盖写）', () => {
    const svcA = new SaveService();
    svcA.setOutfitSlot('TOP', 'HZ_char01_TOP_starlight_campus_shirt_a_v001'); // 防抖 pending
    const incoming = newSave(new Date().toISOString());
    incoming.economy.coins = 999;
    window.dispatchEvent(
      new StorageEvent('storage', { key: SAVE_KEY, newValue: JSON.stringify(incoming) }),
    );
    expect(svcA.getCoins()).toBe(0); // 本地优先
    vi.advanceTimersByTime(600);     // 本地延迟覆盖写
    const onDisk = JSON.parse(window.localStorage.getItem(SAVE_KEY)!);
    expect(onDisk.economy.coins).toBe(0);
  });

  it('newValue 非法 JSON → 忽略不替换', () => {
    const svcA = new SaveService();
    svcA.addCoins(100, 'achievement');
    window.dispatchEvent(new StorageEvent('storage', { key: SAVE_KEY, newValue: '{bad' }));
    expect(svcA.getCoins()).toBe(100);
  });
});

describe('写入时机（local-save §2.2/§8.2）', () => {
  it('换装 500ms 防抖合并（重进丢失 ≤ 一个防抖窗口）', () => {
    const svc = new SaveService();
    svc.setOutfitSlot('TOP', CLOTHING_ITEMS[4].itemId);
    // 防抖窗口内：磁盘未更新——模拟窗口内重进，该次换装丢失（≤ 窗口，接受口径）
    expect(window.localStorage.getItem(SAVE_KEY)).toBeNull();
    vi.advanceTimersByTime(499);
    expect(window.localStorage.getItem(SAVE_KEY)).toBeNull();
    vi.advanceTimersByTime(2);
    const disk = JSON.parse(window.localStorage.getItem(SAVE_KEY)!);
    expect(disk.wardrobe.outfit.TOP).toBe(CLOTHING_ITEMS[4].itemId);
  });

  it('购入/领取/保存造型/摆放/设置 = 即时写（关键操作清单）', () => {
    const svc = new SaveService();
    svc.addItem(CLOTHING_ITEMS[0].itemId, 'shop_purchase');
    expect(JSON.parse(window.localStorage.getItem(SAVE_KEY)!).wardrobe.ownedItems).toHaveLength(1);

    svc.addCoins(150, 'daily_task');
    expect(JSON.parse(window.localStorage.getItem(SAVE_KEY)!).economy.coins).toBe(150);

    svc.saveLook('我的造型 1', svc.getOutfit());
    expect(JSON.parse(window.localStorage.getItem(SAVE_KEY)!).looks).toHaveLength(1);

    svc.setPlacement('L-01', 'HZ_ROOM_L_starlit_four_poster_b_v001');
    expect(JSON.parse(window.localStorage.getItem(SAVE_KEY)!).room.placement['L-01']).toBeTruthy();

    svc.setAudioEnabled(false); // ADR-002 补丁附录 A：settings 即时写
    expect(JSON.parse(window.localStorage.getItem(SAVE_KEY)!).settings.audioEnabled).toBe(false);
  });

  it('pagehide 强制冲刷（ADR-002 §3 三钩子之一）', () => {
    const svc = new SaveService();
    svc.attachLifecycleHooks(window);
    svc.setOutfitSlot('TOP', CLOTHING_ITEMS[4].itemId); // 防抖 pending
    window.dispatchEvent(new Event('pagehide'));
    expect(JSON.parse(window.localStorage.getItem(SAVE_KEY)!).wardrobe.outfit.TOP).toBe(CLOTHING_ITEMS[4].itemId);
  });

  it('每次写入同步更新 lastSeenAt（local-save §2.2）', () => {
    const t0 = new Date('2026-11-21T10:00:00Z').getTime();
    vi.setSystemTime(t0);
    const svc = new SaveService();
    const before = JSON.parse(window.localStorage.getItem(SAVE_KEY) ?? '{"player":{}}').player?.lastSeenAt;
    vi.setSystemTime(t0 + 60_000);
    svc.addCoins(10, 'achievement');
    const after = JSON.parse(window.localStorage.getItem(SAVE_KEY)!).player.lastSeenAt;
    expect(after).not.toBe(before);
  });
});

describe('货币与账本红线（local-save §8.5/§8.8）', () => {
  it('spendCoins 余额不足拒绝、coins 恒 ≥0；addCoins 拒绝非正', () => {
    const svc = new SaveService();
    svc.addCoins(200, 'daily_task');
    expect(svc.spendCoins(150, 'shop_purchase')).toBe(true);
    expect(svc.getCoins()).toBe(50);
    expect(svc.spendCoins(100, 'shop_purchase')).toBe(false); // 不足拒绝
    expect(svc.getCoins()).toBe(50); // 无扣费
    expect(() => svc.addCoins(-10, 'hack')).toThrow();
    expect(() => svc.spendCoins(-10, 'hack')).toThrow();
  });

  it('ledger 滚动窗口 50（超限丢弃最旧，local-save §3）', () => {
    const svc = new SaveService();
    for (let i = 0; i < 55; i++) svc.addCoins(150, 'daily_task');
    expect(svc.rawForTest().economy.ledger).toHaveLength(50);
    expect(svc.rawForTest().economy.ledger[0].delta).toBe(150); // 最新保留
    expect(svc.getCoins()).toBe(55 * 150);
  });

  it('coins:changed 事件（architecture §4 事件名登记）：发放触发、delta 符号正确', () => {
    const svc = new SaveService();
    const events: { delta: number; reason: string }[] = [];
    bus.on('coins:changed', (p) => events.push({ delta: p.delta, reason: p.reason }));
    svc.addCoins(150, 'daily_task');
    svc.spendCoins(120, 'shop_purchase');
    expect(events).toEqual([
      { delta: 150, reason: 'daily_task' },
      { delta: -120, reason: 'shop_purchase' },
    ]);
  });

  it('存档体积 ≤100KB 实测（全上限：45 持有 + 9 造型 + 50 ledger + 21 摆放）', () => {
    const svc = new SaveService();
    for (const c of CLOTHING_ITEMS.slice(0, 45)) svc.addItem(c.itemId, 'shop_purchase');
    for (let i = 0; i < 9; i++) {
      svc.saveLook(`造型${i}`, { ...svc.getOutfit(), TOP: CLOTHING_ITEMS[4].itemId, BTM: CLOTHING_ITEMS[3].itemId });
    }
    for (let i = 0; i < 55; i++) svc.addCoins(150, 'daily_task');
    const anchors = ['L-01', 'L-02', 'L-03', 'M-01', 'M-02', 'M-03', 'M-04', 'S-01', 'S-02', 'S-T1', 'S-T2', 'S-T3', 'S-T4', 'S-T5', 'W-01', 'W-02', 'W-03', 'W-04', 'W-05', 'W-06', 'R-01'];
    for (const a of anchors) svc.setPlacement(a, 'HZ_ROOM_M_moonbeam_floor_lamp_a_v001');
    expect(svc.saveSizeBytes()).toBeLessThanOrEqual(100 * 1024);
  });
});
