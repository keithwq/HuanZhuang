# PKG-01 CARD-02 五类目抽屉

- Spec: [SPEC-0001](../../specs/SPEC-0001-room-stage.md)
- Status: WAIT
- Previous: CARD-01
- Next: [CARD-03](./CARD-03.md)

## 本卡要做

家具抽屉五个页签 L / M / S / W / R，只列出 `SaveService` 中已拥有的家具。页签切换不改变舞台上已经摆出的件。

## 不要做

不在本卡把点卡片变成摆放。点卡片的行为留给 PKG-02。本卡可以让点击无效果，但测试要证明页签过滤正确。

## 允许修改的文件

- `src/systems/room/drawer.ts`
- `src/systems/room/stage.ts`（只挂抽屉，不改层排序）
- `tests/unit/room-stage.spec.ts`
- `docs/sdd/handoffs/PKG-01-CARD-02.md`
- `docs/sdd/NOW.md`
- `docs/sdd/packages/INDEX.md`

## 完成时必须为真

- 同时拥有不同类目时，每页只有该类目。
- 未拥有的件不出现。
- 空类目有空列表，不抛错。

## 交接后

写交接，NOW 改为 CARD-03，开始 CARD-03。

## 停点

无。
