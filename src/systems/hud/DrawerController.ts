/**
 * 抽屉两档控制器（E2-S02，wardrobe §4 / hud §4）
 * 默认档 = 舞台剩余 × 45%，上拉档 70%；上拉手势速度 > 0.5px/ms 越档吸附、慢速拖拽跟手。
 */

import { DRAWER } from '../../core/constants/budget';

export type DrawerTier = 'default' | 'expanded';

export class DrawerController {
  private tier: DrawerTier = 'default';
  /** 拖拽跟手高度（px，逻辑） */
  private dragH: number | null = null;

  constructor(
    private stageH: number,
    private onChange: (tier: DrawerTier, drawerH: number) => void,
  ) {}

  heightOf(tier: DrawerTier): number {
    return Math.round(this.stageH * (tier === 'default' ? DRAWER.defaultRatio : DRAWER.expandedRatio));
  }

  current(): { tier: DrawerTier; height: number } {
    const tier = this.tier;
    return { tier, height: this.dragH ?? this.heightOf(tier) };
  }

  /** 把手拖拽开始（跟手） */
  beginDrag(): void {
    this.dragH = this.heightOf(this.tier);
  }

  /** 拖拽跟手（不吸附） */
  dragTo(height: number): void {
    this.dragH = Math.max(
      this.heightOf('default'),
      Math.min(this.heightOf('expanded'), Math.round(height)),
    );
    this.onChange(this.tier, this.dragH);
  }

  /**
   * 拖拽结束（wardrobe §4）：速度 > 0.5px/ms 越档吸附（上拉快 → expanded / 下拉快 → default）；
   * 慢速拖拽就近吸附（当前拖拽高度落在哪一半档区）。
   * @param velocityPxPerMs 手势速度（绝对值，px/ms）
   * @param upward 是否向上拉
   */
  endDrag(velocityPxPerMs: number, upward: boolean): DrawerTier {
    const snap = velocityPxPerMs > DRAWER.snapVelocityPxPerMs;
    let tier: DrawerTier;
    if (snap) {
      tier = upward ? 'expanded' : 'default';
    } else {
      // 慢速：就近吸附（中点判定）
      const h = this.dragH ?? this.heightOf(this.tier);
      const midpoint = (this.heightOf('default') + this.heightOf('expanded')) / 2;
      tier = h >= midpoint ? 'expanded' : 'default';
    }
    this.setTier(tier);
    return tier;
  }

  /** 直接点按路径（§9.3 触控冗余）：切档 */
  toggle(): DrawerTier {
    this.setTier(this.tier === 'default' ? 'expanded' : 'default');
    return this.tier;
  }

  /** 进入模式重置默认档（hud §2.4：状态不跨模式记忆） */
  resetDefault(): void {
    this.setTier('default');
  }

  private setTier(tier: DrawerTier): void {
    this.tier = tier;
    this.dragH = null;
    this.onChange(tier, this.heightOf(tier));
  }
}
