/**
 * Chat Widget Loader Script
 * 
 * Usage:
 * <script 
 *   src="https://your-cdn.com/widget-loader.js" 
 *   data-api-key="your-api-key"
 *   data-api-url="https://your-api.com"
 *   data-widget-url="https://your-cdn.com/widget"
 * ></script>
 */

(function() {
  'use strict';

  // Configuration
  const WIDGET_CONFIG = {
    scriptId: 'chat-widget-script',
    containerId: 'chat-widget-container',
    apiKey: null,
    apiUrl: null,
    widgetUrl: null,
  };

  // Get configuration from script tag
  const currentScript = document.currentScript || 
    document.querySelector(`script[data-widget-api-key]`) ||
    document.querySelector(`script[src*="widget-loader"]`);

  if (currentScript) {
    WIDGET_CONFIG.apiKey = currentScript.getAttribute('data-api-key') || 
      currentScript.getAttribute('data-widget-api-key');
    WIDGET_CONFIG.apiUrl = currentScript.getAttribute('data-api-url') || 
      currentScript.getAttribute('data-widget-api-url') || '';
    
    // Widget CDN URL (where widget.js and widget.css are hosted)
    WIDGET_CONFIG.widgetUrl = currentScript.getAttribute('data-widget-url') || 
      currentScript.getAttribute('data-cdn-url') || 
      (currentScript.src ? currentScript.src.replace('/widget-loader.js', '') : '');
  }

  // Check if widget is already loaded
  if (document.getElementById(WIDGET_CONFIG.containerId)) {
    console.warn('Chat widget is already loaded');
    return;
  }

  // Validate required configuration
  if (!WIDGET_CONFIG.apiKey) {
    console.error('Chat widget: API key is required. Please provide data-api-key attribute.');
    return;
  }

  if (!WIDGET_CONFIG.widgetUrl) {
    console.error('Chat widget: Widget URL is required. Please provide data-widget-url attribute.');
    return;
  }

  // Create container with maximum CSS isolation
  const container = document.createElement('div');
  container.id = WIDGET_CONFIG.containerId;
  container.className = 'chat-widget-isolated chat-widget-wrapper';
  
  // Add inline styles for immediate protection (before CSS loads)
  container.setAttribute('style', `
    all: initial !important;
    display: block !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif !important;
    font-size: 14px !important;
    line-height: 1.5 !important;
    color: #000000 !important;
    background: transparent !important;
    position: fixed !important;
    z-index: 999999 !important;
    isolation: isolate !important;
    box-sizing: border-box !important;
    margin: 0 !important;
    padding: 0 !important;
    border: none !important;
    outline: none !important;
    text-align: left !important;
    visibility: visible !important;
    opacity: 1 !important;
    pointer-events: auto !important;
    transform: none !important;
    filter: none !important;
  `);
  
  document.body.appendChild(container);

  // Store config in window for widget to access
  window.__CHAT_WIDGET_CONFIG__ = {
    apiKey: WIDGET_CONFIG.apiKey,
    apiUrl: WIDGET_CONFIG.apiUrl,
    containerId: WIDGET_CONFIG.containerId,
  };

  // Load widget script and styles
  function loadWidget() {
    // Inject comprehensive critical CSS immediately for maximum isolation
    const criticalCSS = `
      /* Widget Container Isolation - Prevents conflicts with host website */
      #${WIDGET_CONFIG.containerId} {
        all: initial !important;
        display: block !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
        color: #000000 !important;
        background: transparent !important;
        position: fixed !important;
        z-index: 999999 !important;
        isolation: isolate !important;
        box-sizing: border-box !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        outline: none !important;
        text-align: left !important;
        visibility: visible !important;
        opacity: 1 !important;
        pointer-events: auto !important;
      }
      
      /* Reset all children to prevent host website style inheritance */
      #${WIDGET_CONFIG.containerId} *,
      #${WIDGET_CONFIG.containerId} *::before,
      #${WIDGET_CONFIG.containerId} *::after {
        box-sizing: border-box !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        font-size: inherit !important;
        font-family: inherit !important;
        line-height: inherit !important;
        color: inherit !important;
        background: transparent !important;
        text-align: inherit !important;
        text-decoration: none !important;
        text-transform: none !important;
        letter-spacing: normal !important;
        word-spacing: normal !important;
        vertical-align: baseline !important;
      }
      
      /* Prevent host website styles from affecting widget elements */
      #${WIDGET_CONFIG.containerId} a,
      #${WIDGET_CONFIG.containerId} button,
      #${WIDGET_CONFIG.containerId} input,
      #${WIDGET_CONFIG.containerId} textarea,
      #${WIDGET_CONFIG.containerId} select {
        font-family: inherit !important;
        font-size: inherit !important;
        line-height: inherit !important;
        color: inherit !important;
        background: transparent !important;
        border: none !important;
        outline: none !important;
        box-shadow: none !important;
        text-shadow: none !important;
      }
    `;
    
    const style = document.createElement('style');
    style.id = 'chat-widget-critical-css';
    style.textContent = criticalCSS;
    document.head.appendChild(style);
    
    // Load CSS file with error handling
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${WIDGET_CONFIG.widgetUrl}/widget.css`;
    link.onerror = function() {
      console.error('Failed to load chat widget CSS');
    };
    document.head.appendChild(link);

    // Load JS
    const script = document.createElement('script');
    script.id = WIDGET_CONFIG.scriptId;
    script.type = 'module';
    script.src = `${WIDGET_CONFIG.widgetUrl}/widget.js`;
    script.onload = function() {
      console.log('Chat widget loaded successfully');
    };
    script.onerror = function() {
      console.error('Failed to load chat widget script');
    };
    document.body.appendChild(script);
  }

  // Initialize widget when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadWidget);
  } else {
    loadWidget();
  }

  // Expose widget API for programmatic access
  window.ChatWidget = {
    init: function(config) {
      if (config.apiKey) WIDGET_CONFIG.apiKey = config.apiKey;
      if (config.apiUrl) WIDGET_CONFIG.apiUrl = config.apiUrl;
      if (config.widgetUrl) WIDGET_CONFIG.widgetUrl = config.widgetUrl;
      
      window.__CHAT_WIDGET_CONFIG__ = {
        apiKey: WIDGET_CONFIG.apiKey,
        apiUrl: WIDGET_CONFIG.apiUrl,
        containerId: WIDGET_CONFIG.containerId,
      };
      
      loadWidget();
    },
    destroy: function() {
      if (window.ChatWidgetInstance && typeof window.ChatWidgetInstance.destroy === 'function') {
        window.ChatWidgetInstance.destroy();
      }
      const container = document.getElementById(WIDGET_CONFIG.containerId);
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
      const script = document.getElementById(WIDGET_CONFIG.scriptId);
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    },
    config: WIDGET_CONFIG,
  };
})();

