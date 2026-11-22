/**
 * 成就惰性判定与领取（economy §2.2 / §5.3 / §5.7）
 * 打开成就页或关闭覆盖层时对照数据表。不在 bumpStat 上逐次判定。
 * 未达成不调用发奖。领取走已有 claimAchievement，星尘只走 addCoins。
 * 家具点位用 countOccupied，摆放次数用已有 furniturePlacedTotal，阈值只读数据表。
 */

import { ACHIEVEMENTS, achievementById, type AchievementGroup } from '../../data/achievements';
import { CLOTHING_ITEMS } from '../../data/items';
import { badgeText } from '../hud/layout';
import type { OverlayManager } from '../hud/OverlayManager';
import type { SaveService } from '../save/SaveService';

const UNLOCK_CLOTHING = new Set(
  CLOTHING_ITEMS.filter((item) => item.pool === 'unlock').map((item) => item.itemId),
);

export interface AchievementRow {
  achId: string;
  name: string;
  desc: string;
  group: AchievementGroup;
  progress: number;
  threshold: number;
  claimable: boolean;
  claimed: boolean;
}

/** 底部「成就」可点。页签表仍标不可用，点亮只发生在场景里。 */
export const tabOpensAchievements = (label: string): boolean => label === '成就';

const readStat = (save: SaveService, statKey: string): number => {
  if (statKey === 'placedAnchors') return save.countOccupied();
  if (statKey === 'furnitureOwnedTotal') return save.getOwnedFurniture().length;
  if (statKey === 'ownedAllTotal') return save.getOwned().length + save.getOwnedFurniture().length;
  if (statKey === 'unlockOwnedTotal') return unlockClothingOwned(save);
  if (statKey === 'loginDaysTotal') return save.getLoginDayCount();
  if (
    statKey === 'tryOnTotal' ||
    statKey === 'tryOnUnique' ||
    statKey === 'lookSavedTotal' ||
    statKey === 'itemsOwnedTotal' ||
    statKey === 'furniturePlacedTotal' ||
    statKey === 'coinEarnTotal'
  ) {
    return save.getStats()[statKey];
  }
  return 0;
};

const unlockClothingOwned = (save: SaveService): number => {
  let count = 0;
  for (const itemId of save.getOwned()) {
    if (UNLOCK_CLOTHING.has(itemId)) count += 1;
  }
  return count;
};

/** 结算登录日（dateKey 去重）并对照 21 条。同一天再调，登录天数不变。 */
export const evaluateAchievements = (save: SaveService): AchievementRow[] => {
  save.noteLoginDate(save.syncDailyDate());
  return ACHIEVEMENTS.map((def) => {
    const progress = readStat(save, def.statKey);
    const claimed = save.getAchievement(def.achId).claimed;
    save.syncAchievementProgress(def.achId, progress);
    return {
      achId: def.achId,
      name: def.name,
      desc: def.desc,
      group: def.group,
      progress,
      threshold: def.threshold,
      claimable: progress >= def.threshold && !claimed,
      claimed,
    };
  });
};

/** 可领取数量。0 不显示，大于 9 为 9+。 */
export const achievementBadgeText = (save: SaveService): string | null =>
  badgeText(evaluateAchievements(save).filter((row) => row.claimable).length);

/**
 * 达成后领取一次。未达成、已领、未知 id 都拒绝，且不加星尘。
 * 星尘奖励用数据表上的数字，reason 为 achievement。
 */
export const claimAchievementReward = (save: SaveService, achId: string): boolean => {
  const def = achievementById(achId);
  if (!def) return false;
  const row = evaluateAchievements(save).find((item) => item.achId === achId);
  if (!row?.claimable) return false;
  if (!save.claimAchievement(achId)) return false;
  if (def.reward.coins) save.addCoins(def.reward.coins, 'achievement');
  if (def.reward.itemId) save.addItem(def.reward.itemId, 'achievement');
  return true;
};

/** 打开成就层。其它覆盖层先关掉，已打开则保持一层。 */
export const openAchievementOverlay = (overlays: OverlayManager): 'achieve' => {
  const current = overlays.current();
  if (current !== null && current !== 'achieve') overlays.closeOverlay();
  if (overlays.current() === 'achieve') return 'achieve';
  const opened = overlays.openOverlay('achieve');
  if (opened !== 'achieve') throw new Error('achieve overlay refused');
  return 'achieve';
};
