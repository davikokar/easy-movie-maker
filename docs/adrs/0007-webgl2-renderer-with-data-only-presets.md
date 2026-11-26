# ADR-0007: WebGL2 renderer with data-only presets

- Status: Active
- Date: 2026-11-24
- Decision makers: Project maintainer

## Context

The specification lists well over a hundred transitions, effects, Pan & Zoom presets, clip fades,
and text presets. Projects must render the same across app versions and devices, and a native
Android renderer may one day have to load the same presets (ADR-0001).

## Decision

- Render with **WebGL2 behind a backend interface**, in a worker with an `OffscreenCanvas`. A WebGPU
  backend can be added later without changing the engine API.
- Every transition, effect, Pan & Zoom preset, clip fade, and text preset is a **catalog entry made
  of data**: an ID, display metadata, a parameter schema, and a program of one of four kinds —
  `shader`, `mesh`, `particles`, or `transform`. **Presets contain no JavaScript.**
- Shaders are **GLSL ES 3.00**, which both WebGL2 and OpenGL ES 3 accept.
- Preset IDs are **stable and versioned** (for example `transition.wipe.bow-tie-horizontal@1`). A
  preset whose look changes gets a new version, and the app keeps the old versions. An unknown ID
  is kept in the project file and renders a neutral fallback with a diagnostic.
- The catalog lives in one place, in `engine`, and supplies both UI metadata and renderer programs.

## Alternatives Considered

- **Presets as JavaScript modules.** More flexible, but a native renderer could not load them, and
  arbitrary code per preset is harder to test.
- **WebGPU first.** Deferred rather than rejected: the backend interface lets a WebGPU backend be
  added later without changing the engine API.
- **Unversioned preset IDs.** Changing a preset would silently change existing projects.

## Consequences

### Positive

- Existing projects render unchanged across app versions.
- A native OpenGL ES renderer can reuse the catalog.
- Each preset is testable with golden frames.

### Negative

- Presets are limited to what the four generic pass kinds can express; a new kind is an
  architecture change.
- Old preset versions accumulate in the catalog.

## References

- Architecture §2, §8
- Functional specification §4, §5, §6
