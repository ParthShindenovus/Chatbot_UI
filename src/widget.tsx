import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ChatWidget } from "./features/chat"
import './index.css'

// Create a separate query client for the widget
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
})

// Widget configuration interface
interface WidgetConfig {
  apiKey?: string
  apiUrl?: string
  containerId?: string
}

// Initialize widget
function initWidget(config: WidgetConfig = {}) {
  const containerId = config.containerId || 'chat-widget-container'
  const container = document.getElementById(containerId)
  
  if (!container) {
    console.error(`Chat widget container with id "${containerId}" not found`)
    return
  }

  // Store config in window for axios to access
  if (config.apiKey) {
    (window as any).__CHAT_WIDGET_CONFIG__ = {
      apiKey: config.apiKey,
      apiUrl: config.apiUrl || '',
    }
  }

  // Initialize session with API key (will be done automatically by ChatWidget component)

  // Render widget
  const root = createRoot(container)
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ChatWidget />
      </QueryClientProvider>
    </StrictMode>
  )

  // Expose widget API
  ;(window as any).ChatWidgetInstance = {
    destroy: () => {
      root.unmount()
      if (container.parentNode) {
        container.parentNode.removeChild(container)
      }
    },
  }
}

// Auto-initialize if config is available from loader script
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const config = (window as any).__CHAT_WIDGET_CONFIG__
    if (config) {
      initWidget(config)
    }
  })
} else {
  const config = (window as any).__CHAT_WIDGET_CONFIG__
  if (config) {
    initWidget(config)
  }
}

// Export for manual initialization
if (typeof window !== 'undefined') {
  ;(window as any).initChatWidget = initWidget
}

