---
description: Testing conventions for MovieMaker unit, golden-frame, audio, export smoke, and device tests.
applyTo: "packages/**/*.test.ts, packages/**/*.test.tsx, apps/**/*.test.ts, apps/**/*.test.tsx, apps/**/*.spec.ts, packages/**/tests/**, apps/**/tests/**, tools/**/*.test.ts"
---

# Test conventions

> **Maintenance — owner: Planner. Mode: routed.**
> If a convention here is wrong or missing, say so in your report and name the section; do not
> edit it yourself.

These rules apply to test files and complement [AGENTS.md](../../AGENTS.md).

> **Only placeholder tests and the lint-rule regression tests exist** (Phase 0). The layout and
> commands below are what they established. Conventions for naming, fixtures, and golden frames are
> added by the change that writes the first real test of each level, not invented ahead of it.

## Layout and commands

- **Unit and audio tests are colocated** with the code: `src/**/*.test.ts` or `src/**/*.test.tsx`
  in the package or app. Vitest collects only those patterns in package and app projects. Each
  package's `tsconfig.json` excludes test files, and its `tsconfig.test.json` typechecks them. A
  file under a package's `tests/` folder would be linted but neither run nor typechecked; the
  change that adds the first one adds both.
- **Import Vitest explicitly**: `import { describe, expect, it } from 'vitest'`. No globals.
- **Test imports are allowlisted** in `eslint.config.js` (architecture §4), and the comparison is
  exact. Colocated package tests may import `vitest`, the `@moviemaker` entry points their
  package may import, and, by relative path, only files inside their package's `src/`. A file of
  a package outside `src/` (under `tests/` or at the package root) may import other such files by
  relative path, and its own package only by name, never by a path into `src/` (interim until
  Phase 0 Q0.14 is answered). The playground allows `vitest` in unit tests and
  `@playwright/test` in `tests/` and `*.spec.*` files. Any other specifier fails `pnpm lint`,
  including a Node built-in such as `node:path` and a subpath such as `vitest/config`, until it is
  added to that file group's list. A third-party package is a new dependency and needs approval
  first (AGENTS.md *What to ask before doing*).
- **One Vitest project per package and app**, declared in the root `vitest.config.ts`, plus the
  `lint-rules` project for `tools/lint/`.
- **Registering a new package takes four places:** `packages` in `vitest.config.ts`, its tsconfigs
  in the root `tsconfig.json`, and in `eslint.config.js` both `entryPoints` (its `exports`) and
  `allowedImports` (what it may import). **A new app takes three:** `apps` in `vitest.config.ts`,
  its tsconfigs in the root `tsconfig.json`, and `apps` in `eslint.config.js` with the third-party
  specifiers of each of its file groups. Without its `eslint.config.js` entry a package or app gets
  no dependency-rule check, and nothing fails. A package with a second entry point also needs a
  row in `entryIsolation` in `eslint.config.js`, or nothing keeps its entry points apart inside
  it. A new package also goes into the hand-written table and into `packageNames` in
  `tools/lint/package-boundary.test.ts` (below), or its edges and its `src/` path limit are not
  tested.
- **Lint-rule regression tests** live in `tools/lint/`, as the Vitest project `lint-rules`,
  typechecked through `tsconfig.tools.json`:
  - `package-boundary.test.ts` runs the real ESLint with the repository's `eslint.config.js` over
    code at real package and app paths, and asserts which imports are rejected, by which rule
    (`moviemaker/package-boundary`, `moviemaker/entry-isolation`, or
    `@typescript-eslint/triple-slash-reference`), and which are accepted. It holds one group per
    bypass found so far; a table, written out by hand rather than read from the configuration,
    of which package may import which entry point of another, checked in a source and a test
    file; and, for each `entryIsolation` row, every import form of every specifier that reaches
    the other entry point, in a source file, a test, a `.js` file, and a nested file, plus the
    allowed directions. For Phase 0 Q0.13 it holds, in every package, every import form of a path
    out of `src/` (from a source file, a test, and a nested file) and of a path into `src/` from
    files outside it; the same in each file extension, in `engine`; the allowed paths; and one
    test that lints every existing package and app file and expects no error from either rule.
  - `eslint-config-files.test.ts` fails if any `eslint.config.*` other than the root one exists,
    matching the name in any letter case (ESLint loads a differently cased name on Windows; on
    Linux the test is stricter than ESLint). It walks the repository and skips exactly the folders
    that `globalIgnores` in `eslint.config.js` ignores, `docs/` aside: the root `dist`,
    `packages/*/dist`, `apps/*/dist`, `apps/*/playwright-report`, `apps/*/test-results`, and the
    root `prototypes/`; plus `node_modules` at any depth and the root `.git`. It still searches
    `docs/`, so a configuration there is reported although ESLint would not use it. A test asks
    the real ESLint about 35 generated-folder paths and fails if it and the skip list disagree, so
    a change to `globalIgnores` that covers one of them fails until the skip list follows. The file
    also tests its own search on temporary folder trees.
  - A change to the dependency rules or to `entryIsolation` updates or adds cases there, and a
    bypass that is found gets a rejecting case in the same change as its fix.
- **Every project runs in Vitest's Node environment.** For `core` this is a rule (below).
- **Golden-frame specs live in `apps/playground/tests/golden`**, the Playwright `testDir` in
  `apps/playground/playwright.config.ts`. Playwright browsers are not installed until Phase 2.
- **Commands** run from the repository root: `pnpm test` runs every Vitest project, and
  `pnpm test:golden` runs the Playwright specs (AGENTS.md *Definition of done*).

## Test levels

The levels and their tools are defined in architecture §14.2. Pick the lowest level that can prove
the behaviour.

| Level | Proves | Tool |
|---|---|---|
| Unit | Commands, Fit to Music, timing, soft anchors, edit plan compiler, migrations, envelopes | Vitest |
| Golden frame | `renderFrame` output for every preset and pipeline step, within a tolerance | Playwright in the playground |
| Audio | Mixer output at sample level: envelopes, speed mapping, ducking, levels | Vitest |
| Export smoke | Exported files have the right duration, frame count, and A/V sync | Playwright, Electron |
| Device | Behaviour on real Android devices and WebView versions | Manual and scripted |

## Rules the architecture already fixes

- **One behaviour per test**, Arrange / Act / Assert separated by blank lines. Assert on observable
  results — the returned revision, the edit plan, the rendered pixels, the mixed samples — not on
  which functions were called.
- **`core` tests run without a DOM.** `core` has no DOM or platform dependency (architecture §4), so
  its tests use Vitest's Node environment. A `core` test that needs `jsdom` means `core` broke its
  rule.
- **Time is integer microseconds** in fixtures and assertions. Do not compare durations as
  floating-point seconds; compare the integers the model stores.
- **Every command gets an undo test**: applying it and undoing it returns the original revision.
  Compound commands (Fit to Music, apply-to-all) are one undo step.
- **Every soft-anchor rule in architecture §5.2 is pinned by a unit test** — re-anchoring, clamping,
  caption shortening and removal, narration re-anchoring — because a reorder breaks them silently.
- **Every migration is tested** from a stored fixture of the previous `schemaVersion`. Fixtures are
  never edited after they are committed; they are what old project files look like.
- **Unknown presets** are tested: an unrecognised ID survives load and save, and compiles to the
  neutral fallback with a diagnostic (architecture §5.2).
- **Golden frames compare within a tolerance**, never exactly, because GPUs differ (architecture
  §8.1). A reference image is updated only when a preset gets a new version; the old version's
  reference stays.
- **No sleeps.** Use fake timers for code you drive; poll a real clock under a bounded timeout only
  for work you cannot drive (workers, encoders, a device).
- **Device results are reported as observed only when a device test actually ran.** Emulators lack
  hardware codecs (architecture §14.2), so an emulator run does not count as device verification for
  decode, encode, or A/V sync.
