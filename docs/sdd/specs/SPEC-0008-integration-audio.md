# SPEC-0008: 集成证据与音频

- Spec ID: SPEC-0008
- Status: DRAFT
- Package: PKG-08
- Last Updated: 2026-11-22

## 用户目标

已做完的循环有可复核的证据。声音在规则已经冻结的部分接上；规则没冻结的部分不猜。

## 范围

- 能在本机跑的集成检查：契约快照、红线扫描中已有数据可判定的项、`npm test` 全量。
- 音频：S1 接 `tryon:done`，S3 接 `coins:changed` 且只在规定 reason 上播放，BGM 生命周期按 audio-plan。S2 挂钩可以接上，但在套装完成判据落盘前触发次数必须为 0。
- `settings.audioEnabled` 的静音通路。没有 HUD 入口位置时不做按钮。

## 非范围

- 不发明套装完成判据。
- 不决定小喇叭放在顶导哪一格、文案写什么。
- 不把缺真机写成通过。
- 不改已冻结音量常量来「听起来更好」。

## 规则

- E5-S01 至 S05、E6-S01 至 S02 的验收列。
- audio-plan 已写明的播放纪律。未写明的 UI 归属以 E6 文件中的在途声明为准。

## 验收场景

| 编号 | 前置 | 操作 | 可见结果 | 证据 |
|---|---|---|---|---|
| AC-01 | 本机依赖已安装 | 跑全量单测 | 退出码 0 | 命令输出 |
| AC-02 | 无套装判据决策 | 换装与回穿 | S2 播放次数为 0 | 单测 |
| AC-03 | 关闭 audioEnabled | 触发 S1/S3 | 不播放；BGM 暂停而不是把音量写成 0 | 单测 |
| AC-04 | 无真机 | 写真机矩阵 | 证据为 `BLOCKED`，不填虚构机型 | 证据文件 |

## 允许修改的文件

- `src/systems/audio/`（新）
- `src/core/app.ts`（只登记音频监听）
- `tests/unit/audio.spec.ts`（新）
- `docs/sdd/evidence/SPEC-0008/`
- 交接、NOW、包索引、本 SPEC 状态行
- CARD-03 在停点成立时除交接外不改 `src/`

## 依赖与取代

- Dependencies: SPEC-0007
- Risks: 无音频素材时播放失败按 audio-plan 静默放弃，测试用假音频驱动，不提交大文件占位音乐除非仓库已有素材
- Supersedes: 无
- Superseded By: 无

## 任务卡

1. [CARD-01](../packages/PKG-08-integration-audio/CARD-01.md)
2. [CARD-02](../packages/PKG-08-integration-audio/CARD-02.md)
3. [CARD-03](../packages/PKG-08-integration-audio/CARD-03.md)

## 停点

CARD-03 若 `design/decisions.md` 仍没有套装完成判据和音频开关入口，写 `BLOCKED` 并停在该卡。这是本链唯一预先写明的业务停点。

## 证据计划

本地命令与单测写入证据目录。真机与人工听音未发生则保持 `BLOCKED` / `NOT PERFORMED`。
