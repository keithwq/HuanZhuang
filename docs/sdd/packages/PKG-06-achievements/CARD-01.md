# PKG-06 CARD-01 成就判定与领取

- Spec: [SPEC-0006](../../specs/SPEC-0006-achievements-sim.md)
- Status: WAIT
- Previous: PKG-05 CARD-03
- Next: [CARD-02](./CARD-02.md)

## 本卡要做

按 21 条成就表惰性判定。可领取的能领取一次，之后锁定。登录类用 dateKey 去重。点亮「成就」页签。家具条用现有摆放计数，不另写阈值。

## 不要做

不改奖励数字。不在判定失败时发星尘。

## 允许修改的文件

- `src/systems/achievements/eval.ts`
- `src/systems/save/SaveService.ts`
- `src/core/scenes/UiScene.ts`
- `tests/unit/achievements.spec.ts`
- `docs/sdd/handoffs/PKG-06-CARD-01.md`
- `docs/sdd/NOW.md`
- `docs/sdd/packages/INDEX.md`

## 完成时必须为真

- SPEC AC-01、AC-02 有测试。
- 未达成的条不能领取。

## 交接后

写交接，NOW 改为 CARD-02，开始 CARD-02。

## 停点

无。阈值已在 `src/data/achievements.ts`。
