# Phase 8 — Feature Widening

**Status:** Not started · Leads to the desktop feature set · [Roadmap](roadmap.md)

## 1. Goal and scope

Grow the walking skeleton into the full desktop feature set of the
[functional specification](../moviemaker-functional-specification.md), one track at a time, on
desktop. Each track runs through `core`, the engine or audio, `app-state`, and the desktop UI, so
Phase 9 can reuse everything except the UI.

**In scope:** every specification capability not in the skeleton.

**Out of scope:** the Android UI and adapters (Phase 9), installers and release work (Phase 10).

Tracks are independent unless a dependency is listed. Release scope (specification §9) decides
which tracks the first release needs. A track is refined into file-level stages by the Planner when
it starts, and this document is updated then.

## 2. Progress

| Stage | Track | Depends on | Blocked by | Status |
|---|---|---|---|---|
| 8.1 | Editing completeness | — | — | Not started |
| 8.2 | Project settings | — | Specification §9: custom aspect ratio, background colour choice | Not started |
| 8.3 | Shader transitions | — | — | Not started |
| 8.4 | Mesh and particle presets | 8.3 | Prototype 7.10 | Not started |
| 8.5 | Visual effects and clip fades | 8.3 | Specification §9: what appears behind a single-clip fade | Not started |
| 8.6 | Pan & Zoom families | — | Specification §9: Automatic behaviour | Not started |
| 8.7 | Text and captions | — | Specification §9: caption styling, text presets, second Cinematic Burst; prototype 7.7 | Not started |
| 8.8 | Video clip editing | — | Specification §9: audio fade lengths; prototype 7.9 | Not started |
| 8.9 | Music, narration, and ducking | 8.1 | Specification §9: ducking amount and ramps | Not started |
| 8.10 | Fit to Music | 8.9 | Specification §9: Fit to Music decisions | Not started |
| 8.11 | Portability | — | — | Not started |
| 8.12 | Desktop codecs and proxies | — | Prototypes 7.1, 7.6, 7.8 | Not started |
| 8.13 | Capture | 8.9 | Permissions approval | Not started |
| 8.14 | Stabilization | 8.8 | Prototype 7.11 | Not started |
| 8.15 | Desktop UI completeness | 8.1 | Wireframe open questions | Not started |

## 3. Stages

### 8.1 Editing completeness

Specification §3. Split, remove, select all, multi-select, cut, copy, and paste with asset
references (architecture §6), rotate left and right, per-clip media fit, and apply-to-all as one
command.
**Exit:** every command has an undo test; pasting into another project adds the missing assets.

### 8.2 Project settings

Specification §1. Aspect ratio (16:9, 4:3, custom), default media fit, and project background
colour.
**Exit:** changing the aspect ratio re-renders every clip correctly in golden frames; the project
file stays resolution-independent.

### 8.3 Shader transitions

Specification §5.1. Every `shader` preset in the transition table, many ported from gl-transitions
(MIT), each with a duration limit in the UI and **Apply to all clips**.
**Exit:** every preset has golden frames at three progress values; every preset family is approved
by the user before it is added (AGENTS.md).

### 8.4 Mesh and particle presets

Architecture §8.4. Generic passes for the `mesh` and `particles` kinds, then page curls, flip, roll,
fans, shatter, whirlwind, wrap, and Cinematic Burst.
**Exit:** golden frames per preset; 30 fps at preview resolution on the low-end device from
prototype 7.10.

### 8.5 Visual effects and clip fades

Specification §6. The effect stack (add, reorder, remove), every effect preset, and the four clip
fade presets.
**Exit:** golden frames for each effect and for a stack of two in both orders.

### 8.6 Pan & Zoom families

Specification §5.2. Every Pan & Zoom preset, including Automatic, resolved into stored rectangles
when applied.
**Exit:** the same project renders the same framing on every run and device.

### 8.7 Text and captions

Specification §3–§4; architecture §8.5. The `fonts` package with the bundled set and licence files,
text layout and rasterization, text clips, captions on the single caption track with soft anchors
([ADR-0004](../adrs/0004-soft-anchors-for-captions-and-narration.md)), on-canvas caption editing,
and text entry and exit presets.
**Exit:** every soft-anchor rule is pinned by a unit test (test instructions); text golden frames
match across desktop OSs within tolerance.

### 8.8 Video clip editing

Specification §7. Speed, pitch mode (`shift` by resampling, `preserve` with Signalsmith Stretch),
embedded audio on and off, volume, and audio fade-in and fade-out.
**Exit:** audio tests for speed mapping and both pitch modes; preview never time-stretches in real
time.

### 8.9 Music, narration, and ducking

Specification §8. Several music tracks, the narration track with soft anchors, track volumes,
ducking, and waveforms.
**Exit:** narration re-anchoring, shortening, and removal rules are pinned by unit tests; ducking is
checked at sample level.

### 8.10 Fit to Music

Specification §1.1; architecture §6. A pure function in `core` returning new durations or a typed
reason, one undo step, and the **Fit to Music failure dialog**.
**Exit:** the worked examples in specification §1.1 are unit tests.

### 8.11 Portability

Architecture §6.1. Relink by fingerprint with the **Relink dialog**, missing media handling,
`.mmpack` package and unpack, and the recovery flow on every save path.
**Exit:** a packaged project opens on another desktop OS and renders the same golden frames.

### 8.12 Desktop codecs and proxies

Architecture §9, §11; [ADR-0009](../adrs/0009-desktop-ffmpeg-sidecar.md). The FFmpeg sidecar
(LGPL, separate process, spawned without a shell), intermediates, encoder fallback, HEIC through
libheif in a worker, proxies, the WebM fallback, and the full export preset list.
**Exit:** HEVC footage previews and exports on Windows without the HEVC extension and on Linux; the
sidecar receives only allowlisted paths (tests).

### 8.13 Capture

Specification §2. Webcam photo and video, and narration recording through `Capture`, with results
added as assets.
**Exit:** each Electron permission and IPC channel added is approved; captured media relinks like
imported media.

### 8.14 Stabilization

Architecture §12.1. The analysis job (OpenCV.js in a worker), the transform track in the edit plan,
and the stabilization pass.
**Exit:** golden frames of a stabilized fixture; the analysis is cached and cancellable.

### 8.15 Desktop UI completeness

The full desktop wireframes: the complete **Timeline view**, **Menu bar**, keyboard shortcuts, drag
and drop, the **Status bar**, the **Diagnostics panel**, and job badges.
**Exit:** every named surface in the UI vocabulary's desktop section exists and carries its symbol.

## 4. Decisions already taken

- Tracks reuse the skeleton's architecture; none introduces a new pattern without an ADR.
- Every schema change in any track bumps `schemaVersion` and adds a migration (AGENTS.md), unless
  Phase 1 Q1.1 already put the field in schema version 1.
- Each new preset kind or family needs approval; a changed look gets a new preset version.

## 5. Open questions

| # | Question | Recommendation | Blocks |
|---|---|---|---|
| Q8.1 | In what order do the tracks run? | 8.1, 8.3, 8.6, 8.7, 8.9, 8.8, 8.10, 8.11, 8.12, 8.5, then the rest. Titles, captions, music, and Fit to Music are what a montage needs most. The user sets release scope. | Phase start |
| Q8.2 | Approve Signalsmith Stretch (MIT), OpenCV.js (Apache 2.0), libheif (LGPL, replaceable module), and an LGPL FFmpeg build with OpenH264? | Approve each when its track starts, after the licence check. | 8.8, 8.12, 8.14 |
| Q8.3 | All specification §9 decisions listed in §2 above. | The Planner drafts a recommendation for each when its track starts; the user decides. | Their tracks |

## 6. Stage log

| Date | Change |
|---|---|
| 2026-11-24 | Document created. |

## 7. Handoff

- **Read first:** the roadmap, the specification section of the track, and the matching architecture
  sections.
- **Do next:** after the walking skeleton, answer Q8.1, then ask the Planner to refine the first
  track into file-level stages.
