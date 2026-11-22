/**
 * 三十个虚拟日的星尘收支（economy §4.4 / §8.3）
 * 收入：每日 3 条任务，单条奖励读任务表。
 * 支出：只买商店池，标价从低到高，余额不够不买。
 * 成就：只发已经跨过阈值的条，数字读成就表。解锁池不进目录总价。
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACHIEVEMENTS, MILESTONE } from '../src/data/achievements';
import { CLOTHING_ITEMS } from '../src/data/items';
import { FURNITURE_ITEMS } from '../src/data/furniture';
import { DAILY_REWARD } from '../src/data/tasks';

const TASKS_PER_DAY = 3;
const CATALOG_TARGET = 18_000;
const DAY_LOW = 27;
const DAY_HIGH = 33;
const DAY_CAP = 60;

export interface SimDay {
  day: number;
  coins: number;
  earned: number;
  spent: number;
  owned: number;
}

export interface EconomySimReport {
  taskReward: number;
  tasksPerDay: number;
  dailyIncome: number;
  catalogTotal: number;
  catalogTarget: number;
  catalogLow: number;
  catalogHigh: number;
  catalogWithinBand: boolean;
  unlockMixedIntoCatalog: boolean;
  unlockPriceTotal: number;
  achievementRewardTotal: number;
  achievementPaid: number;
  milestonePaid: number;
  daysToComplete: number | null;
  daysWithinBand: boolean;
  minCoins: number;
  coinsNeverNegative: boolean;
  shopSize: number;
  days: SimDay[];
  assumptions: string[];
}

interface Offer {
  kind: 'clothing' | 'furniture';
  price: number;
}

interface Ledger {
  coins: number;
  minCoins: number;
  coinEarn: number;
  loginDays: number;
  clothes: number;
  furniture: number;
  claimed: Set<string>;
  milestonesPaid: number;
  achievementPaid: number;
  milestoneCoins: number;
}

const shopOffers = (): Offer[] => {
  const clothing = CLOTHING_ITEMS.filter((item) => item.pool === 'shop').map((item) => ({
    kind: 'clothing' as const,
    price: item.price,
  }));
  const furniture = FURNITURE_ITEMS.filter((item) => item.pool === 'shop').map((item) => ({
    kind: 'furniture' as const,
    price: item.price,
  }));
  return [...clothing, ...furniture].sort((a, b) => a.price - b.price || (a.kind === 'clothing' ? -1 : 1));
};

const unlockPriceTotal = (): number =>
  CLOTHING_ITEMS.filter((item) => item.pool === 'unlock').reduce((sum, item) => sum + item.price, 0) +
  FURNITURE_ITEMS.filter((item) => item.pool === 'unlock').reduce((sum, item) => sum + item.price, 0);

const statOf = (ledger: Ledger, statKey: string): number => {
  if (statKey === 'itemsOwnedTotal') return ledger.clothes;
  if (statKey === 'furnitureOwnedTotal') return ledger.furniture;
  if (statKey === 'ownedAllTotal') return ledger.clothes + ledger.furniture;
  if (statKey === 'coinEarnTotal') return ledger.coinEarn;
  if (statKey === 'loginDaysTotal') return ledger.loginDays;
  return 0;
};

const credit = (ledger: Ledger, amount: number): void => {
  ledger.coins += amount;
  ledger.coinEarn += amount;
  if (ledger.coins < ledger.minCoins) ledger.minCoins = ledger.coins;
};

/** 里程碑与已达成成就。未跨过阈值的不发星尘。循环到不再有新入账。 */
const settle = (ledger: Ledger): void => {
  let changed = true;
  while (changed) {
    changed = false;
    const owned = ledger.clothes + ledger.furniture;
    const due = Math.floor(owned / MILESTONE.perItems);
    while (ledger.milestonesPaid < due) {
      ledger.milestonesPaid += 1;
      ledger.milestoneCoins += MILESTONE.reward;
      credit(ledger, MILESTONE.reward);
      changed = true;
    }
    for (const def of ACHIEVEMENTS) {
      if (ledger.claimed.has(def.achId)) continue;
      if (statOf(ledger, def.statKey) < def.threshold) continue;
      const coins = def.reward.coins ?? 0;
      if (coins <= 0) continue;
      ledger.claimed.add(def.achId);
      ledger.achievementPaid += coins;
      credit(ledger, coins);
      changed = true;
    }
  }
};

export const runEconomySim = (): EconomySimReport => {
  const offers = shopOffers();
  const catalogTotal = offers.reduce((sum, offer) => sum + offer.price, 0);
  const achievementRewardTotal = ACHIEVEMENTS.reduce((sum, def) => sum + (def.reward.coins ?? 0), 0);
  const ledger: Ledger = {
    coins: 0,
    minCoins: 0,
    coinEarn: 0,
    loginDays: 0,
    clothes: 0,
    furniture: 0,
    claimed: new Set(),
    milestonesPaid: 0,
    achievementPaid: 0,
    milestoneCoins: 0,
  };
  const days: SimDay[] = [];
  let cursor = 0;
  let daysToComplete: number | null = null;

  for (let day = 1; day <= DAY_CAP && cursor < offers.length; day += 1) {
    const earnedBefore = ledger.coinEarn;
    const spentBefore = catalogTotal - offers.slice(cursor).reduce((sum, offer) => sum + offer.price, 0);
    ledger.loginDays += 1;
    credit(ledger, DAILY_REWARD * TASKS_PER_DAY);
    settle(ledger);
    while (cursor < offers.length && offers[cursor]!.price <= ledger.coins) {
      const offer = offers[cursor]!;
      ledger.coins -= offer.price;
      if (ledger.coins < ledger.minCoins) ledger.minCoins = ledger.coins;
      if (offer.kind === 'clothing') ledger.clothes += 1;
      else ledger.furniture += 1;
      cursor += 1;
      settle(ledger);
    }
    const spent = catalogTotal - offers.slice(cursor).reduce((sum, offer) => sum + offer.price, 0);
    days.push({
      day,
      coins: ledger.coins,
      earned: ledger.coinEarn - earnedBefore,
      spent: spent - spentBefore,
      owned: ledger.clothes + ledger.furniture,
    });
    if (cursor >= offers.length) daysToComplete = day;
  }

  const catalogLow = CATALOG_TARGET * 0.9;
  const catalogHigh = CATALOG_TARGET * 1.1;
  const catalogWithinBand = catalogTotal >= catalogLow && catalogTotal <= catalogHigh;
  const daysWithinBand =
    daysToComplete !== null && daysToComplete >= DAY_LOW && daysToComplete <= DAY_HIGH;

  return {
    taskReward: DAILY_REWARD,
    tasksPerDay: TASKS_PER_DAY,
    dailyIncome: DAILY_REWARD * TASKS_PER_DAY,
    catalogTotal,
    catalogTarget: CATALOG_TARGET,
    catalogLow,
    catalogHigh,
    catalogWithinBand,
    unlockMixedIntoCatalog: false,
    unlockPriceTotal: unlockPriceTotal(),
    achievementRewardTotal,
    achievementPaid: ledger.achievementPaid,
    milestonePaid: ledger.milestoneCoins,
    daysToComplete,
    daysWithinBand,
    minCoins: ledger.minCoins,
    coinsNeverNegative: ledger.minCoins >= 0,
    shopSize: offers.length,
    days,
    assumptions: [
      '每日收入 = 任务表单条奖励 × 3，不另写 150。',
      '目录总价 = 服装商店池 + 家具商店池。解锁池标价单独列出，不加入总价。',
      '购买顺序为标价从低到高。余额小于标价时不买，星尘不为负。',
      '成就只在本模拟已经发生的计数上领取：购入件数、累计星尘、登录天数。试穿、造型、摆放和限定收藏没有写入本卡的日均次数，不另设计数，因此不发那些条的星尘。',
      '里程碑按已拥有件数每 3 件 60 星尘，件数只含本模拟买到的商店物品。',
    ],
  };
};

export const renderSimReport = (report: EconomySimReport): string => {
  const dayText = report.daysToComplete === null ? '未集齐' : String(report.daysToComplete);
  const judgment = report.catalogWithinBand && report.daysWithinBand ? '通过' : '未通过';
  return [
    '# SPEC-0006 三十日模拟',
    '',
    `- 判定： ${judgment}`,
    `- 目录总价： ${report.catalogTotal}（GDD 18,000 的 ±10% 为 ${report.catalogLow}–${report.catalogHigh}，${report.catalogWithinBand ? '在区间内' : '出界'}）`,
    `- 集齐天数： ${dayText}（区间 27–33，${report.daysWithinBand ? '在区间内' : '出界'}）`,
    `- 解锁池标价： ${report.unlockPriceTotal}，未混入目录`,
    `- 成就表星尘合计： ${report.achievementRewardTotal}；本模拟实发： ${report.achievementPaid}`,
    `- 未发生的成就星尘： ${report.achievementRewardTotal - report.achievementPaid}。这些条的计数没有日均次数，实发里不含它们。若提前全发，集齐会再快约 ${((report.achievementRewardTotal - report.achievementPaid) / report.dailyIncome).toFixed(1)} 天。`,
    `- 里程碑实发： ${report.milestonePaid}`,
    `- 每日任务收入： ${report.tasksPerDay} × ${report.taskReward} = ${report.dailyIncome}`,
    `- 商店件数： ${report.shopSize}`,
    `- 全程最低星尘： ${report.minCoins}`,
    '',
    '## 输入假设',
    '',
    ...report.assumptions.map((line) => `- ${line}`),
    '',
    '## 逐日余额',
    '',
    '| 日 | 当日入账 | 当日支出 | 日终星尘 | 已拥有 |',
    '|---:|---:|---:|---:|---:|',
    ...report.days.map((day) => `| ${day.day} | ${day.earned} | ${day.spent} | ${day.coins} | ${day.owned} |`),
    '',
  ].join('\n');
};

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectRun) {
  const report = runEconomySim();
  const body = renderSimReport(report);
  const path = resolve(dirname(fileURLToPath(import.meta.url)), '../docs/sdd/evidence/SPEC-0006/sim.md');
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, body, 'utf8');
  console.log(body);
}
