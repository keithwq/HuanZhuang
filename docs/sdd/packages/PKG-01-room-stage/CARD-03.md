# PKG-01 CARD-03 Y 排序与锚点证据

- Spec: [SPEC-0001](../../specs/SPEC-0001-room-stage.md)
- Status: WAIT
- Previous: CARD-02
- Next: [PKG-02 CARD-01](../PKG-02-placement/CARD-01.md)

## 本卡要做

补齐 SPEC-0001 的 AC-01 至 AC-04。地垫画在其地面件之下。挂件不跟地面件一起排序。跑 `tests/unit/room.spec.ts` 与 `tests/unit/room-stage.spec.ts`。

## 不要做

不开始星光提示。不把 SPEC-0002 改成 IMPLEMENTING 以外的玩法。

## 允许修改的文件

- `src/systems/room/stage.ts`
- `tests/unit/room-stage.spec.ts`
- `docs/sdd/handoffs/PKG-01-CARD-03.md`
- `docs/sdd/NOW.md`
- `docs/sdd/packages/INDEX.md`
- `docs/sdd/specs/INDEX.md` 与 `docs/sdd/specs/SPEC-0002-placement.md` 的状态行（改为 IMPLEMENTING）
- `docs/sdd/specs/SPEC-0001-room-stage.md` 的状态行（改为 VERIFIED 或保持 IMPLEMENTING 并在交接写明未覆盖的 AC）
- `production/epics/E3-expression-loop.md` 的 E3-S03 状态格

## 完成时必须为真

- AC-01 至 AC-04 有对应测试。
- 既有房间逻辑测试仍通过。
- E3-S03 状态格写成 partial 或 done，并带证据路径。视觉真图未到则不要写成无保留的 done。

## 交接后

写交接。若 AC 全部有单测且命令通过，Overall 至少 `PARTIAL`（真图未验）也可以进入 PKG-02。把 NOW 改为 PKG-02 CARD-01 并开始它。

## 停点

无。
