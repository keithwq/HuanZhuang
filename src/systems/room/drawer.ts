/**
 * 家具抽屉（SPEC-0001 CARD-02）。
 * 五个页签只列出 SaveService 已拥有的家具。点卡片不在本模块落位。
 */

import { FURNITURE_ITEMS, type FurnCategory, type FurnitureItem } from '../../data/furniture';
import type { SaveService } from '../save/SaveService';

export const FURNITURE_DRAWER_TABS = ['L', 'M', 'S', 'W', 'R'] as const;

export interface FurnitureDrawerPage {
  tab: FurnCategory;
  items: readonly FurnitureItem[];
}

/** 按类目读取已拥有家具。空类目得到空数组，不抛错。 */
export const readFurnitureDrawer = (save: SaveService, tab: FurnCategory): FurnitureDrawerPage => {
  const owned = new Set(save.getOwnedFurniture());
  return {
    tab,
    items: FURNITURE_ITEMS.filter((item) => item.category === tab && owned.has(item.furnId)),
  };
};
