import path from 'node:path';

import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

// Runs the repository's own eslint.config.js over code placed at a real path, so a change to the rule or to
// the ignore patterns that reopens a bypass fails here. Architecture section 4, Phase 0 stage 0.3.
const repoRoot = path.resolve(import.meta.dirname, '../..');
const eslint = new ESLint({ cwd: repoRoot });

const BOUNDARY = 'moviemaker/package-boundary';
const ISOLATION = 'moviemaker/entry-isolation';
const DIRECTIVE = '@typescript-eslint/triple-slash-reference';

interface Case {
  name: string;
  file: string;
  code: string;
  rule?: string;
}

const errorsFor = async (file: string, code: string) => {
  const filePath = path.join(repoRoot, file);
  if (await eslint.isPathIgnored(filePath)) throw new Error(`${file} is ignored by ESLint`);
  const [result] = await eslint.lintText(code, { filePath });
  const messages = result?.messages ?? [];
  const fatal = messages.find((message) => message.fatal);
  if (fatal) throw new Error(`${file} does not parse: ${fatal.message}`);
  return messages.filter(
    (message) =>
      message.severity === 2 &&
      (message.ruleId === BOUNDARY || message.ruleId === ISOLATION || message.ruleId === DIRECTIVE),
  );
};

const expectRejected = async ({ file, code, rule = BOUNDARY }: Case) => {
  const errors = await errorsFor(file, code);

  expect(errors.length).toBeGreaterThan(0);
  expect(errors.map((error) => error.ruleId)).toContain(rule);
};

const expectAccepted = async ({ file, code }: Case) => {
  const errors = await errorsFor(file, code);

  expect(errors.map((error) => `${error.ruleId}: ${error.message}`)).toEqual([]);
};

const platformBrowser = '@moviemaker/platform/browser';
const intoBrowserFromEngine = '../../platform/src/browser/index';

// One violating import of the platform implementation, written in every import form.
const importForms = (specifier: string): Case[] =>
  [
    ['static default import', `import browser from '${specifier}'; export { browser };`],
    ['side-effect import', `import '${specifier}';`],
    ['named export-from', `export { x } from '${specifier}';`],
    ['export * from', `export * from '${specifier}';`],
    ['import type', `import type { X } from '${specifier}'; export type Y = X;`],
    ['empty export type from', `export type {} from '${specifier}';`],
    ['dynamic import()', `export const load = () => import('${specifier}');`],
    ['typeof import()', `export type T = typeof import('${specifier}');`],
    ['import x = require()', `import x = require('${specifier}'); export { x };`],
    ['require()', `const x = require('${specifier}'); export { x };`],
    [
      'dynamic import() with a template literal',
      `export const l = () => import(\`${specifier}\`);`,
    ],
    ['require() with a template literal', `const x = require(\`${specifier}\`); export { x };`],
  ].map(([form, code]) => ({ name: `${form} of '${specifier}'`, file: 'unset', code: code! }));

const inFile = (file: string, cases: Case[]): Case[] => cases.map((c) => ({ ...c, file }));

describe('the earlier six experiments (stage 0.3 independent run)', () => {
  const cases: Case[] = [
    {
      name: 'core imports another package by name',
      file: 'packages/core/src/x.ts',
      code: `import '@moviemaker/engine';`,
    },
    {
      name: 'core imports another package by relative path',
      file: 'packages/core/src/x.ts',
      code: `import '../../engine/src/index';`,
    },
    {
      name: 'core adds the DOM library with a lib directive',
      file: 'packages/core/src/x.ts',
      code: `/// <reference lib="dom" />\nexport {};`,
      rule: DIRECTIVE,
    },
    {
      name: 'engine imports the platform implementation by name',
      file: 'packages/engine/src/x.ts',
      code: `import '${platformBrowser}';`,
    },
    {
      name: 'engine imports the platform implementation with import()',
      file: 'packages/engine/src/x.ts',
      code: `export const l = () => import('${platformBrowser}');`,
    },
    {
      name: 'engine imports the platform implementation by relative path',
      file: 'packages/engine/src/x.ts',
      code: `import '${intoBrowserFromEngine}';`,
    },
  ];

  it.each(cases)('rejects: $name', expectRejected);
});

describe('every import form of the platform implementation is rejected', () => {
  describe.each(['engine', 'audio', 'media'])('in packages/%s', (name) => {
    const byName = inFile(`packages/${name}/src/x.ts`, importForms(platformBrowser));
    const byRelativePath = inFile(
      `packages/${name}/src/x.ts`,
      importForms(`../../platform/src/browser/index`),
    );

    it.each([...byName, ...byRelativePath])('rejects $name', expectRejected);
  });
});

describe('A: a template literal without expressions is read like a string', () => {
  const cases = inFile('packages/engine/src/x.ts', [
    {
      name: 'import(`@moviemaker/platform/browser`)',
      file: '',
      code: 'export const l = () => import(`@moviemaker/platform/browser`);',
    },
    {
      name: 'require(`@moviemaker/platform/browser`)',
      file: '',
      code: 'const x = require(`@moviemaker/platform/browser`); export { x };',
    },
    {
      name: 'import(`../../platform/src/browser/index`)',
      file: '',
      code: 'export const l = () => import(`../../platform/src/browser/index`);',
    },
  ]);

  it.each(cases)('rejects $name', expectRejected);
});

describe('B: a path through a node_modules link is rejected even when it stays "inside"', () => {
  const cases: Case[] = [
    {
      name: 'engine into platform through its own node_modules link',
      file: 'packages/engine/src/x.ts',
      code: `import '../node_modules/@moviemaker/platform/src/browser/index';`,
    },
    {
      name: 'engine through node_modules in a nested folder',
      file: 'packages/engine/src/deep/x.ts',
      code: `import '../../node_modules/@moviemaker/platform/src/browser/index';`,
    },
    {
      name: 'ui-kit into the engine root through node_modules',
      file: 'packages/ui-kit/src/x.ts',
      code: `import '../node_modules/@moviemaker/engine/src/index';`,
    },
    {
      name: 'app-state into the platform implementation through node_modules',
      file: 'packages/app-state/src/x.ts',
      code: `import '../node_modules/@moviemaker/platform/src/browser/index';`,
    },
    {
      name: 'a node_modules segment in a path that stays in the package',
      file: 'packages/engine/src/x.ts',
      code: `import './node_modules/x';`,
    },
    {
      name: 'an absolute path into packages/platform',
      file: 'packages/engine/src/x.ts',
      code: `import '${path.join(repoRoot, 'packages/platform/src/browser/index').replaceAll('\\', '/')}';`,
    },
  ];

  it.each(cases)('rejects: $name', expectRejected);
});

describe('C: the @moviemaker scope is compared case-sensitively', () => {
  const cases: Case[] = [
    {
      name: 'engine imports @MovieMaker/platform/browser',
      file: 'packages/engine/src/x.ts',
      code: `import '@MovieMaker/platform/browser';`,
    },
    {
      name: 'engine imports @MOVIEMAKER/platform/browser',
      file: 'packages/engine/src/x.ts',
      code: `import '@MOVIEMAKER/platform/browser';`,
    },
    {
      name: 'ui-kit imports @MovieMaker/engine',
      file: 'packages/ui-kit/src/x.ts',
      code: `import '@MovieMaker/engine';`,
    },
    {
      name: 'core imports @moviemaker/Core',
      file: 'packages/core/src/x.ts',
      code: `import '@moviemaker/Core';`,
    },
    {
      name: 'an app imports @MovieMaker/engine',
      file: 'apps/playground/src/x.ts',
      code: `import '@MovieMaker/engine';`,
    },
  ];

  it.each(cases)('rejects: $name', expectRejected);
});

describe('D: third-party and Node specifiers need an entry in the package allowlist', () => {
  const core = 'packages/core/src/x.ts';
  const cases: Case[] = [
    {
      name: "core: export type {} from 'typescript/lib/lib.dom'",
      file: core,
      code: `export type {} from 'typescript/lib/lib.dom';`,
    },
    {
      name: "core: import 'typescript/lib/lib.dom'",
      file: core,
      code: `import 'typescript/lib/lib.dom';`,
    },
    { name: "core: export type {} from 'node'", file: core, code: `export type {} from 'node';` },
    { name: "core: import 'node'", file: core, code: `import 'node';` },
    { name: "core: import '@types/node'", file: core, code: `import '@types/node';` },
    { name: "core: import 'typescript'", file: core, code: `import 'typescript';` },
    { name: "core: import 'node:fs'", file: core, code: `import 'node:fs';` },
    {
      name: "core: import 'fs' (Node built-in without the prefix)",
      file: core,
      code: `import 'fs';`,
    },
    { name: "core source: import 'vitest'", file: core, code: `import 'vitest';` },
    {
      name: "core test: import 'typescript/lib/lib.dom'",
      file: 'packages/core/src/x.test.ts',
      code: `import 'typescript/lib/lib.dom';`,
    },
    {
      name: "core test: import 'node:fs'",
      file: 'packages/core/src/x.test.ts',
      code: `import 'node:fs';`,
    },
    {
      name: "core test: import 'node:path'",
      file: 'packages/core/src/x.test.ts',
      code: `import 'node:path';`,
    },
    {
      name: "engine source: import 'react'",
      file: 'packages/engine/src/x.ts',
      code: `import 'react';`,
    },
    {
      name: "engine source: import 'vitest'",
      file: 'packages/engine/src/x.ts',
      code: `import 'vitest';`,
    },
    {
      name: 'engine: import a URL specifier',
      file: 'packages/engine/src/x.ts',
      code: `import 'https://example.com/x.js';`,
    },
    {
      name: 'engine: import a package.json imports-map specifier',
      file: 'packages/engine/src/x.ts',
      code: `import '#internal';`,
    },
    {
      name: 'engine: import a Windows drive path',
      file: 'packages/engine/src/x.ts',
      code: `import 'C:/git/easy-movie-maker/packages/platform/src/browser/index';`,
    },
    {
      name: "platform: import '@moviemaker/core'",
      file: 'packages/platform/src/x.ts',
      code: `import '@moviemaker/core';`,
    },
    { name: "ui-kit: import 'vite'", file: 'packages/ui-kit/src/x.ts', code: `import 'vite';` },
    {
      name: "playground source: import 'vite'",
      file: 'apps/playground/src/x.ts',
      code: `import 'vite';`,
    },
    {
      name: "playground unit test: import '@playwright/test'",
      file: 'apps/playground/src/x.test.ts',
      code: `import '@playwright/test';`,
    },
    {
      name: "playground golden spec: import 'vitest'",
      file: 'apps/playground/tests/golden/x.spec.ts',
      code: `import 'vitest';`,
    },
    {
      name: "playground vite.config.ts: import '@playwright/test'",
      file: 'apps/playground/vite.config.ts',
      code: `import '@playwright/test';`,
    },
    {
      name: "playground: import 'typescript'",
      file: 'apps/playground/src/x.ts',
      code: `import 'typescript';`,
    },
  ];

  it.each(cases)('rejects: $name', expectRejected);
});

describe('E: a backslash is a separator on every host', () => {
  const cases: Case[] = [
    {
      name: 'engine relative path with backslashes into platform',
      file: 'packages/engine/src/x.ts',
      code: String.raw`import '..\\..\\platform\\src\\browser\\index';`,
    },
    {
      name: 'engine relative path with backslashes through node_modules',
      file: 'packages/engine/src/x.ts',
      code: String.raw`import '..\\node_modules\\@moviemaker\\platform\\src\\browser\\index';`,
    },
    {
      name: 'engine package name written with backslashes',
      file: 'packages/engine/src/x.ts',
      code: String.raw`import '@moviemaker\\platform\\browser';`,
    },
    {
      name: 'core relative path with backslashes into engine',
      file: 'packages/core/src/x.ts',
      code: String.raw`import '.\\..\\..\\engine\\src\\index';`,
    },
  ];

  it.each(cases)('rejects: $name', expectRejected);
});

describe('F: JavaScript files are checked like TypeScript files', () => {
  const importOf = (extension: string) =>
    extension === 'cjs' ? `require('${platformBrowser}');` : `import '${platformBrowser}';`;
  const cases = ['js', 'jsx', 'mjs', 'cjs'].map((extension) => ({
    name: `engine .${extension} file`,
    file: `packages/engine/src/x.${extension}`,
    code: importOf(extension),
  }));

  it.each(cases)('rejects: $name', expectRejected);

  it('rejects a relative path into the platform implementation in a .js file', () =>
    expectRejected({
      name: '',
      file: 'packages/engine/src/x.js',
      code: `import '${intoBrowserFromEngine}';`,
    }));
});

describe('G: ignore patterns are anchored to package and app roots', () => {
  const folders = ['dist', 'test-results', 'playwright-report'];

  it.each(folders)('lints a %s folder inside packages/engine/src', async (folder) => {
    const ignored = await eslint.isPathIgnored(
      path.join(repoRoot, `packages/engine/src/${folder}/x.ts`),
    );

    expect(ignored).toBe(false);
  });

  it.each(folders)('lints a %s folder inside apps/playground/src', async (folder) => {
    const ignored = await eslint.isPathIgnored(
      path.join(repoRoot, `apps/playground/src/${folder}/x.ts`),
    );

    expect(ignored).toBe(false);
  });

  it.each(folders)('rejects a violating import inside a %s folder in src', (folder) =>
    expectRejected({
      name: folder,
      file: `packages/engine/src/${folder}/x.ts`,
      code: `import '${platformBrowser}';`,
    }),
  );

  it('still ignores the generated dist folder at the package root', async () => {
    const ignored = await eslint.isPathIgnored(path.join(repoRoot, 'packages/engine/dist/x.d.ts'));

    expect(ignored).toBe(true);
  });
});

describe('H: a self-import cannot step out through ".." or a subpath that is not an entry point', () => {
  const cases: Case[] = [
    {
      name: "engine: '@moviemaker/engine/../platform/browser'",
      file: 'packages/engine/src/x.ts',
      code: `import '@moviemaker/engine/../platform/browser';`,
    },
    {
      name: "engine: '@moviemaker/engine/catalog/../../platform/browser'",
      file: 'packages/engine/src/x.ts',
      code: `import '@moviemaker/engine/catalog/../../platform/browser';`,
    },
    {
      name: "engine: '@moviemaker/platform/../platform/browser'",
      file: 'packages/engine/src/x.ts',
      code: `import '@moviemaker/platform/../platform/browser';`,
    },
    {
      name: "engine: '@moviemaker/engine/src/index' (not an entry point)",
      file: 'packages/engine/src/x.ts',
      code: `import '@moviemaker/engine/src/index';`,
    },
    {
      name: "engine: '@moviemaker/core/' with a trailing slash",
      file: 'packages/engine/src/x.ts',
      code: `import '@moviemaker/core/';`,
    },
    {
      name: "an app: '@moviemaker/engine/../platform/browser/../x'",
      file: 'apps/playground/src/x.ts',
      code: `import '@moviemaker/engine/../platform/browser/../x';`,
    },
  ];

  it.each(cases)('rejects: $name', expectRejected);
});

describe('I: inline comments cannot switch the rule off', () => {
  const file = 'packages/engine/src/x.ts';
  const violation = `import '${platformBrowser}';`;
  const cases: Case[] = [
    {
      name: 'eslint-disable for the rule',
      file,
      code: `/* eslint-disable moviemaker/package-boundary */\n${violation}`,
    },
    { name: 'eslint-disable for every rule', file, code: `/* eslint-disable */\n${violation}` },
    {
      name: 'eslint-disable-next-line',
      file,
      code: `// eslint-disable-next-line moviemaker/package-boundary\n${violation}`,
    },
    {
      name: 'eslint-disable-line',
      file,
      code: `${violation} // eslint-disable-line moviemaker/package-boundary`,
    },
    {
      name: 'eslint-disable in an app',
      file: 'apps/playground/src/x.ts',
      code: `/* eslint-disable moviemaker/package-boundary */\nimport 'typescript';`,
    },
    {
      name: 'a rule setting comment',
      file,
      code: `/* eslint moviemaker/package-boundary: "off" */\n${violation}`,
    },
  ];

  it.each(cases)('rejects: $name', expectRejected);
});

describe('every TypeScript and JavaScript file extension is checked', () => {
  const extensions = ['ts', 'tsx', 'mts', 'cts', 'd.ts', 'd.mts', 'd.cts'];
  const cases = extensions.map((extension) => ({
    name: `engine .${extension} file`,
    file: `packages/engine/src/x.${extension}`,
    code: `export type T = typeof import('${platformBrowser}');`,
  }));

  it.each(cases)('rejects: $name', expectRejected);

  it.each(['ts', 'tsx', 'mts', 'cts', 'd.ts'])('accepts an allowed import in .%s', (extension) =>
    expectAccepted({
      name: '',
      file: `packages/engine/src/x.${extension}`,
      code: `export type T = typeof import('@moviemaker/core');`,
    }),
  );
});

describe('test files and other folders are checked', () => {
  const cases: Case[] = [
    {
      name: 'engine .test.ts imports the platform implementation',
      file: 'packages/engine/src/x.test.ts',
      code: `import '${platformBrowser}';`,
    },
    {
      name: 'engine .test.tsx imports the platform implementation',
      file: 'packages/engine/src/x.test.tsx',
      code: `import '${platformBrowser}';`,
    },
    {
      name: 'engine tests/ folder imports the platform implementation',
      file: 'packages/engine/tests/x.ts',
      code: `import '${platformBrowser}';`,
    },
    {
      name: 'core tests import another package',
      file: 'packages/core/src/x.test.ts',
      code: `import '@moviemaker/platform';`,
    },
    {
      name: 'ui-kit imports the engine root',
      file: 'packages/ui-kit/src/x.ts',
      code: `import '@moviemaker/engine';`,
    },
    {
      name: 'ui-kit imports the platform',
      file: 'packages/ui-kit/src/x.ts',
      code: `import '@moviemaker/platform';`,
    },
    {
      name: 'ui-kit imports core',
      file: 'packages/ui-kit/src/x.ts',
      code: `import '@moviemaker/core';`,
    },
    {
      name: 'app-state imports the platform implementation',
      file: 'packages/app-state/src/x.ts',
      code: `import '${platformBrowser}';`,
    },
    {
      name: 'app-state imports the platform implementation by relative path',
      file: 'packages/app-state/src/x.ts',
      code: `import '../../platform/src/browser/index';`,
    },
    {
      name: 'app-state imports fonts',
      file: 'packages/app-state/src/x.ts',
      code: `import '@moviemaker/fonts';`,
    },
    {
      name: 'platform imports another package',
      file: 'packages/platform/src/x.ts',
      code: `import '@moviemaker/engine';`,
    },
    {
      name: 'an app imports a package by relative path',
      file: 'apps/playground/src/x.ts',
      code: `import '../../../packages/engine/src/index';`,
    },
    {
      name: 'an app imports its own node_modules link',
      file: 'apps/playground/src/x.ts',
      code: `import '../node_modules/@moviemaker/platform/src/browser/index';`,
    },
  ];

  it.each(cases)('rejects: $name', expectRejected);
});

describe('triple-slash directives are rejected in package and app source', () => {
  const core = 'packages/core/src/x.ts';
  const cases: Case[] = [
    { name: 'core: lib="dom"', file: core, code: `/// <reference lib="dom" />\nexport {};` },
    {
      name: 'core: lib="dom.iterable"',
      file: core,
      code: `/// <reference lib="dom.iterable" />\nexport {};`,
    },
    { name: 'core: types="node"', file: core, code: `/// <reference types="node" />\nexport {};` },
    {
      name: 'core: path to another package',
      file: core,
      code: `/// <reference path="../../engine/src/index.ts" />\nexport {};`,
    },
    {
      name: 'engine: path to the platform implementation',
      file: 'packages/engine/src/x.ts',
      code: `/// <reference path="${intoBrowserFromEngine}.ts" />\nexport {};`,
    },
    {
      name: 'engine: types="vite/client"',
      file: 'packages/engine/src/x.ts',
      code: `/// <reference types="vite/client" />\nexport {};`,
    },
    {
      name: 'playground: lib="webworker"',
      file: 'apps/playground/src/x.ts',
      code: `/// <reference lib="webworker" />\nexport {};`,
    },
  ];

  it.each(cases)('rejects: $name', (c) => expectRejected({ ...c, rule: DIRECTIVE }));
});

describe('legitimate imports are accepted', () => {
  const cases: Case[] = [
    ...inFile('packages/engine/src/x.ts', [
      { name: 'engine imports core (static)', file: '', code: `import '@moviemaker/core';` },
      {
        name: 'engine imports core (named export-from)',
        file: '',
        code: `export { x } from '@moviemaker/core';`,
      },
      {
        name: 'engine imports the platform root (static)',
        file: '',
        code: `import '@moviemaker/platform';`,
      },
      {
        name: 'engine imports the platform root (import())',
        file: '',
        code: `export const l = () => import('@moviemaker/platform');`,
      },
      {
        name: 'engine imports the platform root (typeof import())',
        file: '',
        code: `export type T = typeof import('@moviemaker/platform');`,
      },
      {
        name: 'engine imports the platform root (import type)',
        file: '',
        code: `import type { X } from '@moviemaker/platform'; export type Y = X;`,
      },
      {
        name: 'engine imports the platform root (require())',
        file: '',
        code: `const x = require('@moviemaker/platform'); export { x };`,
      },
      {
        name: 'engine imports its own catalog by name',
        file: '',
        code: `import '@moviemaker/engine/catalog';`,
      },
      {
        name: 'engine imports its own root by name',
        file: '',
        code: `import '@moviemaker/engine';`,
      },
      {
        name: 'engine imports its own catalog by relative path',
        file: '',
        code: `import './catalog/index';`,
      },
      {
        name: 'engine imports a sibling by relative path with an extension',
        file: '',
        code: `import './y.js';`,
      },
      {
        name: 'engine imports the platform root with a template literal',
        file: '',
        code: 'export const l = () => import(`@moviemaker/platform`);',
      },
    ]),
    {
      name: 'engine imports a module two folders up inside the package',
      file: 'packages/engine/src/deep/x.ts',
      code: `import '../../src/y';`,
    },
    {
      name: 'audio imports core and the platform root',
      file: 'packages/audio/src/x.ts',
      code: `import '@moviemaker/core'; import '@moviemaker/platform';`,
    },
    {
      name: 'media imports core and the platform root',
      file: 'packages/media/src/x.ts',
      code: `import '@moviemaker/core'; import '@moviemaker/platform';`,
    },
    {
      name: 'ui-kit imports app-state',
      file: 'packages/ui-kit/src/x.ts',
      code: `import '@moviemaker/app-state';`,
    },
    {
      name: 'ui-kit imports the engine catalog',
      file: 'packages/ui-kit/src/x.ts',
      code: `import '@moviemaker/engine/catalog';`,
    },
    {
      name: 'app-state imports the engine root',
      file: 'packages/app-state/src/x.ts',
      code: `import '@moviemaker/engine';`,
    },
    {
      name: 'app-state imports the engine catalog',
      file: 'packages/app-state/src/x.ts',
      code: `import '@moviemaker/engine/catalog';`,
    },
    {
      name: 'app-state imports the platform root',
      file: 'packages/app-state/src/x.ts',
      code: `import '@moviemaker/platform';`,
    },
    {
      name: 'core test imports vitest and its own module',
      file: 'packages/core/src/x.test.ts',
      code: `import 'vitest'; import './index';`,
    },
    {
      name: 'core .test.tsx imports vitest',
      file: 'packages/core/src/x.test.tsx',
      code: `import 'vitest';`,
    },
    {
      name: 'engine test imports vitest, core, and its module',
      file: 'packages/engine/src/x.test.ts',
      code: `import 'vitest'; import '@moviemaker/core'; import './index';`,
    },
    {
      name: 'playground imports the platform implementation',
      file: 'apps/playground/src/x.ts',
      code: `import '@moviemaker/platform/browser';`,
    },
    {
      name: 'playground imports every package',
      file: 'apps/playground/src/x.ts',
      code: `import '@moviemaker/engine'; import '@moviemaker/ui-kit'; import '@moviemaker/fonts';`,
    },
    {
      name: 'playground imports its own module by relative path',
      file: 'apps/playground/src/x.ts',
      code: `import './app-info';`,
    },
    {
      name: 'playground unit test imports vitest',
      file: 'apps/playground/src/x.test.ts',
      code: `import 'vitest';`,
    },
    {
      name: 'playground golden spec imports @playwright/test',
      file: 'apps/playground/tests/golden/x.spec.ts',
      code: `import '@playwright/test';`,
    },
    {
      name: 'playground vite.config.ts imports vite',
      file: 'apps/playground/vite.config.ts',
      code: `import 'vite';`,
    },
    {
      name: 'playground playwright.config.ts imports @playwright/test',
      file: 'apps/playground/playwright.config.ts',
      code: `import '@playwright/test';`,
    },
    {
      name: 'core: a file with no imports',
      file: 'packages/core/src/x.ts',
      code: `export const x = 1;`,
    },
  ];

  it.each(cases)('accepts: $name', expectAccepted);
});

describe('Q0.9 to Q0.11: which package may import which entry point of another package', () => {
  const entry = (name: string) => `@moviemaker/${name}`;
  const everyEntry = [
    'core',
    'platform',
    'platform/browser',
    'fonts',
    'engine',
    'engine/catalog',
    'audio',
    'media',
    'app-state',
    'ui-kit',
  ].map(entry);
  // Written out by hand, not read from eslint.config.js, so a change there must change this table too.
  const allowed: Record<string, string[]> = {
    core: [],
    platform: [],
    fonts: [],
    engine: ['core', 'platform', 'fonts'].map(entry),
    audio: ['core', 'platform'].map(entry),
    media: ['core', 'platform'].map(entry),
    'app-state': ['core', 'engine', 'engine/catalog', 'audio', 'media', 'platform'].map(entry),
    'ui-kit': ['app-state', 'engine/catalog', 'fonts'].map(entry),
  };
  const pairs = Object.entries(allowed).flatMap(([from, accepted]) =>
    everyEntry
      .filter((specifier) => !specifier.startsWith(`${entry(from)}/`) && specifier !== entry(from))
      .flatMap((specifier) =>
        ['x.ts', 'x.test.ts'].map((file) => ({
          from,
          specifier,
          file: `packages/${from}/src/${file}`,
          isAccepted: accepted.includes(specifier),
        })),
      ),
  );
  const accepted = pairs.filter((pair) => pair.isAccepted);
  const refused = pairs.filter((pair) => !pair.isAccepted);

  it.each(accepted)('accepts $from -> $specifier in $file', ({ file, specifier }) =>
    expectAccepted({ name: '', file, code: `import '${specifier}';` }),
  );

  it.each(refused)('rejects $from -> $specifier in $file', ({ file, specifier }) =>
    expectRejected({ name: '', file, code: `import '${specifier}';` }),
  );

  it('accepts engine and ui-kit importing fonts, and refuses every other package', () => {
    const importers = pairs
      .filter((pair) => pair.specifier === entry('fonts') && pair.isAccepted)
      .map((pair) => pair.from);

    expect([...new Set(importers)].sort()).toEqual(['engine', 'ui-kit']);
  });

  it('lets fonts import no other entry point', () => {
    const fontsImports = pairs.filter((pair) => pair.from === 'fonts' && pair.isAccepted);

    expect(fontsImports).toEqual([]);
  });

  it.each(['core', 'platform', 'audio', 'media', 'app-state'])(
    'rejects %s importing fonts by relative path',
    (name) =>
      expectRejected({
        name: '',
        file: `packages/${name}/src/x.ts`,
        code: `import '../../fonts/src/index';`,
      }),
  );
});

describe('Q0.12 S1: the platform root cannot reach the browser implementation', () => {
  const rootFiles = [
    'packages/platform/src/x.ts',
    'packages/platform/src/x.test.ts',
    'packages/platform/src/x.js',
    'packages/platform/src/deep/x.ts',
  ];
  const specifiersFor = (file: string) => {
    const up = file.includes('/deep/') ? '..' : '.';
    return [
      platformBrowser,
      `${up}/browser/index`,
      `${up}/browser`,
      `${up}/browser/index.ts`,
      `${up}/browser/deeper/x`,
      `${up}/deep/../browser/index`,
      String.raw`${up}\\browser\\index`,
    ];
  };
  const cases = rootFiles.flatMap((file) =>
    specifiersFor(file).flatMap((specifier) =>
      inFile(file, importForms(specifier)).map((c) => ({ ...c, name: `${file}: ${c.name}` })),
    ),
  );

  it.each(cases)('rejects $name', (c) => expectRejected({ ...c, rule: ISOLATION }));

  it('rejects a path that reaches the browser folder from outside src', () =>
    expectRejected({
      name: '',
      file: 'packages/platform/src/x.ts',
      code: `import '../src/browser/index';`,
      rule: ISOLATION,
    }));

  it('rejects re-exporting the browser implementation from the root index', () =>
    expectRejected({
      name: '',
      file: 'packages/platform/src/index.ts',
      code: `export * from './browser';`,
      rule: ISOLATION,
    }));

  const accepted: Case[] = [
    {
      name: 'a root file imports its own sibling',
      file: 'packages/platform/src/x.ts',
      code: `import './y';`,
    },
    {
      name: 'a root file imports a folder whose name only starts with browser',
      file: 'packages/platform/src/x.ts',
      code: `import './browser-extra/index';`,
    },
    {
      name: 'a root file imports its own root by name',
      file: 'packages/platform/src/x.ts',
      code: `import '@moviemaker/platform';`,
    },
    {
      name: 'the browser implementation imports the platform root by relative path',
      file: 'packages/platform/src/browser/x.ts',
      code: `import '../index';`,
    },
    {
      name: 'the browser implementation imports the platform root by name',
      file: 'packages/platform/src/browser/x.ts',
      code: `import '@moviemaker/platform';`,
    },
    {
      name: 'the browser implementation imports a root sibling by a path leaving its folder',
      file: 'packages/platform/src/browser/deep/x.ts',
      code: `import '../../interfaces';`,
    },
    {
      name: 'the browser implementation imports its own files and its own name',
      file: 'packages/platform/src/browser/x.ts',
      code: `import './y'; import '${platformBrowser}';`,
    },
    {
      name: 'an app imports the browser implementation',
      file: 'apps/playground/src/x.ts',
      code: `import '${platformBrowser}';`,
    },
  ];

  it.each(accepted)('accepts: $name', expectAccepted);
});

describe('Q0.12 S1: the engine catalog cannot reach the rest of the engine', () => {
  const catalogFiles = [
    'packages/engine/src/catalog/x.ts',
    'packages/engine/src/catalog/x.test.ts',
    'packages/engine/src/catalog/x.js',
    'packages/engine/src/catalog/deep/x.ts',
  ];
  const specifiersFor = (file: string) => {
    const up = file.includes('/deep/') ? '../..' : '..';
    return [
      '@moviemaker/engine',
      `${up}/index`,
      `${up}/renderer/x`,
      `${up}/index.ts`,
      `${up}/catalog/../renderer/x`,
      `${up}/../src/index`,
      String.raw`${up}\\index`,
    ];
  };
  const cases = catalogFiles.flatMap((file) =>
    specifiersFor(file).flatMap((specifier) =>
      inFile(file, importForms(specifier)).map((c) => ({ ...c, name: `${file}: ${c.name}` })),
    ),
  );

  it.each(cases)('rejects $name', (c) => expectRejected({ ...c, rule: ISOLATION }));

  it('rejects a sibling folder whose name starts with catalog', () =>
    expectRejected({
      name: '',
      file: 'packages/engine/src/catalog/x.ts',
      code: `import '../catalog-extra/x';`,
      rule: ISOLATION,
    }));

  const accepted: Case[] = [
    {
      name: 'the catalog imports its own sibling',
      file: 'packages/engine/src/catalog/x.ts',
      code: `import './y';`,
    },
    {
      name: 'the catalog imports a file in its own subfolder',
      file: 'packages/engine/src/catalog/x.ts',
      code: `import './deep/z';`,
    },
    {
      name: 'a nested catalog file imports a catalog sibling by a path leaving its folder',
      file: 'packages/engine/src/catalog/deep/x.ts',
      code: `import '../y';`,
    },
    {
      name: 'the catalog imports its own entry point by name',
      file: 'packages/engine/src/catalog/x.ts',
      code: `import '@moviemaker/engine/catalog';`,
    },
    {
      name: 'the catalog imports core and the platform root',
      file: 'packages/engine/src/catalog/x.ts',
      code: `import '@moviemaker/core'; import '@moviemaker/platform';`,
    },
    {
      name: 'the engine root imports the catalog by relative path',
      file: 'packages/engine/src/x.ts',
      code: `import './catalog/index';`,
    },
    {
      name: 'the engine root re-exports the catalog by name',
      file: 'packages/engine/src/index.ts',
      code: `export * from '@moviemaker/engine/catalog';`,
    },
    {
      name: 'engine code outside the catalog imports its own root by name',
      file: 'packages/engine/src/renderer/x.ts',
      code: `import '@moviemaker/engine';`,
    },
    {
      name: 'ui-kit imports the catalog by name',
      file: 'packages/ui-kit/src/x.ts',
      code: `import '@moviemaker/engine/catalog';`,
    },
  ];

  it.each(accepted)('accepts: $name', expectAccepted);
});

const packageNames = [
  'core',
  'platform',
  'fonts',
  'engine',
  'audio',
  'media',
  'app-state',
  'ui-kit',
];
const everyExtension = ['ts', 'tsx', 'mts', 'cts', 'js', 'jsx', 'mjs', 'cjs'];
const absoluteIn = (folder: string) => path.join(repoRoot, folder).replaceAll('\\', '/');

describe('Q0.13: package files under src/ import by relative path only inside their own src/', () => {
  const routeOne = [
    {
      name: "route 1: platform's index re-exports a file under tests/",
      file: 'packages/platform/src/index.ts',
      code: `export * from '../tests/x';`,
    },
    {
      name: 'route 2: the catalog imports a file under tests/',
      file: 'packages/engine/src/catalog/index.ts',
      code: `export * from '../../tests/x';`,
    },
    {
      name: 'route 3: the catalog imports a file at the engine package root',
      file: 'packages/engine/src/catalog/index.ts',
      code: `export * from '../../x';`,
    },
    {
      name: 'a src file imports a file at the package root',
      file: 'packages/engine/src/x.ts',
      code: `import '../x';`,
    },
    {
      name: 'a nested src file imports a file under tests/',
      file: 'packages/engine/src/deep/x.ts',
      code: `import '../../tests/x';`,
    },
    {
      name: 'a nested src file imports the package root folder',
      file: 'packages/engine/src/deep/x.ts',
      code: `import '../..';`,
    },
    {
      name: 'a src file imports the package folder itself',
      file: 'packages/engine/src/x.ts',
      code: `import '..';`,
    },
    {
      name: 'a src file steps out and back into src/ through tests/',
      file: 'packages/engine/src/x.ts',
      code: `import '../tests/../src/../tests/x';`,
    },
    {
      name: 'a src test file imports a file under tests/',
      file: 'packages/engine/src/x.test.ts',
      code: `import '../tests/x';`,
    },
    {
      name: 'an absolute path into tests/',
      file: 'packages/engine/src/x.ts',
      code: `import '${absoluteIn('packages/engine/tests/x')}';`,
    },
    {
      name: 'an absolute path to the package root',
      file: 'packages/engine/src/x.ts',
      code: `import '${absoluteIn('packages/engine/x')}';`,
    },
    {
      name: 'a backslash path into tests/',
      file: 'packages/engine/src/x.ts',
      code: String.raw`import '..\\tests\\x';`,
    },
    {
      name: 'a path to the package.json',
      file: 'packages/engine/src/x.ts',
      code: `import '../package.json';`,
    },
  ];

  it.each(routeOne)('rejects: $name', expectRejected);

  const everyForm = packageNames.flatMap((name) =>
    ['x.ts', 'x.test.ts', 'deep/x.ts'].flatMap((file) => {
      const up = file.startsWith('deep/') ? '../..' : '..';
      return [`${up}/tests/x`, `${up}/x`].flatMap((specifier) =>
        inFile(`packages/${name}/src/${file}`, importForms(specifier)).map((c) => ({
          ...c,
          name: `${name}/src/${file}: ${c.name}`,
        })),
      );
    }),
  );

  it.each(everyForm)('rejects $name', expectRejected);

  const everyFileExtension = everyExtension.flatMap((extension) => [
    {
      name: `.${extension} under src/`,
      file: `packages/engine/src/x.${extension}`,
      code: extension === 'cjs' ? `require('../tests/x');` : `import '../tests/x';`,
    },
    {
      name: `.${extension} under src/catalog/`,
      file: `packages/engine/src/catalog/x.${extension}`,
      code: extension === 'cjs' ? `require('../../x');` : `import '../../x';`,
    },
  ]);

  it.each(everyFileExtension)('rejects a path out of src/ in a $name', expectRejected);

  const accepted: Case[] = [
    {
      name: 'src imports a sibling',
      file: 'packages/engine/src/x.ts',
      code: `import './y';`,
    },
    {
      name: 'src imports a file in a subfolder',
      file: 'packages/engine/src/x.ts',
      code: `import './deep/y';`,
    },
    {
      name: 'a nested file imports its parent folder',
      file: 'packages/engine/src/deep/x.ts',
      code: `import '../y';`,
    },
    {
      name: 'a nested file imports src/ itself',
      file: 'packages/engine/src/deep/x.ts',
      code: `import '..';`,
    },
    {
      name: 'a deeply nested file imports a path through src/',
      file: 'packages/engine/src/a/b/x.ts',
      code: `import '../../../src/y';`,
    },
    {
      name: 'a catalog file imports a catalog sibling',
      file: 'packages/engine/src/catalog/x.ts',
      code: `import './y'; import './deep/z';`,
    },
    {
      name: 'the engine root imports the catalog',
      file: 'packages/engine/src/x.ts',
      code: `import './catalog/index';`,
    },
    {
      name: 'a src test imports the module it tests',
      file: 'packages/engine/src/x.test.ts',
      code: `import 'vitest'; import './x';`,
    },
    {
      name: 'a nested src test imports a module in src/',
      file: 'packages/engine/src/deep/x.test.ts',
      code: `import 'vitest'; import '../index';`,
    },
    {
      name: 'a src .tsx file imports a sibling',
      file: 'packages/ui-kit/src/x.tsx',
      code: `import './y';`,
    },
    {
      name: 'a src .js file imports a sibling',
      file: 'packages/engine/src/x.js',
      code: `import './y.js';`,
    },
    {
      name: 'a src .cjs file requires a sibling',
      file: 'packages/engine/src/x.cjs',
      code: `require('./y.cjs');`,
    },
    {
      name: 'a src file whose path contains an extra dot segment',
      file: 'packages/engine/src/deep/x.ts',
      code: `import './../y';`,
    },
    {
      name: 'a src file imports a folder whose name starts with src',
      file: 'packages/engine/src/x.ts',
      code: `import './src-extra/y';`,
    },
    {
      name: 'the platform browser implementation imports a root sibling',
      file: 'packages/platform/src/browser/x.ts',
      code: `import '../interfaces';`,
    },
  ];

  it.each(accepted)('accepts: $name', expectAccepted);

  it("keeps the other packages' imports by name working next to a relative path", () =>
    expectAccepted({
      name: '',
      file: 'packages/engine/src/x.ts',
      code: `import '@moviemaker/core'; import './y';`,
    }));
});

describe('Q0.13: files outside src/ reach their package by name, not by a path into src/', () => {
  const rejects = (cases: Case[]) =>
    it.each(cases)('rejects: $name', (c) => expectRejected({ rule: ISOLATION, ...c }));

  rejects([
    {
      name: 'route 4: a package-root file imports the browser implementation',
      file: 'packages/platform/x.ts',
      code: `import './src/browser/index';`,
    },
    {
      name: 'route 4: a test imports the engine root by path',
      file: 'packages/engine/tests/x.ts',
      code: `import '../src/index';`,
    },
    {
      name: 'a test imports the engine catalog by path',
      file: 'packages/engine/tests/x.ts',
      code: `import '../src/catalog/index';`,
    },
    {
      name: 'a test imports the src folder',
      file: 'packages/engine/tests/x.ts',
      code: `import '../src';`,
    },
    {
      name: 'a nested test imports src by path',
      file: 'packages/engine/tests/deep/x.ts',
      code: `import '../../src/index';`,
    },
    {
      name: 'a test steps through tests/ into src/',
      file: 'packages/engine/tests/x.ts',
      code: `import '../tests/../src/index';`,
    },
    {
      name: 'a package-root file imports the src folder',
      file: 'packages/engine/x.ts',
      code: `import './src';`,
    },
    {
      name: 'a package-root .js file imports src',
      file: 'packages/engine/x.js',
      code: `import './src/index.js';`,
    },
    {
      name: 'a package-root .cjs file requires src',
      file: 'packages/engine/x.cjs',
      code: `require('./src/index.js');`,
    },
    {
      // A Windows drive path is not a path to the rules but a specifier outside the allowlist.
      name: 'a test imports src by an absolute path',
      file: 'packages/engine/tests/x.ts',
      code: `import '${absoluteIn('packages/engine/src/index')}';`,
      rule: absoluteIn('').startsWith('/') ? ISOLATION : BOUNDARY,
    },
    {
      name: 'a test imports src by a backslash path',
      file: 'packages/engine/tests/x.ts',
      code: String.raw`import '..\\src\\index';`,
    },
    {
      name: 'a nested package-root folder imports src',
      file: 'packages/engine/config/x.ts',
      code: `import '../src/index';`,
    },
  ]);

  const everyForm = packageNames.flatMap((name) =>
    [
      ['tests/x.ts', '../src/index'],
      ['tests/deep/x.ts', '../../src/index'],
      ['x.ts', './src/index'],
      ['x.test.ts', './src/index'],
    ].flatMap(([file, specifier]) =>
      inFile(`packages/${name}/${file}`, importForms(specifier!)).map((c) => ({
        ...c,
        name: `${name}/${file}: ${c.name}`,
      })),
    ),
  );

  it.each(everyForm)('rejects $name', (c) => expectRejected({ ...c, rule: ISOLATION }));

  const everyFileExtension = everyExtension.flatMap((extension) => [
    {
      name: `.${extension} under tests/`,
      file: `packages/engine/tests/x.${extension}`,
      code: extension === 'cjs' ? `require('../src/index');` : `import '../src/index';`,
    },
    {
      name: `.${extension} at the package root`,
      file: `packages/engine/x.${extension}`,
      code: extension === 'cjs' ? `require('./src/index');` : `import './src/index';`,
    },
  ]);

  it.each(everyFileExtension)('rejects a path into src/ in a $name', (c) =>
    expectRejected({ ...c, rule: ISOLATION }),
  );

  it("still rejects a test importing another package's src by path", () =>
    expectRejected({
      name: '',
      file: 'packages/engine/tests/x.ts',
      code: `import '../../platform/src/browser/index';`,
    }));

  const accepted: Case[] = [
    {
      name: 'a test imports its package root by name',
      file: 'packages/engine/tests/x.ts',
      code: `import 'vitest'; import '@moviemaker/engine';`,
    },
    {
      name: 'a test imports the engine catalog by name',
      file: 'packages/engine/tests/x.ts',
      code: `import '@moviemaker/engine/catalog';`,
    },
    {
      name: 'a test imports the platform browser implementation by name',
      file: 'packages/platform/tests/x.ts',
      code: `import '${platformBrowser}';`,
    },
    {
      name: 'a nested test imports its package by name',
      file: 'packages/engine/tests/deep/x.ts',
      code: `import '@moviemaker/engine';`,
    },
    {
      name: 'a test imports a sibling under tests/',
      file: 'packages/engine/tests/x.ts',
      code: `import './helpers'; import '../tests/helpers';`,
    },
    {
      name: 'a nested test imports a helper in the parent tests/ folder',
      file: 'packages/engine/tests/deep/x.ts',
      code: `import '../helpers';`,
    },
    {
      name: 'a test imports a folder whose name starts with src',
      file: 'packages/engine/tests/x.ts',
      code: `import '../src-fixtures/x';`,
    },
    {
      name: 'a package-root file imports a sibling',
      file: 'packages/engine/x.ts',
      code: `import './y';`,
    },
    {
      name: 'a package-root file imports a folder whose name starts with src',
      file: 'packages/engine/x.ts',
      code: `import './srcx/y';`,
    },
    {
      name: 'a package-root file imports its package by name',
      file: 'packages/engine/x.ts',
      code: `import '@moviemaker/engine'; import '@moviemaker/core';`,
    },
    {
      name: 'a test imports core by name',
      file: 'packages/engine/tests/x.ts',
      code: `import '@moviemaker/core';`,
    },
  ];

  it.each(accepted)('accepts: $name', expectAccepted);

  it('lets the apps keep importing files across their own folders', async () => {
    const cases: Case[] = [
      {
        name: 'a golden spec imports a module under src/ by relative path',
        file: 'apps/playground/tests/golden/x.spec.ts',
        code: `import '@playwright/test'; import '../../src/app-info';`,
      },
      {
        name: 'the vite configuration imports a module under src/ by relative path',
        file: 'apps/playground/vite.config.ts',
        code: `import 'vite'; import './src/app-info';`,
      },
      {
        name: 'a unit test imports its module',
        file: 'apps/playground/src/x.test.ts',
        code: `import 'vitest'; import './app-info';`,
      },
    ];

    for (const c of cases) await expectAccepted(c);
  });
});

describe('Q0.13: the repository has no file that the new rules would reject', () => {
  it('lints every existing package and app file without a boundary or isolation error', async () => {
    const results = await eslint.lintFiles(['packages/**/*', 'apps/**/*']);
    const errors = results.flatMap((result) =>
      result.messages
        .filter((message) => message.ruleId === BOUNDARY || message.ruleId === ISOLATION)
        .map((message) => `${result.filePath}: ${message.message}`),
    );

    expect(errors).toEqual([]);
  });
});
