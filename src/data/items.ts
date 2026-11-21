/**
 * 服装静态目录（E4-S01，economy §3/§4.1——表驱动：调价/改文案零存档迁移）
 * 量级（economy §3 冻结）：45 件服装 = 39 可购 + 6 成就解锁，分池互斥（同一物品只属一池）。
 * 定价曲线（economy §4.1）：价格 = 槽位基准价 × 稀有度系数（普通1.0≈60% / 稀有2.0≈30% / 限定3.0≈10%）。
 */

import type { OutfitKey, SlotId } from '../core/constants/slots';

export type Rarity = 'common' | 'rare' | 'limited';
export type Pool = 'shop' | 'unlock';

export interface ClothingItem {
  itemId: string;
  /** 服装槽位（HAIR 槽成对：pairId 关联） */
  slot: SlotId;
  /** 存档 outfit 键（HAND → HAND_L/HAND_R 两键，此处声明归属键） */
  outfitKeys: readonly OutfitKey[];
  /** 成套系列 slug（成套呼应：同点缀色彩蛋——支柱 2） */
  series: string;
  name: string;
  rarity: Rarity;
  pool: Pool;
  price: number;
  /** 连衣裙（注册为 TOP，渲染遮蔽 BTM——美术圣经 §4.3） */
  dress?: boolean;
  /** 发型前缀对（HAIR_B+HAIR_F 强制成对，paperdoll §5.2） */
  pairId?: string;
  tags: readonly string[];
}

const RARITY_COEF: Record<Rarity, number> = { common: 1.0, rare: 2.0, limited: 3.0 };
/** 槽位基准价（economy §4.1） */
const BASE_PRICE: Record<string, number> = {
  NECK: 120, HEAD: 120, FACE: 120, HAND: 120,          // 小槽
  HAIR_B: 180, HAIR_F: 180, LEG: 180, BTM: 180,       // 中槽
  TOP: 240, OUT: 240, BK: 240, FX: 240,               // 大槽
};

export const priceOf = (slot: string, rarity: Rarity): number => BASE_PRICE[slot] * RARITY_COEF[rarity];

/**
 * 目录构造：[slot, series, 变体名, rarity, pool, dress?]
 * 槽位配额（45 件口径，README E4-S01 表完整性 spec 的对账基准）：
 *   HAIR 4 对（8 件：3 对可购 + 1 对解锁）/ LEG 5 / BTM 5 / TOP 8（含 2 连衣裙）
 *   OUT 5 / HAND 4 / NECK 3 / HEAD 2 / FACE 1 / BK 2 / FX 2
 */
type Row = [SlotId, string, string, Rarity, Pool] | [SlotId, string, string, Rarity, Pool, 'dress'];

const ROWS: Row[] = [
  // —— 星辉系列（首套默认套装来源，全普通档）
  ['HAIR_B', 'starlight', 'twin_braid', 'common', 'shop'],
  ['HAIR_F', 'starlight', 'twin_braid', 'common', 'shop'],
  ['LEG', 'starlight', 'star_ankle_boots', 'common', 'shop'],
  ['BTM', 'starlight', 'pleated_nightskirt', 'common', 'shop'],
  ['TOP', 'starlight', 'campus_shirt', 'common', 'shop'],
  ['OUT', 'starlight', 'dew_cardigan', 'common', 'shop'],
  ['HAND', 'starlight', 'star_wand', 'common', 'shop'],
  ['NECK', 'starlight', 'moonstone_choker', 'common', 'shop'],
  ['HEAD', 'starlight', 'star_barrette', 'common', 'shop'],
  // —— 月露系列
  ['HAIR_B', 'moondew', 'long_waves', 'common', 'shop'],
  ['HAIR_F', 'moondew', 'long_waves', 'common', 'shop'],
  ['TOP', 'moondew', 'silver_thread_gown', 'rare', 'shop', 'dress'],
  ['OUT', 'moondew', 'veil_cloak', 'rare', 'shop'],
  ['BTM', 'moondew', 'lace_shorts', 'common', 'shop'],
  ['LEG', 'moondew', 'glass_slippers', 'rare', 'shop'],
  ['FX', 'moondew', 'silver_mist_veil', 'rare', 'shop'],
  // —— 花藤系列
  ['HAIR_B', 'vinerose', 'flower_updo', 'rare', 'shop'],
  ['HAIR_F', 'vinerose', 'flower_updo', 'rare', 'shop'],
  ['TOP', 'vinerose', 'rose_lace_dress', 'rare', 'shop', 'dress'],
  ['NECK', 'vinerose', 'vine_pendant', 'common', 'shop'],
  ['HEAD', 'vinerose', 'flower_crown', 'limited', 'shop'],
  // —— 云梦系列
  ['BTM', 'clouddream', 'cloud_puff_skirt', 'common', 'shop'],
  ['TOP', 'clouddream', 'soft_cloud_blouse', 'common', 'shop'],
  ['OUT', 'clouddream', 'cloud_wrap_shawl', 'common', 'shop'],
  ['HAND', 'clouddream', 'dream_catcher_l', 'common', 'shop'],
  ['HAND', 'clouddream', 'dream_catcher_r', 'common', 'shop'],
  ['LEG', 'clouddream', 'pom_cloud_socks', 'common', 'shop'],
  // —— 学院系列
  ['TOP', 'academy', 'lecture_gown', 'common', 'shop'],
  ['OUT', 'academy', 'constellation_cloak', 'rare', 'shop'],
  ['LEG', 'academy', 'buckle_oxfords', 'common', 'shop'],
  ['FACE', 'academy', 'star_reading_glasses', 'common', 'shop'],
  ['BK', 'academy', 'spirit_wings', 'limited', 'shop'],
  // —— 星轨系列
  ['BTM', 'astral', 'comet_tail_pants', 'rare', 'shop'],
  ['TOP', 'astral', 'meteor_wrap_top', 'rare', 'shop'],
  ['NECK', 'astral', 'orbit_choker', 'common', 'shop'],
  ['LEG', 'astral', 'nova_heel_boots', 'rare', 'shop'],
  ['OUT', 'astral', 'aurora_trench', 'limited', 'shop'],
  ['HAIR_B', 'astral', 'nebula_bun', 'rare', 'shop'],
  ['HAIR_F', 'astral', 'nebula_bun', 'rare', 'shop'],
  // —— 成就解锁池（6 件，不在商店目录出现——economy §2.1 分池规则）
  ['HAIR_B', 'celestine', 'galaxy_cascade', 'limited', 'unlock'],
  ['HAIR_F', 'celestine', 'galaxy_cascade', 'limited', 'unlock'],
  ['TOP', 'celestine', 'astral_ceremony_gown', 'limited', 'unlock', 'dress'],
  ['OUT', 'celestine', 'moonlight_mantle', 'limited', 'unlock'],
  ['HEAD', 'celestine', 'laurel_of_stars', 'limited', 'unlock'],
  ['BK', 'celestine', 'constellation_halo', 'limited', 'unlock'],
];

const nameOf = (r: Row): string => r[2].replace(/_/g, ' ');

const TAG_SETS: Record<string, readonly string[]> = {
  starlight: ['日常', '学院'],
  moondew: ['月光', '礼服'],
  vinerose: ['花藤', '礼服'],
  clouddream: ['云梦', '日常'],
  academy: ['学院', '星辉'],
  astral: ['星辉', '幻彩'],
  celestine: ['幻彩', '月光'],
};
function tagsFor(series: string): readonly string[] {
  return TAG_SETS[series] ?? ['日常'];
}

export const CLOTHING_ITEMS: readonly ClothingItem[] = ROWS.map((r) => {
  const [slot, series, variant, rarity, pool, dress] = r;
  const base = { slot, series, name: nameOf(r), rarity, pool, price: priceOf(slot, rarity), tags: tagsFor(series) } as ClothingItem;
  const item: ClothingItem = {
    ...base,
    itemId: `HZ_char01_${slot}_${series}_${variant}_${rarity === 'common' ? 'a' : rarity === 'rare' ? 'b' : 'c'}_v001`,
    outfitKeys:
      slot === 'HAND'
        ? (variant.endsWith('_r') ? (['HAND_R'] as const) : (['HAND_L'] as const))
        : ([slot] as const),
  };
  if (slot === 'HAIR_B' || slot === 'HAIR_F') item.pairId = `${series}_${variant}`;
  if (dress === 'dress') item.dress = true;
  return item;
});

export const clothingById = (itemId: string): ClothingItem | undefined =>
  CLOTHING_ITEMS.find((c) => c.itemId === itemId);

/** 发型前缀对（paperdoll §5.2：发型选择 = 同时设定 HAIR_B + HAIR_F 同前缀两件） */
export const hairPairOf = (pairId: string): { hairB: ClothingItem; hairF: ClothingItem } | undefined => {
  const pair = CLOTHING_ITEMS.filter((c) => c.pairId === pairId);
  const hairB = pair.find((c) => c.slot === 'HAIR_B');
  const hairF = pair.find((c) => c.slot === 'HAIR_F');
  return hairB && hairF ? { hairB, hairF } : undefined;
};

export const hairPairByItemId = (itemId: string): { hairB: ClothingItem; hairF: ClothingItem } | undefined => {
  const item = clothingById(itemId);
  return item?.pairId ? hairPairOf(item.pairId) : undefined;
};

/** 风格标签全集（wardrobe §2.1：≤8 组） */
export const STYLE_TAGS: readonly string[] = ['日常', '学院', '月光', '礼服', '花藤', '云梦', '星辉', '幻彩'];

/** 可购目录总价（economy §4.2 对账：服装 39 件 ≈11,700） */
export const shopClothingTotal = (): number =>
  CLOTHING_ITEMS.filter((c) => c.pool === 'shop').reduce((s, c) => s + c.price, 0);
