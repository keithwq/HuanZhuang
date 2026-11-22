# Handoff

- Repository: D:\games\HuanZhuang
- Spec ID: SPEC-0001
- Card: PKG-01 CARD-01 舞台层与已摆家具
- Next Card: docs/sdd/packages/PKG-01-room-stage/CARD-02.md
- Changed Files: `src/systems/room/stage.ts`；`src/core/scenes/StageScene.ts`（隐藏的 `room-stage` 容器，换装容器仍是默认画面）；`tests/unit/room-stage.spec.ts`；本交接；`docs/sdd/NOW.md`；`docs/sdd/packages/INDEX.md`
- Allowed Files Check: PASSED
- Static Checks: `npx tsc --noEmit` 退出码 0。锚点坐标只读 `ROOM_ANCHORS`，测试用同一引用比对，没有第二套数字。
- Runtime Checks: `npx vitest run tests/unit/room-stage.spec.ts tests/unit/room.spec.ts` 退出码 0。2 个文件、18 条通过（room-stage 4，room 14）。本卡不要求 e2e，未跑。
- Manual Acceptance: NOT PERFORMED
- Known Gaps: 房间真图未接，舞台返回灰盒且 `texture: missing`。抽屉页签是 CARD-02。地垫压在地面件之下、挂件不参与地面排序的整份 AC 证据是 CARD-03。更高 base-y 按美术圣经 §10.1 / room §4 后画（在前）；SPEC 表里「更高 Y 的件画在后面」与该口径字面相反，本卡按已冻结 GDD 实现，不改 SPEC 验收句。
- Overall: PASSED
- Non-Goals: 未画抽屉，未处理点击摆放，未点亮底部页签，未改 `RoomModel` 放置规则

下一张卡直接开工。
