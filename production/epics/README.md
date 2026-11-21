# HuanZhuang Epic/Story 拆分索引（Phase 4 预制作 · production/epics/）

> 版本 v1.0 · 2026-11-21 · 程基岩（engineering-lead）
> 输入基线：8 册 GDD §8（验收原文唯一来源）、architecture.md §12 建仓顺序、ADR-001/002/003、cal-04-review.md、checklist.md（R 红线编号）、decisions.md D4-01（轻量音频包）
> 纪律：**所有 Story 验收只引用 GDD §8 原文编号 + checklist.md R/T 编号，不自创验收口径**；纯工程基建 Story（无直接 GDD §8 对应项）验收引用 ADR 条款 + R 红线，并在表中注明映射依据。
> 验证驱动：**每 Story 先写测试后实现**（architecture §10）；测试用例清单见 `production/testing-scaffold.md`。

---

## 1. Epic 总表

| Epic | 名称 | 覆盖 GDD | 文件 | 建仓序依据 |
|---|---|---|---|---|
| E1 | 地基对 | S04 local-save + S01/S02 paperdoll | `E1-foundation.md` | architecture §12-1（双地基并行：systems-index §2 结论） |
| E2 | 可玩切片 | S03 wardrobe + S05 hud | `E2-playable-slice.md` | architecture §12-2 |
| E3 | 表达闭环 | S06 look-save + S07 room | `E3-expression-loop.md` | architecture §12-3（前半） |
| E4 | 经济与循环 | S08+S10 economy + S09 daily | `E4-economy-loop.md` | architecture §12-3（后半）/12-4 |
| E5 | 集成与打磨 | 全 8 册验收证据汇总 | `E5-integration-polish.md` | architecture §12-4 |
| E6 | 音频接入 | D4-01 轻量音频包 | `E6-audio-placeholder.md`（文件名保留，内容已为**补映射完成版**，audio-plan v1.0） | Phase 5 后期接入（D4-01 原文），2026-11-21 补映射完成 |

> 注：E3（S06+S07）先于 E4 收口来自 architecture §12-3/12-4 原序；但 **E4-S01 数据表可与 E3 并行**（无相互依赖），Phase 5 排期时建议 E3/E4 双线并进，见 §3 并行泳道。

## 2. 里程碑（垂直切片）

| 里程碑 | 达成 Story | 含义 | 前置链 |
|---|---|---|---|
| **M1 · 点选即换首次可玩** | **E2-S04 验收通过** | 点选衣柜卡片 → 角色画面 ≤300ms 变装，动效可打断——垂直切片可玩（systems-index §1 S01-S05 最小集闭环） | E1-S01/S03/S06/S07/S09 → E2-S01/S02/S03/S04 |
| **M2 · 核心循环全通** | **E4-S04 验收通过**（与 E4-S02 联合） | 试穿 → 任务计数 → 领取 150 星尘 → 商店购入 → 入柜 → 再试穿——攒星尘买新件的完整循环可玩 | M1 全链 + E2-S05 + E4-S01/S02/S04 + E1-S04 |
| **M3 · 双画布全通** | **E3-S06 验收通过**（E3-S05 同批） | dress⇄room 模式切换 + 摆放 + 氛围光棘轮全通，两个表达画布都可玩 | M1 + E3-S01~S06 |
| **M4 · v1 验收就绪** | **E5-S05 验收通过** | 8 册 GDD §8 × evidence 全对照汇总，交主理人终审门 | M1~M3 + E5-S01~S04 |

## 3. 并行泳道（Phase 5 排期建议）

```
时间 →
泳道A（数据）:  E1-S01 ─ E1-S02 ─ E1-S03 ─ E1-S04 ─ E1-S05
泳道B（渲染）:  E1-S06 ─ E1-S07 ─ E1-S08 ─ E1-S09 ─────────┐（等美术资产，见§4）
泳道C（UI）:                E2-S01 ─ E2-S02 ─ E2-S05 ┄ E2-S03 ┄ E2-S04[M1]
                            E3-S01 ┄ E3-S02      E3-S03 ┄ E3-S04 ┄ E3-S05 ┄ E3-S06[M3]
泳道D（经济）:                              E4-S01 ┄ E4-S02 ┄ E4-S04[M2] ┄ E4-S03 ┄ E4-S05
泳道E（集成）:                                                    E5-S01~S05[M4]   E6-S01/S02（Phase 5 后期）
```

- 泳道 A/B 首日并行（双地基，systems-index §2）；E4-S01（纯数据表）在 E1-S01 后即可并行起草；
- E4-S03 成就页需 E3-S05 的家具判据数据输出（room §2.5 冻结值），排在 E3-S05 之后。

## 4. 跨团队依赖（经主理人协调，不直接联系）

| 依赖项 | 阻塞的验收条款 | 美术侧来源（附录 B 优先级） |
|---|---|---|
| BODY 正/背两张 + 基准网格校验图 + 旋转剪影 3 帧 | E1-S07 的 paperdoll §8.1（锚线偏差 ≤2px） | P0 骨架 |
| 首套全 13 槽套装（每槽正/背双图） | E1-S07 的 paperdoll §8.3（混搭 ≥20 组）起步样本 | P1 首套服装 |
| 40-50 件双视图资产全量入库 | paperdoll §8.3/8.4 全量复测（E5-S01 采集） | P2+ 滚动 |
| 服装缩略图 `_thumb`（wardrobe §3 口径） | E2-S03 视口懒挂载实测 | 派生资产随部件出 |
| 房间背景 + 30 件家具 + 氛围光 3 分层 | E3-S03/E3-S05 的 room §8.4/8.7 实测 | P1.5 房间 |
| 类目图标集 + 标签栏/卡片 UI 图集 | E2-S01/S03 视觉验收项（hud §8.1/wardrobe §8.6 视觉对照） | P0 UI |

> 工程侧对策：美术资产未到位的 Story 允许以灰盒占位推进实现与单测，**但对应 GDD §8 视觉/资产条款的验收必须在资产到位后补测**（在 Story 表「验收」列标注 ⛧ = 资产到位后补测）。

## 5. 预留位声明

1. ~~ADR-002 补丁位~~ **已落档（2026-11-21，P4-EL-003）**：settings.audioEnabled 键全规格入 ADR-002 补丁附录 A（audio-plan §7 清单经主理人转来后落定：boolean / 默认 true / 零迁移 / 即时写清单）；E6-S02 验收依据随之补齐。
2. ~~E6 占位口径~~ **补映射完成（2026-11-21，P4-EL-003）**：audio-plan.md v1.0 到位，E6-S01/S02 验收按方案 §2/§4/§5/§6/§7 逐条落定；两处挂起项（S2 套装判据、开关 UI 入口归属）归文策渊口径在途（audio-plan §8.1），非排期阻塞。
3. **接口注记记录（2026-11-21 并入，主理人转办）**：GAP-4 页签分组——`onTabChange` 参数域由槽位代码收窄为组 ID（'G1'~'G8'，语义不变；wardrobe §2.1 修订 + ux-spec §2.3 注记）。已并入 E2-S03 验收与测试先行项、testing-scaffold §3.5 契约快照；换装仍逐槽 `tryOn`，组概念不进渲染层——**架构零变更**。
4. **架构补丁记录（2026-11-21，P4-EL-003）**：ADR-001 v1.0.1（Sound 族备案）、architecture.md §3（audio 模块/常量表/assets/audio 目录）、§4（事件名登记表：`tryon:done` / `outfit:setComplete` / `coins:changed` / `settings:audioChanged`）——audio-plan §8.2-1~3 四项转办全部闭环。

## 6. Story 统计

| Epic | Story 数 | S | M | L | 备注 |
|---|---|---|---|---|---|
| E1 | 9 | 2 | 5 | 2 | |
| E2 | 5 | 0 | 4 | 1 | |
| E3 | 6 | 0 | 2 | 4 | |
| E4 | 5 | 1 | 3 | 1 | |
| E5 | 5 | 3 | 2 | 0 | |
| E6 | 2 | 1 | 1 | 0 | 补映射完成（2026-11-21）：S/S01 复核维持 M、S02 维持 S |
| **合计** | **32** | **7** | **17** | **8** | |

---

*维护：程基岩。Story 状态跟踪建议 Phase 5 建仓后在各 Epic 文件内加状态列（todo/test-first/impl/done+证据路径）。*
