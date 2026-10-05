import { expect, test } from '@playwright/test';
import { site } from '../../src/config/site';

/**
 * Privacy: no cookies, nothing stored in the browser, and nothing asked of another origin
 * except Cabin analytics (the script, and its reports). Checked after a visitor has done
 * everything the page offers: scrolled to the end, opened every sector, visited the other pages.
 *
 * The real analytics script runs here, so that what it does in the browser is what is checked.
 * It is fetched by the test itself and handed to the page; its reports are caught before they
 * leave, so a test run never shows up as a visit. Without a network the script cannot be
 * fetched, and the test then checks the page without it and says so.
 */
let cabin: string | null = null;
test.beforeAll(async () => {
  try {
    const response = await fetch(site.analytics.script);
    cabin = response.ok ? await response.text() : null;
  } catch {
    cabin = null;
  }
});

for (const viewport of [
  { width: 360, height: 740 },
  { width: 1280, height: 800 },
]) {
  test(`no cookies, no storage, and no request elsewhere but analytics at ${viewport.width}`, async ({ page, context, baseURL }) => {
    await page.setViewportSize(viewport);
    const requests: string[] = [];
    const reports: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    await context.route(site.analytics.script, (route) =>
      cabin === null ? route.abort() : route.fulfill({ contentType: 'application/javascript', body: cabin }),
    );
    await context.route(`${site.analytics.endpoint}/**`, (route) => {
      reports.push(route.request().url());
      return route.fulfill({ status: 204, body: '' });
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    // Scroll through the whole page in steps, so anything loaded lazily is loaded.
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y <= height; y += viewport.height / 2) {
      await page.evaluate((top) => scrollTo({ top, behavior: 'instant' }), y);
      await page.waitForTimeout(50);
    }
    const rows = page.locator('#sectors details');
    for (let i = 0; i < (await rows.count()); i++) {
      if (!(await rows.nth(i).evaluate((row) => (row as HTMLDetailsElement).open))) await rows.nth(i).locator('summary').click();
    }
    await expect(page.locator('#sectors details[open]')).toHaveCount(7);
    await page.goto('/imprint', { waitUntil: 'networkidle' });
    await page.goto('/does-not-exist', { waitUntil: 'networkidle' });
    await page.goBack({ waitUntil: 'networkidle' });

    expect(await context.cookies()).toEqual([]);
    expect(await page.evaluate(() => document.cookie)).toBe('');
    expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);

    const origin = new URL(baseURL!).origin;
    expect(requests.length).toBeGreaterThan(5);
    // data: URLs never leave the browser. Everything else comes from the page's own origin,
    // except the analytics script and its reports.
    const elsewhere = requests.filter((url) => !url.startsWith('data:') && new URL(url).origin !== origin);
    const unexpected = elsewhere.filter((url) => url !== site.analytics.script && !url.startsWith(`${site.analytics.endpoint}/`));
    expect(unexpected).toEqual([]);
    // Every page asks for the script.
    expect(elsewhere.filter((url) => url === site.analytics.script).length).toBeGreaterThanOrEqual(3);
    if (cabin === null) {
      test.info().annotations.push({ type: 'note', description: 'The analytics script could not be fetched (no network), so it did not run in this test.' });
    }
    console.log(
      `[privacy] ${test.info().project.name} ${viewport.width}: ${requests.length} requests; elsewhere only analytics (${cabin === null ? 'script not fetched' : `${reports.length} reports caught`})`,
    );
  });
}
