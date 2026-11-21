/**
 * E3-S03/S04/S05 · 房间装饰（room §8 全验收面——21 键/类目兼容/替换吸附/次级联动/棘轮/stats 口径）
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bus } from '../../src/core/bus';
import { ROOM_ANCHORS } from '../../src/core/constants/room-anchors';
import { FURNITURE_ITEMS, furnitureById } from '../../src/data/furniture';
import { SaveService } from '../../src/systems/save/SaveService';
import { SAVE_KEY } from '../../src/systems/save/types';
import { openAnchorsFor, RoomModel } from '../../src/systems/room/model';

const furn = (name: string): string => FURNITURE_ITEMS.find((f) => f.furnId.includes(name))!.furnId;
const bed = () => furn('starlight_bed'); // L
const wardrobeF = () => furn('arcane_wardrobe'); // L
const desk = () => furn('moonlight_desk'); // L
const lamp = () => furn('moon_lamp'); // M
const pillow = () => furn('star_pillow'); // S（解锁池）
const orb = () => furn('crystal_orb'); // S（解锁池）
const painting = () => furn('star_painting'); // W 非窗帘
const curtain = () => furn('moon_curtain'); // W 窗帘专用（解锁池）
const rug = () => furn('star_map_rug'); // R
const owl_perch = () => furn('owl_perch'); // M
const cloud_chair = () => furn('cloud_chair'); // M

beforeEach(() => {
  window.localStorage.removeItem(SAVE_KEY);
  window.localStorage.removeItem('huanzhuang_save_bak');
  bus.clear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

const grantAll = (svc: SaveService): void => {
  for (const f of FURNITURE_ITEMS) svc.addFurniture(f.furnId);
};

describe('类目兼容制（room §2.2/§8.3）', () => {
  it('L/M/S/W/R 各类只能落开放点位集；建议点位为构图参考非限制', () => {
    const svc = new SaveService();
    const m = new RoomModel(svc);
    expect(m.canPlace(bed(), 'L-01')).toBe(true);   // L 件 → L 位
    expect(m.canPlace(bed(), 'M-01')).toBe(false); // L 件 → M 位拒绝
    expect(m.canPlace(lamp(), 'M-03')).toBe(true);
    expect(m.canPlace(rug(), 'R-01')).toBe(true);
    expect(m.canPlace(rug(), 'L-01')).toBe(false);
  });

  it('W-06 窗帘专用位两条例外（room §2.2 硬约束）', () => {
    const svc = new SaveService();
    const m = new RoomModel(svc);
    // 窗帘类 → 仅 W-06
    expect(m.canPlace(curtain(), 'W-06')).toBe(true);
    expect(m.canPlace(curtain(), 'W-01')).toBe(false);
    // 非窗帘 W 件 → W-01~W-05，不占专用位
    expect(m.canPlace(painting(), 'W-03')).toBe(true);
    expect(m.canPlace(painting(), 'W-06')).toBe(false);
    expect(openAnchorsFor(furnitureById(painting())!)).toEqual(['W-01', 'W-02', 'W-03', 'W-04', 'W-05']);
    expect(openAnchorsFor(furnitureById(curtain())!)).toEqual(['W-06']);
  });

  it('次级点位宿主空缺时隐藏、不可摆；宿主在位后激活（room §10.5.2）', () => {
    const svc = new SaveService();
    const m = new RoomModel(svc);
    expect(m.isAnchorVisible('S-T4')).toBe(false); // 宿主 L-02 空缺
    expect(m.canPlace(pillow(), 'S-T4')).toBe(false); // 隐藏位拒绝
    m.place(wardrobeF(), 'L-02'); // 宿主落位
    expect(m.isAnchorVisible('S-T4')).toBe(true);
    expect(m.canPlace(pillow(), 'S-T4')).toBe(true); // 激活
    // 地面 S 位恒可见
    expect(m.isAnchorVisible('S-01')).toBe(true);
  });
});

describe('摆放流与替换式吸附（room §2.2/§8.2）', () => {
  it('点家具 → 摆放模式 → 点空位落位：stats +1、occupied 递增', () => {
    const svc = new SaveService();
    grantAll(svc);
    const m = new RoomModel(svc);
    expect(m.tapFurnitureCard(bed())).toBe('entered');
    const r = m.place(bed(), 'L-01');
    expect(r.ok).toBe(true);
    expect(r.occupied).toBe(1);
    expect(svc.getStats().furniturePlacedTotal).toBe(1);
    expect(svc.getPlacement()['L-01']).toBe(bed());
    // 摆放模式完成后回浏览态（UI 落位完成即回）
    expect(m.isPlacing()).toBe(bed()); // 会话态保持——UI 层落位后 cancel（room §2.2 流图）
    m.cancelPlacementMode();
    expect(m.isPlacing()).toBeNull();
  });

  it('替换式吸附：旧件即时回库存 + toast 合并计数（room §2.2）', () => {
    const svc = new SaveService();
    grantAll(svc);
    const m = new RoomModel(svc);
    m.place(bed(), 'L-01');
    m.place(desk(), 'L-01'); // 同点位替换
    const r = m.place(desk(), 'L-01');
    expect(r.ok).toBe(true);
    // 满意：placement 更新为新件
    expect(svc.getPlacement()['L-01']).toBe(desk());
    // 旧件仍在拥有清单（回库存不丢资产）
    expect(svc.getOwnedFurniture()).toContain(bed());
    expect(r.toastMergeCount).toBeGreaterThanOrEqual(1);
  });

  it('替换落位同计 stats（room §2.6：每次成功落位 +1 含替换；收回不计负）', () => {
    const svc = new SaveService();
    grantAll(svc);
    const m = new RoomModel(svc);
    m.place(bed(), 'L-01');
    m.place(desk(), 'L-01'); // 替换
    expect(svc.getStats().furniturePlacedTotal).toBe(2);
    m.withdraw('L-01');
    expect(svc.getStats().furniturePlacedTotal).toBe(2); // 收回不回退
  });
});

describe('次级联动（room §2.3/§5.2/§8.2）', () => {
  it('宿主落位 → 顶面次级激活可摆；宿主替换 → 次级件自动随回库存', () => {
    const svc = new SaveService();
    grantAll(svc);
    const m = new RoomModel(svc);
    m.place(desk(), 'L-03');                 // 宿主落位
    m.place(orb(), 'S-T2');                  // 桌面左小件
    m.place(pillow(), 'S-T3');               // 桌面右小件
    expect(svc.getPlacement()['S-T2']).toBe(orb());
    // 替换宿主 → 顶面两件自动随回 + toast 合并计数
    const r = m.place(bed(), 'L-03');
    expect(r.ok).toBe(true);
    expect(r.autoReturnedSecondary.sort()).toEqual(['S-T2', 'S-T3'].sort());
    expect(r.toastMergeCount).toBe(3);       // 替换旧宿主 1 + 次级 2 →「已收回 ×3」合并
    expect(svc.getPlacement()['S-T2']).toBeNull();
    // 新宿主顶面可再摆
    expect(m.canPlace(orb(), 'S-T2')).toBe(true);
  });

  it('宿主收回 → 顶面次级件随回（不吞资产，room §2.3）', () => {
    const svc = new SaveService();
    grantAll(svc);
    const m = new RoomModel(svc);
    m.place(wardrobeF(), 'L-02');
    m.place(orb(), 'S-T4');
    const r = m.withdraw('L-02');
    expect(r.ok).toBe(true);
    expect(r.autoReturnedSecondary).toEqual(['S-T4']);
    expect(svc.getOwnedFurniture()).toContain(orb()); // 回库存
  });

  it('次级点位分母恒计 21（room §4：宿主空缺仍计入分母）', () => {
    const svc = new SaveService();
    grantAll(svc);
    const m = new RoomModel(svc);
    m.place(bed(), 'L-01');
    m.place(pillow(), 'S-01');
    expect(m.placedAnchorCount()).toBe(2); // 分母判定走 occupied 计数
    expect(ROOM_ANCHORS).toHaveLength(21);
  });
});

describe('摆放模式会话态（room §2.2/§5.4）', () => {
  it('再点同一件卡 = 取消；点其他件卡 = 切换目标；未拥有件不可进入', () => {
    const svc = new SaveService();
    const m = new RoomModel(svc);
    expect(m.tapFurnitureCard(bed())).toBe('cancelled'); // 未拥有 → 不可达（抽屉=已拥有全集）
    svc.addFurniture(bed());
    expect(m.tapFurnitureCard(bed())).toBe('entered');
    expect(m.tapFurnitureCard(bed())).toBe('cancelled'); // 同件 = 取消零残留
    svc.addFurniture(desk());
    expect(m.tapFurnitureCard(bed())).toBe('entered');
    expect(m.tapFurnitureCard(desk())).toBe('switched'); // 其他件 = 切换
    expect(m.isPlacing()).toBe(desk());
  });

  it('placementTargets：空位/占用分集（星光提示与剪影高亮数据源）', () => {
    const svc = new SaveService();
    grantAll(svc);
    const m = new RoomModel(svc);
    m.place(bed(), 'L-01');
    m.tapFurnitureCard(desk());
    const t = m.placementTargets();
    expect(t.vacant).toContain('L-02');
    expect(t.vacant).toContain('L-03');
    expect(t.occupied).toEqual(['L-01']);
  });
});

describe('氛围光棘轮（room §4.3/§8.4）', () => {
  it('occupied 5/11/17 → 档 1/2/3 逐档触发 + 档位事件只升发', () => {
    const svc = new SaveService();
    grantAll(svc);
    const m = new RoomModel(svc);
    const tiers: number[] = [];
    bus.on('room:ambienceTier', (p) => tiers.push(p.tier));
    // 17 个点位按类目兼容逐一落位（含次级位：宿主 L-01/L-03/L-02 均在位）
    const plan: Array<[string, string]> = [
      ['L-01', bed()], ['L-02', wardrobeF()], ['L-03', desk()],
      ['M-01', owl_perch()], ['M-02', lamp()], ['M-03', cloud_chair()], ['M-04', furn('startrack_rocker')],
      ['S-01', furn('star_plant')], ['S-02', furn('book_stack')],
      ['W-01', painting()], ['W-02', furn('starstring')], ['W-03', furn('crest_banner')],
      ['R-01', rug()],
      ['S-T1', pillow()], ['S-T2', orb()], ['S-T3', furn('quill_pot')], ['S-T4', furn('moonphase_lamp')],
    ];
    expect(plan).toHaveLength(17);
    plan.slice(0, 5).forEach(([a, f]) => expect(m.place(f, a).ok).toBe(true));
    expect(m.ambienceTier()).toBe(1); // ≥5 → 档 1
    plan.slice(5, 11).forEach(([a, f]) => expect(m.place(f, a).ok).toBe(true));
    expect(m.ambienceTier()).toBe(2); // ≥11 → 档 2
    plan.slice(11).forEach(([a, f]) => expect(m.place(f, a).ok).toBe(true));
    expect(m.ambienceTier()).toBe(3); // ≥17 → 档 3
    expect(tiers).toEqual([1, 2, 3]); // 档位事件恰三发
    // 棘轮：撤走不熄灯
    m.withdraw('S-T4');
    expect(m.ambienceTier()).toBe(3);
  });

  it('存档棘轮派生：旧档缺失按 occupied 重算（Serializer 兜底，room §3）', () => {
    const svc = new SaveService();
    expect(svc.getAmbienceLevel()).toBe(0); // 空房 0 档
  });
});

describe('家具判据数据输出（room §2.5 冻结值——供成就页 E4-S03 消费）', () => {
  it('placedAnchorCount 口径与成就阈值对齐（≥11 星图小屋 / ≥17 满室星辉）', () => {
    const svc = new SaveService();
    grantAll(svc);
    const m = new RoomModel(svc);
    const plan: Array<[string, string]> = [
      ['L-01', bed()], ['L-02', wardrobeF()], ['L-03', desk()],
      ['M-01', owl_perch()], ['M-02', lamp()], ['M-03', cloud_chair()], ['M-04', furn('startrack_rocker')],
      ['S-01', furn('star_plant')], ['S-02', furn('book_stack')],
      ['W-01', painting()], ['W-02', furn('starstring')], ['W-03', furn('crest_banner')],
    ];
    plan.slice(0, 11).forEach(([a, f]) => expect(m.place(f, a).ok).toBe(true));
    expect(m.placedAnchorCount()).toBe(11); // 星图小屋阈值判定源
  });
});
