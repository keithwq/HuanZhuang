# PKG-05 CARD-02 购买

- Spec: [SPEC-0005](../../specs/SPEC-0005-shop.md)
- Status: WAIT
- Previous: CARD-01
- Next: [CARD-03](./CARD-03.md)

## 本卡要做

余额足够则扣费并入柜。余额不足则拒绝且余额不变，并给出摇头与 toast。已拥有不可再买。

## 不要做

不写详情展开。不改入柜函数的判重语义。

## 允许修改的文件

- `src/systems/shop/purchase.ts`
- `src/systems/shop/catalog.ts`
- `src/core/scenes/UiScene.ts`
- `tests/unit/shop.spec.ts`
- `docs/sdd/handoffs/PKG-05-CARD-02.md`
- `docs/sdd/NOW.md`
- `docs/sdd/packages/INDEX.md`

## 完成时必须为真

- SPEC AC-01、AC-02、AC-03 有测试。
- 购买失败不会写入账本扣款。

## 交接后

写交接，NOW 改为 CARD-03，开始 CARD-03。

## 停点

无。
