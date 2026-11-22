/**
 * PKG-04 · 每日任务（SPEC-0004）
 * CARD-01：三槽位抽取，零家具新档走槽 C 回退，同一 dateKey 已有 3 条不再重抽。
 * CARD-02：stats 增量当帧推进进度；达成后领取 150，原因 daily_task。
 * CARD-03：日期翻篇后重抽；角标是已达成未领的数量，大于 9 显示 9+。
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bus } from '../../src/core/bus';
import { FURNITURE_ITEMS } from '../../src/data/furniture';
import { CLOTHING_ITEMS } from '../../src/data/items';
import { TASK_POOL, taskById } from '../../src/data/tasks';
import { drawDailyTasks } from '../../src/systems/daily/draw';
import { claimDailyTask, dailyBadgeText, readTaskList } from '../../src/systems/daily/progress';
import { OverlayManager } from '../../src/systems/hud/OverlayManager';
import { SaveService } from '../../src/systems/save/SaveService';
import { SAVE_KEY } from '../../src/systems/save/types';

const DATE = '2026-11-22';

beforeEach(() => {
  window.localStorage.removeItem(SAVE_KEY);
  window.localStorage.removeItem('huanzhuang_save_bak');
  bus.clear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

const fresh = (): SaveService => new SaveService(undefined, undefined, () => DATE);

const slotsOf = (taskIds: string[]) => taskIds.map((id) => taskById(id)!.slot);
const reachesOf = (taskIds: string[]) => taskIds.map((id) => taskById(id)!.reach);

describe('AC-01 三槽位抽取（daily §8.1）', () => {
  it('零家具新档抽出恰好 3 条，槽位各有结果，且没有家具任务', () => {
    const save = fresh();
    expect(save.getOwnedFurniture()).toHaveLength(0);
    expect(save.getOwned()).toHaveLength(0);

    const tasks = drawDailyTasks(save, () => 0);

    expect(tasks).toHaveLength(3);
    expect(tasks.map((t) => t.taskId)).toEqual(['t_a1', 't_b6', 't_a2']);
    expect(slotsOf(tasks.map((t) => t.taskId))).toEqual(['A', 'B', 'A']);
    expect(reachesOf(tasks.map((t) => t.taskId))).not.toContain('hasFurniture');
    expect(reachesOf(tasks.map((t) => t.taskId))).not.toContain('hasUntriedOwnedItem');
    expect(new Set(tasks.map((t) => t.taskId)).size).toBe(3);
    expect(tasks.every((t) => t.progress === 0 && t.claimed === false)).toBe(true);
    expect(save.getDailyTasks()).toEqual(tasks);
    expect(save.getDailyDateKey()).toBe(DATE);
  });

  it('零家具时换一个随机值，回退条仍不是家具任务', () => {
    const save = fresh();
    const tasks = drawDailyTasks(save, () => 0.99);
    expect(tasks.map((t) => t.taskId)).toEqual(['t_a3', 't_b9', 't_b8']);
    expect(reachesOf(tasks.map((t) => t.taskId))).not.toContain('hasFurniture');
  });

  it('有家具且有未试穿单品时，槽位 A/B/C 各一条', () => {
    const save = fresh();
    save.addFurniture(FURNITURE_ITEMS[0].furnId);
    save.addItem(CLOTHING_ITEMS[0].itemId, 'shop_purchase');

    const tasks = drawDailyTasks(save, () => 0);
    expect(slotsOf(tasks.map((t) => t.taskId))).toEqual(['A', 'B', 'C']);
    expect(tasks.map((t) => t.taskId)).toEqual(['t_a1', 't_b6', 't_c10']);
    expect(taskById('t_c10')!.reach).toBe('hasFurniture');
  });

  it('有未试穿单品时可以抽到新试任务', () => {
    const save = fresh();
    save.addFurniture(FURNITURE_ITEMS[0].furnId);
    save.addItem(CLOTHING_ITEMS[0].itemId, 'shop_purchase');

    const tasks = drawDailyTasks(save, () => 0.6);
    expect(tasks.map((t) => t.taskId)).toEqual(['t_a4', 't_b8', 't_c11']);
    expect(taskById(tasks[0].taskId)!.reach).toBe('hasUntriedOwnedItem');
  });

  it('没有未试穿单品时不抽 hasUntriedOwnedItem', () => {
    const samples = [0, 0.1, 0.5, 0.6, 0.99];
    for (const roll of samples) {
      window.localStorage.removeItem(SAVE_KEY);
      window.localStorage.removeItem('huanzhuang_save_bak');
      const save = fresh();
      const itemId = CLOTHING_ITEMS[0].itemId;
      save.addItem(itemId, 'shop_purchase');
      save.noteTryOn(itemId);
      const tasks = drawDailyTasks(save, () => roll);
      expect(reachesOf(tasks.map((t) => t.taskId))).not.toContain('hasUntriedOwnedItem');
      expect(tasks).toHaveLength(3);
    }
  });
});

describe('AC-02 进度当帧 +1（daily §8.4）', () => {
  it('差 1 时对应 stat 增加，匹配任务的进度当帧 +1', () => {
    const save = fresh();
    drawDailyTasks(save, () => 0);

    for (let i = 0; i < 4; i++) save.bumpStat('tryOnTotal', 1);
    expect(save.getDailyTasks().find((t) => t.taskId === 't_a1')!.progress).toBe(4);
    expect(save.getDailyTasks().find((t) => t.taskId === 't_a2')!.progress).toBe(4);
    expect(save.getDailyTasks().find((t) => t.taskId === 't_b6')!.progress).toBe(0);

    save.bumpStat('tryOnTotal', 1);
    expect(save.getDailyTasks().find((t) => t.taskId === 't_a1')!.progress).toBe(5);
    expect(save.getDailyTasks().find((t) => t.taskId === 't_a2')!.progress).toBe(5);
    expect(save.getDailyTasks().find((t) => t.taskId === 't_b6')!.progress).toBe(0);
    expect(save.getStats().tryOnTotal).toBe(5);
  });
});

describe('AC-03 领取（daily §8.2）', () => {
  it('已达成未领：星尘 +150，账本原因 daily_task，同一条不能再领', () => {
    const save = fresh();
    save.syncDailyDate();
    save.setDailyTasksForTest([{ taskId: 't_b6', progress: 1, claimed: false }]);

    expect(claimDailyTask(save, 't_b6')).toBe(true);
    expect(save.getCoins()).toBe(150);
    expect(save.getDailyTasks()[0]).toMatchObject({ taskId: 't_b6', claimed: true, progress: 1 });
    const paid = save.rawForTest().economy.ledger.filter((entry) => entry.reason === 'daily_task');
    expect(paid).toEqual([expect.objectContaining({ delta: 150, reason: 'daily_task' })]);

    expect(claimDailyTask(save, 't_b6')).toBe(false);
    expect(save.getCoins()).toBe(150);
    expect(save.rawForTest().economy.ledger.filter((entry) => entry.reason === 'daily_task')).toHaveLength(1);
  });

  it('未达成领取被拒绝且不加币', () => {
    const save = fresh();
    save.syncDailyDate();
    save.setDailyTasksForTest([{ taskId: 't_a1', progress: 4, claimed: false }]);

    expect(claimDailyTask(save, 't_a1')).toBe(false);
    expect(save.getCoins()).toBe(0);
    expect(save.rawForTest().economy.ledger).toHaveLength(0);
    expect(save.getDailyTasks()[0].claimed).toBe(false);
  });

  it('三连领取不会出现中间负币或重复入账', () => {
    const save = fresh();
    save.syncDailyDate();
    const ids = ['t_a1', 't_b6', 't_c10'] as const;
    save.setDailyTasksForTest([
      { taskId: 't_a1', progress: 5, claimed: false },
      { taskId: 't_b6', progress: 1, claimed: false },
      { taskId: 't_c10', progress: 1, claimed: false },
    ]);

    let previous = 0;
    for (const taskId of ids) {
      expect(claimDailyTask(save, taskId)).toBe(true);
      const coins = save.getCoins();
      expect(coins).toBeGreaterThanOrEqual(0);
      expect(coins).toBe(previous + 150);
      previous = coins;
    }

    expect(save.getCoins()).toBe(450);
    const paid = save.rawForTest().economy.ledger.filter((entry) => entry.reason === 'daily_task');
    expect(paid).toHaveLength(3);
    expect(paid.every((entry) => entry.delta === 150)).toBe(true);

    for (const taskId of ids) expect(claimDailyTask(save, taskId)).toBe(false);
    expect(save.getCoins()).toBe(450);
    expect(save.rawForTest().economy.ledger.filter((entry) => entry.reason === 'daily_task')).toHaveLength(3);
  });
});

describe('AC-04 日期翻篇（daily §8.3）', () => {
  it('已有进度在日期变化后被清空，并重新抽出 3 条', () => {
    let key = '2026-11-22';
    const save = new SaveService(undefined, undefined, () => key);
    drawDailyTasks(save, () => 0);
    for (let i = 0; i < 4; i++) save.bumpStat('tryOnTotal', 1);
    expect(save.getDailyTasks().find((task) => task.taskId === 't_a1')!.progress).toBe(4);

    key = '2026-11-23';
    save.checkDayFlipNow();

    const tasks = save.getDailyTasks();
    expect(save.getDailyDateKey()).toBe('2026-11-23');
    expect(tasks).toHaveLength(3);
    expect(tasks.every((task) => task.progress === 0 && task.claimed === false)).toBe(true);
  });

  it('23:59:59 的完成事件先翻页，再只把这一次计入新的一天', () => {
    let key = '2026-11-22';
    const save = new SaveService(undefined, undefined, () => key);
    drawDailyTasks(save, () => 0);
    for (let i = 0; i < 4; i++) save.bumpStat('tryOnTotal', 1);
    expect(save.getStats().tryOnTotal).toBe(4);

    key = '2026-11-23';
    save.bumpStat('tryOnTotal', 1);

    const tasks = save.getDailyTasks();
    expect(save.getDailyDateKey()).toBe('2026-11-23');
    expect(tasks).toHaveLength(3);
    expect(save.getStats().tryOnTotal).toBe(5);
    for (const task of tasks) {
      const def = taskById(task.taskId)!;
      expect(task.claimed).toBe(false);
      expect(task.progress).toBe(def.statKey === 'tryOnTotal' ? 1 : 0);
    }
  });
});

describe('AC-05 任务角标（daily §8.4 / hud §8.5）', () => {
  it('两条已达成未领显示 2，超过 9 显示 9+', () => {
    const save = fresh();
    save.syncDailyDate();
    save.setDailyTasksForTest([
      { taskId: 't_b6', progress: 1, claimed: false },
      { taskId: 't_b7', progress: 2, claimed: false },
      { taskId: 't_a1', progress: 1, claimed: false },
    ]);
    expect(dailyBadgeText(save)).toBe('2');

    save.setDailyTasksForTest(
      TASK_POOL.slice(0, 10).map((task) => ({
        taskId: task.taskId,
        progress: task.goal,
        claimed: false,
      })),
    );
    expect(dailyBadgeText(save)).toBe('9+');
  });

  it('任务列表能读出当日文案和进度', () => {
    const save = fresh();
    drawDailyTasks(save, () => 0);
    const rows = readTaskList(save);
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.taskId)).toEqual(['t_a1', 't_b6', 't_a2']);
    expect(rows[0].text).toBe(taskById('t_a1')!.text);
    expect(rows[0]).toMatchObject({ progress: 0, goal: 5, claimable: false, claimed: false });
  });
});

describe('竞态（daily §8.6）', () => {
  it('任务层打开时再开别的覆盖层会被拒绝', () => {
    const overlays = new OverlayManager();
    expect(overlays.openOverlay('task')).toBe('task');
    expect(overlays.openOverlay('look')).toBeNull();
    expect(overlays.current()).toBe('task');
  });
});

describe('同一 dateKey 不换掉已有 3 条', () => {
  it('重复抽取保持任务、进度和 dateKey', () => {
    const save = fresh();
    let calls = 0;
    const random = () => {
      calls += 1;
      return 0;
    };
    const first = drawDailyTasks(save, random);
    const callsAfterFirst = calls;
    expect(callsAfterFirst).toBeGreaterThan(0);

    save.rawForTest().daily.tasks[0].progress = 2;
    const second = drawDailyTasks(save, () => {
      calls += 1;
      return 0.9;
    });

    expect(calls).toBe(callsAfterFirst);
    expect(second.map((t) => t.taskId)).toEqual(first.map((t) => t.taskId));
    expect(second[0].progress).toBe(2);
    expect(save.getDailyTasks()[0].progress).toBe(2);
    expect(save.getDailyDateKey()).toBe(DATE);
  });
});
