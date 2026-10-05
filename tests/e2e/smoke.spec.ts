import { expect, test } from '@playwright/test';
import { site } from '../../src/config/site';

/** The analytics script and its reports: the only addresses outside the site that a page may ask for. */
const isAnalytics = (url: string) => url === site.analytics.script || url.startsWith(site.analytics.endpoint);

test('the home page loads cleanly, with nothing from elsewhere but the analytics script, and in Figtree', async ({ page, baseURL }) => {
  const consoleErrors: string[] = [];
  const failed: string[] = [];
  const requested: string[] = [];
  page.on('console', (msg) => {
    // The analytics script cannot load in a test run (see playwright.config.ts); the browser reports that as an error.
    if (msg.type() === 'error' && !isAnalytics(msg.location().url)) consoleErrors.push(msg.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  page.on('requestfailed', (request) => {
    if (!isAnalytics(request.url())) failed.push(request.url());
  });
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
  // Everything comes from the site itself, except the analytics script, which is asked for once.
  const elsewhere = requested.filter((url) => new URL(url).origin !== new URL(baseURL!).origin);
  expect(elsewhere).toEqual([site.analytics.script]);
  expect(await page.evaluate(() => document.cookie)).toBe('');
  expect(fonts).toEqual({ check: true, loaded: true });
});
