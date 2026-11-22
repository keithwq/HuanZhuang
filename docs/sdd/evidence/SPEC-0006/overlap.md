# SPEC-0006 双计价核对

- 判定： 通过
- 里程碑： 合计拥有每 3 件发 60 星尘。比对用的阈值是这个 3，不是每个 3 的倍数。
- 同一键同一阈值： 没有成就使用 `ownedAllTotal` 且阈值 3。
- 同键不同阈值： `ac_c8` 双柜满藏是 `ownedAllTotal` 60。60 能被 3 整除，但不是里程碑配置里的阈值 3。既有 `tests/unit/data-tables.spec.ts` 也只禁止 `ownedAllTotal:3`。
- 21 条成就彼此： 判据键加阈值两两不同。
- 测试： `tests/unit/achievements.spec.ts` 的 AC-04。
