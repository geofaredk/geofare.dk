import { expect, test, type Page } from '@playwright/test';
import { withContrastTools, type ContrastTools } from './support/contrast';

/**
 * WCAG contrast of every piece of visible text on the home page, measured in the browser:
 * the text's computed colour against the colour actually behind it (the first opaque
 * background found walking up the tree, with any translucent layers on the way blended in).
 * The brief asks for 4.5:1 everywhere, so large text gets no 3:1 allowance here.
 */

const MINIMUM = 4.5;

interface Sample {
  text: string;
  where: string;
  colour: string;
  background: string;
  ratio: number;
}

/** Every visible text node (and every list marker) with its contrast ratio. */
const measure = async (page: Page): Promise<Sample[]> => {
  await withContrastTools(page);
  return page.evaluate(() => {
    const { rgba, over, ratio, css, backgroundOf, opacityOf } = (window as unknown as { contrast: ContrastTools }).contrast;

    /** Visually hidden (the .sr-only pattern): a 1 px clipping box somewhere up the tree. */
    const clippedAway = (element: Element) => {
      for (let node: Element | null = element; node; node = node.parentElement) {
        const box = node.getBoundingClientRect();
        if (box.width <= 1 && box.height <= 1 && getComputedStyle(node).overflow !== 'visible') return true;
      }
      return false;
    };

    const describe = (element: Element) => {
      const section = element.closest('section[id], header, footer');
      const name = section ? (section.id ? `#${section.id}` : section.tagName.toLowerCase()) : 'body';
      return `${name} ${element.tagName.toLowerCase()}${element.className && typeof element.className === 'string' ? `.${element.className.split(' ')[0]}` : ''}`;
    };

    const sample = (element: Element, text: string, colourValue: string): Sample => {
      const colour = rgba(colourValue);
      colour[3] *= opacityOf(element);
      const background = backgroundOf(element);
      const seen = over(colour, background);
      return { text: text.slice(0, 60), where: describe(element), colour: css(seen), background: css(background), ratio: ratio(seen, background) };
    };

    const samples: Sample[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent!.replace(/\s+/g, ' ').trim();
      const element = node.parentElement;
      if (!text || !element || element.closest('script, style, noscript, template')) continue;
      if (!element.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
      range.selectNodeContents(node);
      const box = range.getBoundingClientRect();
      if (box.width === 0 || box.height === 0 || clippedAway(element)) continue;
      samples.push(sample(element, text, getComputedStyle(element).color));
    }
    // List markers are text too (the sector bullets are dashes in accent).
    for (const item of document.querySelectorAll('li')) {
      if (!item.checkVisibility({ visibilityProperty: true })) continue;
      const marker = getComputedStyle(item, '::marker');
      if (getComputedStyle(item).listStyleType === 'none' || !marker.content || marker.content === 'none') continue;
      samples.push(sample(item, `::marker of “${item.textContent!.trim().slice(0, 40)}”`, marker.color));
    }
    return samples;
  });
};

function report(samples: Sample[], label: string) {
  expect(samples.length, `${label}: found text to measure`).toBeGreaterThan(100);
  const lowest = [...samples].sort((a, b) => a.ratio - b.ratio)[0];
  const failing = samples.filter((s) => s.ratio < MINIMUM).map((s) => `${s.ratio.toFixed(2)} ${s.where} “${s.text}” ${s.colour} on ${s.background}`);
  test.info().annotations.push({
    type: 'contrast',
    description: `${label}: ${samples.length} text samples, minimum ${lowest.ratio.toFixed(2)}:1 (“${lowest.text}”, ${lowest.where}, ${lowest.colour} on ${lowest.background})`,
  });
  console.log(`[contrast] ${test.info().project.name} ${label}: ${samples.length} samples, min ${lowest.ratio.toFixed(2)}:1 — ${lowest.where} “${lowest.text}”`);
  expect(failing).toEqual([]);
}

/** Opens every sector row and waits until the rows have finished growing. */
const openAllSectors = async (page: Page) => {
  await page.evaluate(() => document.querySelectorAll('details').forEach((details) => (details.open = true)));
  await settle(page);
};

/** Waits for every CSS transition and animation (row growth, headline fades) to finish. */
const settle = (page: Page) =>
  page.evaluate(() => Promise.all(document.getAnimations().map((animation) => animation.finished.catch(() => undefined))));

for (const viewport of [
  { width: 360, height: 740 },
  { width: 1280, height: 800 },
]) {
  test.describe(`contrast at ${viewport.width}`, () => {
    test.use({ viewport });

    test('every text on the page reaches 4.5:1, with every sector open (reduced motion)', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      await openAllSectors(page);
      await expect(page.locator('#sectors details[open]')).toHaveCount(7);
      report(await measure(page), 'reduced motion, all sectors open');
    });

    test('every text reaches 4.5:1 with the animation running, then paused', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      await openAllSectors(page);
      // Running: the first ending is on show over the moving field.
      report(await measure(page), 'animation running');
      await page.getByRole('button', { name: 'Pause animation' }).click();
      await expect(page.getByRole('button', { name: 'Play animation' })).toBeVisible();
      // Pausing settles the headline on its last ending; let the outgoing one finish fading.
      await settle(page);
      report(await measure(page), 'animation paused');
    });

    test('buttons and links keep 4.5:1 when hovered', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');
      const targets = page.locator('main a.button, main a.contact__block, footer a, header nav a:visible');
      const count = await targets.count();
      expect(count).toBeGreaterThan(2);
      let lowest = Infinity;
      for (let i = 0; i < count; i++) {
        const target = targets.nth(i);
        await target.hover();
        // Let the 120 ms colour transitions finish.
        await settle(page);
        const label = ((await target.textContent()) ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);
        const samples = (await measure(page)).filter((s) => s.text === label);
        expect(samples.length, `found the hovered text of target ${i}`).toBeGreaterThan(0);
        for (const s of samples) {
          lowest = Math.min(lowest, s.ratio);
          expect(s.ratio, `${s.where} “${s.text}” hovered: ${s.colour} on ${s.background}`).toBeGreaterThanOrEqual(MINIMUM);
        }
      }
      console.log(`[contrast] ${test.info().project.name} hover at ${viewport.width}: ${count} targets, min ${lowest.toFixed(2)}:1`);
    });
  });
}

test('the open mobile menu reaches 4.5:1', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  const samples = (await measure(page)).filter((s) => s.where.startsWith('header'));
  expect(samples.length).toBeGreaterThanOrEqual(6);
  const failing = samples.filter((s) => s.ratio < MINIMUM).map((s) => `${s.ratio.toFixed(2)} ${s.where} “${s.text}”`);
  console.log(`[contrast] ${test.info().project.name} open menu: ${samples.length} samples, min ${Math.min(...samples.map((s) => s.ratio)).toFixed(2)}:1`);
  expect(failing).toEqual([]);
});
