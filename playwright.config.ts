import { defineConfig } from '@playwright/test';

/**
 * e2e 配置（testing-scaffold §2.2 + QA 计划 §2.0/§4.1-C5）
 * - **dev 服务器**为目标（探针/QA 钩子仅 dev 暴露——R-16）；production 构建零暴露由
 *   tests/unit/prod-bundle-hygiene.spec.ts 静态断言（C-5：console 告警类断言若引入须切 prod 构建）
 * - 系统 Edge/Chrome 通道（免浏览器下载；真机矩阵留 E5-S02）
 */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: {
    channel: 'msedge', // 系统浏览器通道（chromium 下载被环境阻断的落地方径）
    headless: true,
    viewport: { width: 390, height: 844 }, // DPR≈3 档设备口径（R-14 cap 验证面）
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  webServer: {
    command: 'npx vite --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  reporter: [['list']],
});
