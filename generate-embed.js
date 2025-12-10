/**
 * Generate Embed Code Script
 * 
 * Usage:
 *   node generate-embed.js --api-key=YOUR_API_KEY --api-url=https://api.example.com --widget-url=https://cdn.example.com
 * 
 * Or set environment variables:
 *   WIDGET_API_KEY=xxx WIDGET_API_URL=xxx WIDGET_URL=xxx node generate-embed.js
 */

const args = process.argv.slice(2);

// Parse command line arguments
const parseArgs = (args) => {
  const config = {};
  args.forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      config[key] = value;
    }
  });
  return config;
};

// Get configuration from args or environment
const cliConfig = parseArgs(args);
const config = {
  apiKey: cliConfig['api-key'] || process.env.WIDGET_API_KEY || '',
  apiUrl: cliConfig['api-url'] || process.env.WIDGET_API_URL || 'https://api.example.com',
  widgetUrl: cliConfig['widget-url'] || process.env.WIDGET_URL || 'https://cdn.example.com',
};

// Validate required fields
if (!config.apiKey) {
  console.error('❌ Error: API key is required');
  console.log('\nUsage:');
  console.log('  node generate-embed.js --api-key=YOUR_KEY --api-url=https://api.example.com --widget-url=https://cdn.example.com');
  console.log('\nOr set environment variables:');
  console.log('  WIDGET_API_KEY=xxx WIDGET_API_URL=xxx WIDGET_URL=xxx node generate-embed.js');
  process.exit(1);
}

// Generate embed code
const embedCode = `<script 
  src="${config.widgetUrl}/widget-loader.js" 
  data-api-key="${config.apiKey}"
  data-api-url="${config.apiUrl}"
  data-widget-url="${config.widgetUrl}"
></script>`;

// Output
console.log('\n📋 Widget Embed Code:\n');
console.log('─'.repeat(60));
console.log(embedCode);
console.log('─'.repeat(60));
console.log('\n📝 Copy the code above and paste it into your HTML <head> or <body> section.\n');

// Also output as JSON for API use
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ embedCode, config }, null, 2));
}


