# HuanZhuang 技术控制清单（checklist.md）

> 版本 v1.0 · 2026-11-21 · 程基岩（engineering-lead）
> 用途：① Phase 4 预制作 Epic/Story 拆分直接引用（风险项即验收项来源）② Phase 5 代码评审一页规则 ③ 性能红线汇总（测试断言与验收对照表）
> 配套：architecture.md（模块与分层）、ADR-001/002/003（决策）、cal-04-review.md（内存数值）

---

## 1. 性能红线汇总（验收断言对照表）

| # | 红线 | 数值 | 来源 | 测试证据路径（Phase 5） |
|---|---|---|---|---|
| R-01 | 试穿反馈（点选→画面变化） | **≤300ms**，可被下一点选立即打断，无队列、不吞点击 | D1-11 / paperdoll §8.1-2 | tests/evidence/latency-tryon.md |
| R-02 | 正/背旋转过渡 | **≤300ms**（剪影压缩）；减敏 100ms 淡切；过渡中再翻转被忽略 | D1-11 / paperdoll §2.2 | tests/evidence/latency-flip.md |
| R-03 | dress⇄room 模式切换 | **≤300ms** 交叉淡切、可打断、无队列 | hud §4 | tests/evidence/latency-mode.md |
| R-04 | 帧率 | **60fps 目标 / 30fps 容忍**；掉帧时动效时长不变、帧数减半 | paperdoll §4 | tests/evidence/framerate.md |
| R-05 | 稳态纹理内存（换装极端穿搭） | **≤45MB**（实测口径 cal-04 §2/§7） | art §5.5 / CAL-04 | tests/evidence/texmem-steady.md |
| R-06 | 旋转瞬时峰值（300ms 窗口） | **≤75MB**，窗口结束立即卸载旧视图 | art §5.5 / CAL-04 | tests/evidence/texmem-flip-peak.md |
| R-07 | 房间全满场景 | **≤60MB**（21/21 + 第 3 档氛围光） | art §5.5 / CAL-04 | tests/evidence/texmem-room-full.md |
| R-08 | 常驻动效白名单 | **仅呼吸/眨眼/裙摆 3 项**；白名单外循环动效由 tweenSvc 运行时拒绝 | D1-11 | 契约测试 tween-svc.spec |
| R-09 | 首屏可交互时间（4G 模拟） | **≤3s**（Phaser ≈350KB gz + 首批资产，加载插画承接） | ADR-001 后果 | tests/evidence/tti.md |
| R-10 | 交互触控目标 | 全部 **≥44×44**、间距 ≥8px、卡片 104×104、主按钮高 88 | art §6.2 | Playwright 断言 |
| R-11 | 反馈动效家族上限 | 单次 ≤300ms / 摇头 200ms / 星尘飞入 ≤300ms / 氛围光档切 ≤300ms 一次性非循环 | art §8 | 评审走查 |
| R-12 | 存档 | 体积 ≤100KB 实测；换装 500ms 防抖；关键操作即时写；重进丢失 ≤ 一个防抖窗口 | local-save §8 | tests/unit/save.spec |
| R-13 | 货币不变量 | `coins ≥ 0` 任何路径；发放/扣账唯一路径 addCoins/spendCoins | local-save §8.5 | tests/unit/economy.spec |
| R-14 | DPR 策略 | 后备存储 = CSS × min(DPR,2)；部件 @2× / 背景类 @1×；低端机 @1× 降级档 | ADR-003 | texmem-report 断言 |
| R-15 | 减敏合规 | `prefers-reduced-motion`：常驻动效全关、反馈 ≤100ms 淡切、旋转禁压缩 | art §9.4 | Playwright 仿真断言 |

## 2. 技术风险清单（风险 × 缓解 × 验收项）

### 2.1 渲染与性能

| # | 风险 | 缓解（定稿措施） | Phase 5 验收 |
|---|---|---|---|
| T-01 | **低端机 WebGL 不可用/性能不足** | Phaser 自动 Canvas2D 回退 + ADR-003 §6 降级档（renderScale 1× + @1× 纹理）；动效容忍 30fps（R-04） | 真机矩阵各 1 台低档机走查帧率与视觉 |
| T-02 | **试穿循环纹理泄漏**（摆弄 10 分钟内存爬升） | 常驻集合=当前 13 件唯一；中间件立即 release；texmem assertBudget 开发态硬断言 | 循环试穿 500 次脚本 → texmem-report 曲线平坦 |
| T-03 | **旋转峰值超窗**（过渡完成未卸载） | 卸载挂接在 tween onComplete 强制执行；过渡被打断时同槽位清理钩子 | 翻转 20 次峰值采样（cal-04 §7 用例②） |
| T-04 | **WebGL context lost**（iOS 内存压力） | Phaser `webglcontextlost/restored` 事件：恢复时经 texmem 重载当前集合；存档内存态不受影响，最坏整页重载（档已强制冲刷） | DevTools 模拟 context lost 走查 |

### 2.2 浏览器兼容

| # | 风险 | 缓解 | 验收 |
|---|---|---|---|
| T-05 | **iOS Safari 隐私模式**（localStorage 抛异常/配额 0） | ADR-002 §2 探测式降级：内存会话档 + 一次性 toast，接口零异常 | Playwright 隐私仿真 + 真机 |
| T-06 | **iOS 杀后台丢防抖窗口** | visibilitychange→hidden 强制冲刷为主钩子（ADR-002 §3，iOS 对 beforeunload 不保证） | 真机切后台 20 次丢失 ≤500ms 窗口 |
| T-07 | **浏览器原生手势冲突**（双击缩放/长按选择/下拉刷新） | `viewport user-scalable=no` + `touch-action:none` + `-webkit-user-select:none` + `overscroll-behavior:none` | 真机走查（微信 WebView 重点） |
| T-08 | **横竖屏切换**（意外横屏破坏布局） | orientationchange+resize 双监听 → 全屏竖屏遮罩（hud §5.1）；不提供横屏适配（D0 竖屏口径） | 仿真断言 |
| T-09 | **异形屏安全区**（刘海/手势条遮挡） | env(safe-area-inset) 动态避让，舞台锚定栅格中轴不形变（hud §5.2） | iPhone + Android 各 1 台挖孔机 |
| T-10 | **微信 XWeb 生命周期差异**（G-03 知识缺口） | 冲刷三钩子并挂；真机走查后定稿是否需 XWeb 特判 | 真机走查记录入 evidence |

### 2.3 数据与状态

| # | 风险 | 缓解 | 验收 |
|---|---|---|---|
| T-11 | 存档半写/损坏 | 双键轮换先备份再写主键；主坏读备；双坏新档+默认套装+toast，绝不闪退（ADR-002 §1） | 单测构造损坏档 8 用例 |
| T-12 | schema 迁移破坏旧档 | 链式幂等迁移 + 迁移前一次性快照键；新字段必须可派生可默认 | 单测 v1→v2 演练用例 |
| T-13 | 双开标签页覆盖 | storage 事件 + lastSeenAt 新者胜；不做锁（GDD §5.6 口径） | 单测 |
| T-14 | 跨日竞态（23:59:59 完成事件） | 写入口先 DayFlip.check 惰性判定再处理事件（daily §2.4）；≤1 条归属误差接受 | 单测边界时钟用例 |

## 3. 代码评审红线（合并门槛，逐条机械执行）

1. `localStorage` 字面量出现在 StorageDriver 之外 → 拒绝（ADR-002）；
2. `this.load.image` / `textures.add*` 出现在 texmem 之外（BootScene 加载屏白名单除外）→ 拒绝（ADR-003）；
3. 绕开 SaveService 的第二持久化写路径 → 拒绝（local-save §8.1）；
4. tweenSvc 白名单外循环动效创建 → 运行时 guard 拒绝 + 评审追查（D1-11）；
5. systems 之间 import 内部模块（应走 bus 事件）→ 拒绝（architecture §4）；
6. 常量字面量（锚线/挂点/21 锚点坐标）散落 → 拒绝（美术圣经 §5.2 纪律）；
7. UI 模块持有/改写游戏状态 → 拒绝（hud §2.5 容器红线）；
8. 覆盖层内再开覆盖层 / 系统改写容器布局 → 拒绝（hud §2.5/§5.4）；
9. 13 槽层序用一张表加翻转推导 → 拒绝（paperdoll §5.4）；
10. 造型保存不存截图入档 / 存第 10 位路径可达 / `coins<0` 路径可达 → 拒绝（local-save §8 / look-save §8）。

## 4. 引擎版本纪律

- 版本钉定 **Phaser 3.90.0「Tsugumi」**（G-01 已解除，2026-11-21 升级三步纪律执行完毕：changelog 零破坏性 / 契约 12 用例绿 / 三红线回归绿——ADR-001 v1.0.2 补丁记录）；不追 v4；后续升级仍须走：changelog 破坏性复核 → 契约测试全绿 → 三红线回归 → 主理人备案；
- 每次升级在 `docs/architecture/` 追加一行版本记录。

## 5. 需用户拍板 / 备案通道（当前状态）

**当前无阻塞项**。备案进行中：

| # | 事项 | 状态 |
|---|---|---|
| B-01 | 美术圣经三条导出子规格（背景类 @1× / 背视图紧裁剪 / 氛围光稀疏化，cal-04 §6） | **待主理人转林绘澄**归档（不改冻结数值） |
| B-02 | Phase 5 丢档风险复评（导出/恢复方案，D1-13 原文要求） | Phase 5 执行，届时走决策记录 |
| B-03 | 音频：美术圣经 §8.1 提及"音频归阮和鸣"，但 8 册 GDD 无音频系统——**v1 范围内无音频为默认理解**（GDD 未定义即不实现，非新增砍除） | 待主理人确认备案 |
| B-04 | Phaser 包体 ≈350KB gz（ADR-001 后果项） | 已由任务派发授权定稿，此处备案供用户知情 |
