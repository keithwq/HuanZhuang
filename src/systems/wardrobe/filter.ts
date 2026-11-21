/**
 * 衣柜筛选谓词（E2-S03，wardrobe §4：单选标签、OR 语义）
 * 显示集合 = ownedItems(slot) ∧ (activeTag == null ∨ activeTag ∈ item.tags)
 */

import type { ClothingItem } from '../../data/items';

export interface FilterInput {
  owned: readonly string[];
  activeTag: string | null;
}

export const filterItems = (
  items: readonly ClothingItem[],
  { owned, activeTag }: FilterInput,
): ClothingItem[] => {
  return items.filter((it) => {
    if (!owned.includes(it.itemId)) return false; // 衣柜 = 已拥有全集（D3-05，未拥有不可达）
    if (activeTag === null) return true;
    return it.tags.includes(activeTag); // 单选 OR 语义（v1 无多标签交并需求）
  });
};
