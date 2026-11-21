/**
 * R-16 · production 构建探针零暴露（QA 计划 §2.0 / §4.2-2 备案转红线）
 * 静态证明：dev 探针模块经动态 import 门控，prod 构建分支消除 → 产物零探针代码。
 * 注意排除 `__hz_probe__`（StorageDriver localStorage 探测键——正当生产功能，同名巧合）。
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const DIST = 'dist/assets';

describe.skipIf(!existsSync(DIST))('R-16 · prod bundle 探针零残留', () => {
  // MAJ-2b 修复（QA round2）：目录读取移入用例体内——skipIf 关闭时套件体在收集期不执行任何 fs 调用，
  // 干净检出（无 dist/）下 npm test 不再收集期 ENOENT
  it('产物 JS 中无 window.__hz 赋值 / 探针方法 / QA 钩子', () => {
    const bundles = readdirSync(DIST).filter((f) => f.endsWith('.js'));
    const contents = bundles.map((f) => readFileSync(`${DIST}/${f}`, 'utf-8'));
    expect(bundles.length).toBeGreaterThan(0);
    for (const c of contents) {
      // 排除 __hz_probe__（StorageDriver 探测键——正当生产功能，同名巧合）后不得再出现 __hz
      const stripped = c.split('__hz_probe__').join('');
      expect(stripped).not.toContain('__hz');
      expect(c).not.toContain('markTapIn');
      expect(c).not.toContain('installUiQaHook');
      expect(c).not.toContain('installWindowProbe');
    }
  });
});
