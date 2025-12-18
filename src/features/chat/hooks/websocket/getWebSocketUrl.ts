/**
 * WebSocket URL Helper
 * Single Responsibility: Get WebSocket URL from API config
 */

export function getWebSocketUrl(sessionId?: string, visitorId?: string): string {
  const apiUrl =
    (window as any).__CHAT_WIDGET_CONFIG__?.apiUrl ||
    import.meta.env.VITE_API_URL ||
    "";

  if (!apiUrl) {
    throw new Error("API URL not configured. Please set VITE_API_URL or provide apiUrl in widget config.");
  }

  // Convert HTTP/HTTPS to WS/WSS
  let wsUrl = apiUrl.trim();
  
  // Remove trailing slash
  wsUrl = wsUrl.replace(/\/$/, "");
  
  // Convert protocol
  if (wsUrl.startsWith("http://")) {
    wsUrl = wsUrl.replace(/^http:/, "ws:");
  } else if (wsUrl.startsWith("https://")) {
    wsUrl = wsUrl.replace(/^https:/, "wss:");
  } else if (!wsUrl.startsWith("ws://") && !wsUrl.startsWith("wss://")) {
    // If no protocol, assume ws:// for localhost, wss:// otherwise
    if (wsUrl.includes("localhost") || wsUrl.includes("127.0.0.1")) {
      wsUrl = `ws://${wsUrl}`;
    } else {
      wsUrl = `wss://${wsUrl}`;
    }
  }

  // Build base URL
  let finalUrl = `${wsUrl}/ws/chat/`;
  
  // Add query parameters if provided (some backends require auth in URL)
  const params = new URLSearchParams();
  if (sessionId && !sessionId.startsWith("temp_new_chat_")) {
    params.append("session_id", sessionId);
  }
  if (visitorId) {
    params.append("visitor_id", visitorId);
  }
  
  if (params.toString()) {
    finalUrl += `?${params.toString()}`;
  }
  
  console.log("WebSocket URL:", finalUrl);
  return finalUrl;
}

