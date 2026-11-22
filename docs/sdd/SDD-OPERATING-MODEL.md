# SDD Operating Model

本文件是本仓库的规格优先流程契约，不是玩法需求，也不是某一张任务卡的实施授权。

流程来源是同目录下其他项目 `D:\games\magic_war\docs\SDD-OPERATING-MODEL.md` 的工件集合与生命周期。2026-11-22 用户指令改写了任务卡之间的停点，见 [DECISION-LOG](./decisions/DECISION-LOG.md) HZ-SDD-01。

## 1. 事实来源

仓库文件是当前需求与证据的唯一权威。聊天、记忆、旧任务书不能单独授权改玩法。

玩法口径以已冻结的 `design/gdd/` 与 `design/decisions.md` 为准。本目录的 SPEC 只把这些口径收成可执行、可验证、文件范围有限的实施合同，不得新造验收标准。

## 2. 必要工件

每项产品改动在改代码前必须能指向：

1. [SPEC 索引](./specs/INDEX.md) 中的一份 SPEC：唯一 ID、状态、范围、非范围、允许文件、验收场景、依赖、风险、证据计划。
2. 任务包中的一张任务卡。任务卡是 SPEC 的连续切片，不另写一套规则。
3. 上一张卡的交接，路径在 `docs/sdd/handoffs/`。第一张实施卡的上一交接是 [PKG-00-CARD-01](./handoffs/PKG-00-CARD-01.md)。
4. 证据目录 `docs/sdd/evidence/<SPEC-ID>/`。静态检查、运行检查、人工验收分开记录。

没有用户原话，任何文件不得宣称「用户已批准」或「用户已验收」。

## 3. SPEC 生命周期

唯一合法序列：

`DRAFT -> REVIEW -> APPROVED -> IMPLEMENTING -> VERIFIED -> SUPERSEDED`

- `DRAFT`：编写中。
- `REVIEW`：等待用户看口径冲突。
- `APPROVED`：用户已确认该版本口径。本仓库不把魔法战争的逐份 SHA-256 批准当作任务卡之间的停点。
- `IMPLEMENTING`：当前 [NOW](./NOW.md) 指向的 SPEC。只允许改该 SPEC 与当前任务卡列出的文件。
- `VERIFIED`：任务卡全部交接，且要求的证据已落盘。
- `SUPERSEDED`：被点名的后续 SPEC 或决策取代，不再授权新改动。

已进入 `IMPLEMENTING` 的 SPEC 不得静默改验收口径。口径要变，先写决策记录，再开新 SPEC。

## 4. 连续执行与唯一停点

任务卡按 [任务包索引](./packages/INDEX.md) 的顺序执行。一张卡完成时必须写下交接，并在同一轮把 `NOW.md` 指到下一张卡，然后开始下一张。

只有下面这种情形才停止，并在交接里写 `BLOCKED`：

- 玩家可见规则在 `design/decisions.md` 和所引 GDD 章节里都没有，而选项会改变玩家得到什么。

下列情况不停、不另问：

- 实现路径、文件拆分、灰盒占位、测试组织。
- GDD 已写明「资产到位后补测」的视觉条款。用灰盒完成逻辑与交互，把视觉补测留在证据里标 `PARTIAL`。
- 环境缺失（真机、音频素材）。能做的检查做完，缺的标 `BLOCKED`，卡仍交接给下一张，不虚构通过。

## 5. 证据等级

结果只用 `PASSED`、`PARTIAL`、`BLOCKED`。

- 静态检查：文件、类型、单测、数据一致性。
- 运行检查：`npm test` 或 Playwright 的真实命令输出。
- 人工验收：用户亲自看过并留下原话。

低一级证据不能冒充高一级验收。

## 6. 交接最小字段

每份交接保存为 `docs/sdd/handoffs/<PKG>-<CARD>.md`，至少包含：仓库路径、SPEC ID、本卡、下一卡、允许文件核对、静态检查、运行检查、人工验收、已知缺口、结论（`PASSED` / `PARTIAL` / `BLOCKED`）、非范围。

结论不是用户验收。没跑的检查写 `BLOCKED`，不写「应该通过」。

## 7. 与现有文档的关系

- `design/gdd/`：玩法与验收原文。
- `design/decisions.md`：已拍板决策。
- `docs/architecture/`：架构与 ADR。SPEC 不改架构结论，除非该 SPEC 的范围写明要改哪一份 ADR。
- `production/epics/`：Story 状态列。任务卡做完后，只更新对应 Story 的状态格，不改验收列。
- `production/sprint-plan.md`：排期来源。本目录把 Sprint 2 剩余工作收成单链，避免两套入口。
