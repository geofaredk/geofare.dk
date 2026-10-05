import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const copy = JSON.parse(readFileSync(new URL('../fixtures/copy.en.json', import.meta.url), 'utf8'));
const sectors: { title: string; lead: string; bullets: string[] }[] = copy.sectors.items;

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

    test('the About window shows a still of the line field', async ({ page }) => {
      await page.goto('/');
      const still = page.locator('#about .portrait__window svg.line-field');
      await expect(still).toBeVisible();
      expect(await still.locator('path').count()).toBeGreaterThan(5);
      await expect(page.locator('#about .field-window__field')).toBeHidden();
      // The two bands show their stills too.
      for (const selector of ['#approach .approach__field', '.contact__band']) {
        await expect(page.locator(`${selector} svg.line-field`)).toBeVisible();
      }
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

    test('every sector row opens by click and shows its sentence and bullets', async ({ page }) => {
      await page.goto('/');
      const rows = page.locator('#sectors details');
      await expect(rows).toHaveCount(7);
      for (const [i, sector] of sectors.entries()) {
        const row = rows.nth(i);
        if (i === 0) await expect(row).toHaveAttribute('open');
        else {
          await expect(row.locator('li').first()).toBeHidden();
          await row.locator('summary').click();
          await expect(row).toHaveAttribute('open');
          // Let the row finish growing: with scripting off, Playwright cannot click a page that is still moving.
          let height = -1;
          await expect
            .poll(async () => {
              const last = height;
              height = (await row.boundingBox())!.height;
              return height === last;
            })
            .toBe(true);
        }
        await expect(row.locator('summary')).toHaveText(sector.title);
        await expect(row.getByText(sector.lead, { exact: true })).toBeVisible();
        await expect(row.locator('li')).toHaveText(sector.bullets);
        for (const bullet of await row.locator('li').all()) await expect(bullet).toBeVisible();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });

  });
}
