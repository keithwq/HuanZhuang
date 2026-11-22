/**
 * PKG-06 · 成就判定与领取（SPEC-0006 CARD-01）
 * AC-01：跨过阈值后可领一次，之后锁定。
 * AC-02：同一 dateKey 再次登录，登录天数不重复累计。
 * 未达成不能领取，也不发星尘。家具条读现有摆放计数，奖励数字跟数据表。
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bus } from '../../src/core/bus';
import { ACHIEVEMENTS, achievementById, MILESTONE } from '../../src/data/achievements';
import { CLOTHING_ITEMS } from '../../src/data/items';
import {
  achievementBadgeText,
  claimAchievementReward,
  evaluateAchievements,
  openAchievementOverlay,
  tabOpensAchievements,
} from '../../src/systems/achievements/eval';
import { OverlayManager } from '../../src/systems/hud/OverlayManager';
import { SaveService } from '../../src/systems/save/SaveService';
import { SAVE_KEY } from '../../src/systems/save/types';
import { shopClothingTotal } from '../../src/data/items';
import { shopFurnitureTotal } from '../../src/data/furniture';
import { DAILY_REWARD } from '../../src/data/tasks';
import { runEconomySim } from '../../tools/economy-sim';

const DATE = '2026-11-22';

beforeEach(() => {
  window.localStorage.removeItem(SAVE_KEY);
  window.localStorage.removeItem('huanzhuang_save_bak');
  bus.clear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

const fresh = (date = DATE): SaveService => new SaveService(undefined, undefined, () => date);

const rowOf = (save: SaveService, achId: string) => {
  const row = evaluateAchievements(save).find((item) => item.achId === achId);
  expect(row).toBeDefined();
  return row!;
};

const achievementCoins = (save: SaveService) =>
  save.rawForTest().economy.ledger.filter((entry) => entry.reason === 'achievement');

describe('AC-01 跨过阈值后可领取，领取后锁定', () => {
  it('试穿次数跨过初见星光后可领一次，星尘等于表上的 60，再领被拒绝', () => {
    const save = fresh();
    const def = achievementById('ac_c1')!;
    expect(def.reward.coins).toBe(60);
    expect(rowOf(save, 'ac_c1').claimable).toBe(false);

    save.bumpStat('tryOnUnique', 1);
    const opened = rowOf(save, 'ac_c1');
    expect(opened.progress).toBe(1);
    expect(opened.threshold).toBe(def.threshold);
    expect(opened.claimable).toBe(true);

    expect(claimAchievementReward(save, 'ac_c1')).toBe(true);
    expect(save.getCoins()).toBe(60);
    expect(achievementCoins(save)).toEqual([expect.objectContaining({ delta: 60, reason: 'achievement' })]);
    expect(save.getAchievement('ac_c1')).toMatchObject({ claimed: true });
    expect(rowOf(save, 'ac_c1').claimable).toBe(false);

    expect(claimAchievementReward(save, 'ac_c1')).toBe(false);
    expect(save.getCoins()).toBe(60);
    expect(achievementCoins(save)).toHaveLength(1);
  });

  it('未达成的条不能领取，也不发星尘', () => {
    const save = fresh();
    expect(claimAchievementReward(save, 'ac_b2')).toBe(false);
    expect(claimAchievementReward(save, 'missing')).toBe(false);
    expect(save.getCoins()).toBe(0);
    expect(achievementCoins(save)).toEqual([]);
    expect(save.getAchievement('ac_b2').claimed).toBe(false);
  });
});

describe('家具条用现有摆放计数', () => {
  it('星图小屋看已摆点位，学院新居看摆放次数，阈值仍是表里的 11 和 1', () => {
    const save = fresh();
    const anchors = achievementById('ac_c5')!;
    const firstPlace = achievementById('ac_c4')!;
    expect(anchors.threshold).toBe(11);
    expect(firstPlace.statKey).toBe('furniturePlacedTotal');
    expect(firstPlace.threshold).toBe(1);

    for (let i = 0; i < 10; i += 1) save.setPlacement(`anchor-${i}`, 'furn');
    expect(save.countOccupied()).toBe(10);
    expect(rowOf(save, 'ac_c5').claimable).toBe(false);
    expect(claimAchievementReward(save, 'ac_c5')).toBe(false);
    expect(save.getCoins()).toBe(0);

    save.setPlacement('anchor-10', 'furn');
    const lit = rowOf(save, 'ac_c5');
    expect(lit.progress).toBe(save.countOccupied());
    expect(lit.progress).toBe(11);
    expect(lit.claimable).toBe(true);
    expect(rowOf(save, 'ac_c4').claimable).toBe(false);

    expect(claimAchievementReward(save, 'ac_c5')).toBe(true);
    expect(save.getCoins()).toBe(anchors.reward.coins);
    expect(anchors.reward.coins).toBe(180);
    expect(claimAchievementReward(save, 'ac_c5')).toBe(false);
    expect(save.getCoins()).toBe(180);

    save.bumpStat('furniturePlacedTotal', 1);
    expect(rowOf(save, 'ac_c4').progress).toBe(1);
    expect(rowOf(save, 'ac_c4').claimable).toBe(true);
    expect(rowOf(save, 'ac_b6').claimable).toBe(false);
  });
});

describe('AC-02 同一 dateKey 再次登录不重复累计', () => {
  it('同一天结算两次仍是 1 天，换一天才变成 2，重开存档也不加', () => {
    let date = DATE;
    const save = new SaveService(undefined, undefined, () => date);
    expect(rowOf(save, 'ac_p4').progress).toBe(1);
    expect(rowOf(save, 'ac_p4').claimable).toBe(false);

    expect(rowOf(save, 'ac_p4').progress).toBe(1);
    expect(save.getLoginDayCount()).toBe(1);

    date = '2026-11-23';
    expect(rowOf(save, 'ac_p4').progress).toBe(2);

    save.flush();
    const reloaded = new SaveService(undefined, undefined, () => '2026-11-23');
    expect(rowOf(reloaded, 'ac_p4').progress).toBe(2);
    expect(reloaded.getLoginDayCount()).toBe(2);
  });

  it('累计满 3 个不同 dateKey 才能领学院新面孔，同一天重复结算不能凑满', () => {
    let date = DATE;
    const save = new SaveService(undefined, undefined, () => date);
    evaluateAchievements(save);
    evaluateAchievements(save);
    date = '2026-11-23';
    evaluateAchievements(save);
    expect(claimAchievementReward(save, 'ac_p4')).toBe(false);
    expect(save.getCoins()).toBe(0);

    date = '2026-11-24';
    expect(rowOf(save, 'ac_p4').progress).toBe(3);
    expect(claimAchievementReward(save, 'ac_p4')).toBe(true);
    expect(save.getCoins()).toBe(achievementById('ac_p4')!.reward.coins);
    expect(achievementById('ac_p4')!.reward.coins).toBe(60);
    expect(claimAchievementReward(save, 'ac_p4')).toBe(false);
    expect(save.getCoins()).toBe(60);
  });
});

describe('清单与页签', () => {
  it('惰性判定覆盖数据表 21 条，且不改表上的奖励', () => {
    const save = fresh();
    const rows = evaluateAchievements(save);
    expect(rows).toHaveLength(21);
    expect(rows.map((row) => row.achId)).toEqual(ACHIEVEMENTS.map((item) => item.achId));
    expect(rows.map((row) => row.threshold)).toEqual(ACHIEVEMENTS.map((item) => item.threshold));
    expect(ACHIEVEMENTS.map((item) => item.reward.coins)).toEqual([
      60, 120, 500, 60, 180, 300, 400, 300, 300,
      80, 200, 120, 80, 200, 120, 240,
      60, 200, 600, 60, 240,
    ]);
  });

  it('成就页签点亮后能打开覆盖层，并关掉已经打开的商店', () => {
    expect(tabOpensAchievements('成就')).toBe(true);
    expect(tabOpensAchievements('商店')).toBe(false);

    const overlays = new OverlayManager();
    expect(overlays.openOverlay('shop')).toBe('shop');
    expect(openAchievementOverlay(overlays)).toBe('achieve');
    expect(overlays.current()).toBe('achieve');
    expect(openAchievementOverlay(overlays)).toBe('achieve');
  });

  it('可领取数量进角标，领完后角标消失', () => {
    const save = fresh();
    save.bumpStat('tryOnUnique', 1);
    expect(achievementBadgeText(save)).toBe('1');
    expect(claimAchievementReward(save, 'ac_c1')).toBe(true);
    expect(achievementBadgeText(save)).toBeNull();
  });

  it('限定收藏家只数已拥有的解锁池服装', () => {
    const save = fresh();
    const unlocks = CLOTHING_ITEMS.filter((item) => item.pool === 'unlock');
    expect(unlocks).toHaveLength(6);
    for (const item of unlocks.slice(0, 5)) save.addItem(item.itemId, 'achievement');
    expect(rowOf(save, 'ac_c9').claimable).toBe(false);
    save.addItem(unlocks[5]!.itemId, 'achievement');
    expect(rowOf(save, 'ac_c9').progress).toBe(6);
    expect(rowOf(save, 'ac_c9').claimable).toBe(true);
  });
});

describe('三十日模拟不变量（SPEC-0006 CARD-02）', () => {
  it('目录只用商店池，每日任务仍是 3×150，全程星尘不为负', () => {
    const report = runEconomySim();

    expect(report.taskReward).toBe(DAILY_REWARD);
    expect(report.taskReward).toBe(150);
    expect(report.tasksPerDay).toBe(3);
    expect(report.catalogTotal).toBe(shopClothingTotal() + shopFurnitureTotal());
    expect(report.unlockMixedIntoCatalog).toBe(false);
    expect(report.minCoins).toBeGreaterThanOrEqual(0);
    expect(report.coinsNeverNegative).toBe(true);
    expect(report.days.every((day) => day.coins >= 0)).toBe(true);
  });
});

describe('AC-04 里程碑与成就不在同一阈值发两次钱', () => {
  it('里程碑阈值是合计拥有每 3 件，没有成就再用这个键和这个数', () => {
    expect(MILESTONE).toEqual({ perItems: 3, reward: 60 });
    const same = ACHIEVEMENTS.filter(
      (item) => item.statKey === 'ownedAllTotal' && item.threshold === MILESTONE.perItems,
    );
    expect(same).toEqual([]);
    expect(ACHIEVEMENTS.filter((item) => item.statKey === 'ownedAllTotal').map((item) => item.threshold)).toEqual([60]);
  });

  it('21 条成就彼此也没有同一判据同一阈值', () => {
    const seen = new Set<string>();
    for (const item of ACHIEVEMENTS) {
      const key = `${item.statKey}:${item.threshold}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
    expect(seen.size).toBe(21);
  });
});
