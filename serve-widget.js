// Simple HTTP server with CORS support for widget files
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3001;
const WIDGET_DIR = path.join(__dirname, 'dist', 'widget');
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

// Helper function to set CORS headers
function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
}

const server = http.createServer((req, res) => {
  // Set CORS headers immediately for all responses
  setCorsHeaders(res);

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Log request for debugging
  console.log(`📥 ${req.method} ${req.url}`);

  // Remove query string and get file path
  let filePath = req.url.split('?')[0];
  
  // Default to index.html if root
  if (filePath === '/') {
    filePath = '/widget.html';
  }

  // Check if it's widget-loader.js (serve from public folder)
  if (filePath === '/widget-loader.js') {
    const loaderPath = path.join(PUBLIC_DIR, 'widget-loader.js');
    try {
      // Check synchronously if file exists
      if (!fs.existsSync(loaderPath)) {
        console.error(`❌ widget-loader.js not found at: ${loaderPath}`);
        res.writeHead(404, { 
          'Content-Type': 'text/plain; charset=utf-8',
        });
        res.end('widget-loader.js not found');
        return;
      }
      const data = fs.readFileSync(loaderPath);
      console.log(`✅ Serving widget-loader.js (${data.length} bytes)`);
      res.writeHead(200, { 
        'Content-Type': 'application/javascript; charset=utf-8',
      });
      res.end(data);
    } catch (err) {
      console.error(`❌ Error with widget-loader.js:`, err);
      res.writeHead(500, { 
        'Content-Type': 'text/plain; charset=utf-8',
      });
      res.end('Error reading widget-loader.js');
    }
    return;
  }

  // Remove leading slash and resolve path for widget files
  const safePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
  const fullPath = path.join(WIDGET_DIR, safePath);

  // Check if file exists
  fs.access(fullPath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error(`❌ File not found: ${filePath}`);
      console.error(`   Resolved path: ${fullPath}`);
      console.error(`   Widget dir: ${WIDGET_DIR}`);
      res.writeHead(404, { 
        'Content-Type': 'text/plain; charset=utf-8',
      });
      res.end(`File not found: ${filePath}`);
      return;
    }

    // Get file extension for MIME type
    const ext = path.extname(fullPath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Read and serve file
    fs.readFile(fullPath, (err, data) => {
      if (err) {
        console.error(`❌ Error reading file ${filePath}:`, err);
        res.writeHead(500, { 
          'Content-Type': 'text/plain; charset=utf-8',
        });
        res.end('Error reading file');
        return;
      }

      console.log(`✅ Serving ${filePath} (${data.length} bytes, ${contentType})`);
      res.writeHead(200, { 
        'Content-Type': contentType,
      });
      res.end(data);
    });
  });
});

// Check if directories exist before starting server
fs.access(WIDGET_DIR, fs.constants.F_OK, (err) => {
  if (err) {
    console.error(`\n❌ Widget directory not found: ${WIDGET_DIR}`);
    console.error(`   Please run: npm run build:widget\n`);
    process.exit(1);
  }
});

fs.access(PUBLIC_DIR, fs.constants.F_OK, (err) => {
  if (err) {
    console.error(`\n❌ Public directory not found: ${PUBLIC_DIR}\n`);
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log(`\n✅ Widget server running with CORS enabled!`);
  console.log(`   Local:    http://localhost:${PORT}`);
  console.log(`   Widget:   ${WIDGET_DIR}`);
  console.log(`   Public:   ${PUBLIC_DIR}`);
  console.log(`   CORS:     Enabled for all origins (*)`);
  console.log(`\n   Available endpoints:`);
  console.log(`   - http://localhost:${PORT}/widget-loader.js`);
  console.log(`   - http://localhost:${PORT}/widget.js`);
  console.log(`   - http://localhost:${PORT}/widget.css\n`);
});

// Handle server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use!`);
    console.error(`   Please stop the other server or change the PORT in serve-widget.js\n`);
  } else {
    console.error('\n❌ Server error:', err);
  }
  process.exit(1);
});

