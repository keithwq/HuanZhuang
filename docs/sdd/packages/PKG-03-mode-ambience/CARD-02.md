# PKG-03 CARD-02 氛围光档位

- Spec: [SPEC-0003](../../specs/SPEC-0003-mode-ambience.md)
- Status: WAIT
- Previous: CARD-01
- Next: [CARD-03](./CARD-03.md)

## 本卡要做

按 `ambienceTier()` 画三档灰盒光层。升档淡入不超过 300ms。减敏时直接切到目标档。撤家具不降档，这一条必须用现有存档棘轮验证，不能在 UI 里另记一个会下降的档。

## 不要做

不改 5/11/17。不放循环闪烁。

## 允许修改的文件

- `src/systems/room/ambience.ts`
- `src/systems/room/stage.ts`
- `tests/unit/mode-switch.spec.ts`
- `docs/sdd/handoffs/PKG-03-CARD-02.md`
- `docs/sdd/NOW.md`
- `docs/sdd/packages/INDEX.md`

## 完成时必须为真

- SPEC AC-03、AC-04 有测试。
- 真图三层缺失在交接写 `PARTIAL`。

## 交接后

写交接，NOW 改为 CARD-03，开始 CARD-03。

## 停点

无。
