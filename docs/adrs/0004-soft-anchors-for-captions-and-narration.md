# ADR-0004: Soft anchors for captions and narration

- Status: Active
- Date: 2026-11-24
- Decision makers: Project maintainer

## Context

Captions and narration describe specific pictures. When the user inserts, removes, reorders, or
resizes clips, a caption or narration stored at an absolute time would end up over the wrong
picture. Music behaves differently: the user times pictures to the music, not the reverse.

## Decision

- **Captions and narration clips are soft-anchored.** Each stores an anchor clip and an offset;
  its timeline start is `start(anchor) + offset`, with `0 ≤ offset < duration(anchor)`. It moves
  with its anchor and keeps its duration.
- After every command, an item whose start no longer falls inside its anchor re-anchors to the clip
  that contains that time, or to the last clip with the offset clamped.
- **Captions never overlap.** A clip command that pushes a caption onto the next one shortens it;
  one pushed entirely under another is removed with a warning. Removing a caption's anchor removes
  the caption.
- **Narration clips never overlap.** They are shortened or removed by the same rule. Removing the
  anchor re-anchors the narration to the clip that takes its place.
- **Music keeps absolute times.** Only music commands and Fit to Music move it.
- Every automatic adjustment happens in the same command, is reported to the user, and is reverted
  by one undo.

## Alternatives Considered

- **Absolute timeline times for everything.** Simple, but captions and narration drift away from
  their pictures on every edit.
- **Hard attachment to a clip (child items).** Captions could not span several clips, and moving a
  caption to another clip would need a different operation from moving it in time.
- **Anchoring music too.** Contradicts the product rule that music keeps its timing (spec §8).

## Consequences

### Positive

- Captions and narration follow the pictures through every sequence edit.
- A caption can still span several clips.

### Negative

- Every clip command must run re-anchoring and overlap resolution, and the rules need thorough unit
  tests.
- The UI must explain adjustments (notices) and show anchors (anchor links).

## References

- Architecture §5.2
- Functional specification §3, §8
- Glossary: *Anchor*
