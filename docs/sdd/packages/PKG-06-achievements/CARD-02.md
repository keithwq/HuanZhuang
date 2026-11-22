# PKG-06 CARD-02 三十日模拟

- Spec: [SPEC-0006](../../specs/SPEC-0006-achievements-sim.md)
- Status: WAIT
- Previous: CARD-01
- Next: [CARD-03](./CARD-03.md)

## 本卡要做

新增 `tools/economy-sim.ts`。用任务 150、日均 3 条、商店标价和成就奖励，模拟 30 个虚拟日。输出天数是否落在 27 至 33，以及目录总价是否在 GDD ±10%。结果写入 `docs/sdd/evidence/SPEC-0006/`。

## 不要做

不修改 `tools/reckon.ts` 的职责。总价出界时不改数据表。先核对脚本是否把 shop 池和 unlock 池算混；核对后仍与 GDD 冲突才停。

## 允许修改的文件

- `tools/economy-sim.ts`
- `tests/unit/achievements.spec.ts`（只加脚本不变量，如币不为负）
- `docs/sdd/evidence/SPEC-0006/`
- `docs/sdd/handoffs/PKG-06-CARD-02.md`
- `docs/sdd/NOW.md`
- `docs/sdd/packages/INDEX.md`

## 完成时必须为真

- 证据文件写出输入假设、总价、天数、判定。
- 全程模拟币不为负。

## 交接后

若判定通过，NOW 改为 CARD-03 并开始它。若与 GDD 冲突且不是脚本算错，交接写 `BLOCKED`，NOW 留在本卡。

## 停点

只有「脚本已对照 GDD 仍无法同时满足天数区间和总价区间」才停。这属于已冻结口径互相冲突，不是实现偏好。
