# PKG-07 CARD-02 风格标签 chips

- Spec: [SPEC-0007](../../specs/SPEC-0007-residual-partials.md)
- Status: WAIT
- Previous: CARD-01
- Next: [CARD-03](./CARD-03.md)

## 本卡要做

衣柜上显示最多 8 个风格标签。单选。再点一次取消。筛选无结果时显示已有空态，不留上一组的卡片。

## 不要做

不增加第 9 个标签。不把标签改成评分。

## 允许修改的文件

- `src/core/scenes/UiScene.ts`
- `src/systems/wardrobe/filter.ts`
- `tests/unit/wardrobe.spec.ts`
- `docs/sdd/handoffs/PKG-07-CARD-02.md`
- `docs/sdd/NOW.md`
- `docs/sdd/packages/INDEX.md`

## 完成时必须为真

- SPEC AC-03 有测试。
- 现有 8 组页签测试仍然通过。

## 交接后

写交接，NOW 改为 CARD-03，开始 CARD-03。

## 停点

无。
