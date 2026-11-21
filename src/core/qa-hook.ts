/**
 * UiScene QA 钩子（dev-only——经动态 import 门控，prod 构建整模块不进产物）
 * 消费方：tests/e2e/redline-latency.spec.ts；口径：QA 计划 §2.0/§2.1。
 */

import type Phaser from 'phaser';
import { bus, type GroupId } from './bus';
import type { SlotId } from './constants/slots';
import type { AppContext } from './app';
import { clothingById } from '../data/items';
import { GROUPS, groupById } from '../systems/wardrobe/groups';
import type { TryonController } from '../systems/wardrobe/tryonController';
import { probe } from './probe';

export const installUiQaHook = (
  ctrl: TryonController,
  app: AppContext,
  game: Phaser.Game,
): void => {
  const hook = {
    tapCard: (itemId: string): { type: string; reason?: string } => {
      probe.markTapIn(); // evaluate 驱动路径与真实 pointerup 双路共用 tap_in 口径
      const item = clothingById(itemId);
      if (!item) return { type: 'rejected', reason: 'unknown-item' };
      return ctrl.tapCard(item);
    },
    tapUnequip: (slot: SlotId) => ctrl.tapUnequip(slot),
    flip: (): 'front' | 'back' => {
      const target = app.model.getView() === 'front' ? 'back' : 'front';
      bus.emit('view:flipRequest', { target }); // 与转身按钮/拖拽同入口（探针 flip_start 双路径口径）
      return target;
    },
    groupIds: (): string[] => GROUPS.map((g) => g.id),
    firstOwnedItemOf: (groupId: GroupId): string | null => {
      const g = groupById(groupId);
      const keys = g.keys.map((k) => (k === 'HAND_L' || k === 'HAND_R' ? 'HAND' : k));
      const hit = [...app.save.getOwned()]
        .map((id) => clothingById(id))
        .find((c) => c && keys.includes(c.slot));
      return hit ? hit.itemId : null;
    },
  };
  const g = globalThis as unknown as { __hz?: Record<string, unknown> };
  g.__hz = { ...(g.__hz ?? {}), app, game, ui: hook };
};
