const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const media = require('../src/media');
const effects = require('../src/clip-audio');
const root = path.join(__dirname, '../test-output/clip-audio');
async function energy(file, start, duration, filter = 'anull') {
  const data = await media.run(media.ffmpeg, ['-v', 'error', '-ss', String(start), '-i', file, '-t', String(duration), '-af', filter, '-ac', '1', '-f', 'f32le', 'pipe:1']);
  let sum = 0; for (let i = 0; i < data.length; i += 4) sum += data.readFloatLE(i) ** 2;
  return Math.sqrt(sum / (data.length / 4));
}
test('Per-clip effects validate values and keep a neutral clip neutral', () => {
  assert.equal(effects.filter(undefined, 2), '');
  assert.deepEqual(effects.validate({ pitch: 2 }), { ...effects.defaults, pitch: 2 });
  for (const invalid of [null, [], { pan: 2 }, { gainDb: NaN }, { bass: 99 }, { compress: 1 }, { channel: 'unknown' }, { fadeIn: -1 }, { cleanup: '../raw.wav' }]) assert.throws(() => effects.validate(invalid), /INVALID_VALUE/);
});
test('Clip EQ, pitch, stereo routing, gain, fades and dynamics change the actual audio and preserve its duration/source', async () => {
  await fs.mkdir(root, { recursive: true });
  const source = path.join(root, 'tones.wav');
  await media.run(media.ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'aevalsrc=0.03*sin(2*PI*100*t)+0.03*sin(2*PI*1500*t)+0.03*sin(2*PI*10000*t):s=48000:d=3', source]);
  const original = await fs.readFile(source);
  const render = async (name, value, input = source, length = 3) => { const file = path.join(root, name); await media.run(media.ffmpeg, ['-y', '-v', 'error', '-i', input, '-af', effects.filter(value, length) || 'anull', file]); return file; };
  const eq = await render('eq.wav', { bass: 12, mid: -12 });
  assert.ok(await energy(eq, .3, 1, 'bandpass=f=100:t=h:w=20') > await energy(source, .3, 1, 'bandpass=f=100:t=h:w=20') * 2.5);
  assert.ok(await energy(eq, .3, 1, 'bandpass=f=1500:t=h:w=20') < await energy(source, .3, 1, 'bandpass=f=1500:t=h:w=20') * .4);
  const pitch = await render('pitch.wav', { pitch: 12, pan: -1, gainDb: 6, fadeIn: .3, fadeOut: .3 });
  assert.ok(Math.abs((await media.probe(pitch)).duration - 3) < .001);
  assert.ok(await energy(pitch, .5, 1, 'pan=mono|c0=c0,bandpass=f=3000:t=h:w=20') > await energy(pitch, .5, 1, 'pan=mono|c0=c0,bandpass=f=1500:t=h:w=20') * 10);
  assert.ok(await energy(pitch, .5, 1, 'pan=mono|c0=c1') < .0001, 'Full-left pan must silence the right channel');
  assert.ok(await energy(pitch, .005, .025) < await energy(pitch, 1, .2) * .25);
  assert.ok(await energy(pitch, 2.97, .025) < await energy(pitch, 1, .2) * .25);
  const stereo = path.join(root, 'stereo.wav');
  await media.run(media.ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'aevalsrc=0.12*sin(2*PI*440*t)|0.12*sin(2*PI*880*t):s=48000:d=2', stereo]);
  const swapped = await render('swapped.wav', { channel: 'swap' }, stereo, 2);
  assert.ok(await energy(swapped, .3, 1, 'pan=mono|c0=c0,bandpass=f=880:t=h:w=20') > await energy(swapped, .3, 1, 'pan=mono|c0=c0,bandpass=f=440:t=h:w=20') * 10);
  const left = await render('left.wav', { channel: 'left' }, stereo, 2);
  assert.ok(Math.abs(await energy(left, .3, 1, 'pan=mono|c0=c0') - await energy(left, .3, 1, 'pan=mono|c0=c1')) < .0001);
  const dynamics = await render('dynamics.wav', { compress: true, denoise: true, highpass: true, treble: -3, lowMid: 2, highMid: -2 });
  assert.ok(Math.abs((await media.probe(dynamics)).duration - 3) < .001);
  assert.deepEqual(await fs.readFile(source), original);
});
