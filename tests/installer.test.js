'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const { sha256, validateDownloads, compileBootstrap } = require('../scripts/build-download-setup');
const { version } = require('../package.json');
const compiler = path.resolve('test-output/build-tools/inno-7.1.0/ISCC.exe');

test('release download boundary rejects invalid locations, hashes and asset names', () => {
  const files = [{ name: `AeroDubStudio-OfflineSetup-${version}-x64-1.bin`, size: 100, sha256: 'a'.repeat(64) }];
  const base = `https://github.com/YogurtGen/AeroDub-Studio/releases/download/v${version}-preview.1`;
  assert.doesNotThrow(() => validateDownloads(files, base));
  for (const bad of [base.replace('https:', 'http:'), base.replace('YogurtGen', 'someone'), base.replace(`v${version}-preview.1`, 'latest'), base.replace(version, version + '0'), base + '?download=1']) {
    assert.throws(() => validateDownloads(files, bad));
  }
  for (const bad of [{ ...files[0], name: '../evil.bin' }, { ...files[0], sha256: 'bad' }, { ...files[0], size: 2 ** 31 }]) {
    assert.throws(() => validateDownloads([bad], base));
  }
  assert.throws(() => validateDownloads([], base));
  assert.throws(() => validateDownloads([files[0], files[0]], base));
});

test('real installer verifies downloads and propagates nested setup failures', { timeout: 180000 }, async t => {
  assert.ok(fs.existsSync(compiler), 'Prepare the pinned Inno compiler with build:setup first.');
  const directory = fs.mkdtempSync(path.resolve('test-output/installer-'));
  const source = path.join(directory, 'payload.bin');
  const payload = crypto.randomBytes(10000000);
  fs.writeFileSync(source, payload);
  const offlineName = `AeroDubStudio-OfflineSetup-${version}-x64`;
  const fixtureScript = path.join(directory, 'fixture.iss');
  function compileFixture(fail) {
    fs.writeFileSync(fixtureScript, `[Setup]
AppName=AeroDub installer test fixture
AppVersion=${version}
AppId=studio.aerodub.isolated-test
DefaultDirName=${directory}\\unused
UsePreviousAppDir=no
PrivilegesRequired=lowest
Uninstallable=no
CreateUninstallRegKey=no
OutputDir=${directory}
OutputBaseFilename=${offlineName}
Compression=none
DiskSpanning=yes
DiskSliceSize=5000000
SlicesPerDisk=1
DisableWelcomePage=yes
DisableDirPage=yes
DisableProgramGroupPage=yes
DisableFinishedPage=yes
[Tasks]
Name: desktopicon; Description: "Isolated task fixture (no desktop shortcut)"
[Files]
Source: "${source}"; DestDir: "{app}"; Flags: ignoreversion
[Code]
procedure CurStepChanged(CurStep: TSetupStep);
begin
  if (CurStep = ssPostInstall) and WizardIsTaskSelected('desktopicon') then
    SaveStringToFile(ExpandConstant('{app}\\desktop-task-selected.txt'), 'selected', False);
end;

function GetCustomSetupExitCode: Integer;
begin
  Result := ${fail ? 42 : 0};
end;
`);
    const result = spawnSync(compiler, ['--quiet-progress', fixtureScript], { encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  }
  compileFixture(false);
  const files = [];
  for (const name of fs.readdirSync(directory).filter(name => name.endsWith('.bin') && name.startsWith(offlineName)).sort()) {
    files.push({ name, size: fs.statSync(path.join(directory, name)).size, sha256: await sha256(path.join(directory, name)) });
  }
  assert.equal(files.length, 3);
  let mode = 'ok';
  let expectedDestination;
  const requests = [];
  const server = http.createServer((req, res) => {
    const name = decodeURIComponent(req.url.slice(1));
    requests.push({ name, destinationExists: fs.existsSync(expectedDestination) });
    if (!files.some(file => file.name === name) || mode === 'missing') { res.writeHead(404); res.end('Missing fixture'); return; }
    const data = fs.readFileSync(path.join(directory, name));
    if (mode === 'corrupt') data[0] ^= 255;
    res.writeHead(200, { 'Content-Length': data.length, 'Content-Type': 'application/octet-stream' });
    res.end(data);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const options = { compiler, offlineExe: path.join(directory, offlineName + '.exe'), files,
    baseUrl: `http://127.0.0.1:${server.address().port}`, outputDir: path.join(directory, 'bootstrap'), fixture: true };
  let exe = compileBootstrap(options);
  async function run(name, tasks = '') {
    const destination = path.join(directory, name);
    expectedDestination = destination;
    const log = path.join(directory, name + '.log');
    const child = spawn(exe, ['/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', `/DIR=${destination}`, `/TASKS=${tasks}`, `/LOG=${log}`], { windowsHide: true });
    const timeout = setTimeout(() => child.kill(), 45000);
    const code = await new Promise((resolve, reject) => { child.on('error', reject); child.on('exit', resolve); });
    clearTimeout(timeout);
    return { code, destination, log: fs.existsSync(log) ? fs.readFileSync(log, 'utf8') : '' };
  }
  const success = await run('Custom folder 日本語 with spaces', 'desktopicon');
  assert.equal(success.code, 0, success.log);
  assert.deepEqual(fs.readFileSync(path.join(success.destination, 'payload.bin')), payload);
  assert.ok(files.every(file => requests.some(request => request.name === file.name)), 'Every slice was downloaded.');
  assert.ok(requests.every(request => !request.destinationExists), 'Downloading must not create a partial application folder.');
  assert.ok(success.log.includes('Selected installation folder before download: ' + success.destination));
  assert.ok(success.log.indexOf('Selected installation folder before download:') < success.log.indexOf('Downloading temporary file from'));
  assert.equal(fs.readFileSync(path.join(success.destination, 'desktop-task-selected.txt'), 'utf8'), 'selected', 'Desktop shortcut choice reaches the inner installer.');
  const noShortcut = await run('No desktop shortcut');
  assert.equal(noShortcut.code, 0, noShortcut.log);
  assert.ok(!fs.existsSync(path.join(noShortcut.destination, 'desktop-task-selected.txt')), 'Unselected shortcut must remain unselected.');
  mode = 'corrupt';
  const corrupt = await run('corrupt');
  assert.notEqual(corrupt.code, 0, corrupt.log);
  assert.ok(!fs.existsSync(corrupt.destination), 'Hash mismatch must stop before installation.');
  mode = 'missing';
  const missing = await run('missing');
  assert.notEqual(missing.code, 0, missing.log);
  assert.ok(!fs.existsSync(missing.destination), '404 must stop before installation.');
  assert.match(missing.log, /required package is missing from this release/);
  mode = 'ok';
  compileFixture(true);
  exe = compileBootstrap(options);
  const failed = await run('inner-failed');
  assert.notEqual(failed.code, 0, failed.log);
  assert.match(failed.log, /exit code 42/);
  console.log('Installer evidence:', directory);
});
