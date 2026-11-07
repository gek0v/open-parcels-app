const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');

// 1. Master App Icon SVG (1024x1024)
const iconSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <!-- Acid Lime Neo-Brutalist Canvas -->
  <rect width="1024" height="1024" fill="#D8FF38" rx="220" />
  <rect width="1024" height="1024" fill="none" stroke="#000000" stroke-width="32" rx="220" />

  <!-- Hard Black Drop Shadow for the Isometric Box -->
  <g transform="translate(42, 42)">
    <polygon points="512,180 790,320 790,620 512,770 234,620 234,320" fill="#000000" />
  </g>

  <!-- Isometric Parcel Box Base -->
  <g>
    <!-- Left Face -->
    <polygon points="234,320 512,465 512,770 234,620" fill="#FFE600" stroke="#000000" stroke-width="24" stroke-linejoin="round" />
    
    <!-- Right Face (Darker Tone for Depth) -->
    <polygon points="512,465 790,320 790,620 512,770" fill="#F59E0B" stroke="#000000" stroke-width="24" stroke-linejoin="round" />
    
    <!-- Top Face (Lighter Tint) -->
    <polygon points="512,180 790,320 512,465 234,320" fill="#FFF380" stroke="#000000" stroke-width="24" stroke-linejoin="round" />

    <!-- Packaging Tape Running along the Top Crease -->
    <polygon points="460,206 564,206 564,438 460,438" fill="#D97706" stroke="#000000" stroke-width="12" />
    <polygon points="460,438 564,438 564,742 460,742" fill="#B45309" stroke="#000000" stroke-width="12" />

    <!-- Barcode Sticker on Left Face -->
    <g transform="translate(280, 440) skewY(28) scale(0.85)">
      <rect width="150" height="90" fill="#FFFFFF" stroke="#000000" stroke-width="12" rx="6" />
      <!-- Barcode Stripes -->
      <line x1="20" y1="20" x2="20" y2="70" stroke="#000000" stroke-width="8" />
      <line x1="36" y1="20" x2="36" y2="70" stroke="#000000" stroke-width="4" />
      <line x1="48" y1="20" x2="48" y2="70" stroke="#000000" stroke-width="10" />
      <line x1="68" y1="20" x2="68" y2="70" stroke="#000000" stroke-width="6" />
      <line x1="84" y1="20" x2="84" y2="70" stroke="#000000" stroke-width="12" />
      <line x1="106" y1="20" x2="106" y2="70" stroke="#000000" stroke-width="4" />
      <line x1="120" y1="20" x2="120" y2="70" stroke="#000000" stroke-width="8" />
    </g>

    <!-- Priority Shipping Coral Sticker on Right Face -->
    <g transform="translate(670, 390) skewY(-28) scale(0.85)">
      <!-- Hard Shadow for Sticker -->
      <rect x="8" y="8" width="130" height="70" fill="#000000" rx="8" />
      <rect x="0" y="0" width="130" height="70" fill="#FF5C38" stroke="#000000" stroke-width="10" rx="8" />
      <!-- Arrow Symbol -->
      <polygon points="50,22 80,35 50,48" fill="#FFFFFF" stroke="#000000" stroke-width="4" />
      <line x1="30" y1="35" x2="60" y2="35" stroke="#FFFFFF" stroke-width="10" stroke-linecap="round" />
    </g>

    <!-- Retro Window Control Dots on Top Right Corner -->
    <circle cx="860" cy="140" r="16" fill="#FF5C38" stroke="#000000" stroke-width="8" />
    <circle cx="860" cy="185" r="16" fill="#FFE600" stroke="#000000" stroke-width="8" />
    <circle cx="860" cy="230" r="16" fill="#10B981" stroke="#000000" stroke-width="8" />
  </g>
</svg>
`;

// 2. Android Adaptive Icon Foreground SVG (Safe Zone in center)
const adaptiveForegroundSvg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- Hard Black Drop Shadow -->
  <g transform="translate(18, 18)">
    <polygon points="256,120 380,185 380,320 256,385 132,320 132,185" fill="#000000" />
  </g>

  <!-- Isometric Parcel Box Base -->
  <g>
    <!-- Left Face -->
    <polygon points="132,185 256,250 256,385 132,320" fill="#FFE600" stroke="#000000" stroke-width="14" stroke-linejoin="round" />
    
    <!-- Right Face -->
    <polygon points="256,250 380,185 380,320 256,385" fill="#F59E0B" stroke="#000000" stroke-width="14" stroke-linejoin="round" />
    
    <!-- Top Face -->
    <polygon points="256,120 380,185 256,250 132,185" fill="#FFF380" stroke="#000000" stroke-width="14" stroke-linejoin="round" />

    <!-- Packaging Tape -->
    <polygon points="234,132 278,132 278,238 234,238" fill="#D97706" stroke="#000000" stroke-width="8" />
    <polygon points="234,238 278,238 278,372 234,372" fill="#B45309" stroke="#000000" stroke-width="8" />

    <!-- Barcode Sticker -->
    <g transform="translate(154, 238) skewY(28) scale(0.45)">
      <rect width="130" height="75" fill="#FFFFFF" stroke="#000000" stroke-width="10" rx="4" />
      <line x1="16" y1="16" x2="16" y2="58" stroke="#000000" stroke-width="7" />
      <line x1="30" y1="16" x2="30" y2="58" stroke="#000000" stroke-width="4" />
      <line x1="42" y1="16" x2="42" y2="58" stroke="#000000" stroke-width="8" />
      <line x1="60" y1="16" x2="60" y2="58" stroke="#000000" stroke-width="5" />
      <line x1="75" y1="16" x2="75" y2="58" stroke="#000000" stroke-width="9" />
      <line x1="95" y1="16" x2="95" y2="58" stroke="#000000" stroke-width="6" />
    </g>

    <!-- Neon Coral Priority Sticker -->
    <g transform="translate(325, 218) skewY(-28) scale(0.45)">
      <rect x="0" y="0" width="110" height="60" fill="#FF5C38" stroke="#000000" stroke-width="8" rx="6" />
      <polygon points="42,18 68,30 42,42" fill="#FFFFFF" stroke="#000000" stroke-width="3" />
      <line x1="24" y1="30" x2="50" y2="30" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round" />
    </g>
  </g>
</svg>
`;

// 3. Splash Screen SVG (1024x1024)
const splashSvg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <!-- Acid Lime Canvas -->
  <rect width="1024" height="1024" fill="#D8FF38" />

  <!-- Center Parcel Box Hero -->
  <g transform="translate(0, -60)">
    <!-- Hard Black Drop Shadow -->
    <g transform="translate(32, 32)">
      <polygon points="512,180 740,300 740,550 512,680 284,550 284,300" fill="#000000" />
    </g>

    <!-- Isometric Parcel Box Base -->
    <g>
      <!-- Left Face -->
      <polygon points="284,300 512,420 512,680 284,550" fill="#FFE600" stroke="#000000" stroke-width="20" stroke-linejoin="round" />
      
      <!-- Right Face -->
      <polygon points="512,420 740,300 740,550 512,680" fill="#F59E0B" stroke="#000000" stroke-width="20" stroke-linejoin="round" />
      
      <!-- Top Face -->
      <polygon points="512,180 740,300 512,420 284,300" fill="#FFF380" stroke="#000000" stroke-width="20" stroke-linejoin="round" />

      <!-- Packaging Tape -->
      <polygon points="468,202 556,202 556,398 468,398" fill="#D97706" stroke="#000000" stroke-width="10" />
      <polygon points="468,398 556,398 556,656 468,656" fill="#B45309" stroke="#000000" stroke-width="10" />

      <!-- Barcode Sticker -->
      <g transform="translate(325, 400) skewY(28) scale(0.7)">
        <rect width="140" height="80" fill="#FFFFFF" stroke="#000000" stroke-width="10" rx="4" />
        <line x1="18" y1="18" x2="18" y2="62" stroke="#000000" stroke-width="8" />
        <line x1="34" y1="18" x2="34" y2="62" stroke="#000000" stroke-width="4" />
        <line x1="48" y1="18" x2="48" y2="62" stroke="#000000" stroke-width="9" />
        <line x1="68" y1="18" x2="68" y2="62" stroke="#000000" stroke-width="5" />
        <line x1="86" y1="18" x2="86" y2="62" stroke="#000000" stroke-width="10" />
        <line x1="110" y1="18" x2="110" y2="62" stroke="#000000" stroke-width="5" />
      </g>

      <!-- Priority Coral Sticker -->
      <g transform="translate(640, 360) skewY(-28) scale(0.7)">
        <rect width="120" height="65" fill="#FF5C38" stroke="#000000" stroke-width="10" rx="6" />
        <polygon points="45,18 75,32 45,46" fill="#FFFFFF" stroke="#000000" stroke-width="3" />
        <line x1="25" y1="32" x2="55" y2="32" stroke="#FFFFFF" stroke-width="8" stroke-linecap="round" />
      </g>
    </g>
  </g>

  <!-- Typography: OPEN PARCELS -->
  <g transform="translate(512, 720)">
    <!-- Brand Title with 3D black offset -->
    <text x="6" y="6" font-family="Arial, Helvetica, sans-serif" font-size="64" font-weight="900" text-anchor="middle" fill="#000000" letter-spacing="2">OPEN PARCELS</text>
    <text x="0" y="0" font-family="Arial, Helvetica, sans-serif" font-size="64" font-weight="900" text-anchor="middle" fill="#000000" letter-spacing="2">OPEN PARCELS</text>

    <!-- Tagline Badge -->
    <g transform="translate(0, 48)">
      <rect x="-190" y="0" width="380" height="42" fill="#000000" rx="6" />
      <text x="0" y="27" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="900" text-anchor="middle" fill="#FFE600" letter-spacing="3">UNIVERSAL LOGISTICS ENGINE</text>
    </g>

    <!-- Loading Segmented Cells -->
    <g transform="translate(-140, 115)">
      <rect x="0" y="0" width="45" height="18" fill="#000000" stroke="#000000" stroke-width="4" rx="3" />
      <rect x="60" y="0" width="45" height="18" fill="#000000" stroke="#000000" stroke-width="4" rx="3" />
      <rect x="120" y="0" width="45" height="18" fill="#000000" stroke="#000000" stroke-width="4" rx="3" />
      <rect x="180" y="0" width="45" height="18" fill="#000000" stroke="#000000" stroke-width="4" rx="3" />
      <rect x="240" y="0" width="45" height="18" fill="#FFFFFF" stroke="#000000" stroke-width="4" rx="3" />
    </g>
  </g>
</svg>
`;

async function generateAll() {
  console.log('Generating Neo-Brutalist App Icons and Splash Screens...');

  // 1. icon.png (1024x1024)
  await sharp(Buffer.from(iconSvg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(ASSETS_DIR, 'icon.png'));
  console.log('✔ Generated assets/icon.png (1024x1024)');

  // 2. android-icon-foreground.png (512x512)
  await sharp(Buffer.from(adaptiveForegroundSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(ASSETS_DIR, 'android-icon-foreground.png'));
  console.log('✔ Generated assets/android-icon-foreground.png (512x512)');

  // 3. android-icon-background.png (512x512)
  await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: '#D8FF38',
    },
  })
    .png()
    .toFile(path.join(ASSETS_DIR, 'android-icon-background.png'));
  console.log('✔ Generated assets/android-icon-background.png (512x512)');

  // 4. splash-icon.png (1024x1024)
  await sharp(Buffer.from(splashSvg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(ASSETS_DIR, 'splash-icon.png'));
  console.log('✔ Generated assets/splash-icon.png (1024x1024)');

  // 5. favicon.png (192x192)
  await sharp(Buffer.from(iconSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(ASSETS_DIR, 'favicon.png'));
  console.log('✔ Generated assets/favicon.png (192x192)');

  console.log('All assets successfully generated!');
}

generateAll().catch(console.error);
