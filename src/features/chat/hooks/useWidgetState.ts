import { useState, useEffect } from "react";
import { useChatStore } from "../store/chatStore";

type WidgetState = "start" | "select-type" | "chat" | "chat-list";

/**
 * Custom hook for widget state management
 * Single Responsibility: Manage widget open/close and state machine
 */
export function useWidgetState() {
  const [isOpen, setIsOpen] = useState(false);
  const [widgetState, setWidgetState] = useState<WidgetState>("start");
  const [wasManuallyClosed, setWasManuallyClosed] = useState(false);
  const { activeChatId } = useChatStore();

  // Keep widget open if there's an active chat, even if loadChats() runs
  useEffect(() => {
    if (activeChatId && !isOpen && !wasManuallyClosed) {
      setIsOpen(true);
    }
  }, [activeChatId, isOpen, wasManuallyClosed]);

  // Reset manual close flag when opening
  useEffect(() => {
    if (isOpen) {
      setWasManuallyClosed(false);
    }
  }, [isOpen]);

  const handleOpen = () => {
    setIsOpen(true);
    setWasManuallyClosed(false);
  };

  const handleClose = () => {
    setWasManuallyClosed(true);
    setIsOpen(false);
    useChatStore.getState().selectChat(null);
  };

  return {
    isOpen,
    widgetState,
    setWidgetState,
    handleOpen,
    handleClose,
  };
}

