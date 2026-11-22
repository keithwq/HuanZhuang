# Handoff

- Repository: D:\games\HuanZhuang
- Spec ID: SPEC-0004
- Card: PKG-04 CARD-01 三槽位抽取
- Next Card: docs/sdd/packages/PKG-04-daily/CARD-02.md
- Changed Files: `src/systems/daily/draw.ts`（槽 A/B/C 各抽 1 条；空槽从其余可达池补足且不与已抽条目重复；无家具不抽 `hasFurniture`，没有未试穿单品不抽 `hasUntriedOwnedItem`；同一 dateKey 已有 3 条时不替换）；`src/systems/save/SaveService.ts`（`getDailyTasks` / `getDailyDateKey` / `syncDailyDate` / `commitDailyTasks`，已有 3 条时拒绝覆盖）；`tests/unit/daily.spec.ts`；本交接；`docs/sdd/NOW.md`；`docs/sdd/packages/INDEX.md`
- Allowed Files Check: PASSED
- Static Checks: `npx tsc --noEmit` 退出码 0
- Runtime Checks: `npx vitest run tests/unit/daily.spec.ts tests/unit/save-api.spec.ts tests/unit/data-tables.spec.ts` 退出码 0。3 个文件、47 条通过（daily 6，save-api 18，data-tables 23）。AC-01 在 `tests/unit/daily.spec.ts`，包含零家具新档和另一组随机回退。
- Manual Acceptance: NOT PERFORMED
- Known Gaps: 游戏启动和日切还没有调用抽取。进度、领取、角标不在本卡。
- Overall: PASSED
- Non-Goals: 未做领取按钮，未改 11 条文案和 150 星尘

下一张卡按索引开工。
