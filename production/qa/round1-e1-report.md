# Sprint 1 · 第一轮 QA 验证报告（E1 独立复跑 + 烟雾闭环 + M1 证据有效性核验）

> 版本 v1.0 · 2026-11-21 · 严守真（quality-lead）· 触发：主理人检查点①回传（P5-QL-002）
> 验证对象：**E1 提交基线 HEAD `196be0c`**（13 commit 全入库态），非工作区在途态
> 判据：GDD §8 原文编号 + checklist R/T 编号（sprint1-qa-plan.md §1 映射表），不采信实现方自报

---

## 0. 验证方法与隔离事件（方法论备案）

- **独立工作区复跑**：因主工作区存在程基岩在途未提交改动（main.ts/StageScene/UiScene/probe.ts，探针 dev-only 门控改造中），首轮 e2e 曾被在途 dist 污染（6/6 败于 bootReady）。已用 `git worktree` 于 `D:/games/HuanZhuang-qa` 建立冻结基线隔离复跑，全部结论以下述**基线实测**为准。此事件本身记 1 条流程建议（见 §4）。
- 环境：Windows / Edge headless（Playwright channel msedge）/ 视口 390×844 DPR2 / vite preview 静态产物（隔离端口 4180）。
- 我方临时脚本（烟雾驱动/取证复测）均在隔离 worktree 内运行、用后即删，未触碰主工作区与实现方任何文件。

## 1. E1 独立复跑结果（对照 sprint1-qa-plan §1 映射表）

| 项 | 我方实测（HEAD 196be0c） | 判定 |
|---|---|---|
| TS strict | `tsc --noEmit` 0 错误 | PASS |
| 单测+契约（scoped） | **152/152 通过**（11 文件：constants 18 / save-edge 17 / save-api 18 / paperdoll 16 / viewswap 7 / tween 12 / wardrobe 15 / hud 16 / texmem 7 / data-tables 14 / contracts 12） | PASS |
| 完整 `npm test` | **红**：`Test Files 1 failed | 11 passed` —— vitest `include: tests/**/*.spec.ts` 把 Playwright e2e 文件吞入收集，suite 报错 | **FAIL（MAJ-2）** |
| e2e 红线冒烟 | **6/6 绿**（Boot 默认套装/组 8 / R-01 同步路径 / 同卡轻反馈 / R-02 翻转互斥 / T-08 遮罩 / R-15 减敏） | PASS |
| 构建 | vite build 通过，gzip **353.89KB**（我方构建实测；与证据 353.37KB 同量级，R-09 预算基准吻合） | PASS |
| Phaser 3.90 升级纪律 | ADR-001 v1.0.2 + checklist §4 + architecture §11 三步纪律留痕齐备；但 **architecture.md §1 选型表仍写 3.88.x 未同步** | PASS（文档同步项 MIN-3） |

**E1 九 Story 数据/逻辑面判定：PASS**——152 用例口径对照 GDD §8 逐项成立（八条边缘含隐私降级/配额链/双坏回退、三档 texmem、白名单 guard、GAP-4 分组完整性、E4-S01 对账 14 例）。工程实现质量高，特别是 hostile Storage 原型补丁 + finally 还原的边缘测试法（回应我 scaffold 评审 C-2）。

## 2. 烟雾 9 步闭环实测（基线，真实穿/卸循环）

| 步 | 实测 | 判定 |
|---|---|---|
| S1 首启 | 默认套装 TOP/HAIR_B/HAIR_F 齐、组=8、texmem BODY_front 在册、零 pageerror | PASS |
| S2 单次试穿 | tapUnequip→tapCard 真实循环：`unequipped`(0.3ms)→`applied`(0.1ms)，tryOnTotal 0→1 | PASS |
| S3 连点 | 5 组连续点选全命中「当前穿着置顶」→ 全轻反馈零误动作（组内次序规则的副证）；穿/卸连击 5 对 count +5、末态=末次点选、无中间态泄漏 | **PASS 但抓出 MAJ-1（见 §3）** |
| S4 旋转 | flip→back 落位、翻回 front 正常 | PASS |
| S5 背面试穿 | 背视图下真实 tryOn `applied`、视图保持 back、HEAD 换装成功 | PASS |
| S6 防抖后重进 | 700ms 窗后 reload：装扮/stats 完整一致 | PASS |
| S7 防抖窗内冲刷 | tapCard 后立即 pagehide → reload 零丢失 | PASS |
| S8 卸下空槽持久 | tapUnequip('HEAD') → reload 后 HEAD=null 持久一致 | PASS |
| S9 控制台巡检 | 零 pageerror；唯一 console.error = `/favicon.ico` 404（index.html 无 icon link，每次启动必报） | PASS（MIN-2） |

## 3. 缺陷与口径偏差清单（按严重度）

| # | 严重度 | 缺陷 | 证据 | 判据 |
|---|---|---|---|---|
| **MAJ-1** | **Major** | **卸下操作未计入 tryOnTotal**：GDD wardrobe §3 明文「每次成功 `tryOn/unequip` 计 tryOnTotal」、§2.2 状态机「点选卡片（含卸下卡）→ bumpStat」；实现 `tryonController.ts:77` 以 `p.itemId !== null` 过滤掉卸下事件，且 `wardrobe.spec:156-157` 把该偏差固化为断言。我方实测：5 组穿/卸对计数 +5（GDD 口径应 +10） | wardrobe §3/§8.8、local-save §6 bumpStat | **修复（去 null 过滤）或走决策记录改 GDD——二选一，不许默认** |
| **MAJ-2** | Major | `npm test` 在 HEAD 为红：vitest include 吞 e2e 文件致 suite 收集失败；「152/152」实为 scoped 运行结果，仓库门命令不可用 | vitest.config.ts include 模式 | 修 include/exclude（CI 门必须单命令全绿） |
| **MAJ-3** | Major | **R-01 证据有效性**：`tools/evidence-m1.ts` 8 次采样点的全是已穿着卡 → 全程 `lightFeedback` 空操作，**真实 tryOn 路径从未被测**；e2e 断言 `after >= before` + type 含 lightFeedback → 空转可绿。我方真实路径复测（穿/卸循环 16 样本）：max **0.1ms**（数据面成立），但落档证据必须按真实路径重采 | 证据口径纪律（sprint1-qa-plan §2.1） | 重采 evidence（用 tapUnequip→tapCard 循环）+ e2e 断言收紧（type 必须可出现 applied、count 必须 +1） |
| MIN-1 | Minor/备案 | `stats.triedItems` 数组为 local-save §2.1 冻结 schema 外新增字段（服务 tryOnUnique 判重，上限≈50 项、体积影响可忽略） | ADR-002 §4.4 纪律：新字段须备案可派生可默认 | 走备案（非阻塞） |
| MIN-2 | Minor | /favicon.ico 404 每次启动报 console.error | 实测 curl 404 | index.html 加 icon link 或 data-URI 空 icon |
| MIN-3 | Minor | architecture.md §1 选型表仍写 Phaser 3.88.x（§11 已更新 3.90） | 文档检查 | 同步一行 |
| MIN-4 | Minor（在途） | HEAD 探针无 dev-only 门控（prod 构建暴露 `__hz` 全量 app/game 引用）——**程基岩已在途修复**（动态 import + `import.meta.env.DEV`，方向正确，prod 分支消除可静态证明）；在途 probe.ts 现有 1 个 TS 错误属半成品态，不计判 | sprint1-qa-plan §2.0 前置要求 | 下轮交付验收：prod 产物 grep 零 `__hz` + e2e 改走探针通道 |

## 4. testing-scaffold 六盲区（我评审项）在 E1 交付的落实情况

| 盲区 | 落实判定 |
|---|---|
| C-1 headless 动效时长 | **达标方向**：tween-svc 只断言配置常量（durationMs 逐值 vs 美术圣经 §8.2），未假绿时序；真实时长正确归入 e2e/探针层 |
| C-2 localStorage 真实性 | **单测层达标**（hostile 原型补丁）；**Playwright 隐私仿真未落**（testing-scaffold §1 计划的 privacy-mode.spec 不存在）→ 挂账下轮 |
| C-3 契约快照漏行为 | **部分达标**：coins:changed 事件序、tryon:done 单通道有断言；`onTryOn` 恰发语义未按槽断言；GDD §6 表本体未作测试数据 → 挂账下轮 |
| C-4 flaky 规范 | 未文档化/无 CI 通道 → 记录在案（Sprint 1 人工复测定案可接受） |
| C-5 production 构建告警断言 | 未落地（console texmem warn=0 断言不存在）→ 挂账 |
| C-6 覆盖缺口 | ①旋转拖拽路径 A：UiScene 已实现拖拽区，但 e2e/unit 均无手势用例 → 挂账；②R-14 cap=2 canvas 后备存储断言缺 → 挂账；③缩略图视口零请求断言：灰盒期合理顺延（待缩略图资产管线）；④摇头 200ms：constants.spec:134 已断言值 ✓（e2e 交互级随 UI 资产补测） |

另：本人在主工作区被在途改动污染过一轮验证——**流程建议**：实现方在交付窗口内请经主理人声明「代码冻结点」，QA 以 commit hash 为唯一验证对象（本轮已按此执行，无实质损失）。

## 5. M1 出口判定：**CONCERNS（有条件接受）**

- **数据/逻辑面**：三红线的数据面证据在我方独立环境全部复现（R-01 同步路径真实循环 max 0.1ms、R-02 翻转落位 140.7ms 量级吻合剪影中点设计、打断/无队列/轻反馈/减敏判定全绿）；
- **未闭环三件**：①视觉面口径（pointerup→首帧、≥30 样本、max 硬判）依赖探针 v2 + 检查点②证据——**待到达后我按计划 §2.1~2.4 正式取证**；②MAJ-1 计数口径缺陷须修复或决策；③MAJ-3 证据重采。三者闭环前，M1 我方判定保持 CONCERNS，不放行最终 PASS。
- fh 视觉条款：P0 资产 29 件已入库 → **E1-S07 锚线校验（≤2px）补测可立即排期**；P1 缺件对应条款顺延（与主理人通报一致）。

## 6. 转办请求（经主理人）

1. **程基岩**：修 MAJ-1（或走决策）、MAJ-2、MAJ-3 证据重采 + e2e 断言收紧；探针 v2 完成后我复验（重点：prod 零暴露静态证明）。
2. **检查点②证据**到达后我执行 M1 视觉面正式取证；P0 锚线校验补测如需走查脚本我可出（BODY+校验图已在库）。
3. MIN-1（triedItems）走 ADR-002 §4.4 备案；MIN-2/3 顺手修。

---

*证据原始输出已随本报告落档；隔离 worktree 已清理。维护：严守真。*
