/**
 * 成就清单 21 条（E4-S01，economy §2.2 三类分组 + room §2.5 家具判据冻结值）
 * 红线（economy §5.6）：里程碑与成就判据阈值错开设计，无双计价。
 * 数值冻结（room §2.5）：星图小屋 ≥11 位 / 满室星辉 ≥17 位 / 学院新居 ≥1 / 房间的心跳 ≥10。
 */

export type AchievementGroup = 'collection' | 'behavior' | 'progress';

export interface AchievementDef {
  achId: string;
  name: string;
  desc: string;
  group: AchievementGroup;
  /** 判据：stats 键 + 阈值（economy §2.2 判据唯一源） */
  statKey: string;
  threshold: number;
  /** 奖励：星尘 或 物品（发放走 addCoins/addItem 唯一路径） */
  reward: { coins?: number; itemId?: string };
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  // ———— 收集类 9 条 ————
  { achId: 'ac_c1', name: '初见星光', desc: '第一次让新单品上身', group: 'collection', statKey: 'tryOnUnique', threshold: 1, reward: { coins: 60 } },
  { achId: 'ac_c2', name: '半柜星辉', desc: '衣柜里攒下 20 件服装', group: 'collection', statKey: 'itemsOwnedTotal', threshold: 20, reward: { coins: 120 } },
  { achId: 'ac_c3', name: '满柜圆舞曲', desc: '收齐商店里每一件服装', group: 'collection', statKey: 'itemsOwnedTotal', threshold: 39, reward: { coins: 500 } },
  { achId: 'ac_c4', name: '学院新居', desc: '第一次把家具摆进小屋', group: 'collection', statKey: 'furniturePlacedTotal', threshold: 1, reward: { coins: 60 } },
  { achId: 'ac_c5', name: '星图小屋', desc: '点亮 11 个摆位的星光', group: 'collection', statKey: 'placedAnchors', threshold: 11, reward: { coins: 180 } },
  { achId: 'ac_c6', name: '满室星辉', desc: '让 17 个摆位都亮起来', group: 'collection', statKey: 'placedAnchors', threshold: 17, reward: { coins: 300 } },
  { achId: 'ac_c7', name: '星尘花匠', desc: '收齐商店里每一件家具', group: 'collection', statKey: 'furnitureOwnedTotal', threshold: 24, reward: { coins: 400 } },
  { achId: 'ac_c8', name: '双柜满藏', desc: '服装与家具合计拥有 60 件', group: 'collection', statKey: 'ownedAllTotal', threshold: 60, reward: { coins: 300 } },
  { achId: 'ac_c9', name: '限定收藏家', desc: '集齐 6 件成就限定单品', group: 'collection', statKey: 'unlockOwnedTotal', threshold: 6, reward: { coins: 300 } },
  // ———— 行为类 7 条 ————
  { achId: 'ac_b1', name: '试衣间常客', desc: '试穿 50 件次单品', group: 'behavior', statKey: 'tryOnTotal', threshold: 50, reward: { coins: 80 } },
  { achId: 'ac_b2', name: '百变星夜', desc: '试穿 300 件次单品', group: 'behavior', statKey: 'tryOnTotal', threshold: 300, reward: { coins: 200 } },
  { achId: 'ac_b3', name: '搭配练习生', desc: '试穿 100 件次单品', group: 'behavior', statKey: 'tryOnTotal', threshold: 100, reward: { coins: 120 } },
  { achId: 'ac_b4', name: '造型师手记', desc: '保存 3 个造型', group: 'behavior', statKey: 'lookSavedTotal', threshold: 3, reward: { coins: 80 } },
  { achId: 'ac_b5', name: '九格星图', desc: '集满 9 个造型', group: 'behavior', statKey: 'lookSavedTotal', threshold: 9, reward: { coins: 200 } },
  { achId: 'ac_b6', name: '房间的心跳', desc: '摆放 10 次家具', group: 'behavior', statKey: 'furniturePlacedTotal', threshold: 10, reward: { coins: 120 } },
  { achId: 'ac_b7', name: '小屋策展人', desc: '摆放 30 次家具', group: 'behavior', statKey: 'furniturePlacedTotal', threshold: 30, reward: { coins: 240 } },
  // ———— 进度类 5 条（累计制，非连续制——无断签惩罚，economy §2.2）————
  { achId: 'ac_p1', name: '星尘学徒', desc: '累计获得 300 星尘', group: 'progress', statKey: 'coinEarnTotal', threshold: 300, reward: { coins: 60 } },
  { achId: 'ac_p2', name: '星尘收藏家', desc: '累计获得 1,000 星尘', group: 'progress', statKey: 'coinEarnTotal', threshold: 1000, reward: { coins: 200 } },
  { achId: 'ac_p3', name: '星尘大师', desc: '累计获得 5,000 星尘', group: 'progress', statKey: 'coinEarnTotal', threshold: 5000, reward: { coins: 600 } },
  { achId: 'ac_p4', name: '学院新面孔', desc: '累计来到学院 3 天', group: 'progress', statKey: 'loginDaysTotal', threshold: 3, reward: { coins: 60 } },
  { achId: 'ac_p5', name: '常驻学院', desc: '累计来到学院 14 天', group: 'progress', statKey: 'loginDaysTotal', threshold: 14, reward: { coins: 240 } },
];

export const achievementById = (achId: string): AchievementDef | undefined =>
  ACHIEVEMENTS.find((a) => a.achId === achId);

/**
 * 收集里程碑（economy §4.3：每累计拥有 +3 件 → 60 星尘；全程 75 件 → 25 次 = 1,500 固定池）
 * 判据 = itemsOwnedTotal + furnitureOwnedTotal 合计（判据键与成就阈值错开——§5.6 红线：
 * 里程碑按件数累计、成就按系列完成度，逐条无重叠）。
 */
export const MILESTONE = { perItems: 3, reward: 60 } as const;
