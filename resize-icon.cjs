const sharp = require('sharp');
const path = require('path');

const assetsDir = 'D:\\backupfile\\setihimalayan_2.0\\seti_app\\assets';
const logoPath = path.join(assetsDir, 'logo.png');

async function resize() {
  const metadata = await sharp(logoPath).metadata();
  console.log(`Original: ${metadata.width}x${metadata.height}`);

  const baseSize = 1024;

  // Helper: create padded icon with given padding fraction
  async function createPadded(filename, label, paddingFraction) {
    const paddedSize = baseSize;
    const contentSize = Math.round(baseSize * (1 - paddingFraction * 2));

    const buffer = await sharp(logoPath)
      .resize(contentSize, contentSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    const padded = await sharp({
      create: { width: paddedSize, height: paddedSize, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
    })
      .composite([{ input: buffer, top: Math.round(baseSize * paddingFraction), left: Math.round(baseSize * paddingFraction) }])
      .png()
      .toFile(path.join(assetsDir, filename));

    console.log(`${label}: ${filename} (${paddedSize}x${paddedSize}, ${(paddingFraction * 100).toFixed(0)}% padding each side)`);
  }

  // adaptive-icon.png: standard 17% padding (Android safe zone = inner 66% of circle)
  await createPadded('adaptive-icon.png', 'Android Adaptive Icon', 0.17);

  // icon.png: standard 10% padding for non-adaptive app icon
  await createPadded('icon.png', 'Standard App Icon', 0.10);

  // splash-icon.png: 5% padding for splash screen
  await createPadded('splash-icon.png', 'Splash Icon', 0.05);

  console.log('\nDone! Icons resized with padding.');
}

resize().catch(e => { console.error(e); process.exit(1); });
