# UI gate 0.5.2

## README preview gallery

- Hard gate PASS: all seven README screenshot paths resolve to committed-source image locations with descriptive alt text. Home, music workspace and clip-EQ captures were inspected before copying; the existing Professional and lyric previews are actual application captures with synthetic examples. Navigation anchors and local documentation links are checked. This documentation edit changes no application controls or layout.
- Purpose gate PASS: Home establishes the Aero interface, the timeline shows multiple voices, and Sing it! shows lyric readings. Four secondary screenshots are inside a native GitHub details disclosure so the main preview remains readable. No generated artwork, decorative badges or unsupported feature claims are added.
- Liveliness PASS: documentation ENERGY 2 / RHYTHM 2 / MOTION 1. The blue Home screenshot introduces the app identity, followed by task-specific timeline and singing views; the gallery uses native GitHub typography and static images with no added animation.
- Craftsmanship/quality PASS: English captions describe visible, implemented features. Synthetic media is disclosed, original image files are retained, and screenshot links use repository-relative paths so they work after source publication. Preview accuracy and device/model limits remain linked from the gallery.

## 0.5.2 lyric readings and 0.5.1 singing timing

- Hard gate PASS: 25 backend/media/timing tests plus two real-dictionary tests pass. Packaged reading UI exercises all three display modes, manual edits/reset, original-text invalidation, saved/reopened preferences, literal HTML-like text safety and all five 760px locales with no page errors or horizontal document overflow. Timing UI checks real earlier/later WAV exports and original-file preservation. No reading or acoustic accuracy score is presented to users.
- Purpose gate PASS: the display selector is next to the lyrics it controls. Original text remains primary in Both mode, with a smaller pronunciation line below it. Reading fields let users correct names and a singer's pronunciation. The separate timing controls distinguish lyric display timing from the selected recorded voice. Existing Aero pale surfaces, blue selected text and Segoe UI remain; reasons are in DESIGN.md. No new decorative asset is introduced.
- Liveliness PASS: ENERGY 2 / RHYTHM 2 / MOTION 2 retained. Large current lyrics remain the focal point; previous/next text and smaller Latin readings supply context. Existing mountains, bubbles and restrained audio visualizer retain the app identity. No new animation is added, and reduced-motion behavior remains available.
- Craftsmanship/quality PASS: source word times are retained and automatic readings use those intervals, with character subdivisions and manual line timing documented as estimates. Visible semantic labels, native selects and editable text inputs retain the application's keyboard/focus behavior. New text/highlight contrast measured with antislop-human: highlight 4.85:1, reading text 8.29:1, supporting labels 5.89:1 and input text 12.48:1. Wide romaji, narrow pinyin and Japanese reading-editor screenshots are visually inspected. Footer status is in flow in song/singing views so it cannot cover the new controls. Model and physical-device limitations are stated in the docs.

## 0.5.0 Professional mode gate

- Hard gate PASS: 20 backend/media tests and development Professional, seven-part Easy, Smart Dub, voice and full GPU music UI runs passed. New controls perform actual clip edits, audio processing, multi-track capture, fullscreen and export. Five 760px language layouts have no horizontal document overflow. Local file/clip values are validated at IPC. Sources remain unchanged. No fabricated result or quality score is displayed.
- Purpose gate PASS: the owner's CapCut reference informs the shared ruler, clip selection and inspector. Pale solid panels retain Aero readability; blue marks selection and teal distinguishes dub waveforms. Video thumbnails derive from the source. EQ grid/curve represent actual frequency response. Reflective pressed mode buttons mark a real state; source SVG mountains and reduced-motion bubbles retain the existing identity. Reasons are in DESIGN.md; no decorative asset or dependency was introduced.
- Liveliness PASS: ENERGY 2 / RHYTHM 2 / MOTION 2 retained. Preview and timeline are the main work areas, with smaller part navigation and a bounded scrolling inspector. The full-width timeline, scene preview, numbered voice tracks and graph have different layouts because their tasks differ. Fullscreen focuses only the preview and its transport.
- Craftsmanship/quality PASS: selected clips have numeric and mouse timing controls plus keyboard movement, split and reversible delete. Undo/redo and raw-source retention protect edits. Independent voice recording groups retain the other speakers on retake. EQ/pitch/pan/channel/fade changes are measured in real audio and agree with solo/part/mix/export. Actual video-frame changes and empty black intervals are checked. All five locales, focusable clips, tab-key/Enter selection, shortcut remapping and Escape/fullscreen are exercised. Inspector text/plot contrast is 6.23:1, dub text 7.08:1, armed-track text 5.97:1 and muted supporting text 4.98:1, measured with the antislop-human contrast checker.

Evidence: test-output/pro-ui/professional-wide.png, audio-inspector.png, fullscreen-preview.png and professional-*-narrow.png; tests/pro-ui.js, timeline-media.test.js, clip-audio.test.js and timeline.test.js. Package verification is recorded in release-status.md. Physical microphones and long-media drift are not represented as tested.

The earlier gates below remain historical evidence for the retained UI.

Packaged verification: Professional/Smart Dub/voice checks passed against the final 0.5.0 EXE; 164 source/integrity comparisons and all four model hashes passed. The final Professional click-through includes actual fullscreen seek, Enter-based clip selection and the 720x640 minimum window. Screenshots are from the packaged application.

The final packaged seven-part Easy and complete GPU music/Sing it! workflows passed as well, with no page errors. Both UI branches use their actual media/capture paths and isolated synthetic profiles.

Direction: owner-requested modern blue Frutiger aesthetic, mountains and ambient bubbles. Interaction uses the owner's clarified per-part review/retake flow. ENERGY 2 / RHYTHM 2 / MOTION 2. Screenshots and click-through evidence are in release-status.md.

## 0.4.2 microphone level gate

- Hard/function/state PASS: saved Auto microphone level checkbox defaults on for legacy settings, restarts an active test mic, validates its boolean at IPC and locks during recording. Actual capture constraints are shared across Settings, dubbing and singing; no decorative-only control. Twelve backend tests and voice/smart-dub/music UI pass, including quiet signal preservation, timing, live monitoring, capture and export. No page errors.
- Purpose/design PASS: one labelled checkbox and explanation reuse the existing Settings surface and colors. It gives users a direct choice of input leveling without adding a new panel or decorative asset. The meter scale is not changed to imitate a louder input; processing changes the actual capture/cleanup. DESIGN.md records the purpose.
- Copy/accessibility PASS: semantic checkbox, keyboard interaction and existing focus; five complete language dictionaries and narrow Settings checks. The 760px Indonesian screenshot is inspected; scrolling keeps reset and voice controls reachable. Existing Settings label/hint contrast values remain unchanged.
- Liveliness/craftsmanship PASS: existing ENERGY 2 / RHYTHM 2 / MOTION 2 retained. No new animation, asset or invented voice-quality claim. Actual quiet-speech attenuation is measured; browser/device-dependent gain and physical hardware listening limits are explicit. Original user takes/settings were not overwritten by tests. Packaged evidence: release-status.md.

- Packaged execution PASS: final 0.4.2 voice, smart-dub and full music workflow pass with synthetic input and isolated profiles; twelve backend checks pass. All 157 packaged source/integrity checks and four model hashes pass. No page errors. Actual physical microphone/AGC response remains a user listening check; it is not represented as verified.

## 0.4.1 stem preview gate

- Hard/function/state PASS: three preview buttons isolate instruments, vocals or combine them through the actual Web Audio gain paths. Switching keeps the same source and playhead. Export choice synchronizes in both directions; real MP3/WAV/ZIP exports pass. Prepared-song preview stays separate from the singing guide and uses original stems after an own take. Full music UI and ten backend tests pass without page errors.
- Purpose/design PASS: the existing pale work surface and blue palette hold one compact button group. A reflection, outline and check mark identify the selected stem; the standard play/pause shape explains the player action. No extra artwork, motion or decorative icon set. DESIGN.md records the owner's direction and reasons.
- Copy/accessibility PASS: fieldset/legend, named semantic buttons, aria-pressed, visible selected check and keyboard Space activation. All five UI dictionaries are complete and 760px layouts have no horizontal document overflow. Wide English and narrow Indonesian were inspected. Measured new text contrasts are 7.48:1 inactive, 10.67:1 selected and 6.06:1 hint. Existing focus/reduced motion behavior remains.
- Liveliness/craftsmanship PASS: ENERGY 2 / RHYTHM 2 / MOTION 2 retained, no new animation. Preview decisions sit between the waveform/player and export controls; singing remains a clear separate action. The actual split audio and real export formats are tested; no invented data or claims are presented. Remaining limitations and packaged results: release-status.md.

- Packaged execution PASS: full 0.4.1 music UI passed preview isolation, source/playhead continuity, export selection both ways, keyboard, five narrow locales, actual MP3/WAV/ZIP, guide/capture/cover export and original-vocal routing after an own take. All 157 current-source/integrity checks and four model hashes pass. No page errors. Wide English and narrow Indonesian/Korean buttons were visually inspected. Audio hardware listening remains untested.

## 0.4.0 voice and cut gate

- Hard/input/state PASS: five labelled range controls, numeric values, reset and actual live monitor operate in Settings; values save to disk. Actual octave shifts are measured in live audio and captured video/song takes. Controls lock during capture; monitor remains switchable. Countdown cancellation and microphone shutdown release the graph. Ten backend tests and dedicated voice/smart-dub/music UI checks pass with no page errors. Full packaged checks are recorded in release-status.md.
- Purpose/design PASS: existing blue panel, typography, focus and readable surfaces are reused. Aligned values make small sound changes legible; one scrolling Settings surface keeps all controls accessible. Start/end/split/join controls live under a collapsed part editor, preserving the record/review focus. No decorative asset, extra motion or theme variation is introduced. Reasons/dials are in DESIGN.md.
- Copy/accessibility PASS: all new controls have semantic labels and five language entries, keyboard-operable ranges and existing focus treatment. Settings retains its Escape close and bounded scrolling. 760px screenshots and document-overflow checks cover Indonesian, Mandarin, Japanese and Korean; the wide Settings screenshot is visually inspected. Existing panel/label colors retain the previously measured contrast values below.
- Liveliness/craftsmanship PASS: ENERGY 2 / RHYTHM 2 / MOTION 2 retained. Clear live listening and reset actions serve the requested voice adjustment. Manual cuts affect actual saved timing and are protected after recording. Speech-only boundaries/local consensus are tested with actual synthesis and a read-only copy of the user's sample; limits are explicit and no perfect-accuracy claim is made. Existing takes remain intact.

- Packaged execution PASS: final 0.4.0 voice, smart-dub, singing and seven-part video click-throughs all passed; microphone denial recovery and monitor-off startup are exercised. All 157 app integrity/source comparisons and four AI model checksums pass. Wide Settings plus narrow Indonesian/Korean controls were visually inspected; all four non-English narrow layouts have no document overflow. No page errors. Detailed evidence and limitations: release-status.md.

## 0.3.1 smart dub gate

- Purpose/design PASS: numbered speaker metadata extends existing part rows and reflects actual detected voice groups. The existing Aero palette, spacing and record/review focus are retained; no new decorative asset is introduced.
- Function/input/state PASS: actual A/B/A model inference, direct voice-change boundaries, cached padding, capture, synchronized video/take, trim and positive/negative offset, joint pause/end, protected recorded cuts and reopen passed the dedicated UI test. The original reference stays paused during take checks. Metadata loading handles a first part at time zero after reopen.
- Evidence PASS: seven backend tests pass; two synthesized alternating voices and a separate official four-speaker Chinese sample exercise the actual model. Detection errors with similar/short/overlapping voices are documented. Labels are numbered groups, without invented names or identity claims.
- Copy/accessibility PASS: speaker/progress/hint/audition messages exist in all five UI languages. Existing semantic buttons, focus, copy/paste behavior and reduced motion remain unchanged. The speaker-labelled layout screenshot was inspected.
- Craftsmanship PASS: the feature changes the user's actual recording/review decision; quiet-space padding does not cross adjacent speaker boundaries. Existing recorded projects retain their parts. Package and seven-part regression evidence is recorded in release-status.md.

## 0.3.0 music gate

- Purpose/design PASS: music entry, export selection, language choice and singing room follow the owner's requested workflow. Existing blue Aero planes retain contrast; large lyrics are the singing focal point, with previous/next context and a restrained real spectrum.
- Functionality PASS: development UI executed actual GPU separation/transcription, MP3/WAV/ZIP exports, guide mute, text/timing edit, approved soft SFX playback, audio-clock word fill, countdown cancellation, full recording, retake/selection, voice gain, cover export and project persistence/deletion. Synthetic source/export survived. No page errors.
- States/input PASS: lyric empty/edit/review states, processing/cancellation and source-overwrite errors have actual behavior. Six transcript language choices use the custom keyboard menu. Native editing and literal user text remain safe; the test's HTML-looking lyric displays as text.
- Layout PASS: wide music/editor/Sing it! screenshots and narrow Japanese were visually inspected; all five UI locales at 760px have no horizontal document overflow. Long lyrics wrap within the work plane. Secondary takes/cover controls remain reachable by scrolling.
- Motion/audio PASS: 16 bars reflect actual FFT data at capped height; app/OS reduced motion replaces movement with static bars and stops room entrance. Approved soft 1.8s original sound plays only on Sing it! entry or explicit preview; Settings saves the enable preference.
- Evidence/claims PASS: real functional inference is tested with an original spoken phrase and backing tone. Singing transcription quality, physical microphone timing and CPU-only hardware remain unmeasured; neither perfect stems nor typo-free lyrics are claimed.

The retained base UI and earlier rule-by-rule evidence follow. Packaged verification is recorded in release-status.md.

## 0.2.3 change gate

- R-02 PASS: authored source/docs contain no em dash, checked with rg.
- R-03 / C-4 PASS: packaged Mandarin/Japanese/Korean welcome and dubbing screens at 760px have no horizontal overflow; screenshots inspected. CJK headline sizing avoids the earlier Japanese orphan line.
- R-23 / R-37 PASS: the owner explicitly requested water VFX and the new language picker/locales; DESIGN.md records the existing glass-panel direction and calm motion.
- R-24 / R-26 / R-32 / C-2 PASS: all five selections update the actual UI and saved preference. Arrow keys, Home/End, Enter, Escape and focus return executed; each new language survived a fresh packaged launch. Native import-dialog titles also tested.
- R-25 PASS: picker label/selection colors reuse the previously verified pale work surfaces. The stationary dark caption remains readable over the light lower water layer. No flashing or moving text was introduced.
- R-33 PASS: markup, CSS and locale dictionaries were edited directly with apply_patch; no UI rewrite script.
- R-35 / R-36 / R-38 / C-5 PASS: seven-part development capture/export passed through actual MediaRecorder and FFmpeg. Packaged five-language/layout/restart checks and 145 integrity checks passed. Synthetic media and the physical-microphone limit are recorded separately.
- R-01 / R-04 / R-06 / R-07 / R-08 / R-09 / R-10 / R-12 / R-13 / R-14 / R-19 / R-22 / C-1 PASS: water gradients and layered ripples serve the owner's Aero glass-panel request. Native language names and genuine locale codes carry the choice; the chevron indicates a menu. Selected rows reuse the microphone palette, without new icon/blur/glow stacks. Reduced motion stops VFX; it pauses outside welcome.
- Liveliness / C-3 / R-05 / R-11 / R-15 / R-16 / R-20 / R-21 / R-29 / R-30 / R-31 PASS: existing dials, upload focal point, task layout, light blue palette and product copy remain coherent. The requested water motif gains gentle local movement; existing radii and workflow stay consistent.

The remaining gate evidence below describes the retained base UI and earlier refinements.

0.2.2 refinement: the owner's latest direction simplifies the icon to a blue glass orb with one white audio wave. Actual small-size/header imagery was inspected; the packaged application opens and loads the icon with no page errors, and all 144 package checks pass. The dubbing UI and behavior retain the 0.2.1 verification below.

0.2.1 refinement: searchable saved-project rows with genuine media metadata, confirmed Recycle Bin deletion, Home, custom microphone picker in Settings, a sticky pale blue titlebar with native Windows controls, and an explicitly requested vivid generated Aero glass/nature icon. The final packaged workflow passed, including deletion isolation, saved microphone preference, Settings after scrolling and 760px Indonesian layout. Screenshots of the project list, open microphone menu and delete dialog were inspected; native overlay presence and maximize/restore were verified through Electron. Package integrity passed for all 144 bundled files. See icon-direction.md for the generated asset prompt/provenance.

## Hard gate

- R-02 PASS: authored UI and docs have no em dash.
- R-03 PASS: Indonesian layout at 760px has no document overflow; parts row scrolls and smaller workspaces reflow. Windows desktop minimum width remains 720px.
- R-17 / R-18 PASS: no invented statistics or testimonials. Counts/durations reflect actual media and saved takes.
- R-23 PASS: the owner explicitly requested the blue mountain/bubble backdrop; assets are original SVG/CSS. Identity uses product text.
- R-24 / R-26 PASS: all shipped navigation/controls have actual behavior, documented by click-through. No absent feature links.
- R-25 PASS: measured text contrasts on work planes: primary 11.17:1, secondary 4.97:1, primary-button text 4.66:1, volume output 5.38:1, recorded status 5.86:1. Copy has a pale opaque backing over mountains; outside-panel headings use dark text, 5.55:1 on sky blue.
- R-27 PASS: welcome/upload, actual processing/cancellation, no-audible-parts fallback, empty takes and source-protection errors are exercised.
- R-28 PASS: no generic FAQ.
- R-32 PASS: semantic buttons/labels, visible focus, Escape popover close, waveform keyboard seek and native input selection. Ctrl+A guard preserves editing and confines copyable status selection.
- R-33 PASS: source edits only, no external UI rewrite script.
- R-34 PASS: one coherent blue Aero theme; no partial toggle.
- R-35 PASS: media tests and complete seven-part packaged click-through pass with no page errors. Native dialogs/Explorer are explicitly stubbed, physical microphone is explicitly untested.
- R-36 / R-38 PASS: no invented claims; synthetic test media and energy-based cutting limits are identified.
- R-37 PASS: DESIGN.md records the owner's evolving direction and reasons.

## Purpose gate

- R-01 PASS: blue sky is the owner's explicit choice; gradients only supply sky/water depth behind work planes.
- R-04 / R-06 PASS: text-first controls, installed contemporary Windows typography, no default decorative icon set or tracked uppercase labels.
- R-07 PASS: water reflection and mountain contours are requested identity imagery; no decorative technical grid.
- R-08 / R-09 PASS: no ornamental button arrows or marketing badges.
- R-10 PASS: backdrop blur only on header; media/record/take surfaces use solid pale backing.
- R-12 / R-13 PASS: shadows distinguish settings/progress overlays; no component glow stack.
- R-14 PASS: preview, current recording, part navigation and collapsed take editing have task-specific proportions.
- R-19 PASS: slow transform/opacity bubbles are explicitly requested, behind noninteractive content; reduced motion disables them. State transitions and the actual media clock remain restrained.
- R-22 PASS: original mountain/water graphics come from the requested aesthetic; no stock illustrations.

## Liveliness / craftsmanship

- Dials PASS: ENERGY 2 / RHYTHM 2 / MOTION 2 consistent with the sky backdrop, changing upload/dub/review composition and sparse ambient motion.
- Focal point PASS: welcome has one upload action; prepared video has Start dubbing; current part has Record/Listen/Retake; full review prioritizes video.
- Whitespace / accent / identity PASS: clear task separation, lake-blue primary action, blue sky/mountains/water repeated without obstructing media.
- Design Read / C-1 / R-31 PASS: direction and one-line color/material/type/layout/spacing/motion reasons in DESIGN.md.
- C-2 PASS: full record -> per-part review -> retake -> next -> combined review -> part return -> export executed.
- C-3 / R-05 PASS: actual recording decisions drive the layout, without dashboard metric/cards or marketing sections.
- C-4 PASS: empty/processing/error, narrow ID layout, keyboard and reduced-motion states exercised. Hardware/release limits remain separately untested.
- C-5 PASS: tests, synthetic capture and non-AI cutting limits are reported honestly.
- R-11 PASS: varied 6px waveform, 10px controls and 18px workspace radii; no blanket pills.
- R-15 / R-16 PASS: concrete action labels, no generic marketing CTAs/buzzwords.
- R-20 / R-30 PASS: original Aero landscape and task composition; Choicer Voicer informs the clip-review loop only, no copied media/UI assets.
- R-21 / R-29 PASS: light blue surfaces follow updated user direction; blue/white work palette with restrained green landscape/recorded-state accents.
