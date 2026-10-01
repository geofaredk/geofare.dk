import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// The sectors as the brief gives them, in its order.
const copy = JSON.parse(readFileSync(new URL('../fixtures/copy.en.json', import.meta.url), 'utf8'));
const sectors: { title: string; lead: string }[] = copy.sectors.items;
const names = sectors.map((sector) => sector.title);

for (const viewport of [
  { width: 360, height: 740 },
  { width: 1280, height: 800 },
]) {
  test.describe(`sector rows at ${viewport.width}`, () => {
    test.use({ viewport });

    test('there are seven rows, in the order of the brief, and only the first is open on load', async ({ page }) => {
      await page.goto('/');
      const rows = page.locator('#sectors details');
      await expect(rows).toHaveCount(7);
      expect(await rows.locator('summary h3').allTextContents()).toEqual(names);
      expect(await rows.evaluateAll((all) => all.map((row) => (row as HTMLDetailsElement).open))).toEqual([
        true,
        false,
        false,
        false,
        false,
        false,
        false,
      ]);
      await expect(rows.nth(0).locator('li')).toHaveCount(3);
      for (const bullet of await rows.nth(0).locator('li').all()) await expect(bullet).toBeVisible();
      await expect(rows.nth(1).locator('li').first()).toBeHidden();
    });

    test('Enter on the second row opens it and shows its sentence and three bullets; Enter again closes it', async ({ page }) => {
      await page.goto('/');
      const second = page.locator('#sectors details').nth(1);
      const summary = second.locator('summary');
      await summary.focus();
      await expect(summary).toBeFocused();
      await page.keyboard.press('Enter');

      await expect(second).toHaveAttribute('open');
      await expect(second.getByText(sectors[1].lead)).toBeVisible();
      const bullets = second.locator('li');
      await expect(bullets).toHaveCount(3);
      for (const bullet of await bullets.all()) await expect(bullet).toBeVisible();
      await expect(second.getByRole('list')).toHaveCount(1);
      await expect(second.getByRole('listitem')).toHaveCount(3);
      // Opening one row leaves the others as they were.
      await expect(page.locator('#sectors details').first()).toHaveAttribute('open');

      await page.keyboard.press('Enter');
      await expect(second).not.toHaveAttribute('open');
      await expect(bullets.first()).toBeHidden();
    });

    test('the whole row is the target, at least 44 px tall, and shows no default marker', async ({ page }) => {
      await page.goto('/');
      const summaries = page.locator('#sectors summary');
      await expect(summaries).toHaveCount(7);
      const rowWidth = (await page.locator('#sectors details').first().boundingBox())!.width;
      for (const summary of await summaries.all()) {
        const box = (await summary.boundingBox())!;
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.width).toBe(rowWidth);
        // `list-item` is what draws the browser's disclosure triangle.
        expect(await summary.evaluate((element) => getComputedStyle(element).display)).not.toBe('list-item');
      }
    });

    test('a click anywhere on the row opens it, at its far right as well as on the name', async ({ page }) => {
      await page.goto('/');
      const third = page.locator('#sectors details').nth(2);
      const summary = third.locator('summary');
      const box = (await summary.boundingBox())!;
      await summary.click({ position: { x: box.width - 6, y: box.height / 2 } });
      await expect(third).toHaveAttribute('open');
      await third.locator('summary h3').click();
      await expect(third).not.toHaveAttribute('open');
    });
  });
}

test('the focused row shows the focus ring, clear of the sticky header', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const summary = page.locator('#sectors summary').nth(3);
  await summary.focus();
  // Arrive by keyboard, so the ring is the :focus-visible one.
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(summary).toBeFocused();
  const ring = await summary.evaluate((element) => {
    const style = getComputedStyle(element);
    return { style: style.outlineStyle, width: parseFloat(style.outlineWidth), top: element.getBoundingClientRect().top };
  });
  expect(ring.style).toBe('solid');
  expect(ring.width).toBeGreaterThanOrEqual(2);
  const headerBottom = await page.evaluate(() => document.querySelector('header')!.getBoundingClientRect().bottom);
  expect(ring.top).toBeGreaterThanOrEqual(headerBottom);
});
