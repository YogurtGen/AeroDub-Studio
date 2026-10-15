const { _electron } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const media = require('../src/media');
const root = path.resolve(__dirname, '..'), output = path.join(root, 'test-output/sing-sync');

async function firstSound(file, frequency = 900) {
  const bytes = await media.run(media.ffmpeg, ['-v', 'error', '-i', file, '-af', `bandpass=f=${frequency}:t=h:w=200`, '-ar', '48000', '-ac', '1', '-f', 'f32le', 'pipe:1']);
  for (let at = 0; at < bytes.length; at += 4) if (Math.abs(bytes.readFloatLE(at)) > .035) return at / 4 / 48000;
  throw new Error('No recorded test pulse');
}

(async () => {
  const profile = path.join(output, `profile-${Date.now()}`), id = randomUUID(), dir = path.join(profile, 'projects', id);
  await fs.mkdir(dir, { recursive: true });
  await media.run(media.ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=220:duration=4:sample_rate=48000', '-ac', '2', path.join(dir, 'instrumental.wav')]);
  await fs.copyFile(path.join(dir, 'instrumental.wav'), path.join(dir, 'vocals.wav'));
  const words = [{ text: 'Blue', start: .5, end: .7 }, { text: ' sky', start: 1.2, end: 2.5 }];
  await fs.writeFile(path.join(dir, 'project.aerodub.json'), JSON.stringify({ version: 1, kind: 'song', id, name: 'Timing test', source: path.join(dir, 'instrumental.wav'), duration: 4, peaks: [], lyrics: { language: 'en', segments: [{ id: randomUUID(), text: 'Blue sky', start: .5, end: 2.5, words }] }, takes: [], selectedTake: null, instrumentalGain: 1, vocalGain: 1, updatedAt: new Date().toISOString() }));
  const executable = process.env.AERODUB_TEST_EXE;
  const app = await _electron.launch({ executablePath: executable || undefined, cwd: root, args: [...(executable ? [] : ['.'])], env: { ...process.env, AERODUB_TEST_USER_DATA: profile } });
  console.log('Timing app launched');
  const page = await app.firstWindow(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await app.evaluate(({ BrowserWindow }) => { const window = BrowserWindow.getAllWindows()[0]; window.webContents.setBackgroundThrottling(false); window.webContents.setAudioMuted(true); window.setOpacity(0); window.setIgnoreMouseEvents(true); window.setFocusable(false); window.setSkipTaskbar(true); });
  const idle = () => page.waitForFunction(() => !busy && !saving && !recording, {}, { timeout: 30000 });
  const openTiming = async () => { if (!await page.locator('.sing-sync').evaluate(node => node.open)) await page.locator('.sing-sync summary').click(); };
  try {
    await page.waitForFunction(() => !busy && typeof loadSong === 'function');
    console.log('Timing app ready');
    await page.click('#projects-toggle'); await page.locator(`[data-project-id="${id}"] .project-open`).click(); await idle();
    await page.evaluate(() => { $('portal-sfx').checked = false; $('stem-format').value = 'wav'; });
    await page.click('#song-sing'); await idle();
    console.log('Sing room opened');
    await page.click('#sing-play'); await page.waitForFunction(() => songPlaying); await page.click('#sing-play'); await idle();
    console.log('Audio context ready');
    await page.evaluate(() => {
      Object.defineProperty(songContext, 'baseLatency', { value: .04, configurable: true });
      Object.defineProperty(songContext, 'outputLatency', { value: .1, configurable: true });
      window.testInput = songContext.createMediaStreamDestination();
      const track = testInput.stream.getAudioTracks()[0];
      const settings = track.getSettings.bind(track);
      track.getSettings = () => ({ ...settings(), latency: .1 });
      // A synthetic AudioNode supplies a deterministic microphone path; OS hardware latency is not part of this fixture.
      window.testMicrophone = songContext.createGain(); testMicrophone.connect(testInput);
      const mediaSource = songContext.createMediaStreamSource.bind(songContext);
      songContext.createMediaStreamSource = stream => stream === testInput.stream ? testMicrophone : mediaSource(stream);
      if (window.SongSampleRecorder) {
        const createRecorder = SongSampleRecorder.create;
        SongSampleRecorder.create = async (...args) => {
          const recorder = await createRecorder(...args), start = recorder.start.bind(recorder);
          recorder.start = async () => { const frameTime = await start(); const until = performance.now() + 100; while (performance.now() < until) {} return frameTime; };
          return recorder;
        };
      }
      navigator.mediaDevices.getUserMedia = async () => testInput.stream;
      const originalPlay = playSong;
      playSong = async offset => {
        const started = await originalPlay(offset);
        if (recording) {
          const source = songContext.createBufferSource(), buffer = songContext.createBuffer(1, songContext.sampleRate * 4, songContext.sampleRate), samples = buffer.getChannelData(0);
          for (let i = 0; i < samples.length; i++) { const t = i / songContext.sampleRate; if (t >= 1 && t < 1.15 || t >= 3.85 && t < 3.98) samples[i] = .4 * Math.sin(2 * Math.PI * 900 * t); }
          source.buffer = buffer; source.connect(testMicrophone); source.start(started + .246);
        }
        return started;
      };
    });
    await page.click('#sing-record');
    console.log('Capture requested');
    await page.waitForFunction(() => songData.takes.length === 1 && !recording && !saving && !busy, {}, { timeout: 25000 });
    const take = await page.evaluate(() => songData.takes[0]), voice = path.join(dir, 'takes', take.id, 'voice.wav');
    const onset = await firstSound(voice);
    await fs.writeFile(path.join(output, executable ? 'measurement-packaged.json' : 'measurement.json'), JSON.stringify({ simulatedRoundTripMs: 246, input: 'Synthetic AudioNode with explicit latency; not a physical-device measurement', expectedOnset: 1, measuredOnset: onset, errorMs: (onset - 1) * 1000, take }, null, 2));
    console.log(`Recorded pulse at ${onset.toFixed(4)}s; expected 1.0000s, error ${((onset - 1) * 1000).toFixed(1)}ms.`);
    assert.ok(Math.abs(onset - 1) < .025, 'Recorded voice must compensate the measured input/output path');
    const originalVoice = await fs.readFile(voice);
    await openTiming();
    for (const [offset, expected] of [[-200, .8], [200, 1.2]]) {
      await page.fill('#sing-take-offset', String(offset)); await page.locator('#sing-take-offset').dispatchEvent('change'); await idle();
      const destination = path.join(output, `aligned-${offset}.wav`);
      await app.evaluate(({ dialog }, destination) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: destination }); }, destination);
      await page.click('#sing-export-cover'); await idle();
      assert.ok(Math.abs(await firstSound(destination) - expected) < .025, 'The selected take alignment must affect exported samples');
    }
    await page.fill('#sing-lyric-offset', '300'); await page.locator('#sing-lyric-offset').dispatchEvent('change'); await idle();
    await page.evaluate(() => { stopSongPlayback(false); songOffset = 1.3; updateSongClock(); });
    assert.equal(await page.locator('#lyric-current .lyric-word').nth(1).evaluate(node => parseFloat(node.style.getPropertyValue('--sung'))), 0, 'Positive lyric offset must delay the highlight');
    const saved = JSON.parse(await fs.readFile(path.join(dir, 'project.aerodub.json'), 'utf8'));
    assert.equal(saved.lyricOffset, .3); assert.equal(saved.takes[0].offset, .2);
    await page.evaluate(async id => { await closeMusicSession(); await loadSong(await api.openProject(id)); await enterSingRoom(); }, id);
    assert.equal(await page.inputValue('#sing-take-offset'), '200'); assert.equal(await page.inputValue('#sing-lyric-offset'), '300');
    await openTiming();
    await page.click('#sing-sync-reset'); await idle();
    assert.equal(await page.inputValue('#sing-take-offset'), '0'); assert.equal(await page.inputValue('#sing-lyric-offset'), '0');
    await page.locator('#sing-lyric-offset').focus(); await page.keyboard.press('Tab');
    assert.equal(await page.locator('#sing-take-offset').evaluate(node => node === document.activeElement), true);
    await page.evaluate(async () => {
      for (const changes of [{ lyricOffset: 6 }, { takeOffsets: [{ id: songData.selectedTake, offset: 3 }] }, { takeOffsets: [] }]) {
        let rejected = false; try { await api.updateSong({ ...songSnapshot(), ...changes }); } catch (error) { rejected = error.message === 'INVALID_VALUE'; }
        if (!rejected) throw new Error('Invalid timing reached the saved project');
      }
    });
    await page.click('#sing-back'); await idle();
    const row = page.locator('.lyric-row').first();
    await row.locator('[data-timing=start]').fill('1.5'); await row.locator('[data-timing=start]').dispatchEvent('change');
    await row.locator('[data-timing=end]').fill('3.5'); await row.locator('[data-timing=end]').dispatchEvent('change');
    await page.click('#lyrics-save'); await idle();
    assert.deepEqual(await page.evaluate(() => songData.lyrics.segments[0].words), words.map(word => ({ ...word, start: word.start + 1, end: word.end + 1 })));
    await page.locator('.lyric-actions button').first().click(); await page.waitForFunction(() => songPlaying); await page.click('#song-play'); await idle();
    await page.click('#song-sing'); await idle(); await openTiming();
    await page.waitForFunction(() => $('sing-room').getAnimations().every(animation => animation.playState === 'finished'));
    await page.screenshot({ path: path.join(output, 'timing-wide.png'), fullPage: true });
    for (const code of ['en', 'id', 'zh-CN', 'ja', 'ko']) {
      await page.evaluate(async code => { language = code; translate(); await preferences(); }, code);
      await page.setViewportSize({ width: 760, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(await page.evaluate(code => Object.keys(strings.en).filter(key => !strings[code][key]), code), []);
      await page.screenshot({ path: path.join(output, `timing-${code}.png`), fullPage: true });
      await page.click('#sing-back'); await idle();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.locator('.lyric-actions button').first().scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: path.join(output, `editor-${code}.png`), fullPage: true });
      await page.click('#song-sing'); await idle();
      await page.waitForFunction(() => $('sing-room').getAnimations().every(animation => animation.playState === 'finished'));
    }
    assert.deepEqual(await fs.readFile(voice), originalVoice);
    assert.deepEqual(errors, []);
    console.log('SING SYNC PASS: sample-clock capture, simulated 246ms device delay, cleaned pulse timing, per-take shifted WAV exports, original protection, lyric offset/word rhythm, saved/reopened/reset timing, validation and all five narrow locales.');
  } catch (error) {
    console.log('SING SYNC FAILURE:', await page.locator('#status').textContent(), errors);
    await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {}); throw error;
  } finally { await app.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
