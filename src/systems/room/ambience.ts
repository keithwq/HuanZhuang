/**
 * 氛围光灰盒层（SPEC-0003 CARD-02）。
 * 档位只读 RoomModel.ambienceTier()，也就是存档棘轮。这里不另存一个会下降的档。
 * 升档淡入走 TweenService，不超过 300ms。减敏不排淡入。
 */

import { FEEDBACK_MS } from '../../core/constants/budget';
import type { TweenHandle } from '../paperdoll/tweenSvc';
import { TweenService } from '../paperdoll/tweenSvc';
import type { RoomModel } from './model';

export const AMBIENCE_LAYER_TIERS = [1, 2, 3] as const;
export type AmbienceLayerTier = (typeof AMBIENCE_LAYER_TIERS)[number];

export interface AmbienceLightLayer {
  tier: AmbienceLayerTier;
  graphic: 'greybox';
  alpha: number;
}

export interface AmbienceView {
  /** 与 RoomModel.ambienceTier() 相同。 */
  tier: number;
  fading: boolean;
  layers: readonly AmbienceLightLayer[];
}

const TARGET = 'room-ambience';

/** 落定后的三层。低于等于存档档的层全亮，更高的层关掉。 */
export const settledAmbienceLayers = (tier: number): AmbienceLightLayer[] =>
  AMBIENCE_LAYER_TIERS.map((level) => ({
    tier: level,
    graphic: 'greybox' as const,
    alpha: level <= tier ? 1 : 0,
  }));

export class AmbienceLights {
  /** 已经开始呈现的存档档。只用来避免重复淡入，画面档位仍每次去读棘轮。 */
  private presented = 0;
  private fadingTier = 0;

  constructor(
    private room: RoomModel,
    private isReduced: () => boolean,
    private tween: TweenService,
  ) {}

  view(): AmbienceView {
    const tier = this.room.ambienceTier();
    const handle = this.handle();
    const fading = this.fadingTier === tier && tier > 0 && Boolean(handle?.running);
    const topAlpha = fading && handle ? Math.min(1, handle.elapsed / Math.max(1, handle.durationMs)) : 1;
    return {
      tier,
      fading,
      layers: AMBIENCE_LAYER_TIERS.map((level) => ({
        tier: level,
        graphic: 'greybox' as const,
        alpha: level < tier || (level === tier && tier > 0 && !fading) ? 1 : level === tier && fading ? topAlpha : 0,
      })),
    };
  }

  /** 存档档升高时淡入新的一层。档位没有升高则什么也不做。 */
  sync(): void {
    const tier = this.room.ambienceTier();
    if (tier === this.presented && (tier === 0 || this.fadingTier === tier || this.fadingTier === 0)) return;
    if (tier < this.presented) {
      this.presented = tier;
      this.fadingTier = 0;
      this.tween.killTweensOf(TARGET, 'oneshot');
      return;
    }
    this.presented = tier;
    if (tier === 0 || this.isReduced()) {
      this.fadingTier = 0;
      this.tween.killTweensOf(TARGET, 'oneshot');
      return;
    }
    this.fadingTier = tier;
    this.tween.createOneShot('ambienceIn', TARGET, FEEDBACK_MS.maxOneShot);
  }

  advance(dtMs: number): void {
    const handle = this.handle();
    this.tween.advance(dtMs);
    if (!handle) return;
    if (!handle.running || handle.elapsed >= handle.durationMs) this.fadingTier = 0;
  }

  private handle(): TweenHandle | undefined {
    return this.tween.activeHandles().find((item) => item.target === TARGET);
  }
}
