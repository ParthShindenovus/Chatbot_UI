/**
 * Cache Updaters
 * Single Responsibility: Update TanStack Query cache for WebSocket messages
 */

import { QueryClient } from "@tanstack/react-query";
import { chatKeys } from "../../useQueries";
import type { Message } from "../../types";
import type { Session } from "../../api";

// Use public folder path - more reliable for audio files
const notificationSound = "/notification.mp3";

// Track played notifications per response to ensure it only plays once
const playedNotifications = new Set<string>();

// Preload audio to avoid loading delays
let audioElement: HTMLAudioElement | null = null;

/**
 * Initialize audio element (call once on module load)
 */
function initAudio() {
  if (audioElement) return audioElement;
  
  try {
    audioElement = new Audio(notificationSound);
    audioElement.volume = 0.5; // Set volume to 50%
    audioElement.preload = "auto";
    
    // Try to load the audio (load() returns void, so we just call it)
    try {
      audioElement.load();
    } catch (error) {
      // Silently handle load errors
    }
    
    return audioElement;
  } catch (error) {
    return null;
  }
}

// Initialize audio on module load
if (typeof window !== "undefined") {
  initAudio();
}

/**
 * Helper function to actually play the audio
 */
function playAudio(audio: HTMLAudioElement, responseId: string) {
  const playPromise = audio.play();
  
  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        // Mark as played only on success
        playedNotifications.add(responseId);
      })
      .catch(() => {
        // Silently handle play errors - don't mark as played so we can retry
      });
  } else {
    // Fallback for older browsers
    playedNotifications.add(responseId);
  }
}

/**
 * Check if page is visible to the user
 */
function isPageVisible(): boolean {
  if (typeof document === "undefined") return false;
  
  // Check Page Visibility API
  if (typeof document.hidden !== "undefined") {
    return !document.hidden;
  }
  
  // Fallback for older browsers
  if (typeof document.visibilityState !== "undefined") {
    return document.visibilityState === "visible";
  }
  
  // If API not available, assume page is visible
  return true;
}

/**
 * Play notification sound once per response
 */
function playNotificationSound(responseId: string) {
  // Only play if we haven't played for this response yet
  if (playedNotifications.has(responseId)) {
    return;
  }

  // Only play sound if page is hidden (user is on another tab/window or browser is minimized)
  const pageVisible = isPageVisible();
  if (pageVisible) {
    // Still mark as played to prevent playing when user switches tabs later
    playedNotifications.add(responseId);
    return;
  }

  try {
    // Ensure audio is initialized
    const audio = audioElement || initAudio();
    if (!audio) {
      return;
    }

    // Check if audio is ready
    if (audio.readyState < 2) {
      audio.addEventListener("canplay", () => {
        audio.currentTime = 0;
        playAudio(audio, responseId);
      }, { once: true });
      return;
    }
    
    // Reset audio to beginning and play
    audio.currentTime = 0;
    playAudio(audio, responseId);
    
    // Clean up old entries to prevent memory leak (keep last 100)
    if (playedNotifications.size > 100) {
      const firstEntry = playedNotifications.values().next().value;
      if (firstEntry !== undefined) {
        playedNotifications.delete(firstEntry);
      }
    }
  } catch (error) {
    // Silently handle errors
  }
}

/**
 * Helper function to update session in sessions cache with last_message and last_message_at
 * Exported so it can be used from ChatScreen when user sends messages
 */
export function updateSessionInList(
  queryClient: QueryClient,
  sessionId: string,
  lastMessage: string,
  lastMessageAt: string
) {
  // Find visitorId from session data in cache
  let visitorId: string | null = null;
  
  const allSessionsQueries = queryClient.getQueriesData<{
    pages: Array<{ sessions: Session[]; hasMore: boolean; total: number }>;
  }>({ queryKey: [...chatKeys.all, "list"], exact: false });
  
  for (const [_queryKey, data] of allSessionsQueries) {
    if (data) {
      const allSessions = data.pages.flatMap((page) => page.sessions);
      const session = allSessions.find((s) => s.id === sessionId);
      if (session?.visitor?.id) {
        visitorId = session.visitor.id;
        break;
      }
    }
  }
  
  if (!visitorId) return;
  
  // Update infinite query cache for the specific visitor
  queryClient.setQueryData<{
    pages: Array<{ sessions: Session[]; hasMore: boolean; total: number }>;
  }>([...chatKeys.list(visitorId), "infinite"], (old) => {
    if (!old) return old;
    
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        sessions: page.sessions.map((session) =>
          session.id === sessionId
            ? { 
                ...session, 
                last_message: lastMessage,
                last_message_at: lastMessageAt,
              }
            : session
        ),
      })),
    };
  });
}

/**
 * Update streaming message in cache
 */
export function updateStreamingMessage(
  queryClient: QueryClient,
  sessionId: string,
  messageId: string,
  content: string
) {
  queryClient.setQueryData<{ messages: Message[]; hasMore: boolean; total: number }>(
    chatKeys.messages(sessionId),
    (old) => {
      if (!old) return old;

      const messages = [...old.messages];
      
      // Remove typing indicator when streaming starts
      const typingIndex = messages.findIndex((msg) => msg.id === "typing-indicator");
      if (typingIndex >= 0) {
        messages.splice(typingIndex, 1);
      }
      
      const streamingIndex = messages.findIndex(
        (msg) => msg.id === "streaming" || msg.id.startsWith("streaming_")
      );

      const streamingMessage: Message = {
        id: messageId ? `streaming_${messageId}` : "streaming",
        chatId: sessionId,
        content: content,
        role: "assistant",
        timestamp: new Date(),
        isRead: false,
      };

      if (streamingIndex >= 0) {
        messages[streamingIndex] = streamingMessage;
      } else {
        messages.push(streamingMessage);
      }

      return {
        ...old,
        messages,
      };
    }
  );
}

/**
 * Update complete message in cache
 */
export function updateCompleteMessage(
  queryClient: QueryClient,
  sessionId: string,
  messageId: string,
  responseId: string,
  content: string,
  isComplete: boolean,
  needsInfo: string | null,
  suggestions: string[]
) {
  // Get current streaming content from cache if content is empty
  const currentData = queryClient.getQueryData<{ messages: Message[]; hasMore: boolean; total: number }>(
    chatKeys.messages(sessionId)
  );

  // Use content from cache if provided content is empty
  let finalContent = content;
  if (!finalContent && currentData) {
    const streamingMsg = currentData.messages.find(
      (msg) => msg.id === "streaming" || msg.id.startsWith("streaming_")
    );
    finalContent = streamingMsg?.content || content;
  }

  queryClient.setQueryData<{ messages: Message[]; hasMore: boolean; total: number }>(
    chatKeys.messages(sessionId),
    (old) => {
      if (!old) return old;

      const messages = [...old.messages];

      // Remove streaming message and typing indicator
      const streamingIndex = messages.findIndex(
        (msg) => msg.id === "streaming" || msg.id.startsWith("streaming_")
      );
      if (streamingIndex >= 0) {
        messages.splice(streamingIndex, 1);
      }
      
      // Also remove typing indicator if it exists
      const typingIndex = messages.findIndex((msg) => msg.id === "typing-indicator");
      if (typingIndex >= 0) {
        messages.splice(typingIndex, 1);
      }

      // Update user message ID if needed
      const userMessageIndex = messages.findIndex((msg) => msg.id.startsWith("temp_user_"));
      if (userMessageIndex >= 0 && messageId) {
        messages[userMessageIndex] = {
          ...messages[userMessageIndex],
          id: messageId,
        };
      }

      // Check if assistant message already exists (prevent duplicates)
      const existingAssistantIndex = messages.findIndex((msg) => msg.id === responseId);
      
      if (existingAssistantIndex >= 0) {
        // Update existing message instead of adding duplicate
        messages[existingAssistantIndex] = {
          ...messages[existingAssistantIndex],
          content: finalContent,
        };
      } else {
        // Add complete assistant message only if it doesn't exist
        const assistantMessage: Message = {
          id: responseId,
          chatId: sessionId,
          content: finalContent,
          role: "assistant",
          timestamp: new Date(),
          isRead: false,
        };
        messages.push(assistantMessage);
      }

      return {
        ...old,
        messages,
        total: messages.length,
      };
    }
  );

  // Update conversation state
  queryClient.setQueryData([...chatKeys.messages(sessionId), "state"], {
    needsInfo: needsInfo,
    isComplete: isComplete,
    suggestions: suggestions,
  });

  // Update suggestions cache
  if (suggestions.length > 0) {
    queryClient.setQueryData(chatKeys.suggestions(sessionId), {
      suggestions: suggestions,
      session_id: sessionId,
      message_count: 0,
    });
  }
  
  // Play notification sound when response and recommendations are received
  // Play for all complete responses (responseId indicates a complete response was received)
  if (responseId) {
    playNotificationSound(responseId);
  }

  // Update session in sessions list cache with last_message
  // Truncate message to reasonable length for display
  const truncatedMessage = finalContent.length > 100 
    ? finalContent.substring(0, 100) + "..." 
    : finalContent;
  updateSessionInList(
    queryClient,
    sessionId,
    truncatedMessage,
    new Date().toISOString()
  );
}

/**
 * Add idle warning message to cache
 */
export function addIdleWarningMessage(
  queryClient: QueryClient,
  sessionId: string,
  message: string,
  responseId: string
) {
  const idleWarningMessage: Message = {
    id: responseId || `idle_warning_${Date.now()}`,
    chatId: sessionId,
    content: message,
    role: "assistant",
    timestamp: new Date(),
    isRead: false,
    metadata: { type: "idle_warning" }, // Add metadata to identify as idle_warning
  };

  queryClient.setQueryData<{ messages: Message[]; hasMore: boolean; total: number }>(
    chatKeys.messages(sessionId),
    (old) => {
      if (!old) {
        return {
          messages: [idleWarningMessage],
          hasMore: false,
          total: 1,
        };
      }

      // Check if this idle warning already exists (prevent duplicates by response_id)
      const existingIndex = old.messages.findIndex(
        (msg) => msg.id === responseId || 
        (msg.id.startsWith("idle_warning_") && msg.content === message)
      );

      const messages = [...old.messages];
      if (existingIndex >= 0) {
        // Update existing idle warning
        messages[existingIndex] = idleWarningMessage;
      } else {
        // Add new idle warning
        messages.push(idleWarningMessage);
      }

      return {
        ...old,
        messages,
        total: messages.length,
      };
    }
  );
}

/**
 * Add session end message to cache and mark conversation as complete
 */
export function addSessionEndMessage(
  queryClient: QueryClient,
  sessionId: string,
  message: string,
  responseId: string
) {
  const sessionEndMessage: Message = {
    id: responseId || `session_end_${Date.now()}`,
    chatId: sessionId,
    content: message,
    role: "assistant",
    timestamp: new Date(),
    isRead: false,
    metadata: { type: "session_end" }, // Add metadata to identify as session_end
  };

  queryClient.setQueryData<{ messages: Message[]; hasMore: boolean; total: number }>(
    chatKeys.messages(sessionId),
    (old) => {
      if (!old) {
        return {
          messages: [sessionEndMessage],
          hasMore: false,
          total: 1,
        };
      }

      // Check if this session end message already exists (prevent duplicates by response_id)
      const existingIndex = old.messages.findIndex(
        (msg) => msg.id === responseId || 
        (msg.id.startsWith("session_end_") && msg.content === message)
      );

      const messages = [...old.messages];
      if (existingIndex >= 0) {
        // Update existing session end message
        messages[existingIndex] = sessionEndMessage;
      } else {
        // Add new session end message
        messages.push(sessionEndMessage);
      }

      return {
        ...old,
        messages,
        total: messages.length,
      };
    }
  );

  // Mark conversation as complete
  queryClient.setQueryData([...chatKeys.messages(sessionId), "state"], {
    needsInfo: null,
    isComplete: true,
    suggestions: [],
  });

  // Update session in sessions list cache to set is_active: false
  // This allows users to see that the chat has ended even if they're not in the chat
  // Find visitorId from session data in cache
  let visitorId: string | null = null;
  
  // Try to find visitorId from sessions cache
  const allSessionsQueries = queryClient.getQueriesData<{
    pages: Array<{ sessions: Session[]; hasMore: boolean; total: number }>;
  }>({ queryKey: [...chatKeys.all, "list"], exact: false });
  
  for (const [_queryKey, data] of allSessionsQueries) {
    if (data) {
      const allSessions = data.pages.flatMap((page) => page.sessions);
      const session = allSessions.find((s) => s.id === sessionId);
      if (session?.visitor?.id) {
        visitorId = session.visitor.id;
        break;
      }
    }
  }
  
  // Update infinite query cache for the specific visitor
  // Optimistically update: is_active: false, last_message, last_message_at
  const sessionEndTimestamp = new Date().toISOString();
  
  if (visitorId) {
    queryClient.setQueryData<{
      pages: Array<{ sessions: Session[]; hasMore: boolean; total: number }>;
    }>([...chatKeys.list(visitorId), "infinite"], (old) => {
      if (!old) return old;
      
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          sessions: page.sessions.map((session) =>
            session.id === sessionId
              ? { 
                  ...session, 
                  is_active: false,
                  last_message: message,
                  last_message_at: sessionEndTimestamp,
                }
              : session
          ),
        })),
      };
    });
  } else {
    // Fallback: update all session queries if visitorId not found
    queryClient.setQueriesData<{
      pages: Array<{ sessions: Session[]; hasMore: boolean; total: number }>;
    }>(
      { queryKey: [...chatKeys.all, "list"], exact: false },
      (old) => {
        if (!old) return old;
        
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            sessions: page.sessions.map((session) =>
              session.id === sessionId
                ? { 
                    ...session, 
                    is_active: false,
                    last_message: message,
                    last_message_at: sessionEndTimestamp,
                  }
                : session
            ),
          })),
        };
      }
    );
  }
}


