# PKG-06 CARD-03 双计价核对

- Spec: [SPEC-0006](../../specs/SPEC-0006-achievements-sim.md)
- Status: WAIT
- Previous: CARD-02
- Next: [PKG-07 CARD-01](../PKG-07-residuals/CARD-01.md)

## 本卡要做

自动比对里程碑与 21 条成就，证明没有同一判据同一阈值算两次钱。更新 E4-S03 与 E4-S05 状态格。

## 不要做

不改任何阈值来消除冲突。若发现数据表本身重叠，交接写 `BLOCKED` 并保持 NOW 在本卡。

## 允许修改的文件

- `tests/unit/achievements.spec.ts`
- `docs/sdd/evidence/SPEC-0006/`
- `docs/sdd/handoffs/PKG-06-CARD-03.md`
- `docs/sdd/NOW.md`
- `docs/sdd/packages/INDEX.md`
- `docs/sdd/specs/INDEX.md`
- `docs/sdd/specs/SPEC-0006-achievements-sim.md`
- `docs/sdd/specs/SPEC-0007-residual-partials.md` 的状态行
- `production/epics/E4-economy-loop.md`

## 完成时必须为真

- SPEC AC-04 有测试并通过，或交接明确写出重叠的条目并 `BLOCKED`。
- 通过时 E4-S03、E4-S05 状态格更新。

## 交接后

通过则 SPEC-0007 改为 IMPLEMENTING，NOW 改为 PKG-07 CARD-01，并开始该卡。

## 停点

数据表里的双计价重叠。不要自行删成就或改里程碑。
