# E2 · 可玩切片（S03 衣柜 + S05 HUD 容器）

> 对应 architecture.md §12-2。达成 **M1 里程碑：点选即换首次可玩（E2-S04）**。
> 承接：E1-S01/S03/S06/S07/S09（泳道 A/B 产出的地基）。
> 状态 = done / partial / todo（2026-11-22 对齐，不改验收口径）。

| Story | 标题 | 对应 GDD 册节 | 验收（引用原文编号） | 档 | 依赖 | 状态 |
|---|---|---|---|:---:|---|---|
| E2-S01 | HUD 骨架与画幅管线：UiScene/StageScene 结构 / 逻辑宽 720 / 栅格 / 安全区 / 竖屏遮罩 | hud §2.1/§4/§5.1/§5.2/§5.7 | hud §8.1（720 栅格全对齐）、§8.6（异形屏安全区）、§8.2（触控目标 ≥44×44、间距 ≥8px，R-10）；fh：图标资产到位后视觉对照 | M | E1-S01 | done · `tests/unit/hud.spec.ts` · `src/core/scenes/UiScene.ts` · `src/systems/hud/layout.ts` |
| E2-S02 | 底部抽屉两档（45%/70%）+ 把手拖拽 + 速度吸附 0.5px/ms | wardrobe §2.1/§4；hud §4 | wardrobe §8.2（连续滑动+点选混操作 60fps 无卡顿、视口外缩略图不加载）；hud §4 档位公式（口径承 wardrobe §4，两模式通用） | M | E2-S01 | done · `tests/unit/hud.spec.ts` · `src/systems/hud/DrawerController.ts` |
| E2-S03 | 衣柜网格：**8 分组页签（G1~G8，GAP-4 修订）** / 混组卸下卡（每槽一张 + Caption 标注：G2×2 / G7×3 / G8×2） / 风格标签筛选 / 缩略图视口懒挂载 / 空态引导卡 | wardrobe §2.1（GAP-4 修订）/§2.3/§4/§5.1/§5.4/§5.7；ux-spec §2.1 分组表 + 组内次序、§2.3 接口注记 | wardrobe §8.3（页签全部可用 + 等价点按、发型组成对换装、跨发型混搭拒绝——**执行口径按 GAP-4：8 组覆盖全部 13 槽，组概念不进渲染层**）、§8.5（chips ≤8、单选 OR、空集空态）、§8.6（角标差异承载、名称常显，fh：8 组图标资产，量级 13→8 随 ux-spec §2.2-4）、§8.7（卡片 104、摇头 200ms）；`onTabChange` 参数域 = 组 ID 枚举 'G1'~'G8'（契约快照，ux-spec §2.3） | L | E2-S02、E1-S03 | partial · 8 组页签与筛选数据在，风格标签 chips UI 未做 · `tests/unit/wardrobe.spec.ts` · `src/systems/wardrobe/filter.ts` |
| E2-S04 | 点选即换状态机（无锁、可打断、不吞点击）+ 卸下卡 + 连衣裙 Caption + bumpStat 口径 | wardrobe §2.2/§2.3/§5.2/§5.4/§5.6/§6 | wardrobe §8.1（点选 ≤300ms，R-01、可打断、无吞没）、§8.4（连衣裙 BTM 联动与 Caption）、§8.8（tryOnTotal/Unique 计数与操作一致）；paperdoll §8.2 联合验收 | M | E2-S03、E1-S07、E1-S09 | done · `tests/unit/wardrobe.spec.ts` · `tests/evidence/m1-milestone.md` · `src/systems/wardrobe/tryonController.ts` |
| E2-S05 | 覆盖层管理器（单层互斥）+ 模式管理器骨架 + 货币栏镜像 + 角标写入 + toast/Caption 层 | hud §2.4/§2.5/§3/§6 | hud §8.4（覆盖层互斥单层、遮罩吸收触控）、§8.5（货币栏镜像 + 角标 >9 显"9+"）、§8.8（职责边界：无系统改写容器布局） | M | E2-S01、E1-S03 | partial · 造型层已接；ModeManager 未进 UiScene，商店/任务/成就页与任务角标没有 · `tests/unit/hud.spec.ts` · `src/systems/hud/OverlayManager.ts` |
| E2-S06 | **window.__hz dev-only 测试探针**（QA 前置基础设施）：tap_in→render_commit / flip_start→flip_commit / rAF 帧间隔 / texmem 报表 | QA 计划 sprint1-qa-plan.md §2.0（主理人转办 2026-11-21） | ⓘ QA §2.0 口径逐条：四采集面可用 + **R-16 门控**（prod 构建零暴露——prod-bundle-hygiene 静态断言）+ e2e 探针冒烟 3 用例 + ≥30 样本取证工具（tools/evidence-m1.ts） | S | E2-S04（探针消费其事件链） | done · `tests/e2e/redline-latency.spec.ts` · `tests/unit/prod-bundle-hygiene.spec.ts` · `src/core/probe.ts` |

**★ M1 里程碑（E2-S04 验收通过）**：点选卡片 → tryOn → 角色画面 ≤300ms 变装 + 换装确认动效 + 可打断 + 计数入 stats——垂直切片可玩。走查脚本随 Story 测试产出（Playwright，R-01 断言）。进度：M1 已关闭（QA 终判无条件 PASS，2026-11-21）。

**测试先行清单**：
- tryon-controller 状态机单测（无锁连点、动效打断路径、卸下/连衣裙分支）（S04）；
- 筛选谓词 OR 语义 + 空集分支单测（S03）；
- **分组页签单测（S03，GAP-4 口径）**：8 组覆盖 13 槽完整性、组内次序（当前穿着置顶 → 系列聚集 → 稀有度升序，ux-spec §2.1 定稿）、混组卸下卡 G2×2/G7×3/G8×2 每槽一张（wardrobe §2.1 修订段）；
- **契约快照（S03）**：`onTabChange` 参数类型 = 组 ID 枚举 'G1'~'G8'（ux-spec §2.3 注记）；`tryOn/unequip` 签名不变断言（换装仍逐槽，组概念不进渲染层——渲染层零改动的回归面）；
- 抽屉档位吸附速度阈值单测（S02）；
- OverlayManager 单层互斥与排队拒绝单测（S05）。
