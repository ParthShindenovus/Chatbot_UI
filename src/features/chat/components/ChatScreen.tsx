import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Loader2, X } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { MessageInput } from "./MessageInput";
import { ScrollToBottom, InfiniteScrollContainer } from "@/shared/components";
import { useChatStore } from "../store/chatStore";
import { useMessageStore } from "../store/messageStore";

interface ChatScreenProps {
  chatId: string;
  onBack?: () => void;
  onClose?: () => void;
}

export function ChatScreen({ chatId, onBack, onClose }: ChatScreenProps) {
  const { markAsRead, updateChatLastMessage } = useChatStore();
  const {
    isLoading,
    isLoadingOlder,
    isSending,
    streamingContent,
    hasMore,
    loadInitialMessages,
    loadOlderMessages,
    sendMessage,
    getMessages,
  } = useMessageStore();

  const chatMessages = getMessages(chatId);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLElement | null>(null);
  const previousMessageCountRef = useRef(0);
  const previousScrollHeightRef = useRef(0);
  const isInitialLoadRef = useRef(true);
  const shouldScrollToBottomRef = useRef(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load messages when chat opens (only once per chatId)
  // Skip loading for temporary chats (they don't have sessions yet)
  // Use optimistic updates - don't reload if messages already exist
  useEffect(() => {
    const isTempChat = chatId && chatId.startsWith("temp_new_chat_");
    const hasMessages = chatMessages.length > 0;
    const isCurrentlySending = isSending[chatId || ""];
    
    // Don't load if:
    // 1. It's a temp chat
    // 2. Already loaded (hasLoaded flag)
    // 3. Currently loading
    // 4. Already has messages (optimistic update pattern - use existing data)
    // 5. Currently sending a message (to prevent reload during send)
    if (chatId && 
        !isTempChat && 
        !hasLoaded && 
        !isLoading[chatId] && 
        !hasMessages && 
        !isCurrentlySending) {
      setHasLoaded(true);
      loadInitialMessages(chatId).then(() => {
        markAsRead(chatId);
      }).catch((error) => {
        console.error("Failed to load initial messages:", error);
        setHasLoaded(false); // Allow retry on error
      });
    } else if (hasMessages && !hasLoaded) {
      // Mark as loaded if we already have messages (from optimistic updates)
      setHasLoaded(true);
    }
    // IMPORTANT: Don't reset hasLoaded when transitioning from temp to real chatId
    // This prevents the widget from closing when session is created
    // Only reset if switching to a completely different chat
    return () => {
      // Only reset if we're actually switching to a different chat
      // Don't reset if transitioning from temp to real (they're related)
      if (chatId && !isTempChat) {
        // Check if we're switching to a different chat (not just temp->real transition)
        const currentActiveChatId = useChatStore.getState().activeChatId;
        // Only reset if the new chatId is completely different
        // This prevents reset when session is created (temp -> real transition)
        if (currentActiveChatId && currentActiveChatId !== chatId && !currentActiveChatId.startsWith("temp_new_chat_")) {
          setHasLoaded(false);
        }
      }
    };
  }, [chatId, hasLoaded, isLoading, chatMessages.length, isSending]); // Include dependencies to check message state

  useEffect(() => {
    // Get scroll viewport reference after render
    const timer = setTimeout(() => {
      if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-slot="scroll-area-viewport"]') as HTMLElement;
        if (viewport) {
          scrollViewportRef.current = viewport;
        }
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [chatId]);

  // Handle scroll position when messages change
  useEffect(() => {
    if (!scrollViewportRef.current || chatMessages.length === 0) return;

    const viewport = scrollViewportRef.current;
    const currentMessageCount = chatMessages.length;
    const previousMessageCount = previousMessageCountRef.current;
    const currentScrollHeight = viewport.scrollHeight;
    const previousScrollHeight = previousScrollHeightRef.current;

    // Determine if we should scroll to bottom
    const isNewMessage = currentMessageCount > previousMessageCount;
    const isInitialLoad = isInitialLoadRef.current;
    const isLoadingOlderMessages = isLoadingOlder[chatId];

    if (isInitialLoad) {
      // Initial load: scroll to bottom
      requestAnimationFrame(() => {
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
          isInitialLoadRef.current = false;
          shouldScrollToBottomRef.current = false;
        }
      });
    } else if (isLoadingOlderMessages) {
      // Loading older messages: maintain scroll position
      const scrollDiff = currentScrollHeight - previousScrollHeight;
      if (scrollDiff > 0) {
        requestAnimationFrame(() => {
          if (viewport) {
            viewport.scrollTop = viewport.scrollTop + scrollDiff;
          }
        });
      }
      shouldScrollToBottomRef.current = false;
    } else if (isNewMessage && shouldScrollToBottomRef.current) {
      // New message added: scroll to bottom
      requestAnimationFrame(() => {
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      });
    }

    previousMessageCountRef.current = currentMessageCount;
    previousScrollHeightRef.current = viewport.scrollHeight;
  }, [chatMessages.length, isLoading, isLoadingOlder, chatId]);

  // Track when user scrolls to determine if we should auto-scroll
  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = viewport;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      shouldScrollToBottomRef.current = isNearBottom;
    };

    viewport.addEventListener("scroll", handleScroll);
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, [chatId]);

  const handleSendMessage = async (content: string) => {
    try {
      shouldScrollToBottomRef.current = true; // Enable auto-scroll for new message
      await sendMessage(chatId, content, false); // Set to true for streaming
      // Update chat with user message (assistant response will be updated in messageStore)
      // Note: chatId might have changed from temp to real session ID, so use the current activeChatId
      const currentChatId = useChatStore.getState().activeChatId || chatId;
      updateChatLastMessage(currentChatId, content);
    } catch (error) {
      console.error("Failed to send message:", error);
      // Don't close widget on error - just show error in console
      // Widget should remain open so user can retry
    }
  };

  const handleLoadMore = () => {
    if (!isLoadingOlder[chatId] && hasMore[chatId] !== false) {
      loadOlderMessages(chatId);
    }
  };

  // Show default greeting if no messages
  const showGreeting = chatMessages.length === 0 && !isLoading[chatId] && !isSending[chatId];
  
  // Get streaming content if available, or show loading indicator
  const displayMessages = [...chatMessages];
  if (isSending[chatId] && !streamingContent[chatId]) {
    // Show typing indicator when waiting for response
    displayMessages.push({
      id: "typing-indicator",
      chatId,
      content: "",
      role: "assistant",
      timestamp: new Date(),
      isRead: false,
    });
  } else if (streamingContent[chatId]) {
    // Show streaming content
    displayMessages.push({
      id: "streaming",
      chatId,
      content: streamingContent[chatId],
      role: "assistant",
      timestamp: new Date(),
      isRead: false,
    });
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header Section */}
      <div className="shrink-0 border-b flex items-center gap-2 bg-card p-3 sm:p-4">
        {onBack && (
          <Button onClick={onBack} variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="size-4 sm:size-5" />
            <span className="sr-only">Back</span>
          </Button>
        )}
        <h2 className="text-base sm:text-lg font-semibold truncate flex-1">Chat</h2>
        {onClose && (
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-label="Close chat"
          >
            <X className="size-4 sm:size-5" />
            <span className="sr-only">Close</span>
          </Button>
        )}
      </div>

      {/* Chat Content Section */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full" ref={scrollAreaRef}>
          <div className="p-3 sm:p-4">
            {showGreeting ? (
              <div className="flex items-center justify-center min-h-[300px] sm:min-h-[400px] py-6 sm:py-8">
                <div className="text-center px-4">
                  <p className="text-base sm:text-lg mb-2">Hello! How can I help you today?</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Start a conversation by typing a message below.
                  </p>
                </div>
              </div>
            ) : (
              <InfiniteScrollContainer
                onLoadMore={handleLoadMore}
                hasMore={hasMore[chatId] !== false}
                isLoading={isLoadingOlder[chatId] || false}
                className="flex flex-col"
                scrollContainer={scrollViewportRef.current}
              >
                {isLoading[chatId] && chatMessages.length === 0 && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                )}
                {displayMessages.map((message) => (
                  <MessageBubble 
                    key={message.id} 
                    message={message}
                    isStreaming={message.id === "streaming"}
                  />
                ))}
                <ScrollToBottom messages={displayMessages} smooth scrollContainer={scrollViewportRef.current} />
              </InfiniteScrollContainer>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Control Section (Input) */}
      <div className="shrink-0 border-t bg-card">
        <MessageInput onSend={handleSendMessage} disabled={isSending[chatId] || false} />
      </div>
    </div>
  );
}

