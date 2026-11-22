# PKG-07 CARD-01 常驻动效

- Spec: [SPEC-0007](../../specs/SPEC-0007-residual-partials.md)
- Status: WAIT
- Previous: PKG-06 CARD-03
- Next: [CARD-02](./CARD-02.md)

## 本卡要做

舞台空闲时挂上 tweenSvc 已允许的呼吸、眨眼、摇摆。下一次换装必须能打断它们。减敏沿用 tweenSvc，不新增闪烁。

## 不要做

不把 Phaser 的任意 tween 绕过白名单。不改换装时长。

## 允许修改的文件

- `src/core/scenes/StageScene.ts`
- `src/systems/paperdoll/tweenSvc.ts`
- `tests/unit/tween-svc.spec.ts`
- `docs/sdd/handoffs/PKG-07-CARD-01.md`
- `docs/sdd/NOW.md`
- `docs/sdd/packages/INDEX.md`

## 完成时必须为真

- SPEC AC-01、AC-02 有测试。
- `StageScene` 里不再用 `void tweenSvc` 把服务丢掉。

## 交接后

写交接，NOW 改为 CARD-02，开始 CARD-02。

## 停点

无。
