const voiceDefaults = Object.freeze({ volume: 1, gainDb: 0, bass: 0, treble: 0, pitch: 0 });
const voiceLimits = { volume: [0, 4], gainDb: [-24, 24], bass: [-12, 12], treble: [-12, 12], pitch: [-12, 12] };
function validateVoice(value = voiceDefaults) {
  if (!value || typeof value !== 'object') throw new Error('INVALID_VALUE');
  const result = {};
  for (const [key, [min, max]] of Object.entries(voiceLimits)) {
    const number = value[key];
    if (!Number.isFinite(number) || number < min || number > max) throw new Error('INVALID_VALUE');
    result[key] = number;
  }
  return result;
}
function voiceFilter(value = voiceDefaults) {
  const voice = validateVoice(value), filters = [];
  if (voice.bass) filters.push(`bass=g=${voice.bass}:f=200`);
  if (voice.treble) filters.push(`treble=g=${voice.treble}:f=4000`);
  const gain = voice.volume * 10 ** (voice.gainDb / 20);
  if (gain !== 1) filters.push(`volume=${gain}`);
  if (voice.pitch) { const ratio = 2 ** (voice.pitch / 12); filters.push(`asetrate=${48000 * ratio}`, 'aresample=48000', `atempo=${1 / ratio}`); }
  if (filters.length) filters.push('alimiter=limit=0.95:level=false:latency=true');
  return filters.join(',');
}
function captureConstraints(deviceId, clean, autoLevel) {
  return { audio: { deviceId: deviceId ? { exact: deviceId } : undefined, channelCount: 1, noiseSuppression: clean, echoCancellation: false, autoGainControl: autoLevel }, video: false };
}
const voiceConfig = { defaults: voiceDefaults, limits: voiceLimits, validate: validateVoice, filter: voiceFilter, captureConstraints };
if (typeof module !== 'undefined' && module.exports) module.exports = voiceConfig;
else window.aerodubVoiceConfig = voiceConfig;
