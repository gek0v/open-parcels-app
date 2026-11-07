const path = require('path');
const sharp = require('sharp');

const RES_DIR = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const ICON_PATH = path.join(ASSETS_DIR, 'icon.png');
const FOREGROUND_PATH = path.join(ASSETS_DIR, 'android-icon-foreground.png');

const DENSITIES = [
  { folder: 'mipmap-mdpi', size: 48, fgSize: 108 },
  { folder: 'mipmap-hdpi', size: 72, fgSize: 162 },
  { folder: 'mipmap-xhdpi', size: 96, fgSize: 216 },
  { folder: 'mipmap-xxhdpi', size: 144, fgSize: 324 },
  { folder: 'mipmap-xxxhdpi', size: 192, fgSize: 432 },
];

async function updateMipmaps() {
  console.log('Updating Android mipmap icons with Neo-Brutalist assets...');

  for (const d of DENSITIES) {
    const targetDir = path.join(RES_DIR, d.folder);

    // 1. ic_launcher.webp & ic_launcher_round.webp
    await sharp(ICON_PATH)
      .resize(d.size, d.size)
      .webp({ quality: 100 })
      .toFile(path.join(targetDir, 'ic_launcher.webp'));

    await sharp(ICON_PATH)
      .resize(d.size, d.size)
      .webp({ quality: 100 })
      .toFile(path.join(targetDir, 'ic_launcher_round.webp'));

    // 2. ic_launcher_foreground.webp
    await sharp(FOREGROUND_PATH)
      .resize(d.fgSize, d.fgSize)
      .webp({ quality: 100 })
      .toFile(path.join(targetDir, 'ic_launcher_foreground.webp'));

    // 3. ic_launcher_background.webp
    await sharp({
      create: {
        width: d.fgSize,
        height: d.fgSize,
        channels: 4,
        background: '#D8FF38',
      },
    })
      .webp({ quality: 100 })
      .toFile(path.join(targetDir, 'ic_launcher_background.webp'));

    console.log(`✔ Updated ${d.folder}`);
  }

  console.log('All Android mipmap icons updated successfully!');
}

updateMipmaps().catch(console.error);
