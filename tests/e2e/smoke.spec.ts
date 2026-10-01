import { expect, test } from '@playwright/test';

test('the home page loads cleanly, privately and in Figtree', async ({ page }) => {
  const consoleErrors: string[] = [];
  const failed: string[] = [];
  const requested: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('requestfailed', (request) => failed.push(request.url()));
  page.on('response', (response) => {
    if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`);
  });
  page.on('request', (request) => requested.push(request.url()));

  await page.goto('/', { waitUntil: 'networkidle' });
  const fonts = await page.evaluate(async () => {
    await document.fonts.ready;
    return {
      check: document.fonts.check('1rem Figtree'),
      // check() is also true when no face matches at all, so confirm Figtree really loaded.
      loaded: [...document.fonts].some((face) => face.family.replace(/"/g, '') === 'Figtree' && face.status === 'loaded'),
    };
  });

  expect(consoleErrors).toEqual([]);
  expect(failed).toEqual([]);
  expect(requested.length).toBeGreaterThan(0);
  expect(requested.filter((url) => new URL(url).hostname !== 'localhost')).toEqual([]);
  expect(await page.evaluate(() => document.cookie)).toBe('');
  expect(fonts).toEqual({ check: true, loaded: true });
});
