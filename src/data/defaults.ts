/**
 * 初学者默认套装（E1 数据依赖，paperdoll §5.5：首启无档按内置默认套装渲染）
 * 全部取自 starlight 系列普通档（items.ts 首组 9 件 + 补齐 LEG/OUT/HAND_R——13 键非空）
 */

import type { OutfitKey } from '../core/constants/slots';
import { clothingById } from './items';

/** 13 槽默认装扮（BODY 为不可卸遮蔽层，恒 null——美术圣经 §4.3 L01） */
export const DEFAULT_OUTFIT: Record<OutfitKey, string | null> = {
  BK: null,
  BODY: null,
  HAIR_B: clothingById('HZ_char01_HAIR_B_starlight_twin_braid_a_v001')?.itemId ?? null,
  LEG: clothingById('HZ_char01_LEG_starlight_star_ankle_boots_a_v001')?.itemId ?? null,
  BTM: clothingById('HZ_char01_BTM_starlight_pleated_nightskirt_a_v001')?.itemId ?? null,
  TOP: clothingById('HZ_char01_TOP_starlight_campus_shirt_a_v001')?.itemId ?? null,
  OUT: clothingById('HZ_char01_OUT_starlight_dew_cardigan_a_v001')?.itemId ?? null,
  HAND_L: clothingById('HZ_char01_HAND_starlight_star_wand_a_v001')?.itemId ?? null,
  HAND_R: null,
  NECK: clothingById('HZ_char01_NECK_starlight_moonstone_choker_a_v001')?.itemId ?? null,
  HAIR_F: clothingById('HZ_char01_HAIR_F_starlight_twin_braid_a_v001')?.itemId ?? null,
  HEAD: clothingById('HZ_char01_HEAD_starlight_star_barrette_a_v001')?.itemId ?? null,
  FACE: null,
  FX: null,
};

/** 默认套装 itemId 清单（引导层首启 addItem 入柜——wardrobe §5.5：13 槽页签全部非空） */
export const DEFAULT_OWNED_ITEM_IDS: readonly string[] = Object.values(DEFAULT_OUTFIT).filter(
  (v): v is string => v !== null,
);

/** 悬空 itemId 兜底槽位默认件（paperdoll §5.5：该槽回退默认件 + 控制台警告） */
export const defaultItemForSlot = (key: OutfitKey): string | null => DEFAULT_OUTFIT[key] ?? null;
