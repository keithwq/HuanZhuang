# Handoff

- Repository: D:\games\HuanZhuang
- Spec ID: SPEC-0003
- Card: PKG-03 CARD-01 换装与房间切换
- Next Card: docs/sdd/packages/PKG-03-mode-ambience/CARD-02.md
- Changed Files: `src/systems/hud/OverlayManager.ts`（`ModeSwitchController` 接上已有 `ModeManager`）；`src/core/scenes/UiScene.ts`（房间页签可点，商店与成就仍灰）；`src/core/scenes/StageScene.ts`（换装容器与房间容器互斥，房间容器只建一次）；`tests/unit/mode-switch.spec.ts`；本交接；`docs/sdd/NOW.md`；`docs/sdd/packages/INDEX.md`
- Allowed Files Check: PASSED
- Static Checks: `npx tsc --noEmit` 退出码 0
- Runtime Checks: `npx vitest run tests/unit/mode-switch.spec.ts tests/unit/hud.spec.ts tests/unit/room.spec.ts tests/unit/room-stage.spec.ts tests/unit/room-placement-ui.spec.ts` 退出码 0。5 个文件、56 条通过（mode-switch 5，hud 16，room 14，room-stage 12，placement-ui 9）。浏览器里切到房间后标题是「房间」，纸娃娃隐藏，`room-stage` 只有一个，抽屉换成家具类目；商店仍是灰字并弹出「这一格还在整理中…」；切回换装后纸娃娃回来，摆放选中被清掉。没有 ≤300ms 的帧探针。过渡时长由 TweenService 记到 300ms，减敏路径不排过渡。
- Manual Acceptance: NOT PERFORMED
- Known Gaps: 房间画面是一块灰盒底，已摆家具没有画到舞台上。交叉淡切是线性透明度，没有帧时间采样。氛围光不在本卡。
- Overall: PARTIAL
- Non-Goals: 未做氛围光，未改 5/11/17，未打开商店或成就

下一张卡按索引开工。
