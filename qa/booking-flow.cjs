const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.route('**/api/booking', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }));
  await page.goto('http://127.0.0.1:8790/?no-intro=1&booking-qa=1');
  await page.locator('#booking-form').scrollIntoViewIfNeeded();
  const form = page.locator('#booking-form');
  await form.locator('[name=name]').fill('Prueba WHB');
  await form.locator('[name=email]').fill('qa@example.com');
  await form.locator('[name=date]').fill('2026-10-01');
  await form.locator('[name=location]').fill('Tocancipá');
  await form.locator('[name=message]').fill('Prueba UX');
  await form.locator('button[type=submit]').click();
  await page.waitForTimeout(400);
  console.log(await page.locator('#booking-status').textContent());
  await browser.close();
})().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
