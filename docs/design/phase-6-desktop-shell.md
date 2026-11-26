# Phase 6 — Desktop Shell

**Status:** Not started · Completes the walking skeleton · [Roadmap](roadmap.md)

## 1. Goal and scope

Create `apps/desktop`: the Electron main process, preload, and React renderer, with the desktop
adapter implementations and the minimum desktop UI for the skeleton. When this phase is complete,
the walking skeleton (architecture §16) is done.

**In scope:** Electron security (architecture §13.2), the desktop adapters the skeleton uses, the
skeleton UI drawn from the [wireframes](../mockups/index.html), export smoke tests in Electron, and
the walking-skeleton acceptance run.

**Out of scope:** the FFmpeg sidecar, installers and signing (Phases 8 and 10), and UI for features
not in the skeleton.

## 2. Progress

| Stage | Title | Status |
|---|---|---|
| 6.1 | Electron app and security baseline | Not started |
| 6.2 | Desktop adapters | Not started |
| 6.3 | Skeleton UI | Not started |
| 6.4 | Export smoke tests and skeleton acceptance | Not started |

## 3. Stages

### 6.1 Electron app and security baseline

- **Outcome:** main, preload, and renderer processes with `contextIsolation` and `sandbox` on,
  `nodeIntegration` off, a strict Content Security Policy, and no remote content. The renderer is
  cross-origin isolated so the audio ring buffer can use `SharedArrayBuffer`. The engine, mixer, and
  job workers run as in the playground.
- **Owner:** Coder.
- **Exit criteria:**
  - A test asserts the `webPreferences` and CSP; navigation to any remote URL is blocked.
  - The renderer has no access to Node APIs.
  - The playground's fixture project plays in the Electron renderer.
  - `apps/desktop` is registered in `vitest.config.ts`, the root `tsconfig.json`, and the `apps`
    list in `eslint.config.js` with the third-party specifiers each of its file groups may import
    (test instructions), and its React files and `*.test.tsx` tests
    typecheck. Phase 0 set no `jsx` option.

### 6.2 Desktop adapters

- **Outcome:** the Electron implementations of `ProjectFiles` (native dialogs, `fs`), `AssetPicker`,
  `MediaAccess` (a `media://` protocol with range support), `ExportSink` (a write stream in main via
  IPC), `KeepAwake` (`powerSaveBlocker`), and `AppPaths` (`app.getPath`). The preload exposes a typed
  `contextBridge` API (architecture §13.1, §13.2).
- **Owner:** Coder.
- **Depends on:** 6.1, Phase 3 stage 3.1.
- **Exit criteria:**
  - Every IPC channel is approved by the user (AGENTS.md) and validates its arguments. Tests send
    malformed arguments and expect rejection.
  - `media://` serves only allowlisted paths. Tests for path traversal, unlisted files, and
    encoded separators expect refusal.
  - Range requests on `media://` return correct partial content.

### 6.3 Skeleton UI

- **Outcome:** the subset of the desktop wireframes the skeleton needs, using the names in the
  [UI vocabulary](../../.github/instructions/ui-vocabulary.instructions.md): the **Media library**,
  the **Storyboard view** with **Storyboard cards**, **Transition badges**, the **Insertion bar**, and
  the **Add media card**, the **Preview** and **Transport bar**, the **Properties panel** sections
  the skeleton uses (**Clip**, **Transition in**, **Pan & Zoom**), the **Toolbar** (Import, Undo,
  Redo, Export), the **Export dialog**, **Export progress dialog**, **Restore dialog**, and
  **Notice**. Where music and trims are edited depends on Q6.1.
- **Owner:** Designer for the selection of wireframe parts and the UI vocabulary; Coder for the
  implementation. Shared components go to `ui-kit`.
- **Depends on:** 6.2, Phase 5.
- **Exit criteria:**
  - Every skeleton command from Phase 1 stage 1.3 is reachable from the UI.
  - Drag to reorder and drag to trim are each one undo step.
  - Components carry their canonical names; the UI vocabulary records their symbols.
  - No wireframe open question is implemented past (UI vocabulary *Interaction language*).

### 6.4 Export smoke tests and skeleton acceptance

- **Outcome:** export smoke tests running in Electron with Playwright (architecture §14.2), and the
  acceptance run of the walking-skeleton milestone (see the [roadmap](roadmap.md) §4).
- **Owner:** Coder; verification phase owns the gate.
- **Depends on:** 6.3.
- **Exit criteria:**
  - On Windows: import photos, a video, and a song; reorder, trim, change a duration; add a
    crossfade and Zoom In — Center; play in sync; save, close, reopen; undo; export to MP4 with H.264
    and AAC; and the export matches the preview in content and timing.
  - The export smoke tests pass in Electron.
  - The architecture, AGENTS.md *Current phase*, and the roadmap reflect what landed.

## 4. Decisions already taken

- Electron, with the security rules in architecture §13.2 (ADR-0001).
- Desktop and mobile UIs are separate apps; shared components live in `ui-kit` (architecture §14.1).
- The skeleton is accepted on Windows, the development machine. macOS and Linux follow in Phase 10.

## 5. Open questions

| # | Question | Recommendation | Blocks |
|---|---|---|---|
| Q6.1 | Where are video trims and the music clip edited in the skeleton? The wireframes put exact timing and all audio edits in the **Timeline view**. | Include a minimal Timeline view with the **Ruler**, **Pictures lane**, **Video audio lane**, and one **Music track lane**. The Designer confirms the subset. | 6.3 |
| Q6.2 | Approve Electron and electron-builder (both MIT)? Which Electron version? | Yes, the current stable release at the start of the phase. Check its OS minimums against architecture §13.5. | 6.1 |
| Q6.3 | Approve the IPC channel list? | Review it as one short change before 6.2: project file read and write, dialogs, export sink open, write, close, and abort, keep awake, and app paths. | 6.2 |
| Q6.4 | Are menus in the skeleton? | Only File (New, Open, Save, Save As, Export) and Edit (Undo, Redo), with their shortcuts. | 6.3 |

## 6. Stage log

| Date | Change |
|---|---|
| 2026-11-24 | Document created. |

## 7. Handoff

- **Read first:** architecture §13.1–§13.2, §14, ADR-0001, the UI vocabulary, the desktop
  wireframes.
- **Do next:** after Phase 5, answer Q6.1–Q6.4 and start stage 6.1. Stage 6.1 can start earlier,
  in parallel with Phase 5.
