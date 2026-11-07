const path = require('path');
const sharp = require('sharp');

const RES_DIR = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
const SPLASH_SRC = path.join(__dirname, '..', 'assets', 'splash-icon.png');

const DENSITIES = [
  { folder: 'drawable-mdpi', size: 240 },
  { folder: 'drawable-hdpi', size: 360 },
  { folder: 'drawable-xhdpi', size: 480 },
  { folder: 'drawable-xxhdpi', size: 720 },
  { folder: 'drawable-xxxhdpi', size: 960 },
];

async function updateSplash() {
  console.log('Updating Android splash screen logos...');
  for (const d of DENSITIES) {
    const targetFile = path.join(RES_DIR, d.folder, 'splashscreen_logo.png');
    await sharp(SPLASH_SRC)
      .resize(d.size, d.size)
      .png()
      .toFile(targetFile);
    console.log(`✔ Updated ${d.folder}/splashscreen_logo.png`);
  }
}

updateSplash().catch(console.error);
