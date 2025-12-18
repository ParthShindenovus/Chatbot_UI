/**
 * WebSocket Chat Hook
 * Single Responsibility: Provide WebSocket chat functionality to components
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSessionStore } from "../store/sessionStore";
import { WebSocketConnection } from "./websocket/websocketConnection";
import { handleWebSocketMessage, type StreamingState } from "./websocket/messageHandlers";
import { updateStreamingMessage, updateCompleteMessage, addIdleWarningMessage, addSessionEndMessage } from "./websocket/cacheUpdaters";
import { getWebSocketUrl } from "./websocket/getWebSocketUrl";

interface UseWebSocketChatOptions {
  sessionId: string;
  enabled?: boolean;
  onMessage?: (data: any) => void;
  onError?: (error: Error) => void;
}

/**
 * WebSocket hook for real-time chat streaming
 * Handles connection, reconnection, and message streaming
 */
export function useWebSocketChat({
  sessionId,
  enabled = true,
  onMessage,
  onError,
}: UseWebSocketChatOptions) {
  const { visitorId } = useSessionStore();
  const queryClient = useQueryClient();
  const connectionRef = useRef<WebSocketConnection | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [streamingState, setStreamingState] = useState<StreamingState>({
    content: "",
    messageId: null,
  });

  // Connect to WebSocket - use refs to avoid recreating on every render
  const onErrorRef = useRef(onError);
  const onMessageRef = useRef(onMessage);
  
  // Update refs when callbacks change
  useEffect(() => {
    onErrorRef.current = onError;
    onMessageRef.current = onMessage;
  }, [onError, onMessage]);

  const connect = useCallback(() => {
    if (!enabled || !sessionId || !visitorId) {
      return;
    }

    // Don't connect for temp chats
    if (sessionId.startsWith("temp_new_chat_")) {
      return;
    }

    // Don't connect if already connected
    if (connectionRef.current?.isConnected) {
      return;
    }

    // Don't connect if already connecting
    if (connectionRef.current?.isConnecting) {
      return;
    }

    try {
      setIsConnecting(true);
      
      // Get WebSocket URL with session and visitor IDs (some backends require these in URL)
      const wsUrl = getWebSocketUrl(sessionId, visitorId);
      
      console.log("Attempting WebSocket connection:", {
        url: wsUrl,
        sessionId,
        visitorId,
        enabled,
      });
      
      // Clean up existing connection if any
      if (connectionRef.current) {
        connectionRef.current.disconnect();
        connectionRef.current = null;
      }
      
      const connection = new WebSocketConnection({
        url: wsUrl,
        maxReconnectAttempts: 5,
        reconnectDelay: 1000,
      });

      connection.setCallbacks({
        onOpen: () => {
          console.log("WebSocket connected for session:", sessionId);
          setIsConnected(true);
          setIsConnecting(false);
        },
        onMessage: (data) => {
          setStreamingState((currentState) => {
            const newState = handleWebSocketMessage(data, currentState, {
              onChunk: (content, messageId) => {
                updateStreamingMessage(queryClient, sessionId, messageId || "", content);
              },
              onComplete: (completeData) => {
                updateCompleteMessage(
                  queryClient,
                  sessionId,
                  completeData.messageId,
                  completeData.responseId,
                  completeData.content,
                  completeData.isComplete,
                  completeData.needsInfo,
                  completeData.suggestions
                );
              },
              onIdleWarning: (message, warningSessionId, responseId) => {
                // Only add idle warning if it's for the current session
                if (warningSessionId === sessionId) {
                  console.log("Adding idle warning message:", message);
                  addIdleWarningMessage(queryClient, sessionId, message, responseId);
                }
              },
              onSessionEnd: (message, endSessionId, responseId) => {
                // Only handle session end if it's for the current session
                if (endSessionId === sessionId) {
                  console.log("Session ended:", message);
                  addSessionEndMessage(queryClient, sessionId, message, responseId);
                  // Disconnect WebSocket when session ends
                  if (connectionRef.current) {
                    connectionRef.current.disconnect();
                    connectionRef.current = null;
                  }
                  setIsConnected(false);
                  setIsConnecting(false);
                }
              },
              onError: (error) => {
                console.error("WebSocket message error:", error);
                if (onErrorRef.current) {
                  onErrorRef.current(error);
                }
              },
            });
            
            if (onMessageRef.current) {
              onMessageRef.current(data);
            }
            
            return newState;
          });
        },
        onError: (error) => {
          console.error("WebSocket connection error for session:", sessionId, error);
          setIsConnected(false);
          setIsConnecting(false);
          if (onErrorRef.current) {
            onErrorRef.current(error);
          }
        },
        onClose: () => {
          console.log("WebSocket closed for session:", sessionId);
          setIsConnected(false);
          setIsConnecting(false);
        },
      });

      const connected = connection.connect();
      if (connected) {
        connectionRef.current = connection;
      } else {
        setIsConnecting(false);
      }
    } catch (error) {
      console.error("Error creating WebSocket connection:", error);
      setIsConnecting(false);
      if (onErrorRef.current) {
        onErrorRef.current(error as Error);
      }
    }
  }, [enabled, sessionId, visitorId, queryClient]);

  // Send message via WebSocket
  const sendMessage = useCallback(
    (message: string): boolean => {
      if (!connectionRef.current?.isConnected) {
        console.error("WebSocket is not connected");
        if (!isConnected && !isConnecting) {
          connect();
        }
        return false;
      }

      if (!visitorId) {
        console.error("Visitor ID is required");
        return false;
      }

      const payload = {
        type: "chat_message",
        message: message,
        session_id: sessionId,
        visitor_id: visitorId,
      };

      const sent = connectionRef.current.send(payload);
      if (sent) {
        setStreamingState({ content: "", messageId: null });
      }
      return sent;
    },
    [sessionId, visitorId, isConnected, isConnecting, connect]
  );

  // Connect on mount and when dependencies change
  useEffect(() => {
    // Only connect if all conditions are met
    if (enabled && sessionId && visitorId && !sessionId.startsWith("temp_new_chat_")) {
      // Small delay to prevent rapid reconnections and allow React to settle
      const timeoutId = setTimeout(() => {
        // Double-check conditions before connecting (might have changed during timeout)
        if (enabled && sessionId && visitorId && !sessionId.startsWith("temp_new_chat_")) {
          connect();
        }
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        // Only cleanup if sessionId or visitorId changed (not just re-render)
        // This prevents disconnecting during normal React re-renders
      };
    }

    // Cleanup on unmount or when sessionId/visitorId changes
    return () => {
      if (connectionRef.current) {
        connectionRef.current.disconnect();
        connectionRef.current = null;
      }
      setStreamingState({ content: "", messageId: null });
      setIsConnected(false);
      setIsConnecting(false);
    };
  }, [enabled, sessionId, visitorId]); // Removed 'connect' from dependencies to prevent loops

  return {
    isConnected,
    isConnecting,
    sendMessage,
    streamingContent: streamingState.content,
    streamingMessageId: streamingState.messageId,
    connect,
    disconnect: () => {
      if (connectionRef.current) {
        connectionRef.current.disconnect();
        connectionRef.current = null;
      }
      setIsConnected(false);
      setIsConnecting(false);
      setStreamingState({ content: "", messageId: null });
    },
  };
}
