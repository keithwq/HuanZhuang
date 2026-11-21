/**
 * DayFlip · 日期翻转惰性判定（E1-S04，local-save §2.3 / daily §2.4 / D3-04 不设防）
 * 口径：任何 bumpStat / addCoins / 写入入口先执行 check()；dateKey 字符串不等即翻转
 * （天然覆盖跨月跨年，local-save §5.4）；不做时间戳校验、不做回拨防护（接受改时间可刷）。
 */

export type DateKeyFn = () => string;

/** 本地 YYYY-MM-DD（纯本地时钟，D3-04） */
export const localDateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const defaultDateKeyFn: DateKeyFn = () => localDateKey(new Date());

export class DayFlip {
  constructor(
    /** 翻转回调（SaveService 负责改结构 + 发 day:flip 事件；S09 消费方重抽任务） */
    private onFlip: (newDateKey: string) => void,
    private now: DateKeyFn = defaultDateKeyFn,
  ) {}

  /**
   * 惰性判定：返回当前应生效 dateKey；与存档不等 → 翻转并返回新键。
   * 调用方在处理事件前必须先跑本方法（daily §5.1：先翻转再入新日 progress 起点，不丢弃不双计）。
   */
  check(storedDateKey: string): string {
    const today = this.now();
    if (storedDateKey === today) return today;
    this.onFlip(today);
    return today;
  }
}
