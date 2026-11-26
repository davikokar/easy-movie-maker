# ADR-0009: FFmpeg sidecar on desktop for unsupported codecs

- Status: Active
- Date: 2026-11-24
- Decision makers: Project maintainer

## Context

WebCodecs coverage differs by platform. Phone footage is often HEVC, which Windows without the HEVC
extension and Linux cannot decode through WebCodecs. Some platforms lack an AAC or H.264 encoder.
The default export is MP4 with H.264 and AAC.

## Decision

- The Electron app bundles an **LGPL FFmpeg build that runs as a separate process**, started on
  demand, spawned without a shell from fixed argument templates, and given only allowlisted paths.
- It creates **intermediates**: a high-quality H.264 copy at source resolution, made once and cached
  by fingerprint, for sources WebCodecs cannot decode. Proxies and export use the intermediate.
- It **encodes streams** WebCodecs cannot encode, such as AAC on Linux. H.264 through the sidecar
  uses OpenH264 or platform hardware encoders, not libx264.
- Frames still come from `renderFrame`, so preview and export still match.
- On **Android**, there is no sidecar: an undecodable source is reported as unsupported on the
  device, and AAC encoding falls back to MediaCodec.

## Alternatives Considered

- **FFmpeg as the core media engine.** Rejected with the native core (ADR-0001).
- **No fallback.** Common phone footage would fail on Windows and Linux.

## Consequences

### Positive

- Phone footage previews and exports on every desktop OS.
- MP4 with H.264 and AAC is available on every desktop target.

### Negative

- The desktop installer is larger, and the sidecar must be packaged per OS.
- Intermediates use disk space and take time on first import.
- Android cannot handle formats its WebView cannot decode.

## References

- Architecture §9, §11, §13.1, §13.2
- ADR-0001, ADR-0006
