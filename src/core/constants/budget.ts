/**
 * 预算阈值 + 动效白名单时长表（E1-S01）
 * 依据：cal-04-review（三档内存阈值）/ 美术圣经 §8.1/§8.2 + D1-11（动效白名单）/ art §9.4（减敏）
 */

/** 三档纹理内存阈值（MB）——R-05/R-06/R-07（cal-04 §5 结论表） */
export const TEXMEM_TIERS = {
  dressSteady: 45,
  flipPeak: 75,
  room: 60,
} as const;

/** 交互反馈红线（D1-11） */
export const FEEDBACK_MS = {
  /** 单次反馈动效上限（art §8） */
  maxOneShot: 300,
  /** 减敏模式反馈（art §9.4） */
  reducedMotion: 100,
  /** 按钮摇头（art §8.1） */
  headShake: 200,
  /** 正/背剪影过渡（paperdoll §4） */
  viewFlip: 300,
  /** 模式切换交叉淡切（hud §4） */
  modeSwitch: 300,
} as const;

/** 常驻微动效白名单（D1-11：仅 3 项；白名单外循环动效一律拒绝——tweenSvc guard 依据） */
export interface ResidentAnimSpec {
  id: 'breath' | 'blink' | 'sway';
  /** 循环周期 ms */
  periodMs: number;
  /** 周期随机抖动 ±ms（blink 专属） */
  periodJitterMs?: number;
  /** 参数（与美术圣经 §8.2 逐值对应） */
  params: { scaleAmplitude?: number; closedMs?: number; swayPx?: number };
}

export const RESIDENT_ANIMS: readonly ResidentAnimSpec[] = [
  { id: 'breath', periodMs: 3000, params: { scaleAmplitude: 0.01 } },           // 呼吸：躯干 ±1%
  { id: 'blink', periodMs: 8000, periodJitterMs: 2000, params: { closedMs: 120 } }, // 眨眼：8s ±2s，闭眼 120ms
  { id: 'sway', periodMs: 4000, params: { swayPx: 2 } },                        // 裙摆/发梢 ±2px
];

/** 换装确认动效（paperdoll §4：淡出 100ms → 淡入 150ms + 2% 上浮落定，总 ≤300ms） */
export const TRYON_ANIM = { fadeOutMs: 100, fadeInMs: 150, risePercent: 0.02 } as const;

/** 懒加载翻转过渡公式参数（paperdoll §4） */
export const VIEW_FLIP = { maxMs: 300, silhouetteMinScaleX: 0.08 } as const;

/** 存档写入（local-save §2.2/§4：500ms 防抖 / ledger 滚窗 50 / 造型 9 位） */
export const SAVE_POLICY = { debounceMs: 500, ledgerMax: 50, looksMax: 9 } as const;

/** 抽屉两档（wardrobe §4 / hud §4：45% / 70%，速度吸附 0.5px/ms） */
export const DRAWER = {
  defaultRatio: 0.45,
  expandedRatio: 0.7,
  snapVelocityPxPerMs: 0.5,
  handleHeightPx: 96,
} as const;
