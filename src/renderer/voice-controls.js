let voiceSettings = { ...window.aerodubVoiceConfig.defaults };
const voiceSessions = new Set();
function voiceSettingsSnapshot() { return { ...voiceSettings }; }
function voiceControls() { for (const input of document.querySelectorAll('.voice-control input, #voice-reset, #auto-input-level')) input.disabled = busy || saving || recording; $('voice-monitor').disabled = busy || saving; }
function renderVoiceControls() {
  for (const [key, value] of Object.entries(voiceSettings)) {
    $('voice-' + key).value = value;
    $('voice-' + key + '-value').value = key === 'volume' ? `${Math.round(value * 100)}%` : `${value > 0 ? '+' : ''}${value} ${key === 'pitch' ? t('semitones') : 'dB'}`;
  }
}
function setupVoiceControls(value) {
  voiceSettings = window.aerodubVoiceConfig.validate(value || window.aerodubVoiceConfig.defaults); renderVoiceControls();
  $('auto-input-level').onchange = () => action(async () => { await preferences(); if (stream) await enableMic(); });
  for (const key of Object.keys(voiceSettings)) {
    $('voice-' + key).oninput = () => { voiceSettings[key] = Number($('voice-' + key).value); renderVoiceControls(); for (const session of voiceSessions) session.update(); };
    $('voice-' + key).onchange = () => preferences().catch(showError);
  }
  $('voice-reset').onclick = () => { voiceSettings = { ...window.aerodubVoiceConfig.defaults }; renderVoiceControls(); for (const session of voiceSessions) session.update(); preferences().catch(showError); };
  $('voice-monitor').onchange = async () => {
    try { if ($('voice-monitor').checked && !voiceSessions.size) await action(enableMic); if (!voiceSessions.size) $('voice-monitor').checked = false; for (const session of voiceSessions) session.update(); }
    catch (error) { $('voice-monitor').checked = false; showError(new Error('micError')); }
  };
}
async function createVoiceSession(rawStream, context = new AudioContext()) {
  const ownsContext = context !== songContext;
  try { await context.audioWorklet.addModule('vendor/soundtouch-processor.js'); } catch (error) { if (ownsContext) await context.close(); throw error; }
  const source = context.createMediaStreamSource(rawStream), bass = context.createBiquadFilter(), treble = context.createBiquadFilter();
  bass.type = 'lowshelf'; bass.frequency.value = 200; treble.type = 'highshelf'; treble.frequency.value = 4000;
  const gain = context.createGain(), direct = context.createGain(), shifted = context.createGain(), pitch = new AudioWorkletNode(context, 'soundtouch-processor', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2] });
  pitch.port.postMessage({ type: 'set-stretch-parameters', params: { sequenceMs: 32, seekWindowMs: 8, overlapMs: 8 } });
  const limiter = context.createDynamicsCompressor(), analyser = context.createAnalyser(), monitor = context.createGain();
  limiter.threshold.value = -1; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = .001; limiter.release.value = .08; analyser.fftSize = 1024;
  source.connect(bass); bass.connect(treble); treble.connect(gain); gain.connect(direct); direct.connect(limiter); gain.connect(pitch); pitch.connect(shifted); shifted.connect(limiter); limiter.connect(analyser); analyser.connect(monitor); monitor.connect(context.destination);
  const session = { context, analyser, rawStream, update() {
    const at = context.currentTime;
    bass.gain.setTargetAtTime(voiceSettings.bass, at, .02); treble.gain.setTargetAtTime(voiceSettings.treble, at, .02);
    gain.gain.setTargetAtTime(voiceSettings.volume * 10 ** (voiceSettings.gainDb / 20), at, .02);
    pitch.parameters.get('pitchSemitones').setValueAtTime(voiceSettings.pitch, at);
    direct.gain.setTargetAtTime(voiceSettings.pitch ? 0 : 1, at, .02); shifted.gain.setTargetAtTime(voiceSettings.pitch ? 1 : 0, at, .02);
    monitor.gain.setTargetAtTime($('voice-monitor').checked ? 1 : 0, at, .02);
  }, async close() { for (const node of [source, bass, treble, gain, direct, shifted, pitch, limiter, analyser, monitor]) node.disconnect(); pitch.port.close(); voiceSessions.delete(session); if (ownsContext && context.state !== 'closed') await context.close(); } };
  monitor.gain.value = 0; session.update(); voiceSessions.add(session); await context.resume(); return session;
}
