/**
 * typed 领域事件总线（E1-S01）
 * 纪律（architecture §4）：systems 之间只经 bus 事件通信；新事件名必须先入 architecture §4「事件名登记」再实现。
 * 事件登记：tryon:done / outfit:setComplete / coins:changed / settings:audioChanged（2026-11-21 P4-EL-003 落位）。
 */

import type { OutfitKey, SlotId } from './constants/slots';

export interface BusEvents {
  /** 换装请求（wardrobe/looks → paperdoll） */
  'tryon:request': { slot: SlotId; itemId: string | null };
  /** 试穿/卸下成功回调（paperdoll §6；含 unequip——audio-plan §2.2-S1） */
  'tryon:done': { slot: SlotId; itemId: string | null };
  /** 视图切换完成（paperdoll §6 onViewChange） */
  'view:change': { view: 'front' | 'back' };
  /** 行为计数（S09/S10 判据唯一源，bumpStat 发射） */
  'stat:bump': { key: string; delta: number; total: number };
  /** S04 余额变更（hud 册语义引用的落字名；audio-plan S3 过滤 delta>0 发放音） */
  'coins:changed': { delta: number; reason: string; coins: number };
  /** 套装完成（判据归文策渊在途——architecture §4：就位前无发射源） */
  'outfit:setComplete': { seriesId: string };
  /** 音频开关切换（audio-plan §7） */
  'settings:audioChanged': { enabled: boolean };
  /** 日期翻转（local-save §6 onDayFlip） */
  'day:flip': { dateKey: string };
  /** 衣柜页签切换（参数域 = 组 ID G1~G8，GAP-4） */
  'wardrobe:tabChange': { groupId: GroupId };
  /** 转身请求（UiScene → StageScene：拖拽/按钮双路径共用入口，paperdoll §2.2） */
  'view:flipRequest': { target: 'front' | 'back' };
  /** 造型回穿完成（look-save §2.5） */
  'look:applied': { lookId: string; outfit: Record<OutfitKey, string | null> };
  /** 家具落位（room §6 onFurniturePlaced） */
  'room:furniturePlaced': { anchorId: string; furnId: string | null };
  /** 氛围光档位变化（room §6 onAmbienceTierChange） */
  'room:ambienceTier': { tier: number };
  /** 模式切换完成（hud §6 onModeChange） */
  'hud:modeChange': { mode: 'dress' | 'room' };
  /** 存档降级提示（local-save §5.1：一次性 toast） */
  'save:degraded': { once: true };
}

/** 衣柜 8 分组页签组 ID（ux-spec §2.1，GAP-4） */
export type GroupId = 'G1' | 'G2' | 'G3' | 'G4' | 'G5' | 'G6' | 'G7' | 'G8';

type Handler<T> = (payload: T) => void;

export class EventBus {
  private handlers = new Map<keyof BusEvents, Set<Handler<never>>>();

  on<K extends keyof BusEvents>(event: K, handler: Handler<BusEvents[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as Handler<never>);
    return () => set!.delete(handler as Handler<never>);
  }

  once<K extends keyof BusEvents>(event: K, handler: Handler<BusEvents[K]>): void {
    const off = this.on(event, (p) => {
      off();
      handler(p);
    });
  }

  emit<K extends keyof BusEvents>(event: K, payload: BusEvents[K]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const h of [...set]) (h as Handler<BusEvents[K]>)(payload);
  }

  /** 测试辅助：清空全部监听 */
  clear(): void {
    this.handlers.clear();
  }
}

/** 全局唯一总线实例（architecture §4：领域事件唯一通道） */
export const bus = new EventBus();
