import { expect, test, type Page } from '@playwright/test';

// Windows High Contrast and other forced-colour modes replace author background colours.
// The sector sign and the contact rule are drawn as backgrounds, so they need system colours.
test.use({ forcedColors: 'active', viewport: { width: 1280, height: 900 } });

/** The painted background of a pseudo-element, and whether it has a size to be seen at. */
const paint = (page: Page, selector: string, pseudo: '::before' | '::after') =>
  page.locator(selector).first().evaluate((element, pseudo) => {
    const style = getComputedStyle(element, pseudo);
    return {
      background: style.backgroundColor,
      display: style.display,
      size: (parseFloat(style.width) || 0) + (parseFloat(style.height) || 0),
    };
  }, pseudo);

const isTransparent = (colour: string) => colour === 'transparent' || /rgba\(.*,\s*0\)$/.test(colour);

/** The page's own background in forced colours (the system Canvas colour where the browser forces colours). */
const canvas = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

/** Painted, and in a colour other than the page behind it: forced colours paint backgrounds as Canvas. */
const visible = (colour: string, behind: string) => !isTransparent(colour) && colour !== behind;

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  const forced = await page.evaluate(() => matchMedia('(forced-colors: active)').matches);
  test.skip(!forced, 'this browser cannot emulate forced colours');
});

test('the sector plus and minus stay visible in forced colours', async ({ page }) => {
  // The first row is open (minus: one bar), the second closed (plus: two bars).
  for (const [row, bars] of [
    [0, ['::before']],
    [1, ['::before', '::after']],
  ] as const) {
    for (const bar of bars) {
      const drawn = await paint(page, `#sectors details:nth-of-type(${row + 1}) .sector__sign`, bar);
      expect(drawn.display).not.toBe('none');
      expect(drawn.size).toBeGreaterThan(0);
      expect(visible(drawn.background, await canvas(page)), `row ${row + 1} ${bar} is painted (${drawn.background})`).toBe(true);
    }
  }
});

test('the rule under each contact detail stays visible in forced colours', async ({ page }) => {
  const blocks = page.locator('#contact .contact__block');
  await expect(blocks).toHaveCount(2);
  for (let i = 0; i < 2; i++) {
    const drawn = await blocks.nth(i).evaluate((element) => getComputedStyle(element, '::after').backgroundColor);
    expect(visible(drawn, await canvas(page)), `contact rule ${i + 1} is painted (${drawn})`).toBe(true);
  }
});
