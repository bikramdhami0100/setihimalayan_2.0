// Resize logo.png to fit Android adaptive icon safe zone
// Run: node D:\backupfile\setihimalayan_2.0\resize-icon.cjs

const fs = require('fs');
const path = require('path');

// We'll use a simple approach: create a padded version using the 'sharp' library if available,
// or provide instructions to manually edit the image.

const assetsDir = 'D:\\backupfile\\setihimalayan_2.0\\seti_app\\assets';
const logoPath = path.join(assetsDir, 'logo.png');

console.log('Logo file size:', fs.statSync(logoPath).size, 'bytes');

console.log('\n=== Manual steps to fix icon size ===');
console.log('');
console.log('Open logo.png in any image editor (Paint, Photoshop, etc.)');
console.log('1. Resize canvas to make it square (e.g., 1024x1024)');
console.log('2. Add 25% transparent padding on all sides (so logo is centered in the middle 50% area)');
console.log('3. Save as logo.png (overwrite)');
console.log('');
console.log('Or run this automated fix (requires sharp library):');
console.log('  npm install sharp');
console.log('  node D:\\backupfile\\setihimalayan_2.0\\resize-icon.cjs --run');

// If --run flag is passed, try to use sharp
if (process.argv.includes('--run')) {
  try {
    const sharp = require('sharp');
    
    sharp(logoPath)
      .resize(1024, 1024, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toBuffer()
      .then(buf => {
        // Create padded version - add 25% padding
        const padding = 256; // 25% of 1024
        const size = 1024 + padding * 2;
        
        sharp(buf)
          .resize(size, size, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .extend({
            top: padding,
            bottom: padding,
            left: padding,
            right: padding,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .toFile(path.join(assetsDir, 'adaptive-icon.png'))
          .then(() => {
            console.log('Created adaptive-icon.png with proper padding');
          })
          .catch(err => console.error('Error:', err));
      })
      .catch(err => console.error('Error:', err));
  } catch (e) {
    console.error('sharp not installed. Install with: npm install sharp');
  }
}
