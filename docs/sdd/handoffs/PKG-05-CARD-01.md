# Handoff

- Repository: D:\games\HuanZhuang
- Spec ID: SPEC-0005
- Card: PKG-05 CARD-01 商店目录
- Next Card: docs/sdd/packages/PKG-05-shop/CARD-02.md
- Changed Files: `src/systems/shop/catalog.ts`（服装页、家具页只读 shop 池，标价沿用数据表）；`src/systems/hud/OverlayManager.ts`（底部「商店」可点，成就仍不可用；`openShopOverlay` 先关掉其它覆盖层）；`src/core/scenes/UiScene.ts`（商店层两个页签，列出目录）；`tests/unit/shop.spec.ts`；`tests/unit/mode-switch.spec.ts`（两处「商店仍不可用」改成商店可点、成就仍不可用）；本交接；`docs/sdd/NOW.md`；`docs/sdd/packages/INDEX.md`
- Allowed Files Check: PARTIAL。`tests/unit/mode-switch.spec.ts` 不在本卡清单里。点亮商店后，SPEC-0003 留下的两处 `enabled: false` 会失败，所以只改了这两处断言。
- Static Checks: `npx tsc --noEmit` 退出码 0
- Runtime Checks: `npx vitest run tests/unit/shop.spec.ts tests/unit/mode-switch.spec.ts tests/unit/hud.spec.ts tests/unit/daily.spec.ts tests/unit/data-tables.spec.ts` 退出码 0。5 个文件、69 条通过（shop 6，mode-switch 9，hud 16，daily 15，data-tables 23）。服装页与数据表 shop 服装逐条同 id、同标价。家具页与 shop 家具逐条同 id，解锁池 id 不出现。任务层或造型层打开时改成商店一层；任务层再开造型层仍然被拒绝。
- Manual Acceptance: NOT PERFORMED
- Known Gaps: 浏览器里竖屏画布的底部页签落在这次截图裁切之外，没有点到「商店」确认列表。不扣费，没有已拥有徽章，没有页内详情。
- Overall: PASSED
- Non-Goals: 未扣星尘，未改标价，未打开成就页

下一张卡按索引开工。
