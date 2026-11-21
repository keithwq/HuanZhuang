/**
 * 衣柜 8 分组页签（E2-S03，GAP-4——wardrobe §2.1 修订 + ux-spec §2.1 分组表）
 * 13 槽 → 8 组（BODY 不入页签：不可卸载遮蔽层）；组概念只在 UI 层，不进渲染层（换装仍逐槽）。
 */

import type { GroupId } from '../../core/bus';
import type { OutfitKey, SlotId } from '../../core/constants/slots';
import { slotOfKey } from '../paperdoll/model';

export interface GroupDef {
  id: GroupId;
  name: string;
  /** 成员存档键（HAND 拆 L/R；HAIR 组含成对双键） */
  keys: readonly OutfitKey[];
  /** 混组 = 多键；组内规则见 ux-spec §2.1 */
  mixed: boolean;
}

export const GROUPS: readonly GroupDef[] = [
  { id: 'G1', name: '发型', keys: ['HAIR_B', 'HAIR_F'], mixed: false }, // 强制成对操作（卸下 = 双槽同卸）
  { id: 'G2', name: '头饰', keys: ['HEAD', 'FACE'], mixed: true },      // 混组浏览、逐槽换装
  { id: 'G3', name: '上装', keys: ['TOP'], mixed: false },
  { id: 'G4', name: '下装', keys: ['BTM'], mixed: false },              // 连衣裙期间遮蔽 Caption（wardrobe §2.3）
  { id: 'G5', name: '外套', keys: ['OUT'], mixed: false },
  { id: 'G6', name: '鞋袜', keys: ['LEG'], mixed: false },
  { id: 'G7', name: '配饰', keys: ['NECK', 'HAND_L', 'HAND_R'], mixed: true },
  { id: 'G8', name: '光效', keys: ['BK', 'FX'], mixed: true },
];

export const groupById = (id: GroupId): GroupDef => GROUPS.find((g) => g.id === id)!;

/** 卸下卡配置（wardrobe §2.1 修订段：混组为每槽一张卸下卡 + Caption 标注；单槽组一张） */
export interface UnequipCard {
  key: OutfitKey;
  /** Caption 标注文本（混组必标；单槽组 = 组名） */
  label: string;
}

export const unequipCardsOf = (id: GroupId): UnequipCard[] => {
  const g = groupById(id);
  if (!g.mixed) return [{ key: g.keys[0], label: g.name }];
  const labels: Record<string, string> = {
    HEAD: '头饰', FACE: '面饰', NECK: '项链', HAND_L: '左手', HAND_R: '右手', BK: '背饰', FX: '光效',
  };
  return g.keys.map((k) => ({ key: k, label: labels[k] ?? k }));
};

/** 分组完整性断言（ux-spec §2.1：8 组覆盖 12 个用户可操作槽 = 13 槽 − BODY） */
export const allAssignableKeysCovered = (): boolean => {
  const covered = new Set<OutfitKey>(GROUPS.flatMap((g) => g.keys));
  const expected: OutfitKey[] = (['BK', 'HAIR_B', 'LEG', 'BTM', 'TOP', 'OUT', 'HAND_L', 'HAND_R', 'NECK', 'HAIR_F', 'HEAD', 'FACE', 'FX'] as OutfitKey[]);
  return expected.every((k) => covered.has(k));
};

/** 组内次序（ux-spec §2.1 定稿）：当前穿着件置顶钉住 → 系列聚集 → 系列内稀有度升序 */
export type SortableItem = {
  itemId: string;
  series: string;
  rarity: 'common' | 'rare' | 'limited';
  worn: boolean;
};

const RARITY_ORDER: Record<SortableItem['rarity'], number> = { common: 0, rare: 1, limited: 2 };

export const sortGroupItems = <T extends SortableItem>(items: readonly T[]): T[] => {
  return [...items].sort((a, b) => {
    if (a.worn !== b.worn) return a.worn ? -1 : 1;               // 当前穿着置顶钉住
    if (a.series !== b.series) return a.series < b.series ? -1 : 1; // 系列聚集
    return RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity];       // 稀有度升序（便宜在前）
  });
};

/** 组 ID 页签事件参数域（onTabChange(groupId)——GAP-4 注记，ux-spec §2.3） */
export const isGroupId = (v: string): v is GroupId =>
  GROUPS.some((g) => g.id === v);

/** 服装槽位 → 所属组（卡片归类用） */
export const groupOfSlot = (slot: SlotId): GroupId => {
  const key = slot === 'HAND' ? 'HAND_L' : (slot as OutfitKey);
  const g = GROUPS.find((gr) => gr.keys.includes(key));
  if (g) return g.id;
  const g2 = GROUPS.find((gr) => gr.keys.includes(slot as OutfitKey));
  return g2!.id;
};

void slotOfKey;
