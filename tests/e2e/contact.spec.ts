import { expect, test } from '@playwright/test';

// The booking block is highlighted at rest: a block of the accent colour with pale text and a pale
// button, unlike the email and LinkedIn rows, which fill only when the pointer is on them.
for (const path of ['/', '/services/earth-observation-remote-sensing/']) {
  test(`the booking block on ${path} is filled with the accent colour at rest`, async ({ page }) => {
    await page.goto(path);
    await page.evaluate(() => document.fonts.ready);
    const block = page.locator('#contact .contact__booking');
    await expect(block).toHaveCSS('background-color', 'rgb(0, 71, 255)');
    await expect(block.locator('a.button')).toHaveCSS('background-color', 'rgb(252, 242, 235)');
    await expect(block.locator('a.button')).toHaveCSS('color', 'rgb(0, 71, 255)');
    await expect(page.locator('#contact a[href^="mailto:"]')).not.toHaveCSS('background-color', 'rgb(0, 71, 255)');
  });
}

// Two columns on a laptop: the heading and the note on the left, the button on the right, on
// the same line as the text; on a phone the button follows the heading.
test('the booking block sets its button to the right of the text on a laptop', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const block = page.locator('#contact .contact__booking');
  const title = (await block.locator('h3').boundingBox())!;
  const note = (await block.locator('.contact__booking-note').boundingBox())!;
  const button = (await block.locator('a.button').boundingBox())!;
  expect(button.x).toBeGreaterThan(Math.max(title.x + title.width, note.x + note.width));
  expect(button.y).toBeLessThan(note.y + note.height);
  expect(note.x).toBe(title.x);
});

test('the booking block stacks on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const block = page.locator('#contact .contact__booking');
  const title = (await block.locator('h3').boundingBox())!;
  const button = (await block.locator('a.button').boundingBox())!;
  expect(button.y).toBeGreaterThan(title.y + title.height);
  expect(button.x).toBe(title.x);
});
