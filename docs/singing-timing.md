# Singing and lyric timing in 0.5.1

Sing it! records microphone samples on the same AudioContext clock that schedules the instrumental and singer. AudioWorklet frame timestamps identify the first captured sample. Main-thread callbacks and Opus encoding no longer determine the recording's starting position. Capture continues through the compensated end of the song so the final syllable is retained.

New takes subtract the playback base/output latency, the microphone track's reported input latency, and the guide mixer's 6 ms look-ahead. These are device estimates, not a measured acoustic calibration. Headphones, USB drivers and Bluetooth devices can add delay the browser does not report. The app requests an interactive playback context. The raw microphone path is captured; voice effects are applied once when saving.

The bundled FFmpeg 6.1.1 FFT denoiser delays sample content by about 25 ms without changing its apparent duration. Cleanup now pads to flush the final samples, removes that delay and retains the original duration. The same compensation applies to Professional clip denoising. Existing recorded files are preserved.

## Correct a recording or lyric display

Open **Timing adjustments** in Sing it!:

- **Lyrics timing (ms)** changes highlighting for this song. Positive values display lyrics later; negative values display them earlier. This does not move the instrumental or recording.
- **Recording alignment (ms)** moves only the selected take. Negative values bring a late recording earlier; positive values move an early recording later. Playback and exported covers use the same offset. Earlier takes can be selected under Your recordings and corrected independently.
- **Reset timing** resets both displayed values to zero. It retains the automatic compensation already applied to new takes.

Values persist with the project. Timing controls lock during recording. Original take audio is retained, including when correcting a take made in an older version.

## Lyrics

Highlighting uses an interpolated hardware output timestamp and includes the guide mixer's look-ahead. Changing a lyric line's start/end keeps its measured word spacing: moving a line translates its words; changing its duration scales their existing positions. Editing its text still estimates new word timing and labels that limitation.

New transcriptions form short phrases at measured word gaps, punctuation and readable length boundaries. Word timestamps are retained; phrase boundaries follow the first and last actual word rather than a long enclosing model segment. Missing or inconsistent word alignment is flagged for review. Existing lyric text is not silently replaced. **Preview line** in the lyric editor plays the audio near that line for checking its timing.

Whisper word alignment remains an estimate, especially for sustained notes, backing vocals and overlapping singers. These changes fix clock, editing and processing errors; they do not guarantee correct recognition for every song. Choose the song language before retranscribing and review flagged lines.

## Verification

`npm run test:sing-sync` uses an isolated project and an explicitly delayed synthetic AudioNode microphone. It records a pulse at a known song position, checks the compensated onset, exports both earlier/later alignment, checks original-file preservation, saves/reopens/resets timing, verifies measured word spacing and checks all five UI languages at 760 px. This is a deterministic signal test, not a physical-device latency measurement. `npm test` also checks exact capture frames, audible-clock interpolation, phrase boundaries, denoiser onset/tail preservation and real offset cover samples.

References: [AudioContext output timestamps](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/getOutputTimestamp), [AudioWorklet sample frames](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletGlobalScope/currentFrame), [Web Audio specification](https://www.w3.org/TR/webaudio-1.0/), [bundled FFmpeg denoiser source](https://github.com/FFmpeg/FFmpeg/blob/n6.1.1/libavfilter/af_afftdn.c), [faster-whisper word timestamps](https://github.com/SYSTRAN/faster-whisper#word-level-timestamps).
