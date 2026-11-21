# M1 达成证据 · 点选即换首次可玩（E2-S04 验收通过）

> 采集时间：2026-11-21 · 环境：Windows / Edge (Playwright channel msedge, headless) / 视口 390×844 DPR2 / **vite dev 服务器（探针口径）**
> 采集基础设施：**window.__hz dev-only 探针**（src/core/probe.ts，QA 计划 §2.0 口径：tap_in→render_commit / flip_start→flip_commit / rAF 帧间隔 / texmem 报表；R-16 门控：prod 构建零暴露——tests/unit/prod-bundle-hygiene.spec.ts 静态断言）
> 采集脚本：`tools/evidence-m1.ts`（≥30 样本/红线，p50/p95/max，PASS 判据 = max ≤300ms 逐次承诺，QA §2.0-3）
> 对应红线：R-01 / R-02 / R-06 行为面 / QA §2.4 帧口径

## R-01 · tap_in（pointerup）→ render_commit（换装确认动效首帧）（QA §2.1 口径）

| 指标 | 实测（n=35，跨 G1~G7 穿/卸循环；G8 光效组灰盒默认集空、首轮跳过） | 红线 | 结论 |
|---|---|---|---|
| p50 | **8.0ms** | — | — |
| p95 | **65.6ms** | — | — |
| **max** | **66.4ms** | ≤300ms | **PASS** |

> 口径备注：样本为真实 POST_RENDER 落帧差（非同步调用栈差）；「可见变化帧」由 tryon:done 渲染版本驱动，
> 轻反馈（同卡点选）不产样本——判据生效证据。真机 1 台佐证样本（QA §2.1 要求）待严守真取证轮补充。

## R-02 · flip_start（翻转请求）→ flip_commit（新视图首帧展开）（QA §2.2 口径）

| 指标 | 实测（n=30，按钮路径驱动；手势 touch 仿真归 QA 取证轮） | 红线 | 结论 |
|---|---|---|---|
| p50 | **149.4ms**（≈设计中点 T/2=150ms，剪影公式落位吻合） | — | — |
| p95 | **158.0ms** | — | — |
| **max** | **158.1ms** | ≤300ms | **PASS** |

- 过渡中再翻转被忽略（无队列）：单测 viewswap.spec 7 用例 ✓；e2e 双往返稳定 ✓

## 帧间隔（QA §2.4 口径：p95 ≤25ms + 连续掉帧段 <3）

| 指标 | 实测（n=1650，稳态窗口） | 口径 | 结论 |
|---|---|---|---|
| p50 / p95 / max | 8.3 / 8.5 / 11.4ms | p95 ≤25ms | **PASS** |
| dropBursts（≥3 连续 >25ms 段） | **0** | <3 帧段 | **PASS** |

## texmem 报表（灰盒口径；真实 @2× 资产实测归 E5-S01）

- 稳态 currentMB ≈ **9.5**（灰盒小尺寸占位纹理）/ peakMB 10.0 / keys 19（BODY×2 + 默认套装双视图）——
  懒加载对称卸载语义正确（R-06 行为面）；灰盒数值不作预算结论，真实口径待资产全量。

## 单测基线

- vitest：**153/153 通过**（12 文件：constants 18 / save-edge 17 / save-api 18 / paperdoll 16 /
  viewswap 7 / tween 12 / wardrobe 15 / hud 16 / texmem 7 / data-tables 14 / contracts 12 /
  **prod-bundle-hygiene 1（R-16 静态断言）**）
- TS strict：0 错误；`npm run build` 通过（gzip 353.37KB）
- e2e：**9/9 × 两轮连跑定案**（C-4 纪律；探针冒烟 3 用例 + Boot/R-01/R-02/T-08/R-15）

## ⛧ 灰盒补测清单（资产到位后复测项，epics/README §4）

| # | 待补测项 | 阻塞的验收条款 | 等待资产 |
|---|---|---|---|
| 1 | 真实贴图加载链（PreloadScene 灰盒生成器替换为 Phaser Loader + markTexturesReady 异步回执） | paperdoll §8.1（锚线校验 ±2px） | BODY 双图 + 校验图（P0）——**已到位待对齐**（见下） |
| 2 | 混搭 ≥20 组真实资产视觉走查 | paperdoll §8.3 | 首套 13 槽双视图（P1）——**已到位待对齐** |
| 3 | 纹理内存三档实测（45/75/60MB，@2× 真尺寸口径） | paperdoll §8.4 / cal-04 §7 三用例 | 全量资产（P2+ 滚动） |
| 4 | 图标/UI 图集视觉对照 + 触控目标实测 | hud §8.1/8.2、wardrobe §8.6/8.7 | UI 图集（已到位待对齐） |
| 5 | 加载屏插画替换（灰盒月亮占位 → 美术圣经 §7③） | ux-spec §5.1 一图两用 | 开场插画 |
| 6 | 帧率 60fps 目标 / 30fps 容忍真机采样 | paperdoll §8.7 / R-04 | 全量资产 + 真机 |

## 灰盒已知限制（诚实声明）

- 衣柜网格以点按为等价路径承接页签/卡片交互（横向滑动手势区 Sprint 2 接入——E2-S03 声明项）；
- 房间/商店/成就标签为灰态摇头 + toast（Sprint 2/3 范围，非 M1 验收面）；
- 安全区避让以 env() CSS 注入待真机核（hud §5.2，E5-S02）；
- **资产命名对齐缺口**（starnight 交付集 vs starlight 数据表集）待主理人拍板处理路径（M1 回执已报）；
- 探针 tap_in 双路口径：真实 pointerup（input.events 挂接）与 QA 钩子驱动（markTapIn 包装）共用——
  严守真 touch 仿真取证时自动走真实路径。

