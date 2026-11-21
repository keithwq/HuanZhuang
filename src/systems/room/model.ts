/**
 * RoomModel · S07 房间装饰逻辑层（E3-S03/S04/S05，room §2/§4/§5/§8）
 * 摆放读写唯一路径 = SaveService.setPlacement（room §8.1 红线——本模块不另设）。
 * - 类目兼容制（room §2.2）：件可摆进其类目任一开放点位；W-06 窗帘专用位两条例外
 * - 替换式吸附：目标位已有件 → 旧件即时回库存 + toast 合并
 * - 次级联动：宿主替换/收回 → 顶面次级件自动随回库存（room §2.3）
 * - 氛围光棘轮：occupied 5/11/17 → 档 1/2/3，max(档, 存档值) 只升不降（room §4.3）
 * - stats：每次成功落位 +1 furniturePlacedTotal（含替换——room §2.6 冻结口径）
 */

import { bus } from '../../core/bus';
import { ROOM_ANCHORS, roomAnchorById, type RoomAnchor } from '../../core/constants/room-anchors';
import { furnitureById, isCurtainOnly, type FurnitureItem } from '../../data/furniture';
import type { SaveService } from '../save/SaveService';

export interface PlaceResult {
  ok: boolean;
  reason?: 'incompatible-anchor' | 'hidden-anchor' | 'unknown-furn' | 'unknown-anchor';
  /** 替换退回库存的旧件（room §2.2 替换式吸附） */
  returnedFromReplace?: string;
  /** 次级联动自动回库存的件（宿主替换/收回联动，room §2.3） */
  autoReturnedSecondary: string[];
  /** 合并 toast 计数（room §5.1：连带撤回合并计数，不逐条弹） */
  toastMergeCount: number;
  occupied: number;
}

/** 类目 → 开放点位集（room §2.2；W-06 窗帘专用两条例外） */
export const openAnchorsFor = (furn: FurnitureItem): readonly string[] => {
  if (furn.category === 'W') {
    // 窗帘类 → 仅 W-06（专用位）；非窗帘 W 件 → W-01~W-05（不占专用位）
    return isCurtainOnly(furn) ? ['W-06'] : ROOM_ANCHORS.filter((a) => a.kind === 'W' && !a.curtainOnly).map((a) => a.id);
  }
  if (furn.category === 'S') {
    // 地面 S + 次级 S-T（宿主在位时可见可摆）
    return ['S-01', 'S-02', 'S-T1', 'S-T2', 'S-T3', 'S-T4', 'S-T5'];
  }
  return ROOM_ANCHORS.filter((a) => a.kind === furn.category).map((a) => a.id);
};

export class RoomModel {
  /** 摆放模式会话态（不落盘——room §5.4：中断自动取消零残留） */
  private placingFurnId: string | null = null;

  constructor(private save: SaveService) {}

  // ---------------------------------------------------------------- 兼容与可见性（room §2.2/§10.5.2）

  /** 点位可见性：次级点位宿主空缺时隐藏不可摆（room §10.5.2/§5.2 边界） */
  isAnchorVisible(anchorId: string): boolean {
    const anchor = roomAnchorById(anchorId);
    if (!anchor) return false;
    if (anchor.kind !== 'ST') return true;
    return this.save.getPlacement()[anchor.host!] != null;
  }

  /** 类目兼容判定（W-06 / 次级位宿主两条硬约束） */
  canPlace(furnId: string, anchorId: string): boolean {
    const furn = furnitureById(furnId);
    const anchor = roomAnchorById(anchorId);
    if (!furn || !anchor) return false;
    if (!this.isAnchorVisible(anchorId)) return false;
    return openAnchorsFor(furn).includes(anchorId);
  }

  /** 摆放模式下：目标件的可摆点位 + 占用点位集（UI 星光提示/剪影高亮数据源） */
  placementTargets(): { vacant: string[]; occupied: string[] } {
    if (!this.placingFurnId) return { vacant: [], occupied: [] };
    const furn = furnitureById(this.placingFurnId)!;
    const placement = this.save.getPlacement();
    const open = openAnchorsFor(furn).filter((id) => this.isAnchorVisible(id));
    const vacant = open.filter((id) => placement[id] == null);
    const occupied = open.filter((id) => placement[id] != null);
    return { vacant, occupied };
  }

  // ---------------------------------------------------------------- 摆放 / 收回（room §2.2/§2.3）

  /**
   * 落位（点空点位或替换占用点位——替换式吸附）：每次成功 +furniturePlacedTotal（含替换）。
   */
  place(furnId: string, anchorId: string): PlaceResult {
    const furn = furnitureById(furnId);
    if (!furn) return this.fail('unknown-furn');
    if (!roomAnchorById(anchorId)) return this.fail('unknown-anchor');
    if (!this.canPlace(furnId, anchorId)) {
      return this.fail(this.isAnchorVisible(anchorId) ? 'incompatible-anchor' : 'hidden-anchor');
    }
    const placement = this.save.getPlacement();
    const autoReturnedSecondary: string[] = [];
    // 替换连带：目标位为宿主位且其顶面有次级件 → 自动随回（room §2.3，新宿主可再摆）
    for (const child of this.secondaryChildrenOf(anchorId)) {
      if (placement[child] != null) {
        this.save.setPlacement(child, null);
        autoReturnedSecondary.push(child);
      }
    }
    const returnedFromReplace = placement[anchorId] ?? null;
    this.save.setPlacement(anchorId, furnId);
    // stats：含替换落位 +1、收回不计负（room §2.6 冻结口径）
    this.save.bumpStat('furniturePlacedTotal', 1);
    // 氛围光棘轮判定（room §4.3）：档位事件仅升档发射（0 档为初始态不广播）
    const prevTier = this.save.getAmbienceLevel();
    const occupied = this.save.countOccupied();
    const tier = this.save.bumpAmbience(occupied);
    bus.emit('room:furniturePlaced', { anchorId, furnId });
    if (tier > prevTier) {
      bus.emit('room:ambienceTier', { tier });
    }
    return {
      ok: true,
      returnedFromReplace: returnedFromReplace ?? undefined,
      autoReturnedSecondary,
      toastMergeCount: autoReturnedSecondary.length + (returnedFromReplace ? 1 : 0),
      occupied,
    };
  }

  /** 收回（点已摆家具 → 行内确认后）：宿主收回连带顶面次级件随回（room §2.3） */
  withdraw(anchorId: string): { ok: boolean; autoReturnedSecondary: string[] } {
    const placement = this.save.getPlacement();
    if (placement[anchorId] == null) return { ok: false, autoReturnedSecondary: [] };
    this.save.setPlacement(anchorId, null);
    const autoReturnedSecondary: string[] = [];
    for (const child of this.secondaryChildrenOf(anchorId)) {
      if (placement[child] != null) {
        this.save.setPlacement(child, null);
        autoReturnedSecondary.push(child);
      }
    }
    bus.emit('room:furniturePlaced', { anchorId, furnId: null });
    return { ok: true, autoReturnedSecondary };
  }

  /** 指定宿主点位的顶面次级点位（§10.5.2 host 映射） */
  private secondaryChildrenOf(hostAnchorId: string): string[] {
    return ROOM_ANCHORS.filter((a) => a.kind === 'ST' && a.host === hostAnchorId).map((a) => a.id);
  }

  // ---------------------------------------------------------------- 摆放模式会话态（room §5.4：中断零残留）

  enterPlacementMode(furnId: string): boolean {
    if (!furnitureById(furnId)) return false;
    if (!this.save.getOwnedFurniture().includes(furnId)) return false; // 家具抽屉 = 已拥有全集（D3-05）
    this.placingFurnId = furnId;
    return true;
  }

  cancelPlacementMode(): void {
    this.placingFurnId = null;
  }

  /** 摆放模式中再点同一件卡 = 取消；点其他件卡 = 切换目标（room §2.2） */
  tapFurnitureCard(furnId: string): 'entered' | 'switched' | 'cancelled' {
    if (this.placingFurnId === null) {
      return this.enterPlacementMode(furnId) ? 'entered' : 'cancelled';
    }
    if (this.placingFurnId === furnId) {
      this.cancelPlacementMode();
      return 'cancelled';
    }
    this.placingFurnId = furnId;
    return 'switched';
  }

  isPlacing(): string | null {
    return this.placingFurnId;
  }

  // ---------------------------------------------------------------- 查询面

  occupied(): number {
    return this.save.countOccupied();
  }

  ambienceTier(): number {
    return this.save.getAmbienceLevel();
  }

  /** 已摆点位数判定源（成就 ac_c5/c6 星图小屋 ≥11 / 满室星辉 ≥17——room §2.5 冻结值） */
  placedAnchorCount(): number {
    return this.save.countOccupied();
  }

  private fail(reason: NonNullable<PlaceResult['reason']>): PlaceResult {
    return { ok: false, reason, autoReturnedSecondary: [], toastMergeCount: 0, occupied: this.occupied() };
  }
}

void (0 as unknown as RoomAnchor); // 类型引用占位（锚点表类型经由 roomAnchorById 使用）
