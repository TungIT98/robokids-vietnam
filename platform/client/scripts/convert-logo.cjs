const svg2png = require('svg2png');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

async function convertLogo() {
  const svgPath = path.join(publicDir, 'robokids-logo.svg');
  const pngPath = path.join(publicDir, 'robokids-logo.png');

  const svgBuffer = fs.readFileSync(svgPath);

  // Convert to PNG at 2x for retina displays (800x240)
  const pngBuffer = await svg2png(svgBuffer, { width: 800, height: 240 });

  fs.writeFileSync(pngPath, pngBuffer);

  console.log('Created robokids-logo.png (800x240)');
}

convertLogo().catch(console.error);
