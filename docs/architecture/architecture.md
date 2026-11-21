# HuanZhuang 主架构文档

> 版本 v1.0 · Phase 3 技术搭建 · 2026-11-21 · 程基岩（engineering-lead）
> 输入基线（全部冻结）：decisions.md v1.0（D0~D3）、systems-index.md v1.0、design/gdd/systems/ 8 册 GDD v1.0、art-bible.md v0.5、CLAUDE.md 无（本仓库尚无工程配置，Phase 5 建仓时按本文档 §12 生成）
> 决策记录：ADR-001（引擎）/ ADR-002（存档）/ ADR-003（纹理内存与 DPR 策略）；CAL-04 核对单：cal-04-review.md；技术风险与红线汇总：checklist.md
> 纪律：本文档不改写任何 GDD §6 冻结接口语义；新判断全部标注来源（决策编号或 GDD 册节号）；GDD 未覆盖且非纯实现细节的事项 → 走 checklist.md「需用户拍板」通道。

---

## 1. 技术选型定稿

| 项 | 结论 | 依据 |
|---|---|---|
| 渲染引擎 | **Phaser 3.88.x**（补丁线钉定，Phase 5 开工前复核最新稳定版，checklist.md G-01） | ADR-001 |
| 语言 | TypeScript（strict） | ADR-001 配套：13 槽/21 锚点/静态配置表强类型化 |
| 构建 | Vite → 纯静态 `dist/` | D1-13 无服务端 |
| 部署 | 任意静态 HTTP(S) 托管（gzip/brotli + 长缓存），无后端、无账号、无云 | D1-13、任务派发口径 |
| 输入 | 触屏唯一（D0）；`touch-action: none` + viewport 锁定；桌面浏览器仅调试用（hud-layout §5.1 横屏/桌面提示口径） | D0 |
| 画幅 | 逻辑宽固定 720，逻辑高随屏比自适应（9:16 基准，长屏增益归舞台区）；竖屏锁定遮罩 | hud-layout §4/§5.7 |
| 渲染 DPR | 后备存储 = CSS × min(deviceDPR, 2)；部件 @2× / 背景类 @1× | ADR-003 / CAL-04 |

**框架使用范围声明**：启用 Phaser 的 渲染 / Loader / Tween / Input / **Sound** 五族（Sound 族 v1.0.1 补丁增补，见 ADR-001 补丁记录——D4-01 轻量音频包所需，audio-plan.md §4）；物理、Tilemap、多摄像机、Spine、音频中间件一律不用（ADR-001）。

## 2. 技术需求追溯表（GDD → 模块）

| GDD 册 | 系统 | 技术职责 | 模块路径 | 冻结接口（不得改写） |
|---|---|---|---|---|
| paperdoll-render | S01+S02 | 13 槽分层合成、正/背切换、动效白名单 | `src/systems/paperdoll/` | tryOn / unequip / setView / getOutfitSnapshot / onTryOn / onViewChange / 舞台挂载 |
| local-save | S04 | 持久化唯一权威、双键轮换、降级、日期翻转 | `src/systems/save/` | load / getOwned / addItem / setOutfitSlot / saveLook / applyLook / deleteLook / addCoins / spendCoins / setPlacement / onDayFlip / bumpStat / getAchievement / claimAchievement |
| wardrobe-tryon | S03 | 抽屉衣柜、点选即换状态机、筛选 | `src/systems/wardrobe/` | 抽屉挂载 / onTabChange / 试穿事件经 S01 回调 |
| hud-layout | S05 | 容器：布局/舞台/抽屉/覆盖层/角标 | `src/systems/hud/` | getStage / getDrawer / openOverlay / closeOverlay / onModeChange / setCurrencyDisplay / setBadge |
| look-save | S06 | 9 位造型、迷你实时渲染、批量回穿 | `src/systems/looks/` | 经 S04 唯三接口 + onLookApplied |
| economy-acquire | S08+S10 | 商店覆盖层、购入流、成就惰性判定 | `src/systems/economy/` | 全部发放走 S04 冻结接口；setBadge/setCurrencyDisplay |
| room-decoration | S07 | 房间舞台、锚点吸附、Y 排序、氛围光 | `src/systems/room/` | setPlacement 唯一路径 / onFurniturePlaced / onAmbienceTierChange |
| daily-task | S09 | 三槽位抽取、进度推进、领取 | `src/systems/daily/` | 判据唯一源 S04.stats / addCoins(150,'daily_task') / onDayFlip |

横切模块：

| 模块 | 职责 |
|---|---|
| `src/core/` | 引擎引导、场景路由、事件总线（typed EventBus）、常量表（锚线/挂点/21 锚点坐标——写死常量，禁止散落，美术圣经 §5.2 纪律） |
| `src/texmem/` | 纹理预算会计（ADR-003）：全项目唯一纹理进出登记 |
| `src/data/` | 静态配置表（§8）：物品/家具/任务/成就/点位/标签，全部强类型、不入档（local-save §4 口径） |

## 3. 项目目录结构

```
HuanZhuang/
├── index.html               # viewport 锁定 + touch-action + 字体栈（美术圣经 §3.1）
├── vite.config.ts
├── package.json / tsconfig.json
├── src/
│   ├── main.ts              # 引擎引导：renderScale、场景注册、WebGL 探测
│   ├── core/
│   │   ├── bus.ts           # typed EventBus（领域事件唯一通道）
│   │   ├── constants/
│   │   │   ├── slots.ts     # 13 槽 + 正/背两张独立层序表（paperdoll §2.1/§5.4 红线：禁一张表加翻转推导）
│   │   │   ├── anchors.ts   # 角色挂点 4 个（美术圣经 §5.2）
│   │   │   ├── room-anchors.ts  # 21 锚点坐标（美术圣经 §10.5，键名零差异）
│   │   │   ├── audio.ts     # 音量表：VOL_BGM 0.55 / VOL_SFX_TRYON 0.35 / VOL_SFX_SETCOMPLETE 0.60 / VOL_SFX_CLAIM 0.50（audio-plan §4.3 提案值，Phase 5 真机校准）
│   │   │   └── budget.ts    # 三档内存阈值 + 动效白名单时长表
│   │   └── scenes/
│   │       ├── BootScene.ts       # 引擎最小集 + 加载屏（开场插画兼任，美术圣经 §7③）
│   │       ├── PreloadScene.ts    # 当前视图 13 槽 + UI 底图（经 texmem 登记）
│   │       ├── StageScene.ts      # 舞台：纸娃娃容器 ⇄ 房间容器（一活）
│   │       └── UiScene.ts         # HUD 全部：顶导/标签栏/抽屉宿主/覆盖层/角标/toast
│   ├── texmem/
│   │   └── accountant.ts    # ADR-003 §2
│   ├── systems/
│   │   ├── paperdoll/       # S01+S02：compositor / viewSwap / tweenSvc(白名单) / gesture
│   │   ├── save/            # S04：SaveService / StorageDriver / WritePolicy / DayFlip / migrate
│   │   ├── wardrobe/        # S03：drawerUi / grid / filter / tryonController(状态机)
│   │   ├── hud/             # S05：layout / modeSwitch / overlayMgr(单层互斥) / badge
│   │   ├── looks/           # S06：lookPanel / miniRender(0.4 缩放复用合成) / applyFlow
│   │   ├── economy/         # S08+S10：shopPage / purchaseFlow / achievePage / lazyJudge
│   │   ├── room/            # S07：roomStage(y-sort) / placeFlow / ambience(棘轮)
│   │   ├── daily/           # S09：taskPage / draw3(三槽位抽取+可达性) / claimFlow
│   │   └── audio/           # E6：SFX 挂钩 / BGM 生命周期 / 播放纪律 P-1~P-4 guard（audio-plan §4.4）
│   ├── data/                # §8 静态配置表
│   └── ui/                  # 通用 UI 部件（按钮/卡片/toast/Caption，不持有游戏状态）
├── assets/
│   ├── char/                # 部件 @2x，命名美术圣经 §4.4；_back 紧裁剪（cal-04 §6b）
│   ├── char-thumbs/         # _thumb @2x（wardrobe §3）
│   ├── room/                # 房间背景/家具/氛围光（背景类 @1x）
│   ├── ui/                  # 图集（合图 ≤2048×1024 @2x）
│   ├── audio/               # hz_{sfx|bgm}_{名}_{v两位}.mp3（audio-plan §5.2 命名）——3 SFX 随 Preload、BGM 延迟链（audio-plan §5.3）
│   └── boot/                # 加载屏最小集
├── tools/
│   └── texmem-report.ts    # 预算导出脚本（cal-04 §7 证据）
├── tests/
│   ├── unit/                # vitest：save 层全部逻辑 / 三槽位抽取 / 氛围光棘轮 / 状态机
│   ├── integration/         # jsdom + Phaser headless：接口契约测试
│   ├── e2e/                 # Playwright：DPR/机型仿真冒烟
│   └── evidence/            # 验收证据落档（texmem-*.md 等）
└── docs/architecture/       # 本文档 + ADR + CAL-04 + checklist
```

## 4. 分层架构与数据流

```
┌─────────────────────────────────────────────┐
│ UiScene（HUD chrome / 抽屉宿主 / 覆盖层）        │  ← 不持有游戏状态（消费方）
├─────────────────────────────────────────────┤
│ StageScene（纸娃娃合成 / 房间舞台，一活）          │  ← 纯渲染，状态由 systems 驱动
├─────────────────────────────────────────────┤
│ systems/*（玩法逻辑：状态机 / 流程 / 判定）       │  ← 经 EventBus 通信，禁止横向直调
│   ├─ paperdoll.tryOn ← wardrobe/looks 调用      │
│   └─ 全部持久化写 → SaveService（唯一入口）      │
├─────────────────────────────────────────────┤
│ SaveService(S04) + data/*(静态表) + texmem    │  ← 数据地基
└─────────────────────────────────────────────┘
```

**通信纪律**（Phase 5 代码评审逐条）：

1. systems 之间只经 `core/bus.ts` 领域事件通信，禁止 import 他人内部模块（S09 消费 bumpStat 事件流、S10 惰性判据等口径全部天然满足）；
2. 持久化写入唯一路径 = SaveService（local-save §8.1 红线）；
3. 纹理进出唯一路径 = TexMemAccountant（ADR-003 §6 红线）；
4. UI（UiScene/src/ui）不持有游戏状态，只镜像（hud-layout §2.5 容器红线）；
5. 常量（锚线/挂点/锚点表）只在 constants/ 定义，禁止散落字面量（美术圣经 §5.2 纪律）。

**典型事件链**（换装，作为模式样板）：

```
点选卡片 → wardrobe.tryonController（状态机 §2.2 无锁）
  → bus.emit('tryon:request', {slot, itemId})
  → paperdoll.compositor：texmem.register 载入新件 → 换层渲染 → tweenSvc 播白名单动效（可打断）
  → SaveService.setOutfitSlot（500ms 防抖）+ bumpStat('tryOnTotal')
  → bus.emit('stat:tryOn', …) → daily 推进当日 progress → hud.setBadge 刷新
  → bus.emit('tryon:done', …) → wardrobe 刷新穿着角标
```

**事件名登记**（bus 命名 `域:动作`；2026-11-21 P4-EL-003 增补，audio-plan §4.2 三名落位——新事件名必须先入本登记再实现）：

| 事件名 | 语义 | 发射方 | 备注 |
|---|---|---|---|
| `tryon:done` | 试穿/卸下成功回调统一口径 | paperdoll | 含 unequip（audio-plan §2.2-S1）；S06 批量回穿连发受音频层 300ms 合并窗（audio-plan §4.4 P-2） |
| `outfit:setComplete` | 套装完成（新事件） | paperdoll（换层成功后系列判定） | **判据语义归文策渊在途补 GDD 口径**（audio-plan §8.1-1，候选：同系列部件在对应槽位同时全部上身）；判据就位前**无发射源**，挂钩先行但不触发 |
| `coins:changed` | S04 余额变更（hud 册「余额变更事件刷新货币栏」语义的落字名） | SaveService（addCoins/spendCoins 成功后） | 消费方：hud 货币栏镜像（hud §6）、音频层 S3 过滤 `delta>0 ∧ reason ∈ {daily_task, achievement, milestone}`（audio-plan §2.1-S3） |
| `settings:audioChanged` | 音频开关切换即时生效通知 | hud 设置入口（经 SaveService 即时写） | 消费方：音频层 mute/恢复，无需刷新（audio-plan §7） |

## 5. 渲染架构

### 5.1 场景栈与画幅管线

- 4 场景：Boot → Preload（一次性）→ **StageScene + UiScene 并行常驻**（UiScene 输入层在上）；
- 画幅：Phaser Scale RESIZE 模式，**手动坐标系**——逻辑宽恒 720：`camera zoom = cssWidth×renderScale / 720`；逻辑高 = 720 × 屏比（长屏增益全归舞台区，hud-layout §5.7）；
- 安全区：`env(safe-area-inset-*)` → CSS 变量 → UiScene 顶导下探/标签栏上探（hud-layout §5.2）；
- 横屏/桌面调试：全屏遮罩「请旋转回竖屏」（hud-layout §5.1，`orientationchange` + resize 双监听）。

### 5.2 纸娃娃合成（S01）

- 结构：`StageScene.dressContainer` 下 13 个固定 depth 的 Sprite（depth = 层序表值），**换装 = 换 texture key，不动层结构**；
- 层序表：正/背两张独立表（paperdoll §5.4 红线——禁一张表加翻转推导）；背视图 FACE 槽 `visible=false`；
- 坐标：部件 frame 以 512×1024 画布锚线网格为基准（美术圣经 §5.1）；背视图紧裁剪件的偏移在 frame 数据（asset manifest）中复原；
- 连衣裙：TOP 试穿时 BTM Sprite `visible=false`（状态保留于 SaveService.outfit，状态与渲染解耦，paperdoll §5.1）；
- BODY：不可卸载遮蔽层，正/背两张常驻（D2-01）。

### 5.3 正/背切换（S02）

- 双路径输入：手势（StageScene 拖拽区全宽×96px，Phaser drag + 位移阈值）与「转身」按钮（UiScene）→ 同一 `setView` 入口；
- 过渡：tweenSvc 驱动 `scaleX(t)=max(|cos(πt/T)|,0.08)`（paperdoll §4 公式），T=300ms；t=T/2 时切 texture 集合；结束即 `texmem.release` 旧视图全槽（ADR-003 §3）；
- 减敏（`prefers-reduced-motion` 或用户 override）：100ms 交叉淡切、不预载剪影 3 帧（paperdoll §5.7）；
- 纹理迟到兜底：淡切补完，不出空槽（paperdoll §5.3）。

### 5.4 常驻微动效（D1-11 白名单 3 项）

- 实现：tweenSvc 内建白名单注册表——呼吸（躯干组 ±1%，3s loop）、眨眼（FACE/眼区帧切换，8s±2s，闭眼 120ms）、裙摆/发梢（HAIR_F/BTM 下缘 ±2px，4s loop）；
- **白名单外循环 tween 一律由 tweenSvc 拒绝创建**（运行时 guard，不靠约定）；一次性反馈动效（≤300ms 家族）走同一服务的 oneshot 通道，`killTweensOf` 实现可打断；
- 30fps 掉帧：时长不变（tween 按时间轴驱动，天然满足 paperdoll §4）。

### 5.5 房间舞台（S07）

- `roomContainer`：背景 → 地面 → 家具（`depth = base-y`，**摆放事件时 `sortChildren('depth')`**，零每帧排序）→ 纱幔 → 氛围光分层（3 张，按棘轮档 `visible` 开关）；
- R-01 恒最底、墙面 W 件 `depth` 固定墙体层不参与地面排序（room-decoration §4）；
- 锚点吸附：点选家具 → 摆放模式 → 兼容点位星光提示（≤300ms 呼吸）→ 点位落位 → `setPlacement`（唯一路径）→ toast 合并规则按 GDD §5.1/5.2。

### 5.6 造型迷你渲染（S06 零存储方案）

- `miniRenderer`：复用 compositor 合成函数在 RenderTexture 上按 0.4 缩放出正面快照（look-save §2.4）——**不新增纹理常驻**（RenderTexture 即用即毁，≈208×416 ≈0.34MB/次，不入预算争议区间）。

## 6. 状态与存档层

- 全部细节见 **ADR-002**；本节只列架构口径：
  - 内存态 = SaveService 单一权威镜像，systems 读写只经其接口；
  - 会话态（HUD mode、页签/筛选、摆放模式）不入档，各自模块自持；
  - 静态定义（物品/家具/任务/成就/点位）全部在 `src/data/`，不入档（local-save §4：调价/改文案零迁移）；
  - 日期翻转、成就惰性判定、三槽位抽取的**事件驱动惰性**模型（daily-task §2.4 / economy §2.2）与 EventBus 架构天然对齐：无轮询、无逐帧检查。

## 7. HUD 与覆盖层容器架构

- `UiScene` 分层（自下而上）：底导 → 抽屉宿主 → 舞台遮罩吸收层 → 覆盖层宿主 → 顶导/标签栏（常驻 chrome）→ toast/Caption 最高层；
- **OverlayManager**：单层互斥（hud §5.4）——`openOverlay(page)` 时若已有覆盖层 → 拒绝（返回 null，调用方按 GDD 口径处理：daily §5.7 排队拒绝）；覆盖层打开时遮罩吸收全部触控；
- **ModeManager**：`mode ∈ {dress, room}`；切换 = StageScene 容器交叉淡切 + 抽屉换内容 + 摆放模式自动取消（room §5.4）+ 抽屉重置默认档（hud §2.4）；过渡 ≤300ms 可打断；
- 覆盖层内容物只经 §2 接口挂载，禁止反向改容器布局（hud §2.5 红线 → 代码评审项）；
- 角标/货币栏：纯镜像（事件驱动刷新 + 关覆盖层强制刷新一次，hud §5.5）。

## 8. 静态配置表（src/data/，全部强类型）

| 表 | 内容 | 冻结来源 |
|---|---|---|
| items.ts | 45 件服装：id/槽位/价格(§4.1 曲线)/稀有度/池(shop/unlock)/系列/风格标签[1-3]/缩略图 URL | economy §3 |
| furniture.ts | 30 件家具：id/类目(L/M/S/W/R)/价格/兼容点位集/W-06 与次级位例外 | economy §3 + room §2.2 |
| tasks.ts | 11 条任务池：taskId/文案/判据(stats键+阈值)/槽位(A/B/C)/可达性前提 | daily-task §2.2 |
| achievements.ts | 21 条成就：achId/名称/描述/判据/奖励(coins\|itemId) | economy §2.2 + room §2.5 冻结值 |
| tags.ts | 风格标签全集 ≤8 组 | wardrobe §2.1 |
| milestones.ts | 每 +3 件 → 60 星尘 | economy §4.3 |
| defaults.ts | 初学者默认套装 13 槽 | paperdoll §5.5 |

> 表驱动红利：未来任何调价/文案/任务调整改表不改代码（local-save §4 收益条款的工程兑现）。

## 9. 构建与部署基线

- **构建**：`vite build` → `dist/` 静态产物；资产指纹文件名（immutable 长缓存）；`index.html` no-cache；
- **托管要求**：任意静态 HTTP 服务 + HTTPS（手机浏览器安全上下文）+ gzip/brotli（Phaser ≈1.1MB min → ≈350KB gz）+ 正确 MIME；**无任何服务端逻辑、无数据库、无账号**（D1-13）；
- **发布口径**：v1 = 一套静态产物直传托管即可；CI/CD 与遥测 **v1 不设**（无商业化、无 A/B 需求，D2-06）——Phase 5 若引入再走决策记录；
- **支持矩阵**：iOS Safari 15+ / Android Chrome 90+ / 主流国产浏览器内核（Chromium 系）＋ 微信内置 WebView（X5/XWeb）；桌面浏览器仅调试（竖屏遮罩口径）。低端机 WebGL 缺失走 Phaser Canvas2D 回退 + @1× 降级档（ADR-003 §6）。

## 10. 测试策略（验证驱动：Phase 5 每个 Story 先写测试）

| 层 | 工具 | 覆盖重点 |
|---|---|---|
| 单元 | vitest | SaveService 全部边缘（local-save §5 八条：降级/双坏/翻转/配额/负余额/9 上限/双开/悬空）；三槽位抽取可达性；氛围光棘轮；连衣裙状态解耦；经济脚本（economy §8.3 模拟 30 虚拟日） |
| 契约 | vitest + 接口签名快照 | §2 表全部冻结接口——**改签名必过评审**（防 AI 生成代码漂移 GDD 接口） |
| 集成 | jsdom + Phaser headless（Canvas2D 模式跑逻辑） | 事件链走查：试穿→计数→角标；购入→余额→镜像 |
| 端到端 | Playwright（DPR/机型仿真） | ≤300ms 三红线实测（试穿/旋转/模式切换）；竖屏遮罩；隐私模式降级 |
| 性能 | DevTools + texmem-report | CAL-04 三用例（cal-04 §7 证据路径）；60fps 帧采样 |

## 11. 风险与知识缺口

**技术风险**（完整清单含缓解措施 → checklist.md §2）：iOS Safari 隐私模式 / WebGL context lost / 低端机 Canvas2D 回退性能 / 纹理泄漏（试穿循环） / 浏览器手势冲突（双击缩放/长按选择）/ 横竖屏。

**知识缺口**（知识诚实声明）：

| # | 缺口 | 处理 |
|---|---|---|
| ~~G-01~~ | Phaser 版本线复核 | **已解除（2026-11-21，P5-EL-S1 首日）**：changelog 确认 v3.90「Tsugumi」为 v3 树末版、3.88 的 drop-in 替代、零破坏性变更；版本钉定更新 **3.90.0**（ADR-001 v1.0.2 补丁），升级三步纪律已执行（changelog 复核 / 契约 12 用例绿 / R-01~03 回归绿），实测包体 gzip 353.37KB |
| G-02 | iOS Safari WebGL 纹理总量硬上限（无公开数值，≈200MB 级经验值） | CAL-04 三档预算（≤75MB）留足 ≥60% 余量，Phase 5 真机压测确认 |
| G-03 | 微信 XWeb 对 `visibilitychange`/`pagehide` 触发时机的差异 | 存档冲刷三钩子并挂（ADR-002 §3），Phase 5 真机走查 |

## 12. Phase 5 建仓顺序（供 Epic/Story 拆分直接引用）

按 systems-index §3 优先序 + 本架构依赖：

1. **地基对**：core/常量 + SaveService（S04）与 paperdoll compositor（S01/S02）**并行开工**（互不阻塞，systems-index §2 双地基结论）；
2. S03 衣柜（第一个可玩切片：点选→变装闭环）→ S05 HUD 容器（与 S03 并行细化）；
3. S06 造型 → S07 房间 → S08+S10 经济 → S09 任务（按 systems-index §3 序）；
4. 每 Story 验收对照对应 GDD §8 + checklist.md 红线逐条留证据（`tests/evidence/`）。

---

*本文档维护人：程基岩。架构变更走 ADR；GDD 接口语义变更一律退回文策渊（经主理人）；美术资产规格变更经主理人转林绘澄。*
