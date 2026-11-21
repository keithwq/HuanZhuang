# GDD · 本地存档（S04 · localStorage）

> 系统：`design/gdd/systems-index.md` S04
> 版本 v1.0 · 撰写：文策渊（design-strategist）· 第一批 GDD ②
> 决策依据：decisions.md D1-13（无云存档，v1 用 localStorage，Phase 5 复评丢档风险）、D3-02（9 个造型收藏位）、D3-04（日期翻转不设防）
> 定位：数据地基，被 S03/S06/S07/S08/S09/S10 六系统全部引用——字段口径先定，全链路才稳。

---

## 1. 概述

单一权威存档：玩家全部持久状态（持有、装扮、造型收藏 ×9、货币账本、家具摆放、任务/成就进度、行为计数、设置项）以版本化 JSON 存于 localStorage 单键，**双键轮换备份 + 节流写入**。无账号、无云存档（D1-13）；日期翻转纯本地时钟、不设防（D3-04）。

## 2. 机制

### 2.1 存档结构（schemaVersion = 1）

```jsonc
{
  "schemaVersion": 1,
  "player": { "createdAt": "<ISO8601>", "lastSeenAt": "<ISO8601>" },
  "wardrobe": {
    "ownedItems": ["<itemId>", "..."],          // 服装持有清单（S03/S08 引用）
    "outfit": { "TOP": "<itemId|null>", "BTM": "...", /* 13 槽（含 HAND_L/HAND_R）*/ }
  },
  "looks": [                                      // 造型收藏 ×9（D3-02）
    { "id": "<lookId>", "name": "<玩家命名>", "outfit": { /* 13 槽快照 */ },
      "createdAt": "<ISO8601>", "updatedAt": "<ISO8601>" }
    // 长度上限 9，空位为 null
  ],
  "economy": { "coins": 0, "ledger": [ /* 最近 50 条：{t, delta, reason} */ ] },
  "room": {
    "ownedFurniture": ["<furnId>", "..."],
    "placement": { "<anchorId>": "<furnId|null>" },  // 锚点 → 家具（S07 引用）
    "ambienceLevel": 0                               // 氛围光档位派生缓存 0~3，旧档缺失按 occupied 重算；由 room-decoration.md §3/§4.3 引入（S07 §4.3 棘轮口径）
  },
  "daily": {
    "dateKey": "<YYYY-MM-DD 本地>",               // 翻转判定键（D3-04：纯本地时钟，不设防）
    "tasks": [ { "taskId": "...", "progress": 0, "claimed": false } ]
  },
  "achievements": { "<achId>": { "progress": 0, "claimed": false } },
  "stats": {                                      // 行为计数：S09 任务判据 / S10 成就判据
    "tryOnTotal": 0, "tryOnUnique": 0, "lookSavedTotal": 0,
    "itemsOwnedTotal": 0, "furniturePlacedTotal": 0, "coinEarnTotal": 0
  },
  "settings": { "reducedMotionOverride": null }   // null=跟随系统；S01/美术圣经 §9.4 引用
}
```

### 2.2 写入策略
- **单键权威**：`huanzhuang_save`；**双键轮换备份**：每次写入前把当前权威键内容复制到 `huanzhuang_save_bak` 再写主键——解析失败时回退备份键（先主后备，备份也坏则走 §5.1 重置）。
- **节流写入**：高频行为（试穿、滚动浏览）不直接写盘；写入触发 = 换装后 500ms 防抖、购入/摆放/保存造型/领取奖励**即时写**、`visibilitychange → hidden` 与 `beforeunload` 强制冲刷。
- 每次写入同步更新 `lastSeenAt`。

### 2.3 日期翻转（D3-04 不设防）
- 应用回到前台 / 打开时比对 `daily.dateKey` 与本地 `new Date()` 的 `YYYY-MM-DD`：不等即翻转（任务清单重置、进度清零）。**不做时间戳校验、不做回拨防护**——无付费随机、无套利价值（D2-06/D1-02），工程量最省（D3-04）。

## 3. 数据

| 数据项 | 口径 | 消费方 |
|---|---|---|
| `ownedItems` | itemId 数组（与美术命名 §4.4 的部件 ID 对齐，粒度=单部件而非单图） | S03 筛选、S08 商店判重 |
| `outfit` | 13 槽映射，键名与美术圣经 §4.3 槽位代码一致（HAND 拆 HAND_L/HAND_R 两键） | S01 读档渲染、S06 快照 |
| `looks` | **固定上限 9 条**（D3-02），`outfit` 为完整 13 槽深拷贝快照 | S06 造型保存 |
| `coins` / `ledger` | 账本滚动窗口 50 条（超限丢弃最旧），`reason` 枚举：`daily_task / collection_milestone / shop_purchase` | S08 货币商店 |
| `placement` | 锚点 ID → 家具 ID，空锚点 = null | S07 房间装饰 |
| `daily.tasks` / `achievements` | taskId/achId 引用静态配置表（配置不入档，见 §4） | S09/S10 |
| `stats` | 行为计数器全集，S09 任务判据与 S10 成就判据的**唯一数据源**（不另设事件日志） | S09/S10 |

## 4. 公式

- **存档体积估算**：`size ≈ 40 件 ownedItems × ~24B + 9 looks × ~300B + ledger 50 × ~60B + 其余固定段 ≈ 25~40KB`（JSON 文本），对 localStorage 5MB 配额余量 > 100 倍——**配额不是风险，损坏与隐私模式才是**（见 §5）。
- **节流窗口**：`T_debounce = 500ms`；一次会话典型写入次数 = 换装次数（去抖合并）+ 关键操作数，预估 < 200 次/会话，远低于 localStorage 同步写性能阈值。
- **静态与动态分离**：单品/家具/任务/成就的**定义表全部不入档**（代码内静态配置）；存档只存"进度与选择"。收益：未来调整定价/任务文案不需要存档迁移；物品下架时存档引用悬空走 §5.5 兜底。
- **版本迁移链**：`schemaVersion` 升级时按 `migrate_v1_v2()` 链式顺序执行，每级迁移幂等、迁移前完整备份一次。

## 5. 边缘情况（≥3 类）

1. **localStorage 不可用**（Safari 隐私模式 / 被禁 cookie 的已知问题）：降级为**内存会话档**（本次会话内一切正常、关页即丢），首次降级时用非阻塞 toast 提示"当前浏览器模式无法保存进度"一次——不弹窗打断摆弄（P1/P3 优先于数据焦虑）。
2. **写入配额失败**（理论上不会发生，§4 已证余量；防御性保留）：捕获 QuotaExceededError → 尝试丢弃 `ledger` 尾部（非权威数据）重写一次 → 仍失败转内存会话档并提示。
3. **主键解析失败**（JSON 损坏 / 手改 / 部分写入）：读备份键 `huanzhuang_save_bak` 恢复（丢失 ≤ 上次写入间隔的进度）；备份也失败 → 走**新档 + 默认套装 + 引导性提示**（与首启无档同路径），**绝不闪退**。
4. **日期翻转的跨月/跨年**：dateKey 比较是字符串不等即翻转，天然覆盖跨月跨年与时区不变的本地场景；玩家改设备时间 = 可刷任务，**接受**（D3-04）。
5. **物品引用悬空**（未来版本删物品，v1 无此计划）：读档渲染时按 S01 §5.5 兜底（槽位回默认件 + 控制台警告）；`ownedItems` 悬空项保留在档（不主动清洗，等待版本迁移统一处理）。
6. **双开/双标签页**：同源两标签页同时写 → `storage` 事件广播 + `lastSeenAt` 新者胜，旧页下次写入覆盖；不做锁机制（v1 单机摆弄场景冲突概率≈0，不值得工程量）。

## 6. UI 接口（供 S03/S06/S07/S08/S09/S10 调用）

| 接口 | 语义 | 消费方 |
|---|---|---|
| `load()` | 读档 → 返回内存态（含主备回退逻辑，§5.3） | 全部 |
| `getOwned(slot?) / addItem(itemId, reason)` | 持有查询 / 入柜（购入、成就解锁统一入口，reason 入 ledger 关联） | S03、S08、S10 |
| `setOutfitSlot(slot, itemId\|null)` | 换装落位（触发节流写） | S01 经 S03、S06 |
| `saveLook(name, outfit) / applyLook(lookId) / deleteLook(lookId)` | 造型收藏 9 位 CRUD（满 9 拒绝并提示，D3-02） | S06 |
| `addCoins(delta, reason) / spendCoins(delta, reason)` | 货币收支唯一入口（负余额拒绝，见 §8） | S08、S09 |
| `setPlacement(anchorId, furnId\|null)` | 家具落位/撤下 | S07 |
| `onDayFlip(cb)` | 日期翻转事件（回前台时判定） | S09 |
| `bumpStat(key, n)` | 行为计数（S09/S10 判据唯一来源） | S01/S03/S06 事件源 |
| `getAchievement(achId) / claimAchievement(achId)` | 成就进度读 / 领取（领取即发放物品/货币，走 addItem/addCoins） | S10 |

## 7. 依赖

- **被依赖**：S03（持有）、S06（造型）、S07（摆放）、S08（账本）、S09（任务进度/日期翻转）、S10（成就进度）——systems-index 依赖图口径；S01 首启读初始装扮。
- **上游**：静态配置表（单品/家具/任务/成就定义）——由对应系统 GDD 冻结字段后，本册只引用不定义。
- **无外部依赖**：不依赖网络、不依赖账号体系（D1-13）；Phase 5 复评丢档风险时再议导出/恢复方案（届时走决策记录）。

## 8. 验收标准

1. 全部六系统经本册接口读写，**无任何系统绕开接口直接触碰 localStorage**（代码评审红线）。
2. 换装 500ms 防抖合并、购买/保存造型即时落盘；切后台/关页强制冲刷，**重进后丢失进度 ≤ 一次防抖窗口**。
3. 主键损坏 → 备份恢复成功；双键全坏 → 新档 + 默认套装 + 提示，全程无闪退。
4. 隐私模式下会话内功能完整、退出即清、有一次性提示。
5. `coins` 任何路径不得为负（`spendCoins` 余额校验，不足即拒绝并回传失败给调用方 UI）。
6. 9 个造型位硬上限（D3-02）：保存第 10 个被拒绝；删除后可复用空位。
7. 本地日期翻转任务重置正确（含跨月、跨年）；改时间可刷任务**不视为缺陷**（D3-04）。
8. 存档 JSON 体积 ≤ 100KB 实测（含 9 造型 + 50 ledger + 全持有上限）。

---

*本册为第一批 GDD ②。互引：渲染兜底见 paperdoll-render.md §5.5；持有查询驱动衣柜显示见 wardrobe-tryon.md。*
