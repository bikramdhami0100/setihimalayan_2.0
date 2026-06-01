const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const assets = 'D:\\backupfile\\setihimalayan_2.0\\seti_app\\assets';
const res = 'D:\\backupfile\\setihimalayan_2.0\\seti_app\\android\\app\\src\\main\\res';

async function run() {
  const logoPath = path.join(assets, 'logo.png');
  const baseSize = 1024;

  async function createPadded(filename, padding) {
    const contentSize = Math.round(baseSize * (1 - padding * 2));
    const buf = await sharp(logoPath)
      .resize(contentSize, contentSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();
    await sharp({ create: { width: baseSize, height: baseSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: buf, top: Math.round(baseSize * padding), left: Math.round(baseSize * padding) }])
      .png()
      .toFile(path.join(assets, filename));
    console.log('Created', filename);
  }

  await createPadded('icon.png', 0.10);
  await createPadded('adaptive-icon.png', 0.17);
  console.log('Creating splash-icon.png at 1284x1284, no padding');
  await sharp(logoPath)
    .resize(1284, 1284, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toFile(path.join(assets, 'splash-icon.png'));

  // Delete old mipmap icons
  const mipmapDirs = fs.readdirSync(res).filter(d => d.startsWith('mipmap-'));
  mipmapDirs.forEach(dir => {
    const dirPath = path.join(res, dir);
    fs.readdirSync(dirPath).filter(f => f.startsWith('ic_launcher')).forEach(f => {
      fs.unlinkSync(path.join(dirPath, f));
      console.log('Deleted ' + path.join(dir, f));
    });
  });

  console.log('\nDone! Icons regenerated with padding.');
}

run().catch(e => { console.error(e); process.exit(1); });
