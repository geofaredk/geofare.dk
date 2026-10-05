import { expect, test, type Page } from '@playwright/test';
import { withContrastTools, type ContrastTools } from './support/contrast';
import { tabKey } from './support/keyboard';

/**
 * The keyboard walk: Tab from the top of the page to the end, and at every stop check that
 * the focused element shows a ring, is on screen and is not hidden under the sticky header.
 */

interface Stop {
  name: string;
  outline: string;
  width: number;
  top: number;
  bottom: number;
  headerBottom: number;
  viewport: number;
  /** Contrast of the ring against what it is drawn on (WCAG 1.4.11 asks for 3:1). */
  ringContrast: number;
  /** Inside the blue section, where the ring is cream. */
  onBlue: boolean;
}

const stop = (page: Page) =>
  page.evaluate((): Stop | null => {
    const element = document.activeElement;
    if (!element || element === document.body) return null;
    // A lab card's link draws its ring round the whole card, on the box stretched over it.
    const own = getComputedStyle(element);
    const style = own.outlineStyle === 'none' ? getComputedStyle(element, '::after') : own;
    const { rgba, over, ratio, backgroundOf } = (window as unknown as { contrast: ContrastTools }).contrast;
    // The ring is drawn outside the element (outline-offset 3px), on its parent's background.
    const behind = backgroundOf(element.parentElement ?? document.body);
    const ring = over(rgba(style.outlineColor), behind);
    const box = element.getBoundingClientRect();
    const header = document.querySelector('header')!.getBoundingClientRect();
    const sticky = getComputedStyle(document.querySelector('header')!).position === 'sticky';
    return {
      name: `${element.tagName.toLowerCase()} “${(element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40) || element.getAttribute('aria-label') || element.querySelector('img')?.alt}”`,
      outline: `${style.outlineStyle} ${style.outlineColor}`,
      width: parseFloat(style.outlineWidth),
      top: box.top,
      bottom: box.bottom,
      // Only the sticky header can cover something; it covers neither itself nor the skip link, which sits above it.
      headerBottom: sticky && !element.closest('header, .skip-link') ? header.bottom : 0,
      viewport: innerHeight,
      ringContrast: ratio(ring, behind),
      onBlue: !!element.closest('#approach'),
    };
  });

async function walk(page: Page, key: string, limit = 40) {
  await withContrastTools(page);
  const stops: Stop[] = [];
  for (let i = 0; i < limit; i++) {
    await page.keyboard.press(key);
    // Smooth scrolling brings the element into view over a few frames: wait until it rests.
    let last = -1;
    await expect
      .poll(async () => {
        const y = await page.evaluate(() => scrollY);
        const still = y === last;
        last = y;
        return still;
      }, { intervals: [100] })
      .toBe(true);
    const at = await stop(page);
    if (!at || stops.some((s) => s.name === at.name && s.top === at.top)) break;
    stops.push(at);
  }
  return stops;
}

/**
 * Chrome and Safari scroll a focused element fully into view. Firefox scrolls only when the
 * element is out of view, so a row that already peeks in at the bottom edge stays there,
 * partly below the window, its ring visible on three sides; for Firefox, ask for 20 px on screen.
 */
function expectRings(stops: Stop[], browserName: string) {
  for (const s of stops) {
    expect(s.outline, `${s.name} has a solid ring`).toMatch(/^solid /);
    expect(s.width, `${s.name} ring width`).toBeGreaterThanOrEqual(2);
    expect(s.ringContrast, `${s.name} ring contrast`).toBeGreaterThanOrEqual(3);
    expect(s.top, `${s.name} is not under the header`).toBeGreaterThanOrEqual(s.headerBottom - 0.5);
    if (browserName === 'firefox') expect(s.top, `${s.name} is on screen`).toBeLessThanOrEqual(s.viewport - 20);
    else expect(s.bottom, `${s.name} is on screen`).toBeLessThanOrEqual(s.viewport + 0.5);
  }
}

test('at 1280 every stop of the Tab order shows a ring, in view and clear of the header', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const stops = await walk(page, tabKey(browserName));
  console.log(`[focus] ${browserName} 1280: ${stops.length} stops: ${stops.map((s) => s.name).join(' → ')}`);
  const names = stops.map((s) => s.name);
  // Skip link, home, four links, call to action, two hero buttons, seven sector rows, imprint.
  for (const expected of ['Skip to content', 'Services', 'Who we work with', 'See what we do', 'Municipalities', 'Energy & utilities', 'Imprint']) {
    expect(names.some((name) => name.includes(expected)), `reaches ${expected}`).toBe(true);
  }
  expect(stops.length).toBeGreaterThanOrEqual(17);
  expectRings(stops, browserName);
  console.log(`[focus] ${browserName} 1280: lowest ring contrast ${Math.min(...stops.map((s) => s.ringContrast)).toFixed(2)}:1`);
  // The blue section holds nothing focusable today; its cream ring (on-accent) is ready for when it does.
  expect(stops.filter((s) => s.onBlue)).toEqual([]);
  expect(await page.locator('#approach').locator('a[href], button, summary, input, select, textarea, [tabindex]').count()).toBe(0);
});

test('at 360 with the menu open every stop shows a ring, and the walk continues into the page', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).click();
  const stops = await walk(page, tabKey(browserName));
  console.log(`[focus] ${browserName} 360: ${stops.length} stops: ${stops.map((s) => s.name).join(' → ')}`);
  const names = stops.map((s) => s.name);
  for (const expected of ['Services', 'About', 'How we work', 'Who we work with', 'Get in touch', 'Energy & utilities', 'Imprint']) {
    expect(names.some((name) => name.includes(expected)), `reaches ${expected}`).toBe(true);
  }
  expectRings(stops, browserName);
});
