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
    <div className="widget-flex widget-flex-col" style={{ height: '100%' }}>
      <div className="widget-chat-list-header">
        <h2 className="widget-chat-list-title">Chats</h2>
        <div className="widget-flex widget-items-center widget-gap-1">
          <Button onClick={handleCreateChat} size="icon" variant="ghost" style={{ flexShrink: 0 }}>
            <Plus style={{ width: '1rem', height: '1rem' }} />
            <span className="widget-sr-only">New chat</span>
          </Button>
          {onClose && (
            <Button onClick={onClose} size="icon" variant="ghost" className="widget-shrink-0" style={{ flexShrink: 0 }} aria-label="Close chat">
              <X style={{ width: '1rem', height: '1rem' }} />
              <span className="widget-sr-only">Close</span>
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="widget-flex" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 className="widget-loader-spinner" />
        </div>
      ) : chats.length === 0 ? (
        <div className="widget-flex widget-flex-col widget-items-center widget-justify-center" style={{ flex: 1, padding: '1.5rem', textAlign: 'center' }}>
          <p className="widget-text-sm widget-text-muted" style={{ marginBottom: '1rem', padding: '0 1rem' }}>No chats yet. Start a new conversation!</p>
          <Button onClick={handleCreateChat} size="sm">
            <Plus style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
            Start New Chat
          </Button>
        </div>
      ) : (
        <ScrollArea className="widget-scroll-area" style={{ flex: 1 }}>
          <div className="widget-p-3" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
