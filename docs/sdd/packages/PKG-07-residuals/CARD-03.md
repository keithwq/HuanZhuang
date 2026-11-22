# PKG-07 CARD-03 残留核对

- Spec: [SPEC-0007](../../specs/SPEC-0007-residual-partials.md)
- Status: WAIT
- Previous: CARD-02
- Next: [PKG-08 CARD-01](../PKG-08-integration-audio/CARD-01.md)

## 本卡要做

核对 E2-S05。任务角标若已在 PKG-04 完成，本卡只在状态格写明证据路径。若还有未接的货币镜像或 toast 层，只补测试证明的缺口，不重做商店。更新 E1-S09 与 E2-S03 状态格。

## 不要做

不开始音频。不把灰盒视觉补测写成 done 且无保留。

## 允许修改的文件

- `src/core/scenes/UiScene.ts`
- `tests/unit/hud.spec.ts`
- `docs/sdd/handoffs/PKG-07-CARD-03.md`
- `docs/sdd/NOW.md`
- `docs/sdd/packages/INDEX.md`
- `docs/sdd/specs/INDEX.md`
- `docs/sdd/specs/SPEC-0007-residual-partials.md`
- `docs/sdd/specs/SPEC-0008-integration-audio.md` 的状态行
- `production/epics/E1-foundation.md`
- `production/epics/E2-playable-slice.md`

## 完成时必须为真

- E1-S09、E2-S03 状态格与测试路径一致。
- E2-S05 若仍 partial，交接写出还缺哪一条 hud 验收，不把整格改成 done。

## 交接后

SPEC-0008 改为 IMPLEMENTING。NOW 改为 PKG-08 CARD-01，开始该卡。

## 停点

无。
