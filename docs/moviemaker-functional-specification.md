# MovieMaker — Functional Specification

**Status:** Draft · 23 November 2026

This document describes the intended product capabilities for desktop and Android. It complements the [MovieMaker architecture](moviemaker-architecture.md) and uses the [MovieMaker glossary](moviemaker-glossary.md). Release priorities and platform-specific interaction designs are open.

## 1. Projects and output

- **New Project** creates an empty editable project. **Open Project** reopens an existing project with its timeline and settings.
- **Save** updates the current project. **Save As** writes a separate editable project under a different name or location.
- **Export Movie** produces a playable video file from the current edit and output settings.
- **Aspect Ratio** sets the proportions of the output canvas. The choices are Widescreen (16:9), Standard (4:3), and Custom.
- **Default Media Fit** sets how photos and videos whose proportions differ from the output canvas are placed, unless a clip has its own Media Fit (§3). **Fit** shows the whole picture with black bars and is the initial default. **Crop to Fill** fills the canvas and crops the parts of the picture that fall outside it.
- **Fit to Music** adjusts the photo clips so that the visual sequence starts with the first song and ends with the last song to finish.

### 1.1 Fit to Music

1. Use the span of the background music across all music tracks: from the start of the earliest song to the end of the last song to finish. Each song plays from its source in point to its source out point. Overlapping songs therefore count once, and gaps between songs are part of the span. If the earliest song starts after the beginning of the timeline, move all music clips earlier by the same amount, so that the music starts with the sequence. Narration clips do not move with the music. They stay anchored to their visual clips (§8).
2. Subtract the sum of the effective durations of the video clips. Use each clip's trimmed source range and playback speed. For example, six seconds of source video at 2× speed contributes three seconds.
3. Add the durations of all transitions except a transition on the first clip. Each of these transitions overlaps the end of the preceding clip (§5.1) and shortens the sequence by its duration, so the photos must fill that time.
4. Divide the remaining time by the number of photo clips. Assign that same duration to every photo clip, regardless of its previous duration.
5. Check that the calculated duration meets each photo clip's minimum (§5.1): its incoming transition plus the following clip's transition plus a short margin, provisionally **0.1 seconds**. A first photo clip counts its transition from the background as its incoming transition. A photo clip without transitions uses the margin alone.

The operation changes photo-clip durations and, when needed, the start time of the music clips. Captions and narration move with their anchor clips. An equal fit is impossible if there are no photo clips, the video clips consume the available time, or the calculated duration falls below the minimum for any photo clip. The proposed behavior in those cases is to keep the existing durations and explain why the fit could not be applied.

For example, two songs of 7 and 5 seconds played one after the other span 12 seconds. Minus 4 seconds of effective video, 8 seconds remain for photos. Four photos receive 2 seconds each. If the five clips use 1-second transitions at all four edit points, the photos share 12 seconds instead and receive 3 seconds each. A photo between a 1.5-second incoming transition and a 1-second outgoing transition would need at least 2.6 seconds with the proposed margin.

## 2. Media import and capture

- Import existing photos, videos, music, and narration as project assets.
- Take photos or record video using a device camera on Android or a webcam on desktop when available.
- Record narration using a microphone.
- Make imported and captured assets available for use in the project. Place photos and videos in the main visual sequence and place music or narration on the corresponding audio track.
- On Android, imported and captured media is copied into the app's storage, so projects keep working when the originals move. Media used by several projects is stored once, and the app shows how much storage it uses.

## 3. Timeline and clip commands

- Add and reorder photo and video clips. Add standalone text clips for titles and credits.
- Rotate a photo or video clip left or right.
- Set the **Media Fit** of a photo or video clip to Fit or Crop to Fill, or let the clip follow the project's Default Media Fit (§1).
- Remove a clip, select all clips, and cut, copy, or paste a clip.
- Edit the display duration of a photo or text clip. Adjust video clip duration using trimming or playback speed.
- Add a caption over a photo or video clip. A standalone title or credit occupies its own interval in the sequence. A caption plays on the single caption track above the sequence, so only one caption is visible at a time.
- A new caption starts with the clip where it is added and lasts as long as that clip. The user can change its start time and duration, so a caption can span several clips. The editor prevents captions from overlapping. If a clip edit pushes a caption onto the next one, the earlier caption is shortened to end where the next one starts, and the editor shows a notice. A caption pushed entirely under another is removed with a warning. Undo restores it.
- A caption is anchored to the clip where it starts. When clips are inserted, removed, reordered, or resized so that the anchor clip moves, the caption moves with it and keeps its duration. Moving a caption to a new start time anchors it to the clip at that time. Removing the anchor clip also removes the caption.
- A new caption shows the placeholder **[Enter text here]** in a transparent text box that is 70% as wide as the output canvas and centered horizontally and vertically. The placeholder disappears when the user starts typing, and a caption left empty is not rendered.

## 4. Text tools

| Control | Behavior |
|---|---|
| Content | Edit the text. |
| Typography | Choose the font, font size, and text color. Apply bold or italic. |
| Paragraph alignment | Align text left, center, or right inside its text box. |
| Placement | Center the text box horizontally or vertically within the output canvas. |
| Background | Set the background color of a standalone text clip. |
| Text entry preset | Apply the selected preset at the beginning of the text clip. |
| Text exit preset | Apply the selected preset at the end of the text clip. |

**Text entry presets** include Fade In, Stretch, Spin In, Fly In from Left, Fly In from Right, Scroll, Swing Down, Small Zoom In, Large Zoom In, Cinematic Burst (Lens Flares), and a second Cinematic Burst variant whose name and behavior are open.

**Text exit presets** include Fade Out and Spin Out. How much of this toolset also applies to captions is open.

## 5. Animations

**Animations** is the umbrella term for **Transitions** and **Pan & Zoom (Ken Burns)**. A transition is assigned to a clip and overlaps the end of the clip before it. Pan & Zoom changes the framing within a photo clip over time.

### 5.1 Transitions

A transition is assigned to the incoming clip. It starts when the incoming clip starts, lasts for the configured duration, and ends on the incoming clip.

- **After any clip:** the incoming clip starts earlier by the transition duration and overlaps the end of the outgoing clip, so the sequence becomes shorter by that duration. The outgoing clip keeps playing during the overlap. A video keeps moving and plays its whole trimmed range, and a photo or text clip keeps its Pan & Zoom motion, effects, and text presets, so nothing freezes. During the overlap, the outgoing clip's embedded audio crossfades into the incoming clip's audio.
- **First clip:** there is no outgoing clip. The transition starts from the project background (black or white), runs over the first clip's opening portion, and does not change timing.

Each clip must keep part of its duration free of transitions, so two transitions never run at the same time. A clip's duration must be at least its incoming transition plus the following clip's transition plus a short margin, provisionally **0.1 seconds**. This applies to photo, text, and video clips. For a video clip, its effective duration counts. The editor limits transition and clip durations accordingly. If a later trim, speed change, or duration change makes a clip too short, both of its transitions are shortened proportionally to fit, and the editor shows a notice.

Choose a preset and duration for a clip. The same preset and duration can be applied to all clips, including the first.

| Family | Presets |
|---|---|
| Geometric wipes | Bow Tie Horizontal, Bow Tie Vertical, Diagonal Box Out, Diagonal Cross Out, Diagonal Down-Right, Filled V Down, Filled V Right, Filled V Left, Filled V Up |
| Bars and patterns | Bars Horizontal, Bars Vertical, Checkerboard, Zigzag Horizontal, Zigzag Vertical |
| Blends and pixel effects | Blur, Blur Through Black, Crossfade, Dissolve, Rough Dissolve, Pixelate |
| Shapes and apertures | Circle, Circles, Diamond, Eye, Heart, Keyhole, Rectangle, Star, Stars, Wheel, Iris |
| Insets and reveals | Inset Bottom Left, Inset Bottom Right, Inset Top Left, Inset Top Right, Reveal Down, Reveal Right |
| Motion and splits | Flip, Roll, Shrinking In, Slide, Slide Down with Gap, Slide Down Together, Slide Up, Spin, Split Horizontal, Split Vertical |
| Shatter and whirlwind | Shatter In, Shatter Right, Shatter Top Right, Shatter Top Left, Whirlwind, Whirlwind from Top |
| Fans and page curls | Fan In, Fan Out, Fan Up, Page Curl Bottom Left, Page Curl Bottom Right, Page Curl Top Left, Page Curl Top Right |
| Sweeps and wipes | Sweep In, Sweep Out, Sweep Up, Wipe Down Narrow, Wipe Right Narrow, Wipe Down Normal, Wipe Right Normal, Wipe Down Wide, Wipe Right Wide |

### 5.2 Pan & Zoom (Ken Burns)

Apply a **Pan & Zoom** preset (Ken Burns effect) to a photo clip to move or scale its framing over time. With Fit, Pan & Zoom moves within the picture area, and any black bars stay visible. With Crop to Fill, Pan & Zoom fills the canvas.

| Family | Presets |
|---|---|
| Automatic | Automatic |
| Pan Up | Along Left Edge, Centered, Along Right Edge |
| Pan Down | Along Left Edge, Centered, Along Right Edge |
| Pan Right | Along Top Edge, Centered, Along Bottom Edge |
| Pan Left | Along Top Edge, Centered, Along Bottom Edge |
| Zoom In | Center, Top Left, Top, Top Right, Right, Bottom Right, Bottom, Bottom Left, Left |
| Zoom In with Rotation | Center with Right Rotation, Center with Left Rotation |
| Zoom Out | Center, Top Left, Top, Top Right, Right, Bottom Right, Bottom, Bottom Left, Left |

## 6. Visual effects and clip fades

Apply one or more visual effects to a photo or video clip. Effects stack in the order they are added, and the user can reorder or remove them. Each effect's scope is the full clip. A preset such as Hue Spectrum Cycle or 360° Spin can change over that interval.

| Family | Presets |
|---|---|
| Image processing | Blur, Edge Detection, Posterize, Threshold, Pixelate |
| Color and tone | Black and White, Black and White with Orange Filter, Black and White with Red Filter, Black and White with Yellow Filter, Cyan Tone, Sepia Tone, Hue Spectrum Cycle |
| Geometry and motion | Horizontal Mirror, Vertical Mirror, 360° Spin, Wrap |

The following clip fade presets affect the picture at the start or end of an individual photo or video clip.

| Position | Presets |
|---|---|
| Entry | Fade In from Black, Fade In from White |
| Exit | Fade Out to Black, Fade Out to White |

## 7. Video clip editing

- Change the playback speed of a video clip. Choose whether its embedded audio keeps its original pitch or changes pitch with the speed.
- Split a video clip at the chosen timeline position.
- Trim a video clip by changing its source in point or out point.
- Apply video stabilization.
- Disable or enable the embedded audio.
- Set the volume of the embedded audio, from silent to twice its original level.
- Choose None, Slow, Medium, or Fast for the fade-in and fade-out of the embedded audio. These controls affect only the audio. Picture fades use the clip fade presets (§6).

## 8. Music and narration

Music and narration use the same timing controls for audio clips. A project can have several music tracks, and each music track holds one or more songs as separate audio clips. Clips on the same track do not overlap, so overlapping songs go on different music tracks. Narration uses a single track.

| Control | Behavior |
|---|---|
| Fade In | Gradually raise the clip's volume at the start of its audible interval. |
| Fade Out | Gradually lower the clip's volume at the end of its audible interval. |
| Start Time | Set when playback of the audio clip begins on the movie timeline. A narration clip anchors to the visual clip at that time. |
| In Point (Start Point) | Set the position within the source audio where playback begins. |
| Out Point (End Point) | Set the position within the source audio where playback ends. |
| Volume | Set the clip's loudness, from silent to twice its original level. Each music track and the narration track also have a volume. |

**Narration follows the pictures.** A narration clip is anchored to the visual clip where it starts. When clips are inserted, removed, reordered, or resized, the narration clip moves with its anchor and keeps its source range. Moving a narration clip anchors it to the clip at its new start. Removing the anchor clip keeps the narration and anchors it to the clip that takes its place. Narration clips never overlap. If a clip edit pushes a narration clip onto the next one, the earlier clip's out point is shortened so it ends where the next one starts, and the editor shows a notice. A narration clip pushed entirely under another is removed with a warning. Undo restores it. Narration needs at least one visual clip.

**Music keeps its timing.** Music clips keep their start time when visual clips change. Only music edits and Fit to Music move them.

**Ducking.** When ducking is on, the music volume is lowered automatically while narration plays and restored afterward.

## 9. Open behavior decisions

- **Fit to Music:** Confirm the minimum margin, which transitions share (§5.1), and the proposed behavior when an equal fit is impossible. Define how the fit accounts for standalone text clips.
- **Transitions:** Define how to choose the opening background color.
- **Text and fade presets:** Define the second Cinematic Burst variant, caption styling beyond the default placement, applicable text presets, the Slow, Medium, and Fast audio fade lengths, and what appears behind a single-clip fade where relevant.
- **Audio:** Define the default ducking amount and its ramp lengths.
- **Framing and motion:** Define custom aspect ratio input and the Automatic Pan & Zoom behavior.
- **Release scope:** Prioritize features and presets for each release, starting from the walking skeleton in architecture §16, and verify that preview and export reproduce the chosen settings on the target platforms.
