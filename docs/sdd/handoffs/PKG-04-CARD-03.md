# Handoff

- Repository: D:\games\HuanZhuang
- Spec ID: SPEC-0004
- Card: PKG-04 CARD-03 日切、角标与任务入口
- Next Card: docs/sdd/packages/PKG-05-shop/CARD-01.md
- Changed Files: `src/systems/daily/draw.ts`（日期翻转后重抽 3 条；抽取进行中不再套一层随机）；`src/systems/daily/progress.ts`（角标文案、任务列表行）；`src/core/scenes/UiScene.ts`（顶导「任务」入口、任务列表、角标）；`src/systems/save/SaveService.ts` 未再改行为；`tests/unit/daily.spec.ts`；`production/epics/E4-economy-loop.md` 的 E4-S04 状态格；`docs/sdd/specs/SPEC-0005-shop.md` 与 `docs/sdd/specs/INDEX.md` 中 SPEC-0005 改为 IMPLEMENTING；本交接；`docs/sdd/NOW.md`；`docs/sdd/packages/INDEX.md`
- Allowed Files Check: PASSED
- Static Checks: `npx tsc --noEmit` 退出码 0
- Runtime Checks: `npx vitest run tests/unit/daily.spec.ts tests/unit/save-api.spec.ts tests/unit/hud.spec.ts` 退出码 0。3 个文件、49 条通过（daily 15，save-api 18，hud 16）。AC-04、AC-05 在 `tests/unit/daily.spec.ts`。23:59:59 的试穿先翻页，只把这一次计入新的一天。任务层打开时再开别的覆盖层会被拒绝。
- Manual Acceptance: NOT PERFORMED
- Known Gaps: 余额不足去商店的引导链没做，留给 PKG-05，不新造引导文案。浏览器里顶导能看到「任务」，自动点击没有确认列表打开，这段画面证据记为 BLOCKED。SPEC-0004 因此仍是 IMPLEMENTING。
- Overall: PARTIAL
- Non-Goals: 未做商店跳转，未把「星尘不够啦」写成新文案

SPEC-0005 已改为 IMPLEMENTING。下一张卡按索引开工。
