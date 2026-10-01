import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** Violations as short lines, so a failure says what and where. */
async function violations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(tags).analyze();
  return results.violations.flatMap((violation) =>
    violation.nodes.map((node) => `${violation.id}: ${node.target.join(' ')} — ${node.failureSummary?.split('\n')[1]?.trim()}`),
  );
}

/** The page as a reader meets it at rest: fonts in, headline settled, every sector row open. */
async function settle(page: Page, path: string) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(path);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => document.querySelectorAll('details').forEach((details) => (details.open = true)));
}

for (const viewport of [
  { width: 360, height: 740 },
  { width: 1280, height: 800 },
]) {
  test.describe(`axe at ${viewport.width}`, () => {
    test.use({ viewport });

    test('the home page has no violations with every sector open', async ({ page }) => {
      await settle(page, '/');
      await expect(page.locator('#sectors details[open]')).toHaveCount(7);
      expect(await violations(page)).toEqual([]);
    });

    test('the home page has no violations with motion on and the animation paused', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      // Pausing settles the headline, so no ending is caught half-faded; the pause control itself is on show.
      await page.getByRole('button', { name: 'Pause animation' }).click();
      await expect(page.getByRole('button', { name: 'Play animation' })).toBeVisible();
      await page.evaluate(() => document.querySelectorAll('details').forEach((details) => (details.open = true)));
      expect(await violations(page)).toEqual([]);
    });

    test('the privacy page has no violations', async ({ page }) => {
      await settle(page, '/privacy');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy');
      expect(await violations(page)).toEqual([]);
    });

    test('the 404 page has no violations', async ({ page }) => {
      await settle(page, '/404');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page not found');
      expect(await violations(page)).toEqual([]);
    });
  });
}

test('the home page has no violations with the menu open at 360', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await settle(page, '/');
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible();
  expect(await violations(page)).toEqual([]);
});
