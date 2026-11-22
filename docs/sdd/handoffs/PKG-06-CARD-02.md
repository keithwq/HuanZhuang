# Handoff

- Repository: D:\games\HuanZhuang
- Spec ID: SPEC-0006
- Card: PKG-06 CARD-02 三十日模拟
- Next Card: docs/sdd/packages/PKG-06-achievements/CARD-03.md
- Changed Files: `tools/economy-sim.ts`（每日 3×150，只买商店池，标价从低到高，已达成成就和里程碑入账，星尘不为负）；`tests/unit/achievements.spec.ts`（目录不混入解锁池、任务奖励仍是 150、逐日余额不为负）；`docs/sdd/evidence/SPEC-0006/sim.md`；本交接；`docs/sdd/NOW.md`；`docs/sdd/packages/INDEX.md`
- Allowed Files Check: PASSED
- Static Checks: `npx tsc --noEmit` 退出码 0
- Runtime Checks: `npx tsx tools/economy-sim.ts` 退出码 0。目录总价 16560，落在 16200–19800。集齐天数 30，落在 27–33。解锁池 5820 未混入。成就表合计 4420，本模拟实发 2480，里程碑 1260，全程最低星尘 0。`npx vitest run tests/unit/achievements.spec.ts` 退出码 0。
- Manual Acceptance: NOT PERFORMED
- Known Gaps: 试穿、造型、摆放和限定收藏没有日均次数，模拟不发这 1940 星尘。若把它们提前全发，集齐大约再快 4.3 天。
- Overall: PASSED
- Non-Goals: 未改 `tools/reckon.ts`，未改价格表

判定通过。下一张卡按索引开工。
