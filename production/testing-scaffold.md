# HuanZhuang 测试框架脚手架设计（testing-scaffold.md）

> 版本 v1.0 · Phase 4 预制作 · 2026-11-21 · 程基岩（engineering-lead）
> 用途：**设计文档**（Phase 5 建仓时照此生成配置与首批用例，本阶段不建 tests/ 目录）。
> 输入基线：architecture.md §10（测试策略）、ADR-001/002/003、cal-04-review.md §7、checklist.md（R-01~R-15 / T-01~T-14）、8 册 GDD §5（边缘情况）与 §8（验收原文）。
> 纪律：用例断言值只引用 GDD 原文口径与 checklist R/T 编号，不自创验收数值。

---

## 1. 三层结构与工具链

```
tests/
├── unit/                    # vitest —— 纯逻辑层（无 Phaser 渲染依赖）
│   ├── save/                #   local-save §5 八条边缘 + §8 全部数据面验收
│   ├── wardrobe/            #   筛选谓词 / 状态机
│   ├── paperdoll/           #   连衣裙解耦 / HAIR 成对 / 层序双表
│   ├── room/                #   棘轮 / 类目兼容
│   ├── daily/               #   三槽位抽取 / 可达性
│   └── economy/             #   30 虚拟日模拟 / 双计价复核
├── contracts/               # vitest 快照 —— 冻结面防漂移
│   ├── frozen-interfaces/  #   8 册 GDD §6 接口签名快照
│   └── frozen-constants/   #   锚线10/挂点4/21锚点/层序双表 vs 美术圣经表值
├── integration/             # vitest + jsdom + Phaser HEADLESS —— 事件链走查
│   ├── event-chain-tryon.spec.ts      # 点选→tryOn→stats→角标 全链
│   ├── purchase-flow.spec.ts          # 购入→扣账→入柜→镜像刷新
│   ├── flip-lifecycle.spec.ts         # 翻转→texmem register/release 成对
│   └── apply-look-atomic.spec.ts      # 回穿原子性+打断零残留
├── e2e/                     # Playwright —— 真浏览器红线实测
│   ├── redline-latency.spec.ts        # R-01/02/03 ≤300ms 三用例
│   ├── privacy-mode.spec.ts           # T-05 隐私模式降级
│   ├── portrait-lock.spec.ts          # T-08 竖屏遮罩
│   ├── reduced-motion.spec.ts         # R-15 减敏断言
│   └── loop-stress.spec.ts            # T-02 试穿循环 500 次纹理平坦
└── evidence/                # 验收证据落档（E5-S01/S02 产出，cal-04 §7 命名）
    ├── texmem-steady.md / texmem-flip-peak.md / texmem-room-full.md
    ├── latency-tryon.md / latency-flip.md / latency-mode.md
    ├── framerate.md / tti.md
    └── device-walkthrough.md
```

- **分层原则**：能 unit 不 integration、能 integration 不 e2e；e2e 只守红线（≤300ms/遮罩/降级），逻辑正确性全部下沉 unit；
- **测试先行**：每个 Story 开工顺序 = 本单 §3 对应用例骨架 → 实现 → 对 GDD §8 逐条勾验（epics 各 Epic 文件「测试先行清单」）。

## 2. 配置模板要点（Phase 5 照此生成）

### 2.1 vitest.config.ts

- `environment: 'jsdom'`（save/wardrobe 系）；Phaser HEADLESS 用例走独立 project（`environment: 'jsdom'` + mock `HTMLCanvasElement`——Phaser `Phaser.HEADLESS` 渲染模式不需要真 GL）；
- `fakeTimers: true` 全局：500ms 防抖、300ms 动效、8s 眨眼周期全部时间可控（DayFlip 跨日用例直接改系统时钟）；
- strict TS 检查接入（`tsconfig strict` 下 vitest 不放宽）；
- coverage 阈值起步：save/ ≥ 95%、其余 systems/ ≥ 80%（Phase 5 起步值，E5-S03 后按终审门复核）。

### 2.2 Playwright config

- 设备描述符三档（对齐 architecture §9 支持矩阵与 ADR-003 策略）：
  - iPhone 14 Pro 仿真（DPR=3）→ 验证 R-14 渲染上限 cap=2 生效；
  - 中端 Android（DPR=2.6）→ 长屏逻辑高自适应（hud §5.7）；
  - 低端 Android（DPR=2，4x CPU 限速）→ R-04 30fps 容忍线采样；
- `reducedMotion: 'reduce'` 仿真通道（R-15）；
- 隐私仿真：`context` 注入 localStorage 抛异常 stub（T-05）；
- 断言预算零告警：`page.on('console')` 过滤 `[texmem]` warn = 0（R-05/06/07 运行时面）。

### 2.3 红线自动化（E5-S03 落地，接入 lint/CI 脚本）

| 扫描项 | 规则 | checklist 来源 |
|---|---|---|
| `localStorage` 字面量 | 仅 `src/systems/save/StorageDriver.ts` 白名单可引用 | §3-1 |
| `this.load.image` / `textures.add*` | 仅 texmem + BootScene 白名单 | §3-2 |
| 白名单外循环 tween | tweenSvc guard 单测已覆盖 + 静态扫描循环 tween 创建点 | §3-4 |
| 常量字面量 | 锚线/挂点/21 锚点坐标禁止在 constants/ 之外出现数值字面量 | §3-6 |
| 双写路径 | addItem/addCoins/saveLook 调用方静态清单 = {S08, S10, S09, S06} 封闭集 | §3-3 |

## 3. 首测试用例清单（Phase 5 第一周可执行）

### 3.1 SaveService 八条边缘（→ E1-S02/S03，local-save §5.1~5.6 ↔ §8）

| # | 用例 | 断言口径（原文） |
|---|---|---|
| U-01 | localStorage 不可用降级 | 接口零异常、会话内功能完整、一次性 toast 触发恰 1 次（§5.1/§8.4） |
| U-02 | 配额失败链 | QuotaExceeded → 丢 ledger 尾重写成功路径 + 仍失败转内存档双分支（§5.2） |
| U-03 | 主键 JSON 损坏 | 读备恢复、丢失 ≤ 防抖窗口（§5.3/§8.3） |
| U-04 | 双键全坏 | 新档 + 默认套装 + 引导提示、零抛出（§5.3/§8.3） |
| U-05 | 跨月/跨年/改时间翻转 | dateKey 字符串不等即翻转；改时间可刷不视为缺陷（§5.4/§8.7，D3-04） |
| U-06 | 双开标签页 | storage 事件 + lastSeenAt 新者胜、不做锁（§5.6） |
| U-07 | 负余额拒绝 | spendCoins 不足即拒绝、回传失败给调用方、coins 恒 ≥0（§8.5，R-13） |
| U-08 | 9 位上限 + 50 条滚窗 + 体积 | 第 10 次拒绝、ledger 滚动丢弃最旧、全上限实测 ≤100KB（§8.6/§8.8，R-12） |

### 3.2 三槽位抽取与可达性（→ E4-S04，daily §2.3/§8.1）

- 槽 A/B/C 各抽 1 条；任一槽空 → 全可达池补足且同日不重复；
- 零家具新档：槽 C 回退命中（零死任务用例，daily §8.1 原文要求）；
- 事件驱动翻转竞态：23:59:59 完成事件 → 先翻转再入新日 progress 起点，不丢弃不双计（daily §5.1/§8.6）。

### 3.3 氛围光棘轮（→ E3-S05，room §4.3/§8.4）

- occupied 4→5、10→11、16→17 三阈值触发档位 1/2/3；
- `ambienceLevel = max(档位, 存档值)`：摆弄收放不降档、旧档缺失按 occupied 重算（向后兼容用例，ADR-002 §4.4 原则）；
- 切换 ≤300ms 一次性、减敏直切（R-11）。

### 3.4 经济 30 虚拟日模拟（→ E4-S05，economy §4.4/§8.3）

- 脚本按 B 档参数跑 30 个虚拟日（日供 450、里程碑 1,500、成就池 3,000）；
- 断言：集齐天数 ∈ 27~33（economy §8.3 原文区间）；目录总价 18,000±10%；全程 coins ≥0（R-13）；
- 双计价复核：11 任务阈值 vs 里程碑 +3 vs 21 成就冻结值（economy §2.2/room §2.5）三组数字逐一不等，自动留痕（daily §8.7）。

### 3.5 契约签名快照（→ E1-S01/E5-S03）

- 8 册 GDD §6 接口签名 vs 实现导出面快照：任何签名变更 → 快照 diff 失败 → 必过评审（防 AI 生成代码漂移冻结接口）；
- **GAP-4 注记（2026-11-21 并入）**：`onTabChange` 参数类型按**组 ID 枚举 'G1'~'G8'** 落快照（wardrobe §2.1 GAP-4 修订 + ux-spec §2.3 注记，语义不变仅参数域收窄）；`tryOn(slot, itemId)` / `unequip(slot)` 签名不变断言——组概念仅 UI 页签层，不进渲染层；
- 常量快照：锚线 10 值 / 挂点 4 / 21 锚点键名坐标 / 正/背两张独立层序表 vs 美术圣经 §5.1/§5.2/§10.5/§4.5 表值逐值断言（paperdoll §8.1、room §8.1 的工程前置）。

### 3.6 其余首批单测（随对应 Story 同周产出）

- 连衣裙状态解耦：穿着期间换 BTM → 画面遮蔽、状态更新、回分体生效（paperdoll §5.1/wardrobe §8.4）；
- HAIR 成对强制：跨发型 HAIR_B/HAIR_F 混搭返回错误而非穿帮（paperdoll §5.2/wardrobe §8.3）；
- 层序双表独立性：断言正/背两表为两张表、FACE 背视图不渲染（paperdoll §2.1/§5.4）；
- 筛选谓词：单选 OR 语义 + 页签×标签空集空态（wardrobe §4/§8.5）；
- **分组页签（GAP-4 口径）**：8 组覆盖 13 槽完整性（BODY 不入页签）、组内次序规则（当前穿着置顶 → 系列聚集 → 稀有度升序，ux-spec §2.1）、混组卸下卡配置 G2×2/G7×3/G8×2 每槽一张 + Caption 标注（wardrobe §2.1 修订段）；
- 快速连点：10 次/秒点选计数照常、无中间态泄漏（wardrobe §5.6/§8.8）；
- 回穿原子性：批量落位期间任何点选打断零残留（look-save §5.4/§8.2-3）；
- 悬空 itemId 兜底：槽位回默认件 + 控制台警告、快照本体不清洗（paperdoll §5.5/look-save §5.3/local-save §5.5 三处同源）；
- texmem 成对纪律：任意事件序列后 register/release 净值 = 常驻集合（T-02 风险的测试面）。

## 4. 证据落档约定（E5 里程碑用）

- 命名 = cal-04-review §7 既定三用例 + checklist R 编号对应文件名（见 §1 目录树）；
- 每份证据含：环境（机型/浏览器/DPR/日期）、方法、原始数据、对照红线编号、结论 PASS/FAIL + 缺口；
- E5-S05 总表以 evidence/ 目录为唯一引用源——**不接受无证据路径的验收勾选**（对应 GDD 各册 §8 与主理人终审门要求）。

---

*维护：程基岩。用例与 GDD 口径冲突时以 GDD 原文为准并回报主理人；本脚手架在 Phase 5 建仓落地时允许结构微调，断言口径不得放宽。*
