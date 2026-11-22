# PKG-08 CARD-03 未冻结口径

- Spec: [SPEC-0008](../../specs/SPEC-0008-integration-audio.md)
- Status: WAIT
- Previous: CARD-02
- Next: 无。本卡是当前链的末卡。

## 本卡要做

检查 `design/decisions.md` 是否已经写下两项口径：

1. 套装完成判据。
2. 音频开关在界面上的位置和文案。

两项都还没有时，写交接 `BLOCKED`，列出这两句缺口，不改 `src/`。NOW 留在本卡。

只有某一项已经写进决策记录时，才实现那一项，另一项继续保持未做。不要用「先放在顶导右边」这类临时选择填上缺口。

## 不要做

不替文策渊选定判据或按钮位置。不把 S2 的零触发改成某种自选套装规则。

## 允许修改的文件

- 停点成立时：只写 `docs/sdd/handoffs/PKG-08-CARD-03.md` 与证据说明
- 仅当对应决策已存在时：`src/systems/audio/`、`src/core/scenes/UiScene.ts`、`tests/unit/audio.spec.ts`，以及 E6 状态格

## 完成时必须为真

- 交接明确写出两项口径是已冻结还是仍缺失。
- 缺失时没有任何新的玩家可见入口。

## 交接后

两项都完成并有测试时，SPEC-0008 改为 VERIFIED，NOW 写「链结束」。否则 NOW 保持本卡。

## 停点

上面两项未写入 `design/decisions.md` 时停止。这是本任务链预先承认的真实业务决策。
