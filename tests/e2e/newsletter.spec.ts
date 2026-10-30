import { expect, test, type Page } from '@playwright/test';
import { site } from '../../src/config/site';

/**
 * The newsletter box: a round button in the lower right corner, which opens into a card once
 * the visitor has scrolled past the hero, and folds again by its X.
 */
const box = (page: Page) => page.locator('#newsletter');
const toggle = (page: Page) => box(page).locator('> summary');

/** How far the element's right and bottom edges are from the window's. */
const corner = (page: Page, selector: string) =>
  page.locator(selector).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { right: innerWidth - rect.right, bottom: innerHeight - rect.bottom, width: rect.width, height: rect.height };
  });

/** Scrolls to just below the hero. */
const scrollPastHero = (page: Page) =>
  page.evaluate(() => scrollTo({ top: document.querySelector('#top')!.getBoundingClientRect().bottom + scrollY + 10, behavior: 'instant' }));

const scrollToTop = (page: Page) => page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 360, height: 740 },
]) {
  test.describe(`at ${viewport.width}`, () => {
    test.use({ viewport });

    test('it starts folded in the lower right corner, outside the main content, and opens once the hero is scrolled past', async ({ page }) => {
      await page.goto('/');
      await expect(box(page)).not.toHaveAttribute('open', '');
      await expect(page.getByRole('complementary', { name: 'Newsletter' })).toBeVisible();
      expect(await box(page).evaluate((element) => element.closest('main'))).toBeNull();
      const bubble = await corner(page, '#newsletter > summary');
      expect(bubble.width).toBeGreaterThanOrEqual(44);
      expect(bubble.height).toBeGreaterThanOrEqual(44);
      expect(bubble.right).toBeGreaterThanOrEqual(16);
      expect(bubble.bottom).toBeGreaterThanOrEqual(16);
      // Halfway down the hero it is still folded.
      await page.evaluate(() => scrollTo({ top: innerHeight / 2, behavior: 'instant' }));
      await page.waitForTimeout(200);
      await expect(box(page)).not.toHaveAttribute('open', '');
      await scrollPastHero(page);
      await expect(box(page)).toHaveAttribute('open', '');
      const at = await corner(page, '#newsletter');
      expect(at.right).toBeGreaterThanOrEqual(16);
      expect(at.right).toBeLessThan(40);
      expect(at.bottom).toBeGreaterThanOrEqual(16);
      expect(at.bottom).toBeLessThan(40);
      expect(at.width).toBeLessThanOrEqual(Math.min(36 * 16, viewport.width - 32));
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      const link = box(page).getByRole('link');
      await expect(link).toHaveCount(1);
      await expect(link).toHaveText('Subscribe to Debrief');
      await expect(link).toHaveAttribute('href', site.newsletter.url);
    });

    test('the X folds it to the round button, and once closed it does not open again by itself', async ({ page }) => {
      await page.goto('/');
      await scrollPastHero(page);
      await expect(box(page)).toHaveAttribute('open', '');
      await expect(toggle(page)).toHaveAccessibleName('Close the newsletter box');
      const x = await corner(page, '#newsletter > summary');
      expect(x.width).toBeGreaterThanOrEqual(44);
      expect(x.height).toBeGreaterThanOrEqual(44);
      await toggle(page).click();
      await expect(box(page)).not.toHaveAttribute('open', '');
      await expect(box(page).locator('.debrief__body')).toBeHidden();
      await expect(toggle(page)).toHaveAccessibleName('Open the newsletter box');
      await scrollToTop(page);
      await scrollPastHero(page);
      await page.waitForTimeout(300);
      await expect(box(page)).not.toHaveAttribute('open', '');
      // The round button still opens it.
      await toggle(page).click();
      await expect(box(page)).toHaveAttribute('open', '');
      await expect(box(page).locator('.debrief__body')).toBeVisible();
    });
  });
}

test.describe('at 1280', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('closed before the hero is passed, it stays closed', async ({ page }) => {
    await page.goto('/');
    await toggle(page).click();
    await expect(box(page)).toHaveAttribute('open', '');
    await toggle(page).click();
    await expect(box(page)).not.toHaveAttribute('open', '');
    await scrollPastHero(page);
    await page.waitForTimeout(300);
    await expect(box(page)).not.toHaveAttribute('open', '');
  });

  test('it stays in the corner as the page scrolls', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await expect(box(page)).toHaveAttribute('open', '');
    const at = await corner(page, '#newsletter');
    expect(at.bottom).toBeGreaterThanOrEqual(16);
    expect(at.bottom).toBeLessThan(40);
    await expect(box(page)).toBeInViewport();
  });

  test('it opens and closes from the keyboard', async ({ page }) => {
    await page.goto('/');
    await toggle(page).focus();
    await page.keyboard.press('Enter');
    await expect(box(page)).toHaveAttribute('open', '');
    await page.keyboard.press('Space');
    await expect(box(page)).not.toHaveAttribute('open', '');
  });

  test('on a page without a hero it stays folded', async ({ page }) => {
    await page.goto('/imprint');
    await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await page.waitForTimeout(300);
    await expect(box(page)).not.toHaveAttribute('open', '');
  });

  test('at the end of the page the imprint link is clear of the box, open or folded', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await expect(box(page)).toHaveAttribute('open', '');
    for (const state of ['open', 'folded']) {
      await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
      const imprint = page.getByRole('link', { name: 'Imprint' });
      const clear = await imprint.evaluate((link) => {
        const rect = link.getBoundingClientRect();
        return document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) === link;
      });
      expect(clear, `imprint link is clear with the box ${state}`).toBe(true);
      await toggle(page).click();
    }
  });
});

test('the Danish page has the Danish box', async ({ page }) => {
  await page.goto('/da/');
  await toggle(page).click();
  await expect(box(page).getByRole('heading', { level: 2 })).toHaveText('Hold dig orienteret. Før det bliver akut.');
  await expect(box(page).getByRole('link')).toHaveText('Tilmeld dig Debrief');
});

test('without JavaScript the box is folded, and still opens and folds', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto('/');
  await expect(box(page)).not.toHaveAttribute('open', '');
  await toggle(page).click();
  await expect(box(page)).toHaveAttribute('open', '');
  await expect(box(page).locator('.debrief__body')).toBeVisible();
  await toggle(page).click();
  await expect(box(page)).not.toHaveAttribute('open', '');
  await context.close();
});
