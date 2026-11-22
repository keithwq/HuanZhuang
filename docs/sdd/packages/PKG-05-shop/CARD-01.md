# PKG-05 CARD-01 商店目录

- Spec: [SPEC-0005](../../specs/SPEC-0005-shop.md)
- Status: WAIT
- Previous: PKG-04 CARD-03
- Next: [CARD-02](./CARD-02.md)

## 本卡要做

商店覆盖层，服装与家具两个页签。列表来自现有数据表的 shop 池，不显示 unlock 池。底部「商店」可点。打开商店时关闭其他覆盖层。

## 不要做

不在本卡扣费。不改价格。

## 允许修改的文件

- `src/systems/shop/catalog.ts`
- `src/core/scenes/UiScene.ts`
- `src/systems/hud/OverlayManager.ts`
- `tests/unit/shop.spec.ts`
- `docs/sdd/handoffs/PKG-05-CARD-01.md`
- `docs/sdd/NOW.md`
- `docs/sdd/packages/INDEX.md`

## 完成时必须为真

- 服装页数量与数据表 shop 服装数一致。
- 家具页不含解锁池。
- 成就页签仍不可用。

## 交接后

写交接，NOW 改为 CARD-02，开始 CARD-02。

## 停点

无。
