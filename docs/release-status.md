# AeroDub Studio 0.5.2 verification

## 0.5.2 offline lyric readings and singing timing

Date: 2026-10-15. The owner resumed after pausing the timing work and added Japanese romaji, Mandarin pinyin and Korean romanization. All generation runs in the local Python worker. Japanese pronunciation uses fugashi/UniDic-lite before pykakasi conversion; Mandarin uses tonal pypinyin and Korean uses korean-romanizer. Pinned versions and all package/dictionary licenses are retained. Both display controls share a persisted original/both/Latin preference. Manual readings survive regeneration and can be reset per line. Original-text changes invalidate stale readings. No audio or original measured word timing is changed by choosing a reading view.

The 0.5.1 capture fix is included: microphone samples use the backing AudioContext's frame clock, with reported device latency and guide look-ahead compensation. FFT denoising's measured 25 ms content delay is removed and the tail is flushed. Audible lyric-clock interpolation, phrase grouping and preservation of word rhythm address timing errors. Separate saved lyric and selected-take offsets support correction, including older takes; preview and cover export share take alignment. A shifted take is stopped at the song boundary even if animation frames are suspended.

Validation: 25 backend/media/timing tests and two reading-dictionary tests pass, including long expanded reading validation, original/timing preservation, manual correction, cancellation cleanup and exact PCM frame stops. Packaged reading UI passes actual offline generation, all three display modes, synced reading highlighting, playback switching, editable/reset readings, original-text invalidation, persistence, literal-text safety and five narrow locales. The complete packaged 0.5.2 GPU music workflow also passes actual separation/transcription, real captures/retakes, universal voice processing, stem/cover exports, saved/reopened projects, cancellation and scoped test-project deletion. Package verification passes 168 bundled file integrity/current-source comparisons, all four model hashes, unpacked Python modules and actual imports/dictionary use from the bundled runtime. The 0.5.1 packaged Professional UI regression passed before pause.

Build: `dist/0.5.2/win-unpacked/AeroDub Studio.exe`, FileVersion 0.5.2, 245,687,296 bytes, SHA256 `82e73af0e5fc17f77aaf67493c07b8339270608a0b37fb513b47bd9895af93fa`. The separate folder retains the older builds. Keep its entire runtime/resources beside the EXE. No full AeroDub installer was executed and the user's projects were not used for test writes. The existing 0.5.0 installer predates these changes.

## 0.5.2 download installer

Date: 2026-10-16. The supplied public repository is `YogurtGen/AeroDub-Studio`. `dist/setup-0.5.2` contains the offline installer for the verified 0.5.2 folder, four data slices totalling 5,999,805,977 bytes, and a single-EXE download bootstrap pinned to `v0.5.2-preview.1`. The bootstrap embeds the offline setup executable, downloads each slice with a compiled-in SHA256, then runs the per-user installation wizard. All application files, Python/audio libraries, AI models and reading dictionaries are in that full package. The online EXE requires the matching release assets to be public before it can download them. Exact artifact sizes/hashes are generated in `release-manifest.json` and `SHA256SUMS.txt` beside the installers.

Production packaging rechecked 168 app integrity/current-source entries, bundled dictionary execution and all four AI-model hashes. The isolated installer regression passes real download/extraction and an installation destination containing spaces, rejects changed hashes and missing assets before installing, and propagates a failing nested installer's code. It writes only to a new test-output fixture directory without shortcuts or uninstall registration. Publisher tests replace both Git and GitHub with command fixtures: successful uploads publish only after hash verification, wrong remote hashes retain the draft, a missing Git author uses the signed-in account's noreply identity, and missing authentication stops before Git changes. The actual app, current installation and existing projects are untouched by these fixture runs.

The release package also includes the application source ZIP, dependency locks, English README/install/preview notes and actual application screenshots. The source archive excludes AI models, node_modules, build output and test recordings. The publication script validates local files, pushes the explicit source directories without force, uploads a prerelease draft, compares GitHub asset digests and sizes, and publishes only after verification. It preserves an existing public release.

Final artifact verification passed all nine manifest asset sizes and SHA256s. After adding the explicit README Preview gallery, the source ZIP contains 94 entries, including the installer/publisher tests, English documentation and seven preview images. Source entries are checked byte-for-byte against current files. No runtime, model, node_modules or generated test/build directory is included. The online installer reports FileVersion 0.5.2.0 and ProductVersion 0.5.2.

Publication status: **not uploaded or published**. The public repository was accessible and empty at inspection. The official GitHub CLI was downloaded from its upstream release, checked against the asset's SHA256 digest, and reported no signed-in GitHub account. Publishing requires GitHub login on this machine. No GitHub credentials were requested in chat or stored in source. The prepared publisher is `npm run release:github`.

Remaining limits: full interactive install/uninstall, clean-machine Windows testing, live GitHub downloads and real-world interrupted transfers are unperformed. Downloads reuse verified files only within the same open wizard, with no partial-file resume across separate runs. Temporary and installed storage are both required. Preview binaries are unsigned, and the third-party source/redistribution review remains recorded in THIRD_PARTY_NOTICES.md.

Screenshots are under `test-output/readings-ui` and `test-output/sing-sync`. Repository copies are in `docs/images`; README and RELEASE_NOTES.md are in English and label previews/remaining limits. Automatic readings and Whisper word timing remain fallible; some reading subdivisions are estimated. Physical-device delay and long-song drift have not been verified. Reported device latency can omit driver/Bluetooth delay, and strong pitch effects can alter transients; the selected-take alignment control provides correction. Deterministic pulse timing is a synthetic signal measurement, not physical microphone calibration.

Final 0.5.2 timing regression also passed against the SHA256-listed EXE: the synthetic 246 ms device-path fixture records its pulse at 1.000208 seconds for a 1.000000-second target, including a deliberately delayed main-thread callback. Real negative/positive cover offsets, original-file preservation, stored/reopened/reset timing, measured word rhythm and all five narrow layouts pass with no page errors. This is a controlled signal result, not a physical-device measurement.

## 0.5.0 Professional mode

Date: 2026-10-15. Professional mode adds actual editable video/original-audio/dub clips alongside Easy mode. Ctrl+B splits the selected track; drag/trim, numeric timing, snap, zoom, Delete and session undo/redo affect saved project data and real MP4 output. Source thumbnails and waveforms come from imported media. Keyboard shortcuts can be remapped with conflict checks and persistence.

Persistent Dub 1–4 and up to 16 voice tracks support simultaneous speakers. Recording and retaking one part's original voice group preserve other voices. Horizontal/vertical clip dragging and explicit track selection, track mute, project reopen and four saved tracks are exercised. A two-frequency overlap check confirms both voices reach the output; muting one track removes only that voice.

The selected-audio inspector contains volume/gain, five-band EQ and response graph, pitch, pan/channel routing, fades, noise/high-pass/dynamics controls and clip-specific raw/clean choice. Split pieces retain independent effects. Actual signal tests measure EQ changes, octave shifts, duration preservation, left-only pan/channel swaps, fades and preview/export agreement. Fullscreen includes controls/clock/seek and exits with Escape. Easy part audition includes all active voice tracks.

Development verification passed: 20 backend/media tests; Professional UI; complete seven-part Easy UI; Smart Dub actual local speaker inference and synchronized take preview; all voice-control checks; and full music GPU separation/transcription, singing/cover/export workflow. All five Professional locale layouts at 760px have no document overflow. No page errors were recorded. Test data uses isolated profiles and synthetic media. Visual QA and contrast evidence: ui-gate.md.

Recording/media sources are retained. Video changes use a newly rendered silent preview; cancelled/failed processing does not replace accepted project metadata. Old video previews are pruned within the project cache. Default split-only video layouts preserve compatible stream-copy export. Existing old projects default to Dub 1 and neutral clip effects.

Behavior and constraints: professional-mode.md. No physical microphone listening session, long-media drift test or clean-machine installer run is claimed. Public-distribution license/source requirements remain in THIRD_PARTY_NOTICES.md.

### Packaged Windows build

The final EXE reports FileVersion 0.5.0. The offline build used the already-installed Electron 44.7.2 distribution with `npm run build:win -- --config.electronDist=node_modules/electron/dist`; the normal download route was unavailable in this sandbox. All 164 bundled integrity/current-source entries, both unpacked Python workers, runtime/license presence and four model hashes passed npm run test:package. Packaged Professional, Smart Dub and voice UI passed with the same synthetic profiles and actual media processing. Professional checks also cover Enter selection, vertical drag between tracks, fullscreen seek/Escape, saved shortcut JSON and the 720x640 minimum window.

Packaged seven-part Easy UI and the complete GPU music/Sing it! UI also passed. This includes real microphone capture, combined MP4 audio, gain/cleanup, original-stem separation/transcription, cover recording/export, cancellation and project deletion isolation. No page errors. The ready-to-run application is dist/win-unpacked/AeroDub Studio.exe; keep its surrounding files. The current EXE checksum is recorded in dist/SHA256SUMS.txt.

### Offline installer 0.5.0

The installer completed successfully under dist/setup-0.5.0 using the previously verified Inno Setup compiler. It contains AeroDubStudio-Setup-0.5.0-x64.exe and three .bin slices, plus instructions and SHA256SUMS.txt. All four artifact hashes were independently re-read and verified; slices are nonempty and at most 2,000,000,000 bytes. Total binary size is 5,946,226,103 bytes (about 5.95 GB), including the full local runtime/models. Installer FileVersion 0.5.0.0 and ProductVersion 0.5.0 are confirmed. Setup SHA256: 66c853dcfa7924d5186c5bd18b91d0c307a1fa60e9f0293981e2224303432a9b. App EXE SHA256: 148c42af65718bc37a4b39d7e13c0cfd985f89eddb98803ae71b756c1de74580. Root dist/SHA256SUMS.txt retains the historical installer entries and includes the current EXE/setup checksums. No installation or uninstall was performed.

## Earlier 0.4.2 verification

Date: 2026-10-15. Direct launch without installation: `E:\Games\AeroDub\dist\win-unpacked\AeroDub Studio.exe`. Keep the surrounding runtime files and `resources/ai-runtime` beside the EXE. See `dist/SHA256SUMS.txt` for checksums. It is an unsigned local development build.

The folder build contains the local inference runtime/models. At the user's later request, 0.4.2 also has a complete offline installer under dist/setup-0.4.2. Old 0.2.x installers in dist are earlier builds.

## 0.4.2 offline installer

- Built from the verified 0.4.2 folder using official Inno Setup 7.1.0 in portable mode. Compiler setup SHA256 and valid Pyrsys B.V. Authenticode signatures were checked. The compiler was not registered/installed as a system tool. Source/build command: installer/aerodub.iss, scripts/build-setup.ps1 and npm run build:setup.
- Output: dist/setup-0.4.2/AeroDubStudio-Setup-0.4.2-x64.exe plus three matching .bin data slices. Complete package about 5.95GB. It includes the entire application and local Python/audio/GPU/model runtime; no model download during installation. Keep all four files together. README-INSTALL.txt and SHA256SUMS.txt accompany them.
- Installer ProductVersion 0.4.2, FileVersion 0.4.2.0. Setup SHA256 739857b006a35975df9cde019a3d05d892facf9bd02c8494669e17f6d0c5487d. All four artifact hashes were re-read and verified, and the root dist/SHA256SUMS.txt includes the same entries. Each data slice is nonempty and at most 2,000,000,000 bytes. Compilation exited successfully.
- Preflight passed all 157 app file integrity/current-source comparisons and all four model hashes. The application code is the same tested 0.4.2 build. The installer offers per-user destination selection, optional desktop shortcut, Start menu entry and uninstall support. App-data projects are outside its installed file list.
- This task created and verified the installer; it did not run an installation or alter an existing installed app. Interactive install/uninstall and clean-machine testing remain unperformed; Windows Sandbox is unavailable. Compiler/runtime license and prior public-distribution limits remain documented. Packaging notes: installer.md.

## 0.4.2 low microphone input

- Diagnosis: the app explicitly disabled capture automatic gain control and coupled echo cancellation to Noise cancelling. Post-record cleanup assumed a -35dB noise floor with 12dB reduction. The user's settings were neutral (100% volume, 0dB gain, no tone/pitch changes). Historical saved takes show varied raw levels; there is no recent saved recording from their current mic session. Those project files were read only, without modifying their audio/metadata.
- Shared microphone constraints now request mono, automatic level on by default and optional browser noise suppression with echo cancellation independently off. New Settings checkbox Auto microphone level persists and can be disabled for unaltered input dynamics. Existing settings missing the flag use on. Active test capture restarts after toggling it; recording locks the flag. This applies to Settings monitor, dubbing and singing.
- Cleanup is gentler (6dB reduction/-55dB floor) and limiter latency is compensated. An original synthesized quiet-speech check measures -47.25dBFS raw, -57.41dBFS old clean, -47.89dBFS new clean, retaining 9.52dB more than before. A self-contained pulsed speech-band regression retains over 75% amplitude, preserves duration and keeps silence quiet. Existing rumble suppression still passes. Old takes are preserved; new capture/cleanup requires a retake.
- Twelve backend tests and development voice, smart-dub and full music UI passed. New checks cover default/persisted auto-level, actual getUserMedia requests, live restart, invalid setting rejection, mono/echo/noise independence, the singing track constraints and recording lock. Actual capture, manual gain/EQ/pitch, synchronized audition and export remain exercised. Five languages/narrow Settings are checked, with Indonesian screenshot inspected. No page errors.
- Device/browser support determines automatic gain behavior. No fixed boost or physical-device loudness guarantee is claimed; physical mic monitoring/AGC behavior still needs the user's listening check. Existing model, source preservation and distribution limits remain unchanged. API references and diagnostic/test details: voice-controls.md.

Final packaged 0.4.2 voice, smart-dub and full music UI checks passed. Actual browser capture flags, recording-time lock, mono capture, take/video synchronization, pitch/gain, preview/export and original-stem isolation are exercised with synthetic microphones. All 157 bundled file integrity/current-source comparisons, both Python modules and four model hashes passed. No page errors. Twelve backend tests passed. FileVersion 0.4.2, ProductVersion 0.4.2.0, EXE SHA256 `6274b20331ab956eb90c543d197b91ed48225b7ec0296cb6a765af8c8d0e1cf6`. The user's physical microphone was not recorded by the test harness.

## 0.4.1 music stem preview

- Replaced the prepared-song singer checkbox with Instrumental only, Vocals only and Both together buttons. One active selection drives the export dropdown in both directions. Preview switches gain paths on the running sources, keeping the playhead. Both previews the combined stems and exports separate files in a ZIP. Play preview has a labelled play/pause symbol. Selected buttons use an Aero blue outline, pale reflection and a check mark.
- Prepared-song preview uses the original split stems at unity gain. The Sing it! room retains its own singer-guide checkbox and instrumental/own-voice gains. Returning from a recorded take to the prepared-song player correctly previews the original singer stem rather than the user's recording.
- Development music UI passed actual GPU splitting/transcription, all three live preview paths, unchanged source/playhead while switching, export synchronization both ways, Space-key selection, five complete languages at 760px, MP3/WAV/ZIP/source protection, singing-guide independence, record/retake/cover export, original-stem preview after an own take, reopen/cancel/delete. Ten backend tests also pass. No page errors. Native dialog selections remain stubbed in the harness.
- Wide English and narrow Indonesian music player screenshots were visually inspected. New label contrasts: inactive 7.48:1, selected 10.67:1, hint 6.06:1 against their rendered surfaces. No new runtime dependency or external asset. Existing audio/model/hardware limitations remain as recorded below.

Final packaged 0.4.1 music UI passed the same complete workflow, including all three preview paths, continuous switching, export synchronization, keyboard/five languages, independent singing guide, actual captures and original-stem preview after listening to an own take. All 157 package integrity/current-source comparisons, Python modules and four model SHA256 checks passed. No page errors. FileVersion 0.4.1, ProductVersion 0.4.1.0, EXE SHA256 `6fd94f612c352d9f2246cae856869e977d233565e23e18567c8e7db638f4a75c`. Native dialogs are stubbed in UI tests and physical-device listening has not been assessed.

## 0.4.0 voice control and smart-cut checks

- Settings now provides globally saved own-voice volume 0–400%, gain -24..24dB, bass/treble -12..12dB, pitch -12..12 semitones, Reset and Hear my voice. Monitoring uses a local AudioWorklet graph and starts disabled on app launch. New video and song recordings bake the chosen preset into both cleanup variants once; prior takes keep their sound. Duration/lead alignment and normal take/mix volume remain intact. Five languages are complete.
- Ten backend tests pass, including measured actual gain/EQ/pitch and preserved duration/source bytes. The voice UI passes actual microphone monitor/pitch, saved settings on disk, reset, microphone release and all five languages. Narrow Settings screenshots at 760px are generated and document overflow is checked. Actual pitch shifts from about 1200Hz to 2400Hz.
- Development smart-dub UI passes actual A/B/A inference and local consensus, speaker labels/cache, manual start/end/split/join, automatic recording with a measured octave shift, take/video synchronization, trim/positive/negative shift, joint pause/end, recorded-cut protection and reopen. Music UI passes actual GPU separation/transcription, stem MP3/WAV/ZIP, original safety, lyrics editing, portal/spectrum, guide mute, countdown cancellation, shared voice preset/monitor, measured octave shift in captured singing, mic graph cleanup, full/partial retakes and actual cover export, five locales, reopen/cancellation/scoped deletion. No page errors.
- Smart-cut algorithm version 3 uses speech cores, handles solo/overlap/solo transitions and independent local votes (at least three windows), skips music-only gaps, and preserves detected utterances instead of splitting them into equal phrases. Legacy unrecorded projects refresh automatically on entering dubbing; recorded projects retain their cut times. Manual cut edits are available before any take is made.
- A read-only copy of the owner's 87.3-second Grand Blue project yields 26 parts instead of 21, retains the first four detected groups 1/2/3/1, removes the old mid-utterance boundary near 68.33 seconds and separates the overlap/following solo voices near 44–51 seconds. The owner only confirmed the first four parts; no complete human speaker/timing annotation exists for this sample. Test files live under test-output/accuracy; real saved projects were not overwritten. See smart-dub.md.
- SoundTouchJS 2.1.1 is pinned. Unmodified processor source and full MPL-2.0 license are bundled. Existing four AI models/hashes are unchanged. Runtime npm audit reports zero vulnerabilities. Model manifest records cut algorithm version 3. Both Python modules must be unpacked in the app build.
- Physical microphone monitoring latency and subjective sound quality remain untested. Live SoundTouchJS and final FFmpeg processing share values but differ in DSP implementation. Automatic speaker detection remains fallible with similar, short, musical or overlapping voices. Existing external-distribution gates in THIRD_PARTY_NOTICES.md are unchanged.

Final packaged 0.4.0 verification passed: voice UI (including denied microphone recovery and monitoring initially off), smart-dub UI, music UI and the seven-part video regression all ran against the folder EXE with isolated profiles. All 157 bundled integrity/source comparisons, both unpacked Python modules, runtime/model licenses and four model SHA256 checks passed. No page errors occurred. The EXE is 245,686,784 bytes, FileVersion 0.4.0, ProductVersion 0.4.0.0, SHA256 `49a13b92e9ff656c6b15e94842160458defeb036bfadfa1700b50053570cbb66`. Narrow ID/Korean voice settings and wide Settings were visually inspected. The user's original projects were not used for test writes.

Opened the real application directly after verification: PID 23740, title AeroDub Studio, native window handle 2296280, exact dist/win-unpacked EXE path and version 0.4.0 verified. No installer ran.

## 0.3.1 smart dub verification

- Local diarization uses sherpa-onnx/core 1.13.8, the official pyannote segmentation-3.0 conversion and WeSpeaker ResNet34-LM embeddings. Two original SAPI voices alternating David/Zira/David are detected as two groups. Parts preserve quiet-gap cuts and gain boundaries within 150ms of both direct voice changes. A separate official four-speaker Chinese sample yields four detected groups. The clustering threshold is 0.33; this is a limited functional/control calibration, not a general accuracy guarantee.
- `npm run test:smart-dub` passed actual inference, speaker labels, saved/cached padding changes, capture, take/video synchronization, trim and positive/negative offset, joint end/pause, recorded-cut protection and reopen. Original reference audio stays paused during the take check. Opening a video whose first part starts at zero now waits for metadata correctly.
- Seven backend tests passed, including same-speaker continuity, adjacent speakers, repeated labels, non-overlapping padding and grouped simultaneous voices. The existing seven-part regression reached its full capture/export checks; its two old status-text assertions were updated to the new video-audition message before the final packaged rerun.
- Tests use isolated profiles and invisible, noninteractive windows while retaining compositor/audio clocks. Speaker-labelled screenshot inspected: `test-output/smart-dub-ui/speakers-and-take.png`. Source fixture: `test-output/speakers/conversation.mp4`. Temporary analysis files are removed; cancellation assigns no partial analysis/cut settings.
- Model licenses, attribution, exact sources, hashes and dependency versions are retained in the runtime and docs/smart-dub.md, ai-model-manifest.json and ai-requirements-lock.txt. Existing recorded projects keep their cuts; use a new import to apply updated cuts to already-recorded material.

Packaged 0.3.1 verification passed: the complete smart-dub UI test and the seven-part video UI regression both ran against `dist/win-unpacked/AeroDub Studio.exe`. All 151 bundled integrity/source checks and all four model hashes passed. No page errors occurred. The direct EXE reports 0.3.1.0, 245,686,784 bytes, SHA256 `41a8a21d44efa69bfdea946b96da06b943c4eaa7ed0810f0d4779825341d570c`. The updated app is launched directly without running an installer. Physical microphone/lip-sync quality and general diarization accuracy remain unmeasured.

## 0.3.0 executed development checks

- Actual HTDemucs FT vocal-specialist separation ran on the RTX 4050 CUDA GPU. Whisper large-v3 int8_float16 transcribed an original 10.57s spoken phrase over a synthetic backing track, correctly returning the phrase and 17 timed words. This is functional inference evidence, not a singing-accuracy benchmark.
- `npm run test:music-ui` passed: actual native-dialog-stubbed MP3 import, model processing, synchronized Web Audio playback, guide mute, seek, MP3 instrumental/WAV vocal/ZIP dual exports and original-file protection; six transcript languages, actual inference, editable lyric persistence, literal HTML-like text safety, approved soft portal playback and real FFT energy; countdown cancellation, full-song MediaRecorder capture, partial retake, old-take selection, 150% voice gain and real cover export; five UI locales at 760px, Home/reopen, live import cancellation and scoped Recycle Bin deletion. No page errors.
- `npm run test:ui` passed the retained seven-part video capture/retake/preview/export workflow, settings, all five UI languages, motion settings, source protection and project deletion isolation.
- Six backend media/music tests passed. New music checks verify measured word-time retention, bounded edited timing in all five languages, capture lead removal, exact song-duration padding, captured voice audibility only in its interval, real 2x gain in export, invalid take rejection, source/stem protection and cancellation preserving an existing export.
- Wide song/editor/room screenshots and narrow Japanese were visually inspected. No horizontal document overflow in five tested UI locales. App tests use separate profiles, not the user's projects.

Screenshots: `test-output/music-ui/song-ready.png`, `lyrics-editor.png`, `sing-room.png`, `sing-id.png`, `sing-zh-CN.png`, `sing-ja.png`, `sing-ko.png`. Audio export evidence: `instrumental.mp3`, `vocals.wav`, `stems.zip`, `my-cover.mp3` in the same test folder. Sources/versions/checksums: music-engine.md, ai-model-manifest.json, ai-requirements-lock.txt.

## 0.3.0 packaged verification

- `npm run build:win` completed as a Windows x64 folder build. The direct EXE reports product version 0.3.0.0, 245,686,784 bytes; SHA256 `134a818c680fdd706ff7483af13d5d789c8cdf93b3b065110e41003b416c139e`. The folder includes the standalone AI runtime/models, approximately 8.2 GiB before generated Python bytecode caches. No installer was created or executed.
- `npm run test:package` passed all 150 ASAR/unpacked integrity and source comparisons, runtime/worker presence, model licenses and both complete model hashes. CTranslate2's upstream MIT license was additionally copied into its distribution metadata because the upstream wheel omitted it.
- The music UI test passed against the final EXE: actual inference, synchronized playback, record/retake, export, language, reopen/cancellation/deletion. The two PCM24 stems reconstruct the scaled original with peak error below 5e-7. Both real model processes used the packaged runtime, not development Python.
- The seven-part video UI workflow also passed against the final 0.3.0 EXE, including actual captured/exported audio. No page errors occurred in either packaged test. The SFX assertion waits for its audio clock to advance, avoiding a false failure immediately after play resolves.
- The app was opened normally for the user as PID 20764; title `AeroDub Studio` and nonzero native window handle verified. Tests used isolated profiles. An HTML-like test lyric briefly appeared in a test window and was explained as intentional literal-text safety data; it was never the user's transcript or part of the user's project store. Future test harnesses hide their windows while keeping renderer clocks active.

## 0.2.3 water and language checks

- Three translucent SVG wave layers and soft moving light ripples replace the straight water stripes inside the welcome glass panel. Transforms/opacity animate without a JavaScript frame loop. App and OS reduced-motion settings stop the effect; it pauses outside Home.
- Styled language rows show native names, selection marks and language codes. Arrow keys, Home/End, Enter, Escape, focus return and outside dismissal work. Opening microphone choices closes the language list.
- Mandarin (Simplified Chinese), Japanese and Korean translate every existing UI key, including recording states, errors and accessibility labels. File-dialog titles and new take names are localized; saved dates use the selected locale. Existing media/project/take names are preserved. Windows native dialog buttons follow the OS language.
- Development `npm run test:ui` passed the complete seven-part capture/retake/preview/export workflow, plus all five languages, translation coverage, dialog titles, preference saves, keyboard selection and app/OS motion settings. Source/export isolation, cancellation and project deletion checks also passed.
- Final packaged checks passed all five languages; welcome and dubbing layouts at 760px in Mandarin/Japanese/Korean have no horizontal document overflow. CJK headline sizes were adjusted and screenshots visually inspected.
- Mandarin, Japanese and Korean selections survived separate fresh launches using an isolated test profile. No page errors occurred. All 145 bundled integrity/source checks passed.

Screenshots: `test-output/packaged-water.png`, `packaged-language-menu.png`, `welcome-zh-CN.png`, `welcome-ja.png`, `welcome-ko.png`, `dubbing-zh-CN.png`, `dubbing-ja.png`, `dubbing-ko.png`. Focused packaged check: `test-output/check-language-water.cjs`. The user profile was not used for test projects.

## 0.2.2 icon refinement checks

The icon is now a minimal glossy blue orb with one white audio wave. Landscape and decorative details are removed. Both the PNG and seven-size Windows ICO were updated; the 128px ICO preview and actual 34px header icon were visually inspected. The packaged application opens as 0.2.2, loads the icon and exposes the native window-controls overlay with no page errors. Screenshot: `test-output/icon-minimal-window.png`. All 144 bundled integrity/source checks passed again. Dubbing code is unchanged; the complete seven-part workflow evidence below belongs to 0.2.1.

## 0.2.1 refinement checks

- Searchable project menu displays actual duration, take count and saved time. Home flushes edits; returning to a saved project restores recordings and settings.
- Project deletion requires confirmation and moves the scoped local project directory to the Recycle Bin. Packaged tests exercised cancel and actual deletion of synthetic projects, rejected traversal, and verified that the source video, exported MP4 and another project survive.
- Microphone selection/testing moved into Settings. The device menu remembers selection and supports keyboard navigation. Its panel stays visible after scrolling; Escape closes the device menu first and returns focus.
- Native Windows titlebar overlay is visible, with maximize/restore verified through BrowserWindow. The sticky header reserves space for native controls and uses the same pale blue surface. Native button pointer clicks were not automated.
- A generated glass/nature/sound-wave icon replaces the microphone tile. PNG transparency, seven Windows ICO sizes and executable icon resources are included. Prompt/provenance: icon-direction.md.
- `npm run test:package` passed all 144 bundled file integrity checks and source/asset comparisons. Source and bundled notice edits must finish before building.
- Final `npm run test:ui` passed against the packaged 0.2.1 EXE: all seven recordings, retake, combined preview, gain/cleanup, actual MP4 export, settings, Home, reopen/delete, cancellation, keyboard, EN/ID and narrow layout.

Additional screenshots: `test-output/ui-v2/project-picker.png`, `settings-microphone.png`, `delete-project.png`.

## Implemented

- Upload -> prepared video -> Start dubbing. The part list and cutting controls appear only inside Dubbing mode.
- Audio-activity smart cuts, 1–3s quiet context where available, long-gap skipping and continuous-audio fallback phrases. Silent video has an explicit full-video fallback.
- Record the active part, stop automatically, remain there for listen/retake, then move with Next. Review combines selected takes and permits returning to any specific part.
- Prominent 0–400% global dubbing gain, individual gain, consistent boosted audition/preview/export and a limiter.
- Correct byte-range serving for local media. Earlier code could restart playback from zero after seeking; HTTP 206/Content-Range now makes later-part recordings start at their own time.
- Blue Aero sky, original mountain SVG, original CSS ocean-window and seven ambient bubbles. Reduced motion stops background animation.
- Ctrl+A guard for the app surface; native editing remains available in text/number fields. The status is a dedicated copyable area.
- Noise cancelling, take selection/trim/shift, mix controls, autosave/reopen, five UI languages, cancellation and MP4 source protection retained.

## Executed tests

`npm test`: 4 passing tests with actual bundled FFmpeg/FFprobe. Checks include source immutability, correct shifted/trimmed take placement, ducking, preview/export agreement, actual gain boost and audition agreement, 7 detected audible sections in a 35s sample, 7 time-aligned voices in the exported MP4, unchanged duration, skipped quiet gaps, padding bounds, legacy migration, silent input, invalid input, and live process cancellation.

`npm run test:ui`: passing full workflow on development Electron and packaged EXE. Synthetic microphone audio travels through the actual browser MediaRecorder, processing IPC and FFmpeg pipeline; all seven exported parts are checked for audible captured audio. Later-part captures are checked against part duration to catch seek resets.

Click-through evidence:

- Welcome upload, New video and project picker: real media processing with native dialog selections stubbed by the harness. Cancelled selection/import preserves the active project.
- Prepared video Play and Start dubbing: parts remain hidden until entry; seven smart-cut parts appear afterward.
- Smart cutting: 3s then 1.5s context regenerates before recordings; cuts lock after takes exist.
- Hear part, video Play/Pause, scrub slider and waveform mouse/keyboard seek: operate the actual video clock.
- Microphone settings: test/on/off, device selection, suppression and reference-monitor toggles operate actual capture paths using a fake audio input.
- Record, automatic stop, same-part listen, retake, Next/Previous and direct part selection: completed across all seven parts. Retaking one part retains the other six.
- Take radio selection, rename, shift, gain, cleanup, mute, listen and delete: update saved state. Full preview, return to a chosen part and manual Stop are exercised.
- Global 250% gain, original/duck sliders, Save/reopen: values persist; each part remains audible in exported MP4.
- Full dub, Back to dubbing, MP4 export, source overwrite error and Reveal: rendering is real; native save/Explorer calls are stubbed.
- Ctrl+A: no app-wide selection; text field selects its full value. Copyable status uses a confined selection handler.
- Bubbles: seven actual CSS animations verified; Reduce motion hides them. Settings opens/closes with Escape; English/Indonesian preference persists.
- Silent-video full-part fallback, cancellation and 760px Indonesian layout: passed with no horizontal document overflow or page errors.

Screenshots: `test-output/ui-v2/welcome-en.png`, `uploaded-en.png`, `dubbing-en.png`, `review-en.png`, `dubbing-id-narrow.png`.

Actual captured seven-part MP4: `test-output/ui-v2/seven-recorded-dub.mp4`. This is generated test content, not user footage.

## Remaining limits

No physical microphone session, clean-machine run, long-song/video drift, CPU-only music inference test or disk-full recovery has been performed. Smart cutting uses CPU speech/speaker analysis but can still miss or merge voices, especially with music, overlap or short turns. AI music separation/transcription are shipped, but controlled fixtures do not measure lyric quality across sung music. Exact corresponding-source and native media/GPU distribution review remain a public-distribution gate; see THIRD_PARTY_NOTICES.md.
