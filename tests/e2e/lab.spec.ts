import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const copy = JSON.parse(readFileSync(new URL('../fixtures/copy.en.json', import.meta.url), 'utf8'));
const projects: { title: string; url: string; status?: string }[] = copy.lab.projects;

const cards = (page: Page) => page.locator('#lab .project');

for (const [width, columns] of [
  [360, 1],
  [768, 2],
  [1280, 3],
  [1920, 3],
] as const) {
  test(`the cards stand in ${columns} column${columns > 1 ? 's' : ''} at ${width}, each with a 16:10 picture area`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(cards(page)).toHaveCount(projects.length);
    const boxes = await cards(page).evaluateAll((items) =>
      items.map((item) => {
        const card = item.getBoundingClientRect();
        const thumb = item.querySelector('.project__thumb')!.getBoundingClientRect();
        const title = item.querySelector('h3')!.getBoundingClientRect();
        return { left: Math.round(card.left), top: Math.round(card.top), width: Math.round(card.width), thumbTop: Math.round(thumb.top - card.top), ratio: thumb.width / thumb.height, thumbWidth: Math.round(thumb.width), titleTop: Math.round(title.top - card.top) };
      }),
    );
    expect(new Set(boxes.map((box) => box.left)).size).toBe(Math.min(columns, projects.length));
    for (const box of boxes) {
      // The picture area is the top of the card, as wide as the card, and 16:10.
      expect(box.thumbTop).toBe(0);
      expect(box.thumbWidth).toBe(box.width);
      expect(Math.abs(box.ratio - 1.6)).toBeLessThan(0.01);
    }
    // Every title starts the same distance below its picture area, with or without a status label.
    expect(new Set(boxes.map((box) => box.titleTop)).size).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test.describe('a card', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('is one link, heard once, that opens the project in a new tab', async ({ page }) => {
    await page.goto('/');
    for (const [i, project] of projects.entries()) {
      const card = cards(page).nth(i);
      const links = card.getByRole('link');
      await expect(links).toHaveCount(1);
      await expect(links).toHaveAccessibleName(`${project.title} (opens in a new tab)`);
      await expect(links).toHaveAttribute('href', project.url);
      await expect(links).toHaveAttribute('target', '_blank');
      await expect(links).toHaveAttribute('rel', 'noopener noreferrer');
      await expect(card.getByRole('heading', { level: 3 })).toContainText(project.title);
      // The arrow is drawn in the page, not taken from an icon set, and says nothing to a screen reader.
      await expect(card.locator('svg.project__arrow')).toHaveAttribute('aria-hidden', 'true');
    }
  });

  test('is the link all over: its picture, its text and its tags lead to the project', async ({ page }) => {
    await page.goto('/');
    const card = cards(page).first();
    await card.scrollIntoViewIfNeeded();
    const hits = await card.evaluate((item) => {
      const link = item.querySelector('a')!;
      return ['.project__thumb', '.project__text', '.project__tags'].map((selector) => {
        const box = item.querySelector(selector)!.getBoundingClientRect();
        return document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2) === link;
      });
    });
    expect(hits).toEqual([true, true, true]);
  });

  test('shows its status as an outlined pill in the accent colour, only where the project has one', async ({ page }) => {
    await page.goto('/');
    for (const [i, project] of projects.entries()) {
      const status = cards(page).nth(i).locator('.project__status');
      if (!project.status) {
        await expect(status).toHaveCount(0);
        continue;
      }
      await expect(status).toHaveText(project.status);
      const look = await status.evaluate((element) => {
        const style = getComputedStyle(element);
        const accent = getComputedStyle(document.querySelector('#lab h2')!).color;
        const tag = getComputedStyle(element.closest('.project')!.querySelector('.tag')!);
        const thumb = element.closest('.project')!.querySelector('.project__thumb')!.getBoundingClientRect();
        const box = element.getBoundingClientRect();
        return {
          colour: style.color,
          border: style.borderTopColor,
          accent,
          ground: style.backgroundColor,
          page: getComputedStyle(document.body).backgroundColor,
          tagBorder: tag.borderTopColor,
          inside: box.left > thumb.left && box.right < thumb.right && box.top > thumb.top && box.bottom < thumb.bottom,
          lowerLeft: box.left - thumb.left < thumb.width / 4 && thumb.bottom - box.bottom < thumb.height / 4,
        };
      });
      expect(look.colour).toBe(look.accent);
      expect(look.border).toBe(look.accent);
      // On the page's own ground, so it reads on a picture as well as on the line field.
      expect(look.ground).toBe(look.page);
      expect(look.tagBorder).not.toBe(look.border);
      // On the lower left corner of the picture area.
      expect(look.inside).toBe(true);
      expect(look.lowerLeft).toBe(true);
    }
  });

  test('turns to the accent colour on hover and shows the focus ring round the whole card', async ({ page }) => {
    await page.goto('/');
    const card = cards(page).nth(1);
    const link = card.getByRole('link');
    await card.scrollIntoViewIfNeeded();
    const accent = await page.locator('#lab h2').evaluate((element) => getComputedStyle(element).color);
    const colour = () => link.evaluate((element) => getComputedStyle(element).color);
    expect(await colour()).not.toBe(accent);
    // The pointer over the description, not the title: the whole card answers.
    const text = (await card.locator('.project__text').boundingBox())!;
    await page.mouse.move(text.x + text.width / 2, text.y + text.height / 2);
    await expect.poll(colour).toBe(accent);

    await page.mouse.move(0, 0);
    await page.keyboard.press('Tab'); // makes the focus that follows count as keyboard focus
    await link.focus();
    const ring = await link.evaluate((element) => {
      const after = getComputedStyle(element, '::after');
      const card = element.closest('.project')!.getBoundingClientRect();
      return { style: after.outlineStyle, width: parseFloat(after.outlineWidth), own: getComputedStyle(element).outlineStyle, cardHeight: card.height, ringHeight: parseFloat(after.height) };
    });
    expect(ring.style).toBe('solid');
    expect(ring.width).toBeGreaterThanOrEqual(2);
    expect(ring.own).toBe('none');
    expect(Math.abs(ring.ringHeight - ring.cardHeight)).toBeLessThan(1);
  });
});

test('the Lab link in the menu scrolls to the section, which sits between the sectors and contact', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Lab', exact: true }).click();
  await expect(page).toHaveURL(/#lab$/);
  const gap = () =>
    page.evaluate(() => document.querySelector('#lab')!.getBoundingClientRect().top - document.querySelector('header')!.getBoundingClientRect().bottom);
  await expect.poll(async () => Math.abs(await gap())).toBeLessThan(40);
  const order = await page.evaluate(() => [...document.querySelectorAll('main > section')].map((section) => section.id));
  expect(order.slice(order.indexOf('sectors'), order.indexOf('contact') + 1)).toEqual(['sectors', 'lab', 'contact']);
});

test('the section runs no script of its own and loads nothing from elsewhere', async ({ page }) => {
  await page.goto('/');
  expect(await page.locator('#lab script').count()).toBe(0);
  const sources = await page.locator('#lab img, #lab [src]').evaluateAll((elements) => elements.map((element) => element.getAttribute('src') ?? ''));
  expect(sources.filter((src) => /^https?:/.test(src))).toEqual([]);
});
