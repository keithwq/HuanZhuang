# SPEC-0002: 摆放交互

- Spec ID: SPEC-0002
- Status: VERIFIED
- Package: PKG-02
- Last Updated: 2026-11-22

## 用户目标

玩家在房间里点家具、放到相容的点位、换掉旧件、收回一件，全程能看懂发生了什么，也能中途取消。

## 范围

- 摆放模式的星光提示只出现在 `RoomModel` 判定相容且当前可见的锚点上。
- 替换与次级联动的退回用合并 toast，不逐条弹。
- 收回有行内二次确认。
- 模式被打断时调用已有 `cancelPlacementMode`，舞台上不留选中态。

## 非范围

- 不改相容规则、W-06 例外、棘轮阈值。这些已在 `RoomModel` 与 `tests/unit/room.spec.ts`。
- 不做氛围光淡入，不做换装/房间交叉淡切。

## 规则

- room §8.2：摆放全程 ≤300ms、替换式吸附、次级联动、toast 合并。
- room §8.3：类目兼容、W-06 仅窗帘、宿主空缺时次级位隐藏。
- room §8.6：满点位、空房间、中断、悬空四类边界。

## 验收场景

| 编号 | 前置 | 操作 | 可见结果 | 证据 |
|---|---|---|---|---|
| AC-01 | 进入摆放且目标位已有件 | 点该锚点 | 旧件回库存，一条合并 toast | 单测 + 舞台状态 |
| AC-02 | 宿主上有次级件 | 收回宿主 | 次级件一并回库存，toast 计数合并 | 单测 |
| AC-03 | 摆放进行中 | 关闭抽屉或离开房间数据路径 | 选中态清空 | 单测 |
| AC-04 | 窗帘与非窗帘 | 看 W 类提示 | 只有相容锚点亮 | 单测 |

## 允许修改的文件

- `src/systems/room/stage.ts`
- `src/systems/room/drawer.ts`
- `src/systems/room/placement-ui.ts`（新，若舞台文件会因此超过单一职责）
- `tests/unit/room-placement-ui.spec.ts`（新）
- 交接与 NOW、包索引、本 SPEC 状态行
- 末卡更新 E3-S04 状态格

`src/systems/room/model.ts` 只在现有测试证明接口不够表达「可见锚点」时允许追加只读查询。不允许改 place/replace 规则。

## 依赖与取代

- Dependencies: SPEC-0001 的舞台与抽屉
- Risks: ≤300ms 若只有数据层、没有帧探针，证据写 `PARTIAL`，不放宽 GDD
- Supersedes: 无
- Superseded By: 无

## 任务卡

1. [CARD-01](../packages/PKG-02-placement/CARD-01.md)
2. [CARD-02](../packages/PKG-02-placement/CARD-02.md)
3. [CARD-03](../packages/PKG-02-placement/CARD-03.md)

## 证据计划

静态单测必须覆盖 AC-01 至 AC-04。没有浏览器跑通时运行证据写 `BLOCKED`，不阻止进入 SPEC-0003，但缺口留在交接里。
