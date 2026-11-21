/**
 * 灰盒纹理生成器（E1-S07/E2 美术资产未到位的占位策略，epics/README §4）
 * 美术资产到位后由 PreloadScene 真实贴图替换；本文件全部标注 ⛧ 补测面。
 * 纪律：纹理进出必经 texmem 登记（ADR-003 §6 红线——本模块是场景层唯一豁免外的生成入口，
 * 生成即登记，销毁即销记）。
 */

import Phaser from 'phaser';
import { texmem } from '../../texmem/accountant';
import { clothingById } from '../../data/items';

/** 灰盒纹理尺寸（统一小尺寸控制占位内存：13 槽单视图 ≈6.5MB） */
const GREY_W = 256;
const GREY_H = 512;

/** 槽位灰盒配色（雾光底系中性色 + 系列色相微调） */
const SLOT_HUES: Record<string, number> = {
  BK: 265, BODY: 35, HAIR_B: 30, LEG: 220, BTM: 200, TOP: 268,
  OUT: 288, HAND: 45, NECK: 320, HAIR_F: 25, HEAD: 300, FACE: 0, FX: 255,
};

const seriesHueShift = (series: string): number => (series.charCodeAt(0) % 24) - 12;

export const textureKeyOf = (itemId: string, view: 'front' | 'back'): string => {
  void clothingById;
  return `gz_${itemId}_${view}`;
};

/**
 * 确保灰盒纹理存在（幂等）。返回 texture key。
 * 视图差异：背面叠加暗化条带 + 'BACK' 标记（灰盒视觉可辨）。
 */
export const ensureGreyTexture = (
  scene: Phaser.Scene,
  itemId: string,
  view: 'front' | 'back',
): string => {
  const key = textureKeyOf(itemId, view);
  if (scene.textures.exists(key)) return key;
  const item = clothingById(itemId);
  const slot = item?.slot ?? 'TOP';
  const hue = (SLOT_HUES[slot] ?? 240) + seriesHueShift(item?.series ?? 'x');
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const color = Phaser.Display.Color.HSLToColor(hue / 360, 0.38, view === 'front' ? 0.72 : 0.6).color;
  g.fillStyle(color, 1);
  g.fillRoundedRect(8, 8, GREY_W - 16, GREY_H - 16, 24);
  g.lineStyle(3, 0x3a3358, 0.9);
  g.strokeRoundedRect(8, 8, GREY_W - 16, GREY_H - 16, 24);
  if (view === 'back') {
    g.fillStyle(0x3a3358, 0.18);
    g.fillRect(8, 8, GREY_W - 16, 56);
  }
  g.generateTexture(key, GREY_W, GREY_H);
  g.destroy();
  // 纹理进出唯一登记（ADR-003 §6：生成即登记）
  texmem.register(key, GREY_W, GREY_H);
  return key;
};

/** 卸载视图纹理集合（ViewSwap onComplete 回调挂接点） */
export const releaseGreyTexture = (scene: Phaser.Scene, key: string): void => {
  if (!scene.textures.exists(key)) {
    // 已不在缓存——可能被场景切换清理；销记仍要执行（配对纪律）
    try {
      texmem.release(key);
    } catch {
      /* 未登记即不在缓存，忽略 */
    }
    return;
  }
  scene.textures.remove(key);
  texmem.release(key);
};

/** BODY 基底灰盒（不可卸遮蔽层，美术圣经 §4.3 L01） */
export const ensureBodyTexture = (scene: Phaser.Scene, view: 'front' | 'back'): string => {
  const key = `gz_BODY_${view}`;
  if (scene.textures.exists(key)) return key;
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  const color = Phaser.Display.Color.HSLToColor(32 / 360, 0.5, view === 'front' ? 0.82 : 0.7).color;
  g.fillStyle(color, 1);
  g.fillRoundedRect(96, 40, GREY_W - 192, 380, 40); // 躯干
  g.fillCircle(GREY_W / 2, 60, 48); // 头
  if (view === 'front') {
    g.fillStyle(0x3a3358, 0.85);
    g.fillCircle(GREY_W / 2 - 16, 56, 4);
    g.fillCircle(GREY_W / 2 + 16, 56, 4);
  }
  g.generateTexture(key, GREY_W, GREY_H);
  g.destroy();
  texmem.register(key, GREY_W, GREY_H);
  return key;
};
