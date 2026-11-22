/**
 * 商店目录（SPEC-0005 CARD-01）。
 * 只读过滤现有数据表的 shop 池。不改标价，不包含解锁池。
 */

import { CLOTHING_ITEMS, type ClothingItem } from '../../data/items';
import { FURNITURE_ITEMS, type FurnitureItem } from '../../data/furniture';
import type { OverlayManager } from '../hud/OverlayManager';
import type { SaveService } from '../save/SaveService';

export type ShopTabId = 'clothing' | 'furniture';

export interface ShopClothingPage {
  tab: 'clothing';
  label: '服装';
  items: readonly ClothingItem[];
}

export interface ShopFurniturePage {
  tab: 'furniture';
  label: '家具';
  items: readonly FurnitureItem[];
}

export type ShopPage = ShopClothingPage | ShopFurniturePage;

export const SHOP_TABS: readonly { id: ShopTabId; label: ShopPage['label'] }[] = [
  { id: 'clothing', label: '服装' },
  { id: 'furniture', label: '家具' },
];

export function readShopPage(tab: 'clothing'): ShopClothingPage;
export function readShopPage(tab: 'furniture'): ShopFurniturePage;
export function readShopPage(tab: ShopTabId): ShopPage;
export function readShopPage(tab: ShopTabId): ShopPage {
  if (tab === 'clothing') {
    return {
      tab,
      label: '服装',
      items: CLOTHING_ITEMS.filter((item) => item.pool === 'shop'),
    };
  }
  return {
    tab,
    label: '家具',
    items: FURNITURE_ITEMS.filter((item) => item.pool === 'shop'),
  };
}

export interface ShopDetail {
  itemId: string;
  name: string;
  price: number;
  series: string;
  tags: readonly string[];
  owned: boolean;
}

export const readShopDetail = (save: SaveService, itemId: string): ShopDetail | null => {
  const clothing = readShopPage('clothing').items.find((item) => item.itemId === itemId);
  if (clothing) {
    return {
      itemId: clothing.itemId,
      name: clothing.name,
      price: clothing.price,
      series: clothing.series,
      tags: clothing.tags,
      owned: save.getOwned().includes(clothing.itemId),
    };
  }
  const furniture = readShopPage('furniture').items.find((item) => item.furnId === itemId);
  if (!furniture) return null;
  return {
    itemId: furniture.furnId,
    name: furniture.name,
    price: furniture.price,
    series: furniture.category,
    tags: [],
    owned: save.getOwnedFurniture().includes(furniture.furnId),
  };
};

/** 详情只在已经打开的商店层里展开，不另开覆盖层。 */
export const revealShopDetail = (
  overlays: OverlayManager,
  save: SaveService,
  itemId: string,
): ShopDetail | null => {
  if (overlays.current() !== 'shop') return null;
  return readShopDetail(save, itemId);
};
