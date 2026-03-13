import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InfiniteScrollContainer, ScrollToBottom } from "@/shared/components";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useMessageLoader } from "../hooks/useMessageLoader";
import { useScrollManager } from "../hooks/useScrollManager";
import { useWebSocketChat } from "../hooks/useWebSocketChat";
import { updateSessionInList } from "../hooks/websocket/cacheUpdaters";
import { useChatStore } from "../store/chatStore";
import type { Message } from "../types";
import { chatKeys, useConversationState, useCreateSessionMutation, useSessionData, useReactivateSessionMutation } from "../useQueries";
import { MessageBubble } from "./MessageBubble";
import { MessageInput, type MessageInputHandle } from "./MessageInput";
import { Suggestions } from "./Suggestions";

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
  const queryClient = useQueryClient();
  const { selectChat } = useChatStore();
  
  // Use TanStack Query hooks for async state
  const { hasLoaded, chatMessages, isLoading: isLoadingMessages } = useMessageLoader(chatId);
  const conversationState = useConversationState(chatId);
  const { isActive: isSessionActive } = useSessionData(chatId);
  
  // WebSocket for real-time chat
  const [isSending, setIsSending] = useState(false);
  const [actualSessionId, setActualSessionId] = useState<string>(chatId);
  const createSessionMutation = useCreateSessionMutation();
  const reactivateSessionMutation = useReactivateSessionMutation();
  
  const { 
    isConnected, 
    sendMessage: sendWebSocketMessage,
    streamingContent,
    streamingMessageId,
    connect: connectWebSocket,
  } = useWebSocketChat({
    sessionId: actualSessionId,
    enabled: !chatId.startsWith("temp_new_chat_") && !!actualSessionId && !conversationState.isSnoozed,
    onError: (error) => {
      console.error("WebSocket error:", error);
      setIsSending(false);
    },
  });
  
  // Scroll management - pass streamingContent to trigger scroll on WebSocket updates
  const { scrollAreaRef, scrollViewportRef, enableAutoScroll } = useScrollManager(
    chatMessages,
    false, // isLoadingOlder - can be added later with infinite query
    chatId,
    streamingContent // Pass streaming content to trigger scroll updates
  );
  const inputRef = useRef<MessageInputHandle>(null);

  // Focus input after message is sent
  useEffect(() => {
    if (!isSending && chatMessages.length > 0) {
      inputRef.current?.focus();
    }
  }, [isSending, chatMessages.length]);

  // Check if the last message is a session_snooze message and update conversation state
  useEffect(() => {
    if (chatMessages.length > 0) {
      const lastMessage = chatMessages[chatMessages.length - 1];
      const isLastMessageSnooze = lastMessage.metadata?.type === "session_snooze";
      
      // If last message is session_snooze and conversation state doesn't reflect it, update it
      if (isLastMessageSnooze && !conversationState.isSnoozed) {
        queryClient.setQueryData([...chatKeys.messages(chatId), "state"], {
          ...conversationState,
          isSnoozed: true,
        });
      }
    }
  }, [chatMessages, conversationState.isSnoozed, chatId, queryClient, conversationState]);

  // Show initial greeting when chat is empty
  const showGreeting = chatMessages.length === 0 && !isLoadingMessages && !isSending;
  const showLoader = isLoadingMessages && chatMessages.length === 0 && !hasLoaded;

  const handleSendMessage = async (content: string) => {
    if (isSending || !content.trim()) return;
    
    try {
      enableAutoScroll();
      setIsSending(true);
      
      // Handle temp chat - create session first
      let currentSessionId = actualSessionId;
      if (chatId.startsWith("temp_new_chat_") && actualSessionId === chatId) {
        // Create session first via HTTP
        try {
          const session = await createSessionMutation.mutateAsync();
          currentSessionId = session.id;
          setActualSessionId(session.id);
          selectChat(session.id);
        } catch (error) {
          console.error("Failed to create session:", error);
          setIsSending(false);
          return;
        }
      }
      
      // Optimistically add user message
      const optimisticUserMessageId = `temp_user_${Date.now()}`;
      
      const optimisticUserMessage: Message = {
        id: optimisticUserMessageId,
        chatId: currentSessionId,
        content: content.trim(),
        role: "user",
        timestamp: new Date(),
        isRead: true,
      };
      
      // Add typing indicator immediately after user message
      const typingIndicator: Message = {
        id: "typing-indicator",
        chatId: currentSessionId,
        content: "",
        role: "assistant",
        timestamp: new Date(),
        isRead: false,
      };
      
      queryClient.setQueryData<{ messages: Message[]; hasMore: boolean; total: number }>(
        chatKeys.messages(currentSessionId),
        (old) => {
          if (!old) {
            return {
              messages: [optimisticUserMessage, typingIndicator],
              hasMore: false,
              total: 1,
            };
          }
          // Remove any existing typing indicator or streaming message
          const filteredMessages = old.messages.filter(
            (msg) => msg.id !== "typing-indicator" && msg.id !== "streaming" && !msg.id.startsWith("streaming_")
          );
          return {
            ...old,
            messages: [...filteredMessages, optimisticUserMessage, typingIndicator],
            total: filteredMessages.length + 1,
          };
        }
      );

      // Update session in sessions list cache with user message
      const truncatedUserMessage = content.trim().length > 100 
        ? content.trim().substring(0, 100) + "..." 
        : content.trim();
      updateSessionInList(
        queryClient,
        currentSessionId,
        truncatedUserMessage,
        new Date().toISOString()
      );
      
      // Send via WebSocket
      const sent = sendWebSocketMessage(content.trim());
      if (!sent) {
        // If WebSocket not connected, fallback to HTTP (or show error)
        console.error("WebSocket not connected - cannot send message");
        // Remove optimistic messages and typing indicator
        queryClient.setQueryData<{ messages: Message[]; hasMore: boolean; total: number }>(
          chatKeys.messages(currentSessionId),
          (old) => {
            if (!old) return old;
            return {
              ...old,
              messages: old.messages.filter(
                (msg) => 
                  msg.id !== optimisticUserMessageId && 
                  msg.id !== "streaming" && 
                  msg.id !== "typing-indicator" &&
                  !msg.id.startsWith("streaming_")
              ),
            };
          }
        );
        setIsSending(false);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setIsSending(false);
    }
  };
  
  // Note: Streaming updates are handled by updateStreamingMessage in cacheUpdaters
  // This effect is no longer needed as WebSocket hook handles it directly
  
  // Reset sending state when streaming completes
  // Only reset when:
  // 1. No streaming content
  // 2. No streaming message ID
  // 3. No streaming message in chatMessages (complete message has been added)
  useEffect(() => {
    const hasStreamingInMessages = chatMessages.some(
      (msg) => msg.id === "streaming" || msg.id.startsWith("streaming_")
    );
    const hasTypingInMessages = chatMessages.some((msg) => msg.id === "typing-indicator");
    
    if (
      !streamingContent && 
      !streamingMessageId && 
      !hasStreamingInMessages && 
      !hasTypingInMessages &&
      isSending
    ) {
      // Small delay to ensure UI updates properly
      const timeoutId = setTimeout(() => {
        setIsSending(false);
      }, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [streamingContent, streamingMessageId, isSending, chatMessages]);

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const handleLoadMore = () => {
    // TODO: Implement with infinite query if needed
  };

  const handleUnsnooze = async () => {
    try {
      await reactivateSessionMutation.mutateAsync(chatId);
      // Update conversation state to mark as not snoozed
      queryClient.setQueryData([...chatKeys.messages(chatId), "state"], {
        ...conversationState,
        isSnoozed: false,
      });
      // Reconnect WebSocket after reactivation
      console.log("Reconnecting WebSocket after session reactivation...");
      connectWebSocket();
    } catch (error) {
      console.error("Failed to unsnooze session:", error);
    }
  };

  // Static suggestions for new chat only
  const staticSuggestions = [
    "Connect with team",
    "Get a quote",
    "Apply for lease",
  ];

  // Determine which suggestions to show
  // Hide suggestions when:
  // 1. Message is being sent (isSending)
  // 2. Streaming content exists (WebSocket is streaming)
  // 3. There's a streaming message in the chat (waiting for complete)
  const isNewChat = chatMessages.length === 0;
  const hasUserMessages = chatMessages.some((msg) => msg.role === "user");
  const hasStreamingMessage = chatMessages.some(
    (msg) => msg.id === "streaming" || msg.id.startsWith("streaming_")
  );
  const hasTypingIndicator = chatMessages.some((msg) => msg.id === "typing-indicator");
  const isWaitingForResponse = isSending || streamingContent || hasStreamingMessage || hasTypingIndicator;
  const shouldShowSuggestions = !conversationState.isComplete && !isWaitingForResponse;
  
  let suggestionsToShow: string[] = [];
  
  if (shouldShowSuggestions) {
    if (isNewChat || !hasUserMessages) {
      // New chat or no user messages yet: Show static suggestions
      suggestionsToShow = staticSuggestions;
    } else {
      // Chat has started with user messages: Show suggestions from WebSocket/conversation state only
      const webSocketSuggestions = conversationState.suggestions || [];
      // Take top 3 from WebSocket suggestions
      suggestionsToShow = webSocketSuggestions.slice(0, 3);
    }
  }

  // Temporary debug - force show suggestions for testing
  const forceShowSuggestions = !hasUserMessages && !isSending;

  // Build display messages - chatMessages already includes typing indicator and streaming messages
  const displayMessages: Message[] = [...chatMessages];

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
                  {!isSending && shouldShowSuggestions && suggestionsToShow.length > 0 && (
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
                {displayMessages.map((message) => {
                  const isStreaming = message.id === "streaming" || message.id.startsWith("streaming_");
                  return (
                    <MessageBubble 
                      key={message.id} 
                      message={message} 
                      isStreaming={isStreaming} 
                    />
                  );
                })}
                  {/* Show suggestions after messages, only if not complete */}
                  {((!isSending && shouldShowSuggestions && suggestionsToShow.length > 0) || forceShowSuggestions) && (
                    <Suggestions
                      suggestions={forceShowSuggestions ? staticSuggestions : suggestionsToShow}
                      isLoading={false}
                      onSelect={handleSuggestionClick}
                  />
                  )}
                <ScrollToBottom 
                  messages={displayMessages} 
                  smooth 
                  scrollContainer={scrollViewportRef.current}
                  streamingContent={streamingContent}
                  suggestions={shouldShowSuggestions ? suggestionsToShow : []}
                />
              </InfiniteScrollContainer>
            )}
          </div>
        </ScrollArea>
        )}
      </div>

      <div style={{ flexShrink: 0, borderTop: '1px solid var(--widget-border)', background: 'var(--widget-bg)' }}>
        {conversationState.isSnoozed ? (
          <div className="widget-p-4 flex justify-center" style={{ textAlign: 'center' }}>
            <Button 
              onClick={handleUnsnooze} 
              disabled={reactivateSessionMutation.isPending}
              size="sm"
              style={{ width: '100%', maxWidth: '200px' }}
            >
              {reactivateSessionMutation.isPending ? (
                <>
                  <Loader2 className="widget-loader-spinner" style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
                  Resuming...
                </>
              ) : (
                "Unsnooze and Resume Chat"
              )}
            </Button>
          </div>
        ) : conversationState.isComplete || !isSessionActive ? (
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
              disabled={isSending || !isConnected}
              placeholder={!isConnected ? "Connecting..." : "Write your message here"}
            />
          </>
        )}
      </div>
    </div>
  );
}
