const { chromium } = require('playwright');

const ORIGIN = process.env.WHB_ORIGIN || 'https://whb-project.vercel.app';
const MIN_SECONDS = 30;

async function readDuration(page, item) {
  return page.evaluate(({ url, title }) => new Promise((resolve) => {
    const audio = document.createElement('audio');
    let settled = false;
    const finish = (result) => { if (settled) return; settled = true; audio.remove(); resolve(result); };
    const timer = window.setTimeout(() => finish({ title, duration: null, error: 'metadata timeout' }), 30000);
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => { window.clearTimeout(timer); finish({ title, duration: Number.isFinite(audio.duration) ? audio.duration : null, error: null }); };
    audio.onerror = () => { window.clearTimeout(timer); finish({ title, duration: null, error: audio.error?.message || 'media error' }); };
    audio.src = url;
  }), item);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const response = await page.request.get(`${ORIGIN}/content/catalog.json`, { timeout: 60000 });
    if (!response.ok()) throw new Error(`catalog.json respondió ${response.status()}`);
    const catalog = await response.json();
    const results = [];
    for (let i = 0; i < catalog.audio.length; i += 4) {
      const batch = catalog.audio.slice(i, i + 4).map((item) => readDuration(page, { title: item.title, url: `${ORIGIN}/${item.path.split('/').map(encodeURIComponent).join('/')}` }));
      results.push(...await Promise.all(batch));
    }
    const invalid = results.filter((item) => item.error || !item.duration || item.duration < MIN_SECONDS);
    const summary = { ok: invalid.length === 0, origin: ORIGIN, checked: results.length, minSeconds: MIN_SECONDS, invalid, durations: results.map(({ title, duration }) => ({ title, duration: Math.round((duration || 0) * 10) / 10 })) };
    console.log(JSON.stringify(summary, null, 2));
    if (!summary.ok) process.exitCode = 1;
    await context.close();
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(JSON.stringify({ ok: false, origin: ORIGIN, error: error.stack || error.message }, null, 2)); process.exitCode = 1; });
