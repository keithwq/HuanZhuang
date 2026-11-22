# PKG-05 CARD-03 页内详情与 M2 记录

- Spec: [SPEC-0005](../../specs/SPEC-0005-shop.md)
- Status: WAIT
- Previous: CARD-02
- Next: [PKG-06 CARD-01](../PKG-06-achievements/CARD-01.md)

## 本卡要做

详情在商店页内展开，不新开覆盖层。补上 PKG-04 留下的「任务完成后能去商店」入口，只跳到已有商店层。记录 M2 链路：试穿计数、领 150、购买、入柜。浏览器没跑则该项 `BLOCKED`。

## 不要做

不改 150 或标价来让链路「更好看」。

## 允许修改的文件

- `src/systems/shop/catalog.ts`
- `src/systems/shop/purchase.ts`
- `src/core/scenes/UiScene.ts`
- `src/systems/hud/OverlayManager.ts`
- `tests/unit/shop.spec.ts`
- `docs/sdd/handoffs/PKG-05-CARD-03.md`
- `docs/sdd/evidence/SPEC-0005/`
- `docs/sdd/NOW.md`
- `docs/sdd/packages/INDEX.md`
- `docs/sdd/specs/INDEX.md`
- `docs/sdd/specs/SPEC-0005-shop.md`
- `docs/sdd/specs/SPEC-0006-achievements-sim.md` 的状态行
- `production/epics/E4-economy-loop.md` 的 E4-S02 状态格

## 完成时必须为真

- SPEC AC-04 有测试。
- E4-S02 状态格更新。
- 交接写明 M2 单测覆盖了哪些步，浏览器是否未跑。

## 交接后

SPEC-0006 改为 IMPLEMENTING。NOW 改为 PKG-06 CARD-01，开始该卡。

## 停点

无。
