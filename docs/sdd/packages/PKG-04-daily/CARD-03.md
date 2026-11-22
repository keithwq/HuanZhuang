# PKG-04 CARD-03 日切、角标与任务入口

- Spec: [SPEC-0004](../../specs/SPEC-0004-daily-tasks.md)
- Status: WAIT
- Previous: CARD-02
- Next: [PKG-05 CARD-01](../PKG-05-shop/CARD-01.md)

## 本卡要做

日期变化后重建 3 条。顶导任务入口能打开任务列表。角标等于已达成未领取的数量，大于 9 显示 `9+`。补日切与竞态测试。

## 不要做

不做「余额不足去商店」的引导链跳转。商店页还没有。交接里把这条标成留给 PKG-05 的缺口，不新造引导文案。

## 允许修改的文件

- `src/systems/daily/draw.ts`
- `src/systems/daily/progress.ts`
- `src/core/scenes/UiScene.ts`
- `src/systems/save/SaveService.ts`
- `tests/unit/daily.spec.ts`
- `docs/sdd/handoffs/PKG-04-CARD-03.md`
- `docs/sdd/NOW.md`
- `docs/sdd/packages/INDEX.md`
- `docs/sdd/specs/INDEX.md`
- `docs/sdd/specs/SPEC-0004-daily-tasks.md`
- `docs/sdd/specs/SPEC-0005-shop.md` 的状态行
- `production/epics/E4-economy-loop.md` 的 E4-S04 状态格

## 完成时必须为真

- SPEC AC-04、AC-05 有测试。
- 引导链未做的部分在交接写 `PARTIAL`。
- E4-S04 状态格更新。

## 交接后

SPEC-0005 改为 IMPLEMENTING。NOW 改为 PKG-05 CARD-01，开始该卡。

## 停点

无。
