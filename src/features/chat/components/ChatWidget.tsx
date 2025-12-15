import { useState, useEffect } from "react";
import { ChatButton } from "./ChatButton";
import { StartScreen } from "./StartScreen";
import { ChatScreen } from "./ChatScreen";
import { ChatList } from "./ChatList";
import { FloatingPanel } from "@/shared/components";
import { useSessionStore } from "../store/sessionStore";
import { useChatStore } from "../store/chatStore";
import { useWidgetInitialization } from "../hooks/useWidgetInitialization";
import { useWidgetState } from "../hooks/useWidgetState";
import { useCreateSessionMutation, useChatsQuery } from "../useQueries";

/**
 * ChatWidget Component
 * Single Responsibility: Orchestrate widget state and render appropriate screens
 * All async operations use TanStack Query
 */
export function ChatWidget() {
  useWidgetInitialization();
  const { isOpen, widgetState, setWidgetState, handleOpen, handleClose } = useWidgetState();
  
  const [isInitializing, setIsInitializing] = useState(false);
  const { initialized, error, visitorId, initVisitor } = useSessionStore();
  const { activeChatId, selectChat } = useChatStore();
  const createSessionMutation = useCreateSessionMutation();
  const { data: chats = [], isLoading: isLoadingChats } = useChatsQuery(visitorId);

  const handleStartChat = async () => {
    setIsInitializing(true);
    try {
      let currentVisitorId = visitorId;
      if (!currentVisitorId) {
        currentVisitorId = await initVisitor();
      }

      const session = await createSessionMutation.mutateAsync();
      
      // Create temp chat ID for immediate UI feedback
      const tempChatId = `temp_new_chat_${Date.now()}`;
      selectChat(tempChatId);

      // Update to real session ID
      selectChat(session.id);
      setWidgetState("chat");
    } catch (error) {
      console.error("Failed to initialize chat:", error);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleBackToList = () => {
    selectChat(null);
    if (chats.length > 0) {
      setWidgetState("chat-list");
    } else {
      setWidgetState("start");
    }
  };

  const handleSelectChat = (chatId: string) => {
    selectChat(chatId);
    setWidgetState("chat");
  };

  const handleNewChat = () => {
    handleStartChat();
  };

  const handleOpenWithState = () => {
    handleOpen();
    if (activeChatId) {
      setWidgetState("chat");
    } else if (chats.length > 0) {
      setWidgetState("chat-list");
    } else {
      setWidgetState("start");
    }
  };

  const handleViewChats = () => {
    setWidgetState("chat-list");
  };

  // Automatically show chat list when sessions are loaded and widget is open
  useEffect(() => {
    if (isOpen && !isLoadingChats && chats.length > 0 && widgetState === "start" && !activeChatId) {
      setWidgetState("chat-list");
    }
  }, [isOpen, isLoadingChats, chats.length, widgetState, activeChatId, setWidgetState]);

  if (error) {
    return (
      <div style={{ 
        position: 'fixed', 
        bottom: '1rem', 
        right: '1rem', 
        zIndex: 999999, 
        padding: '1rem', 
        background: '#fef2f2', 
        border: '1px solid #fecaca', 
        borderRadius: 'var(--widget-radius-lg)', 
        boxShadow: '0 10px 15px -3px var(--widget-shadow), 0 4px 6px -2px var(--widget-shadow)', 
        maxWidth: '24rem' 
      }}>
        <p className="widget-text-sm" style={{ color: '#991b1b' }}>Failed to initialize chat widget: {error}</p>
      </div>
    );
  }

  if (!initialized) {
    return (
      <div style={{ position: 'fixed', bottom: '1rem', right: '1rem', zIndex: 999999 }}>
        <div style={{ 
          background: 'var(--widget-bg)', 
          border: '1px solid var(--widget-border)', 
          borderRadius: 'var(--widget-radius-lg)', 
          boxShadow: '0 10px 15px -3px var(--widget-shadow), 0 4px 6px -2px var(--widget-shadow)', 
          padding: '0.75rem',
          animation: 'widget-pulse 2s ease-in-out infinite'
        }}>
          <div className="widget-flex widget-items-center widget-gap-2">
            <div style={{ width: '0.5rem', height: '0.5rem', background: 'var(--widget-primary)', borderRadius: '9999px' }}></div>
            <span className="widget-text-xs widget-text-muted">Initializing...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ChatButton onClick={handleOpenWithState} />
      <FloatingPanel isOpen={isOpen} onClose={handleClose}>
        {widgetState === "start" && (
          <StartScreen 
            onStartChat={handleStartChat} 
            onViewChats={chats.length > 0 ? handleViewChats : undefined}
            isLoading={isInitializing}
            hasExistingChats={chats.length > 0}
          />
        )}
        {widgetState === "chat-list" && (
          <ChatList onClose={handleClose} onSelectChat={handleSelectChat} onNewChat={handleNewChat} />
        )}
        {widgetState === "chat" && activeChatId && (
          <ChatScreen chatId={activeChatId} onBack={handleBackToList} onClose={handleClose} />
        )}
      </FloatingPanel>
    </>
  );
}
