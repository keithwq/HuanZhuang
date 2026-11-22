/**
 * 摆放提示与落位（SPEC-0002）。
 * 点亮集合只转发 RoomModel.placementTargets，不另写相容规则。
 * 落位与收回都走 RoomModel。收回在确认前不写存档。
 */

import type { SaveService } from '../save/SaveService';
import type { RoomModel } from './model';

export interface PlacementHintState {
  active: boolean;
  furnId: string | null;
  /** 相容且当前可见的锚点：vacant 在前，occupied 在后 */
  anchorIds: readonly string[];
}

export interface PlacementToast {
  count: number;
}

export interface PlacementActionResult {
  ok: boolean;
  /** 一条合并 toast。没有退回件时为 null。 */
  toast: PlacementToast | null;
}

export interface WithdrawPrompt {
  anchorId: string;
}

/** 抽屉点卡片进入 / 切换 / 取消摆放。 */
export const enterPlacementFromDrawer = (
  room: RoomModel,
  furnId: string,
): 'entered' | 'switched' | 'cancelled' => room.tapFurnitureCard(furnId);

export const readPlacementHints = (room: RoomModel): PlacementHintState => {
  const furnId = room.isPlacing();
  if (!furnId) return { active: false, furnId: null, anchorIds: [] };
  const targets = room.placementTargets();
  return {
    active: true,
    furnId,
    anchorIds: [...targets.vacant, ...targets.occupied],
  };
};

/** 只对已点亮的锚点调用 RoomModel.place。toast 条数用返回的 toastMergeCount。 */
export const placeAtHint = (room: RoomModel, anchorId: string): PlacementActionResult => {
  const furnId = room.isPlacing();
  if (!furnId || !readPlacementHints(room).anchorIds.includes(anchorId)) {
    return { ok: false, toast: null };
  }
  const result = room.place(furnId, anchorId);
  if (!result.ok) return { ok: false, toast: null };
  return {
    ok: true,
    toast: result.toastMergeCount > 0 ? { count: result.toastMergeCount } : null,
  };
};

/** 只记下要收回的锚点，不改存档。 */
export const requestWithdraw = (save: SaveService, anchorId: string): WithdrawPrompt | null => {
  if (save.getPlacement()[anchorId] == null) return null;
  return { anchorId };
};

export const cancelWithdraw = (prompt: WithdrawPrompt): void => {
  void prompt;
};

/**
 * 确认后才收回。合并条数 = 被收的这一件 + 随回的次级件，与 place() 的 toastMergeCount 同一口径。
 */
export const confirmWithdraw = (room: RoomModel, prompt: WithdrawPrompt): PlacementActionResult => {
  const result = room.withdraw(prompt.anchorId);
  if (!result.ok) return { ok: false, toast: null };
  return { ok: true, toast: { count: 1 + result.autoReturnedSecondary.length } };
};

/** 关闭抽屉或离开房间：清掉摆放选中态，不改已落位的存档。 */
export const interruptPlacement = (room: RoomModel): void => {
  room.cancelPlacementMode();
};
