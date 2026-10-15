const { _electron } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const media = require('../src/media');
const root = path.resolve(__dirname, '..'), output = path.join(root, 'test-output/readings-ui');
(async () => {
  const profile = path.join(output, `profile-${Date.now()}`), id = randomUUID(), dir = path.join(profile, 'projects', id);
  await fs.mkdir(dir, { recursive: true });
  await media.run(media.ffmpeg, ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=220:duration=6:sample_rate=48000', '-ac', '2', path.join(dir, 'instrumental.wav')]);
  await fs.copyFile(path.join(dir, 'instrumental.wav'), path.join(dir, 'vocals.wav'));
  const segments = [
    { id: randomUUID(), text: '青い空', start: .2, end: 1.8, words: [{ text: '青い', start: .2, end: .8 }, { text: '空', start: 1.2, end: 1.8 }] },
    { id: randomUUID(), text: '你好世界', start: 2.2, end: 3.8, words: [{ text: '你好', start: 2.2, end: 2.8 }, { text: '世界', start: 3.2, end: 3.8 }] },
    { id: randomUUID(), text: '안녕하세요 사랑해요', start: 4.2, end: 5.8, words: [{ text: '안녕하세요', start: 4.2, end: 4.8 }, { text: ' 사랑해요', start: 5.2, end: 5.8 }] }
  ];
  await fs.writeFile(path.join(dir, 'project.aerodub.json'), JSON.stringify({ version: 1, kind: 'song', id, name: 'Lyrics reading preview', source: path.join(dir, 'instrumental.wav'), duration: 6, peaks: [], lyrics: { language: 'auto', segments }, takes: [], selectedTake: null, instrumentalGain: 1, vocalGain: 1, updatedAt: new Date().toISOString() }));
  const executable = process.env.AERODUB_TEST_EXE;
  const app = await _electron.launch({ executablePath: executable || undefined, cwd: root, args: [...(executable ? [] : ['.'])], env: { ...process.env, AERODUB_TEST_USER_DATA: profile } });
  const page = await app.firstWindow(), errors = []; page.on('pageerror', error => errors.push(error.message));
  await app.evaluate(({ BrowserWindow }) => { const window = BrowserWindow.getAllWindows()[0]; window.setSize(1280, 900); window.webContents.setBackgroundThrottling(false); window.webContents.setAudioMuted(true); window.setOpacity(0); window.setIgnoreMouseEvents(true); window.setFocusable(false); window.setSkipTaskbar(true); });
  const idle = () => page.waitForFunction(() => !busy && !saving && !recording, {}, { timeout: 30000 });
  const seek = async position => page.evaluate(position => { stopSongPlayback(false); songOffset = position; lyricIndex = -2; updateSongClock(); }, position);
  const enter = async () => { await page.click('#song-sing'); await idle(); await page.waitForFunction(() => $('sing-room').getAnimations().every(animation => animation.playState === 'finished')); };
  try {
    await page.waitForFunction(() => !busy && typeof loadSong === 'function');
    await page.click('#projects-toggle'); await page.locator(`[data-project-id="${id}"] .project-open`).click(); await idle();
    await page.evaluate(() => { $('portal-sfx').checked = false; });
    await page.selectOption('#lyrics-display', 'both'); await idle();
    assert.deepEqual(await page.locator('.reading-input').evaluateAll(inputs => inputs.map(input => input.value)), ['aoi sora', 'nǐ hǎo shì jiè', 'annyeonghaseyo saranghaeyo']);
    assert.deepEqual(await page.evaluate(() => songData.lyrics.segments.map(({ reading, ...line }) => line)), segments);
    await enter(); await seek(1.5);
    assert.equal(await page.textContent('#lyric-current'), '青い空'); assert.equal(await page.textContent('#lyric-reading'), 'aoi sora');
    assert.ok(Math.abs(await page.locator('#lyric-reading .lyric-word').last().evaluate(node => parseFloat(node.style.getPropertyValue('--sung'))) - 50) < .01);
    await page.screenshot({ path: path.join(output, 'romaji-wide.png'), fullPage: true });
    await page.selectOption('#sing-lyrics-display', 'latin'); await idle(); await seek(3.5);
    assert.equal(await page.textContent('#lyric-current'), 'nǐ hǎo shì jiè'); assert.equal(await page.locator('#lyric-reading').isVisible(), false);
    await page.selectOption('#sing-lyrics-display', 'original'); await idle(); await seek(5.5);
    assert.equal(await page.textContent('#lyric-current'), '안녕하세요 사랑해요');
    await page.click('#sing-play'); await page.waitForFunction(() => songPlaying);
    await page.selectOption('#sing-lyrics-display', 'both'); await idle(); assert.equal(await page.evaluate(() => songPlaying), true);
    await page.click('#sing-play'); await idle();
    await page.click('#sing-back'); await idle();
    const custom = 'aoi sora <img src=x onerror=alert(1)>';
    await page.locator('.reading-input').first().fill(custom); await page.locator('.reading-input').first().dispatchEvent('change');
    await page.click('#lyrics-save'); await idle(); await page.click('#lyrics-readings'); await idle();
    assert.equal(await page.locator('.reading-input').first().inputValue(), custom, 'Regeneration preserves the user reading');
    await enter(); await seek(1.5);
    assert.equal(await page.textContent('#lyric-reading'), custom); assert.equal(await page.locator('#lyric-reading img').count(), 0);
    await page.click('#home'); await idle(); await page.click('#projects-toggle'); await page.locator(`[data-project-id="${id}"] .project-open`).click(); await idle();
    assert.equal(await page.inputValue('#lyrics-display'), 'both'); assert.equal(await page.locator('.reading-input').first().inputValue(), custom);
    await page.locator('.lyric-reading-editor button').first().click(); await idle(); assert.equal(await page.locator('.reading-input').first().inputValue(), 'aoi sora');
    const first = page.locator('.lyric-row').first(); await first.locator('textarea').fill('青い星'); await first.locator('textarea').dispatchEvent('change');
    await page.click('#lyrics-save'); await idle(); assert.equal(await page.evaluate(() => songData.lyrics.segments[0].reading), undefined);
    await enter(); await seek(1.4); assert.equal(await page.textContent('#lyric-reading'), 'aoi hoshi');
    for (const code of ['en', 'id', 'zh-CN', 'ja', 'ko']) {
      await page.evaluate(async code => { language = code; translate(); await preferences(); }, code); await page.setViewportSize({ width: 760, height: 900 });
      await seek(code === 'ko' ? 5.5 : code === 'zh-CN' ? 3.5 : 1.4);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(await page.evaluate(code => Object.keys(strings.en).filter(key => !strings[code][key]), code), []);
      await page.screenshot({ path: path.join(output, `readings-${code}.png`), fullPage: true });
      await page.click('#sing-back'); await idle(); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: path.join(output, `editor-${code}.png`), fullPage: true }); await enter();
    }
    await page.evaluate(async () => { let rejected = false; try { await api.updateSong({ ...songSnapshot(), lyricDisplay: 'invalid' }); } catch { rejected = true; } if (!rejected) throw new Error('Invalid display accepted'); });
    assert.deepEqual(errors, []);
    console.log('READINGS UI PASS: real offline romaji/pinyin/Korean dictionaries; original/both/Latin displays, source-timed highlighting, live switching, manual edits/reset, original-text invalidation, persistence, literal-text safety and five narrow locales.');
  } catch (error) { console.log('READINGS FAILURE:', await page.textContent('#status'), errors); await page.screenshot({ path: path.join(output, 'failure.png'), fullPage: true }).catch(() => {}); throw error; }
  finally { await app.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
