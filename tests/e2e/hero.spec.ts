import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const copy = JSON.parse(readFileSync(new URL('../fixtures/copy.en.json', import.meta.url), 'utf8'));
const endings: string[] = copy.hero.endings;
const FINAL = endings.at(-1)!;
const INTERVAL = 3000;

test.use({ viewport: { width: 1280, height: 800 } });

/** A page whose timers, animation frames and clock only move when the test says so. */
async function openWithClock(page: Page) {
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
}

/** Counts every frame the field draws: the driver clears the canvas exactly once per draw. */
async function countDraws(page: Page) {
  await page.addInitScript(() => {
    const counter = window as unknown as { draws: number };
    counter.draws = 0;
    const clearRect = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      counter.draws++;
      return clearRect.apply(this, args);
    };
  });
}

const draws = (page: Page) => page.evaluate(() => (window as unknown as { draws: number }).draws);
const canvas = (page: Page) => page.locator('#top canvas');
const activeEnding = (page: Page) => page.locator('.hero__ending[data-active]');
const shownEndings = (page: Page) => page.locator('.hero__ending').filter({ visible: true });
const SENTENCE = `${copy.hero.fixed} ${FINAL}`;
const finalHeading = (page: Page) => page.getByRole('heading', { level: 1, name: SENTENCE, exact: true });
/** The h1's whole text content in the live DOM (whitespace collapsed), as a crawler that ignores ARIA and CSS reads it. */
const expectHeadlineText = (page: Page) => expect(page.locator('h1')).toHaveText(SENTENCE, { useInnerText: false });

async function expectEnding(page: Page, ending: string) {
  await expect(activeEnding(page)).toHaveText(ending);
  // The outgoing ending fades in real time; once it has gone, exactly one is on show.
  await expect(shownEndings(page)).toHaveText([ending]);
  await expect(activeEnding(page)).toHaveCSS('opacity', '1');
}

/** The strongest line pixel (alpha 0..255) behind each piece of hero text and each control, and anywhere at all. */
const strongestLines = (page: Page) =>
  page.evaluate(() => {
    const field = document.querySelector<HTMLCanvasElement>('#top canvas')!;
    const box = field.getBoundingClientRect();
    const scale = field.width / box.width;
    const ctx = field.getContext('2d')!;
    const maxAlpha = (left: number, top: number, right: number, bottom: number) => {
      const x = Math.max(0, Math.floor((left - box.left) * scale));
      const y = Math.max(0, Math.floor((top - box.top) * scale));
      const w = Math.min(field.width, Math.ceil((right - box.left) * scale)) - x;
      const h = Math.min(field.height, Math.ceil((bottom - box.top) * scale)) - y;
      if (w <= 0 || h <= 0) throw new Error('nothing to sample');
      const { data } = ctx.getImageData(x, y, w, h);
      let max = 0;
      for (let i = 3; i < data.length; i += 4) max = Math.max(max, data[i]);
      return max;
    };
    const textRect = (element: Element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return range.getBoundingClientRect();
    };
    const visible = (element: Element) => getComputedStyle(element).visibility !== 'hidden';
    const areas: Record<string, DOMRect> = {
      fixed: textRect(document.querySelector('.hero__fixed')!),
      sub: document.querySelector('.hero__sub')!.getBoundingClientRect(),
      primary: document.querySelector('.hero__actions a:nth-of-type(1)')!.getBoundingClientRect(),
      secondary: document.querySelector('.hero__actions a:nth-of-type(2)')!.getBoundingClientRect(),
      pause: document.querySelector('.hero__pause')!.getBoundingClientRect(),
    };
    [...document.querySelectorAll('.hero__ending')].filter(visible).forEach((ending, i) => (areas[`ending ${i}`] = textRect(ending)));
    const behind: Record<string, number> = {};
    // Inset by 4 px: the outermost pixels of a box hold no glyphs.
    for (const [name, r] of Object.entries(areas)) behind[name] = maxAlpha(r.left + 4, r.top + 4, r.right - 4, r.bottom - 4);
    return { behind, anywhere: maxAlpha(box.left, box.top, box.right, box.bottom) };
  });

async function expectClear(page: Page) {
  const { behind, anywhere } = await strongestLines(page);
  // The field is there …
  expect(anywhere).toBeGreaterThan(0);
  // … but not behind anything that is read or pressed.
  expect(Object.keys(behind)).toEqual(expect.arrayContaining(['fixed', 'sub', 'primary', 'secondary', 'pause', 'ending 0']));
  expect(Object.entries(behind).filter(([, alpha]) => alpha > 0)).toEqual([]);
}

test.describe('headline rotation', () => {
  test('endings appear in the order of the brief and stop on the last one', async ({ page }) => {
    await openWithClock(page);
    await expect(finalHeading(page)).toBeVisible();
    await expectHeadlineText(page);
    for (const [i, ending] of endings.entries()) {
      if (i) await page.clock.runFor(INTERVAL);
      // Mid-change, and again once the new ending has settled.
      await expectHeadlineText(page);
      await expectEnding(page, ending);
      await expect(finalHeading(page)).toBeVisible();
      await expectHeadlineText(page);
    }
    expect(await activeEnding(page).textContent()).toBe(FINAL);

    await page.clock.runFor(20_000);
    await expectEnding(page, FINAL);
    await expect(finalHeading(page)).toBeVisible();
    await expectHeadlineText(page);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  });

  test('the rotating endings live beside the h1, hidden from assistive tech, all five in order', async ({ page }) => {
    await openWithClock(page);
    const rotator = page.locator('#top .hero__rotator');
    await expect(rotator).toHaveAttribute('aria-hidden', 'true');
    await expect(rotator.locator('.hero__ending')).toHaveText(endings);
    await expect(page.locator('h1 .hero__rotator, h1 .hero__ending, h1 [aria-hidden]')).toHaveCount(0);
  });

  for (const viewport of [
    { width: 360, height: 740 },
    { width: 1280, height: 800 },
  ]) {
    test(`rotation causes no layout movement at ${viewport.width}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await openWithClock(page);
      const rects = () =>
        page.evaluate(() =>
          // The headline and its ending slot (neither may change size), then everything after them.
          ['.hero__title', '.hero__rotator', '.hero__sub', '.hero__actions a:nth-of-type(1)', '.hero__actions a:nth-of-type(2)', '#services'].map((selector) => {
            const { x, y, width, height } = document.querySelector(selector)!.getBoundingClientRect();
            return { selector, x, y, width, height };
          }),
        );
      const before = await rects();
      expect(before.every((rect) => rect.width > 0 && rect.height > 0)).toBe(true);
      for (const ending of endings.slice(1)) {
        await page.clock.runFor(INTERVAL);
        await expectEnding(page, ending);
        expect(await rects()).toEqual(before);
      }
    });
  }

  for (const viewport of [
    { width: 360, height: 740 },
    { width: 1280, height: 800 },
  ]) {
    test(`the rotating layer stands exactly where the h1's final line stands at ${viewport.width}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await openWithClock(page);
      await page.clock.runFor(INTERVAL * 4);
      await expectEnding(page, FINAL);

      /** Where a piece of headline text is drawn, and in what type. */
      const drawn = (selector: string) =>
        page.evaluate((selector) => {
          const element = document.querySelector(selector)!;
          const range = document.createRange();
          range.selectNodeContents(element);
          const { x, y, width, height } = range.getBoundingClientRect();
          const style = getComputedStyle(element);
          const type = [style.fontFamily, style.fontSize, style.fontWeight, style.letterSpacing, style.lineHeight, style.color, style.textWrap];
          return { text: element.textContent, x, y, width, height, type };
        }, selector);

      const rotating = await drawn('.hero__ending[data-active]');
      // The same page as a reduced-motion visitor gets it: the h1's own final line, no rotator.
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(page.locator('.hero__final')).toBeVisible();
      await expect(shownEndings(page)).toHaveCount(0);
      expect(rotating).toEqual(await drawn('.hero__final'));
      expect(rotating.width).toBeGreaterThan(100);
    });
  }

  test('the fixed part stays in place and every ending starts on the line below it', async ({ page }) => {
    await openWithClock(page);
    const fixed = page.locator('.hero__fixed');
    const before = (await fixed.boundingBox())!;
    for (const [i, ending] of endings.entries()) {
      if (i) await page.clock.runFor(INTERVAL);
      await expectEnding(page, ending);
      const box = (await activeEnding(page).boundingBox())!;
      // To a hundredth of a pixel: Firefox's layout units round the sum differently in the last float digits.
      expect(box.x).toBeCloseTo(before.x, 2);
      expect(box.y).toBeCloseTo(before.y + before.height, 2);
      expect(await fixed.boundingBox()).toEqual(before);
    }
    await expect(fixed).toHaveText(copy.hero.fixed);
  });
});

test.describe('pause control', () => {
  test('pauses and resumes the field, and settles the headline on the final ending', async ({ page }) => {
    await openWithClock(page);
    await expect(canvas(page)).toHaveAttribute('data-state', 'running');
    await expect(canvas(page)).toHaveAttribute('aria-hidden', 'true');
    await page.clock.runFor(INTERVAL);
    await expectEnding(page, endings[1]);

    await page.getByRole('button', { name: 'Pause animation' }).click();
    await expect(canvas(page)).toHaveAttribute('data-state', 'paused');
    await expect(page.getByRole('button', { name: 'Play animation' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pause animation' })).toHaveCount(0);
    await expectHeadlineText(page);
    await expectEnding(page, FINAL);
    await expectHeadlineText(page);

    await page.getByRole('button', { name: 'Play animation' }).click();
    await expect(canvas(page)).toHaveAttribute('data-state', 'running');
    await expect(page.getByRole('button', { name: 'Pause animation' })).toBeVisible();
    // Playing again resumes the field only; the headline has finished.
    await page.clock.runFor(INTERVAL * 2);
    await expectEnding(page, FINAL);
  });

  test('stops all drawing while paused', async ({ page }) => {
    await countDraws(page);
    await page.goto('/');
    await page.getByRole('button', { name: 'Pause animation' }).click();
    await page.waitForTimeout(300);
    const paused = await draws(page);
    await page.waitForTimeout(700);
    expect(await draws(page)).toBe(paused);
  });

  for (const viewport of [
    { width: 360, height: 740 },
    { width: 1280, height: 800 },
  ]) {
    test(`is a target of at least 44 px at ${viewport.width}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      const box = (await page.getByRole('button', { name: 'Pause animation' }).boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    });
  }
});

test.describe('line field', () => {
  test('draws at no more than 30 frames per second', async ({ page }) => {
    await countDraws(page);
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    const sample = () => page.evaluate(() => ({ draws: (window as unknown as { draws: number }).draws, at: performance.now() }));
    const start = await sample();
    await page.waitForTimeout(3000);
    const end = await sample();
    const perSecond = ((end.draws - start.draws) * 1000) / (end.at - start.at);
    expect(perSecond).toBeLessThanOrEqual(32);
    expect(perSecond).toBeGreaterThanOrEqual(10);
  });

  test('sleeps while the tab is hidden', async ({ page }) => {
    await countDraws(page);
    await page.goto('/');
    await expect.poll(() => draws(page)).toBeGreaterThan(2);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    const hidden = await draws(page);
    await page.waitForTimeout(500);
    expect(await draws(page)).toBe(hidden);
  });

  for (const viewport of [
    { width: 360, height: 740 },
    { width: 1280, height: 800 },
  ]) {
    test(`no line sits behind text or controls at ${viewport.width}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await openWithClock(page);

      await page.clock.runFor(100);
      await expectClear(page);
      for (const ending of endings.slice(1)) {
        await page.clock.runFor(INTERVAL);
        // Mid-change both endings are on show; both must be clear.
        await expectClear(page);
        await expectEnding(page, ending);
        await page.clock.runFor(100);
        await expectClear(page);
      }
      // Long after the rotation, when the quiet zone has settled around the final sentence.
      await page.clock.runFor(5000);
      await expectClear(page);
    });
  }

  test('pausing mid-rotation leaves no line behind the final sentence', async ({ page }) => {
    // On a phone "when it matters." is wider than "when rivers / overflow.", so the zone has to grow.
    await page.setViewportSize({ width: 360, height: 740 });
    await openWithClock(page);
    await page.clock.runFor(INTERVAL);
    await expectEnding(page, endings[1]);
    await page.clock.runFor(2000);
    await expectClear(page);

    await page.getByRole('button', { name: 'Pause animation' }).click();
    await expect(canvas(page)).toHaveAttribute('data-state', 'paused');
    await expectClear(page);
    await expectEnding(page, FINAL);
    await expectClear(page);
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('shows the final sentence and one static frame, with nothing to pause', async ({ page }) => {
    await countDraws(page);
    await page.goto('/');
    await expect(page.locator('.hero__final')).toBeVisible();
    await expect(page.locator('.hero__final')).toHaveText(FINAL);
    await expect(shownEndings(page)).toHaveCount(0);
    await expect(finalHeading(page)).toBeVisible();
    await expectHeadlineText(page);
    await expect(canvas(page)).toHaveAttribute('data-state', 'static');
    await expect(page.locator('.hero__pause')).toBeHidden();

    // A late web font may move a quiet zone and cause one honest redraw, so settle first.
    await page.evaluate(() => document.fonts.ready);
    const settled = await draws(page);
    expect(settled).toBeGreaterThanOrEqual(1);
    await page.waitForTimeout(1000);
    expect(await draws(page)).toBe(settled);
    await expect(page.locator('.hero__final')).toBeVisible();
  });
});
