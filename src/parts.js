function divideParts(duration, count = Math.min(500, Math.ceil(duration / 8)), silences = []) {
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isInteger(count) || count < 1 || count > Math.min(500, Math.max(1, Math.floor(duration / .1)))) throw new Error('INVALID_VALUE');
  const width = duration / count;
  const boundaries = [0];
  for (let i = 1; i < count; i++) {
    const target = duration * i / count;
    const min = Math.max(boundaries[i - 1] + .1, target - width * .3);
    const max = Math.min(duration - (count - i) * .1, target + width * .3);
    const nearby = silences.filter(value => Number.isFinite(value) && value >= min && value <= max);
    const boundary = nearby.sort((a, b) => Math.abs(a - target) - Math.abs(b - target))[0] ?? target;
    boundaries.push(Math.round(boundary * 1000) / 1000);
  }
  boundaries.push(duration);
  return boundaries.slice(0, -1).map((start, index) => ({ id: `part-${index + 1}`, start, end: boundaries[index + 1] }));
}

function migrateProject(project) {
  project.dubGain ??= 1;
  const legacy = !Array.isArray(project.parts);
  if (legacy) {
    const starts = [...new Set([0, ...project.takes.map(t => t.start).filter(t => t > .1 && t < project.duration - .1)])].sort((a, b) => a - b);
    project.parts = project.takes.length ? starts.map((start, i) => ({ id: `part-${i + 1}`, start, end: starts[i + 1] ?? project.duration })) : divideParts(project.duration, undefined, project.silences);
  }
  for (const take of project.takes) {
    if (!project.parts.some(p => p.id === take.partId)) take.partId = project.parts.find(p => take.start >= p.start - .02 && take.start < p.end)?.id ?? project.parts[0].id;
  }
  if (legacy) {
    const chosen = new Map();
    for (const take of project.takes) if (take.selected) { const key = `${take.partId}:${take.trackId || 'dub-1'}`; if (chosen.has(key)) chosen.get(key).selected = false; chosen.set(key, take); }
  }
  return project;
}

function smartParts(duration, silentRanges = [], padding = 1.5, speakerTurns = [], localChanges = []) {
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(padding) || padding < 1 || padding > 3) throw new Error('INVALID_VALUE');
  const turns = speakerTurns.filter(turn => Number.isFinite(turn.start) && Number.isFinite(turn.end) && turn.end > turn.start && Number.isInteger(turn.speaker) && turn.speaker > 0).map(turn => ({ ...turn, start: Math.max(0, turn.start), end: Math.min(duration, turn.end) })).filter(turn => turn.end > turn.start).sort((a, b) => a.start - b.start);
  if (turns.length) {
    const events = turns.flatMap(turn => [{ time: turn.start, speaker: turn.speaker, delta: 1 }, { time: turn.end, speaker: turn.speaker, delta: -1 }]).sort((a, b) => a.time - b.time);
    const active = new Map(); let cores = [], cursor = events[0].time;
    for (let i = 0; i < events.length;) {
      const end = events[i].time, speakers = [...active.keys()].sort((a, b) => a - b);
      if (speakers.length && end - cursor >= .12) {
        const previous = cores.at(-1);
        if (previous && previous.speakers.join(',') === speakers.join(',') && cursor - previous.end <= 1.2 && end - previous.start <= 12) previous.end = end;
        else cores.push({ start: cursor, end, speakers });
      }
      while (i < events.length && Math.abs(events[i].time - end) < 1e-6) { const event = events[i++], count = (active.get(event.speaker) || 0) + event.delta; if (count > 0) active.set(event.speaker, count); else active.delete(event.speaker); }
      cursor = end;
    }
    const changes = localChanges.filter(change => Number.isFinite(change.time) && change.votes >= 3).map(change => change.time).sort((a, b) => a - b);
    cores = cores.flatMap(region => {
      const points = region.speakers.length === 1 ? changes.filter(point => point > region.start + .25 && point < region.end - .25) : [];
      if (!points.length) return [region];
      const edges = [region.start, ...points, region.end];
      return edges.slice(0, -1).map((start, i) => ({ ...region, start, end: edges[i + 1], review: true }));
    });
    const between = (previous, next) => { const middle = (previous.end + next.start) / 2; return changes.filter(point => point >= previous.end && point <= next.start && Math.abs(point - middle) <= .2).sort((a, b) => Math.abs(a - middle) - Math.abs(b - middle))[0] ?? middle; };
    return cores.map((region, i) => ({ id: `part-${i + 1}`, voiceStart: region.start, voiceEnd: region.end, speakers: region.speakers, review: Boolean(region.review),
      start: Math.max(0, region.start - padding, i ? between(cores[i - 1], region) : 0),
      end: Math.min(duration, region.end + padding, i < cores.length - 1 ? between(region, cores[i + 1]) : duration) }));
  }
  const speech = [];
  let cursor = 0;
  for (const range of silentRanges) {
    if (range.start > cursor + .12) speech.push({ start: cursor, end: Math.min(duration, range.start) });
    cursor = Math.max(cursor, Math.min(duration, range.end));
  }
  if (duration > cursor + .12) speech.push({ start: cursor, end: duration });
  const merged = [];
  for (const region of speech) {
    const previous = merged.at(-1);
    if (previous && region.start - previous.end < .65) previous.end = region.end;
    else merged.push({ ...region });
  }
  // Energy-based cuts remain available for audio without recognized speech.
  const cores = merged.flatMap(region => {
    const count = Math.ceil((region.end - region.start) / 12);
    return Array.from({ length: count }, (_, i) => ({ start: region.start + (region.end - region.start) * i / count, end: region.start + (region.end - region.start) * (i + 1) / count }));
  });
  return cores.map((region, i) => ({
    id: `part-${i + 1}`, voiceStart: region.start, voiceEnd: region.end,
    speakers: [],
    start: Math.max(0, region.start - padding, i ? (cores[i - 1].end + region.start) / 2 : 0),
    end: Math.min(duration, region.end + padding, i < cores.length - 1 ? (region.end + cores[i + 1].start) / 2 : duration)
  }));
}

module.exports = { divideParts, smartParts, migrateProject };
