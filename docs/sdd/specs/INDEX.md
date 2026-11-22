# SPEC Index

流程： [SDD Operating Model](../SDD-OPERATING-MODEL.md)。
任务链： [任务包索引](../packages/INDEX.md)。

- 允许状态： DRAFT、REVIEW、APPROVED、IMPLEMENTING、VERIFIED、SUPERSEDED
- 最后更新： 2026-11-22

只有本表中的 SPEC 可以实施。聊天里的编号不算。

| ID | 名称 | 文件 | 状态 | 任务包 | 依赖 |
|---|---|---|---|---|---|
| SPEC-BASELINE | 当前仓库基线 | [SPEC-BASELINE.md](./SPEC-BASELINE.md) | VERIFIED | PKG-00 | 无 |
| SPEC-0001 | 房间舞台 | [SPEC-0001-room-stage.md](./SPEC-0001-room-stage.md) | VERIFIED | PKG-01 | SPEC-BASELINE |
| SPEC-0002 | 摆放交互 | [SPEC-0002-placement.md](./SPEC-0002-placement.md) | VERIFIED | PKG-02 | SPEC-0001 |
| SPEC-0003 | 模式切换与氛围光 | [SPEC-0003-mode-ambience.md](./SPEC-0003-mode-ambience.md) | VERIFIED | PKG-03 | SPEC-0002 |
| SPEC-0004 | 每日任务 | [SPEC-0004-daily-tasks.md](./SPEC-0004-daily-tasks.md) | IMPLEMENTING | PKG-04 | SPEC-0003 |
| SPEC-0005 | 商店 | [SPEC-0005-shop.md](./SPEC-0005-shop.md) | DRAFT | PKG-05 | SPEC-0004 |
| SPEC-0006 | 成就与经济模拟 | [SPEC-0006-achievements-sim.md](./SPEC-0006-achievements-sim.md) | DRAFT | PKG-06 | SPEC-0005 |
| SPEC-0007 | 残留缺口 | [SPEC-0007-residual-partials.md](./SPEC-0007-residual-partials.md) | DRAFT | PKG-07 | SPEC-0006 |
| SPEC-0008 | 集成证据与音频 | [SPEC-0008-integration-audio.md](./SPEC-0008-integration-audio.md) | DRAFT | PKG-08 | SPEC-0007；两处业务口径未冻结 |

上一包最后一张卡交接时，把下一份 SPEC 从 `DRAFT` 改为 `IMPLEMENTING`，并改 [NOW](../NOW.md)。不得跳号实施。

编号用过不再复用。
