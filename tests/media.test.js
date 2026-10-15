const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const media = require('../src/media');
const { smartParts, divideParts, migrateProject } = require('../src/parts');
const root = path.join(__dirname, '..', 'test-output', 'media');

async function rms(file, start, duration, filter = 'anull') {
  const data = await media.run(media.ffmpeg, ['-v', 'error', '-ss', String(start), '-i', file, '-t', String(duration), '-af', filter, '-ac', '1', '-ar', '48000', '-f', 'f32le', 'pipe:1']);
  let squares = 0;
  for (let i = 0; i + 4 <= data.length; i += 4) squares += data.readFloatLE(i) ** 2;
  return Math.sqrt(squares / (data.length / 4));
}
test('Dubbing export preserves timing, ducking, trims and original media; noise cleanup attenuates rumble', async () => {
  await fs.mkdir(root, { recursive: true });
  const source = path.join(root, 'video asli 漢字.mp4');
  const capture = path.join(root, 'mic.wav');
  await media.run(media.ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=25:duration=4', '-f', 'lavfi', '-i', 'sine=frequency=250:sample_rate=48000:duration=4', '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', '-shortest', source]);
  const original = await fs.readFile(source);
  await media.run(media.ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'aevalsrc=0.22*sin(2*PI*1200*t)+0.10*sin(2*PI*35*t):s=48000:d=1.4', capture]);
  const dir = path.join(root, 'project');
  const info = await media.prepare(source, dir);
  assert.ok(Math.abs(info.duration - 4) < .1);
  assert.ok(info.peaks.length > 1000 && Math.max(...info.peaks) > .05);
  const takeDir = path.join(dir, 'takes', 'take1'); await fs.mkdir(takeDir, { recursive: true });
  const take = await media.processTake(capture, takeDir);
  const rawLow = await rms(path.join(takeDir, 'raw.wav'), .2, .8, 'lowpass=f=60');
  const cleanLow = await rms(path.join(takeDir, 'clean.wav'), .2, .8, 'lowpass=f=60');
  assert.ok(cleanLow < rawLow * .5, `Rumble suppression failed: ${cleanLow} vs ${rawLow}`);
  const project = { source, ...info, sourceGain: 1, duckGain: .1, takes: [{ id: 'take1', start: 1, offset: .2, duration: take.duration, trimStart: .1, trimEnd: 1.1, gain: 1, clean: true, selected: true, muted: false }] };
  const output = path.join(root, 'dubbed.mp4');
  await media.render(project, dir, output, { video: true });
  const outputInfo = await media.probe(output);
  assert.ok(outputInfo.streams.some(s => s.codec_type === 'video'));
  assert.ok(outputInfo.streams.some(s => s.codec_type === 'audio'));
  assert.ok(Math.abs(outputInfo.duration - info.duration) < .1);
  const outsideVoice = await rms(output, .2, .5, 'highpass=f=900');
  const insideVoice = await rms(output, 1.35, .5, 'highpass=f=900');
  const afterVoice = await rms(output, 2.5, .5, 'highpass=f=900');
  assert.ok(insideVoice > outsideVoice * 10 && insideVoice > afterVoice * 10, 'Take must occupy its shifted, trimmed range only');
  const outsideSource = await rms(output, .2, .5, 'lowpass=f=500');
  const insideSource = await rms(output, 1.35, .5, 'lowpass=f=500');
  assert.ok(insideSource < outsideSource * .4, 'Original sound must duck only inside the take');
  assert.deepEqual(await fs.readFile(source), original, 'Original video changed');
  const mix = path.join(root, 'mix.wav'); await media.render(project, dir, mix);
  const mixVoice = await rms(mix, 1.35, .5, 'highpass=f=900');
  assert.ok(Math.abs(mixVoice - insideVoice) < .02, 'Preview and exported voice level must agree');
  project.dubGain = 2;
  const louder = path.join(root, 'louder.wav'); await media.render(project, dir, louder);
  const loudVoice = await rms(louder, 1.35, .5, 'highpass=f=900');
  assert.ok(loudVoice > mixVoice * 1.8, 'Global dubbing volume must actually boost the output');
  const audition = path.join(root, 'audition.wav'); await media.auditionTake(project, project.takes[0], dir, audition);
  const auditionVoice = await rms(audition, .15, .5, 'highpass=f=900');
  assert.ok(Math.abs(auditionVoice - loudVoice) < .02, 'Take audition must use the same boosted gain as the mix');
  const timeline = require('../src/timeline');
  const originalTake = { ...project.takes[0] };
  project.takes[0] = timeline.edit(timeline.edit(originalTake, 'move', 2.5, project.duration), 'left', 2.7, project.duration);
  const edited = path.join(root, 'timeline-edited.mp4'); await media.render(project, dir, edited, { video: true });
  assert.ok(await rms(edited, 1.35, .3, 'highpass=f=900') < outsideVoice * 1.5 + .001, 'Moving a clip removes audio from the old position');
  assert.ok(await rms(edited, 2.85, .3, 'highpass=f=900') > .05, 'Timeline move and left trim must reach the actual MP4');
  assert.ok(await rms(edited, 2.55, .08, 'highpass=f=900') < outsideVoice * 1.5 + .001, 'Left trim must remove the beginning at its timeline position');
  project.takes[0] = originalTake;
  project.dubGain = 1;
  project.takes[0].selected = false;
  const noTake = path.join(root, 'no-take.wav'); await media.render(project, dir, noTake);
  assert.ok(await rms(noTake, 1.35, .5, 'highpass=f=900') < insideVoice / 10, 'Unselected take must not be exported');
  assert.deepEqual(media.selectedTakes({ duration: 4, takes: [{ selected: true, muted: false, start: 0, offset: -.2, trimStart: 0, trimEnd: 1, duration: 1 }] })[0].trimStart, .2);
});
test('Smart cuts use audible intervals, preserve 1–3s context when available, and keep silent gaps out', () => {
  const silent = [{ start: 0, end: 2 }, ...Array.from({ length: 6 }, (_, i) => ({ start: 3 + i * 5, end: 7 + i * 5 })), { start: 33, end: 35 }];
  const parts = smartParts(35, silent, 1.5);
  assert.equal(parts.length, 7);
  assert.equal(parts[0].start, .5); assert.equal(parts[0].end, 4.5);
  assert.equal(parts[6].voiceStart, 32); assert.equal(parts[6].end, 34.5);
  for (let i = 1; i < parts.length; i++) assert.ok(parts[i].start > parts[i - 1].end);
  const padded = smartParts(35, silent, 3);
  for (let i = 1; i < padded.length; i++) assert.ok(padded[i].start >= padded[i - 1].end, 'Context may not overlap adjacent takes');
  assert.deepEqual(smartParts(4, [{ start: 0, end: 4 }]), []);
  assert.equal(smartParts(25).length, 3);
  assert.equal(divideParts(4001).length, 500);
  assert.throws(() => smartParts(35, silent, 4), /INVALID_VALUE/);
  const legacy = { duration: 4, takes: [{ id: 'a', start: 1, selected: true }, { id: 'b', start: 1, selected: true }] };
  migrateProject(legacy); assert.equal(legacy.dubGain, 1); assert.equal(legacy.takes.length, 2); assert.equal(legacy.takes[0].selected, false); assert.equal(legacy.takes[1].selected, true);
  const empty = { duration: 4, parts: [], takes: [] }; migrateProject(empty); assert.deepEqual(empty.parts, []);
});
test('Actual audio smart cuts detect seven audible parts and export all seven in the same timeline', async () => {
  await fs.mkdir(root, { recursive: true });
  const source = path.join(root, 'seven-parts.mp4');
  await media.run(media.ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=25:duration=35', '-f', 'lavfi', '-i', "aevalsrc='if(between(mod(t,5),2,3),0.12*sin(2*PI*250*t),0)':s=48000:d=35", '-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac', '-shortest', source]);
  const dir = path.join(root, 'seven-project'); const info = await media.prepare(source, dir);
  const parts = smartParts(info.duration, info.silentRanges, 1.5); assert.equal(parts.length, 7);
  assert.ok(Math.abs(parts[0].voiceStart - 2) < .05);
  const takes = [];
  for (let i = 0; i < parts.length; i++) {
    const id = `take${i}`, takeDir = path.join(dir, 'takes', id); await fs.mkdir(takeDir, { recursive: true });
    const capture = path.join(takeDir, 'raw.wav');
    await media.run(media.ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', `sine=frequency=${1000 + i * 100}:sample_rate=48000:duration=0.6`, capture]);
    takes.push({ id, partId: parts[i].id, start: parts[i].voiceStart, offset: 0, duration: .6, trimStart: 0, trimEnd: .6, gain: 1, clean: false, selected: true, muted: false });
  }
  const output = path.join(root, 'seven-dubbed.mp4'); await media.render({ source, ...info, parts, dubGain: 2, sourceGain: 1, duckGain: 0, takes }, dir, output, { video: true });
  for (const part of parts) assert.ok(await rms(output, part.voiceStart + .1, .3, 'highpass=f=900') > .05, 'Each part must be audible in the combined export');
  assert.ok(await rms(output, 4.7, .2, 'highpass=f=900') < .005, 'Long silent gap must remain empty');
  const out = await media.probe(output); assert.ok(Math.abs(out.duration - 35) < .05);
});
test('Audio-less video and cancellation leave the source intact', async () => {
  const source = path.join(root, 'silent.mp4');
  await fs.mkdir(root, { recursive: true });
  await media.run(media.ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=blue:s=160x90:r=25:d=1', '-an', '-c:v', 'libx264', source]);
  const info = await media.prepare(source, path.join(root, 'silent-project'));
  assert.equal(info.hasAudio, false); assert.equal(Math.max(...info.peaks), 0);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(media.probe(source, { signal: controller.signal }), /CANCELLED/);
  const live = new AbortController();
  const operation = media.run(media.ffmpeg, ['-v', 'error', '-re', '-f', 'lavfi', '-i', 'sine=duration=30', '-f', 'null', '-'], { signal: live.signal });
  setTimeout(() => live.abort(), 100);
  await assert.rejects(operation, /CANCELLED/);
  await assert.rejects(media.probe(path.join(root, 'not-found.mp4')));
});

test('Smart dub splits adjacent different speakers while preserving quiet gaps, padding and repeated identities', () => {
  const turns = [{ start: 1, end: 4, speaker: 1 }, { start: 4, end: 7, speaker: 2 }, { start: 7, end: 10, speaker: 1 }];
  const parts = smartParts(12, [{ start: 0, end: 1 }, { start: 10, end: 12 }], 1.5, turns);
  assert.equal(parts.length, 3);
  assert.deepEqual(parts.map(part => part.speakers), [[1], [2], [1]]);
  assert.deepEqual(parts.map(part => [part.start, part.end]), [[0, 4], [4, 7], [7, 11.5]]);
  assert.equal(smartParts(12, [], 1.5, turns.map(turn => ({ ...turn, speaker: 1 }))).length, 1, 'Same voice does not introduce new cuts');
  const overlapping = smartParts(12, [], 1.5, [{ start: 1, end: 8, speaker: 1 }, { start: 4, end: 7, speaker: 2 }]);
  assert.equal(overlapping.length, 3); assert.deepEqual(overlapping.map(part => part.speakers), [[1], [1, 2], [1]]);
  for (const part of smartParts(12, [], 3, turns)) assert.ok(part.end > part.start);
  assert.deepEqual(smartParts(12, [], 1.5, []).map(part => [part.start, part.end]), [[0, 12]], 'Audio fallback remains available');
});
test('Speech cuts skip music-only gaps and never split a detected utterance into equal phrases', () => {
  const turns = [{ start: 1, end: 2, speaker: 1 }, { start: 10, end: 25, speaker: 2 }, { start: 26.5, end: 28, speaker: 2 }];
  const parts = smartParts(30, [], 1.5, turns);
  assert.equal(parts.length, 3);
  assert.ok(!parts.some(part => part.start < 15 && part.end > 15 && part.voiceStart !== 10));
  assert.equal(parts[1].voiceEnd, 25); assert.equal(parts[1].start, 8.5); assert.equal(parts[0].end, 3.5);
  assert.ok(parts[1].start > parts[0].end, 'Background sound does not fill a long speech gap');
});

test('Independent local consensus recovers changes that global voice clustering merges', () => {
  const turns = [{ start: .2, end: 10.5, speaker: 1 }];
  const parts = smartParts(12, [], 1.5, turns, [{ time: 3.58, votes: 4 }, { time: 7.19, votes: 7 }, { time: 9, votes: 2 }]);
  assert.equal(parts.length, 3); assert.equal(parts[0].end, 3.58); assert.equal(parts[1].end, 7.19);
  assert.ok(parts.every(part => part.review));
  const overlap = smartParts(12, [], 1.5, [{ start: 1, end: 5, speaker: 1 }, { start: 3, end: 4, speaker: 2 }, { start: 6, end: 8, speaker: 3 }], [{ time: 3.5, votes: 6 }]);
  assert.deepEqual(overlap.map(part => part.speakers), [[1], [1, 2], [1], [3]], 'Overlap stays together; the following distinct voice still splits');
});
