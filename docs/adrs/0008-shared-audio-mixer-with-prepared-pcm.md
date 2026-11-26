# ADR-0008: Shared audio mixer with prepared PCM

- Status: Active
- Date: 2026-11-24
- Decision makers: Project maintainer

## Context

Audio comes from embedded video audio, several music tracks, and narration, with fades, volume,
transition crossfades, ducking, speed changes, and optional pitch preservation. Preview must sound
like export. Real-time time-stretching on a phone is costly, and Android output latency is often
100–200 ms.

## Decision

- **One mixer** in the `audio` package reads prepared PCM, applies gain envelopes computed by the
  edit plan compiler, and sums the sources into a 48 kHz stereo bus.
- Preview runs it in an **`AudioWorklet`**, fed from a worker through a ring buffer. Export runs it
  in a **worker** in chunks of about 10 seconds, feeding `AudioEncoder`.
- Every source is **prepared ahead of time** in a worker — decoded, resampled to 48 kHz stereo, and
  time-stretched with Signalsmith Stretch when pitch is preserved — and cached on disk by
  fingerprint, range, speed, and pitch mode. Preview never time-stretches in real time.
- The `AudioContext` clock, corrected by `getOutputTimestamp()` and `outputLatency`, is the master
  preview clock. Video follows it and drops late frames rather than drifting.
- `OfflineAudioContext` is **not** used.

## Alternatives Considered

- **Web Audio graph for mixing.** Would put mixing logic in node graphs that differ between preview
  and export.
- **`OfflineAudioContext` for export.** Not available in workers, and it would duplicate the mixing
  logic.
- **Real-time time-stretch in preview.** Too costly on mid-range phones and would sound different
  from export.

## Consequences

### Positive

- Preview and export use the same mixer and the same prepared audio, so they sound the same.
- The mixer never resamples; it is simple to test at sample level.
- Long exports use bounded memory.

### Negative

- Speed or pitch changes trigger background preparation before they are audible.
- Prepared PCM needs disk cache space.

## References

- Architecture §10, §11, §12
- Functional specification §7, §8
- ADR-0002
