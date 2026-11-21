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
import { texmem } from './texmem/accountant';

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

// 热重载/调试/QA 钩子（e2e 消费：tests/e2e/redline-latency.spec.ts；不承载游戏逻辑）
Object.assign(globalThis, {
  __hz: {
    app,
    game,
    texmemKeys: (): string[] => texmem.report().keys,
  },
});

export { game };
