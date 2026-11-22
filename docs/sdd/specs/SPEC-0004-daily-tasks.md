# SPEC-0004: 每日任务

- Spec ID: SPEC-0004
- Status: IMPLEMENTING
- Package: PKG-04
- Last Updated: 2026-11-22

## 用户目标

玩家每天看到 3 条做得到的任务，做完能逐条领取 150 星尘，次日重新抽，不会看到过期进度。

## 范围

- 三槽位各抽 1 条。零家具新档不抽 `hasFurniture` 任务。
- 进度只用现有 stats，当帧 +1。领取走 `SaveService` 已有收入入口，`reason` 为 `daily_task`。
- 日切后任务列表重建。顶导角标等于未领取且已达成的条数。
- 任务文案只用 `src/data/tasks.ts` 已有 11 条，不改文案。

## 非范围

- 不做商店购买。任务里「从商店带回」只计数，购入本身是 SPEC-0005。
- 不改 150 与日均 450。
- 不新写第二套计数器。

## 规则

- daily §8.1 至 §8.8，见 `production/epics/E4-economy-loop.md` 的 E4-S04 行。
- 日切清列表已在 `SaveService`，重抽归本 SPEC。

## 验收场景

| 编号 | 前置 | 操作 | 可见结果 | 证据 |
|---|---|---|---|---|
| AC-01 | 新档且无家具 | 生成当日任务 | 恰好 3 条，槽位 A/B/C，无家具任务 | 单测 |
| AC-02 | 任务进度差 1 | 完成对应操作 | 当帧进度 +1 | 单测 |
| AC-03 | 任务已达成未领 | 领取 | 星尘 +150，账本原因 `daily_task`，不可再领 | 单测 |
| AC-04 | 已有进度 | 日期翻篇 | 进度清空并重抽 | 单测 |
| AC-05 | 两条已达成未领 | 看角标 | 显示 2；大于 9 时显示 9+ 的规则沿用 hud §8.5 | 单测 |

## 允许修改的文件

- `src/systems/daily/draw.ts`（新）
- `src/systems/daily/progress.ts`（新）
- `src/systems/save/SaveService.ts`（只接重抽与领取，不改币余额约束）
- `src/core/scenes/UiScene.ts`（任务入口与角标）
- `tests/unit/daily.spec.ts`（新）
- 交接、NOW、包索引、本 SPEC 状态行、E4-S04 状态格

## 依赖与取代

- Dependencies: E1-S04 日切、E4-S01 任务表。不依赖房间舞台是否已可见；家具任务的可达性用拥有数据判断。
- Risks: 与试穿计数的双写。进度只监听已有 stats。
- Supersedes: 无
- Superseded By: 无

## 任务卡

1. [CARD-01](../packages/PKG-04-daily/CARD-01.md)
2. [CARD-02](../packages/PKG-04-daily/CARD-02.md)
3. [CARD-03](../packages/PKG-04-daily/CARD-03.md)

## 证据计划

`tests/unit/daily.spec.ts` 覆盖 AC-01 至 AC-05，含 23:59:59 与连领。浏览器未跑则运行证据 `BLOCKED`。
