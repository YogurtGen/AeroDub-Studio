const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const music = require('../src/music');
const media = require('../src/media');
const root = path.resolve(__dirname, '..');
const app = { isPackaged: false, getAppPath: () => root };

test('Lyrics preserve measured word times and constrain manual edits in all five languages', () => {
  const line = { id: randomUUID(), start: .2, end: 2, text: 'Blue sky', words: [{ text: 'Blue', start: .3, end: .6 }, { text: ' sky', start: .9, end: 1.6 }] };
  const original = { language: 'en', segments: [line] };
  assert.deepEqual(music.validateLyrics(original, 3, original), original);
  for (const [language, text] of [['en', 'My song'], ['id', 'Lagu saya'], ['zh-CN', '蓝天之歌'], ['ja', '青空の歌'], ['ko', '푸른 하늘']]) {
    const edited = music.validateLyrics({ language, segments: [{ ...line, text }] }, 3, original).segments[0];
    assert.equal(edited.text, text); assert.equal(edited.timingEstimated, true);
    assert.equal(edited.words.map(word => word.text).join(''), text);
    assert.ok(edited.words.every(word => word.start >= edited.start && word.end <= edited.end));
  }
  for (const invalid of [{ ...line, start: -1 }, { ...line, end: 4 }, { ...line, end: .1 }, { ...line, start: NaN }, { ...line, id: '../escape' }]) assert.throws(() => music.validateLyrics({ language: 'en', segments: [invalid] }, 3), /INVALID_VALUE/);
  assert.throws(() => music.validateLyrics({ language: 'fr', segments: [] }, 3), /INVALID_VALUE/);
  assert.throws(() => music.validateLyrics({ language: 'en', segments: [line, line] }, 3), /INVALID_VALUE/);
});

async function rms(file, start, duration, filter = 'anull') {
  const audio = await media.run(media.ffmpeg, ['-v', 'error', '-ss', String(start), '-i', file, '-t', String(duration), '-af', filter, '-ac', '1', '-ar', '44100', '-f', 'f32le', 'pipe:1']);
  let sum = 0; for (let i = 0; i < audio.length; i += 4) sum += audio.readFloatLE(i) ** 2;
  return Math.sqrt(sum / (audio.length / 4));
}

test('Song capture trims lead, pads the song, exports the selected voice with real gain and protects source/stems', async () => {
  const dir = path.join(root, 'test-output', 'music-backend', randomUUID()); await fs.mkdir(dir, { recursive: true });
  const source = path.join(dir, 'original.mp3'), stem = path.join(dir, 'instrumental.wav'), capture = path.join(dir, 'capture.webm');
  await media.run(media.ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=220:duration=4:sample_rate=44100', '-ac', '2', stem]);
  await media.run(media.ffmpeg, ['-y', '-v', 'error', '-i', stem, source]);
  await media.run(media.ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=1400:duration=2:sample_rate=48000', '-c:a', 'libopus', capture]);
  const original = await fs.readFile(source);
  const song = { source, duration: 4, takes: [], selectedTake: null, instrumentalGain: 1, vocalGain: 1 };
  const options = {};
  const take = await music.saveSongTake(new Uint8Array(await fs.readFile(capture)), song, dir, { lead: .25, end: 1.5, clean: true }, options);
  song.takes.push(take); song.selectedTake = take.id;
  const voice = path.join(dir, 'takes', take.id, 'voice.wav');
  assert.ok(Math.abs((await media.probe(voice)).duration - 4) < .01);
  assert.ok(await rms(voice, .2, .8) > .03); assert.ok(await rms(voice, 2, .8) < .001);
  const output = path.join(path.dirname(dir), `${path.basename(dir)}-cover.wav`);
  await music.cover(song, dir, output, 'wav', options);
  const isolateVoice = 'highpass=f=900,highpass=f=900';
  const level = await rms(output, .2, .8, isolateVoice); assert.ok(level > .03);
  assert.ok(await rms(output, 2.2, .8, isolateVoice) < level / 20);
  song.vocalGain = 2;
  const boosted = output.replace('.wav', '-boosted.mp3'); await music.cover(song, dir, boosted, 'mp3', options);
  assert.ok(await rms(boosted, .2, .8, isolateVoice) > level * 1.8);
  await assert.rejects(music.cover(song, dir, source, 'mp3', options), /SOURCE_OVERWRITE/);
  await assert.rejects(music.cover(song, dir, stem, 'wav', options), /SOURCE_OVERWRITE/);
  await assert.rejects(music.saveSongTake(new Uint8Array(), song, dir, { lead: 0, end: 2, clean: true }, options), /INVALID_RECORDING/);
  await assert.rejects(music.saveSongTake(new Uint8Array([1]), song, dir, { lead: -1, end: 2, clean: true }, options), /INVALID_RECORDING/);
  await assert.rejects(music.cover({ ...song, selectedTake: randomUUID() }, dir, output, 'wav', options), /NO_SONG_TAKE/);
  const aborted = new AbortController(); aborted.abort();
  const destination = output.replace('.wav', '-cancelled.wav');
  await fs.writeFile(destination, 'keep this existing export');
  await assert.rejects(music.exportStems(app, song, dir, destination, 'instrumental', 'wav', { signal: aborted.signal }), /CANCELLED/);
  assert.equal(await fs.readFile(destination, 'utf8'), 'keep this existing export');
  assert.ok(!(await fs.readdir(dir)).some(file => file.startsWith('export-')));
  assert.deepEqual(await fs.readFile(source), original);
});

test('Noise cleanup preserves pulse positions and the final syllable; per-take alignment reaches the cover', async () => {
  const dir = path.join(root, 'test-output', 'song-alignment', randomUUID()); await fs.mkdir(dir, { recursive: true });
  const capture = path.join(dir, 'pulse.wav'), stem = path.join(dir, 'instrumental.wav');
  await media.run(media.ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', "aevalsrc='0.3*sin(2*PI*900*t)*if(between(t,0.8,0.95)+between(t,1.975,1.999),1,0)':s=48000:d=2", capture]);
  await media.run(media.ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-t', '2', stem]);
  const song = { source: capture, duration: 2, takes: [], selectedTake: null, instrumentalGain: 1, vocalGain: 1 };
  const take = await music.saveSongTake(new Uint8Array(await fs.readFile(capture)), song, dir, { lead: 0, end: 2, clean: true }, {});
  song.takes.push(take); song.selectedTake = take.id;
  const raw = path.join(dir, 'takes', take.id, 'raw.wav'), clean = path.join(dir, 'takes', take.id, 'clean.wav'), voice = path.join(dir, 'takes', take.id, 'voice.wav');
  const original = await fs.readFile(voice);
  async function onset(file) {
    const pcm = await media.run(media.ffmpeg, ['-v', 'error', '-i', file, '-ac', '1', '-ar', '48000', '-f', 'f32le', 'pipe:1']);
    for (let i = 0; i < pcm.length; i += 4) if (Math.abs(pcm.readFloatLE(i)) > .035) return i / 4 / 48000;
    throw new Error('No test pulse');
  }
  assert.ok(Math.abs(await onset(raw) - await onset(clean)) < .002, 'Cleanup may not shift the voice by its FFT delay');
  assert.ok(await rms(clean, 1.98, .015) > .05, 'Cleanup must flush and retain the final syllable');
  for (const [offset, expected] of [[-.2, .6], [.3, 1.1]]) {
    take.offset = offset; const destination = `${dir}-cover-${offset}.wav`;
    await music.cover(song, dir, destination, 'wav', {});
    assert.ok(Math.abs(await onset(destination) - expected) < .002);
    assert.ok(Math.abs((await media.probe(destination)).duration - song.duration) < .001);
  }
  take.offset = NaN; await assert.rejects(music.cover(song, dir, `${dir}-invalid.wav`, 'wav', {}), /INVALID_VALUE/);
  assert.deepEqual(await fs.readFile(voice), original, 'Alignment must preserve the recorded source');
});
