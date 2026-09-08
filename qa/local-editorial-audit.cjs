const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto('file:///D:/Proyectos%20IA/WHB%20Webpage/site-v1.5/index.html?no-intro=1', { waitUntil: 'domcontentloaded' });
    const result = await page.evaluate(() => ({
      journal: Boolean(document.querySelector('#journal')),
      journalNav: Boolean(document.querySelector('a[href="#journal"]')),
      services: Boolean(document.querySelector('#services')),
      contact: Boolean(document.querySelector('#contact')),
      wixLinks: document.querySelectorAll('a[href*="whbprojectmusic.wixsite.com/whbproject/post"]').length,
      provisionalEditorialNotes: document.querySelectorAll('.editorial-provisional').length,
      horizontalOverflow: document.body.scrollWidth > window.innerWidth
    }));
    result.ok = result.journal && result.journalNav && result.services && result.contact && result.wixLinks === 0 && result.provisionalEditorialNotes === 2 && !result.horizontalOverflow;
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(JSON.stringify({ ok: false, error: error.stack || error.message }, null, 2)); process.exitCode = 1; });
