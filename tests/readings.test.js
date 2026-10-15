const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const music = require('../src/music');
const root = path.resolve(__dirname, '..'), app = { isPackaged: false, getAppPath: () => root };
const line = (text, words) => ({ id: randomUUID(), text, start: .2, end: 3, words });

test('Real offline dictionaries produce romaji, tonal pinyin and Korean readings without changing lyric/audio timing', async () => {
  const dir = path.join(root, 'test-output/readings', randomUUID()); await fs.mkdir(dir, { recursive: true });
  for (const [language, text, expected] of [['ja', '青い空', 'aoi sora'], ['zh-CN', '你好世界', 'nǐ hǎo shì jiè'], ['ko', '안녕하세요 사랑해요', 'annyeonghaseyo saranghaeyo']]) {
    const original = line(text, [{ text, start: .2, end: 3 }]), song = { lyrics: { language, segments: [original] } }, before = structuredClone(song);
    const result = await music.romanizeSong(app, song, dir, language, {}), reading = result.segments[0].reading;
    assert.equal(reading.text, expected); assert.equal(reading.sourceText, text);
    assert.equal(reading.words.map(word => word.text).join('').trim(), expected);
    assert.ok(reading.words.every(word => word.start >= .2 && word.end <= 3 && word.end >= word.start));
    assert.deepEqual(result.segments[0].words, original.words); assert.equal(result.segments[0].start, original.start);
    assert.deepEqual(song, before);
    const saved = music.validateLyrics(result, 4, result);
    assert.deepEqual(saved.segments[0].reading, reading);
  }
  const original = line('Blue sky <img src=x> 💙', []), song = { lyrics: { language: 'en', segments: [original] } };
  assert.equal((await music.romanizeSong(app, song, dir, 'auto', {})).segments[0].reading.text, original.text);
  const long = { lyrics: { language: 'zh-CN', segments: [line('床'.repeat(1000), [])] } };
  const expanded = await music.romanizeSong(app, long, dir, 'zh-CN', {});
  assert.ok(expanded.segments[0].reading.text.length > 6000);
  assert.doesNotThrow(() => music.validateLyrics(expanded, 4, expanded));
  const aborted = new AbortController(); aborted.abort();
  await assert.rejects(music.romanizeSong(app, song, dir, 'auto', { signal: aborted.signal }), /CANCELLED/);
  assert.deepEqual(await fs.readdir(dir), []);
});

test('Reading edits are validated, survive retiming and regeneration, and invalidate after original text changes', async () => {
  const original = line('青い空', [{ text: '青い', start: .2, end: 1 }, { text: '空', start: 1.5, end: 3 }]);
  original.reading = { text: 'aoi sora', sourceText: original.text, words: [{ text: 'aoi', start: .2, end: 1 }, { text: ' sora', start: 1.5, end: 3 }], manual: false };
  const previous = { language: 'ja', segments: [original] };
  const edited = music.validateLyrics({ ...previous, segments: [{ ...original, reading: { text: 'my own reading <b>', sourceText: original.text } }] }, 5, previous);
  assert.equal(edited.segments[0].reading.manual, true); assert.equal(edited.segments[0].reading.text, 'my own reading <b>');
  const moved = music.validateLyrics({ ...previous, segments: [{ ...original, start: 1.2, end: 4 }] }, 5, previous).segments[0];
  assert.ok(Math.abs(moved.reading.words[1].start - 2.5) < 1e-6);
  assert.equal(music.validateLyrics({ ...previous, segments: [{ ...original, text: '新しい空' }] }, 5, previous).segments[0].reading, undefined);
  for (const reading of ['bad', { text: 'x'.repeat(32001), sourceText: original.text }]) assert.throws(() => music.validateLyrics({ ...previous, segments: [{ ...original, reading }] }, 5, previous), /INVALID_VALUE/);
  const dir = path.join(root, 'test-output/readings', randomUUID()); await fs.mkdir(dir, { recursive: true });
  const regenerated = await music.romanizeSong(app, { lyrics: edited }, dir, 'ja', {});
  assert.deepEqual(regenerated.segments[0].reading, edited.segments[0].reading);
});
