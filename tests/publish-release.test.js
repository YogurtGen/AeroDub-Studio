'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { sha256 } = require('../scripts/build-download-setup');
const { version } = require('../package.json');

test('publisher verifies uploads before publishing and keeps failures as drafts', async () => {
  const folder = fs.mkdtempSync(path.resolve('test-output/publisher-'));
  const helper = path.join(folder, 'mock.js');
  const log = path.join(folder, 'commands.jsonl');
  const gitExisted = fs.existsSync('.git');
  fs.writeFileSync(helper, `
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const [tool, ...args] = process.argv.slice(2);
const directory = process.env.AERODUB_PUBLISH_FIXTURE;
fs.appendFileSync(path.join(directory, 'commands.jsonl'), JSON.stringify({tool,args}) + '\\n');
if (tool === 'git') {
  if (args[0] === 'branch') console.log('main');
  if (args[0] === 'remote' && args[1] === 'get-url') console.log('https://github.com/YogurtGen/AeroDub-Studio.git');
  if (args[0] === 'rev-parse') console.log('a'.repeat(40));
  if (args[0] === 'diff') process.exit(1);
  if (args[0] === 'var' && process.env.AERODUB_PUBLISH_CASE === 'missing-author') process.exit(1);
} else {
  if (args[0] === 'auth' && process.env.AERODUB_PUBLISH_CASE === 'signed-out') process.exit(1);
  if (args[0] === 'release' && args[1] === 'view') process.exit(1);
  if (args[0] === 'api') {
    if (args[1] === 'user') { console.log(JSON.stringify({login:'fixture',id:123})); process.exit(0); }
    const names = ['payload.bin','release-manifest.json','SHA256SUMS.txt'];
    console.log(JSON.stringify({assets:names.map(name => {const data=fs.readFileSync(path.join(directory,name)); return {name,size:data.length,digest:'sha256:' + (process.env.AERODUB_PUBLISH_CASE === 'wrong-hash' ? '0'.repeat(64) : crypto.createHash('sha256').update(data).digest('hex'))};})}));
  }
}
`);
  for (const tool of ['gh', 'git']) fs.writeFileSync(path.join(folder, tool + '.cmd'),
    `@echo off\r\n"${process.execPath}" "${helper}" ${tool} %*\r\n`);
  const payloadPath = path.join(folder, 'payload.bin');
  fs.writeFileSync(payloadPath, 'Release publisher test fixture');
  fs.writeFileSync(path.join(folder, 'SHA256SUMS.txt'), 'Fixture checksums');
  fs.writeFileSync(path.join(folder, 'RELEASE_NOTES.md'), 'Fixture notes');
  fs.writeFileSync(path.join(folder, 'release-manifest.json'), JSON.stringify({ repository: 'YogurtGen/AeroDub-Studio',
    version, tag: `v${version}-preview.1`, assets: [{ name: 'payload.bin', size: fs.statSync(payloadPath).size, sha256: await sha256(payloadPath) }] }));
  for (const scenario of ['ok', 'missing-author', 'wrong-hash', 'signed-out']) {
    fs.writeFileSync(log, '');
    const result = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.resolve('scripts/publish-release.ps1'),
      '-GitHubCli', path.join(folder, 'gh.cmd'), '-ReleaseDirectory', folder], { encoding: 'utf8', windowsHide: true,
      env: { ...process.env, PATH: folder + path.delimiter + process.env.PATH, AERODUB_PUBLISH_FIXTURE: folder, AERODUB_PUBLISH_CASE: scenario,
        PSModulePath: path.join(process.env.WINDIR, 'System32', 'WindowsPowerShell', 'v1.0', 'Modules') } });
    const commands = fs.readFileSync(log, 'utf8').trim().split('\n').map(line => JSON.parse(line));
    const publishes = commands.filter(command => command.args.includes('--draft=false'));
    if (scenario === 'ok' || scenario === 'missing-author') {
      assert.equal(result.status, 0, result.stdout + result.stderr);
      assert.equal(publishes.length, 1);
      assert.ok(commands.findIndex(command => command.args[0] === 'api') < commands.indexOf(publishes[0]));
      assert.equal(commands.filter(command => command.args[1] === 'upload').length, 3);
      assert.ok(commands.some(command => command.args[1] === 'create' && command.args.includes('--draft')));
      if (scenario === 'missing-author') assert.ok(commands.some(command => command.args.includes('user.email=123+fixture@users.noreply.github.com')));
    } else {
      assert.notEqual(result.status, 0, result.stdout + result.stderr);
      assert.equal(publishes.length, 0, 'An unverified or unauthenticated release must never be published.');
      if (scenario === 'signed-out') assert.equal(commands.length, 1, 'Authentication failure must stop before Git changes.');
    }
  }
  assert.equal(fs.existsSync('.git'), gitExisted, 'Mocked publishing must not change the real repository.');
});
