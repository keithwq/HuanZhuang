/**
 * SaveService · S04 全部冻结接口的唯一实现（E1-S02~S05，local-save §6）
 * 红线（local-save §8.1）：全部六系统经本服务读写，无任何系统绕开接口直接触碰 localStorage。
 * 写序（ADR-002 §1）：写主键前先复制当前主键内容到备份键，再写主键；
 * 读序：先主后备，双坏新档（默认套装由引导层经 setOutfitSlot 落位——S01 §5.5）。
 */

import { bus } from '../../core/bus';
import { SAVE_POLICY } from '../../core/constants/budget';
import { isOutfitKey, type SlotId } from '../../core/constants/slots';
import { DayFlip, defaultDateKeyFn, localDateKey } from './DayFlip';
import { ambienceTierFromOccupied, Serializer } from './Serializer';
import { QuotaError, StorageDriver } from './StorageDriver';
import { WritePolicy, type ImmediateOp } from './WritePolicy';
import { SAVE_KEY, SAVE_KEY_BAK, newSave, type LedgerEntry, type LookEntry, type OutfitMap, type SaveDataV1 } from './types';

export type StatKey =
  | 'tryOnTotal' | 'tryOnUnique' | 'lookSavedTotal'
  | 'itemsOwnedTotal' | 'furniturePlacedTotal' | 'coinEarnTotal';

const nowISO = () => new Date().toISOString();

export class SaveService {
  private data: SaveDataV1;
  private serializer = new Serializer();
  private policy: WritePolicy;
  private dayFlip: DayFlip;
  private driver: StorageDriver;
  /** 配额二连失败后的内存会话档兜底（local-save §5.2 终态） */
  private memoryOnly = false;
  private storageOff: (() => void) | null = null;
  /** 配额终态提示一次性标志（local-save §5.2：转内存档并提示，一次） */
  private quotaNotified = false;

  constructor(driver = new StorageDriver(), policy?: WritePolicy, dateKeyFn = defaultDateKeyFn) {
    this.driver = driver;
    this.policy =
      policy ??
      new WritePolicy((trigger) => this.persist(trigger));
    this.dayFlip = new DayFlip((newKey) => this.applyDayFlip(newKey), dateKeyFn);
    this.data = this.loadInternal();
    // 降级一次性提示（local-save §5.1：非阻塞 toast，只此一次）
    if (this.driver.consumeDegradedNotice()) {
      bus.emit('save:degraded', { once: true });
    }
    this.attachStorageListener();
  }

  // ---------------------------------------------------------------- 读档

  /** 读档 → 内存态（主备回退；双坏新档 + 引导提示路径由 save:degraded / 调用方承接，绝不闪退） */
  load(): SaveDataV1 {
    return this.data;
  }

  private loadInternal(): SaveDataV1 {
    const main = this.driver.read(SAVE_KEY);
    const mainParsed = this.serializer.parse(main);
    if (mainParsed.ok) return mainParsed.data;
    if (main !== null) {
      // 主键损坏 → 读备份恢复（丢失 ≤ 上次写入间隔，local-save §5.3）
      const bak = this.driver.read(SAVE_KEY_BAK);
      const bakParsed = this.serializer.parse(bak);
      if (bakParsed.ok) {
        // 备份恢复后回写主键
        this.driver.write(SAVE_KEY, this.serializer.serialize(bakParsed.data));
        return bakParsed.data;
      }
      // 双坏 → 新档（与首启无档同路径；console 警告供诊断，非用户可见）
      console.warn('[save] 主备双键损坏，走新档路径');
    }
    return newSave(nowISO());
  }

  // ---------------------------------------------------------------- 持久化

  /** 双键轮换 + 配额降级链（ADR-002 §1 / local-save §5.2） */
  private persist(trigger: string): void {
    if (this.memoryOnly) return; // 内存会话档：本次会话内一切正常、关页即丢
    this.data.player.lastSeenAt = nowISO();
    const json = this.serializer.serialize(this.data);
    try {
      // 写序红线：先备份当前主键内容，再写主键
      const currentMain = this.driver.read(SAVE_KEY);
      if (currentMain !== null) this.driver.write(SAVE_KEY_BAK, currentMain);
      this.driver.write(SAVE_KEY, json);
    } catch (e) {
      if (e instanceof QuotaError || (e as Error)?.name === 'QuotaExceededError') {
        // 降级链第一步：丢弃 ledger 尾部（非权威数据）重写一次
        this.data.economy.ledger = this.data.economy.ledger.slice(0, Math.floor(this.data.economy.ledger.length / 2));
        try {
          this.driver.write(SAVE_KEY, this.serializer.serialize(this.data));
          console.warn('[save] 配额失败，已裁剪 ledger 重写成功');
          return;
        } catch {
          // 仍失败 → 内存会话档 + 一次性提示（不重复弹，local-save §5.2 终态）
          this.memoryOnly = true;
          console.warn('[save] 配额二连失败（裁剪 ledger 后仍不可写），转内存会话档');
          if (!this.quotaNotified) {
            this.quotaNotified = true;
            bus.emit('save:degraded', { once: true });
          }
        }
      } else {
        throw e;
      }
    }
  }

  private immediate(op: ImmediateOp): void {
    this.policy.writeImmediate(op);
  }

  /** 存档 JSON 体积（local-save §8.8 验收：≤100KB） */
  saveSizeBytes(): number {
    return this.serializer.serialize(this.data).length;
  }

  isMemoryOnly(): boolean {
    return this.memoryOnly || this.driver.isDegraded();
  }

  // ---------------------------------------------------------------- 持有 / 换装

  getOwned(): readonly string[] {
    return this.data.wardrobe.ownedItems;
  }

  /** 入柜唯一入口（购入、成就解锁统一；reason 入 ledger 关联）——判重拒绝为第二道防线（economy §5.5） */
  addItem(itemId: string, reason: string): boolean {
    if (this.data.wardrobe.ownedItems.includes(itemId)) {
      console.warn(`[save] addItem 判重拒绝: ${itemId}`);
      return false;
    }
    this.data.wardrobe.ownedItems.push(itemId);
    this.bumpStat('itemsOwnedTotal', 1);
    // 入柜 = 关键操作，即时写（local-save §2.2：购入/成就解锁即时写）
    this.immediate(reason === 'achievement' ? 'claimAchievement' : 'purchase');
    return true;
  }

  getOutfit(): OutfitMap {
    return { ...this.data.wardrobe.outfit };
  }

  setOutfitSlot(slot: string, itemId: string | null): void {
    if (!isOutfitKey(slot)) throw new Error(`setOutfitSlot: 非法槽位键 ${slot}`);
    this.data.wardrobe.outfit[slot] = itemId;
    this.policy.scheduleDebounced(); // 换装高频：500ms 防抖（local-save §2.2）
  }

  // ---------------------------------------------------------------- 造型 ×9（D3-02）

  saveLook(name: string, outfit: OutfitMap): LookEntry {
    if (this.data.looks.length >= SAVE_POLICY.looksMax) {
      throw new Error('looks-full'); // 满 9 硬拒绝（local-save §8.6；UX 面入口消失为第一道）
    }
    const entry: LookEntry = {
      id: `look_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6).toString(36)}`,
      name,
      outfit: { ...outfit }, // 深拷贝快照（look-save §2.2：完整 13 槽，含遮蔽 BTM）
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    this.data.looks.push(entry);
    this.bumpStat('lookSavedTotal', 1);
    this.immediate('saveLook');
    return entry;
  }

  applyLook(lookId: string): OutfitMap {
    const look = this.data.looks.find((l) => l.id === lookId);
    if (!look) throw new Error(`applyLook: 未知 lookId ${lookId}`);
    // 原子全槽覆盖（look-save §2.2：不做部分应用）
    this.data.wardrobe.outfit = { ...look.outfit };
    this.immediate('saveLook');
    return { ...look.outfit };
  }

  deleteLook(lookId: string): boolean {
    const idx = this.data.looks.findIndex((l) => l.id === lookId);
    if (idx < 0) return false;
    // 不复用旧 id（look-save §5.6：避免悬空引用）
    this.data.looks.splice(idx, 1);
    this.immediate('deleteLook');
    return true;
  }

  getLooks(): readonly LookEntry[] {
    return this.data.looks;
  }

  // ---------------------------------------------------------------- 货币账本（coins 永不为负，local-save §8.5）

  getCoins(): number {
    return this.data.economy.coins;
  }

  private pushLedger(delta: number, reason: string): void {
    const entry: LedgerEntry = { t: nowISO(), delta, reason };
    this.data.economy.ledger.push(entry);
    // 滚动窗口 50（超限丢弃最旧，local-save §3）
    while (this.data.economy.ledger.length > SAVE_POLICY.ledgerMax) {
      this.data.economy.ledger.shift();
    }
  }

  /** 收入唯一入口（领取即即时写盘，daily §5.2） */
  addCoins(delta: number, reason: string): void {
    if (delta <= 0) throw new Error(`addCoins: delta 必须为正（收入入口），got ${delta}`);
    this.dayFlip.check(this.data.daily.dateKey);
    this.data.economy.coins += delta;
    this.pushLedger(delta, reason);
    this.bumpStat('coinEarnTotal', delta);
    this.immediate('claimTask');
    bus.emit('coins:changed', { delta, reason, coins: this.data.economy.coins });
  }

  /** 支出唯一入口：余额不足即拒绝并回传失败（调用方 UI 摇头 + Caption） */
  spendCoins(delta: number, reason: string): boolean {
    if (delta <= 0) throw new Error(`spendCoins: delta 必须为正，got ${delta}`);
    if (this.data.economy.coins - delta < 0) return false; // 永不为负红线
    this.data.economy.coins -= delta;
    this.pushLedger(-delta, reason);
    this.immediate('purchase');
    bus.emit('coins:changed', { delta: -delta, reason, coins: this.data.economy.coins });
    return true;
  }

  // ---------------------------------------------------------------- 房间摆放

  getPlacement(): Record<string, string | null> {
    return { ...this.data.room.placement };
  }

  setPlacement(anchorId: string, furnId: string | null): void {
    this.data.room.placement[anchorId] = furnId;
    this.immediate('placement');
  }

  addFurniture(furnId: string): boolean {
    if (this.data.room.ownedFurniture.includes(furnId)) return false;
    this.data.room.ownedFurniture.push(furnId);
    return true;
  }

  getOwnedFurniture(): readonly string[] {
    return this.data.room.ownedFurniture;
  }

  /** ambienceLevel 棘轮（room §4.3：max(档位, 已存档值)，只升不降） */
  bumpAmbience(occupied: number): number {
    const tier = ambienceTierFromOccupied(occupied);
    const current = this.data.room.ambienceLevel ?? ambienceTierFromOccupied(this.countOccupied());
    this.data.room.ambienceLevel = Math.max(tier, current);
    return this.data.room.ambienceLevel;
  }

  getAmbienceLevel(): number {
    return this.data.room.ambienceLevel ?? ambienceTierFromOccupied(this.countOccupied());
  }

  countOccupied(): number {
    return Object.values(this.data.room.placement).filter((v) => v !== null && v !== undefined).length;
  }

  // ---------------------------------------------------------------- 行为计数（S09/S10 判据唯一源，local-save §3）

  /** 任一入口先惰性验日（daily §2.4：事件驱动判定，先翻转再处理） */
  bumpStat(key: StatKey, n = 1): void {
    const today = this.dayFlip.check(this.data.daily.dateKey);
    void today;
    this.data.stats[key] += n;
    bus.emit('stat:bump', { key, delta: n, total: this.data.stats[key] });
    this.policy.scheduleDebounced();
  }

  /** tryOnUnique 首穿判定（wardrobe §3：itemId 首次被试穿计 tryOnUnique——辅助清单 triedItems 判重） */
  noteTryOnUnique(itemId: string): boolean {
    if (!itemId || this.data.stats.triedItems.includes(itemId)) return false;
    this.data.stats.triedItems.push(itemId);
    this.bumpStat('tryOnUnique', 1);
    return true;
  }

  /** tryOn 计数口径（wardrobe §3 冻结：**每次成功 tryOn/unequip 均**计 tryOnTotal；首穿另计 tryOnUnique） */
  noteTryOn(itemId: string | null): { total: number; unique: boolean } {
    // 卸下（itemId=null）同样 +1（wardrobe §2.2 状态机「点选卡片（含卸下卡）→ bumpStat」）
    this.bumpStat('tryOnTotal', 1);
    const unique = itemId !== null ? this.noteTryOnUnique(itemId) : false;
    return { total: this.data.stats.tryOnTotal, unique };
  }

  getStats(): Readonly<SaveDataV1['stats']> {
    return { ...this.data.stats, triedItems: [...this.data.stats.triedItems] };
  }

  // ---------------------------------------------------------------- 成就

  getAchievement(achId: string): { progress: number; claimed: boolean } {
    return this.data.achievements[achId] ?? { progress: 0, claimed: false };
  }

  /** 领取即标记（发放走 addCoins/addItem 同源，economy §2.2；claimed 永久锁定） */
  claimAchievement(achId: string): boolean {
    const rec = this.data.achievements[achId] ?? { progress: 0, claimed: false };
    if (rec.claimed) return false;
    rec.claimed = true;
    this.data.achievements[achId] = rec;
    this.immediate('claimAchievement');
    return true;
  }

  // ---------------------------------------------------------------- 设置

  getAudioEnabled(): boolean {
    return this.data.settings.audioEnabled;
  }

  setAudioEnabled(enabled: boolean): void {
    this.data.settings.audioEnabled = enabled;
    this.immediate('settings'); // ADR-002 补丁附录 A：即时写清单
    bus.emit('settings:audioChanged', { enabled });
  }

  getReducedMotionOverride(): boolean | null {
    return this.data.settings.reducedMotionOverride;
  }

  // ---------------------------------------------------------------- 日期翻转 / 生命周期

  /** 日期翻转（local-save §2.3）：改结构 + 发事件；任务重抽归 S09 消费方 */
  private applyDayFlip(newDateKey: string): void {
    this.data.daily.dateKey = newDateKey;
    this.data.daily.tasks = []; // 进度清零/claimed 重置（任务清单重建归 S09）
    bus.emit('day:flip', { dateKey: newDateKey });
  }

  onDayFlip(cb: (dateKey: string) => void): () => void {
    return bus.on('day:flip', (p) => cb(p.dateKey));
  }

  /** 回前台/打开时主动验日（local-save §2.3；游戏引导层 visibilitychange→visible 调用） */
  checkDayFlipNow(): void {
    this.dayFlip.check(this.data.daily.dateKey);
  }

  /** 强制冲刷（生命周期钩子挂接由引导层调用） */
  attachLifecycleHooks(win: Window): () => void {
    return this.policy.attachLifecycleHooks(win);
  }

  flush(): void {
    this.policy.flushNow('flush');
  }

  /** 关页兜底冲刷 */
  dispose(): void {
    this.flush();
    this.storageOff?.();
  }

  // ---------------------------------------------------------------- 多标签页（ADR-002 §5）

  private attachStorageListener(): void {
    if (!this.driver.canListenStorageEvent()) return;
    if (typeof window === 'undefined') return;
    const onStorage = (ev: StorageEvent): void => {
      if (ev.key !== SAVE_KEY || ev.newValue === null) return;
      // 本地有未冲刷防抖数据 → 本地优先（延迟 500ms 后覆盖写，ADR-002 §5）
      if (this.policy.hasPending()) return;
      const parsed = this.serializer.parse(ev.newValue);
      if (parsed.ok) {
        // lastSeenAt 新者胜：整体替换
        this.data = parsed.data;
      }
    };
    window.addEventListener('storage', onStorage);
    this.storageOff = () => window.removeEventListener('storage', onStorage);
  }

  // ---------------------------------------------------------------- 测试辅助

  /** 测试/调试注入日期（D3-04：真实运行时用系统时钟） */
  setDailyTasksForTest(tasks: SaveDataV1['daily']['tasks']): void {
    this.data.daily.tasks = tasks;
  }

  rawForTest(): SaveDataV1 {
    return this.data;
  }

  /** 槽位语义辅助（S01 只关心可穿槽） */
  static isSlotAssignable(slot: SlotId): boolean {
    return slot !== 'BODY';
  }
}

/** 测试辅助：以指定日期构造（DayFlip 单测用） */
export { localDateKey };
