# Handoff

- Repository: D:\games\HuanZhuang
- Spec ID: SPEC-0002
- Card: PKG-02 CARD-01 相容锚点提示
- Next Card: docs/sdd/packages/PKG-02-placement/CARD-02.md
- Changed Files: `src/systems/room/placement-ui.ts`；`src/systems/room/stage.ts`（增加 `hints`，层排序未改）；`tests/unit/room-placement-ui.spec.ts`；本交接；`docs/sdd/NOW.md`；`docs/sdd/packages/INDEX.md`。未改 `drawer.ts` 与 `model.ts`。
- Allowed Files Check: PASSED
- Static Checks: `npx tsc --noEmit` 退出码 0
- Runtime Checks: `npx vitest run tests/unit/room-placement-ui.spec.ts tests/unit/room-stage.spec.ts tests/unit/room.spec.ts` 退出码 0。3 个文件、29 条通过（placement-ui 3，room-stage 12，room 14）。无浏览器跑通，画面星光未验。
- Manual Acceptance: NOT PERFORMED
- Known Gaps: `StageScene` 不在本卡允许文件里，现场房间容器仍只挂无 `RoomModel` 的快照，提示要由调用方把 `RoomModel` 传进 `readRoomStage`。星光呼吸动效未画，本卡只给出锚点集合。
- Overall: PARTIAL
- Non-Goals: 未改 `openAnchorsFor`，未写收回确认，未把点锚点变成落位

下一张卡直接开工。
