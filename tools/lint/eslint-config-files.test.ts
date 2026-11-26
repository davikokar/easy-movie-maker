import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { ESLint } from 'eslint';
import { afterEach, describe, expect, it } from 'vitest';

// A nested eslint.config.* replaces the root configuration for its folder and silently switches
// package-boundary off there (Phase 0 Q0.12, S2), so the root one must be the only one.
const repoRoot = path.resolve(import.meta.dirname, '../..');

// Case-insensitive because ESLint finds its configuration that way on Windows and macOS.
const configFile = /^eslint\.config\.(js|mjs|cjs|ts|mts|cts)$/i;
// Exactly the folders globalIgnores in eslint.config.js ignores (docs aside); a test below keeps the two in step.
const generatedFolder =
  /^(dist|(packages|apps)\/[^/]+\/dist|apps\/[^/]+\/(playwright-report|test-results))$/;
const skippedFolder = /^(prototypes|\.git|node_modules)$|\/node_modules$/;

// Paths relative to `root`, with '/' as the separator, of every eslint.config.* file that is not `root`'s own.
const findNestedEslintConfigs = (root: string): string[] => {
  const found: string[] = [];
  const walk = (relative: string) => {
    for (const entry of fs.readdirSync(path.join(root, relative), { withFileTypes: true })) {
      const entryPath = relative === '' ? entry.name : `${relative}/${entry.name}`;
      if (entry.isDirectory()) {
        if (!skippedFolder.test(entryPath) && !generatedFolder.test(entryPath)) walk(entryPath);
      } else if (configFile.test(entry.name) && relative !== '') {
        found.push(entryPath);
      }
    }
  };
  walk('');
  return found;
};

describe('the repository has one ESLint configuration', () => {
  it('has no eslint.config.* file other than the root one', () => {
    expect(findNestedEslintConfigs(repoRoot)).toEqual([]);
  });

  it('has the root eslint.config.js', () => {
    expect(fs.existsSync(path.join(repoRoot, 'eslint.config.js'))).toBe(true);
  });

  it('skips the generated folders that ESLint ignores and no others', async () => {
    const eslint = new ESLint({ cwd: repoRoot });
    const names = [
      'dist',
      'dist-test',
      'build',
      'coverage',
      'playwright-report',
      'test-results',
      'blob-report',
    ];
    const parents = [
      '',
      'packages/engine/',
      'apps/playground/',
      'packages/engine/src/',
      'tools/lint/',
    ];
    const disagreements: string[] = [];
    for (const parent of parents) {
      for (const name of names) {
        const folder = `${parent}${name}`;
        const ignored = await eslint.isPathIgnored(path.join(repoRoot, folder, 'eslint.config.js'));
        if (ignored !== generatedFolder.test(folder)) disagreements.push(folder);
      }
    }

    expect(disagreements).toEqual([]);
  });
});

describe('the search for nested ESLint configurations', () => {
  const temporary: string[] = [];
  const makeTree = (files: string[]) => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'eslint-config-files-'));
    temporary.push(root);
    for (const file of files) {
      fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
      fs.writeFileSync(path.join(root, file), '');
    }
    return root;
  };

  afterEach(() => {
    for (const root of temporary.splice(0)) fs.rmSync(root, { recursive: true, force: true });
  });

  it.each(['js', 'mjs', 'cjs', 'ts', 'mts', 'cts'])('finds a nested .%s config', (extension) => {
    const root = makeTree([`packages/engine/src/eslint.config.${extension}`]);

    expect(findNestedEslintConfigs(root)).toEqual([
      `packages/engine/src/eslint.config.${extension}`,
    ]);
  });

  it.each(['ESLINT.config.js', 'Eslint.Config.js', 'eslint.config.JS'])(
    'finds a nested config named %s',
    (name) => {
      const root = makeTree(['eslint.config.js', `packages/engine/${name}`]);

      expect(findNestedEslintConfigs(root)).toEqual([`packages/engine/${name}`]);
    },
  );

  it.each(['build', 'coverage', 'dist-test', 'blob-report'])(
    'finds a config in a %s folder at a package or app root',
    (folder) => {
      const files = [
        `packages/engine/${folder}/eslint.config.js`,
        `apps/playground/${folder}/eslint.config.js`,
      ];
      const root = makeTree(['eslint.config.js', ...files]);

      expect(findNestedEslintConfigs(root).sort()).toEqual(files.sort());
    },
  );

  it.each([
    'packages/engine/src/dist/eslint.config.js',
    'tools/lint/eslint.config.mjs',
    'docs/eslint.config.js',
    '.github/eslint.config.js',
    'apps/playground/tests/golden/eslint.config.ts',
  ])('finds %s', (file) => {
    const root = makeTree(['eslint.config.js', file]);

    expect(findNestedEslintConfigs(root)).toEqual([file]);
  });

  it('ignores the root config, node_modules, prototypes, and generated folders', () => {
    const root = makeTree([
      'eslint.config.js',
      'node_modules/x/eslint.config.js',
      'packages/engine/node_modules/x/eslint.config.js',
      'prototypes/7.1/eslint.config.js',
      'prototypes/7.1/node_modules/x/eslint.config.js',
      'dist/eslint.config.js',
      'packages/engine/dist/eslint.config.js',
      'apps/playground/dist/eslint.config.js',
      'apps/playground/test-results/eslint.config.js',
      'apps/playground/playwright-report/eslint.config.js',
      '.git/eslint.config.js',
    ]);

    expect(findNestedEslintConfigs(root)).toEqual([]);
  });

  it('ignores files that only look like a config', () => {
    const root = makeTree([
      'packages/engine/eslint.config.json',
      'packages/engine/my-eslint.config.js',
    ]);

    expect(findNestedEslintConfigs(root)).toEqual([]);
  });
});
