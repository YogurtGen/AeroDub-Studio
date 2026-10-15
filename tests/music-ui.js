const { _electron } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {createHash} = require('node:crypto');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');
const media = require('../src/media');
const root = path.resolve(__dirname, '..');
const output = path.join(root, 'test-output/music-ui');
const source = path.join(root, 'test-output/music/source.mp3');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
(async () => {
  await fs.mkdir(output, {recursive:true});
  try { await fs.access(source); }
  catch { await promisify(execFile)('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'music-fixture.ps1'),'-Ffmpeg',media.ffmpeg],{windowsHide:true}); }
  const before = digest(await fs.readFile(source));
  const userData = path.join(output, `profile-${Date.now()}`), packaged = process.env.AERODUB_TEST_EXE;
  const app = await _electron.launch({executablePath:packaged || undefined,cwd:root,args:[...(packaged ? [] : ['.']),'--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',`--use-file-for-fake-audio-capture=${path.join(root,'test-output/media/mic.wav')}`],env:{...process.env,AERODUB_TEST_USER_DATA:userData}});
  const page = await app.firstWindow(), errors = []; page.on('pageerror', error=>errors.push(error.message));
  await app.evaluate(({BrowserWindow})=>{const window=BrowserWindow.getAllWindows()[0];window.webContents.setBackgroundThrottling(false);window.webContents.setAudioMuted(true);window.setOpacity(0);window.setIgnoreMouseEvents(true);window.setFocusable(false);window.setSkipTaskbar(true);});
  const idle = () => page.waitForFunction(()=>!busy && !saving && !recording,{},{timeout:120000});
  async function saveDialog(file) { await app.evaluate(({dialog},file)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:file});},file); }
  async function locale(code) { await page.click('#settings-toggle');await page.click('#language-toggle');await page.locator(`#language-options [data-language="${code}"]`).click();await idle();await page.keyboard.press('Escape'); }
  try {
    await page.waitForFunction(()=>musicReady === true);
    await app.evaluate(({dialog},file)=>{dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},source);
    await page.click('#music-upload-home'); await page.waitForFunction(()=>mode === 'music' && !busy,{},{timeout:120000});
    assert.equal(await page.locator('#song-name').textContent(),'source');
    const id = await page.evaluate(()=>songData.id); const projectDir = path.join(userData,'projects',id);
    const decoded = await Promise.all(['original.wav','vocals.wav','instrumental.wav'].map(file=>media.run(media.ffmpeg,['-v','error','-i',path.join(projectDir,file),'-f','f32le','pipe:1'])));
    assert.ok(decoded.every(audio=>audio.length===decoded[0].length));
    const scale = await page.evaluate(()=>songData.stemScale); let peakError=0, instrumentalEnergy=0;
    for(let i=0;i<decoded[0].length;i+=4){peakError=Math.max(peakError,Math.abs(decoded[0].readFloatLE(i)*scale-decoded[1].readFloatLE(i)-decoded[2].readFloatLE(i)));instrumentalEnergy+=decoded[2].readFloatLE(i)**2;}
    assert.ok(peakError<5e-7,'Stems must reconstruct the scaled input');assert.ok(instrumentalEnergy>0,'Instrumental must be real audio');
    await page.screenshot({path:path.join(output,'song-ready.png'),fullPage:true});
    await page.click('#song-play'); await page.waitForFunction(()=>songPosition() > 0.25);
    await page.waitForFunction(()=>songInstrumentGain.gain.value>.98&&songVoiceGain.gain.value<.02);
    await page.evaluate(()=>{window.previewSource=songSources[0];window.previewPosition=songPosition();});
    for (const selection of ['vocals','both','instrumental']) {
      await page.click(`[data-stem-preview="${selection}"]`);
      await page.waitForFunction(selection=>Math.abs(songInstrumentGain.gain.value-(selection==='vocals'?0:1))<.02&&Math.abs(songVoiceGain.gain.value-(selection==='instrumental'?0:1))<.02,selection);
      assert.equal(await page.inputValue('#stem-selection'),selection);assert.equal(await page.locator(`[data-stem-preview="${selection}"]`).getAttribute('aria-pressed'),'true');
      assert.equal(await page.evaluate(()=>songPlaying&&songSources[0]===window.previewSource&&songPosition()>=window.previewPosition),true,'Switching stems must keep the same audio source and playhead');
    }
    await page.selectOption('#stem-selection','vocals');await page.waitForFunction(()=>songInstrumentGain.gain.value<.02&&songVoiceGain.gain.value>.98);
    assert.equal(await page.locator('[data-stem-preview="vocals"]').getAttribute('aria-pressed'),'true');
    await page.locator('[data-stem-preview="both"]').focus();await page.keyboard.press('Space');await page.waitForFunction(()=>songInstrumentGain.gain.value>.98&&songVoiceGain.gain.value>.98);
    await page.click('#song-play'); await idle();
    for(const code of ['en','id','zh-CN','ja','ko']) {
      if(code!=='en')await locale(code);await page.setViewportSize({width:760,height:900});
      assert.deepEqual(await page.evaluate(code=>Object.keys(strings.en).filter(key=>!strings[code][key]),code),[]);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await page.locator('.stem-preview').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,`stem-preview-${code}.png`)});
    }
    await locale('en');await page.setViewportSize({width:1280,height:880});
    await page.fill('#song-seek','1.2');await page.locator('#song-seek').dispatchEvent('change');await idle();assert.ok(Math.abs(await page.evaluate(()=>songOffset)-1.2)<.1);
    for (const [selection,format] of [['instrumental','mp3'],['vocals','wav'],['both','wav']]) {
      const file=path.join(output,selection==='both'?'stems.zip':`${selection}.${format}`);
      await page.selectOption('#stem-selection',selection);await page.selectOption('#stem-format',format);await saveDialog(file);await page.click('#stem-export');await idle();await fs.access(file);
      if(selection!=='both'){const info=await media.probe(file);assert.ok(info.streams.some(s=>s.codec_type==='audio'));}
      else { const bytes=await fs.readFile(file);assert.equal(bytes.readUInt32LE(),0x04034b50);assert.ok(bytes.includes(Buffer.from('vocals.wav'))&&bytes.includes(Buffer.from('instrumental.wav'))); }
    }
    await page.selectOption('#stem-selection','vocals');await page.selectOption('#stem-format','mp3');await saveDialog(source);await page.click('#stem-export');await idle();assert.equal(digest(await fs.readFile(source)),before);assert.equal(await page.locator('#status').evaluate(n=>n.classList.contains('error')),true);
    await page.click('#song-language-toggle');assert.equal(await page.locator('#song-language-options button').count(),6);await page.locator('[data-song-language="en"]').click();
    await page.click('#song-transcribe');await idle();
    const transcript=await page.evaluate(()=>songData.lyrics);
    assert.ok(transcript.segments.length>0);assert.ok(transcript.segments.some(s=>/sunlight|voices|song/i.test(s.text)));assert.ok(transcript.segments.every(s=>s.end>s.start&&s.words.length));
    await page.screenshot({path:path.join(output,'lyrics-editor.png'),fullPage:true});
    const first=page.locator('.lyric-row').first();const edited='My blue sky <img src=x onerror=alert(1)> song';await first.locator('textarea').fill(edited);await first.locator('textarea').dispatchEvent('change');
    await page.click('#lyrics-save');await idle();assert.equal(await page.evaluate(()=>songData.lyrics.segments[0].text),edited);
    await page.click('#song-sing');await idle();assert.equal(await page.locator('#sing-room').isVisible(),true);await page.waitForFunction(()=>portalAudio.currentTime > .01);
    await page.click('#sing-play');await page.waitForFunction(()=>songPosition()>1);
    assert.ok(await page.evaluate(()=>songInstrumentGain.gain.value>.98&&songVoiceGain.gain.value>.98),'Singing keeps instrumental and its own guide even after a vocal-only preview');
    assert.equal(await page.locator('#lyric-current img').count(),0);assert.ok(await page.locator('.lyric-word').first().evaluate(n=>parseFloat(n.style.getPropertyValue('--sung')))>0);
    assert.ok(await page.evaluate(()=>{const data=new Uint8Array(songAnalyser.frequencyBinCount);songAnalyser.getByteFrequencyData(data);return data.some(v=>v>0);}));
    await page.click('#sing-play');await idle();
    await page.screenshot({path:path.join(output,'sing-room.png'),fullPage:true});
    await page.click('#sing-record');await page.waitForFunction(()=>recording&&countdownUntil>0);await page.click('#sing-stop');await idle();assert.equal(await page.evaluate(()=>songData.takes.length),0);
    await page.waitForFunction(()=>voiceSessions.size===0);
    await page.click('#settings-toggle');
    const voice = { volume: 1.5, gainDb: 3, bass: 4, treble: -3, pitch: 12 };
    for (const [key,value] of Object.entries(voice)) { await page.fill('#voice-'+key,String(value));await page.locator('#voice-'+key).dispatchEvent('input');await page.locator('#voice-'+key).dispatchEvent('change'); }
    await page.check('#voice-monitor');await page.waitForFunction(()=>voiceSessions.size===1&&!busy);await page.keyboard.press('Escape');
    await page.uncheck('#sing-original');await page.click('#sing-record');await page.waitForFunction(()=>recording&&singRecorder?.state==='recording');
    assert.equal(await page.evaluate(()=>singVoiceSession.context===songContext && voiceSessions.size===1),true);
    assert.equal(await page.evaluate(()=>singStream.getAudioTracks()[0].getConstraints().autoGainControl),true);assert.equal(await page.evaluate(()=>singStream.getAudioTracks()[0].getConstraints().echoCancellation),false);
    assert.equal(await page.isDisabled('#auto-input-level'),true,'Microphone level mode is stable during recording');
    await page.waitForFunction(()=>songData.takes.length===1&&!saving&&!recording,{},{timeout:30000});
    const voiceFile = path.join(projectDir,'takes',await page.evaluate(()=>songData.selectedTake),'voice.wav');assert.ok(await fs.stat(voiceFile));
    assert.deepEqual(await page.evaluate(()=>songData.takes[0].voice),voice);assert.equal(await page.evaluate(()=>voiceSessions.size),0);
    const energy = async frequency => { const bytes=await media.run(media.ffmpeg,['-v','error','-ss','0.5','-i',voiceFile,'-t','0.5','-af',`bandpass=f=${frequency}:t=h:w=400`,'-ac','1','-f','f32le','pipe:1']);let sum=0;for(let i=0;i<bytes.length;i+=4)sum+=bytes.readFloatLE(i)**2;return sum; };
    assert.ok(await energy(2400)>await energy(1200)*5,'Universal pitch must be baked into the singing take');
    await page.click('#settings-toggle');await page.uncheck('#voice-monitor');await page.click('#voice-reset');await idle();await page.keyboard.press('Escape');
    await page.click('#sing-listen-take');await page.waitForFunction(()=>songPosition()>.4);await page.click('#sing-play');await idle();
    await page.click('#sing-record');await page.waitForFunction(()=>recording&&songPosition()>1.5);await page.click('#sing-stop');await idle();assert.equal(await page.evaluate(()=>songData.takes.length),2);
    await page.locator('.song-takes summary').click();await page.locator('#song-takes-list input').first().check();await idle();
    await page.fill('#song-vocal-gain','1.5');await page.locator('#song-vocal-gain').dispatchEvent('input');await page.locator('#song-vocal-gain').dispatchEvent('change');await idle();
    const cover=path.join(output,'my-cover.mp3');await saveDialog(cover);await page.click('#sing-export-cover');await idle();const info=await media.probe(cover);assert.ok(Math.abs(info.duration-await page.evaluate(()=>songData.duration))<.1);
    for(const code of ['id','zh-CN','ja','ko']) {await locale(code);await page.setViewportSize({width:760,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:path.join(output,`sing-${code}.png`),fullPage:true});}
    await locale('en');await page.setViewportSize({width:1280,height:880});
    await page.click('#sing-back');await idle();assert.equal(await page.locator('#song-workspace').isVisible(),true);
    await page.click('[data-stem-preview="vocals"]');await page.click('#song-play');await page.waitForFunction(()=>songPlaying&&songInstrumentGain.gain.value<.02&&songVoiceGain.gain.value>.98);
    assert.equal(await page.evaluate(async()=>songSources[1].buffer===await songBuffer(songData.vocalsURL)),true,'Stem preview must play the original isolated vocals after reviewing a recorded take');
    await page.click('#song-play');await idle();
    await page.click('#home');await idle();await page.click('#projects-toggle');await page.locator(`[data-project-id="${id}"] .project-open`).click();await idle();assert.equal(await page.evaluate(()=>songData.takes.length),2);assert.equal(await page.evaluate(()=>songData.lyrics.segments[0].text),edited);assert.equal(await page.evaluate(()=>songData.vocalGain),1.5);
    await page.click('#song-new');await page.locator('#job').waitFor({state:'visible'});await page.click('#cancel');await idle();assert.equal(await page.evaluate(()=>songData.id),id);
    await page.click('#projects-toggle');await page.locator(`[data-project-id="${id}"] .project-delete`).click();await page.locator('#delete-project-dialog button[value=delete]').click();await idle();assert.equal(await page.locator('#welcome').isVisible(),true);await assert.rejects(fs.stat(projectDir),/ENOENT/);await fs.access(cover);
    assert.equal(digest(await fs.readFile(source)),before);assert.deepEqual(errors,[]);
    console.log('MUSIC UI PASS: actual GPU split/transcript; instrumental/vocals/both preview, live gain isolation without restarting audio, two-way export selection, keyboard and five-language narrow layouts; MP3/WAV/ZIP and source protection; edited lyrics, soft portal, spectrum, independent singing guide, universal voice preset and captured octave shift, microphone cleanup, capture/retake/cover export, original-stem preview after own take, reopen, cancellation and scoped deletion.');
  }catch(error){console.log('MUSIC FAILURE:',await page.locator('#status').textContent(),errors);await page.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});throw error;}
  finally {await app.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
