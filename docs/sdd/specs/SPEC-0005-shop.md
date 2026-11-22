# SPEC-0005: 商店

- Spec ID: SPEC-0005
- Status: IMPLEMENTING
- Package: PKG-05
- Last Updated: 2026-11-22

## 用户目标

玩家用星尘买一件还没有的服装或家具，余额不够时买不成，已经拥有的不能再买。买到的服装立刻可以穿，家具立刻可以摆。

## 范围

- 商店覆盖层两个页签：服装、家具。筛选与详情在页内展开，不再叠一层覆盖层。
- 购入走 `SaveService` 已有入柜入口。余额不足拒绝且不扣费。
- 已拥有显示徽章并不可再购。
- 点亮底部「商店」页签。

## 非范围

- 不改定价公式与 45/30 件数。
- 不实现成就领取。
- 不做压迫式红光。余额不足用已有摇头与 toast。

## 规则

- economy §8.2、§8.5、§8.7。
- 商店合计以 `tests/unit/data-tables.spec.ts` 为准，不在本 SPEC 改价。

## 验收场景

| 编号 | 前置 | 操作 | 可见结果 | 证据 |
|---|---|---|---|---|
| AC-01 | 余额足够且未拥有 | 购买 | 扣费、入柜、徽章变为已拥有 | 单测 |
| AC-02 | 余额不足 | 购买 | 余额不变，摇头与 toast | 单测 |
| AC-03 | 已拥有 | 再点购买 | 拒绝，不产生第二件 | 单测 |
| AC-04 | 商店已打开 | 点详情 | 详情在页内展开，覆盖层仍只有商店一层 | 单测 |

## 允许修改的文件

- `src/systems/shop/purchase.ts`（新）
- `src/systems/shop/catalog.ts`（新，只读过滤已有数据表）
- `src/core/scenes/UiScene.ts`
- `src/systems/hud/OverlayManager.ts`（仅当缺 shop 页类型）
- `tests/unit/shop.spec.ts`（新）
- 交接、NOW、包索引、本 SPEC 状态行、E4-S02 状态格

## 依赖与取代

- Dependencies: SPEC-0004 的领奖能产生星尘；购入逻辑本身可用测试直接加币，不把任务 UI 当购买前置
- Risks: 服装入柜后的试穿依赖现有衣柜，不重写试穿状态机
- Supersedes: 无
- Superseded By: 无

## 任务卡

1. [CARD-01](../packages/PKG-05-shop/CARD-01.md)
2. [CARD-02](../packages/PKG-05-shop/CARD-02.md)
3. [CARD-03](../packages/PKG-05-shop/CARD-03.md)

## 证据计划

单测覆盖 AC-01 至 AC-04。M2 走查（试穿、领 150、购买、入柜、再试穿）写在末卡交接；浏览器没跑则该项 `BLOCKED`，单测通过仍可进入下一包。
