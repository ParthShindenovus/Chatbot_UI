export interface Message {
  id: string;
  chatId: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  isRead: boolean;
  metadata?: Record<string, any>; // For metadata like type: "idle_warning" or "session_end"
}

export interface ChatSummary {
  id: string;
  title: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isActive: boolean;
}

export interface Session {
  sessionId: string;
  widgetApiKey: string;
  initialized: boolean;
}

