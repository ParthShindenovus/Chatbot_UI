import { create } from "zustand";
import type { Message } from "../types";
import { getChatHistory, sendMessage, sendMessageStream, createSession, getSuggestions, type Message as ApiMessage } from "../api";
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
  suggestions: Record<string, string[]>; // Suggestions for each session
  isLoadingSuggestions: Record<string, boolean>; // Loading state for suggestions
  needsInfo: Record<string, "name" | "email" | "phone" | "issue" | null>; // What info is needed
  isComplete: Record<string, boolean>; // Whether conversation is complete
  loadInitialMessages: (sessionId: string) => Promise<void>;
  loadOlderMessages: (sessionId: string) => Promise<void>;
  sendMessage: (sessionId: string, content: string, useStreaming?: boolean) => Promise<void>;
  getMessages: (sessionId: string) => Message[];
  clearMessages: (sessionId: string) => void;
  loadSuggestions: (sessionId: string) => Promise<void>;
  getSuggestions: (sessionId: string) => string[];
  clearSuggestions: (sessionId: string) => void;
  getNeedsInfo: (sessionId: string) => "name" | "email" | "phone" | "issue" | null;
  getIsComplete: (sessionId: string) => boolean;
  setInitialSuggestions: (sessionId: string, conversationType: "sales" | "support" | "knowledge") => void;
  addInitialAssistantMessage: (sessionId: string, conversationType: "sales" | "support" | "knowledge") => void;
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
  suggestions: {},
  isLoadingSuggestions: {},
  needsInfo: {},
  isComplete: {},
  loadInitialMessages: async (sessionId: string) => {
    const state = get();
    
    // Skip if already loaded (optimistic update pattern - don't refetch if user is in chat)
    if (state.loadedSessions[sessionId]) {
      console.log(`⏭️ Skipping load for ${sessionId} - already loaded (using optimistic updates)`);
      return;
    }
    
    // Skip if currently loading to prevent duplicate API calls
    if (state.isLoading[sessionId]) {
      console.log(`⏭️ Skipping load for ${sessionId} - already loading`);
      return;
    }
    
    const existingMessages = state.messages[sessionId];
    // Only skip if we have real messages (not temp/streaming/typing indicators)
    const hasRealMessages = existingMessages && existingMessages.length > 0 && 
      existingMessages.some(msg => 
        !msg.id.startsWith('temp_') && 
        msg.id !== 'streaming' && 
        msg.id !== 'typing-indicator' && 
        msg.id !== 'typing'
      );
    
    // Skip if we already have real messages or currently sending
    const isCurrentlySending = state.isSending[sessionId];
    if (hasRealMessages || isCurrentlySending) {
      return; // Already loaded real messages or currently sending
    }

    // Set loading flag immediately to prevent duplicate calls
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
        
        // Get existing real message IDs to prevent duplicates
        const existingRealMessageIds = new Set(
          (state.messages[sessionId] || [])
            .filter(msg => !msg.id.startsWith('temp_') && msg.id !== 'streaming' && msg.id !== 'typing-indicator' && msg.id !== 'typing')
            .map(msg => msg.id)
        );
        
        // Filter out messages that already exist (deduplicate by ID)
        const newMessages = convertedMessages.filter(msg => !existingRealMessageIds.has(msg.id));
        
        if (newMessages.length < convertedMessages.length) {
          console.log(`⚠️ Filtered out ${convertedMessages.length - newMessages.length} duplicate message(s) for session ${sessionId}`);
        }
        
        // Combine: existing real messages (if any), new messages, then temp messages
        // This ensures we don't lose any existing real messages
        const existingRealMessages = (state.messages[sessionId] || [])
          .filter(msg => !msg.id.startsWith('temp_') && msg.id !== 'streaming' && msg.id !== 'typing-indicator' && msg.id !== 'typing');
        
        // Merge existing and new messages, removing duplicates
        const allRealMessages = [...existingRealMessages];
        newMessages.forEach(newMsg => {
          if (!allRealMessages.some(existing => existing.id === newMsg.id)) {
            allRealMessages.push(newMsg);
          }
        });
        
        // Sort by timestamp to maintain order
        allRealMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        
        return {
          messages: { 
            ...state.messages, 
            [sessionId]: [...allRealMessages, ...existingTempMessages] 
          },
          isLoading: { ...state.isLoading, [sessionId]: false },
          hasMore: { ...state.hasMore, [sessionId]: hasMore },
          offset: { ...state.offset, [sessionId]: allRealMessages.length },
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
    const conversationType = sessionStore.conversationType || "knowledge";
    
    if (!visitorId) {
      throw new Error("Visitor ID is required. Please initialize the widget first.");
    }

    if (!conversationType) {
      throw new Error("Conversation type is required. Please select a conversation type first.");
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
        
        // Remove temp chat and add real chat
        // IMPORTANT: Set activeChatId FIRST to prevent widget from closing
        useChatStore.setState({
          activeChatId: session.id, // Set immediately to keep widget open
        });
        
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
        
        // Load suggestions after session is created (only for knowledge type)
        const sessionStore = useSessionStore.getState();
        if (sessionStore.conversationType === "knowledge") {
          setTimeout(() => {
            get().loadSuggestions(actualSessionId).catch((err) => {
              console.warn("Failed to load initial suggestions:", err);
            });
          }, 300);
        }
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

        // Note: For streaming, we don't get suggestions/needs_info/complete in the stream
        // We'll need to fetch them separately or handle them differently
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
        
        // Fetch suggestions after streaming completes (only for knowledge type)
        const sessionStore = useSessionStore.getState();
        if (sessionStore.conversationType === "knowledge") {
          setTimeout(() => {
            get().loadSuggestions(actualSessionId).catch((err) => {
              console.warn("Failed to load suggestions after streaming:", err);
            });
          }, 500);
        }
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
          
          // Extract suggestions, needs_info, and complete from response
          const apiSuggestions = response.suggestions || [];
          const needsInfo = response.needs_info || null;
          const isComplete = response.complete || false;
          
          // Use API suggestions if provided, otherwise keep existing ones
          const finalSuggestions = apiSuggestions.length > 0 
            ? apiSuggestions 
            : (state.suggestions[actualSessionId] || []);
          
          return {
            messages: {
              ...state.messages,
              [actualSessionId]: [...filteredMessages, updatedUserMessage, assistantMessage],
            },
            isSending: { ...state.isSending, [actualSessionId]: false },
            // Mark session as loaded to prevent refetching
            loadedSessions: { ...state.loadedSessions, [actualSessionId]: true },
            // Update suggestions, needs_info, and complete from API response
            suggestions: { ...state.suggestions, [actualSessionId]: finalSuggestions },
            needsInfo: { ...state.needsInfo, [actualSessionId]: needsInfo },
            isComplete: { ...state.isComplete, [actualSessionId]: isComplete },
          };
        });
        
        // If suggestions weren't provided in response, fetch them (only for knowledge type)
        const sessionStore = useSessionStore.getState();
        if ((!response.suggestions || response.suggestions.length === 0) && sessionStore.conversationType === "knowledge") {
          setTimeout(() => {
            get().loadSuggestions(actualSessionId).catch((err) => {
              console.warn("Failed to load suggestions:", err);
            });
          }, 500);
        }
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
      const { [sessionId]: ___, ...restSuggestions } = state.suggestions;
      return { 
        messages: restMessages,
        loadedSessions: restLoadedSessions,
        suggestions: restSuggestions,
      };
    });
  },
  loadSuggestions: async (sessionId: string) => {
    // Don't load suggestions for temp chats
    if (sessionId.startsWith("temp_new_chat_")) {
      return;
    }
    
    // Only load suggestions for Knowledge conversation type
    const sessionStore = useSessionStore.getState();
    const conversationType = sessionStore.conversationType;
    if (conversationType !== "knowledge") {
      // Sales and Support don't use suggestions API
      return;
    }
    
    // Skip if already loading
    if (get().isLoadingSuggestions[sessionId]) {
      return;
    }
    
    set((state) => ({
      isLoadingSuggestions: { ...state.isLoadingSuggestions, [sessionId]: true },
    }));
    
    try {
      const visitorId = sessionStore.visitorId;
      
      const response = await getSuggestions(sessionId, visitorId || undefined);
      
      set((state) => ({
        suggestions: { ...state.suggestions, [sessionId]: response.suggestions },
        isLoadingSuggestions: { ...state.isLoadingSuggestions, [sessionId]: false },
      }));
      
      console.log(`✅ Loaded ${response.suggestions.length} suggestions for session ${sessionId}`);
    } catch (error) {
      console.error("Failed to load suggestions:", error);
      set((state) => ({
        isLoadingSuggestions: { ...state.isLoadingSuggestions, [sessionId]: false },
      }));
    }
  },
  getSuggestions: (sessionId: string) => {
    return get().suggestions[sessionId] || [];
  },
  clearSuggestions: (sessionId: string) => {
    set((state) => {
      const { [sessionId]: _, ...rest } = state.suggestions;
      return { suggestions: rest };
    });
  },
  getNeedsInfo: (sessionId: string) => {
    return get().needsInfo[sessionId] || null;
  },
  getIsComplete: (sessionId: string) => {
    return get().isComplete[sessionId] || false;
  },
  setInitialSuggestions: (sessionId: string, conversationType: "sales" | "support" | "knowledge") => {
    let initialSuggestions: string[] = [];
    
    // Only set suggestions for knowledge type
    if (conversationType === "knowledge") {
      initialSuggestions = [
        "What is a novated lease?",
        "How does FBT exemption work?",
        "What EVs are available?",
        "What are the tax benefits?",
        "How do I apply for a lease?",
      ];
    }
    // Sales and Support don't get suggestions - they get assistant messages instead
    
    set((state) => ({
      suggestions: { ...state.suggestions, [sessionId]: initialSuggestions },
    }));
  },
  addInitialAssistantMessage: (sessionId: string, conversationType: "sales" | "support" | "knowledge") => {
    let messageContent = "";
    
    switch (conversationType) {
      case "sales":
        messageContent = "Hello! I'm here to help you learn about our novated leasing services and connect you with our sales team. To get started, I'll need a few details:\n\n• Your name\n• Your email address\n• Your phone number\n\nPlease provide these details and I'll be happy to assist you!";
        break;
      case "support":
        messageContent = "Hello! I'm here to help you with any issues or questions you may have. To assist you better, I'll need some information:\n\n• Your name\n• Your email address\n• A description of the issue you're experiencing\n\nPlease provide these details and I'll help you resolve your issue!";
        break;
      case "knowledge":
        // Knowledge doesn't need an initial message - it uses suggestions
        return;
    }
    
    const initialMessage: Message = {
      id: `initial_${sessionId}_${Date.now()}`,
      chatId: sessionId,
      content: messageContent,
      role: "assistant",
      timestamp: new Date(),
      isRead: false,
    };
    
    set((state) => ({
      messages: {
        ...state.messages,
        [sessionId]: [initialMessage],
      },
      // Set initial needs_info based on conversation type
      needsInfo: {
        ...state.needsInfo,
        [sessionId]: conversationType === "sales" ? "name" : "issue",
      },
    }));
  },
}));

