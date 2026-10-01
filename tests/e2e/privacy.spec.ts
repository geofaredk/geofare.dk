import { expect, test } from '@playwright/test';

/**
 * The brief: no cookies, no third-party requests, no analytics. Checked after a visitor has
 * done everything the page offers: scrolled to the end, opened every sector, used the pause button.
 */
for (const viewport of [
  { width: 360, height: 740 },
  { width: 1280, height: 800 },
]) {
  test(`no cookies, no storage and no request to another origin at ${viewport.width}`, async ({ page, context, baseURL }) => {
    await page.setViewportSize(viewport);
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Pause animation' }).click();
    await page.getByRole('button', { name: 'Play animation' }).click();

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
    await page.goto('/privacy', { waitUntil: 'networkidle' });
    await page.goto('/does-not-exist', { waitUntil: 'networkidle' });
    await page.goBack({ waitUntil: 'networkidle' });

    expect(await context.cookies()).toEqual([]);
    expect(await page.evaluate(() => document.cookie)).toBe('');
    expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);

    const origin = new URL(baseURL!).origin;
    expect(requests.length).toBeGreaterThan(5);
    // data: URLs never leave the browser; everything else must come from the page's own origin.
    const elsewhere = requests.filter((url) => !url.startsWith('data:') && new URL(url).origin !== origin);
    expect(elsewhere).toEqual([]);
    console.log(`[privacy] ${test.info().project.name} ${viewport.width}: ${requests.length} requests, all ${origin}`);
  });
}
