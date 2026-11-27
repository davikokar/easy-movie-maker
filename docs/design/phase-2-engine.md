# Phase 2 — Engine

**Status:** Not started · Part of the walking skeleton · [Roadmap](roadmap.md)

## 1. Goal and scope

Build `packages/engine`: a deterministic `renderFrame(plan, t, target)` running in a worker with
WebGL2. Also build the preset catalog and the golden-frame harness in `apps/playground`.

**In scope:** the per-frame pipeline steps the skeleton needs (architecture §8.3): orientation and
rotation, Pan & Zoom, fit to canvas, and transition compositing. Also the `shader` and `transform`
preset kinds, a crossfade, and one Pan & Zoom preset.

**Out of scope:** stabilization, visual effects, clip fades, captions and text, and the `mesh` and
`particles` kinds (Phase 8). Their pipeline steps exist as pass-throughs so the order is fixed now.

## 2. Progress

| Stage | Title | Status |
|---|---|---|
| 2.1 | Engine worker and render target | Not started |
| 2.2 | Sources, orientation, and fit | Not started |
| 2.3 | Preset catalog and generic passes | Not started |
| 2.4 | Transition compositing | Not started |
| 2.5 | Golden-frame harness | Not started |

## 3. Stages

### 2.1 Engine worker and render target

- **Outcome:** a dedicated worker owning an `OffscreenCanvas` with WebGL2, a message protocol (plan
  update, render at time `t`, frame ready, diagnostics), and a pooled set of ping-pong framebuffers
  (architecture §8.2).
- **Owner:** Coder.
- **Exit criteria:**
  - The playground renders the project background (black or white) through the worker.
  - Messages carry only serializable data; the edit plan crosses unchanged.
  - Losing the WebGL context is reported as a diagnostic and recovered on the next render.

### 2.2 Sources, orientation, and fit

- **Outcome:** an engine-side frame source interface that returns a `VideoFrame` or `ImageBitmap`
  for a source and source time. The playground backs it with fixture images and videos until Phase 3
  replaces it. Uploads close each `VideoFrame` immediately. Passes for EXIF orientation and clip
  rotation, and for media fit (`fit` with bars, `fill` cropping around the centre).
- **Owner:** Coder.
- **Depends on:** 2.1, Phase 1 stage 1.4.
- **Exit criteria:**
  - Golden frames for each rotation and for both fits, with landscape and portrait sources on 16:9
    and 4:3 canvases.
  - Texture sizes are clamped to `MAX_TEXTURE_SIZE`.

### 2.3 Preset catalog and generic passes

- **Outcome:** the single preset catalog in `engine` (metadata for UIs, programs for the renderer),
  a generic pass for the `shader` kind and one for the `transform` kind, a crossfade transition, and
  one Pan & Zoom preset applying resolved start and end rectangles (architecture §8.4;
  [ADR-0007](../adrs/0007-webgl2-renderer-with-data-only-presets.md)). Unknown IDs render the
  neutral fallback.
- **Owner:** Coder.
- **Depends on:** 2.2.
- **Exit criteria:**
  - Preset definitions contain no JavaScript; shaders are GLSL ES 3.00.
  - Pan & Zoom with `fit` keeps the picture's proportions and bars; with `fill` it fills the canvas.
  - An unknown ID renders a hard cut or no effect and reports a diagnostic.

### 2.4 Transition compositing

- **Outcome:** transition segments render the outgoing and incoming layers into separate
  framebuffers and composite them with the transition's progress. The first clip's transition
  composites over the project background.
- **Owner:** Coder.
- **Depends on:** 2.3.
- **Exit criteria:**
  - The outgoing clip keeps moving during the overlap (its Pan & Zoom advances), checked by golden
    frames at the start, middle, and end of a transition.
  - The same plan and time render the same pixels twice in a row.

### 2.5 Golden-frame harness

- **Outcome:** a Playwright project that loads the playground headless, renders fixture plans at
  fixed times, and compares them with reference PNGs within a tolerance (architecture §14.2).
- **Owner:** Coder; Planner adds the conventions to the test instructions.
- **Depends on:** 2.1. Grows with 2.2–2.4.
- **Exit criteria:**
  - Every pipeline step and both presets have golden frames.
  - A deliberate one-pixel shader change fails the test; a GPU-level difference within tolerance
    passes.
  - The test instructions record the file layout, naming, fixtures, and command for golden frames.
  - `--pass-with-no-tests` is removed from the `test:golden` script in
    `apps/playground/package.json`, so the gate fails when no golden-frame spec runs. Phase 0 added
    the flag only because no spec existed.

## 4. Decisions already taken

- WebGL2 behind a backend interface, in a worker with `OffscreenCanvas` (architecture §2, §8.2).
- Presets are versioned data (ADR-0007).
- Preview and export call the same `renderFrame` (ADR-0002).
- `engine` imports `core`, the `platform` interfaces, and `fonts`, never `media` or a platform
  implementation; its inputs, such as the frame source, are its own interfaces (architecture §4;
  Phase 0 Q0.8 and Q0.9, 2026-11-26).
- `src/catalog/` may not import the rest of `engine`; the reverse is allowed (architecture §4;
  Phase 0 Q0.12).

## 5. Open questions

| # | Question | Recommendation | Blocks |
|---|---|---|---|
| Q2.1 | Which Pan & Zoom preset is in the skeleton? | Zoom In — Center (specification §5.2). It has no random choice and shows the motion clearly. | 2.3 |
| Q2.2 | Golden-frame tolerance metric? | Per-pixel channel difference with a threshold, plus a maximum share of differing pixels. Calibrate on two GPUs before fixing the numbers. | 2.5 |
| Q2.3 | Where are references generated? | Headless Chromium with its software GL renderer, for stable references. Also run on a hardware GPU to calibrate the tolerance. | 2.5 |
| Q2.4 | Does the playground UI use React? | Yes, minimally, matching the apps. It hosts controls for loading a fixture and scrubbing. If yes, the change that adds React also sets the TypeScript `jsx` option, which Phase 0 left unset. | 2.1 |
| Q2.5 | Preset ID scheme for the two presets? | Follow the example in architecture §5.2: `transition.blend.crossfade@1` and `panzoom.zoom-in.center@1`. | 2.3 |
| Q2.6 | May `engine` import `media`, or does `media` implement the engine's frame source? | Resolved 2026-11-26 ([Phase 0 Q0.8](phase-0-workspace-scaffold.md#5-open-questions)): `engine` does not import `media`. The frame source of 2.2 is an `engine` interface; `media` implements it in Phase 3 stage 3.3 without importing `engine`, and `app-state` or the app's worker start-up connects them. | 2.2 |
| Q2.7 | Does lint stop the catalog entry point from reaching the rest of `engine` (for example `export * from '../index'` in `src/catalog/index.ts`), which would give `ui-kit` the renderer? | Resolved 2026-11-26 ([Phase 0 Q0.12](phase-0-workspace-scaffold.md#5-open-questions)): yes. `moviemaker/entry-isolation` rejects any import from `src/catalog/` of the rest of `engine`'s `src/` or of `@moviemaker/engine`, with cases in the `lint-rules` suite, so 2.3 needs no extra exit criterion. The route through a file outside `src/` is closed too ([Phase 0 Q0.13](phase-0-workspace-scaffold.md#5-open-questions), resolved 2026-11-26 and implemented): a file under `src/` imports by path only inside its package's `src/`. One route is still open: changing `engine`'s `package.json` `exports` or adding a tsconfig `paths` alias redirects an entry point without failing lint or typecheck ([Phase 0 Q0.15](phase-0-workspace-scaffold.md#5-open-questions), open, 2026-11-27). If Q0.15's test has not landed by 2.3, 2.3 gains an exit criterion that `engine`'s `exports` match the `entryPoints` table in `eslint.config.js` and no tsconfig sets `paths`. | 2.3 |

## 6. Stage log

| Date | Change |
|---|---|
| 2026-11-24 | Document created. |
| 2026-11-26 | Q2.6 and Q2.7 resolved through Phase 0 Q0.8 and Q0.12. |
| 2026-11-27 | Q2.7 updated: Phase 0 Q0.13 resolved and implemented, closing the route through a file outside `src/`. |
| 2026-11-27 | Phase 0 Complete. Q2.7 updated: Phase 0 Q0.15 opened on redirecting an entry point through configuration. |

## 7. Handoff

- **Read first:** architecture §7–§8, ADR-0002, ADR-0007, the test instructions.
- **Do next:** after Phase 1 stage 1.4, answer the questions each stage needs and start stage 2.1:
  Q2.4 before 2.1; Q2.1 and Q2.5 before 2.3; Q2.2 and Q2.3 before 2.5. Q2.6 and Q2.7 are
  resolved, and so is Phase 0 Q0.13. Phase 0 Q0.15 is answered before 2.3. Phase 0 is complete
  (2026-11-27), so stage 2.1 and the harness in 2.5 wait only for Phase 1 stage 1.4.
