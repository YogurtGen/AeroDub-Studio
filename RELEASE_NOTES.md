# AeroDub Studio 0.5.2 preview

This preview adds offline lyric readings and fixes the timing of recorded singing. It also includes Professional dubbing from 0.5.0.

## New

- One EXE installer downloads and verifies the full audio engine and AI models during setup. After installation, the application works offline without Python, Node.js or an API key. An offline installer set is also provided.
- Japanese romaji, Mandarin pinyin with tone marks, and Korean romanization generated on your computer.
- Original, original plus Latin reading, and Latin-only lyric views in the song workspace and Sing it!.
- Editable readings per lyric line, saved with the project. Regeneration preserves your corrections; each corrected line can return to automatic reading.
- Japanese pronunciation uses a bundled dictionary for contextual kanji readings and particles. Original lyrics and their measured word times are retained.

## Timing fixes

- Singing capture follows sample timestamps on the same audio clock as the backing track. Reported microphone/output delay is compensated, and capture retains the song's final syllable.
- Noise cleanup compensates its approximately 25 ms filter delay and flushes the end of the recording.
- Lyrics use the audible output clock. Moving a line keeps its measured word spacing; new transcriptions use shorter phrases based on word timing.
- Separate lyric timing and selected-take alignment controls are saved with the project. Take alignment affects both listening and exported covers, including older recordings.

## Professional dubbing

Edit video, original audio and up to 16 dub tracks with independent split, trim and position controls. Ctrl+B splits the selected clip, and shortcuts can be changed. Clip audio includes gain, pitch, left/right routing, pan, five-band EQ, fades and cleanup. Fullscreen preview, snapping, zoom and undo/redo support manual alignment.

## Preview notes

- Windows 10/11 x64. Processing runs locally after the full runtime and models are installed. No API key is required.
- Download **AeroDubStudio-Setup-0.5.2-x64.exe** and run it while connected to the internet. It downloads approximately 6 GB from this release, checks SHA256 hashes, then opens the installation wizard. Keep space for both the temporary download and installed application. Only this EXE needs to be downloaded manually.
- For an offline installation, keep **AeroDubStudio-OfflineSetup-0.5.2-x64.exe** and every matching `.bin` file together. The Source ZIP, checksums and manifest are developer/reference assets; normal installation does not require opening them.
- Local installer tests cover successful installation in an isolated fixture, hash rejection, missing downloads and failure propagation. A full clean-machine installation and real-world download interruptions remain unverified.
- Original media and recordings are retained. Existing projects open in the new build; older versions do not implement the new reading/timing controls.
- Speech recognition, word alignment and automatic readings can need correction, particularly for sustained singing, names, code-switching and overlapping voices.
- Device delay values are estimates. Physical microphones, Bluetooth audio and long-song drift have not been verified on every device. Timing adjustments provide correction for a remaining mismatch.
- The controlled timing test uses a synthetic input with a known delay. Its sub-millisecond result is not a hardware latency claim.
- Local preview binaries are unsigned. Exact third-party notices and the remaining public-distribution source review are documented in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Read [singing timing](docs/singing-timing.md), [lyric readings](docs/lyric-readings.md), and [Professional mode](docs/professional-mode.md) for controls and limitations. Repository previews use synthetic examples of the actual application, not downloaded song/video material.
