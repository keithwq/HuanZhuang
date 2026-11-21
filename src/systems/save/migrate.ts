/**
 * 迁移链（E1-S05，local-save §4 / ADR-002 §4）
 * - 链式注册表：按版本升序、每级幂等（重放一致）
 * - 迁移前整档字符串快照 → huanzhuang_save_mig（失败可回滚）
 * - v1 锚点：ambienceLevel / settings.audioEnabled 均为可选键零迁移（ADR-002 §4.4），
 *   本文件为未来 schemaVersion > 1 预留标准路径。
 */

import { Serializer } from './Serializer';
import { SAVE_KEY_MIG } from './types';

export type MigrationFn = (data: Record<string, unknown>) => Record<string, unknown>;

interface MigrationStep {
  from: number;
  to: number;
  fn: MigrationFn;
}

export class MigrationChain {
  private steps: MigrationStep[] = [];

  /** 注册一级迁移（幂等实现由注册方保证；此处只保序执行） */
  register(from: number, to: number, fn: MigrationFn): void {
    this.steps.push({ from, to, fn });
    this.steps.sort((a, b) => a.from - b.from);
  }

  hasMigration(fromVersion: number): boolean {
    return this.steps.some((s) => s.from === fromVersion);
  }

  /**
   * 执行迁移：写入前快照（driven 由 SavePolicy 提供——真实驱动下快照入 SAVE_KEY_MIG）。
   * 每级迁移后 schemaVersion 更新，链式推进直至无可用迁移。
   */
  run(
    raw: Record<string, unknown>,
    snapshot: (key: string, value: string) => void,
  ): { data: Record<string, unknown>; migrated: boolean } {
    let data = { ...raw };
    let migrated = false;
    let guard = 0;
    while (guard++ < 100) {
      const ver = (data.schemaVersion as number | undefined) ?? 0;
      const step = this.steps.find((s) => s.from === ver);
      if (!step) break;
      if (!migrated) {
        // 迁移前完整备份一次（local-save §4；ADR-002 §4 快照键可回滚）
        snapshot(SAVE_KEY_MIG, JSON.stringify(raw));
      }
      data = step.fn(data);
      data.schemaVersion = step.to;
      migrated = true;
    }
    return { data, migrated };
  }
}

/**
 * 演练用：v1→v2 示例迁移（幂等）——测试演练（testing-scaffold §3 单测：v1→v2 演练 spec）。
 * 真实 v2 schema 出现时替换为正式注册。
 */
export const demoMigrateV1toV2: MigrationFn = (data) => {
  const out = { ...data };
  // 幂等示例：补一个可派生新字段（不动既有值）
  if (out.stats !== undefined && typeof out.stats === 'object') {
    const stats = { ...(out.stats as Record<string, unknown>) };
    if (typeof stats.demoFlag !== 'boolean') stats.demoFlag = true;
    out.stats = stats;
  }
  return out;
};

/** Serializer 别名重导出（迁移链与解析共用口径） */
export { Serializer };
