/**
 * BootScene · 引擎最小集 + 灰盒资产准备（E1/E2 灰盒策略）
 * 加载屏 = 开场插画位（美术圣经 §7③，ux-spec §5.1 一图两用——资产到位后替换）。
 */

import Phaser from 'phaser';
import { DEFAULT_OWNED_ITEM_IDS } from '../../data/defaults';
import { ensureBodyTexture, ensureGreyTexture } from '../../systems/paperdoll/greybox';
import { AppContext } from '../../core/app';
import { bus } from '../../core/bus';
import { drawLoadingScreen } from './loading';

export class BootScene extends Phaser.Scene {
  private app!: AppContext;

  constructor() {
    super('Boot');
  }

  init(): void {
    this.app = this.game.registry.get('app') as AppContext;
  }

  create(): void {
    drawLoadingScreen(this);
    // 灰盒资产：BODY 双视图基底（D2-01 常驻）+ 默认套装当前视图
    ensureBodyTexture(this, 'front');
    ensureBodyTexture(this, 'back');
    for (const itemId of DEFAULT_OWNED_ITEM_IDS) {
      ensureGreyTexture(this, itemId, 'front');
    }
    // 首启一次性解锁提示（Web Audio 预留位，audio-plan §4.1——E6 接入）
    this.input.once('pointerdown', () => bus.emit('settings:audioChanged', { enabled: this.app.save.getAudioEnabled() }));
    this.scene.start('Stage');
    this.scene.launch('UI');
  }
}
