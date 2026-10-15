let songData = null, songLanguage = 'auto', songDirty = false;
let songContext, songMaster, songAnalyser, songInstrumentGain, songVoiceGain, songSources = [];
let songPlaying = false, songOffset = 0, songStartedAt = 0, songRaf = 0, songOwnVoice = false, lyricIndex = -2;
let singStream, singVoiceSession, singRecorder, singInfo, countdownUntil = 0;
async function releaseSingMic() { singRecorder?.close(); singRecorder = null; singStream?.getTracks().forEach(track => track.stop()); singStream = null; if (singVoiceSession) await singVoiceSession.close(); singVoiceSession = null; }
const songBuffers = new Map();
const portalAudio = new Audio('portal-soft.wav'); portalAudio.volume = 0.7;

function musicControls() {
  const blocked = busy || saving || recording;
  $('music-upload-home').disabled = blocked || !musicReady;
  for (const id of ['song-new', 'song-play', 'song-seek', 'stem-selection', 'stem-format', 'stem-export', 'song-language-toggle', 'song-transcribe', 'song-sing', 'lyrics-add', 'lyrics-save', 'sing-back', 'sing-play', 'sing-seek', 'song-instrumental-gain', 'song-vocal-gain']) $(id).disabled = !songData || blocked;
  for (const node of document.querySelectorAll('#lyrics-lines input, #lyrics-lines textarea, #lyrics-lines button, #song-language-options button, #song-takes-list input')) node.disabled = blocked;
  $('sing-record').disabled = !songData || blocked;
  $('sing-record').hidden = recording; $('sing-stop').hidden = !recording; $('sing-stop').disabled = busy || saving;
  $('sing-original').disabled = !songData || busy || saving || songOwnVoice;
  $('sing-clean').disabled = blocked;
  $('sing-lyric-offset').disabled = !songData || blocked;
  $('sing-take-offset').disabled = !songData?.selectedTake || blocked;
  $('sing-sync-reset').disabled = !songData || blocked;
  for (const id of ['lyrics-display', 'sing-lyrics-display', 'lyrics-readings']) $(id).disabled = !songData || blocked;
  $('lyrics-readings').disabled ||= !songData?.lyrics.segments.some(line => line.text.trim());
  for (const id of ['sing-listen-take', 'sing-export-cover']) $(id).disabled = !songData?.selectedTake || blocked;
  $('sing-original-stems').disabled = !songData || blocked;
  $('sing-play').textContent = t(songPlaying ? 'songPause' : 'songPlay');
  $('song-play-label').textContent = t(songPlaying ? 'previewPause' : 'previewPlay'); $('song-play').classList.toggle('is-playing', songPlaying);
  renderStemPreview();
  $('sing-record').textContent = t(songData?.takes.length ? 'songRetake' : 'songRecord');
}
function translateMusic() {
  renderSongLanguage();
  for (const id of ['song-seek', 'sing-seek']) $(id).setAttribute('aria-label', t('songPosition'));
  if (songData) { renderLyricsEditor(); renderSongTakes(); lyricIndex = -2; drawSongWave(); updateSongClock(); }
  renderSongTiming(); musicControls();
}
function closeSongLanguage() { $('song-language-options').hidden = true; $('song-language-toggle').setAttribute('aria-expanded', 'false'); }
function renderSongLanguage() {
  const names = { auto: t('autoLanguage'), ...languageNames };
  $('song-language-name').textContent = names[songLanguage]; $('song-language-options').replaceChildren();
  for (const [code, name] of Object.entries(names)) {
    const option = document.createElement('button'); option.className = 'language-option'; option.dataset.songLanguage = code; option.setAttribute('role', 'option'); option.setAttribute('aria-selected', String(code === songLanguage));
    const label = document.createElement('span'); label.textContent = name; if (code !== 'auto') label.lang = code;
    const abbreviation = document.createElement('small'); abbreviation.textContent = code === 'auto' ? '' : code.split('-')[0].toUpperCase(); abbreviation.setAttribute('aria-hidden', 'true'); option.append(label, abbreviation);
    option.onclick = () => { songLanguage = code; closeSongLanguage(); renderSongLanguage(); $('song-language-toggle').focus(); }; $('song-language-options').append(option);
  }
}
async function loadSong(data) {
  await closeMusicSession(); await disableMic(); releaseMedia(); project = null;
  songData = data; songDirty = false; songOwnVoice = false; songOffset = 0; lyricIndex = -2; songBuffers.clear();
  songLanguage = data.readingLanguage || data.lyrics?.language || 'auto'; $('song-name').textContent = $('sing-song-name').textContent = data.name; $('song-duration').textContent = time(data.duration);
  $('sing-original').checked = true; selectStemPreview('instrumental');
  $('sing-clean').checked = $('clean').checked;
  for (const [id, key] of [['song-instrumental-gain', 'instrumentalGain'], ['song-vocal-gain', 'vocalGain']]) { $(id).value = data[key]; $(id + '-value').value = `${Math.round(data[key] * 100)}%`; }
  for (const id of ['song-seek', 'sing-seek']) $(id).max = data.duration;
  setMode('music'); renderSongLanguage(); renderLyricsEditor(); renderSongTakes(); drawSongWave(); updateSongClock(); status('splitReady'); window.scrollTo(0, 0);
}
function clearSong() { stopSongPlayback(false); songData = null; songDirty = false; songBuffers.clear(); lyricIndex = -2; closeSongLanguage(); }
async function closeMusicSession() {
  if (songData && songDirty) await saveSongEdits();
  portalAudio.pause();
  stopSongPlayback(); closeSongLanguage();
  await releaseSingMic();
  if (songContext) await songContext.close(); songContext = null; songMaster = null; songAnalyser = null; songBuffers.clear();
}
function songSnapshot() { return { id: songData.id, lyrics: songData.lyrics, lyricDisplay: songData.lyricDisplay || 'original', lyricOffset: songData.lyricOffset || 0, takeOffsets: songData.takes.map(take => ({ id: take.id, offset: take.offset || 0 })), selectedTake: songData.selectedTake, instrumentalGain: songData.instrumentalGain, vocalGain: songData.vocalGain }; }
async function saveSongEdits() {
  if (!songData) return;
  songData = await api.updateSong(songSnapshot()); songDirty = false; renderLyricsEditor(); renderSongTakes(); lyricIndex = -2;
}
async function transcribeCurrentSong(confirm = true) {
  if (confirm && songData.lyrics.segments.length && !window.confirm(t('replaceLyrics'))) return false;
  stopSongPlayback(); await saveSongEdits(); songData = await api.transcribeSong(songLanguage); songDirty = false;
  renderLyricsEditor(); lyricIndex = -2; status(songData.lyrics.segments.length ? 'lyricsReady' : 'lyricsNone'); return true;
}
function renderLyricsEditor() {
  for (const id of ['lyrics-display', 'sing-lyrics-display']) $(id).value = songData?.lyricDisplay || 'original';
  $('lyrics-lines').replaceChildren(); $('lyrics-empty').hidden = Boolean(songData?.lyrics.segments.length);
  for (const line of songData?.lyrics.segments || []) {
    const row = document.createElement('article'); row.className = 'lyric-row'; row.dataset.lineId = line.id;
    const timing = document.createElement('div'); timing.className = 'lyric-timing';
    for (const [key, property] of [['lineStart', 'start'], ['lineEnd', 'end']]) {
      const label = document.createElement('label'); const text = document.createElement('span'); text.textContent = t(key);
      const input = document.createElement('input'); input.type = 'number'; input.min = 0; input.max = songData.duration; input.step = 0.01; input.value = line[property].toFixed(2); input.dataset.timing = property;
      input.onchange = () => { const value = Number(input.value); if (!input.validity.valid || !Number.isFinite(value) || (property === 'start' ? value >= line.end : value <= line.start)) { showError(new Error('INVALID_VALUE')); input.value = line[property].toFixed(2); return; } line[property] = value; songDirty = true; lyricIndex = -2; };
      label.append(text, input); timing.append(label);
    }
    const label = document.createElement('label'); label.className = 'lyric-text'; const text = document.createElement('span'); text.className = 'sr-only'; text.textContent = t('lineText');
    const field = document.createElement('textarea'); field.rows = 2; field.maxLength = 2000; field.value = line.text; field.onchange = () => { if (line.text !== field.value) { delete line.reading; const input = row.querySelector('.reading-input'); if (input) input.value = ''; } line.text = field.value; songDirty = true; lyricIndex = -2; }; label.append(text, field);
    const remove = document.createElement('button'); remove.className = 'lyric-remove'; remove.textContent = t('lineRemove'); remove.onclick = () => { songData.lyrics.segments = songData.lyrics.segments.filter(item => item.id !== line.id); songDirty = true; lyricIndex = -2; renderLyricsEditor(); };
    const preview = document.createElement('button'); preview.textContent = t('previewLyricLine'); preview.setAttribute('aria-label', `${t('previewLyricLine')}: ${line.text}`); preview.onclick = () => action(async () => { await saveSongEdits(); await playSong(Math.max(0, line.start + (songData.lyricOffset || 0) - .5)); });
    const actions = document.createElement('div'); actions.className = 'lyric-actions'; actions.append(preview, remove);
    row.append(timing, label, actions);
    if (line.reading || /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(line.text)) {
      const editor = document.createElement('div'); editor.className = 'lyric-reading-editor';
      const readingLabel = document.createElement('label'), caption = document.createElement('span'); caption.textContent = t('latinReading');
      const input = document.createElement('input'); input.type = 'text'; input.className = 'reading-input'; input.maxLength = 32000; input.value = line.reading?.text || ''; input.placeholder = t('readingPlaceholder');
      input.onchange = () => { if (input.value !== line.reading?.text) { line.reading = { text: input.value, sourceText: line.text, manual: true }; songDirty = true; lyricIndex = -2; } };
      readingLabel.append(caption, input); editor.append(readingLabel);
      if (line.reading?.manual) { const reset = document.createElement('button'); reset.textContent = t('automaticReading'); reset.onclick = () => action(async () => { delete line.reading; songDirty = true; await generateSongReadings(); }); editor.append(reset); }
      row.append(editor);
    }
    if (line.review || line.timingEstimated) { const note = document.createElement('p'); note.className = 'hint lyric-note'; note.textContent = t(line.review ? 'reviewLine' : 'timingEdited'); row.append(note); }
    $('lyrics-lines').append(row);
  }
  musicControls();
}
function renderSongTakes() {
  renderSongTiming();
  $('song-takes-list').replaceChildren();
  for (const take of songData?.takes || []) {
    const label = document.createElement('label'); label.className = 'check'; const choice = document.createElement('input'); choice.type = 'radio'; choice.name = 'song-take'; choice.value = take.id; choice.checked = take.id === songData.selectedTake;
    choice.onchange = () => action(async () => { stopSongPlayback(); songData.selectedTake = take.id; songDirty = true; songOwnVoice = true; await saveSongEdits(); });
    const text = document.createElement('span'); text.textContent = `${t('songTake')} ${take.name} · ${time(take.duration)}`; label.append(choice, text); $('song-takes-list').append(label);
  }
  musicControls();
}
function renderSongTiming() {
  $('sing-lyric-offset').value = Math.round((songData?.lyricOffset || 0) * 1000);
  $('sing-take-offset').value = Math.round((songData?.takes.find(take => take.id === songData.selectedTake)?.offset || 0) * 1000);
}
async function ensureSongContext() {
  if (!songContext) {
    songContext = new AudioContext({ latencyHint: 'interactive', sampleRate: 48000 }); songInstrumentGain = songContext.createGain(); songVoiceGain = songContext.createGain();
    songMaster = songContext.createDynamicsCompressor(); songMaster.threshold.value = -4; songMaster.knee.value = 6; songMaster.ratio.value = 12; songMaster.attack.value = 0.003; songMaster.release.value = 0.15;
    songAnalyser = songContext.createAnalyser(); songAnalyser.fftSize = 512; songAnalyser.smoothingTimeConstant = 0.86;
    songInstrumentGain.connect(songMaster); songVoiceGain.connect(songMaster); songMaster.connect(songAnalyser); songAnalyser.connect(songContext.destination);
  }
  await songContext.resume();
}
async function songBuffer(url) {
  if (!songBuffers.has(url)) songBuffers.set(url, (async () => { const response = await fetch(url); if (!response.ok) throw new Error('audioError'); return songContext.decodeAudioData(await response.arrayBuffer()); })());
  return songBuffers.get(url);
}
function songPosition() {
  if (!songPlaying || !songContext) return songOffset;
  const clock = window.aerodubSongTiming.outputClock(songContext, performance.now());
  return Math.max(0, Math.min(songData.duration, songOffset + clock - songStartedAt));
}
function stopSongPlayback(keepPosition = true) {
  if (songData && keepPosition) songOffset = songPosition();
  songPlaying = false;
  for (const source of songSources) { source.onended = null; try { source.stop(); } catch {} source.disconnect(); }
  songSources = []; cancelAnimationFrame(songRaf); songRaf = 0;
  if (songData) { updateSongClock(); musicControls(); }
}
function renderStemPreview() {
  for (const button of document.querySelectorAll('[data-stem-preview]')) { button.setAttribute('aria-pressed', String(button.dataset.stemPreview === $('stem-selection').value)); button.disabled = !songData || busy || saving || recording; }
}
function selectStemPreview(selection) {
  if (!['instrumental', 'vocals', 'both'].includes(selection)) return;
  $('stem-selection').value = selection; renderStemPreview(); updateSongGains();
}
function updateSongGains() {
  if (!songContext || !songData) return;
  const preview = mode === 'music', selection = $('stem-selection').value;
  songInstrumentGain.gain.setTargetAtTime(preview ? selection === 'vocals' ? 0 : 1 : songData.instrumentalGain, songContext.currentTime, 0.035);
  songVoiceGain.gain.setTargetAtTime(preview ? selection === 'instrumental' ? 0 : 1 : songOwnVoice ? songData.vocalGain : $('sing-original').checked ? 1 : 0, songContext.currentTime, 0.035);
}
async function playSong(offset = songOffset) {
  stopSongPlayback(false); await ensureSongContext();
  const voice = mode === 'sing' && songOwnVoice ? songData.takes.find(take => take.id === songData.selectedTake)?.audioURL : songData.vocalsURL;
  const buffers = await Promise.all([songBuffer(songData.instrumentalURL), songBuffer(voice || songData.vocalsURL)]);
  songOffset = Math.max(0, Math.min(offset >= songData.duration - 0.05 ? 0 : offset, songData.duration));
  songStartedAt = songContext.currentTime + 0.05; songPlaying = true;
  updateSongGains();
  buffers.forEach((buffer, index) => {
    const source = songContext.createBufferSource(); source.buffer = buffer; source.connect(index === 0 ? songInstrumentGain : songVoiceGain);
    const shift = index === 1 && mode === 'sing' && songOwnVoice ? songData.takes.find(take => take.id === songData.selectedTake)?.offset || 0 : 0, from = Math.max(0, songOffset - shift);
    if (from < buffer.duration) { source.start(songStartedAt + Math.max(0, shift - songOffset), from); source.stop(songStartedAt + songData.duration - songOffset); }
    songSources.push(source);
  });
  musicControls(); songRaf = requestAnimationFrame(songFrame); return songStartedAt;
}
function updateSongClock() {
  if (!songData) return;
  const position = songPosition();
  for (const id of ['song-clock', 'sing-clock']) $(id).value = `${time(position)} / ${time(songData.duration)}`;
  for (const id of ['song-seek', 'sing-seek']) $(id).value = position;
  updateLyricClock(position - (songData.lyricOffset || 0));
}
function updateLyricClock(position) {
  const lines = (songData?.lyrics.segments || []).filter(line => line.text.trim());
  let index = lines.findIndex(line => position >= line.start && position < line.end);
  if (index < 0) index = lines.findIndex(line => line.start > position);
  if (index < 0 && lines.length) index = lines.length - 1;
  if (index !== lyricIndex) {
    const display = songData?.lyricDisplay || 'original';
    const contextText = line => !line ? '' : display === 'latin' ? line.reading?.text || line.text : display === 'both' && line.reading?.text && line.reading.text !== line.text ? `${line.text}\n${line.reading.text}` : line.text;
    lyricIndex = index; $('lyric-current').replaceChildren(); $('lyric-reading').replaceChildren(); $('lyric-reading').hidden = true; $('lyric-previous').textContent = contextText(lines[index - 1]); $('lyric-next').textContent = contextText(lines[index + 1]);
    const line = lines[index];
    if (!line) $('lyric-current').textContent = t('lyricsEmpty');
    else {
      const reading = line.reading?.sourceText === line.text ? line.reading : null;
      const render = (element, text, words) => {
        const aligned = words?.length && words.map(word => word.text).join('').trim() === text.trim();
        for (const word of aligned ? words : [{ text, start: line.start, end: line.end }]) { const span = document.createElement('span'); span.className = 'lyric-word'; span.textContent = word.text; span.dataset.start = word.start; span.dataset.end = word.end; element.append(span); }
      };
      render($('lyric-current'), display === 'latin' && reading?.text ? reading.text : line.text, display === 'latin' && reading?.text ? reading.words : line.words);
      if (display === 'both' && reading?.text && reading.text !== line.text) { $('lyric-reading').hidden = false; render($('lyric-reading'), reading.text, reading.words); }
    }
  }
  for (const word of document.querySelectorAll('#lyric-current .lyric-word, #lyric-reading .lyric-word')) { const start = Number(word.dataset.start), end = Number(word.dataset.end); const fraction = Math.max(0, Math.min(1, (position - start) / Math.max(0.01, end - start))); word.style.setProperty('--sung', `${fraction * 100}%`); }
}
async function generateSongReadings() {
  stopSongPlayback(); await saveSongEdits(); songData = await api.romanizeSong(songLanguage); songDirty = false;
  renderLyricsEditor(); lyricIndex = -2; updateSongClock(); status('readingsReady');
}
async function setLyricDisplay(display) {
  const active = songPlaying, position = songPosition(); stopSongPlayback(); songData.lyricDisplay = display; songDirty = true;
  if (display !== 'original' && songData.lyrics.segments.some(line => line.text.trim() && (!line.reading || line.reading.sourceText !== line.text))) await generateSongReadings();
  else await saveSongEdits();
  lyricIndex = -2; updateSongClock(); if (active) await playSong(position);
}
function drawSongWave() {
  const canvas = $('song-wave'), width = canvas.clientWidth, dpr = devicePixelRatio || 1; if (!width) return;
  canvas.width = Math.round(width * dpr); canvas.height = 110 * dpr; const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr); ctx.fillStyle = '#1889a9';
  const peaks = songData?.peaks || [], count = Math.floor(width / 4);
  for (let i = 0; i < count; i++) { const height = Math.max(2, Math.min(1, peaks[Math.floor(i / count * peaks.length)] || 0) * 85); ctx.fillRect(i * 4, (110 - height) / 2, 2, height); }
}
function drawSongVisualizer() {
  const canvas = $('sing-visualizer'), width = canvas.clientWidth, dpr = devicePixelRatio || 1; if (!width) return;
  if (canvas.width !== Math.round(width * dpr)) { canvas.width = Math.round(width * dpr); canvas.height = 72 * dpr; }
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, width, 72);
  const bins = new Uint8Array(256); if (songPlaying && songAnalyser && !document.body.classList.contains('reduce-motion') && !matchMedia('(prefers-reduced-motion: reduce)').matches) songAnalyser.getByteFrequencyData(bins);
  ctx.strokeStyle = '#168bad'; ctx.lineWidth = 3; ctx.lineCap = 'round'; const gap = Math.min(20, width / 22), start = (width - gap * 15) / 2;
  for (let i = 0; i < 16; i++) { let total = 0; for (let j = 0; j < 4; j++) total += bins[2 + i * 4 + j]; const height = 2 + total / 1020 * 30; ctx.beginPath(); ctx.moveTo(start + i * gap, 36 - height / 2); ctx.lineTo(start + i * gap, 36 + height / 2); ctx.stroke(); }
}
function songFrame() {
  if (!songData || !['music', 'sing'].includes(mode)) { songRaf = 0; return; }
  updateSongClock(); if (mode === 'sing') drawSongVisualizer();
  if (songPlaying && songPosition() >= songData.duration) { songOffset = songData.duration; stopSongPlayback(false); }
  if (countdownUntil) $('sing-ready').textContent = `${t('countdown')} · ${Math.max(1, Math.ceil((countdownUntil - performance.now()) / 1000))}`;
  if (songPlaying || recording) songRaf = requestAnimationFrame(songFrame); else songRaf = 0;
}
async function enterSingRoom() {
  await saveSongEdits();
  if (!songData.lyrics.segments.some(line => line.text.trim()) && !songData.transcriptionAttempted) await transcribeCurrentSong(false);
  if (songData.lyricDisplay && songData.lyricDisplay !== 'original' && songData.lyrics.segments.some(line => line.text.trim() && (!line.reading || line.reading.sourceText !== line.text))) await generateSongReadings();
  stopSongPlayback(false); songOffset = 0; songOwnVoice = false; lyricIndex = -2; setMode('sing'); updateSongClock(); drawSongVisualizer(); window.scrollTo(0, 0);
  $('sing-room').classList.remove('entering'); void $('sing-room').offsetWidth; $('sing-room').classList.add('entering');
  if ($('portal-sfx').checked) { portalAudio.currentTime = 0; await portalAudio.play(); }
  $('sing-record').focus(); status('songReadyRecord');
}
async function beginSingRecording() {
  if (!songData || busy || saving || recording) return;
  busy = true; controls();
  try {
    await saveSongEdits(); stopSongPlayback(false); songOffset = 0; songOwnVoice = false; await ensureSongContext();
    await Promise.all([songBuffer(songData.instrumentalURL), songBuffer(songData.vocalsURL)]);
    await disableMic();
    singStream = await navigator.mediaDevices.getUserMedia(window.aerodubVoiceConfig.captureConstraints(selectedMicId, $('sing-clean').checked, $('auto-input-level').checked));
    singStream.getAudioTracks()[0].addEventListener('ended', () => { if (recording) stopSingRecording(); });
    singVoiceSession = await createVoiceSession(singStream, songContext);
    singInfo = { started: false, lead: 0, end: songData.duration, latency: window.aerodubSongTiming.captureLatency(songContext, singStream.getAudioTracks()[0]), clean: $('sing-clean').checked, voice: voiceSettingsSnapshot() };
    singRecorder = await window.SongSampleRecorder.create(songContext, singStream);
    singRecorder.onstop = finishSingRecording; singRecorder.onerror = () => { showError(new Error('micError')); recording = false; stopSongPlayback(); releaseSingMic().catch(showError); controls(); };
    recording = true; busy = false; controls(); countdownUntil = performance.now() + 3000; songRaf = requestAnimationFrame(songFrame);
    await new Promise(resolve => { const countdown = () => { if (!countdownUntil || performance.now() >= countdownUntil) resolve(); else requestAnimationFrame(countdown); }; countdown(); });
    if (!recording) return;
    countdownUntil = 0;
    const began = await singRecorder.start();
    if (!recording) return;
    const started = await playSong(0); if (!recording) { stopSongPlayback(); return; } singInfo.started = true; singInfo.lead = Math.max(0, started - began) + singInfo.latency;
    singRecorder.stop(started + songData.duration + singInfo.latency); $('sing-ready').textContent = t('recording'); status('recording');
  } catch (error) { recording = false; stopSongPlayback(); await releaseSingMic(); showError(['NotAllowedError', 'NotFoundError'].includes(error.name) ? new Error('micError') : error); }
  finally { busy = false; controls(); }
}
function stopSingRecording() {
  if (!recording) return;
  if (countdownUntil || !singInfo?.started) { countdownUntil = 0; recording = false; releaseSingMic().catch(showError); stopSongPlayback(false); $('sing-ready').textContent = t('songReadyRecord'); controls(); return; }
  if (singRecorder?.state !== 'recording') return;
  singInfo.end = Math.min(songData.duration, Math.max(0.1, songPosition()));
  const stopAt = songStartedAt + singInfo.end + singInfo.latency;
  stopSongPlayback(); saving = true; controls(); singRecorder.stop(stopAt);
}
async function finishSingRecording() {
  recording = false; busy = true; saving = true; controls();
  try { const bytes = singRecorder.bytes(); stopSongPlayback(false); await releaseSingMic(); songData = await api.saveSongTake(bytes, singInfo); songOffset = 0; songOwnVoice = true; songBuffers.clear(); renderSongTakes(); updateSongClock(); $('sing-ready').textContent = t('songReadyRecord'); status('songTakeSaved'); }
  catch (error) { showError(error); }
  finally { busy = false; saving = false; controls(); $('sing-listen-take').focus(); }
}

async function changeSongTiming(reset = false) {
  const lyricValue = reset ? 0 : Number($('sing-lyric-offset').value), takeValue = reset ? 0 : Number($('sing-take-offset').value);
  if (!Number.isFinite(lyricValue) || Math.abs(lyricValue) > 5000 || !Number.isFinite(takeValue) || Math.abs(takeValue) > 2000) { renderSongTiming(); throw new Error('INVALID_VALUE'); }
  const active = songPlaying, position = songPosition(), take = songData.takes.find(item => item.id === songData.selectedTake);
  songData.lyricOffset = lyricValue / 1000; if (take) take.offset = takeValue / 1000;
  songDirty = true; stopSongPlayback(); await saveSongEdits(); updateSongClock(); if (active) await playSong(position);
}

const importSong = () => action(async () => { await closeMusicSession(); stopPlayback(); const result = await api.importSong(); if (result) { await loadSong(result.project); updateRecent(result.projects); } });
$('music-upload-home').onclick = $('song-new').onclick = importSong;
for (const id of ['song-play', 'sing-play']) $(id).onclick = () => action(async () => { if (songPlaying) stopSongPlayback(); else await playSong(); });
for (const id of ['song-seek', 'sing-seek']) $(id).onchange = () => action(async () => { const active = songPlaying, offset = Number($(id).value); stopSongPlayback(false); songOffset = offset; if (active && offset < songData.duration - 0.01) await playSong(offset); else updateSongClock(); });
$('sing-original').onchange = updateSongGains;
for (const id of ['sing-lyric-offset', 'sing-take-offset']) $(id).onchange = () => {
  const take = songData?.takes.find(item => item.id === songData.selectedTake);
  if (Number($('sing-lyric-offset').value) === Math.round((songData?.lyricOffset || 0) * 1000) && Number($('sing-take-offset').value) === Math.round((take?.offset || 0) * 1000)) return;
  action(() => changeSongTiming());
};
$('sing-sync-reset').onclick = () => action(() => changeSongTiming(true));
for (const button of document.querySelectorAll('[data-stem-preview]')) button.onclick = () => selectStemPreview(button.dataset.stemPreview);
$('stem-selection').onchange = () => selectStemPreview($('stem-selection').value);
for (const [id, key] of [['song-instrumental-gain', 'instrumentalGain'], ['song-vocal-gain', 'vocalGain']]) { $(id).oninput = () => { songData[key] = Number($(id).value); songDirty = true; $(id + '-value').value = `${Math.round(songData[key] * 100)}%`; updateSongGains(); }; $(id).onchange = () => action(saveSongEdits); }
$('song-language-toggle').onclick = () => { if (!$('song-language-options').hidden) { closeSongLanguage(); return; } $('song-language-options').hidden = false; $('song-language-toggle').setAttribute('aria-expanded', 'true'); $('song-language-options').querySelector('[aria-selected=true]')?.focus(); };
$('song-language-options').onkeydown = event => { if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) { event.preventDefault(); const options = [...$('song-language-options').children], index = options.indexOf(document.activeElement); const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length; options[next]?.focus(); } };
$('song-transcribe').onclick = () => action(() => transcribeCurrentSong());
$('lyrics-readings').onclick = () => action(generateSongReadings);
for (const id of ['lyrics-display', 'sing-lyrics-display']) $(id).onchange = () => action(() => setLyricDisplay($(id).value));
$('lyrics-save').onclick = () => action(async () => { await saveSongEdits(); status('lyricsSaved'); });
$('lyrics-add').onclick = () => { const start = Math.min(Math.max(0, songPosition()), Math.max(0, songData.duration - 0.1)); songData.lyrics.segments.push({ id: crypto.randomUUID(), start, end: Math.min(songData.duration, start + 4), text: '', words: [] }); songDirty = true; renderLyricsEditor(); $('lyrics-lines').lastElementChild?.querySelector('textarea').focus(); };
$('song-sing').onclick = () => action(enterSingRoom);
$('sing-back').onclick = () => action(async () => { await saveSongEdits(); stopSongPlayback(); setMode('music'); drawSongWave(); window.scrollTo(0, 0); });
$('sing-record').onclick = beginSingRecording; $('sing-stop').onclick = stopSingRecording;
$('sing-listen-take').onclick = () => action(async () => { songOwnVoice = true; await playSong(0); });
$('sing-original-stems').onclick = () => action(async () => { songOwnVoice = false; await playSong(0); });
$('stem-export').onclick = () => action(async () => { await saveSongEdits(); const destination = await api.exportStems({ selection: $('stem-selection').value, format: $('stem-format').value }); if (destination) { status('exported', false, destination); $('reveal').hidden = false; } });
$('sing-export-cover').onclick = () => action(async () => { await saveSongEdits(); const destination = await api.exportCover($('stem-format').value); if (destination) { status('exported', false, destination); $('reveal').hidden = false; } });
$('portal-preview').onclick = () => { portalAudio.currentTime = 0; portalAudio.play().catch(showError); };
$('portal-sfx').onchange = () => preferences().catch(showError);
document.addEventListener('click', event => { const path = event.composedPath(); if (!path.includes($('song-language-options')) && !path.includes($('song-language-toggle'))) closeSongLanguage(); });
document.addEventListener('keydown', event => {
  if (!['music', 'sing'].includes(mode)) return;
  if (event.key === 'Escape' && !$('song-language-options').hidden) { event.preventDefault(); closeSongLanguage(); $('song-language-toggle').focus(); }
  if (event.code === 'Space' && !['INPUT', 'SELECT', 'BUTTON', 'TEXTAREA', 'SUMMARY'].includes(event.target.tagName)) { event.preventDefault(); if (recording) stopSingRecording(); else $(mode === 'sing' ? 'sing-play' : 'song-play').click(); }
});
new ResizeObserver(() => { if (songData) { drawSongWave(); if (mode === 'sing') drawSongVisualizer(); } }).observe($('song-wave'));
translateMusic();
