/**
 * TweenService · 动效白名单 guard + 可打断补间（E1-S09，paperdoll §2.4 / art §8 / D1-11）
 * 纯逻辑层：时间轴推进与打断语义可 fake-clock 全测；Phaser tween 绑定由 compositor 消费白名单裁决。
 * 红线：
 * - 常驻循环动效仅白名单 3 项（呼吸/眨眼/裙摆），白名单外创建一律抛错（D1-11 运行时 guard）
 * - 一次性反馈 ≤300ms（art §8）；减敏 ≤100ms 纯淡切、常驻全关（§9.4）
 * - 全程可打断：新事件到达即中止当前动效（无队列，paperdoll §4）
 */

import { FEEDBACK_MS, RESIDENT_ANIMS } from '../../core/constants/budget';
import type { ResidentAnimSpec } from '../../core/constants/budget';

export type ResidentAnimId = ResidentAnimSpec['id'];

export interface TweenHandle {
  id: number;
  kind: 'resident' | 'oneshot';
  animId: string;
  target: string;
  durationMs: number;
  running: boolean;
  /** 已推进 ms（测试断言用） */
  elapsed: number;
  params: Record<string, number>;
}

const RESIDENT_IDS = new Set<string>(RESIDENT_ANIMS.map((a) => a.id));

export class TweenService {
  private handles = new Map<number, TweenHandle>();
  private nextId = 1;

  constructor(private isReducedMotion: () => boolean = () => false) {}

  /**
   * 常驻循环动效创建（白名单 guard）。
   * 白名单外 id → 抛错拒绝（D1-11）；减敏模式 → 返回 null（常驻全关，art §9.4）。
   */
  createResident(id: string, target: string): TweenHandle | null {
    if (!RESIDENT_IDS.has(id)) {
      throw new Error(`tweenSvc: 白名单外常驻动效拒绝创建 [${id}]（D1-11，仅 ${[...RESIDENT_IDS].join('/')}）`);
    }
    if (this.isReducedMotion()) return null;
    const spec = RESIDENT_ANIMS.find((a) => a.id === id)!;
    const handle: TweenHandle = {
      id: this.nextId++,
      kind: 'resident',
      animId: id,
      target,
      durationMs: spec.periodMs,
      running: true,
      elapsed: 0,
      params: { ...spec.params, jitter: spec.periodJitterMs ?? 0 },
    };
    this.handles.set(handle.id, handle);
    return handle;
  }

  /**
   * 一次性反馈动效（≤300ms 家族，art §8.1）。超时 → 抛错；减敏 → 压缩 100ms 纯淡切。
   * 打断语义：创建前 killTweensOf(target)（新事件到达即中止，paperdoll §4）
   */
  createOneShot(animId: string, target: string, durationMs: number): TweenHandle {
    if (durationMs > FEEDBACK_MS.maxOneShot) {
      throw new Error(`tweenSvc: 单次反馈超上限 ${durationMs}ms > ${FEEDBACK_MS.maxOneShot}ms（art §8）`);
    }
    this.killTweensOf(target, 'oneshot'); // 可打断：同目标旧动效立即中止（无队列）
    const reduced = this.isReducedMotion();
    const handle: TweenHandle = {
      id: this.nextId++,
      kind: 'oneshot',
      animId: reduced ? `${animId}:reducedFade` : animId,
      target,
      durationMs: reduced ? FEEDBACK_MS.reducedMotion : durationMs,
      running: true,
      elapsed: 0,
      params: {},
    };
    this.handles.set(handle.id, handle);
    return handle;
  }

  /** 打断：中止 target 上的动效（可选限定类型，避免误杀常驻呼吸） */
  killTweensOf(target: string, kind?: TweenHandle['kind']): number {
    let killed = 0;
    for (const h of this.handles.values()) {
      if (h.target === target && h.running && (kind === undefined || h.kind === kind)) {
        h.running = false;
        killed++;
      }
    }
    return killed;
  }

  /** 时钟推进（fake-clock 可测）：完成的 oneshot 自动出表 */
  advance(dtMs: number): void {
    for (const h of [...this.handles.values()]) {
      if (!h.running) continue;
      h.elapsed += dtMs;
      if (h.kind === 'oneshot' && h.elapsed >= h.durationMs) {
        h.running = false;
        this.handles.delete(h.id);
      }
    }
  }

  activeHandles(): TweenHandle[] {
    return [...this.handles.values()].filter((h) => h.running);
  }

  residentRunning(id: ResidentAnimId): boolean {
    return [...this.handles.values()].some((h) => h.kind === 'resident' && h.animId === id && h.running);
  }

  /** 帧率降档（paperdoll §4：时长不变、帧数减半）——由渲染循环 dt 驱动，本层时长恒定 */
  tick(dtMs: number): void {
    this.advance(dtMs);
  }
}

/** 减敏判定助手：系统偏好 + 用户覆盖（local-save §2.1 settings.reducedMotionOverride） */
export const reducedMotionResolved = (systemPref: boolean, override: boolean | null): boolean =>
  override ?? systemPref;
