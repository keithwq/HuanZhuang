# ADR-002 · 存档层设计（S04 local-save 工程化）

> 状态：**已定稿** · 2026-11-21 · 程基岩（engineering-lead）
> 决策依据：decisions.md D1-13（无云存档，localStorage，Phase 5 复评丢档风险）、D3-02（9 造型位）、D3-04（日期翻转不设防）；GDD 冻结接口：local-save.md §2/§5/§6/§8
> 约束：本 ADR **不得改写 local-save.md §6 接口语义**，只做工程封装与实现策略定稿。

---

## 上下文

S04 是被 6 个系统依赖的数据地基（systems-index §2）：持有/装扮/造型×9/货币账本/家具摆放/任务进度/成就进度/行为计数/设置项，全部持久状态收口于 localStorage 单键。工程侧核心风险不是容量（GDD §4 已证 25~40KB ≪ 5MB 配额），而是：

1. **iOS Safari 隐私模式**：localStorage 访问抛异常或配额为 0；
2. **写入损坏**：进程被杀导致的半截 JSON；
3. **时机丢失**：切换后台被系统杀掉，防抖窗口内的进度丢失；
4. **多标签页**：同源双开互相覆盖；
5. **未来升级**：schemaVersion 迁移必须幂等可回放。

## 备选方案

- **方案 A · 各系统直接读写 localStorage**：被否决——local-save.md §8.1 明确"无任何系统绕开接口直接触碰 localStorage"是代码评审红线；
- **方案 B · IndexedDB**：容量更大但异步 API 复杂化全部六系统调用路径，25~40KB 量级下收益为零；否决；
- **方案 C · localStorage 单键权威 + 双键轮换备份 + 节流写入**（GDD §2.2 原案）：采纳，本 ADR 补齐实现层策略。

## 决定

单一 **`SaveService`** 模块（`src/systems/save/`）封装 local-save.md §6 全部接口；对外只暴露 GDD 冻结签名，内部分四层：

```
SaveService
├── Serializer        // schemaVersion=1 ↔ 内存态映射；migrate 链
├── StorageDriver     // localStorage 唯一接触点 + 降级决策
│     正常态：localStorage 读写
│     降级态：内存会话档（Map 镜像，关页即丢）
├── WritePolicy       // 500ms 防抖 / 即时写清单 / 强制冲刷
└── DayFlip           // dateKey 惰性比对 + onDayFlip 事件
```

### 1. 双键轮换（GDD §2.2 定稿实现）

- 权威键 `huanzhuang_save`，备份键 `huanzhuang_save_bak`；
- **写序**：写主键前，先把当前主键内容复制到备份键，再写主键——任意时刻磁盘上至少有一份可解析的完整档（写主键被中断 → 备份仍是上一个成功版本）；
- **读序**：先主后备；主键 JSON.parse 失败 → 读备份恢复（丢失 ≤ 上次写入间隔）；双坏 → 新档 + 默认套装 + 一次性 toast，**绝不闪退**（GDD §5.3）。

### 2. 降级路径（iOS Safari 隐私模式）

- `StorageDriver` 初始化时**探测式写入**（写入并回读一个临时键）失败 → 进入内存会话档模式：
  - 本次会话内全部接口行为完全一致（六系统零感知）；
  - 首次降级触发一次性非阻塞 toast（GDD §5.1，不弹窗打断摆弄）；
  - `beforeunload`/`visibilitychange` 仍尝试冲刷（万一只是临时限制）。
- **降级模式标志入内存态**，任何接口不抛异常——调用方无 try/catch 负担（AI 生成代码的容错面收窄）。

### 3. 写入时机（GDD §2.2 落地）

| 触发 | 实现 |
|---|---|
| 换装/试穿类高频操作 | 500ms 防抖合并，最后一次为准 |
| 购入/摆放/保存造型/删除造型/领取奖励/领取成就 | **即时写**（关键操作清单硬编码于 WritePolicy，不留给调用方判断） |
| `visibilitychange → hidden` | **强制冲刷**（移动端唯一可靠的生命周期钩子，优先级高于 `beforeunload`——iOS Safari 对后者不保证执行） |
| `beforeunload` | 二次冲刷（桌面调试环境主用） |
| `pagehide` | 三重冲刷（iOS 某些版本在 pagehide 才真正冻结） |

- 每次写入同步 `lastSeenAt`；写入均为同步 API，单次 <1ms，预估 <200 次/会话无性能风险（GDD §4 口径）。

### 4. 版本迁移链

- `migrate_v1_v2()` 链式注册表（数组，按版本升序）；每级迁移**幂等**（重放结果一致）；执行迁移前**整档字符串复制到第三个临时键** `huanzhuang_save_mig` 作一次性快照（迁移失败可回滚）；
- v1 起锚点：`room.ambienceLevel` 为**可选键**（room-decoration §3 向后兼容口径）——Serializer 对缺失键一律走"按 occupied 重算"默认路径，此模式推广到未来全部新增字段：**新字段必须可派生或可默认，禁止硬性断言存在**。

### 5. 多标签页（GDD §5.6 口径）

- 监听 `storage` 事件 → 内存态整体替换为新档（`lastSeenAt` 新者胜语义落地）；
- 本页有未冲刷的防抖窗口数据时**本地优先**（延迟 500ms 后覆盖写）——单机摆弄场景冲突概率 ≈ 0，不做锁。

### 6. 日期翻转（D3-04 不设防）

- `bumpStat` / `addCoins` / 任何写入入口**先执行 `DayFlip.check()`**（惰性判定，daily-task.md §2.4 冻结口径）：dateKey 不等 → 先翻转（任务重抽数据由 S09 消费方经 `onDayFlip` 处理，SaveService 只改结构 + 发事件）→ 再处理本次事件；
- 回前台（`visibilitychange → visible`）同样触发 check；
- **不做时间戳校验、不做回拨防护**——改时间可刷任务为接受行为（D3-04）。

## 后果

**正向**：六系统对存储层完全无感；隐私模式/损坏/半写三类故障全部有既定降级路径；迁移有快照可回滚。

**负向与接受项**
1. 备份键意味着进度最多丢"一个防抖窗口"（500ms）——GDD §8.2 验收口径明示接受；
2. 内存会话档用户关页即丢——已由 GDD §5.1 定为接受项（一次性 toast 兜底）；**丢档风险复评留在 Phase 5**（D1-13 原文要求，届时再议导出/恢复方案，走决策记录通道）；
3. localStorage 无跨设备能力——v1 纯单机定位（D1-06/D1-13），非缺陷。

**红线（Phase 5 代码评审逐条执行，checklist.md 引用）**
- 除 `StorageDriver` 外任何模块 import/引用 `localStorage` 全局名 → 拒绝合并；
- `coins` 任何路径后 < 0 → 拒绝合并（spendCoins 余额校验唯一入口）；
- `looks.length > 9` 任何路径可达 → 拒绝合并（saveLook 硬拒绝）；
- 存在绕开 `addItem/addCoins` 的第二发放路径 → 拒绝合并；
- 存档 JSON 体积 > 100KB（含 9 造型 + 50 ledger + 全持有上限实测）→ 验收不通过。

---

## 补丁附录 · A：settings 域音频开关键（2026-11-21，P4-EL-003）

> 来源：阮和鸣 audio-plan.md v1.0 §7「需存档侧配合清单」，经主理人转办。D4-01 轻量音频包的存档侧依赖。

| 项 | 定稿 |
|---|---|
| 键 | `settings.audioEnabled` |
| 类型 / 默认值 | boolean / **true**（全局音频总开关：SFX+BGM 同开同关；`false` = SoundManager 全局 mute，BGM 暂停而非仅音量 0） |
| 三态 | **无** `null` 跟随态——浏览器无系统级「全局音频关」媒体特性可跟随，`reducedMotionOverride` 的三态模式不适用（audio-plan §7 表原文口径） |
| 兼容模式 | 旧档缺键 → Serializer 按默认 `true` 补齐，**零迁移、无 schemaVersion 变更**（直接套用本 ADR §4.4「新字段必须可派生或可默认」既推广模式） |
| 写入时机 | 归入 WritePolicy **即时写**硬编码清单（低频关键操作，本 ADR §3 清单增补一行） |
| 即时生效 | 切换后发 `bus` 事件 `settings:audioChanged`（architecture §4 事件名登记）→ 音频层 mute/恢复，无需刷新页面 |
| 测试先行 | 单测：旧档缺键补齐 true、false 写入读回一致、即时写触发（不入 500ms 防抖路径断言）、存档体积复核 ≤100KB 不受影响 |

**配套备案（不入 CAL-04，单列）**：音频解码后常驻 Web Audio 缓冲**不计入 ADR-003 纹理预算**（CAL-04 只管纹理）——BGM 60s @32–44.1kHz 交付解码后 ≈15–21MB、SFX 合计 <1MB（audio-plan §4.5）；该数值随 Phase 5 真机压测（epics E5-S01）一并留证据，不新增 CAL 条目。

---

## 补丁附录 · B：stats.triedItems 辅助清单备案（2026-11-21，QA round1 MIN-1 备案）

> 性质：local-save §2.1 冻结 schema 的 stats 域内新增**辅助字段**（非独立结构位）——服务 tryOnUnique 首穿判定（wardrobe §3）与 S09 新试类可达性（daily §4）。按本 ADR §4.4「新字段必须可派生或可默认」纪律备案：

| 项 | 口径 |
|---|---|
| 键 | `stats.triedItems: string[]`（已试穿过 itemId 全集） |
| 兼容模式 | 旧档缺失 → Serializer 补空数组（`applyDefaults` 已实现，零迁移） |
| 派生性 | 可从 tryon:done 事件流重放推导（非第一事实源——第一源是事件，本字段是判重缓存） |
| 体积影响 | 上限 ≈ 全持有 45 项 × 24B ≈ 1.1KB（体积复核用例覆盖，§8.8 不受影响） |
| 不参与判据 | tryOnUnique 判据语义以「是否在 triedItems」为准，其余 stats 键不变 |
