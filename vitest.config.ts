import { defineConfig } from 'vitest/config';

// Unit tests run in Node. core has no DOM, so its project must never use a DOM environment.
const packages = ['core', 'platform', 'fonts', 'engine', 'audio', 'media', 'app-state', 'ui-kit'];
const apps = ['playground'];

const project = (root: string, name: string) => ({
  test: {
    name,
    root,
    environment: 'node' as const,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});

export default defineConfig({
  test: {
    projects: [
      ...packages.map((name) => project(`packages/${name}`, name)),
      ...apps.map((name) => project(`apps/${name}`, name)),
      // Runs the real ESLint over the real config, so the first lint of a run is slow.
      {
        test: {
          name: 'lint-rules',
          root: 'tools/lint',
          environment: 'node' as const,
          include: ['**/*.test.ts'],
          testTimeout: 60_000,
        },
      },
    ],
  },
});
