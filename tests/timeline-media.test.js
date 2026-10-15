const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const media = require('../src/media');
const timeline = require('../src/timeline');
const root = path.join(__dirname, '../test-output/timeline-media');
async function band(file, start, frequency) {
  const data = await media.run(media.ffmpeg, ['-v', 'error', '-ss', String(start), '-i', file, '-t', '0.25', '-af', `bandpass=f=${frequency}:t=h:w=20`, '-ac', '1', '-f', 'f32le', 'pipe:1']);
  let sum = 0; for (let i = 0; i < data.length; i += 4) sum += data.readFloatLE(i) ** 2;
  return Math.sqrt(sum / (data.length / 4));
}
async function pixel(file, position) {
  return media.run(media.ffmpeg, ['-v', 'error', '-ss', String(position), '-i', file, '-vf', 'scale=1:1', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1']);
}
test('Video, original sound and split dub clips independently change real preview and MP4 output', async () => {
  await fs.mkdir(root, { recursive: true });
  const source = path.join(root, 'source.mp4');
  await media.run(media.ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=red:s=160x90:r=25:d=2', '-f', 'lavfi', '-i', 'color=c=blue:s=160x90:r=25:d=2', '-f', 'lavfi', '-i', "aevalsrc='if(lt(t,2),0.12*sin(2*PI*250*t),0.12*sin(2*PI*500*t))':s=48000:d=4", '-filter_complex', '[0:v][1:v]concat=n=2:v=1:a=0[v]', '-map', '[v]', '-map', '2:a', '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', source]);
  const bytes = await fs.readFile(source), dir = path.join(root, 'project'), info = await media.prepare(source, dir);
  await fs.mkdir(path.join(dir, 'takes', 'dub'), { recursive: true });
  await media.run(media.ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=1200:sample_rate=48000:duration=1', path.join(dir, 'takes/dub/raw.wav')]);
  await fs.mkdir(path.join(dir, 'takes', 'second'), { recursive: true });
  await media.run(media.ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=1700:sample_rate=48000:duration=1', path.join(dir, 'takes/second/raw.wav')]);
  const videoClips = timeline.split(timeline.trackClips({ duration: 4 }, 'video')[0], 2);
  videoClips[1].id = 'video-right'; videoClips[1].offset = 1;
  const sourceClips = timeline.split(timeline.trackClips({ duration: 4 }, 'original')[0], 2);
  sourceClips[0].muted = true; sourceClips[1].id = 'audio-right'; sourceClips[1].offset = .5;
  const take = { id: 'dub', partId: 'part-1', trackId: 'dub-1', start: 0, offset: .1, duration: 1, trimStart: 0, trimEnd: .5, gain: 1, selected: true, muted: false, clean: false, splits: [{ id: 'dub-right', offset: 3.1, trimStart: .5, trimEnd: 1, gain: 2, muted: false, effects: { pitch: 12, pan: -1 } }] };
  const second = { ...take, id: 'second', trackId: 'dub-2', splits: [] };
  const project = { source, ...info, videoClips, sourceClips, takes: [take, second], dubTracks: [{ id: 'dub-1', name: 'Dub 1', gain: 1, muted: false }, { id: 'dub-2', name: 'Dub 2', gain: 1, muted: false }], sourceGain: 1, duckGain: 1, dubGain: 1 };
  const mix = path.join(root, 'mix.wav'), output = path.join(root, 'output.mp4'), preview = path.join(root, 'video-preview.mp4');
  await media.render(project, dir, mix); await media.render(project, dir, output, { video: true }); await media.renderVideoPreview(project, dir, preview);
  assert.ok(await band(output, .15, 1200) > .05);
  assert.ok(await band(output, .15, 1700) > .05, 'Two simultaneous speakers must both reach the MP4');
  assert.ok(await band(output, 3.2, 2400) > .05, 'The second split has independent timing, gain and octave pitch');
  assert.ok(await band(output, .7, 500) > .05, 'The moved original-audio slice must use the correct source samples');
  assert.ok(await band(output, .7, 250) < .01, 'Muted original slice must be absent');
  assert.ok(Math.abs(await band(output, 3.2, 2400) - await band(mix, 3.2, 2400)) < .01);
  for (const file of [output, preview]) { const blue = await pixel(file, 1.5); assert.ok(blue[2] > blue[0] * 3); const black = await pixel(file, 3.5); assert.ok(Math.max(...black) < 10); }
  const audition = path.join(root, 'audition.wav'); await media.auditionTake(project, take, dir, audition);
  assert.ok(Math.abs((await media.probe(audition)).duration - 3.5) < .02);
  assert.ok(await band(audition, 3.15, 2400) > .05, 'Easy-mode audition must include split pieces and their individual effects');
  const allVoices = path.join(root, 'all-voices.wav'); await media.auditionPart(project, 'part-1', dir, allVoices);
  assert.ok(await band(allVoices, .1, 1200) > .05 && await band(allVoices, .1, 1700) > .05, 'Per-part listening must include simultaneous tracks');
  project.dubTracks[1].muted = true;
  const muted = path.join(root, 'track-muted.wav'); await media.render(project, dir, muted);
  assert.ok(await band(muted, .15, 1700) < .01 && await band(muted, .15, 1200) > .05, 'Track mute must isolate one speaker in the actual mix');
  const empty = path.join(root, 'empty-tracks.mp4'); await media.render({ ...project, videoClips: [], sourceClips: [], takes: [] }, dir, empty, { video: true });
  assert.ok(Math.max(...await pixel(empty, 1)) < 10); assert.ok(await band(empty, .3, 500) < .0001, 'Deleting every source clip must produce a valid silent, black interval');
  assert.deepEqual(await fs.readFile(source), bytes);
});
