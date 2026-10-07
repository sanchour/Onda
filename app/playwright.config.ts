import { defineConfig, devices } from '@playwright/test'

// Flows run against the production build (so the service worker is real) in WebKit at iPhone 15 Pro size.
// The offline test uses the Chromium engine at the same viewport: Playwright's WebKit build on Windows and
// Linux does not run service workers reliably, and offline behaviour is the service worker's job.
const iphone = devices['iPhone 15 Pro']

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  expect: { timeout: 20_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'iphone-webkit', use: { ...iphone }, testIgnore: /offline\.spec\.ts/ },
    {
      name: 'iphone-offline',
      testMatch: /offline\.spec\.ts/,
      use: { browserName: 'chromium', viewport: iphone.viewport, deviceScaleFactor: iphone.deviceScaleFactor, isMobile: true, hasTouch: true, userAgent: iphone.userAgent },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
