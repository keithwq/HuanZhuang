/**
 * PKG-03 · 换装与房间切换、氛围光（SPEC-0003 AC-01 至 AC-04）
 * 时钟走 TweenService。连续切换必须复用同一个房间容器。
 * 氛围光档位只读存档棘轮。
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bus } from '../../src/core/bus';
import { FEEDBACK_MS } from '../../src/core/constants/budget';
import { FURNITURE_ITEMS } from '../../src/data/furniture';
import { DrawerController } from '../../src/systems/hud/DrawerController';
import {
  MODE_TAB_BAR,
  ModeSwitchController,
  singleRoomContainer,
} from '../../src/systems/hud/OverlayManager';
import { AmbienceLights } from '../../src/systems/room/ambience';
import { enterPlacementFromDrawer, readPlacementHints } from '../../src/systems/room/placement-ui';
import { RoomModel } from '../../src/systems/room/model';
import { attachRoomTextureRelease, bindRoomTextureHost, readRoomStage, registerRoomGreyTexture } from '../../src/systems/room/stage';
import { texmem } from '../../src/texmem/accountant';
import { TweenService } from '../../src/systems/paperdoll/tweenSvc';
import { SaveService } from '../../src/systems/save/SaveService';
import { SAVE_KEY } from '../../src/systems/save/types';

const furn = (name: string): string => FURNITURE_ITEMS.find((item) => item.furnId.includes(name))!.furnId;

beforeEach(() => {
  window.localStorage.removeItem(SAVE_KEY);
  window.localStorage.removeItem('huanzhuang_save_bak');
  bus.clear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

const setup = (reduced: boolean) => {
  const save = new SaveService();
  const tween = new TweenService(() => reduced);
  const drawer = new DrawerController(1096, () => {});
  let roomBox: { id: number } | null = null;
  let created = 0;
  const mountRoom = (): void => {
    roomBox = singleRoomContainer(roomBox, () => ({ id: ++created }));
  };
  mountRoom();
  const modes = new ModeSwitchController(save, () => reduced, tween);
  modes.setRoomMounter(mountRoom);
  modes.attachDrawer(drawer);
  return { save, tween, drawer, modes, created: () => created, roomBox: () => roomBox };
};

describe('底部页签（SPEC-0003 CARD-01）', () => {
  it('房间可进入换装与房间，商店和成就仍不可用', () => {
    expect(MODE_TAB_BAR.find((tab) => tab.label === '换装')).toMatchObject({ enabled: true, mode: 'dress' });
    expect(MODE_TAB_BAR.find((tab) => tab.label === '房间')).toMatchObject({ enabled: true, mode: 'room' });
    expect(MODE_TAB_BAR.filter((tab) => !tab.enabled).map((tab) => tab.label)).toEqual(['商店', '成就']);
  });
});

describe('AC-01 换装与房间互斥', () => {
  it('点房间再点回换装后只剩一个舞台，抽屉回到默认档', () => {
    const { modes, drawer, tween, created } = setup(false);
    drawer.toggle();
    expect(drawer.current().tier).toBe('expanded');

    expect(modes.tap('room')).toBe(true);
    expect(modes.isTransitioning()).toBe(true);
    expect(modes.current()).toBe('dress');
    expect(modes.frame().fading).toBe(true);
    expect(modes.frame().to).toBe('room');
    const handle = tween.activeHandles().find((item) => item.animId === 'modeSwitch');
    expect(handle?.durationMs).toBe(FEEDBACK_MS.modeSwitch);
    expect(handle!.durationMs).toBeLessThanOrEqual(300);

    modes.advance(299);
    expect(modes.current()).toBe('dress');
    modes.advance(1);
    expect(modes.current()).toBe('room');
    expect(modes.frame().fading).toBe(false);
    expect(modes.frame().visible).toBe('room');
    expect(drawer.current().tier).toBe('default');

    drawer.toggle();
    expect(modes.tap('dress')).toBe(true);
    modes.advance(300);
    expect(modes.current()).toBe('dress');
    expect(modes.frame().visible).toBe('dress');
    expect(modes.frame().fading).toBe(false);
    expect(drawer.current().tier).toBe('default');
    expect(created()).toBe(1);
  });

  it('连续快速切换不会堆出第二个房间容器', () => {
    const { modes, created } = setup(false);
    modes.tap('room');
    modes.tap('dress');
    modes.tap('room');
    modes.tap('dress');
    expect(modes.isTransitioning()).toBe(false);
    expect(modes.current()).toBe('dress');
    expect(modes.frame().visible).toBe('dress');
    expect(modes.frame().fading).toBe(false);
    expect(created()).toBe(1);
  });

  it('减敏时直接落定，不再排一条过渡', () => {
    const { modes, drawer, tween } = setup(true);
    drawer.toggle();
    expect(modes.tap('room')).toBe(true);
    expect(modes.current()).toBe('room');
    expect(modes.isTransitioning()).toBe(false);
    expect(modes.frame().fading).toBe(false);
    expect(drawer.current().tier).toBe('default');
    expect(tween.activeHandles().some((item) => item.target === 'mode-stage' && item.running)).toBe(false);
  });
});

describe('AC-02 切换取消摆放', () => {
  it('摆放进行中切回换装后选中态没有残留', () => {
    const { modes, save, drawer } = setup(false);
    const bed = furn('starlight_bed');
    save.addFurniture(bed);
    modes.tap('room');
    modes.advance(300);
    expect(enterPlacementFromDrawer(modes.roomModel(), bed)).toBe('entered');
    expect(modes.roomModel().isPlacing()).toBe(bed);

    expect(modes.tap('room')).toBe(false);
    expect(modes.roomModel().isPlacing()).toBe(bed);

    drawer.toggle();
    expect(modes.tap('dress')).toBe(true);
    expect(modes.roomModel().isPlacing()).toBeNull();
    expect(readPlacementHints(modes.roomModel()).active).toBe(false);
    expect(readPlacementHints(modes.roomModel()).anchorIds).toEqual([]);

    modes.advance(300);
    expect(modes.current()).toBe('dress');
    expect(modes.roomModel().isPlacing()).toBeNull();
    expect(readRoomStage(save, modes.roomModel()).hints).toEqual({
      active: false,
      furnId: null,
      anchorIds: [],
    });
    expect(drawer.current().tier).toBe('default');
  });
});

const placeFive = (room: RoomModel, save: SaveService): void => {
  const plan: Array<[string, string]> = [
    ['L-01', furn('starlight_bed')],
    ['L-02', furn('arcane_wardrobe')],
    ['L-03', furn('moonlight_desk')],
    ['M-01', furn('owl_perch')],
    ['M-02', furn('moon_lamp')],
  ];
  for (const [anchorId, furnId] of plan) {
    save.addFurniture(furnId);
    expect(room.place(furnId, anchorId).ok).toBe(true);
  }
};

describe('AC-03 氛围光只升不降', () => {
  it('跨过 5 件进入档 1，撤到 4 件仍保持档 1', () => {
    const save = new SaveService();
    const room = new RoomModel(save);
    const lights = new AmbienceLights(room, () => false, new TweenService());
    expect(lights.view().tier).toBe(0);
    expect(lights.view().layers.map((layer) => layer.alpha)).toEqual([0, 0, 0]);

    placeFive(room, save);
    lights.sync();
    lights.advance(300);
    expect(room.occupied()).toBe(5);
    expect(room.ambienceTier()).toBe(1);
    expect(lights.view().tier).toBe(save.getAmbienceLevel());
    expect(lights.view().fading).toBe(false);
    expect(lights.view().layers).toEqual([
      { tier: 1, graphic: 'greybox', alpha: 1 },
      { tier: 2, graphic: 'greybox', alpha: 0 },
      { tier: 3, graphic: 'greybox', alpha: 0 },
    ]);
    expect(readRoomStage(save, room).lights.map((layer) => layer.alpha)).toEqual([1, 0, 0]);

    expect(room.withdraw('M-02').ok).toBe(true);
    lights.sync();
    expect(room.occupied()).toBe(4);
    expect(save.getAmbienceLevel()).toBe(1);
    expect(lights.view().tier).toBe(1);
    expect(lights.view().layers.find((layer) => layer.tier === 1)?.alpha).toBe(1);
    expect(readRoomStage(save, room).lights.map((layer) => layer.alpha)).toEqual([1, 0, 0]);
  });
});

describe('AC-04 减敏时氛围光直切', () => {
  it('升档没有淡入，直接到目标档', () => {
    const save = new SaveService();
    const room = new RoomModel(save);
    const tween = new TweenService(() => true);
    const lights = new AmbienceLights(room, () => true, tween);
    placeFive(room, save);
    lights.sync();
    expect(lights.view().fading).toBe(false);
    expect(lights.view().tier).toBe(1);
    expect(lights.view().layers[0]?.alpha).toBe(1);
    expect(tween.activeHandles().some((item) => item.target === 'room-ambience' && item.running)).toBe(false);
  });

  it('未开减敏时淡入不超过 300ms，且不是循环', () => {
    const save = new SaveService();
    const room = new RoomModel(save);
    const tween = new TweenService();
    const lights = new AmbienceLights(room, () => false, tween);
    placeFive(room, save);
    lights.sync();
    const handle = tween.activeHandles().find((item) => item.target === 'room-ambience');
    expect(handle?.kind).toBe('oneshot');
    expect(handle!.durationMs).toBeLessThanOrEqual(300);
    lights.advance(299);
    expect(lights.view().fading).toBe(true);
    expect(lights.view().layers[0]!.alpha).toBeLessThan(1);
    lights.advance(1);
    expect(lights.view().fading).toBe(false);
    expect(lights.view().layers[0]?.alpha).toBe(1);
    expect(tween.activeHandles().some((item) => item.kind === 'resident')).toBe(false);
  });
});

describe('离开房间释放房间灰盒纹理（SPEC-0003 CARD-03）', () => {
  it('切回换装才释放本舞台登记的键，商店页签仍然不可用', () => {
    attachRoomTextureRelease();
    const removed: string[] = [];
    bindRoomTextureHost({
      textures: {
        exists: (key) => key === 'gz_room_bed',
        remove: (key) => removed.push(key),
      },
    });
    registerRoomGreyTexture('gz_room_bed');
    texmem.register('gz_room_bed', 8, 8);
    bus.emit('hud:modeChange', { mode: 'room' });
    expect(texmem.has('gz_room_bed')).toBe(true);
    expect(removed).toEqual([]);

    bus.emit('hud:modeChange', { mode: 'dress' });
    expect(removed).toEqual(['gz_room_bed']);
    expect(texmem.has('gz_room_bed')).toBe(false);
    expect(MODE_TAB_BAR.find((tab) => tab.label === '商店')?.enabled).toBe(false);
  });
});
