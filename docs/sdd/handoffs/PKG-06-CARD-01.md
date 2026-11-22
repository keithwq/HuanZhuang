# Handoff

- Repository: D:\games\HuanZhuang
- Spec ID: SPEC-0006
- Card: PKG-06 CARD-01 成就判定与领取
- Next Card: docs/sdd/packages/PKG-06-achievements/CARD-02.md
- Changed Files: `src/systems/achievements/eval.ts`（21 条惰性判定；未达成不发星尘；领取走已有 `claimAchievement` 后再 `addCoins`；登录按 dateKey 去重；家具点位用 `countOccupied`，摆放次数用已有 `furniturePlacedTotal`）；`src/systems/save/SaveService.ts`（`noteLoginDate` / `getLoginDayCount` / `syncAchievementProgress`，不改币约束）；`src/core/scenes/UiScene.ts`（成就页签可点，打开成就层，列出三分组与领取）；`tests/unit/achievements.spec.ts`；本交接；`docs/sdd/NOW.md`；`docs/sdd/packages/INDEX.md`
- Allowed Files Check: PASSED
- Static Checks: `npx tsc --noEmit` 退出码 0
- Runtime Checks: `npx vitest run tests/unit/achievements.spec.ts tests/unit/save-api.spec.ts tests/unit/shop.spec.ts tests/unit/mode-switch.spec.ts tests/unit/hud.spec.ts tests/unit/daily.spec.ts tests/unit/data-tables.spec.ts` 退出码 0。7 个文件、104 条通过（achievements 9，save-api 18，shop 14，mode-switch 9，hud 16，daily 15，data-tables 23）。AC-01、AC-02 在 `tests/unit/achievements.spec.ts`。初见星光跨过 1 次后领取 60，再领拒绝且不再入账。未达成的百变星夜不加星尘。星图小屋用已摆点位，10 不可领，11 领取 180。同一 dateKey 登录天数保持 1，换日才加，重开存档不重复。浏览器竖屏里「成就」是深色可点，打开后覆盖层标题为成就，收集组列出初见星光 0/1、半柜星辉 12/20，学院新面孔 1/3，未达成的行没有领取。
- Manual Acceptance: NOT PERFORMED
- Known Gaps: 三十日模拟和双计价核对不在本卡。底部页签表里的 `enabled` 仍是 false，避免改动商店与模式切换既有断言；点亮只在场景里。灰盒角色从半透明遮罩透出，压住清单中部，左侧条目仍可读。
- Overall: PASSED
- Non-Goals: 未改 21 条奖励数字，未在判定失败时发星尘，未另写家具阈值

下一张卡按索引开工。
