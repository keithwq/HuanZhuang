# Sprint 1 · M1 质量门终判（无条件 PASS）

> 版本 v1.0 · 2026-11-21 · 严守真（quality-lead）· 触发：主理人终判指令（P5-QL-004）
> 判定对象：冻结点 **HEAD `049e21a`**（工作区双静止确认；我两份 QA 报告 untracked 留存于 production/qa/）
> 方法：git worktree 隔离复跑（round2 起既定纪律：QA 只认冻结点 hash）

---

## 1. 终判条件逐项（全部我方隔离环境实测）

### 条件一：MAJ-2b 双态门 — **PASS**

| 状态 | 实测 | 判定 |
|---|---|---|
| 干净检出（无 dist/） | **170 通过 + 1 skip（171）、exit 0、零 ENOENT**——R-16 卫生用例正确跳过，收集期零 fs 调用 | PASS |
| 构建态（npm run build 后） | **171/171 全绿、exit 0**；TS strict 0 错误 | PASS |

途中一次 EPERM（Windows 临时目录写入被拒）复跑即绿——**环境瞬态非代码缺陷**，已按 C-4 纪律归因留痕；CI 化时建议配 rerun-on-flake 策略。构建态 R-16 复核：prod 产物 grep 仍仅 `__hz_probe__` 豁免项 ✓。

### 条件二：7432c24 变更单 delta 复验 — **PASS**

| 复验项 | 实测 | 判定 |
|---|---|---|
| 45/39/6 冻结计数 | 我方独立复算：服装 45 = shop 39 + unlock 6 ✓；家具 30 = shop 24 + unlock 6 ✓ | PASS |
| 可购目录定价（economy §4.2/§8.3） | 我方独立复算 **shop 合计 16,560 ∈ [16,200, 19,800]** ✓（口径 = shop 池，与断言 `shopClothingTotal()+shopFurnitureTotal()` 一致） | PASS（附 nit，见 §3） |
| 连衣裙遮蔽三处 | ①BTM 遮蔽+状态保留：默认 TOP=连衣裙、初始 outfit 含 BTM=skirt 选择态，171 门内「默认 TOP 为连衣裙：BTM 遮蔽语义与初始 outfit 一致」用例绿；②首屏层序/初始档快照一致：Boot 冒烟 e2e 绿；③G4 页签持续 Caption：btmOccludedCaption 路径用例绿 | PASS |
| **MAJ-1 断言未回退** | `wardrobe.spec:126-128` 原样存续（`tapUnequip('TOP') → unequipped` + `tryOnTotal = before+1`，注释引 wardrobe §3）✓ | PASS |

### 条件三：E3-S01/S02 增量面 — **PASS**

e2e **12/12 全绿**：新增 look-overlay 3 用例——回穿 13 槽一致 + 静默批量零计数 + ≤300ms（look-save §8.2/8.3/8.5）、9 位上限双保险（接口层第 10 次拒绝，§8.4）、回穿后新点选覆盖无中间态泄漏（§5.4）；look-panel 单测 15 例含在 171 门内全绿。

---

## 2. 终判

**M1 质量门：无条件 PASS。**

三红线（R-01 n=35 max 66.4ms / R-02 n=30 max 158.1ms / 帧采样 p95 8.5ms dropBursts 0）、双路径旋转（按钮证据 + 我方手势运行时实测）、动效可打断、GAP-4 页签数据面、烟雾闭环、三 MAJ 修复、探针 R-16、MAJ-2b 双态门、变更单 delta、E3 增量面——Sprint 1 M1 出口（E2-S04 验收通过）在 QA 侧**全部取证闭环**。fh 视觉条款按灰盒纪律挂账资产补测（P0/P1 已到位待对齐，E1-S07 锚线 ≤2px 校验可立即排期）。

**Sprint 2 放行（QA 视角）：无 QA 阻塞项。**挂账随 Sprint 2 批次节奏：①手势路径 A e2e 自动化；②真机 1 台佐证（R-01/R-02/帧率）；③R-01 补 G8 样本；④C-2 隐私仿真/C-3 行为契约补强/C-5 prod 告警断言/R-14 canvas 断言；⑤fh 补测清单。

## 3. 一条文档 nit（非阻塞，转程基岩随手改）

变更单声明「移除 3 件后定价 16,800」，我方实算 **16,560**（差恰一件 240 价位）。GDD 判据（18,000±10% 区间）不受影响；建议变更单数值改为实算值或注明口径差，避免后续对账引用失真。

## 4. 沉淀

- 冻结纪律两次违例的经验已入 round2 报告——本轮「双静止 + 终判期内零改动」执行良好（终判后新出现的 room/ 工作区文件属 Sprint 2 开工，不影响本判定）；
- 我的三份 QA 报告（round1 / round2 / 本终判）均在 `production/qa/`，建议随下个 docs commit 一并入库存档（处置权归主理人）。

---

*维护：严守真。M1 门自此关闭；后续质量门按 Sprint 2 节奏（M2/M3 出口另立验证方案）。*
