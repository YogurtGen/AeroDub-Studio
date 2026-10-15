const { test } = require('node:test');
const assert = require('node:assert/strict');
const timeline = require('../src/timeline');
const take = { id: 'a', start: 2, offset: 0, duration: 4, trimStart: .5, trimEnd: 3.5, selected: true };
test('Timeline moves and trims preserve source alignment and constrain clips to the video', () => {
  const moved = timeline.edit(take, 'move', 125, 180);
  assert.deepEqual(timeline.bounds(moved), { start: 125, end: 128 });
  assert.equal(moved.trimStart, .5);
  assert.equal(timeline.bounds(timeline.edit(take, 'move', 100, 10)).end, 10);
  assert.equal(timeline.bounds(timeline.edit(take, 'move', -10, 10)).start, 0);
  const left = timeline.edit(take, 'left', 2.75, 10);
  assert.equal(left.trimStart, 1.25); assert.deepEqual(timeline.bounds(left), { start: 2.75, end: 5 });
  assert.equal(timeline.edit(take, 'left', 0, 10).trimStart, 0);
  const right = timeline.edit(left, 'right', 4.5, 10);
  assert.equal(right.trimEnd, 3); assert.equal(timeline.bounds(right).end, 4.5);
  assert.equal(timeline.edit(take, 'right', 20, 10).trimEnd, 4);
  assert.equal(timeline.edit(take, 'right', -10, 10).trimEnd, .51);
  assert.equal(take.offset, 0); assert.equal(take.trimStart, .5);
  assert.throws(() => timeline.edit(take, 'move', NaN, 10), /INVALID_VALUE/);
});
test('Splits retain source samples, independent track timing and a single recording file', () => {
  const [left, right] = timeline.split(take, 3);
  right.id = 'b';
  assert.equal(left.trimEnd, right.trimStart); assert.equal(timeline.bounds(left).end, timeline.bounds(right).start);
  const combined = { ...left, splits: [{ id: 'b', offset: right.offset, trimStart: right.trimStart, trimEnd: right.trimEnd, gain: 1, muted: false }] };
  const clips = timeline.clips([combined]);
  assert.equal(clips.length, 2); assert.equal(clips[0].takeId, 'a'); assert.equal(clips[1].takeId, 'a');
  assert.throws(() => timeline.split(take, 2.001), /INVALID_VALUE/);
  const project = { duration: 10, takes: [] }, base = timeline.trackClips(project, 'video')[0], split = timeline.split(base, 4);
  split[1].id = 'ed5bddf2-129f-4092-bd6a-07d42ee54f3a';
  assert.equal(timeline.videoLayout(project), timeline.videoLayout({ ...project, videoClips: split }));
  const checked = timeline.validateTrackClips(split, 10, 'video'); assert.equal(checked.length, 2);
  assert.throws(() => timeline.validateTrackClips([{ ...base, trimEnd: 11 }], 10, 'video'), /INVALID_VALUE/);
  assert.throws(() => timeline.validateTrackClips([base, base], 10, 'video'), /INVALID_VALUE/);
});
test('Shortcut settings reject conflicts and reserved combinations and normalize actual keys', () => {
  const shortcuts = require('../src/shortcuts');
  assert.deepEqual(shortcuts.validate(shortcuts.defaults), shortcuts.defaults);
  assert.throws(() => shortcuts.validate({ ...shortcuts.defaults, split: 'Ctrl+Z' }), /SHORTCUT_CONFLICT/);
  assert.throws(() => shortcuts.validate({ ...shortcuts.defaults, split: 'Alt+F4' }), /INVALID_VALUE/);
  assert.equal(shortcuts.fromEvent({ key: 'b', code: 'KeyB', ctrlKey: true }), 'Ctrl+B');
  assert.equal(shortcuts.fromEvent({ key: 'Z', code: 'KeyZ', metaKey: true, shiftKey: true }), 'Ctrl+Shift+Z');
});
test('Dub tracks persist independent lanes and validate track identities and mix settings', () => {
  const tracks = timeline.dubTracks({}); assert.equal(tracks[0].id, 'dub-1');
  const four = Array.from({ length: 4 }, (_, index) => ({ id: `dub-${index + 1}`, name: `Dub ${index + 1}`, gain: 1, muted: false }));
  assert.equal(timeline.validateDubTracks(four).length, 4);
  assert.throws(() => timeline.validateDubTracks([...four, four[0]]), /INVALID_VALUE/);
  assert.throws(() => timeline.validateDubTracks([{ ...four[0], gain: Infinity }]), /INVALID_VALUE/);
  const pieces = timeline.trackClips({ takes: [{ ...take, trackId: 'dub-2', splits: [{ id: 'other', offset: 0, trimStart: 0, trimEnd: 1, trackId: 'dub-3' }] }] }, 'dub');
  assert.deepEqual(pieces.map(clip => clip.trackId), ['dub-2', 'dub-3']);
});
test('Timeline snapping uses the nearest boundary and overlapping voices use separate lanes', () => {
  assert.equal(timeline.snap(2.06, [0, 2, 2.1, 10], .08), 2.1);
  assert.equal(timeline.snap(2.3, [0, 2, 10], .08), 2.3);
  const result = timeline.lanes([take, { ...take, id: 'b', offset: 1 }, { ...take, id: 'c', offset: 3 }, { ...take, id: 'unused', selected: false }]);
  assert.equal(result.count, 2); assert.equal(result.positions.get('a'), 0); assert.equal(result.positions.get('b'), 1); assert.equal(result.positions.get('c'), 0); assert.equal(result.positions.has('unused'), false);
});
