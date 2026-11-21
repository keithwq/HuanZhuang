# M1 达成证据 · 点选即换首次可玩（E2-S04 验收通过）

> 采集时间：2026-11-21 · 环境：Windows / Edge (Playwright channel msedge, headless) / 视口 390×844 DPR2 / vite preview (dist 静态产物)
> 采集脚本：`tools/evidence-m1.ts`（Playwright 驱动，浏览器侧 performance.now 计时）
> 对应红线：R-01（试穿 ≤300ms）/ R-02（旋转过渡 ≤300ms）/ R-06（翻转峰值窗口）

## R-01 · 点选 → 变装同步路径（wardrobe §8.1 / paperdoll §8.2）

| 指标 | 实测 | 红线 | 结论 |
|---|---|---|---|
| tapCard 同步路径 8 次采样（头饰组 穿/同卡循环） | max **0.1ms**（状态落位 + tryon:done 事件 + applyRender 信号，单调用栈） | ≤300ms | **PASS** |
| e2e 断言（tests/e2e/redline-latency.spec.ts） | 6/6 绿（含同卡轻反馈、计数入 stats 单通道） | — | PASS |

> 口径声明：本值为「点选→状态+渲染信号」同步路径（视觉 paint 发生在下一帧，headless 下不可测帧
> 精确度）；**真机视觉延迟与 60fps 帧采样归 E5-S01（DevTools Performance 剖析）**——同步路径 0.1ms
> 留出 300ms 预算的 >99% 余量给渲染与触摸采样，M1 口径下判定成立。

## R-02 · 正/背翻转（paperdoll §8.2）

| 指标 | 实测 | 红线 | 结论 |
|---|---|---|---|
| request('back') → 模型视图落位 | **140.7ms**（设计落位点 = 剪影中点 T/2=150ms，实测吻合） | ≤300ms 全程 | **PASS** |
| 过渡窗口内 texmem 键数 | 20（= BODY×2 + 默认套装 9 件 ×2 视图——懒加载对称卸载语义正确） | 峰值 ≤75MB（键数行为面） | PASS |
| 过渡中再翻转被忽略（无队列） | 单测 viewswap.spec.ts 7 用例 | — | PASS |

## 布局/遮罩/减敏（E2 灰盒面）

- T-08 竖屏遮罩：横屏 → #rotate-mask 显示（e2e PASS，569ms 内稳定）
- R-15 减敏：reducedMotion:'reduce' 仿真 → app.reducedMotion()=true（e2e PASS）
- 构建产物：index-*.js gzip **353.37KB**（ADR-001 预估 ≈350KB gz 吻合，R-09 TTI 预算基准）

## 单测基线

- vitest：**152/152 通过**（11 文件：constants 18 / save-edge 17 / save-api 18 / paperdoll 16 /
  viewswap 7 / tween 12 / wardrobe 15 / hud 16 / texmem 7 / data-tables 14 / contracts 12）
- TS strict：0 错误；`npm run build` 通过

## ⛧ 灰盒补测清单（资产到位后复测项，epics/README §4）

| # | 待补测项 | 阻塞的验收条款 | 等待资产 |
|---|---|---|---|
| 1 | 真实贴图加载链（PreloadScene 灰盒生成器替换为 Phaser Loader + markTexturesReady 异步回执） | paperdoll §8.1（锚线校验 ±2px） | BODY 双图 + 校验图（P0） |
| 2 | 混搭 ≥20 组真实资产视觉走查 | paperdoll §8.3 | 首套 13 槽双视图（P1） |
| 3 | 纹理内存三档实测（45/75/60MB，@2× 真尺寸口径） | paperdoll §8.4 / cal-04 §7 三用例 | 全量资产（P2+ 滚动） |
| 4 | 图标/UI 图集视觉对照 + 触控目标实测 | hud §8.1/8.2、wardrobe §8.6/8.7 | 类目图标 8 组 + UI 图集（P0 UI） |
| 5 | 加载屏插画替换（灰盒月亮占位 → 美术圣经 §7③） | ux-spec §5.1 一图两用 | 开场插画 |
| 6 | 帧率 60fps 目标 / 30fps 容忍真机采样 | paperdoll §8.7 / R-04 | 全量资产 + 真机 |

## 灰盒已知限制（诚实声明）

- 衣柜网格以点按为等价路径承接页签/卡片交互（横向滑动手势区 Sprint 2 接入——E2-S03 声明项）；
- 房间/商店/成就标签为灰态摇头 + toast（Sprint 2/3 范围，非 M1 验收面）；
- 安全区避让以 env() CSS 注入待真机核（hud §5.2，E5-S02）。
