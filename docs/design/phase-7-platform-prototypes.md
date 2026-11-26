# Phase 7 — Platform Prototypes

**Status:** Not started · Leads to the Android decision gate · [Roadmap](roadmap.md)

## 1. Goal and scope

Run the prototypes in architecture §15 so that no feature depends on an unproven platform
capability. Record each result, and settle the Android decision gate.

**In scope:** every risk in architecture §15. Prototypes are throwaway code (Q7.1). Their results,
not their code, are the deliverable.

**Out of scope:** product features. A prototype that grows into a feature is rebuilt in its package
under the phase that owns the feature.

The pass criteria below are copied from architecture §15. They are **provisional** and must be
confirmed with the user before the prototype runs. A criterion changed at confirmation is updated in
architecture §15 in the same change.

## 2. Progress

| Stage | Prototype | Platform | Gates | Status | Result |
|---|---|---|---|---|---|
| 7.1 | H.264 and AAC encoders, desktop | Electron on Windows, macOS, Linux | Phase 5 stage 5.3 | In progress | Windows: PASS. macOS, Linux: untested (no machine) |
| 7.2 | H.264 and AAC encoders, Android | Android devices | Phase 9 | In progress | SM-G990B: PASS. Other devices: untested |
| 7.3 | Binary transfer WebView to native | Android device | **Android gate** | Complete (one device) | SM-G990B: PASS with WebMessageListener ArrayBuffer messages, 226 MB/s, flat memory |
| 7.4 | Decoder limits and seek latency | Mid-range Android phone | **Android gate** | Complete (accepted on a high-end phone) | SM-G990B: PASS. A mid-range phone was not tested, by the user's decision (Q7.7) |
| 7.5 | Preview A/V sync | Android device | Phase 9 | In progress | Reported latencies and a speaker-to-microphone round trip recorded; the offset against the picture is not measured |
| 7.6 | HEVC decoding on desktop | Windows without HEVC extension, Linux | Phase 8 desktop codecs | Not started | — |
| 7.7 | Text rasterization parity | Windows, macOS, Linux, Android | Phase 8 text | Not started | — |
| 7.8 | HDR and 10-bit footage | Desktop and Android | Phase 8 media | Not started | — |
| 7.9 | Time-stretch quality and speed | Mid-range Android phone | Phase 8 video editing | Not started | — |
| 7.10 | Mesh and particle presets | Low-end Android device | Phase 8 presets | Not started | — |
| 7.11 | Stabilization analysis cost | Mid-range Android phone | Phase 8 stabilization | Not started | — |
| 7.12 | Android decision gate | — | Phase 9 | Complete | Passed 2026-11-26: the shared TypeScript engine stays in the Android WebView. No ADR needed |

## 3. Stages

Each prototype stage has the same shape: confirm the pass criterion, build the smallest probe that
measures it, run it on the named platform, and record the numbers, the device, and the software
versions in the progress table and stage log. Results on an emulator do not count for decode,
encode, or A/V sync (test instructions).

| Stage | Prototype (architecture §15) | Provisional pass criterion |
|---|---|---|
| 7.1 | Capability matrix of WebCodecs encoders in the chosen Electron version | MP4 with H.264 and AAC exports on every desktop target, through WebCodecs or the documented fallback (FFmpeg sidecar, ADR-0009) |
| 7.2 | Same matrix in the Android WebView | MP4 with H.264 and AAC exports, through WebCodecs or MediaCodec AAC |
| 7.3 | Stream a 1 GB export to MediaStore | At least 20 MB/s with flat memory |
| 7.4 | Two simultaneous 4K HEVC decodes, scrub test | Two proxy decodes in real time at 30 fps, seek under 300 ms, and original 4K decode for export at 10 fps or more |
| 7.5 | Sync test pattern on built-in speakers and wired headphones | Offset within ±45 ms after latency correction |
| 7.6 | Import HEVC clips | Clips preview and export through FFmpeg intermediates |
| 7.7 | Golden frames of bundled fonts with Canvas2D | Within golden-frame tolerance |
| 7.8 | Import HDR clips from recent phones | No visible clipping or colour shift in reviewed samples |
| 7.9 | Signalsmith Stretch benchmark | At least 4× faster than real time, no audible artefacts at 0.5× and 2× |
| 7.10 | One `mesh` and one `particles` preset | 30 fps at preview resolution |
| 7.11 | OpenCV.js tracking on a 1-minute 1080p clip | Under 2 minutes |

### 7.1 Desktop encoder check

The probe is `prototypes/7.1-encoder-matrix/` (`pnpm install`, then `pnpm probe`; add
`--auto-exit` to quit after saving). It runs `isConfigSupported()` for H.264 and AAC with the
default export preset's settings, then really encodes 3 s of generated 1080p30 frames and a 48 kHz
stereo tone with `VideoEncoder` and `AudioEncoder`. It muxes that output into an MP4 with Mediabunny
(the path architecture §11 uses), reads the file back, and checks codecs, frame count, duration,
and decodability. The result is saved to `results/<platform>-<arch>.json`.

| OS | Electron (Chromium) | H.264 encode | AAC encode | MP4 mux and read-back | Run |
|---|---|---|---|---|---|
| Windows 11 x64 (10.0.26100) | 45.5.0 (156) | PASS: 90 of 90 frames, High L4.0 | PASS: 141 chunks, 3.01 s | PASS: 321 KB, 3.008 s, 90 frames, `avc1.640032` and `mp4a.40.2`, both tracks decodable | 2026-11-26 |
| macOS | — | Untested | Untested | Untested | — |
| Linux | — | Untested | Untested | Untested | — |

- **Exit criteria:** the probe has run on Windows, macOS, and Linux; each result is recorded here;
  the MP4 mux step passes on each; every platform that fails WebCodecs has a documented fallback
  (ADR-0009).
- **Not checked on Windows:** whether the H.264 encode used hardware or software, and whether a
  machine without a suitable GPU behaves the same.
- **Open:** macOS and Linux are untested because the user has no such machine. Architecture §15
  already names Linux as the likely gap (AAC and H.264 encoders), and ADR-0009's FFmpeg sidecar is the
  planned fallback. Phase 5 may rely on WebCodecs on Windows only. The two platforms are verified when
  a machine or a CI runner is available, and in any case in Phase 10 stage 10.2.

### Android probes (7.2 to 7.5)

One throwaway Capacitor 8 app, `prototypes/android-probes/`, hosts all four. It has a small Java
plugin (a prototype only; product plugins are Kotlin, architecture §2) and plain web pages, one per
stage. `bash scripts/run.sh <7.2|7.3|7.4|7.5>` builds, installs, launches one probe on the attached
phone, and pulls `results/<stage>-result.json`. `SAMPLE_RSS=1` also samples the WebView renderer's
memory from outside (`scripts/analyze-rss.mjs`). The app adds no permission beyond Capacitor's
`INTERNET`; MediaStore writes to its own files need none on API 29 and later.

**Device:** Samsung SM-G990B, Android 16 (API 36), SoC SM8350, about 6 GB RAM, WebView
157.0.8103.50. The user rates it mid to high range. It is a 2021 flagship-derived phone, so results
are an upper bound for the "mid-range" criteria, not a proof for them.

#### 7.2 Android encoder check (2026-11-26)

| Check | Result |
|---|---|
| H.264 1080p30 encode | PASS: 90 of 90 frames at 73 fps, `avc1.640028`. Baseline level 3.1 is not supported |
| AAC 48 kHz stereo encode | PASS: 142 chunks, 3.03 s |
| MP4 mux and read-back (Mediabunny) | PASS: 328 KB, 3.029 s, 90 frames, both tracks decodable |
| Also supported | VP9 encode, Opus encode, 4K HEVC encode and decode |

The MediaCodec AAC fallback (architecture §13.1) was not needed on this device. Other devices and
vendors are untested.

#### 7.3 Binary transfer (2026-11-26)

Each channel streamed generated bytes from the WebView into a MediaStore file in
`Movies/MovieMakerProbe` (deleted afterwards), and the native byte count matched in every run.
Renderer memory was sampled from outside every 0.5 s. "Flat" is provisional: native and JS heap
growth of 50 MiB or less between the midpoint and the end, and no large renderer growth.

| Channel | Size and chunk | Speed | Renderer memory (MiB) | Verdict |
|---|---|---|---|---|
| Capacitor plugin call, base64 | 64 MiB, 1 MiB | 11 MB/s | 123 to 201 | FAIL (speed) |
| Loopback HTTP POST to an in-app socket | 1 GiB, 4 MiB | 136 MB/s | 254 to 1183, 1142 four seconds later | FAIL (memory not flat) |
| Loopback HTTP POST | 2 GiB, 1 MiB | 96 MB/s | 100 to 753, then released | FAIL (memory not flat) |
| `WebViewCompat.addWebMessageListener`, ArrayBuffer messages, 4 in flight | 1 GiB, 4 MiB | 219 MB/s | 1089 to 1179 (carried over from the previous run; fell to 214 afterwards) | Inconclusive |
| Same channel | 2 GiB, 1 MiB | 227 MB/s | 174 to 175 | **PASS** |

- **Result:** the Capacitor bridge is too slow for export, as architecture §13.3 suspected. Message
  passing with ArrayBuffers in about 1 MiB chunks and an acknowledgement window passes both the
  speed and the memory criterion on this device.
- **Limits:** one device; bytes were generated, not rendered; there was no `fsync`, so write-back to
  flash was not timed; the encoder and renderer were not running at the same time.

#### 7.4 Decoders (2026-11-26)

Clips were generated on the phone with its own encoder (10 s at 30 fps), then decoded from memory
with frames closed immediately: a 40 Mbps 4K HEVC clip with a key frame every 2 s, and a 720p H.264
proxy with a key frame every 0.5 s.

| Measure | Result |
|---|---|
| One 4K HEVC decode (hardware) | 109 fps. Software HEVC decode is not available |
| Two simultaneous 4K HEVC decodes | 83 and 80 fps |
| One 720p proxy decode | 543 fps |
| Two simultaneous proxy decodes | 393 and 377 fps |
| One proxy and one 4K original together | 131 and 135 fps |
| Seek, proxy (25 random seeks) | median 18 ms, 95th percentile 39 ms, worst 95 ms |
| Seek, 4K original with a 2 s key frame interval | median 273 ms, 95th percentile 496 ms, worst 517 ms |
| Concurrent hardware decoders | 4K HEVC: 5 work, the sixth fails. 720p H.264: 12 work (tested up to 12) |

- **Seek criterion:** "seek under 300 ms" applies to proxies only (Q7.5, answered 2026-11-26). The
  4K original misses 300 ms at the 95th percentile, which does not matter for export.
- **Open:** none for the gate. A mid-range phone is still untested; the user accepted that risk (Q7.7).
- **Limits:** a high-end phone; synthetic content; no B-frame, 10-bit, HDR, or 60 fps footage; no
  rendering, texture upload, or audio alongside.

#### 7.5 A/V sync (2026-11-26)

The pattern (a flash and a 1 kHz beep each second for 20 s) is driven by the corrected audio clock
(architecture §10.3). Reported by the WebView on the built-in speakers:

| Value | Result |
|---|---|
| `baseLatency` | 4 ms |
| `outputLatency` | 8 to 24 ms, median 24 ms |
| `currentTime` minus `getOutputTimestamp().contextTime` | 3 to 28 ms, median 26 ms |
| Display frame interval | 8.3 ms (120 Hz) |
| Flash triggered after its beep position | median 4.5 ms, worst 7 ms |

The ±45 ms criterion needs the real offset between the flash and the sound. The WebView reports
small latencies, but a report is not a measurement, so a microphone loopback was added (Q7.6): the
phone plays 12 beeps and records them with its microphone through Web Audio (echo cancellation,
noise suppression, and gain control off).

| Loopback value | Result |
|---|---|
| Beeps detected | 12 of 12, signal about 20 times the noise floor |
| Round trip, beep scheduled to beep heard | 211 ms. Ten beeps measured 211.3 to 211.4 ms; two outliers (168 and 146 ms) are false early detections, as the saved envelope shows 210 ms for every beep |
| Reported output latency plus microphone track latency | 24 ms plus 40 ms, plus one 2.7 ms render block, about 67 ms |

The round trip is very stable, so a fixed correction would work. But it adds the output path and the
microphone path, and it cannot split them. About 144 ms is unexplained: either the WebView
under-reports output latency (which would break sync by far more than 45 ms), or its microphone
path has a large hidden delay (which is common). The loopback therefore does not validate the
reported output latency, and the criterion is still unmeasured. The picture path (display latency)
is unmeasured as well. Wired headphones were not tested.

A per-device latency calibration at first use, using this same loopback, is one way to absorb the
unknown. That is a design idea for Phase 9, not a decision.

### 7.12 Android decision gate

- **Outcome (2026-11-26):** passed. Binary transfer (7.3) passes with message passing, and decoders
  (7.4) pass with wide margins, on the user's phone. The shared TypeScript engine therefore stays in
  the Android WebView, ADR-0001 stands, and no superseding ADR is written. The user chose to close
  the gate with this high-end phone rather than wait for a mid-range one (Q7.7). The risk: a
  mid-range phone could behave worse. If Phase 9 testing shows that, the native engine fallback
  (architecture §13.3) is still available through an ADR.
- **Original plan:** a recorded decision. If 7.3 or 7.4 failed, Android would adopt the native engine
  fallback (architecture §13.3) through a new ADR that supersedes the affected part of ADR-0001, and
  Phase 9 would be replanned around it.
- **Owner:** Planner; the user adopts the ADR.
- **Depends on:** 7.3, 7.4.
- **Exit criteria:** architecture §15 records the results (done, §15.1); the roadmap and
  [Phase 9](phase-9-android-app.md) reflect the outcome (done).

## 4. Decisions already taken

- The prototype list, platforms, and provisional criteria are those in architecture §15.
- The native engine fallback is the planned response to a failed gate (architecture §13.3).
- Stage 7.1 runs first, because Phase 5 relies on its result.
- The 7.1 pass criterion was confirmed unchanged by the user on 2026-11-26.
- Prototype code lives in `prototypes/<stage>-<name>/`, one standalone project per stage, outside the
  workspace gate and never imported by packages (Q7.1, accepted 2026-11-26). The Phase 0 workspace
  must exclude `prototypes/`.
- Electron is approved as a dependency of prototype 7.1 (2026-11-26). The product's Electron
  approval is still Phase 6 Q6.2.
- Mediabunny was approved on 2026-11-26 (Phase 3 Q3.1) and is used by the 7.1 and 7.2 probes.
- Capacitor 8.6.3 (MIT) is used by the Android probes. The user approved it explicitly on
  2026-11-26 (Q7.3). The product's Capacitor approval is still Phase 9.
- Android permissions in the probe app, prototype only: `INTERNET` (Capacitor's default),
  `RECORD_AUDIO` (approved for the loopback), and `MODIFY_AUDIO_SETTINGS`. The last was added by the
  agent because Capacitor's WebView client refuses microphone capture without it. It is a normal
  permission with no prompt. The user confirmed it on 2026-11-26. Neither microphone permission is
  approved for the product; Phase 9 asks again.
- Building the Android app needs JDK 21 or newer. Only JDK 17 and Android Studio's JDK 25 are
  installed, so the probe project uses Gradle 9.4.1 on JDK 25 with Android Gradle Plugin 8.13.
  Phase 9 must settle its own toolchain.
- **Design signal for the Android `ExportSink`:** stream the export through
  `addWebMessageListener` ArrayBuffer messages of about 1 MiB with an acknowledgement window, not
  through Capacitor plugin calls or a loopback HTTP server. This is recorded in Phase 9 stage 9.3.

## 5. Open questions

| # | Question | Recommendation | Blocks |
|---|---|---|---|
| Q7.1 | Where does prototype code live? | Resolved 2026-11-26: `prototypes/`, one folder per stage. | 7.1 |
| Q7.2 | Which devices form the matrix? "Mid-range" and "low-end" need named phones. | Resolved in part, 2026-11-26: one phone, Samsung SM-G990B (Android 16), rated mid to high range. A real mid-range phone and a low-end phone are still needed for 7.4 and 7.10. | 7.4 |
| Q7.3 | Approve Capacitor for the Android prototype app? | Resolved 2026-11-26: approved by the user. | 7.2 |
| Q7.4 | Do 7.7–7.11 run now or when their Phase 8 track starts? | When their track starts, except 7.10, which is cheap and informs preset scope early. | — |
| Q7.5 | Does "seek under 300 ms" in the 7.4 criterion apply to proxies only, or to the 4K original too? | Resolved 2026-11-26: proxies only. Measured: proxy 39 ms (95th percentile), original 496 ms. | 7.4, 7.12 |
| Q7.6 | How is the 7.5 offset measured? | Resolved in part, 2026-11-26: the user approved a microphone loopback and `RECORD_AUDIO`. It measured the round trip but cannot separate output from input latency (see 7.5). The offset is still unmeasured. An external recording (a second device at 60 fps or more, counting frames between flash and beep) would settle it, and so would a native audio probe. | 7.5 |
| Q7.7 | Is the Android gate settled with a high-end phone, or does it wait for a mid-range one? | Resolved 2026-11-26: settled with this phone. | 7.12 |

## 6. Stage log

| Date | Change |
|---|---|
| 2026-11-24 | Document created. |
| 2026-11-26 | 7.1 criterion confirmed, Q7.1 resolved. 7.1 In progress: Windows PASS for H.264 and AAC through WebCodecs in Electron 45.5.0, including MP4 mux and read-back. macOS and Linux marked untested (no machine). |
| 2026-11-26 | Android probes built and run on a Samsung SM-G990B. 7.2 In progress (PASS on one device). 7.3 Complete on one device: WebMessageListener ArrayBuffer channel passes, Capacitor bridge and loopback HTTP do not. 7.4 In progress (PASS on a high-end phone, mid-range untested). 7.5 In progress (reported latencies recorded, offset not measured). 7.12 not settled. |
| 2026-11-26 | User approved Capacitor, answered Q7.5 (proxies only), approved the microphone loopback, and chose to close the gate with this phone. 7.4 Complete (accepted on a high-end phone). 7.12 Complete: gate passed, shared engine stays in the WebView, no ADR. 7.5 loopback measured a stable 211 ms round trip that cannot be split into output and input latency, so 7.5 stays In progress. |
| 2026-11-26 | User confirmed the `MODIFY_AUDIO_SETTINGS` permission in the probe app. |

## 7. Handoff

- **Read first:** architecture §13.3, §15, ADR-0001, ADR-0009.
- **Do next:** the Android gate is closed, so Phase 9 can be planned. Open here: measure the 7.5 offset
  (external recording, or a native audio probe),
  run 7.10 (cheap, informs preset scope), and rerun 7.2 and 7.4 on other phones when available. 7.9
  and 7.11 run when their Phase 8 track starts. Run 7.1 on macOS and Linux when a machine or CI
  runner is available.
