/**
 * Script to generate PNG favicons from the Lord's Recovery logo
 * Run with: node scripts/generate-icons.js
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const publicDir = path.join(__dirname, '..', 'public');
const sourceImage = path.join(publicDir, 'artworks-wfZIDeeJET4z5aJj-zHUpNg-t500x500.jpg');

// Generate PNG icons
async function generateIcons() {
  console.log('Generating PNG icons from Lord\'s Recovery logo...\n');
  
  // Check if source image exists
  if (!fs.existsSync(sourceImage)) {
    console.error(`Source image not found: ${sourceImage}`);
    process.exit(1);
  }
  
  const sizes = [
    { name: 'apple-icon.png', size: 180 },
    { name: 'icon-192x192.png', size: 192 },
    { name: 'icon-512x512.png', size: 512 },
    { name: 'icon-dark-32x32.png', size: 32 },
    { name: 'icon-light-32x32.png', size: 32 },
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
  ];
  
  for (const { name, size } of sizes) {
    const outputPath = path.join(publicDir, name);
    try {
      await sharp(sourceImage)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(outputPath);
      console.log(`✓ Generated ${name} (${size}x${size})`);
    } catch (error) {
      console.error(`✗ Failed to generate ${name}:`, error.message);
    }
  }
  
  // Generate favicon.ico
  try {
    await sharp(sourceImage)
      .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(path.join(publicDir, 'favicon.ico'));
    console.log('✓ Generated favicon.ico (32x32)');
  } catch (error) {
    console.error('✗ Failed to generate favicon.ico:', error.message);
  }
  
  console.log('\nDone! All icons generated from Lord\'s Recovery logo.');
}

generateIcons().catch(console.error);