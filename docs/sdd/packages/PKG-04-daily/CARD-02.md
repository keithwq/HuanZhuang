# PKG-04 CARD-02 进度与领取

- Spec: [SPEC-0004](../../specs/SPEC-0004-daily-tasks.md)
- Status: WAIT
- Previous: CARD-01
- Next: [CARD-03](./CARD-03.md)

## 本卡要做

对应 stats 增加时，当日任务进度当帧增加。达成后可领取。领取 +150，账本原因 `daily_task`，同一条不能领第二次。未达成领取被拒绝且不加币。

## 不要做

不在任务模块里直接改 `coins` 字段。走已有收入入口。

## 允许修改的文件

- `src/systems/daily/progress.ts`
- `src/systems/save/SaveService.ts`
- `tests/unit/daily.spec.ts`
- `docs/sdd/handoffs/PKG-04-CARD-02.md`
- `docs/sdd/NOW.md`
- `docs/sdd/packages/INDEX.md`

## 完成时必须为真

- SPEC AC-02、AC-03 有测试。
- 三连领取不会出现中间负币或重复入账。

## 交接后

写交接，NOW 改为 CARD-03，开始 CARD-03。

## 停点

无。
