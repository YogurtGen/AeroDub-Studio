# Professional dubbing mode, 0.5.0

Open a video, enter Dubbing, then choose Professional mode above the preview. Easy mode retains the guided part-by-part recording flow. Both workspaces use the same project and original recording files.

## Timeline

The upper two tracks contain the video and original audio. The dub tracks below hold the selected recordings. Video thumbnails and audio waveforms come from the imported media, not sample illustrations.

Click a clip, move the playhead, then use Split or Ctrl+B. Each track splits independently. Drag the body to move a clip; drag either edge to trim. Timing fields provide numeric adjustment. Snap aligns to the playhead, part boundaries and other clip edges; hold Alt during dragging to bypass it. Zoom scrolls horizontally, Fit shows the entire video, and playback follows the playhead. Overlapping clips inside one dub track occupy separate visual rows.

Delete removes the selected clip from the timeline. Undo restores it, including audio effects. Source recordings are retained. Timeline undo/redo is session-local and resets after new recordings or edits in the Easy take controls; it is not a persistent project-wide undo history.

Edits use the existing video duration and do not ripple later content. Empty video intervals show black; empty audio intervals are silent. Later video clips cover earlier overlapping video clips, while overlapping audio is mixed. The original-audio track stays independent of video movement. Recording and Hear this part use the edited original-audio guide when it has been changed. Video changes prepare a new silent preview before completing the edit; unchanged splits avoid rebuilding it. Actual MP4 export applies the same source ranges and timing.

## Multiple voices

Use Add dub track to create Dub 2, Dub 3, Dub 4 and more, up to 16. Choose Record to before recording a part. Retakes replace the selected recording only in that part's original recording group; recordings on the other voice tracks remain selected. This allows several people to speak at the same point in the video. Move a clip between tracks with a vertical drag or its Timing track selector. Mute beside a track name affects that track's mix. Empty tracks remain saved and available for later capture.

Full preview and MP4 include all selected, audible tracks. Easy mode's part-listening action includes all audible voices for the part. The take list retains older recordings. New microphone recordings continue to use the universal microphone preset from Settings.

## Clip audio

Selecting original audio or a dub clip opens its Audio tab. It contains:

- Clip volume, gain in dB, pitch with duration preserved and left/right pan.
- Original stereo, mono, either input channel duplicated to both outputs, or swapped channels.
- Five EQ bands: bass shelf at 200 Hz, peaking bands at 500/1500/3500 Hz and a treble shelf at 6000 Hz. The graph shows the EQ and optional high-pass frequency response, not a live spectrum or a quality score.
- Fade-in/out times, optional 80 Hz high-pass, gentle noise reduction and a dynamics compressor.
- Per-piece choice between raw and cleaned dub audio, effect reset and Solo selected clip.

Effects are saved per clip and copied when it is split. Changing one split piece does not change another. Raw recordings are never rewritten by clip effects. Preview, solo listening, part listening and export use the same FFmpeg effect values. A final mix limiter keeps digital peaks under its limit; this is not a physical microphone or listening-quality guarantee. Pitch correction here shifts the whole clip; it is not automatic tuning.

The cleaned/raw choice cannot undo browser suppression or microphone effects already captured into a recording. Return to Settings and retake if those input effects need to change.

## Preview and shortcuts

Fullscreen preview expands the video player and its transport, clock and seek slider. Exit fullscreen or Escape returns to the workspace. It does not export a separate file.

Default bindings, active in Professional mode outside editable fields:

| Action | Shortcut |
| --- | --- |
| Split selected clip at playhead | Ctrl+B |
| Play/pause mix | Space |
| Undo / redo timeline edit | Ctrl+Z / Ctrl+Shift+Z |
| Move selected clip 10 ms | Left / Right |
| Move selected clip 100 ms | Shift+Left / Shift+Right |
| Remove selected clip | Delete |

Open Keyboard shortcuts under the timeline, click a binding and press a replacement. Escape cancels binding capture. Duplicate assignments and common window-closing/reload combinations are rejected. Reset shortcuts restores defaults. Preferences are saved for the next launch.

## Implementation and references

The existing Electron/FFmpeg pipeline is retained. `src/timeline.js` handles source ranges, splits, tracks and validation; `src/clip-audio.js` shares effect definitions between the renderer and media worker. Persistent split pieces refer to the parent recording. No new dependencies or cloud services are added.

Use AeroDub 0.5.0 or newer for projects containing these timeline/track effects; older builds do not interpret the new editing metadata.

Interaction references: [CapCut editing guide](https://www.capcut.com/resource/how-to-use-capcut), [CapCut independent audio tracks](https://www.capcut.com/resource/split-sound-from-video), and [FFmpeg filter documentation](https://ffmpeg.org/ffmpeg-filters.html). The screenshot supplied by the owner informed selection, timeline and inspector placement. CapCut branding/assets are not bundled.

Verification commands: npm test, npm run test:pro, npm run test:ui, npm run test:smart-dub, npm run test:voice, npm run test:music-ui and npm run test:package. Test media/profiles are isolated under test-output. Physical microphone listening, long-media drift and clean-machine installation remain separate checks.
