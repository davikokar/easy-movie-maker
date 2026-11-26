import { defineConfig } from '@playwright/test';

// Golden-frame specs are added in Phase 2. Browsers are installed then, not now.
export default defineConfig({
  testDir: './tests/golden',
  reporter: 'list',
});
