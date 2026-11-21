import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    assetsInlineLimit: 0, // 资产一律独立文件（指纹长缓存，architecture §9）
  },
  server: { host: true },
});
