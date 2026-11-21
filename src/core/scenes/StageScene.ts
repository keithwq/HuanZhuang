/**
 * StageScene · 舞台：纸娃娃容器（StageScene）⇄ 房间容器（一活）
 * E1-S07/S08 渲染绑定 + E2-S01 手势（拖拽翻转判定区全宽×96px）。
 * 房间侧（S07）Sprint 2 接入；本 Sprint 仅换装舞台。
 */

import Phaser from 'phaser';
import { AppContext } from '../app';
import { bus } from '../bus';
import { CANVAS_CENTER_X } from '../constants/anchors';
import { DRAWER, FEEDBACK_MS, VIEW_FLIP } from '../constants/budget';
import { BACK_LAYERS, FRONT_LAYERS, type OutfitKey } from '../constants/slots';
import { defaultItemForSlot } from '../../data/defaults';
import { clothingById } from '../../data/items';
import { ensureBodyTexture, ensureGreyTexture, releaseGreyTexture, textureKeyOf } from '../../systems/paperdoll/greybox';
import { ViewSwap } from '../../systems/paperdoll/ViewSwap';
import type { OutfitMap } from '../../systems/save/types';

interface LayerSprite extends Phaser.GameObjects.Image {
  slotKey: OutfitKey;
}

export class StageScene extends Phaser.Scene {
  private app!: AppContext;
  private layers = new Map<OutfitKey, LayerSprite>();
  private silhouetteWrap!: Phaser.GameObjects.Container;
  private viewSwap!: ViewSwap;
  private flipTween: Phaser.Tweens.Tween | null = null;

  constructor() {
    super('Stage');
  }

  init(): void {
    this.app = this.game.registry.get('app') as AppContext;
  }

  create(): void {
    const { model, save, tweenSvc } = this.app;
    this.cameras.main.setBackgroundColor('#f3eff9');
    this.silhouetteWrap = this.add.container(0, 0);

    // 13 层固定 depth（正/背共用层位：depth 按当前视图表解析）
    for (const [key] of Object.entries(model.getOutfitSnapshot())) {
      const slotKey = key as OutfitKey;
      const img = this.add.image(CANVAS_CENTER_X, 0, '__DEFAULT') as LayerSprite;
      img.slotKey = slotKey;
      img.setOrigin(0.5, 0);
      this.silhouetteWrap.add(img);
      this.layers.set(slotKey, img);
    }

    // 初始渲染
    this.applyRender(model.getOutfitSnapshot());

    // tryOn 事件驱动换层 + 换装确认动效（≤300ms 可打断）
    bus.on('tryon:done', () => {
      this.applyRender(this.app.model.getOutfitSnapshot());
      this.playTryonConfirm();
    });

    // 造型回穿：静默批量落位后**单次**焕新动效（E3-S02，look-save §2.5 防 13 连播）
    bus.on('look:applied', () => {
      this.applyRender(this.app.model.getOutfitSnapshot());
      this.playTryonConfirm(); // 焕新 = 换装确认动效全身版（150ms 淡入 + 2% 上浮，总 ≤300ms）
    });

    // 正/背切换状态机（E1-S08）
    this.viewSwap = new ViewSwap(
      {
        preload: (view) => {
          this.preloadView(view);
          // 灰盒同步生成即完成；真实资产阶段此调用由 Phaser loader complete 回调接管（ADR-003 §3 懒加载窗口）
          this.viewSwap.markTexturesReady();
        },
        applyView: (view) => {
          this.app.model.setView(view); // 模型视图态同步（renderItems 按当前视图层序表解析）
          this.applyRender(this.app.model.getOutfitSnapshot());
        },
        onComplete: () => this.unloadOldView(),
        onLateComplete: (view) => {
          this.app.model.setView(view);
          this.applyRender(this.app.model.getOutfitSnapshot());
        },
        onSilhouette: (sx) => this.setSilhouette(sx),
      },
      this.app.reducedMotion(),
    );

    // 拖拽翻转手势（paperdoll §2.2 路径 A：全宽 × 96px 判定区）——经 bus 事件统一入口
    // （探针 flip_start 双路径共用口径，QA §2.2）
    const zoneY = this.scale.height * 0.25;
    const zone = this.add
      .zone(0, 0, this.scale.width, DRAWER.handleHeightPx)
      .setOrigin(0, 0)
      .setPosition(0, zoneY)
      .setInteractive({ useHandCursor: true });
    let dragStartX = 0;
    zone.on('pointerdown', (p: Phaser.Input.Pointer) => {
      dragStartX = p.x;
    });
    zone.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (Math.abs(p.x - dragStartX) > 40) {
        const target = p.x < dragStartX ? 'back' : 'front'; // 左拖→背面
        bus.emit('view:flipRequest', { target });
      }
    });

    // 帧循环：ViewSwap 时钟推进
    this.events.on(Phaser.Scenes.Events.UPDATE, (_: unknown, delta: number) => {
      this.viewSwap.advance(delta);
    });

    // 转身按钮路径（paperdoll §2.2 路径 B，§9.3 触控冗余）——事件由 UiScene 转发
    bus.on('view:flipRequest', (p: { target: 'front' | 'back' }) => this.requestFlip(p.target));

    void save;
    void tweenSvc;
    void FRONT_LAYERS;
    void BACK_LAYERS;
    void FEEDBACK_MS;
    void VIEW_FLIP;
  }

  /** 翻转请求（双路径共用） */
  private requestFlip(target: 'front' | 'back'): void {
    this.viewSwap.request(target);
  }

  /** 渲染项解析 → 贴图挂层（含连衣裙遮蔽 visible、悬空兜底、BODY 基底） */
  private applyRender(outfit: OutfitMap): void {
    const view = this.app.model.getView();
    const items = this.app.model.renderItems();
    for (const r of items) {
      const sprite = this.layers.get(r.key);
      if (!sprite) continue;
      const itemId = r.itemId ?? defaultItemForSlot(r.key);
      if (r.key === 'BODY') {
        sprite.setTexture(ensureBodyTexture(this, view));
      } else if (itemId === null) {
        sprite.setVisible(false);
        continue;
      } else {
        sprite.setTexture(ensureGreyTexture(this, itemId, view));
      }
      sprite.setVisible(r.visible);
      void outfit;
    }
    // 当前视图深度按层序表重排（正/背两表独立，paperdoll §5.4）
    const table = view === 'front' ? FRONT_LAYERS : BACK_LAYERS;
    table.forEach((entry, idx) => {
      const keys: OutfitKey[] = entry.slot === 'HAND' ? ['HAND_L', 'HAND_R'] : [entry.slot as OutfitKey];
      for (const k of keys) {
        this.layers.get(k)?.setDepth(idx);
      }
    });
  }

  /** 预载目标视图（懒加载窗口内，ADR-003 §3） */
  private preloadView(view: 'front' | 'back'): void {
    for (const r of this.app.model.renderItems()) {
      if (r.key === 'BODY') continue;
      if (r.itemId) ensureGreyTexture(this, r.itemId, view);
    }
    ensureBodyTexture(this, view);
  }

  /** 过渡完成：卸载旧视图纹理集合（R-06 峰值窗口硬上限） */
  private unloadOldView(): void {
    const view = this.app.model.getView();
    const oldView = view === 'front' ? 'back' : 'front';
    for (const r of this.app.model.renderItems()) {
      if (r.key === 'BODY' || !r.itemId) continue;
      const key = textureKeyOf(r.itemId, oldView);
      if (this.textures.exists(key)) releaseGreyTexture(this, key);
    }
  }

  /** 剪影压缩（paperdoll §4 公式——由 ViewSwap 回调驱动） */
  private setSilhouette(scaleX: number): void {
    if (this.flipTween) this.flipTween.remove();
    this.flipTween = this.tweens.add({
      targets: this.silhouetteWrap,
      scaleX: { from: this.silhouetteWrap.scaleX, to: scaleX },
      duration: 60,
      ease: 'Linear',
    });
    if (scaleX === 1) this.silhouetteWrap.setScale(1);
  }

  /** 换装确认动效（art §8.1：淡入 150ms + 2% 上浮落定，总 ≤300ms、可打断） */
  private playTryonConfirm(): void {
    const reduced = this.app.reducedMotion();
    this.silhouetteWrap.setAlpha(0.75);
    this.silhouetteWrap.y = 6;
    this.tweens.killTweensOf(this.silhouetteWrap);
    this.tweens.add({
      targets: this.silhouetteWrap,
      alpha: 1,
      y: 0,
      duration: reduced ? FEEDBACK_MS.reducedMotion : TRYON_CONFIRM_MS,
      ease: 'Sine.easeOut',
    });
  }
}

const TRYON_CONFIRM_MS = 150;
void clothingById;
