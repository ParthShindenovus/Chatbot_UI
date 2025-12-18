/**
 * WebSocket Message Handlers
 * Single Responsibility: Handle incoming WebSocket messages
 */

export interface WebSocketMessage {
  type: "chunk" | "complete" | "error" | "idle_warning" | "session_end";
  chunk?: string;
  done?: boolean;
  message_id?: string;
  response_id?: string;
  conversation_data?: Record<string, any>;
  complete?: boolean;
  needs_info?: string | null;
  suggestions?: string[];
  error?: string;
  message?: string; // For idle_warning and session_end
  session_id?: string; // For idle_warning and session_end
  metadata?: Record<string, any>; // For metadata
}

export interface StreamingState {
  content: string;
  messageId: string | null;
}

export interface MessageHandlerCallbacks {
  onChunk?: (chunk: string, messageId: string | null) => void;
  onComplete?: (data: {
    messageId: string;
    responseId: string;
    content: string;
    isComplete: boolean;
    needsInfo: string | null;
    suggestions: string[];
  }) => void;
  onIdleWarning?: (message: string, sessionId: string, responseId: string) => void;
  onSessionEnd?: (message: string, sessionId: string, responseId: string) => void;
  onError?: (error: Error) => void;
}

/**
 * Handle incoming WebSocket message
 */
export function handleWebSocketMessage(
  data: WebSocketMessage,
  streamingState: StreamingState,
  callbacks: MessageHandlerCallbacks
): StreamingState {
  switch (data.type) {
    case "chunk":
      if (data.chunk) {
        const newContent = streamingState.content + data.chunk;
        const messageId = data.message_id || streamingState.messageId || "";
        
        callbacks.onChunk?.(newContent, messageId);
        
        return {
          content: newContent,
          messageId: data.message_id || streamingState.messageId || null,
        };
      }
      break;

    case "complete":
      if (data.message_id && data.response_id) {
        callbacks.onComplete?.({
          messageId: data.message_id,
          responseId: data.response_id,
          content: streamingState.content,
          isComplete: data.complete || false,
          needsInfo: data.needs_info || null,
          suggestions: data.suggestions || [],
        });
      }
      
      return {
        content: "",
        messageId: null,
      };

    case "idle_warning":
      if (data.message && data.session_id && data.response_id) {
        callbacks.onIdleWarning?.(data.message, data.session_id, data.response_id);
      }
      return streamingState;

    case "session_end":
      if (data.message && data.session_id && data.response_id) {
        callbacks.onSessionEnd?.(data.message, data.session_id, data.response_id);
      }
      return streamingState;

    case "error":
      const error = new Error(data.error || "WebSocket error");
      callbacks.onError?.(error);
      return {
        content: "",
        messageId: null,
      };
  }

  return streamingState;
}

