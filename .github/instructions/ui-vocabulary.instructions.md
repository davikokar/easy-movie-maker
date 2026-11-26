---
description: Canonical names for MovieMaker's desktop and Android views, screens, areas, panels, sheets, dialogs, controls, and UI feedback.
applyTo: "apps/desktop/**/*.tsx, apps/mobile/**/*.tsx, packages/ui-kit/**/*.tsx, docs/mockups/**"
---

# UI vocabulary

> **Maintenance — owner: Designer. Mode: in-change.**
> If you **add** a named view, screen, area, panel, sheet, dialog, or control, name it here in the
> same change. **Renaming, removing, or resolving a collision between existing terms is the
> Designer's alone** — those need the whole vocabulary in view, not one entry.

Use these names when discussing, designing, implementing, and testing MovieMaker's UI. Use the bold
canonical name in prose, code identifiers, tests, and reports. Aliases are input synonyms only.

This file names **UI surfaces**. **Domain terms** — clip, playhead, transition, anchor, ducking,
proxy — belong to the [glossary](../../docs/moviemaker-glossary.md) and are not redefined here.

The source for every name is the [wireframes](../../docs/mockups/index.html). No UI code exists yet.
When a component is built, add its symbol in parentheses after the name, and call out any mismatch
rather than inventing a third name.

> **Desktop and mobile UIs are separate apps** (architecture §1, §14.1). A name shared by both means
> the same concept, not necessarily the same component. Components shared for real live in
> `ui-kit`.

## Desktop

### Main views

The desktop editor has **two main views** of the same project, chosen with the **View switch**.
They share the selection.

- **Storyboard view**: one card per visual clip, in order, with transitions and effects as badges.
  The default view for new projects. Aliases: **storyboard mode**
- **Timeline view**: the same project on a time scale, with lanes for captions, pictures, video
  audio, narration, and music. Exact timing and all audio edits happen here.
  Aliases: **timeline mode**

### Window areas

- **Menu bar**: File, Edit, View, Insert, Clip, Audio, Export, Help.
- **Toolbar**: the row of project-wide actions below the menu bar. Its controls:
  **Import button**, **Record menu**, **Add title button**, **Add caption button**, **Undo button**,
  **Redo button**, **Fit to Music button**, **View switch**, **Aspect ratio menu**, **Export button**.
- **Media library**: the left panel of assets, with **media filter chips** (All, Photos, Videos,
  Audio) and an **audio list** below the media grid. Each asset tile can carry an **asset badge**:
  usage count, duration, **job badge** (proxy, HEIC conversion, intermediate progress), or
  **missing badge**.
- **Preview**: the centre canvas showing the frame at the playhead, with a **fit badge** for the
  selected clip's media fit, and **on-canvas caption editing** in the dashed **caption box**.
- **Transport bar**: below the preview — previous, **Play button**, next, the time readout, the
  **scrub bar**, and the **Preview quality menu** (Auto, Full, Proxy).
- **Properties panel**: the right panel for the selection. Its title names the selection kind
  (**Photo clip**, **Video clip**, **Text clip**, **Caption**, **Narration clip**, **Music clip**).
  For a visual clip its sections are **Clip** (duration with the **minimum-duration hint**, media
  fit, rotate), **Transition in** (preset, duration, **Apply to all clips**), **Pan & Zoom**,
  **Effects** (an ordered **effect list** with drag handles and **Add effect**), and
  **Picture fades** (entry, exit). For a caption or audio clip it shows the **anchor field**
  (“Anchored to”) and **Select anchor clip**, then start time, in/out, fades, and volume.
  Aliases: **inspector**, **properties**
- **Status bar**: save and autosave state, **background job summary**, **missing media link**,
  **diagnostics count**, and the current preview source.

### Storyboard view parts

- **Storyboard card**: one visual clip — thumbnail, name, effective duration, and badges for Pan &
  Zoom, effect count, speed, caption (**CC badge**), and missing media.
- **Transition badge**: sits on the incoming card's left edge, reaching into the gap; shows the
  transition duration. Opens **Transition in**.
- **Insertion bar**: the blue bar showing where dragged cards will drop.
- **Add media card**: the last card, which imports into the sequence.
- **Audio summary**: a read-only overview of music and narration under the cards, with the
  **ducking chip** and **Edit in Timeline**.

### Timeline view parts

- **Timeline toolbar**: **Split button**, **Delete button**, **Snap toggle**, **zoom slider**, and
  **Fit timeline**.
- **Track headers**: the left column naming each lane, with **mute buttons**, a **track volume
  slider** for music tracks, and the **Record narration button** on the narration header.
- **Ruler**: the time scale at the top.
- **Lanes**, top to bottom: **Captions lane**, **Pictures lane**, **Video audio lane**,
  **Narration lane**, one **Music track lane** per music track, and **Add music track**.
- **Transition overlap**: the hatched area where an incoming clip is drawn over the end of the
  outgoing clip on the Pictures lane. Dragging its edge changes the transition duration. The first
  clip's darker overlap is the **background transition**.
- **Anchor link**: the dashed line from the anchor clip's start to the selected caption or
  narration clip, labelled with the offset; the anchor clip gets a dashed **anchor outline**.
- **Volume line**: the orange line on a music lane showing the level, including ducking.

### Dialogs and feedback

- **Export dialog**: choose an **export preset** (unsupported ones disabled, with the reason), the
  destination, and see **pending work** before export starts.
- **Export progress dialog**: steps, frame-based progress, time left, current frame, and
  **Cancel export**.
- **Relink dialog**: missing files with fingerprint matches pre-selected, **Locate…**, **Search
  another folder…**, **Keep missing**, and **Relink**.
- **Fit to Music failure dialog**: what happened, why, what to try, that nothing changed, and a
  collapsed **calculation details** section.
- **Restore dialog**: offers to restore unsaved work at startup when the recovery copy is newer.
- **Diagnostics panel**: the list of compiler diagnostics, each with a link to its fix. Opened
  from the **diagnostics count**.
- **Notice**: a transient message reporting an adjustment the editor made on its own, with
  **Undo** that reverts the whole command. Removals use the **warning notice** style.
  Aliases: **toast**

## Android

The Android UI is a phone in portrait. Dialog content is reused from desktop in full-screen
sheets.

### Screens

- **Projects screen**: **Recent projects** list, the **Recovery banner** (non-modal), the **App
  media folder card** (storage used, **Clean up unused media**), **Open package**, and the
  **New project button**. Aliases: **home**, **project list**
- **Editor screen**: the **app bar** (back, project name, undo, redo, **Export button**), the
  **Preview**, the **Transport bar**, the **Editor strip**, the **Add button**, and the
  **Editor navigation bar**.
- **Trim screen**: full-screen editor for one video clip — **trim filmstrip** with handles,
  **Split at playhead**, speed chips, **Keep pitch**, **Clip audio** switch and volume, audio fade
  in and out, and **Stabilize**. Aliases: **trim and speed screen**
- **Audio screen**: the editable lanes for captions, narration, and music, with pictures shown
  for orientation, the selected item's **anchor link**, the **Record narration button**, the
  **ducking switch** (“Lower music during narration”), and **Fit to Music** in the app bar.
  Aliases: **audio view**

### Editor screen parts

- **Editor strip**: the time-scaled strip under the transport bar with a **fixed playhead**;
  scrolling it scrubs. Thin read-only lanes for captions, narration, and music sit under the
  pictures. Tap selects a clip and shows **clip handles**; long-press lifts it to reorder.
  Aliases: **mobile timeline**, **strip**
- **Editor navigation bar**: the bottom bar with **Media**, **Transition**, **Effects**, **Text**,
  and **Audio**.
- **Transition sheet**: a bottom sheet for the incoming clip's transition — **family chips**,
  **preset tiles**, duration slider with its maximum, **Apply to all clips**, and **Done**. The
  preview stays visible and plays the chosen preset.

## Interaction language

- **Select** a clip or item; **multi-select** with Ctrl/Shift on desktop.
- **Reorder** by dragging cards (desktop) or long-press and drag (Android).
- **Trim** a video or audio clip; **change duration** of a photo or text clip (glossary).
- **Re-anchor** happens when a caption or narration clip is moved; never call it "snap".
- **Scrub** moves the playhead interactively; **seek** jumps (glossary).
- A wireframe **open question** (blue `?` marker) is undecided product behaviour. Do not design or
  implement past it; raise it with the user (see *What to ask before doing* in
  [AGENTS.md](../../AGENTS.md)).
