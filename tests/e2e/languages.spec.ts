import { expect, test, type Page } from '@playwright/test';

const nav = (page: Page) => page.locator('header nav');
const current = (page: Page) => nav(page).locator('.site-header__lang[aria-current]');

test.describe('the language switcher at 1280', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('stands in the main menu and marks English on the English page', async ({ page }) => {
    await page.goto('/');
    await expect(nav(page).locator('.site-header__lang')).toHaveCount(2);
    await expect(current(page)).toHaveText(/^\s*EN/);
    await expect(nav(page).getByRole('link', { name: 'DA Dansk', exact: true })).toBeVisible();
    // The language a page is in is not a link to itself.
    await expect(nav(page).getByRole('link', { name: /^EN/ })).toHaveCount(0);
  });

  test('leads to the same page in Danish and back', async ({ page }) => {
    await page.goto('/');
    await nav(page).getByRole('link', { name: 'DA Dansk', exact: true }).click();
    await expect(page).toHaveURL(/\/da\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'da-DK');
    await expect(current(page)).toHaveText(/^\s*DA/);
    await expect(page.getByRole('navigation', { name: 'Hovednavigation' })).toBeVisible();

    await nav(page).getByRole('link', { name: 'EN English', exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-GB');
  });

  test('keeps the page when switching on the imprint, and the menu links stay in the language', async ({ page }) => {
    await page.goto('/imprint');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Imprint');
    await nav(page).getByRole('link', { name: 'DA Dansk', exact: true }).click();
    await expect(page).toHaveURL(/\/da\/imprint\/?$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kolofon');
    const hrefs = await nav(page).locator('.site-header__links a').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
    for (const href of hrefs) expect(href).toMatch(/^\/da\/#/);
  });

  test('the other language has the whole page: every section, with its own headline', async ({ page }) => {
    for (const path of ['/da/']) {
      await page.goto(path);
      const ids = await page.locator('main > section').evaluateAll((sections) => sections.map((section) => section.id));
      expect(ids).toEqual(['top', 'services', 'about', 'approach', 'sectors', 'lab', 'contact']);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  });
});

test('at 360 the switcher is in the menu sheet, on the links\' edge, with targets of 44 px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');
  await expect(nav(page).locator('.site-header__lang').first()).toBeHidden();
  await page.getByRole('button', { name: 'Menu' }).click();
  const items = nav(page).locator('.site-header__lang');
  await expect(items).toHaveCount(2);
  const boxes = await items.evaluateAll((elements) => elements.map((element) => (({ left, width, height }) => ({ left, width, height }))(element.getBoundingClientRect())));
  for (const box of boxes) {
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  const edge = await nav(page).locator('.site-header__links a').first().evaluate((link) => link.getBoundingClientRect().left);
  expect(boxes[0].left).toBe(edge);
  await nav(page).getByRole('link', { name: 'DA Dansk', exact: true }).click();
  await expect(page).toHaveURL(/\/da\/$/);
  await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'da-DK');
});
