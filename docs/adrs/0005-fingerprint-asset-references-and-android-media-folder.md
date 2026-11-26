# ADR-0005: Fingerprint asset references and the Android app media folder

- Status: Active
- Date: 2026-11-24
- Decision makers: Project maintainer

## Context

Projects must move between devices and survive media being renamed or moved. Paths differ between
platforms. On Android, keeping access to user-picked files needs persistable URI grants, which
Android caps at 512 per app.

## Decision

- A project file (`.mmproj`) references assets and does not contain them. Each reference stores a
  **content fingerprint** (file size plus SHA-256 of the first, middle, and last 1 MiB), the
  original file name, probed metadata, and the last known location **per platform**.
- **Relink** matches files by fingerprint in the project's folder, the Android app media folder, and
  folders the user chooses, preserving clip edits.
- On **Android**, imported and captured media is copied into an **app media folder** named by
  fingerprint. Several projects share one copy; the app shows the storage used and deletes media no
  project references.
- A **packaged project** (`.mmpack`) zips the project with copies of its assets, for reliable moves
  between devices.
- Caches (proxies, intermediates, waveforms, prepared audio) are keyed by fingerprint.

## Alternatives Considered

- **Path-only references.** Break when files move and cannot work across devices.
- **Persistable URI grants on Android.** Capped at 512 per app and fragile when the user moves
  files.
- **Embedding media in the project file.** Makes every save huge; kept only as the explicit
  package format.

## Consequences

### Positive

- Renamed or moved files are found by content; one project file opens on several devices.
- Android projects need no URI grants.
- Caches are shared across projects that use the same media.

### Negative

- Android duplicates imported media in app storage, so the app must show and manage that space.
- Fingerprints sample the file, so two files differing only outside the sampled ranges and with the
  same size would collide. This is accepted as unlikely for camera media.

## References

- Architecture §6.1, §9, §12, §13.1, §13.3
- Functional specification §2
- Glossary: *Relink*
