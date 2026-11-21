/**
 * 造型面板逻辑层（E3-S01，look-save §2.1/2.3/2.6/§5/§8）
 * 写入唯一路径 = SaveService.saveLook/applyLook/deleteLook（look-save §8.1 红线——本模块不另设）。
 * UI 面（九宫格/空位卡/行内确认条）消费本层状态；本层不持有渲染对象。
 */

import type { LookEntry } from '../save/types';
import type { SaveService } from '../save/SaveService';
import type { OutfitMap } from '../save/types';

/** 名称规则（look-save §2.3）：≤8 个汉字（16 字符位）；重名允许；空输入取默认名 */
export const LOOK_NAME_MAX = 8;

export interface NameValidation {
  ok: boolean;
  /** 截断后的有效名 */
  value: string;
  /** 实际汉字/字符计数（供 UI 实时计数 {n}/8） */
  count: number;
  truncated: boolean;
}

/** 按字符位计数（汉字与半角等权计数——look-save §4：name.slice(0,8 汉字)，字符位口径） */
export const validateLookName = (raw: string): NameValidation => {
  const chars = Array.from(raw.trim());
  const truncated = chars.length > LOOK_NAME_MAX;
  return {
    ok: chars.length > 0,
    value: chars.slice(0, LOOK_NAME_MAX).join(''),
    count: Math.min(chars.length, LOOK_NAME_MAX),
    truncated,
  };
};

export type PanelSlot = { index: number; look: LookEntry | null };

export class LookPanelModel {
  /** 行内删除确认挂起态（look-save §2.6：行内展开 [删除][取消]，不叠弹窗） */
  private pendingDeleteId: string | null = null;

  constructor(private save: SaveService) {}

  /** 九宫格固定 9 位（D3-02；空位 = null） */
  slots(): PanelSlot[] {
    const looks = this.save.getLooks();
    const out: PanelSlot[] = [];
    for (let i = 0; i < 9; i++) out.push({ index: i, look: looks[i] ?? null });
    return out;
  }

  usedCount(): number {
    return this.save.getLooks().length;
  }

  isFull(): boolean {
    return this.usedCount() >= 9;
  }

  /** 空位卡保存入口在满位时自然消失（look-save §2.6——UI 据此隐藏） */
  hasVacancy(): boolean {
    return !this.isFull();
  }

  /** 默认名「我的造型 {已用位数+1}」（look-save §2.3） */
  defaultName(): string {
    return `我的造型 ${this.usedCount() + 1}`;
  }

  /**
   * 保存当前造型：快照 = S01 完整 13 槽深拷贝（含被连衣裙遮蔽的 BTM——§2.2）
   * 空/全空格名 → 取默认名；满 9 → 拒绝（接口层双保险第二道，§8.4）
   */
  saveCurrent(rawName: string, snapshot: OutfitMap): LookEntry | { error: 'looks-full' } {
    if (this.isFull()) return { error: 'looks-full' };
    const v = validateLookName(rawName);
    const name = v.ok && rawName.trim().length > 0 ? v.value : this.defaultName();
    return this.save.saveLook(name, snapshot);
  }

  /** 重命名（look-save §8.7：同保存命名规格；重名允许——lookId 区分） */
  rename(lookId: string, rawName: string): boolean {
    const look = this.save.getLooks().find((l) => l.id === lookId);
    if (!look) return false;
    const v = validateLookName(rawName);
    if (!v.ok) return false;
    look.name = v.value;
    look.updatedAt = new Date().toISOString();
    // 走 S04 即时写通道（saveLook 不适用——经内部更新后强制冲刷）
    this.save.flush();
    return true;
  }

  /** 行内删除二次确认（look-save §2.6/§8.7：显式两步，不依赖长按/手势） */
  requestDelete(lookId: string): 'confirm-pending' | 'not-found' {
    if (!this.save.getLooks().some((l) => l.id === lookId)) return 'not-found';
    this.pendingDeleteId = lookId;
    return 'confirm-pending';
  }

  isDeletePending(lookId: string): boolean {
    return this.pendingDeleteId === lookId;
  }

  confirmDelete(): boolean {
    if (this.pendingDeleteId === null) return false;
    const ok = this.save.deleteLook(this.pendingDeleteId); // 即时写（look-save §2.6）
    this.pendingDeleteId = null;
    return ok;
  }

  cancelDelete(): void {
    this.pendingDeleteId = null;
  }
}
