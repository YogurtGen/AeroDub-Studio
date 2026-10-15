const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const media = require('./media');
const { worker } = require('./music');

async function analyzeSpeakers(app, dir, options = {}) {
  const id = randomUUID(), input = path.join(dir, `speakers-${id}.wav`), result = path.join(dir, `speakers-${id}.json`);
  try {
    await media.run(media.ffmpeg, ['-y', '-v', 'error', '-i', path.join(dir, 'reference.wav'), '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', input], options);
    await worker(app, 'diarize', ['--source', input, '--destination', result], options);
    return { ...JSON.parse(await fs.readFile(result, 'utf8')), version: 3 };
  } finally { await Promise.all([input, result].map(file => fs.rm(file, { force: true }))); }
}

module.exports = { analyzeSpeakers };
