import { chromium } from '@playwright/test';

const run = async (): Promise<void> => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  const logs: string[] = [];
  page.on('console', (m) => logs.push(`[console.${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack?.slice(0, 600)}`));
  await page.goto('http://localhost:4173', { waitUntil: 'load' }).catch((e) => logs.push(`[goto] ${e.message}`));
  await page.waitForTimeout(4000);
  const hasHz = await page.evaluate(() => Boolean((window as unknown as { __hz?: unknown }).__hz));
  const canvas = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    return c ? { w: c.width, h: c.height } : null;
  });
  console.log('hasHz:', hasHz, 'canvas:', JSON.stringify(canvas));
  console.log('--- logs ---');
  for (const l of logs.slice(0, 40)) console.log(l);
  await browser.close();
};

run().catch((e) => {
  console.error('SCRIPT ERROR', e);
  process.exit(1);
});
