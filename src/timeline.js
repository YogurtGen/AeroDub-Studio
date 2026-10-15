(function (root) {
  const round = value => Math.round(value * 1e6) / 1e6;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  function bounds(take) {
    const start = take.start + take.offset;
    return { start, end: start + take.trimEnd - take.trimStart };
  }
  function edit(take, operation, position, duration) {
    if (!Number.isFinite(position) || !Number.isFinite(duration) || duration <= 0) throw new Error('INVALID_VALUE');
    const range = bounds(take), next = { ...take }, minimum = .01;
    if (operation === 'move') {
      next.offset = round(clamp(position, 0, Math.max(0, duration - (range.end - range.start))) - take.start);
    } else if (operation === 'left') {
      const delta = clamp(position - range.start, Math.max(-take.trimStart, -range.start), take.trimEnd - take.trimStart - minimum);
      next.offset = round(take.offset + delta); next.trimStart = round(take.trimStart + delta);
    } else if (operation === 'right') {
      next.trimEnd = round(clamp(take.trimEnd + position - range.end, take.trimStart + minimum, Math.min(take.duration, take.trimStart + duration - range.start)));
    } else throw new Error('INVALID_VALUE');
    return next;
  }
  function snap(position, targets, tolerance) {
    let result = position, distance = tolerance;
    for (const target of targets) {
      const difference = Math.abs(target - position);
      if (difference <= distance) { result = target; distance = difference; }
    }
    return result;
  }
  function lanes(takes) {
    const ends = [], result = new Map();
    for (const take of takes.filter(take => take.selected).sort((a, b) => bounds(a).start - bounds(b).start || a.id.localeCompare(b.id))) {
      const range = bounds(take);
      let lane = ends.findIndex(end => end <= range.start + .000001);
      if (lane < 0) lane = ends.length;
      ends[lane] = range.end; result.set(take.id, lane);
    }
    return { positions: result, count: Math.max(1, ends.length) };
  }
  function clips(takes) {
    return takes.flatMap(take => [{ ...take, trackId: take.trackId || 'dub-1', takeId: take.id }, ...(take.splits || []).map((clip, index) => ({ ...take, ...clip, trackId: clip.trackId || take.trackId || 'dub-1', removed: clip.removed ?? false, name: `${take.name} · ${index + 2}`, takeId: take.id }))]);
  }
  function split(take, position) {
    const range = bounds(take);
    if (!Number.isFinite(position) || position < range.start + .02 || position > range.end - .02) throw new Error('INVALID_VALUE');
    const sourcePoint = round(take.trimStart + position - range.start);
    return [{ ...take, trimEnd: sourcePoint }, { ...take, offset: round(position - take.start), trimStart: sourcePoint }];
  }
  function trackClips(project, track) {
    if (track === 'dub') return clips(project.takes).filter(clip => clip.selected && !clip.removed);
    return project[track === 'video' ? 'videoClips' : 'sourceClips'] || [{ id: track === 'video' ? 'video-main' : 'original-main', start: 0, offset: 0, duration: project.duration, trimStart: 0, trimEnd: project.duration, gain: 1, muted: false }];
  }
  function validateTrackClips(values, duration, track) {
    if (!Array.isArray(values) || values.length > 500) throw new Error('INVALID_VALUE');
    const validId = /^(video-main|original-main|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
    const result = values.map(clip => {
      if (!clip || typeof clip.id !== 'string' || !validId.test(clip.id) || typeof clip.muted !== 'boolean') throw new Error('INVALID_VALUE');
      for (const key of ['offset', 'trimStart', 'trimEnd', 'gain']) if (!Number.isFinite(clip[key])) throw new Error('INVALID_VALUE');
      if (clip.offset < 0 || clip.offset >= duration || clip.trimStart < 0 || clip.trimEnd > duration || clip.trimEnd - clip.trimStart < .01 - 1e-8 || clip.offset + clip.trimEnd - clip.trimStart > duration + 1e-6 || clip.gain < 0 || clip.gain > 4) throw new Error('INVALID_VALUE');
      return { id: clip.id, start: 0, offset: clip.offset, duration, trimStart: clip.trimStart, trimEnd: clip.trimEnd, gain: track === 'video' ? 1 : clip.gain, muted: clip.muted, ...(track === 'video' ? {} : { effects: clip.effects }) };
    });
    if (new Set(result.map(clip => clip.id)).size !== result.length) throw new Error('INVALID_VALUE');
    return result;
  }
  function videoLayout(project) {
    const merged = [];
    for (const clip of trackClips(project, 'video').filter(clip => !clip.muted)) {
      const range = bounds(clip), previous = merged.at(-1);
      if (previous && Math.abs(previous.end - range.start) < 1e-6 && Math.abs(previous.sourceEnd - clip.trimStart) < 1e-6) { previous.end = range.end; previous.sourceEnd = clip.trimEnd; }
      else merged.push({ start: range.start, end: range.end, sourceStart: clip.trimStart, sourceEnd: clip.trimEnd });
    }
    return JSON.stringify(merged);
  }
  function dubTracks(project) { return project.dubTracks || [{ id: 'dub-1', name: 'Dub 1', gain: 1, muted: false }]; }
  function validateDubTracks(values) {
    if (!Array.isArray(values) || values.length < 1 || values.length > 16) throw new Error('INVALID_VALUE');
    const result = values.map(track => {
      if (!track || !/^dub-([1-9]|1[0-6])$/.test(track.id) || typeof track.name !== 'string' || !track.name.trim() || track.name.length > 60 || typeof track.muted !== 'boolean' || !Number.isFinite(track.gain) || track.gain < 0 || track.gain > 4) throw new Error('INVALID_VALUE');
      return { id: track.id, name: track.name.trim(), gain: track.gain, muted: track.muted };
    });
    if (new Set(result.map(track => track.id)).size !== result.length || !result.some(track => track.id === 'dub-1')) throw new Error('INVALID_VALUE');
    return result;
  }
  const api = { bounds, edit, snap, lanes, clips, split, trackClips, validateTrackClips, videoLayout, dubTracks, validateDubTracks };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.aerodubTimeline = api;
})(typeof window === 'undefined' ? globalThis : window);
