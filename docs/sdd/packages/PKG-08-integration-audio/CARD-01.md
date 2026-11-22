# PKG-08 CARD-01 本地集成证据

- Spec: [SPEC-0008](../../specs/SPEC-0008-integration-audio.md)
- Status: WAIT
- Previous: PKG-07 CARD-03
- Next: [CARD-02](./CARD-02.md)

## 本卡要做

跑全量 `npm test`。把命令、退出码和失败摘要写入 `docs/sdd/evidence/SPEC-0008/`。已有契约测试保持通过。真机矩阵写成 `BLOCKED`，不填虚构设备。

## 不要做

不改测试来掩盖失败。失败若来自更早的包，交接写 `BLOCKED`，NOW 留在本卡，并指出失败的测试文件。不在本卡修改那些包的玩法文件。

## 允许修改的文件

- `docs/sdd/evidence/SPEC-0008/`
- `docs/sdd/handoffs/PKG-08-CARD-01.md`
- `docs/sdd/NOW.md`
- `docs/sdd/packages/INDEX.md`
- 仅当失败来自证据脚本本身时，可改 `tests/contracts/frozen-interfaces.spec.ts` 的路径引用，不改断言口径

## 完成时必须为真

- 证据文件存在。
- 全量测试通过，或交接 `BLOCKED` 且 NOW 未前进。

## 交接后

通过则 NOW 改为 CARD-02，并开始 CARD-02。

## 停点

无业务停点。测试失败是缺陷，不是要用户选的玩法。
