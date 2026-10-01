import { expect, test } from '@playwright/test';

test.use({ javaScriptEnabled: false });

const links = ['Services', 'About', 'How we work', 'Who we work with'];

for (const viewport of [
  { width: 360, height: 740 },
  { width: 1280, height: 800 },
]) {
  test.describe(`without JavaScript at ${viewport.width}`, () => {
    test.use({ viewport });

    test('the headline shows the final sentence', async ({ page }) => {
      await page.goto('/');
      const h1 = page.getByRole('heading', { level: 1 });
      await expect(h1).toHaveCount(1);
      await expect(h1).toHaveAccessibleName('Make good decisions when it matters.');
      // The whole text content too, which is what a crawler that ignores ARIA reads.
      await expect(h1).toHaveText('Make good decisions when it matters.');
      await expect(page.locator('.hero__fixed')).toBeVisible();
      await expect(page.locator('.hero__final')).toBeVisible();
      await expect(page.locator('.hero__final')).toHaveText('when it matters.');
      await expect(page.locator('.hero__ending').filter({ visible: true })).toHaveCount(0);
    });

    test('every navigation link and the call to action can be reached', async ({ page }) => {
      await page.goto('/');
      const header = page.locator('header');
      for (const name of links) await expect(header.getByRole('link', { name, exact: true })).toBeVisible();
      await expect(header.getByRole('link', { name: 'Get in touch' })).toBeVisible();
      await expect(header.getByRole('button')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });

    test('a static line field stands in for the animation, clear of all text', async ({ page }) => {
      await page.goto('/');
      const still = page.locator('#top svg.line-field');
      await expect(still).toBeVisible();
      await expect(still).toHaveAttribute('aria-hidden', 'true');
      expect(await still.locator('path').count()).toBeGreaterThan(5);

      const box = (await still.boundingBox())!;
      expect(box.height).toBeGreaterThan(40);
      for (const selector of ['.hero__title', '.hero__sub', '.hero__actions']) {
        const text = (await page.locator(selector).boundingBox())!;
        const apart = text.y + text.height <= box.y || box.y + box.height <= text.y;
        expect(apart, `${selector} is clear of the line field`).toBe(true);
      }
    });

    test('there is no pause button for an animation that is not running', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('.hero__pause')).toBeHidden();
      await expect(page.getByRole('button', { name: /animation/ })).toHaveCount(0);
    });
  });
}
