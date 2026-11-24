# MovieMaker — Glossary

Use these terms in the product documentation, editor, and project model. The glossary describes the intended product, independent of any release or implementation phase, and evolves with the requirements and the architecture.

## Project and media

| Term | Definition |
|---|---|
| **Project** | A saved, editable montage with media references, a timeline, and output settings. |
| **Asset** | An imported photo, video, or audio file referenced by a project. The same asset can appear in several clips. |
| **Clip** | One use of an asset on the timeline, with its own duration and settings. Use **photo clip**, **video clip**, **audio clip** or **text clip** when the distinction matters. |
| **Frame** | A single image in a video stream. Use **clip** for a timeline item with a duration. A four-second photo clip in a 30 fps export contributes 120 output frames. |
| **Frame rate (fps)** | The number of video frames per second. Source frame rate and export frame rate can differ. |
| **Media library** | The editor area that shows the assets available to the project. |
| **Relink** | Reconnect a project asset to its source file when the original reference stops working. Existing clip edits are preserved. |

## Timeline and editing

| Term | Definition |
|---|---|
| **Timeline** | The time-based editor view that shows where clips and audio play within the project. |
| **Sequence** | The ordered series of photo and video clips that makes up the main visual edit. |
| **Track** | A timeline lane for related material, such as background music. |
| **Playhead** | The marker that shows the current position in the timeline and determines what the preview displays. |
| **Seek / scrub** | To seek is to jump to a time. To scrub is to move the playhead interactively and view the changing preview while exploring the timeline. |
| **Source time / timeline time** | Source time is measured from the start of the asset. Timeline time is measured from the start of the project. |
| **In point / out point** | The start and end of the selected range within a source. The project model uses an inclusive in point and exclusive out point, written `[in, out)`. |
| **Trim** | Shorten or extend the source range used by a video or audio clip, within available media. For a photo clip, use **change duration**. |
| **Effective duration** | The time a clip occupies on the timeline. For a video clip, it is the trimmed source range divided by the playback speed. |
| **Split** | Divide a clip into two clips at a chosen point, preserving their references to the same source asset. |
| **Anchor** | The visual clip that a caption or narration clip is attached to. The item stores an offset from the anchor clip's start and moves with the anchor when the sequence changes. |
| **Hard cut** | An immediate change from one clip to the next. |
| **Background music** | Songs on one or more music tracks that play over the visual sequence and its original clip audio. Songs on different music tracks can overlap. |
| **Ducking** | Automatically lowering the music volume while narration plays. |

## Appearance and motion

| Term | Definition |
|---|---|
| **Transition** | A timed change at the edit point between two adjacent clips. A cross dissolve blends the outgoing clip into the incoming clip. The transition describes the relationship between the two clips. In MovieMaker, it is assigned to the incoming clip and overlaps the end of the outgoing clip, which keeps playing. |
| **Visual effect** | In MovieMaker, an appearance setting applied throughout one clip. Examples include black and white, a color filter, color inversion, and horizontal mirroring. |
| **Ken Burns effect (Pan & Zoom)** | A change in framing over time, typically from the beginning to the end of a photo clip. It can pan across the photo, zoom in or out, or combine both. Different start and end crop rectangles define the motion. **Pan & Zoom** is a candidate UI label. |
| **Keyframe** | A value assigned to a property at a specific time, such as a crop rectangle at the start or end of a photo clip. Intermediate values can be calculated between keyframes. |

A photo clip can use black and white throughout, pan and zoom from the full photo to a detail, and fade in during its first half-second. A cross dissolve into the next clip is a transition at the boundary between them. Choices such as what appears behind a single-clip fade, how animations interact with transitions, and how transition timing affects adjacent clips belong in the feature specification.

## Preview and output

| Term | Definition |
|---|---|
| **Preview** | Playback of the current edit inside the editor. |
| **Proxy** | A lower-cost copy of source media used for responsive preview when the device cannot play the original smoothly. Final export never uses proxies. |
| **Intermediate** | A high-quality copy of a video at its original resolution, made once when the device cannot decode the original format. Preview and export then use it in place of the original. |
| **Edit plan** | The ordered segments, source and timeline positions, and settings derived from a project revision for preview and export. |
| **Render** | Process the sources and edit settings to produce the resulting video frames and audio. |
| **Export** | Write the rendered edit to a playable file, such as an MP4. |
| **Export preset** | A named group of output settings such as resolution, frame rate, container, and codecs. |

## Terminology references

- [Final Cut Pro glossary](https://support.apple.com/en-bh/guide/final-cut-pro/ver90ba496f/mac)
- [Final Cut Pro — Pan and zoom clips](https://support.apple.com/en-mide/guide/final-cut-pro/verb8e5de9c/mac)
