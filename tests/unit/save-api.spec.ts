/**
 * E1-S02/S03 · 造型 9 位 / 持有判重 / 计数口径 / 成就（local-save §8 与 wardrobe §8.8 对账）
 * E1-S04 · 日期翻转（local-save §2.3/§8.7、daily §2.4/§5.1 竞态）
 * E1-S05 · 迁移链 + 可选键默认（ADR-002 §4）
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bus } from '../../src/core/bus';
import { ambienceTierFromOccupied, Serializer } from '../../src/systems/save/Serializer';
import { SaveService } from '../../src/systems/save/SaveService';
import { localDateKey } from '../../src/systems/save/DayFlip';
import { demoMigrateV1toV2, MigrationChain } from '../../src/systems/save/migrate';
import { SAVE_KEY, SAVE_KEY_MIG, newSave } from '../../src/systems/save/types';
import { attachTryOnCounting } from '../../src/systems/wardrobe/tryonController';
import { CLOTHING_ITEMS, clothingById } from '../../src/data/items';
import { FURNITURE_ITEMS } from '../../src/data/furniture';

beforeEach(() => {
  vi.useFakeTimers();
  for (const k of [SAVE_KEY, 'huanzhuang_save_bak', SAVE_KEY_MIG, '__hz_probe__']) {
    window.localStorage.removeItem(k);
  }
  bus.clear();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('造型收藏 ×9（D3-02 / local-save §8.6）', () => {
  it('9 位硬上限：第 10 次保存被拒绝；删除后空位可复用', () => {
    const svc = new SaveService();
    for (let i = 0; i < 9; i++) svc.saveLook(`造型${i + 1}`, svc.getOutfit());
    expect(() => svc.saveLook('第10个', svc.getOutfit())).toThrow(/looks-full/);
    expect(svc.getLooks()).toHaveLength(9);
    // 删除第 3 位 → 同位可复用（新 id 不复用旧 id，look-save §5.6）
    const oldId = svc.getLooks()[2].id;
    expect(svc.deleteLook(oldId)).toBe(true);
    const again = svc.saveLook('新的', svc.getOutfit());
    expect(again.id).not.toBe(oldId);
    expect(svc.getLooks()).toHaveLength(9);
  });

  it('快照完整性：保存→换一身→回穿，13 槽逐一比对一致（look-save §8.2）', () => {
    const svc = new SaveService();
    const outfitA = { ...svc.getOutfit(), TOP: CLOTHING_ITEMS[4].itemId, BTM: CLOTHING_ITEMS[3].itemId };
    for (const [k, v] of Object.entries(outfitA)) svc.setOutfitSlot(k, v);
    const look = svc.saveLook('A', outfitA);
    // 换一身（覆盖当前）
    for (const [k, v] of Object.entries({ ...svc.getOutfit(), TOP: null, BTM: null })) {
      svc.setOutfitSlot(k, v);
    }
    svc.applyLook(look.id);
    const now = svc.getOutfit();
    for (const [k, v] of Object.entries(outfitA)) {
      expect((now as Record<string, string | null>)[k]).toBe(v);
    }
    // 快照为深拷贝：改当前不影响已存造型
    svc.setOutfitSlot('TOP', null);
    expect(svc.getLooks()[0].outfit.TOP).toBe(outfitA.TOP);
  });

  it('applyLook 原子全槽覆盖：含被连衣裙遮蔽的 BTM 选择状态（look-save §2.2）', () => {
    const svc = new SaveService();
    // 连衣裙着装 + BTM 保留状态（状态与渲染解耦，paperdoll §5.1）
    const dress = CLOTHING_ITEMS.find((c) => c.dress && c.slot === 'TOP')!;
    const btm = CLOTHING_ITEMS.find((c) => c.slot === 'BTM')!;
    const outfit = { ...svc.getOutfit(), TOP: dress.itemId, BTM: btm.itemId };
    const look = svc.saveLook('连衣裙造型', outfit);
    svc.setOutfitSlot('TOP', null);
    svc.applyLook(look.id);
    expect(svc.getOutfit().BTM).toBe(btm.itemId); // 遮蔽下 BTM 状态随快照复原
  });

  it('悬空 itemId 快照不被清洗（local-save §5.5 / look-save §5.3）', () => {
    const svc = new SaveService();
    const look = svc.saveLook('未来悬空', { ...svc.getOutfit(), NECK: 'HZ_char01_NECK_nonexistent_x_a_v001' });
    svc.applyLook(look.id);
    expect(svc.getOutfit().NECK).toBe('HZ_char01_NECK_nonexistent_x_a_v001'); // 保留待迁移
  });
});

describe('持有与计数口径（wardrobe §8.8 / local-save §6）', () => {
  it('addItem 判重拒绝（economy §5.5 第二道防线）', () => {
    const svc = new SaveService();
    expect(svc.addItem(CLOTHING_ITEMS[0].itemId, 'shop_purchase')).toBe(true);
    expect(svc.addItem(CLOTHING_ITEMS[0].itemId, 'shop_purchase')).toBe(false);
    expect(svc.getOwned()).toHaveLength(1);
  });

  it('noteTryOn：每次成功 tryOn/unequip 均 +tryOnTotal（wardrobe §3 冻结 + QA MAJ-1 修复），首穿另计 tryOnUnique', () => {
    const svc = new SaveService();
    const detach = attachTryOnCounting(svc);
    bus.emit('tryon:done', { slot: 'TOP', itemId: CLOTHING_ITEMS[0].itemId });
    bus.emit('tryon:done', { slot: 'TOP', itemId: CLOTHING_ITEMS[0].itemId });
    bus.emit('tryon:done', { slot: 'LEG', itemId: CLOTHING_ITEMS[2].itemId });
    // 卸下（itemId=null）同样计数（wardrobe §2.2 点选卡片含卸下卡 → bumpStat）
    bus.emit('tryon:done', { slot: 'TOP', itemId: null });
    const s = svc.getStats();
    expect(s.tryOnTotal).toBe(4); // 3 次试穿 + 1 次卸下
    expect(s.tryOnUnique).toBe(2); // 卸下不参与 unique
    expect(s.triedItems).toEqual([CLOTHING_ITEMS[0].itemId, CLOTHING_ITEMS[2].itemId]);
    detach();
  });

  it('以 S01 成功回调为准：unequip（itemId=null）计数路径经同一事件通道', () => {
    const svc = new SaveService();
    const detach = attachTryOnCounting(svc); // 计数单通道挂接（bootstrap 口径）
    bus.emit('tryon:done', { slot: 'TOP', itemId: null });
    expect(svc.getStats().tryOnTotal).toBe(1); // wardrobe §3：每次成功 tryOn/unequip 计
    expect(svc.getStats().tryOnUnique).toBe(0);
    detach();
  });
});

describe('成就接口（local-save §6 / economy §2.2）', () => {
  it('领取即标记 + claimed 永久锁定（二次领取拒绝）', () => {
    const svc = new SaveService();
    expect(svc.getAchievement('ac_c1')).toEqual({ progress: 0, claimed: false });
    expect(svc.claimAchievement('ac_c1')).toBe(true);
    expect(svc.claimAchievement('ac_c1')).toBe(false); // 永久锁定
    expect(svc.getAchievement('ac_c1').claimed).toBe(true);
  });
});

describe('E1-S04 · 日期翻转（local-save §2.3/§8.7，D3-04 不设防）', () => {
  it('dateKey 字符串不等即翻转：跨月/跨年天然覆盖（local-save §5.4）', () => {
    expect(localDateKey(new Date(2026, 0, 31))).toBe('2026-01-31');
    expect(localDateKey(new Date(2026, 1, 1))).toBe('2026-02-01');
    expect(localDateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
    expect(localDateKey(new Date(2027, 0, 1))).toBe('2027-01-01');

    vi.setSystemTime(new Date(2026, 10, 21, 10, 0, 0));
    const svc = new SaveService();
    svc.checkDayFlipNow();
    expect(svc.rawForTest().daily.dateKey).toBe('2026-11-21');
    // 跨月
    vi.setSystemTime(new Date(2026, 11, 1, 9, 0, 0));
    const flips: string[] = [];
    svc.onDayFlip((k) => flips.push(k));
    svc.checkDayFlipNow();
    expect(svc.rawForTest().daily.dateKey).toBe('2026-12-01');
    expect(flips).toEqual(['2026-12-01']);
    // 跨年
    vi.setSystemTime(new Date(2027, 0, 1, 0, 0, 30));
    svc.checkDayFlipNow();
    expect(svc.rawForTest().daily.dateKey).toBe('2027-01-01');
  });

  it('翻转清空当日任务态（清单重建归 S09 消费方）', () => {
    vi.setSystemTime(new Date(2026, 10, 21, 8, 0, 0));
    const svc = new SaveService();
    svc.setDailyTasksForTest([{ taskId: 't_a1', progress: 3, claimed: true }]);
    vi.setSystemTime(new Date(2026, 10, 22, 8, 0, 0));
    svc.checkDayFlipNow();
    expect(svc.rawForTest().daily.tasks).toEqual([]); // 进度清零/claimed 重置
  });

  it('23:59:59 完成事件竞态：先翻转再计数，事件不丢弃不双计（daily §2.4/§5.1）', () => {
    vi.setSystemTime(new Date(2026, 10, 21, 23, 59, 59));
    const svc = new SaveService();
    svc.checkDayFlipNow();
    expect(svc.rawForTest().daily.dateKey).toBe('2026-11-21');
    // 事件到达时已跨日
    vi.setSystemTime(new Date(2026, 10, 22, 0, 0, 1));
    const order: string[] = [];
    bus.on('day:flip', () => order.push('flip'));
    bus.on('stat:bump', () => order.push('stat'));
    svc.bumpStat('tryOnTotal', 1);
    expect(order).toEqual(['flip', 'stat']); // 先翻转、后入新日起点
    expect(svc.rawForTest().daily.dateKey).toBe('2026-11-22');
    expect(svc.getStats().tryOnTotal).toBe(1); // 不丢弃
  });

  it('改时间可刷任务不设防、不视为缺陷（D3-04：回拨即翻转）', () => {
    vi.setSystemTime(new Date(2026, 10, 21, 12, 0, 0));
    const svc = new SaveService();
    svc.checkDayFlipNow();
    vi.setSystemTime(new Date(2026, 10, 20, 12, 0, 0)); // 回拨
    svc.checkDayFlipNow();
    expect(svc.rawForTest().daily.dateKey).toBe('2026-11-20'); // 不等即翻转
  });
});

describe('E1-S05 · 迁移链与可选键（ADR-002 §4）', () => {
  it('链式迁移 + 迁移前快照键（幂等重放一致）', () => {
    const chain = new MigrationChain();
    chain.register(1, 2, demoMigrateV1toV2);
    const raw = newSave('2026-01-01T00:00:00Z') as unknown as Record<string, unknown>;
    const snapshots: { key: string; value: string }[] = [];
    const r1 = chain.run(raw, (k, v) => snapshots.push({ key: k, value: v }));
    expect(r1.migrated).toBe(true);
    expect(r1.data.schemaVersion).toBe(2);
    expect((r1.data.stats as Record<string, unknown>).demoFlag).toBe(true);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].key).toBe(SAVE_KEY_MIG); // 快照 = 迁移前原文
    expect(JSON.parse(snapshots[0].value).schemaVersion).toBe(1);
    // 幂等：对已迁移数据重放不再触发
    const r2 = chain.run(r1.data, () => {});
    expect(r2.migrated).toBe(false);
  });

  it('ambienceLevel 可选键：旧档缺失按 occupied 重算（room §3 向后兼容）', () => {
    const ser = new Serializer();
    const base = newSave('2026-01-01T00:00:00Z');
    delete (base.room as Record<string, unknown>).ambienceLevel;
    base.room.placement = {
      'L-01': 'f1', 'L-02': 'f2', 'M-01': 'f3', 'M-02': 'f4', 'S-01': 'f5', // occupied = 5 → 档 1
    };
    const parsed = ser.parse(JSON.stringify(base));
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.data.room.ambienceLevel).toBe(1);
  });

  it('settings.audioEnabled 缺键补默认 true，零迁移（ADR-002 补丁附录 A）', () => {
    const ser = new Serializer();
    const base = newSave('2026-01-01T00:00:00Z');
    delete (base.settings as Record<string, unknown>).audioEnabled;
    const parsed = ser.parse(JSON.stringify(base));
    if (!parsed.ok) throw new Error(parsed.error);
    expect(parsed.data.settings.audioEnabled).toBe(true);
    expect(parsed.data.schemaVersion).toBe(1); // 零迁移
  });

  it('氛围光档位派生 5/11/17（room §4.3 冻结阈值）', () => {
    expect(ambienceTierFromOccupied(0)).toBe(0);
    expect(ambienceTierFromOccupied(4)).toBe(0);
    expect(ambienceTierFromOccupied(5)).toBe(1);
    expect(ambienceTierFromOccupied(10)).toBe(1);
    expect(ambienceTierFromOccupied(11)).toBe(2);
    expect(ambienceTierFromOccupied(16)).toBe(2);
    expect(ambienceTierFromOccupied(17)).toBe(3);
    expect(ambienceTierFromOccupied(21)).toBe(3);
  });

  it('氛围光棘轮只升不降：max(档位, 存档值)（room §4.3）', () => {
    const svc = new SaveService();
    expect(svc.bumpAmbience(12)).toBe(2);  // 升档
    expect(svc.bumpAmbience(3)).toBe(2);    // 撤走家具不熄灯
    expect(svc.bumpAmbience(18)).toBe(3);   // 只升
    expect(svc.getAmbienceLevel()).toBe(3);
  });

  it('摆放/家具拥有口径分离（room §2.6：拥有 ≠ 布置）', () => {
    const svc = new SaveService();
    for (const f of FURNITURE_ITEMS.slice(0, 10)) svc.addFurniture(f.furnId);
    expect(svc.getOwnedFurniture()).toHaveLength(10);
    expect(svc.countOccupied()).toBe(0); // 拥有不计占用
    svc.setPlacement('L-01', FURNITURE_ITEMS[0].furnId);
    expect(svc.countOccupied()).toBe(1);
    void clothingById; // 引用保持（判据侧 Sprint 2 使用）
  });
});
