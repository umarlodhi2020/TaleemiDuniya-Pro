import { defineConfig, devices } from '@playwright/test';
import config from './playwright.config.js';

export default defineConfig({
  ...config,
  testDir: './tests/emulator',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'cross-env VITE_USE_EMULATORS=true npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
