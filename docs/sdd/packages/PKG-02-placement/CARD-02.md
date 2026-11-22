# PKG-02 CARD-02 替换、联动与收回

- Spec: [SPEC-0002](../../specs/SPEC-0002-placement.md)
- Status: WAIT
- Previous: CARD-01
- Next: [CARD-03](./CARD-03.md)

## 本卡要做

点亮起的锚点即落位，走 `RoomModel` 现有 place。替换与次级联动只发一条合并 toast，条数用返回的 `toastMergeCount`。收回一件家具要先出现行内确认，确认后才改存档。

## 不要做

不新增退回规则。不把每次退回拆成多条 toast。

## 允许修改的文件

- `src/systems/room/placement-ui.ts`
- `src/systems/room/stage.ts`
- `src/systems/room/drawer.ts`
- `tests/unit/room-placement-ui.spec.ts`
- `docs/sdd/handoffs/PKG-02-CARD-02.md`
- `docs/sdd/NOW.md`
- `docs/sdd/packages/INDEX.md`

## 完成时必须为真

- SPEC AC-01、AC-02 有测试。
- 取消确认时存档摆放与确认前相同。

## 交接后

写交接，NOW 改为 CARD-03，开始 CARD-03。

## 停点

无。
