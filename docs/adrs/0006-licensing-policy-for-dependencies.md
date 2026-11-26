# ADR-0006: Licensing policy for dependencies

- Status: Active
- Date: 2026-11-24
- Decision makers: Project maintainer

## Context

MovieMaker is a personal learning project that may become open source. Its media stack draws on
codecs, containers, and image libraries whose licences range from permissive to strong copyleft.
A GPL component linked into the app would force the whole app's licence.

## Decision

- **Prefer permissively licensed dependencies** (MIT, BSD, Apache 2.0, and similar).
- **MPL-2.0** is acceptable: its copyleft is file-level (for example Mediabunny).
- **No GPL components**, linked or bundled.
- **LGPL components run as separate processes or ship as replaceable modules** (for example the
  FFmpeg sidecar on desktop, and libheif with libde265 as a replaceable WASM module).
- **Fonts** use the SIL Open Font License or Apache 2.0, and each family ships with its licence
  file.
- Every new or upgraded dependency is checked against this policy before it is proposed, and the
  user approves it (`AGENTS.md` *What to ask before doing*).

## Alternatives Considered

- **Allow GPL.** Would open libx264 and other GPL tools, but would force the app's licence.
- **Permissive only, no LGPL at all.** Would exclude FFmpeg and libheif, leaving HEVC on some
  desktops and HEIC without a path.

## Consequences

### Positive

- The project can choose its own licence when it is published.
- Each dependency's obligations are known when it is added.

### Negative

- H.264 encoding through the FFmpeg sidecar must use OpenH264 or platform encoders rather than
  libx264.
- LGPL modules need process or module boundaries, which add packaging work.

## References

- Architecture §1, §2, §8.5.1, §11
- ADR-0009
