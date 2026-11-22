# Handoff

- Repository: D:\games\HuanZhuang
- Spec ID: SPEC-0006
- Card: PKG-06 CARD-03 双计价核对
- Next Card: docs/sdd/packages/PKG-07-residuals/CARD-01.md
- Changed Files: `tests/unit/achievements.spec.ts`（AC-04：没有成就使用合计拥有每 3 件；21 条成就的判据键和阈值两两不同）；`docs/sdd/evidence/SPEC-0006/overlap.md`；`production/epics/E4-economy-loop.md` 的 E4-S03 与 E4-S05 状态格；`docs/sdd/specs/SPEC-0007-residual-partials.md` 与 `docs/sdd/specs/INDEX.md` 中 SPEC-0007 改为 IMPLEMENTING；本交接；`docs/sdd/NOW.md`；`docs/sdd/packages/INDEX.md`
- Allowed Files Check: PASSED
- Static Checks: `npx tsc --noEmit` 退出码 0
- Runtime Checks: `npx vitest run tests/unit/achievements.spec.ts` 退出码 0。12 条通过。AC-04 断言里程碑仍是每 3 件 60 星尘，没有成就再用 `ownedAllTotal:3`，21 条成就的键和阈值不重复。
- Manual Acceptance: NOT PERFORMED
- Known Gaps: `ac_c8` 的阈值 60 能被 3 整除。比对按里程碑配置的阈值 3，不把每个倍数当成另一条阈值。未改这条数据。
- Overall: PASSED
- Non-Goals: 未改任何成就阈值或里程碑

SPEC-0007 已改为 IMPLEMENTING。下一张卡按索引开工。
