const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { spawn } = require('node:child_process');
const media = require('./media');
const voiceConfig = require('./voice');
const songTiming = require('./song-timing');

const languages = new Set(['auto', 'en', 'id', 'zh-CN', 'ja', 'ko']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function runtime(app) { return app.isPackaged ? path.join(process.resourcesPath, 'ai-runtime') : path.join(app.getAppPath(), 'ai-runtime'); }
function worker(app, task, args, options = {}) {
  return new Promise((resolve, reject) => {
    if (options.signal?.aborted) return reject(new Error('CANCELLED'));
    const script = path.join(__dirname, 'ai_worker.py').replace(/app\.asar([\\/])/, 'app.asar.unpacked$1');
    const root = runtime(app);
    const child = spawn(path.join(root, 'python.exe'), [script, task, '--runtime', root, ...args], { windowsHide: true, shell: false, env: { ...process.env, PYTHONUNBUFFERED: '1', PYTHONUTF8: '1', PYTHONNOUSERSITE: '1' } });
    let pending = '', diagnostics = '', result, workerError;
    const cancel = () => child.kill(); options.signal?.addEventListener('abort', cancel, { once: true });
    child.stdout.on('data', data => {
      pending += data.toString('utf8'); const lines = pending.split(/\r?\n/); pending = lines.pop();
      for (const line of lines) {
        try { const value = JSON.parse(line); if (value.kind === 'progress') options.onProgress?.(value.value); else if (value.kind === 'result') result = value; else if (value.kind === 'error') workerError = value.message; } catch { diagnostics = (diagnostics + line).slice(-4000); }
      }
    });
    child.stderr.on('data', data => { const text = data.toString('utf8'); diagnostics = (diagnostics + text).slice(-4000); if (task === 'separate') { const progress = [...text.matchAll(/(\d+)%/g)].pop(); if (progress) options.onProgress?.(0.08 + Math.min(100, Number(progress[1])) / 100 * 0.85); } });
    child.on('error', () => { options.signal?.removeEventListener('abort', cancel); reject(new Error('AI_FILES_MISSING')); });
    child.on('close', code => { options.signal?.removeEventListener('abort', cancel); if (options.signal?.aborted) reject(new Error('CANCELLED')); else if (code !== 0) reject(new Error(workerError || diagnostics || 'AI_PROCESS_FAILED')); else resolve(result); });
  });
}
async function ready(app) {
  try { await Promise.all(['python.exe', 'models/manifest.json', 'models/demucs/04573f0d-f3cf25b2.th', 'models/whisper-large-v3/model.bin', 'models/whisper-large-v3/config.json', 'models/whisper-large-v3/tokenizer.json'].map(file => fs.access(path.join(runtime(app), file)))); return true; } catch { return false; }
}
async function prepareSong(app, source, dir, options) {
  const info = await media.probe(source, options);
  if (!info.streams.some(stream => stream.codec_type === 'audio')) throw new Error('AUDIO_REQUIRED');
  if (info.duration > 3600) throw new Error('SONG_TOO_LONG');
  if (!await ready(app)) throw new Error('AI_FILES_MISSING');
  await fs.mkdir(dir, { recursive: true });
  await media.run(media.ffmpeg, ['-y', '-v', 'error', '-i', source, '-vn', '-ac', '2', '-ar', '44100', '-c:a', 'pcm_f32le', path.join(dir, 'original.wav')], options);
  const result = await worker(app, 'separate', ['--source', path.join(dir, 'original.wav'), '--destination', dir], options);
  const vocals = await media.probe(path.join(dir, 'vocals.wav'), options), instrumental = await media.probe(path.join(dir, 'instrumental.wav'), options);
  if (Math.abs(vocals.duration - info.duration) > 0.1 || Math.abs(instrumental.duration - info.duration) > 0.1) throw new Error('INVALID_AUDIO');
  const peaks = await media.waveform(path.join(dir, 'instrumental.wav'), vocals.duration, options);
  return { version: 1, kind: 'song', name: path.parse(source).name, source, duration: vocals.duration, peaks, stemScale: result.stemScale, lyrics: { language: 'auto', segments: [] }, takes: [], selectedTake: null, vocalGain: 1, instrumentalGain: 1, updatedAt: new Date().toISOString() };
}
function validateLyrics(lyrics, duration, previous) {
  if (!lyrics || !languages.has(lyrics.language) || !Array.isArray(lyrics.segments) || lyrics.segments.length > 10000) throw new Error('INVALID_VALUE');
  const ids = new Set();
  const segments = lyrics.segments.map(line => {
    if (!line || typeof line.id !== 'string' || !uuid.test(line.id) || ids.has(line.id) || typeof line.text !== 'string' || line.text.length > 2000 || !Number.isFinite(line.start) || !Number.isFinite(line.end) || line.start < 0 || line.end > duration + 0.05 || line.end <= line.start) throw new Error('INVALID_VALUE');
    ids.add(line.id);
    const old = previous?.segments.find(item => item.id === line.id);
    const withReading = result => {
      delete result.reading;
      if (line.reading === undefined || line.reading === null) return result;
      if (typeof line.reading !== 'object' || typeof line.reading.text !== 'string' || line.reading.text.length > 32000 || typeof line.reading.sourceText !== 'string') throw new Error('INVALID_VALUE');
      if (line.reading.sourceText !== line.text) return result;
      if (old?.reading && old.text === line.text && old.reading.text === line.reading.text) {
        result.reading = { ...old.reading, words: songTiming.retimeWords({ ...old, words: old.reading.words || [] }, line.start, line.end) };
      } else {
        const text = line.reading.text.trim();
        result.reading = { text, sourceText: line.text, manual: true, words: text ? [{ text, start: line.start, end: line.end }] : [] };
      }
      return result;
    };
    if (old && old.text === line.text && old.start === line.start && old.end === line.end) return withReading({ ...old });
    if (old && old.text === line.text.trim() && old.words?.length && old.end > old.start) {
      return withReading({ ...old, start: line.start, end: line.end, words: songTiming.retimeWords(old, line.start, line.end), timingEstimated: Boolean(old.timingEstimated || Math.abs((line.end - line.start) - (old.end - old.start)) > .000001) });
    }
    const tokens = [...new Intl.Segmenter(lyrics.language === 'auto' ? 'en' : lyrics.language, { granularity: 'word' }).segment(line.text)].map(item => item.segment);
    const length = Math.max(1, line.text.length); let offset = 0;
    const words = tokens.map(text => { const start = line.start + offset / length * (line.end - line.start); offset += text.length; return { text, start, end: line.start + offset / length * (line.end - line.start), probability: null }; });
    return withReading({ id: line.id, start: line.start, end: line.end, text: line.text.trim(), words, review: false, timingEstimated: true });
  });
  return { language: lyrics.language, segments: segments.sort((a, b) => a.start - b.start || a.end - b.end) };
}
async function romanizeSong(app, song, dir, language, options) {
  if (!languages.has(language)) throw new Error('INVALID_VALUE');
  const input = path.join(dir, `reading-input-${randomUUID()}.json`), output = path.join(dir, `reading-output-${randomUUID()}.json`);
  try {
    await fs.writeFile(input, JSON.stringify(song.lyrics));
    await worker(app, 'romanize', ['--source', input, '--destination', output, '--language', language], options);
    const readings = new Map(JSON.parse(await fs.readFile(output, 'utf8')).map(line => [line.id, line.reading]));
    return { ...song.lyrics, segments: song.lyrics.segments.map(line => ({ ...line, reading: line.reading?.manual ? line.reading : readings.get(line.id) })) };
  } finally { await fs.rm(input, { force: true }); await fs.rm(output, { force: true }); }
}
async function transcribeSong(app, song, dir, language, options) {
  if (!languages.has(language)) throw new Error('INVALID_VALUE');
  const temporary = path.join(dir, `lyrics-${randomUUID()}.json`);
  try {
    await worker(app, 'transcribe', ['--source', path.join(dir, 'vocals.wav'), '--destination', temporary, '--language', language], options);
    const result = JSON.parse(await fs.readFile(temporary, 'utf8'));
    const segments = songTiming.phraseLyrics(result.segments, song.duration).map(line => ({ ...line, id: randomUUID() }));
    const actualLanguage = result.language === 'zh' ? 'zh-CN' : result.language;
    return { language: languages.has(actualLanguage) ? actualLanguage : language, segments };
  } finally { await fs.rm(temporary, { force: true }); }
}
function safeDestination(song, dir, destination) {
  const resolved = path.resolve(destination).toLowerCase();
  if (resolved === path.resolve(song.source).toLowerCase() || resolved === path.resolve(dir).toLowerCase() || resolved.startsWith(path.resolve(dir).toLowerCase() + path.sep)) throw new Error('SOURCE_OVERWRITE');
}
async function exportStems(app, song, dir, destination, selection, format, options) {
  if (!['vocals', 'instrumental', 'both'].includes(selection) || !['wav', 'mp3'].includes(format)) throw new Error('INVALID_VALUE');
  safeDestination(song, dir, destination);
  const work = path.join(dir, `export-${randomUUID()}`); await fs.mkdir(work);
  const temporary = path.join(path.dirname(destination), `.aerodub-${randomUUID()}${selection === 'both' ? '.zip' : '.' + format}`);
  try {
    const names = selection === 'both' ? ['instrumental', 'vocals'] : [selection];
    const files = [];
    for (const name of names) {
      const file = path.join(work, `${name}.${format}`);
      await media.run(media.ffmpeg, ['-y', '-v', 'error', '-i', path.join(dir, `${name}.wav`), ...(format === 'mp3' ? ['-c:a', 'libmp3lame', '-b:a', '320k'] : ['-c:a', 'pcm_s24le']), file], options); files.push(file);
    }
    if (selection === 'both') await worker(app, 'zip', ['--destination', temporary, '--files', ...files], options);
    else await fs.copyFile(files[0], temporary);
    if (options.signal?.aborted) throw new Error('CANCELLED');
    await fs.rename(temporary, destination);
  } finally { await fs.rm(temporary, { force: true }); await fs.rm(work, { recursive: true, force: true }); }
}
async function saveSongTake(bytes, song, dir, timing, options) {
  if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length > 500 * 1024 * 1024 || !timing || !Number.isFinite(timing.lead) || timing.lead < 0 || timing.lead > 3 || !Number.isFinite(timing.end) || timing.end <= 0 || timing.end > song.duration + 0.5 || typeof timing.clean !== 'boolean') throw new Error('INVALID_RECORDING');
  const voice = voiceConfig.validate(timing.voice || voiceConfig.defaults);
  const latency = timing.latency ?? 0;
  if (!Number.isFinite(latency) || latency < 0 || latency > 2) throw new Error('INVALID_RECORDING');
  const id = randomUUID(), destination = path.join(dir, 'takes', id); await fs.mkdir(destination, { recursive: true });
  const capture = path.join(destination, 'capture.webm'); await fs.writeFile(capture, bytes);
  try {
    const info = await media.processTake(capture, destination, { ...options, voice });
    const length = Math.min(timing.end, Math.max(0, info.duration - timing.lead));
    if (length < 0.1) throw new Error('INVALID_RECORDING');
    await media.run(media.ffmpeg, ['-y', '-v', 'error', '-i', path.join(destination, timing.clean ? 'clean.wav' : 'raw.wav'), '-af', `atrim=start=${timing.lead}:duration=${length},asetpts=PTS-STARTPTS,apad,atrim=duration=${song.duration}`, '-ac', '2', '-ar', '44100', '-c:a', 'pcm_s24le', path.join(destination, 'voice.wav')], options);
    return { id, name: `${song.takes.length + 1}`, voice, duration: length, clean: timing.clean, offset: 0, latencyCompensation: latency, captureLead: timing.lead, updatedAt: new Date().toISOString() };
  } catch (error) { await fs.rm(destination, { recursive: true, force: true }); throw error; }
  finally { await fs.rm(capture, { force: true }); }
}
async function cover(song, dir, destination, format, options) {
  if (!['wav', 'mp3'].includes(format) || !uuid.test(song.selectedTake || '') || !song.takes.some(take => take.id === song.selectedTake)) throw new Error('NO_SONG_TAKE');
  safeDestination(song, dir, destination);
  const offset = song.takes.find(take => take.id === song.selectedTake).offset ?? 0;
  if (!Number.isFinite(offset) || Math.abs(offset) > 2) throw new Error('INVALID_VALUE');
  const alignment = `atrim=start=${Math.max(0, -offset)},asetpts=PTS-STARTPTS,adelay=${Math.max(0, offset) * 1000}:all=1,apad,atrim=duration=${song.duration}`;
  await media.run(media.ffmpeg, ['-y', '-v', 'error', '-i', path.join(dir, 'instrumental.wav'), '-i', path.join(dir, 'takes', song.selectedTake, 'voice.wav'), '-filter_complex', `[0:a]volume=${song.instrumentalGain}[music];[1:a]${alignment},volume=${song.vocalGain}[voice];[music][voice]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.95:level=false:latency=true[mix]`, '-map', '[mix]', '-t', String(song.duration), ...(format === 'mp3' ? ['-c:a', 'libmp3lame', '-b:a', '320k'] : ['-c:a', 'pcm_s24le']), destination], { ...options, duration: song.duration });
}
module.exports = { runtime, worker, ready, prepareSong, validateLyrics, transcribeSong, romanizeSong, exportStems, saveSongTake, cover, safeDestination, languages };
