/**
 * 引擎引导（ADR-001：Phaser 3.90；architecture §5.1 画幅管线）
 * - 逻辑宽恒 720、renderScale = min(deviceDPR, 2)（ADR-003 §1）
 * - 竖屏锁定遮罩（hud §5.1；桌面调试同理）
 */

import Phaser from 'phaser';
import { createApp } from './core/app';
import { BootScene } from './core/scenes/BootScene';
import { StageScene } from './core/scenes/StageScene';
import { UiScene } from './core/scenes/UiScene';

const renderScale = (): number => {
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  return Math.min(dpr, 2); // DPR 上限钉死 2×（cal-04 §5 定稿）
};

const app = createApp();

const game = new Phaser.Game({
  type: Phaser.AUTO, // WebGL 优先，Canvas2D 自动回退（ADR-001 后果 3）
  parent: 'game',
  backgroundColor: '#f3eff9',
  render: { antialias: true, powerPreference: 'low-power' },
  scale: {
    mode: Phaser.Scale.RESIZE, // 手动坐标系（architecture §5.1：不用 FIT 信箱模式）
    width: window.innerWidth,
    height: window.innerHeight,
    zoom: 1 / renderScale(), // 后备存储 = CSS × min(DPR,2)（ADR-003 方案 C）
  },
  scene: [BootScene, StageScene, UiScene],
  input: { activePointers: 2 },
  audio: { disableWebAudio: false }, // E6 预留（audio-plan §4.1 autoUnlock 默认保留）
});

// AppContext 注入（场景经 registry 读取——Boot 为自动启动场景，不接收 scene data）
game.registry.set('app', app);

// 竖屏遮罩（hud §5.1：横屏全屏提示，不提供横屏适配——D0 口径）
const mask = document.getElementById('rotate-mask')!;
const updateOrientationMask = (): void => {
  const landscape = window.innerWidth > window.innerHeight;
  mask.style.display = landscape ? 'flex' : 'none';
  if (landscape) game.scale.setGameSize(10, 10); // 遮罩期冻结画布更新
  else game.scale.setGameSize(window.innerWidth, window.innerHeight);
};
window.addEventListener('resize', updateOrientationMask);
updateOrientationMask();

// 生命周期（ADR-002 §3）：关页兜底冲刷
window.addEventListener('pagehide', () => app.save.flush());

// dev-only 测试探针（QA 计划 §2.0；R-16 红线：production 零暴露——
// 动态 import 门控：prod 构建分支消除 → 探针模块整块不进产物，静态可证）
if (import.meta.env.DEV) {
  void import('./core/probe').then(({ installWindowProbe }) => installWindowProbe(app, game));
}

export { game };
