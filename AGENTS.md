# AGENTS.md

Entry point for every agent working in this repository. Read it before anything else.

> **Maintenance — owner: Planner. Mode: routed.**
> Update it when a project-wide fact, convention, or the definition of done changes. Other agents
> report drift here by section name rather than editing it.

## Project

**MovieMaker** (repository `easy-movie-maker`) is an offline photo-and-video montage editor for
desktop (Windows, macOS, Linux) and Android, in the spirit of the classic Windows Movie Maker. One
TypeScript engine is shared by a desktop UI (React + Electron) and a separate mobile UI (React +
Capacitor). It is a personal learning project that may become open source.

- What the product does: [functional specification](docs/moviemaker-functional-specification.md)
- How it is built: [architecture](docs/moviemaker-architecture.md)
- What words mean: [glossary](docs/moviemaker-glossary.md)
- What it looks like: [wireframes](docs/mockups/index.html)
- Why it is built this way: [ADRs](docs/adrs/README.md)

## Current phase

**Workspace scaffold in place. No product code yet.**

The implementation plan is in the [roadmap](docs/design/roadmap.md), with one design document per
phase under `docs/design/`. The work is the **walking skeleton** (roadmap Phases 0–6, architecture
§16) and, alongside it, the **platform prototypes** that led to the Android decision gate (roadmap
Phase 7, architecture §15).

- **Phase 0** (workspace scaffold) is built: the pnpm workspace, the packages from architecture §4
  and `apps/playground` with placeholder entry points, the enforced dependency rules, and the gate
  commands below. The user settled the dependency rules and approved `@types/node` and
  `@eslint/js` on 2026-11-26 (Phase 0 Q0.7 to Q0.12). Phase 0 waits for the user to commit the
  scaffold, then for `pnpm install`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, and
  `pnpm format:check` to pass in a real clone of that commit (which closes stage 0.1 and Phase 0).
  The Reviewer ran every gate command and `pnpm build` independently on 2026-11-26, before a later
  fix to one lint-rule test.
- **Phase 1** (core model and edit plan) is next.
- **Phase 7** is in progress; the Android decision gate passed on 2026-11-26.

Start or resume work by naming a stage of a phase document; its *Handoff* section says what to
read first and do next. When a phase starts or finishes, the Planner updates this section.

The architecture still describes the **intended** system. Only the workspace, the package layout,
and the dependency rules (architecture §2, §4) exist as code. Do not read the rest as a
description of code that exists.

## Documentation map

Every maintained document, who owns it, and how it is kept true. The
[documentation audit](.github/prompts/docs-audit.prompt.md) uses this table as its scope.

**Modes**

- **routed** — only the owner edits it. Anyone else names the file and section that drifted in
  their report, and the Orchestrator routes the edit.
- **in-change** — whoever makes the change updates it in the same change.
- **append-only** — records are never rewritten; they are superseded.
- **user-approved** — an agent may draft, but the user decides.

| Document | Owner | Mode | Update when |
|---|---|---|---|
| [AGENTS.md](AGENTS.md) | Planner | routed | A project-wide fact, convention, or the definition of done changes |
| [Functional specification](docs/moviemaker-functional-specification.md) | **User** (Planner drafts) | user-approved | Product behaviour is decided or changed; a §9 open decision is resolved |
| [Glossary](docs/moviemaker-glossary.md) | Planner | routed | A domain term is introduced, renamed, or redefined |
| [Architecture](docs/moviemaker-architecture.md) | Planner | routed | A trigger in [architecture-docs instructions](.github/instructions/architecture-docs.instructions.md) *Triggers* fires |
| [ADRs](docs/adrs/) and [index](docs/adrs/README.md) | Planner | append-only | A significant decision is adopted, disabled, or superseded |
| [Roadmap](docs/design/roadmap.md) and phase documents in `docs/design/` | Planner | routed | A stage or gate changes status, or a plan decision is taken |
| [Wireframes](docs/mockups/) | Designer | in-change | A UI structure or interaction is decided or changed |
| [UI vocabulary](.github/instructions/ui-vocabulary.instructions.md) | Designer | in-change | A named view, panel, sheet, dialog, or control is added; renames are the Designer's alone |
| [Architecture-docs instructions](.github/instructions/architecture-docs.instructions.md) | Planner | routed | The documentation process itself changes |
| [Test instructions](.github/instructions/tests.instructions.md) | Planner | routed | A test convention is established or changed |
| [Agents](.github/agents/) | **User** (Planner drafts) | user-approved | An agent's role or the workflow changes; project facts inside them drift |
| [Documentation audit](.github/prompts/docs-audit.prompt.md) | Planner | routed | The audit's checks no longer match the documents |

### Precedence

- An **active ADR** beats the architecture, which beats a design document, which beats prose in
  this file.
- The **functional specification** is the authority on product behaviour, the **glossary** on
  terms, and the **wireframes** on screen structure (they are low fidelity; they say nothing about
  visual design).
- When the specification and the architecture or an ADR disagree, do not choose. Report the
  conflict, quoting both, and let the user decide.

## Tech stack and repository layout

Do not restate these here; they drift. The sources are:

- Technology choices: architecture §2.
- Package layout and dependency rules: architecture §4.
- Minimum platform versions: architecture §13.5.

The root `package.json`, `pnpm-workspace.yaml`, and `pnpm-lock.yaml` are the source of truth for
versions, and the architecture links to them rather than repeating them.

## Conventions

These hold everywhere and need no judgement. Each one cites where it comes from.

- **Terms.** Use the glossary's terms in code, tests, docs, and reports. A new domain term goes
  into the glossary in the same change, through the Planner.
- **Time.** Store time as integer microseconds; ranges are `[in, out)`; frame rates are rationals
  ([ADR-0003](docs/adrs/0003-integer-microsecond-time-and-derived-sequence-timing.md)).
- **`core` is pure.** No DOM, no platform API, no dependency on another package (architecture §4).
- **Every edit is one command.** A command takes a revision and returns a new immutable revision;
  one gesture or compound operation is one undo step (architecture §6).
- **Preview and export consume only the edit plan** and share `renderFrame` and the mixer
  ([ADR-0002](docs/adrs/0002-edit-plan-shared-by-preview-and-export.md),
  [ADR-0008](docs/adrs/0008-shared-audio-mixer-with-prepared-pcm.md)).
- **Presets are data.** Versioned IDs, GLSL ES 3.00, no JavaScript
  ([ADR-0007](docs/adrs/0007-webgl2-renderer-with-data-only-presets.md)). A preset whose look
  changes gets a new version; old versions stay.
- **Schema changes migrate.** Any change to the project model bumps `schemaVersion` and adds a
  migration (architecture §5.3). A wrong migration corrupts user projects instead of failing a
  build.
- **Anchors.** Captions and narration are soft-anchored; music keeps absolute times
  ([ADR-0004](docs/adrs/0004-soft-anchors-for-captions-and-narration.md)).
- **Electron security.** The rules in architecture §13.2 are not optional: context isolation,
  sandbox, no Node integration, strict CSP, validated IPC, allowlisted `media://` paths, FFmpeg
  spawned without a shell.
- **Licences.** No GPL; LGPL only as a separate process or replaceable module
  ([ADR-0006](docs/adrs/0006-licensing-policy-for-dependencies.md)).

## What to ask before doing

Raise these with the user as open questions. Never put them silently into a plan or a diff.

- Adding or upgrading a **third-party dependency**, including its licence check under ADR-0006.
- Resolving any **open behaviour decision** in specification §9, or any open question marked in the
  wireframes.
- Changing the **project file schema** (`.mmproj`) or the package format (`.mmpack`).
- Adding a **platform adapter interface** (architecture §13.1), an Android permission, or an
  Electron IPC channel.
- Adding a **preset family** or changing the look of an existing preset version.
- Introducing a new **architectural pattern**, or anything that contradicts an active ADR.

## Definition of done

A change is done when all five steps hold. The steps depend on what the change touches.

### Documentation-only changes

1. Every relative link in a changed document resolves.
2. Every domain term used is in the glossary, with the same meaning.
3. The specification, architecture, ADRs, and wireframes do not contradict each other under
   *Precedence*; any conflict found is reported, not silently resolved.
4. Section numbers cited elsewhere (`spec §5.1`, `architecture §13.3`) still point at the right
   section; renumbering updates every citation.
5. Documents this change made stale are updated, or named in the report for their owner.

### Code changes

Run each command from the repository root, after `pnpm install`.

1. **Typecheck passes:** `pnpm typecheck` (`tsc -b` over every project reference). It proves strict
   types in every package and app; that `core` compiles with no DOM library, and its source with
   no ambient types (its tests get Node's); and that a package can import by name only the
   workspace packages it declares and references. It does not stop an import of a third-party file
   that declares DOM or Node types; lint does.
2. **Lint and format pass:** `pnpm lint` and `pnpm format:check`. Lint is ESLint with
   typescript-eslint and two rules of this repository in `eslint.config.js`, which enforce the
   parts of architecture §4 that TypeScript cannot: `moviemaker/package-boundary`, an exact import
   allowlist per package, app, and file group (a new third-party or Node import fails until it is
   added there), and `moviemaker/entry-isolation`, which keeps a package's entry points apart
   inside the package. Both hold only within the limits listed in architecture §4. Prettier also
   rejects CRLF line endings.
3. **Unit tests pass:** `pnpm test` (Vitest; every package and app is a project, run in Node, plus
   the `lint-rules` project in `tools/lint/`, which runs ESLint with the repository's configuration
   against violating and allowed imports, and fails if any `eslint.config.*` other than the root
   one exists, in any letter case, outside the folders listed in architecture §4). Audio-level
   tests run here too.
4. **When the renderer, a preset, the mixer, or export changed:** golden-frame, audio, and export
   smoke tests (architecture §14.2) pass. Golden frames run with `pnpm test:golden` (Playwright in
   `apps/playground`); it passes with no specs until Phase 2 adds them. Audio tests are part of
   `pnpm test`. Export smoke tests have no command yet; the change that adds the first one records
   it here.
5. Documentation steps 1–5 above hold for the docs the change touched or made stale.

A gate is reported as passed only with the command that ran and what it printed.

The gate runs **once per change**. Who runs it is set by the Orchestrator or by the brief; see the
agents' *Who runs the gate* sections.

## Environment

- Windows. The VS Code terminal is **Git Bash**: use POSIX paths and prefix commands with
  `cd /c/git/easy-movie-maker &&`. PowerShell syntax and `c:\` paths fail.
- `git --no-pager` avoids a pager stalling an agent.
- `pnpm format` rewrites files with Prettier and normalises line endings to LF (`.editorconfig`).
  Files created on Windows can get CRLF, which `pnpm format:check` rejects. Prettier skips `docs/`,
  `.github/`, `prototypes/`, and `AGENTS.md`.
- `.gitattributes` (`* text=auto eol=lf`) makes Git check text files out with LF whatever
  `core.autocrlf` says; a fresh clone with `core.autocrlf=true` is untested.
- pnpm 12 runs no dependency build script unless the package is listed under `allowBuilds` in
  `pnpm-workspace.yaml`. The list is empty because nothing needs one; a dependency that does is
  added there as part of its approval.
- `prototypes/` is outside the workspace. Each prototype has its own lockfile and is installed on
  its own.
- Repository memory lives under `/memories/repo/`. Read the notes relevant to your task before
  starting, and append a short note when you learn something that would have saved time.
