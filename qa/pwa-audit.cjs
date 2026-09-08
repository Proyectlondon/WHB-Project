const { chromium } = require('playwright');

const ORIGIN = process.env.WHB_ORIGIN || 'https://whb-project.vercel.app';

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const page = await context.newPage();
    const manifestResponse = await page.request.get(`${ORIGIN}/manifest.webmanifest`, { timeout: 30000 });
    const manifest = manifestResponse.ok() ? await manifestResponse.json() : null;
    const iconResults = [];
    for (const icon of manifest?.icons || []) {
      const response = await page.request.get(`${ORIGIN}/${icon.src}`, { timeout: 30000 });
      iconResults.push({ src: icon.src, status: response.status(), contentType: response.headers()['content-type'] || '' });
    }
    await page.goto(`${ORIGIN}/?no-intro=1&pwa-audit=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(800);
    const firstRegistration = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return { supported: false, registered: false, controlled: false };
      const registration = await navigator.serviceWorker.ready;
      return { supported: true, registered: Boolean(registration.active), controlled: Boolean(navigator.serviceWorker.controller) };
    });
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(500);
    const secondRegistration = await page.evaluate(() => ({ supported: 'serviceWorker' in navigator, controlled: Boolean(navigator.serviceWorker?.controller), displayStandalone: window.matchMedia('(display-mode: standalone)').matches }));
    const checks = {
      manifest: manifestResponse.ok() && manifest?.display === 'standalone' && manifest?.scope === '/',
      startUrl: manifest?.start_url === '/?source=installed',
      icons: iconResults.length > 0 && iconResults.every((item) => item.status === 200 && item.contentType.includes('image')),
      serviceWorker: firstRegistration.registered && secondRegistration.controlled,
      mobileLayout: await page.locator('body').evaluate((body) => body.scrollWidth <= window.innerWidth + 1)
    };
    const result = { ok: Object.values(checks).every(Boolean), origin: ORIGIN, checks, manifest: { name: manifest?.name, short_name: manifest?.short_name, display: manifest?.display, start_url: manifest?.start_url }, icons: iconResults, registration: { first: firstRegistration, second: secondRegistration } };
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
    await context.close();
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(JSON.stringify({ ok: false, origin: ORIGIN, error: error.stack || error.message }, null, 2)); process.exitCode = 1; });
