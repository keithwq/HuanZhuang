# SPEC-0003: 模式切换与氛围光

- Spec ID: SPEC-0003
- Status: IMPLEMENTING
- Package: PKG-03
- Last Updated: 2026-11-22

## 用户目标

玩家能在换装和房间之间切换。房间家具变多后，光线档位升高，且不会因为撤掉家具而降档。

## 范围

- 底部「房间」页签可用。「商店」「成就」仍保持灰态，直到各自的包。
- `ModeManager` 接到 `UiScene`。切换 ≤300ms、可打断、不排队。抽屉回到该模式的默认档，并取消进行中的摆放。
- 氛围光用 `RoomModel.ambienceTier()` 的 0/1/2/3。阈值仍是已摆 5/11/17，只升不降。淡入 ≤300ms；减敏时直切。灰盒色层即可。

## 非范围

- 不实现商店、任务、成就页面。
- 不改棘轮数值算法。`tests/unit/room.spec.ts` 仍须通过。
- R-07 纹理互斥的真机内存留到 SPEC-0008，本 SPEC 只要求离开房间时释放本舞台登记的灰盒纹理。

## 规则

- hud §8.3、room §8.6：切换与摆放中断。
- room §8.4：棘轮、淡入、减敏、非循环。
- room §8.5 的成就触发数据面已由 `placedAnchorCount` 提供，成就页归 SPEC-0006。

## 验收场景

| 编号 | 前置 | 操作 | 可见结果 | 证据 |
|---|---|---|---|---|
| AC-01 | 换装模式，摆放未开 | 点「房间」再点回换装 | 两个舞台互斥，抽屉回默认档 | 单测 |
| AC-02 | 摆放进行中 | 切回换装 | 摆放选中态没有残留 | 单测 |
| AC-03 | 已摆件数跨过 5 | 落位成功 | 氛围光进入档 1；再撤到 4 件仍保持档 1 | 单测 |
| AC-04 | 减敏开启 | 升档 | 无淡入动画，直接到目标档 | 单测 |

## 允许修改的文件

- `src/core/scenes/UiScene.ts`（页签与模式接线）
- `src/core/scenes/StageScene.ts`
- `src/systems/hud/OverlayManager.ts`（仅当 ModeManager 缺切换钩子）
- `src/systems/room/ambience.ts`（新）
- `tests/unit/mode-switch.spec.ts`（新）
- 交接、NOW、包索引、本 SPEC 状态行
- 末卡更新 E3-S05 与 E3-S06 状态格

## 依赖与取代

- Dependencies: SPEC-0002
- Risks: 真图氛围三层未到，视觉标 `PARTIAL`
- Supersedes: 无
- Superseded By: 无

## 任务卡

1. [CARD-01](../packages/PKG-03-mode-ambience/CARD-01.md)
2. [CARD-02](../packages/PKG-03-mode-ambience/CARD-02.md)
3. [CARD-03](../packages/PKG-03-mode-ambience/CARD-03.md)

## 证据计划

末卡跑 `npm test`。M3 是否可玩以 AC-01 至 AC-04 为准。人工验收未做则写 `NOT PERFORMED`。
