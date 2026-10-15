(function (root) {
  const defaults = Object.freeze({ gainDb: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, treble: 0, pitch: 0, pan: 0, fadeIn: 0, fadeOut: 0, highpass: false, denoise: false, compress: false, channel: 'stereo', cleanup: 'inherit' });
  const limits = { gainDb: [-24, 24], bass: [-12, 12], lowMid: [-12, 12], mid: [-12, 12], highMid: [-12, 12], treble: [-12, 12], pitch: [-12, 12], pan: [-1, 1], fadeIn: [0, 30], fadeOut: [0, 30] };
  const bands = [{ key: 'bass', type: 'lowshelf', frequency: 200 }, { key: 'lowMid', type: 'peaking', frequency: 500 }, { key: 'mid', type: 'peaking', frequency: 1500 }, { key: 'highMid', type: 'peaking', frequency: 3500 }, { key: 'treble', type: 'highshelf', frequency: 6000 }];
  // FFmpeg 6.1 afftdn buffers two 12.5ms blocks; flush the tail and remove that delay.
  const denoiseFilter = 'apad=pad_dur=0.05,afftdn=nr=6:nf=-55,atrim=start=0.025,asetpts=PTS-STARTPTS';
  function validate(value = defaults) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('INVALID_VALUE');
    const result = { ...defaults, ...value };
    for (const [key, [min, max]] of Object.entries(limits)) if (!Number.isFinite(result[key]) || result[key] < min || result[key] > max) throw new Error('INVALID_VALUE');
    for (const key of ['highpass', 'denoise', 'compress']) if (typeof result[key] !== 'boolean') throw new Error('INVALID_VALUE');
    if (!['stereo', 'mono', 'left', 'right', 'swap'].includes(result.channel)) throw new Error('INVALID_VALUE');
    if (!['inherit', 'raw', 'clean'].includes(result.cleanup)) throw new Error('INVALID_VALUE');
    return Object.fromEntries(Object.keys(defaults).map(key => [key, result[key]]));
  }
  function filter(value, duration) {
    const effects = validate(value), filters = [];
    if (effects.pitch) { const ratio = 2 ** (effects.pitch / 12); filters.push(`asetrate=${48000 * ratio}`, 'aresample=48000', `atempo=${1 / ratio}`, 'apad', `atrim=duration=${duration}`); }
    if (effects.denoise) filters.push(denoiseFilter, `atrim=duration=${duration}`);
    if (effects.highpass) filters.push('highpass=f=80:t=q:w=0.70710678');
    for (const band of bands) if (effects[band.key]) filters.push(band.type === 'peaking' ? `equalizer=f=${band.frequency}:t=q:w=1:g=${effects[band.key]}` : `${band.type === 'lowshelf' ? 'bass' : 'treble'}=g=${effects[band.key]}:f=${band.frequency}:t=s:w=1`);
    if (effects.compress) filters.push('acompressor=threshold=0.08:ratio=2.5:attack=15:release=180:makeup=1.25');
    if (effects.gainDb) filters.push(`volume=${10 ** (effects.gainDb / 20)}`);
    if (effects.channel !== 'stereo' || effects.pan) {
      filters.push('aformat=channel_layouts=stereo');
      if (effects.channel === 'mono') filters.push('pan=stereo|c0=0.5*c0+0.5*c1|c1=0.5*c0+0.5*c1');
      if (effects.channel === 'left') filters.push('pan=stereo|c0=c0|c1=c0');
      if (effects.channel === 'right') filters.push('pan=stereo|c0=c1|c1=c1');
      if (effects.channel === 'swap') filters.push('pan=stereo|c0=c1|c1=c0');
      if (effects.pan) filters.push(`pan=stereo|c0=${Math.min(1, 1 - effects.pan)}*c0|c1=${Math.min(1, 1 + effects.pan)}*c1`);
    }
    const fadeIn = Math.min(effects.fadeIn, duration), fadeOut = Math.min(effects.fadeOut, duration);
    if (fadeIn) filters.push(`afade=t=in:d=${fadeIn}`);
    if (fadeOut) filters.push(`afade=t=out:st=${Math.max(0, duration - fadeOut)}:d=${fadeOut}`);
    return filters.join(',');
  }
  const api = { defaults, limits, bands, denoiseFilter, validate, filter };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.aerodubClipAudio = api;
})(typeof window === 'undefined' ? globalThis : window);
