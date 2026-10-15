import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
import zipfile
from fractions import Fraction


def event(kind, **data):
    print(json.dumps({'kind': kind, **data}, ensure_ascii=False), flush=True)


def setup(runtime):
    os.environ['HF_HOME'] = str(runtime / 'cache')
    os.environ['HF_HUB_DISABLE_SYMLINKS_WARNING'] = '1'
    os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'
    os.environ['DO_NOT_TRACK'] = '1'
    os.environ['TORCH_HOME'] = str(runtime / 'models')
    libraries = runtime / 'Lib' / 'site-packages' / 'torch' / 'lib'
    os.environ['PATH'] = str(libraries) + os.pathsep + os.environ.get('PATH', '')
    if os.name == 'nt' and libraries.is_dir():
        globals()['_dll_handle'] = os.add_dll_directory(str(libraries))


def vocal_model(runtime, download=False):
    import torch
    import numpy as np
    from demucs.htdemucs import HTDemucs
    from demucs.pretrained import REMOTE_ROOT, _parse_remote_files
    from demucs.states import load_model

    # The vocal specialist is the vocal-weighted member of the official htdemucs_ft bag.
    url = _parse_remote_files(REMOTE_ROOT / 'files.txt')['04573f0d']
    if not url.startswith('https://dl.fbaipublicfiles.com/demucs/'):
        raise RuntimeError('UNTRUSTED_MODEL')
    filename = url.rsplit('/', 1)[-1]
    checksum = filename.rsplit('-', 1)[-1].split('.')[0]
    directory = runtime / 'models' / 'demucs'
    directory.mkdir(parents=True, exist_ok=True)
    checkpoint = directory / filename
    if not checkpoint.is_file():
        if not download:
            raise RuntimeError('AI_FILES_MISSING')
        event('progress', value=0.05)
        torch.hub.download_url_to_file(url, str(checkpoint), hash_prefix=checksum)
    digest = hashlib.sha256(checkpoint.read_bytes()).hexdigest()
    if digest != 'f3cf25b222c4eed7cd49dd8b2c9597d50c18bd154090f7b919cfa5f93cf22c49':
        raise RuntimeError('MODEL_CHECKSUM_FAILED')
    with torch.serialization.safe_globals([HTDemucs, Fraction, np.dtype, np.core.multiarray.scalar, np.dtypes.Float64DType, np.dtypes.Float32DType, np.dtypes.Int64DType]):
        package = torch.load(checkpoint, map_location='cpu', weights_only=True)
    if package['klass'] is not HTDemucs:
        raise RuntimeError('UNTRUSTED_MODEL')
    model = load_model(package)
    model.eval()
    return model, digest


def prepare(runtime):
    import importlib.metadata
    from huggingface_hub import snapshot_download
    _, checksum = vocal_model(runtime, download=True)
    event('progress', value=0.25)
    repository = 'Systran/faster-whisper-large-v3'
    revision = 'edaa852ec7e145841d8ffdb056a99866b5f0a478'
    snapshot_download(repository, revision=revision, local_dir=str(runtime / 'models' / 'whisper-large-v3'), allow_patterns=['model.bin', 'config.json', 'tokenizer.json', 'vocabulary.json', 'preprocessor_config.json', 'README.md'])
    versions = {name: importlib.metadata.version(name) for name in ['torch', 'torchaudio', 'demucs', 'faster-whisper', 'ctranslate2', 'soundfile', 'numpy']}
    digest = hashlib.file_digest((runtime / 'models' / 'whisper-large-v3' / 'model.bin').open('rb'), 'sha256').hexdigest()
    manifest = {'separator': 'htdemucs_ft vocal specialist 04573f0d', 'separatorSHA256': checksum, 'transcriber': repository, 'transcriberRevision': revision, 'transcriberSHA256': digest, 'packages': versions}
    previous = runtime / 'models' / 'manifest.json'
    if previous.is_file():
        diarization = json.loads(previous.read_text(encoding='utf-8')).get('diarization')
        if diarization:
            manifest['diarization'] = diarization
    (runtime / 'models' / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    event('result', **manifest)


def separate(runtime, source, destination):
    import numpy as np
    import soundfile as sf
    import torch
    from demucs.apply import apply_model
    model, _ = vocal_model(runtime)
    data, sample_rate = sf.read(source, dtype='float32', always_2d=True)
    if sample_rate != 44100 or data.shape[1] != 2:
        raise RuntimeError('INVALID_AUDIO')
    mix = torch.from_numpy(data.T.copy())
    reference = mix.mean(0)
    mean, deviation = reference.mean(), reference.std()
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    torch.set_num_threads(min(6, max(1, os.cpu_count() or 1)))
    event('progress', value=0.08, device=device)
    if deviation < 1e-8:
        vocals = np.zeros_like(data)
    else:
        normalized = (mix - mean) / deviation
        try:
            with torch.inference_mode():
                result = apply_model(model, normalized[None], device=device, shifts=1, split=True, overlap=0.25, segment=7, progress=True)[0]
        except torch.cuda.OutOfMemoryError:
            device = 'cpu'
            model.cpu()
            torch.cuda.empty_cache()
            event('progress', value=0.08, device=device)
            with torch.inference_mode():
                result = apply_model(model, normalized[None], device='cpu', shifts=1, split=True, overlap=0.25, segment=7, progress=True)[0]
        vocals = (result[model.sources.index('vocals')].cpu() * deviation + mean).numpy().T
    instrumental = data - vocals
    peak = max(float(np.abs(vocals).max()), float(np.abs(instrumental).max()), 1e-8)
    scale = min(1.0, 0.98 / peak)
    destination.mkdir(parents=True, exist_ok=True)
    sf.write(destination / 'vocals.wav', vocals * scale, sample_rate, subtype='PCM_24')
    sf.write(destination / 'instrumental.wav', instrumental * scale, sample_rate, subtype='PCM_24')
    result = {'device': device, 'stemScale': scale, 'separator': 'htdemucs_ft vocal specialist', 'duration': len(data) / sample_rate}
    (destination / 'separation.json').write_text(json.dumps(result), encoding='utf-8')
    event('result', **result)


def transcribe(runtime, source, destination, language):
    import numpy as np
    import soundfile as sf
    import torch
    import torchaudio
    from faster_whisper import WhisperModel
    codes = {'auto': None, 'en': 'en', 'id': 'id', 'zh-CN': 'zh', 'ja': 'ja', 'ko': 'ko'}
    if language not in codes:
        raise RuntimeError('INVALID_VALUE')
    directory = runtime / 'models' / 'whisper-large-v3'
    if not (directory / 'model.bin').is_file():
        raise RuntimeError('AI_FILES_MISSING')
    samples, sample_rate = sf.read(source, dtype='float32', always_2d=True)
    mono = samples.mean(axis=1)
    duration = len(mono) / sample_rate
    if np.sqrt(np.mean(mono ** 2)) < 0.0005:
        result = {'language': codes[language] or 'en', 'segments': []}
    else:
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        model = WhisperModel(str(directory), device=device, compute_type='int8_float16' if device == 'cuda' else 'int8', cpu_threads=min(6, os.cpu_count() or 1), local_files_only=True)
        event('progress', value=0.06, device=device)
        audio = torchaudio.functional.resample(torch.from_numpy(mono), sample_rate, 16000).numpy()
        segments, info = model.transcribe(audio, language=codes[language], beam_size=5, word_timestamps=True, condition_on_previous_text=False, vad_filter=False, temperature=(0.0, 0.2, 0.4), hallucination_silence_threshold=2.0)
        lines = []
        for segment in segments:
            start, end = max(0.0, segment.start), min(duration, segment.end)
            if end <= start or not segment.text.strip():
                continue
            portion = mono[int(start * sample_rate):int(end * sample_rate)]
            if len(portion) == 0 or float(np.sqrt(np.mean(portion ** 2))) < 0.0005:
                continue
            words = [{'start': max(start, word.start), 'end': min(end, word.end), 'text': word.word, 'probability': word.probability} for word in segment.words or [] if word.end > word.start]
            lines.append({'start': start, 'end': end, 'text': segment.text.strip(), 'words': words, 'review': segment.avg_logprob < -0.8 or any(word['probability'] < 0.45 for word in words)})
            event('progress', value=min(0.98, end / duration))
        result = {'language': info.language, 'segments': lines}
    destination.write_text(json.dumps(result, ensure_ascii=False), encoding='utf-8')
    event('result', language=result['language'], lines=len(result['segments']))


def diarize(runtime, source, destination):
    import numpy as np
    import soundfile as sf
    import sherpa_onnx
    directory = runtime / 'models' / 'speakers'
    segmentation = directory / 'sherpa-onnx-pyannote-segmentation-3-0' / 'model.onnx'
    embedding = directory / 'wespeaker_en_voxceleb_resnet34_LM.onnx'
    if not segmentation.is_file() or not embedding.is_file():
        raise RuntimeError('AI_FILES_MISSING')
    samples, sample_rate = sf.read(source, dtype='float32', always_2d=True)
    if sample_rate != 16000:
        raise RuntimeError('INVALID_AUDIO')
    audio = np.ascontiguousarray(samples.mean(axis=1))
    config = sherpa_onnx.OfflineSpeakerDiarizationConfig(
        segmentation=sherpa_onnx.OfflineSpeakerSegmentationModelConfig(
            pyannote=sherpa_onnx.OfflineSpeakerSegmentationPyannoteModelConfig(model=str(segmentation), window_shift_ratio=0.1),
            num_threads=4, provider='cpu'),
        embedding=sherpa_onnx.SpeakerEmbeddingExtractorConfig(model=str(embedding), num_threads=4, provider='cpu'),
        clustering=sherpa_onnx.FastClusteringConfig(num_clusters=-1, threshold=0.33),
        min_duration_on=0.3, min_duration_off=0.3)
    if not config.validate():
        raise RuntimeError('AI_FILES_MISSING')
    engine = sherpa_onnx.OfflineSpeakerDiarization(config)
    def progress(processed, total):
        event('progress', value=min(0.65, processed / max(1, total) * .65))
        return 0
    result = engine.process(audio, callback=progress).sort_by_start_time()
    labels, turns = {}, []
    duration = len(audio) / sample_rate
    for turn in result:
        start, end = max(0.0, float(turn.start)), min(duration, float(turn.end))
        if end - start < 0.15:
            continue
        if turn.speaker not in labels:
            labels[turn.speaker] = len(labels) + 1
        turns.append({'start': start, 'end': end, 'speaker': labels[turn.speaker]})
    from speaker_boundaries import local_changes
    changes = local_changes(audio, segmentation, lambda value: event('progress', value=.65 + value * .3)) if turns else []
    destination.write_text(json.dumps({'turns': turns, 'speakerCount': len(labels), 'changes': changes}, indent=2), encoding='utf-8')
    event('result', speakerCount=len(labels), turns=len(turns))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('task', choices=['prepare', 'separate', 'transcribe', 'diarize', 'zip', 'romanize'])
    parser.add_argument('--runtime', type=Path, required=True)
    parser.add_argument('--source', type=Path)
    parser.add_argument('--destination', type=Path)
    parser.add_argument('--language', default='auto')
    parser.add_argument('--files', nargs='*', type=Path)
    args = parser.parse_args()
    args.runtime = args.runtime.resolve()
    setup(args.runtime)
    if args.task == 'prepare':
        prepare(args.runtime)
    elif args.task == 'separate':
        separate(args.runtime, args.source, args.destination)
    elif args.task == 'transcribe':
        transcribe(args.runtime, args.source, args.destination, args.language)
    elif args.task == 'diarize':
        diarize(args.runtime, args.source, args.destination)
    elif args.task == 'romanize':
        from lyric_reading import romanize_document
        if args.language not in ('auto', 'en', 'id', 'ja', 'ko', 'zh-CN'):
            raise RuntimeError('INVALID_VALUE')
        document = json.loads(args.source.read_text(encoding='utf-8'))
        args.destination.write_text(json.dumps(romanize_document(document, args.language), ensure_ascii=False), encoding='utf-8')
        event('result', lines=len(document['segments']))
    else:
        with zipfile.ZipFile(args.destination, 'w', compression=zipfile.ZIP_STORED) as archive:
            for file in args.files:
                archive.write(file, arcname=file.name)
        event('result', files=len(args.files))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        event('error', message=str(error))
        raise
