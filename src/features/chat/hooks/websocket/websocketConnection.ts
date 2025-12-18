/**
 * WebSocket Connection Manager
 * Single Responsibility: Manage WebSocket connection lifecycle
 */

export interface WebSocketConfig {
  url: string;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

export interface WebSocketCallbacks {
  onOpen?: () => void;
  onMessage?: (data: any) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
}

export class WebSocketConnection {
  private ws: WebSocket | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private connectionTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts: number;
  private readonly reconnectDelay: number;
  private readonly url: string;
  private callbacks: WebSocketCallbacks = {};
  private isManuallyClosed = false;

  constructor(config: WebSocketConfig) {
    this.url = config.url;
    this.maxReconnectAttempts = config.maxReconnectAttempts ?? 5;
    this.reconnectDelay = config.reconnectDelay ?? 1000;
  }

  setCallbacks(callbacks: WebSocketCallbacks) {
    this.callbacks = callbacks;
  }

  connect(): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return true;
    }

    if (this.ws?.readyState === WebSocket.CONNECTING) {
      return false; // Already connecting
    }

    // Clean up any existing connection before creating a new one
    if (this.ws) {
      try {
        this.ws.onerror = null;
        this.ws.onclose = null;
        this.ws.close();
      } catch (e) {
        // Ignore errors during cleanup
      }
      this.ws = null;
    }

    try {
      this.isManuallyClosed = false;
      console.log("Creating WebSocket connection to:", this.url);
      this.ws = new WebSocket(this.url);

      // Clear any existing connection timeout
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }

      // Set timeout to detect connection failures early
      this.connectionTimeout = setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          console.error("WebSocket connection timeout - server may not be running or endpoint doesn't exist");
          this.ws.close();
          this.callbacks.onError?.(new Error("WebSocket connection timeout - check if server is running"));
        }
        this.connectionTimeout = null;
      }, 5000); // 5 second timeout

      this.ws.onopen = () => {
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
        console.log("WebSocket connected successfully to:", this.url);
        this.reconnectAttempts = 0;
        this.callbacks.onOpen?.();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.callbacks.onMessage?.(data);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
          this.callbacks.onError?.(new Error("Failed to parse WebSocket message"));
        }
      };

      this.ws.onerror = (error) => {
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
        // Only log error if not already closing/closed to avoid duplicate logs
        // Also check if we're still in CONNECTING state (actual connection error)
        if (
          this.ws &&
          this.ws.readyState !== WebSocket.CLOSING &&
          this.ws.readyState !== WebSocket.CLOSED &&
          this.ws.readyState !== WebSocket.OPEN
        ) {
          // Only log once per connection attempt
          if (this.reconnectAttempts === 0 || this.ws.readyState === WebSocket.CONNECTING) {
            const errorMsg = `WebSocket connection failed. Possible causes:
1. Backend server not running at ${this.url}
2. WebSocket endpoint doesn't exist (/ws/chat/)
3. CORS/Network issues
4. Server requires authentication in URL`;
            console.error(errorMsg, error);
            this.callbacks.onError?.(new Error(`WebSocket connection failed: ${this.url}`));
          }
        }
      };

      this.ws.onclose = (event) => {
        if (this.connectionTimeout) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
        
        // Log close reason for debugging
        const closeReasons: Record<number, string> = {
          1000: "Normal closure",
          1001: "Going away",
          1002: "Protocol error",
          1003: "Unsupported data",
          1006: "Abnormal closure (no close frame)",
          1011: "Server error",
          1012: "Service restart",
          1013: "Try again later",
          1014: "Bad gateway",
          1015: "TLS handshake failure",
        };
        
        const reason = closeReasons[event.code] || `Unknown (code: ${event.code})`;
        console.log(`WebSocket closed: ${reason}`, {
          code: event.code,
          reason: event.reason || "No reason provided",
          wasClean: event.wasClean,
          url: this.url,
        });
        
        // Only attempt reconnect if not manually closed and not a normal closure
        const shouldReconnect = 
          !this.isManuallyClosed && 
          this.reconnectAttempts < this.maxReconnectAttempts &&
          event.code !== 1000; // 1000 = normal closure
        
        this.callbacks.onClose?.();
        this.ws = null;

        if (shouldReconnect) {
          this.attemptReconnect();
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error("Max reconnection attempts reached. WebSocket connection failed.");
          console.error("Please check:");
          console.error("1. Is the backend server running at:", this.url);
          console.error("2. Does the WebSocket endpoint exist?");
          console.error("3. Are there any CORS or network restrictions?");
          this.callbacks.onError?.(new Error("Failed to establish WebSocket connection after multiple attempts"));
        }
      };

      return true;
    } catch (error) {
      console.error("Error creating WebSocket connection:", error);
      this.callbacks.onError?.(error as Error);
      return false;
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      return;
    }

    // Clear any existing reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    console.log(
      `Attempting to reconnect in ${delay}ms (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
    );

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (!this.isManuallyClosed) {
        this.connect();
      }
    }, delay);
  }

  send(data: any): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      this.ws.send(JSON.stringify(data));
      return true;
    } catch (error) {
      console.error("Error sending WebSocket message:", error);
      this.callbacks.onError?.(error as Error);
      return false;
    }
  }

  disconnect() {
    this.isManuallyClosed = true;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get isConnecting(): boolean {
    return this.ws?.readyState === WebSocket.CONNECTING;
  }
}

