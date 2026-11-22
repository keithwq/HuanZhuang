# Handoff

- Repository: D:\games\HuanZhuang
- Spec ID: SPEC-0005
- Card: PKG-05 CARD-02 购买
- Next Card: docs/sdd/packages/PKG-05-shop/CARD-03.md
- Changed Files: `src/systems/shop/purchase.ts`（余额够则 `spendCoins` + 已有入柜；不够或已拥有不写 `shop_purchase` 扣款；余额不足带摇头和「星尘不够啦，去做每日任务吧」）；`src/core/scenes/UiScene.ts`（卡片上「购入 / 已拥有」，点购入走购买）；`tests/unit/shop.spec.ts`；本交接；`docs/sdd/NOW.md`；`docs/sdd/packages/INDEX.md`
- Allowed Files Check: PASSED
- Static Checks: `npx tsc --noEmit` 退出码 0
- Runtime Checks: `npx vitest run tests/unit/shop.spec.ts tests/unit/save-api.spec.ts tests/unit/daily.spec.ts` 退出码 0。3 个文件、44 条通过（shop 11，save-api 18，daily 15）。AC-01、AC-02、AC-03 在 `tests/unit/shop.spec.ts`。服装扣标价后入柜，家具扣标价后进房间。差 1 星尘时余额和账本长度都不变。再买同一件不产生第二件，账本仍只有一笔扣款。
- Manual Acceptance: NOT PERFORMED
- Known Gaps: 页内详情不在本卡。浏览器里没有点到购入按钮。
- Overall: PASSED
- Non-Goals: 未做详情展开，未改 `addItem` / `addFurniture` 的判重

下一张卡按索引开工。
