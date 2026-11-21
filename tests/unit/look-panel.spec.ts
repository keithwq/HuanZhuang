/**
 * E3-S01/S02 · 造型保存（look-save §8 全验收面）
 * 写入路径唯一（§8.1）经 SaveService；回穿静默批量 + 单次焕新（§8.3）。
 */

import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { bus } from '../../src/core/bus';
import { SAVE_KEY, type OutfitMap } from '../../src/systems/save/types';
import { SaveService } from '../../src/systems/save/SaveService';
import { PaperdollModel } from '../../src/systems/paperdoll/model';
import { LookPanelModel, validateLookName, LOOK_NAME_MAX } from '../../src/systems/looks/lookPanel';
import { APPLY_ORDER, createApplyFlow } from '../../src/systems/looks/applyFlow';
import { CLOTHING_ITEMS } from '../../src/data/items';

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.removeItem(SAVE_KEY);
  window.localStorage.removeItem('huanzhuang_save_bak');
  bus.clear();
});
afterEach(() => {
  vi.useRealTimers();
  bus.clear();
});

const mkOutfit = (overrides: Partial<OutfitMap> = {}): OutfitMap => ({
  BK: null, BODY: null, HAIR_B: null, LEG: null, BTM: null, TOP: null, OUT: null,
  HAND_L: null, HAND_R: null, NECK: null, HAIR_F: null, HEAD: null, FACE: null, FX: null,
  ...overrides,
});

describe('命名规则（look-save §2.3/§8.6）', () => {
  it('≤8 汉字上限 + 截断 + 实时计数', () => {
    expect(LOOK_NAME_MAX).toBe(8);
    const ok = validateLookName('星夜的晚风');
    expect(ok).toMatchObject({ ok: true, count: 5, truncated: false, value: '星夜的晚风' });
    const over = validateLookName('这是一段超长的造型名称一定超过');
    expect(over.truncated).toBe(true);
    expect(over.value).toHaveLength(8); // 超限截断（look-save §4）
    expect(over.count).toBe(8);
  });

  it('空输入 → ok=false（UI 层取默认名）', () => {
    expect(validateLookName('   ').ok).toBe(false);
  });

  it('默认名「我的造型 {n+1}」随用量递增（look-save §2.3）', () => {
    const svc = new SaveService();
    const panel = new LookPanelModel(svc);
    expect(panel.defaultName()).toBe('我的造型 1');
    panel.saveCurrent('夜色', mkOutfit({ TOP: CLOTHING_ITEMS[5].itemId }));
    expect(panel.defaultName()).toBe('我的造型 2');
  });
});

describe('九宫格与满位双保险（D3-02 / look-save §2.6/§8.4）', () => {
  it('固定 9 位、空位为 null', () => {
    const panel = new LookPanelModel(new SaveService());
    const slots = panel.slots();
    expect(slots).toHaveLength(9);
    expect(slots.every((s) => s.look === null)).toBe(true);
    expect(panel.hasVacancy()).toBe(true);
  });

  it('满 9 位：保存拒绝 + 空位卡入口条件消失（isFull → UI 隐藏空位卡）', () => {
    const svc = new SaveService();
    const panel = new LookPanelModel(svc);
    for (let i = 0; i < 9; i++) {
      const r = panel.saveCurrent(`造型${i}`, mkOutfit({ TOP: CLOTHING_ITEMS[5].itemId }));
      expect('error' in r).toBe(false);
    }
    expect(panel.isFull()).toBe(true);
    expect(panel.hasVacancy()).toBe(false); // 入口自然消失的判定源
    const r10 = panel.saveCurrent('第十个', mkOutfit());
    expect(r10).toEqual({ error: 'looks-full' }); // 接口层双保险第二道
    // 删除后空位即可复用
    const firstId = panel.slots().find((s) => s.look)!.look!.id;
    panel.requestDelete(firstId);
    panel.confirmDelete();
    expect(panel.hasVacancy()).toBe(true);
    expect('error' in panel.saveCurrent('新位', mkOutfit())).toBe(false);
  });
});

describe('快照完整性（look-save §2.2/§8.2）', () => {
  it('保存含被连衣裙遮蔽的 BTM；回穿后 13 槽逐一一致（含空槽卸下）', () => {
    const svc = new SaveService();
    const dress = CLOTHING_ITEMS.find((c) => c.dress && c.slot === 'TOP')!;
    const btm = CLOTHING_ITEMS.find((c) => c.slot === 'BTM')!;
    const leg = CLOTHING_ITEMS.find((c) => c.slot === 'LEG')!;
    const outfit = mkOutfit({ TOP: dress.itemId, BTM: btm.itemId, LEG: leg.itemId });
    const panel = new LookPanelModel(svc);
    const saved = panel.saveCurrent('裙装', outfit) as { id: string };
    // 换一身（覆盖当前）
    const model = new PaperdollModel(mkOutfit({ TOP: null, BTM: null, LEG: null }));
    const apply = createApplyFlow(model, svc);
    const r = apply(saved.id);
    expect(r.ok).toBe(true);
    for (const [k, v] of Object.entries(outfit)) {
      expect(model.getOutfitSnapshot()[k as keyof typeof outfit]).toBe(v);
    }
  });
});

describe('回穿流（look-save §2.5/§8.3/§8.5）', () => {
  it('静默批量：零 tryon:done（防 13 连播）、恰一次 look:applied、无计数', () => {
    const svc = new SaveService();
    const dress = CLOTHING_ITEMS.find((c) => c.dress && c.slot === 'TOP')!;
    const outfit = mkOutfit({ TOP: dress.itemId, BTM: CLOTHING_ITEMS.find((c) => c.slot === 'BTM')!.itemId });
    const panel = new LookPanelModel(svc);
    const saved = panel.saveCurrent('回穿源', outfit) as { id: string };

    const tryonEvents: unknown[] = [];
    const appliedEvents: unknown[] = [];
    bus.on('tryon:done', (p) => tryonEvents.push(p));
    bus.on('look:applied', (p) => appliedEvents.push(p));

    const model = new PaperdollModel(mkOutfit());
    const statsBefore = svc.getStats().tryOnTotal;
    const apply = createApplyFlow(model, svc);
    const r = apply(saved.id);

    expect(tryonEvents).toHaveLength(0);        // 无 13 连播（§8.3）
    expect(appliedEvents).toHaveLength(1);       // 恰一次联动事件
    expect(svc.getStats().tryOnTotal).toBe(statsBefore); // 回穿不计试穿
    expect(r.ok).toBe(true);
    expect(r.renewAnim).toEqual({ fadeMs: 150, risePercent: 0.02 }); // 焕新 = 换装确认家族参数
    // 快照一致（§8.5 数据面）
    expect(model.getOutfitSnapshot().TOP).toBe(dress.itemId);
  });

  it('批量槽序 = L00→L12（APPLY_ORDER 冻结序）', () => {
    expect(APPLY_ORDER).toEqual([
      'BK', 'BODY', 'HAIR_B', 'LEG', 'BTM', 'TOP', 'OUT', 'HAND_L', 'HAND_R',
      'NECK', 'HAIR_F', 'HEAD', 'FACE', 'FX',
    ]);
  });

  it('未知 lookId → 拒绝且状态零污染', () => {
    const svc = new SaveService();
    const model = new PaperdollModel(mkOutfit({ TOP: CLOTHING_ITEMS[5].itemId }));
    const apply = createApplyFlow(model, svc);
    const r = apply('look_nonexistent');
    expect(r.ok).toBe(false);
    expect(model.getOutfitSnapshot().TOP).toBe(CLOTHING_ITEMS[5].itemId); // 零污染
  });

  it('回穿可被下一点选正常覆盖（look-save §5.4：无中间态泄漏）', () => {
    const svc = new SaveService();
    const panel = new LookPanelModel(svc);
    const saved = panel.saveCurrent('A', mkOutfit({ TOP: CLOTHING_ITEMS[5].itemId })) as { id: string };
    const model = new PaperdollModel(mkOutfit());
    const apply = createApplyFlow(model, svc);
    apply(saved.id);
    // 玩家立即点衣柜 = 正常试穿流覆盖
    const top2 = CLOTHING_ITEMS.filter((c) => c.slot === 'TOP')[1];
    expect(model.tryOn('TOP', top2.itemId).ok).toBe(true);
    expect(model.getOutfitSnapshot().TOP).toBe(top2.itemId);
  });
});

describe('删除与重命名（look-save §2.6/§8.7）', () => {
  it('行内二次确认两步：requestDelete → pending → confirmDelete 才删；cancel 可撤', () => {
    const svc = new SaveService();
    const panel = new LookPanelModel(svc);
    const saved = panel.saveCurrent('待删', mkOutfit()) as { id: string };
    expect(panel.requestDelete(saved.id)).toBe('confirm-pending');
    expect(panel.isDeletePending(saved.id)).toBe(true);
    // 取消路径
    panel.cancelDelete();
    expect(panel.usedCount()).toBe(1);
    // 确认路径
    panel.requestDelete(saved.id);
    expect(panel.confirmDelete()).toBe(true);
    expect(panel.usedCount()).toBe(0);
    // 删除不可逆：confirmDelete 后再 confirm 无效
    expect(panel.confirmDelete()).toBe(false);
  });

  it('直接删除无暴露路径（confirmDelete 必须经 requestDelete 前置）', () => {
    const svc = new SaveService();
    const panel = new LookPanelModel(svc);
    panel.saveCurrent('X', mkOutfit());
    expect(panel.confirmDelete()).toBe(false); // 无挂起确认 → 拒绝
    expect(panel.usedCount()).toBe(1);
  });

  it('重命名：同保存命名规格 + 重名允许 + 未知 id 拒绝', () => {
    const svc = new SaveService();
    const panel = new LookPanelModel(svc);
    const a = panel.saveCurrent('同名', mkOutfit()) as { id: string };
    const b = panel.saveCurrent('同名', mkOutfit()) as { id: string };
    expect(panel.rename(b.id, '新的名字')).toBe(true);
    const looks = svc.getLooks();
    expect(looks.find((l) => l.id === b.id)!.name).toBe('新的名字');
    expect(looks.find((l) => l.id === a.id)!.name).toBe('同名'); // 重名允许（id 区分）
    expect(panel.rename('look_none', 'x')).toBe(false);
    expect(panel.rename(a.id, '  ')).toBe(false); // 空名拒绝
    const over = '名字特别长一定会被截断的样式';
    expect(panel.rename(a.id, over)).toBe(true);
    expect(svc.getLooks().find((l) => l.id === a.id)!.name).toHaveLength(8); // 截断生效
  });

  it('悬空 itemId 快照回穿不中断（look-save §5.3：兜底归渲染层）', () => {
    const svc = new SaveService();
    const panel = new LookPanelModel(svc);
    const saved = panel.saveCurrent('未来', mkOutfit({ NECK: 'HZ_char01_NECK_ghost_x_a_v001' })) as { id: string };
    const model = new PaperdollModel(mkOutfit());
    const apply = createApplyFlow(model, svc);
    expect(apply(saved.id).ok).toBe(true); // 回穿不中断
    expect(model.getOutfitSnapshot().NECK).toBe('HZ_char01_NECK_ghost_x_a_v001'); // 快照本体不清洗
  });
});

describe('保存时状态语义（look-save §5.1/§5.2）', () => {
  it('背面视图保存 = 正面保存（快照与视图无关，13 槽状态唯一）', () => {
    const svc = new SaveService();
    const panel = new LookPanelModel(svc);
    const model = new PaperdollModel(mkOutfit({ TOP: CLOTHING_ITEMS[5].itemId }));
    const snapFront = model.getOutfitSnapshot();
    panel.saveCurrent('正面存', snapFront);
    model.setView('back');
    const snapBack = model.getOutfitSnapshot();
    expect(snapBack).toEqual(snapFront); // 视图无关
    const saved2 = panel.saveCurrent('背面存', snapBack) as { outfit: Record<string, string | null> };
    expect(saved2.outfit).toEqual(snapFront);
  });
});
