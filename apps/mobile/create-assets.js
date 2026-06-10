const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir);
}

const srcIcon = "C:\\Users\\march\\.gemini\\antigravity-ide\\brain\\1acd82a4-9746-4667-9d97-b3a32b9e647c\\app_icon_1781122734808.png";
const srcSplash = "C:\\Users\\march\\.gemini\\antigravity-ide\\brain\\1acd82a4-9746-4667-9d97-b3a32b9e647c\\app_splash_1781122748277.png";

try {
  fs.copyFileSync(srcIcon, path.join(assetsDir, 'icon.png'));
  fs.copyFileSync(srcIcon, path.join(assetsDir, 'adaptive-icon.png'));
  fs.copyFileSync(srcSplash, path.join(assetsDir, 'splash.png'));
  console.log('Assets copied successfully!');
} catch (err) {
  console.error('Error copying assets:', err.message);
}
