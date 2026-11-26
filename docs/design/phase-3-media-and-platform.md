# Phase 3 — Media and Platform

**Status:** Not started · Part of the walking skeleton · [Roadmap](roadmap.md)

## 1. Goal and scope

Build `packages/platform` (the adapter interfaces and the browser implementation used by the
playground) and `packages/media` (probe, fingerprint, decode, capabilities, jobs, and caches). Media
input then reaches the engine from real files.

**In scope:** the adapters the skeleton needs, probing and fingerprinting, video and image decoding,
the capability profile, the job scheduler with caches, and thumbnails.

**Out of scope:** proxies, intermediates, HEIC conversion, waveforms, and relink (Phase 8). Audio
decoding and preparation belong to Phase 4.

## 2. Progress

| Stage | Title | Status |
|---|---|---|
| 3.1 | Adapter interfaces and browser implementation | Not started |
| 3.2 | Probe and fingerprint | Not started |
| 3.3 | Video and image decoding | Not started |
| 3.4 | Capability profile | Not started |
| 3.5 | Job scheduler, caches, and thumbnails | Not started |

## 3. Stages

### 3.1 Adapter interfaces and browser implementation

- **Outcome:** TypeScript interfaces for the skeleton's adapters from architecture §13.1:
  `ProjectFiles`, `AssetPicker`, `MediaAccess`, `ExportSink`, `KeepAwake`, and `AppPaths`. Also a
  browser implementation in `platform` using the File System Access API and OPFS, injected by the
  playground at startup.
- **Owner:** Coder; Planner records the approved signatures in architecture §13.1 if they refine it.
- **Exit criteria:**
  - The interfaces are approved by the user before they are implemented (AGENTS.md).
  - `MediaAccess` reads byte ranges; no asset is loaded whole into memory (architecture §9).
  - `ExportSink` accepts a stream of chunks and supports abort with deletion of the partial file.

### 3.2 Probe and fingerprint

- **Outcome:** probing with Mediabunny (duration, tracks, codecs, dimensions, rotation, frame rate,
  audio presence) and the fingerprint: file size plus SHA-256 of the first, middle, and last 1 MiB
  (architecture §9). Results fill the `Asset` fields from Phase 1.
- **Owner:** Coder.
- **Depends on:** 3.1.
- **Exit criteria:**
  - Fixture files (H.264 MP4 with and without audio, rotated phone video, JPEG with EXIF
    orientation, PNG) probe to the expected metadata.
  - Files under 3 MiB fingerprint correctly, with overlapping or short ranges handled.

### 3.3 Video and image decoding

- **Outcome:** a pool of WebCodecs `VideoDecoder`s with a per-device instance limit, seeking from
  the nearest earlier keyframe, and a small frame cache around the playhead. Image decoding with
  `createImageBitmap`, downscaled to the largest size needed and EXIF-oriented. Together they
  implement the engine's frame source from Phase 2 stage 2.2.
- **Owner:** Coder.
- **Depends on:** 3.2, Phase 2 stage 2.2.
- **Exit criteria:**
  - The playground plays a fixture plan of photos and videos from real files.
  - Seeking to any time returns the frame whose presentation interval contains it, checked against
    a frame-numbered fixture video.
  - Every `VideoFrame` is closed; a long scrub does not grow memory.

### 3.4 Capability profile

- **Outcome:** a startup profile built from `isConfigSupported()` checks and WebGL limits. It drives
  the decoder pool size, texture size limits, and, from Phase 5, export preset filtering
  (architecture §9).
- **Owner:** Coder.
- **Depends on:** 3.3.
- **Exit criteria:**
  - The profile is plain data, logged in the playground, and passed to the engine and media pools.
  - An unsupported source codec produces a diagnostic rather than a failed decode loop.

### 3.5 Job scheduler, caches, and thumbnails

- **Outcome:** a scheduler running jobs in workers with priorities, cancellation, and progress.
  Caches live under `AppPaths` with a size limit and least-recently-used eviction. Probe,
  fingerprint, and thumbnail generation run as jobs (architecture §12).
- **Owner:** Coder.
- **Depends on:** 3.2.
- **Exit criteria:**
  - A cancelled job leaves no partial cache entry.
  - Deleting the cache directory loses no project data; everything is recomputed.
  - Thumbnails are cached by fingerprint and reused across projects.

## 4. Decisions already taken

- Mediabunny for demux and mux; WebCodecs for decode (architecture §2).
- Assets are referenced by fingerprint
  ([ADR-0005](../adrs/0005-fingerprint-asset-references-and-android-media-folder.md)).
- The playground uses browser APIs only and has no `MediaTranscoder` (architecture §13.1).
- `platform` imports no other package, and `media` imports only `core` and the `platform`
  interfaces (architecture §4; Phase 0 Q0.8 and Q0.10, 2026-11-26).

## 5. Open questions

| # | Question | Recommendation | Blocks |
|---|---|---|---|
| Q3.1 | Approve Mediabunny (MPL-2.0)? | Resolved 2026-11-26: approved. It is already used by prototype 7.1. | 3.2 |
| Q3.2 | Approve the adapter interface signatures? | Review them as a short, separate change before 3.1 is implemented. [Phase 0 Q0.10](phase-0-workspace-scaffold.md#5-open-questions) is resolved (2026-11-26): `platform` imports nothing, so the signatures use bytes, byte ranges, paths, URLs, and small types of their own, never `core` types; `app-state` or `media` translate. If a signature genuinely needs a `core` type, allowing `platform → core` is a one-line rule change, proposed together with the signatures. | 3.1 |
| Q3.3 | Default decoder pool size and frame cache size on desktop? | Start with two decoders (one per transition layer) and a cache of a few frames each side of the playhead. Measure in the playground before fixing. | 3.3 |
| Q3.4 | Where do fixture media files live, and under what licence? | In a test fixtures folder, created in-house (generated test patterns), so their licence is clear. | 3.2 |
| Q3.5 | Does `media` implement the engine's frame source without importing `engine`? | Resolved 2026-11-26 ([Phase 0 Q0.8](phase-0-workspace-scaffold.md#5-open-questions)): yes. `media` imports only `core` and the `platform` interfaces, implements the frame source of Phase 2 stage 2.2 without importing `engine`, and `app-state` or the app's worker start-up connects them. | 3.3 |
| Q3.6 | Does lint stop the `platform` root from reaching the browser implementation (for example `export * from './browser/index'` in `src/index.ts`), which would give `engine`, `audio`, and `media` a platform implementation? | Resolved 2026-11-26 ([Phase 0 Q0.12](phase-0-workspace-scaffold.md#5-open-questions)): yes. `moviemaker/entry-isolation` rejects any import of `src/browser/` or `@moviemaker/platform/browser` from `platform`'s `src/` outside `src/browser/`, with cases in the `lint-rules` suite, so 3.1 needs no extra exit criterion. A route through a file outside `src/` remains; Phase 0 Q0.13 recommends closing it before 3.1. | 3.1 |

## 6. Stage log

| Date | Change |
|---|---|
| 2026-11-24 | Document created. |
| 2026-11-26 | Q3.5 and Q3.6 resolved through Phase 0 Q0.8 and Q0.12; Phase 0 Q0.10, which shapes Q3.2, resolved. |

## 7. Handoff

- **Read first:** architecture §9, §12, §13.1, ADR-0005.
- **Do next:** after Phase 1 stage 1.2, approve Q3.2 and start stage 3.1 (Q3.1, Q3.6, and Phase 0
  Q0.10 are resolved; Phase 0 Q0.13 is recommended before 3.1). Answer Q3.4 before 3.2, and Q3.3
  before 3.3 (Q3.5 is resolved). Stage 3.3 also needs Phase 2 stage 2.2.
