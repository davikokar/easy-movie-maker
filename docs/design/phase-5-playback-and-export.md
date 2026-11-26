# Phase 5 — Playback and Export

**Status:** Not started · Part of the walking skeleton · [Roadmap](roadmap.md)

## 1. Goal and scope

Build `packages/app-state`: the store, the document lifecycle (save, open, autosave), the playback
controller, and the export controller. At the end, the playground plays the skeleton project in
sync and exports it to MP4.

**In scope:** everything the UIs will call. Export to MP4 with H.264 and AAC through WebCodecs, with
backpressure and streaming output (architecture §11, §16).

**Out of scope:** UI layout (Phase 6), FFmpeg and MediaCodec fallbacks, WebM fallback, and the full
export preset list (Phase 8).

## 2. Progress

| Stage | Title | Status |
|---|---|---|
| 5.1 | Store and document lifecycle | Not started |
| 5.2 | Playback controller | Not started |
| 5.3 | Export controller | Not started |
| 5.4 | Export presets and smoke tests | Not started |

## 3. Stages

### 5.1 Store and document lifecycle

- **Outcome:** a framework-agnostic store holding the current revision, history, transient gesture
  revisions, selection, notices, and diagnostics, with React hooks for the apps. A document
  controller for new, open, save, save as, autosave to a recovery copy, and restore on startup,
  using `ProjectFiles` and `AppPaths` (architecture §6, §14.1).
- **Owner:** Coder.
- **Depends on:** Phase 1 stage 1.3, Phase 3 stage 3.1.
- **Exit criteria:**
  - Undo and redo through the store match `core` history.
  - Autosave runs at an interval and after significant commands, and never blocks a gesture.
  - After a simulated crash, the next start offers the recovery copy when it is newer than the
    saved file.

### 5.2 Playback controller

- **Outcome:** play, pause, seek, and scrub with latest-request-wins. It recompiles the edit plan on
  every revision (transient ones included) and drives the engine and mixer from the preview clock.
- **Owner:** Coder.
- **Depends on:** 5.1, Phase 4 stage 4.4.
- **Exit criteria:**
  - Rapid scrubbing renders only the latest requested time, with no backlog.
  - Editing while playing updates the picture and sound without stopping playback.

### 5.3 Export controller

- **Outcome:** export compiles a plan with originals, runs pending jobs first, renders each frame
  through `renderFrame` into `VideoEncoder`, mixes audio in a worker in chunks of about 10 seconds
  into `AudioEncoder`, and muxes with Mediabunny into a streaming `ExportSink` (architecture §11).
  Rendering pauses while `encodeQueueSize` is above a threshold. Progress and time left come from
  the frame index. Cancel deletes the partial file. `KeepAwake` is held throughout.
- **Owner:** Coder.
- **Depends on:** 5.1, Phase 2 stage 2.4, Phase 4 stage 4.2, Phase 7 stage 7.1.
- **Exit criteria:**
  - Memory stays flat during a long export (measured on a project of several minutes).
  - Cancel at any point leaves no output file.
  - The export uses the same `renderFrame` and mixer as preview; no export-only render path exists.

### 5.4 Export presets and smoke tests

- **Outcome:** export presets as data (resolution, frame rate, container, codecs, bitrates), filtered
  by the capability profile, and an export smoke test in the playground that exports fixture
  projects and probes the output (architecture §14.2).
- **Owner:** Coder; Planner adds the export smoke conventions to the test instructions.
- **Depends on:** 5.3.
- **Exit criteria:**
  - The output's duration and frame count match the plan, and audio starts in sync with the picture
    within one frame.
  - The file plays in a common player on the development machine.
  - A preset the capability profile does not support is not offered, and the reason is available.

## 4. Decisions already taken

- Preview and export share the plan, the renderer, and the mixer (ADR-0002, ADR-0008).
- Default output is MP4 with H.264 and AAC (architecture §11).
- The store library is Zustand or similar with Immer or similar (architecture §2), subject to Q5.1.
- `app-state` imports `core`, `engine`, `audio`, `media`, and the `platform` interfaces. It, or an
  app's worker start-up, connects `media` to the inputs `engine` and `audio` declare
  (architecture §3, §4; Phase 0 Q0.8 and Q0.11, 2026-11-26).

## 5. Open questions

| # | Question | Recommendation | Blocks |
|---|---|---|---|
| Q5.1 | Approve Zustand and Immer (both MIT)? | Yes. | 5.1 |
| Q5.2 | Which export presets does the skeleton offer? | One: 1080p at 30 fps, MP4, H.264 and AAC. Add 720p if the capability profile rejects 1080p on a target. | 5.4 |
| Q5.3 | Autosave interval? | Every 60 seconds while there are unsaved changes, plus after compound commands. | 5.1 |
| Q5.4 | Where does the export smoke test run before Electron exists? | In the playground with Playwright. Phase 6 moves it to Electron, which is the target named in architecture §14.2. | 5.4 |
| Q5.5 | Which packages may `app-state` import? | Resolved 2026-11-26 ([Phase 0 Q0.11](phase-0-workspace-scaffold.md#5-open-questions)): `core`, `engine` (root and catalog), `audio`, `media`, and the `platform` root; never `@moviemaker/platform/browser` or `fonts`. | 5.1 |

## 6. Stage log

| Date | Change |
|---|---|
| 2026-11-24 | Document created. |
| 2026-11-26 | Q5.5 resolved through Phase 0 Q0.11. |

## 7. Handoff

- **Read first:** architecture §6, §10.3, §11, §14.1, ADR-0002, ADR-0008.
- **Do next:** after Phase 4, answer Q5.1 and Q5.3 and start stage 5.1 (Q5.5 is resolved);
  answer Q5.2 and Q5.4 before 5.4. Stage 5.1 can start as soon as
  Phase 1 stage 1.3 and Phase 3 stage 3.1 are complete. Confirm Phase 7 stage 7.1 has passed
  before 5.3.
