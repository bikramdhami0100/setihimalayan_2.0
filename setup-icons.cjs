const fs = require('fs');
const path = require('path');

const assets = 'D:\\backupfile\\setihimalayan_2.0\\seti_app\\assets';
const res = 'D:\\backupfile\\setihimalayan_2.0\\seti_app\\android\\app\\src\\main\\res';

// Copy logo.png to icon, adaptive-icon, splash-icon
const logo = path.join(assets, 'logo.png');
const targets = ['icon.png', 'adaptive-icon.png', 'splash-icon.png'];
targets.forEach(t => { fs.copyFileSync(logo, path.join(assets, t)); console.log('Copied logo.png -> ' + t); });

// Delete old mipmap icons
const fs2 = require('fs');
const mipmapDirs = fs2.readdirSync(res).filter(d => d.startsWith('mipmap-'));
mipmapDirs.forEach(dir => {
  const dirPath = path.join(res, dir);
  fs2.readdirSync(dirPath).filter(f => f.startsWith('ic_launcher')).forEach(f => {
    fs2.unlinkSync(path.join(dirPath, f));
    console.log('Deleted ' + path.join(dir, f));
  });
});

console.log('\n✅ Icons setup complete!');
console.log('Now run the build in PowerShell:');
console.log('  cd D:\\backupfile\\setihimalayan_2.0\\seti_app\\android');
console.log('  .\\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon');
