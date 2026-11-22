# PKG-02 CARD-01 相容锚点提示

- Spec: [SPEC-0002](../../specs/SPEC-0002-placement.md)
- Status: WAIT
- Previous: PKG-01 CARD-03
- Next: [CARD-02](./CARD-02.md)

## 本卡要做

从抽屉进入摆放后，舞台只标出 `RoomModel` 认为相容且当前可见的锚点。窗帘与非窗帘的 W 点位按现有规则区分。次级位在宿主空缺时不显示。

## 不要做

不改 `openAnchorsFor` 的规则。不写收回确认。

## 允许修改的文件

- `src/systems/room/stage.ts`
- `src/systems/room/drawer.ts`
- `src/systems/room/placement-ui.ts`
- `src/systems/room/model.ts`（仅追加只读查询）
- `tests/unit/room-placement-ui.spec.ts`
- `docs/sdd/handoffs/PKG-02-CARD-01.md`
- `docs/sdd/NOW.md`
- `docs/sdd/packages/INDEX.md`

## 完成时必须为真

- SPEC AC-04 有测试。
- 点亮的锚点集合与 `RoomModel` 查询结果一致。

## 交接后

写交接，NOW 改为 CARD-02，开始 CARD-02。

## 停点

无。
