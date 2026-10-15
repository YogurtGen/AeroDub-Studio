const { app, nativeImage } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

app.whenReady().then(async () => {
  const dir = path.join(__dirname, '..', 'src', 'renderer');
  const icon = nativeImage.createFromPath(path.join(dir, 'app-icon.png'));
  if (icon.isEmpty()) throw new Error('Missing AeroDub icon PNG');
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const images = sizes.map(size => icon.resize({ width: size, height: size, quality: 'best' }).toPNG());
  const header = Buffer.alloc(6 + images.length * 16);
  header.writeUInt16LE(1, 2); header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  sizes.forEach((size, i) => { const entry = 6 + i * 16; header[entry] = header[entry + 1] = size === 256 ? 0 : size; header.writeUInt16LE(1, entry + 4); header.writeUInt16LE(32, entry + 6); header.writeUInt32LE(images[i].length, entry + 8); header.writeUInt32LE(offset, entry + 12); offset += images[i].length; });
  await fs.writeFile(path.join(dir, 'app-icon.ico'), Buffer.concat([header, ...images]));
  console.log('Created AeroDub ICO at 16, 24, 32, 48, 64, 128 and 256px.');
  app.quit();
}).catch(error => { console.error(error); app.exit(1); });
