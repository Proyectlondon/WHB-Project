const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 320, height: 720 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:8790/?no-intro=1&overflow-audit=1', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const result = await page.evaluate(() => [...document.querySelectorAll('body *')].map(el => {
    const r = el.getBoundingClientRect();
    return { tag: el.tagName, id: el.id, cls: typeof el.className === 'string' ? el.className : '', left: r.left, right: r.right, width: r.width, position: getComputedStyle(el).position, text: (el.textContent || '').trim().slice(0,80) };
  }).filter(item => item.right > innerWidth + 1 || item.left < -1).sort((a,b) => (b.right - innerWidth) - (a.right - innerWidth)).slice(0,30));
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
