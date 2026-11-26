---
agent: agent
description: Audit the project's documentation for drift, contradictions, and claims that are no longer true.
---

# Documentation audit

Check every maintained document in this repository against the code (once it exists), the build
files, and each other. Report findings; do not fix anything until the user says so.

The documentation map in [AGENTS.md](../../AGENTS.md) lists every document, its owner, and its
maintenance mode. That is the scope.

## Why this exists

Ownership and update triggers only catch the drift somebody anticipated. Everything else
accumulates silently until a document that agents are *required* to read is quietly wrong. This
audit is for the rest.

## What to check

### 1. Claims that duplicate a fact owned elsewhere

The most common failure in this repo, by a wide margin. Every one of these is a future lie because
nothing checks it:

- Counts of anything — ADRs, presets, fonts, platforms, tests.
- Line counts and file sizes.
- Dependency and version lists that restate `package.json`, `pnpm-workspace.yaml`, or the lockfile.
- Platform minimums and permission lists that restate the Electron or Capacitor configuration or
  the Android manifest.

For each: is it still true, and should it exist at all? Prefer deleting the claim and linking to
its source over correcting the number.

### 2. Statements contradicted by the code

Verify, do not assume. Code exists from Phase 0 on, but most packages hold only placeholders: skip
a check whose subject is not built yet, and say so. Particular things worth checking:

- Does the architecture's technology table (§2) match the root and package `package.json` files?
- Does its package layout (§4) match the workspace, and do the imports obey its dependency rules?
- Does the project model (§5.2) match the types and schema in `core`, including `schemaVersion`?
- Does the adapter interface table (§13.1) match `platform`?
- Does every name in the UI vocabulary that carries a component symbol still exist under that name?
- Do the test conventions match what the tests actually do and how they are configured?

### 3. Documents contradicting each other

Precedence is set in [AGENTS.md](../../AGENTS.md) *Precedence*: an **active ADR** beats the
architecture, which beats a design document, which beats prose in `AGENTS.md`. The specification
is the authority on behaviour, the glossary on terms, and the wireframes on screen structure.
Report any disagreement and say which one is wrong under that rule; where the specification and
the architecture or an ADR disagree, report it for the user to decide.

Particular pairs worth checking:

- Glossary terms against their use in the specification, architecture, wireframes, and UI
  vocabulary.
- Specification behaviour against the architecture's model and commands (§5, §6).
- Wireframe notes against the specification, and wireframe open questions against spec §9.
- `spec §N` and `architecture §N` citations against the sections they name.

### 4. Dead and missing links

Every relative markdown link resolves. Every `applyTo` glob actually matches the files its
instructions are about — and does not match files they would mislead.

### 5. Progress honesty

For each design document under `docs/design/`: does its progress table match reality? Is any stage
marked Complete whose exit criteria are not all met? That is a hard violation, not a nit. Does
*Current phase* in `AGENTS.md` agree with them?

### 6. Orphaned documents

Anything in `docs/` or `.github/` not listed in the documentation map, and anything in the map that
no longer exists.

## How to report

Group by document. For each finding give the file and line, what is wrong, the evidence that it is
wrong — quote the code or build file — and a recommendation: **delete the claim**, **correct it**,
or **route it to its owner**.

End with a count per document and the single worst finding overall.

Separate hard problems from nits. A document that is merely terse is not a finding. A document
that states something false is.

If a document is clean, say so plainly. Do not invent findings to look thorough.
