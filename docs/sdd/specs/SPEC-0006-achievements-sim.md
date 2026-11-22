# SPEC-0006: 成就与经济模拟

- Spec ID: SPEC-0006
- Status: IMPLEMENTING
- Package: PKG-06
- Last Updated: 2026-11-22

## 用户目标

玩家达成的成就可以领取且不能领两次。三十个虚拟日的星尘收支落在 GDD 允许的天数区间里。

## 范围

- 21 条成就按 `src/data/achievements.ts` 惰性判定。领取后永久锁定。登录按 dateKey 去重。
- 点亮「成就」页签。
- 三十虚拟日模拟脚本：目录总价与集齐天数。
- 里程碑与成就阈值逐条不等的自动核对。

## 非范围

- 不改 21 条阈值、不改奖励星尘。
- 不把模拟脚本当成玩家功能。

## 规则

- economy §8.3、§8.4、§8.6。
- 家具成就用 room §2.5 已冻结的 11 与 17，数据源用现有摆放计数。

## 验收场景

| 编号 | 前置 | 操作 | 可见结果 | 证据 |
|---|---|---|---|---|
| AC-01 | 计数跨过某条阈值 | 打开成就 | 该条可领；领取后锁定 | 单测 |
| AC-02 | 同一 dateKey 再次登录 | 结算登录类 | 不重复累计 | 单测 |
| AC-03 | 跑模拟 | 看输出 | 天数在 27 至 33，总价在 GDD ±10% | 脚本输出落证据目录 |
| AC-04 | 比对表 | 跑核对 | 里程碑与成就无同一阈值双计 | 单测 |

## 允许修改的文件

- `src/systems/achievements/eval.ts`（新）
- `src/core/scenes/UiScene.ts`
- `src/systems/save/SaveService.ts`（只接已有 claim 接口的判定，不改币约束）
- `tools/economy-sim.ts`（新）
- `tests/unit/achievements.spec.ts`（新）
- `docs/sdd/evidence/SPEC-0006/`
- 交接、NOW、包索引、本 SPEC 状态行、E4-S03 与 E4-S05 状态格

`tools/reckon.ts` 保持为标价合计，不把它扩成三十日模拟。

## 依赖与取代

- Dependencies: SPEC-0005；摆放计数在 SPEC-0002 之后才有玩家路径，判定单测可以不打开舞台
- Risks: 无
- Supersedes: 无
- Superseded By: 无

## 任务卡

1. [CARD-01](../packages/PKG-06-achievements/CARD-01.md)
2. [CARD-02](../packages/PKG-06-achievements/CARD-02.md)
3. [CARD-03](../packages/PKG-06-achievements/CARD-03.md)

## 证据计划

模拟输出写入 `docs/sdd/evidence/SPEC-0006/`。天数或总价出界时停在本卡，不改价格表来凑区间。出界属于实现或脚本口径错误，先对照 GDD；若 GDD 自身冲突，才按停点写 `BLOCKED`。
