const { chromium } = require('playwright');

const BASE_URL = process.env.WHB_BASE_URL || 'https://whb-project.vercel.app/?no-intro=1';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function runJourney(browser, name, viewport) {
  const context = await browser.newContext({ viewport, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];
  const mediaResponses = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('requestfailed', (request) => failedRequests.push(`${request.method()} ${request.url()} · ${request.failure()?.errorText || 'failed'}`));
  page.on('response', (response) => {
    if (/\.mp3(?:\?|$)/i.test(response.url())) {
      mediaResponses.push({ url: response.url(), status: response.status(), headers: response.headers() });
    }
  });

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('#audio-catalog [data-audio-index]').first().waitFor({ state: 'visible', timeout: 30000 });

  assert(await page.locator('#audio-catalog [data-audio-index]').count() === 46, `${name}: el catálogo no contiene 46 pistas`);
  assert(await page.locator('main section.chapter').count() >= 8, `${name}: faltan capítulos principales`);
  assert(await page.locator('#booking-form').count() === 1, `${name}: falta el formulario de contacto`);

  const duplicateIds = await page.evaluate(() => {
    const counts = [...document.querySelectorAll('[id]')].reduce((map, node) => map.set(node.id, (map.get(node.id) || 0) + 1), new Map());
    return [...counts].filter(([, count]) => count > 1).map(([id]) => id);
  });
  assert(duplicateIds.length === 0, `${name}: IDs duplicados: ${duplicateIds.join(', ')}`);

  const anthology = page.locator('#audio-catalog .album-block').filter({ has: page.locator('summary', { hasText: 'ANTHOLOGY VOL II' }) }).first();
  await anthology.locator('summary').click();
  if (!(await anthology.getAttribute('open'))) await anthology.locator('summary').click();
  const caminos = anthology.locator('[data-audio-index]', { hasText: 'Caminos de Zipacón' }).first();
  await page.evaluate(() => {
    window.__whbAudioEvents = [];
    const audio = document.querySelector('#whb-audio');
    ['loadstart', 'durationchange', 'loadedmetadata', 'loadeddata', 'canplay', 'playing', 'seeking', 'seeked', 'stalled', 'suspend', 'waiting', 'ended', 'error'].forEach((type) => {
      audio.addEventListener(type, () => window.__whbAudioEvents.push({ type, at: performance.now(), currentTime: audio.currentTime, duration: audio.duration, readyState: audio.readyState, networkState: audio.networkState }));
    });
  });
  await caminos.click();
  await page.waitForFunction(() => {
    const audio = document.querySelector('#whb-audio');
    return audio && Number.isFinite(audio.duration) && audio.duration > 200 && !audio.paused;
  }, null, { timeout: 30000 });
  const start = await page.locator('#whb-audio').evaluate((audio) => ({ current: audio.currentTime, duration: audio.duration, ended: audio.ended }));
  assert(start.duration > 230 && start.duration < 240, `${name}: Caminos reporta ${start.duration}s, se esperaban ~235s`);
  await page.waitForTimeout(22000);
  const after = await page.locator('#whb-audio').evaluate((audio) => ({ current: audio.currentTime, duration: audio.duration, ended: audio.ended, paused: audio.paused }));
  const audioEvents = await page.evaluate(() => window.__whbAudioEvents);
  assert(after.current > 18 && after.current < 35, `${name}: Caminos saltó de ${start.current.toFixed(1)}s a ${after.current.toFixed(1)}s\nEventos: ${JSON.stringify(audioEvents)}\nRespuestas: ${JSON.stringify(mediaResponses)}`);
  assert(!after.ended && !after.paused, `${name}: Caminos terminó o se pausó antes de 22 segundos`);

  await page.locator('#services').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => !document.querySelector('#whb-mini-player')?.hidden, null, { timeout: 5000 });
  assert(await page.locator('#whb-mini-title').textContent() === 'Caminos de Zipacón', `${name}: el mini reproductor perdió la pista activa`);

  const audioSources = await page.evaluate(() => [...document.querySelectorAll('[data-audio-index]')].map((button) => Number(button.dataset.audioIndex)));
  assert(audioSources.length === 46, `${name}: no se pudieron enumerar todas las pistas`);

  if (viewport.width <= 560) {
    const mobileStyles = await page.evaluate(() => ({
      catalogOverflow: getComputedStyle(document.querySelector('.audio-catalog')).overflowY,
      catalogMaxHeight: getComputedStyle(document.querySelector('.audio-catalog')).maxHeight,
      playerPosition: getComputedStyle(document.querySelector('#whb-player')).position
    }));
    assert(mobileStyles.catalogOverflow === 'visible', `${name}: el catálogo conserva scroll interno`);
    assert(mobileStyles.catalogMaxHeight === 'none', `${name}: el catálogo conserva altura máxima`);
    assert(mobileStyles.playerPosition === 'relative', `${name}: el reproductor principal sigue sticky`);
  }

  const result = { name, viewport, caminos: { start, after }, consoleErrors, failedRequests };
  await context.close();
  return result;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const desktop = await runJourney(browser, 'desktop', { width: 1440, height: 900 });
    const mobile = await runJourney(browser, 'mobile', { width: 390, height: 844 });
    console.log(JSON.stringify({ ok: true, baseUrl: BASE_URL, journeys: [desktop, mobile] }, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ ok: false, baseUrl: BASE_URL, error: error.stack || error.message }, null, 2));
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
