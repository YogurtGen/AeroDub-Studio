const { _electron } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..'), output = path.join(root, 'test-output/voice-ui');
(async () => {
  await fs.mkdir(output, { recursive: true });
  const profile = path.join(output, `profile-${Date.now()}`), executable = process.env.AERODUB_TEST_EXE;
  const app = await _electron.launch({ executablePath: executable || undefined, cwd: root, args: [...(executable ? [] : ['.']), '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${path.join(root,'test-output/media/mic.wav')}`], env: { ...process.env, AERODUB_TEST_USER_DATA: profile } });
  const page = await app.firstWindow(), errors = [];
  await app.evaluate(({ BrowserWindow }) => { const window = BrowserWindow.getAllWindows()[0]; window.setOpacity(0); window.setIgnoreMouseEvents(true); window.setFocusable(false); window.setSkipTaskbar(true); window.webContents.setBackgroundThrottling(false); window.webContents.setAudioMuted(true); });
  page.on('pageerror', error => errors.push(error.message));
  const idle = () => page.waitForFunction(() => !busy && !saving && !recording);
  const peak = () => page.evaluate(() => { const session = [...voiceSessions][0], values = new Uint8Array(session.analyser.frequencyBinCount); session.analyser.getByteFrequencyData(values); let best=0; for(let i=5;i<values.length;i++) if(values[i]>values[best])best=i; return best * session.context.sampleRate / session.analyser.fftSize; });
  const set = async (key, value) => { await page.fill('#voice-' + key, String(value)); await page.locator('#voice-' + key).dispatchEvent('input'); await page.locator('#voice-' + key).dispatchEvent('change'); };
  try {
    await page.waitForFunction(() => musicReady); await page.click('#settings-toggle');
    assert.equal(await page.isChecked('#auto-input-level'),true,'Legacy/default settings must enable automatic microphone level');
    assert.equal(await page.isChecked('#voice-monitor'),false,'Monitoring must start disabled');
    await page.evaluate(()=>{window.realGetUserMedia=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Denied','NotAllowedError');};});
    await page.click('#voice-monitor');await idle();assert.equal(await page.isChecked('#voice-monitor'),false);assert.equal(await page.evaluate(()=>voiceSessions.size),0);
    await page.evaluate(()=>{window.captureRequests=[];navigator.mediaDevices.getUserMedia=constraints=>{window.captureRequests.push(structuredClone(constraints));return window.realGetUserMedia(constraints);};});
    await page.check('#voice-monitor'); await page.waitForFunction(() => voiceSessions.size === 1 && !busy);
    const request=await page.evaluate(()=>window.captureRequests.at(-1));assert.equal(request.audio.autoGainControl,true);assert.equal(request.audio.echoCancellation,false);assert.equal(request.audio.channelCount,1);
    await page.uncheck('#auto-input-level');await idle();assert.equal(await page.evaluate(()=>window.captureRequests.at(-1).audio.autoGainControl),false);
    assert.equal((await page.evaluate(()=>api.bootstrap())).settings.autoInputLevel,false);
    await page.check('#auto-input-level');await idle();assert.equal(await page.evaluate(()=>window.captureRequests.at(-1).audio.autoGainControl),true);
    await assert.rejects(page.evaluate(()=>api.settings({language:'en',reduceMotion:false,micDeviceId:'',autoInputLevel:'yes'})),/INVALID_VALUE/);
    await page.waitForFunction(() => { const v=new Uint8Array(micVoiceSession.analyser.frequencyBinCount); micVoiceSession.analyser.getByteFrequencyData(v); return Math.max(...v)>20; });
    const original = await peak(); assert.ok(original > 1000 && original < 1500);
    await set('pitch', 12); await page.waitForFunction(() => { const s=[...voiceSessions][0],v=new Uint8Array(s.analyser.frequencyBinCount);s.analyser.getByteFrequencyData(v);let i=v.indexOf(Math.max(...v));return i*s.context.sampleRate/s.analyser.fftSize>2000; });
    assert.ok(await peak() > original * 1.7, 'Live pitch must change actual captured audio');
    await set('volume', 1.5); await set('gainDb', 3); await set('bass', 4); await set('treble', -3);
    await page.uncheck('#voice-monitor'); await page.waitForFunction(() => [...voiceSessions][0] && [...voiceSessions][0].context.state === 'running');
    await page.screenshot({ path: path.join(output, 'voice-settings.png') });
    const saved = await page.evaluate(() => api.bootstrap()); assert.deepEqual(saved.settings.voice, { volume: 1.5, gainDb: 3, bass: 4, treble: -3, pitch: 12 });
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(profile,'settings.json'),'utf8')).voice,saved.settings.voice);
    await page.click('#voice-reset'); await idle(); assert.equal(await page.inputValue('#voice-pitch'),'0');
    await page.click('#enable-mic'); await page.waitForFunction(() => voiceSessions.size === 0); assert.equal(await page.evaluate(() => micContext), null);
    await page.setViewportSize({width:760,height:900});
    for(const code of ['id','zh-CN','ja','ko']) { await page.click('#language-toggle');await page.locator(`#language-options [data-language="${code}"]`).click();await page.waitForFunction(code=>document.documentElement.lang===code,code);assert.ok((await page.locator('.voice-settings h3').textContent()).length);await page.locator('#voice-reset').scrollIntoViewIfNeeded();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:path.join(output,`voice-${code}.png`)}); }
    assert.deepEqual(errors, []); console.log('VOICE UI PASS: actual microphone monitor and octave pitch shift, five global voice values, reset, saved settings, all locales and microphone cleanup.');
  } catch(error) { console.log('VOICE FAILURE:',await page.locator('#status').textContent(),errors);throw error; }
  finally { await app.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
