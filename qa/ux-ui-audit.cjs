const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const axePath = require.resolve('axe-core');

const ORIGIN = process.env.WHB_ORIGIN || 'https://whb-project.vercel.app';
const OUT = path.join(__dirname, 'ux-ui-output');
fs.mkdirSync(OUT, { recursive: true });

async function inspectViewport(browser, label, viewport) {
  const context = await browser.newContext({ viewport, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const consoleErrors = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', error => consoleErrors.push(error.message));

  await page.goto(`${ORIGIN}/?ux-audit=${Date.now()}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('#hero-opening').waitFor({ state: 'visible', timeout: 15000 });
  await page.screenshot({ path: path.join(OUT, `${label}-00-intro.png`) });
  await page.keyboard.press('Escape');
  await page.locator('#hero-opening').waitFor({ state: 'hidden', timeout: 5000 });
  await page.locator('#audio-catalog [data-audio-index]').first().waitFor({ state: 'attached', timeout: 30000 });

  const ids = ['arrival', 'story', 'members', 'music', 'media', 'family', 'services', 'contact'];
  const sectionMetrics = [];
  for (const [index, id] of ids.entries()) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, `${label}-${String(index + 1).padStart(2, '0')}-${id}.png`) });
    const metric = await page.locator(`#${id}`).evaluate((section) => {
      const rect = section.getBoundingClientRect();
      const heading = section.querySelector('h1,h2');
      const headingRect = heading?.getBoundingClientRect();
      return {
        id: section.id,
        height: Math.round(rect.height),
        heading: heading?.innerText.replace(/\s+/g, ' ').trim() || '',
        headingRect: headingRect ? {
          left: Math.round(headingRect.left), right: Math.round(headingRect.right),
          top: Math.round(headingRect.top), bottom: Math.round(headingRect.bottom),
          width: Math.round(headingRect.width), height: Math.round(headingRect.height)
        } : null
      };
    });
    sectionMetrics.push(metric);
  }

  await page.locator('#music').scrollIntoViewIfNeeded();
  const firstAlbum = page.locator('.album-block').first();
  if (!(await firstAlbum.evaluate(details => details.open))) await firstAlbum.locator('summary').click();
  await page.screenshot({ path: path.join(OUT, `${label}-music-expanded.png`) });

  const firstTrack = page.locator('[data-audio-index]').first();
  await firstTrack.click();
  await page.waitForTimeout(800);
  await page.locator('#services').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(OUT, `${label}-mini-player.png`) });

  await page.addScriptTag({ path: axePath });
  const axe = await page.evaluate(async () => await axe.run(document, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag22aa'] }
  }));

  const diagnostics = await page.evaluate(() => {
    const all = [...document.querySelectorAll('body *')];
    const visible = all.filter(el => {
      const s = getComputedStyle(el); const r = el.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0 && r.width > 0 && r.height > 0;
    });
    const smallText = visible.filter(el => el.children.length === 0 && el.textContent.trim())
      .map(el => ({ tag: el.tagName, text: el.textContent.trim().slice(0, 80), px: parseFloat(getComputedStyle(el).fontSize) }))
      .filter(x => x.px < 12).sort((a,b) => a.px - b.px).slice(0, 25);
    const targets = visible.filter(el => el.matches('a,button,input,select,textarea,summary'))
      .map(el => { const r = el.getBoundingClientRect(); return { tag: el.tagName, text: (el.getAttribute('aria-label') || el.textContent || el.getAttribute('name') || '').trim().slice(0,60), w: Math.round(r.width), h: Math.round(r.height) }; });
    const undersizedTargets = targets.filter(x => x.w < 44 || x.h < 44);
    const fixed = visible.filter(el => ['fixed','sticky'].includes(getComputedStyle(el).position))
      .map(el => { const r = el.getBoundingClientRect(); return { cls: el.id || el.className, pos: getComputedStyle(el).position, left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom) }; });
    const navLinks = [...document.querySelectorAll('.chapter-nav a')].map(a => ({ text: a.innerText.trim(), active: a.classList.contains('is-active') }));
    const bodyRect = document.body.getBoundingClientRect();
    return {
      viewport: { width: innerWidth, height: innerHeight },
      pageHeight: Math.round(bodyRect.height),
      horizontalOverflow: document.documentElement.scrollWidth - innerWidth,
      targets: targets.length,
      undersizedTargets: undersizedTargets.slice(0, 40),
      undersizedCount: undersizedTargets.length,
      smallText,
      fixed,
      navLinks,
      activeNavCount: navLinks.filter(x => x.active).length,
      miniVisible: !document.querySelector('#whb-mini-player')?.hidden,
      formAction: document.querySelector('#booking-form')?.getAttribute('action') || null,
      albumCount: document.querySelectorAll('.album-block').length,
      trackCount: document.querySelectorAll('[data-audio-index]').length,
      iframeCount: document.querySelectorAll('iframe').length
    };
  });

  await context.close();
  return {
    label,
    viewport,
    sectionMetrics,
    diagnostics,
    accessibility: axe.violations.map(item => ({
      id: item.id,
      impact: item.impact,
      help: item.help,
      nodes: item.nodes.map(node => node.target)
    })),
    consoleErrors
  };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const results = [];
    results.push(await inspectViewport(browser, 'desktop-1440x900', { width: 1440, height: 900 }));
    results.push(await inspectViewport(browser, 'mobile-390x844', { width: 390, height: 844 }));
    results.push(await inspectViewport(browser, 'mobile-320x720', { width: 320, height: 720 }));
    fs.writeFileSync(path.join(OUT, 'diagnostics.json'), JSON.stringify({ origin: ORIGIN, results }, null, 2));
    console.log(JSON.stringify({ ok: true, output: OUT, results }, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
