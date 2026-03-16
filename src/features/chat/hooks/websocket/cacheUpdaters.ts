/**
 * Cache Updaters
 * Single Responsibility: Update TanStack Query cache for WebSocket messages
 */

import { QueryClient } from "@tanstack/react-query";
import { chatKeys } from "../../useQueries";
import type { Message } from "../../types";
import type { Session } from "../../api";

// Use public folder path - more reliable for audio files
const notificationSound = "https://chatbot.commedia.au/notification.mp3";

// Track played notifications per response to ensure it only plays once
const playedNotifications = new Set<string>();

// Preload audio to avoid loading delays
let audioElement: HTMLAudioElement | null = null;
// Track if audio has been unlocked (required for browser autoplay policy)
let audioUnlocked = false;

/**
 * Unlock audio for playback (required by browser autoplay policies)
 * Should be called on first user interaction
 */
function unlockAudio() {
  if (audioUnlocked || !audioElement) return;
  
  try {
    // Try to play and immediately pause to unlock audio
    const playPromise = audioElement.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log("[Audio] Audio unlocked successfully");
          audioElement?.pause();
          audioElement && (audioElement.currentTime = 0);
          audioUnlocked = true;
        })
        .catch((error) => {
          console.log("[Audio] Audio unlock attempt (will retry on next interaction):", error);
        });
    }
  } catch (error) {
    console.log("[Audio] Error unlocking audio:", error);
  }
}

// Unlock audio on first user interaction
if (typeof window !== "undefined") {
  const unlockEvents = ["click", "touchstart", "keydown"];
  const handleUnlock = () => {
    unlockAudio();
    unlockEvents.forEach(event => {
      window.removeEventListener(event, handleUnlock);
    });
  };
  
  unlockEvents.forEach(event => {
    window.addEventListener(event, handleUnlock, { once: true, passive: true });
  });
}

/**
 * Initialize audio element (call once on module load)
 */
function initAudio() {
  if (audioElement) {
    console.log("[Audio] Audio element already initialized");
    return audioElement;
  }
  
  try {
    console.log(`[Audio] Initializing audio element with path: ${notificationSound}`);
    audioElement = new Audio(notificationSound);
    audioElement.volume = 0.5; // Set volume to 50%
    audioElement.preload = "auto";
    
    // Add event listeners for debugging
    audioElement.addEventListener("loadstart", () => {
      console.log("[Audio] loadstart event fired");
    });
    audioElement.addEventListener("canplay", () => {
      console.log("[Audio] canplay event fired, readyState:", audioElement?.readyState);
    });
    audioElement.addEventListener("error", (e) => {
      console.error("[Audio] Error loading audio:", e);
      console.error("[Audio] Audio error details:", audioElement?.error);
    });
    audioElement.addEventListener("play", () => {
      console.log("[Audio] play event fired");
    });
    audioElement.addEventListener("ended", () => {
      console.log("[Audio] ended event fired");
    });
    
    // Try to load the audio (load() returns void, so we just call it)
    try {
      audioElement.load();
      console.log("[Audio] Audio load() called, readyState:", audioElement.readyState);
    } catch (error) {
      console.error("[Audio] Error calling load():", error);
    }
    
    return audioElement;
  } catch (error) {
    console.error("[Audio] Error creating audio element:", error);
    return null;
  }
}

// Initialize audio on module load
if (typeof window !== "undefined") {
  console.log("[Audio] Module loaded, initializing audio");
  initAudio();
} else {
  console.log("[Audio] Module loaded but window is undefined (SSR), skipping audio initialization");
}

/**
 * Helper function to actually play the audio
 */
function playAudio(audio: HTMLAudioElement, responseId: string) {
  console.log(`[Audio] playAudio called for responseId: ${responseId}`);
  console.log(`[Audio] Audio readyState: ${audio.readyState} (0=HAVE_NOTHING, 1=HAVE_METADATA, 2=HAVE_CURRENT_DATA, 3=HAVE_FUTURE_DATA, 4=HAVE_ENOUGH_DATA)`);
  console.log(`[Audio] Audio src: ${audio.src}`);
  console.log(`[Audio] Audio volume: ${audio.volume}`);
  console.log(`[Audio] Audio currentTime: ${audio.currentTime}`);
  console.log(`[Audio] Audio paused: ${audio.paused}`);
  
  // Pause any ongoing playback and reset to beginning
  try {
    if (!audio.paused) {
      console.log("[Audio] Audio is currently playing, pausing it first");
      audio.pause();
    }
    audio.currentTime = 0;
    console.log("[Audio] Reset audio to beginning");
  } catch (error) {
    console.error("[Audio] Error resetting audio:", error);
  }
  
  const playPromise = audio.play();
  
  if (playPromise !== undefined) {
    console.log("[Audio] play() returned a promise");
    playPromise
      .then(() => {
        console.log(`[Audio] Audio playback started successfully for responseId: ${responseId}`);
        // Mark as played only on success
        playedNotifications.add(responseId);
      })
      .catch((error) => {
        console.error(`[Audio] Audio playback failed for responseId: ${responseId}`, error);
        console.error(`[Audio] Error name: ${error.name}, message: ${error.message}`);
        
        // Check for common autoplay policy errors
        if (error.name === "NotAllowedError" || error.name === "NotSupportedError") {
          console.warn(`[Audio] Autoplay prevented by browser. Audio may need user interaction to unlock.`);
          console.warn(`[Audio] Try clicking/touching the page first to unlock audio playback.`);
          // Try to unlock on next attempt
          audioUnlocked = false;
        }
        
        // Silently handle play errors - don't mark as played so we can retry
      });
  } else {
    console.log("[Audio] play() returned undefined (older browser)");
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
  console.log(`[Audio] playNotificationSound called for responseId: ${responseId}`);
  
  // Only play if we haven't played for this response yet
  if (playedNotifications.has(responseId)) {
    console.log(`[Audio] Notification already played for responseId: ${responseId}, skipping`);
    return;
  }

  // Check page visibility for logging (but allow playing in both cases)
  const pageVisible = isPageVisible();
  console.log(`[Audio] Page visibility check: pageVisible=${pageVisible}, document.hidden=${typeof document !== "undefined" ? document.hidden : "N/A"}`);
  console.log(`[Audio] Attempting to play notification sound (plays regardless of visibility)`);

  try {
    // Ensure audio is initialized
    const audio = audioElement || initAudio();
    if (!audio) {
      console.error("[Audio] Failed to initialize audio element, cannot play notification");
      return;
    }

    console.log(`[Audio] Audio element exists, readyState: ${audio.readyState}`);
    console.log(`[Audio] Audio unlocked: ${audioUnlocked}`);

    // Try to unlock audio if not already unlocked (fallback)
    if (!audioUnlocked) {
      console.log("[Audio] Audio not unlocked yet, attempting to unlock");
      unlockAudio();
    }

    // Check if audio is ready
    if (audio.readyState < 2) {
      console.log(`[Audio] Audio not ready yet (readyState=${audio.readyState}), waiting for canplay event`);
      audio.addEventListener("canplay", () => {
        console.log(`[Audio] canplay event received, attempting to play`);
        audio.currentTime = 0;
        playAudio(audio, responseId);
      }, { once: true });
      return;
    }
    
    // Reset audio to beginning and play
    console.log(`[Audio] Audio is ready, resetting to beginning and playing`);
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
    console.error("[Audio] Error in playNotificationSound:", error);
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
 * Update suggestions when WebSocket connects
 * This handles initial suggestions sent on connection
 */
export function updateConnectedSuggestions(
  queryClient: QueryClient,
  sessionId: string,
  suggestions: string[]
) {
  // Update conversation state with initial suggestions
  queryClient.setQueryData([...chatKeys.messages(sessionId), "state"], (old: any) => ({
    needsInfo: old?.needsInfo || null,
    isComplete: old?.isComplete || false,
    suggestions: suggestions,
  }));

  // Update suggestions cache
  queryClient.setQueryData(chatKeys.suggestions(sessionId), {
    suggestions: suggestions,
    session_id: sessionId,
    message_count: 0,
  });
  
  console.log(`[WebSocket] Updated suggestions on connect for session ${sessionId}:`, suggestions);
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

  // Update suggestions cache - always set, even if empty array
  // This ensures we explicitly mark when there are no suggestions available
  queryClient.setQueryData(chatKeys.suggestions(sessionId), {
    suggestions: suggestions,
    session_id: sessionId,
    message_count: 0,
  });
  
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

  // Play notification sound for idle warning
  if (responseId) {
    playNotificationSound(responseId);
  }
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

  // Play notification sound for session end message
  if (responseId) {
    playNotificationSound(responseId);
  }
}


