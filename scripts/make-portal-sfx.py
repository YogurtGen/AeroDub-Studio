import array
import math
import random
import wave
from pathlib import Path

rate = 48000
duration = 1.8
rng = random.Random(17)
samples = []
noise = 0.0
phase = 0.0
for index in range(int(rate * duration)):
    t = index / rate
    noise += 0.03 * (rng.uniform(-1, 1) - noise)
    opening = math.sin(math.pi * min(1, t / 0.95)) ** 2 if t < 0.95 else 0
    phase += 2 * math.pi * (90 + 250 * min(t / 0.8, 1) ** 1.7) / rate
    value = opening * (0.035 * math.sin(phase + 0.2 * math.sin(2 * math.pi * 4 * t)) + 0.12 * noise)
    for start, frequency in [(0.34, 261.63), (0.46, 329.63), (0.58, 392.00), (0.7, 523.25)]:
        age = t - start
        if age >= 0:
            envelope = (1 - math.exp(-age * 35)) * math.exp(-age * 3.7)
            value += 0.08 * envelope * (math.sin(2 * math.pi * frequency * age) + 0.07 * math.sin(2 * math.pi * frequency * 2.01 * age))
    value *= min(1, t / 0.025) * min(1, (duration - t) / 0.25)
    samples.append(value)
stereo = array.array('h')
peak = max(abs(v) for v in samples)
for index, value in enumerate(samples):
    left = value + (samples[index - 5100] * 0.19 if index >= 5100 else 0)
    right = value + (samples[index - 6900] * 0.17 if index >= 6900 else 0)
    for channel in (left, right):
        stereo.append(round(max(-0.9, min(0.9, channel * 0.28 / peak)) * 32767))
destination = Path(__file__).resolve().parents[1] / 'src' / 'renderer' / 'portal-soft.wav'
with wave.open(str(destination), 'wb') as output:
    output.setnchannels(2)
    output.setsampwidth(2)
    output.setframerate(rate)
    output.writeframes(stereo.tobytes())
print(f'Portal preview: {destination} | {duration}s stereo, peak below -9dBFS')
