# Handoff

- Repository: D:\games\HuanZhuang
- Spec ID: SPEC-0003
- Card: PKG-03 CARD-02 氛围光档位
- Next Card: docs/sdd/packages/PKG-03-mode-ambience/CARD-03.md
- Changed Files: `src/systems/room/ambience.ts`（三档灰盒层，淡入走 TweenService）；`src/systems/room/stage.ts`（快照带上 `lights`，档位读棘轮）；`tests/unit/mode-switch.spec.ts`（AC-03、AC-04）
- Allowed Files Check: PASSED
- Static Checks: `npx tsc --noEmit` 退出码 0
- Runtime Checks: `npx vitest run tests/unit/mode-switch.spec.ts tests/unit/room.spec.ts tests/unit/room-stage.spec.ts` 退出码 0。当时 3 个文件、34 条通过。AC-03 跨过 5 件后档 1，撤到 4 件后 `getAmbienceLevel()` 仍是 1，光层不灭。AC-04 减敏无淡入；未减敏时一次性淡入 ≤300ms，没有常驻循环。
- Manual Acceptance: NOT PERFORMED
- Known Gaps: 真图三层没有。灰盒层写在舞台快照和 `AmbienceLights` 里，还没有叠到 Phaser 房间容器上。5/11/17 没有改。
- Overall: PARTIAL
- Non-Goals: 未改阈值，未放循环闪烁，未打开商店

下一张卡按索引开工。
