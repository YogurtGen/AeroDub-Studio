const { app, BrowserWindow, ipcMain, dialog, protocol, session, shell } = require('electron');
const fs = require('node:fs/promises');
const { createReadStream } = require('node:fs');
const { Readable } = require('node:stream');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const dialogStrings = {
  en: { importTitle: 'Choose a video to dub', relinkTitle: 'Source video moved. Locate the original file.', exportTitle: 'Export dubbed video', videoFilter: 'Video', takeDefault: 'Take' },
  id: { importTitle: 'Pilih video untuk dubbing', relinkTitle: 'Video asli pindah. Pilih file aslinya.', exportTitle: 'Ekspor video dubbing', videoFilter: 'Video', takeDefault: 'Take' },
  ...require('./renderer/locales')
};
const dialogText = key => dialogStrings[settings.language][key];
const media = require('./media');
const music = require('./music');
const { analyzeSpeakers } = require('./speakers');
const voiceConfig = require('./voice');
const timeline = require('./timeline');
const shortcutsConfig = require('./shortcuts');
const clipAudio = require('./clip-audio');
const { divideParts, smartParts, migrateProject } = require('./parts');
if (process.env.AERODUB_TEST_USER_DATA) app.setPath('userData', process.env.AERODUB_TEST_USER_DATA);

protocol.registerSchemesAsPrivileged([{ scheme: 'aeromedia', privileges: { standard: true, secure: true, stream: true, supportFetchAPI: true, corsEnabled: true } }]);
let window, project, projectDir, activeJob, settings;
const allowedMedia = new Map();
const mediaTokens = new Map();
const projectsRoot = () => path.join(app.getPath('userData'), 'projects');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function mediaURL(file) {
  if (mediaTokens.has(file)) return mediaTokens.get(file);
  const token = randomUUID();
  allowedMedia.set(token, file);
  const url = `aeromedia://local/${token}`;
  mediaTokens.set(file, url);
  return url;
}
function view() {
  if (!project) return null;
  if (project.kind === 'song') return { ...project, instrumentalURL: mediaURL(path.join(projectDir, 'instrumental.wav')), vocalsURL: mediaURL(path.join(projectDir, 'vocals.wav')), takes: project.takes.map(take => ({ ...take, audioURL: mediaURL(path.join(projectDir, 'takes', take.id, 'voice.wav')) })) };
  const preview = /^video-edit-[0-9a-f-]+\.mp4$/.test(project.videoPreview || '') ? project.videoPreview : 'preview.mp4';
  return { ...project, dubTracks: timeline.dubTracks(project), videoURL: mediaURL(path.join(projectDir, preview)), referenceURL: mediaURL(path.join(projectDir, 'reference.wav')), takes: project.takes.map(t => ({ ...t, audioURL: mediaURL(path.join(projectDir, 'takes', t.id, t.clean ? 'clean.wav' : 'raw.wav')) })) };
}
function number(value, min, max) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error('INVALID_VALUE');
  return value;
}
async function atomicJSON(file, data) {
  const temp = `${file}.${randomUUID()}.tmp`;
  await fs.writeFile(temp, JSON.stringify(data, null, 2));
  await fs.rename(temp, file);
}
async function save() {
  if (project) { project.updatedAt = new Date().toISOString(); await atomicJSON(path.join(projectDir, 'project.aerodub.json'), project); }
}
async function pruneVideoPreviews() {
  if (!projectDir || !project || project.kind === 'song') return;
  const stale = (await fs.readdir(projectDir)).filter(name => /^video-edit-[0-9a-f-]+\.mp4$/.test(name) && name !== project.videoPreview);
  await Promise.all(stale.map(name => fs.rm(path.join(projectDir, name), { force: true }).catch(() => {})));
}
function idle() { if (activeJob) throw new Error('BUSY'); }
function requireProject(kind = 'video') { if (!project || (kind === 'song') !== (project.kind === 'song')) throw new Error('NO_PROJECT'); }
async function job(stage, task) {
  idle();
  const controller = new AbortController();
  activeJob = controller;
  const onProgress = value => window?.webContents.send('job-progress', { stage, value });
  onProgress(0);
  try { return await task({ signal: controller.signal, onProgress }); }
  finally { activeJob = null; window?.webContents.send('job-progress', null); }
}
function handle(name, callback) {
  ipcMain.handle(name, async (event, ...args) => {
    if (event.sender !== window?.webContents || event.senderFrame !== window.webContents.mainFrame) throw new Error('UNAUTHORIZED');
    try { return { ok: true, data: await callback(...args) }; }
    catch (error) { return { ok: false, error: error.message }; }
  });
}

handle('bootstrap', async () => ({ settings, projects: await recent(), musicReady: await music.ready(app) }));
async function recent() {
  await fs.mkdir(projectsRoot(), { recursive: true });
  const items = await fs.readdir(projectsRoot());
  const result = [];
  for (const id of items.filter(item => uuid.test(item))) {
    try {
      const data = JSON.parse(await fs.readFile(path.join(projectsRoot(), id, 'project.aerodub.json'), 'utf8'));
      result.push({ id, name: data.name, kind: data.kind || 'video', updatedAt: data.updatedAt, duration: data.duration, takeCount: data.takes?.length ?? 0 });
    } catch { /* Incomplete imports are excluded from the project list. */ }
  }
  return result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
handle('settings', async changes => {
  if (!changes || !Object.hasOwn(dialogStrings, changes.language) || typeof changes.reduceMotion !== 'boolean' || typeof changes.micDeviceId !== 'string' || changes.micDeviceId.length > 512) throw new Error('INVALID_VALUE');
  if (changes.portalSfxEnabled !== undefined && typeof changes.portalSfxEnabled !== 'boolean') throw new Error('INVALID_VALUE');
  if (changes.autoInputLevel !== undefined && typeof changes.autoInputLevel !== 'boolean') throw new Error('INVALID_VALUE');
  const voice = changes.voice === undefined ? settings.voice : voiceConfig.validate(changes.voice);
  const shortcuts = changes.shortcuts === undefined ? settings.shortcuts : shortcutsConfig.validate(changes.shortcuts);
  settings = { language: changes.language, reduceMotion: changes.reduceMotion, micDeviceId: changes.micDeviceId, portalSfxEnabled: changes.portalSfxEnabled ?? settings.portalSfxEnabled, autoInputLevel: changes.autoInputLevel ?? settings.autoInputLevel, voice, shortcuts };
  await atomicJSON(path.join(app.getPath('userData'), 'settings.json'), settings);
  return settings;
});
handle('import-video', async () => {
  idle();
  const result = await dialog.showOpenDialog(window, { title: dialogText('importTitle'), properties: ['openFile'], filters: [{ name: dialogText('videoFilter'), extensions: ['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v'] }] });
  if (result.canceled) return null;
  const source = result.filePaths[0];
  const id = randomUUID(), dir = path.join(projectsRoot(), id);
  try {
    const info = await job('prepare', options => media.prepare(source, dir, options));
    project = { version: 1, id, name: path.parse(source).name, source, ...info, sourceGain: 1, duckGain: 0.12, dubGain: 1, padding: 1.5, parts: smartParts(info.duration, info.silentRanges, 1.5), takes: [], updatedAt: new Date().toISOString() };
    projectDir = dir;
    allowedMedia.clear(); mediaTokens.clear();
    await save();
    return { project: view(), projects: await recent() };
  } catch (error) { await fs.rm(dir, { recursive: true, force: true }); throw error; }
});
handle('open-project', async id => {
  idle();
  if (typeof id !== 'string' || !uuid.test(id)) throw new Error('INVALID_VALUE');
  const dir = path.join(projectsRoot(), id);
  const data = JSON.parse(await fs.readFile(path.join(dir, 'project.aerodub.json'), 'utf8'));
  if (data.version !== 1 || data.id !== id || !Array.isArray(data.takes) || data.takes.some(t => !uuid.test(t.id))) throw new Error('INVALID_PROJECT');
  if (data.kind === 'song') {
    await Promise.all(['vocals.wav', 'instrumental.wav'].map(file => fs.access(path.join(dir, file))));
    if (!Number.isFinite(data.duration) || data.duration <= 0 || !data.lyrics || !Array.isArray(data.lyrics.segments)) throw new Error('INVALID_PROJECT');
    project = data;
  } else { await fs.access(path.join(dir, 'preview.mp4')); project = migrateProject(data); }
  projectDir = dir; allowedMedia.clear(); mediaTokens.clear();
  await save();
  return view();
});
handle('save-project', async () => { idle(); requireProject(); await save(); return recent(); });
handle('timeline-thumbnails', async () => {
  idle(); requireProject();
  if (!project.thumbnailDataURL) {
    const thumbnailDataURL = await job('timelineThumbs', options => media.thumbnails(path.join(projectDir, 'preview.mp4'), project.duration, options));
    project.thumbnailDataURL = thumbnailDataURL; await save();
  }
  return view();
});
handle('close-project', async () => {
  idle(); await save(); await pruneVideoPreviews(); project = null; projectDir = null; allowedMedia.clear(); mediaTokens.clear();
  return recent();
});
handle('delete-project', async id => {
  idle();
  if (typeof id !== 'string' || !uuid.test(id)) throw new Error('INVALID_VALUE');
  const dir = path.resolve(projectsRoot(), id);
  const [realRoot, realDir] = await Promise.all([fs.realpath(projectsRoot()), fs.realpath(dir)]);
  if (path.dirname(realDir).toLowerCase() !== realRoot.toLowerCase()) throw new Error('INVALID_PROJECT');
  await fs.access(path.join(dir, 'project.aerodub.json'));
  const activeDeleted = project?.id === id;
  await shell.trashItem(dir);
  if (activeDeleted) { project = null; projectDir = null; allowedMedia.clear(); mediaTokens.clear(); }
  return { projects: await recent(), activeDeleted };
});
handle('divide-parts', async ({ padding, fullVideo = false }) => {
  idle(); requireProject();
  if (project.takes.length) throw new Error('PARTS_HAVE_TAKES');
  const nextPadding = number(padding, 1, 3);
  let analysis = project.speakerAnalysis;
  if (!fullVideo && project.hasAudio && analysis?.version !== 3) analysis = await job('detectSpeakers', options => analyzeSpeakers(app, projectDir, options));
  const parts = fullVideo ? divideParts(project.duration, 1) : smartParts(project.duration, project.silentRanges, nextPadding, analysis?.turns || [], analysis?.changes || []);
  Object.assign(project, { padding: nextPadding, parts });
  if (analysis) project.speakerAnalysis = analysis;
  await save(); return view();
});
handle('edit-parts', async change => {
  idle(); requireProject();
  if (project.takes.length) throw new Error('PARTS_HAVE_TAKES');
  if (!change || !['trim', 'split', 'merge'].includes(change.operation)) throw new Error('INVALID_VALUE');
  const index = project.parts.findIndex(part => part.id === change.partId);
  if (index < 0) throw new Error('INVALID_VALUE');
  const parts = project.parts.map(part => ({ ...part })), current = parts[index];
  if (change.operation === 'trim') {
    const minimum = index ? parts[index - 1].end : 0, maximum = parts[index + 1]?.start ?? project.duration;
    const start = Math.max(minimum, number(change.start, Math.max(0, minimum - .002), maximum - .1));
    const end = Math.min(maximum, number(change.end, start + .1, maximum + .002));
    current.start = start; current.end = end;
  } else if (change.operation === 'split') {
    const point = number(change.position, current.start + .15, current.end - .15);
    parts.splice(index, 1, { ...current, end: point }, { ...current, start: point });
  } else {
    const next = parts[index + 1]; if (!next) throw new Error('INVALID_VALUE');
    parts.splice(index, 2, { ...current, end: next.end, voiceEnd: next.voiceEnd ?? next.end });
  }
  project.parts = parts.map((part, i) => ({ ...part, id: `part-${i + 1}`, voiceStart: Math.max(part.start, Math.min(part.end, part.voiceStart ?? part.start)), voiceEnd: Math.max(part.start, Math.min(part.end, part.voiceEnd ?? part.end)), speakers: [...new Set((project.speakerAnalysis?.turns || []).filter(turn => Math.min(part.end, turn.end) - Math.max(part.start, turn.start) > .15).map(turn => turn.speaker))] }));
  project.customCuts = true; await save(); return view();
});
handle('save-take', async (bytes, timing) => {
  idle(); requireProject();
  if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length > 200 * 1024 * 1024) throw new Error('INVALID_RECORDING');
  const start = number(timing.start, 0, project.duration);
  const end = number(timing.end, start + 0.05, project.duration + 0.1);
  const lead = number(timing.lead, 0, 10);
  const part = project.parts.find(part => part.id === timing.partId);
  if (!part || Math.abs(part.start - start) > .01 || end > part.end + .1) throw new Error('INVALID_VALUE');
  if (typeof timing.clean !== 'boolean') throw new Error('INVALID_VALUE');
  const voice = voiceConfig.validate(timing.voice || voiceConfig.defaults);
  const trackId = timing.trackId || 'dub-1';
  if (!timeline.dubTracks(project).some(track => track.id === trackId)) throw new Error('INVALID_VALUE');
  const id = randomUUID(), dir = path.join(projectDir, 'takes', id);
  await fs.mkdir(dir, { recursive: true });
  const input = path.join(dir, 'capture.webm');
  await fs.writeFile(input, bytes);
  try {
    const info = await job('clean', options => media.processTake(input, dir, { ...options, voice }));
    for (const take of project.takes) if (take.partId === part.id && (take.recordTrackId || take.trackId || 'dub-1') === trackId) take.selected = false;
    const trimStart = Math.min(lead, Math.max(0, info.duration - 0.02));
    project.takes.push({ id, partId: part.id, trackId, recordTrackId: trackId, voice, name: `${dialogText('takeDefault')} ${project.takes.filter(t => t.partId === part.id).length + 1}`, start, offset: 0, duration: info.duration, trimStart, trimEnd: Math.min(info.duration, trimStart + end - start), gain: 1, muted: false, selected: true, clean: timing.clean, peaks: info.peaks });
    await save();
    return view();
  } catch (error) { await fs.rm(dir, { recursive: true, force: true }); throw error; }
  finally { await fs.rm(input, { force: true }); }
});
handle('update-project', async changes => {
  idle(); requireProject();
  await pruneVideoPreviews();
  const nextTakes = project.takes.map(take => ({ ...take }));
  if (!changes || !Array.isArray(changes.takes) || changes.takes.length !== nextTakes.length) throw new Error('INVALID_VALUE');
  const sourceGain = number(changes.sourceGain, 0, 2), duckGain = number(changes.duckGain, 0, 1);
  const dubGain = number(changes.dubGain, 0, 4);
  const dubTracks = timeline.validateDubTracks(changes.dubTracks || timeline.dubTracks(project));
  const validTrack = id => { if (!dubTracks.some(track => track.id === id)) throw new Error('INVALID_VALUE'); return id; };
  for (let i = 0; i < nextTakes.length; i++) {
    const target = nextTakes[i], change = changes.takes[i];
    if (target.id !== change.id || typeof change.name !== 'string' || change.name.length > 120) throw new Error('INVALID_VALUE');
    const offset = number(change.offset, -Math.max(60, project.duration), Math.max(60, project.duration));
    const trimStart = number(change.trimStart, 0, target.duration - 0.01);
    const trimEnd = number(change.trimEnd, trimStart + 0.01 - 1e-6, target.duration);
    const gain = number(change.gain, 0, 4);
    for (const field of ['selected', 'muted', 'clean']) if (typeof change[field] !== 'boolean') throw new Error('INVALID_VALUE');
    Object.assign(target, { name: change.name, offset, trimStart, trimEnd, gain, selected: change.selected, muted: change.muted, clean: change.clean });
    target.effects = clipAudio.validate(change.effects);
    if (change.removed !== undefined && typeof change.removed !== 'boolean') throw new Error('INVALID_VALUE');
    target.removed = change.removed ?? false;
    target.recordTrackId ??= target.trackId || 'dub-1';
    target.trackId = validTrack(change.trackId || target.trackId || 'dub-1');
    if (change.splits !== undefined && (!Array.isArray(change.splits) || change.splits.length > 500)) throw new Error('INVALID_VALUE');
    target.splits = (change.splits || []).map(clip => {
      if (!clip || typeof clip.id !== 'string' || !uuid.test(clip.id) || typeof clip.muted !== 'boolean') throw new Error('INVALID_VALUE');
      const trimStart = number(clip.trimStart, 0, target.duration - .01);
      if (clip.removed !== undefined && typeof clip.removed !== 'boolean') throw new Error('INVALID_VALUE');
      return { id: clip.id, trackId: validTrack(clip.trackId || target.trackId), offset: number(clip.offset, -Math.max(60, project.duration), Math.max(60, project.duration)), trimStart, trimEnd: number(clip.trimEnd, trimStart + .01 - 1e-6, target.duration), gain: number(clip.gain, 0, 4), muted: clip.muted, effects: clipAudio.validate(clip.effects), removed: clip.removed ?? false };
    });
  }
  const ids = timeline.clips(nextTakes).map(clip => clip.id);
  if (new Set(ids).size !== ids.length) throw new Error('INVALID_VALUE');
  const selections = new Set();
  for (const take of nextTakes.filter(take => take.selected)) { const key = `${take.partId}:${take.recordTrackId || take.trackId}`; if (selections.has(key)) throw new Error('ONE_TAKE_PER_PART'); selections.add(key); }
  const sourceValues = changes.sourceClips === undefined ? project.sourceClips : timeline.validateTrackClips(changes.sourceClips, project.duration, 'original');
  const sourceClips = sourceValues?.map(clip => ({ ...clip, effects: clipAudio.validate(clip.effects) }));
  const videoClips = changes.videoClips === undefined ? project.videoClips : timeline.validateTrackClips(changes.videoClips, project.duration, 'video');
  const next = { ...project, sourceGain, duckGain, dubGain, dubTracks, takes: nextTakes, sourceClips, videoClips };
  let generated;
  try {
    if (timeline.videoLayout(next) !== timeline.videoLayout(project)) {
      generated = `video-edit-${randomUUID()}.mp4`;
      await job('videoEdit', options => media.renderVideoPreview(next, projectDir, path.join(projectDir, generated), options));
      next.videoPreview = generated;
    }
    next.updatedAt = new Date().toISOString();
    await atomicJSON(path.join(projectDir, 'project.aerodub.json'), next);
  } catch (error) { if (generated) await fs.rm(path.join(projectDir, generated), { force: true }); throw error; }
  const previousPreview = project.videoPreview;
  project = next;
  if (generated && previousPreview) await fs.rm(path.join(projectDir, previousPreview), { force: true }).catch(() => {});
  return view();
});
handle('preview-take', async (id, individual = false) => {
  idle(); requireProject();
  if (typeof individual !== 'boolean') throw new Error('INVALID_VALUE');
  const take = (individual ? timeline.clips(project.takes) : project.takes).find(t => t.id === id);
  if (!take) throw new Error('INVALID_VALUE');
  const file = path.join(projectDir, 'audition.wav');
  await job('mix', options => media.auditionTake(project, take, projectDir, file, { ...options, individual }));
  return mediaURL(file) + `?v=${randomUUID()}`;
});
handle('preview-source-clip', async id => {
  idle(); requireProject();
  const clip = timeline.trackClips(project, 'original').find(clip => clip.id === id);
  if (!clip) throw new Error('INVALID_VALUE');
  const file = path.join(projectDir, 'audition.wav');
  await job('mix', options => media.auditionSource(project, clip, projectDir, file, options));
  return mediaURL(file) + `?v=${randomUUID()}`;
});
handle('preview-part', async partId => {
  idle(); requireProject();
  if (!project.parts.some(part => part.id === partId)) throw new Error('INVALID_VALUE');
  const file = path.join(projectDir, 'audition.wav');
  const range = await job('mix', options => media.auditionPart(project, partId, projectDir, file, options));
  return { ...range, url: mediaURL(file) + `?v=${randomUUID()}` };
});
handle('preview-reference', async () => {
  idle(); requireProject();
  const file = path.join(projectDir, 'reference-preview.wav');
  await job('mix', options => media.render({ ...project, takes: [], duckGain: 1 }, projectDir, file, options));
  return mediaURL(file) + `?v=${randomUUID()}`;
});
handle('delete-take', async id => {
  idle(); requireProject();
  if (!uuid.test(id) || !project.takes.some(t => t.id === id)) throw new Error('INVALID_VALUE');
  project.takes = project.takes.filter(t => t.id !== id);
  await save();
  await fs.rm(path.join(projectDir, 'takes', id), { recursive: true, force: true });
  return view();
});
handle('preview-mix', async () => {
  requireProject();
  const file = path.join(projectDir, `mix-${randomUUID()}.wav`);
  try {
    await job('mix', options => media.render(project, projectDir, file, options));
    for (const name of await fs.readdir(projectDir)) if (/^mix-.*\.wav$/.test(name) && name !== path.basename(file)) await fs.rm(path.join(projectDir, name), { force: true });
    return mediaURL(file);
  } catch (error) { await fs.rm(file, { force: true }); throw error; }
});
let lastExport;
handle('export', async () => {
  idle(); requireProject();
  try { await fs.access(project.source); }
  catch {
    const relink = await dialog.showOpenDialog(window, { title: dialogText('relinkTitle'), properties: ['openFile'] });
    if (relink.canceled) return null;
    const info = await media.probe(relink.filePaths[0]);
    if (!info.streams.some(s => s.codec_type === 'video') || Math.abs(info.duration - project.duration) > 0.1) throw new Error('WRONG_SOURCE');
    project.source = relink.filePaths[0]; await save();
  }
  const result = await dialog.showSaveDialog(window, { title: dialogText('exportTitle'), defaultPath: `${project.name}-dubbed.mp4`, filters: [{ name: 'MP4', extensions: ['mp4'] }] });
  if (result.canceled) return null;
  const destination = result.filePath.toLowerCase().endsWith('.mp4') ? result.filePath : `${result.filePath}.mp4`;
  if (path.resolve(destination).toLowerCase() === path.resolve(project.source).toLowerCase()) throw new Error('SOURCE_OVERWRITE');
  const temp = path.join(path.dirname(destination), `.aerodub-${randomUUID()}.mp4`);
  try {
    await job('export', options => media.render(project, projectDir, temp, { ...options, video: true }));
    await fs.rename(temp, destination);
    lastExport = destination;
    return destination;
  } finally { await fs.rm(temp, { force: true }); }
});
handle('reveal-export', () => { if (lastExport) shell.showItemInFolder(lastExport); });
handle('cancel', () => { activeJob?.abort(); });

const songText = key => require('./renderer/music-locales')[settings.language][key];
handle('import-song', async () => {
  idle();
  const result = await dialog.showOpenDialog(window, { title: songText('chooseSong'), properties: ['openFile'], filters: [{ name: songText('audioFile'), extensions: ['mp3', 'wav', 'flac', 'm4a', 'ogg'] }] });
  if (result.canceled) return null;
  const source = result.filePaths[0], id = randomUUID(), dir = path.join(projectsRoot(), id);
  try {
    const data = await job('separateSong', options => music.prepareSong(app, source, dir, options));
    project = { ...data, id }; projectDir = dir; allowedMedia.clear(); mediaTokens.clear(); await save();
    return { project: view(), projects: await recent() };
  } catch (error) { await fs.rm(dir, { recursive: true, force: true }); throw error; }
});
handle('transcribe-song', async language => {
  idle(); requireProject('song');
  const lyrics = await job('transcribeSong', options => music.transcribeSong(app, project, projectDir, language, options));
  project.lyrics = lyrics; project.transcriptionAttempted = true; await save(); return view();
});
handle('romanize-song', async language => {
  idle(); requireProject('song');
  const lyrics = await job('romanizeSong', options => music.romanizeSong(app, project, projectDir, language, options));
  project.lyrics = lyrics; project.readingLanguage = language; await save(); return view();
});
handle('update-song', async changes => {
  idle(); requireProject('song');
  if (!changes || changes.id !== project.id || (changes.selectedTake !== null && !project.takes.some(take => take.id === changes.selectedTake))) throw new Error('INVALID_VALUE');
  const instrumentalGain = number(changes.instrumentalGain, 0, 2), vocalGain = number(changes.vocalGain, 0, 4);
  const lyrics = music.validateLyrics(changes.lyrics, project.duration, project.lyrics);
  const lyricOffset = number(changes.lyricOffset ?? project.lyricOffset ?? 0, -5, 5);
  const lyricDisplay = changes.lyricDisplay ?? project.lyricDisplay ?? 'original';
  if (!['original', 'both', 'latin'].includes(lyricDisplay)) throw new Error('INVALID_VALUE');
  const takeOffsets = new Map();
  if (changes.takeOffsets !== undefined) {
    if (!Array.isArray(changes.takeOffsets) || changes.takeOffsets.length !== project.takes.length) throw new Error('INVALID_VALUE');
    for (const take of changes.takeOffsets) {
      if (!take || !project.takes.some(item => item.id === take.id) || takeOffsets.has(take.id)) throw new Error('INVALID_VALUE');
      takeOffsets.set(take.id, number(take.offset, -2, 2));
    }
  }
  Object.assign(project, { lyrics, lyricOffset, lyricDisplay, instrumentalGain, vocalGain, selectedTake: changes.selectedTake });
  for (const take of project.takes) if (takeOffsets.has(take.id)) take.offset = takeOffsets.get(take.id);
  await save(); return view();
});
handle('save-song-take', async (bytes, timing) => {
  idle(); requireProject('song');
  const take = await job('saveSongTake', options => music.saveSongTake(bytes, project, projectDir, timing, options));
  project.takes.push(take); project.selectedTake = take.id; await save(); return view();
});
handle('export-stems', async options => {
  idle(); requireProject('song');
  if (!options || !['instrumental', 'vocals', 'both'].includes(options.selection) || !['wav', 'mp3'].includes(options.format)) throw new Error('INVALID_VALUE');
  const extension = options.selection === 'both' ? 'zip' : options.format;
  const result = await dialog.showSaveDialog(window, { title: songText('exportStems'), defaultPath: `${project.name}-${options.selection}.${extension}`, filters: [{ name: extension.toUpperCase(), extensions: [extension] }] });
  if (result.canceled) return null;
  const destination = result.filePath.toLowerCase().endsWith(`.${extension}`) ? result.filePath : `${result.filePath}.${extension}`;
  await job('exportSong', params => music.exportStems(app, project, projectDir, destination, options.selection, options.format, params));
  lastExport = destination; return destination;
});
handle('export-cover', async format => {
  idle(); requireProject('song');
  if (!['wav', 'mp3'].includes(format)) throw new Error('INVALID_VALUE');
  const result = await dialog.showSaveDialog(window, { title: songText('exportCover'), defaultPath: `${project.name}-my-cover.${format}`, filters: [{ name: format.toUpperCase(), extensions: [format] }] });
  if (result.canceled) return null;
  const destination = result.filePath.toLowerCase().endsWith(`.${format}`) ? result.filePath : `${result.filePath}.${format}`;
  music.safeDestination(project, projectDir, destination);
  const temporary = path.join(path.dirname(destination), `.aerodub-${randomUUID()}.${format}`);
  try { await job('exportSong', options => music.cover(project, projectDir, temporary, format, options)); await fs.rename(temporary, destination); lastExport = destination; return destination; }
  finally { await fs.rm(temporary, { force: true }); }
});

app.whenReady().then(async () => {
  await fs.mkdir(app.getPath('userData'), { recursive: true });
  settings = { language: 'en', reduceMotion: false, micDeviceId: '', portalSfxEnabled: true, autoInputLevel: true, voice: { ...voiceConfig.defaults }, shortcuts: { ...shortcutsConfig.defaults } };
  try { const saved = JSON.parse(await fs.readFile(path.join(app.getPath('userData'), 'settings.json'), 'utf8')); if (Object.hasOwn(dialogStrings, saved.language)) settings.language = saved.language; settings.reduceMotion = Boolean(saved.reduceMotion); if (typeof saved.micDeviceId === 'string' && saved.micDeviceId.length <= 512) settings.micDeviceId = saved.micDeviceId; if (typeof saved.portalSfxEnabled === 'boolean') settings.portalSfxEnabled = saved.portalSfxEnabled; if (typeof saved.autoInputLevel === 'boolean') settings.autoInputLevel = saved.autoInputLevel; if (saved.voice) settings.voice = voiceConfig.validate(saved.voice); } catch {}
  try { const saved = JSON.parse(await fs.readFile(path.join(app.getPath('userData'), 'settings.json'), 'utf8')); if (saved.shortcuts) settings.shortcuts = shortcutsConfig.validate(saved.shortcuts); } catch {}
  protocol.handle('aeromedia', async request => {
    const token = new URL(request.url).pathname.slice(1);
    const file = allowedMedia.get(token);
    if (!file) return new Response('Forbidden', { status: 403 });
    try {
      const { size } = await fs.stat(file);
      let start = 0, end = size - 1, status = 200;
      const range = request.headers.get('range');
      if (range) {
        const match = range.match(/^bytes=(\d*)-(\d*)$/);
        if (!match || (!match[1] && !match[2])) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
        if (!match[1]) start = Math.max(0, size - Number(match[2]));
        else { start = Number(match[1]); if (match[2]) end = Math.min(end, Number(match[2])); }
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
        status = 206;
      }
      const headers = { 'Accept-Ranges': 'bytes', 'Content-Length': String(end - start + 1), 'Content-Type': path.extname(file) === '.mp4' ? 'video/mp4' : 'audio/wav', 'Access-Control-Allow-Origin': 'null' };
      if (status === 206) headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
      return new Response(request.method === 'HEAD' ? null : Readable.toWeb(createReadStream(file, { start, end })), { status, headers });
    } catch { return new Response('Media unavailable', { status: 404 }); }
  });
  const trusted = contents => contents === window?.webContents;
  session.defaultSession.setPermissionRequestHandler((contents, permission, callback, details) => callback(trusted(contents) && (permission === 'fullscreen' || (permission === 'media' && details.mediaTypes?.every(type => type === 'audio')))));
  session.defaultSession.setPermissionCheckHandler((contents, permission) => trusted(contents) && ['media', 'fullscreen'].includes(permission));
  window = new BrowserWindow({ width: 1280, height: 880, minWidth: 720, minHeight: 640, backgroundColor: '#a6d9ef', title: 'AeroDub Studio', icon: path.join(__dirname, 'renderer', 'app-icon.png'), titleBarStyle: 'hidden', titleBarOverlay: { color: '#e8f5fd', symbolColor: '#15374c', height: 80 }, autoHideMenuBar: true, webPreferences: { preload: path.join(__dirname, 'preload.js'), nodeIntegration: false, contextIsolation: true, sandbox: true } });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  await window.loadFile(path.join(__dirname, 'renderer', 'index.html'));
});
app.on('before-quit', () => activeJob?.abort());
app.on('window-all-closed', () => app.quit());
