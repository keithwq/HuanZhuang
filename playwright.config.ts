import { defineConfig } from '@playwright/test';

/**
 * e2e 配置（testing-scaffold §2.2）
 * - 系统 Edge/Chrome 通道（免浏览器下载；真机矩阵留 E5-S02）
 * - webServer：vite preview（dist 静态产物，architecture §9 部署形态）
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
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  reporter: [['list']],
});
