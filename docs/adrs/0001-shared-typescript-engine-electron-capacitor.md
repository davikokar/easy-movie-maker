# ADR-0001: Shared TypeScript engine hosted by Electron and Capacitor

- Status: Active
- Date: 2026-11-24
- Decision makers: Project maintainer

## Context

MovieMaker targets Windows, macOS, Linux, and Android, with iOS possible later. It works offline,
preview must match export, and projects must move between devices. The desktop and mobile UIs are
deliberately separate, but the project model, state store, engine, and media layers should be
written once. It is a personal learning project that may become open source, so licensing and
toolchain complexity matter.

The engine depends on WebCodecs, WebGL2, and `OffscreenCanvas` behaving the same on every
platform.

## Decision

Write the engine, project model, state, audio, and media layers once in strict TypeScript, and
host them in:

- **Electron** on desktop, which ships its own Chromium, so WebCodecs, WebGL2, and
  `OffscreenCanvas` behave consistently on every desktop OS;
- **Capacitor** on Android, which uses the system Android WebView (Chromium), with native features
  as Kotlin plugins. Capacitor keeps iOS open.

The desktop and mobile UIs are separate React apps over the shared packages.

## Alternatives Considered

- **Tauri.** Uses the system webview. WebKitGTK on Linux has no WebCodecs and macOS WebKit support
  is partial, so the shared renderer could not run everywhere.
- **A native core in Rust or C++ with FFmpeg.** Would perform better, but requires
  cross-compiling, N-API and JNI bindings, and FFmpeg licensing work. An FFmpeg sidecar is used on
  desktop only for what WebCodecs cannot handle (ADR-0009).
- **Flutter.** Would share the UI, which is not a goal, and still needs native media code on each
  platform.
- **A native Android engine** (Media3 Transformer and Composition with OpenGL ES effects). Avoids
  WebView limits but needs its own renderer. Kept as the fallback if the Android prototypes fail
  (architecture §13.3, §15).
- **A web app (PWA) only.** Avoids installers, but file access and codec support vary by browser.
  The playground may still be published as a Chromium-only web version.

## Consequences

### Positive

- One engine, one renderer, one mixer: preview and export behave the same on every platform.
- The desktop minimum OS versions follow Electron's platform support, with no separate browser
  requirement.
- iOS remains possible through another Capacitor shell.

### Negative

- Android capabilities depend on the installed WebView, not the OS version; the app must check them
  at startup.
- The Capacitor bridge is unsuitable for large binary payloads, so export output needs a dedicated
  channel that must be prototyped (architecture §15).
- Hardware decoder counts and WebView memory are device-dependent on Android.
- If the Android prototypes fail, Android needs a native engine, superseding part of this decision.

## References

- Architecture §1, §2, §13, §15
- ADR-0009
