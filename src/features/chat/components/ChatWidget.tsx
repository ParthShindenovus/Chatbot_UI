import { useState, useEffect } from "react";
import { ChatButton } from "./ChatButton";
import { ChatList } from "./ChatList";
import { ChatScreen } from "./ChatScreen";
import { FloatingPanel } from "@/shared/components";
import { useSessionStore } from "../store/sessionStore";
import { useChatStore } from "../store/chatStore";

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const { initialize, initialized, error } = useSessionStore();
  const { activeChatId, loadChats } = useChatStore();

  useEffect(() => {
    if (!initialized && !error) {
      initialize().then(() => {
        // Load all chats for this user
        loadChats();
      });
    }
  }, [initialize, initialized, error, loadChats]);

  // Keep widget open if there's an active chat, even if loadChats() runs
  // This prevents the widget from closing when session is created
  useEffect(() => {
    if (activeChatId && !isOpen) {
      // If we have an active chat but widget is closed, keep it open
      // This can happen when session is created and loadChats() runs
      setIsOpen(true);
    }
  }, [activeChatId, isOpen]);

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleBackToList = () => {
    useChatStore.getState().selectChat(null);
  };

  // Show error state if initialization failed
  if (error) {
    return (
      <div className="fixed bottom-4 right-4 z-50 p-4 bg-red-50 border border-red-200 rounded-lg shadow-lg max-w-sm">
        <p className="text-sm text-red-800">
          Failed to initialize chat widget: {error}
        </p>
      </div>
    );
  }

  // Don't show widget until initialized
  if (!initialized) {
    // Show loading indicator while initializing
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
      <ChatButton onClick={() => setIsOpen(true)} />
      <FloatingPanel isOpen={isOpen} onClose={handleClose}>
        {activeChatId ? (
          <ChatScreen chatId={activeChatId} onBack={handleBackToList} onClose={handleClose} />
        ) : (
          <ChatList onClose={handleClose} />
        )}
      </FloatingPanel>
    </>
  );
}

