# ADR-0002: Preview and export consume a compiled edit plan

- Status: Active
- Date: 2026-11-24
- Decision makers: Project maintainer

## Context

The project model is an editable document with derived timing, soft anchors, transitions that
overlap clips, and stacked effects. Preview must match export in content and timing, and a native
Android engine may one day have to render the same projects (ADR-0001). If preview and export each
interpreted the project, every timing or layering rule would exist twice and drift.

## Decision

Every change produces a new immutable **project revision**. A pure, memoized compiler in `core`
turns a revision into an **edit plan**: `compile(revision, mode) → EditPlan`, where `mode` selects
proxies for preview or originals and intermediates for export.

- Preview and export consume **only** edit plans and never interpret the project directly.
- Both call the same deterministic `renderFrame(plan, t, target)` and the same audio mixer
  (ADR-0008).
- The edit plan is plain serializable data, so it can cross to workers and to a native engine.
- Problems such as a shortened transition, a missing asset, or an unknown preset become
  **diagnostics** in the plan. They never stop preview.

## Alternatives Considered

- **Renderer and mixer read the project directly.** Simpler at first, but every rule — derived
  timing, anchors, transition overlaps, clamping — would be re-implemented by each consumer, and a
  native engine would have to port the whole model.
- **Separate preview and export pipelines.** Allows a faster preview path, but breaks the
  "preview matches export" goal.

## Consequences

### Positive

- One place implements timing and layering; preview and export cannot disagree on them.
- The compiler is pure, so it is unit-testable without a DOM or GPU.
- A native engine can consume the same serialized plan.

### Negative

- Every edit recompiles; memoization is required to keep interactive edits responsive.
- The edit plan is an internal format that must evolve carefully across the TypeScript and any
  native consumers.

## References

- Architecture §3 (data flow), §7, §8.1
- ADR-0008
