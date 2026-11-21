# E6 · 音频接入（D4-01 轻量音频包 · 补映射完成版）

> 状态：**补映射完成（2026-11-21，P4-EL-003）**——阮和鸣 audio-plan.md v1.0（docs/audio/）已到位，原占位拆分按方案补齐验收映射；复杂度档复核维持 M/S。
> 边界不变：D4-01 拍板 3 SFX（换装轻响/套装完成叮/星尘领取音）+ 1 循环 BGM、包体 ≤500KB、Phase 5 后期接入（M4 后）；不做配音/多曲目/动态混音/中间件。
> 在途依赖声明（audio-plan §8.1，经主理人转文策渊，**非本 Epic 阻塞项**）：①套装完成判据 GDD 口径未定（候选「同系列部件在对应槽位同时全部上身」）——判据就位前 S2 无发射源，E6-S01 验收条款 4 单列挂起；②音频开关 UI 入口归属（hud 何处 + icon 文案）待定——存档键已定稿（E6-S02），入口 UI 待文策渊口径。

| Story | 标题 | 对应来源 | 验收（引用 audio-plan 节号 + 既有红线编号） | 档 | 依赖 |
|---|---|---|---|:---:|---|
| E6-S01 | 音频系统：3 SFX 挂钩 + BGM 生命周期 + 播放纪律 guard | audio-plan §2/§3/§4；ADR-001 v1.0.1 Sound 族备案 | ①**挂钩三事件全通**：S1←`tryon:done`、S2←`outfit:setComplete`、S3←`coins:changed` 过滤 `delta>0 ∧ reason ∈ {daily_task, achievement, milestone}`（audio-plan §4.2 表，architecture §4 事件名登记已落位）；②**播放纪律 P-1~P-4 全部 guard 化**：单实例重触发 / 300ms 合并窗（S06 批量回穿 13 连发只播一次）/ S2×S1 互斥只播 S2 / S1 detune ±30 cents（audio-plan §4.4）；③**音画同步锚**：S1 ≤300ms 对齐换装确认、S2 音头 ≤300ms 尾 ≤600ms 落 800ms 动效窗、S3 ≤300ms 对齐星尘飞入（audio-plan §0 红线表）；④**S2 发射源挂起态**：判据口径（文策渊在途）就位前 S2 挂钩就绪但零触发——验收以判据口径补齐后复测收口；⑤**BGM 生命周期**：解锁后 1.5s 淡入、切后台立即暂停、回前台 1s 续播（不从头）、加载失败静默放弃本会话（audio-plan §3.3/§5.3）；⑥**减敏正交**：`prefers-reduced-motion` 只管视觉，S1/S3 减敏模式照常播放（audio-plan §6 正交声明）；⑦**音量表**：VOL_BGM 0.55 / S1 0.35 / S2 0.60 / S3 0.50 常量表落位（src/core/constants/audio.ts，Phase 5 真机校准，audio-plan §4.3）；⑧**包体**：≤500KB 实测入构建产物（audio-plan §5.2 表 ≈439KB） | M | E1-S09（动效事件族）、ADR-001 v1.0.1 补丁；S2 收口另需文策渊判据口径 |
| E6-S02 | 音频开关：settings.audioEnabled 存档键 + 即时生效 + UI 入口 | audio-plan §6/§7；ADR-002 补丁附录 A（已落档） | ①`settings.audioEnabled` · boolean · 默认 true，无 null 跟随态（audio-plan §7 表，ADR-002 补丁附录 A 定稿）；②旧档缺键按默认补齐、零迁移（ADR-002 §4.4 模式）；③切换即时写盘（WritePolicy 即时写清单）+ `settings:audioChanged` 事件即时生效 mute/恢复（audio-plan §7；architecture §4 事件名登记）；④关 = SoundManager 全局 mute、BGM 暂停而非音量 0（audio-plan §6）；⑤存档体积复核 ≤100KB（local-save §8.8）；⑥触控目标 ≥44×44（hud §8.2 口径，R-10）；⑦**开关 UI 入口**（位置/文案归文策渊口径在途，audio-plan §8.1-2）——存档键与事件通路先验收，入口 UI 随口径到位后补对照 | S | E6-S01、E1-S03；入口 UI 另需文策渊归属口径 |

**工程侧预接线（已兑现，零成本预留转正式接线）**：
- ADR-001 v1.0.1：Sound 族入启用范围备案；`src/systems/audio/` 模块位、`src/core/constants/audio.ts` 常量表位、`assets/audio/` 目录均已入 architecture.md §3 目录树；
- ADR-002 补丁附录 A：settings 键全规格已落档（本 Epic E6-S02 验收依据）；
- architecture §4 事件名登记：`tryon:done` / `outfit:setComplete` / `coins:changed` / `settings:audioChanged` 四名落位（E6-S01 验收依据）；
- BGM 延迟加载走 Phaser Loader 族既有能力（audio-plan §5.3：SFX 随 PreloadScene、BGM StageScene 就绪后空闲时段独立 loader，不阻塞首屏可玩 P1）。

**配套证据位**：音频解码内存（BGM 60s 解码后 ≈15–21MB Web Audio 缓冲，不入 CAL-04 纹理预算）随 E5-S01 真机压测一并留证据（audio-plan §4.5，ADR-002 补丁附录 A 备案条款）。

**Phase 5 排期建议（维持原判断）**：M4 之后、发布前窗口执行（D4-01 原文「Phase 5 后期接入」）；两 Story 串行 ≤3 人日，不阻塞任何 M1~M4 路径。S2 收口与开关 UI 入口两处挂起项以文策渊口径到位为触发，不改变排期主体。

**待用户审批项转知（audio-plan §8.3，经主理人向用户呈报，非工程侧阻塞）**：BGM 基调方向 / 默认开+单一总开关 / mp3 单一格式 / BGM 48kbps 压缩决策。
