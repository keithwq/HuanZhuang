/**
 * 每日任务池（E4-S01，daily-task §2.2 冻结 11 条）+ 三槽位抽取口径（§2.3）
 * 文案纪律（§2.2 / ux-spec §3.1）：全部邀请式动词；禁止倒计时/损失/指挥话术。
 */

export type TaskSlot = 'A' | 'B' | 'C';

export interface TaskDef {
  taskId: string;
  text: string;
  /** 判据（stats 键 · 当日增量，daily §2.1：不引入第二套计数器） */
  statKey: string;
  goal: number;
  slot: TaskSlot;
  /** 可达性前提（daily §2.3：杜绝死任务） */
  reach: 'always' | 'hasFurniture' | 'hasUntriedOwnedItem';
  /** 单条奖励（D3-06 B 档冻结：150 星尘） */
  reward: number;
}

export const DAILY_REWARD = 150; // D3-06 冻结；日均 3 × 150 = 450（对账口径，任何一侧不得改动）

export const TASK_POOL: readonly TaskDef[] = [
  { taskId: 't_a1', text: '让角色换换心情：试穿 5 件单品', statKey: 'tryOnTotal', goal: 5, slot: 'A', reach: 'always', reward: DAILY_REWARD },
  { taskId: 't_a2', text: '今天格外想打扮：试穿 12 件单品', statKey: 'tryOnTotal', goal: 12, slot: 'A', reach: 'always', reward: DAILY_REWARD },
  { taskId: 't_a3', text: '摆弄到停不下来：试穿 20 件单品', statKey: 'tryOnTotal', goal: 20, slot: 'A', reach: 'always', reward: DAILY_REWARD },
  { taskId: 't_a4', text: '试穿 2 件从没上过身的新单品', statKey: 'tryOnUnique', goal: 2, slot: 'A', reach: 'hasUntriedOwnedItem', reward: DAILY_REWARD },
  { taskId: 't_a5', text: '衣柜里还有没试过的：新试 4 件单品', statKey: 'tryOnUnique', goal: 4, slot: 'A', reach: 'hasUntriedOwnedItem', reward: DAILY_REWARD },
  { taskId: 't_b6', text: '把今天的搭配存进九宫格：保存 1 个造型', statKey: 'lookSavedTotal', goal: 1, slot: 'B', reach: 'always', reward: DAILY_REWARD },
  { taskId: 't_b7', text: '收集自己的灵感：保存 2 个造型', statKey: 'lookSavedTotal', goal: 2, slot: 'B', reach: 'always', reward: DAILY_REWARD },
  { taskId: 't_b8', text: '从商店带回 1 件新单品', statKey: 'itemsOwnedTotal', goal: 1, slot: 'B', reach: 'always', reward: DAILY_REWARD },
  { taskId: 't_b9', text: '今天想收点什么：带回 2 件新单品', statKey: 'itemsOwnedTotal', goal: 2, slot: 'B', reach: 'always', reward: DAILY_REWARD },
  { taskId: 't_c10', text: '给小屋换个新气象：摆放 1 次家具', statKey: 'furniturePlacedTotal', goal: 1, slot: 'C', reach: 'hasFurniture', reward: DAILY_REWARD },
  { taskId: 't_c11', text: '重新布置房间吧：摆放 3 次家具（换位置也算）', statKey: 'furniturePlacedTotal', goal: 3, slot: 'C', reach: 'hasFurniture', reward: DAILY_REWARD },
];

export const taskById = (taskId: string): TaskDef | undefined =>
  TASK_POOL.find((t) => t.taskId === taskId);
