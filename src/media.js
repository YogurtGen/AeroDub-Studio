const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const voiceConfig = require('./voice');
const timeline = require('./timeline');
const clipAudio = require('./clip-audio');
const clipFilter = take => { const filter = clipAudio.filter(take.effects, take.trimEnd - take.trimStart); return filter ? filter + ',' : ''; };
const takeFile = take => (take.effects?.cleanup === 'clean' || (take.effects?.cleanup !== 'raw' && take.clean)) ? 'clean.wav' : 'raw.wav';
const trackGain = (project, take) => timeline.dubTracks(project).find(track => track.id === (take.trackId || 'dub-1'))?.gain ?? 1;

const unpack = file => file.replace(/app\.asar([\\/])/, 'app.asar.unpacked$1');
const ffmpeg = unpack(require('ffmpeg-static'));
const ffprobe = unpack(require('ffprobe-static').path);
const cleanFilter = `highpass=f=75,${clipAudio.denoiseFilter},lowpass=f=14000,alimiter=limit=0.95:level=false:latency=true`;

function run(binary, args, { signal, onProgress, duration, onData, onStderr } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error('CANCELLED'));
    const child = spawn(binary, args, { windowsHide: true, shell: false });
    const chunks = [];
    let stderr = '', progress = '';
    const cancel = () => child.kill();
    signal?.addEventListener('abort', cancel, { once: true });
    child.stdout.on('data', chunk => onData ? onData(chunk) : chunks.push(chunk));
    child.stderr.on('data', chunk => {
      onStderr?.(chunk.toString());
      stderr = (stderr + chunk.toString()).slice(-6000);
      progress += chunk.toString();
      const lines = progress.split(/\r?\n/);
      progress = lines.pop();
      for (const line of lines) {
        if (line.startsWith('out_time_us=') && duration > 0) {
          const elapsed = Number(line.split('=')[1]);
          if (Number.isFinite(elapsed)) onProgress?.(Math.max(0, Math.min(1, elapsed / 1e6 / duration)));
        }
      }
    });
    child.on('error', reject);
    child.on('close', code => {
      signal?.removeEventListener('abort', cancel);
      if (signal?.aborted) reject(new Error('CANCELLED'));
      else if (code !== 0) reject(new Error(stderr || `Media process exited: ${code}`));
      else resolve(Buffer.concat(chunks));
    });
  });
}

async function probe(file, options) {
  const data = await run(ffprobe, ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', file], options);
  const info = JSON.parse(data.toString());
  const duration = Number(info.format.duration);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('INVALID_MEDIA');
  return { duration, streams: info.streams, size: Number(info.format.size) };
}

async function waveform(file, duration, options = {}) {
  const bucket = Math.max(1, Math.ceil(duration * 8000 / 2048));
  const peaks = [];
  let remainder = Buffer.alloc(0), count = 0, peak = 0;
  await run(ffmpeg, ['-v', 'error', '-i', file, '-vn', '-ac', '1', '-ar', '8000', '-f', 'f32le', 'pipe:1'], {
    ...options,
    onData(chunk) {
      const data = Buffer.concat([remainder, chunk]);
      const end = data.length - data.length % 4;
      for (let i = 0; i < end; i += 4) {
        peak = Math.max(peak, Math.abs(data.readFloatLE(i)));
        if (++count === bucket) { peaks.push(peak); count = 0; peak = 0; }
      }
      remainder = data.subarray(end);
    }
  });
  if (count) peaks.push(peak);
  return peaks;
}

async function prepare(source, dir, options = {}) {
  const info = await probe(source, options);
  const video = info.streams.find(s => s.codec_type === 'video');
  if (!video) throw new Error('VIDEO_REQUIRED');
  await fs.mkdir(dir, { recursive: true });
  const audio = path.join(dir, 'reference.wav');
  const preview = path.join(dir, 'preview.mp4');
  const audioStream = info.streams.find(s => s.codec_type === 'audio');
  const common = ['-y', '-v', 'error', '-nostats', '-progress', 'pipe:2'];
  await run(ffmpeg, [...common, '-i', source, '-map', '0:v:0', '-an', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-pix_fmt', 'yuv420p', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-movflags', '+faststart', preview], {
    ...options, duration: info.duration, onProgress: value => options.onProgress?.(value * 0.8)
  });
  const audioInput = audioStream ? ['-i', source, '-map', '0:a:0', '-af', 'aresample=async=1:first_pts=0,apad'] : ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo'];
  await run(ffmpeg, [...common, ...audioInput, '-t', String(info.duration), '-vn', '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', audio], options);
  const peaks = await waveform(audio, info.duration, options);
  const silences = [], silentRanges = [];
  let silenceStart = null;
  let silenceLog = '';
  await run(ffmpeg, ['-v', 'info', '-i', audio, '-af', 'silencedetect=noise=-35dB:d=0.25', '-f', 'null', '-'], {
    signal: options.signal,
    onStderr(chunk) {
      silenceLog += chunk;
      const lines = silenceLog.split(/\r?\n/); silenceLog = lines.pop();
      for (const line of lines) {
        const start = line.match(/silence_start: ([\d.]+)/);
        if (start) silenceStart = Number(start[1]);
        const match = line.match(/silence_end: ([\d.]+).*silence_duration: ([\d.]+)/);
        if (match) {
          const end = Math.min(info.duration, Number(match[1]));
          const begin = Math.max(0, silenceStart ?? end - Number(match[2]));
          silentRanges.push({ start: begin, end }); silences.push((begin + end) / 2); silenceStart = null;
        }
      }
    }
  });
  if (silenceStart !== null) silentRanges.push({ start: silenceStart, end: info.duration });
  options.onProgress?.(1);
  return { duration: info.duration, width: video.width, height: video.height, fps: video.avg_frame_rate, codec: video.codec_name, hasAudio: Boolean(audioStream), peaks, silences, silentRanges };
}

async function processTake(input, dir, options = {}) {
  const raw = path.join(dir, 'raw.wav');
  const clean = path.join(dir, 'clean.wav');
  await run(ffmpeg, ['-y', '-v', 'error', '-i', input, '-vn', '-af', 'asetpts=PTS-STARTPTS,aresample=async=1:first_pts=0', '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s16le', raw], options);
  const { duration } = await probe(raw, options);
  await run(ffmpeg, ['-y', '-v', 'error', '-i', raw, '-af', `${cleanFilter},apad,atrim=duration=${duration}`, '-c:a', 'pcm_s16le', clean], options);
  const effects = voiceConfig.filter(options.voice);
  if (effects) for (const file of [raw, clean]) {
    const temporary = file + '.fx.wav';
    try { await run(ffmpeg, ['-y', '-v', 'error', '-i', file, '-af', `${effects},apad,atrim=duration=${duration}`, '-c:a', 'pcm_s16le', temporary], options); await fs.rename(temporary, file); }
    finally { await fs.rm(temporary, { force: true }); }
  }
  return { duration, peaks: await waveform(clean, duration, options) };
}

function selectedTakes(project) {
  return timeline.clips(project.takes).filter(t => t.selected && !t.muted && !t.removed && !timeline.dubTracks(project).find(track => track.id === t.trackId)?.muted).map(t => {
    const start = t.start + t.offset;
    const trimStart = t.trimStart + Math.max(0, -start);
    const end = Math.min(t.trimEnd, t.duration, trimStart + project.duration - Math.max(0, start));
    return { ...t, gain: t.gain * trackGain(project, t), start: Math.max(0, start), trimStart, trimEnd: end };
  }).filter(t => t.trimEnd > t.trimStart && t.start < project.duration);
}

function videoFilters(project) {
  const fps = /^\d+\/\d+$/.test(project.fps || '') && project.fps !== '0/0' ? project.fps : '30';
  const filters = [`color=c=black:s=${project.width - project.width % 2}x${project.height - project.height % 2}:r=${fps}:d=${project.duration},format=yuv420p[vbase]`];
  let previous = 'vbase', index = 0;
  for (const clip of timeline.trackClips(project, 'video').filter(clip => !clip.muted)) {
    const range = timeline.bounds(clip), next = `vo${index}`;
    filters.push(`[0:v]trim=start=${clip.trimStart}:end=${clip.trimEnd},setpts=PTS-STARTPTS+${range.start}/TB[vc${index}]`);
    filters.push(`[${previous}][vc${index}]overlay=eof_action=pass:repeatlast=0:enable='gte(t,${range.start})*lt(t,${range.end})'[${next}]`);
    previous = next; index++;
  }
  filters.push(`[${previous}]format=yuv420p[video-edited]`);
  return filters;
}
async function renderVideoPreview(project, dir, destination, options = {}) {
  if (!project.fps) project = { ...project, fps: (await probe(path.join(dir, 'preview.mp4'), options)).streams.find(stream => stream.codec_type === 'video').avg_frame_rate };
  return run(ffmpeg, ['-y', '-v', 'error', '-nostats', '-progress', 'pipe:2', '-i', path.join(dir, 'preview.mp4'), '-filter_complex', videoFilters(project).join(';'), '-map', '[video-edited]', '-an', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-t', String(project.duration), '-movflags', '+faststart', destination], { ...options, duration: project.duration });
}
function mixArgs(project, dir, destination, video) {
  const takes = selectedTakes(project);
  const editedVideo = project.videoClips && timeline.videoLayout(project) !== timeline.videoLayout({ ...project, videoClips: undefined });
  const args = ['-y', '-v', 'error', '-nostats', '-progress', 'pipe:2'];
  if (video) args.push('-i', project.source);
  args.push('-i', path.join(dir, 'reference.wav'));
  const base = video ? 1 : 0;
  for (const take of takes) args.push('-i', path.join(dir, 'takes', take.takeId, takeFile(take)));
  const ranges = takes.map(t => `between(t,${t.start.toFixed(6)},${(t.start + t.trimEnd - t.trimStart).toFixed(6)})`);
  const duck = ranges.length ? `,volume=${project.duckGain}:enable='${ranges.join('+')}'` : '';
  const filters = [];
  if (project.sourceClips) {
    filters.push(`anullsrc=r=48000:cl=stereo,atrim=duration=${project.duration}[source-silence]`);
    const clips = project.sourceClips.filter(clip => !clip.muted);
    clips.forEach((clip, index) => filters.push(`[${base}:a]atrim=start=${clip.trimStart}:end=${clip.trimEnd},asetpts=PTS-STARTPTS,${clipFilter(clip)}volume=${clip.gain},adelay=${Math.round(clip.offset * 1000)}:all=1[s${index}]`));
    filters.push('[source-silence]' + clips.map((_, index) => `[s${index}]`).join('') + `amix=inputs=${clips.length + 1}:normalize=0:duration=first[source-edited]`);
    filters.push(`[source-edited]volume=${project.sourceGain}${duck},apad,atrim=duration=${project.duration}[original]`);
  } else filters.push(`[${base}:a]volume=${project.sourceGain}${duck},apad,atrim=duration=${project.duration}[original]`);
  takes.forEach((take, index) => {
    const length = take.trimEnd - take.trimStart;
    const fade = Math.min(0.012, length / 3);
    filters.push(`[${base + index + 1}:a]atrim=start=${take.trimStart}:end=${take.trimEnd},asetpts=PTS-STARTPTS,${clipFilter(take)}volume=${take.gain * (project.dubGain ?? 1)},afade=t=in:d=${fade},afade=t=out:st=${length - fade}:d=${fade},adelay=${Math.round(take.start * 1000)}:all=1[t${index}]`);
  });
  const inputs = '[original]' + takes.map((_, i) => `[t${i}]`).join('');
  filters.push(`${inputs}amix=inputs=${takes.length + 1}:normalize=0:duration=first,alimiter=limit=0.95:level=false:latency=true[mix]`);
  if (video && editedVideo) filters.push(...videoFilters(project));
  args.push('-filter_complex', filters.join(';'));
  if (video) {
    args.push('-map', editedVideo ? '[video-edited]' : '0:v:0', '-map', '[mix]');
    // shortcut: stream copy is limited to H.264/HEVC; other codecs use H.264 for MP4 compatibility.
    if (!editedVideo && ['h264', 'hevc'].includes(project.codec)) args.push('-c:v', 'copy');
    else args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p');
    args.push('-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart');
  } else args.push('-map', '[mix]', '-c:a', 'pcm_s16le');
  args.push('-t', String(project.duration), destination);
  return args;
}

async function render(project, dir, destination, options = {}) {
  if (options.video && project.videoClips && !project.fps) project = { ...project, fps: (await probe(project.source, options)).streams.find(stream => stream.codec_type === 'video').avg_frame_rate };
  return run(ffmpeg, mixArgs(project, dir, destination, options.video), { ...options, duration: project.duration });
}

async function thumbnails(file, duration, options = {}) {
  const bytes = await run(ffmpeg, ['-v', 'error', '-i', file, '-vf', `fps=12/${duration},scale=120:68:force_original_aspect_ratio=decrease,pad=120:68:(ow-iw)/2:(oh-ih)/2,tile=12x1`, '-frames:v', '1', '-q:v', '4', '-f', 'image2pipe', '-vcodec', 'mjpeg', 'pipe:1'], options);
  return `data:image/jpeg;base64,${bytes.toString('base64')}`;
}

async function auditionTake(project, take, dir, destination, options = {}) {
  if (take.splits?.length && !options.individual) {
    const clips = timeline.clips([take]).filter(clip => !clip.muted && !clip.removed && !timeline.dubTracks(project).find(track => track.id === clip.trackId)?.muted);
    if (!clips.length) throw new Error('INVALID_VALUE');
    const start = Math.min(...clips.map(clip => timeline.bounds(clip).start));
    const args = ['-y', '-v', 'error'];
    for (const clip of clips) args.push('-i', path.join(dir, 'takes', take.id, takeFile(clip)));
    const filters = clips.map((clip, index) => `[${index}:a]atrim=start=${clip.trimStart}:end=${clip.trimEnd},asetpts=PTS-STARTPTS,${clipFilter(clip)}volume=${clip.gain * trackGain(project, clip) * (project.dubGain ?? 1)},adelay=${Math.round((timeline.bounds(clip).start - start) * 1000)}:all=1[c${index}]`);
    filters.push(clips.map((_, index) => `[c${index}]`).join('') + `amix=inputs=${clips.length}:normalize=0:duration=longest,alimiter=limit=0.95:level=false:latency=true[out]`);
    return run(ffmpeg, [...args, '-filter_complex', filters.join(';'), '-map', '[out]', '-c:a', 'pcm_s16le', destination], options);
  }
  const input = path.join(dir, 'takes', take.takeId || take.id, takeFile(take));
  const filter = `atrim=start=${take.trimStart}:end=${take.trimEnd},asetpts=PTS-STARTPTS,${clipFilter(take)}volume=${take.gain * trackGain(project, take) * (project.dubGain ?? 1)},alimiter=limit=0.95:level=false:latency=true`;
  return run(ffmpeg, ['-y', '-v', 'error', '-i', input, '-af', filter, '-c:a', 'pcm_s16le', destination], options);
}
async function auditionSource(project, clip, dir, destination, options = {}) {
  const filter = `atrim=start=${clip.trimStart}:end=${clip.trimEnd},asetpts=PTS-STARTPTS,${clipFilter(clip)}volume=${clip.gain * project.sourceGain},alimiter=limit=0.95:level=false:latency=true`;
  return run(ffmpeg, ['-y', '-v', 'error', '-i', path.join(dir, 'reference.wav'), '-af', filter, '-c:a', 'pcm_s16le', destination], options);
}
async function auditionPart(project, partId, dir, destination, options = {}) {
  const clips = selectedTakes(project).filter(clip => clip.partId === partId);
  if (!clips.length) throw new Error('INVALID_VALUE');
  const start = Math.min(...clips.map(clip => clip.start)), end = Math.max(...clips.map(clip => clip.start + clip.trimEnd - clip.trimStart));
  const args = ['-y', '-v', 'error'];
  for (const clip of clips) args.push('-i', path.join(dir, 'takes', clip.takeId, takeFile(clip)));
  const filters = clips.map((clip, index) => `[${index}:a]atrim=start=${clip.trimStart}:end=${clip.trimEnd},asetpts=PTS-STARTPTS,${clipFilter(clip)}volume=${clip.gain * (project.dubGain ?? 1)},adelay=${Math.round((clip.start - start) * 1000)}:all=1[c${index}]`);
  filters.push(clips.map((_, index) => `[c${index}]`).join('') + `amix=inputs=${clips.length}:normalize=0:duration=longest,alimiter=limit=0.95:level=false:latency=true[out]`);
  await run(ffmpeg, [...args, '-filter_complex', filters.join(';'), '-map', '[out]', '-t', String(end - start), '-c:a', 'pcm_s16le', destination], options);
  return { start, end };
}

module.exports = { ffmpeg, ffprobe, run, probe, prepare, waveform, processTake, selectedTakes, mixArgs, render, auditionTake, auditionSource, auditionPart, cleanFilter, renderVideoPreview, thumbnails };
