import { create } from "zustand";

/**
 * ChatStore - Single Responsibility: Manage active chat state only
 * All async operations (fetching chats, messages) are handled by TanStack Query
 */
interface ChatStore {
  activeChatId: string | null;
  selectChat: (chatId: string | null) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  activeChatId: null,
  selectChat: (chatId: string | null) => {
    set({ activeChatId: chatId });
  },
}));

