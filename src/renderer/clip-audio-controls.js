const clipAudioTools = window.aerodubClipAudio;
let proInspectorTab = 'audio', proEqContext;
const audioLabels = { gainDb: 'voiceGain', pitch: 'voicePitch', pan: 'clipPan', bass: 'voiceBass', lowMid: 'eqLowMid', mid: 'eqMid', highMid: 'eqPresence', treble: 'voiceTreble' };
function audioValue(key, value) {
  if (key === 'pan') return value === 0 ? t('panCenter') : `${t(value < 0 ? 'panLeft' : 'panRight')} ${Math.round(Math.abs(value) * 100)}%`;
  return `${value > 0 ? '+' : ''}${value} ${key === 'pitch' ? t('semitones') : 'dB'}`;
}
for (const key of ['gainDb', 'pitch', 'pan', ...clipAudioTools.bands.map(band => band.key)]) {
  const label = document.createElement('label'); label.className = 'pro-fx-control';
  const title = document.createElement('span'); title.dataset.i18n = audioLabels[key];
  const output = document.createElement('output'); output.id = `pro-fx-${key}-value`;
  const input = document.createElement('input'); input.type = 'range'; input.id = `pro-fx-${key}`; input.min = clipAudioTools.limits[key][0]; input.max = clipAudioTools.limits[key][1]; input.step = key === 'pan' ? '.05' : key === 'pitch' ? '.5' : '1'; input.value = '0';
  label.append(title, output, input); $(['gainDb', 'pitch', 'pan'].includes(key) ? 'pro-audio-basic' : 'pro-eq-bands').append(label);
  input.oninput = () => { output.value = audioValue(key, Number(input.value)); drawClipEQ(readClipEffects()); };
  input.onchange = () => saveClipEffects();
}
function readClipEffects() {
  const value = clipAudioTools.validate(proSelectedClip()?.effects);
  for (const key of Object.keys(audioLabels)) value[key] = Number($(`pro-fx-${key}`).value);
  for (const key of ['highpass', 'denoise', 'compress']) value[key] = $(`pro-fx-${key}`).checked;
  value.fadeIn = Number($('pro-fade-in').value); value.fadeOut = Number($('pro-fade-out').value); value.channel = $('pro-channel').value;
  return clipAudioTools.validate(value);
}
function saveClipEffects() {
  const clip = proSelectedClip(); if (!clip || proSelection.track === 'video') return;
  try {
    const effects = readClipEffects(), track = proSelection.track;
    proSave(() => writeProClip(track, { ...clip, effects }));
  } catch (error) { showError(error); renderClipAudioControls(clip); }
}
function setProInspectorTab(tab, update = true) {
  proInspectorTab = tab;
  if (!update) return;
  const video = proSelection?.track === 'video'; if (video) proInspectorTab = 'timing';
  for (const key of ['timing', 'audio']) {
    const selected = proInspectorTab === key;
    $(`pro-${key}-panel`).hidden = !selected;
    $(`pro-tab-${key}`).setAttribute('aria-selected', String(selected)); $(`pro-tab-${key}`).tabIndex = selected ? 0 : -1;
  }
  $('pro-tab-audio').hidden = video;
  if (proInspectorTab === 'audio') drawClipEQ(readClipEffects());
}
for (const tab of ['timing', 'audio']) {
  $(`pro-tab-${tab}`).onclick = () => setProInspectorTab(tab);
  $(`pro-tab-${tab}`).onkeydown = event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) && proSelection?.track !== 'video') { event.preventDefault(); const next = ['ArrowRight', 'End'].includes(event.key) ? 'audio' : 'timing'; setProInspectorTab(next); $(`pro-tab-${next}`).focus(); } };
}
function renderClipAudioControls(clip) {
  const effects = clipAudioTools.validate(clip.effects);
  for (const key of Object.keys(audioLabels)) { $(`pro-fx-${key}`).value = effects[key]; $(`pro-fx-${key}-value`).value = audioValue(key, effects[key]); }
  for (const key of ['highpass', 'denoise', 'compress']) $(`pro-fx-${key}`).checked = effects[key];
  $('pro-fade-in').value = effects.fadeIn; $('pro-fade-out').value = effects.fadeOut; $('pro-channel').value = effects.channel;
  $('pro-clean').checked = effects.cleanup === 'clean' || (effects.cleanup === 'inherit' && clip.clean);
  $('pro-inspector').querySelector('[role=tablist]').setAttribute('aria-label', t('clipDetails'));
  setProInspectorTab(proInspectorTab); drawClipEQ(effects);
}
for (const id of ['pro-channel', 'pro-fade-in', 'pro-fade-out', 'pro-fx-highpass', 'pro-fx-denoise', 'pro-fx-compress']) $(id).onchange = saveClipEffects;
$('pro-audio-reset').onclick = () => {
  const clip = proSelectedClip(); if (!clip) return;
  proSave(() => writeProClip(proSelection.track, { ...clip, gain: 1, effects: { ...clipAudioTools.defaults } }));
};
function drawClipEQ(effects) {
  const canvas = $('pro-eq-graph'), width = canvas.clientWidth, height = 135;
  if (!width || proInspectorTab !== 'audio') return;
  const dpr = window.devicePixelRatio || 1; canvas.width = Math.round(width * dpr); canvas.height = height * dpr;
  const context = canvas.getContext('2d'); context.setTransform(dpr, 0, 0, dpr, 0, 0);
  const left = 27, top = 10, bottom = 22, plotWidth = width - left - 10, plotHeight = height - top - bottom;
  const xFor = frequency => left + Math.log(frequency / 20) / Math.log(1000) * plotWidth;
  const yFor = db => top + (24 - Math.max(-24, Math.min(24, db))) / 48 * plotHeight;
  context.fillStyle = '#eff7fc'; context.fillRect(0, 0, width, height); context.font = '10px Segoe UI';
  for (const db of [-24, -12, 0, 12, 24]) {
    const y = yFor(db); context.strokeStyle = db ? '#d2e2ed' : '#94b2c6'; context.beginPath(); context.moveTo(left, y); context.lineTo(width - 8, y); context.stroke(); context.fillStyle = '#415f73'; context.fillText(String(db), 2, y + 3);
  }
  for (const frequency of [50, 200, 1000, 5000, 20000]) { const x = xFor(frequency); context.fillStyle = '#415f73'; context.fillText(frequency >= 1000 ? `${frequency / 1000}k` : String(frequency), Math.min(width - 24, x - 7), height - 5); }
  proEqContext ||= new OfflineAudioContext(1, 1, 48000);
  const frequencies = Float32Array.from({ length: 160 }, (_, index) => 20 * 1000 ** (index / 159)), magnitudes = new Float32Array(160), phases = new Float32Array(160), dbValues = new Float32Array(160);
  const specs = [...clipAudioTools.bands, ...(effects.highpass ? [{ key: null, type: 'highpass', frequency: 80 }] : [])];
  for (const spec of specs) {
    const filter = proEqContext.createBiquadFilter(); filter.type = spec.type; filter.frequency.value = spec.frequency; filter.Q.value = spec.type === 'peaking' ? 1 : Math.SQRT1_2; filter.gain.value = spec.key ? effects[spec.key] : 0;
    filter.getFrequencyResponse(frequencies, magnitudes, phases);
    for (let i = 0; i < 160; i++) dbValues[i] += 20 * Math.log10(Math.max(1e-8, magnitudes[i])); filter.disconnect();
  }
  context.strokeStyle = '#0b789f'; context.lineWidth = 2; context.beginPath();
  for (let i = 0; i < frequencies.length; i++) { const x = xFor(frequencies[i]), y = yFor(dbValues[i]); if (i) context.lineTo(x, y); else context.moveTo(x, y); } context.stroke();
  canvas.setAttribute('aria-label', `${t('eqResponse')}: ${clipAudioTools.bands.map(band => `${band.frequency} Hz ${effects[band.key]} dB`).join(', ')}`);
}
const fullscreen = document.createElement('button'); fullscreen.id = 'pro-fullscreen'; fullscreen.hidden = true; fullscreen.dataset.i18n = 'fullscreenPreview'; $('clock').before(fullscreen);
const fullscreenSeek = document.createElement('input'); fullscreenSeek.id = 'pro-preview-seek'; fullscreenSeek.type = 'range'; fullscreenSeek.min = 0; fullscreenSeek.max = 1; fullscreenSeek.step = '.01'; fullscreenSeek.setAttribute('aria-label', t('position')); $('clock').after(fullscreenSeek);
fullscreenSeek.oninput = () => { if (!project || proBlocked()) return; if (auditionStart !== null) stopPlayback(); $('video').currentTime = Number(fullscreenSeek.value); if (!audio.paused) audio.currentTime = $('video').currentTime; draw(); };
fullscreen.onclick = async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.querySelector('.preview-panel').requestFullscreen(); }
  catch { showError(new Error('fullscreenError')); }
};
document.addEventListener('fullscreenchange', () => { fullscreen.dataset.i18n = document.fullscreenElement ? 'exitFullscreen' : 'fullscreenPreview'; fullscreen.textContent = t(fullscreen.dataset.i18n); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && document.fullscreenElement) document.exitFullscreen().catch(showError); }, true);
new ResizeObserver(() => { if (proSelectedClip() && proActive()) drawClipEQ(readClipEffects()); }).observe($('pro-inspector'));
