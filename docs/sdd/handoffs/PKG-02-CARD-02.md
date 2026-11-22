# Handoff

- Repository: D:\games\HuanZhuang
- Spec ID: SPEC-0002
- Card: PKG-02 CARD-02 替换、联动与收回
- Next Card: docs/sdd/packages/PKG-02-placement/CARD-03.md
- Changed Files: `src/systems/room/placement-ui.ts`；`tests/unit/room-placement-ui.spec.ts`；本交接；`docs/sdd/NOW.md`；`docs/sdd/packages/INDEX.md`。未改 `stage.ts` 与 `drawer.ts`。
- Allowed Files Check: PASSED
- Static Checks: `npx tsc --noEmit` 退出码 0
- Runtime Checks: `npx vitest run tests/unit/room-placement-ui.spec.ts tests/unit/room-stage.spec.ts tests/unit/room.spec.ts` 退出码 0。3 个文件、31 条通过（placement-ui 5，room-stage 12，room 14）。无浏览器跑通。
- Manual Acceptance: NOT PERFORMED
- Known Gaps: toast 只在返回值里，没有画到画面上。收回确认是数据上的一次确认，没有行内控件。≤300ms 仍无帧探针。
- Overall: PARTIAL
- Non-Goals: 未新增退回规则。替换与收回各只返回一条 toast，条数用 `toastMergeCount` 或「被收件 + 次级件」的同一口径。未把每次退回拆开。

下一张卡直接开工。
