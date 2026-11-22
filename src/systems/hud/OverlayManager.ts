/**
 * 覆盖层管理器（E2-S05，hud §5.4——单层互斥）
 * 同一时刻仅允许一层覆盖；打开期间遮罩吸收触控（底层入口不可误触）。
 * 排队请求一律拒绝（daily §5.7：hud §5.4 口径）。
 */

import { bus } from '../../core/bus';
import { FEEDBACK_MS } from '../../core/constants/budget';
import type { TweenHandle } from '../paperdoll/tweenSvc';
import { TweenService } from '../paperdoll/tweenSvc';
import { RoomModel } from '../room/model';
import { interruptPlacement } from '../room/placement-ui';
import type { SaveService } from '../save/SaveService';
import { DrawerController } from './DrawerController';

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

/** 底部四入口。商店与成就保持不可用，直到各自的包。 */
export const MODE_TAB_BAR = [
  { label: '换装', enabled: true, mode: 'dress' },
  { label: '房间', enabled: true, mode: 'room' },
  { label: '商店', enabled: false, mode: null },
  { label: '成就', enabled: false, mode: null },
] as const;

/** 房间容器只创建一次。再次进入复用原来的那个。 */
export const singleRoomContainer = <T>(current: T | null, create: () => T): T => current ?? create();

export interface ModeFrame {
  visible: Mode;
  fading: boolean;
  from: Mode;
  to: Mode;
  /** 线性进度 0→1。落定后为 1。减敏没有中间帧。 */
  t: number;
}

const modeSessions = new WeakMap<SaveService, ModeSwitchController>();

/**
 * 把 ModeManager 接到舞台与抽屉。
 * 过渡时长交给 TweenService，上限 300ms；减敏不排过渡，直接落定。
 * 打断沿用 ModeManager：过渡中的新点按立刻落定，不排队。
 */
export class ModeSwitchController {
  private readonly room: RoomModel;
  private readonly mm: ModeManager;
  private drawer: DrawerController | null = null;
  private mountRoom: () => void = () => {};
  private listeners = new Set<(frame: ModeFrame) => void>();
  private fadeFrom: Mode = 'dress';
  private fadeTo: Mode = 'dress';

  constructor(
    save: SaveService,
    private isReduced: () => boolean,
    private tween: TweenService,
  ) {
    this.room = new RoomModel(save);
    this.mm = new ModeManager(
      (from, to) => this.begin(from, to),
      () => this.finish(),
    );
  }

  setRoomMounter(mountRoom: () => void): void {
    this.mountRoom = mountRoom;
  }

  attachDrawer(drawer: DrawerController): void {
    this.drawer = drawer;
  }

  roomModel(): RoomModel {
    return this.room;
  }

  current(): Mode {
    return this.mm.current();
  }

  isTransitioning(): boolean {
    return this.mm.isTransitioning();
  }

  onFrame(listener: (frame: ModeFrame) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * 点底部页签。目标就是当前模式时不做事。
   * 真的要离开时，先清掉摆放选中，再交给 ModeManager。
   */
  tap(target: Mode): boolean {
    const changing = target !== this.mm.current() || this.mm.isTransitioning();
    if (!changing) return false;
    interruptPlacement(this.room);
    return this.mm.request(target);
  }

  /** 由舞台帧循环推进。过渡走完才落定。 */
  advance(dtMs: number): void {
    const transitioning = this.mm.isTransitioning();
    const handle = this.modeHandle();
    this.tween.advance(dtMs);
    if (!transitioning || !handle) return;
    if (!handle.running || handle.elapsed >= handle.durationMs) {
      this.mm.completeTransition();
    }
  }

  frame(): ModeFrame {
    if (!this.mm.isTransitioning()) {
      const visible = this.mm.current();
      return { visible, fading: false, from: visible, to: visible, t: 1 };
    }
    const handle = this.modeHandle();
    const t = handle && handle.durationMs > 0 ? Math.min(1, handle.elapsed / handle.durationMs) : 0;
    return { visible: this.fadeFrom, fading: true, from: this.fadeFrom, to: this.fadeTo, t };
  }

  private begin(from: Mode, to: Mode): void {
    this.fadeFrom = from;
    this.fadeTo = to;
    this.mountRoom();
    if (this.isReduced()) {
      this.tween.killTweensOf('mode-stage', 'oneshot');
      this.mm.completeTransition();
      return;
    }
    this.tween.createOneShot('modeSwitch', 'mode-stage', FEEDBACK_MS.modeSwitch);
    this.emit();
  }

  private finish(): void {
    this.tween.killTweensOf('mode-stage', 'oneshot');
    this.emit();
    this.drawer?.resetDefault();
  }

  private emit(): void {
    const frame = this.frame();
    for (const listener of [...this.listeners]) listener(frame);
  }

  private modeHandle(): TweenHandle | undefined {
    return this.tween.activeHandles().find((item) => item.target === 'mode-stage' && item.animId === 'modeSwitch');
  }
}

export const modeSwitchFor = (
  save: SaveService,
  isReduced: () => boolean,
  tween: TweenService,
): ModeSwitchController => {
  let found = modeSessions.get(save);
  if (!found) {
    found = new ModeSwitchController(save, isReduced, tween);
    modeSessions.set(save, found);
  }
  return found;
};
