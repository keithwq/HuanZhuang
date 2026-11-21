/**
 * 契约签名快照（testing-scaffold §3.5 / E5-S03 预基线）
 * - 8 册 GDD §6 冻结接口签名 vs 实现导出面：偏离即失败（防 AI 生成代码漂移）
 * - GAP-4 注记：onTabChange 参数域 = 组 ID 枚举 'G1'~'G8'（ux-spec §2.3）
 */

import { describe, expect, it } from 'vitest';
import { PaperdollModel } from '../../src/systems/paperdoll/model';
import { ViewSwap } from '../../src/systems/paperdoll/ViewSwap';
import { TweenService } from '../../src/systems/paperdoll/tweenSvc';
import { SaveService } from '../../src/systems/save/SaveService';
import { DayFlip } from '../../src/systems/save/DayFlip';
import { StorageDriver } from '../../src/systems/save/StorageDriver';
import { WritePolicy } from '../../src/systems/save/WritePolicy';
import { MigrationChain } from '../../src/systems/save/migrate';
import { TexMemAccountant } from '../../src/texmem/accountant';
import { EventBus, type GroupId } from '../../src/core/bus';
import { DrawerController } from '../../src/systems/hud/DrawerController';
import { ModeManager, OverlayManager, type OverlayPage } from '../../src/systems/hud/OverlayManager';
import { TryonController } from '../../src/systems/wardrobe/tryonController';
import { GROUPS, groupById, isGroupId, unequipCardsOf } from '../../src/systems/wardrobe/groups';
import { filterItems } from '../../src/systems/wardrobe/filter';

describe('S04 local-save §6 冻结接口', () => {
  it('SaveService 导出面与 GDD §6 签名一致（load/getOwned/addItem/setOutfitSlot/saveLook/applyLook/deleteLook/addCoins/spendCoins/setPlacement/onDayFlip/bumpStat/getAchievement/claimAchievement）', () => {
    const required = [
      'load', 'getOwned', 'addItem', 'setOutfitSlot',
      'saveLook', 'applyLook', 'deleteLook',
      'addCoins', 'spendCoins', 'setPlacement',
      'onDayFlip', 'bumpStat',
      'getAchievement', 'claimAchievement',
    ] as const;
    for (const m of required) {
      expect(typeof (SaveService.prototype as unknown as Record<string, unknown>)[m]).toBe('function');
    }
    // 签名快照：参数个数冻结
    const svc = SaveService.prototype as unknown as Record<string, (...a: unknown[]) => unknown>;
    expect(svc.addItem.length).toBe(2);            // (itemId, reason)
    expect(svc.setOutfitSlot.length).toBe(2);       // (slot, itemId|null)
    expect(svc.addCoins.length).toBe(2);            // (delta, reason)
    expect(svc.spendCoins.length).toBe(2);         // (delta, reason)
    expect(svc.setPlacement.length).toBe(2);        // (anchorId, furnId|null)
    expect(svc.bumpStat.length).toBe(1);           // (key, n=1 默认参——Function.length 计必选参)
    expect(svc.saveLook.length).toBe(2);            // (name, outfit)
  });

  it('内部四层架构面（ADR-002 §1：Serializer/StorageDriver/WritePolicy/DayFlip）', () => {
    for (const C of [StorageDriver, WritePolicy, DayFlip, MigrationChain]) {
      expect(typeof C).toBe('function');
    }
  });
});

describe('S01 paperdoll §6 冻结接口', () => {
  it('tryOn / unequip / setView / getOutfitSnapshot 导出面', () => {
    for (const m of ['tryOn', 'unequip', 'setView', 'getOutfitSnapshot'] as const) {
      expect(typeof (PaperdollModel.prototype as unknown as Record<string, unknown>)[m]).toBe('function');
    }
    const p = PaperdollModel.prototype as unknown as Record<string, (...a: unknown[]) => unknown>;
    expect(p.tryOn.length).toBe(2);       // (slot, itemId) —— 逐槽签名不变（GAP-4：组概念不进渲染层）
    expect(p.unequip.length).toBe(1);     // (slot)
  });

  it('ViewSwap：request/advance/markTexturesReady 状态机面', () => {
    expect(typeof ViewSwap).toBe('function');
    const p = ViewSwap.prototype as unknown as Record<string, unknown>;
    expect(typeof p.request).toBe('function');
    expect(typeof p.advance).toBe('function');
    expect(typeof p.markTexturesReady).toBe('function');
  });
});

describe('S05 hud §6 冻结接口（容器只提供挂载面）', () => {
  it('getStage/getDrawer/openOverlay/closeOverlay/onModeChange/setCurrencyDisplay/setBadge 语义面由场景层实现，逻辑层导出 OverlayManager/ModeManager/DrawerController', () => {
    const om = new OverlayManager();
    expect(typeof om.openOverlay).toBe('function');
    expect(typeof om.closeOverlay).toBe('function');
    const mm = new ModeManager(() => {}, () => {});
    expect(typeof mm.request).toBe('function');
    const dc = new DrawerController(1000, () => {});
    expect(typeof dc.toggle).toBe('function');
    expect(typeof dc.resetDefault).toBe('function');
  });
});

describe('GAP-4 · onTabChange 参数域 = 组 ID（ux-spec §2.3 / wardrobe §2.1 修订）', () => {
  it('GroupId 枚举恰为 G1~G8', () => {
    const ids: GroupId[] = ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8'];
    for (const id of ids) expect(isGroupId(id)).toBe(true);
    expect(isGroupId('TOP')).toBe(false);   // 槽位代码不再合法（域收窄）
    expect(isGroupId('G9')).toBe(false);
    expect(isGroupId('HAND')).toBe(false);
  });

  it('bus 事件 wardrobe:tabChange 参数类型为 GroupId（编译期锁定 + 运行时登记表）', () => {
    // 运行时契约：事件负载只接受组 ID
    const bus2 = new EventBus();
    const seen: GroupId[] = [];
    bus2.on('wardrobe:tabChange', (p) => seen.push(p.groupId));
    bus2.emit('wardrobe:tabChange', { groupId: 'G3' });
    expect(seen).toEqual(['G3']);
  });

  it('tryOn(slot, itemId) 签名不变断言（组概念不进渲染层——渲染层零改动回归面）', () => {
    const p = PaperdollModel.prototype as unknown as Record<string, (...a: unknown[]) => unknown>;
    expect(p.tryOn.length).toBe(2);
    const m = new PaperdollModel();
    // 逐槽调用路径仍以 SlotId 为参数（非 GroupId）
    const r = m.tryOn('TOP', 'HZ_char01_TOP_starnight_dress_a_v001');
    expect(r.ok).toBe(true);
  });
});

describe('S03 wardrobe 冻结面（分组表/卸下卡/筛选）', () => {
  it('分组 8 组 + 卸下卡配置 + 筛选谓词导出稳定', () => {
    expect(GROUPS).toHaveLength(8);
    expect(groupById('G1').name).toBe('发型');
    expect(unequipCardsOf('G7')).toHaveLength(3);
    expect(typeof filterItems).toBe('function');
    expect(typeof TryonController).toBe('function');
  });
});

describe('OverlayPage 枚举（hud §6 单层互斥四页）', () => {
  it('覆盖层页枚举 = look/shop/task/achieve', () => {
    const pages: OverlayPage[] = ['look', 'shop', 'task', 'achieve'];
    const om = new OverlayManager();
    for (const p of pages) {
      expect(om.openOverlay(p)).not.toBeNull();
      om.closeOverlay();
    }
  });
});

describe('texmem 全项目唯一纹理进出（ADR-003 §2 导出面）', () => {
  it('register/release/assertBudget/report 四面', () => {
    const t = new TexMemAccountant(false);
    expect(typeof t.register).toBe('function');
    expect(typeof t.release).toBe('function');
    expect(typeof t.assertBudget).toBe('function');
    expect(typeof t.report).toBe('function');
  });
});

describe('TweenService 白名单导出面（D1-11 guard）', () => {
  it('createResident/createOneShot/killTweensOf', () => {
    const s = new TweenService();
    expect(typeof s.createResident).toBe('function');
    expect(typeof s.createOneShot).toBe('function');
    expect(typeof s.killTweensOf).toBe('function');
  });
});
