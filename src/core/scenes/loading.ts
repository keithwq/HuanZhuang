/**
 * 灰盒加载屏（ux-spec §5.1：连续填充进度条、无百分比、文案「正在整理衣柜…」）
 * 开场插画位（美术圣经 §7 ③）资产到位后替换为真图。
 */

import Phaser from 'phaser';
import { CANVAS_CENTER_X } from '../constants/anchors';

export const LOADING_TEXT = '正在整理衣柜…';

export function drawLoadingScreen(scene: Phaser.Scene): void {
  const W = 720;
  scene.cameras.main.setBackgroundColor('#f3eff9');
  // 插画占位：月亮形全身镜意象的简化图形
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(0xdce2f2, 1);
  g.fillCircle(W / 2, 420, 150);
  g.fillStyle(0x8268c6, 1);
  g.fillCircle(W / 2 + 40, 400, 120);
  g.generateTexture('gz_boot_moon', 400, 300);
  g.destroy();
  scene.add.image(CANVAS_CENTER_X, 440, 'gz_boot_moon');

  scene.add
    .text(CANVAS_CENTER_X, 700, LOADING_TEXT, {
      fontFamily: '"PingFang SC","Noto Sans SC","Microsoft YaHei",sans-serif',
      fontSize: '28px',
      color: '#3a3358',
    })
    .setOrigin(0.5);

  // 星尘填充进度条（连续填充，M1 合规：无 >3 次/秒闪烁）
  const barW = 360;
  const barH = 12;
  const barX = CANVAS_CENTER_X - barW / 2;
  const barY = 780;
  scene.add.rectangle(CANVAS_CENTER_X, barY, barW, barH, 0xdce2f2).setOrigin(0.5);
  const fill = scene.add.rectangle(barX, barY - barH / 2, 4, barH, 0x8268c6).setOrigin(0, 0);
  scene.tweens.add({
    targets: fill,
    width: barW,
    duration: 900,
    ease: 'Sine.easeInOut',
    onComplete: () => fill.destroy(),
  });
}
