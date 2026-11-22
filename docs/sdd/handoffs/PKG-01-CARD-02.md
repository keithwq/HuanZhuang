# Handoff

- Repository: D:\games\HuanZhuang
- Spec ID: SPEC-0001
- Card: PKG-01 CARD-02 五类目抽屉
- Next Card: docs/sdd/packages/PKG-01-room-stage/CARD-03.md
- Changed Files: `src/systems/room/drawer.ts`；`src/systems/room/stage.ts`（快照增加 `drawer`，家具层排序未改）；`tests/unit/room-stage.spec.ts`；本交接；`docs/sdd/NOW.md`；`docs/sdd/packages/INDEX.md`
- Allowed Files Check: PASSED
- Static Checks: `npx tsc --noEmit` 退出码 0
- Runtime Checks: `npx vitest run tests/unit/room-stage.spec.ts tests/unit/room.spec.ts` 退出码 0。2 个文件、21 条通过（room-stage 7，room 14）。本卡不要求 e2e，未跑。
- Manual Acceptance: NOT PERFORMED
- Known Gaps: 点卡片没有落位效果，摆放交互留给 PKG-02。房间真图未接。Y 排序与锚点的整份 AC 证据是 CARD-03。
- Overall: PASSED
- Non-Goals: 未把点卡片变成摆放，未改墙/地面/家具/纱幔的层排序，未改 `RoomModel` 放置规则

下一张卡直接开工。
