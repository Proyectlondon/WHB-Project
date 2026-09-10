const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const catalog = fs.readFileSync(path.join(root, 'content', 'catalog.json'), 'utf8');
const results = [];

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 768, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
      const context = await browser.newContext({ viewport, serviceWorkers: 'block', reducedMotion: 'reduce' });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.route('https://whb-project.vercel.app/?no-intro=1', (route) => route.fulfill({ contentType: 'text/html', body: fs.readFileSync(path.join(root, 'index.html'), 'utf8') }));
      await page.route('**/app.js', (route) => route.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(path.join(root, 'app.js'), 'utf8') }));
      await page.route('**/styles.css', (route) => route.fulfill({ contentType: 'text/css', body: fs.readFileSync(path.join(root, 'styles.css'), 'utf8') }));
      await page.route('**/content/catalog.json', (route) => route.fulfill({ contentType: 'application/json', body: catalog }));
      await page.goto('https://whb-project.vercel.app/?no-intro=1', { waitUntil: 'domcontentloaded' });
      await page.locator('#media-video-thumbs .media-video-thumb').first().waitFor({ state: 'attached' });
      await page.waitForTimeout(500);

      const videoThumbCount = await page.locator('#media-video-thumbs .media-video-thumb').count();
      const galleryThumbCount = await page.locator('#media-gallery-thumbs .media-thumb').count();
      const galleryCountText = await page.locator('#media-gallery-count').textContent();
      const videoThumbBox = await page.locator('#media-video-thumbs').boundingBox();
      const firstVideoThumbBox = await page.locator('#media-video-thumbs .media-video-thumb').first().boundingBox();
      const videoPlayerBox = await page.locator('#media-player').boundingBox();
      const aiGalleryImages = await page.locator('#media-gallery-thumbs img').evaluateAll((images) => images.filter((image) => /complementary|generated|concept/i.test(image.src)).map((image) => image.src));
      const musicVisible = await page.locator('#music').isVisible();
      const audioCount = await page.locator('#audio-count').textContent();
      const roles = await page.locator('#members .member-card').allTextContents();
      const watchHref = await page.locator('#media-watch').getAttribute('href');
      const initialVideo = await page.locator('#media-title').textContent();
      const initialScroll = await page.evaluate(() => scrollY);
      const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      const directVideoThumb = page.locator('#media-video-thumbs .media-video-thumb').nth(3);
      await directVideoThumb.click();
      await page.waitForTimeout(350);
      const directVideoTitle = await page.locator('#media-title').textContent();
      const directVideoId = await page.locator('#media-player iframe').getAttribute('src');
      const videoNavigation = page.locator('.media-video-navigation [data-media-next]');
      await videoNavigation.scrollIntoViewIfNeeded();
      await page.waitForTimeout(450);
      const beforeNavigation = await page.evaluate(() => scrollY);
      await videoNavigation.evaluate((node) => node.click());
      await page.waitForTimeout(350);
      const afterNavigation = await page.evaluate(() => scrollY);
      const nextVideoTitle = await page.locator('#media-title').textContent();
      await page.locator('#media-watch').click();
      await page.waitForTimeout(250);
      const watchVideoVisible = await page.locator('#media-player').evaluate((node) => { const rect = node.getBoundingClientRect(); return rect.top < window.innerHeight && rect.bottom > 0; });
      await page.screenshot({ path: path.join(__dirname, '../../docs/whb-review-2026-09-10/media-controls-' + viewport.width + '.png'), fullPage: false });
      const galleryImageBefore = await page.locator('#media-gallery-image').getAttribute('src');
      await page.locator('[data-gallery-next]').click();
      const galleryImageAfter = await page.locator('#media-gallery-image').getAttribute('src');
      const activeGalleryIndex = await page.locator('#media-gallery-thumbs .media-thumb.is-active').getAttribute('data-gallery-index');
      results.push({ viewport, videoThumbCount, galleryThumbCount, galleryCountText, videoThumbBox, firstVideoThumbBox, videoPlayerBox, aiGalleryImages, musicVisible, audioCount, roles, watchHref, initialVideo, directVideoTitle, directVideoId, nextVideoTitle, watchVideoVisible, navigationScrollDelta: afterNavigation - beforeNavigation, galleryImageChanged: galleryImageBefore !== galleryImageAfter, activeGalleryIndex, initialScroll, horizontalOverflow, errors });
      await context.close();
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(__dirname, '../../docs/whb-review-2026-09-10/media-controls-results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  const failed = results.some((result) => result.videoThumbCount !== 22 || result.galleryThumbCount !== 32 || result.aiGalleryImages.length || !result.musicVisible || result.audioCount !== '32' || result.watchHref !== '#media-player' || result.directVideoTitle === result.initialVideo || !result.directVideoId?.includes('youtube.com/embed/') || result.directVideoId?.includes('youtube-nocookie') || !result.watchVideoVisible || result.navigationScrollDelta !== 0 || !result.galleryImageChanged || result.activeGalleryIndex !== '1' || result.horizontalOverflow || result.errors.length);
  if (failed) process.exitCode = 1;
})().catch((error) => { console.error(error); process.exitCode = 1; });
