/**
 * Serializer · schema v1 ↔ 内存态映射 + 可选键默认补齐（E1-S02/S03）
 * 纪律（ADR-002 §4.4）：新字段必须可派生或可默认，禁止硬性断言存在。
 * - ambienceLevel：旧档缺失按 occupied 重算（room §3 向后兼容口径）
 * - settings.audioEnabled：缺键补默认 true（ADR-002 补丁附录 A，零迁移）
 */

import { ROOM_ANCHOR_COUNT } from '../../core/constants/room-anchors';
import type { SaveDataV1 } from './types';
import { newSave } from './types';

export type ParseResult =
  | { ok: true; data: SaveDataV1 }
  | { ok: false; error: string };

/** 氛围光档位派生（room §4.3：occupied 5/11/17 → 0/1/2/3，向上取整口径） */
export const ambienceTierFromOccupied = (occupied: number): number =>
  occupied >= 17 ? 3 : occupied >= 11 ? 2 : occupied >= 5 ? 1 : 0;

export class Serializer {
  /** 解析 + 兜底补齐。解析失败返回 ok:false（调用方走双键回退，绝不闪退——local-save §5.3） */
  parse(raw: string | null): ParseResult {
    if (raw === null) return { ok: false, error: 'empty' };
    let obj: unknown;
    try {
      obj = JSON.parse(raw);
    } catch (e) {
      return { ok: false, error: `json-corrupt: ${(e as Error).message}` };
    }
    if (typeof obj !== 'object' || obj === null) return { ok: false, error: 'not-object' };
    const o = obj as Partial<SaveDataV1>;
    if (o.schemaVersion !== 1) return { ok: false, error: `unsupported-schemaVersion:${o.schemaVersion}` };
    return { ok: true, data: this.applyDefaults(o as SaveDataV1) };
  }

  /** 可选键/缺失键默认补齐（幂等：重放结果一致） */
  applyDefaults(d: SaveDataV1): SaveDataV1 {
    const base = newSave(d.player?.lastSeenAt ?? d.player?.createdAt ?? this.now());
    const merged: SaveDataV1 = {
      ...base,
      ...d,
      player: { ...base.player, ...d.player },
      wardrobe: {
        ownedItems: d.wardrobe?.ownedItems ?? [],
        outfit: { ...base.wardrobe.outfit, ...d.wardrobe?.outfit },
      },
      looks: Array.isArray(d.looks) ? d.looks : [],
      economy: {
        coins: d.economy?.coins ?? 0,
        ledger: Array.isArray(d.economy?.ledger) ? d.economy!.ledger : [],
      },
      room: {
        ownedFurniture: d.room?.ownedFurniture ?? [],
        placement: d.room?.placement ?? {},
        // ambienceLevel 可选键：缺失按 occupied 重算（ADR-002 §4.4 派生模式）
        ambienceLevel:
          typeof d.room?.ambienceLevel === 'number'
            ? d.room.ambienceLevel
            : ambienceTierFromOccupied(this.countOccupied(d.room?.placement ?? {})),
      },
      daily: {
        dateKey: d.daily?.dateKey ?? '',
        tasks: Array.isArray(d.daily?.tasks) ? d.daily!.tasks : [],
      },
      achievements: d.achievements ?? {},
      stats: {
        ...base.stats,
        ...d.stats,
        triedItems: Array.isArray(d.stats?.triedItems) ? d.stats.triedItems : [],
      },
      settings: {
        reducedMotionOverride: d.settings?.reducedMotionOverride ?? null,
        // ADR-002 补丁附录 A：缺键补默认 true，零迁移
        audioEnabled: d.settings?.audioEnabled ?? true,
      },
    };
    return merged;
  }

  serialize(d: SaveDataV1): string {
    return JSON.stringify(d);
  }

  /** occupied = placement[21 键] 非 null 计数（room §4：分母固定 21） */
  countOccupied(placement: Record<string, string | null>): number {
    let n = 0;
    for (const k of Object.keys(placement)) {
      if (placement[k] !== null && placement[k] !== undefined) n++;
    }
    return Math.min(n, ROOM_ANCHOR_COUNT);
  }

  /** 测试/环境注入用 */
  protected now(): string {
    return new Date().toISOString();
  }
}
