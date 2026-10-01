import { expect, test, type Page } from '@playwright/test';

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
const measure = (page: Page): Promise<Sample[]> =>
  page.evaluate(() => {
    // Resolve any CSS colour (rgb(), color(srgb …), color-mix() results) through a 1×1 canvas.
    const probe = document.createElement('canvas');
    probe.width = probe.height = 1;
    const ctx = probe.getContext('2d', { willReadFrequently: true })!;
    const rgba = (colour: string): [number, number, number, number] => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = '#000';
      ctx.fillStyle = colour;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      return [r, g, b, a / 255];
    };
    const over = (top: number[], below: number[]) =>
      [0, 1, 2].map((i) => top[i] * top[3] + below[i] * (1 - top[3])).concat(1) as [number, number, number, number];
    const luminance = ([r, g, b]: number[]) => {
      const lin = (c: number) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    };
    const ratio = (a: number[], b: number[]) => {
      const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (l1 + 0.05) / (l2 + 0.05);
    };
    const css = (c: number[]) => `rgb(${c.slice(0, 3).map(Math.round).join(' ')})`;

    /** The colour behind an element: translucent backgrounds blended down to the first opaque one. */
    const backgroundOf = (element: Element) => {
      const layers: number[][] = [];
      for (let node: Element | null = element; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (style.backgroundImage !== 'none') throw new Error(`background image behind text at ${node.tagName}.${node.className}`);
        const colour = rgba(style.backgroundColor);
        if (colour[3] > 0) layers.push(colour);
        if (colour[3] === 1) break;
      }
      // Below everything is the canvas, white unless the root paints it.
      let result: number[] = [255, 255, 255, 1];
      for (const layer of layers.reverse()) result = over(layer, result);
      return result;
    };

    /** Product of the element's and its ancestors' opacity: a faded parent fades the text. */
    const opacityOf = (element: Element) => {
      let opacity = 1;
      for (let node: Element | null = element; node; node = node.parentElement) opacity *= parseFloat(getComputedStyle(node).opacity);
      return opacity;
    };

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
        // Colour transitions are 120 ms.
        await page.waitForTimeout(200);
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
