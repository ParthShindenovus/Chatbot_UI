import { create } from "zustand";
import type { Message } from "../types";
import { getChatHistory, sendMessage, sendMessageStream, createSession, type Message as ApiMessage } from "../api";
import { useChatStore } from "./chatStore";
import { useSessionStore } from "./sessionStore";

// Helper to convert API message to app message
const convertApiMessage = (apiMsg: ApiMessage, sessionId: string): Message => ({
  id: apiMsg.id,
  chatId: sessionId,
  content: apiMsg.message,
  role: apiMsg.role,
  timestamp: new Date(apiMsg.timestamp),
  isRead: apiMsg.role === "user",
});

interface MessageStore {
  messages: Record<string, Message[]>;
  isLoading: Record<string, boolean>;
  isLoadingOlder: Record<string, boolean>;
  isSending: Record<string, boolean>;
  streamingContent: Record<string, string>; // For streaming responses
  hasMore: Record<string, boolean>; // Whether more messages can be loaded
  offset: Record<string, number>; // Current offset for pagination
  loadedSessions: Record<string, boolean>; // Track which sessions have been loaded
  loadInitialMessages: (sessionId: string) => Promise<void>;
  loadOlderMessages: (sessionId: string) => Promise<void>;
  sendMessage: (sessionId: string, content: string, useStreaming?: boolean) => Promise<void>;
  getMessages: (sessionId: string) => Message[];
  clearMessages: (sessionId: string) => void;
}

const MESSAGES_PER_PAGE = 20;

export const useMessageStore = create<MessageStore>((set, get) => ({
  messages: {},
  isLoading: {},
  isLoadingOlder: {},
  isSending: {},
  streamingContent: {},
  hasMore: {},
  offset: {},
  loadedSessions: {}, // Track loaded sessions to prevent duplicate API calls
  loadInitialMessages: async (sessionId: string) => {
    // Skip if already loaded (optimistic update pattern - don't refetch if user is in chat)
    if (get().loadedSessions[sessionId]) {
      console.log(`⏭️ Skipping load for ${sessionId} - already loaded (using optimistic updates)`);
      return;
    }
    
    const existingMessages = get().messages[sessionId];
    // Only skip if we have real messages (not temp/streaming/typing indicators)
    const hasRealMessages = existingMessages && existingMessages.length > 0 && 
      existingMessages.some(msg => 
        !msg.id.startsWith('temp_') && 
        msg.id !== 'streaming' && 
        msg.id !== 'typing-indicator' && 
        msg.id !== 'typing'
      );
    
    // Skip if we already have real messages or currently sending
    const isCurrentlySending = get().isSending[sessionId];
    if (hasRealMessages || isCurrentlySending) {
      return; // Already loaded real messages or currently sending
    }

    set((state) => ({
      isLoading: { ...state.isLoading, [sessionId]: true },
      offset: { ...state.offset, [sessionId]: 0 },
    }));

    try {
      const { messages: apiMessages, hasMore } = await getChatHistory(
        sessionId,
        MESSAGES_PER_PAGE,
        0
      );
      
      // Sort messages by timestamp (oldest first)
      const convertedMessages = apiMessages
        .map((msg) => convertApiMessage(msg, sessionId))
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      set((state) => {
        // Preserve any temporary messages (like user's optimistic message or typing indicator)
        const existingTempMessages = (state.messages[sessionId] || []).filter(
          msg => msg.id.startsWith('temp_') || msg.id === 'streaming' || msg.id === 'typing-indicator' || msg.id === 'typing'
        );
        
        return {
          messages: { 
            ...state.messages, 
            [sessionId]: [...convertedMessages, ...existingTempMessages] 
          },
          isLoading: { ...state.isLoading, [sessionId]: false },
          hasMore: { ...state.hasMore, [sessionId]: hasMore },
          offset: { ...state.offset, [sessionId]: convertedMessages.length },
          loadedSessions: { ...state.loadedSessions, [sessionId]: true }, // Mark as loaded
        };
      });
    } catch (error) {
      console.error("Failed to load messages:", error);
      set((state) => ({
        isLoading: { ...state.isLoading, [sessionId]: false },
      }));
    }
  },
  loadOlderMessages: async (sessionId: string) => {
    const state = get();
    const currentOffset = state.offset[sessionId] || 0;
    const isLoading = state.isLoadingOlder[sessionId];
    const hasMoreMessages = state.hasMore[sessionId] !== false;

    if (isLoading || !hasMoreMessages) {
      return;
    }

    set((state) => ({
      isLoadingOlder: { ...state.isLoadingOlder, [sessionId]: true },
    }));

    try {
      const { messages: apiMessages, hasMore } = await getChatHistory(
        sessionId,
        MESSAGES_PER_PAGE,
        currentOffset
      );

      if (apiMessages.length === 0) {
        set((state) => ({
          isLoadingOlder: { ...state.isLoadingOlder, [sessionId]: false },
          hasMore: { ...state.hasMore, [sessionId]: false },
        }));
        return;
      }

      // Convert and sort new messages
      const convertedMessages = apiMessages
        .map((msg) => convertApiMessage(msg, sessionId))
        .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      // Prepend older messages to the beginning
      set((state) => {
        const existingMessages = state.messages[sessionId] || [];
        return {
          messages: {
            ...state.messages,
            [sessionId]: [...convertedMessages, ...existingMessages],
          },
          isLoadingOlder: { ...state.isLoadingOlder, [sessionId]: false },
          hasMore: { ...state.hasMore, [sessionId]: hasMore },
          offset: { ...state.offset, [sessionId]: currentOffset + convertedMessages.length },
        };
      });
    } catch (error) {
      console.error("Failed to load older messages:", error);
      set((state) => ({
        isLoadingOlder: { ...state.isLoadingOlder, [sessionId]: false },
      }));
    }
  },
  sendMessage: async (sessionId: string, content: string, useStreaming: boolean = false) => {
    if (!content.trim()) return;

    const sessionStore = useSessionStore.getState();
    const visitorId = sessionStore.visitorId;
    
    if (!visitorId) {
      throw new Error("Visitor ID is required. Please initialize the widget first.");
    }

    // Check if this is a temporary chat (new chat without session)
    const isTempChat = sessionId.startsWith("temp_new_chat_");
    let actualSessionId = sessionId;

    // If it's a temp chat, create session first
    if (isTempChat) {
      try {
        console.log("📝 Creating session for first message...");
        const session = await createSession(visitorId);
        actualSessionId = session.id;
        
        console.log(`✅ Created session: ${actualSessionId}`);
        
        // Update chat store: replace temp chat with real session
        // Import sessionToChatSummary helper
        const sessionToChatSummary = (session: any) => ({
          id: session.id,
          title: `Chat ${new Date(session.created_at).toLocaleDateString()}`,
          lastMessage: "",
          lastMessageTime: new Date(session.created_at),
          unreadCount: 0,
          isActive: false,
        });
        
        const newChat = sessionToChatSummary(session);
        
        // Remove temp chat and add real chat
        // IMPORTANT: Set activeChatId FIRST to prevent widget from closing
        useChatStore.setState((state) => ({
          chats: [newChat, ...state.chats.filter(chat => chat.id !== sessionId)],
          activeChatId: session.id, // Set immediately to keep widget open
        }));
        
        // Select the new chat (ensures activeChatId is properly set)
        useChatStore.getState().selectChat(session.id);
        
        console.log(`✅ Session created - activeChatId set to: ${session.id}`);
        
        // Update session store
        useSessionStore.setState({ sessionId: session.id });
        
        // Move messages from temp sessionId to real sessionId
        // Also mark that we've already loaded messages for this session (to prevent reload)
        set((state) => {
          const tempMessages = state.messages[sessionId] || [];
          const { [sessionId]: _, ...restMessages } = state.messages;
          return {
            messages: {
              ...restMessages,
              [actualSessionId]: tempMessages,
            },
            // Mark as loaded to prevent ChatScreen from reloading messages (optimistic update pattern)
            isLoading: { ...state.isLoading, [actualSessionId]: false },
            hasMore: { ...state.hasMore, [actualSessionId]: false },
            loadedSessions: { ...state.loadedSessions, [actualSessionId]: true },
          };
        });
      } catch (error) {
        console.error("Failed to create session:", error);
        throw error;
      }
    }

    // Add user message optimistically
    const userMessage: Message = {
      id: `temp_${Date.now()}`,
      chatId: actualSessionId,
      content: content.trim(),
      role: "user",
      timestamp: new Date(),
      isRead: true,
    };

    set((state) => {
      const existingMessages = state.messages[actualSessionId] || [];
      return {
        messages: {
          ...state.messages,
          [actualSessionId]: [...existingMessages, userMessage],
        },
        isSending: { ...state.isSending, [actualSessionId]: true },
        streamingContent: { ...state.streamingContent, [actualSessionId]: "" },
      };
    });

    try {
      if (useStreaming) {
        // Streaming response
        let fullContent = "";
        await sendMessageStream(
          content.trim(),
          actualSessionId,
          visitorId,
          (chunk: string) => {
            fullContent += chunk;
            set((state) => ({
              streamingContent: { ...state.streamingContent, [actualSessionId]: fullContent },
            }));
          }
        );

        // Add assistant message after streaming completes
        const assistantMessage: Message = {
          id: `msg_${Date.now()}`,
          chatId: actualSessionId,
          content: fullContent,
          role: "assistant",
          timestamp: new Date(),
          isRead: false,
        };

        set((state) => {
          const existingMessages = state.messages[actualSessionId] || [];
          return {
            messages: {
              ...state.messages,
              [actualSessionId]: [...existingMessages, assistantMessage],
            },
            isSending: { ...state.isSending, [actualSessionId]: false },
            streamingContent: { ...state.streamingContent, [actualSessionId]: "" },
          };
        });
      } else {
        // Non-streaming response
        const response = await sendMessage(content.trim(), actualSessionId, visitorId);
        
        // Update user message with real ID from response
        const updatedUserMessage: Message = {
          ...userMessage,
          id: response.message_id,
          timestamp: new Date(),
        };

        // Create assistant message from response
        const assistantMessage: Message = {
          id: response.response_id,
          chatId: actualSessionId,
          content: response.response,
          role: "assistant",
          timestamp: new Date(),
          isRead: false,
        };

        set((state) => {
          const existingMessages = state.messages[actualSessionId] || [];
          // Remove temp user message and prevent duplicates by checking message_id
          // Use optimistic update pattern - don't reload from API, just update what we have
          const filteredMessages = existingMessages.filter((msg) => {
            // Remove the temp message we added optimistically
            if (msg.id === userMessage.id) return false;
            // Remove any duplicate by message_id (if API returned it)
            if (msg.id === response.message_id) return false;
            // Remove duplicates by content and role for temp messages
            if (msg.content === userMessage.content && 
                msg.role === userMessage.role && 
                msg.id.startsWith('temp_')) {
              return false;
            }
            return true;
          });
          
          // Update chat store with last message (optimistic update)
          useChatStore.getState().updateChatLastMessage(actualSessionId, assistantMessage.content);
          
          return {
            messages: {
              ...state.messages,
              [actualSessionId]: [...filteredMessages, updatedUserMessage, assistantMessage],
            },
            isSending: { ...state.isSending, [actualSessionId]: false },
            // Mark session as loaded to prevent refetching
            loadedSessions: { ...state.loadedSessions, [actualSessionId]: true },
          };
        });
      }
    } catch (error: any) {
      console.error("Failed to send message:", error);
      
      // Remove optimistic user message on error
      set((state) => {
        const existingMessages = state.messages[actualSessionId] || [];
        const filteredMessages = existingMessages.filter((msg) => msg.id !== userMessage.id);
        return {
          messages: {
            ...state.messages,
            [actualSessionId]: filteredMessages,
          },
          isSending: { ...state.isSending, [actualSessionId]: false },
          streamingContent: { ...state.streamingContent, [actualSessionId]: "" },
        };
      });
      
      // Don't throw error - just log it to prevent widget from closing
      // Show error to user instead
      console.error("Message send failed:", error.message || error);
    }
  },
  getMessages: (sessionId: string) => {
    return get().messages[sessionId] || [];
  },
  clearMessages: (sessionId: string) => {
    set((state) => {
      const { [sessionId]: _, ...restMessages } = state.messages;
      const { [sessionId]: __, ...restLoadedSessions } = state.loadedSessions;
      return { 
        messages: restMessages,
        loadedSessions: restLoadedSessions,
      };
    });
  },
}));

