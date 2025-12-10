// Copy widget-loader.js and serve.json to dist/widget after build
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const destDir = path.join(__dirname, 'dist', 'widget');

// Ensure dist/widget directory exists
if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

// Copy widget-loader.js
const loaderSource = path.join(__dirname, 'public', 'widget-loader.js');
const loaderDest = path.join(destDir, 'widget-loader.js');

try {
  if (fs.existsSync(loaderSource)) {
    fs.copyFileSync(loaderSource, loaderDest);
    console.log(`✅ Copied widget-loader.js to ${loaderDest}`);
  } else {
    console.warn(`⚠️  widget-loader.js not found at ${loaderSource}`);
  }
} catch (err) {
  console.error(`❌ Failed to copy widget-loader.js:`, err);
  process.exit(1);
}

// Copy serve.json (for npx serve CORS support)
const serveJsonSource = path.join(__dirname, 'serve.json');
const serveJsonDest = path.join(destDir, 'serve.json');

try {
  if (fs.existsSync(serveJsonSource)) {
    fs.copyFileSync(serveJsonSource, serveJsonDest);
    console.log(`✅ Copied serve.json to ${serveJsonDest}`);
  }
} catch (err) {
  console.warn(`⚠️  Failed to copy serve.json:`, err);
  // Don't exit - serve.json is optional
}

