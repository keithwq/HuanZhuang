# SPEC-0001: 房间舞台

- Spec ID: SPEC-0001
- Status: VERIFIED
- Package: PKG-01
- Last Updated: 2026-11-22

## 用户目标

玩家打开房间后，能看见墙、地面、已摆家具和一张只列出自己家具的抽屉。还不能完成摆放手感；那是 SPEC-0002。

## 范围

- 房间容器按层绘制：墙体、地面、家具、纱幔。家具按 Y 排序。
- 21 个锚点使用 `src/core/constants/room-anchors.ts`，不另写坐标。
- 家具抽屉 5 个类目页签：L / M / S / W / R。只显示已拥有家具。
- 已有存档摆放能在舞台上出现。灰盒图形即可。

## 非范围

- 不实现星光提示、替换吸附的界面反馈、收回确认、摆放取消。逻辑仍用现有 `RoomModel`，本 SPEC 不改其规则。
- 不切换换装/房间模式，不点亮底部「房间」页签的玩法切换。CARD-03 只要求舞台与抽屉能被测试或临时入口调用。
- 不引入 P1.5 新素材。

## 规则

- room §8.1：锚点键名与坐标来自 E1-S01 常量。
- room §8.7：Y 排序；地垫在所属地面件之下；挂件不参与地面排序。
- room §8.8：抽屉与衣柜同构。类目配额见家具数据文件头注释：L5 / M10 / S10 / W4 / R1。
- D3-05：抽屉是已拥有全集。`RoomModel.enterPlacementMode` 已按此拒绝未拥有件，舞台只读这份结果。

## 验收场景

| 编号 | 前置 | 操作 | 可见结果 | 证据 |
|---|---|---|---|---|
| AC-01 | 存档已有两件不同 Y 的家具 | 打开房间舞台 | 更高 Y 的件画在后面 | 单测 |
| AC-02 | 常量 21 锚点 | 读取舞台锚点表 | 键名与坐标无第二份 | 单测 |
| AC-03 | 拥有 L 与 W 各一件 | 切换抽屉页签 | 每页只出现该类目已拥有件 | 单测 |
| AC-04 | 无房间图 | 渲染 | 灰盒仍能看出层与件，不报缺图中断 | 单测 |

## 允许修改的文件

- `src/systems/room/stage.ts`（新）
- `src/systems/room/drawer.ts`（新）
- `src/core/scenes/StageScene.ts`（只加房间容器的挂载点，不改换装合成）
- `tests/unit/room-stage.spec.ts`（新）
- 本卡交接、`docs/sdd/NOW.md`、`docs/sdd/packages/INDEX.md`、本 SPEC 的状态行
- PKG-01 末卡另可更新 `production/epics/E3-expression-loop.md` 里 E3-S03 的状态格

## 依赖与取代

- Dependencies: `RoomModel`、`ROOM_ANCHORS`、`SaveService` 摆放读取
- Risks: 灰盒与将来真图的锚点偏差留到资产补测，不在本 SPEC 修图
- Supersedes: 无
- Superseded By: 无

## 任务卡

1. [CARD-01](../packages/PKG-01-room-stage/CARD-01.md) 舞台层与已摆家具
2. [CARD-02](../packages/PKG-01-room-stage/CARD-02.md) 五类目抽屉
3. [CARD-03](../packages/PKG-01-room-stage/CARD-03.md) Y 排序与锚点证据

## 证据计划

- 静态： `npm test -- tests/unit/room-stage.spec.ts` 与既有 `tests/unit/room.spec.ts` 仍通过
- 运行： 本 SPEC 不要求新 e2e
- 人工： `NOT PERFORMED`，除非用户当轮看过画面
