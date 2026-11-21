/**
 * HUD 布局计算（E2-S01，hud §2.1/§4）
 * 720 逻辑宽基准 + 实际按屏比缩放（hud §4 换算规则）；安全区动态避让（§5.2）。
 * 纯函数，Phaser UiScene 消费。
 */

export interface ScreenMetrics {
  /** CSS 像素宽高 */
  cssW: number;
  cssH: number;
  safeTop: number;
  safeBottom: number;
}

export interface HudLayout {
  /** 逻辑宽恒 720（长屏增益归舞台区，hud §5.7） */
  logicalW: number;
  logicalH: number;
  /** 缩放：逻辑 → CSS */
  scale: number;
  topNavH: number;    // 88（hud §2.1）
  tabBarH: number;    // 96（hud §2.1）
  safeTop: number;
  safeBottom: number;
  /** 舞台剩余高 = 屏高 − 状态栏 − 顶导 − 标签栏 − 安全区（hud §4 公式） */
  stageH: number;
  /** 抽屉两档（wardrobe §4：45% / 70%） */
  drawerDefaultH: number;
  drawerExpandedH: number;
}

export const TOP_NAV_H = 88;
export const TAB_BAR_H = 96;
export const LOGICAL_W = 720;
export const DRAWER_DEFAULT_RATIO = 0.45;
export const DRAWER_EXPANDED_RATIO = 0.7;

export const computeLayout = (m: ScreenMetrics): HudLayout => {
  const scale = m.cssW / LOGICAL_W;
  const logicalH = m.cssH / scale;
  const safeTop = m.safeTop / scale;
  const safeBottom = m.safeBottom / scale;
  const stageH = logicalH - safeTop - TOP_NAV_H - TAB_BAR_H - safeBottom;
  return {
    logicalW: LOGICAL_W,
    logicalH,
    scale,
    topNavH: TOP_NAV_H,
    tabBarH: TAB_BAR_H,
    safeTop,
    safeBottom,
    stageH,
    drawerDefaultH: Math.round(stageH * DRAWER_DEFAULT_RATIO),
    drawerExpandedH: Math.round(stageH * DRAWER_EXPANDED_RATIO),
  };
};

/** 字号换算（art §3.2：渲染字号 = 设计值 × 实际屏宽/720；最小可读 12 独立像素下限不破 §9.5） */
export const fontScale = (designPx: number, cssW: number): number =>
  Math.max(designPx * (cssW / LOGICAL_W), 12);

/** 角标规则（hud §4：>0 才显示；>9 显 "9+"） */
export const badgeText = (count: number): string | null => {
  if (count <= 0) return null;
  return count > 9 ? '9+' : `${count}`;
};
