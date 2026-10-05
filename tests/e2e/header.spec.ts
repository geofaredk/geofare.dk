import { expect, test, type Page } from '@playwright/test';
import { tabKey } from './support/keyboard';

const links = [
  { name: 'Services', anchor: '#services' },
  { name: 'About', anchor: '#about' },
  { name: 'How we work', anchor: '#approach' },
  { name: 'Who we work with', anchor: '#sectors' },
  { name: 'Lab', anchor: '#lab' },
];

/** The other languages in the switcher, as their links are named: short form and full name. */
const otherLanguages = ['DA Dansk'];

const nav = (page: Page) => page.getByRole('navigation', { name: 'Main navigation' });
const headerBottom = (page: Page) => page.evaluate(() => document.querySelector('header')!.getBoundingClientRect().bottom);

test.describe('at 1280', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('shows the links and the call to action, each pointing at its section', async ({ page }) => {
    await page.goto('/');
    for (const { name, anchor } of links) {
      const link = nav(page).getByRole('link', { name, exact: true });
      await expect(link).toBeVisible();
      expect(await link.getAttribute('href')).toMatch(new RegExp(`${anchor}$`));
    }
    const cta = page.locator('header').getByRole('link', { name: 'Get in touch' });
    await expect(cta).toBeVisible();
    expect(await cta.getAttribute('href')).toMatch(/#contact$/);
    await expect(page.locator('header').getByRole('button')).toHaveCount(0);
  });

  test('clicking Services brings the section into view below the header', async ({ page }) => {
    await page.goto('/');
    await nav(page).getByRole('link', { name: 'Services', exact: true }).click();
    await expect(page).toHaveURL(/#services$/);
    const top = () => page.evaluate(() => document.querySelector('#services')!.getBoundingClientRect().top);
    // Scrolling is smooth; wait for it to arrive.
    await expect.poll(async () => Math.abs((await top()) - (await headerBottom(page)))).toBeLessThan(40);
    expect(await top()).toBeGreaterThanOrEqual(await headerBottom(page));
    expect(await page.evaluate(() => document.querySelector('header')!.getBoundingClientRect().top)).toBe(0);
  });

  test('Tab runs skip link, logo, links, call to action, languages; the skip link moves focus to the content', async ({ page, browserName }) => {
    await page.goto('/');
    await page.keyboard.press(tabKey(browserName));
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();

    await page.keyboard.press(tabKey(browserName));
    await expect(page.getByRole('link', { name: 'geofare home' }).first()).toBeFocused();
    for (const { name } of links) {
      await page.keyboard.press(tabKey(browserName));
      await expect(nav(page).getByRole('link', { name, exact: true })).toBeFocused();
    }
    await page.keyboard.press(tabKey(browserName));
    await expect(page.locator('header').getByRole('link', { name: 'Get in touch' })).toBeFocused();
    for (const name of otherLanguages) {
      await page.keyboard.press(tabKey(browserName));
      await expect(nav(page).getByRole('link', { name, exact: true })).toBeFocused();
    }

    await skip.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main')).toBeFocused();
  });
});

for (const width of [360, 768, 1280, 1920]) {
  test(`the header is exactly --header-h tall at ${width} and stays on top`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    const measured = await page.evaluate(() => {
      const header = document.querySelector('header')!;
      const probe = document.createElement('div');
      probe.style.height = 'var(--header-h)';
      document.body.append(probe);
      const token = probe.getBoundingClientRect().height;
      probe.remove();
      scrollTo({ top: 2000, behavior: 'instant' });
      return { token, height: header.getBoundingClientRect().height, top: header.getBoundingClientRect().top, scrolled: scrollY };
    });
    expect(measured.height).toBe(measured.token);
    expect(measured.scrolled).toBeGreaterThan(0);
    expect(measured.top).toBe(0);
  });
}

test.describe('at 360', () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test('the menu button opens the links and Escape closes them again', async ({ page }) => {
    await page.goto('/');
    const button = page.locator('header').getByRole('button');
    await expect(button).toHaveText('Menu');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    // Closed, the navigation is not rendered at all, so look it up in the markup.
    expect(await button.getAttribute('aria-controls')).toBe(await page.locator('header nav').getAttribute('id'));
    for (const { name } of links) await expect(page.getByRole('link', { name, exact: true })).toBeHidden();

    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    await expect(button).toHaveText('Close');
    for (const { name } of links) await expect(nav(page).getByRole('link', { name, exact: true })).toBeVisible();
    await expect(page.locator('header').getByRole('link', { name: 'Get in touch' })).toBeVisible();

    await nav(page).getByRole('link', { name: 'About', exact: true }).focus();
    await page.keyboard.press('Escape');
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(button).toHaveText('Menu');
    await expect(button).toBeFocused();
    for (const { name } of links) await expect(page.getByRole('link', { name, exact: true })).toBeHidden();
  });

  test('choosing a link closes the menu and goes to the section', async ({ page }) => {
    await page.goto('/');
    const button = page.locator('header').getByRole('button');
    await button.click();
    await nav(page).getByRole('link', { name: 'About', exact: true }).click();
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(page).toHaveURL(/#about$/);
    const top = () => page.evaluate(() => document.querySelector('#about')!.getBoundingClientRect().top);
    await expect.poll(async () => Math.abs((await top()) - (await headerBottom(page)))).toBeLessThan(40);
    expect(await top()).toBeGreaterThanOrEqual(await headerBottom(page));
  });

  test('tabbing out of the open menu closes it, so focus is never hidden behind it', async ({ page, browserName }) => {
    await page.goto('/');
    const button = page.locator('header').getByRole('button');
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(button).toHaveAttribute('aria-expanded', 'true');
    // The links, the other languages and the call to action, then out into the page.
    for (let i = 0; i < links.length + otherLanguages.length + 2; i++) await page.keyboard.press(tabKey(browserName));
    await expect(button).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('#top').getByRole('link', { name: 'Get in touch' })).toBeFocused();
  });

  test('header targets are at least 44 px', async ({ page }) => {
    await page.goto('/');
    const button = page.locator('header').getByRole('button');
    await button.click();
    const targets = [button, ...(await nav(page).getByRole('link').all())];
    // The menu button, the links, the other languages and the call to action.
    expect(targets.length).toBe(1 + links.length + otherLanguages.length + 1);
    for (const target of targets) {
      const box = (await target.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    // The logo link is exactly as tall as the logo, so that its foot is the line the menu stands on;
    // it stays above the 24 px that WCAG 2.2 asks of a target.
    const home = (await page.getByRole('link', { name: 'geofare home' }).first().boundingBox())!;
    expect(home.width).toBeGreaterThanOrEqual(44);
    expect(home.height).toBeGreaterThanOrEqual(24);
  });

  for (const width of [360, 1280]) {
    test(`the menu text stands on the line of the logo's foot at ${width}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      const { logoFoot, baseline } = await page.evaluate(() => {
        const logoFoot = document.querySelector('.site-header__home img')!.getBoundingClientRect().bottom;
        // The first thing shown beside the logo: a menu link on wide screens, the menu button on narrow ones.
        const text = [...document.querySelectorAll<HTMLElement>('.site-header__links a, .site-header__toggle')].find((e) => e.getClientRects().length)!;
        // Its text baseline: the bottom of an empty inline box set at the end of the text.
        const wrap = document.createElement('span');
        while (text.firstChild) wrap.appendChild(text.firstChild);
        const mark = document.createElement('span');
        mark.style.display = 'inline-block';
        wrap.appendChild(mark);
        text.appendChild(wrap);
        const baseline = mark.getBoundingClientRect().bottom;
        mark.remove();
        while (wrap.firstChild) text.appendChild(wrap.firstChild);
        wrap.remove();
        return { logoFoot, baseline };
      });
      expect(Math.abs(logoFoot - baseline)).toBeLessThanOrEqual(1);
    });
  }
});
