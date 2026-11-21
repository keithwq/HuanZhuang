# E1 · 地基对（core 常量 + SaveService + 纸娃娃合成器）

> 对应 architecture.md §12-1：泳道 A（数据）与泳道 B（渲染）并行。systems-index §2「S01+S04 双地基」结论的直接落地。
> 表头说明：验收 = GDD §8 原文编号 + checklist.md R/T 编号；ⓘ = 纯工程 Story，验收映射 ADR 条款；fh = 资产到位后补测（README §4）。

| Story | 标题 | 对应 GDD 册节 | 验收（引用原文编号） | 档 | 依赖 |
|---|---|---|---|:---:|---|
| E1-S01 | 常量层与 typed 事件总线：13 槽双层序表 / 锚线 10 值 / 挂点 4 / 房间 21 锚点坐标 / 预算阈值表 | paperdoll §3（数据表）；art-bible §5.1/§5.2/§10.5 | paperdoll §8.1（锚线基准校验的工程前置：常量断言偏差 ≤2px）；room §8.1（21 键名与 §10.5 逐一同名同坐标）；测试先行：constants 契约快照 spec | M | — |
| E1-S02 | SaveService·存储驱动与双键轮换 + 隐私降级 | local-save §2.1/§2.2/§5.1~5.3；ADR-002 §1/§2 | local-save §8.3（主坏读备、双坏新档无闪退）、§8.4（隐私模式会话档+一次性提示） | L | E1-S01 |
| E1-S03 | SaveService·写入策略 + §6 冻结接口全集 + stats | local-save §2.2/§3/§6 全表；ADR-002 §3 | local-save §8.1（接口唯一、无绕行）、§8.2（防抖/即时写/冲刷，丢失 ≤ 防抖窗口）、§8.5（coins ≥0）、§8.6（9 位硬上限）、§8.8（体积 ≤100KB） | L | E1-S02 |
| E1-S04 | 日期翻转惰性判定 + onDayFlip 事件 | local-save §2.3；daily §2.4/§5.1 | local-save §8.7（跨月跨年翻转正确）；daily §8.3 翻转重置（任务侧重抽归 E4-S04 联调验收） | S | E1-S03 |
| E1-S05 | 迁移链骨架（v1 锚点 + 幂等 + 快照键） | local-save §4；ADR-002 §4 | ⓘ ADR-002 §4.4 原则验收：新字段（ambienceLevel）可选可派生、迁移幂等重放一致、快照键可回滚；测试先行：v1→v2 演练 spec | S | E1-S03 |
| E1-S06 | TexMemAccountant 纹理预算会计 | ADR-003 §2 | ⓘ ADR-003 §2 验收：三档阈值（R-05=45 / R-06=75 / R-07=60）断言生效、超阈值开发态硬断言；测试先行：register/release 成对 + 三档触发 spec | M | E1-S01 |
| E1-S07 | 纸娃娃合成器：13 槽容器 / 双独立层序表 / tryOn·unequip / BODY 遮蔽 / 连衣裙遮蔽 / 悬空兜底 / getOutfitSnapshot | paperdoll §2.1/§2.3/§5.1~5.5/§6 | paperdoll §8.1（锚线校验，fh：BODY+校验图 P0）、§8.3（混搭 ≥20 组无穿帮，fh：首套资产 P1）、§8.6（状态渲染解耦）；GDD §6 接口契约快照 | L | E1-S01、E1-S06；美术 P0/P1 资产 |
| E1-S08 | 正/背双视图切换 + 懒加载 + 剪影过渡 | paperdoll §2.2/§4（公式）/§5.3/§5.7 | paperdoll §8.2（旋转 ≤300ms，R-02）、§8.5（拖拽+按钮双路径、减敏合规，R-15）；峰值预算 R-06 由 E5-S01 实测复核 | M | E1-S06、E1-S07 |
| E1-S09 | 动效服务 tweenSvc：白名单 guard + 常驻 3 项 + 反馈家族 + 可打断 | paperdoll §2.4/§4；art-bible §8 | paperdoll §8.2（动效可被下一操作打断，R-01）、§8.6（白名单仅 3 项，R-08）、§8.7（时长不变帧数减半）；减敏 R-15 | M | E1-S07 |

**Story 间并行说明**：S01+S02+S06 为三条首日起点线；S07 依赖 S01/S06 但不等存档线（S03~S05）；S08/S09 串行接 S07。

**测试先行清单（本 Epic，详单见 testing-scaffold.md §3）**：
- constants 契约快照（S01）；
- local-save 八条边缘单测骨架（S02/S03，含隐私降级/配额失败/双坏回退/负余额拒绝/9 上限/50 条滚窗）；
- 常驻动效白名单 guard 契约（S09）；
- texmem 三档断言（S06）。
