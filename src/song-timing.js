const mixerDelay = .006; // DynamicsCompressorNode's fixed look-ahead also delays the guide.
const finiteLatency = value => Number.isFinite(value) && value >= 0 && value <= 2 ? value : 0;
function outputClock(context, now) {
  const stamp = context.getOutputTimestamp?.();
  if (stamp?.contextTime > 0 && stamp.performanceTime > 0 && now >= stamp.performanceTime) {
    return Math.min(context.currentTime, stamp.contextTime + (now - stamp.performanceTime) / 1000) - mixerDelay;
  }
  return context.currentTime - finiteLatency(context.baseLatency) - finiteLatency(context.outputLatency) - mixerDelay;
}
function captureLatency(context, track) {
  return Math.min(2, finiteLatency(context.baseLatency) + finiteLatency(context.outputLatency) + finiteLatency(track?.getSettings?.().latency) + mixerDelay);
}
function retimeWords(line, start, end) {
  const scale = (end - start) / (line.end - line.start);
  return line.words.map(word => ({ ...word, start: Math.max(start, Math.min(end, start + (word.start - line.start) * scale)), end: Math.max(start, Math.min(end, start + (word.end - line.start) * scale)) }));
}
function phraseLyrics(segments, duration) {
  const result = [];
  for (const line of segments) {
    const start = Math.max(0, line.start), end = Math.min(duration, line.end), text = line.text?.trim();
    if (!text || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    const words = (line.words || []).filter(word => typeof word.text === 'string' && Number.isFinite(word.start) && Number.isFinite(word.end))
      .map(word => ({ ...word, start: Math.max(start, word.start), end: Math.min(end, word.end) })).filter(word => word.end > word.start);
    if (!words.length || words.map(word => word.text).join('').replace(/\s/gu, '') !== text.replace(/\s/gu, '')) {
      result.push({ ...line, start, end, text, words: [], review: true }); continue;
    }
    let group = [];
    const flush = () => { if (group.length) result.push({ ...line, start: group[0].start, end: Math.max(...group.map(word => word.end)), text: group.map(word => word.text).join('').trim(), words: group }); group = []; };
    for (const word of words) {
      const previous = group.at(-1);
      if (previous && (word.start - previous.end > .65 || word.end - group[0].start > 6 || [...group.map(item => item.text).join('') + word.text].length > 64 || /[.!?。！？]\s*$/u.test(previous.text))) flush();
      group.push(word);
    }
    flush();
  }
  return result.sort((a, b) => a.start - b.start);
}
const songTiming = { mixerDelay, outputClock, captureLatency, retimeWords, phraseLyrics };
if (typeof module !== 'undefined' && module.exports) module.exports = songTiming;
else window.aerodubSongTiming = songTiming;
