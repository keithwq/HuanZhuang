# PKG-03 CARD-01 换装与房间切换

- Spec: [SPEC-0003](../../specs/SPEC-0003-mode-ambience.md)
- Status: WAIT
- Previous: PKG-02 CARD-03
- Next: [CARD-02](./CARD-02.md)

## 本卡要做

底部「房间」可点。切换使用 `ModeManager`。同一时刻只显示一个舞台。切换时抽屉回到该模式默认档。若摆放进行中，先取消摆放。商店与成就页签保持不可用。

## 不要做

不做氛围光。不做交叉淡切的美术曲线实验；时长遵守 hud §8.3 的 300ms 上限，减敏直切沿用现有动效服务。

## 允许修改的文件

- `src/core/scenes/UiScene.ts`
- `src/core/scenes/StageScene.ts`
- `src/systems/hud/OverlayManager.ts`
- `tests/unit/mode-switch.spec.ts`
- `docs/sdd/handoffs/PKG-03-CARD-01.md`
- `docs/sdd/NOW.md`
- `docs/sdd/packages/INDEX.md`

## 完成时必须为真

- SPEC AC-01、AC-02 有测试。
- 连续快速切换不会堆出第二个房间容器。

## 交接后

写交接，NOW 改为 CARD-02，开始 CARD-02。

## 停点

无。
