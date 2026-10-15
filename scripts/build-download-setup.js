'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { version } = require('../package.json');
const root = path.resolve(__dirname, '..');
const repository = 'YogurtGen/AeroDub-Studio';
const releaseTagPattern = new RegExp(`^v${version.replaceAll('.', '\\.')}(-[a-z\\d.]+)?$`);

async function sha256(file) {
  const hash = crypto.createHash('sha256');
  for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

function validateDownloads(files, baseUrl, fixture = false) {
  const url = new URL(baseUrl);
  if (!(url.protocol === 'https:' && url.hostname === 'github.com' &&
    url.pathname.startsWith(`/${repository}/releases/download/v${version}`) &&
    releaseTagPattern.test(url.pathname.split('/').pop()) &&
    !url.username && !url.password && !url.search && !url.hash) &&
    !(fixture && url.protocol === 'http:' && url.hostname === '127.0.0.1')) {
    throw new Error('Downloads must use a version-pinned AeroDub GitHub Release URL.');
  }
  if (!files.length || new Set(files.map(file => file.name)).size !== files.length) throw new Error('Missing or duplicate data slices.');
  for (const file of files) {
    if (!/^AeroDubStudio-OfflineSetup-[\d.]+-x64-\d+\.bin$/.test(file.name) ||
      !/^[a-f\d]{64}$/.test(file.sha256) || !Number.isSafeInteger(file.size) ||
      file.size <= 0 || file.size >= 2 ** 31) throw new Error(`Invalid release data slice: ${file.name}`);
  }
}

function compileBootstrap({ compiler, offlineExe, files, baseUrl, outputDir, fixture = false }) {
  validateDownloads(files, baseUrl, fixture);
  fs.mkdirSync(outputDir, { recursive: true });
  const quote = value => String(value).replaceAll('"', '""');
  const pascal = value => String(value).replaceAll("'", "''");
  const size = (files.reduce((total, file) => total + file.size, 0) / 1e9).toFixed(2) + ' GB';
  const config = path.join(outputDir, 'download-config.iss');
  fs.writeFileSync(config, [
    `#define AppVersion "${version}"`,
    `#define SetupOutput "${quote(outputDir)}"`,
    `#define OfflineSetup "${quote(offlineExe)}"`,
    `#define OfflineName "${quote(path.basename(offlineExe))}"`,
    `#define DownloadSize "${size}"`,
    `#define ReleasePage "${quote(baseUrl.replace('/releases/download/', '/releases/tag/'))}"`,
    `#define AppIcon "${quote(path.join(root, 'src', 'renderer', 'app-icon.ico'))}"`,
    `#define AppLicense "${quote(path.join(root, 'LICENSE'))}"`,
    '[Code]',
    'procedure AddReleaseDownloads; forward;',
    // The implementation follows the shared script so DownloadPage is in scope.
  ].join('\r\n') + '\r\n');
  const generatedScript = path.join(outputDir, 'download-build.iss');
  fs.writeFileSync(generatedScript, `#define ReleaseConfig "${quote(config)}"\r\n` +
    `#include "${quote(path.join(root, 'installer', 'download.iss'))}"\r\n` +
    'procedure AddReleaseDownloads;\r\nbegin\r\n' + files.map(file =>
      `  DownloadPage.Add('${pascal(baseUrl + '/' + file.name)}', '${pascal(file.name)}', '${file.sha256}');`
    ).join('\r\n') + '\r\nend;\r\n');
  const result = spawnSync(compiler, ['--quiet-progress', generatedScript], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error(`Download installer compilation failed:\n${result.stdout}\n${result.stderr}`);
  return path.join(outputDir, `AeroDubStudio-Setup-${version}-x64.exe`);
}

async function build(outputDir, compiler, tag) {
  if (!releaseTagPattern.test(tag)) throw new Error('Invalid or mismatched release tag.');
  outputDir = path.resolve(outputDir);
  const offlineName = `AeroDubStudio-OfflineSetup-${version}-x64.exe`;
  const offlineExe = path.join(outputDir, offlineName);
  if (!fs.statSync(offlineExe).isFile()) throw new Error('Build the offline installer first.');
  const names = fs.readdirSync(outputDir).filter(name => name.startsWith(`AeroDubStudio-OfflineSetup-${version}-x64-`) && name.endsWith('.bin')).sort();
  const files = [];
  for (const [index, name] of names.entries()) {
    if (name !== `AeroDubStudio-OfflineSetup-${version}-x64-${index + 1}.bin`) throw new Error('Nonsequential data slices.');
    files.push({ name, size: fs.statSync(path.join(outputDir, name)).size, sha256: await sha256(path.join(outputDir, name)) });
  }
  const baseUrl = `https://github.com/${repository}/releases/download/${tag}`;
  const exe = compileBootstrap({ compiler, offlineExe, files, baseUrl, outputDir });
  const assets = [{ name: path.basename(exe), size: fs.statSync(exe).size, sha256: await sha256(exe) }, ...files,
    { name: offlineName, size: fs.statSync(offlineExe).size, sha256: await sha256(offlineExe) }];
  fs.copyFileSync(path.join(root, 'RELEASE_NOTES.md'), path.join(outputDir, 'RELEASE_NOTES.md'));
  fs.copyFileSync(path.join(root, 'installer', 'README-INSTALL.txt'), path.join(outputDir, 'README-INSTALL.txt'));
  const sourceName = `AeroDubStudio-Source-${version}.zip`;
  const sourceArchive = path.join(outputDir, sourceName);
  // Replace only this generated archive, so reruns cannot retain deleted source files.
  if (fs.existsSync(sourceArchive)) fs.unlinkSync(sourceArchive);
  const sourceEntries = ['src', 'scripts', 'tests', 'docs', 'installer', '.gitignore', 'DESIGN.md', 'LICENSE',
    'package.json', 'package-lock.json', 'README.md', 'RELEASE_NOTES.md', 'THIRD_PARTY_NOTICES.md'];
  const psQuote = value => "'" + value.replaceAll("'", "''") + "'";
  const zipCommand = '$ErrorActionPreference = \'Stop\'; Compress-Archive -LiteralPath @(' + sourceEntries.map(psQuote).join(',') +
    ') -DestinationPath ' + psQuote(sourceArchive) + ' -CompressionLevel Optimal';
  const zip = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(zipCommand, 'utf16le').toString('base64')], {
    cwd: root, windowsHide: true, encoding: 'utf8', env: { ...process.env,
      PSModulePath: path.join(process.env.WINDIR, 'System32', 'WindowsPowerShell', 'v1.0', 'Modules') },
  });
  if (zip.status !== 0) throw new Error(`Source archive failed: ${zip.stdout}\n${zip.stderr}`);
  for (const name of [sourceName, 'RELEASE_NOTES.md', 'README-INSTALL.txt']) {
    assets.push({ name, size: fs.statSync(path.join(outputDir, name)).size, sha256: await sha256(path.join(outputDir, name)) });
  }
  fs.writeFileSync(path.join(outputDir, 'release-manifest.json'), JSON.stringify({ version, tag, repository, baseUrl, assets }, null, 2) + '\n');
  fs.writeFileSync(path.join(outputDir, 'SHA256SUMS.txt'), assets.map(asset => `${asset.sha256}  ${asset.name}`).join('\n') + '\n');
  console.log(`Single-EXE download installer: ${exe}\nRelease tag: ${tag}\nUpload all manifest assets before publishing the release.`);
}

if (require.main === module) build(...process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { sha256, validateDownloads, compileBootstrap };
