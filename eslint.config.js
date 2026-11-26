import fs from 'node:fs';
import path from 'node:path';

import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

// TypeScript enforces only the edges between packages (project references) and core's lib without DOM.
// ESLint alone enforces the rest: for every package and app, an allowlist of exact specifiers (architecture section 4).
// A specifier that is not on the list fails, so adding any dependency is an explicit edit here, which needs approval (AGENTS.md).
// Every listed specifier is compared exactly: no case folding, subpath, query, or '..' segment is accepted.

// The entry points of each package (its package.json exports). Only these can be imported by name.
const entryPoints = {
  core: ['@moviemaker/core'],
  platform: ['@moviemaker/platform', '@moviemaker/platform/browser'],
  fonts: ['@moviemaker/fonts'],
  engine: ['@moviemaker/engine', '@moviemaker/engine/catalog'],
  audio: ['@moviemaker/audio'],
  media: ['@moviemaker/media'],
  'app-state': ['@moviemaker/app-state'],
  'ui-kit': ['@moviemaker/ui-kit'],
};
// Besides its own entry points, each package may import only these @moviemaker specifiers.
const allowedImports = {
  core: [],
  platform: [],
  fonts: [],
  // Only the platform interfaces (package root), never '@moviemaker/platform/browser' or another implementation.
  // fonts: the engine loads the bundled font set into its worker (Phase 0 Q0.9).
  engine: ['@moviemaker/core', '@moviemaker/platform', '@moviemaker/fonts'],
  audio: ['@moviemaker/core', '@moviemaker/platform'],
  media: ['@moviemaker/core', '@moviemaker/platform'],
  'app-state': [
    '@moviemaker/core',
    '@moviemaker/engine',
    '@moviemaker/engine/catalog',
    '@moviemaker/audio',
    '@moviemaker/media',
    '@moviemaker/platform',
  ],
  // Only app-state, the engine's preset catalog metadata (never the renderer), and fonts for font pickers (Q0.9).
  'ui-kit': ['@moviemaker/app-state', '@moviemaker/engine/catalog', '@moviemaker/fonts'],
};
// Entry point isolation: a package's entry points must not reach each other internally, by relative path or by its own name.
// Each row says: files of `from` may not import `to`. A part is a folder of the package, or a folder minus one subfolder.
// The reverse direction is not listed, so it stays allowed. A future package adds a row here and nothing else.
const entryIsolation = [
  {
    package: 'platform',
    from: { folder: 'src', except: 'src/browser' },
    to: { folder: 'src/browser', names: ['@moviemaker/platform/browser'] },
    reason:
      'the platform root must not reach the browser implementation, so only apps import it (S1, Q0.12)',
  },
  {
    package: 'engine',
    from: { folder: 'src/catalog' },
    to: { folder: 'src', except: 'src/catalog', names: ['@moviemaker/engine'] },
    reason: 'the engine catalog must not reach the renderer or the engine root (S1, Q0.12)',
  },
];
// Package source imports no third-party or Node specifier; only tests import 'vitest'.
const packageTestImports = ['vitest'];

// Apps may import every entry point of every package, and each lists its own third-party specifiers.
const everyEntryPoint = Object.values(entryPoints).flat();
const apps = {
  playground: {
    unitTest: ['vitest'],
    golden: ['@playwright/test'],
    configs: { 'vite.config': ['vite'], 'playwright.config': ['@playwright/test'] },
  },
};

const tsExtensions = 'ts,tsx,mts,cts';
const allExtensions = `${tsExtensions},js,jsx,mjs,cjs`;

const staticValue = (node) => {
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node?.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis[0].value.cooked;
  }
  return undefined;
};

// The path with symlinks resolved, using the nearest existing ancestor for a path that does not exist yet.
const realPath = (target) => {
  let rest = '';
  let current = target;
  for (;;) {
    try {
      return path.join(fs.realpathSync(current), rest);
    } catch {
      const parent = path.dirname(current);
      if (parent === current) return target;
      rest = path.join(path.basename(current), rest);
      current = parent;
    }
  }
};

const isInside = (root, target) => {
  const relative = path.relative(root, target);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
};

// Calls check(node, specifier) for every import form: static, export-from, import(), import type, import x = require(), require().
const visitImportForms = (check) => ({
  ImportDeclaration: (node) => check(node.source, staticValue(node.source)),
  ExportAllDeclaration: (node) => check(node.source, staticValue(node.source)),
  ExportNamedDeclaration: (node) => node.source && check(node.source, staticValue(node.source)),
  ImportExpression: (node) => check(node.source, staticValue(node.source)),
  TSImportType: (node) => check(node, staticValue(node.source)),
  TSExternalModuleReference: (node) => check(node.expression, staticValue(node.expression)),
  CallExpression: (node) => {
    if (node.callee.type === 'Identifier' && node.callee.name === 'require') {
      check(node.arguments[0] ?? node, staticValue(node.arguments[0]));
    }
  },
});

const packageBoundary = {
  meta: {
    type: 'problem',
    schema: [
      {
        type: 'object',
        properties: {
          root: { type: 'string' },
          name: { type: 'string' },
          allowed: { type: 'array', items: { type: 'string' } },
        },
        required: ['root', 'name', 'allowed'],
        additionalProperties: false,
      },
    ],
    messages: {
      leavesRoot:
        "'{{specifier}}' reaches outside {{name}}; import another package by its @moviemaker name (architecture section 4).",
      throughNodeModules:
        "'{{specifier}}' goes through a node_modules folder; import by package name instead (architecture section 4).",
      notAllowed:
        "{{name}} may import only: {{allowed}} (architecture section 4); got '{{specifier}}'.",
    },
  },
  create(context) {
    const { root, name, allowed } = context.options[0];
    const realRoot = realPath(root);
    const check = (node, rawSpecifier) => {
      if (typeof rawSpecifier !== 'string') return;
      // A backslash is a separator on Windows only; treat it as one everywhere so the rule never depends on the host.
      const specifier = rawSpecifier.replaceAll('\\', '/');
      const data = { specifier: rawSpecifier, name, allowed: allowed.join(', ') || 'nothing' };
      if (specifier.startsWith('.') || specifier.startsWith('/')) {
        if (specifier.split('/').includes('node_modules')) {
          context.report({ node, messageId: 'throughNodeModules', data });
          return;
        }
        const target = path.resolve(path.dirname(context.filename), specifier);
        if (!isInside(root, target) || !isInside(realRoot, realPath(target))) {
          context.report({ node, messageId: 'leavesRoot', data });
        }
        return;
      }
      if (!allowed.includes(specifier)) context.report({ node, messageId: 'notAllowed', data });
    };
    return visitImportForms(check);
  },
};

// Reports an import that reaches `target` (a folder, minus an optional subfolder, or one of its package names).
const entryIsolationRule = {
  meta: {
    type: 'problem',
    schema: [
      {
        type: 'object',
        properties: {
          target: {
            type: 'object',
            properties: {
              folder: { type: 'string' },
              except: { type: 'string' },
              names: { type: 'array', items: { type: 'string' } },
            },
            required: ['folder', 'names'],
            additionalProperties: false,
          },
          reason: { type: 'string' },
        },
        required: ['target', 'reason'],
        additionalProperties: false,
      },
    ],
    messages: { crossesEntryPoints: "{{reason}} (architecture section 4); got '{{specifier}}'." },
  },
  create(context) {
    const { target, reason } = context.options[0];
    const within = (folder, except, file) =>
      isInside(folder, file) && !(except && isInside(except, file));
    const reaches = (file) =>
      within(target.folder, target.except, file) ||
      within(realPath(target.folder), target.except && realPath(target.except), realPath(file));
    const check = (node, rawSpecifier) => {
      if (typeof rawSpecifier !== 'string') return;
      const specifier = rawSpecifier.replaceAll('\\', '/');
      const isPath = specifier.startsWith('.') || specifier.startsWith('/');
      const hit = isPath
        ? reaches(path.resolve(path.dirname(context.filename), specifier))
        : target.names.includes(specifier);
      if (hit) {
        context.report({
          node,
          messageId: 'crossesEntryPoints',
          data: { reason, specifier: rawSpecifier },
        });
      }
    };
    return visitImportForms(check);
  },
};

// A directive could pull in the DOM or Node types, or a file from another package, without an import.
const noDirectives = ['error', { lib: 'never', path: 'never', types: 'never' }];

const boundaryRules = (kind, directory, name, allowed) => ({
  'moviemaker/package-boundary': [
    'error',
    { root: path.resolve(import.meta.dirname, directory, name), name: `${kind}/${name}`, allowed },
  ],
});

// Inline comments cannot switch the rule off in the code it protects.
const guarded = {
  plugins: {
    moviemaker: {
      rules: { 'package-boundary': packageBoundary, 'entry-isolation': entryIsolationRule },
    },
  },
  linterOptions: { noInlineConfig: true },
};

// Later entries override earlier ones for the files they match: source, then tests, then app-specific files.
const dependencyRules = [
  ...Object.keys(allowedImports).flatMap((name) => {
    const root = `packages/${name}`;
    const allowed = [...entryPoints[name], ...allowedImports[name]];
    const rules = (bare) => boundaryRules('packages', 'packages', name, [...allowed, ...bare]);
    return [
      {
        ...guarded,
        files: [`${root}/**/*.{${tsExtensions}}`, `${root}/{src,tests}/**/*.{${allExtensions}}`],
        rules: { ...rules([]), '@typescript-eslint/triple-slash-reference': noDirectives },
      },
      {
        ...guarded,
        files: [`${root}/**/*.test.{${allExtensions}}`, `${root}/tests/**/*.{${allExtensions}}`],
        rules: rules(packageTestImports),
      },
    ];
  }),
  ...entryIsolation.map(({ package: name, from, to, reason }) => {
    const root = path.resolve(import.meta.dirname, 'packages', name);
    const target = {
      folder: path.resolve(root, to.folder),
      ...(to.except && { except: path.resolve(root, to.except) }),
      names: to.names,
    };
    return {
      ...guarded,
      files: [`packages/${name}/${from.folder}/**/*.{${allExtensions}}`],
      ignores: from.except ? [`packages/${name}/${from.except}/**`] : [],
      rules: { 'moviemaker/entry-isolation': ['error', { target, reason }] },
    };
  }),
  ...Object.entries(apps).flatMap(([name, { unitTest, golden, configs }]) => {
    const root = `apps/${name}`;
    const rules = (bare) => boundaryRules('apps', 'apps', name, [...everyEntryPoint, ...bare]);
    return [
      {
        ...guarded,
        files: [`${root}/**/*.{${tsExtensions}}`, `${root}/{src,tests}/**/*.{${allExtensions}}`],
        rules: { ...rules([]), '@typescript-eslint/triple-slash-reference': noDirectives },
      },
      { ...guarded, files: [`${root}/**/*.test.{${allExtensions}}`], rules: rules(unitTest) },
      {
        ...guarded,
        files: [`${root}/tests/**/*.{${allExtensions}}`, `${root}/**/*.spec.{${allExtensions}}`],
        rules: rules(golden),
      },
      ...Object.entries(configs).map(([file, bare]) => ({
        ...guarded,
        files: [`${root}/${file}.{${allExtensions}}`],
        rules: rules(bare),
      })),
    ];
  }),
];

export default defineConfig(
  // Anchored to package and app roots: a dist, test-results, or playwright-report folder inside src is still linted.
  globalIgnores([
    'dist/**',
    'packages/*/dist/**',
    'apps/*/dist/**',
    'apps/*/playwright-report/**',
    'apps/*/test-results/**',
    'docs/**',
    'prototypes/**',
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  ...dependencyRules,
);
