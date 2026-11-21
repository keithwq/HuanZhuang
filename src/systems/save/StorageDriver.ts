/**
 * StorageDriver · localStorage 唯一接触点 + 降级决策（E1-S02，ADR-002 §2）
 * 红线（checklist §3-1）：本模块是全项目唯一允许引用 localStorage 的文件。
 */

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** localStorage 不可用（隐私模式/被禁 cookie，local-save §5.1）时的内存会话档 */
class MemoryStorage implements StorageLike {
  private map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
}

export class QuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuotaError';
  }
}

export class StorageDriver {
  private store: StorageLike;
  private degraded: boolean;
  /** 降级提示只发一次（local-save §5.1：一次性 toast，不弹窗打断摆弄） */
  private degradedNotified = false;

  constructor(probeKey = '__hz_probe__') {
    this.store = this.probeRealStorage(probeKey);
    this.degraded = this.store instanceof MemoryStorage;
  }

  /** 探测式写入（ADR-002 §2）：写入并回读临时键失败 → 内存会话档 */
  private probeRealStorage(probeKey: string): StorageLike {
    try {
      const ls = globalThis.localStorage;
      if (!ls) return new MemoryStorage();
      ls.setItem(probeKey, '1');
      const ok = ls.getItem(probeKey) === '1';
      ls.removeItem(probeKey);
      return ok ? ls : new MemoryStorage();
    } catch {
      // 隐私模式访问即抛（local-save §5.1 已知行为）
      return new MemoryStorage();
    }
  }

  isDegraded(): boolean {
    return this.degraded;
  }

  /** 首次降级提示（本会话唯一一次；SaveService 转发为 toast 事件） */
  consumeDegradedNotice(): boolean {
    if (this.degraded && !this.degradedNotified) {
      this.degradedNotified = true;
      return true;
    }
    return false;
  }

  read(key: string): string | null {
    try {
      return this.store.getItem(key);
    } catch {
      return null;
    }
  }

  /**
   * 写入（同步）。配额失败（local-save §5.2）抛 QuotaError 由 WritePolicy 走降级链：
   * 丢 ledger 尾部重写一次 → 仍失败转内存会话档。
   */
  write(key: string, value: string): void {
    this.store.setItem(key, value);
  }

  remove(key: string): void {
    try {
      this.store.removeItem(key);
    } catch {
      /* 降级态无副作用 */
    }
  }

  /** 多标签页广播（ADR-002 §5）：真实 localStorage 才有 storage 事件 */
  canListenStorageEvent(): boolean {
    return !this.degraded;
  }
}
