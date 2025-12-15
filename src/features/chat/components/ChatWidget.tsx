import { ChatButton } from "./ChatButton";
import { ChatScreen } from "./ChatScreen";
import { ChatList } from "./ChatList";
import { FloatingPanel } from "@/shared/components";
import { useSessionStore } from "../store/sessionStore";
import { useChatStore } from "../store/chatStore";
import { useWidgetInitialization } from "../hooks/useWidgetInitialization";
import { useWidgetState } from "../hooks/useWidgetState";

/**
 * ChatWidget Component
 * Single Responsibility: Orchestrate widget state and render appropriate screens
 * All async operations use TanStack Query
 */
export function ChatWidget() {
  useWidgetInitialization();
  const { isOpen, widgetState, setWidgetState, handleOpen, handleClose } = useWidgetState();
  
  const { initialized, error } = useSessionStore();
  const { activeChatId, selectChat } = useChatStore();

  const handleBackToList = () => {
    selectChat(null);
    setWidgetState("chat-list");
  };

  const handleSelectChat = (chatId: string) => {
    selectChat(chatId);
    setWidgetState("chat");
  };

  const handleOpenWithState = () => {
    handleOpen();
    // Always start with chat list, or chat if there's an active chat
    if (activeChatId) {
      setWidgetState("chat");
    } else {
      setWidgetState("chat-list");
    }
  };

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
        {widgetState === "chat-list" && (
          <ChatList onClose={handleClose} onSelectChat={handleSelectChat} />
        )}
        {widgetState === "chat" && activeChatId && (
          <ChatScreen chatId={activeChatId} onBack={handleBackToList} onClose={handleClose} />
        )}
      </FloatingPanel>
    </>
  );
}
