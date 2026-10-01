import { defineConfig } from '@playwright/test';

// E2E_BASE_URL points the suite at a site that is already running, such as the Docker
// container (`E2E_BASE_URL=http://localhost:8080 npx playwright test`); then no server is started.
const external = process.env.E2E_BASE_URL;
const baseURL = external ?? 'http://localhost:4321';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL,
  },
  projects: [
    // The system Google Chrome; Chromium is never downloaded.
    { name: 'chrome', use: { browserName: 'chromium', channel: 'chrome' } },
    // Playwright's own builds (`npx playwright install firefox webkit`).
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  webServer: external
    ? undefined
    : {
        // Serves dist/, which `npm run test:e2e` rebuilds first (the `pretest:e2e` script).
        // Astro 7 moves `astro preview` into the background when it detects an AI agent;
        // --ignore-lock keeps it in the foreground so Playwright owns and stops the server.
        command: 'npm run preview -- --ignore-lock',
        url: baseURL,
        // Never test against a server someone else left running: it may serve an old build.
        // If port 4321 is taken, the run stops and says so.
        reuseExistingServer: false,
      },
});
