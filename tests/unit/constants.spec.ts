/**
 * E1-S01 · 常量契约快照（testing-scaffold §3.5）
 * 断言值 = 美术圣经表值逐字面核对（paperdoll §8.1 工程前置 / room §8.1 零差异）。
 */

import { describe, expect, it } from 'vitest';
import { ANCHORS, ANCHOR_LINES, CANVAS_CENTER_X, CANVAS_H, CANVAS_W } from '../../src/core/constants/anchors';
import { AUDIO_VOLUMES, AUDIO_PLAY } from '../../src/core/constants/audio';
import { DRAWER, FEEDBACK_MS, RESIDENT_ANIMS, SAVE_POLICY, TEXMEM_TIERS, TRYON_ANIM, VIEW_FLIP } from '../../src/core/constants/budget';
import { ROOM_ANCHORS, ROOM_ANCHOR_COUNT, roomAnchorById } from '../../src/core/constants/room-anchors';
import { BACK_LAYERS, FRONT_LAYERS, SLOT_IDS } from '../../src/core/constants/slots';
import { GROUPS } from '../../src/systems/wardrobe/groups';

describe('E1-S01 · 13 槽与层序表（paperdoll §8.1 前置）', () => {
  it('13 槽位代码全集（美术圣经 §4.3）', () => {
    expect(SLOT_IDS).toHaveLength(13);
    expect(SLOT_IDS).toEqual(['BK', 'BODY', 'HAIR_B', 'LEG', 'BTM', 'TOP', 'OUT', 'HAND', 'NECK', 'HAIR_F', 'HEAD', 'FACE', 'FX']);
  });

  it('正面层序 L00→L12 与美术圣经 §4.3 逐槽一致', () => {
    expect(FRONT_LAYERS.map((l) => l.slot)).toEqual([
      'BK', 'BODY', 'HAIR_B', 'LEG', 'BTM', 'TOP', 'OUT', 'HAND', 'NECK', 'HAIR_F', 'HEAD', 'FACE', 'FX',
    ]);
    expect(FRONT_LAYERS.map((l) => l.depth)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('背面层序 B-L00→B-L11 与美术圣经 §4.5 逐槽一致，FACE 不在背视图', () => {
    expect(BACK_LAYERS.map((l) => l.slot)).toEqual([
      'HAIR_F', 'BODY', 'LEG', 'BTM', 'TOP', 'OUT', 'HAND', 'NECK', 'HAIR_B', 'HEAD', 'BK', 'FX',
    ]);
    expect(BACK_LAYERS).toHaveLength(12); // FACE 不渲染 → 12 层
    expect(BACK_LAYERS.some((l) => l.slot === 'FACE')).toBe(false);
  });

  it('正/背两张独立表（paperdoll §5.4 红线：禁一张表加翻转推导）', () => {
    // 结构性差异断言：正面 BK 最远端（L00）↔ 背面 BK 最近端（B-L10），层序镜像不可推导
    expect(FRONT_LAYERS[0].slot).toBe('BK');
    expect(BACK_LAYERS[10].slot).toBe('BK');
    // 两表对同一槽 depth 不等的数量 ≥ 半数（结构独立证据）
    const diffs = FRONT_LAYERS.filter(
      (f) => BACK_LAYERS.find((b) => b.slot === f.slot)?.depth !== f.depth,
    );
    expect(diffs.length).toBeGreaterThanOrEqual(6);
  });
});

describe('E1-S01 · 锚线与挂点（美术圣经 §5.1/§5.2 表值零差异）', () => {
  it('画布 512×1024、中轴 256', () => {
    expect(CANVAS_W).toBe(512);
    expect(CANVAS_H).toBe(1024);
    expect(CANVAS_CENTER_X).toBe(256);
  });

  it('锚线 10 值（§5.1 v0.3 校准表逐值）', () => {
    expect(ANCHOR_LINES).toEqual({
      top: 80, eye: 225, jaw: 335, shoulder: 365, chest: 450,
      waist: 545, hip: 615, knee: 795, ankle: 950, ground: 980,
    });
  });

  it('挂点 4（§5.2 表值）', () => {
    expect(ANCHORS.A_HEAD).toEqual({ x: 256, y: 200 });
    expect(ANCHORS.A_HAND_L).toEqual({ x: 150, y: 520 });
    expect(ANCHORS.A_HAND_R).toEqual({ x: 362, y: 520 });
    expect(ANCHORS.A_WAIST).toEqual({ x: 256, y: 560 });
  });
});

describe('E1-S01 · 房间 21 锚点（美术圣经 §10.5 逐一同名同坐标，room §8.1）', () => {
  it('点位总数 21（room §4：分母固定 21，含次级位）', () => {
    expect(ROOM_ANCHOR_COUNT).toBe(21);
    expect(ROOM_ANCHORS).toHaveLength(21);
  });

  it('地面主点位 9 键坐标零差异（§10.5.1）', () => {
    const expected: Record<string, [number, number]> = {
      'L-01': [224, 1248], 'L-02': [504, 992], 'L-03': [480, 1120],
      'M-01': [568, 1184], 'M-02': [152, 992], 'M-03': [568, 1056], 'M-04': [152, 1120],
      'S-01': [480, 1248], 'S-02': [632, 1248],
    };
    for (const [id, [x, y]] of Object.entries(expected)) {
      expect(roomAnchorById(id)).toMatchObject({ x, y });
    }
  });

  it('次级点位 5 键 + 宿主映射（§10.5.2）', () => {
    const expected: Record<string, [number, number, string]> = {
      'S-T1': [96, 1240, 'L-01'], 'S-T2': [400, 1104, 'L-03'], 'S-T3': [560, 1104, 'L-03'],
      'S-T4': [504, 950, 'L-02'], 'S-T5': [568, 1010, 'M-03'],
    };
    for (const [id, [x, y, host]] of Object.entries(expected)) {
      expect(roomAnchorById(id)).toMatchObject({ x, y, host, kind: 'ST' });
    }
  });

  it('墙面挂点 6 键（§10.5.3）；W-06 窗帘专用位标记', () => {
    const expected: Record<string, [number, number]> = {
      'W-01': [160, 320], 'W-02': [560, 320], 'W-03': [360, 200],
      'W-04': [120, 620], 'W-05': [600, 620], 'W-06': [360, 520],
    };
    for (const [id, [x, y]] of Object.entries(expected)) {
      expect(roomAnchorById(id)).toMatchObject({ x, y, kind: 'W' });
    }
    expect(roomAnchorById('W-06')?.curtainOnly).toBe(true);
  });

  it('地垫位 R-01（§10.5.4）', () => {
    expect(roomAnchorById('R-01')).toMatchObject({ x: 360, y: 1088, kind: 'R' });
  });
});

describe('E1-S01 · 预算/动效/音频常量（cal-04 / art §8 / audio-plan §4）', () => {
  it('三档纹理内存阈值（cal-04 §5 结论表：R-05/06/07）', () => {
    expect(TEXMEM_TIERS).toEqual({ dressSteady: 45, flipPeak: 75, room: 60 });
  });

  it('常驻动效白名单仅 3 项，参数与美术圣经 §8.2 逐值一致', () => {
    expect(RESIDENT_ANIMS).toHaveLength(3);
    const breath = RESIDENT_ANIMS.find((a) => a.id === 'breath')!;
    expect(breath.periodMs).toBe(3000);
    expect(breath.params.scaleAmplitude).toBe(0.01);
    const blink = RESIDENT_ANIMS.find((a) => a.id === 'blink')!;
    expect(blink.periodMs).toBe(8000);
    expect(blink.periodJitterMs).toBe(2000);
    expect(blink.params.closedMs).toBe(120);
    const sway = RESIDENT_ANIMS.find((a) => a.id === 'sway')!;
    expect(sway.periodMs).toBe(4000);
    expect(sway.params.swayPx).toBe(2);
  });

  it('反馈红线（D1-11 / art §8）', () => {
    expect(FEEDBACK_MS.maxOneShot).toBe(300);
    expect(FEEDBACK_MS.reducedMotion).toBe(100);
    expect(FEEDBACK_MS.headShake).toBe(200);
    expect(FEEDBACK_MS.viewFlip).toBe(300);
    expect(FEEDBACK_MS.modeSwitch).toBe(300);
    expect(VIEW_FLIP.maxMs).toBe(300);
    expect(VIEW_FLIP.silhouetteMinScaleX).toBe(0.08);
    expect(TRYON_ANIM).toEqual({ fadeOutMs: 100, fadeInMs: 150, risePercent: 0.02 });
  });

  it('存档/抽屉口径（local-save §2.2 / wardrobe §4）', () => {
    expect(SAVE_POLICY.debounceMs).toBe(500);
    expect(SAVE_POLICY.ledgerMax).toBe(50);
    expect(SAVE_POLICY.looksMax).toBe(9);
    expect(DRAWER.defaultRatio).toBe(0.45);
    expect(DRAWER.expandedRatio).toBe(0.7);
    expect(DRAWER.snapVelocityPxPerMs).toBe(0.5);
    expect(DRAWER.handleHeightPx).toBe(96);
  });

  it('音量表（audio-plan §4.3 提案值）与播放纪律参数（§4.4）', () => {
    expect(AUDIO_VOLUMES).toEqual({ VOL_BGM: 0.55, VOL_SFX_TRYON: 0.35, VOL_SFX_SETCOMPLETE: 0.6, VOL_SFX_CLAIM: 0.5 });
    expect(AUDIO_PLAY.mergeWindowMs).toBe(300);
    expect(AUDIO_PLAY.tryonDetuneCents).toBe(30);
  });
});

describe('E2-S03 · GAP-4 分组契约（ux-spec §2.1 分组表零差异）', () => {
  it('8 组页签，成员槽位与分组表一致', () => {
    expect(GROUPS).toHaveLength(8);
    expect(GROUPS.map((g) => [g.id, g.keys])).toEqual([
      ['G1', ['HAIR_B', 'HAIR_F']],
      ['G2', ['HEAD', 'FACE']],
      ['G3', ['TOP']],
      ['G4', ['BTM']],
      ['G5', ['OUT']],
      ['G6', ['LEG']],
      ['G7', ['NECK', 'HAND_L', 'HAND_R']],
      ['G8', ['BK', 'FX']],
    ]);
  });
});
