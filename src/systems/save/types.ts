/**
 * S04 存档 schema v1（E1-S02/S03，local-save §2.1 冻结结构）
 * 纪律（local-save §4）：静态定义表全部不入档，存档只存"进度与选择"。
 */

import type { OutfitKey } from '../../core/constants/slots';

export type OutfitMap = Record<OutfitKey, string | null>;

export interface LookEntry {
  id: string;
  name: string;
  /** 完整 13 槽深拷贝快照（含被连衣裙遮蔽的 BTM，look-save §2.2） */
  outfit: OutfitMap;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerEntry {
  t: string;
  delta: number;
  reason: string;
}

export interface DailyTaskState {
  taskId: string;
  progress: number;
  claimed: boolean;
}

export interface SaveDataV1 {
  schemaVersion: 1;
  player: { createdAt: string; lastSeenAt: string };
  wardrobe: {
    ownedItems: string[];
    outfit: OutfitMap;
  };
  looks: LookEntry[];
  economy: { coins: number; ledger: LedgerEntry[] };
  room: {
    ownedFurniture: string[];
    placement: Record<string, string | null>;
    /** 可选键（ADR-002 §4.4：新字段必须可派生或可默认；room §3 向后兼容口径） */
    ambienceLevel?: number;
  };
  daily: { dateKey: string; tasks: DailyTaskState[] };
  achievements: Record<string, { progress: number; claimed: boolean }>;
  stats: {
    tryOnTotal: number;
    tryOnUnique: number;
    lookSavedTotal: number;
    itemsOwnedTotal: number;
    furniturePlacedTotal: number;
    coinEarnTotal: number;
    /**
     * 辅助清单：已试穿过 itemId 全集——服务 tryOnUnique 首穿判定（wardrobe §2.2）
     * 与 S09 新试类可达性（daily §4）。归 stats 域（判据唯一源红线 local-save §3）。
     */
    triedItems: string[];
  };
  settings: {
    /** null=跟随系统（local-save §2.1） */
    reducedMotionOverride: null | boolean;
    /** ADR-002 补丁附录 A：boolean / 默认 true / 无 null 跟随态 */
    audioEnabled: boolean;
  };
}

export const SAVE_KEY = 'huanzhuang_save';
export const SAVE_KEY_BAK = 'huanzhuang_save_bak';
export const SAVE_KEY_MIG = 'huanzhuang_save_mig';

export const emptyOutfit = (): OutfitMap => ({
  BK: null, BODY: null, HAIR_B: null, LEG: null, BTM: null, TOP: null, OUT: null,
  HAND_L: null, HAND_R: null, NECK: null, HAIR_F: null, HEAD: null, FACE: null, FX: null,
});

export const newSave = (now: string): SaveDataV1 => ({
  schemaVersion: 1,
  player: { createdAt: now, lastSeenAt: now },
  wardrobe: { ownedItems: [], outfit: emptyOutfit() },
  looks: [],
  economy: { coins: 0, ledger: [] },
  room: { ownedFurniture: [], placement: {}, ambienceLevel: 0 },
  daily: { dateKey: '', tasks: [] },
  achievements: {},
  stats: {
    tryOnTotal: 0, tryOnUnique: 0, lookSavedTotal: 0,
    itemsOwnedTotal: 0, furniturePlacedTotal: 0, coinEarnTotal: 0,
    triedItems: [],
  },
  settings: { reducedMotionOverride: null, audioEnabled: true },
});
