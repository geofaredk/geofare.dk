import { expect, test, type Page } from '@playwright/test';
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
}

const stop = (page: Page) =>
  page.evaluate((): Stop | null => {
    const element = document.activeElement;
    if (!element || element === document.body) return null;
    const style = getComputedStyle(element);
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
    };
  });

async function walk(page: Page, key: string, limit = 40) {
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

function expectRings(stops: Stop[]) {
  for (const s of stops) {
    expect(s.outline, `${s.name} has a solid ring`).toMatch(/^solid /);
    expect(s.width, `${s.name} ring width`).toBeGreaterThanOrEqual(2);
    expect(s.top, `${s.name} is not under the header`).toBeGreaterThanOrEqual(s.headerBottom - 0.5);
    expect(s.bottom, `${s.name} is on screen`).toBeLessThanOrEqual(s.viewport + 0.5);
  }
}

test('at 1280 every stop of the Tab order shows a ring, in view and clear of the header', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const stops = await walk(page, tabKey(browserName));
  console.log(`[focus] ${browserName} 1280: ${stops.length} stops: ${stops.map((s) => s.name).join(' → ')}`);
  const names = stops.map((s) => s.name);
  // Skip link, home, four links, call to action, two hero buttons, pause, seven sector rows, privacy.
  for (const expected of ['Skip to content', 'Services', 'Who we work with', 'See what we do', 'Pause animation', 'Municipalities', 'Energy & utilities', 'Privacy']) {
    expect(names.some((name) => name.includes(expected)), `reaches ${expected}`).toBe(true);
  }
  expect(stops.length).toBeGreaterThanOrEqual(18);
  expectRings(stops);
});

test('at 360 with the menu open every stop shows a ring, and the walk continues into the page', async ({ page, browserName }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).click();
  const stops = await walk(page, tabKey(browserName));
  console.log(`[focus] ${browserName} 360: ${stops.length} stops: ${stops.map((s) => s.name).join(' → ')}`);
  const names = stops.map((s) => s.name);
  for (const expected of ['Services', 'About', 'How we work', 'Who we work with', 'Get in touch', 'Pause animation', 'Energy & utilities', 'Privacy']) {
    expect(names.some((name) => name.includes(expected)), `reaches ${expected}`).toBe(true);
  }
  expectRings(stops);
});
