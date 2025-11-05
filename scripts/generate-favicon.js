/**
 * Script to generate favicon.ico from icon.svg
 * 
 * Requirements:
 * npm install sharp
 * 
 * Usage:
 * node scripts/generate-favicon.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function generateFavicon() {
  const svgPath = path.join(__dirname, '../app/icon.svg');
  const icoPath = path.join(__dirname, '../public/favicon.ico');

  try {
    // Read SVG file
    const svgBuffer = fs.readFileSync(svgPath);
    
    // Generate ICO file with multiple sizes (16x16, 32x32, 48x48)
    const sizes = [16, 32, 48];
    const images = [];

    for (const size of sizes) {
      const pngBuffer = await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toBuffer();
      images.push(pngBuffer);
    }

    // Convert first PNG to ICO (simplified - actual ICO format is more complex)
    // For now, we'll create a 32x32 PNG that can be manually converted to ICO
    await sharp(svgBuffer)
      .resize(32, 32)
      .png()
      .toFile(icoPath.replace('.ico', '.png'));

    console.log('✅ Generated favicon.png at public/favicon.png');
    console.log('📝 Note: Convert favicon.png to favicon.ico using an online tool');
    console.log('   Recommended: https://convertio.co/png-ico/');
    
  } catch (error) {
    console.error('❌ Error generating favicon:', error);
    console.log('\n💡 Alternative: Use an online converter:');
    console.log('   1. Visit https://convertio.co/svg-ico/');
    console.log('   2. Upload app/icon.svg');
    console.log('   3. Download and save as public/favicon.ico');
  }
}

generateFavicon();

