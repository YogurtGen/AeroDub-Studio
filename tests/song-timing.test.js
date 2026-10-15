const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');
const timing = require('../src/song-timing');
const music = require('../src/music');

test('Singing clock extrapolates the audible timestamp and accounts for mixer look-ahead', () => {
  const context = { currentTime: 10, baseLatency: .04, outputLatency: .1, getOutputTimestamp: () => ({ contextTime: 9.7, performanceTime: 1000 }) };
  assert.ok(Math.abs(timing.outputClock(context, 1100) - 9.794) < 1e-9);
  assert.ok(Math.abs(timing.outputClock({ ...context, getOutputTimestamp: () => ({ contextTime: 0, performanceTime: 0 }) }, 1100) - 9.854) < 1e-9);
  assert.ok(Math.abs(timing.captureLatency(context, { getSettings: () => ({ latency: .1 }) }) - .246) < 1e-9);
  assert.equal(timing.captureLatency({}, { getSettings: () => ({ latency: NaN }) }), .006);
});

test('Moving a lyric line keeps the measured rhythm between words', () => {
  const line = { id: randomUUID(), text: 'Blue sky', start: .5, end: 2.5, words: [{ text: 'Blue', start: .5, end: .7 }, { text: ' sky', start: 1.2, end: 2.5 }] };
  const previous = { language: 'en', segments: [line] };
  const moved = music.validateLyrics({ language: 'en', segments: [{ ...line, start: 1.5, end: 3.5 }] }, 5, previous).segments[0];
  assert.deepEqual(moved.words, line.words.map(word => ({ ...word, start: word.start + 1, end: word.end + 1 })));
  assert.equal(moved.timingEstimated, false);
  const resized = music.validateLyrics({ language: 'en', segments: [{ ...line, end: 4.5 }] }, 5, previous).segments[0];
  assert.ok(Math.abs(resized.words[0].end - .9) < 1e-9); assert.ok(Math.abs(resized.words[1].start - 1.9) < 1e-9); assert.equal(resized.timingEstimated, true);
});

test('Lyrics split at actual phrase gaps while preserving every measured word', () => {
  const words = [{ text: 'Blue', start: 1, end: 1.3 }, { text: ' sky.', start: 1.4, end: 2 }, { text: ' Come', start: 4, end: 4.4 }, { text: ' home', start: 4.5, end: 5 }];
  const lines = timing.phraseLyrics([{ start: 0, end: 9, text: 'Blue sky. Come home', words }], 10);
  assert.deepEqual(lines.map(line => [line.start, line.end, line.text]), [[1, 2, 'Blue sky.'], [4, 5, 'Come home']]);
  assert.deepEqual(lines.flatMap(line => line.words), words);
  const invalid = timing.phraseLyrics([{ start: 0, end: 2, text: 'Missing words', words: words.slice(0, 1) }], 3);
  assert.equal(invalid[0].text, 'Missing words'); assert.equal(invalid[0].review, true); assert.deepEqual(invalid[0].words, []);
});

test('PCM capture is stamped in audio frames and stops at the exact requested sample', () => {
  const messages = [], context = { AudioWorkletProcessor: class { constructor() { this.port = { postMessage: data => messages.push(data) }; } }, currentFrame: 384, sampleRate: 48000, registerProcessor: (_, processor) => { context.Processor = processor; } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/renderer/capture-processor.js'), 'utf8'), context);
  const capture = new context.Processor(), output = [[new Float32Array(128)]];
  capture.port.onmessage({ data: { type: 'start' } });
  capture.process([[new Float32Array(128).fill(.5)]], output);
  context.currentFrame += 128;
  capture.port.onmessage({ data: { type: 'stop', frame: 529 } });
  capture.process([[new Float32Array(128).fill(-.5)]], output);
  assert.equal(messages[0].frame, 384);
  const samples = messages.find(message => message.type === 'samples').samples;
  assert.equal(samples.length, 145); assert.equal(samples[0], 16384); assert.equal(samples[144], -16384);
  assert.equal(messages.at(-1).type, 'stopped'); assert.ok(output[0][0].every(sample => sample === 0));
});
