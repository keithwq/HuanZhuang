/**
 * 点选即换状态机（E2-S04，wardrobe §2.2——P1 红线）
 * - 无锁：连续快速点选 = 每次点选立即生效；旧动效被打断、新动效接续（不排队、不吞点击）
 * - 卡片 = 当前穿着 → 轻反馈（微缩放 100ms），无状态变化
 * - 卸下卡 → unequip（槽位回空、BODY 显露）
 * - 连衣裙 + BTM 页签 → Caption 提示（非阻塞，§2.3）
 * - 计数口径：以 S01 成功回调（tryon:done）为准（wardrobe §6 不重复计数）
 */

import { bus } from '../../core/bus';
import type { SlotId } from '../../core/constants/slots';
import type { ClothingItem } from '../../data/items';
import type { PaperdollModel } from '../paperdoll/model';
import type { SaveService } from '../save/SaveService';

export type TryonEvent =
  | { type: 'applied'; slot: SlotId; itemId: string }
  | { type: 'unequipped'; slot: SlotId }
  | { type: 'lightFeedback' }       // 卡片 = 当前穿着：轻反馈无状态变化
  | { type: 'btmOccludedCaption' }  // 连衣裙期间 BTM 页签提示（wardrobe §2.3）
  | { type: 'rejected'; reason: string };

export class TryonController {
  /** 会话态（不落盘，wardrobe §3）：activeTab/activeTag */
  activeTag: string | null = null;

  constructor(
    private model: PaperdollModel,
    private save: SaveService,
  ) {}

  /** 点选物品卡（点选即换，无确认步骤——D1-01） */
  tapCard(item: ClothingItem): TryonEvent {
    const worn = this.isWorn(item);
    if (worn) {
      // 卡片 = 当前穿着 → 轻反馈（卡片微缩放 100ms），无状态变化
      return { type: 'lightFeedback' };
    }
    const result = this.model.tryOn(item.slot, item.itemId);
    if (!result.ok) {
      return { type: 'rejected', reason: result.error ?? 'unknown' };
    }
    // 状态落位（500ms 防抖——SaveService 内部）。发型成对时 model 侧已按 pair 落位双键，
    // 统一以 model 当前值同步（避免用单卡 itemId 误写对侧键）
    for (const key of result.keys) {
      this.save.setOutfitSlot(key, this.model.getOutfitKey(key));
    }
    // 计数：以 tryon:done 回调为准——model 已发事件；noteTryOn 由事件总线统一驱动（bootstrap 挂接）
    // 连衣裙遮蔽变化 → BTM Caption 联动信号
    if (result.btmOcclusionChanged && item.slot === 'TOP') {
      return { type: 'btmOccludedCaption' };
    }
    return { type: 'applied', slot: item.slot, itemId: item.itemId };
  }

  /** 点选卸下卡（显式按钮路径，art §9.3——不依赖手势） */
  tapUnequip(slot: SlotId): TryonEvent {
    const keys = this.model.unequip(slot);
    for (const k of keys) this.save.setOutfitSlot(k, null);
    return { type: 'unequipped', slot };
  }

  isWorn(item: ClothingItem): boolean {
    return item.outfitKeys.some((k) => this.model.getOutfitKey(k) === item.itemId);
  }

  /** 发型页签卡片 = 一个发型（前缀对），点选同时设定 HAIR_B+HAIR_F（wardrobe §5.2）——
   *  已由 model.tryOn 成对路径覆盖；此处仅语义封装 */
  tapHairCard(item: ClothingItem): TryonEvent {
    return this.tapCard(item);
  }
}

/** 事件总线统一计数挂接（bootstrap 调用一次）：以 S01 成功回调为准（wardrobe §6）
 * 口径（wardrobe §3 冻结 + QA round1 MAJ-1 修复）：**每次成功 tryOn/unequip 均**计 tryOnTotal——
 * 卸下（itemId=null）同样 +1；首穿另计 tryOnUnique（null 不参与 unique）。 */
export const attachTryOnCounting = (save: SaveService): (() => void) => {
  return bus.on('tryon:done', (p) => {
    save.noteTryOn(p.itemId);
  });
};
