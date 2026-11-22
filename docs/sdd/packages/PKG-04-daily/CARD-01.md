# PKG-04 CARD-01 三槽位抽取

- Spec: [SPEC-0004](../../specs/SPEC-0004-daily-tasks.md)
- Status: WAIT
- Previous: PKG-03 CARD-03
- Next: [CARD-02](./CARD-02.md)

## 本卡要做

按任务表生成当日 3 条，槽位各一。无家具时不抽 `hasFurniture`。没有未试穿单品时不抽 `hasUntriedOwnedItem`。结果只通过 `SaveService` 写入 `daily.tasks`。

## 不要做

不做领取按钮。不改 11 条文案和 150 星尘。

## 允许修改的文件

- `src/systems/daily/draw.ts`
- `src/systems/save/SaveService.ts`
- `tests/unit/daily.spec.ts`
- `docs/sdd/handoffs/PKG-04-CARD-01.md`
- `docs/sdd/NOW.md`
- `docs/sdd/packages/INDEX.md`

## 完成时必须为真

- SPEC AC-01 有测试，包含零家具新档。
- 重复调用抽取在同一 dateKey 上不换掉已有 3 条。

## 交接后

写交接，NOW 改为 CARD-02，开始 CARD-02。

## 停点

无。可达性字段已在 `src/data/tasks.ts`。
