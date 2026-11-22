# PKG-01 CARD-01 舞台层与已摆家具

- Spec: [SPEC-0001](../../specs/SPEC-0001-room-stage.md)
- Status: READY
- Previous: [PKG-00-CARD-01](../../handoffs/PKG-00-CARD-01.md)
- Next: [CARD-02](./CARD-02.md)

## 本卡要做

新建房间舞台，读取存档摆放，按墙、地面、家具、纱幔分层画出已摆的件。图形用灰盒。锚点坐标只读 `ROOM_ANCHORS`。

## 不要做

不画抽屉。不处理点击摆放。不点亮底部页签。不改 `RoomModel` 的放置规则。

## 允许修改的文件

- `src/systems/room/stage.ts`
- `src/core/scenes/StageScene.ts`（只增加房间容器挂载，默认仍显示换装）
- `tests/unit/room-stage.spec.ts`
- `docs/sdd/handoffs/PKG-01-CARD-01.md`
- `docs/sdd/NOW.md`
- `docs/sdd/packages/INDEX.md`（只把本卡标成 DONE，CARD-02 标成 READY）

## 完成时必须为真

- 测试能放两件不同锚点的家具并得到绘制顺序所需的 Y。
- 锚点列表长度与常量一致，测试里没有手写第二套坐标。
- 缺图时舞台仍返回成功的灰盒状态。

## 交接后

写交接，把 NOW 改为 CARD-02，开始 CARD-02。

## 停点

无。层名和灰盒颜色不是业务决策。
