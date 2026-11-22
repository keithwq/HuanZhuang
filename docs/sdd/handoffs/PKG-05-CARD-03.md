# Handoff

- Repository: D:\games\HuanZhuang
- Spec ID: SPEC-0005
- Card: PKG-05 CARD-03 页内详情与 M2 记录
- Next Card: docs/sdd/packages/PKG-06-achievements/CARD-01.md
- Changed Files: `src/systems/shop/catalog.ts`（`revealShopDetail` 只在商店层已打开时返回详情）；`src/core/scenes/UiScene.ts`（点卡片左侧在页内展开详情；任务已领取后出现「去商店」，关掉任务层再开商店）；`tests/unit/shop.spec.ts`；`production/epics/E4-economy-loop.md` 的 E4-S02 状态格；`docs/sdd/evidence/SPEC-0005/runtime.md`；`docs/sdd/specs/SPEC-0006-achievements-sim.md` 与 `docs/sdd/specs/INDEX.md` 中 SPEC-0006 改为 IMPLEMENTING；本交接；`docs/sdd/NOW.md`；`docs/sdd/packages/INDEX.md`
- Allowed Files Check: PASSED
- Static Checks: `npx tsc --noEmit` 退出码 0
- Runtime Checks: `npx vitest run tests/unit/shop.spec.ts tests/unit/daily.spec.ts tests/unit/hud.spec.ts tests/unit/mode-switch.spec.ts` 退出码 0。4 个文件、54 条通过（shop 14，daily 15，hud 16，mode-switch 9）。AC-04 在 `tests/unit/shop.spec.ts`：商店打开时读详情，覆盖层仍是 shop，再开造型层被拒绝。M2 单测是试穿计数 5、领取 t_a1 的 150、买一件不高于 150 的服装并入柜。
- Manual Acceptance: NOT PERFORMED
- Known Gaps: 浏览器走查 BLOCKED，SPEC-0005 因此仍是 IMPLEMENTING。筛选 chips 未做。余额不足的 toast 仍然不带跳转按钮。
- Overall: PARTIAL
- Non-Goals: 未改 150 和标价，未把详情做成第二层覆盖层

SPEC-0006 已改为 IMPLEMENTING。下一张卡按索引开工。
