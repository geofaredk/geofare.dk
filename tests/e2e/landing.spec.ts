import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// The service landing page in the browser: accessible, fits every width, openable without
// JavaScript, and switches language to its own Danish page.
const PATH = '/services/earth-observation-remote-sensing/';
const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function violations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(tags).analyze();
  return results.violations.flatMap((violation) =>
    violation.nodes.map((node) => `${violation.id}: ${node.target.join(' ')} — ${node.failureSummary?.split('\n')[1]?.trim()}`),
  );
}

const openAll = (page: Page) => page.evaluate(() => document.querySelectorAll('details').forEach((details) => (details.open = true)));

for (const viewport of [
  { width: 360, height: 740 },
  { width: 1280, height: 800 },
]) {
  test.describe(`the landing page at ${viewport.width}`, () => {
    test.use({ viewport });

    test('has no axe violations with every row open', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(PATH);
      await page.evaluate(() => document.fonts.ready);
      await openAll(page);
      expect(await violations(page)).toEqual([]);
    });
  });
}

test.describe('the hero', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('is a block of the accent colour with pale text and no line field, and the header is part of it', async ({ page }) => {
    await page.goto(PATH);
    await page.evaluate(() => document.fonts.ready);
    const header = page.locator('header');
    await expect(header).toHaveCSS('background-color', 'rgb(0, 71, 255)');
    await expect(header.locator('.site-header__links a').first()).toHaveCSS('color', 'rgb(252, 242, 235)');
    await expect(header.locator('img.logo')).toHaveAttribute('src', /pale/);
    const hero = page.locator('#top');
    await expect(hero).toHaveCSS('background-color', 'rgb(0, 71, 255)');
    await expect(hero.locator('h1')).toHaveCSS('color', 'rgb(252, 242, 235)');
    await expect(hero.locator('.landing-hero__sub')).toHaveCSS('color', 'rgb(252, 242, 235)');
    await expect(hero.locator('canvas')).toHaveCount(0);
    // The picture stands to the right of the text and hangs over the hero's lower edge into the cream.
    const picture = (await hero.locator('.landing-hero__picture').boundingBox())!;
    const lead = (await hero.locator('.landing-hero__sub').boundingBox())!;
    const block = (await hero.boundingBox())!;
    expect(picture.x).toBeGreaterThan(lead.x + lead.width);
    expect(picture.y + picture.height).toBeGreaterThan(block.y + block.height + 24);
    // The headline keeps the full width above both: its lines run past the picture's left edge.
    const title = (await hero.locator('h1').boundingBox())!;
    expect(title.x + title.width).toBeGreaterThan(picture.x + 100);
    expect(title.y + title.height).toBeLessThanOrEqual(picture.y);
    // The logos and the section after them are one section's space apart, not two.
    const logos = (await page.locator('#clients .clients__list').boundingBox())!;
    const situations = (await page.locator('#situations h2').boundingBox())!;
    expect(situations.y - (logos.y + logos.height)).toBeLessThan(200);
    // Both buttons stand out on the blue: the primary is a pale block, the secondary a pale outline.
    await expect(hero.locator('a[href="#contact"]')).toHaveCSS('background-color', 'rgb(252, 242, 235)');
    await expect(hero.locator('a[href="#offer"]')).toHaveCSS('color', 'rgb(252, 242, 235)');
  });
});

// The page's one job: on a laptop and on a phone, the call to action is on the first screen.
for (const viewport of [
  { width: 360, height: 740 },
  { width: 1280, height: 800 },
]) {
  test(`the hero's "Get in touch" is on the first screen at ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(PATH);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('#top a[href="#contact"]')).toBeInViewport({ ratio: 1 });
  });
}

for (const width of [320, 360, 768, 1280, 1920]) {
  test(`the landing page fits ${width} px: no sideways scrolling`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(PATH);
    await page.evaluate(() => document.fonts.ready);
    await openAll(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}

test.describe('the language switcher on the landing page', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('leads to the Danish page and back', async ({ page }) => {
    await page.goto(PATH);
    const nav = page.locator('header nav');
    await nav.getByRole('link', { name: 'DA Dansk', exact: true }).click();
    await expect(page).toHaveURL(/\/da\/services\/earth-observation-remote-sensing\/?$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'da-DK');
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
    await nav.getByRole('link', { name: 'EN English', exact: true }).click();
    await expect(page).toHaveURL(/\/services\/earth-observation-remote-sensing\/?$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-GB');
  });

  test('the header button leads to the contact section of this page', async ({ page }) => {
    await page.goto(PATH);
    await page.locator('header nav .button').click();
    await expect(page).toHaveURL(/#contact$/);
    await expect(page.locator('#contact')).toBeInViewport();
  });
});

test.describe('the landing page without JavaScript', () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 1280, height: 800 } });

  test('shows stills of the field and opens its rows on a click', async ({ page }) => {
    // No smooth scrolling and no opening animation, so a row is still the moment it is clicked.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(PATH);
    for (const selector of ['#process .process__field', '.contact__band', '#why .portrait__window']) {
      await expect(page.locator(`${selector} svg.line-field`)).toBeVisible();
    }
    const second = page.locator('#audiences details').nth(1);
    await expect(second).not.toHaveAttribute('open');
    await second.locator('summary').click();
    await expect(second).toHaveAttribute('open', '');
    const question = page.locator('#faq details').first();
    await question.locator('summary').click();
    await expect(question.locator('.question__answer')).toBeVisible();
  });
});
