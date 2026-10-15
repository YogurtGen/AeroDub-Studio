const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const asar = require('@electron/asar');
const { execFileSync } = require('node:child_process');

const archive = path.join(process.env.AERODUB_PACKAGE_DIR || path.join(__dirname, '..', 'dist', 'win-unpacked'), 'resources', 'app.asar');
const bytes = fs.readFileSync(archive);
const { header, headerSize } = asar.getRawHeader(archive);
let checked = 0;

function verify(node, relative = '', unpacked = false) {
  if (node.files) {
    for (const [name, child] of Object.entries(node.files)) verify(child, path.join(relative, name), unpacked || node.unpacked);
    return;
  }
  if (node.link) return;
  const content = unpacked || node.unpacked
    ? fs.readFileSync(path.join(`${archive}.unpacked`, relative))
    : bytes.subarray(8 + headerSize + Number(node.offset), 8 + headerSize + Number(node.offset) + node.size);
  assert.equal(content.length, node.size, `Size mismatch: ${relative}`);
  assert.equal(createHash('sha256').update(content).digest('hex'), node.integrity.hash, `Corrupt package entry: ${relative}`);
  if (relative.startsWith(`src${path.sep}`)) assert.ok(content.equals(fs.readFileSync(path.join(__dirname, '..', relative))), `Stale packaged source: ${relative}`);
  checked++;
}

verify(header);
async function verifyEngine() {
  const runtime = path.join(path.dirname(archive), 'ai-runtime');
  for (const file of ['python.exe', 'python312.dll', 'LICENSE.txt', 'models/DEMUCS-LICENSE.txt', 'models/WHISPER-LICENSE.txt', 'models/whisper-large-v3/config.json', 'models/whisper-large-v3/tokenizer.json']) assert.ok(fs.existsSync(path.join(runtime, file)), `Missing engine file: ${file}`);
  for (const file of ['ai_worker.py', 'speaker_boundaries.py', 'lyric_reading.py']) assert.ok(fs.existsSync(path.join(`${archive}.unpacked`, 'src', file)), `Python worker module must be unpacked: ${file}`);
  execFileSync(path.join(runtime, 'python.exe'), ['-I', '-c', 'from fugashi import Tagger; from pykakasi import kakasi; from pypinyin import lazy_pinyin; from korean_romanizer.romanizer import Romanizer; assert list(Tagger()("青い空")); assert kakasi().convert("あおい"); assert lazy_pinyin("你好")==["ni","hao"]; assert Romanizer("안녕").romanize()=="annyeong"'], { windowsHide: true });
  const manifest = JSON.parse(fs.readFileSync(path.join(runtime, 'models/manifest.json'), 'utf8'));
  assert.deepEqual(manifest, JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/ai-model-manifest.json'), 'utf8')));
  for (const [file, expected] of [['demucs/04573f0d-f3cf25b2.th', manifest.separatorSHA256], ['whisper-large-v3/model.bin', manifest.transcriberSHA256], ['speakers/sherpa-onnx-pyannote-segmentation-3-0/model.onnx', manifest.diarization.segmentationSHA256], ['speakers/wespeaker_en_voxceleb_resnet34_LM.onnx', manifest.diarization.embeddingSHA256]]) {
    const hash = createHash('sha256');
    for await (const chunk of fs.createReadStream(path.join(runtime, 'models', file))) hash.update(chunk);
    assert.equal(hash.digest('hex'), expected, `Corrupt bundled model: ${file}`);
  }
  for (const file of ['models/speakers/sherpa-onnx-pyannote-segmentation-3-0/LICENSE', 'models/speakers/WESPEAKER-LICENSE.txt', 'models/speakers/WESPEAKER-MODEL-CARD.md']) assert.ok(fs.existsSync(path.join(runtime, file)), `Missing speaker-model attribution: ${file}`);
  console.log(`PACKAGE PASS: ${checked} bundled files have valid integrity and match current source; Python worker/runtime, model licenses and all four model checksums verified.`);
}
verifyEngine().catch(error => { console.error(error); process.exitCode = 1; });
