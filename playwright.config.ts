import { defineConfig } from '@playwright/test';

const baseURL = 'http://localhost:4321';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL,
    // System Chrome only; never download browsers.
    channel: 'chrome',
  },
  webServer: {
    // Serves the existing dist/ (run `npm test` or `npm run build` first).
    // Astro 7 moves `astro preview` into the background when it detects an AI agent;
    // --ignore-lock keeps it in the foreground so Playwright owns and stops the server.
    command: 'npm run preview -- --ignore-lock',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
