# Phase 0 — Workspace Scaffold

**Status:** In progress · Part of the walking skeleton · [Roadmap](roadmap.md)

## 1. Goal and scope

Create the empty monorepo the rest of the work builds on, with the checks the code-phase definition
of done needs (AGENTS.md).

**In scope:** pnpm workspace, strict TypeScript, Vite, Vitest, Playwright, lint, the package and app
folders from architecture §4, enforced dependency rules, and the gate commands.

**Out of scope:** any product code, Electron, Capacitor, and runtime libraries.

## 2. Progress

| Stage | Title | Status |
|---|---|---|
| 0.1 | Root workspace and toolchain | In progress — dependencies approved 2026-11-26 (Q0.7 a); the scaffold is committed (`cf8b8e8`), but the Q0.13 change is not; the clean-clone criterion waits for the commit that contains it and a check from a real clone of that commit (Q0.7 b) |
| 0.2 | Package and app skeletons | Complete |
| 0.3 | Dependency rules enforced | Complete (2026-11-26) — closing rule met, reproduced independently by the Reviewer. Round 3 closed S1 and S2 (Q0.12); the Reviewer's round 3 review kept the stage Complete, and its letter-case gap in the S2 test (S-1) is fixed. Q0.13 accepted 2026-11-26 and implemented (uncommitted): the indirect routes around entry isolation are closed, not yet confirmed independently. S3, S4 for apps, and the other known limits remain; Q0.14 asks the user to confirm one part of the Q0.13 change that goes beyond the recommendation |
| 0.4 | Gate commands and documentation | Complete; all six gate commands confirmed independently by the Reviewer over the round 3 files, before the S-1 fix and Q0.13; after them, the Coder's runs only. The agent-file correction in Appendix A awaits the user |

## 3. Stages

### 0.1 Root workspace and toolchain

- **Outcome:** a root `package.json`, `pnpm-workspace.yaml`, lockfile, a shared strict `tsconfig`,
  a lint configuration, and `.gitignore`. The Node and pnpm versions are pinned.
- **Owner:** Coder.
- **Exit criteria:**
  - `pnpm install` succeeds from a clean clone on Windows in Git Bash.
  - A strict TypeScript setting (`strict: true`) applies to every package.
  - Every added dependency is approved and has a permissive licence (ADR-0006).
- **Checked 2026-11-26:**
  - Clean install: the Coder's report only. It was a clean install of the working tree, not a
    clean clone, because the scaffold is not committed yet. Nothing the build needs is ignored by
    `.gitignore`, and `pnpm-lock.yaml` is on disk. `packageManager` and `engines` pin pnpm and Node.
    Whether a working-tree install meets the criterion is Q0.7 (b), raised by the Reviewer.
  - Strict: on disk. `tsconfig.base.json` sets `strict: true`, and every package, app, and tools
    tsconfig extends it.
  - Dependencies: **not met.** Every direct dependency has a permissive licence (MIT or
    Apache-2.0, checked on disk for `@types/node` and `@eslint/js`; the others from the Coder's
    report). The only transitive copyleft is `lightningcss` (MPL-2.0, development only, through
    Vite), which ADR-0006 allows. Neither `@types/node` nor `@eslint/js` was part of an approval
    (Q0.7; re-checked in remediation round 1, see §4). Superseded by the re-check below.
- **Re-checked 2026-11-26, after the user's answers to Q0.7:**
  - Dependencies: **met.** The user approved `@types/node` and `@eslint/js` (Q0.7 a). On disk the
    root `package.json` declares `@eslint/js`, `@types/node`, `eslint`, `prettier`, `typescript`,
    `typescript-eslint`, and `vitest`, and `apps/playground/package.json` declares
    `@playwright/test` and `vite`; each was approved (Q0.1, Q0.5, Q0.7). No package
    declares any other third-party dependency.
  - Clean clone: **not met yet.** Under Q0.7 (b) the install of the working tree does not count.
    After the user's first commit, a real clone is made and `pnpm install`, `pnpm typecheck`,
    `pnpm lint`, `pnpm test`, and `pnpm format:check` are run in it. That run, reported with each
    command and its output, meets the criterion; stage 0.1 is Complete only then.
  - Strict: unchanged since the check above.
- **Update 2026-11-27:** the scaffold is committed (`cf8b8e8`, with the documents in `663c8b7`;
  read with `git log`). The Q0.13 change (stage 0.3) is not committed yet, so the clean-clone
  check runs on the commit that contains it, not on `cf8b8e8`. The criterion is still not met.

### 0.2 Package and app skeletons

- **Outcome:** `packages/core`, `app-state`, `ui-kit`, `engine`, `audio`, `media`, `platform`,
  `fonts`, and `apps/playground`, each with a `package.json`, an entry point, and one trivial
  passing test. `apps/desktop` and `apps/mobile` are not created yet; Phases 6 and 9 add them.
- **Owner:** Coder.
- **Depends on:** 0.1.
- **Exit criteria:**
  - Each package typechecks and its trivial test passes.
  - `core` tests run in Vitest's Node environment (test instructions).
  - `apps/playground` starts with the Vite dev server and shows a blank page.
- **Checked 2026-11-26:**
  - On disk: all eight packages and the playground have a `package.json`, an entry point, and one
    colocated test (two in `core`). `vitest.config.ts` gives every project the Node environment,
    and the `core` test asserts that no `document` exists.
  - Typecheck and tests pass (9 files, 10 tests): the Coder's report only.
  - Blank page: the Coder's report of HTTP 200 from the dev server, checked with `curl`, not in a
    browser. The page is blank by construction: `index.html` has an empty body and `main.ts` only
    sets the title.

### 0.3 Dependency rules enforced

- **Outcome:** the rules in architecture §4 fail the build when broken. For example, through
  TypeScript project references and a lint rule that restricts imports.
- **Owner:** Coder.
- **Depends on:** 0.2.
- **Exit criteria:**
  - An import from `core` into any other package, or of a DOM type in `core`, fails typecheck or
    lint. Verified by a temporary violating import that is then removed.
  - `engine`, `audio`, and `media` cannot import a platform implementation, only `platform`
    interfaces.
- **Closing rule (set in remediation round 2).** A run in which the listed imports fail is not
  enough: twice that was taken for Complete and bypasses remained, because an experiment proves
  only the forms it tried. The stage is Complete only when all three hold:
  1. Both exit criteria are met, checked on disk.
  2. The regression suite `tools/lint/package-boundary.test.ts` (Vitest project `lint-rules`)
     passes in a gate run of `pnpm test`, reported with the command and its output.
  3. Someone other than the Coder (the Reviewer or the verification phase) reproduces the
     violating imports listed under *Independent run* below in the real packages, by hand rather
     than through the Coder's suite. Each must fail `pnpm lint` or `pnpm typecheck`, and the tree
     must be clean afterwards.
- **Reopened 2026-11-26 (remediation round 1).** The stage had been marked Complete, but the
  Reviewer found imports that broke the rules and passed the gate: the earlier
  `no-restricted-imports` configuration did not see every import form and could not tell whether a
  relative path leaves a package. Marking it Complete was wrong. The Coder replaced it (§4).
- **Still open after remediation round 2 (2026-11-26).** A second Reviewer showed the round 1 rule
  could still be bypassed: `import()` with a backtick string, a relative path through a
  `node_modules` folder, another letter case of the `@moviemaker` scope, and `core` reaching DOM or
  Node types through the bare specifiers `typescript/lib/lib.dom` or `node`, which the rule did not
  check. The Reviewer also found that this document, the architecture, and AGENTS.md claimed more
  than the checks proved. The Coder rewrote the rule as an exact allowlist and added the regression
  suite (§4); the documents were corrected in the same round.
- **Re-checked 2026-11-26, against the round 2 files** (`eslint.config.js`,
  `tools/lint/package-boundary.test.ts`, `vitest.config.ts`, `tsconfig.tools.json`, and the
  tsconfigs), by reading them; the Planner ran no command:
  - Criterion 1, `core`, on disk: `packages/core/tsconfig.json` and `tsconfig.test.json` both set
    `lib: ["ES2023"]`, without the DOM. The source inherits `types: []` from `tsconfig.base.json`,
    so it has no ambient types; the tests set `types: ["node"]`, so Node globals type-check in
    `core` tests, the DOM does not. `packages/core/package.json` declares no dependency. In
    `eslint.config.js`, `core` source may import only `@moviemaker/core`, and its tests also
    `vitest`; every other bare specifier fails, including `typescript/lib/lib.dom`, `node`,
    `@types/node`, and `node:fs` (suite group D). Relative and absolute paths that leave
    `packages/core` fail, and `@typescript-eslint/triple-slash-reference` forbids `lib`, `path`,
    and `types` directives.
  - Criterion 2, `engine`, `audio`, `media`, on disk: each allows exactly its own entry points,
    `@moviemaker/core`, and `@moviemaker/platform`, plus `vitest` in tests. The comparison is
    exact (`allowed.includes`), so `@moviemaker/platform/browser`, any other subpath or casing, a
    trailing slash, and a `..` segment fail. A relative or absolute path fails if it contains a
    `node_modules` segment or resolves outside the package, before or after symbolic links are
    resolved. TypeScript alone would accept `@moviemaker/platform/browser`, because these
    packages reference `platform`; only lint enforces this criterion.
  - Read in the rule's source: it visits static imports, `export … from`, `import()`,
    `typeof import()` and `import type`, `import x = require()`, and `require()`, and reads a
    template literal without expressions like a string. Backslashes are normalised to `/` before
    any check.
  - Closed in round 2, on disk: JavaScript files (`.js`, `.jsx`, `.mjs`, `.cjs`) under `src/` and
    `tests/` are covered; the `dist`, `test-results`, and `playwright-report` ignores are anchored
    to `packages/*/` and `apps/*/`; `noInlineConfig` is set on every file the rule covers, and no
    inline ESLint comment or triple-slash directive exists under `packages/` or `apps/` (searched);
    self-imports by name are limited to the package's exact entry points; apps are allowlisted too.
  - Every import now in `packages/` and `apps/` is within its allowlist (searched): `vitest` in the
    nine test files, `vite` and `@playwright/test` in the playground configurations, and relative
    imports otherwise.
  - The suite, on disk: `vitest.config.ts` adds the project `lint-rules` (root `tools/lint`, Node
    environment, 60 s timeout), and `tsconfig.tools.json`, referenced from the root `tsconfig.json`,
    typechecks `tools/**/*.ts`. Counted by reading its tables: 213 cases, 179 that must be rejected
    and 34 that must be accepted. They include the six imports of the round 1 independent run,
    every import form by name and by relative path in `engine`, `audio`, and `media`, and one group
    per round 2 finding (template literals, `node_modules` paths, scope casing, bare specifiers,
    backslashes, JavaScript files, anchored ignores, self-imports, inline comments).
  - The Coder's report says the scope is matched "case-insensitively". On disk it is compared
    case-sensitively and exactly, so every other casing fails; the documents describe that.
  - **The Coder's report only:** the gate after round 2 (`pnpm typecheck`, `pnpm lint`,
    `pnpm test` with 10 files and 223 tests, `pnpm test:golden`, `pnpm format:check`,
    `pnpm build`, all exit 0); the round 1 rule failing 74 of the 213 cases; and the manual
    junction run for symbolic links. On disk there are 10 test files and 223 test cases (9 + 1
    files, 10 + 213 cases), matching the report.
  - **Against the closing rule, at that point:** 1 held on disk; 2 rested on the Coder's report
    alone; 3 had not happened, so the stage stayed In progress. Superseded by *Closed* below.
- **Independent run** (closing rule 3), at least:
  - From round 1: `core` importing another package by name, by relative path, and through
    `/// <reference lib="dom" />`; `engine` importing `@moviemaker/platform/browser` by name,
    through `import()`, and by relative path.
  - From round 2: `engine` importing `@moviemaker/platform/browser` through ``import(`…`)`` with
    a backtick string and through `../node_modules/@moviemaker/platform/src/browser/index`;
    `engine` importing `@MovieMaker/platform/browser`; `core` importing `typescript/lib/lib.dom`
    and `node` (for example `export type {} from 'node';`).
- **Closed 2026-11-26, after an independent run by the Reviewer.** This is the Reviewer's report
  as relayed to the Planner; the Planner saw no command output and ran no command.
  - Gate run from the repository root by the Reviewer: `pnpm typecheck`, `pnpm lint`, and
    `pnpm test`, all exit 0. `pnpm test` ran 10 test files and 223 tests, 213 of them in the
    `lint-rules` project.
  - By hand in the real packages, without writing into the repository: the 11 imports listed
    under *Independent run* (6 from round 1, 5 from round 2) and 31 further bypass forms found in
    the review rounds were all blocked, and the positive controls were accepted. The working tree
    was identical before and after.
  - Against the closing rule: 1 holds on disk (re-read by the Planner: `eslint.config.js`, the
    `core` tsconfigs, and no inline ESLint comment, triple-slash directive, `declare module`, or
    `@jsxImportSource` under `packages/` or `apps/`); 2 holds through the Reviewer's gate run;
    3 holds, done by the Reviewer rather than the Coder. The stage is Complete.
  - Criterion 2 is read as covering direct imports: `engine`, `audio`, and `media` cannot
    themselves import a platform implementation, which the suite and the run prove. Read as also
    covering a re-export inside `platform` (S1 below), it would not hold until S1 is closed; Q0.12
    asks the user. *Update, round 3:* the user kept the direct reading, and S1 is closed for
    imports written in the `platform` root's own files; a chain through a file outside `src/` is
    Q0.13, closed since by keeping paths under `src/` inside `src/`.
  - Of the stage 0.4 gate commands, only `typecheck`, `lint`, and `test` were confirmed
    independently at that point. `test:golden`, `format:check`, and `build` were confirmed in the
    round 3 review (stage 0.4).
- **Round 3, 2026-11-26: S1 and S2 closed (Q0.12), and the Q0.9 rule implemented.** Read on disk
  by the Planner, who ran no command:
  - `eslint.config.js` has an `entryIsolation` table and the rule `moviemaker/entry-isolation`.
    Row `platform`: files under `src/` outside `src/browser/` may not import `src/browser/` by a
    relative or absolute path, or `@moviemaker/platform/browser` by name. Row `engine`: files
    under `src/catalog/` may not import `src/` outside `src/catalog/` by path, or
    `@moviemaker/engine` by name. The reverse directions are not listed, so they stay allowed.
    The rule visits the same import forms as `moviemaker/package-boundary`, turns backslashes
    into `/`, resolves a path against the importing file before and after symbolic links, and
    compares names exactly. It applies to TypeScript and JavaScript files under the protected
    folder, colocated tests included, with `noInlineConfig`.
  - `tools/lint/eslint-config-files.test.ts` walks the repository from its root and fails if any
    `eslint.config.{js,mjs,cjs,ts,mts,cts}` other than the root one exists. It also asserts that
    the root `eslint.config.js` exists, and tests its own search on temporary folder trees. It
    fails `pnpm test`, not `pnpm lint`. As first written in round 3, it matched file names
    case-sensitively and skipped more folders than ESLint ignores; both were fixed after the
    Reviewer's round 3 review (S-1 and S-2 below), and *The S-1 fix* below describes the file as
    it is now.
  - Q0.9: `engine` and `ui-kit` allow `@moviemaker/fonts` in `eslint.config.js`, declare it as
    `workspace:*` in `package.json`, and reference `../fonts` in `tsconfig.json`; the lockfile
    links it for both. `fonts` declares nothing and allows nothing. The allowlists of `platform`,
    `audio`, `media`, and `app-state` are unchanged and match Q0.8, Q0.10, and Q0.11.
  - The suite on disk, in `tools/lint/package-boundary.test.ts`: each `entryIsolation` row is
    rejected in 4 files (a source file, a test, a `.js` file, a nested file) × 7 specifiers × 12
    import forms, plus single cases, and its allowed directions are accepted; a table written by
    hand, not read from the configuration, checks every package against every entry point of the
    others, in a source and a test file. The Planner counted 839 cases in these round 3 groups and
    15 in `eslint-config-files.test.ts` (23 after the S-1 fix below). The accepted cases that S1
    described (`./browser/index` from the `platform` root, `../index` from the catalog) are gone
    from the accepted list.
  - **The Coder's report only:** `lint-rules` has 1064 cases, and the gate from the repository
    root (`pnpm typecheck`, `pnpm lint`, `pnpm test` with 11 files and 1074 tests,
    `pnpm test:golden`, `pnpm format:check`, `pnpm build`) exits 0 for every command. On disk
    there are 11 test files (eight packages, the playground, two in `tools/lint/`), matching; the
    whole suite was not recounted.
  - **Not yet confirmed independently, at that point:** the round 3 rules and the round 3 gate
    run. Stage 0.3 stays Complete, because its criteria are read as direct imports and were met
    before round 3. Superseded by *Round 3 review* below.
- **Round 3 review, 2026-11-26.** The Reviewer's findings as relayed to the Planner; the labels
  S-1 to S-6 are the Reviewer's and are not the known limits S1 to S4.
  - **S-1 (hard): the nested-configuration test was case-sensitive.** On Windows ESLint also
    loads a configuration whose name differs only in letter case, such as `ESLINT.config.js`, so
    such a file switched the rules off while the test passed. Fixed by the Coder (below).
  - **S-2 (judgement): the test skipped folders that ESLint lints.** It skipped seven generated
    folder names at the root and at every package and app root, but ESLint ignores only `dist`
    there, and `playwright-report` and `test-results` only at app roots. A configuration in any
    other of those folders, such as `build`, `coverage`, `dist-test`, or `blob-report`, was used
    by ESLint but not reported. Closed by the same fix.
  - **S-6: Q0.13 reproduced**, by two routes; see S1 *What remains* below and Q0.13.
  - S-3 to S-5 were corrections to the documents, applied in §4, §5, and the roadmap.
  - Gate: the Reviewer ran all six commands from the repository root over the round 3 files,
    before the S-1 fix: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:golden` (0 tests),
    `pnpm format:check`, and `pnpm build`, all passing. The Reviewer's verdict keeps stage 0.3
    Complete. The four hand checks the handoff listed (§7 step 3 before this round) were not
    reported to the Planner.
- **The S-1 fix, read on disk by the Planner** (`tools/lint/eslint-config-files.test.ts` and
  `eslint.config.js`), who ran no command:
  - File names are matched case-insensitively. That is what ESLint does on Windows; on a
    case-sensitive file system, as on Linux, ESLint would not load `ESLINT.config.js`, so there the
    test is stricter than needed.
  - The walk skips exactly the folders that `globalIgnores` in `eslint.config.js` ignores, `docs/`
    aside: the root `dist`, `packages/*/dist`, `apps/*/dist`, `apps/*/playwright-report`,
    `apps/*/test-results`, and the root `prototypes/`; plus `node_modules` at any depth and `.git`
    at the root, which ESLint ignores by default. It still walks `docs/`, which `globalIgnores`
    ignores, so it reports a configuration there that ESLint would never use: conservative. It no
    longer skips `build`, `coverage`, `dist-test`, or `blob-report` anywhere, nor a generated
    folder name below a package or app root, such as `packages/engine/src/dist`.
  - A test keeps the skip list and ESLint in step: it asks the real ESLint (`isPathIgnored`)
    about 35 probe paths, 7 folder names (`dist`, `dist-test`, `build`, `coverage`,
    `playwright-report`, `test-results`, `blob-report`) under 5 parents (the root,
    `packages/engine/`, `apps/playground/`, `packages/engine/src/`, `tools/lint/`), and fails on
    any disagreement. It probes only generated folders, not `node_modules`, `.git`, `prototypes/`,
    or `docs/`.
  - Counted on disk: 23 cases in the file, 15 before the fix. They include the three letter-case
    variants of the name and a configuration in each of `build`, `coverage`, `dist-test`, and
    `blob-report` at a package and an app root.
  - No `eslint.config.*` in any letter case exists outside the root, `node_modules`, and `.git`
    (searched, `prototypes/` included).
  - **The Coder's report only:** the full gate from the repository root after the fix, all exit
    0: `pnpm typecheck`, `pnpm lint`, `pnpm test` (11 files, 1082 tests), `pnpm test:golden`,
    `pnpm format:check`, and `pnpm build`. On disk: 11 test files, 10 cases in the nine
    placeholder test files and 23 in `eslint-config-files.test.ts`, counted by the Planner. The
    cases in `package-boundary.test.ts` were not recounted, so the 1072 cases in `lint-rules`
    (1082 minus 10) are the Coder's calculation, not an observed output.
- **Q0.13, implemented after the user accepted it on 2026-11-26** (uncommitted). Read on disk by
  the Planner on 2026-11-27 in `eslint.config.js` and `tools/lint/package-boundary.test.ts`, and
  in `git diff` against `663c8b7`, which changes only those two files; the Planner ran no build or
  package script:
  - `moviemaker/package-boundary` has an option `inside`. For every package in `allowedImports`,
    two blocks over `packages/<name>/src/**` (every extension: `.ts`, `.tsx`, `.mts`, `.cts`,
    `.js`, `.jsx`, `.mjs`, `.cjs`; the second adds `vitest` for `*.test.*` files) set
    `inside: 'src'`: a relative or absolute path must resolve inside the package's own `src/`,
    before and after symbolic links are resolved. The import forms, the `node_modules` check, and
    the allowlist are unchanged. This closes routes 1 to 3 of the suite: `platform`'s
    `src/index.ts` re-exporting `../tests/x`, and the catalog importing `../../tests/x` or
    `../../x`.
  - For every package, a further block over `packages/<name>/**` minus `src/**`, every
    extension, applies `moviemaker/entry-isolation` with the package's `src/` as target and no
    names: a file outside `src/` (under `tests/`, at the package root, or in another folder) may
    not import its own package's `src/` by a relative or absolute path, so it imports the package
    by name, which the allowlist allows for every entry point. This closes route 4 (a
    package-root file importing `./src/browser/index`, a test importing `../src/index`) and goes
    beyond the accepted recommendation, which let files under `tests/` import `../src/…`; Q0.14
    asks the user to confirm it.
  - The `entryIsolation` rows still apply only to files under their protected folders, both
    under `src/`. They are not applied outside `src/`, so a file under `platform`'s `tests/` may
    import `@moviemaker/platform/browser` by name (an accepted case): nothing under `src/` can
    import that file any more.
  - Apps are unchanged: their paths must stay inside the app root, not inside its `src/`.
  - An absolute Windows path such as `C:/…` starts with neither `.` nor `/`, so neither rule reads
    it as a path; the allowlist rejects it as a specifier. The suite expects that rule on Windows
    and the inside check on POSIX for its absolute-path case from `tests/`.
  - The suite, counted on disk: three new groups, **1047 cases**. Group 1 (paths out of `src/`):
    13 single cases; 576 = 8 packages × 3 files (a source file, a colocated test, a nested file)
    × 2 targets (`tests/` and the package root) × 12 import forms; 16 = 8 extensions × 2 folders;
    and 16 accepted. Group 2 (paths into `src/` from outside it): 12 single cases; 384 = 8
    packages × 4 files (under `tests/`, nested under `tests/`, at the package root, a
    package-root test) × 12 forms; 16 = 8 extensions × 2 folders; one test importing another
    package's `src/`; and 12 accepted, one of which checks three app imports. Group 3: one test
    that lints every existing file under `packages/` and `apps/` and expects no error from either
    rule. So 1018 must be rejected, 28 accepted, plus the scan. The diff removes no line from the
    test file, so the earlier cases are unchanged.
  - **The Coder's report only:** with the committed `eslint.config.js` swapped in, 1014 of the
    2119 `lint-rules` cases failed, all of them new and none of the earlier ones, and the
    configuration was restored afterwards. By reading, that count is consistent on Windows: of
    the 1018 rejecting cases, four are rejected by the committed configuration too (the three
    drive-letter absolute paths, rejected by the allowlist, and the test importing another
    package's `src/`), and the accepted cases and the scan pass under either.
  - **The Coder's report only:** the full gate from the repository root, all exit 0:
    `pnpm typecheck`, `pnpm lint`, `pnpm test` (11 files, 2129 tests), `pnpm test:golden` (no
    specs), `pnpm format:check`, and `pnpm build`. On disk: still 11 test files (no file was
    added), and 2129 = 10 placeholder cases + 23 in `eslint-config-files.test.ts` + 1047 new
    cases, all counted by the Planner, + 1049 earlier cases in `package-boundary.test.ts`, which
    is the Coder's earlier calculation and was not recounted.
  - Searched: no package has a file outside `src/` other than `package.json` and its tsconfigs,
    and the only relative imports under `packages/` are `./index` in the eight placeholder
    tests.
  - **Not confirmed independently yet.** Stage 0.3 stays Complete: its criteria are read as
    direct imports (Q0.12) and were met before. The clean-clone check (§7 step 2) is the next
    independent run over these files.
- **Known limits**, recorded in architecture §4. S1 to S4 are the Reviewer's labels from the
  independent run. S1 and S2 were closed in round 3 (Q0.12); the others are accepted for now.
  - **S1. Entry points were not kept apart inside a package.** *Closed in round 3* by
    `moviemaker/entry-isolation` (above). Before it, `export * from './browser/index'` in the
    `platform` root or `export * from '../index'` in `engine`'s `src/catalog/index.ts` passed lint,
    and the suite accepted both. *The indirect routes are closed by Q0.13* (above): a file under
    `src/` reaches by path only its own `src/`, where the rows cover every protected file, and
    the dependency rules have no cycle, so no other package leads back. **What remains:** the
    forms of S3, and the symbolic-link handling of the new check, which has no durable test.
    **What remained after round 3** (Q0.13, now closed): the rule checks each import on its own,
    does not follow chains, and checks only files under the protected folder. A file outside
    `src/` (under `tests/` or at the package root) is outside both the protected folder and the
    other entry point, so it is not checked, and a protected file may import it by relative path.
    It can reach the other entry point in two ways, both reproduced by the Reviewer in a scratch
    copy of the repository (S-6):
    - *By name.* The allowlist lets it import its own package's entry points. With
      `export * from '../tests/x'` in `packages/platform/src/index.ts` and
      `export * from '@moviemaker/platform/browser'` in `packages/platform/tests/x.ts`, `eslint` and
      `tsc` both exit 0, and a symbol of the browser implementation typechecks through the
      `platform` root. The catalog route (`../../tests/x` from `src/catalog/`, re-exporting
      `@moviemaker/engine`) passes too.
    - *By relative path.* `packages/platform/x.ts` importing `./src/browser/index`, and
      `packages/engine/tests/x.ts` importing `../src/index`, are accepted (ESLint on standard
      input). A protected file that imports such a file completes the chain.
    - The catalog importing `'../../x'`, which resolves to `packages/engine/x`, outside `src/` but
      inside the package, is accepted too.
    No file under `src/` imported outside it, and no package had a file outside `src/` other than
    `package.json` and its tsconfigs (searched, and still true after Q0.13).
  - **S2. A nested `eslint.config.*` switched the rule off.** *Closed in round 3* by
    `tools/lint/eslint-config-files.test.ts`, as fixed after the round 3 review (S-1 and S-2
    above). ESLint 10 uses the nearest configuration file above each linted file, so such a file
    still replaces the root configuration for `pnpm lint` and in the editor; what changed is that
    `pnpm test`, and so the gate, fails while it exists. **What remains:** the test matches names
    case-insensitively, stricter than needed on Linux; it reports a configuration under `docs/`,
    which ESLint ignores, conservatively; and it does not look inside `node_modules` at any depth,
    `.git`, the root `prototypes/`, the root `dist`, `packages/*/dist`, `apps/*/dist`,
    `apps/*/playwright-report`, or `apps/*/test-results`, all of which ESLint ignores too.
  - **S3. Not statically checkable:** a specifier that is not a plain string or a template
    literal without expressions, including a string behind a type assertion (`'…' as string`)
    and a computed specifier such as `import(variable)`; `declare module` with a specifier; an
    `@jsxImportSource` pragma, inert until a tsconfig sets `jsx`; and `import.meta.resolve`,
    `import.meta.glob`, `new URL(…, import.meta.url)`, `vi.mock`, `vi.importActual`,
    `require.resolve`, and `createRequire`.
  - **S4. JavaScript files at package or app level outside `src/` and `tests/`**, other than the
    app configuration files listed in `eslint.config.js`, are not checked by the allowlist. Such a
    file can import anything. *Narrowed by Q0.13:* package source can no longer import one by a
    relative path such as `../leak.js`, because its paths stay in `src/`, and in a package such a
    file may not import its own `src/` by path. App source still can, by a relative path that
    stays inside the app. None exists (searched, `packages/` and `apps/playground/`).
  - A package or app not registered in `eslint.config.js` gets no check at all, and a package
    with a second entry point gets no entry isolation without an `entryIsolation` row (§4
    *Registering*).
  - Globals are not imports: test tsconfigs set `types: ["node"]`, so `process` and `Buffer`
    type-check in every test file, `core`'s included; only imports are checked there.
  - The symbolic-link checks of both rules are covered only by the Coder's manual junction run in
    round 2, not by a durable test; no run is reported for the entry-isolation one, or for the
    `src/` confinement of Q0.13.
  - Files in a package outside `src/` are linted but neither typechecked nor run: the package
    tsconfigs include only `src/`, and Vitest collects only `src/**/*.test.ts` and
    `src/**/*.test.tsx`. So the by-name self-import that the Q0.13 change requires there (Q0.14)
    is lint-checked only; whether TypeScript resolves it from such a folder is untested, because
    none exists.
  - The imports inside third-party packages are not examined.
  - No POSIX run. The backslash cases pass on Windows against the round 1 rule too, so they do not
    show the behaviour on macOS or Linux, and the Q0.13 absolute-path case from `tests/` expects
    a different rule on POSIX that has never run. The CI workflow planned after Phase 1 (Q0.4) would be the
    first POSIX run if it uses a Linux runner.
  - TypeScript enforces only the edges between packages by name and `core`'s compiler settings;
    everything else in this stage rests on ESLint.
- **Not a limit:** a query or hash suffix on a specifier. TypeScript and Vite resolve it to the
  same file, which the checks above already cover, so it is not a practical bypass.
- **No longer limits after round 2:** third-party specifiers (now allowlisted; round 1 left them
  unchecked because adding a dependency needs approval anyway), apps (now allowlisted, not only
  checked for paths that leave them), template literals, JavaScript files, unanchored ignores,
  inline suppression, and self-imports through `..` or a non-entry subpath. After round 3: S1 for
  imports written in the protected folders, and S2 for the gate. After Q0.13: the indirect routes
  of S1, and S4's route from package source.

### 0.4 Gate commands and documentation

- **Outcome:** root scripts for typecheck, lint, unit tests, and golden-frame tests (an empty
  Playwright project for now). AGENTS.md records the commands in *Definition of done* and updates
  *Current phase*. The Orchestrator's shared-file hotspots list is corrected for the real layout.
- **Owner:** Coder for scripts; Planner for AGENTS.md and agent files.
- **Depends on:** 0.3.
- **Exit criteria:**
  - Each gate command runs from the root and passes.
  - AGENTS.md names the commands, and repository memory notes them.
- **Checked 2026-11-26:**
  - On disk: the root `package.json` has `typecheck`, `lint`, `test`, `test:golden`, and
    `format:check`. That they pass from a clean install: the Coder's report only.
  - AGENTS.md *Definition of done* names the commands, and repository memory notes them.
  - The Orchestrator's hotspots list, and the lines in the agent files that still say the
    repository is documentation only, are in user-approved files. The correction is written out in
    [Appendix A](#appendix-a--pending-agent-file-correction-awaiting-the-user) and is **not
    applied**. It is part of the outcome, not an exit criterion.
  - The gate was rerun by the Coder after remediation round 1 (typecheck, lint, test with 9 files
    and 10 tests, `test:golden`, `format:check`, build; all exit 0): the Coder's report only. On
    disk there were 9 test files and 10 test cases, matching it.
  - Rerun by the Coder after remediation round 2 (the same commands, test with 10 files and 223
    tests; all exit 0): the Coder's report only. On disk there are 10 test files and 223 test
    cases, matching it. Since round 2, `pnpm test` also runs the `lint-rules` project.
  - Independently, 2026-11-26: the Reviewer ran `pnpm typecheck`, `pnpm lint`, and `pnpm test`
    from the repository root, all exit 0 (10 files, 223 tests), for stage 0.3. `pnpm test:golden`,
    `pnpm format:check`, and `pnpm build` have not been run by anyone but the Coder; confirming
    them is in the handoff (§7).
  - Rerun by the Coder after round 3 (the same commands, test with 11 files and 1074 tests; all
    exit 0): the Coder's report only. On disk there are 11 test files, matching. The Reviewer's
    independent run predated round 3. Superseded by the next two lines.
  - **Independently, round 3 review, 2026-11-26:** the Reviewer ran all six commands from the
    repository root over the round 3 files, `pnpm typecheck`, `pnpm lint`, `pnpm test`,
    `pnpm test:golden` (0 tests), `pnpm format:check`, and `pnpm build`, and all passed. This is
    the first independent run of `test:golden`, `format:check`, and `build`. It predates the S-1
    fix to `tools/lint/eslint-config-files.test.ts` (stage 0.3).
  - Rerun by the Coder after the S-1 fix (the same six commands, test with 11 files and 1082
    tests; all exit 0): the Coder's report only; counts on disk in stage 0.3. **Confirmed
    independently, therefore:** all six commands over the round 3 files before the S-1 fix; over
    the files after it, none yet. The clean-clone check (§7 step 2) reruns `typecheck`, `lint`,
    `test`, and `format:check` over the committed files.
  - Rerun by the Coder after Q0.13 (the same six commands, test with 11 files and 2129 tests;
    all exit 0): the Coder's report only; counts on disk in stage 0.3. No independent run covers
    the Q0.13 files yet; the clean-clone check, on the commit that contains them, is the next.

## 4. Decisions already taken

- Package layout and dependency rules: architecture §4.
- Build and test tools: pnpm workspaces, Vite, Vitest, Playwright (architecture §2).
- `apps/desktop` and `apps/mobile` are created by the phases that first need them, so no empty
  shell has to be kept compiling meanwhile.
- Lint and format: ESLint with typescript-eslint, and Prettier (Q0.1, accepted 2026-11-25).
- Dependency rules: TypeScript project references plus an ESLint import restriction (Q0.2, accepted
  2026-11-25).
- Node and pnpm: the current Node LTS, pinned through `packageManager` and `engines` (Q0.3, accepted
  2026-11-25).
- No CI yet. A GitHub Actions workflow running typecheck, lint, and unit tests is added once Phase 1
  has real tests (Q0.4, accepted 2026-11-25).

Taken while implementing, 2026-11-26:

- **TypeScript is held at 6.0.x** (`~6.0.3`), not the latest 7.0, because typescript-eslint 8.74
  supports only TypeScript below 6.1. Revisit when typescript-eslint supports 7. The upgrade needs
  approval like any other (AGENTS.md).
- **Node 26 LTS and pnpm 12** through `engines` and `packageManager` (Q0.3). `engine-strict` is off
  and there is no `.nvmrc`, so a different Node version only warns. This is enough for one developer.
- **`allowBuilds` is empty** (Q0.6). Nothing needs a build script: Vite 8 bundles with Rolldown, not
  esbuild. This reverses the example in Q0.6, which expected `esbuild`. Electron is added in
  Phase 6 and will need an entry then.
- **Packages are consumed as source.** Each `exports` points at `src/*.ts`, and there is no build
  per package. `tsc -b` emits only declarations, into each package's `dist/`.
- **Two subpath entry points** make architecture §4 enforceable: `@moviemaker/platform/browser`
  (the browser implementation; only apps import it) and `@moviemaker/engine/catalog` (preset
  catalog metadata; the only part of `engine` that `ui-kit` imports).
- **Dependency rules** follow Q0.2: TypeScript project references and each package's declared
  dependencies, plus an import allowlist per package, app, and file group in `eslint.config.js`.
  The `@moviemaker` allowlists for `platform`, `fonts`, and `app-state` were first chosen while
  building, not by the user, and recorded as interim; the user settled them on 2026-11-26 (below).
- **Reversed in remediation round 1: the lint mechanism.** `no-restricted-imports` is replaced by
  an inline rule, `moviemaker/package-boundary`, in `eslint.config.js`, plus
  `@typescript-eslint/triple-slash-reference`. Why: `no-restricted-imports` does not see every
  import form (for example `require()`) and cannot resolve a relative path against the package
  root. The new rule is still an ESLint import restriction, so it implements Q0.2 rather than
  changing it.
- **Reversed in remediation round 1: `@eslint/js`.** It was first recorded here as covered by the
  ESLint approval (Q0.1), because it is the ESLint project's own configuration package. The user
  approved neither it nor `@types/node` by name, so both are now in Q0.7. `lightningcss` (MPL-2.0,
  transitive, development only) is allowed by ADR-0006. The user approved both on 2026-11-26
  (Q0.7 a).
- **Reversed in remediation round 2: third-party specifiers are checked.** Round 1 left every
  specifier outside `@moviemaker/` unchecked, reasoning that adding a dependency needs approval
  anyway. The second Reviewer showed that `core` could then reach DOM or Node types through
  `typescript/lib/lib.dom` or `node`, which resolve from the workspace root without being
  declared. Now every bare specifier is compared exactly against an allowlist per file group
  (package source: none; package tests: `vitest`; each app: its own list per file group). A new
  third-party or Node import therefore needs an edit to `eslint.config.js`. For a third-party
  package that edit is a tripwire that makes the dependency visible in review; the approval itself
  still comes from the user (AGENTS.md).
- **Regression tests for the lint configuration** live in `tools/lint/`, as the Vitest project
  `lint-rules`, typechecked through `tsconfig.tools.json`. They run the real ESLint with the
  repository's `eslint.config.js` over code at real package and app paths. Why: two rounds of
  one-off experiments each missed a bypass; a durable suite in `pnpm test` fails when a later
  change to the configuration reopens a case it lists. It does not catch a form it has no case
  for. Since round 3 a second file, `eslint-config-files.test.ts`, fails when a nested
  `eslint.config.*` would stop the root configuration from reaching a folder (stage 0.3, S2).
  `tools/` holds code, not documents, so it gets no row in the AGENTS.md documentation map.
- **Registering a package takes four places, an app three** (corrected in round 2; round 1 said
  three for both). A package: `packages` in `vitest.config.ts`, its tsconfigs in the root
  `tsconfig.json`, and in `eslint.config.js` both `entryPoints` (its `exports`, which apps may
  import) and `allowedImports` (what it may import). An app: `apps` in `vitest.config.ts`, its
  tsconfigs in the root `tsconfig.json`, and `apps` in `eslint.config.js` with the third-party
  specifiers of each file group. A package missing from `allowedImports`, or an app missing from
  `apps`, gets no dependency-rule check, silently. Read in the source, not run: a key of
  `allowedImports` without an `entryPoints` entry would make the configuration fail to load. The
  test instructions record this. Since round 3, a package with a second entry point also needs a
  row in `entryIsolation`, and a new package belongs in the hand-written table of
  `tools/lint/package-boundary.test.ts` so that its edges are tested. Since Q0.13 the `src/`
  confinement and the check of files outside `src/` are generated for every package listed in
  `allowedImports`, with no further edit; a new package also belongs in `packageNames` in the same
  test file, so that the Q0.13 groups cover it.
- **Tests:** one root `vitest.config.ts` with a project per package and app, all in the Node
  environment, collecting `src/**/*.test.ts` and `src/**/*.test.tsx`; the tsconfigs include and
  exclude both. No tsconfig sets the `jsx` option, so a test containing JSX does not compile yet.
  The change that first adds React sets it: Phase 2 if Q2.4 says yes, otherwise Phase 6.
- **Golden frames:** Playwright is configured in `apps/playground`, with specs in `tests/golden`;
  its browsers are installed in Phase 2. `test:golden` runs with `--pass-with-no-tests` only
  because no spec exists yet; Phase 2 stage 2.5 removes the flag (an exit criterion there).
- **Formatting:** `.editorconfig` sets LF line endings, and `.gitattributes` (`* text=auto eol=lf`)
  makes Git check text files out with LF, so a clone with `core.autocrlf=true` should still pass
  `format:check`. That is untested until the Q0.7 (b) check from a real clone, after the first
  commit. Prettier formats everything
  except `docs/`, `.github/`, `prototypes/`, and `AGENTS.md`.

Taken by the user on 2026-11-26 (Q0.7 to Q0.12, each recommendation accepted as written):

- **Approved: `@types/node` and `@eslint/js`** (Q0.7 a). Stage 0.1's dependency criterion holds.
- **The clean-clone check follows the first commit** (Q0.7 b). The working-tree install is not
  accepted in its place, so stage 0.1 and Phase 0 stay open until the user commits and the check
  runs from a real clone. The first commit (`cf8b8e8`) predates the Q0.13 change, so the check
  runs on the later commit that contains it, which covers the first commit's files too.
- **`engine` and `audio` do not import `media`** (Q0.8). They declare their inputs as their own
  interfaces (the engine's frame source in Phase 2 stage 2.2, the mixer's prepared-PCM reader),
  `media` implements them without importing either, and `app-state` or an app's worker start-up
  connects them. Architecture §4 already said this; the §3 diagram, which drew `engine → media`
  and `audio → media`, was redrawn to match. Not a reversal of a rule, so no ADR.
- **`engine` and `ui-kit` may import `fonts`; `fonts` imports nothing; no other package imports
  it** (Q0.9). This reverses the interim rule that no shared package imports `fonts`. The engine
  loads the font set into its worker and resolves `fontId` (architecture §8.5); `ui-kit` needs it
  for font pickers.
- **`platform` and `fonts` import nothing** (Q0.10). The adapter interfaces of architecture §13.1
  deal in bytes, byte ranges, paths, URLs, and small types of their own; `app-state` or `media`
  translate to `core` types. If an approved signature (Phase 3 Q3.2) genuinely needs a `core`
  type, allowing `platform → core` is a one-line change and creates no cycle.
- **`app-state` may import `core`, `engine` (root and catalog), `audio`, `media`, and the
  `platform` root**, never `@moviemaker/platform/browser` or `fonts` (Q0.11). The §3 diagram
  gained `app-state → media` and `app-state → platform`.
- **S1 and S2 are closed with code, not accepted as limits** (Q0.12). Implemented in round 3
  (stage 0.3): one table row per entry-point pair in `eslint.config.js`, checked by
  `moviemaker/entry-isolation`, so a later package with a second entry point adds a row and no
  code; and a unit test against nested configuration files rather than `--config` in `pnpm lint`,
  because `--config` would make a nested file inert for the gate only, not in the editor or the
  suite. Stage 0.3 criterion 2 stays read as direct imports.

Taken by the user on 2026-11-26 (Q0.13, the recommendation accepted as written):

- **Package source keeps its paths inside `src/`.** In package files under `src/`, tests
  included, a relative or absolute path must stay inside the package's own `src/`. Why: entry
  isolation checks each import on its own, and every indirect route the Reviewer reproduced needed
  a file under `src/` to import a file outside it. Implemented in stage 0.3. The implementation
  also makes files outside `src/` import their own package by name, which the recommendation did
  not ask for; that part is interim until the user answers Q0.14.

**ADRs.** None of the decisions in this section needed an ADR:

- Those at the top and those *taken while implementing* are tooling choices, local and easily
  reversed, or they implement rules the architecture already states.
- Those *taken by the user on 2026-11-26* (Q0.7 to Q0.12) settle dependency rules. No active ADR
  states a dependency rule, Q0.8 keeps the rule the architecture already had, and the others
  settle rules that were recorded as interim. The rules live in architecture §3 and §4, which a
  later change edits under the architecture triggers.
- Q0.13 (and Q0.14, whichever way it goes) changes how a dependency rule is enforced, not which
  package may import which; it is one block of lint configuration, easily reversed, and lives in
  architecture §4.

## 5. Open questions

| # | Question | Answer | Blocks |
|---|---|---|---|
| Q0.1 | Which lint and format tools? | Resolved 2026-11-25: ESLint with typescript-eslint, plus Prettier. Both are MIT. | 0.1 |
| Q0.2 | How are dependency rules enforced? | Resolved 2026-11-25: TypeScript project references plus an ESLint import restriction. | 0.3 |
| Q0.3 | Which Node LTS and pnpm version are pinned? | Resolved 2026-11-25: the current Node LTS, pinned through `packageManager` and `engines`. | 0.1 |
| Q0.4 | Is CI wanted now? | Resolved 2026-11-25: not yet. | — |
| Q0.5 | Approve pnpm, TypeScript, Vite, Vitest, and Playwright? | Resolved 2026-11-26: approved (corrected from 2026-11-25; the user approved Q0.1 to Q0.4 on 2026-11-25 and Q0.5 on 2026-11-26). | 0.1 |
| Q0.6 | pnpm 12 blocks dependency build scripts by default (found in prototype 7.1: Electron's binary was not downloaded). Where is `allowBuilds` configured? | Resolved 2026-11-26: in the root `pnpm-workspace.yaml`, listing only the packages that need it (for example `electron`, `esbuild`). The workspace also excludes `prototypes/`. Electron's binary may still need its install script run by hand (see repository memory). As built, the list is empty (§4). | 0.1 |
| Q0.7 | (a) Approve `@types/node` and `@eslint/js` (both MIT, development only)? The Coder added `@types/node` so that the Node-run configuration files and tests typecheck, and `@eslint/js` for ESLint's recommended rules (`js.configs.recommended` in `eslint.config.js`). The user approved neither by name; the Planner had counted `@eslint/js` as part of ESLint (Q0.1), which is reversed (§4). (b) Raised by the Reviewer (Sp1): stage 0.1's criterion "`pnpm install` succeeds from a clean clone" can be checked only against the working tree while the scaffold is uncommitted. Does a clean install of the working tree count, or is the check repeated from a fresh clone after the first commit? | **Resolved 2026-11-26** with the recommendation: (a) both approved; (b) the check is repeated from a real clone after the first commit, running `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm format:check`. The working-tree install does not count, so stage 0.1 and Phase 0 close only after the commit and that check. The recommendation as written: (a) approve both. `@types/node` is the standard companion of TypeScript for code that runs in Node, and `@eslint/js` is the ESLint project's own package of recommended rules. Neither ships runtime code. (b) Repeat the check from a fresh clone after the first commit, with `pnpm install` and `pnpm format:check`. Only a clone shows that Git keeps everything the build needs and that `.gitattributes` gives LF line endings (§4, untested); the Reviewer or Orchestrator can run it. Accepting the working-tree install is defensible if the user wants 0.1 closed before committing; the fresh-clone check is then recorded as a follow-up of the first commit. | 0.1 |
| Q0.8 | The architecture disagrees with itself: the §3 diagram draws `engine → media` and `audio → media`, but §4 says `engine`, `audio`, and `media` depend only on `core` and `platform`. Which is right? | **Resolved 2026-11-26** with the recommendation: §4 is kept, and the §3 diagram is redrawn to match. No rule was reversed, so no ADR. The recommendation as written: keep §4. `engine` and `audio` declare the inputs they need as their own interfaces (the frame source of Phase 2 stage 2.2, a prepared-PCM reader), `media` implements them, and `app-state` or the app's worker start-up connects them. Then correct the §3 diagram. This matches the lint rules as built, Phase 2 stage 2.2, and the roadmap, where Phase 2 does not wait for Phase 3. The alternatives are to let `engine` and `audio` import `media` (simpler wiring, but Phase 2 then depends on Phase 3) or to let `media` import `engine` and `audio` (a decoding package depending on the renderer). | Phase 2 stage 2.2, Phase 3 stage 3.3, Phase 4 stage 4.1 |
| Q0.9 | Which packages may import `fonts`? Architecture §8.5 says it loads the bundled fonts with `FontFace`, and text is rasterized in the engine worker, but §4 lets no shared package import it. As built, only apps can. | **Resolved 2026-11-26** with the recommendation: `engine` and `ui-kit` may import `fonts`, `fonts` imports nothing, and no other package may import it. Implemented in round 3. The recommendation as written: let `engine` import it, to load the font set into its worker and resolve `fontId`, and let `ui-kit` import it for font pickers. `fonts` stays a package that imports nothing. The alternative is for apps to pass the font set to the engine at start-up, like a platform implementation. | Phase 8 text track |
| Q0.10 | May `platform` or `fonts` import another package? While building, both were given an empty allowlist, and the Planner wrote that into architecture §4 as settled; the user never decided it. For `platform` it matters: with no imports, the adapter interfaces of architecture §13.1 cannot use `core` types such as the project, an asset, or its fingerprint. | **Resolved 2026-11-26** with the recommendation: `platform` and `fonts` import nothing; the adapter interfaces deal in bytes, byte ranges, paths, URLs, and their own small types, and `app-state` or `media` translate to `core` types. The recommendation as written: keep both importing nothing. The adapters are input and output: they can deal in bytes, byte ranges, paths, URLs, and small types of their own, while `core` keeps parsing, validation, and migration, and `app-state` or `media` maps between the two. Then a `schemaVersion` change never touches the Electron or Kotlin implementations. If an approved signature in Phase 3 Q3.2 genuinely needs a `core` type, allowing `platform → core` is a one-line change and creates no cycle. `fonts` is font files and a catalog and needs nothing. | Phase 3 stage 3.1 (with Q3.2) |
| Q0.11 | Which packages may `app-state` import? While building it was allowed `core`, `engine` (root and catalog), `audio`, `media`, and `platform` interfaces, never a platform implementation or `fonts`, and the Planner wrote that into architecture §4 as settled; the user never decided it. The architecture §3 diagram draws only `app-state → core, engine, audio`. | **Resolved 2026-11-26** with the recommendation: the list as built (never `@moviemaker/platform/browser` or `fonts`), and the §3 diagram gains `app-state → media` and `app-state → platform`. The recommendation as written: confirm the list as built. The export controller (Phase 5 stage 5.3) muxes with `media` into the platform's `ExportSink`, the document lifecycle (stage 5.1) uses `ProjectFiles`, and the Q0.8 recommendation has `app-state` connect `media` to `engine` and `audio`. Add `app-state → media` and `app-state → platform` to the §3 diagram together with the Q0.8 correction. | Phase 5 stage 5.1 |
| Q0.12 | Close S1 and S2 (stage 0.3 *Known limits*) now with cheap checks, or accept them as known limits until code lands behind a second entry point? S1: inside a package nothing stops one entry point from re-exporting another, so `engine`, `audio`, and `media` could reach the browser implementation through `@moviemaker/platform`, and `ui-kit` the renderer through `@moviemaker/engine/catalog`. S2: an `eslint.config.*` inside a package or folder replaces the root configuration there and switches the rule off silently. The gap first matters in Phase 2 stage 2.3 (real code in the catalog) and Phase 3 stage 3.1 (the browser implementation), and again when a later phase adds an entry point or an app with its own tooling (Phase 6, Phase 9). The Reviewer's view: S1 is the most likely mistake in practice, and it blocks stage 0.3 criterion 2 only if that criterion is read to cover indirect imports. | **Resolved 2026-11-26** with the recommendation: both closed with code now, not accepted as limits; criterion 2 stays read as direct imports. Implemented in round 3 (stage 0.3); a remaining indirect route is Q0.13, resolved and implemented since. The recommendation as written: close both now, as one small Coder change before Phase 2 stage 2.3 and Phase 3 stage 3.1, with rejecting and accepting cases in the `lint-rules` suite. S1: the entry point that more packages may import must not reach the other one, by name or by relative path. Files of the `platform` root may not import `src/browser/` or `@moviemaker/platform/browser`; files under `engine`'s `src/catalog/` may not import the rest of `engine` or `@moviemaker/engine`. The other direction stays allowed: the browser implementation implements the interfaces, and the renderer reads the catalog. S2: a test in the suite that fails if any `eslint.config.*` other than the root one exists under `packages/`, `apps/`, or `tools/`. (Passing `--config` in `pnpm lint` would make nested files inert for the gate, but not in the editor or the suite.) Keep criterion 2 read as direct imports, so stage 0.3 stays Complete. Accepting the limits instead is defensible while both entry points are placeholders, but then Phase 2 stage 2.3 and Phase 3 stage 3.1 should gain an exit criterion that their entry points stay separate. | Phase 2 stage 2.3, Phase 3 stage 3.1 |
| Q0.13 | Close the indirect routes around entry isolation (stage 0.3, S1 *What remains*)? `moviemaker/entry-isolation` checks each import on its own, and only in files under the protected folder. A file outside `src/` (under `tests/` or at the package root) is neither protected nor part of the other entry point, a protected file may import it by relative path, and it can reach the other entry point in two ways. *By name:* the allowlist lets it import its own package's entry points, so with `export * from '../tests/x'` in `packages/platform/src/index.ts` and `export * from '@moviemaker/platform/browser'` in `packages/platform/tests/x.ts`, `eslint` and `tsc` both exit 0 and a symbol of the browser implementation typechecks through the `platform` root; the catalog route (`../../tests/x`, then `@moviemaker/engine`) passes too. *By relative path:* `packages/platform/x.ts` importing `./src/browser/index`, and `packages/engine/tests/x.ts` importing `../src/index`, are accepted. The catalog importing `'../../x'` (which resolves to `packages/engine/x`, outside `src/`) is accepted as well. The same relative path out of `src/` lets package source import an unlinted JavaScript file (S4). Found by the Planner reading `eslint.config.js` in round 3; both routes reproduced by the Reviewer in a scratch copy of the repository in the round 3 review (S-6), the relative-path cases with ESLint on standard input. | **Resolved 2026-11-26** with the recommendation, and implemented (stage 0.3, *Q0.13, implemented*): package files under `src/`, tests included, import by a relative or absolute path only inside their own `src/`, with rejecting and accepting cases in the `lint-rules` suite. The implementation also rejects a path into a package's own `src/` from any of its files outside `src/`, which the recommendation allowed; Q0.14 asks the user to confirm that part. The recommendation as written, corrected where it is no longer true: close it with one small Coder change before Phase 2 stage 2.3 and Phase 3 stage 3.1, when real code first lands behind the second entry points: in package files under `src/`, tests included, a relative or absolute path must stay inside the package's `src/`. That removes both routes for both `entryIsolation` rows and for any later one, because each needs a file under `src/` to import a file outside it, and S4's `../leak.js`. [As written it went on: "files under `tests/` may still import `../src/…`". As built they may not (Q0.14).] Add rejecting and accepting cases to the `lint-rules` suite. Nothing under `src/` imports outside it today (searched). Accepting it as a known limit is defensible, because the route needs a deliberate file outside `src/` that a review would see; then Phase 2 stage 2.3 and Phase 3 stage 3.1 should gain an exit criterion that no file under `src/` imports outside it. | — |
| Q0.14 | The Q0.13 change goes one step beyond the accepted recommendation. Besides keeping paths in package files under `src/` inside `src/`, it makes every file of a package outside `src/` (under `tests/`, at the package root, or in another folder) fail `pnpm lint` when it imports its own package's `src/` by a relative or absolute path; such a file must import the package by name. The recommendation said files under `tests/` may still import `../src/…`. Keep the stricter rule? It was chosen while building, not by the user, so it is interim (stage 0.3). | Open. Recommendation: keep it. No such file exists, and package tests are colocated under `src/` (test instructions), so it first matters if a package gains a `tests/` folder or a root-level script, which no phase plans. A file there then uses only the package's entry points, as an app does, and route 4 fails on its own rather than only as part of a chain. The alternative is to remove that block from `eslint.config.js` and its group from the suite; entry isolation still holds then, because nothing under `src/` can import such a file. Either way, the change that adds the first package `tests/` folder also adds a tsconfig and a Vitest include for it and checks that the self-import by name typechecks (stage 0.3 *Known limits*). | — |

## 6. Stage log

| Date | Change |
|---|---|
| 2026-11-24 | Document created. |
| 2026-11-25 | Q0.1–Q0.4 resolved with the recommendations. |
| 2026-11-26 | Q0.5 and Q0.6 resolved. All Phase 0 questions are answered. |
| 2026-11-26 | Phase 0 implemented by the Coder; gate reported passing from a clean install. Stages 0.2, 0.3, and 0.4 Complete. Stage 0.1 In progress: `@types/node` needs approval (Q0.7). Q0.8 and Q0.9 opened on the dependency rules. |
| 2026-11-26 | Remediation round 1. Stage 0.3 reopened (In progress): it had been marked Complete with bypasses the Reviewer found; the Coder replaced the lint mechanism, and the stage waits for an independent reproduction. Q0.7 widened to `@eslint/js`, reversing §4. Q0.10 and Q0.11 opened on rules the Planner had recorded as settled. The agent-file correction moved into Appendix A. |
| 2026-11-26 | Remediation round 2. A second Reviewer found more bypasses and overstated documents. The Coder rewrote the rule as an exact allowlist per file group and added the `lint-rules` regression suite (213 cases). Stage 0.3 stays In progress under a new closing rule: exit criteria on disk, the suite passing in a gate run, and an independent reproduction, which now includes the round 2 bypasses. Third-party specifiers reversed to checked (§4); package registration corrected to four places. |
| 2026-11-26 | Stage 0.3 Complete. The Reviewer, not the Coder, ran `pnpm typecheck`, `pnpm lint`, and `pnpm test` (all exit 0; 10 files, 223 tests, 213 in `lint-rules`) and reproduced by hand, without writing into the repository, the 11 imports of *Independent run* and 31 further bypass forms: all blocked, positive controls accepted, working tree unchanged. Known limits S1–S4 recorded in stage 0.3 and architecture §4; Q0.12 opened on S1 and S2; Q0.7 gained (b), the clean-clone check. Of the gate, `test:golden`, `format:check`, and `build` still rest on the Coder's report. Phase 0 stays In progress for stage 0.1. |
| 2026-11-26 | Q0.7 to Q0.12 resolved with the recommendations (§4). Round 3: the Coder implemented Q0.9 (`engine` and `ui-kit` import `fonts`) and Q0.12 (`moviemaker/entry-isolation` and the nested-configuration test), closing S1 and S2; the reported gate passes (11 files, 1074 tests, 1064 in `lint-rules`) but is not confirmed independently. Architecture §3 redrawn and §4 settled. Stage 0.1: dependency criterion met; the clean-clone criterion waits for the first commit. Stage 0.3 stays Complete. Q0.13 opened on an indirect route around entry isolation. Phase 0 stays In progress. |
| 2026-11-26 | Round 3 review. The Reviewer ran all six gate commands over the round 3 files (all pass; the first independent run of `test:golden`, `format:check`, and `build`) and kept stage 0.3 Complete. S-1: the nested-configuration test missed `ESLINT.config.js` on Windows; the Coder made it case-insensitive and its skip list equal to ESLint's ignores, `docs/` aside (S-2), with a test against the real ESLint; the Coder's gate after the fix passes (11 files, 1082 tests), not yet confirmed independently. Q0.13 reproduced by the Reviewer by name and by relative path, still open. Q0.5's resolution date corrected to 2026-11-26. Stage 0.4 stays Complete; stage 0.1 and Phase 0 stay In progress for the commit and the clean-clone check. |
| 2026-11-27 | Q0.13 resolved (accepted 2026-11-26 with the recommendation) and implemented by the Coder, uncommitted: files under a package's `src/` import by path only inside `src/`, and files outside `src/` import their package by name; the four routes of the suite fail lint. 1047 new `lint-rules` cases (counted); the Coder's gate passes (11 files, 2129 tests) and the committed configuration fails 1014 of the cases (reported), neither confirmed independently. Q0.14 opened: the outside-`src/` part goes beyond the recommendation and is interim. The scaffold is committed (`cf8b8e8`); the clean-clone check runs on the commit that contains the Q0.13 change. Stages 0.3 and 0.4 stay Complete; stage 0.1 and Phase 0 stay In progress. |

## 7. Handoff

- **Read first:** AGENTS.md (*Definition of done* has the gate commands), architecture §3 and §4,
  stage 0.1 (*Re-checked* and *Update 2026-11-27*), stage 0.3 (*Round 3*, *Round 3 review*,
  *The S-1 fix*, *Q0.13, implemented*, and *Known limits*), stage 0.4, and §4 of this document.
- **Left for Phase 0.** No answer from the user blocks it any more.
  1. **Commit the Q0.13 change.** The scaffold is committed (`cf8b8e8`, documents in `663c8b7`);
     the Q0.13 change to `eslint.config.js` and `tools/lint/package-boundary.test.ts`, and this
     documentation, are not. The Orchestrator commits them.
  2. **The clean-clone check (Q0.7 b), on that commit.** A real clone of the commit that contains
     the Q0.13 change, not the working tree, is made on Windows in Git Bash, and `pnpm install`,
     `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm format:check` run in it, each reported
     with its output. The Orchestrator runs it with the Reviewer. If one fails (for example CRLF
     line endings, or a file Git did not keep), it goes back to the Coder. Run by someone other
     than the Coder, it also confirms independently the files after the S-1 fix and Q0.13
     (stage 0.4). The same run should reproduce by hand, leaving the clone clean, at least:
     `export * from './browser';` in `packages/platform/src/index.ts` and
     `export * from '../index';` in `packages/engine/src/catalog/index.ts` (both fail
     `pnpm lint`), `import '@moviemaker/fonts';` in `packages/media/src/index.ts` (fails
     `pnpm lint`), and an empty `packages/engine/eslint.config.js`, then the same file renamed to
     `ESLINT.config.js` (each fails `pnpm test`); and for Q0.13,
     `export * from '../tests/x';` in `packages/platform/src/index.ts` and
     `export * from '../../x';` in `packages/engine/src/catalog/index.ts` (both fail
     `pnpm lint`, by `moviemaker/package-boundary`), and a new `packages/engine/tests/x.ts`
     containing `import '../src/index';` (fails `pnpm lint`, by `moviemaker/entry-isolation`).
     These are recommended, not exit criteria: the Reviewer's verdict already keeps stage 0.3
     Complete.
  3. **The Planner closes the stages.** When the Orchestrator reports step 2 as passed, with each
     command and its output, the Planner marks stage 0.1 and Phase 0 Complete. `test:golden` and
     `build` are not rerun by step 2; the Reviewer ran them in the round 3 review, and the Coder
     after Q0.13.
  4. Phase 1 can start meanwhile.
  5. **Appendix A.** The user approves, edits, or rejects the agent-file correction in
     [Appendix A](#appendix-a--pending-agent-file-correction-awaiting-the-user); only the user
     applies it, or tells an agent to. It is part of stage 0.4's outcome, not an exit criterion,
     so it does not hold Phase 0.
  6. **Q0.14.** The user confirms or reverses the outside-`src/` part of the Q0.13 change. It
     blocks nothing and does not hold Phase 0; reversing it is a Coder change to
     `eslint.config.js` and the suite.
- **For later phases:** Q0.8 to Q0.13 no longer block anything, and the indirect routes around
  entry isolation are closed before Phase 2 stage 2.3 and Phase 3 stage 3.1. Q0.14 blocks
  nothing.

## Appendix A — Pending agent-file correction (awaiting the user)

**Status: proposed, not applied.** The `.github/agents/*.agent.md` files are user-approved
(AGENTS.md documentation map). This is the stage 0.4 correction of the Orchestrator's shared-file
hotspots list for the real layout, plus the lines that still describe the repository as
documentation only. The user applies it, edits it, or rejects it; the decision is recorded in §6.
Not included, deliberately: "once it exists" in the Planner and Reviewer files, which is still
true as a rule.

`.github/agents/orchestrator.agent.md`, *Project context*:

```diff
-**The repository is documentation only so far.** Read `AGENTS.md` before planning any delegation —
+`AGENTS.md` *Current phase* says how much of the system exists as code. Read `AGENTS.md` before planning any delegation —
```

`.github/agents/orchestrator.agent.md`, *Known shared-file hotspots*:

```diff
 These are touched by many otherwise-unrelated changes. Two tasks that both need one of them must be
-sequential. Package paths follow architecture §4 and do not exist yet; correct this list when the
-workspace is scaffolded.
+sequential. Package paths follow architecture §4.

-- `docs/moviemaker-glossary.md`, `docs/moviemaker-functional-specification.md`,
-  `docs/moviemaker-architecture.md` — in the documentation phase, nearly every change touches one
+- `docs/moviemaker-glossary.md`, `docs/moviemaker-functional-specification.md`,
+  `docs/moviemaker-architecture.md` — any change to a term, behaviour, or structure
+- `AGENTS.md`, `docs/design/roadmap.md`, and the current phase document — every stage status change
 - `docs/adrs/README.md` — every ADR change
-- `packages/core/` model types, schema, and migration chain — any project model change
-- the preset catalog in `packages/engine/` — any preset
-- `packages/platform/` adapter interfaces — a signature change breaks every implementation
-- the Electron preload API in `apps/desktop/` — any new IPC channel
+- `packages/core/src/` model types, schema, and migration chain — any project model change
+- the preset catalog in `packages/engine/` (metadata entry point `src/catalog/`) — any preset
+- the adapter interfaces in `packages/platform/src/` (not `src/browser/`) — a signature change
+  breaks every implementation
+- the Electron preload API in `apps/desktop/` (from Phase 6) — any new IPC channel
 - root `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml` — any dependency change
+- `eslint.config.js`, `vitest.config.ts`, root `tsconfig.json`,
+  `tools/lint/package-boundary.test.ts` — adding a package, an app, or a third-party import, or
+  changing a dependency rule
+- a package's `package.json` and `tsconfig.json` references — changing which packages it may import
```

`.github/agents/orchestrator.agent.md`, *Example*:

```diff
-The file paths are illustrative; the packages do not exist yet.
+The file paths are illustrative.
```

`.github/agents/planner.agent.md`, *Project context*:

```diff
-is shared by a desktop React + Electron app and a separate mobile React + Capacitor app. **The
-repository is documentation only so far.** Read these before planning:
+is shared by a desktop React + Electron app and a separate mobile React + Capacitor app. `AGENTS.md`
+*Current phase* says how much of it exists as code. Read these before planning:
```

`.github/agents/reviewer.agent.md`, *Project context*:

```diff
-Capacitor app. **The repository is documentation only so far**, so many reviews are of documents.
+Capacitor app. `AGENTS.md` *Current phase* says how much of it exists as code; many reviews are of documents.
```

`.github/agents/scout.agent.md`, *Project context*:

```diff
-**The repository is documentation only so far.**
+`AGENTS.md` *Current phase* says how much of it exists as code.
```

`.github/agents/coder.agent.md`, checks:

```diff
-- The exact check commands are recorded in `AGENTS.md` once the workspace is scaffolded. Until then
-  there are no code checks to run, and you never report one as passed.
+- The exact check commands are in `AGENTS.md` *Definition of done*. Never report a check as passed
+  without the command that ran and what it printed.
```
