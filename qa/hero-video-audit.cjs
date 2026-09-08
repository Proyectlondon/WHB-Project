const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto('file:///D:/Proyectos%20IA/WHB%20Webpage/site-v1.5/index.html?hero-audit=1', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('#hero-video')?.readyState >= 2, null, { timeout: 30000 });
    const source = await page.locator('#hero-video source').getAttribute('src');
    const before = await page.locator('#hero-video').evaluate((video) => video.currentTime);
    await page.waitForTimeout(1800);
    const after = await page.locator('#hero-video').evaluate((video) => video.currentTime);
    const result = { ok: source === 'assets/video/hero-whb-dandelion-v2.mp4' && after > before + 1, source, before, after };
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(JSON.stringify({ ok: false, error: error.stack || error.message }, null, 2)); process.exitCode = 1; });
