/**
 * E2-S03/S04 · 衣柜分组 / 筛选 / 点选即换状态机（wardrobe §2/§4/§5/§8）
 */

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { bus } from '../../src/core/bus';
import { CLOTHING_ITEMS, type ClothingItem } from '../../src/data/items';
import { PaperdollModel } from '../../src/systems/paperdoll/model';
import { SaveService } from '../../src/systems/save/SaveService';
import { filterItems } from '../../src/systems/wardrobe/filter';
import { groupOfSlot, GROUPS, sortGroupItems, unequipCardsOf } from '../../src/systems/wardrobe/groups';
import { attachTryOnCounting, TryonController } from '../../src/systems/wardrobe/tryonController';
import { SAVE_KEY } from '../../src/systems/save/types';

beforeEach(() => {
  bus.clear();
  window.localStorage.removeItem(SAVE_KEY);
  window.localStorage.removeItem('huanzhuang_save_bak');
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  bus.clear();
});

describe('分组契约（GAP-4 / ux-spec §2.1）', () => {
  it('8 组覆盖全部 13 个存档键（12 可操作槽，HAND 拆 L/R；BODY 不入页签），无重叠', () => {
    const all = GROUPS.flatMap((g) => g.keys);
    expect(new Set(all).size).toBe(13);
    expect(all).not.toContain('BODY'); // BODY 不入页签（L01 不可卸）
  });

  it('混组卸下卡：G2×2 / G7×3 / G8×2 每槽一张 + Caption 标注；单槽组一张', () => {
    expect(unequipCardsOf('G1')).toEqual([{ key: 'HAIR_B', label: '发型' }]); // 强制成对组（双槽同卸）
    expect(unequipCardsOf('G2')).toHaveLength(2);
    expect(unequipCardsOf('G7')).toHaveLength(3);
    expect(unequipCardsOf('G7').map((c) => c.label)).toEqual(['项链', '左手', '右手']);
    expect(unequipCardsOf('G8')).toHaveLength(2);
    expect(unequipCardsOf('G3')).toEqual([{ key: 'TOP', label: '上装' }]);
  });

  it('组内次序规则：当前穿着置顶钉住 → 系列聚集 → 系列内稀有度升序（ux-spec §2.1 定稿）', () => {
    const items = [
      { itemId: 'a', series: 'academy', rarity: 'rare' as const, worn: false },
      { itemId: 'b', series: 'starlight', rarity: 'common' as const, worn: true },
      { itemId: 'c', series: 'academy', rarity: 'common' as const, worn: false },
      { itemId: 'd', series: 'academy', rarity: 'limited' as const, worn: false },
      { itemId: 'e', series: 'starlight', rarity: 'rare' as const, worn: false },
    ];
    const sorted = sortGroupItems(items);
    expect(sorted.map((i) => i.itemId)).toEqual(['b', 'c', 'a', 'd', 'e']);
    // b（穿着置顶）→ academy 系聚集（字典序在前，内按稀有度升序 c→a→d）→ starlight 系（e）
  });

  it('槽位 → 组归类正确（跨发型混搭页签不存在）', () => {
    expect(groupOfSlot('TOP')).toBe('G3');
    expect(groupOfSlot('HAND')).toBe('G7');
    expect(groupOfSlot('BK')).toBe('G8');
    expect(groupOfSlot('FACE')).toBe('G2');
  });
});

describe('筛选谓词（wardrobe §4：单选 OR 语义）', () => {
  it('衣柜 = 已拥有全集：未拥有不可达（D3-05）', () => {
    const owned = CLOTHING_ITEMS.slice(0, 5).map((c) => c.itemId);
    const filtered = filterItems(CLOTHING_ITEMS, { owned, activeTag: null });
    expect(filtered).toHaveLength(5);
    expect(filtered.every((c) => owned.includes(c.itemId))).toBe(true);
  });

  it('单选标签 OR：activeTag ∈ item.tags', () => {
    const owned = CLOTHING_ITEMS.map((c) => c.itemId);
    const moon = filterItems(CLOTHING_ITEMS, { owned, activeTag: '月光' });
    expect(moon.length).toBeGreaterThan(0);
    expect(moon.every((c) => c.tags.includes('月光'))).toBe(true);
  });

  it('页签 × 标签空集 → 空数组（空态文案归 UI 层，wardrobe §5.7）', () => {
    const owned = [CLOTHING_ITEMS[0].itemId]; // 仅 starlight（标签 日常/学院）
    expect(filterItems(CLOTHING_ITEMS, { owned, activeTag: '礼服' })).toHaveLength(0);
  });
});

describe('点选即换状态机（wardrobe §2.2 / §8.1：无锁、可打断、不吞点击）', () => {
  const setup = () => {
    const model = new PaperdollModel();
    const save = new SaveService();
    const ctrl = new TryonController(model, save);
    const detach = attachTryOnCounting(save);
    return { model, save, ctrl, detach };
  };

  it('点选 → tryOn → 计数入 stats；连续点选每次生效（无锁）', () => {
    const { ctrl, save } = setup();
    const tops = CLOTHING_ITEMS.filter((c) => c.slot === 'TOP' && !c.dress).slice(0, 3);
    for (const t of tops) {
      expect(ctrl.tapCard(t).type).toBe('applied');
    }
    expect(save.getStats().tryOnTotal).toBe(3);
    expect(save.getStats().tryOnUnique).toBe(3);
  });

  it('极端连点（>10 次/秒）：点选立即生效、计数照常累加（wardrobe §5.6）', () => {
    const { ctrl, save } = setup();
    const items = CLOTHING_ITEMS.filter((c) => c.slot === 'TOP');
    for (let i = 0; i < 15; i++) {
      ctrl.tapCard(items[i % items.length]);
    }
    expect(save.getStats().tryOnTotal).toBe(15);
  });

  it('卡片 = 当前穿着 → 轻反馈无状态变化（wardrobe §2.2）', () => {
    const { ctrl, save } = setup();
    const top = CLOTHING_ITEMS.find((c) => c.slot === 'TOP' && !c.dress)!;
    ctrl.tapCard(top);
    const before = save.getStats().tryOnTotal;
    expect(ctrl.tapCard(top).type).toBe('lightFeedback'); // 再点同卡
    expect(save.getStats().tryOnTotal).toBe(before);      // 无计数
  });

  it('卸下卡 → 槽位回空、BODY 显露 + **tryOnTotal 同计**（wardrobe §3/§8.1 联合 + QA MAJ-1 修复）', () => {
    const { ctrl, model, save } = setup();
    const top = CLOTHING_ITEMS.find((c) => c.slot === 'TOP' && !c.dress)!;
    ctrl.tapCard(top);
    const before = save.getStats().tryOnTotal;
    expect(ctrl.tapUnequip('TOP').type).toBe('unequipped');
    expect(model.getOutfitKey('TOP')).toBeNull();
    expect(save.getStats().tryOnTotal).toBe(before + 1); // 卸下计数（wardrobe §3 冻结口径）
  });

  it('连衣裙 + BTM 页签：状态更新画面遮蔽 + Caption 信号（wardrobe §2.3/§8.4）', () => {
    const { ctrl } = setup();
    const dress = CLOTHING_ITEMS.find((c) => c.dress && c.slot === 'TOP')!;
    const ev = ctrl.tapCard(dress);
    expect(ev.type).toBe('btmOccludedCaption'); // 遮蔽联动信号 → Caption（非弹窗）
    // 连衣裙期间 BTM 页签可换（状态更新、画面仍被遮蔽）
    const btm = CLOTHING_ITEMS.filter((c) => c.slot === 'BTM')[1];
    expect(ctrl.tapCard(btm).type).toBe('applied');
  });

  it('发型卡 = 前缀对：点选同时设定 HAIR_B+HAIR_F，双键入档（wardrobe §5.2/§8.3）', () => {
    const { ctrl, save } = setup();
    const hair = CLOTHING_ITEMS.find((c) => c.slot === 'HAIR_B')!;
    expect(ctrl.tapHairCard(hair).type).toBe('applied');
    const outfit = save.getOutfit();
    expect(outfit.HAIR_B).toBe(hair.itemId);
    const pairF = CLOTHING_ITEMS.find((c) => c.slot === 'HAIR_F' && c.pairId === hair.pairId)!;
    expect(outfit.HAIR_F).toBe(pairF.itemId);
  });

  it('试穿事件以 S01 成功回调为准：单通道不重复计数（wardrobe §6）', () => {
    const { ctrl, save } = setup();
    const top = CLOTHING_ITEMS.find((c) => c.slot === 'TOP')!;
    ctrl.tapCard(top);
    // 控制器内不直接 bump——计数全部经 tryon:done 事件单通道
    expect(save.getStats().tryOnTotal).toBe(1);
    // unequip 同计（wardrobe §3 冻结口径 + QA MAJ-1 修复）
    ctrl.tapUnequip('TOP');
    expect(save.getStats().tryOnTotal).toBe(2);
  });
});

describe('卡片数据口径（wardrobe §3）', () => {
  it('outfitKeys：HAND 挂点键按变体 _l/_r 绑定；其余单键', () => {
    const handL = CLOTHING_ITEMS.find((c) => c.slot === 'HAND' && c.outfitKeys[0] === 'HAND_L')!;
    const handR = CLOTHING_ITEMS.find((c) => c.slot === 'HAND' && c.outfitKeys[0] === 'HAND_R')!;
    expect(handL.outfitKeys).toEqual(['HAND_L']);
    expect(handR.outfitKeys).toEqual(['HAND_R']);
    expect(handR.itemId).toMatch(/dream_catcher_r/); // 变体后缀 _r → HAND_R
    const dl = CLOTHING_ITEMS.find((c) => c.slot === 'HAND' && c.itemId.includes('dream_catcher_l'))!;
    expect(dl.outfitKeys).toEqual(['HAND_L']);
    const top: ClothingItem = CLOTHING_ITEMS.find((c) => c.slot === 'TOP')!;
    expect(top.outfitKeys).toEqual(['TOP']);
  });
});
