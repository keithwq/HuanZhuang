# PKG-08 CARD-02 已冻结的音频通路

- Spec: [SPEC-0008](../../specs/SPEC-0008-integration-audio.md)
- Status: WAIT
- Previous: CARD-01
- Next: [CARD-03](./CARD-03.md)

## 本卡要做

接上 S1 与 S3 的播放纪律、合并窗、减敏下仍然播放。S2 的监听可以注册，但没有任何套装判据决策时播放次数必须保持 0。`audioEnabled` 为 false 时静音，BGM 暂停而不是把音量写成 0。没有素材文件时用测试替身，加载失败按方案静默放弃。

## 不要做

不添加设置按钮。不选择套装完成的定义。不改音量常量。

## 允许修改的文件

- `src/systems/audio/`
- `src/core/app.ts`
- `tests/unit/audio.spec.ts`
- `docs/sdd/handoffs/PKG-08-CARD-02.md`
- `docs/sdd/evidence/SPEC-0008/`
- `docs/sdd/NOW.md`
- `docs/sdd/packages/INDEX.md`

## 完成时必须为真

- SPEC AC-02、AC-03 有测试。
- 仓库里没有为了听感而提交的大体积占位音乐。

## 交接后

写交接，NOW 改为 CARD-03，开始 CARD-03。

## 停点

无。本卡使用的规则已在 audio-plan 与 E6 验收列。
