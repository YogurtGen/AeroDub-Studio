import numpy as np
import onnxruntime as ort


def local_changes(audio, model_path, on_progress=None):
    options = ort.SessionOptions()
    options.intra_op_num_threads = 4
    options.inter_op_num_threads = 1
    model = ort.InferenceSession(str(model_path), sess_options=options, providers=['CPUExecutionProvider'])
    metadata = model.get_modelmeta().custom_metadata_map
    rate, size = int(metadata['sample_rate']), int(metadata['window_size'])
    frame_step = int(metadata['receptive_field_shift']) / rate
    frame_offset = int(metadata['receptive_field_size']) / rate / 2
    votes = []
    starts = range(0, max(1, len(audio) - rate // 2), rate)
    for index, start in enumerate(starts):
        samples = audio[start:start + size]
        if len(samples) < size:
            samples = np.pad(samples, (0, size - len(samples)))
        scores = model.run(None, {model.get_inputs()[0].name: samples.reshape(1, 1, -1)})[0][0]
        classes = scores.argmax(axis=1)
        classes[np.exp(scores.max(axis=1)) < .65] = 0
        groups, begin = [], 0
        for end in range(1, len(classes) + 1):
            if end == len(classes) or classes[end] != classes[begin]:
                label = int(classes[begin])
                if label in (1, 2, 3) and (end - begin) * frame_step >= .25:
                    groups.append((label, start / rate + frame_offset + begin * frame_step, start / rate + frame_offset + end * frame_step))
                begin = end
        for previous, current in zip(groups, groups[1:]):
            if previous[0] != current[0] and 0 <= current[1] - previous[2] <= 1.2:
                point = (previous[2] + current[1]) / 2
                if .2 < point < len(audio) / rate - .2:
                    votes.append((point, index))
        if on_progress:
            on_progress((index + 1) / len(starts))
    clusters = []
    for point, window in sorted(votes):
        if clusters and point - np.median([value[0] for value in clusters[-1]]) < .2:
            clusters[-1].append((point, window))
        else:
            clusters.append([(point, window)])
    return [{'time': float(np.median([point for point, _ in cluster])), 'votes': len(set(window for _, window in cluster))} for cluster in clusters if len(set(window for _, window in cluster)) >= 3]
