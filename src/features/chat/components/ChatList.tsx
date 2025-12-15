import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatListItem } from "./ChatListItem";
import { useChatStore } from "../store/chatStore";
import { useChatsQuery } from "../useQueries";
import { useSessionStore } from "../store/sessionStore";
import { Plus, X, Loader2 } from "lucide-react";
import type { Session } from "../api";

interface ChatListProps {
  onClose?: () => void;
  onSelectChat?: (chatId: string) => void;
  onNewChat?: () => void;
}

// Convert session to chat summary for display
const sessionToChatSummary = (session: Session) => ({
  id: session.id,
  title: `Chat ${new Date(session.created_at).toLocaleDateString()}`,
  lastMessage: "",
  lastMessageTime: new Date(session.created_at),
  unreadCount: 0,
  isActive: false,
});

/**
 * ChatList Component
 * Single Responsibility: Render list of chats using TanStack Query
 */
export function ChatList({ onClose, onSelectChat, onNewChat }: ChatListProps) {
  const { selectChat } = useChatStore();
  const { visitorId } = useSessionStore();
  const { data: sessions = [], isLoading } = useChatsQuery(visitorId);

  // Convert sessions to chat summaries
  const chats = sessions.map(sessionToChatSummary);

  const handleCreateChat = () => {
    if (onNewChat) {
      onNewChat();
    }
  };

  const handleChatClick = (chatId: string) => {
    if (onSelectChat) {
      onSelectChat(chatId);
    } else {
      selectChat(chatId);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    // TODO: Implement delete mutation with optimistic updates
    console.log("Delete chat:", chatId);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 sm:p-4 border-b flex items-center justify-between shrink-0">
        <h2 className="text-base sm:text-lg font-semibold">Chats</h2>
        <div className="flex items-center gap-1">
          <Button onClick={handleCreateChat} size="icon" variant="ghost" className="shrink-0">
            <Plus className="size-4 sm:size-5" />
            <span className="sr-only">New chat</span>
          </Button>
          {onClose && (
            <Button onClick={onClose} size="icon" variant="ghost" className="shrink-0 md:hidden" aria-label="Close chat">
              <X className="size-4 sm:size-5" />
              <span className="sr-only">Close</span>
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : chats.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 text-center">
          <p className="text-sm sm:text-base text-muted-foreground mb-4 px-4">No chats yet. Start a new conversation!</p>
          <Button onClick={handleCreateChat} size="sm" className="sm:size-default">
            <Plus className="size-4 mr-2" />
            Start New Chat
          </Button>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-3 sm:p-4 space-y-2">
            {chats.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                onClick={() => handleChatClick(chat.id)}
                onDelete={handleDeleteChat}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

