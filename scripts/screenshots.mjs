// Screenshots of the home page, for checking against the brief's design direction.
//
//   node scripts/screenshots.mjs page  <chrome|firefox|webkit> <base URL> <output dir> [widths]
//   node scripts/screenshots.mjs focus <base URL> <output dir>
//
// page:  full-page shots, default widths 360 and 1280 (the two the brief asks for); pass e.g.
//        360,768,1280,1920 for more. The page is shot with reduced motion, so the headline shows its
//        final sentence over one still frame of the field; the first sector row is open, as on load.
//        Files: home-<width>.png in Chrome, home-<width>-<engine>.png otherwise.
// focus: close-ups of the keyboard focus ring, in Chrome at 1280 (and the menu at 360):
//        focus-nav-link, -button, -sector-summary, -menu-link-360, and
//        focus-contact-block-sample: the contact rows are plain text while they hold
//        placeholders, so for that one shot the email placeholder is swapped, in the browser
//        only, for a sample address to show the focus state a real address will get.
import { mkdirSync } from 'node:fs';
import { chromium, firefox, webkit } from '@playwright/test';

const [mode, ...args] = process.argv.slice(2);
const engines = { chrome: () => chromium.launch({ channel: 'chrome' }), firefox: () => firefox.launch(), webkit: () => webkit.launch() };

if (mode === 'page') {
  const [engine = 'chrome', base = 'http://localhost:8080', out = 'docs/screenshots', widths = '360,1280'] = args;
  if (!engines[engine]) throw new Error(`unknown engine ${engine}`);
  mkdirSync(out, { recursive: true });
  const browser = await engines[engine]();
  for (const width of widths.split(',').map(Number)) {
    const page = await browser.newPage({ viewport: { width, height: width < 768 ? 740 : 900 } });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const file = `${out}/home-${width}${engine === 'chrome' ? '' : `-${engine}`}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log(file);
    await page.close();
  }
  await browser.close();
} else if (mode === 'focus') {
  const [base = 'http://localhost:8080', out = 'docs/screenshots'] = args;
  mkdirSync(out, { recursive: true });
  const browser = await engines.chrome();

  /** Opens the page, optionally prepares it, presses Tab `tabs` times and shoots the focused element with a margin. */
  async function shot(name, { width = 1280, motion = 'reduce', prepare, tabs }) {
    const page = await browser.newPage({ viewport: { width, height: width < 768 ? 740 : 800 } });
    // Reduced motion: instant scrolling and a still headline.
    await page.emulateMedia({ reducedMotion: motion });
    await page.goto(base);
    await page.evaluate(() => document.fonts.ready);
    if (prepare) await prepare(page);
    for (let i = 0; i < tabs; i++) await page.keyboard.press('Tab');
    await page.waitForTimeout(400);
    const box = await page.evaluate(() => {
      const r = document.activeElement.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, text: document.activeElement.textContent.trim() };
    });
    const pad = 24;
    const x = Math.max(0, box.x - pad);
    const clip = { x, y: Math.max(0, box.y - pad), width: Math.min(width - x, box.width + 2 * pad), height: box.height + 2 * pad };
    await page.screenshot({ path: `${out}/focus-${name}.png`, clip });
    console.log(`${out}/focus-${name}.png: ${box.text}`);
    await page.close();
  }

  await shot('nav-link', { tabs: 3 });
  await shot('button', { tabs: 8 });
  await shot('sector-summary', { tabs: 12 });
  await shot('contact-block-sample', {
    tabs: 1,
    prepare: (page) =>
      page.evaluate(() => {
        const span = document.querySelector('#contact span.contact__block');
        const link = document.createElement('a');
        for (const attribute of span.attributes) link.setAttribute(attribute.name, attribute.value);
        link.href = 'mailto:name@example.com';
        link.textContent = 'name@example.com';
        span.replaceWith(link);
        // Start the Tab walk on the last sector row, just before the contact rows.
        [...document.querySelectorAll('#sectors summary')].at(-1).focus();
      }),
  });
  await shot('menu-link-360', { width: 360, tabs: 2, prepare: (page) => page.click('[data-menu-toggle]') });
  await browser.close();
} else {
  console.error('usage: node scripts/screenshots.mjs page <engine> <base URL> <out> [widths] | focus <base URL> <out>');
  process.exit(2);
}
