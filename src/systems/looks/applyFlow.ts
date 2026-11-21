/**
 * 造型回穿流（E3-S02，look-save §2.2/§2.4/§2.5/§4/§8.2/8.3/8.5）
 * - 原子全槽覆盖（不做部分应用）：读取快照 → S04.applyLook → 模型同步 setOutfit（静默，不逐槽发 tryon:done）
 * - 防 13 连播：批量落位零单件动效，全部落位后**一次**焕新确认动效（≤300ms，§2.5）
 * - 联动事件 onLookApplied → S03 刷新穿着角标（wardrobe §6 声明）
 */

import { bus } from '../../core/bus';
import { TRYON_ANIM } from '../../core/constants/budget';
import type { OutfitKey } from '../../core/constants/slots';
import { FRONT_LAYERS } from '../../core/constants/slots';
import type { PaperdollModel } from '../paperdoll/model';
import type { SaveService } from '../save/SaveService';
import type { OutfitMap } from '../save/types';

export interface ApplyResult {
  ok: boolean;
  outfit: OutfitMap | null;
  /** 焕新动效参数（渲染层消费：150ms 淡入 + 2% 上浮落定，总 ≤300ms——look-save §2.5） */
  renewAnim: { fadeMs: number; risePercent: number };
}

/** 回穿槽序：L00→L12（look-save §2.5 批量调用序） */
export const APPLY_ORDER: readonly OutfitKey[] = FRONT_LAYERS.flatMap((l) =>
  l.slot === 'HAND' ? (['HAND_L', 'HAND_R'] as OutfitKey[]) : ([l.slot] as OutfitKey[]),
) as readonly OutfitKey[];

export const createApplyFlow = (model: PaperdollModel, save: SaveService) => {
  return (lookId: string): ApplyResult => {
    let outfit: OutfitMap;
    try {
      outfit = save.applyLook(lookId); // 原子全槽覆盖（S04 冻结接口，含遮蔽 BTM 复原）
    } catch {
      return { ok: false, outfit: null, renewAnim: { fadeMs: 0, risePercent: 0 } };
    }
    // 模型静默同步：不经 tryOn（零 tryon:done 事件 → 无 13 连播/无计数——look-save §2.5）
    model.setOutfit(outfit);
    // 一次焕新动效信号（渲染层播单次 ≤300ms；减敏 100ms 淡切由 tweenSvc 裁决）
    bus.emit('look:applied', { lookId, outfit });
    return {
      ok: true,
      outfit,
      renewAnim: { fadeMs: TRYON_ANIM.fadeInMs, risePercent: TRYON_ANIM.risePercent },
    };
  };
};
