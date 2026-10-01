// Full-page screenshots of the home page at the brief's four widths, in one browser engine.
// Usage: node scripts/screenshots.mjs <chrome|firefox|webkit> <base URL> <output dir>
// The hero animation runs while the page loads and is then paused, so every shot shows
// the settled headline; the first sector row is open, as on load.
import { mkdirSync } from 'node:fs';
import { chromium, firefox, webkit } from '@playwright/test';

const [engine = 'chrome', base = 'http://localhost:8080', out = 'docs/screenshots'] = process.argv.slice(2);
const launch = { chrome: () => chromium.launch({ channel: 'chrome' }), firefox: () => firefox.launch(), webkit: () => webkit.launch() }[engine];
if (!launch) throw new Error(`unknown engine ${engine}`);
mkdirSync(out, { recursive: true });

const browser = await launch();
for (const width of [360, 768, 1280, 1920]) {
  const page = await browser.newPage({ viewport: { width, height: width < 768 ? 740 : 900 } });
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.getByRole('button', { name: 'Pause animation' }).click();
  await page.waitForTimeout(600);
  const file = `${out}/home-${width}${engine === 'chrome' ? '' : `-${engine}`}.png`;
  await page.screenshot({ path: file, fullPage: true });
  console.log(file);
  await page.close();
}
await browser.close();
