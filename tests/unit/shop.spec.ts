/**
 * PKG-05 · 商店
 * CARD-01：服装页与数据表 shop 池对齐。家具页不出现解锁池。
 * 打开商店会关掉已经打开的其它覆盖层。成就页签保持不可用。
 * CARD-02：余额够则扣费入柜。不够则拒绝且不写扣款。已拥有不能再买。
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bus } from '../../src/core/bus';
import { CLOTHING_ITEMS } from '../../src/data/items';
import { FURNITURE_ITEMS } from '../../src/data/furniture';
import { MODE_TAB_BAR, OverlayManager, openShopOverlay } from '../../src/systems/hud/OverlayManager';
import { readShopPage, revealShopDetail } from '../../src/systems/shop/catalog';
import { claimDailyTask } from '../../src/systems/daily/progress';
import { BROKE_CAPTION, purchaseShopItem } from '../../src/systems/shop/purchase';
import { SaveService } from '../../src/systems/save/SaveService';
import { SAVE_KEY } from '../../src/systems/save/types';

beforeEach(() => {
  window.localStorage.removeItem(SAVE_KEY);
  window.localStorage.removeItem('huanzhuang_save_bak');
  bus.clear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

const fresh = (): SaveService => new SaveService();
const shopDebits = (save: SaveService) =>
  save.rawForTest().economy.ledger.filter((entry) => entry.reason === 'shop_purchase');

describe('商店目录（SPEC-0005 CARD-01）', () => {
  it('服装页数量与数据表 shop 服装数一致，且不改标价', () => {
    const table = CLOTHING_ITEMS.filter((item) => item.pool === 'shop');
    const page = readShopPage('clothing');

    expect(page.label).toBe('服装');
    expect(page.items).toHaveLength(table.length);
    expect(page.items.map((item) => item.itemId)).toEqual(table.map((item) => item.itemId));
    expect(page.items.every((item) => item.pool === 'shop')).toBe(true);
    expect(page.items.map((item) => item.price)).toEqual(table.map((item) => item.price));
  });

  it('家具页不含解锁池，数量与数据表 shop 家具数一致', () => {
    const table = FURNITURE_ITEMS.filter((item) => item.pool === 'shop');
    const unlockIds = FURNITURE_ITEMS.filter((item) => item.pool === 'unlock').map((item) => item.furnId);
    const page = readShopPage('furniture');

    expect(page.label).toBe('家具');
    expect(page.items).toHaveLength(table.length);
    expect(page.items.map((item) => item.furnId)).toEqual(table.map((item) => item.furnId));
    expect(page.items.some((item) => item.pool === 'unlock')).toBe(false);
    expect(page.items.map((item) => item.furnId).some((id) => unlockIds.includes(id))).toBe(false);
    expect(page.items.map((item) => item.price)).toEqual(table.map((item) => item.price));
  });
});

describe('底部页签（SPEC-0005 CARD-01）', () => {
  it('商店可点，成就仍不可用', () => {
    expect(MODE_TAB_BAR.find((tab) => tab.label === '商店')).toMatchObject({ enabled: true });
    expect(MODE_TAB_BAR.find((tab) => tab.label === '成就')).toMatchObject({ enabled: false });
    expect(MODE_TAB_BAR.find((tab) => tab.label === '换装')).toMatchObject({ enabled: true, mode: 'dress' });
    expect(MODE_TAB_BAR.find((tab) => tab.label === '房间')).toMatchObject({ enabled: true, mode: 'room' });
  });
});

describe('打开商店时关闭其他覆盖层', () => {
  it('任务层或造型层打开时改成商店一层', () => {
    const task = new OverlayManager();
    expect(task.openOverlay('task')).toBe('task');
    expect(openShopOverlay(task)).toBe('shop');
    expect(task.current()).toBe('shop');

    const look = new OverlayManager();
    expect(look.openOverlay('look')).toBe('look');
    expect(openShopOverlay(look)).toBe('shop');
    expect(look.current()).toBe('shop');
  });

  it('商店已经打开时仍是一层商店', () => {
    const overlays = new OverlayManager();
    expect(openShopOverlay(overlays)).toBe('shop');
    expect(openShopOverlay(overlays)).toBe('shop');
    expect(overlays.current()).toBe('shop');
    expect(overlays.isOpen()).toBe(true);
  });

  it('不是商店的覆盖层仍然互相拒绝', () => {
    const overlays = new OverlayManager();
    expect(overlays.openOverlay('task')).toBe('task');
    expect(overlays.openOverlay('look')).toBeNull();
    expect(overlays.current()).toBe('task');
  });
});

describe('AC-01 余额足够则扣费入柜', () => {
  it('未拥有的服装扣掉标价并进入衣柜，账本记一笔 shop_purchase', () => {
    const save = fresh();
    const item = readShopPage('clothing').items[0]!;
    save.addCoins(item.price, 'daily_task');

    const bought = purchaseShopItem(save, item.itemId);

    expect(bought).toEqual({ ok: true });
    expect(save.getCoins()).toBe(0);
    expect(save.getOwned()).toContain(item.itemId);
    expect(shopDebits(save)).toEqual([expect.objectContaining({ delta: -item.price, reason: 'shop_purchase' })]);
  });

  it('未拥有的家具扣掉标价并进入房间', () => {
    const save = fresh();
    const item = readShopPage('furniture').items[0]!;
    save.addCoins(item.price, 'daily_task');

    expect(purchaseShopItem(save, item.furnId)).toEqual({ ok: true });
    expect(save.getCoins()).toBe(0);
    expect(save.getOwnedFurniture()).toContain(item.furnId);
    expect(shopDebits(save)).toEqual([expect.objectContaining({ delta: -item.price })]);
  });
});

describe('AC-02 余额不足不扣费', () => {
  it('星尘不够时余额和账本都不变，并给出摇头与 toast', () => {
    const save = fresh();
    const item = readShopPage('clothing').items[0]!;
    save.addCoins(item.price - 1, 'daily_task');
    const ledger = save.rawForTest().economy.ledger.length;

    const bought = purchaseShopItem(save, item.itemId);

    expect(bought).toEqual({ ok: false, reason: 'broke', shake: true, toast: BROKE_CAPTION });
    expect(save.getCoins()).toBe(item.price - 1);
    expect(save.rawForTest().economy.ledger).toHaveLength(ledger);
    expect(shopDebits(save)).toHaveLength(0);
    expect(save.getOwned()).not.toContain(item.itemId);
  });
});

describe('AC-03 已拥有不可再买', () => {
  it('再点购买不产生第二件，也不再扣费', () => {
    const save = fresh();
    const item = readShopPage('clothing').items[0]!;
    save.addCoins(item.price * 2, 'daily_task');
    expect(purchaseShopItem(save, item.itemId)).toEqual({ ok: true });

    const again = purchaseShopItem(save, item.itemId);

    expect(again).toEqual({ ok: false, reason: 'owned', shake: false, toast: null });
    expect(save.getCoins()).toBe(item.price);
    expect(save.getOwned().filter((id) => id === item.itemId)).toHaveLength(1);
    expect(shopDebits(save)).toHaveLength(1);
  });
});

describe('AC-04 详情留在商店这一层', () => {
  it('点开详情时覆盖层仍然只有商店', () => {
    const save = fresh();
    const overlays = new OverlayManager();
    const item = readShopPage('clothing').items[0]!;
    openShopOverlay(overlays);

    const detail = revealShopDetail(overlays, save, item.itemId);

    expect(detail).toMatchObject({
      itemId: item.itemId,
      name: item.name,
      price: item.price,
      owned: false,
    });
    expect(overlays.current()).toBe('shop');
    expect(overlays.openOverlay('look')).toBeNull();
  });

  it('商店没打开时点详情不会另开一层', () => {
    const save = fresh();
    const overlays = new OverlayManager();
    const item = readShopPage('clothing').items[0]!;

    expect(revealShopDetail(overlays, save, item.itemId)).toBeNull();
    expect(overlays.current()).toBeNull();
  });
});

describe('M2 试穿、领 150、购买、入柜', () => {
  it('试穿计数之后领取 150，再买一件不高于 150 的服装', () => {
    const save = fresh();
    save.syncDailyDate();
    save.bumpStat('tryOnTotal', 5);
    save.setDailyTasksForTest([{ taskId: 't_a1', progress: 5, claimed: false }]);

    expect(claimDailyTask(save, 't_a1')).toBe(true);
    expect(save.getCoins()).toBe(150);
    expect(save.getStats().tryOnTotal).toBe(5);

    const item = readShopPage('clothing').items.find((row) => row.price <= 150)!;
    expect(purchaseShopItem(save, item.itemId)).toEqual({ ok: true });
    expect(save.getOwned()).toContain(item.itemId);
    expect(save.getCoins()).toBe(150 - item.price);
  });
});

describe('已拥有不可再买（补）', () => {
  it('解锁池物品不在商店出售', () => {
    const save = fresh();
    const locked = CLOTHING_ITEMS.find((item) => item.pool === 'unlock')!;
    save.addCoins(locked.price, 'daily_task');

    expect(purchaseShopItem(save, locked.itemId)).toEqual({ ok: false, reason: 'missing', shake: false, toast: null });
    expect(save.getCoins()).toBe(locked.price);
    expect(shopDebits(save)).toHaveLength(0);
  });
});
