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
    <div className="widget-flex widget-flex-col" style={{ height: '100%', minHeight: 0 }}>
      <div className="widget-chat-header">
        {onBack && (
          <Button onClick={onBack} variant="ghost" size="icon" style={{ flexShrink: 0 }}>
            <ArrowLeft style={{ width: '1rem', height: '1rem' }} />
            <span className="widget-sr-only">Back</span>
          </Button>
        )}
        <h2 className="widget-chat-header-title">Chat</h2>
        {onClose && (
          <div className="widget-chat-header-actions">
            <Button onClick={onClose} variant="ghost" size="icon" style={{ flexShrink: 0 }} aria-label="Close chat">
              <X style={{ width: '1rem', height: '1rem' }} />
              <span className="widget-sr-only">Close</span>
            </Button>
          </div>
        )}
      </div>

      <div className="widget-chat-content">
        {showLoader ? (
          <div className="widget-loader">
            <Loader2 className="widget-loader-spinner" />
          </div>
        ) : (
        <ScrollArea className="widget-scroll-area" ref={scrollAreaRef} style={{ height: '100%' }}>
          <div className="widget-chat-messages">
            {showGreeting ? (
                <>
                  <div className="widget-chat-greeting">
                    <div style={{ textAlign: 'center' }}>
                      <p className="widget-chat-greeting-text">
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
                className="widget-flex widget-flex-col"
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

      <div style={{ flexShrink: 0, borderTop: '1px solid var(--widget-border)', background: 'var(--widget-bg)' }}>
        {conversationState.isComplete ? (
          <div className="widget-p-4" style={{ textAlign: 'center' }}>
            <div className="widget-text-sm widget-font-medium" style={{ color: '#16a34a', marginBottom: '0.25rem' }}>✓ Conversation Complete</div>
            <div className="widget-text-xs widget-text-muted">Thank you! Our team will contact you shortly.</div>
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
