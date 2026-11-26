---
name: Architecture and design documentation
description: "Use when creating, reviewing, updating, disabling, or superseding Architecture Decision Records (ADRs), when work introduces a significant architectural choice, when a change alters the structure described in the MovieMaker architecture, when the functional specification or glossary changes, or when a change advances work that has a design document."
applyTo: "docs/**/*.md"
---

# Architecture and design documentation

> **Maintenance — owner: Planner. Mode: routed.**
> This file is the rules for the rules. It changes only when the documentation process itself
> changes. Report a gap rather than editing it. The full documentation map — every document, its
> owner, and its mode — is in [AGENTS.md](../../AGENTS.md).

The project keeps three kinds of long-lived technical document, all owned by the **Planner**. Coder
and Designer report drift rather than editing them.

| | [Architecture](../../docs/moviemaker-architecture.md) | [ADRs](../../docs/adrs/) | `docs/design/` |
|---|---|---|---|
| Describes | the system's **structure** | a choice and **why** it was made | a piece of work as **planned**, and how far along it is |
| Horizon | the life of the product | forever | until the work ships |
| Written | in the change that alters the structure | **before** the change is implemented | **before** the work starts, kept current throughout |
| On change | edited in place | never edited; superseded by a new ADR | edited in place |
| Answers | "how is this put together?" | "why is it like this, and may I change it?" | "what are we building next, and how far along are we?" |

When any two disagree, the **ADR wins**. The architecture is a map; a design document is a plan.

> **The architecture currently describes the intended system.** Only the workspace scaffold exists
> as code. Implementation status lives in design documents, never in the architecture: do not add
> "implemented" or "not yet built" markers to it.

Two product documents sit beside these, with their own rules below: the
[functional specification](../../docs/moviemaker-functional-specification.md) and the
[glossary](../../docs/moviemaker-glossary.md).

# Architecture Decision Records

Store ADRs in `docs/adrs/` and maintain their index in [docs/adrs/README.md](../../docs/adrs/README.md).

## When an ADR is required

Record a decision when it has lasting impact on system structure, dependencies, data ownership,
the project file format, security, performance, platform support, licensing, or cross-package
conventions. Do not create an ADR for routine implementation details or choices that are local and
easily reversible.

## File naming

Use sequential, zero-padded names: `NNNN-short-kebab-case-title.md`.

Never reuse an ADR number, delete historical ADRs, or renumber existing records.

## Required format

```markdown
# ADR-NNNN: Decision title

- Status: Active | Disabled
- Date: YYYY-MM-DD
- Decision makers: Names or roles

## Context

Describe the problem, constraints, and forces that made a decision necessary.

## Decision

State the chosen approach clearly.

## Alternatives Considered

Describe credible alternatives and why they were not selected.

## Consequences

### Positive

- Expected benefit.

### Negative

- Cost, limitation, or risk accepted by this decision.

## References

- Related ADRs, specification or architecture sections, and source files.
```

## Status rules

- `Active`: the decision currently governs the project.
- `Disabled`: the decision no longer governs the project. Add `- Disabled date: YYYY-MM-DD` and
  either `- Superseded by: ADR-NNNN` or `- Disabled reason: ...` beneath the status metadata.
- A new ADR starts as `Active` once the user has adopted the decision.
- Do not rewrite the original context or decision when architecture changes. Create a new ADR,
  then mark the old one `Disabled` and link both records.
- An Android prototype failing its pass criterion (architecture §15) is exactly such a change: the
  native engine fallback is adopted by a new ADR that supersedes the affected part of ADR-0001.

## Index

For every ADR change, update `docs/adrs/README.md` with its number, title, status, date, and
relative link. Keep entries ordered by ADR number.

# Maintaining the architecture

## Owner

The **Planner** owns [moviemaker-architecture.md](../../docs/moviemaker-architecture.md).

- A plan whose work hits any trigger below must include updating the architecture as an explicit
  step owned by the Planner, with the file in the step's file list.
- **Coder and Designer do not silently rewrite it.** If their work leaves it inaccurate, they name
  the section in their report and the Orchestrator routes the edit.
- The **Reviewer** checks that a triggering change updated it, and reports a miss as a finding.
- Working directly rather than through the agents does not remove the obligation; it makes you the
  owner for that change.

## Timing

- An **ADR** is written **before** implementation, because it is a decision others must follow.
  While the architecture describes the intended system, the ADR's link is added to the section it
  governs **in the same change** that adopts it.
- Once a section describes code that exists, it is updated **after** the change lands, in the same
  change, from what actually landed rather than from the plan.

## Triggers

Update the architecture when a change does any of these. The list is deliberately concrete so that
"does this need a doc update?" is a lookup, not a judgement call.

- Adds, removes, or replaces a **technology choice** (§2).
- Adds, removes, or renames a **package**, or changes a **dependency rule** (§3, §4).
- Adds, removes, or redefines a **project model** entity or field, or bumps `schemaVersion` (§5).
- Changes **command, history, or persistence** semantics, or the `.mmproj` / `.mmpack` formats (§6).
- Changes the **edit plan's** shape (§7).
- Adds or removes a **render pipeline step** or a **preset kind**, or changes the bundled font
  set (§8).
- Adds or removes a **media function**, **background job**, or **cache key** (§9, §12).
- Changes an **audio source**, the **mixer**, or the **preview clock** (§10).
- Changes the **export** pipeline, default format, or a fallback (§11).
- Adds, removes, or retargets a **platform adapter interface**, or changes a **minimum platform
  version** (§13).
- Adds or removes a **test level** (§14).
- Records a **prototype result**, adds or removes a risk, or settles the **Android decision gate**
  (§15).
- Lands a new ADR, which needs its link added to the section it governs.

Adding a preset within an existing kind, a UI control, a string, a dialog, or a test does **not**
trigger an update. Neither does a bug fix that leaves the structure intact.

## How to write it

- Describe structure; do not restate decisions. Where a section is governed by an ADR, link the ADR
  and summarise it in at most two sentences.
- Never contradict an active ADR. If the architecture and an ADR disagree, the architecture is
  wrong.
- Keep section numbering stable — the specification, the wireframes, the triggers above, and the
  Reviewer's checks cite it. Renumbering updates every citation in the same change.
- Record an accepted limitation as a risk (§15) or an open question (§17) rather than omitting it.

# The functional specification and the glossary

- The **specification** is the user's. Agents draft changes; the user approves them. An agent never
  resolves an open behaviour decision in §9 on its own: it proposes, with a recommendation, and
  waits.
- The **glossary** is the single source of domain terms. Other documents use its terms and do not
  redefine them. A new term lands in the glossary in the same change that first needs it.
- Both keep their section numbering stable; the architecture and the wireframes cite them.

# Design documents

Work large enough to span several sessions gets a design document under `docs/design/`, named for
the work. Its purpose is that the plan, the decisions, the open questions, and the progress never
have to be rediscovered by whoever picks the work up next — possibly weeks later, in a fresh
context.

The [roadmap](../../docs/design/roadmap.md) is the overall plan. It links one design document per
phase, named `phase-N-<work>.md`: Phases 0–6 are the walking skeleton (architecture §16), and
Phase 7 holds the platform prototypes (architecture §15). The roadmap's progress table carries one
status per phase, and each phase document carries one status per stage. When a design document is
added, list it in the roadmap and keep the documentation map in [AGENTS.md](../../AGENTS.md)
pointing at the roadmap.

## Owner

The **Planner**, as with ADRs and the architecture.

- **Coder and Designer do not edit it.** They report drift and name the section.
- The **Reviewer** checks that a change advancing the work left the document true, and treats a
  stage marked Complete whose exit criteria are not all met as a hard violation.

## What it must contain

- **A progress table** — the single source of truth for where the work stands, one status per stage
  (or per prototype).
- **Exit criteria per stage**, concrete enough that "complete" is checkable. For prototypes, the
  pass criteria from architecture §15, confirmed before the prototype runs.
- **A stage log** — one line per status change.
- **Decisions already taken**, so they are not relitigated. Anything with lasting technical weight
  also becomes an ADR.
- **Open questions**, with a recommendation where one exists.
- **A handoff block** — what the next session should read first and do next.

## When to update it

In the **same change** as the work it describes, whenever a stage changes status, an exit
criterion is met or broken, a decision is taken or reversed, an open question is answered or found,
or the shape of the work changes.

## How to write it

- Record **why**, not just what. A decision without its reasoning gets reversed by the next person
  who sees only its cost.
- When you reverse a decision, say so and say why, rather than silently deleting the old claim.
- Keep section numbering stable.
- Never contradict an active ADR.
- Never let it drift into describing the system's structure; that is the architecture's job.

## Closing a design document

When the work ships, the document gains an `Archived — YYYY-MM-DD` line beneath its title and stops
being maintained. **It is not moved and not deleted**, because ADRs cite it by path. Its row in the
documentation map in [AGENTS.md](../../AGENTS.md) is removed in the same change.

Work that stops before it ships gains a `Paused — YYYY-MM-DD` line with the reason, keeps its row,
and gains a `Resumed — YYYY-MM-DD` line when it restarts.
