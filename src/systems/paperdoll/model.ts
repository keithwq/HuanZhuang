/**
 * PaperdollModel · S01 纯逻辑层（E1-S07，paperdoll §2.1/§2.3/§5）
 * 渲染绑定（Sprite/纹理）在 compositor.ts；本层可 headless 全测。
 * 红线：
 * - 正/背层序两张独立表（§5.4），FACE 背视图不渲染
 * - 连衣裙：隐藏 BTM 渲染、保留 BTM 选择状态——状态与渲染解耦（§5.1）
 * - HAIR 前后层强制成对：接口层拒绝跨发型混搭（§5.2，返回错误而非穿帮）
 * - 悬空 itemId：该槽回退默认件 + console 警告（§5.5，防御性设计）
 */

import { bus } from '../../core/bus';
import {
  BACK_LAYERS, FRONT_LAYERS, HAND_KEYS, HAIR_PAIR, type OutfitKey, type SlotId,
} from '../../core/constants/slots';
import { defaultItemForSlot } from '../../data/defaults';
import { clothingById, hairPairByItemId } from '../../data/items';
import type { OutfitMap } from '../save/types';

export interface Resolvers {
  /** 悬空兜底默认件（data/defaults） */
  defaultForSlot?: (key: OutfitKey) => string | null;
  /** 发型前缀对（data/items） */
  pairOf?: (itemId: string) => { hairB: string; hairF: string } | undefined;
  /** 物品是否未知（悬空） */
  exists?: (itemId: string) => boolean;
  /** 连衣裙判定（data/items dress 标志，美术圣经 §4.3） */
  isDress?: (itemId: string) => boolean;
}

export type TryOnError = 'hair-pair-mismatch' | 'unknown-item';

export interface TryOnResult {
  ok: boolean;
  error?: TryOnError;
  /** 实际落位的存档键（HAND → 挂点键；HAIR → 双键） */
  keys: OutfitKey[];
  /** 是否触发 BTM 遮蔽变化（渲染联动信号） */
  btmOcclusionChanged: boolean;
}

const defaultResolvers: Resolvers = {
  defaultForSlot: defaultItemForSlot,
  pairOf: (id) => {
    const pair = hairPairByItemId(id);
    return pair ? { hairB: pair.hairB.itemId, hairF: pair.hairF.itemId } : undefined;
  },
  exists: (id) => clothingById(id) !== undefined,
  isDress: (id) => clothingById(id)?.dress === true,
};

/** outfit 键 → 槽位代码（HAND_L/R → HAND） */
export const slotOfKey = (key: OutfitKey): SlotId =>
  key === 'HAND_L' || key === 'HAND_R' ? 'HAND' : key;

export class PaperdollModel {
  private outfit: OutfitMap;
  private view: 'front' | 'back' = 'front';
  private res: Resolvers;

  constructor(initial?: Partial<OutfitMap>, resolvers: Resolvers = defaultResolvers) {
    this.res = { ...defaultResolvers, ...resolvers };
    this.outfit = {
      BK: null, BODY: null, HAIR_B: null, LEG: null, BTM: null, TOP: null, OUT: null,
      HAND_L: null, HAND_R: null, NECK: null, HAIR_F: null, HEAD: null, FACE: null, FX: null,
      ...initial,
    };
  }

  // ------------------------------------------------------------- 试穿 / 卸下（§6 冻结签名）

  /** tryOn(slot, itemId)：同步完成状态落位；渲染与动效由 compositor 消费本层信号 */
  tryOn(slot: SlotId, itemId: string): TryOnResult {
    const item = clothingById(itemId);
    const exists = this.res.exists?.(itemId) ?? true;
    if (!exists) {
      // 悬空 itemId：接口层按防御设计拒绝（wardrobe 只显示已拥有，正常路径不可达；
      // 读档侧兜底走 renderItems 的 fallback，§5.5）
      console.warn(`[paperdoll] tryOn 未知物品 ${itemId}，拒绝`);
      return { ok: false, error: 'unknown-item', keys: [], btmOcclusionChanged: false };
    }
    const keys: OutfitKey[] =
      slot === 'HAND' ? [...(item?.outfitKeys ?? [])] : [slot as OutfitKey];

    // HAIR 成对校验（§5.2）：发型选择 = 同时设定同前缀两件；不存在"只换刘海不换后层"操作，
    // 接口层拒绝跨发型混搭组合（返回错误而非渲染穿帮）
    if (slot === 'HAIR_B' || slot === 'HAIR_F') {
      const pair = this.res.pairOf?.(itemId);
      if (!pair) {
        return { ok: false, error: 'hair-pair-mismatch', keys: [], btmOcclusionChanged: false };
      }
      // 整对落位（wardrobe 发型卡点选 = 同时设定 HAIR_B + HAIR_F，wardrobe §5.2）
      const prevBtmHidden = this.isBtmOccluded();
      this.outfit.HAIR_B = pair.hairB;
      this.outfit.HAIR_F = pair.hairF;
      bus.emit('tryon:done', { slot: 'HAIR_B', itemId: pair.hairB });
      bus.emit('tryon:done', { slot: 'HAIR_F', itemId: pair.hairF });
      return { ok: true, keys: [...HAIR_PAIR], btmOcclusionChanged: prevBtmHidden !== this.isBtmOccluded() };
    }

    const prevBtmHidden = this.isBtmOccluded();
    for (const k of keys) this.outfit[k] = itemId;
    if (keys.length === 0) {
      // 兜底：HAND 未解析出挂点键（数据异常）→ 双手键均可承载，落左手
      this.outfit.HAND_L = itemId;
      keys.push('HAND_L');
    }
    const result: TryOnResult = {
      ok: true,
      keys,
      btmOcclusionChanged: prevBtmHidden !== this.isBtmOccluded(),
    };
    bus.emit('tryon:done', { slot, itemId });
    return result;
  }

  /** unequip(slot)：槽位回 null、BODY 显露（paperdoll §6）；HAIR 双槽同卸（ux-spec G1） */
  unequip(slot: SlotId): OutfitKey[] {
    const keys: OutfitKey[] =
      slot === 'HAND' ? [...HAND_KEYS]
      : slot === 'HAIR_B' || slot === 'HAIR_F' ? [...HAIR_PAIR]
      : [slot as OutfitKey];
    for (const k of keys) this.outfit[k] = null;
    bus.emit('tryon:done', { slot, itemId: null });
    return keys;
  }

  // ------------------------------------------------------------- 状态与渲染解耦（§5.1）

  /** 连衣裙遮蔽：TOP 为连衣裙时 BTM 渲染隐藏（选择状态保留） */
  isBtmOccluded(): boolean {
    const top = this.outfit.TOP;
    return top !== null && (this.res.isDress?.(top) ?? false);
  }

  getOutfitSnapshot(): OutfitMap {
    return { ...this.outfit }; // 完整 13 槽深拷贝快照（含遮蔽 BTM——look-save §2.2）
  }

  setOutfit(outfit: OutfitMap): void {
    this.outfit = { ...outfit };
  }

  getOutfitKey(key: OutfitKey): string | null {
    return this.outfit[key];
  }

  // ------------------------------------------------------------- 渲染项解析（含悬空兜底 §5.5）

  /** 渲染层实际应显示的 itemId：悬空 → 回退默认件 + 警告（存档本体不被清洗，local-save §5.5） */
  renderItems(): { key: OutfitKey; itemId: string | null; visible: boolean }[] {
    const layers = this.view === 'front' ? FRONT_LAYERS : BACK_LAYERS;
    const out: { key: OutfitKey; itemId: string | null; visible: boolean }[] = [];
    for (const layer of layers) {
      if (layer.slot === 'FACE' && this.view === 'back') continue; // FACE 背视图不渲染
      if (layer.slot === 'HAND') {
        for (const hk of HAND_KEYS) out.push(this.resolveRenderKey(hk));
      } else if (layer.slot === 'BTM') {
        // 连衣裙遮蔽：渲染隐藏、状态保留（§5.1）
        const r = this.resolveRenderKey('BTM');
        out.push({ ...r, visible: !this.isBtmOccluded() });
      } else {
        out.push(this.resolveRenderKey(layer.slot as OutfitKey));
      }
    }
    return out;
  }

  private resolveRenderKey(key: OutfitKey): { key: OutfitKey; itemId: string | null; visible: boolean } {
    let id = this.outfit[key];
    if (id !== null && !(this.res.exists?.(id) ?? true)) {
      const fallback = this.res.defaultForSlot?.(key) ?? null;
      console.warn(`[paperdoll] 悬空 itemId ${id}（key=${key}），回退默认件 ${fallback}`);
      id = fallback;
    }
    // BODY 基底：任何槽空时显露（L01 遮蔽层语义由渲染层常驻实现）
    return { key, itemId: id, visible: true };
  }

  // ------------------------------------------------------------- 视图

  setView(view: 'front' | 'back'): void {
    this.view = view;
    bus.emit('view:change', { view });
  }

  getView(): 'front' | 'back' {
    return this.view;
  }
}
