# Handoff

- Repository: D:\games\HuanZhuang
- Spec ID: SPEC-0003
- Card: PKG-03 CARD-03 M3 证据
- Next Card: docs/sdd/packages/PKG-04-daily/CARD-01.md
- Changed Files: `src/systems/room/stage.ts`（离开换装时释放本舞台登记的灰盒纹理）；`tests/unit/mode-switch.spec.ts`；`docs/sdd/evidence/SPEC-0003/runtime.md`；`docs/sdd/specs/SPEC-0003-mode-ambience.md` 状态改为 VERIFIED；`docs/sdd/specs/SPEC-0004-daily-tasks.md` 与 `docs/sdd/specs/INDEX.md` 中 SPEC-0004 改为 IMPLEMENTING；`production/epics/E3-expression-loop.md` 的 E3-S05、E3-S06 状态格；本交接；`docs/sdd/NOW.md`；`docs/sdd/packages/INDEX.md`
- Allowed Files Check: PASSED
- Static Checks: `npx tsc --noEmit` 退出码 0
- Runtime Checks: `npx vitest run tests/unit/mode-switch.spec.ts tests/unit/hud.spec.ts tests/unit/room.spec.ts tests/unit/room-stage.spec.ts tests/unit/room-placement-ui.spec.ts` 退出码 0。5 个文件、60 条通过（mode-switch 9，hud 16，room 14，room-stage 12，placement-ui 9）。AC-01 至 AC-04 都在 `tests/unit/mode-switch.spec.ts`。商店页签仍是 `enabled: false`。
- Manual Acceptance: NOT PERFORMED
- Known Gaps: M3 逻辑链已通。视觉真图仍为 PARTIAL：房间是灰盒底，氛围光三层没有叠到画面上，也没有帧级 300ms 探针。R-07 真机内存没有测，不写成通过。房间灰盒纹理目前还没有生成；离开换装时会释放已经登记的键。
- Overall: PARTIAL
- Non-Goals: 未打开商店，未把真机内存写成通过

SPEC-0004 已改为 IMPLEMENTING。下一张卡按索引开工。
