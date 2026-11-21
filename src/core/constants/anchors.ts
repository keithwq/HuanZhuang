/**
 * 角色画布锚线 + 挂点常量（E1-S01）
 * 依据：美术圣经 §5.1（512×1024 逻辑画布，坐标即世界坐标）/ §5.2（挂点坐标写死常量表）
 * 红线（美术圣经 §5.2）：挂点坐标禁止散落资产元数据。
 */

/** 逻辑画布（美术圣经 §5.1） */
export const CANVAS_W = 512;
export const CANVAS_H = 1024;
/** 垂直中轴（美术圣经 §5.1） */
export const CANVAS_CENTER_X = 256;

/** 锚线表（v0.2 随 3.5 头身校准值，美术圣经 §5.1）——偏差验收 ≤2px（paperdoll §8.1） */
export const ANCHOR_LINES = {
  top: 80,        // 头顶线：发型/头饰上缘上限
  eye: 225,       // 眼线：眼睛中心
  jaw: 335,       // 下颌线：脸部下缘
  shoulder: 365,  // 肩线：TOP/OUT 肩缝
  chest: 450,     // 胸线：NECK 坠饰下缘
  waist: 545,     // 腰线：BTM 腰头、TOP 下摆基准
  hip: 615,       // 臀线：裙摆展开参考
  knee: 795,     // 膝线：BTM 裤脚参考
  ankle: 950,    // 踝线：LEG 袜口/鞋帮
  ground: 980,   // 地线：鞋底、影子
} as const;

/** 挂点常量表（美术圣经 §5.2，3.5 头身 A_HEAD 校准） */
export const ANCHORS = {
  A_HEAD: { x: 256, y: 200 },
  A_HAND_L: { x: 150, y: 520 },
  A_HAND_R: { x: 362, y: 520 },
  A_WAIST: { x: 256, y: 560 },
} as const;

export type AnchorId = keyof typeof ANCHORS;
