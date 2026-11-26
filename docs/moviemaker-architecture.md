# MovieMaker — Architecture

**Status:** Draft · 23 November 2026

This document describes the technical architecture of the intended MovieMaker product on desktop and Android. It implements the capabilities in the [functional specification](moviemaker-functional-specification.md) and uses the terms defined in the [glossary](moviemaker-glossary.md). Release priorities are out of scope. Section 15 lists the risks that early prototypes must validate, and section 16 defines the first end-to-end build. Decisions with lasting impact are recorded as [architecture decision records](adrs/README.md), and each section governed by one links to it.

## 1. Goals and constraints

| Goal | Consequence for the architecture |
|---|---|
| Desktop (Windows, macOS, Linux) and Android. iOS possible later. | One TypeScript codebase for the engine, hosted by Electron on desktop and Capacitor on Android. Capacitor keeps iOS open. Android keeps a native engine as a fallback (section 13.3). |
| Offline only | All decoding, rendering, encoding, and analysis run on the device. No server components. |
| Preview matches export | Preview and export call the same renderer and the same audio mixer with the same edit plan. Preview uses proxies, so the match is in content and timing, not pixel for pixel. |
| Projects move between devices | The project model is resolution-independent, references assets by content fingerprint, and uses bundled fonts and stable preset IDs. |
| Separate desktop and mobile UIs | UIs are separate React apps. The project model, state store, engine, and media layers are shared. |
| Personal and learning project that may become open source | Prefer permissively licensed dependencies. Avoid GPL components. LGPL components run as separate processes or replaceable modules ([ADR-0006](adrs/0006-licensing-policy-for-dependencies.md)). |

## 2. Technology choices

| Concern | Choice | Notes |
|---|---|---|
| Language | TypeScript (strict) | Kotlin for Android plugins only. The TypeScript version is held to the range typescript-eslint supports. |
| UI | React | One React app per platform. |
| State | Framework-agnostic store (for example Zustand) with immutable updates (for example Immer) | Shared by both UIs. |
| Desktop shell | Electron | Ships its own Chromium, so WebCodecs, WebGL2, and OffscreenCanvas behave consistently on every desktop OS. |
| Android shell | Capacitor | Uses the system Android WebView (Chromium). Native features are Kotlin plugins. |
| Rendering | WebGL2 behind a backend interface | A WebGPU backend can be added later without changing the engine API. Presets are GLSL ES 3.00 and data, so a native OpenGL ES renderer can reuse them (section 8.4). |
| Video and audio codecs | WebCodecs (`VideoDecoder`, `VideoEncoder`, `AudioDecoder`, `AudioEncoder`) | Hardware-accelerated where the platform provides it. On desktop, an FFmpeg sidecar covers missing decoders and encoders (section 11). |
| Demux and mux | Mediabunny | MP4 and WebM read and write, including streaming output. MPL-2.0, a file-level copyleft that fits the licensing goal. |
| Audio | One mixer in TypeScript (WASM if needed), run in an `AudioWorklet` for preview and in a worker for export | Web Audio provides only the output and the preview clock (section 10). |
| Time-stretch (pitch preservation) | Signalsmith Stretch (WASM) | MIT licence. |
| Motion analysis (stabilization) | OpenCV.js (WASM) in a worker | Used only by the stabilization analysis job. |
| HEIC decoding | libheif compiled to WASM on desktop, `ImageDecoder` on Android | libheif and libde265 are LGPL and ship as a replaceable module. |
| Build | pnpm workspaces and Vite | |
| Tests | Vitest and Playwright | |
| Lint and format | ESLint with typescript-eslint, and Prettier | ESLint enforces the dependency rules that TypeScript cannot (section 4). |

Versions are recorded in the root [package.json](../package.json), [pnpm-workspace.yaml](../pnpm-workspace.yaml), and [pnpm-lock.yaml](../pnpm-lock.yaml), not here.

**Decisions.** Hosting one TypeScript engine in Electron and Capacitor, rather than Tauri, a native Rust or C++ core, Flutter, a native Android engine, or a web app only, is recorded in [ADR-0001](adrs/0001-shared-typescript-engine-electron-capacitor.md). The native Android engine remains the fallback (section 13.3), and the playground can still be published as a Chromium-only web version (section 13.1).

## 3. System overview

```mermaid
flowchart TB
    subgraph Apps["Platform apps (not shared)"]
        DUI[Desktop UI<br/>React + Electron]
        MUI[Mobile UI<br/>React + Capacitor]
    end
    subgraph Shared["Shared packages"]
        UIK[ui-kit<br/>shared React components]
        ST[app-state<br/>store, selectors, actions, playback controller]
        CORE[core<br/>project model, commands, edit plan compiler]
        ENG[engine<br/>WebGL2 renderer, presets, text]
        AUD[audio<br/>mixer, envelopes, time-stretch]
        MED[media<br/>probe, decode, encode, mux, proxies, caches]
        PLAT[platform<br/>adapter interfaces]
        FONTS[fonts<br/>bundled font files, font catalog]
    end
    subgraph Native["Platform adapter implementations, injected by the apps at startup"]
        BR[Browser implementation<br/>platform/browser, for the playground]
        EL[Electron main process]
        AN[Android Kotlin plugins]
    end
    DUI --> UIK
    MUI --> UIK
    DUI --> ST
    MUI --> ST
    UIK --> ST
    UIK -->|catalog only| ENG
    UIK --> FONTS
    ST --> CORE
    ST --> ENG
    ST --> AUD
    ST --> MED
    ST --> PLAT
    ENG --> CORE
    ENG --> PLAT
    ENG --> FONTS
    AUD --> CORE
    AUD --> PLAT
    MED --> CORE
    MED --> PLAT
    ENG -.frame source implemented by.-> MED
    AUD -.PCM reader implemented by.-> MED
    PLAT -.implemented by.-> BR
    PLAT -.implemented by.-> EL
    PLAT -.implemented by.-> AN
```

Solid arrows are imports and follow the dependency rules in section 4. Dotted arrows mean "implemented by" without an import. `engine` and `audio` declare the inputs they need as their own interfaces, such as the engine's frame source and the mixer's prepared-PCM reader. `media` implements them without importing `engine` or `audio`, and `app-state` or an app's worker start-up connects the two. The apps import every package and inject the platform implementations at startup. `core`, `platform`, and `fonts` import no other package.

### Data flow

```mermaid
flowchart LR
    P[Project revision] -->|compile| EP[Edit plan]
    EP --> PV[Preview<br/>proxies, realtime]
    EP --> EX[Export<br/>originals, frame by frame]
    PV --> R[renderFrame]
    EX --> R
    PV --> A[Audio mix]
    EX --> A
```

The project is the editable document. Every change produces a new **project revision**. A pure compiler turns each revision into an **edit plan**. Preview and export consume only edit plans. They never interpret the project directly ([ADR-0002](adrs/0002-edit-plan-shared-by-preview-and-export.md)).

## 4. Repository structure

```
easy-movie-maker/
├─ docs/
├─ packages/
│  ├─ core/         # model, schema, migrations, commands, timing, Fit to Music, edit plan
│  ├─ app-state/    # store, selectors, actions, playback and export controllers
│  ├─ ui-kit/       # React components shared by both apps (thumbnails, waveforms, preset grids, property controls)
│  ├─ engine/       # renderer, generic render passes, preset catalog, text layout
│  ├─ audio/        # shared mixer, AudioWorklet host, envelopes, resampling, time-stretch
│  ├─ media/        # probing, decode and encode pools, muxing, proxies, intermediates, thumbnails, waveforms
│  ├─ platform/     # adapter interfaces and a browser implementation for the playground
│  └─ fonts/        # bundled open-licensed font files and font catalog
├─ apps/
│  ├─ playground/   # browser app for engine development and golden-frame tests, optionally published as a web version
│  ├─ desktop/      # Electron main, preload, and React renderer
│  └─ mobile/       # Capacitor project, React app, Kotlin plugins
```

**Dependency rules**

- `core` has no runtime dependencies on other packages, the DOM, or platform APIs.
- `platform` and `fonts` import no other package. The adapter interfaces therefore use their own types, not `core` types (section 13.1).
- `engine` depends on `core`, on `platform` interfaces, and on `fonts`, which it loads into its worker (section 8.5).
- `audio` and `media` depend on `core` and on `platform` interfaces.
- `engine`, `audio`, and `media` never depend on a platform implementation, and `engine` and `audio` do not import `media`. They declare the inputs they need as their own interfaces, `media` implements them without importing `engine` or `audio`, and `app-state` or an app's worker start-up connects them (section 3).
- `app-state` depends on `core`, `engine` (its root and its preset catalog), `audio`, `media`, and `platform` interfaces. It never depends on a platform implementation or on `fonts`.
- `ui-kit` depends on `app-state`, on preset catalog metadata from `engine` (never the renderer), and on `fonts` for font pickers. It holds no app layout.
- No other package imports `fonts`.
- Apps may import every package and inject platform implementations at startup.
- Presets have a single catalog in `engine`. It provides metadata such as ID, display name, family, parameter schema, and thumbnail to the UIs, and preset programs to the renderer.

**Entry points and enforcement**

- Packages are consumed as TypeScript source: each package's `exports` points at its `src/`, and there is no build per package.
- Two subpath entry points make the rules above checkable: `@moviemaker/platform/browser` is the browser implementation of the platform interfaces, and `@moviemaker/engine/catalog` is the preset catalog metadata, the only part of `engine` that `ui-kit` imports.
- **TypeScript** enforces two things. Through project references and each package's declared workspace dependencies, a package can import by name only the workspace packages it declares and references; TypeScript does not distinguish the entry points of a referenced package, and does not stop a relative path into another package. And `core` is compiled with a library list that has no DOM, for its source and its tests, and its source with no ambient types (its tests get Node's types). That configuration alone does not stop `core` from importing a third-party file that declares DOM or Node types, such as `typescript/lib/lib.dom` or `node`; lint does.
- **ESLint alone** enforces the rest, in [eslint.config.js](../eslint.config.js), with the rules `moviemaker/package-boundary` and `moviemaker/entry-isolation` and `@typescript-eslint/triple-slash-reference`:
  - **Allowlist.** Every specifier that is not a relative or absolute path must appear exactly in the allowlist of the file's group. Package source may import its own entry points and the `@moviemaker` entry points its rules above allow, and no third-party or Node specifier. Package tests (`*.test.*` files and `tests/`) may also import `vitest`. Apps may import every package entry point, and each app lists the third-party specifiers of each of its file groups; for the playground, `vitest` in unit tests, `@playwright/test` in golden-frame specs and the Playwright configuration, and `vite` in the Vite configuration. The comparison is exact: a subpath (`vite/client`), another letter case, a trailing slash, or a `..` segment is a different specifier and fails until it is listed. So `engine`, `audio`, and `media` cannot import `@moviemaker/platform/browser`, `ui-kit` cannot import the `engine` root, and a new third-party or Node import needs an allowlist edit; for a third-party package that edit accompanies the approval [AGENTS.md](../AGENTS.md) requires.
  - **Paths.** A relative or absolute specifier fails if it contains a `node_modules` segment, or if it resolves outside the package or app root, before or after symbolic links are resolved. A backslash is read as a separator on every host.
  - **Entry isolation.** Inside a package, the entry point that more packages may import must not reach the other one. The `entryIsolation` table lists one row per such pair, and `moviemaker/entry-isolation` enforces it: files under `platform`'s `src/` outside `src/browser/` may not import `src/browser/` by path or `@moviemaker/platform/browser` by name, and files under `engine`'s `src/catalog/` may not import the rest of `engine`'s `src/` by path or `@moviemaker/engine` by name. The other direction stays allowed: the browser implementation imports the interfaces, and the renderer reads the catalog. The rule checks the same import forms as the allowlist, resolves a path before and after symbolic links, and covers TypeScript and JavaScript files under the protected folder, tests included. It checks each import on its own and does not follow a chain of imports, and it checks only files under the protected folder. A file outside `src/`, such as one under the package's `tests/` folder or at its root, is neither protected nor part of the other entry point, and a protected file may import it by relative path. Such a file can reach the other entry point by name, because the allowlist lets a package import its own entry points, or by relative path, such as `./src/browser/index` from the root of `platform` or `../src/index` from `engine`'s `tests/`. A protected file can therefore reach the other entry point through it, and TypeScript accepts the chain. Q0.13 (section 17) asks whether to close these routes.
  - **Directives.** `lib`, `path`, and `types` triple-slash directives are forbidden in package and app files, so none can add the DOM library, ambient types, or another package's files.
  - **Coverage.** The allowlist and path checks cover TypeScript files anywhere in a package or app, and JavaScript files (`.js`, `.jsx`, `.mjs`, `.cjs`) under its `src/` and `tests/` and in the app configuration files it lists. Inline configuration comments are ignored in those files, so an `eslint-disable` comment cannot switch the rule off. Only `dist` at the root and at each package and app root, and `playwright-report` and `test-results` at each app root, are ignored. JavaScript files elsewhere in a package or app are not linted: such a file can import anything, and package source can import it by a relative path such as `../leak.js`, which stays inside the package.
- Both rules check static imports and exports, `import()`, `import type` and `typeof import()`, `import x = require()`, and `require()`, when the specifier is a string literal or a template literal without expressions. Any other specifier is skipped, including a computed one and a string behind a type assertion (`'…' as string`). They do not check other ways of naming a module or path: `declare module` with a specifier, an `@jsxImportSource` pragma (effective only once a tsconfig sets `jsx`), `import.meta.resolve`, `import.meta.glob`, `new URL(…, import.meta.url)`, `vi.mock`, `vi.importActual`, `require.resolve`, and `createRequire`. They check imports, not globals: test files get Node's types, so Node globals such as `process` type-check there. They do not examine the imports inside third-party packages. A query or hash suffix on a specifier is not a way around them: TypeScript and Vite resolve the specifier to the same file.
- **One configuration.** ESLint uses the nearest `eslint.config.*` above each linted file, so a configuration file inside a package, an app, or one of their folders would replace the root configuration there and switch these rules off without an error. A unit test in `tools/lint/` fails when any `eslint.config.*` other than the root one exists in the repository. It matches the file name in any letter case, because ESLint loads a configuration whose name differs only in case on Windows; on a case-sensitive file system, as on Linux, the test is therefore stricter than ESLint. It skips exactly the folders that ESLint ignores, except `docs/`: `node_modules` at any depth, `.git`, the root `prototypes/` and `dist`, `dist` at each package and app root, and `playwright-report` and `test-results` at each app root. It still searches `docs/`, which ESLint ignores, so it reports a configuration there that ESLint would never use. A second test asks ESLint whether each of a set of generated folder names, at the root, at package and app roots, and deeper, is ignored, and fails if the answer differs from the skip list. It fails `pnpm test`, not `pnpm lint`: until such a file is removed, lint and the editor still use it.
- A package or app that is not listed in `eslint.config.js` is not checked at all, and a package with a second entry point gets no entry isolation without a row in `entryIsolation`; the [test instructions](../.github/instructions/tests.instructions.md) list where a new package or app is registered.
- Regression tests in `tools/lint/` run ESLint with this configuration against violating and allowed imports at real package and app paths, as part of the unit tests. They prove that the cases they list are rejected or accepted under the current configuration, so a configuration change that reopens one of those cases fails the tests. A form without a case is not covered.

## 5. Project model

### 5.1 Time and space

Time representation and derived sequence timing are recorded in [ADR-0003](adrs/0003-integer-microsecond-time-and-derived-sequence-timing.md).

- **Time** is stored as integer microseconds, which matches WebCodecs timestamps and avoids floating-point drift. Ranges follow the glossary convention `[in, out)`.
- **Frame rates** are rationals (`{ num: 30000, den: 1001 }`). Export frame *n* is at `round(n × 1 000 000 × den / num)` µs.
- **Effective duration** of a video clip is `round((out − in) / speed)`. One function in `core` computes it and the source-time mapping, so every package rounds the same way.
- **Canvas positions** (text boxes, caption placement) are normalized to the output canvas (0–1). Font sizes are relative to canvas height.
- **Pan & Zoom rectangles** are normalized to the rotated source image.
- The project stores the **aspect ratio** (16:9, 4:3, or custom), not a pixel resolution. Resolution belongs to the export preset.

### 5.2 Entities

```ts
type Micros = number; // integer microseconds

interface Project {
  schemaVersion: number;
  id: string;
  name: string;
  canvas: { aspect: { w: number; h: number }; background: 'black' | 'white' };
  defaultFit: MediaFit;     // initially 'fit'
  assets: Record<AssetId, Asset>;
  sequence: VisualClip[];   // the main visual edit, adjacent clips
  captions: Caption[];      // single caption track, no overlaps, soft-anchored to clips
  music: MusicTrack[];          // one or more music tracks
  narration: NarrationTrack;    // single narration track, soft-anchored to clips
  ducking: { enabled: boolean; amount: number };  // music level while narration plays, 0–1
}

type VisualClip = PhotoClip | VideoClip | TextClip;

interface VisualClipBase {
  id: ClipId;
  transitionIn?: PresetRef & { duration: Micros };  // overlaps the end of the preceding clip
  effects: PresetRef[];                              // stacked visual effects, applied in order
  entryFade?: PresetRef;                             // picture fade presets
  exitFade?: PresetRef;
}

interface PhotoClip extends VisualClipBase {
  kind: 'photo'; assetId: AssetId; duration: Micros;
  rotation: 0 | 90 | 180 | 270;
  fit?: MediaFit;                                           // absent: project default
  panZoom?: { presetId: string; start: Rect; end: Rect };  // resolved rectangles
}

interface VideoClip extends VisualClipBase {
  kind: 'video'; assetId: AssetId;
  in: Micros; out: Micros;             // source range
  speed: number;                       // effective duration = round((out - in) / speed)
  pitch: 'preserve' | 'shift';
  audioEnabled: boolean;
  volume: number;                      // embedded audio, 0–2, 1 = unchanged
  audioFadeIn: AudioFade; audioFadeOut: AudioFade;  // embedded audio only
  rotation: 0 | 90 | 180 | 270;
  fit?: MediaFit;
  stabilization?: { enabled: boolean; strength: number };
}

interface TextClip extends VisualClipBase {
  kind: 'text'; duration: Micros; background: Color; text: TextBlock;
}

interface Caption {
  id: string;
  anchorClipId: ClipId;   // timeline start = start(anchor) + offset
  offset: Micros;         // 0 ≤ offset < duration(anchor)
  duration: Micros;       // may extend past the anchor clip
  text: TextBlock;
}

interface TextBlock {
  content: string; fontId: string; size: number; color: Color;
  bold: boolean; italic: boolean; align: 'left' | 'center' | 'right';
  box: Rect; entry?: PresetRef; exit?: PresetRef;
}

interface MusicTrack { id: string; volume: number; clips: MusicClip[] }  // clips on one track never overlap
interface NarrationTrack { volume: number; clips: NarrationClip[] }      // clips never overlap

interface AudioClipBase {
  id: ClipId; assetId: AssetId;
  in: Micros; out: Micros;      // source range
  fadeIn: Micros; fadeOut: Micros;
  volume: number;               // 0–2, 1 = unchanged
}

interface MusicClip extends AudioClipBase { start: Micros }  // timeline time

interface NarrationClip extends AudioClipBase {
  anchorClipId: ClipId;         // timeline start = start(anchor) + offset
  offset: Micros;               // 0 ≤ offset < duration(anchor)
}

type MediaFit = 'fit' | 'fill';                        // fit: black bars, fill: crop to fill
type AudioFade = 'none' | 'slow' | 'medium' | 'fast';
interface PresetRef { id: string; params?: Record<string, number | string | boolean> }  // id is versioned
```

**Design notes**

- **Sequence timing is derived, not stored.** `start(0) = 0` and `start(i) = start(i−1) + duration(i−1) − transition(i)`, where `duration` is the effective duration and `transition(i)` is the duration of clip *i*'s incoming transition, or zero. The movie ends at `start(last) + duration(last)`. Reordering cannot create gaps.
- **Transitions belong to the incoming clip and overlap the outgoing clip**, whatever its type (specification §5.1). The incoming clip starts `transition(i)` earlier, and the outgoing clip keeps playing underneath: video continues, and Pan & Zoom, effects, and text presets keep moving. The first clip's transition runs from the project background over the clip's opening portion and does not change timing.
- **Every clip keeps a part without transitions.** A clip's effective duration must be at least `transition(i) + transition(i+1) + margin`, with a provisional margin of 0.1 s. Two transitions therefore never run at the same time. The UI limits transition and clip durations. When a trim, speed, or duration change breaks the rule, the same command scales the clip's two transitions down proportionally and the UI reports it. The compiler clamps the same way as a safety net and reports a diagnostic.
- **Media fit resolves per clip.** A clip uses its own `fit`, or the project's `defaultFit` when `fit` is absent.
- **Soft anchors.** Captions and narration clips store an anchor clip and an offset, not an absolute time ([ADR-0004](adrs/0004-soft-anchors-for-captions-and-narration.md)). Their timeline start is `start(anchor) + offset`, so inserting, removing, reordering, or resizing clips moves them with their anchor, and their duration does not change. After every command, an item whose start no longer falls inside its anchor clip re-anchors to the clip that contains that time, or to the last clip with the offset clamped, so `0 ≤ offset < duration(anchor)` always holds. Moving an item re-anchors it to the clip at its new start. Splitting the anchor clip keeps the anchor on the first part, and the same rule moves items that start in the second part.
- **Removing a caption's anchor clip** removes the caption in the same command, so one undo restores both.
- **Captions never overlap.** There is a single caption track. Caption commands reject edits that would overlap another caption. When a clip command (resize, reorder, insert) pushes a caption onto the next one, the same command shortens the earlier caption to end where the next one starts and the UI reports it. A caption pushed entirely under another is removed with a warning. Undo restores both cases.
- **New captions** start at the clip where they are added (`offset` 0) and last as long as that clip. Their `content` is empty. The UI shows the placeholder "[Enter text here]" as a hint, and an empty caption renders nothing. The default text box is 70% of the canvas width, centered horizontally and vertically.
- **Narration clips** keep their source range when they move. Removing the anchor clip keeps the narration clip and re-anchors it to the clip that takes the removed clip's place: the following clip, or the preceding one when the removed clip was last. Narration commands reject edits that would overlap another narration clip. When a clip command pushes a narration clip onto the next one, the same command moves the earlier clip's out point so it ends where the next one starts, and the UI reports it. A narration clip pushed entirely under another is removed with a warning. Undo restores both cases. Narration needs at least one visual clip, so removing the last visual clip also removes the narration, and undo restores it.
- **Music clips** keep absolute timeline times. Only music commands and Fit to Music move them.
- **Volume and ducking.** Video clips (embedded audio), audio clips, and tracks have a linear `volume` from 0 to 2, where 1 leaves the level unchanged. When `ducking.enabled` is set, the compiler lowers all music to `ducking.amount` of its level while any narration clip plays, with short ramps.
- **Presets are referenced by stable, versioned ID** (for example `transition.wipe.bow-tie-horizontal@1`, [ADR-0007](adrs/0007-webgl2-renderer-with-data-only-presets.md)). A preset whose look changes gets a new version, and the app keeps the old versions, so existing projects render unchanged. If the app does not recognise an ID, it keeps the reference in the project file and renders a neutral fallback (hard cut or no effect) with a warning. This keeps projects readable across app versions and devices.
- **Automatic Pan & Zoom resolves when applied.** The resolved rectangles are stored with the preset ID, so playback never depends on a random or device-specific choice.
- **Visual effects stack.** The list is applied in order, and the UI can reorder it.
- **Picture fades and audio fades are separate.** `entryFade` and `exitFade` are picture presets (specification §6). `audioFadeIn` and `audioFadeOut` affect only the embedded audio of a video clip (specification §7).
- **Analysis results are not stored in the project.** Stabilization data, proxies, intermediates, waveforms, and prepared audio are caches that can be recomputed (section 12).

### 5.3 Validation and migrations

- A runtime schema (for example Zod) validates every file on load.
- `schemaVersion` increases with every model change, and an ordered chain of migration functions upgrades older files.
- A file with a newer major version than the app supports opens read-only and the app explains why.

## 6. Commands, history, and persistence

- **Every edit is a command.** Commands include `AddClips`, `Reorder`, `Trim`, `Split`, `SetSpeed`, `SetTransition`, `SetVolume`, `ApplyToAll`, `FitToMusic`, and `Paste`. A command takes a revision and returns a new immutable revision.
- **Interactive edits.** During a drag such as a trim, reorder, or resize, the UI updates a transient revision. Preview compiles it, but history does not record it. Releasing the gesture commits one command, so one undo reverts the whole gesture.
- **Undo and redo** keep a revision stack. Structural sharing keeps memory low.
- **Compound operations** such as Fit to Music and "apply transition to all clips" are single commands, so one undo reverts them.
- **Fit to Music** is a pure function in `core` that implements specification §1.1. It uses the span from the earliest song start to the latest song end across all music tracks, so overlaps count once and gaps count. If the music does not start at timeline zero, the same command shifts all music clips so it does. Narration clips and captions follow their anchor clips. It accounts for every transition overlap and for the minimum clip durations (section 5.2). It returns either the new durations or a typed reason the fit is impossible, which the UI displays.
- **Save** serializes the current revision. **Save As** writes a new file and switches the document's location.
- **Autosave** writes a recovery copy to app data at intervals and after significant commands. On startup the app offers to restore unsaved work.
- **Clipboard (cut, copy, paste)** stores serialized clips together with their asset references, so pasting into another project can add the missing assets.

### 6.1 Project files and portability

Fingerprint references and the Android app media folder are recorded in [ADR-0005](adrs/0005-fingerprint-asset-references-and-android-media-folder.md).

- **Project file (`.mmproj`).** A single UTF-8 JSON file contains the project model. It references assets and does not contain them.
- **Asset reference.** Each reference stores:
  - the content fingerprint (section 9)
  - the original file name
  - probed metadata
  - the last known location for each platform (desktop path or Android app media folder path), so one file can open on several devices
- **Android app media folder.** On Android, imported and captured media is copied into a media folder in app storage, named by fingerprint. Several projects share one copy, and projects need no persistable URI grants, which Android caps at 512 per app. The app shows the storage used and deletes media that no project references.
- **Relink.** When a location no longer resolves, the app searches the project's folder, the Android app media folder, and folders the user chooses, and matches files by fingerprint. Clip edits are preserved, as the glossary requires.
- **Packaged project (`.mmpack`).** "Package project" writes a zip with the project JSON and copies of all assets. Opening it extracts the media to a user-chosen folder on desktop, or into the app media folder on Android, and rewrites the locations. This is the reliable way to move a project between devices.
- **Device-independent content.** Aspect ratio instead of resolution, normalized coordinates, bundled fonts, and stable preset IDs mean that the same project renders equivalently on every device, with pixel differences only within GPU tolerance. Only the available export presets differ.

## 7. Edit plan

The edit plan compiler (`core`) is a pure, memoized function: `compile(revision, mode) → EditPlan`. `mode` selects proxies for preview, or originals and intermediates (section 9) for export. The edit plan is plain serializable data, so it can cross to workers and to a native engine (section 13.3).

The edit plan contains:

- **Visual segments.** Non-overlapping timeline ranges. Each segment lists its active layers:
  - the clip layer: source, source-time mapping, rotation, stabilization reference, Pan & Zoom keyframes, effects, and fades
  - for transition segments, the outgoing layer and the transition preset with its progress range
  - for the first clip's transition, the project background as the outgoing layer
  - the captions active in the segment, as overlay layers with resolved timeline times
- **Audio segments.** Source ranges with time mapping, speed and pitch mode, and gain envelopes for each source: embedded video audio, music, and narration. Envelopes combine fades, volume, transition crossfades, and ducking.
- **Duration** of the movie.
- **Diagnostics.** Examples: a transition shortened to keep part of a clip free, a missing asset, an unknown preset. The UI shows them, and they never stop preview.

**Time mapping.** For a video clip, `sourceTime = in + round((t − clipStart) × speed)`.

**Outgoing visual during a transition.** The compiler builds the outgoing layer from the preceding clip, following specification §5.1:

- **Photo, text, or video clip:** the layer keeps its normal timing, because the incoming clip starts `transition(i)` before the outgoing clip ends. Video keeps playing its trimmed range, and Pan & Zoom, effects, and text presets keep running, so nothing freezes. Embedded video audio crossfades into the incoming clip's audio over the transition.
- **First clip:** the project background.

The minimum clip duration (section 5.2) guarantees that two transitions never run at the same time.

## 8. Rendering engine

### 8.1 Contract

```ts
renderFrame(plan: EditPlan, t: Micros, target: RenderTarget): Promise<void>
```

The function is deterministic. The same plan, time, output size, and GPU produce the same pixels, and different GPUs differ only within the golden-frame tolerance (section 14.2). Both preview and export call it. Preview uses proxies, so its frames match export in content and timing, not pixel for pixel.

### 8.2 Threading

The engine runs in a dedicated Web Worker with an `OffscreenCanvas`. Decoding, texture uploads, and shader passes stay off the UI thread. The UI thread sends plan updates and the latency-corrected clock position (section 10.3), and the worker returns frame-ready and diagnostic messages.

### 8.3 Per-frame pipeline

```mermaid
flowchart LR
    S[Source<br/>video frame, image, or text raster] --> O[Orientation and rotation]
    O --> SB[Stabilization transform]
    SB --> PZ[Pan & Zoom]
    PZ --> F[Fit to canvas]
    F --> FX[Visual effects]
    FX --> FD[Clip fade]
    FD --> T{Transition?}
    T -- no --> C[Caption overlay]
    T -- yes --> TR[Transition composite<br/>with outgoing layer] --> C
    C --> OUT[Output]
```

- Each step is a render pass into a pooled framebuffer (ping-pong textures).
- The fit step uses the clip's resolved media fit. `fit` scales the whole picture inside the canvas over black. `fill` scales it to cover the canvas and crops around the center.
- Pan & Zoom rectangles keep the source picture's proportions with `fit`, so the picture area and its black bars stay the same during the motion. With `fill`, they keep the canvas proportions.
- Captions are an overlay above the sequence. Visual effects, clip fades, and transitions do not apply to them, so a caption spanning several clips stays stable. Their own entry and exit presets animate them.
- Video frames are uploaded from `VideoFrame` to a texture and closed immediately.

### 8.4 Preset system

Rendering presets as versioned data with no JavaScript is recorded in [ADR-0007](adrs/0007-webgl2-renderer-with-data-only-presets.md).

Every transition, visual effect, Pan & Zoom preset, clip fade, and text entry or exit preset is a catalog entry. Preset definitions are data, not code:

```ts
interface PresetDefinition {
  id: string;                    // versioned, for example 'transition.wipe.bow-tie-horizontal@1'
  family: string; displayName: string;
  params: ParamSchema;           // drives UI controls and validation
  kind: 'shader' | 'mesh' | 'particles' | 'transform';
  program: PresetProgram;        // GLSL ES 3.00 sources, mesh grid, particle emitter, or transform curves
}
```

- The engine runs every preset through a small set of generic passes, one per kind. Presets contain no JavaScript.
- Shaders are GLSL ES 3.00, which both WebGL2 and OpenGL ES 3 accept, so a native renderer can load the same catalog (section 13.3).

| Kind | Used for | Examples from the specification |
|---|---|---|
| `shader` | Full-screen fragment shader using `progress`, `clipProgress`, `time`, `resolution`, and parameters | Wipes, bars, checkerboard, dissolves, blur, pixelate, iris and shapes, black and white, sepia, posterize, threshold, edge detection, hue spectrum cycle, mirror |
| `mesh` | Tessellated grid with vertex animation | Page curls, flip, roll, fans, shatter, whirlwind, wrap |
| `particles` | Instanced sprites | Cinematic Burst (lens flares), stars |
| `transform` | Affine transform and opacity per layer or per glyph | Pan & Zoom, 360° spin, slide, spin in, fly in, scroll, zoom in |

The MIT-licensed gl-transitions collection is written in GLSL and can supply many `shader` transitions. Every preset has golden-frame tests (section 14).

### 8.5 Text

- Text is laid out by a shared layout module (wrapping, alignment, line height) and rasterized with Canvas2D in the worker into cached textures. The cache key is content, style, and output scale.
- Layout produces glyph runs, so `transform` presets can animate per glyph (Scroll, Swing Down) or the whole box (Fade, Zoom).
- **Fonts are bundled.** The `fonts` package ships the font set in section 8.5.1 and loads it with the `FontFace` API. `engine` imports it to load the set into its worker and resolve `fontId`, and `ui-kit` imports it for font pickers. Projects reference `fontId`, never system fonts. Text then renders the same on Android and desktop.

#### 8.5.1 Bundled font set

The app bundles 20 widely used font families. Common proprietary fonts such as Arial, Times New Roman, Courier New, Calibri, and Cambria cannot be redistributed, so the set includes metric-compatible substitutes for them.

| Category | Families |
|---|---|
| Substitutes for common system fonts | Liberation Sans (Arial), Liberation Serif (Times New Roman), Liberation Mono (Courier New), Carlito (Calibri), Caladea (Cambria) |
| Sans serif | Roboto, Open Sans, Lato, Montserrat, Noto Sans, Poppins, Inter |
| Serif | Noto Serif, Merriweather, Playfair Display |
| Display | Oswald, Bebas Neue |
| Casual and handwriting | Comic Neue, Dancing Script, Pacifico |

- **Licences.** All families use the SIL Open Font License or Apache 2.0. Each family's licence file is checked and shipped with it.
- **Styles.** Each family includes regular, bold, italic, and bold italic where the family provides them. Variable fonts are used where available. The text renderer synthesizes missing styles.
- **Size.** Fonts are subset to Latin, Latin Extended, Greek, and Cyrillic to keep the app small. Noto Sans and Noto Serif provide the broadest coverage.

### 8.6 Colour

The pipeline is 8-bit sRGB. HDR and 10-bit sources are converted to SDR during decode or upload. Conversion quality depends on the platform (section 15).

## 9. Media layer

| Function | Design |
|---|---|
| **Probe** | Mediabunny reads container metadata: duration, tracks, codecs, dimensions, rotation, frame rate, and audio presence. The result is cached on the asset. |
| **Fingerprint** | File size plus SHA-256 of the first, middle, and last 1 MiB. Used for relinking and as the cache key. |
| **Video decode** | A pool of WebCodecs `VideoDecoder`s with a per-device instance limit, because Android limits hardware decoders. A seek starts at the nearest earlier keyframe. A small frame cache sits around the playhead. |
| **Intermediates (desktop)** | When WebCodecs cannot decode a source, for example HEVC on Windows without the HEVC extension or on Linux, the FFmpeg sidecar transcodes it once into a high-quality H.264 intermediate at source resolution, cached by fingerprint. Proxies and export use the intermediate. On Android, the app reports that the format is not supported on the device. |
| **Image decode** | `createImageBitmap` downscaled to the largest size needed (export resolution × maximum Pan & Zoom factor) and clamped to the GPU's `MAX_TEXTURE_SIZE`. EXIF orientation is applied. HEIC goes through a platform adapter. |
| **Proxies** | Generated on demand in a background job when the capability profile says the original cannot be decoded and scrubbed smoothly, for example long-GOP 4K or HEVC on a mid-range phone. Clips nearest the playhead go first. Proxies are short-GOP H.264 at about 540p–720p, stored in the cache by fingerprint. Other sources preview from the original. Export never uses proxies. |
| **Thumbnails and waveforms** | Filmstrip thumbnails and waveform peaks, generated in the background and cached by fingerprint. |
| **Capabilities** | `isConfigSupported()` checks and WebGL limits at startup produce a capability profile. It drives export preset filtering, decoder limits, proxy decisions, and texture sizes. |
| **I/O** | Media is read with range requests through a platform-provided URL or a reader (section 13), never loaded whole into memory. |

## 10. Audio

One mixer for preview and export, fed by prepared PCM, is recorded in [ADR-0008](adrs/0008-shared-audio-mixer-with-prepared-pcm.md).

### 10.1 Sources and mix

Three sources are mixed into a stereo bus at 48 kHz:

1. **Embedded video audio**, when `audioEnabled` is true. It follows the clip's speed, pitch mode, volume, and audio fade-in and fade-out (None, Slow, Medium, Fast). During a transition, the outgoing clip's embedded audio crossfades into the incoming clip's embedded audio over the transition duration.
2. **Music tracks**, each holding one or more songs with their start time, in and out points, fade in and out, and volume. Songs on different tracks can overlap and are mixed. Each track has its own volume.
3. **Narration track**, with the same controls as music. Narration clips are anchored to visual clips (section 5.2).

The edit plan compiler computes the gain envelopes: fades, volume, transition crossfades, and ducking of music under narration.

### 10.2 Audio preparation, speed, and pitch

Every audio source is decoded and converted to 48 kHz stereo ahead of time in a worker, and cached by asset fingerprint, range, speed, and pitch mode. For a speed change, the user chooses the pitch mode of each video clip:

- **`shift`**: resample, so pitch changes with speed.
- **`preserve`**: time-stretch with Signalsmith Stretch.

Cached PCM lives on disk and is read by range. Preview and export read the same prepared audio, so they sound the same, and preview never time-stretches in real time.

### 10.3 Preview clock

The `AudioContext` clock is the master clock. The playback controller corrects it with `getOutputTimestamp()` and `outputLatency`, so the picture matches what the user hears. On Android, output latency is often 100–200 ms. Video follows the corrected clock and drops late frames rather than drifting. When there is no audio, the clock still runs from the `AudioContext`.

### 10.4 Shared mixer

One mixer in `audio` reads prepared PCM, applies the gain envelopes, and sums the sources. All sources are already 48 kHz stereo, so the mixer does not resample.

- **Preview:** the mixer runs in an `AudioWorklet`. A worker reads prepared PCM ahead of the playhead and feeds the worklet through a ring buffer: a `SharedArrayBuffer` when the page is cross-origin isolated, otherwise chunks transferred over a `MessagePort`.
- **Export:** the same mixer runs in a worker in chunks of about 10 seconds, so long projects do not need one huge buffer. Ten minutes of stereo float audio is about 230 MB. Each chunk goes to `AudioEncoder`.

`OfflineAudioContext` is not used. It is not available in workers, and it would duplicate the mixing logic.

## 11. Export

```mermaid
sequenceDiagram
    participant UI
    participant EC as Export controller
    participant ENG as Engine worker
    participant VE as VideoEncoder
    participant AE as AudioEncoder
    participant MX as Muxer (Mediabunny)
    participant SK as Export sink (platform)
    UI->>EC: start(preset)
    EC->>EC: compile plan (originals)
    loop each frame n
        EC->>ENG: renderFrame(t_n)
        ENG->>VE: VideoFrame
        VE->>MX: encoded chunk
    end
    loop each audio chunk
        EC->>AE: AudioData
        AE->>MX: encoded chunk
    end
    MX->>SK: streamed bytes
    SK-->>UI: done (file location)
```

- **Export presets** define resolution, frame rate, container, video codec and bitrate, and audio codec. The UI offers only presets the capability profile supports, so mobile devices may see fewer options.
- **Default output** is MP4 with H.264 and AAC. When WebCodecs lacks an encoder, the platform fills the gap: the FFmpeg sidecar on desktop, or MediaCodec AAC encoding on Android. The last resort is WebM with VP9 and Opus, and the UI explains why. Opus in MP4 is not offered, because many players do not support it.
- **Backpressure.** The controller pauses rendering while `encodeQueueSize` is above a threshold, which keeps memory flat.
- **Streaming output.** The muxer writes progressively to a platform **export sink** and never holds the whole file in memory.
- **Before encoding,** pending jobs that the plan needs, such as stabilization analysis, intermediates, and audio preparation, run first and report progress.
- **Cancel** stops cleanly and deletes the partial file. Progress and ETA come from the frame index.
- **Keep awake.** Export holds a keep-awake lock. On Android, export runs in the foreground with a progress screen (section 13.3).
- **Desktop FFmpeg sidecar** ([ADR-0009](adrs/0009-desktop-ffmpeg-sidecar.md)). The Electron app bundles an LGPL FFmpeg build that runs as a separate process. It creates intermediates for sources WebCodecs cannot decode (section 9) and encodes streams WebCodecs cannot encode, such as AAC on Linux. H.264 encoding through the sidecar uses OpenH264 or platform hardware encoders, because libx264 is GPL. Frames still come from `renderFrame`, so preview and export still match.

## 12. Background jobs and caches

A job scheduler in `media` runs work in workers with priorities, cancellation, and progress:

| Job | Trigger | Cache key |
|---|---|---|
| Probe and fingerprint | Import, relink | File identity |
| Proxy generation | Capability profile requires a proxy for a video, nearest to the playhead first | Fingerprint, proxy profile |
| Intermediate transcode (desktop) | Video that WebCodecs cannot decode | Fingerprint, intermediate profile |
| Thumbnails and waveform | Import | Fingerprint |
| Audio preparation (decode, resample, time-stretch) | Import, speed or pitch change | Fingerprint, range, speed, mode |
| Stabilization analysis | Stabilization enabled | Fingerprint, range, algorithm version |
| HEIC conversion | Import of HEIC | Fingerprint |

Caches live in the platform cache directory. A size limit with least-recently-used eviction keeps them bounded. A missing cache entry is always recomputable.

### 12.1 Stabilization

Stabilization is a planned feature. The architecture reserves these hooks:

1. **Analysis job:** estimate inter-frame motion (feature tracking), smooth the camera path, and store a per-frame transform track (translation, rotation, scale) for the clip's source range.
2. **Edit plan:** reference the transform track and the `strength` setting.
3. **Renderer:** apply the transform and a compensating crop in the stabilization pass (section 8.3).

The rest of the system does not change when the analysis algorithm is implemented or replaced.

## 13. Platform layer

### 13.1 Adapter interfaces

| Interface | Responsibility | Electron | Android |
|---|---|---|---|
| `ProjectFiles` | Open, save, save as, recent projects | Native dialogs, `fs` | Project list in app storage. SAF for importing and exporting `.mmpack` files. |
| `AssetPicker` | Choose photos, videos, audio | Native dialog | Photo Picker (images and video) and SAF (audio). The selection is copied into the app media folder (section 6.1). |
| `MediaAccess` | Range-readable URL or reader for an asset | Custom `media://` protocol | Plugin-served URL with range support for files in app storage |
| `ImageConverter` | HEIC and other unsupported image formats | libheif (WASM) in a worker | Android `ImageDecoder` |
| `MediaTranscoder` | Intermediates for undecodable sources, and encoders missing from WebCodecs | FFmpeg sidecar process | MediaCodec AAC encoder |
| `Capture` | Photo and video capture, narration recording | `getUserMedia` and `MediaRecorder` | System camera intent. `getUserMedia` or native recorder for narration. Results go into the app media folder. |
| `ExportSink` | Streamed write of the export file | Write stream in main via IPC | Plugin writes to MediaStore (`Movies/`) |
| `KeepAwake` | Prevent sleep during export | `powerSaveBlocker` | Keep-screen-on flag |
| `AppPaths` | Data, cache, recovery locations | `app.getPath` | App-specific storage |
| `Permissions` | Camera and microphone access | OS prompts | Runtime permissions and WebView permission grants |

The interfaces import no other package (section 4). They deal in bytes, byte ranges, paths, URLs, and small types of their own, never project model types; `app-state` and `media` translate between those and `core` types, so a change to the project model never reaches an adapter implementation.

The playground implements these interfaces with browser APIs (File System Access, OPFS), which is enough for engine work and tests. It has no `MediaTranscoder`. It can also be published as a Chromium-only web version that works offline as an installable web app.

### 13.2 Desktop (Electron)

- **Processes**
  - Main process: file system, dialogs, menus, `media://` protocol, export sink, FFmpeg sidecar management.
  - Preload: a typed `contextBridge` API.
  - Renderer: the React UI.
  - Engine, mixer, and job workers.
  - FFmpeg sidecar: a child process started on demand.
- **Security**
  - `contextIsolation` and `sandbox` are on and `nodeIntegration` is off. A strict Content Security Policy applies, and no remote content is loaded.
  - Every IPC call validates its arguments.
  - The `media://` handler serves only files the user picked or that open projects reference (an allowlist of resolved paths), which blocks arbitrary file reads and path traversal.
  - The FFmpeg sidecar is spawned without a shell, from fixed argument templates, and receives only allowlisted paths.
- **Packaging:** electron-builder for Windows, macOS, and Linux installers.

### 13.3 Android (Capacitor)

- **WebView requirement.** The app needs an Android WebView with WebCodecs, OffscreenCanvas WebGL2, and the required codecs (section 13.5). It checks at startup and asks the user to update the WebView if needed.
- **Media storage.** Imported and captured media is copied into the app media folder (section 6.1), so projects need no persistable URI grants.
- **Kotlin plugins:** asset picking and import into the app media folder, media serving with range requests, HEIC conversion, camera and recorder, AAC encoding fallback, export sink, keep-awake.
- **Binary data.** The Capacitor bridge serializes messages and is unsuitable for large binary payloads. Media input therefore goes through range-capable URLs. Export output needs an efficient binary channel, for example WebView message ports with ArrayBuffer support or chunked writes. This needs an early prototype (section 15).
- **Resource limits.** Hardware decoder counts and WebView memory are device-dependent. The capability profile sets the decoder pool size and the proxy resolution.
- **Background behaviour.** Export runs in the foreground. If the app is backgrounded, export pauses and resumes when the app returns, without corrupting output. If the OS ends the app during export, the next start deletes the partial file and offers to restart the export. A future native background export would need a foreground service and the native engine below.
- **Native engine fallback.** If the Android prototypes in section 15 fail their pass criteria, Android moves decode, render, and encode into a Kotlin engine built on Media3 (Transformer and Composition with custom OpenGL ES effects). It loads the same preset catalog (GLSL ES 3.00, section 8.4) and the same serialized edit plan (section 7). The UI, `app-state`, and `core` stay unchanged. Text rasterization and the mixer would need native ports, checked against the same golden frames and audio tests.

### 13.4 iOS (future)

iOS would add a Capacitor shell and another set of adapter implementations. WKWebView WebCodecs coverage must be checked at that time. Nothing in the shared packages assumes Android.

### 13.5 Minimum platform versions

Each desktop minimum is the lowest version that supports the full feature set. The Android minimum is deliberately higher.

| Platform | Minimum | Determined by |
|---|---|---|
| Windows | Windows 10, x64 and arm64 | Electron platform support |
| macOS | macOS 13 Ventura, Intel and Apple silicon | Electron platform support |
| Linux | x64 and arm64 releases of major distributions (Ubuntu, Fedora, Debian) still supported by Chromium and the distribution | Electron platform support |
| Android | Android 10 (API 29) | Chosen minimum. Older devices rarely handle the decode and render load, and API 29 provides HEIC decoding and scoped storage without special cases. Capacitor 8 supports it. |
| Android WebView | Chromium 94 or later, which introduced WebCodecs, and it must pass the capability check | WebCodecs availability |

- **Desktop** has no separate browser requirement, because Electron bundles its own Chromium. Raising the Electron version can raise the OS minimums, so check them at each Electron upgrade.
- **Android capabilities depend on the WebView, not the OS.** Android System WebView updates through Google Play. The startup check tests capabilities (WebCodecs decode and encode, OffscreenCanvas WebGL2, H.264 encoding) rather than a version number.

## 14. UI architecture and testing

### 14.1 UI

- `app-state` provides the store, selectors, commands, a **playback controller** (play, pause, seek, scrub with latest-request-wins), and an **export controller**. Both apps use them through React hooks.
- `ui-kit` holds the React components both apps share: thumbnails, filmstrips, waveform views, preset grids, and property controls. Each app owns its layout and interaction.
- **Desktop UI:** storyboard and timeline views, menus, keyboard shortcuts, drag and drop, multi-select, and property panels.
- **Mobile UI:** storyboard strip, bottom sheets for presets and properties, touch gestures for trim and reorder, and full-screen preview.
- **Preset pickers** use catalog metadata and pre-rendered preset thumbnails from the engine.

### 14.2 Testing

| Level | Scope | Tooling |
|---|---|---|
| Unit | Commands, Fit to Music, timing, soft anchors, edit plan compiler, migrations, envelopes | Vitest |
| Golden frame | `renderFrame` at fixed times for every preset and pipeline step, compared with reference PNGs within a tolerance | Playwright and headless Chromium in the playground |
| Audio | Sample-level checks of the shared mixer: envelopes, speed mapping, ducking, and mix levels | Vitest |
| Export smoke | Export short fixture projects, then probe the output for duration, frame count, and audio sync | Playwright, Electron |
| Device | Real Android devices across vendors and WebView versions, including preview A/V sync. Emulators lack hardware codecs. | Manual and scripted |

## 15. Risks and early prototypes

Prototypes must validate these risks before features depend on them. The pass criteria are provisional and are confirmed before the prototypes run.

| Risk | Impact | Prototype | Pass criterion |
|---|---|---|---|
| Binary transfer between WebView and native on Android | Export speed and memory | Stream a 1 GB export to MediaStore | At least 20 MB/s with flat memory |
| Hardware decoder limits and seek latency on long-GOP phone video | Transitions between two videos, scrubbing | Two simultaneous 4K HEVC decodes, scrub test | Two proxy decodes in real time at 30 fps, seek under 300 ms, and original 4K decode for export at 10 fps or more on a mid-range phone |
| Preview A/V sync on Android | Lip sync and music timing | Play a sync test pattern with built-in speakers and wired headphones | Offset within ±45 ms after latency correction |
| AAC and H.264 encoder availability (Linux, some Android devices) | Default export format | Capability matrix across target platforms | MP4 with H.264 and AAC exports on every target, through WebCodecs or the documented fallback |
| HEVC decoding on desktop | Phone footage on Windows and Linux | Import HEVC clips on Windows without the HEVC extension and on Linux | Clips preview and export through FFmpeg intermediates |
| Text rasterization differences between platforms | Visual parity of projects across devices | Golden frames on Windows, macOS, Linux, Android | Within golden-frame tolerance |
| HDR and 10-bit phone footage | Colour accuracy in preview and export | Import HDR clips from recent phones | No visible clipping or colour shift in reviewed samples |
| Time-stretch quality and speed | Pitch preservation at 0.5×–4× | Benchmark on a mid-range phone | At least 4× faster than real time, no audible artefacts at 0.5× and 2× |
| Mesh and particle presets (page curl, shatter, lens flares) | Effort and mobile GPU performance | One preset of each kind on a low-end device | 30 fps at preview resolution |
| Stabilization analysis cost | Feasibility on mobile | OpenCV.js tracking on a 1-minute 1080p clip | Under 2 minutes on a mid-range phone |

**Android decision gate.** If the binary transfer or decoder prototype fails on Android, Android adopts the native engine fallback (section 13.3) before Android feature work starts. The gate passed on 2026-11-26 (section 15.1), so the shared engine runs in the Android WebView and the fallback is not adopted.

### 15.1 Prototype results

Results land here as prototypes finish. Methods, devices, and full numbers are in [phase 7](design/phase-7-platform-prototypes.md). One high-end phone (Samsung SM-G990B, Android 16) and one Windows machine have been measured so far. The gate was closed with that phone; a mid-range phone is untested.

| Risk | Result |
|---|---|
| Binary transfer between WebView and native on Android | Capacitor plugin calls reach 11 MB/s. A loopback HTTP server reaches 96 to 136 MB/s but renderer memory grows to about 1 GB. `addWebMessageListener` ArrayBuffer messages of 1 MiB reach 227 MB/s with flat memory. The last is the candidate for the Android `ExportSink`. |
| Hardware decoder limits and seek latency | A 4K HEVC decode runs at 109 fps and two at 80 fps each. Five 4K hardware decoders work at once. Proxy seek takes 39 ms at the 95th percentile, and 4K original seek 496 ms with a 2 s key frame interval. A mid-range phone is untested. |
| Preview A/V sync on Android | The WebView reports 8 to 24 ms output latency. A speaker-to-microphone loopback measured a stable 211 ms round trip, which cannot be split into output and input latency, so the offset against the picture is not measured. |
| AAC and H.264 encoder availability | WebCodecs encodes both and the MP4 mux works on Windows (Electron) and on the Android phone. macOS and Linux are untested. |

## 16. Walking skeleton

The first build proves the end-to-end path on desktop before the feature set widens. It does not set release priorities (specification §9).

1. Playground and desktop app only.
2. Photo and video clips: add, reorder, trim, change duration.
3. Crossfade with the uniform transition overlap, and one Pan & Zoom preset.
4. One music track through the shared mixer, with the preview clock.
5. Save, open, autosave, and undo.
6. Export to MP4 with H.264 and AAC through WebCodecs, with backpressure and streaming output.

Android work starts after the Android prototypes in section 15 pass or the decision gate selects the native engine. More presets, captions, narration, capture, time-stretch, and stabilization follow.

## 17. Open questions

Product behavior questions are tracked in specification §9. These architecture questions are open, with recommendations in the [Phase 0 design document](design/phase-0-workspace-scaffold.md#5-open-questions):

- **Q0.13.** Should a package's source under `src/` be allowed to import files outside `src/` by relative path? Entry isolation (section 4) does not follow a chain of imports and checks only files under the protected folder, so a protected file can reach the other entry point through a file outside `src/`, which reaches it by name (its own package's entry point) or by relative path. The same path lets package source import an unlinted JavaScript file. The recommendation is that package files under `src/`, tests included, import by relative path only inside their own `src/`.
