/**
 * 引导装配（architecture §4 事件链样板 + daily §5.4 首启任务位预留）
 * 职责：SaveService / PaperdollModel / 控制器装配、首启默认套装、生命周期钩子挂接。
 */

import { FEEDBACK_MS } from './constants/budget';
import { DEFAULT_OWNED_ITEM_IDS, DEFAULT_OUTFIT } from '../data/defaults';
import { PaperdollModel } from '../systems/paperdoll/model';
import { reducedMotionResolved, TweenService } from '../systems/paperdoll/tweenSvc';
import { SaveService } from '../systems/save/SaveService';
import { attachTryOnCounting } from '../systems/wardrobe/tryonController';

export interface AppContext {
  save: SaveService;
  model: PaperdollModel;
  tweenSvc: TweenService;
  /** 系统减敏偏好（StageScene/UiScene 消费） */
  reducedMotion: () => boolean;
  dispose: () => void;
}

/** 系统减敏偏好（art §9.4） */
export const systemReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const createApp = (): AppContext => {
  const save = new SaveService();

  // ── 首启默认套装（paperdoll §5.5：无档默认渲染；wardrobe §5.5：13 槽页签全部非空）
  const firstRun = save.getOwned().length === 0 && save.getOutfit().TOP === null;
  if (firstRun) {
    for (const itemId of DEFAULT_OWNED_ITEM_IDS) {
      save.addItem(itemId, 'default_grant');
    }
    for (const [k, v] of Object.entries(DEFAULT_OUTFIT)) {
      save.setOutfitSlot(k, v);
    }
    save.flush(); // 引导完成即落盘（不等防抖）
  }

  // ── 模型：有档读档（渲染项解析含悬空兜底）
  const model = new PaperdollModel(save.getOutfit());

  // ── 减敏判定（系统偏好 + 用户覆盖，local-save §2.1 三态）
  const reducedMotion = () => reducedMotionResolved(systemReducedMotion(), save.getReducedMotionOverride());
  const tweenSvc = new TweenService(reducedMotion);

  // ── 计数挂接（wardrobe §6：以 S01 成功回调为准，单通道不重复计数）
  const detachCounting = attachTryOnCounting(save);

  // ── 生命周期钩子（ADR-002 §3：visibilitychange→hidden 主钩子 + pagehide + beforeunload）
  const detachHooks = save.attachLifecycleHooks(window);

  return {
    save,
    model,
    tweenSvc,
    reducedMotion,
    dispose: () => {
      detachCounting();
      detachHooks();
      save.dispose();
    },
  };
};

/** 反馈时长解析（减敏降 100ms 纯淡切——art §9.4；正常 ≤300ms——art §8） */
export const feedbackDuration = (reduced: boolean, normalMs: number = FEEDBACK_MS.maxOneShot): number =>
  reduced ? FEEDBACK_MS.reducedMotion : Math.min(normalMs, FEEDBACK_MS.maxOneShot);
