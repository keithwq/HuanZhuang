/**
 * 音量表常量（E6-S01 验收条款 ⑦，ADR-001 v1.0.1 配套落位）
 * 依据：audio-plan §4.3（提案值，Phase 5 真机校准）；入 constants 纪律（architecture §4 通信纪律 5）。
 */

export const AUDIO_VOLUMES = {
  VOL_BGM: 0.55,
  VOL_SFX_TRYON: 0.35,
  VOL_SFX_SETCOMPLETE: 0.6,
  VOL_SFX_CLAIM: 0.5,
} as const;

/** 播放纪律参数（audio-plan §4.4 P-2/P-4） */
export const AUDIO_PLAY = {
  /** 合并窗：300ms 内同键多次事件只播一次 */
  mergeWindowMs: 300,
  /** S1 随机微变奏 detune ±30 cents */
  tryonDetuneCents: 30,
} as const;
