# PKG-03 CARD-03 M3 证据

- Spec: [SPEC-0003](../../specs/SPEC-0003-mode-ambience.md)
- Status: WAIT
- Previous: CARD-02
- Next: [PKG-04 CARD-01](../PKG-04-daily/CARD-01.md)

## 本卡要做

跑模式切换、氛围光、房间逻辑、房间舞台测试。离开房间时释放本舞台登记的灰盒纹理。更新 E3-S05 与 E3-S06 状态格。

## 不要做

不打开商店。不把 R-07 真机内存写成通过。

## 允许修改的文件

- `src/systems/room/stage.ts`
- `src/systems/room/ambience.ts`
- `tests/unit/mode-switch.spec.ts`
- `docs/sdd/handoffs/PKG-03-CARD-03.md`
- `docs/sdd/evidence/SPEC-0003/`（测试命令输出摘要）
- `docs/sdd/NOW.md`
- `docs/sdd/packages/INDEX.md`
- `docs/sdd/specs/INDEX.md`
- `docs/sdd/specs/SPEC-0003-mode-ambience.md`
- `docs/sdd/specs/SPEC-0004-daily-tasks.md` 的状态行
- `production/epics/E3-expression-loop.md`

## 完成时必须为真

- AC-01 至 AC-04 的测试通过。
- 交接写明 M3 逻辑链已通，视觉真图仍为 `PARTIAL`。
- 商店页签仍不可用。

## 交接后

SPEC-0004 改为 IMPLEMENTING。NOW 改为 PKG-04 CARD-01，开始该卡。

## 停点

无。
