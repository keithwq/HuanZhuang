/**
 * 初学者默认套装（E1 数据依赖，paperdoll §5.5：首启无档按内置默认套装渲染）
 * 基准 = starnight 星夜学院新生套装（asset-manifest v1.2 §2 P1，12 部件全占位）
 * ⚠️ 语义声明（P5-EL-S1c 连衣裙复核结论）：TOP 默认件为**连衣裙**（starnight_dress）——
 * 穿着期 BTM 槽渲染遮蔽、选择状态保留（paperdoll §5.1 状态与渲染解耦口径，与 GDD 零冲突）；
 * 存档初始 outfit 同时含 BTM=skirt（被遮蔽选择态）——快照/回穿/造型保存均按完整 13 槽一致处理。
 */

import type { OutfitKey } from '../core/constants/slots';
import { clothingById } from './items';

const starnight = (slot: string, part: string): string | null =>
  clothingById(`HZ_char01_${slot}_starnight_${part}_a_v001`)?.itemId ?? null;

/** 13 槽默认装扮（BODY 为不可卸遮蔽层，恒 null——美术圣经 §4.3 L01） */
export const DEFAULT_OUTFIT: Record<OutfitKey, string | null> = {
  BK: starnight('BK', 'cape'),
  BODY: null,
  HAIR_B: starnight('HAIR_B', 'hair'),
  LEG: starnight('LEG', 'boots'),
  BTM: starnight('BTM', 'skirt'), // 连衣裙穿着期遮蔽、状态保留（见文件头语义声明）
  TOP: starnight('TOP', 'dress'),
  OUT: starnight('OUT', 'cardigan'),
  HAND_L: starnight('HAND', 'wand'),
  HAND_R: null,
  NECK: starnight('NECK', 'pendant'),
  HAIR_F: starnight('HAIR_F', 'hair'),
  HEAD: starnight('HEAD', 'tiara'),
  FACE: starnight('FACE', 'blush'),
  FX: starnight('FX', 'veil'),
};

/** 默认套装 itemId 清单（引导层首启 addItem 入柜——wardrobe §5.5：8 组页签全部非空） */
export const DEFAULT_OWNED_ITEM_IDS: readonly string[] = Object.values(DEFAULT_OUTFIT).filter(
  (v): v is string => v !== null,
);

/** 悬空 itemId 兜底槽位默认件（paperdoll §5.5：该槽回退默认件 + 控制台警告） */
export const defaultItemForSlot = (key: OutfitKey): string | null => DEFAULT_OUTFIT[key] ?? null;
