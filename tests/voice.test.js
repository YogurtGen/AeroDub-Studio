const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const voice = require('../src/voice'), media = require('../src/media');
async function rms(file, filter) { const data = await media.run(media.ffmpeg, ['-v','error','-ss','0.2','-i',file,'-t','1','-af',filter,'-ac','1','-f','f32le','pipe:1']); let sum=0; for(let i=0;i<data.length;i+=4)sum+=data.readFloatLE(i)**2;return Math.sqrt(sum/(data.length/4)); }
test('Global voice controls validate and change actual gain, EQ and pitch without changing capture length', async () => {
  assert.equal(voice.filter(voice.defaults), '');
  for (const [key, [min, max]] of Object.entries(voice.limits)) { assert.throws(()=>voice.validate({...voice.defaults,[key]:max+1}),/INVALID_VALUE/);assert.throws(()=>voice.validate({...voice.defaults,[key]:min-1}),/INVALID_VALUE/); }
  const dir=path.resolve('test-output/voice-backend',randomUUID()); await fs.mkdir(dir,{recursive:true});
  const source=path.join(dir,'source.wav'); await media.run(media.ffmpeg,['-y','-v','error','-f','lavfi','-i','aevalsrc=0.02*sin(2*PI*120*t)+0.02*sin(2*PI*1000*t)+0.02*sin(2*PI*6000*t):s=48000:d=2',source]);
  const original=await fs.readFile(source);
  const levels={};
  for(const [name,changes] of [['normal',{}],['gain',{gainDb:6,volume:1.5}],['bass',{bass:12}],['treble',{treble:12}],['pitch',{pitch:12}]]) {
    const capture=path.join(dir,name); await fs.mkdir(capture);
    const info=await media.processTake(source,capture,{voice:{...voice.defaults,...changes}});
    assert.ok(Math.abs(info.duration-2)<.02); assert.ok(Math.abs((await media.probe(path.join(capture,'raw.wav'))).duration-2)<.02);
    levels[name]={low:await rms(path.join(capture,'raw.wav'),'lowpass=f=250'),high:await rms(path.join(capture,'raw.wav'),'highpass=f=4000'),voice:await rms(path.join(capture,'raw.wav'),'bandpass=f=1000:width_type=h:width=150'),shift:await rms(path.join(capture,'raw.wav'),'bandpass=f=2000:width_type=h:width=150')};
  }
  assert.ok(levels.gain.voice>levels.normal.voice*2.8); assert.ok(levels.bass.low>levels.normal.low*2); assert.ok(levels.treble.high>levels.normal.high*2);
  assert.ok(levels.pitch.shift>levels.normal.shift*5 && levels.pitch.voice<levels.normal.voice*.3);
  assert.deepEqual(await fs.readFile(source),original);
});

test('Microphone capture requests mono automatic level without tying echo cancellation to noise suppression', () => {
  assert.deepEqual(voice.captureConstraints('mic-id',true,true), { audio:{ deviceId:{exact:'mic-id'},channelCount:1,noiseSuppression:true,echoCancellation:false,autoGainControl:true }, video:false });
  assert.equal(voice.captureConstraints('',false,true).audio.autoGainControl,true);
  assert.equal(voice.captureConstraints('',true,false).audio.autoGainControl,false);
  assert.equal(voice.captureConstraints('',false,false).audio.noiseSuppression,false);
});

test('Noise cleanup preserves quiet voice and timing rather than suppressing it below the old noise floor', async () => {
  const dir=path.resolve('test-output/quiet-input',randomUUID());await fs.mkdir(dir,{recursive:true});
  const source=path.join(dir,'quiet.wav');
  await media.run(media.ffmpeg,['-y','-v','error','-f','lavfi','-i',"aevalsrc='0.004*(sin(2*PI*700*t)+0.4*sin(2*PI*1400*t)+0.2*sin(2*PI*2100*t))*if(between(mod(t,1),0.1,0.8),1,0)':s=48000:d=3",source]);
  const capture=path.join(dir,'take');await fs.mkdir(capture);const info=await media.processTake(source,capture);
  const raw=await rms(path.join(capture,'raw.wav'),'anull'),clean=await rms(path.join(capture,'clean.wav'),'anull');
  assert.ok(raw>.001&&raw<.005,'Fixture must be a quiet microphone signal');
  assert.ok(clean>raw*.75,`Quiet voice was suppressed: ${20*Math.log10(clean/raw)}dB`);
  assert.ok(Math.abs(info.duration-(await media.probe(path.join(capture,'clean.wav'))).duration)<.001,'Denoiser/limiter may not add recording delay');
  const silence=await media.run(media.ffmpeg,['-v','error','-ss','0.92','-i',path.join(capture,'clean.wav'),'-t','0.05','-ac','1','-f','f32le','pipe:1']);
  let peak=0;for(let i=0;i<silence.length;i+=4)peak=Math.max(peak,Math.abs(silence.readFloatLE(i)));
  assert.ok(peak<.0001,'Silence must stay quiet');
});
