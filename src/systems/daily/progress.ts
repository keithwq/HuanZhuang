/**
 * 当日任务进度与领取（daily §2.1 / §2.5）
 * 进度只跟随已有 stats 的增量。发奖只走 SaveService.addCoins。
 */

import { taskById } from '../../data/tasks';
import { badgeText } from '../hud/layout';
import type { SaveService } from '../save/SaveService';

export interface TaskListRow {
  taskId: string;
  text: string;
  progress: number;
  goal: number;
  claimable: boolean;
  claimed: boolean;
}

export const readTaskList = (save: SaveService): TaskListRow[] =>
  save.getDailyTasks().map((task) => {
    const def = taskById(task.taskId);
    const goal = def?.goal ?? 0;
    const reached = !!def && task.progress >= goal;
    return {
      taskId: task.taskId,
      text: def?.text ?? task.taskId,
      progress: task.progress,
      goal,
      claimable: reached && !task.claimed,
      claimed: task.claimed,
    };
  });

/** 已达成且未领取的条数。0 不显示；大于 9 为 9+（hud §8.5）。 */
export const dailyBadgeText = (save: SaveService): string | null =>
  badgeText(readTaskList(save).filter((row) => row.claimable).length);

export const applyDailyProgress = (save: SaveService, statKey: string, delta: number): void => {
  if (delta <= 0) return;
  for (const task of save.getDailyTasks()) {
    const def = taskById(task.taskId);
    if (!def || def.statKey !== statKey) continue;
    save.setDailyProgress(task.taskId, task.progress + delta);
  }
};

/** 达成后领取。未达成、已领、未知任务都拒绝，且不加币。 */
export const claimDailyTask = (save: SaveService, taskId: string): boolean => {
  save.syncDailyDate();
  const task = save.getDailyTasks().find((item) => item.taskId === taskId);
  const def = taskById(taskId);
  if (!task || !def) return false;
  if (task.claimed || task.progress < def.goal) return false;
  if (!save.markDailyClaimed(taskId)) return false;
  save.addCoins(def.reward, 'daily_task');
  return true;
};
