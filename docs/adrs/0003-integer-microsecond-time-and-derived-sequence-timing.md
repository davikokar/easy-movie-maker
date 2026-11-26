# ADR-0003: Integer microsecond time and derived sequence timing

- Status: Active
- Date: 2026-11-24
- Decision makers: Project maintainer

## Context

Clips are trimmed, sped up, reordered, and overlapped by transitions. Floating-point seconds
accumulate drift, and different packages rounding differently would put preview, export, and the
UI out of step. Stored clip start times would let reordering create gaps or overlaps.

## Decision

- Store time as **integer microseconds**, matching WebCodecs timestamps. Ranges are `[in, out)`.
- Store frame rates as **rationals** (`{ num, den }`). Export frame *n* is at
  `round(n × 1 000 000 × den / num)` µs.
- The **effective duration** of a video clip is `round((out − in) / speed)`. One function in `core`
  computes it and the source-time mapping, so every package rounds the same way.
- **Sequence timing is derived, not stored**: `start(0) = 0` and
  `start(i) = start(i−1) + duration(i−1) − transition(i)`.
- Every clip keeps a part free of transitions: its effective duration is at least
  `transition(i) + transition(i+1) + margin`, with a provisional margin of 0.1 s.

## Alternatives Considered

- **Floating-point seconds.** Natural for UI code but drifts over long projects and makes equality
  checks unreliable.
- **Frame counts.** Ties the model to one frame rate, but the project is resolution- and
  frame-rate-independent and the export preset chooses the rate.
- **Stored absolute start times for visual clips.** Reordering and trimming would have to rewrite
  every later clip and could leave gaps.

## Consequences

### Positive

- No drift; equality and ordering are exact.
- Reordering, trimming, and inserting can never create gaps in the sequence.
- Two transitions never run at the same time.

### Negative

- Every conversion to and from seconds or frames must go through the shared functions.
- The minimum-duration rule constrains editing, so commands must clamp transitions and report it.

## References

- Architecture §5.1, §5.2, §7
- Functional specification §1.1, §5.1
- Glossary: *In point / out point*, *Effective duration*
