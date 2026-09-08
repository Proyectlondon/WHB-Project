const { chromium } = require('playwright');
const path = require('path');

const ORIGIN = process.env.WHB_ORIGIN || 'https://whb-project.vercel.app';
const axePath = require.resolve('axe-core');

function check(value, message, findings) {
  if (!value) findings.push(message);
}

async function verifyMediaHeaders(request, catalog) {
  const paths = [
    ...catalog.audio.map((item) => item.path),
    ...catalog.gallery.map((item) => item.src),
    'assets/video/hero-whb-2k.mp4'
  ];
  const results = [];
  for (let i = 0; i < paths.length; i += 8) {
    const batch = paths.slice(i, i + 8);
    results.push(...await Promise.all(batch.map(async (assetPath) => {
      const response = await request.head(`${ORIGIN}/${assetPath.split('/').map(encodeURIComponent).join('/')}`, { timeout: 30000 });
      return { path: assetPath, status: response.status(), bytes: Number(response.headers()['content-length'] || 0), type: response.headers()['content-type'] || '' };
    })));
  }
  return results;
}

async function introJourney(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${ORIGIN}/?qa-intro=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('#hero-opening').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForFunction(() => document.querySelector('#hero-video')?.readyState >= 2, null, { timeout: 30000 });
  const before = await page.locator('#hero-video').evaluate((video) => video.currentTime);
  await page.waitForTimeout(1800);
  const after = await page.locator('#hero-video').evaluate((video) => video.currentTime);
  await page.keyboard.press('Escape');
  await page.locator('#hero-opening').waitFor({ state: 'hidden', timeout: 5000 });
  await context.close();
  return { before, after, advanced: after > before + 1, errors };
}

async function functionalJourney(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const findings = [];
  const errors = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${ORIGIN}/?no-intro=1&qa=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('#audio-catalog [data-audio-index]').first().waitFor({ state: 'attached', timeout: 30000 });

  const catalog = await (await page.request.get(`${ORIGIN}/content/catalog.json`)).json();
  check(catalog.audio.length === 32, `Catálogo de audio: ${catalog.audio.length}/32`, findings);
  check(catalog.videos.length === 22, `Catálogo de video: ${catalog.videos.length}/22`, findings);
  check(new Set(catalog.videos.map((item) => item.id)).size === catalog.videos.length, 'Hay IDs de YouTube duplicados', findings);

  const internalTargets = await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute('href')).filter((href) => href.length > 1));
  const missingTargets = await page.evaluate((targets) => [...new Set(targets)].filter((href) => !document.querySelector(href)), internalTargets);
  check(missingTargets.length === 0, `Enlaces internos sin destino: ${missingTargets.join(', ')}`, findings);

  const initialTitle = await page.locator('#media-title').textContent();
  await page.locator('[data-media-next]').first().click();
  const clickTitle = await page.locator('#media-title').textContent();
  check(clickTitle !== initialTitle, 'El botón siguiente no cambia la canción editorial', findings);
  await page.locator('.media-song-shell').dispatchEvent('pointerdown', { pointerType: 'touch', clientX: 330, clientY: 300 });
  await page.waitForTimeout(80);
  await page.locator('.media-song-shell').dispatchEvent('pointerup', { pointerType: 'touch', clientX: 90, clientY: 305 });
  const swipeTitle = await page.locator('#media-title').textContent();
  check(swipeTitle !== clickTitle, 'El gesto táctil no cambia la canción editorial', findings);
  const galleryNext = page.locator('[data-gallery-next]');
  if (await galleryNext.isVisible()) {
    const beforeGallery = swipeTitle;
    await galleryNext.click();
    check(await page.locator('#media-title').textContent() === beforeGallery, 'La galería altera por error la canción editorial', findings);
  }

  const anthology = page.locator('.album-block').filter({ has: page.locator('summary', { hasText: 'Señor Escucha Mi Cantar' }) }).first();
  if (!(await anthology.evaluate((details) => details.open))) await anthology.locator('summary').click();
  await anthology.locator('[data-audio-index]', { hasText: 'Caminos De Zipacon' }).first().click();
  await page.waitForFunction(() => document.querySelector('#whb-audio')?.duration > 230 && !document.querySelector('#whb-audio')?.paused, null, { timeout: 30000 });
  await page.waitForTimeout(3000);
  const audioAt3 = await page.locator('#whb-audio').evaluate((audio) => ({ current: audio.currentTime, duration: audio.duration, ended: audio.ended }));
  check(audioAt3.current > 2 && audioAt3.current < 8 && !audioAt3.ended, `Audio anómalo tras 3 s: ${JSON.stringify(audioAt3)}`, findings);
  await page.locator('[data-audio-queue="album"]').click();
  check((await page.locator('#whb-player-mode').textContent()).includes('Álbum'), 'El modo álbum no se activa', findings);
  await page.locator('#services').scrollIntoViewIfNeeded();
  await page.waitForFunction(() => !document.querySelector('#whb-mini-player')?.hidden, null, { timeout: 5000 });
  const miniTitle = await page.locator('#whb-mini-title').textContent();
  check(miniTitle === '01 Señor Escucha mi Cantar', `El mini reproductor muestra “${miniTitle}” tras iniciar el álbum`, findings);

  check(await page.locator('#booking-form').evaluate((form) => !form.checkValidity()), 'El formulario acepta datos vacíos', findings);
  const controlsWithoutName = await page.evaluate(() => [...document.querySelectorAll('button,a,input,select,textarea')].filter((el) => {
    const name = el.getAttribute('aria-label') || el.textContent?.trim() || el.getAttribute('title') || (el.labels && [...el.labels].map((label) => label.textContent.trim()).join(' '));
    return !name;
  }).length);
  check(controlsWithoutName === 0, `${controlsWithoutName} controles sin nombre accesible`, findings);

  await page.addScriptTag({ path: axePath });
  const axe = await page.evaluate(async () => await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] } }));
  const seriousA11y = axe.violations.filter((item) => ['serious', 'critical'].includes(item.impact));
  const mediaHeaders = await verifyMediaHeaders(page.request, catalog);
  const badAudio = mediaHeaders.filter((item) => item.path.endsWith('.mp3') && (item.status >= 400 || item.bytes < 1_000_000));
  const badAssets = mediaHeaders.filter((item) => !item.path.endsWith('.mp3') && item.status >= 400);
  check(badAudio.length === 0, `Audios remotos incompletos: ${badAudio.map((item) => item.path).join(', ')}`, findings);
  check(badAssets.length === 0, `Recursos remotos fallidos: ${badAssets.map((item) => item.path).join(', ')}`, findings);

  const result = {
    findings,
    consoleErrors: errors,
    counts: { audio: catalog.audio.length, videos: catalog.videos.length, gallery: catalog.gallery.length },
    media: { checked: mediaHeaders.length, audioMinBytes: Math.min(...mediaHeaders.filter((item) => item.path.endsWith('.mp3')).map((item) => item.bytes)), badAudio, badAssets },
    accessibility: seriousA11y.map((item) => ({ id: item.id, impact: item.impact, help: item.help, nodes: item.nodes.map((node) => ({ target: node.target, html: node.html, summary: node.failureSummary })) }))
  };
  await context.close();
  return result;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const intro = await introJourney(browser);
    const functional = await functionalJourney(browser);
    const ok = intro.advanced && intro.errors.length === 0 && functional.findings.length === 0 && functional.consoleErrors.length === 0 && functional.accessibility.length === 0;
    console.log(JSON.stringify({ ok, origin: ORIGIN, intro, functional }, null, 2));
    if (!ok) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(JSON.stringify({ ok: false, origin: ORIGIN, error: error.stack || error.message }, null, 2));
  process.exitCode = 1;
});
