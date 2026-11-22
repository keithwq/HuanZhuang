/**
 * 商店购入（SPEC-0005 CARD-02）。
 * 余额够才扣费并走已有入柜入口。不够或已拥有都不写扣款。
 */

import type { SaveService } from '../save/SaveService';
import { readShopPage } from './catalog';

export const BROKE_CAPTION = '星尘不够啦，去做每日任务吧';

export type ShopPurchaseResult =
  | { ok: true }
  | { ok: false; reason: 'broke' | 'owned' | 'missing'; shake: boolean; toast: string | null };

const refused = (reason: 'broke' | 'owned' | 'missing'): ShopPurchaseResult => {
  if (reason === 'broke') return { ok: false, reason, shake: true, toast: BROKE_CAPTION };
  return { ok: false, reason, shake: false, toast: null };
};

export const purchaseShopItem = (save: SaveService, itemId: string): ShopPurchaseResult => {
  const clothing = readShopPage('clothing').items.find((item) => item.itemId === itemId);
  const furniture = clothing
    ? undefined
    : readShopPage('furniture').items.find((item) => item.furnId === itemId);
  const item = clothing ?? furniture;
  if (!item) return refused('missing');

  const already = clothing
    ? save.getOwned().includes(clothing.itemId)
    : save.getOwnedFurniture().includes(furniture!.furnId);
  if (already) return refused('owned');
  if (save.getCoins() < item.price) return refused('broke');

  // 家具入柜没有单独落盘。先放入内存，扣费时的写档会带上它。
  if (furniture && !save.addFurniture(furniture.furnId)) return refused('owned');
  if (!save.spendCoins(item.price, 'shop_purchase')) return refused('broke');
  if (clothing && !save.addItem(clothing.itemId, 'shop_purchase')) return refused('owned');
  return { ok: true };
};
