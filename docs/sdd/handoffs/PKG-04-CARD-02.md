# Handoff

- Repository: D:\games\HuanZhuang
- Spec ID: SPEC-0004
- Card: PKG-04 CARD-02 进度与领取
- Next Card: docs/sdd/packages/PKG-04-daily/CARD-03.md
- Changed Files: `src/systems/daily/progress.ts`（匹配 stat 的当日任务进度 += delta；领取走 `addCoins(reward, 'daily_task')`，未达成或已领拒绝）；`src/systems/save/SaveService.ts`（`bumpStat` 当帧调用进度推进；`setDailyProgress` / `markDailyClaimed`）；`tests/unit/daily.spec.ts`；本交接；`docs/sdd/NOW.md`；`docs/sdd/packages/INDEX.md`
- Allowed Files Check: PASSED
- Static Checks: `npx tsc --noEmit` 退出码 0
- Runtime Checks: `npx vitest run tests/unit/daily.spec.ts tests/unit/save-api.spec.ts` 退出码 0。2 个文件、28 条通过（daily 10，save-api 18）。AC-02、AC-03 在 `tests/unit/daily.spec.ts`。三连领取后星尘 450，账本 3 条 `daily_task`，再领不加币。
- Manual Acceptance: NOT PERFORMED
- Known Gaps: 日切重抽、顶导入口和角标不在本卡。游戏启动仍未主动调用抽取。
- Overall: PASSED
- Non-Goals: 未在任务模块里直接改 `coins` 字段

下一张卡按索引开工。
