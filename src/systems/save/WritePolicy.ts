/**
 * WritePolicy · 节流写入策略（E1-S03，ADR-002 §3 / local-save §2.2）
 * - 高频（换装/试穿）500ms 防抖；关键操作即时写；三生命周期钩子强制冲刷
 *   （visibilitychange→hidden 主钩子，iOS Safari 对 beforeunload 不保证——ADR-002 §3）
 */

import { SAVE_POLICY } from '../../core/constants/budget';

export type WriteTrigger = 'debounce' | 'immediate' | 'flush';

/** 关键操作即时写硬编码清单（ADR-002 §3：不留给调用方判断） */
export type ImmediateOp =
  | 'purchase'        // 购入（economy §5.2）
  | 'placement'       // 摆放/收回（room §5.2）
  | 'saveLook'        // 保存造型
  | 'deleteLook'      // 删除造型（look-save §2.6：即时写盘）
  | 'claimTask'       // 领取任务奖励（daily §5.2）
  | 'claimAchievement' // 领取成就（economy §5.7）
  | 'settings'        // 设置切换（ADR-002 补丁附录 A）
  | 'migrate';        // 迁移前快照（ADR-002 §4）

export class WritePolicy {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private dirty = false;
  /** 未冲刷的本地脏数据标志（多标签页：本地优先，ADR-002 §5） */
  private pending = false;

  constructor(
    private doWrite: (trigger: WriteTrigger) => void,
    private debounceMs: number = SAVE_POLICY.debounceMs,
  ) {}

  /** 高频操作：防抖合并，最后一次为准 */
  scheduleDebounced(): void {
    this.dirty = true;
    this.pending = true;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.dirty) this.flushNow('debounce');
    }, this.debounceMs);
  }

  /** 关键操作：即时写 */
  writeImmediate(op: ImmediateOp): void {
    void op;
    this.dirty = false;
    this.pending = false;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.doWrite('immediate');
  }

  /** 强制冲刷（生命周期钩子；内存态由调用方持有） */
  flushNow(trigger: Extract<WriteTrigger, 'debounce' | 'flush'>): void {
    this.dirty = false;
    this.pending = false;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.doWrite(trigger);
  }

  /** 防抖窗口内有未落盘数据？（multi-tab 本地优先判定用） */
  hasPending(): boolean {
    return this.pending;
  }

  /** 挂接生命周期三钩子（pagehide/beforeunload/visibilitychange） */
  attachLifecycleHooks(win: Window): () => void {
    const onHidden = () => {
      if (document.visibilityState === 'hidden') this.flushNow('flush');
    };
    const onPageHide = () => this.flushNow('flush');
    const onBeforeUnload = () => this.flushNow('flush');
    document.addEventListener('visibilitychange', onHidden);
    win.addEventListener('pagehide', onPageHide);
    win.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      win.removeEventListener('pagehide', onPageHide);
      win.removeEventListener('beforeunload', onBeforeUnload);
    };
  }
}
