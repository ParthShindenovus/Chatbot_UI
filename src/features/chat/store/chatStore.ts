import { create } from "zustand";
import type { ChatSummary } from "../types";
import { useSessionStore } from "./sessionStore";
import { listSessions, getChatHistory, deleteSession, type Session as ApiSession } from "../api";
import { useMessageStore } from "./messageStore";

interface ChatStore {
  chats: ChatSummary[];
  activeChatId: string | null;
  isLoading: boolean;
  loadChats: () => Promise<void>;
  createChat: () => Promise<string>;
  selectChat: (chatId: string | null) => void;
  markAsRead: (chatId: string) => void;
  updateChatLastMessage: (chatId: string, message: string) => void;
  deleteChat: (chatId: string) => Promise<void>;
}

// Convert session to chat summary
const sessionToChatSummary = (session: ApiSession, lastMessage?: string, unreadCount?: number): ChatSummary => {
  return {
    id: session.id,
    title: `Chat ${new Date(session.created_at).toLocaleDateString()}`,
    lastMessage: lastMessage || "",
    lastMessageTime: new Date(session.created_at),
    unreadCount: unreadCount || 0,
    isActive: false,
  };
};

export const useChatStore = create<ChatStore>((set, get) => ({
  chats: [],
  activeChatId: null,
  isLoading: false,
  loadChats: async () => {
    set({ isLoading: true });
    try {
      const sessionStore = useSessionStore.getState();
      const visitorId = sessionStore.visitorId;
      
      if (!visitorId) {
        console.warn("No visitor ID available");
        set({ isLoading: false });
        return;
      }

      // Load all sessions for this visitor (both active and inactive)
      // Don't filter by is_active to show all sessions
      const sessions = await listSessions(visitorId);
      
      // Convert sessions to chat summaries and get last message for each
      const chatsPromises = sessions.map(async (session) => {
        try {
          // Get recent messages to find the last one
          // Get last 10 messages to ensure we get the most recent
          const { messages } = await getChatHistory(session.id, 10, 0);
          // Messages are sorted oldest first, so get the last one (most recent)
          const lastMessage = messages.length > 0 ? messages[messages.length - 1].message : "";
          return sessionToChatSummary(session, lastMessage);
        } catch (error) {
          console.warn(`Failed to get last message for session ${session.id}:`, error);
          return sessionToChatSummary(session);
        }
      });
      
      const chats = await Promise.all(chatsPromises);
      
      // Filter out temporary chats (they shouldn't appear in the list)
      const validChats = chats.filter(chat => !chat.id.startsWith("temp_new_chat_"));
      
      // Sort by last message time (most recent first)
      validChats.sort((a, b) => {
        // If both have last messages, sort by last message time
        if (a.lastMessage && b.lastMessage) {
          return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
        }
        // If only one has a message, prioritize it
        if (a.lastMessage && !b.lastMessage) return -1;
        if (!a.lastMessage && b.lastMessage) return 1;
        // If neither has messages, sort by creation time
        return b.lastMessageTime.getTime() - a.lastMessageTime.getTime();
      });
      
      // Don't auto-select a chat - let user choose from list
      // Only preserve existing activeChatId if it's still in the list (or if it's a temp chat)
      // IMPORTANT: Always preserve activeChatId if it exists - don't reset it to null
      // This prevents the widget from closing when loadChats() runs after session creation
      const currentActiveChatId = get().activeChatId;
      const isTempChat = currentActiveChatId && currentActiveChatId.startsWith("temp_new_chat_");
      const chatExists = validChats.find(chat => chat.id === currentActiveChatId);
      
      // Preserve activeChatId if:
      // 1. It's a temp chat (session being created)
      // 2. It exists in the loaded chats
      // 3. It's already set (don't reset to null - this prevents widget from closing)
      const activeChatId = (isTempChat || chatExists || currentActiveChatId)
        ? currentActiveChatId 
        : null;
      
      set({
        chats: validChats,
        activeChatId,
        isLoading: false,
      });
      
      console.log(`✅ Loaded ${validChats.length} active chats for visitor`);
    } catch (error) {
      console.error("Failed to load chats:", error);
      set({ isLoading: false });
    }
  },
  createChat: async () => {
    try {
      const sessionStore = useSessionStore.getState();
      const visitorId = sessionStore.visitorId;
      
      if (!visitorId) {
        throw new Error("Visitor ID is required. Please initialize the widget first.");
      }
      
      // Create a temporary chat ID (session will be created when first message is sent)
      const tempChatId = `temp_new_chat_${Date.now()}`;
      
      // Set as active chat (but don't add to chats list until session is created)
      set({
        activeChatId: tempChatId,
      });

      console.log(`✅ Created temporary chat: ${tempChatId} (session will be created on first message)`);
      return tempChatId;
    } catch (error) {
      console.error("Failed to create chat:", error);
      throw error;
    }
  },
  selectChat: (chatId: string | null) => {
    set((state) => ({
      activeChatId: chatId,
      chats: state.chats.map((chat) => ({
        ...chat,
        isActive: chat.id === chatId,
      })),
    }));
  },
  markAsRead: (chatId: string) => {
    set((state) => ({
      chats: state.chats.map((chat) =>
        chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
      ),
    }));
  },
  updateChatLastMessage: (chatId: string, message: string) => {
    set((state) => ({
      chats: state.chats.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              lastMessage: message.length > 50 ? message.substring(0, 50) + "..." : message,
              lastMessageTime: new Date(),
            }
          : chat
      ),
    }));
  },
  deleteChat: async (chatId: string) => {
    try {
      // Optimistically remove from UI
      set((state) => ({
        chats: state.chats.filter((chat) => chat.id !== chatId),
        activeChatId: state.activeChatId === chatId ? null : state.activeChatId,
      }));
      
      // Clear messages for this chat
      useMessageStore.getState().clearMessages(chatId);
      
      // Call API to delete
      await deleteSession(chatId);
      
      console.log(`✅ Deleted chat: ${chatId}`);
    } catch (error) {
      console.error("Failed to delete chat:", error);
      // Reload chats on error to restore state
      await get().loadChats();
      throw error;
    }
  },
}));

