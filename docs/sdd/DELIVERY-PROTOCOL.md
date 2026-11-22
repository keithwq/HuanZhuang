# 任务卡交付协议

- 文档角色：任务卡交接合同
- 流程： [SDD Operating Model](./SDD-OPERATING-MODEL.md)
- 当前入口： [NOW](./NOW.md)
- 最后更新： 2026-11-22

模型名称不产生权限。权限只来自当前任务卡的允许文件清单，以及 GDD 里已经冻结的口径。

## 1. 开工核对

开始一张任务卡前，逐项核对。缺一项就先补交接，不改玩法文件：

1. [NOW](./NOW.md) 的当前卡就是即将执行的那张。
2. 该卡的上一交接文件存在，且结论不是要求停在业务决策上。
3. 卡上的 SPEC 在 [索引](./specs/INDEX.md) 中为 `IMPLEMENTING`。上一包最后一张卡的交接负责把下一份 SPEC 改成 `IMPLEMENTING`。
4. 本卡要满足的 GDD 章节已经写在卡上。卡上没有、GDD 也没有的玩家规则，按停点处理。

## 2. 执行

- 先写会失败的测试或可复现检查，再写实现。
- 只改本卡「允许修改的文件」。
- 不修改 GDD 验收原文，不扩大到下一张卡的范围。
- 不把灰盒缺图写成失败，也不要为了补图去改美术清单。
- 做完写交接，更新 `NOW.md` 与任务包索引上的状态，然后打开下一张卡。

## 3. 交接模板

```markdown
# Handoff

- Repository: D:\games\HuanZhuang
- Spec ID:
- Card:
- Next Card:
- Changed Files:
- Allowed Files Check: PASSED | PARTIAL | BLOCKED
- Static Checks:
- Runtime Checks:
- Manual Acceptance: NOT PERFORMED
- Known Gaps:
- Overall: PASSED | PARTIAL | BLOCKED
- Non-Goals:
```

## 4. 停点写法

遇到真实业务决策时，交接的 `Overall` 写 `BLOCKED`，`Next Card` 仍写预定的下一张，但 `NOW.md` 保持在当前卡，并写明缺的是哪一条尚未冻结的玩家规则。不要在停点上临时选一个口径继续写代码。
