import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatListItem } from "./ChatListItem";
import { useChatStore } from "../store/chatStore";
import { useChatsInfiniteQuery, useCreateSessionMutation } from "../useQueries";
import { useSessionStore } from "../store/sessionStore";
import { InfiniteScrollContainer } from "@/shared/components";
import { Plus, X, Loader2 } from "lucide-react";
import type { Session } from "../api";

interface ChatListProps {
  onClose?: () => void;
  onSelectChat?: (chatId: string) => void;
}

// Convert session to chat summary for display
const sessionToChatSummary = (session: Session) => ({
  id: session.id,
  title: "Alex AI", // Fixed name for all chats
  lastMessage: session.last_message || "",
  lastMessageTime: session.last_message_at ? new Date(session.last_message_at) : new Date(session.created_at),
  unreadCount: 0,
  isActive: false,
});

/**
 * ChatList Component
 * Single Responsibility: Render list of chats using TanStack Query
 */
export function ChatList({ onClose, onSelectChat }: ChatListProps) {
  const { selectChat } = useChatStore();
  const { visitorId, initVisitor } = useSessionStore();
  const scrollViewportRef = useRef<HTMLElement | null>(null);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const createSessionMutation = useCreateSessionMutation();
  
  const {
    data,
    isLoading,
    isFetching,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useChatsInfiniteQuery(visitorId);

  // Flatten all pages into a single array (per TanStack Query docs)
  const allSessions = data?.pages.flatMap((page) => page.sessions) || [];
  
  // Show loading state during initial load
  const showLoading = isLoading && allSessions.length === 0;

  // Convert sessions to chat summaries
  const chats = allSessions.map(sessionToChatSummary);

  // Get scroll viewport element after render - use multiple strategies
  useEffect(() => {
    const findViewport = () => {
      // Try to find the viewport within the widget container
      const widgetContainer = document.querySelector('#chat-widget-container, .chat-widget-isolated, .chat-widget-wrapper');
      const viewport = widgetContainer?.querySelector('.widget-scroll-area-viewport') as HTMLElement;
      if (viewport) {
        scrollViewportRef.current = viewport;
        return true;
      }
      return false;
    };

    // Try immediately
    findViewport();
    
    // Also try after a short delay (for initial render)
    const timeoutId = setTimeout(() => {
      findViewport();
    }, 100);
    
    // Use MutationObserver to watch for DOM changes
    const observer = new MutationObserver(() => {
      findViewport();
    });
    
    const widgetContainer = document.querySelector('#chat-widget-container, .chat-widget-isolated, .chat-widget-wrapper');
    if (widgetContainer) {
      observer.observe(widgetContainer, { childList: true, subtree: true });
    }
    
    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [allSessions.length, chats.length]); // Re-run when sessions/chats change

  // No need to refetch - infinite query handles initial load automatically

  const handleLoadMore = () => {
    // Per TanStack Query docs: prevent calling fetchNextPage while fetching to avoid data conflicts
    // Only one fetch can happen at a time for an InfiniteQuery
    if (hasNextPage && !isFetching && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleCreateChat = async () => {
    setIsCreatingChat(true);
    try {
      let currentVisitorId = visitorId;
      if (!currentVisitorId) {
        currentVisitorId = await initVisitor();
      }

      const session = await createSessionMutation.mutateAsync();
      
      // Create temp chat ID for immediate UI feedback
      const tempChatId = `temp_new_chat_${Date.now()}`;
      selectChat(tempChatId);

      // Update to real session ID and navigate to chat
      selectChat(session.id);
      if (onSelectChat) {
        onSelectChat(session.id);
      }
    } catch (error) {
      console.error("Failed to create chat:", error);
    } finally {
      setIsCreatingChat(false);
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
    <div className="widget-flex widget-flex-col" style={{ height: '100%', overflow: 'hidden' }}>
      <div className="widget-chat-list-header" style={{ flexShrink: 0 }}>
        <h2 className="widget-chat-list-title">Chats</h2>
        <div className="widget-flex widget-items-center widget-gap-1">
          <Button 
            onClick={handleCreateChat} 
            size="icon" 
            variant="ghost" 
            style={{ flexShrink: 0 }}
            disabled={isCreatingChat}
          >
            {isCreatingChat ? (
              <Loader2 className="widget-loader-spinner" style={{ width: '1rem', height: '1rem' }} />
            ) : (
              <Plus style={{ width: '1rem', height: '1rem' }} />
            )}
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

      {showLoading ? (
        <div className="widget-flex" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
          <Loader2 className="widget-loader-spinner" />
        </div>
      ) : chats.length === 0 ? (
        <div className="widget-flex widget-flex-col widget-items-center widget-gap-2 widget-justify-center" style={{ flex: 1, padding: '1.5rem', textAlign: 'center', minHeight: 0 }}>
          <p className="widget-text-sm widget-text-muted">No chats yet. Start a new conversation!</p>
          <Button onClick={handleCreateChat} size="sm" disabled={isCreatingChat}>
            {isCreatingChat ? (
              <>
                <Loader2 className="widget-loader-spinner" style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
                Creating...
              </>
            ) : (
              <>
                <Plus style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
                Start New Chat
              </>
            )}
          </Button>
        </div>
      ) : (
        <ScrollArea className="widget-scroll-area" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div 
            className="widget-p-3" 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.75rem',
              paddingBottom: '1.5rem'
            }}
          >
            <InfiniteScrollContainer
              onLoadMore={handleLoadMore}
              hasMore={hasNextPage || false}
              isLoading={isFetchingNextPage || isFetching}
              className="widget-flex widget-flex-col widget-gap-2"
              style={{ width: '100%' }}
              scrollContainer={scrollViewportRef.current}
            >
              {chats.map((chat) => (
                <ChatListItem
                  key={chat.id}
                  chat={chat}
                  onClick={() => handleChatClick(chat.id)}
                  onDelete={handleDeleteChat}
                />
              ))}
              {isFetchingNextPage && (
                <div className="widget-flex widget-items-center widget-justify-center" style={{ padding: '1rem 0', width: '100%' }}>
                  <Loader2 className="widget-loader-spinner" />
                  <span className="widget-text-xs widget-text-muted" style={{ marginLeft: '0.5rem' }}>Loading more chats...</span>
                </div>
              )}
            </InfiniteScrollContainer>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
