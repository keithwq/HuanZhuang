/**
 * PKG-01 CARD-01 · 房间舞台层与已摆家具（SPEC-0001 AC-01/AC-02/AC-04 的本卡切片）
 * 坐标只对照 ROOM_ANCHORS，不在测试里写第二套数字。
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bus } from '../../src/core/bus';
import { ROOM_ANCHORS, roomAnchorById } from '../../src/core/constants/room-anchors';
import { FURNITURE_ITEMS } from '../../src/data/furniture';
import { readFurnitureDrawer } from '../../src/systems/room/drawer';
import { readRoomStage } from '../../src/systems/room/stage';
import { RoomModel } from '../../src/systems/room/model';
import { SaveService } from '../../src/systems/save/SaveService';
import { SAVE_KEY } from '../../src/systems/save/types';

const furn = (name: string): string => FURNITURE_ITEMS.find((f) => f.furnId.includes(name))!.furnId;
const bed = () => furn('starlight_bed');
const wardrobeF = () => furn('arcane_wardrobe');
const desk = () => furn('moonlight_desk');
const lamp = () => furn('moon_lamp');
const painting = () => furn('star_painting');
const curtain = () => furn('moon_curtain');
const rug = () => furn('star_map_rug');

beforeEach(() => {
  window.localStorage.removeItem(SAVE_KEY);
  window.localStorage.removeItem('huanzhuang_save_bak');
  bus.clear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('房间舞台已摆家具（SPEC-0001 CARD-01）', () => {
  it('两件不同锚点的家具给出绘制顺序所用的 Y', () => {
    const svc = new SaveService();
    const room = new RoomModel(svc);
    expect(room.place(bed(), 'L-01').ok).toBe(true);
    expect(room.place(wardrobeF(), 'L-02').ok).toBe(true);

    const stage = readRoomStage(svc);
    const furniture = stage.layers.find((layer) => layer.name === 'furniture');
    expect(furniture).toBeDefined();

    const yOf = (anchorId: string): number => {
      const piece = furniture!.pieces.find((item) => item.anchorId === anchorId);
      expect(piece).toBeDefined();
      expect(piece!.y).toBe(roomAnchorById(anchorId)!.y);
      expect(piece!.x).toBe(roomAnchorById(anchorId)!.x);
      return piece!.y;
    };

    const frontY = yOf('L-01');
    const backY = yOf('L-02');
    expect(frontY).not.toBe(backY);

    const ordered = furniture!.pieces.map((item) => item.y);
    expect(ordered).toEqual([...ordered].sort((a, b) => a - b));
    expect(ordered.indexOf(backY)).toBeLessThan(ordered.indexOf(frontY));
  });

  it('锚点列表与 ROOM_ANCHORS 同一份，长度不另写', () => {
    const stage = readRoomStage(new SaveService());
    expect(stage.anchors).toBe(ROOM_ANCHORS);
    expect(stage.anchors).toHaveLength(ROOM_ANCHORS.length);
  });

  it('缺图时仍返回成功的灰盒状态', () => {
    const svc = new SaveService();
    const room = new RoomModel(svc);
    expect(room.place(bed(), 'L-01').ok).toBe(true);

    const stage = readRoomStage(svc);
    expect(stage.ok).toBe(true);
    expect(stage.graphic).toBe('greybox');
    expect(stage.texture).toBe('missing');
    expect(stage.layers.map((layer) => layer.name)).toEqual(['wall', 'floor', 'furniture', 'gauze']);
    expect(stage.layers.every((layer) => layer.graphic === 'greybox')).toBe(true);

    const placed = stage.layers.flatMap((layer) => layer.pieces);
    expect(placed).toHaveLength(1);
    expect(placed[0]?.graphic).toBe('greybox');
    expect(placed[0]?.anchorId).toBe('L-01');
  });

  it('已摆件按墙、地面、家具、纱幔分层', () => {
    const svc = new SaveService();
    const room = new RoomModel(svc);
    expect(room.place(painting(), 'W-01').ok).toBe(true);
    expect(room.place(rug(), 'R-01').ok).toBe(true);
    expect(room.place(bed(), 'L-01').ok).toBe(true);
    expect(room.place(curtain(), 'W-06').ok).toBe(true);

    const stage = readRoomStage(svc);
    const ids = (name: string): string[] => {
      const layer = stage.layers.find((item) => item.name === name);
      expect(layer).toBeDefined();
      return layer!.pieces.map((item) => item.anchorId);
    };

    expect(ids('wall')).toEqual(['W-01']);
    expect(ids('floor')).toEqual(['R-01']);
    expect(ids('furniture')).toEqual(['L-01']);
    expect(ids('gauze')).toEqual(['W-06']);
  });
});

describe('家具抽屉页签（SPEC-0001 CARD-02）', () => {
  it('同时拥有不同类目时，每页只有该类目，未拥有的件不出现', () => {
    const svc = new SaveService();
    svc.addFurniture(bed());
    svc.addFurniture(painting());

    const pageL = readFurnitureDrawer(svc, 'L');
    const pageW = readFurnitureDrawer(svc, 'W');

    expect(pageL.tab).toBe('L');
    expect(pageL.items.map((item) => item.furnId)).toEqual([bed()]);
    expect(pageL.items.every((item) => item.category === 'L')).toBe(true);
    expect(pageW.tab).toBe('W');
    expect(pageW.items.map((item) => item.furnId)).toEqual([painting()]);
    expect(pageW.items.every((item) => item.category === 'W')).toBe(true);
    expect(pageL.items.some((item) => item.furnId === desk())).toBe(false);
  });

  it('空类目返回空列表，不抛错', () => {
    const ownedL = new SaveService();
    ownedL.addFurniture(bed());
    expect(readFurnitureDrawer(ownedL, 'M').items).toEqual([]);
    expect(readFurnitureDrawer(ownedL, 'S').items).toEqual([]);
    expect(readFurnitureDrawer(ownedL, 'R').items).toEqual([]);
    expect(readFurnitureDrawer(new SaveService(), 'L').items).toEqual([]);
  });

  it('切换页签不改变舞台上已经摆出的件', () => {
    const svc = new SaveService();
    svc.addFurniture(bed());
    svc.addFurniture(lamp());
    const room = new RoomModel(svc);
    expect(room.place(bed(), 'L-01').ok).toBe(true);

    const before = readRoomStage(svc);
    const pageM = readFurnitureDrawer(svc, 'M');
    const after = readRoomStage(svc);

    expect(pageM.items.map((item) => item.furnId)).toEqual([lamp()]);
    expect(pageM.items.every((item) => item.category === 'M')).toBe(true);
    expect(after.layers).toEqual(before.layers);
    expect(after.drawer.tab).toBe(before.drawer.tab);
    expect(after.drawer.items.map((item) => item.furnId)).toEqual([bed()]);
  });
});

describe('SPEC-0001 验收（CARD-03）', () => {
  const nineFloor: Array<[string, () => string]> = [
    ['L-01', bed],
    ['L-02', wardrobeF],
    ['L-03', desk],
    ['M-01', () => furn('owl_perch')],
    ['M-02', lamp],
    ['M-03', () => furn('cloud_chair')],
    ['M-04', () => furn('startrack_rocker')],
    ['S-01', () => furn('star_plant')],
    ['S-02', () => furn('book_stack')],
  ];

  const placeSet = (): SaveService => {
    const svc = new SaveService();
    const room = new RoomModel(svc);
    for (const [anchorId, id] of nineFloor) {
      expect(room.place(id(), anchorId).ok).toBe(true);
    }
    expect(room.place(rug(), 'R-01').ok).toBe(true);
    expect(room.place(painting(), 'W-01').ok).toBe(true);
    return svc;
  };

  it('AC-01 九件地面家具按 base-y 升序，较大 Y 画在更前', () => {
    const stage = readRoomStage(placeSet());
    const pieces = stage.layers.find((layer) => layer.name === 'furniture')!.pieces;
    expect(pieces.length).toBeGreaterThanOrEqual(9);
    const ys = pieces.map((item) => item.y);
    expect(ys).toEqual([...ys].sort((a, b) => a - b));
    const back = pieces[0]!;
    const front = pieces[pieces.length - 1]!;
    expect(back.y).toBe(roomAnchorById(back.anchorId)!.y);
    expect(front.y).toBe(roomAnchorById(front.anchorId)!.y);
    expect(back.y).toBeLessThan(front.y);
  });

  it('AC-01 地垫画在地面件之下，挂件不跟地面件一起排序', () => {
    const stage = readRoomStage(placeSet());
    const layerIndex = (name: string): number => stage.layers.findIndex((layer) => layer.name === name);
    expect(layerIndex('floor')).toBeLessThan(layerIndex('furniture'));

    const floorIds = stage.layers.find((layer) => layer.name === 'floor')!.pieces.map((item) => item.anchorId);
    const wallIds = stage.layers.find((layer) => layer.name === 'wall')!.pieces.map((item) => item.anchorId);
    const furnitureIds = stage.layers.find((layer) => layer.name === 'furniture')!.pieces.map((item) => item.anchorId);

    expect(floorIds).toEqual(['R-01']);
    expect(wallIds).toEqual(['W-01']);
    expect(furnitureIds).not.toContain('R-01');
    expect(furnitureIds).not.toContain('W-01');
  });

  it('AC-02 锚点键名与坐标只来自 ROOM_ANCHORS', () => {
    const stage = readRoomStage(placeSet());
    expect(stage.anchors).toBe(ROOM_ANCHORS);
    expect(stage.anchors).toHaveLength(ROOM_ANCHORS.length);
    expect(stage.anchors.map((anchor) => anchor.id)).toEqual(ROOM_ANCHORS.map((anchor) => anchor.id));
    for (const layer of stage.layers) {
      for (const piece of layer.pieces) {
        const anchor = roomAnchorById(piece.anchorId);
        expect(anchor).toBeDefined();
        expect(piece.x).toBe(anchor!.x);
        expect(piece.y).toBe(anchor!.y);
      }
    }
  });

  it('AC-03 每个抽屉页签只有该类目里已拥有的件', () => {
    const svc = new SaveService();
    svc.addFurniture(bed());
    svc.addFurniture(painting());
    expect(readFurnitureDrawer(svc, 'L').items.map((item) => item.furnId)).toEqual([bed()]);
    expect(readFurnitureDrawer(svc, 'W').items.map((item) => item.furnId)).toEqual([painting()]);
    expect(readFurnitureDrawer(svc, 'M').items).toEqual([]);
    expect(readFurnitureDrawer(svc, 'S').items).toEqual([]);
    expect(readFurnitureDrawer(svc, 'R').items).toEqual([]);
  });

  it('AC-04 没有房间图时灰盒仍然成功', () => {
    const stage = readRoomStage(placeSet());
    expect(stage.ok).toBe(true);
    expect(stage.graphic).toBe('greybox');
    expect(stage.texture).toBe('missing');
    expect(stage.layers.map((layer) => layer.name)).toEqual(['wall', 'floor', 'furniture', 'gauze']);
    for (const layer of stage.layers) {
      expect(layer.graphic).toBe('greybox');
      for (const piece of layer.pieces) expect(piece.graphic).toBe('greybox');
    }
  });
});
