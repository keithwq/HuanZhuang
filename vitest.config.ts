import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    // MAJ-2 修复（QA round1）：单命令 CI 门可用——include 收窄至单测/契约层，
    // e2e 归 @playwright/test 通道（tests/e2e/** 不入 vitest 收集）
    include: ['tests/unit/**/*.spec.ts', 'tests/contracts/**/*.spec.ts'],
    fakeTimers: {
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
    },
  },
});
