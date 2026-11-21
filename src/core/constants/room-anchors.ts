/**
 * 房间 21 锚点点位常量表（E1-S01）
 * 依据：美术圣经 §10.5（v0.4 生产基准）——键名/坐标与该表逐一同名同坐标（room §8.1 零差异验收）。
 * 纪律（§10.5）：坐标写死引擎常量表，吸附点 = 家具底缘中心（base-y）。
 */

export type RoomAnchorKind = 'L' | 'M' | 'S' | 'ST' | 'W' | 'R';

export interface RoomAnchor {
  id: string;
  kind: RoomAnchorKind;
  /** 吸附坐标（cx, base-y）；墙面挂点为 (cx, cy) */
  x: number;
  y: number;
  /** 次级点位的宿主锚点 ID（仅 ST 类） */
  host?: string;
  /** 窗帘专用位（仅 W-06，room §2.2 例外） */
  curtainOnly?: boolean;
}

export const ROOM_ANCHORS: readonly RoomAnchor[] = [
  // §10.5.1 地面主点位
  { id: 'L-01', kind: 'L', x: 224, y: 1248 },
  { id: 'L-02', kind: 'L', x: 504, y: 992 },
  { id: 'L-03', kind: 'L', x: 480, y: 1120 },
  { id: 'M-01', kind: 'M', x: 568, y: 1184 },
  { id: 'M-02', kind: 'M', x: 152, y: 992 },
  { id: 'M-03', kind: 'M', x: 568, y: 1056 },
  { id: 'M-04', kind: 'M', x: 152, y: 1120 },
  { id: 'S-01', kind: 'S', x: 480, y: 1248 },
  { id: 'S-02', kind: 'S', x: 632, y: 1248 },
  // §10.5.2 家具顶面次级点位（宿主空缺时隐藏）
  { id: 'S-T1', kind: 'ST', x: 96, y: 1240, host: 'L-01' },
  { id: 'S-T2', kind: 'ST', x: 400, y: 1104, host: 'L-03' },
  { id: 'S-T3', kind: 'ST', x: 560, y: 1104, host: 'L-03' },
  { id: 'S-T4', kind: 'ST', x: 504, y: 950, host: 'L-02' },
  { id: 'S-T5', kind: 'ST', x: 568, y: 1010, host: 'M-03' },
  // §10.5.3 墙面挂点（cy 坐标；W-06 窗帘专用）
  { id: 'W-01', kind: 'W', x: 160, y: 320 },
  { id: 'W-02', kind: 'W', x: 560, y: 320 },
  { id: 'W-03', kind: 'W', x: 360, y: 200 },
  { id: 'W-04', kind: 'W', x: 120, y: 620 },
  { id: 'W-05', kind: 'W', x: 600, y: 620 },
  { id: 'W-06', kind: 'W', x: 360, y: 520, curtainOnly: true },
  // §10.5.4 地垫位
  { id: 'R-01', kind: 'R', x: 360, y: 1088 },
];

export const ROOM_ANCHOR_COUNT = ROOM_ANCHORS.length; // 21（room §4：分母固定 21，含次级位）

export const roomAnchorById = (id: string): RoomAnchor | undefined =>
  ROOM_ANCHORS.find((a) => a.id === id);

/** 类目 → 开放点位集（room §2.2 类目兼容制；建议点位为构图参考非限制——§10.5.5 口径标注） */
export const OPEN_ANCHORS_BY_KIND: Record<Exclude<RoomAnchorKind, 'ST' | 'R'> | 'ST' | 'R', readonly string[]> = {
  L: ROOM_ANCHORS.filter((a) => a.kind === 'L').map((a) => a.id),
  M: ROOM_ANCHORS.filter((a) => a.kind === 'M').map((a) => a.id),
  S: ['S-01', 'S-02', 'S-T1', 'S-T2', 'S-T3', 'S-T4', 'S-T5'], // 地面 S + 次级 S（宿主在位时）
  W: ROOM_ANCHORS.filter((a) => a.kind === 'W').map((a) => a.id),
  R: ['R-01'],
  ST: ROOM_ANCHORS.filter((a) => a.kind === 'ST').map((a) => a.id),
};
