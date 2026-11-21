/**
 * 家具静态目录（E4-S01，economy §3 分池 / room §3 兼容配置）
 * 量级：30 件 = 24 可购 + 6 解锁（economy §3 冻结）；类目 L5/M10/S10/W4/R1（美术圣经 §10.5.5）。
 */

import type { RoomAnchorKind } from '../core/constants/room-anchors';

export type FurnCategory = Exclude<RoomAnchorKind, 'ST'>; // L | M | S | W | R

export interface FurnitureItem {
  furnId: string;
  category: FurnCategory;
  name: string;
  rarity: 'common' | 'rare' | 'limited';
  pool: 'shop' | 'unlock';
  price: number;
  /** 窗帘类（W-06 专用位唯一兼容类，room §2.2 例外） */
  curtain?: boolean;
}

const FURN_BASE: Record<FurnCategory, number> = { S: 120, W: 120, M: 180, L: 240, R: 240 };
const RARITY_COEF = { common: 1.0, rare: 2.0, limited: 3.0 } as const;

type Row = [FurnCategory, string, 'common' | 'rare' | 'limited', 'shop' | 'unlock', 'curtain'?];

/** 首发 30 件学院向家具（asset-manifest v1.2 §3 定稿命名 × 美术圣经 §10.5.5 类目配额：L5/M10/S10/W4/R1） */
const ROWS: Row[] = [
  // L 大件 ×5（4 可购 + 1 解锁）
  ['L', 'starlight_bed', 'rare', 'shop'],
  ['L', 'arcane_wardrobe', 'common', 'shop'],
  ['L', 'moonlight_desk', 'common', 'shop'],
  ['L', 'astrolabe', 'limited', 'shop'],
  ['L', 'cloud_swing', 'limited', 'unlock'],
  // M 中件 ×10（8 可购 + 2 解锁）
  ['M', 'owl_perch', 'common', 'shop'],
  ['M', 'moon_lamp', 'common', 'shop'],
  ['M', 'cloud_chair', 'common', 'shop'],
  ['M', 'startrack_rocker', 'rare', 'shop'],
  ['M', 'bookrack', 'common', 'shop'],
  ['M', 'crystal_table', 'rare', 'shop'],
  ['M', 'plant_shelf', 'common', 'shop'],
  ['M', 'floating_candles', 'rare', 'shop'],
  ['M', 'academy_trunk', 'common', 'shop'],
  ['M', 'potion_shelf', 'limited', 'unlock'],
  // S 小件 ×10（7 可购 + 3 解锁）
  ['S', 'book_stack', 'common', 'shop'],
  ['S', 'crystal_orb', 'rare', 'unlock'],
  ['S', 'quill_pot', 'common', 'shop'],
  ['S', 'candle_s', 'common', 'shop'],
  ['S', 'owl_figurine', 'common', 'shop'],
  ['S', 'moonphase_lamp', 'rare', 'shop'],
  ['S', 'star_plant', 'common', 'shop'],
  ['S', 'letter_tray', 'common', 'shop'],
  ['S', 'wishing_star_bottle', 'limited', 'unlock'],
  ['S', 'star_pillow', 'common', 'unlock'],
  // W 壁饰 ×4（3 可购 + 1 解锁；月纱窗帘 = W-06 窗帘专用唯一兼容类）
  ['W', 'star_painting', 'common', 'shop'],
  ['W', 'starstring', 'common', 'shop'],
  ['W', 'crest_banner', 'rare', 'shop'],
  ['W', 'moon_curtain', 'rare', 'unlock', 'curtain'],
  // R 地垫 ×1（可购）
  ['R', 'star_map_rug', 'common', 'shop'],
];

export const FURNITURE_ITEMS: readonly FurnitureItem[] = ROWS.map(([cat, name, rarity, pool, curtain]) => ({
  furnId: `HZ_ROOM_${cat}_${name}_${rarity === 'common' ? 'a' : rarity === 'rare' ? 'b' : 'c'}_v001`,
  category: cat,
  name: name.replace(/_/g, ' '),
  rarity,
  pool,
  price: FURN_BASE[cat] * RARITY_COEF[rarity],
  ...(curtain === 'curtain' ? { curtain: true } : {}),
}));

export const furnitureById = (furnId: string): FurnitureItem | undefined =>
  FURNITURE_ITEMS.find((f) => f.furnId === furnId);

/** W-06 窗帘专用位（room §2.2）：仅窗帘类可吸附 */
export const isCurtainOnly = (furn: FurnitureItem): boolean => furn.curtain === true;

export const shopFurnitureTotal = (): number =>
  FURNITURE_ITEMS.filter((f) => f.pool === 'shop').reduce((s, f) => s + f.price, 0);
