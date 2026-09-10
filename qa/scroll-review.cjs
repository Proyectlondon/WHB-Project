const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const out = path.resolve(__dirname, '../../docs/whb-review-2026-09-10');
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const patched of [false, true]) for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      if (patched) await page.route('**/app.js', route => route.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(path.resolve(__dirname, '../app.js'), 'utf8') }));
      if (patched) await page.route('**/styles.css', route => route.fulfill({ contentType: 'text/css', body: fs.readFileSync(path.resolve(__dirname, '../styles.css'), 'utf8') }));
      if (patched) await page.route('https://whb-project.vercel.app/?no-intro=1', route => route.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8') }));
      await page.goto('https://whb-project.vercel.app/?no-intro=1', { waitUntil: 'domcontentloaded' });
      await page.locator('.media-thumb').first().waitFor({ state: 'attached' });
      await page.waitForTimeout(1500);
      const startY = await page.evaluate(() => scrollY);
      const button = page.locator('[data-media-next]').first();
      await button.scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);
      const before = await page.evaluate(() => scrollY);
      const titleBefore = await page.locator('#media-title').textContent();
      await button.click();
      await page.waitForTimeout(1000);
      const after = await page.evaluate(() => scrollY);
      const titleAfter = await page.locator('#media-title').textContent();
      await page.screenshot({ path: path.join(out, `${patched ? 'fixed' : 'live'}-${width}-after.png`) });
      const journalCount = await page.locator('#journal, a[href="#journal"]').count();
      let galleryDelta = null, stripLeft = null;
      if (patched) {
        await page.locator('[data-gallery-next]').scrollIntoViewIfNeeded();
        await page.waitForTimeout(400);
        const gy = await page.evaluate(() => scrollY);
        for (let i = 0; i < 15; i++) await page.locator('[data-gallery-next]').click();
        await page.waitForTimeout(400);
        galleryDelta = await page.evaluate(y => scrollY-y, gy);
        stripLeft = await page.locator('#media-gallery-thumbs').evaluate(e => e.scrollLeft);
      }
      const record = { patched, width, startY, before, after, delta: after-before, titleBefore, titleAfter, journalCount, galleryDelta, stripLeft, errors };
      results.push(record);
      console.log(JSON.stringify(record));
      await context.close();
    }
  } finally { await browser.close(); fs.writeFileSync(path.join(out, 'scroll-results.json'), JSON.stringify(results, null, 2)); }
  if (results.filter(r => r.patched).some(r => Math.abs(r.delta) > 2 || r.startY > 2 || r.titleBefore === r.titleAfter || r.journalCount || Math.abs(r.galleryDelta) > 2 || r.stripLeft <= 0 || r.errors.length)) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; });
