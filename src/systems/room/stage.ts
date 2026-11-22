/**
 * 房间舞台只读快照（SPEC-0001）。
 * 图层链：墙体 → 地面 → 家具（按 base-y 由后到前）→ 纱幔。
 * 坐标只读 ROOM_ANCHORS。真图未接入时返回灰盒，不因缺图失败。
 * 地垫在地面层；墙面挂件留在墙层，不进家具 Y 排序（room §4）。
 * 抽屉只挂在快照上，不改上面的层排序。
 */

import { ROOM_ANCHORS, type RoomAnchor } from '../../core/constants/room-anchors';
import { furnitureById, isCurtainOnly } from '../../data/furniture';
import type { SaveService } from '../save/SaveService';
import { readFurnitureDrawer, type FurnitureDrawerPage } from './drawer';
import type { RoomModel } from './model';
import { readPlacementHints, type PlacementHintState } from './placement-ui';

export const ROOM_STAGE_LAYERS = ['wall', 'floor', 'furniture', 'gauze'] as const;
export type RoomStageLayerName = (typeof ROOM_STAGE_LAYERS)[number];

export interface RoomStagePiece {
  anchorId: string;
  furnId: string;
  /** 吸附点，来自对应 ROOM_ANCHORS 项 */
  x: number;
  /** 绘制顺序用的 base-y，来自对应 ROOM_ANCHORS 项 */
  y: number;
  graphic: 'greybox';
}

export interface RoomStageLayer {
  name: RoomStageLayerName;
  graphic: 'greybox';
  /** 家具层按 y 升序：较小 Y 先画（在后），较大 Y 后画（在前） */
  pieces: RoomStagePiece[];
}

export interface RoomStageState {
  ok: true;
  graphic: 'greybox';
  texture: 'missing';
  anchors: readonly RoomAnchor[];
  layers: readonly RoomStageLayer[];
  /** 抽屉挂在舞台上，默认打开 L 页。读取抽屉不改 layers。 */
  drawer: FurnitureDrawerPage;
  /** 未进入摆放时为空。点亮集合来自 RoomModel，不另算相容规则。 */
  hints: PlacementHintState;
}

const layerNameFor = (anchor: RoomAnchor, furnId: string): RoomStageLayerName => {
  const furn = furnitureById(furnId);
  if (furn && isCurtainOnly(furn)) return 'gauze';
  if (anchor.kind === 'W') return 'wall';
  if (anchor.kind === 'R') return 'floor';
  return 'furniture';
};

/** 读取存档摆放，按层给出灰盒绘制状态。room 只用于摆放提示，不写回。 */
export const readRoomStage = (save: SaveService, room?: RoomModel): RoomStageState => {
  const placement = save.getPlacement();
  const buckets: Record<RoomStageLayerName, RoomStagePiece[]> = {
    wall: [],
    floor: [],
    furniture: [],
    gauze: [],
  };

  for (const anchor of ROOM_ANCHORS) {
    const furnId = placement[anchor.id];
    if (!furnId || !furnitureById(furnId)) continue;
    buckets[layerNameFor(anchor, furnId)].push({
      anchorId: anchor.id,
      furnId,
      x: anchor.x,
      y: anchor.y,
      graphic: 'greybox',
    });
  }

  buckets.furniture.sort((a, b) => a.y - b.y || a.anchorId.localeCompare(b.anchorId));

  return {
    ok: true,
    graphic: 'greybox',
    texture: 'missing',
    anchors: ROOM_ANCHORS,
    layers: ROOM_STAGE_LAYERS.map((name) => ({
      name,
      graphic: 'greybox' as const,
      pieces: buckets[name],
    })),
    drawer: readFurnitureDrawer(save, 'L'),
    hints: room ? readPlacementHints(room) : { active: false, furnId: null, anchorIds: [] },
  };
};
