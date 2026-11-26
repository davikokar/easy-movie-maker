# Phase 10 — Release Hardening

**Status:** Not started · Leads to the first release · [Roadmap](roadmap.md)

## 1. Goal and scope

Prepare the first release: decide its scope, verify it on every target platform, and package it.

**In scope:** release scope (specification §9), cross-platform verification, installers and app
bundles, licence notices, and documentation of the released state.

**Out of scope:** new features. A gap found here goes back to the Phase 8 track or Phase 9 stage
that owns it.

## 2. Progress

| Stage | Title | Status |
|---|---|---|
| 10.1 | Release scope | Not started |
| 10.2 | Cross-platform verification | Not started |
| 10.3 | Packaging and distribution | Not started |
| 10.4 | Licences and notices | Not started |
| 10.5 | Release documentation | Not started |

## 3. Stages

### 10.1 Release scope

- **Outcome:** the user decides which features and presets ship, and the specification §9 release
  scope item is resolved.
- **Owner:** Planner drafts; the user decides.
- **Exit criteria:** the specification records the scope, and every included Phase 8 track and
  Phase 9 stage is Complete.

### 10.2 Cross-platform verification

- **Outcome:** golden-frame, audio, and export smoke tests run on Windows, macOS, and Linux; device
  tests run on the Android matrix; a project moves between desktop and Android as a `.mmpack` and
  renders equivalently (architecture §6.1, §14.2).
- **Owner:** verification phase.
- **Depends on:** 10.1.
- **Exit criteria:** every test level passes on every target, and each result names the platform or
  device run that produced it.

### 10.3 Packaging and distribution

- **Outcome:** electron-builder installers for Windows, macOS, and Linux, including the FFmpeg
  sidecar, and a release build of the Android app (architecture §13.2).
- **Owner:** Coder.
- **Depends on:** 10.2.
- **Exit criteria:** installers run on the minimum OS versions in architecture §13.5; the packaged
  app keeps the security baseline from Phase 6 stage 6.1.

### 10.4 Licences and notices

- **Outcome:** a third-party notices file covering every dependency, font, and the FFmpeg and
  libheif builds, and the licence files every bundled font family ships with (ADR-0006).
- **Owner:** Coder; Planner checks against ADR-0006.
- **Exit criteria:** no GPL component ships; every LGPL component is a separate process or
  replaceable module.

### 10.5 Release documentation

- **Outcome:** the architecture describes what shipped, AGENTS.md *Current phase* is updated, and
  the roadmap and finished phase documents are archived (architecture-docs instructions).
- **Owner:** Planner.
- **Depends on:** 10.3, 10.4.
- **Exit criteria:** the documentation checks in AGENTS.md *Definition of done* hold.

## 4. Decisions already taken

- Desktop installers use electron-builder (architecture §13.2).
- Licensing follows ADR-0006.

## 5. Open questions

| # | Question | Recommendation | Blocks |
|---|---|---|---|
| Q10.1 | Code signing for Windows and macOS, and an Android signing key? | Decide at 10.1. Unsigned builds are acceptable for a personal release; macOS notarization is needed for a smooth install. | 10.3 |
| Q10.2 | Distribution channels (GitHub Releases, stores)? | GitHub Releases first; stores later. | 10.3 |
| Q10.3 | Open-source licence for the project itself? | Decide before the repository is made public; it must be compatible with the dependency policy in ADR-0006. | 10.4 |

## 6. Stage log

| Date | Change |
|---|---|
| 2026-11-24 | Document created. |

## 7. Handoff

- **Read first:** the roadmap, ADR-0006, architecture §13.2, §13.5, §14.2.
- **Do next:** after the included Phase 8 tracks and Phase 9 are complete, start stage 10.1.
