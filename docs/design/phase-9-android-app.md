# Phase 9 — Android App

**Status:** Not started · Leads to the Android app · [Roadmap](roadmap.md)

## 1. Goal and scope

Create `apps/mobile`: the Capacitor project, the Kotlin plugins that implement the platform
adapters, and the mobile React UI from the [mobile wireframes](../mockups/mobile.html).

**In scope:** the Android path chosen by the decision gate (Phase 7 stage 7.12), which passed on
2026-11-26: the shared TypeScript engine runs in the WebView. This document's stages 9.2–9.4 stand as
written. If testing on a mid-range phone later shows the gate was too optimistic, they are replanned
around a Kotlin engine (architecture §13.3) through a new ADR.

**Out of scope:** iOS (architecture §13.4), and native background export.

## 2. Progress

| Stage | Title | Status |
|---|---|---|
| 9.1 | Capacitor shell and capability check | Not started |
| 9.2 | Media storage and serving | Not started |
| 9.3 | Export, capture, and remaining adapters | Not started |
| 9.4 | Mobile UI | Not started |
| 9.5 | Lifecycle and device testing | Not started |

## 3. Stages

### 9.1 Capacitor shell and capability check

- **Outcome:** a Capacitor app hosting the mobile React app. At startup it checks WebCodecs decode
  and encode, `OffscreenCanvas` WebGL2, and H.264 encoding, and asks the user to update the WebView
  when they fail (architecture §13.3, §13.5). Minimum Android 10 (API 29).
- **Owner:** Coder.
- **Depends on:** Phase 7 stage 7.12.
- **Exit criteria:** the check passes on the device matrix and fails clearly on a WebView without
  WebCodecs.

### 9.2 Media storage and serving

- **Outcome:** Kotlin plugins for asset picking (Photo Picker and the Storage Access Framework),
  import into the app media folder named by fingerprint, range-capable media serving, storage
  usage, and clean-up of unreferenced media
  ([ADR-0005](../adrs/0005-fingerprint-asset-references-and-android-media-folder.md)).
- **Owner:** Coder.
- **Depends on:** 9.1.
- **Exit criteria:** a project keeps working after its source files are deleted from the gallery;
  the same media imported by two projects is stored once.

### 9.3 Export, capture, and remaining adapters

- **Outcome:** the export sink to MediaStore over the binary channel proven by prototype 7.3
  (`addWebMessageListener` ArrayBuffer messages of about 1 MiB with an acknowledgement window, native
  writes on a background thread; not Capacitor plugin calls, which reached only 11 MB/s), MediaCodec
  AAC fallback, keep-awake, HEIC through `ImageDecoder`, camera and narration capture, project files
  in app storage, and `.mmpack` import and export through the Storage Access Framework
  (architecture §13.1).
- **Owner:** Coder.
- **Depends on:** 9.2.
- **Exit criteria:** every Android permission is approved (AGENTS.md); a 10-minute export completes
  with flat memory on the mid-range device.

### 9.4 Mobile UI

- **Outcome:** the **Projects screen**, **Editor screen**, **Trim screen**, **Audio screen**, and
  sheets, using `app-state` and `ui-kit` (UI vocabulary, Android section).
- **Owner:** Designer and Coder.
- **Depends on:** 9.1; the feature tracks of Phase 8 the release includes.
- **Exit criteria:** every Phase 8 capability in release scope is reachable on the phone; touch
  gestures are one undo step each.

### 9.5 Lifecycle and device testing

- **Outcome:** export pauses when the app is backgrounded and resumes without corrupting output; a
  partial file left by a killed export is deleted on next start with an offer to restart; device
  tests across vendors and WebView versions (architecture §13.3, §14.2).
- **Owner:** Coder; verification phase owns the device gate.
- **Depends on:** 9.3, 9.4.
- **Exit criteria:** A/V sync within the criterion confirmed in prototype 7.5 on every matrix device;
  every result names the device run that produced it.

## 4. Decisions already taken

- Capacitor with the system WebView, Kotlin plugins for native features (ADR-0001).
- Imported media is copied into the app media folder (ADR-0005).
- Export runs in the foreground (architecture §13.3).

## 5. Open questions

| # | Question | Recommendation | Blocks |
|---|---|---|---|
| Q9.1 | The outcome of the Android decision gate. | Resolved 2026-11-26: passed; the shared engine runs in the WebView (Phase 7 stage 7.12). | 9.1 |
| Q9.2 | Which Capacitor plugins come from the community, and which are written in-house? | In-house for media serving, import, and export sink, which are core to the app; community plugins only after a licence check. | 9.2 |

## 6. Stage log

| Date | Change |
|---|---|
| 2026-11-24 | Document created. |

## 7. Handoff

- **Read first:** architecture §13.1, §13.3, §13.5, ADR-0001, ADR-0005, the Phase 7 results, the
  mobile wireframes.
- **Do next:** Phase 9 can start once the walking skeleton is done and the feature tracks in release
  scope are chosen. Plan stage 9.1 first. Settle the Gradle and JDK toolchain (the probe app needed
  Gradle 9.4.1 on JDK 25), and decide how to handle the A/V latency gap found in prototype 7.5.
