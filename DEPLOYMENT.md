# 🚀 Production Deployment Guide

This guide explains how to deploy your chatbot widget to production and generate embed codes for clients.

## 📦 Build for Production

```bash
# Build the widget with production optimizations
npm run build:widget:prod

# Or manually
npm run build:widget
```

This creates optimized files in `dist/widget/`:
- `widget.js` - Main widget bundle
- `widget.css` - Styles
- `widget-loader.js` - Loader script (copied from public/)

## 🌐 Deployment Options

### Option 1: Static Hosting (Recommended)

Deploy `dist/widget/` to any static hosting service:

#### **Vercel**
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd dist/widget
vercel --prod
```

#### **Netlify**
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist/widget
```

#### **AWS S3 + CloudFront**
1. Upload `dist/widget/` to S3 bucket
2. Enable static website hosting
3. Configure CloudFront with CORS headers
4. Set bucket policy for public read access

#### **GitHub Pages**
1. Push `dist/widget/` to `gh-pages` branch
2. Enable GitHub Pages in repository settings
3. Access via: `https://yourusername.github.io/repo-name/`

### Option 2: CDN (Content Delivery Network)

Upload files to a CDN like:
- **Cloudflare CDN**
- **AWS CloudFront**
- **Azure CDN**
- **Google Cloud CDN**

Ensure CORS headers are configured on the CDN.

### Option 3: Custom Server

Use the provided `serve-widget.js` with a process manager:

```bash
# Using PM2
pm2 start serve-widget.js --name widget-server

# Using Docker
docker build -t widget-server .
docker run -p 3001:3001 widget-server
```

## 🔧 Server Configuration

### CORS Headers Required

Your server must include these headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type, Accept
Content-Type: application/javascript; charset=utf-8 (for .js files)
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name widget.yourdomain.com;

    root /var/www/widget;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Accept' always;
        
        # Correct MIME types
        location ~* \.js$ {
            add_header 'Content-Type' 'application/javascript; charset=utf-8' always;
        }
        
        location ~* \.css$ {
            add_header 'Content-Type' 'text/css; charset=utf-8' always;
        }
    }

    # Handle preflight requests
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Accept' always;
        add_header 'Content-Length' 0;
        add_header 'Content-Type' 'text/plain';
        return 204;
    }
}
```

### Apache Configuration

```apache
<VirtualHost *:80>
    ServerName widget.yourdomain.com
    DocumentRoot /var/www/widget

    <Directory /var/www/widget>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>

    # CORS headers
    Header always set Access-Control-Allow-Origin "*"
    Header always set Access-Control-Allow-Methods "GET, OPTIONS"
    Header always set Access-Control-Allow-Headers "Content-Type, Accept"

    # MIME types
    <FilesMatch "\.js$">
        Header set Content-Type "application/javascript; charset=utf-8"
    </FilesMatch>
    <FilesMatch "\.css$">
        Header set Content-Type "text/css; charset=utf-8"
    </FilesMatch>
</VirtualHost>
```

## 📝 Generating Embed Code

Once deployed, your widget will be available at:
```
https://yourdomain.com/widget-loader.js
```

### Embed Code Template

Your backend should generate this embed code for clients:

```html
<script 
  src="https://yourdomain.com/widget-loader.js" 
  data-api-key="CLIENT_API_KEY"
  data-api-url="https://api.yourdomain.com"
  data-widget-url="https://yourdomain.com"
></script>
```

### Backend API Endpoint Example

```javascript
// Express.js example
app.post('/api/generate-embed', (req, res) => {
  const { apiKey, apiUrl } = req.body;
  const widgetUrl = process.env.WIDGET_CDN_URL; // e.g., https://cdn.yourdomain.com
  
  const embedCode = `<script 
  src="${widgetUrl}/widget-loader.js" 
  data-api-key="${apiKey}"
  data-api-url="${apiUrl}"
  data-widget-url="${widgetUrl}"
></script>`;
  
  res.json({ embedCode });
});
```

### Client Usage

Clients simply copy-paste the embed code into their `index.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Client Website</title>
</head>
<body>
  <!-- Your widget embed code -->
  <script 
    src="https://yourdomain.com/widget-loader.js" 
    data-api-key="sk_live_..."
    data-api-url="https://api.yourdomain.com"
    data-widget-url="https://yourdomain.com"
  ></script>
  
  <!-- Rest of their HTML -->
</body>
</html>
```

## 🔒 Security Considerations

### 1. API Key Validation
- Validate API keys on your backend
- Use HTTPS for all API calls
- Implement rate limiting

### 2. CORS Restrictions (Optional)
Instead of `*`, restrict to specific domains:

```nginx
# Allow only specific domains
add_header 'Access-Control-Allow-Origin' 'https://client1.com https://client2.com' always;
```

### 3. Content Security Policy
Add CSP headers to prevent XSS:

```nginx
add_header 'Content-Security-Policy' "default-src 'self'; script-src 'self' 'unsafe-inline';" always;
```

## ✅ Testing Production Deployment

1. **Test CORS Headers:**
```bash
curl -I https://yourdomain.com/widget.js
# Should see: Access-Control-Allow-Origin: *
```

2. **Test from Different Domain:**
   - Create a test HTML file on a different domain
   - Embed the widget script
   - Verify it loads without CORS errors

3. **Browser Console:**
   - Open browser DevTools
   - Check Network tab for CORS headers
   - Verify no CORS errors in Console

## 📊 Monitoring

Monitor your widget deployment:
- **Uptime**: Use services like UptimeRobot
- **Analytics**: Track widget loads via your API
- **Error Tracking**: Use Sentry or similar for JavaScript errors
- **CDN Analytics**: Monitor CDN usage and performance

## 🔄 Update Process

When updating the widget:

1. Build new version: `npm run build:widget:prod`
2. Upload new files to CDN/server
3. Clear CDN cache (if using CDN)
4. Test on staging before production

## 📞 Support

For issues:
1. Check browser console for errors
2. Verify CORS headers are present
3. Test widget URL directly in browser
4. Check server logs for errors


