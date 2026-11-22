/**
 * PKG-02 CARD-01 · 相容且可见的锚点提示（SPEC-0002 AC-04）
 * 点亮集合必须等于 RoomModel.placementTargets，不另写一套相容规则。
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bus } from '../../src/core/bus';
import { FURNITURE_ITEMS } from '../../src/data/furniture';
import { RoomModel } from '../../src/systems/room/model';
import { enterPlacementFromDrawer, readPlacementHints, placeAtHint, requestWithdraw, confirmWithdraw, cancelWithdraw, interruptPlacement } from '../../src/systems/room/placement-ui';
import { readRoomStage } from '../../src/systems/room/stage';
import { SaveService } from '../../src/systems/save/SaveService';
import { SAVE_KEY } from '../../src/systems/save/types';

const furn = (name: string): string => FURNITURE_ITEMS.find((item) => item.furnId.includes(name))!.furnId;

beforeEach(() => {
  window.localStorage.removeItem(SAVE_KEY);
  window.localStorage.removeItem('huanzhuang_save_bak');
  bus.clear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

const sameAsModel = (room: RoomModel): void => {
  const targets = room.placementTargets();
  expect(readPlacementHints(room).anchorIds).toEqual([...targets.vacant, ...targets.occupied]);
};

describe('相容锚点提示（SPEC-0002 CARD-01）', () => {
  it('AC-04 窗帘与非窗帘只点亮各自相容的 W 锚点', () => {
    const svc = new SaveService();
    const curtain = furn('moon_curtain');
    const painting = furn('star_painting');
    svc.addFurniture(curtain);
    svc.addFurniture(painting);
    const room = new RoomModel(svc);

    expect(enterPlacementFromDrawer(room, curtain)).toBe('entered');
    sameAsModel(room);
    expect(readPlacementHints(room).anchorIds).toContain('W-06');
    expect(readPlacementHints(room).anchorIds.every((id) => id === 'W-06')).toBe(true);

    expect(enterPlacementFromDrawer(room, painting)).toBe('switched');
    sameAsModel(room);
    expect(readPlacementHints(room).anchorIds).not.toContain('W-06');
    expect(readPlacementHints(room).anchorIds).toContain('W-01');
  });

  it('宿主空缺时次级位不点亮，宿主在位后与模型查询一致', () => {
    const svc = new SaveService();
    const pillow = furn('star_pillow');
    const wardrobe = furn('arcane_wardrobe');
    svc.addFurniture(pillow);
    svc.addFurniture(wardrobe);
    const room = new RoomModel(svc);

    expect(enterPlacementFromDrawer(room, pillow)).toBe('entered');
    sameAsModel(room);
    expect(readPlacementHints(room).anchorIds).not.toContain('S-T4');

    room.cancelPlacementMode();
    expect(room.place(wardrobe, 'L-02').ok).toBe(true);
    expect(enterPlacementFromDrawer(room, pillow)).toBe('entered');
    sameAsModel(room);
    expect(readPlacementHints(room).anchorIds).toContain('S-T4');
  });

  it('舞台点亮的锚点与 RoomModel 查询结果一致，未摆放时为空', () => {
    const svc = new SaveService();
    const bed = furn('starlight_bed');
    svc.addFurniture(bed);
    const room = new RoomModel(svc);

    const idle = readRoomStage(svc, room);
    expect(idle.hints.active).toBe(false);
    expect(idle.hints.anchorIds).toEqual([]);

    expect(enterPlacementFromDrawer(room, bed)).toBe('entered');
    const stage = readRoomStage(svc, room);
    const targets = room.placementTargets();
    expect(stage.hints.active).toBe(true);
    expect(stage.hints.furnId).toBe(bed);
    expect(stage.hints.anchorIds).toEqual([...targets.vacant, ...targets.occupied]);
  });
});

describe('替换、联动与收回（SPEC-0002 CARD-02）', () => {
  it('AC-01 点已占用的亮锚点：旧件回库存，只产生一条合并 toast', () => {
    const svc = new SaveService();
    const bed = furn('starlight_bed');
    const desk = furn('moonlight_desk');
    svc.addFurniture(bed);
    svc.addFurniture(desk);
    const room = new RoomModel(svc);
    expect(room.place(bed, 'L-01').ok).toBe(true);
    expect(enterPlacementFromDrawer(room, desk)).toBe('entered');

    const before = svc.getPlacement()['L-01'];
    const missed = placeAtHint(room, 'M-01');
    expect(missed.ok).toBe(false);
    expect(missed.toast).toBeNull();
    expect(svc.getPlacement()['L-01']).toBe(before);

    const action = placeAtHint(room, 'L-01');
    expect(action.ok).toBe(true);
    expect(svc.getPlacement()['L-01']).toBe(desk);
    expect(svc.getOwnedFurniture()).toContain(bed);
    expect(action.toast).toEqual({ count: 1 });
  });

  it('AC-02 收回要先确认；取消不改存档，确认后次级件回库存且 toast 合并', () => {
    const svc = new SaveService();
    const wardrobe = furn('arcane_wardrobe');
    const orb = furn('crystal_orb');
    svc.addFurniture(wardrobe);
    svc.addFurniture(orb);
    const room = new RoomModel(svc);
    expect(room.place(wardrobe, 'L-02').ok).toBe(true);
    expect(room.place(orb, 'S-T4').ok).toBe(true);
    const before = svc.getPlacement();

    const prompt = requestWithdraw(svc, 'L-02');
    expect(prompt?.anchorId).toBe('L-02');
    cancelWithdraw(prompt!);
    expect(svc.getPlacement()).toEqual(before);

    const again = requestWithdraw(svc, 'L-02');
    const done = confirmWithdraw(room, again!);
    expect(done.ok).toBe(true);
    expect(done.toast).toEqual({ count: 2 });
    expect(svc.getPlacement()['L-02']).toBeNull();
    expect(svc.getPlacement()['S-T4']).toBeNull();
    expect(svc.getOwnedFurniture()).toContain(wardrobe);
    expect(svc.getOwnedFurniture()).toContain(orb);
  });
});

describe('中断与边界（SPEC-0002 CARD-03）', () => {
  it('AC-03 中断后选中态清空，舞台提示关闭', () => {
    const svc = new SaveService();
    const bed = furn('starlight_bed');
    svc.addFurniture(bed);
    const room = new RoomModel(svc);
    expect(enterPlacementFromDrawer(room, bed)).toBe('entered');
    expect(room.isPlacing()).toBe(bed);

    interruptPlacement(room);
    const stage = readRoomStage(svc, room);
    expect(room.isPlacing()).toBeNull();
    expect(stage.hints.active).toBe(false);
    expect(stage.hints.anchorIds).toEqual([]);
  });

  it('空房间不能进入摆放', () => {
    const room = new RoomModel(new SaveService());
    expect(enterPlacementFromDrawer(room, furn('starlight_bed'))).toBe('cancelled');
    expect(readPlacementHints(room).active).toBe(false);
    expect(readPlacementHints(room).anchorIds).toEqual([]);
  });

  it('该类目点位占满后没有空锚点', () => {
    const svc = new SaveService();
    const bed = furn('starlight_bed');
    const wardrobe = furn('arcane_wardrobe');
    const desk = furn('moonlight_desk');
    const swing = furn('cloud_swing');
    for (const id of [bed, wardrobe, desk, swing]) svc.addFurniture(id);
    const room = new RoomModel(svc);
    expect(room.place(bed, 'L-01').ok).toBe(true);
    expect(room.place(wardrobe, 'L-02').ok).toBe(true);
    expect(room.place(desk, 'L-03').ok).toBe(true);
    expect(enterPlacementFromDrawer(room, swing)).toBe('entered');
    const targets = room.placementTargets();
    expect(targets.vacant).toEqual([]);
    expect(readPlacementHints(room).anchorIds).toEqual([...targets.vacant, ...targets.occupied]);
  });

  it('悬空 itemId 不画上舞台，读取仍然成功', () => {
    const svc = new SaveService();
    svc.setPlacement('L-01', 'HZ_ROOM_NOT_IN_CATALOG');
    const stage = readRoomStage(svc);
    expect(stage.ok).toBe(true);
    expect(stage.graphic).toBe('greybox');
    expect(stage.layers.flatMap((layer) => layer.pieces)).toEqual([]);
  });
});
