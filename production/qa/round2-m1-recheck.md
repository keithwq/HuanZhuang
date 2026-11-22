# Sprint 1 · M1 质量门复验报告（冻结点 4fb75b6 · 三 MAJ 验收）

> 版本 v1.0 · 2026-11-21 · 严守真（quality-lead）· 触发：主理人复验指令（P5-QL-003）
> 验证对象：**冻结点 commit `4fb75b6`**，git worktree 隔离复跑（主工作区在验证窗口内再次出现并发改动，见 §5）
> 判据：sprint1-qa-plan.md §2.0~2.4 口径 + GDD §8 原文 + checklist R/T 编号

---

## 1. 三道门复跑（隔离环境实测）

| 门 | 实测（4fb75b6） | 判定 |
|---|---|---|
| `npm test` 单命令门 | **dist 已构建时：153/153 全绿（12 文件，含 prod-bundle-hygiene 1 用例）**；**干净检出不构建时：红**（见 MAJ-2b） | **条件通过** |
| TS strict | `tsc --noEmit` 0 错误；`npm run build` 通过（gzip 353KB 量级） | PASS |
| e2e | **9/9 绿**：探针冒烟 3（tap_in→render_commit / flip 时序 / 帧间隔+texmem）+ Boot + R-01 真实路径（type=applied、计数恰 +1）+ 同卡轻反馈 + R-02 + T-08 + R-15 | PASS |

## 2. 三 MAJ 验收

**MAJ-1（卸下计数）— PASS（三层验证）**：①代码：null 过滤已去除、口径注释与 GDD wardrobe §3 一致；②断言：save-api「unequip 计数路径」+ wardrobe「卸下卡 +1」同步修正；③**我方运行时实测**（探针通道）：穿/卸对 total +2、卸下步恰 +1、重穿已试件 unique +0——null 不参与 unique 语义正确。

**MAJ-2（单命令门）— 部分通过，新发现 MAJ-2b**：vitest include 收窄本身 ✓（e2e 不再被吞、153 用例确认）；但新增 `prod-bundle-hygiene.spec.ts` 的 `describe.skipIf(!existsSync(DIST))` 写法有缺陷——**skip 分支下 describe 回调仍会执行，`readdirSync(DIST)` 在干净检出（无 dist/）上于收集期抛 ENOENT → `npm test` 必红**。实现方机器有 dist/ 才绿，门命令呈构建顺序依赖。一行修复（把 readdirSync 挪进 beforeAll/用例内或补 existsSync 守卫）+ 复跑即可闭环。

**MAJ-3（R-01 证据口径）— PASS**：新证据 n=35 为真实穿/卸循环（探针 POST_RENDER 落帧差，非调用栈差）；轻反馈不产样本（我核验了采样脚本 `tools/evidence-m1.ts`：tapUnequip→tapCard 循环驱动）；e2e 断言收紧（type=applied、计数恰 +1）。

## 3. 探针 v2 与 R-16 验收 — PASS

- **prod 零暴露**：我方在隔离区构建 prod 后 grep 产物——`__hz` 仅 1 处命中且为 `__hz_probe__`（StorageDriver 探测键，主理人声明的合理豁免），探针本体零残留；
- dev 通道完整：tap_in（真实 pointerup 双路）/ render_commit（脏版本+POST_RENDER）/ flip_start/flip_commit / rAF 帧间隔 / texmem 报表 / reset——与 QA 计划 §2.0 前置要求逐项对齐；
- **R-16 落档核验**：checklist #28 红线入表（含主理人批准备案注记）✓；
- e2e 配置切 dev 服务器（探针仅 dev 暴露）——配置注释正确引用了我 §4.1-C5 的要求，处置合理。

## 4. M1 红线证据复核（按 QA 计划口径）— 全 PASS

| 红线 | 实测 | 我的口径 | 判定 |
|---|---|---|---|
| R-01 tap_in→render_commit | n=35（G1~G7 穿/卸循环），p50 8.0 / p95 65.6 / **max 66.4ms** | ≥30 样本、max ≤300 硬判 | **PASS** |
| R-02 flip_start→flip_commit | n=30（按钮路径），p50 149.4 / **max 158.1ms**（剪影设计中点吻合） | ≥30、max ≤300 | **PASS** |
| 帧间隔 | n=1650，p95 8.5ms、dropBursts（≥3 连续 >25ms 段）= 0 | §2.4 操作化口径 | **PASS** |
| 动效可打断 | unit 状态机 + e2e 真实路径 + 连跑两轮定案（C-4 纪律声明） | §2.3 | PASS |
| **路径 A 手势** | **我方运行时实测**：左拖 >40px→back、短拖 15px 忽略、右拖→front、探针录得 2 样本 | paperdoll §8.5 双路径 | **PASS（本轮我方补测闭环）** |

## 5. 流程事件（第二次）与判定范围声明

- 验证窗口内主工作区再次出现并发改动（items/defaults/data-tables.spec 等 9 文件 22:03~22:07 被实时编辑，正是我首轮 `npm test` 失败集合漂移的原因）；该改动随后落为 `7432c24`（P1 资产对齐：starlight→starnight 重命名、45/39/6 冻结计数、连衣裙语义复核、156 用例）。**本报告全部判定只对 4fb75b6 负责**；`7432c24` 触及我验证过的面（数据表/默认套装/相关断言）→ 建议主理人令其声明**新冻结点 + 变更单**，我按增量范围做 delta 复验（重点：数据表对账 45 计数、连衣裙 BTM 遮蔽语义、MAJ-1 相关断言未回退）。
- 冻结纪律建议升级：**冻结 = HEAD 与工作区双双静止**；冻结期内任何提交须重新声明冻结点，避免验证污染与「实现方绿≠门绿」的假象。

## 6. 结论：M1 质量门 **CONCERNS → PASS（附条件与挂账）**

三红线按我的口径全部取证 PASS、三 MAJ 中两项闭环（MAJ-2 含一行修复的新尾巴）、探针基础设施达标、R-16 落档——**M1 出口在我方判据下成立**。

**放行条件（须先闭环，均为分钟级）**：MAJ-2b 一行修复 + 干净检出 `npm test` 复跑全绿。

**挂账（不阻塞 M1，Sprint 2 批次）**：①路径 A 手势 e2e 自动化用例（本轮我已运行时人工闭环，自动化缺口在）；②真机 1 台佐证（R-01/R-02 + 帧采样）；③R-01 样本未含 G8（卸下/重穿 BK/FX 可补）；④既有 C-2/C-3/C-5/C-6 挂账项照旧；⑤fh 视觉补测清单（P0/P1 已到位待对齐——E1-S07 锚线 ≤2px 校验可立即排期）。

---

*维护：严守真。本报告判定对象为 4fb75b6；7432c24 及后续提交不在本轮范围，待新冻结点声明后 delta 复验。*
