/**
 * 当日三槽位抽取（daily §2.3 / §4）
 * 槽 A/B/C 各抽 1 条；空槽从其余可达池补足，同日不与已抽条目重复。
 * 结果只经 SaveService.commitDailyTasks 写入 daily.tasks。
 */

import { TASK_POOL, type TaskDef, type TaskSlot } from '../../data/tasks';
import type { SaveService } from '../save/SaveService';
import type { DailyTaskState } from '../save/types';

export type RandomFn = () => number;

const SLOTS: readonly TaskSlot[] = ['A', 'B', 'C'];
const attached = new WeakSet<SaveService>();
let drawing = false;

const ensureAttached = (save: SaveService): void => {
  if (attached.has(save)) return;
  attached.add(save);
  save.onDayFlip(() => {
    if (drawing) return;
    drawDailyTasks(save);
  });
};

const hasUntriedOwnedItem = (save: SaveService): boolean => {
  const tried = new Set(save.getStats().triedItems);
  return save.getOwned().some((itemId) => !tried.has(itemId));
};

const isReachable = (task: TaskDef, save: SaveService): boolean => {
  if (task.reach === 'always') return true;
  if (task.reach === 'hasFurniture') return save.getOwnedFurniture().length >= 1;
  return hasUntriedOwnedItem(save);
};

const pickOne = (pool: readonly TaskDef[], random: RandomFn): TaskDef | undefined => {
  if (pool.length === 0) return undefined;
  const index = Math.floor(random() * pool.length);
  return pool[Math.min(pool.length - 1, Math.max(0, index))];
};

const selectTasks = (save: SaveService, random: RandomFn): TaskDef[] => {
  const chosen: TaskDef[] = [];
  for (const slot of SLOTS) {
    const pool = TASK_POOL.filter((task) => task.slot === slot && isReachable(task, save));
    const picked = pickOne(pool, random);
    if (picked) chosen.push(picked);
  }
  const used = new Set(chosen.map((task) => task.taskId));
  while (chosen.length < 3) {
    const rest = TASK_POOL.filter((task) => isReachable(task, save) && !used.has(task.taskId));
    const picked = pickOne(rest, random);
    if (!picked) break;
    chosen.push(picked);
    used.add(picked.taskId);
  }
  return chosen;
};

export const drawDailyTasks = (
  save: SaveService,
  random: RandomFn = Math.random,
): DailyTaskState[] => {
  ensureAttached(save);
  if (drawing) return save.getDailyTasks();
  drawing = true;
  try {
    save.syncDailyDate();
    if (save.getDailyTasks().length === 3) return save.getDailyTasks();
    const tasks = selectTasks(save, random).map((task) => ({
      taskId: task.taskId,
      progress: 0,
      claimed: false,
    }));
    return save.commitDailyTasks(tasks);
  } finally {
    drawing = false;
  }
};
