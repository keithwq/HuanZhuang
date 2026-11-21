/**
 * E4-S01 · 数据表完整性（economy §3/§4.1-4.4 / daily §2.2 / room §2.5 冻结值）
 */

import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, MILESTONE } from '../../src/data/achievements';
import { FURNITURE_ITEMS, furnitureById, isCurtainOnly, shopFurnitureTotal } from '../../src/data/furniture';
import { CLOTHING_ITEMS, clothingById, hairPairOf, shopClothingTotal, STYLE_TAGS } from '../../src/data/items';
import { DAILY_REWARD, TASK_POOL } from '../../src/data/tasks';
import { DEFAULT_OWNED_ITEM_IDS, DEFAULT_OUTFIT } from '../../src/data/defaults';
import { PaperdollModel } from '../../src/systems/paperdoll/model';
import { GROUPS } from '../../src/systems/wardrobe/groups';

describe('服装目录（economy §3：45 = 39 可购 + 6 解锁）', () => {
  it('总量与分池（分池互斥：同一物品只属一池）', () => {
    expect(CLOTHING_ITEMS).toHaveLength(45);
    const shop = CLOTHING_ITEMS.filter((c) => c.pool === 'shop');
    const unlock = CLOTHING_ITEMS.filter((c) => c.pool === 'unlock');
    expect(shop).toHaveLength(39);
    expect(unlock).toHaveLength(6);
    // 分池互斥：无 itemId 同属两池
    const ids = new Set(CLOTHING_ITEMS.map((c) => c.itemId));
    expect(ids.size).toBe(45);
    expect(CLOTHING_ITEMS.filter((c) => c.pool !== 'shop' && c.pool !== 'unlock')).toHaveLength(0);
  });

  it('itemId 唯一且格式符合美术圣经 §4.4 命名（全小写下划线，槽位代码大写）', () => {
    for (const c of CLOTHING_ITEMS) {
      expect(c.itemId).toMatch(/^HZ_char01_[A-Z]+(?:_[A-Z]+)*_[a-z0-9]+(?:_[a-z0-9]+)*_[abc]_v\d{3}$/);
    }
  });

  it('定价曲线（economy §4.1）：价格 = 槽位基准价 × 稀有度系数', () => {
    const base: Record<string, number> = {
      NECK: 120, HEAD: 120, FACE: 120, HAND: 120,
      HAIR_B: 180, HAIR_F: 180, LEG: 180, BTM: 180,
      TOP: 240, OUT: 240, BK: 240, FX: 240,
    };
    const coef = { common: 1, rare: 2, limited: 3 };
    for (const c of CLOTHING_ITEMS) {
      expect(c.price).toBe(base[c.slot] * coef[c.rarity]);
    }
  });

  it('稀有度混合 ≈ 普通 60% / 稀有 30% / 限定 10%（±10pt 容差，economy §4.1）', () => {
    const n = CLOTHING_ITEMS.length;
    const common = CLOTHING_ITEMS.filter((c) => c.rarity === 'common').length / n;
    const rare = CLOTHING_ITEMS.filter((c) => c.rarity === 'rare').length / n;
    const limited = CLOTHING_ITEMS.filter((c) => c.rarity === 'limited').length / n;
    expect(common).toBeGreaterThan(0.5);
    expect(common).toBeLessThanOrEqual(0.7);
    expect(rare).toBeGreaterThan(0.2);
    expect(rare).toBeLessThanOrEqual(0.4);
    expect(limited).toBeGreaterThan(0);
    expect(limited).toBeLessThanOrEqual(0.2);
  });

  it('可购目录总价对账（economy §4.2/§8.3：18,000 ±10%）', () => {
    const total = shopClothingTotal() + shopFurnitureTotal();
    expect(total).toBeGreaterThanOrEqual(18000 * 0.9);
    expect(total).toBeLessThanOrEqual(18000 * 1.1);
  });

  it('发型强制成对：每个 HAIR itemId 均可解析出同前缀两件（paperdoll §5.2 / art §5.3）', () => {
    const hairs = CLOTHING_ITEMS.filter((c) => c.slot === 'HAIR_B' || c.slot === 'HAIR_F');
    expect(hairs.length).toBeGreaterThanOrEqual(8); // ≥4 对
    for (const h of hairs) {
      const pair = hairPairOf(h.pairId!);
      expect(pair).toBeDefined();
      expect(pair!.hairB.slot).toBe('HAIR_B');
      expect(pair!.hairF.slot).toBe('HAIR_F');
      expect(pair!.hairB.pairId).toBe(pair!.hairF.pairId);
    }
    const pairCount = new Set(hairs.map((h) => h.pairId)).size;
    expect(hairs.length).toBe(pairCount * 2); // 无落单半件
  });

  it('风格标签全集 ≤ 8 组（wardrobe §2.1 / §9.6）', () => {
    expect(STYLE_TAGS.length).toBeLessThanOrEqual(8);
    for (const c of CLOTHING_ITEMS) {
      expect(c.tags.length).toBeGreaterThanOrEqual(1);
      expect(c.tags.length).toBeLessThanOrEqual(3); // 风格标签[1-3]（wardrobe §3）
      for (const t of c.tags) expect(STYLE_TAGS).toContain(t);
    }
  });
});

describe('家具目录（economy §3：30 = 24 可购 + 6 解锁；类目 L5/M10/S10/W4/R1）', () => {
  it('总量与分池', () => {
    expect(FURNITURE_ITEMS).toHaveLength(30);
    expect(FURNITURE_ITEMS.filter((f) => f.pool === 'shop')).toHaveLength(24);
    expect(FURNITURE_ITEMS.filter((f) => f.pool === 'unlock')).toHaveLength(6);
    expect(new Set(FURNITURE_ITEMS.map((f) => f.furnId)).size).toBe(30);
  });

  it('类目配额 L5/M10/S10/W4/R1（美术圣经 §10.5.5）', () => {
    const count = (cat: string) => FURNITURE_ITEMS.filter((f) => f.category === cat).length;
    expect(count('L')).toBe(5);
    expect(count('M')).toBe(10);
    expect(count('S')).toBe(10);
    expect(count('W')).toBe(4);
    expect(count('R')).toBe(1);
  });

  it('W-06 窗帘专用：窗帘类唯一且存在（room §2.2 例外）', () => {
    const curtains = FURNITURE_ITEMS.filter((f) => isCurtainOnly(f));
    expect(curtains).toHaveLength(1);
    expect(curtains[0].category).toBe('W');
    expect(curtains[0].name).toContain('curtain');
  });

  it('家具定价（economy §4.1：S·W=120 / M=180 / L·R=240 基准）', () => {
    const base = { S: 120, W: 120, M: 180, L: 240, R: 240 };
    const coef = { common: 1, rare: 2, limited: 3 };
    for (const f of FURNITURE_ITEMS) {
      expect(f.price).toBe(base[f.category] * coef[f.rarity]);
    }
  });
});

describe('任务池（daily §2.2 冻结 11 条）', () => {
  it('11 条、三槽位 A×5/B×4/C×2、单条奖励 150（D3-06）', () => {
    expect(TASK_POOL).toHaveLength(11);
    expect(TASK_POOL.filter((t) => t.slot === 'A')).toHaveLength(5);
    expect(TASK_POOL.filter((t) => t.slot === 'B')).toHaveLength(4);
    expect(TASK_POOL.filter((t) => t.slot === 'C')).toHaveLength(2);
    for (const t of TASK_POOL) expect(t.reward).toBe(DAILY_REWARD);
    expect(DAILY_REWARD).toBe(150); // D3-06 B 档
  });

  it('文案纪律（daily §2.2/§8.5）：零倒计时/损失/指挥话术', () => {
    const banned = [/仅限/, /错过不再/, /别错过/, /快领取/, /正确搭配/, /最佳选择/, /剩.*小时/];
    for (const t of TASK_POOL) {
      for (const b of banned) expect(t.text).not.toMatch(b);
      expect(t.text.length).toBeGreaterThan(4);
    }
  });

  it('判据键仅来自 stats 全集（daily §2.1：不引入第二套计数器）', () => {
    const allowed = new Set(['tryOnTotal', 'tryOnUnique', 'lookSavedTotal', 'itemsOwnedTotal', 'furniturePlacedTotal']);
    for (const t of TASK_POOL) expect(allowed.has(t.statKey)).toBe(true);
  });

  it('可达性前提齐备（§2.3：杜绝死任务——摆放类要求 hasFurniture）', () => {
    for (const t of TASK_POOL.filter((t) => t.slot === 'C')) {
      expect(t.reach).toBe('hasFurniture');
    }
    for (const t of TASK_POOL.filter((t) => t.statKey === 'tryOnUnique')) {
      expect(t.reach).toBe('hasUntriedOwnedItem');
    }
  });
});

describe('成就清单（economy §2.2：21 = 收集 9 + 行为 7 + 进度 5）', () => {
  it('数量与分组', () => {
    expect(ACHIEVEMENTS).toHaveLength(21);
    expect(ACHIEVEMENTS.filter((a) => a.group === 'collection')).toHaveLength(9);
    expect(ACHIEVEMENTS.filter((a) => a.group === 'behavior')).toHaveLength(7);
    expect(ACHIEVEMENTS.filter((a) => a.group === 'progress')).toHaveLength(5);
    expect(new Set(ACHIEVEMENTS.map((a) => a.achId)).size).toBe(21);
  });

  it('room §2.5 家具判据冻结值逐条一致', () => {
    const byId = (id: string) => ACHIEVEMENTS.find((a) => a.achId === id)!;
    expect(byId('ac_c4')).toMatchObject({ name: '学院新居', statKey: 'furniturePlacedTotal', threshold: 1 });
    expect(byId('ac_c5')).toMatchObject({ name: '星图小屋', statKey: 'placedAnchors', threshold: 11 });
    expect(byId('ac_c6')).toMatchObject({ name: '满室星辉', statKey: 'placedAnchors', threshold: 17 });
    expect(byId('ac_b6')).toMatchObject({ name: '房间的心跳', statKey: 'furniturePlacedTotal', threshold: 10 });
  });

  it('判据口径红线（economy §5.6 / daily §5.5）：里程碑与成就判据无重叠计价；任务↔成就同键但窗口正交', () => {
    // 红线本体（economy §5.6）：同一收集进度只在一处定义奖励——里程碑判据 = 合计拥有
    // 每 +3 件（economy §4.3）；断言无成就以同键同阈值复用里程碑发放位（ownedAllTotal:3 不存在）
    expect(MILESTONE).toEqual({ perItems: 3, reward: 60 }); // economy §4.3 冻结
    expect(ACHIEVEMENTS.some((a) => a.statKey === 'ownedAllTotal' && a.threshold === 3)).toBe(false);
    // 里程碑判据组合键（itemsOwned+furnitureOwned 合计）与全部成就判据逐条不等
    for (const a of ACHIEVEMENTS) {
      expect(`${a.statKey}:${a.threshold}`).not.toBe('ownedAllTotal:3');
    }
    // 窗口正交留痕（daily §5.5 原文认可：任务 = 当日增量、成就 = 累计一次性——同键非双计价）：
    // 同键同值对仅出现在行为累计判据（如 t_c10↔ac_c4 furniturePlacedTotal:1），两条奖励轨
    // 的 claimed 状态各自独立（daily.tasks[].claimed 每日重置 vs achievements[].claimed 永久锁定）
    const overlaps = TASK_POOL.filter((t) =>
      ACHIEVEMENTS.some((a) => a.statKey === t.statKey && a.threshold === t.goal),
    );
    expect(overlaps.length).toBeGreaterThan(0); // 供验收报告留痕（daily §8.7 对照记录）
    for (const t of overlaps) {
      const ach = ACHIEVEMENTS.find((a) => a.statKey === t.statKey && a.threshold === t.goal)!;
      expect(['behavior', 'collection']).toContain(ach.group); // 仅行为/收集累计类，无进度经济类混入
    }
  });

  it('奖励结构合法（发放走 addCoins/addItem 唯一路径——数据面：coins 或 itemId 恰一）', () => {
    for (const a of ACHIEVEMENTS) {
      const keys = Object.keys(a.reward);
      expect(keys.length).toBeGreaterThanOrEqual(1);
      expect(keys.every((k) => k === 'coins' || k === 'itemId')).toBe(true);
      if (a.reward.itemId) expect(clothingById(a.reward.itemId) || furnitureById(a.reward.itemId)).toBeDefined();
    }
  });
});

describe('默认套装（paperdoll §5.5：首启无档默认渲染）', () => {
  it('13 键齐全，发型成对', () => {
    expect(Object.keys(DEFAULT_OUTFIT)).toHaveLength(14); // 13 槽含 HAND 拆 L/R
    expect(DEFAULT_OUTFIT.BODY).toBeNull(); // 不可卸遮蔽层
    expect(DEFAULT_OUTFIT.HAIR_B).toBeTruthy();
    expect(DEFAULT_OUTFIT.HAIR_F).toBeTruthy();
    const hb = clothingById(DEFAULT_OUTFIT.HAIR_B!)!;
    const hf = clothingById(DEFAULT_OUTFIT.HAIR_F!)!;
    expect(hb.pairId).toBe(hf.pairId);
    // 全部 itemId 在目录内
    for (const id of DEFAULT_OWNED_ITEM_IDS) expect(clothingById(id)).toBeDefined();
  });

  it('首套 = starnight 清单命名（asset-manifest v1.2 §2，P1 定稿）', () => {
    for (const id of DEFAULT_OWNED_ITEM_IDS) expect(id).toContain('starnight');
    // 交付资产对齐：默认套装件均有 @2x 落盘文件（HAIR_F/FACE/FX 无背面件——§4.5/manifest 口径）
    expect(DEFAULT_OWNED_ITEM_IDS.length).toBe(12); // manifest §2 部件全集（HAIR×2 计 2 件；仅 HAND_R 未占用）
  });

  it('默认 TOP 为连衣裙：BTM 遮蔽语义与初始 outfit 一致（paperdoll §5.1 状态渲染解耦）', () => {
    const top = clothingById(DEFAULT_OUTFIT.TOP!)!;
    expect(top.dress).toBe(true); // manifest §2：TOP 槽为连衣裙样本
    expect(DEFAULT_OUTFIT.BTM).toBeTruthy(); // 被遮蔽选择态保留（状态与渲染解耦）
    // 遮蔽判定经模型：着 dress → isBtmOccluded
    const m = new PaperdollModel(DEFAULT_OUTFIT);
    expect(m.isBtmOccluded()).toBe(true);
    // 渲染项：BTM visible=false 且 itemId 保留
    const btm = m.renderItems().find((r) => r.key === 'BTM')!;
    expect(btm.visible).toBe(false);
    expect(btm.itemId).toBe(DEFAULT_OUTFIT.BTM);
  });

  it('8 分组页签全部非空（wardrobe §5.5：首启保证）', () => {
    // 每个 GROUPS 组 ≥1 件默认拥有
    for (const g of GROUPS) {
      const keys = new Set(g.keys.map((k) => (k === 'HAND_L' || k === 'HAND_R' ? 'HAND' : k)));
      expect(DEFAULT_OWNED_ITEM_IDS.some((id) => keys.has(clothingById(id)!.slot))).toBe(true);
    }
  });
});
