/**
 * ViewSwap · 正/背双视图切换状态机（E1-S08，paperdoll §2.2/§4/§5.3）
 * 纯逻辑（真实时钟适配由 compositor 驱动），可 fake-clock 全测。
 * - 过渡 ≤300ms 剪影（scaleX = max(|cos(πt/T)|, 0.08)）；t=T/2 切纹理；T 完成即卸载旧视图
 * - 过渡进行中再翻转请求一律忽略（无旋转队列，§5.3）
 * - 纹理迟到：剪影照常走完 → 旧视图淡切补完，宁可晚 100~200ms 不出空槽（§5.3）
 * - 减敏（§9.4）：100ms 交叉淡切，禁用压缩转身、不预载剪影帧
 */

import { VIEW_FLIP } from '../../core/constants/budget';

export type View = 'front' | 'back';

export interface ViewSwapCallbacks {
  /** 预载目标视图纹理（300ms 窗口内，ADR-003 §3） */
  preload(view: View): void;
  /** t=T/2（剪影最窄处）切换纹理集合 */
  applyView(view: View): void;
  /** 过渡完成：立即卸载旧视图（峰值窗口硬上限 300ms） */
  onComplete(view: View): void;
  /** 纹理迟到兜底完成（旧视图淡切到新视图补完，§5.3） */
  onLateComplete(view: View): void;
  /** 剪影压缩比（0.08~1，供渲染层驱动 scaleX） */
  onSilhouette(scaleX: number): void;
}

export class ViewSwap {
  private current: View = 'front';
  private t = 0; // 过渡已流逝 ms
  private target: View | null = null;
  private swapped = false;
  /** 目标纹理就绪标志（loader 回调 markTexturesReady） */
  private texturesReady = false;
  private awaitingTexture = false;
  private reduced: boolean;

  constructor(
    private cb: ViewSwapCallbacks,
    reducedMotion = false,
  ) {
    this.reduced = reducedMotion;
  }

  view(): View {
    return this.current;
  }

  isTransitioning(): boolean {
    return this.target !== null;
  }

  /**
   * 翻转请求（拖拽/按钮双路径共用）。返回 false = 被忽略（过渡中/同视图，无队列）。
   */
  request(target: View): boolean {
    if (this.target !== null) return false; // 无旋转队列（§5.3）
    if (target === this.current) return false;
    this.target = target;
    this.t = 0;
    this.swapped = false;
    this.texturesReady = false;
    this.awaitingTexture = false;
    // 减敏：100ms 交叉淡切、不预载剪影帧（§5.4）；纹理预载仍需要（切视图必需）
    this.cb.preload(target);
    if (this.reduced) this.cb.onSilhouette(1); // 无压缩转身
    else this.cb.onSilhouette(1);
    return true;
  }

  /**
   * 推进时钟（fake-clock 可测）。T：正常 300ms / 减敏 100ms。
   * 返回本帧是否发生了状态转移（供渲染循环刷新）。
   */
  advance(dtMs: number): boolean {
    if (this.target === null) return false;
    const T = this.reduced ? 100 : VIEW_FLIP.maxMs;
    this.t += dtMs;
    const half = T / 2;

    // 剪影压缩（减敏模式无压缩）
    if (!this.reduced) {
      const scaleX = Math.max(Math.abs(Math.cos((Math.PI * Math.min(this.t, T)) / T)), VIEW_FLIP.silhouetteMinScaleX);
      this.cb.onSilhouette(scaleX);
    }

    // t=T/2：完成纹理换装（剪影最窄处）
    if (!this.swapped && this.t >= half) {
      this.swapped = true;
      if (this.texturesReady) {
        this.applyTargetView();
      } else {
        // 纹理未就绪：剪影照常走完，等 loader 回调（§5.3 迟到兜底）
        this.awaitingTexture = true;
      }
    }

    // t=T：过渡完成
    if (this.t >= T) {
      if (this.texturesReady && this.swapped) {
        this.settleComplete();
      } else {
        // 剪影走完但纹理迟到：停留"等纹理"态，旧视图继续显示（不出空槽/白体）
        this.t = T; // 冻结时钟推进
      }
    }
    return true;
  }

  /** loader 回调：目标视图纹理就绪 */
  markTexturesReady(): void {
    this.texturesReady = true;
    if (this.target !== null && this.awaitingTexture) {
      // 迟到补完：旧视图淡切到新视图（§5.3）
      this.applyTargetView();
      this.cb.onLateComplete(this.target);
      this.settleComplete();
    }
  }

  private applyTargetView(): void {
    if (this.target === null) return;
    this.current = this.target;
    this.cb.applyView(this.current);
  }

  private settleComplete(): void {
    if (this.target === null) return;
    const done = this.target;
    this.target = null;
    this.awaitingTexture = false;
    this.cb.onComplete(done); // 完成即卸载旧视图（ADR-003 §3：窗口硬上限）
    this.cb.onSilhouette(1);
  }

  /** 减敏模式动态切换（settings 变更即时生效） */
  setReducedMotion(reduced: boolean): void {
    this.reduced = reduced;
  }
}
