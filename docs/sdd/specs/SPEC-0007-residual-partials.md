# SPEC-0007: 残留缺口

- Spec ID: SPEC-0007
- Status: IMPLEMENTING
- Package: PKG-07
- Last Updated: 2026-11-22

## 用户目标

角色在待机时有克制的常驻动作。衣柜可以用风格标签筛到空状态。这两件事不改变已经能玩的换装、房间和商店。

## 范围

- 把 `tweenSvc` 的常驻三项接到舞台：呼吸、眨眼、摇摆。白名单以外的 tween 仍拒绝。
- 衣柜风格标签 chips：最多 8 个、单选、空结果有空态。`activeTag` 已参与过滤，本 SPEC 补界面。
- 核对 E2-S05 是否还剩任务角标以外的缺口。角标若已由 SPEC-0004 完成，本卡只记录，不重做。

## 非范围

- 不重写点选即换状态机。
- 不做音频。
- 不补真机与锚线像素。

## 规则

- paperdoll §8.2、§8.6、§8.7 与减敏 R-15，针对常驻动效。
- wardrobe §8.5：chips ≤8、单选 OR、空集空态。

## 验收场景

| 编号 | 前置 | 操作 | 可见结果 | 证据 |
|---|---|---|---|---|
| AC-01 | 舞台空闲 | 经过一个呼吸周期 | 只有白名单内的常驻 tween | 单测 |
| AC-02 | 减敏 | 看常驻 | 时长口径按现有 tweenSvc 减敏，不新加闪烁 | 单测 |
| AC-03 | 衣柜有标签 | 点一个无结果标签 | 空态，再点同一标签取消筛选 | 单测 |

## 允许修改的文件

- `src/core/scenes/StageScene.ts`
- `src/systems/paperdoll/tweenSvc.ts`（只在测试证明缺挂载钩子时）
- `src/core/scenes/UiScene.ts`（chips）
- `src/systems/wardrobe/filter.ts`（只读使用；缺空集结果时才改）
- `tests/unit/tween-svc.spec.ts`
- `tests/unit/wardrobe.spec.ts`
- 交接、NOW、包索引、本 SPEC 状态行、E1-S09 与 E2-S03 状态格

## 依赖与取代

- Dependencies: SPEC-0006 交接完成。功能上不依赖成就页面，顺序只为保持单链。
- Risks: 常驻动效若影响 R-01 打断，必须保持可被下一次换装打断
- Supersedes: 无
- Superseded By: 无

## 任务卡

1. [CARD-01](../packages/PKG-07-residuals/CARD-01.md)
2. [CARD-02](../packages/PKG-07-residuals/CARD-02.md)
3. [CARD-03](../packages/PKG-07-residuals/CARD-03.md)

## 证据计划

扩展现有单测。不新增玩法数值。
