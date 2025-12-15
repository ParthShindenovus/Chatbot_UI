import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Loader2, X } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { MessageInput, type MessageInputHandle } from "./MessageInput";
import { Suggestions } from "./Suggestions";
import { ScrollToBottom, InfiniteScrollContainer } from "@/shared/components";
import { useChatStore } from "../store/chatStore";
import { useMessageLoader } from "../hooks/useMessageLoader";
import { useScrollManager } from "../hooks/useScrollManager";
import { useSendMessageMutation, useSuggestionsQuery, useConversationState } from "../useQueries";
import { useRef, useEffect } from "react";
import type { Message } from "../types";

interface ChatScreenProps {
  chatId: string;
  onBack?: () => void;
  onClose?: () => void;
}

/**
 * ChatScreen Component
 * Single Responsibility: Render chat UI and handle user interactions
 * All async state is managed by TanStack Query with optimistic updates
 */
export function ChatScreen({ chatId, onBack, onClose }: ChatScreenProps) {
  // Use TanStack Query hooks for async state
  const { hasLoaded, chatMessages, isLoading: isLoadingMessages } = useMessageLoader(chatId);
  const sendMessageMutation = useSendMessageMutation();
  const { data: suggestionsData } = useSuggestionsQuery(chatId, true);
  const conversationState = useConversationState(chatId);
  
  // Scroll management
  const { scrollAreaRef, scrollViewportRef, enableAutoScroll } = useScrollManager(
    chatMessages,
    false, // isLoadingOlder - can be added later with infinite query
    chatId
  );
  const inputRef = useRef<MessageInputHandle>(null);

  // Focus input after message is sent
  useEffect(() => {
    if (!sendMessageMutation.isPending && chatMessages.length > 0) {
      inputRef.current?.focus();
    }
  }, [sendMessageMutation.isPending, chatMessages.length]);

  // Show initial greeting when chat is empty
  const showGreeting = chatMessages.length === 0 && !isLoadingMessages && !sendMessageMutation.isPending;
  const showLoader = isLoadingMessages && chatMessages.length === 0 && !hasLoaded;

  const handleSendMessage = async (content: string) => {
    try {
      enableAutoScroll();
      const result = await sendMessageMutation.mutateAsync({ sessionId: chatId, content });
      
      // Update active chat if session was created
      if (result.actualSessionId && result.actualSessionId !== chatId) {
        useChatStore.getState().selectChat(result.actualSessionId);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const handleLoadMore = () => {
    // TODO: Implement with infinite query if needed
  };

  // Static suggestions for new chat only
  const staticSuggestions = [
    "What is a novated lease?",
    "How does FBT exemption work?",
    "What EVs are available?",
  ];

  // Determine which suggestions to show
  const isNewChat = chatMessages.length === 0;
  const shouldShowSuggestions = !conversationState.isComplete;
  
  let suggestionsToShow: string[] = [];
  
  if (shouldShowSuggestions) {
    if (isNewChat) {
      // New chat: Show all 3 static suggestions
      suggestionsToShow = staticSuggestions;
    } else {
      // Chat has started: Show all 3 suggestions from API
      const apiSuggestions = suggestionsData?.suggestions || conversationState.suggestions || [];
      // Take top 3 from API suggestions
      suggestionsToShow = apiSuggestions.slice(0, 3);
    }
  }

  // Build display messages with typing indicator
  const displayMessages: Message[] = [...chatMessages];
  if (sendMessageMutation.isPending && chatMessages.length > 0) {
    displayMessages.push({
      id: "typing-indicator",
      chatId,
      content: "",
      role: "assistant",
      timestamp: new Date(),
      isRead: false,
    });
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 border-b flex items-center gap-2 bg-card p-3 sm:p-4">
        {onBack && (
          <Button onClick={onBack} variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="size-4 sm:size-5" />
            <span className="sr-only">Back</span>
          </Button>
        )}
        <h2 className="text-base sm:text-lg font-semibold truncate flex-1">Chat</h2>
        {onClose && (
          <Button onClick={onClose} variant="ghost" size="icon" className="shrink-0" aria-label="Close chat">
            <X className="size-4 sm:size-5" />
            <span className="sr-only">Close</span>
          </Button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {showLoader ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ScrollArea className="h-full" ref={scrollAreaRef}>
            <div className="p-3 sm:p-4">
              {showGreeting ? (
                <>
                  <div className="flex items-center justify-center min-h-full py-8 px-4">
                    <div className="text-center">
                      <p className="text-base sm:text-lg font-medium text-foreground">
                        How can I assist you today?
                      </p>
                    </div>
                  </div>
                  {/* Show suggestions from API on chat start, only if not complete */}
                  {!sendMessageMutation.isPending && shouldShowSuggestions && suggestionsToShow.length > 0 && (
                    <Suggestions
                      suggestions={suggestionsToShow}
                      isLoading={false}
                      onSelect={handleSuggestionClick}
                    />
                  )}
                </>
              ) : (
                <InfiniteScrollContainer
                  onLoadMore={handleLoadMore}
                  hasMore={false} // TODO: Implement with infinite query
                  isLoading={false}
                  className="flex flex-col"
                  scrollContainer={scrollViewportRef.current}
                >
                  {displayMessages.map((message) => (
                    <MessageBubble key={message.id} message={message} isStreaming={false} />
                  ))}
                  {/* Show suggestions after messages, only if not complete */}
                  {!sendMessageMutation.isPending && shouldShowSuggestions && suggestionsToShow.length > 0 && (
                    <Suggestions
                      suggestions={suggestionsToShow}
                      isLoading={false}
                      onSelect={handleSuggestionClick}
                    />
                  )}
                  <ScrollToBottom messages={displayMessages} smooth scrollContainer={scrollViewportRef.current} />
                </InfiniteScrollContainer>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      <div className="shrink-0 border-t bg-card">
        {conversationState.isComplete ? (
          <div className="p-4 text-center">
            <div className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">✓ Conversation Complete</div>
            <div className="text-xs text-muted-foreground">Thank you! Our team will contact you shortly.</div>
          </div>
        ) : (
          <>
            {/* Remove needsInfo label - we don't need it anymore */}
            <MessageInput
              ref={inputRef}
              onSend={handleSendMessage}
              disabled={sendMessageMutation.isPending}
              placeholder="Write your consent here"
            />
          </>
        )}
      </div>
    </div>
  );
}

