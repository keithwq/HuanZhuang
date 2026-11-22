# PKG-02 CARD-03 中断与边界

- Spec: [SPEC-0002](../../specs/SPEC-0002-placement.md)
- Status: WAIT
- Previous: CARD-02
- Next: [PKG-03 CARD-01](../PKG-03-mode-ambience/CARD-01.md)

## 本卡要做

覆盖满点位、空房间、悬空、中断取消。中断后 `isPlacing()` 为空，舞台提示关闭。跑房间逻辑测试与摆放 UI 测试。

## 不要做

不实现模式切换按钮。那是 PKG-03。

## 允许修改的文件

- `src/systems/room/placement-ui.ts`
- `src/systems/room/stage.ts`
- `tests/unit/room-placement-ui.spec.ts`
- `docs/sdd/handoffs/PKG-02-CARD-03.md`
- `docs/sdd/NOW.md`
- `docs/sdd/packages/INDEX.md`
- `docs/sdd/specs/INDEX.md`
- `docs/sdd/specs/SPEC-0002-placement.md`
- `docs/sdd/specs/SPEC-0003-mode-ambience.md` 的状态行
- `production/epics/E3-expression-loop.md` 的 E3-S04 状态格

## 完成时必须为真

- SPEC AC-03 有测试。
- ≤300ms 若无帧探针，交接写 `PARTIAL`，不改 GDD 数字。
- E3-S04 状态格更新。

## 交接后

把 SPEC-0003 设为 IMPLEMENTING，NOW 改为 PKG-03 CARD-01，开始该卡。

## 停点

无。
