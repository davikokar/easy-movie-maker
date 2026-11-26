# Phase 4 — Audio

**Status:** Not started · Part of the walking skeleton · [Roadmap](roadmap.md)

## 1. Goal and scope

Build `packages/audio`: audio preparation, the shared mixer, the `AudioWorklet` host for preview,
and the preview clock ([ADR-0008](../adrs/0008-shared-audio-mixer-with-prepared-pcm.md)).

**In scope:** one music track, and embedded video audio at speed 1 if Phase 1 Q1.3 says so. Gain
envelopes for fades, volume, and the transition crossfade.

**Out of scope:** speed changes, pitch modes and time-stretch, narration, ducking, and waveforms
(Phase 8).

## 2. Progress

| Stage | Title | Status |
|---|---|---|
| 4.1 | Audio preparation | Not started |
| 4.2 | Shared mixer | Not started |
| 4.3 | Preview host | Not started |
| 4.4 | Preview clock | Not started |

## 3. Stages

### 4.1 Audio preparation

- **Outcome:** a job that decodes an audio source (Mediabunny and `AudioDecoder`), converts it to
  48 kHz stereo, and stores it in the cache by fingerprint, range, speed, and pitch mode. The cache
  can be read by range (architecture §10.2, §12).
- **Owner:** Coder.
- **Depends on:** Phase 3 stages 3.2 and 3.5.
- **Exit criteria:**
  - Mono, 44.1 kHz, and 48 kHz fixtures produce 48 kHz stereo with the expected sample count for
    their duration.
  - Reading any range returns the same samples as reading the whole file.
  - Video files without audio produce no job and no error.

### 4.2 Shared mixer

- **Outcome:** one mixer that reads prepared PCM for the edit plan's audio segments, applies the
  gain envelopes, and sums the sources into a stereo bus. It runs unchanged in a worklet and in a
  worker (architecture §10.4).
- **Owner:** Coder.
- **Depends on:** 4.1, Phase 1 stage 1.4.
- **Exit criteria:**
  - Audio-level tests (architecture §14.2) check envelope values at sample positions, a fade's start
    and end, volume 0, 1, and 2, and the crossfade between two clips' embedded audio.
  - Mixing a range in one call or in many small chunks gives identical samples.
  - The mixer allocates nothing per chunk once running.

### 4.3 Preview host

- **Outcome:** the mixer in an `AudioWorklet`, fed by a worker that reads prepared PCM ahead of the
  playhead through a ring buffer. A `SharedArrayBuffer` is used when the page is cross-origin
  isolated, otherwise chunks transferred over a `MessagePort` (architecture §10.4).
- **Owner:** Coder.
- **Depends on:** 4.2.
- **Exit criteria:**
  - The playground plays music without dropouts while scrubbing the picture.
  - Both transports work, selected at runtime.
  - Seek flushes the ring buffer and resumes at the new position.

### 4.4 Preview clock

- **Outcome:** the `AudioContext` clock as master, corrected with `getOutputTimestamp()` and
  `outputLatency`. The engine renders at the corrected position and drops late frames. The clock
  runs when there is no audio (architecture §10.3).
- **Owner:** Coder.
- **Depends on:** 4.3, Phase 2 stage 2.4.
- **Exit criteria:**
  - A sync test pattern (flash and beep) plays in the playground with the offset measured on the
    development machine and recorded in the stage log.
  - A project with no audio plays at the right speed.

## 4. Decisions already taken

- One mixer for preview and export, fed by prepared PCM; no `OfflineAudioContext` (ADR-0008).
- Preview never time-stretches in real time (architecture §10.2).
- `audio` imports only `core` and the `platform` interfaces, never `media` (architecture §4;
  Phase 0 Q0.8, 2026-11-26).

## 5. Open questions

| # | Question | Recommendation | Blocks |
|---|---|---|---|
| Q4.1 | Which resampler? | A small in-house windowed-sinc resampler in TypeScript, tested against reference signals. It avoids a dependency, and only one rate conversion target exists. Revisit if quality or speed falls short. | 4.1 |
| Q4.2 | Is the playground cross-origin isolated? | Yes. Serve it with COOP and COEP headers so the `SharedArrayBuffer` path is exercised. Keep the fallback tested. | 4.3 |
| Q4.3 | Format of the prepared PCM cache? | Raw interleaved 32-bit float with a small header (format version, rate, channels, frames). | 4.1 |
| Q4.4 | Crossfade gain curve for embedded audio during a transition? | Equal-power. A linear crossfade dips audibly in the middle. | 4.2 |
| Q4.5 | May `audio` import `media` for decoding and the job scheduler, or are they connected in `app-state`? | Resolved 2026-11-26 ([Phase 0 Q0.8](phase-0-workspace-scaffold.md#5-open-questions)): `audio` does not import `media`. `audio` declares the prepared-PCM reader the mixer needs as its own interface, `media` implements it without importing `audio`, and `app-state` or the app's worker start-up connects them. Consequence for 4.1: decoding (Mediabunny, `AudioDecoder`) and the job scheduler are in `media`, which cannot import `audio`; the 4.1 plan says where resampling sits and how the job reaches it, together with Q4.1. | 4.1 |

## 6. Stage log

| Date | Change |
|---|---|
| 2026-11-24 | Document created. |
| 2026-11-26 | Q4.5 resolved through Phase 0 Q0.8. |

## 7. Handoff

- **Read first:** architecture §10, ADR-0008, Phase 1 Q1.3.
- **Do next:** after Phase 3 stage 3.5 and Phase 1 stage 1.4, answer Q4.1 and Q4.3 and start
  stage 4.1 (Q4.5 is resolved; its consequence for 4.1 is part of that stage's plan). Answer Q4.4
  before 4.2 and Q4.2 before 4.3.
