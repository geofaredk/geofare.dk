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
    command: 'npm run preview',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
});
