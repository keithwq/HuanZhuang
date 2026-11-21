/**
 * 13 槽位 + 正/背两张独立层序表（E1-S01）
 * 依据：美术圣经 §4.3（正面 L00~L12）/ §4.5（背面 B-L00~B-L11，FACE 背视图不渲染）
 * 红线（paperdoll §5.4）：正/背两表独立维护，禁止一张表加翻转逻辑推导。
 */

/** 13 槽位代码（美术圣经 §4.3） */
export type SlotId =
  | 'BK' | 'BODY' | 'HAIR_B' | 'LEG' | 'BTM' | 'TOP' | 'OUT'
  | 'HAND' | 'NECK' | 'HAIR_F' | 'HEAD' | 'FACE' | 'FX';

/** outfit 存档键（local-save §2.1/§3：13 槽映射，HAND 拆 HAND_L/HAND_R 两键，BODY 恒非玩家可卸） */
export type OutfitKey =
  | 'BK' | 'BODY' | 'HAIR_B' | 'LEG' | 'BTM' | 'TOP' | 'OUT'
  | 'HAND_L' | 'HAND_R' | 'NECK' | 'HAIR_F' | 'HEAD' | 'FACE' | 'FX';

export const SLOT_IDS: readonly SlotId[] = [
  'BK', 'BODY', 'HAIR_B', 'LEG', 'BTM', 'TOP', 'OUT',
  'HAND', 'NECK', 'HAIR_F', 'HEAD', 'FACE', 'FX',
];

/** 正面层序表 L00→L12（美术圣经 §4.3 全局叠放顺序） */
export const FRONT_LAYERS: readonly { depth: number; slot: SlotId }[] = [
  { depth: 0, slot: 'BK' },      // L00 背景装饰：翅膀/披风后摆/光环
  { depth: 1, slot: 'BODY' },     // L01 身体基底（不可卸载遮蔽层）
  { depth: 2, slot: 'HAIR_B' },   // L02 发型·后层
  { depth: 3, slot: 'LEG' },      // L03 鞋袜（袜先鞋后为渲染规则）
  { depth: 4, slot: 'BTM' },      // L04 下装
  { depth: 5, slot: 'TOP' },      // L05 上装/连衣裙（连衣裙同时遮蔽 BTM）
  { depth: 6, slot: 'OUT' },      // L06 外套
  { depth: 7, slot: 'HAND' },     // L07 手持（左右手各一挂点）
  { depth: 8, slot: 'NECK' },     // L08 颈饰
  { depth: 9, slot: 'HAIR_F' },   // L09 发型·前层
  { depth: 10, slot: 'HEAD' },    // L10 头饰
  { depth: 11, slot: 'FACE' },   // L11 面饰
  { depth: 12, slot: 'FX' },      // L12 前景特效
];

/** 背面层序表 B-L00→B-L11（美术圣经 §4.5，与正面表镜像逻辑独立定义） */
export const BACK_LAYERS: readonly { depth: number; slot: SlotId }[] = [
  { depth: 0, slot: 'HAIR_F' },   // B-L00 刘海最远端，几乎不可见
  { depth: 1, slot: 'BODY' },     // B-L01 身体背面（无五官）
  { depth: 2, slot: 'LEG' },     // B-L02 鞋袜背面
  { depth: 3, slot: 'BTM' },     // B-L03 下装背面
  { depth: 4, slot: 'TOP' },     // B-L04 上装背面
  { depth: 5, slot: 'OUT' },     // B-L05 外套/斗篷背面（showcase 位）
  { depth: 6, slot: 'HAND' },     // B-L06 手持
  { depth: 7, slot: 'NECK' },     // B-L07 颈饰背面
  { depth: 8, slot: 'HAIR_B' },   // B-L08 发型后层——背视图视觉主角，100% 精度
  { depth: 9, slot: 'HEAD' },     // B-L09 头饰后沿
  { depth: 10, slot: 'BK' },      // B-L10 翅膀/光环——背视图最近端，100% 精度
  { depth: 11, slot: 'FX' },      // B-L11 前景特效
  // FACE：背视图不渲染（美术圣经 §4.5）
];

/** 100% 精度背视图片（D2-01 分级精度，其余背面 60%） */
export const BACK_FULL_PRECISION_SLOTS: readonly SlotId[] = ['HAIR_B', 'BK'];

/** 发型强制成对（paperdoll §5.2 / 美术圣经 §5.3）：一个发型 = HAIR_B + HAIR_F 同前缀两件 */
export const HAIR_PAIR: readonly [OutfitKey, OutfitKey] = ['HAIR_B', 'HAIR_F'];

/** HAND 槽左右挂点（local-save §3 口径） */
export const HAND_KEYS: readonly [OutfitKey, OutfitKey] = ['HAND_L', 'HAND_R'];

export const isOutfitKey = (k: string): k is OutfitKey =>
  (SLOT_IDS as readonly string[]).includes(k === 'HAND_L' || k === 'HAND_R' ? 'HAND' : k);

/** 玩家可操作槽（BODY 不可卸载遮蔽层，不入页签——ux-spec §2.1） */
export const ASSIGNABLE_SLOTS: readonly SlotId[] = SLOT_IDS.filter((s) => s !== 'BODY');
