# Phase 1 — Core Model and Edit Plan

**Status:** Not started · Part of the walking skeleton · [Roadmap](roadmap.md)

## 1. Goal and scope

Build `packages/core`: the project model, its schema, timing, commands with undo, and the edit plan
compiler. Everything is pure and covered by unit tests.

**In scope:** the walking-skeleton subset (architecture §16): photo and video clips (add, reorder,
trim, change duration), a crossfade transition, one Pan & Zoom preset, one music track, and the
serialization that save and open need.

**Out of scope:** captions, narration, text clips, effects, fades, speed, split, Fit to Music,
clipboard, and relink. Phase 8 adds them. The schema may already describe them (Q1.1).

## 2. Progress

| Stage | Title | Status |
|---|---|---|
| 1.1 | Time and sequence timing | Not started |
| 1.2 | Project model, schema, and serialization | Not started |
| 1.3 | Commands and history | Not started |
| 1.4 | Edit plan compiler | Not started |

## 3. Stages

### 1.1 Time and sequence timing

- **Outcome:** the `Micros` type, rational frame rates, export frame time
  `round(n × 1 000 000 × den / num)`, effective duration `round((out − in) / speed)`, the source-time
  mapping, derived clip starts and movie duration, and the minimum clip duration rule with its
  provisional 0.1 s margin (architecture §5.1, §5.2, §7;
  [ADR-0003](../adrs/0003-integer-microsecond-time-and-derived-sequence-timing.md)).
- **Owner:** Coder.
- **Exit criteria:**
  - One function computes effective duration and one computes the source-time mapping. Every later
    package uses them.
  - Unit tests cover 30000/1001 frame times, rounding at speed ≠ 1, the first-clip transition not
    shifting timing, and transitions overlapping the outgoing clip.

### 1.2 Project model, schema, and serialization

- **Outcome:** TypeScript types for architecture §5.2, a runtime schema that validates a loaded
  file, `schemaVersion` 1, an empty migration chain with its test harness, newer-major files flagged
  read-only, and pure functions that turn a revision into `.mmproj` JSON and back (§5.3, §6.1).
  File I/O stays out of `core`.
- **Owner:** Coder; Planner for the architecture update.
- **Depends on:** 1.1.
- **Exit criteria:**
  - A round trip (serialize, parse, validate) returns an equal project.
  - An unknown preset ID survives load and save (test instructions).
  - An invalid file is rejected with a typed error naming the failing path.
  - A file with a newer major `schemaVersion` loads as read-only with a reason.
  - The `Asset` entity's fields (Q1.2) are added to architecture §5.2 in the same change.

### 1.3 Commands and history

- **Outcome:** a command type that takes a revision and returns a new immutable revision, an undo and
  redo stack with structural sharing, and transient revisions for gestures (architecture §6). The
  skeleton commands: add clips, remove clips, reorder, trim, change duration, set transition, set
  Pan & Zoom, and add, move, and trim a music clip. A trim or duration change that breaks the minimum
  duration scales both transitions of the clip proportionally and returns a notice.
- **Owner:** Coder.
- **Depends on:** 1.2.
- **Exit criteria:**
  - Every command has an undo test (test instructions).
  - A gesture of many transient updates followed by one commit is one undo step.
  - Proportional transition scaling is pinned by tests, including the first clip's transition.
  - Commands return notices as data; `core` never formats UI text.

### 1.4 Edit plan compiler

- **Outcome:** a pure, memoized `compile(revision, mode)` producing visual segments (clip layer,
  transition segments with the outgoing layer, the project background for the first clip), audio
  segments with gain envelopes (music; embedded video audio per Q1.3), the movie duration, and
  diagnostics (architecture §7; [ADR-0002](../adrs/0002-edit-plan-shared-by-preview-and-export.md)).
  The plan is plain serializable data. `mode` selects proxies or originals, both resolved through
  an injected asset resolver.
- **Owner:** Coder.
- **Depends on:** 1.3.
- **Exit criteria:**
  - Segments never overlap and cover the movie without gaps.
  - The compiler clamps a too-long transition and reports a diagnostic.
  - A missing asset and an unknown preset each produce a diagnostic and a neutral fallback, never
    an exception.
  - The plan passes `structuredClone` unchanged.
  - Compiling the same revision twice returns the same object (memoization).

## 4. Decisions already taken

- The model, timing, and anchors follow architecture §5 and ADR-0003, ADR-0004.
- The runtime schema library is Zod or similar (architecture §5.3), subject to Q1.4.
- File reading and writing belong to `platform`; `core` only serializes.

## 5. Open questions

| # | Question | Recommendation | Blocks |
|---|---|---|---|
| Q1.1 | Does `schemaVersion` 1 contain the full model in architecture §5.2, or only the skeleton subset? | The full model. Phase 8 then adds commands, not migrations, and the first saved files stay readable. | 1.2 |
| Q1.2 | What fields does `Asset` have? Architecture §6.1 lists them in prose only. | ID, kind (photo, video, audio), fingerprint, original file name, probed metadata, and last known location per platform. Add the type to architecture §5.2. | 1.2 |
| Q1.3 | Does the skeleton include embedded video audio, at speed 1 only? | Yes. It is cheap once the mixer exists, and it exercises the transition crossfade and A/V sync early. | 1.4 |
| Q1.4 | Approve Zod (MIT)? | Yes. | 1.2 |
| Q1.5 | How does `core` create IDs without a platform API? | Inject an ID generator. Apps pass `crypto.randomUUID`; tests pass a deterministic one. | 1.3 |

## 6. Stage log

| Date | Change |
|---|---|
| 2026-11-24 | Document created. |

## 7. Handoff

- **Read first:** architecture §5–§7, ADR-0002, ADR-0003, ADR-0004, the test instructions.
- **Do next:** answer Q1.1–Q1.5 after Phase 0 is complete, then start stage 1.1.
