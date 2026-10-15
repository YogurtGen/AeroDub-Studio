# License ledger

Verified from local packages and executable version output on 2026-10-14. Full notes: ../THIRD_PARTY_NOTICES.md.

| Component | Installed version | License evidence | Bundled path |
| --- | --- | --- | --- |
| Application source | 0.4.2 | workspace LICENSE, GPL-3.0-or-later | resources/app.asar/src |
| Electron | 44.7.2 | electron/LICENSE, MIT; Chromium notices supplied by runtime | LICENSE.electron.txt, LICENSES.chromium.html |
| ffmpeg-static wrapper | 5.3.0 | package LICENSE, GPL-3.0-or-later | app.asar.unpacked/node_modules/ffmpeg-static |
| Windows FFmpeg | 6.1.1 Gyan essentials | ffmpeg.exe.LICENSE + ffmpeg.exe.README, GPL v3; --enable-gpl --enable-version3 | same directory, ffmpeg.exe |
| ffprobe-static wrapper | 3.1.0 | package LICENSE, MIT | app.asar.unpacked/node_modules/ffprobe-static |
| Windows FFprobe | 4.0.2 Zeranoe | executable --enable-gpl --enable-version3, upstream GPL v3 | bin/win32/x64/ffprobe.exe |
| Segoe UI | OS-provided | Font is referenced locally, no font redistributed | none |
| Chrome/sky reflections | original CSS | source-owned, no external media | src/renderer/style.css |
| Mountains | original SVG | source-owned, drawn for the owner's requested backdrop | src/renderer/mountains.svg |
| Animated bubbles | original CSS | source-owned, transform/opacity only | src/renderer/style.css |
| Water waves and light ripples | original SVG/CSS | source-owned, transformed within the welcome glass panel | src/renderer/index.html, style.css |
| Minimal Aero glass/wave icon | generated for this project | built-in imagegen edit; prompt/provenance in icon-direction.md | src/renderer/app-icon.png, app-icon.ico |
| Python | 3.12.14 | PSF/component license text | ai-runtime/LICENSE.txt |
| PyTorch / torchaudio | 2.6.0+cu124 | wheel LICENSE/NOTICE; BSD-style source licenses and bundled component notices | ai-runtime/Lib/site-packages/*dist-info |
| CUDA/cuDNN native libraries | PyTorch cu124 wheel | NVIDIA terms plus wheel component notices; public redistribution review pending | ai-runtime/Lib/site-packages/torch/lib |
| Demucs + official vocal model | 4.0.1 / 04573f0d | upstream MIT, package LICENSE and model license copy | ai-runtime/Lib/site-packages/demucs*, models/DEMUCS-LICENSE.txt |
| faster-whisper / CTranslate2 | 1.2.1 / 4.6.0 | distribution license metadata, MIT | ai-runtime/Lib/site-packages |
| Whisper large-v3 conversion | edaa852ec7e145841d8ffdb056a99866b5f0a478 | upstream code/weights MIT and converted model card MIT | ai-runtime/models/whisper-large-v3, WHISPER-LICENSE.txt |
| SoundFile / libsndfile | 0.13.1 | BSD wrapper; native library COPYING retained | ai-runtime/Lib/site-packages/_soundfile_data |
| Soft portal SFX | original 1.8-second synthesis | generated from the project's script, no samples | src/renderer/portal-soft.wav |
| SoundTouchJS AudioWorklet and bundled core/worklet-base/Lanczos | 2.1.1 | npm package MPL-2.0; complete unmodified processor source and license retained | src/renderer/vendor/soundtouch-processor.js, SOUNDTOUCH-LICENSE.txt |
| sherpa-onnx/core | 1.13.8 | Apache-2.0 wheel licenses retained | ai-runtime/Lib/site-packages/*dist-info/licenses |
| Pyannote segmentation conversion | 3.0 | MIT, Copyright CNRS, conversion bundle license | ai-runtime/models/speakers/sherpa-onnx-pyannote-segmentation-3-0/LICENSE |
| WeSpeaker ResNet34-LM embedding | official ONNX with sherpa metadata | official model card CC BY 4.0, author/project attribution and legal text retained | ai-runtime/models/speakers/WESPEAKER-MODEL-CARD.md, WESPEAKER-LICENSE.txt |

FFprobe's original binary supplier is no longer active. Exact corresponding source and linked-library build recipes remain an external-distribution gate; a current reproducible replacement is preferred before a public release. Python dependencies retain their own distribution notices, including the native audio libraries shipped by PyAV; the transcript path reads WAV through SoundFile. Complete AI version inventory and model hashes: ai-requirements-lock.txt and ai-model-manifest.json. The generated app icon is the only generated bitmap asset.
