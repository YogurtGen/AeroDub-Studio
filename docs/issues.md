# Known limits, 0.5.0

Current evidence is in release-status.md. Professional mode, source-track editing, clip effects, simultaneous voice tracks and local AI music/speaker models are implemented.

- Physical microphone quality, unplug/replug, hardware latency, AGC behavior and long-media drift still require real-device listening. Automated UI captures use a synthetic microphone through the real MediaRecorder path.
- Browser suppression and the universal microphone preset are captured into new takes. Clip raw/clean choices and effects cannot remove those already-captured changes. Noise reduction can alter timbre and cannot isolate every overlapping voice.
- Professional timeline edits retain the original video duration and do not ripple later clips. Gaps are black/silent. Video and original audio are independent. Later video clips cover earlier overlapping video clips; audio overlaps mix. See professional-mode.md.
- Timeline history is session-local and resets after new recordings or Easy take-control edits. Undo does not span project reopen. Portable project archives and device-latency calibration are not implemented.
- Video import, source thumbnails, edited previews and full audio mixes need disk space and processing time. There is no disk-budget estimator; long-media performance, disk-full recovery, variable frame-rate and unusual multichannel media need broader testing.
- Similar voices, short/overlapping turns and music can confuse speaker analysis. Sung-lyric quality and CPU-only music inference have not been evaluated broadly. Text/timing editors remain part of the workflow.
- Windows binaries are local unsigned builds. Interactive install/uninstall/upgrade, a clean-machine run and physically disconnected-network validation remain unperformed. Public distribution also requires the corresponding-source and runtime-license review in THIRD_PARTY_NOTICES.md.
