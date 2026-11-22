# SPEC-BASELINE: 当前仓库基线

- Spec ID: SPEC-BASELINE
- Status: VERIFIED
- Package: PKG-00
- Last Updated: 2026-11-22

## 用户目标

让后续任务卡从同一份进度事实出发，而不是从聊天记忆出发。

## 已成立的事实

- M1 质量门已关闭。终判见 `production/qa/m1-final-verdict.md`。
- Story 状态：done 15 / partial 9 / todo 9。索引见 `production/epics/README.md`。
- 造型 E3-S01/S02 可玩。房间逻辑在 `src/systems/room/model.ts`，有 `tests/unit/room.spec.ts`。舞台与「房间 / 商店 / 成就」页签未接，见 `src/core/scenes/UiScene.ts`。
- 数据表 E4-S01 已完成。商店、每日任务、成就页、三十日模拟未开工。
- 公开仓库： https://github.com/keithwq/HuanZhuang ，分支 `main`。本基线不把远程推送当作玩法验收。

## 非范围

- 本 SPEC 不授权修改 `src/` 或 `assets/`。
- 不重开 M1 的三红线口径。

## 已知缺口（不挡任务链）

- E1-S09 常驻动效未挂上舞台。
- E2-S03 风格标签 chips 未做。
- E1-S07 锚线 ≤2px、真图混搭仍是灰盒补测。
- 手势路径 A 的 e2e、真机佐证、R-01 的 G8 样本仍挂账。
- QA 终判提到变更单写 16,800、实算 16,560。仓库里没有另一份变更单文件；定价以数据表与 `tests/unit/data-tables.spec.ts` 为准。GDD 的 18,000±10% 区间不因此改动。

## 证据

文档体系与任务包索引由 PKG-00 交接证明。见 [PKG-00-CARD-01](../handoffs/PKG-00-CARD-01.md)。
