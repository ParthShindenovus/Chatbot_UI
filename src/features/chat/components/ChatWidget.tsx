import { useState } from "react";
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
  const { data: chats = [] } = useChatsQuery(visitorId);

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

  if (error) {
    return (
      <div className="fixed bottom-4 right-4 z-50 p-4 bg-red-50 border border-red-200 rounded-lg shadow-lg max-w-sm">
        <p className="text-sm text-red-800">Failed to initialize chat widget: {error}</p>
      </div>
    );
  }

  if (!initialized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-card border rounded-lg shadow-lg p-3 animate-pulse">
          <div className="flex items-center gap-2">
            <div className="size-2 bg-primary rounded-full"></div>
            <span className="text-xs text-muted-foreground">Initializing...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ChatButton onClick={handleOpenWithState} />
      <FloatingPanel isOpen={isOpen} onClose={handleClose}>
        {widgetState === "start" && <StartScreen onStartChat={handleStartChat} isLoading={isInitializing} />}
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

