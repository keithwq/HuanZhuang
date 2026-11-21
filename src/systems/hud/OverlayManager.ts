/**
 * 覆盖层管理器（E2-S05，hud §5.4——单层互斥）
 * 同一时刻仅允许一层覆盖；打开期间遮罩吸收触控（底层入口不可误触）。
 * 排队请求一律拒绝（daily §5.7：hud §5.4 口径）。
 */

import { bus } from '../../core/bus';

export type OverlayPage = 'look' | 'shop' | 'task' | 'achieve';

export class OverlayManager {
  private open: OverlayPage | null = null;

  constructor(private onPageChange: (page: OverlayPage | null) => void = () => {}) {}

  /** 返回 null = 拒绝（已有覆盖层打开——单层原则，不排队） */
  openOverlay(page: OverlayPage): OverlayPage | null {
    if (this.open !== null) return null;
    this.open = page;
    this.onPageChange(page);
    return page;
  }

  closeOverlay(): void {
    if (this.open === null) return;
    this.open = null;
    this.onPageChange(null);
  }

  current(): OverlayPage | null {
    return this.open;
  }

  isOpen(): boolean {
    return this.open !== null;
  }
}

/**
 * 模式管理器（hud §2.4）：dress ⇄ room 二值；交叉淡切 ≤300ms 可打断、无过渡队列；
 * 每次进入模式抽屉重置默认档；摆放模式自动取消（room §5.4）。
 */
export type Mode = 'dress' | 'room';

export class ModeManager {
  private mode: Mode = 'dress';
  private transitioning = false;
  private transitionTarget: Mode | null = null;

  constructor(
    private onTransitionStart: (from: Mode, to: Mode) => void,
    private onSettled: (mode: Mode) => void,
  ) {}

  current(): Mode {
    return this.mode;
  }

  isTransitioning(): boolean {
    return this.transitioning;
  }

  /**
   * 切换请求：过渡中再次点按 → 中止过渡直接落定目标态（无过渡队列，hud §5.3）。
   * 返回 false = 目标即当前模式（无操作）。
   */
  request(target: Mode): boolean {
    if (target === this.mode && !this.transitioning) return false;
    if (this.transitioning) {
      // 打断：直接落定新目标（hud §5.3：无队列）
      this.settle(target);
      return true;
    }
    this.transitioning = true;
    this.transitionTarget = target;
    this.onTransitionStart(this.mode, target);
    return true;
  }

  /** 渲染层过渡完成回调（≤300ms 交叉淡切收尾） */
  completeTransition(): void {
    if (!this.transitioning || this.transitionTarget === null) return;
    this.settle(this.transitionTarget);
  }

  private settle(target: Mode): void {
    this.mode = target;
    this.transitioning = false;
    this.transitionTarget = null;
    // 摆放模式自动取消（room §5.4：切换中断零残留）——事件供 S07 消费
    bus.emit('hud:modeChange', { mode: target });
    this.onSettled(target);
  }
}
